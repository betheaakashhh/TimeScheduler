// src/lib/redis.ts
import Redis from 'ioredis';
import Bull from 'bull';
import { EmailJob } from '@/types';
import { env } from './env';

// Redis singleton
const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Bull queues
export const emailQueue = new Bull<EmailJob>('email-queue', env.REDIS_URL);
export const scheduleQueue = new Bull('schedule-queue', env.REDIS_URL);
export const streakQueue = new Bull('streak-queue', env.REDIS_URL);

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  },
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },
  async del(key: string): Promise<void> {
    await redis.del(key);
  },
  async invalidateUser(userId: string): Promise<void> {
    const keys = await redis.keys(`user:${userId}:*`);
    if (keys.length > 0) await redis.del(...keys);
  },
};

// Cache keys
export const CACHE_KEYS = {
  userSchedule: (userId: string, date: string) => `user:${userId}:schedule:${date}`,
  userStreak:   (userId: string)               => `user:${userId}:streak`,
  userStats:    (userId: string, date: string) => `user:${userId}:stats:${date}`,
  academic:     (userId: string)               => `user:${userId}:academic`,
};
