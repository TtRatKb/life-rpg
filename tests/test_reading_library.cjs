"use strict";
// Synthetic fixtures only: never load a personal save or contact external services.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");
const root = path.resolve(__dirname, "..");
const librarySource = fs.readFileSync(path.join(root, "library.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const shopSource = fs.readFileSync(path.join(root, "shop.js"), "utf8");
const dailySource = fs.readFileSync(path.join(root, "daily.js"), "utf8");

const items = [
  { id: "legacy", title: "Old Book", status: "reading", role: "fun", source: "kindle", currentPage: 42, totalPages: 100 },
  { id: "wip", title: "Ongoing Fic", kind: "fanfiction", status: "reading", role: "fun", source: "online", publicationStatus: "ongoing", currentChapter: 3, totalChapters: 4, externalUrl: "https://archiveofourown.org/works/123" },
  { id: "complete", title: "Complete Fic", kind: "fanfiction", status: "reading", role: "fun", source: "online", publicationStatus: "complete", currentChapter: 3, totalChapters: 4 },
  { id: "manga", title: "Printed Manga", kind: "manga", status: "reading", role: "fun", source: "physical", publicationStatus: "ongoing", progressUnit: "volumes", currentVolume: 1, totalVolumes: 3 }
];
const state = { bookLibrary: { schemaVersion: 3, items, logs: [] } };
const rewards = [];
let saves = 0;
const app = {
  getState: () => state,
  saveState: () => { saves++; return true; },
  awardActivity: spec => { rewards.push(spec); return { eventId: `event-${rewards.length}`, xp: spec.xp, coins: spec.coins, storyEnergy: 0 }; },
  renderAll() {}
};
const window = {
  LifeRPGApp: app, addEventListener() {}, dispatchEvent() {}, setTimeout() {}, clearTimeout() {},
  pako: { inflateRaw: bytes => zlib.inflateRawSync(Buffer.from(bytes)) }
};
const document = { getElementById() { return null; }, addEventListener() {} };
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
const injected = librarySource.replace(/\n\}\)\(\);\s*$/, `
  window.__readingTest = { logBook, bookProgress, progressUnitFor, safeExternalUrl, bookCardMarkup, epubMetadata,
    captureAo3Bookmarklet, makeAo3BookmarkletUrl, parseAo3ImportHash, ao3WorkId, mapMangaResult, consumeMangagoProgress };
})();`);
assert.notEqual(injected, librarySource, "test-only exports inserted");
class FakeXmlParser {
  parseFromString(xml) {
    return {
      getElementsByTagNameNS(_ns, name) {
        const pattern = new RegExp(`<((?:[\\w-]+:)?${name})(?=[\\s/>])([^>]*?)(?:\\/\\s*>|>([\\s\\S]*?)<\\/\\1\\s*>)`, "gi");
        return [...xml.matchAll(pattern)].map(match => ({
          textContent: (match[3] || "").replace(/<[^>]+>/g, "").trim(),
          getAttribute(key) {
            return match[2].match(new RegExp(`\\b${key}=["']([^"']+)["']`))?.[1] || null;
          }
        }));
      }
    };
  }
}
vm.runInNewContext(injected, { window, document, localStorage: storage, URL, URLSearchParams, TextDecoder, DataView, DOMParser: FakeXmlParser, console, Date, CustomEvent: class { constructor(type, opts) { this.type = type; this.detail = opts.detail; } } }, { filename: "library.js" });
const api = window.__readingTest;

const sampleManga = api.mapMangaResult({ mal_id: 42, title: "Test Manhwa", type:"Manhwa", authors:[{name:"Writer"}], chapters:55, volumes:null, status:"Publishing", images:{jpg:{image_url:"https://cdn.myanimelist.net/images/manga/1/123.jpg"}}, url:"https://myanimelist.net/manga/42" });
assert.equal(sampleManga.kind,"manhwa");
assert.equal(sampleManga.totalChapters,55);
assert.equal(sampleManga.totalVolumes,null);
assert.equal(sampleManga.publicationStatus,"ongoing");
assert.equal(sampleManga.author,"Writer");
assert.equal(state.bookLibrary.schemaVersion, 4);
assert.match(librarySource, /life-rpg:mangago-progress-ack/);
assert.match(librarySource, /source: "mangago-userscript"/);
assert.equal(items[0].kind, "book");
assert.equal(items[0].currentPage, 42);
assert.equal(items[0].id, "legacy");
assert.ok(saves > 0);
api.logBook(items[1], { chapters: 1 });
assert.equal(items[1].currentChapter, 4);
assert.equal(items[1].status, "reading", "caught up WIP is not Finished");
assert.equal(state.bookLibrary.logs.at(-1).chapters, 1);
assert.equal(rewards.length, 1);
api.logBook(items[1], { chapters: 1 });
assert.equal(items[1].currentChapter, 4);
assert.equal(rewards.length, 1, "no reward for no-op");

