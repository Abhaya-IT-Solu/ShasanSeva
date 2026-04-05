import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { schemes } from './schemes.js';

export const announcements = pgTable('announcements', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 20 }).notNull(), // MARQUEE, PILL, POPULAR_TAG, CAROUSEL
    title: varchar('title', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }),
    link: varchar('link', { length: 500 }),
    imageKey: varchar('image_key', { length: 500 }),     // R2 storage key for carousel bg image
    imageUrl: text('image_url'),                          // Cached download URL (refreshable)
    schemeId: uuid('scheme_id').references(() => schemes.id), // FK for CAROUSEL items
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
