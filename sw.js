importScripts('./firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const CACHE_NAME = 'my-family-v2026.9.13.3';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-config.js',
  './manifest.json',
  './imagenes/logo-myfamily-trans-ok.png'
];

const firebaseSettings = self.MY_FAMILY_FIREBASE;
const firebaseConfigured = firebaseSettings?.config?.projectId && !firebaseSettings.config.projectId.startsWith('REEMPLAZAR_');
if (firebaseConfigured) {
  firebase.initializeApp(firebaseSettings.config);
  firebase.messaging().onBackgroundMessage(payload => {
    const data = payload.data || {};
    self.registration.showNotification(data.title || 'My Family', {
      body: data.body || 'Tienes una nueva notificación.',
      icon: data.icon || './imagenes/logo-myfamily-trans-ok.png',
      data: { url: data.url || './', notificationId: data.notificationId || '' }
    });
  });
}

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
  if (new URL(event.request.url).pathname.endsWith('/version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    const openClient = clientList.find(client => 'focus' in client);
    return openClient ? openClient.focus().then(() => openClient.navigate(targetUrl)) : clients.openWindow(targetUrl);
  }));
});