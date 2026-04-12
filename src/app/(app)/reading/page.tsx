'use client';
// src/app/(app)/reading/page.tsx
import dynamic from 'next/dynamic';
import { BookOpen } from 'lucide-react';

const ReadingTracker = dynamic(() => import('@/components/reading/ReadingTracker'), { ssr: false });

export default function ReadingPage() {
  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(55,138,221,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={20} color="#378ADD" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Reading Tracker</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Track passive reading time and active reading sessions</div>
        </div>
      </div>
      <ReadingTracker />
    </div>
  );
}
