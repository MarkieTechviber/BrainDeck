// server/controllers/oauthController.js
const { Session }  = require('../models/index');
const {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} = require('../services/tokenService');

// Called after passport successfully authenticates
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.redirect('/login.html?error=oauth_failed');

    // Issue tokens
    const accessToken  = signAccessToken(user.id.toString());
    const refreshToken = generateRefreshToken();

    await Session.create({
      userId:    user.id,
      tokenHash: await hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      userAgent: req.get('user-agent') || '',
      ip:        req.ip,
    });

    // Set refresh cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   30 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with access token in URL fragment
    // The frontend picks it up and stores in localStorage
    res.redirect(`/oauth-success.html?token=${accessToken}`);
  } catch (err) {
    console.error('[OAuth] Callback error:', err);
    res.redirect('/login.html?error=oauth_error');
  }
};

const googleFailure = (req, res) => {
  res.redirect('/login.html?error=google_denied');
};

module.exports = { googleCallback, googleFailure };
