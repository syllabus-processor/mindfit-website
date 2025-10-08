import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createAdmin() {
  try {
    console.log("\n=== MindFit Admin User Setup ===\n");

    // Get credentials from command line args or use defaults
    const args = process.argv.slice(2);
    const username = args[0] || "admin";
    const password = args[1] || "admin123";

    if (password.length < 8) {
      console.log("❌ Password must be at least 8 characters.");
      process.exit(1);
    }

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`❌ User '${username}' already exists.`);
      console.log("To reset the password, please delete the existing user from the database first.\n");
      process.exit(1);
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      username,
      password: hashedPassword,
    });

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`\nYou can now login at: /admin/login\n`);
    console.log(`⚠️  Remember to change your password after first login!\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();
