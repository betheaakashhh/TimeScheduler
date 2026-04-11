// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  emailEnabled:  z.boolean().optional(),
  streakWarning: z.boolean().optional(),
  soundEnabled:  z.boolean().optional(),
  darkMode:      z.boolean().optional(),
  wakeUpTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone:      z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { emailEnabled: true, streakWarning: true, soundEnabled: true, darkMode: true, wakeUpTime: true, timezone: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: (session.user as any).id },
    data: parsed.data,
    select: { emailEnabled: true, streakWarning: true, soundEnabled: true, darkMode: true, wakeUpTime: true },
  });

  return NextResponse.json(updated);
}
