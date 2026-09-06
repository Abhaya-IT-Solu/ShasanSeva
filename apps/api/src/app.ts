import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middleware/validation.middleware.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { getClientIp } from './lib/clientIp.js';
import { env } from './config/env.js';
import { logger } from './lib/utils.js';
import { verifyWebhookSignature } from './services/razorpay.service.js';
import { db, orders, NotificationType } from '@shasansetu/db';
import { eq, and } from 'drizzle-orm';
import { createNotification } from './services/notification.service.js';

const app: Application = express();

// Requests arrive as: client → Cloudflare → nginx → this container, so the
// socket peer is always nginx on the Docker bridge. Two trusted hops (nginx,
// then the Cloudflare edge) make req.ip the actual client for logging.
//
// Deliberately a hop COUNT and not `true`. `trust proxy: true` tells Express to
// believe the left-most X-Forwarded-For entry unconditionally, which any client
// can set — they could then present a fresh address per request and walk
// straight past the rate limiter. A count only skips the hops we know exist.
//
// Rate limiting does not rely on this: it calls getClientIp(), which prefers
// Cloudflare's CF-Connecting-IP. See lib/clientIp.ts.
app.set('trust proxy', 2);

// Security middleware
app.use(helmet());

// CORS - Allow the public web app and the developer portal
const allowedOrigins = [
    env.WEB_URL || 'http://localhost:3000',
    env.PORTAL_URL || 'http://localhost:3002',
];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing — express.json() is applied AFTER the raw webhook route below
// The webhook route MUST receive raw bytes for Razorpay HMAC signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;
        // req.body here is a Buffer (raw bytes) — exactly what Razorpay signed
        const rawBody = (req.body as Buffer).toString('utf8');

        if (!verifyWebhookSignature(rawBody, signature)) {
            logger.warn('Invalid webhook signature — rejecting event');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(rawBody);
        const eventType = event.event;
        logger.info('Webhook received', { eventType });

        switch (eventType) {
            case 'payment.captured': {
                const capturedPaymentId = event.payload?.payment?.entity?.id;
                const orderId = event.payload?.payment?.entity?.notes?.orderId;
                if (orderId) {
                    // Guard: only update if still PENDING_PAYMENT (idempotency)
                    const updated = await db.update(orders)
                        .set({ status: 'PAID', paymentId: capturedPaymentId, paymentTimestamp: new Date(), updatedAt: new Date() })
                        .where(and(eq(orders.id, orderId), eq(orders.status, 'PENDING_PAYMENT')))
                        .returning({ userId: orders.userId });
                    logger.info('Payment captured via webhook', { orderId, paymentId: capturedPaymentId });

                    // Only notify if THIS call performed the transition — if the
                    // verify endpoint won the race, it already sent the notification
                    if (updated.length > 0) {
                        await createNotification({
                            recipientId: updated[0].userId,
                            recipientType: 'USER',
                            type: NotificationType.PAYMENT_SUCCESS,
                            title: 'Payment Successful',
                            message: 'Your payment was received and your application is being processed.',
                            relatedOrderId: orderId,
                        });
                    }
                }
                break;
            }
            case 'payment.failed': {
                const failedOrderId = event.payload?.payment?.entity?.notes?.orderId;
                if (failedOrderId) {
                    // Guard: only update if still PENDING_PAYMENT (never downgrade a PAID order)
                    await db.update(orders)
                        .set({ status: 'PAYMENT_FAILED', updatedAt: new Date() })
                        .where(and(eq(orders.id, failedOrderId), eq(orders.status, 'PENDING_PAYMENT')));
                    logger.warn('Payment failed via webhook', { orderId: failedOrderId });
                }
                break;
            }
            default:
                logger.info('Unhandled webhook event', { eventType });
        }

        return res.json({ received: true });
    } catch (error) {
        logger.error('Webhook processing error', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});

// All other routes use JSON body parsing
// 15mb to accommodate base64-encoded document uploads (10mb file → ~13.5mb base64)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        // Resolved through the proxy chain. If this ever starts logging
        // 172.17.0.1 for real traffic again, the rate limiters have silently
        // gone global — that is the symptom to watch for.
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
    });
    next();
});

// Global rate limiting
app.use('/api', apiRateLimiter);

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
});

// Global error handler
app.use(errorHandler);

export default app;
