'use client';
// src/components/schedule/AddSlotModal.tsx
import { useState } from 'react';
import { X, Clock, Tag, Lock, Bell, Zap, CheckSquare } from 'lucide-react';
import { TAG_CONFIG, STRICT_MODE_CONFIG, StrictMode, SlotTag } from '@/types';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

interface Props {
  onClose: () => void;
  onAdd: (slot: any) => void;
  defaultStartTime?: string;
}

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  BREAKFAST:       ['Log food items', 'Take vitamins', 'Drink water'],
  GYM:             ['Wear workout clothes', 'Fill water bottle', 'Warm up done'],
  SELF_STUDY:      ['Put phone on DND', 'Set timer', 'Materials ready'],
  COLLEGE:         ['Mark attendance', 'Carry notes & ID card', 'Charged devices'],
  MORNING_ROUTINE: ['Brush & freshen up', 'Make bed', 'Set alarm for tomorrow'],
  DINNER:          ['Log food items', 'Eat at table (no screen)'],
  WALK:            ['Comfy shoes on', 'Carry water'],
  MEDITATION:      ['Quiet space set', 'Timer set', 'Cushion or mat ready'],
};

export default function AddSlotModal({ onClose, onAdd, defaultStartTime }: Props) {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [startTime, setStartTime]        = useState(defaultStartTime || '07:00');
  const [endTime, setEndTime]            = useState('08:00');
  const [tag, setTag]                    = useState<SlotTag>('CUSTOM');
  const [customTag, setCustomTag]        = useState('');
  const [emoji, setEmoji]               = useState('📌');
  const [isStrict, setIsStrict]          = useState(false);
  const [strictMode, setStrictMode]      = useState<StrictMode>('WARN');
  const [isAutoMark, setIsAutoMark]      = useState(false);
  const [emailAlert, setEmailAlert]      = useState(false);
  const [foodRequired, setFoodRequired]  = useState(false);
  const [isAcademic, setIsAcademic]      = useState(false);
  const [repeatDays, setRepeatDays]      = useState([1,2,3,4,5,6,7]);
  const [checklist, setChecklist]        = useState<{ id: string; label: string; required: boolean }[]>([]);
  const [newCheck, setNewCheck]          = useState('');
  const [saving, setSaving]              = useState(false);

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  function selectTag(t: SlotTag) {
    setTag(t);
    const cfg = TAG_CONFIG[t];
    if (cfg) {
      setEmoji(cfg.emoji);
      if (cfg.defaultStrict) { setIsStrict(true); }
      // Prefill checklist
      const defaults = DEFAULT_CHECKLISTS[t] || [];
      setChecklist(defaults.map((label) => ({ id: uuid(), label, required: t === 'BREAKFAST' || t === 'DINNER' })));
      // Auto food required for meal tags
      setFoodRequired(t === 'BREAKFAST' || t === 'DINNER' || t === 'LUNCH');
    }
  }

  function toggleDay(d: number) {
    setRepeatDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }

  function addCheckItem() {
    if (!newCheck.trim()) return;
    setChecklist((prev) => [...prev, { id: uuid(), label: newCheck.trim(), required: false }]);
    setNewCheck('');
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Please enter a title'); return; }
    if (startTime >= endTime) { toast.error('End time must be after start time'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          startTime, endTime, tag, customTag: customTag || undefined,
          emoji, isStrict, strictMode, isAutoMark, emailAlert,
          foodRequired, isAcademic, repeatDays, checklist,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create slot');
      }
      const slot = await res.json();
      onAdd(slot);
      toast.success(`✓ "${title}" added to schedule!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, flex: 1 }}>Add Time Slot</div>
          <button className="btn btn-icon btn-icon-sm btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Title + Emoji */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 8, marginBottom: 14 }}>
          <input className="form-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ textAlign: 'center', fontSize: 20, padding: '6px' }} maxLength={2} />
          <input className="form-input" placeholder="e.g. Morning Jog" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <input className="form-input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Times */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div className="form-label"><Clock size={13} /> Start time</div>
            <input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <div className="form-label"><Clock size={13} /> End time</div>
            <input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        {/* Tag selector */}
        <div style={{ marginBottom: 14 }}>
          <div className="form-label"><Tag size={13} /> Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => selectTag(key as SlotTag)}
                style={{
                  padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '0.5px solid var(--border)',
                  background: tag === key ? 'rgba(255,107,53,0.08)' : 'var(--surface2)',
                  color: tag === key ? 'var(--accent)' : 'var(--text2)',
                  borderColor: tag === key ? 'var(--accent)' : 'var(--border)',
                  transition: 'all 0.15s',
                }}
              >
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
          {tag === 'CUSTOM' && (
            <input className="form-input" placeholder="Custom tag name" value={customTag} onChange={(e) => setCustomTag(e.target.value)} style={{ marginTop: 8 }} />
          )}
        </div>

        {/* Repeat days */}
        <div style={{ marginBottom: 14 }}>
          <div className="form-label">Repeat on</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {DAYS.map((d, i) => {
              const dayNum = i + 1;
              const selected = repeatDays.includes(dayNum);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(dayNum)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', fontSize: 11, fontWeight: 600,
                    border: '0.5px solid var(--border2)', cursor: 'pointer',
                    background: selected ? 'var(--accent)' : 'var(--surface)',
                    color: selected ? 'white' : 'var(--text3)',
                    transition: 'all 0.15s',
                  }}
                >{d.slice(0,2)}</button>
              );
            })}
          </div>
        </div>

        {/* Strict mode */}
        <div style={{ marginBottom: 14 }}>
          <div className="form-label"><Lock size={13} /> Strict mode</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button
              className={`toggle-switch${isStrict ? ' on' : ''}`}
              onClick={() => setIsStrict((v) => !v)}
            />
            <label style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => setIsStrict((v) => !v)}>
              {isStrict ? 'Strict mode ON' : 'Enable strict mode'}
            </label>
          </div>
          {isStrict && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {(Object.entries(STRICT_MODE_CONFIG) as [StrictMode, any][]).map(([mode, cfg]) => (
                <div
                  key={mode}
                  onClick={() => setStrictMode(mode)}
                  style={{
                    border: `0.5px solid ${strictMode === mode ? 'var(--accent)' : 'var(--border2)'}`,
                    borderRadius: 8, padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
                    background: strictMode === mode ? 'rgba(255,107,53,0.06)' : 'var(--surface)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>
                    {mode === 'HARD' ? '🔒' : mode === 'WARN' ? '⚠️' : '⏳'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{cfg.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ marginBottom: 14 }}>
          <div className="form-label">Options</div>
          {[
            { label: 'Email alert for this slot',           val: emailAlert,   set: setEmailAlert,   icon: Bell        },
            { label: 'Auto-complete when time passes',       val: isAutoMark,   set: setIsAutoMark,   icon: Zap         },
            { label: 'Require food log to mark complete',    val: foodRequired, set: setFoodRequired, icon: CheckSquare },
            { label: 'Academic / class slot',                val: isAcademic,   set: setIsAcademic,   icon: CheckSquare },
          ].map(({ label, val, set, icon: Icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
              <button className={`toggle-switch${val ? ' on' : ''}`} onClick={() => set((v: boolean) => !v)} />
              <label style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => set((v: boolean) => !v)}>
                <Icon size={13} color="var(--text3)" />{label}
              </label>
            </div>
          ))}
        </div>

        {/* Checklist builder */}
        <div style={{ marginBottom: 20 }}>
          <div className="form-label">Checklist</div>
          {checklist.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
              <input type="checkbox" readOnly checked={false} style={{ accentColor: 'var(--accent)' }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <button
                onClick={() => setChecklist((prev) => prev.map((c, j) => j === i ? { ...c, required: !c.required } : c))}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, border: '0.5px solid var(--border)', background: item.required ? 'rgba(226,75,74,0.1)' : 'var(--surface2)', color: item.required ? '#E24B4A' : 'var(--text3)', cursor: 'pointer' }}
              >{item.required ? 'required' : 'optional'}</button>
              <button onClick={() => setChecklist((p) => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input className="form-input" style={{ flex: 1, padding: '7px 10px', fontSize: 12 }} placeholder="Add checklist item..." value={newCheck} onChange={(e) => setNewCheck(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCheckItem()} />
            <button className="btn btn-sm" onClick={addCheckItem}>Add</button>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Adding...' : 'Add Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}
