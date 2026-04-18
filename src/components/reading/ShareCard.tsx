'use client';
// src/components/reading/ShareCard.tsx
// Generates a beautiful shareable reading-stats card.
// Badges use FA icons (CDN already loaded).
// Download uses html2canvas (loaded from CDN on demand).
// Share uses Web Share API if available.

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

interface StatsData {
  totalSec: number;
  sessions: any[];
  byDay: Record<string, number>;
}

interface Props {
  stats: StatsData;
  streak?: { current: number; best: number };
  bookName?: string;
  onClose: () => void;
}

// ─── Badge definitions ────────────────────────────────────────────────────────
const BADGES = [
  {
    id: 'first_read',
    label: 'First Chapter',
    icon: 'fa-solid fa-book',
    color: '#748FFC',
    bg: 'rgba(116,143,252,0.15)',
    condition: (s: StatsData) => s.sessions.length >= 1,
    desc: 'Started your reading journey',
  },
  {
    id: 'consistent',
    label: 'Consistent',
    icon: 'fa-solid fa-calendar-check',
    color: '#69DB7C',
    bg: 'rgba(105,219,124,0.15)',
    condition: (s: StatsData) => Object.keys(s.byDay).length >= 5,
    desc: '5+ reading days',
  },
  {
    id: 'bookworm',
    label: 'Bookworm',
    icon: 'fa-solid fa-worm',
    color: '#FF8787',
    bg: 'rgba(255,135,135,0.15)',
    condition: (s: StatsData) => s.totalSec >= 36000, // 10 hrs
    desc: '10+ hours total',
  },
  {
    id: 'scholar',
    label: 'Scholar',
    icon: 'fa-solid fa-graduation-cap',
    color: '#FFD43B',
    bg: 'rgba(255,212,59,0.15)',
    condition: (s: StatsData) => s.totalSec >= 180000, // 50 hrs
    desc: '50+ hours total',
  },
  {
    id: 'speedster',
    label: 'Speed Reader',
    icon: 'fa-solid fa-bolt',
    color: '#FFA94D',
    bg: 'rgba(255,169,77,0.15)',
    condition: (s: StatsData) => s.sessions.some((ss: any) => ss.durationSec >= 7200), // 2hr session
    desc: '2h+ in one session',
  },
  {
    id: 'night_owl',
    label: 'Night Owl',
    icon: 'fa-solid fa-moon',
    color: '#845EF7',
    bg: 'rgba(132,94,247,0.15)',
    condition: (s: StatsData) => s.sessions.length >= 10,
    desc: '10+ sessions',
  },
  {
    id: 'champion',
    label: 'Champion',
    icon: 'fa-solid fa-trophy',
    color: '#FF6B35',
    bg: 'rgba(255,107,53,0.15)',
    condition: (s: StatsData) => s.totalSec >= 360000, // 100 hrs
    desc: '100+ hours total',
  },
  {
    id: 'library',
    label: 'Library',
    icon: 'fa-solid fa-layer-group',
    color: '#74C0FC',
    bg: 'rgba(116,192,252,0.15)',
    condition: (s: StatsData) => {
      const books = new Set(s.sessions.map((ss: any) => ss.title).filter(Boolean));
      return books.size >= 5;
    },
    desc: '5+ unique books',
  },
];

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function loadHtml2Canvas(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function ShareCard({ stats, streak, bookName, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const earnedBadges = BADGES.filter(b => b.condition(stats));
  const totalDays = Object.keys(stats.byDay).length;
  const uniqueBooks = new Set(stats.sessions.map((s: any) => s.title).filter(Boolean)).size;

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await loadHtml2Canvas();
      const canvas = await window.html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#12120F',
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = 'reading-stats.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      await loadHtml2Canvas();
      const canvas = await window.html2canvas(cardRef.current, {
        scale: 2, backgroundColor: '#12120F', logging: false, useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'reading-stats.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `My Reading Stats`,
            text: `I spent ${formatTime(stats.totalSec)} reading across ${totalDays} days! 📚`,
            files: [file],
          });
        } else {
          // Fallback: open in new tab
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      });
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyText() {
    const text = [
      `📚 My Reading Stats`,
      `⏱ Total time: ${formatTime(stats.totalSec)}`,
      `📅 Reading days: ${totalDays}`,
      bookName ? `📖 Currently reading: ${bookName}` : '',
      `🏆 Sessions: ${stats.sessions.length}`,
      earnedBadges.length > 0 ? `🎖 Badges: ${earnedBadges.map(b => b.label).join(', ')}` : '',
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Share Reading Stats</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Download or share your reading card</div>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* ─── The shareable card ─── */}
        <div
          ref={cardRef}
          style={{
            background: 'linear-gradient(135deg, #1A1208 0%, #12120F 40%, #0A1520 100%)',
            borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden',
            border: '1px solid rgba(255,107,53,0.2)',
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(55,138,221,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Top: icon + branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-book-open-reader" style={{ fontSize: 18, color: '#FF6B35' }} />
            </div>
            <div>
              <div style={{ color: '#F0EFE8', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-head)' }}>Reading Journey</div>
              <div style={{ color: '#666660', fontSize: 11 }}>My personal reading stats</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <i className="fa-solid fa-quote-right" style={{ fontSize: 28, color: 'rgba(255,107,53,0.15)' }} />
            </div>
          </div>

          {/* Book name */}
          {bookName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <i className="fa-solid fa-bookmark" style={{ fontSize: 13, color: '#FFA94D' }} />
              <span style={{ color: '#A8A79E', fontSize: 12 }}>Currently reading:</span>
              <span style={{ color: '#F0EFE8', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-head)' }}>{bookName}</span>
            </div>
          )}

          {/* Main stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
            {[
              { icon: 'fa-solid fa-clock', label: 'Total Time', value: formatTime(stats.totalSec), color: '#FF6B35', glow: 'rgba(255,107,53,0.12)' },
              { icon: 'fa-solid fa-calendar-days', label: 'Reading Days', value: `${totalDays}`, color: '#69DB7C', glow: 'rgba(105,219,124,0.12)' },
              { icon: 'fa-solid fa-layer-group', label: 'Sessions', value: `${stats.sessions.length}`, color: '#74C0FC', glow: 'rgba(116,192,252,0.12)' },
            ].map(({ icon, label, value, color, glow }) => (
              <div key={label} style={{ textAlign: 'center', background: glow, borderRadius: 12, padding: '16px 8px', border: `1px solid ${color}22` }}>
                <i className={icon} style={{ fontSize: 22, color, marginBottom: 8, display: 'block' }} />
                <div style={{ color: '#F0EFE8', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-head)', lineHeight: 1 }}>{value}</div>
                <div style={{ color: '#666660', fontSize: 10, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Streak row */}
          {streak && streak.current > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(245,166,35,0.08)', borderRadius: 10, border: '1px solid rgba(245,166,35,0.2)', marginBottom: 18 }}>
              <i className="fa-solid fa-fire" style={{ fontSize: 20, color: '#F5A623' }} />
              <div>
                <div style={{ color: '#F5A623', fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-head)', lineHeight: 1 }}>{streak.current} day streak</div>
                <div style={{ color: '#666660', fontSize: 10 }}>Best: {streak.best} days</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {Array.from({ length: Math.min(7, streak.current) }).map((_, i) => (
                  <i key={i} className="fa-solid fa-fire" style={{ fontSize: 12, color: i < streak.current ? '#F5A623' : '#2E2E28', opacity: 0.8 }} />
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {earnedBadges.length > 0 && (
            <div>
              <div style={{ color: '#666660', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Achievements
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {earnedBadges.map(badge => (
                  <div key={badge.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 20, background: badge.bg, border: `1px solid ${badge.color}33` }}>
                    <i className={badge.icon} style={{ fontSize: 13, color: badge.color }} />
                    <span style={{ color: '#F0EFE8', fontSize: 12, fontWeight: 600 }}>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked badges hint */}
          {earnedBadges.length < BADGES.length && (
            <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {BADGES.filter(b => !b.condition(stats)).slice(0, 4).map(badge => (
                <div key={badge.id} title={`Locked: ${badge.desc}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.4 }}>
                  <i className="fa-solid fa-lock" style={{ fontSize: 9, color: '#666660' }} />
                  <i className={badge.icon} style={{ fontSize: 11, color: '#666660' }} />
                  <span style={{ color: '#666660', fontSize: 10 }}>{badge.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#444440', fontSize: 10 }}>📚 Reading Tracker</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {uniqueBooks > 0 && (
                <div style={{ color: '#444440', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fa-solid fa-books" style={{ fontSize: 9 }} />
                  {uniqueBooks} book{uniqueBooks !== 1 ? 's' : ''} read
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
          <button className="btn btn-primary" style={{ justifyContent: 'center', gap: 7 }} onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <i className="fa-solid fa-download" style={{ fontSize: 12 }} />}
            {downloading ? 'Saving…' : 'Download'}
          </button>

          <button className="btn" style={{ justifyContent: 'center', gap: 7, background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', color: 'white', borderColor: 'transparent' }}
            onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <i className="fa-brands fa-instagram" style={{ fontSize: 13 }} />}
            {sharing ? 'Sharing…' : 'Share'}
          </button>

          <button className="btn" style={{ justifyContent: 'center', gap: 7 }} onClick={handleCopyText}>
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ fontSize: 12, color: copied ? 'var(--accent3)' : undefined }} />
            {copied ? 'Copied!' : 'Copy text'}
          </button>
        </div>

        {/* Social hints */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: 'fa-brands fa-x-twitter', label: 'X (Twitter)', color: '#000' },
            { icon: 'fa-brands fa-whatsapp', label: 'WhatsApp', color: '#25D366' },
            { icon: 'fa-brands fa-linkedin', label: 'LinkedIn', color: '#0A66C2' },
          ].map(({ icon, label, color }) => (
            <button key={label} className="btn btn-sm" style={{ gap: 5, fontSize: 11 }}
              onClick={async () => {
                await loadHtml2Canvas();
                const canvas = await window.html2canvas(cardRef.current!, { scale: 2, backgroundColor: '#12120F', logging: false });
                canvas.toBlob((blob) => {
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                });
              }}>
              <i className={icon} style={{ fontSize: 12, color }} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 10 }}>
          Download the image, then post it manually on social media
        </div>
      </motion.div>
    </div>
  );
}