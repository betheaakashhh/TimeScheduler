// src/lib/env.ts
export const env = {
  DATABASE_URL:        process.env.DATABASE_URL!,
  DIRECT_URL:          process.env.DIRECT_URL!,
  NEXTAUTH_SECRET:     process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL:        process.env.NEXTAUTH_URL!,
  SUPABASE_URL:        process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY:   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY!,
  REDIS_URL:           process.env.REDIS_URL || 'redis://localhost:6379',
  SMTP_HOST:           process.env.SMTP_HOST!,
  SMTP_PORT:           parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER:           process.env.SMTP_USER!,
  SMTP_PASS:           process.env.SMTP_PASS!,
  SMTP_FROM:           process.env.SMTP_FROM || 'noreply@rhythmiq.app',
  SOCKET_PORT:         parseInt(process.env.SOCKET_PORT || '3001'),
};
