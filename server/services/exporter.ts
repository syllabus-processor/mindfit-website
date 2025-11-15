// MindFit v2 - Export Orchestration Service
// Campaign 1 - Sprint 2: Complete encrypted export workflow
// Classification: TIER-1 | HIPAA-compliant intake package export

import type { Referral } from "../../schema/referrals";
import { createIntakePackageZip, type FileEntry } from "../lib/zipper";
import { getMasterKey, encrypt, calculateChecksum } from "../lib/encryption";
import {
  uploadEncryptedPackage,
  generateDownloadUrl,
  type UploadResult,
} from "../lib/spaces-client";
import { randomBytes } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOptions {
  referralId: string;
  packageName?: string;
  attachments?: FileEntry[]; // Optional file attachments
  expiresInSeconds?: number; // Pre-signed URL expiration (default: 86400 = 24h)
  createdBy?: string; // User ID for audit trail
}

export interface ExportResult {
  success: boolean;
  packageId: string;
  packageName: string;
  spacesUrl: string;
  downloadUrl: string; // Pre-signed URL
  downloadUrlExpiry: Date;
  checksumSha256: string;
  iv: string; // Encryption IV (hex)
  authTag: string; // Encryption auth tag (hex)
  encryptionKeyId: string;
  fileSizeBytes: number;
  fileSizeCompressed: number; // ZIP size before encryption
  fileSizeOriginal: number; // Original JSON size
  compressionRatio: string;
  error?: string;
}

// ============================================================================
// EXPORT WORKFLOW
// ============================================================================

/**
 * Complete encrypted export workflow
 *
 * Process:
 * 1. Fetch referral data from database
 * 2. Create ZIP bundle (JSON + optional attachments)
 * 3. Encrypt ZIP with AES-256-GCM using master key
 * 4. Calculate SHA-256 checksum
 * 5. Upload to DigitalOcean Spaces
 * 6. Generate time-limited pre-signed download URL
 * 7. Return package metadata
 *
 * @param {Referral} referral - Referral data to export
 * @param {ExportOptions} options - Export configuration
 * @returns {Promise<ExportResult>} Export result with download URL
 */
