-- Migration: 003_add_workflow_tracking.sql
-- Campaign: MindFit Campaign 1
-- Sprint: Sprint 6.5 - Client Workflow System (Phase 1)
-- Created: 2025-11-16
-- Description: Adds dual-layer workflow tracking system to referrals table
-- Classification: TIER-1 | Phase 1 Backend Infrastructure
-- Related: CLIENT_WORKFLOW_DESIGN.md

-- ============================================================================
-- OVERVIEW: Dual-Layer Workflow Tracking
-- ============================================================================
-- This migration implements a comprehensive workflow system with:
--   1. Client State (4 high-level states): prospective → pending → active → inactive
--   2. Workflow Status (25+ detailed statuses): referral_submitted → ... → discharged
--   3. Phase Timestamps: Track time spent in each workflow phase
--   4. Workflow Metadata: Matching attempts, decline/discharge reasons
--
-- BACKWARD COMPATIBILITY:
--   - Legacy 'status' field preserved (DEPRECATED but functional)
--   - All new fields are nullable for existing records
--   - No breaking changes to existing API contracts

-- ============================================================================
-- STEP 1: Add Client State and Workflow Status Fields
-- ============================================================================

-- Client lifecycle state (high-level)
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS client_state VARCHAR(20) NOT NULL DEFAULT 'prospective'
  CHECK (client_state IN ('prospective', 'pending', 'active', 'inactive'));

-- Detailed workflow status (granular tracking)
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) NOT NULL DEFAULT 'referral_submitted'
  CHECK (workflow_status IN (
    -- Pre-Staging Phase (7 statuses)
    'referral_submitted', 'documents_requested', 'documents_received',
    'insurance_verification_pending', 'insurance_verified', 'insurance_verification_failed',
    'pre_stage_review',
    -- Staging Phase (3 statuses)
    'ready_for_assignment', 'matching_in_progress', 'therapist_identified',
    -- Assignment Phase (4 statuses)
    'assignment_pending', 'assignment_offered', 'assignment_accepted', 'assignment_declined',
    -- Acceptance Phase (4 statuses)
    'client_contacted', 'intake_scheduled', 'intake_completed', 'waiting_first_session',
    -- Active Treatment Phase (3 statuses)
    'in_treatment', 'treatment_on_hold', 'treatment_resumed',
    -- Completion Phase (4 statuses)
    'discharge_pending', 'discharged', 'referred_out', 'declined', 'cancelled'
  ));

-- ============================================================================
-- STEP 2: Add Workflow Phase Timestamps
-- ============================================================================

-- Pre-Staging Phase timestamps
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS prestage_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS prestage_completed_at TIMESTAMP;

-- Staging Phase timestamps
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS stage_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stage_completed_at TIMESTAMP;

-- Assignment Phase timestamps
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS assignment_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assignment_completed_at TIMESTAMP;

-- Acceptance Phase timestamps
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS acceptance_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS acceptance_completed_at TIMESTAMP;

-- Treatment timestamps
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_session_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMP;

-- Document and verification timestamps
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS documents_received_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMP;

-- ============================================================================
-- STEP 3: Add Workflow Metadata Fields
-- ============================================================================

-- Matching attempts counter (tracks therapist assignment attempts)
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS matching_attempts INTEGER NOT NULL DEFAULT 0
  CHECK (matching_attempts >= 0);

-- Decline/discharge reasons (audit trail for workflow exits)
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS discharge_reason TEXT;

-- ============================================================================
-- STEP 4: Create Indexes for Workflow Queries
-- ============================================================================

-- Client state filtering (dashboard views by lifecycle stage)
CREATE INDEX IF NOT EXISTS idx_referrals_client_state
  ON referrals(client_state);

-- Workflow status filtering (detailed status views)
CREATE INDEX IF NOT EXISTS idx_referrals_workflow_status
  ON referrals(workflow_status);

-- Composite index for state + status queries
CREATE INDEX IF NOT EXISTS idx_referrals_state_workflow
  ON referrals(client_state, workflow_status);

-- Phase timestamp queries (SLA tracking, bottleneck analysis)
CREATE INDEX IF NOT EXISTS idx_referrals_prestage_started
  ON referrals(prestage_started_at) WHERE prestage_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_stage_started
  ON referrals(stage_started_at) WHERE stage_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_assignment_started
  ON referrals(assignment_started_at) WHERE assignment_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_acceptance_started
  ON referrals(acceptance_started_at) WHERE acceptance_started_at IS NOT NULL;

-- Active treatment queries
CREATE INDEX IF NOT EXISTS idx_referrals_first_session
  ON referrals(first_session_at) WHERE first_session_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_discharged
  ON referrals(discharged_at) WHERE discharged_at IS NOT NULL;

-- Matching attempts (identify difficult-to-place clients)
CREATE INDEX IF NOT EXISTS idx_referrals_matching_attempts
  ON referrals(matching_attempts) WHERE matching_attempts > 0;

-- ============================================================================
-- STEP 5: Update Existing Records (Data Migration)
-- ============================================================================

-- Set initial workflow phase start timestamp for existing records
UPDATE referrals
SET prestage_started_at = created_at
WHERE prestage_started_at IS NULL;

