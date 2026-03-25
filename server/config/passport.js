// server/config/passport.js
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, Profile } = require('../models/index');

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    scope: ['profile', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email     = profile.emails?.[0]?.value;
      const name      = profile.displayName || profile.name?.givenName || 'User';
      const avatarUrl = profile.photos?.[0]?.value || null;
      const googleId  = profile.id;

      if (!email) return done(new Error('No email from Google'), null);

      // Find existing user by googleId OR email
      let user = await User.findOne({
        where: { googleId },
      }).catch(() => null);

      if (!user) {
        // Try by email (account merge — user may have signed up with email first)
        user = await User.findOne({ where: { email } }).catch(() => null);
      }

      if (user) {
        // Update Google info if needed
        let changed = false;
        if (!user.googleId)        { user.googleId  = googleId;  changed = true; }
        if (!user.avatarUrl && avatarUrl) { user.avatarUrl = avatarUrl; changed = true; }
        if (changed) await user.save();
      } else {
        // Create new user — no password (Google-only)
        user = await User.create({
          email,
          name,
          avatarUrl,
          googleId,
          passwordHash: 'GOOGLE_OAUTH_NO_PASSWORD',
          isEmailVerified: true,
        });
        await Profile.create({ userId: user.id });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Minimal serialize/deserialize — we use JWTs, not sessions
// but passport requires these
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) { done(err, null); }
});

module.exports = passport;
