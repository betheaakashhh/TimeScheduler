'use client';
// src/components/academic/AcademicSubTimeline.tsx
// Fetches fresh from API on mount + every 60s. Accepts key prop for forced refresh.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '@/lib/scheduleUtils';
import { AcademicPeriod } from '@/types';
import { MapPin, Clock, BookOpen, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

interface EnrichedPeriod extends AcademicPeriod {
  isCurrent: boolean; isNext: boolean; isPast: boolean; progress: number; minutesLeft: number;
}

function enrichPeriods(periods: AcademicPeriod[]): EnrichedPeriod[] {
  const now = dayjs().hour() * 60 + dayjs().minute();
  let foundNext = false;
  return [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((p) => {
    const s = toMins(p.startTime), e = toMins(p.endTime);
    const isCurrent = now >= s && now < e, isPast = now >= e;
    const progress = isCurrent ? Math.min(100, Math.round(((now - s) / (e - s)) * 100)) : 0;
    const minutesLeft = isCurrent ? e - now : 0;
    const isNext = !isPast && !isCurrent && !foundNext && now < s;
    if (isNext) foundNext = true;
    return { ...p, isCurrent, isNext, isPast, progress, minutesLeft };
  });
}

export default function AcademicSubTimeline() {
  const [periods, setPeriods] = useState<EnrichedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/academic', { cache: 'no-store' });
      const data = await res.json();
      if (!data.timetable) { setPeriods([]); setLoading(false); return; }
      // Use todayPeriods from server (already filtered for today) OR filter from all periods
      if (data.todayPeriods?.length) {
        setPeriods(enrichPeriods(data.todayPeriods));
      } else if (data.timetable?.periods?.length) {
        const dow = dayjs().day(), d = dow === 0 ? 7 : dow;
        const today = (data.timetable.periods as AcademicPeriod[]).filter(p => p.dayOfWeek.includes(d));
        setPeriods(enrichPeriods(today));
      } else {
        setPeriods([]);
      }
    } catch { setError('Failed to load — check your network'); }
    setLoading(false);
  }

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={13} />
      </motion.div>
      Loading today's periods…
    </div>
  );

  if (error) return (
    <div style={{ fontSize: 12, color: '#E24B4A', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      {error} <button className="btn btn-sm" onClick={load}>Retry</button>
    </div>
  );

  if (periods.length === 0) return (
    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      <BookOpen size={13} />
      No periods for today — import your timetable in the Import CSV tab
    </div>
  );

  const current = periods.find(p => p.isCurrent);
  const next    = periods.find(p => p.isNext);
  const rest    = periods.filter(p => !p.isCurrent);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
          <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent3)', flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
          Academic periods — live · {dayjs().format('ddd D MMM')}
        </div>
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
          <RefreshCw size={12} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={current.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', background: current.color || 'var(--accent)', flexShrink: 0, minHeight: 32 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current.subject}</span>
                  {current.isLab && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'rgba(55,138,221,0.12)', color: '#0C447C', fontWeight: 600 }}>LAB</span>}
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'rgba(255,107,53,0.12)', color: '#712B13', fontWeight: 600 }}>NOW</motion.span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{formatTime(current.startTime)} – {formatTime(current.endTime)}</span>
                  {current.room && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{current.room}</span>}
                </div>
                <div style={{ height: 4, background: 'rgba(255,107,53,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, originX: 0 }} initial={{ scaleX: 0 }} animate={{ scaleX: current.progress / 100 }} transition={{ duration: 0.8 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                  <span>{current.progress}% done</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{current.minutesLeft} min left</span>
                </div>
              </div>
            </div>
            {next && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Up next</span>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text3)' }} />
                <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.subject}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatTime(next.startTime)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rest.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: p.isPast ? 0.45 : 1, x: 0 }} transition={{ delay: i * 0.04 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderRadius: 7, border: `0.5px solid ${p.isNext ? 'var(--border2)' : 'var(--border)'}`, background: p.isNext ? 'var(--surface2)' : 'transparent' }}>
            <div style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', background: p.color || 'var(--border2)', flexShrink: 0, minHeight: 24 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: p.isNext ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.subject}</span>
                {p.isLab && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: '#E6F1FB', color: '#0C447C', fontWeight: 600 }}>LAB</span>}
                {p.isNext && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text3)', fontWeight: 500 }}>next</span>}
                {p.isPast && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text3)', fontWeight: 400 }}>done</span>}
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatTime(p.startTime)}</span>
            {p.room && <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{p.room}</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
