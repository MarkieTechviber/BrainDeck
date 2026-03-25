// server/routes/library.js — public deck library API
const express  = require('express');
const router   = express.Router();
const { Op, fn, col, literal } = require('sequelize');
const { PublicDeck, DeckRating, User, Deck } = require('../models/index');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/responseUtils');

const SUBJECTS = ['General','Mathematics','Science','History','Language','Literature',
  'Computer Science','Business','Medicine','Law','Philosophy','Art','Music',
  'Engineering','Economics','Psychology','Biology','Chemistry','Physics','Other'];

// ── Helper: compute avg rating ──────────────────
function avgRating(deck) {
  if (!deck.ratingCount) return 0;
  return Math.round((deck.ratingSum / deck.ratingCount) * 10) / 10;
}

// ── Safe deck shape (no full cards array in list) ──
function deckShape(d) {
  return {
    id:          d.id,
    title:       d.title,
    description: d.description,
    subject:     d.subject,
    tags:        d.tags,
    cardType:    d.cardType,
    difficulty:  d.difficulty,
    cardCount:   d.cardCount,
    language:    d.language,
    viewCount:   d.viewCount,
    forkCount:   d.forkCount,
    rating:      avgRating(d),
    ratingCount: d.ratingCount,
    authorName:  d.authorName || 'Anonymous',
    forkedFromId:d.forkedFromId,
    createdAt:   d.createdAt,
  };
}

// ── GET /api/library — browse with filters ──────
router.get('/', async (req, res) => {
  try {
    const { subject, cardType, difficulty, q, sort = 'popular', page = 1, limit = 20 } = req.query;
    const where = {};
    if (subject)    where.subject  = subject;
    if (cardType)   where.cardType = cardType;
    if (difficulty) where.difficulty = difficulty;
    if (q) {
      where[Op.or] = [
        { title:       { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { subject:     { [Op.like]: `%${q}%` } },
      ];
    }

    const ORDER = {
      popular:  [['viewCount',  'DESC']],
      newest:   [['createdAt',  'DESC']],
      rating:   [['ratingSum',  'DESC']],
      forked:   [['forkCount',  'DESC']],
    };

    const { rows, count } = await PublicDeck.findAndCountAll({
      where,
      order:  ORDER[sort] || ORDER.popular,
      limit:  Math.min(parseInt(limit) || 20, 50),
      offset: (Math.max(parseInt(page) || 1, 1) - 1) * (Math.min(parseInt(limit)||20, 50)),
      attributes: { exclude: ['cards'] },
    });

    return sendSuccess(res, {
      decks:    rows.map(deckShape),
      total:    count,
      page:     parseInt(page),
      pages:    Math.ceil(count / (parseInt(limit) || 20)),
      subjects: SUBJECTS,
    });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── GET /api/library/:id — full deck with cards ──
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const deck = await PublicDeck.findByPk(req.params.id);
    if (!deck) return sendError(res, 'Deck not found.', 404);

    // Increment view count
    deck.viewCount++;
    await deck.save();

    // Check if user already rated
    let userRating = null;
    if (req.userId) {
      const r = await DeckRating.findOne({ where: { publicDeckId: deck.id, userId: req.userId } });
      if (r) userRating = r.rating;
    }

    return sendSuccess(res, {
      deck: { ...deckShape(deck), cards: deck.cards },
      userRating,
    });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── POST /api/library — publish a deck ──────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, subject, tags, cardType, difficulty,
            cards, cardCount, language, deckId } = req.body;

    if (!title || !cards?.length || !cardType) {
      return sendError(res, 'title, cards, and cardType are required.', 400);
    }
    if (!SUBJECTS.includes(subject || 'General')) {
      return sendError(res, `Invalid subject. Choose from: ${SUBJECTS.join(', ')}`, 400);
    }

    // Get author name from User
    const { User } = require('../models/index');
    const user = await User.findByPk(req.userId, { attributes: ['name','email'] });
    const authorName = user?.name || user?.email?.split('@')[0] || 'Anonymous';

    const pub = await PublicDeck.create({
      userId:      req.userId,
      authorName,
      title:       title.slice(0, 200),
      description: (description || '').slice(0, 500),
      subject:     subject || 'General',
      tags:        Array.isArray(tags) ? tags.slice(0, 8).map(t => String(t).slice(0,30)) : [],
      cardType,
      difficulty:  difficulty || 'medium',
      cards,
      cardCount:   cards.length,
      language:    language || 'English',
    });

    return sendSuccess(res, { deck: deckShape(pub) }, 'Deck published to the library!', 201);
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── POST /api/library/:id/fork — copy to my decks ──
router.post('/:id/fork', requireAuth, async (req, res) => {
  try {
    const pub = await PublicDeck.findByPk(req.params.id);
    if (!pub) return sendError(res, 'Deck not found.', 404);

    // Save to user's private decks
    const { Deck, Profile } = require('../models/index');
    const saved = await Deck.create({
      userId:           req.userId,
      title:            `${pub.title} (forked)`,
      originalFileName: null,
      fileType:         null,
      cardType:         pub.cardType,
      cards:            pub.cards,
      cardCount:        pub.cardCount,
      aiProvider:       'community',
    });
    await Profile.increment('totalDecks', { where: { userId: req.userId } });

    // Increment fork count
    pub.forkCount++;
    await pub.save();

    return sendSuccess(res, { deck: saved }, 'Deck forked to your library!', 201);
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── POST /api/library/:id/rate ──────────────────
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'Rating must be 1–5.', 400);
    }
    const pub = await PublicDeck.findByPk(req.params.id);
    if (!pub) return sendError(res, 'Deck not found.', 404);

    const [existing, created] = await DeckRating.findOrCreate({
      where: { publicDeckId: pub.id, userId: req.userId },
      defaults: { rating, userId: req.userId, publicDeckId: pub.id },
    });

    if (!created) {
      // Update existing rating
      pub.ratingSum   -= existing.rating;
      existing.rating  = rating;
      await existing.save();
    } else {
      pub.ratingCount++;
    }
    pub.ratingSum += rating;
    await pub.save();

    return sendSuccess(res, {
      rating:      avgRating(pub),
      ratingCount: pub.ratingCount,
      userRating:  rating,
    }, 'Rating saved.');
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── DELETE /api/library/:id — unpublish ─────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const pub = await PublicDeck.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!pub) return sendError(res, 'Deck not found or not yours.', 404);
    await pub.destroy();
    return sendSuccess(res, null, 'Deck removed from library.');
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── GET /api/library/meta/subjects ──────────────
router.get('/meta/subjects', (req, res) => {
  res.json({ success: true, subjects: SUBJECTS });
});

module.exports = router;
