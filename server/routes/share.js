// server/routes/share.js — ephemeral deck sharing (72-hour links)
// Stores shared sessions in-memory (sufficient for small deployments).
// Each share gets a random ID; the client redirects to /study/:id.

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// ── In-memory store: { [shareId]: { data, expiresAt, views } } ──
const shares = new Map();
const TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

// Prune expired entries lazily every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of shares) {
    if (entry.expiresAt < now) shares.delete(id);
  }
}, 60 * 60 * 1000);

// ── POST /api/share — create a share link ──────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { sessionData } = req.body;
    if (!sessionData) {
      return res.status(400).json({ success: false, message: 'sessionData is required.' });
    }

    let parsed;
    try {
      parsed = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    } catch {
      return res.status(400).json({ success: false, message: 'sessionData is not valid JSON.' });
    }

    if (!parsed.cards?.length) {
      return res.status(400).json({ success: false, message: 'No cards found in session.' });
    }

    const shareId   = crypto.randomBytes(12).toString('base64url'); // URL-safe 16-char token
    const expiresAt = Date.now() + TTL_MS;

    shares.set(shareId, {
      data: {
        cards:     parsed.cards,
        cardType:  parsed.cardType  || 'flashcard',
        title:     parsed.title     || 'Shared Deck',
        cardCount: parsed.cards.length,
      },
      expiresAt,
      views: 0,
    });

    return res.status(201).json({
      success: true,
      shareId,
      url: `/study/${shareId}`,
      expiresAt: new Date(expiresAt).toISOString(),
    });

  } catch (err) {
    console.error('[Share] POST error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not create share link.' });
  }
});

// ── GET /api/share/:id — retrieve a shared deck ───────────────────────────
router.get('/:id', (req, res) => {
  const entry = shares.get(req.params.id);

  if (!entry) {
    return res.status(404).json({ success: false, message: 'Share link not found or has expired.' });
  }

  if (entry.expiresAt < Date.now()) {
    shares.delete(req.params.id);
    return res.status(410).json({ success: false, message: 'This share link has expired.' });
  }

  entry.views += 1;

  return res.json({
    success: true,
    data: { ...entry.data, views: entry.views },
    expiresAt: new Date(entry.expiresAt).toISOString(),
  });
});

module.exports = router;
