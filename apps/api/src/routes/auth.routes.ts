import { Router } from 'express';
import { z } from 'zod';
import { sendSmsOtp, sendWhatsAppOtp, verifyOtp } from '../services/otp.service';
import { findOrCreateUser, findAdminByPhone, createSession, invalidateSession } from '../services/auth.service';
import { validateBody } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { otpRateLimiter } from '../middleware/rateLimit.middleware';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router = Router();

// Validation schemas
const sendOtpSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    method: z.enum(['SMS', 'WHATSAPP']).default('SMS'),
});

const verifyOtpSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number
 */
router.post('/send-otp', otpRateLimiter, validateBody(sendOtpSchema), async (req, res) => {
    try {
        const { phone, method } = req.body;

        let result;
        if (method === 'WHATSAPP') {
            result = await sendWhatsAppOtp(phone);
        } else {
            result = await sendSmsOtp(phone);
        }

        if (!result.success) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.OTP_SEND_FAILED,
                    message: result.error || 'Failed to send OTP',
                })
            );
        }

        return res.json(
            successResponse({
                success: true,
                message: `OTP sent via ${method}`,
                expiresIn: 300, // 5 minutes
            })
        );
    } catch (error) {
        logger.error('Send OTP error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to send OTP',
            })
        );
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and login/register user
 */
router.post('/verify-otp', validateBody(verifyOtpSchema), async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Verify OTP with 2factor.in
        const verification = await verifyOtp(phone, otp);

        if (!verification.success) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.OTP_INVALID,
                    message: verification.error || 'Invalid OTP',
                })
            );
        }

        // Check if phone belongs to an admin
        const admin = await findAdminByPhone(phone);

        if (admin) {
            // Admin login
            const token = await createSession(admin.id, 'ADMIN', admin);

            return res.json(
                successResponse({
                    success: true,
                    token,
                    user: admin,
                    userType: 'ADMIN',
                })
            );
        }

        // User login/registration
        const user = await findOrCreateUser(phone);
        const token = await createSession(user.id, 'USER', user);

        return res.json(
            successResponse({
                success: true,
                token,
                user,
                userType: 'USER',
            })
        );
    } catch (error) {
        logger.error('Verify OTP error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Authentication failed',
            })
        );
    }
});

/**
 * POST /api/auth/logout
 * Invalidate session
 */
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        if (req.user) {
            await invalidateSession(req.user.userId);
        }

        return res.json(
            successResponse({
                success: true,
                message: 'Logged out successfully',
            })
        );
    } catch (error) {
        logger.error('Logout error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Logout failed',
            })
        );
    }
});

/**
 * GET /api/auth/me
 * Get current user/admin profile
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: 'Not authenticated',
                })
            );
        }

        return res.json(
            successResponse({
                userId: req.user.userId,
                userType: req.user.userType,
                role: req.user.role,
                phone: req.user.phone,
                email: req.user.email,
                name: req.user.name,
            })
        );
    } catch (error) {
        logger.error('Get profile error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to get profile',
            })
        );
    }
});

export default router;
