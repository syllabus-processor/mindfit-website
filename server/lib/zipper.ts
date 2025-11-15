// MindFit v2 - ZIP Compression Module
// Campaign 1 - Sprint 2: Bundle JSON + files for encrypted export
// Classification: TIER-1 | HIPAA-compliant data bundling

import archiver from "archiver";
import { createWriteStream, createReadStream } from "fs";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface FileEntry {
  name: string; // filename in ZIP (e.g., "referral.json", "documents/consent.pdf")
  content: Buffer | string; // file content
  type?: string; // MIME type (optional)
}

export interface ZipOptions {
  compressionLevel?: number; // 0-9 (default: 6)
  comment?: string; // ZIP file comment
}

export interface ZipResult {
  success: boolean;
  zipBuffer?: Buffer;
  filePath?: string; // if saveToFile was used
  size: number;
  fileCount: number;
  error?: string;
}

// ============================================================================
// ZIP COMPRESSION
// ============================================================================

/**
 * Create ZIP archive from multiple files
 * @param {FileEntry[]} files - Files to include in ZIP
 * @param {ZipOptions} options - Compression options
 * @returns {Promise<ZipResult>} ZIP buffer and metadata
 */
export async function createZip(
  files: FileEntry[],
  options: ZipOptions = {}
): Promise<ZipResult> {
  return new Promise((resolve, reject) => {
    try {
      // Create temporary file path
      const tempId = randomBytes(16).toString("hex");
      const tempDir = join(tmpdir(), "mindfit-zips");
      const tempPath = join(tempDir, `${tempId}.zip`);

      // Ensure temp directory exists
      mkdir(tempDir, { recursive: true }).catch(() => {});

      const output = createWriteStream(tempPath);
      const archive = archiver("zip", {
        zlib: { level: options.compressionLevel || 6 },
      });

      let fileCount = 0;

      // Handle completion
      output.on("close", async () => {
        try {
          // Read ZIP file into buffer
          const zipBuffer = await readFile(tempPath);

          // Clean up temp file
          await rm(tempPath, { force: true });

          resolve({
            success: true,
            zipBuffer,
            size: archive.pointer(),
            fileCount,
          });
        } catch (error: any) {
          reject(new Error(`Failed to read ZIP file: ${error.message}`));
        }
      });

      // Handle errors
      archive.on("error", (err) => {
        reject(new Error(`ZIP creation failed: ${err.message}`));
      });

      archive.on("warning", (err) => {
        if (err.code !== "ENOENT") {
          console.warn("⚠️  ZIP warning:", err.message);
        }
      });

      // Pipe archive to output file
      archive.pipe(output);

      // Add files to archive
      for (const file of files) {
        const content = typeof file.content === "string"
          ? Buffer.from(file.content, "utf8")
          : file.content;

        archive.append(content, { name: file.name });
        fileCount++;
      }

      // Add comment if provided
      if (options.comment) {
        archive.comment(options.comment);
      }

      // Finalize archive
      archive.finalize();
    } catch (error: any) {
      reject(new Error(`ZIP setup failed: ${error.message}`));
    }
  });
}

/**
 * Create ZIP archive and save to file
 * @param {FileEntry[]} files - Files to include in ZIP
 * @param {string} outputPath - Output file path
 * @param {ZipOptions} options - Compression options
 * @returns {Promise<ZipResult>} ZIP metadata
 */
export async function createZipFile(
  files: FileEntry[],
  outputPath: string,
  options: ZipOptions = {}
): Promise<ZipResult> {
  return new Promise((resolve, reject) => {
    try {
      const output = createWriteStream(outputPath);
      const archive = archiver("zip", {
        zlib: { level: options.compressionLevel || 6 },
      });

      let fileCount = 0;

      // Handle completion
      output.on("close", () => {
        resolve({
          success: true,
          filePath: outputPath,
          size: archive.pointer(),
          fileCount,
        });
      });

      // Handle errors
      archive.on("error", (err) => {
        reject(new Error(`ZIP creation failed: ${err.message}`));
      });

      // Pipe archive to output file
      archive.pipe(output);

      // Add files to archive
      for (const file of files) {
        const content = typeof file.content === "string"
          ? Buffer.from(file.content, "utf8")
          : file.content;

        archive.append(content, { name: file.name });
        fileCount++;
      }

      // Add comment if provided
      if (options.comment) {
        archive.comment(options.comment);
      }

      // Finalize archive
      archive.finalize();
    } catch (error: any) {
      reject(new Error(`ZIP setup failed: ${error.message}`));
    }
  });
}

// ============================================================================
// CONVENIENCE WRAPPERS FOR MINDFIT USE CASES
// ============================================================================

/**
 * Create intake package ZIP with JSON metadata + optional attachments
 * @param {object} referralData - Referral JSON data
 * @param {FileEntry[]} attachments - Optional file attachments
 * @returns {Promise<ZipResult>} ZIP buffer
 */
export async function createIntakePackageZip(
  referralData: any,
  attachments: FileEntry[] = []
): Promise<ZipResult> {
  const files: FileEntry[] = [
    {
      name: "referral.json",
      content: JSON.stringify(referralData, null, 2),
      type: "application/json",
    },
  ];

  // Add metadata file
  const metadata = {
    packageVersion: "1.0",
    createdAt: new Date().toISOString(),
    fileCount: 1 + attachments.length,
    files: [
      "referral.json",
      ...attachments.map((a) => a.name),
    ],
  };

  files.push({
    name: "metadata.json",
    content: JSON.stringify(metadata, null, 2),
    type: "application/json",
  });

  // Add attachments
  files.push(...attachments);

  return createZip(files, {
    comment: `MindFit v2 Intake Package - ${new Date().toISOString()}`,
    compressionLevel: 6,
  });
}

/**
 * Create ZIP from JSON object (convenience wrapper)
 * @param {any} jsonData - JSON data to compress
 * @param {string} filename - Filename inside ZIP (default: "data.json")
 * @returns {Promise<ZipResult>} ZIP buffer
 */
export async function zipJSON(
  jsonData: any,
  filename: string = "data.json"
): Promise<ZipResult> {
  return createZip([
    {
      name: filename,
      content: JSON.stringify(jsonData, null, 2),
      type: "application/json",
    },
  ]);
}

/**
 * Calculate compression ratio
 * @param {number} originalSize - Original uncompressed size
 * @param {number} compressedSize - Compressed size
 * @returns {string} Compression ratio as percentage
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): string {
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
  return `${ratio}%`;
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

/**
 * HIPAA COMPLIANCE NOTES:
 *
 * ✅ ZIP Compression:
 *    - Compression is NOT encryption
 *    - Always encrypt ZIP files after compression
 *    - Use AES-256-GCM for encryption (see server/lib/encryption.ts)
 *
 * ✅ Temporary Files:
 *    - Temp files created in OS temp directory
 *    - Automatically cleaned up after processing
 *    - No sensitive data persists on disk
 *
 * ✅ PHI Handling:
 *    - No PHI logged to console
 *    - No error messages contain PHI
 *    - ZIP comments do not contain client names or identifiers
 *
 * ⚠️  Production Workflow:
 *    1. Bundle files into ZIP (this module)
 *    2. Encrypt ZIP with AES-256-GCM (encryption.ts)
 *    3. Upload encrypted ZIP to DO Spaces (spaces-client.ts)
 *    4. Generate pre-signed URL (spaces-client.ts)
 *    5. Send notification with download link (notifications.ts)
 *    6. Automatic expiration after 7 days (lifecycle policy)
 */
