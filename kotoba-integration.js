(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity) return;

  const VERSION = "0.31.4dz47";
  const SCHEMA = 1;
  const SOURCE = "kotoba-quest";
  const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
  const PAGE_SIZE = 200;
  const MAX_EVENTS_PER_SYNC = 1200;
  const MAX_PROCESSED_IDS = 1600;
  const DAILY_COIN_CAP = 75;
  const AUTO_SYNC_MIN_MS = 2 * 60 * 1000;
  // DZ35: micro-reviews should train slowly, not level up an entire skill in one burst.
  // Per-reward values are frozen in metadata: no retroactive XP changes after an update.
  const JAPANESE_SKILL_DAILY_CAP = 16;
  const JAPANESE_SKILL_PER_TRACK_CAP = 8;
  // Kanji lessons demand active mnemonic construction. Give them their own
  // capped skill-XP budget; otherwise vocab reviews could exhaust it first.
  const KANJI_SKILL_DAILY_CAP = 32;
  const JAPANESE_SKILL_BASE = Object.freeze({
    "vocab-review": .35, "grammar-review": .65, "particle-review": .5,
    "vocab-lesson": 2.5, "grammar-lesson": 3, "particle-lesson": 2.5,
    "mining-import": .25, "sentence-mining": 1, "reading": 1.5,
    "listening-practice": 2.5, "comprehension-practice": 3, "listening-mining": .5, "n4-placement-block": 3.5,
    "speaking-practice": 2.0, "production-practice": 2.5,
    "vocab-placement-batch": 1.5,
    "kanji-placement-item": .6,
    "kanji-placement": 2.2, "kanji-placement-complete": 3,
    "kanji-component-lesson": 1.5, "kanji-lesson": 4,
    "kanji-mnemonic": 2.5, "kanji-review": .65
  });

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
    "reading":        { xp: 4, realmXP: 4, statXP: 3, coins: 2, story: 0.06, label: "Japanese reading" },
    // Listening = user-confirmed exposure, not measured YouTube playback.
    "listening-practice": { xp: 5, realmXP: 5, statXP: 4, coins: 3, story: .09, label: "Listening Lab · Hörzeit bestätigt" },
    "comprehension-practice": { xp: 5, realmXP: 5, statXP: 4, coins: 3, story: .08, label: "Listening Lab · Verständnisfragen" },
    "listening-mining": { xp: 2, realmXP: 2, statXP: 2, coins: 1, story: .02, label: "Listening Lab · Mining" },
    "n4-placement-block": { xp: 6, realmXP: 6, statXP: 5, coins: 4, story: .10, label: "N4 · Einstufungsblock" },
    "speaking-practice": { xp: 5, realmXP: 5, statXP: 4, coins: 3, story: .08, label: "Production Lab · Shadowing" },
    "production-practice": { xp: 6, realmXP: 6, statXP: 5, coins: 4, story: .09, label: "Production Lab · Writing" },
    "vocab-placement-batch": { xp: 5, realmXP: 5, statXP: 4, coins: 3, story: .07, label: "Vokabel-Einstufung · 5 Wörter" },
    "kanji-placement-item": { xp: 2, realmXP: 2, statXP: 2, coins: 1, story: .03, label: "Kanji-Einstufung · 1 Zeichen" },
    "kanji-placement": { xp: 11, realmXP: 11, statXP: 8, coins: 6, story: .13, label: "Kanji-Einstufung · 10 Zeichen" },
    "kanji-placement-complete": { xp: 15, realmXP: 15, statXP: 10, coins: 8, story: .20, label: "Kanji-Einstufung abgeschlossen" },
    "kanji-component-lesson": { xp: 6, realmXP: 6, statXP: 5, coins: 3, story: .09, label: "Kanji-Baustein gelernt" },
    "kanji-lesson": { xp: 15, realmXP: 15, statXP: 12, coins: 8, story: .22, label: "Neues Kanji aktiv erarbeitet" },
    "kanji-mnemonic": { xp: 8, realmXP: 8, statXP: 7, coins: 4, story: .10, label: "Kanji-Mnemonic erstellt" },
    "kanji-review": { xp: 3, realmXP: 3, statXP: 2, coins: 1, story: .04, label: "Kanji/Baustein · SRS-Review" }
  };

  let firebasePromise = null;
  let firebase = null;
  let syncInFlight = null;
  let initialized = false;
  let lastForegroundSyncAttempt = 0;
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
      // On returning from Kotoba Quest, refresh its SRS completions without
      // waiting for the normal 2-minute cadence. Throttle rapid tab switching
      // so this does not cause repetitive full save/cloud writes.
      if (document.visibilityState === "visible" && Date.now() - lastForegroundSyncAttempt > 15000) {
        lastForegroundSyncAttempt = Date.now();
        maybeAutoSync("visible", true);
      }
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
      // Vocab status is owner-only and kept in a separate IndexedDB database,
      // never duplicated in our compressed Life RPG save or reward ledger.
      try { await fetchKotobaLexicon(fb, user.uid); }
      catch (e) { console.warn('Kotoba vocabulary read-only sync delayed', e); }
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

  let lastLexiconSyncedAt = 0;
  let lastLexiconUid = '';
  async function fetchKotobaLexicon(fb, uid) {
    if (uid !== lastLexiconUid) { lastLexiconUid = uid; lastLexiconSyncedAt = 0; }
    window.LifeRPGJapaneseExtraReading?.setConnectedAccount?.(uid);
    const manifestRef = fb.fsMod.doc(fb.db, 'users', uid, 'bridgeState', 'lexicon');
    const snap = await fb.fsMod.getDoc(manifestRef);
    if (!snap.exists()) return false; // Kotoba version prior to DZ41
    const meta = snap.data() || {};
    const at = Number(meta.syncedAt) || 0;
    const count = Number(meta.chunkCount) || 0;
    if (!at || at <= lastLexiconSyncedAt || count < 7 || count > 30) return false;
    const docs = await Promise.all(Array.from({length:count},(_,i)=>fb.fsMod.getDoc(
      fb.fsMod.doc(fb.db, 'users', uid, 'bridgeState', `lexiconChunk-${i}`)
    )));
    if (!meta.revision || docs.some((doc,i)=>!doc.exists() || Number(doc.data()?.index)!==i || doc.data()?.revision!==meta.revision)) return false;
    const words=docs.flatMap(doc=>Array.isArray(doc.data().rows)?doc.data().rows:[]).map(row=>({
      word:String(row?.[0]||''), reading:String(row?.[1]||''),
      sourceType:row?.[2]==='mining'?'mining':'core',
      level:Number(row?.[3])||0, stage:Number(row?.[4])||0,
      meanings:Array.isArray(row?.[5])?row[5].slice(0,3).map(String):[]
    }));
    if(words.length!==Number(meta.wordCount)) return false;
    const bridge=window.LifeRPGJapaneseExtraReading;
    if (typeof bridge?.receiveCloudLexicon !== 'function') return false;
    const result=await bridge.receiveCloudLexicon({at,words,isComplete:true,version:1,uid});
    if(result) {
      lastLexiconSyncedAt=at;
      window.dispatchEvent(new CustomEvent('life-rpg:kotoba-lexicon-updated',{detail:{count:words.length,at}}));
    }
    return Boolean(result);
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
      if (rewardSpec && !previousOneTimeReward(event)) {
        const skillXP = kotobaSkillXP(event, at);
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
            kotobaDailyCoinCap: DAILY_COIN_CAP,
            skillXP,
            skillXPBalanceVersion: String(event.type || "").startsWith("kanji-") ? 2 : 1,
            // Only compact activity statistics; never transcripts or learner vocabulary.
            confirmedMinutes:Math.min(20,Math.max(0,number(event.metadata?.minutes))),
            correct:Math.min(20,Math.max(0,number(event.metadata?.correct))),
            total:Math.min(20,Math.max(0,number(event.metadata?.total)))
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

  // Kotoba emits a stable item id for one-off activities, but cloud event
  // ids can change if a learner resets a pilot path. Do not reward the same
  // mnemonic, first lesson or placement block twice.
  const ONE_TIME_TYPES = new Set([
    "vocab-placement-batch", "kanji-placement-item", "kanji-placement", "kanji-placement-complete",
    "kanji-component-lesson", "kanji-lesson", "kanji-mnemonic"
  ]);
  function previousOneTimeReward(event) {
    const type = String(event?.type || "");
    const itemId = String(event?.itemId || "");
    if (!ONE_TIME_TYPES.has(type) || !itemId) return false;
    return rewardEvents().some(row => row?.source === SOURCE && !row?.duplicate &&
      row?.metadata?.kotobaType === type && String(row?.metadata?.itemId || "") === itemId);
  }

  function japaneseSkillTrack(event) {
    const type = String(event?.type || "").toLowerCase();
    const skill = String(event?.skill || "").toLowerCase();
    if (type.startsWith("kanji-")) return "kanji";
    if (type === "vocab-placement-batch") return "vocabulary";
    if (type === "reading" || type === "sentence-mining") return "reading";
    if (type === "listening-practice" || type === "comprehension-practice") return "listening";
    if (type === "speaking-practice" || type === "production-practice") return "production";
    if (type === "n4-placement-block") return "grammar";
    if (type === "listening-mining") return "vocabulary";
    if (type === "grammar-review" || type === "grammar-lesson" || type === "particle-review" || type === "particle-lesson") {
      return /listen/.test(skill) ? "listening" : /speak|production|output|form/.test(skill) ? "production" : "grammar";
    }
    // Vocabulary SRS tests vocabulary regardless of answer direction or whether
    // the word is spoken aloud. Listening / Production are their own labs.
    if (type === "vocab-review" || type === "vocab-lesson") return "vocabulary";
    return "vocabulary";
  }
  function kotobaSkillXP(event, at) {
    const type = String(event?.type || "").toLowerCase();
    let base = JAPANESE_SKILL_BASE[type] || 0;
    if (type === 'listening-practice') base = Math.min(3, Math.max(.5, Math.max(0, number(event.metadata?.minutes)) * .3));
    if (type === 'comprehension-practice') base = Math.max(.5, 3 * Math.min(1,number(event.metadata?.correct)/Math.max(1,number(event.metadata?.total))));
    if (type === 'n4-placement-block') base = Math.min(4, Math.max(.5,number(event.metadata?.total) * .45));
    if (type === 'speaking-practice') base = Math.min(2.5, Math.max(.5,number(event.metadata?.score) * .025));
    if (type === 'production-practice') base = Math.min(3, Math.max(.5,number(event.metadata?.score) * .03));
    if (!base) return 0;
    const day = dateKey(at), track = japaneseSkillTrack(event);
    let daily = 0, byTrack = 0;
    for (const reward of rewardEvents()) {
      if (!reward || reward.duplicate || reward.source !== SOURCE || dateKey(reward.at) !== day) continue;
      // Old rewards stay at their historical 1.5 skill XP rather than being rewritten.
      const xp = reward.metadata?.skillXPBalanceVersion === 1
        ? Math.max(0, number(reward.metadata.skillXP)) : 1.5;
      const previousTrack = japaneseSkillTrack({type:reward.metadata?.kotobaType, skill:reward.metadata?.skill});
      if (previousTrack === "kanji" && track !== "kanji") continue;
      if (previousTrack !== "kanji" && track === "kanji") continue;
      daily += xp;
      if (previousTrack === track) byTrack += xp;
    }
    if (track === "kanji") return round2(Math.max(0, Math.min(base, KANJI_SKILL_DAILY_CAP - daily)));
    return round2(Math.max(0, Math.min(base, JAPANESE_SKILL_DAILY_CAP - daily, JAPANESE_SKILL_PER_TRACK_CAP - byTrack)));
  }

  function rewardForEvent(event, at) {
    const type = String(event.type || "");
    const base = REWARDS[type];
    if (!base) return null;
    if (type==='listening-practice' && event.metadata?.confirmed !== true) return null;
    if (type==='n4-placement-block' && Number(event.metadata?.total)<1) return null;
    if (type === "vocab-placement-batch" &&
        !(Number(event.metadata?.count) >= 1 && Number(event.metadata?.count) <= 5)) return null;
    if (type === "kanji-placement-item" &&
        !(String(event.metadata?.kind) === "kanji" && Number(event.metadata?.count) === 1 &&
          Number(event.metadata?.total) === 1 && String(event.itemId || "").startsWith("kqk-"))) return null;
    // Retain legacy ten-kanji milestones already emitted under DZ46, but DZ47
    // creates new individual events instead of new milestone events.
    if (type === "kanji-placement" &&
        !(Number(event.metadata?.count) === 10 && Number(event.metadata?.total) === 10)) return null;
    if (type === "kanji-placement-complete" && Number(event.metadata?.total) < 10) return null;
    if (type === "kanji-lesson" && String(event.metadata?.kind) !== "kanji") return null;
    if (type === "kanji-component-lesson" && String(event.metadata?.kind) !== "component") return null;
    if (type === "kanji-mnemonic" && String(event.metadata?.kind) !== "kanji") return null;
    if (type==='production-practice' && String(event.metadata?.mode)!=='writing') return null;
    if (type==='speaking-practice' && String(event.metadata?.mode)!=='shadowing') return null;
    // Listening time is explicitly confirmed in Kotoba (not inferred from YouTube).
    // Scale rewards moderately with that confirmed lesson duration.
    let tuned=base;
    if (type==='listening-practice') {
      const mins=Math.min(20,Math.max(0,number(event.metadata?.minutes)));
      if (mins<1) return null;
      tuned={...base, xp:Math.max(2,Math.round(mins*.8)), realmXP:Math.max(2,Math.round(mins*.8)),
        statXP:Math.max(1,Math.round(mins*.65)), coins:Math.max(1,Math.round(mins*.4)),story:round2(.02+mins*.009)};
    }
    if (type==='comprehension-practice') {
      const questions=Math.max(1,number(event.metadata?.total));
      const success=Math.max(0,Math.min(1,number(event.metadata?.correct)/questions));
      tuned={...base,xp:Math.max(2,Math.round(3+4*success)), realmXP:Math.max(2,Math.round(3+4*success)),
        statXP:Math.max(1,Math.round(2+4*success)),coins:Math.max(1,Math.round(2+3*success))};
    }
    const dailyIndex = existingKotobaRewardCount(at);
    const multiplier = dailyMultiplier(dailyIndex);
    const coinsAlready = existingKotobaCoins(at);
    const coinRoom = Math.max(0, DAILY_COIN_CAP - coinsAlready);
    const scaledCoins = Math.max(0, Math.round(tuned.coins * multiplier));
    return {
      xp: scaled(tuned.xp, multiplier),
      realmXP: scaled(tuned.realmXP, multiplier),
      statXP: scaled(tuned.statXP, multiplier),
      coins: Math.min(coinRoom, scaledCoins),
      story: round2(tuned.story * multiplier),
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
    const skillXP = kotobaSkillXP({ type, skill }, at);
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
        kotobaDailyCoinCap: DAILY_COIN_CAP,
        skillXP,
        skillXPBalanceVersion: 1
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
