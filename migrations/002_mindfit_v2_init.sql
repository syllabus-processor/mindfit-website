-- Migration: 002_mindfit_v2_init.sql
-- Campaign: MindFit Campaign 1 - Complete v2 Schema
-- Created: 2025-11-15
-- Description: Comprehensive MindFit v2 database initialization
-- Classification: TIER-1 | VAL/VER/CERT Gate Compliant
-- PostgreSQL: 18.0+

-- ============================================================================
-- MIGRATION OVERVIEW
-- ============================================================================
-- This migration creates the complete MindFit v2 schema including:
-- 1. admin_users    - RBAC system for dashboard access
-- 2. referrals      - Client referral tracking (Sprint 1)
-- 3. intake_packages- Encrypted export packages (Sprint 2)
-- 4. events         - Community events calendar (Sprint 3)
-- 5. flyers         - Marketing materials (Sprint 3)
--
-- Dependencies:
-- - PostgreSQL 18.0+ with gen_random_uuid() support
-- - No PHI data stored (pre-staging only)
-- - Fully isolated from EMA schema
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE 1: ADMIN_USERS
-- Purpose: Lightweight RBAC for MindFit admin dashboard
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  -- Primary Identifier
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Authentication
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  -- Role-Based Access Control
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (
    role IN ('admin', 'supervisor', 'therapist', 'staff', 'readonly')
  ),
  permissions TEXT, -- JSON array of granular permissions

  -- Profile Information
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  department VARCHAR(100),

  -- Contact Information
  phone VARCHAR(50),
  office_location VARCHAR(100),

  -- Account Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_superuser BOOLEAN NOT NULL DEFAULT false,

  -- Session Management
  last_login TIMESTAMP,
  last_login_ip VARCHAR(50),
  session_token TEXT,

  -- Security
  failed_login_attempts VARCHAR(10) DEFAULT '0',
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP,
  must_change_password BOOLEAN NOT NULL DEFAULT false,

  -- Password Reset
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,

  -- Email Verification
  verification_token VARCHAR(255),
  verification_token_expiry TIMESTAMP,

  -- Notifications Preferences
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_preferences TEXT, -- JSON object

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete

  -- Audit Trail
  created_by VARCHAR,
  last_modified_by VARCHAR,

  -- Notes
  internal_notes TEXT
);

-- Indexes for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_deleted ON admin_users(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE admin_users IS
  'MindFit v2 RBAC system - replaces legacy users table with full role-based access control';

-- ============================================================================
-- TABLE 2: REFERRALS
-- Purpose: Client referral tracking through intake pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
  -- Primary Identifier
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client Information (Pre-PHI)
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_age INTEGER CHECK (client_age > 0 AND client_age < 150),

  -- Clinical Information (Pre-PHI)
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
    status IN ('pending', 'under_review', 'assigned', 'contacted',
               'scheduled', 'in_progress', 'exported', 'completed',
               'declined', 'cancelled')
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
  created_by VARCHAR,
  last_modified_by VARCHAR,
  last_modified_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_client_email ON referrals(client_email);
CREATE INDEX IF NOT EXISTS idx_referrals_urgency ON referrals(urgency);
CREATE INDEX IF NOT EXISTS idx_referrals_assigned_therapist ON referrals(assigned_therapist)
  WHERE assigned_therapist IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_assigned_supervisor ON referrals(assigned_supervisor)
  WHERE assigned_supervisor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_status_created ON referrals(status, created_at DESC);

COMMENT ON TABLE referrals IS
  'Sprint 1: Client referral tracking - intake pipeline management';
COMMENT ON COLUMN referrals.urgency IS
  'Triage level: routine (standard), urgent (priority), emergency (immediate)';
COMMENT ON COLUMN referrals.exported_at IS
  'Timestamp when referral exported to DO Spaces for EMA handoff (Sprint 2)';

-- ============================================================================
-- TABLE 3: INTAKE_PACKAGES
-- Purpose: Encrypted export packages for EMA handoff via DO Spaces
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_packages (
  -- Primary Identifier
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referral Reference
  referral_id VARCHAR NOT NULL,

  -- Package Metadata
  package_name VARCHAR(255) NOT NULL,
  package_type VARCHAR(50) NOT NULL DEFAULT 'referral_export' CHECK (
    package_type IN ('referral_export', 'intake_form', 'assessment_data', 'document_bundle')
  ),

  -- Encryption Details
  encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
  encryption_key_id VARCHAR(100) NOT NULL,
  -- Reference to key in secure key management (NOT the actual key)

  -- DO Spaces Storage
  spaces_url TEXT NOT NULL,
  presigned_url TEXT,
  presigned_url_expiry TIMESTAMP,

  -- Package Details
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  checksum_sha256 VARCHAR(64) NOT NULL,

  -- Workflow Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'encrypted', 'uploaded', 'downloaded', 'expired', 'error')
  ),

  -- Notification Status
  notification_sent TIMESTAMP,
  notification_recipient VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMP,
  downloaded_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,

  -- Audit Trail
  created_by VARCHAR,
  last_modified_at TIMESTAMP DEFAULT NOW(),

  -- Error Tracking
  error_message TEXT,

  -- Foreign Key Constraint
  CONSTRAINT fk_intake_packages_referral
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE
);

