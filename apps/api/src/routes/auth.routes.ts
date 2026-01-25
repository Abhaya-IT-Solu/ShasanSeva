import { Router } from 'express';
import { z } from 'zod';
import {
    registerUser,
    authenticateUser,
    updateUserPassword,
    createSession,
    invalidateSession
} from '../services/auth.service';
import { validateBody } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router: Router = Router();

// Validation schemas
const registerSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

const loginSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * POST /api/auth/register
 * Register new user with phone + password
 */
router.post('/register', validateBody(registerSchema), async (req, res) => {
    try {
        const { phone, password, name } = req.body;

        const result = await registerUser(phone, password, name);

        if (!result.success) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: result.error,
                })
            );
        }

        // Create session and return token
        const token = await createSession(result.user.id, 'USER', result.user);

        return res.status(201).json(
            successResponse({
                success: true,
                token,
                user: result.user,
                userType: 'USER',
            })
        );
    } catch (error) {
        logger.error('Register error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Registration failed',
            })
        );
    }
});

/**
 * POST /api/auth/login
 * Login with phone + password (works for both users and admins)
 */
router.post('/login', validateBody(loginSchema), async (req, res) => {
    try {
        const { phone, password } = req.body;

        const result = await authenticateUser(phone, password);

        if (!result.success) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: result.error,
                })
            );
        }

        if (result.isAdmin) {
            const token = await createSession(result.admin.id, 'ADMIN', result.admin);
            return res.json(
                successResponse({
                    success: true,
                    token,
                    user: result.admin,
                    userType: 'ADMIN',
                })
            );
        }

        const token = await createSession(result.user.id, 'USER', result.user);
        return res.json(
            successResponse({
                success: true,
                token,
                user: result.user,
                userType: 'USER',
            })
        );
    } catch (error) {
        logger.error('Login error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Login failed',
            })
        );
    }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user/admin
 */
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: 'Not authenticated',
                })
            );
        }

        const { currentPassword, newPassword } = req.body;

        const result = await updateUserPassword(
            req.user.userId,
            req.user.userType,
            currentPassword,
            newPassword
        );

        if (!result.success) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: result.error || 'Password change failed',
                })
            );
        }

        return res.json(
            successResponse({
                success: true,
                message: 'Password changed successfully',
            })
        );
    } catch (error) {
        logger.error('Change password error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Password change failed',
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
