// MindFit v2 Schema - Barrel Export
// Campaign 1: Complete database schema for MindFit CRM-lite system
// Classification: TIER-1

// ============================================================================
// ADMIN USERS - Lightweight RBAC
// ============================================================================
export {
  adminUsers,
  insertAdminUserSchema,
  updateAdminUserSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  ROLE_PERMISSIONS,
  type AdminUser,
  type InsertAdminUser,
  type UpdateAdminUser,
  type LoginCredentials,
  type PasswordResetRequest,
  type PasswordReset,
} from "./admin_users";

// ============================================================================
// REFERRALS - Sprint 1: Client Referral Tracking
// ============================================================================
export {
  referrals,
  insertReferralSchema,
  updateReferralSchema,
  type Referral,
  type InsertReferral,
  type UpdateReferral,
} from "./referrals";

// ============================================================================
// INTAKE PACKAGES - Sprint 2: Encrypted Export to DO Spaces
// ============================================================================
export {
  intakePackages,
  insertIntakePackageSchema,
  updateIntakePackageSchema,
  getDefaultExpiration,
  getPresignedUrlExpiration,
  type IntakePackage,
  type InsertIntakePackage,
  type UpdateIntakePackage,
} from "./intake_packages";

// ============================================================================
// EVENTS - Sprint 3: Community Events Calendar
// ============================================================================
export {
  events,
  insertEventSchema,
  updateEventSchema,
  type Event,
  type InsertEvent,
  type UpdateEvent,
} from "./events";

// ============================================================================
// FLYERS - Sprint 3: Marketing Materials
// ============================================================================
export {
  flyers,
  insertFlyerSchema,
  updateFlyerSchema,
  type Flyer,
  type InsertFlyer,
  type UpdateFlyer,
} from "./flyers";
