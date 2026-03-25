// server/middleware/authMiddleware.js
const { verifyAccessToken } = require('../services/tokenService');
const { sendError }          = require('../utils/responseUtils');

/**
 * requireAuth — hard gate: request must carry a valid access token
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.accessToken;

  if (!token) {
    return sendError(res, 'Authentication required. Please log in.', 401);
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session expired. Please log in again.', 401);
    }
    return sendError(res, 'Invalid token. Please log in.', 401);
  }
};

/**
 * optionalAuth — soft gate: attaches userId if token present, continues either way
 * Used for routes that work for both guests and logged-in users
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.accessToken;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.sub;
    } catch {
      // Token invalid or expired — treat as guest, don't block
    }
  }
  next();
};

module.exports = { requireAuth, optionalAuth };
