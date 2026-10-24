const CACHE_NAME = "hms-pwa-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET, GraphQL/API/WebSocket, Vite dev server, and localhost requests
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/graphql") ||
    url.protocol.startsWith("ws") ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.port === "5173" ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("/node_modules/")
  ) {
    return;
  }

  // Network-First for HTML navigation documents
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/index.html");
        return cached || (await caches.match("/")) || Response.error();
      }),
    );
    return;
  }

  // Stale-While-Revalidate for static script, stylesheet, and font assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || fetchPromise;
    }),
  );
});

// Background Sync Event Listener for Tropical Weather Reconnection
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-hms-mutations") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "SYNC_MUTATIONS_REQUESTED" });
        }
      }),
    );
  }
});
