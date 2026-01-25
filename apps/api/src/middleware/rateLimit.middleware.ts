import type { Request, Response, NextFunction } from 'express';
import { redis, REDIS_KEYS } from '../lib/redis';
import { errorResponse, ErrorCodes } from '../lib/utils';

interface RateLimitOptions {
    windowMs: number;       // Time window in milliseconds
    maxRequests: number;    // Max requests per window
    keyPrefix: string;      // Prefix for Redis key
}

/**
 * Rate limiting middleware using Redis
 */
export function rateLimitMiddleware(options: RateLimitOptions) {
    const { windowMs, maxRequests, keyPrefix } = options;
    const windowSeconds = Math.ceil(windowMs / 1000);

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Use IP address as default key
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const key = REDIS_KEYS.RATE_LIMIT(`${keyPrefix}:${ip}`);

            const requests = await redis.incr(key);

            if (requests === 1) {
                await redis.expire(key, windowSeconds);
            }

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests));

            if (requests > maxRequests) {
                return res.status(429).json(
                    errorResponse({
                        code: ErrorCodes.RATE_LIMITED,
                        message: 'Too many requests. Please try again later.',
                    })
                );
            }

            next();
        } catch (error) {
            // If Redis fails, allow request (fail open)
            next();
        }
    };
}

// Pre-configured rate limiters
export const authRateLimiter = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 requests per 15 minutes
    keyPrefix: 'auth',
});

export const apiRateLimiter = rateLimitMiddleware({
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests per minute
    keyPrefix: 'api',
});

export const otpRateLimiter = rateLimitMiddleware({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5,           // 5 OTP requests per 10 minutes
    keyPrefix: 'otp',
});
