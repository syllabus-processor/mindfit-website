// MindFit v2 - Referral Routes
// Campaign 1 - Sprint 1: Client referral tracking API
// Classification: TIER-1 | RBAC-protected endpoints

import type { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertReferralSchema, updateReferralSchema } from "../../schema/referrals";
import { fromError } from "zod-validation-error";
import {
  notifyNewReferral,
  notifyTherapistAssignment,
  notifyReferralStatusChange,
} from "../lib/notifications";
import type { WorkflowStatus, ClientState } from "../lib/workflow";

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
 * POST /api/referrals
 * Create new client referral
 *
 * Body: { clientName, clientEmail, presentingConcerns, urgency, ... }
 * Returns: { success: true, referral: {...} }
 */
export async function createReferral(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = insertReferralSchema.parse(req.body);
    const userId = getUserId(req);

    // Create referral in database
    const referral = await storage.createReferral(validatedData, userId);

    // Send notification to supervisors (non-blocking)
    notifyNewReferral(referral).catch((error) => {
      console.error("❌ Failed to send referral notification:", error);
      // Don't fail the request if notification fails
    });

    res.status(201).json({
      success: true,
      message: "Referral created successfully",
      referral,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.error("[CREATE REFERRAL ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to create referral",
    });
  }
}

/**
 * GET /api/referrals
 * List all referrals with optional filters
 *
 * Query params:
 *   - status: filter by legacy status (backward compat)
 *   - clientState: filter by client state (prospective/pending/active/inactive)
 *   - workflowStatus: filter by detailed workflow status
 *   - urgency: filter by urgency (e.g., "urgent", "routine")
 *   - search: search in name, email, concerns
 *
 * Returns: { success: true, referrals: [...] }
 */
export async function getAllReferrals(req: Request, res: Response) {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      clientState: req.query.clientState as string | undefined,
      workflowStatus: req.query.workflowStatus as string | undefined,
      urgency: req.query.urgency as string | undefined,
      search: req.query.search as string | undefined,
    };

    const referrals = await storage.getAllReferrals(filters);

    res.json({
      success: true,
      referrals,
      count: referrals.length,
    });
  } catch (error: any) {
    console.error("[GET REFERRALS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referrals",
    });
  }
}

/**
 * GET /api/referrals/:id
 * Get single referral by ID
 *
 * Returns: { success: true, referral: {...} }
 */
export async function getReferral(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const referral = await storage.getReferral(id);

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    res.json({
      success: true,
      referral,
    });
  } catch (error: any) {
    console.error("[GET REFERRAL ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referral",
    });
  }
}

/**
 * PUT /api/referrals/:id/status
 * Update referral status
 *
 * Body: { status: "assigned" | "under_review" | ... }
 * Returns: { success: true, referral: {...} }
 */
export async function updateReferralStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Get current referral for notification
    const currentReferral = await storage.getReferral(id);
    if (!currentReferral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    const oldStatus = currentReferral.status;
    const userId = getUserId(req);

    // Update status
    const updates: any = { status };

    // Set timestamp based on status
    switch (status) {
      case "under_review":
        updates.reviewedAt = new Date();
        break;
      case "assigned":
        updates.assignedAt = new Date();
        break;
      case "exported":
        updates.exportedAt = new Date();
        break;
      case "completed":
      case "declined":
      case "cancelled":
        updates.completedAt = new Date();
        break;
    }

    const referral = await storage.updateReferral(id, updates, userId);

    // Send status change notification (non-blocking)
    if (oldStatus !== status) {
      notifyReferralStatusChange(referral, oldStatus, status).catch((error) => {
        console.error("❌ Failed to send status change notification:", error);
      });
    }

    res.json({
      success: true,
      message: "Referral status updated",
      referral,
    });
  } catch (error: any) {
    console.error("[UPDATE REFERRAL STATUS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update referral status",
    });
  }
}

/**
 * PUT /api/referrals/:id/assign
 * Assign therapist and/or supervisor to referral
 *
 * Body: {
 *   assignedTherapist?: string,
 *   assignedSupervisor?: string,
 *   assignmentNotes?: string,
 *   therapistEmail?: string // for notification
 * }
 * Returns: { success: true, referral: {...} }
 */