export async function exportReferralPackage(
  referral: Referral,
  options: ExportOptions
): Promise<ExportResult> {
  const packageId = randomBytes(16).toString("hex");
  const packageName = options.packageName || `Referral-${referral.clientName}-${Date.now()}`;

  try {
    console.log(`📦 Starting export for referral ${options.referralId}...`);

    // ========================================================================
    // STEP 1: CREATE ZIP BUNDLE
    // ========================================================================

    console.log("📦 Step 1/6: Creating ZIP bundle...");

    const referralData = {
      referral,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: options.createdBy || "system",
        packageId,
        packageName,
        packageVersion: "1.0",
      },
    };

    const zipResult = await createIntakePackageZip(
      referralData,
      options.attachments || []
    );

    if (!zipResult.success) {
      throw new Error(`ZIP creation failed: ${zipResult.error}`);
    }

    console.log(`✅ ZIP created: ${zipResult.size} bytes, ${zipResult.fileCount} files`);

    const originalSize = JSON.stringify(referralData).length;
    const compressedSize = zipResult.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2) + "%";

    // ========================================================================
    // STEP 2: LOAD MASTER ENCRYPTION KEY
    // ========================================================================

    console.log("🔑 Step 2/6: Loading master encryption key...");

    const masterKey = getMasterKey();
    const encryptionKeyId = "master-key-v1"; // Master key identifier

    console.log(`✅ Master key loaded (${encryptionKeyId})`);

    // ========================================================================
    // STEP 3: ENCRYPT ZIP
    // ========================================================================

    console.log("🔒 Step 3/6: Encrypting ZIP with AES-256-GCM...");

    const encryptionResult = encrypt(zipResult.zipBuffer!, masterKey);

    console.log(`✅ Encrypted: ${encryptionResult.encrypted.length} bytes`);
    console.log(`   IV: ${encryptionResult.iv}`);
    console.log(`   Auth Tag: ${encryptionResult.authTag}`);

    // ========================================================================
    // STEP 4: CALCULATE CHECKSUM
    // ========================================================================

    console.log("🔐 Step 4/6: Calculating SHA-256 checksum...");

    const checksumSha256 = calculateChecksum(encryptionResult.encrypted);

    console.log(`✅ Checksum: ${checksumSha256}`);

    // ========================================================================
    // STEP 5: UPLOAD TO DO SPACES
    // ========================================================================

    console.log("☁️  Step 5/6: Uploading to DigitalOcean Spaces...");

    const uploadResult: UploadResult = await uploadEncryptedPackage(
      encryptionResult.encrypted,
      options.referralId,
      packageId,
      {
        checksumSha256,
        iv: encryptionResult.iv,
        authTag: encryptionResult.authTag,
        encryptionKeyId,
        createdBy: options.createdBy,
      }
    );

    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    console.log(`✅ Uploaded to: ${uploadResult.url}`);

    // ========================================================================
    // STEP 6: GENERATE PRE-SIGNED DOWNLOAD URL
    // ========================================================================

    console.log("🔗 Step 6/6: Generating pre-signed download URL...");

    const expiresIn = options.expiresInSeconds || 86400; // Default: 24 hours
    const downloadUrl = await generateDownloadUrl(uploadResult.key, expiresIn);
    const downloadUrlExpiry = new Date(Date.now() + expiresIn * 1000);

    console.log(`✅ Download URL generated (expires: ${downloadUrlExpiry.toISOString()})`);

    // ========================================================================
    // RETURN RESULT
    // ========================================================================

    console.log(`✅ Export complete: ${packageId}`);

    return {
      success: true,
      packageId,
      packageName,
      spacesUrl: uploadResult.url,
      downloadUrl,
      downloadUrlExpiry,
      checksumSha256,
      iv: encryptionResult.iv,
      authTag: encryptionResult.authTag,
      encryptionKeyId,
      fileSizeBytes: encryptionResult.encrypted.length,
      fileSizeCompressed: compressedSize,
      fileSizeOriginal: originalSize,
      compressionRatio,
    };
  } catch (error: any) {
    console.error(`❌ Export failed for referral ${options.referralId}:`, error);

    return {
      success: false,
      packageId,
      packageName,
      spacesUrl: "",
      downloadUrl: "",
      downloadUrlExpiry: new Date(),
      checksumSha256: "",
      iv: "",
      authTag: "",
      encryptionKeyId: "",
      fileSizeBytes: 0,
      fileSizeCompressed: 0,
      fileSizeOriginal: 0,
      compressionRatio: "0%",
      error: error.message,
    };
  }
}

// ============================================================================
// BATCH EXPORT
// ============================================================================

export interface BatchExportResult {
  success: boolean;
  totalReferrals: number;
  successCount: number;
  failureCount: number;
  packages: ExportResult[];
  errors: Array<{ referralId: string; error: string }>;
}

/**
 * Export multiple referrals in batch
 * @param {Referral[]} referrals - Array of referrals to export
 * @param {object} commonOptions - Common export options
 * @returns {Promise<BatchExportResult>} Batch export result
 */
export async function batchExportReferrals(
  referrals: Referral[],
  commonOptions: Omit<ExportOptions, "referralId"> = {}
): Promise<BatchExportResult> {
  console.log(`📦 Starting batch export for ${referrals.length} referrals...`);

  const packages: ExportResult[] = [];
  const errors: Array<{ referralId: string; error: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  for (const referral of referrals) {
    const result = await exportReferralPackage(referral, {
      ...commonOptions,
      referralId: referral.id,
    });

    packages.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      errors.push({
        referralId: referral.id,
        error: result.error || "Unknown error",
      });
    }
  }

  console.log(`✅ Batch export complete: ${successCount}/${referrals.length} successful`);

  return {
    success: failureCount === 0,
    totalReferrals: referrals.length,
    successCount,
    failureCount,
    packages,
    errors,
  };
}

// ============================================================================
// VALIDATION & DIAGNOSTICS
// ============================================================================

