// Service Worker for VinIverdagen
// Versjon 3 - fikset fetch-handler

const CACHE_NAVN = "viniverdagen-v3";

self.addEventListener("install", (event) => {
  console.log("[SW] Installerer");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Aktivert");
  event.waitUntil(
    caches.keys().then((nokler) => {
      return Promise.all(
        nokler.filter((n) => n !== CACHE_NAVN).map((n) => caches.delete(n)),
      );
    }),
  );
  self.clients.claim();
});

// Network-first strategy - viktig: alltid returnere en gyldig Response
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Kun GET-forespørsler
  if (request.method !== "GET") return;

  // Hopp helt over for ikke-http(s) (chrome-extension://, etc.)
  const url = new URL(request.url);
  if (!url.protocol.startsWith("http")) return;

  // Hopp over API-kall, auth og Next.js interne
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/")
  ) {
    return;
  }

  // Network-first med fallback til cache
  event.respondWith(
    (async () => {
      try {
        const respons = await fetch(request);
        // Cache vellykkede svar
        if (respons.ok) {
          const cache = await caches.open(CACHE_NAVN);
          cache.put(request, respons.clone()).catch(() => {});
        }
        return respons;
      } catch (e) {
        // Hvis nett feiler, prøv cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // Hvis ingen cache, returner en gyldig 503-respons (ikke crash)
        return new Response("Offline - prøv igjen senere", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});

// PUSH-VARSLER
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { tittel: "VinIverdagen", tekst: event.data.text() };
  }

  const tittel = data.tittel || "VinIverdagen";
  const opsjoner = {
    body: data.tekst || "",
    icon: data.ikon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
    tag: "viniverdagen",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(tittel, opsjoner));
});

// Klikk på varsel
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
