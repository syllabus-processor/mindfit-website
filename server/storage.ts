import { 
  type User, 
  type InsertUser,
  type ContactSubmission,
  type InsertContact,
  type NewsletterSubscriber,
  type InsertNewsletter,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createContactSubmission(contact: InsertContact): Promise<ContactSubmission>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;
  
  createNewsletterSubscriber(subscriber: InsertNewsletter): Promise<NewsletterSubscriber>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contactSubmissions: Map<string, ContactSubmission>;
  private newsletterSubscribers: Map<string, NewsletterSubscriber>;

  constructor() {
    this.users = new Map();
    this.contactSubmissions = new Map();
    this.newsletterSubscribers = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createContactSubmission(contact: InsertContact): Promise<ContactSubmission> {
    const id = randomUUID();
    const submission: ContactSubmission = {
      ...contact,
      id,
      phone: contact.phone || null,
      createdAt: new Date(),
    };
    this.contactSubmissions.set(id, submission);
    return submission;
  }

  async getAllContactSubmissions(): Promise<ContactSubmission[]> {
    return Array.from(this.contactSubmissions.values());
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletter): Promise<NewsletterSubscriber> {
    const existing = await this.getNewsletterSubscriberByEmail(subscriber.email);
    if (existing) {
      throw new Error("Email already subscribed to newsletter");
    }

    const id = randomUUID();
    const newSubscriber: NewsletterSubscriber = {
      ...subscriber,
      id,
      subscribedAt: new Date(),
    };
    this.newsletterSubscribers.set(id, newSubscriber);
    return newSubscriber;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    return Array.from(this.newsletterSubscribers.values()).find(
      (sub) => sub.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getAllNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return Array.from(this.newsletterSubscribers.values());
  }
}

export const storage = new MemStorage();
