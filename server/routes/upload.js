// server/routes/upload.js
const express          = require('express');
const router           = express.Router();
const upload           = require('../middleware/upload.middleware');
const uploadController = require('../controllers/uploadController');
const { requireAuth }  = require('../middleware/authMiddleware');

// ── Document upload (PDF, DOCX, PPTX, TXT, MD) ──
// Profile image uploads (avatar, cover) are handled by /api/auth/me/avatar
// and /api/auth/me/cover — NOT here.
router.post('/', requireAuth, upload.single('document'), uploadController.handleUpload);

module.exports = router;
