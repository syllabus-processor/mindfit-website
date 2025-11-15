// MindFit v2 - Notification System
// Campaign 1 - Sprint 1-2: Email notifications for referrals and intake packages
// Classification: TIER-1 | Multi-channel notification triggers

import type { Referral } from "../../schema/referrals";
import type { IntakePackage } from "../../schema/intake_packages";
import type { Event } from "../../schema/events";
import { Resend } from "resend";

// ============================================================================
// PHI MASKING & SAFE LOGGING
// ============================================================================

/**
 * Mask PHI for logging (never log full PHI)
 * @param {string} value - Value to mask
 * @param {number} showChars - Number of characters to show (default: 3)
 * @returns {string} Masked value
 */
function maskPHI(value: string | undefined | null, showChars: number = 3): string {
  if (!value) return "[REDACTED]";
  if (value.length <= showChars) return "***";
  return value.substring(0, showChars) + "*".repeat(Math.min(value.length - showChars, 10));
}

/**
 * Safe log for notification events (no PHI)
 * @param {string} event - Event name
 * @param {object} metadata - Non-PHI metadata
 */
function safeLog(event: string, metadata: Record<string, any> = {}): void {
  const sanitized = { ...metadata };
  // Remove any PHI fields that might accidentally be passed
  delete sanitized.clientName;
  delete sanitized.clientEmail;
  delete sanitized.clientPhone;
  delete sanitized.presentingConcerns;
  delete sanitized.insuranceMemberId;

  console.log(`📧 [NOTIFICATION] ${event}`, sanitized);
}

// ============================================================================
// EMAIL & SMS SERVICE CONFIGURATION
// ============================================================================

interface EmailConfig {
  provider: "resend" | "sendgrid" | "ses" | "console"; // console = dev mode
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

interface SMSConfig {
  provider: "twilio" | "sns" | "console"; // console = dev mode
  apiKey?: string;
  fromNumber?: string;
}

const emailConfig: EmailConfig = {
  provider: (process.env.EMAIL_PROVIDER as any) || "console",
  apiKey: process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY,
  fromEmail: process.env.EMAIL_FROM || "noreply@mindfithealth.com",
  fromName: process.env.EMAIL_FROM_NAME || "MindFit Mental Health",
};

const smsConfig: SMSConfig = {
  provider: (process.env.SMS_PROVIDER as any) || "console",
  apiKey: process.env.SMS_API_KEY || process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.SMS_FROM_NUMBER || "+1234567890",
};

// Initialize Resend client if configured
let resendClient: Resend | null = null;
if (emailConfig.provider === "resend" && emailConfig.apiKey) {
  resendClient = new Resend(emailConfig.apiKey);
  console.log("✅ Resend email client initialized");
}

// ============================================================================
// NOTIFICATION RECIPIENTS
// ============================================================================

const NOTIFICATION_RECIPIENTS = {
  supervisors: process.env.SUPERVISOR_EMAIL || "supervisors@mindfithealth.com",
  admins: process.env.ADMIN_EMAIL || "admin@mindfithealth.com",
  contact: process.env.CONTACT_EMAIL || "contact@mindfithealth.com",
};

// ============================================================================
// EMAIL SENDING (Abstract layer)
// ============================================================================

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send email via configured provider
 * @param {EmailPayload} payload - Email details
 * @returns {Promise<boolean>} True if sent successfully
 */
async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    if (emailConfig.provider === "console") {
      // Development mode - log to console
      console.log("📧 [DEV MODE] Email would be sent:");
      console.log(`To: ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`);
      console.log(`From: ${emailConfig.fromName} <${emailConfig.fromEmail}>`);
      console.log(`Subject: ${payload.subject}`);
      console.log(`HTML Body:\n${payload.html}`);
      if (payload.replyTo) {
        console.log(`Reply-To: ${payload.replyTo}`);
      }
      return true;
    }