api.logBook(items[2], { chapters: 1 });
assert.equal(items[2].status, "finished", "only complete works auto-finish");
assert.equal(rewards.length, 3, "reading plus finish reward once");
assert.ok(items[2].finishRewardEventId);
api.logBook(items[2], { chapters: 1 });
assert.equal(rewards.length, 3);
api.logBook(items[3], { volumes: 1 });
assert.equal(items[3].currentVolume, 2);
assert.equal(items[3].currentChapter, 0);
assert.equal(state.bookLibrary.logs.at(-1).volumes, 1);
assert.equal(items[3].status, "reading");
assert.equal(api.safeExternalUrl("javascript:alert(1)"), "");
assert.equal(api.safeExternalUrl("http://example.com"), "");
assert.equal(api.safeExternalUrl("https://archiveofourown.org/works/1"), "https://archiveofourown.org/works/1");
assert.equal(api.ao3WorkId("https://archiveofourown.org/works/123/chapters/456"), "123");
assert.equal(api.ao3WorkId("https://attacker.example/works/123"), "");
assert.equal(api.parseAo3ImportHash("#lr-ao3-import=%7Bbad"), null);
assert.equal(api.parseAo3ImportHash(`#lr-ao3-import=${encodeURIComponent(JSON.stringify({
  version: 1, source: "ao3", title: "Fake", externalUrl: "javascript:alert(1)"
}))}`), null, "an untrusted fragment cannot inject a URL");

// Recreate a public AO3 work page. This is DOM-only: no network, logins or story text.
window.location = { hostname: "archiveofourown.org", origin: "https://archiveofourown.org", pathname: "/works/123/chapters/456" };
document.querySelector = selector => ({
  "h2.title.heading": { textContent: "  A Cozy Fic  " },
  "dd.chapters": { textContent: "4/?" }
})[selector] || null;
document.querySelectorAll = selector => selector.includes("byline") ? [{ textContent: "ExampleWriter" }]
  : selector.includes("fandom") ? [{ textContent: "My Hero Academia" }] : [];
let bookmarkletTarget = "";
window.open = (url, target) => { bookmarkletTarget = url; assert.equal(target, "_blank"); return { opener: window }; };
api.captureAo3Bookmarklet("https://ttratkb.github.io/life-rpg/");
const incoming = api.parseAo3ImportHash(new URL(bookmarkletTarget).hash);
assert.equal(incoming.title, "A Cozy Fic");
assert.equal(incoming.author, "ExampleWriter");
assert.equal(incoming.fandom, "My Hero Academia");
assert.equal(incoming.totalChapters, 4);
assert.equal(incoming.publicationStatus, "ongoing");
assert.equal(incoming.externalUrl, "https://archiveofourown.org/works/123");
document.querySelector = selector => ({
  "h2.title.heading": { textContent: "Finished Fic" },
  "dd.chapters": { textContent: "12/12" }
})[selector] || null;
api.captureAo3Bookmarklet("https://ttratkb.github.io/life-rpg/");
assert.equal(api.parseAo3ImportHash(new URL(bookmarkletTarget).hash).publicationStatus, "complete");
// Regression: provided AO3 adult-view chapter URL shape with nested work stats.
window.location.pathname = "/works/38106442/chapters/95190004";
document.querySelector = selector => ({
  "#workskin .preface h2.title": { textContent: "Chapter-link example" },
  "dl.work.meta.group dd.stats dd.chapters": { textContent: "8/?" }
})[selector] || null;
document.querySelectorAll = selector => selector.includes("byline") ? [{ textContent: "ChapterAuthor" }]
  : selector.includes("fandom") ? [{ textContent: "My Hero Academia" }] : [];
