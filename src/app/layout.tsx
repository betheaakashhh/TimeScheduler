// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';

import { Syne, DM_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-head',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RhythmIQ — Smart Timetable Manager',
  description: 'Real-time timetable and task tracker with streak system, academic integration, and smart reminders.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },

};


export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      
      <body className={`${syne.variable} ${dmSans.variable}`}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '0.5px solid var(--border)',
                borderRadius: '10px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                boxShadow: 'var(--shadow2)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
