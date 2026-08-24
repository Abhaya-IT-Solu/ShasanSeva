import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

/**
 * Per-order timeline — the source of truth for an order's history.
 *
 * Exists because order state was previously destructive: resubmitting an order
 * nulled the admin's cancellation note, so neither side could see why it had
 * been rejected, and there was no way to tell whether an order had been
 * resubmitted at all.
 *
 * `orders.admin_notes` and `orders.user_notes` remain as denormalised "latest"
 * caches for existing UI; this table is what actually persists.
 */
export const orderEvents = pgTable('order_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),

    eventType: varchar('event_type', { length: 40 }).notNull(),

    // Populated only on STATUS_CHANGED. Real columns rather than metadata keys so
    // "how long did this sit in IN_PROGRESS" stays plain SQL.
    fromStatus: varchar('from_status', { length: 30 }),
    toStatus: varchar('to_status', { length: 30 }),

    // Polymorphic actor: points at admins OR users, so a foreign key is impossible.
    // actorName is snapshotted because that rules out a join — and the name is
    // already in the JWT session, so it costs nothing. It also survives an admin
    // being deactivated, which matters for an audit-flavoured log.
    actorType: varchar('actor_type', { length: 20 }).notNull(), // USER | ADMIN | SYSTEM
    actorId: uuid('actor_id'),
    actorName: varchar('actor_name', { length: 255 }),

    // Defaults to the conservative direction. Before this table every admin note
    // was rendered verbatim to the user, with no way to keep one private.
    visibility: varchar('visibility', { length: 20 }).default('ADMIN_ONLY').notNull(),

    message: text('message'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    // Serves the only read pattern — one order's timeline, chronological — as both
    // filter and sort. An event_type index is deliberately omitted: the resubmission
    // count filters within a single order's handful of rows.
    index('idx_order_events_order_created').on(table.orderId, table.createdAt),
]);

export type OrderEvent = typeof orderEvents.$inferSelect;
export type NewOrderEvent = typeof orderEvents.$inferInsert;

/**
 * There is deliberately no PICKED_UP or COMPLETED type — those are STATUS_CHANGED
 * with fromStatus/toStatus set. One type carrying data beats five near-duplicates.
 */
export const OrderEventType = {
    CREATED: 'CREATED',
    PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    STATUS_CHANGED: 'STATUS_CHANGED',
    ADMIN_NOTE: 'ADMIN_NOTE',
    USER_NOTE: 'USER_NOTE',
    DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED',
    DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
    PROOF_UPLOADED: 'PROOF_UPLOADED',
    RESUBMITTED: 'RESUBMITTED',
} as const;

export type OrderEventTypeValue = (typeof OrderEventType)[keyof typeof OrderEventType];

export const OrderEventVisibility = {
    ADMIN_ONLY: 'ADMIN_ONLY',
    USER_VISIBLE: 'USER_VISIBLE',
} as const;

export type OrderEventVisibilityValue =
    (typeof OrderEventVisibility)[keyof typeof OrderEventVisibility];

export const OrderEventActorType = {
    USER: 'USER',
    ADMIN: 'ADMIN',
    SYSTEM: 'SYSTEM',
} as const;

export type OrderEventActorTypeValue =
    (typeof OrderEventActorType)[keyof typeof OrderEventActorType];
