// server/middleware/upload.middleware.js
// Handles document uploads (PDF, DOCX, PPTX, TXT, MD).
// Each upload gets its own randomized session folder under uploads/documents/.

const multer = require('multer');
const path   = require('path');
const uploadConfig  = require('../config/upload.config');
const { generateFileName, ensureDir, newDocumentDir } = require('../utils/storageHelper');

// Ensure the documents root exists on startup
ensureDir(uploadConfig.documentsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Fresh randomized session folder per upload
    const { folderPath } = newDocumentDir();
    req._documentFolderPath = folderPath; // expose to controller if needed
    cb(null, folderPath);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const randName = generateFileName() + ext;
    cb(null, randName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext         = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isMimeOk    = uploadConfig.allowedMimeTypes.includes(file.mimetype);
  const isExtOk     = uploadConfig.allowedExtensions.includes(ext);

  if (isMimeOk && isExtOk) {
    cb(null, true);
  } else {
    cb(
      new Error(`File type not supported. Allowed: ${uploadConfig.allowedExtensions.join(', ')}`),
      false
    );
  }
};

const upload = multer({
  storage,
  limits:     { fileSize: uploadConfig.maxFileSizeBytes },
  fileFilter,
});

module.exports = upload;
