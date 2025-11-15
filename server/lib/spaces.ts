// MindFit v2 - DigitalOcean Spaces Client
// Campaign 1 - Sprint 2: S3-compatible object storage for encrypted package handoff
// Classification: TIER-1 | Air-gap architecture for MindFit → EMA handoff

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SpacesConfig {
  region: string; // e.g., "nyc3", "sfo3"
  endpoint: string; // e.g., "https://nyc3.digitaloceanspaces.com"
  bucket: string; // e.g., "rsl-ema-prod-bucket"
  accessKeyId: string; // DO Spaces access key
  secretAccessKey: string; // DO Spaces secret key
}

// Default configuration (override with environment variables)
const defaultConfig: SpacesConfig = {
  region: process.env.DO_SPACES_REGION || "nyc3",
  endpoint: process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
  bucket: process.env.DO_SPACES_BUCKET || "rsl-ema-prod-bucket",
  accessKeyId: process.env.DO_SPACES_KEY || "",
  secretAccessKey: process.env.DO_SPACES_SECRET || "",
};

// ============================================================================
// S3 CLIENT INITIALIZATION
// ============================================================================

let s3Client: S3Client | null = null;
let currentConfig: SpacesConfig | null = null;

/**
 * Initialize or get S3 client for DigitalOcean Spaces
 * @param {SpacesConfig} config - Optional configuration override
 * @returns {S3Client} Configured S3 client
 */
export function getSpacesClient(config?: Partial<SpacesConfig>): S3Client {
  const finalConfig = { ...defaultConfig, ...config };

  // Return existing client if config hasn't changed
  if (s3Client && currentConfig && JSON.stringify(currentConfig) === JSON.stringify(finalConfig)) {
    return s3Client;
  }

  // Validate configuration
  if (!finalConfig.accessKeyId || !finalConfig.secretAccessKey) {
    throw new Error(
      "DigitalOcean Spaces credentials not configured. " +
      "Set DO_SPACES_KEY and DO_SPACES_SECRET environment variables."
    );
  }

  // Create new S3 client
  s3Client = new S3Client({
    region: finalConfig.region,
    endpoint: finalConfig.endpoint,
    credentials: {
      accessKeyId: finalConfig.accessKeyId,
      secretAccessKey: finalConfig.secretAccessKey,
    },
    forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
  });

  currentConfig = finalConfig;
  return s3Client;
}

// ============================================================================
// UPLOAD OPERATIONS
// ============================================================================

export interface UploadResult {
  success: boolean;
  url: string; // Full object URL in Spaces
  key: string; // Object key (path within bucket)
  bucket: string;
  size: number;
  etag?: string;
  error?: string;
}

/**
 * Upload file buffer to DigitalOcean Spaces
 * @param {Buffer} fileBuffer - File data to upload
 * @param {string} key - Object key (path within bucket, e.g., "intake-packages/2024/referral-123.enc")
 * @param {object} options - Upload options
 * @returns {Promise<UploadResult>} Upload result with URL
 */
export async function uploadFile(
  fileBuffer: Buffer,
  key: string,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: "private" | "public-read";
    bucket?: string;
  } = {}
): Promise<UploadResult> {
  try {
    const client = getSpacesClient();
    const bucket = options.bucket || currentConfig?.bucket || defaultConfig.bucket;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: options.contentType || "application/octet-stream",
      ACL: options.acl || "private",
      Metadata: options.metadata,
    });

    const response = await client.send(command);

    const url = `${currentConfig?.endpoint}/${bucket}/${key}`;

    return {
      success: true,
      url,
      key,
      bucket,
      size: fileBuffer.length,
      etag: response.ETag,
    };
  } catch (error: any) {
    console.error("❌ DO Spaces upload failed:", error);
    return {
      success: false,
      url: "",
      key,
      bucket: options.bucket || defaultConfig.bucket,
      size: fileBuffer.length,
      error: error.message,
    };
  }
}

/**
 * Upload intake package with encryption metadata
 * @param {Buffer} encryptedData - Encrypted package data
 * @param {string} referralId - Referral ID for package organization
 * @param {object} metadata - Encryption and package metadata
 * @returns {Promise<UploadResult>} Upload result
 */
