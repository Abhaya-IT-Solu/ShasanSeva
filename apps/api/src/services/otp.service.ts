import { env } from '../config/env';
import { redis, REDIS_KEYS, REDIS_TTL } from '../lib/redis';
import { logger } from '../lib/utils';

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

interface OtpSession {
    phone: string;
    requestId?: string;
    attempts: number;
    createdAt: number;
}

interface Msg91Response {
    type: 'success' | 'error';
    message?: string;
    request_id?: string;
}

/**
 * Send OTP via MSG91
 * MSG91 API: POST /otp
 */
export async function sendSmsOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Check rate limit (max 3 OTPs per phone per 10 minutes)
        const rateLimitKey = REDIS_KEYS.RATE_LIMIT(`otp:${phone}`);
        const attempts = await redis.incr(rateLimitKey);

        if (attempts === 1) {
            await redis.expire(rateLimitKey, REDIS_TTL.RATE_LIMIT);
        }

        if (attempts > 3) {
            return { success: false, error: 'Too many OTP requests. Please try again later.' };
        }

        // Format phone with country code
        const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

        // Call MSG91 Send OTP API
        const response = await fetch(`${MSG91_BASE_URL}/otp?template_id=${env.MSG91_TEMPLATE_ID}&mobile=${formattedPhone}`, {
            method: 'POST',
            headers: {
                'authkey': env.MSG91_AUTH_KEY || '',
                'Content-Type': 'application/json',
            },
        });

        const data: Msg91Response = await response.json();

        if (data.type !== 'success') {
            logger.error('MSG91 Send OTP failed', { phone, error: data.message });
            return { success: false, error: data.message || 'Failed to send OTP. Please try again.' };
        }

        // Store OTP session in Redis
        const otpSession: OtpSession = {
            phone: formattedPhone,
            requestId: data.request_id,
            attempts: 0,
            createdAt: Date.now(),
        };
        await redis.set(REDIS_KEYS.OTP(phone), JSON.stringify(otpSession), { ex: REDIS_TTL.OTP });

        logger.info('SMS OTP sent successfully via MSG91', { phone });
        return { success: true };
    } catch (error) {
        logger.error('Error sending SMS OTP', error);
        return { success: false, error: 'Failed to send OTP. Please try again.' };
    }
}

/**
 * Send WhatsApp OTP via MSG91 (if enabled)
 * Falls back to SMS if WhatsApp not configured
 */
export async function sendWhatsAppOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    // MSG91 WhatsApp OTP uses the same flow but with different template
    // For now, fallback to SMS
    return sendSmsOtp(phone);
}

/**
 * Verify OTP via MSG91
 * MSG91 API: POST /otp/verify
 */
export async function verifyOtp(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Get OTP session from Redis
        const sessionData = await redis.get<string>(REDIS_KEYS.OTP(phone));

        if (!sessionData) {
            return { success: false, error: 'OTP expired. Please request a new one.' };
        }

        const session: OtpSession = typeof sessionData === 'string'
            ? JSON.parse(sessionData)
            : sessionData;

        // Check max verification attempts (max 5)
        if (session.attempts >= 5) {
            await redis.del(REDIS_KEYS.OTP(phone));
            return { success: false, error: 'Too many invalid attempts. Please request a new OTP.' };
        }

        // Increment attempts
        session.attempts++;
        await redis.set(REDIS_KEYS.OTP(phone), JSON.stringify(session), { ex: REDIS_TTL.OTP });

        // Format phone with country code
        const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

        // Call MSG91 Verify OTP API
        const response = await fetch(`${MSG91_BASE_URL}/otp/verify?mobile=${formattedPhone}&otp=${otp}`, {
            method: 'POST',
            headers: {
                'authkey': env.MSG91_AUTH_KEY || '',
                'Content-Type': 'application/json',
            },
        });

        const data: Msg91Response = await response.json();

        if (data.type !== 'success') {
            logger.warn('OTP verification failed', { phone, error: data.message });
            return { success: false, error: 'Invalid OTP. Please try again.' };
        }

        // OTP verified - delete session
        await redis.del(REDIS_KEYS.OTP(phone));

        logger.info('OTP verified successfully', { phone });
        return { success: true };
    } catch (error) {
        logger.error('Error verifying OTP', error);
        return { success: false, error: 'Verification failed. Please try again.' };
    }
}

/**
 * Resend OTP via MSG91
 */
export async function resendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
        const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

        const response = await fetch(`${MSG91_BASE_URL}/otp/retry?mobile=${formattedPhone}&retrytype=text`, {
            method: 'POST',
            headers: {
                'authkey': env.MSG91_AUTH_KEY || '',
                'Content-Type': 'application/json',
            },
        });

        const data: Msg91Response = await response.json();

        if (data.type !== 'success') {
            logger.warn('OTP resend failed', { phone, error: data.message });
            return { success: false, error: data.message || 'Failed to resend OTP.' };
        }

        logger.info('OTP resent successfully', { phone });
        return { success: true };
    } catch (error) {
        logger.error('Error resending OTP', error);
        return { success: false, error: 'Failed to resend OTP. Please try again.' };
    }
}
