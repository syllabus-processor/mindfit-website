// MindFit v2 - Flyers Routes
// Campaign 1 - Sprint 3: Marketing flyers and group therapy materials
// Classification: TIER-1 | Public marketing content management

import type { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertFlyerSchema, updateFlyerSchema } from "../../schema/flyers";
import { fromError } from "zod-validation-error";

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
 * POST /api/flyers
 * Create new marketing flyer
 *
 * Body: {
 *   title: string,
 *   description: string,
 *   flyerType: "group_therapy" | "service_announcement" | "workshop" | "community_resource" | "referral_info",
 *   imageUrl: string,
 *   ... (additional optional fields)
 * }
 *
 * Returns: { success: true, flyer: {...} }
 */
export async function createFlyer(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = insertFlyerSchema.parse(req.body);
    const userId = getUserId(req);

    // NOTE: This requires adding flyer storage methods to server/storage.ts
    // const flyer = await storage.createFlyer(validatedData, userId);

    // Mock for development
    const flyer: any = {
      id: crypto.randomUUID(),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      viewCount: "0",
      downloadCount: "0",
    };

    res.status(201).json({
      success: true,
      message: "Flyer created successfully",
      flyer,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.error("[CREATE FLYER ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to create flyer",
    });
  }
}

/**
 * GET /api/flyers
 * List all flyers with optional filters
 *
 * Query params:
 *   - flyerType: filter by type (e.g., "group_therapy", "workshop")
 *   - isPublished: filter published flyers (true/false)
 *   - isFeatured: filter featured flyers (true/false)
 *   - showOnHomepage: filter homepage flyers (true/false)
 *   - search: search in title, description
 *
 * Returns: { success: true, flyers: [...] }
 */
export async function getAllFlyers(req: Request, res: Response) {
  try {
    const filters = {
      flyerType: req.query.flyerType as string | undefined,
      isPublished: req.query.isPublished === "true" ? true : undefined,
      isFeatured: req.query.isFeatured === "true" ? true : undefined,
      showOnHomepage: req.query.showOnHomepage === "true" ? true : undefined,
      search: req.query.search as string | undefined,
    };

    // NOTE: This requires adding flyer storage methods
    // const flyers = await storage.getAllFlyers(filters);

    // Mock for development
    const flyers: any[] = [];

    res.json({
      success: true,
      flyers,
      count: flyers.length,
    });
  } catch (error: any) {
    console.error("[GET FLYERS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flyers",
    });
  }
}

/**
 * GET /api/flyers/:id
 * Get single flyer by ID
 *
 * Returns: { success: true, flyer: {...} }
 */
export async function getFlyer(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // NOTE: This requires adding flyer storage methods
    // const flyer = await storage.getFlyer(id);

    // Mock for development
    const flyer: any = null;

    if (!flyer) {
      return res.status(404).json({
        success: false,
        message: "Flyer not found",
      });
    }

    res.json({
      success: true,
      flyer,
    });
  } catch (error: any) {
    console.error("[GET FLYER ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flyer",
    });
  }
}

/**
 * PUT /api/flyers/:id
 * Update flyer
 *
 * Body: Partial<Flyer> (any updatable fields)
 * Returns: { success: true, flyer: {...} }
 */
export async function updateFlyer(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validate input
    const validatedData = updateFlyerSchema.parse(req.body);
    const userId = getUserId(req);

    // NOTE: This requires adding flyer storage methods
    // const flyer = await storage.updateFlyer(id, validatedData, userId);

    // Mock for development
    const flyer: any = {
      id,
      ...validatedData,
      updatedAt: new Date(),
      lastModifiedBy: userId,
    };

    res.json({
      success: true,
      message: "Flyer updated successfully",
      flyer,
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
        message: "Flyer not found",
      });
    }

    console.error("[UPDATE FLYER ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update flyer",
    });
  }
}

/**
 * PUT /api/flyers/:id/publish
 * Publish or unpublish flyer
 *
 * Body: { isPublished: boolean }
 * Returns: { success: true, flyer: {...} }
 */
