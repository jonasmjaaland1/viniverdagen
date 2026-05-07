// Service Worker for VinIverdagen
// Fase 1: Bare grunnleggende - cache for offline-tilgang
// Senere fase: vil håndtere push-varsler

const CACHE_NAVN = 'viniverdagen-v1';

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

// Network-first strategy (alltid prøv nett først, fall til cache)
self.addEventListener('fetch', (event) => {
  // Bare cache GET-forespørsler
  if (event.request.method !== 'GET') return;

  // Hopp over API-kall og auth
  if (event.request.url.includes('/api/') || event.request.url.includes('/auth/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((respons) => {
        // Cache vellykkede svar
        if (respons.ok) {
          const klone = respons.clone();
          caches.open(CACHE_NAVN).then((cache) => cache.put(event.request, klone));
        }
        return respons;
      })
      .catch(() => caches.match(event.request))
  );
});