    // Production mode - integrate with actual email service
    if (emailConfig.provider === "resend") {
      if (!resendClient) {
        console.error("❌ Resend client not initialized");
        return false;
      }

      try {
        const to = Array.isArray(payload.to) ? payload.to : [payload.to];

        const { data, error } = await resendClient.emails.send({
          from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
          to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo,
        });

        if (error) {
          console.error("❌ Resend email failed:", error);
          return false;
        }

        console.log(`✅ Email sent via Resend: ${data?.id}`);
        return true;
      } catch (error: any) {
        console.error("❌ Resend email exception:", error);
        return false;
      }
    }

    if (emailConfig.provider === "sendgrid") {
      // Example: await sgMail.send({ ... })
      console.warn("⚠️  SendGrid integration not yet implemented");
      return false;
    }

    if (emailConfig.provider === "ses") {
      // Example: await ses.sendEmail({ ... })
      console.warn("⚠️  AWS SES integration not yet implemented");
      return false;
    }

    console.error(`❌ Unknown email provider: ${emailConfig.provider}`);
    return false;
  } catch (error: any) {
    console.error("❌ Email send failed:", error);
    return false;
  }
}

// ============================================================================
// SMS SENDING (Abstract layer - STUB for future implementation)
// ============================================================================

interface SMSPayload {
  to: string; // Phone number in E.164 format
  message: string;
}

/**
 * Send SMS via configured provider (STUB - ready for future implementation)
 * @param {SMSPayload} payload - SMS details
 * @returns {Promise<boolean>} True if sent successfully
 */
async function sendSMS(payload: SMSPayload): Promise<boolean> {
  try {
    if (smsConfig.provider === "console") {
      // Development mode - log to console
      safeLog("SMS_STUB", {
        to: maskPHI(payload.to),
        messageLength: payload.message.length,
      });
      console.log("📱 [DEV MODE] SMS would be sent:");
      console.log(`To: ${maskPHI(payload.to)}`);
      console.log(`From: ${smsConfig.fromNumber}`);
      console.log(`Message: ${payload.message}`);
      return true;
    }

    if (smsConfig.provider === "twilio") {
      // TODO: Implement Twilio SMS integration
      // const twilioClient = twilio(accountSid, authToken);
      // await twilioClient.messages.create({
      //   body: payload.message,
      //   from: smsConfig.fromNumber,
      //   to: payload.to,
      // });
      console.warn("⚠️  Twilio SMS integration not yet implemented");
      return false;
    }

    if (smsConfig.provider === "sns") {
      // TODO: Implement AWS SNS SMS integration
      // const sns = new AWS.SNS();
      // await sns.publish({
      //   Message: payload.message,
      //   PhoneNumber: payload.to,
      // }).promise();
      console.warn("⚠️  AWS SNS integration not yet implemented");
      return false;
    }

    console.error(`❌ Unknown SMS provider: ${smsConfig.provider}`);
    return false;
  } catch (error: any) {
    console.error("❌ SMS send failed:", error);
    return false;
  }
}

// ============================================================================
// REFERRAL NOTIFICATIONS
// ============================================================================

