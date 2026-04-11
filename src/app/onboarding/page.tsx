'use client';
// src/app/onboarding/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Upload, PenSquare, GraduationCap, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

type Step = 'welcome' | 'choice' | 'upload' | 'wakeup' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>('welcome');
  const [wakeUpTime, setWakeUpTime] = useState('06:00');
  const [collegeStart, setCollegeStart] = useState('09:00');
  const [collegeEnd, setCollegeEnd] = useState('16:00');
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('slotStart', collegeStart);
        fd.append('slotEnd', collegeEnd);
        const res = await fetch('/api/academic', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success(`✓ Parsed ${data.periodsCount} periods!`);
        setUploadDone(true);
      } catch (err: any) {
        toast.error(err.message || 'Upload failed — you can do this later in Academic tab');
      } finally {
        setUploading(false);
      }
    },
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    multiple: false,
  });

  async function finish() {
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wakeUpTime }),
      });
    } catch {}
    router.push('/dashboard');
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {(['welcome','choice','upload','wakeup','done'] as Step[]).map((s, i) => {
            const steps: Step[] = ['welcome','choice','upload','wakeup','done'];
            const idx = steps.indexOf(step);
            const sIdx = steps.indexOf(s);
            return (
              <div key={s} style={{
                width: sIdx === idx ? 24 : 8, height: 8, borderRadius: 4,
                background: sIdx <= idx ? 'var(--accent)' : 'var(--surface3)',
                transition: 'all 0.3s',
              }} />
            );
          })}
        </div>

        {step === 'welcome' && (
          <div className="card animate-scale-in" style={{ textAlign: 'center', padding: 36 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              Welcome, {firstName}!
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28 }}>
              RhythmIQ helps you build a consistent daily routine with real-time tracking, smart reminders, and streak rewards. Let's set you up in 2 minutes.
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44 }} onClick={() => setStep('choice')}>
              Get started <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'choice' && (
          <div className="animate-scale-in">
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>
              How do you want to start?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 24 }}>
              You can always add or change slots later
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { icon: PenSquare, title: 'Create manually', desc: 'Build your schedule slot by slot', action: () => setStep('wakeup') },
                { icon: Upload, title: 'Import timetable', desc: 'Upload a PDF/Excel and we parse it', action: () => setStep('upload') },
              ].map(({ icon: Icon, title, desc, action }) => (
                <div
                  key={title}
                  onClick={action}
                  style={{
                    border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: 24,
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                    background: 'var(--surface)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <Icon size={36} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{desc}</div>
                </div>
              ))}
            </div>
            <div
              onClick={() => setStep('wakeup')}
              style={{
                marginTop: 14, border: '0.5px solid var(--border)', borderRadius: 'var(--r)',
                padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--surface)', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <GraduationCap size={28} color="var(--accent2)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Use default student template</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Wake up → College → Study → Gym → Dinner — pre-loaded and ready</div>
              </div>
              <ArrowRight size={16} color="var(--text3)" style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="card animate-scale-in" style={{ padding: 28 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Upload your timetable</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>We'll extract all your subjects, timings, and rooms automatically</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <div className="form-label">College starts at</div>
                <input className="form-input" type="time" value={collegeStart} onChange={(e) => setCollegeStart(e.target.value)} />
              </div>
              <div>
                <div className="form-label">College ends at</div>
                <input className="form-input" type="time" value={collegeEnd} onChange={(e) => setCollegeEnd(e.target.value)} />
              </div>
            </div>

            <div
              {...getRootProps()}
              style={{
                border: `1.5px dashed ${isDragActive ? 'var(--accent)' : 'var(--border2)'}`,
                borderRadius: 'var(--r2)', padding: 32, textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(255,107,53,0.03)' : 'var(--surface2)',
                transition: 'all 0.15s', marginBottom: 16,
              }}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text3)' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  <div>Parsing your timetable...</div>
                </div>
              ) : uploadDone ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--accent3)' }}>
                  <CheckCircle2 size={36} />
                  <div style={{ fontWeight: 600 }}>Timetable parsed successfully!</div>
                </div>
              ) : (
                <>
                  <Upload size={36} color="var(--text3)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop your PDF, Excel, or CSV here</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>or click to browse</div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setStep('wakeup')}>Skip for now</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep('wakeup')} disabled={uploading}>
                {uploadDone ? 'Continue' : 'Skip'} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 'wakeup' && (
          <div className="card animate-scale-in" style={{ padding: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏰</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>When do you wake up?</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
              We'll send you a good morning email at this time and schedule your day from here
            </div>
            <div style={{ marginBottom: 24 }}>
              <div className="form-label">Wake-up time</div>
              <input
                className="form-input" type="time" value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                style={{ fontSize: 20, height: 52, textAlign: 'center' }}
              />
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
              💡 Your default schedule has been set up with a student template — wake up, morning routine, breakfast, college, self study, gym, and dinner. You can customise it anytime.
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44 }} onClick={() => { setStep('done'); setTimeout(finish, 1500); }}>
              Let's go! <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="card animate-scale-in" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌞</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>You're all set!</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 24 }}>
              Opening your dashboard... Build that streak! 🔥
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
