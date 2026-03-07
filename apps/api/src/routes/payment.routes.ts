import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
    createRazorpayOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
} from '../services/razorpay.service.js';
import { db, orders, schemes, documents, users } from '@shasansetu/db';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { env } from '../config/env.js';
import { generateReceipt } from '../services/receipt.service.js';

const router: Router = Router();

// Schema for creating payment order
const createOrderSchema = z.object({
    schemeId: z.string().uuid(),
});

// Schema for verifying payment
const verifyPaymentSchema = z.object({
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string(),
    orderId: z.string().uuid(),
    documents: z.array(z.object({
        docType: z.string().min(1),
        fileKey: z.string().min(1),
    })).optional(),
});

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for scheme payment.
 * BUG 4 FIX: If a PENDING_PAYMENT order already exists for this user+scheme, reuse it
 * instead of creating a duplicate.
 */
router.post('/create-order', authMiddleware, validateBody(createOrderSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { schemeId } = req.body;

        // Get scheme details
        const schemeResult = await db.select()
            .from(schemes)
            .where(eq(schemes.id, schemeId));

        if (schemeResult.length === 0) {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Scheme not found',
                })
            );
        }

        const scheme = schemeResult[0];

        if (scheme.status !== 'ACTIVE') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'This scheme is not available',
                })
            );
        }

        // BUG 4 FIX: Check for existing PENDING_PAYMENT order for this user+scheme
        const existingOrders = await db.select()
            .from(orders)
            .where(
                and(
                    eq(orders.userId, userId),
                    eq(orders.schemeId, schemeId),
                    eq(orders.status, 'PENDING_PAYMENT')
                )
            );

        let order: typeof existingOrders[0];

        if (existingOrders.length > 0) {
            // Reuse the existing PENDING_PAYMENT order
            order = existingOrders[0];
            logger.info('Reusing existing PENDING_PAYMENT order', { orderId: order.id, userId, schemeId });
        } else {
            // Create new order record (status: PENDING_PAYMENT)
            const orderResult = await db.insert(orders).values({
                userId,
                schemeId,
                paymentAmount: scheme.serviceFee,
                status: 'PENDING_PAYMENT',
            }).returning();
            order = orderResult[0];
        }

        // Convert to paise (Razorpay uses smallest currency unit)
        const amountInPaise = Math.round(parseFloat(scheme.serviceFee) * 100);

        // Create a fresh Razorpay order (old razorpayOrderId may have expired)
        const razorpayOrder = await createRazorpayOrder({
            amount: amountInPaise,
            currency: 'INR',
            receipt: order.id,
            notes: {
                userId,
                schemeId,
                orderId: order.id,
                schemeName: scheme.name,
            },
        });

        // Update order with new Razorpay order ID
        await db.update(orders)
            .set({
                razorpayOrderId: razorpayOrder.id,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

        logger.info('Payment order created', { orderId: order.id, razorpayOrderId: razorpayOrder.id });

        return res.json(successResponse({
            orderId: order.id,
            razorpayOrderId: razorpayOrder.id,
            razorpayKeyId: env.RAZORPAY_KEY_ID,
            amount: amountInPaise,
            currency: 'INR',
            schemeName: scheme.name,
        }));
    } catch (error) {
        logger.error('Failed to create payment order', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to create payment order',
            })
        );
    }
});

/**
 * POST /api/payments/verify
 * Verify payment signature, complete order, and generate receipt PDF.
 */
