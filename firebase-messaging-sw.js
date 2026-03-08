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

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'BASE', {
    body: body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'base-notif'
  });
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) return cls[0].focus();
      return clients.openWindow('./');
    })
  );
});
