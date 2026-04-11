'use client';
// src/components/builder/ScheduleBuilder.tsx
// Drag-to-reorder schedule builder.
// Changing a slot's end time auto-shifts all subsequent slots forward/backward.
// Each slot has a per-interval checklist toggle.
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Trash2, Plus, RefreshCw, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { TAG_CONFIG, SlotTag } from '@/types';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

interface BuilderSlot {
  id: string;
  emoji: string;
  name: string;
  startTime: string;   // "HH:mm"
  endTime: string;
  tag: SlotTag;
  checklistOn: boolean;
  checklist: string[];
  strict: boolean;
}

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function toTime(m: number) {
  m = Math.max(0, Math.min(23 * 60 + 59, m));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmt(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

const DEFAULTS: BuilderSlot[] = [
  { id: uuid(), emoji: '🌅', name: 'Wake up',        startTime: '06:00', endTime: '06:05', tag: 'MORNING_ROUTINE', checklistOn: false, checklist: [],                     strict: false },
  { id: uuid(), emoji: '🚿', name: 'Morning routine',startTime: '06:05', endTime: '07:30', tag: 'MORNING_ROUTINE', checklistOn: true,  checklist: ['Brush & freshen','Make bed'], strict: false },
  { id: uuid(), emoji: '🍳', name: 'Breakfast',      startTime: '07:30', endTime: '08:30', tag: 'BREAKFAST',       checklistOn: true,  checklist: ['Log food items','Vitamins'],  strict: true  },
  { id: uuid(), emoji: '🎓', name: 'College',        startTime: '09:00', endTime: '16:00', tag: 'COLLEGE',         checklistOn: true,  checklist: ['Mark attendance','Carry notes'],strict: true },
  { id: uuid(), emoji: '📚', name: 'Self study',     startTime: '16:30', endTime: '17:30', tag: 'SELF_STUDY',      checklistOn: true,  checklist: ['Phone on DND','Timer set'],    strict: true  },
  { id: uuid(), emoji: '💪', name: 'Gym',            startTime: '18:00', endTime: '19:00', tag: 'GYM',             checklistOn: false, checklist: ['Workout clothes','Water'],      strict: true  },
  { id: uuid(), emoji: '🍛', name: 'Dinner',         startTime: '20:00', endTime: '20:30', tag: 'DINNER',          checklistOn: true,  checklist: ['Log dinner items'],             strict: true  },
];

interface ShiftEvent {
  slotName: string;
  oldStart: string;
  newStart: string;
}

interface Props {
  onSave?: (slots: BuilderSlot[]) => Promise<void>;
}

export default function ScheduleBuilder({ onSave }: Props) {
  const [slots, setSlots] = useState<BuilderSlot[]>(DEFAULTS);
  const [shiftEvents, setShiftEvents] = useState<ShiftEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const shiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── End-time change → auto-reorder downstream ──────────────────────────
  const handleEndTimeChange = useCallback((id: string, newEnd: string) => {
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;

      const oldEnd = prev[idx].endTime;
      const diff = toMins(newEnd) - toMins(oldEnd);
      if (diff === 0) return prev;

      const updated = prev.map((s, i) => {
        if (i === idx) return { ...s, endTime: newEnd };
        if (i > idx) {
          const newStart = toMins(s.startTime) + diff;
          const newEndSlot = toMins(s.endTime) + diff;
          return { ...s, startTime: toTime(newStart), endTime: toTime(newEndSlot) };
        }
        return s;
      });

      // Collect shift events for the toast
      const shifted: ShiftEvent[] = [];
      for (let i = idx + 1; i < prev.length; i++) {
        const newStart = toMins(prev[i].startTime) + diff;
        if (Math.abs(diff) > 0) {
          shifted.push({
            slotName: prev[i].name,
            oldStart: prev[i].startTime,
            newStart: toTime(newStart),
          });
        }
      }

      if (shifted.length > 0) {
        setShiftEvents(shifted);
        if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
        shiftTimerRef.current = setTimeout(() => setShiftEvents([]), 4000);
      }

      return updated;
    });
  }, []);

  const handleStartTimeChange = useCallback((id: string, val: string) => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, startTime: val } : s));
  }, []);

  const handleFieldChange = useCallback((id: string, field: keyof BuilderSlot, val: any) => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, [field]: val } : s));
  }, []);

  const deleteSlot = useCallback((id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setExpandedId((e) => e === id ? null : e);
  }, []);

  const addSlot = useCallback(() => {
    const last = slots[slots.length - 1];
    const newStart = last ? toMins(last.endTime) + 5 : 0;
    const newSlot: BuilderSlot = {
      id: uuid(), emoji: '📌', name: 'New slot',
      startTime: toTime(newStart), endTime: toTime(newStart + 60),
      tag: 'CUSTOM', checklistOn: false, checklist: [], strict: false,
    };
    setSlots((prev) => [...prev, newSlot]);
    setExpandedId(newSlot.id);
  }, [slots]);

  const addChecklistItem = useCallback((id: string, item: string) => {
    if (!item.trim()) return;
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, checklist: [...s.checklist, item.trim()] } : s));
  }, []);

  const removeChecklistItem = useCallback((id: string, idx: number) => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, checklist: s.checklist.filter((_, i) => i !== idx) } : s));
  }, []);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(slots);
      toast.success('Schedule saved!');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Shift notification banner */}
      <AnimatePresence>
        {shiftEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 13px', borderRadius: 8,
              background: 'rgba(29,158,117,0.08)',
              border: '0.5px solid rgba(29,158,117,0.3)',
              marginBottom: 12, fontSize: 12, color: '#085041',
              overflow: 'hidden',
            }}
          >
            <RefreshCw size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 500, marginBottom: 3 }}>Auto-shifted {shiftEvents.length} slot{shiftEvents.length > 1 ? 's' : ''}</div>
              {shiftEvents.slice(0, 3).map((ev, i) => (
                <div key={i} style={{ opacity: 0.8 }}>
                  {ev.slotName}: {fmt(ev.oldStart)} → {fmt(ev.newStart)}
                </div>
              ))}
              {shiftEvents.length > 3 && <div style={{ opacity: 0.6 }}>+{shiftEvents.length - 3} more…</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slot list — Reorder.Group enables drag-to-reorder */}
      <Reorder.Group axis="y" values={slots} onReorder={setSlots} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {slots.map((slot, i) => (
          <Reorder.Item key={slot.id} value={slot} style={{ marginBottom: 8 }}>
            <motion.div
              layout
              style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
              whileHover={{ borderColor: 'var(--border2)' }}
            >
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
                {/* Drag handle */}
                <div style={{ cursor: 'grab', color: 'var(--text3)', flexShrink: 0, display: 'flex' }}>
                  <GripVertical size={16} />
                </div>

                {/* Emoji (editable) */}
                <input
                  value={slot.emoji}
                  onChange={(e) => handleFieldChange(slot.id, 'emoji', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 32, textAlign: 'center', fontSize: 18,
                    background: 'transparent', border: 'none', outline: 'none', cursor: 'text',
                    fontFamily: 'var(--font-body)',
                  }}
                  maxLength={2}
                />

                {/* Name */}
                <input
                  value={slot.name}
                  onChange={(e) => handleFieldChange(slot.id, 'name', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1, fontSize: 13, fontWeight: 500, background: 'transparent',
                    border: 'none', outline: 'none', cursor: 'text', color: 'var(--text)',
                    fontFamily: 'var(--font-body)', minWidth: 0,
                  }}
                />

                {/* Times */}
                <input
                  type="time" value={slot.startTime}
                  onChange={(e) => handleStartTimeChange(slot.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="form-input"
                  style={{ width: 80, padding: '4px 7px', fontSize: 12, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>–</span>
                <input
                  type="time" value={slot.endTime}
                  onChange={(e) => handleEndTimeChange(slot.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="form-input"
                  style={{ width: 80, padding: '4px 7px', fontSize: 12, flexShrink: 0 }}
                />

                {/* Expand / delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedId((x) => x === slot.id ? null : slot.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}
                >
                  <motion.div animate={{ rotate: expandedId === slot.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={15} />
                  </motion.div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 3, borderRadius: 6, transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(226,75,74,0.1)'; (e.currentTarget as HTMLElement).style.color = '#A32D2D'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded options */}
              <AnimatePresence>
                {expandedId === slot.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Tag selector */}
                      <div>
                        <div className="form-label" style={{ marginBottom: 6 }}>Category</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {(Object.keys(TAG_CONFIG) as SlotTag[]).slice(0, 10).map((t) => (
                            <button
                              key={t}
                              onClick={() => handleFieldChange(slot.id, 'tag', t)}
                              style={{
                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                                cursor: 'pointer', border: '0.5px solid var(--border)',
                                background: slot.tag === t ? 'rgba(255,107,53,0.08)' : 'var(--surface2)',
                                color: slot.tag === t ? 'var(--accent)' : 'var(--text3)',
                                borderColor: slot.tag === t ? 'var(--accent)' : 'var(--border)',
                              }}
                            >
                              {TAG_CONFIG[t].emoji} {TAG_CONFIG[t].label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Options row */}
                      <div style={{ display: 'flex', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                          <input type="checkbox" checked={slot.strict} onChange={(e) => handleFieldChange(slot.id, 'strict', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                          Strict mode
                        </label>
                      </div>

                      {/* ── Per-interval checklist toggle ── */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
                            {slot.checklistOn ? <CheckSquare size={14} color="var(--accent)" /> : <Square size={14} color="var(--text3)" />}
                            Checklist
                          </div>
                          <button
                            className={`toggle-switch${slot.checklistOn ? ' on' : ''}`}
                            onClick={() => handleFieldChange(slot.id, 'checklistOn', !slot.checklistOn)}
                          />
                        </div>

                        <AnimatePresence>
                          {slot.checklistOn && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              style={{ overflow: 'hidden' }}
                            >
                              {slot.checklist.map((item, ci) => (
                                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border2)', flexShrink: 0 }} />
                                  <span style={{ flex: 1, color: 'var(--text2)' }}>{item}</span>
                                  <button onClick={() => removeChecklistItem(slot.id, ci)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16, lineHeight: 1 }}>×</button>
                                </div>
                              ))}
                              <ChecklistAdder onAdd={(item) => addChecklistItem(slot.id, item)} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Add slot button */}
      <motion.button
        onClick={addSlot}
        whileHover={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', padding: '10px', borderRadius: 10,
          border: '1.5px dashed var(--border2)', background: 'transparent',
          cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          fontFamily: 'var(--font-body)', transition: 'color 0.15s, border-color 0.15s',
          marginTop: 4, marginBottom: 14,
        }}
      >
        <Plus size={15} /> Add time slot
      </motion.button>

      {/* Save */}
      {onSave && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save schedule'}
        </button>
      )}
    </div>
  );
}

/* Inline adder for checklist items */
function ChecklistAdder({ onAdd }: { onAdd: (item: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        className="form-input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) { onAdd(val); setVal(''); } }}
        placeholder="Add item…"
        style={{ flex: 1, padding: '5px 9px', fontSize: 12 }}
      />
      <button
        className="btn btn-sm"
        onClick={() => { if (val.trim()) { onAdd(val); setVal(''); } }}
      >Add</button>
    </div>
  );
}
