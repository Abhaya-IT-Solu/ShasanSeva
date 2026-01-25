import { Router } from 'express';
import { z } from 'zod';
import { db, users } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import { authMiddleware, userMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router: Router = Router();

// All user routes require authentication
router.use(authMiddleware, userMiddleware);

// Validation schemas
const updateProfileSchema = z.object({
    name: z.string().min(2).max(255).optional(),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional(),
    category: z.enum(['STUDENT', 'FARMER', 'LOAN_CANDIDATE', 'OTHER']).optional(),
    address: z.object({
        line1: z.string().optional(),
        line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
    }).optional(),
});

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user!.userId;

        const result = await db.select().from(users).where(eq(users.id, userId));

        if (result.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'User not found',
                })
            );
        }

        const user = result[0];

        return res.json(
            successResponse({
                id: user.id,
                phone: user.phone,
                email: user.email,
                name: user.name,
                category: user.category,
                address: user.address,
                savedDocuments: user.savedDocuments,
                profileComplete: user.profileComplete,
                createdAt: user.createdAt,
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

/**
 * PATCH /api/users/profile
 * Update current user's profile
 */
router.patch('/profile', validateBody(updateProfileSchema), async (req, res) => {
    try {
        const userId = req.user!.userId;
        const updates = req.body;

        // Check if profile is now complete
        const existingUser = await db.select().from(users).where(eq(users.id, userId));
        if (existingUser.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'User not found',
                })
            );
        }

        const currentUser = existingUser[0];
        const newName = updates.name || currentUser.name;
        const newPhone = updates.phone || currentUser.phone;
        const newCategory = updates.category || currentUser.category;

        // Profile is complete if name, phone and category are set
        const profileComplete = !!(newName && newPhone && newCategory);

        const result = await db.update(users)
            .set({
                ...updates,
                profileComplete,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        const updatedUser = result[0];

        return res.json(
            successResponse({
                id: updatedUser.id,
                phone: updatedUser.phone,
                email: updatedUser.email,
                name: updatedUser.name,
                category: updatedUser.category,
                address: updatedUser.address,
                profileComplete: updatedUser.profileComplete,
                updatedAt: updatedUser.updatedAt,
            })
        );
    } catch (error) {
        logger.error('Update profile error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to update profile',
            })
        );
    }
});

export default router;
