(() => {
  "use strict";

  if (window.__lifeRpgTalentTreeGraphV314ce) return;
  window.__lifeRpgTalentTreeGraphV314ce = true;

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  const v2 = window.LifeRPGTalentV2;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !v2?.purchase) {
    console.error("Talent Tree Paths could not initialize because Talent Trees V2 is unavailable.");
    return;
  }

  const VERSION = "0.31.4dp";
  const SCHEMA = 7;
  const REALMS = ["Work", "Knowledge", "Japanese", "Health", "Recovery", "Home", "Hobbies"];

  const META = {
    Work: {
      icon: "💼",
      special: { id: "deep-work", icon: "🎯", title: "Deep Work Bonus", max: 3 },
      subtitle: "Try a real Work tool with your first point, then deepen the Realm at your own pace.",
      dream: { title: "After Hours", copy: "after-work quiet, tiredness, and being taken care of when the day is finally over" },
      content: [
        content("work-debrief", "🧾", "Work Deep Brief", 1,
          "Starter unlock · spend 1 Work point and use it immediately. A deeper Work reflection for closing the loop after a demanding day, with voice dictation or typing.",
          {}),
        linkedContent("school-moments", "✎", "School Moments · Choice Stories", 1,
          "Ten interactive teaching-life situations. Pick a response, explore its trade-offs and keep a personal reflection; the story itself is the reward.",
          { content: "work-debrief" }, "Open School Moments", () => window.LifeRPGTalentV3?.open?.("school-moments")),
        planned("lesson-spark", "💡", "Lesson Spark Deck · Redesign",
          "Parked for now. Your existing Pinterest/books/resources already cover inspiration, so this needs a more genuinely rewarding concept before it can cost points.",
          { content: "work-debrief" }),
        linkedContent("work-moments", "✧", "After the Bell · Companion Moments", 1,
          "Three story-linked home moments with Katsuki and Eijiro about teacher-life boundaries and being seen as more than work. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "school-moments", story: "SC_011" }, "Open After the Bell", () => window.LifeRPGCompanionMoments?.open?.("Work"))
      ]
    },
    Knowledge: {
      icon: "🧠",
      special: { id: "puzzle-spark", icon: "🧩", title: "Puzzle Spark", max: 3 },
      subtitle: "Your first point can unlock a real logic game; later points add new puzzle types and stronger passives.",
      dream: { title: "Quiet Minds", copy: "books, puzzles, teaching each other, and the intimacy of shared concentration" },
      content: [
        linkedContent("slitherlink", "◫", "Slitherlink", 1,
          "Starter unlock · a real Daily + Practice Slitherlink puzzle inside Training Grounds.",
          {}, "Open Slitherlink", () => window.LifeRPGLogicExpansion?.open?.("slitherlink")),
        linkedContent("nurikabe", "▦", "Nurikabe", 1,
          "Add a second real logic game: Daily + Practice Nurikabe.",
          { content: "slitherlink" }, "Open Nurikabe", () => window.LifeRPGLogicExpansion?.open?.("nurikabe")),
        linkedContent("kakuro", "＋", "Kakuro", 1,
          "Add a third real logic game: Daily + Practice Kakuro.",
          { content: "nurikabe" }, "Open Kakuro", () => window.LifeRPGLogicExpansion?.open?.("kakuro")),
        linkedContent("takuzu", "01", "Takuzu · Binary Logic", 1,
          "A fourth real puzzle game: eight unique 6×6 grids, a daily challenge, saved progress and optional practice. All grids have unique solutions.",
          { content: "kakuro" }, "Open Takuzu", () => window.LifeRPGTalentV3?.open?.("takuzu")),
        linkedContent("knowledge-moments", "◇", "Puzzle Table · Companion Moments", 1,
          "Three optional VN moments around puzzles, shared curiosity and different ways of thinking. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "takuzu", story: "SC_011" }, "Open Puzzle Table", () => window.LifeRPGCompanionMoments?.open?.("Knowledge"))
      ]
    },
    Japanese: {
      icon: "🌸",
      special: { id: "immersion-echo", icon: "🎧", title: "Immersion Echo", max: 3 },
      subtitle: "Open character-driven Japanese content immediately, then expand the pool or branch into speaking practice.",
      dream: { title: "Between Words", copy: "language, repeated phrases, and things that become easier to say softly" },
      content: [
        rankedContent("dynariot-japanese", "🌸", "DynaRiot Japanese Extras", 3,
          "Rank I: 8 character cards. Rank II: 16. Rank III: 24 fully written Japanese cards with comprehension and archive. One real new pool per rank; non-canon and spoiler-safe.",
          {}, "Open DynaRiot Extras", () => window.LifeRPGTalentRewardStudios?.open?.("dynariot-japanese")),
        planned("shadowing-sprint", "🎙️", "Guided Shadowing · Redesign",
          "The old bring-your-own-audio timer was retired. A replacement must include playable Japanese audio, short clips, a transcript and actual echo/shadowing steps before it can cost a point.",
          { content: "dynariot-japanese", contentRank: 1 }),
        linkedContent("japanese-moments", "あ", "Everyday Japanese · Companion Moments", 1,
          "Three character-driven household conversations about speaking naturally and asking for help, not an empty shadowing timer. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "dynariot-japanese", story: "SC_011" }, "Open Everyday Japanese", () => window.LifeRPGCompanionMoments?.open?.("Japanese"))
      ]
    },
    Health: {
      icon: "🌿",
      special: { id: "reflection-bloom", icon: "🌙", title: "Reflection Bloom", max: 3 },
      subtitle: "Your first point can open a real reflection tool; deeper investment improves the surrounding Realm effects.",
      dream: { title: "Close Enough to Notice", copy: "care, warmth, touch, and noticing the body without turning it into a task" },
      content: [
        nativeContent("year-question", "📅", "365 Question Journal", 1,
          "Starter unlock · one different reflection question for every date of the year, recurring annually, with spoken or typed answers.",
          {}, "Open Journal", () => app.showView?.("journal")),
        linkedContent("future-letter", "✉", "Future Me · Sealed Letters", 1,
          "Write a sealed letter for yourself to open after 7, 30 or 90 days. Save it in the normal cloud-save state and revisit it when the date arrives; no forced daily task.",
          { content: "year-question" }, "Open Future Me", () => window.LifeRPGTalentV3?.open?.("future-letter")),
        linkedContent("health-moments", "✿", "A Gentler Pace · Companion Moments", 1,
          "Three small moments about movement, choice and pacing without forced fitness or guilt. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "future-letter", story: "SC_011" }, "Open A Gentler Pace", () => window.LifeRPGCompanionMoments?.open?.("Health"))
      ]
    },
    Recovery: {
      icon: "🛋️",
      special: { id: "rested-charge", icon: "☾", title: "Rested Charge", max: 3 },
      subtitle: "Open a regulation activity with your first point, then add more Recovery tools or deepen the passive path.",
      dream: { title: "Soft Landing", copy: "couches, blankets, sleepiness, stillness, and being allowed to lean on someone" },
      content: [
        nativeContent("grounding-54321", "✋", "5–4–3–2–1 Grounding", 1,
          "Starter unlock · the guided 7-minute sensory grounding session already built into Recovery Studio.",
          {}, "Open Recovery Studio", () => window.LifeRPGRecoveryStudio?.open?.()),
        content("recovery-toolkit", "✦", "Recovery Toolkit", 1,
          "Second content step · a rotating set of short regulation prompts with a real Recovery timer and its own completion reward.",
          { content: "grounding-54321" }),
        linkedContent("recovery-moments", "☾", "Quiet Company · Companion Moments", 1,
          "Three quiet VN moments that offer company, space and rest, not another body-scan timer. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "recovery-toolkit", story: "SC_011" }, "Open Quiet Company", () => window.LifeRPGCompanionMoments?.open?.("Recovery"))
      ]
    },
    Home: {
      icon: "🏠",
      special: { id: "quick-win", icon: "✨", title: "Quick Win", max: 3 },
      subtitle: "Spend the first point on a playful decision tool; later investment expands it instead of making you wait to try it.",
      dream: { title: "Domestic Gravity", copy: "shared-apartment mornings, kitchens, laundry, ordinary routines, and dangerous familiarity" },
      content: [
        rankedContent("home-oracle", "🔮", "Home Oracle", 2,
          "Rank I: create and use one weighted decision wheel. Rank II: remove the wheel limit and keep as many saved wheels as you actually use.",
          {}, "Open Home Oracle", () => window.LifeRPGTalentRewardStudios?.open?.("home-oracle")),
        linkedContent("cozy-kitchen", "🍳", "Cozy Kitchen · Pantry Deck", 1,
          "Sixteen practical meal ideas with actual ingredients and steps. Filter by what you have and time available; save favorites and tried dishes, without inventing a Quest.",
          { content: "home-oracle", contentRank: 1 }, "Open Cozy Kitchen", () => window.LifeRPGTalentV3?.open?.("cozy-kitchen")),
        linkedContent("home-moments", "⌂", "Apartment Hours · Companion Moments", 1,
          "Three shared-apartment side moments with ordinary household choices and room to belong. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "cozy-kitchen", story: "SC_011" }, "Open Apartment Hours", () => window.LifeRPGCompanionMoments?.open?.("Home"))
      ]
    },
    Hobbies: {
      icon: "🎨",
      special: { id: "joy-spark", icon: "♡", title: "Joy Spark", max: 3 },
      subtitle: "Unlock the creative studios once, then choose individual collectible coloring cards for your gallery. Drawing challenges remain included with the studio.",
      dream: { title: "Play After Dark", copy: "games, music, playful competition, and moments that feel suspiciously like dates" },
      content: [
        rankedContent("coloring-studio", "🖍️", "Coloring Studio", 1,
          "Unlocks the Coloring Studio, its original Bakugo · Level 1 card and Drawing Studio. Additional collectible cards can be purchased individually below for 1 Hobbies point each.",
          {}, "Open Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring") || window.LifeRPGTalentRewardStudios?.open?.("coloring-studio")),
        linkedContent("color-card-bakugo-hero-classic", "🃏", "Bakugo · Hero Classic", 1,
          "Collectible coloring card · Hero costume · a confident stance. View the locked preview in Coloring Studio; buy this card permanently with 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-bakugo-battle-heat", "🃏", "Bakugo · Battle Heat", 1,
          "Collectible coloring card · Adult hero · intense post-battle close-up. View the locked preview in Coloring Studio; buy this card permanently with 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-bakugo-alley-strut", "🃏", "Bakugo · Alley Strut", 1,
          "Collectible coloring card · Off duty · an ordinary city walk. View the locked preview in Coloring Studio; buy this card permanently with 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-bakugo-rooftop-break", "🃏", "Bakugo · Rooftop Break", 1,
          "Collectible coloring card · Rooftop downtime · a quiet pause. View the locked preview in Coloring Studio; buy this card permanently with 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-bakugo-chair-taunt", "🃏", "Bakugo · Chair Taunt", 1,
          "Collectible coloring card · Off duty · a cocky seated pose. View the locked preview in Coloring Studio; buy this card permanently with 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-bakugo-post-training", "🃏", "Bakugo · Post-Training", 1,
          "Collectible coloring card · After training · jacket in motion. View the locked preview in Coloring Studio; buy this card permanently with 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-hero-grin", "🃏", "Kirishima · Hero Grin", 1,
          "Collectible coloring card · Adult pro hero · confident, sharp-toothed grin. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-sunshine-break", "🃏", "Kirishima · Sunshine Break", 1,
          "Collectible coloring card · A relaxed off-duty smile. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-training-glow", "🃏", "Kirishima · Training Glow", 1,
          "Collectible coloring card · Sweaty post-workout break. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-red-riot-edge", "🃏", "Kirishima · Red Riot Edge", 1,
          "Collectible coloring card · A closer look at the adult hero guard. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-casual-charm", "🃏", "Kirishima · Casual Charm", 1,
          "Collectible coloring card · Off-duty hoodie and that familiar grin. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-chair-sideways", "🃏", "Kirishima · Chair Sideways", 1,
          "Collectible coloring card · A laid-back chair pose. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-stretch-break", "🃏", "Kirishima · Stretch Break", 1,
          "Collectible coloring card · Post-training stretch, all smiles. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-come-at-me", "🃏", "Kirishima · Come At Me", 1,
          "Collectible coloring card · Pro-hero challenge · reaching out. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("color-card-kirishima-lean-in", "🃏", "Kirishima · Lean In", 1,
          "Collectible coloring card · A gentle grin from across the table. Preview in Coloring Studio; permanently unlock for 1 Hobbies point.",
          { content: "coloring-studio" }, "View in Coloring Studio", () => window.LifeRPGCreativeHub?.enter?.("coloring")),
        linkedContent("palette-atelier", "◈", "Palette Atelier", 1,
          "An interactive color-matching game with three rounds, visible feedback, eight curated palettes, and daily or practice play. The coloring collection below is a separate optional content branch.",
          { content: "coloring-studio" }, "Open Palette Atelier", () => window.LifeRPGTalentV3?.open?.("palette-atelier")),
        planned("moodboard-mixer", "▣", "Moodboard Mixer · Later",
          "A future focused board tool for outfits, makeup, DIY and Adventure inspiration. Visible as a possible Hobbies expansion, but it cannot cost points until the tool actually exists.",
          { content: "palette-atelier" }),
        linkedContent("hobbies-moments", "♫", "Off-Duty Club · Companion Moments", 1,
          "Three VN scenes about games and fandom: two conversations plus a shared game-night extra. The scene is the reward; never purchases affection or Main Story progress.",
          { content: "palette-atelier", story: "SC_011" }, "Open Off-Duty Club", () => window.LifeRPGCompanionMoments?.open?.("Hobbies"))
      ]
    }
  };

  let renderTimer = null;

  init();

  function content(id, icon, title, cost, copy, requires = {}) {
    return { id, icon, title, cost, copy, requires, native: false, planned: false };
  }

  function nativeContent(id, icon, title, cost, copy, requires = {}, openLabel = "Open", open = null) {
    return { id, icon, title, cost, copy, requires, native: true, planned: false, openLabel, open };
  }

  function linkedContent(id, icon, title, cost, copy, requires = {}, openLabel = "Open", open = null) {
    return { id, icon, title, cost, copy, requires, native: false, planned: false, linked: true, openLabel, open };
  }

  function rankedContent(id, icon, title, maxRank, copy, requires = {}, openLabel = "Open", open = null) {
    return { id, icon, title, cost: 1, copy, requires, native: false, planned: false, linked: true, rankable: true, maxRank: Math.max(1, Number(maxRank || 1)), openLabel, open };
  }

  function planned(id, icon, title, copy, requires = {}) {
    return { id, icon, title, cost: 0, copy, requires, native: false, planned: true };
  }

  function init() {
    ensureState();
    bind();
    scheduleRender(0);
    window.addEventListener("life-rpg:render", () => scheduleRender(90));
    window.addEventListener("life-rpg:state-saved", () => scheduleRender(90));
    window.addEventListener("life-rpg:talent-v2-change", () => scheduleRender(70));
    window.addEventListener("life-rpg:talent-content-v2-change", () => scheduleRender(30));
  }

  function ensureState() {
    const root = app.getState();
    if (!root.talentTreeExpansion || typeof root.talentTreeExpansion !== "object" || Array.isArray(root.talentTreeExpansion)) {
      root.talentTreeExpansion = { schemaVersion: SCHEMA, version: VERSION, unlocks: {}, dreamThreads: {} };
    }
    const state = root.talentTreeExpansion;
    state.schemaVersion = SCHEMA;
    state.version = VERSION;
    state.unlocks ||= {};
    state.dreamThreads ||= {};
    state.migrations ||= {};
    for (const realm of REALMS) {
      if (!state.unlocks[realm] || typeof state.unlocks[realm] !== "object") state.unlocks[realm] = {};
      state.dreamThreads[realm] = Math.max(0, Math.min(2, Math.floor(Number(state.dreamThreads[realm] || 0))));
    }

    let migratedNow = false;
    if (!state.migrations.skillContentCleanupAR) {
      let refundedPoints = 0;
      const transfer = (realm, fromId, toId) => {
        const owned = state.unlocks[realm] || {};
        if (!owned[fromId]) return;
        if (!owned[toId]) owned[toId] = owned[fromId];
        delete owned[fromId];
      };
      const refund = (realm, id, cost = 2) => {
        const owned = state.unlocks[realm] || {};
        if (!owned[id]) return;
        delete owned[id];
        refundedPoints += Number(cost || 0);
      };

      transfer("Work", "lesson-spark", "work-focus-challenges");
      transfer("Knowledge", "decision-lens", "slitherlink");
      transfer("Japanese", "sentence-forge", "shadowing-sprint");

      refund("Health", "body-signals");
      refund("Home", "one-surface-reset");
      refund("Home", "home-reset-deck");
      refund("Hobbies", "creative-prompt-deck");
      refund("Hobbies", "idea-garden");
      refund("Hobbies", "creative-dice");

      state.migrations.skillContentCleanupAR = { at: Date.now(), refundedPoints };
      migratedNow = true;
    }
    if (!state.migrations.starterContentRanksAT) {
      for (const [realm, id] of [["Japanese", "dynariot-japanese"], ["Home", "home-oracle"], ["Hobbies", "coloring-studio"]]) {
        const raw = state.unlocks?.[realm]?.[id];
        if (raw) {
          // V0.31.4as charged 2 points for the complete feature. Rank II is the
          // complete current feature in AT, so old owners keep exactly what they had.
          state.unlocks[realm][id] = 2;
        }
      }
      state.migrations.starterContentRanksAT = { at: Date.now() };
      migratedNow = true;
    }
    if (!state.migrations.cwRetiredContentRefund) {
      const retired = {};
      for (const [realm,id] of [["Work","work-focus-challenges"],["Japanese","shadowing-sprint"]]) {
        if (state.unlocks[realm]?.[id]) {
          retired[realm] = {...(retired[realm]||{}),[id]:state.unlocks[realm][id]};
          delete state.unlocks[realm][id];
        }
      }
      // External content spending is derived dynamically: removing only these
      // purchases restores their points without changing the canonical ledger.
      state.migrations.cwRetiredContentRefund = {at:Date.now(),retired};
      migratedNow = true;
    }
    if (!state.migrations.coloringStudioSingleRankBZ) {
      const raw = Math.max(0, Math.floor(Number(state.unlocks?.Hobbies?.["coloring-studio"] || 0)));
      if (raw > 1) state.unlocks.Hobbies["coloring-studio"] = 1;
      state.migrations.coloringStudioSingleRankBZ = { at: Date.now(), previousRank: raw, refundedPoints: raw > 1 ? raw - 1 : 0 };
      migratedNow = true;
    }
    if (migratedNow) app.saveState({ source: "talent-tree-content-migrations-bz", suppressUiRefresh: true });
    return state;
  }

  function state() { return ensureState(); }

  function customContentDefs(realm) {
    return (META[realm]?.content || []).filter(item => !item.native && !item.planned);
  }

  function getContentRank(realm, itemOrId) {
    const id = typeof itemOrId === "string" ? itemOrId : itemOrId?.id;
    const item = typeof itemOrId === "string" ? (META[realm]?.content || []).find(entry => entry.id === id) : itemOrId;
    if (!id || !item) return 0;
    if (item.native) return v2.isContentUnlocked?.(realm, id) ? 1 : 0;
    const raw = state().unlocks?.[realm]?.[id];
    if (item.rankable) return Math.max(0, Math.min(Number(item.maxRank || 1), Math.floor(Number(raw || 0))));
    return raw ? 1 : 0;
  }

  function extraSpent(realm) {
    const contentSpent = customContentDefs(realm).reduce((sum, item) => {
      const rank = getContentRank(realm, item);
      return sum + (item.rankable ? rank * Number(item.cost || 1) : rank ? Number(item.cost || 0) : 0);
    }, 0);
    const dreamSpent = getDreamThreadRank(realm) * 2;
    return contentSpent + dreamSpent;
  }


  function getDreamThreadRank(realm) {
    return Math.max(0, Math.min(2, Math.floor(Number(state().dreamThreads?.[realm] || 0))));
  }

  function totalDreamThreads() {
    return REALMS.reduce((sum, realm) => sum + getDreamThreadRank(realm), 0);
  }

  function dreamCadenceDays() {
    const total = totalDreamThreads();
    return total ? Math.max(1, 15 - total) : null;
  }

  function firstRealContent(realm) {
    return (META[realm]?.content || []).find(item => !item.planned) || null;
  }

  function secondRealContent(realm) {
    const real = (META[realm]?.content || []).filter(item => !item.planned);
    return real[1] || real[0] || null;
  }

  function dreamPrereqStatus(realm, targetRank) {
    const current = getDreamThreadRank(realm);
    const meta = META[realm];
    if (!meta) return { ok: false, label: "Realm unavailable" };

    if (targetRank <= 1) {
      const special = Number(v2.getRank(realm, meta.special.id) || 0);
      if (special < 2) return { ok: false, label: `${meta.special.title} II` };
      const first = firstRealContent(realm);
      if (first && !isOwned(realm, first)) return { ok: false, label: first.title };
      return { ok: true, label: "" };
    }

    if (current < 1) return { ok: false, label: "Dream Thread I" };
    const special = Number(v2.getRank(realm, meta.special.id) || 0);
    if (special < 3) return { ok: false, label: `${meta.special.title} III` };
    const first = firstRealContent(realm);
    if (first && !isOwned(realm, first)) return { ok: false, label: first.title };
    return { ok: true, label: "" };
  }

  function purchaseDreamThread(realm) {
    if (!META[realm]) return false;
    const current = getDreamThreadRank(realm);
    if (current >= 2) return false;
    const target = current + 1;
    const prereq = dreamPrereqStatus(realm, target);
    if (!prereq.ok) {
      app.showToast?.(`Requires ${prereq.label} first.`);
      return false;
    }

    const cost = 2;
    const points = skills.getRealmPoints(realm);
    if (Number(points.available || 0) < cost) {
      app.showToast?.(`You need ${cost} ${realm} points for Dream Thread ${roman(target)}.`);
      return false;
    }

    state().dreamThreads[realm] = target;
    app.saveState({ source: `dream-thread-${realm.toLowerCase()}-${target}`, suppressUiRefresh: true });
    try {
      window.dispatchEvent(new CustomEvent("life-rpg:dream-thread-change", {
        detail: { realm, rank: target, total: totalDreamThreads(), cadenceDays: dreamCadenceDays() }
      }));
    } catch {}
    app.showToast?.(`🌙 ${realm} Dream Thread ${roman(target)} unlocked · Dreamscape cadence: every ${dreamCadenceDays()} day${dreamCadenceDays() === 1 ? "" : "s"}.`);
    scheduleRender(20);
    return true;
  }

  function wrapRealmPointAccounting() {
    // V0.31.4ap: realmPointInfo in skills.js now owns external-spend accounting.
    // Keeping this no-op avoids double-subtracting Content/Dream costs.
    return true;
  }

  function isOwned(realm, itemOrId) {
    return getContentRank(realm, itemOrId) > 0;
  }

  function prereqStatus(realm, item) {
    const req = item?.requires || {};
    if (Number(req.special || 0) > 0 && Number(v2.getRank(realm, META[realm].special.id) || 0) < Number(req.special)) {
      return { ok: false, label: `${META[realm].special.title} ${roman(req.special)}` };
    }
    if (req.content) {
      const parent = (META[realm].content || []).find(entry => entry.id === req.content);
      const neededRank = Math.max(1, Number(req.contentRank || 1));
      if (!parent || getContentRank(realm, parent) < neededRank) {
        return { ok: false, label: `${parent?.title || "previous content unlock"}${neededRank > 1 ? ` ${roman(neededRank)}` : ""}` };
      }
    }
    if (req.story && !Array.isArray(app.getState().story?.completedSceneIds)) {
      return { ok: false, label: "Continue Main Story to the shared-apartment chapter" };
    }
    if (req.story && !app.getState().story.completedSceneIds.includes(req.story)) {
      return { ok: false, label: "Continue Main Story to the shared-apartment chapter" };
    }
    return { ok: true, label: "" };
  }

  function purchaseContent(realm, id) {
    const item = (META[realm]?.content || []).find(entry => entry.id === id);
    if (!item || item.planned) return false;
    const currentRank = getContentRank(realm, item);
    const maxRank = item.rankable ? Number(item.maxRank || 1) : 1;
    if (currentRank >= maxRank) return false;

    const prereq = prereqStatus(realm, item);
    if (!prereq.ok) {
      app.showToast?.(`Requires ${prereq.label} first.`);
      return false;
    }

    if (item.native) {
      const result = v2.purchase(realm, id);
      scheduleRender(50);
      return result;
    }

    const points = skills.getRealmPoints(realm);
    const cost = Math.max(1, Number(item.cost || 1));
    if (Number(points.available || 0) < cost) {
      app.showToast?.(`You need ${cost} ${realm} point${cost === 1 ? "" : "s"} for ${item.title}.`);
      return false;
    }

    const nextRank = currentRank + 1;
    state().unlocks[realm][item.id] = item.rankable ? nextRank : Date.now();
    app.saveState({ source: `talent-content-unlock-${realm.toLowerCase()}`, suppressUiRefresh: true });
    emitChange(realm, item.id);
    app.showToast?.(`🔓 ${item.title}${item.rankable ? ` ${roman(nextRank)}/${maxRank}` : ""} unlocked · ${cost} ${realm} point${cost === 1 ? "" : "s"}.`);
    scheduleRender(20);
    return true;
  }

  function openContent(realm, id) {
    const item = (META[realm]?.content || []).find(entry => entry.id === id);
    if (!item || !isOwned(realm, item)) return false;
    if (item.native || item.linked) {
      item.open?.();
      return true;
    }
    return Boolean(window.LifeRPGTalentContentV2?.open?.(id));
  }

  function emitChange(realm, id) {
    try {
      window.dispatchEvent(new CustomEvent("life-rpg:talent-content-v2-change", { detail: { realm, id } }));
    } catch {}
  }

  function scheduleRender(delay = 60) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderAll, delay);
  }

  function renderAll() {
    for (const realm of REALMS) renderRealm(realm);
    skills.refreshTalentHub?.();
    window.LifeRPGTalentContentV2?.refresh?.();
  }

  function renderRealm(realm) {
    const section = document.getElementById(treeId(realm));
    if (!section) return;

    const meta = META[realm];
    const points = skills.getRealmPoints(realm);
    const effects = [
      ...(v2.getActiveEffects?.(realm) || []),
      ...customContentDefs(realm).filter(item => isOwned(realm, item)).map(item => `${item.icon} ${item.title}${item.rankable ? ` ${roman(getContentRank(realm, item))}/${item.maxRank}` : ""} · permanently unlocked`)
    ];
    const dreamRank = getDreamThreadRank(realm);
    if (dreamRank) effects.push(`🌙 Dream Thread ${dreamRank}/2 · ${meta.dream.title} pool · global cadence every ${dreamCadenceDays()} day${dreamCadenceDays() === 1 ? "" : "s"}`);

    const rewardNode = rankNode(realm, "reward-cache", {
      icon: "🎁",
      title: "Reward Cache",
      branch: "REWARDS",
      rank: v2.getRank(realm, "reward-cache"),
      max: 5,
      permanent: true,
      copy: "Spend one point per rank for an immediate permanent Coin + Story Energy cache. No XP. Each rank can only pay once."
    });

    const resonanceNode = rankNode(realm, "resonance", {
      icon: "✨",
      title: "Resonance",
      branch: "CORE PATH",
      rank: v2.getRank(realm, "resonance"),
      max: 5,
      copy: `10% → 20% → 30% → 40% → 50% chance for a small visible ${realm} bonus proc.`
    });

    const resonanceRank = Number(v2.getRank(realm, "resonance") || 0);
    const momentumNode = rankNode(realm, "momentum", {
      icon: "⚡",
      title: "Momentum",
      branch: "CORE PATH",
      rank: v2.getRank(realm, "momentum"),
      max: 3,
      requires: resonanceRank >= 1,
      prereq: "Resonance I",
      copy: `First rewarded ${realm} action of the day gets +25% → +50% → +75% Realm XP.`
    });

    const momentumRank = Number(v2.getRank(realm, "momentum") || 0);
    const specialNode = rankNode(realm, meta.special.id, {
      icon: meta.special.icon,
      title: meta.special.title,
      branch: "REALM SPECIAL",
      rank: v2.getRank(realm, meta.special.id),
      max: meta.special.max,
      requires: momentumRank >= 1,
      prereq: "Momentum I",
      copy: specialCopy(realm)
    });

    const contentNodes = meta.content.map((item, index) => contentNode(realm, item, index)).join("");
    const dreamNodes = dreamBranchNodes(realm);

    section.innerHTML = `
      <div class="talent-v3-head">
        <div>
          <p class="eyebrow">${esc(realm.toUpperCase())} · TALENT TREE</p>
          <h2>${meta.icon} ${esc(realm)}</h2>
          <p>${esc(meta.subtitle)}</p>
        </div>
        <div class="talent-v3-bank">
          <small>AVAILABLE ${esc(realm.toUpperCase())} POINTS</small>
          <strong>${Number(points.available || 0)}</strong>
          <span>${Number(points.spent || 0)} spent · ${Number(points.earned || 0)} earned</span>
        </div>
      </div>

      <section class="talent-v3-active">
        <div><small>ACTIVE / OWNED</small><strong>${effects.length ? `${effects.length} effect${effects.length === 1 ? "" : "s"}` : "Nothing bought yet"}</strong></div>
        <div class="talent-v3-effect-list">
          ${effects.length ? effects.map(effect => `<span>${esc(effect)}</span>`).join("") : `<span class="is-empty">Bought effects and permanent content show up here.</span>`}
        </div>
      </section>

      <div class="talent-v3-tree">
        <div class="talent-v3-root">
          <span>${meta.icon}</span>
          <div><small>REALM POINTS</small><strong>Choose a path</strong></div>
        </div>
        <div class="talent-v3-root-trunk" aria-hidden="true"></div>

        <div class="talent-v3-branches">
          <section class="talent-v3-branch is-reward">
            <header><span>🎁</span><div><small>BRANCH A</small><strong>Rewards</strong><p>Independent permanent claims.</p></div></header>
            <div class="talent-v3-drop" aria-hidden="true">↓</div>
            ${rewardNode}
          </section>

          <section class="talent-v3-branch is-core">
            <header><span>⚡</span><div><small>BRANCH B</small><strong>Power & Momentum</strong><p>This is the prerequisite spine.</p></div></header>
            <div class="talent-v3-drop" aria-hidden="true">↓</div>
            ${resonanceNode}
            ${treeLink("Resonance I unlocks Momentum")}
            ${momentumNode}
            ${treeLink("Momentum I unlocks the Realm Special")}
            ${specialNode}
          </section>

          <section class="talent-v3-branch is-content">
            <header><span>🔓</span><div><small>BRANCH C</small><strong>Content</strong><p>New things to actually use.</p></div></header>
            <div class="talent-v3-content-origin"><span>↳</span><strong>Starter content is available immediately · 1 point</strong></div>
            ${contentNodes}
          </section>

          <section class="talent-v3-branch is-dream">
            <header><span>🌙</span><div><small>BRANCH D · META STORY</small><strong>${esc(meta.dream.title)}</strong><p>${esc(meta.dream.copy)}</p></div></header>
            <div class="talent-v3-content-origin"><span>↳</span><strong>Deep branch · Dreamscape ${totalDreamThreads()}/14</strong></div>
            ${dreamNodes}
          </section>
        </div>
      </div>

      <footer class="talent-v3-footer">
        <span>Passive ranks can still be respecced for free. Reward Cache claims and Content Unlocks remain permanent.</span>
        <button class="text-button" type="button" data-talent-v3-reset="${escAttr(realm)}">Reset passive build</button>
      </footer>`;
  }

  function rankNode(realm, id, cfg) {
    const rank = Number(cfg.rank || 0);
    const max = Number(cfg.max || 1);
    const complete = rank >= max;
    const prereqMet = cfg.requires !== false;
    const points = skills.getRealmPoints(realm);
    const canBuy = !complete && prereqMet && Number(points.available || 0) >= 1;
    const stateClass = complete ? "is-owned" : !prereqMet ? "is-locked" : canBuy ? "is-ready" : "is-poor";
    const button = complete
      ? `<span class="talent-v3-owned">✓ Maxed</span>`
      : `<button class="${canBuy ? "primary-button" : "secondary-button"}" type="button" data-talent-v3-core="${escAttr(realm)}|${escAttr(id)}" ${!prereqMet ? "disabled" : ""}>${!prereqMet ? `Requires ${esc(cfg.prereq || "previous node")}` : "Spend 1 point"}</button>`;

    return `<article class="talent-v3-node ${stateClass} ${cfg.permanent ? "is-permanent" : ""}">
      <div class="talent-v3-node-top">
        <span class="talent-v3-node-icon">${cfg.icon}</span>
        <div><small>${esc(cfg.branch)} · 1 POINT / RANK</small><h3>${esc(cfg.title)}</h3></div>
      </div>
      <div class="talent-v3-ranks" aria-label="${rank} of ${max} ranks">
        ${Array.from({ length: max }, (_, i) => `<i class="${i < rank ? "filled" : ""}"></i>`).join("")}
      </div>
      <p>${esc(cfg.copy)}</p>
      <div class="talent-v3-node-foot"><em>${rank}/${max}${cfg.permanent ? " · permanent" : cfg.prereq ? ` · path: ${esc(cfg.prereq)}` : ""}</em>${button}</div>
    </article>`;
  }


  function dreamBranchNodes(realm) {
    const rank = getDreamThreadRank(realm);
    const meta = META[realm];
    const points = skills.getRealmPoints(realm);
    const cadence = dreamCadenceDays();
    const firstReq = dreamPrereqStatus(realm, 1);
    const secondReq = dreamPrereqStatus(realm, 2);
    const gateList = target => {
      const special = Number(v2.getRank(realm, meta.special.id) || 0);
      const first = firstRealContent(realm);
      const needs = target === 1 ? 2 : 3;
      const steps = [{done:special>=needs,text:`${meta.special.title} ${roman(needs)} (${special}/${needs})`}];
      if (target === 2) steps.unshift({done:rank>=1,text:"Own Dream Thread I"});
      if (first) steps.push({done:isOwned(realm,first),text:`${target===1?"Unlock":"Keep"} ${first.title} unlocked`});
      steps.push({done:Number(points.available||0)>=2,text:`Have 2 unspent ${realm} points (${Number(points.available||0)}/2)`});
      return `<ul class="dream-prereqs-v314cw">${steps.map(x=>`<li class="${x.done?"is-met":"is-missing"}">${x.done?"✓":"○"} ${esc(x.text)}</li>`).join("")}</ul>`;
    };

    const make = (target, prereq, copy) => {
      const owned = rank >= target;
      const cost = 2;
      const canBuy = !owned && prereq.ok && Number(points.available || 0) >= cost && rank === target - 1;
      const locked = !owned && (!prereq.ok || rank !== target - 1);
      const stateClass = owned ? "is-owned" : locked ? "is-locked" : canBuy ? "is-ready" : "is-poor";
      const action = owned
        ? `<span class="talent-v3-owned">✓ Thread ${roman(target)}</span>`
        : `<button class="${canBuy ? "primary-button" : "secondary-button"}" type="button" data-talent-v3-dream="${escAttr(realm)}" ${locked ? "disabled" : ""}>${locked ? `Requires ${esc(prereq.label || `Dream Thread ${roman(target - 1)}`)}` : "Unlock for 2 points"}</button>`;
      return `<article class="talent-v3-node talent-v3-dream-node ${stateClass}">
        <div class="talent-v3-node-top">
          <span class="talent-v3-node-icon">🌙</span>
          <div><small>DREAM THREAD ${roman(target)} · 2 POINTS · PERMANENT</small><h3>${target === 1 ? `${esc(meta.dream.title)} Pool` : `${esc(meta.dream.title)} · Deeper Dreams`}</h3></div>
        </div>
        <p>${esc(copy)}</p>
        ${gateList(target)}
        <div class="talent-v3-node-foot"><em>${owned
          ? `Owned · Dreamscape cadence currently every ${cadence} day${cadence === 1 ? "" : "s"}`
          : `Path: ${esc(target === 1 ? `${meta.special.title} II + first content unlock` : `Thread I + ${meta.special.title} III + first content unlock`)}`}</em>${action}</div>
      </article>`;
    };

    return make(1, firstReq, `Unlock this Realm's ${meta.dream.title} dream pool. The very first Dream Thread anywhere also makes one dream available immediately.`)
      + treeLink("Thread I + Realm Special III + first content unlock + 2 unspent points")
      + make(2, secondReq, `Adds more intimate variants to the ${meta.dream.title} pool and contributes another step toward the global 1-day Dreamscape cadence.`);
  }

  function contentNode(realm, item, index) {
    if (item.planned) {
      const prereq = prereqStatus(realm, item);
      return `${index ? treeLink(item.requires?.content ? `After ${contentTitle(realm, item.requires.content)}` : `Future expansion`) : ""}
        <article class="talent-v3-node talent-v3-content-node is-planned">
          <div class="talent-v3-node-top">
            <span class="talent-v3-node-icon">${item.icon}</span>
            <div><small>FUTURE CONTENT · VISIBLE PATH</small><h3>${esc(item.title)}</h3></div>
          </div>
          <p>${esc(item.copy)}</p>
          <div class="talent-v3-node-foot"><em>Planned path: ${esc(prereq.label || requirementLabel(realm, item))}</em><span class="talent-v3-owned is-later">Later</span></div>
        </article>`;
    }

    const rank = getContentRank(realm, item);
    const maxRank = item.rankable ? Number(item.maxRank || 1) : 1;
    const owned = rank > 0;
    const complete = rank >= maxRank;
    const prereq = prereqStatus(realm, item);
    const points = skills.getRealmPoints(realm);
    const cost = Number(item.cost || 1);
    const canBuy = !complete && prereq.ok && Number(points.available || 0) >= cost;
    const stateClass = complete ? "is-owned" : !prereq.ok ? "is-locked" : canBuy ? "is-ready" : "is-poor";

    const openButton = owned ? `<button class="secondary-button" type="button" data-talent-v3-open="${escAttr(realm)}|${escAttr(item.id)}">${esc(item.openLabel || "Open")}</button>` : "";
    const buyButton = complete ? "" : `<button class="${canBuy ? "primary-button" : "secondary-button"}" type="button" data-talent-v3-content="${escAttr(realm)}|${escAttr(item.id)}" ${!prereq.ok ? "disabled" : ""}>${!prereq.ok ? `Requires ${esc(prereq.label)}` : item.rankable ? `Unlock Rank ${roman(rank + 1)} · ${cost} point` : `Unlock for ${cost} point${cost === 1 ? "" : "s"}`}</button>`;
    const action = complete ? openButton : `<span class="talent-v3-content-actions">${openButton}${buyButton}</span>`;

    const cardArt = realm === "Hobbies" && item.id.startsWith("color-card-") ?
      `assets/coloring/${item.id.slice("color-card-".length)}-line.png?v=0.31.4dp` : "";
    const art = cardArt ? `<div class="talent-card-art-v314dn ${owned ? "is-owned" : "is-locked"}"><img src="${escAttr(cardArt)}" alt="Preview of ${escAttr(item.title)}" loading="lazy">${owned ? "" : `<span aria-hidden="true">🔒</span>`}</div>` : "";
    return `${index ? treeLink(item.requires?.content ? `Previous unlock: ${contentTitle(realm, item.requires.content)}${item.requires.contentRank > 1 ? ` ${roman(item.requires.contentRank)}` : ""}` : `Content expansion`) : ""}
      <article id="talent-v3-content-${escAttr(realm)}-${escAttr(item.id)}" class="talent-v3-node talent-v3-content-node ${stateClass} ${cardArt ? "is-coloring-card" : ""}">
        <div class="talent-v3-node-top">
          <span class="talent-v3-node-icon">${item.icon}</span>
          <div><small>CONTENT ${item.rankable ? `RANK · 1 POINT / RANK` : `UNLOCK · ${cost} POINT${cost === 1 ? "" : "S"}`} · PERMANENT</small><h3>${esc(item.title)}</h3></div>
        </div>
        ${item.rankable ? `<div class="talent-v3-ranks" aria-label="${rank} of ${maxRank} ranks">${Array.from({ length: maxRank }, (_, i) => `<i class="${i < rank ? "filled" : ""}"></i>`).join("")}</div>` : ""}
        ${art}
        <p>${esc(item.copy)}</p>
        <div class="talent-v3-node-foot"><em>${owned ? item.rankable ? `Rank ${roman(rank)}/${roman(maxRank)} unlocked` : "Permanently unlocked" : `Path: ${esc(requirementLabel(realm, item))}`}</em>${action}</div>
      </article>`;
  }

  function contentTitle(realm, id) {
    return (META[realm]?.content || []).find(item => item.id === id)?.title || "previous content";
  }

  function requirementLabel(realm, item) {
    const req = item?.requires || {};
    const bits = [];
    if (req.special) bits.push(`${META[realm].special.title} ${roman(req.special)}`);
    if (req.content) bits.push(`${contentTitle(realm, req.content)}${Number(req.contentRank || 1) > 1 ? ` ${roman(req.contentRank)}` : ""}`);
    if (req.story) bits.push("Shared-apartment chapter completed");
    return bits.join(" + ") || "Available immediately";
  }

  function treeLink(label) {
    return `<div class="talent-v3-link" aria-hidden="true"><span></span><small>${esc(label)}</small><b>↓</b></div>`;
  }

  function specialCopy(realm) {
    const copy = {
      Work: "First completed Work focus block of at least 25 minutes: increasing Coin + Story Energy bonus.",
      Knowledge: "First rewarded logic/knowledge puzzle of the day: increasing Coin + Story Energy bonus.",
      Japanese: "First Japanese book/game immersion log of the day: increasing Coin + Story Energy bonus.",
      Health: "First rewarded Journal reflection or Daily Check-in: increasing Coin + Story Energy bonus.",
      Recovery: "First rewarded Recovery Studio completion creates a Rested charge for the next non-Recovery action.",
      Home: "First rewarded Home block of 15 minutes or less: increasing Coin + Story Energy bonus.",
      Hobbies: "First rewarded Hobbies activity of the day: increasing Coin + Story Energy bonus."
    };
    return copy[realm] || "Realm-specific daily bonus.";
  }

  function treeId(realm) {
    return `talentV2${realm.replace(/[^a-z0-9]/gi, "")}Tree`;
  }

  function bind() {
    document.addEventListener("click", event => {
      const core = event.target.closest?.("[data-talent-v3-core]");
      if (core) {
        event.preventDefault();
        const [realm, id] = String(core.dataset.talentV3Core || "").split("|");
        v2.purchase(realm, id);
        scheduleRender(80);
        return;
      }

      const contentButton = event.target.closest?.("[data-talent-v3-content]");
      if (contentButton) {
        event.preventDefault();
        const [realm, id] = String(contentButton.dataset.talentV3Content || "").split("|");
        purchaseContent(realm, id);
        return;
      }

      const open = event.target.closest?.("[data-talent-v3-open]");
      if (open) {
        event.preventDefault();
        const [realm, id] = String(open.dataset.talentV3Open || "").split("|");
        openContent(realm, id);
        return;
      }

      const dream = event.target.closest?.("[data-talent-v3-dream]");
      if (dream) {
        event.preventDefault();
        purchaseDreamThread(dream.dataset.talentV3Dream);
        return;
      }

      const reset = event.target.closest?.("[data-talent-v3-reset]");
      if (reset) {
        event.preventDefault();
        v2.resetBuild?.(reset.dataset.talentV3Reset);
        scheduleRender(80);
      }
    });
  }

  function focusRealm(realm) {
    skills.open?.();
    skills.selectTalentRealm?.(realm);
    scheduleRender(20);
    window.setTimeout(() => {
      document.getElementById(treeId(realm))?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function focusContent(realm, id) {
    if (!META[realm] || !(META[realm].content || []).some(item => item.id === id)) return false;
    focusRealm(realm);
    window.setTimeout(() => {
      const target = document.getElementById(`talent-v3-content-${realm}-${id}`);
      target?.scrollIntoView?.({behavior:"smooth",block:"center"});
    }, 250);
    return true;
  }

  function roman(value) {
    return ["", "I", "II", "III", "IV", "V"][Number(value || 0)] || String(value || "");
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  window.LifeRPGTalentTreeGraph = {
    version: VERSION,
    meta: META,
    isContentUnlocked: isOwned,
    getContentRank,
    purchaseContent,
    openContent,
    extraSpent,
    getDreamThreadRank,
    getTotalDreamThreads: totalDreamThreads,
    getDreamCadenceDays: dreamCadenceDays,
    getDreamTheme: realm => META[realm]?.dream ? { ...META[realm].dream } : null,
    purchaseDreamThread,
    focusRealm,
    focusContent,
    refresh: renderAll
  };
})();