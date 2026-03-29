import { pgTable, uuid, integer, text, timestamp, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { users } from './users.js';

export const feedbacks = pgTable('feedbacks', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull().unique(), // one feedback per order
    userId: uuid('user_id').references(() => users.id).notNull(),
    rating: integer('rating').notNull(), // 1–5
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    index('idx_feedbacks_order_id').on(table.orderId),
    index('idx_feedbacks_user_id').on(table.userId),
]);

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
