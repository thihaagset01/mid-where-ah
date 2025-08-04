// Enhanced Service Worker for instant loading
const CACHE_NAME = 'midwhereah-v2';
const CRITICAL_ASSETS = [
  '/',
  '/mobile/home',
  '/mobile/groups', 
  '/mobile/group_chat',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/group_chat.js',
  '/static/js/firebase-config.js'
];

const PRELOAD_ASSETS = [
  '/static/css/chat.css',
  '/static/css/groups.css',
  '/static/js/auth.js',
  '/static/js/ui.js'
];

// Install - cache critical assets immediately
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache critical assets first
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(CRITICAL_ASSETS);
      }),
      // Preload other assets in background
      caches.open(CACHE_NAME + '-preload').then(cache => {
        return cache.addAll(PRELOAD_ASSETS);
      })
    ]).then(() => self.skipWaiting())
  );
});

// Enhanced fetch with instant serving
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-same-origin and API requests
  if (!url.origin === self.location.origin || 
      url.pathname.includes('/api/') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // For HTML pages, serve cached version instantly then update
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Serve cached version immediately
        if (cachedResponse) {
          // Update cache in background
          fetch(event.request).then(networkResponse => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }).catch(() => {
            // Network failed, cached version is fine
          });
          
          return cachedResponse;
        }
        
        // No cache, fetch from network
        return fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        });
      })
    );
  }
  
  // For other assets, cache-first strategy
  else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// Background sync for data preloading
self.addEventListener('sync', event => {
  if (event.tag === 'preload-data') {
    event.waitUntil(preloadCriticalData());
  }
});

async function preloadCriticalData() {
  // Register background preloading
  console.log('Background preloading triggered');
}