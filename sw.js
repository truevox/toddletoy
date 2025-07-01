// Service Worker for Toddler Toy PWA
const CACHE_NAME = 'toddler-toy-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/game.js',
  '/public/emojis.json',
  '/public/things.json',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip Vite dev server resources
  if (event.request.url.includes('/@vite/') || 
      event.request.url.includes('?t=') ||
      event.request.url.includes('localhost:4003')) {
    return; // Let browser handle Vite dev resources
  }

  // Strategy for navigation requests (e.g., index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request) // Try network first
        .then((response) => {
          // If successful, cache and return
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          console.log('[SW] Network failed for navigation, falling back to cache:', event.request.url);
          return caches.match(event.request);
        })
    );
    return;
  }

  // Default strategy for other requests (cache-first, then network)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  // Could be used to sync user progress or settings when back online
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  // Could be used for learning reminders or new content notifications
});

// Message handling between SW and main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_CACHE_SIZE') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({ 
          type: 'CACHE_SIZE',
          size: keys.length 
        });
      });
    });
  }
});