var version = "v2.94::pages";

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [version];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networked = fetch(event.request)
        .then(fetchedFromNetwork, unableToResolve)
        .catch(unableToResolve);
      return cached || networked;

      function fetchedFromNetwork(response) {
        var cacheCopy = response.clone();
        caches.open(version).then(function add(cache) {
          cache.put(event.request, cacheCopy);
        });
        return response;
      }

      function unableToResolve() {
        return new Response("<h1>Service Unavailable</h1>", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({
            "Content-Type": "text/html",
          }),
        });
      }
    })
  );
});
