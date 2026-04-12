'use client';
// src/app/login/page.tsx  — standalone marketing layout, no dashboard layout
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Activity, LayoutDashboard, Monitor, Star,
  Users, Info, Mail, Lock, Eye, EyeOff,
  Loader2, LogIn, ChevronLeft, Wifi,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:24, minHeight:0 }}>
      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ width:52,height:52,background:'var(--accent)',borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px' }}>
          <Activity size={26} color="white" strokeWidth={2.5} />
        </div>
        <div style={{ fontFamily:'var(--font-head)',fontSize:22,fontWeight:800 }}>RhythmIQ</div>
        <div style={{ fontSize:13,color:'var(--text3)',marginTop:4 }}>Your smart daily timetable manager</div>
      </div>

      {/* Card */}
      <div className="card" style={{ width:'100%', maxWidth:380, padding:28 }}>
        {/* Mode tabs */}
        <div style={{ display:'flex',gap:2,background:'var(--surface2)',borderRadius:8,padding:3,marginBottom:20 }}>
          {(['login','register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex:1,padding:'7px 0',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',background:mode===m?'var(--surface)':'transparent',color:mode===m?'var(--text)':'var(--text3)',border:'none',boxShadow:mode===m?'var(--shadow)':'none',transition:'all 0.15s',fontFamily:'var(--font-body)',textTransform:'capitalize' }}>{m}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom:12 }}>
              <div className="form-label">Full name</div>
              <input className="form-input" type="text" placeholder="Aathiya" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div style={{ marginBottom:12 }}>
            <div className="form-label"><Mail size={13}/> Email</div>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom:20 }}>
            <div className="form-label"><Lock size={13}/> Password</div>
            <div style={{ position:'relative' }}>
              <input className="form-input" type={showPw?'text':'password'} placeholder="••••••••" style={{ paddingRight:40 }} value={password} onChange={e => setPass(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)' }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%',height:42,justifyContent:'center' }} disabled={loading}>
            {loading && <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }}/>}
            {mode==='login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ display:'flex',alignItems:'center',gap:12,margin:'14px 0' }}>
          <div style={{ flex:1,height:'0.5px',background:'var(--border)' }}/>
          <span style={{ fontSize:12,color:'var(--text3)' }}>or</span>
          <div style={{ flex:1,height:'0.5px',background:'var(--border)' }}/>
        </div>

        <button onClick={() => signIn('google',{callbackUrl:'/dashboard'})} className="btn" style={{ width:'100%',height:42,justifyContent:'center',gap:10 }}>
          <svg viewBox="0 0 24 24" width="17" height="17"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <div style={{ textAlign:'center',marginTop:12,fontSize:11,color:'var(--text3)' }}>
          By continuing you agree to our <a href="#" style={{ color:'var(--accent)' }}>Terms</a> and <a href="#" style={{ color:'var(--accent)' }}>Privacy Policy</a>
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
      <h2 style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,letterSpacing:-0.5,marginBottom:10 }}>Why we built RhythmIQ</h2>
      <p style={{ fontSize:13,color:'var(--text2)',lineHeight:1.65,marginBottom:24,maxWidth:440 }}>We were students drowning in sticky notes and broken spreadsheets.</p>
      <div className="card" style={{ borderLeft:'3px solid var(--accent)',borderRadius:`0 var(--r2) var(--r2) 0`,marginBottom:20 }}>
        <p style={{ fontSize:14,lineHeight:1.75,color:'var(--text2)' }}>"Most productivity apps are built for office workers. We built RhythmIQ for students and self-learners. Every pixel is intentional."</p>
        <div style={{ marginTop:10,fontSize:12,fontWeight:600 }}>— RhythmIQ Team</div>
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
    { i:'AK', n:'Aathiya K.',  r:'Founder & Designer', c:'var(--accent)'  },
    { i:'RJ', n:'Raj J.',      r:'Lead Engineer',       c:'var(--accent2)' },
    { i:'PM', n:'Priya M.',    r:'Product & Growth',    c:'var(--accent3)' },
    { i:'SK', n:'Sai K.',      r:'Backend & Infra',     c:'var(--accent4)' },
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
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',marginTop:16 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:700 }}>Want to join us?</div>
          <div style={{ fontSize:12,color:'var(--text2)',marginTop:3 }}>We're always looking for passionate builders.</div>
        </div>
        <button className="btn btn-primary btn-sm">View open roles →</button>
      </div>
    </div>
  );
}

const SECTIONS: Record<NavId, React.ReactNode> = {
  home:     <AuthCard />,
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