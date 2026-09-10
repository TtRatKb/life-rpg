(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Games could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 7;
  const STEAM_SYNC_SCHEMA = 4;
  const STEAM_AUTO_SYNC_STALE_MS = 6 * 60 * 60 * 1000;
  const STEAM_VISIBILITY_SYNC_DELAY_MS = 900;
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
    steamGamesCard: byId("gamesSteamConnectionCard"),
    steamGamesTitle: byId("gamesSteamConnectionTitle"),
    steamGamesDetail: byId("gamesSteamConnectionDetail"),
    steamGamesConfigure: byId("gamesSteamConfigure"),
    steamGamesTest: byId("gamesSteamTest"),
    steamGamesSyncAll: byId("gamesSteamSyncAll"),

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
    steamSelectAll: byId("gameSteamSelectAll"),
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
    steamSpoilerMode: byId("steamSpoilerMode"),
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
  const steamSyncInFlight = new Map();
  let steamAutoSyncTimer = null;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    renderSteamSettings();
    renderSteamGamesConnection();
    initialized = true;
    if (changed) persist("games-init", { render: false });
    render();
    exposeApi();
    repairRecentGameStewardship();
    scheduleSteamAutoSync("startup", 1800);
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
    els.steamSelectAll?.addEventListener("click", () => {
      const includeHidden = Boolean(els.steamIncludeHidden?.checked);
      pendingSteamAchievements.forEach(item => {
        if (item.alreadyImported || (!includeHidden && item.hidden)) return;
        item.selected = true;
        item.queued = false;
      });
      renderSteamAchievements();
    });
    els.steamSelectRecommended?.addEventListener("click", () => {
      const includeHidden = Boolean(els.steamIncludeHidden?.checked);
      pendingSteamAchievements.forEach(item => {
        if (item.alreadyImported || item.achieved || item.group !== "recommended" || (!includeHidden && item.hidden)) return;
        item.selected = true;
        item.queued = false;
      });
      renderSteamAchievements();
    });
    els.steamClearSelection?.addEventListener("click", () => {
      pendingSteamAchievements.forEach(item => {
        if (item.alreadyImported) return;
        item.selected = false;
        item.queued = false;
      });
      renderSteamAchievements();
    });
    els.steamIncludeHidden?.addEventListener("change", renderSteamAchievements);
    els.steamAddSelected?.addEventListener("click", importSelectedSteamAchievements);
    els.steamWorkerUrl?.addEventListener("change", saveSteamSettings);
    els.steamId64?.addEventListener("change", saveSteamSettings);
    els.steamSpoilerMode?.addEventListener("change", saveSteamSettings);
    els.steamConnectionTest?.addEventListener("click", testSteamConnection);
    els.steamGamesConfigure?.addEventListener("click", openSteamSettingsPanel);
    els.steamGamesTest?.addEventListener("click", async () => {
      if (!steamConnectionReady()) return openSteamSettingsPanel({ focusFirstMissing: true });
      await testSteamConnection();
      renderSteamGamesConnection();
    });
    els.steamGamesSyncAll?.addEventListener("click", syncAllSteamGamesManual);

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

      const steamSync = event.target.closest?.("[data-game-steam-sync]");
      if (steamSync) {
        syncSteamGameById(steamSync.dataset.gameSteamSync, { force: true, silent: false, reason: "manual" });
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

    document.addEventListener("click", event => {
      if (event.target.closest?.('[data-view="games"], [data-view-target="games"]')) {
        scheduleSteamAutoSync("games-open", 450);
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleSteamAutoSync("return", STEAM_VISIBILITY_SYNC_DELAY_MS);
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
      if (!Number.isFinite(Number(game.steamPlaytimeMinutes))) { game.steamPlaytimeMinutes = 0; changed = true; }
      if (!Number.isFinite(Number(game.steamPlaytime2WeeksMinutes))) { game.steamPlaytime2WeeksMinutes = 0; changed = true; }
      if (!Number.isFinite(Number(game.steamLastPlayedAt))) { game.steamLastPlayedAt = 0; changed = true; }
      if (!Number.isFinite(Number(game.steamLibrarySyncedAt))) { game.steamLibrarySyncedAt = 0; changed = true; }
      if (!game.steamAchievementSync || typeof game.steamAchievementSync !== "object" || Array.isArray(game.steamAchievementSync)) {
        game.steamAchievementSync = defaultSteamSyncState();
        changed = true;
      } else {
        const sync = game.steamAchievementSync;
        if (Number(sync.schemaVersion || 0) < STEAM_SYNC_SCHEMA) { sync.schemaVersion = STEAM_SYNC_SCHEMA; changed = true; }
        if (!sync.achievements || typeof sync.achievements !== "object" || Array.isArray(sync.achievements)) { sync.achievements = {}; changed = true; }
        if (!Number.isFinite(Number(sync.baselineAt))) { sync.baselineAt = 0; changed = true; }
        if (!Number.isFinite(Number(sync.personalBaselineVerifiedAt))) { sync.personalBaselineVerifiedAt = 0; changed = true; }
        if (!Number.isFinite(Number(sync.lastSyncAt))) { sync.lastSyncAt = 0; changed = true; }
        if (!Number.isFinite(Number(sync.total))) { sync.total = 0; changed = true; }
        if (!Number.isFinite(Number(sync.unlocked))) { sync.unlocked = 0; changed = true; }
        if (typeof sync.playerAvailable !== "boolean" && sync.playerAvailable !== null) { sync.playerAvailable = null; changed = true; }
        if (!Number.isFinite(Number(sync.reconciliationVersion))) { sync.reconciliationVersion = 0; changed = true; }
        if (!Number.isFinite(Number(sync.lastReturned))) { sync.lastReturned = 0; changed = true; }
        if (!Number.isFinite(Number(sync.lastMatchedGoals))) { sync.lastMatchedGoals = 0; changed = true; }
        if (!Number.isFinite(Number(sync.lastHistoricalImported))) { sync.lastHistoricalImported = 0; changed = true; }
        if (typeof sync.playerError !== "string") { sync.playerError = ""; changed = true; }
        if (!Number.isFinite(Number(sync.workerProtocolVersion))) { sync.workerProtocolVersion = 0; changed = true; }
      }
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
    stateRoot.integrations.steam ||= { workerUrl: "", steamId: "", spoilerMode: "strict" };
    if (typeof stateRoot.integrations.steam.workerUrl !== "string") { stateRoot.integrations.steam.workerUrl = ""; changed = true; }
    if (typeof stateRoot.integrations.steam.steamId !== "string") { stateRoot.integrations.steam.steamId = ""; changed = true; }
    if (!["strict", "steam-hidden", "off"].includes(stateRoot.integrations.steam.spoilerMode)) { stateRoot.integrations.steam.spoilerMode = "strict"; changed = true; }

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
    state.integrations.steam ||= { workerUrl: "", steamId: "", spoilerMode: "strict" };
    if (!["strict", "steam-hidden", "off"].includes(state.integrations.steam.spoilerMode)) state.integrations.steam.spoilerMode = "strict";
    return state.integrations.steam;
  }

  function effectiveGameLastPlayedAt(game = {}) {
    return Math.max(0, Number(game.lastPlayedAt || 0), Number(game.steamLastPlayedAt || 0));
  }

  function steamRarity(globalPercent) {
    const percent = Number(globalPercent);
    if (!Number.isFinite(percent)) return { label: "Unknown rarity", multiplier: 1 };
    if (percent < 1) return { label: "Legendary", multiplier: 2 };
    if (percent < 5) return { label: "Ultra rare", multiplier: 1.7 };
    if (percent < 10) return { label: "Very rare", multiplier: 1.45 };
    if (percent < 25) return { label: "Rare", multiplier: 1.25 };
    if (percent < 50) return { label: "Uncommon", multiplier: 1.1 };
    return { label: "Common", multiplier: 1 };
  }

  function steamSpoilerProtected(item = {}) {
    const confirmedUnlocked = Boolean(
      item.achieved ||
      item.importedAlreadyUnlocked ||
      (item.source === "steam" && item.done && (item.steamAutoImported || item.rewardEventId))
    );
    if (confirmedUnlocked) return false;
    const mode = steamSettings().spoilerMode || "strict";
    if (mode === "strict") return true;
    if (mode === "steam-hidden") return Boolean(item.hidden || item.steamHidden);
    return false;
  }

  function steamSafeName(item = {}) {
    return steamSpoilerProtected(item) ? "Locked Steam achievement" : String(item.name || item.text || item.apiName || "Steam achievement");
  }

  function steamSafeDescription(item = {}) {
    if (steamSpoilerProtected(item)) return "Spoiler Shield is hiding the title and description until you unlock it.";
    return String(item.description || "");
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
    renderSteamGamesConnection();
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
    if (selectedSort === "played") return effectiveGameLastPlayedAt(b) - effectiveGameLastPlayedAt(a) || String(a.title || "").localeCompare(String(b.title || ""));
    if (selectedSort === "progress") return Number(b.progress || 0) - Number(a.progress || 0) || String(a.title || "").localeCompare(String(b.title || ""));
    const statusOrder = { playing: 0, endless: 1, paused: 2, backlog: 3, finished: 4, dropped: 5 };
    const aOrder = statusOrder[a.status] ?? 9;
    const bOrder = statusOrder[b.status] ?? 9;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aLast = effectiveGameLastPlayedAt(a);
    const bLast = effectiveGameLastPlayedAt(b);
    if (aLast !== bLast) return aLast - bLast;
    return String(a.title).localeCompare(String(b.title));
  }

  function gameCardMarkup(game) {
    const status = STATUSES[game.status] || STATUSES.backlog;
    const role = ROLES[game.role] || ROLES.fun;
    const openGoals = game.goals.filter(goal => !goal.done);
    const doneGoals = game.goals.filter(goal => goal.done);
    const effectiveLastPlayed = effectiveGameLastPlayedAt(game);
    const lastPlayed = effectiveLastPlayed ? `Last played ${humanAgo(effectiveLastPlayed)}` : "Not played yet";
    const lifePlaytime = game.totalMinutes > 0 ? `Life RPG · ${formatDuration(game.totalMinutes)} logged` : "Life RPG · no session logged yet";
    const steamPlaytime = Number(game.steamPlaytimeMinutes || 0) > 0 ? `Steam · ${formatDuration(game.steamPlaytimeMinutes)} total` : "";
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
            <span>⌁ ${esc(lifePlaytime)}</span>
            ${steamPlaytime ? `<span>☁ ${esc(steamPlaytime)}</span>` : ""}
            <span>✦ ${formatNumber(game.sessions || 0)} Life RPG session${Number(game.sessions || 0) === 1 ? "" : "s"}</span>
            <span>${tracking.icon} ${esc(trackingSummary)}</span>
          </div>

          ${game.steamAppId ? steamSyncMarkup(game) : ""}

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
            ${game.goals.length ? (() => {
              const goalLimit = viewMode === "list" ? 6 : 3;
              const orderedGoals = [...game.goals].sort((a, b) => Number(Boolean(a.done)) - Number(Boolean(b.done)) || Number(b.createdAt || 0) - Number(a.createdAt || 0));
              const shownGoals = orderedGoals.slice(0, goalLimit);
              const remainingGoals = Math.max(0, orderedGoals.length - shownGoals.length);
              return `<div class="game-goal-list-v17">${shownGoals.map(goal => goalMarkup(game, goal)).join("")}${remainingGoals ? `<small class="game-more-goals-v17">+ ${remainingGoals} more in Edit</small>` : ""}</div>`;
            })() : `<p class="game-no-goals-v17">${game.steamAppId ? "Steam is detected. Open Edit → Steam Goals to import the game's real achievements." : game.catalogId ? "Life RPG knows what kind of game this is. Open Edit to add a few useful objectives when you want them." : "Optional. Add metadata or your own goals whenever something actually matters."}</p>`}
            ${doneGoals.length && openGoals.length ? `<small class="game-goal-cleared-v17">${doneGoals.length} goal${doneGoals.length === 1 ? "" : "s"} already cleared ✓</small>` : ""}
          </div>

          <div class="game-card-actions-v17">
            ${active ? `<button class="primary-button" data-game-quick-log="${escAttr(game.id)}" data-game-amount="${Number(sessionAmount)}" type="button">${esc(playButtonLabel(game, sessionAmount))}</button>` : ""}
            ${game.status === "backlog" ? `<button class="primary-button" data-game-quick-log="${escAttr(game.id)}" data-game-amount="${Number(sessionAmount)}" data-game-preserve-backlog="true" type="button">${esc(playButtonLabel(game, sessionAmount).replace(/^▶ /, "▶ Try · "))}</button>` : ""}
            ${game.steamAppId ? `<button class="secondary-button game-steam-sync-button-v314t" data-game-steam-sync="${escAttr(game.id)}" type="button" ${steamSyncInFlight.has(game.id) ? "disabled" : ""}>${steamSyncInFlight.has(game.id) ? "Syncing Steam…" : steamConnectionReady() ? "↻ Sync Steam" : "⚙ Set up Steam"}</button>` : ""}
            <button class="secondary-button" data-game-log="${escAttr(game.id)}" type="button">Log session</button>
            <button class="text-button" data-game-edit="${escAttr(game.id)}" type="button">Edit details</button>
          </div>
        </div>
      </article>`;
  }

  function goalMarkup(game, goal) {
    const steamState = goal.source === "steam" ? (goal.importedAlreadyUnlocked ? " · Historical" : goal.steamAutoImported && goal.done ? " · Synced" : "") : "";
    const rarity = goal.source === "steam" ? steamRarity(goal.globalPercent) : null;
    const source = goal.source === "steam" ? `<small class="game-goal-source-v312">Steam${steamState}${goal.globalPercent != null ? ` · ${esc(rarity.label)} · ${formatNumber(goal.globalPercent)}%` : ""}</small>` : "";
    const displayText = goal.source === "steam" ? steamSafeName({ ...goal, name: goal.text }) : goal.text;
    const safeDescription = goal.source === "steam" ? steamSafeDescription(goal) : "";
    const detail = goal.source === "steam" && safeDescription ? `<small class="game-goal-detail-v312">${esc(safeDescription)}</small>` : "";
    return `
      <div class="game-goal-row-v17 ${goal.done ? "done" : ""}">
        ${goal.source === "steam"
          ? `<span class="game-goal-check-v17 game-goal-steam-state-v314x" aria-label="Steam achievement sync state">${goal.done ? "✓" : "↻"}</span>`
          : `<button class="game-goal-check-v17" data-game-id="${escAttr(game.id)}" data-game-goal-toggle="${escAttr(goal.id)}" type="button" aria-label="${goal.done ? "Reopen" : "Complete"} goal">${goal.done ? "✓" : ""}</button>`}
        <span><b>${esc(displayText)}</b>${source}${detail}</span>
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

  function sameLocalDate(timestamp, date = new Date()) {
    const value = new Date(Number(timestamp || 0));
    if (!Number.isFinite(value.getTime())) return false;
    return value.getFullYear() === date.getFullYear()
      && value.getMonth() === date.getMonth()
      && value.getDate() === date.getDate();
  }

  function steamGoalCount(game = {}) {
    return (Array.isArray(game.goals) ? game.goals : []).filter(goal => goal?.source === "steam" || goal?.steamApiName).length;
  }

  function newestSteamGoalAt(game = {}) {
    return (Array.isArray(game.goals) ? game.goals : [])
      .filter(goal => goal?.source === "steam" || goal?.steamApiName)
      .reduce((latest, goal) => Math.max(latest, Number(goal?.createdAt || 0), Number(goal?.completedAt || 0)), 0);
  }

  function gameRewardKey(game = {}) {
    return String(game.steamAppId || game.catalogId || `${game.title || "game"}|${game.platform || ""}`).trim().toLowerCase();
  }

  function rewardGameCuration(game, { includeCreation = false, includeDetails = false, includeSteam = false } = {}) {
    const stewardship = window.LifeRPGStewardship;
    if (!stewardship?.rewardCreation || !game) return null;
    const results = [];
    const key = gameRewardKey(game);

    if (includeCreation) {
      results.push(stewardship.rewardCreation({
        type: "game",
        id: game.id,
        label: game.title,
        fields: [game.title, game.platform]
      }));
    }

    if (includeDetails && (game.catalogId || game.coverUrl || game.steamAppId || game.gameType !== "auto" || game.trackingMode !== "auto")) {
      results.push(stewardship.rewardCreation({
        type: "gameDetails",
        label: game.title,
        fingerprint: `game-details:${key}:v1`
      }));
    }

    if (includeSteam) {
      const count = steamGoalCount(game);
      [1, 5, 10].forEach(threshold => {
        if (count < threshold) return;
        results.push(stewardship.rewardCreation({
          type: "gameSteam",
          label: `${game.title} · ${threshold}+ Steam goal${threshold === 1 ? "" : "s"}`,
          fingerprint: `game-steam:${key}:goals-${threshold}`
        }));
      });
    }

    if (!results.length) return null;
    const xp = results.reduce((sum, result) => sum + Number(result?.xp || 0), 0);
    const storyEnergy = results.reduce((sum, result) => sum + Number(result?.storyEnergy || 0), 0);
    const rawStoryEnergy = results.reduce((sum, result) => sum + Number(result?.rawStoryEnergy || 0), 0);
    const coins = results.reduce((sum, result) => sum + Number(result?.coins || 0), 0);
    const status = stewardship.todayStatus?.() || {};
    return { results, xp, storyEnergy, rawStoryEnergy, coins, ...status };
  }

  function repairRecentGameStewardship() {
    const current = model();
    if (!Array.isArray(current.items) || !current.items.length) return;
    const today = new Date();
    const totals = { xp: 0, storyEnergy: 0, coins: 0, changed: false };

    current.items.forEach(game => {
      const createdToday = sameLocalDate(game.createdAt, today);
      const detailsAddedToday = sameLocalDate(game.catalogUpdatedAt, today) || createdToday;
      const steamCuratedToday = sameLocalDate(newestSteamGoalAt(game), today);
      if (!createdToday && !detailsAddedToday && !steamCuratedToday) return;
      const reward = rewardGameCuration(game, {
        includeCreation: createdToday,
        includeDetails: detailsAddedToday,
        includeSteam: steamCuratedToday
      });
      if (!reward) return;
      totals.xp += Number(reward.xp || 0);
      totals.storyEnergy += Number(reward.storyEnergy || 0);
      totals.coins += Number(reward.coins || 0);
      if (Number(reward.xp || 0) > 0 || Number(reward.storyEnergy || 0) > 0 || Number(reward.coins || 0) > 0) totals.changed = true;
    });

    if (!totals.changed) return;
    persist("game-stewardship-repair", { render: false });
    app.renderAll?.();
    showToast(
      "Game library rewards repaired ✦",
      `Your recent game setup now counts · +${Math.round(totals.xp)} XP · +${app.formatEnergy?.(totals.storyEnergy) ?? Number(totals.storyEnergy || 0).toFixed(2)} 🔥 · +${Math.round(totals.coins)} 🪙`
    );
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
        steamHidden: Boolean(item.hidden),
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
    const addedSteamGoals = newGoals.filter(goal => goal.source === "steam" || goal.steamApiName).length;
    const curationReward = rewardGameCuration(game, {
      includeCreation: !existing,
      includeDetails: Boolean(!existing || metadata.id || selectedCatalog || game.catalogUpdatedAt === now),
      includeSteam: addedSteamGoals > 0
    });
    const addAnother = !existing && event.submitter?.dataset.saveAnother === "true";
    persist(existing ? "game-edit" : "game-create");
    if (Number(curationReward?.xp || 0) > 0 || Number(curationReward?.storyEnergy || 0) > 0 || Number(curationReward?.coins || 0) > 0) app.renderAll?.();
    const upkeepText = window.LifeRPGStewardship?.statusText?.(curationReward) || "";
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
    els.logGoal.innerHTML = `<option value="">No specific goal</option>${open.map(goal => {
      const label = goal.source === "steam" ? steamSafeName({ ...goal, name: goal.text }) : goal.text;
      return `<option value="${escAttr(goal.id)}">${goal.source === "steam" ? "Steam · " : ""}${esc(label)}</option>`;
    }).join("")}`;
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
    const goalLabel = goal ? (goal.source === "steam" ? steamSafeName({ ...goal, name: goal.text }) : goal.text) : "";
    els.logPreview.innerHTML = `<span>${meta.icon}</span><div><small>SESSION</small><strong>${esc(amountLabel(game, amount))} with ${esc(game.title)}</strong><p>${goal ? `Working toward: ${esc(goalLabel)}` : "Just playing counts as hobby progress; clearing tracked goals or finishing games gives the bigger progression rewards."}${timeText}${progress === null ? "" : ` · Progress after: ${progress}%`}</p></div>`;
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
    if (goal.source === "steam") {
      showToast("Steam goal syncs automatically", "Play on Steam and use Sync Steam; Life RPG will complete and reward this achievement from Steam's real unlock state.");
      return;
    }
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

  function steamConnectionReady() {
    const settings = steamSettings();
    return Boolean(normalizeWorkerUrl(settings.workerUrl) && /^\d{17}$/.test(String(settings.steamId || "")));
  }

  function steamConnectionProblem() {
    const settings = steamSettings();
    if (!normalizeWorkerUrl(settings.workerUrl)) return "Worker URL missing";
    if (!String(settings.steamId || "").trim()) return "SteamID64 missing";
    if (!/^\d{17}$/.test(String(settings.steamId || ""))) return "SteamID64 should be the 17-digit numeric Steam ID";
    return "";
  }

  function renderSteamGamesConnection() {
    if (!els.steamGamesCard) return;
    const ready = steamConnectionReady();
    const problem = steamConnectionProblem();
    const steamGames = model().items.filter(game => game.steamAppId);
    const lastSync = steamGames.reduce((latest, game) => Math.max(latest, Number(game?.steamAchievementSync?.lastSyncAt || game?.lastSteamSyncAt || 0)), 0);
    const needsWorkerUpdate = steamGames.some(game => game?.steamAchievementSync?.playerAvailable === false && Number(game?.steamAchievementSync?.workerProtocolVersion || 0) < 2);
    const needsPlaytimeWorkerUpdate = !needsWorkerUpdate && steamGames.some(game => {
      const version = Number(game?.steamAchievementSync?.workerProtocolVersion || 0);
      return version > 0 && version < 3;
    });
    els.steamGamesCard.classList.toggle("is-connected", ready);
    if (els.steamGamesTitle) els.steamGamesTitle.textContent = !ready
      ? "Steam is not connected yet"
      : needsWorkerUpdate ? "Steam connected · Worker update needed"
        : needsPlaytimeWorkerUpdate ? "Steam connected · playtime update available" : "Steam connection configured ✓";
    if (els.steamGamesDetail) {
      els.steamGamesDetail.textContent = ready
        ? needsWorkerUpdate
          ? "Achievement metadata works, but the current Cloudflare Worker is metadata-only. Deploy Steam Worker v3 to sync personal unlocks and playtime."
          : needsPlaytimeWorkerUpdate
            ? "Personal achievements work. Deploy Steam Worker v3 to also sync Steam total playtime and last-played context."
            : `${steamGames.length} Steam game${steamGames.length === 1 ? "" : "s"} detected${lastSync ? ` · last sync ${humanAgoWithTime(lastSync)}` : " · ready for the first baseline sync"}.`
        : `${problem || "Add your Steam Worker URL and SteamID64 once."} Your API key stays only inside the Cloudflare Worker.`;
    }
    if (els.steamGamesConfigure) els.steamGamesConfigure.textContent = ready ? "⚙ Steam settings" : "⚙ Configure Steam";
    if (els.steamGamesTest) els.steamGamesTest.disabled = !ready;
    if (els.steamGamesSyncAll) {
      els.steamGamesSyncAll.disabled = !ready || !steamGames.length || steamSyncInFlight.size > 0;
      els.steamGamesSyncAll.textContent = steamSyncInFlight.size > 0 ? "Syncing Steam…" : "↻ Sync all Steam games";
    }
  }

  function openSteamSettingsPanel({ focusFirstMissing = false } = {}) {
    document.querySelector('[data-view-target="settings"]')?.click();
    window.setTimeout(() => {
      const panel = document.querySelector(".settings-steam-panel-v312");
      panel?.scrollIntoView({ behavior: "smooth", block: "center" });
      panel?.classList.add("settings-steam-highlight-v314u");
      window.setTimeout(() => panel?.classList.remove("settings-steam-highlight-v314u"), 2200);
      if (focusFirstMissing) {
        const settings = steamSettings();
        if (!normalizeWorkerUrl(settings.workerUrl)) els.steamWorkerUrl?.focus();
        else if (!/^\d{17}$/.test(String(settings.steamId || ""))) els.steamId64?.focus();
      }
    }, 80);
  }

  async function syncAllSteamGamesManual() {
    if (!steamConnectionReady()) {
      showToast("Steam setup needed", "Add the Worker URL and your 17-digit SteamID64 first.");
      openSteamSettingsPanel({ focusFirstMissing: true });
      return;
    }
    const targets = model().items.filter(game => game.steamAppId);
    if (!targets.length) {
      showToast("No Steam games yet", "Add or edit a game with a Steam App ID first.");
      return;
    }
    renderSteamGamesConnection();
    const libraryResult = await syncSteamLibrary({ silent: true });
    let synced = 0;
    let unavailable = 0;
    let failed = 0;
    let historicalImported = 0;
    let newUnlocks = 0;
    const unavailableReasons = [];
    for (const game of targets) {
      const result = await syncSteamGameById(game.id, { force: true, silent: true, reason: "manual-all", includeLibrary: false });
      if (!result) {
        failed += 1;
        continue;
      }
      if (result.unavailable) {
        unavailable += 1;
        if (result.playerError) unavailableReasons.push(result.playerError);
        continue;
      }
      synced += 1;
      historicalImported += Number(result.historicalImported || 0);
      newUnlocks += Number(result.unlocked?.length || 0);
    }
    render();
    renderSteamGamesConnection();
    const detail = [
      `${synced}/${targets.length} with personal unlock state`,
      unavailable ? `${unavailable} metadata-only / unavailable` : "",
      failed ? `${failed} failed` : "",
      historicalImported ? `${historicalImported} historical achievement${historicalImported === 1 ? "" : "s"} added` : "",
      newUnlocks ? `${newUnlocks} new unlock${newUnlocks === 1 ? "" : "s"} rewarded` : "",
      libraryResult ? `${libraryResult.matched} Steam playtime record${libraryResult.matched === 1 ? "" : "s"} matched` : "",
      unavailable && unavailableReasons.length ? unavailableReasons[0] : ""
    ].filter(Boolean).join(" · ");
    showToast(unavailable || failed ? "Steam sync incomplete" : "Steam sync finished ✓", detail);
  }

  function renderSteamSettings() {
    const settings = steamSettings();
    if (els.steamWorkerUrl && document.activeElement !== els.steamWorkerUrl) els.steamWorkerUrl.value = settings.workerUrl || "";
    if (els.steamId64 && document.activeElement !== els.steamId64) els.steamId64.value = settings.steamId || "";
    if (els.steamSpoilerMode && document.activeElement !== els.steamSpoilerMode) els.steamSpoilerMode.value = settings.spoilerMode || "strict";
    if (els.steamConnectionStatus && !String(els.steamConnectionStatus.dataset.locked || "")) {
      const problem = steamConnectionProblem();
      els.steamConnectionStatus.textContent = problem ? problem : "Saved · use Test Worker to verify the connection.";
    }
    renderSteamGamesConnection();
  }

  function saveSteamSettings() {
    const settings = steamSettings();
    settings.workerUrl = normalizeWorkerUrl(els.steamWorkerUrl?.value || "");
    settings.steamId = String(els.steamId64?.value || "").trim().replace(/\D/g, "").slice(0, 20);
    settings.spoilerMode = ["strict", "steam-hidden", "off"].includes(els.steamSpoilerMode?.value) ? els.steamSpoilerMode.value : (settings.spoilerMode || "strict");
    if (els.steamWorkerUrl) els.steamWorkerUrl.value = settings.workerUrl;
    if (els.steamId64) els.steamId64.value = settings.steamId;
    if (els.steamConnectionStatus) {
      els.steamConnectionStatus.dataset.locked = "";
      const problem = steamConnectionProblem();
      els.steamConnectionStatus.textContent = problem ? problem : "Saved. Use Test Worker to verify the free proxy.";
    }
    app.saveState({ source: "steam-settings" });
    renderSteamSection();
    renderSteamGamesConnection();
  }

  async function testSteamConnection() {
    saveSteamSettings();
    const settings = steamSettings();
    if (!settings.workerUrl) {
      if (els.steamConnectionStatus) els.steamConnectionStatus.textContent = "Add the Worker URL first.";
      return;
    }
    if (!/^\d{17}$/.test(String(settings.steamId || ""))) {
      if (els.steamConnectionStatus) els.steamConnectionStatus.textContent = "Add your 17-digit SteamID64 first.";
      return;
    }
    if (els.steamConnectionTest) els.steamConnectionTest.disabled = true;
    if (els.steamConnectionStatus) { els.steamConnectionStatus.dataset.locked = "1"; els.steamConnectionStatus.textContent = "Testing…"; }
    try {
      const response = await fetch(`${settings.workerUrl}/health`, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const supportsPlayerSync = data?.capabilities?.playerAchievements === true || Number(data?.protocolVersion || 0) >= 2;
      const supportsLibrarySync = data?.capabilities?.ownedGames === true || Number(data?.protocolVersion || 0) >= 3;
      if (els.steamConnectionStatus) {
        els.steamConnectionStatus.textContent = !data.steamKeyConfigured
          ? "Worker is online, but STEAM_API_KEY is not configured yet."
          : supportsPlayerSync
            ? `✓ Worker ready · personal achievements${supportsLibrarySync ? " + Steam playtime" : ""} supported`
            : "Worker + Steam key are online, but this is the old Worker build. Update the Worker to v3 for personal achievement unlocks and Steam playtime.";
      }
    } catch (error) {
      if (els.steamConnectionStatus) els.steamConnectionStatus.textContent = `Could not reach Worker · ${String(error?.message || error)}`;
    } finally {
      if (els.steamConnectionTest) els.steamConnectionTest.disabled = false;
      window.setTimeout(() => { if (els.steamConnectionStatus) els.steamConnectionStatus.dataset.locked = ""; }, 1000);
      renderSteamGamesConnection();
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

  function defaultSteamSyncState() {
    return {
      schemaVersion: STEAM_SYNC_SCHEMA,
      baselineAt: 0,
      personalBaselineVerifiedAt: 0,
      lastSyncAt: 0,
      total: 0,
      unlocked: 0,
      playerAvailable: null,
      reconciliationVersion: 2,
      lastReturned: 0,
      lastMatchedGoals: 0,
      lastHistoricalImported: 0,
      playerError: "",
      workerProtocolVersion: 0,
      achievements: {}
    };
  }

  function steamSyncState(game = {}) {
    if (!game.steamAchievementSync || typeof game.steamAchievementSync !== "object" || Array.isArray(game.steamAchievementSync)) {
      game.steamAchievementSync = defaultSteamSyncState();
    }
    game.steamAchievementSync.schemaVersion = STEAM_SYNC_SCHEMA;
    game.steamAchievementSync.achievements ||= {};
    if (!Number.isFinite(Number(game.steamAchievementSync.personalBaselineVerifiedAt))) game.steamAchievementSync.personalBaselineVerifiedAt = 0;
    if (!Number.isFinite(Number(game.steamAchievementSync.reconciliationVersion))) game.steamAchievementSync.reconciliationVersion = 0;
    if (!Number.isFinite(Number(game.steamAchievementSync.lastReturned))) game.steamAchievementSync.lastReturned = 0;
    if (!Number.isFinite(Number(game.steamAchievementSync.lastMatchedGoals))) game.steamAchievementSync.lastMatchedGoals = 0;
    if (!Number.isFinite(Number(game.steamAchievementSync.lastHistoricalImported))) game.steamAchievementSync.lastHistoricalImported = 0;
    if (typeof game.steamAchievementSync.playerError !== "string") game.steamAchievementSync.playerError = "";
    if (!Number.isFinite(Number(game.steamAchievementSync.workerProtocolVersion))) game.steamAchievementSync.workerProtocolVersion = 0;
    return game.steamAchievementSync;
  }

  function steamAchievementKey(game, apiName) {
    return `${String(game?.steamAppId || "").trim()}:${String(apiName || "").trim()}`;
  }

  function steamBoolean(value) {
    if (value === true || value === 1 || value === "1") return true;
    if (value === false || value === 0 || value === "0" || value == null || value === "") return false;
    return String(value).trim().toLowerCase() === "true";
  }

  function normalizeSteamAchievementPayload(data = {}) {
    const byApiName = new Map();
    let personalSignal = false;

    const merge = (raw = {}, kind = "rich") => {
      if (!raw || typeof raw !== "object") return;
      const apiName = String(
        raw.apiName || raw.apiname || raw.api_name ||
        ((kind === "schema" || raw.displayName || raw.display_name) ? raw.name : "") || ""
      ).trim();
      if (!apiName) return;
      const current = byApiName.get(apiName) || { apiName };
      const hasAchieved = Object.prototype.hasOwnProperty.call(raw, "achieved")
        || Object.prototype.hasOwnProperty.call(raw, "unlocked")
        || Object.prototype.hasOwnProperty.call(raw, "completed");
      const hasUnlockTime = Object.prototype.hasOwnProperty.call(raw, "unlockTime")
        || Object.prototype.hasOwnProperty.call(raw, "unlocktime")
        || Object.prototype.hasOwnProperty.call(raw, "unlockedAt");
      if (kind === "player" || hasAchieved || hasUnlockTime) personalSignal = true;

      const displayName = String(raw.displayName || raw.display_name || (kind !== "schema" ? raw.name : "") || current.name || apiName);
      const description = String(raw.description ?? raw.desc ?? current.description ?? "");
      const hiddenValue = Object.prototype.hasOwnProperty.call(raw, "hidden") ? steamBoolean(raw.hidden) : Boolean(current.hidden);
      const achievedValue = hasAchieved
        ? steamBoolean(raw.achieved ?? raw.unlocked ?? raw.completed)
        : Boolean(current.achieved);
      const rawUnlockTime = raw.unlockTime ?? raw.unlocktime ?? raw.unlockedAt ?? current.unlockTime ?? 0;
      const unlockTime = Math.max(0, Number(rawUnlockTime || 0));
      const rawPercent = raw.globalPercent ?? raw.global_percent ?? raw.percent ?? current.globalPercent;
      const globalPercent = Number.isFinite(Number(rawPercent)) ? Number(rawPercent) : (current.globalPercent ?? null);
      const rawGroup = String(raw.group || current.group || "");

      byApiName.set(apiName, {
        ...current,
        apiName,
        name: displayName || apiName,
        description,
        hidden: hiddenValue,
        achieved: achievedValue,
        unlockTime,
        globalPercent,
        group: ["recommended", "optional", "challenge"].includes(rawGroup) ? rawGroup : current.group
      });
    };

    const schemaCandidates = [
      data?.game?.availableGameStats?.achievements,
      data?.game?.availablegamestats?.achievements,
      data?.schema?.game?.availableGameStats?.achievements,
      data?.schema?.game?.availablegamestats?.achievements,
      data?.schema?.achievements
    ].find(Array.isArray) || [];
    schemaCandidates.forEach(item => merge(item, "schema"));

    const richAchievements = Array.isArray(data.achievements) ? data.achievements : [];
    richAchievements.forEach(item => merge(item, "rich"));

    const playerCandidates = [
      data?.playerAchievements,
      data?.player?.achievements,
      data?.playerstats?.achievements,
      data?.playerStats?.achievements
    ].find(Array.isArray) || [];
    playerCandidates.forEach(item => merge(item, "player"));

    const globalCandidates = [data?.globalAchievements, data?.global?.achievements].find(Array.isArray) || [];
    globalCandidates.forEach(item => merge(item, "global"));

    const items = Array.from(byApiName.values()).map(item => ({
      ...item,
      name: String(item.name || item.apiName || "Steam achievement"),
      description: String(item.description || ""),
      hidden: Boolean(item.hidden),
      achieved: Boolean(item.achieved),
      unlockTime: Math.max(0, Number(item.unlockTime || 0)),
      globalPercent: Number.isFinite(Number(item.globalPercent)) ? Number(item.globalPercent) : null,
      group: ["recommended", "optional", "challenge"].includes(item.group) ? item.group : steamAchievementGroup(item)
    })).filter(item => item.apiName);

    const explicitPlayerAvailable = typeof data.playerAvailable === "boolean" ? data.playerAvailable : null;
    const playerAvailable = explicitPlayerAvailable ?? personalSignal;
    return { items, playerAvailable };
  }

  async function fetchSteamAchievements(appId) {
    const settings = steamSettings();
    if (!settings.workerUrl) throw new Error("Configure the Steam Worker in Settings first.");
    if (!settings.steamId) throw new Error("Add your SteamID64 in Settings so Life RPG can read your personal unlock state.");
    const params = new URLSearchParams({ appid: String(appId), lang: "english", steamid: settings.steamId });
    const response = await fetch(`${settings.workerUrl}/api/steam/achievements?${params.toString()}`, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    const normalized = normalizeSteamAchievementPayload(data);
    const workerProtocolVersion = Math.max(0, Number(data?.protocolVersion || 0));
    const workerSupportsPlayerSync = data?.capabilities?.playerAchievements === true || workerProtocolVersion >= 2;
    const playerError = normalized.playerAvailable === false
      ? String(data?.playerError || data?.diagnostics?.playerError || (!workerSupportsPlayerSync ? "The Steam Worker is the old metadata-only build. Deploy Worker v3 to enable personal unlock sync and Steam playtime." : "Steam did not return personal unlock state for this profile/game.")).trim()
      : "";
    return {
      data: {
        ...data,
        playerAvailable: normalized.playerAvailable,
        playerError,
        workerProtocolVersion,
        workerSupportsPlayerSync
      },
      items: normalized.items
    };
  }

  async function fetchSteamLibrary(appId = "") {
    const settings = steamSettings();
    if (!settings.workerUrl) throw new Error("Configure the Steam Worker in Settings first.");
    if (!settings.steamId) throw new Error("Add your SteamID64 in Settings first.");
    const params = new URLSearchParams({ steamid: settings.steamId });
    if (appId) params.set("appid", String(appId));
    const response = await fetch(`${settings.workerUrl}/api/steam/library?${params.toString()}`, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  function applySteamLibrary(data = {}, syncedAt = Date.now()) {
    const remoteGames = Array.isArray(data.games) ? data.games : [];
    const byAppId = new Map(remoteGames.map(item => [String(item.appid || item.appId || ""), item]));
    let matched = 0;
    for (const game of model().items) {
      const remote = byAppId.get(String(game.steamAppId || ""));
      if (!remote) continue;
      game.steamPlaytimeMinutes = Math.max(0, Number(remote.playtimeForever || remote.playtime_forever || 0));
      game.steamPlaytime2WeeksMinutes = Math.max(0, Number(remote.playtime2Weeks || remote.playtime_2weeks || 0));
      const lastPlayedSeconds = Math.max(0, Number(remote.lastPlayedAt || remote.rtime_last_played || 0));
      game.steamLastPlayedAt = lastPlayedSeconds > 10_000_000_000 ? lastPlayedSeconds : lastPlayedSeconds * 1000;
      game.steamLibrarySyncedAt = syncedAt;
      matched += 1;
    }
    return matched;
  }

  async function syncSteamLibrary({ appId = "", silent = true } = {}) {
    try {
      const data = await fetchSteamLibrary(appId);
      const matched = applySteamLibrary(data, Date.now());
      persist("steam-library-sync", { render: false });
      if (!silent) showToast("Steam playtime synced ✓", `${matched} Life RPG game${matched === 1 ? "" : "s"} matched to your Steam library.`);
      return { data, matched };
    } catch (error) {
      console.warn("Steam library sync failed", error);
      if (!silent) showToast("Steam playtime sync failed", String(error?.message || error));
      return null;
    }
  }

  async function loadSteamAchievements() {
    const appId = currentSteamAppId();
    if (!appId) return;
    if (els.steamLoad) els.steamLoad.disabled = true;
    if (els.steamStatus) els.steamStatus.textContent = "Loading Steam achievements…";
    try {
      const { data, items } = await fetchSteamAchievements(appId);
      const existingGame = findGame(els.editId?.value);
      if (existingGame) processSteamAchievementSync(existingGame, items, data, Date.now(), { silent: false, source: "edit-load" });
      const existing = existingGame?.goals || [];
      const existingSteam = new Set(existing.map(goal => goal.steamApiName).filter(Boolean));
      const syncRecords = existingGame ? steamSyncState(existingGame).achievements : {};
      pendingSteamAchievements = items.map(item => {
        const record = syncRecords[item.apiName] || null;
        return {
          ...item,
          selected: !item.achieved && !item.hidden && item.group === "recommended" && !existingSteam.has(item.apiName),
          queued: false,
          alreadyImported: existingSteam.has(item.apiName),
          historical: Boolean(record?.historical),
          rewarded: Boolean(record?.rewardEventId)
        };
      });
      const playerNote = data.playerAvailable === false
        ? ` · personal unlock status unavailable${data.playerError ? ` (${data.playerError})` : ""}`
        : " · personal unlock status loaded";
      if (els.steamStatus) els.steamStatus.textContent = `${pendingSteamAchievements.length} Steam achievement${pendingSteamAchievements.length === 1 ? "" : "s"} loaded${playerNote}. Already-unlocked achievements are historical; future unlocks sync automatically.`;
      renderSteamAchievements();
    } catch (error) {
      console.warn("Steam achievement import failed", error);
      if (els.steamStatus) els.steamStatus.textContent = `Steam import failed: ${String(error?.message || error)}`;
    } finally {
      if (els.steamLoad) els.steamLoad.disabled = false;
    }
  }

  function rewardLedgerHasSteamKey(key) {
    return Boolean((app.getState().rewardLedger?.events || []).some(event =>
      event?.source === "steam-achievement" && (event?.sourceId === key || event?.metadata?.steamAchievementKey === key)
    ));
  }

  function steamUnlockRewardCountToday() {
    const key = todayKey();
    return (app.getState().rewardLedger?.events || []).filter(event =>
      event?.source === "steam-achievement" && dateKeyFromValue(event?.at) === key && !event?.duplicate
    ).length;
  }

  function steamBatchMultiplier(index) {
    return [1, 0.9, 0.75, 0.6, 0.45][Math.min(4, Math.max(0, Number(index || 0)))] || 0.45;
  }

  function steamGoalForAchievement(game, apiName, remote = null) {
    const goals = Array.isArray(game?.goals) ? game.goals : [];
    const exact = goals.find(goal => goal?.source === "steam" && goal?.steamApiName === apiName) || null;
    if (exact) return exact;
    if (!remote?.name) return null;
    const target = normalizeText(remote.name);
    if (!target) return null;
    const legacyMatches = goals.filter(goal => goal?.source === "steam" && !goal?.steamApiName && normalizeText(goal.text) === target);
    if (legacyMatches.length !== 1) return null;
    legacyMatches[0].steamApiName = apiName;
    return legacyMatches[0];
  }

  function ensureSteamAchievementGoal(game, remote, syncedAt, { historical = false, rewardEventId = "" } = {}) {
    if (!game || !remote?.apiName || !remote?.achieved) return { goal: null, created: false };
    game.goals ||= [];
    let goal = steamGoalForAchievement(game, remote.apiName, remote);
    if (!goal) {
      goal = {
        id: makeId("goal"),
        text: remote.name || remote.apiName,
        description: remote.description || "",
        done: true,
        createdAt: syncedAt,
        completedAt: remote.unlockTime ? remote.unlockTime * 1000 : syncedAt,
        source: "steam",
        steamApiName: remote.apiName,
        globalPercent: remote.globalPercent,
        steamGroup: remote.group,
        steamHidden: Boolean(remote.hidden),
        steamAutoImported: true,
        importedAlreadyUnlocked: Boolean(historical),
        rewardEventId: historical ? `steam-imported-legacy:${game.steamAppId}:${remote.apiName}` : (rewardEventId || null)
      };
      game.goals.push(goal);
      return { goal, created: true };
    }
    goal.text = remote.name || goal.text || remote.apiName;
    if (remote.description) goal.description = remote.description;
    goal.globalPercent = remote.globalPercent;
    goal.steamGroup = remote.group;
    goal.steamHidden = Boolean(remote.hidden);
    goal.steamApiName = remote.apiName;
    markSteamGoalComplete(game, goal, remote, syncedAt, { historical, rewardEventId });
    return { goal, created: false };
  }

  function markSteamGoalComplete(game, goal, remote, syncedAt, { historical = false, rewardEventId = "" } = {}) {
    if (!goal) return;
    goal.done = true;
    goal.completedAt = remote.unlockTime ? remote.unlockTime * 1000 : syncedAt;
    goal.importedAlreadyUnlocked = Boolean(historical || goal.importedAlreadyUnlocked);
    if (historical) goal.rewardEventId ||= `steam-imported-legacy:${game.steamAppId}:${goal.steamApiName}`;
    if (rewardEventId) goal.rewardEventId = rewardEventId;
  }

  function awardSteamUnlock(game, remote, goal, batchIndex) {
    const key = steamAchievementKey(game, remote.apiName);
    if (!key || rewardLedgerHasSteamKey(key)) return null;
    if (goal?.rewardEventId && !String(goal.rewardEventId).startsWith("steam-imported-legacy:")) return null;
    const role = ROLES[game.role] || ROLES.fun;
    const capability = game.role === "social"
      ? "social"
      : game.role === "japanese"
        ? "japanese"
        : game.role === "challenge"
          ? "confidence"
          : "wellbeing";
    const selectedGoal = Boolean(goal && !goal.steamAutoImported);
    const batchMultiplier = steamBatchMultiplier(batchIndex);
    const rarity = steamRarity(remote.globalPercent);
    const multiplier = batchMultiplier * rarity.multiplier;
    const base = selectedGoal
      ? { xp: 6, realmXP: 6, statXP: 4, coins: 30, storyEnergyBase: 0.8 }
      : { xp: 4, realmXP: 4, statXP: 3, coins: 15, storyEnergyBase: 0.4 };
    const reward = app.awardActivity?.({
      source: "steam-achievement",
      sourceId: key,
      label: `${game.title}: ${remote.name}`,
      realm: role.realm,
      capability,
      xp: Math.max(1, Math.round(base.xp * multiplier)),
      realmXP: Math.max(1, Math.round(base.realmXP * multiplier)),
      statXP: Math.max(1, Math.round(base.statXP * multiplier)),
      coins: Math.max(1, Math.round(base.coins * multiplier)),
      storyEnergyBase: Number((base.storyEnergyBase * multiplier).toFixed(2)),
      progressionRelevant: true,
      metadata: {
        steamAchievement: true,
        steamAchievementKey: key,
        steamAppId: String(game.steamAppId || ""),
        steamApiName: remote.apiName,
        steamSelectedGoal: selectedGoal,
        steamGlobalPercent: remote.globalPercent,
        steamUnlockTime: remote.unlockTime || 0,
        steamBatchMultiplier: batchMultiplier,
        steamRarityLabel: rarity.label,
        steamRarityMultiplier: rarity.multiplier
      }
    }) || null;
    return reward;
  }

  function processSteamAchievementSync(game, steamItems, data, syncedAt = Date.now(), { silent = true, source = "sync" } = {}) {
    if (!game?.steamAppId || !Array.isArray(steamItems)) return { changed: false, baseline: false, unlocked: [], historicalImported: 0, matchedGoals: 0, returned: 0 };
    const sync = steamSyncState(game);
    const playerAvailable = data?.playerAvailable === true;
    sync.playerAvailable = playerAvailable;
    sync.playerError = playerAvailable ? "" : String(data?.playerError || "").trim();
    sync.workerProtocolVersion = Math.max(0, Number(data?.workerProtocolVersion || data?.protocolVersion || 0));
    sync.lastSyncAt = syncedAt;
    sync.total = steamItems.length;
    sync.lastReturned = steamItems.length;
    if (!playerAvailable) {
      game.lastSteamSyncAt = syncedAt;
      sync.lastMatchedGoals = 0;
      sync.lastHistoricalImported = 0;
      persist(`steam-sync-${source}`, { render: false });
      if (!silent) {
        const detail = sync.playerError || "The Worker returned achievement metadata, but no personal unlock state. Check Steam game-details privacy and SteamID64.";
        showToast("Steam unlock state unavailable", `${game.title} · ${detail}`);
      }
      return { changed: true, baseline: false, unlocked: [], unavailable: true, playerError: sync.playerError, historicalImported: 0, matchedGoals: 0, returned: steamItems.length };
    }

    // V0.31.4t could create a metadata-only baseline because the original Worker did not
    // explicitly advertise personal unlock support. The first confirmed Worker-v2 player
    // response must therefore become a fresh, reward-free personal baseline. This avoids
    // misclassifying years of old achievements as brand-new unlocks.
    const isBaseline = !Number(sync.baselineAt || 0) || !Number(sync.personalBaselineVerifiedAt || 0);
    let changed = false;
    const newUnlocks = [];
    let batchIndex = steamUnlockRewardCountToday();
    let historicalImported = 0;
    let matchedGoals = 0;

    for (const remote of steamItems) {
      const prior = sync.achievements[remote.apiName] || null;
      let goal = steamGoalForAchievement(game, remote.apiName, remote);
      if (goal) matchedGoals += 1;
      const key = steamAchievementKey(game, remote.apiName);
      const unlockedAtMs = remote.unlockTime ? remote.unlockTime * 1000 : 0;

      if (isBaseline) {
        const historical = Boolean(remote.achieved);
        let rewardEventId = goal?.rewardEventId && !String(goal.rewardEventId).startsWith("steam-imported-legacy:") ? goal.rewardEventId : "";
        if (historical) {
          const ensured = ensureSteamAchievementGoal(game, remote, syncedAt, { historical: true });
          goal = ensured.goal;
          if (ensured.created) historicalImported += 1;
          if (goal) markSteamGoalComplete(game, goal, remote, syncedAt, { historical: true });
        }
        sync.achievements[remote.apiName] = {
          achieved: Boolean(remote.achieved),
          unlockTime: remote.unlockTime || 0,
          historical,
          rewardEventId,
          name: remote.name,
          description: remote.description,
          hidden: remote.hidden,
          globalPercent: remote.globalPercent
        };
        changed = true;
        continue;
      }

      const previouslyAchieved = Boolean(prior?.achieved);
      const achievementIsNewlyUnlocked = Boolean(remote.achieved && !previouslyAchieved);
      let historical = Boolean(prior?.historical);
      let rewardEventId = String(prior?.rewardEventId || "");

      if (achievementIsNewlyUnlocked) {
        const unseenButOld = !prior && (!unlockedAtMs || unlockedAtMs <= Number(sync.baselineAt || 0));
        if (unseenButOld) {
          historical = true;
          const ensured = ensureSteamAchievementGoal(game, remote, syncedAt, { historical: true });
          goal = ensured.goal;
          if (ensured.created) historicalImported += 1;
        } else {
          const reward = rewardEventId || rewardLedgerHasSteamKey(key) ? null : awardSteamUnlock(game, remote, goal, batchIndex);
          if (reward) {
            rewardEventId = reward.eventId || "";
            batchIndex += 1;
          }
          const ensured = ensureSteamAchievementGoal(game, remote, syncedAt, { historical: false, rewardEventId });
          goal = ensured.goal;
          if (goal) markSteamGoalComplete(game, goal, remote, syncedAt, { historical: false, rewardEventId });
          newUnlocks.push({ remote, reward, selectedGoal: Boolean(goal && !goal.steamAutoImported) });
        }
        changed = true;
      } else if (remote.achieved) {
        const shouldBeHistorical = historical || Boolean(prior?.historical) || (!rewardEventId && !rewardLedgerHasSteamKey(key));
        const ensured = ensureSteamAchievementGoal(game, remote, syncedAt, { historical: shouldBeHistorical, rewardEventId });
        goal = ensured.goal;
        if (ensured.created && shouldBeHistorical) historicalImported += 1;
        if (goal && !goal.done) markSteamGoalComplete(game, goal, remote, syncedAt, { historical: shouldBeHistorical, rewardEventId });
        historical = shouldBeHistorical;
        if (ensured.created || (goal && !goal.done)) changed = true;
      }

      sync.achievements[remote.apiName] = {
        achieved: Boolean(previouslyAchieved || remote.achieved),
        unlockTime: remote.achieved ? (remote.unlockTime || prior?.unlockTime || 0) : (prior?.unlockTime || 0),
        historical,
        rewardEventId,
        name: remote.name,
        description: remote.description,
        hidden: remote.hidden,
        globalPercent: remote.globalPercent
      };
    }

    if (isBaseline) {
      sync.baselineAt = syncedAt;
      sync.personalBaselineVerifiedAt = syncedAt;
      changed = true;
    }
    sync.reconciliationVersion = 2;
    sync.unlocked = steamItems.filter(item => item.achieved).length;
    sync.lastMatchedGoals = matchedGoals;
    sync.lastHistoricalImported = historicalImported;
    game.lastSteamSyncAt = syncedAt;
    game.updatedAt = Math.max(Number(game.updatedAt || 0), syncedAt);
    persist(`steam-achievement-sync-${source}`, { render: false });

    if (!silent) {
      if (!steamItems.length) {
        showToast("Steam returned no achievements", `${game.title} · connection works, but this game returned 0 achievements. Check the App ID and Steam privacy/API availability.`);
      } else if (isBaseline) {
        showToast("Steam baseline saved ✓", `${game.title} · ${sync.unlocked}/${sync.total} already unlocked · ${historicalImported} added to Life RPG as Historical · no retro rewards.`);
      } else if (newUnlocks.length) {
        const totals = newUnlocks.reduce((sum, item) => {
          sum.xp += Number(item.reward?.xp || 0);
          sum.coins += Number(item.reward?.coins || 0);
          sum.storyEnergy += Number(item.reward?.storyEnergy || 0);
          return sum;
        }, { xp: 0, coins: 0, storyEnergy: 0 });
        const repaired = historicalImported ? ` · ${historicalImported} older unlock${historicalImported === 1 ? "" : "s"} reconciled` : "";
        showToast(`${newUnlocks.length} new Steam achievement${newUnlocks.length === 1 ? "" : "s"} 🏆`, `${game.title} · +${totals.xp} XP · +${app.formatEnergy?.(totals.storyEnergy) ?? totals.storyEnergy} 🔥 · +${totals.coins} 🪙${repaired}`);
      } else if (historicalImported) {
        showToast("Steam history reconciled ✓", `${game.title} · ${sync.unlocked}/${sync.total} unlocked on Steam · ${historicalImported} historical achievement${historicalImported === 1 ? "" : "s"} added · 0 retro rewards.`);
      } else {
        showToast("Steam is up to date ✓", `${game.title} · ${sync.unlocked}/${sync.total} achievements unlocked · ${matchedGoals} already represented in Life RPG.`);
      }
    }
    return { changed, baseline: isBaseline, unlocked: newUnlocks, historicalImported, matchedGoals, returned: steamItems.length };
  }

  async function syncSteamGameById(gameId, { force = false, silent = false, reason = "manual", includeLibrary = true } = {}) {
    const game = findGame(gameId);
    if (!game?.steamAppId) return null;
    const settings = steamSettings();
    if (!steamConnectionReady()) {
      if (!silent) {
        showToast("Steam sync needs setup", "Add the Worker URL and your 17-digit SteamID64 first.");
        openSteamSettingsPanel({ focusFirstMissing: true });
      }
      return null;
    }
    const sync = steamSyncState(game);
    if (!force && sync.lastSyncAt && Date.now() - Number(sync.lastSyncAt) < STEAM_AUTO_SYNC_STALE_MS) return null;
    if (steamSyncInFlight.has(game.id)) return steamSyncInFlight.get(game.id);

    const task = (async () => {
      renderBoard();
      try {
        if (includeLibrary) await syncSteamLibrary({ appId: game.steamAppId, silent: true });
        const { data, items } = await fetchSteamAchievements(game.steamAppId);
        const result = processSteamAchievementSync(game, items, data, Date.now(), { silent, source: reason });
        render();
        return result;
      } catch (error) {
        console.warn("Steam sync failed", game.title, error);
        if (!silent) showToast("Steam sync failed", `${game.title} · ${String(error?.message || error)}`);
        return null;
      } finally {
        steamSyncInFlight.delete(game.id);
        renderBoard();
      }
    })();
    steamSyncInFlight.set(game.id, task);
    return task;
  }

  function scheduleSteamAutoSync(reason = "auto", delay = 600) {
    if (steamAutoSyncTimer) window.clearTimeout(steamAutoSyncTimer);
    steamAutoSyncTimer = window.setTimeout(() => {
      steamAutoSyncTimer = null;
      autoSyncSteamGames(reason);
    }, Math.max(0, Number(delay || 0)));
  }

  async function autoSyncSteamGames(reason = "auto") {
    const settings = steamSettings();
    if (!settings.workerUrl || !settings.steamId || !navigator.onLine) return;
    const now = Date.now();
    const games = model().items
      .filter(game => game.steamAppId && (!game.steamAchievementSync?.lastSyncAt || now - Number(game.steamAchievementSync.lastSyncAt) >= STEAM_AUTO_SYNC_STALE_MS))
      .sort((a, b) => Math.max(effectiveGameLastPlayedAt(b), Number(b.updatedAt || 0)) - Math.max(effectiveGameLastPlayedAt(a), Number(a.updatedAt || 0)));
    if (games.length) await syncSteamLibrary({ silent: true });
    for (const game of games) {
      await syncSteamGameById(game.id, { force: false, silent: true, reason, includeLibrary: false });
    }
  }

  function steamSyncMarkup(game) {
    const sync = steamSyncState(game);
    const configured = Boolean(steamSettings().workerUrl && steamSettings().steamId);
    const progress = sync.total > 0 ? `${Math.max(0, Number(sync.unlocked || 0))}/${Math.max(0, Number(sync.total || 0))} achievements` : "No Steam baseline yet";
    const represented = (game.goals || []).filter(goal => goal?.source === "steam" && goal?.done).length;
    const steamContext = Number(game.steamPlaytimeMinutes || 0) > 0 ? `Steam ${formatDuration(game.steamPlaytimeMinutes)} total${game.steamLastPlayedAt ? ` · played ${humanAgo(game.steamLastPlayedAt)}` : ""}` : "";
    const freshness = sync.lastSyncAt ? `Last synced ${humanAgoWithTime(sync.lastSyncAt)}` : configured ? "Ready to create your baseline" : "Add Worker URL + SteamID64 in Settings";
    const unavailable = sync.playerAvailable === false
      ? ` · personal unlock status unavailable${sync.workerProtocolVersion < 2 ? " · Worker update required" : ""}`
      : represented ? ` · ${represented} completed in Life RPG` : "";
    return `<div class="game-steam-sync-v314t"><span class="game-steam-sync-icon-v314t">🏆</span><span><strong>${esc(progress)}</strong><small>${esc(freshness + unavailable)}</small>${steamContext ? `<small>${esc(steamContext)}</small>` : ""}</span></div>`;
  }

  function humanAgoWithTime(value) {
    const ms = Date.now() - Number(value || 0);
    if (!Number.isFinite(ms) || ms < 0) return "just now";
    if (ms < 60_000) return "just now";
    if (ms < 3_600_000) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
    if (ms < 86_400_000) return `${Math.max(1, Math.floor(ms / 3_600_000))}h ago`;
    return humanAgo(value);
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
    els.steamSelectAll?.classList.toggle("hidden", !has);
    els.steamSelectRecommended?.classList.toggle("hidden", !has);
    els.steamClearSelection?.classList.toggle("hidden", !has);
    els.steamHiddenLabel?.classList.toggle("hidden", !has || !pendingSteamAchievements.some(item => item.hidden));
    const includeHidden = Boolean(els.steamIncludeHidden?.checked);
    const visible = pendingSteamAchievements.filter(item => includeHidden || !item.hidden);
    els.steamAchievementList.innerHTML = visible.map(item => {
      const actualIndex = pendingSteamAchievements.indexOf(item);
      const chosen = Boolean(item.selected || item.queued);
      const badge = item.alreadyImported ? "Imported" : item.historical ? "Historical · already unlocked" : item.rewarded ? "Synced & rewarded" : item.achieved ? "Already unlocked" : item.group === "recommended" ? "Recommended" : item.group === "challenge" ? "Challenge / grind" : "Optional";
      const rarityMeta = steamRarity(item.globalPercent);
      const rarity = item.globalPercent == null ? rarityMeta.label : `${rarityMeta.label} · ${formatNumber(item.globalPercent)}% of players`;
      const displayName = steamSafeName(item);
      const description = steamSafeDescription(item) || (item.hidden ? "Hidden Steam achievement" : "No description supplied by Steam.");
      return `<button type="button" class="game-steam-achievement-v312 ${chosen ? "selected" : ""} ${item.achieved ? "achieved" : ""} ${item.alreadyImported ? "imported" : ""} ${steamSpoilerProtected(item) ? "spoiler-protected" : ""}" data-game-steam-achievement="${actualIndex}" aria-pressed="${chosen ? "true" : "false"}" ${item.alreadyImported ? "disabled" : ""}>
        <span class="game-steam-achievement-checkbox-v312" aria-hidden="true">${chosen ? "✓" : ""}</span>
        <span class="game-steam-achievement-mark-v312">${item.achieved ? "✓" : item.group === "recommended" ? "★" : item.group === "challenge" ? "◆" : "○"}</span>
        <span class="game-steam-achievement-copy-v312"><strong>${esc(displayName)}</strong><small>${esc(description)}</small><em>${esc([badge, rarity, chosen ? (item.queued ? "Queued" : "Selected") : ""].filter(Boolean).join(" · "))}</em></span>
      </button>`;
    }).join("") || `<p class="muted">No achievements to show with the current filter.</p>`;
    els.steamAchievementList.querySelectorAll("[data-game-steam-achievement]").forEach(button => button.addEventListener("click", () => {
      const item = pendingSteamAchievements[Number(button.dataset.gameSteamAchievement)];
      if (!item || item.alreadyImported) return;
      const wasChosen = Boolean(item.selected || item.queued);
      item.selected = !wasChosen;
      item.queued = false;
      renderSteamAchievements();
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
      safeGoalLabel: goal => goal?.source === "steam" ? steamSafeName({ ...goal, name: goal.text }) : String(goal?.text || ""),
      effectiveLastPlayedAt: effectiveGameLastPlayedAt,
      resolvedGameType,
      syncSteamGame: (gameId, options = {}) => syncSteamGameById(gameId, options),
      syncAllSteamGames: (reason = "manual-api") => autoSyncSteamGames(reason),
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
