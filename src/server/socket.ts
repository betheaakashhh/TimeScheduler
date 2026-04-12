// src/server/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const PORT = parseInt(process.env.SOCKET_PORT || '3001');

const httpServer = http.createServer();
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Room = userId — each user gets their own room for targeted events
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  let roomUserId: string | null = null;

  socket.on('client:join-room', ({ userId }: { userId: string }) => {
    socket.join(`user:${userId}`);
    roomUserId = userId;
    console.log(`Socket ${socket.id} joined room user:${userId}`);
  });

  socket.on('slot:mark-complete', async ({ slotId, date }: { slotId: string; date: string }) => {
    try {
      const log = await prisma.taskLog.upsert({
        where: { slotId_date: { slotId, date } },
        update: { status: 'COMPLETED', completedAt: new Date() },
        create: { slotId, date, status: 'COMPLETED', completedAt: new Date(), userId: '' },
      });
      const slot = await prisma.scheduleSlot.findUnique({ where: { id: slotId } , select: { userId: true } });
      if (!slot) { console.error('mark-complete: slot not found', slotId); return; }
      const userId = slot.userId;

       await prisma.taskLog.upsert({
        where: { slotId_date: { slotId, date } },
        update: { status: 'COMPLETED', completedAt: new Date() },
        create: { slotId, date, userId, status: 'COMPLETED', completedAt: new Date() },
      });
      if (slot) {
        io.to(`user:${slot.userId}`).emit('slot:status-update', {
          slotId, status: 'COMPLETED', date,
        });
        await checkAndUpdateStreak(slot.userId, date);
      }
    } catch (err) {
      console.error('mark-complete error:', err);
    }
  });

  socket.on('slot:mark-skip', async ({ slotId, date, reason }: { slotId: string; date: string; reason?: string }) => {
    try {
      const slot = await prisma.scheduleSlot.findUnique({ where: { id: slotId } });
      if (!slot) return;
      const userId = slot.userId;

      await prisma.taskLog.upsert({
        where: { slotId_date: { slotId, date } },
        update: { status: 'SKIPPED', skippedAt: new Date(), notes: reason },
        create: { slotId, date, status: 'SKIPPED', skippedAt: new Date(), notes: reason, userId: slot.userId },
      });

      io.to(`user:${slot.userId}`).emit('slot:status-update', {
        slotId, status: 'SKIPPED', date,
      });

      // If strict HARD — block downstream slots
       if (slot.isStrict && slot.strictMode === 'HARD') {
        const laterSlots = await prisma.scheduleSlot.findMany({ where: { userId, startTime: { gt: slot.startTime }, isActive: true } });
        for (const ls of laterSlots) {
          await prisma.taskLog.upsert({ where: { slotId_date: { slotId: ls.id, date } }, update: { status: 'BLOCKED' }, create: { slotId: ls.id, date, userId, status: 'BLOCKED' } });
          io.to(`user:${userId}`).emit('slot:status-update', { slotId: ls.id, status: 'BLOCKED', date });
        }
      } else if (slot.isStrict && slot.strictMode === 'WARN') {
        await prisma.streak.upsert({ where: { userId }, update: { current: 0 }, create: { userId, current: 0, best: 0 } });
      }
    } catch (err) {
      console.error('mark-skip error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Periodic tick — runs every 60s to auto-advance schedule
setInterval(async () => {
  await scheduleTick();
  await academicTick();
}, 60_000);

async function scheduleTick() {
  const now = dayjs().tz('Asia/Kolkata');
  const today = now.format('YYYY-MM-DD');
  const currentTime = now.format('HH:mm');

  const slots = await prisma.scheduleSlot.findMany({
    where: {
      isActive: true,
      isAutoMark: true,
      repeatDays: { has: now.day() === 0 ? 7 : now.day() },
    },
    include: {
      taskLogs: { where: { date: today } },
    },
  });

  for (const slot of slots) {
    const alreadyLogged = slot.taskLogs.length > 0;
    if (!alreadyLogged && currentTime >= slot.endTime) {
      // Auto-complete this slot
      await prisma.taskLog.create({
        data: { slotId: slot.id, date: today, status: 'COMPLETED', completedAt: new Date(), userId: slot.userId },
      });
      io.to(`user:${slot.userId}`).emit('slot:auto-complete', { slotId: slot.id, date: today });
    }

    // Notify 5 min before slot starts
    const slotStart = dayjs(`${today} ${slot.startTime}`, 'YYYY-MM-DD HH:mm');
    const minsUntil = slotStart.diff(now, 'minute');
    if (minsUntil === 5) {
      io.to(`user:${slot.userId}`).emit('slot:next-starts', { slotId: slot.id, startsIn: 5 });
    }
  }
}

async function academicTick() {
  const now = dayjs().tz('Asia/Kolkata');
  const today = now.format('YYYY-MM-DD');
  const currentTime = now.format('HH:mm');
  const dayOfWeek = now.day() === 0 ? 7 : now.day();

  const timetables = await prisma.academicTimetable.findMany({
    include: { periods: true },
  });

  for (const tt of timetables) {
    const todayPeriods = tt.periods.filter((p) => p.dayOfWeek.includes(dayOfWeek));

    const current = todayPeriods.find((p) => currentTime >= p.startTime && currentTime < p.endTime) || null;
    const next = todayPeriods
      .filter((p) => p.startTime > currentTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null;

    io.to(`user:${tt.userId}`).emit('academic:period-change', {
      current: current ? { ...current, isCurrentlyActive: true } : null,
      next: next ? { ...next, isUpcoming: true } : null,
    });
  }
}

async function checkAndUpdateStreak(userId: string, date: string) {
  const today = dayjs(date);
  const yesterday = today.subtract(1, 'day').format('YYYY-MM-DD');

  const streak = await prisma.streak.findUnique({ where: { userId } });

  // Check if all strict slots are done today
  const strictSlots = await prisma.scheduleSlot.findMany({ where: { userId, isStrict: true, isActive: true } });
  const strictLogs = await prisma.taskLog.findMany({
    where: { userId, date, status: 'COMPLETED', slotId: { in: strictSlots.map((s) => s.id) } },
  });

  const allDone = strictSlots.length === 0 || strictLogs.length >= strictSlots.length * 0.6;

  if (!allDone) return;

  const isConsecutive = streak?.lastDate === yesterday;
  const newCurrent = isConsecutive ? (streak?.current || 0) + 1 : 1;
  const newBest = Math.max(newCurrent, streak?.best || 0);

  const updated = await prisma.streak.upsert({
    where: { userId },
    update: { current: newCurrent, best: newBest, lastDate: date },
    create: { userId, current: newCurrent, best: newBest, lastDate: date },
  });

  await redis.setex(`user:${userId}:streak`, 3600, JSON.stringify(updated));
  io.to(`user:${userId}`).emit('streak:updated', { streak: updated, atRisk: false });
}

async function breakStreak(userId: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak || streak.current === 0) return;

  const updated = await prisma.streak.update({
    where: { userId },
    data: { current: 0 },
  });

  io.to(`user:${userId}`).emit('streak:updated', { streak: updated, atRisk: false });
}

async function handleHardLock(userId: string, skippedSlotId: string, date: string) {
  // Get all subsequent slots for today and mark as BLOCKED
  const skipped = await prisma.scheduleSlot.findUnique({ where: { id: skippedSlotId } });
  if (!skipped) return;

  const laterSlots = await prisma.scheduleSlot.findMany({
    where: { userId, startTime: { gt: skipped.startTime }, isActive: true },
  });

  for (const slot of laterSlots) {
    await prisma.taskLog.upsert({
      where: { slotId_date: { slotId: slot.id, date } },
      update: { status: 'BLOCKED' },
      create: { slotId: slot.id, date, status: 'BLOCKED', userId },
    });
    io.to(`user:${userId}`).emit('slot:status-update', { slotId: slot.id, status: 'BLOCKED', date });
  }
}

httpServer.listen(PORT, () => {
  console.log(`🔌 Socket.io server running on port ${PORT}`);
});

export default io;
