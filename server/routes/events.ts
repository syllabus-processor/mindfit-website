// MindFit v2 - Events Routes
// Campaign 1 - Sprint 3: Community events calendar management
// Classification: TIER-1 | Public calendar system

import type { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertEventSchema, updateEventSchema } from "../../schema/events";
import { fromError } from "zod-validation-error";
import { notifyNewEventPublished } from "../lib/notifications";
import { generateICS, generateICSFilename, validateEventForICS } from "../lib/ics-generator";

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Extract user ID from session for audit trail
 */
function getUserId(req: Request): string | undefined {
  return req.session?.userId;
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/events
 * Create new community event
 *
 * Body: {
 *   title: string,
 *   description: string,
 *   eventType: "workshop" | "group_session" | "community_event" | "webinar" | "open_house",
 *   startTime: Date,
 *   endTime: Date,
 *   locationType: "in_person" | "virtual" | "hybrid",
 *   ... (additional optional fields)
 * }
 *
 * Returns: { success: true, event: {...} }
 */
export async function createEvent(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = insertEventSchema.parse(req.body);
    const userId = getUserId(req);

    // NOTE: This requires adding event storage methods to server/storage.ts
    // const event = await storage.createEvent(validatedData, userId);

    // Mock for development
    const event: any = {
      id: crypto.randomUUID(),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };

    // Send notification if event is published (non-blocking)
    if (event.isPublished) {
      notifyNewEventPublished(event).catch((error) => {
        console.error("❌ Failed to send event notification:", error);
      });
    }

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.error("[CREATE EVENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
}

/**
 * GET /api/events
 * List all events with optional filters
 *
 * Query params:
 *   - status: filter by status (e.g., "scheduled", "completed")
 *   - eventType: filter by type (e.g., "workshop", "group_session")
 *   - isPublished: filter published events (true/false)
 *   - upcoming: filter upcoming events only (true/false)
 *   - search: search in title, description
 *
 * Returns: { success: true, events: [...] }
 */
export async function getAllEvents(req: Request, res: Response) {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      eventType: req.query.eventType as string | undefined,
      isPublished: req.query.isPublished === "true" ? true : undefined,
      upcoming: req.query.upcoming === "true" ? true : undefined,
      search: req.query.search as string | undefined,
    };

    // NOTE: This requires adding event storage methods
    // const events = await storage.getAllEvents(filters);

    // Mock for development
    const events: any[] = [];

    res.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error: any) {
    console.error("[GET EVENTS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
}

/**
 * GET /api/events/:id
 * Get single event by ID
 *
 * Returns: { success: true, event: {...} }
 */
export async function getEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // NOTE: This requires adding event storage methods
    // const event = await storage.getEvent(id);

    // Mock for development
    const event: any = null;

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error("[GET EVENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    });
  }
}

/**
 * PUT /api/events/:id
 * Update event
 *
 * Body: Partial<Event> (any updatable fields)
 * Returns: { success: true, event: {...} }
 */
export async function updateEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validate input
    const validatedData = updateEventSchema.parse(req.body);
    const userId = getUserId(req);

    // NOTE: This requires adding event storage methods
    // const event = await storage.updateEvent(id, validatedData, userId);

    // Mock for development
    const event: any = {
      id,
      ...validatedData,
      updatedAt: new Date(),
      lastModifiedBy: userId,
    };

    res.json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    console.error("[UPDATE EVENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
}

/**
 * PUT /api/events/:id/publish
 * Publish or unpublish event
 *
 * Body: { isPublished: boolean }
 * Returns: { success: true, event: {...} }
 */
export async function toggleEventPublish(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (typeof isPublished !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isPublished must be a boolean",
      });
    }

    const userId = getUserId(req);

    // NOTE: This requires adding event storage methods
    // const event = await storage.updateEvent(id, { isPublished }, userId);

    // Mock for development
    const event: any = {
      id,
      isPublished,
      updatedAt: new Date(),
      lastModifiedBy: userId,
    };

    // Send notification if publishing for first time (non-blocking)
    if (isPublished) {
      notifyNewEventPublished(event).catch((error) => {
        console.error("❌ Failed to send event publish notification:", error);
      });
    }

    res.json({
      success: true,
      message: isPublished ? "Event published" : "Event unpublished",
      event,
    });
  } catch (error: any) {
    console.error("[TOGGLE EVENT PUBLISH ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle event publish status",
    });
  }
}

/**
 * DELETE /api/events/:id
 * Delete event
 *
 * Returns: { success: true, message: "Event deleted" }
 */
