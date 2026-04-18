'use client';
// src/app/(app)/timetable-export/page.tsx
// Manual timetable creator — user fills a blank weekly grid, then exports as image
import { useState, useRef, useCallback } from 'react';
import { Download, Plus, Trash2, FileImage, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ManualSlot {
  id: string;
  day: number; // 0-6 (Mon-Sun)
  startTime: string;
  endTime: string;
  title: string;
  notes: string;
}

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am'; const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,'0')}${ap}`;
}

function renderManualTimetable(canvas: HTMLCanvasElement, slots: ManualSlot[], title: string) {
  const W = 1400, H = 1000;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title || 'MY WEEKLY SCHEDULE', W / 2, 48);
  ctx.fillStyle = '#555555';
  ctx.font = '15px Arial';
  ctx.fillText(dayjs().format('MMMM YYYY'), W / 2, 72);

  ctx.strokeStyle = '#111111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 84); ctx.lineTo(W - 60, 84); ctx.stroke();

  const LEFT = 90, TOP = 110, ROW_H = 36;
  const COL_W = (W - LEFT - 60) / 7;
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
  const GRID_H = HOURS.length * ROW_H;

  // Day headers
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  DAYS_SHORT.forEach((d, i) => ctx.fillText(d, LEFT + i * COL_W + COL_W / 2, TOP - 10));

  // Grid
  HOURS.forEach((h, hi) => {
    const y = TOP + hi * ROW_H;
    ctx.fillStyle = hi % 2 === 0 ? '#f9f9f9' : '#ffffff';
    ctx.fillRect(LEFT, y, COL_W * 7, ROW_H);
    ctx.strokeStyle = '#dddddd'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(LEFT, y); ctx.lineTo(LEFT + COL_W * 7, y); ctx.stroke();
    ctx.fillStyle = '#aaaaaa'; ctx.font = '11px Arial'; ctx.textAlign = 'right';
    const label = h < 12 ? `${h}:00 am` : h === 12 ? '12:00 pm' : `${h-12}:00 pm`;
    ctx.fillText(label, LEFT - 6, y + 14);
  });

  for (let i = 0; i <= 7; i++) {
    ctx.strokeStyle = i === 0 || i === 7 ? '#333333' : '#cccccc'; ctx.lineWidth = i === 0 || i === 7 ? 1.5 : 0.5;
    const x = LEFT + i * COL_W;
    ctx.beginPath(); ctx.moveTo(x, TOP - 22); ctx.lineTo(x, TOP + GRID_H); ctx.stroke();
  }
  ctx.strokeStyle = '#333333'; ctx.lineWidth = 1.5;
  ctx.strokeRect(LEFT, TOP - 22, COL_W * 7, GRID_H + 22);

  const sY = (t: string) => TOP + ((toMins(t) - 5 * 60) / 60) * ROW_H;

  slots.forEach(s => {
    const x = LEFT + s.day * COL_W + 3;
    const y = sY(s.startTime);
    const h = Math.max(sY(s.endTime) - y - 3, 20);
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(x, y, COL_W - 6, h);
    ctx.strokeStyle = '#333333'; ctx.lineWidth = 1; ctx.strokeRect(x, y, COL_W - 6, h);
    ctx.fillStyle = '#111111'; ctx.font = `bold ${h > 26 ? 12 : 10}px Arial`; ctx.textAlign = 'left';
    ctx.fillText((s.title || 'Task').slice(0, 16), x + 4, y + 14);
    if (h > 28) { ctx.fillStyle = '#555'; ctx.font = '9px Arial'; ctx.fillText(`${fmt12(s.startTime)}–${fmt12(s.endTime)}`, x + 4, y + 25); }
    if (h > 40 && s.notes) { ctx.fillStyle = '#777'; ctx.font = '9px Arial'; ctx.fillText(s.notes.slice(0, 18), x + 4, y + 36); }
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.strokeRect(x + COL_W - 22, y + 4, 13, 13);
  });

  ctx.fillStyle = '#bbbbbb'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('RhythmIQ · rhythmiq.app · Your personal schedule companion', W / 2, H - 12);
}