export async function uploadIntakePackage(
  encryptedData: Buffer,
  referralId: string,
  metadata: {
    packageId: string;
    packageName: string;
    encryptionKeyId: string;
    iv: string;
    authTag: string;
    checksumSha256: string;
    createdBy?: string;
  }
): Promise<UploadResult> {
  // Generate key with organized folder structure
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const key = `intake-packages/${year}/${month}/${referralId}/${metadata.packageId}.enc`;

  return uploadFile(encryptedData, key, {
    contentType: "application/octet-stream",
    acl: "private",
    metadata: {
      referral_id: referralId,
      package_id: metadata.packageId,
      package_name: metadata.packageName,
      encryption_key_id: metadata.encryptionKeyId,
      iv: metadata.iv,
      auth_tag: metadata.authTag,
      checksum_sha256: metadata.checksumSha256,
      created_by: metadata.createdBy || "system",
      created_at: new Date().toISOString(),
    },
  });
}

// ============================================================================
// DOWNLOAD OPERATIONS
// ============================================================================

export interface DownloadResult {
  success: boolean;
  data?: Buffer;
  metadata?: Record<string, string>;
  contentType?: string;
  size?: number;
  error?: string;
}

/**
 * Download file from DigitalOcean Spaces
 * @param {string} key - Object key
 * @param {string} bucket - Optional bucket override
 * @returns {Promise<DownloadResult>} Downloaded file data
 */
