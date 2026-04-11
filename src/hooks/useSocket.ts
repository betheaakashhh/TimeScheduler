'use client';
// src/hooks/useSocket.ts
// Socket is optional — if server is down, the app still works fully via HTTP polling.
import { useEffect, useRef, useCallback, useState } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import type { TaskStatus } from '@/types';

let socketInstance: any = null;
let socketLoadAttempted = false;

// Lazy-load socket.io-client only in the browser
async function getSocket() {
  if (typeof window === 'undefined') return null;

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  if (socketInstance) return socketInstance;
  if (socketLoadAttempted) return null; // already failed once
  socketLoadAttempted = true;

  try {
    const { io } = await import('socket.io-client');
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 5000,
    });

    // Suppress console errors for connection failures
    socketInstance.on('connect_error', (err: Error) => {
      // Only log on first failure, not every retry
      if (socketInstance._connectErrors === undefined) {
        socketInstance._connectErrors = 0;
      }
      socketInstance._connectErrors++;
      if (socketInstance._connectErrors === 1) {
        console.info('ℹ️ Socket server not reachable — running in offline mode. Start socket server with: npm run socket');
      }
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected');
      socketInstance._connectErrors = 0;
    });

    return socketInstance;
  } catch (err) {
    console.info('ℹ️ Socket.io not available — offline mode');
    return null;
  }
}

export function useSocket(userId: string | undefined) {
  const socketRef = useRef<any>(null);
  const { updateSlotStatus, updateStreak, updateAcademicPeriod, markAutoComplete } = useScheduleStore();

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    getSocket().then(socket => {
      if (!socket || !mounted) return;
      socketRef.current = socket;

      socket.emit('client:join-room', { userId });

      socket.on('slot:status-update', ({ slotId, status }: { slotId: string; status: TaskStatus }) => {
        if (mounted) updateSlotStatus(slotId, status);
      });
      socket.on('slot:auto-complete', ({ slotId }: { slotId: string }) => {
        if (mounted) markAutoComplete(slotId);
      });
      socket.on('streak:updated', ({ streak }: { streak: any }) => {
        if (mounted) updateStreak(streak);
      });
      socket.on('academic:period-change', ({ current, next }: { current: any; next: any }) => {
        if (mounted) updateAcademicPeriod(current, next);
      });
    });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.off('slot:status-update');
        socketRef.current.off('slot:auto-complete');
        socketRef.current.off('streak:updated');
        socketRef.current.off('academic:period-change');
      }
    };
  }, [userId, updateSlotStatus, updateStreak, updateAcademicPeriod, markAutoComplete]);

  const markComplete = useCallback((slotId: string, date: string) => {
    socketRef.current?.emit('slot:mark-complete', { slotId, date });
    // Also hit the REST API as fallback for reliability
    fetch('/api/schedule/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, date, status: 'COMPLETED' }),
    }).catch(() => {});
  }, []);

  const markSkip = useCallback((slotId: string, date: string, reason?: string) => {
    socketRef.current?.emit('slot:mark-skip', { slotId, date, reason });
    fetch('/api/schedule/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, date, status: 'SKIPPED', notes: reason }),
    }).catch(() => {});
  }, []);

  return { markComplete, markSkip };
}

// ── Hydration-safe live clock — null on server, ticks after mount ─────────────
export function useLiveClock(includeSeconds = true) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
      const ap = h >= 12 ? 'PM' : 'AM';
      const hh = h % 12 || 12;
      const mm = String(m).padStart(2, '0');
      setTime(includeSeconds
        ? `${hh}:${mm}:${String(s).padStart(2,'0')} ${ap}`
        : `${hh}:${mm} ${ap}`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [includeSeconds]);

  return time; // null until mounted
}

export function useActiveSlot(slots: any[]) {
  const [activeSlot, setActiveSlot] = useState<any>(null);
  useEffect(() => {
    function check() {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      setActiveSlot(slots.find(s => t >= s.startTime && t < s.endTime) || null);
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [slots]);
  return activeSlot;
}
