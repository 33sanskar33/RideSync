self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || 'A rider needs help.' };
  }
  event.waitUntil(self.registration.showNotification(payload.title || '🚨 RideSync SOS alert', {
    body: payload.body || 'A rider in your group needs help.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
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
