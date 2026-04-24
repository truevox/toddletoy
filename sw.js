/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const CACHE_PREFIX = `toddler-toy-v${APP_VERSION}`;
const RUNTIME_CACHE_BASE = 'toddler-toy-v';

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

registerRoute(
  ({ request }) => request.mode === 'navigate',
  createHandlerBoundToURL('/index.html')
);

registerRoute(
  ({ request }) => ['script', 'style', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: `${CACHE_PREFIX}-assets`
  })
);

registerRoute(
  ({ request, url }) => request.destination === 'font' || url.pathname.startsWith('/fonts/'),
  new CacheFirst({
    cacheName: `${CACHE_PREFIX}-fonts`,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 })
    ]
  })
);

registerRoute(
  ({ request, url }) => {
    const isLocalJson = request.destination === '' && url.origin === self.location.origin && url.pathname.endsWith('.json');
    return isLocalJson;
  },
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-data`,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 })
    ]
  })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) =>
          cacheName.startsWith(RUNTIME_CACHE_BASE) && !cacheName.startsWith(CACHE_PREFIX)
        )
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});
