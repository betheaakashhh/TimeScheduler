// src/types/index.ts

export type SlotTag =
  | 'BREAKFAST' | 'MORNING_ROUTINE' | 'GYM' | 'WORKOUT'
  | 'COLLEGE' | 'SCHOOL' | 'SELF_STUDY' | 'WALK'
  | 'DINNER' | 'LUNCH' | 'WORK' | 'SLEEP'
  | 'MEDITATION' | 'READING' | 'CUSTOM';

export type StrictMode = 'HARD' | 'WARN' | 'GRACE';

export type TaskStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  checked?: boolean;
}

export interface ScheduleSlot {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string;    // "07:30"
  endTime: string;      // "08:30"
  tag: SlotTag;
  customTag?: string;
  emoji: string;
  color?: string;
  isStrict: boolean;
  strictMode: StrictMode;
  isAutoMark: boolean;
  emailAlert: boolean;
  foodRequired: boolean;
  isAcademic: boolean;
  isActive: boolean;
  sortOrder: number;
  repeatDays: number[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
  // Computed
  taskLog?: TaskLog;
  status?: TaskStatus;
  progress?: number;
  isCurrentlyActive?: boolean;
  minutesLeft?: number;
}

export interface TaskLog {
  id: string;
  userId: string;
  slotId: string;
  date: string;
  status: TaskStatus;
  completedAt?: string;
  skippedAt?: string;
  notes?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  items: string[];
  notes?: string;
  loggedAt: string;
}

export interface Streak {
  id: string;
  userId: string;
  current: number;
  best: number;
  lastDate?: string;
}

export interface AcademicPeriod {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  room?: string;
  faculty?: string;
  dayOfWeek: number[];
  isLab: boolean;
  color?: string;
  // Computed
  isCurrentlyActive?: boolean;
  minutesLeft?: number;
  isUpcoming?: boolean;
}

export interface DayStats {
  date: string;
  totalSlots: number;
  completed: number;
  skipped: number;
  pending: number;
  completionRate: number;
  level: DayLevel;
  streakContributes: boolean;
}

export type DayLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LEVEL_CONFIG: Record<DayLevel, { label: string; emoji: string; minRate: number }> = {
  1: { label: 'Starter',    emoji: '🌱', minRate: 0    },
  2: { label: 'Energized',  emoji: '⚡', minRate: 0.25 },
  3: { label: 'Achiever',   emoji: '🏆', minRate: 0.50 },
  4: { label: 'On Fire',    emoji: '🔥', minRate: 0.65 },
  5: { label: 'Elite',      emoji: '💎', minRate: 0.80 },
  6: { label: 'Legend',     emoji: '👑', minRate: 0.95 },
};

export const TAG_CONFIG: Record<string, { label: string; emoji: string; defaultStrict: boolean; color: string }> = {
  BREAKFAST:       { label: 'Breakfast',       emoji: '🍳', defaultStrict: true,  color: 'amber'  },
  MORNING_ROUTINE: { label: 'Morning Routine', emoji: '🚿', defaultStrict: false, color: 'teal'   },
  GYM:             { label: 'Gym',             emoji: '💪', defaultStrict: true,  color: 'coral'  },
  WORKOUT:         { label: 'Workout',         emoji: '🏋️', defaultStrict: true,  color: 'coral'  },
  COLLEGE:         { label: 'College',         emoji: '🎓', defaultStrict: true,  color: 'blue'   },
  SCHOOL:          { label: 'School',          emoji: '🏫', defaultStrict: true,  color: 'blue'   },
  SELF_STUDY:      { label: 'Self Study',      emoji: '📚', defaultStrict: true,  color: 'purple' },
  WALK:            { label: 'Walk',            emoji: '🚶', defaultStrict: false, color: 'green'  },
  DINNER:          { label: 'Dinner',          emoji: '🍛', defaultStrict: true,  color: 'amber'  },
  LUNCH:           { label: 'Lunch',           emoji: '🍱', defaultStrict: true,  color: 'amber'  },
  WORK:            { label: 'Work',            emoji: '💼', defaultStrict: true,  color: 'gray'   },
  SLEEP:           { label: 'Sleep',           emoji: '😴', defaultStrict: false, color: 'teal'   },
  MEDITATION:      { label: 'Meditation',      emoji: '🧘', defaultStrict: false, color: 'purple' },
  READING:         { label: 'Reading',         emoji: '📖', defaultStrict: false, color: 'green'  },
  CUSTOM:          { label: 'Custom',          emoji: '📌', defaultStrict: false, color: 'gray'   },
};

export interface SocketEvents {
  // Server → Client
  'slot:status-update': { slotId: string; status: TaskStatus; date: string };
  'slot:auto-complete': { slotId: string; date: string };
  'slot:next-starts':   { slotId: string; startsIn: number };
  'streak:updated':     { streak: Streak; atRisk: boolean };
  'academic:period-change': { current: AcademicPeriod | null; next: AcademicPeriod | null };
  'task:reminder':      { slotId: string; message: string };
  // Client → Server
  'slot:mark-complete': { slotId: string; date: string };
  'slot:mark-skip':     { slotId: string; date: string; reason?: string };
  'client:join-room':   { userId: string };
}

export interface EmailJob {
  to: string;
  type: 'reminder' | 'streak-warning' | 'wake-up' | 'task-alert';
  data: {
    userName: string;
    taskTitle?: string;
    streakCount?: number;
    message?: string;
  };
}

// Re-exported here so components can import STRICT_MODE_CONFIG from '@/types' directly
export const STRICT_MODE_CONFIG = {
  HARD:  { label: 'Hard lock',    icon: 'lock',    desc: 'Next tasks blocked until done', color: '#E24B4A' },
  WARN:  { label: 'Warn & skip',  icon: 'warning', desc: 'Streak breaks if skipped',      color: '#F5A623' },
  GRACE: { label: 'Grace period', icon: 'clock',   desc: '30 min buffer before penalty',  color: '#4A90D9' },
} as const;
