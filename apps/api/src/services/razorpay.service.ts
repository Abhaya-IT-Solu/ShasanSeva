import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../lib/utils';

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

        // Compare signatures
        const isValid = expectedSignature === razorpaySignature;

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

        return expectedSignature === signature;
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
