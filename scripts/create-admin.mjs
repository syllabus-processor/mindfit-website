/**
 * MindFit Admin User Creation Script
 * -----------------------------------
 * Creates the initial admin user (mf-admin) using the ADMIN_PASSWORD
 * environment variable. Intended to be run inside the DigitalOcean
 * App Platform console during Phase 1 DB initialization.
 */

import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import bcrypt from "bcryptjs";

async function main() {
  try {
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      console.error("ERROR: ADMIN_PASSWORD environment variable not set.");
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);

    const [admin] = await db
      .insert(users)
      .values({
        username: "mf-admin",
        password: hash
      })
      .returning();

    console.log("SUCCESS: Admin user created:");
    console.log(admin);
    process.exit(0);
  } catch (err) {
    console.error("ERROR creating admin user:", err);
    process.exit(1);
  }
}

main();
