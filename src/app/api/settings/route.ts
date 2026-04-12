// src/app/api/settings/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/redis';

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Delete all user data except the account itself
  await prisma.taskLog.deleteMany({ where: { userId } });
  await prisma.scheduleSlot.deleteMany({ where: { userId } });
  await prisma.foodLog.deleteMany({ where: { userId } });
  await prisma.readingSession.deleteMany({ where: { userId } });
  await prisma.absenceRecord.deleteMany({ where: { userId } });
  await prisma.streak.upsert({ where: { userId }, update: { current: 0, best: 0, lastDate: null }, create: { userId, current: 0, best: 0 } });
  if ((prisma as any).academicTimetable) {
    const tt = await prisma.academicTimetable.findUnique({ where: { userId } });
    if (tt) { await prisma.academicPeriod.deleteMany({ where: { timetableId: tt.id } }); await prisma.academicTimetable.delete({ where: { userId } }); }
  }
  await cache.invalidateUser(userId).catch(() => {});
  return NextResponse.json({ ok: true });
}
