'use client';
// src/components/schedule/ChecklistBlock.tsx
// Per-interval checklist opt-in/out toggle component.
// Used inside both AnimatedTimeline and standalone.
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square } from 'lucide-react';
import { ScheduleSlot, ChecklistItem } from '@/types';

interface Props {
  slot: ScheduleSlot;
  onToggleChecklist: (on: boolean) => void;
  onCheckItem: (itemId: string, checked: boolean) => void;
}

export default function ChecklistBlock({ slot, onToggleChecklist, onCheckItem }: Props) {
  const isDone  = slot.status === 'COMPLETED';
  const isOn    = slot.checklistOn !== false; // default true if undefined
  const items   = (slot.checklist || []) as ChecklistItem[];

  const doneCount = items.filter((_, i) => slot.taskLog?.notes?.includes(`check_${i}`) || isDone).length;

  return (
    <div
      style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginTop: 10 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Toggle header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
          {isOn
            ? <CheckSquare size={13} color="var(--accent)" />
            : <Square size={13} />
          }
          <span>Checklist</span>
          {isOn && items.length > 0 && (
            <span style={{ fontSize: 11, color: isDone ? 'var(--accent3)' : 'var(--text3)' }}>
              {isDone ? items.length : 0}/{items.length}
            </span>
          )}
        </div>

        {/* Toggle switch — opt-in/out per interval */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{isOn ? 'On' : 'Off'}</span>
          <motion.button
            className={`toggle-switch${isOn ? ' on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleChecklist(!isOn); }}
            whileTap={{ scale: 0.95 }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <AnimatePresence>
        {isOn && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {items.map((item, idx) => {
              const checked = isDone;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12, color: 'var(--text2)' }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => { e.stopPropagation(); onCheckItem(item.id, e.target.checked); }}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                    disabled={isDone}
                  />
                  <span style={{ flex: 1, textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 20,
                      background: 'rgba(226,75,74,0.1)', color: '#791F1F', fontWeight: 600, flexShrink: 0,
                    }}>
                      required
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state pill */}
      <AnimatePresence>
        {!isOn && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}
          >
            {items.length} item{items.length > 1 ? 's' : ''} hidden — toggle on to see checklist
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
