
// src/app/api/reading/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import {Prisma} from '@prisma/client';
import dayjs from 'dayjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


function toNonNegativeInt(value: unknown, fallback = 0){
  const n =  Number(value);
  if(!Number.isFinite(n) || n < 0) return fallback;
  return Math.max(0, Math.floor(n));
}
function getOptionalIntField(source: unknown, key: string) {
  if (!source || typeof source !== 'object') return 0;
  return toNonNegativeInt((source as Record<string, unknown>)[key]);
}

function getOptionalStringField(source: unknown, key: string) {
  if (!source || typeof source !== 'object') return null;
  const raw = (source as Record<string, unknown>)[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;

}
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = toNonNegativeInt(searchParams.get('range')|| '30',30); // days to look back
  const since = dayjs().subtract(range, 'day').format('YYYY-MM-DD');

  const sessions = await prisma.readingSession.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  // ── Aggregations ──────────────────────────────────────────────────────────
 const totalSec = sessions.reduce((a, s) => a + s.durationSec, 0);
 const totalPages = sessions.reduce((a, s) => a + getOptionalIntField(s, 'pagesRead'), 0);

  const byDay: Record<string, number>      = {};
  const byDayPages: Record<string, number> = {};
  const bookTypes: Record<string, number>  = {};

  sessions.forEach(s => {
    // Time per day
    byDay[s.date] = (byDay[s.date] || 0) + s.durationSec;

    // Pages per day
    const pagesRead = getOptionalIntField(s, 'pagesRead');
    if (pagesRead > 0) {
    byDayPages[s.date] = (byDayPages[s.date] || 0) + pagesRead;

     }

    // Book format distribution
    const bookType = getOptionalStringField(s, 'bookType');
    const fmt = bookType || (s.sessionType === 'active' ? 'UNKNOWN' : 'PASSIVE');
    bookTypes[fmt] = (bookTypes[fmt] || 0) + 1;
  });

  return NextResponse.json({ sessions, totalSec, totalPages, byDay, byDayPages, bookTypes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as {id?: string})?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const baseData = {
    userId,
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null,
    sessionType: body.sessionType === 'active' ? 'active' : 'passive',
    durationSec: toNonNegativeInt(body.durationSec),
    overview: typeof body.overview === 'string' && body.overview.trim() ? body.overview.trim() : null,
    fileUrl: typeof body.fileUrl === 'string' && body.fileUrl.trim() ? body.fileUrl.trim() : null,
    date: dayjs().format('YYYY-MM-DD'),
  };

  const extendedData = {
    ...baseData,
    pagesRead: toNonNegativeInt(body.pagesRead),
    totalPages: toNonNegativeInt(body.totalPages),
    bookType: typeof body.bookType === 'string' && body.bookType.trim() ? body.bookType.trim() : null,
  };

  try{
    const record = await prisma.readingSession.create({ data: extendedData });
    return NextResponse.json(record, { status: 201 });  
  }catch(e){

    if(
      e instanceof Prisma.PrismaClientValidationError
      || (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2022' || e.code === 'P2021')))
      {
        const record = await prisma.readingSession.create({ data: baseData }); // fallback to basic data if extended fields cause issues
       return NextResponse.json(record , { status: 201});
    }

    console.error('Failed to create reading session:', e);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
  }
 





// ════════════════════════════════════════════════════════════════════════════════
// PRISMA SCHEMA ADDITIONS
// Add these 3 fields to the `ReadingSession` model in prisma/schema.prisma:
// ════════════════════════════════════════════════════════════════════════════════
/*

model ReadingSession {
  id          String   @id @default(cuid())
  userId      String
  title       String?
  sessionType String   @default("passive")
  durationSec Int      @default(0)
  overview    String?
  fileUrl     String?
  date        String
  createdAt   DateTime @default(now())

  // ── NEW FIELDS ──────────────────────────────────────────
  pagesRead   Int      @default(0)   // unique pages visited in session
  totalPages  Int      @default(0)   // total pages in the book
  bookType    String?                // "PDF" | "TXT" | "EPUB" | "PASSIVE"
  // ────────────────────────────────────────────────────────

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}

*/

// Run after editing schema:
//   npx prisma migrate dev --name add_reading_pages_fields
// Or for production:
//   npx prisma migrate deploy