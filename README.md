# RhythmIQ — Smart Daily Timetable Manager

A full-stack real-time timetable and task tracker built with **Next.js 14**, **Supabase + Prisma**, **Socket.io**, and **Redis (Bull)** — with a beautiful, fully responsive UI (mobile-first, dark mode included).

---

## ✨ Features

### Core
- **Live Schedule Timeline** — real-time clock, auto-advancing slot detection, progress bars
- **Import or Create** — upload your college timetable (PDF/Excel/CSV) or build slot by slot
- **Academic Timetable Parser** — PDF parsing with `pdf-parse`, Excel/CSV with `xlsx` — extracts subjects, times, rooms automatically
- **Live Academic Peek** — shows "now in session" and "up next" subject inside the college slot

### Task System
- **Auto-mark slots** — time-based automatic completion (e.g. morning routine)
- **Manual slots** — user must explicitly mark done
- **Food-gated slots** — must log food items before marking breakfast/dinner complete
- **Checklist per slot** — required/optional items, auto-prefilled per tag

### Strict Mode (3 options per slot)
| Mode | Effect |
|------|--------|
| 🔒 Hard Lock | Blocks ALL subsequent tasks until completed |
| ⚠️ Warn & Skip | Streak immediately breaks, can skip |
| ⏳ Grace Period | 30-minute buffer before penalty |

### Gamification
- **Streak System** — 🌞 Sun icon, daily maintenance required (60% of strict tasks)
- **6-Level Day System** — Starter → Energized → Achiever → On Fire → Elite → Legend (resets midnight)
- **XP / milestone emails** at streak achievements (7, 14, 21, 30, 60, 100 days)
- **Streak at-risk warnings** — automated 9 PM email if streak is in danger

### Notifications
- Email reminders for strict/academic tasks (Bull queue → Nodemailer)
- Wake-up morning greeting email
- Streak milestone + warning emails
- Browser push notifications for "slot starts in 5 min"
- Per-slot toggle: choose which slots send email alerts

### Analytics
- 7-day activity heatmap with completion rates
- Per-day level tracking (day-only, resets at midnight)
- Streak history (current + personal best)
- Consistent stats UI

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Redis (local or Upstash)
- SMTP credentials (Gmail App Password works great)

### 2. Clone & install

```bash
git clone https://github.com/your-org/rhythmiq.git
cd rhythmiq
npm install
```

### 3. Environment

```bash
cp .env.example .env.local
# Fill in your values (Supabase, SMTP, Redis, NextAuth secret)
```

### 4. Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run

```bash
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Socket.io server
npx ts-node src/server/socket.ts

# (Optional) Prisma Studio
npm run prisma:studio
```

Open `http://localhost:3000`

---

## 🏗 Architecture

```
rhythmiq/
├── prisma/
│   └── schema.prisma         # All DB models
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # NextAuth (credentials + Google)
│   │   │   ├── schedule/     # CRUD + task logs
│   │   │   ├── academic/     # Upload + parse + manage
│   │   │   ├── food-log/     # Meal logging
│   │   │   ├── streak/       # Streak logic + cron endpoint
│   │   │   └── settings/     # User preferences
│   │   ├── dashboard/        # Main dashboard page + layout
│   │   ├── schedule/         # Full schedule management
│   │   ├── academic/         # Academic timetable page
│   │   ├── analytics/        # Stats & heatmap
│   │   └── settings/         # Preferences page
│   ├── components/
│   │   └── schedule/         # AddSlotModal, SlotCard, etc.
│   ├── hooks/
│   │   └── useSocket.ts      # Real-time socket hooks + clock hooks
│   ├── lib/
│   │   ├── prisma.ts         # DB client singleton
│   │   ├── redis.ts          # Redis + Bull queue setup
│   │   ├── email.ts          # Nodemailer + queue worker
│   │   ├── parseAcademic.ts  # PDF/Excel timetable parser
│   │   ├── scheduleUtils.ts  # Time helpers, streak logic, levels
│   │   └── env.ts            # Typed env vars
│   ├── server/
│   │   └── socket.ts         # Socket.io server (separate process)
│   ├── store/
│   │   └── scheduleStore.ts  # Zustand global state
│   └── types/
│       └── index.ts          # All TypeScript types
```

---

## 🗃 Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `User` | Auth, settings, email prefs |
| `ScheduleSlot` | Time slots with tag, strict mode, checklist |
| `TaskLog` | Daily completion records per slot |
| `Streak` | Current/best streak tracking |
| `FoodLog` | Meal items logged per day |
| `AcademicTimetable` | Parsed timetable + periods |
| `AcademicPeriod` | Individual class periods |

---

## ⚙️ Cron Jobs

Set up a cron to hit the streak warning endpoint at 9 PM:

```bash
# crontab -e
0 21 * * * curl -X POST https://your-app.com/api/streak \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use Vercel Cron Jobs / GitHub Actions.

---

## 🎨 Design System

- **Fonts**: Syne (headings) + DM Sans (body)
- **Color palette**: Warm orange accent (`#FF6B35`), green success, blue info
- **Light** (default) + **Dark** mode via `data-theme="dark"` on `<html>`
- **Mobile-first**: sidebar hidden on mobile → bottom nav bar
- All breakpoints handled in `globals.css`

---

## 📱 Mobile Experience

- Bottom navigation bar (5 tabs)
- Full-width card layouts
- Touch-optimized toggle switches and buttons
- Safe area insets for iOS notch support
- `100dvh` for correct mobile viewport height

---

## 🔌 Real-time Events (Socket.io)

| Event | Direction | Meaning |
|-------|-----------|---------|
| `slot:status-update` | Server → Client | Task marked done/skipped/blocked |
| `slot:auto-complete` | Server → Client | Server auto-completed a slot |
| `slot:next-starts` | Server → Client | Upcoming slot in 5 min |
| `streak:updated` | Server → Client | Streak changed |
| `academic:period-change` | Server → Client | Current/next class changed |
| `slot:mark-complete` | Client → Server | User marks slot done |
| `slot:mark-skip` | Client → Server | User skips a slot |

---

## 🔒 Strict Mode Logic

```
User skips a HARD strict slot
  → All subsequent slots today: status = BLOCKED
  → User cannot mark them until the skipped slot is completed (grace window)

User skips a WARN strict slot
  → Streak.current = 0 immediately
  → User notified by toast + optional email

User skips a GRACE strict slot
  → 30-minute window given
  → If not completed in 30 min → streak breaks (handled by socket tick)
```

---

## 📊 Streak Rules

- Qualifies if: **≥ 60% of strict tasks** completed for the day
- Resets at midnight if not qualified
- Milestones: 7, 14, 21, 30, 60, 100 days → email celebration
- At-risk email sent at 9 PM if streak qualifies < 60%

---

## 🧪 Testing

```bash
# Unit tests (add jest/vitest)
npm test

# E2E (add Playwright)
npx playwright test
```

---

## 📄 License

MIT — build freely, ship fast.
