// ==UserScript==
// @name         Life RPG · Mangago Chapter Progress
// @namespace    https://ttratkb.github.io/life-rpg/
// @version      0.1.0
// @description  Sync completed Mangago chapters to Life RPG after opening the next chapter.
// @match        https://www.mangago.me/read-manga/*
// @match        https://mangago.me/read-manga/*
// @match        https://ttratkb.github.io/life-rpg/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(() => {
  "use strict";
  const STORE = "lifeRpgMangagoProgressV1";
  const LAST = "lifeRpgMangagoVisitedV1";
  const host = location.hostname.toLowerCase();

  function chapterInfo() {
    const parts = location.pathname.match(/^\/read-manga\/([a-z0-9_-]+)\/.*?(?:nml_chapter-|chapter-)(\d+)(?:\/|$|[-_])/i);
    if (!parts) return null;
    const chapter = Number(parts[2]);
    return Number.isSafeInteger(chapter) && chapter > 0 ? { slug: parts[1].toLowerCase(), chapter } : null;
  }
  function queue() {
    const value = GM_getValue(STORE, []);
    return Array.isArray(value) ? value.filter(item => item && typeof item.slug === "string" && Number.isSafeInteger(item.chapter)).slice(-100) : [];
  }
  if (host === "www.mangago.me" || host === "mangago.me") {
    const next = chapterInfo();
    if (!next) return;
    const last = GM_getValue(LAST, null);
    // A visited chapter is only considered read when the reader proceeds to its
    // immediately following chapter. Starting midway never backfills skipped chapters.
    if (last?.slug === next.slug && last.chapter + 1 === next.chapter) {
      const events = queue();
      if (!events.some(item => item.slug === last.slug && item.chapter === last.chapter)) {
        events.push({ slug: last.slug, chapter: last.chapter });
        GM_setValue(STORE, events.slice(-100));
      }
    }
    GM_setValue(LAST, next);
    return;
  }
  if (host !== "ttratkb.github.io") return;
  let inflight = "";
  window.addEventListener("life-rpg:mangago-progress-ack", event => {
    const key = String(event.detail || "");
    GM_setValue(STORE, queue().filter(item => item.slug + ":" + item.chapter !== key));
    inflight = "";
  });
  function deliver() {
    if (location.hash && !location.hash.startsWith("#lr-mangago-progress=")) return;
    const first = queue()[0];
    if (!first) return;
    const key = first.slug + ":" + first.chapter;
    if (inflight === key) return;
    inflight = key;
    location.hash = "lr-mangago-progress=" + encodeURIComponent(JSON.stringify(first));
  }
  window.setInterval(() => {
    if (location.hash.startsWith("#lr-mangago-progress=")) return;
    // An unlinked title or a gap should not show the same warning every 7 seconds.
    // Reopen Life RPG after correcting the item's link or starting chapter.
    deliver();
  }, 7000);
  window.setTimeout(deliver, 2000);
})();
