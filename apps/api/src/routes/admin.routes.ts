import { Router } from 'express';
import { z } from 'zod';
import { db, admins, adminAnalytics, users, orders } from '@shasansetu/db';
import { eq, count, and, gte } from 'drizzle-orm';
import { authMiddleware, adminMiddleware, superAdminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';


const router: Router = Router();

// All admin routes require authentication
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (_req, res) => {
    try {
        // Get total users count
        const usersCount = await db.select({ count: count() }).from(users);

        // Get order counts by status
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newOrdersCount = await db.select({ count: count() })
            .from(orders)
            .where(eq(orders.status, 'PAID'));

        const inProgressCount = await db.select({ count: count() })
            .from(orders)
            .where(eq(orders.status, 'IN_PROGRESS'));

        const completedTodayCount = await db.select({ count: count() })
            .from(orders)
            .where(
                and(
                    eq(orders.status, 'COMPLETED'),
                    gte(orders.updatedAt, today)
                )
            );

        const stats = {
            totalUsers: usersCount[0]?.count || 0,
            newOrders: newOrdersCount[0]?.count || 0,
            inProgress: inProgressCount[0]?.count || 0,
            completedToday: completedTodayCount[0]?.count || 0,
        };

        return res.json(successResponse(stats));
    } catch (error) {
        logger.error('Get stats error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch statistics',
            })
        );
    }
});

/**
 * GET /api/admin/users
 * List all users (admin)
 */
router.get('/users', async (_req, res) => {
    try {
        const result = await db.select({
            id: users.id,
            phone: users.phone,
            email: users.email,
            name: users.name,
            category: users.category,
            profileComplete: users.profileComplete,
            createdAt: users.createdAt,
        }).from(users).orderBy(users.createdAt);

        return res.json(successResponse(result));
    } catch (error) {
        logger.error('List users error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch users',
            })
        );
    }
});

/**
 * GET /api/admin/users/:id
 * Get user details (admin)
 */
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.select()
            .from(users)
            .where(eq(users.id, id));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'User not found',
                })
            );
        }

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Get user error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch user',
            })
        );
    }
});

/**
 * GET /api/admin/my-analytics
 * Get current admin's analytics
 */
router.get('/my-analytics', async (req, res) => {
    try {
        const adminId = req.user!.userId;

        const result = await db.select()
            .from(adminAnalytics)
            .where(eq(adminAnalytics.adminId, adminId));

        if (result.length === 0) {
            // Return default analytics
            return res.json(successResponse({
                totalOrdersHandled: 0,
                ordersCompleted: 0,
                ordersCancelled: 0,
                ordersInProgress: 0,
                documentsVerified: 0,
                documentsRejected: 0,
                avgCompletionTimeHours: null,
                lastActiveAt: null,
            }));
        }

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Get analytics error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch analytics',
            })
        );
    }
});

// ==========================================
// SUPER ADMIN ROUTES
// ==========================================

/**
 * GET /api/admin/admins
 * List all admins (super admin only)
 */
router.get('/admins', superAdminMiddleware, async (_req, res) => {
    try {
        const result = await db.select({
            id: admins.id,
            phone: admins.phone,
            email: admins.email,
            name: admins.name,
            role: admins.role,
            isActive: admins.isActive,
            createdAt: admins.createdAt,
        }).from(admins).orderBy(admins.createdAt);

        return res.json(successResponse(result));
    } catch (error) {
        logger.error('List admins error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch admins',
            })
        );
    }
});

import { hashPassword } from '../services/auth.service.js';

// Validation for creating admin
const createAdminSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    email: z.string().email().optional(),
    name: z.string().min(2).max(255),
    role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/admin/admins
 * Create new admin (super admin only)
 */
router.post('/admins', superAdminMiddleware, validateBody(createAdminSchema), async (req, res) => {
    try {
        const { password, ...data } = req.body;
        const creatorId = req.user!.userId;

        // Check if phone already exists
        const existing = await db.select({ id: admins.id })
            .from(admins)
            .where(eq(admins.phone, data.phone));

        if (existing.length > 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Admin with this phone already exists',
                })
            );
        }

        // Also check if phone exists in users table
        const existingUser = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.phone, data.phone));

        if (existingUser.length > 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'This phone is already registered as a user',
                })
            );
        }

        const passwordHash = await hashPassword(password);

        const result = await db.insert(admins).values({
            ...data,
            passwordHash,
            createdBy: creatorId,
        }).returning();

        // Create analytics record for new admin
        await db.insert(adminAnalytics).values({
            adminId: result[0].id,
        });

        logger.info('Admin created', { adminId: result[0].id, createdBy: creatorId });

        return res.status(201).json(successResponse({
            id: result[0].id,
            phone: result[0].phone,
            email: result[0].email,
            name: result[0].name,
            role: result[0].role,
            isActive: result[0].isActive,
        }));
    } catch (error) {
        logger.error('Create admin error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to create admin',
            })
        );
    }
});

/**
 * PATCH /api/admin/admins/:id/toggle-active
 * Toggle admin active status (super admin only)
 */
router.patch('/admins/:id/toggle-active', superAdminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentAdminId = req.user!.userId;

        // Can't deactivate yourself
        if (id === currentAdminId) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Cannot deactivate your own account',
                })
            );
        }

        const existing = await db.select()
            .from(admins)
            .where(eq(admins.id, id));

        if (existing.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Admin not found',
                })
            );
        }

        const newStatus = !existing[0].isActive;

        await db.update(admins)
            .set({
                isActive: newStatus,
                updatedAt: new Date(),
            })
            .where(eq(admins.id, id));

        logger.info('Admin status toggled', { adminId: id, isActive: newStatus });

        return res.json(successResponse({
            id,
            isActive: newStatus,
            message: newStatus ? 'Admin activated' : 'Admin deactivated',
        }));
    } catch (error) {
        logger.error('Toggle admin error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to update admin',
            })
        );
    }
});

/**
 * GET /api/admin/admins/:id/analytics
 * Get specific admin's analytics (super admin only)
 */
router.get('/admins/:id/analytics', superAdminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.select()
            .from(adminAnalytics)
            .where(eq(adminAnalytics.adminId, id));

        if (result.length === 0) {
            return res.json(successResponse({
                totalOrdersHandled: 0,
                ordersCompleted: 0,
                ordersCancelled: 0,
                ordersInProgress: 0,
                documentsVerified: 0,
                documentsRejected: 0,
                avgCompletionTimeHours: null,
                lastActiveAt: null,
            }));
        }

        return res.json(successResponse(result[0]));
    } catch (error) {
        logger.error('Get admin analytics error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch analytics',
            })
        );
    }
});

export default router;