export async function downloadFile(
  key: string,
  bucket?: string
): Promise<DownloadResult> {
  try {
    const client = getSpacesClient();
    const finalBucket = bucket || currentConfig?.bucket || defaultConfig.bucket;

    const command = new GetObjectCommand({
      Bucket: finalBucket,
      Key: key,
    });

    const response = await client.send(command);

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const data = Buffer.concat(chunks);

    return {
      success: true,
      data,
      metadata: response.Metadata,
      contentType: response.ContentType,
      size: response.ContentLength,
    };
  } catch (error: any) {
    console.error("❌ DO Spaces download failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// PRE-SIGNED URL OPERATIONS
// ============================================================================

/**
 * Generate pre-signed download URL (24-hour expiry)
 * @param {string} key - Object key
 * @param {number} expiresIn - Expiration time in seconds (default: 86400 = 24 hours)
 * @param {string} bucket - Optional bucket override
 * @returns {Promise<string>} Pre-signed URL
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 86400, // 24 hours
  bucket?: string
): Promise<string> {
  try {
    const client = getSpacesClient();
    const finalBucket = bucket || currentConfig?.bucket || defaultConfig.bucket;

    const command = new GetObjectCommand({
      Bucket: finalBucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error("❌ Failed to generate pre-signed URL:", error);
    throw error;
  }
}

/**
 * Generate pre-signed upload URL (1-hour expiry)
 * @param {string} key - Object key
 * @param {string} contentType - Content type for upload
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param {string} bucket - Optional bucket override
 * @returns {Promise<string>} Pre-signed URL
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string = "application/octet-stream",
  expiresIn: number = 3600, // 1 hour
  bucket?: string
): Promise<string> {
  try {
    const client = getSpacesClient();
    const finalBucket = bucket || currentConfig?.bucket || defaultConfig.bucket;

    const command = new PutObjectCommand({
      Bucket: finalBucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error("❌ Failed to generate pre-signed upload URL:", error);
    throw error;
  }
}

// ============================================================================
// DELETION OPERATIONS
// ============================================================================

export interface DeleteResult {
  success: boolean;
  key: string;
  error?: string;
}

/**
 * Delete file from DigitalOcean Spaces
 * @param {string} key - Object key to delete
 * @param {string} bucket - Optional bucket override
 * @returns {Promise<DeleteResult>} Deletion result
 */
export async function deleteFile(
  key: string,
  bucket?: string
): Promise<DeleteResult> {
  try {
    const client = getSpacesClient();
    const finalBucket = bucket || currentConfig?.bucket || defaultConfig.bucket;

    const command = new DeleteObjectCommand({
      Bucket: finalBucket,
      Key: key,
    });

    await client.send(command);

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

/**
 * Delete expired intake package
 * @param {string} packageId - Package ID
 * @param {string} referralId - Referral ID
 * @returns {Promise<DeleteResult>} Deletion result
 */
export async function deleteExpiredPackage(
  packageId: string,
  referralId: string
): Promise<DeleteResult> {
  // Reconstruct key from package metadata
  // Note: In production, store the full key in database for accurate deletion
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const key = `intake-packages/${year}/${month}/${referralId}/${packageId}.enc`;

  console.log(`🗑️  Deleting expired package: ${key}`);
  return deleteFile(key);
}

// ============================================================================
// METADATA OPERATIONS
// ============================================================================

export interface FileMetadata {
  exists: boolean;
  size?: number;
  lastModified?: Date;
  contentType?: string;
  metadata?: Record<string, string>;
  etag?: string;
  error?: string;
}

/**
 * Get file metadata without downloading
 * @param {string} key - Object key
 * @param {string} bucket - Optional bucket override
 * @returns {Promise<FileMetadata>} File metadata
 */
export async function getFileMetadata(
  key: string,
  bucket?: string
): Promise<FileMetadata> {
  try {
    const client = getSpacesClient();
    const finalBucket = bucket || currentConfig?.bucket || defaultConfig.bucket;

    const command = new HeadObjectCommand({
      Bucket: finalBucket,
      Key: key,
    });

    const response = await client.send(command);

    return {
      exists: true,
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      metadata: response.Metadata,
      etag: response.ETag,
    };
  } catch (error: any) {
    if (error.name === "NotFound") {
      return { exists: false };
    }
    console.error("❌ Failed to get file metadata:", error);
    return {
      exists: false,
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
  const urlObj = new URL(url);
  // Remove leading slash and bucket name
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  return pathParts.slice(1).join("/"); // Skip bucket name
}

/**
 * Build full Spaces URL from key
 * @param {string} key - Object key
 * @param {string} bucket - Optional bucket override
 * @returns {string} Full Spaces URL
 */
export function buildSpacesUrl(key: string, bucket?: string): string {
  const finalBucket = bucket || currentConfig?.bucket || defaultConfig.bucket;
  const endpoint = currentConfig?.endpoint || defaultConfig.endpoint;
  return `${endpoint}/${finalBucket}/${key}`;
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate Spaces configuration
 * @returns {boolean} True if configuration is valid
 */
export function isConfigured(): boolean {
  return !!(
    process.env.DO_SPACES_KEY &&
    process.env.DO_SPACES_SECRET &&
    process.env.DO_SPACES_BUCKET
  );
}

/**
 * Get current configuration (without exposing secrets)
 * @returns {object} Sanitized configuration
 */
export function getConfig() {
  return {
    region: currentConfig?.region || defaultConfig.region,
    endpoint: currentConfig?.endpoint || defaultConfig.endpoint,
    bucket: currentConfig?.bucket || defaultConfig.bucket,
    isConfigured: isConfigured(),
  };
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

/**
 * PRODUCTION DEPLOYMENT CHECKLIST:
 *
 * ✅ Environment Variables Required:
 *    - DO_SPACES_KEY (access key)
 *    - DO_SPACES_SECRET (secret key)
 *    - DO_SPACES_BUCKET (bucket name)
 *    - DO_SPACES_REGION (optional, defaults to nyc3)
 *    - DO_SPACES_ENDPOINT (optional, defaults to https://nyc3.digitaloceanspaces.com)
 *
 * ✅ Security Best Practices:
 *    - Use private ACL for all intake packages (default)
 *    - Pre-signed URLs with 24-hour expiry
 *    - Store only encrypted data in Spaces
 *    - Implement automatic deletion after 7 days
 *    - Enable Spaces access logging
 *    - Configure CORS for web uploads if needed
 *    - Use lifecycle policies for automatic expiration
 *
 * ✅ HIPAA Compliance:
 *    - Encryption at rest (Spaces provides this)
 *    - Encryption in transit (HTTPS only)
 *    - Access logging enabled
 *    - Business Associate Agreement (BAA) with DigitalOcean
 *    - Regular security audits
 *
 * ⚠️  Rate Limits:
 *    - DigitalOcean Spaces has rate limits similar to AWS S3
 *    - Implement exponential backoff for retries
 *    - Consider request caching for frequently accessed files
 */
