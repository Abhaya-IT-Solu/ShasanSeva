import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { admins } from './admins.js';

export const proofs = pgTable('proofs', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    fileUrl: varchar('file_url', { length: 500 }).notNull(),
    fileKey: varchar('file_key', { length: 500 }).notNull(),
    proofType: varchar('proof_type', { length: 100 }), // RECEIPT, SCREENSHOT, REFERENCE_ID, etc.
    description: text('description'),

    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
    uploadedBy: uuid('uploaded_by').references(() => admins.id).notNull(),
});

export type Proof = typeof proofs.$inferSelect;
export type NewProof = typeof proofs.$inferInsert;

// Proof types
export const ProofType = {
    RECEIPT: 'RECEIPT',
    SCREENSHOT: 'SCREENSHOT',
    REFERENCE_ID: 'REFERENCE_ID',
    CONFIRMATION: 'CONFIRMATION',
    OTHER: 'OTHER',
} as const;

export type ProofTypeValue = (typeof ProofType)[keyof typeof ProofType];
