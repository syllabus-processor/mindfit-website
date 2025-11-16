// MindFit v2 - DigitalOcean Spaces Client (Focused Export Module)
// Campaign 1 - Sprint 2: S3-compatible storage for encrypted intake packages
// Classification: TIER-1 | Air-gap architecture

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPACES_CONFIG = {
  endpoint: process.env.SPACES_ENDPOINT || "",
  accessKeyId: process.env.SPACES_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY || "",
  bucket: process.env.SPACES_BUCKET || "mindfit-intake-packages-prod",
  region: process.env.SPACES_REGION || "us-east-1", // DigitalOcean Spaces region
};

// Validate configuration on module load
function validateConfig(): boolean {
  const missing = [];
  if (!SPACES_CONFIG.endpoint) missing.push("SPACES_ENDPOINT");
  if (!SPACES_CONFIG.accessKeyId) missing.push("SPACES_ACCESS_KEY_ID");
  if (!SPACES_CONFIG.secretAccessKey) missing.push("SPACES_SECRET_ACCESS_KEY");

  if (missing.length > 0) {
    console.error(`❌ Missing DO Spaces configuration: ${missing.join(", ")}`);
    return false;
  }

  return true;
}

const isConfigured = validateConfig();

// ============================================================================
// S3 CLIENT
// ============================================================================

let s3Client: S3Client | null = null;

/**
 * Get or initialize S3 client for DigitalOcean Spaces
 * @returns {S3Client} Configured S3 client
 * @throws {Error} If configuration is missing
 */
function getClient(): S3Client {
  if (!isConfigured) {
    throw new Error(
      "DigitalOcean Spaces not configured. Set SPACES_ENDPOINT, SPACES_ACCESS_KEY_ID, SPACES_SECRET_ACCESS_KEY environment variables."
    );
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: SPACES_CONFIG.region,
      endpoint: SPACES_CONFIG.endpoint,
      credentials: {
        accessKeyId: SPACES_CONFIG.accessKeyId,
        secretAccessKey: SPACES_CONFIG.secretAccessKey,
      },
      forcePathStyle: false,
    });
    console.log(`✅ DO Spaces client initialized: ${SPACES_CONFIG.bucket}`);
  }

  return s3Client;
}

// ============================================================================
// UPLOAD OPERATIONS
// ============================================================================

export interface UploadResult {
  success: boolean;
  url: string; // Full object URL
  key: string; // Object key within bucket
  bucket: string;
  size: number;
  error?: string;
}

/**
 * Upload encrypted package to DigitalOcean Spaces
 * @param {Buffer} encryptedData - Encrypted ZIP file buffer
 * @param {string} referralId - Referral ID for folder organization
 * @param {string} packageId - Unique package ID
 * @param {object} metadata - Package metadata
 * @returns {Promise<UploadResult>} Upload result with URL
 */
export async function uploadEncryptedPackage(
  encryptedData: Buffer,
  referralId: string,
  packageId: string,
  metadata: {
    checksumSha256: string;
    iv: string;
    authTag: string;
    encryptionKeyId: string;
    createdBy?: string;
  }
): Promise<UploadResult> {
  try {
    const client = getClient();

    // Generate key with organized folder structure
    // Format: YYYY/MM/referralId/packageId.enc
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const key = `${year}/${month}/${referralId}/${packageId}.enc`;

    const command = new PutObjectCommand({
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
      Body: encryptedData,
      ContentType: "application/octet-stream",
      ACL: "private",
      Metadata: {
        referral_id: referralId,
        package_id: packageId,
        checksum_sha256: metadata.checksumSha256,
        iv: metadata.iv,
        auth_tag: metadata.authTag,
        encryption_key_id: metadata.encryptionKeyId,
        created_by: metadata.createdBy || "system",
        created_at: now.toISOString(),
      },
    });

    await client.send(command);

    const url = `${SPACES_CONFIG.endpoint}/${SPACES_CONFIG.bucket}/${key}`;

    console.log(`✅ Package uploaded: ${key} (${encryptedData.length} bytes)`);

    return {
      success: true,
      url,
      key,
      bucket: SPACES_CONFIG.bucket,
      size: encryptedData.length,
    };
  } catch (error: any) {
    console.error("❌ DO Spaces upload failed:", error);
    return {
      success: false,
      url: "",
      key: "",
      bucket: SPACES_CONFIG.bucket,
      size: encryptedData.length,
      error: error.message,
    };
  }
}

// ============================================================================
// PRE-SIGNED URL OPERATIONS
// ============================================================================

