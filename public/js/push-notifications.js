// public/js/push-notifications.js
// Handles SW registration, push subscription, and SR sync
'use strict';

const PushNotifications = (() => {
  let swReg = null;
  let vapidKey = null;

  // ── Convert VAPID key ──
  const urlB64ToUint8 = base64 => {
    const pad  = '='.repeat((4 - base64.length % 4) % 4);
    const b64  = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw  = atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  };

  // ── Register service worker ──
  async function registerSW() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Forward notification clicks from SW to app
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'NOTIFICATION_CLICK' && e.data.url) {
          window.location.href = e.data.url;
        }
      });
      return swReg;
    } catch (err) {
      console.warn('[Push] SW registration failed:', err.message);
      return null;
    }
  }

  // ── Fetch VAPID public key from server ──
  async function getVapidKey() {
    if (vapidKey) return vapidKey;
    try {
      const r = await fetch('/api/push/vapid-key');
      const d = await r.json();
      if (d.enabled && d.publicKey) {
        vapidKey = d.publicKey;
        return vapidKey;
      }
    } catch {}
    return null;
  }

  // ── Request permission + subscribe ──
  async function subscribe() {
    if (!('PushManager' in window)) {
      return { success: false, reason: 'not_supported' };
    }

    const key = await getVapidKey();
    if (!key) return { success: false, reason: 'no_vapid' };

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { success: false, reason: 'denied' };

    if (!swReg) swReg = await registerSW();
    if (!swReg) return { success: false, reason: 'no_sw' };

    try {
      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlB64ToUint8(key),
      });

      // Count due cards to send to server
      const dueCount = getDueCardCount();

      const token = typeof BrainDeckAuth !== 'undefined' ? BrainDeckAuth.getToken() : null;
      const r = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({
          endpoint:     sub.endpoint,
          keys:         { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))) },
          userAgent:    navigator.userAgent.slice(0, 200),
          dueCardCount: dueCount,
        }),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('bd_push_subscribed', '1');
        return { success: true };
      }
      return { success: false, reason: d.message };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  // ── Unsubscribe ──
  async function unsubscribe() {
    if (!swReg) swReg = await registerSW();
    try {
      const sub = await swReg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const token = typeof BrainDeckAuth !== 'undefined' ? BrainDeckAuth.getToken() : null;
        await fetch('/api/push/unsubscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      localStorage.removeItem('bd_push_subscribed');
      return { success: true };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  // ── Check current subscription status ──
  async function getStatus() {
    if (!('PushManager' in window)) return { supported: false };
    const perm = Notification.permission;
    if (!swReg) swReg = await registerSW();
    const sub = await swReg?.pushManager.getSubscription().catch(() => null);
    return {
      supported:  true,
      permission: perm,
      subscribed: !!sub,
      endpoint:   sub?.endpoint,
    };
  }

  // ── Count due cards from localStorage SR data ──
  function getDueCardCount() {
    try {
      const data = JSON.parse(localStorage.getItem('bd_sr_cards') || '{}');
      const now  = new Date();
      return Object.values(data).filter(c => {
        if (!c.nextReview) return true;
        return new Date(c.nextReview) <= now;
      }).length;
    } catch { return 0; }
  }

  // ── Sync due count to server (call after studying) ──
  async function syncDueCount() {
    const count = getDueCardCount();
    const token = typeof BrainDeckAuth !== 'undefined' ? BrainDeckAuth.getToken() : null;
    if (!token) return;
    fetch('/api/push/sync-due', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ dueCardCount: count }),
    }).catch(() => {});
  }

  // ── Send test notification (dev) ──
  async function sendTest() {
    const token = typeof BrainDeckAuth !== 'undefined' ? BrainDeckAuth.getToken() : null;
    if (!token) return { success: false, reason: 'not_logged_in' };
    const r = await fetch('/api/push/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    return r.json();
  }

  // ── Auto-register SW on load ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW);
  } else {
    registerSW();
  }

  // ── Sync due count every time app loads ──
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(syncDueCount, 3000); // after 3s so SR data is loaded
  });

  return { subscribe, unsubscribe, getStatus, syncDueCount, getDueCardCount, sendTest };
})();
