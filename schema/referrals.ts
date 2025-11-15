// MindFit v2 Schema - Referrals Table
// Campaign 1 - Sprint 1: Referral CRM System
// Classification: TIER-1 | No PHI beyond intake pre-staging

import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// REFERRALS TABLE
// Purpose: Track client referrals from intake through assignment
// ============================================================================

export const referrals = pgTable("referrals", {
  // Primary Identifier
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Client Information (Pre-PHI - intake staging only)
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientAge: integer("client_age"),

  // Clinical Information (Pre-PHI)
  presentingConcerns: text("presenting_concerns").notNull(),
  urgency: varchar("urgency", { length: 20 }).notNull(), // routine, urgent, emergency

  // Insurance Information
  insuranceProvider: varchar("insurance_provider", { length: 255 }),
  insuranceMemberId: varchar("insurance_member_id", { length: 100 }),

  // Referral Metadata
  referralSource: varchar("referral_source", { length: 255 }),
  referralNotes: text("referral_notes"),

  // Workflow Status
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  // pending, under_review, assigned, contacted, scheduled, in_progress, exported, completed, declined, cancelled

  // Assignment Tracking
  assignedTherapist: varchar("assigned_therapist", { length: 255 }),
  assignedSupervisor: varchar("assigned_supervisor", { length: 255 }),
  assignmentNotes: text("assignment_notes"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  assignedAt: timestamp("assigned_at"),
  exportedAt: timestamp("exported_at"), // When exported to DO Spaces for EMA handoff
  completedAt: timestamp("completed_at"),

  // Audit Trail (references admin_users table)
  createdBy: varchar("created_by"),
  lastModifiedBy: varchar("last_modified_by"),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

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
  status: z.enum([
    "pending", "under_review", "assigned", "contacted",
    "scheduled", "in_progress", "exported", "completed",
    "declined", "cancelled"
  ]).default("pending"),
  assignedTherapist: z.string().optional(),
  assignedSupervisor: z.string().optional(),
  assignmentNotes: z.string().optional(),
});

export const updateReferralSchema = insertReferralSchema.partial();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type UpdateReferral = z.infer<typeof updateReferralSchema>;