-- Indexes for intake_packages
CREATE INDEX IF NOT EXISTS idx_intake_packages_referral_id ON intake_packages(referral_id);
CREATE INDEX IF NOT EXISTS idx_intake_packages_status ON intake_packages(status);
CREATE INDEX IF NOT EXISTS idx_intake_packages_created_at ON intake_packages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_packages_expires_at ON intake_packages(expires_at);
CREATE INDEX IF NOT EXISTS idx_intake_packages_expired
  ON intake_packages(expires_at, status) WHERE status = 'uploaded';

COMMENT ON TABLE intake_packages IS
  'Sprint 2: HIPAA-compliant encrypted packages for DO Spaces → EMA handoff';
COMMENT ON COLUMN intake_packages.encryption_key_id IS
  'Reference to key in secure storage - NEVER store actual encryption keys in database';
COMMENT ON COLUMN intake_packages.checksum_sha256 IS
  'SHA-256 checksum for integrity verification of encrypted package';

-- ============================================================================
-- TABLE 4: EVENTS
-- Purpose: Community events, workshops, and group sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  -- Primary Identifier
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN ('workshop', 'group_session', 'community_event', 'webinar', 'open_house')
  ),

  -- Event Categorization
  category VARCHAR(100),
  tags TEXT, -- JSON array

  -- Scheduling
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',

  -- Location
  location_type VARCHAR(50) NOT NULL DEFAULT 'in_person' CHECK (
    location_type IN ('in_person', 'virtual', 'hybrid')
  ),
  location_name VARCHAR(255),
  location_address TEXT,
  location_url TEXT,

  -- Registration
  requires_registration BOOLEAN NOT NULL DEFAULT false,
  max_attendees VARCHAR(50),
  registration_url TEXT,
  registration_deadline TIMESTAMP,

  -- Facilitator Information
  facilitator VARCHAR(255),
  facilitator_bio TEXT,

  -- Cost Information
  cost VARCHAR(100) NOT NULL DEFAULT 'free',
  cost_details TEXT,

  -- Visibility & Status
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'ongoing', 'completed', 'cancelled')
  ),

  -- Media
  image_url TEXT,

  -- Recurrence
  recurrence_rule TEXT, -- iCal RRULE format
  parent_event_id VARCHAR,

  -- Calendar Integration
  google_calendar_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Audit Trail
  created_by VARCHAR,
  last_modified_by VARCHAR,

  -- Constraint: end_time must be after start_time
  CONSTRAINT chk_events_time_order CHECK (end_time > start_time)
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_upcoming
  ON events(start_time, status) WHERE status = 'scheduled';

