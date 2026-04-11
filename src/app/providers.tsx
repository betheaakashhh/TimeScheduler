'use client';
// src/app/providers.tsx
// Kept as pure React component exports only (fixes Fast Refresh full-reload warning)
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useScheduleStore();

  useEffect(() => {
    // Restore persisted theme on mount
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  }, [theme]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
