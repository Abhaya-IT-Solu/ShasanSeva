import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders';

export const notifications = pgTable('notifications', {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id').notNull(),
    recipientType: varchar('recipient_type', { length: 20 }).notNull(), // USER, ADMIN
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message'),
    relatedOrderId: uuid('related_order_id').references(() => orders.id),
    read: boolean('read').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Notification types
export const NotificationType = {
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
    DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
    PROOF_UPLOADED: 'PROOF_UPLOADED',
    ORDER_COMPLETED: 'ORDER_COMPLETED',
    NEW_ORDER_ASSIGNED: 'NEW_ORDER_ASSIGNED', // For admins
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];
