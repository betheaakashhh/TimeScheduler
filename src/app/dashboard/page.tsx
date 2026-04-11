'use client';
// src/app/dashboard/page.tsx  — redesigned with Lucide icons, no emoji in UI
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useScheduleStore, selectTodayStats, selectUpcomingSlots } from '@/store/scheduleStore';
import { useSocket, useLiveClock } from '@/hooks/useSocket';
import { enrichSlots, formatTime, formatDuration } from '@/lib/scheduleUtils';
import { DAY_LEVEL_CONFIG, DayLevel, ScheduleSlot, STRICT_MODE_CONFIG } from '@/types';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  Flame, CheckCircle2, Star, Bell, Lock, Zap, ChevronRight,
  Loader2, ArrowRight, Sun, Sunrise, Sunset, Moon,
  BookOpen, Dumbbell, Coffee, Utensils, PersonStanding,
  TrendingUp, AlertTriangle, Calendar, Clock, MapPin, Radio,
  Plus, X,
} from 'lucide-react';

// ─── Tag icon map (Lucide icons instead of emoji) ───────────────────────────
const TAG_ICON: Record<string, any> = {
  BREAKFAST: Coffee, MORNING_ROUTINE: Sunrise, GYM: Dumbbell, WORKOUT: Dumbbell,
  COLLEGE: BookOpen, SCHOOL: BookOpen, SELF_STUDY: BookOpen,
  WALK: PersonStanding, DINNER: Utensils, LUNCH: Utensils,
  WORK: TrendingUp, SLEEP: Moon, MEDITATION: Star, READING: BookOpen, CUSTOM: Calendar,
};

// ─── Greeting based on hour ─────────────────────────────────────────────────
function useGreeting(name: string) {
  const [greeting, setGreeting] = useState('Welcome back');
  const [sub, setSub] = useState('Your schedule is ready.');
  const [GIcon, setGIcon] = useState<any>(Sunrise);
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12)      { setGreeting(`Good morning, ${name}`); setSub('Start strong — your day is mapped out.'); setGIcon(Sunrise); }
    else if (h < 17) { setGreeting(`Good afternoon, ${name}`); setSub("Keep the momentum going — you're doing great."); setGIcon(Sun); }
    else if (h < 21) { setGreeting(`Good evening, ${name}`); setSub('Wind down well and finish your remaining tasks.'); setGIcon(Sunset); }
    else             { setGreeting(`Good night, ${name}`); setSub("Rest up — tomorrow's schedule is ready for you."); setGIcon(Moon); }
  }, [name]);
  return { greeting, sub, GIcon };
}

