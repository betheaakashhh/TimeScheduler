'use client';
// src/components/builder/ScheduleBuilder.tsx
// Drag-to-reorder schedule builder. Reordering auto-shifts ALL times sequentially.
// Save does: DELETE removed DB slots, PATCH changed ones, POST new ones.
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Trash2, Plus, RefreshCw, CheckSquare, Square, ChevronDown, Loader2 } from 'lucide-react';
import { TAG_CONFIG, SlotTag } from '@/types';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';






interface BuilderSlot {
  id: string;
  _isNew?: boolean;  // not yet saved to DB
  emoji: string;
  name: string;
  startTime: string;
  endTime: string;
  tag: SlotTag;
  checklistOn: boolean;
  checklist: { id: string; label: string; required: boolean }[];
  strict: boolean;
  strictMode: 'HARD' | 'WARN' | 'GRACE';
  repeatDays: number[];
  isAutoMark: boolean;
  emailAlert: boolean;
  foodRequired: boolean;
}

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function toTime(m: number) {
  m = Math.max(0, Math.min(23 * 60 + 59, m));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmt(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM', hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}
function duration(s: string, e: string) { const d = toMins(e) - toMins(s); return d <= 0 ? 0 : d; }

function makeSlot(name: string, emoji: string, start: string, end: string, tag: SlotTag): BuilderSlot {
  return { id: uuid(), _isNew: true, emoji, name, startTime: start, endTime: end, tag, checklistOn: false, checklist: [], strict: false, strictMode: 'WARN', repeatDays: [1,2,3,4,5,6,7], isAutoMark: false, emailAlert: false, foodRequired: false };
}

// When slots are reordered, redistribute times sequentially keeping each slot's duration
function redistributeTimes(slots: BuilderSlot[]): BuilderSlot[] {
  if (!slots.length) return slots;
  let cursor = toMins(slots[0].startTime); // start from first slot's start time
  return slots.map(slot => {
    const dur = duration(slot.startTime, slot.endTime) || 60;
    const newStart = cursor;
    const newEnd = cursor + dur;
    cursor = newEnd;
    return { ...slot, startTime: toTime(newStart), endTime: toTime(newEnd) };
  });
}

interface ShiftEvent { slotName: string; oldStart: string; newStart: string }
interface Props { onSave?: () => Promise<void> }

export default function ScheduleBuilder({ onSave }: Props) {
  const [slots, setSlots] = useState<BuilderSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shiftEvents, setShiftEvents] = useState<ShiftEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dbSlotIds, setDbSlotIds] = useState<Set<string>>(new Set()); // IDs that exist in DB
  const shiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/schedule?date=${today}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const loaded = data.map((s: any): BuilderSlot => ({
            id: s.id, _isNew: false, emoji: s.emoji || '📌', name: s.title,
            startTime: s.startTime, endTime: s.endTime, tag: s.tag,
            checklistOn: true, checklist: (s.checklist || []),
            strict: s.isStrict, strictMode: s.strictMode || 'WARN',
            repeatDays: s.repeatDays || [1,2,3,4,5,6,7],
            isAutoMark: s.isAutoMark || false, emailAlert: s.emailAlert || false, foodRequired: s.foodRequired || false,
          }));
          setSlots(loaded);
          setDbSlotIds(new Set(data.map((s: any) => s.id)));
        } else {
          setSlots([
            makeSlot('Wake up', '🌅', '06:00', '06:30', 'MORNING_ROUTINE'),
            makeSlot('Breakfast', '🍳', '07:00', '08:00', 'BREAKFAST'),
          ]);
          setDbSlotIds(new Set());
        }
      } catch { toast.error('Failed to load schedule'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleEndTimeChange = useCallback((id: string, newEnd: string) => {
    setSlots(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const oldEnd = prev[idx].endTime;
      const diff = toMins(newEnd) - toMins(oldEnd);
      if (diff === 0) return prev;
      const shifted: ShiftEvent[] = [];
      const updated = prev.map((s, i) => {
        if (i === idx) return { ...s, endTime: newEnd };
        if (i > idx) {
          const ns = toMins(s.startTime) + diff, ne = toMins(s.endTime) + diff;
          shifted.push({ slotName: s.name, oldStart: s.startTime, newStart: toTime(ns) });
          return { ...s, startTime: toTime(ns), endTime: toTime(ne) };
        }
        return s;
      });
      if (shifted.length > 0) {
        setShiftEvents(shifted);
        if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
        shiftTimerRef.current = setTimeout(() => setShiftEvents([]), 4000);
      }
      return updated;
    });
  }, []);

  const handleStartTimeChange = useCallback((id: string, val: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, startTime: val } : s));
  }, []);

  const handleFieldChange = useCallback((id: string, field: keyof BuilderSlot, val: any) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  }, []);

  const deleteSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
    setExpandedId(e => e === id ? null : e);
  }, []);

  const addSlot = useCallback(() => {
    const last = slots[slots.length - 1];
    const newStart = last ? toMins(last.endTime) + 5 : toMins('06:00');
    const slot = makeSlot('New slot', '📌', toTime(newStart), toTime(newStart + 60), 'CUSTOM');
    setSlots(prev => [...prev, slot]);
    setExpandedId(slot.id);
  }, [slots]);

  // Reorder with auto time redistribution
  const handleReorder = useCallback((newOrder: BuilderSlot[]) => {
    const beforeTimes = newOrder.map(s => s.startTime);
    const redistributed = redistributeTimes(newOrder);
    const shifted: ShiftEvent[] = redistributed
      .map((s, i) => ({ slotName: s.name, oldStart: beforeTimes[i], newStart: s.startTime }))
      .filter(e => e.oldStart !== e.newStart);
    setSlots(redistributed);
    if (shifted.length > 0) {
      setShiftEvents(shifted);
      if (shiftTimerRef.current) clearTimeout(shiftTimerRef.current);
      shiftTimerRef.current = setTimeout(() => setShiftEvents([]), 4000);
    }
  }, []);

  const addChecklistItem = useCallback((id: string, item: string) => {
    if (!item.trim()) return;
    const newItem = { id: uuid(), label: item.trim(), required: false };
    setSlots(prev => prev.map(s => s.id === id ? { ...s, checklist: [...s.checklist, newItem] } : s));
  }, []);

  const removeChecklistItem = useCallback((id: string, itemId: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, checklist: s.checklist.filter(c => c.id !== itemId) } : s));
  }, []);

 // for future visual builder tab, not used in current code but imported here to avoid hydration issues when switching tabs in parent component

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentBuilderIds = new Set(slots.map(s => s.id));

      // 1. DELETE — slots that were in DB but are no longer in builder
      const toDelete = [...dbSlotIds].filter(id => !currentBuilderIds.has(id));
      for (const id of toDelete) {
        await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      }

      // 2. PATCH / POST — each builder slot in order
      const newDbIds = new Set<string>();
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const payload = {
          title: s.name, emoji: s.emoji, startTime: s.startTime, endTime: s.endTime,
          tag: s.tag, isStrict: s.strict, strictMode: s.strictMode,
          isAutoMark: s.isAutoMark, emailAlert: s.emailAlert, foodRequired: s.foodRequired,
          repeatDays: s.repeatDays, checklist: s.checklist, sortOrder: i,
          isAcademic: false, description: '',
        };

        if (!s._isNew && dbSlotIds.has(s.id)) {
          // PATCH existing
          const patchRes = await fetch('/api/schedule', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: s.id, ...payload }),
          });
          if (!patchRes.ok) { const e = await patchRes.json(); toast.error(e.error || 'PATCH failed'); }
          else newDbIds.add(s.id);
        } else {
          // POST new
          const postRes = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (postRes.ok) {
            const created = await postRes.json();
            newDbIds.add(created.id);
            setSlots(prev => prev.map(x => x.id === s.id ? { ...x, id: created.id, _isNew: false } : x));
          } else {
            const e = await postRes.json();
            toast.error(e.error || 'Create failed');
          }
        }
      }

      setDbSlotIds(newDbIds);
      toast.success('Schedule saved!');
      await onSave?.();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Save failed — see console');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text3)', padding:'32px 0', justifyContent:'center' }}>
      <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Loading your schedule…
    </div>
  );

  return (
    <div>
      {/* Shift notification */}
      <AnimatePresence>
        {shiftEvents.length > 0 && (
          <motion.div initial={{ opacity:0, y:-8, height:0 }} animate={{ opacity:1, y:0, height:'auto' }} exit={{ opacity:0, y:-8, height:0 }}
            style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 13px', borderRadius:8, background:'rgba(29,158,117,0.08)', border:'0.5px solid rgba(29,158,117,0.3)', marginBottom:12, fontSize:12, color:'#085041', overflow:'hidden' }}>
            <RefreshCw size={13} style={{ marginTop:1, flexShrink:0 }} />
            <div>
              <div style={{ fontWeight:500, marginBottom:3 }}>Auto-shifted {shiftEvents.length} slot{shiftEvents.length>1?'s':''}</div>
              {shiftEvents.slice(0,3).map((ev,i) => <div key={i} style={{ opacity:0.8 }}>{ev.slotName}: {fmt(ev.oldStart)} → {fmt(ev.newStart)}</div>)}
              {shiftEvents.length>3 && <div style={{ opacity:0.6 }}>+{shiftEvents.length-3} more…</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info banner */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:'rgba(55,138,221,0.06)', border:'0.5px solid rgba(55,138,221,0.2)', marginBottom:12, fontSize:12, color:'#0C447C' }}>
        💡 Drag rows to reorder — times auto-adjust. Click Save to persist changes.
      </div>

      <Reorder.Group axis="y" values={slots} onReorder={handleReorder} style={{ listStyle:'none', padding:0, margin:0 }}>
        {slots.map((slot) => (
          <Reorder.Item key={slot.id} value={slot} style={{ marginBottom:8, cursor:'grab' }}>
            <motion.div layout style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:10, overflow:'hidden' }} whileHover={{ borderColor:'var(--border2)' }}>
              {/* Row */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px' }}>
                <div style={{ cursor:'grab', color:'var(--text3)', flexShrink:0, display:'flex' }}><GripVertical size={16}/></div>
                <input value={slot.emoji} onChange={e => handleFieldChange(slot.id,'emoji',e.target.value)} onClick={e=>e.stopPropagation()} style={{ width:32, textAlign:'center', fontSize:18, background:'transparent', border:'none', outline:'none', cursor:'text', fontFamily:'var(--font-body)' }} maxLength={2}/>
                <input value={slot.name} onChange={e => handleFieldChange(slot.id,'name',e.target.value)} onClick={e=>e.stopPropagation()} style={{ flex:1, fontSize:13, fontWeight:500, background:'transparent', border:'none', outline:'none', cursor:'text', color:'var(--text)', fontFamily:'var(--font-body)', minWidth:0 }}/>
                <input type="time" value={slot.startTime} onChange={e=>handleStartTimeChange(slot.id,e.target.value)} onClick={e=>e.stopPropagation()} className="form-input" style={{ width:80, padding:'4px 7px', fontSize:12, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>–</span>
                <input type="time" value={slot.endTime} onChange={e=>handleEndTimeChange(slot.id,e.target.value)} onClick={e=>e.stopPropagation()} className="form-input" style={{ width:80, padding:'4px 7px', fontSize:12, flexShrink:0 }}/>
                <div style={{ fontSize:11, color:'var(--text3)', flexShrink:0, minWidth:36 }}>{(() => { const d=duration(slot.startTime,slot.endTime); return d>=60?`${Math.floor(d/60)}h${d%60?` ${d%60}m`:''}`:`${d}m`; })()}</div>
                <button onClick={e=>{e.stopPropagation();setExpandedId(x=>x===slot.id?null:slot.id);}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex' }}>
                  <motion.div animate={{ rotate:expandedId===slot.id?180:0 }} transition={{ duration:0.2 }}><ChevronDown size={15}/></motion.div>
                </button>
                <button onClick={e=>{e.stopPropagation();if(confirm('Delete this slot?'))deleteSlot(slot.id);}} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex', padding:3, borderRadius:6, transition:'background 0.15s, color 0.15s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(226,75,74,0.1)';(e.currentTarget as HTMLElement).style.color='#A32D2D';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='var(--text3)';}}>
                  <Trash2 size={14}/>
                </button>
              </div>

              {/* Expanded */}
              <AnimatePresence>
                {expandedId===slot.id && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} style={{ overflow:'hidden' }}>
                    <div style={{ borderTop:'0.5px solid var(--border)', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                      {/* Tag */}
                      <div>
                        <div className="form-label" style={{ marginBottom:6 }}>Category</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {(Object.keys(TAG_CONFIG) as SlotTag[]).map(t => (
                            <button key={t} onClick={()=>handleFieldChange(slot.id,'tag',t)} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', border:'0.5px solid var(--border)', background:slot.tag===t?'rgba(255,107,53,0.08)':'var(--surface2)', color:slot.tag===t?'var(--accent)':'var(--text3)', borderColor:slot.tag===t?'var(--accent)':'var(--border)' }}>
                              {TAG_CONFIG[t].emoji} {TAG_CONFIG[t].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Repeat days */}
                      <div>
                        <div className="form-label" style={{ marginBottom:6 }}>Repeat on</div>
                        <div style={{ display:'flex', gap:4 }}>
                          {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d,i) => {
                            const dayNum = i+1, sel = slot.repeatDays.includes(dayNum);
                            return <button key={d} onClick={()=>handleFieldChange(slot.id,'repeatDays',sel?slot.repeatDays.filter(x=>x!==dayNum):[...slot.repeatDays,dayNum].sort())} style={{ width:32, height:32, borderRadius:'50%', fontSize:10, fontWeight:600, border:'0.5px solid var(--border2)', cursor:'pointer', background:sel?'var(--accent)':'var(--surface)', color:sel?'white':'var(--text3)' }}>{d}</button>;
                          })}
                        </div>
                      </div>
                      {/* Options */}
                      <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
                        {[
                          { label:'Strict', field:'strict', val:slot.strict },
                          { label:'Auto-complete', field:'isAutoMark', val:slot.isAutoMark },
                          { label:'Email alert', field:'emailAlert', val:slot.emailAlert },
                          { label:'Food required', field:'foodRequired', val:slot.foodRequired },
                        ].map(({ label, field, val }) => (
                          <label key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                            <input type="checkbox" checked={!!val} onChange={e=>handleFieldChange(slot.id,field as any,e.target.checked)} style={{ accentColor:'var(--accent)' }}/>{label}
                          </label>
                        ))}
                        {slot.strict && (
                          <select value={slot.strictMode} onChange={e=>handleFieldChange(slot.id,'strictMode',e.target.value)} className="form-input" style={{ padding:'3px 8px', fontSize:12, width:'auto' }}>
                            <option value="HARD">Hard lock</option>
                            <option value="WARN">Warn & skip</option>
                            <option value="GRACE">Grace period</option>
                          </select>
                        )}
                      </div>
                      {/* Checklist */}
                      <div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500 }}>
                            {slot.checklistOn ? <CheckSquare size={14} color="var(--accent)"/> : <Square size={14} color="var(--text3)"/>}
                            Checklist
                          </div>
                          <button className={`toggle-switch${slot.checklistOn?' on':''}`} onClick={()=>handleFieldChange(slot.id,'checklistOn',!slot.checklistOn)}/>
                        </div>
                        <AnimatePresence>
                          {slot.checklistOn && (
                            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
                              {slot.checklist.map(item => (
                                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 0', fontSize:12 }}>
                                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--border2)', flexShrink:0 }}/>
                                  <span style={{ flex:1, color:'var(--text2)' }}>{item.label}</span>
                                  <span style={{ fontSize:10, padding:'1px 5px', borderRadius:20, border:'0.5px solid var(--border)', background:item.required?'rgba(226,75,74,0.08)':'var(--surface2)', color:item.required?'#E24B4A':'var(--text3)', cursor:'pointer' }} onClick={()=>setSlots(prev=>prev.map(s=>s.id===slot.id?{...s,checklist:s.checklist.map(c=>c.id===item.id?{...c,required:!c.required}:c)}:s))}>
                                    {item.required?'required':'optional'}
                                  </span>
                                  <button onClick={()=>removeChecklistItem(slot.id,item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:16, lineHeight:1 }}>×</button>
                                </div>
                              ))}
                              <ChecklistAdder onAdd={item=>addChecklistItem(slot.id,item)}/>
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

      <motion.button onClick={addSlot} whileHover={{ borderColor:'var(--accent)', color:'var(--accent)' }} whileTap={{ scale:0.98 }}
        style={{ width:'100%', padding:'10px', borderRadius:10, border:'1.5px dashed var(--border2)', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:500, color:'var(--text3)', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'var(--font-body)', transition:'color 0.15s, border-color 0.15s', marginTop:4, marginBottom:14 }}>
        <Plus size={15}/> Add time slot
      </motion.button>

      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={13} style={{ animation:'spin 1s linear infinite' }}/> Saving…</> : '💾 Save schedule'}
        </button>
        <button className="btn btn-sm" onClick={()=>window.location.reload()}>Reset</button>
      </div>
    </div>
  );
}

function ChecklistAdder({ onAdd }: { onAdd: (item: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display:'flex', gap:6, marginTop:6 }}>
      <input className="form-input" value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&val.trim()){onAdd(val);setVal('');}}} placeholder="Add item…" style={{ flex:1, padding:'5px 9px', fontSize:12 }}/>
      <button className="btn btn-sm" onClick={()=>{if(val.trim()){onAdd(val);setVal('');}}}>Add</button>
    </div>
  );
}
