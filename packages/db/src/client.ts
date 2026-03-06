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
// max_lifetime: recycle connections every 30 min so stale DNS entries don't persist (fixes ENOTFOUND after Supabase pauses)
// idle_timeout: close idle connections after 20s to free server-side resources
// connect_timeout: fail fast (10s) instead of hanging for 60s
// keep_alive: detect dead connections early via TCP keepalives
const queryClient = postgres(connectionString, {
  ssl: 'require',
  max: 7,
  idle_timeout: 20,
  max_lifetime: 1800, // 30 minutes — forces DNS re-resolution on reconnect
  connect_timeout: 10, // fail fast instead of hanging at 60s
});

export const db = drizzle(queryClient, { schema });

// Export schema for use elsewhere
export { schema };
export type Database = typeof db;

