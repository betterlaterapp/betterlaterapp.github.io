var version = "v3.14.12::pages";

self.addEventListener('install', function(event) {
  // No need for empty function, but we can use it for precaching if needed
  console.log('Service Worker: Installed');
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activated');
  const cacheWhitelist = [version];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // Cache-first: if we have a cached version, return it immediately
      // Do NOT fetch from network - cache only updates when user clicks refresh button
      if (cached) {
        return cached;
      }

      // No cached version - fetch from network and cache for future use
      return fetch(event.request)
        .then(function(response) {
          // Only cache successful same-origin responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          var cacheCopy = response.clone();
          caches.open(version)
            .then(function(cache) {
              cache.put(event.request, cacheCopy);
            })
            .catch(function(error) {
              console.error('Service Worker: Cache open failed:', error);
            });

          return response;
        })
        .catch(function() {
          // Network failed and no cache - return offline message
          return new Response('<h1>Service Unavailable</h1><p>Please check your internet connection.</p>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        });
    })
  );
});