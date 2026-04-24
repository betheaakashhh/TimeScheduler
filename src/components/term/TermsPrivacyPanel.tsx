'use client';
// src/components/TermsPrivacyPanel.tsx
// Opens inline inside the main content area — NOT a route, NOT a nav item.
// Triggered by any hyperlink across the app via the onOpenLegal callback pattern.

import { useState } from 'react';
import {
  motion, AnimatePresence,
  type Variants,
} from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Scale,
  Lock,
  Eye,
  UserCheck,
  RefreshCw,
  Mail,
  AlertTriangle,
  Globe,
  Clock,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export type LegalDoc = 'terms' | 'privacy';

interface TermsPrivacyPanelProps {
  /** Which doc to show on mount */
  initial?: LegalDoc;
  /** Called when the user clicks the back button */
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────
const panelVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 28, staggerChildren: 0.06 },
  },
  exit: { opacity: 0, y: 20, transition: { duration: 0.18 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 28 } },
};

const tabSlide: Variants = {
  hidden: { opacity: 0, x: 20 },
  show:   { opacity: 1, x: 0,  transition: { type: 'spring', stiffness: 320, damping: 28 } },
  exit:   { opacity: 0, x: -20, transition: { duration: 0.14 } },
};

// ─────────────────────────────────────────────────────────────────
// COLLAPSIBLE SECTION HELPER
// ─────────────────────────────────────────────────────────────────
interface AccordionItemProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}

function AccordionItem({ icon, title, children, defaultOpen = false, accentColor = 'var(--accent)' }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      variants={itemVariants}
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--r2)',
        overflow: 'hidden',
        marginBottom: 10,
      }}
    >
      {/* Header */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.99 }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          {open ? <ChevronUp size={15} color="var(--text3)" /> : <ChevronDown size={15} color="var(--text3)" />}
        </motion.div>
      </motion.button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px 60px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.72 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TERMS OF SERVICE CONTENT
