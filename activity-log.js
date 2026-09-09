(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState) return;

  const TIME_CATEGORY_META = {
    school: { label: "School", icon: "🏫", multiplier: 1 },
    work_home: { label: "Work at home", icon: "💻", multiplier: 1 },
    focus: { label: "Focus work", icon: "🎯", multiplier: 1 },
    life_admin: { label: "Life / admin", icon: "🧺", multiplier: 0.55 },
    hobby: { label: "Hobby", icon: "🎨", multiplier: 0 },
    gaming: { label: "Gaming", icon: "🎮", multiplier: 0 },
    reading: { label: "Reading", icon: "📚", multiplier: 0 },
    recovery: { label: "Recovery / rest", icon: "🌿", multiplier: 0 },
    other: { label: "Other", icon: "◇", multiplier: 0 }
  };

  const FILTERS = [
    ["all", "All"],
    ["time", "Time"],
    ["habit", "Habits"],
    ["quest", "Quests"],
    ["journal", "Journal"],
    ["library", "Books & Games"],
    ["adventure", "Adventures"],
    ["japanese", "Japanese"],
    ["achievement", "Achievements"],
    ["other", "Other"]
  ];

  let selectedDate = todayKey();
  let activeFilter = "all";
  let searchText = "";
  let initialized = false;
  const els = {};

  init();

  function init() {
    cacheEls();
    if (!els.page) return;
    bind();
    initialized = true;
    render();
    window.addEventListener("life-rpg:render", () => {
      if (els.page.classList.contains("active")) render();
    });
    window.addEventListener("life-rpg:state-saved", () => {
      if (els.page.classList.contains("active")) render();
    });
  }

  function cacheEls() {
    Object.assign(els, {
      page: byId("view-activity"),
      dateLabel: byId("activityDateLabel"),
      dateInput: byId("activityDateInput"),
      prev: byId("activityPrevDay"),
      next: byId("activityNextDay"),
      today: byId("activityTodayButton"),
      filterBar: byId("activityFilterBar"),
      search: byId("activitySearch"),
      list: byId("activityLedgerList"),
      empty: byId("activityLedgerEmpty"),
      count: byId("activitySummaryCount"),
      time: byId("activitySummaryTime"),
      xp: byId("activitySummaryXp"),
      energy: byId("activitySummaryEnergy"),
      coins: byId("activitySummaryCoins"),
      historyHint: byId("activityHistoryHint")
    });
  }

  function bind() {
    document.querySelectorAll('[data-view="activity"], [data-view-target="activity"]').forEach(button => {
      button.addEventListener("click", () => window.setTimeout(render, 0));
    });
    els.prev?.addEventListener("click", () => shiftDay(-1));
    els.next?.addEventListener("click", () => shiftDay(1));
    els.today?.addEventListener("click", () => { selectedDate = todayKey(); syncDateControls(); render(); });
    els.dateInput?.addEventListener("change", () => {
      if (!isDateKey(els.dateInput.value)) return;
      selectedDate = els.dateInput.value;
      syncDateControls();
      render();
    });
    els.filterBar?.addEventListener("click", event => {
      const button = event.target.closest("[data-activity-filter]");
      if (!button) return;
      activeFilter = button.dataset.activityFilter || "all";
      render();
    });
    els.search?.addEventListener("input", () => {
      searchText = String(els.search.value || "").trim().toLowerCase();
      renderListOnly();
    });
  }

  function shiftDay(delta) {
    const date = dateFromKey(selectedDate);
    date.setDate(date.getDate() + delta);
    const next = dateKey(date);
    if (next > todayKey()) return;
    selectedDate = next;
    syncDateControls();
    render();
  }

  function render() {
    if (!initialized) return;
    syncDateControls();
    const rows = collectRows(selectedDate);
    const rewardEvents = rewardEventsForDate(selectedDate);
    const totals = rewardEvents.reduce((acc, event) => {
      acc.xp += number(event.xp);
      acc.storyEnergy += number(event.storyEnergy);
      acc.coins += number(event.coins);
      return acc;
    }, { xp: 0, storyEnergy: 0, coins: 0 });
    const totalMinutes = timeEntriesForDate(selectedDate).reduce((sum, entry) => sum + number(entry.minutes), 0);

    if (els.count) els.count.textContent = String(rows.length);
    if (els.time) els.time.textContent = formatDuration(totalMinutes);
    if (els.xp) els.xp.textContent = `+${Math.round(totals.xp)}`;
    if (els.energy) els.energy.textContent = `+${app.formatEnergy?.(totals.storyEnergy) ?? trim(totals.storyEnergy)}`;
    if (els.coins) els.coins.textContent = `+${Math.round(totals.coins)}`;

    renderFilters(rows);
    renderList(rows);
    renderHistoryHint(rows, rewardEvents);
  }

  function renderListOnly() {
    const rows = collectRows(selectedDate);
    renderFilters(rows);
    renderList(rows);
  }

  function syncDateControls() {
    const date = dateFromKey(selectedDate);
    const today = selectedDate === todayKey();
    if (els.dateInput) {
      els.dateInput.value = selectedDate;
      els.dateInput.max = todayKey();
    }
    if (els.dateLabel) {
      els.dateLabel.textContent = today
        ? "Today"
        : date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
    }
    if (els.next) els.next.disabled = today;
    if (els.today) els.today.classList.toggle("hidden", today);
  }

  function renderFilters(rows) {
    if (!els.filterBar) return;
    const counts = rows.reduce((map, row) => {
      map[row.category] = (map[row.category] || 0) + 1;
      return map;
    }, {});
    els.filterBar.innerHTML = FILTERS.map(([key, label]) => {
      const count = key === "all" ? rows.length : number(counts[key]);
      return `<button type="button" class="activity-filter-chip-v314 ${activeFilter === key ? "active" : ""}" data-activity-filter="${key}"><span>${esc(label)}</span><b>${count}</b></button>`;
    }).join("");
  }

  function renderList(rows) {
    if (!els.list) return;
    const visible = rows.filter(row => {
      if (activeFilter !== "all" && row.category !== activeFilter) return false;
      if (!searchText) return true;
      return `${row.title} ${row.detail || ""} ${row.sourceLabel || ""}`.toLowerCase().includes(searchText);
    });
    els.empty?.classList.toggle("hidden", visible.length > 0);
    els.list.innerHTML = visible.map(rowMarkup).join("");
  }

  function renderHistoryHint(rows, rewardEvents) {
    if (!els.historyHint) return;
    const hasUnknown = rows.some(row => row.rewardKnown === false);
    const migrated = rewardEvents.some(event => event?.migrated);
    if (hasUnknown) {
      els.historyHint.innerHTML = `<span>ℹ</span><p><strong>Some older activity predates exact reward tracking.</strong> The action is shown because the log still exists, but Life RPG will not invent an XP / Story Energy / Coin amount it cannot prove.</p>`;
      els.historyHint.classList.remove("hidden");
      return;
    }
    if (migrated) {
      els.historyHint.innerHTML = `<span>✓</span><p><strong>Older rewards reconstructed from saved logs.</strong> Migrated entries use the reward amounts that were stored with those original actions.</p>`;
      els.historyHint.classList.remove("hidden");
      return;
    }
    els.historyHint.classList.add("hidden");
  }

  function rowMarkup(row) {
    const reward = row.reward || emptyReward();
    const hasMainReward = reward.xp || reward.storyEnergy || reward.coins;
    const rawReduced = reward.rawStoryEnergy > reward.storyEnergy + 0.001;
    const growth = [];
    if (reward.realmXP) growth.push(`+${trim(reward.realmXP)} ${row.realm || "Realm"} XP`);
    if (reward.statXP) growth.push(`+${trim(reward.statXP)} ${capabilityLabel(row.capability)} XP`);
    const rewardMarkup = row.rewardKnown === false
      ? `<span class="activity-reward-pill-v314 muted">Reward unavailable</span>`
      : hasMainReward
        ? `${reward.xp ? `<span class="activity-reward-pill-v314 xp">+${trim(reward.xp)} XP</span>` : ""}${reward.storyEnergy ? `<span class="activity-reward-pill-v314 energy">+${app.formatEnergy?.(reward.storyEnergy) ?? trim(reward.storyEnergy)} 🔥</span>` : ""}${reward.coins ? `<span class="activity-reward-pill-v314 coins">+${trim(reward.coins)} 🪙</span>` : ""}`
        : `<span class="activity-reward-pill-v314 muted">No direct reward</span>`;
    const flags = [];
    if (row.duplicate) flags.push("Already counted elsewhere");
    if (row.migrated) flags.push("Migrated history");
    if (rawReduced) flags.push(`${app.formatEnergy?.(reward.rawStoryEnergy) ?? trim(reward.rawStoryEnergy)} 🔥 base before diminishing returns`);

    return `<article class="activity-ledger-row-v314 ${row.duplicate ? "is-deduped" : ""}">
      <div class="activity-ledger-time-v314"><strong>${esc(formatTime(row.at))}</strong><small>${esc(row.sourceLabel || categoryLabel(row.category))}</small></div>
      <div class="activity-ledger-icon-v314" aria-hidden="true">${row.icon || "✦"}</div>
      <div class="activity-ledger-main-v314">
        <div class="activity-ledger-title-v314"><div><strong>${esc(row.title)}</strong>${row.detail ? `<p>${esc(row.detail)}</p>` : ""}</div><div class="activity-reward-pills-v314">${rewardMarkup}</div></div>
        ${growth.length ? `<div class="activity-growth-line-v314">Growth · ${growth.map(esc).join(" · ")}</div>` : ""}
        ${flags.length ? `<div class="activity-ledger-flags-v314">${flags.map(flag => `<span>${esc(flag)}</span>`).join("")}</div>` : ""}
        ${row.why ? `<details class="activity-why-v314"><summary>Why this amount?</summary><div>${row.why}</div></details>` : ""}
      </div>
    </article>`;
  }

  function collectRows(key) {
    const root = app.getState();
    const events = rewardEventsForDate(key);
    const eventById = new Map(events.map(event => [event.id, event]));
    const consumed = new Set();
    const rows = [];

    const takeEvent = (id, fallbackSource = null, fallbackSourceId = null) => {
      let event = id ? eventById.get(id) : null;
      if (!event && fallbackSourceId) event = events.find(item => !consumed.has(item.id) && item.sourceId === fallbackSourceId && (!fallbackSource || item.source === fallbackSource));
      if (event?.id) consumed.add(event.id);
      return event || null;
    };

    // Time is logged even when a category intentionally pays no direct time reward.
    timeEntriesForDate(key).forEach(entry => {
      const event = takeEvent(entry.rewardEventId, "time", entry.id);
      rows.push(timeRow(entry, event, key));
    });

    // Habit completions.
    const habits = root.habits?.items || [];
    (root.habits?.completions || []).filter(log => String(log.date || dateKey(new Date(log.timestamp || 0))) === key).forEach(log => {
      const habit = habits.find(item => item.id === log.habitId);
      const event = takeEvent(log.rewardEventId, "habit", `${log.habitId}:${log.date}`);
      rows.push({
        id: `habit-${log.id || log.habitId}-${log.date}`,
        at: log.loggedAt || (log.timestamp ? new Date(log.timestamp).toISOString() : `${key}T12:00:00`),
        category: "habit", icon: "❀", sourceLabel: "Habit",
        title: habit?.name || event?.label || "Habit completed",
        detail: `${humanEffort(log.effort || habit?.effort)}${number(log.rewardStreakAfter || log.streakAfter) ? ` · ${number(log.rewardStreakAfter || log.streakAfter)} day reward streak` : ""}`,
        reward: event ? rewardFromEvent(event) : rewardFromLog(log), rewardKnown: Boolean(event || hasRewardFields(log)),
        realm: event?.realm || habit?.realm || null, capability: event?.capability || log.stat || null,
        duplicate: Boolean(event?.duplicate || log.deduped), migrated: Boolean(event?.migrated),
        why: event?.duplicate ? dedupeWhy(event) : null
      });
    });

    // Quest completions.
    (root.completionLog || []).filter(log => dateKey(new Date(log.at || 0)) === key).forEach(log => {
      const quest = app.getQuestById?.(log.questId) || null;
      const event = takeEvent(log.rewardEventId, "quest", log.questId || null);
      const units = number(log.units);
      const unitLabel = quest?.unitLabel || "units";
      rows.push({
        id: `quest-${log.id || log.rewardEventId || Math.random()}`,
        at: log.at || event?.at || `${key}T12:00:00`, category: "quest", icon: "☷", sourceLabel: "Quest",
        title: log.questName || quest?.name || event?.label || "Quest progress",
        detail: units ? `${trim(units)} ${units === 1 ? singularUnit(unitLabel) : unitLabel} logged${event?.duplicate ? " · linked activity already rewarded" : ""}` : "Quest completion logged",
        reward: event ? rewardFromEvent(event) : rewardFromLog(log), rewardKnown: Boolean(event || hasRewardFields(log)),
        realm: event?.realm || log.realm || quest?.realm || null, capability: event?.capability || log.stat || quest?.stat || null,
        duplicate: Boolean(event?.duplicate || log.deduped), migrated: Boolean(event?.migrated), why: event?.duplicate ? dedupeWhy(event) : null
      });
    });

    // External / quick-chain completions.
    (root.externalCompletionLog || []).filter(log => dateKey(new Date(log.at || 0)) === key).forEach(log => {
      const event = takeEvent(log.rewardEventId, "external", log.id || null);
      rows.push({
        id: `external-${log.id || log.rewardEventId || Math.random()}`, at: log.at || event?.at || `${key}T12:00:00`,
        category: "quest", icon: "✓", sourceLabel: "Quick log", title: log.name || event?.label || "Quick action",
        detail: log.realm ? `${log.realm} · quick completion` : "Quick completion",
        reward: event ? rewardFromEvent(event) : rewardFromLog(log), rewardKnown: Boolean(event || hasRewardFields(log)),
        realm: event?.realm || log.realm || null, capability: event?.capability || log.stat || null,
        duplicate: Boolean(event?.duplicate || log.deduped), migrated: Boolean(event?.migrated), why: event?.duplicate ? dedupeWhy(event) : null
      });
    });

    // Journal reflection: combine base + depth milestones into one readable row per day.
    const journalEntry = root.journal?.entries?.[key] || null;
    const journalEvents = events.filter(event => ["journal-reflection-base", "journal-reflection-effort"].includes(event.source));
    journalEvents.forEach(event => consumed.add(event.id));
    if (hasReflection(journalEntry) || journalEvents.length) {
      const rewards = sumRewards(journalEvents);
      const chars = journalCharacterCount(journalEntry) || Math.max(0, ...journalEvents.map(event => number(event.metadata?.journalCharacters)));
      rows.push({
        id: `journal-${key}`, at: latestAt(journalEvents) || journalEntry?.updatedAt || `${key}T20:00:00`, category: "journal", icon: "🌸", sourceLabel: "Journal",
        title: "Daily reflection", detail: `${chars} characters${journalEvents.length > 1 ? ` · ${journalEvents.length - 1} depth reward${journalEvents.length === 2 ? "" : "s"} reached` : ""}`,
        reward: rewards, rewardKnown: journalEvents.length > 0, realm: "Recovery", capability: "wellbeing",
        duplicate: false, migrated: journalEvents.some(event => event.migrated),
        why: journalEvents.length ? journalWhy(journalEvents, chars) : `<p>This reflection exists in the save, but it predates the exact Journal reward events Life RPG can verify.</p>`
      });
    }

    // Reading logs.
    const books = root.bookLibrary?.items || [];
    (root.bookLibrary?.logs || []).filter(log => String(log.date || dateKey(new Date(log.at || 0))) === key).forEach(log => {
      const book = books.find(item => item.id === log.bookId);
      const event = takeEvent(log.rewardEventId, "library", log.bookId || null);
      const detailBits = [];
      if (number(log.pages)) detailBits.push(`${trim(log.pages)} pages`);
      if (number(log.minutes)) detailBits.push(formatDuration(log.minutes));
      if (log.chapter) detailBits.push("chapter logged");
      rows.push({
        id: `book-${log.id || Math.random()}`, at: toIso(log.at) || event?.at || `${key}T12:00:00`, category: "library", icon: "📚", sourceLabel: "Reading",
        title: book?.title || event?.label || "Reading session", detail: detailBits.join(" · ") || "Reading progress logged",
        reward: event ? rewardFromEvent(event) : rewardFromLog(log), rewardKnown: Boolean(event || hasRewardFields(log)), realm: event?.realm || null, capability: event?.capability || "knowledge",
        duplicate: Boolean(event?.duplicate || log.deduped), migrated: Boolean(event?.migrated), why: event?.duplicate ? dedupeWhy(event) : null
      });
    });

    // Game sessions.
    const games = root.gameLibrary?.items || [];
    (root.gameLibrary?.logs || []).filter(log => String(log.date || dateKey(new Date(log.at || 0))) === key).forEach(log => {
      const game = games.find(item => item.id === log.gameId);
      const event = takeEvent(log.rewardEventId, "game", log.gameId || null);
      const amount = number(log.amount || (log.trackingMode === "minutes" ? log.minutes : 0));
      const unit = log.unitLabel || trackingUnitFallback(log.trackingMode);
      const detail = `${amount ? `${trim(amount)} ${amount === 1 ? singularUnit(unit) : unit}` : "Session"}${number(log.minutes) && log.trackingMode !== "minutes" ? ` · ${formatDuration(log.minutes)} real time` : ""}`;
      rows.push({
        id: `game-${log.id || Math.random()}`, at: toIso(log.at) || event?.at || `${key}T12:00:00`, category: "library", icon: "🎮", sourceLabel: "Game session",
        title: game?.title || event?.label || "Game session", detail,
        reward: event ? rewardFromEvent(event) : rewardFromLog(log), rewardKnown: Boolean(event || hasRewardFields(log)), realm: event?.realm || null, capability: event?.capability || null,
        duplicate: Boolean(event?.duplicate || log.deduped), migrated: Boolean(event?.migrated), why: event?.duplicate ? dedupeWhy(event) : gameSessionWhy(event, log)
      });
    });

    // Side Adventure progress.
    const adventures = root.sideAdventures?.items || [];
    (root.sideAdventures?.logs || []).filter(log => String(log.date || dateKey(new Date(log.at || 0))) === key).forEach(log => {
      const adventure = adventures.find(item => item.id === log.adventureId);
      const event = takeEvent(log.rewardEventId, "adventure", log.adventureId || null);
      const detail = log.roadmapStepLabel
        ? `Step · ${log.roadmapStepLabel}${number(log.elapsedMinutes) ? ` · ${formatDuration(log.elapsedMinutes)}` : ""}`
        : `${trim(number(log.progressBefore))}% → ${trim(number(log.progressAfter))}%`;
      rows.push({
        id: `adventure-${log.id || Math.random()}`, at: toIso(log.at) || event?.at || `${key}T12:00:00`, category: "adventure", icon: "✧", sourceLabel: "Side Adventure",
        title: adventure?.name || event?.label || "Adventure progress", detail,
        reward: event ? rewardFromEvent(event) : rewardFromLog(log), rewardKnown: Boolean(event || hasRewardFields(log)), realm: event?.realm || adventure?.realm || null, capability: event?.capability || null,
        duplicate: Boolean(event?.duplicate || log.deduped), migrated: Boolean(event?.migrated), why: event?.duplicate ? dedupeWhy(event) : null
      });
    });

    // Stewardship fingerprints exist even when the daily upkeep cap meant the
    // item received zero reward. Surface those too, so adding a Book/Game/Habit
    // never vanishes from the audit trail just because today's cap was full.
    Object.entries(root.stewardship?.fingerprints || {}).forEach(([fingerprint, record]) => {
      if (!record?.firstSeenAt || dateKey(new Date(Number(record.firstSeenAt))) !== key) return;
      const rewardEvent = events.find(event => event?.source === "stewardship" && event?.sourceId === fingerprint);
      if (rewardEvent) return;
      const type = String(record.type || "item");
      const category = type === "habit" ? "habit" : type === "adventure" ? "adventure" : ["book", "game", "gameDetails", "gameSteam"].includes(type) ? "library" : "other";
      const typeLabel = ({ book: "Book added", game: "Game added", gameDetails: "Game details", gameSteam: "Steam curation", habit: "Habit added", adventure: "Adventure added" }[type] || "System upkeep");
      const icon = ({ book: "📚", game: "🎮", gameDetails: "🎮", gameSteam: "🏆", habit: "❀", adventure: "✧" }[type] || "🗂️");
      rows.push({
        id: `stewardship-zero-${fingerprint}`, at: new Date(Number(record.firstSeenAt)).toISOString(), category, icon, sourceLabel: "Stewardship",
        title: `${typeLabel} · ${record.label || "New entry"}`, detail: "Saved successfully · stewardship reward cap already full",
        reward: emptyReward(), rewardKnown: true, realm: null, capability: null, duplicate: false, migrated: false,
        why: `<p>The item <strong>was logged</strong>. It paid 0 here because Life RPG's small daily stewardship cap had already been used. The cap limits database-maintenance farming; it does not erase the activity from this ledger.</p>`
      });
    });

    // Every remaining reward transaction still gets a row: stewardship, check-in,
    // achievements, game goals, Sudoku, finish bonuses, etc.
    events.filter(event => !consumed.has(event.id)).forEach(event => rows.push(genericRewardRow(event)));

    return rows.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  }

  function timeRow(entry, event, key) {
    const meta = TIME_CATEGORY_META[entry.categoryId] || TIME_CATEGORY_META.other;
    const reward = event ? rewardFromEvent(event) : (entry.reward ? {
      xp: number(entry.reward.xp), realmXP: number(entry.reward.realmXP), statXP: number(entry.reward.statXP), coins: number(entry.reward.coins), storyEnergy: number(entry.reward.storyEnergy), rawStoryEnergy: number(entry.reward.rawStoryEnergy ?? entry.reward.storyEnergy)
    } : emptyReward());
    const beforeEffective = effectiveMinutesBefore(entry, key);
    const effective = number(entry.minutes) * meta.multiplier;
    const focusBonus = number(event?.metadata?.focusCompletionBonus);
    const detail = `${formatDuration(entry.minutes)} · ${meta.label}${entry.subcategory ? ` / ${entry.subcategory}` : ""}${entry.mode === "focus" ? " · Focus timer" : entry.mode === "action" ? " · Action timer" : entry.mode === "manual" ? " · Manual log" : ""}`;
    let why = `<p><strong>${formatDuration(entry.minutes)}</strong> was logged to Life Rhythm.</p>`;
    if (meta.multiplier <= 0) {
      why += `<p>This time category intentionally has <strong>no direct time-farming reward</strong>. Any linked Quest, Book, Game, Adventure, or Recovery action can still reward its own completion separately.</p>`;
    } else {
      why += `<p>Direct time rewards use <strong>${trim(meta.multiplier)}×</strong> weighting here: ${trim(entry.minutes)} real min → <strong>${trim(effective)} effective reward min</strong>. Before this block, ${trim(beforeEffective)} effective min had already been rewarded on this day.</p>`;
      why += `<p>Time rewards diminish only after long accumulated rewarded days: Coins/Story Energy step down after 6h and 10h effective time; XP steps down after 10h.</p>`;
      if (focusBonus) why += `<p>Completing the planned Focus minimum added a separate <strong>+${trim(focusBonus)} 🪙 focus bonus</strong>.</p>`;
    }
    if (reward.rawStoryEnergy > reward.storyEnergy + 0.001) {
      why += `<p>The time block generated ${app.formatEnergy?.(reward.rawStoryEnergy) ?? trim(reward.rawStoryEnergy)} 🔥 base, but the global daily Story Energy diminishing curve credited <strong>${app.formatEnergy?.(reward.storyEnergy) ?? trim(reward.storyEnergy)} 🔥</strong>.</p>`;
    }
    if (!event && !entry.reward) why += `<p>No exact reward transaction is attached to this older time log, so Life RPG does not invent one.</p>`;
    return {
      id: `time-${entry.id}`, at: entry.endAt || entry.startAt || `${key}T12:00:00`, category: "time", icon: meta.icon,
      sourceLabel: entry.mode === "focus" ? "Focus time" : "Time log", title: entry.label || meta.label, detail,
      reward, rewardKnown: Boolean(event || entry.reward), realm: event?.realm || null, capability: event?.capability || null,
      duplicate: Boolean(event?.duplicate), migrated: Boolean(event?.migrated), why
    };
  }

  function genericRewardRow(event) {
    const category = categoryForEvent(event);
    const meta = sourceMeta(event.source, category);
    const details = genericDetail(event);
    return {
      id: event.id, at: event.at, category, icon: meta.icon, sourceLabel: meta.label,
      title: event.label || meta.label, detail: details,
      reward: rewardFromEvent(event), rewardKnown: true, realm: event.realm || null, capability: event.capability || null,
      duplicate: Boolean(event.duplicate), migrated: Boolean(event.migrated), why: genericWhy(event)
    };
  }

  function genericDetail(event) {
    const m = event.metadata || {};
    if (event.source === "daily-checkin") return `${number(m.streak) ? `${number(m.streak)} day streak · ` : ""}Daily plan updated`;
    if (event.source === "stewardship") return `${humanize(m.type || "library upkeep")} · system stewardship`;
    if (event.source === "game-goal") return "Tracked Game Goal completed";
    if (event.source === "sudoku-complete" || event.source === "sudoku-solved") return m.level ? `Journey Level ${number(m.level)} completed · ${humanize(m.difficulty || "Sudoku")}` : `${humanize(m.difficulty || "Sudoku")} Practice puzzle completed`;
    if (event.source === "kotoba-quest") {
      const bits = [humanize(m.kotobaType || "Japanese study")];
      if (m.skill) bits.push(humanize(m.skill));
      if (m.result) bits.push(humanize(m.result));
      return bits.join(" · ");
    }
    if (event.source === "achievement" || event.source === "achievements-unlock") return "Achievement reward";
    if (event.source === "adventure-output") return `${number(m.characters) ? `${number(m.characters)} characters · ` : ""}Project memory enriched`;
    if (event.source === "habit-daypart-clear") return "Habit daypart bonus";
    if (event.source === "daily-batch-clear") return "Daily Plan batch bonus";
    if (event.source?.endsWith("-finish")) return "Completion bonus";
    if (event.source === "habit-coin-repair" || event.source?.includes("repair")) return "Reward repair / migration";
    return humanize(event.source || "activity");
  }

  function genericWhy(event) {
    const reward = rewardFromEvent(event);
    const bits = [];
    if (event.duplicate) bits.push(dedupeWhy(event));
    if (reward.rawStoryEnergy > reward.storyEnergy + 0.001) bits.push(`<p>This action generated ${app.formatEnergy?.(reward.rawStoryEnergy) ?? trim(reward.rawStoryEnergy)} 🔥 base, but daily Story Energy diminishing returns credited <strong>${app.formatEnergy?.(reward.storyEnergy) ?? trim(reward.storyEnergy)} 🔥</strong>.</p>`);
    if (event.source === "stewardship") bits.push(`<p>Library/system stewardship uses a small daily cap, so adding many Books, Games, Habits or Adventure details in one day cannot become the dominant progression source.</p>`);
    if (event.source === "game-goal") bits.push(`<p>This reward comes from completing a tracked Game Goal. Merely importing a goal and actually completing it are intentionally separate actions.</p>`);
    if (event.source === "kotoba-quest") {
      const multiplier = number(event.metadata?.rewardMultiplier) || 1;
      const dailyIndex = number(event.metadata?.kotobaDailyIndex);
      bits.push(`<p>This transaction came from a completed <strong>Kotoba Quest</strong> learning event. Kotoba keeps its own XP/story system; Life RPG rewards the same real study separately as Japanese growth.</p>`);
      if (multiplier < 0.999) bits.push(`<p>Same-day Kotoba rewards taper gently after larger study batches. This event used a <strong>×${trim(multiplier)}</strong> activity multiplier${dailyIndex ? ` as Kotoba event ${dailyIndex} that day` : ""}.</p>`);
      if (number(event.metadata?.kotobaDailyCoinCap)) bits.push(`<p>Kotoba-origin Coins are capped at <strong>${number(event.metadata.kotobaDailyCoinCap)} Coins per day</strong> so high-volume review sessions cannot become an unlimited Coin farm.</p>`);
    }
    if (event.migrated) bits.push(`<p>This transaction was reconstructed from an older saved activity log and keeps the amount stored with that original action.</p>`);
    return bits.join("") || null;
  }

  function journalWhy(events, chars) {
    const lines = events.slice().sort((a, b) => new Date(a.at) - new Date(b.at)).map(event => {
      const reward = rewardFromEvent(event);
      return `<li><strong>${esc(event.label || humanize(event.source))}</strong> — ${rewardInline(reward)}</li>`;
    }).join("");
    return `<p>${chars} characters were saved across Gratitude, Small Win and Hard Thing. Journal effort rewards unlock at visible character thresholds and are capped rather than paying indefinitely per character.</p><ul>${lines}</ul>`;
  }

  function gameSessionWhy(event, log) {
    if (!event) return null;
    const reward = rewardFromEvent(event);
    if (!reward.storyEnergy && !reward.coins) return `<p>This Game session primarily rewards <strong>Game/character progress</strong>. Coins and Story Energy are intentionally not guaranteed for every passive session; tracked goals and milestones carry stronger completion rewards.</p>`;
    return null;
  }

  function dedupeWhy(event) {
    return `<p>This action was logged, but its direct reward was suppressed because the same real-world activity had already been rewarded through a linked source within the duplicate-protection window.</p>`;
  }

  function sourceMeta(source, category) {
    const map = {
      "daily-checkin": ["✦", "Daily Check-in"],
      "daily-batch-clear": ["✦", "Daily Plan"],
      stewardship: ["🗂️", "Stewardship"],
      "game-goal": ["🏆", "Game Goal"],
      "game-finish": ["🎮", "Game milestone"],
      "book-finish": ["📚", "Book milestone"],
      "adventure-finish": ["✧", "Adventure milestone"],
      "adventure-output": ["📝", "Project Memory"],
      achievement: ["🏆", "Achievement"],
      "achievements-unlock": ["🏆", "Achievement"],
      "habit-daypart-clear": ["❀", "Habit bonus"],
      "sudoku-complete": ["🧩", "Sudoku"],
      "sudoku-solved": ["🧩", "Sudoku"],
      "kotoba-quest": ["🌸", "Kotoba Quest"],
      "journal-reflection-base": ["🌸", "Journal"],
      "journal-reflection-effort": ["🌸", "Journal"],
      "habit-coin-repair": ["↺", "Reward repair"]
    };
    const found = map[source];
    if (found) return { icon: found[0], label: found[1] };
    const fallback = { time: ["◷", "Time"], habit: ["❀", "Habit"], quest: ["☷", "Quest"], journal: ["🌸", "Journal"], library: ["📚", "Library"], adventure: ["✧", "Adventure"], achievement: ["🏆", "Achievement"], other: ["✦", "Other"] }[category] || ["✦", "Activity"];
    return { icon: fallback[0], label: humanize(source || fallback[1]) };
  }

  function categoryForEvent(event) {
    const value = String(event?.source || "");
    if (value === "stewardship") {
      const type = String(event?.metadata?.type || "").toLowerCase();
      if (type === "habit") return "habit";
      if (type === "adventure") return "adventure";
      if (["book", "game", "gamedetails", "gamesteam"].includes(type)) return "library";
    }
    return categoryForSource(value);
  }

  function categoryForSource(source) {
    const value = String(source || "");
    if (value === "time") return "time";
    if (value.startsWith("habit")) return "habit";
    if (["quest", "external", "manual-external", "quick", "daily-batch-clear"].includes(value)) return "quest";
    if (value.startsWith("journal") || value.startsWith("daily-checkin")) return "journal";
    if (value.startsWith("book") || value === "library" || value.startsWith("game") || value === "stewardship" || value.startsWith("sudoku")) return "library";
    if (value.startsWith("adventure")) return "adventure";
    if (value === "kotoba-quest") return "japanese";
    if (value.startsWith("achievement")) return "achievement";
    return "other";
  }

  function rewardEventsForDate(key) {
    return (app.getState().rewardLedger?.events || []).filter(event => dateKey(new Date(event.at || 0)) === key);
  }

  function timeEntriesForDate(key) {
    return (app.getState().timeTracking?.entries || []).filter(entry => dateKey(new Date(entry.endAt || entry.startAt || 0)) === key);
  }

  function effectiveMinutesBefore(target, key) {
    const targetAt = new Date(target.endAt || target.startAt || 0).getTime();
    return timeEntriesForDate(key).reduce((sum, entry) => {
      if (entry.id === target.id || !entry.rewardProcessed) return sum;
      const at = new Date(entry.endAt || entry.startAt || 0).getTime();
      if (!Number.isFinite(at) || at > targetAt) return sum;
      const meta = TIME_CATEGORY_META[entry.categoryId] || TIME_CATEGORY_META.other;
      return sum + number(entry.minutes) * meta.multiplier;
    }, 0);
  }

  function rewardFromEvent(event) {
    return {
      xp: number(event?.xp), realmXP: number(event?.realmXP), statXP: number(event?.statXP), coins: number(event?.coins),
      storyEnergy: number(event?.storyEnergy), rawStoryEnergy: number(event?.rawStoryEnergy ?? event?.storyEnergy)
    };
  }

  function rewardFromLog(log) {
    return {
      xp: number(log?.xp), realmXP: number(log?.realmXP), statXP: number(log?.statXP), coins: number(log?.coins),
      storyEnergy: number(log?.storyEnergy ?? log?.reward), rawStoryEnergy: number(log?.rawStoryEnergy ?? log?.rawReward ?? log?.storyEnergy ?? log?.reward)
    };
  }

  function sumRewards(events) {
    return events.reduce((sum, event) => {
      const reward = rewardFromEvent(event);
      Object.keys(sum).forEach(key => { sum[key] += number(reward[key]); });
      return sum;
    }, emptyReward());
  }

  function emptyReward() { return { xp: 0, realmXP: 0, statXP: 0, coins: 0, storyEnergy: 0, rawStoryEnergy: 0 }; }
  function hasRewardFields(log) { return ["xp", "realmXP", "statXP", "coins", "storyEnergy", "reward", "rawStoryEnergy", "rawReward"].some(key => Object.prototype.hasOwnProperty.call(log || {}, key)); }
  function rewardInline(reward) {
    const parts = [];
    if (reward.xp) parts.push(`+${trim(reward.xp)} XP`);
    if (reward.storyEnergy) parts.push(`+${app.formatEnergy?.(reward.storyEnergy) ?? trim(reward.storyEnergy)} 🔥`);
    if (reward.coins) parts.push(`+${trim(reward.coins)} 🪙`);
    return parts.length ? parts.join(" · ") : "no direct reward";
  }

  function latestAt(events) {
    if (!events.length) return null;
    return events.reduce((latest, event) => new Date(event.at || 0) > new Date(latest || 0) ? event.at : latest, events[0].at);
  }

  function hasReflection(entry) { return Boolean(entry && [entry.gratitude, entry.smallWin, entry.hardThing].some(value => String(value || "").trim())); }
  function journalCharacterCount(entry) { return [entry?.gratitude, entry?.smallWin, entry?.hardThing].reduce((sum, value) => sum + String(value || "").trim().length, 0); }

  function capabilityLabel(key) {
    const map = { confidence: "Confidence", wellbeing: "Wellbeing", knowledge: "Knowledge", creativity: "Creativity", japanese: "Japanese", strength: "Strength", social: "Social" };
    return map[key] || "Capability";
  }

  function categoryLabel(key) { return FILTERS.find(item => item[0] === key)?.[1] || "Activity"; }
  function humanEffort(value) { return ({ tiny: "Tiny", low: "Low Energy", normal: "Normal", high: "High", boss: "Boss" }[String(value || "").toLowerCase()] || humanize(value || "Habit")); }
  function humanize(value) { return String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, char => char.toUpperCase()); }
  function singularUnit(value) { const text = String(value || "unit"); return text.endsWith("s") ? text.slice(0, -1) : text; }
  function trackingUnitFallback(mode) { return ({ days: "in-game days", runs: "runs", matches: "matches", chapters: "chapters", objectives: "objectives", minutes: "minutes" }[mode] || "units"); }

  function todayKey() { return dateKey(new Date()); }
  function dateKey(date) {
    const d = new Date(date);
    if (!Number.isFinite(d.getTime())) return "1970-01-01";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dateFromKey(key) {
    const [year, month, day] = String(key || todayKey()).split("-").map(Number);
    return new Date(year, Math.max(0, month - 1), day || 1, 12, 0, 0, 0);
  }
  function isDateKey(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
  function formatTime(value) {
    const date = new Date(value || 0);
    return Number.isFinite(date.getTime()) ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";
  }
  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(number(minutes)));
    if (!total) return "0m";
    if (total < 60) return `${total}m`;
    const h = Math.floor(total / 60); const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  function toIso(value) {
    if (typeof value === "number") return new Date(value).toISOString();
    const date = new Date(value || 0);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  function number(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function trim(value) { const n = number(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function byId(id) { return document.getElementById(id); }
  function esc(value) { return app.escapeHtml?.(String(value ?? "")) ?? String(value ?? ""); }

  window.LifeRPGActivityLog = { render, collectRows: key => collectRows(key || selectedDate), setDate: key => { if (isDateKey(key)) { selectedDate = key; render(); } } };
})();
