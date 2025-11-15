// MindFit v2 Schema - Admin Users Table
// Campaign 1 - Lightweight RBAC for admin dashboard access
// Classification: TIER-1 | Role-based access control

import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ADMIN_USERS TABLE
// Purpose: Lightweight role-based access control for MindFit admin dashboard
// ============================================================================

export const adminUsers = pgTable("admin_users", {
  // Primary Identifier
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Authentication
  username: varchar("username", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // bcrypt hash of password

  // Role-Based Access Control
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  // admin, supervisor, therapist, staff, readonly
  permissions: text("permissions"),
  // JSON array of granular permissions (e.g., ["referrals.view", "referrals.edit", "events.manage"])

  // Profile Information
  fullName: varchar("full_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 100 }),
  // "Licensed Clinical Social Worker", "Supervisor", etc.
  department: varchar("department", { length: 100 }),
  // "Intake", "Clinical", "Administration"

  // Contact Information
  phone: varchar("phone", { length: 50 }),
  officeLocation: varchar("office_location", { length: 100 }),

  // Account Status
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  isSuperuser: boolean("is_superuser").notNull().default(false),

  // Session Management
  lastLogin: timestamp("last_login"),
  lastLoginIp: varchar("last_login_ip", { length: 50 }),
  sessionToken: text("session_token"),
  // Current session token (for single-session enforcement if needed)

  // Security
  failedLoginAttempts: varchar("failed_login_attempts", { length: 10 }).default("0"),
  lockedUntil: timestamp("locked_until"),
  // Account lock timestamp after too many failed attempts
  passwordChangedAt: timestamp("password_changed_at"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),

  // Password Reset
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpiry: timestamp("reset_token_expiry"),

  // Email Verification
  verificationToken: varchar("verification_token", { length: 255 }),
  verificationTokenExpiry: timestamp("verification_token_expiry"),

  // Notifications Preferences
  emailNotifications: boolean("email_notifications").notNull().default(true),
  notificationPreferences: text("notification_preferences"),
  // JSON object of notification preferences

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  // Soft delete timestamp

  // Audit Trail
  createdBy: varchar("created_by"),
  lastModifiedBy: varchar("last_modified_by"),

  // Notes
  internalNotes: text("internal_notes"),
  // Admin notes about user account
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  createdBy: true,
  lastModifiedBy: true,
  lastLogin: true,
  lastLoginIp: true,
  sessionToken: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  passwordChangedAt: true,
  resetToken: true,
  resetTokenExpiry: true,
  verificationToken: true,
  verificationTokenExpiry: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters").max(100),
  email: z.string().email("Invalid email address"),
  passwordHash: z.string().min(1, "Password hash is required"),
  role: z.enum(["admin", "supervisor", "therapist", "staff", "readonly"]).default("staff"),
  permissions: z.string().optional(), // JSON string
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  title: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  officeLocation: z.string().optional(),
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  isSuperuser: z.boolean().default(false),
  mustChangePassword: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  notificationPreferences: z.string().optional(), // JSON string
  internalNotes: z.string().optional(),
});

export const updateAdminUserSchema = insertAdminUserSchema.partial();

// Login validation schema (for authentication)
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type UpdateAdminUser = z.infer<typeof updateAdminUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;

// ============================================================================
// ROLE PERMISSIONS MAPPING
// ============================================================================

export const ROLE_PERMISSIONS = {
  admin: [
    "referrals.*",
    "events.*",
    "flyers.*",
    "users.*",
    "packages.*",
    "settings.*",
    "audit.*",
  ],
  supervisor: [
    "referrals.*",
    "events.view",
    "events.edit",
    "flyers.view",
    "packages.view",
    "packages.create",
  ],
  therapist: [
    "referrals.view",
    "referrals.edit:assigned",
    "events.view",
    "flyers.view",
    "packages.view:assigned",
  ],
  staff: [
    "referrals.view",
    "events.view",
    "events.edit",
    "flyers.view",
    "flyers.edit",
  ],
  readonly: [
    "referrals.view",
    "events.view",
    "flyers.view",
  ],
} as const;
