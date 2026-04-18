'use client';
// src/app/dashboard/layout.tsx
// Fix: sidebar state persisted in Zustand (no more collapse on navigate)
// Fix: clock wrapped in suppressHydrationWarning + null guard
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useLiveClock } from '@/hooks/useSocket';
import {
  LayoutDashboard, Calendar, BookOpen, BarChart2, Settings,
  Plus, Sun, Moon, LogOut, ChevronRight, ChevronLeft,
  Activity, Wifi, TableProperties, BookMarked,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/schedule',   label: 'Schedule',   icon: Calendar        },
  { href: '/timetable',  label: 'Timetable',  icon: TableProperties },
  { href: '/reading',    label: 'Reading',    icon: BookMarked      },
  { href: '/academic',   label: 'Academic',   icon: BookOpen        },
  { href: '/analytics',  label: 'Analytics',  icon: BarChart2       },
  { href: '/settings',   label: 'Settings',   icon: Settings        },
];

function Avatar({ name }: { name?: string | null }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'U';
  return (
    <div style={{ width:32,height:32,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:12,fontWeight:600,flexShrink:0 }}>
      {initials}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme, sidebarExpanded, toggleSidebar } = useScheduleStore();
  const clock = useLiveClock(true);

  const currentPage = NAV_ITEMS.find(n => n.href === pathname)?.label || 'timedule';

  return (
    <div className="app-container">
      {/* ── Desktop Sidebar ── */}
      <nav
        style={{
          width: sidebarExpanded ? 220 : 68,
          background: 'var(--surface)',
          borderRight: '0.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '14px 10px',
          gap: 4,
          transition: 'width 0.25s ease',
          flexShrink: 0,
          position: 'relative',
          zIndex: 100,
        }}
        className="desktop-sidebar"
      >
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, width:'100%', justifyContent: sidebarExpanded?'flex-start':'center', overflow:'hidden' }}>
          <div style={{ width:36,height:36,background:'var(--accent)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <Activity size={18} color="white" strokeWidth={2.5} />
          </div>
          {sidebarExpanded && <span style={{ fontFamily:'var(--font-head)',fontSize:16,fontWeight:800,whiteSpace:'nowrap' }}>RhythmIQ</span>}
        </div>

        {/* Nav */}
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                width: sidebarExpanded ? '100%' : 44,
                height: 40,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                gap: sidebarExpanded ? 10 : 0,
                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                padding: sidebarExpanded ? '0 10px' : 0,
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text3)',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 500,
                flexShrink: 0,
              }}
              onMouseEnter={e => { if(!isActive){ (e.currentTarget as HTMLElement).style.background='var(--surface2)'; (e.currentTarget as HTMLElement).style.color='var(--text)'; }}}
              onMouseLeave={e => { if(!isActive){ (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text3)'; }}}
            >
              <Icon size={17} style={{ flexShrink:0 }} />
              {sidebarExpanded && <span style={{ whiteSpace:'nowrap' }}>{label}</span>}
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme==='light'?'dark':'light')}
          style={{ width:sidebarExpanded?'100%':44, height:40, borderRadius:9, display:'flex', alignItems:'center', gap:sidebarExpanded?10:0, justifyContent:sidebarExpanded?'flex-start':'center', padding:sidebarExpanded?'0 10px':0, background:'transparent', color:'var(--text3)', border:'none', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:13, fontWeight:500, transition:'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='var(--surface2)'; (e.currentTarget as HTMLElement).style.color='var(--text)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='var(--text3)'; }}
        >
          {theme==='dark' ? <Sun size={17}/> : <Moon size={17}/>}
          {sidebarExpanded && <span>{theme==='dark'?'Light mode':'Dark mode'}</span>}
        </button>

        {/* Profile */}
        {session?.user && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', width:'100%', justifyContent:sidebarExpanded?'flex-start':'center', marginTop:4 }}>
            <Avatar name={session.user.name} />
            {sidebarExpanded && (
              <>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{session.user.name}</div>
                  <div style={{ fontSize:10,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{session.user.email}</div>
                </div>
                <button onClick={() => signOut({ callbackUrl:'/login' })} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:2,display:'flex' }}>
                  <LogOut size={13}/>
                </button>
              </>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={toggleSidebar}
          style={{ position:'absolute', right:-11, top:68, width:22, height:22, borderRadius:'50%', background:'var(--surface)', border:'0.5px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:10 }}
        >
          {sidebarExpanded ? <ChevronLeft size={11}/> : <ChevronRight size={11}/>}
        </button>
      </nav>

      {/* ── Main ── */}
      <div className="main-content" style={{ position:'relative' }}>
        {/* Topbar */}
        <div className="topbar">
          <div style={{ fontFamily:'var(--font-head)', fontSize:17, fontWeight:700, flex:1 }}>{currentPage}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Live clock — suppress hydration warning, show placeholder until mounted */}
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text3)' }}>
              <Wifi size={12} color="var(--accent3)" />
              <span suppressHydrationWarning style={{ fontVariantNumeric:'tabular-nums', minWidth:80 }}>
                {clock ?? '-- : -- --'}
              </span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/schedule')}>
              <Plus size={13}/> Add slot
            </button>
            <button className="btn btn-icon" onClick={() => setTheme(theme==='light'?'dark':'light')}>
              {theme==='dark' ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
          </div>
        </div>

        {children}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav">
        <div style={{ display:'flex', justifyContent:'space-around' }}>
          {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 10px', borderRadius:8, cursor:'pointer', color:isActive?'var(--accent)':'var(--text3)', background:'none', border:'none', fontFamily:'var(--font-body)', transition:'color 0.15s' }}
              >
                <Icon size={20}/>
                <span style={{ fontSize:10, fontWeight:500 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
