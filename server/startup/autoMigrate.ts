// MindFit v2 - Auto-Migration Executor
// MARP v1 - Module 1: Automatic Database Migration on Startup
// Classification: TIER-1 | Zero-Touch Infrastructure

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationResult {
  success: boolean;
  tablesCreated?: number;
  expectedTables?: number;
  error?: string;
}

/**
 * Automatically execute pending database migrations on server startup
 *
 * Behavior:
 * - Only runs if AUTO_RUN_MIGRATIONS=true
 * - Idempotent: Safe to run multiple times
 * - Uses CREATE TABLE IF NOT EXISTS pattern
 * - Validates schema after execution
 *
 * @returns Promise<MigrationResult> - Migration execution result
 */
export async function autoMigrate(): Promise<MigrationResult> {
  try {
    // Check if auto-migration is enabled
    if (process.env.AUTO_RUN_MIGRATIONS !== "true") {
      console.log("⏭️  AUTO_MIGRATE_SKIPPED: AUTO_RUN_MIGRATIONS != true");
      return { success: true, tablesCreated: 0, expectedTables: 0 };
    }

    console.log("🔄 AUTO_MIGRATE_START: Running pending migrations...");

    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL) {
      const error = "DATABASE_URL environment variable is required";
      console.error(`❌ AUTO_MIGRATE_ERROR: ${error}`);
      return { success: false, error };
    }

    const sql = neon(process.env.DATABASE_URL);

    // Test database connection
    console.log("🔌 Testing database connection...");
    await sql`SELECT 1`;
    console.log("✅ Database connection successful");

    // Execute migration 002 (comprehensive v2 schema)
    const migrationFile = "002_mindfit_v2_init.sql";
    console.log(`📄 Running migration: ${migrationFile}`);

    const migrationPath = join(__dirname, "..", "..", "migrations", migrationFile);
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    try {
      await sql(migrationSQL);
      console.log(`✅ Migration completed: ${migrationFile}`);
    } catch (error: any) {
      // Check if error is due to tables already existing
      if (error.message?.includes("already exists")) {
        console.log(`✅ Migration idempotent: Tables already exist`);
      } else {
        console.error(`❌ Migration failed: ${migrationFile}`, error.message);
        return { success: false, error: error.message };
      }
    }

    // Verify tables created
    console.log("🔍 Verifying schema...");
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('admin_users', 'referrals', 'intake_packages', 'events', 'flyers')
      ORDER BY table_name
    `;

    const tablesCreated = tables.length;
    const expectedTables = 5;

    console.log(`📊 Tables verified: ${tablesCreated}/${expectedTables}`);
    for (const table of tables) {
      console.log(`   ✓ ${table.table_name}`);
    }

    const success = tablesCreated === expectedTables;

    if (success) {
      console.log("✅ AUTO_MIGRATE_COMPLETE: All tables created successfully");
    } else {
      console.warn(`⚠️  AUTO_MIGRATE_WARNING: Expected ${expectedTables} tables, found ${tablesCreated}`);
    }

    return {
      success,
      tablesCreated,
      expectedTables,
    };

  } catch (error: any) {
    console.error("❌ AUTO_MIGRATE_ERROR:", error.message);
    return { success: false, error: error.message };
  }
}
