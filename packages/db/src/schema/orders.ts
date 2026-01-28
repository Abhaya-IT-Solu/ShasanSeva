import { pgTable, uuid, varchar, text, decimal, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { schemes } from './schemes.js';
import { admins } from './admins.js';

export const orders = pgTable('orders', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    schemeId: uuid('scheme_id').references(() => schemes.id).notNull(),

    status: varchar('status', { length: 30 }).default('PENDING_PAYMENT').notNull(),
    // PENDING_PAYMENT, PAID, IN_PROGRESS, PROOF_UPLOADED, COMPLETED, CANCELLED

    // Payment Info (nullable until payment is completed)
    paymentId: varchar('payment_id', { length: 255 }),
    razorpayOrderId: varchar('razorpay_order_id', { length: 255 }),
    paymentAmount: decimal('payment_amount', { precision: 10, scale: 2 }).notNull(),
    paymentTimestamp: timestamp('payment_timestamp'),

    // Consent (nullable for legacy/pending orders)
    consentTimestamp: timestamp('consent_timestamp'),
    termsVersion: varchar('terms_version', { length: 50 }),

    // Admin Assignment
    assignedTo: uuid('assigned_to').references(() => admins.id),
    adminNotes: text('admin_notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

// Order status enum
export const OrderStatus = {
    PAID: 'PAID',
    IN_PROGRESS: 'IN_PROGRESS',
    PROOF_UPLOADED: 'PROOF_UPLOADED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
