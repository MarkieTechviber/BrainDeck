// server/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const uploadConfig = require('../config/upload.config');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadConfig.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isMimeAllowed = uploadConfig.allowedMimeTypes.includes(file.mimetype);
  const isExtAllowed = uploadConfig.allowedExtensions.includes(ext);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type not supported. Allowed types: ${uploadConfig.allowedExtensions.join(', ')}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: uploadConfig.maxFileSizeBytes,
  },
  fileFilter,
});

module.exports = upload;
