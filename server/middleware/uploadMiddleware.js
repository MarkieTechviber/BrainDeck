// server/middleware/uploadMiddleware.js
// Handles profile image uploads (avatar & cover photo).
// Saves to uploads/profiles/{userStorageFolder}/avatars/ or /covers/
// depending on req._uploadSubDir set by the route.

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { Profile } = require('../models/index');
const uploadConfig = require('../config/upload.config');
const {
  generateFileName,
  generateFolderName,
  getUserDir,
  ensureDir,
} = require('../utils/storageHelper');

// Ensure profiles root exists
ensureDir(uploadConfig.profilesDir);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // req.userId is set by requireAuth middleware before multer runs
      const userId = req.userId;
      if (!userId) return cb(new Error('Unauthorized'), null);

      // Look up the user's storage folder
      let profile = await Profile.findOne({ where: { userId } });

      // ── Auto-create storageFolder for legacy accounts that don't have one ──
      if (profile && !profile.storageFolder) {
        profile.storageFolder = generateFolderName();
        await profile.save();
      }

      if (!profile) return cb(new Error('Profile not found'), null);

      // subDir is set on req by the route handler before calling multer
      // Defaults to 'avatars' if not set
      const subDir = req._uploadSubDir || 'avatars';
      const destDir = getUserDir(profile.storageFolder, subDir);
      ensureDir(destDir);

      // Expose to controller for old-file cleanup
      req._uploadDestDir     = destDir;
      req._userStorageFolder = profile.storageFolder;
      req._uploadSubDir      = subDir;

      cb(null, destDir);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const randName = generateFileName() + ext;
    cb(null, randName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

module.exports = upload;