export async function toggleFlyerPublish(req: Request, res: Response) {
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

    // NOTE: This requires adding flyer storage methods
    // const flyer = await storage.updateFlyer(id, { isPublished }, userId);

    // Mock for development
    const flyer: any = {
      id,
      isPublished,
      updatedAt: new Date(),
      lastModifiedBy: userId,
    };

    res.json({
      success: true,
      message: isPublished ? "Flyer published" : "Flyer unpublished",
      flyer,
    });
  } catch (error: any) {
    console.error("[TOGGLE FLYER PUBLISH ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle flyer publish status",
    });
  }
}

/**
 * DELETE /api/flyers/:id
 * Delete flyer
 *
 * Returns: { success: true, message: "Flyer deleted" }
 */
export async function deleteFlyer(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if flyer exists
    // const flyer = await storage.getFlyer(id);
    // if (!flyer) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Flyer not found",
    //   });
    // }

    // Delete flyer
    // await storage.deleteFlyer(id);

    res.json({
      success: true,
      message: "Flyer deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE FLYER ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete flyer",
    });
  }
}

/**
 * POST /api/flyers/:id/view
 * Track flyer view (analytics)
 *
 * Returns: { success: true }
 */
export async function trackFlyerView(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Increment view count
    // NOTE: This requires adding flyer storage methods
    // await storage.incrementFlyerViewCount(id);

    res.json({
      success: true,
      message: "View tracked",
    });
  } catch (error: any) {
    // Don't fail if tracking fails (silent failure)
    console.error("[TRACK FLYER VIEW ERROR]", error);
    res.json({
      success: true,
      message: "View tracked (best effort)",
    });
  }
}

/**
 * POST /api/flyers/:id/download
 * Track flyer download (analytics)
 *
 * Returns: { success: true }
 */
export async function trackFlyerDownload(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Increment download count
    // NOTE: This requires adding flyer storage methods
    // await storage.incrementFlyerDownloadCount(id);

    res.json({
      success: true,
      message: "Download tracked",
    });
  } catch (error: any) {
    // Don't fail if tracking fails (silent failure)
    console.error("[TRACK FLYER DOWNLOAD ERROR]", error);
    res.json({
      success: true,
      message: "Download tracked (best effort)",
    });
  }
}

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * GET /api/public/flyers
 * Get published flyers for public gallery
 *
 * Query params:
 *   - flyerType: filter by type
 *   - showOnHomepage: filter homepage flyers (true/false)
 *   - isFeatured: filter featured flyers (true/false)
 *   - limit: max number of flyers (default: 50)
 *
 * Returns: { success: true, flyers: [...] }
 */
export async function getPublicFlyers(req: Request, res: Response) {
  try {
    const flyerType = req.query.flyerType as string | undefined;
    const showOnHomepage = req.query.showOnHomepage === "true" ? true : undefined;
    const isFeatured = req.query.isFeatured === "true" ? true : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    // NOTE: This requires adding flyer storage methods
    // const flyers = await storage.getPublicFlyers({
    //   flyerType,
    //   showOnHomepage,
    //   isFeatured,
    //   limit,
    // });

    // Mock for development
    const flyers: any[] = [];

    res.json({
      success: true,
      flyers,
      count: flyers.length,
    });
  } catch (error: any) {
    console.error("[GET PUBLIC FLYERS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch public flyers",
    });
  }
}

/**
 * GET /api/public/flyers/:id
 * Get single published flyer by ID (public access)
 *
 * Returns: { success: true, flyer: {...} }
 */
