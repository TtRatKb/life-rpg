(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Daily Briefing could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 1;
  const SHADOW_KEY = "life-rpg-daily-planner-shadow-v1";
  const MAX_DAY_HISTORY = 120;
  const MAX_COMPANION_HISTORY = 45;
  const LEGACY_LOADOUT_IDS = new Set(["q-work-focus", "q-home-clean", "q-recovery-gaming"]);

  const SLOTS = {
    focus: {
      icon: "🎯",
      kicker: "FOCUS PICK",
      title: "One useful thing",
      className: "focus"
    },
    joy: {
      icon: "🌸",
      kicker: "JOY PICK",
      title: "Something for you",
      className: "joy"
    },
    gentle: {
      icon: "☕",
      kicker: "GENTLE PICK",
      title: "Low-pressure option",
      className: "gentle"
    }
  };

  const LABELS = {
    sleep: { bad: "Bad", meh: "Meh", fine: "Fine", great: "Great" },
    energy: { fumes: "Running on fumes", low: "Low", okay: "Okay", lots: "Lots" },
    time: { none: "Almost none", little: "A little", decent: "A decent amount", plenty: "Plenty" },
    obligations: { help: "Please send help", busy: "Busy", normal: "Normal", open: "Pretty open" }
  };

  const VALUE = {
    sleep: { bad: 0, meh: 1, fine: 2, great: 3 },
    energy: { fumes: 0, low: 1, okay: 2, lots: 3 },
    time: { none: 0, little: 1, decent: 2, plenty: 3 },
    obligations: { help: 0, busy: 1, normal: 2, open: 3 }
  };

  const TIME_BUDGET = { none: 12, little: 30, decent: 65, plenty: 130 };
  const PRIORITY_SCORE = { "Must Do": 3.3, Main: 2.5, "Low Energy": 1.3, Optional: 0.7, Bonus: 0.2 };
  const DEMAND_BY_REALM = { Recovery: 0.35, Hobbies: 0.8, Home: 1.1, Japanese: 1.55, Knowledge: 1.65, Health: 1.85, Work: 2.15 };

  const els = {
    heroButton: byId("heroDailyBriefingButton"),
    panel: byId("dailyBriefingPanel"),
    start: byId("dailyBriefingStart"),
    edit: byId("dailyBriefingEdit"),
    companion: byId("dailyCompanion"),
    state: byId("dailyBriefingState"),
    picks: byId("dailyPicks"),
    picksPanel: byId("dailyPicksPanel"),
    picksEmpty: byId("dailyPicksEmpty"),
    picksCount: byId("dailyPicksCount"),
    dialog: byId("dailyBriefingDialog"),
    form: byId("dailyBriefingForm"),
    dialogTitle: byId("dailyBriefingDialogTitle"),
    dialogCompanion: byId("dailyDialogCompanion"),
    close: byId("dailyBriefingClose"),
    cancel: byId("dailyBriefingCancel"),
    gentle: byId("dailyGentle")
  };

  let initialized = false;
  let provisionalCompanion = null;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("daily-planner-init", { render: false });
    render();
  }

  function bindEvents() {
    els.start?.addEventListener("click", () => openBriefing(false));
    els.edit?.addEventListener("click", () => openBriefing(true));
    els.heroButton?.addEventListener("click", handleHeroAction);
    els.close?.addEventListener("click", closeBriefing);
    els.cancel?.addEventListener("click", closeBriefing);
    els.form?.addEventListener("submit", saveBriefing);

    document.addEventListener("click", event => {
      const reroll = event.target.closest?.("[data-daily-reroll]");
      if (reroll) {
        rerollSlot(reroll.dataset.dailyReroll);
        return;
      }

      const log = event.target.closest?.("[data-daily-log]");
      if (log) {
        openQuestLog(log.dataset.dailyLog, Number(log.dataset.dailyUnits || 0));
        return;
      }

      const adventureLog = event.target.closest?.("[data-daily-adventure-log]");
      if (adventureLog) {
        window.LifeRPGAdventures?.openLog?.(adventureLog.dataset.dailyAdventureLog);
        return;
      }

      const bookLog = event.target.closest?.("[data-daily-book-log]");
      if (bookLog) {
        window.LifeRPGLibrary?.openLog?.(bookLog.dataset.dailyBookLog, {
          type: bookLog.dataset.dailyBookGoalType || "pages",
          amount: Number(bookLog.dataset.dailyBookGoalAmount || 0)
        });
      }
    });

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });

    window.addEventListener("life-rpg:adventure-change", () => {
      if (!initialized) return;
      render();
    });

    window.addEventListener("life-rpg:library-change", () => {
      if (!initialized) return;
      render();
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;

    if (!state.dailyPlanner || typeof state.dailyPlanner !== "object" || Array.isArray(state.dailyPlanner)) {
      state.dailyPlanner = readShadow() || defaultState();
      changed = true;
    }

    const planner = state.dailyPlanner;
    if (Number(planner.schemaVersion || 0) < SCHEMA) {
      planner.schemaVersion = SCHEMA;
      changed = true;
    }
    if (!planner.days || typeof planner.days !== "object" || Array.isArray(planner.days)) {
      planner.days = {};
      changed = true;
    }
    if (!Array.isArray(planner.companionHistory)) {
      planner.companionHistory = [];
      changed = true;
    }

    if (!planner.migrations || typeof planner.migrations !== "object") {
      planner.migrations = {};
      changed = true;
    }

    // The visible manual loadout is retired in V0.14. Keep the quest library itself untouched.
    if (!planner.migrations.retiredLegacyLoadout) {
      if (Array.isArray(state.selectedQuestIds)) {
        const onlyLegacy = state.selectedQuestIds.length > 0 && state.selectedQuestIds.every(id => LEGACY_LOADOUT_IDS.has(id));
        if (onlyLegacy) state.selectedQuestIds = [];
      }
      planner.migrations.retiredLegacyLoadout = true;
      changed = true;
    }

    trimHistory(planner);
    writeShadow(planner);
    return changed;
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA,
      days: {},
      companionHistory: [],
      migrations: {}
    };
  }

  function plannerState() {
    ensureState();
    return app.getState().dailyPlanner;
  }

  function readShadow() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object") return null;
      return value;
    } catch {
      return null;
    }
  }

  function writeShadow(value) {
    try {
      localStorage.setItem(SHADOW_KEY, JSON.stringify(value));
    } catch {
      // Main save remains canonical; this is only a small local recovery shadow.
    }
  }

  function persist(source, { render: shouldRender = true } = {}) {
    const planner = plannerState();
    trimHistory(planner);
    writeShadow(planner);
    app.saveState({ source });
    if (shouldRender) render();
  }

  function trimHistory(planner) {
    const keys = Object.keys(planner.days || {}).sort();
    while (keys.length > MAX_DAY_HISTORY) {
      delete planner.days[keys.shift()];
    }
    if (Array.isArray(planner.companionHistory) && planner.companionHistory.length > MAX_COMPANION_HISTORY) {
      planner.companionHistory = planner.companionHistory.slice(-MAX_COMPANION_HISTORY);
    }
  }

  function todayRecord() {
    return plannerState().days[todayKey()] || null;
  }

  function render() {
    const day = todayRecord();
    renderBriefing(day);
    renderPicks(day);
    renderHeroButton(day);
  }

  function renderHeroButton(day) {
    if (!els.heroButton) return;
    if (day?.checkIn) {
      els.heroButton.innerHTML = "<span>✦</span> Review today's picks";
      return;
    }
    els.heroButton.innerHTML = "<span>✦</span> Start today's briefing";
  }

  function handleHeroAction() {
    const day = todayRecord();
    if (day?.checkIn) {
      els.panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      openBriefing(false);
    }
  }

  function renderBriefing(day) {
    if (!els.state || !els.companion) return;

    if (!day?.checkIn) {
      const candidate = companionForDate();
      els.companion.innerHTML = companionMarkup(candidate, { preview: true });
      els.state.innerHTML = `
        <div class="daily-not-started-v14">
          <span class="daily-not-started-icon-v14">✦</span>
          <div>
            <strong>Four quick questions. Then the choices get smaller.</strong>
            <p>Sleep, energy, free time and how full your obligation plate already is. No scoring, no judgement.</p>
          </div>
        </div>`;
      els.start?.classList.remove("hidden");
      if (els.start) els.start.textContent = "Start today's briefing";
      els.edit?.classList.add("hidden");
      return;
    }

    els.companion.innerHTML = companionMarkup(companionById(day.companion?.id) || companionForDate(), { day });
    els.state.innerHTML = briefingSummaryMarkup(day.checkIn);
    els.start?.classList.add("hidden");
    els.edit?.classList.remove("hidden");
  }

  function briefingSummaryMarkup(checkIn) {
    const capacity = capacityLabel(checkIn);
    return `
      <div class="daily-summary-v14">
        <div class="daily-summary-chip-v14"><span>☾</span><div><small>SLEEP</small><strong>${esc(LABELS.sleep[checkIn.sleep] || checkIn.sleep)}</strong></div></div>
        <div class="daily-summary-chip-v14"><span>⚡</span><div><small>ENERGY</small><strong>${esc(LABELS.energy[checkIn.energy] || checkIn.energy)}</strong></div></div>
        <div class="daily-summary-chip-v14"><span>◷</span><div><small>FREE TIME</small><strong>${esc(LABELS.time[checkIn.time] || checkIn.time)}</strong></div></div>
        <div class="daily-summary-chip-v14"><span>☷</span><div><small>OBLIGATIONS</small><strong>${esc(LABELS.obligations[checkIn.obligations] || checkIn.obligations)}</strong></div></div>
      </div>
      <div class="daily-capacity-note-v14 ${checkIn.gentle ? "gentle" : ""}">
        <span>${checkIn.gentle ? "♡" : "✿"}</span>
        <div><small>PLANNER READ</small><strong>${esc(capacity.title)}</strong><p>${esc(capacity.text)}</p></div>
      </div>`;
  }

  function capacityLabel(checkIn) {
    const sleep = VALUE.sleep[checkIn.sleep] ?? 1;
    const energy = VALUE.energy[checkIn.energy] ?? 1;
    const time = VALUE.time[checkIn.time] ?? 1;
    const obligations = VALUE.obligations[checkIn.obligations] ?? 1;
    const score = sleep * 0.2 + energy * 0.4 + time * 0.2 + obligations * 0.2 - (checkIn.gentle ? 1.1 : 0);

    if (checkIn.gentle || score < 0.8) {
      return { title: "Keep the floor low today.", text: "Short, forgiving options get priority. Finishing one small thing is enough." };
    }
    if (score < 1.55) {
      return { title: "A lighter day fits best.", text: "The planner will avoid stacking high-friction choices and keep the suggested chunks small." };
    }
    if (score < 2.35) {
      return { title: "You have some usable room.", text: "A meaningful focus task can fit, but the day still gets a joy pick and an easy exit." };
    }
    return { title: "There is room for a bigger move.", text: "The focus pick can be more ambitious without turning the entire day into productivity mode." };
  }

  function renderPicks(day) {
    if (!els.picks || !els.picksEmpty || !els.picksCount) return;
    if (!day?.checkIn) {
      els.picks.innerHTML = "";
      els.picksEmpty.classList.remove("hidden");
      els.picksCount.textContent = "Waiting for briefing";
      return;
    }

    const picks = Array.isArray(day.picks) ? day.picks : [];
    if (!picks.length) {
      els.picks.innerHTML = `
        <div class="daily-no-candidates-v14">
          <span>☷</span><div><strong>I couldn't build a useful set yet.</strong><p>Add a few quests, Side Adventures, or books marked Reading and the planner will have something concrete to choose from.</p></div>
        </div>`;
      els.picksEmpty.classList.add("hidden");
      els.picksCount.textContent = "No candidates";
      return;
    }

    els.picksEmpty.classList.add("hidden");
    els.picksCount.textContent = `${picks.length} picked for today`;
    els.picks.innerHTML = picks.map(pickCardMarkup).join("");
  }

  function pickCardMarkup(pick) {
    const slot = SLOTS[pick.slot] || SLOTS.focus;

    if (pick.sourceType === "book") {
      const book = findBook(pick.sourceId);
      if (!book) return unavailablePickMarkup(pick, slot, "This book is no longer in the Library. Reroll this card to replace it.");
      const done = bookTouchedToday(book.id);
      if (book.status !== "reading" && !done) return unavailablePickMarkup(pick, slot, "This book is no longer marked Reading. Reroll this card to replace it.");
      const progress = bookProgress(book);
      const role = bookRoleMeta(book.role);
      const goal = pick.bookGoal || bookGoal(book, pick.slot, todayRecord()?.checkIn || {});
      const progressLine = progress === null
        ? (book.currentPage > 0 ? `Page ${formatNumber(book.currentPage)}` : "Reading progress can stay light")
        : `${progress}% complete · page ${formatNumber(book.currentPage)} / ${formatNumber(book.totalPages)}`;
      return `
        <article class="daily-pick-v14 ${slot.className} daily-book-pick-v16 ${done ? "done" : ""}">
          <div class="daily-pick-top-v14">
            <span class="daily-pick-icon-v14">${slot.icon}</span>
            <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
            ${done ? '<span class="daily-pick-done-v14">✓ Read today</span>' : ""}
          </div>
          <div class="daily-pick-quest-v14">
            <div class="daily-adventure-meta-v15 daily-book-meta-v16">
              <span class="daily-realm-pill-v14">${role.icon} ${esc(role.label)}</span>
              <span class="daily-adventure-source-v15">📚 Library</span>
              <span class="daily-adventure-progress-v15">${esc(progressLine)}</span>
            </div>
            <h3>${esc(book.title || "Untitled book")}</h3>
            ${book.author ? `<p class="daily-book-author-v16">${esc(book.author)}</p>` : ""}
            <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(goal.label)}</strong></div></div>
            <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonForBook(book, pick.slot, todayRecord()?.checkIn || {}))}</p>
          </div>
          <div class="daily-pick-actions-v14">
            <button class="primary-button" data-daily-book-log="${escAttr(book.id)}" data-daily-book-goal-type="${escAttr(goal.type)}" data-daily-book-goal-amount="${Number(goal.amount || 0)}" type="button">${done ? "Log more" : "Log this reading"}</button>
            <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
          </div>
        </article>`;
    }

    if (pick.sourceType === "adventure") {
      const adventure = findAdventure(pick.sourceId);
      if (!adventure) return unavailablePickMarkup(pick, slot, "This Side Adventure is no longer active. Reroll this card to replace it.");
      const done = adventureTouchedToday(adventure.id);
      const progress = adventure.progressMode === "percent" ? clamp(Number(adventure.progress || 0), 0, 100) : null;
      const finishLine = adventure.nextAction || "Spend one focused session on this.";
      return `
        <article class="daily-pick-v14 ${slot.className} daily-adventure-pick-v15 ${done ? "done" : ""}">
          <div class="daily-pick-top-v14">
            <span class="daily-pick-icon-v14">${slot.icon}</span>
            <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
            ${done ? '<span class="daily-pick-done-v14">✓ Touched today</span>' : ""}
          </div>
          <div class="daily-pick-quest-v14">
            <div class="daily-adventure-meta-v15">
              <span class="daily-realm-pill-v14">${realmIcon(adventure.realm)} ${esc(adventure.realm || "Hobbies")}</span>
              <span class="daily-adventure-source-v15">✧ Side Adventure</span>
              ${progress === null ? "" : `<span class="daily-adventure-progress-v15">${progress}% complete</span>`}
            </div>
            <h3>${esc(adventure.name || "Untitled adventure")}</h3>
            <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(finishLine)}</strong></div></div>
            <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonForAdventure(adventure, pick.slot, todayRecord()?.checkIn || {}))}</p>
          </div>
          <div class="daily-pick-actions-v14">
            <button class="primary-button" data-daily-adventure-log="${escAttr(adventure.id)}" type="button">${done ? "Log more" : "Log this step"}</button>
            <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
          </div>
        </article>`;
    }

    const quest = findQuest(pick.sourceId);
    if (!quest) return unavailablePickMarkup(pick, slot, "This item is no longer in the Quest Board. Reroll this card to replace it.");

    const progress = todayQuestUnits(quest.id);
    const goal = Number(pick.suggestedUnits || quest.target || 1);
    const done = progress >= goal - 1e-9;
    const unitLabel = friendlyUnitLabel(quest.unitLabel, goal);
    const goalText = goalLabel(quest, goal);
    const progressText = progress > 0 ? `${formatNumber(progress)} / ${formatNumber(goal)} ${unitLabel}` : goalText;

    return `
      <article class="daily-pick-v14 ${slot.className} ${done ? "done" : ""}">
        <div class="daily-pick-top-v14">
          <span class="daily-pick-icon-v14">${slot.icon}</span>
          <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
          ${done ? '<span class="daily-pick-done-v14">✓ Done</span>' : ""}
        </div>
        <div class="daily-pick-quest-v14">
          <span class="daily-realm-pill-v14">${realmIcon(quest.realm)} ${esc(quest.realm || "Quest")}</span>
          <h3>${esc(quest.name || "Untitled quest")}</h3>
          <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(done ? progressText : goalText)}</strong></div></div>
          <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonFor(quest, pick.slot, todayRecord()?.checkIn || {}))}</p>
        </div>
        <div class="daily-pick-actions-v14">
          <button class="primary-button" data-daily-log="${escAttr(quest.id)}" data-daily-units="${goal}" type="button">${done ? "Log more" : "Log progress"}</button>
          <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
        </div>
      </article>`;
  }

  function unavailablePickMarkup(pick, slot, message) {
    return `
      <article class="daily-pick-v14 ${slot.className} unavailable">
        <div class="daily-pick-top-v14"><span class="daily-pick-icon-v14">${slot.icon}</span><div><small>${slot.kicker}</small><strong>${slot.title}</strong></div></div>
        <p>${esc(message)}</p>
        <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Another</button>
      </article>`;
  }

  function openBriefing(editing) {
    if (!els.dialog || !els.form) return;
    const existing = todayRecord();
    provisionalCompanion = existing?.companion?.id ? companionById(existing.companion.id) : companionForDate();
    renderDialogCompanion(provisionalCompanion);

    els.form.reset();
    if (editing && existing?.checkIn) fillCheckIn(existing.checkIn);
    if (els.dialogTitle) els.dialogTitle.textContent = editing ? "Adjust today's check-in." : dialogTitleFor(provisionalCompanion);
    els.dialog.showModal();
  }

  function fillCheckIn(checkIn) {
    setRadio("dailySleep", checkIn.sleep);
    setRadio("dailyEnergy", checkIn.energy);
    setRadio("dailyTime", checkIn.time);
    setRadio("dailyObligations", checkIn.obligations);
    if (els.gentle) els.gentle.checked = Boolean(checkIn.gentle);
  }

  function setRadio(name, value) {
    const input = els.form?.querySelector(`input[name="${name}"][value="${cssEscape(value)}"]`);
    if (input) input.checked = true;
  }

  function renderDialogCompanion(companion) {
    if (!els.dialogCompanion) return;
    const c = companion || companionById("luca");
    els.dialogCompanion.innerHTML = `
      <div class="daily-dialog-avatar-v14 ${escAttr(c.id)}">${companionImage(c, true)}</div>
      <div><small>${esc(c.kicker)}</small><strong>${esc(c.name)}</strong><p>${esc(c.dialogLine)}</p></div>`;
  }

  function closeBriefing() {
    if (els.dialog?.open) els.dialog.close();
  }

  function saveBriefing(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;

    const checkIn = {
      sleep: radioValue("dailySleep"),
      energy: radioValue("dailyEnergy"),
      time: radioValue("dailyTime"),
      obligations: radioValue("dailyObligations"),
      gentle: Boolean(els.gentle?.checked)
    };

    const planner = plannerState();
    const key = todayKey();
    const existing = planner.days[key] || {};
    const companion = provisionalCompanion || companionForDate();
    const day = {
      ...existing,
      date: key,
      checkIn,
      companion: { id: companion.id },
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now(),
      rerollHistory: existing.rerollHistory || { focus: [], joy: [], gentle: [] }
    };

    day.picks = buildPicks(checkIn, existing.picks || [], day.rerollHistory);
    planner.days[key] = day;
    recordCompanion(planner, key, companion.id);
    persist(existing.checkIn ? "daily-briefing-edit" : "daily-briefing-create");
    closeBriefing();
    requestAnimationFrame(() => els.panel?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function radioValue(name) {
    return els.form?.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function buildPicks(checkIn, previousPicks = [], rerollHistory = {}) {
    const quests = eligibleQuests();
    const adventures = eligibleAdventures();
    const books = eligibleBooks();
    if (!quests.length && !adventures.length && !books.length) return [];

    const picked = [];
    const used = new Set();
    const previousBySlot = Object.fromEntries(previousPicks.map(p => [p.slot, p]));

    for (const slot of ["focus", "joy", "gentle"]) {
      const previous = previousBySlot[slot];
      const excluded = new Set(rerollHistory[slot] || []);
      const candidate = chooseSourceCandidate(slot, checkIn, quests, adventures, books, used, excluded, previous);
      if (!candidate) continue;
      used.add(sourceKey(candidate.sourceType, candidate.item.id));
      picked.push(makePickFromCandidate(slot, candidate, checkIn, previous));
    }

    return picked;
  }

  function eligibleQuests() {
    const state = app.getState();
    const quests = Array.isArray(state.quests) ? state.quests : [];
    return quests.filter(q => q && q.id && q.name && q.archived !== true && q.active !== false);
  }

  function eligibleAdventures() {
    const items = app.getState().sideAdventures?.items;
    return Array.isArray(items) ? items.filter(item => item && item.id && item.name && item.status === "active") : [];
  }

  function eligibleBooks() {
    const items = app.getState().bookLibrary?.items;
    return Array.isArray(items) ? items.filter(book => book && book.id && book.title && book.status === "reading") : [];
  }

  function chooseSourceCandidate(slot, checkIn, quests, adventures, books, used, excluded, previous = null) {
    const currentKey = previous ? sourceKey(previous.sourceType || "quest", previous.sourceId) : "";
    const currentId = previous?.sourceId || "";
    const seed = `${todayKey()}|${slot}|${Object.values(checkIn).join("|")}|${[...excluded].join(",")}`;

    const buildPool = relaxed => {
      const candidates = [];
      const allowed = (type, item) => {
        const key = sourceKey(type, item.id);
        if (used.has(key)) return false;
        if (!relaxed && (excluded.has(key) || excluded.has(item.id) || key === currentKey || item.id === currentId)) return false;
        if (relaxed === 1 && (key === currentKey || item.id === currentId)) return false;
        return true;
      };

      quests.filter(item => allowed("quest", item)).forEach(quest => candidates.push({ sourceType: "quest", item: quest, score: scoreQuest(quest, slot, checkIn) + seededJitter(`${seed}|quest|${quest.id}`) }));
      if (slot !== "focus") {
        adventures.filter(item => allowed("adventure", item)).forEach(item => candidates.push({ sourceType: "adventure", item, score: scoreAdventure(item, slot, checkIn) + seededJitter(`${seed}|adventure|${item.id}`) }));
      }
      books.filter(item => allowed("book", item)).forEach(book => candidates.push({ sourceType: "book", item: book, score: scoreBook(book, slot, checkIn) + seededJitter(`${seed}|book|${book.id}`) }));
      return candidates;
    };

    let pool = buildPool(0);
    if (!pool.length) pool = buildPool(1);
    if (!pool.length) pool = buildPool(2);
    return pool.sort((a, b) => b.score - a.score)[0] || null;
  }

  function makePickFromCandidate(slot, candidate, checkIn, previous = null) {
    if (candidate.sourceType === "book") {
      return {
        slot,
        sourceType: "book",
        sourceId: candidate.item.id,
        bookGoal: bookGoal(candidate.item, slot, checkIn),
        reason: reasonForBook(candidate.item, slot, checkIn),
        rerolls: Number(previous?.rerolls || 0),
        pickedAt: Date.now()
      };
    }
    if (candidate.sourceType === "adventure") {
      return {
        slot,
        sourceType: "adventure",
        sourceId: candidate.item.id,
        reason: reasonForAdventure(candidate.item, slot, checkIn),
        rerolls: Number(previous?.rerolls || 0),
        pickedAt: Date.now()
      };
    }
    return makePick(slot, candidate.item, checkIn, previous);
  }

  function makePick(slot, quest, checkIn, previous = null) {
    return {
      slot,
      sourceType: "quest",
      sourceId: quest.id,
      suggestedUnits: suggestedUnits(quest, slot, checkIn),
      reason: reasonFor(quest, slot, checkIn),
      rerolls: Number(previous?.rerolls || 0),
      pickedAt: Date.now()
    };
  }

  function scoreQuest(quest, slot, checkIn) {
    const realm = String(quest.realm || "");
    const priority = String(quest.priority || "Optional");
    const capacity = effectiveCapacity(checkIn);
    const demand = questDemand(quest);
    const duration = estimatedMinutes(quest);
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const logs = questLogs(quest.id);
    const daysSince = daysSinceLast(logs);
    const doneToday = todayQuestUnits(quest.id) > 0;

    let score = 0;
    score += matchDemand(capacity, demand) * 2.2;
    if (duration) score += duration <= timeBudget ? 1.5 : -Math.min(4, (duration - timeBudget) / 20);
    score += Math.min(1.6, Math.max(0, daysSince - 2) * 0.09);
    if (doneToday) score -= 5;
    if (wasDoneYesterday(quest.id)) score -= 1.15;
    score -= cooldownPenalty(quest, logs);
    if (looksLikeGenericReadingQuest(quest) && hasSpecificReadingBookForRealm(realm)) score -= 3.4;

    if (slot === "focus") {
      score += PRIORITY_SCORE[priority] ?? 0.5;
      if (["Work", "Knowledge", "Japanese", "Home", "Health"].includes(realm)) score += 1.4;
      if (["Hobbies", "Recovery"].includes(realm)) score -= 0.4;
      if (checkIn.obligations === "help" && realm === "Work") score -= 1.6;
      if (checkIn.gentle && demand > 1.3) score -= 2.2;
    }

    if (slot === "joy") {
      if (realm === "Hobbies") score += 4;
      if (realm === "Recovery") score += 3;
      if (priority === "Optional" || priority === "Bonus") score += 1.2;
      if (realm === "Work") score -= 4;
      if (realm === "Home") score -= 1;
    }

    if (slot === "gentle") {
      if (realm === "Recovery") score += 4.5;
      if (priority === "Low Energy") score += 3;
      if (realm === "Hobbies") score += 1.4;
      if (demand <= 0.9) score += 2;
      if (duration && duration <= 20) score += 1.4;
      if (realm === "Work") score -= 3;
      if (demand > 1.6) score -= 2.5;
    }

    return score;
  }

  function looksLikeGenericReadingQuest(quest) {
    const name = String(quest?.name || "").toLowerCase();
    const unit = String(quest?.unitLabel || "").toLowerCase();
    return /read|reading|book|buch|lesen/.test(name) && /page|seite|chapter|kapitel|min|minute/.test(unit);
  }

  function hasSpecificReadingBookForRealm(realm) {
    return eligibleBooks().some(book => bookRoleMeta(book.role).realm === realm);
  }

  function scoreAdventure(item, slot, checkIn) {
    const capacity = effectiveCapacity(checkIn);
    const demand = adventureDemand(item);
    const duration = Number(item.sessionMinutes || 30);
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const days = daysSinceTimestamp(item.lastTouchedAt || item.createdAt);
    const progress = item.progressMode === "percent" ? Number(item.progress || 0) : 0;
    const tags = new Set(item.reasonTags || []);
    let score = matchDemand(capacity, demand) * 2.2;

    score += duration <= timeBudget ? 1.8 : -Math.min(4.2, (duration - timeBudget) / 18);
    score += Math.min(2.2, Math.max(0, days - 3) * 0.12);
    if (!Number(item.sessions || 0)) score += 0.8;
    if (adventureTouchedToday(item.id)) score -= 5.2;
    if (progress >= 60) score += 0.55;
    if (progress >= 80) score += 0.75;
    if (tags.has("takes-space")) score += 0.55;
    if (tags.has("want-result")) score += 0.35;
    if (tags.has("deadline")) score += 0.65;

    if (slot === "joy") {
      score += 4.8;
      if (["Hobbies", "Recovery"].includes(item.realm)) score += 0.8;
      if (tags.has("fun")) score += 0.75;
      if (item.energy === "high" && effectiveCapacity(checkIn) < 1.4) score -= 2.2;
    }

    if (slot === "gentle") {
      if (item.energy === "low") score += 4.2;
      if (duration <= 20) score += 2.1;
      else if (duration <= 30) score += 0.9;
      if (item.energy === "high") score -= 4.5;
      if (checkIn.gentle && item.energy === "low") score += 1.4;
    }

    return score;
  }

  function scoreBook(book, slot, checkIn) {
    const role = book.role || "fun";
    const capacity = effectiveCapacity(checkIn);
    const demand = bookDemand(book);
    const goal = bookGoal(book, slot, checkIn);
    const duration = goal.type === "minutes" ? goal.amount : goal.type === "pages" ? goal.amount * 2 : goal.type === "chapter" ? 25 : 20;
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const days = daysSinceTimestamp(book.lastReadAt || book.startedAt || book.createdAt);
    const progress = bookProgress(book) || 0;
    let score = matchDemand(capacity, demand) * 2.1;

    score += duration <= timeBudget ? 1.7 : -Math.min(4, (duration - timeBudget) / 15);
    score += Math.min(3.1, Math.max(0, days - 3) * 0.14);
    if (bookTouchedToday(book.id)) score -= 6;
    if (progress >= 50) score += 0.55;
    if (progress >= 70) score += 0.75;
    if (progress >= 90) score += 1.0;
    if (book.continueSeries && book.series) score += 0.45;

    if (slot === "focus") {
      if (["knowledge", "growth", "japanese", "work"].includes(role)) score += 4.1;
      if (role === "japanese") score += 0.65;
      if (role === "work") score += checkIn.obligations === "help" ? -1.6 : 0.5;
      if (role === "fun") score -= 3.4;
      if (checkIn.gentle && demand > 1.2) score -= 1.5;
    }

    if (slot === "joy") {
      if (role === "fun") score += 5.6;
      if (role === "growth") score += 0.4;
      if (role === "work") score -= 4.5;
      if (role === "knowledge") score -= 1.1;
    }

    if (slot === "gentle") {
      if (role === "fun") score += 3.6;
      if (role === "growth") score += 1.1;
      if (book.source === "audio") score += 1.2;
      if (duration <= 20) score += 2;
      if (duration > 35) score -= 2;
      if (role === "work") score -= 3.2;
      if (checkIn.gentle) score += 0.8;
    }

    return score;
  }

  function bookDemand(book) {
    const role = book.role || "fun";
    let demand = ({ fun: 0.7, growth: 0.9, knowledge: 1.15, japanese: 1.2, work: 1.35 })[role] ?? 0.9;
    if (book.source === "audio") demand -= 0.2;
    return clamp(demand, 0.2, 2.2);
  }

  function bookGoal(book, slot, checkIn) {
    const preferred = book.preferredGoal || "auto";
    const budget = TIME_BUDGET[checkIn.time] || 30;
    const capacity = effectiveCapacity(checkIn);
    const gentle = slot === "gentle" || checkIn.gentle || capacity < 1;
    const title = book.title || "this book";

    if (book.source === "audio" || preferred === "minutes") {
      let amount = gentle ? 15 : budget >= 60 && capacity >= 2 ? 30 : 20;
      amount = Math.max(10, Math.min(amount, Math.max(10, budget)));
      return { type: "minutes", amount, label: `${book.source === "audio" ? "Listen to" : "Read"} ${title} for ${amount} minutes` };
    }

    if (preferred === "chapter") {
      return { type: "chapter", amount: 1, label: `Read 1 chapter of ${title}` };
    }

    let amount = gentle ? 5 : budget >= 60 && capacity >= 2 ? 20 : 10;
    if (slot === "joy" && !gentle && budget >= 30) amount = 15;
    if (book.totalPages) {
      const remaining = Math.max(0, Number(book.totalPages) - Number(book.currentPage || 0));
      if (remaining > 0) amount = Math.min(amount, remaining);
      if (remaining > 0 && amount >= remaining) {
        return { type: "pages", amount: remaining, label: `Finish the last ${formatNumber(remaining)} page${remaining === 1 ? "" : "s"} of ${title}` };
      }
    }
    return { type: "pages", amount: Math.max(1, amount), label: `Read ${formatNumber(Math.max(1, amount))} pages of ${title}` };
  }

  function adventureDemand(item) {
    let demand = ({ low: 0.55, medium: 1.35, high: 2.15 })[item.energy] ?? 1.35;
    const minutes = Number(item.sessionMinutes || 30);
    if (minutes >= 90) demand += 0.55;
    else if (minutes >= 60) demand += 0.3;
    else if (minutes <= 15) demand -= 0.25;
    return clamp(demand, 0.1, 3);
  }

  function effectiveCapacity(checkIn) {
    const sleep = VALUE.sleep[checkIn.sleep] ?? 1;
    const energy = VALUE.energy[checkIn.energy] ?? 1;
    const obligations = VALUE.obligations[checkIn.obligations] ?? 1;
    let capacity = energy * 0.58 + sleep * 0.25 + obligations * 0.17;
    if (checkIn.gentle) capacity -= 1;
    return clamp(capacity, 0, 3);
  }

  function questDemand(quest) {
    let demand = DEMAND_BY_REALM[quest.realm] ?? 1.25;
    if (quest.priority === "Low Energy") demand -= 0.65;
    if (quest.priority === "Must Do") demand += 0.15;
    const minutes = estimatedMinutes(quest);
    if (minutes >= 60) demand += 0.55;
    else if (minutes >= 35) demand += 0.25;
    else if (minutes && minutes <= 15) demand -= 0.25;
    return clamp(demand, 0.1, 3);
  }

  function matchDemand(capacity, demand) {
    const delta = Math.abs(capacity - demand);
    return 1.6 - delta;
  }

  function estimatedMinutes(quest) {
    const target = Number(quest.target || 0);
    const unit = String(quest.unitLabel || "").toLowerCase();
    if (!target) return 0;
    if (/(min|minute)/.test(unit)) return target;
    if (/(page|seite)/.test(unit)) return target * 2;
    if (/(hour|stunde)/.test(unit)) return target * 60;
    if (/(chapter|kapitel)/.test(unit)) return target * 25;
    return 0;
  }

  function suggestedUnits(quest, slot, checkIn) {
    const target = Math.max(0.1, Number(quest.target || 1));
    if (quest.mode !== "variable") return target;

    const capacity = effectiveCapacity(checkIn);
    let fraction = slot === "gentle" ? 0.45 : slot === "joy" ? 0.65 : 0.8;
    if (capacity < 0.8) fraction *= 0.55;
    else if (capacity < 1.5) fraction *= 0.72;
    else if (capacity > 2.5) fraction = Math.min(1, fraction + 0.2);
    if (checkIn.gentle) fraction *= 0.72;

    const duration = estimatedMinutes(quest);
    const budget = TIME_BUDGET[checkIn.time] || 30;
    if (duration > 0 && duration * fraction > budget) fraction *= budget / (duration * fraction);

    const raw = clamp(target * fraction, Math.min(target, sensibleMinimum(quest)), target);
    return roundFriendly(raw, quest.unitLabel);
  }

  function sensibleMinimum(quest) {
    const unit = String(quest.unitLabel || "").toLowerCase();
    if (/(min|minute)/.test(unit)) return 5;
    if (/(page|seite)/.test(unit)) return 5;
    if (/(hour|stunde)/.test(unit)) return 0.25;
    return 1;
  }

  function roundFriendly(value, unitLabel) {
    const unit = String(unitLabel || "").toLowerCase();
    if (/(min|minute|page|seite|row|reihe|step|schritt)/.test(unit)) {
      if (value >= 20) return Math.max(1, Math.round(value / 5) * 5);
      return Math.max(1, Math.round(value));
    }
    if (value >= 5) return Math.round(value);
    return Math.round(value * 2) / 2;
  }

  function reasonFor(quest, slot, checkIn) {
    const realm = quest.realm || "this Realm";
    const low = effectiveCapacity(checkIn) < 1.25 || checkIn.gentle;
    const busy = ["help", "busy"].includes(checkIn.obligations) || ["none", "little"].includes(checkIn.time);
    const days = daysSinceLast(questLogs(quest.id));

    if (slot === "joy") {
      if (days >= 10) return `It's a ${realm} thing you haven't touched in a while, and today's plan should include something chosen for you rather than only obligations.`;
      return `It keeps a ${realm} option in the day on purpose, so the plan isn't just a productivity list.`;
    }
    if (slot === "gentle") {
      if (low) return `Your check-in points toward lower friction today. This is one of the easier ways to still make the day count.`;
      return `This gives you an easy fallback if the day gets heavier than the morning plan expected.`;
    }
    if (busy) return `Your available time is limited, so this is a concrete ${realm} move without asking you to browse the whole Quest Board.`;
    if (days >= 14) return `This ${realm} quest has been out of rotation for a while, and today has enough room to bring it back.`;
    return `It matches today's capacity reasonably well and gives the day one clear ${realm} direction.`;
  }

  function reasonForAdventure(item, slot, checkIn) {
    const days = daysSinceTimestamp(item.lastTouchedAt || item.createdAt);
    const progress = item.progressMode === "percent" ? clamp(Number(item.progress || 0), 0, 100) : null;
    const tags = new Set(item.reasonTags || []);
    const lowDay = effectiveCapacity(checkIn) < 1.25 || checkIn.gentle;

    if (slot === "gentle" && item.energy === "low") {
      return `This is a low-friction project with a concrete stopping point, so it still fits if the day gets heavier than expected.`;
    }
    if (progress !== null && progress >= 75) {
      return `You're already ${progress}% through this, so one specific next step has a good chance of creating visible momentum.`;
    }
    if (tags.has("takes-space") && days >= 7) {
      return `This has been sitting around for ${humanDays(days)} and it literally takes up space. One small step moves it toward being out of the way.`;
    }
    if (days >= 14) {
      return `You chose this for yourself, but haven't touched it in ${humanDays(days)}. The planner is bringing back one concrete step instead of the whole project.`;
    }
    if (tags.has("fun")) {
      return `This is here on purpose because today's plan should contain something you actually chose for fun, not only things that need doing.`;
    }
    if (lowDay) {
      return `Its next action is specific enough to stop after one session, which keeps the commitment small on a lower-capacity day.`;
    }
    return `It fits today's time and energy reasonably well, and the next action is already defined so you don't have to decide how to start.`;
  }

  function rerollSlot(slotId) {
    if (!SLOTS[slotId]) return;
    const day = todayRecord();
    if (!day?.checkIn) return;
    const current = (day.picks || []).find(p => p.slot === slotId);
    if (!current) return;

    day.rerollHistory ||= { focus: [], joy: [], gentle: [] };
    day.rerollHistory[slotId] ||= [];
    const key = sourceKey(current.sourceType || "quest", current.sourceId);
    if (current.sourceId && !day.rerollHistory[slotId].includes(key)) day.rerollHistory[slotId].push(key);
    day.rerollHistory[slotId] = day.rerollHistory[slotId].slice(-16);

    const used = new Set((day.picks || []).filter(p => p.slot !== slotId).map(p => sourceKey(p.sourceType || "quest", p.sourceId)));
    const candidate = chooseSourceCandidate(
      slotId,
      day.checkIn,
      eligibleQuests(),
      eligibleAdventures(),
      eligibleBooks(),
      used,
      new Set(day.rerollHistory[slotId]),
      current
    );

    if (!candidate) return;
    const next = makePickFromCandidate(slotId, candidate, day.checkIn, current);
    next.rerolls = Number(current.rerolls || 0) + 1;
    day.picks = (day.picks || []).map(p => p.slot === slotId ? next : p);
    day.updatedAt = Date.now();
    persist("daily-pick-reroll");
  }

  function openQuestLog(questId, suggested) {
    const quest = findQuest(questId);
    if (!quest) return;

    const direct = document.querySelector(`.complete-quest-button[data-quest-id="${cssEscape(questId)}"]`);
    if (direct) {
      direct.click();
      window.setTimeout(() => prefillUnits(suggested), 0);
      return;
    }

    const dialog = byId("completeDialog");
    const id = byId("completeQuestId");
    const title = byId("completeQuestTitle");
    const units = byId("actualUnits");
    if (!dialog || !id || !title || !units) return;
    id.value = quest.id;
    title.textContent = quest.name;
    units.value = suggested || quest.target || 1;
    units.step = Number(quest.target || 1) < 1 ? "0.1" : "1";
    units.dispatchEvent(new Event("input", { bubbles: true }));
    dialog.showModal();
  }

  function prefillUnits(value) {
    if (!value) return;
    const input = byId("actualUnits");
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function companionForDate() {
    const state = app.getState();
    const flags = state.flags || {};
    const options = [companionById("luca")];

    if (flags.STORY_MINA_FRIENDSHIP_STARTED) {
      const mina = companionById("mina");
      mina.weight = flags.MINA_HANGOUTS_UNLOCKED ? 2.6 : 1;
      options.push(mina);
    }

    const history = plannerState().companionHistory || [];
    const recent = history.filter(item => item.date < todayKey()).slice(-3).reverse();
    options.forEach(option => {
      if (option.id === "luca") return;
      if (recent[0]?.id === option.id) option.weight *= 0.18;
      else if (recent.slice(0, 2).some(item => item.id === option.id)) option.weight *= 0.48;
    });

    const seed = seededRandom(`${todayKey()}|companion|${history.slice(-5).map(h => h.id).join("-")}`);
    const total = options.reduce((sum, item) => sum + item.weight, 0);
    let cursor = seed * total;
    for (const option of options) {
      cursor -= option.weight;
      if (cursor <= 0) return option;
    }
    return options[0];
  }

  function companionById(id) {
    if (id === "mina") {
      return {
        id: "mina",
        name: "Mina",
        kicker: "A QUICK CHECK-IN",
        weight: 1,
        portrait: "assets/story/sprites/mina_neutral.png",
        previewLine: "Some mornings, someone from Luca's actual social world may wander into the briefing. Not every day.",
        dialogLine: "Okay, important question: how alive are we today?",
        doneLine: "Good. Tiny plan. No turning this into a twelve-step self-improvement challenge."
      };
    }
    return {
      id: "luca",
      name: "Luca",
      kicker: "SELF CHECK-IN",
      weight: 6,
      portrait: "assets/story/portraits/luca_thinking.png",
      previewLine: "Most days can simply begin with Luca checking in with herself.",
      dialogLine: "Let's make this smaller. What kind of day are we actually working with?",
      doneLine: "Okay. That's enough information. Pick the next thing, not the whole life."
    };
  }

  function companionMarkup(companion, { preview = false } = {}) {
    const c = companion || companionById("luca");
    return `
      <div class="daily-companion-art-v14 ${escAttr(c.id)}">${companionImage(c)}</div>
      <div class="daily-companion-copy-v14">
        <small>${esc(c.kicker)}</small>
        <strong>${esc(c.name)}</strong>
        <p>${esc(preview ? c.previewLine : c.doneLine)}</p>
      </div>`;
  }

  function companionImage(companion, dialog = false) {
    if (!companion?.portrait) return `<span>${companion?.id === "mina" ? "✦" : "L"}</span>`;
    return `<img src="${escAttr(companion.portrait)}" alt="${escAttr(companion.name)}" class="${dialog ? "daily-dialog-image-v14" : "daily-companion-image-v14"}" />`;
  }

  function dialogTitleFor(companion) {
    return companion?.id === "mina" ? "Quick status report." : "Let's make the day smaller.";
  }

  function reasonForBook(book, slot, checkIn) {
    const days = daysSinceTimestamp(book.lastReadAt || book.startedAt || book.createdAt);
    const progress = bookProgress(book);
    const role = bookRoleMeta(book.role);

    if (progress !== null && progress >= 55 && days >= 14) {
      return `You're already ${progress}% through this and haven't picked it up in ${humanDays(days)}. One small reading step is more useful than rediscovering it months later.`;
    }
    if (book.continueSeries && book.series && days >= 7) {
      return `You marked ${book.series} as a series you want to continue, and this is the book already in progress. The planner is keeping that thread visible.`;
    }
    if (slot === "joy" && book.role === "fun") {
      return days >= 10
        ? `This is one of your current fun reads and it has been sitting untouched for ${humanDays(days)}. Today's joy slot is a good place to bring it back.`
        : `You marked this as a book you read for fun, so the plan gets something chosen for you rather than another obligation.`;
    }
    if (slot === "gentle") {
      return `Reading gives this day a concrete ${role.label.toLowerCase()} option with a clear stopping point. You can stop at the finish line and still count it as done.`;
    }
    if (["knowledge", "growth", "japanese", "work"].includes(book.role)) {
      return days >= 14
        ? `This ${role.label} book is already in progress and has been out of rotation for ${humanDays(days)}. One specific chunk moves the actual book forward.`
        : `You categorized this as ${role.label}, and it is already in progress, so this is a more specific focus choice than a generic “read something” quest.`;
    }
    return `This book is already marked Reading, and the planner can give it one small finish line instead of making you choose from the whole Library.`;
  }

  function recordCompanion(planner, date, id) {
    planner.companionHistory = (planner.companionHistory || []).filter(item => item.date !== date);
    planner.companionHistory.push({ date, id });
    planner.companionHistory.sort((a, b) => a.date.localeCompare(b.date));
  }

  function sourceKey(type, id) {
    return `${type || "quest"}:${id || ""}`;
  }

  function findBook(id) {
    return app.getState().bookLibrary?.items?.find(book => book.id === id) || null;
  }

  function bookLogs(id) {
    const logs = app.getState().bookLibrary?.logs;
    return Array.isArray(logs) ? logs.filter(log => log.bookId === id) : [];
  }

  function bookTouchedToday(id) {
    return bookLogs(id).some(log => (log.date || dateKeyFromValue(log.at)) === todayKey());
  }

  function bookProgress(book) {
    const total = Number(book?.totalPages || 0);
    if (!total) return null;
    return Math.floor(clamp(Number(book.currentPage || 0) / total * 100, 0, 100));
  }

  function bookRoleMeta(role) {
    return ({
      fun: { label: "For Fun", icon: "🌸", realm: "Hobbies" },
      knowledge: { label: "Knowledge", icon: "📚", realm: "Knowledge" },
      growth: { label: "Personal Growth", icon: "✨", realm: "Knowledge" },
      japanese: { label: "Japanese", icon: "あ", realm: "Japanese" },
      work: { label: "Work", icon: "📎", realm: "Work" }
    })[role] || { label: "For Fun", icon: "🌸", realm: "Hobbies" };
  }

  function findAdventure(id) {
    return app.getState().sideAdventures?.items?.find(item => item.id === id) || null;
  }

  function adventureLogs(id) {
    const logs = app.getState().sideAdventures?.logs;
    return Array.isArray(logs) ? logs.filter(log => log.adventureId === id) : [];
  }

  function adventureTouchedToday(id) {
    return adventureLogs(id).some(log => (log.date || dateKeyFromValue(log.at)) === todayKey());
  }

  function daysSinceTimestamp(value) {
    if (!value) return 30;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }

  function humanDays(days) {
    if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
    if (days < 35) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"}`;
    }
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  function findQuest(id) {
    return (app.getState().quests || []).find(q => q.id === id) || null;
  }

  function questLogs(questId) {
    return (app.getState().completionLog || []).filter(log => log.questId === questId);
  }

  function todayQuestUnits(questId) {
    const today = todayKey();
    return questLogs(questId)
      .filter(log => dateKeyFromValue(log.at) === today)
      .reduce((sum, log) => sum + Number(log.units || 0), 0);
  }

  function wasDoneYesterday(questId) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const key = dateKey(date);
    return questLogs(questId).some(log => dateKeyFromValue(log.at) === key);
  }

  function daysSinceLast(logs) {
    if (!logs.length) return 30;
    const times = logs.map(log => new Date(log.at).getTime()).filter(Number.isFinite);
    if (!times.length) return 30;
    return Math.max(0, Math.floor((Date.now() - Math.max(...times)) / 86400000));
  }

  function cooldownPenalty(quest, logs) {
    const raw = quest.cooldownDays ?? quest.cooldown;
    const cooldown = typeof raw === "number" ? raw : Number.parseFloat(raw);
    if (!Number.isFinite(cooldown) || cooldown <= 0 || !logs.length) return 0;
    const since = daysSinceLast(logs);
    return since < cooldown ? 5 + (cooldown - since) * 0.5 : 0;
  }

  function goalLabel(quest, goal) {
    const unit = friendlyUnitLabel(quest.unitLabel, goal);
    if (quest.mode !== "variable" && Number(goal) === 1 && /task|session|time|clear/i.test(unit)) return "Complete it once";
    return `${formatNumber(goal)} ${unit}`;
  }

  function friendlyUnitLabel(label, value) {
    const raw = String(label || "unit").trim();
    if (Number(value) === 1) {
      return raw.replace(/s$/i, "");
    }
    return raw;
  }

  function realmIcon(realm) {
    return ({ Work: "📎", Health: "🌱", Recovery: "☕", Home: "🏠", Japanese: "🌸", Knowledge: "📚", Hobbies: "🎨" })[realm] || "✦";
  }

  function seededJitter(seed) {
    return (seededRandom(seed) - 0.5) * 0.7;
  }

  function seededRandom(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
    return ((h >>> 0) % 1000000) / 1000000;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function dateKeyFromValue(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateKey(date);
  }

  function formatNumber(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value ?? ""));
    return String(value ?? "").replace(/(["'\\.#:[\]()=+~*^$|<> ])/g, "\\$1");
  }

  function esc(value) {
    if (app.escapeHtml) return app.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escAttr(value) {
    return esc(value);
  }

  window.LifeRPGDaily = {
    render,
    openBriefing: () => openBriefing(false),
    editBriefing: () => openBriefing(true),
    getToday: () => structuredCloneSafe(todayRecord()),
    reroll: rerollSlot
  };

  function structuredCloneSafe(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
})();
