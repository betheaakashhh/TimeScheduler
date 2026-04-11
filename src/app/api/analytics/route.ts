// src/app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import dayjs from 'dayjs';


// GET /api/analytics?range=7|30
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId =  (session?.user as {id?: string} | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = parseInt(searchParams.get('range') || '7');
 

  const cacheKey = `user:${userId}:analytics:${range}`;
  const cached = await cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  const today = dayjs();
  const dates = Array.from({ length: range }, (_, i) =>
    today.subtract(range - 1 - i, 'day').format('YYYY-MM-DD')
  );

  // Fetch all task logs for the date range
  const logs = await prisma.taskLog.findMany({
    where: { userId, date: { in: dates } },
    include: { slot: { select: { isAutoMark: true, isStrict: true, tag: true } } },
  });

  // Fetch all slots to know total per day
  const slots = await prisma.scheduleSlot.findMany({
    where: { userId, isActive: true },
    select: { id: true, isAutoMark: true, isStrict: true, tag: true, repeatDays: true },
  });

  // Build per-day stats
  const dayStats = dates.map((date) => {
    const dayOfWeek = dayjs(date).day();
    const d = dayOfWeek === 0 ? 7 : dayOfWeek;

    const daySlots = slots.filter((s) => s.repeatDays.includes(d) && !s.isAutoMark);
    const total = daySlots.length;

    const dayLogs = logs.filter((l) => l.date === date && !l.slot.isAutoMark);
    const completed = dayLogs.filter((l) => l.status === 'COMPLETED').length;
    const skipped = dayLogs.filter((l) => l.status === 'SKIPPED').length;

    const rate = total > 0 ? completed / total : 0;

    // Tag breakdown
    const tagStats: Record<string, { total: number; done: number }> = {};
    daySlots.forEach((s) => {
      if (!tagStats[s.tag]) tagStats[s.tag] = { total: 0, done: 0 };
      tagStats[s.tag].total++;
    });
    dayLogs.filter((l) => l.status === 'COMPLETED').forEach((l) => {
      if (!tagStats[l.slot.tag]) tagStats[l.slot.tag] = { total: 0, done: 0 };
      tagStats[l.slot.tag].done++;
    });

    return { date, total, completed, skipped, rate, pct: Math.round(rate * 100), tagStats };
  });

  // Streak data
  const streak = await prisma.streak.findUnique({ where: { userId } });

  // Most/least consistent tags
  const tagTotals: Record<string, { total: number; done: number }> = {};
  dayStats.forEach((d) => {
    Object.entries(d.tagStats).forEach(([tag, stats]) => {
      if (!tagTotals[tag]) tagTotals[tag] = { total: 0, done: 0 };
      tagTotals[tag].total += stats.total;
      tagTotals[tag].done += stats.done;
    });
  });
  const tagRates = Object.entries(tagTotals)
    .filter(([, s]) => s.total > 0)
    .map(([tag, s]) => ({ tag, rate: s.done / s.total, total: s.total, done: s.done }))
    .sort((a, b) => b.rate - a.rate);

  const result = {
    days: dayStats,
    streak,
    tagRates,
    summary: {
      avgRate: Math.round(dayStats.reduce((a, d) => a + d.rate, 0) / dayStats.length * 100),
      totalDone: dayStats.reduce((a, d) => a + d.completed, 0),
      totalTasks: dayStats.reduce((a, d) => a + d.total, 0),
      perfectDays: dayStats.filter((d) => d.rate === 1 && d.total > 0).length,
    },
  };

  await cache.set(cacheKey, result, 600);
  return NextResponse.json(result);
}



