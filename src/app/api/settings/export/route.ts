// src/app/api/settings/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [slots, logs, food, streak, reading] = await Promise.all([
    prisma.scheduleSlot.findMany({ where: { userId } }),
    prisma.taskLog.findMany({ where: { userId } }),
    prisma.foodLog.findMany({ where: { userId } }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.readingSession.findMany({ where: { userId } }),
  ]);
  const data = { exportedAt: new Date().toISOString(), slots, taskLogs: logs, foodLogs: food, streak, readingSessions: reading };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="rhythmiq-export.json"' },
  });
}
