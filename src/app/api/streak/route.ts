// src/app/api/streak/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import { queueEmail } from '@/lib/email';
import dayjs from 'dayjs';

// GET /api/streak
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as {id?: string} | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cached = await cache.get(CACHE_KEYS.userStreak(userId));
  if (cached) return NextResponse.json(cached);

  const streak = await prisma.streak.findUnique({ where: { userId } });
  const result = streak || { current: 0, best: 0, lastDate: null };

  await cache.set(CACHE_KEYS.userStreak(userId), result, 3600);
  return NextResponse.json(result);
}

// POST /api/streak/check-risk — called at end of day (cron)
// This runs nightly at ~9 PM to warn users about losing their streak
export async function POST(req: NextRequest) {
  // This endpoint is called by an internal cron job, not by users
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = dayjs().format('YYYY-MM-DD');

  // Find all users with active streaks (>= 3 days)
  const streaks = await prisma.streak.findMany({
    where: { current: { gte: 3 }, lastDate: today },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailEnabled: true,
          streakWarning: true,
        },
      },
    },
  });

  let warned = 0;
  for (const s of streaks) {
    if (!s.user.emailEnabled || !s.user.streakWarning || !s.user.email) continue;

    // Check if they've done enough today to keep streak
    const strictSlots = await prisma.scheduleSlot.findMany({
      where: { userId: s.userId, isStrict: true, isActive: true, isAutoMark: false },
    });

    const strictLogs = await prisma.taskLog.findMany({
      where: {
        userId: s.userId,
        date: today,
        status: 'COMPLETED',
        slotId: { in: strictSlots.map((sl) => sl.id) },
      },
    });

    const completionRate = strictSlots.length === 0 ? 1 : strictLogs.length / strictSlots.length;
    const atRisk = completionRate < 0.6;

    if (atRisk) {
      await queueEmail({
        to: s.user.email,
        type: 'streak-warning',
        data: {
          userName: s.user.name || 'there',
          streakCount: s.current,
        },
      });
      warned++;
    }
  }

  return NextResponse.json({ ok: true, warned });
}
