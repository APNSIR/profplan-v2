// public/sw.js
const CACHE_NAME = 'profplan-cache-v3';

// Core routes and assets to pre-cache immediately upon install
const PRECACHE_ASSETS = [
  '/',
  '/today',
  '/timetable',
  '/syllabus',
  '/log',
  '/holidays',
  '/reports',
  '/setup',
  '/manifest.webmanifest',
  '/apnsir-logo.png',
  '/charumani-parida.png'
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

/**
 * Helper to clean redirected responses for Safari/WebKit compatibility.
 * Safari crashes if a Service Worker responds with a Response where `redirected === true`.
 */
function cleanRedirectedResponse(response) {
  if (!response || !response.redirected) {
    return response;
  }
  const body = response.body;
  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

self.addEventListener('fetch', (event) => {
  // Only handle GET requests (pages, scripts, styles, images)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip external analytics, chrome extensions, APIs, and Supabase cloud sync calls
  if (!url.origin.includes(self.location.origin)) return;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) return;

  // Handle top-level page navigations (Network first with cache fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const sanitized = cleanRedirectedResponse(networkResponse);
          if (networkResponse && networkResponse.status === 200) {
            const copy = sanitized.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return sanitized;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('/today') || caches.match('/');
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets, scripts, stylesheets, and images
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          const sanitized = cleanRedirectedResponse(networkResponse);
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = sanitized.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return sanitized;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});