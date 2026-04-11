// src/app/api/schedule/route.ts
// getToken with secret only — no cookieName override needed in App Router
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { cache, CACHE_KEYS } from '@/lib/redis';
import { z } from 'zod';
import dayjs from 'dayjs';

const slotSchema = z.object({
  title:        z.string().min(1).max(100),
  description:  z.string().max(500).optional(),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/),
  tag:          z.string(),
  customTag:    z.string().optional(),
  emoji:        z.string().default('📌'),
  isStrict:     z.boolean().default(false),
  strictMode:   z.enum(['HARD','WARN','GRACE']).default('WARN'),
  isAutoMark:   z.boolean().default(false),
  emailAlert:   z.boolean().default(false),
  foodRequired: z.boolean().default(false),
  isAcademic:   z.boolean().default(false),
  checklistOn:  z.boolean().default(true),
  repeatDays:   z.array(z.number().min(1).max(7)).default([1,2,3,4,5,6,7]),
  checklist:    z.array(z.object({ id:z.string(), label:z.string(), required:z.boolean() })).default([]),
});

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return (token?.id as string) || (token?.sub as string) || null;
  } catch {
    return null;
  }
}

// GET /api/schedule?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || dayjs().format('YYYY-MM-DD');

  // Try cache (with timeout so slow Redis doesn't block)
  const cached = await Promise.race([
    cache.get(CACHE_KEYS.userSchedule(userId, date)),
    new Promise<null>(r => setTimeout(() => r(null), 500)),
  ]);
  if (cached) return NextResponse.json(cached);

  const dayOfWeek = dayjs(date).day();
  const d = dayOfWeek === 0 ? 7 : dayOfWeek;

  const slots = await prisma.scheduleSlot.findMany({
    where: { userId, isActive: true, repeatDays: { has: d } },
    include: { taskLogs: { where: { date } } },
    orderBy: { startTime: 'asc' },
  });

  const enriched = slots.map(slot => {
    const log = slot.taskLogs[0];
    return { ...slot, taskLog: log || null, status: log?.status || 'PENDING' };
  });

  // Cache without blocking response
  cache.set(CACHE_KEYS.userSchedule(userId, date), enriched, 120).catch(() => {});
  return NextResponse.json(enriched);
}

// POST /api/schedule
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parse body — catch malformed JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = slotSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  // Verify user exists (prevents FK violation)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'User not found — please sign in again' }, { status: 404 });

  const count = await prisma.scheduleSlot.count({ where: { userId } });

  try {
    const slot = await prisma.scheduleSlot.create({
      data: {
        ...data,
        userId,
        sortOrder: count,
        checklist: data.checklist as any,
        tag:        data.tag        as any,
        strictMode: data.strictMode as any,
      },
    });

    cache.invalidateUser(userId).catch(() => {});
    return NextResponse.json(slot, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/schedule error:', err);
    if (err.code === 'P2003') {
      return NextResponse.json({ error: 'User not found — sign out and sign back in' }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || 'Failed to create slot' }, { status: 500 });
  }
}

// PATCH /api/schedule
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await prisma.scheduleSlot.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.scheduleSlot.update({
    where: { id },
    data: { ...rest, checklist: rest.checklist as any },
  });

  cache.invalidateUser(userId).catch(() => {});
  return NextResponse.json(updated);
}

// DELETE /api/schedule?id=...
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await prisma.scheduleSlot.updateMany({ where: { id, userId }, data: { isActive: false } });
  cache.invalidateUser(userId).catch(() => {});
  return NextResponse.json({ ok: true });
}
