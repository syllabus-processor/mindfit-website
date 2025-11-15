// MindFit v2 Schema - Events Table
// Campaign 1 - Sprint 3: Events + Flyers Management
// Classification: TIER-1 | Public calendar and community events

import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// EVENTS TABLE
// Purpose: Manage MindFit community events, workshops, and group sessions
// ============================================================================

export const events = pgTable("events", {
  // Primary Identifier
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Event Details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  // workshop, group_session, community_event, webinar, open_house

  // Event Categorization
  category: varchar("category", { length: 100 }),
  // anxiety_support, depression_support, mindfulness, parenting, grief_support, etc.
  tags: text("tags"),
  // JSON array of tags for filtering (e.g., ["teen", "family", "free"])

  // Scheduling
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),

  // Location
  locationType: varchar("location_type", { length: 50 }).notNull().default("in_person"),
  // in_person, virtual, hybrid
  locationName: varchar("location_name", { length: 255 }),
  // "MindFit Main Office", "Zoom", etc.
  locationAddress: text("location_address"),
  locationUrl: text("location_url"),
  // Zoom link, Google Meet, etc.

  // Registration
  requiresRegistration: boolean("requires_registration").notNull().default(false),
  maxAttendees: varchar("max_attendees", { length: 50 }),
  // "unlimited", "20", "50", etc.
  registrationUrl: text("registration_url"),
  registrationDeadline: timestamp("registration_deadline"),

  // Facilitator Information
  facilitator: varchar("facilitator", { length: 255 }),
  facilitatorBio: text("facilitator_bio"),

  // Cost Information
  cost: varchar("cost", { length: 100 }).notNull().default("free"),
  // "free", "$20", "sliding scale", etc.
  costDetails: text("cost_details"),

  // Visibility & Status
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  status: varchar("status", { length: 50 }).notNull().default("scheduled"),
  // scheduled, ongoing, completed, cancelled

  // Media
  imageUrl: text("image_url"),
  // URL to event banner/thumbnail image

  // Recurrence (optional - for repeating events)
  recurrenceRule: text("recurrence_rule"),
  // iCal RRULE format (e.g., "FREQ=WEEKLY;BYDAY=TU;COUNT=8")
  parentEventId: varchar("parent_event_id"),
  // Reference to parent event if this is a recurring instance

  // Calendar Integration
  googleCalendarId: varchar("google_calendar_id", { length: 255 }),
  // ID of event in Google Calendar (for sync)

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Audit Trail
  createdBy: varchar("created_by"),
  lastModifiedBy: varchar("last_modified_by"),
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Base schema without refinements (for partial updates)
const baseEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  lastModifiedBy: true,
}).extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  eventType: z.enum(["workshop", "group_session", "community_event", "webinar", "open_house"]),
  category: z.string().optional(),
  tags: z.string().optional(), // JSON string
  startTime: z.date(),
  endTime: z.date(),
  timezone: z.string().default("America/New_York"),
  locationType: z.enum(["in_person", "virtual", "hybrid"]).default("in_person"),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationUrl: z.string().url("Invalid location URL").optional(),
  requiresRegistration: z.boolean().default(false),
  maxAttendees: z.string().optional(),
  registrationUrl: z.string().url("Invalid registration URL").optional(),
  registrationDeadline: z.date().optional(),
  facilitator: z.string().optional(),
  facilitatorBio: z.string().optional(),
  cost: z.string().default("free"),
  costDetails: z.string().optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).default("scheduled"),
  imageUrl: z.string().url("Invalid image URL").optional(),
  recurrenceRule: z.string().optional(),
  parentEventId: z.string().uuid().optional(),
  googleCalendarId: z.string().optional(),
});

// Insert schema with validation refinements
export const insertEventSchema = baseEventSchema.refine(
  (data) => data.endTime > data.startTime,
  { message: "End time must be after start time", path: ["endTime"] }
);

// Update schema - partial version of base schema
export const updateEventSchema = baseEventSchema.partial();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
