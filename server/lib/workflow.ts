// MindFit v2 - Workflow Transition Logic
// Campaign 1 - Sprint 6.5: Client Workflow System (Phase 2)
// Classification: TIER-1 | Business logic for state/status transitions

export type ClientState = "prospective" | "pending" | "active" | "inactive";

export type WorkflowStatus =
  // Pre-Staging Phase (7 statuses)
  | "referral_submitted"
  | "documents_requested"
  | "documents_received"
  | "insurance_verification_pending"
  | "insurance_verified"
  | "insurance_verification_failed"
  | "pre_stage_review"
  // Staging Phase (3 statuses)
  | "ready_for_assignment"
  | "matching_in_progress"
  | "therapist_identified"
  // Assignment Phase (4 statuses)
  | "assignment_pending"
  | "assignment_offered"
  | "assignment_accepted"
  | "assignment_declined"
  // Acceptance Phase (4 statuses)
  | "client_contacted"
  | "intake_scheduled"
  | "intake_completed"
  | "waiting_first_session"
  // Active Treatment Phase (3 statuses)
  | "in_treatment"
  | "treatment_on_hold"
  | "treatment_resumed"
  // Completion Phase (5 statuses)
  | "discharge_pending"
  | "discharged"
  | "referred_out"
  | "declined"
  | "cancelled";

// ============================================================================
// STATE → STATUS MAPPING
// ============================================================================

/**
 * Map each client state to its valid workflow statuses
 */
export const STATE_STATUS_MAP: Record<ClientState, WorkflowStatus[]> = {
  prospective: [
    "referral_submitted",
    "documents_requested",
    "documents_received",
    "insurance_verification_pending",
    "insurance_verified",
    "insurance_verification_failed",
    "pre_stage_review",
  ],
  pending: [
    "ready_for_assignment",
    "matching_in_progress",
    "therapist_identified",
    "assignment_pending",
    "assignment_offered",
    "assignment_accepted",
    "assignment_declined",
    "client_contacted",
    "intake_scheduled",
    "intake_completed",
    "waiting_first_session",
  ],
  active: ["in_treatment", "treatment_on_hold", "treatment_resumed"],
  inactive: ["discharge_pending", "discharged", "referred_out", "declined", "cancelled"],
};

/**
 * Reverse mapping: Get client state from workflow status
 */
export function getStateFromStatus(status: WorkflowStatus): ClientState {
  for (const [state, statuses] of Object.entries(STATE_STATUS_MAP)) {
    if (statuses.includes(status)) {
      return state as ClientState;
    }
  }
  throw new Error(`Invalid workflow status: ${status}`);
}

// ============================================================================
// TRANSITION VALIDATION
// ============================================================================

/**
 * Valid state transitions (from → to)
 * States can only progress forward or move to inactive
 */
const VALID_STATE_TRANSITIONS: Record<ClientState, ClientState[]> = {
  prospective: ["pending", "inactive"],
  pending: ["active", "inactive"],
  active: ["inactive"],
  inactive: [], // Terminal state - no transitions allowed
};

/**
 * Check if state transition is valid
 */
export function isValidStateTransition(from: ClientState, to: ClientState): boolean {
  return VALID_STATE_TRANSITIONS[from].includes(to);
}

/**
 * Valid workflow status transitions
 * Maps current status → array of allowed next statuses
 */
const VALID_STATUS_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  // Pre-Staging Phase
  referral_submitted: ["documents_requested", "pre_stage_review", "declined", "cancelled"],
  documents_requested: [
    "documents_received",
    "documents_requested",
    "declined",
    "cancelled",
  ],
  documents_received: [
    "insurance_verification_pending",
    "pre_stage_review",
    "declined",
    "cancelled",
  ],
  insurance_verification_pending: [
    "insurance_verified",
    "insurance_verification_failed",
    "declined",
    "cancelled",
  ],
  insurance_verified: ["pre_stage_review", "declined", "cancelled"],
  insurance_verification_failed: ["referred_out", "declined", "cancelled"],
  pre_stage_review: ["ready_for_assignment", "referred_out", "declined", "cancelled"],

  // Staging Phase
  ready_for_assignment: ["matching_in_progress", "declined", "cancelled"],
  matching_in_progress: [
    "therapist_identified",
    "matching_in_progress",
    "referred_out",
    "declined",
    "cancelled",
  ],
  therapist_identified: ["assignment_pending", "matching_in_progress", "declined", "cancelled"],

  // Assignment Phase
  assignment_pending: ["assignment_offered", "declined", "cancelled"],
  assignment_offered: ["assignment_accepted", "assignment_declined", "declined", "cancelled"],
  assignment_accepted: ["client_contacted", "declined", "cancelled"],
  assignment_declined: ["matching_in_progress", "referred_out", "declined", "cancelled"],

  // Acceptance Phase
  client_contacted: ["intake_scheduled", "client_contacted", "declined", "cancelled"],
  intake_scheduled: ["intake_completed", "intake_scheduled", "declined", "cancelled"],
  intake_completed: ["waiting_first_session", "declined", "cancelled"],
  waiting_first_session: ["in_treatment", "declined", "cancelled"],

  // Active Treatment Phase
  in_treatment: ["treatment_on_hold", "discharge_pending", "discharged"],
  treatment_on_hold: ["treatment_resumed", "discharge_pending", "discharged"],
  treatment_resumed: ["in_treatment", "discharge_pending", "discharged"],

  // Completion Phase (terminal states - minimal transitions)
  discharge_pending: ["discharged"],
  discharged: [],
  referred_out: [],
  declined: [],
  cancelled: [],
};

