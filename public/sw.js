// Service Worker for ToddleToy PWA
const CACHE_NAME = 'toddletoy-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Skip cache for JSON files with cache busting parameters
  if (url.pathname.endsWith('.json') && url.searchParams.has('v')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Skip cache for development server requests
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});