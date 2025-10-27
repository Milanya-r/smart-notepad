// Важно: этот файл должен быть переименован в firebase-messaging-sw.js в корне вашего проекта
// Но для совместимости с текущей системой, пока оставим service-worker.js

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const CACHE_NAME = 'smart-notepad-cache-v3'; // Увеличиваем версию кэша
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
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
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

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn("Firebase config is not set in service-worker. Background notifications will not work.");
}


self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell and CDN assets');
      const allUrlsToCache = [...APP_SHELL_URLS, ...CDN_URLS];
      return cache.addAll(allUrlsToCache.map(url => new Request(url, { mode: 'no-cors' })))
        .catch(e => console.warn('Failed to cache some assets, likely due to no-cors limitations. This is often okay.', e));
    }).then(() => self.skipWaiting())
  );
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
  // Пропускаем запросы, не являющиеся GET
  if (event.request.method !== 'GET') {
      return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Клонируем ответ, так как его можно прочитать только один раз
        const responseToCache = networkResponse.clone();
        // Кэшируем новый ответ для будущих запросов
        if (event.request.url.startsWith('http')) { // Кэшируем только http/https
            cache.put(event.request, responseToCache);
        }
        return networkResponse;
      }).catch(err => {
        // В случае ошибки сети, если есть кэш, возвращаем его.
        // Если нет ни сети, ни кэша, запрос провалится.
        console.warn(`Fetch failed for ${event.request.url}; returning cached response if available.`, err);
        return cachedResponse;
      });

      // Возвращаем из кэша сразу, если есть (стратегия Cache-first),
      // а в фоне обновляем кэш (Stale-while-revalidate).
      return cachedResponse || fetchPromise;
    })
  );
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если окно с приложением уже открыто, фокусируемся на нем
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.pathname === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Если ни одно окно не открыто, открываем новое
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});