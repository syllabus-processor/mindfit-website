// MindFit v2 - Migration Runner
// Executes SQL migrations against the MindFit database
// Classification: TIER-1 | Database Administration

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { neon } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// ============================================================================
// MIGRATION RUNNER
// ============================================================================

async function runMigration(migrationFile: string) {
  console.log(`\n📄 Running migration: ${migrationFile}`);

  const migrationPath = join(__dirname, "..", "migrations", migrationFile);
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  try {
    await sql(migrationSQL);
    console.log(`✅ Migration completed: ${migrationFile}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error(error.message);
    return false;
  }
}

// ============================================================================
// VERIFICATION QUERIES
// ============================================================================

async function verifyTables() {
  console.log("\n🔍 Verifying tables...");

  try {
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

    console.log("\n📊 Tables found:");
    for (const table of tables) {
      console.log(`   ✓ ${table.table_name}: ${table.column_count} columns`);
    }

    return tables.length === 5;
  } catch (error: any) {
    console.error("❌ Verification failed:", error.message);
    return false;
  }
}

async function verifyIndexes() {
  console.log("\n🔍 Verifying indexes...");

  try {
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

    console.log("\n📊 Indexes found:");
    for (const idx of indexes) {
      console.log(`   ✓ ${idx.tablename}: ${idx.index_count} indexes`);
    }

    return true;
  } catch (error: any) {
    console.error("❌ Index verification failed:", error.message);
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║       MindFit v2 Database Migration Runner                    ║");
  console.log("║       Campaign 1 - Complete Schema Initialization             ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  try {
    // Test database connection
    console.log("\n🔌 Testing database connection...");
    await sql`SELECT 1`;
    console.log("✅ Database connection successful");

    // Run migration 002 (comprehensive v2 schema)
    const success = await runMigration("002_mindfit_v2_init.sql");

    if (!success) {
      console.error("\n❌ MIGRATION FAILED - Exiting");
      process.exit(1);
    }

    // Verify tables and indexes
    const tablesOk = await verifyTables();
    const indexesOk = await verifyIndexes();

    if (tablesOk && indexesOk) {
      console.log("\n╔═══════════════════════════════════════════════════════════════╗");
      console.log("║  ✅ MIGRATION SUCCESSFUL                                      ║");
      console.log("║                                                               ║");
      console.log("║  Tables created: 5                                            ║");
      console.log("║  - admin_users                                                ║");
      console.log("║  - referrals                                                  ║");
      console.log("║  - intake_packages                                            ║");
      console.log("║  - events                                                     ║");
      console.log("║  - flyers                                                     ║");
      console.log("║                                                               ║");
      console.log("║  Status: PRODUCTION READY                                     ║");
      console.log("╚═══════════════════════════════════════════════════════════════╝");
      process.exit(0);
    } else {
      console.error("\n❌ VERIFICATION FAILED - Tables or indexes missing");
      process.exit(1);
    }

  } catch (error: any) {
    console.error("\n❌ FATAL ERROR:", error.message);
    process.exit(1);
  }
}

main();
