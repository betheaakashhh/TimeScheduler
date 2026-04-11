'use client';
// src/app/schedule/page.tsx — uses AnimatedTimeline + ScheduleBuilder
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSocket } from '@/hooks/useSocket';
import { enrichSlots } from '@/lib/scheduleUtils';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Calendar, PenSquare, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const AnimatedTimeline = dynamic(() => import('@/components/timeline/AnimatedTimeline'), { ssr: false });
const ScheduleBuilder  = dynamic(() => import('@/components/builder/ScheduleBuilder'),  { ssr: false });
const AddSlotModal     = dynamic(() => import('@/components/schedule/AddSlotModal'),     { ssr: false });

export default function SchedulePage() {
  const { data: session } = useSession();
  const { slots, setSlots, addSlot } = useScheduleStore();
  const [date, setDate]   = useState(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [view, setView]   = useState<'timeline' | 'builder'>('timeline');
  const [showAdd, setShowAdd] = useState(false);

  const userId = session?.user ? (session.user as any).id : undefined;
  const { markComplete, markSkip } = useSocket(userId);
  const isToday = date === dayjs().format('YYYY-MM-DD');

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

  const handleMarkDone = useCallback((slotId: string) => {
    const s = slots.find((x) => x.id === slotId);
    if (s?.foodRequired && s.status !== 'COMPLETED') { toast.error('Log food first!'); return; }
    markComplete(slotId, date);
    toast.success('Done!');
  }, [slots, markComplete, date]);

  const handleSkip = useCallback((slotId: string) => {
    const s = slots.find((x) => x.id === slotId);
    if (!s) return;
    const msg = s.strictMode === 'HARD' ? '🔒 Blocks all later tasks!' : '⚠️ Breaks your streak!';
    if (!confirm(msg + '\nSkip anyway?')) return;
    markSkip(slotId, date);
    toast(`Skipped`, { icon: '⚠️' });
  }, [slots, markSkip, date]);

  const handleCheckItem = useCallback((slotId: string, itemId: string, checked: boolean) => {
    setSlots(slots.map((s) => {
      if (s.id !== slotId) return s;
      const checklist = (s.checklist || []).map((item: any) =>
        item.id === itemId ? { ...item, checked } : item
      );
      return { ...s, checklist };
    }));
  }, [slots, setSlots]);

  const handleToggleChecklist = useCallback((slotId: string, on: boolean) => {
    setSlots(slots.map((s) => s.id === slotId ? { ...s, checklistOn: on } as any : s));
    fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slotId, checklistOn: on }),
    }).catch(() => {});
  }, [slots, setSlots]);

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Schedule</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            {dayjs(date).format('dddd, D MMMM YYYY')}
            {isToday && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,107,53,0.1)', color: 'var(--accent)', fontWeight: 600 }}>TODAY</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setDate(dayjs(date).subtract(1,'day').format('YYYY-MM-DD'))}><ChevronLeft size={14}/></button>
          <button className="btn btn-sm" onClick={() => setDate(dayjs().format('YYYY-MM-DD'))} disabled={isToday}>Today</button>
          <button className="btn btn-sm" onClick={() => setDate(dayjs(date).add(1,'day').format('YYYY-MM-DD'))}><ChevronRight size={14}/></button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add slot</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {[{ v: 'timeline', Icon: Calendar, label: 'Day view' }, { v: 'builder', Icon: PenSquare, label: 'Builder' }].map(({ v, Icon, label }) => (
          <button key={v} onClick={() => setView(v as any)} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text3)', border: 'none', boxShadow: view === v ? 'var(--shadow)' : 'none', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {view === 'timeline' && (
        loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: '32px 0', justifyContent: 'center' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
          </div>
        ) : (
          <AnimatedTimeline slots={slots} date={date} onMarkDone={handleMarkDone} onSkip={handleSkip} onCheckItem={handleCheckItem} onToggleChecklist={handleToggleChecklist} />
        )
      )}

      {view === 'builder' && (
        <ScheduleBuilder onSave={async () => { await new Promise(r => setTimeout(r, 600)); }} />
      )}

      {showAdd && <AddSlotModal onClose={() => setShowAdd(false)} onAdd={(s) => addSlot(s)} />}
    </div>
  );
}
