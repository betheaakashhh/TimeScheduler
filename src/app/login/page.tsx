'use client';
// src/app/login/page.tsx — standalone marketing layout, animated sections
import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Activity, LayoutDashboard, Monitor, Star,
  Users, Info, Mail, Lock, Eye, EyeOff,
  Loader2, LogIn, ChevronLeft, Wifi,
  Sun, Moon, Smartphone, RefreshCw, TrendingUp, ShieldCheck,
  Zap,
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
  const [mode, setMode]       = useState<'login'|'register'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [showPw, setShowPw]   = useState(false);
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
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Registration failed'); }
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) throw new Error('Invalid email or password');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      background: 'rgba(28,28,24,0.85)',
      border: '0.5px solid rgba(255,255,255,0.13)',
      borderRadius: 'var(--r)',
      padding: 24,
      width: '100%',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Mode tabs */}
      <div style={{ display:'flex', gap:2, background:'var(--surface2)', borderRadius:8, padding:3, marginBottom:18 }}>
        {(['login','register'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'7px 0', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', background:mode===m?'var(--surface3)':'transparent', color:mode===m?'var(--text)':'var(--text3)', border:'none', transition:'all 0.15s', fontFamily:'var(--font-body)', textTransform:'capitalize' }}>{m}</button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div style={{ marginBottom:10 }}>
            <div className="form-label">Full name</div>
            <input className="form-input" style={{ background:'rgba(36,36,32,0.8)', marginBottom:0 }} type="text" placeholder="Aathiya" value={name} onChange={e => setName(e.target.value)} required />
          </div>
        )}
        <div style={{ marginBottom:10 }}>
          <div className="form-label"><Mail size={13}/> Email</div>
          <input className="form-input" style={{ background:'rgba(36,36,32,0.8)', marginBottom:0 }} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom:16 }}>
          <div className="form-label"><Lock size={13}/> Password</div>
          <div style={{ position:'relative' }}>
            <input className="form-input" style={{ background:'rgba(36,36,32,0.8)', paddingRight:38, marginBottom:0 }} type={showPw?'text':'password'} placeholder="••••••••" value={password} onChange={e => setPass(e.target.value)} required />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text3)' }}>
              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width:'100%', height:40, justifyContent:'center' }} disabled={loading}>
          {loading && <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/>}
          {mode==='login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div style={{ display:'flex', alignItems:'center', gap:10, margin:'12px 0' }}>
        <div style={{ flex:1, height:'0.5px', background:'var(--border)' }}/>
        <span style={{ fontSize:11, color:'var(--text3)' }}>or</span>
        <div style={{ flex:1, height:'0.5px', background:'var(--border)' }}/>
      </div>

      <button onClick={() => signIn('google',{callbackUrl:'/dashboard'})} className="btn" style={{ width:'100%', height:40, justifyContent:'center', gap:10, background:'var(--surface2)', border:'0.5px solid var(--border2)' }}>
        <svg viewBox="0 0 24 24" width="15" height="15"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>
      <div style={{ textAlign:'center', marginTop:10, fontSize:11, color:'var(--text3)' }}>
        By continuing you agree to our <a href="#" style={{ color:'var(--accent)' }}>Terms</a> and <a href="#" style={{ color:'var(--accent)' }}>Privacy</a>
      </div>
    </div>
  );
}

