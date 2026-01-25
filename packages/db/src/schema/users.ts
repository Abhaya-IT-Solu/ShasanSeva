import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// User Address Type
export interface UserAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

// Saved Document Type (for reusable documents in profile)
export interface SavedDocument {
    type: string;
    label: string;
    fileUrl: string;
    fileKey: string;
    uploadedAt: string;
}

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    phone: varchar('phone', { length: 15 }).unique().notNull(),
    email: varchar('email', { length: 255 }).unique(),
    name: varchar('name', { length: 255 }),
    category: varchar('category', { length: 50 }), // STUDENT, FARMER, LOAN_CANDIDATE, OTHER
    googleId: varchar('google_id', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }),

    // Profile Details (optional)
    address: jsonb('address').$type<UserAddress>(),
    savedDocuments: jsonb('saved_documents').$type<SavedDocument[]>().default([]),

    profileComplete: boolean('profile_complete').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
