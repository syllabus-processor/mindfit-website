-- MindFit Migration 003 - Workflow Tracking System
-- Add dual-layer workflow tracking (client_state + workflow_status)

-- Core workflow fields
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS client_state VARCHAR(20) NOT NULL DEFAULT 'prospective' CHECK (client_state IN ('prospective', 'pending', 'active', 'inactive'));

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) NOT NULL DEFAULT 'referral_submitted' CHECK (workflow_status IN ('referral_submitted', 'documents_requested', 'documents_received', 'insurance_verification_pending', 'insurance_verified', 'insurance_verification_failed', 'pre_stage_review', 'ready_for_assignment', 'matching_in_progress', 'therapist_identified', 'assignment_pending', 'assignment_offered', 'assignment_accepted', 'assignment_declined', 'client_contacted', 'intake_scheduled', 'intake_completed', 'waiting_first_session', 'in_treatment', 'treatment_on_hold', 'treatment_resumed', 'discharge_pending', 'discharged', 'referred_out', 'declined', 'cancelled'));

-- Timestamp fields
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS prestage_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS prestage_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stage_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stage_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assignment_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assignment_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS acceptance_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS acceptance_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_session_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS documents_received_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMP;

-- Metadata fields
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS matching_attempts INTEGER NOT NULL DEFAULT 0 CHECK (matching_attempts >= 0),
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS discharge_reason TEXT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_referrals_client_state ON referrals(client_state);
CREATE INDEX IF NOT EXISTS idx_referrals_workflow_status ON referrals(workflow_status);
CREATE INDEX IF NOT EXISTS idx_referrals_state_workflow ON referrals(client_state, workflow_status);

-- Backfill existing data
UPDATE referrals SET prestage_started_at = created_at WHERE prestage_started_at IS NULL;

UPDATE referrals SET workflow_status = CASE
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
END WHERE workflow_status = 'referral_submitted';

UPDATE referrals SET client_state = CASE
  WHEN status IN ('pending', 'under_review') THEN 'prospective'
  WHEN status IN ('assigned', 'contacted', 'scheduled') THEN 'pending'
  WHEN status = 'in_progress' THEN 'active'
  WHEN status IN ('completed', 'declined', 'cancelled', 'exported') THEN 'inactive'
  ELSE 'prospective'
END WHERE client_state = 'prospective';
