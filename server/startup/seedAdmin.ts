// MindFit v2 - Auto-Admin User Seeder
// MARP v1 - Module 2: Automatic Root Admin Creation
// Classification: TIER-1 | Zero-Touch Infrastructure

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

interface AdminSeedResult {
  success: boolean;
  created: boolean;
  username?: string;
  password?: string;
  error?: string;
}

/**
 * Automatically create root admin user if none exists
 *
 * Behavior:
 * - Only creates admin if admin_users table is empty
 * - Generates cryptographically secure random password
 * - Password is printed ONCE to console (save immediately!)
 * - Idempotent: Safe to run multiple times
 *
 * @returns Promise<AdminSeedResult> - Admin seeding result
 */
export async function seedAdmin(): Promise<AdminSeedResult> {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("❌ ADMIN_SEED_ERROR: DATABASE_URL not configured");
      return { success: false, created: false, error: "DATABASE_URL missing" };
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check if admin_users table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'admin_users'
      ) as exists
    `;

    if (!tableCheck[0]?.exists) {
      console.log("⏭️  ADMIN_SEED_SKIPPED: admin_users table not created yet (run migrations first)");
      return { success: true, created: false };
    }

    // Check if any admin users exist
    const adminCount = await sql`SELECT COUNT(*) as count FROM admin_users`;
    const count = parseInt(adminCount[0]?.count || "0");

    if (count > 0) {
      console.log(`⏭️  ADMIN_SEED_SKIPPED: ${count} admin user(s) already exist`);
      return { success: true, created: false };
    }

    // Generate secure random password (16 characters, base64)
    const password = crypto.randomBytes(12).toString("base64");
    const passwordHash = await bcrypt.hash(password, 12);

    const username = "admin";
    const email = "admin@mindfit.local";

    // Create root admin user
    await sql`
      INSERT INTO admin_users (
        username,
        email,
        password_hash,
        role,
        full_name,
        active,
        created_at
      ) VALUES (
        ${username},
        ${email},
        ${passwordHash},
        'admin',
        'Root Administrator',
        true,
        NOW()
      )
    `;

    console.log("✅ ADMIN_SEED_CREATED: Root admin user created");
    console.log("\n" + "=".repeat(67));
    console.log("🛡️  MindFit Admin Credentials (SAVE IMMEDIATELY!)");
    console.log("=".repeat(67));
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("=".repeat(67));
    console.log("⚠️  This password will NOT be shown again!");
    console.log("=".repeat(67) + "\n");

    return {
      success: true,
      created: true,
      username,
      password, // Returned for potential secure logging to T7 Shield
    };

  } catch (error: any) {
    console.error("❌ ADMIN_SEED_ERROR:", error.message);
    return { success: false, created: false, error: error.message };
  }
}
