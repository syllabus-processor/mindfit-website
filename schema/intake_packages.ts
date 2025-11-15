// MindFit v2 Schema - Intake Packages Table
// Campaign 1 - Sprint 2: DO Spaces + Encrypted Export
// Classification: TIER-1 | HIPAA-compliant encrypted package tracking

import { pgTable, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// INTAKE_PACKAGES TABLE
// Purpose: Track encrypted export packages for EMA handoff via DO Spaces
// ============================================================================

export const intakePackages = pgTable("intake_packages", {
  // Primary Identifier
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Referral Reference (foreign key to referrals table)
  referralId: varchar("referral_id").notNull(),

  // Package Metadata
  packageName: varchar("package_name", { length: 255 }).notNull(),
  packageType: varchar("package_type", { length: 50 }).notNull().default("referral_export"),
  // referral_export, intake_form, assessment_data, document_bundle

  // Encryption Details
  encryptionAlgorithm: varchar("encryption_algorithm", { length: 50 }).notNull().default("AES-256-GCM"),
  encryptionKeyId: varchar("encryption_key_id", { length: 100 }).notNull(),
  // Reference to key stored in secure key management (not the actual key)

  // DO Spaces Storage
  spacesUrl: text("spaces_url").notNull(),
  // Full URL to object in DO Spaces (e.g., s3://rsl-ema-prod-bucket/intake-packages/...)
  presignedUrl: text("presigned_url"),
  // Temporary pre-signed URL for secure download (24-hour expiry)
  presignedUrlExpiry: timestamp("presigned_url_expiry"),

  // Package Details
  fileSizeBytes: integer("file_size_bytes").notNull(),
  checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
  // SHA-256 checksum of encrypted package for integrity verification

  // Workflow Status
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  // pending, encrypted, uploaded, downloaded, expired, error

  // Notification Status
  notificationSent: timestamp("notification_sent"),
  notificationRecipient: varchar("notification_recipient", { length: 255 }),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  uploadedAt: timestamp("uploaded_at"),
  downloadedAt: timestamp("downloaded_at"),
  expiresAt: timestamp("expires_at").notNull(),
  // Automatic expiration (default: 7 days from creation)

  // Audit Trail
  createdBy: varchar("created_by"),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),

  // Error Tracking
  errorMessage: text("error_message"),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const insertIntakePackageSchema = createInsertSchema(intakePackages).omit({
  id: true,
  createdAt: true,
  uploadedAt: true,
  downloadedAt: true,
  lastModifiedAt: true,
  createdBy: true,
}).extend({
  referralId: z.string().uuid("Invalid referral ID"),
  packageName: z.string().min(1, "Package name is required"),
  packageType: z.enum(["referral_export", "intake_form", "assessment_data", "document_bundle"]).default("referral_export"),
  encryptionAlgorithm: z.string().default("AES-256-GCM"),
  encryptionKeyId: z.string().min(1, "Encryption key ID is required"),
  spacesUrl: z.string().url("Invalid Spaces URL"),
  presignedUrl: z.string().url("Invalid pre-signed URL").optional(),
  presignedUrlExpiry: z.date().optional(),
  fileSizeBytes: z.number().int().positive("File size must be positive"),
  checksumSha256: z.string().length(64, "SHA-256 checksum must be 64 characters"),
  status: z.enum(["pending", "encrypted", "uploaded", "downloaded", "expired", "error"]).default("pending"),
  notificationRecipient: z.string().email().optional(),
  expiresAt: z.date(),
  errorMessage: z.string().optional(),
});

export const updateIntakePackageSchema = insertIntakePackageSchema.partial();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type IntakePackage = typeof intakePackages.$inferSelect;
export type InsertIntakePackage = z.infer<typeof insertIntakePackageSchema>;
export type UpdateIntakePackage = z.infer<typeof updateIntakePackageSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Calculate default expiration (7 days from now)
export function getDefaultExpiration(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}

// Calculate pre-signed URL expiration (24 hours from now)
export function getPresignedUrlExpiration(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}
