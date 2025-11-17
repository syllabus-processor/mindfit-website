// MindFit Phase 4 Group 2 - Rooms API
// Scheduling System - Room Management
// Classification: TIER-1 | RBAC-protected endpoints

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertRoomSchema, updateRoomSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/rooms
 * Create new room
 *
 * Body: { name, location?, capacity?, isVirtual?, isActive? }
 * Returns: { success: true, room: {...} }
 */
export async function createRoom(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = insertRoomSchema.parse(req.body);

    // Create room in database
    const room = await storage.createRoom(validatedData);

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      const validationError = fromError(error);
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    console.error("[CREATE ROOM ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
}

/**
 * GET /api/rooms
 * List all rooms with optional filters
 *
 * Query params:
 *   - isActive: filter by active status (true/false)
 *   - isVirtual: filter by virtual/physical (true/false)
 *
 * Returns: { success: true, rooms: [...], count: number }
 */
export async function getAllRooms(req: Request, res: Response) {
  try {
    const filters: any = {};

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === "true";
    }

    if (req.query.isVirtual !== undefined) {
      filters.isVirtual = req.query.isVirtual === "true";
    }

    const rooms = await storage.getAllRooms(filters);

    res.json({
      success: true,
      rooms,
      count: rooms.length,
    });
  } catch (error: any) {
    console.error("[GET ROOMS ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
}

/**
 * GET /api/rooms/:id
 * Get single room by ID
 *
 * Returns: { success: true, room: {...} }
 */
export async function getRoom(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    const room = await storage.getRoom(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.json({
      success: true,
      room,
    });
  } catch (error: any) {
    console.error("[GET ROOM ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room",
    });
  }
}

/**
 * PATCH /api/rooms/:id
 * Update room
 *
 * Body: Partial<Room> (any updatable fields)
 * Returns: { success: true, room: {...} }
 */
export async function updateRoom(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    // Validate input
    const validatedData = updateRoomSchema.parse(req.body);

    const room = await storage.updateRoom(id, validatedData);

    res.json({
      success: true,
      message: "Room updated successfully",
      room,
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
        message: "Room not found",
      });
    }

    console.error("[UPDATE ROOM ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update room",
    });
  }
}

/**
 * DELETE /api/rooms/:id
 * Soft delete room (set isActive = false)
 *
 * Returns: { success: true, message: "Room deleted" }
 */
export async function deleteRoom(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    // Check if room exists
    const room = await storage.getRoom(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Soft delete
    await storage.deleteRoom(id);

    res.json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error: any) {
    console.error("[DELETE ROOM ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete room",
    });
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

/**
 * Register room routes on Express app
 * All routes require authentication (use requireAuth middleware before calling)
 *
 * @param {Express} app - Express app instance
 * @param {Function} requireAuth - Auth middleware function
 */
export function registerRoomRoutes(app: Express, requireAuth: any): void {
  // Create new room
  app.post("/api/rooms", requireAuth, createRoom);

  // List all rooms (with filters)
  app.get("/api/rooms", requireAuth, getAllRooms);

  // Get single room - NOTE: Must come AFTER /api/rooms
  app.get("/api/rooms/:id", requireAuth, getRoom);

  // Update room
  app.patch("/api/rooms/:id", requireAuth, updateRoom);

  // Delete room (soft delete)
  app.delete("/api/rooms/:id", requireAuth, deleteRoom);

  console.log("✅ Room routes registered (Phase 4 Group 2)");
}
