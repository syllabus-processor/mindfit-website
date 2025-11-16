// MindFit v2 - Workflow Email Notifications
// Campaign 1 - Sprint 6.5: Phase 2 - Automation
// Classification: TIER-1 | Email alerts for workflow events

import type { Referral } from "@shared/schema";
import type { WorkflowStatus, ClientState } from "./workflow";
import type { SLAViolation, DocumentReminder } from "./workflow-automation";

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: string;
}

/**
 * Generate email for workflow state change
 */
export function createStateChangeEmail(
  referral: Referral,
  oldState: ClientState,
  newState: ClientState
): EmailNotification {
  const stateNames: Record<ClientState, string> = {
    prospective: "Pre-Staging",
    pending: "Pending Assignment",
    active: "Active Treatment",
    inactive: "Completed/Closed",
  };

  return {
    to: referral.clientEmail,
    subject: `MindFit: Your referral status has been updated`,
    body: `
Hello ${referral.clientName},

Your referral status with MindFit has been updated:

Previous Status: ${stateNames[oldState]}
New Status: ${stateNames[newState]}

${getStateChangeMessage(newState)}

If you have any questions, please contact us at support@mindfit.com.

Best regards,
MindFit Team
    `.trim(),
    type: "state_change",
  };
}

function getStateChangeMessage(state: ClientState): string {
  switch (state) {
    case "prospective":
      return "We are currently reviewing your referral and gathering necessary information.";
    case "pending":
      return "We are working to match you with an appropriate therapist. We'll notify you once a match is found.";
    case "active":
      return "Your treatment has begun! Your therapist will be in touch regarding ongoing sessions.";
    case "inactive":
      return "Your referral has been closed. Thank you for working with MindFit.";
  }
}

/**
 * Generate email for therapist assignment proposal
 */
export function createAssignmentProposedEmail(
  referral: Referral,
  therapistName: string
): EmailNotification {
  return {
    to: referral.clientEmail,
    subject: `MindFit: We've found a therapist match for you`,
    body: `
Hello ${referral.clientName},

Great news! We've identified a therapist who may be a good fit for you:

Therapist: ${therapistName}
Specialties: [To be populated from therapist profile]

Our team will reach out shortly to schedule an intake session.

If you have any questions, please contact us at support@mindfit.com.

Best regards,
MindFit Team
    `.trim(),
    type: "assignment_proposed",
  };
}

/**
 * Generate email for intake scheduling
 */
export function createIntakeScheduledEmail(
  referral: Referral,
  intakeDate: Date
): EmailNotification {
  return {
    to: referral.clientEmail,
    subject: `MindFit: Your intake session is scheduled`,
    body: `
Hello ${referral.clientName},

Your intake session has been scheduled:

Date & Time: ${intakeDate.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })}

Please prepare any questions you'd like to discuss during the intake session.

If you need to reschedule, please contact us at support@mindfit.com.

Best regards,
MindFit Team
    `.trim(),
    type: "intake_scheduled",
  };
}

/**
 * Generate email for first session scheduled
 */
export function createFirstSessionScheduledEmail(
  referral: Referral,
  sessionDate: Date
): EmailNotification {
  return {
    to: referral.clientEmail,
    subject: `MindFit: Your first therapy session is scheduled`,
    body: `
Hello ${referral.clientName},

Your first therapy session is confirmed:

Date & Time: ${sessionDate.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })}

We're excited for you to begin your therapeutic journey!

If you need to reschedule, please contact us at support@mindfit.com.

Best regards,
MindFit Team
    `.trim(),
    type: "first_session_scheduled",
  };
}

/**
 * Generate email for document reminder
 */
export function createDocumentReminderEmail(
  reminder: DocumentReminder
): EmailNotification {
  return {
    to: reminder.clientEmail,
    subject: `MindFit: Reminder - Documents needed for your referral`,
    body: `
Hello ${reminder.clientName},

This is a friendly reminder that we're still waiting for documents to complete your referral.

Documents Requested: ${reminder.daysSinceRequest} days ago

Please upload the required documents as soon as possible to avoid delays in your care.

If you need assistance, please contact us at support@mindfit.com.

Best regards,
MindFit Team
    `.trim(),
    type: "document_reminder",
  };
}

/**
 * Generate email for SLA violation alert (internal)
 */
export function createSLAViolationEmail(
  violation: SLAViolation
): EmailNotification {
  return {
    to: "admin@mindfit.com", // Internal notification
    subject: `[${violation.severity.toUpperCase()}] SLA Violation: ${
      violation.clientName
    }`,
    body: `
SLA VIOLATION ALERT

Severity: ${violation.severity.toUpperCase()}
Referral ID: ${violation.referralId}
Client: ${violation.clientName}
Phase: ${violation.phase}

Target Timeline: ${violation.targetDays} days
Actual Time: ${violation.actualDays} days
Overdue By: ${violation.actualDays - violation.targetDays} days

ACTION REQUIRED: Please review this referral and take appropriate action.

View Referral: [Admin Dashboard URL]

MindFit Automation System
    `.trim(),
    type: "sla_violation",
  };
}

// ============================================================================
// EMAIL SENDING (Stub - to be replaced with actual email service)
// ============================================================================

/**
 * Send email notification
 * TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
 */
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  console.log(`[EMAIL] Sending ${notification.type} to ${notification.to}`);
  console.log(`[EMAIL] Subject: ${notification.subject}`);
  console.log(`[EMAIL] Body:\n${notification.body}`);
  console.log(`[EMAIL] ---`);

  // TODO: Replace with actual email service integration
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   to: notification.to,
  //   from: 'noreply@mindfit.com',
  //   subject: notification.subject,
  //   text: notification.body,
  // });

  return true; // Stub: always succeeds
}

/**
 * Send batch of email notifications
 */
export async function sendBatchEmails(
  notifications: EmailNotification[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      await sendEmail(notification);
      sent++;
    } catch (error) {
      console.error(`[EMAIL] Failed to send to ${notification.to}:`, error);
      failed++;
    }
  }

  console.log(`[EMAIL] Batch complete: ${sent} sent, ${failed} failed`);

  return { sent, failed };
}
