(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints) {
    console.error("Life RPG Health Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4ae";
  const SCHEMA = 1;
  const REALM = "Health";
  const HEALTH_SKILLS = [
    "movement-body-care",
    "physical-vitality",
    "personal-care",
    "reflection-self-awareness"
  ];

  const NODES = [
    node("health-compass", "Health Compass", "✿", 1, 0, "core", [], "Adds one calm Health dock for movement, body care, personal-care habits and reflection. It never replaces the original tools."),
    node("body-rhythm", "Body Rhythm", "🌿", 1, 1, "body", ["health-compass"], "See recent Movement & Body Care and Physical Vitality practice together, with quick starts for a walk, neck/shoulder release and your mapped vitality habits."),
    node("care-shelf", "Care Shelf", "🫧", 1, 1, "care", ["health-compass"], "Brings mapped Personal Care habits into the Health tree so skincare, hair care and similar routines are easy to see and log."),
    node("inner-mirror", "Inner Mirror", "🌙", 1, 1, "reflection", ["health-compass"], "Shows recent check-ins and reflection practice with direct routes to today's Journal and the Weekly Review."),
    node("gentle-momentum", "Gentle Momentum", "↟", 2, 2, "body", ["body-rhythm"], "The first Movement & Body Care or Physical Vitality practice after unlock each day adds +1 Health Realm XP. No streak and no minimum week."),
    node("care-ritual", "Care Ritual", "❀", 2, 2, "care", ["care-shelf"], "The first Personal Care practice after unlock each day adds +1 Health Realm XP. Missing a day changes nothing."),
    node("reflection-thread", "Reflection Thread", "⌁", 2, 2, "reflection", ["inner-mirror"], "The first Reflection & Self-Awareness practice after unlock each day adds +1 Health Realm XP, including a Daily Check-in."),
    node("whole-self", "Whole Self", "✺", 4, 3, "core", ["gentle-momentum", "care-ritual", "reflection-thread"], "When three different Health skills naturally show up on the same day after unlock, add +3 Health Realm XP once. It is a bonus for variety that happened, never a quota.")
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
    if (changed) app.saveState({ source: "health-tree-init" });
    render();
    scheduleBonusPass();
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.healthTalentTree || typeof root.healthTalentTree !== "object" || Array.isArray(root.healthTalentTree)) {
      root.healthTalentTree = defaults();
      changed = true;
    }
    const model = root.healthTalentTree;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    if (!model.purchases || typeof model.purchases !== "object" || Array.isArray(model.purchases)) { model.purchases = {}; changed = true; }
    if (!model.bonusClaims || typeof model.bonusClaims !== "object" || Array.isArray(model.bonusClaims)) { model.bonusClaims = {}; changed = true; }
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) { model.migrations = {}; changed = true; }
    model.version = VERSION;

    Object.keys(model.purchases).forEach(id => {
      if (!NODE_BY_ID[id] || !Number.isFinite(Number(model.purchases[id]))) {
        delete model.purchases[id];
        changed = true;
      }
    });

    if (!root.skills || typeof root.skills !== "object") root.skills = {};
    if (!root.skills.spentPointsByRealm || typeof root.skills.spentPointsByRealm !== "object") root.skills.spentPointsByRealm = {};
    const spent = purchaseCostTotal(model.purchases);
    if (Number(root.skills.spentPointsByRealm[REALM] || 0) !== spent) {
      root.skills.spentPointsByRealm[REALM] = spent;
      changed = true;
    }
    model.migrations.initialHealthTreeV1 = true;
    return changed;
  }

  function defaults() {
    return { schemaVersion: SCHEMA, version: VERSION, purchases: {}, bonusClaims: {}, migrations: { initialHealthTreeV1: true } };
  }

  function state() { ensureState(); return app.getState().healthTalentTree; }
  function purchased(id) { return Boolean(state().purchases[id]); }
  function purchaseTime(id) { return Math.max(0, Number(state().purchases[id] || 0)); }
  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce((sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0), 0);
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("healthTalentTree")) return;
    const realmGrid = document.getElementById("skillsRealmGrid");
    const section = document.createElement("section");
    section.id = "healthTalentTree";
    section.className = "panel health-tree-v314ae";
    section.innerHTML = `
      <div class="health-tree-head-v314ae">
        <div><p class="eyebrow">HEALTH · TALENT TREE</p><h2>Build support around the body you actually have today.</h2><p>Health points come from real Health skill practice. Talents add visibility, shortcuts and small optional bonuses — never requirements, diagnoses or penalties for low-capacity days.</p></div>
        <div id="healthTreePointBank" class="health-tree-bank-v314ae"></div>
      </div>
      <div id="healthTreeNodes" class="health-tree-map-v314ae"></div>
      <div id="healthTalentTools" class="health-tools-v314ae"></div>
      <div class="health-tree-footer-v314ae"><span>↻ Free respec. Already-earned rewards stay earned, and resetting never creates a second payout.</span><button class="text-button" data-health-tree-reset type="button">Reset Health tree</button></div>`;
    if (realmGrid) realmGrid.insertAdjacentElement("beforebegin", section);
    else skillsView.appendChild(section);
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-health-talent-buy]");
      if (buy) { event.preventDefault(); purchaseNode(buy.dataset.healthTalentBuy); return; }

      const reset = event.target.closest?.("[data-health-tree-reset]");
      if (reset) { event.preventDefault(); resetTree(); return; }

      const walk = event.target.closest?.("[data-health-walk-minutes]");
      if (walk) { event.preventDefault(); startWalk(Number(walk.dataset.healthWalkMinutes || 10)); return; }

      const neck = event.target.closest?.("[data-health-neck-release]");
      if (neck) { event.preventDefault(); startNeckRelease(); return; }

      const habitsOpen = event.target.closest?.("[data-health-habits-open]");
      if (habitsOpen) { event.preventDefault(); app.showView?.("habits"); return; }

      const habitLog = event.target.closest?.("[data-health-habit-log]");
      if (habitLog) { event.preventDefault(); logHabit(habitLog.dataset.healthHabitLog); return; }

      const journal = event.target.closest?.("[data-health-journal-open]");
      if (journal) { event.preventDefault(); app.showView?.("journal"); return; }

      const reflect = event.target.closest?.("[data-health-reflect-now]");
      if (reflect) { event.preventDefault(); openReflection(); return; }

      const weekly = event.target.closest?.("[data-health-weekly-review]");
      if (weekly) { event.preventDefault(); openWeeklyReview(); }
    });

    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", () => {
      scheduleRender();
      scheduleBonusPass();
    });
    window.addEventListener("life-rpg:habit-complete", () => {
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
      app.showToast?.(`You need ${item.cost} Health point${item.cost === 1 ? "" : "s"}.`);
      return;
    }
    state().purchases[id] = Date.now();
    syncSpentPoints();
    app.saveState({ source: "health-talent-unlock" });
    render();
    scheduleBonusPass();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
  }

  function resetTree() {
    const count = Object.keys(state().purchases).length;
    if (!count) { app.showToast?.("The Health tree is already empty."); return; }
    if (!window.confirm("Reset the Health talent tree? All spent Health points become available again. Past earned rewards stay earned.")) return;
    state().purchases = {};
    syncSpentPoints();
    app.saveState({ source: "health-tree-reset" });
    render();
    app.showToast?.("Health tree reset · all Health points are available again.");
  }

  function syncSpentPoints() {
    const root = app.getState();
    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    root.skills.spentPointsByRealm[REALM] = purchaseCostTotal(state().purchases);
  }

  function render() {
    if (!document.getElementById("healthTalentTree")) return;
    renderBank();
    renderNodes();
    const tools = document.getElementById("healthTalentTools");
    if (tools) tools.innerHTML = renderTools();
  }

  function renderBank() {
    const bank = document.getElementById("healthTreePointBank");
    if (!bank) return;
    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `<small>HEALTH POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span>`;
  }

  function renderNodes() {
    const container = document.getElementById("healthTreeNodes");
    if (!container) return;
    container.innerHTML = [0, 1, 2, 3].map(tier => {
      const items = NODES.filter(item => item.tier === tier);
      return `<div class="health-tree-tier-v314ae tier-${tier}">${items.map(nodeMarkup).join("")}</div>`;
    }).join("");
  }

  function nodeMarkup(item) {
    const isBought = purchased(item.id);
    const prereqsMet = item.requires.every(purchased);
    const affordable = skills.getRealmPoints(REALM).available >= item.cost;
    const status = isBought ? "bought" : prereqsMet ? (affordable ? "available" : "short") : "locked";
    const prereqText = item.requires.length ? item.requires.map(id => NODE_BY_ID[id]?.title).filter(Boolean).join(" + ") : "Tree root";
    const action = isBought
      ? `<button type="button" disabled>Unlocked ✓</button>`
      : `<button type="button" data-health-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`;
    return `<article class="health-node-v314ae branch-${escAttr(item.branch)} is-${status}">
      <div class="health-node-icon-v314ae">${item.icon}</div>
      <div class="health-node-copy-v314ae"><small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small><h3>${esc(item.title)}</h3><p>${esc(item.effect)}</p><em>${esc(prereqText)}</em></div>
      ${action}
    </article>`;
  }

  function renderTools() {
    if (!purchased("health-compass")) {
      return `<div class="health-tools-locked-v314ae"><span>✿</span><div><strong>Health Compass unlocks the first Health utility.</strong><p>Everything you already use stays available. This space only gathers extra support you choose to unlock.</p></div></div>`;
    }

    const blocks = [healthDockMarkup()];
    if (purchased("body-rhythm")) blocks.push(bodyRhythmMarkup());
    if (purchased("care-shelf")) blocks.push(careShelfMarkup());
    if (purchased("inner-mirror")) blocks.push(innerMirrorMarkup());
    if (purchased("whole-self")) blocks.push(wholeSelfMarkup());
    return blocks.join("");
  }

  function healthDockMarkup() {
    const rows = HEALTH_SKILLS.map(id => {
      const meta = skills.getSkill(id);
      const info = skills.getLevelInfo(id);
      const seven = recentSkillXp(id, 7);
      return `<article><span>${meta?.icon || "✦"}</span><div><strong>${esc(meta?.label || id)}</strong><small>${info?.discovered ? `Lv. ${info.level}` : "Not trained yet"} · ${fmt(seven)} XP in 7d</small></div></article>`;
    }).join("");
    return `<section class="health-tool-card-v314ae health-dock-v314ae">
      <div class="health-tool-heading-v314ae"><div><small>HEALTH COMPASS</small><h3>Health dock</h3><p>A bird's-eye view plus shortcuts. Low numbers are information, never an overdue list.</p></div><span>✿</span></div>
      <div class="health-skill-snapshot-v314ae">${rows}</div>
      <div class="health-action-row-v314ae">
        <button class="secondary-button" type="button" data-health-walk-minutes="10">🌿 10m walk</button>
        <button class="secondary-button" type="button" data-health-neck-release>🤸 Neck & shoulders</button>
        <button class="secondary-button" type="button" data-health-habits-open>🫧 Health habits</button>
        <button class="secondary-button" type="button" data-health-journal-open>🌙 Journal</button>
      </div>
    </section>`;
  }

  function bodyRhythmMarkup() {
    const movement = recentSkillXp("movement-body-care", 7);
    const vitality = recentSkillXp("physical-vitality", 7);
    const vitalityHabits = mappedHabits("physical-vitality");
    const completed = vitalityHabits.filter(habitCompletedToday).length;
    return `<section class="health-tool-card-v314ae branch-body-card-v314ae">
      <div class="health-tool-heading-v314ae"><div><small>BODY RHYTHM · LAST 7 DAYS</small><h3>Movement & vitality</h3><p>Gentle body care and harder physical training are allowed to be different things.</p></div><span>🌿</span></div>
      <div class="health-mini-stats-v314ae"><article><strong>${fmt(movement)}</strong><span>Movement & Body Care XP</span></article><article><strong>${fmt(vitality)}</strong><span>Physical Vitality XP</span></article></div>
      <div class="health-action-row-v314ae"><button class="primary-button" type="button" data-health-walk-minutes="10">Start 10m walk</button><button class="secondary-button" type="button" data-health-walk-minutes="20">20m walk</button><button class="secondary-button" type="button" data-health-neck-release>7m neck release</button></div>
      <p class="health-observation-v314ae">${vitalityHabits.length ? `${completed}/${vitalityHabits.length} mapped Physical Vitality habit${vitalityHabits.length === 1 ? "" : "s"} logged today.` : "No Physical Vitality habit is mapped yet. That is fine; the skill can stay quiet until a real activity exists."}</p>
      ${vitalityHabits.length ? `<div class="health-habit-list-v314ae">${vitalityHabits.slice(0, 5).map(habitRow).join("")}</div>` : ""}
    </section>`;
  }

  function careShelfMarkup() {
    const habits = mappedHabits("personal-care");
    const done = habits.filter(habitCompletedToday).length;
    return `<section class="health-tool-card-v314ae branch-care-card-v314ae">
      <div class="health-tool-heading-v314ae"><div><small>CARE SHELF</small><h3>Personal care, close at hand</h3><p>Mapped care habits can be logged here without turning care into a checklist you have to complete.</p></div><span>🫧</span></div>
      ${habits.length ? `<div class="health-care-summary-v314ae"><strong>${done}/${habits.length}</strong><span>mapped Personal Care habits logged today</span></div><div class="health-habit-list-v314ae">${habits.map(habitRow).join("")}</div>` : `<div class="health-empty-v314ae">No Personal Care habit is mapped yet. Map skincare, hair care or another real routine from the Skills/Habits setup when you want it here.</div>`}
      <button class="text-button" type="button" data-health-habits-open>Open full Habits view ›</button>
    </section>`;
  }

  function innerMirrorMarkup() {
    const checkIns = recentCheckIns(7);
    const reflectionXp = recentSkillXp("reflection-self-awareness", 7);
    const review = weeklyReviewStatus();
    const last = lastSkillEvent("reflection-self-awareness");
    return `<section class="health-tool-card-v314ae branch-reflection-card-v314ae">
      <div class="health-tool-heading-v314ae"><div><small>INNER MIRROR · LAST 7 DAYS</small><h3>Reflection without grading</h3><p>Check-ins and writing count as practice in noticing what is actually going on.</p></div><span>🌙</span></div>
      <div class="health-mini-stats-v314ae"><article><strong>${checkIns}</strong><span>Daily Check-ins</span></article><article><strong>${fmt(reflectionXp)}</strong><span>Reflection Skill XP</span></article></div>
      <p class="health-observation-v314ae">${last ? `Latest reflection practice: ${esc(humanAgo(last.at))}.` : "No reflection practice is logged yet."} ${esc(review.text)}</p>
      <div class="health-action-row-v314ae"><button class="primary-button" type="button" data-health-reflect-now>Reflect today</button><button class="secondary-button" type="button" data-health-weekly-review>Weekly Review</button><button class="secondary-button" type="button" data-health-journal-open>Open Journal</button></div>
    </section>`;
  }

  function wholeSelfMarkup() {
    const today = healthSkillsOnDate(localDateKey(new Date()), purchaseTime("whole-self"));
    return `<section class="health-tool-card-v314ae health-whole-self-v314ae">
      <div class="health-tool-heading-v314ae"><div><small>WHOLE SELF</small><h3>Today's Health constellation</h3><p>Different kinds of care can coexist. Variety only earns a bonus when it happens naturally.</p></div><span>✺</span></div>
      <div class="health-constellation-v314ae">${HEALTH_SKILLS.map(id => {
        const meta = skills.getSkill(id);
        const active = today.has(id);
        return `<article class="${active ? "is-active" : ""}"><span>${meta?.icon || "✦"}</span><strong>${active ? "✓" : "·"}</strong><small>${esc(meta?.label || id)}</small></article>`;
      }).join("")}</div>
      <p class="health-observation-v314ae">Today after Whole Self unlock: <strong>${today.size}/3 different Health skills</strong>${today.size >= 3 ? " · variety bonus earned ✓" : " · nothing to chase"}.</p>
    </section>`;
  }

  function habitRow(habit) {
    const done = habitCompletedToday(habit);
    return `<article class="health-habit-row-v314ae ${done ? "is-done" : ""}"><span>${done ? "✓" : "○"}</span><div><strong>${esc(habit.name || "Habit")}</strong><small>${esc(habit.daypart || "anytime")} · ${esc(habit.effort || "low")} effort</small></div><button class="${done ? "text-button" : "secondary-button"}" type="button" data-health-habit-log="${escAttr(habit.id)}">${done ? "Log again" : "Log"}</button></article>`;
  }

  function mappedHabits(skillId) {
    return (app.getState().habits?.items || [])
      .filter(item => item && item.active !== false && item.skillId === skillId)
      .sort((a, b) => String(a.daypart || "anytime").localeCompare(String(b.daypart || "anytime")) || String(a.name || "").localeCompare(String(b.name || "")));
  }

  function habitCompletedToday(habit) {
    const today = localDateKey(new Date());
    return (app.getState().habits?.completions || []).some(log => log?.habitId === habit?.id && String(log.date || "") === today);
  }

  function logHabit(id) {
    const habit = (app.getState().habits?.items || []).find(item => item?.id === id);
    if (!habit) return;
    if (!window.LifeRPGHabits?.complete) {
      app.showView?.("habits");
      app.showToast?.("Open Habits to log this routine.");
      return;
    }
    window.LifeRPGHabits.complete(id, localDateKey(new Date()));
    window.setTimeout(() => { render(); scheduleBonusPass(); }, 80);
  }

  function startWalk(minutes) {
    const time = window.LifeRPGTime;
    if (!time?.startAction) { app.showToast?.("Life Rhythm is not ready yet."); return; }
    if (time.getActive?.()) { app.showToast?.("Another timer is already running."); return; }
    const safe = Math.max(5, Math.min(120, Number(minutes || 10)));
    const result = time.startAction({ categoryId: "recovery", subcategory: "Walk", label: `Health Tree · ${safe}m walk`, minutes: safe });
    if (result !== false) {
      app.showView?.("rhythm");
      app.showToast?.(`🌿 ${safe}m walk started.`);
    }
  }

  function startNeckRelease() {
    const studio = window.LifeRPGRecoveryStudio;
    if (!studio?.start) { app.showToast?.("Recovery Studio is not ready yet."); return; }
    studio.start("neckShoulders7");
  }

  function openReflection() {
    app.showView?.("journal");
    window.setTimeout(() => document.getElementById("journalReflectButton")?.click(), 30);
  }

  function openWeeklyReview() {
    if (window.LifeRPGWeeklyReview?.open) {
      window.LifeRPGWeeklyReview.open();
      return;
    }
    app.showView?.("journal");
    app.showToast?.("Weekly Review lives in the Journal.");
  }

  function recentSkillXp(skillId, days = 7) {
    const cutoff = startOfLocalDay(new Date());
    cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
    return round2((app.getState().skills?.events || []).reduce((sum, event) => {
      const at = timestamp(event?.at);
      return event?.skillId === skillId && at >= cutoff.getTime() ? sum + Number(event.xp || 0) : sum;
    }, 0));
  }

  function recentCheckIns(days = 7) {
    const cutoff = startOfLocalDay(new Date());
    cutoff.setDate(cutoff.getDate() - Math.max(0, days - 1));
    return Object.entries(app.getState().dailyPlanner?.days || {}).filter(([date, day]) => {
      const at = timestamp(`${date}T12:00:00`);
      return day?.checkIn && at >= cutoff.getTime();
    }).length;
  }

  function weeklyReviewStatus() {
    const api = window.LifeRPGWeeklyReview;
    if (!api?.getTarget || !api?.getReviews) return { text: "Weekly Review is available in the Journal." };
    const target = api.getTarget();
    const review = api.getReviews()?.[target.weekKey];
    return { text: review?.completedAt ? `Weekly Review ${target.weekKey} is saved.` : `Weekly Review ${target.weekKey} is still open whenever it feels useful.` };
  }

  function lastSkillEvent(skillId) {
    return [...(app.getState().skills?.events || [])].filter(event => event?.skillId === skillId).sort((a, b) => timestamp(b?.at) - timestamp(a?.at))[0] || null;
  }

  function healthSkillsOnDate(date, afterMs = 0) {
    const set = new Set();
    (app.getState().skills?.events || []).forEach(event => {
      const at = timestamp(event?.at);
      if (at < afterMs || localDateKey(new Date(at || 0)) !== date || !HEALTH_SKILLS.includes(event?.skillId)) return;
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
      if (!(app.getState().skills?.events || []).length) return;

      if (purchased("gentle-momentum")) {
        grantFirstDailyBonus("gentle-momentum", 1, event => ["movement-body-care", "physical-vitality"].includes(event?.skillId));
      }
      if (purchased("care-ritual")) {
        grantFirstDailyBonus("care-ritual", 1, event => event?.skillId === "personal-care");
      }
      if (purchased("reflection-thread")) {
        grantFirstDailyBonus("reflection-thread", 1, event => event?.skillId === "reflection-self-awareness");
      }
      if (purchased("whole-self")) grantWholeSelfBonuses();
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

  function grantWholeSelfBonuses() {
    const unlockedAt = purchaseTime("whole-self");
    if (!unlockedAt) return;
    const dates = new Set();
    (app.getState().skills?.events || []).forEach(event => {
      const at = timestamp(event?.at);
      if (at >= unlockedAt && HEALTH_SKILLS.includes(event?.skillId)) dates.add(localDateKey(new Date(at)));
    });
    [...dates].sort().forEach(date => {
      if (healthSkillsOnDate(date, unlockedAt).size >= 3) grantRealmBonus(`whole-self:${date}`, "Whole Self variety", 3, date);
    });
  }

  function grantRealmBonus(sourceId, label, amount, date) {
    const ledger = app.getState().rewardLedger?.events || [];
    if (ledger.some(event => event?.source === "health-talent-bonus" && event?.sourceId === sourceId)) return;
    const reward = app.awardActivity?.({
      source: "health-talent-bonus",
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
      at: `${date}T23:51:00`,
      metadata: { talentTree: "health", realmXPBonus: amount }
    });
    if (!reward) return;
    state().bonusClaims[sourceId] = reward.eventId || true;
    app.saveState({ source: "health-talent-bonus" });
    if (date === localDateKey(new Date())) app.showToast?.(`✿ ${label} · +${amount} Health Realm XP`);
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
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGHealthTree = {
    version: VERSION,
    registry: NODES.map(item => ({ ...item, requires: [...item.requires] })),
    isUnlocked: id => purchased(id),
    getState: () => JSON.parse(JSON.stringify(state())),
    open: () => { app.showView?.("skills"); render(); document.getElementById("healthTalentTree")?.scrollIntoView({ behavior: "smooth", block: "start" }); },
    reset: resetTree
  };
})();
