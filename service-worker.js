const CACHE_NAME = "expenseflow-v2";

// We use relative paths so it works perfectly inside Tomcat's subfolders
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./libs/chart.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Let database/servlet API calls pass straight through to Tomcat
  if (event.request.method === "POST" || event.request.url.includes("Servlet") || event.request.url.includes("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // BULLETPROOF OFFLINE FIX: 
  // Try to find the file in cache first. If it's not there, grab it from the network.
  // If the network is down (offline) and it's requesting the main page, force-return the cached index.html
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // 200 OK from cache!
      }
      
      return fetch(event.request).catch(() => {
        // Fallback to home page if offline and asset isn't cached
        if (event.request.mode === 'navigate') {
          return caches.match("./index.html");
        }
      });
    })
  );
});