export async function getPublicFlyer(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // NOTE: This requires adding flyer storage methods
    // const flyer = await storage.getFlyer(id);

    // Mock for development
    const flyer: any = null;

    if (!flyer) {
      return res.status(404).json({
        success: false,
        message: "Flyer not found",
      });
    }

    // Only return if published and within validity period
    if (!flyer.isPublished) {
      return res.status(404).json({
        success: false,
        message: "Flyer not found",
      });
    }

    // Check validity period
    const now = new Date();
    if (flyer.validFrom && new Date(flyer.validFrom) > now) {
      return res.status(404).json({
        success: false,
        message: "Flyer not yet available",
      });
    }

    if (flyer.validUntil && new Date(flyer.validUntil) < now) {
      return res.status(410).json({
        success: false,
        message: "Flyer has expired",
      });
    }

    // Track view (non-blocking, best effort)
    // storage.incrementFlyerViewCount(id).catch(() => {});

    res.json({
      success: true,
      flyer,
    });
  } catch (error: any) {
    console.error("[GET PUBLIC FLYER ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flyer",
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register flyer routes on Express router
 *
 * @param {Router} router - Express router instance
 * @param {boolean} requiresAuth - Whether to require authentication (default: true)
 */
export function registerFlyerRoutes(router: Router, requiresAuth: boolean = true): void {
  if (requiresAuth) {
    // Protected admin routes
    router.post("/api/flyers", createFlyer);
    router.get("/api/flyers", getAllFlyers);
    router.get("/api/flyers/:id", getFlyer);
    router.put("/api/flyers/:id", updateFlyer);
    router.put("/api/flyers/:id/publish", toggleFlyerPublish);
    router.delete("/api/flyers/:id", deleteFlyer);
  }

  // Public routes (no auth required)
  router.get("/api/public/flyers", getPublicFlyers);
  router.get("/api/public/flyers/:id", getPublicFlyer);
  router.post("/api/public/flyers/:id/view", trackFlyerView);
  router.post("/api/public/flyers/:id/download", trackFlyerDownload);
}

// ============================================================================
// PRODUCTION NOTES
// ============================================================================

/**
 * REQUIRED STORAGE METHODS (add to server/storage.ts):
 *
 * async createFlyer(flyer: InsertFlyer, userId?: string): Promise<Flyer>
 * async getFlyer(id: string): Promise<Flyer | undefined>
 * async getAllFlyers(filters?: {
 *   flyerType?: string;
 *   isPublished?: boolean;
 *   isFeatured?: boolean;
 *   showOnHomepage?: boolean;
 *   search?: string;
 * }): Promise<Flyer[]>
 * async getPublicFlyers(filters?: {
 *   flyerType?: string;
 *   showOnHomepage?: boolean;
 *   isFeatured?: boolean;
 *   limit?: number;
 * }): Promise<Flyer[]>
 * async updateFlyer(id: string, updates: UpdateFlyer, userId?: string): Promise<Flyer>
 * async deleteFlyer(id: string): Promise<void>
 * async incrementFlyerViewCount(id: string): Promise<void>
 * async incrementFlyerDownloadCount(id: string): Promise<void>
 *
 * FEATURES TO IMPLEMENT:
 *
 * 1. Image Upload:
 *    - Direct upload to DO Spaces for flyer images
 *    - Automatic thumbnail generation
 *    - Image optimization (compression, resizing)
 *    - CDN integration for fast delivery
 *
 * 2. PDF Generation:
 *    - Auto-generate PDF from flyer metadata
 *    - Custom templates for different flyer types
 *    - Downloadable marketing materials
 *
 * 3. Accessibility:
 *    - Automatic alt text generation (AI-powered)
 *    - Screen reader compatibility testing
 *    - WCAG 2.1 AA compliance checking
 *
 * 4. Analytics Dashboard:
 *    - View/download metrics by flyer type
 *    - Geographic distribution of views
 *    - Conversion tracking (flyer view → event registration)
 *    - A/B testing for different flyer designs
 *
 * 5. Expiration Management:
 *    - Automatic unpublish on validUntil date
 *    - Email reminders to update expired flyers
 *    - Archive system for historical flyers
 *
 * 6. Related Content:
 *    - Link flyers to events (already in schema)
 *    - Link flyers to services (already in schema)
 *    - Automatic related content suggestions
 *
 * ACCESSIBILITY REQUIREMENTS:
 *
 * ✅ Alt text required for all images (validated in schema)
 * ✅ Accessibility notes field for additional context
 * ⚠️  TODO: Implement alt text length validation (min 10 chars)
 * ⚠️  TODO: Add ARIA labels to frontend components
 * ⚠️  TODO: Ensure keyboard navigation support
 * ⚠️  TODO: Color contrast checking for flyer designs
 */
