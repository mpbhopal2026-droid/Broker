/* Global Forex service worker.
 *
 * Bumping this string purges every previous cache on activate. Change it on any
 * deploy where clients must not keep old assets.
 */
const CACHE_NAME = 'globalforex-v2';

/* Only genuinely static, rarely-changing things are pre-cached. Application
 * code is deliberately absent — see the fetch handler. */
const PRECACHE = ['/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  );
  // Take over immediately rather than waiting for every tab to close. Without
  // this a phone that never fully closes the app runs the old worker forever.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Never serve application code from cache.
   *
   * The previous worker was cache-first for every non-navigation request,
   * including /_next/static/chunks/*.js. Once a chunk was cached it was served
   * forever, so a deployed fix could not reach anyone — the app kept running
   * whatever code it had first seen, and the only cure was clearing site data
   * by hand on every device. That is not something you can ask clients to do.
   *
   * These paths are content-hashed by Next, so the network is already the fast
   * path: an unchanged file is served from the HTTP cache, and a changed one has
   * a different URL. Letting the browser handle them is both correct and quick.
   */
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    request.destination === 'script' ||
    request.destination === 'document'
  ) {
    return; // straight to network
  }

  /* Navigations: network first, cache only as an offline fallback, so a client
   * on a flaky connection still gets something rather than a browser error. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/dashboard'))),
    );
    return;
  }

  /* Everything else — icons, images, fonts. Cache-first is safe here because
   * these are immutable and cheap to re-fetch when missing. */
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        }),
    ),
  );
});

/* Lets the page tell a waiting worker to activate at once. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
