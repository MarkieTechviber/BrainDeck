// server/routes/oauth.js
const express  = require('express');
const passport = require('../config/passport');
const { googleCallback, googleFailure } = require('../controllers/oauthController');
const router   = express.Router();

// Step 1 — redirect user to Google
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // always show account picker
  })
);

// Step 2 — Google redirects back here
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login.html?error=google_denied',
    session: false, // we use JWTs, not sessions
  }),
  googleCallback
);

router.get('/google/failure', googleFailure);

module.exports = router;
