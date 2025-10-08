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
  users,
  contactSubmissions,
  newsletterSubscribers,
  integrationSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createContactSubmission(contact: InsertContact): Promise<ContactSubmission>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;
  
  createNewsletterSubscriber(subscriber: InsertNewsletter): Promise<NewsletterSubscriber>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  
  getIntegrationSetting(dataType: string): Promise<IntegrationSetting | undefined>;
  getAllIntegrationSettings(): Promise<IntegrationSetting[]>;
  upsertIntegrationSetting(setting: InsertIntegrationSetting): Promise<IntegrationSetting>;
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
}

export const storage = new DatabaseStorage();
