import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { schemes } from './schemes.js';
import { admins } from './admins.js';

/**
 * Enquiries from visitors who have a question about a scheme but have not
 * signed up. Submitted through a public, unauthenticated endpoint.
 *
 * This is lead capture, not support ticketing: there is no reply thread and no
 * user-facing history. An admin reads the enquiry, phones the person, and marks
 * it contacted.
 *
 * Nothing here is verified — the name, phone and email are whatever the visitor
 * typed. Treat every row as unvalidated input.
 */
export const enquiries = pgTable('enquiries', {
    id: uuid('id').defaultRandom().primaryKey(),

    name: varchar('name', { length: 100 }).notNull(),
    // Deliberately not unique: the same person may ask about several schemes,
    // and a unique constraint here would reject their second question.
    phone: varchar('phone', { length: 15 }).notNull(),
    email: varchar('email', { length: 255 }),
    message: text('message').notNull(),

    // Nullable — an enquiry raised from the contact page has no scheme attached.
    schemeId: uuid('scheme_id').references(() => schemes.id),

    status: varchar('status', { length: 20 }).default('NEW').notNull(),
    // NEW, CONTACTED, CLOSED
    adminNote: text('admin_note'),
    handledBy: uuid('handled_by').references(() => admins.id),
    handledAt: timestamp('handled_at'),

    // A public endpoint with no login needs some way to trace an abuse burst
    // back to a source. Never shown in the admin UI.
    sourceIp: varchar('source_ip', { length: 45 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
    // The admin list is almost always "filter by status, newest first".
    index('idx_enquiries_status_created').on(table.status, table.createdAt),
    index('idx_enquiries_scheme_id').on(table.schemeId),
]);

export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;

export const EnquiryStatus = {
    NEW: 'NEW',
    CONTACTED: 'CONTACTED',
    CLOSED: 'CLOSED',
} as const;

export type EnquiryStatusValue = (typeof EnquiryStatus)[keyof typeof EnquiryStatus];
