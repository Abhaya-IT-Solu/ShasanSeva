import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const admins = pgTable('admins', {
    id: uuid('id').defaultRandom().primaryKey(),
    phone: varchar('phone', { length: 15 }).unique().notNull(),
    email: varchar('email', { length: 255 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // ADMIN, SUPER_ADMIN
    googleId: varchar('google_id', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }),

    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'), // References admins(id) - Super Admin who created

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;

// Admin roles enum
export const AdminRole = {
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type AdminRoleType = (typeof AdminRole)[keyof typeof AdminRole];
