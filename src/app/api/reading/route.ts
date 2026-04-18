// ════════════════════════════════════════════════════════════════════════════════
// src/app/api/reading/route.ts  (UPDATED)
// Added: pagesRead, totalPages, bookType fields.
// GET now also returns: totalPages (sum), byDayPages (pages per day), bookTypes (format count map)
// ════════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '30';
  const since = dayjs().subtract(parseInt(range), 'day').format('YYYY-MM-DD');

  const sessions = await prisma.readingSession.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  // ── Aggregations ──────────────────────────────────────────────────────────
  const totalSec   = sessions.reduce((a, s) => a + s.durationSec, 0);
  const totalPages = sessions.reduce((a, s) => a + ((s as any).pagesRead || 0), 0);

  const byDay: Record<string, number>      = {};
  const byDayPages: Record<string, number> = {};
  const bookTypes: Record<string, number>  = {};

  sessions.forEach(s => {
    // Time per day
    byDay[s.date] = (byDay[s.date] || 0) + s.durationSec;

    // Pages per day
    const pages = (s as any).pagesRead || 0;
    if (pages > 0) {
      byDayPages[s.date] = (byDayPages[s.date] || 0) + pages;
    }

    // Book format distribution
    const fmt = (s as any).bookType || (s.sessionType === 'active' ? 'UNKNOWN' : 'PASSIVE');
    bookTypes[fmt] = (bookTypes[fmt] || 0) + 1;
  });

  return NextResponse.json({ sessions, totalSec, totalPages, byDay, byDayPages, bookTypes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const record = await prisma.readingSession.create({
    data: {
      userId,
      title:       body.title       || null,
      sessionType: body.sessionType || 'passive',
      durationSec: body.durationSec || 0,
      overview:    body.overview    || null,
      date:        body.date        || dayjs().format('YYYY-MM-DD'),
      // New fields (require Prisma schema migration — see below)
      pagesRead:   body.pagesRead   || 0,
      totalPages:  body.totalPages  || 0,
      bookType:    body.bookType    || null,
    } as any, // cast needed until migration runs
  });

  return NextResponse.json(record, { status: 201 });
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