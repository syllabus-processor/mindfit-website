import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  preferredContact: text("preferred_contact").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
});

export const integrationSettings = pgTable("integration_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataType: text("data_type").notNull().unique(),
  provider: text("provider").notNull(),
  config: text("config").notNull(),
  enabled: text("enabled").notNull().default("true"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Client Information
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientAge: integer("client_age"),
  // Clinical Information
  presentingConcerns: text("presenting_concerns").notNull(),
  urgency: varchar("urgency", { length: 20 }).notNull(),
  // Insurance Information
  insuranceProvider: varchar("insurance_provider", { length: 255 }),
  insuranceMemberId: varchar("insurance_member_id", { length: 100 }),
  // Referral Metadata
  referralSource: varchar("referral_source", { length: 255 }),
  referralNotes: text("referral_notes"),

  // NEW: Dual-layer workflow tracking
  clientState: varchar("client_state", { length: 20 }).notNull().default("prospective"),
  workflowStatus: varchar("workflow_status", { length: 50 }).notNull().default("referral_submitted"),

  // DEPRECATED: Legacy status field (kept for backward compatibility)
  status: varchar("status", { length: 50 }).notNull().default("pending"),

  // Assignment Tracking
  assignedTherapist: varchar("assigned_therapist", { length: 255 }),
  assignedSupervisor: varchar("assigned_supervisor", { length: 255 }),
  assignmentNotes: text("assignment_notes"),

  // NEW: Workflow phase timestamps
  preStageStartedAt: timestamp("prestage_started_at"),
  preStageCompletedAt: timestamp("prestage_completed_at"),
  stageStartedAt: timestamp("stage_started_at"),
  stageCompletedAt: timestamp("stage_completed_at"),
  assignmentStartedAt: timestamp("assignment_started_at"),
  assignmentCompletedAt: timestamp("assignment_completed_at"),
  acceptanceStartedAt: timestamp("acceptance_started_at"),
  acceptanceCompletedAt: timestamp("acceptance_completed_at"),
  intakeCompletedAt: timestamp("intake_completed_at"),
  firstSessionAt: timestamp("first_session_at"),
  lastSessionAt: timestamp("last_session_at"),
  dischargedAt: timestamp("discharged_at"),

  // NEW: Additional workflow tracking
  documentsReceivedAt: timestamp("documents_received_at"),
  insuranceVerifiedAt: timestamp("insurance_verified_at"),
  matchingAttempts: integer("matching_attempts").default(0),
  declineReason: text("decline_reason"),
  dischargeReason: text("discharge_reason"),

  // Timestamps (legacy)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  assignedAt: timestamp("assigned_at"),
  exportedAt: timestamp("exported_at"),
  completedAt: timestamp("completed_at"),

  // Audit Trail
  createdBy: varchar("created_by").references(() => users.id),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContactSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  preferredContact: z.enum(["email", "phone"], {
    required_error: "Please select a preferred contact method",
  }),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const insertNewsletterSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
});

export const insertIntegrationSettingSchema = createInsertSchema(integrationSettings).omit({
  id: true,
  updatedAt: true,
}).extend({
  dataType: z.enum(["contact_form", "newsletter"], {
    required_error: "Data type is required",
  }),
  provider: z.enum(["standalone", "emrm", "simplysafe", "generic_webhook"], {
    required_error: "Provider is required",
  }),
  config: z.string(),
  enabled: z.enum(["true", "false"]).default("true"),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  assignedAt: true,
  exportedAt: true,
  completedAt: true,
  createdBy: true,
  lastModifiedBy: true,
  lastModifiedAt: true,
  preStageStartedAt: true,
  preStageCompletedAt: true,
  stageStartedAt: true,
  stageCompletedAt: true,
  assignmentStartedAt: true,
  assignmentCompletedAt: true,
  acceptanceStartedAt: true,
  acceptanceCompletedAt: true,
  intakeCompletedAt: true,
  firstSessionAt: true,
  lastSessionAt: true,
  dischargedAt: true,
  documentsReceivedAt: true,
  insuranceVerifiedAt: true,
}).extend({
  clientName: z.string().min(2, "Client name must be at least 2 characters"),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientPhone: z.string().optional(),
  clientAge: z.number().int().positive().max(150, "Age must be less than 150").optional(),
  presentingConcerns: z.string().min(10, "Please provide at least 10 characters describing concerns"),
  urgency: z.enum(["routine", "urgent", "emergency"], {
    required_error: "Please select urgency level",
  }),
  insuranceProvider: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  referralSource: z.string().optional(),
  referralNotes: z.string().optional(),

  // NEW: Dual-layer workflow tracking
  clientState: z.enum(["prospective", "pending", "active", "inactive"]).default("prospective"),
  workflowStatus: z.enum([
    // Pre-Staging statuses
    "referral_submitted", "documents_requested", "documents_received", "insurance_verification_pending",
    "insurance_verified", "insurance_verification_failed", "pre_stage_review",
    // Staging statuses
    "ready_for_assignment", "matching_in_progress", "therapist_identified",
    // Assignment statuses
    "assignment_pending", "assignment_offered", "assignment_accepted", "assignment_declined",
    // Acceptance statuses
    "client_contacted", "intake_scheduled", "intake_completed", "waiting_first_session",
    // Active treatment statuses
    "in_treatment", "treatment_on_hold", "treatment_resumed",
    // Completion statuses
    "discharge_pending", "discharged", "referred_out", "declined", "cancelled"
  ]).default("referral_submitted"),

  // DEPRECATED: Legacy status field (kept for backward compatibility)
  status: z.enum([
    "pending", "under_review", "assigned", "contacted",
    "scheduled", "in_progress", "exported", "completed",
    "declined", "cancelled"
  ]).default("pending"),

  assignedTherapist: z.string().optional(),
  assignedSupervisor: z.string().optional(),
  assignmentNotes: z.string().optional(),

  // NEW: Additional workflow tracking
  matchingAttempts: z.number().int().min(0).default(0).optional(),
  declineReason: z.string().optional(),
  dischargeReason: z.string().optional(),
});

export const updateReferralSchema = insertReferralSchema.partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type IntegrationSetting = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSetting = z.infer<typeof insertIntegrationSettingSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type UpdateReferral = z.infer<typeof updateReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// ============================================================================
// MindFit v2 Schema Exports - Admin Users
// ============================================================================
export {
  adminUsers,
  type AdminUser,
  type InsertAdminUser,
  loginSchema,
} from "../schema/admin_users";
