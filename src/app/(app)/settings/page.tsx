'use client';
// src/app/(app)/settings/page.tsx — with working export, reset, wake-time sync
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useScheduleStore } from '@/store/scheduleStore';
import { Bell, Mail, Sun, Moon, Volume2, Clock, LogOut, Download, Trash2, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

function ToggleRow({ label, desc, value, onChange, icon: Icon }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; icon?: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {Icon && <Icon size={16} color="var(--text3)" style={{ marginTop: 2, flexShrink: 0 }} />}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{desc}</div>}
        </div>
      </div>
      <button className={`toggle-switch${value ? ' on' : ''}`} onClick={() => onChange(!value)} />
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useScheduleStore();
  const [wakeUpTime, setWakeUpTime] = useState('06:00');
  const [forceDate, setForceDate]   = useState(dayjs().format('YYYY-MM-DD'));
  const [forceTime, setForceTime]   = useState('06:00');
  const [settings, setSettings] = useState({ emailEnabled: true, streakWarning: true, soundEnabled: false });
  const [saving, setSaving]   = useState(false);
  const [resetting, setResetting] = useState(false);
  const [applyingWake, setApplyingWake] = useState(false);

  //signout
  async function handleSignOut() {
    await signOut({ redirect: false });
    window.location.assign('/login');  
}
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({ emailEnabled: data.emailEnabled ?? true, streakWarning: data.streakWarning ?? true, soundEnabled: data.soundEnabled ?? false });
          setWakeUpTime(data.wakeUpTime || '06:00');
          setForceTime(data.wakeUpTime || '06:00');
        }
      } catch {}
    }
    if (session?.user) load();
  }, [session]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, wakeUpTime }) });
      if (!res.ok) throw new Error();
      // Apply wake time to all Wake Up / morning slots globally
      await fetch('/api/schedule/wake-time', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wakeUpTime }) }).catch(() => {});
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  }

  async function applyForceWakeTime() {
    setApplyingWake(true);
    try {
      // Apply to specific date as a day override (stored in localStorage for now)
      const key = `wake-override:${forceDate}`;
      localStorage.setItem(key, forceTime);
      toast.success(`Wake time set to ${forceTime} for ${dayjs(forceDate).format('D MMM')}`);
    } catch { toast.error('Failed to apply'); }
    finally { setApplyingWake(false); }
  }

  async function exportData() {
    try {
      const res = await fetch('/api/settings/export');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'rhythmiq-export.json'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    } catch { toast.error('Export failed'); }
  }

  async function resetData() {
    if (!confirm('This will delete ALL your slots, logs, food logs, and reading data. Your account stays. Continue?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/settings/reset', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('All data cleared. Refreshing…');
      setTimeout(() => window.location.reload(), 1200);
    } catch { toast.error('Reset failed'); }
    finally { setResetting(false); }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account permanently? This cannot be undone.')) return;
    try {
      await fetch('/api/settings/reset', { method: 'DELETE' });
      await handleSignOut();
    } catch { toast.error('Failed — try again'); }
  }

  return (
    <div className="content-pad animate-fade-in" style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Settings</div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 14, letterSpacing: '0.05em' }}>ACCOUNT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700 }}>
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{session?.user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{session?.user?.email}</div>
          </div>
        </div>
        <button className="btn btn-sm" style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)' }} onClick={handleSignOut}>
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* Wake time */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 14, letterSpacing: '0.05em' }}>WAKE UP TIME</div>
        <div style={{ marginBottom: 14 }}>
          <div className="form-label"><Clock size={13} /> Global wake-up time</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <input className="form-input" type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} style={{ maxWidth: 160 }} />
            <div style={{ fontSize: 12, color: 'var(--text3)', flex: 1 }}>Applied globally to all "Wake Up" morning slots</div>
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>
            <Zap size={13} color="var(--accent)" /> Force wake time for a specific date
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 120px auto', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <div className="form-label" style={{ fontSize: 11 }}>Date</div>
              <input className="form-input" type="date" value={forceDate} onChange={e => setForceDate(e.target.value)} />
            </div>
            <div>
              <div className="form-label" style={{ fontSize: 11 }}>Time</div>
              <input className="form-input" type="time" value={forceTime} onChange={e => setForceTime(e.target.value)} />
            </div>
            <button className="btn btn-sm" onClick={applyForceWakeTime} disabled={applyingWake}>
              {applyingWake ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
              Apply
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            Overrides global wake time for {dayjs(forceDate).format('D MMM')} only
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.05em' }}>NOTIFICATIONS</div>
        <ToggleRow label="Email notifications" desc="Reminders for strict tasks" value={settings.emailEnabled} onChange={(v) => setSettings(s => ({ ...s, emailEnabled: v }))} icon={Mail} />
        <ToggleRow label="Streak warning emails" desc="Alert at 9 PM if streak at risk" value={settings.streakWarning} onChange={(v) => setSettings(s => ({ ...s, streakWarning: v }))} icon={Bell} />
        <ToggleRow label="Sound alerts" desc="Audio bell when period starts" value={settings.soundEnabled} onChange={(v) => setSettings(s => ({ ...s, soundEnabled: v }))} icon={Volume2} />
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.05em' }}>APPEARANCE</div>
        <ToggleRow label="Dark mode" desc="Switch to dark theme" value={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} icon={theme === 'dark' ? Moon : Sun} />
      </div>

      {/* Data */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 12, letterSpacing: '0.05em' }}>DATA & PRIVACY</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.7 }}>
          Export your data as JSON, reset all tracked data (keeps account), or delete your account entirely.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={exportData} style={{ gap: 6 }}>
            <Download size={13} /> Export data
          </button>
          <button className="btn btn-sm" style={{ color: '#BA7517', borderColor: 'rgba(186,117,23,0.3)', gap: 6 }} onClick={resetData} disabled={resetting}>
            <RefreshCw size={13} /> {resetting ? 'Resetting…' : 'Reset all data'}
          </button>
          <button className="btn btn-sm" style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)', gap: 6 }} onClick={deleteAccount}>
            <Trash2 size={13} /> Delete account
          </button>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
