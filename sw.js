// Phoebe Dashboard Service Worker — v34
const CACHE_NAME = "phoebe-dashboard-v34";

// Static assets: cache-first (rarely change)
const STATIC_ASSETS = [
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
    "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js",
    "https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js",
    "https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js",
];

// App shell: stale-while-revalidate (serve cached, update in background)
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
];

// All URLs to precache
const URLS_TO_CACHE = APP_SHELL.concat(STATIC_ASSETS).concat([
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
]);

self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

/* Listen for SKIP_WAITING message from the page (update toast) */
self.addEventListener("message", function(event) {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                     .map(function(n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

// Determine caching strategy based on URL
function isStaticAsset(url) {
    return STATIC_ASSETS.some(function(a) { return url.indexOf(a) !== -1; });
}

function isAppShell(url) {
    // Match the dashboard HTML or root
    return url.endsWith("/index.html") || url.endsWith("/phoebe/") || url.endsWith("/phoebe") || APP_SHELL.some(function(a) { return url.endsWith(a.replace("./", "/")); });
}

function isFontRequest(url) {
    return url.indexOf("fonts.googleapis.com") !== -1 || url.indexOf("fonts.gstatic.com") !== -1;
}

self.addEventListener("fetch", function(event) {
    var url = event.request.url;

    // Skip non-GET requests and Firebase RTDB (websocket/long-poll)
    if (event.request.method !== "GET") return;
    if (url.indexOf("firebaseio.com") !== -1) return;
    if (url.indexOf("firebasestorage.app") !== -1) return;
    if (url.indexOf("googleapis.com/identitytoolkit") !== -1) return;
    if (url.indexOf("securetoken.googleapis.com") !== -1) return;

    // Strategy 1: Cache-first for static assets (CDN libs, rarely change)
    if (isStaticAsset(url) || isFontRequest(url)) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                if (cached) return cached;
                return fetch(event.request).then(function(response) {
                    if (response && response.status === 200) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Strategy 2: Network-first for app shell (HTML, manifest)
    // Always fetch fresh when online so dashboard updates show immediately.
    // Falls back to cache when offline.
    if (isAppShell(url)) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Strategy 3: Network-first with cache fallback for everything else
    event.respondWith(
        fetch(event.request).then(function(response) {
            if (response && response.status === 200 && event.request.url.indexOf("chrome-extension") === -1) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(function() {
            return caches.match(event.request);
        })
    );
});
