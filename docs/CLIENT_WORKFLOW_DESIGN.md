# MindFit Client Workflow Design
## Comprehensive State & Status Management System

**Date:** 2025-11-16
**Version:** 1.0
**Author:** Claude Code Assistant

---

## 1. Executive Summary

This document defines the complete client lifecycle management system for MindFit, tracking clients from initial referral through active treatment to discharge. The system uses a dual-layer approach:

- **State**: High-level client lifecycle phase (4 states)
- **Status**: Detailed workflow step within each state (20+ statuses)

---

## 2. Client Lifecycle States

### 2.1 Four Primary States

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ PROSPECTIVE │ -> │   PENDING   │ -> │   ACTIVE    │ -> │  INACTIVE   │
│  (Referral) │    │ (Pre-Intake)│    │  (Treatment)│    │ (Discharged)│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

| State | Description | Entry Point | Exit Point |
|-------|-------------|-------------|------------|
| **PROSPECTIVE** | Initial referral submitted, not yet accepted into intake process | Referral created | Moved to pre-staging |
| **PENDING** | Accepted for intake, preparing for active treatment | Pre-staging begins | First therapy session |
| **ACTIVE** | Currently receiving treatment services | First session completed | Treatment ends |
| **INACTIVE** | No longer receiving services (completed, cancelled, or on hold) | Treatment ends | Can reactivate to PENDING |

---

## 3. Status Workflow by State

### 3.1 PROSPECTIVE State (Referral Phase)

**Purpose**: Initial referral processing and decision-making

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `referral_submitted` | New referral entered into system | Review presenting concerns, urgency | `referral_under_review` |
| `referral_under_review` | Clinical team reviewing referral | Assess fit, capacity, requirements | `referral_accepted` or `referral_declined` |
| `referral_accepted` | Referral approved for intake | Notify client, begin pre-staging | `prestaging` |
| `referral_declined` | Referral not appropriate for services | Send decline letter, suggest alternatives | `referral_closed` |
| `referral_waitlist` | Approved but no current capacity | Monitor for openings | `referral_accepted` |
| `referral_info_needed` | Additional information required | Contact referral source | `referral_under_review` |

**State Transition**: `referral_accepted` → Move to **PENDING** state with status `prestaging`

---

### 3.2 PENDING State (Pre-Intake Phase)

**Purpose**: Prepare client for active treatment through intake process

#### 3.2.1 Pre-Staging

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `prestaging` | Initial preparation phase | Verify insurance, gather documents | `prestaging_documents_sent` |
| `prestaging_documents_sent` | Intake paperwork sent to client | Wait for return | `prestaging_documents_received` |
| `prestaging_documents_received` | All required documents received | Review for completeness | `staging_ready` |
| `prestaging_incomplete` | Missing required information | Follow up with client | `prestaging_documents_sent` |

#### 3.2.2 Staging

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `staging_ready` | Ready for therapist assignment | Review client needs, check therapist availability | `staging_matching` |
| `staging_matching` | Finding appropriate therapist match | Match based on specialty, availability, preferences | `assignment_pending` |

#### 3.2.3 Assignment

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `assignment_pending` | Therapist identified, awaiting assignment | Send assignment notification | `assignment_proposed` |
| `assignment_proposed` | Assignment sent to therapist | Wait for therapist response | `assignment_accepted` or `assignment_declined` |
| `assignment_accepted` | Therapist accepted assignment | Notify supervisor, client | `acceptance_pending` |
| `assignment_declined` | Therapist declined assignment | Return to staging | `staging_matching` |

#### 3.2.4 Acceptance (Client Acceptance)

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `acceptance_pending` | Awaiting client confirmation | Contact client with therapist info | `acceptance_scheduling` |
| `acceptance_scheduling` | Client accepted, scheduling first session | Coordinate schedules | `acceptance_scheduled` |
| `acceptance_scheduled` | First session scheduled | Send reminders, prepare clinical record | `intake_complete` |
| `acceptance_declined` | Client declined therapist match | Return to staging or close | `staging_matching` or `referral_closed` |

#### 3.2.5 Intake Completion

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `intake_complete` | All intake steps completed, awaiting first session | Prepare for session | `session_pending` |

**State Transition**: `session_pending` → After first session, move to **ACTIVE** state

---

### 3.3 ACTIVE State (Treatment Phase)

