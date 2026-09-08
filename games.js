(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Games could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 4;
  const SHADOW_KEY = "life-rpg-games-shadow-v1";
  const MAX_LOGS = 800;

  const STATUSES = {
    playing: { icon: "▶", label: "Playing" },
    backlog: { icon: "✦", label: "Want to Play" },
    paused: { icon: "◷", label: "Paused" },
    finished: { icon: "✓", label: "Completed" },
    dropped: { icon: "×", label: "Dropped" },
    endless: { icon: "∞", label: "Endless" }
  };

  const ROLES = {
    fun: { icon: "🎮", label: "For Fun", realm: "Hobbies" },
    social: { icon: "♡", label: "Social", realm: "Hobbies" },
    japanese: { icon: "あ", label: "Japanese", realm: "Japanese" },
    challenge: { icon: "✦", label: "Challenge / Goals", realm: "Hobbies" }
  };

  const GAME_TYPES = {
    auto: { label: "Auto from metadata", icon: "✦" },
    "farming-life": { label: "Farming / life sim", icon: "🌱" },
    "story-rpg": { label: "Story RPG", icon: "📖" },
    "story-adventure": { label: "Story / adventure", icon: "🗺" },
    rpg: { label: "RPG", icon: "⚔" },
    simulation: { label: "Simulation", icon: "⚙" },
    strategy: { label: "Strategy", icon: "♟" },
    roguelike: { label: "Roguelike / run-based", icon: "↻" },
    multiplayer: { label: "Multiplayer / competitive", icon: "◎" },
    sandbox: { label: "Sandbox / open-ended", icon: "◇" },
    puzzle: { label: "Puzzle", icon: "◈" },
    action: { label: "Action", icon: "⚡" },
    cozy: { label: "Cozy / open-ended", icon: "☕" },
    other: { label: "Other / unsure", icon: "·" }
  };

  const TRACKING_MODES = {
    auto: { label: "Auto", icon: "✦" },
    minutes: { label: "Real-world minutes", icon: "◷", singular: "minute", plural: "minutes", defaultAmount: 30 },
    days: { label: "In-game days", icon: "☀", singular: "in-game day", plural: "in-game days", defaultAmount: 1 },
    runs: { label: "Runs", icon: "↻", singular: "run", plural: "runs", defaultAmount: 1 },
    matches: { label: "Matches / rounds", icon: "◎", singular: "match", plural: "matches", defaultAmount: 1 },
    chapters: { label: "Chapters / episodes", icon: "▤", singular: "chapter", plural: "chapters", defaultAmount: 1 },
    objectives: { label: "Objectives", icon: "✓", singular: "objective", plural: "objectives", defaultAmount: 1 },
    custom: { label: "Custom unit", icon: "◇", singular: "unit", plural: "units", defaultAmount: 1 }
  };

  const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

  const els = {
    add: byId("addGameButton"),
    secondaryAdd: byId("addGameButtonSecondary"),
    emptyAdd: byId("gameEmptyCreate"),
    board: byId("gameBoard"),
    empty: byId("gameEmpty"),
    search: byId("gameSearch"),
    status: byId("gameStatusFilter"),
    sort: byId("gameSort"),
    viewToggle: byId("gameViewToggle"),
    mobileAdd: byId("gameMobileAdd"),
    mobileBulk: byId("gameMobileBulk"),
    bulk: byId("bulkAddGamesButton"),
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
    saveAnother: byId("saveGameAnotherButton"),
    title: byId("gameTitle"),
    catalogSearch: byId("gameCatalogSearch"),
    catalogStatus: byId("gameCatalogStatus"),
    catalogResults: byId("gameCatalogResults"),
    catalogSelected: byId("gameCatalogSelected"),
    platform: byId("gamePlatform"),
    statusField: byId("gameStatus"),
    role: byId("gameRole"),
    trackingMode: byId("gameTrackingMode"),
    sessionAmount: byId("gameSessionAmount"),
    sessionAmountWrap: byId("gameSessionAmountWrap"),
    sessionAmountHint: byId("gameSessionAmountHint"),
    customUnit: byId("gameCustomUnit"),
    customUnitWrap: byId("gameCustomUnitWrap"),
    trackingHint: byId("gameTrackingHint"),
    minutesWrap: byId("gameSessionMinutesWrap"),
    minutes: byId("gameSessionMinutes"),
    progressMode: byId("gameProgressMode"),
    progressWrap: byId("gameProgressWrap"),
    progress: byId("gameProgress"),
    gameType: byId("gameType"),
    steamAppIdInput: byId("gameSteamAppId"),
    genreChips: byId("gameGenreChips"),
    suggestedGoals: byId("gameSuggestedGoals"),
    suggestedGoalList: byId("gameSuggestedGoalList"),
    refreshSuggestions: byId("gameRefreshSuggestions"),
    steamGoals: byId("gameSteamGoals"),
    steamAppIdBadge: byId("gameSteamAppIdBadge"),
    steamStatus: byId("gameSteamStatus"),
    steamLoad: byId("gameSteamLoad"),
    steamSelectRecommended: byId("gameSteamSelectRecommended"),
    steamClearSelection: byId("gameSteamClearSelection"),
    steamIncludeHidden: byId("gameSteamIncludeHidden"),
    steamHiddenLabel: byId("gameSteamHiddenLabel"),
    steamAchievementList: byId("gameSteamAchievementList"),
    steamAddSelected: byId("gameSteamAddSelected"),
    goalsSeed: byId("gameGoalsSeed"),
    notes: byId("gameNotes"),
    preview: byId("gamePreview"),
    rewardHint: byId("gameRewardHint"),

    bulkDialog: byId("gameBulkDialog"),
    bulkForm: byId("gameBulkForm"),
    bulkClose: byId("gameBulkClose"),
    bulkCancel: byId("gameBulkCancel"),
    bulkText: byId("gameBulkText"),
    bulkStatus: byId("gameBulkStatus"),
    bulkRole: byId("gameBulkRole"),
    bulkMinutes: byId("gameBulkMinutes"),
    bulkPreview: byId("gameBulkPreview"),

    logDialog: byId("gameLogDialog"),
    logForm: byId("gameLogForm"),
    logId: byId("gameLogId"),
    logTitle: byId("gameLogTitle"),
    logPicker: byId("gameLogPicker"),
    logChainStatus: byId("gameLogChainStatus"),
    logClose: byId("gameLogClose"),
    logCancel: byId("gameLogCancel"),
    logAmountWrap: byId("gameLogAmountWrap"),
    logAmount: byId("gameLogAmount"),
    logUnitSuffix: byId("gameLogUnitSuffix"),
    logMinutesWrap: byId("gameLogMinutesWrap"),
    logMinutesOptional: byId("gameLogMinutesOptional"),
    logMinutes: byId("gameLogMinutes"),
    logNudges: byId("gameLogNudges"),
    logTrackingHint: byId("gameLogTrackingHint"),
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

    steamWorkerUrl: byId("steamWorkerUrl"),
    steamId64: byId("steamId64"),
    steamConnectionTest: byId("steamConnectionTest"),
    steamConnectionStatus: byId("steamConnectionStatus"),

    toast: byId("gameToast"),
    toastTitle: byId("gameToastTitle"),
    toastDetail: byId("gameToastDetail")
  };

  let selectedRole = "all";
  let selectedSort = safeStorageGet("life-rpg-games-sort-v291") || "smart";
  let viewMode = safeStorageGet("life-rpg-games-view-v291") || "grid";
  let initialized = false;
  let toastTimer = null;
  let activeLogContext = {};
  let selectedCatalog = null;
  let catalogMatches = [];
  let pendingGoalSuggestions = [];
  let pendingSteamAchievements = [];
  let catalogSearchToken = 0;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    renderSteamSettings();
    initialized = true;
    if (changed) persist("games-init", { render: false });
    render();
    exposeApi();
  }

  function bindEvents() {
    [els.add, els.secondaryAdd, els.emptyAdd, els.mobileAdd].forEach(button => button?.addEventListener("click", () => openGameDialog()));
    [els.bulk, els.mobileBulk].forEach(button => button?.addEventListener("click", openBulkDialog));
    els.close?.addEventListener("click", closeGameDialog);
    els.cancel?.addEventListener("click", closeGameDialog);
    els.form?.addEventListener("submit", saveGame);
    els.deleteButton?.addEventListener("click", deleteCurrentGame);
    els.progressMode?.addEventListener("change", renderGameFormState);
    els.trackingMode?.addEventListener("change", () => {
      const mode = els.trackingMode.value || "auto";
      const previewGame = formTrackingGame();
      const resolved = mode === "auto" ? suggestedTrackingMode(previewGame) : mode;
      if (els.sessionAmount) els.sessionAmount.value = String(resolved === "minutes" ? Math.max(5, Number(els.minutes?.value || 45)) : 1);
      renderTrackingFormState();
      renderGamePreview();
    });
    els.customUnit?.addEventListener("input", () => { renderTrackingFormState(); renderGamePreview(); });
    els.sessionAmount?.addEventListener("input", renderGamePreview);
    els.steamAppIdInput?.addEventListener("input", () => { pendingSteamAchievements = []; renderSteamSection(); });
    [els.title, els.platform, els.statusField, els.role, els.minutes, els.progress].forEach(input => input?.addEventListener("input", renderGamePreview));
    els.catalogSearch?.addEventListener("click", searchGameCatalog);
    els.gameType?.addEventListener("change", () => {
      refreshGoalSuggestions({ preserveSelection: false, autoSelect: !String(els.editId?.value || "") });
      syncAutoTrackingAmount();
      renderTrackingFormState();
      renderGamePreview();
    });
    els.refreshSuggestions?.addEventListener("click", () => refreshGoalSuggestions({ preserveSelection: true, autoSelect: false }));
    els.steamLoad?.addEventListener("click", loadSteamAchievements);
    els.steamSelectRecommended?.addEventListener("click", () => { pendingSteamAchievements.forEach(item => { if (!item.achieved && !item.hidden && item.group === "recommended") item.selected = true; }); renderSteamAchievements(); });
    els.steamClearSelection?.addEventListener("click", () => { pendingSteamAchievements.forEach(item => item.selected = false); renderSteamAchievements(); });
    els.steamIncludeHidden?.addEventListener("change", renderSteamAchievements);
    els.steamAddSelected?.addEventListener("click", importSelectedSteamAchievements);
    els.steamWorkerUrl?.addEventListener("change", saveSteamSettings);
    els.steamId64?.addEventListener("change", saveSteamSettings);
    els.steamConnectionTest?.addEventListener("click", testSteamConnection);

    els.search?.addEventListener("input", renderBoard);
    els.status?.addEventListener("change", renderBoard);
    els.sort?.addEventListener("change", () => { selectedSort = els.sort.value || "smart"; safeStorageSet("life-rpg-games-sort-v291", selectedSort); renderBoard(); });
    els.viewToggle?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-game-view]");
      if (!button) return;
      viewMode = button.dataset.gameView === "list" ? "list" : "grid";
      safeStorageSet("life-rpg-games-view-v291", viewMode);
      syncViewControls();
      renderBoard();
    });
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
        openLogDialog(quick.dataset.gameQuickLog, 0, {
          preserveBacklog: quick.dataset.gamePreserveBacklog === "true",
          suggestedAmount: Number(quick.dataset.gameAmount || 0)
        });
        return;
      }

      const catalogChoice = event.target.closest?.("[data-game-catalog-choice]");
      if (catalogChoice) {
        chooseCatalogMatch(catalogChoice.dataset.gameCatalogChoice);
        return;
      }

      const catalogChange = event.target.closest?.("[data-game-catalog-change]");
      if (catalogChange) {
        selectedCatalog = null;
        pendingSteamAchievements = [];
        if (els.steamAppIdInput) els.steamAppIdInput.value = "";
        renderCatalogSelected();
        renderCatalogResults();
        renderSteamSection();
        renderTrackingFormState();
        setCatalogStatus("Choose another match or search again.");
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

    els.bulkClose?.addEventListener("click", closeBulkDialog);
    els.bulkCancel?.addEventListener("click", closeBulkDialog);
    els.bulkForm?.addEventListener("submit", saveBulkGames);
    [els.bulkText, els.bulkStatus, els.bulkRole, els.bulkMinutes].forEach(input => {
      input?.addEventListener("input", renderBulkPreview);
      input?.addEventListener("change", renderBulkPreview);
    });

    els.logClose?.addEventListener("click", closeLogDialog);
    els.logCancel?.addEventListener("click", closeLogDialog);
    els.logForm?.addEventListener("submit", logSession);
    els.logPicker?.addEventListener("change", () => {
      const game = findGame(els.logPicker.value);
      if (game) configureLogForm(game);
    });
    els.logAmount?.addEventListener("input", renderLogPreview);
    els.logMinutes?.addEventListener("input", renderLogPreview);
    els.logProgress?.addEventListener("input", renderLogPreview);
    els.logGoal?.addEventListener("change", renderLogPreview);
    document.querySelectorAll("[data-game-log-nudge]").forEach(button => button.addEventListener("click", () => {
      const value = Number(button.dataset.gameLogNudge || 0);
      if (els.logMinutes) els.logMinutes.value = String(value);
      const game = findGame(els.logId?.value || "");
      if (game && trackingMeta(game).mode === "minutes" && els.logAmount) els.logAmount.value = String(value);
      renderLogPreview();
    }));

    els.goalClose?.addEventListener("click", closeGoalDialog);
    els.goalCancel?.addEventListener("click", closeGoalDialog);
    els.goalForm?.addEventListener("submit", addGoalFromDialog);

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      renderSteamSettings();
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
      if (!GAME_TYPES[game.gameType]) { game.gameType = "auto"; changed = true; }
      if (!Array.isArray(game.genres)) { game.genres = []; changed = true; }
      if (!Array.isArray(game.platforms)) { game.platforms = game.platform ? [game.platform] : []; changed = true; }
      if (typeof game.description !== "string") { game.description = ""; changed = true; }
      if (typeof game.developer !== "string") { game.developer = ""; changed = true; }
      if (typeof game.publisher !== "string") { game.publisher = ""; changed = true; }
      if (typeof game.releaseDate !== "string") { game.releaseDate = ""; changed = true; }
      if (typeof game.coverUrl !== "string") { game.coverUrl = ""; changed = true; }
      if (typeof game.catalogProvider !== "string") { game.catalogProvider = ""; changed = true; }
      if (typeof game.catalogId !== "string") { game.catalogId = ""; changed = true; }
      if (typeof game.steamAppId !== "string") { game.steamAppId = ""; changed = true; }
      if (!TRACKING_MODES[game.trackingMode]) { game.trackingMode = "auto"; changed = true; }
      if (typeof game.customUnit !== "string") { game.customUnit = ""; changed = true; }
      if (!Number.isFinite(Number(game.sessionAmount)) || Number(game.sessionAmount) <= 0) {
        game.sessionAmount = defaultSessionAmount(game);
        changed = true;
      }
      if (!Number.isFinite(Number(game.totalUnits))) {
        game.totalUnits = model.logs.filter(log => log.gameId === game.id).reduce((sum, log) => sum + Number(log.amount || (log.trackingMode === "minutes" || !log.trackingMode ? log.minutes : 0) || 0), 0);
        changed = true;
      }
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

    model.logs.forEach(log => {
      const game = model.items.find(item => item.id === log.gameId);
      if (!log.trackingMode || !TRACKING_MODES[log.trackingMode]) { log.trackingMode = effectiveTrackingMode(game || {}); changed = true; }
      if (!Number.isFinite(Number(log.amount)) || Number(log.amount) <= 0) {
        log.amount = log.trackingMode === "minutes" ? Math.max(1, Number(log.minutes || 0)) : 1;
        changed = true;
      }
      if (typeof log.unitLabel !== "string") { log.unitLabel = trackingMeta(game || {}, log.trackingMode).plural; changed = true; }
      if (!Number.isFinite(Number(log.minutes)) || Number(log.minutes) < 0) { log.minutes = 0; changed = true; }
    });

    const stateRoot = app.getState();
    stateRoot.integrations ||= {};
    stateRoot.integrations.steam ||= { workerUrl: "", steamId: "" };
    if (typeof stateRoot.integrations.steam.workerUrl !== "string") { stateRoot.integrations.steam.workerUrl = ""; changed = true; }
    if (typeof stateRoot.integrations.steam.steamId !== "string") { stateRoot.integrations.steam.steamId = ""; changed = true; }

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

  function suggestedTrackingMode(game = {}) {
    const type = resolvedGameType(game || {});
    if (type === "farming-life") return "days";
    if (type === "roguelike") return "runs";
    if (type === "multiplayer") return "matches";
    if (["story-rpg", "story-adventure"].includes(type)) return "chapters";
    return "minutes";
  }

  function effectiveTrackingMode(game = {}) {
    const configured = TRACKING_MODES[game?.trackingMode] ? game.trackingMode : "auto";
    return configured === "auto" ? suggestedTrackingMode(game) : configured;
  }

  function trackingMeta(game = {}, forcedMode = "") {
    const mode = TRACKING_MODES[forcedMode] ? forcedMode : effectiveTrackingMode(game);
    const base = TRACKING_MODES[mode] || TRACKING_MODES.minutes;
    if (mode !== "custom") return { ...base, mode };
    const raw = String(game?.customUnit || "unit").trim().replace(/\s+/g, " ").slice(0, 30) || "unit";
    const singular = raw.replace(/s$/i, "") || raw;
    const plural = /s$/i.test(raw) ? raw : `${raw}s`;
    return { ...base, mode, singular, plural, label: raw };
  }

  function defaultSessionAmount(game = {}) {
    const meta = trackingMeta(game);
    if (meta.mode === "minutes") return Math.max(5, Number(game?.sessionMinutes || 45));
    return Number(meta.defaultAmount || 1);
  }

  function configuredSessionAmount(game = {}) {
    const amount = Number(game?.sessionAmount || 0);
    return amount > 0 ? amount : defaultSessionAmount(game);
  }

  function amountLabel(game, amount, forcedMode = "") {
    const meta = trackingMeta(game, forcedMode);
    const value = Math.max(0, Number(amount || 0));
    if (meta.mode === "minutes") return formatDuration(value);
    const label = Math.abs(value - 1) < 1e-9 ? meta.singular : meta.plural;
    return `${formatNumber(value)} ${label}`;
  }

  function estimateMinutesForAmount(game, amount) {
    const meta = trackingMeta(game);
    if (meta.mode === "minutes") return Math.max(1, Number(amount || configuredSessionAmount(game) || game?.sessionMinutes || 30));
    const baseAmount = Math.max(0.25, configuredSessionAmount(game));
    const baseMinutes = Math.max(5, Number(game?.sessionMinutes || 30));
    return Math.max(5, Math.round(baseMinutes * (Math.max(0.25, Number(amount || baseAmount)) / baseAmount)));
  }

  function playButtonLabel(game, amount = 0) {
    const value = amount > 0 ? amount : configuredSessionAmount(game);
    const meta = trackingMeta(game);
    if (meta.mode === "minutes") return `▶ Play ${formatDuration(value)}`;
    if (meta.mode === "days") return `▶ Play ${formatNumber(value)} in-game day${Number(value) === 1 ? "" : "s"}`;
    if (meta.mode === "runs") return `▶ Do ${formatNumber(value)} run${Number(value) === 1 ? "" : "s"}`;
    if (meta.mode === "matches") return `▶ Play ${formatNumber(value)} match${Number(value) === 1 ? "" : "es"}`;
    if (meta.mode === "chapters") return `▶ Play ${formatNumber(value)} chapter${Number(value) === 1 ? "" : "s"}`;
    if (meta.mode === "objectives") return `▶ Work on ${formatNumber(value)} objective${Number(value) === 1 ? "" : "s"}`;
    return `▶ Log ${amountLabel(game, value)}`;
  }

  function steamSettings() {
    const state = app.getState();
    state.integrations ||= {};
    state.integrations.steam ||= { workerUrl: "", steamId: "" };
    return state.integrations.steam;
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
    if (els.sort && els.sort.value !== selectedSort) els.sort.value = selectedSort;
    syncViewControls();
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
        const haystack = [game.title, game.platform, game.notes, game.description, game.developer, game.publisher, ...(game.genres || []), ...game.goals.map(goal => goal.text)].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    }).sort(sortGames);

    els.board.classList.toggle("collection-list-mode-v291", viewMode === "list");
    els.board.classList.toggle("collection-grid-mode-v291", viewMode !== "list");
    els.board.innerHTML = games.map(gameCardMarkup).join("");
    els.empty.classList.toggle("hidden", games.length > 0);
  }

  function sortGames(a, b) {
    if (selectedSort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    if (selectedSort === "updated") return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    if (selectedSort === "played") return Number(b.lastPlayedAt || 0) - Number(a.lastPlayedAt || 0) || String(a.title || "").localeCompare(String(b.title || ""));
    if (selectedSort === "progress") return Number(b.progress || 0) - Number(a.progress || 0) || String(a.title || "").localeCompare(String(b.title || ""));
    const statusOrder = { playing: 0, endless: 1, paused: 2, backlog: 3, finished: 4, dropped: 5 };
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
    const playtime = game.totalMinutes > 0 ? formatDuration(game.totalMinutes) : "No real-time playtime logged";
    const progress = game.progressMode === "percent" ? clamp(Number(game.progress || 0), 0, 100) : null;
    const active = ["playing", "endless"].includes(game.status);
    const effectiveType = resolvedGameType(game);
    const typeMeta = GAME_TYPES[effectiveType] || GAME_TYPES.other;
    const tracking = trackingMeta(game);
    const sessionAmount = configuredSessionAmount(game);
    const cover = safeGameCoverUrl(game.coverUrl);
    const genreChips = (game.genres || []).slice(0, 3).map(label => `<span class="game-genre-chip-v305">${esc(label)}</span>`).join("");
    const steamGoals = game.goals.filter(goal => goal.source === "steam");
    const trackingSummary = tracking.mode === "minutes"
      ? `${playButtonLabel(game, sessionAmount).replace(/^▶\s*/, "")}`
      : `${formatNumber(sessionAmount)} ${Number(sessionAmount) === 1 ? tracking.singular : tracking.plural} per Daily Pick`;

    return `
      <article class="game-card-v17 ${active ? "active" : ""} ${cover ? "has-cover-v305" : ""}">
        ${cover ? `<div class="game-card-cover-v305"><img src="${escAttr(cover)}" alt="" loading="lazy" /></div>` : `<div class="game-card-accent-v17"><span>${esc(role.icon)}</span></div>`}
        <div class="game-card-body-v17">
          <div class="game-card-top-v17">
            <div class="game-card-heading-v17">
              <div class="game-chip-row-v17">
                <span class="game-status-chip-v17">${status.icon} ${esc(status.label)}</span>
                <span class="game-role-chip-v17">${role.icon} ${esc(role.label)}</span>
                <span class="game-type-chip-v305">${typeMeta.icon} ${esc(typeMeta.label)}</span>
                <span class="game-tracking-chip-v312">${tracking.icon} ${esc(tracking.label)}</span>
                ${game.steamAppId ? `<span class="game-steam-chip-v312">Steam · ${esc(game.steamAppId)}</span>` : ""}
                ${game.platform ? `<span class="game-platform-chip-v17">${esc(game.platform)}</span>` : ""}
              </div>
              <h3>${esc(game.title)}</h3>
              ${genreChips ? `<div class="game-genre-chips-v305">${genreChips}</div>` : ""}
            </div>
            <button class="icon-button game-edit-button-v17" data-game-edit="${escAttr(game.id)}" type="button" aria-label="Edit ${escAttr(game.title)}">✎</button>
          </div>

          <div class="game-meta-row-v17">
            <span>◷ ${esc(lastPlayed)}</span>
            <span>⌁ ${esc(playtime)}</span>
            <span>✦ ${formatNumber(game.sessions || 0)} session${Number(game.sessions || 0) === 1 ? "" : "s"}</span>
            <span>${tracking.icon} ${esc(trackingSummary)}</span>
          </div>

          ${progress === null ? "" : `
            <div class="game-progress-v17">
              <div><small>PROGRESS</small><strong>${progress}%</strong></div>
              <div class="progress"><span style="width:${progress}%"></span></div>
            </div>`}

          <div class="game-goals-v17">
            <div class="game-goals-heading-v17">
              <div><small>GAME GOALS</small><strong>${openGoals.length ? `${openGoals.length} still open` : game.goals.length ? "All current goals cleared" : "No goals needed"}${steamGoals.length ? ` · ${steamGoals.length} from Steam` : ""}</strong></div>
              <button class="text-button" data-game-add-goal="${escAttr(game.id)}" type="button">＋ Add goal</button>
            </div>
            ${game.goals.length ? `<div class="game-goal-list-v17">${game.goals.slice(0, 6).map(goal => goalMarkup(game, goal)).join("")}${game.goals.length > 6 ? `<small class="game-more-goals-v17">+ ${game.goals.length - 6} more in Edit</small>` : ""}</div>` : `<p class="game-no-goals-v17">${game.steamAppId ? "Steam is detected. Open Edit → Steam Goals to import the game's real achievements." : game.catalogId ? "Life RPG knows what kind of game this is. Open Edit to add a few useful objectives when you want them." : "Optional. Add metadata or your own goals whenever something actually matters."}</p>`}
            ${doneGoals.length && openGoals.length ? `<small class="game-goal-cleared-v17">${doneGoals.length} goal${doneGoals.length === 1 ? "" : "s"} already cleared ✓</small>` : ""}
          </div>

          <div class="game-card-actions-v17">
            ${active ? `<button class="primary-button" data-game-quick-log="${escAttr(game.id)}" data-game-amount="${Number(sessionAmount)}" type="button">${esc(playButtonLabel(game, sessionAmount))}</button>` : ""}
            ${game.status === "backlog" ? `<button class="primary-button" data-game-quick-log="${escAttr(game.id)}" data-game-amount="${Number(sessionAmount)}" data-game-preserve-backlog="true" type="button">${esc(playButtonLabel(game, sessionAmount).replace(/^▶ /, "▶ Try · "))}</button>` : ""}
            <button class="secondary-button" data-game-log="${escAttr(game.id)}" type="button">Log session</button>
            <button class="text-button" data-game-edit="${escAttr(game.id)}" type="button">Edit details</button>
          </div>
        </div>
      </article>`;
  }

  function goalMarkup(game, goal) {
    const source = goal.source === "steam" ? `<small class="game-goal-source-v312">Steam${goal.globalPercent != null ? ` · ${formatNumber(goal.globalPercent)}%` : ""}</small>` : "";
    const detail = goal.source === "steam" && goal.description ? `<small class="game-goal-detail-v312">${esc(goal.description)}</small>` : "";
    return `
      <div class="game-goal-row-v17 ${goal.done ? "done" : ""}">
        <button class="game-goal-check-v17" data-game-id="${escAttr(game.id)}" data-game-goal-toggle="${escAttr(goal.id)}" type="button" aria-label="${goal.done ? "Reopen" : "Complete"} ${escAttr(goal.text)}">${goal.done ? "✓" : ""}</button>
        <span><b>${esc(goal.text)}</b>${source}${detail}</span>
        <button class="game-goal-delete-v17" data-game-id="${escAttr(game.id)}" data-game-goal-delete="${escAttr(goal.id)}" type="button" aria-label="Remove goal">×</button>
      </div>`;
  }

  function openGameDialog(id = "") {
    if (!els.dialog || !els.form) return;
    const game = id ? findGame(id) : null;
    els.form.reset();
    selectedCatalog = game ? catalogFromGame(game) : null;
    catalogMatches = [];
    pendingGoalSuggestions = [];
    pendingSteamAchievements = [];
    if (els.editId) els.editId.value = game?.id || "";
    if (els.dialogTitle) els.dialogTitle.textContent = game ? "Edit game" : "Add a game";
    if (els.title) els.title.value = game?.title || "";
    if (els.platform) els.platform.value = game?.platform || "";
    if (els.statusField) els.statusField.value = game?.status || "playing";
    if (els.role) els.role.value = game?.role || "fun";
    if (els.trackingMode) els.trackingMode.value = TRACKING_MODES[game?.trackingMode] ? game.trackingMode : "auto";
    if (els.customUnit) els.customUnit.value = game?.customUnit || "";
    if (els.minutes) els.minutes.value = String(game?.sessionMinutes || 45);
    if (els.sessionAmount) els.sessionAmount.value = String(game ? configuredSessionAmount(game) : 1);
    if (els.progressMode) els.progressMode.value = game?.progressMode || "none";
    if (els.progress) els.progress.value = String(game?.progress || 0);
    if (els.gameType) els.gameType.value = GAME_TYPES[game?.gameType] ? game.gameType : "auto";
    if (els.steamAppIdInput) els.steamAppIdInput.value = game?.steamAppId || "";
    if (els.goalsSeed) els.goalsSeed.value = "";
    if (els.notes) els.notes.value = game?.notes || "";
    els.deleteButton?.classList.toggle("hidden", !game);
    els.saveAnother?.classList.toggle("hidden", Boolean(game));
    setCatalogStatus(game?.catalogId ? "Catalog details already attached. Search again only if you want to replace them." : "Search is optional. Life RPG uses the public Wikidata catalog so no API key is required.");
    renderCatalogSelected();
    renderCatalogResults();
    renderGenreChips();
    refreshGoalSuggestions({ preserveSelection: false, autoSelect: !game });
    renderTrackingFormState();
    renderSteamSection();
    renderGameFormState();
    renderGamePreview();
    els.dialog.showModal();
  }

  function renderGameFormState() {
    els.progressWrap?.classList.toggle("hidden", (els.progressMode?.value || "none") !== "percent");
    renderTrackingFormState();
    renderGamePreview();
  }

  function formTrackingGame() {
    return {
      gameType: els.gameType?.value || "auto",
      genres: selectedCatalog?.genres || findGame(els.editId?.value)?.genres || [],
      description: selectedCatalog?.description || findGame(els.editId?.value)?.description || "",
      trackingMode: els.trackingMode?.value || "auto",
      customUnit: String(els.customUnit?.value || "").trim(),
      sessionMinutes: Math.max(5, Number(els.minutes?.value || 45)),
      sessionAmount: Math.max(0.25, Number(els.sessionAmount?.value || 1))
    };
  }

  function syncAutoTrackingAmount() {
    if ((els.trackingMode?.value || "auto") !== "auto" || !els.sessionAmount) return;
    const mode = suggestedTrackingMode(formTrackingGame());
    els.sessionAmount.value = String(mode === "minutes" ? Math.max(5, Number(els.minutes?.value || 45)) : 1);
  }

  function renderTrackingFormState() {
    const game = formTrackingGame();
    const meta = trackingMeta(game);
    const configured = els.trackingMode?.value || "auto";
    els.customUnitWrap?.classList.toggle("hidden", configured !== "custom");
    els.minutesWrap?.classList.toggle("hidden", meta.mode === "minutes");
    if (els.sessionAmountWrap) els.sessionAmountWrap.firstChild.textContent = meta.mode === "minutes" ? "Default Daily Pick " : "Default Daily Pick ";
    if (els.sessionAmountHint) els.sessionAmountHint.textContent = meta.mode === "minutes"
      ? "Minutes Life RPG normally suggests at once."
      : `How many ${meta.plural} Life RPG normally suggests at once.`;
    if (els.trackingHint) {
      const autoText = configured === "auto" ? `Auto currently resolves to ${meta.label.toLowerCase()}. ` : "";
      els.trackingHint.textContent = `${autoText}The real-world time is only a planning estimate; completion is tracked in ${meta.plural}.`;
    }
    if (configured === "auto" && els.sessionAmount && !findGame(els.editId?.value)) {
      els.sessionAmount.value = String(meta.mode === "minutes" ? Math.max(5, Number(els.minutes?.value || 45)) : (meta.defaultAmount || 1));
    }
  }

  function renderGamePreview() {
    if (!els.preview) return;
    const title = String(els.title?.value || "Untitled game").trim() || "Untitled game";
    const status = STATUSES[els.statusField?.value] || STATUSES.playing;
    const role = ROLES[els.role?.value] || ROLES.fun;
    const minutes = Math.max(5, Number(els.minutes?.value || 45));
    const progress = els.progressMode?.value === "percent" ? clamp(Number(els.progress?.value || 0), 0, 100) : null;
    const typeKey = resolvedGameType({ gameType: els.gameType?.value || "auto", genres: selectedCatalog?.genres || [], description: selectedCatalog?.description || "" });
    const typeMeta = GAME_TYPES[typeKey] || GAME_TYPES.other;
    const trackingGame = formTrackingGame();
    const tracking = trackingMeta(trackingGame);
    const amount = Math.max(0.25, Number(els.sessionAmount?.value || defaultSessionAmount(trackingGame)));
    const cover = safeGameCoverUrl(selectedCatalog?.coverUrl || findGame(els.editId?.value)?.coverUrl || "");
    const trackingText = tracking.mode === "minutes" ? `${amountLabel(trackingGame, amount)} default play` : `${amountLabel(trackingGame, amount)} per Daily Pick · ~${formatDuration(minutes)} estimate`;
    els.preview.innerHTML = `${cover ? `<img class="game-preview-cover-v305" src="${escAttr(cover)}" alt="" />` : `<span>${role.icon}</span>`}<div><small>${status.icon} ${esc(status.label)} · ${role.label}</small><strong>${esc(title)}</strong><p>${esc(`${typeMeta.label} · ${trackingText}${progress === null ? "" : ` · ${progress}% complete`}`)}</p></div>`;
  }

  function saveGame(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;
    const id = els.editId?.value || "";
    const existing = id ? findGame(id) : null;
    const now = Date.now();
    const manualGoals = parseGoalLines(els.goalsSeed?.value || "");
    const selectedSuggestions = pendingGoalSuggestions
      .filter(item => item.selected)
      .map(item => ({ id: makeId("goal"), text: item.text, done: false, createdAt: now, completedAt: null, source: "smart", smartKey: item.key || "" }));
    const selectedSteamGoals = pendingSteamAchievements
      .filter(item => item.queued && !item.alreadyImported)
      .map(item => ({
        id: makeId("goal"),
        text: item.name,
        description: item.hidden ? "" : item.description,
        done: Boolean(item.achieved),
        createdAt: now,
        completedAt: item.achieved && item.unlockTime ? item.unlockTime * 1000 : (item.achieved ? now : null),
        source: "steam",
        steamApiName: item.apiName,
        globalPercent: item.globalPercent,
        steamGroup: item.group,
        importedAlreadyUnlocked: Boolean(item.achieved),
        rewardEventId: item.achieved ? `steam-imported-legacy:${item.apiName}` : null
      }));
    const status = els.statusField?.value || "playing";
    const metadata = selectedCatalog || (existing ? catalogFromGame(existing) : null) || {};
    const priorGoalTexts = new Set((existing?.goals || []).map(goal => normalizeText(goal.text)));
    const priorSteamNames = new Set((existing?.goals || []).map(goal => goal.steamApiName).filter(Boolean));
    const newGoals = [...manualGoals, ...selectedSuggestions, ...selectedSteamGoals].filter(goal => {
      if (goal.steamApiName && priorSteamNames.has(goal.steamApiName)) return false;
      const key = normalizeText(goal.text);
      if (!key || priorGoalTexts.has(key)) return false;
      priorGoalTexts.add(key);
      if (goal.steamApiName) priorSteamNames.add(goal.steamApiName);
      return true;
    });
    const game = {
      ...(existing || {}),
      id: existing?.id || makeId("game"),
      title: String(els.title?.value || "").trim(),
      platform: String(els.platform?.value || "").trim(),
      status,
      role: els.role?.value || "fun",
      trackingMode: TRACKING_MODES[els.trackingMode?.value] ? els.trackingMode.value : "auto",
      customUnit: String(els.customUnit?.value || "").trim().slice(0, 30),
      sessionAmount: Math.max(0.25, Number(els.sessionAmount?.value || 1)),
      sessionMinutes: trackingMeta(formTrackingGame()).mode === "minutes"
        ? Math.max(5, Number(els.sessionAmount?.value || 45))
        : Math.max(5, Number(els.minutes?.value || 45)),
      progressMode: els.progressMode?.value || "none",
      progress: els.progressMode?.value === "percent" ? clamp(Number(els.progress?.value || 0), 0, 100) : 0,
      gameType: GAME_TYPES[els.gameType?.value] ? els.gameType.value : "auto",
      genres: Array.isArray(metadata.genres) ? metadata.genres.slice(0, 12) : (existing?.genres || []),
      platforms: Array.isArray(metadata.platforms) ? metadata.platforms.slice(0, 12) : (existing?.platforms || []),
      description: String(metadata.description || existing?.description || ""),
      developer: String(metadata.developer || existing?.developer || ""),
      publisher: String(metadata.publisher || existing?.publisher || ""),
      releaseDate: String(metadata.releaseDate || existing?.releaseDate || ""),
      coverUrl: safeGameCoverUrl(metadata.coverUrl || existing?.coverUrl || ""),
      catalogProvider: String(metadata.provider || existing?.catalogProvider || ""),
      catalogId: String(metadata.id || existing?.catalogId || ""),
      steamAppId: String(els.steamAppIdInput?.value || metadata.steamAppId || existing?.steamAppId || "").replace(/\D/g, "").slice(0, 12),
      catalogUpdatedAt: metadata.id ? now : (existing?.catalogUpdatedAt || null),
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
    const stewardshipReward = existing ? null : window.LifeRPGStewardship?.rewardCreation?.({
      type: "game",
      id: game.id,
      label: game.title,
      fields: [game.title, game.platform]
    });
    const addAnother = !existing && event.submitter?.dataset.saveAnother === "true";
    persist(existing ? "game-edit" : "game-create");
    if (Number(stewardshipReward?.xp || 0) > 0 || Number(stewardshipReward?.storyEnergy || 0) > 0) app.renderAll?.();
    const upkeepText = window.LifeRPGStewardship?.statusText?.(stewardshipReward) || "";
    const goalText = newGoals.length ? `${newGoals.length} new objective${newGoals.length === 1 ? "" : "s"} added.` : "";
    showToast(existing ? "Game updated" : "Game added", [`${game.title} is ready for the planner.`, goalText, upkeepText].filter(Boolean).join(" · "));
    if (addAnother) {
      resetGameDialogForAnother({ status: game.status === "finished" ? "playing" : status, role: game.role, sessionMinutes: game.sessionMinutes });
    } else {
      closeGameDialog();
    }
  }

  function resetGameDialogForAnother(defaults = {}) {
    els.form?.reset();
    selectedCatalog = null;
    catalogMatches = [];
    pendingGoalSuggestions = [];
    pendingSteamAchievements = [];
    if (els.editId) els.editId.value = "";
    if (els.dialogTitle) els.dialogTitle.textContent = "Add a game";
    els.deleteButton?.classList.add("hidden");
    els.saveAnother?.classList.remove("hidden");
    if (els.statusField) els.statusField.value = defaults.status || "playing";
    if (els.role) els.role.value = defaults.role || "fun";
    if (els.trackingMode) els.trackingMode.value = "auto";
    if (els.customUnit) els.customUnit.value = "";
    if (els.sessionAmount) els.sessionAmount.value = "1";
    if (els.minutes) els.minutes.value = String(defaults.sessionMinutes || 45);
    if (els.progressMode) els.progressMode.value = "none";
    if (els.progress) els.progress.value = "0";
    if (els.gameType) els.gameType.value = "auto";
    if (els.steamAppIdInput) els.steamAppIdInput.value = "";
    setCatalogStatus("Search is optional. Life RPG uses the public Wikidata catalog so no API key is required.");
    renderCatalogSelected();
    renderCatalogResults();
    renderGenreChips();
    refreshGoalSuggestions({ preserveSelection: false, autoSelect: true });
    syncAutoTrackingAmount();
    renderTrackingFormState();
    renderSteamSection();
    renderGameFormState();
    window.setTimeout(() => els.title?.focus(), 20);
  }

  function openBulkDialog() {
    if (!els.bulkDialog || !els.bulkForm) return;
    els.bulkForm.reset();
    if (els.bulkStatus) els.bulkStatus.value = "backlog";
    if (els.bulkRole) els.bulkRole.value = "fun";
    if (els.bulkMinutes) els.bulkMinutes.value = "45";
    renderBulkPreview();
    els.bulkDialog.showModal();
    window.setTimeout(() => els.bulkText?.focus(), 20);
  }

  function closeBulkDialog() {
    if (els.bulkDialog?.open) els.bulkDialog.close();
  }

  function parseBulkGames() {
    const lines = String(els.bulkText?.value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(/\t|\s+—\s+|\s+\|\s+/).map(value => value.trim()).filter(Boolean);
      return { title: parts[0] || "", platform: parts.slice(1).join(" — ") };
    }).filter(item => item.title);
  }

  function renderBulkPreview() {
    if (!els.bulkPreview) return;
    const entries = parseBulkGames();
    const status = STATUSES[els.bulkStatus?.value] || STATUSES.backlog;
    const role = ROLES[els.bulkRole?.value] || ROLES.fun;
    const minutes = Math.max(5, Number(els.bulkMinutes?.value || 45));
    els.bulkPreview.innerHTML = entries.length
      ? `<strong>${entries.length} game${entries.length === 1 ? "" : "s"} ready</strong><span>${status.icon} ${esc(status.label)} · ${role.icon} ${esc(role.label)} · ${minutes}m default session</span><small>Tip: “Title — Platform”, “Title | Platform”, or just one title per line.</small>`
      : `<strong>Paste one game per line.</strong><span>Great for moving an existing backlog into Life RPG without opening the add dialog over and over.</span>`;
  }

  function saveBulkGames(event) {
    event.preventDefault();
    const entries = parseBulkGames();
    if (!entries.length) return;
    const current = model();
    const status = STATUSES[els.bulkStatus?.value] ? els.bulkStatus.value : "backlog";
    const role = ROLES[els.bulkRole?.value] ? els.bulkRole.value : "fun";
    const sessionMinutes = Math.max(5, Number(els.bulkMinutes?.value || 45));
    const existing = new Set(current.items.map(game => duplicateKey(game.title, game.platform)));
    const addedGames = [];
    const now = Date.now();
    let skipped = 0;

    entries.forEach((entry, index) => {
      const key = duplicateKey(entry.title, entry.platform);
      if (existing.has(key)) { skipped += 1; return; }
      existing.add(key);
      const game = {
        id: makeId("game"), title: entry.title, platform: entry.platform, status, role, trackingMode: "auto", customUnit: "", sessionAmount: sessionMinutes, sessionMinutes,
        progressMode: "none", progress: 0, gameType: "auto", genres: [], platforms: entry.platform ? [entry.platform] : [],
        description: "", developer: "", publisher: "", releaseDate: "", coverUrl: "", catalogProvider: "", catalogId: "", steamAppId: "",
        goals: [], notes: "", totalMinutes: 0, sessions: 0,
        createdAt: now + index, updatedAt: now + index, lastPlayedAt: null
      };
      current.items.push(game);
      addedGames.push(game);
    });

    const reward = window.LifeRPGStewardship?.rewardMany?.(addedGames.map(game => ({
      type: "game", id: game.id, label: game.title, fields: [game.title, game.platform]
    })));
    closeBulkDialog();
    persist("games-bulk-add");
    if (Number(reward?.xp || 0) > 0 || Number(reward?.storyEnergy || 0) > 0) app.renderAll?.();
    const upkeepText = window.LifeRPGStewardship?.statusText?.(reward) || "";
    const duplicateText = skipped ? `${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.` : "Added in one pass.";
    showToast(`${addedGames.length} game${addedGames.length === 1 ? "" : "s"} added`, [duplicateText, upkeepText].filter(Boolean).join(" · "));
  }

  function duplicateKey(title, platform) {
    return `${String(title || "").trim().toLowerCase()}|${String(platform || "").trim().toLowerCase()}`;
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
    selectedCatalog = null;
    catalogMatches = [];
    pendingGoalSuggestions = [];
    pendingSteamAchievements = [];
  }

  function openLogDialog(id, suggestedMinutes = 0, options = {}) {
    if (!els.logDialog || !els.logForm) return;
    const game = findGame(id);
    if (!game) return;
    els.logForm.reset();
    activeLogContext = options && typeof options === "object" ? { ...options } : {};
    if (suggestedMinutes > 0 && !activeLogContext.suggestedAmount && trackingMeta(game).mode === "minutes") activeLogContext.suggestedAmount = suggestedMinutes;
    populateLogPicker(game.id);
    configureLogForm(game, Number(activeLogContext.suggestedAmount || 0));
    setChainLogStatus("");
    els.logDialog.showModal();
  }

  function populateLogPicker(selectedId = "") {
    if (!els.logPicker) return;
    const items = [...model().items].sort((a, b) => {
      const rank = value => value === "playing" || value === "endless" ? 0 : value === "paused" ? 1 : value === "backlog" ? 2 : 3;
      return rank(a.status) - rank(b.status) || String(a.title || "").localeCompare(String(b.title || ""));
    });
    els.logPicker.innerHTML = items.map(game => `<option value="${escAttr(game.id)}">${esc(game.title)}${game.platform ? ` — ${esc(game.platform)}` : ""}</option>`).join("");
    if (items.some(game => game.id === selectedId)) els.logPicker.value = selectedId;
  }

  function configureLogForm(game, suggestedAmount = 0) {
    if (!game) return;
    const meta = trackingMeta(game);
    const amount = Math.max(0.25, Number(suggestedAmount || configuredSessionAmount(game)));
    if (els.logId) els.logId.value = game.id;
    if (els.logPicker && els.logPicker.value !== game.id) els.logPicker.value = game.id;
    if (els.logTitle) els.logTitle.textContent = game.title;
    if (els.logAmount) {
      els.logAmount.value = String(amount);
      els.logAmount.min = meta.mode === "minutes" ? "1" : "0.25";
      els.logAmount.step = meta.mode === "minutes" ? "1" : "0.25";
    }
    if (els.logUnitSuffix) els.logUnitSuffix.textContent = meta.mode === "minutes" ? "minutes" : meta.plural;
    if (els.logMinutes) {
      els.logMinutes.value = meta.mode === "minutes" ? String(Math.max(1, Math.round(amount))) : "";
      els.logMinutes.required = meta.mode === "minutes";
    }
    els.logMinutesWrap?.classList.toggle("hidden", false);
    els.logNudges?.classList.toggle("hidden", meta.mode !== "minutes");
    if (els.logMinutesOptional) els.logMinutesOptional.textContent = meta.mode === "minutes" ? "required" : "optional · for Life Rhythm only";
    if (els.logTrackingHint) els.logTrackingHint.textContent = meta.mode === "minutes"
      ? "This game currently completes sessions by real-world time."
      : `This game counts in ${meta.plural}. You can leave real-world minutes empty if you do not want to time it.`;
    const usesProgress = game.progressMode === "percent";
    els.logProgressWrap?.classList.toggle("hidden", !usesProgress);
    if (els.logProgress) els.logProgress.value = usesProgress ? String(clamp(Number(game.progress || 0), 0, 100)) : "";
    renderGoalOptions(game);
    renderLogPreview();
  }

  function setChainLogStatus(message) {
    if (!els.logChainStatus) return;
    els.logChainStatus.textContent = message || "";
    els.logChainStatus.classList.toggle("hidden", !message);
  }

  function renderGoalOptions(game) {
    if (!els.logGoal) return;
    const open = game.goals.filter(goal => !goal.done);
    els.logGoal.innerHTML = `<option value="">No specific goal</option>${open.map(goal => `<option value="${escAttr(goal.id)}">${goal.source === "steam" ? "Steam · " : ""}${esc(goal.text)}</option>`).join("")}`;
    els.logGoal.closest("label")?.classList.toggle("hidden", open.length === 0);
  }

  function renderLogPreview() {
    if (!els.logPreview) return;
    const game = findGame(els.logId?.value || "");
    if (!game) { els.logPreview.innerHTML = ""; return; }
    const meta = trackingMeta(game);
    const amount = Math.max(meta.mode === "minutes" ? 1 : 0.25, Number(els.logAmount?.value || 0));
    if (meta.mode === "minutes" && els.logMinutes && Number(els.logMinutes.value || 0) !== Math.round(amount)) els.logMinutes.value = String(Math.round(amount));
    const minutes = Math.max(0, Number(els.logMinutes?.value || 0));
    const progress = game.progressMode === "percent" ? clamp(Number(els.logProgress?.value || game.progress || 0), 0, 100) : null;
    const goal = game.goals.find(item => item.id === els.logGoal?.value);
    const timeText = minutes > 0 ? ` · ${formatDuration(minutes)} real time` : "";
    els.logPreview.innerHTML = `<span>${meta.icon}</span><div><small>SESSION</small><strong>${esc(amountLabel(game, amount))} with ${esc(game.title)}</strong><p>${goal ? `Working toward: ${esc(goal.text)}` : "Just playing counts as hobby progress; clearing tracked goals or finishing games gives the bigger progression rewards."}${timeText}${progress === null ? "" : ` · Progress after: ${progress}%`}</p></div>`;
  }

  function gameRewardSpec(game, amount, mode, at) {
    const meta = trackingMeta(game, mode);
    const value = Math.max(meta.mode === "minutes" ? 1 : 0.25, Number(amount || 0));
    const weights = { minutes: 0.025, days: 0.9, runs: 1.0, matches: 0.65, chapters: 1.2, objectives: 1.0, custom: 0.8 };
    const sessionWeight = Math.min(3, Math.max(0.25, value * Number(weights[meta.mode] || 0.8)));
    const xp = Math.max(3, Math.round(sessionWeight * 10));
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
      storyEnergyBase: 0,
      dedupeFamily: "gaming",
      at: new Date(at).toISOString(),
      metadata: { amount: value, trackingMode: meta.mode, unit: meta.plural, role: game.role }
    };
  }

  function logSession(event) {
    event.preventDefault();
    if (!els.logForm?.reportValidity()) return;
    const game = findGame(els.logId?.value || "");
    if (!game) return;
    const meta = trackingMeta(game);
    const amount = Math.max(meta.mode === "minutes" ? 1 : 0.25, Number(els.logAmount?.value || 0));
    if (!amount) return;
    const minutes = meta.mode === "minutes" ? Math.max(1, Math.round(amount)) : Math.max(0, Number(els.logMinutes?.value || 0));
    const now = Date.now();
    const goalId = els.logGoal?.value || "";
    const progressAfter = game.progressMode === "percent" ? clamp(Number(els.logProgress?.value || game.progress || 0), 0, 100) : null;
    const wasFinished = game.status === "finished" || Number(game.progress || 0) >= 100;

    const reward = app.awardActivity?.(gameRewardSpec(game, amount, meta.mode, now)) || {
      xp: 0, realmXP: 0, statXP: 0, storyEnergy: 0, rawStoryEnergy: 0
    };
    model().logs.push({
      id: makeId("glog"), gameId: game.id, at: now, date: todayKey(), minutes, amount, trackingMode: meta.mode, unitLabel: meta.plural, goalId: goalId || null, progressAfter,
      xp: Number(reward.xp || 0), realmXP: Number(reward.realmXP || 0), statXP: Number(reward.statXP || 0),
      storyEnergy: Number(reward.storyEnergy || 0), rawStoryEnergy: Number(reward.rawStoryEnergy || 0),
      rewardEventId: reward.eventId || null, deduped: Boolean(reward.deduped)
    });
    game.totalUnits = Number(game.totalUnits || 0) + amount;
    game.totalMinutes = Number(game.totalMinutes || 0) + minutes;
    game.sessions = Number(game.sessions || 0) + 1;
    game.lastPlayedAt = now;
    game.updatedAt = now;
    if (goalId) game.lastGoalId = goalId;
    if (progressAfter !== null) game.progress = progressAfter;
    if (game.status === "paused" || (game.status === "backlog" && !activeLogContext.preserveBacklog)) game.status = "playing";
    if (game.progressMode === "percent" && game.progress >= 100 && game.status !== "endless") game.status = "finished";

    let finishReward = null;
    if (!wasFinished && game.status === "finished" && !game.finishRewardEventId) {
      finishReward = app.awardActivity?.({
        source: "game-finish",
        sourceId: game.id,
        label: `Finished: ${game.title}`,
        realm: (ROLES[game.role] || ROLES.fun).realm,
        capability: game.role === "japanese" ? "japanese" : game.role === "challenge" ? "confidence" : "wellbeing",
        xp: 10,
        realmXP: 10,
        statXP: 6,
        coins: 75,
        storyEnergyBase: 1.5,
        progressionRelevant: true,
        at: new Date(now).toISOString(),
        metadata: { gameFinished: true }
      }) || null;
      game.finishRewardEventId = finishReward?.eventId || `local-finish-${now}`;
      game.finishRewardStoryEnergy = Number(finishReward?.storyEnergy || 0);
    }

    persist("game-session-log");
    app.renderAll?.();
    const addAnother = event.submitter?.dataset.logAnother === "true";
    const rewardText = reward.deduped
      ? " · already counted from a linked gaming quest"
      : ` · +${Number(reward.xp || 0)} XP`;
    const finishText = finishReward ? ` · finished +${app.formatEnergy?.(finishReward.storyEnergy) ?? finishReward.storyEnergy} 🔥 · +${Number(finishReward.coins || 0)} 🪙` : "";
    const trialText = activeLogContext.preserveBacklog && game.status === "backlog" ? " · still in Want to Play" : "";
    const timeText = minutes > 0 && meta.mode !== "minutes" ? ` · ${formatDuration(minutes)} real time` : "";
    showToast("Session logged", `${game.title} · ${amountLabel(game, amount)}${timeText}${goalId ? " · personal goal kept in focus" : ""}${rewardText}${finishText}${trialText}`);
    activeLogContext = {};
    if (addAnother) {
      populateLogPicker(game.id);
      const nextGame = findGame(els.logPicker?.value || game.id) || game;
      configureLogForm(nextGame);
      setChainLogStatus(`✓ ${game.title} saved. Pick another game above or log another session.`);
      window.setTimeout(() => els.logPicker?.focus(), 20);
    } else {
      closeLogDialog();
    }
  }

  function closeLogDialog() {
    if (els.logDialog?.open) els.logDialog.close();
    setChainLogStatus("");
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

    let goalReward = null;
    if (goal.done && !goal.rewardEventId) {
      const role = ROLES[game.role] || ROLES.fun;
      const capability = game.role === "social"
        ? "social"
        : game.role === "japanese"
          ? "japanese"
          : game.role === "challenge"
            ? "confidence"
            : "wellbeing";
      goalReward = app.awardActivity?.({
        source: "game-goal",
        sourceId: `${game.id}:${goal.id}`,
        label: `${game.title}: ${goal.text}`,
        realm: role.realm,
        capability,
        xp: 6,
        realmXP: 6,
        statXP: 4,
        coins: 30,
        storyEnergyBase: 0.8,
        progressionRelevant: true,
        metadata: { gameGoal: true }
      }) || null;
      goal.rewardEventId = goalReward?.eventId || `local-goal-${Date.now()}`;
      goal.rewardStoryEnergy = Number(goalReward?.storyEnergy || 0);
    }

    game.updatedAt = Date.now();
    persist("game-goal-toggle");
    if (goal.done) {
      const rewardText = goalReward ? ` · +${app.formatEnergy?.(goalReward.storyEnergy) ?? goalReward.storyEnergy} 🔥 · +${Number(goalReward.coins || 0)} 🪙` : " · already rewarded";
      showToast("Personal goal cleared ✦", `${game.title}: ${goal.text}${rewardText}`);
    }
  }

  function deleteGoal(gameId, goalId) {
    const game = findGame(gameId);
    if (!game) return;
    game.goals = game.goals.filter(goal => goal.id !== goalId);
    game.updatedAt = Date.now();
    persist("game-goal-delete");
  }

  async function searchGameCatalog() {
    const query = String(els.title?.value || "").trim();
    if (query.length < 2) {
      setCatalogStatus("Type at least two characters of the game title first.", true);
      return;
    }
    const token = ++catalogSearchToken;
    setCatalogStatus("Searching the public game catalog…");
    if (els.catalogSearch) els.catalogSearch.disabled = true;
    catalogMatches = [];
    renderCatalogResults();
    try {
      const params = new URLSearchParams({ action: "wbsearchentities", search: query, language: "en", uselang: "en", type: "item", limit: "12", format: "json", origin: "*" });
      const searchResponse = await fetch(`${WIKIDATA_API}?${params.toString()}`, { headers: { Accept: "application/json" } });
      if (!searchResponse.ok) throw new Error(`Catalog search failed (${searchResponse.status})`);
      const searchData = await searchResponse.json();
      const candidates = Array.isArray(searchData.search) ? searchData.search : [];
      if (token !== catalogSearchToken) return;
      const ids = candidates.map(item => item.id).filter(Boolean).slice(0, 12);
      if (!ids.length) {
        setCatalogStatus("No likely matches found. You can still add the game manually.", true);
        return;
      }
      const entityParams = new URLSearchParams({ action: "wbgetentities", ids: ids.join("|"), props: "claims|labels|descriptions", languages: "en", format: "json", origin: "*" });
      const entityResponse = await fetch(`${WIKIDATA_API}?${entityParams.toString()}`, { headers: { Accept: "application/json" } });
      if (!entityResponse.ok) throw new Error(`Catalog details failed (${entityResponse.status})`);
      const entityData = await entityResponse.json();
      if (token !== catalogSearchToken) return;
      const gameEntities = ids.map(id => entityData.entities?.[id]).filter(entity => isLikelyVideoGameEntity(entity));
      const linkedIds = new Set();
      gameEntities.forEach(entity => ["P136", "P400", "P178", "P123"].forEach(prop => entityClaimEntityIds(entity, prop).forEach(id => linkedIds.add(id))));
      const labels = await fetchWikidataLabels([...linkedIds]);
      if (token !== catalogSearchToken) return;
      catalogMatches = gameEntities.map(entity => catalogEntryFromEntity(entity, labels)).filter(Boolean).slice(0, 8);
      renderCatalogResults();
      setCatalogStatus(catalogMatches.length ? `${catalogMatches.length} likely match${catalogMatches.length === 1 ? "" : "es"}. Pick the right one; the list will collapse after selection.` : "No video-game matches found. You can still add it manually.", !catalogMatches.length);
    } catch (error) {
      console.warn("Life RPG game catalog search failed", error);
      setCatalogStatus("The public catalog could not be reached right now. Manual entry still works; you can try the search again later.", true);
    } finally {
      if (els.catalogSearch) els.catalogSearch.disabled = false;
    }
  }

  async function fetchWikidataLabels(ids) {
    const unique = [...new Set(ids.filter(Boolean))].slice(0, 50);
    if (!unique.length) return {};
    try {
      const params = new URLSearchParams({ action: "wbgetentities", ids: unique.join("|"), props: "labels", languages: "en", format: "json", origin: "*" });
      const response = await fetch(`${WIKIDATA_API}?${params.toString()}`, { headers: { Accept: "application/json" } });
      if (!response.ok) return {};
      const data = await response.json();
      return Object.fromEntries(unique.map(id => [id, data.entities?.[id]?.labels?.en?.value || id]));
    } catch {
      return {};
    }
  }

  function isLikelyVideoGameEntity(entity) {
    if (!entity || entity.missing !== undefined) return false;
    const instances = entityClaimEntityIds(entity, "P31");
    if (instances.includes("Q7889")) return true;
    const description = String(entity.descriptions?.en?.value || "").toLowerCase();
    return /video game|visual novel|game expansion|game mod/.test(description);
  }

  function entityClaimEntityIds(entity, prop) {
    return (entity?.claims?.[prop] || []).map(statement => statement?.mainsnak?.datavalue?.value?.id).filter(Boolean);
  }

  function entityClaimStrings(entity, prop) {
    return (entity?.claims?.[prop] || []).map(statement => statement?.mainsnak?.datavalue?.value).filter(value => typeof value === "string");
  }

  function firstClaimTime(entity, prop) {
    const value = entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
    if (!value) return "";
    const match = String(value).match(/[+-](\d{4})-(\d{2})-(\d{2})/);
    if (!match) return "";
    const [, year, month, day] = match;
    return month === "00" ? year : day === "00" ? `${year}-${month}` : `${year}-${month}-${day}`;
  }

  function firstCommonsImage(entity) {
    const raw = entityClaimStrings(entity, "P18")[0] || "";
    if (!raw) return "";
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(raw)}?width=560`;
  }

  function catalogEntryFromEntity(entity, labels) {
    const id = entity.id;
    const title = entity.labels?.en?.value || id;
    const genres = entityClaimEntityIds(entity, "P136").map(qid => labels[qid] || qid).filter(Boolean);
    const platforms = entityClaimEntityIds(entity, "P400").map(qid => simplifyPlatform(labels[qid] || qid)).filter(Boolean);
    const developers = entityClaimEntityIds(entity, "P178").map(qid => labels[qid] || qid).filter(Boolean);
    const publishers = entityClaimEntityIds(entity, "P123").map(qid => labels[qid] || qid).filter(Boolean);
    const steamAppId = entityClaimStrings(entity, "P1733")[0] || "";
    const coverUrl = steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${encodeURIComponent(steamAppId)}/header.jpg` : firstCommonsImage(entity);
    const description = entity.descriptions?.en?.value || "";
    return {
      provider: "wikidata",
      id,
      title,
      description,
      genres: [...new Set(genres)],
      platforms: [...new Set(platforms)],
      developer: developers.join(", "),
      publisher: publishers.join(", "),
      releaseDate: firstClaimTime(entity, "P577"),
      steamAppId,
      coverUrl,
      detectedGameType: inferGameType({ genres, description })
    };
  }

  function simplifyPlatform(value) {
    const text = String(value || "").trim();
    const lower = text.toLowerCase();
    if (/microsoft windows|windows/.test(lower)) return "PC";
    if (/nintendo switch 2/.test(lower)) return "Switch 2";
    if (/nintendo switch/.test(lower)) return "Switch";
    if (/playstation 5/.test(lower)) return "PS5";
    if (/playstation 4/.test(lower)) return "PS4";
    if (/xbox series/.test(lower)) return "Xbox Series";
    if (/xbox one/.test(lower)) return "Xbox One";
    if (/macos|mac os/.test(lower)) return "Mac";
    if (/linux/.test(lower)) return "Linux";
    return text;
  }

  function chooseCatalogMatch(id) {
    const match = catalogMatches.find(item => item.id === id);
    if (!match) return;
    selectedCatalog = { ...match };
    if (els.title) els.title.value = match.title || els.title.value;
    if (els.platform && !String(els.platform.value || "").trim() && match.platforms?.length) els.platform.value = match.platforms.slice(0, 3).join(", ");
    if (els.gameType && (els.gameType.value || "auto") === "auto") els.gameType.value = "auto";
    if (els.steamAppIdInput && match.steamAppId) els.steamAppIdInput.value = String(match.steamAppId);
    catalogMatches = [];
    renderCatalogResults();
    renderCatalogSelected();
    renderGenreChips();
    refreshGoalSuggestions({ preserveSelection: false, autoSelect: true });
    renderTrackingFormState();
    renderSteamSection();
    renderGamePreview();
    setCatalogStatus(match.steamAppId ? "Game details attached · Steam detected. You can import the real achievements below." : "Game details attached. You can still override the type, platform or goals before saving.");
  }

  function renderCatalogResults() {
    if (!els.catalogResults) return;
    els.catalogResults.classList.toggle("hidden", !catalogMatches.length);
    els.catalogResults.innerHTML = catalogMatches.map(item => {
      const cover = safeGameCoverUrl(item.coverUrl);
      const details = [item.releaseDate ? String(item.releaseDate).slice(0, 4) : "", item.developer, (item.genres || []).slice(0, 2).join(" · ")].filter(Boolean).join(" · ");
      return `<button class="game-catalog-result-v305" type="button" data-game-catalog-choice="${escAttr(item.id)}">${cover ? `<img src="${escAttr(cover)}" alt="" loading="lazy" />` : `<span class="game-catalog-result-mark-v305">🎮</span>`}<span><strong>${esc(item.title)}</strong><small>${esc(details || item.description || "Video game")}</small></span><b>Use</b></button>`;
    }).join("");
  }

  function renderCatalogSelected() {
    if (!els.catalogSelected) return;
    const item = selectedCatalog;
    els.catalogSelected.classList.toggle("hidden", !item);
    if (!item) { els.catalogSelected.innerHTML = ""; return; }
    const cover = safeGameCoverUrl(item.coverUrl);
    const details = [item.releaseDate ? String(item.releaseDate).slice(0, 4) : "", item.developer, item.platforms?.slice(0, 3).join(", ")].filter(Boolean).join(" · ");
    els.catalogSelected.innerHTML = `${cover ? `<img src="${escAttr(cover)}" alt="" />` : `<span class="game-catalog-selected-mark-v305">🎮</span>`}<div><small>CATALOG MATCH</small><strong>${esc(item.title || "Game")}</strong><p>${esc(details || item.description || "Public Wikidata metadata attached.")}</p></div><button class="text-button" type="button" data-game-catalog-change="true">Change match</button>`;
  }

  function setCatalogStatus(message, warn = false) {
    if (!els.catalogStatus) return;
    els.catalogStatus.textContent = message || "";
    els.catalogStatus.classList.toggle("warning-v305", Boolean(warn));
  }

  function catalogFromGame(game) {
    if (!game) return null;
    const hasMetadata = game.catalogId || game.coverUrl || game.genres?.length || game.description;
    if (!hasMetadata) return null;
    return {
      provider: game.catalogProvider || "",
      id: game.catalogId || "",
      title: game.title || "",
      description: game.description || "",
      genres: Array.isArray(game.genres) ? [...game.genres] : [],
      platforms: Array.isArray(game.platforms) ? [...game.platforms] : (game.platform ? [game.platform] : []),
      developer: game.developer || "",
      publisher: game.publisher || "",
      releaseDate: game.releaseDate || "",
      steamAppId: game.steamAppId || "",
      coverUrl: game.coverUrl || "",
      detectedGameType: inferGameType(game)
    };
  }

  function renderGenreChips() {
    if (!els.genreChips) return;
    const genres = selectedCatalog?.genres || findGame(els.editId?.value)?.genres || [];
    els.genreChips.innerHTML = genres.length ? genres.slice(0, 5).map(label => `<span class="game-genre-chip-v305">${esc(label)}</span>`).join("") : `<span class="game-genre-chip-v305 subtle-v305">No catalog genres yet</span>`;
  }

  function resolvedGameType(game) {
    const explicit = String(game?.gameType || "auto");
    if (explicit !== "auto" && GAME_TYPES[explicit]) return explicit;
    return inferGameType(game);
  }

  function inferGameType(source = {}) {
    const text = [...(source.genres || []), source.description || ""].join(" ").toLowerCase();
    if (/farming|farm life|life simulation|life sim|dating sim|social simulation/.test(text)) return "farming-life";
    if (/roguelike|rogue-like|roguelite|rogue-lite/.test(text)) return "roguelike";
    if (/massively multiplayer|multiplayer online battle arena|moba|battle royale|competitive/.test(text)) return "multiplayer";
    if (/strategy|tactical role-playing|4x|real-time strategy|turn-based strategy/.test(text)) return "strategy";
    if (/sandbox|open world survival|survival game|crafting/.test(text)) return "sandbox";
    if (/puzzle/.test(text)) return "puzzle";
    if (/role-playing|role playing|jrpg|computer role-playing/.test(text) && /adventure|story|narrative/.test(text)) return "story-rpg";
    if (/role-playing|role playing|jrpg|computer role-playing/.test(text)) return "rpg";
    if (/visual novel|interactive fiction|narrative|story-rich|story rich|adventure game/.test(text)) return "story-adventure";
    if (/simulation|management game|city-building|business simulation/.test(text)) return "simulation";
    if (/cozy|casual game|social simulation/.test(text)) return "cozy";
    if (/action|platform game|shooter|fighting game|hack and slash/.test(text)) return "action";
    return "other";
  }

  function refreshGoalSuggestions({ preserveSelection = true, autoSelect = false } = {}) {
    const prior = preserveSelection ? new Map(pendingGoalSuggestions.map(item => [item.key, item.selected])) : new Map();
    const source = selectedCatalog || catalogFromGame(findGame(els.editId?.value)) || { genres: [], description: "" };
    const type = resolvedGameType({ ...source, gameType: els.gameType?.value || "auto" });
    const mayAutoSelect = Boolean(autoSelect && !currentSteamAppId());
    pendingGoalSuggestions = buildGoalSuggestions(type, source).map((item, index) => ({
      ...item,
      selected: prior.has(item.key) ? prior.get(item.key) : Boolean(mayAutoSelect && index < 3)
    }));
    renderSuggestedGoals();
  }

  function buildGoalSuggestions(type, source = {}) {
    const title = source.title || String(els.title?.value || "this game").trim() || "this game";
    const common = [];
    if (type === "farming-life") common.push(
      goalSuggestion("first-season", "Play through your first full in-game season."),
      goalSuggestion("year-two", "Reach the start of Year 2."),
      goalSuggestion("relationship", "Reach one relationship or community milestone that you genuinely care about."),
      goalSuggestion("home-upgrade", "Complete one meaningful farm, home or tool upgrade."),
      goalSuggestion("major-world", "Complete one major town, community or story milestone.")
    );
    else if (type === "story-rpg") common.push(
      goalSuggestion("next-story", "Reach the next major story chapter or act."),
      goalSuggestion("character-arc", "Complete one companion or character arc you care about."),
      goalSuggestion("side-chain", "Finish one meaningful side-quest chain."),
      goalSuggestion("main-story", "Complete the main story.")
    );
    else if (type === "story-adventure") common.push(
      goalSuggestion("next-chapter", "Reach the next major chapter or story beat."),
      goalSuggestion("optional-thread", "Follow one optional narrative or character thread that catches your interest."),
      goalSuggestion("main-story", "Complete the main story.")
    );
    else if (type === "rpg") common.push(
      goalSuggestion("next-main", "Reach the next meaningful main-quest milestone."),
      goalSuggestion("build", "Reach one character-build or progression milestone you actually care about."),
      goalSuggestion("side-chain", "Finish one side-quest chain that interests you."),
      goalSuggestion("main-story", "Complete the main story if the game has a clear ending.")
    );
    else if (type === "simulation" || type === "cozy") common.push(
      goalSuggestion("cycle", "Complete one meaningful in-game cycle (month, season, scenario or equivalent)."),
      goalSuggestion("upgrade", "Complete one major upgrade or expansion."),
      goalSuggestion("personal-project", "Finish one self-chosen in-game project."),
      goalSuggestion("milestone", "Reach one progression milestone that changes what you can do.")
    );
    else if (type === "strategy") common.push(
      goalSuggestion("scenario", "Complete one full scenario, map or campaign chapter."),
      goalSuggestion("win", "Win one complete match or run on a comfortable difficulty."),
      goalSuggestion("strategy", "Successfully try one new strategy or build."),
      goalSuggestion("campaign", "Complete the main campaign if there is one.")
    );
    else if (type === "roguelike") common.push(
      goalSuggestion("full-run", "Complete one full successful run."),
      goalSuggestion("unlock", "Unlock one major character, route, weapon or system."),
      goalSuggestion("personal-best", "Reach a new personal-best progression milestone."),
      goalSuggestion("ending", "Reach one ending or equivalent major clear.")
    );
    else if (type === "sandbox") common.push(
      goalSuggestion("project", "Complete one self-chosen build or project."),
      goalSuggestion("unlock", "Reach the next major progression or tech unlock."),
      goalSuggestion("explore", "Explore one new area or system enough to decide what you want to do with it.")
    );
    else if (type === "puzzle") common.push(
      goalSuggestion("puzzle-set", "Complete the next puzzle set, world or chapter."),
      goalSuggestion("campaign", "Complete the main puzzle campaign."),
      goalSuggestion("challenge", "Clear one optional challenge that looks fun rather than miserable.")
    );
    else if (type === "action") common.push(
      goalSuggestion("mission", "Complete the next major mission or chapter."),
      goalSuggestion("campaign", "Complete the main campaign."),
      goalSuggestion("optional", "Clear one optional challenge that sounds genuinely fun.")
    );
    else if (type === "multiplayer") common.push(
      goalSuggestion("three-sessions", `Play three intentional sessions of ${title}, then decide whether you want a longer-term goal.`),
      goalSuggestion("skill", "Pick one concrete skill to practice for a few sessions and notice whether it improves."),
      goalSuggestion("social", "Play one deliberately social session with friends when the opportunity comes up.")
    );
    return common.slice(0, 6);
  }

  function goalSuggestion(key, text) {
    return { key, text };
  }

  function renderSuggestedGoals() {
    if (!els.suggestedGoals || !els.suggestedGoalList) return;
    const has = pendingGoalSuggestions.length > 0;
    els.suggestedGoals.classList.toggle("hidden", !has);
    if (!has) { els.suggestedGoalList.innerHTML = ""; return; }
    els.suggestedGoalList.innerHTML = pendingGoalSuggestions.map((item, index) => `<label class="game-suggested-goal-row-v305"><input type="checkbox" data-game-smart-goal="${index}" ${item.selected ? "checked" : ""} /><span>${esc(item.text)}</span></label>`).join("");
    els.suggestedGoalList.querySelectorAll("[data-game-smart-goal]").forEach(input => input.addEventListener("change", () => {
      const index = Number(input.dataset.gameSmartGoal);
      if (pendingGoalSuggestions[index]) pendingGoalSuggestions[index].selected = input.checked;
    }));
  }

  function normalizeWorkerUrl(value) {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    try {
      const url = new URL(raw);
      return /^https?:$/.test(url.protocol) ? url.href.replace(/\/+$/, "") : "";
    } catch { return ""; }
  }

  function renderSteamSettings() {
    const settings = steamSettings();
    if (els.steamWorkerUrl && document.activeElement !== els.steamWorkerUrl) els.steamWorkerUrl.value = settings.workerUrl || "";
    if (els.steamId64 && document.activeElement !== els.steamId64) els.steamId64.value = settings.steamId || "";
    if (els.steamConnectionStatus && !String(els.steamConnectionStatus.dataset.locked || "")) {
      els.steamConnectionStatus.textContent = settings.workerUrl ? "Worker URL saved. Test it once after deployment." : "Not configured yet.";
    }
  }

  function saveSteamSettings() {
    const settings = steamSettings();
    settings.workerUrl = normalizeWorkerUrl(els.steamWorkerUrl?.value || "");
    settings.steamId = String(els.steamId64?.value || "").trim().replace(/\D/g, "").slice(0, 20);
    if (els.steamWorkerUrl) els.steamWorkerUrl.value = settings.workerUrl;
    if (els.steamId64) els.steamId64.value = settings.steamId;
    if (els.steamConnectionStatus) {
      els.steamConnectionStatus.dataset.locked = "";
      els.steamConnectionStatus.textContent = settings.workerUrl ? "Saved. Use Test Worker to verify the free proxy." : "Not configured yet.";
    }
    app.saveState({ source: "steam-settings" });
    renderSteamSection();
  }

  async function testSteamConnection() {
    saveSteamSettings();
    const settings = steamSettings();
    if (!settings.workerUrl) {
      if (els.steamConnectionStatus) els.steamConnectionStatus.textContent = "Add the Worker URL first.";
      return;
    }
    if (els.steamConnectionTest) els.steamConnectionTest.disabled = true;
    if (els.steamConnectionStatus) { els.steamConnectionStatus.dataset.locked = "1"; els.steamConnectionStatus.textContent = "Testing…"; }
    try {
      const response = await fetch(`${settings.workerUrl}/health`, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (els.steamConnectionStatus) els.steamConnectionStatus.textContent = data.steamKeyConfigured ? "✓ Worker ready · Steam key configured" : "Worker is online, but STEAM_API_KEY is not configured yet.";
    } catch (error) {
      if (els.steamConnectionStatus) els.steamConnectionStatus.textContent = `Could not reach Worker · ${String(error?.message || error)}`;
    } finally {
      if (els.steamConnectionTest) els.steamConnectionTest.disabled = false;
      window.setTimeout(() => { if (els.steamConnectionStatus) els.steamConnectionStatus.dataset.locked = ""; }, 1000);
    }
  }

  function currentSteamAppId() {
    return String(els.steamAppIdInput?.value || selectedCatalog?.steamAppId || findGame(els.editId?.value)?.steamAppId || "").replace(/\D/g, "").trim();
  }

  function renderSteamSection() {
    if (!els.steamGoals) return;
    const appId = currentSteamAppId();
    const configured = Boolean(steamSettings().workerUrl);
    els.steamGoals.classList.toggle("hidden", !appId);
    if (!appId) {
      pendingSteamAchievements = [];
      if (els.steamAchievementList) els.steamAchievementList.innerHTML = "";
      return;
    }
    if (els.steamAppIdBadge) els.steamAppIdBadge.textContent = `App ${appId}`;
    if (els.steamStatus && !pendingSteamAchievements.length) {
      els.steamStatus.textContent = configured
        ? `Steam detected. Load the real achievements${steamSettings().steamId ? " plus your current unlock state" : ""}.`
        : "Steam detected. Configure the free Steam Worker once in Settings, then load the real achievements here.";
    }
    if (els.steamLoad) els.steamLoad.disabled = !configured;
    renderSteamAchievements();
  }

  async function loadSteamAchievements() {
    const appId = currentSteamAppId();
    const settings = steamSettings();
    if (!appId) return;
    if (!settings.workerUrl) {
      if (els.steamStatus) els.steamStatus.textContent = "Configure the Steam Worker in Settings first.";
      return;
    }
    if (els.steamLoad) els.steamLoad.disabled = true;
    if (els.steamStatus) els.steamStatus.textContent = "Loading Steam achievements…";
    try {
      const params = new URLSearchParams({ appid: appId, lang: "english" });
      if (settings.steamId) params.set("steamid", settings.steamId);
      const response = await fetch(`${settings.workerUrl}/api/steam/achievements?${params.toString()}`, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const existing = findGame(els.editId?.value)?.goals || [];
      const existingSteam = new Set(existing.map(goal => goal.steamApiName).filter(Boolean));
      pendingSteamAchievements = (Array.isArray(data.achievements) ? data.achievements : []).map(item => ({
        apiName: String(item.apiName || ""),
        name: String(item.name || item.apiName || "Steam achievement"),
        description: String(item.description || ""),
        hidden: Boolean(item.hidden),
        achieved: Boolean(item.achieved),
        unlockTime: Number(item.unlockTime || 0),
        globalPercent: Number.isFinite(Number(item.globalPercent)) ? Number(item.globalPercent) : null,
        group: ["recommended", "optional", "challenge"].includes(item.group) ? item.group : steamAchievementGroup(item),
        selected: !item.achieved && !item.hidden && (item.group || steamAchievementGroup(item)) === "recommended" && !existingSteam.has(item.apiName),
        queued: false,
        alreadyImported: existingSteam.has(item.apiName)
      }));
      const existingGame = findGame(els.editId?.value);
      if (existingGame && settings.steamId) syncExistingSteamGoals(existingGame, pendingSteamAchievements, Date.now());
      if (els.steamStatus) {
        const playerNote = settings.steamId
          ? data.playerAvailable === false ? " · personal unlock status unavailable (privacy / game data)" : " · personal unlock status loaded"
          : " · add SteamID64 in Settings if you also want old unlocks marked";
        els.steamStatus.textContent = `${pendingSteamAchievements.length} Steam achievement${pendingSteamAchievements.length === 1 ? "" : "s"} loaded${playerNote}. Pick only the ones you care about.`;
      }
      renderSteamAchievements();
    } catch (error) {
      console.warn("Steam achievement import failed", error);
      if (els.steamStatus) els.steamStatus.textContent = `Steam import failed: ${String(error?.message || error)}`;
    } finally {
      if (els.steamLoad) els.steamLoad.disabled = false;
    }
  }

  function syncExistingSteamGoals(game, steamItems, syncedAt) {
    if (!game || !Array.isArray(game.goals)) return;
    const byName = new Map(steamItems.map(item => [item.apiName, item]));
    let changed = false;
    game.goals.forEach(goal => {
      if (goal.source !== "steam" || !goal.steamApiName || goal.done) return;
      const remote = byName.get(goal.steamApiName);
      if (!remote?.achieved) return;
      goal.done = true;
      goal.completedAt = remote.unlockTime ? remote.unlockTime * 1000 : syncedAt;
      const wasUnlockedBeforeImport = remote.unlockTime && goal.createdAt && remote.unlockTime * 1000 <= Number(goal.createdAt || 0);
      if (wasUnlockedBeforeImport) {
        goal.rewardEventId = goal.rewardEventId || `steam-imported-legacy:${goal.steamApiName}`;
      } else if (!goal.rewardEventId) {
        const role = ROLES[game.role] || ROLES.fun;
        const reward = app.awardActivity?.({
          source: "game-goal",
          sourceId: `${game.id}:${goal.id}`,
          label: `${game.title}: ${goal.text}`,
          realm: role.realm,
          capability: game.role === "social" ? "social" : game.role === "japanese" ? "japanese" : game.role === "challenge" ? "confidence" : "wellbeing",
          xp: 6,
          realmXP: 6,
          statXP: 4,
          coins: 30,
          storyEnergyBase: 0.8,
          progressionRelevant: true,
          metadata: { gameGoal: true, steamSync: true }
        }) || null;
        goal.rewardEventId = reward?.eventId || `steam-sync-${syncedAt}`;
        goal.rewardStoryEnergy = Number(reward?.storyEnergy || 0);
        showToast("Steam goal synced ✦", `${game.title}: ${goal.text} · +${Number(reward?.coins || 0)} 🪙`);
      }
      changed = true;
    });
    game.lastSteamSyncAt = syncedAt;
    if (changed) persist("steam-goal-sync", { render: false });
  }

  function steamAchievementGroup(item = {}) {
    const percent = Number(item.globalPercent);
    const text = `${item.name || ""} ${item.description || ""}`.toLowerCase();
    if (Number.isFinite(percent) && percent <= 5) return "challenge";
    if (/100%|all achievements|every |without dying|hardest|legendary|master difficulty|collect all|obtain all/.test(text)) return "challenge";
    if ((Number.isFinite(percent) && percent >= 25) || /complete|finish|chapter|act |year |season|upgrade|story|relationship|friendship|first /.test(text)) return "recommended";
    return "optional";
  }

  function renderSteamAchievements() {
    if (!els.steamAchievementList) return;
    const has = pendingSteamAchievements.length > 0;
    els.steamSelectRecommended?.classList.toggle("hidden", !has);
    els.steamClearSelection?.classList.toggle("hidden", !has);
    els.steamHiddenLabel?.classList.toggle("hidden", !has || !pendingSteamAchievements.some(item => item.hidden));
    const includeHidden = Boolean(els.steamIncludeHidden?.checked);
    const visible = pendingSteamAchievements.filter(item => includeHidden || !item.hidden);
    els.steamAchievementList.innerHTML = visible.map((item, index) => {
      const actualIndex = pendingSteamAchievements.indexOf(item);
      const badge = item.alreadyImported ? "Imported" : item.achieved ? "Already unlocked" : item.group === "recommended" ? "Recommended" : item.group === "challenge" ? "Challenge / grind" : "Optional";
      const rarity = item.globalPercent == null ? "" : `${formatNumber(item.globalPercent)}% of players`;
      const description = item.hidden ? "Hidden Steam achievement" : (item.description || "No description supplied by Steam.");
      return `<label class="game-steam-achievement-v312 ${item.achieved ? "achieved" : ""} ${item.alreadyImported ? "imported" : ""}">
        <input type="checkbox" data-game-steam-achievement="${actualIndex}" ${item.selected || item.queued ? "checked" : ""} ${item.alreadyImported ? "disabled" : ""} />
        <span class="game-steam-achievement-mark-v312">${item.achieved ? "✓" : item.group === "recommended" ? "★" : item.group === "challenge" ? "◆" : "○"}</span>
        <span><strong>${esc(item.name)}</strong><small>${esc(description)}</small><em>${esc([badge, rarity].filter(Boolean).join(" · "))}</em></span>
      </label>`;
    }).join("") || `<p class="muted">No achievements to show with the current filter.</p>`;
    els.steamAchievementList.querySelectorAll("[data-game-steam-achievement]").forEach(input => input.addEventListener("change", () => {
      const item = pendingSteamAchievements[Number(input.dataset.gameSteamAchievement)];
      if (item) { item.selected = input.checked; item.queued = false; }
      updateSteamAddButton();
    }));
    updateSteamAddButton();
  }

  function updateSteamAddButton() {
    const selected = pendingSteamAchievements.filter(item => !item.alreadyImported && item.selected).length;
    const queued = pendingSteamAchievements.filter(item => !item.alreadyImported && item.queued).length;
    els.steamAddSelected?.classList.toggle("hidden", !pendingSteamAchievements.length);
    if (els.steamAddSelected) {
      els.steamAddSelected.disabled = selected === 0;
      els.steamAddSelected.textContent = selected
        ? `Add ${selected} selected as Game Goal${selected === 1 ? "" : "s"}`
        : queued
          ? `${queued} queued · Save game to keep them`
          : "Select achievements to add";
    }
  }

  function importSelectedSteamAchievements() {
    const selected = pendingSteamAchievements.filter(item => !item.alreadyImported && item.selected);
    if (!selected.length) return;
    selected.forEach(item => { item.queued = true; item.selected = false; });
    if (els.steamStatus) els.steamStatus.textContent = `${selected.length} Steam goal${selected.length === 1 ? "" : "s"} queued. Save the game to keep them.`;
    renderSteamAchievements();
  }

  function safeGameCoverUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      const host = url.hostname.toLowerCase();
      if (["cdn.akamai.steamstatic.com", "shared.akamai.steamstatic.com", "commons.wikimedia.org", "upload.wikimedia.org"].includes(host)) return url.href;
    } catch { /* ignore */ }
    return "";
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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
      gameTypeMeta: type => GAME_TYPES[type] || GAME_TYPES.other,
      trackingMeta,
      effectiveTrackingMode,
      configuredSessionAmount,
      estimateMinutesForAmount,
      amountLabel,
      playButtonLabel,
      resolvedGameType,
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

  function syncViewControls() {
    els.viewToggle?.querySelectorAll?.("[data-game-view]").forEach(button => {
      const active = (button.dataset.gameView || "grid") === viewMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* preference is non-critical */ }
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
