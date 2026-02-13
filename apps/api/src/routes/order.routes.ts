import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { db, orders, documents, schemes, users } from '@shasansetu/db';
import { eq, desc, count } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';

const router: Router = Router();

// Pagination schema
const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(10).max(100).default(20),
});

/**
 * GET /api/orders
 * Get user's orders with scheme details (paginated)
 */
router.get('/', authMiddleware, validateQuery(paginationSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 100);
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await db.select({ count: count() })
            .from(orders)
            .where(eq(orders.userId, userId));
        const total = countResult[0]?.count || 0;

        // Join orders with schemes to get scheme name
        const result = await db.select({
            id: orders.id,
            schemeId: orders.schemeId,
            schemeName: schemes.name,
            schemeCategory: schemes.category,
            paymentAmount: orders.paymentAmount,
            status: orders.status,
            createdAt: orders.createdAt,
            paymentTimestamp: orders.paymentTimestamp,
        })
            .from(orders)
            .leftJoin(schemes, eq(orders.schemeId, schemes.id))
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt))
            .limit(limit)
            .offset(offset);

        return res.json(successResponse({
            data: result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }));
    } catch (error) {
        logger.error('Failed to fetch orders', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch orders',
            })
        );
    }
});

/**
 * GET /api/orders/:id
 * Get order details
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const userType = req.user!.userType;

        // Get order
        const orderResult = await db.select()
            .from(orders)
            .where(eq(orders.id, id));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Order not found',
                })
            );
        }

        const order = orderResult[0];

        // Check authorization (user can only see their own orders, admin can see all)
        if (userType !== 'ADMIN' && order.userId !== userId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'Unauthorized',
                })
            );
        }

        // Get associated documents
        const orderDocuments = await db.select({
            id: documents.id,
            docType: documents.docType,
            status: documents.status,
            rejectionReason: documents.rejectionReason,
            uploadedAt: documents.uploadedAt,
        })
            .from(documents)
            .where(eq(documents.orderId, id));

        // Get scheme details
        const schemeResult = await db.select()
            .from(schemes)
            .where(eq(schemes.id, order.schemeId));

        return res.json(successResponse({
            order: {
                ...order,
                scheme: schemeResult[0] || null,
            },
            documents: orderDocuments,
        }));
    } catch (error) {
        logger.error('Failed to fetch order', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch order',
            })
        );
    }
});

// Schema for updating order status (admin only)
const updateStatusSchema = z.object({
    status: z.enum(['PAID', 'IN_PROGRESS', 'PROOF_UPLOADED', 'COMPLETED', 'CANCELLED']),
    adminNotes: z.string().optional(),
});

/**
 * PATCH /api/orders/:id/status
 * Update order status (admin only)
 * Rules:
 * - Any admin can pick up a PAID order (sets status to IN_PROGRESS and assigns to them)
 * - Only the assigned admin can progress the order further
 * - Super Admins can override and update any order
 */
router.patch('/:id/status', authMiddleware, adminMiddleware, validateBody(updateStatusSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user!.userId;
        const adminRole = req.user!.role;
        const { status, adminNotes } = req.body;

        // Get order
        const orderResult = await db.select()
            .from(orders)
            .where(eq(orders.id, id));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Order not found',
                })
            );
        }

        const order = orderResult[0];

        // Enforce assignment rules (Super Admin can override)
        if (adminRole !== 'SUPER_ADMIN') {
            // If order is already assigned to someone else, block the update
            if (order.assignedTo && order.assignedTo !== adminId) {
                return res.status(403).json(
                    errorResponse({
                        code: ErrorCodes.FORBIDDEN,
                        message: 'This order is assigned to another admin',
                    })
                );
            }

            // Only allow picking up PAID orders that aren't assigned yet
            if (status === 'IN_PROGRESS' && order.status !== 'PAID') {
                return res.status(400).json(
                    errorResponse({
                        code: ErrorCodes.VALIDATION_ERROR,
                        message: 'Can only pick up orders that are in PAID status',
                    })
                );
            }
        }

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            'PAID': ['IN_PROGRESS', 'CANCELLED'],
            'IN_PROGRESS': ['PROOF_UPLOADED', 'CANCELLED'],
            'PROOF_UPLOADED': ['COMPLETED', 'CANCELLED'],
            'COMPLETED': [],
            'CANCELLED': [],
        };

        if (!validTransitions[order.status]?.includes(status)) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: `Cannot transition from ${order.status} to ${status}`,
                })
            );
        }

        // Update order
        const updateData: Record<string, unknown> = {
            status,
            updatedAt: new Date(),
        };

        // Only set assignedTo when picking up (transitioning from PAID to IN_PROGRESS)
        if (status === 'IN_PROGRESS' && !order.assignedTo) {
            updateData.assignedTo = adminId;
        }

        if (adminNotes) updateData.adminNotes = adminNotes;

        await db.update(orders)
            .set(updateData)
            .where(eq(orders.id, id));

        logger.info('Order status updated', { orderId: id, status, adminId });

        return res.json(successResponse({
            orderId: id,
            status,
            assignedTo: updateData.assignedTo || order.assignedTo,
            message: `Order status updated to ${status}`,
        }));
    } catch (error) {
        logger.error('Failed to update order status', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to update order status',
            })
        );
    }
});

