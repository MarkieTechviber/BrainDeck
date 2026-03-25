// server/controllers/uploadController.js
const { sendSuccess, sendError } = require('../utils/responseUtils');
const path = require('path');

const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded.', 400);
    }

    const fileInfo = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      extension: path.extname(req.file.originalname).toLowerCase().replace('.', ''),
    };

    console.log(`[Upload] Received: ${fileInfo.originalName} (${(fileInfo.fileSize / 1024).toFixed(1)} KB)`);

    return sendSuccess(res, fileInfo, 'File uploaded successfully.', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = { handleUpload };
