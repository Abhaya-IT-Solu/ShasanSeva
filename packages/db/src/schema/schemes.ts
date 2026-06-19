import { pgTable, uuid, varchar, text, decimal, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { admins } from './admins.js';

// Required Document definition
export interface RequiredDocument {
    type: string;      // e.g., 'AADHAAR', 'PAN', 'INCOME_CERTIFICATE'
    label: string;     // Display name
    required: boolean;
    description?: string;
}
// Custom Form Field definition
export interface CustomFormField {
    id: string;               // e.g., 'college_name', 'marks_10th'
    type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'phone';
    label: string;            // English label
    label_mr?: string;        // Marathi label
    required: boolean;
    placeholder?: string;
    placeholder_mr?: string;
    options?: { label: string; label_mr?: string; value: string }[]; // For type = 'select'
    validationRegex?: string; // Optional regex pattern
}

export const schemes = pgTable('schemes', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }), // STUDENT, FARMER, LOAN, etc.
    schemeType: varchar('scheme_type', { length: 50 }), // GOVERNMENT, PRIVATE
    eligibility: text('eligibility'),
    benefits: text('benefits'),
    requiredDocs: jsonb('required_docs').$type<RequiredDocument[]>().default([]),
    customFields: jsonb('custom_fields').$type<CustomFormField[]>().default([]),
    serviceFee: decimal('service_fee', { precision: 10, scale: 2 }).notNull(),
    averageCompletionDays: decimal('average_completion_days', { precision: 5, scale: 0 }),
    logoUrl: text('logo_url'),                     // Optional: R2 key for scheme logo
    referenceImageUrl: text('reference_image_url'), // Optional: R2 key for reference/sample image
    status: varchar('status', { length: 20 }).default('ACTIVE'), // ACTIVE, INACTIVE

    createdBy: uuid('created_by').references(() => admins.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
    index('idx_schemes_category').on(table.category),
    index('idx_schemes_status').on(table.status),
    index('idx_schemes_type').on(table.schemeType),
]);

export type Scheme = typeof schemes.$inferSelect;
export type NewScheme = typeof schemes.$inferInsert;

// Scheme categories
export const SchemeCategory = {
    STUDENT: 'STUDENT',
    FARMER: 'FARMER',
    LOAN: 'LOAN',
    CERTIFICATE: 'CERTIFICATE',   // Important Certificates
    JOBS: 'JOBS',                  // Jobs Application Assistance
    OTHER: 'OTHER',                // Other Services
    HEALTH: 'HEALTH',              // Health Schemes
    GOVT_CARD: 'GOVT_CARD',        // Government Cards
    LICENCE: 'LICENCE',            // Licences
    TAX: 'TAX',                    // Tax Section
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
