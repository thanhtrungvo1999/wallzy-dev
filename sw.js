const CACHE_VERSION = 'wallzy-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const MAX_IMAGE_CACHE_ENTRIES = 80;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/shortcut-explore.png',
  '/icons/shortcut-favorites.png',
  '/icons/shortcut-studio.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== IMAGE_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isImage = request.destination === 'image' ||
    url.hostname === 'images.weserv.nl' ||
    /\.(avif|webp|jpg|jpeg|png|gif)(\?|$)/i.test(url.pathname);

  if (isImage) {
    event.respondWith(cacheImage(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request, { cache: 'no-store' })
      .then(response => {
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone());
      await trimImageCache(cache);
    }
    return response;
  } catch (error) {
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    throw error;
  }
}

async function trimImageCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= MAX_IMAGE_CACHE_ENTRIES) return;

    const removeCount = keys.length - MAX_IMAGE_CACHE_ENTRIES;
    await Promise.all(keys.slice(0, removeCount).map(key => cache.delete(key)));
  } catch (error) {
    // Cache cleanup is non-critical and must never break image loading.
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || await network || Response.error();
}
