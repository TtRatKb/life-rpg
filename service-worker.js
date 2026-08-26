const CACHE_NAME = "life-rpg-v0261-shell";
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=0.26.0",
  "./manifest.webmanifest?v=0.25.1",
  "./pwa.js?v=0.26.1",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("life-rpg-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      const cached = await caches.match(request, { ignoreSearch: false });
      if (cached) return cached;
      if (request.mode === "navigate") {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
      throw new Error("Offline and not cached");
    }
  })());
});
