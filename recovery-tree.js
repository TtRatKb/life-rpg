(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !skills?.registerTalentTree) {
    console.error("Life RPG Recovery Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4ag1";
  const SCHEMA = 1;
  const REALM = "Recovery";
  const SKILL_ID = "recovery-regulation";

  const SESSION_META = {
    breathing5: { icon: "◯", title: "5-Minute Breathing", minutes: 5 },
    breathing10: { icon: "◯", title: "10-Minute Breathing Reset", minutes: 10 },
    box5: { icon: "□", title: "Box Breathing", minutes: 5 },
    bodyScan10: { icon: "◇", title: "10-Minute Body Scan", minutes: 10 },
    lieDown15: { icon: "☾", title: "15-Minute Lie Down", minutes: 15 },
    neckShoulders7: { icon: "🌿", title: "Gentle Neck & Shoulder Release", minutes: 7 }
  };

  const NODES = [
    node("recovery-compass", "Recovery Compass", "🛋️", 1, 0, "core", [],
      "Adds one quiet Recovery dock: your current Recovery skill, recent practice and a direct route to Recovery Studio."),
    node("breath-anchor", "Breath Anchor", "◯", 1, 1, "breath", ["recovery-compass"],
      "Adds one-tap starts for gentle breathing and box breathing. The original Recovery Studio stays fully available."),
    node("quiet-harbor", "Quiet Harbor", "☾", 1, 1, "rest", ["recovery-compass"],
      "Adds one-tap starts for a body scan or protected lie-down when active effort is not what the day needs."),
    node("pattern-lantern", "Pattern Lantern", "◇", 1, 1, "insight", ["recovery-compass"],
      "Shows recent Recovery practice as neutral history: minutes, practice days, last session and most-used session."),
    node("easy-entry", "Easy Entry", "✦", 2, 2, "breath", ["breath-anchor", "quiet-harbor"],
      "Adds a smart start using Recovery Studio's existing check-in-aware suggestion. It is a shortcut, never an instruction."),
    node("protected-pause", "Protected Pause", "❀", 2, 2, "rest", ["quiet-harbor"],
      "The first Recovery & Regulation practice after unlock each day adds +1 Recovery Realm XP. No streak and no penalty for blank days."),
    node("return-path", "Return Path", "↻", 2, 2, "insight", ["pattern-lantern"],
      "Keeps your last completed Recovery Studio session one tap away so returning does not require choosing from the full library."),
    node("sanctuary", "Sanctuary", "✺", 4, 3, "core", ["easy-entry", "protected-pause", "return-path"],
      "Upgrades the first Recovery & Regulation practice of the day by another +1 Recovery Realm XP, for +2 total with Protected Pause. Still only once per day.")
  ];

  const NODE_BY_ID = Object.fromEntries(NODES.map(item => [item.id, item]));
  let renderTimer = null;
  let applyingBonus = false;

  init();

  function node(id, title, icon, cost, tier, branch, requires, effect) {
    return { id, title, icon, cost, tier, branch, requires, effect };
  }

  function init() {
    const changed = ensureState();
    injectTree();
    bind();
    if (changed) app.saveState({ source: "recovery-tree-init" });
    render();
    scheduleBonusPass();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      purchases: {},
      bonusClaims: {},
      migrations: { initialRecoveryTreeV1: true }
    };
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.recoveryTalentTree || typeof root.recoveryTalentTree !== "object" || Array.isArray(root.recoveryTalentTree)) {
      root.recoveryTalentTree = defaults();
      changed = true;
    }
    const model = root.recoveryTalentTree;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    model.version = VERSION;
    if (!model.purchases || typeof model.purchases !== "object" || Array.isArray(model.purchases)) { model.purchases = {}; changed = true; }
    if (!model.bonusClaims || typeof model.bonusClaims !== "object" || Array.isArray(model.bonusClaims)) { model.bonusClaims = {}; changed = true; }
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) { model.migrations = {}; changed = true; }
    model.migrations.initialRecoveryTreeV1 = true;

    Object.keys(model.purchases).forEach(id => {
      if (!NODE_BY_ID[id] || !Number.isFinite(Number(model.purchases[id]))) {
        delete model.purchases[id];
        changed = true;
      }
    });

    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    const spent = purchaseCostTotal(model.purchases);
    if (Number(root.skills.spentPointsByRealm[REALM] || 0) !== spent) {
      root.skills.spentPointsByRealm[REALM] = spent;
      changed = true;
    }
    return changed;
  }

  function state() { ensureState(); return app.getState().recoveryTalentTree; }
  function purchased(id) { return Boolean(state().purchases[id]); }
  function purchaseTime(id) { return Math.max(0, Number(state().purchases[id] || 0)); }

  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce((sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0), 0);
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("recoveryTalentTree")) return;

    const section = document.createElement("section");
    section.id = "recoveryTalentTree";
    section.className = "panel recovery-tree-v314ag1";
    section.innerHTML = `
      <div class="recovery-tree-head-v314ag1">
        <div>
          <p class="eyebrow">RECOVERY · TALENT TREE</p>
          <h2>Make recovery easier to enter, not harder to earn.</h2>
          <p>Recovery points come from real Recovery & Regulation practice. The tree adds shortcuts, context and small first-practice bonuses — never a streak requirement.</p>
        </div>
        <div id="recoveryTreePointBank" class="recovery-tree-bank-v314ag1"></div>
      </div>
      <div id="recoveryTreeNodes" class="recovery-tree-map-v314ag1"></div>
      <div id="recoveryTalentTools" class="recovery-tools-v314ag1"></div>
      <div class="recovery-tree-footer-v314ag1">
        <span>↻ Free respec. Past rewards stay earned; resetting cannot create a second payout.</span>
        <button class="text-button" data-recovery-tree-reset type="button">Reset Recovery tree</button>
      </div>`;

    if (!skills.registerTalentTree(REALM, section)) {
      const realmGrid = document.getElementById("skillsRealmGrid");
      section.dataset.skillTreeRealm = REALM;
      if (realmGrid) realmGrid.insertAdjacentElement("beforebegin", section);
      else skillsView.appendChild(section);
    }
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-recovery-talent-buy]");
      if (buy) { event.preventDefault(); purchaseNode(buy.dataset.recoveryTalentBuy); return; }

      const reset = event.target.closest?.("[data-recovery-tree-reset]");
      if (reset) { event.preventDefault(); resetTree(); return; }

      const openStudio = event.target.closest?.("[data-recovery-tree-open-studio]");
      if (openStudio) { event.preventDefault(); openStudioNow(); return; }

      const start = event.target.closest?.("[data-recovery-tree-session]");
      if (start) { event.preventDefault(); startSession(start.dataset.recoveryTreeSession); return; }

      const smart = event.target.closest?.("[data-recovery-tree-smart-start]");
      if (smart) { event.preventDefault(); startRecommended(); return; }

      const repeat = event.target.closest?.("[data-recovery-tree-repeat-last]");
      if (repeat) { event.preventDefault(); repeatLast(); }
    });

    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", () => {
      scheduleRender();
      scheduleBonusPass();
    });
    window.addEventListener("life-rpg:time-change", () => {
      scheduleRender();
      scheduleBonusPass();
    });
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
      app.showToast?.(`You need ${item.cost} Recovery point${item.cost === 1 ? "" : "s"}.`);
      return;
    }

    state().purchases[id] = Date.now();
    syncSpentPoints();
    app.saveState({ source: "recovery-talent-unlock" });
    render();
    scheduleBonusPass();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
  }

  function resetTree() {
    if (!Object.keys(state().purchases).length) {
      app.showToast?.("The Recovery tree is already empty.");
      return;
    }
    if (!window.confirm("Reset the Recovery talent tree? All spent Recovery points become available again. Past earned rewards stay earned.")) return;
    state().purchases = {};
    syncSpentPoints();
    app.saveState({ source: "recovery-tree-reset" });
    render();
    skills.refreshTalentHub?.();
    app.showToast?.("Recovery tree reset · all Recovery points are available again.");
  }

  function syncSpentPoints() {
    const root = app.getState();
    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    root.skills.spentPointsByRealm[REALM] = purchaseCostTotal(state().purchases);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 80);
  }

  function render() {
    if (!document.getElementById("recoveryTalentTree")) return;
    renderBank();
    renderNodes();
    const tools = document.getElementById("recoveryTalentTools");
    if (tools) tools.innerHTML = renderTools();
  }

  function renderBank() {
    const bank = document.getElementById("recoveryTreePointBank");
    if (!bank) return;
    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `<small>RECOVERY POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span>`;
  }

  function renderNodes() {
    const container = document.getElementById("recoveryTreeNodes");
    if (!container) return;
    container.innerHTML = [0, 1, 2, 3].map(tier => {
      const items = NODES.filter(item => item.tier === tier);
      return `<div class="recovery-tree-tier-v314ag1 tier-${tier}">${items.map(nodeMarkup).join("")}</div>`;
    }).join("");
  }

  function nodeMarkup(item) {
    const isBought = purchased(item.id);
    const prereqsMet = item.requires.every(purchased);
    const affordable = skills.getRealmPoints(REALM).available >= item.cost;
    const status = isBought ? "bought" : prereqsMet ? (affordable ? "available" : "short") : "locked";
    const prerequisite = item.requires.length
      ? item.requires.map(id => NODE_BY_ID[id]?.title).filter(Boolean).join(" + ")
      : "Tree root";

    return `<article class="recovery-node-v314ag1 branch-${escAttr(item.branch)} is-${status}">
      <div class="recovery-node-icon-v314ag1">${item.icon}</div>
      <div class="recovery-node-copy-v314ag1">
        <small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.effect)}</p>
        <em>${esc(prerequisite)}</em>
      </div>
      ${isBought
        ? `<button type="button" disabled>Unlocked ✓</button>`
        : `<button type="button" data-recovery-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`}
    </article>`;
  }

  function renderTools() {
    if (!purchased("recovery-compass")) {
      return `<div class="recovery-tools-locked-v314ag1">
        <span>🛋️</span>
        <div><strong>Recovery Compass unlocks the first Recovery utility.</strong><p>Recovery Studio itself stays available exactly where it already is.</p></div>
      </div>`;
    }

    const blocks = [recoveryDockMarkup()];
    if (purchased("breath-anchor")) blocks.push(breathMarkup());
    if (purchased("quiet-harbor")) blocks.push(restMarkup());
    if (purchased("pattern-lantern")) blocks.push(patternMarkup());
    if (purchased("easy-entry")) blocks.push(easyEntryMarkup());
    if (purchased("protected-pause")) blocks.push(bonusMarkup());
    if (purchased("return-path")) blocks.push(returnPathMarkup());
    if (purchased("sanctuary")) blocks.push(sanctuaryMarkup());
    return blocks.join("");
  }

  function recoveryDockMarkup() {
    const info = skills.getLevelInfo(SKILL_ID);
    const seven = recentSkillXp(7);
    const thirty = recentSkillXp(30);
    const studio = window.LifeRPGRecoveryStudio?.getState?.();
    const completed = Number(studio?.stats?.completed || 0);
    return `<section class="recovery-tool-card-v314ag1 recovery-dock-v314ag1">
      <div class="recovery-tool-heading-v314ag1">
        <div><small>RECOVERY COMPASS</small><h3>Recovery dock</h3><p>One place to see Recovery practice without turning it into a to-do list.</p></div>
        <span>🛋️</span>
      </div>
      <div class="recovery-snapshot-v314ag1">
        <article><small>RECOVERY & REGULATION</small><strong>${info?.discovered ? `Lv. ${info.level}` : "Not trained yet"}</strong><span>${fmt(seven)} XP · last 7 days</span></article>
        <article><small>LAST 30 DAYS</small><strong>${fmt(thirty)} XP</strong><span>Observed practice only</span></article>
        <article><small>STUDIO COMPLETIONS</small><strong>${completed}</strong><span>All-time Recovery Studio</span></article>
      </div>
      <button class="primary-button" type="button" data-recovery-tree-open-studio>🌿 Open Recovery Studio</button>
    </section>`;
  }

  function breathMarkup() {
    return `<section class="recovery-tool-card-v314ag1 branch-breath-card-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>BREATH ANCHOR</small><h3>Start without browsing</h3><p>Two low-friction breathing starts. Normal breathing is always fine if a guided rhythm feels uncomfortable.</p></div><span>◯</span></div>
      <div class="recovery-action-row-v314ag1">
        ${sessionButton("breathing5", "primary-button")}
        ${sessionButton("box5", "secondary-button")}
        ${sessionButton("breathing10", "secondary-button")}
      </div>
    </section>`;
  }

  function restMarkup() {
    return `<section class="recovery-tool-card-v314ag1 branch-rest-card-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>QUIET HARBOR</small><h3>Passive recovery counts.</h3><p>Nothing productive is hidden inside these starts.</p></div><span>☾</span></div>
      <div class="recovery-action-row-v314ag1">
        ${sessionButton("bodyScan10", "primary-button")}
        ${sessionButton("lieDown15", "secondary-button")}
      </div>
    </section>`;
  }

  function patternMarkup() {
    const studio = window.LifeRPGRecoveryStudio?.getState?.();
    const history = Array.isArray(studio?.history) ? studio.history.filter(item => item?.completed) : [];
    const last30Start = Date.now() - 30 * 86400000;
    const recent = history.filter(item => timestamp(item.endedAt) >= last30Start);
    const minutes = recent.reduce((sum, item) => sum + Math.max(0, Number(item.durationSeconds || 0) / 60), 0);
    const days = new Set(recent.map(item => localDateKey(new Date(item.endedAt))).filter(Boolean)).size;
    const counts = {};
    recent.forEach(item => { if (item.sessionId) counts[item.sessionId] = (counts[item.sessionId] || 0) + 1; });
    const favouriteId = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "";
    const favourite = SESSION_META[favouriteId];
    const last = history.slice().sort((a, b) => timestamp(b.endedAt) - timestamp(a.endedAt))[0];
    const lastMeta = SESSION_META[last?.sessionId];

    return `<section class="recovery-tool-card-v314ag1 branch-insight-card-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>PATTERN LANTERN · LAST 30 DAYS</small><h3>What recovery actually looked like</h3><p>Descriptive history only — no target, grade or “missed day”.</p></div><span>◇</span></div>
      <div class="recovery-snapshot-v314ag1 compact">
        <article><small>PRACTICE DAYS</small><strong>${days}</strong><span>days with completed Studio recovery</span></article>
        <article><small>STUDIO TIME</small><strong>${formatMinutes(minutes)}</strong><span>completed sessions</span></article>
        <article><small>MOST USED</small><strong>${esc(favourite?.title || "—")}</strong><span>${favourite ? `${counts[favouriteId]} session${counts[favouriteId] === 1 ? "" : "s"}` : "No pattern yet"}</span></article>
      </div>
      <p class="recovery-last-line-v314ag1">${lastMeta ? `Last completed: ${lastMeta.icon} ${esc(lastMeta.title)} · ${esc(humanAgo(last.endedAt))}` : "No completed Recovery Studio session yet."}</p>
    </section>`;
  }

  function easyEntryMarkup() {
    const rec = window.LifeRPGRecoveryStudio?.getRecommendation?.();
    const meta = SESSION_META[rec?.sessionId];
    if (!meta) return `<section class="recovery-tool-card-v314ag1"><p>Recovery Studio will provide the smart route when it is available.</p></section>`;
    return `<section class="recovery-tool-card-v314ag1 recovery-smart-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>EASY ENTRY · OPTIONAL</small><h3>${esc(rec.heading || "A recovery option is available.")}</h3><p>${esc(rec.reason || "This suggestion uses the same gentle logic as Recovery Studio.")}</p></div><span>✦</span></div>
      <button class="primary-button" data-recovery-tree-smart-start type="button">${meta.icon} Start ${esc(meta.title)} · ${meta.minutes} min</button>
      <small>You can ignore this and choose anything else in Recovery Studio.</small>
    </section>`;
  }

  function bonusMarkup() {
    const today = localDateKey(new Date());
    const baseClaim = hasLedgerClaim(`protected-pause:${today}`);
    return `<section class="recovery-tool-card-v314ag1 recovery-bonus-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>PROTECTED PAUSE</small><h3>First-practice bonus</h3><p>The first real Recovery & Regulation practice each day adds +1 Recovery Realm XP after this talent is unlocked.</p></div><span>${baseClaim ? "✓" : "❀"}</span></div>
      <strong>${baseClaim ? "Today's bonus already happened naturally." : "Ready if recovery happens today."}</strong>
      <small>No streak. Nothing is lost if it does not happen.</small>
    </section>`;
  }

  function returnPathMarkup() {
    const studio = window.LifeRPGRecoveryStudio?.getState?.();
    const history = Array.isArray(studio?.history) ? studio.history.filter(item => item?.completed) : [];
    const last = history.slice().sort((a, b) => timestamp(b.endedAt) - timestamp(a.endedAt))[0];
    const meta = SESSION_META[last?.sessionId];
    return `<section class="recovery-tool-card-v314ag1 branch-insight-card-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>RETURN PATH</small><h3>${meta ? "Your last route is still here." : "A return path will appear after a session."}</h3><p>${meta ? `${meta.icon} ${esc(meta.title)} · ${meta.minutes} min · last completed ${esc(humanAgo(last.endedAt))}` : "Nothing to repeat yet; Recovery Studio remains available."}</p></div><span>↻</span></div>
      ${meta ? `<button class="primary-button" type="button" data-recovery-tree-repeat-last>Repeat ${esc(meta.title)}</button>` : `<button class="secondary-button" type="button" data-recovery-tree-open-studio>Open Recovery Studio</button>`}
    </section>`;
  }

  function sanctuaryMarkup() {
    const today = localDateKey(new Date());
    const extra = hasLedgerClaim(`sanctuary:${today}`);
    return `<section class="recovery-tool-card-v314ag1 recovery-sanctuary-v314ag1">
      <div class="recovery-tool-heading-v314ag1"><div><small>SANCTUARY · KEYSTONE</small><h3>Recovery can be the whole point.</h3><p>The first Recovery & Regulation practice of the day now carries +2 Recovery Realm XP total with Protected Pause. No extra session is ever required.</p></div><span>✺</span></div>
      <div class="recovery-sanctuary-status-v314ag1">${extra ? "✓ Today's Sanctuary bonus is already recorded." : "The bonus is ready if recovery happens naturally today."}</div>
    </section>`;
  }

  function sessionButton(id, klass) {
    const meta = SESSION_META[id];
    return `<button class="${klass}" type="button" data-recovery-tree-session="${escAttr(id)}">${meta.icon} ${esc(meta.title)} · ${meta.minutes}m</button>`;
  }

  function openStudioNow() {
    if (!window.LifeRPGRecoveryStudio?.open) {
      app.showToast?.("Recovery Studio is not available yet.");
      return;
    }
    window.LifeRPGRecoveryStudio.open();
  }

  function startSession(id) {
    if (!SESSION_META[id] || !window.LifeRPGRecoveryStudio?.start) {
      openStudioNow();
      return;
    }
    window.LifeRPGRecoveryStudio.start(id);
  }

  function startRecommended() {
    const rec = window.LifeRPGRecoveryStudio?.getRecommendation?.();
    if (rec?.sessionId && SESSION_META[rec.sessionId]) startSession(rec.sessionId);
    else openStudioNow();
  }

  function repeatLast() {
    const studio = window.LifeRPGRecoveryStudio?.getState?.();
    const history = Array.isArray(studio?.history) ? studio.history.filter(item => item?.completed) : [];
    const last = history.slice().sort((a, b) => timestamp(b.endedAt) - timestamp(a.endedAt))[0];
    if (last?.sessionId && SESSION_META[last.sessionId]) startSession(last.sessionId);
    else openStudioNow();
  }

  function scheduleBonusPass() {
    if (applyingBonus) return;
    window.setTimeout(applyBonuses, 60);
  }

  function applyBonuses() {
    if (applyingBonus) return;
    applyingBonus = true;
    try {
      if (purchased("protected-pause")) grantFirstPracticeBonuses("protected-pause", purchaseTime("protected-pause"), 1);
      if (purchased("sanctuary")) grantFirstPracticeBonuses("sanctuary", purchaseTime("sanctuary"), 1);
    } finally {
      applyingBonus = false;
      render();
    }
  }

  function grantFirstPracticeBonuses(nodeId, unlockedAt, realmXp) {
    if (!unlockedAt) return;
    const dates = new Set();
    skillEvents().forEach(event => {
      const at = timestamp(event?.at);
      if (event?.skillId !== SKILL_ID || at < unlockedAt) return;
      dates.add(localDateKey(new Date(at)));
    });
    [...dates].sort().forEach(date => grantRealmBonus(`${nodeId}:${date}`, NODE_BY_ID[nodeId].title, realmXp, date));
  }

  function grantRealmBonus(sourceId, label, amount, date) {
    if (hasLedgerClaim(sourceId)) return;
    const reward = app.awardActivity?.({
      source: "recovery-talent-bonus",
      sourceId,
      label,
      realm: REALM,
      capability: "wellbeing",
      xp: 0,
      realmXP: amount,
      statXP: 0,
      coins: 0,
      storyEnergyBase: 0,
      progressionRelevant: false,
      at: `${date}T23:52:00`,
      metadata: { talentTree: "recovery", realmXPBonus: amount }
    });
    if (!reward) return;
    state().bonusClaims[sourceId] = reward.eventId || true;
    app.saveState({ source: "recovery-talent-bonus" });
    if (date === localDateKey(new Date())) app.showToast?.(`🌿 ${label} · +${amount} Recovery Realm XP`);
  }

  function hasLedgerClaim(sourceId) {
    return (app.getState().rewardLedger?.events || []).some(event =>
      event?.source === "recovery-talent-bonus" && event?.sourceId === sourceId
    );
  }

  function skillEvents() {
    return Array.isArray(app.getState().skills?.events) ? app.getState().skills.events : [];
  }

  function recentSkillXp(days) {
    const after = Date.now() - Math.max(1, Number(days || 1)) * 86400000;
    return skillEvents()
      .filter(event => event?.skillId === SKILL_ID && timestamp(event.at) >= after)
      .reduce((sum, event) => sum + Math.max(0, Number(event.xp || 0)), 0);
  }

  function humanAgo(value) {
    const ms = Math.max(0, Date.now() - timestamp(value));
    const mins = Math.floor(ms / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function formatMinutes(value) {
    const minutes = Math.max(0, Math.round(Number(value || 0)));
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function timestamp(value) {
    const n = typeof value === "number" ? value : new Date(value || 0).getTime();
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function round2(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function fmt(value) {
    const n = round2(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? ""); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGRecoveryTree = {
    version: VERSION,
    nodes: NODES.map(item => ({ ...item })),
    open: () => { skills.selectTalentRealm?.(REALM); skills.open?.(); },
    render
  };
})();
