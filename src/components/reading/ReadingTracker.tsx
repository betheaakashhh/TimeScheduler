'use client';
// src/components/reading/ReadingTracker.tsx
// Reading timer with passive (timer only) and active (file upload + timer) modes
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, BookOpen, Upload, Sun, Moon, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

type Mode = 'idle' | 'setup' | 'reading' | 'done';
type SessionType = 'passive' | 'active';

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

interface StatsData { totalSec: number; byDay: Record<string, number>; sessions: any[] }

export default function ReadingTracker() {
  const [mode, setMode] = useState<Mode>('idle');
  const [sessionType, setSessionType] = useState<SessionType>('passive');
  const [title, setTitle] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [overview, setOverview] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [warmth, setWarmth] = useState(0); // 0 = normal, 100 = max warm
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/reading?range=30');
      if (res.ok) setStats(await res.json());
    } catch {}
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function startSession() {
    if (!title.trim() && sessionType === 'passive') { toast.error('Enter a book title'); return; }
    setMode('reading');
    setRunning(true);
    setElapsed(0);
  }

  function pauseResume() { setRunning(r => !r); }

  function stopSession() { setRunning(false); setMode('done'); }

  async function saveSession() {
    try {
      await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || null,
          sessionType,
          durationSec: elapsed,
          overview: overview || null,
          date: dayjs().format('YYYY-MM-DD'),
        }),
      });
      toast.success(`Reading session saved — ${formatTime(elapsed)}`);
      setMode('idle');
      setTitle(''); setElapsed(0); setOverview('');
      loadStats();
    } catch { toast.error('Failed to save'); }
  }

  // Screen warm filter
  const filterStyle = warmth > 0 ? { filter: `sepia(${warmth}%) brightness(${100 - warmth * 0.15}%)` } : {};

  return (
    <div style={filterStyle}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'This month', value: stats ? formatTime(stats.totalSec) : '—', sub: 'total reading', icon: Clock },
          { label: 'Sessions', value: stats?.sessions.length ?? '—', sub: 'this month', icon: BookOpen },
          { label: 'Today', value: stats?.byDay[dayjs().format('YYYY-MM-DD')] ? formatTime(stats.byDay[dayjs().format('YYYY-MM-DD')]) : '0:00', sub: 'read so far', icon: TrendingUp },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <Icon size={12} /> {label}
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* 30-day heatmap */}
      {stats && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>30-day reading activity</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Array.from({ length: 30 }, (_, i) => {
              const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD');
              const sec = stats.byDay[date] || 0;
              const intensity = Math.min(1, sec / 3600); // 1hr = full
              return (
                <div
                  key={date}
                  title={`${dayjs(date).format('D MMM')}: ${formatTime(sec)}`}
                  style={{
                    width: 18, height: 18, borderRadius: 3,
                    background: sec === 0 ? 'var(--surface2)' : `rgba(55,138,221,${0.2 + intensity * 0.8})`,
                    border: '0.5px solid var(--border)',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Session controls */}
      <AnimatePresence mode="wait">
        {mode === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['passive', 'active'] as SessionType[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setSessionType(t); setMode('setup'); }}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 10, border: '0.5px solid var(--border)',
                    background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: 'var(--text)', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t === 'passive' ? '⏱️' : '📖'}</div>
                  <div>{t === 'passive' ? 'Reading Timer' : 'Active Reading'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                    {t === 'passive' ? 'Timer + book title' : 'Upload file to read'}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                {sessionType === 'passive' ? 'Reading Timer' : 'Active Reading Session'}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Book / Material title</div>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Atomic Habits" />
              </div>
              {sessionType === 'active' && (
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label">Upload file to read</div>
                  <input type="file" accept=".pdf,.txt,.epub" className="form-input" onChange={e => setFileUrl(e.target.files?.[0]?.name || '')} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>PDF, TXT, or EPUB</div>
                </div>
              )}
              {sessionType === 'active' && (
                <div style={{ marginBottom: 14 }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>
                    <Sun size={13} /> Screen warmth (night mode)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sun size={14} color="var(--text3)" />
                    <input type="range" min={0} max={80} step={5} value={warmth} onChange={e => setWarmth(parseInt(e.target.value))} style={{ flex: 1 }} />
                    <Moon size={14} color="var(--accent4)" />
                    <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 28 }}>{warmth}%</span>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setMode('idle')}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={startSession}>
                  <Play size={14} /> Start reading
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'reading' && (
          <motion.div key="reading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: `1px solid ${running ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: 28, textAlign: 'center' }}>
              {title && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>Reading: {title}</div>}
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 52, fontWeight: 800, marginBottom: 6, color: running ? 'var(--accent)' : 'var(--text2)' }}>
                {formatTime(elapsed)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
                {running ? '● Reading in progress' : '⏸ Paused'}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" style={{ gap: 8 }} onClick={pauseResume}>
                  {running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Resume</>}
                </button>
                <button className="btn" style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)', gap: 8 }} onClick={stopSession}>
                  <Square size={15} /> Stop
                </button>
              </div>
              {sessionType === 'active' && warmth > 0 && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 12, color: 'var(--accent4)' }}>
                  <Moon size={13} /> Night mode: {warmth}%
                </div>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <CheckCircle2 size={20} color="var(--accent3)" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Session complete!</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>You read for {formatTime(elapsed)}</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="form-label">Quick overview (optional)</div>
                <textarea
                  className="form-input"
                  rows={3}
                  value={overview}
                  onChange={e => setOverview(e.target.value)}
                  placeholder="What did you read about? Key takeaways..."
                  style={{ resize: 'vertical', fontSize: 12 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => { setMode('idle'); setElapsed(0); }}>Discard</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveSession}>
                  <CheckCircle2 size={13} /> Save session
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
