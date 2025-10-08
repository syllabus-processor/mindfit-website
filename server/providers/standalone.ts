// Standalone provider - no external integration, stores locally only
import { BaseProvider, type ProviderResponse } from "./base";
import type { InsertContact, InsertNewsletter } from "@shared/schema";

export class StandaloneProvider extends BaseProvider {
  name = "standalone";

  async handleContactSubmission(
    contact: InsertContact,
    localId: string
  ): Promise<ProviderResponse> {
    console.log("📝 Standalone mode: Contact submission stored locally", { id: localId });
    return {
      success: true,
      message: "Contact submission stored locally (standalone mode)",
      externalId: localId,
    };
  }

  async handleNewsletterSubscription(
    subscriber: InsertNewsletter,
    localId: string
  ): Promise<ProviderResponse> {
    console.log("📝 Standalone mode: Newsletter subscription stored locally", { id: localId });
    return {
      success: true,
      message: "Newsletter subscription stored locally (standalone mode)",
      externalId: localId,
    };
  }
}
