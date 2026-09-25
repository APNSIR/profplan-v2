const CACHE_NAME = 'profplan-cache-v1';

// Core routes to pre-cache immediately upon install
const PRECACHE_ASSETS = [
  '/',
  '/today',
  '/timetable',
  '/syllabus',
  '/log',
  '/holidays',
  '/reports',
  '/manifest.webmanifest',
  '/apnsir-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests (pages, scripts, styles, images)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip caching external analytics or chrome extensions
  if (!url.origin.includes(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch from network in background to keep cache fresh
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, if no cache available, return fallback if available
          return cachedResponse;
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});