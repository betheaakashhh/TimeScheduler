// src/lib/redis.ts
// Redis is optional — if unreachable, all cache operations silently no-op.
// This prevents Redis errors from slowing down or breaking API responses.
import { EmailJob } from '@/types';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';
const REDIS_TIMEOUT_MS = 400; // max time to wait for any Redis op before giving up

// ── Lazy Redis singleton ──────────────────────────────────────────────────────
type RedisClient = import('ioredis').default;
const globalForRedis = globalThis as unknown as { _redis?: RedisClient; _redisReady?: boolean };

async function getRedis(): Promise<RedisClient | null> {
  if (globalForRedis._redis) return globalForRedis._redis;

  try {
    const Redis = (await import('ioredis')).default;
    const isTls = REDIS_URL.startsWith('rediss://');
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => times > 2 ? null : Math.min(times * 300, 1000),
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 3000,
      ...(isTls ? { tls: {} } : {}),
    });

    client.on('error', (err: Error) => {
      if (!globalForRedis._redisReady) return; // suppress pre-connect errors
      if (err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED')) {
        // Don't log repeatedly — just mark as unavailable
      } else {
        console.error('Redis error:', err.message);
      }
    });

    client.on('ready', () => { globalForRedis._redisReady = true; });

    if (process.env.NODE_ENV !== 'production') globalForRedis._redis = client;
    return client;
  } catch {
    return null;
  }
}

// Wrap any Redis op with a timeout — returns null/false on timeout or error
async function withTimeout<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), REDIS_TIMEOUT_MS)),
    ]);
  } catch {
    return fallback;
  }
}

// ── Cache helpers (all operations are safe-to-fail) ──────────────────────────
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const r = await getRedis();
    if (!r) return null;
    return withTimeout(async () => {
      const val = await r.get(key);
      return val ? JSON.parse(val) as T : null;
    }, null);
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const r = await getRedis();
    if (!r) return;
    await withTimeout(async () => {
      await r.setex(key, ttlSeconds, JSON.stringify(value));
    }, undefined);
  },

  async del(key: string): Promise<void> {
    const r = await getRedis();
    if (!r) return;
    await withTimeout(async () => { await r.del(key); }, undefined);
  },

  async invalidateUser(userId: string): Promise<void> {
    const r = await getRedis();
    if (!r) return;
    await withTimeout(async () => {
      const keys = await r.keys(`user:${userId}:*`);
      if (keys.length > 0) await r.del(...keys);
    }, undefined);
  },
};

// ── Cache key helpers ─────────────────────────────────────────────────────────
export const CACHE_KEYS = {
  userSchedule: (userId: string, date: string) => `user:${userId}:schedule:${date}`,
  userStreak:   (userId: string)               => `user:${userId}:streak`,
  userStats:    (userId: string, date: string) => `user:${userId}:stats:${date}`,
  academic:     (userId: string)               => `user:${userId}:academic`,
};

// ── Bull queues — lazy, safe-to-fail ─────────────────────────────────────────
import type { EmailJob as EJ } from '@/types';

let _emailQueue: any = null;
let _scheduleQueue: any = null;

async function getBullConfig() {
  const url = new URL(REDIS_URL.replace('rediss://', 'https://').replace('redis://', 'http://'));
  return {
    redis: {
      host:     url.hostname,
      port:     parseInt(url.port) || (REDIS_URL.startsWith('rediss://') ? 6380 : 6379),
      password: url.password || undefined,
      username: url.username || undefined,
      db:       url.pathname ? parseInt(url.pathname.replace('/', '') || '0') : 0,
      ...(REDIS_URL.startsWith('rediss://') ? { tls: {} } : {}),
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    },
  };
}

export async function getEmailQueue() {
  if (_emailQueue) return _emailQueue;
  try {
    const Bull = (await import('bull')).default;
    const cfg  = await getBullConfig();
    _emailQueue = new Bull<EmailJob>('email-queue', cfg);
    return _emailQueue;
  } catch { return null; }
}

export async function getScheduleQueue() {
  if (_scheduleQueue) return _scheduleQueue;
  try {
    const Bull = (await import('bull')).default;
    const cfg  = await getBullConfig();
    _scheduleQueue = new Bull('schedule-queue', cfg);
    return _scheduleQueue;
  } catch { return null; }
}

// Legacy sync exports for backward compat
export const emailQueue = { add: async (data: any, opts?: any) => (await getEmailQueue())?.add(data, opts) };
export const scheduleQueue = { add: async (data: any, opts?: any) => (await getScheduleQueue())?.add(data, opts) };
export const streakQueue = emailQueue; // placeholder

// Legacy redis export (direct access — use cache.* helpers instead)
export const redis = {
  get: (key: string) => cache.get(key),
  set: (key: string, val: string) => cache.set(key, val),
  del: (key: string) => cache.del(key),
  keys: async (_pattern: string) => [] as string[],
  setex: (key: string, ttl: number, val: string) => cache.set(key, val, ttl),
};
