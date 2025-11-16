// MindFit v2 - Workflow Automation Engine
// Campaign 1 - Sprint 6.5: Phase 2 - Automation
// Classification: TIER-1 | Automatic transitions, SLA tracking, notifications

import { storage } from "../storage";
import type { Referral } from "@shared/schema";
import { getTransitionMetadata, type WorkflowStatus, type ClientState } from "./workflow";

// ============================================================================
// SLA TARGETS (from CLIENT_WORKFLOW_DESIGN.md Section 7.3)
// ============================================================================

export const SLA_TARGETS = {
  referralReview: 3, // days
  preStaging: 7, // days
  stagingAssignment: 5, // days
  acceptance: 10, // days
} as const;

export const IDLE_TIMEOUT = 30; // days - auto-decline threshold

// ============================================================================
// AUTOMATIC TRANSITION RULES
// ============================================================================

export interface AutoTransitionRule {
  name: string;
  condition: (referral: Referral) => boolean;
  targetStatus: WorkflowStatus;
  reason?: string;
}

/**
 * Define automatic transition rules
 */
export const AUTO_TRANSITION_RULES: AutoTransitionRule[] = [
  {
    name: "First Session Completed → Active",
    condition: (ref) =>
      ref.workflowStatus === "waiting_first_session" &&
      ref.firstSessionAt !== null &&
      new Date(ref.firstSessionAt) <= new Date(),
    targetStatus: "in_treatment",
  },
  {
    name: "30 Days Idle → Auto Decline",
    condition: (ref) => {
      if (ref.clientState === "inactive") return false;
      if (!ref.lastModifiedAt) return false;

      const daysSinceModified = Math.floor(
        (Date.now() - new Date(ref.lastModifiedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceModified >= IDLE_TIMEOUT;
    },
    targetStatus: "declined",
    reason: "Automatically declined due to 30 days of inactivity",
  },
  {
    name: "Intake Completed → Waiting First Session",
    condition: (ref) =>
      ref.workflowStatus === "intake_scheduled" &&
      ref.intakeCompletedAt !== null &&
      new Date(ref.intakeCompletedAt) <= new Date(),
    targetStatus: "waiting_first_session",
  },
];

/**
 * Check and apply automatic transitions for a single referral
 */
export async function checkAutoTransitions(referral: Referral): Promise<boolean> {
  let transitioned = false;

  for (const rule of AUTO_TRANSITION_RULES) {
    if (rule.condition(referral)) {
      try {
        console.log(
          `[AUTO-TRANSITION] Applying rule "${rule.name}" to referral ${referral.id}`
        );

        const metadata = getTransitionMetadata(
          referral.clientState as ClientState,
          referral.workflowStatus as WorkflowStatus,
          rule.targetStatus,
          rule.reason
        );

        const updates: any = {
          clientState: metadata.newState,
          workflowStatus: metadata.newStatus,
          ...metadata.timestampUpdates,
        };

        if (rule.reason) {
          if (rule.targetStatus === "declined") {
            updates.declineReason = rule.reason;
          }
        }

        if (metadata.incrementMatchingAttempts) {
          updates.matchingAttempts = (referral.matchingAttempts || 0) + 1;
        }

        await storage.updateReferral(referral.id, updates, "system-automation");

        transitioned = true;
        console.log(
          `[AUTO-TRANSITION] Success: ${referral.workflowStatus} → ${rule.targetStatus}`
        );
        break; // Only apply one transition per check
      } catch (error) {
        console.error(
          `[AUTO-TRANSITION] Failed to apply rule "${rule.name}":`,
          error
        );
      }
    }
  }

  return transitioned;
}

/**
 * Check all active referrals for automatic transitions
 */
export async function runAutoTransitionJob(): Promise<{
  checked: number;
  transitioned: number;
}> {
  console.log("[AUTO-TRANSITION-JOB] Starting...");

  // Get all non-inactive referrals
  const activeReferrals = await storage.getAllReferrals();
  const nonInactive = activeReferrals.filter((r) => r.clientState !== "inactive");

  console.log(
    `[AUTO-TRANSITION-JOB] Checking ${nonInactive.length} active referrals`
  );

  let transitionedCount = 0;

  for (const referral of nonInactive) {
    const wasTransitioned = await checkAutoTransitions(referral);
    if (wasTransitioned) {
      transitionedCount++;
    }
  }

  console.log(
    `[AUTO-TRANSITION-JOB] Complete: ${transitionedCount}/${nonInactive.length} transitioned`
  );

  return {
    checked: nonInactive.length,
    transitioned: transitionedCount,
  };
}

// ============================================================================
// SLA MONITORING
// ============================================================================

export interface SLAViolation {
  referralId: string;
  clientName: string;
  phase: string;
  targetDays: number;
  actualDays: number;
  severity: "warning" | "critical";
}

/**
 * Calculate days since a given timestamp
 */
function daysSince(timestamp: Date | null): number | null {
  if (!timestamp) return null;
  return Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check SLA violations for a single referral
 */
export function checkSLAViolations(referral: Referral): SLAViolation[] {
  const violations: SLAViolation[] = [];

  // Skip inactive referrals
  if (referral.clientState === "inactive") return violations;

  // Pre-Staging Phase SLA
  if (referral.clientState === "prospective" && referral.preStageStartedAt) {
    const days = daysSince(referral.preStageStartedAt);
    if (days !== null && days > SLA_TARGETS.preStaging) {
      violations.push({
        referralId: referral.id,
        clientName: referral.clientName,
        phase: "Pre-Staging",
        targetDays: SLA_TARGETS.preStaging,
        actualDays: days,
        severity: days > SLA_TARGETS.preStaging * 1.5 ? "critical" : "warning",
      });
    }
  }

  // Staging/Assignment Phase SLA
  if (
    referral.clientState === "pending" &&
    referral.stageStartedAt &&
    !referral.assignmentCompletedAt
  ) {
    const days = daysSince(referral.stageStartedAt);
    if (days !== null && days > SLA_TARGETS.stagingAssignment) {
      violations.push({
        referralId: referral.id,
        clientName: referral.clientName,
        phase: "Staging & Assignment",
        targetDays: SLA_TARGETS.stagingAssignment,
        actualDays: days,
        severity:
          days > SLA_TARGETS.stagingAssignment * 1.5 ? "critical" : "warning",
      });
    }
  }

  // Acceptance Phase SLA
  if (
    referral.clientState === "pending" &&
    referral.assignmentCompletedAt &&
    !referral.firstSessionAt
  ) {
    const days = daysSince(referral.assignmentCompletedAt);
    if (days !== null && days > SLA_TARGETS.acceptance) {
      violations.push({
        referralId: referral.id,
        clientName: referral.clientName,
        phase: "Acceptance",
        targetDays: SLA_TARGETS.acceptance,
        actualDays: days,
        severity: days > SLA_TARGETS.acceptance * 1.5 ? "critical" : "warning",
      });
    }
  }

  // Initial Referral Review SLA
  if (
    referral.workflowStatus === "referral_submitted" ||
    referral.workflowStatus === "documents_requested"
  ) {
    const days = daysSince(referral.createdAt);
    if (days !== null && days > SLA_TARGETS.referralReview) {
      violations.push({
        referralId: referral.id,
        clientName: referral.clientName,
        phase: "Initial Review",
        targetDays: SLA_TARGETS.referralReview,
        actualDays: days,
        severity:
          days > SLA_TARGETS.referralReview * 1.5 ? "critical" : "warning",
      });
    }
  }

  return violations;
}

/**
 * Run SLA monitoring job across all active referrals
 */
export async function runSLAMonitoringJob(): Promise<{
  checked: number;
  violations: SLAViolation[];
}> {
  console.log("[SLA-MONITOR-JOB] Starting...");

  const allReferrals = await storage.getAllReferrals();
  const activeReferrals = allReferrals.filter((r) => r.clientState !== "inactive");

  console.log(`[SLA-MONITOR-JOB] Checking ${activeReferrals.length} active referrals`);

  const allViolations: SLAViolation[] = [];

  for (const referral of activeReferrals) {
    const violations = checkSLAViolations(referral);
    allViolations.push(...violations);
  }

  const criticalCount = allViolations.filter((v) => v.severity === "critical").length;
  const warningCount = allViolations.filter((v) => v.severity === "warning").length;

  console.log(
    `[SLA-MONITOR-JOB] Complete: ${allViolations.length} violations (${criticalCount} critical, ${warningCount} warnings)`
  );

  return {
    checked: activeReferrals.length,
    violations: allViolations,
  };
}

// ============================================================================
// DOCUMENT REMINDERS
// ============================================================================

export interface DocumentReminder {
  referralId: string;
  clientName: string;
  clientEmail: string;
  daysSinceRequest: number;
}

/**
 * Check for missing documents that need reminders
 */
export async function checkDocumentReminders(): Promise<DocumentReminder[]> {
  console.log("[DOCUMENT-REMINDER-JOB] Starting...");

  const allReferrals = await storage.getAllReferrals();

  // Find referrals stuck in "documents_requested" for more than 3 days
  const needsReminder = allReferrals.filter((r) => {
    if (r.workflowStatus !== "documents_requested") return false;
    const days = daysSince(r.lastModifiedAt);
    return days !== null && days >= 3;
  });

  const reminders: DocumentReminder[] = needsReminder.map((r) => ({
    referralId: r.id,
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    daysSinceRequest: daysSince(r.lastModifiedAt) || 0,
  }));

  console.log(
    `[DOCUMENT-REMINDER-JOB] Complete: ${reminders.length} reminders needed`
  );

  return reminders;
}
