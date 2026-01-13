const CACHE_NAME = 'webime-v2';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/config.js',
    './js/dict-manager.js',
    './js/history.js',
    './js/ime.js',
    './js/main.js',
    './js/practice.js',
    './js/trie.js',
    './js/utils.js',
    './js/wasm-bridge.js',
    './js/pkg/webime_core_bg.wasm',
    './js/pkg/webime_core.js'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching core assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch Event: Cache First, then Network (and cache dicts dynamically)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension schemes etc.
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // If the request is for a dictionary (json) or a sound resource, cache it dynamically
                // We use a broader check: anything inside 'dicts/' or 'resource/'
                const url = new URL(event.request.url);
                if (url.pathname.includes('/dicts/') || url.pathname.includes('/resource/') || url.pathname.endsWith('.wasm')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return networkResponse;
            });
        })
    );
});
