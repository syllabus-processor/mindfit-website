// MindFit v2 - Workflow Status Validator
// Campaign 1 - Sprint 6.5: Phase 2 - UI Integration
// Classification: TIER-1 | Validates allowed workflow transitions

import type { WorkflowStatus } from "./workflow";

/**
 * Get allowed next statuses based on current workflow status
 * Used by UI to show only valid transition options
 */
export function getAllowedNextStatuses(
  currentStatus: WorkflowStatus
): WorkflowStatus[] {
  const transitionMap: Record<WorkflowStatus, WorkflowStatus[]> = {
    // REFERRAL PHASE
    referral_submitted: ["referral_under_review"],
    referral_under_review: [
      "referral_accepted",
      "referral_declined",
      "documents_requested",
    ],
    documents_requested: ["referral_under_review"],
    referral_accepted: ["pre_staging"],
    referral_declined: [], // Terminal state

    // PRE-STAGING PHASE
    pre_staging: ["pre_staging_complete"],
    pre_staging_complete: ["staging"],

    // STAGING PHASE
    staging: ["assignment_proposed"],
    assignment_proposed: ["assignment_accepted", "assignment_declined"],
    assignment_declined: ["staging"], // Back to matching
    assignment_accepted: ["intake_scheduled"],

    // INTAKE/ACCEPTANCE PHASE
    intake_scheduled: ["waiting_first_session"],
    waiting_first_session: ["in_treatment"],

    // TREATMENT PHASE
    in_treatment: ["treatment_on_hold", "treatment_complete", "declined"],
    treatment_on_hold: ["in_treatment", "declined"],
    treatment_complete: [], // Terminal state

    // DECLINED (can happen from multiple states)
    declined: [], // Terminal state
  };

  return transitionMap[currentStatus] ?? [];
}

/**
 * Validate if a transition is allowed
 */
export function isTransitionAllowed(
  currentStatus: WorkflowStatus,
  targetStatus: WorkflowStatus
): boolean {
  const allowed = getAllowedNextStatuses(currentStatus);
  return allowed.includes(targetStatus);
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: WorkflowStatus): string {
  const labels: Record<WorkflowStatus, string> = {
    referral_submitted: "Referral Submitted",
    referral_under_review: "Under Review",
    documents_requested: "Documents Requested",
    referral_accepted: "Referral Accepted",
    referral_declined: "Referral Declined",
    pre_staging: "Pre-Staging",
    pre_staging_complete: "Pre-Staging Complete",
    staging: "Staging",
    assignment_proposed: "Assignment Proposed",
    assignment_accepted: "Assignment Accepted",
    assignment_declined: "Assignment Declined",
    intake_scheduled: "Intake Scheduled",
    waiting_first_session: "Waiting First Session",
    in_treatment: "In Treatment",
    treatment_on_hold: "Treatment On Hold",
    treatment_complete: "Treatment Complete",
    declined: "Declined",
  };

  return labels[status] ?? status.replace(/_/g, " ");
}
