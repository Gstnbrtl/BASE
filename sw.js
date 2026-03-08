importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC5YOMJ9RiiSgVxQYeegmmkR-wEUs11_F8",
  authDomain: "base-ac891.firebaseapp.com",
  databaseURL: "https://base-ac891-default-rtdb.firebaseio.com",
  projectId: "base-ac891",
  storageBucket: "base-ac891.firebasestorage.app",
  messagingSenderId: "155943536020",
  appId: "1:155943536020:web:8e31878d7a5e80dd5bfb81"
});

const messaging = firebase.messaging();

// Manejar notificaciones push cuando la app está en background/cerrada
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'BASE', {
    body: body || '',
    icon: icon || './icon-192.png',
    badge: './icon-192.png',
    tag: payload.collapseKey || 'base-notif',
    data: payload.data || {}
  });
});

// Click en la notificación abre la app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) return cls[0].focus();
      return clients.openWindow('./');
    })
  );
});

// ── CACHE ──
const CACHE_NAME = 'base-v4.0';
const STATIC_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('fonts.goog')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
