// server/controllers/authController.js
const { User, Session, Profile } = require('../models/index');
const { signAccessToken, generateRefreshToken, hashRefreshToken, compareRefreshToken, refreshTokenExpiry } = require('../services/tokenService');
const { sendSuccess, sendError } = require('../utils/responseUtils');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendLoginNotificationEmail } = require('../services/emailService');
const path = require('path');
const fs = require('fs');

// ── REGISTER ──
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password)    return sendError(res, 'Email and password are required.', 400);
    if (password.length < 8)    return sendError(res, 'Password must be at least 8 characters.', 400);

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return sendError(res, 'An account with this email already exists.', 409);

    const user = await User.create({ name: name || '', email: email.toLowerCase(), passwordHash: password });
    await Profile.create({ userId: user.id });

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken   = crypto.createHash('sha256').update(verifyToken).digest('hex');
    user.emailVerifyExpires = new Date(Date.now() + 24 * 3600000); // 24h
    await user.save();

    // Send verification email (non-blocking — don't fail register if email fails)
    sendVerificationEmail(user, verifyToken).catch(err =>
      console.error('[Email] Verification send failed:', err.message)
    );

    const accessToken  = signAccessToken(user.id.toString());
    const refreshToken = generateRefreshToken();
    await Session.create({
      userId:    user.id,
      tokenHash: await hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      userAgent: req.get('user-agent') || '',
      ip:        req.ip,
    });

    setRefreshCookie(res, refreshToken);
    return sendSuccess(res, { user, accessToken }, 'Account created! Please check your email to verify your address.', 201);
  } catch (err) { next(err); }
};

// ── LOGIN ──
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 'Email and password are required.', 400);

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken  = signAccessToken(user.id.toString());
    const refreshToken = generateRefreshToken();
    await Session.create({
      userId:    user.id,
      tokenHash: await hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      userAgent: req.get('user-agent') || '',
      ip:        req.ip,
    });

    setRefreshCookie(res, refreshToken);
    return sendSuccess(res, { user, accessToken }, 'Logged in successfully.');
  } catch (err) { next(err); }
};

// ── REFRESH ──
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return sendError(res, 'No refresh token provided.', 401);

    const sessions = await Session.findAll({
      where: { expiresAt: { [Op.gt]: new Date() } },
      include: [{ model: User }],
    });

    let matched = null;
    for (const s of sessions) {
      if (await compareRefreshToken(token, s.tokenHash)) { matched = s; break; }
    }
    if (!matched) return sendError(res, 'Invalid or expired refresh token.', 401);

    const accessToken  = signAccessToken(matched.User.id.toString());
    const newRefresh   = generateRefreshToken();
    matched.tokenHash  = await hashRefreshToken(newRefresh);
    matched.expiresAt  = refreshTokenExpiry();
    await matched.save();

    setRefreshCookie(res, newRefresh);
    return sendSuccess(res, { accessToken, user: matched.User }, 'Token refreshed.');
  } catch (err) { next(err); }
};

// ── LOGOUT ──
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      const sessions = await Session.findAll({ where: { userId: req.userId } });
      for (const s of sessions) {
        if (await compareRefreshToken(token, s.tokenHash)) { await s.destroy(); break; }
      }
    }
    res.clearCookie('refreshToken');
    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (err) { next(err); }
};

// ── FORGOT PASSWORD ──
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required.', 400);
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken   = crypto.createHash('sha256').update(token).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 3600000);
      await user.save();
      sendPasswordResetEmail(user, token).catch(err =>
        console.error('[Email] Reset send failed:', err.message)
      );
    }
    return sendSuccess(res, null, 'If an account exists for that email, a reset link has been sent.');
  } catch (err) { next(err); }
};

// ── RESET PASSWORD ──
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return sendError(res, 'Token and password required.', 400);
    if (password.length < 8)  return sendError(res, 'Password must be at least 8 characters.', 400);

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({
      where: { passwordResetToken: hashed, passwordResetExpires: { [Op.gt]: new Date() } },
    });
    if (!user) return sendError(res, 'Reset token is invalid or has expired.', 400);

    user.passwordHash          = password;
    user.passwordResetToken    = null;
    user.passwordResetExpires  = null;
    await user.save();
    return sendSuccess(res, null, 'Password reset successfully. You can now log in.');
  } catch (err) { next(err); }
};

// ── GET ME ──
const getMe = async (req, res, next) => {
  try {
    const user    = await User.findByPk(req.userId);
    const profile = await Profile.findOne({ where: { userId: req.userId } });
    if (!user) return sendError(res, 'User not found.', 404);
    return sendSuccess(res, { user, profile });
  } catch (err) { next(err); }
};

