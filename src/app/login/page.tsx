'use client';
// src/app/login/page.tsx
// Stack: Next.js 14 · TypeScript · Framer Motion · Lucide React · NextAuth · react-hot-toast
// Responsive: sidebar on desktop, Android-style bottom nav on mobile/tablet
// Theme: dark/light toggle, CSS vars from globals.css

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  motion, AnimatePresence,
  useMotionValue, useSpring,
  type Variants,
} from 'framer-motion';
import {
  type LucideIcon,
  Activity, LayoutDashboard, Monitor, Star,
  Users, Info, Mail, Lock, Eye, EyeOff,
  Loader2, LogIn, Wifi, Sun, Moon,
  Smartphone, RefreshCw, TrendingUp, ShieldCheck,
  Zap, CheckCircle2, Calendar, FileSpreadsheet,
  ChevronRight, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TermsPrivacyPanel, { type LegalDoc } from '@/components/term/TermsPrivacyPanel';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type NavId = 'home' | 'product' | 'features' | 'company' | 'about';

interface NavItem {
  id: NavId;
  label: string;
  Icon: LucideIcon;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  { id: 'home',     label: 'Home',     Icon: LayoutDashboard },
  { id: 'product',  label: 'Product',  Icon: Monitor         },
  { id: 'features', label: 'Features', Icon: Star            },
  { id: 'company',  label: 'Company',  Icon: Users           },
  { id: 'about',    label: 'About',    Icon: Info            },
];

// Framer Motion shared variants
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 28 } },
};

