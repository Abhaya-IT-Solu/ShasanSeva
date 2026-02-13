import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';
import { logger } from './utils.js';

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
    // Cache keys
    SCHEMES_LIST: (locale: string, category?: string) =>
        `cache:schemes:${locale}:${category || 'all'}`,
    SCHEME_DETAIL: (slug: string, locale: string) =>
        `cache:scheme:${slug}:${locale}`,
} as const;

// TTL values (in seconds)
export const REDIS_TTL = {
    OTP: 5 * 60, // 5 minutes
    SESSION: 7 * 24 * 60 * 60, // 7 days
    RATE_LIMIT: 10 * 60, // 10 minutes
    // Cache TTLs
    SCHEMES_LIST: 30 * 60, // 30 minutes
    SCHEME_DETAIL: 60 * 60, // 1 hour
} as const;

/**
 * Invalidate all scheme-related cache keys
 * Called when admin creates/updates/deletes a scheme
 */
export async function invalidateSchemeCache(): Promise<void> {
    try {
        // Get all cache keys matching scheme pattern
        const keys = await redis.keys('cache:scheme*');
        if (keys.length > 0) {
            await redis.del(...keys);
            logger.info(`Invalidated ${keys.length} scheme cache keys`);
        }
    } catch (error) {
        logger.error('Failed to invalidate scheme cache', error);
    }
}
