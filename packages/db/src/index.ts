// Main entry point for @shasansetu/db package
export { db, schema, sql } from './client.js';
export type { Database } from './client.js';

// Re-export all schema types for convenience
export * from './schema/index.js';
