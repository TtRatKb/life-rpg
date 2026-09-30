/* Life RPG V0.31.4dz2 · Coloring storage rescue
   Moves large Coloring Studio PNG payloads out of localStorage into IndexedDB.
   Legacy keys are only compacted AFTER the corresponding painting was safely written.
*/
(() => {
  'use strict';
  if (window.LifeRPGColoringStorage) return;

  const VERSION = '0.31.4dz2';
  const DB_NAME = 'life-rpg-coloring-studio-v2';
  const DB_VERSION = 1;
  const STORE = 'cards';
  const PREFIX = 'lifeRpgColoringStudio:';
  let dbPromise = null;
  let migrationPromise = null;

  function localKey(cardId) { return `${PREFIX}${cardId}`; }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'cardId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
      request.onblocked = () => console.warn('Coloring storage upgrade is blocked by another Life RPG tab.');
    });
    return dbPromise;
  }

  function readLocalRaw(cardId) {
    try { return localStorage.getItem(localKey(cardId)); } catch { return null; }
  }

  function readMetaSync(cardId) {
    try {
      const value = JSON.parse(readLocalRaw(cardId) || 'null');
      if (!value || typeof value !== 'object') return { finished: false, started: false, storage: null, updatedAt: 0 };
      return {
        finished: Boolean(value.finished),
        started: Boolean(value.started || value.painting),
        storage: value.storage || (value.painting ? 'legacy-localstorage' : null),
        updatedAt: Math.max(0, Number(value.updatedAt || 0))
      };
    } catch {
      return { finished: false, started: false, storage: null, updatedAt: 0 };
    }
  }

  function writeSmallMeta(cardId, meta = {}) {
    const compact = {
      finished: Boolean(meta.finished),
      started: Boolean(meta.started),
      storage: meta.started ? 'indexeddb-v2' : null,
      updatedAt: Math.max(0, Number(meta.updatedAt || Date.now()))
    };
    const key = localKey(cardId);
    const payload = JSON.stringify(compact);
    try {
      localStorage.setItem(key, payload);
      return true;
    } catch (error) {
      // Replacing a giant legacy value should normally free space. If Safari still
      // rejects the replacement, the IndexedDB copy is already safe: remove the
      // oversized value, then retry only the tiny metadata record.
      try { localStorage.removeItem(key); } catch { /* no-op */ }
      try {
        localStorage.setItem(key, payload);
        return true;
      } catch (retryError) {
        console.warn('Coloring metadata could not be cached in localStorage', retryError || error);
        return false;
      }
    }
  }

  function dataUrlToBlob(dataUrl) {
    if (dataUrl instanceof Blob) return dataUrl;
    const text = String(dataUrl || '');
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(text);
    if (!match) return new Blob([text], { type: 'text/plain' });
    const mime = match[1] || 'application/octet-stream';
    const isBase64 = Boolean(match[2]);
    const body = match[3] || '';
    if (!isBase64) return new Blob([decodeURIComponent(body)], { type: mime });
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function getRecord(cardId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(cardId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || tx.error);
    });
  }

  async function putRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error || new Error('Coloring storage write failed'));
      tx.onabort = () => reject(tx.error || new Error('Coloring storage transaction aborted'));
    });
  }

  async function migrateOne(cardId) {
    const raw = readLocalRaw(cardId);
    if (!raw) return { migrated: false, freedChars: 0 };
    let legacy;
    try { legacy = JSON.parse(raw); } catch { return { migrated: false, freedChars: 0 }; }
    if (!legacy || typeof legacy !== 'object' || typeof legacy.painting !== 'string' || !legacy.painting.startsWith('data:image/')) {
      return { migrated: false, freedChars: 0 };
    }

    const updatedAt = Math.max(0, Number(legacy.updatedAt || Date.now()));
    const blob = dataUrlToBlob(legacy.painting);
    const record = {
      cardId,
      painting: blob,
      finished: Boolean(legacy.finished),
      updatedAt,
      migratedFrom: 'localStorage-png-data-url'
    };

    // Critical ordering: durable IndexedDB copy first, compact/delete legacy second.
    await putRecord(record);
    const before = raw.length;
    writeSmallMeta(cardId, { finished: record.finished, started: true, updatedAt });
    const after = readLocalRaw(cardId)?.length || 0;
    return { migrated: true, freedChars: Math.max(0, before - after), bytes: blob.size };
  }

  async function migrateLegacy() {
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
      const ids = [];
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key?.startsWith(PREFIX)) ids.push(key.slice(PREFIX.length));
        }
      } catch { /* no-op */ }

      let migrated = 0;
      let freedChars = 0;
      let bytes = 0;
      const failed = [];
      for (const cardId of ids) {
        try {
          const result = await migrateOne(cardId);
          if (result.migrated) {
            migrated += 1;
            freedChars += result.freedChars || 0;
            bytes += result.bytes || 0;
          }
        } catch (error) {
          console.error(`Could not migrate coloring card ${cardId}`, error);
          failed.push(cardId);
        }
      }

      const detail = { migrated, failed, freedChars, bytes, version: VERSION };
      try { window.dispatchEvent(new CustomEvent('life-rpg:coloring-storage-migrated', { detail })); } catch { /* no-op */ }

      const app = window.LifeRPGApp;
      if (migrated && app?.saveState) {
        // The giant localStorage PNGs may have been what blocked the canonical save.
        // Retry it after space was reclaimed; no cloud wipe or state reset occurs.
        try { app.saveState({ source: 'coloring-storage-migration', suppressUiRefresh: true }); } catch { /* no-op */ }
        try { app.showToast?.(`Coloring storage rescued · ${migrated} painting${migrated === 1 ? '' : 's'} preserved outside localStorage.`); } catch { /* no-op */ }
      }
      return detail;
    })();
    return migrationPromise;
  }

  async function getPainting(cardId) {
    await migrateLegacy();
    const record = await getRecord(cardId);
    if (record?.painting) return record.painting;

    // Defensive compatibility for a single unmigrated legacy key.
    const raw = readLocalRaw(cardId);
    try {
      const legacy = JSON.parse(raw || 'null');
      if (legacy?.painting) return legacy.painting;
    } catch { /* no-op */ }
    return null;
  }

  async function savePainting(cardId, painting, meta = {}) {
    await migrateLegacy();
    const previous = await getRecord(cardId).catch(() => null);
    const finished = meta.finished === undefined ? Boolean(previous?.finished || readMetaSync(cardId).finished) : Boolean(meta.finished);
    const updatedAt = Date.now();
    const blob = painting instanceof Blob ? painting : dataUrlToBlob(painting);
    const record = { cardId, painting: blob, finished, updatedAt };
    await putRecord(record);
    writeSmallMeta(cardId, { finished, started: true, updatedAt });
    return record;
  }

  async function setFinished(cardId, finished) {
    await migrateLegacy();
    const previous = await getRecord(cardId).catch(() => null);
    const meta = readMetaSync(cardId);
    const updatedAt = Date.now();
    if (previous) await putRecord({ ...previous, cardId, finished: Boolean(finished), updatedAt });
    writeSmallMeta(cardId, { finished: Boolean(finished), started: Boolean(previous?.painting || meta.started), updatedAt });
    return true;
  }

  async function createPaintingUrl(cardId) {
    const painting = await getPainting(cardId);
    if (!painting) return null;
    if (painting instanceof Blob) return { url: URL.createObjectURL(painting), revoke: true };
    return { url: String(painting), revoke: false };
  }

  async function estimate() {
    const localMeta = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX)) localMeta.push({ key, chars: (localStorage.getItem(key) || '').length });
      }
    } catch { /* no-op */ }
    let browser = null;
    try { browser = await navigator.storage?.estimate?.(); } catch { /* no-op */ }
    return { localMeta, browser };
  }

  window.LifeRPGColoringStorage = {
    version: VERSION,
    migrateLegacy,
    migrateOne,
    readMetaSync,
    getPainting,
    savePainting,
    setFinished,
    createPaintingUrl,
    estimate,
    _test: { dataUrlToBlob, openDb, getRecord, putRecord, writeSmallMeta }
  };

  // Start immediately on the main app page so localStorage is reclaimed even if
  // the user never opens Coloring Studio in this session.
  migrateLegacy().catch(error => console.error('Coloring storage migration failed', error));
})();
