// Phoebe Dashboard Service Worker — v17 (redesign + nav fixes)
const CACHE_NAME = "phoebe-dashboard-v17";

// Network-first for all requests — always get fresh content
self.addEventListener("install", function(event) {
    self.skipWaiting();
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
    return self.clients.claim();
});

self.addEventListener("fetch", function(event) {
    // Network-first: try network, fall back to cache
    event.respondWith(
        fetch(event.request).then(function(response) {
            // Cache the fresh response
            if (response.ok) {
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

self.addEventListener("message", function(event) {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
