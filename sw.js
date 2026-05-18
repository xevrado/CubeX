const CACHE_NAME = 'cubex-v1.3.4.0-p1779115772982';
const ASSETS = [
  './',
  'index.html',
  'style.css?v=1.3.4.0',
  'game.js?v=1.3.4.0',
  'manifest.json',
  'update.json',
  'icon-192.png',
  'icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800;900&display=swap'
];

// Install: Cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => response || new Response('Çevrimdışı', { status: 503, statusText: 'Service Unavailable' }));
        
        return response || fetchPromise;
      });
    })
  );
});
