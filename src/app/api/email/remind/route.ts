// src/app/api/email/remind/route.ts
// Called by a cron job every 5 minutes to check for upcoming tasks with email alerts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { queueEmail } from '@/lib/email';
import dayjs from 'dayjs';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = dayjs().tz('Asia/Kolkata');
  const today = now.format('YYYY-MM-DD');
  const currentTime = now.format('HH:mm');

  // Find all slots with email alerts that start within the next 10 minutes
  const inTenMins = now.add(10, 'minute').format('HH:mm');

  const slots = await prisma.scheduleSlot.findMany({
    where: {
      emailAlert: true,
      isActive: true,
      startTime: { gte: currentTime, lte: inTenMins },
    },
    include: {
      user: { select: { email: true, name: true, emailEnabled: true } },
      taskLogs: { where: { date: today } },
    },
  });

  let sent = 0;
  for (const slot of slots) {
    if (!slot.user.emailEnabled || !slot.user.email) continue;
    const alreadyNotified = await prisma.taskLog.findFirst({ where: { slotId: slot.id, date: today, status: 'COMPLETED' } });
    if (alreadyNotified) continue;

    await queueEmail({
      to: slot.user.email,
      type: slot.isStrict ? 'task-alert' : 'reminder',
      data: {
        userName: slot.user.name || 'there',
        taskTitle: `${slot.emoji} ${slot.title}`,
        message: slot.description || undefined,
      },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}

// src/app/api/email/wakeup/route.ts — separate file below
