'use client';
// src/app/academic/page.tsx — updated to include CsvImport component
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { BookOpen, Upload, RefreshCw } from 'lucide-react';

const AcademicSubTimeline = dynamic(() => import('@/components/academic/AcademicSubTimeline'), { ssr: false });
const CsvImport           = dynamic(() => import('@/components/academic/CsvImport'),           { ssr: false });

export default function AcademicPage() {
  const [tab, setTab] = useState<'live' | 'import'>('live');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Academic Timetable</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Live period tracking and CSV import</div>
        </div>
        <button className="btn btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {[
          { t: 'live',   Icon: BookOpen, label: 'Live view'   },
          { t: 'import', Icon: Upload,   label: 'Import CSV'  },
        ].map(({ t, Icon, label }) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text3)', border: 'none',
              boxShadow: tab === t ? 'var(--shadow)' : 'none', fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div className="card" key={refreshKey}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
            Today's academic periods
          </div>
          <AcademicSubTimeline />
        </div>
      )}

      {tab === 'import' && (
        <div className="card">
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Import CSV timetable</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
            Upload a CSV and we auto-create sub-intervals under your College / School block.
          </div>
          <CsvImport onImported={() => setTab('live')} />
        </div>
      )}
    </div>
  );
}