const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  show:   { opacity: 1, x: 0,  transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show:   { opacity: 1, scale: 1,  transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────
function useClock(): string | null {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () => {
      const n = new Date();
      let h = n.getHours();
      const m = n.getMinutes(), s = n.getSeconds();
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ap}`;
    };
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return { dark, toggle: () => setDark(v => !v) };
}

// ─────────────────────────────────────────────────────────────────
// AUTH CARD
// ─────────────────────────────────────────────────────────────────
interface AuthCardProps {
  onOpenLegal: (doc: LegalDoc) => void;
}

function AuthCard({ onOpenLegal }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode]     = useState<'login' | 'register'>('login');
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [name, setName]     = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(
            d?.error ?? d?.fieldErrors?.password?.[0] ?? d?.fieldErrors?.email?.[0] ?? 'Registration failed'
          );
        }
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) throw new Error('Invalid email or password');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        background: 'rgba(28,28,24,0.85)',
        border: '0.5px solid rgba(255,255,255,0.13)',
        borderRadius: 'var(--r)',
        padding: 22,
        width: '100%',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      // light mode override via data-theme attribute on html
    >
      {/* Mode tabs */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--surface2)',
        borderRadius: 8, padding: 3, marginBottom: 18,
      }}>
        {(['login', 'register'] as const).map(m => (
          <motion.button
            key={m}
            onClick={() => setMode(m)}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 6,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: mode === m ? 'var(--surface3)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--text3)',
              border: 'none', transition: 'all 0.18s',
              fontFamily: 'var(--font-body)', textTransform: 'capitalize',
            }}
          >
            {m}
          </motion.button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence>
          {mode === 'register' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 10 }}
            >
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                style={{ background: 'rgba(36,36,32,0.8)' }}
                type="text" placeholder="Aathiya"
                value={name} onChange={e => setName(e.target.value)} required
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginBottom: 10 }}>
          <label className="form-label"><Mail size={13} /> Email</label>
          <input
            className="form-input"
            style={{ background: 'rgba(36,36,32,0.8)' }}
            type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label"><Lock size={13} /> Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              style={{ background: 'rgba(36,36,32,0.8)', paddingRight: 38 }}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password} onChange={e => setPass(e.target.value)}
              minLength={8} required
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text3)',
                display: 'flex', alignItems: 'center',
              }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <motion.button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', height: 40, justifyContent: 'center' }}
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </motion.button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
        <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>or</span>
        <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
      </div>

      <motion.button
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="btn"
        style={{
          width: '100%', height: 40, justifyContent: 'center',
          gap: 10, background: 'var(--surface2)',
          border: '0.5px solid var(--border2)',
        }}
        whileHover={{ background: 'var(--surface3)' }}
        whileTap={{ scale: 0.98 }}
      >
        <svg viewBox="0 0 24 24" width="15" height="15">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </motion.button>

      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>
        By continuing you agree to our{' '}
        <button onClick={() => onOpenLegal('terms')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'var(--font-body)' }}>Terms</button>
        {' '}and{' '}
        <button onClick={() => onOpenLegal('privacy')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'var(--font-body)' }}>Privacy</button>
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOME SECTION
// ─────────────────────────────────────────────────────────────────
function HomeSection({ onOpenLegal }: { onOpenLegal: (doc: LegalDoc) => void }) {
  const cards = [
    {
      icon: <CheckCircle2 size={15} color="#2DCB7A" />,
      bg: 'rgba(45,203,122,0.15)',
      title: 'Task completed',
      body: (
        <>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Morning study session — 2h 15m</p>
        </>
      ),
      badge: (
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(45,203,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle2 size={10} color="#2DCB7A" />
        </div>
      ),
    },
    {
      icon: <span style={{ fontSize: 15 }}>🔥</span>,
      bg: 'rgba(255,107,53,0.15)',
      title: '14-day streak',
      body: (
        <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              variants={scaleIn}
              custom={i}
              style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent)' }}
            />
          ))}
        </div>
      ),
    },
    {
      icon: <Calendar size={15} color="#4A90D9" />,
      bg: 'rgba(74,144,217,0.15)',
      title: 'Timetable created',
      body: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'var(--accent2)', borderRadius: 2 }}
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ duration: 1.6, ease: 'easeOut', delay: 0.6 }}
            />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>6/8 slots</span>
        </div>
      ),
    },
    {
      icon: <FileSpreadsheet size={15} color="#F5A623" />,
      bg: 'rgba(245,166,35,0.15)',
      title: 'Academic CSV imported',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 5 }}>
          {[{ w: '90%', c: 'rgba(245,166,35,0.5)', d: 0.7 }, { w: '65%', c: 'rgba(74,144,217,0.4)', d: 0.9 }, { w: '80%', c: 'rgba(45,203,122,0.4)', d: 1.1 }].map((r, i) => (
            <motion.div
              key={i}
              style={{ height: 4, borderRadius: 2, background: r.c }}
              initial={{ width: 0 }}
              animate={{ width: r.w }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: r.d }}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100dvh - 60px)' }} className="home-wrap">
      {/* LEFT HERO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
        {/* Floating blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[
            { w: 200, h: 110, top: 50, right: 40, rot: -8, dur: 6, del: 0 },
            { w: 130, h: 75, bottom: 90, left: 10, rot: 5, dur: 7, del: 0.5 },
            { w: 90,  h: 90, top: 200, left: 50, rot: 0, dur: 5, del: 1, round: true },
            { w: 60,  h: 60, bottom: 160, right: 80, rot: 0, dur: 8, del: 2, round: true, accent: true },
          ].map((b, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: b.w, height: b.h,
                top: (b as { top?: number }).top, right: (b as { right?: number }).right,
                bottom: (b as { bottom?: number }).bottom, left: (b as { left?: number }).left,
                borderRadius: b.round ? '50%' : 18,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `0.5px solid ${b.accent ? 'rgba(74,144,217,0.15)' : 'rgba(255,255,255,0.09)'}`,
                background: b.accent ? 'rgba(74,144,217,0.04)' : 'rgba(255,255,255,0.025)',
                rotate: b.rot,
              }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: b.dur, delay: b.del, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        <motion.div
          style={{ position: 'relative', zIndex: 1 }}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Badge */}
          <motion.div variants={fadeUp}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,107,53,0.15)',
              border: '0.5px solid rgba(255,107,53,0.3)',
              color: 'var(--accent)', fontSize: 11, fontWeight: 600,
              padding: '4px 10px', borderRadius: 20, marginBottom: 16,
            }}>
              <motion.span
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent3)', display: 'inline-block' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              Now in public beta
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            style={{
              fontFamily: 'var(--font-head)', fontSize: 'clamp(26px,4.5vw,36px)',
              fontWeight: 800, lineHeight: 1.15, letterSpacing: -1,
              marginBottom: 12, color: 'var(--text)',
            }}
          >
            Your day,<br />
            perfectly in <span style={{ color: 'var(--accent)' }}>rhythm</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24, maxWidth: 360 }}
          >
            Smart timetable manager that adapts to your routine — tracking slots, streaks, and study time so you never lose the beat.
          </motion.p>

          {/* Animated mini-cards */}
          <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cards.map((c, i) => (
              <motion.div
                key={i}
                variants={slideLeft}
                custom={i}
                whileHover={{ x: 4, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
                style={{
                  background: 'rgba(28,28,24,0.65)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '11px 14px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {c.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.title}</p>
                  {c.body}
                </div>
                {c.badge}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* RIGHT AUTH PANEL */}
      <div style={{
        width: 330, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
        background: 'var(--surface)',
        borderLeft: '0.5px solid var(--border)',
      }} className="auth-panel">
        <div style={{ width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 28 }}
            style={{ textAlign: 'center', marginBottom: 20 }}
          >
            <motion.div
              style={{
                width: 46, height: 46, background: 'var(--accent)',
                borderRadius: 12, display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 10px',
              }}
              whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.4 } }}
            >
              <Activity size={24} color="white" strokeWidth={2.5} />
            </motion.div>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Timedule</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Smart daily timetable manager</p>
          </motion.div>
          <AuthCard onOpenLegal={onOpenLegal} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRODUCT SECTION
// ─────────────────────────────────────────────────────────────────
function ProductSection() {
  const activities = [
    { color: '#2DCB7A', label: '6 AM · Jog',   jog: true  },
    { color: '#4A90D9', label: '8 AM · Study',  jog: false },
    { color: '#F5A623', label: '1 PM · Lunch',  jog: false },
    { color: '#FF6B35', label: '7 PM · Dinner', jog: false },
  ];

  const timelineItems = [
    { color: '#2DCB7A', name: 'Morning jog',   time: '06:00 – 07:00 AM', pct: 1.0  },
    { color: '#4A90D9', name: 'Study session', time: '08:00 – 11:00 AM', pct: 0.78 },
    { color: '#F5A623', name: 'Lunch break',   time: '01:00 – 01:30 PM', pct: 0.52 },
    { color: '#FF6B35', name: 'Dinner',        time: '07:00 – 07:30 PM', pct: 0.30 },
  ];

  const graphDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const graphVals = [70, 55, 85, 40, 90, 30, 60];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ padding: '24px 28px' }}
      className="section-pad"
    >
      <motion.div variants={fadeUp}>
        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, background: 'rgba(255,107,53,0.15)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
          Product
        </span>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, letterSpacing: -0.4, marginBottom: 8, color: 'var(--text)' }}>
          Built around your daily rhythm
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 20, maxWidth: 440 }}>
          Watch how Timedule guides your day — from morning jog to study sessions to dinner.
        </p>
      </motion.div>

      {/* Person scene */}
      <motion.div
        variants={fadeUp}
        style={{
          display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 20, gap: 8,
        }}
      >
        {activities.map((a, i) => (
          <motion.div
            key={a.label}
            variants={scaleIn}
            custom={i}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <svg viewBox="0 0 40 60" width="40" height="60">
              <circle cx="20" cy="10" r="8" fill={a.color} />
              <rect x="14" y="20" width="12" height="18" rx="4" fill={a.color} opacity="0.85" />
              {a.jog ? (
                <>
                  <line x1="17" y1="38" x2="10" y2="54" stroke={a.color} strokeWidth="4" strokeLinecap="round" />
                  <line x1="23" y1="38" x2="30" y2="50" stroke={a.color} strokeWidth="4" strokeLinecap="round" />
                  <line x1="14" y1="25" x2="5"  y2="32" stroke={a.color} strokeWidth="3" strokeLinecap="round" />
                  <line x1="26" y1="25" x2="35" y2="20" stroke={a.color} strokeWidth="3" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="17" y1="38" x2="15" y2="54" stroke={a.color} strokeWidth="4" strokeLinecap="round" />
                  <line x1="23" y1="38" x2="25" y2="54" stroke={a.color} strokeWidth="4" strokeLinecap="round" />
                  <line x1="14" y1="25" x2="6"  y2="30" stroke={a.color} strokeWidth="3" strokeLinecap="round" />
                  <line x1="26" y1="25" x2="34" y2="30" stroke={a.color} strokeWidth="3" strokeLinecap="round" />
                </>
              )}
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600, color: a.color, whiteSpace: 'nowrap' }}>{a.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Timeline */}
      <motion.div variants={fadeUp} style={{ position: 'relative', paddingLeft: 48, marginBottom: 20 }}>
        <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--surface3)', borderRadius: 1 }} />
        <motion.div
          style={{ position: 'absolute', left: 19, top: 0, width: 2, background: 'var(--accent)', borderRadius: 1 }}
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 3, ease: 'easeOut' }}
        />
        {timelineItems.map((it, i) => (
          <motion.div
            key={it.name}
            variants={slideLeft}
            custom={i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, position: 'relative' }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `${it.color}22`, border: `2px solid ${it.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, position: 'relative', zIndex: 1, marginLeft: -27,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: it.color }} />
            </div>
            <div style={{ flex: 1, paddingTop: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{it.time}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: it.color, borderRadius: 2 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${it.pct * 100}%` }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 + i * 0.15 }}
                  />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{Math.round(it.pct * 100)}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Weekly graph */}
      <motion.div
        variants={fadeUp}
        style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r2)', padding: '14px 16px' }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>Weekly productivity</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 56 }}>
          {graphDays.map((d, i) => (
            <div key={d + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <motion.div
                style={{
                  width: '100%',
                  background: i === 4 ? 'var(--accent)' : 'var(--surface3)',
                  borderRadius: '4px 4px 0 0',
                }}
                initial={{ height: 0 }}
                animate={{ height: Math.round(graphVals[i] * 0.56) }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 + i * 0.07 }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {graphDays.map((d, i) => (
            <div key={d + i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === 4 ? 'var(--accent)' : 'var(--text3)', fontWeight: i === 4 ? 700 : 400 }}>{d}</div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FEATURES SECTION
// ─────────────────────────────────────────────────────────────────
function FeaturesSection() {
  const [darkToggle, setDarkToggle] = useState(false);

  const feats = [
    {
      Icon: Zap, color: '#FF6B35', bg: 'rgba(255,107,53,0.15)', title: 'Slot priorities',
      desc: 'Color-coded borders for high, med, low urgency.',
      demo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[{ l: 'HIGH', c: '#E24B4A', w: 0.9, d: 0.2 }, { l: 'MED', c: '#F5A623', w: 0.62, d: 0.45 }, { l: 'LOW', c: '#4A90D9', w: 0.38, d: 0.7 }].map(p => (
            <div key={p.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: p.c, width: 26, flexShrink: 0 }}>{p.l}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: p.c, borderRadius: 3 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p.w * 100}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: p.d }}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      Icon: darkToggle ? Moon : Sun, color: '#4A90D9', bg: 'rgba(74,144,217,0.15)', title: 'Dark & light mode',
      desc: 'One click — seamlessly switches themes.',
      demo: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sun size={14} color={darkToggle ? 'var(--text3)' : '#F5A623'} />
          <motion.div
            onClick={() => setDarkToggle(v => !v)}
            style={{
              width: 38, height: 22, borderRadius: 11,
              background: darkToggle ? 'var(--accent2)' : 'var(--surface3)',
              position: 'relative', cursor: 'pointer', flexShrink: 0,
            }}
            animate={{ background: darkToggle ? '#4A90D9' : 'var(--surface3)' }}
          >
            <motion.div
              style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
              animate={{ left: darkToggle ? 19 : 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </motion.div>
          <Moon size={14} color={darkToggle ? '#4A90D9' : 'var(--text3)'} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{darkToggle ? 'Dark' : 'Light'}</span>
        </div>
      ),
    },
    {
      Icon: Smartphone, color: '#2DCB7A', bg: 'rgba(45,203,122,0.15)', title: 'Mobile first',
      desc: 'Full bottom nav — add slots on the go.',
      demo: (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 58, height: 92, border: '1.5px solid var(--border2)', borderRadius: 10, background: 'var(--surface2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ height: 11, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 3, background: 'var(--surface2)', borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: 4 }}>
              {[{ bg: 'rgba(255,107,53,0.4)', d: 0.3 }, { bg: 'var(--surface3)', d: 0.45 }, { bg: 'rgba(74,144,217,0.3)', d: 0.6 }, { bg: 'var(--surface3)', d: 0.75 }].map((s, i) => (
                <motion.div key={i} style={{ height: 9, borderRadius: 2, background: s.bg }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: s.d }} />
              ))}
            </div>
            <div style={{ height: 16, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 6px' }}>
              {['var(--accent)', 'var(--surface2)', 'var(--surface2)', 'var(--surface2)'].map((c, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      Icon: RefreshCw, color: '#F5A623', bg: 'rgba(245,166,35,0.15)', title: 'Recurring slots',
      desc: 'Set daily routines once, done forever.',
      demo: (
        <>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
              const on = [0, 2, 4].includes(i);
              return (
                <motion.div
                  key={d + i}
                  variants={scaleIn}
                  style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: on ? 'rgba(245,166,35,0.8)' : 'var(--surface3)', color: on ? '#1a1a18' : 'var(--text3)' }}
                >
                  {d}
                </motion.div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>Gym repeats every M · W · F</p>
        </>
      ),
    },
    {
      Icon: TrendingUp, color: '#FF6B35', bg: 'rgba(255,107,53,0.15)', title: 'Progress & streaks',
      desc: 'Visual bars and streaks that keep you going.',
      demo: (
        <>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                style={{ width: 18, height: 18, borderRadius: 4, background: i < 5 ? 'var(--accent)' : 'rgba(255,107,53,0.2)' }}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>🔥 5-day streak — keep it going!</p>
        </>
      ),
    },
    {
      Icon: ShieldCheck, color: '#4A90D9', bg: 'rgba(74,144,217,0.15)', title: 'Secure auth',
      desc: 'Google or email, NextAuth-powered, encrypted.',
      demo: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <motion.div
            style={{ width: 20, height: 14, border: '2px solid var(--accent2)', borderBottom: 'none', borderRadius: '10px 10px 0 0' }}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div style={{ width: 30, height: 22, borderRadius: 5, background: 'rgba(74,144,217,0.15)', border: '1.5px solid var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={12} color="#4A90D9" />
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {[0, 0.3, 0.6].map((d, i) => (
              <motion.div
                key={i}
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)' }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.5, delay: d, repeat: Infinity }}
              />
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ padding: '24px 28px' }}
      className="section-pad"
    >
      <motion.div variants={fadeUp}>
        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, background: 'rgba(74,144,217,0.15)', color: 'var(--accent2)', fontSize: 11, fontWeight: 600, marginBottom: 10 }}>
          Features
        </span>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, letterSpacing: -0.4, marginBottom: 8, color: 'var(--text)' }}>
          Built for real routines
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 20, maxWidth: 440 }}>
          Every feature animated — see exactly how it works.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {feats.map((f, i) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            custom={i}
            whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r2)', padding: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <f.Icon size={15} color={f.color} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{f.title}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 10 }}>{f.desc}</p>
            {f.demo}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPANY SECTION
// ─────────────────────────────────────────────────────────────────
function CompanySection() {
  const faqs: [string, string][] = [
    ['Is there a free trial?', 'Yes! Sign up and get a 14-day free trial of our premium features, no credit card required.'],
    ['What platforms?', 'Timedule is web-based and works on all modern browsers. Mobile app coming soon!'],
    ['Can I cancel anytime?', 'Absolutely. Cancel from your account settings at any time, no questions asked.'],
    ['How do I get support?', 'Email us at support@aethersolve.com — we typically respond within 24h.'],
  ];
  const stats: [string, string, string][] = [['2024', 'Founded', 'var(--accent)'], ['12k+', 'Users', 'var(--accent2)'], ['100%', 'Independent', 'var(--accent3)']];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ padding: '28px 32px' }}
      className="section-pad"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, background: 'rgba(45,203,122,0.12)', color: 'var(--accent3)', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
          Company
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={22} color="white" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text)' }}>
            <span style={{ color: 'var(--accent5)' }}>AetherSolve</span> Pvt Ltd
          </h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 10, maxWidth: 480 }}>
          Founded in 2024, AetherSolve is a student-founded startup on a mission to help people master their time and build better habits.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 20, maxWidth: 480 }}>
          Timedule is our first product, born out of our own struggles with time management and a desire to create a tool that truly meets the needs of students and self-learners.
        </p>
      </motion.div>

      {/* Social row */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <Wifi size={16} color="var(--accent5)" />
        <span style={{ fontSize: 12, color: 'var(--accent5)' }}>Remote-first since day one</span>
        <span style={{ background: 'var(--accent3)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Worldwide</span>
        {[
          { label: 'LinkedIn', href: 'https://linkedin.com/company/aethersolve' },
          { label: 'GitHub',   href: 'https://github.com/aethersolve' },
          { label: 'Twitter',  href: 'https://twitter.com/aethersolve' },
        ].map(l => (
          <motion.a
            key={l.label}
            href={l.href} target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            style={{ fontSize: 11, color: 'var(--accent2)', background: 'var(--surface2)', border: '0.5px solid var(--border2)', padding: '3px 9px', borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {l.label} <ExternalLink size={10} />
          </motion.a>
        ))}
        <Link href="https://aethersolve.vercel.app" target="_blank" style={{ fontSize: 12, color: 'var(--accent5)', textDecoration: 'none' }}>
          aethersolve.com
        </Link>
      </motion.div>

      {/* Quote */}
      <motion.div
        variants={fadeUp}
        style={{ borderLeft: '3px solid var(--accent)', borderRadius: '0 var(--r2) var(--r2) 0', padding: '14px 16px', background: 'var(--surface)', border: '.5px solid var(--border)', marginBottom: 24 }}
      >
        <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text2)' }}>
          "Most productivity apps are built for office workers. We built Timedule for students and self-learners. Every pixel is intentional."
        </p>
        <p style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>— Timedule Team</p>
      </motion.div>

      {/* FAQs */}
      <motion.div variants={fadeUp}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, letterSpacing: -0.4, marginBottom: 14, color: 'var(--text)' }}>FAQs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
          {faqs.map(([q, a]) => (
            <motion.div
              key={q}
              whileHover={{ y: -2 }}
              style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{q}</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{a}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {stats.map(([n, l, c]) => (
          <motion.div
            key={l}
            variants={scaleIn}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center' }}
          >
            <p style={{ fontSize: 22, fontWeight: 800, color: c }}>{n}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{l}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ABOUT SECTION
// ─────────────────────────────────────────────────────────────────
function AboutSection() {
  const team = [
    { i: 'AK', n: 'Aathiya K.', r: 'Founder & Designer', c: 'var(--accent)'  },
    { i: 'RJ', n: 'Raj J.',     r: 'Lead Engineer',       c: 'var(--accent2)' },
    { i: 'PM', n: 'Priya M.',   r: 'Product & Growth',    c: 'var(--accent3)' },
    { i: 'SK', n: 'Sai K.',     r: 'Backend & Infra',     c: 'var(--accent4)' },
  ];
  const values = [
    { e: '⚡', t: 'Speed',              d: 'We ship fast and iterate faster. Perfection later, value now.' },
    { e: '🎯', t: 'Intentional design', d: 'Every pixel, every interaction has a reason.' },
    { e: '🌱', t: 'Student-first',      d: 'We remember what it felt like to be overwhelmed. We build for that version of ourselves.' },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      style={{ padding: '28px 32px' }}
      className="section-pad"
    >
      <motion.div variants={fadeUp}>
        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, background: 'rgba(245,166,35,0.12)', color: 'var(--accent4)', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
          About
        </span>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, letterSpacing: -0.4, marginBottom: 10, color: 'var(--text)' }}>
          Meet the team
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 22, maxWidth: 440 }}>
          A small team obsessed with productivity and helping people build better habits.
        </p>
      </motion.div>

      <motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, maxWidth: 520, marginBottom: 16 }}
      >
        {team.map(m => (
          <motion.div
            key={m.n}
            variants={slideLeft}
            whileHover={{ x: 4 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: '13px 15px' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.c, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {m.i}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.n}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.r}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={fadeUp}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px', maxWidth: 520, marginBottom: 24 }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Want to join us?</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>We're always looking for passionate builders.</p>
        </div>
        <motion.a
          href="https://aethersolve.vercel.app/#careers"
          className="btn btn-primary btn-sm"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          View open roles <ChevronRight size={13} />
        </motion.a>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, letterSpacing: -0.4, marginBottom: 14, color: 'var(--text)' }}>Our values</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
          {values.map(v => (
            <motion.div
              key={v.t}
              variants={slideLeft}
              whileHover={{ x: 3 }}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: '13px 16px' }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{v.e}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{v.t}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{v.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BOTTOM NAV  (Android-style)
// ─────────────────────────────────────────────────────────────────
interface BottomNavProps {
  active: NavId;
  onSwitch: (id: NavId) => void;
}

function BottomNav({ active, onSwitch }: BottomNavProps) {
  const activeIdx = NAV.findIndex(n => n.id === active);
  const itemWidthPct = 100 / NAV.length;

  return (
    <nav style={{
      position: 'relative',
      height: 64,
      background: 'var(--surface)',
      borderTop: '0.5px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Sliding indicator */}
      <motion.div
        style={{
          position: 'absolute', bottom: 0, height: 2,
          background: 'var(--accent)', borderRadius: '2px 2px 0 0',
          width: `${itemWidthPct}%`,
        }}
        animate={{ left: `${activeIdx * itemWidthPct}%` }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      />
      {NAV.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <motion.button
            key={id}
            onClick={() => onSwitch(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 0', color: isActive ? 'var(--accent)' : 'var(--text3)',
              fontFamily: 'var(--font-body)',
            }}
            whileTap={{ scale: 0.9 }}
            animate={{ color: isActive ? 'var(--accent)' : 'var(--text3)' }}
          >
            <motion.div
              animate={{ y: isActive ? -2 : 0, scale: isActive ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            </motion.div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [active, setActive] = useState<NavId>('home');
  const [overlay, setOverlay] = useState<LegalDoc | null>(null);
  const { dark, toggle } = useTheme();
  const clock = useClock();
  const contentRef = useRef<HTMLDivElement>(null);

  const openLegal = (doc: LegalDoc) => {
    setOverlay(doc);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeLegal = () => {
    setOverlay(null);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build sections map here so HomeSection receives openLegal
  const SECTIONS_LIVE: Record<NavId, React.ReactNode> = {
    home:     <HomeSection onOpenLegal={openLegal} />,
    product:  <ProductSection />,
    features: <FeaturesSection />,
    company:  <CompanySection />,
    about:    <AboutSection />,
  };

  function switchTab(id: NavId) {
    setOverlay(null);   // close legal overlay when switching tabs
    setActive(id);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <nav
        className="desktop-sidebar"
        style={{
          width: 220, background: 'var(--surface)',
          borderRight: '0.5px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 10px', gap: 4, flexShrink: 0, position: 'relative', zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, width: '100%' }}>
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
            style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Activity size={18} color="white" strokeWidth={2.5} />
          </motion.div>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap' }}>Timedule</span>
        </div>

        {/* Nav items */}
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <motion.button
              key={id}
              onClick={() => switchTab(id)}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', height: 40, borderRadius: 9,
                display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start',
                padding: '0 10px',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text3)',
                border: 'none', cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              }}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </motion.button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Sign in shortcut */}
        <motion.button
          onClick={() => switchTab('home')}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', height: 40, borderRadius: 9, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', background: 'transparent', color: 'var(--text3)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}
        >
          <LogIn size={17} /> <span>Sign in</span>
        </motion.button>

        {/* Guest row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', width: '100%', marginTop: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>?</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Guest</p>
            <p style={{ fontSize: 10, color: 'var(--text3)' }}>Not signed in</p>
          </div>
        </div>
      </nav>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* TOPBAR */}
        <header style={{
          height: 56, background: 'var(--surface)',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 18px', gap: 12, flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <p style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700, flex: 1, color: 'var(--text)' }}>
            {NAV.find(n => n.id === active)?.label ?? 'Timedule'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
              <motion.div
                style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent3)', flexShrink: 0 }}
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Wifi size={12} color="var(--accent3)" />
              <span suppressHydrationWarning style={{ fontVariantNumeric: 'tabular-nums', minWidth: 82 }}>
                {clock ?? '--:--:-- --'}
              </span>
            </div>

            {/* Theme toggle */}
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--surface2)', border: '0.5px solid var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text2)',
              }}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                {dark
                  ? <motion.div key="sun" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <Sun size={15} />
                    </motion.div>
                  : <motion.div key="moon" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <Moon size={15} />
                    </motion.div>
                }
              </AnimatePresence>
            </motion.button>

            {/* Sign in btn */}
            <motion.button
              onClick={() => switchTab('home')}
              className="btn btn-primary btn-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <LogIn size={13} /> Sign in
            </motion.button>
          </div>
        </header>

        {/* CONTENT */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <AnimatePresence mode="wait">
            {overlay ? (
              <motion.div
                key={`legal-${overlay}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              >
                <TermsPrivacyPanel initial={overlay} onClose={closeLegal} />
              </motion.div>
            ) : (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              >
                {SECTIONS_LIVE[active]}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM NAV — visible on mobile/tablet; also shown on all sizes per request */}
        <div className="bottom-nav-wrapper">
          <BottomNav active={active} onSwitch={switchTab} />
        </div>
      </div>

      {/* Responsive styles injected as a style tag */}
      <style>{`
        .home-wrap { flex-direction: row; }
        .section-pad { padding: 24px 28px; }

        /* Desktop sidebar visible */
        .desktop-sidebar { display: flex !important; }
        /* Bottom nav: only on mobile/tablet by default */
        .bottom-nav-wrapper { display: none; }

        @media (max-width: 900px) {
          .desktop-sidebar { display: none !important; }
          .bottom-nav-wrapper { display: block; }
          .home-wrap { flex-direction: column !important; }
          .auth-panel { width: 100% !important; border-left: none !important; border-top: 0.5px solid var(--border) !important; }
          .section-pad { padding: 18px 16px !important; }
        }

        @media (max-width: 540px) {
          .hero-left { padding: 20px 16px !important; }
        }

        /* Lucide spin utility */
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Light mode auth card override */
        [data-theme="light"] .auth-card-wrap {
          background: rgba(255,255,255,0.95) !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
}