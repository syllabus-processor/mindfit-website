// MindFit v2 Schema - Flyers Table
// Campaign 1 - Sprint 3: Events + Flyers Management
// Classification: TIER-1 | Marketing materials and group therapy flyers

import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// FLYERS TABLE
// Purpose: Manage marketing flyers for groups, services, and community outreach
// ============================================================================

export const flyers = pgTable("flyers", {
  // Primary Identifier
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Flyer Details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  flyerType: varchar("flyer_type", { length: 50 }).notNull(),
  // group_therapy, service_announcement, workshop, community_resource, referral_info

  // Categorization
  category: varchar("category", { length: 100 }),
  // support_groups, therapy_services, workshops, resources, events
  tags: text("tags"),
  // JSON array of tags (e.g., ["teen", "anxiety", "free"])

  // Content
  subtitle: varchar("subtitle", { length: 255 }),
  bodyText: text("body_text"),
  // Full text content for accessibility
  callToAction: varchar("call_to_action", { length: 255 }),
  // "Register Now", "Learn More", "Contact Us"
  callToActionUrl: text("call_to_action_url"),

  // Media Assets
  imageUrl: text("image_url").notNull(),
  // URL to flyer image (hosted on DO Spaces or similar)
  pdfUrl: text("pdf_url"),
  // URL to downloadable PDF version
  thumbnailUrl: text("thumbnail_url"),
  // Small thumbnail for gallery view

  // Related Entity (optional)
  relatedEventId: varchar("related_event_id"),
  // Link to events table if flyer promotes an event
  relatedServiceId: varchar("related_service_id"),
  // Link to services if applicable

  // Display Settings
  isPublished: boolean("is_published").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: varchar("display_order", { length: 50 }).default("0"),
  // For controlling sort order in gallery

  // Visibility Control
  showOnHomepage: boolean("show_on_homepage").notNull().default(false),
  showInGallery: boolean("show_in_gallery").notNull().default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  // Automatic expiration for time-sensitive flyers

  // Contact Information
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),

  // Accessibility
  altText: text("alt_text"),
  // Image alt text for screen readers
  accessibilityNotes: text("accessibility_notes"),
  // Additional accessibility information

  // Analytics (optional future enhancement)
  viewCount: varchar("view_count", { length: 50 }).default("0"),
  downloadCount: varchar("download_count", { length: 50 }).default("0"),

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

export const insertFlyerSchema = createInsertSchema(flyers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  lastModifiedBy: true,
  viewCount: true,
  downloadCount: true,
}).extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  flyerType: z.enum(["group_therapy", "service_announcement", "workshop", "community_resource", "referral_info"]),
  category: z.string().optional(),
  tags: z.string().optional(), // JSON string
  subtitle: z.string().optional(),
  bodyText: z.string().optional(),
  callToAction: z.string().optional(),
  callToActionUrl: z.string().url("Invalid call to action URL").optional(),
  imageUrl: z.string().url("Invalid image URL"),
  pdfUrl: z.string().url("Invalid PDF URL").optional(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
  relatedEventId: z.string().uuid().optional(),
  relatedServiceId: z.string().optional(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  displayOrder: z.string().default("0"),
  showOnHomepage: z.boolean().default(false),
  showInGallery: z.boolean().default(true),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Invalid contact email").optional(),
  contactPhone: z.string().optional(),
  altText: z.string().min(10, "Alt text must be at least 10 characters for accessibility").optional(),
  accessibilityNotes: z.string().optional(),
}).refine(
  (data) => !data.validUntil || !data.validFrom || data.validUntil > data.validFrom,
  { message: "Valid until date must be after valid from date", path: ["validUntil"] }
);

export const updateFlyerSchema = insertFlyerSchema.partial();

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Flyer = typeof flyers.$inferSelect;
export type InsertFlyer = z.infer<typeof insertFlyerSchema>;
export type UpdateFlyer = z.infer<typeof updateFlyerSchema>;
