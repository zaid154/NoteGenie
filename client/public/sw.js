/* NoteGenie service worker.
 * - Precaches the app shell so the SPA opens offline.
 * - Cache-first for hashed build assets (immutable), runtime-cached.
 * - Network-first for navigations, falling back to cached index.html offline.
 * - NEVER touches the backend API or SSE streams (passes through untouched).
 * Bump CACHE when the shell strategy changes; old caches are purged on activate.
 */
const CACHE = "notegenie-shell-v1";
const SHELL = ["/", "/index.html", "/favicon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only manage same-origin requests; the API (different origin in prod) and any
  // third-party request pass straight through to the network.
  if (url.origin !== self.location.origin) return;
  // Belt-and-suspenders: never intercept same-origin API / streaming endpoints.
  if (url.pathname.startsWith("/api/")) return;

  // SPA navigations: try network, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }

  // Static assets: serve from cache, else fetch and cache hashed/static files.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const cacheable = res && res.ok && (url.pathname.startsWith("/assets/") || url.pathname === "/favicon.svg");
          if (cacheable) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
