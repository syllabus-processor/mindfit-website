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
  users,
  contactSubmissions,
  newsletterSubscribers,
  integrationSettings,
  referrals,
  adminUsers,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, or, like } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Admin Users
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
  getAllReferrals(filters?: { status?: string; urgency?: string; search?: string }): Promise<Referral[]>;
  updateReferral(id: string, updates: UpdateReferral, userId?: string): Promise<Referral>;
  deleteReferral(id: string): Promise<void>;
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

  async getAllReferrals(filters?: { status?: string; urgency?: string; search?: string }): Promise<Referral[]> {
    let query = db.select().from(referrals);

    // Build WHERE conditions dynamically
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(referrals.status, filters.status));
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
}

export const storage = new DatabaseStorage();