**Purpose**: Active treatment and ongoing care

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `session_pending` | First session scheduled | Conduct first session | `treatment_active` |
| `treatment_active` | Ongoing active treatment | Regular sessions, progress notes | `treatment_active` (ongoing) |
| `treatment_on_hold` | Temporary pause (client request, medical, etc.) | Document reason, set review date | `treatment_active` or `treatment_discharged` |
| `treatment_termination_planned` | Planned end of treatment approaching | Prepare discharge plan | `treatment_discharged` |

**State Transition**: Any termination status → Move to **INACTIVE** state

---

### 3.4 INACTIVE State (Post-Treatment Phase)

**Purpose**: Client no longer receiving active services

| Status | Description | Actions | Next Status |
|--------|-------------|---------|-------------|
| `treatment_discharged` | Successfully completed treatment | Send discharge summary, satisfaction survey | N/A (final) |
| `treatment_cancelled` | Client cancelled/withdrew | Document reason, send follow-up resources | N/A (final) |
| `treatment_no_show` | Client did not attend and did not reschedule | Attempt contact, document closure | N/A (final) |
| `treatment_transferred` | Transferred to another provider/facility | Send records, complete transfer paperwork | N/A (final) |
| `reactivation_requested` | Client requesting to restart services | Evaluate current needs | Return to PENDING → `staging_ready` |

---

## 4. Database Schema Changes

### 4.1 Add New Fields to Referrals Table

```typescript
export const referrals = pgTable("referrals", {
  // ... existing fields ...

  // NEW: Dual-layer tracking
  clientState: varchar("client_state", { length: 20 })
    .notNull()
    .default("prospective"), // prospective | pending | active | inactive

  workflowStatus: varchar("workflow_status", { length: 50 })
    .notNull()
    .default("referral_submitted"),

  // NEW: Enhanced workflow tracking
  preStageStartedAt: timestamp("prestage_started_at"),
  preStageCompletedAt: timestamp("prestage_completed_at"),
  stageStartedAt: timestamp("stage_started_at"),
  stageCompletedAt: timestamp("stage_completed_at"),
  assignmentStartedAt: timestamp("assignment_started_at"),
  assignmentCompletedAt: timestamp("assignment_completed_at"),
  acceptanceStartedAt: timestamp("acceptance_started_at"),
  acceptanceCompletedAt: timestamp("acceptance_completed_at"),
  intakeCompletedAt: timestamp("intake_completed_at"),
  firstSessionAt: timestamp("first_session_at"),
  lastSessionAt: timestamp("last_session_at"),
  dischargedAt: timestamp("discharged_at"),

  // NEW: Additional tracking
  documentsReceivedAt: timestamp("documents_received_at"),
  insuranceVerifiedAt: timestamp("insurance_verified_at"),
  matchingAttempts: integer("matching_attempts").default(0),
  declineReason: text("decline_reason"),
  dischargeReason: text("discharge_reason"),

  // ... existing timestamps and audit fields ...
});
```

### 4.2 Migration Strategy

1. Add new columns with defaults
2. Backfill existing records:
   - Map old `status` to new `workflowStatus`
   - Set `clientState` based on old status
3. Update application code to use new fields
4. Deprecate old `status` field (keep for 1 release for rollback)

---

## 5. Validation Rules

### 5.1 State Transitions (Valid Paths Only)

```
PROSPECTIVE -> PENDING (when referral_accepted)
PENDING -> ACTIVE (when first_session_completed)
ACTIVE -> INACTIVE (any discharge reason)
INACTIVE -> PENDING (reactivation only)

❌ PROSPECTIVE -> ACTIVE (must go through PENDING)
❌ PENDING -> INACTIVE (must complete intake or explicitly cancel)
```

### 5.2 Status Transitions

Each status has defined `allowedNextStatuses` to prevent invalid workflow jumps.

---

## 6. UI/UX Enhancements

### 6.1 Status Badge System

```
State-based color coding:
- PROSPECTIVE: Blue (#3b82f6)
- PENDING: Yellow (#eab308)
- ACTIVE: Green (#22c55e)
- INACTIVE: Gray (#6b7280)

Status detail: Shown on hover/detail view
```

### 6.2 Workflow Timeline

Visual timeline showing:
- Current state and status
- Completed stages (with timestamps)
- Next expected action
- Days in current status

### 6.3 Admin Dashboard Views

**By State:**
- Prospective Referrals (needs review)
- Pending Clients (in pre-intake)
- Active Clients (in treatment)
- Inactive Clients (discharged)

**By Action Required:**
- Needs review (referral_under_review)
- Needs assignment (staging_matching)
- Awaiting response (assignment_proposed, acceptance_pending)
- Ready for first session (session_pending)