/**
 * Check if workflow status transition is valid
 */
export function isValidStatusTransition(
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

// ============================================================================
// TRANSITION METADATA
// ============================================================================

export interface TransitionMetadata {
  newState: ClientState;
  newStatus: WorkflowStatus;
  timestampUpdates: Record<string, Date>;
  incrementMatchingAttempts?: boolean;
  requiresReason?: "decline" | "discharge";
}

/**
 * Get metadata for a workflow transition
 * Includes state changes, timestamps to update, and validation requirements
 */
export function getTransitionMetadata(
  currentState: ClientState,
  currentStatus: WorkflowStatus,
  targetStatus: WorkflowStatus,
  reason?: string
): TransitionMetadata {
  // Validate transition
  if (!isValidStatusTransition(currentStatus, targetStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${targetStatus}`
    );
  }

  const metadata: TransitionMetadata = {
    newState: getStateFromStatus(targetStatus),
    newStatus: targetStatus,
    timestampUpdates: {},
  };

  // Check if state changed
  const stateChanged = metadata.newState !== currentState;
  if (stateChanged && !isValidStateTransition(currentState, metadata.newState)) {
    throw new Error(
      `Invalid state transition: ${currentState} → ${metadata.newState} (triggered by status ${targetStatus})`
    );
  }

  // ============================================================================
  // TIMESTAMP LOGIC
  // ============================================================================

  const now = new Date();

  // Phase completion timestamps (when leaving a state)
  if (currentState === "prospective" && metadata.newState !== "prospective") {
    metadata.timestampUpdates.preStageCompletedAt = now;
  }
  if (currentState === "pending" && metadata.newState === "active") {
    metadata.timestampUpdates.acceptanceCompletedAt = now;
  }

  // Phase start timestamps (when entering a state)
  if (metadata.newState === "pending" && currentState !== "pending") {
    metadata.timestampUpdates.stageStartedAt = now;
  }
  if (metadata.newState === "active" && currentState !== "active") {
    metadata.timestampUpdates.firstSessionAt = now;
  }

  // Specific workflow status timestamps
  switch (targetStatus) {
    case "documents_received":
      metadata.timestampUpdates.documentsReceivedAt = now;
      break;
    case "insurance_verified":
      metadata.timestampUpdates.insuranceVerifiedAt = now;
      break;
    case "intake_completed":
      metadata.timestampUpdates.intakeCompletedAt = now;
      break;
    case "assignment_pending":
      metadata.timestampUpdates.assignmentStartedAt = now;
      break;
    case "assignment_accepted":
      metadata.timestampUpdates.assignmentCompletedAt = now;
      break;
    case "assignment_declined":
      metadata.incrementMatchingAttempts = true;
      break;
    case "matching_in_progress":
      // Increment if coming back from declined assignment
      if (currentStatus === "assignment_declined") {
        metadata.incrementMatchingAttempts = true;
      }
      break;
    case "discharged":
      metadata.timestampUpdates.dischargedAt = now;
      metadata.requiresReason = "discharge";
      break;
    case "declined":
      metadata.requiresReason = "decline";
      break;
  }

  // Validate required reasons
  if (metadata.requiresReason && !reason) {
    throw new Error(
      `Reason is required for transition to ${targetStatus} (${metadata.requiresReason}Reason field)`
    );
  }

  return metadata;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all valid next statuses for a given current status
 */
export function getNextStatuses(currentStatus: WorkflowStatus): WorkflowStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is terminal (no valid transitions out)
 */
export function isTerminalStatus(status: WorkflowStatus): boolean {
  const nextStatuses = VALID_STATUS_TRANSITIONS[status];
  return !nextStatuses || nextStatuses.length === 0;
}

/**
 * Get human-readable phase name from client state
 */
export function getPhaseName(state: ClientState): string {
  const phaseNames: Record<ClientState, string> = {
    prospective: "Pre-Staging",
    pending: "Staging & Assignment",
    active: "Active Treatment",
    inactive: "Completed",
  };
  return phaseNames[state];
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: WorkflowStatus): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
