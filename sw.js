const CACHE_NAME = 'cubagem-florestal-v2.9.7';
const CORE = [
  './',
  './index.html',
  './privacidade.html',
  './manifest.webmanifest',
  './css/styles.css',
  './firebase-config.js',
  './vendor/exceljs.min.js',
  './js/app.js',
  './js/auth.js',
  './js/species-campeiro-data.js',
  './js/species-database.js',
  './js/db.js',
  './js/calculator.js',
  './js/excel-export.js',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo-creme.png',
  './icons/logo-verde.png',
  './icons/logo-planilha.png',
  './icons/biokuri-light.png',
  './icons/biokuri-dark.png',
  './img/guia-campo-banner.png',
  './img/guia-campo-banner.jpg',
  './capa.jpg',
  './capa-clara.jpg'
];

// Install: Cache all core shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

// Activate: Delete old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[Service Worker] Removendo cache antigo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Ativação imediata sob comando
self.addEventListener('message', (event) => {
  if (event.data && (event.data.action === 'skipWaiting' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// Fetch: Network-First for Navigation, Cache-First with Dynamic Fallback for Assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // version.json nunca é cacheado para detecção imediata de novas versões
  if (url.origin === location.origin && url.pathname.endsWith('/version.json')) {
    return;
  }

  // Navegação: Network-first com fallback para cache local do index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.ok &&
            (url.pathname.endsWith('/') ||
             url.pathname.endsWith('/index.html') ||
             url.pathname.includes('/cubagem-florestal'))
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('./index.html') || caches.match('./'))
        )
    );
    return;
  }

  // Assets locais, fontes do Google e Firebase SDK
  const fonts = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  const fbsdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');

  if (url.origin === location.origin || fonts || fbsdk) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(req)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[Service Worker] Falha de rede para:', req.url);
            return caches.match(req);
          });
      })
    );
  }
});
