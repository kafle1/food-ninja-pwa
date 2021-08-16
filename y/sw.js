const staticCacheName = "site-static-v6";
const dynamicCacheName = "site-dynamic-v7";
const assets = [
  "/",
  "/index.html",
  "/js/app.js",
  "/js/ui.js",
  "/js/materialize.min.js",
  "/css/styles.css",
  "/css/materialize.min.css",
  "/img/dish.png",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://fonts.gstatic.com/s/materialicons/v97/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2",
  "/pages/fallback.html",
];

//Cache size limit function
const limitCacheSize = (name, size) => {
  caches.open(name).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    });
  });
};

// Install event
self.addEventListener("install", (evt) => {
  //Cache the static pages
  evt.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      cache.addAll(assets);
    })
  );
});

// Activate event
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    //Get the cached keys and see if there is older version of cache
    caches.keys().then((keys) => {
      //Find and separate the old caches and delete them
      return Promise.all(
        keys
          .filter((key) => key !== staticCacheName && key !== dynamicCacheName)
          .map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch event
self.addEventListener("fetch", (evt) => {
  if (evt.request.url.indexOf("firestore.googleapis.com") === -1) {
    evt.respondWith(
      //See if the requested page is already in the cached version or not
      caches
        .match(evt.request)
        .then((cacheRes) => {
          return (
            //If already cached show the cached version
            cacheRes ||
            //If not cached, fetch from the server
            fetch(evt.request).then(async (fetchRes) => {
              //Cache the fetched page for future
              const cache = await caches.open(dynamicCacheName);
              cache.put(evt.request.url, fetchRes.clone());
              limitCacheSize(dynamicCacheName, 20);
              //Display the fetched page
              return fetchRes;
            })
          );
        })
        .catch(() => {
          //To display fallback page to not available html pages (This avoids showing fallback page if image was not cached of that page)
          if (evt.request.url.indexOf(".html") > -1) {
           return caches.match("/pages/fallback.html");
          }
        })
    );
  }
});
