(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG habits could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const HABIT_SCHEMA = 2;
  const SHADOW_KEY = "life-rpg-habits-shadow-v1";
  const STREAK_GROWTH = 1.03;
  const STREAK_CAP = 2;
  const REALMS = ["Health", "Recovery", "Japanese", "Hobbies", "Work", "Knowledge", "Home"];
  const DAYPARTS = {
    morning: { label: "Morning", icon: "☀️", order: 0 },
    daytime: { label: "Daytime", icon: "🌤️", order: 1 },
    evening: { label: "Evening", icon: "🌙", order: 2 },
    anytime: { label: "Anytime", icon: "✨", order: 3 }
  };
  const EFFORTS = {
    tiny: { label: "Tiny", base: 0.25, xp: 3 },
    low: { label: "Low", base: 0.40, xp: 5 },
    normal: { label: "Normal", base: 0.70, xp: 8 },
    high: { label: "High", base: 1.20, xp: 12 },
    boss: { label: "Boss", base: 2.00, xp: 18 }
  };

  let showArchived = false;
  let initialized = false;

  const els = {
    add: byId("addHabitButton"),
    addSecondary: byId("addHabitButtonSecondary"),
    emptyCreate: byId("habitEmptyCreate"),
    board: byId("habitBoard"),
    empty: byId("habitEmpty"),
    dashboard: byId("dashboardHabits"),
    activeSummary: byId("habitSummaryActive"),
    dueSummary: byId("habitSummaryDue"),
    streakSummary: byId("habitSummaryBestStreak"),
    toggleArchived: byId("toggleArchivedHabits"),
    dialog: byId("habitDialog"),
    form: byId("habitForm"),
    editId: byId("habitEditId"),
    title: byId("habitDialogTitle"),
    close: byId("habitDialogClose"),
    cancel: byId("cancelHabitButton"),
    deleteButton: byId("deleteHabitButton"),
    name: byId("habitName"),
    realm: byId("habitRealm"),
    effort: byId("habitEffort"),
    scheduleType: byId("habitScheduleType"),
    scheduleCountWrap: byId("habitScheduleCountWrap"),
    scheduleCountLabel: byId("habitScheduleCountLabel"),
    scheduleCount: byId("habitScheduleCount"),
    daypart: byId("habitDaypart"),
    note: byId("habitNote"),
    rewardPreview: byId("habitRewardPreview"),
    cadenceEditNote: byId("habitEditCadenceNote"),
    toast: byId("habitToast"),
    toastTitle: byId("habitToastTitle"),
    toastReward: byId("habitToastReward")
  };

  init();

  function init() {
    bindEvents();
    const changed = ensureHabitsState();
    initialized = true;
    if (changed) persist("habits-init", { render: false });
    render();
  }

  function bindEvents() {
    els.add?.addEventListener("click", () => openHabitDialog());
    els.addSecondary?.addEventListener("click", () => openHabitDialog());
    els.emptyCreate?.addEventListener("click", () => openHabitDialog());
    els.close?.addEventListener("click", closeHabitDialog);
    els.cancel?.addEventListener("click", closeHabitDialog);
    els.deleteButton?.addEventListener("click", deleteHabitFromDialog);
    els.form?.addEventListener("submit", saveHabitFromDialog);
    els.scheduleType?.addEventListener("change", updateScheduleControls);
    els.scheduleCount?.addEventListener("input", renderHabitRewardPreview);
    els.effort?.addEventListener("change", renderHabitRewardPreview);
    els.daypart?.addEventListener("change", renderHabitRewardPreview);
    els.toggleArchived?.addEventListener("click", () => {
      showArchived = !showArchived;
      render();
    });

    document.addEventListener("click", event => {
      const complete = event.target.closest?.("[data-habit-complete]");
      if (complete) {
        completeHabit(complete.dataset.habitComplete);
        return;
      }

      const edit = event.target.closest?.("[data-habit-edit]");
      if (edit) {
        openHabitDialog(edit.dataset.habitEdit);
        return;
      }

      const archive = event.target.closest?.("[data-habit-archive]");
      if (archive) {
        toggleHabitArchive(archive.dataset.habitArchive);
      }
    });

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureHabitsState();
      render();
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureHabitsState() {
    const state = app.getState();
    let changed = false;

    if (!state.habits || typeof state.habits !== "object" || Array.isArray(state.habits)) {
      const shadow = readShadow();
      state.habits = shadow || defaultHabitState();
      changed = true;
    }

    if (Number(state.habits.schemaVersion || 0) < HABIT_SCHEMA) {
      state.habits.schemaVersion = HABIT_SCHEMA;
      changed = true;
    }

    if (!Array.isArray(state.habits.items)) {
      state.habits.items = [];
      changed = true;
    }

    if (!Array.isArray(state.habits.completions)) {
      state.habits.completions = [];
      changed = true;
    }

    state.habits.items.forEach(habit => {
      if (habit.active === undefined) { habit.active = true; changed = true; }
      if (!habit.scheduleStartDate) { habit.scheduleStartDate = habit.createdDate || todayKey(); changed = true; }
      if (!habit.trackingFrom) { habit.trackingFrom = Date.now(); changed = true; }
      if (!habit.schedule || typeof habit.schedule !== "object") { habit.schedule = { type: "daily" }; changed = true; }
      if (!EFFORTS[habit.effort]) { habit.effort = "low"; changed = true; }
      if (!REALMS.includes(habit.realm)) { habit.realm = "Health"; changed = true; }
      if (!DAYPARTS[habit.daypart]) { habit.daypart = "anytime"; changed = true; }
    });

    writeShadow(state.habits);
    return changed;
  }

  function defaultHabitState() {
    return {
      schemaVersion: HABIT_SCHEMA,
      items: [],
      completions: []
    };
  }

  function habitState() {
    ensureHabitsState();
    return app.getState().habits;
  }

  function readShadow() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.completions)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeShadow(value) {
    try {
      localStorage.setItem(SHADOW_KEY, JSON.stringify(value));
    } catch {
      // The main save remains canonical; this is only a local safety shadow.
    }
  }

  function persist(source, { render: shouldRender = true } = {}) {
    const state = app.getState();
    writeShadow(state.habits);
    app.saveState({ source });
    if (shouldRender) render();
  }

  function render() {
    if (!els.board && !els.dashboard) return;
    const habits = habitState().items;
    const active = habits.filter(h => h.active !== false);
    const archived = habits.filter(h => h.active === false);
    const activeSnapshots = active.map(snapshotForHabit);

    if (els.activeSummary) els.activeSummary.textContent = String(active.length);
    if (els.dueSummary) els.dueSummary.textContent = String(activeSnapshots.filter(s => s.canComplete).length);
    if (els.streakSummary) {
      const best = activeSnapshots.reduce((max, s) => Math.max(max, s.streak), 0);
      els.streakSummary.textContent = best ? `${best} ${best === 1 ? "period" : "periods"}` : "0";
    }

    if (els.toggleArchived) {
      els.toggleArchived.classList.toggle("hidden", archived.length === 0);
      els.toggleArchived.textContent = showArchived ? "Hide archived" : `Show archived (${archived.length})`;
    }

    renderBoard(activeSnapshots, archived);
    renderDashboard(activeSnapshots);
  }

  function renderBoard(activeSnapshots, archived) {
    if (!els.board || !els.empty) return;

    if (activeSnapshots.length === 0 && (!showArchived || archived.length === 0)) {
      els.board.innerHTML = "";
      els.empty.classList.remove("hidden");
      return;
    }

    els.empty.classList.add("hidden");

    const groups = Object.keys(DAYPARTS)
      .map(key => {
        const entries = activeSnapshots
          .filter(snapshot => normalizedDaypart(snapshot.habit) === key)
          .sort(compareHabitSnapshots);
        if (!entries.length) return "";
        const meta = DAYPARTS[key];
        const ready = entries.filter(snapshot => snapshot.canComplete).length;
        return `
          <section class="habit-daypart-section-v131" data-daypart="${key}">
            <header class="habit-daypart-heading-v131">
              <span class="habit-daypart-icon-v131">${meta.icon}</span>
              <div><small>${escapeHtml(daypartEyebrow(key))}</small><h3>${escapeHtml(meta.label)}</h3></div>
              <span class="habit-daypart-count-v131">${ready ? `${ready} ready` : "clear"}</span>
            </header>
            <div class="habit-daypart-grid-v131">${entries.map(renderHabitCard).join("")}</div>
          </section>`;
      })
      .join("");

    const archivedHtml = showArchived && archived.length
      ? `<div class="habit-archive-divider-v1"><span>Archived habits</span></div><div class="habit-daypart-grid-v131">${archived.map(h => renderHabitCard(snapshotForHabit(h), { archived: true })).join("")}</div>`
      : "";

    els.board.innerHTML = groups + archivedHtml;
  }

  function renderDashboard(activeSnapshots) {
    if (!els.dashboard) return;

    if (!activeSnapshots.length) {
      els.dashboard.innerHTML = `
        <div class="dashboard-habit-empty-v1">
          <span>🌱</span>
          <div><strong>No habits yet.</strong><small>Add the things you want a little extra support to remember.</small></div>
          <button class="secondary-button" type="button" data-view-target="habits">Create habits</button>
        </div>`;
      return;
    }

    const sorted = [...activeSnapshots].sort(compareHabitSnapshots);
    const readyCount = sorted.filter(s => s.canComplete).length;
    const current = currentDaypart();
    const groups = Object.keys(DAYPARTS)
      .map(key => {
        const entries = sorted.filter(snapshot => normalizedDaypart(snapshot.habit) === key);
        if (!entries.length) return "";
        const meta = DAYPARTS[key];
        const ready = entries.filter(snapshot => snapshot.canComplete).length;
        const allDone = entries.every(snapshot => snapshot.completedToday || snapshot.periodComplete || !snapshot.canComplete);
        const isPast = key !== "anytime" && DAYPARTS[key].order < DAYPARTS[current].order;
        const compact = isPast && allDone;
        return `
          <section class="dashboard-habit-daypart-v131 ${key === current ? "current" : ""} ${compact ? "compact" : ""}">
            <header>
              <span>${meta.icon}</span>
              <strong>${escapeHtml(meta.label)}</strong>
              <small>${compact ? "Done ✓" : ready ? `${ready} ready` : "Clear"}</small>
            </header>
            ${compact ? "" : `<div class="dashboard-habit-timeline-v131">${entries.map(renderDashboardHabit).join("")}</div>`}
          </section>`;
      })
      .join("");

    els.dashboard.innerHTML = `
      <div class="dashboard-habit-summary-v1">
        <strong>${readyCount ? `${readyCount} ready today` : "Today's habit rhythm is clear"}</strong>
        <span>${sorted.length} active · best streak ${Math.max(...sorted.map(s => s.streak), 0)}</span>
      </div>
      <div class="dashboard-habit-dayplan-v131">${groups}</div>`;
  }

  function renderDashboardHabit(snapshot) {
    const { habit, canComplete, reward, streak, progressText, timingText, completedToday } = snapshot;
    const daypart = DAYPARTS[normalizedDaypart(habit)];
    return `
      <article class="dashboard-habit-row-v131 ${canComplete ? "ready" : ""} ${completedToday ? "done" : ""}">
        <span class="habit-realm-dot-v1 realm-${cssToken(habit.realm)}"></span>
        <div class="dashboard-habit-row-copy-v131">
          <strong>${escapeHtml(habit.name)}</strong>
          <small>${escapeHtml(progressText)} · ${escapeHtml(timingText)}</small>
        </div>
        <div class="dashboard-habit-row-meta-v131">
          <span title="${escapeHtml(daypart.label)}">${daypart.icon}</span>
          <span>🔥 ${formatEnergy(reward)}</span>
          ${streak ? `<span>✦ ${streak}</span>` : ""}
        </div>
        ${canComplete
          ? `<button class="habit-quick-complete-v1" type="button" data-habit-complete="${escapeHtml(habit.id)}">Done</button>`
          : `<span class="dashboard-habit-state-v1">${completedToday ? "✓" : escapeHtml(timingText)}</span>`}
      </article>`;
  }

  function compareHabitSnapshots(a, b) {
    const daypartDiff = DAYPARTS[normalizedDaypart(a.habit)].order - DAYPARTS[normalizedDaypart(b.habit)].order;
    if (daypartDiff) return daypartDiff;
    return Number(b.canComplete) - Number(a.canComplete) || a.nextSort - b.nextSort || a.habit.name.localeCompare(b.habit.name);
  }

  function normalizedDaypart(habit) {
    return DAYPARTS[habit?.daypart] ? habit.daypart : "anytime";
  }

  function daypartEyebrow(key) {
    if (key === "morning") return "START THE DAY";
    if (key === "daytime") return "THROUGH THE DAY";
    if (key === "evening") return "WIND DOWN";
    return "WHENEVER IT FITS";
  }

  function currentDaypart() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "daytime";
    return "evening";
  }

  function renderHabitCard(snapshot, { archived = false } = {}) {
    const { habit, streak, canComplete, completedToday, progressText, timingText, reward, baseReward, multiplier } = snapshot;
    const note = habit.note ? `<p class="habit-card-note-v1">${escapeHtml(habit.note)}</p>` : "";
    const statusClass = archived ? "archived" : canComplete ? "ready" : completedToday ? "done-today" : "waiting";

    let actionHtml;
    if (archived) {
      actionHtml = `<button class="secondary-button" type="button" data-habit-archive="${escapeHtml(habit.id)}">Restore</button>`;
    } else if (canComplete) {
      actionHtml = `<button class="primary-button habit-complete-button-v1" type="button" data-habit-complete="${escapeHtml(habit.id)}">✓ Log done · +${formatEnergy(reward)} 🔥</button>`;
    } else {
      actionHtml = `<button class="secondary-button" type="button" disabled>${completedToday ? "Logged today ✓" : escapeHtml(timingText)}</button>`;
    }

    return `
      <article class="habit-card-v1 ${statusClass}">
        <div class="habit-card-top-v1">
          <div class="habit-card-title-v1">
            <span class="habit-realm-dot-v1 realm-${cssToken(habit.realm)}"></span>
            <div>
              <div class="habit-card-labels-v1">
                <span>${escapeHtml(habit.realm)}</span>
                <span>${DAYPARTS[normalizedDaypart(habit)].icon} ${escapeHtml(DAYPARTS[normalizedDaypart(habit)].label)}</span>
                <span>${escapeHtml(scheduleLabel(habit))}</span>
                <span>${escapeHtml(EFFORTS[habit.effort]?.label || "Low")} effort</span>
              </div>
              <h3>${escapeHtml(habit.name)}</h3>
            </div>
          </div>
          <button class="habit-edit-button-v1" type="button" data-habit-edit="${escapeHtml(habit.id)}" aria-label="Edit ${escapeHtml(habit.name)}">⋯</button>
        </div>

        ${note}

        <div class="habit-progress-panel-v1">
          <div>
            <small>THIS PERIOD</small>
            <strong>${escapeHtml(progressText)}</strong>
            <span>${escapeHtml(timingText)}</span>
          </div>
          <div class="habit-streak-flame-v1 ${streak ? "active" : ""}">
            <span>🔥</span>
            <strong>${streak}</strong>
            <small>${escapeHtml(streakUnitLabel(habit, streak))}</small>
          </div>
        </div>

        <div class="habit-reward-line-v1">
          <div><small>BASE</small><strong>${formatEnergy(baseReward)} 🔥</strong></div>
          <span>×</span>
          <div><small>STREAK</small><strong>${formatMultiplier(multiplier)}</strong></div>
          <span>=</span>
          <div class="habit-reward-current-v1"><small>NEXT CLEAR</small><strong>${formatEnergy(reward)} 🔥</strong></div>
        </div>

        <footer class="habit-card-footer-v1">
          <span class="habit-no-penalty-v1">${streak ? "Keep going for a larger bonus." : "Fresh start. Nothing was lost."}</span>
          <div class="habit-card-actions-v1">
            <button class="text-button" type="button" data-habit-archive="${escapeHtml(habit.id)}">${archived ? "Restore" : "Archive"}</button>
            ${actionHtml}
          </div>
        </footer>
      </article>`;
  }

  function snapshotForHabit(habit) {
    const completions = completionsForHabit(habit);
    const period = currentPeriod(habit);
    const target = targetForHabit(habit);
    const inPeriod = period ? completions.filter(c => c.periodKey === period.key) : [];
    const completedToday = completions.some(c => c.date === todayKey());
    const periodComplete = inPeriod.length >= target;
    const scheduleAllowsToday = isScheduledToday(habit);
    const canComplete = habit.active !== false && scheduleAllowsToday && !completedToday && !periodComplete;
    const streak = calculateStreak(habit, completions);
    const candidate = canComplete ? candidateCompletion(habit, period, completions) : null;
    const candidateCompletions = candidate ? [...completions, candidate] : completions;
    const candidateStreak = candidate ? calculateStreak(habit, candidateCompletions) : streak;
    const rewardStreak = Math.max(streak, candidateStreak, 1);
    const multiplier = streakMultiplier(rewardStreak);
    const baseReward = effortBase(habit);
    const rawReward = floor2(baseReward * multiplier);
    const preview = app.previewActivityReward?.({
      source: "habit",
      sourceId: habit.id,
      label: habit.name,
      realm: habit.realm,
      capability: app.inferCapability?.({ realm: habit.realm, label: habit.name, kind: "habit" }),
      storyEnergyBase: rawReward
    });
    const reward = preview ? Number(preview.storyEnergy || 0) : rawReward;

    return {
      habit,
      streak,
      candidateStreak,
      canComplete,
      completedToday,
      periodComplete,
      progressText: progressLabel(habit, inPeriod.length, target),
      timingText: timingLabel(habit, { completedToday, periodComplete }),
      reward,
      rawReward,
      baseReward,
      multiplier,
      nextSort: nextSortValue(habit)
    };
  }

  function candidateCompletion(habit, period) {
    return {
      id: "preview",
      habitId: habit.id,
      date: todayKey(),
      timestamp: Date.now(),
      periodKey: period?.key || todayKey(),
      reward: 0
    };
  }

  function completeHabit(habitId) {
    const state = app.getState();
    ensureHabitsState();
    const habit = state.habits.items.find(item => item.id === habitId);
    if (!habit || habit.active === false) return;

    const snapshot = snapshotForHabit(habit);
    if (!snapshot.canComplete) return;

    const period = currentPeriod(habit);
    const now = Date.now();
    const provisional = {
      id: makeId("HC"),
      habitId: habit.id,
      date: todayKey(),
      timestamp: now,
      periodKey: period.key,
      reward: 0,
      rawReward: 0,
      baseReward: snapshot.baseReward,
      multiplier: 1,
      streakAfter: 0,
      effort: habit.effort
    };

    const before = completionsForHabit(habit);
    const after = [...before, provisional];
    const streakAfter = calculateStreak(habit, after);
    const streakForReward = Math.max(snapshot.streak, streakAfter, 1);
    const multiplier = streakMultiplier(streakForReward);
    const rawReward = floor2(effortBase(habit) * multiplier);
    const effort = EFFORTS[habit.effort] || EFFORTS.low;
    const xp = Math.max(1, Number(effort.xp || 5));
    const capability = app.inferCapability?.({ realm: habit.realm, label: habit.name, kind: "habit" }) || "wellbeing";
    const reward = app.awardActivity?.({
      source: "habit",
      sourceId: habit.id,
      label: habit.name,
      realm: habit.realm,
      capability,
      xp,
      realmXP: xp,
      statXP: Math.max(1, Math.round(xp * 0.65)),
      storyEnergyBase: rawReward,
      at: new Date(now).toISOString(),
      metadata: { effort: habit.effort, streakAfter, periodKey: period.key }
    }) || { xp: 0, statXP: 0, storyEnergy: rawReward, rawStoryEnergy: rawReward };

    provisional.streakAfter = streakAfter;
    provisional.multiplier = multiplier;
    provisional.rawReward = rawReward;
    provisional.reward = Number(reward.storyEnergy || 0);
    provisional.xp = Number(reward.xp || 0);
    provisional.realmXP = Number(reward.realmXP || 0);
    provisional.stat = capability;
    provisional.statXP = Number(reward.statXP || 0);
    provisional.rewardEventId = reward.eventId || null;
    provisional.deduped = Boolean(reward.deduped);

    state.habits.completions.push(provisional);

    persist("habit-complete");
    app.renderAll?.();
    showHabitToast(habit, reward, streakAfter);

    try {
      window.dispatchEvent(new CustomEvent("life-rpg:habit-complete", {
        detail: { habitId: habit.id, reward: reward.storyEnergy, xp: reward.xp, streakAfter, date: provisional.date }
      }));
    } catch {
      // Older browsers may not support CustomEvent construction; completion is already saved.
    }
  }


  function showHabitToast(habit, reward, streakAfter) {
    if (!els.toast) return;
    if (els.toastTitle) els.toastTitle.textContent = habit.name;
    if (els.toastReward) {
      const streakText = streakAfter > 1 ? ` · ${streakAfter}-${streakUnitLabel(habit, 1)} streak` : "";
      els.toastReward.textContent = `+${formatEnergy(reward.storyEnergy)} Story Energy · +${Number(reward.xp || 0)} XP${streakText}`;
    }
    els.toast.classList.remove("hidden");
    els.toast.classList.add("show");
    window.clearTimeout(showHabitToast.timer);
    showHabitToast.timer = window.setTimeout(() => {
      els.toast?.classList.remove("show");
      window.setTimeout(() => els.toast?.classList.add("hidden"), 180);
    }, 2400);
  }

  function openHabitDialog(habitId = null) {
    if (!els.dialog || !els.form) return;
    ensureHabitsState();

    const habit = habitId ? habitState().items.find(item => item.id === habitId) : null;
    els.form.reset();
    els.editId.value = habit?.id || "";
    els.title.textContent = habit ? "Edit habit" : "Create a habit";
    els.deleteButton?.classList.toggle("hidden", !habit);
    els.cadenceEditNote?.classList.toggle("hidden", !habit);

    if (habit) {
      els.name.value = habit.name || "";
      els.realm.value = REALMS.includes(habit.realm) ? habit.realm : "Health";
      els.effort.value = EFFORTS[habit.effort] ? habit.effort : "low";
      els.scheduleType.value = habit.schedule?.type || "daily";
      els.scheduleCount.value = scheduleCountValue(habit);
      els.daypart.value = normalizedDaypart(habit);
      els.note.value = habit.note || "";
    } else {
      els.realm.value = "Health";
      els.effort.value = "low";
      els.scheduleType.value = "daily";
      els.scheduleCount.value = "2";
      els.daypart.value = "anytime";
      els.note.value = "";
    }

    updateScheduleControls();
    renderHabitRewardPreview();
    els.dialog.showModal();
    setTimeout(() => els.name?.focus(), 0);
  }

  function closeHabitDialog() {
    els.dialog?.close();
  }

  function saveHabitFromDialog(event) {
    event.preventDefault();
    if (!els.name?.value.trim()) return;

    const store = habitState();
    const editId = els.editId.value;
    const existing = editId ? store.items.find(item => item.id === editId) : null;
    const schedule = scheduleFromForm();
    const now = Date.now();
    const today = todayKey();

    if (existing) {
      const scheduleChanged = JSON.stringify(normalizeSchedule(existing.schedule)) !== JSON.stringify(normalizeSchedule(schedule));
      existing.name = els.name.value.trim();
      existing.realm = REALMS.includes(els.realm.value) ? els.realm.value : "Health";
      existing.effort = EFFORTS[els.effort.value] ? els.effort.value : "low";
      existing.daypart = DAYPARTS[els.daypart?.value] ? els.daypart.value : "anytime";
      existing.note = els.note.value.trim();
      existing.schedule = schedule;
      existing.updatedAt = now;
      if (scheduleChanged) {
        existing.scheduleStartDate = today;
        existing.trackingFrom = now;
      }
    } else {
      store.items.push({
        id: makeId("H"),
        name: els.name.value.trim(),
        realm: REALMS.includes(els.realm.value) ? els.realm.value : "Health",
        effort: EFFORTS[els.effort.value] ? els.effort.value : "low",
        daypart: DAYPARTS[els.daypart?.value] ? els.daypart.value : "anytime",
        note: els.note.value.trim(),
        schedule,
        active: true,
        createdDate: today,
        createdAt: now,
        updatedAt: now,
        scheduleStartDate: today,
        trackingFrom: now
      });
    }

    closeHabitDialog();
    persist(existing ? "habit-edit" : "habit-create");
  }

  function deleteHabitFromDialog() {
    const id = els.editId?.value;
    if (!id) return;
    const store = habitState();
    const habit = store.items.find(item => item.id === id);
    if (!habit) return;

    const okay = window.confirm(`Delete “${habit.name}”? Story Energy already earned from it will stay earned.`);
    if (!okay) return;

    store.items = store.items.filter(item => item.id !== id);
    store.completions = store.completions.filter(item => item.habitId !== id);
    closeHabitDialog();
    persist("habit-delete");
  }

  function toggleHabitArchive(habitId) {
    const store = habitState();
    const habit = store.items.find(item => item.id === habitId);
    if (!habit) return;

    if (habit.active === false) {
      habit.active = true;
      habit.scheduleStartDate = todayKey();
      habit.trackingFrom = Date.now();
      habit.updatedAt = Date.now();
    } else {
      habit.active = false;
      habit.archivedAt = Date.now();
      habit.updatedAt = Date.now();
    }

    persist(habit.active ? "habit-restore" : "habit-archive");
  }

  function updateScheduleControls() {
    const type = els.scheduleType?.value || "daily";
    const needsCount = type !== "daily";
    els.scheduleCountWrap?.classList.toggle("hidden", !needsCount);
    if (!needsCount) {
      renderHabitRewardPreview();
      return;
    }

    if (type === "interval") {
      els.scheduleCountLabel.textContent = "Every how many days?";
      els.scheduleCount.min = "2";
      els.scheduleCount.max = "31";
      if (Number(els.scheduleCount.value) < 2) els.scheduleCount.value = "2";
    } else if (type === "weekly") {
      els.scheduleCountLabel.textContent = "How many times per week?";
      els.scheduleCount.min = "1";
      els.scheduleCount.max = "7";
      if (Number(els.scheduleCount.value) > 7) els.scheduleCount.value = "2";
    } else {
      els.scheduleCountLabel.textContent = "How many times per month?";
      els.scheduleCount.min = "1";
      els.scheduleCount.max = "31";
      if (Number(els.scheduleCount.value) < 1) els.scheduleCount.value = "1";
    }

    renderHabitRewardPreview();
  }

  function renderHabitRewardPreview() {
    if (!els.rewardPreview) return;
    const effort = EFFORTS[els.effort?.value] || EFFORTS.low;
    const afterTwoWeeks = floor2(effort.base * streakMultiplier(14));
    const max = floor2(effort.base * STREAK_CAP);
    const schedule = scheduleFromForm();
    const cadence = scheduleLabel({ schedule });
    const daypart = DAYPARTS[els.daypart?.value] || DAYPARTS.anytime;

    els.rewardPreview.innerHTML = `
      <div><span>Day plan</span><strong>${daypart.icon} ${escapeHtml(daypart.label)}</strong></div>
      <div><span>Cadence</span><strong>${escapeHtml(cadence)}</strong></div>
      <div><span>Base clear</span><strong>${formatEnergy(effort.base)} 🔥</strong></div>
      <div><span>14-period streak</span><strong>${formatEnergy(afterTwoWeeks)} 🔥</strong></div>
      <div><span>Maximum streak reward</span><strong>${formatEnergy(max)} 🔥</strong></div>`;
  }

  function scheduleFromForm() {
    const type = els.scheduleType?.value || "daily";
    let count = Math.max(1, Math.floor(Number(els.scheduleCount?.value || 1)));
    if (type === "interval") count = clamp(count, 2, 31);
    if (type === "weekly") count = clamp(count, 1, 7);
    if (type === "monthly") count = clamp(count, 1, 31);

    if (type === "daily") return { type: "daily" };
    if (type === "interval") return { type: "interval", every: count };
    if (type === "weekly") return { type: "weekly", target: count };
    return { type: "monthly", target: count };
  }

  function normalizeSchedule(schedule) {
    const type = schedule?.type || "daily";
    if (type === "interval") return { type, every: clamp(Math.floor(Number(schedule.every || 2)), 2, 31) };
    if (type === "weekly") return { type, target: clamp(Math.floor(Number(schedule.target || 1)), 1, 7) };
    if (type === "monthly") return { type, target: clamp(Math.floor(Number(schedule.target || 1)), 1, 31) };
    return { type: "daily" };
  }

  function scheduleCountValue(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    if (schedule.type === "interval") return schedule.every;
    if (schedule.type === "weekly" || schedule.type === "monthly") return schedule.target;
    return 2;
  }

  function scheduleLabel(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    if (schedule.type === "daily") return "Daily";
    if (schedule.type === "interval") return schedule.every === 2 ? "Every 2nd day" : `Every ${schedule.every} days`;
    if (schedule.type === "weekly") return `${schedule.target}× per week`;
    return `${schedule.target}× per month`;
  }

  function targetForHabit(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    if (schedule.type === "weekly" || schedule.type === "monthly") return schedule.target;
    return 1;
  }

  function completionsForHabit(habit) {
    const trackingFrom = Number(habit.trackingFrom || 0);
    return habitState().completions.filter(c => c.habitId === habit.id && Number(c.timestamp || 0) >= trackingFrom);
  }

  function currentPeriod(habit, dateKey = todayKey()) {
    const schedule = normalizeSchedule(habit.schedule);
    const date = parseDateKey(dateKey);
    const start = parseDateKey(habit.scheduleStartDate || habit.createdDate || dateKey);

    if (schedule.type === "daily") {
      return { key: `D:${dateKey}`, start: dateKey, current: true, initialPartial: false };
    }

    if (schedule.type === "interval") {
      const diff = daysBetween(start, date);
      if (diff < 0 || diff % schedule.every !== 0) return null;
      return { key: `I:${dateKey}`, start: dateKey, current: true, initialPartial: false };
    }

    if (schedule.type === "weekly") {
      const ws = startOfWeek(date);
      const wsKey = formatDateKey(ws);
      return {
        key: `W:${wsKey}`,
        start: wsKey,
        current: true,
        initialPartial: isSameWeek(start, ws) && formatDateKey(start) !== wsKey
      };
    }

    const monthKey = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    return {
      key: `M:${monthKey}`,
      start: `${monthKey}-01`,
      current: true,
      initialPartial: start.getFullYear() === date.getFullYear() && start.getMonth() === date.getMonth() && start.getDate() !== 1
    };
  }

  function isScheduledToday(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    if (schedule.type === "daily" || schedule.type === "weekly" || schedule.type === "monthly") return true;
    return Boolean(currentPeriod(habit));
  }

  function calculateStreak(habit, completions = completionsForHabit(habit)) {
    const periods = periodsThroughToday(habit);
    if (!periods.length) return 0;
    const target = targetForHabit(habit);
    const counts = new Map();
    completions.forEach(c => counts.set(c.periodKey, (counts.get(c.periodKey) || 0) + 1));
    const isComplete = period => (counts.get(period.key) || 0) >= target;

    let index = periods.length - 1;
    const current = periods[index];

    // The current period is still alive. Until it ends, an unfinished goal does not break a streak.
    if (current?.current && !isComplete(current)) index -= 1;

    let streak = 0;
    for (let i = index; i >= 0; i -= 1) {
      const period = periods[i];
      if (isComplete(period)) {
        streak += 1;
        continue;
      }
      // A habit created in the middle of a week/month gets a grace period for that first partial period.
      if (i === 0 && period.initialPartial) continue;
      break;
    }

    return streak;
  }

  function periodsThroughToday(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    const start = parseDateKey(habit.scheduleStartDate || habit.createdDate || todayKey());
    const today = parseDateKey(todayKey());
    if (start > today) return [];
    const periods = [];

    if (schedule.type === "daily") {
      for (let d = cloneDate(start); d <= today; d = addDays(d, 1)) {
        const key = formatDateKey(d);
        periods.push({ key: `D:${key}`, start: key, current: sameDate(d, today), initialPartial: false });
      }
      return periods;
    }

    if (schedule.type === "interval") {
      for (let d = cloneDate(start); d <= today; d = addDays(d, schedule.every)) {
        const key = formatDateKey(d);
        periods.push({ key: `I:${key}`, start: key, current: sameDate(d, today), initialPartial: false });
      }
      return periods;
    }

    if (schedule.type === "weekly") {
      const firstWeek = startOfWeek(start);
      const currentWeek = startOfWeek(today);
      for (let d = cloneDate(firstWeek); d <= currentWeek; d = addDays(d, 7)) {
        const key = formatDateKey(d);
        periods.push({
          key: `W:${key}`,
          start: key,
          current: sameDate(d, currentWeek),
          initialPartial: sameDate(d, firstWeek) && !sameDate(start, firstWeek)
        });
      }
      return periods;
    }

    let y = start.getFullYear();
    let m = start.getMonth();
    const endY = today.getFullYear();
    const endM = today.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${pad(m + 1)}`;
      periods.push({
        key: `M:${key}`,
        start: `${key}-01`,
        current: y === endY && m === endM,
        initialPartial: y === start.getFullYear() && m === start.getMonth() && start.getDate() !== 1
      });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return periods;
  }

  function progressLabel(habit, count, target) {
    const schedule = normalizeSchedule(habit.schedule);
    if (schedule.type === "daily" || schedule.type === "interval") return count >= 1 ? "Done for this due date" : "0 / 1 done";
    if (schedule.type === "weekly") return `${Math.min(count, target)} / ${target} this week`;
    return `${Math.min(count, target)} / ${target} this month`;
  }

  function timingLabel(habit, { completedToday = false, periodComplete = false } = {}) {
    if (habit.active === false) return "Archived";
    const schedule = normalizeSchedule(habit.schedule);

    if (schedule.type === "daily") {
      if (completedToday || periodComplete) return "Back tomorrow";
      return "Ready today";
    }

    if (schedule.type === "interval") {
      if (currentPeriod(habit)) {
        if (completedToday || periodComplete) return `Back in ${schedule.every} days`;
        return "Due today";
      }
      const next = nextIntervalDue(habit);
      const days = next ? daysBetween(parseDateKey(todayKey()), next) : schedule.every;
      return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
    }

    if (schedule.type === "weekly") {
      if (periodComplete) return "Weekly goal met";
      if (completedToday) return "Logged today";
      const days = daysUntilEndOfWeek();
      return days === 0 ? "Last day this week" : `${days + 1} days left this week`;
    }

    if (periodComplete) return "Monthly goal met";
    if (completedToday) return "Logged today";
    const days = daysUntilEndOfMonth();
    return days === 0 ? "Last day this month" : `${days + 1} days left this month`;
  }

  function nextIntervalDue(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    const start = parseDateKey(habit.scheduleStartDate || todayKey());
    const today = parseDateKey(todayKey());
    const diff = Math.max(0, daysBetween(start, today));
    const nextIndex = Math.ceil(diff / schedule.every);
    let due = addDays(start, nextIndex * schedule.every);
    const todayCompletion = completionsForHabit(habit).some(c => c.date === todayKey());
    if (sameDate(due, today) && todayCompletion) due = addDays(due, schedule.every);
    return due;
  }

  function nextSortValue(habit) {
    const schedule = normalizeSchedule(habit.schedule);
    if (schedule.type !== "interval") return 0;
    const next = nextIntervalDue(habit);
    return next ? next.getTime() : Number.MAX_SAFE_INTEGER;
  }

  function streakUnitLabel(habit, streak) {
    const type = normalizeSchedule(habit.schedule).type;
    const unit = type === "daily" ? "day" : type === "interval" ? "interval" : type === "weekly" ? "week" : "month";
    return `${unit}${streak === 1 ? "" : "s"}`;
  }

  function effortBase(habit) {
    return EFFORTS[habit.effort]?.base ?? EFFORTS.low.base;
  }

  function streakMultiplier(streak) {
    const safeStreak = Math.max(1, Number(streak || 1));
    return Math.min(STREAK_CAP, Math.pow(STREAK_GROWTH, safeStreak - 1));
  }

  function formatMultiplier(value) {
    const floored = floor2(value);
    return `×${floored.toFixed(2)}`;
  }

  function formatEnergy(value) {
    const number = floor2(Number(value || 0));
    return number.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function floor2(value) {
    return Math.floor((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function makeId(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function todayKey() {
    return formatDateKey(new Date());
  }

  function parseDateKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  }

  function formatDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function cloneDate(date) {
    return new Date(date.getTime());
  }

  function addDays(date, days) {
    const next = cloneDate(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function daysBetween(a, b) {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
  }

  function startOfWeek(date) {
    const d = cloneDate(date);
    const day = d.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + delta);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  function isSameWeek(date, weekStart) {
    return sameDate(startOfWeek(date), weekStart);
  }

  function daysUntilEndOfWeek() {
    const today = parseDateKey(todayKey());
    const day = today.getDay();
    return day === 0 ? 0 : 7 - day;
  }

  function daysUntilEndOfMonth() {
    const today = parseDateKey(todayKey());
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12);
    return daysBetween(today, last);
  }

  function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cssToken(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  }

  function escapeHtml(value) {
    if (app.escapeHtml) return app.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.LifeRPGHabits = {
    render,
    openCreate: () => openHabitDialog(),
    getHabits: () => habitState().items.map(item => ({ ...item })),
    getCompletions: () => habitState().completions.map(item => ({ ...item })),
    complete: completeHabit
  };
})();
