'use client';
// src/components/schedule/QuickFoodLog.tsx
// Floating popup that appears when a food-gated checklist item is checked without a log
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CheckCircle2, Loader2, Coffee, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

interface Props {
  mealType: MealType;
  date?: string;
  onLogged: () => void;
  onDismiss: () => void;
}

const MEAL_ICONS: Record<MealType, any> = {
  BREAKFAST: Coffee, LUNCH: Utensils, DINNER: Utensils, SNACK: Coffee,
};

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner', SNACK: 'Snack',
};

export default function QuickFoodLog({ mealType, date, onLogged, onDismiss }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const Icon = MEAL_ICONS[mealType];
  const today = date || dayjs().format('YYYY-MM-DD');

  function addItem() {
    if (!input.trim()) return;
    setItems(p => [...p, input.trim()]);
    setInput('');
  }

  async function save() {
    if (!items.length) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, items, date: today }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${MEAL_LABEL[mealType]} logged!`);
      onLogged();
    } catch { toast.error('Failed to log — try again'); }
    finally { setSaving(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        position: 'fixed', bottom: 90, right: 20, zIndex: 300,
        background: 'var(--surface)', border: '0.5px solid var(--border2)',
        borderRadius: 14, padding: 18, width: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color="var(--accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Log {MEAL_LABEL[mealType]}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Required to mark this slot done</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
          <X size={15} />
        </button>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          className="form-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="e.g. Idli, chai, fruit..."
          style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
          autoFocus
        />
        <button className="btn btn-primary btn-sm" onClick={addItem}>
          <Plus size={13} />
        </button>
      </div>

      {/* Items chips */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: 'var(--surface2)', border: '0.5px solid var(--border)', fontSize: 12 }}>
              {item}
              <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={save} disabled={saving}>
        {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={13} />}
        {saving ? 'Saving…' : 'Log & unlock slot'}
      </button>
    </motion.div>
  );
}