// ── UPDATE ME ──
const updateMe = async (req, res, next) => {
  try {
    const { name, bio, location, website,
            preferredAIMode, preferredProvider, preferredModel,
            preferredOllamaModel } = req.body;

    const user = await User.findByPk(req.userId);
    const profile = await Profile.findOne({ where: { userId: req.userId } });

    if (!user) return sendError(res, 'User not found.', 404);

    // Validation with field length limits
    const MAX_NAME = 80;
    const MAX_BIO = 300;
    const MAX_LOCATION = 100;
    const MAX_WEBSITE = 200;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length > MAX_NAME) {
        return sendError(res, `Name cannot exceed ${MAX_NAME} characters.`, 400);
      }
      user.name = trimmedName;
    }

    if (bio !== undefined) {
      const trimmedBio = bio.trim();
      if (trimmedBio.length > MAX_BIO) {
        return sendError(res, `Bio cannot exceed ${MAX_BIO} characters.`, 400);
      }
      user.bio = trimmedBio || null;
    }

    if (location !== undefined) {
      const trimmedLocation = location.trim();
      if (trimmedLocation.length > MAX_LOCATION) {
        return sendError(res, `Location cannot exceed ${MAX_LOCATION} characters.`, 400);
      }
      user.location = trimmedLocation || null;
    }

    if (website !== undefined) {
      const trimmedWebsite = website.trim();
      if (trimmedWebsite.length > MAX_WEBSITE) {
        return sendError(res, `Website cannot exceed ${MAX_WEBSITE} characters.`, 400);
      }
      user.website = trimmedWebsite || null;
    }

    await user.save();

    // Update profile fields if profile exists
    if (profile) {
      if (preferredAIMode !== undefined) profile.preferredAIMode = preferredAIMode;
      if (preferredProvider !== undefined) profile.preferredProvider = preferredProvider;
      if (preferredModel !== undefined) profile.preferredModel = preferredModel;
      if (preferredOllamaModel !== undefined) profile.preferredOllamaModel = preferredOllamaModel;
      await profile.save();
    }

    return sendSuccess(res, { user: user.toJSON() }, 'Profile updated successfully.');
  } catch (err) { next(err); }
};

// ── UPLOAD AVATAR ──
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file provided.', 400);
    
    const user = await User.findByPk(req.userId);
    if (!user) return sendError(res, 'User not found.', 404);
    
    // Delete old avatar if it exists and is a file path
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../uploads', req.file.filename.split('/').pop());
      fs.unlink(oldPath, err => {
        if (err) console.error('Could not delete old avatar:', err);
      });
    }
    
    user.avatarUrl = `/uploads/${req.file.filename}`;
    await user.save();
    
    return sendSuccess(res, { avatarUrl: user.avatarUrl }, 'Avatar uploaded successfully.', 201);
  } catch (err) { next(err); }
};

// ── UPLOAD COVER ──
const uploadCover = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file provided.', 400);
    
    const user = await User.findByPk(req.userId);
    if (!user) return sendError(res, 'User not found.', 404);
    
    // Delete old cover if it exists and is a file path
    if (user.coverUrl && user.coverUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../uploads', req.file.filename.split('/').pop());
      fs.unlink(oldPath, err => {
        if (err) console.error('Could not delete old cover:', err);
      });
    }
    
    user.coverUrl = `/uploads/${req.file.filename}`;
    await user.save();
    
    return sendSuccess(res, { coverUrl: user.coverUrl }, 'Cover photo uploaded successfully.', 201);
  } catch (err) { next(err); }
};

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, getMe, updateMe, uploadAvatar, uploadCover };

// ── VERIFY EMAIL ──
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, 'Verification token is required.', 400);

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({
      where: {
        emailVerifyToken:   hashed,
        emailVerifyExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) return sendError(res, 'Verification link is invalid or has expired.', 400);

    user.isEmailVerified    = true;
    user.emailVerifyToken   = null;
    user.emailVerifyExpires = null;
    await user.save();

    // Send welcome email after verification
    sendWelcomeEmail(user).catch(err =>
      console.error('[Email] Welcome send failed:', err.message)
    );

    return sendSuccess(res, { user }, 'Email verified! Welcome to BrainDeck.');
  } catch (err) { next(err); }
};

// ── RESEND VERIFICATION EMAIL ──
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user)                 return sendError(res, 'User not found.', 404);
    if (user.isEmailVerified)  return sendError(res, 'Email is already verified.', 400);

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken   = crypto.createHash('sha256').update(token).digest('hex');
    user.emailVerifyExpires = new Date(Date.now() + 24 * 3600000);
    await user.save();

    sendVerificationEmail(user, token).catch(err =>
      console.error('[Email] Resend failed:', err.message)
    );

    return sendSuccess(res, null, 'Verification email resent. Please check your inbox.');
  } catch (err) { next(err); }
};

module.exports = Object.assign(module.exports, { verifyEmail, resendVerification });