-- Map legacy status to new workflow_status (best-effort backward compat)
UPDATE referrals
SET workflow_status = CASE
  WHEN status = 'pending' THEN 'referral_submitted'
  WHEN status = 'under_review' THEN 'pre_stage_review'
  WHEN status = 'assigned' THEN 'assignment_accepted'
  WHEN status = 'contacted' THEN 'client_contacted'
  WHEN status = 'scheduled' THEN 'intake_scheduled'
  WHEN status = 'in_progress' THEN 'in_treatment'
  WHEN status = 'completed' THEN 'discharged'
  WHEN status = 'declined' THEN 'declined'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'referral_submitted'
END
WHERE workflow_status = 'referral_submitted';

-- Map legacy status to client_state
UPDATE referrals
SET client_state = CASE
  WHEN status IN ('pending', 'under_review') THEN 'prospective'
  WHEN status IN ('assigned', 'contacted', 'scheduled') THEN 'pending'
  WHEN status = 'in_progress' THEN 'active'
  WHEN status IN ('completed', 'declined', 'cancelled', 'exported') THEN 'inactive'
  ELSE 'prospective'
END
WHERE client_state = 'prospective';

-- ============================================================================
-- STEP 6: Add Column Comments (Documentation)
-- ============================================================================

COMMENT ON COLUMN referrals.client_state IS
  'High-level lifecycle state: prospective (pre-staging) → pending (staging/assignment) → active (treatment) → inactive (discharged/declined)';

COMMENT ON COLUMN referrals.workflow_status IS
  'Detailed workflow status tracking 25+ states across Pre-Staging, Staging, Assignment, Acceptance, Treatment, and Completion phases';

COMMENT ON COLUMN referrals.prestage_started_at IS
  'Timestamp when referral entered Pre-Staging phase (document collection, insurance verification)';

COMMENT ON COLUMN referrals.stage_started_at IS
  'Timestamp when referral entered Staging phase (ready for therapist matching)';

COMMENT ON COLUMN referrals.assignment_started_at IS
  'Timestamp when therapist assignment process began';

COMMENT ON COLUMN referrals.acceptance_started_at IS
  'Timestamp when client acceptance process began (intake scheduling)';

COMMENT ON COLUMN referrals.matching_attempts IS
  'Number of therapist assignment attempts (high values indicate difficult placements)';

COMMENT ON COLUMN referrals.decline_reason IS
  'Reason why referral was declined (client declined, therapist unavailable, out of scope, etc.)';

COMMENT ON COLUMN referrals.discharge_reason IS
  'Reason for client discharge (treatment completed, client request, insurance issues, etc.)';

COMMENT ON COLUMN referrals.status IS
  'DEPRECATED: Legacy status field kept for backward compatibility. Use workflow_status and client_state instead.';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration (WARNING: DESTRUCTIVE):
/*
-- Drop indexes
DROP INDEX IF EXISTS idx_referrals_matching_attempts;
DROP INDEX IF EXISTS idx_referrals_discharged;
DROP INDEX IF EXISTS idx_referrals_first_session;
DROP INDEX IF EXISTS idx_referrals_acceptance_started;
DROP INDEX IF EXISTS idx_referrals_assignment_started;
DROP INDEX IF EXISTS idx_referrals_stage_started;
DROP INDEX IF EXISTS idx_referrals_prestage_started;
DROP INDEX IF EXISTS idx_referrals_state_workflow;
DROP INDEX IF EXISTS idx_referrals_workflow_status;
DROP INDEX IF EXISTS idx_referrals_client_state;

-- Drop columns (DESTRUCTIVE - loses workflow history)
ALTER TABLE referrals
  DROP COLUMN IF EXISTS discharge_reason,
  DROP COLUMN IF EXISTS decline_reason,
  DROP COLUMN IF EXISTS matching_attempts,
  DROP COLUMN IF EXISTS insurance_verified_at,
  DROP COLUMN IF EXISTS documents_received_at,
  DROP COLUMN IF EXISTS discharged_at,
  DROP COLUMN IF EXISTS last_session_at,
  DROP COLUMN IF EXISTS first_session_at,
  DROP COLUMN IF EXISTS intake_completed_at,
  DROP COLUMN IF EXISTS acceptance_completed_at,
  DROP COLUMN IF EXISTS acceptance_started_at,
  DROP COLUMN IF EXISTS assignment_completed_at,
  DROP COLUMN IF EXISTS assignment_started_at,
  DROP COLUMN IF EXISTS stage_completed_at,
  DROP COLUMN IF EXISTS stage_started_at,
  DROP COLUMN IF EXISTS prestage_completed_at,
  DROP COLUMN IF EXISTS prestage_started_at,
  DROP COLUMN IF EXISTS workflow_status,
  DROP COLUMN IF EXISTS client_state;
*/

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify success)
-- ============================================================================

-- Verify all new columns exist
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'referrals'
  AND column_name IN (
    'client_state', 'workflow_status', 'prestage_started_at', 'stage_started_at',
    'assignment_started_at', 'acceptance_started_at', 'intake_completed_at',
    'matching_attempts', 'decline_reason', 'discharge_reason'
  )
ORDER BY column_name;

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'referrals'
  AND indexname LIKE 'idx_referrals_%workflow%'
   OR indexname LIKE 'idx_referrals_%state%'
   OR indexname LIKE 'idx_referrals_%started%'
   OR indexname LIKE 'idx_referrals_matching%';

-- Verify data migration (check status distribution)
SELECT
  client_state,
  workflow_status,
  status AS legacy_status,
  COUNT(*) as count
FROM referrals
GROUP BY client_state, workflow_status, status
ORDER BY client_state, workflow_status;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
