// server/utils/fileUtils.js
const fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[FileUtils] Failed to delete file ${filePath}:`, error.message);
    return false;
  }
};

const getExtension = (filePath) => {
  return path.extname(filePath).toLowerCase().replace('.', '');
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

module.exports = { deleteFile, getExtension, formatFileSize, fileExists };
