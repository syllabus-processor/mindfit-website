// MindFit v2 - Encryption Module
// Campaign 1 - Sprint 2: AES-256-GCM encryption for HIPAA-compliant package exports
// Classification: TIER-1 | Security-critical module

import crypto from "crypto";

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag
const KEY_LENGTH = 32; // 256 bits for AES-256

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptionResult {
  encrypted: Buffer;
  iv: string; // hex-encoded initialization vector
  authTag: string; // hex-encoded authentication tag
  algorithm: string;
}

export interface DecryptionInput {
  encrypted: Buffer | string; // Buffer or hex-encoded string
  iv: string; // hex-encoded initialization vector
  authTag: string; // hex-encoded authentication tag
  algorithm?: string; // defaults to aes-256-gcm
}

export interface EncryptionKey {
  keyId: string;
  key: Buffer;
}

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Load master encryption key from environment variable
 * @returns {Buffer} Master encryption key
 * @throws {Error} If MINDV2_AES_KEY is not set or invalid
 */
export function getMasterKey(): Buffer {
  const masterKeyHex = process.env.MINDV2_AES_KEY;

  if (!masterKeyHex) {
    throw new Error(
      "MINDV2_AES_KEY environment variable not set. " +
      "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // Parse hex string to buffer
  const key = Buffer.from(masterKeyHex, "hex");

  // Validate key length
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `MINDV2_AES_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
      `Got ${masterKeyHex.length} characters (${key.length} bytes).`
    );
  }

  return key;
}

/**
 * Check if master key is configured
 * @returns {boolean} True if MINDV2_AES_KEY is set and valid
 */
export function isMasterKeyConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new AES-256 encryption key
 * @returns {EncryptionKey} Generated key with ID
 */
export function generateEncryptionKey(): EncryptionKey {
  const key = crypto.randomBytes(KEY_LENGTH);
  const keyId = crypto.randomBytes(16).toString("hex");

  return {
    keyId,
    key,
  };
}

/**
 * Derive encryption key from password using PBKDF2
 * WARNING: For production, use a secure key management system (KMS, Vault, etc.)
 * @param {string} password - Master password
 * @param {string} salt - Salt for key derivation (hex-encoded)
 * @returns {Buffer} Derived encryption key
 */
export function deriveKeyFromPassword(password: string, salt: string): Buffer {
  const saltBuffer = Buffer.from(salt, "hex");
  return crypto.pbkdf2Sync(password, saltBuffer, 100000, KEY_LENGTH, "sha256");
}

/**
 * Generate random salt for key derivation
 * @returns {string} Hex-encoded salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ============================================================================
// ENCRYPTION
// ============================================================================

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer | string} data - Data to encrypt
 * @param {Buffer} key - 256-bit encryption key
 * @returns {EncryptionResult} Encrypted data with IV and auth tag
 */
export function encrypt(data: Buffer | string, key: Buffer): EncryptionResult {
  // Validate key length
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  // Convert string to buffer if needed
  const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;

  // Generate random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final(),
  ]);

  // Get authentication tag (GCM mode)
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    algorithm: ALGORITHM,
  };
}

/**
 * Encrypt JSON data (convenience wrapper)
 * @param {any} jsonData - JSON-serializable data
 * @param {Buffer} key - 256-bit encryption key
 * @returns {EncryptionResult} Encrypted data with IV and auth tag
 */
export function encryptJSON(jsonData: any, key: Buffer): EncryptionResult {
  const jsonString = JSON.stringify(jsonData);
  return encrypt(jsonString, key);
}

// ============================================================================
// DECRYPTION
// ============================================================================

/**
 * Decrypt data using AES-256-GCM
 * @param {DecryptionInput} input - Encrypted data with IV and auth tag
 * @param {Buffer} key - 256-bit encryption key
 * @returns {Buffer} Decrypted data
 */
export function decrypt(input: DecryptionInput, key: Buffer): Buffer {
  // Validate key length
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  // Parse inputs
  const algorithm = input.algorithm || ALGORITHM;
  const iv = Buffer.from(input.iv, "hex");
  const authTag = Buffer.from(input.authTag, "hex");
  const encrypted = typeof input.encrypted === "string"
    ? Buffer.from(input.encrypted, "hex")
    : input.encrypted;

  // Validate IV and auth tag lengths
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}`);
  }

  // Create decipher
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt data
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted;
}

/**
 * Decrypt JSON data (convenience wrapper)
 * @param {DecryptionInput} input - Encrypted data with IV and auth tag
 * @param {Buffer} key - 256-bit encryption key
 * @returns {any} Decrypted JSON data
 */
export function decryptJSON(input: DecryptionInput, key: Buffer): any {
  const decrypted = decrypt(input, key);
  const jsonString = decrypted.toString("utf8");
  return JSON.parse(jsonString);
}

