// src/app/api/reading/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as {id?: string})?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '30';
  const since = dayjs().subtract(parseInt(range), 'day').format('YYYY-MM-DD');
  const sessions = await prisma.readingSession.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });
  const totalSec = sessions.reduce((a, s) => a + s.durationSec, 0);
  const byDay: Record<string, number> = {};
  sessions.forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + s.durationSec; });
  return NextResponse.json({ sessions, totalSec, byDay });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const record = await prisma.readingSession.create({
    data: {
      userId,
      title:       body.title || null,
      sessionType: body.sessionType || 'passive',
      durationSec: body.durationSec || 0,
      overview:    body.overview || null,
      date:        body.date || dayjs().format('YYYY-MM-DD'),
    },
  });
  return NextResponse.json(record, { status: 201 });
}