// ─────────────────────────────────────────────────────────────────
function TermsContent() {
  return (
    <motion.div variants={tabSlide} initial="hidden" animate="show" exit="exit">
      {/* Effective date banner */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,107,53,0.08)',
          border: '0.5px solid rgba(255,107,53,0.25)',
          borderRadius: 'var(--r2)',
          padding: '10px 14px',
          marginBottom: 20,
        }}
      >
        <Clock size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text)' }}>Effective date:</strong> January 1, 2025 &nbsp;·&nbsp;
          <strong style={{ color: 'var(--text)' }}>Last updated:</strong> April 2025
        </span>
      </motion.div>

      <motion.p variants={itemVariants} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.72, marginBottom: 20 }}>
        Welcome to <strong style={{ color: 'var(--text)' }}>Timedule</strong>, a product of AetherSolve Pvt Ltd. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully before using the platform.
      </motion.p>

      <AccordionItem icon={<UserCheck size={15} color="var(--accent)" />} title="1. Acceptance of Terms" accentColor="var(--accent)" defaultOpen>
        <p>By creating an account or using Timedule in any form, you confirm that:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>You are at least 13 years of age (or have parental consent if younger).</li>
          <li>You have the legal capacity to enter into a binding agreement.</li>
          <li>You agree to comply with these terms and all applicable laws and regulations.</li>
        </ul>
        <p style={{ marginTop: 10 }}>If you disagree with any part of these terms, you may not access the service.</p>
      </AccordionItem>

      <AccordionItem icon={<FileText size={15} color="var(--accent2)" />} title="2. Description of Service" accentColor="var(--accent2)">
        <p>Timedule provides a smart timetable and productivity management platform that allows users to:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Create, manage, and organize daily time slots and tasks.</li>
          <li>Track study sessions, streaks, and productivity habits.</li>
          <li>Import schedules from CSV files.</li>
          <li>Set recurring routines with priority levels.</li>
        </ul>
        <p style={{ marginTop: 10 }}>We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.</p>
      </AccordionItem>

      <AccordionItem icon={<Lock size={15} color="var(--accent3)" />} title="3. Account Responsibilities" accentColor="var(--accent3)">
        <p>You are responsible for:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Maintaining the confidentiality of your account credentials.</li>
          <li>All activities that occur under your account.</li>
          <li>Promptly notifying us at <strong style={{ color: 'var(--accent)' }}>support@aethersolve.com</strong> of any unauthorized access.</li>
          <li>Providing accurate and complete registration information.</li>
        </ul>
        <p style={{ marginTop: 10 }}>We reserve the right to terminate accounts that violate these terms without prior notice.</p>
      </AccordionItem>

      <AccordionItem icon={<Scale size={15} color="var(--accent4)" />} title="4. Acceptable Use Policy" accentColor="var(--accent4)">
        <p>You agree not to use Timedule to:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Violate any local, national, or international laws or regulations.</li>
          <li>Upload or transmit malicious code, viruses, or harmful content.</li>
          <li>Attempt to gain unauthorized access to other accounts or our servers.</li>
          <li>Engage in any activity that degrades the service for other users.</li>
          <li>Reverse engineer, decompile, or disassemble any part of the application.</li>
          <li>Use automated bots or scrapers against the service without prior written consent.</li>
        </ul>
      </AccordionItem>

      <AccordionItem icon={<Globe size={15} color="var(--accent)" />} title="5. Intellectual Property" accentColor="var(--accent)">
        <p>
          All content, features, and functionality on Timedule — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of <strong style={{ color: 'var(--text)' }}>AetherSolve Pvt Ltd</strong> and are protected by applicable intellectual property laws.
        </p>
        <p style={{ marginTop: 10 }}>
          Your user-generated content (schedules, task names, notes) remains yours. By submitting content, you grant AetherSolve a non-exclusive, worldwide, royalty-free license to store and process it solely to provide the service.
        </p>
      </AccordionItem>

      <AccordionItem icon={<AlertTriangle size={15} color="#F5A623" />} title="6. Disclaimer of Warranties" accentColor="#F5A623">
        <p>
          The service is provided on an <strong style={{ color: 'var(--text)' }}>"AS IS" and "AS AVAILABLE"</strong> basis without warranties of any kind, whether express or implied. AetherSolve does not warrant that:
        </p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>The service will be uninterrupted, error-free, or secure.</li>
          <li>Defects will be corrected in a timely manner.</li>
          <li>The service or its servers are free of viruses or harmful components.</li>
        </ul>
      </AccordionItem>

      <AccordionItem icon={<RefreshCw size={15} color="var(--accent2)" />} title="7. Changes to Terms" accentColor="var(--accent2)">
        <p>
          We reserve the right to modify these terms at any time. Changes will be communicated via email or an in-app notification at least <strong style={{ color: 'var(--text)' }}>7 days</strong> before they take effect for existing users.
        </p>
        <p style={{ marginTop: 10 }}>
          Your continued use of the service after changes take effect constitutes acceptance of the revised terms. If you disagree, please delete your account.
        </p>
      </AccordionItem>

      <AccordionItem icon={<Mail size={15} color="var(--accent3)" />} title="8. Contact" accentColor="var(--accent3)">
        <p>For any questions regarding these terms, please contact us:</p>
        <div style={{
          marginTop: 10, padding: '12px 14px',
          background: 'var(--surface2)',
          borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <span><strong style={{ color: 'var(--text)' }}>Company:</strong> AetherSolve Pvt Ltd</span>
          <span><strong style={{ color: 'var(--text)' }}>Email:</strong> legal@aethersolve.com</span>
          <span><strong style={{ color: 'var(--text)' }}>Support:</strong> support@aethersolve.com</span>
          <span><strong style={{ color: 'var(--text)' }}>Website:</strong> aethersolve.vercel.app</span>
        </div>
      </AccordionItem>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRIVACY POLICY CONTENT
// ─────────────────────────────────────────────────────────────────
function PrivacyContent() {
  return (
    <motion.div variants={tabSlide} initial="hidden" animate="show" exit="exit">
      {/* Effective date banner */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(74,144,217,0.08)',
          border: '0.5px solid rgba(74,144,217,0.25)',
          borderRadius: 'var(--r2)',
          padding: '10px 14px',
          marginBottom: 20,
        }}
      >
        <Clock size={14} color="var(--accent2)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text)' }}>Effective date:</strong> January 1, 2025 &nbsp;·&nbsp;
          <strong style={{ color: 'var(--text)' }}>Last updated:</strong> April 2025
        </span>
      </motion.div>

      <motion.p variants={itemVariants} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.72, marginBottom: 20 }}>
        At <strong style={{ color: 'var(--text)' }}>AetherSolve Pvt Ltd</strong>, we take your privacy seriously. This policy explains what data we collect, how we use it, and the controls you have over your information.
      </motion.p>

      <AccordionItem icon={<Eye size={15} color="var(--accent2)" />} title="1. Information We Collect" accentColor="var(--accent2)" defaultOpen>
        <p><strong style={{ color: 'var(--text)' }}>Account data:</strong></p>
        <ul style={{ paddingLeft: 18, margin: '6px 0 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <li>Name and email address when you register.</li>
          <li>Profile picture (if you sign in via Google).</li>
          <li>Hashed password (never stored in plain text).</li>
        </ul>
        <p><strong style={{ color: 'var(--text)' }}>Usage data:</strong></p>
        <ul style={{ paddingLeft: 18, margin: '6px 0 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <li>Timetable slots, task titles, notes, and completion status.</li>
          <li>Streak counts and session durations.</li>
          <li>App interaction events (feature usage analytics — anonymized).</li>
        </ul>
        <p><strong style={{ color: 'var(--text)' }}>Technical data:</strong></p>
        <ul style={{ paddingLeft: 18, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <li>IP address, browser type, and device information.</li>
          <li>Session tokens (stored securely in HTTP-only cookies).</li>
        </ul>
      </AccordionItem>

      <AccordionItem icon={<FileText size={15} color="var(--accent)" />} title="2. How We Use Your Data" accentColor="var(--accent)">
        <p>We use your information solely to:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Provide and maintain the Timedule service.</li>
          <li>Authenticate your account and secure your sessions.</li>
          <li>Send important service notifications (no marketing without consent).</li>
          <li>Improve product features through anonymized, aggregated analytics.</li>
          <li>Respond to your support requests.</li>
        </ul>
        <p style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(45,203,122,0.08)', borderRadius: 8, border: '0.5px solid rgba(45,203,122,0.2)' }}>
          🔒 We <strong style={{ color: 'var(--text)' }}>never sell</strong> your personal data to third parties. We <strong style={{ color: 'var(--text)' }}>never</strong> use your data for ad targeting.
        </p>
      </AccordionItem>

      <AccordionItem icon={<Globe size={15} color="var(--accent3)" />} title="3. Data Sharing" accentColor="var(--accent3)">
        <p>We only share your data with carefully selected sub-processors required to run the service:</p>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'Vercel', purpose: 'Hosting & edge delivery', region: 'US / Global' },
            { name: 'Neon / Supabase', purpose: 'PostgreSQL database', region: 'US East' },
            { name: 'Google OAuth', purpose: 'Social sign-in only', region: 'Global' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{p.name}</span>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}> — {p.purpose}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface3)', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>{p.region}</span>
            </div>
          ))}
        </div>
      </AccordionItem>

      <AccordionItem icon={<Lock size={15} color="#F5A623" />} title="4. Data Security" accentColor="#F5A623">
        <p>We implement industry-standard security measures:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Passwords hashed with <strong style={{ color: 'var(--text)' }}>bcrypt</strong> (cost factor 12).</li>
          <li>All traffic encrypted over <strong style={{ color: 'var(--text)' }}>TLS 1.3</strong>.</li>
          <li>Session tokens stored in <strong style={{ color: 'var(--text)' }}>HTTP-only, Secure cookies</strong>.</li>
          <li>Database access restricted by IP allowlisting and role-based permissions.</li>
          <li>Regular automated backups with point-in-time recovery.</li>
        </ul>
      </AccordionItem>

      <AccordionItem icon={<UserCheck size={15} color="var(--accent)" />} title="5. Your Rights" accentColor="var(--accent)">
        <p>You have the right to:</p>
        <ul style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong style={{ color: 'var(--text)' }}>Access</strong> — Request a copy of all data we hold about you.</li>
          <li><strong style={{ color: 'var(--text)' }}>Correction</strong> — Update inaccurate personal information from your profile settings.</li>
          <li><strong style={{ color: 'var(--text)' }}>Deletion</strong> — Request complete account and data deletion at any time.</li>
          <li><strong style={{ color: 'var(--text)' }}>Portability</strong> — Export your timetable data as CSV at any time from the dashboard.</li>
          <li><strong style={{ color: 'var(--text)' }}>Opt-out</strong> — Unsubscribe from any non-essential communications.</li>
        </ul>
        <p style={{ marginTop: 10 }}>To exercise any of these rights, email <strong style={{ color: 'var(--accent)' }}>privacy@aethersolve.com</strong>. We will respond within 30 days.</p>
      </AccordionItem>

      <AccordionItem icon={<RefreshCw size={15} color="var(--accent2)" />} title="6. Cookies" accentColor="var(--accent2)">
        <p>We use only <strong style={{ color: 'var(--text)' }}>essential cookies</strong> required for authentication and session management. We do not use tracking, advertising, or third-party analytics cookies.</p>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { name: 'next-auth.session-token', purpose: 'Authentication session', duration: 'Session' },
            { name: 'next-auth.csrf-token', purpose: 'CSRF protection', duration: 'Session' },
            { name: 'timedule-theme', purpose: 'UI theme preference (localStorage)', duration: 'Persistent' },
          ].map(c => (
            <div key={c.name} style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{c.name}</span>
              <div style={{ color: 'var(--text3)', marginTop: 2 }}>{c.purpose} · <span style={{ color: 'var(--accent2)' }}>{c.duration}</span></div>
            </div>
          ))}
        </div>
      </AccordionItem>

      <AccordionItem icon={<Mail size={15} color="var(--accent3)" />} title="7. Contact & DPO" accentColor="var(--accent3)">
        <p>For all privacy-related enquiries:</p>
        <div style={{
          marginTop: 10, padding: '12px 14px',
          background: 'var(--surface2)',
          borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <span><strong style={{ color: 'var(--text)' }}>Privacy email:</strong> privacy@aethersolve.com</span>
          <span><strong style={{ color: 'var(--text)' }}>Company:</strong> AetherSolve Pvt Ltd</span>
          <span><strong style={{ color: 'var(--text)' }}>Website:</strong> aethersolve.vercel.app</span>
        </div>
      </AccordionItem>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function TermsPrivacyPanel({ initial = 'terms', onClose }: TermsPrivacyPanelProps) {
  const [active, setActive] = useState<LegalDoc>(initial);

  const TABS: { id: LegalDoc; label: string; Icon: typeof FileText }[] = [
    { id: 'terms',   label: 'Terms of Service', Icon: FileText    },
    { id: 'privacy', label: 'Privacy Policy',   Icon: ShieldCheck },
  ];

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      style={{ minHeight: '100%' }}
    >
      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)',
        borderBottom: '0.5px solid var(--border)',
        padding: '0 24px',
      }} className="legal-header">
        {/* Top row: back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, paddingBottom: 12 }}>
          <motion.button
            onClick={onClose}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.94 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface2)',
              border: '0.5px solid var(--border2)',
              borderRadius: 8, padding: '6px 11px',
              color: 'var(--text2)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={13} />
            Back
          </motion.button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Legal
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>AetherSolve Pvt Ltd · Timedule</p>
          </div>

          {/* Last-updated pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--surface2)', border: '0.5px solid var(--border)',
            borderRadius: 20, padding: '3px 10px', flexShrink: 0,
          }} className="legal-date-pill">
            <motion.div
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent3)', flexShrink: 0 }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>Updated Apr 2025</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 10, padding: 3, marginBottom: 0, width: '100%', maxWidth: 400 }}>
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <motion.button
                key={id}
                onClick={() => setActive(id)}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 7, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text3)',
                  transition: 'color 0.15s',
                  position: 'relative',
                }}
              >
                <Icon size={13} color={isActive ? (id === 'terms' ? 'var(--accent)' : 'var(--accent2)') : 'var(--text3)'} />
                <span className="legal-tab-label">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-underline"
                    style={{
                      position: 'absolute', bottom: 0, left: '10%', right: '10%',
                      height: 2, borderRadius: 2,
                      background: id === 'terms' ? 'var(--accent)' : 'var(--accent2)',
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ padding: '20px 24px 40px' }} className="legal-body">
        {/* Hero banner */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            background: active === 'terms'
              ? 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,107,53,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(74,144,217,0.08) 0%, rgba(74,144,217,0.02) 100%)',
            border: `0.5px solid ${active === 'terms' ? 'rgba(255,107,53,0.2)' : 'rgba(74,144,217,0.2)'}`,
            borderRadius: 'var(--r)',
            padding: '18px 20px',
            marginBottom: 20,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: active === 'terms' ? 'rgba(255,107,53,0.15)' : 'rgba(74,144,217,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {active === 'terms'
              ? <Scale size={20} color="var(--accent)" />
              : <ShieldCheck size={20} color="var(--accent2)" />
            }
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              {active === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 440 }}>
              {active === 'terms'
                ? 'These terms govern your use of Timedule. They outline your rights, responsibilities, and our obligations to you.'
                : 'This policy describes how AetherSolve collects, uses, and protects your personal information.'}
            </p>
          </div>
        </motion.div>

        {/* Content tabs with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div key={active}>
            {active === 'terms' ? <TermsContent /> : <PrivacyContent />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          variants={itemVariants}
          style={{
            marginTop: 24, paddingTop: 20,
            borderTop: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}
        >
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>AetherSolve Pvt Ltd</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              Questions? Email us at{' '}
              <a href="mailto:legal@aethersolve.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                legal@aethersolve.com
              </a>
            </p>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface2)', border: '0.5px solid var(--border2)',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              color: 'var(--text2)', fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--font-body)',
            }}
          >
            <ArrowLeft size={13} /> Back to Timedule
          </motion.button>
        </motion.div>
      </div>

      {/* Responsive overrides */}
      <style>{`
        .legal-header  { padding-left: 24px; padding-right: 24px; }
        .legal-body    { padding: 20px 24px 40px; }
        .legal-tab-label { display: inline; }
        .legal-date-pill { display: flex; }

        @media (max-width: 600px) {
          .legal-header  { padding-left: 14px; padding-right: 14px; }
          .legal-body    { padding: 16px 14px 32px; }
          .legal-tab-label { display: none; }
          .legal-date-pill { display: none; }
        }

        @media (max-width: 400px) {
          .legal-header { padding-left: 10px; padding-right: 10px; }
          .legal-body   { padding: 12px 10px 28px; }
        }
      `}</style>
    </motion.div>
  );
}