-- Migration: 001_create_referrals_table.sql
-- Campaign: MindFit Campaign 1
-- Sprint: Sprint 1 - Referral CRM System
-- Created: 2025-11-15
-- Description: Creates referrals table for MindFit CRM-lite referral tracking system
-- Classification: TIER-1 | VAL Gate 1

-- ============================================================================
-- TABLE: referrals
-- Purpose: Track client referrals from intake through assignment and export
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
  -- Primary Identifier
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client Information
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_age INTEGER CHECK (client_age > 0 AND client_age < 150),

  -- Clinical Information
  presenting_concerns TEXT NOT NULL,
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('routine', 'urgent', 'emergency')),

  -- Insurance Information
  insurance_provider VARCHAR(255),
  insurance_member_id VARCHAR(100),

  -- Referral Metadata
  referral_source VARCHAR(255),
  referral_notes TEXT,

  -- Workflow Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'under_review', 'assigned', 'contacted', 'scheduled', 'in_progress', 'exported', 'completed', 'declined', 'cancelled')
  ),

  -- Assignment Tracking
  assigned_therapist VARCHAR(255),
  assigned_supervisor VARCHAR(255),
  assignment_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  assigned_at TIMESTAMP,
  exported_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Audit Trail
  created_by VARCHAR REFERENCES users(id),
  last_modified_by VARCHAR REFERENCES users(id),
  last_modified_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES: Performance optimization for common queries
-- ============================================================================

-- Status-based queries (dashboard views, workflow filtering)
CREATE INDEX IF NOT EXISTS idx_referrals_status
  ON referrals(status);

-- Chronological queries (recent referrals, date range filtering)
CREATE INDEX IF NOT EXISTS idx_referrals_created_at
  ON referrals(created_at DESC);

-- Client lookup (duplicate detection, search)
CREATE INDEX IF NOT EXISTS idx_referrals_client_email
  ON referrals(client_email);

-- Urgency-based queries (emergency flagging, priority sorting)
CREATE INDEX IF NOT EXISTS idx_referrals_urgency
  ON referrals(urgency);

-- Assignment queries (therapist workload, supervisor review)
CREATE INDEX IF NOT EXISTS idx_referrals_assigned_therapist
  ON referrals(assigned_therapist) WHERE assigned_therapist IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_assigned_supervisor
  ON referrals(assigned_supervisor) WHERE assigned_supervisor IS NOT NULL;

-- Composite index for dashboard queries (status + created_at)
CREATE INDEX IF NOT EXISTS idx_referrals_status_created
  ON referrals(status, created_at DESC);

-- ============================================================================
-- COMMENTS: Documentation for database administrators
-- ============================================================================

COMMENT ON TABLE referrals IS
  'MindFit referral tracking system - Sprint 1 | Campaign 1';

COMMENT ON COLUMN referrals.urgency IS
  'Triage level: routine (standard intake), urgent (priority assignment), emergency (immediate attention)';

COMMENT ON COLUMN referrals.status IS
  'Workflow state: pending → under_review → assigned → contacted → scheduled → in_progress → exported → completed';

COMMENT ON COLUMN referrals.exported_at IS
  'Timestamp when referral package was exported to DO Spaces for EMA handoff (Sprint 2)';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_referrals_status_created;
-- DROP INDEX IF EXISTS idx_referrals_assigned_supervisor;
-- DROP INDEX IF EXISTS idx_referrals_assigned_therapist;
-- DROP INDEX IF EXISTS idx_referrals_urgency;
-- DROP INDEX IF EXISTS idx_referrals_client_email;
-- DROP INDEX IF EXISTS idx_referrals_created_at;
-- DROP INDEX IF EXISTS idx_referrals_status;
-- DROP TABLE IF EXISTS referrals;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
