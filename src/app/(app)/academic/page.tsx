'use client';
// src/app/(app)/academic/page.tsx
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Upload, RefreshCw, UserX, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

const AcademicSubTimeline = dynamic(() => import('@/components/academic/AcademicSubTimeline'), { ssr: false });
const CsvImport           = dynamic(() => import('@/components/academic/CsvImport'),           { ssr: false });

export default function AcademicPage() {
  const [tab, setTab] = useState<'live' | 'import' | 'absence'>('live');
  const [refreshKey, setRefreshKey] = useState(0);
  const [absences, setAbsences] = useState<{ id: string; date: string; reason?: string }[]>([]);
  const [absLoaded, setAbsLoaded] = useState(false);
  const [markingDate, setMarkingDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [markingReason, setMarkingReason] = useState('');

  const loadAbsences = useCallback(async () => {
    try {
      const res = await fetch('/api/absence');
      if (res.ok) setAbsences(await res.json());
      setAbsLoaded(true);
    } catch {}
  }, []);

  async function markAbsent() {
    try {
      const res = await fetch('/api/absence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: markingDate, reason: markingReason || null }) });
      if (!res.ok) throw new Error();
      toast.success('Absence marked');
      loadAbsences();
      setMarkingReason('');
    } catch { toast.error('Failed to mark absence'); }
  }

  async function removeAbsent(date: string) {
    try {
      await fetch('/api/absence', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date }) });
      setAbsences(a => a.filter(x => x.date !== date));
    } catch { toast.error('Failed to remove'); }
  }

  const tabs = [
    { t: 'live',    Icon: BookOpen, label: 'Live view' },
    { t: 'import',  Icon: Upload,   label: 'Import CSV' },
    { t: 'absence', Icon: UserX,    label: 'Absences' },
  ];

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Academic Timetable</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Live periods · CSV import · Absence tracker</div>
        </div>
        <button className="btn btn-sm" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {tabs.map(({ t, Icon, label }) => (
          <button key={t} onClick={() => { setTab(t as any); if (t === 'absence' && !absLoaded) loadAbsences(); }}
            style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: tab === t ? 'var(--surface)' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text3)', border: 'none', boxShadow: tab === t ? 'var(--shadow)' : 'none', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div className="card" key={refreshKey}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Today's academic periods</div>
          <AcademicSubTimeline key={refreshKey} />
        </div>
      )}

      {tab === 'import' && (
        <div className="card">
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Import CSV timetable</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Upload a CSV — we auto-parse periods under your College/School block.</div>
          <CsvImport onImported={() => { setTab('live'); setRefreshKey(k => k + 1); }} />
        </div>
      )}

      {tab === 'absence' && (
        <div>
          {/* Mark absence form */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Mark absence</div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <div className="form-label">Date</div>
                <input className="form-input" type="date" value={markingDate} onChange={e => setMarkingDate(e.target.value)} max={dayjs().format('YYYY-MM-DD')} />
              </div>
              <div>
                <div className="form-label">Reason (optional)</div>
                <input className="form-input" value={markingReason} onChange={e => setMarkingReason(e.target.value)} placeholder="e.g. Sick, holiday..." />
              </div>
              <button className="btn btn-primary" onClick={markAbsent} style={{ gap: 6 }}>
                <UserX size={14} /> Mark absent
              </button>
            </div>
          </div>

          {/* Absence list */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              Absence record
              <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text3)', marginLeft: 8 }}>{absences.length} total</span>
            </div>
            {absences.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>
                <Calendar size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>No absences recorded</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {absences.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'rgba(226,75,74,0.03)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{dayjs(a.date).format('ddd, D MMMM YYYY')}</div>
                      {a.reason && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{a.reason}</div>}
                    </div>
                    <button onClick={() => removeAbsent(a.date)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
