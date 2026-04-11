// src/app/api/food-log/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import { z } from 'zod';
import dayjs from 'dayjs';

const foodSchema = z.object({
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => dayjs().format('YYYY-MM-DD')),
  mealType: z.enum(['BREAKFAST','LUNCH','DINNER','SNACK']),
  items:    z.array(z.string().min(1)).min(1, 'Add at least one food item'),
  notes:    z.string().optional(),
});

// GET /api/food-log?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || dayjs().format('YYYY-MM-DD');
  const userId = session.user.id;

  const logs = await prisma.foodLog.findMany({
    where: { userId, date },
    orderBy: { loggedAt: 'asc' },
  });

  return NextResponse.json(logs);
}

// POST /api/food-log - log a meal
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = foodSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { date, mealType, items, notes } = parsed.data;
  const userId = session.user.id;

  // Upsert — only one log per mealType per day
  const existing = await prisma.foodLog.findFirst({ where: { userId, date, mealType } });

  let log;
  if (existing) {
    log = await prisma.foodLog.update({
      where: { id: existing.id },
      data: { items: items as any, notes, loggedAt: new Date() },
    });
  } else {
    log = await prisma.foodLog.create({
      data: { userId, date, mealType, items: items as any, notes },
    });
  }

  // Invalidate schedule cache so food-gated slots can now be unlocked
  await cache.del(CACHE_KEYS.userSchedule(userId, date));

  return NextResponse.json(log, { status: 201 });
}

// DELETE /api/food-log?id=...
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const userId = session.user.id;
  await prisma.foodLog.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