/**
 * Generate time-limited pre-signed download URL
 * @param {string} key - Object key in Spaces
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 24 hours)
 * @returns {Promise<string>} Pre-signed URL
 */
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 86400
): Promise<string> {
  try {
    const client = getClient();

    const command = new GetObjectCommand({
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });

    console.log(`🔗 Pre-signed URL generated: ${key} (expires in ${expiresIn}s)`);

    return url;
  } catch (error: any) {
    console.error("❌ Failed to generate pre-signed URL:", error);
    throw new Error(`Pre-signed URL generation failed: ${error.message}`);
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

export interface DeleteResult {
  success: boolean;
  key: string;
  error?: string;
}

/**
 * Delete expired package from Spaces
 * @param {string} key - Object key to delete
 * @returns {Promise<DeleteResult>} Deletion result
 */
export async function deletePackage(key: string): Promise<DeleteResult> {
  try {
    const client = getClient();

    const command = new DeleteObjectCommand({
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
    });

    await client.send(command);

    console.log(`🗑️  Package deleted: ${key}`);

    return {
      success: true,
      key,
    };
  } catch (error: any) {
    console.error("❌ DO Spaces deletion failed:", error);
    return {
      success: false,
      key,
      error: error.message,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract key from full Spaces URL
 * @param {string} url - Full Spaces URL
 * @returns {string} Object key
 */
export function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    // Skip bucket name (first part)
    return pathParts.slice(1).join("/");
  } catch (error) {
    console.error("❌ Invalid Spaces URL:", url);
    return "";
  }
}

/**
 * Build full Spaces URL from key
 * @param {string} key - Object key
 * @returns {string} Full Spaces URL
 */
export function buildSpacesUrl(key: string): string {
  return `${SPACES_CONFIG.endpoint}/${SPACES_CONFIG.bucket}/${key}`;
}

/**
 * Check if Spaces client is configured
 * @returns {boolean} True if configured
 */
export function isSpacesConfigured(): boolean {
  return isConfigured;
}

/**
 * Get current configuration (without exposing secrets)
 * @returns {object} Sanitized configuration
 */
export function getSpacesConfig() {
  return {
    endpoint: SPACES_CONFIG.endpoint,
    bucket: SPACES_CONFIG.bucket,
    isConfigured,
  };
}

// ============================================================================
// LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Get package age in days
 * @param {string} key - Object key (format: YYYY/MM/referralId/packageId.enc)
 * @returns {number} Age in days
 */
export function getPackageAge(key: string): number {
  try {
    // Extract date from key (YYYY/MM/...)
    const parts = key.split("/");
    if (parts.length >= 2) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // 0-indexed
      const packageDate = new Date(year, month, 1);
      const now = new Date();
      const ageMs = now.getTime() - packageDate.getTime();
      return Math.floor(ageMs / (1000 * 60 * 60 * 24));
    }
  } catch (error) {
    console.error("❌ Failed to parse package age from key:", key);
  }
  return 0;
}

/**
 * Check if package should be expired (7+ days old)
 * @param {string} key - Object key
 * @returns {boolean} True if expired
 */
export function isPackageExpired(key: string): boolean {
  const age = getPackageAge(key);
  return age >= 7;
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

/**
 * PRODUCTION DEPLOYMENT CHECKLIST:
 *
 * ✅ Environment Variables Required:
 *    SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
 *    SPACES_ACCESS_KEY_ID=<your_access_key>
 *    SPACES_SECRET_ACCESS_KEY=<your_secret_key>
 *    SPACES_BUCKET=mindfit-intake-packages-prod
 *
 * ✅ Bucket Configuration:
 *    - ACL: Private (default)
 *    - CORS: Disabled (not needed for server-side access)
 *    - Lifecycle Policy: Auto-delete after 7 days
 *    - Access Logging: Enabled for audit trail
 *    - Versioning: Disabled (not needed)
 *
 * ✅ Lifecycle Policy Example (apply via doctl or UI):
 *    {
 *      "Rules": [{
 *        "ID": "delete-after-7-days",
 *        "Status": "Enabled",
 *        "Prefix": "",
 *        "Expiration": { "Days": 7 }
 *      }]
 *    }
 *
 * ✅ Security Best Practices:
 *    - Use private ACL for all uploads
 *    - Pre-signed URLs with 24-hour expiry
 *    - Store only encrypted data
 *    - Enable access logging
 *    - Regular audit of bucket contents
 *    - Monitor for unauthorized access
 *
 * ✅ HIPAA Compliance:
 *    - Encryption at rest (Spaces provides this)
 *    - Encryption in transit (HTTPS only)
 *    - Access logging enabled
 *    - Business Associate Agreement (BAA) with DigitalOcean
 *    - Automatic deletion after 7 days
 *    - No PHI in metadata or logs
 *
 * ⚠️  CRITICAL:
 *    - NEVER log Spaces credentials
 *    - NEVER expose pre-signed URLs in public logs
 *    - NEVER store unencrypted PHI in Spaces
 *    - ALWAYS validate encryption before upload
 */
