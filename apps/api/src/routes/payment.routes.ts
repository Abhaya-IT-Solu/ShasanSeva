import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
    createRazorpayOrder,
    verifyPaymentSignature,
    fetchPayment,
} from '../services/razorpay.service.js';
import { db, orders, schemes, documents, users, NotificationType, OrderEventType } from '@shasansetu/db';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';
import { env } from '../config/env.js';
import { generateReceipt } from '../services/receipt.service.js';
import { createNotification } from '../services/notification.service.js';
import { validateFormDataAgainstFields } from '../lib/customFields.js';
import { recordOrderEvent } from '../services/orderEvent.service.js';

const router: Router = Router();

// Schema for creating payment order
const createOrderSchema = z.object({
    schemeId: z.string().uuid(),
    applicationFormData: z.record(z.any()).optional(),
    // Anything the applicant wants to tell the officer handling the case.
    userNotes: z.string().trim().max(2000).optional(),
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
        const { schemeId, applicationFormData, userNotes } = req.body;

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

        // Validate the submitted answers against the scheme's field definitions.
        // Until now this payload was z.record(z.any()) — arbitrary JSON attached to a
        // paid order, with `required` enforced only by a client-side alert(). Unknown
        // keys are dropped rather than rejected so that an admin renaming a field
        // mid-application does not hard-fail someone's payment.
        const { cleaned: cleanFormData, errors: formErrors } = validateFormDataAgainstFields(
            scheme.customFields || [],
            applicationFormData,
        );
        if (formErrors.length > 0) {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: formErrors[0].message,
                    details: { errors: formErrors },
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
            // Reuse the existing PENDING_PAYMENT order.
            // Re-sync paymentAmount to the scheme's current fee: a fresh Razorpay order
            // is created below at today's price, so leaving the original amount here
            // would record one figure while charging another if the fee changed.
            order = existingOrders[0];
            if (order.paymentAmount !== scheme.serviceFee) {
                logger.info('Scheme fee changed since order was created — re-syncing amount', {
                    orderId: order.id, was: order.paymentAmount, now: scheme.serviceFee,
                });
            }
            await db.update(orders)
                .set({
                    applicationFormData: cleanFormData,
                    paymentAmount: scheme.serviceFee,
                    ...(userNotes !== undefined && { userNotes: userNotes || null }),
                })
                .where(eq(orders.id, order.id));
            order = { ...order, paymentAmount: scheme.serviceFee };
            logger.info('Reusing existing PENDING_PAYMENT order', { orderId: order.id, userId, schemeId });
        } else {
            // Create new order record (status: PENDING_PAYMENT)
            const orderResult = await db.insert(orders).values({
                userId,
                schemeId,
                paymentAmount: scheme.serviceFee,
                status: 'PENDING_PAYMENT',
                applicationFormData: cleanFormData,
                userNotes: userNotes || null,
            }).returning();
            order = orderResult[0];

            // Only the insert branch records CREATED — the reuse branch fires on
            // every retry click and would spam the timeline.
            await recordOrderEvent({
                orderId: order.id,
                eventType: OrderEventType.CREATED,
                actorType: 'USER',
                actorId: userId,
                actorName: req.user!.name,
                visibility: 'USER_VISIBLE',
                toStatus: 'PENDING_PAYMENT',
                message: userNotes || null,
            });
        }

        // Merge applicationFormData into user profileData
        if (Object.keys(cleanFormData).length > 0) {
            const userResult = await db.select({ profileData: users.profileData })
                .from(users)
                .where(eq(users.id, userId));
            if (userResult.length > 0) {
                const currentProfileData = userResult[0].profileData || {};
                const mergedProfileData = { ...currentProfileData, ...cleanFormData };
                await db.update(users)
                    .set({ profileData: mergedProfileData, updatedAt: new Date() })
                    .where(eq(users.id, userId));
            }
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

        // Bind the Razorpay order to THIS order.
        // The signature only proves Razorpay issued it for some (order, payment) pair —
        // it says nothing about which of our orders it belongs to. Without this check a
        // user could replay a genuine cheap payment's triple against an expensive
        // PENDING_PAYMENT order they also own and have it marked PAID.
        if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
            logger.warn('Payment verification failed — razorpay order does not belong to this order', {
                orderId,
                submitted: razorpayOrderId,
                expected: order.razorpayOrderId,
                userId,
            });
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: 'Payment verification failed',
                })
            );
        }

        // Idempotency guard: if already PAID (e.g., webhook already processed it), return success immediately
        if (order.status === 'PAID') {
            logger.info('Payment already verified \u2014 returning success (idempotent)', { orderId });
            return res.json(successResponse({
                orderId,
                status: 'PAID',
                receiptKey: order.receiptKey || null,
                message: 'Payment already verified. Your application is being processed.',
            }));
        }

        if (order.status !== 'PENDING_PAYMENT') {
            return res.status(400).json(
                errorResponse({
                    code: ErrorCodes.VALIDATION_ERROR,
                    message: `Cannot verify payment: order is in status '${order.status}'`,
                })
            );
        }

        // Confirm with Razorpay that the money was actually captured, and for the
        // expected amount. A signature is valid for an `authorized` payment too —
        // funds held but never settled, auto-released after ~5 days — so signature
        // alone is not proof of payment.
        const expectedPaise = Math.round(parseFloat(order.paymentAmount) * 100);
        try {
            const payment = await fetchPayment(razorpayPaymentId);

            if (payment.order_id !== razorpayOrderId) {
                logger.error('Payment/order mismatch reported by Razorpay', {
                    orderId, razorpayPaymentId, expected: razorpayOrderId, actual: payment.order_id,
                });
                return res.status(400).json(
                    errorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Payment verification failed' })
                );
            }

            if (payment.status !== 'captured') {
                logger.warn('Payment not captured — refusing to mark order PAID', {
                    orderId, razorpayPaymentId, status: payment.status,
                });
                return res.status(400).json(
                    errorResponse({
                        code: ErrorCodes.VALIDATION_ERROR,
                        message: 'Payment has not been captured yet. If money was debited it will be confirmed shortly.',
                    })
                );
            }

            if (Number(payment.amount) !== expectedPaise) {
                logger.error('Payment amount mismatch', {
                    orderId, razorpayPaymentId, expectedPaise, actualPaise: payment.amount,
                });
                return res.status(400).json(
                    errorResponse({ code: ErrorCodes.VALIDATION_ERROR, message: 'Payment amount mismatch' })
                );
            }
        } catch (fetchError) {
            // Fail closed. This is safe to reject: the payment.captured webhook is an
            // independent path to PAID, so a Razorpay API blip delays confirmation
            // rather than losing it.
            logger.error('Could not confirm payment with Razorpay — deferring to webhook', fetchError);
            return res.status(503).json(
                errorResponse({
                    code: ErrorCodes.INTERNAL_ERROR,
                    message: 'Could not confirm payment right now. If money was debited, your order will update shortly.',
                })
            );
        }

        const paymentTimestamp = new Date();

        // Claim the transition atomically. Checking status and then updating is a
        // race: two concurrent verifies (double-click, retry) could both pass the
        // check above and both run the side effects below — duplicate documents,
        // duplicate receipt, duplicate notification. Only the winner proceeds.
        const claimed = await db.update(orders)
            .set({
                status: 'PAID',
                paymentId: razorpayPaymentId,
                paymentTimestamp,
                updatedAt: new Date(),
            })
            .where(and(eq(orders.id, orderId), eq(orders.status, 'PENDING_PAYMENT')))
            .returning({ id: orders.id });

        if (claimed.length === 0) {
            // Lost the race — another verify or the webhook already marked it PAID.
            const [current] = await db.select({ receiptKey: orders.receiptKey })
                .from(orders).where(eq(orders.id, orderId));
            logger.info('Payment already confirmed by a concurrent request (idempotent)', { orderId });
            return res.json(successResponse({
                orderId,
                status: 'PAID',
                receiptKey: current?.receiptKey || null,
                message: 'Payment already verified. Your application is being processed.',
            }));
        }

        logger.info('Payment verified and order updated', { orderId, razorpayPaymentId });

        // Inside the won-the-claim branch, so a webhook race cannot double-record it
        await recordOrderEvent({
            orderId,
            eventType: OrderEventType.PAYMENT_SUCCEEDED,
            actorType: 'USER',
            actorId: userId,
            actorName: req.user!.name,
            visibility: 'USER_VISIBLE',
            fromStatus: 'PENDING_PAYMENT',
            toStatus: 'PAID',
            metadata: { razorpayPaymentId },
        });

        // Notify the user. Safe to fire unconditionally now — only the request that
        // won the atomic claim above reaches this point.
        await createNotification({
            recipientId: userId,
            recipientType: 'USER',
            type: NotificationType.PAYMENT_SUCCESS,
            title: 'Payment Successful',
            message: 'Your payment was received and your application is being processed.',
            relatedOrderId: orderId,
        });

        // Link uploaded documents to the order (only on first verify call, guarded by status check above)
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

// Webhook is handled in app.ts (before express.json()) to preserve raw body for HMAC verification

export default router;
