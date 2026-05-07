// Service Worker for VinIverdagen
// Håndterer både caching og push-varsler

const CACHE_NAVN = 'viniverdagen-v2';

// Når service workeren installeres
self.addEventListener('install', (event) => {
  console.log('[SW] Installerer');
  self.skipWaiting();
});

// Når den aktiveres
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktivert');
  event.waitUntil(
    caches.keys().then((nokler) => {
      return Promise.all(
        nokler
          .filter((n) => n !== CACHE_NAVN)
          .map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('/auth/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((respons) => {
        if (respons.ok) {
          const klone = respons.clone();
          caches.open(CACHE_NAVN).then((cache) => cache.put(event.request, klone));
        }
        return respons;
      })
      .catch(() => caches.match(event.request))
  );
});

// PUSH-VARSLER
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { tittel: 'VinIverdagen', tekst: event.data.text() };
  }

  const tittel = data.tittel || 'VinIverdagen';
  const opsjoner = {
    body: data.tekst || '',
    icon: data.ikon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    tag: 'viniverdagen',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(tittel, opsjoner));
});

// Klikk på varsel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Hvis appen allerede er åpen, naviger til URL-en
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Ellers åpne ny fane
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
