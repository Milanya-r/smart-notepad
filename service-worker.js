const CACHE_NAME = 'smart-notepad-cache-v2';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  'icon.svg',
  'manifest.json',
];
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      const appShellPromise = cache.addAll(APP_SHELL_URLS);
      
      console.log('Caching CDN assets');
      const cdnPromises = CDN_URLS.map(url => 
        cache.add(new Request(url, { mode: 'no-cors' })).catch(e => console.warn(`Failed to cache ${url}:`, e))
      );

      return Promise.all([appShellPromise, ...cdnPromises]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response.
        // If not in cache, fetch from network.
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it.
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
