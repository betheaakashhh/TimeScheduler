'use client';
// src/hooks/useSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useScheduleStore } from '@/store/scheduleStore';
import { TaskStatus } from '@/types';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
      { transports: ['websocket', 'polling'], reconnectionAttempts: 5, reconnectionDelay: 1000 }
    );
  }
  return socketInstance;
}

export function useSocket(userId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const { updateSlotStatus, updateStreak, updateAcademicPeriod, markAutoComplete } = useScheduleStore();

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('client:join-room', { userId });
    socket.on('slot:status-update', ({ slotId, status }: { slotId: string; status: TaskStatus }) => {
      updateSlotStatus(slotId, status);
    });
    socket.on('slot:auto-complete', ({ slotId }: { slotId: string }) => {
      markAutoComplete(slotId);
    });
    socket.on('streak:updated', ({ streak }: { streak: any }) => {
      updateStreak(streak);
    });
    socket.on('academic:period-change', ({ current, next }: { current: any; next: any }) => {
      updateAcademicPeriod(current, next);
    });
    return () => {
      socket.off('slot:status-update');
      socket.off('slot:auto-complete');
      socket.off('streak:updated');
      socket.off('academic:period-change');
    };
  }, [userId, updateSlotStatus, updateStreak, updateAcademicPeriod, markAutoComplete]);

  const markComplete = useCallback((slotId: string, date: string) => {
    socketRef.current?.emit('slot:mark-complete', { slotId, date });
  }, []);

  const markSkip = useCallback((slotId: string, date: string, reason?: string) => {
    socketRef.current?.emit('slot:mark-skip', { slotId, date, reason });
  }, []);

  return { markComplete, markSkip };
}

/**
 * Hydration-safe live clock.
 * Returns null on the server and on first render — prevents SSR/client mismatch.
 * Callers must render a stable placeholder when the value is null.
 */
export function useLiveClock(includeSeconds = true) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const ap = h >= 12 ? 'PM' : 'AM';
      const hh = h % 12 || 12;
      const mm = String(m).padStart(2, '0');
      if (includeSeconds) {
        setTime(`${hh}:${mm}:${String(s).padStart(2, '0')} ${ap}`);
      } else {
        setTime(`${hh}:${mm} ${ap}`);
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [includeSeconds]);

  return time;
}

export function useActiveSlot(slots: any[]) {
  const [activeSlot, setActiveSlot] = useState<any>(null);
  useEffect(() => {
    function check() {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      setActiveSlot(slots.find((s) => t >= s.startTime && t < s.endTime) || null);
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [slots]);
  return activeSlot;
}
