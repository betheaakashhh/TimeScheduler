'use client';
// src/app/login/page.tsx
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Registration failed');
        }
      }
      const result = await signIn('credentials', {
        email, password, redirect: false,
      });
      if (result?.error) throw new Error('Invalid email or password');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--accent)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <svg viewBox="0 0 24 24" fill="white" width={28} height={28}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800 }}>RhythmIQ</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Your smart daily timetable manager</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 8, padding: 3, marginBottom: 22 }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text3)', border: 'none',
                  boxShadow: mode === m ? 'var(--shadow)' : 'none',
                  transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                  textTransform: 'capitalize',
                }}
              >{m}</button>
            ))}
          </div>

          <form onSubmit={handleCredentials}>
            {mode === 'register' && (
              <div style={{ marginBottom: 12 }}>
                <div className="form-label">Full name</div>
                <input
                  className="form-input" type="text" placeholder="Aathiya"
                  value={name} onChange={(e) => setName(e.target.value)} required
                />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div className="form-label"><Mail size={13} /> Email</div>
              <input
                className="form-input" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="form-label"><Lock size={13} /> Password</div>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input" type={showPw ? 'text' : 'password'}
                  placeholder="••••••••" style={{ paddingRight: 40 }}
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                />
                <button
                  type="button" onClick={() => setShowPw((v) => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: 42 }}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
          </div>

          <button
            onClick={handleGoogle}
            className="btn"
            style={{ width: '100%', justifyContent: 'center', height: 42, gap: 10 }}
          >
            <svg viewBox="0 0 24 24" width={18} height={18}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
          By continuing you agree to our{' '}
          <a href="#" style={{ color: 'var(--accent)' }}>Terms</a> and{' '}
          <a href="#" style={{ color: 'var(--accent)' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