export async function assignReferral(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      assignedTherapist,
      assignedSupervisor,
      assignmentNotes,
      therapistEmail,
    } = req.body;

    if (!assignedTherapist && !assignedSupervisor) {
      return res.status(400).json({
        success: false,
        message: "At least one of assignedTherapist or assignedSupervisor is required",
      });
    }

    const userId = getUserId(req);

    // Update assignment
    const updates: any = {
      assignedAt: new Date(),
      status: "assigned",
    };

    if (assignedTherapist) updates.assignedTherapist = assignedTherapist;
    if (assignedSupervisor) updates.assignedSupervisor = assignedSupervisor;
    if (assignmentNotes) updates.assignmentNotes = assignmentNotes;

    const referral = await storage.updateReferral(id, updates, userId);

    // Send therapist assignment notification (non-blocking)
    if (assignedTherapist && therapistEmail) {
      notifyTherapistAssignment(referral, therapistEmail).catch((error) => {
        console.error("❌ Failed to send therapist assignment notification:", error);
      });
    }

    res.json({
      success: true,
      message: "Referral assigned successfully",
      referral,
    });
  } catch (error: any) {
    console.error("[ASSIGN REFERRAL ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign referral",
    });
  }
}

/**
 * PUT /api/referrals/:id
 * Update referral (general update endpoint)
 *
 * Body: Partial<Referral> (any updatable fields)
 * Returns: { success: true, referral: {...} }
 */
export async function updateReferral(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Validate input
    const validatedData = updateReferralSchema.parse(req.body);
    const userId = getUserId(req);

    const referral = await storage.updateReferral(id, validatedData, userId);

    res.json({
      success: true,
      message: "Referral updated successfully",
      referral,
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
        message: "Referral not found",
      });
    }

    console.error("[UPDATE REFERRAL ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update referral",
    });
  }
}

/**
 * DELETE /api/referrals/:id
 * Delete referral (soft delete or hard delete depending on implementation)
 *
 * Returns: { success: true, message: "Referral deleted" }
 */
export async function deleteReferral(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if referral exists
    const referral = await storage.getReferral(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    // Delete referral
    await storage.deleteReferral(id);

    res.json({
      success: true,
      message: "Referral deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE REFERRAL ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete referral",
    });
  }
}

/**
 * POST /api/referrals/:id/transition
 * Transition referral workflow status (Phase 2 - Workflow System)
 *
 * Body: {
 *   targetStatus: WorkflowStatus (e.g., "documents_received", "intake_completed"),
 *   reason?: string (required for "declined" and "discharged" statuses)
 * }
 * Returns: { success: true, referral: {...} }
 */
export async function transitionReferralWorkflow(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { targetStatus, reason } = req.body;

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: "targetStatus is required",
      });
    }

    // Get current referral
    const currentReferral = await storage.getReferral(id);
    if (!currentReferral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    // Import workflow validation logic
    const { getTransitionMetadata } = await import("../lib/workflow");

    // Get transition metadata and validate
    let metadata;
    try {
      metadata = getTransitionMetadata(
        currentReferral.clientState as ClientState,
        currentReferral.workflowStatus as WorkflowStatus,
        targetStatus as WorkflowStatus,
        reason
      );
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Build updates object
    const updates: any = {
      clientState: metadata.newState,
      workflowStatus: metadata.newStatus,
      ...metadata.timestampUpdates,
    };

    // Handle reason fields
    if (reason) {
      if (metadata.requiresReason === "decline") {
        updates.declineReason = reason;
      } else if (metadata.requiresReason === "discharge") {
        updates.dischargeReason = reason;
      }
    }

    // Handle matching attempts increment
    if (metadata.incrementMatchingAttempts) {
      updates.matchingAttempts = (currentReferral.matchingAttempts || 0) + 1;
    }

    const userId = getUserId(req);

    // Update referral
    const updatedReferral = await storage.updateReferral(id, updates, userId);

    res.json({
      success: true,
      message: `Referral transitioned to ${targetStatus}`,
      referral: updatedReferral,
    });
  } catch (error: any) {
    console.error("[TRANSITION WORKFLOW ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to transition referral workflow",
    });
  }
}

