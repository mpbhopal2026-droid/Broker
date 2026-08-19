/* Global Forex service worker.
 *
 * Bumping CACHE_NAME purges every previous cache on activate.
 */
const CACHE_NAME = 'globalforex-v3';

/* Only genuinely static assets are pre-cached. */
const PRECACHE = ['/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  );
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

  /* 
   * NEVER intercept application pages, dynamic routes, Next.js RSC requests,
   * or API endpoints. Let the browser handle them directly via native network.
   */
  const isNextOrApi =
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/trade') ||
    url.pathname.startsWith('/market') ||
    url.pathname.startsWith('/kyc') ||
    url.pathname.startsWith('/deposit') ||
    url.pathname.startsWith('/withdraw') ||
    request.headers.get('RSC') ||
    request.headers.get('Next-Router-State-Tree') ||
    request.headers.get('Next-Url') ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    !request.destination;

  if (isNextOrApi) {
    return; // Pass through straight to network
  }

  /* Only cache static media/assets (icons, fonts, static images, manifest) */
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.json' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          })
          .catch(() => new Response('', { status: 408, statusText: 'Asset unavailable offline' }));
      }),
    );
  }
});

/* Lets the page tell a waiting worker to activate at once. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
