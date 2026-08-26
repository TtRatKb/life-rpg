(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity) {
    console.error("Life RPG Stewardship rewards could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 2;
  const DAILY_XP_CAP = 20;
  const DAILY_STORY_CAP = 5;
  const TYPE_META = {
    book: { xp: 2, storyEnergy: 0.40, label: "Library" },
    game: { xp: 3, storyEnergy: 0.20, label: "Games" },
    habit: { xp: 3, storyEnergy: 0.30, label: "Habits" },
    adventure: { xp: 4, storyEnergy: 0.50, label: "Side Adventures" }
  };

  ensureState();

  function ensureState() {
    const state = app.getState();
    if (!state.stewardship || typeof state.stewardship !== "object" || Array.isArray(state.stewardship)) {
      state.stewardship = { schemaVersion: SCHEMA, fingerprints: {}, days: {} };
    }
    const store = state.stewardship;
    store.schemaVersion = SCHEMA;
    if (!store.fingerprints || typeof store.fingerprints !== "object" || Array.isArray(store.fingerprints)) store.fingerprints = {};
    if (!store.days || typeof store.days !== "object" || Array.isArray(store.days)) store.days = {};
    Object.values(store.days).forEach(day => normalizeDay(day));
    trimDays(store);
    return store;
  }

  function normalizeDay(day) {
    if (!day || typeof day !== "object") return;
    day.xp = Math.max(0, Number(day.xp || 0));
    day.rawStoryEnergy = Math.max(0, Number(day.rawStoryEnergy || 0));
    day.storyEnergy = Math.max(0, Number(day.storyEnergy || 0));
    day.items = Math.max(0, Number(day.items || 0));
    day.cappedItems = Math.max(0, Number(day.cappedItems || 0));
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function fingerprint(type, fields = []) {
    const normalizedType = TYPE_META[type] ? type : "item";
    return `${normalizedType}:${fields.map(normalize).filter(Boolean).join("|")}`;
  }

  function rewardCreation({ type, label = "", fields = [], fingerprint: explicitFingerprint = "", id = "" } = {}) {
    const meta = TYPE_META[type];
    if (!meta) return emptyResult("unsupported");

    const store = ensureState();
    const key = explicitFingerprint || fingerprint(type, fields.length ? fields : [label, id]);
    if (!key || key === `${type}:`) return emptyResult("invalid");

    // A semantic fingerprint survives deletion/re-creation, so upkeep rewards cannot
    // be farmed by cycling the same item through the database.
    if (store.fingerprints[key]) {
      return { ...emptyResult("duplicate"), fingerprint: key, duplicate: true, day: todayKey(), ...todayStatus() };
    }

    const date = todayKey();
    const day = ensureDay(store, date);
    const xpRoom = Math.max(0, DAILY_XP_CAP - Number(day.xp || 0));
    const storyRoom = Math.max(0, DAILY_STORY_CAP - Number(day.rawStoryEnergy || 0));
    const requestedXP = Number(meta.xp || 0);
    const requestedStory = Number(meta.storyEnergy || 0);
    const grantedXP = Math.min(requestedXP, xpRoom);
    const grantedRawStory = floor2(Math.min(requestedStory, storyRoom));

    // Mark it seen even when a cap is full. The caps limit today's payout; they are
    // not queues that can be claimed tomorrow by editing or recreating old entries.
    store.fingerprints[key] = {
      type,
      label: String(label || ""),
      firstSeenAt: Date.now(),
      rewardedXP: grantedXP,
      rewardedRawStoryEnergy: grantedRawStory,
      rewardedDate: (grantedXP > 0 || grantedRawStory > 0) ? date : null
    };

    let reward = null;
    if (grantedXP > 0 || grantedRawStory > 0) {
      reward = app.awardActivity({
        source: "stewardship",
        sourceId: key,
        label: `${meta.label}: ${String(label || "New entry")}`,
        xp: grantedXP,
        realmXP: 0,
        statXP: 0,
        coins: 0,
        storyEnergyBase: grantedRawStory,
        progressionRelevant: false,
        metadata: {
          type,
          stewardship: true,
          dailyXpCap: DAILY_XP_CAP,
          dailyStoryCap: DAILY_STORY_CAP
        }
      });
      day.xp = Number(day.xp || 0) + Number(reward?.xp || grantedXP);
      day.rawStoryEnergy = floor2(Number(day.rawStoryEnergy || 0) + grantedRawStory);
      day.storyEnergy = floor2(Number(day.storyEnergy || 0) + Number(reward?.storyEnergy || 0));
      day.items = Number(day.items || 0) + 1;
      day.updatedAt = Date.now();
    } else {
      day.cappedItems = Number(day.cappedItems || 0) + 1;
      day.updatedAt = Date.now();
    }

    const status = todayStatus(date);
    return {
      xp: Number(reward?.xp || 0),
      storyEnergy: Number(reward?.storyEnergy || 0),
      rawStoryEnergy: grantedRawStory,
      requestedXP,
      requestedStoryEnergy: requestedStory,
      fingerprint: key,
      duplicate: false,
      capped: grantedXP < requestedXP || grantedRawStory < requestedStory,
      capReached: status.xpCapReached && status.storyCapReached,
      day: date,
      eventId: reward?.eventId || null,
      ...status
    };
  }

  function rewardMany(items = []) {
    const results = [];
    for (const item of items) results.push(rewardCreation(item));
    const xp = results.reduce((sum, result) => sum + Number(result.xp || 0), 0);
    const storyEnergy = floor2(results.reduce((sum, result) => sum + Number(result.storyEnergy || 0), 0));
    const rawStoryEnergy = floor2(results.reduce((sum, result) => sum + Number(result.rawStoryEnergy || 0), 0));
    const awarded = results.filter(result => Number(result.xp || 0) > 0 || Number(result.storyEnergy || 0) > 0).length;
    return { results, xp, storyEnergy, rawStoryEnergy, awarded, ...todayStatus() };
  }

  function todayStatus(date = todayKey()) {
    const store = ensureState();
    const day = ensureDay(store, date);
    const dailyXpEarned = Number(day.xp || 0);
    const dailyRawStoryEnergy = floor2(Number(day.rawStoryEnergy || 0));
    const dailyStoryEnergy = floor2(Number(day.storyEnergy || 0));
    return {
      dailyXpEarned,
      dailyXpCap: DAILY_XP_CAP,
      xpRemaining: Math.max(0, DAILY_XP_CAP - dailyXpEarned),
      xpCapReached: dailyXpEarned >= DAILY_XP_CAP,
      dailyRawStoryEnergy,
      dailyStoryEnergy,
      dailyStoryCap: DAILY_STORY_CAP,
      storyRemaining: floor2(Math.max(0, DAILY_STORY_CAP - dailyRawStoryEnergy)),
      storyCapReached: dailyRawStoryEnergy >= DAILY_STORY_CAP
    };
  }

  function dailyEarned(date = todayKey()) {
    return todayStatus(date).dailyXpEarned;
  }

  function statusText(result, { prefix = "Life RPG upkeep" } = {}) {
    if (!result) return "";
    const xp = Number(result.xp || 0);
    const energy = Number(result.storyEnergy || 0);
    const pieces = [];
    if (energy > 0) pieces.push(`+${formatEnergy(energy)} 🔥`);
    if (xp > 0) pieces.push(`+${xp} XP`);
    if (pieces.length) {
      const capBits = [];
      if (Number(result.dailyStoryCap || 0) > 0) capBits.push(`${formatEnergy(result.dailyRawStoryEnergy || 0)}/${formatEnergy(result.dailyStoryCap)} 🔥 upkeep today`);
      if (Number(result.dailyXpCap || 0) > 0) capBits.push(`${Number(result.dailyXpEarned || 0)}/${Number(result.dailyXpCap)} XP`);
      return `${prefix}: ${pieces.join(" · ")}${capBits.length ? ` · ${capBits.join(" · ")}` : ""}`;
    }
    if (result.storyCapReached && result.xpCapReached) return `${prefix}: today's upkeep reward caps reached`;
    if (result.storyCapReached) return `${prefix}: today's ${formatEnergy(result.dailyStoryCap)} 🔥 upkeep cap reached`;
    if (result.xpCapReached) return `${prefix}: today's ${Number(result.dailyXpCap)} XP upkeep cap reached`;
    return "";
  }

  function ensureDay(store, date) {
    if (!store.days[date] || typeof store.days[date] !== "object") {
      store.days[date] = { xp: 0, rawStoryEnergy: 0, storyEnergy: 0, items: 0, cappedItems: 0, updatedAt: Date.now() };
    }
    normalizeDay(store.days[date]);
    return store.days[date];
  }

  function trimDays(store) {
    const keys = Object.keys(store.days || {}).sort();
    if (keys.length <= 120) return;
    keys.slice(0, keys.length - 120).forEach(key => delete store.days[key]);
  }

  function todayKey() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function floor2(value) {
    return Math.floor((Number(value || 0) + 1e-9) * 100) / 100;
  }

  function formatEnergy(value) {
    if (typeof app.formatEnergy === "function") return app.formatEnergy(value);
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function emptyResult(reason = "") {
    return {
      xp: 0,
      storyEnergy: 0,
      rawStoryEnergy: 0,
      requestedXP: 0,
      requestedStoryEnergy: 0,
      duplicate: false,
      capped: false,
      capReached: false,
      reason,
      ...todayStatusSafe()
    };
  }

  function todayStatusSafe() {
    try {
      const state = app.getState();
      const day = state?.stewardship?.days?.[todayKey()] || {};
      const dailyXpEarned = Number(day.xp || 0);
      const dailyRawStoryEnergy = floor2(Number(day.rawStoryEnergy || 0));
      return {
        dailyXpEarned,
        dailyXpCap: DAILY_XP_CAP,
        xpRemaining: Math.max(0, DAILY_XP_CAP - dailyXpEarned),
        xpCapReached: dailyXpEarned >= DAILY_XP_CAP,
        dailyRawStoryEnergy,
        dailyStoryEnergy: floor2(Number(day.storyEnergy || 0)),
        dailyStoryCap: DAILY_STORY_CAP,
        storyRemaining: floor2(Math.max(0, DAILY_STORY_CAP - dailyRawStoryEnergy)),
        storyCapReached: dailyRawStoryEnergy >= DAILY_STORY_CAP
      };
    } catch {
      return {
        dailyXpEarned: 0,
        dailyXpCap: DAILY_XP_CAP,
        xpRemaining: DAILY_XP_CAP,
        xpCapReached: false,
        dailyRawStoryEnergy: 0,
        dailyStoryEnergy: 0,
        dailyStoryCap: DAILY_STORY_CAP,
        storyRemaining: DAILY_STORY_CAP,
        storyCapReached: false
      };
    }
  }

  window.LifeRPGStewardship = {
    DAILY_CAP: DAILY_XP_CAP,
    DAILY_XP_CAP,
    DAILY_STORY_CAP,
    rewardCreation,
    rewardMany,
    dailyEarned,
    todayStatus,
    fingerprint,
    statusText
  };
})();
