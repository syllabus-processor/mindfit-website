import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, serial, boolean, time, date, jsonb, index } from "drizzle-orm/pg-core";
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
// MindFit Phase 4 - Scheduling System Tables
// ============================================================================

export const therapists = pgTable("therapists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  specialties: text("specialties").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  capacity: integer("capacity").default(1),
  isVirtual: boolean("is_virtual").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  therapistId: integer("therapist_id").references(() => therapists.id, { onDelete: "set null" }),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 50 }).default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const availabilityTemplates = pgTable("availability_templates", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").references(() => therapists.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const availabilityExceptions = pgTable("availability_exceptions", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").references(() => therapists.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  exceptionType: varchar("exception_type", { length: 50 }).notNull(), // 'vacation', 'sick', 'override', 'meeting'
  isAvailable: boolean("is_available").default(false),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  therapistId: integer("therapist_id").references(() => therapists.id, { onDelete: "set null" }),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  eventType: varchar("event_type", { length: 50 }).default("admin"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id"),
  notificationType: varchar("notification_type", { length: 50 }).notNull(), // 'booking_confirmation', 'reminder', 'cancel', 'reschedule'
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'sent', 'failed'
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  recipientPhone: varchar("recipient_phone", { length: 20 }),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// Phase 4 Insert/Update Schemas
// ============================================================================

export const insertTherapistSchema = createInsertSchema(therapists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Therapist name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Room name must be at least 2 characters"),
  location: z.string().optional(),
  capacity: z.number().int().positive().default(1).optional(),
  isVirtual: z.boolean().default(false).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  clientId: z.number().int().optional(),
  therapistId: z.number().int().optional(),
  roomId: z.number().int().optional(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: z.enum(["scheduled", "confirmed", "cancelled", "completed", "no_show"]).default("scheduled").optional(),
  notes: z.string().optional(),
});

export const insertAvailabilityTemplateSchema = createInsertSchema(availabilityTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  therapistId: z.number().int(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  therapistId: z.number().int(),
  date: z.string().or(z.date()),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  exceptionType: z.enum(["vacation", "sick", "override", "meeting"]),
  isAvailable: z.boolean().default(false).optional(),
  reason: z.string().optional(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  therapistId: z.number().int().optional(),
  roomId: z.number().int().optional(),
  title: z.string().min(2, "Event title must be at least 2 characters"),
  description: z.string().optional(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  eventType: z.string().default("admin").optional(),
  maxParticipants: z.number().int().positive().optional(),
  currentParticipants: z.number().int().min(0).default(0).optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
}).extend({
  appointmentId: z.number().int().optional(),
  notificationType: z.enum(["booking_confirmation", "reminder", "cancel", "reschedule"]),
  status: z.enum(["pending", "sent", "failed"]).default("pending").optional(),
  scheduledFor: z.string().or(z.date()),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  payload: z.any().optional(),
});

export const updateTherapistSchema = insertTherapistSchema.partial();
export const updateRoomSchema = insertRoomSchema.partial();
export const updateAppointmentSchema = insertAppointmentSchema.partial();
export const updateAvailabilityTemplateSchema = insertAvailabilityTemplateSchema.partial();
export const updateAvailabilityExceptionSchema = insertAvailabilityExceptionSchema.partial();
export const updateCalendarEventSchema = insertCalendarEventSchema.partial();
export const updateNotificationSchema = insertNotificationSchema.partial();

// ============================================================================
// Phase 4 Type Exports
// ============================================================================

export type Therapist = typeof therapists.$inferSelect;
export type InsertTherapist = z.infer<typeof insertTherapistSchema>;
export type UpdateTherapist = z.infer<typeof updateTherapistSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type UpdateRoom = z.infer<typeof updateRoomSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;

export type AvailabilityTemplate = typeof availabilityTemplates.$inferSelect;
export type InsertAvailabilityTemplate = z.infer<typeof insertAvailabilityTemplateSchema>;
export type UpdateAvailabilityTemplate = z.infer<typeof updateAvailabilityTemplateSchema>;

export type AvailabilityException = typeof availabilityExceptions.$inferSelect;
export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;
export type UpdateAvailabilityException = z.infer<typeof updateAvailabilityExceptionSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type UpdateCalendarEvent = z.infer<typeof updateCalendarEventSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;

// ============================================================================
// MindFit v2 Schema Exports - Admin Users
// ============================================================================
export {
  adminUsers,
  type AdminUser,
  type InsertAdminUser,
  loginSchema,
} from "../schema/admin_users";