api.captureAo3Bookmarklet("https://ttratkb.github.io/life-rpg/");
const chapterImported = api.parseAo3ImportHash(new URL(bookmarkletTarget).hash);
assert.equal(chapterImported.author, "ChapterAuthor");
assert.equal(chapterImported.fandom, "My Hero Academia");
assert.equal(chapterImported.totalChapters, 8);
assert.equal(chapterImported.externalUrl, "https://archiveofourown.org/works/38106442");
// Incomplete metadata must not silently save a title/URL-only entry.
let missingMessage = "";
window.alert = message => { missingMessage = message; };
window.location.assign = url => { assert.equal(url, "https://archiveofourown.org/works/38106442"); };
document.querySelectorAll = () => [];
bookmarkletTarget = "";
api.captureAo3Bookmarklet("https://ttratkb.github.io/life-rpg/");
assert.match(missingMessage, /incomplete work metadata/);
assert.equal(bookmarkletTarget, "");
assert.match(api.makeAo3BookmarkletUrl(), /^javascript:void\(/);
assert.match(html, /id="libraryAo3Bookmarklet"/);
assert.match(html, /id="libraryAo3Copy"/);
assert.match(api.bookCardMarkup(items[1]), /Caught up/);
assert.match(api.bookCardMarkup(items[1]), /Continue reading/);
assert.doesNotMatch(api.bookCardMarkup(items[1]), /data-book-quick-log=/);
api.logBook(items[0], { pages: 12 });
assert.equal(items[0].currentPage, 54, "legacy page tracking unchanged");
assert.equal(state.bookLibrary.logs.at(-1).pages, 12);
const syncBook = { id: "mangago-sync", title: "Sample Series", kind: "manga", source: "online",
  status: "reading", progressUnit: "chapters", publicationStatus: "ongoing",
  externalUrl: "https://www.mangago.me/read-manga/sample_series/", currentChapter: 1, totalChapters: 6,
  currentVolume: 0, totalVolumes: 0, role: "fun" };
items.push(syncBook);
let syncAcknowledged = 0;
window.dispatchEvent = event => { if (event.type === "life-rpg:mangago-progress-ack") syncAcknowledged++; };
window.history = { replaceState() {} };
const mangagoFragment = chapter => "#lr-mangago-progress=" + encodeURIComponent(JSON.stringify({ slug: "sample_series", chapter }));
window.location = { pathname: "/life-rpg/", search: "", hash: mangagoFragment(2) };
const beforeSyncRewards = rewards.length;
api.consumeMangagoProgress();
assert.equal(syncBook.currentChapter, 2, "next-chapter observation logs one chapter");
assert.equal(syncAcknowledged, 1);
assert.equal(rewards.length, beforeSyncRewards + 1);
window.location.hash = mangagoFragment(2);
api.consumeMangagoProgress();
assert.equal(rewards.length, beforeSyncRewards + 1, "repeat import cannot double-reward");
assert.equal(syncAcknowledged, 2, "repeat import is acknowledged and discarded");
window.location.hash = mangagoFragment(5);
api.consumeMangagoProgress();
assert.equal(syncBook.currentChapter, 2, "jump ahead cannot invent skipped chapter completion");
assert.equal(syncAcknowledged, 2, "noncontiguous data left pending");
window.location.hash = "#lr-mangago-progress=" + encodeURIComponent(JSON.stringify({ slug: "unmatched_series", chapter: 3 }));
api.consumeMangagoProgress();
assert.equal(syncAcknowledged, 2, "unlinked title never acknowledged");


const needsShopSource = shopSource.match(/function bookNeedsShop\(book = \{\}\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(needsShopSource);
const needsShop = vm.runInNewContext(`(${needsShopSource})`);
assert.equal(needsShop({ kind: "fanfiction", status: "want", source: "online" }), false);
assert.equal(needsShop({ kind: "manga", status: "want", source: "online" }), false);
assert.equal(needsShop({ kind: "manga", status: "want", source: "physical" }), true);
assert.equal(needsShop({ status: "want", source: "physical" }), true);
for (const id of ["bookKind", "libraryKindFilters", "bookCurrentChapter", "bookTotalChapters", "bookCurrentVolume", "bookTotalVolumes", "bookExternalUrl", "bookEpubFile", "bookLogChapterDetails", "bookLogVolumeDetails"]) {
  assert.match(html, new RegExp(`id="${id}"`));
}
for (const name of ["library.js", "daily.js", "shop.js"]) {
  const version = name === "library.js" ? "0.31.4-mangago-sync1" : "0.31.4-reading1";
  assert.ok(html.includes(`${name}?v=${version}`));
  assert.ok(worker.includes(`${name}?v=${version}`));
}
assert.ok(html.includes("pwa.js?v=0.31.4-mangago-sync1"));
assert.ok(worker.includes("pwa.js?v=0.31.4-mangago-sync1"));
assert.match(dailySource, /available > 0 && current >= available/);
assert.match(shopSource, /book\.kind === "fanfiction"/);

function testEpub() {
  const parts = [];
  const directory = [];
  let offset = 0;
  const files = {
    "META-INF/container.xml": '<container><rootfile full-path="OEBPS/content.opf"/></container>',
    "OEBPS/content.opf": '<package><metadata><dc:title>Cozy Fic</dc:title><dc:creator>ExampleWriter</dc:creator><dc:identifier>https://archiveofourown.org/works/123</dc:identifier></metadata><manifest><item id="c1" href="chapter1.xhtml"/><item id="c2" href="chapter2.xhtml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'
  };
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name);
    const compressed = zlib.deflateRawSync(Buffer.from(content));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(Buffer.byteLength(content), 22);
    local.writeUInt16LE(nameBytes.length, 26);
    parts.push(local, nameBytes, compressed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(Buffer.byteLength(content), 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    directory.push(entry, nameBytes);
    offset += local.length + nameBytes.length + compressed.length;
  }
  const directorySize = directory.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...parts, ...directory, end]);
  return api.epubMetadata({ size: zip.length, arrayBuffer: async () => zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) });
}

testEpub().then(info => {
  assert.equal(info.title, "Cozy Fic");
  assert.equal(info.author, "ExampleWriter");
  assert.equal(info.chapters, 2);
  assert.equal(info.url, "https://archiveofourown.org/works/123");
  console.log("Reading Library synthetic regression passed: legacy, WIP, complete, volumes, shop, URL, EPUB and PWA.");
}).catch(error => { console.error(error); process.exitCode = 1; });
