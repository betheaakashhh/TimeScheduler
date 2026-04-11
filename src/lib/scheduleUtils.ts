// src/lib/scheduleUtils.ts
import dayjs from 'dayjs';
import { ScheduleSlot, DayLevel, DAY_LEVEL_CONFIG, DayStats } from '@/types';

/** Convert "HH:mm" to minutes from midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Get current time as "HH:mm" */
export function currentTime(): string {
  return dayjs().format('HH:mm');
}

/** Check if a slot is currently active */
export function isSlotActive(slot: ScheduleSlot): boolean {
  const now = timeToMinutes(currentTime());
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  return now >= start && now < end;
}

/** Minutes remaining in current slot */
export function minutesLeft(slot: ScheduleSlot): number {
  const now = timeToMinutes(currentTime());
  const end = timeToMinutes(slot.endTime);
  return Math.max(0, end - now);
}

/** Get progress percentage for active slot */
export function slotProgress(slot: ScheduleSlot): number {
  const now = timeToMinutes(currentTime());
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  const total = end - start;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / total) * 100)));
}

/** Format "HH:mm" to "9:30 AM" */
export function formatTime(t: string): string {
  return dayjs(`2000-01-01 ${t}`).format('h:mm A');
}

/** Format slot duration */
export function formatDuration(start: string, end: string): string {
  const mins = timeToMinutes(end) - timeToMinutes(start);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Calculate today's level based on completion rate */
export function calculateLevel(stats: DayStats): DayLevel {
  const { completionRate } = stats;
  if (completionRate >= DAY_LEVEL_CONFIG[6].minRate) return 6;
  if (completionRate >= DAY_LEVEL_CONFIG[5].minRate) return 5;
  if (completionRate >= DAY_LEVEL_CONFIG[4].minRate) return 4;
  if (completionRate >= DAY_LEVEL_CONFIG[3].minRate) return 3;
  if (completionRate >= DAY_LEVEL_CONFIG[2].minRate) return 2;
  return 1;
}

/** Check if streak is at risk (evening and critical slots not done) */
export function isStreakAtRisk(slots: ScheduleSlot[], date: string): boolean {
  const now = dayjs();
  const hour = now.hour();
  if (hour < 18) return false; // Only show risk after 6 PM

  const strictSlots = slots.filter((s) => s.isStrict);
  const done = strictSlots.filter((s) => s.status === 'COMPLETED').length;
  return done < strictSlots.length * 0.6;
}

/** Get greeting message based on time of day */
export function getGreeting(name: string): { greeting: string; message: string } {
  const hour = dayjs().hour();
  if (hour < 12) {
    return {
      greeting: `Good morning, ${name}!`,
      message: 'Hope you are well and feeling refreshed. Start strong! 🌟',
    };
  } else if (hour < 17) {
    return {
      greeting: `Good afternoon, ${name}!`,
      message: "You're doing great — keep the momentum going! ⚡",
    };
  } else {
    return {
      greeting: `Good evening, ${name}!`,
      message: "Wind down well and complete your remaining tasks! 🌙",
    };
  }
}

/** Check if a slot is scheduled for today */
export function isSlotToday(slot: ScheduleSlot): boolean {
  const dayOfWeek = dayjs().day();
  const d = dayOfWeek === 0 ? 7 : dayOfWeek;
  return slot.repeatDays.includes(d);
}

/** Sort slots by start time */
export function sortSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return [...slots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/** Compute slot status enrichment for display */
export function enrichSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  return sortSlots(slots).map((slot) => ({
    ...slot,
    isCurrentlyActive: isSlotActive(slot),
    minutesLeft: minutesLeft(slot),
    progress: slotProgress(slot),
  }));
}

/** Week dates (Mon–Sun) for current week */
export function getCurrentWeekDates(): string[] {
  const today = dayjs();
  const monday = today.startOf('week').add(1, 'day');
  return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day').format('YYYY-MM-DD'));
}

/** Compute XP earned today based on completed tasks */
export function computeXP(stats: DayStats): number {
  return stats.completed * 10 + (stats.completionRate >= 0.8 ? 50 : 0) + (stats.completionRate === 1 ? 100 : 0);
}

export const STRICT_MODE_CONFIG = {
  HARD:  { label: 'Hard lock',    icon: '🔒', desc: 'Next tasks blocked until this is done', color: '#E24B4A' },
  WARN:  { label: 'Warn & skip',  icon: '⚠️', desc: 'Streak breaks if skipped',             color: '#F5A623' },
  GRACE: { label: 'Grace period', icon: '⏳', desc: '30 min buffer before penalty',          color: '#4A90D9' },
} as const;
