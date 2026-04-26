'use client';
// src/components/reading/ReadingTracker.tsx
// Redesigned reading tracker:
//   - Rich stats: total time, sessions, today, pages, book types
//   - 30-day activity heatmap
//   - Passive mode: timer only
//   - Active mode: file upload → launches ActiveReader (full reading interface)
//     After ActiveReader closes → shows save dialog with session summary
//   - Share stats card via ShareCard component

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Loader2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import type { ReaderCloseData } from '@/components/reading/ActiveReader';

// Lazy load heavy components
const ActiveReader = dynamic(() => import('@/components/reading/ActiveReader'), { ssr: false });
const ShareCard    = dynamic(() => import('@/components/reading/ShareCard'),    { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'idle' | 'passive_setup' | 'passive_running' | 'passive_done' | 'active_setup' | 'active_reading' | 'active_done';

interface StatsData {
  totalSec: number;
  byDay: Record<string, number>;
  sessions: any[];
  // extended fields from updated API:
  totalPages?: number;
  byDayPages?: Record<string, number>;
  bookTypes?: Record<string, number>;
}

interface PendingSession {
  type: 'passive' | 'active';
  elapsed: number;
  pagesRead: number;
  totalPages: number;
  bookType: string;
  title: string;
  overview: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatShort(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);

  if (h > 0) {
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const minWithDecimal = Math.round((sec / 60) * 10) / 10;
  return `${minWithDecimal.toFixed(1)}m`;
}

// ─── Session type card ────────────────────────────────────────────────────────
function ModeCard({ icon, title, desc, color, bg, borderColor, onClick }: {
  icon: string; title: string; desc: string;
  color: string; bg: string; borderColor: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2, borderColor: color }}
      whileTap={{ scale: 0.98 }}
      style={{
        flex: 1, padding: '20px 16px', borderRadius: 14, border: `1.5px solid ${borderColor}`,
        background: bg, cursor: 'pointer', textAlign: 'center',
        fontFamily: 'var(--font-body)', transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <i className={icon} style={{ fontSize: 22, color }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>{desc}</div>
    </motion.button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReadingTracker() {
  const [mode, setMode] = useState<Mode>('idle');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [streak, setStreak] = useState<{ current: number; best: number } | null>(null);

  // Passive timer
  const [passiveTitle, setPassiveTitle] = useState('');
  const [passiveElapsed, setPassiveElapsed] = useState(0);
  const [passiveRunning, setPassiveRunning] = useState(false);
  const passiveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active reading
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeTitle, setActiveTitle] = useState('');

  // Post-session
  const [pending, setPending] = useState<PendingSession | null>(null);
  const [overview, setOverview] = useState('');
  const [saving, setSaving] = useState(false);

  // Share
  const [showShare, setShowShare] = useState(false);

  // ── Load stats + streak ────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [sRes, stRes] = await Promise.all([
        fetch('/api/reading?range=30'),
        fetch('/api/streak'),
      ]);
      if (sRes.ok)  setStats(await sRes.json());
      if (stRes.ok) setStreak(await stRes.json());
    } catch {}
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Passive timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (passiveRunning) {
      passiveInterval.current = setInterval(() => setPassiveElapsed(e => e + 1), 1000);
    } else {
      if (passiveInterval.current) clearInterval(passiveInterval.current);
    }
    return () => { if (passiveInterval.current) clearInterval(passiveInterval.current); };
  }, [passiveRunning]);

  function startPassive() {
    if (!passiveTitle.trim()) { toast.error('Enter a book or material title'); return; }
    setPassiveElapsed(0);
    setPassiveRunning(true);
    setMode('passive_running');
  }

  function stopPassive() {
    setPassiveRunning(false);
    setPending({
      type: 'passive', elapsed: passiveElapsed,
      pagesRead: 0, totalPages: 0, bookType: 'PASSIVE',
      title: passiveTitle, overview: '',
    });
    setMode('passive_done');
  }

  // ── Active reading: file chosen → launch reader ────────────────────────
  function startActiveReading() {
    if (!activeFile) { toast.error('Please select a file to read'); return; }
    setMode('active_reading');
  }

  // ── ActiveReader finished ──────────────────────────────────────────────
  function handleReaderClose(data: ReaderCloseData) {
    setPending({
      type: 'active',
      elapsed: data.elapsed,
      pagesRead: data.pagesRead,
      totalPages: data.totalPages,
      bookType: data.bookType,
      title: activeTitle || activeFile?.name || 'Unknown',
      overview: '',
    });
    setMode('active_done');
  }

  // ── Save session ───────────────────────────────────────────────────────
  async function saveSession() {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       pending.title || null,
          sessionType: pending.type,
          durationSec: pending.elapsed,
          pagesRead:   pending.pagesRead,
          totalPages:  pending.totalPages,
          bookType:    pending.bookType,
          overview:    overview || null,
          date:        dayjs().format('YYYY-MM-DD'),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Session saved — ${formatTime(pending.elapsed)} of reading!`);
      setMode('idle');
      setPending(null);
      setOverview('');
      setPassiveTitle('');
      setPassiveElapsed(0);
      setActiveFile(null);
      setActiveTitle('');
      loadStats();
    } catch {
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  }

  function discardSession() {
    setMode('idle');
    setPending(null);
    setOverview('');
    setPassiveElapsed(0);
  }

  // ── If in active reading mode, render full-screen reader ───────────────
  if (mode === 'active_reading' && activeFile) {
    return <ActiveReader file={activeFile} title={activeTitle} onClose={handleReaderClose} />;
  }

  // ─── Today ─────────────────────────────────────────────────────────────
  const todayKey  = dayjs().format('YYYY-MM-DD');
  const todaySec  = stats?.byDay[todayKey] || 0;
  const totalSec  = stats?.totalSec || 0;
  const sessions  = stats?.sessions || [];

  return (
    <div>
      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {/* Top row: 2 big cards */}
        {[
          {
            icon: 'fa-solid fa-clock-rotate-left',
            label: 'Total this month',
            value: statsLoading ? '…' : formatShort(totalSec),
            sub: `across ${sessions.length} sessions`,
            color: '#FF6B35',
            bg: 'rgba(255,107,53,0.06)',
          },
          {
            icon: 'fa-solid fa-sun',
            label: 'Read today',
            value: statsLoading ? '…' : (todaySec > 0 ? formatShort(todaySec) : '0m'),
            sub: todaySec > 0 ? 'keep going!' : 'no reading yet today',
            color: '#FFD43B',
            bg: 'rgba(255,212,59,0.06)',
          },
        ].map(({ icon, label, value, sub, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              <i className={icon} style={{ fontSize: 12, color }} /> {label}
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom stat row: 3 smaller */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          {
            icon: 'fa-solid fa-file-lines',
            label: 'Pages read (month)',
            value: statsLoading ? '…' : `${sessions.reduce((a: number, s: any) => a + (s.pagesRead || 0), 0)}`,
            color: '#74C0FC',
          },
          {
            icon: 'fa-solid fa-fire',
            label: 'Streak',
            value: statsLoading ? '…' : `${streak?.current || 0} days`,
            color: '#F5A623',
          },
          {
            icon: 'fa-solid fa-layer-group',
            label: 'Books tracked',
            value: statsLoading ? '…' : `${new Set(sessions.map((s: any) => s.title).filter(Boolean)).size}`,
            color: '#69DB7C',
          },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <i className={icon} style={{ fontSize: 11, color }} /> {label}
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── 30-day heatmap ── */}
      {!statsLoading && stats && (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>
              <i className="fa-solid fa-chart-simple" style={{ fontSize: 12, color: 'var(--accent2)' }} />
              30-day activity
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: 'var(--text3)' }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--surface2)', border: '0.5px solid var(--border)' }} />
              None
              <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(55,138,221,0.4)', marginLeft: 8 }} />
              Some
              <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(55,138,221,0.9)', marginLeft: 4 }} />
              Heavy
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Array.from({ length: 30 }, (_, i) => {
              const date = dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD');
              const sec = stats.byDay[date] || 0;
              const intensity = Math.min(1, sec / 3600);
              const isToday = date === todayKey;
              return (
                <div
                  key={date}
                  title={`${dayjs(date).format('D MMM')}: ${formatShort(sec)}`}
                  style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: sec === 0 ? 'var(--surface2)' : `rgba(55,138,221,${0.2 + intensity * 0.75})`,
                    border: isToday ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                    cursor: 'default', transition: 'transform 0.1s',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Session controls (AnimatePresence modes) ── */}
      <AnimatePresence mode="wait">

        {/* ───── IDLE ───── */}
        {mode === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="fa-solid fa-plus" style={{ fontSize: 11, color: 'var(--accent)' }} />
              Start a new reading session
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <ModeCard
                icon="fa-solid fa-stopwatch"
                title="Reading Timer"
                desc="Track time while reading a physical book or anywhere"
                color="#F5A623"
                bg="rgba(245,166,35,0.04)"
                borderColor="rgba(245,166,35,0.2)"
                onClick={() => setMode('passive_setup')}
              />
              <ModeCard
                icon="fa-solid fa-book-open-reader"
                title="Active Reading"
                desc="Upload PDF or TXT — read inside the app with page tracking"
                color="#FF6B35"
                bg="rgba(255,107,53,0.04)"
                borderColor="rgba(255,107,53,0.2)"
                onClick={() => setMode('active_setup')}
              />
            </div>

            {/* Share stats button */}
            {sessions.length > 0 && (
              <button className="btn" style={{ width: '100%', justifyContent: 'center', gap: 8, borderStyle: 'dashed' }}
                onClick={() => setShowShare(true)}>
                <i className="fa-solid fa-share-nodes" style={{ fontSize: 13, color: 'var(--accent)' }} />
                Share my reading stats
              </button>
            )}

            {/* Recent sessions */}
            {sessions.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 12, color: 'var(--text3)' }} />
                  Recent sessions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sessions.slice(0, 5).map((s: any) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: s.sessionType === 'active' ? 'rgba(255,107,53,0.1)' : 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={s.sessionType === 'active' ? 'fa-solid fa-book-open' : 'fa-solid fa-stopwatch'} style={{ fontSize: 13, color: s.sessionType === 'active' ? 'var(--accent)' : '#F5A623' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.title || 'Untitled session'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{dayjs(s.date).format('D MMM')}</span>
                          {s.bookType && (
                            <span style={{ background: 'var(--surface2)', padding: '0 5px', borderRadius: 4, border: '0.5px solid var(--border)' }}>{s.bookType}</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{formatShort(s.durationSec)}</div>
                        {s.pagesRead > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <i className="fa-solid fa-file-lines" style={{ fontSize: 9 }} /> {s.pagesRead} pages
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ───── PASSIVE SETUP ───── */}
        {mode === 'passive_setup' && (
          <motion.div key="passive_setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <i className="fa-solid fa-stopwatch" style={{ fontSize: 18, color: '#F5A623' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)' }}>Reading Timer</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Track time for any reading</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  <i className="fa-solid fa-book" style={{ fontSize: 11 }} /> Book / material title
                </div>
                <input className="form-input" value={passiveTitle} onChange={e => setPassiveTitle(e.target.value)} placeholder="e.g. Atomic Habits" onKeyDown={e => e.key === 'Enter' && startPassive()} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('idle')}>
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Back
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={startPassive}>
                  <i className="fa-solid fa-play" style={{ fontSize: 12 }} /> Start timer
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───── PASSIVE RUNNING ───── */}
        {mode === 'passive_running' && (
          <motion.div key="passive_running" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: `1px solid ${passiveRunning ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: passiveRunning ? '0 0 0 3px rgba(255,107,53,0.08)' : 'none' }}>
              {passiveTitle && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
                  <i className="fa-solid fa-bookmark" style={{ fontSize: 12, color: '#F5A623' }} />
                  {passiveTitle}
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 58, fontWeight: 900, color: passiveRunning ? 'var(--accent)' : 'var(--text3)', marginBottom: 6, letterSpacing: '-2px', lineHeight: 1 }}>
                {formatTime(passiveElapsed)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <i className={`fa-solid fa-circle${passiveRunning ? '' : '-pause'}`} style={{ fontSize: 8, color: passiveRunning ? 'var(--accent3)' : 'var(--text3)' }} />
                {passiveRunning ? 'Reading in progress' : 'Paused'}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-primary" style={{ gap: 8, minWidth: 110 }} onClick={() => setPassiveRunning(r => !r)}>
                  {passiveRunning
                    ? <><Pause size={15} /> Pause</>
                    : <><Play size={15} /> Resume</>
                  }
                </button>
                <button className="btn" style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)', gap: 8 }} onClick={stopPassive}>
                  <Square size={14} /> Stop
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───── ACTIVE SETUP ───── */}
        {mode === 'active_setup' && (
          <motion.div key="active_setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <i className="fa-solid fa-book-open-reader" style={{ fontSize: 18, color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)' }}>Active Reading</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Read inside the app with full tracking</div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  <i className="fa-solid fa-tag" style={{ fontSize: 11 }} /> Book title (optional)
                </div>
                <input className="form-input" value={activeTitle} onChange={e => setActiveTitle(e.target.value)} placeholder="Auto-detected from filename" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  <i className="fa-solid fa-upload" style={{ fontSize: 11 }} /> Upload file to read
                </div>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '24px 16px', borderRadius: 10, border: `2px dashed ${activeFile ? 'var(--accent)' : 'var(--border2)'}`,
                  background: activeFile ? 'rgba(255,107,53,0.04)' : 'var(--surface2)', cursor: 'pointer',
                  transition: 'all 0.2s', gap: 8,
                }}>
                  <i className={activeFile ? 'fa-solid fa-file-check' : 'fa-solid fa-cloud-arrow-up'}
                    style={{ fontSize: 28, color: activeFile ? 'var(--accent3)' : 'var(--text3)' }} />
                  {activeFile ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent3)' }}>{activeFile.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {(activeFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Click to upload</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>PDF, TXT, or EPUB supported</div>
                    </>
                  )}
                  <input type="file" accept=".pdf,.txt,.epub,.md" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setActiveFile(f);
                        if (!activeTitle.trim()) {
                          setActiveTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                        }
                      }
                    }}
                  />
                </label>
              </div>

              {/* Format chips */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { fmt: 'PDF', icon: 'fa-solid fa-file-pdf', color: '#FF8787' },
                  { fmt: 'TXT', icon: 'fa-solid fa-file-lines', color: '#74C0FC' },
                  { fmt: 'EPUB', icon: 'fa-solid fa-book', color: '#69DB7C' },
                ].map(({ fmt, icon, color }) => (
                  <div key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--surface2)', border: '0.5px solid var(--border)', fontSize: 11 }}>
                    <i className={icon} style={{ fontSize: 10, color }} /> {fmt}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMode('idle')}>
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Back
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', gap: 7 }} onClick={startActiveReading} disabled={!activeFile}>
                  <i className="fa-solid fa-book-open-reader" style={{ fontSize: 13 }} /> Open reader
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ───── DONE (passive or active) ───── */}
        {(mode === 'passive_done' || mode === 'active_done') && pending && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--surface)', border: '0.5px solid rgba(45,203,122,0.3)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(45,203,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: 22, color: 'var(--accent3)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-head)' }}>Session complete!</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{pending.title}</div>
                </div>
              </div>

              {/* Session summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: pending.type === 'active' ? 'repeat(3, 1fr)' : '1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', background: 'rgba(45,203,122,0.06)', borderRadius: 10, padding: '14px 8px', border: '1px solid rgba(45,203,122,0.2)' }}>
                  <i className="fa-solid fa-clock" style={{ fontSize: 20, color: 'var(--accent3)', marginBottom: 6, display: 'block' }} />
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--accent3)' }}>{formatTime(pending.elapsed)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Time read</div>
                </div>
                {pending.type === 'active' && (
                  <>
                    <div style={{ textAlign: 'center', background: 'rgba(116,192,252,0.06)', borderRadius: 10, padding: '14px 8px', border: '1px solid rgba(116,192,252,0.2)' }}>
                      <i className="fa-solid fa-file-lines" style={{ fontSize: 20, color: '#74C0FC', marginBottom: 6, display: 'block' }} />
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#74C0FC' }}>{pending.pagesRead}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Pages read</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,169,77,0.06)', borderRadius: 10, padding: '14px 8px', border: '1px solid rgba(255,169,77,0.2)' }}>
                      <i className="fa-solid fa-book" style={{ fontSize: 20, color: '#FFA94D', marginBottom: 6, display: 'block' }} />
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: '#FFA94D' }}>{pending.bookType}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Format</div>
                    </div>
                  </>
                )}
              </div>

              {/* Overview textarea */}
              <div style={{ marginBottom: 14 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  <i className="fa-solid fa-pen-to-square" style={{ fontSize: 11 }} /> Quick overview / notes (optional)
                </div>
                <textarea
                  className="form-input"
                  rows={3}
                  value={overview}
                  onChange={e => setOverview(e.target.value)}
                  placeholder="Key takeaways, what you read about…"
                  style={{ resize: 'vertical', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={discardSession}>
                  <i className="fa-solid fa-trash" style={{ fontSize: 11 }} /> Discard
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', gap: 7 }} onClick={saveSession} disabled={saving}>
                  {saving
                    ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                    : <><i className="fa-solid fa-floppy-disk" style={{ fontSize: 12 }} /> Save session</>
                  }
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Share card modal ── */}
      <AnimatePresence>
        {showShare && stats && (
          <ShareCard
            stats={stats}
            streak={streak || undefined}
            bookName={sessions[0]?.title || undefined}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}