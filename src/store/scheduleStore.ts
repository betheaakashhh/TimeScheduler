// src/store/scheduleStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScheduleSlot, Streak, AcademicPeriod, TaskStatus } from '@/types';

interface ScheduleStore {
  slots: ScheduleSlot[];
  streak: Streak | null;
  currentPeriod: AcademicPeriod | null;
  nextPeriod: AcademicPeriod | null;
  theme: 'light' | 'dark';
  sidebarExpanded: boolean;
  isLoading: boolean;
  setSlots: (slots: ScheduleSlot[]) => void;
  setStreak: (streak: Streak) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarExpanded: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  updateSlotStatus: (slotId: string, status: TaskStatus) => void;
  markAutoComplete: (slotId: string) => void;
  updateStreak: (streak: Streak) => void;
  updateAcademicPeriod: (current: AcademicPeriod | null, next: AcademicPeriod | null) => void;
  addSlot: (slot: ScheduleSlot) => void;
  removeSlot: (slotId: string) => void;
  updateSlot: (slotId: string, patch: Partial<ScheduleSlot>) => void;
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set) => ({
      slots: [],
      streak: null,
      currentPeriod: null,
      nextPeriod: null,
      theme: 'light',
      sidebarExpanded: false,
      isLoading: false,
      setSlots: (slots) => set({ slots }),
      setStreak: (streak) => set({ streak }),
      setLoading: (v) => set({ isLoading: v }),
      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
        }
        set({ theme });
      },
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (v) => set({ sidebarExpanded: v }),
      updateSlotStatus: (slotId, status) =>
        set((state) => ({
          slots: state.slots.map((s) => s.id === slotId ? { ...s, status, taskLog: { ...s.taskLog, status } as any } : s),
        })),
      markAutoComplete: (slotId) =>
        set((state) => ({ slots: state.slots.map((s) => s.id === slotId ? { ...s, status: 'COMPLETED' } : s) })),
      updateStreak: (streak) => set({ streak }),
      updateAcademicPeriod: (current, next) => set({ currentPeriod: current, nextPeriod: next }),
      addSlot: (slot) => set((s) => ({ slots: [...s.slots, slot] })),
      removeSlot: (slotId) => set((s) => ({ slots: s.slots.filter((x) => x.id !== slotId) })),
      updateSlot: (slotId, patch) =>
        set((s) => ({ slots: s.slots.map((x) => (x.id === slotId ? { ...x, ...patch } : x)) })),
    }),
    {
      name: 'rhythmiq-ui',
      partialize: (state) => ({ theme: state.theme, sidebarExpanded: state.sidebarExpanded }),
    }
  )
);

export const selectTodayStats = (state: ScheduleStore) => {
  const nonAuto = state.slots.filter((s) => !s.isAutoMark);
  const done = nonAuto.filter((s) => s.status === 'COMPLETED').length;
  const total = nonAuto.length;
  const rate = total > 0 ? done / total : 0;
  return { done, total, rate, pct: Math.round(rate * 100) };
};

export const selectCurrentSlot = (state: ScheduleStore) => state.slots.find((s) => s.isCurrentlyActive) || null;
export const selectUpcomingSlots = (state: ScheduleStore) =>
  state.slots.filter((s) => s.status === 'PENDING' && !s.isCurrentlyActive).slice(0, 4);
