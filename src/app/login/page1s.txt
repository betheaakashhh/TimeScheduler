'use client';
// src/app/login/page.tsx  — standalone marketing layout, no dashboard layout
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Activity, LayoutDashboard, Monitor, Star,
  Users, Info, Mail, Lock, Eye, EyeOff,
  Loader2, LogIn, ChevronLeft, Wifi, Twitter, Linkedin
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

// ─── Nav items ───────────────────────────────────────────────────
const NAV = [
  { id: 'home',     label: 'Home',     Icon: LayoutDashboard },
  { id: 'product',  label: 'Product',  Icon: Monitor         },
  { id: 'features', label: 'Features', Icon: Star            },
  { id: 'company',  label: 'Company',  Icon: Users           },
  { id: 'about',    label: 'About',    Icon: Info            },
] as const;
type NavId = (typeof NAV)[number]['id'];

// ─── Clock ───────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () => {
      const n = new Date();
      let h = n.getHours(), m = n.getMinutes(), s = n.getSeconds();
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ap}`;
    };
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}




// ─── Auth card ───────────────────────────────────────────────────
function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Registration failed');
        }
      }
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error('Invalid email or password');
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Logo & tagline (matches original) */}
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]">
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22" stroke="white" strokeWidth="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="glass-card absolute h-24 w-44 rounded-2xl bg-white/10 backdrop-blur-md"
              style={{
                top: 60,
                right: 30,
                transform: 'rotate(-8deg)',
                animation: 'floatA 6s ease-in-out infinite',
              }}
            />
            
            <div
              className="glass-card absolute h-20 w-20 rounded-full bg-white/10 backdrop-blur-md"
              style={{
                top: 200,
                left: 60,
                transform: 'rotate(-3deg)',
                animation: 'floatA 5s ease-in-out infinite 1s',
              }}
            />
          </div>
        </div>
        
        <div className="text-lg font-extrabold text-[var(--text)]">RhythmIQ</div>
        <div className="mt-1 text-xs text-[var(--text3)]">Smart daily timetable manager</div>
      </div>

      {/* Auth card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg backdrop-blur-sm">
        
        {/* Mode tabs */}
        <div className="mb-5 flex gap-1 rounded-lg bg-[var(--surface2)] p-1">
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition-all ${
                mode === tab
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text2)]">Full name</label>
              <input
                type="text"
                placeholder="Aathiya Sahu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--text2)]">
              <Mail size={13} /> Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              required
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--text2)]">
              <Lock size={13} /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text2)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text3)]">or</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 text-sm font-medium text-[var(--text)] transition-all hover:bg-[var(--surface2)]"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-5 text-center text-xs text-[var(--text3)]">
          By continuing you agree to our{' '}
          <a href="#" className="text-[var(--accent)] hover:underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-[var(--accent)] hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN LANDING PAGE COMPONENT
   ============================================================ */
function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] font-body text-[var(--text)]">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12 lg:flex-row lg:px-8">
        {/* LEFT SECTION: Hero + animated cards */}
        <div className="relative w-full lg:w-1/2 lg:pr-12">
          {/* Floating glass background cards */}
          <div className="absolute inset-0 overflow-hidden">
            
            <div
              className="glass-card absolute h-16 w-28 rounded-2xl bg-white/10 backdrop-blur-md"
              style={{
                bottom: 80,
                left: 20,
                transform: 'rotate(5deg)',
                animation: 'floatB 7s ease-in-out infinite',
              }}
            />
            
          </div>

          {/* Hero content */}
          <div className="relative z-10">
            <div className="hero-badge mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-xs font-medium text-[var(--text2)]">
              <span className="live-dot relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]"></span>
              </span>
              Now in public beta
            </div>
            <h1 className="hero-h mb-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your day,
              <br />
              perfectly in <span className="text-[var(--accent)]">rhythm</span>
            </h1>
            <p className="hero-sub mb-8 max-w-md text-base text-[var(--text2)] sm:text-lg">
              Smart timetable manager that adapts to your routine — tracking slots,
              streaks, and study time so you never lose the beat.
            </p>

            {/* Animated feature cards */}
            <div className="anim-cards space-y-3">
              {/* Card 1: Task completed */}
              <div
                className="anim-card flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition-all hover:shadow-md"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="acard-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(45,203,122,0.15)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DCB7A" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="acard-title text-sm font-semibold">Task completed</div>
                  <div className="acard-sub text-xs text-[var(--text3)]">Morning study session — 2h 15m</div>
                </div>
                <div className="check-anim text-[var(--accent)]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Streak */}
              <div
                className="anim-card flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="acard-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(255,107,53,0.15)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="acard-title text-sm font-semibold">🔥 14-day streak</div>
                  <div className="streak-row mt-1 flex gap-1">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="streak-day h-2 w-2 rounded-full bg-[var(--accent)]" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Timetable created */}
              <div
                className="anim-card flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="acard-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(74,144,217,0.15)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="acard-title text-sm font-semibold">Timetable created</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="prog-bar h-1.5 w-full rounded-full bg-[var(--surface2)]">
                      <div className="prog-fill h-1.5 w-3/4 rounded-full bg-[var(--accent)]" />
                    </div>
                    <span className="text-[10px] text-[var(--text3)]">6/8 slots</span>
                  </div>
                </div>
              </div>

              {/* Card 4: CSV imported */}
              <div
                className="anim-card flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
                style={{ animationDelay: '0.7s' }}
              >
                <div className="acard-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(245,166,35,0.15)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="acard-title text-sm font-semibold">Academic CSV imported</div>
                  <div className="csv-rows mt-1 space-y-1">
                    <div className="csv-row h-1.5 w-[90%] rounded-full bg-[var(--accent)] opacity-30" />
                    <div className="csv-row h-1.5 w-[70%] rounded-full bg-[#F5A623] opacity-30" />
                    <div className="csv-row h-1.5 w-[80%] rounded-full bg-[var(--accent)] opacity-30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Auth form */}
        <div className="mt-12 w-full lg:mt-0 lg:w-1/2 lg:pl-8">
          <AuthCard />
        </div>
      </div>
    </div>
  );
}

// ─── Section content ─────────────────────────────────────────────
function ProductSection() {
  const items = [
    { color:'var(--accent)',  bg:'rgba(255,107,53,0.1)',  e:'📅', t:'Smart Scheduling', d:'Drag-and-drop slots that adapt to your real-life energy levels.' },
    { color:'var(--accent2)', bg:'rgba(74,144,217,0.1)',  e:'📊', t:'Deep Analytics',   d:'Weekly reports, streak tracking, and productivity heatmaps.' },
    { color:'var(--accent3)', bg:'rgba(45,203,122,0.1)',  e:'🔔', t:'Live Reminders',   d:'Real-time slot alerts with a live clock so you never miss a beat.' },
    { color:'var(--accent4)', bg:'rgba(245,166,35,0.1)',  e:'🎓', t:'Academic Mode',    d:'Track subjects, exams, and revision — built for students.' },
  ];
  return (
    <div style={{ padding:'36px 40px' }}>
      <div style={{ display:'inline-flex',padding:'3px 10px',borderRadius:20,background:'rgba(255,107,53,0.12)',color:'var(--accent)',fontSize:11,fontWeight:600,marginBottom:12 }}>Product</div>
      <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}>Everything you need to own your day</h2>
      <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:28,maxWidth:440 }}>Scheduling, analytics, and smart reminders — one beautifully simple interface.</p>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        {items.map(f => (
          <div key={f.t} className="card card-hover" style={{ borderLeft:`3px solid ${f.color}`,borderRadius:`0 var(--r2) var(--r2) 0` }}>
            <div style={{ width:32,height:32,borderRadius:8,background:f.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,marginBottom:10 }}>{f.e}</div>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>{f.t}</div>
            <div style={{ fontSize:12,color:'var(--text2)',lineHeight:1.55 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:20 }}>
        {[['12k+','Active users','var(--accent)'],['98%','Retention','var(--accent2)'],['4.9★','Rating','var(--accent3)']].map(([n,l,c])=>(
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22,fontWeight:800,color:c as string }}>{n}</div>
            <div style={{ fontSize:11,color:'var(--text3)',marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesSection() {
  const feats = [
    { e:'⚡',t:'Slot priorities',   d:'High, medium, low — color-coded borders.',bg:'rgba(255,107,53,0.1)'},
    { e:'🌙',t:'Dark & light mode', d:'One click. Your eyes will thank you.',    bg:'rgba(74,144,217,0.1)'},
    { e:'📱',t:'Mobile first',      d:'Full bottom nav — add slots on the go.',  bg:'rgba(45,203,122,0.1)'},
    { e:'🔁',t:'Recurring slots',   d:'Set daily routines once, done forever.',  bg:'rgba(245,166,35,0.1)'},
    { e:'📈',t:'Progress tracking', d:'Visual bars and streaks that motivate.',  bg:'rgba(255,107,53,0.1)'},
    { e:'🔐',t:'Secure auth',       d:'Google or email, NextAuth-powered.',      bg:'rgba(74,144,217,0.1)'},
  ];
  return (
    <div style={{ padding:'36px 40px' }}>
      <div style={{ display:'inline-flex',padding:'3px 10px',borderRadius:20,background:'rgba(74,144,217,0.12)',color:'var(--accent2)',fontSize:11,fontWeight:600,marginBottom:12 }}>Features</div>
      <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}>Built for real routines</h2>
      <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:28,maxWidth:440 }}>No bloat. Every feature exists because real users asked for it.</p>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
        {feats.map(f => (
          <div key={f.t} className="card card-hover">
            <div style={{ width:32,height:32,borderRadius:8,background:f.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,marginBottom:10 }}>{f.e}</div>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>{f.t}</div>
            <div style={{ fontSize:12,color:'var(--text2)',lineHeight:1.55 }}>{f.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanySection() {
  return (
    <div style={{ padding:'36px 40px' }}>
      
      <div style={{ display:'inline-flex',padding:'3px 10px',borderRadius:20,background:'rgba(45,203,122,0.12)',color:'var(--accent3)',fontSize:11,fontWeight:600,marginBottom:12 }}>Company</div>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
         <Image
                        src="/newaether.png"
                        alt="AetherSolve Logo"
                        width={48}
                        height={48}
                        style={{
                          objectFit: 'contain'
                        }}
                      />
      <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}><span style={{ color:'var(--accent5)' }}>AetherSolve</span> Pvt Ltd</h2>
      </div>
      <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:24,maxWidth:440 }}>Founded in 2024, AetherSolve is a student-founded startup on a mission to help people master their time and build better habits.</p>
       <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:24,maxWidth:440 }}>RhythmIQ is our first product, born out of our own struggles with time management and a desire to create a tool that truly meets the needs of students and self-learners.</p>
       <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:24,maxWidth:440 }}>We're a small, passionate team dedicated to building products that make a real difference in people's lives. We're proud to be 100% independent and bootstrapped, and we're just getting started.</p>
       <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24 }}>
         <Wifi size={16} color="var(--accent5)"/>
         <span style={{ fontSize:12,color:'var(--accent5)' }}>Remote-first since day one</span>
         <div className='social-app' style={{ background:'var(--accent3)', color:'white', padding:'2px 6px', borderRadius:4, fontSize:10, fontWeight:600 }}>Worldwide</div>
         <div className="linkedin" style={{ display:'inline-block' }}>
           <Link href="https://www.linkedin.com/company/aethersolve" target="_blank" rel="noopener noreferrer">
            <Image src="/linkedin.png" alt="LinkedIn Logo" width={16} height={16} style={{ objectFit: 'contain', filter: 'invert(1)' }} />
           </Link>
         </div>
         <div className="twitter" style={{ display:'inline-block' }}>
           <Link href="https://twitter.com/aethersolve" target="_blank" rel="noopener noreferrer">
            <Image src="/xtwitter.png" alt="Twitter Logo" width={16} height={16} style={{ objectFit: 'contain', filter: 'invert(1)' }} /> 
           </Link>
         </div>
         <div className="website" style={{ display:'inline-block' }}>
           <Link href="https://aethersolve.vercel.app" target="_blank" rel="noopener noreferrer" style={{ fontSize:12,color:'var(--accent5)' }}>
             aethersolve.com
           </Link>
         </div>
         <div className='github' style={{ display:'inline-block' }}>
           <Link href="https://github.com/aethersolve" target="_blank" rel="noopener noreferrer">
            <Image src="/github.png" alt="GitHub Logo" width={16} height={16} style={{ objectFit: 'contain', filter: 'invert(1)' }} /> 
           </Link>
         </div>

      </div>
      
      <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}>Why we built RhythmIQ</h2>
      <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:24,maxWidth:440 }}>We were students drowning in sticky notes and broken spreadsheets.</p>
      <div className="card" style={{ borderLeft:'3px solid var(--accent)',borderRadius:`0 var(--r2) var(--r2) 0`,marginBottom:20 }}>
        <p style={{ fontSize:14,lineHeight:1.75,color:'var(--text2)' }}>"Most productivity apps are built for office workers. We built RhythmIQ for students and self-learners. Every pixel is intentional."</p>
        <div style={{ marginTop:10,fontSize:12,fontWeight:600 }}>— RhythmIQ Team</div>
      </div>
      <div className='faqs' style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}>FAQs</h2>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          {[
            ['Is there a free trial?', 'Yes! Sign up and get a 14-day free trial of our premium features, no credit card required.'],
            ['What platforms is it on?', 'RhythmIQ is web-based and works on all modern browsers. We also have a mobile app in the works!'],
            ['Can I cancel anytime?', 'Absolutely. You can cancel your subscription at any time from your account settings, no questions asked.'],
            ['How do I contact support?', 'Just email us at support@aethersolve.com']
          ].map(([q,a]) => (
            <div key={q} className="card" style={{ padding:16 }}>
              <h3 style={{ fontSize:14,fontWeight:600,color:'var(--text)' }}>{q}</h3>
              <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65 }}>{a}</p>
            </div>
          ))}
        </div>


      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
        {[['2024','Founded','var(--accent)'],['12k+','Users','var(--accent2)'],['100%','Independent','var(--accent3)']].map(([n,l,c])=>(
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22,fontWeight:800,color:c as string }}>{n}</div>
            <div style={{ fontSize:11,color:'var(--text3)',marginTop:3 }}>{l}</div>
          </div>
        ))}
        
      </div>
    </div>
  );
}

function AboutSection() {
  const team = [
    { i:'AK', n:'Aakash Kumar Sahu',  r:'Founder & Designer', c:'var(--accent)' , d:'The visionary behind RhythmIQ, obsessed with pixel-perfect design and user experience.' },
    
  ];
  return (
    <div style={{ padding:'36px 40px' }}>
      <div style={{ display:'inline-flex',padding:'3px 10px',borderRadius:20,background:'rgba(245,166,35,0.12)',color:'var(--accent4)',fontSize:11,fontWeight:600,marginBottom:12 }}>About</div>
      <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}>Meet the team</h2>
      <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:24,maxWidth:440 }}>A small team obsessed with productivity and helping people build better habits.</p>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        {team.map(m => (
          <div key={m.n} className="card" style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:38,height:38,borderRadius:'50%',background:m.c,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12,fontWeight:700,flexShrink:0 }}>{m.i}</div>
            <div>
              <div style={{ fontSize:13,fontWeight:600 }}>{m.n}</div>
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>{m.r}</div>
              <div style={{ fontSize:12,color:'var(--text2)',lineHeight:1.55,marginTop:4 }}>{m.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',marginTop:16 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:700 }}>Want to join us?</div>
          <div style={{ fontSize:12,color:'var(--text2)',marginTop:3 }}>We're always looking for passionate builders.</div>
        </div>
        <Link href="https://aethersolve.vercel.app/#careers" className="btn btn-outline" style={{ height:36,whiteSpace:'nowrap' }}>View open roles →</Link>
      </div>
      <div className='footer' style={{ marginTop:40, paddingTop:20, borderTop:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:11, color:'var(--text3)' }}>
        <div style={{ fontSize:12,}}>RhythmIQ</div>

        <span>© 2024 AetherSolve Pvt Ltd. All rights reserved.</span>

        <div style={{ width:4,height:4,borderRadius:'50%',background:'var(--text3)' }}/>
        <Link href="/privacy" style={{ color:'var(--text3)' }}>Privacy Policy</Link>
        <div style={{ width:4,height:4,borderRadius:'50%',background:'var(--text3)' }}/>
        <Link href="/terms" style={{ color:'var(--text3)' }}>Terms of Service</Link>
      </div>
    </div>
  );
}

const SECTIONS: Record<NavId, React.ReactNode> = {
  home:     <LandingPage />,
  product:  <ProductSection />,
  features: <FeaturesSection />,
  company:  <CompanySection />,
  about:    <AboutSection />,
};

// ─── Main page ───────────────────────────────────────────────────
export default function LoginPage() {
  const [active, setActive] = useState<NavId>('home');
  const clock = useClock();

  return (
    <div className="app-container" style={{ height:'100dvh' }}>

      {/* ── Left Sidebar ── */}
      <nav
        className="desktop-sidebar"
        style={{ width:220,background:'var(--surface)',borderRight:'0.5px solid var(--border)',display:'flex',flexDirection:'column',alignItems:'center',padding:'14px 10px',gap:4,flexShrink:0,position:'relative',zIndex:100 }}
      >
        {/* Logo */}
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14,width:'100%' }}>
          <div style={{ width:36,height:36,background:'var(--accent)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <Activity size={18} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{ fontFamily:'var(--font-head)',fontSize:16,fontWeight:800,whiteSpace:'nowrap' }}>RhythmIQ</span>
        </div>

        {/* Nav items */}
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setActive(id)}
              style={{ width:'100%',height:40,borderRadius:9,display:'flex',alignItems:'center',gap:10,justifyContent:'flex-start',padding:'0 10px',background:isActive?'var(--accent)':'transparent',color:isActive?'white':'var(--text3)',border:'none',cursor:'pointer',transition:'background 0.15s,color 0.15s',fontFamily:'var(--font-body)',fontSize:13,fontWeight:500,flexShrink:0 }}
              onMouseEnter={e => { if(!isActive){ (e.currentTarget as HTMLElement).style.background='var(--surface2)'; (e.currentTarget as HTMLElement).style.color='var(--text)'; }}}
              onMouseLeave={e => { if(!isActive){ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text3)'; }}}
            >
              <Icon size={17} style={{ flexShrink:0 }}/> <span>{label}</span>
            </button>
          );
        })}

        <div style={{ flex:1 }}/>

        {/* Sign in shortcut at bottom */}
        <button onClick={() => setActive('home')}
          style={{ width:'100%',height:40,borderRadius:9,display:'flex',alignItems:'center',gap:10,padding:'0 10px',background:'transparent',color:'var(--text3)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,fontWeight:500,transition:'background 0.15s,color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='var(--surface2)'; (e.currentTarget as HTMLElement).style.color='var(--text)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text3)'; }}
        >
          <LogIn size={17}/> <span>Sign in</span>
        </button>

        {/* Guest profile row */}
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 0',width:'100%',marginTop:4 }}>
          <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--surface3)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:11,fontWeight:700,flexShrink:0 }}>?</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:12,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>Guest</div>
            <div style={{ fontSize:10,color:'var(--text3)' }}>Not signed in</div>
          </div>
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="main-content" style={{ position:'relative' }}>

        {/* Topbar */}
        <div className="topbar">
          <div style={{ fontFamily:'var(--font-head)',fontSize:17,fontWeight:700,flex:1 }}>
            {NAV.find(n => n.id === active)?.label ?? 'RhythmIQ'}
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text3)' }}>
              <Wifi size={12} color="var(--accent3)"/>
              <span suppressHydrationWarning style={{ fontVariantNumeric:'tabular-nums',minWidth:80 }}>{clock ?? '-- : -- --'}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setActive('home')}>
              <ChevronLeft size={13}/> Sign in
            </button>
          </div>
        </div>

        {/* Section content */}
        <div key={active} style={{ animation:'slideIn 0.2s ease' }} className="animate-slide-in">
          {SECTIONS[active]}
        </div>
      </div>
    </div>
  );
}