// ─── Day level logic ────────────────────────────────────────────────────────
function getLevel(pct: number): DayLevel {
  if (pct >= 0.95) return 6;
  if (pct >= 0.80) return 5;
  if (pct >= 0.65) return 4;
  if (pct >= 0.50) return 3;
  if (pct >= 0.25) return 2;
  return 1;
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, Icon }: { label:string; value:string|number; sub?:string; accent?:string; Icon:any }) {
  return (
    <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text3)', fontWeight:500, marginBottom:8 }}>
        <Icon size={13} color={accent||'var(--text3)'} /> {label}
      </div>
      <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:700, color:accent||'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ─── Level track (icon-based, no emoji) ─────────────────────────────────────
const LEVEL_ICONS = [TrendingUp, Zap, Star, Flame, CheckCircle2, Crown];
function Crown(props:any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 20h20M5 20V10l7-6 7 6v10"/><path d="M9 20v-5h6v5"/></svg>;
}
function LevelTrack({ level, done, total }: { level:DayLevel; done:number; total:number }) {
  const LEVELS: DayLevel[] = [1,2,3,4,5,6];
  const nextLevel = Math.min(level+1,6) as DayLevel;
  const nextCfg = DAY_LEVEL_CONFIG[nextLevel];
  const nextMin = nextCfg.minRate;
  const tasksNeeded = total > 0 ? Math.max(0, Math.ceil(nextMin*total)-done) : 0;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        {LEVELS.map((lv,i) => {
          const cfg = DAY_LEVEL_CONFIG[lv];
          const IconComp = LEVEL_ICONS[i] || Star;
          const isDone   = lv < level;
          const isActive = lv === level;
          const isLocked = lv > level;
          return (
            <div key={lv} style={{ display:'flex', alignItems:'center', flex:1 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <div style={{
                  width:42, height:42, borderRadius:'50%',
                  background: isDone?'var(--accent3)': isActive?'var(--accent)':'var(--surface)',
                  border: `2px solid ${isDone?'var(--accent3)':isActive?'var(--accent)':'var(--border2)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity: isLocked?0.28:1,
                  boxShadow: isActive?'0 0 0 4px rgba(255,107,53,0.14)':'none',
                  transition:'all 0.3s',
                  position:'relative',
                }}>
                  <IconComp size={17} color={isDone||isActive?'white':'var(--text3)'} />
                </div>
                <div style={{ fontSize:9, color:isActive?'var(--accent)':'var(--text3)', textAlign:'center', maxWidth:46, lineHeight:1.2 }}>{cfg.label}</div>
              </div>
              {i < LEVELS.length-1 && (
                <div style={{ flex:1, height:2, background:isDone?'var(--accent3)':'var(--border)', borderRadius:1, alignSelf:'center', marginBottom:18, transition:'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>
        {level===6 ? 'Maximum level reached today — legendary!' :
          tasksNeeded===0 ? `Almost at ${nextCfg.label}!` :
          `Complete ${tasksNeeded} more task${tasksNeeded>1?'s':''} to reach ${nextCfg.label}`}
      </div>
    </div>
  );
}

// ─── Mini slot card (dashboard timeline) ────────────────────────────────────
function MiniSlot({ slot, onDone, onSkip }: { slot:ScheduleSlot; onDone:()=>void; onSkip:()=>void }) {
  const [exp, setExp] = useState(false);
  const TagIcon = TAG_ICON[slot.tag] || Calendar;
  const isDone    = slot.status === 'COMPLETED';
  const isActive  = !!slot.isCurrentlyActive;
  const isBlocked = slot.status === 'BLOCKED';
  const strictCfg = slot.isStrict ? STRICT_MODE_CONFIG[slot.strictMode] : null;

  return (
    <div
      onClick={() => !isBlocked && setExp(e=>!e)}
      style={{
        background: isDone?'rgba(29,158,117,0.03)':'var(--surface)',
        border: `0.5px solid ${isDone?'rgba(29,158,117,0.3)':isActive?'var(--accent)':isBlocked?'rgba(226,75,74,0.25)':'var(--border)'}`,
        borderRadius:10, padding:'11px 14px', cursor:isBlocked?'default':'pointer',
        position:'relative', overflow:'hidden', marginBottom:8,
        boxShadow: isActive?'0 0 0 2px rgba(255,107,53,0.1)':'none',
        opacity: isBlocked?0.55:1,
      }}
    >
      {/* Strict left bar */}
      {slot.isStrict && (
        <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:slot.strictMode==='HARD'?'#E24B4A':slot.strictMode==='WARN'?'var(--accent4)':'var(--accent2)',borderRadius:'3px 0 0 3px' }} />
      )}

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <div style={{ width:30,height:30,borderRadius:8,background:isDone?'rgba(29,158,117,0.1)':isActive?'rgba(255,107,53,0.1)':'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <TagIcon size={15} color={isDone?'var(--accent3)':isActive?'var(--accent)':'var(--text3)'} />
        </div>
        <span style={{ fontSize:13,fontWeight:500,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{slot.title}</span>
        {strictCfg && (
          <span style={{ fontSize:10,padding:'2px 6px',borderRadius:20,fontWeight:600,background:slot.strictMode==='HARD'?'rgba(226,75,74,0.1)':slot.strictMode==='WARN'?'rgba(186,117,23,0.1)':'rgba(55,138,221,0.1)',color:slot.strictMode==='HARD'?'#791F1F':slot.strictMode==='WARN'?'#633806':'#0C447C',flexShrink:0 }}>
            {slot.strictMode}
          </span>
        )}
        {isDone && <CheckCircle2 size={14} color="var(--accent3)" />}
        {isBlocked && <Lock size={13} color="#E24B4A" />}
      </div>

      <div style={{ fontSize:11, color:'var(--text3)', display:'flex', alignItems:'center', gap:8 }}>
        <Clock size={11} />
        {formatTime(slot.startTime)} – {formatTime(slot.endTime)} · {formatDuration(slot.startTime, slot.endTime)}
        {isActive && <span style={{ color:'var(--accent)',fontWeight:600 }}>● {slot.minutesLeft}m left</span>}
      </div>

      {isActive && !isDone && (
        <div style={{ height:3,background:'var(--surface2)',borderRadius:2,overflow:'hidden',marginTop:7 }}>
          <div style={{ height:'100%',background:'var(--accent)',borderRadius:2,width:`${slot.progress||0}%`,transition:'width 0.5s' }} />
        </div>
      )}

      {exp && (
        <div onClick={e=>e.stopPropagation()} style={{ marginTop:10,paddingTop:10,borderTop:'0.5px solid var(--border)',display:'flex',gap:8 }}>
          {!isDone && !slot.isAutoMark && !isBlocked && (
            <button className="btn btn-primary btn-sm" style={{ flex:1,justifyContent:'center' }} onClick={onDone}>
              <CheckCircle2 size={13}/> Mark done
            </button>
          )}
          {!isDone && slot.isStrict && !isBlocked && (
            <button className="btn btn-sm" style={{ color:'#E24B4A',borderColor:'rgba(226,75,74,0.3)' }} onClick={onSkip}>Skip</button>
          )}
          {isDone && <span style={{ fontSize:12,color:'var(--accent3)',fontWeight:500,display:'flex',alignItems:'center',gap:5 }}><CheckCircle2 size=12/> Completed</span>}
          {isBlocked && <span style={{ fontSize:12,color:'#A32D2D',display:'flex',alignItems:'center',gap:5 }}><Lock size={12}/> Unlock prior task first</span>}
        </div>
      )}
    </div>
  );
}

// ─── Timetable grid view ─────────────────────────────────────────────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HOURS = Array.from({length:18},(_,i)=>i+5); // 5 AM – 10 PM

function TimetableView({ slots }: { slots: ScheduleSlot[] }) {
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot|null>(null);

  // Build a map: dayIndex -> list of slots with their row positions
  function slotPos(slot: ScheduleSlot) {
    const [sh,sm] = slot.startTime.split(':').map(Number);
    const [eh,em] = slot.endTime.split(':').map(Number);
    const rowStart = (sh - 5) * 60 + sm; // minutes from 5AM
    const rowEnd   = (eh - 5) * 60 + em;
    return { rowStart, rowEnd, height: rowEnd - rowStart };
  }

  const CELL_MIN = 3; // px per minute
  const totalHeight = 18 * 60 * CELL_MIN; // 5AM–11PM

  return (
    <div style={{ position:'relative' }}>
      {/* Grid header */}
      <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)', gap:0, borderBottom:'0.5px solid var(--border)', marginBottom:0 }}>
        <div style={{ padding:'8px 4px', fontSize:11, color:'var(--text3)' }} />
        {DAYS.map((d,i) => {
          const now = new Date();
          const todayIdx = now.getDay()===0?6:now.getDay()-1; // 0=Mon
          return (
            <div key={d} style={{ padding:'8px 4px', fontSize:12, fontWeight:500, textAlign:'center', color:i===todayIdx?'var(--accent)':'var(--text2)', borderLeft:'0.5px solid var(--border)' }}>
              {d}{i===todayIdx&&<div style={{width:5,height:5,borderRadius:'50%',background:'var(--accent)',margin:'2px auto 0'}}/>}
            </div>
          );
        })}
      </div>

      {/* Scrollable body */}
      <div style={{ overflowY:'auto', maxHeight:520, position:'relative' }}>
        <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,1fr)', gap:0, position:'relative', height:totalHeight }}>
          {/* Hour labels */}
          <div style={{ position:'relative' }}>
            {HOURS.map(h => (
              <div key={h} style={{ position:'absolute', top:(h-5)*60*CELL_MIN, left:0, right:0, padding:'1px 4px', fontSize:10, color:'var(--text3)', borderTop:'0.5px solid var(--border)' }}>
                {h>12?`${h-12}pm`:h===12?'12pm':`${h}am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((d,dayIdx) => {
            const dayNum = dayIdx+1; // 1=Mon
            const daySlots = slots.filter(s=>s.repeatDays.includes(dayNum));
            const TagIcon_local = (slot:ScheduleSlot) => { const I=TAG_ICON[slot.tag]||Calendar; return <I size={11}/>; };

            return (
              <div key={d} style={{ borderLeft:'0.5px solid var(--border)', position:'relative', height:totalHeight }}>
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div key={h} style={{ position:'absolute', top:(h-5)*60*CELL_MIN, left:0, right:0, borderTop:'0.5px solid var(--border)', pointerEvents:'none' }} />
                ))}

                {/* Slot blocks */}
                {daySlots.map(slot => {
                  const pos = slotPos(slot);
                  if (pos.rowStart<0 || pos.height<=0) return null;
                  const isDone    = slot.status==='COMPLETED';
                  const isActive  = !!slot.isCurrentlyActive;
                  const isBlocked = slot.status==='BLOCKED';
                  const TagI = TAG_ICON[slot.tag]||Calendar;

                  return (
                    <div
                      key={slot.id}
                      onClick={()=>setSelectedSlot(slot)}
                      style={{
                        position:'absolute',
                        top: pos.rowStart*CELL_MIN+1,
                        left:2, right:2,
                        height: Math.max(pos.height*CELL_MIN-2, 20),
                        borderRadius:6,
                        background: isDone?'rgba(29,158,117,0.12)':isActive?'rgba(255,107,53,0.12)':isBlocked?'rgba(226,75,74,0.08)':'var(--surface2)',
                        border: `1px solid ${isDone?'rgba(29,158,117,0.4)':isActive?'rgba(255,107,53,0.4)':isBlocked?'rgba(226,75,74,0.3)':'var(--border2)'}`,
                        cursor:'pointer',
                        overflow:'hidden',
                        padding:'2px 5px',
                        boxShadow: isActive?'0 0 0 1.5px rgba(255,107,53,0.25)':'none',
                        transition:'all 0.15s',
                        zIndex:1,
                      }}
                      title={`${slot.title} · ${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`}
                    >
                      <div style={{ display:'flex',alignItems:'center',gap:3 }}>
                        <TagI size={10} color={isDone?'#085041':isActive?'#712B13':'var(--text3)'} />
                        <span style={{ fontSize:10,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:isDone?'#085041':isActive?'#712B13':'var(--text2)' }}>
                          {slot.title}
                        </span>
                      </div>
                      {pos.height >= 30 && (
                        <div style={{ fontSize:9,color:'var(--text3)',marginTop:1 }}>
                          {formatTime(slot.startTime)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected slot detail panel */}
      {selectedSlot && (
        <div style={{ position:'relative', marginTop:16 }}>
          <div style={{ background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:10,padding:16 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                {(() => { const I=TAG_ICON[selectedSlot.tag]||Calendar; return <I size={18} color="var(--accent)"/>; })()}
                <span style={{ fontWeight:500,fontSize:14 }}>{selectedSlot.title}</span>
                {selectedSlot.status==='COMPLETED'&&<CheckCircle2 size={14} color="var(--accent3)"/>}
              </div>
              <button onClick={()=>setSelectedSlot(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)' }}><X size={15}/></button>
            </div>
            <div style={{ display:'flex',gap:16,fontSize:12,color:'var(--text3)',marginBottom:8 }}>
              <span style={{ display:'flex',alignItems:'center',gap:4 }}><Clock size={11}/>{formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}</span>
              <span>{formatDuration(selectedSlot.startTime,selectedSlot.endTime)}</span>
              {selectedSlot.isStrict&&<span style={{ color:'#A32D2D',fontWeight:500 }}>{selectedSlot.strictMode} strict</span>}
            </div>
            {selectedSlot.description&&<div style={{ fontSize:12,color:'var(--text3)',marginBottom:8 }}>{selectedSlot.description}</div>}
            {selectedSlot.checklist&&selectedSlot.checklist.length>0&&(
              <div style={{ borderTop:'0.5px solid var(--border)',paddingTop:8,marginTop:4 }}>
                {(selectedSlot.checklist as any[]).map((item:any)=>(
                  <div key={item.id} style={{ display:'flex',alignItems:'center',gap:7,padding:'3px 0',fontSize:12 }}>
                    <input type="checkbox" readOnly checked={selectedSlot.status==='COMPLETED'} style={{ accentColor:'var(--accent)' }}/>
                    <span>{item.label}</span>
                    {item.required&&<span style={{ fontSize:9,color:'#A32D2D',fontWeight:600 }}>required</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex',gap:8,marginTop:10 }}>
              {selectedSlot.status!=='COMPLETED'&&!selectedSlot.isAutoMark&&selectedSlot.status!=='BLOCKED'&&(
                <button className="btn btn-primary btn-sm" style={{ flex:1,justifyContent:'center' }}>
                  <CheckCircle2 size={13}/> Mark done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const clock  = useLiveClock(false);

  const { slots, streak, currentPeriod, nextPeriod, setSlots, setStreak } = useScheduleStore();
  const [isLoading, setIsLoading]   = useState(true);
  const [foodItems, setFoodItems]   = useState<string[]>([]);
  const [foodInput, setFoodInput]   = useState('');
  const [bfLogged, setBfLogged]     = useState(false);
  const [dashView, setDashView]     = useState<'timeline'|'table'>('timeline');

  const today  = dayjs().format('YYYY-MM-DD');
  const userId = session?.user ? (session.user as any).id : undefined;
  const { markComplete, markSkip } = useSocket(userId);

  const stats = selectTodayStats({ slots } as any);
  const level = getLevel(stats.rate);
  const firstName = session?.user?.name?.split(' ')[0] || 'there';
  const { greeting, sub, GIcon } = useGreeting(firstName);

  useEffect(() => {
    if (authStatus==='unauthenticated') router.push('/login');
  }, [authStatus, router]);

  useEffect(() => {
    if (!session?.user) return;
    async function load(){
      setIsLoading(true);
      try {
        const [sr,str] = await Promise.all([fetch(`/api/schedule?date=${today}`), fetch('/api/streak')]);
        const [sd,strd] = await Promise.all([sr.json(), str.json()]);
        const { enrichSlots } = await import('@/lib/scheduleUtils');
        setSlots(enrichSlots(sd));
        setStreak(strd);
      } catch { toast.error('Failed to load schedule'); }
      finally { setIsLoading(false); }
    }
    load();
  }, [session, today, setSlots, setStreak]);

  const handleMarkDone = useCallback((slotId:string) => {
    const s=slots.find(x=>x.id===slotId); if(!s)return;
    if(s.foodRequired&&!bfLogged&&foodItems.length===0){toast.error('Log your food first!');return;}
    markComplete(slotId,today);
    toast.success(`${s.title} done!`);
  },[slots,markComplete,today,bfLogged,foodItems]);

  const handleSkip = useCallback((slotId:string) => {
    const s=slots.find(x=>x.id===slotId); if(!s)return;
    const msg=s.strictMode==='HARD'?'Blocks all later tasks!':'Breaks your streak!';
    if(!confirm(msg+'\nSkip?'))return;
    markSkip(slotId,today);
    toast(`Skipped: ${s.title}`,{icon:'⚠️'});
  },[slots,markSkip,today]);

  const handleLogBreakfast = useCallback(async () => {
    if(!foodItems.length){toast.error('Add at least one item');return;}
    try {
      const r=await fetch('/api/food-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mealType:'BREAKFAST',items:foodItems,date:today})});
      if(!r.ok)throw new Error();
      setBfLogged(true); toast.success('Breakfast logged!');
    } catch { toast.error('Failed to log breakfast'); }
  },[foodItems,today]);

  if (authStatus==='loading'||isLoading) {
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',gap:10,color:'var(--text3)' }}>
        <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }}/> Loading your schedule…
      </div>
    );
  }

  const upcomingSlots = selectUpcomingSlots({ slots } as any);
  const mainSlots     = slots.slice(0,6);
  const currentSlot   = slots.find(s=>s.isCurrentlyActive);

  return (
    <div style={{ padding:20 }}>
      {/* ── Greeting banner (icon-based, no emoji) ── */}
      <div style={{ background:'var(--accent)',borderRadius:14,padding:'18px 22px',color:'white',marginBottom:18,display:'flex',alignItems:'center',gap:16 }}>
        <div style={{ width:48,height:48,borderRadius:12,background:'rgba(255,255,255,0.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <GIcon size={26} color="white" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-head)',fontSize:20,fontWeight:700,marginBottom:2 }}>{greeting}</div>
          <div style={{ fontSize:13,opacity:0.85 }}>{sub}</div>
        </div>
        <div style={{ textAlign:'right',flexShrink:0 }}>
          <div suppressHydrationWarning style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,lineHeight:1 }}>{clock??'--:--'}</div>
          <div style={{ fontSize:11,opacity:0.75,marginTop:2 }}>{dayjs().format('ddd, D MMM')}</div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18 }}>
        <StatCard label="Day Streak"    value={`${streak?.current||0} days`} sub={`Best: ${streak?.best||0}`}     accent="var(--accent4)" Icon={Flame} />
        <StatCard label="Done Today"    value={`${stats.done} / ${stats.total}`} sub={`${stats.pct}% complete`}  accent="var(--accent3)" Icon={CheckCircle2} />
        <StatCard label="Today's Level" value={DAY_LEVEL_CONFIG[level].label}  sub={`Level ${level} of 6`}       accent="var(--accent2)" Icon={TrendingUp} />
        <StatCard label="Email Alerts"  value={slots.filter(s=>s.emailAlert).length} sub="reminders active"      Icon={Bell} />
      </div>

      {/* ── Level bar ── */}
      <div style={{ background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:14,padding:18,marginBottom:18 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <div style={{ fontFamily:'var(--font-head)',fontSize:14,fontWeight:700 }}>Today's Level Journey</div>
          <span style={{ fontSize:11,color:'var(--text3)' }}>Resets at midnight</span>
        </div>
        <LevelTrack level={level} done={stats.done} total={stats.total} />
      </div>

      {/* ── Active class banner ── */}
      {currentPeriod && (
        <div style={{ background:'var(--surface2)',border:'0.5px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:18,display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--accent3)',animation:'pulse 2s infinite',flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:500,marginBottom:2 }}>{currentPeriod.subject}</div>
            <div style={{ fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:8 }}>
              <Clock size={11}/>{formatTime(currentPeriod.startTime)} – {formatTime(currentPeriod.endTime)}
              {(currentPeriod as any).room&&<span style={{ display:'flex',alignItems:'center',gap:3 }}><MapPin size={10}/>{(currentPeriod as any).room}</span>}
            </div>
          </div>
          {nextPeriod&&(
            <div style={{ textAlign:'right',fontSize:12 }}>
              <div style={{ color:'var(--text3)',marginBottom:2 }}>Up next</div>
              <div style={{ fontWeight:500 }}>{nextPeriod.subject}</div>
            </div>
          )}
          <div style={{ fontSize:11,color:'var(--accent)',fontWeight:600 }}>
            {(currentPeriod as any).minutesLeft||'?'}m left
          </div>
        </div>
      )}

      {/* ── Timeline / Table view toggle ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:18,alignItems:'start' }}>
        <div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
            <div style={{ fontFamily:'var(--font-head)',fontSize:14,fontWeight:700 }}>Today's Schedule</div>
            <div style={{ display:'flex',gap:4 }}>
              <div style={{ display:'flex',gap:2,background:'var(--surface2)',borderRadius:7,padding:2 }}>
                {(['timeline','table'] as const).map(v=>(
                  <button key={v} onClick={()=>setDashView(v)} style={{ padding:'4px 12px',borderRadius:6,fontSize:12,fontWeight:500,cursor:'pointer',background:dashView===v?'var(--surface)':'transparent',color:dashView===v?'var(--text)':'var(--text3)',border:'none',fontFamily:'var(--font-body)',transition:'all 0.15s',textTransform:'capitalize' }}>{v}</button>
                ))}
              </div>
              <button className="btn btn-sm" onClick={()=>router.push('/schedule')}>View all <ArrowRight size={12}/></button>
            </div>
          </div>

          {/* Active slot highlight */}
          {currentSlot&&dashView==='timeline'&&(
            <div style={{ background:'var(--accent)',color:'white',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
              <Radio size={16} color="white"/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:600 }}>{currentSlot.title}</div>
                <div style={{ fontSize:11,opacity:0.85 }}>{formatTime(currentSlot.startTime)} – {formatTime(currentSlot.endTime)}</div>
              </div>
              <div style={{ fontSize:12,opacity:0.9 }}>{currentSlot.minutesLeft}m left</div>
            </div>
          )}

          {dashView==='timeline'?(
            <div>
              {mainSlots.map((slot,i)=>(
                <div key={slot.id} style={{ display:'flex',gap:10 }}>
                  <div style={{ width:56,flexShrink:0,textAlign:'right',paddingTop:13 }}>
                    <div style={{ fontSize:10,color:slot.isCurrentlyActive?'var(--accent)':'var(--text3)',fontWeight:slot.isCurrentlyActive?500:400 }}>
                      {formatTime(slot.startTime)}
                    </div>
                  </div>
                  <div style={{ width:20,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center' }}>
                    <div style={{ marginTop:12, position:'relative' }}>
                      {slot.isCurrentlyActive&&<div style={{ position:'absolute',inset:-5,borderRadius:'50%',border:'2px solid var(--accent)',opacity:.3,animation:'pulse 2s infinite' }}/>}
                      <div style={{ width:10,height:10,borderRadius:'50%',background:slot.status==='COMPLETED'?'var(--accent3)':slot.isCurrentlyActive?'var(--accent)':slot.status==='BLOCKED'?'#E24B4A':'var(--surface3)',border:`2px solid ${slot.status==='COMPLETED'?'var(--accent3)':slot.isCurrentlyActive?'var(--accent)':slot.status==='BLOCKED'?'#E24B4A':'var(--border2)'}` }} />
                    </div>
                    {i<mainSlots.length-1&&<div style={{ flex:1,width:1.5,background:slot.status==='COMPLETED'?'rgba(29,158,117,0.3)':'var(--border)',marginTop:4 }}/>}
                  </div>
                  <div style={{ flex:1,paddingBottom:8 }}>
                    <MiniSlot slot={slot} onDone={()=>handleMarkDone(slot.id)} onSkip={()=>handleSkip(slot.id)}/>
                  </div>
                </div>
              ))}
            </div>
          ):(
            <div style={{ background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,overflow:'hidden' }}>
              <TimetableView slots={slots}/>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {/* Streak */}
          <div style={{ background:'var(--surface)',border:`0.5px solid ${stats.pct<60&&slots.length>0?'rgba(226,75,74,0.3)':'rgba(186,117,23,0.25)'}`,borderRadius:12,padding:16 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:stats.pct<60&&streak?.current&&streak.current>0?'rgba(226,75,74,0.1)':'rgba(186,117,23,0.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Flame size={20} color={stats.pct<60&&streak?.current&&streak.current>0?'#E24B4A':'var(--accent4)'} />
              </div>
              <div>
                <div style={{ display:'flex',alignItems:'baseline',gap:5 }}>
                  <span style={{ fontFamily:'var(--font-head)',fontSize:26,fontWeight:800,color:'var(--accent4)' }}>{streak?.current||0}</span>
                  <span style={{ fontSize:13,fontWeight:500,color:'var(--text2)' }}>day streak</span>
                </div>
                <div style={{ fontSize:11,color:'var(--text3)' }}>Best: {streak?.best||0} days</div>
              </div>
            </div>
            <div style={{ height:4,background:'var(--surface2)',borderRadius:2,overflow:'hidden' }}>
              <div style={{ height:'100%',background:'var(--accent4)',borderRadius:2,width:`${Math.min(100,((streak?.current||0)/Math.max(streak?.best||1,1))*100)}%`,transition:'width 0.5s' }}/>
            </div>
            {stats.pct<60&&streak?.current&&streak.current>0?(
              <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:8,fontSize:12,color:'#A32D2D' }}>
                <AlertTriangle size={13}/> Streak at risk — complete more tasks today!
              </div>
            ):(
              <div style={{ fontSize:11,color:'var(--text3)',marginTop:8 }}>Keep going — don't break the chain!</div>
            )}
          </div>

          {/* Upcoming */}
          <div style={{ background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:16 }}>
            <div style={{ fontFamily:'var(--font-head)',fontSize:13,fontWeight:700,marginBottom:10 }}>Up Next</div>
            {upcomingSlots.length===0?(
              <div style={{ fontSize:13,color:'var(--text3)',display:'flex',alignItems:'center',gap:6 }}><CheckCircle2 size={14} color="var(--accent3)"/> All done for today!</div>
            ):(
              upcomingSlots.map((s:ScheduleSlot)=>{
                const I=TAG_ICON[s.tag]||Calendar;
                return (
                  <div key={s.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:'0.5px solid var(--border)' }}>
                    <div style={{ width:28,height:28,borderRadius:7,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <I size={14} color="var(--text3)"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:500 }}>{s.title}</div>
                      <div style={{ fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:3 }}><Clock size={10}/>{formatTime(s.startTime)}</div>
                    </div>
                    {s.isStrict&&<span style={{ fontSize:9,padding:'2px 6px',borderRadius:20,fontWeight:600,background:s.strictMode==='HARD'?'rgba(226,75,74,0.1)':'rgba(186,117,23,0.1)',color:s.strictMode==='HARD'?'#791F1F':'#633806' }}>{s.strictMode}</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Breakfast log */}
          {!bfLogged&&(
            <div style={{ background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:16 }}>
              <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:4 }}>
                <Coffee size={16} color="var(--accent)"/>
                <span style={{ fontFamily:'var(--font-head)',fontSize:13,fontWeight:700 }}>Log Breakfast</span>
              </div>
              <div style={{ fontSize:12,color:'var(--text3)',marginBottom:10 }}>Add food items to unlock gated tasks</div>
              <div style={{ display:'flex',gap:7,marginBottom:8 }}>
                <input className="form-input" style={{ flex:1,padding:'6px 10px',fontSize:12 }} placeholder="e.g. Idli, chai…" value={foodInput}
                  onChange={e=>setFoodInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&foodInput.trim()){setFoodItems(p=>[...p,foodInput.trim()]);setFoodInput('');}}}
                />
                <button className="btn btn-primary btn-sm" onClick={()=>{if(foodInput.trim()){setFoodItems(p=>[...p,foodInput.trim()]);setFoodInput('');}}}>
                  <Plus size={13}/>
                </button>
              </div>
              {foodItems.length>0&&(
                <div style={{ display:'flex',flexWrap:'wrap',gap:5,marginBottom:10 }}>
                  {foodItems.map((item,i)=>(
                    <div key={i} style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:20,background:'var(--surface2)',border:'0.5px solid var(--border)',fontSize:12 }}>
                      {item}
                      <button onClick={()=>setFoodItems(p=>p.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14,lineHeight:1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={handleLogBreakfast}>
                <CheckCircle2 size={13}/> Log & unlock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
