// src/app/api/schedule/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import { queueEmail } from '@/lib/email';
import dayjs from 'dayjs';
import { z } from 'zod';

const logSchema = z.object({
  slotId:  z.string(),
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status:  z.enum(['COMPLETED', 'SKIPPED']),
  notes:   z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { slotId, date, status, notes } = parsed.data;
  const userId = session.user.id;

  // Fetch slot to validate ownership + get strict config
  const slot = await prisma.scheduleSlot.findFirst({
    where: { id: slotId, userId },
  });
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

  // Check food requirement
  if (slot.foodRequired && status === 'COMPLETED') {
    const foodLog = await prisma.foodLog.findFirst({
      where: { userId, date, mealType: slot.tag === 'BREAKFAST' ? 'BREAKFAST' : 'DINNER' },
    });
    if (!foodLog) {
      return NextResponse.json({ error: 'Please log your meal first before marking this complete.' }, { status: 422 });
    }
  }

  // Check if a prior HARD-locked strict task was skipped today
  if (status === 'COMPLETED') {
    const blockedLog = await prisma.taskLog.findFirst({
      where: { slotId, date, status: 'BLOCKED' },
    });
    if (blockedLog) {
      return NextResponse.json({ error: 'This task is blocked because a prior strict task was skipped.' }, { status: 422 });
    }
  }

  const timestamp = new Date();
  const log = await prisma.taskLog.upsert({
    where: { slotId_date: { slotId, date } },
    update: {
      status,
      completedAt: status === 'COMPLETED' ? timestamp : undefined,
      skippedAt:   status === 'SKIPPED'   ? timestamp : undefined,
      notes,
    },
    create: {
      slotId,
      date,
      userId,
      status,
      completedAt: status === 'COMPLETED' ? timestamp : undefined,
      skippedAt:   status === 'SKIPPED'   ? timestamp : undefined,
      notes,
    },
  });

  // Handle strict mode effects on skip
  if (status === 'SKIPPED' && slot.isStrict) {
    if (slot.strictMode === 'HARD') {
      // Block all later slots today
      const laterSlots = await prisma.scheduleSlot.findMany({
        where: { userId, startTime: { gt: slot.startTime }, isActive: true },
      });
      await prisma.taskLog.createMany({
        skipDuplicates: true,
        data: laterSlots.map((ls) => ({ slotId: ls.id, date, userId, status: 'BLOCKED' })),
      });
    } else if (slot.strictMode === 'WARN') {
      // Break streak
      await prisma.streak.upsert({
        where: { userId },
        update: { current: 0 },
        create: { userId, current: 0, best: 0 },
      });
    }
    // GRACE: no immediate action — 30 min window handled by socket tick
  }

  // Update streak if completed
  if (status === 'COMPLETED') {
    await updateStreak(userId, date);
  }

  // Invalidate cache
  await cache.del(CACHE_KEYS.userSchedule(userId, date));
  await cache.del(CACHE_KEYS.userStats(userId, date));

  return NextResponse.json({ log, ok: true });
}

async function updateStreak(userId: string, date: string) {
  const today = dayjs(date);
  const yesterday = today.subtract(1, 'day').format('YYYY-MM-DD');

  // Count strict slots and completed ones today
  const strictSlots = await prisma.scheduleSlot.findMany({
    where: { userId, isStrict: true, isActive: true, isAutoMark: false },
  });
  const strictLogs = await prisma.taskLog.findMany({
    where: {
      userId,
      date,
      status: 'COMPLETED',
      slotId: { in: strictSlots.map((s) => s.id) },
    },
  });

  // Need at least 60% of strict tasks completed for streak to count
  const qualifies = strictSlots.length === 0 || strictLogs.length / strictSlots.length >= 0.6;
  if (!qualifies) return;

  const streak = await prisma.streak.findUnique({ where: { userId } });
  const isConsecutive = streak?.lastDate === yesterday;
  const newCurrent = isConsecutive ? (streak?.current || 0) + 1 : 1;
  const newBest = Math.max(newCurrent, streak?.best || 0);

  await prisma.streak.upsert({
    where: { userId },
    update: { current: newCurrent, best: newBest, lastDate: date },
    create: { userId, current: newCurrent, best: newBest, lastDate: date },
  });

  // Cache updated streak
  await cache.set(CACHE_KEYS.userStreak(userId), { current: newCurrent, best: newBest, lastDate: date }, 3600);

  // Streak milestone notifications
  if ([7, 14, 21, 30, 60, 100].includes(newCurrent)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, emailEnabled: true } });
    if (user?.emailEnabled && user.email) {
      await queueEmail({
        to: user.email,
        type: 'task-alert',
        data: {
          userName: user.name || 'there',
          taskTitle: `🎉 ${newCurrent}-Day Streak Milestone!`,
          message: `You've maintained your schedule for ${newCurrent} consecutive days. Incredible dedication!`,
        },
      });
    }
  }
}
