'use client';
// src/components/timeline/AnimatedTimeline.tsx
// Full animated timeline — staggered slot entry, glowing active dot, live progress
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScheduleSlot, TAG_CONFIG, STRICT_MODE_CONFIG } from '@/types';
import { formatTime, formatDuration } from '@/lib/scheduleUtils';
const SMC = STRICT_MODE_CONFIG;
import AcademicSubTimeline from '@/components/academic/AcademicSubTimeline';
import ChecklistBlock from '@/components/schedule/ChecklistBlock';
import { CheckCircle2, Lock, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface Props {
  slots: ScheduleSlot[];
  date: string;
  onMarkDone: (slotId: string) => void | Promise<void>;
  onSkip:     (slotId: string) => void;
  onCheckItem:(slotId: string, itemId: string, checked: boolean) => void;
  onToggleChecklist: (slotId: string, on: boolean) => void;
  isFutureDay?: boolean;
}

/* ─ connector dot ─ */
function Dot({ status, isActive }: { status: string; isActive: boolean }) {
  const bg =
    status === 'COMPLETED' ? 'var(--accent3)' :
    isActive               ? 'var(--accent)'  :
    status === 'BLOCKED'   ? '#E24B4A'        : 'var(--surface3)';
  const border =
    status === 'COMPLETED' ? 'var(--accent3)' :
    isActive               ? 'var(--accent)'  :
    status === 'BLOCKED'   ? '#E24B4A'        : 'var(--border2)';

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow — only when active */}
      {isActive && (
        <motion.div
          style={{
            position: 'absolute',
            width: 22, height: 22,
            borderRadius: '50%',
            background: 'var(--accent)',
          }}
          animate={{ opacity: [0.18, 0.05, 0.18], scale: [1, 1.6, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div style={{
        width: 11, height: 11,
        borderRadius: '50%',
        background: bg,
        border: `2px solid ${border}`,
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
      }} />
    </div>
  );
}

/* ─ single slot card ─ */
function SlotCard({
  slot, index, expanded, onToggle,
  onMarkDone, onSkip, onCheckItem, onToggleChecklist, timeGated,
}: {
  slot: ScheduleSlot;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onMarkDone: () => void;
  onSkip: () => void;
  onCheckItem: (itemId: string, checked: boolean) => void;
  onToggleChecklist: (on: boolean) => void;
  timeGated?: boolean;
}) {
  const isActive = !!slot.isCurrentlyActive;
  const isDone   = slot.status === 'COMPLETED';
  const isBlocked = slot.status === 'BLOCKED';
  const progress = slot.progress || 0;
  const minsLeft = slot.minutesLeft || 0;

  const tagCfg = TAG_CONFIG[slot.tag] || TAG_CONFIG.CUSTOM;
  const strictCfg = slot.isStrict ? SMC[slot.strictMode] : null;

  const borderColor =
    isDone    ? 'rgba(29,158,117,0.35)' :
    isActive  ? 'var(--accent)'         :
    isBlocked ? 'rgba(226,75,74,0.3)'   : 'var(--border)';

  const leftBarColor =
    slot.isStrict && slot.strictMode === 'HARD'  ? '#E24B4A' :
    slot.isStrict && slot.strictMode === 'WARN'  ? 'var(--accent4)' :
    slot.isStrict && slot.strictMode === 'GRACE' ? 'var(--accent2)' : 'transparent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isBlocked ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.055, type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        background: isDone ? 'rgba(29,158,117,0.03)' : 'var(--surface)',
        border: `0.5px solid ${borderColor}`,
        borderRadius: 10,
        padding: '11px 14px',
        cursor: isBlocked ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isActive ? '0 0 0 2px rgba(255,107,53,0.12)' : 'none',
        pointerEvents: isBlocked ? 'none' : undefined,
      }}
      onClick={isBlocked ? undefined : onToggle}
      whileHover={isBlocked ? undefined : { borderColor: 'var(--border2)', transition: { duration: 0.12 } }}
    >
      {/* Left accent bar for strict slots */}
      {slot.isStrict && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 3, background: leftBarColor, borderRadius: '3px 0 0 3px',
        }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{slot.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slot.title}
          </div>
        </div>

        {/* Tag pill */}
        <span style={{
          fontSize: 10, fontWeight: 500, padding: '2px 8px',
          borderRadius: 20, flexShrink: 0,
          background: `var(--tag-bg-${slot.tag?.toLowerCase() || 'custom'}, var(--surface2))`,
          color: `var(--tag-text-${slot.tag?.toLowerCase() || 'custom'}, var(--text2))`,
        }} className={`tag tag-${(slot.tag || 'custom').toLowerCase().replace(/_/g, '-')}`}>
          {tagCfg.label}
        </span>

        {/* Strict badge */}
        {strictCfg && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
            background:
              slot.strictMode === 'HARD'  ? 'rgba(226,75,74,0.1)'  :
              slot.strictMode === 'WARN'  ? 'rgba(186,117,23,0.1)' : 'rgba(55,138,221,0.1)',
            color:
              slot.strictMode === 'HARD'  ? '#791F1F' :
              slot.strictMode === 'WARN'  ? '#633806' : '#0C447C',
          }}>
            {strictCfg.label}
          </span>
        )}

        {/* Status icons */}
        {isDone   && <CheckCircle2 size={15} color="var(--accent3)" style={{ flexShrink: 0 }} />}
        {isBlocked && <Lock size={14} color="#E24B4A" style={{ flexShrink: 0 }} />}

        {/* Expand chevron */}
        {!isBlocked && (
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} color="var(--text3)" />
          </motion.div>
        )}
      </div>

      {/* Time meta */}
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
        {' · '}{formatDuration(slot.startTime, slot.endTime)}
        {isActive && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ color: 'var(--accent)', fontWeight: 600, marginLeft: 8 }}
          >
            ● {minsLeft}m left
          </motion.span>
        )}
      </div>

      {/* Progress bar for active slots */}
      <AnimatePresence>
        {isActive && !isDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}
          >
            <motion.div
              style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, originX: 0 }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Academic sub-timeline */}
            {slot.isAcademic && slot.status === 'COMPLETED' || slot.isCurrentlyActive ? (
              slot.isAcademic && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--border)' }}>
                  <AcademicSubTimeline />
                </div>
              )
            ) : null}

            {/* Checklist block with per-interval toggle */}
            {slot.checklist && slot.checklist.length > 0 && (
              <ChecklistBlock
                slot={slot}
                onToggleChecklist={onToggleChecklist}
                onCheckItem={onCheckItem}
              />
            )}

            {/* Actions */}
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              {!isDone && !slot.isAutoMark && !isBlocked && (
                timeGated ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'var(--surface2)', border: '0.5px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
                    <span style={{ fontSize: 13 }}>⏳</span>
                    Available after {formatTime(slot.endTime)}
                  </div>
                ) : (
                  <motion.button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={(e) => { e.stopPropagation(); onMarkDone(); }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <CheckCircle2 size={13} /> Mark done
                  </motion.button>
                )
              )}
              {!isDone && slot.isStrict && !isBlocked && !timeGated && (
                <motion.button
                  className="btn btn-sm"
                  style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)' }}
                  onClick={(e) => { e.stopPropagation(); onSkip(); }}
                  whileTap={{ scale: 0.97 }}
                >
                  Skip
                </motion.button>
              )}
            </div>

            {isDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginTop: 8, fontSize: 12, color: 'var(--accent3)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <CheckCircle2 size={13} /> Completed
              </motion.div>
            )}

            {isBlocked && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#A32D2D', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Lock size={12} /> Complete the prior strict task to unlock this
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─ main export ─ */
export default function AnimatedTimeline({
  slots, date, onMarkDone, onSkip, onCheckItem, onToggleChecklist, isFutureDay,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Time-gating: can only mark done AFTER the slot's END time has passed
  function canMarkDone(slot: ScheduleSlot): boolean {
    if (isFutureDay) return false; // future days: never
    if (slot.isAutoMark) return true; // auto-mark slots can always be toggled
    const now = new Date();
    const [h, m] = slot.endTime.split(':').map(Number);
    const slotEnd = new Date(now); slotEnd.setHours(h, m, 0, 0);
    return now >= slotEnd; // can only mark AFTER end time passes
  }

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {slots.map((slot, i) => (
        <div key={slot.id} style={{ display: 'flex', gap: 10 }}>
          {/* Time label */}
          <div style={{ width: 60, flexShrink: 0, textAlign: 'right', paddingTop: 13 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{
                fontSize: 11,
                color: slot.isCurrentlyActive ? 'var(--accent)' : 'var(--text3)',
                fontWeight: slot.isCurrentlyActive ? 500 : 400,
              }}
            >
              {formatTime(slot.startTime)}
            </motion.div>
          </div>

          {/* Connector column */}
          <div style={{ width: 22, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginTop: 12 }}>
              <Dot status={slot.status || 'PENDING'} isActive={!!slot.isCurrentlyActive} />
            </div>
            {i < slots.length - 1 && (
              <motion.div
                style={{
                  flex: 1,
                  width: 1.5,
                  background: slot.status === 'COMPLETED' ? 'rgba(29,158,117,0.4)' : 'var(--border)',
                  marginTop: 4,
                  borderRadius: 1,
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.3, ease: 'easeOut', originY: 0 }}
              />
            )}
          </div>

          {/* Card */}
          <div style={{ flex: 1, paddingBottom: 10 }}>
            <SlotCard
              slot={slot}
              index={i}
              expanded={expandedId === slot.id}
              onToggle={() => toggle(slot.id)}
              onMarkDone={() => onMarkDone(slot.id)}
              onSkip={() => onSkip(slot.id)}
              onCheckItem={(itemId, checked) => onCheckItem(slot.id, itemId, checked)}
              onToggleChecklist={(on) => onToggleChecklist(slot.id, on)}
              timeGated={!canMarkDone(slot)}
            />
          </div>
        </div>
      ))}
    </motion.div>
  );
}
