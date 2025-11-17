// Database storage implementation using PostgreSQL
// Referenced from blueprint:javascript_database
import {
  type User,
  type InsertUser,
  type ContactSubmission,
  type InsertContact,
  type NewsletterSubscriber,
  type InsertNewsletter,
  type IntegrationSetting,
  type InsertIntegrationSetting,
  type Referral,
  type InsertReferral,
  type UpdateReferral,
  type AdminUser,
  type Therapist,
  type InsertTherapist,
  type UpdateTherapist,
  type Room,
  type InsertRoom,
  type UpdateRoom,
  type Appointment,
  type InsertAppointment,
  type UpdateAppointment,
  users,
  contactSubmissions,
  newsletterSubscribers,
  integrationSettings,
  referrals,
  adminUsers,
  therapists,
  rooms,
  appointments,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, or, like } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Admin Users
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;

  createContactSubmission(contact: InsertContact): Promise<ContactSubmission>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;

  createNewsletterSubscriber(subscriber: InsertNewsletter): Promise<NewsletterSubscriber>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;

  getIntegrationSetting(dataType: string): Promise<IntegrationSetting | undefined>;
  getAllIntegrationSettings(): Promise<IntegrationSetting[]>;
  upsertIntegrationSetting(setting: InsertIntegrationSetting): Promise<IntegrationSetting>;

  createReferral(referral: InsertReferral, userId?: string): Promise<Referral>;
  getReferral(id: string): Promise<Referral | undefined>;
  getAllReferrals(filters?: {
    status?: string;
    clientState?: string;
    workflowStatus?: string;
    urgency?: string;
    search?: string
  }): Promise<Referral[]>;
  getReferralsByState(clientState: string): Promise<Referral[]>;
  updateReferral(id: string, updates: UpdateReferral, userId?: string): Promise<Referral>;
  deleteReferral(id: string): Promise<void>;

  // Phase 4: Therapists
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  getTherapist(id: number): Promise<Therapist | undefined>;
  getAllTherapists(filters?: { isActive?: boolean; specialties?: string[] }): Promise<Therapist[]>;
  updateTherapist(id: number, updates: UpdateTherapist): Promise<Therapist>;
  deleteTherapist(id: number): Promise<void>;

  // Phase 4: Rooms
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: number): Promise<Room | undefined>;
  getAllRooms(filters?: { isActive?: boolean; isVirtual?: boolean }): Promise<Room[]>;
  updateRoom(id: number, updates: UpdateRoom): Promise<Room>;
  deleteRoom(id: number): Promise<void>;

  // Phase 4: Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(filters?: {
    startDate?: Date;
    endDate?: Date;
    therapistId?: number;
    clientId?: number;
    status?: string;
  }): Promise<Appointment[]>;
  updateAppointment(id: number, updates: UpdateAppointment): Promise<Appointment>;
  deleteAppointment(id: number): Promise<void>;
  checkAppointmentConflicts(
    therapistId: number | null,
    roomId: number | null,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: number
  ): Promise<{ hasConflict: boolean; conflicts: Appointment[] }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // ============================================================================
  // ADMIN USERS - v2 Schema
  // ============================================================================

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return adminUser || undefined;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return adminUser || undefined;
  }

  async createContactSubmission(contact: InsertContact): Promise<ContactSubmission> {
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        ...contact,
        phone: contact.phone || null,
      })
      .returning();
    return submission;
  }

  async getAllContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions);
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletter): Promise<NewsletterSubscriber> {
    const normalizedEmail = subscriber.email.toLowerCase();
    const existing = await this.getNewsletterSubscriberByEmail(normalizedEmail);
    if (existing) {
      throw new Error("Email already subscribed to newsletter");
    }

    const [newSubscriber] = await db
      .insert(newsletterSubscribers)
      .values({ email: normalizedEmail })
      .returning();
    return newSubscriber;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const normalizedEmail = email.toLowerCase();
    const [subscriber] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, normalizedEmail));
    return subscriber || undefined;
  }

  async getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db.select().from(newsletterSubscribers);
  }

  async getIntegrationSetting(dataType: string): Promise<IntegrationSetting | undefined> {
    const [setting] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.dataType, dataType));
    return setting || undefined;
  }

  async getAllIntegrationSettings(): Promise<IntegrationSetting[]> {
    return await db.select().from(integrationSettings);
  }

  async upsertIntegrationSetting(setting: InsertIntegrationSetting): Promise<IntegrationSetting> {
    const [upserted] = await db
      .insert(integrationSettings)
      .values({
        ...setting,
        updatedAt: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: integrationSettings.dataType,
        set: {
          provider: setting.provider,
          config: setting.config,
          enabled: setting.enabled,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();
    return upserted;
  }

  async createReferral(referral: InsertReferral, userId?: string): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values({
        ...referral,
        createdBy: userId || null,
        lastModifiedBy: userId || null,
      })
      .returning();
    return newReferral;
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.id, id));
    return referral || undefined;
  }

  async getAllReferrals(filters?: {
    status?: string;
    clientState?: string;
    workflowStatus?: string;
    urgency?: string;
    search?: string
  }): Promise<Referral[]> {
    let query = db.select().from(referrals);

    // Build WHERE conditions dynamically
    const conditions = [];

    // Legacy status filter (backward compatibility)
    if (filters?.status) {
      conditions.push(eq(referrals.status, filters.status));
    }

    // NEW: Client state filter (high-level)
    if (filters?.clientState) {
      conditions.push(eq(referrals.clientState, filters.clientState));
    }

    // NEW: Workflow status filter (granular)
    if (filters?.workflowStatus) {
      conditions.push(eq(referrals.workflowStatus, filters.workflowStatus));
    }

    if (filters?.urgency) {
      conditions.push(eq(referrals.urgency, filters.urgency));
    }

    if (filters?.search) {
      // Search across client name, email, and presenting concerns
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(referrals.clientName, searchPattern),
          like(referrals.clientEmail, searchPattern),
          like(referrals.presentingConcerns, searchPattern)
        )
      );
    }

    // Apply all conditions if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order by created_at descending (most recent first)
    const results = await query.orderBy(desc(referrals.createdAt));
    return results;
  }

  async getReferralsByState(clientState: string): Promise<Referral[]> {
    const results = await db
      .select()
      .from(referrals)
      .where(eq(referrals.clientState, clientState))
      .orderBy(desc(referrals.createdAt));
    return results;
  }

  async updateReferral(id: string, updates: UpdateReferral, userId?: string): Promise<Referral> {
    const [updated] = await db
      .update(referrals)
      .set({
        ...updates,
        lastModifiedBy: userId || null,
        lastModifiedAt: sql`NOW()`,
      })
      .where(eq(referrals.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Referral with id ${id} not found`);
    }

    return updated;
  }

  async deleteReferral(id: string): Promise<void> {
    await db.delete(referrals).where(eq(referrals.id, id));
  }

  // ============================================================================
  // PHASE 4: THERAPISTS
  // ============================================================================

  async createTherapist(therapist: InsertTherapist): Promise<Therapist> {
    const [newTherapist] = await db
      .insert(therapists)
      .values(therapist)
      .returning();
    return newTherapist;
  }

  async getTherapist(id: number): Promise<Therapist | undefined> {
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, id));
    return therapist || undefined;
  }

  async getAllTherapists(filters?: { isActive?: boolean; specialties?: string[] }): Promise<Therapist[]> {
    let query = db.select().from(therapists);
    const conditions = [];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(therapists.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query.orderBy(therapists.name);

    // Filter by specialties if provided (array overlap check)
    if (filters?.specialties && filters.specialties.length > 0) {
      return results.filter(therapist => {
        if (!therapist.specialties) return false;
        return filters.specialties!.some(s => therapist.specialties!.includes(s));
      });
    }

    return results;
  }

  async updateTherapist(id: number, updates: UpdateTherapist): Promise<Therapist> {
    const [updated] = await db
      .update(therapists)
      .set({
        ...updates,
        updatedAt: sql`NOW()`,
      })
      .where(eq(therapists.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Therapist with id ${id} not found`);
    }

    return updated;
  }

  async deleteTherapist(id: number): Promise<void> {
    // Soft delete by setting isActive to false
    await db
      .update(therapists)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(therapists.id, id));
  }

  // ============================================================================
  // PHASE 4: ROOMS
  // ============================================================================

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db
      .insert(rooms)
      .values(room)
      .returning();
    return newRoom;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id));
    return room || undefined;
  }

  async getAllRooms(filters?: { isActive?: boolean; isVirtual?: boolean }): Promise<Room[]> {
    let query = db.select().from(rooms);
    const conditions = [];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(rooms.isActive, filters.isActive));
    }

    if (filters?.isVirtual !== undefined) {
      conditions.push(eq(rooms.isVirtual, filters.isVirtual));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return await query.orderBy(rooms.name);
  }

  async updateRoom(id: number, updates: UpdateRoom): Promise<Room> {
    const [updated] = await db
      .update(rooms)
      .set({
        ...updates,
        updatedAt: sql`NOW()`,
      })
      .where(eq(rooms.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Room with id ${id} not found`);
    }

    return updated;
  }

  async deleteRoom(id: number): Promise<void> {
    // Soft delete by setting isActive to false
    await db
      .update(rooms)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(rooms.id, id));
  }

  // ============================================================================
  // PHASE 4: APPOINTMENTS
  // ============================================================================

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAllAppointments(filters?: {
    startDate?: Date;
    endDate?: Date;
    therapistId?: number;
    clientId?: number;
    status?: string;
  }): Promise<Appointment[]> {
    let query = db.select().from(appointments);
    const conditions = [];

    if (filters?.therapistId) {
      conditions.push(eq(appointments.therapistId, filters.therapistId));
    }

    if (filters?.clientId) {
      conditions.push(eq(appointments.clientId, filters.clientId));
    }

    if (filters?.status) {
      conditions.push(eq(appointments.status, filters.status));
    }

    if (filters?.startDate) {
      conditions.push(sql`${appointments.startTime} >= ${filters.startDate}`);
    }

    if (filters?.endDate) {
      conditions.push(sql`${appointments.startTime} <= ${filters.endDate}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return await query.orderBy(desc(appointments.startTime));
  }

  async updateAppointment(id: number, updates: UpdateAppointment): Promise<Appointment> {
    const [updated] = await db
      .update(appointments)
      .set({
        ...updates,
        updatedAt: sql`NOW()`,
      })
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    // Soft delete by setting status to 'cancelled'
    await db
      .update(appointments)
      .set({ status: "cancelled", updatedAt: sql`NOW()` })
      .where(eq(appointments.id, id));
  }

  async checkAppointmentConflicts(
    therapistId: number | null,
    roomId: number | null,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: number
  ): Promise<{ hasConflict: boolean; conflicts: Appointment[] }> {
    const conditions = [];

    // Check for overlapping time ranges: (start < end_time AND end > start_time)
    conditions.push(
      and(
        sql`${appointments.startTime} < ${endTime}`,
        sql`${appointments.endTime} > ${startTime}`
      )
    );

    // Only check non-cancelled appointments
    conditions.push(sql`${appointments.status} != 'cancelled'`);

    // Build resource conflict conditions
    const resourceConditions = [];
    if (therapistId) {
      resourceConditions.push(eq(appointments.therapistId, therapistId));
    }
    if (roomId) {
      resourceConditions.push(eq(appointments.roomId, roomId));
    }

    if (resourceConditions.length > 0) {
      conditions.push(or(...resourceConditions));
    }

    // Exclude the appointment being updated
    if (excludeAppointmentId) {
      conditions.push(sql`${appointments.id} != ${excludeAppointmentId}`);
    }

    const conflicts = await db
      .select()
      .from(appointments)
      .where(and(...conditions));

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}

export const storage = new DatabaseStorage();
