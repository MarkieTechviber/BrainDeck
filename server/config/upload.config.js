// server/config/upload.config.js
require('dotenv').config();
const path = require('path');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

module.exports = {
  maxFileSizeMB:      parseInt(process.env.MAX_FILE_SIZE_MB) || 20,
  maxFileSizeBytes:   (parseInt(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024,
  allowedExtensions:  (process.env.ALLOWED_EXTENSIONS || 'pdf,docx,pptx,txt,md').split(','),
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
  ],

  // ── Root directories ──────────────────────────────────────────────────────
  uploadDir:    UPLOADS_ROOT,
  profilesDir:  path.join(UPLOADS_ROOT, 'profiles'),   // profiles/{userFolder}/avatars|covers/
  documentsDir: path.join(UPLOADS_ROOT, 'documents'),  // documents/{sessionFolder}/
};