// ============================================================================
// INTEGRITY VERIFICATION
// ============================================================================

/**
 * Calculate SHA-256 checksum of data
 * @param {Buffer | string} data - Data to checksum
 * @returns {string} Hex-encoded SHA-256 checksum
 */
export function calculateChecksum(data: Buffer | string): string {
  const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return crypto.createHash("sha256").update(dataBuffer).digest("hex");
}

/**
 * Verify checksum of data
 * @param {Buffer | string} data - Data to verify
 * @param {string} expectedChecksum - Expected hex-encoded SHA-256 checksum
 * @returns {boolean} True if checksum matches
 */
export function verifyChecksum(data: Buffer | string, expectedChecksum: string): boolean {
  const actualChecksum = calculateChecksum(data);
  return actualChecksum === expectedChecksum;
}

// ============================================================================
// ENCRYPTION WORKFLOW (High-level wrapper for MindFit use case)
// ============================================================================

export interface PackageEncryptionResult {
  encryptedData: Buffer;
  encryptionMetadata: {
    iv: string;
    authTag: string;
    algorithm: string;
    keyId: string;
  };
  checksum: string;
  fileSizeBytes: number;
}

/**
 * Complete encryption workflow for intake packages
 * @param {Buffer | string} packageData - Raw package data (JSON or file buffer)
 * @param {EncryptionKey} key - Encryption key with ID
 * @returns {PackageEncryptionResult} Complete encryption result
 */
export function encryptPackage(
  packageData: Buffer | string,
  key: EncryptionKey
): PackageEncryptionResult {
  // Encrypt the data
  const encryptionResult = encrypt(packageData, key.key);

  // Calculate checksum of encrypted data
  const checksum = calculateChecksum(encryptionResult.encrypted);

  return {
    encryptedData: encryptionResult.encrypted,
    encryptionMetadata: {
      iv: encryptionResult.iv,
      authTag: encryptionResult.authTag,
      algorithm: encryptionResult.algorithm,
      keyId: key.keyId,
    },
    checksum,
    fileSizeBytes: encryptionResult.encrypted.length,
  };
}

/**
 * Complete decryption workflow for intake packages
 * @param {Buffer | string} encryptedData - Encrypted package data
 * @param {object} metadata - Encryption metadata
 * @param {Buffer} key - Decryption key
 * @param {string} expectedChecksum - Expected SHA-256 checksum
 * @returns {Buffer} Decrypted package data
 * @throws {Error} If checksum verification fails
 */
export function decryptPackage(
  encryptedData: Buffer | string,
  metadata: { iv: string; authTag: string; algorithm?: string },
  key: Buffer,
  expectedChecksum?: string
): Buffer {
  // Verify checksum if provided
  if (expectedChecksum) {
    const dataBuffer = typeof encryptedData === "string"
      ? Buffer.from(encryptedData, "hex")
      : encryptedData;

    if (!verifyChecksum(dataBuffer, expectedChecksum)) {
      throw new Error("Checksum verification failed - data may be corrupted");
    }
  }

  // Decrypt the data
  const decrypted = decrypt(
    {
      encrypted: encryptedData,
      iv: metadata.iv,
      authTag: metadata.authTag,
      algorithm: metadata.algorithm,
    },
    key
  );

  return decrypted;
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

/**
 * PRODUCTION SECURITY CHECKLIST:
 *
 * ✅ AES-256-GCM provides both encryption and authentication
 * ✅ Random IV generated for each encryption operation
 * ✅ Authentication tag verified during decryption
 * ✅ SHA-256 checksums for integrity verification
 *
 * ⚠️  CRITICAL WARNINGS:
 *
 * 1. KEY MANAGEMENT:
 *    - NEVER store encryption keys in database
 *    - Use environment variables for master keys
 *    - Implement key rotation every 90 days
 *    - Consider using AWS KMS, HashiCorp Vault, or similar
 *
 * 2. KEY STORAGE:
 *    - Store only key IDs in database (reference, not actual key)
 *    - Actual keys must be stored in secure key management system
 *    - Implement access controls and audit logging for key access
 *
 * 3. DATA LIFECYCLE:
 *    - Implement automatic expiration (7-day default in schema)
 *    - Securely delete expired packages from DO Spaces
 *    - Implement audit logging for all encryption/decryption operations
 *
 * 4. COMPLIANCE:
 *    - HIPAA requires encryption at rest and in transit
 *    - Maintain audit trail of all PHI access
 *    - Implement Business Associate Agreements (BAAs) with vendors
 *    - Regular security audits and penetration testing
 *
 * 5. ERROR HANDLING:
 *    - Never expose encryption keys in error messages
 *    - Log decryption failures for security monitoring
 *    - Implement rate limiting for decryption operations
 */
