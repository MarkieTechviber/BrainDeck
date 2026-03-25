// server/services/tokenService.js
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ACCESS_SECRET  = process.env.JWT_SECRET       || 'braindeck-access-secret-CHANGE-ME';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || ACCESS_SECRET + '-refresh';
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

/**
 * Sign a short-lived access token (15 min)
 */
function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
}

/**
 * Verify an access token — returns { sub } or throws
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Generate a secure random refresh token string (not JWT)
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash a refresh token for safe storage in DB
 */
async function hashRefreshToken(token) {
  return bcrypt.hash(token, 10);
}

/**
 * Compare a raw refresh token against a stored hash
 */
async function compareRefreshToken(token, hash) {
  return bcrypt.compare(token, hash);
}

/**
 * Calculate refresh token expiry date
 */
function refreshTokenExpiry() {
  const days = parseInt(REFRESH_EXPIRY) || 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  refreshTokenExpiry,
  REFRESH_EXPIRY,
};
