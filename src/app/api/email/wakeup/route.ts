// src/app/api/email/wakeup/route.ts
// Runs every minute — sends wake-up email when current time matches user's wakeUpTime
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { queueEmail } from '@/lib/email';
import dayjs from 'dayjs';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = dayjs();
  const currentTime = now.format('HH:mm');

  const users = await prisma.user.findMany({
    where: {
      wakeUpTime: currentTime,
      emailEnabled: true,
    },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  for (const user of users) {
    if (!user.email) continue;
    await queueEmail({
      to: user.email,
      type: 'wake-up',
      data: { userName: user.name || 'there' },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
