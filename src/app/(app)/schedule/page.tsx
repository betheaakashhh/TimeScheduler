'use client';
// src/app/(app)/schedule/page.tsx
// Day view with: inactive styling for future days, QuickFoodLog popup, day-specific notes
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSocket } from '@/hooks/useSocket';
import { enrichSlots } from '@/lib/scheduleUtils';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Calendar, PenSquare, ChevronLeft, ChevronRight, Loader2, MessageSquare, Lock, Info, Pencil } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const AnimatedTimeline = dynamic(() => import('@/components/timeline/AnimatedTimeline'), { ssr: false });
const ScheduleBuilder  = dynamic(() => import('@/components/builder/ScheduleBuilder'),  { ssr: false });
const AddSlotModal     = dynamic(() => import('@/components/schedule/AddSlotModal'),     { ssr: false });
const QuickFoodLog     = dynamic(() => import('@/components/schedule/QuickFoodLog'),     { ssr: false });

export default function SchedulePage() {
  const { data: session } = useSession();
  const { slots, setSlots, addSlot } = useScheduleStore();
  const [date, setDate]     = useState(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [view, setView]     = useState<'timeline' | 'builder'>('timeline');
  const [showAdd, setShowAdd] = useState(false);
  const [dayNote, setDayNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [quickFood, setQuickFood] = useState<{ mealType: 'BREAKFAST'|'LUNCH'|'DINNER'|'SNACK'; slotId: string } | null>(null);

  const userId = session?.user ? (session.user as any).id : undefined;
  const { markComplete, markSkip } = useSocket(userId);
  const today = dayjs().format('YYYY-MM-DD');
  const isToday = date === today;
  const isFuture = date > today;
  const isPast   = date < today;

  async function fetchSlots(d: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${d}`);
      const data = await res.json();
      setSlots(enrichSlots(data));
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (session?.user) fetchSlots(date); }, [date, session]);

  // Load day note from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`day-note:${date}`) || '';
    setDayNote(saved);
    setEditingNote(false);
  }, [date]);

  function saveNote() {
    localStorage.setItem(`day-note:${date}`, dayNote);
    setEditingNote(false);
    toast.success('Note saved');
  }

  const handleMarkDone = useCallback(async (slotId: string) => {
    const s = slots.find(x => x.id === slotId);
    if (!s) return;
    if (s.foodRequired) {
      // Check if food is already logged
      const mealType = s.tag === 'BREAKFAST' ? 'BREAKFAST' : s.tag === 'LUNCH' ? 'LUNCH' : 'DINNER';
      const res = await fetch(`/api/food-log?date=${date}`);
      const logs: any[] = res.ok ? await res.json() : [];
      const hasLog = logs.some(l => l.mealType === mealType);
      if (!hasLog) {
        setQuickFood({ mealType: mealType as any, slotId });
        return;
      }
    }
    markComplete(slotId, date);
    toast.success(`${s.title} done!`);
  }, [slots, markComplete, date]);

  const handleSkip = useCallback((slotId: string) => {
    const s = slots.find(x => x.id === slotId); if (!s) return;
    if (!confirm((s.strictMode === 'HARD' ? 'Blocks all later tasks!' : 'Breaks your streak!') + '\nSkip anyway?')) return;
    markSkip(slotId, date);
    toast(`Skipped`, { icon: '⚠️' });
  }, [slots, markSkip, date]);

  const handleCheckItem = useCallback((slotId: string, itemId: string, checked: boolean) => {
    setSlots(slots.map(s => s.id !== slotId ? s : { ...s, checklist: (s.checklist || []).map((item: any) => item.id === itemId ? { ...item, checked } : item) }));
  }, [slots, setSlots]);

  const handleToggleChecklist = useCallback((slotId: string, on: boolean) => {
    setSlots(slots.map(s => s.id === slotId ? { ...s, checklistOn: on } as any : s));
    fetch('/api/schedule', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: slotId, checklistOn: on }) }).catch(() => {});
  }, [slots, setSlots]);

  function changeDate(newDate: string) {
    setDate(newDate);
  }

  const dayLabel = isToday ? 'Today' : isFuture ? `${dayjs(date).diff(today, 'day')}d ahead` : `${dayjs(today).diff(date, 'day')}d ago`;

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Schedule</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            {dayjs(date).format('dddd, D MMMM YYYY')}
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: isToday ? 'rgba(255,107,53,0.1)' : isFuture ? 'rgba(55,138,221,0.1)' : 'var(--surface2)', color: isToday ? 'var(--accent)' : isFuture ? '#0C447C' : 'var(--text3)' }}>
              {dayLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => changeDate(dayjs(date).subtract(1,'day').format('YYYY-MM-DD'))}><ChevronLeft size={14}/></button>
          <button className="btn btn-sm" onClick={() => changeDate(today)} disabled={isToday}>Today</button>
          <button className="btn btn-sm" onClick={() => changeDate(dayjs(date).add(1,'day').format('YYYY-MM-DD'))}><ChevronRight size={14}/></button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add slot</button>
        </div>
      </div>

      {/* Future/past day banner */}
      <AnimatePresence>
        {isFuture && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(55,138,221,0.06)', border: '0.5px solid rgba(55,138,221,0.2)', marginBottom: 14, fontSize: 13, color: '#0C447C' }}>
            <Info size={15} />
            This is a future day — slots shown in preview mode. Tasks can't be marked complete yet.
          </motion.div>
        )}
        {isPast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '0.5px solid var(--border)', marginBottom: 14, fontSize: 13, color: 'var(--text3)' }}>
            <Lock size={14} />
            Past day — view only. You can still check what was completed.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day note / specific plan */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: editingNote ? 10 : 0 }}>
          <MessageSquare size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
            {isFuture ? 'Anything specific planned for this day?' : isToday ? "Today's focus" : 'Day note'}
          </span>
          <button onClick={() => setEditingNote(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <Pencil size={13} />
          </button>
        </div>
        <AnimatePresence>
          {editingNote ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <textarea className="form-input" rows={2} value={dayNote} onChange={e => setDayNote(e.target.value)}
                placeholder={isFuture ? "e.g. Doctor appointment at 3pm, skip gym..." : "e.g. Focus on DBMS revision today..."}
                style={{ width: '100%', resize: 'vertical', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={saveNote}>Save note</button>
                <button className="btn btn-sm" onClick={() => setEditingNote(false)}>Cancel</button>
              </div>
            </motion.div>
          ) : dayNote ? (
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, fontStyle: 'italic' }}>"{dayNote}"</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              Click ✏️ to add a note or special plan for this day
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {[{ v: 'timeline', Icon: Calendar, label: 'Day view' }, { v: 'builder', Icon: PenSquare, label: 'Builder' }].map(({ v, Icon, label }) => (
          <button key={v} onClick={() => setView(v as any)} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text3)', border: 'none', boxShadow: view === v ? 'var(--shadow)' : 'none', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {view === 'timeline' && (
        <div style={{ opacity: isFuture ? 0.72 : 1, filter: isFuture ? 'saturate(0.5)' : 'none', transition: 'all 0.3s', pointerEvents: isFuture ? 'auto' : 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: '32px 0', justifyContent: 'center' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
            </div>
          ) : (
            <AnimatedTimeline slots={slots} date={date} onMarkDone={handleMarkDone} onSkip={handleSkip} onCheckItem={handleCheckItem} onToggleChecklist={handleToggleChecklist} isFutureDay={isFuture} />
          )}
        </div>
      )}

      {view === 'builder' && <ScheduleBuilder onSave={async () => { await new Promise(r => setTimeout(r, 600)); }} />}

      {showAdd && <AddSlotModal onClose={() => setShowAdd(false)} onAdd={(s) => addSlot(s)} />}

      {/* Quick food log popup */}
      <AnimatePresence>
        {quickFood && (
          <QuickFoodLog
            mealType={quickFood.mealType}
            date={date}
            onLogged={() => {
              setQuickFood(null);
              // Retry marking complete
              markComplete(quickFood.slotId, date);
              toast.success('Food logged & slot marked done!');
            }}
            onDismiss={() => setQuickFood(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
