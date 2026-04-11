// src/lib/redis.ts
import Redis from 'ioredis';
import Bull from 'bull';
import { EmailJob } from '@/types';
import { env } from './env';
import { lazy } from 'react';

const isTlsRedis = env.REDIS_URL.startsWith('rediss://');

const redisUrl = new URL(env.REDIS_URL);

const redisConnectionOptions = {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    ...(isTlsRedis ? { tls: {} } : {}),
    
  };


// Redis singleton
const globalForRedis = globalThis as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(env.REDIS_URL, redisConnectionOptions);

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

const bullRedisConfig = {
  redis: {
    host:  redisUrl.hostname,
    port: Number(redisUrl.port) ||(isTlsRedis ? 6380 : 6379),
    db: redisUrl.pathname ? Number(redisUrl.pathname.replace(/^\//, '') || '0') : 0,
    username : redisUrl.username || undefined,
    password : redisUrl.password || undefined,
    ...(isTlsRedis ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  },
};

// Bull queues
export const emailQueue = new Bull<EmailJob>('email-queue', bullRedisConfig);
export const scheduleQueue = new Bull('schedule-queue', bullRedisConfig);
export const streakQueue = new Bull('streak-queue', bullRedisConfig);

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
