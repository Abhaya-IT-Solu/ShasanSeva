import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { admins } from './admins';

export const documents = pgTable('documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    docType: varchar('doc_type', { length: 100 }).notNull(),
    fileUrl: varchar('file_url', { length: 500 }).notNull(),
    fileKey: varchar('file_key', { length: 500 }).notNull(), // R2 object key

    status: varchar('status', { length: 30 }).default('UPLOADED').notNull(),
    // UPLOADED, VERIFIED, REJECTED, RESUBMISSION_REQUIRED

    rejectionReason: text('rejection_reason'),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    verifiedAt: timestamp('verified_at'),
    verifiedBy: uuid('verified_by').references(() => admins.id),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

// Document status enum
export const DocumentStatus = {
    UPLOADED: 'UPLOADED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    RESUBMISSION_REQUIRED: 'RESUBMISSION_REQUIRED',
} as const;

export type DocumentStatusType = (typeof DocumentStatus)[keyof typeof DocumentStatus];
