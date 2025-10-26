// A simple, no-op service worker that serves the purpose of making the app installable.
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // Add a call to skipWaiting here
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});

self.addEventListener('fetch', (event) => {
  // We are not caching anything in this simple service worker.
  // The fetch event is left empty, so the browser will handle requests as usual.
});