---

## 7. Business Rules

### 7.1 Automatic Transitions

1. **Referral** `prestaging` when `referral_accepted`
2. **Move to ACTIVE** when first session completed
3. **Auto-decline** if no response after 30 days in acceptance_pending

### 7.2 Notifications

Trigger notifications on:
- State changes (to assigned staff)
- Status changes requiring action
- 7 days in same status without progress
- Missing documents reminder (14 days)

### 7.3 SLA Tracking

Track time spent in each phase:
- Referral review: Target 3 business days
- Pre-staging: Target 7 business days
- Staging/Assignment: Target 5 business days
- Acceptance: Target 10 business days

---

## 8. Reporting & Analytics

### 8.1 Key Metrics

**Conversion Rates:**
- Referrals accepted vs declined (%)
- Accepted referrals completing intake (%)
- First sessions attended vs scheduled (%)

**Time Metrics:**
- Average time in each state
- Average time referral → first session
- Bottleneck identification

**Volume Metrics:**
- Referrals by source
- Active clients by therapist
- Discharge reasons breakdown

---

## 9. API Endpoints

### 9.1 New/Updated Endpoints

```
POST   /api/referrals/:id/transition         # Move to next status
GET    /api/referrals/by-state/:state       # Filter by client state
GET    /api/referrals/:id/timeline          # Full workflow history
POST   /api/referrals/:id/reactivate        # Reactivate inactive client
GET    /api/referrals/metrics                # Dashboard metrics
```

---

## 10. Implementation Phases

### Phase 1: Schema & Backend (Week 1)
- ✅ Design document (this doc)
- [ ] Update database schema
- [ ] Create migration scripts
- [ ] Update backend APIs
- [ ] Add validation logic

### Phase 2: Admin UI (Week 2)
- [ ] Update referral list views (state-based filtering)
- [ ] Add workflow timeline component
- [ ] Create state transition buttons
- [ ] Add status change modals (with reason capture)

### Phase 3: Automation & Notifications (Week 3)
- [ ] Implement automatic transitions
- [ ] Add email notifications
- [ ] Create SLA tracking
- [ ] Build admin alerts

### Phase 4: Reporting & Analytics (Week 4)
- [ ] Create metrics dashboard
- [ ] Add state/status reports
- [ ] Build conversion funnel visualization
- [ ] Implement time-in-stage analytics

---

## 11. Examples

### 11.1 Complete Happy Path

```
1. PROSPECTIVE | referral_submitted
2. PROSPECTIVE | referral_under_review (Review by clinical team)
3. PROSPECTIVE | referral_accepted (Approved for intake)

   [State Change: PROSPECTIVE → PENDING]

4. PENDING | prestaging (Send intake documents)
5. PENDING | prestaging_documents_sent
6. PENDING | prestaging_documents_received (Client returns forms)
7. PENDING | staging_ready (Ready for matching)
8. PENDING | staging_matching (Finding therapist)
9. PENDING | assignment_pending (Therapist identified)
10. PENDING | assignment_proposed (Sent to therapist)
11. PENDING | assignment_accepted (Therapist accepts)
12. PENDING | acceptance_pending (Contacting client)
13. PENDING | acceptance_scheduling (Client agrees)
14. PENDING | acceptance_scheduled (First session booked)
15. PENDING | intake_complete (Ready for first session)
16. PENDING | session_pending (Awaiting first session)

    [State Change: PENDING → ACTIVE (After first session)]

17. ACTIVE | treatment_active (Ongoing sessions)
18. ACTIVE | treatment_termination_planned (Preparing for discharge)

    [State Change: ACTIVE → INACTIVE]

19. INACTIVE | treatment_discharged (Successfully completed)
```

### 11.2 Example with Complications

```
1. PROSPECTIVE | referral_submitted
2. PROSPECTIVE | referral_under_review
3. PROSPECTIVE | referral_info_needed (Missing referral notes)
4. PROSPECTIVE | referral_under_review (Received additional info)
5. PROSPECTIVE | referral_accepted

   [State Change: PROSPECTIVE → PENDING]

6. PENDING | prestaging
7. PENDING | prestaging_documents_sent
8. PENDING | prestaging_incomplete (Missing insurance card)
9. PENDING | prestaging_documents_sent (Resent request)
10. PENDING | prestaging_documents_received
11. PENDING | staging_ready
12. PENDING | staging_matching
13. PENDING | assignment_pending
14. PENDING | assignment_proposed (Therapist A)
15. PENDING | assignment_declined (Therapist A declined)
16. PENDING | staging_matching (Finding new match)
17. PENDING | assignment_proposed (Therapist B)
18. PENDING | assignment_accepted (Therapist B accepts)
19. PENDING | acceptance_pending
20. PENDING | acceptance_scheduling
21. PENDING | acceptance_scheduled
22. PENDING | intake_complete
23. PENDING | session_pending

    [State Change: PENDING → ACTIVE]

24. ACTIVE | treatment_active
```

