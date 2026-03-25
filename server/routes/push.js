// server/routes/push.js
const express  = require('express');
const router   = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { PushSubscription } = require('../models/index');
const { sendToUser, payloads, isConfigured, VAPID_PUBLIC } = require('../services/pushService');

// ── GET /api/push/vapid-key — public key for client ──
router.get('/vapid-key', (req, res) => {
  res.json({ success: true, publicKey: VAPID_PUBLIC, enabled: isConfigured() });
});

// ── POST /api/push/subscribe ──
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint, keys, userAgent, dueCardCount } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
    }

    // Upsert — update if endpoint exists, create if not
    const [sub, created] = await PushSubscription.findOrCreate({
      where: { endpoint },
      defaults: {
        userId:       req.userId,
        endpoint,
        p256dh:       keys.p256dh,
        auth:         keys.auth,
        userAgent:    userAgent || '',
        dueCardCount: dueCardCount || 0,
      },
    });

    if (!created) {
      // Update keys in case they rotated
      sub.p256dh       = keys.p256dh;
      sub.auth         = keys.auth;
      sub.dueCardCount = dueCardCount || sub.dueCardCount;
      await sub.save();
    }

    res.json({ success: true, message: created ? 'Subscribed' : 'Updated', id: sub.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/push/unsubscribe ──
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ success: false, message: 'Endpoint required.' });

    await PushSubscription.destroy({ where: { endpoint, userId: req.userId } });
    res.json({ success: true, message: 'Unsubscribed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/push/sync-due — client syncs how many cards are due ──
router.patch('/sync-due', requireAuth, async (req, res) => {
  try {
    const { dueCardCount, endpoint } = req.body;
    if (typeof dueCardCount !== 'number') {
      return res.status(400).json({ success: false, message: 'dueCardCount must be a number.' });
    }

    const where = { userId: req.userId };
    if (endpoint) where.endpoint = endpoint;

    await PushSubscription.update({ dueCardCount }, { where });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/push/test — send test notification (dev only) ──
router.post('/test', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not available in production.' });
  }
  try {
    const result = await sendToUser(req.userId, {
      title: 'BrainDeck test notification 🧠',
      body:  'Push notifications are working!',
      icon:  '/favicon.svg',
      tag:   'test',
      data:  { url: '/' },
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/push/status — check subscription status ──
router.get('/status', requireAuth, async (req, res) => {
  try {
    const count = await PushSubscription.count({ where: { userId: req.userId } });
    res.json({ success: true, subscribed: count > 0, count, vapidEnabled: isConfigured() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