export async function deleteEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if event exists
    // const event = await storage.getEvent(id);
    // if (!event) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Event not found",
    //   });
    // }

    // Delete event
    // await storage.deleteEvent(id);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE EVENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
}

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * GET /api/public/events
 * Get published upcoming events for public calendar
 *
 * Query params:
 *   - eventType: filter by type
 *   - limit: max number of events (default: 50)
 *
 * Returns: { success: true, events: [...] }
 */
export async function getPublicEvents(req: Request, res: Response) {
  try {
    const eventType = req.query.eventType as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // NOTE: This requires adding event storage methods
    // const events = await storage.getPublicEvents({ eventType, limit });

    // Mock for development
    const events: any[] = [];

    res.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error: any) {
    console.error("[GET PUBLIC EVENTS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch public events",
    });
  }
}

/**
 * GET /api/public/events/:id
 * Get single published event by ID (public access)
 *
 * Returns: { success: true, event: {...} }
 */
export async function getPublicEvent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // NOTE: This requires adding event storage methods
    // const event = await storage.getEvent(id);

    // Mock for development
    const event: any = null;

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Only return if published
    if (!event.isPublished) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error("[GET PUBLIC EVENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    });
  }
}

/**
 * GET /api/events/:id/ics
 * Download event as ICS calendar file
 *
 * Public access - allows calendar integration
 * Returns: ICS file (text/calendar)
 */
export async function downloadEventICS(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Fetch event from storage
    // NOTE: This requires adding event storage methods
    // const event = await storage.getEvent(id);

    // Mock for development
    const event: any = null;

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Only allow download of published events
    if (!event.isPublished) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Validate event has required fields for ICS generation
    try {
      validateEventForICS(event);
    } catch (validationError: any) {
      console.error("[ICS VALIDATION ERROR]", validationError);
      return res.status(400).json({
        success: false,
        message: "Event data is incomplete for calendar export",
      });
    }

    // Generate ICS content
    const icsContent = generateICS(event);
    const filename = generateICSFilename(event.title);

    // Set appropriate headers for ICS file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(icsContent));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Send ICS file
    res.send(icsContent);
  } catch (error: any) {
    console.error("[DOWNLOAD ICS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate calendar file",
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register event routes on Express router
 *
 * @param {Router} router - Express router instance
 * @param {boolean} requiresAuth - Whether to require authentication (default: true)
 */
export function registerEventRoutes(router: Router, requiresAuth: boolean = true): void {
  if (requiresAuth) {
    // Protected admin routes
    router.post("/api/events", createEvent);
    router.get("/api/events", getAllEvents);
    router.get("/api/events/:id", getEvent);
    router.put("/api/events/:id", updateEvent);
    router.put("/api/events/:id/publish", toggleEventPublish);
    router.delete("/api/events/:id", deleteEvent);
  }

  // Public routes (no auth required)
  router.get("/api/events/public", getPublicEvents);
  router.get("/api/events/:id/ics", downloadEventICS);
  router.get("/api/public/events/:id", getPublicEvent);
}

// ============================================================================
// PRODUCTION NOTES
// ============================================================================

/**
 * REQUIRED STORAGE METHODS (add to server/storage.ts):
 *
 * async createEvent(event: InsertEvent, userId?: string): Promise<Event>
 * async getEvent(id: string): Promise<Event | undefined>
 * async getAllEvents(filters?: {
 *   status?: string;
 *   eventType?: string;
 *   isPublished?: boolean;
 *   upcoming?: boolean;
 *   search?: string;
 * }): Promise<Event[]>
 * async getPublicEvents(filters?: {
 *   eventType?: string;
 *   limit?: number;
 * }): Promise<Event[]>
 * async updateEvent(id: string, updates: UpdateEvent, userId?: string): Promise<Event>
 * async deleteEvent(id: string): Promise<void>
 *
 * FEATURES TO IMPLEMENT:
 *
 * 1. Recurrence Support:
 *    - Parse iCal RRULE format for repeating events
 *    - Generate event instances from recurrence rules
 *    - Link instances to parent event
 *
 * 2. Google Calendar Integration:
 *    - OAuth 2.0 flow for calendar access
 *    - Sync events bidirectionally
 *    - Handle calendar webhooks for updates
 *
 * 3. Registration Management:
 *    - Track registrations if requiresRegistration = true
 *    - Send confirmation emails
 *    - Manage waitlist if maxAttendees reached
 *
 * 4. Reminders:
 *    - Email reminders 24 hours before event
 *    - SMS reminders (if Twilio integrated)
 *    - In-app notifications
 *
 * 5. Analytics:
 *    - Track event views
 *    - Registration conversion rate
 *    - Attendance tracking (check-in system)
 */
