'use client';
// src/components/dashboard/RoutineHeatmap.tsx
// GitHub-style routine completion heatmap: rows = slots, cols = days of month
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

interface DayStat { date: string; completed: number; total: number; pct: number; slots: Record<string, boolean> }
interface Props { month?: string } // YYYY-MM

export default function RoutineHeatmap({ month }: Props) {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [slotTitles, setSlotTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const m = month || dayjs().format('YYYY-MM');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const daysInMonth = dayjs(m).daysInMonth();
        const dates = Array.from({ length: daysInMonth }, (_, i) => `${m}-${String(i + 1).padStart(2, '0')}`);
        // Fetch analytics which includes per-day stats
        const res = await fetch(`/api/analytics?range=${daysInMonth}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        // Map to heatmap format
        const dayMap: Record<string, DayStat> = {};
        (data.days || []).forEach((d: any) => {
          dayMap[d.date] = { date: d.date, completed: d.completed, total: d.total, pct: d.pct, slots: d.tagStats || {} };
        });
        setStats(dates.map(date => dayMap[date] || { date, completed: 0, total: 0, pct: 0, slots: {} }));
        // Get unique slot titles from tagStats keys
        const allTags = new Set<string>();
        Object.values(dayMap).forEach(d => Object.keys(d.slots).forEach(t => allTags.add(t)));
        setSlotTitles([...allTags]);
      } catch {}
      setLoading(false);
    }
    load();
  }, [m]);

  const today = dayjs().format('YYYY-MM-DD');
  const daysInMonth = dayjs(m).daysInMonth();

  if (loading) return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '16px 0' }}>Loading heatmap…</div>;

  const avgPct = stats.length > 0 ? Math.round(stats.filter(d => d.total > 0).reduce((a, d) => a + d.pct, 0) / Math.max(1, stats.filter(d => d.total > 0).length)) : 0;
  const perfectDays = stats.filter(d => d.pct === 100 && d.total > 0).length;
  const daysTracked = stats.filter(d => d.total > 0).length;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Avg completion', value: `${avgPct}%` },
          { label: 'Perfect days', value: perfectDays },
          { label: 'Days tracked', value: daysTracked },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Calendar grid - days as columns */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: daysInMonth * 28 + 100 }}>
          {/* Day number header */}
          <div style={{ display: 'flex', marginBottom: 4, marginLeft: 100 }}>
            {stats.map((d, i) => {
              const isToday = d.date === today;
              return (
                <div key={d.date} style={{ width: 24, marginRight: 3, textAlign: 'center', fontSize: 10, color: isToday ? 'var(--accent)' : 'var(--text3)', fontWeight: isToday ? 700 : 400 }}>
                  {i + 1}
                </div>
              );
            })}
          </div>

          {/* Overall completion row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ width: 100, fontSize: 11, color: 'var(--text3)', fontWeight: 500, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Overall</div>
            {stats.map(d => {
              const isToday = d.date === today;
              const isFuture = d.date > today;
              const bg = d.total === 0 || isFuture ? 'var(--surface2)' :
                         d.pct >= 100 ? '#1D9E75' :
                         d.pct >= 75  ? '#5DCAA5' :
                         d.pct >= 50  ? '#9FE1CB' :
                         d.pct >= 25  ? '#E1F5EE' : 'rgba(226,75,74,0.15)';
              return (
                <motion.div
                  key={d.date}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  title={`${dayjs(d.date).format('D MMM')}: ${d.completed}/${d.total} (${d.pct}%)`}
                  style={{
                    width: 22, height: 22, borderRadius: 4, marginRight: 3, flexShrink: 0,
                    background: bg,
                    border: isToday ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                    position: 'relative',
                    cursor: 'default',
                  }}
                >
                  {d.pct === 100 && d.total > 0 && (
                    <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Per-tag rows */}
          {slotTitles.map(tag => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ width: 100, fontSize: 11, color: 'var(--text3)', paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tag}>
                {tag.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
              </div>
              {stats.map(d => {
                const tagStat = d.slots[tag];
                const done = tagStat ? (tagStat as any).done > 0 : false;
                const isFuture = d.date > today;
                return (
                  <div
                    key={d.date}
                    title={`${dayjs(d.date).format('D MMM')} — ${tag.replace(/_/g,' ')}: ${done ? '✓' : '–'}`}
                    style={{
                      width: 22, height: 22, borderRadius: 4, marginRight: 3, flexShrink: 0,
                      background: isFuture ? 'var(--surface2)' : done ? 'rgba(29,158,117,0.6)' : d.date <= today ? 'rgba(226,75,74,0.12)' : 'var(--surface2)',
                      border: '0.5px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {done && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: 'var(--text3)', flexWrap: 'wrap' }}>
        {[
          { bg: '#1D9E75', label: '100% done' }, { bg: '#9FE1CB', label: '50–99%' },
          { bg: '#E1F5EE', label: '1–49%' }, { bg: 'rgba(226,75,74,0.15)', label: '0%' },
        ].map(({ bg, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: bg, border: '0.5px solid var(--border)' }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
