import { pgTable, uuid, varchar, text, decimal, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { admins } from './admins';

// Required Document definition
export interface RequiredDocument {
    type: string;      // e.g., 'AADHAAR', 'PAN', 'INCOME_CERTIFICATE'
    label: string;     // Display name
    required: boolean;
    description?: string;
}

export const schemes = pgTable('schemes', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }), // STUDENT, FARMER, LOAN
    schemeType: varchar('scheme_type', { length: 50 }), // GOVERNMENT, PRIVATE
    eligibility: text('eligibility'),
    benefits: text('benefits'),
    requiredDocs: jsonb('required_docs').$type<RequiredDocument[]>().default([]),
    serviceFee: decimal('service_fee', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).default('ACTIVE'), // ACTIVE, INACTIVE

    createdBy: uuid('created_by').references(() => admins.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Scheme = typeof schemes.$inferSelect;
export type NewScheme = typeof schemes.$inferInsert;

// Scheme categories
export const SchemeCategory = {
    STUDENT: 'STUDENT',
    FARMER: 'FARMER',
    LOAN: 'LOAN',
} as const;

export type SchemeCategoryType = (typeof SchemeCategory)[keyof typeof SchemeCategory];

// Scheme types
export const SchemeType = {
    GOVERNMENT: 'GOVERNMENT',
    PRIVATE: 'PRIVATE',
} as const;

export type SchemeTypeValue = (typeof SchemeType)[keyof typeof SchemeType];

// Scheme status
export const SchemeStatus = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
} as const;

export type SchemeStatusType = (typeof SchemeStatus)[keyof typeof SchemeStatus];