/**
 * GET /api/referrals/by-state/:state
 * Get all referrals in a specific client state (Phase 2 - Workflow System)
 *
 * Params:
 *   - state: "prospective" | "pending" | "active" | "inactive"
 *
 * Returns: { success: true, referrals: [...], count: number }
 */
export async function getReferralsByState(req: Request, res: Response) {
  try {
    const { state } = req.params;

    const validStates = ["prospective", "pending", "active", "inactive"];
    if (!validStates.includes(state)) {
      return res.status(400).json({
        success: false,
        message: `Invalid client state. Must be one of: ${validStates.join(", ")}`,
      });
    }

    const referrals = await storage.getReferralsByState(state);

    res.json({
      success: true,
      referrals,
      count: referrals.length,
    });
  } catch (error: any) {
    console.error("[GET REFERRALS BY STATE ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referrals by state",
    });
  }
}

/**
 * GET /api/referrals/:id/next-statuses
 * Get valid next workflow statuses for a referral (Phase 2 - Helper endpoint)
 *
 * Returns: { success: true, nextStatuses: [...] }
 */
export async function getNextStatuses(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const referral = await storage.getReferral(id);
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    // Import workflow logic
    const { getNextStatuses: getValidNextStatuses } = await import("../lib/workflow");

    const nextStatuses = getValidNextStatuses(referral.workflowStatus as any);

    res.json({
      success: true,
      currentStatus: referral.workflowStatus,
      nextStatuses,
    });
  } catch (error: any) {
    console.error("[GET NEXT STATUSES ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch next statuses",
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register referral routes on Express router
 * All routes require authentication (use requireAuth middleware before calling)
 *
 * @param {Router} router - Express router instance
 */
export function registerReferralRoutes(router: Router): void {
  // Create new referral
  router.post("/api/referrals", createReferral);

  // List all referrals (with filters) - NOTE: Must come BEFORE /api/referrals/:id
  router.get("/api/referrals", getAllReferrals);

  // NEW: Get referrals by client state (Phase 2)
  router.get("/api/referrals/by-state/:state", getReferralsByState);

  // Get single referral - NOTE: Must come AFTER /api/referrals/by-state/:state
  router.get("/api/referrals/:id", getReferral);

  // NEW: Get valid next workflow statuses (Phase 2)
  router.get("/api/referrals/:id/next-statuses", getNextStatuses);

  // NEW: Transition workflow status (Phase 2)
  router.post("/api/referrals/:id/transition", transitionReferralWorkflow);

  // Update referral status (legacy)
  router.put("/api/referrals/:id/status", updateReferralStatus);

  // Assign therapist/supervisor
  router.put("/api/referrals/:id/assign", assignReferral);

  // General update
  router.put("/api/referrals/:id", updateReferral);

  // Delete referral
  router.delete("/api/referrals/:id", deleteReferral);
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * GET /api/referrals/stats
 * Get referral statistics for dashboard
 *
 * Returns: {
 *   success: true,
 *   stats: {
 *     total: number,
 *     byStatus: { [status]: count },
 *     byUrgency: { [urgency]: count },
 *     recentCount: number
 *   }
 * }
 */
export async function getReferralStats(req: Request, res: Response) {
  try {
    const allReferrals = await storage.getAllReferrals();

    // Calculate statistics
    const stats = {
      total: allReferrals.length,
      byStatus: {} as Record<string, number>,
      byUrgency: {} as Record<string, number>,
      recentCount: 0, // Last 7 days
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    allReferrals.forEach((referral) => {
      // Count by status
      stats.byStatus[referral.status] = (stats.byStatus[referral.status] || 0) + 1;

      // Count by urgency
      stats.byUrgency[referral.urgency] = (stats.byUrgency[referral.urgency] || 0) + 1;

      // Count recent referrals
      if (new Date(referral.createdAt) > sevenDaysAgo) {
        stats.recentCount++;
      }
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("[GET REFERRAL STATS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch referral statistics",
    });
  }
}

/**
 * Register statistics route
 * @param {Router} router - Express router instance
 */
export function registerReferralStatsRoute(router: Router): void {
  router.get("/api/referrals/stats", getReferralStats);
}
