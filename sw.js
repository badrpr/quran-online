// ── Service Worker — Al-Quran Online ──────────────────────────────────────────
const CACHE_VERSION  = 'v2';
const STATIC_CACHE   = `quran-static-${CACHE_VERSION}`;
const API_CACHE      = `quran-api-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './icon.svg',
    './manifest.json',
    './js/main.js',
    './js/state.js',
    './js/router.js',
    './js/dom.js',
    './js/api.js',
    './js/i18n.js',
    './js/storage.js',
    './js/views/list.js',
    './js/views/reader.js',
    './js/views/bookmarks.js',
    './js/reminder.js',
    './js/views/stats.js'
];

// API endpoints that should be long-lived (surah list + reciters)
const LONG_LIVED_API = [
    'https://api.alquran.cloud/v1/surah',
    'https://api.alquran.cloud/v1/edition?format=audio&language=ar'
];

// ── Install : pre-cache all static assets ─────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ── Activate : clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
    const currentCaches = [STATIC_CACHE, API_CACHE];
    event.waitUntil(
        caches.keys()
            .then(keys => keys.filter(k => !currentCaches.includes(k)))
            .then(stale => Promise.all(stale.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// ── Fetch : routing strategy per resource type ────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Non-GET → always network
    if (request.method !== 'GET') return;

    // Same-origin static assets → Cache-First
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // alquran.cloud API → differentiated strategy
    if (url.hostname === 'api.alquran.cloud') {
        const isLongLived = LONG_LIVED_API.some(u => request.url.startsWith(u));
        if (isLongLived) {
            // Surah list + reciters: Cache-First (rarely changes)
            event.respondWith(cacheFirst(request, API_CACHE));
        } else {
            // Surah content + audio: Network-First (fresh data preferred, cache as fallback)
            event.respondWith(networkFirst(request, API_CACHE));
        }
        return;
    }

    // Audio CDN (cdn.islamic.network etc.) → Cache-First once fetched
    if (url.hostname.includes('islamic.network') || url.hostname.includes('everyayah.com')) {
        event.respondWith(cacheFirst(request, API_CACHE));
        return;
    }

    // Everything else → network only
});

// ── Strategy helpers ──────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline — resource not cached.', { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Offline — resource not cached.', { status: 503 });
    }
}
