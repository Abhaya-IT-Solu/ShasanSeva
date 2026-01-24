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
