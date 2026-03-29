import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { db, feedbacks, orders } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schema for submitting feedback
const submitFeedbackSchema = z.object({
    orderId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
});

/**
 * POST /api/feedbacks
 * Submit feedback for a completed order (user only, once per order)
 */
router.post('/', validateBody(submitFeedbackSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { orderId, rating, comment } = req.body;

        // Verify order exists and belongs to user
        const orderResult = await db.select()
            .from(orders)
            .where(eq(orders.id, orderId));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Order not found',
                })
            );
        }

        const order = orderResult[0];

        if (order.userId !== userId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'You can only submit feedback for your own orders',
                })
            );
        }

        if (order.status !== 'COMPLETED') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Feedback can only be submitted for completed orders',
                })
            );
        }

        // Check if feedback already exists
        const existingFeedback = await db.select()
            .from(feedbacks)
            .where(eq(feedbacks.orderId, orderId));

        if (existingFeedback.length > 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Feedback has already been submitted for this order',
                })
            );
        }

        // Insert feedback
        const result = await db.insert(feedbacks).values({
            orderId,
            userId,
            rating,
            comment: comment || null,
        }).returning();

        logger.info('Feedback submitted', { orderId, userId, rating });

        return res.status(201).json(successResponse({
            feedback: result[0],
            message: 'Feedback submitted successfully',
        }));
    } catch (error) {
        logger.error('Failed to submit feedback', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to submit feedback',
            })
        );
    }
});

/**
 * GET /api/feedbacks/order/:orderId
 * Get feedback for an order (user sees own, admin sees any)
 */
router.get('/order/:orderId', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const userId = req.user!.userId;
        const userType = req.user!.userType;

        // If not admin, verify user owns this order
        if (userType !== 'ADMIN') {
            const orderResult = await db.select()
                .from(orders)
                .where(eq(orders.id, orderId));

            if (orderResult.length === 0 || orderResult[0].userId !== userId) {
                return res.status(403).json(
                    errorResponse({
                        code: ErrorCodes.FORBIDDEN,
                        message: 'Unauthorized',
                    })
                );
            }
        }

        const result = await db.select()
            .from(feedbacks)
            .where(eq(feedbacks.orderId, orderId));

        return res.json(successResponse(result.length > 0 ? result[0] : null));
    } catch (error) {
        logger.error('Failed to fetch feedback', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch feedback',
            })
        );
    }
});

export default router;
