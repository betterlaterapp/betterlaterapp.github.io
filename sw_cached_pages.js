var version = "v3.14.10::pages";

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
    caches
      .match(event.request)
      .then(function(cached) {
        var networked = fetch(event.request)
          .then(fetchedFromNetwork, unableToResolve)
          .catch(unableToResolve);
        
        return cached || networked;

        function fetchedFromNetwork(response) {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          var cacheCopy = response.clone();
          caches.open(version)
            .then(function add(cache) {
              try {
                cache.put(event.request, cacheCopy);
              } catch (error) {
                console.error('Service Worker: Cache write failed:', error);
              }
            })
            .catch(function(error) {
              console.error('Service Worker: Cache open failed:', error);
            });

          return response;
        }

        function unableToResolve() {
          // If we can't connect to the network and there's no cached response,
          // return a simple offline page or fallback
          return new Response('<h1>Service Unavailable</h1><p>Please check your internet connection.</p>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        }
      })
  );
});