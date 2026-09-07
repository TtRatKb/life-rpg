const CACHE_NAME = "life-rpg-v0308-shell";
const CORE = [
  "./",
  "./index.html",
  "./data/quests.js?v=0.30.7",
  "./styles.css?v=0.30.8",
  "./manifest.webmanifest?v=0.30.3a",
  "./pwa.js?v=0.30.8",
  "./app.js?v=0.30.7",
  "./stewardship.js?v=0.30.6",
  "./habits.js?v=0.30.6",
  "./adventures.js?v=0.30.8",
  "./library.js?v=0.30.6",
  "./games.js?v=0.30.6",
  "./time.js?v=0.30.7",
  "./smart-quests.js?v=0.30.7",
  "./daily.js?v=0.30.7",
  "./journal.js?v=0.30.6",
  "./shop.js?v=0.30.6",
  "./achievements.js?v=0.30.6",
  "./cloud-save.js?v=0.30.7",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async asset => {
      try {
        await cache.add(asset);
      } catch (error) {
        console.warn("Life RPG precache skipped an unavailable asset", asset, error);
      }
    }));
    await self.skipWaiting();
  })());
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
