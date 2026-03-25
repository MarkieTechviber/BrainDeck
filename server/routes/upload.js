// server/routes/upload.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const uploadController = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/authMiddleware');

// Generic document upload
router.post('/', requireAuth, upload.single('document'), uploadController.handleUpload);

// Profile image uploads (avatar, cover)
router.post('/deck-image', requireAuth, upload.single('file'), uploadController.handleUpload);

module.exports = router;
