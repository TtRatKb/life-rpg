(() => {
  "use strict";

  if (window.__lifeRpgTalentTreeGraphV314ao) return;
  window.__lifeRpgTalentTreeGraphV314ao = true;

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  const v2 = window.LifeRPGTalentV2;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !v2?.purchase) {
    console.error("Talent Tree Paths could not initialize because Talent Trees V2 is unavailable.");
    return;
  }

  const VERSION = "0.31.4ao";
  const SCHEMA = 1;
  const REALMS = ["Work", "Knowledge", "Japanese", "Health", "Recovery", "Home", "Hobbies"];

  const META = {
    Work: {
      icon: "💼",
      special: { id: "deep-work", icon: "🎯", title: "Deep Work Bonus", max: 3 },
      subtitle: "Build from chance → momentum → deeper focus, then branch into optional work tools.",
      content: [
        content("work-debrief", "🧾", "Work Debrief", 2,
          "Unlock a short end-of-work reflection: what moved, what is next, and what can wait. It has its own modest writing rewards.",
          { special: 1 }),
        content("lesson-spark", "💡", "Lesson Spark Deck", 2,
          "Unlock a deck of concrete teaching/design prompts and launch a focused 25-minute planning block straight from the prompt.",
          { special: 2, content: "work-debrief" }),
        planned("work-focus-challenges", "◆", "Focus Challenge Deck",
          "A later branch for optional one-off focus challenges — not basic Focus features behind a paywall.",
          { special: 3, content: "lesson-spark" })
      ]
    },
    Knowledge: {
      icon: "🧠",
      special: { id: "puzzle-spark", icon: "🧩", title: "Puzzle Spark", max: 3 },
      subtitle: "Turn regular thinking into stronger puzzle rewards, then unlock new ways to think.",
      content: [
        content("decision-lens", "🔎", "Decision Lens", 2,
          "Unlock a structured reflection for a real decision: options, evidence, uncertainty and the next reversible step.",
          { special: 1 }),
        planned("logic-expansion", "◇", "Logic Expansion",
          "This is where new logic games such as Slitherlink or Nurikabe will become real purchasable unlocks once the games exist.",
          { special: 2, content: "decision-lens" })
      ]
    },
    Japanese: {
      icon: "🌸",
      special: { id: "immersion-echo", icon: "🎧", title: "Immersion Echo", max: 3 },
      subtitle: "Reward contact with Japanese, then open extra production/immersion toys rather than hiding the basics.",
      content: [
        content("sentence-forge", "文", "Sentence Forge", 2,
          "Unlock a tiny Japanese production journal with rotating prompts. Write one or a few real sentences; longer attempts earn a few extra tiers.",
          { special: 1 }),
        planned("shadowing-sprint", "🎙️", "Shadowing Sprint",
          "A future focused shadowing activity using short Japanese audio/text. It stays unbuyable until the activity itself is ready.",
          { special: 2, content: "sentence-forge" })
      ]
    },
    Health: {
      icon: "🌿",
      special: { id: "reflection-bloom", icon: "🌙", title: "Reflection Bloom", max: 3 },
      subtitle: "Build visible care/reflection bonuses, then unlock additional reflection content.",
      content: [
        nativeContent("thought-untangler", "🧶", "Thought Untangler", 2,
          "Permanently unlock the fourth Journal reflection already built into Life RPG.",
          { special: 1 }, "Open Journal", () => app.showView?.("journal")),
        planned("body-signals", "◌", "Body Signals",
          "A later gentle body/energy noticing tool — information, not a score and not a fitness obligation.",
          { special: 2, content: "thought-untangler" })
      ]
    },
    Recovery: {
      icon: "🛋️",
      special: { id: "rested-charge", icon: "☾", title: "Rested Charge", max: 3 },
      subtitle: "Let recovery create useful momentum, then unlock additional regulation activities.",
      content: [
        nativeContent("grounding-54321", "✋", "5–4–3–2–1 Grounding", 2,
          "Permanently unlock the guided 7-minute sensory grounding session already built into Recovery Studio.",
          { special: 1 }, "Open Recovery Studio", () => window.LifeRPGRecoveryStudio?.open?.()),
        planned("recovery-toolkit", "✦", "Recovery Toolkit",
          "A later extra recovery activity slot. It will only become purchasable once the new session genuinely exists.",
          { special: 2, content: "grounding-54321" })
      ]
    },
    Home: {
      icon: "🏠",
      special: { id: "quick-win", icon: "✨", title: "Quick Win", max: 3 },
      subtitle: "Make practical wins pay a little better, then unlock optional small reset activities.",
      content: [
        content("one-surface-reset", "🧺", "One-Surface Reset", 2,
          "Unlock a small prompt deck for a 7-minute household reset. It launches a real Home timer and logs the actual time.",
          { special: 1 }),
        planned("home-reset-deck", "▦", "Home Reset Deck",
          "A later larger deck of tiny practical reset activities with more variety than the first one-surface session.",
          { special: 2, content: "one-surface-reset" })
      ]
    },
    Hobbies: {
      icon: "🎨",
      special: { id: "joy-spark", icon: "♡", title: "Joy Spark", max: 3 },
      subtitle: "Reward play and creativity, then unlock genuinely new things to do with that time.",
      content: [
        content("creative-prompt-deck", "✦", "Creative Prompt Deck", 2,
          "Unlock rotating low-pressure creative prompts and a 15-minute creative timer. The point is to make something, not to optimize it.",
          { special: 1 }),
        content("idea-garden", "🌱", "Idea Garden", 2,
          "Unlock a flexible creative journal for ideas, fragments, concepts and things you might want to make later.",
          { special: 2, content: "creative-prompt-deck" }),
        planned("creative-dice", "🎲", "Creative Dice",
          "A later playful generator that combines medium, mood and constraint into tiny creative experiments.",
          { special: 3, content: "idea-garden" })
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

  function planned(id, icon, title, copy, requires = {}) {
    return { id, icon, title, cost: 0, copy, requires, native: false, planned: true };
  }

  function init() {
    ensureState();
    wrapRealmPointAccounting();
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
      root.talentTreeExpansion = { schemaVersion: SCHEMA, version: VERSION, unlocks: {} };
    }
    const state = root.talentTreeExpansion;
    state.schemaVersion = SCHEMA;
    state.version = VERSION;
    state.unlocks ||= {};
    for (const realm of REALMS) {
      if (!state.unlocks[realm] || typeof state.unlocks[realm] !== "object") state.unlocks[realm] = {};
    }
    return state;
  }

  function state() { return ensureState(); }

  function customContentDefs(realm) {
    return (META[realm]?.content || []).filter(item => !item.native && !item.planned);
  }

  function extraSpent(realm) {
    const owned = state().unlocks?.[realm] || {};
    return customContentDefs(realm).reduce((sum, item) => sum + (owned[item.id] ? Number(item.cost || 0) : 0), 0);
  }

  function wrapRealmPointAccounting() {
    if (!skills.__talentTreeBaseGetRealmPointsV314ao) {
      skills.__talentTreeBaseGetRealmPointsV314ao = skills.getRealmPoints.bind(skills);
    }
    const base = skills.__talentTreeBaseGetRealmPointsV314ao;
    if (skills.__talentTreePointWrapperV314ao) return;
    skills.__talentTreePointWrapperV314ao = true;
    skills.getRealmPoints = realm => {
      const info = base(realm);
      const extra = extraSpent(realm);
      return {
        ...info,
        spent: Math.max(0, Number(info.spent || 0)) + extra,
        available: Math.max(0, Number(info.available || 0) - extra)
      };
    };
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
    if (item.native) {
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
    focusRealm,
    refresh: renderAll
  };
})();