import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../lib/utils.js';

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID || '',
    key_secret: env.RAZORPAY_KEY_SECRET || '',
});

interface CreateOrderParams {
    amount: number; // Amount in paise (INR * 100)
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
}

interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    notes: Record<string, string>;
    created_at: number;
}

interface VerifyPaymentParams {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
    try {
        const options = {
            amount: params.amount,
            currency: params.currency || 'INR',
            receipt: params.receipt,
            notes: params.notes || {},
        };

        const order = await razorpay.orders.create(options);

        logger.info('Razorpay order created', {
            orderId: order.id,
            amount: params.amount,
            receipt: params.receipt,
        });

        return order as RazorpayOrder;
    } catch (error) {
        logger.error('Failed to create Razorpay order', error);
        throw new Error('Failed to create payment order');
    }
}

/**
 * Verify Razorpay payment signature
 * This ensures the payment was not tampered with
 */
export function verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

        // Generate expected signature
        const body = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
            .update(body)
            .digest('hex');

        // Compare signatures using constant-time comparison to prevent timing oracle attacks
        const expectedBuf = Buffer.from(expectedSignature, 'hex');
        const actualBuf = Buffer.from(razorpaySignature, 'hex');
        const isValid = expectedBuf.length === actualBuf.length &&
            crypto.timingSafeEqual(expectedBuf, actualBuf);

        if (isValid) {
            logger.info('Payment signature verified', { razorpayOrderId, razorpayPaymentId });
        } else {
            logger.warn('Invalid payment signature', { razorpayOrderId, razorpayPaymentId });
        }

        return isValid;
    } catch (error) {
        logger.error('Payment verification failed', error);
        return false;
    }
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
    body: string,
    signature: string
): boolean {
    try {
        if (!env.RAZORPAY_WEBHOOK_SECRET) {
            logger.warn('Webhook secret not configured');
            return false;
        }

        const expectedSignature = crypto
            .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        // Constant-time comparison to prevent timing oracle attacks
        const expectedBuf = Buffer.from(expectedSignature, 'hex');
        const actualBuf = Buffer.from(signature, 'hex');
        return expectedBuf.length === actualBuf.length &&
            crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (error) {
        logger.error('Webhook signature verification failed', error);
        return false;
    }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPayment(paymentId: string) {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error) {
        logger.error('Failed to fetch payment', error);
        throw new Error('Failed to fetch payment details');
    }
}

/** The payment fields reconciliation depends on. */
export interface RazorpayPaymentRecord {
    id: string;
    order_id: string;
    amount: number | string;
    status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
    refund_status?: 'null' | 'partial' | 'full';
    amount_refunded?: number;
    created_at: number;
}

const PAYMENTS_PAGE_SIZE = 100; // Razorpay's maximum
const MAX_PAYMENT_PAGES = 50;   // 5,000 payments — bounds a runaway window

/**
 * List every payment Razorpay recorded in a time window, following pagination.
 *
 * `truncated` is true when the page cap was hit, meaning the window holds more
 * payments than were fetched — callers should narrow the range rather than
 * trust the result as complete.
 */
export async function listPayments(from: Date, to: Date): Promise<{
    payments: RazorpayPaymentRecord[];
    truncated: boolean;
}> {
    const fromTs = Math.floor(from.getTime() / 1000);
    const toTs = Math.floor(to.getTime() / 1000);

    const payments: RazorpayPaymentRecord[] = [];
    let skip = 0;
    let truncated = false;

    for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
        const result = await razorpay.payments.all({
            from: fromTs,
            to: toTs,
            count: PAYMENTS_PAGE_SIZE,
            skip,
        });

        const items = (result.items || []) as unknown as RazorpayPaymentRecord[];
        payments.push(...items);

        if (items.length < PAYMENTS_PAGE_SIZE) {
            return { payments, truncated: false };
        }
        skip += PAYMENTS_PAGE_SIZE;
        truncated = page === MAX_PAYMENT_PAGES - 1;
    }

    logger.warn('Payment listing hit the page cap — window may be incomplete', {
        fetched: payments.length, from: from.toISOString(), to: to.toISOString(),
    });
    return { payments, truncated };
}

/**
 * Fetch order details from Razorpay
 */
export async function fetchRazorpayOrder(orderId: string) {
    try {
        const order = await razorpay.orders.fetch(orderId);
        return order;
    } catch (error) {
        logger.error('Failed to fetch order', error);
        throw new Error('Failed to fetch order details');
    }
}
