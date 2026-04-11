'use client';
// src/app/timetable/page.tsx
// Full-page weekly timetable — clickable cells reveal slot details
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSocket } from '@/hooks/useSocket';
import { enrichSlots } from '@/lib/scheduleUtils';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { Loader2, RefreshCw, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

const TimetableGrid = dynamic(() => import('@/components/timetable/TimetableGrid'), { ssr: false });

export default function TimetablePage() {
  const { data: session } = useSession();
  const { slots, setSlots } = useScheduleStore();
  const [loading, setLoading] = useState(true);

  const userId = session?.user ? (session.user as any).id : undefined;
  const { markComplete, markSkip } = useSocket(userId);
  const today = dayjs().format('YYYY-MM-DD');

  async function fetchSlots() {
    setLoading(true);
    try {
      // Fetch ALL unique slots (not date-filtered) for the weekly grid
      const res  = await fetch(`/api/schedule?date=${today}`);
      const data = await res.json();
      setSlots(enrichSlots(data));
    } catch {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (session?.user) fetchSlots(); }, [session]);

  const handleMarkDone = useCallback((slotId: string) => {
    const s = slots.find(x => x.id === slotId);
    if (!s) return;
    markComplete(slotId, today);
    toast.success(`${s.title} marked done!`);
  }, [slots, markComplete, today]);

  const handleSkip = useCallback((slotId: string) => {
    const s = slots.find(x => x.id === slotId);
    if (!s) return;
    const msg = s.strictMode === 'HARD' ? 'Blocks all later tasks!' : 'Breaks your streak!';
    if (!confirm(msg + '\nSkip anyway?')) return;
    markSkip(slotId, today);
    toast(`Skipped: ${s.title}`, { icon: '⚠️' });
  }, [slots, markSkip, today]);

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="var(--accent)" />
            Weekly Timetable
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            Click any slot to see details · {dayjs().format('MMMM YYYY')}
          </div>
        </div>
        <button className="btn btn-sm" onClick={fetchSlots}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
        {[
          { color: 'var(--accent3)', label: 'Completed' },
          { color: 'var(--accent)',  label: 'In progress' },
          { color: '#E24B4A',        label: 'Blocked' },
          { color: '#E24B4A',        label: 'Hard strict', bar: true },
          { color: '#BA7517',        label: 'Warn strict', bar: true },
          { color: '#378ADD',        label: 'Grace strict', bar: true },
        ].map(({ color, label, bar }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text3)' }}>
            {bar ? (
              <div style={{ width: 4, height: 16, borderRadius: 2, background: color }} />
            ) : (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            )}
            {label}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', padding: '40px 0', justifyContent: 'center' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Building your timetable…
        </div>
      ) : slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text3)' }}>
          <Calendar size={44} style={{ margin: '0 auto 14px', opacity: 0.3 }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No slots yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Create your schedule first, then come back here for the full grid view.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <TimetableGrid slots={slots} onMarkDone={handleMarkDone} onSkip={handleSkip} />
        </div>
      )}
    </div>
  );
}
