import { pgTable, uuid, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const announcements = pgTable('announcements', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 20 }).notNull(), // MARQUEE, PILL, POPULAR_TAG
    title: varchar('title', { length: 255 }).notNull(),
    link: varchar('link', { length: 500 }),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
