const CACHE_NAME = 'ridesync-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/ridesync-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('ridesync-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Keep app navigation available during brief network dropouts. Supabase/API
// requests and all cross-origin requests are deliberately left network-only.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/')))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') ||
      url.pathname === '/manifest.webmanifest' ||
      url.pathname === '/ridesync-icon.svg') {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
    );
  }
});

// Existing RideSync SOS push notifications.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || 'A rider needs help.' };
  }
  event.waitUntil(self.registration.showNotification(payload.title || '🚨 RideSync SOS alert', {
    body: payload.body || 'A rider in your group needs help.',
    icon: '/ridesync-icon.svg',
    badge: '/ridesync-icon.svg',
    tag: payload.tag || 'ridesync-sos',
    renotify: true,
    requireInteraction: true,
    data: { url: payload.url || self.location.origin, latitude: payload.latitude, longitude: payload.longitude },
    actions: [{ action: 'view', title: 'View ride' }],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.location.origin;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client && client.url !== targetUrl) await client.navigate(targetUrl);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  })());
});
