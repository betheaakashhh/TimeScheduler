// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1).max(80).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email:        email.toLowerCase(),
      name:         name || null,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  // Seed default slots for new users
  await seedDefaultSlots(user.id);

  // Create streak record
  await prisma.streak.create({ data: { userId: user.id, current: 0, best: 0 } });

  return NextResponse.json({ user }, { status: 201 });
}

async function seedDefaultSlots(userId: string) {
  const defaults = [
    {
      title: 'Wake Up', emoji: '🌅', startTime: '06:00', endTime: '06:05',
      tag: 'MORNING_ROUTINE', isAutoMark: true, isStrict: false,
      checklist: [{ id: '1', label: 'Set alarm for tomorrow', required: false }],
      description: 'Rise and shine!',
    },
    {
      title: 'Morning Routine', emoji: '🚿', startTime: '06:05', endTime: '07:30',
      tag: 'MORNING_ROUTINE', isAutoMark: true, isStrict: false,
      checklist: [
        { id: '2', label: 'Brush & freshen up', required: false },
        { id: '3', label: 'Make bed', required: false },
      ],
      description: 'Hygiene & basics',
    },
    {
      title: 'Breakfast', emoji: '🍳', startTime: '07:30', endTime: '08:30',
      tag: 'BREAKFAST', isAutoMark: false, isStrict: true, strictMode: 'HARD', foodRequired: true, emailAlert: true,
      checklist: [
        { id: '4', label: 'Log food items', required: true },
        { id: '5', label: 'Take vitamins', required: false },
      ],
      description: 'Log what you eat to continue',
    },
    {
      title: 'Self Study', emoji: '📚', startTime: '16:30', endTime: '17:30',
      tag: 'SELF_STUDY', isAutoMark: false, isStrict: true, strictMode: 'WARN', emailAlert: true,
      checklist: [
        { id: '6', label: 'Phone on DND', required: false },
        { id: '7', label: 'Timer set', required: false },
      ],
      description: 'Revision + assignments',
    },
    {
      title: 'Dinner', emoji: '🍛', startTime: '20:00', endTime: '20:30',
      tag: 'DINNER', isAutoMark: false, isStrict: true, strictMode: 'WARN', foodRequired: true,
      checklist: [{ id: '8', label: 'Log dinner items', required: true }],
      description: 'Eat well and wind down',
    },
  ];

  await prisma.scheduleSlot.createMany({
    data: defaults.map((s, i) => ({
      userId,
      title:        s.title,
      emoji:        s.emoji,
      startTime:    s.startTime,
      endTime:      s.endTime,
      tag:          s.tag as any,
      isAutoMark:   s.isAutoMark,
      isStrict:     s.isStrict,
      strictMode:   (s.strictMode || 'WARN') as any,
      foodRequired: s.foodRequired || false,
      emailAlert:   s.emailAlert || false,
      checklist:    s.checklist as any,
      description:  s.description,
      sortOrder:    i,
      repeatDays:   [1, 2, 3, 4, 5, 6, 7],
    })),
  });
}
