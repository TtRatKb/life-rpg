(() => {
  "use strict";

  if (window.__lifeRpgTalentTreeGraphV314ar) return;
  window.__lifeRpgTalentTreeGraphV314ar = true;

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  const v2 = window.LifeRPGTalentV2;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !v2?.purchase) {
    console.error("Talent Tree Paths could not initialize because Talent Trees V2 is unavailable.");
    return;
  }

  const VERSION = "0.31.4ar";
  const SCHEMA = 3;
  const REALMS = ["Work", "Knowledge", "Japanese", "Health", "Recovery", "Home", "Hobbies"];

  const META = {
    Work: {
      icon: "💼",
      special: { id: "deep-work", icon: "🎯", title: "Deep Work Bonus", max: 3 },
      subtitle: "Build from chance → momentum → deeper focus, then branch into optional work tools.",
      dream: { title: "After Hours", copy: "after-work quiet, tiredness, and being taken care of when the day is finally over" },
      content: [
        content("work-debrief", "🧾", "Work Deep Brief", 2,
          "Unlock a deeper Work reflection for closing the loop after a demanding day: what moved, what drained you, what matters next, and what can be released. It supports voice dictation as well as typing.",
          { special: 1 }),
        content("work-focus-challenges", "◆", "Focus Challenge Deck", 2,
          "Unlock rotating optional 35-minute focus challenges. They give you a concrete way to start; the normal Focus system stays free.",
          { special: 2, content: "work-debrief" }),
        planned("lesson-spark", "💡", "Lesson Spark Deck · Redesign",
          "Parked for now. Your existing Pinterest/books/resources already cover inspiration, so this needs a more genuinely rewarding concept before it can cost points.",
          { special: 3, content: "work-focus-challenges" })
      ]
    },
    Knowledge: {
      icon: "🧠",
      special: { id: "puzzle-spark", icon: "🧩", title: "Puzzle Spark", max: 3 },
      subtitle: "Turn regular thinking into stronger puzzle rewards, then unlock new ways to think.",
      dream: { title: "Quiet Minds", copy: "books, puzzles, teaching each other, and the intimacy of shared concentration" },
      content: [
        linkedContent("slitherlink", "◫", "Slitherlink", 2,
          "Unlock a real Daily + Practice Slitherlink puzzle inside Training Grounds.",
          { special: 1 }, "Open Slitherlink", () => window.LifeRPGLogicExpansion?.open?.("slitherlink")),
        linkedContent("nurikabe", "▦", "Nurikabe", 2,
          "Unlock a real Daily + Practice Nurikabe puzzle inside Training Grounds.",
          { special: 2, content: "slitherlink" }, "Open Nurikabe", () => window.LifeRPGLogicExpansion?.open?.("nurikabe")),
        linkedContent("kakuro", "＋", "Kakuro", 2,
          "Unlock a real Daily + Practice Kakuro puzzle inside Training Grounds.",
          { special: 3, content: "nurikabe" }, "Open Kakuro", () => window.LifeRPGLogicExpansion?.open?.("kakuro"))
      ]
    },
    Japanese: {
      icon: "🌸",
      special: { id: "immersion-echo", icon: "🎧", title: "Immersion Echo", max: 3 },
      subtitle: "Reward contact with Japanese, then open extra production/immersion toys rather than hiding the basics.",
      dream: { title: "Between Words", copy: "language, repeated phrases, and things that become easier to say softly" },
      content: [
        content("shadowing-sprint", "🎙️", "Shadowing Sprint", 2,
          "Unlock a five-minute bring-your-own-audio shadowing sprint with a real countdown and Japanese completion reward.",
          { special: 1 }),
        planned("sentence-forge", "文", "Sentence Forge · Redesign",
          "Parked for now. A plain typed sentence prompt is not rewarding enough to justify a Skill Point; this slot will be redesigned around a stronger Japanese toy later.",
          { special: 2, content: "shadowing-sprint" })
      ]
    },
    Health: {
      icon: "🌿",
      special: { id: "reflection-bloom", icon: "🌙", title: "Reflection Bloom", max: 3 },
      subtitle: "Build visible care/reflection bonuses, then unlock additional reflection content.",
      dream: { title: "Close Enough to Notice", copy: "care, warmth, touch, and noticing the body without turning it into a task" },
      content: [
        nativeContent("year-question", "📅", "365 Question Journal", 2,
          "Unlock one different reflection question for every date of the year. The same date gets the same question next year, and the answer can be spoken or typed.",
          { special: 1 }, "Open Journal", () => app.showView?.("journal")),
        planned("health-reflection-2", "◌", "Second Reflection Form · Redesign",
          "Reserved for a future reflection form that feels meaningfully different from the normal Journal instead of another generic prompt box.",
          { special: 2, content: "year-question" })
      ]
    },
    Recovery: {
      icon: "🛋️",
      special: { id: "rested-charge", icon: "☾", title: "Rested Charge", max: 3 },
      subtitle: "Let recovery create useful momentum, then unlock additional regulation activities.",
      dream: { title: "Soft Landing", copy: "couches, blankets, sleepiness, stillness, and being allowed to lean on someone" },
      content: [
        nativeContent("grounding-54321", "✋", "5–4–3–2–1 Grounding", 2,
          "Permanently unlock the guided 7-minute sensory grounding session already built into Recovery Studio.",
          { special: 1 }, "Open Recovery Studio", () => window.LifeRPGRecoveryStudio?.open?.()),
        content("recovery-toolkit", "✦", "Recovery Toolkit", 2,
          "Unlock a rotating set of short regulation prompts with a real Recovery timer and its own completion reward.",
          { special: 2, content: "grounding-54321" })
      ]
    },
    Home: {
      icon: "🏠",
      special: { id: "quick-win", icon: "✨", title: "Quick Win", max: 3 },
      subtitle: "Make practical wins pay a little better, then branch into genuinely new Home content once it earns its Skill Point cost.",
      dream: { title: "Domestic Gravity", copy: "shared-apartment mornings, kitchens, laundry, ordinary routines, and dangerous familiarity" },
      content: [
        planned("home-content-redesign", "🏠", "Home Content · Redesign",
          "The old One-Surface Reset duplicated things the Quest system already does. This branch is deliberately not purchasable until it offers genuinely new Home content.",
          { special: 1 })
      ]
    },
    Hobbies: {
      icon: "🎨",
      special: { id: "joy-spark", icon: "♡", title: "Joy Spark", max: 3 },
      subtitle: "Reward play and creativity, then unlock genuinely new things to do with that time.",
      dream: { title: "Play After Dark", copy: "games, music, playful competition, and moments that feel suspiciously like dates" },
      content: [
        planned("hobbies-content-redesign", "🎨", "Hobbies Content · Redesign",
          "The prompt/deck ideas are parked because they do not feel like a strong enough reward. This branch will stay free of Skill-Point costs until the unlock is actually exciting.",
          { special: 1 })
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
    if (migratedNow) app.saveState({ source: "talent-tree-content-cleanup-ar" });
    return state;
  }

  function state() { return ensureState(); }

  function customContentDefs(realm) {
    return (META[realm]?.content || []).filter(item => !item.native && !item.planned);
  }

  function extraSpent(realm) {
    const owned = state().unlocks?.[realm] || {};
    const contentSpent = customContentDefs(realm).reduce((sum, item) => sum + (owned[item.id] ? Number(item.cost || 0) : 0), 0);
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
    const second = secondRealContent(realm);
    if (second && !isOwned(realm, second)) return { ok: false, label: second.title };
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
    app.saveState({ source: `dream-thread-${realm.toLowerCase()}-${target}` });
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
    const id = typeof itemOrId === "string" ? itemOrId : itemOrId?.id;
    const item = typeof itemOrId === "string" ? (META[realm]?.content || []).find(entry => entry.id === id) : itemOrId;
    if (!id || !item) return false;
    if (item.native) return Boolean(v2.isContentUnlocked?.(realm, id));
    return Boolean(state().unlocks?.[realm]?.[id]);
  }

  function prereqStatus(realm, item) {
    const req = item?.requires || {};
    if (Number(req.special || 0) > 0 && Number(v2.getRank(realm, META[realm].special.id) || 0) < Number(req.special)) {
      return { ok: false, label: `${META[realm].special.title} ${roman(req.special)}` };
    }
    if (req.content) {
      const parent = (META[realm].content || []).find(entry => entry.id === req.content);
      if (!parent || !isOwned(realm, parent)) return { ok: false, label: parent?.title || "previous content unlock" };
    }
    return { ok: true, label: "" };
  }

  function purchaseContent(realm, id) {
    const item = (META[realm]?.content || []).find(entry => entry.id === id);
    if (!item || item.planned || isOwned(realm, item)) return false;

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
      app.showToast?.(`You need ${cost} ${realm} points for ${item.title}.`);
      return false;
    }

    state().unlocks[realm][item.id] = Date.now();
    app.saveState({ source: `talent-content-unlock-${realm.toLowerCase()}` });
    emitChange(realm, item.id);
    app.showToast?.(`🔓 ${item.title} unlocked · ${cost} ${realm} points.`);
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
      ...customContentDefs(realm).filter(item => isOwned(realm, item)).map(item => `${item.icon} ${item.title} · permanently unlocked`)
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
            <div class="talent-v3-content-origin"><span>↳</span><strong>Branches from ${esc(meta.special.title)} I</strong></div>
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
        <div class="talent-v3-node-foot"><em>${owned
          ? `Owned · Dreamscape cadence currently every ${cadence} day${cadence === 1 ? "" : "s"}`
          : `Path: ${esc(target === 1 ? `${meta.special.title} II + ${firstRealContent(realm)?.title || "first content unlock"}` : `${meta.special.title} III + ${secondRealContent(realm)?.title || "content path"} + Thread I`)}`}</em>${action}</div>
      </article>`;
    };

    return make(1, firstReq, `Unlock this Realm's ${meta.dream.title} dream pool. The very first Dream Thread anywhere also makes one dream available immediately.`)
      + treeLink("Thread I + deeper Realm investment")
      + make(2, secondReq, `Adds more intimate variants to the ${meta.dream.title} pool and contributes another step toward the global 1-day Dreamscape cadence.`);
  }

  function contentNode(realm, item, index) {
    if (item.planned) {
      const prereq = prereqStatus(realm, item);
      return `${index ? treeLink(item.requires?.content ? `After ${contentTitle(realm, item.requires.content)}` : `After ${META[realm].special.title}`) : ""}
        <article class="talent-v3-node talent-v3-content-node is-planned">
          <div class="talent-v3-node-top">
            <span class="talent-v3-node-icon">${item.icon}</span>
            <div><small>FUTURE CONTENT · VISIBLE PATH</small><h3>${esc(item.title)}</h3></div>
          </div>
          <p>${esc(item.copy)}</p>
          <div class="talent-v3-node-foot"><em>Planned path: ${esc(prereq.label || requirementLabel(realm, item))}</em><span class="talent-v3-owned is-later">Later</span></div>
        </article>`;
    }

    const owned = isOwned(realm, item);
    const prereq = prereqStatus(realm, item);
    const points = skills.getRealmPoints(realm);
    const cost = Number(item.cost || 1);
    const canBuy = !owned && prereq.ok && Number(points.available || 0) >= cost;
    const stateClass = owned ? "is-owned" : !prereq.ok ? "is-locked" : canBuy ? "is-ready" : "is-poor";

    const action = owned
      ? `<button class="secondary-button" type="button" data-talent-v3-open="${escAttr(realm)}|${escAttr(item.id)}">${esc(item.openLabel || "Open")}</button>`
      : `<button class="${canBuy ? "primary-button" : "secondary-button"}" type="button" data-talent-v3-content="${escAttr(realm)}|${escAttr(item.id)}" ${!prereq.ok ? "disabled" : ""}>${!prereq.ok ? `Requires ${esc(prereq.label)}` : `Unlock for ${cost} points`}</button>`;

    return `${index ? treeLink(item.requires?.content ? `Previous unlock: ${contentTitle(realm, item.requires.content)}` : `${META[realm].special.title} path`) : ""}
      <article class="talent-v3-node talent-v3-content-node ${stateClass}">
        <div class="talent-v3-node-top">
          <span class="talent-v3-node-icon">${item.icon}</span>
          <div><small>CONTENT UNLOCK · ${cost} POINT${cost === 1 ? "" : "S"} · PERMANENT</small><h3>${esc(item.title)}</h3></div>
        </div>
        <p>${esc(item.copy)}</p>
        <div class="talent-v3-node-foot"><em>${owned ? "Permanently unlocked" : `Path: ${esc(requirementLabel(realm, item))}`}</em>${action}</div>
      </article>`;
  }

  function contentTitle(realm, id) {
    return (META[realm]?.content || []).find(item => item.id === id)?.title || "previous content";
  }

  function requirementLabel(realm, item) {
    const req = item?.requires || {};
    const bits = [];
    if (req.special) bits.push(`${META[realm].special.title} ${roman(req.special)}`);
    if (req.content) bits.push(contentTitle(realm, req.content));
    return bits.join(" + ") || "Realm branch";
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
    purchaseContent,
    openContent,
    extraSpent,
    getDreamThreadRank,
    getTotalDreamThreads: totalDreamThreads,
    getDreamCadenceDays: dreamCadenceDays,
    getDreamTheme: realm => META[realm]?.dream ? { ...META[realm].dream } : null,
    purchaseDreamThread,
    focusRealm,
    refresh: renderAll
  };
})();