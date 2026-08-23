(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Games could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 1;
  const SHADOW_KEY = "life-rpg-games-shadow-v1";
  const MAX_LOGS = 800;

  const STATUSES = {
    playing: { icon: "▶", label: "Playing" },
    backlog: { icon: "✦", label: "Backlog" },
    paused: { icon: "◷", label: "Paused" },
    finished: { icon: "✓", label: "Finished" },
    endless: { icon: "∞", label: "Endless" }
  };

  const ROLES = {
    fun: { icon: "🎮", label: "For Fun", realm: "Hobbies" },
    social: { icon: "♡", label: "Social", realm: "Hobbies" },
    japanese: { icon: "あ", label: "Japanese", realm: "Japanese" },
    challenge: { icon: "✦", label: "Challenge / Goals", realm: "Hobbies" }
  };

  const els = {
    add: byId("addGameButton"),
    secondaryAdd: byId("addGameButtonSecondary"),
    emptyAdd: byId("gameEmptyCreate"),
    board: byId("gameBoard"),
    empty: byId("gameEmpty"),
    search: byId("gameSearch"),
    status: byId("gameStatusFilter"),
    roleFilters: byId("gameRoleFilters"),
    playingSummary: byId("gameSummaryPlaying"),
    backlogSummary: byId("gameSummaryBacklog"),
    goalsSummary: byId("gameSummaryGoals"),

    dialog: byId("gameDialog"),
    form: byId("gameForm"),
    editId: byId("gameEditId"),
    dialogTitle: byId("gameDialogTitle"),
    close: byId("gameDialogClose"),
    cancel: byId("cancelGameButton"),
    deleteButton: byId("deleteGameButton"),
    title: byId("gameTitle"),
    platform: byId("gamePlatform"),
    statusField: byId("gameStatus"),
    role: byId("gameRole"),
    minutes: byId("gameSessionMinutes"),
    progressMode: byId("gameProgressMode"),
    progressWrap: byId("gameProgressWrap"),
    progress: byId("gameProgress"),
    goalsSeed: byId("gameGoalsSeed"),
    notes: byId("gameNotes"),
    preview: byId("gamePreview"),

    logDialog: byId("gameLogDialog"),
    logForm: byId("gameLogForm"),
    logId: byId("gameLogId"),
    logTitle: byId("gameLogTitle"),
    logClose: byId("gameLogClose"),
    logCancel: byId("gameLogCancel"),
    logMinutes: byId("gameLogMinutes"),
    logProgressWrap: byId("gameLogProgressWrap"),
    logProgress: byId("gameLogProgress"),
    logGoal: byId("gameLogGoal"),
    logPreview: byId("gameLogPreview"),

    goalDialog: byId("gameGoalDialog"),
    goalForm: byId("gameGoalForm"),
    goalGameId: byId("gameGoalGameId"),
    goalTitle: byId("gameGoalDialogTitle"),
    goalInput: byId("gameGoalText"),
    goalClose: byId("gameGoalClose"),
    goalCancel: byId("gameGoalCancel"),

    toast: byId("gameToast"),
    toastTitle: byId("gameToastTitle"),
    toastDetail: byId("gameToastDetail")
  };

  let selectedRole = "all";
  let initialized = false;
  let toastTimer = null;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("games-init", { render: false });
    render();
    exposeApi();
  }

  function bindEvents() {
    [els.add, els.secondaryAdd, els.emptyAdd].forEach(button => button?.addEventListener("click", () => openGameDialog()));
    els.close?.addEventListener("click", closeGameDialog);
    els.cancel?.addEventListener("click", closeGameDialog);
    els.form?.addEventListener("submit", saveGame);
    els.deleteButton?.addEventListener("click", deleteCurrentGame);
    els.progressMode?.addEventListener("change", renderGameFormState);
    [els.title, els.platform, els.statusField, els.role, els.minutes, els.progress].forEach(input => input?.addEventListener("input", renderGamePreview));

    els.search?.addEventListener("input", renderBoard);
    els.status?.addEventListener("change", renderBoard);
    els.roleFilters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-game-role]");
      if (!button) return;
      selectedRole = button.dataset.gameRole || "all";
      els.roleFilters.querySelectorAll("[data-game-role]").forEach(node => node.classList.toggle("active", node === button));
      renderBoard();
    });

    document.addEventListener("click", event => {
      const edit = event.target.closest?.("[data-game-edit]");
      if (edit) {
        openGameDialog(edit.dataset.gameEdit);
        return;
      }

      const log = event.target.closest?.("[data-game-log]");
      if (log) {
        openLogDialog(log.dataset.gameLog, Number(log.dataset.gameLogMinutes || 0));
        return;
      }

      const quick = event.target.closest?.("[data-game-quick-log]");
      if (quick) {
        openLogDialog(quick.dataset.gameQuickLog, Number(quick.dataset.gameMinutes || 0));
        return;
      }

      const goalToggle = event.target.closest?.("[data-game-goal-toggle]");
      if (goalToggle) {
        toggleGoal(goalToggle.dataset.gameId, goalToggle.dataset.gameGoalToggle);
        return;
      }

      const addGoal = event.target.closest?.("[data-game-add-goal]");
      if (addGoal) {
        openGoalDialog(addGoal.dataset.gameAddGoal);
        return;
      }

      const goalDelete = event.target.closest?.("[data-game-goal-delete]");
      if (goalDelete) {
        deleteGoal(goalDelete.dataset.gameId, goalDelete.dataset.gameGoalDelete);
      }
    });

    els.logClose?.addEventListener("click", closeLogDialog);
    els.logCancel?.addEventListener("click", closeLogDialog);
    els.logForm?.addEventListener("submit", logSession);
    els.logMinutes?.addEventListener("input", renderLogPreview);
    els.logProgress?.addEventListener("input", renderLogPreview);
    els.logGoal?.addEventListener("change", renderLogPreview);
    document.querySelectorAll("[data-game-log-nudge]").forEach(button => button.addEventListener("click", () => {
      if (!els.logMinutes) return;
      els.logMinutes.value = String(Number(button.dataset.gameLogNudge || 0));
      renderLogPreview();
    }));

    els.goalClose?.addEventListener("click", closeGoalDialog);
    els.goalCancel?.addEventListener("click", closeGoalDialog);
    els.goalForm?.addEventListener("submit", addGoalFromDialog);

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;
    if (!state.gameLibrary || typeof state.gameLibrary !== "object" || Array.isArray(state.gameLibrary)) {
      state.gameLibrary = readShadow() || defaultState();
      changed = true;
    }

    const model = state.gameLibrary;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    if (!Array.isArray(model.items)) { model.items = []; changed = true; }
    if (!Array.isArray(model.logs)) { model.logs = []; changed = true; }

    model.items.forEach(game => {
      if (!game.id) { game.id = makeId("game"); changed = true; }
      if (!game.title) { game.title = "Untitled game"; changed = true; }
      if (!STATUSES[game.status]) { game.status = "backlog"; changed = true; }
      if (!ROLES[game.role]) { game.role = "fun"; changed = true; }
      if (!Number.isFinite(Number(game.sessionMinutes)) || Number(game.sessionMinutes) <= 0) { game.sessionMinutes = 45; changed = true; }
      if (!game.progressMode || !["none", "percent"].includes(game.progressMode)) { game.progressMode = "none"; changed = true; }
      game.progress = clamp(Number(game.progress || 0), 0, 100);
      if (!Array.isArray(game.goals)) { game.goals = []; changed = true; }
      game.goals.forEach(goal => {
        if (!goal.id) { goal.id = makeId("goal"); changed = true; }
        if (typeof goal.text !== "string") { goal.text = "Personal goal"; changed = true; }
        if (typeof goal.done !== "boolean") { goal.done = false; changed = true; }
      });
      if (!Number.isFinite(Number(game.totalMinutes))) {
        game.totalMinutes = model.logs.filter(log => log.gameId === game.id).reduce((sum, log) => sum + Number(log.minutes || 0), 0);
        changed = true;
      }
      if (!Number.isFinite(Number(game.sessions))) {
        game.sessions = model.logs.filter(log => log.gameId === game.id).length;
        changed = true;
      }
      if (!game.createdAt) { game.createdAt = Date.now(); changed = true; }
      if (!game.updatedAt) { game.updatedAt = game.createdAt; changed = true; }
    });

    if (model.logs.length > MAX_LOGS) model.logs = model.logs.slice(-MAX_LOGS);
    writeShadow(model);
    return changed;
  }

  function defaultState() {
    return { schemaVersion: SCHEMA, items: [], logs: [] };
  }

  function model() {
    ensureState();
    return app.getState().gameLibrary;
  }

  function persist(source, { render: shouldRender = true } = {}) {
    const current = model();
    if (current.logs.length > MAX_LOGS) current.logs = current.logs.slice(-MAX_LOGS);
    writeShadow(current);
    app.saveState({ source });
    if (shouldRender) render();
    dispatchChange(source);
  }

  function dispatchChange(source) {
    try { window.dispatchEvent(new CustomEvent("life-rpg:game-change", { detail: { source } })); } catch { /* no-op */ }
  }

  function readShadow() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : null;
    } catch { return null; }
  }

  function writeShadow(value) {
    try { localStorage.setItem(SHADOW_KEY, JSON.stringify(value)); } catch { /* main save remains canonical */ }
  }

  function render() {
    renderSummary();
    renderBoard();
  }

  function renderSummary() {
    const items = model().items;
    const playing = items.filter(game => game.status === "playing" || game.status === "endless").length;
    const backlog = items.filter(game => game.status === "backlog").length;
    const openGoals = items.reduce((sum, game) => sum + game.goals.filter(goal => !goal.done).length, 0);
    if (els.playingSummary) els.playingSummary.textContent = String(playing);
    if (els.backlogSummary) els.backlogSummary.textContent = String(backlog);
    if (els.goalsSummary) els.goalsSummary.textContent = String(openGoals);
  }

  function renderBoard() {
    if (!els.board || !els.empty) return;
    const query = String(els.search?.value || "").trim().toLowerCase();
    const status = els.status?.value || "playing";
    const games = model().items.filter(game => {
      if (status === "playing") {
        if (!["playing", "endless"].includes(game.status)) return false;
      } else if (status !== "all" && game.status !== status) return false;
      if (selectedRole !== "all" && game.role !== selectedRole) return false;
      if (query) {
        const haystack = [game.title, game.platform, game.notes, ...game.goals.map(goal => goal.text)].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    }).sort(sortGames);

    els.board.innerHTML = games.map(gameCardMarkup).join("");
    els.empty.classList.toggle("hidden", games.length > 0);
  }

  function sortGames(a, b) {
    const statusOrder = { playing: 0, endless: 1, paused: 2, backlog: 3, finished: 4 };
    const aOrder = statusOrder[a.status] ?? 9;
    const bOrder = statusOrder[b.status] ?? 9;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aLast = Number(a.lastPlayedAt || 0);
    const bLast = Number(b.lastPlayedAt || 0);
    if (aLast !== bLast) return aLast - bLast;
    return String(a.title).localeCompare(String(b.title));
  }

  function gameCardMarkup(game) {
    const status = STATUSES[game.status] || STATUSES.backlog;
    const role = ROLES[game.role] || ROLES.fun;
    const openGoals = game.goals.filter(goal => !goal.done);
    const doneGoals = game.goals.filter(goal => goal.done);
    const lastPlayed = game.lastPlayedAt ? `Last played ${humanAgo(game.lastPlayedAt)}` : "Not played yet";
    const playtime = game.totalMinutes > 0 ? formatDuration(game.totalMinutes) : "No logged playtime";
    const progress = game.progressMode === "percent" ? clamp(Number(game.progress || 0), 0, 100) : null;
    const active = ["playing", "endless"].includes(game.status);

    return `
      <article class="game-card-v17 ${active ? "active" : ""}">
        <div class="game-card-accent-v17"><span>${esc(role.icon)}</span></div>
        <div class="game-card-body-v17">
          <div class="game-card-top-v17">
            <div class="game-card-heading-v17">
              <div class="game-chip-row-v17">
                <span class="game-status-chip-v17">${status.icon} ${esc(status.label)}</span>
                <span class="game-role-chip-v17">${role.icon} ${esc(role.label)}</span>
                ${game.platform ? `<span class="game-platform-chip-v17">${esc(game.platform)}</span>` : ""}
              </div>
              <h3>${esc(game.title)}</h3>
            </div>
            <button class="icon-button game-edit-button-v17" data-game-edit="${escAttr(game.id)}" type="button" aria-label="Edit ${escAttr(game.title)}">✎</button>
          </div>

          <div class="game-meta-row-v17">
            <span>◷ ${esc(lastPlayed)}</span>
            <span>⌁ ${esc(playtime)}</span>
            <span>✦ ${formatNumber(game.sessions || 0)} session${Number(game.sessions || 0) === 1 ? "" : "s"}</span>
          </div>

          ${progress === null ? "" : `
            <div class="game-progress-v17">
              <div><small>PROGRESS</small><strong>${progress}%</strong></div>
              <div class="progress"><span style="width:${progress}%"></span></div>
            </div>`}

          <div class="game-goals-v17">
            <div class="game-goals-heading-v17">
              <div><small>PERSONAL GOALS</small><strong>${openGoals.length ? `${openGoals.length} still open` : game.goals.length ? "All current goals cleared" : "No goals needed"}</strong></div>
              <button class="text-button" data-game-add-goal="${escAttr(game.id)}" type="button">＋ Add goal</button>
            </div>
            ${game.goals.length ? `<div class="game-goal-list-v17">${game.goals.slice(0, 6).map(goal => goalMarkup(game, goal)).join("")}${game.goals.length > 6 ? `<small class="game-more-goals-v17">+ ${game.goals.length - 6} more in Edit</small>` : ""}</div>` : `<p class="game-no-goals-v17">Optional. Great for games like Stardew Valley where “finish the game” is not the point.</p>`}
            ${doneGoals.length && openGoals.length ? `<small class="game-goal-cleared-v17">${doneGoals.length} goal${doneGoals.length === 1 ? "" : "s"} already cleared ✓</small>` : ""}
          </div>

          <div class="game-card-actions-v17">
            ${active ? `<button class="primary-button" data-game-quick-log="${escAttr(game.id)}" data-game-minutes="${Number(game.sessionMinutes || 45)}" type="button">▶ Play ${Number(game.sessionMinutes || 45)}m</button>` : ""}
            <button class="secondary-button" data-game-log="${escAttr(game.id)}" type="button">Log session</button>
            <button class="text-button" data-game-edit="${escAttr(game.id)}" type="button">Edit details</button>
          </div>
        </div>
      </article>`;
  }

  function goalMarkup(game, goal) {
    return `
      <div class="game-goal-row-v17 ${goal.done ? "done" : ""}">
        <button class="game-goal-check-v17" data-game-id="${escAttr(game.id)}" data-game-goal-toggle="${escAttr(goal.id)}" type="button" aria-label="${goal.done ? "Reopen" : "Complete"} ${escAttr(goal.text)}">${goal.done ? "✓" : ""}</button>
        <span>${esc(goal.text)}</span>
        <button class="game-goal-delete-v17" data-game-id="${escAttr(game.id)}" data-game-goal-delete="${escAttr(goal.id)}" type="button" aria-label="Remove goal">×</button>
      </div>`;
  }

  function openGameDialog(id = "") {
    if (!els.dialog || !els.form) return;
    const game = id ? findGame(id) : null;
    els.form.reset();
    if (els.editId) els.editId.value = game?.id || "";
    if (els.dialogTitle) els.dialogTitle.textContent = game ? "Edit game" : "Add a game";
    if (els.title) els.title.value = game?.title || "";
    if (els.platform) els.platform.value = game?.platform || "";
    if (els.statusField) els.statusField.value = game?.status || "playing";
    if (els.role) els.role.value = game?.role || "fun";
    if (els.minutes) els.minutes.value = String(game?.sessionMinutes || 45);
    if (els.progressMode) els.progressMode.value = game?.progressMode || "none";
    if (els.progress) els.progress.value = String(game?.progress || 0);
    if (els.goalsSeed) els.goalsSeed.value = "";
    if (els.notes) els.notes.value = game?.notes || "";
    els.deleteButton?.classList.toggle("hidden", !game);
    renderGameFormState();
    renderGamePreview();
    els.dialog.showModal();
  }

  function renderGameFormState() {
    els.progressWrap?.classList.toggle("hidden", (els.progressMode?.value || "none") !== "percent");
    renderGamePreview();
  }

  function renderGamePreview() {
    if (!els.preview) return;
    const title = String(els.title?.value || "Untitled game").trim() || "Untitled game";
    const status = STATUSES[els.statusField?.value] || STATUSES.playing;
    const role = ROLES[els.role?.value] || ROLES.fun;
    const minutes = Math.max(5, Number(els.minutes?.value || 45));
    const progress = els.progressMode?.value === "percent" ? clamp(Number(els.progress?.value || 0), 0, 100) : null;
    els.preview.innerHTML = `<span>${role.icon}</span><div><small>${status.icon} ${esc(status.label)} · ${role.label}</small><strong>${esc(title)}</strong><p>${esc(progress === null ? `${minutes}-minute default session` : `${progress}% complete · ${minutes}-minute default session`)}</p></div>`;
  }

  function saveGame(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;
    const id = els.editId?.value || "";
    const existing = id ? findGame(id) : null;
    const now = Date.now();
    const newGoals = parseGoalLines(els.goalsSeed?.value || "");
    const status = els.statusField?.value || "playing";
    const game = {
      ...(existing || {}),
      id: existing?.id || makeId("game"),
      title: String(els.title?.value || "").trim(),
      platform: String(els.platform?.value || "").trim(),
      status,
      role: els.role?.value || "fun",
      sessionMinutes: Math.max(5, Number(els.minutes?.value || 45)),
      progressMode: els.progressMode?.value || "none",
      progress: els.progressMode?.value === "percent" ? clamp(Number(els.progress?.value || 0), 0, 100) : 0,
      goals: [...(existing?.goals || []), ...newGoals],
      notes: String(els.notes?.value || "").trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      totalMinutes: Number(existing?.totalMinutes || 0),
      sessions: Number(existing?.sessions || 0)
    };

    if (game.progressMode === "percent" && game.progress >= 100 && game.status !== "endless") game.status = "finished";
    if (existing) {
      const index = model().items.findIndex(item => item.id === existing.id);
      if (index >= 0) model().items[index] = game;
    } else {
      model().items.push(game);
    }
    persist(existing ? "game-edit" : "game-create");
    closeGameDialog();
    showToast(existing ? "Game updated" : "Game added", `${game.title} is ready for the planner.`);
  }

  function deleteCurrentGame() {
    const id = els.editId?.value;
    const game = findGame(id);
    if (!game) return;
    if (!window.confirm(`Remove “${game.title}” from Life RPG? Existing session logs for this game will also be removed.`)) return;
    const current = model();
    current.items = current.items.filter(item => item.id !== id);
    current.logs = current.logs.filter(log => log.gameId !== id);
    persist("game-delete");
    closeGameDialog();
  }

  function closeGameDialog() {
    if (els.dialog?.open) els.dialog.close();
  }

  function openLogDialog(id, suggestedMinutes = 0) {
    if (!els.logDialog || !els.logForm) return;
    const game = findGame(id);
    if (!game) return;
    els.logForm.reset();
    if (els.logId) els.logId.value = game.id;
    if (els.logTitle) els.logTitle.textContent = game.title;
    if (els.logMinutes) els.logMinutes.value = String(Math.max(5, suggestedMinutes || game.sessionMinutes || 45));
    const usesProgress = game.progressMode === "percent";
    els.logProgressWrap?.classList.toggle("hidden", !usesProgress);
    if (els.logProgress) els.logProgress.value = usesProgress ? String(clamp(Number(game.progress || 0), 0, 100)) : "";
    renderGoalOptions(game);
    renderLogPreview();
    els.logDialog.showModal();
  }

  function renderGoalOptions(game) {
    if (!els.logGoal) return;
    const open = game.goals.filter(goal => !goal.done);
    els.logGoal.innerHTML = `<option value="">No specific goal</option>${open.map(goal => `<option value="${escAttr(goal.id)}">${esc(goal.text)}</option>`).join("")}`;
    els.logGoal.closest("label")?.classList.toggle("hidden", open.length === 0);
  }

  function renderLogPreview() {
    if (!els.logPreview) return;
    const game = findGame(els.logId?.value || "");
    if (!game) { els.logPreview.innerHTML = ""; return; }
    const minutes = Math.max(0, Number(els.logMinutes?.value || 0));
    const progress = game.progressMode === "percent" ? clamp(Number(els.logProgress?.value || game.progress || 0), 0, 100) : null;
    const goal = game.goals.find(item => item.id === els.logGoal?.value);
    els.logPreview.innerHTML = `<span>▶</span><div><small>SESSION</small><strong>${esc(formatDuration(minutes))} with ${esc(game.title)}</strong><p>${goal ? `Working toward: ${esc(goal.text)}` : "Just playing counts."}${progress === null ? "" : ` · Progress after: ${progress}%`}</p></div>`;
  }

  function gameRewardSpec(game, minutes, at) {
    const storyEnergyBase = Math.min(3, Math.max(0.25, Math.max(1, Number(minutes || 0)) * 0.025));
    const xp = Math.max(3, Math.round(storyEnergyBase * 10));
    const role = ROLES[game.role] || ROLES.fun;
    const capability = game.role === "social"
      ? "social"
      : game.role === "japanese"
        ? "japanese"
        : game.role === "challenge"
          ? "confidence"
          : "wellbeing";
    return {
      source: "game",
      sourceId: game.id,
      label: game.title,
      realm: role.realm,
      capability,
      xp,
      realmXP: xp,
      statXP: Math.max(1, Math.round(xp * 0.65)),
      storyEnergyBase,
      dedupeFamily: "gaming",
      at: new Date(at).toISOString(),
      metadata: { minutes: Number(minutes || 0), role: game.role }
    };
  }

  function logSession(event) {
    event.preventDefault();
    if (!els.logForm?.reportValidity()) return;
    const game = findGame(els.logId?.value || "");
    if (!game) return;
    const minutes = Math.max(1, Number(els.logMinutes?.value || 0));
    if (!minutes) return;
    const now = Date.now();
    const goalId = els.logGoal?.value || "";
    const progressAfter = game.progressMode === "percent" ? clamp(Number(els.logProgress?.value || game.progress || 0), 0, 100) : null;

    const reward = app.awardActivity?.(gameRewardSpec(game, minutes, now)) || {
      xp: 0, realmXP: 0, statXP: 0, storyEnergy: 0, rawStoryEnergy: 0
    };
    model().logs.push({
      id: makeId("glog"), gameId: game.id, at: now, date: todayKey(), minutes, goalId: goalId || null, progressAfter,
      xp: Number(reward.xp || 0), realmXP: Number(reward.realmXP || 0), statXP: Number(reward.statXP || 0),
      storyEnergy: Number(reward.storyEnergy || 0), rawStoryEnergy: Number(reward.rawStoryEnergy || 0),
      rewardEventId: reward.eventId || null, deduped: Boolean(reward.deduped)
    });
    game.totalMinutes = Number(game.totalMinutes || 0) + minutes;
    game.sessions = Number(game.sessions || 0) + 1;
    game.lastPlayedAt = now;
    game.updatedAt = now;
    if (goalId) game.lastGoalId = goalId;
    if (progressAfter !== null) game.progress = progressAfter;
    if (game.status === "backlog" || game.status === "paused") game.status = "playing";
    if (game.progressMode === "percent" && game.progress >= 100 && game.status !== "endless") game.status = "finished";

    persist("game-session-log");
    app.renderAll?.();
    closeLogDialog();
    const rewardText = reward.deduped
      ? " · already counted from a linked gaming quest"
      : ` · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${Number(reward.xp || 0)} XP`;
    showToast("Session logged", `${game.title} · ${formatDuration(minutes)}${goalId ? " · personal goal kept in focus" : ""}${rewardText}`);
  }

  function closeLogDialog() {
    if (els.logDialog?.open) els.logDialog.close();
  }

  function openGoalDialog(gameId) {
    const game = findGame(gameId);
    if (!game || !els.goalDialog || !els.goalForm) return;
    els.goalForm.reset();
    if (els.goalGameId) els.goalGameId.value = game.id;
    if (els.goalTitle) els.goalTitle.textContent = `Add a goal for ${game.title}`;
    els.goalDialog.showModal();
    requestAnimationFrame(() => els.goalInput?.focus());
  }

  function addGoalFromDialog(event) {
    event.preventDefault();
    if (!els.goalForm?.reportValidity()) return;
    const game = findGame(els.goalGameId?.value || "");
    const text = String(els.goalInput?.value || "").trim();
    if (!game || !text) return;
    game.goals.push({ id: makeId("goal"), text, done: false, createdAt: Date.now(), completedAt: null });
    game.updatedAt = Date.now();
    persist("game-goal-add");
    closeGoalDialog();
  }

  function closeGoalDialog() {
    if (els.goalDialog?.open) els.goalDialog.close();
  }

  function toggleGoal(gameId, goalId) {
    const game = findGame(gameId);
    const goal = game?.goals.find(item => item.id === goalId);
    if (!game || !goal) return;
    goal.done = !goal.done;
    goal.completedAt = goal.done ? Date.now() : null;
    game.updatedAt = Date.now();
    persist("game-goal-toggle");
    if (goal.done) showToast("Personal goal cleared ✦", `${game.title}: ${goal.text}`);
  }

  function deleteGoal(gameId, goalId) {
    const game = findGame(gameId);
    if (!game) return;
    game.goals = game.goals.filter(goal => goal.id !== goalId);
    game.updatedAt = Date.now();
    persist("game-goal-delete");
  }

  function parseGoalLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(line => line.replace(/^[-*☐✓\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 30)
      .map(text => ({ id: makeId("goal"), text, done: false, createdAt: Date.now(), completedAt: null }));
  }

  function findGame(id) {
    return model().items.find(game => game.id === id) || null;
  }

  function gameLogs(id) {
    return model().logs.filter(log => log.gameId === id);
  }

  function touchedToday(id) {
    return gameLogs(id).some(log => (log.date || dateKeyFromValue(log.at)) === todayKey());
  }

  function exposeApi() {
    window.LifeRPGGames = {
      getItems: () => [...model().items],
      getLogs: id => id ? gameLogs(id) : [...model().logs],
      getGame: findGame,
      touchedToday,
      openCreate: () => openGameDialog(),
      openEdit: openGameDialog,
      openLog: openLogDialog,
      openGoal: openGoalDialog,
      roleMeta: role => ROLES[role] || ROLES.fun,
      statusMeta: status => STATUSES[status] || STATUSES.backlog,
      render
    };
  }

  function showToast(title, detail) {
    if (!els.toast) return;
    if (toastTimer) window.clearTimeout(toastTimer);
    if (els.toastTitle) els.toastTitle.textContent = title;
    if (els.toastDetail) els.toastDetail.textContent = detail;
    els.toast.classList.remove("hidden");
    requestAnimationFrame(() => els.toast.classList.add("show"));
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
      window.setTimeout(() => els.toast.classList.add("hidden"), 220);
    }, 3200);
  }

  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    if (total < 60) return `${total}m`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function humanAgo(value) {
    const days = daysSince(value);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 35) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    }
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function dateKeyFromValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function daysSince(value) {
    if (!value) return 999;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function byId(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function escAttr(value) { return esc(value); }
})();
