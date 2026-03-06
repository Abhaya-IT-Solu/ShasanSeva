import type { ApiResponse, ApiError } from '@shasansetu/types';

// Logger utility
export const logger = {
    info: (message: string, data?: Record<string, unknown>) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    },

    error: (message: string, error?: unknown) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    },

    warn: (message: string, data?: Record<string, unknown>) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    },

    debug: (message: string, data?: Record<string, unknown>) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
        }
    },
};

// API Response helpers
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
        success: true,
        data,
        message,
    };
}

export function errorResponse(error: ApiError, message?: string): ApiResponse {
    return {
        success: false,
        error,
        message,
    };
}

// Common error codes
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_SEND_FAILED: 'OTP_SEND_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Transient network error codes that are safe to retry
const RETRYABLE_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'];

/**
 * Wraps a DB operation with automatic retries on transient network errors.
 * Uses exponential backoff: 1s, 2s, 4s.
 * Prevents server restarts caused by Supabase DNS/connection drops.
 */
export async function withDbRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    label = 'DB operation'
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (err: unknown) {
            lastError = err;
            const code = (err as NodeJS.ErrnoException)?.code;
            if (attempt < maxRetries && code && RETRYABLE_CODES.includes(code)) {
                const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                logger.warn(`${label} failed with ${code}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                break;
            }
        }
    }
    throw lastError;
}

