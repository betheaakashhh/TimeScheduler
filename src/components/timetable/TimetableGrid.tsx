'use client';
// src/components/timetable/TimetableGrid.tsx
// Full weekly timetable — each cell is clickable and shows the slot's timeline detail.
// Time axis: 5 AM – 11 PM  |  Columns: Mon–Sun
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleSlot, TAG_CONFIG, STRICT_MODE_CONFIG } from '@/types';
import { formatTime, formatDuration } from '@/lib/scheduleUtils';
import {
  X, Clock, Lock, CheckCircle2, AlertTriangle,
  BookOpen, Dumbbell, Coffee, Utensils, Calendar,
  PersonStanding, TrendingUp, Moon, Star, Sunrise,
  MapPin, ChevronRight, Radio,
} from 'lucide-react';
import { LucideProps } from 'lucide-react'
// ── Lucide icon map (same as dashboard) ──────────────────────────────────────
const TAG_ICON: Record<string, React.ComponentType<LucideProps>> = {
  BREAKFAST:       Coffee,
  MORNING_ROUTINE: Sunrise,
  GYM:             Dumbbell,
  WORKOUT:         Dumbbell,
  COLLEGE:         BookOpen,
  SCHOOL:          BookOpen,
  SELF_STUDY:      BookOpen,
  WALK:            PersonStanding,
  DINNER:          Utensils,
  LUNCH:           Utensils,
  WORK:            TrendingUp,
  SLEEP:           Moon,
  MEDITATION:      Star,
  READING:         BookOpen,
  CUSTOM:          Calendar,
};

// Tag color map for cell backgrounds
const TAG_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  BREAKFAST:       { bg:'rgba(186,117,23,0.1)',   border:'rgba(186,117,23,0.35)',  text:'#633806' },
  MORNING_ROUTINE: { bg:'rgba(127,119,221,0.1)',  border:'rgba(127,119,221,0.35)', text:'#3C3489' },
  GYM:             { bg:'rgba(212,83,126,0.1)',   border:'rgba(212,83,126,0.35)',  text:'#72243E' },
  WORKOUT:         { bg:'rgba(212,83,126,0.1)',   border:'rgba(212,83,126,0.35)',  text:'#72243E' },
  COLLEGE:         { bg:'rgba(55,138,221,0.1)',   border:'rgba(55,138,221,0.35)',  text:'#0C447C' },
  SCHOOL:          { bg:'rgba(55,138,221,0.1)',   border:'rgba(55,138,221,0.35)',  text:'#0C447C' },
  SELF_STUDY:      { bg:'rgba(83,74,183,0.1)',    border:'rgba(83,74,183,0.35)',   text:'#26215C' },
  WALK:            { bg:'rgba(29,158,117,0.1)',   border:'rgba(29,158,117,0.35)',  text:'#04342C' },
  DINNER:          { bg:'rgba(186,117,23,0.1)',   border:'rgba(186,117,23,0.35)',  text:'#633806' },
  LUNCH:           { bg:'rgba(186,117,23,0.1)',   border:'rgba(186,117,23,0.35)',  text:'#633806' },
  WORK:            { bg:'rgba(136,135,128,0.1)',  border:'rgba(136,135,128,0.35)', text:'#444441' },
  SLEEP:           { bg:'rgba(29,158,117,0.08)',  border:'rgba(29,158,117,0.25)',  text:'#085041' },
  MEDITATION:      { bg:'rgba(83,74,183,0.08)',   border:'rgba(83,74,183,0.25)',   text:'#26215C' },
  READING:         { bg:'rgba(99,153,34,0.1)',    border:'rgba(99,153,34,0.35)',   text:'#173404' },
  CUSTOM:          { bg:'var(--surface2)',         border:'var(--border)',          text:'var(--text2)' },
};

const DAYS     = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// Hour range: 5 AM to 11 PM = 18 hours
const HOUR_START = 5;
const HOUR_END   = 23;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_MIN  = 2.5; // px per minute

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toGridTop(t: string) {
  return (toMins(t) - HOUR_START * 60) * PX_PER_MIN;
}

