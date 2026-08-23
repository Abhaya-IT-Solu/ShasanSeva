import { db, orders } from '@shasansetu/db';
import { and, gte, lte, inArray, or } from 'drizzle-orm';
import { listPayments, type RazorpayPaymentRecord } from './razorpay.service.js';
import { logger } from '../lib/utils.js';

/**
 * Payment reconciliation.
 *
 * Compares what Razorpay says happened against what our database believes, and
 * reports the differences. It deliberately **does not repair anything** — every
 * discrepancy here means money and fulfilment disagree, and the right response
 * (refund, fulfil, chase the customer) is a human judgement call. Auto-healing
 * would risk turning a reporting bug into a second money movement.
 */

export type DiscrepancyType =
    /** Money captured, but no order in our DB references it. Customer paid into the void. */
    | 'CAPTURED_WITHOUT_ORDER'
    /** Money captured, order exists, but we never settled it. Customer paid, nothing is being done. */
    | 'CAPTURED_ORDER_NOT_SETTLED'
    /** We treat the order as paid, but Razorpay has no captured payment for it. Fulfilling for free. */
    | 'SETTLED_WITHOUT_CAPTURE'
    /** Captured amount differs from what the order records. */
    | 'AMOUNT_MISMATCH'
    /** Refunded at Razorpay, but the order is still active in our pipeline. */
    | 'REFUNDED_BUT_ACTIVE';

export interface Discrepancy {
    type: DiscrepancyType;
    severity: 'critical' | 'warning';
    detail: string;
    orderId?: string;
    orderStatus?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    paymentStatus?: string;
    expectedPaise?: number;
    actualPaise?: number;
    userId?: string;
}

export interface ReconciliationReport {
    window: { from: string; to: string };
    checked: { razorpayPayments: number; localOrders: number; truncated: boolean };
    summary: { critical: number; warning: number; byType: Record<string, number> };
    discrepancies: Discrepancy[];
}

/** Order states in which we consider ourselves paid and obliged to deliver. */
const SETTLED_STATUSES = ['PAID', 'IN_PROGRESS', 'PROOF_UPLOADED', 'COMPLETED'];
/** Order states that mean we have not acted on the money. */
const UNSETTLED_STATUSES = ['PENDING_PAYMENT', 'PAYMENT_FAILED'];

function toPaise(amount: string | null): number | null {
    if (amount === null) return null;
    const parsed = parseFloat(amount);
    return Number.isNaN(parsed) ? null : Math.round(parsed * 100);
}

function isRefunded(payment: RazorpayPaymentRecord): boolean {
    return payment.status === 'refunded'
        || payment.refund_status === 'full'
        || payment.refund_status === 'partial'
        || (payment.amount_refunded ?? 0) > 0;
}

