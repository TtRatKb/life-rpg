(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !skills?.registerTalentTree) {
    console.error("Life RPG Home Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4ag3";
  const SCHEMA = 1;
  const REALM = "Home";
  const SKILL_ID = "life-management";

  const NODES = [
    node("home-compass", "Home Compass", "🏠", 1, 0, "core", [],
      "Adds one Home dock with Life Management progress, Home Realm rank, current household signals and direct routes to the tools you already use."),
    node("quick-reset", "Quick Reset", "🧹", 1, 1, "reset", ["home-compass"],
      "Brings the short existing Home quests forward: 10-Minute Clean, Clear One Surface and Put Away 10 Things."),
    node("paper-trail", "Paper Trail", "📬", 1, 1, "admin", ["home-compass"],
      "Adds low-friction starts for Paperwork, Appointments and Errands plus the existing Paper Pile quest when a pile is actually marked waiting."),
    node("laundry-loop", "Laundry Loop", "🧺", 1, 1, "household", ["home-compass"],
      "Shows the real laundry state from Smart Quests and routes to washing or folding only when that step is actually available."),
    node("room-rhythm", "Room Rhythm", "✦", 2, 2, "reset", ["quick-reset"],
      "Adds a smart Home reset route that prefers a real waiting signal, then an available short reset, rather than inventing a new chore."),
    node("admin-dock", "Admin Dock", "🗂️", 2, 2, "admin", ["paper-trail"],
      "Keeps practical Life/Admin starts together and shows recent Life Management time without turning it into a backlog counter."),
    node("household-thread", "Household Thread", "⌁", 2, 2, "household", ["laundry-loop"],
      "Shows the most recent Home practice and keeps the last matching route easy to resume."),
    node("home-base", "Home Base", "✺", 4, 3, "core", ["room-rhythm", "admin-dock", "household-thread"],
      "Adds one Smart Home button and +1 Home Realm XP to the first real Life Management practice after unlock each day. No streak, quota or missed-day penalty.")
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
    if (changed) app.saveState({ source: "home-tree-init" });
    render();
    scheduleBonusPass();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      purchases: {},
      bonusClaims: {},
      migrations: { initialHomeTreeV1: true }
    };
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;

    if (!root.homeTalentTree || typeof root.homeTalentTree !== "object" || Array.isArray(root.homeTalentTree)) {
      root.homeTalentTree = defaults();
      changed = true;
    }

    const model = root.homeTalentTree;
    if (Number(model.schemaVersion || 0) < SCHEMA) {
      model.schemaVersion = SCHEMA;
      changed = true;
    }
    model.version = VERSION;

    if (!model.purchases || typeof model.purchases !== "object" || Array.isArray(model.purchases)) {
      model.purchases = {};
      changed = true;
    }
    if (!model.bonusClaims || typeof model.bonusClaims !== "object" || Array.isArray(model.bonusClaims)) {
      model.bonusClaims = {};
      changed = true;
    }
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) {
      model.migrations = {};
      changed = true;
    }
    model.migrations.initialHomeTreeV1 = true;

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

  function state() {
    ensureState();
    return app.getState().homeTalentTree;
  }

  function purchased(id) {
    return Boolean(state().purchases[id]);
  }

  function purchaseTime(id) {
    return Math.max(0, Number(state().purchases[id] || 0));
  }

  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce((sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0), 0);
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("homeTalentTree")) return;

    const section = document.createElement("section");
    section.id = "homeTalentTree";
    section.className = "panel home-tree-v314ag3";
    section.innerHTML = `
      <div class="home-tree-head-v314ag3">
        <div>
          <p class="eyebrow">HOME · TALENT TREE</p>
          <h2>Make practical life easier to pick up again.</h2>
          <p>Home points come from real Life Management practice. Talents add shortcuts and context around existing Home quests and Life/Admin timers — not more chores.</p>
        </div>
        <div id="homeTreePointBank" class="home-tree-bank-v314ag3"></div>
      </div>

      <div id="homeTreeNodes" class="home-tree-map-v314ag3"></div>
      <div id="homeTalentTools" class="home-tools-v314ag3"></div>

      <div class="home-tree-footer-v314ag3">
        <span>↻ Free respec. Existing Home quests, Habits and Focus & Time remain available outside the tree.</span>
        <button class="text-button" type="button" data-home-tree-reset>Reset Home tree</button>
      </div>`;

    if (!skills.registerTalentTree(REALM, section)) {
      const grid = document.getElementById("skillsRealmGrid");
      section.dataset.skillTreeRealm = REALM;
      if (grid) grid.insertAdjacentElement("beforebegin", section);
      else skillsView.appendChild(section);
    }
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-home-talent-buy]");
      if (buy) {
        event.preventDefault();
        purchaseNode(buy.dataset.homeTalentBuy);
        return;
      }

      const reset = event.target.closest?.("[data-home-tree-reset]");
      if (reset) {
        event.preventDefault();
        resetTree();
        return;
      }

      const quest = event.target.closest?.("[data-home-quest-role]");
      if (quest) {
        event.preventDefault();
        startOrOpenQuest(quest.dataset.homeQuestRole);
        return;
      }

      const timer = event.target.closest?.("[data-home-action]");
      if (timer) {
        event.preventDefault();
        startHomeAction(timer.dataset.homeAction, Number(timer.dataset.homeMinutes || 15));
        return;
      }

      const smart = event.target.closest?.("[data-home-smart-route]");
      if (smart) {
        event.preventDefault();
        runSmartHomeRoute();
        return;
      }

      const repeat = event.target.closest?.("[data-home-repeat-last]");
      if (repeat) {
        event.preventDefault();
        repeatLastHomeRoute();
        return;
      }

      const openHabits = event.target.closest?.("[data-home-open-habits]");
      if (openHabits) {
        event.preventDefault();
        app.showView?.("habits");
        return;
      }

      const completeHabit = event.target.closest?.("[data-home-habit-complete]");
      if (completeHabit) {
        event.preventDefault();
        window.LifeRPGHabits?.complete?.(completeHabit.dataset.homeHabitComplete);
        return;
      }

      const openRhythm = event.target.closest?.("[data-home-open-rhythm]");
      if (openRhythm) {
        event.preventDefault();
        app.showView?.("rhythm");
      }
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
    window.addEventListener("life-rpg:smart-quest-change", scheduleRender);
    window.addEventListener("life-rpg:habit-complete", scheduleRender);
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
      app.showToast?.(`You need ${item.cost} Home point${item.cost === 1 ? "" : "s"}.`);
      return;
    }

    state().purchases[id] = Date.now();
    syncSpentPoints();
    app.saveState({ source: "home-talent-unlock" });
    render();
    skills.refreshTalentHub?.();
    scheduleBonusPass();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
  }

  function resetTree() {
    if (!Object.keys(state().purchases).length) {
      app.showToast?.("The Home tree is already empty.");
      return;
    }

    if (!window.confirm("Reset the Home talent tree? All spent Home points become available again. Past earned rewards stay earned.")) return;

    state().purchases = {};
    syncSpentPoints();
    app.saveState({ source: "home-tree-reset" });
    render();
    skills.refreshTalentHub?.();
    app.showToast?.("Home tree reset · all Home points are available again.");
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
    if (!document.getElementById("homeTalentTree")) return;
    renderBank();
    renderNodes();
    const tools = document.getElementById("homeTalentTools");
    if (tools) tools.innerHTML = renderTools();
  }

  function renderBank() {
    const bank = document.getElementById("homeTreePointBank");
    if (!bank) return;

    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `<small>HOME POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span>`;
  }

  function renderNodes() {
    const container = document.getElementById("homeTreeNodes");
    if (!container) return;

    container.innerHTML = [0, 1, 2, 3].map(tier => {
      const items = NODES.filter(item => item.tier === tier);
      return `<div class="home-tree-tier-v314ag3 tier-${tier}">${items.map(nodeMarkup).join("")}</div>`;
    }).join("");
  }

  function nodeMarkup(item) {
    const isBought = purchased(item.id);
    const prereqsMet = item.requires.every(purchased);
    const affordable = skills.getRealmPoints(REALM).available >= item.cost;
    const status = isBought ? "bought" : prereqsMet ? (affordable ? "available" : "short") : "locked";
    const prereq = item.requires.length
      ? item.requires.map(id => NODE_BY_ID[id]?.title).filter(Boolean).join(" + ")
      : "Tree root";

    return `<article class="home-node-v314ag3 branch-${escAttr(item.branch)} is-${status}">
      <div class="home-node-icon-v314ag3">${item.icon}</div>
      <div class="home-node-copy-v314ag3">
        <small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.effect)}</p>
        <em>${esc(prereq)}</em>
      </div>
      ${isBought
        ? `<button type="button" disabled>Unlocked ✓</button>`
        : `<button type="button" data-home-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`}
    </article>`;
  }

  function renderTools() {
    if (!purchased("home-compass")) {
      return `<div class="home-tools-locked-v314ag3"><span>🏠</span><div><strong>Home Compass unlocks the first Home utility.</strong><p>Your existing Home quests and Life/Admin logging remain available either way.</p></div></div>`;
    }

    const blocks = [homeDockMarkup()];
    if (purchased("quick-reset")) blocks.push(quickResetMarkup());
    if (purchased("paper-trail")) blocks.push(paperTrailMarkup());
    if (purchased("laundry-loop")) blocks.push(laundryLoopMarkup());
    if (purchased("room-rhythm")) blocks.push(roomRhythmMarkup());
    if (purchased("admin-dock")) blocks.push(adminDockMarkup());
    if (purchased("household-thread")) blocks.push(householdThreadMarkup());
    if (purchased("home-base")) blocks.push(homeBaseMarkup());
    return blocks.join("");
  }

  function homeDockMarkup() {
    const info = skills.getLevelInfo(SKILL_ID);
    const rank = app.getRealmRankInfo?.(REALM);
    const points = skills.getRealmPoints(REALM);
    const smart = smartState();
    const homeHabits = mappedHomeHabits();

    return `<section class="home-tool-card-v314ag3 home-dock-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>HOME COMPASS</small><h3>Home dock</h3><p>A compact view of practical life that is already in the system.</p></div>
        <span>🏠</span>
      </div>
      <div class="home-snapshot-v314ag3">
        <article><small>LIFE MANAGEMENT</small><strong>${info?.discovered ? `Lv. ${info.level}` : "Not trained yet"}</strong><span>${fmt(recentSkillXp(7))} Skill XP · last 7 days</span></article>
        <article><small>HOME REALM</small><strong>${rank ? `Rank ${rank.level}` : "—"}</strong><span>${points.available} Talent point${points.available === 1 ? "" : "s"} available</span></article>
        <article><small>CURRENT SIGNALS</small><strong>${signalCount(smart)}</strong><span>${signalSummary(smart)}</span></article>
      </div>
      <div class="home-action-row-v314ag3">
        <button class="primary-button" type="button" data-home-quest-role="10-minute-clean">🧹 10m clean</button>
        <button class="secondary-button" type="button" data-home-open-rhythm>◷ Focus & Time</button>
        ${homeHabits.length ? `<button class="secondary-button" type="button" data-home-open-habits>❀ Home habits · ${homeHabits.length}</button>` : ""}
      </div>
    </section>`;
  }

  function quickResetMarkup() {
    return `<section class="home-tool-card-v314ag3 branch-reset-card-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>QUICK RESET</small><h3>Small enough to start.</h3><p>These are existing Home quests. Completing them still happens through the normal quest/timer system.</p></div>
        <span>🧹</span>
      </div>
      <div class="home-route-grid-v314ag3">
        ${questRouteCard("10-minute-clean", "🧹", "10-Minute Clean")}
        ${questRouteCard("clear-surface", "🧽", "Clear One Surface")}
        ${questRouteCard("put-away-ten", "📦", "Put Away 10 Things")}
      </div>
    </section>`;
  }

  function paperTrailMarkup() {
    const paper = findQuestByRole("paper-pile");
    const available = paper ? app.getQuestAvailability?.(paper) : null;
    return `<section class="home-tool-card-v314ag3 branch-admin-card-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>PAPER TRAIL</small><h3>Practical admin without counting every piece of paper.</h3><p>Use real elapsed time for admin sessions. The paper-pile quest only appears when you have explicitly marked a pile waiting.</p></div>
        <span>📬</span>
      </div>
      <div class="home-action-row-v314ag3">
        <button class="primary-button" type="button" data-home-action="Paperwork" data-home-minutes="15">📬 Paperwork · 15m</button>
        <button class="secondary-button" type="button" data-home-action="Appointments" data-home-minutes="15">📅 Appointment admin · 15m</button>
        <button class="secondary-button" type="button" data-home-action="Errands" data-home-minutes="15">🛒 Errand · 15m</button>
        <button class="secondary-button" type="button" data-home-quest-role="paper-pile" ${paper && available?.available !== false ? "" : "disabled"}>📬 Paper pile${available?.available === false ? ` · ${esc(available.reason || "not waiting")}` : ""}</button>
      </div>
    </section>`;
  }

  function laundryLoopMarkup() {
    const smart = smartState();
    const state = smart?.laundry?.state || "none";
    const washing = findQuestByRole("laundry-cycle");
    const folding = findQuestByRole("laundry-fold");
    const washAvailability = washing ? app.getQuestAvailability?.(washing) : null;
    const foldAvailability = folding ? app.getQuestAvailability?.(folding) : null;
    const copy = {
      none: "No laundry step is marked waiting.",
      needs_washing: "A load is marked as needing washing.",
      drying: "A load is currently marked drying.",
      ready_fold: "A dry load is marked ready to fold."
    }[state] || "Laundry state is available.";

    return `<section class="home-tool-card-v314ag3 branch-household-card-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>LAUNDRY LOOP</small><h3>${esc(copy)}</h3><p>The Smart Quest state remains the source of truth, so the tree does not invent washing or folding work.</p></div>
        <span>🧺</span>
      </div>
      <div class="home-action-row-v314ag3">
        <button class="primary-button" type="button" data-home-quest-role="laundry-cycle" ${washing && washAvailability?.available !== false ? "" : "disabled"}>🧺 Start laundry cycle${washAvailability?.available === false ? ` · ${esc(washAvailability.reason || "")}` : ""}</button>
        <button class="secondary-button" type="button" data-home-quest-role="laundry-fold" ${folding && foldAvailability?.available !== false ? "" : "disabled"}>🧺 Fold & put away${foldAvailability?.available === false ? ` · ${esc(foldAvailability.reason || "")}` : ""}</button>
        <button class="secondary-button" type="button" data-home-quest-role="home-list">☷ Open Home quests</button>
      </div>
    </section>`;
  }

  function roomRhythmMarkup() {
    const route = smartHomeRoute();
    return `<section class="home-tool-card-v314ag3 branch-reset-card-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>ROOM RHYTHM · OPTIONAL</small><h3>${esc(route.title)}</h3><p>${esc(route.reason)}</p></div>
        <span>✦</span>
      </div>
      <button class="primary-button" type="button" data-home-smart-route>${esc(route.button)}</button>
      <small class="home-tool-note-v314ag3">This is a shortcut, not a recommendation quota.</small>
    </section>`;
  }

  function adminDockMarkup() {
    const minutes = recentHomeTime(7);
    return `<section class="home-tool-card-v314ag3 branch-admin-card-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>ADMIN DOCK</small><h3>Life/Admin in one place.</h3><p>${formatMinutes(minutes)} of Life/Admin time is logged in the last 7 days. That is context, not a target.</p></div>
        <span>🗂️</span>
      </div>
      <div class="home-action-row-v314ag3">
        <button class="primary-button" type="button" data-home-action="Paperwork" data-home-minutes="10">📬 Paperwork · 10m</button>
        <button class="secondary-button" type="button" data-home-action="Household" data-home-minutes="10">🏠 Household · 10m</button>
        <button class="secondary-button" type="button" data-home-action="Errands" data-home-minutes="20">🛒 Errand · 20m</button>
        <button class="secondary-button" type="button" data-home-action="Appointments" data-home-minutes="20">📅 Appointment · 20m</button>
      </div>
    </section>`;
  }

  function householdThreadMarkup() {
    const last = lastHomeSkillEvent();
    const route = routeFromLastEvent(last);
    return `<section class="home-tool-card-v314ag3 branch-household-card-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>HOUSEHOLD THREAD</small><h3>${last ? esc(last.label || "Recent Home practice") : "No Home trail yet."}</h3><p>${last ? `Last Life Management practice ${esc(humanAgo(last.at))}. ${route ? "A matching route is available below." : "Open Home quests if you want to choose something different."}` : "Once Life Management activity is logged, the latest thread will stay visible here."}</p></div>
        <span>⌁</span>
      </div>
      ${route
        ? `<button class="primary-button" type="button" data-home-repeat-last>${esc(route.button)}</button>`
        : `<button class="secondary-button" type="button" data-home-quest-role="home-list">Open Home quests</button>`}
    </section>`;
  }

  function homeBaseMarkup() {
    const today = localDateKey(new Date());
    const claimed = hasLedgerClaim(`home-base:${today}`);
    const route = smartHomeRoute();
    return `<section class="home-tool-card-v314ag3 home-keystone-v314ag3">
      <div class="home-tool-heading-v314ag3">
        <div><small>HOME BASE · KEYSTONE</small><h3>One practical next route, when you want one.</h3><p>${esc(route.reason)}</p></div>
        <span>✺</span>
      </div>
      <div class="home-keystone-row-v314ag3">
        <button class="primary-button" type="button" data-home-smart-route>${esc(route.button)}</button>
        <div>
          <strong>${claimed ? "✓ Today's first-practice Home bonus is already recorded." : "The first real Life Management practice today can add +1 Home Realm XP."}</strong>
          <small>No streak. Opening the button earns nothing.</small>
        </div>
      </div>
    </section>`;
  }

  function questRouteCard(role, icon, label) {
    const quest = findHomeQuest(role);
    const availability = quest ? app.getQuestAvailability?.(quest) : null;
    const ready = Boolean(quest) && availability?.available !== false;
    return `<article>
      <span>${icon}</span>
      <div><strong>${esc(label)}</strong><small>${quest ? esc(ready ? "Ready" : availability?.reason || "Not available right now") : "Quest not found"}</small></div>
      <button class="secondary-button" type="button" data-home-quest-role="${escAttr(role)}" ${quest ? "" : "disabled"}>${ready ? "Start / open" : "Open quest"}</button>
    </article>`;
  }

  function findHomeQuest(role) {
    const quests = app.getQuestCatalog?.() || [];
    if (role === "10-minute-clean") {
      return quests.find(quest => /10-minute clean/i.test(String(quest?.name || ""))) || null;
    }
    return quests.find(quest => String(quest?.systemRole || "") === role) || null;
  }

  function startOrOpenQuest(role) {
    if (role === "home-list") {
      openHomeQuests();
      return;
    }

    const quest = findHomeQuest(role);
    if (!quest) {
      openHomeQuests(role);
      return;
    }

    const availability = app.getQuestAvailability?.(quest);
    if (availability?.available === false) {
      openHomeQuests(quest.name);
      app.showToast?.(availability.reason || "That Home quest is not available right now.");
      return;
    }

    if (isMinuteQuest(quest) && !window.LifeRPGTime?.getActive?.()) {
      const started = window.LifeRPGTime?.startQuest?.({
        questId: quest.id,
        minutes: Math.max(1, Number(quest.planningMinutes || quest.units || 10))
      });
      if (started) return;
    }

    openHomeQuests(quest.name);
  }

  function isMinuteQuest(quest) {
    return /(?:^|\b)(?:min|minute|minutes)(?:\b|$)/i.test(String(quest?.unitLabel || ""));
  }

  function openHomeQuests(term = "") {
    app.showView?.("quests");
    window.setTimeout(() => {
      document.querySelector('[data-realm-filter="Home"]')?.click();
      const search = document.getElementById("questSearch");
      if (search && term) {
        search.value = term;
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 30);
  }

  function startHomeAction(subcategory, minutes) {
    if (!["Household", "Appointments", "Paperwork", "Errands"].includes(subcategory)) return;

    if (window.LifeRPGTime?.getActive?.()) {
      app.showToast?.("Another timer is already running. Stop or finish it first.");
      return;
    }

    const started = window.LifeRPGTime?.startAction?.({
      categoryId: "life_admin",
      subcategory,
      label: `Life / admin · ${subcategory}`,
      minutes: Math.max(1, Number(minutes || 10))
    });

    if (!started) {
      app.showView?.("rhythm");
      window.setTimeout(() => document.getElementById("clockCategory")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    }
  }

  function smartState() {
    return window.LifeRPGSmartQuests?.getState?.() || null;
  }

  function signalCount(smart) {
    if (!smart) return "—";
    let count = smart.paperPileOpen ? 1 : 0;
    if (smart.laundry?.state && smart.laundry.state !== "none") count += 1;
    return String(count);
  }

  function signalSummary(smart) {
    if (!smart) return "Smart Home signals unavailable";
    const parts = [];
    if (smart.paperPileOpen) parts.push("paper pile waiting");
    if (smart.laundry?.state === "needs_washing") parts.push("laundry waiting");
    if (smart.laundry?.state === "drying") parts.push("laundry drying");
    if (smart.laundry?.state === "ready_fold") parts.push("laundry ready to fold");
    return parts.length ? parts.join(" · ") : "nothing explicitly marked waiting";
  }

  function smartHomeRoute() {
    const smart = smartState();

    if (smart?.laundry?.state === "needs_washing") {
      return { type: "quest", role: "laundry-cycle", title: "A laundry step is actually waiting.", reason: "Smart Quests says a load needs washing, so the route uses that real signal.", button: "🧺 Start laundry cycle" };
    }
    if (smart?.laundry?.state === "ready_fold") {
      return { type: "quest", role: "laundry-fold", title: "A dry load is ready to finish.", reason: "Smart Quests says a load is ready to fold, so the route keeps that thread visible.", button: "🧺 Fold & put away one load" };
    }
    if (smart?.paperPileOpen) {
      return { type: "quest", role: "paper-pile", title: "A paper pile is marked waiting.", reason: "You explicitly marked a real paper/post pile, so the route does not invent a different chore.", button: "📬 Work on the paper pile" };
    }

    const clean = findHomeQuest("10-minute-clean");
    const clear = findHomeQuest("clear-surface");
    const cleanReady = clean && app.getQuestAvailability?.(clean)?.available !== false;
    const clearReady = clear && app.getQuestAvailability?.(clear)?.available !== false;

    if (cleanReady) {
      return { type: "quest", role: "10-minute-clean", title: "A short Home reset is available.", reason: "No explicit household signal is waiting, so the route stays small with the existing 10-Minute Clean.", button: "🧹 Start 10-Minute Clean" };
    }
    if (clearReady) {
      return { type: "quest", role: "clear-surface", title: "One surface is enough.", reason: "The general clean is not currently available, so the route uses the smaller existing surface reset.", button: "🧽 Clear one surface" };
    }

    return { type: "list", role: "home-list", title: "Choose from Home when it is useful.", reason: "There is no clear waiting signal, so Life RPG does not manufacture one.", button: "☷ Open Home quests" };
  }

  function runSmartHomeRoute() {
    const route = smartHomeRoute();
    startOrOpenQuest(route.role);
  }

  function lastHomeSkillEvent() {
    return skillEvents()
      .filter(event => event?.skillId === SKILL_ID)
      .sort((a, b) => timestamp(b.at) - timestamp(a.at))[0] || null;
  }

  function routeFromLastEvent(event) {
    if (!event) return null;
    const label = String(event.label || "").toLowerCase();
    const sub = String(event.metadata?.subcategory || "").toLowerCase();

    if (/paper pile/.test(label)) return { kind: "quest", role: "paper-pile", button: "📬 Return to paper pile" };
    if (/laundry/.test(label)) return { kind: "quest", role: "home-list", button: "🧺 Open laundry/Home quests" };
    if (/clear one surface/.test(label)) return { kind: "quest", role: "clear-surface", button: "🧽 Clear one surface again" };
    if (/put away/.test(label)) return { kind: "quest", role: "put-away-ten", button: "📦 Put away 10 things" };
    if (/10-minute clean|clean/.test(label)) return { kind: "quest", role: "10-minute-clean", button: "🧹 Start another 10m clean" };

    const mapping = {
      "paperwork": "Paperwork",
      "appointments": "Appointments",
      "errands": "Errands",
      "household": "Household"
    };
    if (mapping[sub]) return { kind: "timer", subcategory: mapping[sub], minutes: 10, button: `◷ ${mapping[sub]} · 10m` };

    return null;
  }

  function repeatLastHomeRoute() {
    const route = routeFromLastEvent(lastHomeSkillEvent());
    if (!route) {
      openHomeQuests();
      return;
    }
    if (route.kind === "timer") startHomeAction(route.subcategory, route.minutes);
    else startOrOpenQuest(route.role);
  }

  function mappedHomeHabits() {
    return (app.getState().habits?.items || [])
      .filter(item => item && item.active !== false && item.skillId === SKILL_ID);
  }

  function recentHomeTime(days) {
    const after = Date.now() - Math.max(1, Number(days || 1)) * 86400000;
    return (app.getState().timeTracking?.entries || [])
      .filter(entry => entry?.categoryId === "life_admin" && timestamp(entry.endAt || entry.startAt || entry.createdAt) >= after)
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.durationSeconds || 0) / 60 || Number(entry.minutes || 0)), 0);
  }

  function scheduleBonusPass() {
    if (applyingBonus || !purchased("home-base")) return;
    window.setTimeout(applyBonus, 70);
  }

  function applyBonus() {
    if (applyingBonus || !purchased("home-base")) return;
    applyingBonus = true;

    try {
      const unlockedAt = purchaseTime("home-base");
      const dates = new Set();

      skillEvents().forEach(event => {
        if (event?.skillId !== SKILL_ID) return;
        const at = timestamp(event.at);
        if (!at || at < unlockedAt) return;
        dates.add(localDateKey(new Date(at)));
      });

      [...dates].sort().forEach(date => {
        const sourceId = `home-base:${date}`;
        if (hasLedgerClaim(sourceId)) return;

        const reward = app.awardActivity?.({
          source: "home-talent-bonus",
          sourceId,
          label: "Home Base",
          realm: REALM,
          capability: "wellbeing",
          xp: 0,
          realmXP: 1,
          statXP: 0,
          coins: 0,
          storyEnergyBase: 0,
          progressionRelevant: false,
          at: `${date}T23:50:00`,
          metadata: { talentTree: "home", realmXPBonus: 1 }
        });

        if (!reward) return;
        state().bonusClaims[sourceId] = reward.eventId || true;
        app.saveState({ source: "home-talent-bonus" });

        if (date === localDateKey(new Date())) {
          app.showToast?.("🏠 Home Base · +1 Home Realm XP");
        }
      });
    } finally {
      applyingBonus = false;
      render();
    }
  }

  function hasLedgerClaim(sourceId) {
    return (app.getState().rewardLedger?.events || []).some(event =>
      event?.source === "home-talent-bonus" && event?.sourceId === sourceId
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
    const time = timestamp(value);
    if (!time) return "some time ago";
    const mins = Math.floor(Math.max(0, Date.now() - time) / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function formatMinutes(value) {
    const minutes = Math.max(0, Math.round(Number(value || 0)));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  function timestamp(value) {
    const n = typeof value === "number" ? value : new Date(value || 0).getTime();
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function round2(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function fmt(value) {
    const n = round2(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  window.LifeRPGHomeTree = {
    version: VERSION,
    nodes: NODES.map(item => ({ ...item })),
    open: () => {
      skills.open?.();
      window.setTimeout(() => skills.selectTalentRealm?.(REALM), 20);
    },
    render
  };
})();
