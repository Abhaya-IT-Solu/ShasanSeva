import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // ORDER, DOCUMENT, PROOF, ADMIN, USER
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    performedBy: uuid('performed_by'), // Can be user or admin
    performerType: varchar('performer_type', { length: 20 }), // USER, ADMIN, SYSTEM
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ipAddress: varchar('ip_address', { length: 50 }),

    timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Entity types for audit logs
export const AuditEntityType = {
    ORDER: 'ORDER',
    DOCUMENT: 'DOCUMENT',
    PROOF: 'PROOF',
    ADMIN: 'ADMIN',
    USER: 'USER',
    SCHEME: 'SCHEME',
} as const;

export type AuditEntityTypeValue = (typeof AuditEntityType)[keyof typeof AuditEntityType];

// Performer types
export const PerformerType = {
    USER: 'USER',
    ADMIN: 'ADMIN',
    SYSTEM: 'SYSTEM',
} as const;

export type PerformerTypeValue = (typeof PerformerType)[keyof typeof PerformerType];
