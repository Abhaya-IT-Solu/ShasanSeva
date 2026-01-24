import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { db, orders, documents, schemes } from '@shasansetu/db';
import { eq, desc, and } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';

const router: Router = Router();

/**
 * GET /api/orders
 * Get user's orders
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;

        const result = await db.select({
            id: orders.id,
            schemeName: orders.schemeName,
            amountPaid: orders.amountPaid,
            status: orders.status,
            createdAt: orders.createdAt,
            paidAt: orders.paidAt,
        })
            .from(orders)
            .where(eq(orders.userId, userId))
            .orderBy(desc(orders.createdAt));

        return res.json(successResponse(result));
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
            documentType: documents.documentType,
            fileName: documents.fileName,
            status: documents.status,
            rejectionReason: documents.rejectionReason,
            createdAt: documents.createdAt,
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
    status: z.enum(['PAID', 'IN_PROGRESS', 'DOCUMENTS_VERIFIED', 'COMPLETED', 'REJECTED', 'REFUNDED']),
    rejectionReason: z.string().optional(),
    adminNotes: z.string().optional(),
});

/**
 * PATCH /api/orders/:id/status
 * Update order status (admin only)
 */
router.patch('/:id/status', authMiddleware, adminMiddleware, validateBody(updateStatusSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = req.user!.userId;
        const { status, rejectionReason, adminNotes } = req.body;

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

        // Update order
        const updateData: any = {
            status,
            assignedAdminId: adminId,
            updatedAt: new Date(),
        };

        if (rejectionReason) updateData.rejectionReason = rejectionReason;
        if (adminNotes) updateData.adminNotes = adminNotes;
        if (status === 'COMPLETED') updateData.completedAt = new Date();

        await db.update(orders)
            .set(updateData)
            .where(eq(orders.id, id));

        logger.info('Order status updated', { orderId: id, status, adminId });

        return res.json(successResponse({
            orderId: id,
            status,
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
 * Get orders for admin processing (admin only)
 */
router.get('/admin/queue', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const result = await db.select({
            id: orders.id,
            userId: orders.userId,
            schemeName: orders.schemeName,
            amountPaid: orders.amountPaid,
            status: orders.status,
            createdAt: orders.createdAt,
            paidAt: orders.paidAt,
            assignedAdminId: orders.assignedAdminId,
        })
            .from(orders)
            .orderBy(desc(orders.createdAt))
            .limit(100);

        return res.json(successResponse(result));
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

export default router;
