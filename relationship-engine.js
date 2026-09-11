(() => {
  "use strict";

  if (window.__lifeRpgRelationshipEngineV314aq) return;
  window.__lifeRpgRelationshipEngineV314aq = true;

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Relationship Engine could not initialize.");
    return;
  }

  const VERSION = "0.31.4ba";
  const SCHEMA = 1;
  const MAX_HISTORY = 500;
  const MAX_PROCESSED = 1200;
  const LEVEL_THRESHOLDS = [0, 5, 12, 22, 35, 51, 70, 92, 117, 145, 176];

  const PEOPLE = {
    mina: {
      id: "mina",
      type: "friendship",
      name: "Mina",
      portrait: "assets/story/sprites/mina_neutral.png"
    },
    kirishima: {
      id: "kirishima",
      type: "romance",
      name: "Kirishima",
      portrait: "assets/story/characters/kirishima-neutral.png"
    },
    bakugo: {
      id: "bakugo",
      type: "romance",
      name: "Bakugo",
      portrait: "assets/story/characters/bakugo-neutral.png"
    }
  };

  const ALIASES = {
    mina: ["mina", "mina ashido", "ashido"],
    kirishima: ["kirishima", "eijiro", "eijiro kirishima"],
    bakugo: ["bakugo", "bakugou", "katsuki", "katsuki bakugo", "katsuki bakugou"]
  };

  let syncing = false;
  let previewWrite = false;
  let previewObserver = null;
  let syncTimer = null;

  init();

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      people: {
        mina: { type: "friendship", points: 0 },
        kirishima: { type: "romance", points: 0 },
        bakugo: { type: "romance", points: 0 }
      },
      processedKeys: [],
      history: [],
      dailyCompanionByDate: {},
      rawSnapshot: {},
      rawHighWater: {},
      migrations: {}
    };
  }

  function init() {
    const changed = ensureState();
    bind();
    syncAll({ initial: true, save: changed });
    installDailyPreviewObserver();
    syncDailyCompanion({ save: true });
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;

    if (!root.relationshipV2 || typeof root.relationshipV2 !== "object" || Array.isArray(root.relationshipV2)) {
      root.relationshipV2 = defaults();
      changed = true;
    }

    const s = root.relationshipV2;
    if (Number(s.schemaVersion || 0) < SCHEMA) {
      s.schemaVersion = SCHEMA;
      changed = true;
    }
    s.version = VERSION;
    s.people ||= {};
    s.processedKeys = Array.isArray(s.processedKeys) ? s.processedKeys : [];
    s.history = Array.isArray(s.history) ? s.history : [];
    s.dailyCompanionByDate ||= {};
    s.rawSnapshot ||= {};
    s.rawHighWater ||= {};
    s.migrations ||= {};

    for (const [id, meta] of Object.entries(PEOPLE)) {
      if (!s.people[id] || typeof s.people[id] !== "object") {
        s.people[id] = { type: meta.type, points: 0 };
        changed = true;
      }
      s.people[id].type = meta.type;
      s.people[id].points = Math.max(0, Number(s.people[id].points || 0));
    }

    if (!s.migrations.seededFromExistingStory) {
      seedFromExistingStory(s);
      s.migrations.seededFromExistingStory = Date.now();
      changed = true;
    }

    trimState(s);
    return changed;
  }

  function state() {
    ensureState();
    return app.getState().relationshipV2;
  }

  function seedFromExistingStory(s) {
    const root = app.getState();
    for (const id of Object.keys(PEOPLE)) {
      const raw = rawRelationshipObject(id);
      let seed = 0;
      for (const [stat, value] of Object.entries(raw)) {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) continue;
        seed += stat === "familiarity" ? n : n * 2;
      }

      const flags = root.flags || {};
      if (id === "mina") {
        if (flags.STORY_MINA_FRIENDSHIP_STARTED) seed = Math.max(seed, 4);
        if (flags.MINA_FRIENDSHIP_ESTABLISHED) seed = Math.max(seed, 12);
        if (flags.MINA_CHOSEN_FRIENDSHIP_CONFIRMED) seed = Math.max(seed, 22);
        if (flags.MINA_CLOSE_FRIEND) seed = Math.max(seed, 35);
      } else if (["bakugo", "kirishima"].includes(id)) {
        const movedIn = Boolean(flags.DYNARIOT_MOVE_IN_COMPLETE || flags.SHARED_APARTMENT_IS_HOME || flags.HOME_SHARED_APARTMENT_ACTIVE);
        if (movedIn) seed = Math.max(seed, 6);
      }

      s.people[id].points = Math.max(Number(s.people[id].points || 0), seed);
    }

    const snapshot = snapshotRawRelationships();
    s.rawSnapshot = snapshot;
    s.rawHighWater = deepClone(snapshot);
  }

  function bind() {
    window.addEventListener("life-rpg:state-saved", () => scheduleSync());
    window.addEventListener("life-rpg:render", () => {
      scheduleSync();
      scheduleDailyPreview();
    });
    window.addEventListener("life-rpg:time-change", scheduleDailyPreview);

    document.addEventListener("click", event => {
      const reply = event.target.closest?.("[data-message-reply-group][data-message-reply-id]");
      if (!reply) return;

      // story-ui's document listener is registered earlier, so this runs after the
      // canonical reply was accepted. Wait one microtask so its save/effects settle.
      queueMicrotask(() => {
        const social = app.getState().story?.social || {};
        const groupId = String(reply.dataset.messageReplyGroup || "");
        const replyId = String(reply.dataset.messageReplyId || "");
        const path = String(reply.dataset.messageReplyPath || "root");
        let personId = normalizePersonId(social.selectedPhonePersonId);
        if (!personId) {
          const scheduled = Object.values(social.messageSchedule || {}).find(entry => entry?.groupId === groupId);
          personId = normalizePersonId(scheduled?.personId);
        }
        if (!personId) return;
        const key = `message:${personId}:${groupId}:${path}:${replyId}`;
        if (wasProcessed(key)) return;
        markProcessed(key);
        addProgress(personId, 1, {
          source: "message",
          detail: `${groupId}:${replyId}`,
          rawRecovery: .25,
          save: true
        });
      });
    });
  }

  function scheduleSync() {
    if (syncing) return;
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => syncAll({ initial: false, save: true }), 35);
  }

  function syncAll({ initial = false, save = true } = {}) {
    if (syncing) return false;
    syncing = true;
    let changed = false;
    try {
      changed = syncAuthoredRelationshipGrowth(initial) || changed;
      changed = syncSocialInteractions() || changed;
      changed = syncDailyCompanion({ save: false }) || changed;
      trimState(state());
      if (changed && save) app.saveState({ source: "relationship-v2-sync" });
    } finally {
      syncing = false;
    }
    scheduleDailyPreview();
    return changed;
  }

  function rawRelationshipObject(personId) {
    const relationships = app.getState().story?.relationships || {};
    const direct = relationships[personId];
    if (direct && typeof direct === "object") return direct;

    for (const [key, value] of Object.entries(relationships)) {
      if (!value || typeof value !== "object") continue;
      if (normalizePersonId(key) === personId) return value;
    }
    return {};
  }

  function snapshotRawRelationships() {
    const snapshot = {};
    for (const id of Object.keys(PEOPLE)) {
      snapshot[id] = {};
      const raw = rawRelationshipObject(id);
      for (const [stat, value] of Object.entries(raw)) {
        const n = Number(value);
        if (Number.isFinite(n)) snapshot[id][stat] = n;
      }
    }
    return snapshot;
  }

  function syncAuthoredRelationshipGrowth(initial = false) {
    const s = state();
    const current = snapshotRawRelationships();

    if (initial && !Object.keys(s.rawSnapshot || {}).length) {
      s.rawSnapshot = current;
      s.rawHighWater = deepClone(current);
      return true;
    }

    let changed = false;
    for (const id of Object.keys(PEOPLE)) {
      s.rawHighWater[id] ||= {};
      const currentStats = current[id] || {};
      const oldHigh = s.rawHighWater[id] || {};

      for (const [stat, value] of Object.entries(currentStats)) {
        if (stat === "familiarity") {
          s.rawHighWater[id][stat] = Math.max(Number(oldHigh[stat] || 0), Number(value || 0));
          continue;
        }

        const previousHigh = Number(oldHigh[stat] || 0);
        const now = Number(value || 0);

        // Hidden Friendship/Romance never goes backwards. A negative authored
        // reaction can still lower the story stat temporarily, but it awards no
        // hidden progress. Future positive moments must first recover the old
        // high-water mark before they earn another authored bonus.
        if (now > previousHigh + 1e-9) {
          const authoredGain = Math.min(8, Math.max(1, Math.round((now - previousHigh) * 2)));
          addProgress(id, authoredGain, {
            source: "authored-relationship",
            detail: stat,
            rawRecovery: 0,
            save: false
          });
          changed = true;
        }
        s.rawHighWater[id][stat] = Math.max(previousHigh, now);
      }
    }

    s.rawSnapshot = current;
    return changed;
  }

  function syncSocialInteractions() {
    const social = app.getState().story?.social || {};
    const latest = social.lastInteractionByPerson || {};
    let changed = false;

    for (const id of Object.keys(PEOPLE)) {
      const interaction = latest[id];
      if (!interaction?.at || !interaction.kind) continue;

      const exactKey = `interaction:${id}:${interaction.kind}:${interaction.id || ""}:${interaction.at}`;
      if (wasProcessed(exactKey)) continue;
      markProcessed(exactKey);

      const date = dateKey(new Date(interaction.at));
      let gain = 0;
      let recovery = 0;

      if (interaction.kind === "talk") {
        const dailyKey = `talk-day:${id}:${date}`;
        if (!wasProcessed(dailyKey)) {
          markProcessed(dailyKey);
          gain = 1;
          recovery = .15;
        }
      } else if (interaction.kind === "hangout") {
        gain = 4;
        recovery = .75;
      } else if (interaction.kind === "event") {
        gain = 2;
        recovery = .35;
      }

      if (gain > 0) {
        addProgress(id, gain, {
          source: interaction.kind,
          detail: interaction.id || "",
          rawRecovery: recovery,
          save: false
        });
        changed = true;
      }
    }

    return changed;
  }

  function addProgress(personId, amount, { source = "social", detail = "", rawRecovery = 0, save = false } = {}) {
    const id = normalizePersonId(personId);
    if (!id || !PEOPLE[id]) return false;

    const s = state();
    const person = s.people[id];
    const gain = Math.max(0, Number(amount || 0));
    if (gain <= 0) return false;

    const before = Number(person.points || 0);
    person.points = before + gain;
    person.updatedAt = Date.now();

    if (rawRecovery > 0) applyRawRecovery(id, rawRecovery);

    s.history.push({
      at: new Date().toISOString(),
      personId: id,
      type: person.type,
      source,
      detail,
      gain
    });

    trimState(s);
    if (save && !syncing) app.saveState({ source: `relationship-v2-${source}` });
    return true;
  }

  function applyRawRecovery(personId, amount) {
    const root = app.getState();
    root.story ||= {};
    root.story.relationships ||= {};
    root.story.relationships[personId] ||= {};
    const rel = root.story.relationships[personId];

    // These slow, repeatable gains make the system Farming-Game-like:
    // an awkward choice may cost time, but ordinary positive contact can always
    // rebuild the common relationship dimensions later.
    const common = ["affinity", "trust", "comfort"];
    for (const stat of common) {
      if (stat === "affinity" || Object.prototype.hasOwnProperty.call(rel, stat)) {
        rel[stat] = Number(rel[stat] || 0) + Number(amount || 0);
      }
    }

    // Do not let our own recovery increment get mistaken for a new authored high.
    const s = state();
    s.rawSnapshot[personId] ||= {};
    s.rawHighWater[personId] ||= {};
    for (const stat of common) {
      if (!Object.prototype.hasOwnProperty.call(rel, stat)) continue;
      const n = Number(rel[stat] || 0);
      s.rawSnapshot[personId][stat] = n;
      s.rawHighWater[personId][stat] = Math.max(Number(s.rawHighWater[personId][stat] || 0), n);
    }
  }

  function registerGift(personId, reaction = "neutral", giftId = "", options = {}) {
    const id = normalizePersonId(personId);
    if (!id) return false;
    const baseGain = ({ loved: 4, liked: 2, neutral: 1, disliked: 0 })[reaction] ?? 1;
    const multiplier = Math.max(1, Math.min(1.5, Number(options?.multiplier || 1)));
    const gain = baseGain * multiplier;
    const key = `gift:${id}:${dateKey(new Date())}:${giftId || reaction}`;
    if (wasProcessed(key)) return false;
    markProcessed(key);
    if (!gain) {
      state().history.push({
        at: new Date().toISOString(),
        personId: id,
        type: PEOPLE[id].type,
        source: "gift",
        detail: options?.detail ? `${reaction}:${options.detail}` : reaction,
        gain: 0
      });
      app.saveState({ source: "relationship-v2-gift-learning" });
      return true;
    }
    return addProgress(id, gain, {
      source: "gift",
      detail: options?.detail ? `${reaction}:${options.detail}` : reaction,
      rawRecovery: (reaction === "loved" ? .75 : reaction === "liked" ? .4 : .15) * multiplier,
      save: true
    });
  }

  function levelInfo(personId) {
    const id = normalizePersonId(personId);
    const points = Math.max(0, Number(state().people?.[id]?.points || 0));
    let level = 0;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
      if (points >= LEVEL_THRESHOLDS[i]) level = i;
      else break;
    }

    if (level >= LEVEL_THRESHOLDS.length - 1) {
      return { level: 10, progress: 1, strength: 10, points };
    }

    const low = LEVEL_THRESHOLDS[level];
    const high = LEVEL_THRESHOLDS[level + 1];
    const progress = high > low ? clamp((points - low) / (high - low), 0, 1) : 0;
    return { level, progress, strength: level + progress, points };
  }

  function dreamProbabilities() {
    const b = levelInfo("bakugo").strength;
    const k = levelInfo("kirishima").strength;
    const difference = Math.abs(b - k);
    const equality = 1 - clamp(difference / 5, 0, 1);
    const maturity = clamp(((b + k) / 2) / 5, 0, 1);

    // Both starts low, grows when both relationships are developed, and peaks
    // when they are close to equal. At e.g. 7 / 7 this is exactly 20 / 40 / 40.
    const both = 5 + 15 * equality * maturity;
    const remaining = 100 - both;

    // Keep each solo route inside the requested 30–50% envelope while allowing
    // the higher-affection character to pull ahead.
    const lower = Math.max(30, remaining - 50);
    const upper = Math.min(50, remaining - 30);
    const midpoint = (lower + upper) / 2;
    const bias = clamp((b - k) / 5, -1, 1);
    const bakugo = clamp(midpoint + bias * ((upper - lower) / 2), lower, upper);
    const kirishima = remaining - bakugo;

    return {
      bakugo,
      kirishima,
      both,
      total: bakugo + kirishima + both
    };
  }

  function pickDreamFocus() {
    const weights = dreamProbabilities();
    let cursor = Math.random() * weights.total;
    for (const id of ["bakugo", "kirishima", "both"]) {
      cursor -= weights[id];
      if (cursor <= 0) return id;
    }
    return "both";
  }

  function eligibleDailyCompanions() {
    const root = app.getState();
    const flags = root.flags || {};
    const ids = ["luca"];

    if (flags.STORY_MINA_FRIENDSHIP_STARTED) ids.push("mina");

    const movedIn = Boolean(
      flags.DYNARIOT_MOVE_IN_COMPLETE ||
      flags.SHARED_APARTMENT_IS_HOME ||
      flags.HOME_SHARED_APARTMENT_ACTIVE
    );
    if (movedIn) ids.push("kirishima", "bakugo");

    return ids;
  }

  function dailyCompanionWeights() {
    const eligible = new Set(eligibleDailyCompanions());
    const weights = { luca: eligible.has("luca") ? .75 : 0 };

    if (eligible.has("mina")) {
      const friendship = levelInfo("mina").strength;
      weights.mina = .95 + friendship * .20;
    }

    // Romantic affection intentionally has more pull than friendship here.
    // At high levels Bakugo/Kirishima therefore become the most common check-ins,
    // while Mina and occasional Luca self-check-ins never disappear.
    for (const id of ["kirishima", "bakugo"]) {
      if (!eligible.has(id)) continue;
      const romance = levelInfo(id).strength;
      weights[id] = 1.10 + romance * .42;
    }

    return weights;
  }

  function ensureDailyCompanion(date = dateKey(new Date()), history = null) {
    const s = state();
    const eligible = eligibleDailyCompanions();
    const existing = s.dailyCompanionByDate?.[date];
    if (existing && eligible.includes(existing)) return existing;

    const weights = dailyCompanionWeights();
    const recent = Array.isArray(history)
      ? history.filter(item => item?.date < date).slice(-3).reverse()
      : (app.getState().dailyPlanner?.companionHistory || []).filter(item => item?.date < date).slice(-3).reverse();

    for (const id of eligible) {
      if (!weights[id]) weights[id] = 1;
      if (id === "luca") continue;
      if (recent[0]?.id === id) weights[id] *= .35;
      else if (recent.slice(0, 2).some(item => item?.id === id)) weights[id] *= .62;
    }

    const seed = seededRandom(`${date}|relationship-checkin|${eligible.join("-")}|${Object.entries(weights).map(([k,v]) => `${k}:${v.toFixed(3)}`).join("|")}`);
    const total = eligible.reduce((sum, id) => sum + Math.max(.01, Number(weights[id] || 0)), 0);
    let cursor = seed * total;
    let chosen = eligible[0];

    for (const id of eligible) {
      cursor -= Math.max(.01, Number(weights[id] || 0));
      if (cursor <= 0) {
        chosen = id;
        break;
      }
    }

    s.dailyCompanionByDate[date] = chosen;
    trimDailyCompanions(s);
    return chosen;
  }

  function syncDailyCompanion({ save = false } = {}) {
    const root = app.getState();
    const planner = root.dailyPlanner;
    if (!planner?.days) return false;
    const today = dateKey(new Date());
    const day = planner.days[today];
    if (day?.checkIn) return false;

    const chosen = ensureDailyCompanion(today, planner.companionHistory || []);
    let changed = false;

    if (!planner.days[today] || typeof planner.days[today] !== "object") {
      planner.days[today] = { date: today, companion: { id: chosen } };
      changed = true;
    } else if (planner.days[today].companion?.id !== chosen) {
      planner.days[today].companion = { id: chosen };
      changed = true;
    }

    if (changed && save && !syncing) app.saveState({ source: "relationship-v2-daily-companion" });
    scheduleDailyPreview();
    return changed;
  }

  function scheduleDailyPreview() {
    window.setTimeout(renderDailyPreviewOverride, 0);
  }

  function installDailyPreviewObserver() {
    const host = document.getElementById("dailyCompanion");
    if (!host || previewObserver) return;

    previewObserver = new MutationObserver(() => {
      if (previewWrite) return;
      const day = app.getState().dailyPlanner?.days?.[dateKey(new Date())];
      if (day?.checkIn) return;
      window.setTimeout(renderDailyPreviewOverride, 0);
    });
    previewObserver.observe(host, { childList: true, subtree: true, characterData: true });
  }

  function renderDailyPreviewOverride() {
    const host = document.getElementById("dailyCompanion");
    const planner = app.getState().dailyPlanner;
    if (!host || !planner?.days) return;

    const today = dateKey(new Date());
    const day = planner.days[today];
    if (day?.checkIn) return;

    const id = day?.companion?.id || ensureDailyCompanion(today, planner.companionHistory || []);
    const meta = companionMeta(id);
    if (!meta) return;

    const currentName = String(host.querySelector(".daily-companion-copy-v14 strong")?.textContent || "").trim();
    const currentId = host.querySelector(".daily-companion-art-v14")?.classList?.contains(id);
    if (currentName === meta.name && currentId) return;

    previewWrite = true;
    host.innerHTML = `
      <div class="daily-companion-art-v14 ${escapeAttr(id)}">${companionImage(meta)}</div>
      <div class="daily-companion-copy-v14">
        <small>${escapeHtml(meta.kicker)}</small>
        <strong>${escapeHtml(meta.name)}</strong>
        <p>${escapeHtml(companionPreviewLine(id))}</p>
      </div>`;
    previewWrite = false;
  }

  function companionMeta(id) {
    if (id === "mina") return { ...PEOPLE.mina, kicker: "A QUICK CHECK-IN" };
    if (id === "kirishima") return { ...PEOPLE.kirishima, kicker: "A QUICK CHECK-IN" };
    if (id === "bakugo") return { ...PEOPLE.bakugo, kicker: "A QUICK CHECK-IN" };
    return {
      id: "luca",
      name: "Luca",
      kicker: "SELF CHECK-IN",
      portrait: "assets/story/portraits/luca_thinking.png"
    };
  }

  function companionPreviewLine(id) {
    const hour = new Date().getHours();
    const moment = hour < 12 ? "morning" : hour < 18 ? "daytime" : "evening";

    if (id === "mina") {
      if (moment === "morning") return "Sometimes Mina checks in before the day properly gets going. Not every morning — just when it feels natural.";
      if (moment === "evening") return "Sometimes Mina catches Luca near the end of the day and wants the real version of how she is doing.";
      return "Some days, Mina wanders in with questions and absolutely no interest in accepting a fake ‘fine’.";
    }
    if (id === "kirishima") {
      if (moment === "evening") return "Sometimes Kirishima checks in at the end of a long day — warm, ordinary, no big dramatic reason required.";
      return "Once everyday life overlaps enough, Kirishima sometimes just asks how Luca is doing because he actually wants to know.";
    }
    if (id === "bakugo") {
      if (moment === "evening") return "Bakugo’s evening version of checking in is mostly noticing Luca is exhausted and refusing to let her bullshit about it.";
      return "Some days, Bakugo’s version of concern is demanding an accurate status report and acting like that is completely normal.";
    }
    if (moment === "evening") return "Most days can end with Luca checking in with herself about what the day actually felt like.";
    return "Most days can simply begin with Luca checking in with herself.";
  }

  function companionImage(meta) {
    if (!meta?.portrait) return `<span>${meta?.id === "mina" ? "✦" : "L"}</span>`;
    const src = window.LifeRPGVisuals?.thumbnail?.(meta.portrait) || meta.portrait;
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(meta.name)}" class="daily-companion-image-v14" loading="lazy" decoding="async" />`;
  }

  function normalizePersonId(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return null;
    for (const [id, aliases] of Object.entries(ALIASES)) {
      if (aliases.some(alias => text === alias || text.includes(alias))) return id;
    }
    return PEOPLE[text] ? text : null;
  }

  function wasProcessed(key) {
    return state().processedKeys.includes(key);
  }

  function markProcessed(key) {
    const s = state();
    if (!key || s.processedKeys.includes(key)) return;
    s.processedKeys.push(key);
    if (s.processedKeys.length > MAX_PROCESSED) s.processedKeys = s.processedKeys.slice(-MAX_PROCESSED);
  }

  function trimState(s) {
    if (s.history.length > MAX_HISTORY) s.history = s.history.slice(-MAX_HISTORY);
    if (s.processedKeys.length > MAX_PROCESSED) s.processedKeys = s.processedKeys.slice(-MAX_PROCESSED);
    trimDailyCompanions(s);
  }

  function trimDailyCompanions(s) {
    const keys = Object.keys(s.dailyCompanionByDate || {}).sort();
    while (keys.length > 60) delete s.dailyCompanionByDate[keys.shift()];
  }

  function dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function seededRandom(seed) {
    let h = 2166136261;
    const text = String(seed || "");
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
    return ((h >>> 0) % 1000000) / 1000000;
  }

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value || {}));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value || 0)));
  }

  function escapeHtml(value) {
    if (app.escapeHtml) return app.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  window.LifeRPGRelationshipEngine = {
    version: VERSION,

    // These methods are for other Life RPG systems. Relationship numbers remain
    // deliberately absent from the player-facing UI.
    getRelationshipType: personId => PEOPLE[normalizePersonId(personId)]?.type || null,
    getHiddenLevel: personId => levelInfo(personId).level,
    getHiddenStrength: personId => levelInfo(personId).strength,
    getDreamProbabilities: dreamProbabilities,
    pickDreamFocus,
    getDailyCompanionWeights: dailyCompanionWeights,
    ensureDailyCompanion,
    registerGift,
    sync: () => syncAll({ initial: false, save: true })
  };
})();