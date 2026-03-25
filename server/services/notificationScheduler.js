// server/services/notificationScheduler.js
const cron = require('node-cron');
const { PushSubscription, User, Deck } = require('../models/index');
const { sendToUser, payloads } = require('./pushService');
const { Op } = require('sequelize');

// ── Daily SR reminder — runs every day at 8:00 AM ──
function scheduleDailyReminder() {
  // '0 8 * * *' = 8:00 AM daily
  // '*/30 * * * *' = every 30 min (for testing)
  const schedule = process.env.PUSH_SCHEDULE || '0 8 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Scheduler] Running daily SR reminder...');
    try {
      // Get all users with active push subscriptions
      const subs = await PushSubscription.findAll({
        include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        where: {
          // Only notify users who haven't been notified today
          [Op.or]: [
            { lastNotifiedAt: null },
            {
              lastNotifiedAt: {
                [Op.lt]: new Date(new Date().setHours(0, 0, 0, 0)), // before today midnight
              },
            },
          ],
        },
      });

      const userIds = [...new Set(subs.map(s => s.userId))];
      console.log(`[Scheduler] Notifying ${userIds.length} users`);

      let notified = 0;
      for (const userId of userIds) {
        try {
          // Check if user has any decks with due cards
          const decks = await Deck.findAll({ where: { userId } });

          // dueCardCount is set by the client when it syncs SR state
          const totalDue = subs
            .filter(s => s.userId === userId)
            .reduce((acc, s) => Math.max(acc, s.dueCardCount || 0), 0);

          if (totalDue > 0) {
            const topDeck = decks[0];
            const result = await sendToUser(userId, payloads.dueCards(totalDue, topDeck?.title));
            if (result.sent > 0) notified++;
          }
        } catch (err) {
          console.error(`[Scheduler] Failed for user ${userId}:`, err.message);
        }
      }

      console.log(`[Scheduler] Done — ${notified} users notified`);
    } catch (err) {
      console.error('[Scheduler] Daily reminder error:', err.message);
    }
  }, { timezone: 'Asia/Manila' }); // Change to your timezone

  console.log(`[Scheduler] Daily SR reminder scheduled: ${schedule}`);
}

// ── Evening streak reminder — 9:00 PM ──
function scheduleStreakReminder() {
  const schedule = process.env.STREAK_REMINDER_SCHEDULE || '0 21 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Scheduler] Running streak reminder...');
    try {
      // Only notify users who have a streak > 1 day
      // We can't know streak from server — just notify everyone with subscriptions
      const subs = await PushSubscription.findAll({
        where: {
          lastNotifiedAt: {
            [Op.lt]: new Date(new Date().setHours(12, 0, 0, 0)), // not notified this afternoon
          },
        },
      });

      const userIds = [...new Set(subs.map(s => s.userId))];
      let notified = 0;

      for (const userId of userIds) {
        try {
          const result = await sendToUser(userId, payloads.streakReminder(1));
          if (result.sent > 0) notified++;
        } catch {}
      }

      console.log(`[Scheduler] Streak reminders sent to ${notified} users`);
    } catch (err) {
      console.error('[Scheduler] Streak reminder error:', err.message);
    }
  }, { timezone: 'Asia/Manila' });

  console.log(`[Scheduler] Streak reminder scheduled: ${schedule}`);
}

function startScheduler() {
  scheduleDailyReminder();
  scheduleStreakReminder();
  console.log('[Scheduler] All notification jobs running');
}

module.exports = { startScheduler };
