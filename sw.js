// ============================================================
// Service Worker — Rutas Europan
// ============================================================

const CACHE_NAME = 'rutas-europan-v4';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ==================== INSTALL ================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ==================== ACTIVATE ===============================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ==================== FETCH ==================================
self.addEventListener('fetch', event => {
  // Solo interceptar GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // API calls (Google Apps Script): network first, fallback to cache
  if (url.includes('script.google.com') || url.includes('script.googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cachear respuesta para uso offline
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Sin conexión: intentar devolver desde cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Google Fonts: cache first
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          });
        })
    );
    return;
  }

  // App shell: cache first, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
