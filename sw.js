/* NVP Operasional — service worker: bisa dibuka offline + notifikasi */
const CACHE = 'nvp-ops-v3';
const FILES = ['./', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // jaringan dulu (agar versi baru cepat terlihat), cadangan dari cache saat offline
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ open: url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
// Disiapkan untuk tahap berikutnya: notifikasi dari server (Web Push) saat aplikasi tertutup
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'NVP Operasional', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'NVP Operasional', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: d.url || './' } }));
});
