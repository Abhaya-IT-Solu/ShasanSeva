import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
    createRazorpayOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
} from '../services/razorpay.service';
import { db, orders, schemes } from '@shasansetu/db';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils';
import { env } from '../config/env';

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
});

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for scheme payment
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

        // Create order record in database (status: PENDING_PAYMENT)
        const orderResult = await db.insert(orders).values({
            userId,
            schemeId,
            paymentAmount: scheme.serviceFee,
            status: 'PENDING_PAYMENT',
        }).returning();

        const order = orderResult[0];

        // Convert to paise (Razorpay uses smallest currency unit)
        const amountInPaise = Math.round(parseFloat(scheme.serviceFee) * 100);

        // Create Razorpay order
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

        // Update order with Razorpay order ID
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
 * Verify payment signature and complete order
 */
router.post('/verify', authMiddleware, validateBody(verifyPaymentSchema), async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

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

        // Update order status to PAID
        await db.update(orders)
            .set({
                status: 'PAID',
                paymentId: razorpayPaymentId,
                paymentTimestamp: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

        logger.info('Payment verified and order updated', { orderId, razorpayPaymentId });

        return res.json(successResponse({
            orderId,
            status: 'PAID',
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
