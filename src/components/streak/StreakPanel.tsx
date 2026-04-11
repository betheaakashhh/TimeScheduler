'use client';
// src/components/streak/StreakPanel.tsx
import { useEffect, useRef } from 'react';
import { Streak } from '@/types';

interface Props {
  streak: Streak | null;
  atRisk?: boolean;
  compact?: boolean;
}

export default function StreakPanel({ streak, atRisk = false, compact = false }: Props) {
  const current = streak?.current || 0;
  const best = streak?.best || 0;
  const pct = best > 0 ? Math.min(100, Math.round((current / best) * 100)) : current > 0 ? 100 : 0;

  // Milestone badge
  const milestone = [100, 60, 30, 21, 14, 7].find((m) => current >= m);
  const milestoneLabel = milestone
    ? { 7: '1 Week!', 14: '2 Weeks!', 21: '3 Weeks!', 30: '1 Month!', 60: '2 Months!', 100: '100 Days!' }[milestone]
    : null;

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🌞</span>
        <div>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: 'var(--accent4)' }}>{current}</span>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>day streak</span>
        </div>
        {atRisk && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(226,75,74,0.12)', color: '#A32D2D', fontWeight: 600 }}>⚠️ At risk</span>}
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8E1 0%, #FFF3E0 100%)',
      border: '0.5px solid rgba(245,166,35,0.25)',
      borderRadius: 'var(--r2)', padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ fontSize: 32, display: 'block', lineHeight: 1 }}>🌞</span>
          {atRisk && (
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 14, height: 14, borderRadius: '50%', background: '#E24B4A',
              border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: 'white', fontWeight: 700,
            }}>!</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 800, color: 'var(--accent4)', lineHeight: 1 }}>{current}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)' }}>day streak</span>
          </div>
          {milestoneLabel && (
            <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,166,35,0.2)', color: '#854F0B', fontWeight: 700, display: 'inline-block', marginTop: 4 }}>
              🏆 {milestoneLabel}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Personal best</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, color: 'var(--text2)' }}>👑 {best}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ height: 6, marginBottom: 6 }}>
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: pct >= 100 ? 'var(--accent3)' : atRisk ? '#E24B4A' : 'var(--accent4)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
        <span>{current} / {best} days (personal best)</span>
        {atRisk
          ? <span style={{ color: '#E24B4A', fontWeight: 600 }}>⚠️ Complete tasks to save it!</span>
          : <span>Keep going! 🔥</span>
        }
      </div>

      {/* Next milestone */}
      {!atRisk && (() => {
        const next = [7, 14, 21, 30, 60, 100].find((m) => m > current);
        if (!next) return null;
        return (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
            <span style={{ color: 'var(--accent4)', fontWeight: 600 }}>{next - current} more days</span> to reach {
              { 7: '1 week 🗓️', 14: '2 weeks 💪', 21: '3 weeks 🏆', 30: '1 month 🌟', 60: '2 months 💎', 100: '100 days 👑' }[next]
            }
          </div>
        );
      })()}
    </div>
  );
}
