// Database connection setup using PostgreSQL (DigitalOcean Managed Database)
// Switched from Neon serverless (WebSocket) to standard pg (TCP)
// Using default import for pg CommonJS module (ESM compatibility)
import pkg from 'pg';
const Pool = pkg.Pool;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for DigitalOcean managed databases
  }
});

export const db = drizzle(pool, { schema });
