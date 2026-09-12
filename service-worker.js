const CACHE_NAME = "life-rpg-v0314bp-shell";
const ASSET_CACHE_NAME = "life-rpg-assets-v1";
const MAX_RUNTIME_ASSETS = 96;
const CORE = [
  "./",
  "./index.html",
  "./data/quests.js?v=0.31.4h",
  "./styles.css?v=0.31.4bf",
  "./gifts.css?v=0.31.4ba",
  "./seasons.css?v=0.31.4ba",
  "./skills.css?v=0.31.4ah",
  "./talent-v2.css?v=0.31.4an",
  "./talent-tree-v2-graph.css?v=0.31.4ar",
  "./talent-content-v2.css?v=0.31.4ar",
  "./logic-expansion.css?v=0.31.4ar",
  "./dreamscape.css?v=0.31.4ax",
  "./skills.js?v=0.31.4ap",
  "./talent-v2.js?v=0.31.4at",
  "./talent-tree-v2-graph.js?v=0.31.4at",
  "./talent-reward-studios.css?v=0.31.4as",
  "./talent-reward-studios.js?v=0.31.4at",
  "./talent-content-v2.js?v=0.31.4ar",
  "./dreamscape.js?v=0.31.4ax",
  "./journal-rewards.js?v=0.31.4ag",
  "./weekly-review.css?v=0.31.4ag",
  "./weekly-review.js?v=0.31.4ag",
  "./manifest.webmanifest?v=0.30.3a",
  "./pwa.js?v=0.31.4bp",
  "./visual-performance.js?v=0.31.4bp",
  "./modal-manager.js?v=0.31.4d",
  "./training-focus.js?v=0.31.4o",
  "./app.js?v=0.31.4bp",
  "./daily-streaks.js?v=0.31.4z",
  "./stewardship.js?v=0.31.3a",
  "./habits.js?v=0.31.4au",
  "./adventures.js?v=0.31.4ag",
  "./adventure-workspace.js?v=0.31.4c",
  "./library.js?v=0.31.4ag",
  "./games.js?v=0.31.4bf",
  "./time.js?v=0.31.1",
  "./universal-timers.js?v=0.31.1",
  "./inspirations.js?v=0.31.4c",
  "./data/sudoku-levels.js?v=0.31.4h",
  "./sudoku.js?v=0.31.4z",
  "./data/nonogram-levels.js?v=0.31.4k",
  "./nonogram.js?v=0.31.4z",
  "./logic-expansion.js?v=0.31.4ar",
  "./data/number-sense-levels.js?v=0.31.4l",
  "./number-sense.js?v=0.31.4z",
  "./recovery-studio.js?v=0.31.4an",
  "./memory-garden.js?v=0.31.4z",
  "./data/lexicon-lab-data.js?v=0.31.4q",
  "./data/lexicon-lab-enrichment.js?v=0.31.4y",
  "./data/lexicon-pool.js?v=0.31.4z",
  "./lexicon-lab.js?v=0.31.4am1",
  "./smart-action-router.js?v=0.31.4s",
  "./smart-quests.js?v=0.31.0",
  "./daily.js?v=0.31.4ag",
  "./data/year-journal-questions.js?v=0.31.4ar",
  "./journal.js?v=0.31.4ar",
  "./story-engine.js?v=0.31.4bp",
  "./story-ui.js?v=0.31.4bp",
  "./relationship-memory.js?v=0.31.4bc",
  "./relationship-memory.css?v=0.31.4ba",
  "./relationship-engine.js?v=0.31.4ba",
  "./gifts.js?v=0.31.4ba",
  "./seasons.js?v=0.31.4ba",
  "./content/SP_003.dat?v=0.31.4bp",
  "./shop.js?v=0.30.6",
  "./achievements.js?v=0.31.0",
  "./activity-log.js?v=0.31.4ay",
  "./kotoba-integration.js?v=0.31.4k",
  "./kotoba-quick-training.js?v=0.31.4k",
  "./cloud-save.js?v=0.31.4ag",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("life-rpg-") && key !== CACHE_NAME && key !== ASSET_CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function pruneRuntimeAssets(cache) {
  try {
    const keys = await cache.keys();
    const overflow = Math.max(0, keys.length - MAX_RUNTIME_ASSETS);
    if (!overflow) return;
    await Promise.all(keys.slice(0, overflow).map(request => cache.delete(request)));
  } catch (_) {}
}

async function cacheFirstAsset(request) {
  const assetCache = await caches.open(ASSET_CACHE_NAME);
  const cached = await assetCache.match(request, { ignoreSearch: false });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    assetCache.put(request, response.clone())
      .then(() => pruneRuntimeAssets(assetCache))
      .catch(() => {});
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
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
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.destination === "image" || url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
