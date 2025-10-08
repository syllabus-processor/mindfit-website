// EMRM provider - integrates with EMRM system
import { BaseProvider, type ProviderResponse } from "./base";
import type { InsertContact, InsertNewsletter } from "@shared/schema";

export class EMRMProvider extends BaseProvider {
  name = "emrm";

  async handleContactSubmission(
    contact: InsertContact,
    localId: string
  ): Promise<ProviderResponse> {
    const apiUrl = this.config.apiUrl || process.env.EMRM_API_BASE_URL;
    const apiKey = this.config.apiKey || process.env.EMRM_API_KEY;

    if (!apiUrl || !apiKey) {
      console.error("❌ EMRM configuration missing: apiUrl or apiKey");
      return {
        success: false,
        message: "EMRM integration not configured",
        error: {
          code: "CONFIGURATION_ERROR",
          message: "EMRM API URL or API key is missing",
        },
      };
    }

    try {
      const response = await fetch(`${apiUrl}/intake/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Source": "mindfit-website",
        },
        body: JSON.stringify({
          source: "website_contact_form",
          contactData: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            preferredContact: contact.preferredContact,
            message: contact.message,
            submittedAt: new Date().toISOString(),
          },
          websiteSubmissionId: localId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ EMRM API error:", data);
        return {
          success: false,
          message: data.error?.message || "EMRM integration failed",
          error: data.error,
        };
      }

      console.log("✅ EMRM contact intake created:", data);
      return {
        success: true,
        message: data.message || "Contact forwarded to EMRM successfully",
        externalId: data.clientId,
      };
    } catch (error: any) {
      console.error("❌ EMRM integration error:", error);
      return {
        success: false,
        message: "Failed to connect to EMRM",
        error: {
          code: "NETWORK_ERROR",
          message: error.message,
        },
      };
    }
  }

  async handleNewsletterSubscription(
    subscriber: InsertNewsletter,
    localId: string
  ): Promise<ProviderResponse> {
    const apiUrl = this.config.apiUrl || process.env.EMRM_API_BASE_URL;
    const apiKey = this.config.apiKey || process.env.EMRM_API_KEY;

    if (!apiUrl || !apiKey) {
      console.error("❌ EMRM configuration missing: apiUrl or apiKey");
      return {
        success: false,
        message: "EMRM integration not configured",
        error: {
          code: "CONFIGURATION_ERROR",
          message: "EMRM API URL or API key is missing",
        },
      };
    }

    try {
      const response = await fetch(`${apiUrl}/marketing/subscriber`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email: subscriber.email,
          subscribedAt: new Date().toISOString(),
          source: "website_footer",
          tags: ["website_visitor", "newsletter_subscriber"],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ EMRM newsletter sync error:", data);
        return {
          success: false,
          message: "EMRM newsletter sync failed",
          error: data.error,
        };
      }

      console.log("✅ EMRM newsletter subscriber synced:", data);
      return {
        success: true,
        message: "Newsletter subscription synced to EMRM",
        externalId: data.subscriberId,
      };
    } catch (error: any) {
      console.error("❌ EMRM newsletter sync error:", error);
      return {
        success: false,
        message: "Failed to sync newsletter to EMRM",
        error: {
          code: "NETWORK_ERROR",
          message: error.message,
        },
      };
    }
  }
}
