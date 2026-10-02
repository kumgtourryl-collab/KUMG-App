self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Handle notification clicks — open KUMG when tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/kumg/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/kumg/');
    })
  );
});
