// server/services/pushService.js
const webpush = require('web-push');

// ── VAPID setup ─────────────────────────────
// Generate once: node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(JSON.stringify(k))"
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL        || 'mailto:admin@braindeck.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('[Push] VAPID keys configured');
} else {
  console.warn('[Push] No VAPID keys — push notifications disabled. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env');
}

const isConfigured = () => !!(VAPID_PUBLIC && VAPID_PRIVATE);

// ── Send to one subscription ─────────────────
async function sendToSubscription(sub, payload) {
  if (!isConfigured()) return { sent: false, reason: 'no_vapid' };
  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return { sent: true };
  } catch (err) {
    // 410 Gone = subscription expired/revoked → delete it
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { sent: false, reason: 'expired', delete: true };
    }
    return { sent: false, reason: err.message };
  }
}

// ── Send to all subscriptions for a user ────
async function sendToUser(userId, payload) {
  const { PushSubscription } = require('../models/index');
  const subs = await PushSubscription.findAll({ where: { userId } });
  if (!subs.length) return { sent: 0, total: 0 };

  let sent = 0;
  for (const sub of subs) {
    const result = await sendToSubscription(sub, payload);
    if (result.sent) {
      sent++;
      sub.lastNotifiedAt = new Date();
      await sub.save();
    }
    if (result.delete) await sub.destroy();
  }
  return { sent, total: subs.length };
}

// ── Notification payload builders ───────────
const payloads = {
  dueCards: (count, deckTitle) => ({
    title: `${count} card${count !== 1 ? 's' : ''} due for review`,
    body:  deckTitle
      ? `Time to review "${deckTitle}" — keep your streak alive!`
      : `You have cards ready for spaced repetition review.`,
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    tag:   'sr-due',
    renotify: true,
    data:  { url: '/', type: 'sr_due' },
    actions: [
      { action: 'study', title: 'Study now' },
      { action: 'later', title: 'Remind later' },
    ],
  }),

  streakReminder: (streakDays) => ({
    title: `Don't break your ${streakDays}-day streak! 🔥`,
    body:  "You haven't studied today yet. Keep your streak alive!",
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    tag:   'streak-reminder',
    data:  { url: '/', type: 'streak' },
    actions: [{ action: 'study', title: 'Study now' }],
  }),

  deckReady: (deckTitle, cardCount) => ({
    title: 'Your deck is ready!',
    body:  `"${deckTitle}" — ${cardCount} cards generated and waiting.`,
    icon:  '/favicon.svg',
    tag:   'deck-ready',
    data:  { url: '/decks.html', type: 'deck_ready' },
  }),

  weeklyDigest: (stats) => ({
    title: `BrainDeck weekly recap 📊`,
    body:  `${stats.streakDays}-day streak · ${stats.xp} XP · ${stats.dueCards} cards due`,
    icon:  '/favicon.svg',
    tag:   'weekly-digest',
    data:  { url: '/dashboard.html', type: 'digest' },
  }),
};

module.exports = { sendToSubscription, sendToUser, payloads, isConfigured, VAPID_PUBLIC };
