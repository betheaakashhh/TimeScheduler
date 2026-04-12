// src/app/api/schedule/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import { queueEmail } from '@/lib/email';
import dayjs from 'dayjs';
import { z } from 'zod';

const logSchema = z.object({
  slotId: z.string(),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['COMPLETED', 'SKIPPED']),
  notes:  z.string().optional(),
});

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return (token?.id as string) || (token?.sub as string) || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = logSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { slotId, date, status, notes } = parsed.data;

  const slot = await prisma.scheduleSlot.findFirst({ where: { id: slotId, userId } });
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

  // Food requirement: check if ANY food was logged for this meal type today
  if (slot.foodRequired && status === 'COMPLETED') {
    const mealTypes: string[] = slot.tag === 'BREAKFAST' ? ['BREAKFAST'] :
                                slot.tag === 'LUNCH'     ? ['LUNCH']     :
                                slot.tag === 'DINNER'    ? ['DINNER', 'SNACK'] : ['BREAKFAST','LUNCH','DINNER','SNACK'];
    const foodLog = await prisma.foodLog.findFirst({
      where: { userId, date, mealType: { in: mealTypes as any } },
    });
    if (!foodLog) {
      return NextResponse.json({
        error: 'Please log your meal first before marking this complete.',
        needsFoodLog: true,
        mealType: mealTypes[0],
      }, { status: 422 });
    }
  }

  // Check BLOCKED
  if (status === 'COMPLETED') {
    const blocked = await prisma.taskLog.findFirst({ where: { slotId, date, status: 'BLOCKED' } });
    if (blocked) return NextResponse.json({ error: 'This task is blocked by a prior strict task.' }, { status: 422 });
  }

  const timestamp = new Date();
  const log = await prisma.taskLog.upsert({
    where: { slotId_date: { slotId, date } },
    update: { status, completedAt: status === 'COMPLETED' ? timestamp : undefined, skippedAt: status === 'SKIPPED' ? timestamp : undefined, notes },
    create: { slotId, date, userId, status, completedAt: status === 'COMPLETED' ? timestamp : undefined, skippedAt: status === 'SKIPPED' ? timestamp : undefined, notes },
  });

  if (status === 'SKIPPED' && slot.isStrict) {
    if (slot.strictMode === 'HARD') {
      const laterSlots = await prisma.scheduleSlot.findMany({ where: { userId, startTime: { gt: slot.startTime }, isActive: true } });
      await prisma.taskLog.createMany({ skipDuplicates: true, data: laterSlots.map((ls) => ({ slotId: ls.id, date, userId, status: 'BLOCKED' })) });
    } else if (slot.strictMode === 'WARN') {
      await prisma.streak.upsert({ where: { userId }, update: { current: 0 }, create: { userId, current: 0, best: 0 } });
    }
  }

  if (status === 'COMPLETED') await updateStreak(userId, date).catch(() => {});

  await cache.del(CACHE_KEYS.userSchedule(userId, date)).catch(() => {});
  await cache.del(CACHE_KEYS.userStats(userId, date)).catch(() => {});

  return NextResponse.json({ log, ok: true });
}

async function updateStreak(userId: string, date: string) {
  const yesterday = dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
  const strictSlots = await prisma.scheduleSlot.findMany({ where: { userId, isStrict: true, isActive: true, isAutoMark: false } });
  const strictLogs = await prisma.taskLog.findMany({ where: { userId, date, status: 'COMPLETED', slotId: { in: strictSlots.map((s) => s.id) } } });
  const qualifies = strictSlots.length === 0 || strictLogs.length / strictSlots.length >= 0.6;
  if (!qualifies) return;
  const streak = await prisma.streak.findUnique({ where: { userId } });
  const isConsecutive = streak?.lastDate === yesterday;
  const newCurrent = isConsecutive ? (streak?.current || 0) + 1 : 1;
  const newBest = Math.max(newCurrent, streak?.best || 0);
  await prisma.streak.upsert({ where: { userId }, update: { current: newCurrent, best: newBest, lastDate: date }, create: { userId, current: newCurrent, best: newBest, lastDate: date } });
  await cache.set(CACHE_KEYS.userStreak(userId), { current: newCurrent, best: newBest, lastDate: date }, 3600).catch(() => {});
  if ([7, 14, 21, 30, 60, 100].includes(newCurrent)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, emailEnabled: true } });
    if (user?.emailEnabled && user.email) await queueEmail({ to: user.email, type: 'task-alert', data: { userName: user.name || 'there', taskTitle: `${newCurrent}-Day Streak!`, message: `You've maintained your schedule for ${newCurrent} consecutive days.` } }).catch(() => {});
  }
}
