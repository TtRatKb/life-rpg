(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints) {
    console.error("Life RPG Knowledge Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4ad";
  const SCHEMA = 1;
  const REALM = "Knowledge";
  const KNOWLEDGE_SKILLS = [
    "logical-pattern-reasoning",
    "quantitative-reasoning",
    "memory-recall",
    "language-expression",
    "learning-inquiry"
  ];

  const NODES = [
    node("study-compass", "Study Compass", "🧭", 1, 0, "core", [], "A one-tap Knowledge practice dock: Study Focus, puzzles, Memory Garden and Lexicon stay close without moving their original homes."),
    node("pattern-lens", "Pattern Lens", "◈", 1, 1, "logic", ["study-compass"], "See your recent logical and quantitative practice side by side instead of guessing what has had attention."),
    node("recall-radar", "Recall Radar", "⌁", 1, 1, "recall", ["study-compass"], "See recent Memory & Recall and Language & Expression practice, plus which one has been quieter lately."),
    node("curiosity-spark", "Curiosity Spark", "✦", 1, 1, "inquiry", ["study-compass"], "Capture questions worth coming back to in a small Curiosity Queue. Capturing is free; it is not treated as learning yet."),
    node("puzzle-forge", "Puzzle Forge", "⚙", 2, 2, "logic", ["pattern-lens"], "Adds a smart puzzle launcher that routes toward the quieter reasoning skill. The first puzzle practice after unlock each day also adds +1 Knowledge Realm XP."),
    node("memory-palace", "Memory Palace", "🏛", 2, 2, "recall", ["recall-radar"], "Adds a smart recall route between Memory Garden and Lexicon. The first recall/language practice after unlock each day adds +1 Knowledge Realm XP."),
    node("research-trail", "Research Trail", "🔎", 2, 2, "inquiry", ["curiosity-spark"], "Turn a saved curiosity into a 15- or 25-minute Study Focus block, keep a short finding, and mark it explored."),
    node("polymath", "Polymath", "✺", 4, 3, "core", ["puzzle-forge", "memory-palace", "research-trail"], "When three different Knowledge skills naturally show up on the same day, add +3 Knowledge Realm XP once. No streak, quota or penalty if it does not happen.")
  ];

  const NODE_BY_ID = Object.fromEntries(NODES.map(item => [item.id, item]));
  let applyingBonus = false;
  let renderTimer = null;

  init();

  function node(id, title, icon, cost, tier, branch, requires, effect) {
    return { id, title, icon, cost, tier, branch, requires, effect };
  }

  function init() {
    const changed = ensureState();
    injectTree();
    bind();
    if (changed) app.saveState({ source: "knowledge-tree-init" });
    render();
    scheduleBonusPass();
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.knowledgeTalentTree || typeof root.knowledgeTalentTree !== "object" || Array.isArray(root.knowledgeTalentTree)) {
      root.knowledgeTalentTree = defaults();
      changed = true;
    }
    const model = root.knowledgeTalentTree;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    if (!model.purchases || typeof model.purchases !== "object" || Array.isArray(model.purchases)) { model.purchases = {}; changed = true; }
    if (!Array.isArray(model.curiosities)) { model.curiosities = []; changed = true; }
    if (!model.bonusClaims || typeof model.bonusClaims !== "object" || Array.isArray(model.bonusClaims)) { model.bonusClaims = {}; changed = true; }
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) { model.migrations = {}; changed = true; }
    model.version = VERSION;

    for (const id of Object.keys(model.purchases)) {
      if (!NODE_BY_ID[id] || !Number.isFinite(Number(model.purchases[id]))) {
        delete model.purchases[id];
        changed = true;
      }
    }
    model.curiosities = model.curiosities
      .filter(item => item && typeof item === "object" && String(item.text || "").trim())
      .map(item => ({
        id: String(item.id || makeId("curiosity")),
        text: String(item.text || "").trim().slice(0, 180),
        note: String(item.note || "").trim().slice(0, 1200),
        createdAt: Math.max(0, Number(item.createdAt || Date.now())),
        updatedAt: Math.max(0, Number(item.updatedAt || item.createdAt || Date.now())),
        exploredAt: item.exploredAt ? Math.max(0, Number(item.exploredAt)) : null
      }))
      .slice(-80);

    if (!root.skills || typeof root.skills !== "object") root.skills = {};
    if (!root.skills.spentPointsByRealm || typeof root.skills.spentPointsByRealm !== "object") root.skills.spentPointsByRealm = {};
    const spent = purchaseCostTotal(model.purchases);
    if (Number(root.skills.spentPointsByRealm[REALM] || 0) !== spent) {
      root.skills.spentPointsByRealm[REALM] = spent;
      changed = true;
    }
    model.migrations.initialTreeV1 = true;
    return changed;
  }

  function defaults() {
    return { schemaVersion: SCHEMA, version: VERSION, purchases: {}, curiosities: [], bonusClaims: {}, migrations: { initialTreeV1: true } };
  }

  function state() { ensureState(); return app.getState().knowledgeTalentTree; }
  function purchased(id) { return Boolean(state().purchases[id]); }
  function purchaseTime(id) { return Math.max(0, Number(state().purchases[id] || 0)); }
  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce((sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0), 0);
  }

  function canPurchase(item) {
    if (!item || purchased(item.id)) return false;
    if (!item.requires.every(purchased)) return false;
    return skills.getRealmPoints(REALM).available >= item.cost;
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("knowledgeTalentTree")) return;
    const realmGrid = document.getElementById("skillsRealmGrid");
    const section = document.createElement("section");
    section.id = "knowledgeTalentTree";
    section.className = "panel knowledge-tree-v314ad";
    section.innerHTML = `
      <div class="knowledge-tree-head-v314ad">
        <div><p class="eyebrow">KNOWLEDGE · TALENT TREE</p><h2>Choose what your Knowledge growth unlocks.</h2><p>Points come from your Knowledge skills. Existing features stay available where they already live; talents add shortcuts, insight and small optional bonuses.</p></div>
        <div id="knowledgeTreePointBank" class="knowledge-tree-bank-v314ad"></div>
      </div>
      <div id="knowledgeTreeNodes" class="knowledge-tree-map-v314ad"></div>
      <div id="knowledgeTalentTools" class="knowledge-tools-v314ad"></div>
      <div class="knowledge-tree-footer-v314ad"><span>↻ Free respec. Past rewards remain earned, and respec never re-pays the same bonus.</span><button class="text-button" data-knowledge-tree-reset type="button">Reset Knowledge tree</button></div>`;
    if (realmGrid) realmGrid.insertAdjacentElement("beforebegin", section);
    else skillsView.appendChild(section);
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-knowledge-talent-buy]");
      if (buy) { event.preventDefault(); purchaseNode(buy.dataset.knowledgeTalentBuy); return; }

      const reset = event.target.closest?.("[data-knowledge-tree-reset]");
      if (reset) { event.preventDefault(); resetTree(); return; }

      const study = event.target.closest?.("[data-knowledge-study-minutes]");
      if (study) { event.preventDefault(); startStudy("Knowledge Study", Number(study.dataset.knowledgeStudyMinutes || 25)); return; }

      const smartPuzzle = event.target.closest?.("[data-knowledge-smart-puzzle]");
      if (smartPuzzle) { event.preventDefault(); launchSmartPuzzle(); return; }

      const recallRoute = event.target.closest?.("[data-knowledge-recall-route]");
      if (recallRoute) { event.preventDefault(); launchRecallRoute(); return; }

      const curiosityAdd = event.target.closest?.("[data-curiosity-add]");
      if (curiosityAdd) { event.preventDefault(); addCuriosity(); return; }

      const curiosityRemove = event.target.closest?.("[data-curiosity-remove]");
      if (curiosityRemove) { event.preventDefault(); removeCuriosity(curiosityRemove.dataset.curiosityRemove); return; }

      const curiosityStart = event.target.closest?.("[data-curiosity-start]");
      if (curiosityStart) {
        event.preventDefault();
        startCuriosity(curiosityStart.dataset.curiosityStart, Number(curiosityStart.dataset.curiosityMinutes || 15));
        return;
      }

      const curiositySave = event.target.closest?.("[data-curiosity-save]");
      if (curiositySave) { event.preventDefault(); saveCuriosityNote(curiositySave.dataset.curiositySave); return; }

      const curiosityDone = event.target.closest?.("[data-curiosity-explored]");
      if (curiosityDone) { event.preventDefault(); markCuriosityExplored(curiosityDone.dataset.curiosityExplored); }
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.shiftKey || event.target?.id !== "knowledgeCuriosityInput") return;
      event.preventDefault();
      addCuriosity();
    });

    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", () => {
      scheduleRender();
      scheduleBonusPass();
    });
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 80);
  }

  function purchaseNode(id) {
    const item = NODE_BY_ID[id];
    if (!item || purchased(id)) return;
    if (!item.requires.every(purchased)) {
      app.showToast?.("Unlock the connected talent first.");
      return;
    }
    const points = skills.getRealmPoints(REALM);
    if (points.available < item.cost) {
      app.showToast?.(`You need ${item.cost} Knowledge point${item.cost === 1 ? "" : "s"} for ${item.title}.`);
      return;
    }
    const model = state();
    model.purchases[id] = Date.now();
    app.getState().skills.spentPointsByRealm[REALM] = purchaseCostTotal(model.purchases);
    app.saveState({ source: `knowledge-talent-${id}` });
    app.renderAll?.();
    render();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
    scheduleBonusPass();
  }

  function resetTree() {
    const count = Object.keys(state().purchases).length;
    if (!count) { app.showToast?.("The Knowledge tree is already reset."); return; }
    if (!window.confirm("Reset the Knowledge Talent Tree? All spent Knowledge points become available again. Past earned bonuses stay earned.")) return;
    state().purchases = {};
    app.getState().skills.spentPointsByRealm[REALM] = 0;
    app.saveState({ source: "knowledge-tree-respec" });
    app.renderAll?.();
    render();
    app.showToast?.("Knowledge tree reset · all points refunded.");
  }

  function render() {
    injectTree();
    const bank = document.getElementById("knowledgeTreePointBank");
    const nodes = document.getElementById("knowledgeTreeNodes");
    const tools = document.getElementById("knowledgeTalentTools");
    if (!bank || !nodes || !tools) return;

    ensureState();
    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `<small>KNOWLEDGE POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span>`;

    nodes.innerHTML = [0, 1, 2, 3].map(tier => {
      const tierNodes = NODES.filter(item => item.tier === tier);
      return `<div class="knowledge-tree-tier-v314ad tier-${tier}">${tierNodes.map(nodeMarkup).join("")}</div>`;
    }).join("");

    tools.innerHTML = renderTools();
  }

  function nodeMarkup(item) {
    const isBought = purchased(item.id);
    const prereqsMet = item.requires.every(purchased);
    const affordable = skills.getRealmPoints(REALM).available >= item.cost;
    const status = isBought ? "bought" : prereqsMet ? (affordable ? "available" : "short") : "locked";
    const prereqText = item.requires.length ? item.requires.map(id => NODE_BY_ID[id]?.title).filter(Boolean).join(" + ") : "Tree root";
    const action = isBought
      ? `<button type="button" disabled>Unlocked ✓</button>`
      : `<button type="button" data-knowledge-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`;
    return `<article class="knowledge-node-v314ad branch-${escAttr(item.branch)} is-${status}">
      <div class="knowledge-node-icon-v314ad">${item.icon}</div>
      <div class="knowledge-node-copy-v314ad"><small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small><h3>${esc(item.title)}</h3><p>${esc(item.effect)}</p><em>${esc(prereqText)}</em></div>
      ${action}
    </article>`;
  }

  function renderTools() {
    if (!purchased("study-compass")) {
      return `<div class="knowledge-tools-locked-v314ad"><span>🧭</span><div><strong>Study Compass unlocks the first active tool.</strong><p>The tree never removes anything you already use. This space only fills with extra utilities you choose.</p></div></div>`;
    }

    const blocks = [practiceDockMarkup()];
    if (purchased("pattern-lens")) blocks.push(patternLensMarkup());
    if (purchased("recall-radar")) blocks.push(recallRadarMarkup());
    if (purchased("curiosity-spark")) blocks.push(curiosityMarkup());
    if (purchased("polymath")) blocks.push(polymathMarkup());
    return blocks.join("");
  }

  function practiceDockMarkup() {
    return `<section class="knowledge-tool-card-v314ad knowledge-practice-dock-v314ad">
      <div class="knowledge-tool-heading-v314ad"><div><small>STUDY COMPASS</small><h3>Practice dock</h3><p>Shortcuts only — the original Training Grounds and Focus tools stay exactly where they are.</p></div><span>🧭</span></div>
      <div class="knowledge-practice-actions-v314ad">
        <button class="primary-button" type="button" data-knowledge-study-minutes="25">◷ 25m Study Focus</button>
        <button class="secondary-button" type="button" data-sudoku-open>🧩 Sudoku</button>
        <button class="secondary-button" type="button" data-nonogram-open>◈ Nonogram</button>
        <button class="secondary-button" type="button" data-number-sense-open>🔢 Number Sense</button>
        <button class="secondary-button" type="button" data-memory-garden-open>🧠 Memory Garden</button>
        <button class="secondary-button" type="button" data-lexicon-lab-open>⌗ Lexicon Lab</button>
        ${purchased("puzzle-forge") ? `<button class="knowledge-special-action-v314ad" type="button" data-knowledge-smart-puzzle>⚙ Smart Puzzle</button>` : ""}
        ${purchased("memory-palace") ? `<button class="knowledge-special-action-v314ad" type="button" data-knowledge-recall-route>🏛 Recall Route</button>` : ""}
      </div>
    </section>`;
  }

  function patternLensMarkup() {
    const logic = recentSkillXp("logical-pattern-reasoning", 7);
    const quantitative = recentSkillXp("quantitative-reasoning", 7);
    const quiet = logic <= quantitative ? "Logical & Pattern Reasoning" : "Quantitative Reasoning";
    return `<section class="knowledge-tool-card-v314ad"><div class="knowledge-tool-heading-v314ad"><div><small>PATTERN LENS · LAST 7 DAYS</small><h3>Reasoning balance</h3><p>Observed practice only. Quieter does not mean neglected or overdue.</p></div><span>◈</span></div><div class="knowledge-mini-stats-v314ad"><article><strong>${fmt(logic)}</strong><span>Logical & Pattern XP</span></article><article><strong>${fmt(quantitative)}</strong><span>Quantitative XP</span></article></div><p class="knowledge-observation-v314ad">Quieter lately: <strong>${esc(quiet)}</strong>. This is a suggestion signal, never a requirement.</p></section>`;
  }

  function recallRadarMarkup() {
    const memory = recentSkillXp("memory-recall", 7);
    const language = recentSkillXp("language-expression", 7);
    const quiet = memory <= language ? "Memory & Recall" : "Language & Expression";
    const last = lastEventForSkills(["memory-recall", "language-expression"]);
    return `<section class="knowledge-tool-card-v314ad"><div class="knowledge-tool-heading-v314ad"><div><small>RECALL RADAR · LAST 7 DAYS</small><h3>Recall & language</h3><p>See what actually happened instead of relying on the feeling that you “should have done more.”</p></div><span>⌁</span></div><div class="knowledge-mini-stats-v314ad"><article><strong>${fmt(memory)}</strong><span>Memory & Recall XP</span></article><article><strong>${fmt(language)}</strong><span>Language & Expression XP</span></article></div><p class="knowledge-observation-v314ad">Quieter lately: <strong>${esc(quiet)}</strong>${last ? ` · last related practice ${esc(humanAgo(last.at))}` : ""}.</p></section>`;
  }

  function curiosityMarkup() {
    const items = [...state().curiosities].sort((a, b) => Number(b.updatedAt || b.createdAt) - Number(a.updatedAt || a.createdAt));
    const open = items.filter(item => !item.exploredAt);
    const explored = items.filter(item => item.exploredAt).slice(0, 4);
    return `<section class="knowledge-tool-card-v314ad knowledge-curiosity-v314ad"><div class="knowledge-tool-heading-v314ad"><div><small>CURIOSITY SPARK</small><h3>Curiosity Queue</h3><p>Capture first. No XP is awarded until you actually study, read or otherwise do something with the question.</p></div><span>✦</span></div>
      <div class="knowledge-curiosity-add-v314ad"><input id="knowledgeCuriosityInput" maxlength="180" placeholder="Something I want to understand…" /><button class="primary-button" type="button" data-curiosity-add>Add</button></div>
      <div class="knowledge-curiosity-list-v314ad">${open.length ? open.map(curiosityRow).join("") : `<div class="knowledge-curiosity-empty-v314ad">Nothing waiting. A blank queue is allowed.</div>`}</div>
      ${explored.length ? `<details class="knowledge-curiosity-archive-v314ad"><summary>${explored.length} recent explored curiosities</summary>${explored.map(curiosityRow).join("")}</details>` : ""}
    </section>`;
  }

  function curiosityRow(item) {
    const research = purchased("research-trail");
    return `<article class="knowledge-curiosity-row-v314ad ${item.exploredAt ? "is-explored" : ""}" data-curiosity-id="${escAttr(item.id)}"><div class="knowledge-curiosity-title-v314ad"><span>${item.exploredAt ? "✓" : "?"}</span><strong>${esc(item.text)}</strong><button class="text-button" type="button" data-curiosity-remove="${escAttr(item.id)}">Remove</button></div>${research ? `<textarea data-curiosity-note="${escAttr(item.id)}" rows="2" maxlength="1200" placeholder="Short finding / note…">${esc(item.note || "")}</textarea><div class="knowledge-curiosity-actions-v314ad"><button class="secondary-button" type="button" data-curiosity-save="${escAttr(item.id)}">Save note</button>${item.exploredAt ? "" : `<button class="secondary-button" type="button" data-curiosity-start="${escAttr(item.id)}" data-curiosity-minutes="15">15m dive</button><button class="secondary-button" type="button" data-curiosity-start="${escAttr(item.id)}" data-curiosity-minutes="25">25m dive</button><button class="primary-button" type="button" data-curiosity-explored="${escAttr(item.id)}">Mark explored</button>`}</div>` : `<small>Research Trail can turn this into a timed Study Focus block later.</small>`}</article>`;
  }

  function polymathMarkup() {
    const totals = KNOWLEDGE_SKILLS.map(id => ({ id, xp: recentSkillXp(id, 7), meta: skills.getSkill(id) })).sort((a, b) => b.xp - a.xp);
    const today = knowledgeSkillsOnDate(localDateKey(new Date()), purchaseTime("polymath"));
    return `<section class="knowledge-tool-card-v314ad knowledge-polymath-v314ad"><div class="knowledge-tool-heading-v314ad"><div><small>POLYMATH · LAST 7 DAYS</small><h3>Knowledge constellation</h3><p>Different kinds of thinking can coexist. The breadth bonus only appears when the variety happens naturally.</p></div><span>✺</span></div><div class="knowledge-polymath-grid-v314ad">${totals.map(item => `<article><span>${item.meta?.icon || "✦"}</span><strong>${fmt(item.xp)}</strong><small>${esc(item.meta?.label || item.id)}</small></article>`).join("")}</div><p class="knowledge-observation-v314ad">Today after Polymath unlock: <strong>${today.size}/3 different Knowledge skills</strong>${today.size >= 3 ? " · breadth bonus earned ✓" : " · nothing to chase"}.</p></section>`;
  }

  function addCuriosity() {
    if (!purchased("curiosity-spark")) return;
    const input = document.getElementById("knowledgeCuriosityInput");
    const text = String(input?.value || "").trim();
    if (!text) return;
    state().curiosities.push({ id: makeId("curiosity"), text: text.slice(0, 180), note: "", createdAt: Date.now(), updatedAt: Date.now(), exploredAt: null });
    state().curiosities = state().curiosities.slice(-80);
    if (input) input.value = "";
    app.saveState({ source: "knowledge-curiosity-add" });
    render();
  }

  function removeCuriosity(id) {
    state().curiosities = state().curiosities.filter(item => item.id !== id);
    app.saveState({ source: "knowledge-curiosity-remove" });
    render();
  }

  function saveCuriosityNote(id) {
    const item = state().curiosities.find(row => row.id === id);
    const textarea = document.querySelector(`[data-curiosity-note="${cssEscape(id)}"]`);
    if (!item || !textarea) return;
    item.note = String(textarea.value || "").trim().slice(0, 1200);
    item.updatedAt = Date.now();
    app.saveState({ source: "knowledge-curiosity-note" });
    app.showToast?.("Research note saved.");
    render();
  }

  function markCuriosityExplored(id) {
    const item = state().curiosities.find(row => row.id === id);
    if (!item) return;
    const textarea = document.querySelector(`[data-curiosity-note="${cssEscape(id)}"]`);
    if (textarea) item.note = String(textarea.value || "").trim().slice(0, 1200);
    item.exploredAt = Date.now();
    item.updatedAt = item.exploredAt;
    app.saveState({ source: "knowledge-curiosity-explored" });
    render();
    app.showToast?.("Curiosity marked explored · no extra reward for the checkbox itself.");
  }

  function startCuriosity(id, minutes) {
    if (!purchased("research-trail")) return;
    const item = state().curiosities.find(row => row.id === id);
    if (!item) return;
    startStudy(`Curiosity · ${item.text}`, minutes);
  }

  function startStudy(label, minutes) {
    const time = window.LifeRPGTime;
    if (!time?.startFocus) { app.showToast?.("Focus timer is not ready yet."); return; }
    if (time.getActive?.()) { app.showToast?.("Another timer is already running."); return; }
    const safe = Math.max(5, Math.min(120, Number(minutes || 25)));
    const result = time.startFocus({ categoryId: "focus", subcategory: "Study", label, minutes: safe, breakMinutes: safe >= 25 ? 5 : 0 });
    if (result !== false) {
      app.showView?.("rhythm");
      app.showToast?.(`🔎 ${safe}m Study Focus started.`);
    }
  }

  function launchSmartPuzzle() {
    if (!purchased("puzzle-forge")) return;
    const logic = recentSkillXp("logical-pattern-reasoning", 7);
    const quantitative = recentSkillXp("quantitative-reasoning", 7);
    if (quantitative <= logic) { delegatedLaunch("number-sense-open"); return; }
    const root = app.getState();
    const sudokuCount = Number(root.sudoku?.journey?.completedLevels?.length || 0);
    const nonogramCount = Number(root.nonogram?.journey?.completedLevels?.length || 0);
    delegatedLaunch(nonogramCount <= sudokuCount ? "nonogram-open" : "sudoku-open");
  }

  function launchRecallRoute() {
    if (!purchased("memory-palace")) return;
    const memory = recentSkillXp("memory-recall", 7);
    const language = recentSkillXp("language-expression", 7);
    delegatedLaunch(memory <= language ? "memory-garden-open" : "lexicon-lab-open");
  }

  function delegatedLaunch(dataName) {
    const button = document.createElement("button");
    button.type = "button";
    button.style.display = "none";
    button.setAttribute(`data-${dataName}`, "true");
    document.body.appendChild(button);
    button.click();
    button.remove();
  }

  function recentSkillXp(skillId, days = 7) {
    const cutoff = startOfLocalDay(new Date());
    cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
    return round2((app.getState().skills?.events || []).reduce((sum, event) => {
      const at = timestamp(event?.at);
      return event?.skillId === skillId && at >= cutoff.getTime() ? sum + Number(event.xp || 0) : sum;
    }, 0));
  }

  function lastEventForSkills(ids) {
    const set = new Set(ids);
    return [...(app.getState().skills?.events || [])].filter(event => set.has(event?.skillId)).sort((a, b) => timestamp(b?.at) - timestamp(a?.at))[0] || null;
  }

  function knowledgeSkillsOnDate(date, afterMs = 0) {
    const set = new Set();
    (app.getState().skills?.events || []).forEach(event => {
      const at = timestamp(event?.at);
      if (at < afterMs || localDateKey(new Date(at || 0)) !== date || !KNOWLEDGE_SKILLS.includes(event?.skillId)) return;
      set.add(event.skillId);
    });
    return set;
  }

  function scheduleBonusPass() {
    if (applyingBonus) return;
    window.setTimeout(applyTalentBonuses, 160);
  }

  function applyTalentBonuses() {
    if (applyingBonus) return;
    applyingBonus = true;
    try {
      ensureState();
      const skillEvents = app.getState().skills?.events || [];
      if (!skillEvents.length) return;

      if (purchased("puzzle-forge")) {
        grantFirstDailyBonus("puzzle-forge", 1, event => ["sudoku", "sudoku-replay", "nonogram", "nonogram-replay", "number-sense", "number-sense-replay"].includes(event.source));
      }
      if (purchased("memory-palace")) {
        grantFirstDailyBonus("memory-palace", 1, event => ["memory-garden", "memory-garden-replay", "lexicon-calibration", "lexicon-daily-word", "lexicon-crossword"].includes(event.source));
      }
      if (purchased("polymath")) grantPolymathBonuses();
    } finally {
      applyingBonus = false;
    }
  }

  function grantFirstDailyBonus(nodeId, realmXp, predicate) {
    const unlockedAt = purchaseTime(nodeId);
    if (!unlockedAt) return;
    const dates = new Set();
    (app.getState().skills?.events || []).forEach(event => {
      const at = timestamp(event?.at);
      if (at < unlockedAt || !predicate(event)) return;
      dates.add(localDateKey(new Date(at)));
    });
    [...dates].sort().forEach(date => grantRealmBonus(`${nodeId}:${date}`, NODE_BY_ID[nodeId].title, realmXp, date));
  }

  function grantPolymathBonuses() {
    const unlockedAt = purchaseTime("polymath");
    if (!unlockedAt) return;
    const dates = new Set();
    (app.getState().skills?.events || []).forEach(event => {
      const at = timestamp(event?.at);
      if (at >= unlockedAt && KNOWLEDGE_SKILLS.includes(event?.skillId)) dates.add(localDateKey(new Date(at)));
    });
    [...dates].sort().forEach(date => {
      if (knowledgeSkillsOnDate(date, unlockedAt).size >= 3) grantRealmBonus(`polymath:${date}`, "Polymath breadth", 3, date);
    });
  }

  function grantRealmBonus(sourceId, label, amount, date) {
    const ledger = app.getState().rewardLedger?.events || [];
    if (ledger.some(event => event?.source === "knowledge-talent-bonus" && event?.sourceId === sourceId)) return;
    const reward = app.awardActivity?.({
      source: "knowledge-talent-bonus",
      sourceId,
      label,
      realm: REALM,
      capability: "knowledge",
      xp: 0,
      realmXP: amount,
      statXP: 0,
      coins: 0,
      storyEnergyBase: 0,
      progressionRelevant: false,
      at: `${date}T23:50:00`,
      metadata: { talentTree: "knowledge", realmXPBonus: amount }
    });
    if (!reward) return;
    state().bonusClaims[sourceId] = reward.eventId || true;
    app.saveState({ source: "knowledge-talent-bonus" });
    if (date === localDateKey(new Date())) app.showToast?.(`✦ ${label} · +${amount} Knowledge Realm XP`);
  }

  function humanAgo(value) {
    const ms = Math.max(0, Date.now() - timestamp(value));
    const minutes = Math.floor(ms / 60000);
    if (minutes < 2) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function localDateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function startOfLocalDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function timestamp(value) { const n = typeof value === "number" ? value : new Date(value || 0).getTime(); return Number.isFinite(n) && n > 0 ? n : 0; }
  function round2(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function fmt(value) { const n = round2(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function makeId(prefix) { try { return `${prefix}-${crypto.randomUUID()}`; } catch { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; } }
  function cssEscape(value) { return window.CSS?.escape ? window.CSS.escape(String(value || "")) : String(value || "").replace(/["\\]/g, "\\$&"); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGKnowledgeTree = {
    version: VERSION,
    registry: NODES.map(item => ({ ...item, requires: [...item.requires] })),
    isUnlocked: id => purchased(id),
    getState: () => JSON.parse(JSON.stringify(state())),
    open: () => { app.showView?.("skills"); render(); document.getElementById("knowledgeTalentTree")?.scrollIntoView({ behavior: "smooth", block: "start" }); },
    reset: resetTree
  };
})();
