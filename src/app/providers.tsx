'use client';
// src/app/providers.tsx
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useScheduleStore();

  useEffect(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('rhythmiq-theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
  }, [setTheme]);

  useEffect(() => {
    localStorage.setItem('rhythmiq-theme', theme);
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  }, [theme]);

  return <>{children}</>;
}
