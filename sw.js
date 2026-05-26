/* Сеть в приоритете для JS/CSS — меньше залипания кэша в Telegram WebView */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  const isGameAsset =
    /\.(js|css|html|webm|jpg|jpeg|png|webp)(\?|$)/i.test(url.pathname) &&
    url.pathname.includes('/kolobok/');

  if (!isGameAsset) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
  );
});