/**
 * Send notification to supervisors when new referral is created
 * @param {Referral} referral - New referral data
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyNewReferral(referral: Referral): Promise<boolean> {
  safeLog("NEW_REFERRAL", {
    referralId: referral.id,
    urgency: referral.urgency,
    hasInsurance: !!referral.insuranceProvider,
  });

  const urgencyBadge = {
    routine: '<span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px;">ROUTINE</span>',
    urgent: '<span style="background: #F59E0B; color: white; padding: 4px 8px; border-radius: 4px;">URGENT</span>',
    emergency: '<span style="background: #EF4444; color: white; padding: 4px 8px; border-radius: 4px;">EMERGENCY</span>',
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #6366F1; padding-bottom: 10px;">
        🔔 New Client Referral
      </h2>

      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Urgency:</strong> ${urgencyBadge[referral.urgency as keyof typeof urgencyBadge]}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client Name:</strong> ${referral.clientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client Email:</strong> ${referral.clientEmail}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client Phone:</strong> ${referral.clientPhone || "Not provided"}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client Age:</strong> ${referral.clientAge || "Not provided"}</p>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #374151;">Presenting Concerns</h3>
        <p style="background: #FFFBEB; padding: 15px; border-left: 4px solid #F59E0B; border-radius: 4px;">
          ${referral.presentingConcerns}
        </p>
      </div>

      ${referral.insuranceProvider ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151;">Insurance Information</h3>
          <p style="margin: 5px 0;"><strong>Provider:</strong> ${referral.insuranceProvider}</p>
          <p style="margin: 5px 0;"><strong>Member ID:</strong> ${referral.insuranceMemberId || "Not provided"}</p>
        </div>
      ` : ""}

      ${referral.referralSource ? `
        <p style="margin: 20px 0;"><strong>Referral Source:</strong> ${referral.referralSource}</p>
      ` : ""}

      <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #4B5563;">Please review this referral and assign to a therapist.</p>
        <a href="${process.env.APP_URL || "https://mindfit.ruha.io"}/admin/referrals"
           style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Referral Dashboard
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Referral ID: ${referral.id}<br/>
        Created: ${new Date(referral.createdAt).toLocaleString()}
      </p>
    </div>
  `;

  return sendEmail({
    to: NOTIFICATION_RECIPIENTS.supervisors,
    subject: `[${referral.urgency.toUpperCase()}] New Referral: ${referral.clientName}`,
    html,
    replyTo: referral.clientEmail,
  });
}

/**
 * Send notification to therapist when assigned to referral
 * @param {Referral} referral - Referral data
 * @param {string} therapistEmail - Therapist's email address
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyTherapistAssignment(
  referral: Referral,
  therapistEmail: string
): Promise<boolean> {
  safeLog("THERAPIST_ASSIGNMENT", {
    referralId: referral.id,
    therapistEmail: maskPHI(therapistEmail),
    urgency: referral.urgency,
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #10B981; padding-bottom: 10px;">
        👤 New Client Assignment
      </h2>

      <p style="font-size: 16px; color: #374151;">
        You've been assigned to a new client referral. Please review the details below and reach out to schedule an initial consultation.
      </p>

      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Client Name:</strong> ${referral.clientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client Email:</strong> ${referral.clientEmail}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client Phone:</strong> ${referral.clientPhone || "Not provided"}</p>
        <p style="margin: 0 0 10px 0;"><strong>Urgency:</strong> ${referral.urgency}</p>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #374151;">Presenting Concerns</h3>
        <p style="background: #FFFBEB; padding: 15px; border-left: 4px solid #F59E0B; border-radius: 4px;">
          ${referral.presentingConcerns}
        </p>
      </div>

      ${referral.assignmentNotes ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151;">Assignment Notes</h3>
          <p style="background: #EEF2FF; padding: 15px; border-radius: 4px;">
            ${referral.assignmentNotes}
          </p>
        </div>
      ` : ""}

      <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #4B5563;">Access the full referral details in the admin dashboard.</p>
        <a href="${process.env.APP_URL || "https://mindfit.ruha.io"}/admin/referrals/${referral.id}"
           style="display: inline-block; background: #10B981; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Client Details
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Referral ID: ${referral.id}<br/>
        Assigned: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  return sendEmail({
    to: therapistEmail,
    subject: `New Client Assignment: ${referral.clientName}`,
    html,
  });
}

/**
 * Send notification to supervisor when referral status changes
 * @param {Referral} referral - Referral data
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyReferralStatusChange(
  referral: Referral,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  safeLog("REFERRAL_STATUS_CHANGE", {
    referralId: referral.id,
    oldStatus,
    newStatus,
  });

  const statusColors: Record<string, string> = {
    pending: "#6B7280",
    under_review: "#3B82F6",
    assigned: "#10B981",
    contacted: "#8B5CF6",
    scheduled: "#F59E0B",
    in_progress: "#06B6D4",
    exported: "#EC4899",
    completed: "#10B981",
    declined: "#EF4444",
    cancelled: "#6B7280",
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #3B82F6; padding-bottom: 10px;">
        📊 Referral Status Update
      </h2>

      <p style="font-size: 16px; color: #374151;">
        Status has been updated for <strong>${referral.clientName}</strong>
      </p>

      <div style="display: flex; align-items: center; gap: 20px; margin: 30px 0;">
        <div style="flex: 1; text-align: center; padding: 20px; background: #F3F4F6; border-radius: 8px;">
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6B7280; text-transform: uppercase;">Previous Status</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${statusColors[oldStatus] || "#6B7280"};">
            ${oldStatus.replace(/_/g, " ").toUpperCase()}
          </p>
        </div>
        <div style="font-size: 24px; color: #6B7280;">→</div>
        <div style="flex: 1; text-align: center; padding: 20px; background: #EEF2FF; border-radius: 8px;">
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6B7280; text-transform: uppercase;">New Status</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${statusColors[newStatus] || "#3B82F6"};">
            ${newStatus.replace(/_/g, " ").toUpperCase()}
          </p>
        </div>
      </div>

      <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${referral.clientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Assigned Therapist:</strong> ${referral.assignedTherapist || "Not assigned"}</p>
        <p style="margin: 0 0 10px 0;"><strong>Urgency:</strong> ${referral.urgency}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || "https://mindfit.ruha.io"}/admin/referrals/${referral.id}"
           style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Referral Details
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Referral ID: ${referral.id}<br/>
        Updated: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  return sendEmail({
    to: NOTIFICATION_RECIPIENTS.supervisors,
    subject: `Referral Status Update: ${referral.clientName} [${newStatus.replace(/_/g, " ").toUpperCase()}]`,
    html,
  });
}

// ============================================================================
// INTAKE PACKAGE NOTIFICATIONS
// ============================================================================

/**
 * Send notification when intake package is ready for download
 * @param {IntakePackage} pkg - Intake package data
 * @param {Referral} referral - Associated referral
 * @param {string} presignedUrl - Pre-signed download URL
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyPackageReady(
  pkg: IntakePackage,
  referral: Referral,
  presignedUrl: string
): Promise<boolean> {
  safeLog("INTAKE_PACKAGE_READY", {
    packageId: pkg.id,
    referralId: referral.id,
    packageType: pkg.packageType,
    fileSizeBytes: pkg.fileSizeBytes,
  });

  const expiryDate = new Date(pkg.presignedUrlExpiry || Date.now() + 86400000);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #EC4899; padding-bottom: 10px;">
        📦 Intake Package Ready for Download
      </h2>

      <p style="font-size: 16px; color: #374151;">
        A new encrypted intake package has been prepared for <strong>${referral.clientName}</strong>.
      </p>

      <div style="background: #FEF3C7; padding: 20px; border-left: 4px solid #F59E0B; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400E;">⚠️  Security Notice</p>
        <p style="margin: 0; color: #92400E;">
          This package contains encrypted client information. The download link will expire on <strong>${expiryDate.toLocaleString()}</strong> (24 hours from creation).
        </p>
      </div>

      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Package Name:</strong> ${pkg.packageName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Package Type:</strong> ${pkg.packageType.replace(/_/g, " ")}</p>
        <p style="margin: 0 0 10px 0;"><strong>File Size:</strong> ${(pkg.fileSizeBytes / 1024).toFixed(2)} KB</p>
        <p style="margin: 0 0 10px 0;"><strong>Encryption:</strong> ${pkg.encryptionAlgorithm}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${referral.clientName}</p>
      </div>

      <div style="background: #FDF4FF; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #4B5563;">Click below to download the encrypted package.</p>
        <a href="${presignedUrl}"
           style="display: inline-block; background: #EC4899; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Download Encrypted Package
        </a>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #6B7280;">
          Link expires: ${expiryDate.toLocaleString()}
        </p>
      </div>

      <div style="background: #F0F9FF; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369A1;">📋 Next Steps:</p>
        <ol style="margin: 0; padding-left: 20px; color: #0C4A6E;">
          <li>Download the encrypted package using the link above</li>
          <li>Verify the SHA-256 checksum: <code style="background: #E0F2FE; padding: 2px 6px; border-radius: 3px;">${pkg.checksumSha256.substring(0, 16)}...</code></li>
          <li>Decrypt using the encryption key provided separately</li>
          <li>Import into EMA system for client record creation</li>
        </ol>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Package ID: ${pkg.id}<br/>
        Referral ID: ${referral.id}<br/>
        Created: ${new Date(pkg.createdAt).toLocaleString()}<br/>
        Expires: ${new Date(pkg.expiresAt).toLocaleString()} (7 days)
      </p>
    </div>
  `;

  return sendEmail({
    to: pkg.notificationRecipient || NOTIFICATION_RECIPIENTS.supervisors,
    subject: `[ENCRYPTED] Intake Package Ready: ${referral.clientName}`,
    html,
  });
}

/**
 * Send reminder that intake package will expire soon
 * @param {IntakePackage} pkg - Intake package data
 * @param {Referral} referral - Associated referral
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyPackageExpiringSoon(
  pkg: IntakePackage,
  referral: Referral
): Promise<boolean> {
  const expiryDate = new Date(pkg.expiresAt);
  const hoursRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60));

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #EF4444; padding-bottom: 10px;">
        ⏰ Intake Package Expiring Soon
      </h2>

      <div style="background: #FEE2E2; padding: 20px; border-left: 4px solid #EF4444; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #991B1B;">⚠️  Expiration Warning</p>
        <p style="margin: 0; color: #991B1B;">
          This intake package will expire in approximately <strong>${hoursRemaining} hours</strong>.
          Please download and process before ${expiryDate.toLocaleString()}.
        </p>
      </div>

      <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Package Name:</strong> ${pkg.packageName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${referral.clientName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Created:</strong> ${new Date(pkg.createdAt).toLocaleString()}</p>
        <p style="margin: 0 0 10px 0;"><strong>Expires:</strong> ${expiryDate.toLocaleString()}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || "https://mindfit.ruha.io"}/admin/intake-packages/${pkg.id}"
           style="display: inline-block; background: #EF4444; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          Download Package Now
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Package ID: ${pkg.id}<br/>
        Referral ID: ${referral.id}
      </p>
    </div>
  `;

  return sendEmail({
    to: pkg.notificationRecipient || NOTIFICATION_RECIPIENTS.supervisors,
    subject: `[URGENT] Intake Package Expiring: ${referral.clientName}`,
    html,
  });
}

// ============================================================================
// EVENT NOTIFICATIONS
// ============================================================================

/**
 * Send notification when new event is published
 * @param {Event} event - Event data
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyNewEventPublished(event: Event): Promise<boolean> {
  safeLog("NEW_EVENT_PUBLISHED", {
    eventId: event.id,
    eventType: event.eventType,
    locationType: event.locationType,
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #8B5CF6; padding-bottom: 10px;">
        🎉 New Event Published
      </h2>

      <p style="font-size: 16px; color: #374151;">
        A new event has been published to the MindFit calendar.
      </p>

      <div style="background: #F5F3FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #6D28D9;">${event.title}</h3>
        <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${event.eventType.replace(/_/g, " ")}</p>
        <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${new Date(event.startTime).toLocaleString()}</p>
        <p style="margin: 0 0 10px 0;"><strong>Location:</strong> ${event.locationType} ${event.locationName ? `- ${event.locationName}` : ""}</p>
        ${event.facilitator ? `<p style="margin: 0 0 10px 0;"><strong>Facilitator:</strong> ${event.facilitator}</p>` : ""}
        <p style="margin: 0 0 10px 0;"><strong>Cost:</strong> ${event.cost}</p>
      </div>

      <div style="margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #374151;">${event.description}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || "https://mindfit.ruha.io"}/events/${event.id}"
           style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Event Details
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: NOTIFICATION_RECIPIENTS.admins,
    subject: `New Event Published: ${event.title}`,
    html,
  });
}

// ============================================================================
// FLYER NOTIFICATIONS
// ============================================================================

/**
 * Send notification when new flyer is uploaded
 * @param {object} flyer - Flyer data
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function notifyNewFlyerUploaded(flyer: {
  id: string;
  title: string;
  description: string;
  flyerType: string;
  imageUrl: string;
  pdfUrl?: string;
  isPublished: boolean;
  isFeatured: boolean;
  showOnHomepage: boolean;
}): Promise<boolean> {
  safeLog("NEW_FLYER_UPLOADED", {
    flyerId: flyer.id,
    flyerType: flyer.flyerType,
    isPublished: flyer.isPublished,
    isFeatured: flyer.isFeatured,
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1F2937; border-bottom: 3px solid #F97316; padding-bottom: 10px;">
        🖼️  New Flyer Uploaded
      </h2>

      <p style="font-size: 16px; color: #374151;">
        A new flyer has been uploaded to the MindFit website.
      </p>

      <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #C2410C;">${flyer.title}</h3>
        <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${flyer.flyerType.replace(/_/g, " ")}</p>
        <p style="margin: 0 0 10px 0;"><strong>Status:</strong> ${flyer.isPublished ? "Published" : "Draft"}</p>
        ${flyer.isFeatured ? '<p style="margin: 0 0 10px 0;"><strong>⭐ Featured Flyer</strong></p>' : ""}
        ${flyer.showOnHomepage ? '<p style="margin: 0 0 10px 0;"><strong>🏠 Shown on Homepage</strong></p>' : ""}
      </div>

      ${flyer.imageUrl ? `
        <div style="margin: 20px 0; text-align: center;">
          <img src="${flyer.imageUrl}" alt="${flyer.title}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
        </div>
      ` : ""}

      <div style="margin: 20px 0;">
        <p style="color: #374151;">${flyer.description}</p>
      </div>

      ${flyer.pdfUrl ? `
        <div style="background: #ECFDF5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #065F46;">📄 PDF Available</p>
          <a href="${flyer.pdfUrl}" style="color: #059669; text-decoration: underline;">Download PDF Version</a>
        </div>
      ` : ""}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || "https://mindfit.ruha.io"}/admin/flyers"
           style="display: inline-block; background: #F97316; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; font-weight: bold;">
          View All Flyers
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        Flyer ID: ${flyer.id}
      </p>
    </div>
  `;

  return sendEmail({
    to: NOTIFICATION_RECIPIENTS.admins,
    subject: `New Flyer Uploaded: ${flyer.title}`,
    html,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get configured notification recipients
 * @returns {object} Notification recipients
 */
export function getNotificationRecipients() {
  return { ...NOTIFICATION_RECIPIENTS };
}

/**
 * Check if email notifications are configured
 * @returns {boolean} True if configured
 */
export function isEmailConfigured(): boolean {
  return emailConfig.provider !== "console" && !!emailConfig.apiKey;
}

/**
 * Get email configuration (without sensitive data)
 * @returns {object} Sanitized email config
 */
export function getEmailConfig() {
  return {
    provider: emailConfig.provider,
    fromEmail: emailConfig.fromEmail,
    fromName: emailConfig.fromName,
    isConfigured: isEmailConfigured(),
  };
}
