'use client';
// src/app/settings/page.tsx
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useScheduleStore } from '@/store/scheduleStore';
import { Bell, Mail, Sun, Moon, Volume2, Clock, LogOut, Shield, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [email, setEmail] = useState(session?.user?.email || '');
  const [wakeUpTime, setWakeUpTime] = useState('06:00');
  const [settings, setSettings] = useState({
    emailEnabled: true,
    streakWarning: true,
    soundEnabled: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({ emailEnabled: data.emailEnabled, streakWarning: data.streakWarning, soundEnabled: data.soundEnabled });
          setWakeUpTime(data.wakeUpTime || '06:00');
        }
      } catch {}
    }
    if (session?.user) load();
  }, [session]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, wakeUpTime }),
      });
      if (!res.ok) throw new Error();
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
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

        <div style={{ marginBottom: 12 }}>
          <div className="form-label"><Clock size={13} /> Wake-up time</div>
          <input className="form-input" type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} style={{ maxWidth: 160 }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Used to send morning greeting email</div>
        </div>

        <button className="btn btn-sm" style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)' }} onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut size={13} /> Sign out
        </button>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.05em' }}>NOTIFICATIONS</div>
        <ToggleRow
          label="Email notifications"
          desc="Reminders for strict tasks (study, gym, academic)"
          value={settings.emailEnabled}
          onChange={(v) => setSettings((s) => ({ ...s, emailEnabled: v }))}
          icon={Mail}
        />
        <ToggleRow
          label="Streak warning emails"
          desc="Alert at 9 PM if your streak is at risk"
          value={settings.streakWarning}
          onChange={(v) => setSettings((s) => ({ ...s, streakWarning: v }))}
          icon={Bell}
        />
        <ToggleRow
          label="Sound alerts"
          desc="Audio bell when a new period starts"
          value={settings.soundEnabled}
          onChange={(v) => setSettings((s) => ({ ...s, soundEnabled: v }))}
          icon={Volume2}
        />
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, letterSpacing: '0.05em' }}>APPEARANCE</div>
        <ToggleRow
          label="Dark mode"
          desc="Switch to dark theme"
          value={theme === 'dark'}
          onChange={(v) => setTheme(v ? 'dark' : 'light')}
          icon={theme === 'dark' ? Moon : Sun}
        />
      </div>

      {/* Privacy */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 12, letterSpacing: '0.05em' }}>PRIVACY & DATA</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>
          RhythmIQ stores your schedule, task logs, food logs, and streak data. Your data is private and never shared.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-sm">Export my data</button>
          <button className="btn btn-sm" style={{ color: '#E24B4A', borderColor: 'rgba(226,75,74,0.3)' }}>Delete account</button>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
