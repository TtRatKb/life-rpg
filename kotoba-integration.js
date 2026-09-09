(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity) return;

  const VERSION = "0.31.4j";
  const SCHEMA = 1;
  const SOURCE = "kotoba-quest";
  const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
  const PAGE_SIZE = 200;
  const MAX_EVENTS_PER_SYNC = 1200;
  const MAX_PROCESSED_IDS = 1600;
  const DAILY_COIN_CAP = 75;
  const AUTO_SYNC_MIN_MS = 2 * 60 * 1000;

  // Firebase web config is intentionally public client configuration. It grants no
  // access by itself; Kotoba's Firestore rules still require the signed-in owner.
  const KOTOBA_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBONS67dSKsL-Bgi46tu2ZDCWLV3YJkqpY",
    authDomain: "kotoba-quest-3b4d6.firebaseapp.com",
    projectId: "kotoba-quest-3b4d6",
    storageBucket: "kotoba-quest-3b4d6.firebasestorage.app",
    messagingSenderId: "24934936038",
    appId: "1:24934936038:web:2d3fd7aae6e54b47e97a27"
  };

  const REWARDS = {
    "vocab-review":   { xp: 2, realmXP: 2, statXP: 2, coins: 1, story: 0.03, label: "Vocabulary review" },
    "grammar-review": { xp: 4, realmXP: 4, statXP: 4, coins: 2, story: 0.06, label: "Grammar review" },
    "particle-review":{ xp: 3, realmXP: 3, statXP: 3, coins: 1, story: 0.05, label: "Particle review" },
    "vocab-lesson":   { xp: 8, realmXP: 8, statXP: 6, coins: 4, story: 0.12, label: "Vocabulary lesson" },
    "grammar-lesson": { xp:10, realmXP:10, statXP: 8, coins: 5, story: 0.15, label: "Grammar lesson" },
    "particle-lesson":{ xp: 8, realmXP: 8, statXP: 6, coins: 4, story: 0.12, label: "Particle lesson" },
    "mining-import":  { xp: 2, realmXP: 2, statXP: 1, coins: 0, story: 0.02, label: "Vocabulary mining" },
    "sentence-mining":{ xp: 3, realmXP: 3, statXP: 2, coins: 1, story: 0.04, label: "Sentence mining" },
    "reading":        { xp: 4, realmXP: 4, statXP: 3, coins: 2, story: 0.06, label: "Japanese reading" }
  };

  let firebasePromise = null;
  let firebase = null;
  let syncInFlight = null;
  let initialized = false;
  const els = {};

  init();

  function init() {
    cacheEls();
    if (!els.panel) return;
    ensureState();
    bind();
    render();
    initialized = true;

    window.addEventListener("life-rpg:render", render);
    window.addEventListener("online", () => maybeAutoSync("online", true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") maybeAutoSync("visible");
    });

    if (state().enabled) window.setTimeout(() => maybeAutoSync("startup", true), 900);
  }

  function cacheEls() {
    Object.assign(els, {
      panel: byId("kotobaIntegrationPanel"),
      status: byId("kotobaConnectionStatus"),
      copy: byId("kotobaConnectionCopy"),
      due: byId("kotobaDueStats"),
      lastSync: byId("kotobaLastSync"),
      imported: byId("kotobaImportedCount"),
      connect: byId("kotobaConnectButton"),
      sync: byId("kotobaSyncButton"),
      disconnect: byId("kotobaDisconnectButton")
    });
  }

  function bind() {
    els.connect?.addEventListener("click", () => connect().catch(handleActionError));
    els.sync?.addEventListener("click", () => syncNow({ manual: true }).catch(handleActionError));
    els.disconnect?.addEventListener("click", () => disconnect());
  }

  function ensureState() {
    const root = app.getState();
    root.integrations ||= {};
    const existing = root.integrations.kotoba;
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      root.integrations.kotoba = defaultState();
      app.saveState({ source: "kotoba-integration-init" });
      return root.integrations.kotoba;
    }
    existing.schemaVersion = SCHEMA;
    existing.processedEventIds = Array.isArray(existing.processedEventIds) ? existing.processedEventIds.slice(-MAX_PROCESSED_IDS) : [];
    existing.dueSnapshot = normalizeSnapshot(existing.dueSnapshot);
    existing.enabled = Boolean(existing.enabled);
    existing.importedCount = Math.max(0, number(existing.importedCount));
    existing.lastError = String(existing.lastError || "");
    return existing;
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA,
      enabled: false,
      connectedAt: null,
      baselineAt: null,
      kotobaUid: "",
      lastSyncAt: null,
      lastEventTimestamp: null,
      lastError: "",
      importedCount: 0,
      processedEventIds: [],
      dueSnapshot: null
    };
  }

  function state() { return ensureStateNoSave(); }
  function ensureStateNoSave() {
    const root = app.getState();
    root.integrations ||= {};
    root.integrations.kotoba ||= defaultState();
    return root.integrations.kotoba;
  }

  async function loadFirebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const [appMod, authMod, fsMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js")
      ]);
      const name = "lifeRpgKotobaBridge";
      const existing = appMod.getApps().find(item => item.name === name);
      const kotobaApp = existing || appMod.initializeApp(KOTOBA_FIREBASE_CONFIG, name);
      const auth = authMod.getAuth(kotobaApp);
      try { await authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (error) { console.warn("Kotoba auth persistence unavailable", error); }
      const db = fsMod.getFirestore(kotobaApp);
      firebase = { appMod, authMod, fsMod, kotobaApp, auth, db };
      return firebase;
    })().catch(error => {
      firebasePromise = null;
      throw error;
    });
    return firebasePromise;
  }

  async function waitForAuth() {
    const fb = await loadFirebase();
    if (typeof fb.auth.authStateReady === "function") {
      try { await fb.auth.authStateReady(); } catch {}
    } else if (!fb.auth.currentUser) {
      await new Promise(resolve => {
        const off = fb.authMod.onAuthStateChanged(fb.auth, () => { off(); resolve(); }, () => { off(); resolve(); });
      });
    }
    return fb.auth.currentUser || null;
  }

  async function connect() {
    setBusy(true, "Connecting…");
    const fb = await loadFirebase();
    let user = await waitForAuth();
    if (!user) {
      const provider = new fb.authMod.GoogleAuthProvider();
      provider.setCustomParameters?.({ prompt: "select_account" });
      const result = await fb.authMod.signInWithPopup(fb.auth, provider);
      user = result.user;
    }

    const s = state();
    const firstConnection = !s.enabled || !s.baselineAt || s.kotobaUid !== user.uid;
    s.enabled = true;
    s.kotobaUid = user.uid;
    s.connectedAt ||= Date.now();
    if (firstConnection) {
      // Deliberately start rewards from connection time: old Kotoba history does
      // not become a retroactive Life RPG reward avalanche.
      s.baselineAt = Date.now();
      s.lastEventTimestamp = s.baselineAt;
      s.processedEventIds = [];
    }
    s.lastError = "";
    app.saveState({ source: "kotoba-connect" });
    await syncNow({ manual: true, initialConnection: firstConnection });
    app.showToast?.("🌸 Kotoba Quest connected · future study can now feed Life RPG.");
    setBusy(false);
    render();
  }

  function disconnect() {
    const s = state();
    s.enabled = false;
    s.lastError = "";
    app.saveState({ source: "kotoba-disconnect" });
    render();
    app.showToast?.("Kotoba sync paused. Kotoba Quest itself stays signed in and unchanged.");
  }

  async function maybeAutoSync(reason, force = false) {
    const s = state();
    if (!s.enabled || !navigator.onLine || syncInFlight) return;
    const elapsed = Date.now() - number(s.lastSyncAt);
    if (!force && elapsed < AUTO_SYNC_MIN_MS) return;
    try { await syncNow({ reason, manual: false }); }
    catch (error) {
      console.warn("Kotoba auto-sync skipped", error);
      recordError(error, false);
    }
  }

  async function syncNow({ manual = false, initialConnection = false } = {}) {
    if (syncInFlight) return syncInFlight;
    syncInFlight = (async () => {
      const s = state();
      if (!s.enabled) return { imported: 0, status: "disabled" };
      if (!navigator.onLine) throw new Error("You are offline. Kotoba sync will retry when the app is online again.");
      if (manual) setBusy(true, "Syncing…");

      const fb = await loadFirebase();
      const user = await waitForAuth();
      if (!user) throw new Error("Reconnect Kotoba Quest to Google before syncing.");
      if (s.kotobaUid && s.kotobaUid !== user.uid) {
        throw new Error("A different Kotoba account is signed in. Disconnect and reconnect the intended account first.");
      }
      s.kotobaUid = user.uid;

      await fetchDueSnapshot(fb, user.uid);
      const imported = initialConnection ? 0 : await importNewEvents(fb, user.uid);
      s.lastSyncAt = Date.now();
      s.lastError = "";
      app.saveState({ source: "kotoba-sync" });
      app.renderAll?.();
      render();
      if (manual) {
        const text = imported ? `Kotoba synced · ${imported} new learning ${imported === 1 ? "event" : "events"} rewarded.` : "Kotoba synced · no new learning events.";
        app.showToast?.(text);
      }
      return { imported, status: "ok" };
    })().catch(error => {
      recordError(error, true);
      throw error;
    }).finally(() => {
      syncInFlight = null;
      setBusy(false);
      render();
    });
    return syncInFlight;
  }

  async function fetchDueSnapshot(fb, uid) {
    const ref = fb.fsMod.doc(fb.db, "users", uid, "bridgeState", "quickTraining");
    const row = await fb.fsMod.getDoc(ref);
    const s = state();
    s.dueSnapshot = row.exists() ? normalizeSnapshot(row.data()) : null;
  }

  async function importNewEvents(fb, uid) {
    const s = state();
    const baseline = Math.max(number(s.baselineAt), number(s.connectedAt));
    const last = Math.max(baseline, number(s.lastEventTimestamp));
    const since = Math.max(baseline, last - LOOKBACK_MS);
    const processed = new Set(s.processedEventIds || []);
    const importedDocs = [];
    let cursor = null;

    while (importedDocs.length < MAX_EVENTS_PER_SYNC) {
      const constraints = [
        fb.fsMod.where("timestamp", ">=", since),
        fb.fsMod.orderBy("timestamp", "asc"),
        fb.fsMod.limit(PAGE_SIZE)
      ];
      if (cursor) constraints.push(fb.fsMod.startAfter(cursor));
      const q = fb.fsMod.query(fb.fsMod.collection(fb.db, "users", uid, "bridgeEvents"), ...constraints);
      const rows = await fb.fsMod.getDocs(q);
      if (rows.empty) break;
      for (const docSnap of rows.docs) importedDocs.push({ id: docSnap.id, ...docSnap.data() });
      cursor = rows.docs[rows.docs.length - 1];
      if (rows.size < PAGE_SIZE) break;
    }

    importedDocs.sort((a, b) => number(a.timestamp) - number(b.timestamp));
    let rewarded = 0;
    let maxTimestamp = last;
    const newProcessed = [];

    for (const event of importedDocs) {
      const eventId = String(event.eventId || event.id || "");
      const at = number(event.timestamp);
      if (!eventId || !at || at < baseline || processed.has(eventId)) continue;
      maxTimestamp = Math.max(maxTimestamp, at);

      // The reward ledger itself is a second idempotency guard. Even if a sync
      // was interrupted after awarding but before the processed-ID list saved,
      // the same Kotoba event can never pay twice.
      if (rewardEvents().some(rewardEvent => rewardEvent?.source === SOURCE && rewardEvent?.sourceId === eventId)) {
        processed.add(eventId);
        newProcessed.push(eventId);
        continue;
      }

      // Future Life-RPG-originated SRS write-back will already reward at source.
      // Mark it seen here so the round trip can never double-pay.
      if (String(event.origin || "kotoba") === "life-rpg") {
        processed.add(eventId);
        newProcessed.push(eventId);
        continue;
      }

      const rewardSpec = rewardForEvent(event, at);
      if (rewardSpec) {
        const reward = app.awardActivity({
          source: SOURCE,
          sourceId: eventId,
          label: eventLabel(event, rewardSpec),
          realm: "Japanese",
          capability: "japanese",
          xp: rewardSpec.xp,
          realmXP: rewardSpec.realmXP,
          statXP: rewardSpec.statXP,
          coins: rewardSpec.coins,
          storyEnergyBase: rewardSpec.story,
          progressionRelevant: true,
          at: new Date(at).toISOString(),
          metadata: {
            kotobaEventId: eventId,
            kotobaType: String(event.type || ""),
            itemId: String(event.itemId || ""),
            skill: String(event.skill || ""),
            result: String(event.result || ""),
            area: String(event.area || ""),
            origin: String(event.origin || "kotoba"),
            sessionId: String(event.sessionId || ""),
            rewardMultiplier: rewardSpec.multiplier,
            kotobaDailyIndex: rewardSpec.dailyIndex,
            kotobaDailyCoinCap: DAILY_COIN_CAP
          }
        });
        if (reward?.eventId) rewarded += 1;
      }
      processed.add(eventId);
      newProcessed.push(eventId);
    }

    if (newProcessed.length) {
      const merged = [...(s.processedEventIds || []), ...newProcessed];
      s.processedEventIds = [...new Set(merged)].slice(-MAX_PROCESSED_IDS);
      s.importedCount = Math.max(0, number(s.importedCount)) + rewarded;
    }
    s.lastEventTimestamp = maxTimestamp;
    return rewarded;
  }

  function rewardForEvent(event, at) {
    const type = String(event.type || "");
    const base = REWARDS[type];
    if (!base) return null;
    const dailyIndex = existingKotobaRewardCount(at);
    const multiplier = dailyMultiplier(dailyIndex);
    const coinsAlready = existingKotobaCoins(at);
    const coinRoom = Math.max(0, DAILY_COIN_CAP - coinsAlready);
    const scaledCoins = Math.max(0, Math.round(base.coins * multiplier));
    return {
      xp: scaled(base.xp, multiplier),
      realmXP: scaled(base.realmXP, multiplier),
      statXP: scaled(base.statXP, multiplier),
      coins: Math.min(coinRoom, scaledCoins),
      story: round2(base.story * multiplier),
      multiplier,
      dailyIndex: dailyIndex + 1,
      label: base.label
    };
  }

  function existingKotobaRewardCount(at) {
    const key = dateKey(at);
    return rewardEvents().filter(event => event?.source === SOURCE && dateKey(event.at) === key && !event.duplicate).length;
  }

  function existingKotobaCoins(at) {
    const key = dateKey(at);
    return rewardEvents().filter(event => event?.source === SOURCE && dateKey(event.at) === key && !event.duplicate)
      .reduce((sum, event) => sum + Math.max(0, number(event.coins)), 0);
  }

  function dailyMultiplier(index) {
    if (index < 20) return 1;
    if (index < 50) return 0.8;
    if (index < 100) return 0.6;
    return 0.4;
  }

  function scaled(value, multiplier) {
    if (!value) return 0;
    return Math.max(1, Math.round(number(value) * multiplier));
  }

  function eventLabel(event, rewardSpec) {
    const detail = String(event.label || "").trim();
    const skill = String(event.skill || "").trim();
    const suffix = detail ? ` · ${detail}` : skill ? ` · ${humanize(skill)}` : "";
    return `Kotoba · ${rewardSpec.label}${suffix}`;
  }

  function rewardEvents() { return app.getState().rewardLedger?.events || []; }

  function normalizeSnapshot(value) {
    if (!value || typeof value !== "object") return null;
    const counts = value.counts && typeof value.counts === "object" ? value.counts : {};
    return {
      schemaVersion: number(value.schemaVersion) || 1,
      generatedAt: number(value.generatedAt) || null,
      nextDueAt: number(value.nextDueAt) || null,
      counts: {
        vocabularyCore: Math.max(0, number(counts.vocabularyCore)),
        vocabularyMining: Math.max(0, number(counts.vocabularyMining)),
        grammar: Math.max(0, number(counts.grammar)),
        particles: Math.max(0, number(counts.particles)),
        total: Math.max(0, number(counts.total))
      }
    };
  }

  function render() {
    if (!initialized && !els.panel) return;
    const s = state();
    const snap = s.dueSnapshot;
    const counts = snap?.counts || { vocabularyCore: 0, vocabularyMining: 0, grammar: 0, particles: 0, total: 0 };

    if (els.status) {
      const status = !s.enabled ? "Not connected" : s.lastError ? "Needs attention" : navigator.onLine ? "Connected" : "Connected · offline";
      els.status.textContent = status;
      els.status.dataset.state = !s.enabled ? "off" : s.lastError ? "error" : "on";
    }
    if (els.copy) {
      els.copy.textContent = !s.enabled
        ? "Connect once with the same Google account you use in Kotoba Quest. Existing history will not be paid retroactively; rewards begin from connection onward."
        : s.lastError
          ? s.lastError
          : "Kotoba remains the learning authority. Life RPG can now run small real vocabulary-review sessions through Kotoba's own grading/SRS engine; grammar and particles remain read-only for now.";
    }
    if (els.due) {
      els.due.innerHTML = [
        statPill("語", "Core vocab", counts.vocabularyCore),
        statPill("✦", "Mining", counts.vocabularyMining),
        statPill("文", "Grammar", counts.grammar),
        statPill("は", "Particles", counts.particles)
      ].join("");
      els.due.classList.toggle("is-empty", !snap);
    }
    if (els.lastSync) {
      const bits = [];
      if (s.lastSyncAt) bits.push(`Last sync ${relativeTime(s.lastSyncAt)}`);
      if (snap?.generatedAt) bits.push(`Kotoba due-state ${relativeTime(snap.generatedAt)}`);
      if (!bits.length) bits.push("No sync yet");
      els.lastSync.textContent = bits.join(" · ");
    }
    if (els.imported) els.imported.textContent = `${Math.max(0, number(s.importedCount))} Kotoba learning events rewarded in Life RPG`;
    els.connect?.classList.toggle("hidden", s.enabled);
    els.sync?.classList.toggle("hidden", !s.enabled);
    els.disconnect?.classList.toggle("hidden", !s.enabled);
  }

  function statPill(icon, label, value) {
    return `<span><i>${icon}</i><strong>${Math.max(0, number(value))}</strong><small>${label}</small></span>`;
  }

  function setBusy(busy, text = "") {
    [els.connect, els.sync, els.disconnect].forEach(button => { if (button) button.disabled = Boolean(busy); });
    if (busy && els.sync && !els.sync.classList.contains("hidden")) els.sync.textContent = text || "Syncing…";
    else if (els.sync) els.sync.textContent = "↻ Sync now";
  }

  function recordError(error, save = true) {
    const s = state();
    s.lastError = friendlyError(error);
    if (save) app.saveState({ source: "kotoba-sync-error" });
    render();
  }

  function handleActionError(error) {
    console.error("Kotoba integration action failed", error);
    recordError(error, true);
    setBusy(false);
    app.showToast?.(friendlyError(error));
  }

  function friendlyError(error) {
    const code = String(error?.code || "");
    if (code.includes("popup-closed")) return "Kotoba connection was cancelled before sign-in finished.";
    if (code.includes("popup-blocked")) return "The browser blocked the Google sign-in popup. Allow popups once and try again.";
    if (code.includes("unauthorized-domain")) return "This Life RPG domain is not authorized in Kotoba's Firebase Authentication yet.";
    if (code.includes("permission-denied")) return "Firestore denied the Kotoba bridge read. Check the bridge rules published in the Kotoba Firebase project.";
    if (code.includes("failed-precondition") && /index/i.test(String(error?.message || ""))) return "Kotoba sync needs a Firestore index. Open the Firebase error link once to create it.";
    return String(error?.message || error || "Kotoba sync failed.").slice(0, 260);
  }

  function relativeTime(value) {
    const at = number(value);
    if (!at) return "—";
    const diff = Math.max(0, Date.now() - at);
    if (diff < 60_000) return "just now";
    if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h ago`;
    return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function dateKey(value) {
    const d = new Date(value || 0);
    if (!Number.isFinite(d.getTime())) return "1970-01-01";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function round2(value) { return Math.round(number(value) * 100) / 100; }
  function number(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function humanize(value) { return String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase()); }
  function byId(id) { return document.getElementById(id); }


  function awardExternalConfirmedReview({ sourceId, type = "vocab-review", label = "", itemId = "", skill = "", at = Date.now(), sessionId = "" } = {}) {
    const id = String(sourceId || "");
    if (!id) throw new Error("Kotoba quick review is missing a stable source ID.");
    const existing = rewardEvents().find(event => event?.source === SOURCE && event?.sourceId === id && !event?.duplicate);
    if (existing) return existing;
    const rewardSpec = rewardForEvent({ type }, at);
    if (!rewardSpec) return null;
    return app.awardActivity({
      source: SOURCE,
      sourceId: id,
      label: label || `Kotoba · ${rewardSpec.label}`,
      realm: "Japanese",
      capability: "japanese",
      xp: rewardSpec.xp,
      realmXP: rewardSpec.realmXP,
      statXP: rewardSpec.statXP,
      coins: rewardSpec.coins,
      storyEnergyBase: rewardSpec.story,
      progressionRelevant: true,
      at: new Date(at).toISOString(),
      metadata: {
        kotobaType: String(type || ""),
        itemId: String(itemId || ""),
        skill: String(skill || ""),
        origin: "life-rpg",
        sessionId: String(sessionId || ""),
        rewardMultiplier: rewardSpec.multiplier,
        kotobaDailyIndex: rewardSpec.dailyIndex,
        kotobaDailyCoinCap: DAILY_COIN_CAP
      }
    });
  }

  window.LifeRPGKotobaIntegration = {
    version: VERSION,
    connect,
    disconnect,
    syncNow: () => syncNow({ manual: true }),
    getStatus: () => ({ ...state(), dueSnapshot: normalizeSnapshot(state().dueSnapshot), syncing: Boolean(syncInFlight) }),
    rewardTable: () => JSON.parse(JSON.stringify(REWARDS)),
    awardExternalConfirmedReview
  };
})();