// ─── HOME: Animated left panel ────────────────────────────────────
function HomeSection() {
  return (
    <div style={{ display:'flex', height:'100%', minHeight:'calc(100dvh - 60px)' }}>

      {/* LEFT: hero + glass bg + animated cards */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 36px', position:'relative', overflow:'hidden' }}>

        {/* Floating glass blobs */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:200, height:110, top:50, right:40, borderRadius:18, backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'0.5px solid rgba(255,255,255,0.09)', background:'rgba(255,255,255,0.025)', transform:'rotate(-8deg)', animation:'floatA 6s ease-in-out infinite' }}/>
          <div style={{ position:'absolute', width:130, height:75, bottom:90, left:10, borderRadius:14, backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'0.5px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)', transform:'rotate(5deg)', animation:'floatB 7s ease-in-out infinite' }}/>
          <div style={{ position:'absolute', width:90, height:90, top:210, left:50, borderRadius:'50%', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'0.5px solid rgba(255,107,53,0.15)', background:'rgba(255,107,53,0.04)', animation:'floatA 5s ease-in-out 1s infinite' }}/>
          <div style={{ position:'absolute', width:60, height:60, bottom:160, right:80, borderRadius:'50%', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', border:'0.5px solid rgba(74,144,217,0.15)', background:'rgba(74,144,217,0.04)', animation:'floatB 8s ease-in-out 2s infinite' }}/>
        </div>

        {/* Hero text */}
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,107,53,0.15)', border:'0.5px solid rgba(255,107,53,0.3)', color:'var(--accent)', fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, marginBottom:18 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent3)', display:'inline-block', animation:'pulse 2s infinite' }}/>
            Now in public beta
          </div>
          <h1 style={{ fontFamily:'var(--font-head)', fontSize:36, fontWeight:800, lineHeight:1.15, letterSpacing:-1, marginBottom:14, color:'var(--text)' }}>
            Your day,<br/>perfectly in <span style={{ color:'var(--accent)' }}>rhythm</span>
          </h1>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:28, maxWidth:360 }}>
            Smart timetable manager that adapts to your routine — tracking slots, streaks, and study time so you never lose the beat.
          </p>

          {/* Animated mini-cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Task completed */}
            <div className="login-anim-card" style={{ animationDelay:'0.1s' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(45,203,122,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2DCB7A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>Task completed</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>Morning study session — 2h 15m</div>
              </div>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'rgba(45,203,122,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2DCB7A" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>

            {/* Streak */}
            <div className="login-anim-card" style={{ animationDelay:'0.25s' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,107,53,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>🔥 14-day streak</div>
                <div style={{ display:'flex', gap:3, marginTop:5 }}>
                  {[1,1,1,1,1,1,1].map((_,i) => (
                    <div key={i} style={{ width:12, height:12, borderRadius:3, background:'var(--accent)', animation:`popIn 0.3s ease ${0.4+i*0.05}s backwards` }}/>
                  ))}
                </div>
              </div>
            </div>

            {/* Timetable progress */}
            <div className="login-anim-card" style={{ animationDelay:'0.4s' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(74,144,217,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>Timetable created</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5 }}>
                  <div style={{ flex:1, height:4, background:'var(--surface3)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:'75%', background:'var(--accent2)', borderRadius:2, animation:'fillBar 1.8s ease 0.6s both' }}/>
                  </div>
                  <span style={{ fontSize:10, color:'var(--text3)' }}>6/8 slots</span>
                </div>
              </div>
            </div>

            {/* CSV import */}
            <div className="login-anim-card" style={{ animationDelay:'0.55s' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'rgba(245,166,35,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>Academic CSV imported</div>
                <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:5 }}>
                  {[{w:'90%',c:'rgba(245,166,35,0.4)',d:'0.7s'},{w:'65%',c:'rgba(74,144,217,0.3)',d:'0.9s'},{w:'80%',c:'rgba(45,203,122,0.3)',d:'1.1s'}].map((r,i) => (
                    <div key={i} style={{ height:4, borderRadius:2, background:r.c, width:0, animation:`csvGrow 0.5s ease ${r.d} forwards` }}/>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT: auth form */}
      <div style={{ width:330, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px', background:'var(--surface)', borderLeft:'0.5px solid var(--border)' }}>
        <div style={{ width:'100%' }}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ width:46, height:46, background:'var(--accent)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
              <Activity size={24} color="white" strokeWidth={2.5}/>
            </div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:800, color:'var(--text)' }}>RhythmIQ</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>Smart daily timetable manager</div>
          </div>
          <AuthCard/>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT section ──────────────────────────────────────────────
function ProductSection() {
  const tlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tlRef.current) return;
    // re-trigger animations on mount
    const bars = tlRef.current.querySelectorAll<HTMLElement>('.prod-prog-fill');
    bars.forEach(b => { b.style.width = '0'; void b.offsetWidth; b.style.width = b.dataset.w || '0'; });
  }, []);

  const activities = [
    { color:'#2DCB7A', label:'6 AM · Jog',    icon:'jog'    },
    { color:'#4A90D9', label:'8 AM · Study',   icon:'study'  },
    { color:'#F5A623', label:'1 PM · Lunch',   icon:'lunch'  },
    { color:'#FF6B35', label:'7 PM · Dinner',  icon:'dinner' },
  ];

  const timelineItems = [
    { color:'#2DCB7A', label:'Morning jog',    time:'06:00 – 07:00 AM', pct:'100%', delay:'0.1s' },
    { color:'#4A90D9', label:'Study session',  time:'08:00 – 11:00 AM', pct:'78%',  delay:'0.25s' },
    { color:'#F5A623', label:'Lunch break',    time:'01:00 – 01:30 PM', pct:'52%',  delay:'0.4s'  },
    { color:'#FF6B35', label:'Dinner',         time:'07:00 – 07:30 PM', pct:'30%',  delay:'0.55s' },
  ];

  const graphDays  = ['M','T','W','T','F','S','S'];
  const graphVals  = [70, 55, 85, 40, 90, 30, 60];

  return (
    <div style={{ padding:'28px 36px' }} ref={tlRef}>
      <div style={{ display:'inline-flex', padding:'3px 10px', borderRadius:20, background:'rgba(255,107,53,0.15)', color:'var(--accent)', fontSize:11, fontWeight:600, marginBottom:10 }}>Product</div>
      <h2 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800, letterSpacing:-0.4, marginBottom:8, color:'var(--text)' }}>Built around your daily rhythm</h2>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65, marginBottom:20, maxWidth:440 }}>Watch how RhythmIQ guides your day — from morning jog to study sessions to dinner.</p>

      {/* Person scene */}
      <div style={{ display:'flex', justifyContent:'space-around', alignItems:'flex-end', marginBottom:20, background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--r)', padding:'18px 24px' }}>
        {activities.map((a, i) => (
          <div key={a.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, animation:`popIn 0.4s ease ${i*0.15}s backwards` }}>
            {/* SVG person */}
            <svg viewBox="0 0 40 60" width="40" height="60">
              {/* head */}
              <circle cx="20" cy="10" r="8" fill={a.color}/>
              {/* body */}
              <rect x="14" y="20" width="12" height="18" rx="4" fill={a.color} opacity="0.85"/>
              {/* legs */}
              {a.icon === 'jog' ? (
                <>
                  <line x1="17" y1="38" x2="10" y2="54" stroke={a.color} strokeWidth="4" strokeLinecap="round"/>
                  <line x1="23" y1="38" x2="30" y2="50" stroke={a.color} strokeWidth="4" strokeLinecap="round"/>
                  <line x1="14" y1="25" x2="5"  y2="32" stroke={a.color} strokeWidth="3" strokeLinecap="round"/>
                  <line x1="26" y1="25" x2="35" y2="20" stroke={a.color} strokeWidth="3" strokeLinecap="round"/>
                </>
              ) : (
                <>
                  <line x1="17" y1="38" x2="15" y2="54" stroke={a.color} strokeWidth="4" strokeLinecap="round"/>
                  <line x1="23" y1="38" x2="25" y2="54" stroke={a.color} strokeWidth="4" strokeLinecap="round"/>
                  <line x1="14" y1="25" x2="6"  y2="30" stroke={a.color} strokeWidth="3" strokeLinecap="round"/>
                  <line x1="26" y1="25" x2="34" y2="30" stroke={a.color} strokeWidth="3" strokeLinecap="round"/>
                </>
              )}
              {/* object held */}
              {a.icon === 'study' && <rect x="28" y="22" width="10" height="14" rx="2" fill={a.color} opacity="0.5"/>}
              {a.icon === 'lunch' && <circle cx="34" cy="29" r="5" fill={a.color} opacity="0.5"/>}
              {a.icon === 'dinner' && <rect x="30" y="26" width="8" height="10" rx="2" fill={a.color} opacity="0.5"/>}
            </svg>
            <div style={{ fontSize:10, fontWeight:600, color:a.color, whiteSpace:'nowrap' }}>{a.label}</div>
            {/* connecting dashes between figures */}
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position:'relative', paddingLeft:48, marginBottom:20 }}>
        {/* vertical track */}
        <div style={{ position:'absolute', left:19, top:0, bottom:0, width:2, background:'var(--surface3)', borderRadius:1 }}/>
        <div style={{ position:'absolute', left:19, top:0, width:2, background:'var(--accent)', borderRadius:1, animation:'growLine 3s ease forwards' }}/>

        {timelineItems.map((it, i) => (
          <div key={it.label} style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16, position:'relative', animation:`slideCard 0.4s ease ${it.delay} backwards` }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:`${it.color}22`, border:`2px solid ${it.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative', zIndex:1, marginLeft:-29 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:it.color }}/>
            </div>
            <div style={{ flex:1, paddingTop:8 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{it.label}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{it.time}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                <div style={{ flex:1, height:4, background:'var(--surface3)', borderRadius:2, overflow:'hidden' }}>
                  <div className="prod-prog-fill" data-w={it.pct} style={{ height:'100%', width:0, background:it.color, borderRadius:2, transition:`width 1s ease ${it.delay}`, animation:`fillBar 1.5s ease ${it.delay} forwards` }}/>
                </div>
                <span style={{ fontSize:10, color:'var(--text3)' }}>{it.pct}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly graph */}
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--r2)', padding:'14px 16px' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:10 }}>Weekly productivity</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:56 }}>
          {graphDays.map((d, i) => (
            <div key={d+i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ width:'100%', height:`${Math.round(graphVals[i]*0.56)}px`, background: i===4 ? 'var(--accent)' : 'var(--surface3)', borderRadius:'4px 4px 0 0', animation:`riseBar 0.5s ease ${i*0.07}s backwards` }}/>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          {graphDays.map((d, i) => (
            <div key={d+i} style={{ flex:1, textAlign:'center', fontSize:10, color: i===4 ? 'var(--accent)' : 'var(--text3)', fontWeight: i===4 ? 700 : 400 }}>{d}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FEATURES section ─────────────────────────────────────────────
function FeaturesSection() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div style={{ padding:'28px 36px' }}>
      <div style={{ display:'inline-flex', padding:'3px 10px', borderRadius:20, background:'rgba(74,144,217,0.15)', color:'var(--accent2)', fontSize:11, fontWeight:600, marginBottom:10 }}>Features</div>
      <h2 style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800, letterSpacing:-0.4, marginBottom:8, color:'var(--text)' }}>Built for real routines</h2>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65, marginBottom:20, maxWidth:440 }}>Every feature animated — see exactly how it works.</p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

        {/* 1. Slot priorities */}
        <div className="feat-anim-card" style={{ animationDelay:'0.05s' }}>
          <div className="fac-header">
            <div className="fac-icon" style={{ background:'rgba(255,107,53,0.15)' }}><Zap size={15} color="#FF6B35"/></div>
            <div className="fac-title">Slot priorities</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:10 }}>Color-coded borders for high, med, low urgency.</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {[
              { label:'HIGH', color:'#E24B4A', w:'90%', delay:'0.2s' },
              { label:'MED',  color:'#F5A623', w:'62%', delay:'0.45s' },
              { label:'LOW',  color:'#4A90D9', w:'38%', delay:'0.7s'  },
            ].map(p => (
              <div key={p.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:9, fontWeight:700, color:p.color, width:26, flexShrink:0 }}>{p.label}</span>
                <div style={{ flex:1, height:6, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:0, background:p.color, borderRadius:3, animation:`fillBar 1.2s ease ${p.delay} forwards` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Dark/light mode */}
        <div className="feat-anim-card" style={{ animationDelay:'0.1s' }}>
          <div className="fac-header">
            <div className="fac-icon" style={{ background:'rgba(74,144,217,0.15)' }}><Moon size={15} color="#4A90D9"/></div>
            <div className="fac-title">Dark &amp; light mode</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:12 }}>One click — seamlessly switches themes.</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Sun size={14} color={darkMode ? 'var(--text3)' : '#F5A623'}/>
            <div
              onClick={() => setDarkMode(v => !v)}
              style={{ width:38, height:22, borderRadius:11, background:darkMode?'var(--accent2)':'var(--surface3)', position:'relative', cursor:'pointer', transition:'background 0.3s', flexShrink:0 }}
            >
              <div style={{ width:16, height:16, borderRadius:'50%', background:'white', position:'absolute', top:3, left:darkMode?19:3, transition:'left 0.3s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
            </div>
            <Moon size={14} color={darkMode ? '#4A90D9' : 'var(--text3)'}/>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{darkMode ? 'Dark' : 'Light'}</span>
          </div>
        </div>

        {/* 3. Mobile first */}
        <div className="feat-anim-card" style={{ animationDelay:'0.15s' }}>
          <div className="fac-header">
            <div className="fac-icon" style={{ background:'rgba(45,203,122,0.15)' }}><Smartphone size={15} color="#2DCB7A"/></div>
            <div className="fac-title">Mobile first</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:10 }}>Full bottom nav — add slots on the go.</div>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <div style={{ width:58, height:92, border:'1.5px solid var(--border2)', borderRadius:10, background:'var(--surface2)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ height:11, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:18, height:3, background:'var(--surface2)', borderRadius:2 }}/>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3, padding:4 }}>
                {[{bg:'rgba(255,107,53,0.4)',d:'0.3s'},{bg:'var(--surface3)',d:'0.45s'},{bg:'rgba(74,144,217,0.3)',d:'0.6s'},{bg:'var(--surface3)',d:'0.75s'}].map((s,i) => (
                  <div key={i} style={{ height:9, borderRadius:2, background:s.bg, animation:`fadeCard 0.4s ease ${s.d} backwards` }}/>
                ))}
              </div>
              <div style={{ height:16, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'space-around', padding:'0 6px' }}>
                {['var(--accent)','var(--surface2)','var(--surface2)','var(--surface2)'].map((c,i) => (
                  <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Recurring slots */}
        <div className="feat-anim-card" style={{ animationDelay:'0.2s' }}>
          <div className="fac-header">
            <div className="fac-icon" style={{ background:'rgba(245,166,35,0.15)' }}><RefreshCw size={15} color="#F5A623"/></div>
            <div className="fac-title">Recurring slots</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:10 }}>Set daily routines once, done forever.</div>
          <div style={{ display:'flex', gap:4 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => {
              const on = [0,2,4].includes(i);
              return (
                <div key={d+i} style={{ width:22, height:22, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, background:on?'rgba(245,166,35,0.8)':'var(--surface3)', color:on?'#1a1a18':'var(--text3)', animation:`popIn 0.3s ease ${0.3+i*0.06}s backwards` }}>{d}</div>
              );
            })}
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', marginTop:6 }}>Gym repeats every M · W · F</div>
        </div>

        {/* 5. Progress & streaks */}
        <div className="feat-anim-card" style={{ animationDelay:'0.25s' }}>
          <div className="fac-header">
            <div className="fac-icon" style={{ background:'rgba(255,107,53,0.15)' }}><TrendingUp size={15} color="#FF6B35"/></div>
            <div className="fac-title">Progress &amp; streaks</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:10 }}>Visual bars and streaks that keep you going.</div>
          <div style={{ display:'flex', gap:3, marginBottom:6 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ width:18, height:18, borderRadius:4, background:i < 5 ? 'var(--accent)' : 'rgba(255,107,53,0.2)', animation:`popIn 0.3s ease ${0.3+i*0.07}s backwards` }}/>
            ))}
          </div>
          <div style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>🔥 5-day streak — keep it going!</div>
        </div>

        {/* 6. Secure auth */}
        <div className="feat-anim-card" style={{ animationDelay:'0.3s' }}>
          <div className="fac-header">
            <div className="fac-icon" style={{ background:'rgba(74,144,217,0.15)' }}><ShieldCheck size={15} color="#4A90D9"/></div>
            <div className="fac-title">Secure auth</div>
          </div>
          <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:10 }}>Google or email, NextAuth-powered, encrypted.</div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:20, height:14, border:'2px solid var(--accent2)', borderBottom:'none', borderRadius:'10px 10px 0 0', animation:'lockUp 1s ease 0.5s forwards' }}/>
            <div style={{ width:30, height:22, borderRadius:5, background:'rgba(74,144,217,0.15)', border:'1.5px solid var(--accent2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldCheck size={12} color="#4A90D9"/>
            </div>
            <div style={{ display:'flex', gap:4, marginTop:2 }}>
              {[0,0.3,0.6].map((d,i) => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent2)', animation:`blink 1.5s ease ${d}s infinite` }}/>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── COMPANY section ──────────────────────────────────────────────
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
// ─── ABOUT section ────────────────────────────────────────────────
function AboutSection() {
  const team = [
    { i:'AK', n:'Aathiya K.',  r:'Founder & Designer', c:'var(--accent)'  },
    { i:'RJ', n:'Raj J.',      r:'Lead Engineer',       c:'var(--accent2)' },
    { i:'PM', n:'Priya M.',    r:'Product & Growth',    c:'var(--accent3)' },
    { i:'SK', n:'Sai K.',      r:'Backend & Infra',     c:'var(--accent4)' },
  ];
  return (
    <div style={{ padding:'36px 40px' }}>
      <div style={{ display:'inline-flex', padding:'3px 10px', borderRadius:20, background:'rgba(245,166,35,0.12)', color:'var(--accent4)', fontSize:11, fontWeight:600, marginBottom:12 }}>About</div>
      <h2 style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:800, letterSpacing:-0.5, marginBottom:10, color:'var(--text)' }}>Meet the team</h2>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65, marginBottom:24, maxWidth:440 }}>A small team obsessed with productivity and helping people build better habits.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, maxWidth:500 }}>
        {team.map(m => (
          <div key={m.n} className="card" style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:m.c, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:700, flexShrink:0 }}>{m.i}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{m.n}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{m.r}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginTop:16, maxWidth:500 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Want to join us?</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>We're always looking for passionate builders.</div>
        </div>
        <Link href="https://aethersolve.vercel.app/#careers" className="btn btn-primary btn-sm">View open roles →</Link>
      </div>
    </div>
  );
}

// ─── Keyframe injection ───────────────────────────────────────────
const KEYFRAMES = `
@keyframes floatA { 0%,100%{transform:rotate(-8deg) translateY(0);} 50%{transform:rotate(-8deg) translateY(-10px);} }
@keyframes floatB { 0%,100%{transform:rotate(5deg) translateY(0);} 50%{transform:rotate(5deg) translateY(-8px);} }
@keyframes slideCard { from{opacity:0;transform:translateX(-16px);} to{opacity:1;transform:translateX(0);} }
@keyframes popIn { from{opacity:0;transform:scale(0);} to{opacity:1;transform:scale(1);} }
@keyframes fillBar { from{width:0;} to{width:var(--w,100%);} }
@keyframes csvGrow { from{width:0;} to{width:var(--cw,80%);} }
@keyframes riseBar { from{height:0 !important;} to{} }
@keyframes growLine { from{height:0;} to{height:100%;} }
@keyframes fadeCard { from{opacity:0;} to{opacity:1;} }
@keyframes blink { 0%,100%{opacity:0.25;} 50%{opacity:1;} }
@keyframes lockUp { to{transform:translateY(-3px);opacity:0.35;} }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
@keyframes spin { to{transform:rotate(360deg);} }

.login-anim-card {
  background: rgba(28,28,24,0.6);
  border: 0.5px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 11px 14px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transform: translateX(-16px);
  animation: slideCard 0.5s ease forwards;
}

.feat-anim-card {
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--r2);
  padding: 16px;
  opacity: 0;
  animation: fadeCard 0.4s ease forwards;
}
.fac-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.fac-icon { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fac-title { font-size:13px; font-weight:700; color:var(--text); }
`;

const SECTIONS: Record<NavId, React.ReactNode> = {
  home:     <HomeSection />,
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
    <>
      <style>{KEYFRAMES}</style>
      <div className="app-container" style={{ height:'100dvh' }}>

        {/* ── Left Sidebar ── */}
        <nav className="desktop-sidebar" style={{ width:220, background:'var(--surface)', borderRight:'0.5px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 10px', gap:4, flexShrink:0, position:'relative', zIndex:100 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, width:'100%' }}>
            <div style={{ width:36, height:36, background:'var(--accent)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Activity size={18} color="white" strokeWidth={2.5}/>
            </div>
            <span style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:800, whiteSpace:'nowrap' }}>RhythmIQ</span>
          </div>

          {/* Nav items */}
          {NAV.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <button key={id} onClick={() => setActive(id)}
                style={{ width:'100%', height:40, borderRadius:9, display:'flex', alignItems:'center', gap:10, justifyContent:'flex-start', padding:'0 10px', background:isActive?'var(--accent)':'transparent', color:isActive?'white':'var(--text3)', border:'none', cursor:'pointer', transition:'background 0.15s,color 0.15s', fontFamily:'var(--font-body)', fontSize:13, fontWeight:500, flexShrink:0 }}
                onMouseEnter={e => { if(!isActive){ (e.currentTarget as HTMLElement).style.background='var(--surface2)'; (e.currentTarget as HTMLElement).style.color='var(--text)'; }}}
                onMouseLeave={e => { if(!isActive){ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text3)'; }}}
              >
                <Icon size={17} style={{ flexShrink:0 }}/> <span>{label}</span>
              </button>
            );
          })}

          <div style={{ flex:1 }}/>

          {/* Sign in shortcut */}
          <button onClick={() => setActive('home')}
            style={{ width:'100%', height:40, borderRadius:9, display:'flex', alignItems:'center', gap:10, padding:'0 10px', background:'transparent', color:'var(--text3)', border:'none', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:13, fontWeight:500, transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='var(--surface2)'; (e.currentTarget as HTMLElement).style.color='var(--text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text3)'; }}
          >
            <LogIn size={17}/> <span>Sign in</span>
          </button>

          {/* Guest row */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', width:'100%', marginTop:4 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:11, fontWeight:700, flexShrink:0 }}>?</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Guest</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>Not signed in</div>
            </div>
          </div>
        </nav>

        {/* ── Main area ── */}
        <div className="main-content" style={{ position:'relative' }}>
          {/* Topbar */}
          <div className="topbar">
            <div style={{ fontFamily:'var(--font-head)', fontSize:17, fontWeight:700, flex:1 }}>
              {NAV.find(n => n.id === active)?.label ?? 'RhythmIQ'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text3)' }}>
                <Wifi size={12} color="var(--accent3)"/>
                <span suppressHydrationWarning style={{ fontVariantNumeric:'tabular-nums', minWidth:80 }}>{clock ?? '-- : -- --'}</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setActive('home')}>
                <ChevronLeft size={13}/> Sign in
              </button>
            </div>
          </div>

          {/* Section content — key forces remount → re-animates */}
          <div key={active} className="animate-slide-in">
            {SECTIONS[active]}
          </div>
        </div>
      </div>
    </>
  );
}
