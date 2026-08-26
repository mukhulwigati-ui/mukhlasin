// public/sw.js

const CACHE_NAME = 'mukhlasin-pwa-cache-v1';

// Daftar aset inti yang langsung dicache saat instalasi
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/images/logo-mukhlasin.png'
];

// 1. INSTALL EVENT: Menyimpan aset inti ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Membuka cache dan menyimpan aset utama mukhlasin.or.id');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE EVENT: Membersihkan cache lama yang sudah kedaluwarsa
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH EVENT: Strategi Stale-While-Revalidate & Pengecualian API / Payment Gateway
self.addEventListener('fetch', (event) => {
  // Hanya tangani method GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Jangan cache request ke Sanity Studio, API backend, Pakasir, atau Midtrans agar selalu *real-time*
  if (
    url.pathname.startsWith('/studio') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('sanity.io') ||
    url.hostname.includes('pakasir.com') ||
    url.hostname.includes('midtrans.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Pastikan response valid sebelum dimasukkan ke cache (mendukung tipe 'basic' dan 'opaque' untuk CDN gambar)
          if (
            networkResponse && 
            networkResponse.status === 200 && 
            (networkResponse.type === 'basic' || networkResponse.type === 'opaque')
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback jika offline total dan halaman navigasi diminta
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});