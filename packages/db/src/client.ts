import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Create postgres client
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// For query purposes
const queryClient = postgres(connectionString, {
  ssl: 'require',
  max: 7,
  idle_timeout: 20,
  connect_timeout: 60,
});

export const db = drizzle(queryClient, { schema });

// Export schema for use elsewhere
export { schema };
export type Database = typeof db;
