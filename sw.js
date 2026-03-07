const CACHE_NAME = 'daily-log-v4';
const FONT_CACHE = 'daily-log-fonts-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/styles.css',
  './js/constants.js',
  './js/storage.js',
  './js/utils.js',
  './js/entries.js',
  './js/confirm.js',
  './js/modal.js',
  './js/history.js',
  './js/review.js',
  './js/obsidian.js',
  './js/backup.js',
  './js/pwa.js',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== FONT_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request)
            .then((response) => {
              cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  if (!isSameOrigin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
