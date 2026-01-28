import { pgTable, uuid, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { admins } from './admins.js';

export const adminAnalytics = pgTable('admin_analytics', {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id').references(() => admins.id).unique().notNull(),

    // Order Stats
    totalOrdersHandled: integer('total_orders_handled').default(0),
    ordersCompleted: integer('orders_completed').default(0),
    ordersCancelled: integer('orders_cancelled').default(0),
    ordersInProgress: integer('orders_in_progress').default(0),

    // Document Stats
    documentsVerified: integer('documents_verified').default(0),
    documentsRejected: integer('documents_rejected').default(0),

    // Time Stats
    avgCompletionTimeHours: decimal('avg_completion_time_hours', { precision: 10, scale: 2 }),
    lastActiveAt: timestamp('last_active_at'),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AdminAnalytics = typeof adminAnalytics.$inferSelect;
export type NewAdminAnalytics = typeof adminAnalytics.$inferInsert;
