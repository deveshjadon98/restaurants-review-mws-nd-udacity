const staticMemory = 'restaurants-review-static';
const dynamicMemory = 'restaurants-review-static';

const jsFiles = [
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
  'js/main.js',
  'js/restaurant_info.js',
  'js/dbhelper.js'
];

const cssFiles = [
  'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
  'css/styles.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(staticMemory)
    .then((cache) => {
      cache.addAll([
        '/',
        ...cssFiles,
         ...jsFiles
      ]);
    }).catch(() => {
      console.log('Error while storing static assets!');
    })
  );
});

self.addEventListener('activate', (event) => {
  if (self.clients && clients.claim) {
    clients.claim();
  }
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('mws-') && cacheName !== staticMemory;
        })
        .map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
      .then((fetchResponse) => {
        return caches.open(dynamicMemory)
        .then((cache) => {
          cache.put(event.request.url, fetchResponse.clone());
            return fetchResponse;
          });
      });
    })
  );
});