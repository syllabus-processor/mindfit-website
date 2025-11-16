// MindFit v2 - Database Migration Admin Endpoint
// Campaign 1 - Sprint 5: Database Schema Initialization
// Classification: TIER-1 | Admin Only

import type { Router, Request, Response } from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// MIGRATION EXECUTION
// ============================================================================

/**
 * POST /api/admin/migrate
 * Execute database migrations
 *
 * Body: {
 *   migration?: string // Optional: specific migration file (defaults to all)
 * }
 *
 * Returns: { success: true, results: [...] }
 */
export async function executeMigrations(req: Request, res: Response) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        message: "DATABASE_URL not configured",
      });
    }

    const sql = neon(process.env.DATABASE_URL);
    const results: any[] = [];

    // Test connection
    console.log("🔌 Testing database connection...");
    await sql`SELECT 1`;
    console.log("✅ Database connection successful");

    // Run migration 002 (comprehensive v2 schema)
    const migrationFile = "002_mindfit_v2_init.sql";
    console.log(`\n📄 Running migration: ${migrationFile}`);

    const migrationPath = join(__dirname, "..", "..", "migrations", migrationFile);
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    try {
      await sql(migrationSQL);
      console.log(`✅ Migration completed: ${migrationFile}`);
      results.push({
        file: migrationFile,
        status: "success",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`❌ Migration failed: ${migrationFile}`);
      console.error(error.message);
      results.push({
        file: migrationFile,
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return res.status(500).json({
        success: false,
        message: `Migration failed: ${migrationFile}`,
        error: error.message,
        results,
      });
    }

    // Verify tables created
    console.log("\n🔍 Verifying tables...");
    const tables = await sql`
      SELECT
        table_name,
        (SELECT COUNT(*)
         FROM information_schema.columns
         WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_name IN ('admin_users', 'referrals', 'intake_packages', 'events', 'flyers')
      ORDER BY table_name
    `;

    console.log("📊 Tables found:", tables.length);
    for (const table of tables) {
      console.log(`   ✓ ${table.table_name}: ${table.column_count} columns`);
    }

    // Verify indexes
    console.log("\n🔍 Verifying indexes...");
    const indexes = await sql`
      SELECT
        tablename,
        COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('admin_users', 'referrals', 'intake_packages', 'events', 'flyers')
      GROUP BY tablename
      ORDER BY tablename
    `;

    console.log("📊 Indexes found:");
    for (const idx of indexes) {
      console.log(`   ✓ ${idx.tablename}: ${idx.index_count} indexes`);
    }

    return res.json({
      success: true,
      message: "Migrations completed successfully",
      results,
      verification: {
        tables: tables,
        indexes: indexes,
        summary: {
          tablesCreated: tables.length,
          expectedTables: 5,
          status: tables.length === 5 ? "COMPLETE" : "INCOMPLETE",
        },
      },
    });
  } catch (error: any) {
    console.error("[MIGRATION ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Migration execution failed",
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/migrate/status
 * Check migration status and database schema
 *
 * Returns: { success: true, tables: [...], status: "..." }
 */
export async function getMigrationStatus(req: Request, res: Response) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        message: "DATABASE_URL not configured",
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check which v2 tables exist
    const tables = await sql`
      SELECT
        table_name,
        (SELECT COUNT(*)
         FROM information_schema.columns
         WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_name IN ('admin_users', 'referrals', 'intake_packages', 'events', 'flyers')
      ORDER BY table_name
    `;

    const expectedTables = ['admin_users', 'referrals', 'intake_packages', 'events', 'flyers'];
    const existingTableNames = tables.map((t: any) => t.table_name);
    const missingTables = expectedTables.filter(t => !existingTableNames.includes(t));

    let status: string;
    if (tables.length === 0) {
      status = "NOT_MIGRATED";
    } else if (tables.length === 5) {
      status = "COMPLETE";
    } else {
      status = "PARTIAL";
    }

    return res.json({
      success: true,
      status,
      tables: tables,
      summary: {
        existingTables: existingTableNames,
        missingTables,
        totalExpected: expectedTables.length,
        totalFound: tables.length,
      },
    });
  } catch (error: any) {
    console.error("[MIGRATION STATUS ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check migration status",
      error: error.message,
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register migration routes on Express router
 *
 * @param {Router} router - Express router instance
 * @param {Function} authMiddleware - Authentication middleware (admin only)
 */
export function registerMigrationRoutes(router: Router, authMiddleware?: any): void {
  if (authMiddleware) {
    // Protected admin routes
    router.post("/api/admin/migrate", authMiddleware, executeMigrations);
    router.get("/api/admin/migrate/status", authMiddleware, getMigrationStatus);
  } else {
    // WARNING: In development only - require auth in production!
    console.warn("⚠️  Migration routes registered WITHOUT authentication");
    router.post("/api/admin/migrate", executeMigrations);
    router.get("/api/admin/migrate/status", getMigrationStatus);
  }
}

// ============================================================================
// PRODUCTION NOTES
// ============================================================================

/**
 * SECURITY CONSIDERATIONS:
 *
 * 1. This endpoint MUST be protected by authentication middleware in production
 * 2. Only admin users should have access to run migrations
 * 3. Migrations should ideally be run once during initial deployment
 * 4. Consider disabling this endpoint after initial migration (environment flag)
 * 5. All migration activity is logged to console for audit trail
 *
 * USAGE:
 *
 * 1. Deploy app with this endpoint
 * 2. Authenticate as admin user
 * 3. POST to /api/admin/migrate
 * 4. Verify with GET /api/admin/migrate/status
 * 5. Optional: Disable endpoint via environment variable after completion
 */
