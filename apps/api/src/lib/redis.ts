import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';

// Create Redis client
export const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL || '',
    token: env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Key prefixes
export const REDIS_KEYS = {
    OTP: (phone: string) => `otp:${phone}`,
    SESSION: (userId: string) => `session:${userId}`,
    RATE_LIMIT: (key: string) => `rate:${key}`,
} as const;

// TTL values (in seconds)
export const REDIS_TTL = {
    OTP: 5 * 60, // 5 minutes
    SESSION: 7 * 24 * 60 * 60, // 7 days
    RATE_LIMIT: 10 * 60, // 10 minutes
} as const;
