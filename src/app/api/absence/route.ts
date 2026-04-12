// src/app/api/absence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as {id?: string})?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const records = await prisma.absenceRecord.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { date, reason } = await req.json();
  const record = await prisma.absenceRecord.upsert({
    where: { userId_date: { userId, date } },
    update: { reason },
    create: { userId, date, reason },
  });
  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { date } = await req.json();
  await prisma.absenceRecord.deleteMany({ where: { userId, date } });
  return NextResponse.json({ ok: true });
}
