'use client';
// src/app/analytics/page.tsx
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart2, TrendingUp, Flame, CheckCircle2, XCircle } from 'lucide-react';
import { DAY_LEVEL_CONFIG, DayLevel } from '@/types';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

interface WeekDay {
  date: string;
  label: string;
  completed: number;
  total: number;
  rate: number;
  level: DayLevel;
}

function HeatCell({ day }: { day: WeekDay }) {
  const alpha = day.total === 0 ? 0.05 : Math.max(0.12, day.rate);
  const isToday = day.date === dayjs().format('YYYY-MM-DD');
  const levelCfg = DAY_LEVEL_CONFIG[day.level];

  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text3)' }}>{day.label}</div>
      <div
        style={{
          height: 60, borderRadius: 8,
          background: day.total === 0 ? 'var(--surface2)' : `rgba(45,203,122,${alpha})`,
          border: `0.5px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}
      >
        <div style={{ fontSize: 16 }}>{day.total === 0 ? '—' : levelCfg.emoji}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
        {day.total === 0 ? '—' : `${day.completed}/${day.total}`}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const streakRes = await fetch('/api/streak');
        const streakData = await streakRes.json();
        setStreak(streakData);

        // Build week data by fetching schedule for each day
        const today = dayjs();
        const days: WeekDay[] = [];
        const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

        for (let i = 6; i >= 0; i--) {
          const d = today.subtract(i, 'day');
          const dateStr = d.format('YYYY-MM-DD');
          const dayOfWeek = d.day(); // 0=Sun
          const labelIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

          try {
            const res = await fetch(`/api/schedule?date=${dateStr}`);
            const slots = await res.json();
            const nonAuto = slots.filter((s: any) => !s.isAutoMark);
            const completed = nonAuto.filter((s: any) => s.status === 'COMPLETED').length;
            const total = nonAuto.length;
            const rate = total > 0 ? completed / total : 0;
            const level: DayLevel = !total ? 1 :
              rate >= 0.95 ? 6 : rate >= 0.80 ? 5 : rate >= 0.65 ? 4 :
              rate >= 0.50 ? 3 : rate >= 0.25 ? 2 : 1;

            days.push({ date: dateStr, label: dayLabels[labelIdx], completed, total, rate, level });
          } catch {
            days.push({ date: dateStr, label: dayLabels[labelIdx], completed: 0, total: 0, rate: 0, level: 1 });
          }
        }
        setWeekData(days);
      } catch (err) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) load();
  }, [session]);

  const totalCompleted = weekData.reduce((a, d) => a + d.completed, 0);
  const totalTasks = weekData.reduce((a, d) => a + d.total, 0);
  const avgRate = weekData.length > 0 ? Math.round(weekData.reduce((a, d) => a + d.rate, 0) / weekData.length * 100) : 0;

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Consistency & Analytics</div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '7-Day Tasks', value: `${totalCompleted}/${totalTasks}`, sub: 'completed', icon: CheckCircle2, color: 'var(--accent3)' },
          { label: 'Avg Completion', value: `${avgRate}%`, sub: 'this week', icon: TrendingUp, color: 'var(--accent2)' },
          { label: 'Current Streak', value: `🌞 ${streak?.current || 0}`, sub: 'days', icon: Flame, color: 'var(--accent4)' },
          { label: 'Best Streak', value: `👑 ${streak?.best || 0}`, sub: 'days', icon: Flame, color: 'var(--accent4)' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card card-sm" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon size={12} /> {label}
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* 7-day heatmap */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>7-Day Activity Map</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 12, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
              </div>
            ))
          ) : (
            weekData.map((day) => <HeatCell key={day.date} day={day} />)
          )}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {(Object.entries(DAY_LEVEL_CONFIG) as [string, any][]).map(([lvl, cfg]) => (
            <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
              <span>{cfg.emoji}</span>{cfg.label}
            </div>
          ))}
        </div>
      </div>

      {/* Per-day breakdown */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Day-by-Day Breakdown</div>
        {weekData.map((day) => {
          const isToday = day.date === dayjs().format('YYYY-MM-DD');
          const pct = day.total > 0 ? Math.round(day.rate * 100) : 0;
          return (
            <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: 80, fontSize: 13, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text)' }}>
                {dayjs(day.date).format('ddd, D MMM')}
              </div>
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--accent3)' : pct >= 50 ? 'var(--accent4)' : '#E24B4A' }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', width: 50, textAlign: 'right' }}>
                {day.total === 0 ? '—' : `${pct}%`}
              </div>
              <div style={{ fontSize: 16, width: 24, textAlign: 'center' }}>
                {DAY_LEVEL_CONFIG[day.level].emoji}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
