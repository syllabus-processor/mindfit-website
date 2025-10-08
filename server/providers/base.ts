// Base provider interface for all integration providers
import type { InsertContact, InsertNewsletter } from "@shared/schema";

export interface ProviderConfig {
  [key: string]: any;
}

export interface ProviderResponse {
  success: boolean;
  message: string;
  externalId?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface IProvider {
  name: string;
  
  handleContactSubmission(
    contact: InsertContact,
    localId: string
  ): Promise<ProviderResponse>;
  
  handleNewsletterSubscription(
    subscriber: InsertNewsletter,
    localId: string
  ): Promise<ProviderResponse>;
}

export abstract class BaseProvider implements IProvider {
  abstract name: string;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract handleContactSubmission(
    contact: InsertContact,
    localId: string
  ): Promise<ProviderResponse>;

  abstract handleNewsletterSubscription(
    subscriber: InsertNewsletter,
    localId: string
  ): Promise<ProviderResponse>;
}
