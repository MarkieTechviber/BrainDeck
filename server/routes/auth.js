const express = require('express');
const router  = express.Router();
const { register, login, refresh, logout, forgotPassword, resetPassword, getMe, updateMe, uploadAvatar, uploadCover, verifyEmail, resendVerification } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register',        register);
router.post('/login',           login);
router.post('/refresh',         refresh);
router.post('/logout',          requireAuth, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.get('/me',               requireAuth, getMe);
router.patch('/me',             requireAuth, updateMe);
router.post('/me/avatar',       requireAuth, upload.single('avatar'), uploadAvatar);
router.post('/me/cover',        requireAuth, upload.single('cover'), uploadCover);

router.post('/verify-email',      verifyEmail);
router.post('/resend-verification', requireAuth, resendVerification);

module.exports = router;
