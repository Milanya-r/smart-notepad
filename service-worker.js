// Version: 1.1
// Handles push notifications and app caching.

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const CACHE_NAME = 'smart-notepad-cache-v4';
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
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js'
];

// =================================================================================
// Firebase Configuration
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDy2phSHb80YLILjKLM06FpwpclHgxvJgz8",
  authDomain: "smart-notepad-1de7f.firebaseapp.com",
  projectId: "smart-notepad-1de7f",
  storageBucket: "smart-notepad-1de7f.appspot.com",
  messagingSenderId: "898845270205",
  appId: "1:898845270205:web:ea28355a98aba55e32d7d4",
  measurementId: "G-17HQLRRGNZ"
};

// Инициализация Firebase в Service Worker
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Обработчик для Push-уведомлений, когда приложение НЕ на переднем плане
  messaging.onBackgroundMessage((payload) => {
    console.log('[service-worker.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200],
      data: payload.data // Сохраняем данные для использования при клике
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const allUrlsToCache = [...APP_SHELL_URLS, ...CDN_URLS];
      return Promise.all(
        allUrlsToCache.map(url => {
          return cache.add(url).catch(reason => {
            console.log(`Failed to cache ${url}: ${reason}`);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }).catch(() => {
        // If fetch fails, and we have a cached response, return it.
        return cachedResponse;
      });

      // Return cached response immediately if available, and update cache in background
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const noteId = event.notification.data?.noteId;
  const targetUrl = noteId ? `/#note=${noteId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate.
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open or url is different, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