/**
 * GET /api/orders/admin/queue
 * Get orders for admin processing (admin only) - paginated
 */
router.get('/admin/queue', authMiddleware, adminMiddleware, validateQuery(
    paginationSchema.extend({
        status: z.enum(['PAID', 'IN_PROGRESS', 'PROOF_UPLOADED', 'COMPLETED', 'CANCELLED']).optional(),
    })
), async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 100);
        const offset = (page - 1) * limit;

        // Get total count with optional status filter
        let countQuery = db.select({ count: count() }).from(orders);
        if (status) {
            countQuery = countQuery.where(eq(orders.status, status)) as typeof countQuery;
        }
        const countResult = await countQuery;
        const total = countResult[0]?.count || 0;

        // Build query with joins
        let query = db.select({
            id: orders.id,
            userId: orders.userId,
            userName: users.name,
            userPhone: users.phone,
            schemeId: orders.schemeId,
            schemeName: schemes.name,
            paymentAmount: orders.paymentAmount,
            status: orders.status,
            createdAt: orders.createdAt,
            paymentTimestamp: orders.paymentTimestamp,
            assignedTo: orders.assignedTo,
        })
            .from(orders)
            .leftJoin(users, eq(orders.userId, users.id))
            .leftJoin(schemes, eq(orders.schemeId, schemes.id))
            .orderBy(desc(orders.createdAt))
            .limit(limit)
            .offset(offset);

        // Filter by status if provided
        if (status) {
            // @ts-ignore - drizzle type complexity
            query = query.where(eq(orders.status, status));
        }

        const result = await query;

        return res.json(successResponse({
            data: result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }));
    } catch (error) {
        logger.error('Failed to fetch admin queue', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch orders',
            })
        );
    }
});

/**
 * POST /api/orders/:id/complete
 * Mark order as completed (admin only)
 */
router.post('/:id/complete', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user!.userId;

        // Get order
        const orderResult = await db.select()
            .from(orders)
            .where(eq(orders.id, id));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Order not found',
                })
            );
        }

        const order = orderResult[0];

        // Check if order is in correct state
        if (order.status === 'COMPLETED') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Order is already completed',
                })
            );
        }

        // Update order status to COMPLETED
        await db.update(orders)
            .set({
                status: 'COMPLETED',
                assignedTo: adminId,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, id));

        // Import notification service dynamically to avoid circular deps
        const { createNotification, NotificationTypes } = await import('../services/notification.service');

        // Notify user about order completion
        await createNotification({
            recipientId: order.userId,
            recipientType: 'USER',
            type: NotificationTypes.ORDER_COMPLETED,
            title: 'Order Completed!',
            message: 'Your order has been processed and completed successfully.',
            relatedOrderId: id,
        });

        logger.info('Order completed', { orderId: id, adminId });

        return res.json(successResponse({
            orderId: id,
            status: 'COMPLETED',
            message: 'Order completed successfully',
        }));
    } catch (error) {
        logger.error('Failed to complete order', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to complete order',
            })
        );
    }
});

export default router;