export default function TimetableExportPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<ManualSlot[]>([]);
  const [title, setTitle] = useState('MY WEEKLY SCHEDULE');
  const [selectedDay, setSelectedDay] = useState(0);
  const [newSlot, setNewSlot] = useState({ startTime: '09:00', endTime: '10:00', title: '', notes: '' });
  const [preview, setPreview] = useState<string | null>(null);

  function addSlot() {
    if (!newSlot.title.trim()) { toast.error('Enter a title'); return; }
    setSlots(p => [...p, { id: crypto.randomUUID?.() || Math.random().toString(), day: selectedDay, ...newSlot }]);
    setNewSlot(s => ({ ...s, title: '', notes: '' }));
    setPreview(null);
    toast.success('Added!');
  }

  function removeSlot(id: string) { setSlots(p => p.filter(s => s.id !== id)); setPreview(null); }

  const genPreview = useCallback(() => {
    const c = document.createElement('canvas');
    renderManualTimetable(c, slots, title);
    setPreview(c.toDataURL('image/jpeg', 0.9));
  }, [slots, title]);

  function download(fmt: 'jpeg' | 'png') {
    const c = document.createElement('canvas');
    renderManualTimetable(c, slots, title);
    const url = c.toDataURL(`image/${fmt}`, 0.92);
    const a = document.createElement('a'); a.href = url;
    a.download = `rhythmiq-timetable-${dayjs().format('YYYY-MM-DD')}.${fmt === 'jpeg' ? 'jpg' : 'png'}`; a.click();
    toast.success('Downloaded!');
  }

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-sm" onClick={() => router.push('/timetable')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>Create & Export Timetable</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Build a custom weekly schedule, then export as JPEG or PNG</div>
        </div>
      </div>

      {/* Title input */}
      <div style={{ marginBottom: 16 }}>
        <div className="form-label">Schedule title</div>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value.toUpperCase())} placeholder="MY WEEKLY SCHEDULE" style={{ maxWidth: 360, textTransform: 'uppercase', fontWeight: 600, fontSize: 14 }} />
      </div>

      {/* Day + slot form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Add time slots</div>

        {/* Day selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {DAYS_SHORT.map((d, i) => (
            <button key={d} onClick={() => setSelectedDay(i)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '0.5px solid var(--border)', background: selectedDay === i ? 'var(--accent)' : 'var(--surface2)', color: selectedDay === i ? 'white' : 'var(--text3)' }}>
              {d}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr 140px auto', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <div className="form-label">Start</div>
            <input type="time" className="form-input" value={newSlot.startTime} onChange={e => setNewSlot(s => ({ ...s, startTime: e.target.value }))} />
          </div>
          <div>
            <div className="form-label">End</div>
            <input type="time" className="form-input" value={newSlot.endTime} onChange={e => setNewSlot(s => ({ ...s, endTime: e.target.value }))} />
          </div>
          <div>
            <div className="form-label">Activity</div>
            <input className="form-input" value={newSlot.title} onChange={e => setNewSlot(s => ({ ...s, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addSlot()} placeholder="e.g. Self Study" />
          </div>
          <div>
            <div className="form-label">Note (optional)</div>
            <input className="form-input" value={newSlot.notes} onChange={e => setNewSlot(s => ({ ...s, notes: e.target.value }))} placeholder="e.g. Chapter 3" />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addSlot} style={{ gap: 5 }}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Slots list */}
      {slots.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Your slots ({slots.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DAYS_SHORT.map((day, di) => {
              const daySlots = slots.filter(s => s.day === di).sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
              if (!daySlots.length) return null;
              return (
                <div key={day}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{day}</div>
                  {daySlots.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 7, background: 'var(--surface2)', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)', minWidth: 100 }}>{fmt12(s.startTime)} – {fmt12(s.endTime)}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{s.title}</div>
                      {s.notes && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.notes}</div>}
                      <button onClick={() => removeSlot(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview + Export */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Preview & Export</div>
        {!preview ? (
          <button className="btn btn-sm" onClick={genPreview} style={{ marginBottom: 12, gap: 6 }}>
            👁 Generate preview
          </button>
        ) : (
          <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', border: '0.5px solid var(--border)' }}>
            <img src={preview} alt="Preview" style={{ width: '100%', display: 'block' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => download('jpeg')} style={{ flex: 1, justifyContent: 'center', gap: 6 }} disabled={!slots.length}>
            <FileImage size={14} /> Download JPEG
          </button>
          <button className="btn" onClick={() => download('png')} style={{ flex: 1, justifyContent: 'center', gap: 6 }} disabled={!slots.length}>
            <FileImage size={14} /> Download PNG
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
          💡 For best print quality: open the downloaded image and print at A4 landscape, margins set to None.
        </div>
      </div>
    </div>
  );
}
