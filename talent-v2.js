(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !skills?.registerTalentTree) {
    console.error("Life RPG Talent Trees V2 could not initialize because core progression is unavailable.");
    return;
  }

  const VERSION = "0.31.4at";
  const SCHEMA = 4;
  const RESONANCE_DAILY_CAP = 3;
  const REALM_ORDER = ["Work", "Knowledge", "Japanese", "Health", "Recovery", "Home", "Hobbies"];
  const LEGACY_TREE_KEYS = {
    Work: "workTalentTree",
    Knowledge: "knowledgeTalentTree",
    Japanese: "japaneseTalentTree",
    Health: "healthTalentTree",
    Recovery: "recoveryTalentTree",
    Home: "homeTalentTree",
    Hobbies: "hobbiesTalentTree"
  };

  const CACHE_REWARDS = [
    { coins: 25, story: 0.50 },
    { coins: 40, story: 0.70 },
    { coins: 60, story: 0.90 },
    { coins: 85, story: 1.15 },
    { coins: 120, story: 1.50 }
  ];
  const MOMENTUM_BONUS = [0, 0.25, 0.50, 0.75];
  const RESTED_BONUS = [0, 0.25, 0.50, 0.75];

  const REALMS = {
    Work: {
      icon: "💼",
      title: "Work",
      subtitle: "Make real work pay a little better without rewarding longer workdays.",
      special: {
        id: "deep-work",
        icon: "🎯",
        title: "Deep Work Bonus",
        maxRank: 3,
        effect: rank => `The first completed Work focus block of at least 25 minutes each day gets +${[0,10,15,20][rank]} Coins and +${[0,.25,.35,.50][rank].toFixed(2)} Story Energy.`,
        active: rank => `Deep Work ${rank}/3 · first 25m+ focus: +${[0,10,15,20][rank]} 🪙 +${fmtEnergy([0,.25,.35,.50][rank])} 🔥`
      }
    },
    Knowledge: {
      icon: "🧠",
      title: "Knowledge",
      subtitle: "Reward thinking you already enjoy instead of hiding basic tools behind points.",
      special: {
        id: "puzzle-spark",
        icon: "🧩",
        title: "Puzzle Spark",
        maxRank: 3,
        effect: rank => `The first rewarded logic/knowledge puzzle each day gets +${[0,8,12,18][rank]} Coins and +${[0,.20,.30,.45][rank].toFixed(2)} Story Energy.`,
        active: rank => `Puzzle Spark ${rank}/3 · first logic puzzle: +${[0,8,12,18][rank]} 🪙 +${fmtEnergy([0,.20,.30,.45][rank])} 🔥`
      },
      planned: { icon: "◇", title: "Logic Expansion", copy: "Slitherlink, Nurikabe and Kakuro are now real permanent Content Unlocks in the Knowledge Talent Tree." }
    },
    Japanese: {
      icon: "🌸",
      title: "Japanese",
      subtitle: "Make regular language contact feel rewarding without turning immersion into a quota.",
      special: {
        id: "immersion-echo",
        icon: "🎧",
        title: "Immersion Echo",
        maxRank: 3,
        effect: rank => `The first Japanese book/game immersion log each day gets +${[0,8,12,18][rank]} Coins and +${[0,.20,.30,.45][rank].toFixed(2)} Story Energy.`,
        active: rank => `Immersion Echo ${rank}/3 · first Japanese immersion: +${[0,8,12,18][rank]} 🪙 +${fmtEnergy([0,.20,.30,.45][rank])} 🔥`
      }
    },
    Health: {
      icon: "🌿",
      title: "Health",
      subtitle: "Support care and reflection with bonuses that are visible when they happen.",
      special: {
        id: "reflection-bloom",
        icon: "🌙",
        title: "Reflection Bloom",
        maxRank: 3,
        effect: rank => `The first rewarded Journal reflection or Daily Check-in each day gets +${[0,5,10,15][rank]} Coins and +${[0,.15,.25,.35][rank].toFixed(2)} Story Energy.`,
        active: rank => `Reflection Bloom ${rank}/3 · first reflection/check-in: +${[0,5,10,15][rank]} 🪙 +${fmtEnergy([0,.15,.25,.35][rank])} 🔥`
      },
      content: {
        id: "year-question",
        icon: "📅",
        title: "365 Question Journal",
        cost: 1,
        requiresSpecial: 0,
        copy: "Permanently unlock one different reflection question for every calendar day. The same question returns on the same date each year, so answers can become a long-term time capsule.",
        openLabel: "Open Journal",
        open: () => app.showView?.("journal")
      }
    },
    Recovery: {
      icon: "🛋️",
      title: "Recovery",
      subtitle: "Let recovery create useful momentum without ever making rest mandatory.",
      special: {
        id: "rested-charge",
        icon: "☾",
        title: "Rested Charge",
        maxRank: 3,
        effect: rank => `The first rewarded Recovery Studio completion each day creates one Rested charge. Your next rewarded non-Recovery action gets +${Math.round(RESTED_BONUS[rank] * 100)}% Realm XP.`,
        active: rank => `Rested Charge ${rank}/3 · next charge boosts Realm XP by +${Math.round(RESTED_BONUS[rank] * 100)}%`
      },
      content: {
        id: "grounding-54321",
        icon: "✋",
        title: "5–4–3–2–1 Grounding",
        cost: 1,
        requiresSpecial: 0,
        copy: "Permanently unlock a new guided 7-minute sensory grounding session in Recovery Studio.",
        openLabel: "Open Recovery Studio",
        open: () => window.LifeRPGRecoveryStudio?.open?.()
      }
    },
    Home: {
      icon: "🏠",
      title: "Home",
      subtitle: "Reward small practical wins without turning the house into an endless task board.",
      special: {
        id: "quick-win",
        icon: "✨",
        title: "Quick Win",
        maxRank: 3,
        effect: rank => `The first rewarded Home time block of 15 minutes or less each day gets +${[0,8,12,18][rank]} Coins and +${[0,.15,.25,.35][rank].toFixed(2)} Story Energy.`,
        active: rank => `Quick Win ${rank}/3 · first ≤15m Home block: +${[0,8,12,18][rank]} 🪙 +${fmtEnergy([0,.15,.25,.35][rank])} 🔥`
      }
    },
    Hobbies: {
      icon: "🎨",
      title: "Hobbies",
      subtitle: "Make leisure feel like part of life, not another productivity category.",
      special: {
        id: "joy-spark",
        icon: "♡",
        title: "Joy Spark",
        maxRank: 3,
        effect: rank => `The first rewarded Hobbies activity each day gets +${[0,8,12,18][rank]} Coins and +${[0,.20,.30,.45][rank].toFixed(2)} Story Energy.`,
        active: rank => `Joy Spark ${rank}/3 · first Hobbies activity: +${[0,8,12,18][rank]} 🪙 +${fmtEnergy([0,.20,.30,.45][rank])} 🔥`
      }
    }
  };

  let renderTimer = null;
  let installing = false;

  init();

  function init() {
    const migration = ensureState();
    injectTrees();
    bind();
    renderAllTrees();
    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", scheduleRender);
    if (migration.changed) app.saveState({ source: "talent-v2-init" });
    if (migration.refunded > 0) {
      window.setTimeout(() => app.showToast?.(`✦ Talent Trees V2 · ${migration.refunded} old point${migration.refunded === 1 ? "" : "s"} refunded.`), 450);
    }
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      realms: {},
      permanentClaims: {},
      migrations: {}
    };
  }

  function realmDefaults() {
    return {
      permanent: { cacheRank: 0, content: {} },
      build: { resonance: 0, momentum: 0, special: 0 },
      daily: { dateKey: "", resonanceProcs: 0, momentumUsed: false, specialUsed: false },
      charges: { rested: null }
    };
  }

  function ensureState() {
    if (installing) return { changed: false, refunded: 0 };
    installing = true;
    const root = app.getState();
    let changed = false;
    let refunded = 0;

    if (!root.talentV2 || typeof root.talentV2 !== "object" || Array.isArray(root.talentV2)) {
      root.talentV2 = defaults();
      changed = true;
    }
    const model = root.talentV2;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    model.version = VERSION;
    model.realms ||= {};
    model.permanentClaims ||= {};
    model.migrations ||= {};
    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};

    // One-time V1 -> V2 refund. Old purchases are intentionally cleared so they
    // cannot silently re-assert spent points if an old script is ever reloaded.
    if (!model.migrations.legacyTreeRefundV2) {
      const byRealm = {};
      for (const realm of REALM_ORDER) {
        const previous = Math.max(0, Number(root.skills.spentPointsByRealm?.[realm] || 0));
        if (previous) { refunded += previous; byRealm[realm] = previous; }
        const legacy = root[LEGACY_TREE_KEYS[realm]];
        if (legacy?.purchases && typeof legacy.purchases === "object") legacy.purchases = {};
        root.skills.spentPointsByRealm[realm] = 0;
      }
      model.migrations.legacyTreeRefundV2 = { at: Date.now(), total: refunded, byRealm };
      changed = true;
    }

    for (const realm of REALM_ORDER) {
      const current = model.realms[realm];
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        model.realms[realm] = realmDefaults();
        changed = true;
      }
      const r = model.realms[realm];
      r.permanent ||= { cacheRank: 0, content: {} };
      r.permanent.content ||= {};
      r.build ||= { resonance: 0, momentum: 0, special: 0 };
      r.daily ||= { dateKey: "", resonanceProcs: 0, momentumUsed: false, specialUsed: false };
      r.charges ||= { rested: null };
      r.permanent.cacheRank = clampInt(r.permanent.cacheRank, 0, 5);
      r.build.resonance = clampInt(r.build.resonance, 0, 5);
      r.build.momentum = clampInt(r.build.momentum, 0, 3);
      r.build.special = clampInt(r.build.special, 0, 3);

      // V0.31.4ar replaces the rejected Thought Untangler purchase with the
      // 365 Question Journal without charging the player again.
      if (realm === "Health" && r.permanent.content["thought-untangler"]) {
        if (!r.permanent.content["year-question"]) {
          r.permanent.content["year-question"] = r.permanent.content["thought-untangler"];
        }
        delete r.permanent.content["thought-untangler"];
        model.migrations.thoughtUntanglerToYearQuestion = model.migrations.thoughtUntanglerToYearQuestion || Date.now();
        changed = true;
      }

      normalizeDaily(realm, new Date());
      const expectedSpent = spentForRealm(realm);
      if (Number(root.skills.spentPointsByRealm[realm] || 0) !== expectedSpent) {
        root.skills.spentPointsByRealm[realm] = expectedSpent;
        changed = true;
      }
    }

    installing = false;
    return { changed, refunded };
  }

  function model() { return app.getState().talentV2; }
  function realmState(realm) { return model()?.realms?.[realm] || realmDefaults(); }

  function spentForRealm(realm) {
    const r = realmState(realm);
    const meta = REALMS[realm];
    let spent = Number(r.permanent.cacheRank || 0) + Number(r.build.resonance || 0) + Number(r.build.momentum || 0) + Number(r.build.special || 0);
    if (meta?.content && r.permanent.content?.[meta.content.id]) spent += Number(meta.content.cost || 0);
    return Math.max(0, Math.round(spent));
  }

  function syncSpent(realm) {
    const root = app.getState();
    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    root.skills.spentPointsByRealm[realm] = spentForRealm(realm);
  }

  function localDateKey(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function normalizeDaily(realm, date = new Date()) {
    const r = model()?.realms?.[realm];
    if (!r) return;
    const key = localDateKey(date);
    if (r.daily?.dateKey === key) return;
    r.daily = { dateKey: key, resonanceProcs: 0, momentumUsed: false, specialUsed: false };
  }

  function getRank(realm, id) {
    const r = realmState(realm);
    if (id === "reward-cache") return Number(r.permanent.cacheRank || 0);
    if (id === "resonance") return Number(r.build.resonance || 0);
    if (id === "momentum") return Number(r.build.momentum || 0);
    if (id === REALMS[realm]?.special?.id) return Number(r.build.special || 0);
    if (id === REALMS[realm]?.content?.id) return r.permanent.content?.[id] ? 1 : 0;
    return 0;
  }

  function isContentUnlocked(realm, id) {
    return Boolean(realmState(realm)?.permanent?.content?.[id]);
  }

  function getActiveEffects(realm) {
    const r = realmState(realm);
    normalizeDaily(realm, new Date());
    const meta = REALMS[realm];
    const out = [];
    if (r.permanent.cacheRank) out.push(`Reward Cache ${r.permanent.cacheRank}/5 · permanent claims`);
    if (r.build.resonance) out.push(`Resonance ${r.build.resonance}/5 · ${r.build.resonance * 10}% proc · ${r.daily.resonanceProcs}/${RESONANCE_DAILY_CAP} today`);
    if (r.build.momentum) out.push(`Momentum ${r.build.momentum}/3 · first action +${Math.round(MOMENTUM_BONUS[r.build.momentum] * 100)}% Realm XP${r.daily.momentumUsed ? " · used ✓" : ""}`);
    if (r.build.special) out.push(`${meta.special.active(r.build.special)}${r.daily.specialUsed ? " · used ✓" : ""}`);
    if (realm === "Recovery" && r.charges?.rested) out.push(`☾ Rested charge ready · +${Math.round(Number(r.charges.rested.bonus || 0) * 100)}% Realm XP on next non-Recovery action`);
    if (meta.content && isContentUnlocked(realm, meta.content.id)) out.push(`${meta.content.icon} ${meta.content.title} · permanently unlocked`);
    return out;
  }

  function purchase(realm, id) {
    ensureState();
    if (!REALMS[realm]) return false;
    const r = realmState(realm);
    const meta = REALMS[realm];
    const points = skills.getRealmPoints(realm);
    let cost = 1;
    let title = id;
    let permanent = false;

    if (id === "reward-cache") {
      if (r.permanent.cacheRank >= 5) return false;
      title = "Reward Cache";
      permanent = true;
    } else if (id === "resonance") {
      if (r.build.resonance >= 5) return false;
      title = "Resonance";
    } else if (id === "momentum") {
      if (r.build.momentum >= 3) return false;
      if (r.build.resonance < 1) return prerequisiteToast("Buy Resonance I first.");
      title = "Momentum";
    } else if (id === meta.special.id) {
      if (r.build.special >= meta.special.maxRank) return false;
      if (r.build.momentum < 1) return prerequisiteToast("Buy Momentum I first.");
      title = meta.special.title;
    } else if (meta.content?.id === id) {
      if (isContentUnlocked(realm, id)) return false;
      if (r.build.special < Number(meta.content.requiresSpecial || 0)) return prerequisiteToast(`Buy ${meta.special.title} I first.`);
      cost = Number(meta.content.cost || 1);
      title = meta.content.title;
      permanent = true;
    } else return false;

    if (points.available < cost) {
      app.showToast?.(`You need ${cost} ${realm} point${cost === 1 ? "" : "s"} for ${title}.`);
      return false;
    }

    if (id === "reward-cache") {
      r.permanent.cacheRank += 1;
      const rank = r.permanent.cacheRank;
      claimCacheReward(realm, rank);
    } else if (id === "resonance") r.build.resonance += 1;
    else if (id === "momentum") r.build.momentum += 1;
    else if (id === meta.special.id) r.build.special += 1;
    else if (meta.content?.id === id) r.permanent.content[id] = Date.now();

    syncSpent(realm);
    app.saveState({ source: `talent-v2-buy-${realm.toLowerCase()}` });
    emitChange(realm);
    renderAllTrees();

    if (id !== "reward-cache") {
      const rank = getRank(realm, id);
      app.showToast?.(`${permanent ? "🔓" : "✦"} ${title}${rank > 1 ? ` ${rank}/${id === "resonance" ? 5 : id === "momentum" || id === meta.special.id ? 3 : 1}` : ""} unlocked.`);
    }
    return true;
  }

  function prerequisiteToast(copy) {
    app.showToast?.(copy);
    return false;
  }

  function claimCacheReward(realm, rank) {
    const key = `${realm}:reward-cache:${rank}`;
    if (model().permanentClaims[key]) return null;
    const reward = CACHE_REWARDS[rank - 1] || CACHE_REWARDS[0];
    const event = grantDirectBonus({
      realm,
      source: "talent-v2-cache",
      sourceId: key,
      label: `${realm} Reward Cache ${roman(rank)}`,
      coins: reward.coins,
      story: reward.story,
      metadata: { talentV2: true, kind: "reward-cache", rank }
    });
    model().permanentClaims[key] = Date.now();
    window.setTimeout(() => app.showToast?.(`🎁 ${realm} Reward Cache ${roman(rank)} · +${reward.coins} 🪙 · +${fmtEnergy(reward.story)} 🔥`), 40);
    return event;
  }

  function resetBuild(realm) {
    ensureState();
    const r = realmState(realm);
    const refundable = Number(r.build.resonance || 0) + Number(r.build.momentum || 0) + Number(r.build.special || 0);
    if (!refundable) {
      app.showToast?.(`${realm} has no passive points to reset.`);
      return false;
    }
    if (!window.confirm(`Reset the ${realm} passive build? ${refundable} point${refundable === 1 ? "" : "s"} will become available again. Permanent Reward Cache claims and content unlocks stay owned.`)) return false;
    r.build = { resonance: 0, momentum: 0, special: 0 };
    syncSpent(realm);
    app.saveState({ source: `talent-v2-respec-${realm.toLowerCase()}` });
    emitChange(realm);
    renderAllTrees();
    app.showToast?.(`${realm} passive build reset · ${refundable} point${refundable === 1 ? "" : "s"} refunded.`);
    return true;
  }

  // Called by app.js before the base reward is calculated. Only Realm XP is
  // modified here; Character XP and Skill XP remain untouched.
  function modifyRewardSpec(input = {}) {
    ensureState();
    const spec = { ...input, metadata: { ...(input.metadata || {}) } };
    const realm = REALMS[spec.realm] ? spec.realm : null;
    const source = String(spec.source || "");
    if (!realm || source.startsWith("talent-v2-")) return spec;

    normalizeDaily(realm, spec.at ? new Date(spec.at) : new Date());
    const r = realmState(realm);
    const baseRealmXP = Math.max(0, Number(spec.realmXP ?? spec.xp ?? 0));
    let bonusRealmXP = 0;

    if (r.build.momentum > 0 && !r.daily.momentumUsed && baseRealmXP > 0) {
      const rate = MOMENTUM_BONUS[r.build.momentum] || 0;
      const added = Math.max(1, Math.round(baseRealmXP * rate));
      bonusRealmXP += added;
      spec.metadata.talentV2MomentumPending = { realm, rank: r.build.momentum, addedRealmXP: added, baseRealmXP };
    }

    // A Rested charge is generated by Recovery and consumed by the next actual
    // rewarded action in another Realm.
    const recovery = realmState("Recovery");
    const rested = recovery.charges?.rested;
    if (realm !== "Recovery" && rested && baseRealmXP > 0) {
      const added = Math.max(1, Math.round(baseRealmXP * Number(rested.bonus || 0)));
      bonusRealmXP += added;
      spec.metadata.talentV2RestedPending = { addedRealmXP: added, bonus: Number(rested.bonus || 0), createdAt: rested.createdAt || 0 };
    }

    if (bonusRealmXP > 0) spec.realmXP = Math.max(0, Math.round(baseRealmXP + bonusRealmXP));
    return spec;
  }

  // Called by app.js after the base reward event exists. This is where daily
  // claims are consumed and visible Coin / Story Energy bonus events are added.
  function afterActivityReward(spec = {}, reward = {}) {
    ensureState();
    const realm = REALMS[spec.realm] ? spec.realm : null;
    const source = String(spec.source || "");
    if (!realm || source.startsWith("talent-v2-") || reward?.deduped) return { messages: [] };
    const earned = Number(reward.xp || 0) + Number(reward.realmXP || 0) + Number(reward.coins || 0) + Number(reward.storyEnergy || 0);
    if (earned <= 0) return { messages: [] };

    const date = spec.at ? new Date(spec.at) : new Date();
    normalizeDaily(realm, date);
    const r = realmState(realm);
    const messages = [];

    if (spec.metadata?.talentV2MomentumPending && !r.daily.momentumUsed) {
      r.daily.momentumUsed = true;
      messages.push(`⚡ ${realm} Momentum · +${spec.metadata.talentV2MomentumPending.addedRealmXP} Realm XP`);
    }

    if (spec.metadata?.talentV2RestedPending) {
      const recovery = realmState("Recovery");
      if (recovery.charges?.rested) {
        recovery.charges.rested = null;
        messages.push(`☾ Rested used · +${spec.metadata.talentV2RestedPending.addedRealmXP} ${realm} XP`);
      }
    }

    const special = maybeApplySpecial(realm, spec, date);
    if (special?.message) messages.push(special.message);

    if (r.build.resonance > 0 && r.daily.resonanceProcs < RESONANCE_DAILY_CAP) {
      const chance = Math.min(.5, r.build.resonance * .10);
      if (Math.random() < chance) {
        r.daily.resonanceProcs += 1;
        grantDirectBonus({
          realm,
          source: "talent-v2-resonance",
          sourceId: `${realm}:${localDateKey(date)}:${r.daily.resonanceProcs}`,
          label: `${realm} Resonance`,
          coins: 5,
          story: .20,
          at: date,
          metadata: { talentV2: true, kind: "resonance", rank: r.build.resonance, proc: r.daily.resonanceProcs, chance }
        });
        messages.push(`✨ ${realm} Resonance! +5 🪙 · +0.2 🔥`);
      }
    }

    return { messages };
  }

  function maybeApplySpecial(realm, spec, date) {
    const r = realmState(realm);
    const rank = Number(r.build.special || 0);
    if (!rank || r.daily.specialUsed) return null;
    const source = String(spec.source || "");
    const m = spec.metadata || {};
    let qualify = false;
    let coins = 0;
    let story = 0;
    let message = "";

    if (realm === "Work") {
      qualify = source === "time" && m.mode === "focus" && Number(m.minutes || 0) >= 25;
      coins = [0,10,15,20][rank]; story = [0,.25,.35,.50][rank];
      message = `🎯 Deep Work Bonus · +${coins} 🪙 · +${fmtEnergy(story)} 🔥`;
    } else if (realm === "Knowledge") {
      qualify = isKnowledgePuzzleSource(source, m);
      coins = [0,8,12,18][rank]; story = [0,.20,.30,.45][rank];
      message = `🧩 Puzzle Spark · +${coins} 🪙 · +${fmtEnergy(story)} 🔥`;
    } else if (realm === "Japanese") {
      qualify = (source === "library" && String(m.role || "") === "japanese") || (source === "game" && String(m.role || "") === "japanese") || source === "steam-playtime" && String(m.role || "") === "japanese";
      coins = [0,8,12,18][rank]; story = [0,.20,.30,.45][rank];
      message = `🎧 Immersion Echo · +${coins} 🪙 · +${fmtEnergy(story)} 🔥`;
    } else if (realm === "Health") {
      qualify = source === "daily-checkin" || source.startsWith("journal-reflection");
      coins = [0,5,10,15][rank]; story = [0,.15,.25,.35][rank];
      message = `🌙 Reflection Bloom · +${coins} 🪙 · +${fmtEnergy(story)} 🔥`;
    } else if (realm === "Recovery") {
      qualify = source === "recovery-studio";
      if (qualify) {
        const bonus = RESTED_BONUS[rank] || 0;
        r.charges.rested = { bonus, rank, createdAt: Date.now(), sourceEventId: null };
        r.daily.specialUsed = true;
        return { message: `☾ Rested charge ready · next non-Recovery action gets +${Math.round(bonus * 100)}% Realm XP` };
      }
    } else if (realm === "Home") {
      qualify = source === "time" && Number(m.minutes || 0) > 0 && Number(m.minutes || 0) <= 15;
      coins = [0,8,12,18][rank]; story = [0,.15,.25,.35][rank];
      message = `✨ Quick Win · +${coins} 🪙 · +${fmtEnergy(story)} 🔥`;
    } else if (realm === "Hobbies") {
      qualify = true;
      coins = [0,8,12,18][rank]; story = [0,.20,.30,.45][rank];
      message = `♡ Joy Spark · +${coins} 🪙 · +${fmtEnergy(story)} 🔥`;
    }

    if (!qualify) return null;
    r.daily.specialUsed = true;
    grantDirectBonus({
      realm,
      source: "talent-v2-special",
      sourceId: `${realm}:${REALMS[realm].special.id}:${localDateKey(date)}`,
      label: `${realm} · ${REALMS[realm].special.title}`,
      coins, story, at: date,
      metadata: { talentV2: true, kind: "realm-special", talentId: REALMS[realm].special.id, rank }
    });
    return { message };
  }

  function isKnowledgePuzzleSource(source, metadata = {}) {
    if (["sudoku-complete", "sudoku-solved", "nonogram-complete", "number-sense-complete", "memory-garden-complete", "lexicon-lab-complete", "logic-unlock-complete"].includes(source)) return true;
    if (["sudoku-daily-replay", "nonogram-daily-replay", "number-sense-daily-replay", "memory-garden-daily-replay"].includes(source)) return true;
    return Boolean(metadata.sudoku || metadata.nonogram || metadata.numberSense || metadata.memoryGarden || metadata.lexiconLab || metadata.logicExpansion);
  }

  function grantDirectBonus({ realm, source, sourceId, label, coins = 0, story = 0, at = new Date(), metadata = {} }) {
    const root = app.getState();
    root.rewardLedger ||= { schemaVersion: 1, events: [] };
    root.rewardLedger.events ||= [];
    const existing = sourceId ? root.rewardLedger.events.find(event => event?.source === source && event?.sourceId === sourceId) : null;
    if (existing) return existing;
    const safeCoins = Math.max(0, Math.round(Number(coins || 0)));
    const safeStory = floor2(Math.max(0, Number(story || 0)));
    root.coins = Math.max(0, Number(root.coins || 0)) + safeCoins;
    root.storyEnergy = floor2(Math.max(0, Number(root.storyEnergy || 0)) + safeStory);
    const event = {
      id: `reward-talent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      sourceId: sourceId || null,
      label: String(label || `${realm} Talent Bonus`),
      realm: REALMS[realm] ? realm : null,
      capability: null,
      xp: 0,
      realmXP: 0,
      statXP: 0,
      coins: safeCoins,
      rawStoryEnergy: safeStory,
      storyEnergy: safeStory,
      dedupeFamily: null,
      duplicate: false,
      duplicateOf: null,
      progressionRelevant: false,
      at: (at instanceof Date ? at : new Date(at)).toISOString(),
      metadata: { ...metadata, talentV2: true }
    };
    root.rewardLedger.events.push(event);
    if (root.rewardLedger.events.length > 2600) root.rewardLedger.events = root.rewardLedger.events.slice(-2500);
    return event;
  }

  function injectTrees() {
    for (const realm of REALM_ORDER) {
      if (document.getElementById(treeId(realm))) continue;
      const section = document.createElement("section");
      section.id = treeId(realm);
      section.className = "panel talent-v2-tree";
      section.dataset.skillTreeRealm = realm;
      skills.registerTalentTree(realm, section);
    }
  }

  function treeId(realm) { return `talentV2${realm.replace(/[^a-z0-9]/gi, "")}Tree`; }

  function renderAllTrees() {
    ensureState();
    for (const realm of REALM_ORDER) renderTree(realm);
    skills.refreshTalentHub?.();
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderAllTrees, 40);
  }

  function renderTree(realm) {
    const section = document.getElementById(treeId(realm));
    if (!section) return;
    normalizeDaily(realm, new Date());
    const r = realmState(realm);
    const meta = REALMS[realm];
    const points = skills.getRealmPoints(realm);
    const effects = getActiveEffects(realm);
    const cache = nodeCard(realm, "reward-cache", {
      icon: "🎁", title: "Reward Cache", branch: "REWARD TRACK · PERMANENT", maxRank: 5,
      rank: r.permanent.cacheRank,
      copy: cacheCopy(r.permanent.cacheRank), permanent: true
    });
    const resonance = nodeCard(realm, "resonance", {
      icon: "✨", title: "Resonance", branch: "LUCK / BONUS", maxRank: 5,
      rank: r.build.resonance,
      copy: `Each rank raises the chance that a real ${realm} activity procs +5 Coins and +0.20 Story Energy: 10% → 20% → 30% → 40% → 50%. Maximum ${RESONANCE_DAILY_CAP} procs per Realm/day.`
    });
    const momentum = nodeCard(realm, "momentum", {
      icon: "⚡", title: "Momentum", branch: "REALM XP", maxRank: 3,
      rank: r.build.momentum, requires: r.build.resonance >= 1,
      prereq: "Resonance I",
      copy: `The first rewarded ${realm} action each day gains extra Realm XP: +25% → +50% → +75%. Character XP and Skill XP are unchanged.`
    });
    const special = nodeCard(realm, meta.special.id, {
      icon: meta.special.icon, title: meta.special.title, branch: "REALM SPECIAL", maxRank: meta.special.maxRank,
      rank: r.build.special, requires: r.build.momentum >= 1,
      prereq: "Momentum I",
      copy: meta.special.effect(Math.min(meta.special.maxRank, Math.max(1, r.build.special || 1)))
    });
    const content = meta.content ? contentCard(realm, meta.content) : "";
    const planned = meta.planned ? plannedCard(meta.planned) : "";

    section.innerHTML = `
      <div class="talent-v2-head">
        <div><p class="eyebrow">${esc(realm.toUpperCase())} · TALENT TREE V2</p><h2>${meta.icon} ${esc(meta.title)} rewards you can actually feel.</h2><p>${esc(meta.subtitle)}</p></div>
        <div class="talent-v2-bank"><small>${esc(realm.toUpperCase())} POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span></div>
      </div>
      <section class="talent-v2-active">
        <div class="talent-v2-active-title"><span>✦</span><div><small>ACTIVE EFFECTS</small><strong>${effects.length ? `${effects.length} active effect${effects.length === 1 ? "" : "s"}` : "No talent effects active yet"}</strong></div></div>
        <div class="talent-v2-effect-list">${effects.length ? effects.map(effect => `<span>${esc(effect)}</span>`).join("") : `<span class="is-empty">Buy a talent and its exact live effect will appear here.</span>`}</div>
      </section>
      <div class="talent-v2-map">${cache}${resonance}${momentum}${special}${content}${planned}</div>
      <footer class="talent-v2-footer"><span>↻ Passive ranks can be respecced for free. Reward Cache claims and content unlocks are permanent, so earned rewards/data never disappear.</span><button class="text-button" type="button" data-talent-v2-reset="${escAttr(realm)}">Reset passive build</button></footer>`;
  }

  function cacheCopy(rank) {
    if (rank >= 5) return "All five permanent reward claims are owned. They never pay XP and are not affected by respec.";
    const next = CACHE_REWARDS[rank] || CACHE_REWARDS[0];
    return `Spend one Realm point for an immediate permanent reward. Next rank pays +${next.coins} Coins and +${fmtEnergy(next.story)} Story Energy. No XP.`;
  }

  function nodeCard(realm, id, cfg) {
    const rank = Number(cfg.rank || 0);
    const max = Number(cfg.maxRank || 1);
    const complete = rank >= max;
    const prereqMet = cfg.requires !== false;
    const points = skills.getRealmPoints(realm);
    const status = complete ? "is-bought" : !prereqMet ? "is-locked" : points.available >= 1 ? "is-available" : "is-short";
    const nextRank = Math.min(max, rank + 1);
    const label = complete ? "MAX RANK" : `RANK ${rank}/${max} · NEXT ${nextRank}`;
    const action = complete ? `<span class="talent-v2-owned">✓ Maxed</span>` : `<button class="${status === "is-available" ? "primary-button" : "secondary-button"}" type="button" data-talent-v2-buy="${escAttr(realm)}|${escAttr(id)}" ${status === "is-locked" ? "disabled" : ""}>${status === "is-locked" ? `Requires ${esc(cfg.prereq || "connected talent")}` : `Spend 1 point`}</button>`;
    return `<article class="talent-v2-node ${status} ${cfg.permanent ? "is-permanent" : ""}" data-talent-current-rank="${rank}" data-talent-max-rank="${max}" data-talent-next-cost="1">
      <div class="talent-v2-node-icon">${cfg.icon}</div>
      <div class="talent-v2-node-copy"><small>1 POINT / RANK · ${esc(cfg.branch)}</small><h3>${esc(cfg.title)}</h3><div class="talent-v2-ranks" aria-label="${rank} of ${max} ranks">${Array.from({ length: max }, (_, i) => `<i class="${i < rank ? "filled" : ""}"></i>`).join("")}</div><p>${esc(cfg.copy)}</p><em>${label}${cfg.permanent ? " · keeps after respec" : cfg.prereq ? ` · requires ${esc(cfg.prereq)}` : ""}</em></div>${action}</article>`;
  }

  function contentCard(realm, content) {
    const owned = isContentUnlocked(realm, content.id);
    const prereq = realmState(realm).build.special >= Number(content.requiresSpecial || 0);
    const points = skills.getRealmPoints(realm);
    const status = owned ? "is-bought" : !prereq ? "is-locked" : points.available >= content.cost ? "is-available" : "is-short";
    const action = owned
      ? `<button class="secondary-button" type="button" data-talent-v2-open="${escAttr(realm)}|${escAttr(content.id)}">${esc(content.openLabel || "Open")}</button>`
      : `<button class="${status === "is-available" ? "primary-button" : "secondary-button"}" type="button" data-talent-v2-buy="${escAttr(realm)}|${escAttr(content.id)}" ${status === "is-locked" ? "disabled" : ""}>${status === "is-locked" ? `Requires ${esc(REALMS[realm].special.title)} I` : `Unlock for ${content.cost} points`}</button>`;
    return `<article class="talent-v2-node talent-v2-content ${status}" data-talent-current-rank="${owned ? 1 : 0}" data-talent-max-rank="1" data-talent-next-cost="${content.cost}" data-talent-full-cost="${content.cost}">
      <div class="talent-v2-node-icon">${content.icon}</div><div class="talent-v2-node-copy"><small>${content.cost} POINTS · CONTENT UNLOCK · PERMANENT</small><h3>${esc(content.title)}</h3><div class="talent-v2-ranks"><i class="${owned ? "filled" : ""}"></i></div><p>${esc(content.copy)}</p><em>${owned ? "Unlocked permanently · use the button to go there" : `Requires ${esc(REALMS[realm].special.title)} I`}</em></div>${action}</article>`;
  }

  function plannedCard(planned) {
    return `<article class="talent-v2-node talent-v2-planned"><div class="talent-v2-node-icon">${planned.icon}</div><div class="talent-v2-node-copy"><small>PLANNED CONTENT · NOT PURCHASABLE</small><h3>${esc(planned.title)}</h3><p>${esc(planned.copy)}</p><em>It will only become buyable after the feature exists.</em></div><span class="talent-v2-owned is-planned">Later</span></article>`;
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-talent-v2-buy]");
      if (buy) {
        event.preventDefault();
        const [realm, id] = String(buy.dataset.talentV2Buy || "").split("|");
        purchase(realm, id);
        return;
      }
      const reset = event.target.closest?.("[data-talent-v2-reset]");
      if (reset) { event.preventDefault(); resetBuild(reset.dataset.talentV2Reset); return; }
      const open = event.target.closest?.("[data-talent-v2-open]");
      if (open) {
        event.preventDefault();
        const [realm, id] = String(open.dataset.talentV2Open || "").split("|");
        const content = REALMS[realm]?.content;
        if (content?.id === id && isContentUnlocked(realm, id)) content.open?.();
      }
    });
  }

  function emitChange(realm) {
    try { window.dispatchEvent(new CustomEvent("life-rpg:talent-v2-change", { detail: { realm } })); } catch {}
  }

  function floor2(value) { return Math.floor((Number(value || 0) + 1e-9) * 100) / 100; }
  function clampInt(value, min, max) { return Math.max(min, Math.min(max, Math.floor(Number(value || 0)))); }
  function roman(value) { return ["", "I", "II", "III", "IV", "V"][Number(value || 0)] || String(value); }
  function fmtEnergy(value) { const n = floor2(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? ""); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGTalentV2 = {
    version: VERSION,
    realms: REALM_ORDER.slice(),
    getRank,
    getActiveEffects,
    isContentUnlocked,
    purchase,
    resetBuild,
    modifyRewardSpec,
    afterActivityReward,
    refresh: renderAllTrees
  };
})();
