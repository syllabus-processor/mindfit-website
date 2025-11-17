// MindFit Phase 4 Group 2 - Appointments API
// Scheduling System - Appointment Management with Conflict Detection
// Classification: TIER-1 | RBAC-protected endpoints

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertAppointmentSchema, updateAppointmentSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/appointments
 * Create new appointment with conflict checking
 *
 * Body: { clientId?, therapistId?, roomId?, startTime, endTime, status?, notes? }
 * Returns: { success: true, appointment: {...} }
 */
export async function createAppointment(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = insertAppointmentSchema.parse(req.body);

    // Check for scheduling conflicts
    const conflictCheck = await storage.checkAppointmentConflicts(
      validatedData.therapistId || null,
      validatedData.roomId || null,
      new Date(validatedData.startTime),
      new Date(validatedData.endTime)
    );

    if (conflictCheck.hasConflict) {
      return res.status(409).json({
        success: false,
        message: "Scheduling conflict detected",
        conflicts: conflictCheck.conflicts.map(apt => ({
          id: apt.id,
          startTime: apt.startTime,
          endTime: apt.endTime,
          therapistId: apt.therapistId,
          roomId: apt.roomId,
        })),
      });
    }

    // Create appointment in database
    const appointment = await storage.createAppointment(validatedData);

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      appointment,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.error("[CREATE APPOINTMENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to create appointment",
    });
  }
}

/**
 * GET /api/appointments
 * List all appointments with optional filters
 *
 * Query params:
 *   - startDate: filter by start date (ISO 8601)
 *   - endDate: filter by end date (ISO 8601)
 *   - therapistId: filter by therapist ID
 *   - clientId: filter by client ID
 *   - status: filter by status (scheduled, completed, cancelled, etc.)
 *
 * Returns: { success: true, appointments: [...], count: number }
 */
export async function getAllAppointments(req: Request, res: Response) {
  try {
    const filters: any = {};

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    if (req.query.therapistId) {
      filters.therapistId = parseInt(req.query.therapistId as string, 10);
    }

    if (req.query.clientId) {
      filters.clientId = parseInt(req.query.clientId as string, 10);
    }

    if (req.query.status) {
      filters.status = req.query.status as string;
    }

    const appointments = await storage.getAllAppointments(filters);

    res.json({
      success: true,
      appointments,
      count: appointments.length,
    });
  } catch (error: any) {
    console.error("[GET APPOINTMENTS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
    });
  }
}

/**
 * GET /api/appointments/:id
 * Get single appointment by ID
 *
 * Returns: { success: true, appointment: {...} }
 */
export async function getAppointment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const appointment = await storage.getAppointment(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      appointment,
    });
  } catch (error: any) {
    console.error("[GET APPOINTMENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch appointment",
    });
  }
}

/**
 * PATCH /api/appointments/:id
 * Update appointment with conflict checking
 *
 * Body: Partial<Appointment> (any updatable fields)
 * Returns: { success: true, appointment: {...} }
 */
export async function updateAppointment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Validate input
    const validatedData = updateAppointmentSchema.parse(req.body);

    // Get current appointment to check what's changing
    const currentAppointment = await storage.getAppointment(id);
    if (!currentAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check for conflicts if time or resources are being changed
    const timeChanged = validatedData.startTime || validatedData.endTime;
    const resourceChanged = validatedData.therapistId !== undefined || validatedData.roomId !== undefined;

    if (timeChanged || resourceChanged) {
      const therapistId = validatedData.therapistId !== undefined
        ? validatedData.therapistId
        : currentAppointment.therapistId;
      const roomId = validatedData.roomId !== undefined
        ? validatedData.roomId
        : currentAppointment.roomId;
      const startTime = validatedData.startTime
        ? new Date(validatedData.startTime)
        : new Date(currentAppointment.startTime);
      const endTime = validatedData.endTime
        ? new Date(validatedData.endTime)
        : new Date(currentAppointment.endTime);

      const conflictCheck = await storage.checkAppointmentConflicts(
        therapistId,
        roomId,
        startTime,
        endTime,
        id // Exclude current appointment from conflict check
      );

      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          message: "Scheduling conflict detected",
          conflicts: conflictCheck.conflicts.map(apt => ({
            id: apt.id,
            startTime: apt.startTime,
            endTime: apt.endTime,
            therapistId: apt.therapistId,
            roomId: apt.roomId,
          })),
        });
      }
    }

    const appointment = await storage.updateAppointment(id, validatedData);

    res.json({
      success: true,
      message: "Appointment updated successfully",
      appointment,
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
        message: "Appointment not found",
      });
    }

    console.error("[UPDATE APPOINTMENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update appointment",
    });
  }
}

/**
 * DELETE /api/appointments/:id
 * Cancel appointment (set status = 'cancelled')
 *
 * Returns: { success: true, message: "Appointment cancelled" }
 */
export async function deleteAppointment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Check if appointment exists
    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Soft delete (set status to cancelled)
    await storage.deleteAppointment(id);

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error: any) {
    console.error("[DELETE APPOINTMENT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
}

/**
 * GET /api/appointments/conflicts
 * Check for scheduling conflicts
 *
 * Query params:
 *   - therapistId: therapist ID (optional)
 *   - roomId: room ID (optional)
 *   - startTime: start time (ISO 8601, required)
 *   - endTime: end time (ISO 8601, required)
 *   - excludeAppointmentId: appointment ID to exclude (optional)
 *
 * Returns: { success: true, hasConflict: boolean, conflicts: [...] }
 */
export async function checkConflicts(req: Request, res: Response) {
  try {
    const { therapistId, roomId, startTime, endTime, excludeAppointmentId } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime are required",
      });
    }

    const result = await storage.checkAppointmentConflicts(
      therapistId ? parseInt(therapistId as string, 10) : null,
      roomId ? parseInt(roomId as string, 10) : null,
      new Date(startTime as string),
      new Date(endTime as string),
      excludeAppointmentId ? parseInt(excludeAppointmentId as string, 10) : undefined
    );

    res.json({
      success: true,
      hasConflict: result.hasConflict,
      conflicts: result.conflicts.map(apt => ({
        id: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        therapistId: apt.therapistId,
        roomId: apt.roomId,
        status: apt.status,
      })),
      count: result.conflicts.length,
    });
  } catch (error: any) {
    console.error("[CHECK CONFLICTS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to check for conflicts",
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register appointment routes on Express app
 * All routes require authentication (use requireAuth middleware before calling)
 *
 * @param {Express} app - Express app instance
 * @param {Function} requireAuth - Auth middleware function
 */
export function registerAppointmentRoutes(app: Express, requireAuth: any): void {
  // Create new appointment with conflict checking
  app.post("/api/appointments", requireAuth, createAppointment);

  // List all appointments (with filters)
  app.get("/api/appointments", requireAuth, getAllAppointments);

  // Check for scheduling conflicts - NOTE: Must come BEFORE /api/appointments/:id
  app.get("/api/appointments/conflicts", requireAuth, checkConflicts);

  // Get single appointment - NOTE: Must come AFTER /api/appointments/conflicts
  app.get("/api/appointments/:id", requireAuth, getAppointment);

  // Update appointment with conflict checking
  app.patch("/api/appointments/:id", requireAuth, updateAppointment);

  // Cancel appointment (soft delete)
  app.delete("/api/appointments/:id", requireAuth, deleteAppointment);

  console.log("✅ Appointment routes registered (Phase 4 Group 2)");
}
