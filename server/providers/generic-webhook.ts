// Generic webhook provider - send data to any custom webhook URL
import { BaseProvider, type ProviderResponse } from "./base";
import type { InsertContact, InsertNewsletter } from "@shared/schema";

export class GenericWebhookProvider extends BaseProvider {
  name = "generic_webhook";

  async handleContactSubmission(
    contact: InsertContact,
    localId: string
  ): Promise<ProviderResponse> {
    const webhookUrl = this.config.contactWebhookUrl;
    const authHeader = this.config.authHeader;

    if (!webhookUrl) {
      console.error("❌ Generic webhook URL not configured for contact forms");
      return {
        success: false,
        message: "Webhook URL not configured",
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Contact webhook URL is missing",
        },
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Source": "mindfit-website",
      };

      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "contact_submission",
          data: {
            ...contact,
            websiteSubmissionId: localId,
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("❌ Webhook error:", data);
        return {
          success: false,
          message: "Webhook request failed",
          error: {
            code: "WEBHOOK_ERROR",
            message: data.message || `HTTP ${response.status}`,
          },
        };
      }

      console.log("✅ Contact sent to webhook:", webhookUrl);
      return {
        success: true,
        message: "Contact forwarded to webhook successfully",
        externalId: data.id || localId,
      };
    } catch (error: any) {
      console.error("❌ Webhook integration error:", error);
      return {
        success: false,
        message: "Failed to send to webhook",
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
    const webhookUrl = this.config.newsletterWebhookUrl;
    const authHeader = this.config.authHeader;

    if (!webhookUrl) {
      console.error("❌ Generic webhook URL not configured for newsletter");
      return {
        success: false,
        message: "Webhook URL not configured",
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Newsletter webhook URL is missing",
        },
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Source": "mindfit-website",
      };

      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "newsletter_subscription",
          data: {
            email: subscriber.email,
            websiteSubscriptionId: localId,
            subscribedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("❌ Newsletter webhook error:", data);
        return {
          success: false,
          message: "Newsletter webhook failed",
          error: {
            code: "WEBHOOK_ERROR",
            message: data.message || `HTTP ${response.status}`,
          },
        };
      }

      console.log("✅ Newsletter subscription sent to webhook:", webhookUrl);
      return {
        success: true,
        message: "Newsletter subscription forwarded to webhook",
        externalId: data.id || localId,
      };
    } catch (error: any) {
      console.error("❌ Newsletter webhook error:", error);
      return {
        success: false,
        message: "Failed to send newsletter subscription to webhook",
        error: {
          code: "NETWORK_ERROR",
          message: error.message,
        },
      };
    }
  }
}
