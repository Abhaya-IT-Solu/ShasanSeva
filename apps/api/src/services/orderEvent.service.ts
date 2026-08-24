import { db, orderEvents } from '@shasansetu/db';
import type {
    OrderEventTypeValue,
    OrderEventVisibilityValue,
    OrderEventActorTypeValue,
} from '@shasansetu/db';
import { logger } from '../lib/utils.js';

interface RecordOrderEventParams {
    orderId: string;
    eventType: OrderEventTypeValue;
    actorType: OrderEventActorTypeValue;
    actorId?: string | null;
    /** Snapshot of the actor's name — actorId is polymorphic so it cannot be joined. */
    actorName?: string | null;
    /** Defaults to ADMIN_ONLY. Only pass USER_VISIBLE deliberately. */
    visibility?: OrderEventVisibilityValue;
    fromStatus?: string | null;
    toStatus?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
}

/**
 * The handle Drizzle hands to a `db.transaction()` callback. Derived rather than
 * imported because the concrete type is generic over the whole schema.
 */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Append an event to an order's timeline.
 *
 * Never throws. Timeline writes accompany payments, status changes and document
 * decisions — a logging failure must not roll those back. Pass `tx` to enlist in a
 * caller's transaction when the event and the state change must land together.
 */
export async function recordOrderEvent(
    params: RecordOrderEventParams,
    tx?: DbTransaction,
): Promise<void> {
    try {
        await (tx ?? db).insert(orderEvents).values({
            orderId: params.orderId,
            eventType: params.eventType,
            actorType: params.actorType,
            actorId: params.actorId ?? null,
            actorName: params.actorName ?? null,
            visibility: params.visibility ?? 'ADMIN_ONLY',
            fromStatus: params.fromStatus ?? null,
            toStatus: params.toStatus ?? null,
            message: params.message ?? null,
            metadata: params.metadata ?? {},
        });
    } catch (error) {
        logger.error('Failed to record order event', {
            orderId: params.orderId,
            eventType: params.eventType,
            error,
        });
        // Swallowed deliberately — see the doc comment above.
    }
}
