// server/utils/storageHelper.js
// ── Secure randomized storage path generator ──────────────────────────────────
// Generates unpredictable folder and file names so the uploads directory
// cannot be enumerated even if an attacker gains partial filesystem access.

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── Character set: uppercase alphanumeric (no ambiguous chars like 0/O, 1/I) ──
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random string of `len` characters from CHARSET.
 * Uses crypto.randomBytes for cryptographic randomness.
 */
function randomSegment(len = 8) {
  const bytes  = crypto.randomBytes(len);
  let   result = '';
  for (let i = 0; i < len; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

/**
 * Generate a randomized folder name in the format "XXXXXXXX-YYYYYYYY".
 * Example: "F22ARCYA-H32NFE8K"
 */
function generateFolderName() {
  return `${randomSegment(8)}-${randomSegment(8)}`;
}

/**
 * Generate a randomized file name (no extension).
 * Example: "AX9K2MBQ"
 */
function generateFileName() {
  return randomSegment(10);
}

/**
 * Ensure a directory exists, creating it (and parents) if needed.
 * @param {string} dirPath - Absolute path to directory
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Root uploads directory (absolute path).
 */
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

/**
 * Get the absolute path to a user's profile folder.
 * @param {string} storageFolder - The user's randomized folder name (e.g. "F22ARCYA-H32NFE8K")
 * @param {'avatars'|'covers'} subDir
 * @returns {string} Absolute path
 */
function getUserDir(storageFolder, subDir) {
  return path.join(UPLOADS_ROOT, 'profiles', storageFolder, subDir);
}

/**
 * Get the absolute path for a new document session folder.
 * Creates a brand-new random folder each upload.
 * @returns {{ folderPath: string, folderName: string }}
 */
function newDocumentDir() {
  const folderName = generateFolderName();
  const folderPath = path.join(UPLOADS_ROOT, 'documents', folderName);
  ensureDir(folderPath);
  return { folderPath, folderName };
}

/**
 * Build the public-facing URL path from an absolute file path.
 * Strips everything before /uploads/ so it becomes /uploads/...
 * @param {string} absPath
 * @returns {string}
 */
function toPublicUrl(absPath) {
  // Normalize ALL path separators to forward slashes (cross-platform safe)
  const normalized = absPath.replace(/\\/g, '/');
  const idx = normalized.indexOf('/uploads/');
  if (idx === -1) return '/' + normalized.split('/').slice(-1)[0]; // fallback: just filename
  return normalized.slice(idx);
}

module.exports = {
  generateFolderName,
  generateFileName,
  ensureDir,
  getUserDir,
  newDocumentDir,
  toPublicUrl,
  UPLOADS_ROOT,
};
