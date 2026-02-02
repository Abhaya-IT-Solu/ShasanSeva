import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { schemes } from './schemes.js';
import { admins } from './admins.js';

// Scheme translations table for localized content
export const schemeTranslations = pgTable('scheme_translations', {
    id: uuid('id').defaultRandom().primaryKey(),
    schemeId: uuid('scheme_id').references(() => schemes.id).notNull(),
    locale: varchar('locale', { length: 10 }).notNull(), // 'en' or 'mr'
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    eligibility: text('eligibility'),
    benefits: text('benefits'),
    translatedAt: timestamp('translated_at').defaultNow(),
    translatedBy: uuid('translated_by').references(() => admins.id),
});

export type SchemeTranslation = typeof schemeTranslations.$inferSelect;
export type NewSchemeTranslation = typeof schemeTranslations.$inferInsert;

// Supported locales
export const Locales = {
    ENGLISH: 'en',
    MARATHI: 'mr',
} as const;

export type LocaleType = (typeof Locales)[keyof typeof Locales];
