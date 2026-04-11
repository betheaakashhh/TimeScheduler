// server.js
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Initialize Prisma and Redis
const prisma = new PrismaClient();
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) console.warn('⚠️ Redis not configured – streak caching disabled');

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ---------- Socket.io event handlers ----------
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('client:join-room', ({ userId }) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined room user:${userId}`);
    });

    socket.on('slot:mark-complete', async ({ slotId, date }) => {
      try {
        const log = await prisma.taskLog.upsert({
          where: { slotId_date: { slotId, date } },
          update: { status: 'COMPLETED', completedAt: new Date() },
          create: { slotId, date, status: 'COMPLETED', completedAt: new Date(), userId: '' },
        });
        const slot = await prisma.scheduleSlot.findUnique({ where: { id: slotId } });
        if (slot) {
          io.to(`user:${slot.userId}`).emit('slot:status-update', {
            slotId,
            status: 'COMPLETED',
            date,
          });
          await checkAndUpdateStreak(slot.userId, date);
        }
      } catch (err) {
        console.error('mark-complete error:', err);
      }
    });

    socket.on('slot:mark-skip', async ({ slotId, date, reason }) => {
      try {
        const slot = await prisma.scheduleSlot.findUnique({ where: { id: slotId } });
        if (!slot) return;

        await prisma.taskLog.upsert({
          where: { slotId_date: { slotId, date } },
          update: { status: 'SKIPPED', skippedAt: new Date(), notes: reason },
          create: {
            slotId,
            date,
            status: 'SKIPPED',
            skippedAt: new Date(),
            notes: reason,
            userId: slot.userId,
          },
        });

        io.to(`user:${slot.userId}`).emit('slot:status-update', {
          slotId,
          status: 'SKIPPED',
          date,
        });

        if (slot.isStrict && slot.strictMode === 'HARD') {
          await handleHardLock(slot.userId, slotId, date);
        } else if (slot.isStrict && slot.strictMode === 'WARN') {
          await breakStreak(slot.userId);
        }
      } catch (err) {
        console.error('mark-skip error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  // ---------- Periodic ticks (every 60 seconds) ----------
  setInterval(async () => {
    await scheduleTick();
    await academicTick();
  }, 60_000);

  // ---------- Helper functions (copied from socket.ts) ----------
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
        await prisma.taskLog.create({
          data: {
            slotId: slot.id,
            date: today,
            status: 'COMPLETED',
            completedAt: new Date(),
            userId: slot.userId,
          },
        });
        io.to(`user:${slot.userId}`).emit('slot:auto-complete', { slotId: slot.id, date: today });
      }

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

      const current =
        todayPeriods.find((p) => currentTime >= p.startTime && currentTime < p.endTime) || null;
      const next =
        todayPeriods
          .filter((p) => p.startTime > currentTime)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null;

      io.to(`user:${tt.userId}`).emit('academic:period-change', {
        current: current ? { ...current, isCurrentlyActive: true } : null,
        next: next ? { ...next, isUpcoming: true } : null,
      });
    }
  }

  async function checkAndUpdateStreak(userId, date) {
    const today = dayjs(date);
    const yesterday = today.subtract(1, 'day').format('YYYY-MM-DD');

    const streak = await prisma.streak.findUnique({ where: { userId } });

    const strictSlots = await prisma.scheduleSlot.findMany({
      where: { userId, isStrict: true, isActive: true },
    });
    const strictLogs = await prisma.taskLog.findMany({
      where: {
        userId,
        date,
        status: 'COMPLETED',
        slotId: { in: strictSlots.map((s) => s.id) },
      },
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

    if (redis) {
      await redis.setex(`user:${userId}:streak`, 3600, JSON.stringify(updated));
    }
    io.to(`user:${userId}`).emit('streak:updated', { streak: updated, atRisk: false });
  }

  async function breakStreak(userId) {
    const streak = await prisma.streak.findUnique({ where: { userId } });
    if (!streak || streak.current === 0) return;

    const updated = await prisma.streak.update({
      where: { userId },
      data: { current: 0 },
    });

    io.to(`user:${userId}`).emit('streak:updated', { streak: updated, atRisk: false });
  }

  async function handleHardLock(userId, skippedSlotId, date) {
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
      io.to(`user:${userId}`).emit('slot:status-update', {
        slotId: slot.id,
        status: 'BLOCKED',
        date,
      });
    }
  }

  // ---------- Start the server ----------
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`✅ Next.js app running on port ${PORT}`);
    console.log(`🔌 Socket.io attached and listening`);
  });
});