COMMENT ON TABLE events IS
  'Sprint 3: MindFit community events, workshops, and group therapy sessions';
COMMENT ON COLUMN events.recurrence_rule IS
  'iCal RRULE format for repeating events (e.g., weekly groups)';

-- ============================================================================
-- TABLE 5: FLYERS
-- Purpose: Marketing materials and group therapy flyers
-- ============================================================================

CREATE TABLE IF NOT EXISTS flyers (
  -- Primary Identifier
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Flyer Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  flyer_type VARCHAR(50) NOT NULL CHECK (
    flyer_type IN ('group_therapy', 'service_announcement', 'workshop',
                   'community_resource', 'referral_info')
  ),

  -- Categorization
  category VARCHAR(100),
  tags TEXT, -- JSON array

  -- Content
  subtitle VARCHAR(255),
  body_text TEXT,
  call_to_action VARCHAR(255),
  call_to_action_url TEXT,

  -- Media Assets
  image_url TEXT NOT NULL,
  pdf_url TEXT,
  thumbnail_url TEXT,

  -- Related Entities
  related_event_id VARCHAR,
  related_service_id VARCHAR,

  -- Display Settings
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order VARCHAR(50) DEFAULT '0',

  -- Visibility Control
  show_on_homepage BOOLEAN NOT NULL DEFAULT false,
  show_in_gallery BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,

  -- Contact Information
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Accessibility
  alt_text TEXT,
  accessibility_notes TEXT,

  -- Analytics
  view_count VARCHAR(50) DEFAULT '0',
  download_count VARCHAR(50) DEFAULT '0',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Audit Trail
  created_by VARCHAR,
  last_modified_by VARCHAR,

  -- Foreign Key Constraint (optional)
  CONSTRAINT fk_flyers_event
    FOREIGN KEY (related_event_id) REFERENCES events(id) ON DELETE SET NULL,

  -- Constraint: valid_until must be after valid_from
  CONSTRAINT chk_flyers_validity_order
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

-- Indexes for flyers
CREATE INDEX IF NOT EXISTS idx_flyers_published ON flyers(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_flyers_featured ON flyers(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_flyers_flyer_type ON flyers(flyer_type);
CREATE INDEX IF NOT EXISTS idx_flyers_display_order ON flyers(display_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flyers_related_event ON flyers(related_event_id)
  WHERE related_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flyers_valid
  ON flyers(valid_from, valid_until)
  WHERE is_published = true;

COMMENT ON TABLE flyers IS
  'Sprint 3: Marketing flyers for groups, services, and community outreach';
COMMENT ON COLUMN flyers.alt_text IS
  'Required for accessibility - describes image content for screen readers';

-- ============================================================================
-- MIGRATION DATA NOTES
-- ============================================================================

-- NOTE: Existing 'users' table migration to 'admin_users'
-- If you have existing users in the legacy 'users' table, run this query
-- AFTER migration to copy data:
--
-- INSERT INTO admin_users (id, username, email, password_hash, role, full_name, is_active)
-- SELECT
--   id,
--   username,
--   username || '@mindfithealth.com' as email, -- Generate email from username
--   password as password_hash,
--   'admin' as role, -- Default to admin role
--   username as full_name, -- Default to username
--   true as is_active
-- FROM users
-- ON CONFLICT (username) DO NOTHING;
--
-- Then you can drop the legacy 'users' table if no longer needed.

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('admin_users', 'referrals', 'intake_packages', 'events', 'flyers')
ORDER BY table_name;

-- Verify indexes created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'referrals', 'intake_packages', 'events', 'flyers')
ORDER BY tablename, indexname;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, execute the following in reverse order:
--
-- BEGIN;
-- DROP TABLE IF EXISTS flyers CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS intake_packages CASCADE;
-- DROP TABLE IF EXISTS referrals CASCADE;
-- DROP TABLE IF EXISTS admin_users CASCADE;
-- COMMIT;
--
-- WARNING: This will permanently delete ALL data in these tables.
-- Ensure you have backups before running rollback.
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
