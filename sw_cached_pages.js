var version = "v3.14.16::pages";

// Paths that should NOT be cached (always fetch from network)
var noCachePaths = [
  '/assets/distraction-memes/',
  'distraction-memes/'
];

/**
 * Check if a URL should skip caching
 * @param {string} url - The URL to check
 * @returns {boolean} - True if should skip caching
 */
function shouldSkipCache(url) {
  return noCachePaths.some(function(path) {
    return url.includes(path);
  });
}

self.addEventListener('install', function(event) {
  // Browsers check for a new version of this file on their own. If a version
  // is already running, refuse to install so the app only updates when the
  // user presses the update button (which unregisters the old version first).
  if (self.registration.active) {
    event.waitUntil(Promise.reject(new Error('Update not requested by the user')));
    return;
  }
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
    }).then(function() {
      // Serve the page that installed us right away, so it works offline after one visit
      return self.clients.claim();
    })
  );
});

// The first page loads before this worker exists, so it sends the files it
// already loaded to be cached (same-origin only, skipping ones already cached)
self.addEventListener('message', function(event) {
  if (!event.data || event.data.type !== 'cache-urls' || !Array.isArray(event.data.urls)) {
    return;
  }
  var urls = event.data.urls.filter(function(url) {
    return new URL(url).origin === self.location.origin && !shouldSkipCache(url);
  });
  event.waitUntil(
    caches.open(version).then(function(cache) {
      return Promise.all(urls.map(function(url) {
        return cache.match(url).then(function(hit) {
          return hit || cache.add(url).catch(function() {});
        });
      }));
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

  // Skip caching for distraction memes (always network-first)
  if (shouldSkipCache(event.request.url)) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
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