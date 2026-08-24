import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { db, orders, orderEvents, documents, schemes, users, NotificationType, OrderEventType } from '@shasansetu/db';
import { eq, desc, count, and, or, ilike, sql, type SQL } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { getDownloadUrl } from '../services/r2.service.js';
import { createNotification } from '../services/notification.service.js';
import { recordOrderEvent, type DbTransaction } from '../services/orderEvent.service.js';

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
            fileKey: documents.fileKey,
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

/**
 * GET /api/orders/:id/receipt
 * Get a signed download URL for the order's receipt PDF.
 * Accessible by the order owner and admins.
 */
router.get('/:id/receipt', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const userType = req.user!.userType;

        const orderResult = await db.select({
            userId: orders.userId,
            receiptKey: orders.receiptKey,
        }).from(orders).where(eq(orders.id, id));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Order not found',
                })
            );
        }

        const order = orderResult[0];

        if (userType !== 'ADMIN' && order.userId !== userId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'Unauthorized',
                })
            );
        }

        if (!order.receiptKey) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Receipt not available yet',
                })
            );
        }

        const { downloadUrl, expiresIn } = await getDownloadUrl(order.receiptKey);

        return res.json(successResponse({
            downloadUrl,
            expiresIn,
        }));
    } catch (error) {
        logger.error('Failed to get receipt download URL', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to get receipt',
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
            'IN_PROGRESS': ['PROOF_UPLOADED', 'COMPLETED', 'CANCELLED'],
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

        // A cancellation without a stated reason is the defect users actually feel:
        // the admin UI used to ship whatever happened to be in the notes box, so a
        // stale note from an earlier cycle was shown as the cancellation reason.
        if (status === 'CANCELLED' && (!adminNotes || adminNotes.trim().length < 5)) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'A reason of at least 5 characters is required to cancel an order',
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

        // Terminal timestamps — completedAt has been referenced by the user's
        // "Key Dates" card since long before the column existed.
        if (status === 'COMPLETED') updateData.completedAt = new Date();
        if (status === 'CANCELLED') updateData.cancelledAt = new Date();

        // A note supplied with a transition is always user-visible: it explains the
        // transition to the applicant. Private notes go through PATCH /:id/notes.
        const trimmedNote = adminNotes?.trim();
        if (trimmedNote) updateData.adminNotes = trimmedNote;

        await db.transaction(async (tx: DbTransaction) => {
            await tx.update(orders)
                .set(updateData)
                .where(eq(orders.id, id));

            await recordOrderEvent({
                orderId: id,
                eventType: OrderEventType.STATUS_CHANGED,
                actorType: 'ADMIN',
                actorId: adminId,
                actorName: req.user!.name,
                visibility: 'USER_VISIBLE',
                fromStatus: order.status,
                toStatus: status,
            }, tx);

            if (trimmedNote) {
                await recordOrderEvent({
                    orderId: id,
                    eventType: OrderEventType.ADMIN_NOTE,
                    actorType: 'ADMIN',
                    actorId: adminId,
                    actorName: req.user!.name,
                    visibility: 'USER_VISIBLE',
                    message: trimmedNote,
                }, tx);
            }
        });

        // Notify the user about the status change
        const statusMessages: Record<string, string> = {
            'IN_PROGRESS': 'An officer has started working on your application.',
            'PROOF_UPLOADED': 'Proof of completion has been uploaded for your application.',
            'COMPLETED': 'Your application has been processed and completed successfully.',
            'CANCELLED': 'Your application has been cancelled. Please check the order details.',
        };
        await createNotification({
            recipientId: order.userId,
            recipientType: 'USER',
            type: status === 'COMPLETED' ? NotificationType.ORDER_COMPLETED : NotificationType.ORDER_STATUS_CHANGE,
            title: `Order ${status === 'COMPLETED' ? 'Completed' : 'Update'}`,
            message: statusMessages[status] || `Your order status changed to ${status}.`,
            relatedOrderId: id,
        });

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
 * POST /api/orders/:id/resubmit
 * Allow a user to resubmit their cancelled/rejected order
 * Resets status to PAID so it re-enters the admin queue
 */
router.post('/:id/resubmit', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

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

        // Verify ownership
        if (order.userId !== userId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'You do not have permission to modify this order',
                })
            );
        }

        // Only cancelled/rejected orders can be resubmitted
        if (order.status !== 'CANCELLED') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Only cancelled/rejected orders can be resubmitted',
                })
            );
        }

        // Capture what is about to be discarded, so the timeline keeps it. The
        // previously-assigned admin is read now because the update nulls it below.
        const previousAdminId = order.assignedTo;
        const rejectedDocs = await db.select({ docType: documents.docType, reason: documents.rejectionReason })
            .from(documents)
            .where(and(eq(documents.orderId, id), eq(documents.status, 'REJECTED')));

        // One transaction: the reset and the document delete were two unguarded
        // statements, so a failure between them left a half-reset order.
        await db.transaction(async (tx: DbTransaction) => {
            await tx.update(orders)
                .set({
                    status: 'PAID',
                    assignedTo: null,
                    // Clearing this is now correct rather than destructive: the note
                    // survives as an ADMIN_NOTE event, and leaving it would show a
                    // stale rejection reason on a freshly-active order.
                    adminNotes: null,
                    cancelledAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(orders.id, id));

            // Delete REJECTED documents entirely — user will re-upload corrected versions.
            // (Resetting to UPLOADED would cause duplicates when new upload creates a fresh record.)
            await tx.delete(documents)
                .where(
                    and(
                        eq(documents.orderId, id),
                        eq(documents.status, 'REJECTED')
                    )
                );

            await recordOrderEvent({
                orderId: id,
                eventType: OrderEventType.RESUBMITTED,
                actorType: 'USER',
                actorId: userId,
                visibility: 'USER_VISIBLE',
                fromStatus: order.status,
                toStatus: 'PAID',
                metadata: {
                    // The deleted rows are gone; keep what they said.
                    clearedAdminNote: order.adminNotes ?? null,
                    removedDocuments: rejectedDocs.map((d: { docType: string; reason: string | null }) => ({ docType: d.docType, reason: d.reason })),
                },
            }, tx);
        });

        // Nothing previously told anyone an order had re-entered the queue. There is
        // no all-admins fan-out helper, so notify whoever last handled it.
        if (previousAdminId) {
            await createNotification({
                recipientId: previousAdminId,
                recipientType: 'ADMIN',
                type: NotificationType.ORDER_STATUS_CHANGE,
                title: 'Order Resubmitted',
                message: 'An order you previously handled has been resubmitted and is back in the queue.',
                relatedOrderId: id,
            });
        }

        logger.info('Order resubmitted', { orderId: id, userId });

        return res.json(successResponse({
            orderId: id,
            status: 'PAID',
            message: 'Order resubmitted successfully. It will be reviewed again.',
        }));
    } catch (error) {
        logger.error('Failed to resubmit order', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to resubmit order',
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
        // PENDING_PAYMENT and PAYMENT_FAILED are real persisted statuses that were
        // missing here, so filtering for either returned 400 even though such rows
        // were already showing up under "All".
        status: z.enum([
            'PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID',
            'IN_PROGRESS', 'PROOF_UPLOADED', 'COMPLETED', 'CANCELLED',
        ]).optional(),
        search: z.string().trim().max(100).optional(),
    })
), async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 100);
        const offset = (page - 1) * limit;

        // Build the filter once and apply it to both queries. Previously .where()
        // was chained after .orderBy().limit().offset() behind a @ts-ignore, which
        // happened to work but could not accept a second condition.
        const conditions: SQL[] = [];
        if (status) conditions.push(eq(orders.status, status));
        if (search) {
            // Escape LIKE metacharacters so a literal % or _ does not widen the match
            const term = `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
            conditions.push(
                or(
                    ilike(users.name, term),
                    ilike(users.phone, term),
                    ilike(schemes.name, term),
                    sql`${orders.id}::text ILIKE ${term}`,
                )!
            );
        }
        // .where(undefined) is a no-op in Drizzle, so no conditional chaining needed
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        // The count query needs the same joins as the data query: searching on
        // users.name cannot resolve without users joined, and without this the
        // count 500s the moment anyone types in the search box.
        const countResult = await db.select({ count: count() })
            .from(orders)
            .leftJoin(users, eq(orders.userId, users.id))
            .leftJoin(schemes, eq(orders.schemeId, schemes.id))
            .where(where);
        const total = countResult[0]?.count || 0;

        const result = await db.select({
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
            .where(where)
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
        await db.transaction(async (tx: DbTransaction) => {
            await tx.update(orders)
                .set({
                    status: 'COMPLETED',
                    assignedTo: adminId,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(orders.id, id));

            await recordOrderEvent({
                orderId: id,
                eventType: OrderEventType.STATUS_CHANGED,
                actorType: 'ADMIN',
                actorId: adminId,
                actorName: req.user!.name,
                visibility: 'USER_VISIBLE',
                fromStatus: order.status,
                toStatus: 'COMPLETED',
            }, tx);
        });

        // Notify user about order completion
        await createNotification({
            recipientId: order.userId,
            recipientType: 'USER',
            type: NotificationType.ORDER_COMPLETED,
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

// Schema for saving admin notes
const saveNotesSchema = z.object({
    adminNotes: z.string().min(1).max(2000),
    // Defaults to private. Every admin note used to be rendered verbatim on the
    // user's order page, so there was no way to record an internal observation.
    visibility: z.enum(['ADMIN_ONLY', 'USER_VISIBLE']).default('ADMIN_ONLY'),
});

/**
 * PATCH /api/orders/:id/notes
 * Save admin notes for an order (admin only)
 */
router.patch('/:id/notes', authMiddleware, adminMiddleware, validateBody(saveNotesSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { adminNotes, visibility } = req.body;
        const adminId = req.user!.userId;
        const adminRole = req.user!.role;

        const orderResult = await db.select({ id: orders.id, assignedTo: orders.assignedTo })
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

        // The same assignment rule /status enforces. This route had none at all, so
        // any admin could overwrite the note on an order someone else was handling.
        const assigned = orderResult[0].assignedTo;
        if (adminRole !== 'SUPER_ADMIN' && assigned && assigned !== adminId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'This order is assigned to another admin',
                })
            );
        }

        const note = adminNotes.trim();

        await db.transaction(async (tx: DbTransaction) => {
            // orders.admin_notes mirrors only the latest USER_VISIBLE note, because
            // the user's order page renders that column directly in three places —
            // mirroring a private note there would leak it.
            if (visibility === 'USER_VISIBLE') {
                await tx.update(orders)
                    .set({ adminNotes: note, updatedAt: new Date() })
                    .where(eq(orders.id, id));
            }

            await recordOrderEvent({
                orderId: id,
                eventType: OrderEventType.ADMIN_NOTE,
                actorType: 'ADMIN',
                actorId: adminId,
                actorName: req.user!.name,
                visibility,
                message: note,
            }, tx);
        });

        logger.info('Admin note added', { orderId: id, adminId, visibility });

        return res.json(successResponse({
            orderId: id,
            adminNotes: note,
            visibility,
            message: 'Note saved successfully',
        }));
    } catch (error) {
        logger.error('Failed to save admin notes', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to save notes',
            })
        );
    }
});

/**
 * GET /api/orders/:id/events
 * The order's timeline. Admins see everything; the owner sees only user-visible
 * entries.
 */
router.get('/:id/events', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const isAdmin = req.user!.userType === 'ADMIN';

        const orderResult = await db.select({ userId: orders.userId })
            .from(orders)
            .where(eq(orders.id, id));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({ code: ErrorCodes.NOT_FOUND, message: 'Order not found' })
            );
        }

        if (!isAdmin && orderResult[0].userId !== userId) {
            return res.status(403).json(
                errorResponse({ code: ErrorCodes.FORBIDDEN, message: 'Unauthorized' })
            );
        }

        // Visibility is filtered in SQL rather than in the response mapper, so a
        // later change to the projection cannot accidentally leak a private note.
        const conditions: SQL[] = [eq(orderEvents.orderId, id)];
        if (!isAdmin) conditions.push(eq(orderEvents.visibility, 'USER_VISIBLE'));

        const events = await db.select({
            id: orderEvents.id,
            eventType: orderEvents.eventType,
            fromStatus: orderEvents.fromStatus,
            toStatus: orderEvents.toStatus,
            actorType: orderEvents.actorType,
            actorName: orderEvents.actorName,
            visibility: orderEvents.visibility,
            message: orderEvents.message,
            metadata: orderEvents.metadata,
            createdAt: orderEvents.createdAt,
        })
            .from(orderEvents)
            .where(and(...conditions))
            .orderBy(desc(orderEvents.createdAt));

        return res.json(successResponse({
            events,
            // Derived rather than stored: a counter and an event log drift, which is
            // the exact failure this table exists to fix. Free here, since the
            // timeline is already loaded.
            resubmissionCount: events.filter(
                (e: { eventType: string }) => e.eventType === OrderEventType.RESUBMITTED
            ).length,
        }));
    } catch (error) {
        logger.error('Failed to fetch order events', error);
        return res.status(500).json(
            errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to fetch order history' })
        );
    }
});

const userNoteSchema = z.object({
    note: z.string().trim().min(1).max(2000),
});

/** How many notes one user may attach, so the timeline cannot become a chat. */
const MAX_USER_NOTES = 20;

/**
 * PATCH /api/orders/:id/user-note
 * Let the applicant attach a note to their own order — when resubmitting, or to
 * add something they forgot. Previously there was no way for a user to say
 * anything about an order at all.
 */
router.patch('/:id/user-note', authMiddleware, validateBody(userNoteSchema), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { note } = req.body;

        const orderResult = await db.select({ userId: orders.userId, status: orders.status })
            .from(orders)
            .where(eq(orders.id, id));

        if (orderResult.length === 0) {
            return res.status(404).json(
                errorResponse({ code: ErrorCodes.NOT_FOUND, message: 'Order not found' })
            );
        }

        if (orderResult[0].userId !== userId) {
            return res.status(403).json(
                errorResponse({ code: ErrorCodes.FORBIDDEN, message: 'Unauthorized' })
            );
        }

        // Nothing reads a note added after the work is finished.
        if (orderResult[0].status === 'COMPLETED') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'This order is already completed',
                })
            );
        }

        const existing = await db.select({ count: count() })
            .from(orderEvents)
            .where(and(
                eq(orderEvents.orderId, id),
                eq(orderEvents.eventType, OrderEventType.USER_NOTE),
            ));
        if ((existing[0]?.count || 0) >= MAX_USER_NOTES) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'You have added the maximum number of notes to this order',
                })
            );
        }

        await db.transaction(async (tx: DbTransaction) => {
            await tx.update(orders)
                .set({ userNotes: note, updatedAt: new Date() })
                .where(eq(orders.id, id));

            await recordOrderEvent({
                orderId: id,
                eventType: OrderEventType.USER_NOTE,
                actorType: 'USER',
                actorId: userId,
                actorName: req.user!.name,
                visibility: 'USER_VISIBLE',
                message: note,
            }, tx);
        });

        logger.info('User note added', { orderId: id, userId });

        return res.json(successResponse({ orderId: id, note, message: 'Note added' }));
    } catch (error) {
        logger.error('Failed to add user note', error);
        return res.status(500).json(
            errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to add note' })
        );
    }
});

export default router;
