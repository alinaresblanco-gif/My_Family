const CACHE_NAME = 'my-family-v2';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './imagenes/logo-myfamily-trans-ok.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener('push', event => {
  const notification = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(notification.title || 'My Family', {
    body: notification.body || 'Tienes una nueva notificación.',
    icon: './imagenes/logo-myfamily-trans-ok.png',
    data: { url: notification.url || './' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});