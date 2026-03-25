// public/sw.js — BrainDeck Service Worker v2
// PWA: offline support + push notifications

const VERSION    = 'braindeck-v2';
const CACHE_SHELL = VERSION + '-shell';
const CACHE_PAGES = VERSION + '-pages';
const CACHE_FONTS = VERSION + '-fonts';

// App shell — pre-cached on install
const SHELL_URLS = [
  '/',
  '/index.html',
  '/flashcard.html',
  '/summary.html',
  '/quiz.html',
  '/dashboard.html',
  '/decks.html',
  '/profile.html',
  '/login.html',
  '/register.html',
  '/css/_variables.css',
  '/css/style.css',
  '/css/sidebar.css',
  '/css/flashcard.css',
  '/css/quiz.css',
  '/css/summary.css',
  '/css/auth.css',
  '/js/theme.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/sidebar.js',
  '/js/shortcuts.js',
  '/js/spaced-rep.js',
  '/js/streaks.js',
  '/js/push-notifications.js',
  '/favicon.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/manifest.json',
];

// CDN assets — cache on first use
const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// ── Install ──────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_SHELL).then(cache =>
      // addAll fails if ANY request fails — use individual adds to be resilient
      Promise.allSettled(SHELL_URLS.map(url =>
        cache.add(url).catch(() => {}) // silently skip if a file doesn't exist yet
      ))
    ).then(() => console.log('[SW] Shell cached'))
  );
});

// ── Activate — clean old caches ─────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !k.startsWith(VERSION))
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy router ────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept non-GET or API calls
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/uploads/')) return;

  // CDN assets — cache first, network fallback
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    e.respondWith(cacheFirst(request, CACHE_FONTS));
    return;
  }

  // App shell pages — stale-while-revalidate
  if (SHELL_URLS.includes(url.pathname) || url.pathname === '/') {
    e.respondWith(staleWhileRevalidate(request, CACHE_SHELL));
    return;
  }

  // Everything else — network first, cache fallback
  e.respondWith(networkFirst(request, CACHE_PAGES));
});

// ── Caching strategies ───────────────────────

// Cache first — serve cache, fall back to network, then cache it
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network first — try network, cache on success, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlinePage();
  }
}

// Stale-while-revalidate — serve cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Offline fallback page
function offlinePage() {
  return new Response(`
    <!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>BrainDeck — Offline</title>
    <style>
      body{background:#1a1f2e;color:#e2e8f8;font-family:-apple-system,sans-serif;
           display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
      .box{padding:2rem}
      .icon{font-size:3rem;margin-bottom:1rem}
      h2{font-size:1.4rem;margin:0 0 .5rem;color:#fff}
      p{color:#8b94b8;margin:0 0 1.5rem}
      button{background:linear-gradient(135deg,#6c63ff,#38bdf8);color:#fff;border:none;
             border-radius:12px;padding:.8rem 2rem;font-size:1rem;font-weight:700;cursor:pointer}
    </style></head>
    <body><div class="box">
      <div class="icon">🧠</div>
      <h2>You're offline</h2>
      <p>Check your connection and try again.</p>
      <button onclick="location.reload()">Try again</button>
    </div></body></html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

// ── Push notifications ───────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch { data = { title: 'BrainDeck', body: e.data?.text() || 'Time to study!' }; }

  e.waitUntil(self.registration.showNotification(data.title || 'BrainDeck', {
    body:     data.body     || 'You have cards ready for review.',
    icon:     data.icon     || '/icons/icon-192x192.svg',
    badge:    '/icons/icon-72x72.svg',
    tag:      data.tag      || 'braindeck',
    renotify: data.renotify || false,
    data:     data.data     || { url: '/' },
    actions:  data.actions  || [],
    vibrate:  [100, 50, 100],
  }));
});

// ── Notification click ───────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.action === 'later' ? '/' : (e.notification.data?.url || '/');

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.focus();
          c.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', () => {});

// ── Message from page ────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