/**
 * Validate export prerequisites
 * @returns {object} Validation result
 */
export function validateExportPrerequisites(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check master key
  try {
    getMasterKey();
  } catch (error: any) {
    errors.push(`Encryption key: ${error.message}`);
  }

  // Check Spaces configuration
  const spacesEndpoint = process.env.SPACES_ENDPOINT;
  const spacesKey = process.env.SPACES_KEY;
  const spacesSecret = process.env.SPACES_SECRET;
  const spacesBucket = process.env.SPACES_BUCKET;

  if (!spacesEndpoint) errors.push("SPACES_ENDPOINT not set");
  if (!spacesKey) errors.push("SPACES_KEY not set");
  if (!spacesSecret) errors.push("SPACES_SECRET not set");
  if (!spacesBucket) errors.push("SPACES_BUCKET not set");

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get export module status
 * @returns {object} Status information
 */
export function getExportStatus() {
  const validation = validateExportPrerequisites();

  return {
    ready: validation.isValid,
    prerequisites: {
      masterKey: process.env.MINDV2_AES_KEY ? "✅ Configured" : "❌ Missing",
      spacesEndpoint: process.env.SPACES_ENDPOINT ? "✅ Configured" : "❌ Missing",
      spacesKey: process.env.SPACES_KEY ? "✅ Configured" : "❌ Missing",
      spacesSecret: process.env.SPACES_SECRET ? "✅ Configured" : "❌ Missing",
      spacesBucket: process.env.SPACES_BUCKET || "mindfit-intake-packages-prod",
    },
    errors: validation.errors,
  };
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

/**
 * PRODUCTION DEPLOYMENT CHECKLIST:
 *
 * ✅ Environment Variables Required:
 *    MINDV2_AES_KEY=<64-char hex string (32 bytes)>
 *    SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
 *    SPACES_KEY=<your_access_key>
 *    SPACES_SECRET=<your_secret_key>
 *    SPACES_BUCKET=mindfit-intake-packages-prod
 *
 * ✅ Generate Master Key:
 *    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * ✅ Security Best Practices:
 *    - Master key stored in environment variable (never in code/database)
 *    - All packages encrypted before upload
 *    - Pre-signed URLs with 24-hour expiry
 *    - SHA-256 checksums for integrity verification
 *    - No PHI logged to console (only IDs and metadata)
 *    - Automatic expiration via Spaces lifecycle policy (7 days)
 *
 * ✅ HIPAA Compliance:
 *    - Encryption at rest (DO Spaces + AES-256-GCM)
 *    - Encryption in transit (HTTPS + TLS)
 *    - Access controls (private ACL, pre-signed URLs)
 *    - Audit logging (createdBy, timestamps)
 *    - Data minimization (7-day retention)
 *    - Business Associate Agreement with DigitalOcean
 *
 * ✅ Error Handling:
 *    - Graceful failures (returns error in result, doesn't throw)
 *    - No sensitive data in error messages
 *    - Detailed logging for troubleshooting (non-PHI)
 *
 * ✅ Monitoring:
 *    - Track export success/failure rates
 *    - Monitor package sizes (detect anomalies)
 *    - Alert on encryption key issues
 *    - Track pre-signed URL generation
 *
 * ⚠️  CRITICAL WARNINGS:
 *    - NEVER log master encryption key
 *    - NEVER include PHI in console logs
 *    - NEVER expose pre-signed URLs in public logs
 *    - NEVER store unencrypted packages
 *    - ALWAYS validate encryption before upload
 *    - ALWAYS use pre-signed URLs (never direct URLs)
 *
 * 📋 Usage Example:
 *    import { exportReferralPackage } from './services/exporter';
 *
 *    const result = await exportReferralPackage(referral, {
 *      referralId: referral.id,
 *      packageName: `Referral-${referral.clientName}`,
 *      createdBy: userId,
 *      expiresInSeconds: 86400, // 24 hours
 *    });
 *
 *    if (result.success) {
 *      console.log('Download URL:', result.downloadUrl);
 *      // Send notification email with download link
 *    }
 */
