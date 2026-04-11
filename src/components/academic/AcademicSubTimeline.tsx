'use client';
// src/components/academic/AcademicSubTimeline.tsx
// Nested academic period view inside the College/School slot card.
// Shows current class with live progress bar, upcoming periods listed below.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScheduleStore } from '@/store/scheduleStore';
import { formatTime } from '@/lib/scheduleUtils';
import { AcademicPeriod } from '@/types';
import { MapPin, Clock, BookOpen} from 'lucide-react';
import dayjs from 'dayjs';

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface EnrichedPeriod extends AcademicPeriod {
  isCurrent: boolean;
  isNext: boolean;
  isPast: boolean;
  progress: number;
  minutesLeft: number;
}

function enrichPeriods(periods: AcademicPeriod[]): EnrichedPeriod[] {
  const now = dayjs().hour() * 60 + dayjs().minute();
  const sorted = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
  let foundNext = false;

  return sorted.map((p) => {
    const s = toMins(p.startTime);
    const e = toMins(p.endTime);
    const isCurrent = now >= s && now < e;
    const isPast = now >= e;
    const progress = isCurrent ? Math.min(100, Math.round(((now - s) / (e - s)) * 100)) : 0;
    const minutesLeft = isCurrent ? e - now : 0;
    const isNext = !isPast && !isCurrent && !foundNext && now < s;
    if (isNext) foundNext = true;
    return { ...p, isCurrent, isNext, isPast, progress, minutesLeft };
  });
}

export default function AcademicSubTimeline() {
  const { currentPeriod, nextPeriod } = useScheduleStore();
  const [periods, setPeriods] = useState<EnrichedPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/academic');
        const data = await res.json();
        if (data.timetable?.periods) {
          const dayOfWeek = dayjs().day();
          const d = dayOfWeek === 0 ? 7 : dayOfWeek;
          const today = (data.timetable.periods as AcademicPeriod[]).filter(
            (p) => p.dayOfWeek.includes(d)
          );
          setPeriods(enrichPeriods(today));
        }
      } catch {}
      setLoading(false);
    }
    load();
    // Refresh every minute
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 0' }}>Loading periods…</div>
  );

  if (periods.length === 0) return (
    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      <BookOpen size={13} /> No periods found — upload your timetable in the Academic tab
    </div>
  );

  const current = periods.find((p) => p.isCurrent);
  const next    = periods.find((p) => p.isNext);
  const rest    = periods.filter((p) => !p.isCurrent);

  return (
    <div>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text3)' }}>
        <motion.div
          style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent3)', flexShrink: 0 }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        Academic periods — live
      </div>

      {/* Current class hero */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              background: 'rgba(255,107,53,0.06)',
              border: `1px solid rgba(255,107,53,0.25)`,
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {/* Color pip */}
              <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', background: current.color || 'var(--accent)', flexShrink: 0, minHeight: 32 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current.subject}
                  </span>
                  {current.isLab && (
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'rgba(55,138,221,0.12)', color: '#0C447C', fontWeight: 600, flexShrink: 0 }}>
                      LAB
                    </span>
                  )}
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: 'rgba(255,107,53,0.12)', color: '#712B13', fontWeight: 600, flexShrink: 0 }}
                  >
                    NOW
                  </motion.span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={11} />
                    {formatTime(current.startTime)} – {formatTime(current.endTime)}
                  </span>
                  {current.room && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={11} /> {current.room}
                    </span>
                  )}
                </div>
                {/* Live progress bar */}
                <div style={{ height: 4, background: 'rgba(255,107,53,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: current.progress / 100 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
                  <span>{current.progress}% done</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{current.minutesLeft} min left</span>
                </div>
              </div>
            </div>

            {/* Next period peek */}
            {next && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Up next</div>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text3)', flexShrink: 0 }} />
                <div style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{formatTime(next.startTime)}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remaining periods list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rest.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: p.isPast ? 0.45 : 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 9px',
              borderRadius: 7,
              border: `0.5px solid ${p.isNext ? 'var(--border2)' : 'var(--border)'}`,
              background: p.isNext ? 'var(--surface2)' : 'transparent',
            }}
          >
            <div style={{ width: 3, borderRadius: 2, alignSelf: 'stretch', background: p.color || 'var(--border2)', flexShrink: 0, minHeight: 24 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: p.isNext ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.subject}
                </span>
                {p.isLab && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: '#E6F1FB', color: '#0C447C', fontWeight: 600 }}>LAB</span>}
                {p.isNext && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text3)', fontWeight: 500 }}>next</span>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
              {formatTime(p.startTime)}
            </div>
            {p.room && (
              <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={10} />{p.room}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
