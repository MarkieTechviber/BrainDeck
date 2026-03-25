// server/controllers/userController.js
const User    = require('../models/User');
const Profile = require('../models/Profile');
const Deck    = require('../models/Deck');
const { sendSuccess, sendError } = require('../utils/responseUtils');

// ── GET MY PROFILE ────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user    = await User.findById(req.userId);
    const profile = await Profile.findOne({ userId: req.userId });

    if (!user) return sendError(res, 'User not found.', 404);

    // Mask stored API keys — just return which providers have keys
    const savedProviders = profile ? [...(profile.encryptedApiKeys || new Map()).keys()] : [];

    return sendSuccess(res, {
      user: user.toJSON(),
      profile: {
        preferredAIMode:     profile?.preferredAIMode     || 'local',
        preferredProvider:   profile?.preferredProvider   || 'claude',
        preferredModel:      profile?.preferredModel      || '',
        preferredOllamaModel:profile?.preferredOllamaModel|| 'llama3',
        savedProviders,
        totalDecks:          profile?.totalDecks          || 0,
        lastStudiedAt:       profile?.lastStudiedAt       || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────
const updateMe = async (req, res, next) => {
  try {
    const { name, avatarUrl, coverUrl, bio, location, website,
            preferredAIMode, preferredProvider, preferredModel,
            preferredOllamaModel, apiKey, apiKeyProvider } = req.body;

    const user    = await User.findByPk(req.userId);
    const profile = await Profile.findOne({ where: { userId: req.userId } });

    if (!user || !profile) return sendError(res, 'User not found.', 404);

    // Update user fields
    if (name      !== undefined) user.name      = name.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (coverUrl  !== undefined) user.coverUrl  = coverUrl;
    if (bio       !== undefined) user.bio       = bio ? bio.slice(0, 300) : null;
    if (location  !== undefined) user.location  = location ? location.slice(0, 100) : null;
    if (website   !== undefined) user.website   = website ? website.slice(0, 200) : null;
    await user.save();

    // Update profile fields
    if (preferredAIMode     !== undefined) profile.preferredAIMode      = preferredAIMode;
    if (preferredProvider   !== undefined) profile.preferredProvider     = preferredProvider;
    if (preferredModel      !== undefined) profile.preferredModel        = preferredModel;
    if (preferredOllamaModel!== undefined) profile.preferredOllamaModel  = preferredOllamaModel;

    // Store API key encrypted if provided
    if (apiKey && apiKeyProvider) {
      profile.setApiKey(apiKeyProvider, apiKey);
    }

    await profile.save();

    // Apply AI settings to runtime globals
    if (preferredAIMode) {
      global.aiModeOverride = preferredAIMode;
    }
    if (preferredProvider || apiKey) {
      const allKeys = profile.getAllApiKeys();
      global.cloudProviderState = {
        provider:  preferredProvider || global.cloudProviderState?.provider || 'claude',
        apiKey:    allKeys[preferredProvider || global.cloudProviderState?.provider] || '',
        model:     preferredModel || global.cloudProviderState?.model || '',
        customUrl: global.cloudProviderState?.customUrl || '',
      };
    }
    if (preferredOllamaModel) {
      global.ollamaModelOverride = preferredOllamaModel;
    }

    return sendSuccess(res, { user: user.toJSON() }, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current and new password are required.', 400);
    }
    if (newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters.', 400);
    }

    const user = await User.findById(req.userId);
    const valid = await user.comparePassword(currentPassword);
    if (!valid) return sendError(res, 'Current password is incorrect.', 401);

    user.passwordHash = newPassword; // pre-save hook hashes
    await user.save();

    return sendSuccess(res, null, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};

// ── LIST DECKS ────────────────────────────────────────────
const getDecks = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const [decks, total] = await Promise.all([
      Deck.find({ userId: req.userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('-cards'), // Don't return full card data in list
      Deck.countDocuments({ userId: req.userId }),
    ]);

    return sendSuccess(res, {
      decks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET SINGLE DECK (with cards) ─────────────────────────
const getDeck = async (req, res, next) => {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, userId: req.userId });
    if (!deck) return sendError(res, 'Deck not found.', 404);

    // Update last studied
    deck.lastStudiedAt = new Date();
    deck.studyCount    = (deck.studyCount || 0) + 1;
    await deck.save();

    return sendSuccess(res, { deck });
  } catch (error) {
    next(error);
  }
};

// ── SAVE DECK ─────────────────────────────────────────────
const saveDeck = async (req, res, next) => {
  try {
    const { title, originalFileName, fileType, cardType, cards, aiProvider, aiModel } = req.body;

    if (!cardType || !cards?.length) {
      return sendError(res, 'cardType and cards are required.', 400);
    }

    const deck = await Deck.create({
      userId: req.userId,
      title:  title || originalFileName || `${cardType} deck`,
      originalFileName,
      fileType,
      cardType,
      cards,
      aiProvider,
      aiModel,
    });

    // Increment total decks in profile
    await Profile.findOneAndUpdate(
      { userId: req.userId },
      { $inc: { totalDecks: 1 } }
    );

    return sendSuccess(res, { deck }, 'Deck saved successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// ── DELETE DECK ───────────────────────────────────────────
const deleteDeck = async (req, res, next) => {
  try {
    const deck = await Deck.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deck) return sendError(res, 'Deck not found.', 404);

    await Profile.findOneAndUpdate(
      { userId: req.userId },
      { $inc: { totalDecks: -1 } }
    );

    return sendSuccess(res, null, 'Deck deleted.');
  } catch (error) {
    next(error);
  }
};

// ── DELETE ACCOUNT ────────────────────────────────────────
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, 'User not found.', 404);

    const valid = await user.comparePassword(password);
    if (!valid) return sendError(res, 'Incorrect password.', 401);

    await Promise.all([
      User.deleteOne({ _id: req.userId }),
      Profile.deleteOne({ userId: req.userId }),
      Deck.deleteMany({ userId: req.userId }),
    ]);

    res.clearCookie('refreshToken', { path: '/api/auth' });
    return sendSuccess(res, null, 'Account deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = { getMe, updateMe, changePassword, getDecks, getDeck, saveDeck, deleteDeck, deleteAccount };
