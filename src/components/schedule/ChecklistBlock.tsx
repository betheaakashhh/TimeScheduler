'use client';
// src/components/schedule/ChecklistBlock.tsx
// Fixed: local checkbox state so items actually toggle
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square } from 'lucide-react';
import type { ScheduleSlot, ChecklistItem } from '@/types';

interface Props {
  slot: ScheduleSlot;
  onToggleChecklist: (on: boolean) => void;
  onCheckItem: (itemId: string, checked: boolean) => void;
}

export default function ChecklistBlock({ slot, onToggleChecklist, onCheckItem }: Props) {
  const isDone = slot.status === 'COMPLETED';
  const isOn   = (slot as any).checklistOn !== false;
  const items  = (slot.checklist || []) as ChecklistItem[];

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    items.forEach(item => { init[item.id] = isDone || !!item.checked; });
    return init;
  });

  useEffect(() => {
    if (isDone) setChecked(prev => {
      const next = { ...prev };
      items.forEach(i => { next[i.id] = true; });
      return next;
    });
  }, [isDone]);

  function toggle(itemId: string) {
    if (isDone) return;
    const next = !checked[itemId];
    setChecked(prev => ({ ...prev, [itemId]: next }));
    onCheckItem(itemId, next);
  }

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginTop: 10 }} onClick={e => e.stopPropagation()}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text3)' }}>
          {isOn ? <CheckSquare size={13} color="var(--accent)"/> : <Square size={13}/>}
          <span>Checklist</span>
          {isOn && items.length > 0 && (
            <span style={{ fontSize:11, color:isDone?'var(--accent3)':'var(--text3)' }}>{doneCount}/{items.length}</span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>{isOn?'On':'Off'}</span>
          <button
            className={`toggle-switch${isOn?' on':''}`}
            onClick={e => { e.stopPropagation(); onToggleChecklist(!isOn); }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOn && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
            style={{ overflow:'hidden' }}
          >
            {items.map((item, idx) => {
              const isChecked = checked[item.id] ?? false;
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', fontSize:13, cursor:isDone?'default':'pointer', userSelect:'none' }}
                >
                  <div style={{
                    width:16, height:16, borderRadius:4, flexShrink:0,
                    border:`1.5px solid ${isChecked?'var(--accent)':'var(--border2)'}`,
                    background:isChecked?'var(--accent)':'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all 0.15s',
                  }}>
                    {isChecked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ flex:1, color:'var(--text2)', textDecoration:isChecked?'line-through':'none', opacity:isChecked?0.6:1, transition:'all 0.15s' }}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20, background:'rgba(226,75,74,0.1)', color:'#791F1F', fontWeight:600 }}>
                      required
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOn && items.length > 0 && (
        <div style={{ fontSize:11, color:'var(--text3)', fontStyle:'italic' }}>
          {items.length} item{items.length>1?'s':''} hidden — toggle on to show checklist
        </div>
      )}
    </div>
  );
}