---

## 12. Future Enhancements

### 12.1 Advanced Features (Post-V1)
- Automated therapist matching algorithm (ML-based)
- Client self-service portal for document upload
- Integration with scheduling system (Calendly/Acuity)
- SMS notifications for status changes
- Predictive analytics for no-show risk

### 12.2 EHR Integration
- Sync with electronic health records
- Auto-create client charts on first session
- Bi-directional status updates

---

## 13. Security & Compliance

### 13.1 HIPAA Considerations
- All status changes logged with user ID and timestamp
- PHI protected at all stages
- Access controls based on role (therapist can only see assigned clients)

### 13.2 Audit Trail
Every state/status change records:
- Who made the change
- When it occurred
- Reason for change (if applicable)
- Previous state/status

---

## Appendix A: Status Enum Definition

```typescript
export const CLIENT_STATES = [
  "prospective",
  "pending",
  "active",
  "inactive",
] as const;

export const WORKFLOW_STATUSES = {
  // Prospective (Referral Phase)
  referral_submitted: { state: "prospective", label: "Referral Submitted", color: "blue" },
  referral_under_review: { state: "prospective", label: "Under Review", color: "blue" },
  referral_accepted: { state: "prospective", label: "Referral Accepted", color: "green" },
  referral_declined: { state: "prospective", label: "Referral Declined", color: "red" },
  referral_waitlist: { state: "prospective", label: "On Waitlist", color: "yellow" },
  referral_info_needed: { state: "prospective", label: "Info Needed", color: "orange" },
  referral_closed: { state: "prospective", label: "Closed", color: "gray" },

  // Pending (Pre-Intake Phase)
  // Pre-Staging
  prestaging: { state: "pending", label: "Pre-Staging", color: "yellow" },
  prestaging_documents_sent: { state: "pending", label: "Documents Sent", color: "yellow" },
  prestaging_documents_received: { state: "pending", label: "Documents Received", color: "yellow" },
  prestaging_incomplete: { state: "pending", label: "Incomplete Documents", color: "orange" },

  // Staging
  staging_ready: { state: "pending", label: "Staging Ready", color: "yellow" },
  staging_matching: { state: "pending", label: "Finding Match", color: "yellow" },

  // Assignment
  assignment_pending: { state: "pending", label: "Assignment Pending", color: "yellow" },
  assignment_proposed: { state: "pending", label: "Assignment Proposed", color: "yellow" },
  assignment_accepted: { state: "pending", label: "Assignment Accepted", color: "green" },
  assignment_declined: { state: "pending", label: "Assignment Declined", color: "red" },

  // Acceptance
  acceptance_pending: { state: "pending", label: "Acceptance Pending", color: "yellow" },
  acceptance_scheduling: { state: "pending", label: "Scheduling", color: "yellow" },
  acceptance_scheduled: { state: "pending", label: "Scheduled", color: "green" },
  acceptance_declined: { state: "pending", label: "Client Declined", color: "red" },

  // Intake Complete
  intake_complete: { state: "pending", label: "Intake Complete", color: "green" },
  session_pending: { state: "pending", label: "Awaiting First Session", color: "green" },

  // Active (Treatment Phase)
  treatment_active: { state: "active", label: "In Treatment", color: "green" },
  treatment_on_hold: { state: "active", label: "On Hold", color: "orange" },
  treatment_termination_planned: { state: "active", label: "Termination Planned", color: "orange" },

  // Inactive (Post-Treatment)
  treatment_discharged: { state: "inactive", label: "Discharged", color: "gray" },
  treatment_cancelled: { state: "inactive", label: "Cancelled", color: "gray" },
  treatment_no_show: { state: "inactive", label: "No Show", color: "gray" },
  treatment_transferred: { state: "inactive", label: "Transferred", color: "gray" },
  reactivation_requested: { state: "inactive", label: "Reactivation Requested", color: "blue" },
} as const;
```

---

**End of Design Document**

Next steps: Review with MindFit team, gather feedback, begin Phase 1 implementation.
