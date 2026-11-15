// ============================================================
// OJTly Service Worker
// Minimal SW that makes the app PWA-installable.
// Chrome requires a SW with a fetch handler to trigger the
// beforeinstallprompt event.
// ============================================================

const CACHE_NAME = 'ojtly-v1';

// Pre-cache the app shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/icon-192.png',
        '/icon-512.png',
      ]).catch(() => {
        // Ignore failures — app still works without cached files
      });
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Skip Supabase API requests (don't cache auth)
  if (event.request.url.includes('.supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for same-origin requests
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache if network fails
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});