export async function reconcilePayments(from: Date, to: Date): Promise<ReconciliationReport> {
    const discrepancies: Discrepancy[] = [];

    // 1. Everything Razorpay recorded in the window
    const { payments, truncated } = await listPayments(from, to);

    // 2. Our orders: those created in the window, plus any order referencing one of
    //    the fetched payments (a payment can land days after the order was created).
    const paymentIds = payments.map((p) => p.id);
    const localOrders = await db.select()
        .from(orders)
        .where(
            or(
                and(gte(orders.createdAt, from), lte(orders.createdAt, to)),
                paymentIds.length > 0 ? inArray(orders.paymentId, paymentIds) : undefined,
            )
        );

    const byPaymentId = new Map<string, typeof localOrders[number]>();
    const byRazorpayOrderId = new Map<string, typeof localOrders[number]>();
    for (const o of localOrders) {
        if (o.paymentId) byPaymentId.set(o.paymentId, o);
        if (o.razorpayOrderId) byRazorpayOrderId.set(o.razorpayOrderId, o);
    }

    // ── Pass A: start from money that actually moved ────────────────────────────
    for (const payment of payments) {
        const order = byPaymentId.get(payment.id)
            ?? (payment.order_id ? byRazorpayOrderId.get(payment.order_id) : undefined);

        if (payment.status === 'captured') {
            if (!order) {
                discrepancies.push({
                    type: 'CAPTURED_WITHOUT_ORDER',
                    severity: 'critical',
                    detail: 'Razorpay captured this payment but no order in our database references it. The customer has paid and nothing is recorded.',
                    razorpayPaymentId: payment.id,
                    razorpayOrderId: payment.order_id,
                    paymentStatus: payment.status,
                    actualPaise: Number(payment.amount),
                });
                continue;
            }

            if (UNSETTLED_STATUSES.includes(order.status)) {
                discrepancies.push({
                    type: 'CAPTURED_ORDER_NOT_SETTLED',
                    severity: 'critical',
                    detail: `Payment captured but the order is still '${order.status}'. Likely both the verify call and the webhook failed to land.`,
                    orderId: order.id,
                    orderStatus: order.status,
                    userId: order.userId,
                    razorpayPaymentId: payment.id,
                    razorpayOrderId: payment.order_id,
                    paymentStatus: payment.status,
                    expectedPaise: toPaise(order.paymentAmount) ?? undefined,
                    actualPaise: Number(payment.amount),
                });
            } else {
                const expected = toPaise(order.paymentAmount);
                if (expected !== null && expected !== Number(payment.amount)) {
                    discrepancies.push({
                        type: 'AMOUNT_MISMATCH',
                        severity: 'critical',
                        detail: 'The captured amount differs from the amount recorded on the order.',
                        orderId: order.id,
                        orderStatus: order.status,
                        userId: order.userId,
                        razorpayPaymentId: payment.id,
                        expectedPaise: expected,
                        actualPaise: Number(payment.amount),
                    });
                }
            }
        }

        if (order && isRefunded(payment) && SETTLED_STATUSES.includes(order.status)) {
            discrepancies.push({
                type: 'REFUNDED_BUT_ACTIVE',
                severity: 'warning',
                detail: `Refunded at Razorpay (${payment.refund_status ?? payment.status}) but the order is still '${order.status}'. Refunds issued from the dashboard are not written back automatically.`,
                orderId: order.id,
                orderStatus: order.status,
                userId: order.userId,
                razorpayPaymentId: payment.id,
                paymentStatus: payment.status,
                actualPaise: payment.amount_refunded ?? Number(payment.amount),
            });
        }
    }

    // ── Pass B: start from orders we believe are paid ───────────────────────────
    const capturedById = new Map(
        payments.filter((p) => p.status === 'captured').map((p) => [p.id, p])
    );

    for (const order of localOrders) {
        if (!SETTLED_STATUSES.includes(order.status)) continue;

        // Only judge orders whose payment happened inside the window — otherwise the
        // matching payment simply was not fetched, which is not a discrepancy.
        const paidAt = order.paymentTimestamp;
        if (!paidAt || paidAt < from || paidAt > to) continue;

        if (!order.paymentId) {
            discrepancies.push({
                type: 'SETTLED_WITHOUT_CAPTURE',
                severity: 'critical',
                detail: `Order is '${order.status}' but carries no Razorpay payment id.`,
                orderId: order.id,
                orderStatus: order.status,
                userId: order.userId,
                expectedPaise: toPaise(order.paymentAmount) ?? undefined,
            });
            continue;
        }

        if (!capturedById.has(order.paymentId)) {
            discrepancies.push({
                type: 'SETTLED_WITHOUT_CAPTURE',
                severity: 'critical',
                detail: 'Order is settled but Razorpay reports no captured payment with this id in the window. We may be fulfilling without payment.',
                orderId: order.id,
                orderStatus: order.status,
                userId: order.userId,
                razorpayPaymentId: order.paymentId,
                expectedPaise: toPaise(order.paymentAmount) ?? undefined,
            });
        }
    }

    const byType: Record<string, number> = {};
    for (const d of discrepancies) byType[d.type] = (byType[d.type] || 0) + 1;

    const report: ReconciliationReport = {
        window: { from: from.toISOString(), to: to.toISOString() },
        checked: { razorpayPayments: payments.length, localOrders: localOrders.length, truncated },
        summary: {
            critical: discrepancies.filter((d) => d.severity === 'critical').length,
            warning: discrepancies.filter((d) => d.severity === 'warning').length,
            byType,
        },
        discrepancies,
    };

    if (report.summary.critical > 0) {
        logger.error('Payment reconciliation found critical discrepancies', {
            window: report.window, ...report.summary,
        });
    } else {
        logger.info('Payment reconciliation clean', {
            window: report.window, checked: report.checked,
        });
    }

    return report;
}
