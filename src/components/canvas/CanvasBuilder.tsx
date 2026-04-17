'use client';
// src/components/canvas/CanvasBuilder.tsx
// n8n-style visual schedule builder: drag blocks on a canvas, connect them, edit inline.
// Each block = one time slot. Blocks can be freely positioned via drag.
// Click a block to open the edit panel on the right.
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Save, Loader2, GripVertical, CheckCircle2, Tag, Trash2 } from 'lucide-react';
import { TAG_CONFIG, STRICT_MODE_CONFIG, SlotTag, StrictMode } from '@/types';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CanvasSlot {
  id: string;
  _isNew?: boolean;
  title: string;
  emoji: string;
  startTime: string;
  endTime: string;
  tag: SlotTag;
  isStrict: boolean;
  strictMode: StrictMode;
  isAutoMark: boolean;
  emailAlert: boolean;
  foodRequired: boolean;
  repeatDays: number[];
  checklist: { id: string; label: string; required: boolean }[];
  // Canvas position
  x: number;
  y: number;
}

// ── Colour helpers ────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  BREAKFAST: '#BA7517', MORNING_ROUTINE: '#7F77DD', GYM: '#D4537E', WORKOUT: '#D4537E',
  COLLEGE: '#378ADD', SCHOOL: '#378ADD', SELF_STUDY: '#534AB7', WALK: '#1D9E75',
  DINNER: '#BA7517', LUNCH: '#BA7517', WORK: '#888780', SLEEP: '#1D9E75',
  MEDITATION: '#7F77DD', READING: '#639922', CUSTOM: '#888780',
};

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,'0')} ${ap}`;
}
function dur(s: string, e: string) {
  const d = toMins(e) - toMins(s); if (d <= 0) return '';
  return d >= 60 ? `${Math.floor(d/60)}h${d%60?` ${d%60}m`:''}` : `${d}m`;
}

// ── Block component ───────────────────────────────────────────────────────────
function SlotBlock({
  slot, selected, onSelect, onDrag, onDelete,
}: {
  slot: CanvasSlot; selected: boolean;
  onSelect: () => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDelete: () => void;
}) {
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const color = TAG_COLORS[slot.tag] || '#888780';

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    onSelect();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: slot.x, oy: slot.y };
    const onMove = (me: MouseEvent) => {
      if (!dragStart.current) return;
      const nx = dragStart.current.ox + me.clientX - dragStart.current.mx;
      const ny = dragStart.current.oy + me.clientY - dragStart.current.my;
      onDrag(slot.id, Math.max(0, nx), Math.max(0, ny));
    };
    const onUp = () => { dragStart.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute', left: slot.x, top: slot.y,
        width: 180, cursor: 'grab', userSelect: 'none',
        zIndex: selected ? 10 : 1,
      }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 10,
        border: `1.5px solid ${selected ? color : 'var(--border)'}`,
        boxShadow: selected ? `0 0 0 3px ${color}22, 0 4px 16px rgba(0,0,0,0.12)` : '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden', transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        {/* Color header strip */}
        <div style={{ height: 4, background: color }} />

        {/* Content */}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{slot.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{slot.title}</span>
            <button
              onMouseDown={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, borderRadius: 4, flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />
            {fmt12(slot.startTime)} – {fmt12(slot.endTime)}
            {dur(slot.startTime, slot.endTime) && <span style={{ marginLeft: 3, color }}>· {dur(slot.startTime, slot.endTime)}</span>}
          </div>
          {slot.isStrict && (
            <div style={{ marginTop: 5, fontSize: 9, padding: '1px 6px', borderRadius: 20, background: `${color}18`, color, fontWeight: 600, display: 'inline-block' }}>
              {slot.strictMode}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit panel ────────────────────────────────────────────────────────────────
function EditPanel({ slot, onChange, onClose }: { slot: CanvasSlot; onChange: (s: CanvasSlot) => void; onClose: () => void }) {
  const [newCheck, setNewCheck] = useState('');

  function f(field: keyof CanvasSlot, val: any) { onChange({ ...slot, [field]: val }); }

  function addCheck() {
    if (!newCheck.trim()) return;
    onChange({ ...slot, checklist: [...slot.checklist, { id: uuid(), label: newCheck.trim(), required: false }] });
    setNewCheck('');
  }

  const color = TAG_COLORS[slot.tag] || '#888780';

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      style={{ width: 300, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '80vh', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 20, borderRadius: 3, background: color, flexShrink: 0 }} />
        <input value={slot.emoji} onChange={e => f('emoji', e.target.value)} style={{ width: 32, textAlign: 'center', fontSize: 18, background: 'transparent', border: 'none', outline: 'none' }} maxLength={2} />
        <input value={slot.title} onChange={e => f('title', e.target.value)} style={{ flex: 1, fontSize: 14, fontWeight: 600, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-body)' }} placeholder="Slot title" />
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={15} /></button>
      </div>

      {/* Times */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div className="form-label">Start</div>
          <input type="time" className="form-input" value={slot.startTime} onChange={e => f('startTime', e.target.value)} />
        </div>
        <div>
          <div className="form-label">End</div>
          <input type="time" className="form-input" value={slot.endTime} onChange={e => f('endTime', e.target.value)} />
        </div>
      </div>

      {/* Tag */}
      <div>
        <div className="form-label" style={{ marginBottom: 6 }}>Category</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(Object.keys(TAG_CONFIG) as SlotTag[]).map(t => (
            <button key={t} onClick={() => f('tag', t)} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '0.5px solid var(--border)', background: slot.tag === t ? `${TAG_COLORS[t]}18` : 'var(--surface2)', color: slot.tag === t ? (TAG_COLORS[t] || 'var(--accent)') : 'var(--text3)', borderColor: slot.tag === t ? (TAG_COLORS[t] || 'var(--accent)') : 'var(--border)' }}>
              {TAG_CONFIG[t].emoji} {TAG_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Repeat days */}
      <div>
        <div className="form-label" style={{ marginBottom: 6 }}>Repeat</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => {
            const sel = slot.repeatDays.includes(i + 1);
            return <button key={`${d}${i}`} onClick={() => f('repeatDays', sel ? slot.repeatDays.filter(x => x !== i+1) : [...slot.repeatDays, i+1].sort())} style={{ width: 28, height: 28, borderRadius: '50%', fontSize: 10, fontWeight: 600, border: '0.5px solid var(--border)', cursor: 'pointer', background: sel ? color : 'var(--surface2)', color: sel ? 'white' : 'var(--text3)' }}>{d}</button>;
          })}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {[
          { label: 'Strict mode', field: 'isStrict', val: slot.isStrict },
          { label: 'Auto-complete', field: 'isAutoMark', val: slot.isAutoMark },
          { label: 'Email alert', field: 'emailAlert', val: slot.emailAlert },
          { label: 'Food required', field: 'foodRequired', val: slot.foodRequired },
        ].map(({ label, field, val }) => (
          <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <button className={`toggle-switch${val ? ' on' : ''}`} onClick={() => f(field as any, !val)} />
            {label}
          </label>
        ))}
        {slot.isStrict && (
          <select value={slot.strictMode} onChange={e => f('strictMode', e.target.value)} className="form-input" style={{ padding: '4px 8px', fontSize: 12 }}>
            <option value="HARD">Hard lock</option>
            <option value="WARN">Warn & skip</option>
            <option value="GRACE">Grace period</option>
          </select>
        )}
      </div>

      {/* Checklist */}
      <div>
        <div className="form-label" style={{ marginBottom: 8 }}>Checklist</div>
        {slot.checklist.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text2)' }}>{item.label}</span>
            <button onClick={() => onChange({ ...slot, checklist: slot.checklist.filter(c => c.id !== item.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input className="form-input" value={newCheck} onChange={e => setNewCheck(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCheck()} placeholder="Add item…" style={{ flex: 1, padding: '5px 9px', fontSize: 12 }} />
          <button className="btn btn-sm" onClick={addCheck}>Add</button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main canvas ───────────────────────────────────────────────────────────────
interface Props { onSaved?: () => void }

export default function CanvasBuilder({ onSaved }: Props) {
  const [slots, setSlots] = useState<CanvasSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dbIds, setDbIds] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load from API on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/schedule?date=${today}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Auto-layout: grid of blocks
          const loaded: CanvasSlot[] = data.map((s: any, i: number): CanvasSlot => ({
            id: s.id, _isNew: false, title: s.title, emoji: s.emoji || '📌',
            startTime: s.startTime, endTime: s.endTime, tag: s.tag,
            isStrict: s.isStrict, strictMode: s.strictMode || 'WARN',
            isAutoMark: s.isAutoMark || false, emailAlert: s.emailAlert || false, foodRequired: s.foodRequired || false,
            repeatDays: s.repeatDays || [1,2,3,4,5,6,7], checklist: s.checklist || [],
            x: (i % 3) * 210 + 20, y: Math.floor(i / 3) * 130 + 20,
          }));
          setSlots(loaded);
          setDbIds(new Set(data.map((s: any) => s.id)));
        }
      } catch { toast.error('Failed to load'); }
      setLoading(false);
    }
    load();
  }, []);

  const addBlock = useCallback(() => {
    const last = slots.sort((a, b) => toMins(a.startTime) - toMins(b.startTime)).at(-1);
    const lastEnd = last ? toMins(last.endTime) + 5 : 6 * 60;
    const endTime = lastEnd + 60;
    const toT = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const newSlot: CanvasSlot = {
      id: uuid(), _isNew: true, title: 'New slot', emoji: '📌',
      startTime: toT(lastEnd), endTime: toT(endTime),
      tag: 'CUSTOM', isStrict: false, strictMode: 'WARN',
      isAutoMark: false, emailAlert: false, foodRequired: false,
      repeatDays: [1,2,3,4,5,6,7], checklist: [],
      x: 20 + (slots.length % 3) * 210, y: 20 + Math.floor(slots.length / 3) * 130,
    };
    setSlots(prev => [...prev, newSlot]);
    setSelectedId(newSlot.id);
  }, [slots]);

  const updateSlot = useCallback((updated: CanvasSlot) => {
    setSlots(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const deleteSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const moveSlot = useCallback((id: string, x: number, y: number) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentIds = new Set(slots.map(s => s.id));
      // Delete removed
      for (const id of dbIds) {
        if (!currentIds.has(id)) await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      }
      // PATCH/POST each
      const newDbIds = new Set<string>();
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const payload = {
          title: s.title, emoji: s.emoji, startTime: s.startTime, endTime: s.endTime, tag: s.tag,
          isStrict: s.isStrict, strictMode: s.strictMode, isAutoMark: s.isAutoMark,
          emailAlert: s.emailAlert, foodRequired: s.foodRequired, repeatDays: s.repeatDays,
          checklist: s.checklist, sortOrder: i, isAcademic: false,
        };
        if (!s._isNew && dbIds.has(s.id)) {
          await fetch('/api/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, ...payload }) });
          newDbIds.add(s.id);
        } else {
          const r = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (r.ok) { const created = await r.json(); newDbIds.add(created.id); setSlots(prev => prev.map(x => x.id === s.id ? { ...x, id: created.id, _isNew: false } : x)); }
        }
      }
      setDbIds(newDbIds);
      toast.success('Canvas saved!');
      onSaved?.();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const selectedSlot = slots.find(s => s.id === selectedId) || null;
  const canvasH = Math.max(500, ...slots.map(s => s.y + 160));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: '40px 0', justifyContent: 'center' }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading canvas…
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* Canvas area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={addBlock} style={{ gap: 6 }}>
            <Plus size={13} /> Add block
          </button>
          <button className="btn btn-sm" onClick={handleSave} disabled={saving} style={{ gap: 6 }}>
            {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
            {slots.length} block{slots.length !== 1 ? 's' : ''} · Drag to move · Click to edit
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onClick={() => setSelectedId(null)}
          style={{
            position: 'relative', width: '100%', height: canvasH,
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12,
            overflow: 'auto',
            backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {slots.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', pointerEvents: 'none' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⬜</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Canvas is empty</div>
              <div style={{ fontSize: 13 }}>Click "Add block" to create your first time slot</div>
            </div>
          )}

          {slots.map(slot => (
            <SlotBlock
              key={slot.id}
              slot={slot}
              selected={selectedId === slot.id}
              onSelect={() => setSelectedId(slot.id)}
              onDrag={moveSlot}
              onDelete={() => deleteSlot(slot.id)}
            />
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {Object.entries(TAG_COLORS).slice(0, 8).map(([tag, color]) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              {tag.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
            </div>
          ))}
        </div>
      </div>

      {/* Edit panel */}
      <AnimatePresence>
        {selectedSlot && (
          <EditPanel
            key={selectedSlot.id}
            slot={selectedSlot}
            onChange={updateSlot}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