router.post('/verify', authMiddleware, validateBody(verifyPaymentSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId, documents: uploadedDocuments } = req.body;

        // Verify signature
        const isValid = verifyPaymentSignature({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        });

        if (!isValid) {
            logger.warn('Payment verification failed - invalid signature', { orderId, razorpayOrderId });
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Payment verification failed',
                })
            );
        }

        // Get order
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

        // Verify order belongs to user
        if (order.userId !== userId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'Unauthorized',
                })
            );
        }

        const paymentTimestamp = new Date();

        // Update order status to PAID
        await db.update(orders)
            .set({
                status: 'PAID',
                paymentId: razorpayPaymentId,
                paymentTimestamp,
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

        logger.info('Payment verified and order updated', { orderId, razorpayPaymentId });

        // Link uploaded documents to the order
        if (uploadedDocuments && uploadedDocuments.length > 0) {
            for (const doc of uploadedDocuments) {
                await db.insert(documents).values({
                    orderId,
                    docType: doc.docType,
                    fileKey: doc.fileKey,
                    fileUrl: '', // Will be generated on demand via download-url
                    status: 'UPLOADED',
                });
            }
            logger.info('Documents linked to order', { orderId, count: uploadedDocuments.length });
        }

        // Generate receipt PDF asynchronously (don't block the response)
        // Fetch user data for receipt
        let receiptKey: string | null = null;
        try {
            const userResult = await db.select({
                name: users.name,
                phone: users.phone,
            }).from(users).where(eq(users.id, userId));

            const schemeResult = await db.select({
                name: schemes.name,
            }).from(schemes).where(eq(schemes.id, order.schemeId));

            const userData = userResult[0];
            const schemeData = schemeResult[0];

            receiptKey = await generateReceipt({
                orderId,
                userName: userData?.name || 'N/A',
                userPhone: userData?.phone || 'N/A',
                schemeName: schemeData?.name || 'N/A',
                paymentAmount: order.paymentAmount,
                paymentId: razorpayPaymentId,
                paymentDate: paymentTimestamp,
            });

            // Save receipt key on the order
            await db.update(orders)
                .set({ receiptKey })
                .where(eq(orders.id, orderId));

            logger.info('Receipt generated', { orderId, receiptKey });
        } catch (receiptError) {
            // Receipt generation failure should not fail the payment verification
            logger.error('Failed to generate receipt (non-blocking)', receiptError);
        }

        return res.json(successResponse({
            orderId,
            status: 'PAID',
            receiptKey,
            message: 'Payment successful! Your application is now being processed.',
        }));
    } catch (error) {
        logger.error('Payment verification error', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Payment verification failed',
            })
        );
    }
});

/**
 * DELETE /api/payments/cancel-order/:orderId
 * BUG 3 FIX: Cancel a PENDING_PAYMENT order and delete it from the database.
 * This is called when the user dismisses the Razorpay modal or clicks Cancel.
 */
router.delete('/cancel-order/:orderId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { orderId } = req.params;

        // Get the order
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

        // Only the order owner can cancel
        if (order.userId !== userId) {
            return res.status(403).json(
                errorResponse({
                    code: ErrorCodes.FORBIDDEN,
                    message: 'Unauthorized',
                })
            );
        }

        // Only PENDING_PAYMENT orders can be cancelled this way
        if (order.status !== 'PENDING_PAYMENT') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Only pending payment orders can be cancelled',
                })
            );
        }

        // Delete any documents linked to this order
        await db.delete(documents).where(eq(documents.orderId, orderId));

        // Delete the order
        await db.delete(orders).where(eq(orders.id, orderId));

        logger.info('PENDING_PAYMENT order cancelled and deleted', { orderId, userId });

        return res.json(successResponse({
            orderId,
            message: 'Order cancelled successfully',
        }));
    } catch (error) {
        logger.error('Failed to cancel order', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to cancel order',
            })
        );
    }
});

/**
 * POST /api/payments/webhook
 * Handle Razorpay webhook events
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;
        const body = JSON.stringify(req.body);

        // Verify webhook signature
        if (!verifyWebhookSignature(body, signature)) {
            logger.warn('Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = req.body;
        const eventType = event.event;

        logger.info('Webhook received', { eventType });

        switch (eventType) {
            case 'payment.captured':
                // Payment was successfully captured
                const capturedPaymentId = event.payload.payment.entity.id;
                const orderId = event.payload.payment.entity.notes?.orderId;

                if (orderId) {
                    await db.update(orders)
                        .set({
                            status: 'PAID',
                            paymentId: capturedPaymentId,
                            paymentTimestamp: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(orders.id, orderId));

                    logger.info('Payment captured via webhook', { orderId, paymentId: capturedPaymentId });
                }
                break;

            case 'payment.failed':
                // Payment failed
                const failedOrderId = event.payload.payment.entity.notes?.orderId;
                if (failedOrderId) {
                    await db.update(orders)
                        .set({
                            status: 'PAYMENT_FAILED',
                            updatedAt: new Date(),
                        })
                        .where(eq(orders.id, failedOrderId));

                    logger.warn('Payment failed via webhook', { orderId: failedOrderId });
                }
                break;

            default:
                logger.info('Unhandled webhook event', { eventType });
        }

        return res.json({ received: true });
    } catch (error) {
        logger.error('Webhook processing error', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
