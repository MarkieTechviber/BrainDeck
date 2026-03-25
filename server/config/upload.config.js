// server/config/upload.config.js
require('dotenv').config();

module.exports = {
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB) || 20,
  maxFileSizeBytes: (parseInt(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024,
  allowedExtensions: (process.env.ALLOWED_EXTENSIONS || 'pdf,docx,pptx,txt,md').split(','),
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
  ],
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
