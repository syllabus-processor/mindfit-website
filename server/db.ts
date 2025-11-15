// Database connection setup using PostgreSQL (DigitalOcean Managed Database)
// Switched from Neon serverless (WebSocket) to standard pg (TCP)
// Using default import for pg CommonJS module (ESM compatibility)
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// CRITICAL: Disable TLS certificate validation for DigitalOcean managed databases
// This is required because drizzle-orm doesn't properly respect pool SSL config
// and DigitalOcean uses self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use pg.Pool directly to ensure SSL config is properly applied
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  }
});

export const db = drizzle(pool, { schema });
