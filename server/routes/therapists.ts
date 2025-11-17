// MindFit Phase 4 Group 2 - Therapists API
// Scheduling System - Therapist Management
// Classification: TIER-1 | RBAC-protected endpoints

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertTherapistSchema, updateTherapistSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/therapists
 * Create new therapist
 *
 * Body: { name, email, phone?, specialties?, isActive? }
 * Returns: { success: true, therapist: {...} }
 */
export async function createTherapist(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = insertTherapistSchema.parse(req.body);

    // Create therapist in database
    const therapist = await storage.createTherapist(validatedData);

    res.status(201).json({
      success: true,
      message: "Therapist created successfully",
      therapist,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.error("[CREATE THERAPIST ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to create therapist",
    });
  }
}

/**
 * GET /api/therapists
 * List all therapists with optional filters
 *
 * Query params:
 *   - isActive: filter by active status (true/false)
 *   - specialties: comma-separated list of specialties
 *
 * Returns: { success: true, therapists: [...], count: number }
 */
export async function getAllTherapists(req: Request, res: Response) {
  try {
    const filters: any = {};

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === "true";
    }

    if (req.query.specialties) {
      filters.specialties = (req.query.specialties as string).split(",").map(s => s.trim());
    }

    const therapists = await storage.getAllTherapists(filters);

    res.json({
      success: true,
      therapists,
      count: therapists.length,
    });
  } catch (error: any) {
    console.error("[GET THERAPISTS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch therapists",
    });
  }
}

/**
 * GET /api/therapists/:id
 * Get single therapist by ID
 *
 * Returns: { success: true, therapist: {...} }
 */
export async function getTherapist(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid therapist ID",
      });
    }

    const therapist = await storage.getTherapist(id);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found",
      });
    }

    res.json({
      success: true,
      therapist,
    });
  } catch (error: any) {
    console.error("[GET THERAPIST ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch therapist",
    });
  }
}

/**
 * PATCH /api/therapists/:id
 * Update therapist
 *
 * Body: Partial<Therapist> (any updatable fields)
 * Returns: { success: true, therapist: {...} }
 */
export async function updateTherapist(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid therapist ID",
      });
    }

    // Validate input
    const validatedData = updateTherapistSchema.parse(req.body);

    const therapist = await storage.updateTherapist(id, validatedData);

    res.json({
      success: true,
      message: "Therapist updated successfully",
      therapist,
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
        message: "Therapist not found",
      });
    }

    console.error("[UPDATE THERAPIST ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update therapist",
    });
  }
}

/**
 * DELETE /api/therapists/:id
 * Soft delete therapist (set isActive = false)
 *
 * Returns: { success: true, message: "Therapist deleted" }
 */
export async function deleteTherapist(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid therapist ID",
      });
    }

    // Check if therapist exists
    const therapist = await storage.getTherapist(id);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found",
      });
    }

    // Soft delete
    await storage.deleteTherapist(id);

    res.json({
      success: true,
      message: "Therapist deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE THERAPIST ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete therapist",
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register therapist routes on Express app
 * All routes require authentication (use requireAuth middleware before calling)
 *
 * @param {Express} app - Express app instance
 * @param {Function} requireAuth - Auth middleware function
 */
export function registerTherapistRoutes(app: Express, requireAuth: any): void {
  // Create new therapist
  app.post("/api/therapists", requireAuth, createTherapist);

  // List all therapists (with filters)
  app.get("/api/therapists", requireAuth, getAllTherapists);

  // Get single therapist - NOTE: Must come AFTER /api/therapists
  app.get("/api/therapists/:id", requireAuth, getTherapist);

  // Update therapist
  app.patch("/api/therapists/:id", requireAuth, updateTherapist);

  // Delete therapist (soft delete)
  app.delete("/api/therapists/:id", requireAuth, deleteTherapist);

  console.log("✅ Therapist routes registered (Phase 4 Group 2)");
}