function toGridHeight(start: string, end: string) {
  return Math.max((toMins(end) - toMins(start)) * PX_PER_MIN - 2, 18);
}

// ── Slot detail panel ─────────────────────────────────────────────────────────
function SlotDetail({
  slot, onClose, onMarkDone, onSkip,
}: {
  slot: ScheduleSlot;
  onClose: () => void;
  onMarkDone?: (id: string) => void;
  onSkip?: (id: string) => void;
}) {
  const Icon = TAG_ICON[slot.tag] || Calendar;
  const colors = TAG_COLOR[slot.tag] || TAG_COLOR.CUSTOM;
  const isDone    = slot.status === 'COMPLETED';
  const isActive  = !!slot.isCurrentlyActive;
  const isBlocked = slot.status === 'BLOCKED';
  const strictCfg = slot.isStrict ? STRICT_MODE_CONFIG[slot.strictMode] : null;

  // Time-gating: only allow marking done AFTER the slot's end time
  function canMarkDoneNow(): boolean {
    if (slot.isAutoMark) return true;
    const now = new Date();
    const [h, m] = slot.endTime.split(':').map(Number);
    const slotEnd = new Date(now); slotEnd.setHours(h, m, 0, 0);
    return now >= slotEnd;
  }
  const timeGated = !canMarkDoneNow();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      style={{
        background: 'var(--surface)',
        border: `0.5px solid ${isActive ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: 'var(--shadow2)',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: colors.bg, border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color={colors.text} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 3 }}>{slot.title}</div>
          {slot.description && (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{slot.description}</div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)' }}>
          <Clock size={13} />
          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
        </div>
        <div style={{ color: 'var(--text3)' }}>{formatDuration(slot.startTime, slot.endTime)}</div>
        {/* Tag pill */}
        <div style={{
          padding: '2px 9px', borderRadius: 20,
          background: colors.bg, color: colors.text,
          fontSize: 11, fontWeight: 500,
        }}>
          {TAG_CONFIG[slot.tag]?.label || slot.tag.replace(/_/g, ' ')}
        </div>
        {/* Strict badge */}
        {strictCfg && (
          <div style={{
            padding: '2px 9px', borderRadius: 20, fontWeight: 600, fontSize: 11,
            background: slot.strictMode === 'HARD' ? 'rgba(226,75,74,0.1)' :
                        slot.strictMode === 'WARN' ? 'rgba(186,117,23,0.1)' : 'rgba(55,138,221,0.1)',
            color:      slot.strictMode === 'HARD' ? '#791F1F' :
                        slot.strictMode === 'WARN' ? '#633806' : '#0C447C',
          }}>
            {strictCfg.label}
          </div>
        )}
      </div>

      {/* Status banner */}
      {isDone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)', marginBottom: 14, fontSize: 13, color: '#085041' }}>
          <CheckCircle2 size={15} /> Completed
        </div>
      )}
      {isActive && !isDone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,107,53,0.08)', border: '0.5px solid rgba(255,107,53,0.25)', marginBottom: 14, fontSize: 13, color: '#712B13' }}>
          <Radio size={15} /> In progress · {slot.minutesLeft}m remaining
          <div style={{ flex: 1 }}>
            <div style={{ height: 4, background: 'rgba(255,107,53,0.15)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${slot.progress || 0}%` }} />
            </div>
          </div>
        </div>
      )}
      {isBlocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', marginBottom: 14, fontSize: 13, color: '#791F1F' }}>
          <Lock size={15} /> Blocked — complete the prior strict task first
        </div>
      )}

      {/* Checklist */}
      {slot.checklist && slot.checklist.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginBottom: 8 }}>Checklist</div>
          {(slot.checklist as any[]).map((item: any, i: number) => (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
              <input
                type="checkbox"
                readOnly
                checked={isDone}
                style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }}
              />
              <span style={{ flex: 1, color: 'var(--text2)', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                {item.label}
              </span>
              {item.required && (
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(226,75,74,0.1)', color: '#791F1F', fontWeight: 600 }}>
                  required
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Repeat days */}
      {slot.repeatDays && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {['M','T','W','T','F','S','S'].map((d, i) => {
            const on = slot.repeatDays.includes(i + 1);
            return (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: '50%', fontSize: 11, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? 'var(--accent)' : 'var(--surface2)',
                color: on ? 'white' : 'var(--text3)',
                border: `0.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              }}>{d}</div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {!isDone && !slot.isAutoMark && !isBlocked && (
        <div style={{ display: 'flex', gap: 8 }}>
          {timeGated ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '0.5px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
              ⏳ Available after {formatTime(slot.endTime)}
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { onMarkDone?.(slot.id); onClose(); }}
            >
              <CheckCircle2 size={13} /> Mark done
            </button>
          )}
          {slot.isStrict && !timeGated && (
            <button
              className="btn btn-sm"
              style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)' }}
              onClick={() => { onSkip?.(slot.id); onClose(); }}
            >
              Skip
            </button>
          )}
        </div>
      )}
      {slot.isAutoMark && !isDone && (
        <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Auto-marks when the time window passes</div>
      )}
    </motion.div>
  );
}

// ── Main grid component ───────────────────────────────────────────────────────
interface Props {
  slots: ScheduleSlot[];
  onMarkDone?: (id: string) => void;
  onSkip?: (id: string) => void;
}

export default function TimetableGrid({ slots, onMarkDone, onSkip }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [hoveredSlot, setHoveredSlot]   = useState<string | null>(null);

  const totalHeight = TOTAL_HOURS * 60 * PX_PER_MIN;

  // Map: dayIndex (0=Mon) → slots active that day
  const slotsByDay = useMemo(() => {
    const map: Record<number, ScheduleSlot[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    slots.forEach(s => {
      s.repeatDays.forEach(rd => {
        const idx = rd - 1; // 1=Mon → 0
        if (idx >= 0 && idx < 7) map[idx].push(s);
      });
    });
    return map;
  }, [slots]);

  const handleCellClick = useCallback((slot: ScheduleSlot) => {
    setSelectedSlot(prev => prev?.id === slot.id ? null : slot);
  }, []);

  // Today column highlight
  const todayDowIdx = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // 0=Mon
  }, []);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', borderBottom: '0.5px solid var(--border)' }}>
        {/* Corner */}
        <div style={{ padding: '8px 4px', fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Time</div>
        {/* Day headers */}
        {DAYS_SHORT.map((d, i) => (
          <div
            key={d}
            style={{
              padding: '8px 4px',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 500,
              borderLeft: '0.5px solid var(--border)',
              color: i === todayDowIdx ? 'var(--accent)' : 'var(--text2)',
              background: i === todayDowIdx ? 'rgba(255,107,53,0.04)' : 'transparent',
            }}
          >
            {d}
            {i === todayDowIdx && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', margin: '3px auto 0' }} />
            )}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY: 'auto', maxHeight: 560, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7,1fr)', position: 'relative', height: totalHeight }}>
          {/* Hour labels */}
          <div style={{ position: 'relative', borderRight: '0.5px solid var(--border)' }}>
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
              const h = HOUR_START + i;
              const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
              return (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: i * 60 * PX_PER_MIN - 8,
                    left: 0, right: 0,
                    padding: '0 4px',
                    fontSize: 10,
                    color: 'var(--text3)',
                    lineHeight: 1,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {Array.from({ length: 7 }, (_, dayIdx) => {
            const daySlots = slotsByDay[dayIdx] || [];
            const isToday  = dayIdx === todayDowIdx;

            return (
              <div
                key={dayIdx}
                style={{
                  borderLeft: '0.5px solid var(--border)',
                  position: 'relative',
                  height: totalHeight,
                  background: isToday ? 'rgba(255,107,53,0.02)' : 'transparent',
                }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * 60 * PX_PER_MIN,
                      left: 0, right: 0,
                      borderTop: `0.5px solid ${i % 2 === 0 ? 'var(--border)' : 'transparent'}`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}

                {/* Slot blocks */}
                {daySlots.map((slot, si) => {
                  const top    = toGridTop(slot.startTime);
                  const height = toGridHeight(slot.startTime, slot.endTime);
                  if (top < 0 || height <= 0) return null;

                  const isDone    = slot.status === 'COMPLETED';
                  const isActive  = !!slot.isCurrentlyActive;
                  const isBlocked = slot.status === 'BLOCKED';
                  const isSelected = selectedSlot?.id === slot.id;
                  const isHovered  = hoveredSlot === slot.id;
                  const colors = TAG_COLOR[slot.tag] || TAG_COLOR.CUSTOM;
                  const Icon   = TAG_ICON[slot.tag] || Calendar;

                  return (
                    <motion.div
                      key={`${slot.id}-${dayIdx}`}
                      initial={{ opacity: 0, scaleY: 0.8 }}
                      animate={{ opacity: isBlocked ? 0.45 : 1, scaleY: 1 }}
                      transition={{ delay: si * 0.03, duration: 0.2 }}
                      onClick={() => handleCellClick(slot)}
                      onMouseEnter={() => setHoveredSlot(slot.id)}
                      onMouseLeave={() => setHoveredSlot(null)}
                      style={{
                        position: 'absolute',
                        top: top + 1,
                        left: 2, right: 2,
                        height: height,
                        borderRadius: 6,
                        background: isDone
                          ? 'rgba(29,158,117,0.1)'
                          : isActive
                          ? 'rgba(255,107,53,0.12)'
                          : colors.bg,
                        border: `1px solid ${isSelected ? 'var(--accent)' : isDone ? 'rgba(29,158,117,0.4)' : isActive ? 'rgba(255,107,53,0.5)' : colors.border}`,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        padding: '3px 5px',
                        zIndex: isSelected ? 5 : isHovered ? 4 : 1,
                        boxShadow: isSelected
                          ? '0 0 0 2px rgba(255,107,53,0.2)'
                          : isHovered
                          ? '0 2px 8px rgba(0,0,0,0.1)'
                          : 'none',
                        transition: 'box-shadow 0.15s, border-color 0.15s',
                      }}
                    >
                      {/* Status pip */}
                      {(isDone || isActive || isBlocked) && (
                        <div style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 6, height: 6, borderRadius: '50%',
                          background: isDone ? '#1D9E75' : isActive ? 'var(--accent)' : '#E24B4A',
                        }} />
                      )}

                      {/* Strict left bar */}
                      {slot.isStrict && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                          background: slot.strictMode === 'HARD' ? '#E24B4A' : slot.strictMode === 'WARN' ? '#BA7517' : '#378ADD',
                          borderRadius: '6px 0 0 6px',
                        }} />
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: slot.isStrict ? 4 : 0 }}>
                        <Icon size={9} color={isDone ? '#085041' : isActive ? '#712B13' : colors.text} style={{ flexShrink: 0 }} />
                        <span style={{
                          fontSize: 10, fontWeight: 500,
                          color: isDone ? '#085041' : isActive ? '#712B13' : colors.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1.2,
                        }}>
                          {slot.title}
                        </span>
                      </div>

                      {height >= 40 && (
                        <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2, paddingLeft: slot.isStrict ? 4 : 0 }}>
                          {formatTime(slot.startTime)}
                        </div>
                      )}

                      {/* Active progress bar at bottom */}
                      {isActive && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,107,53,0.2)' }}>
                          <div style={{ height: '100%', background: 'var(--accent)', width: `${slot.progress || 0}%` }} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedSlot && (
          <div style={{ marginTop: 16 }}>
            <SlotDetail
              slot={selectedSlot}
              onClose={() => setSelectedSlot(null)}
              onMarkDone={onMarkDone}
              onSkip={onSkip}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
