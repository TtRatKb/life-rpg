(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG achievements could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 2;
  const LEGACY_ACHIEVEMENT_COIN_CAP = 500;
  const MAX_PINNED = 3;
  const CATEGORY_META = {
    all: { label: "All", icon: "✦" },
    life: { label: "Life", icon: "🌸" },
    quests: { label: "Quests", icon: "☷" },
    habits: { label: "Habits", icon: "❀" },
    library: { label: "Library", icon: "📚" },
    games: { label: "Games", icon: "🎮" },
    adventures: { label: "Adventures", icon: "✧" },
    growth: { label: "Growth", icon: "◇" },
    story: { label: "Story", icon: "♡" }
  };

  const REALM_ICONS = {
    Work: "📎",
    Health: "🌱",
    Recovery: "🛋️",
    Home: "🏠",
    Japanese: "🌸",
    Knowledge: "📚",
    Hobbies: "🎨"
  };

  const REALM_DEFINITIONS = Object.entries(REALM_ICONS).map(([realm, icon]) => ({
    id: `realm-${slug(realm)}-3`,
    category: "growth",
    icon,
    title: `${realm} Takes Root`,
    description: `Reach ${realm} Realm Rank 3.`,
    coinReward: 75,
    progress: ctx => ({ value: ctx.realmRanks[realm] || 1, target: 3, unit: "Rank" }),
    test: ctx => (ctx.realmRanks[realm] || 1) >= 3
  }));

  const DEFINITIONS = [
    {
      id: "life-first-action",
      category: "life",
      icon: "✦",
      title: "First Step",
      description: "Log your first meaningful real-life action.",
      coinReward: 25,
      profileTitle: "Adventurer",
      progress: ctx => ({ value: ctx.actionCount, target: 1, unit: "action" }),
      test: ctx => ctx.actionCount >= 1
    },
    {
      id: "life-three-days",
      category: "life",
      icon: "☀",
      title: "Three Adventure Days",
      description: "Make real-life progress on three different days.",
      coinReward: 30,
      progress: ctx => ({ value: ctx.adventureDays, target: 3, unit: "days" }),
      test: ctx => ctx.adventureDays >= 3
    },
    {
      id: "life-seven-days",
      category: "life",
      icon: "🌸",
      title: "A Week With Yourself",
      description: "Make real-life progress on seven different days.",
      coinReward: 50,
      profileTitle: "In Motion",
      progress: ctx => ({ value: ctx.adventureDays, target: 7, unit: "days" }),
      test: ctx => ctx.adventureDays >= 7
    },
    {
      id: "life-welcome-back",
      category: "life",
      icon: "↻",
      title: "Welcome Back",
      description: "Return to Life RPG after a break of at least seven days.",
      coinReward: 50,
      profileTitle: "Returned",
      progress: ctx => ({ value: ctx.hasComeback ? 1 : 0, target: 1, unit: "return" }),
      test: ctx => ctx.hasComeback
    },
    {
      id: "life-briefings-seven",
      category: "life",
      icon: "☕",
      title: "Read the Room",
      description: "Complete seven Daily Briefings.",
      coinReward: 50,
      progress: ctx => ({ value: ctx.briefingCount, target: 7, unit: "briefings" }),
      test: ctx => ctx.briefingCount >= 7
    },

    {
      id: "life-checkins-fourteen",
      category: "life",
      icon: "🌅",
      title: "Morning Rhythm",
      description: "Complete the Daily Check-in on fourteen days.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.briefingCount, target: 14, unit: "check-ins" }),
      test: ctx => ctx.briefingCount >= 14
    },
    {
      id: "life-checkins-thirty",
      category: "life",
      icon: "☀",
      title: "A Month of Showing Up",
      description: "Complete the Daily Check-in on thirty days.",
      coinReward: 150,
      progress: ctx => ({ value: ctx.briefingCount, target: 30, unit: "check-ins" }),
      test: ctx => ctx.briefingCount >= 30
    },
    {
      id: "life-reflections-seven",
      category: "life",
      icon: "🌸",
      title: "Seven Pages In",
      description: "Save a Journal reflection on seven different days.",
      coinReward: 50,
      progress: ctx => ({ value: ctx.reflectionDays, target: 7, unit: "days" }),
      test: ctx => ctx.reflectionDays >= 7
    },
    {
      id: "life-journal-chars-1000",
      category: "life",
      icon: "✎",
      title: "A Thousand Words-ish",
      description: "Write 1,000 characters across your Journal reflections.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.journalCharacters, target: 1000, unit: "characters" }),
      test: ctx => ctx.journalCharacters >= 1000
    },
    {
      id: "life-journal-chars-5000",
      category: "life",
      icon: "📓",
      title: "Margins Filling Up",
      description: "Write 5,000 characters across your Journal reflections.",
      coinReward: 150,
      progress: ctx => ({ value: ctx.journalCharacters, target: 5000, unit: "characters" }),
      test: ctx => ctx.journalCharacters >= 5000
    },
    {
      id: "life-journal-chars-25000",
      category: "life",
      icon: "🌸",
      title: "A Journal of My Own",
      description: "Write 25,000 characters across your Journal reflections.",
      coinReward: 350,
      profileTitle: "Journal Keeper",
      progress: ctx => ({ value: ctx.journalCharacters, target: 25000, unit: "characters" }),
      test: ctx => ctx.journalCharacters >= 25000
    },
    {
      id: "life-journal-chars-100000",
      category: "life",
      icon: "📚",
      title: "Volume One",
      description: "Write 100,000 characters across your Journal reflections.",
      coinReward: 750,
      profileTitle: "Chronicler",
      progress: ctx => ({ value: ctx.journalCharacters, target: 100000, unit: "characters" }),
      test: ctx => ctx.journalCharacters >= 100000
    },
    {
      id: "life-focus-ten",
      category: "life",
      icon: "◷",
      title: "Deep Focus",
      description: "Complete ten intentional Focus sessions.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.focusSessions, target: 10, unit: "sessions" }),
      test: ctx => ctx.focusSessions >= 10
    },

    {
      id: "quest-first",
      category: "quests",
      icon: "☷",
      title: "Quest Cleared",
      description: "Complete your first Quest.",
      coinReward: 25,
      progress: ctx => ({ value: ctx.questClears, target: 1, unit: "clear" }),
      test: ctx => ctx.questClears >= 1
    },
    {
      id: "quest-ten",
      category: "quests",
      icon: "⚔",
      title: "Ten Clears",
      description: "Complete ten Quests.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.questClears, target: 10, unit: "clears" }),
      test: ctx => ctx.questClears >= 10
    },
    {
      id: "quest-fifty",
      category: "quests",
      icon: "✦",
      title: "Seasoned Adventurer",
      description: "Complete fifty Quests.",
      coinReward: 200,
      profileTitle: "Questkeeper",
      progress: ctx => ({ value: ctx.questClears, target: 50, unit: "clears" }),
      test: ctx => ctx.questClears >= 50
    },

    {
      id: "habit-first",
      category: "habits",
      icon: "❀",
      title: "Small Things Count",
      description: "Complete your first Habit check-in.",
      coinReward: 25,
      progress: ctx => ({ value: ctx.habitCompletions, target: 1, unit: "check-in" }),
      test: ctx => ctx.habitCompletions >= 1
    },
    {
      id: "habit-streak-seven",
      category: "habits",
      icon: "🔥",
      title: "Steady Bloom",
      description: "Reach a seven-period Habit streak.",
      coinReward: 50,
      profileTitle: "Steady Bloom",
      progress: ctx => ({ value: ctx.bestHabitStreak, target: 7, unit: "periods" }),
      test: ctx => ctx.bestHabitStreak >= 7
    },
    {
      id: "habit-fifty",
      category: "habits",
      icon: "🌱",
      title: "Quiet Consistency",
      description: "Log fifty Habit completions in total.",
      coinReward: 100,
      progress: ctx => ({ value: ctx.habitCompletions, target: 50, unit: "check-ins" }),
      test: ctx => ctx.habitCompletions >= 50
    },

    {
      id: "library-first-finish",
      category: "library",
      icon: "📖",
      title: "One More Chapter",
      description: "Finish your first book in the Library.",
      coinReward: 50,
      profileTitle: "Page Turner",
      progress: ctx => ({ value: ctx.finishedBooks, target: 1, unit: "book" }),
      test: ctx => ctx.finishedBooks >= 1
    },
    {
      id: "library-five-finish",
      category: "library",
      icon: "📚",
      title: "Five Spines Down",
      description: "Finish five books.",
      coinReward: 125,
      profileTitle: "Bookish",
      progress: ctx => ({ value: ctx.finishedBooks, target: 5, unit: "books" }),
      test: ctx => ctx.finishedBooks >= 5
    },
    {
      id: "library-pages-500",
      category: "library",
      icon: "✦",
      title: "Five Hundred Pages",
      description: "Log 500 pages of reading through the Library.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.pagesRead, target: 500, unit: "pages" }),
      test: ctx => ctx.pagesRead >= 500
    },
    {
      id: "library-pages-2000",
      category: "library",
      icon: "🌸",
      title: "Lost in the Stacks",
      description: "Log 2,000 pages of reading through the Library.",
      coinReward: 200,
      profileTitle: "Library Dweller",
      progress: ctx => ({ value: ctx.pagesRead, target: 2000, unit: "pages" }),
      test: ctx => ctx.pagesRead >= 2000
    },

    {
      id: "games-first-session",
      category: "games",
      icon: "🎮",
      title: "Press Start",
      description: "Log your first game session.",
      coinReward: 25,
      progress: ctx => ({ value: ctx.gameSessions, target: 1, unit: "session" }),
      test: ctx => ctx.gameSessions >= 1
    },
    {
      id: "games-first-goal",
      category: "games",
      icon: "✓",
      title: "Personal Victory",
      description: "Complete your first personal game goal.",
      coinReward: 40,
      profileTitle: "Goal Getter",
      progress: ctx => ({ value: ctx.gameGoalsDone, target: 1, unit: "goal" }),
      test: ctx => ctx.gameGoalsDone >= 1
    },
    {
      id: "games-first-finish",
      category: "games",
      icon: "🏁",
      title: "Credits Roll",
      description: "Mark your first game Finished.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.finishedGames, target: 1, unit: "game" }),
      test: ctx => ctx.finishedGames >= 1
    },
    {
      id: "games-ten-hours",
      category: "games",
      icon: "∞",
      title: "Play Is Progress",
      description: "Log ten hours of intentional game time.",
      coinReward: 75,
      progress: ctx => ({ value: Math.floor(ctx.gameMinutes / 60), target: 10, unit: "hours" }),
      test: ctx => ctx.gameMinutes >= 600
    },

    {
      id: "adventure-first-session",
      category: "adventures",
      icon: "✧",
      title: "Side Quest Energy",
      description: "Log progress on your first Side Adventure.",
      coinReward: 25,
      progress: ctx => ({ value: ctx.adventureSessions, target: 1, unit: "session" }),
      test: ctx => ctx.adventureSessions >= 1
    },
    {
      id: "adventure-notes-1000",
      category: "adventures",
      icon: "🗂️",
      title: "Project Memory",
      description: "Save 1,000 characters of useful notes and decisions across Adventure workspaces.",
      coinReward: 100,
      progress: ctx => ({ value: ctx.adventureOutputCharacters, target: 1000, unit: "characters" }),
      test: ctx => ctx.adventureOutputCharacters >= 1000
    },
    {
      id: "adventure-references-10",
      category: "adventures",
      icon: "🔗",
      title: "Reference Binder",
      description: "Save ten useful project references, images or material links.",
      coinReward: 125,
      progress: ctx => ({ value: ctx.adventureReferences, target: 10, unit: "references" }),
      test: ctx => ctx.adventureReferences >= 10
    },
    {
      id: "adventure-first-finish",
      category: "adventures",
      icon: "✨",
      title: "Made It Real",
      description: "Finish your first Side Adventure or project.",
      coinReward: 100,
      profileTitle: "Maker",
      progress: ctx => ({ value: ctx.finishedAdventures, target: 1, unit: "project" }),
      test: ctx => ctx.finishedAdventures >= 1
    },
    {
      id: "adventure-clear-floor",
      category: "adventures",
      icon: "📦",
      title: "Clear the Floor",
      description: "Finish a project that was taking up physical space.",
      coinReward: 100,
      profileTitle: "Space Reclaimed",
      progress: ctx => ({ value: ctx.finishedSpaceProjects, target: 1, unit: "project" }),
      test: ctx => ctx.finishedSpaceProjects >= 1
    },

    {
      id: "knowledge-sudoku-five",
      category: "growth",
      icon: "🧩",
      title: "Pattern Seeker I",
      description: "Solve five Sudokus inside Life RPG.",
      coinReward: 75,
      progress: ctx => ({ value: ctx.sudokuSolved, target: 5, unit: "Sudokus" }),
      test: ctx => ctx.sudokuSolved >= 5
    },
    {
      id: "knowledge-sudoku-twenty-five",
      category: "growth",
      icon: "◇",
      title: "Pattern Seeker II",
      description: "Solve twenty-five Sudokus inside Life RPG.",
      coinReward: 200,
      progress: ctx => ({ value: ctx.sudokuSolved, target: 25, unit: "Sudokus" }),
      test: ctx => ctx.sudokuSolved >= 25
    },

    {
      id: "growth-character-five",
      category: "growth",
      icon: "✦",
      title: "Character Level 5",
      description: "Reach Character Level 5.",
      coinReward: 100,
      progress: ctx => ({ value: ctx.characterLevel, target: 5, unit: "Level" }),
      test: ctx => ctx.characterLevel >= 5
    },
    {
      id: "growth-capability-two",
      category: "growth",
      icon: "◇",
      title: "Capability Unlocked",
      description: "Reach Level 2 in any Capability.",
      coinReward: 50,
      progress: ctx => ({ value: ctx.highestCapability, target: 2, unit: "Level" }),
      test: ctx => ctx.highestCapability >= 2
    },
    {
      id: "growth-capability-four",
      category: "growth",
      icon: "✧",
      title: "Skilled",
      description: "Reach Level 4 in any Capability.",
      coinReward: 125,
      profileTitle: "Skilled",
      progress: ctx => ({ value: ctx.highestCapability, target: 4, unit: "Level" }),
      test: ctx => ctx.highestCapability >= 4
    },
    ...REALM_DEFINITIONS,
    {
      id: "growth-realm-five",
      category: "growth",
      icon: "🌿",
      title: "Deep Roots",
      description: "Reach Realm Rank 5 in any life domain.",
      coinReward: 200,
      profileTitle: "Rooted",
      progress: ctx => ({ value: ctx.highestRealmRank, target: 5, unit: "Rank" }),
      test: ctx => ctx.highestRealmRank >= 5
    },

    {
      id: "story-first-chapter",
      category: "story",
      icon: "♡",
      title: "The Story Moves",
      description: "Complete a Main Story chapter.",
      coinReward: 40,
      secret: true,
      progress: ctx => ({ value: ctx.storyChapters, target: 1, unit: "chapter" }),
      test: ctx => ctx.storyChapters >= 1
    },
    {
      id: "story-three-chapters",
      category: "story",
      icon: "✿",
      title: "Storybound",
      description: "Complete three Main Story chapters.",
      coinReward: 100,
      profileTitle: "Storybound",
      secret: true,
      progress: ctx => ({ value: ctx.storyChapters, target: 3, unit: "chapters" }),
      test: ctx => ctx.storyChapters >= 3
    },
    {
      id: "story-first-hangout",
      category: "story",
      icon: "☕",
      title: "Time Freely Given",
      description: "Complete a free Hang Out scene.",
      coinReward: 50,
      secret: true,
      progress: ctx => ({ value: ctx.hangoutsCompleted, target: 1, unit: "hangout" }),
      test: ctx => ctx.hangoutsCompleted >= 1
    },
    {
      id: "story-first-reply",
      category: "story",
      icon: "✉",
      title: "Your Reply Matters",
      description: "Send your first persistent message reply.",
      coinReward: 40,
      secret: true,
      progress: ctx => ({ value: ctx.messageReplies, target: 1, unit: "reply" }),
      test: ctx => ctx.messageReplies >= 1
    }
  ];

  const BY_ID = new Map(DEFINITIONS.map(def => [def.id, def]));

  const els = {
    filters: byId("achievementFilters"),
    grid: byId("achievementGrid"),
    empty: byId("achievementEmpty"),
    unlocked: byId("achievementUnlockedCount"),
    total: byId("achievementTotalCount"),
    secret: byId("achievementSecretCount"),
    latest: byId("achievementLatestUnlock"),
    titleSelect: byId("achievementTitleSelect"),
    titleHint: byId("achievementTitleHint"),
    showcase: byId("growthAchievementShowcase"),
    showcaseCount: byId("growthAchievementCount"),
    dashboardTracker: byId("dashboardAchievementTracker"),
    dashboardTrackerEmpty: byId("dashboardAchievementTrackerEmpty"),
    dashboardTitle: byId("dashboardPlayerTitleLine"),
    growthTitle: byId("growthPlayerTitleLine"),
    toast: byId("achievementToast"),
    toastIcon: byId("achievementToastIcon"),
    toastTitle: byId("achievementToastTitle"),
    toastDetail: byId("achievementToastDetail")
  };

  let activeCategory = "all";
  let scanning = false;
  let toastTimer = null;
  let toastQueue = [];

  init();

  function init() {
    const state = app.getState();
    const hadAchievementState = Boolean(state.achievements && typeof state.achievements === "object");
    const changed = ensureState();
    bindEvents();
    migrateAchievementCoinsV306();
    scanAchievements({ retroactive: !hadAchievementState, silent: !hadAchievementState });
    render();
    if (changed && hadAchievementState) app.saveState({ source: "achievements-migrate" });

    window.addEventListener("life-rpg:state-saved", event => {
      const source = event?.detail?.source || "";
      if (scanning || source === "achievements-unlock" || source === "achievements-ui" || source === "achievements-coin-migrate") return;
      const restoredWithoutAchievements = ["cloud", "import", "replace"].includes(source) && !app.getState().achievements;
      if (restoredWithoutAchievements) {
        ensureState();
        scanAchievements({ retroactive: true, silent: true });
        return;
      }
      scanAchievements({ retroactive: false, silent: false });
    });

    window.addEventListener("life-rpg:render", () => render());
  }

  function bindEvents() {
    els.filters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-achievement-filter]");
      if (!button) return;
      const next = button.dataset.achievementFilter;
      if (!CATEGORY_META[next]) return;
      activeCategory = next;
      render();
    });

    els.grid?.addEventListener("click", event => {
      const pin = event.target.closest?.("[data-achievement-pin]");
      if (pin) {
        togglePinned(pin.dataset.achievementPin);
        return;
      }
      const equip = event.target.closest?.("[data-achievement-equip]");
      if (equip) {
        equipTitle(equip.dataset.achievementEquip);
      }
    });

    els.showcase?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-achievement-open]");
      if (button) app.showView("achievements");
    });

    els.dashboardTracker?.addEventListener("click", event => {
      const unpin = event.target.closest?.("[data-achievement-unpin]");
      if (unpin) { togglePinned(unpin.dataset.achievementUnpin); return; }
      const button = event.target.closest?.("[data-achievement-open]");
      if (button) app.showView("achievements");
    });

    els.titleSelect?.addEventListener("change", () => {
      const id = els.titleSelect.value || null;
      const state = achievementState();
      state.equippedTitleId = id && isUnlocked(id) && BY_ID.get(id)?.profileTitle ? id : null;
      persist("achievements-ui", { scan: false });
      render();
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.achievements || typeof root.achievements !== "object" || Array.isArray(root.achievements)) {
      root.achievements = { schemaVersion: SCHEMA, unlocked: {}, pinned: [], coinRewarded: {}, migrations: {}, equippedTitleId: null, createdAt: Date.now() };
      changed = true;
    }
    const state = root.achievements;
    if (Number(state.schemaVersion || 0) < SCHEMA) { state.schemaVersion = SCHEMA; changed = true; }
    if (!state.unlocked || typeof state.unlocked !== "object" || Array.isArray(state.unlocked)) { state.unlocked = {}; changed = true; }
    if (!state.coinRewarded || typeof state.coinRewarded !== "object" || Array.isArray(state.coinRewarded)) { state.coinRewarded = {}; changed = true; }
    if (!state.migrations || typeof state.migrations !== "object" || Array.isArray(state.migrations)) { state.migrations = {}; changed = true; }
    if (!Array.isArray(state.pinned)) { state.pinned = []; changed = true; }
    const nextPinned = state.pinned.filter((id, index, ids) => {
      const def = BY_ID.get(id);
      return def && (!def.secret || Boolean(state.unlocked[id])) && ids.indexOf(id) === index;
    }).slice(0, MAX_PINNED);
    if (JSON.stringify(nextPinned) !== JSON.stringify(state.pinned)) { state.pinned = nextPinned; changed = true; }
    if (state.equippedTitleId && (!BY_ID.get(state.equippedTitleId)?.profileTitle || !state.unlocked[state.equippedTitleId])) {
      state.equippedTitleId = null;
      changed = true;
    }
    return changed;
  }

  function migrateAchievementCoinsV306() {
    const state = achievementState();
    if (state.migrations?.coinRewardsV306) return 0;
    const ctx = buildContext();
    const eligible = DEFINITIONS.filter(def => {
      if (state.coinRewarded[def.id]) return false;
      if (state.unlocked[def.id]) return true;
      try { return Boolean(def.test(ctx)); } catch { return false; }
    });
    const requested = eligible.reduce((sum, def) => sum + Math.max(0, Number(def.coinReward || 0)), 0);
    const coins = Math.min(LEGACY_ACHIEVEMENT_COIN_CAP, requested);
    eligible.forEach(def => { state.coinRewarded[def.id] = true; });
    state.migrations.coinRewardsV306 = { at: new Date().toISOString(), eligible: eligible.length, requested, awarded: coins };
    if (coins > 0) {
      app.awardActivity?.({
        source: "achievement-legacy",
        sourceId: "v0306",
        label: "Legacy achievement bonus",
        xp: 0, realmXP: 0, statXP: 0, coins, storyEnergyBase: 0, progressionRelevant: false,
        metadata: { achievementMigration: true, eligible: eligible.length, requested, cappedAt: LEGACY_ACHIEVEMENT_COIN_CAP }
      });
    }
    app.saveState({ source: "achievements-coin-migrate" });
    if (coins > 0) window.setTimeout(() => app.showToast?.(`🏆 Existing milestones recognized · +${coins} 🪙`), 650);
    return coins;
  }

  function achievementState() {
    ensureState();
    return app.getState().achievements;
  }

  function scanAchievements({ retroactive = false, silent = false } = {}) {
    if (scanning) return [];
    scanning = true;
    try {
      ensureState();
      const ctx = buildContext();
      const state = achievementState();
      const unlockedNow = [];
      const now = Date.now();

      for (const def of DEFINITIONS) {
        if (state.unlocked[def.id]) continue;
        let met = false;
        try { met = Boolean(def.test(ctx)); } catch { met = false; }
        if (!met) continue;
        state.unlocked[def.id] = {
          unlockedAt: now,
          retroactive: Boolean(retroactive)
        };
        let awardedCoins = 0;
        if (!state.coinRewarded[def.id]) {
          const requestedCoins = Math.max(0, Number(def.coinReward || 0));
          if (requestedCoins > 0) {
            const reward = app.awardActivity?.({
              source: "achievement",
              sourceId: def.id,
              label: `Achievement · ${def.title}`,
              xp: 0, realmXP: 0, statXP: 0, coins: requestedCoins, storyEnergyBase: 0, progressionRelevant: false,
              metadata: { achievementId: def.id, secret: Boolean(def.secret) }
            });
            awardedCoins = Number(reward?.coins || 0);
          }
          state.coinRewarded[def.id] = true;
        }
        state.unlocked[def.id].coinReward = awardedCoins;
        unlockedNow.push({ ...def, awardedCoins });
      }

      if (unlockedNow.length) {
        app.saveState({ source: "achievements-unlock" });
        render();
        if (!silent) unlockedNow.forEach(queueToast);
        else if (retroactive && app.getState().rewardLedger?.events?.length) {
          window.setTimeout(() => app.showToast?.(`${unlockedNow.length} achievement${unlockedNow.length === 1 ? "" : "s"} restored from your existing save.`), 500);
        }
      }
      return unlockedNow;
    } finally {
      scanning = false;
    }
  }

  function buildContext() {
    const root = app.getState();
    const snapshot = app.getProgressionSnapshot?.() || { characterLevel: 1, capabilities: {}, realmRanks: {} };
    const events = (root.rewardLedger?.events || []).filter(event => event && !event.duplicate && meaningfulRewardEvent(event));
    const rewardDates = [...new Set(events.map(event => dateKey(event.at)).filter(Boolean))].sort();
    const habits = root.habits || {};
    const library = root.bookLibrary || {};
    const games = root.gameLibrary || {};
    const adventures = root.sideAdventures || {};
    const story = root.story || {};
    const social = story.social || {};
    const daily = root.dailyPlanner || {};
    const journal = root.journal || {};
    const timeTracking = root.timeTracking || {};

    const capabilityLevels = Object.values(snapshot.capabilities || {}).map(Number).filter(Number.isFinite);
    const realmRanks = snapshot.realmRanks || {};
    const realmLevels = Object.values(realmRanks).map(Number).filter(Number.isFinite);
    const habitCompletions = Array.isArray(habits.completions) ? habits.completions : [];
    const books = Array.isArray(library.items) ? library.items : [];
    const bookLogs = Array.isArray(library.logs) ? library.logs : [];
    const gameItems = Array.isArray(games.items) ? games.items : [];
    const gameLogs = Array.isArray(games.logs) ? games.logs : [];
    const adventureItems = Array.isArray(adventures.items) ? adventures.items : [];
    const adventureLogs = Array.isArray(adventures.logs) ? adventures.logs : [];
    const journalEntries = journal.entries && typeof journal.entries === "object" ? Object.values(journal.entries) : [];
    const reflectionDays = journalEntries.filter(entry => entry && (String(entry.gratitude || "").trim() || String(entry.smallWin || "").trim() || String(entry.hardThing || "").trim())).length;
    const journalCharacters = journalEntries.reduce((sum, entry) => sum + ["gratitude", "smallWin", "hardThing"].reduce((inner, field) => inner + String(entry?.[field] || "").trim().length, 0), 0);
    const adventureOutputCharacters = adventureItems.reduce((sum, item) => sum + (Array.isArray(item.roadmap) ? item.roadmap.reduce((stepSum, step) => stepSum + String(step?.output?.notes || "").trim().length + String(step?.output?.decision || "").trim().length, 0) : 0) + String(item?.workspace?.notes || "").trim().length, 0);
    const adventureReferences = adventureItems.reduce((sum, item) => sum + Number(item?.workspace?.references?.length || 0) + Number(item?.workspace?.images?.length || 0) + Number(item?.workspace?.materials?.filter?.(material => material?.url)?.length || 0), 0);
    const sudokuSolved = Math.max(0, Number(root.sudoku?.stats?.solved || 0));
    const timeEntries = Array.isArray(timeTracking.entries) ? timeTracking.entries : [];
    const focusSessions = timeEntries.filter(entry => entry?.mode === "focus" && Number(entry.minutes || 0) >= Math.max(1, Number(entry.targetMinutes || 0) - 1)).length;

    return {
      actionCount: events.length,
      adventureDays: rewardDates.length,
      hasComeback: hasComebackGap(rewardDates),
      briefingCount: Object.values(daily.days || {}).filter(day => day?.checkIn).length,
      reflectionDays,
      journalCharacters,
      adventureOutputCharacters,
      adventureReferences,
      sudokuSolved,
      focusSessions,
      questClears: Array.isArray(root.completionLog) ? root.completionLog.length : 0,
      habitCompletions: habitCompletions.length,
      bestHabitStreak: habitCompletions.reduce((max, log) => Math.max(max, Number(log.streakAfter || 0)), 0),
      finishedBooks: books.filter(book => book.status === "finished").length,
      pagesRead: bookLogs.reduce((sum, log) => sum + Math.max(0, Number(log.pages || 0)), 0),
      gameSessions: gameLogs.length,
      gameMinutes: gameLogs.reduce((sum, log) => sum + Math.max(0, Number(log.minutes || 0)), 0),
      gameGoalsDone: gameItems.reduce((sum, game) => sum + (Array.isArray(game.goals) ? game.goals.filter(goal => goal.done).length : 0), 0),
      finishedGames: gameItems.filter(game => game.status === "finished").length,
      adventureSessions: adventureLogs.length,
      finishedAdventures: adventureItems.filter(item => item.status === "finished").length,
      finishedSpaceProjects: adventureItems.filter(item => item.status === "finished" && Array.isArray(item.reasonTags) && item.reasonTags.includes("takes-space")).length,
      characterLevel: Number(snapshot.characterLevel || 1),
      highestCapability: Math.max(1, ...capabilityLevels),
      realmRanks,
      highestRealmRank: Math.max(1, ...realmLevels),
      storyChapters: Array.isArray(story.completedSceneIds) ? story.completedSceneIds.length : 0,
      hangoutsCompleted: Array.isArray(social.completedHangoutIds) ? social.completedHangoutIds.length : 0,
      messageReplies: Object.keys(social.messageReplies || {}).length
    };
  }

  function meaningfulRewardEvent(event) {
    if (event?.progressionRelevant === false) return false;
    return Number(event.xp || 0) > 0 || Number(event.storyEnergy || 0) > 0 || Number(event.coins || 0) > 0 || Number(event.realmXP || 0) > 0 || Number(event.statXP || 0) > 0;
  }

  function hasComebackGap(sortedDateKeys) {
    if (sortedDateKeys.length < 2) return false;
    for (let i = 1; i < sortedDateKeys.length; i += 1) {
      const previous = dateFromKey(sortedDateKeys[i - 1]);
      const current = dateFromKey(sortedDateKeys[i]);
      const gapDays = Math.round((current - previous) / 86400000) - 1;
      if (gapDays >= 7) return true;
    }
    return false;
  }

  function dateKey(value) {
    const date = new Date(value || 0);
    if (!Number.isFinite(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(year || 1970, Math.max(0, (month || 1) - 1), day || 1);
  }

  function render() {
    ensureState();
    renderProfileTitles();
    renderSummary();
    renderFilters();
    renderGrid();
    renderShowcase();
    renderDashboardTracker();
    renderTitleControls();
  }

  function renderSummary() {
    const state = achievementState();
    const unlockedDefs = DEFINITIONS.filter(def => state.unlocked[def.id]);
    const lockedSecrets = DEFINITIONS.filter(def => def.secret && !state.unlocked[def.id]).length;
    if (els.unlocked) els.unlocked.textContent = String(unlockedDefs.length);
    if (els.total) els.total.textContent = String(DEFINITIONS.length);
    if (els.secret) els.secret.textContent = String(lockedSecrets);
    if (els.latest) {
      const latest = unlockedDefs
        .slice()
        .sort((a, b) => Number(state.unlocked[b.id]?.unlockedAt || 0) - Number(state.unlocked[a.id]?.unlockedAt || 0))[0];
      els.latest.textContent = latest ? latest.title : "Nothing yet";
    }
  }

  function renderFilters() {
    if (!els.filters) return;
    const state = achievementState();
    els.filters.innerHTML = Object.entries(CATEGORY_META).map(([key, meta]) => {
      const defs = key === "all" ? DEFINITIONS : DEFINITIONS.filter(def => def.category === key);
      const unlocked = defs.filter(def => state.unlocked[def.id]).length;
      return `<button class="achievement-filter-v21 ${activeCategory === key ? "active" : ""}" data-achievement-filter="${escAttr(key)}" type="button"><span>${meta.icon}</span><strong>${esc(meta.label)}</strong><small>${unlocked}/${defs.length}</small></button>`;
    }).join("");
  }

  function renderGrid() {
    if (!els.grid) return;
    const state = achievementState();
    const ctx = buildContext();
    const defs = DEFINITIONS
      .filter(def => activeCategory === "all" || def.category === activeCategory)
      .sort((a, b) => {
        const aUnlocked = Boolean(state.unlocked[a.id]);
        const bUnlocked = Boolean(state.unlocked[b.id]);
        if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
        if (aUnlocked && bUnlocked) return Number(state.unlocked[b.id]?.unlockedAt || 0) - Number(state.unlocked[a.id]?.unlockedAt || 0);
        return Number(Boolean(a.secret)) - Number(Boolean(b.secret)) || a.title.localeCompare(b.title);
      });

    if (els.empty) els.empty.classList.toggle("hidden", defs.length > 0);
    els.grid.innerHTML = defs.map(def => achievementCard(def, ctx, state)).join("");
  }

  function achievementCard(def, ctx, state) {
    const unlocked = Boolean(state.unlocked[def.id]);
    const secretLocked = def.secret && !unlocked;
    const pinned = state.pinned.includes(def.id);
    const equipped = state.equippedTitleId === def.id;
    const progress = safeProgress(def, ctx);
    const percent = progress && progress.target > 0 ? Math.min(100, Math.max(0, progress.value / progress.target * 100)) : 0;
    const category = CATEGORY_META[def.category] || CATEGORY_META.life;
    const unlockedAt = state.unlocked[def.id]?.unlockedAt;

    if (secretLocked) {
      return `
        <article class="achievement-card-v21 locked secret">
          <div class="achievement-card-seal-v21">?</div>
          <div class="achievement-card-copy-v21">
            <div class="achievement-card-meta-v21"><span>SECRET ACHIEVEMENT</span><b>${category.icon}</b></div>
            <h3>???</h3>
            <p>Some moments only reveal themselves when they happen.</p>
            <div class="achievement-secret-line-v21"><span>✦</span> Hidden condition</div>
          </div>
        </article>`;
    }

    return `
      <article class="achievement-card-v21 ${unlocked ? "unlocked" : "locked"} ${equipped ? "equipped" : ""}">
        <div class="achievement-card-seal-v21">${def.icon}</div>
        <div class="achievement-card-copy-v21">
          <div class="achievement-card-meta-v21"><span>${esc(category.label).toUpperCase()}</span>${unlocked ? `<b>UNLOCKED${unlockedAt ? ` · ${esc(shortDate(unlockedAt))}` : ""}</b>` : `<b>IN PROGRESS</b>`}</div>
          <h3>${esc(def.title)}</h3>
          <p>${esc(def.description)}</p>
          ${def.profileTitle ? `<div class="achievement-unlock-reward-v21"><span>✧</span><div><small>PROFILE TITLE</small><strong>${esc(def.profileTitle)}</strong></div></div>` : ""}
          ${Number(def.coinReward || 0) > 0 ? `<div class="achievement-coin-reward-v306"><span>🪙</span><div><small>${unlocked ? "EARNED" : "REWARD"}</small><strong>${formatNumber(def.coinReward)} · ${esc(app.formatCoinValue?.(def.coinReward) || "")}</strong></div></div>` : ""}
          ${!unlocked && progress ? `
            <div class="achievement-progress-v21">
              <div><span>${esc(progress.unit || "Progress")}</span><strong>${formatNumber(progress.value)} / ${formatNumber(progress.target)}</strong></div>
              <div class="progress"><span style="width:${percent}%"></span></div>
            </div>` : ""}
          <div class="achievement-actions-v21">
            <button class="secondary-button ${pinned ? "active" : ""}" data-achievement-pin="${escAttr(def.id)}" type="button">${pinned ? "Tracked ✓" : unlocked ? "Track achievement" : "Track this goal"}</button>
            ${unlocked && def.profileTitle ? `<button class="ghost-button ${equipped ? "active" : ""}" data-achievement-equip="${escAttr(def.id)}" type="button">${equipped ? "Equipped ✓" : "Use title"}</button>` : ""}
          </div>
        </div>
      </article>`;
  }

  function renderShowcase() {
    if (!els.showcase) return;
    const state = achievementState();
    const ctx = buildContext();
    const unlockedDefs = DEFINITIONS.filter(def => state.unlocked[def.id]);
    const pinnedDefs = state.pinned.map(id => BY_ID.get(id)).filter(Boolean);
    const recentDefs = unlockedDefs
      .filter(def => !pinnedDefs.some(item => item.id === def.id))
      .sort((a, b) => Number(state.unlocked[b.id]?.unlockedAt || 0) - Number(state.unlocked[a.id]?.unlockedAt || 0));
    const picks = [...pinnedDefs, ...recentDefs].slice(0, 3);

    if (els.showcaseCount) els.showcaseCount.textContent = `${unlockedDefs.length} / ${DEFINITIONS.length}`;

    if (!picks.length) {
      els.showcase.innerHTML = `<button class="growth-achievement-empty-v21" data-achievement-open="1" type="button"><span>🏆</span><div><strong>Choose something to work toward.</strong><small>Visible achievements can be tracked before they unlock. Secret milestones stay hidden.</small></div><b>›</b></button>`;
      return;
    }

    els.showcase.innerHTML = picks.map(def => {
      const unlocked = Boolean(state.unlocked[def.id]);
      const progress = safeProgress(def, ctx);
      const percent = progress?.target > 0 ? Math.min(100, Math.max(0, progress.value / progress.target * 100)) : unlocked ? 100 : 0;
      return `<button class="growth-achievement-chip-v21 ${unlocked ? "unlocked" : "tracked"}" data-achievement-open="1" type="button">
        <span>${def.icon}</span>
        <div><small>${state.pinned.includes(def.id) ? (unlocked ? "TRACKED · COMPLETE" : "TRACKED GOAL") : "RECENT"}</small><strong>${esc(def.title)}</strong>${progress && !unlocked ? `<em>${formatNumber(progress.value)} / ${formatNumber(progress.target)} ${esc(progress.unit || "")}</em><i class="achievement-mini-progress-v306"><b style="width:${percent}%"></b></i>` : def.profileTitle ? `<em>Title: ${esc(def.profileTitle)}</em>` : ""}</div>
        <b>›</b>
      </button>`;
    }).join("");
  }

  function renderDashboardTracker() {
    if (!els.dashboardTracker) return;
    const state = achievementState();
    const ctx = buildContext();
    const tracked = state.pinned.map(id => BY_ID.get(id)).filter(Boolean);
    if (els.dashboardTrackerEmpty) els.dashboardTrackerEmpty.classList.toggle("hidden", tracked.length > 0);
    els.dashboardTracker.innerHTML = tracked.map(def => {
      const unlocked = Boolean(state.unlocked[def.id]);
      const progress = safeProgress(def, ctx);
      const percent = progress?.target > 0 ? Math.min(100, Math.max(0, progress.value / progress.target * 100)) : unlocked ? 100 : 0;
      return `<article class="dashboard-achievement-track-v306 ${unlocked ? "complete" : ""}">
        <button class="dashboard-achievement-main-v306" data-achievement-open="1" type="button">
          <span class="dashboard-achievement-icon-v306">${def.icon}</span>
          <span class="dashboard-achievement-copy-v306"><small>${unlocked ? "ACHIEVEMENT COMPLETE" : "TRACKED ACHIEVEMENT"}</small><strong>${esc(def.title)}</strong><em>${unlocked ? `+${formatNumber(def.coinReward || 0)} 🪙 earned` : progress ? `${formatNumber(progress.value)} / ${formatNumber(progress.target)} ${esc(progress.unit || "")}` : "In progress"}</em><i class="achievement-mini-progress-v306"><b style="width:${percent}%"></b></i></span>
          <b>›</b>
        </button>
        <button class="dashboard-achievement-unpin-v306" data-achievement-unpin="${escAttr(def.id)}" type="button" aria-label="Stop tracking ${escAttr(def.title)}">×</button>
      </article>`;
    }).join("");
  }

  function renderTitleControls() {
    if (!els.titleSelect) return;
    const state = achievementState();
    const titled = DEFINITIONS.filter(def => def.profileTitle && state.unlocked[def.id]);
    els.titleSelect.innerHTML = `<option value="">No profile title</option>${titled.map(def => `<option value="${escAttr(def.id)}" ${state.equippedTitleId === def.id ? "selected" : ""}>${esc(def.profileTitle)}</option>`).join("")}`;
    els.titleSelect.disabled = titled.length === 0;
    if (els.titleHint) {
      els.titleHint.textContent = titled.length
        ? `${titled.length} cosmetic title${titled.length === 1 ? "" : "s"} unlocked. Titles never affect stats or story checks.`
        : "Profile titles unlock from selected achievements. They are cosmetic only.";
    }
  }

  function renderProfileTitles() {
    const state = achievementState();
    const def = state.equippedTitleId ? BY_ID.get(state.equippedTitleId) : null;
    const title = def && state.unlocked[def.id] ? def.profileTitle : "";
    for (const element of [els.dashboardTitle, els.growthTitle]) {
      if (!element) continue;
      element.textContent = title ? `✧ ${title}` : "";
      element.classList.toggle("hidden", !title);
    }
  }

  function togglePinned(id) {
    const def = BY_ID.get(id);
    if (!def) return;
    if (def.secret && !isUnlocked(id)) return;
    const state = achievementState();
    if (state.pinned.includes(id)) {
      state.pinned = state.pinned.filter(item => item !== id);
    } else {
      if (state.pinned.length >= MAX_PINNED) {
        app.showToast?.("You can track up to three achievements at a time.");
        return;
      }
      state.pinned.push(id);
    }
    persist("achievements-ui", { scan: false });
    render();
  }

  function equipTitle(id) {
    const def = BY_ID.get(id);
    if (!def?.profileTitle || !isUnlocked(id)) return;
    const state = achievementState();
    state.equippedTitleId = state.equippedTitleId === id ? null : id;
    persist("achievements-ui", { scan: false });
    render();
  }

  function persist(source, { scan = true } = {}) {
    app.saveState({ source });
    if (scan) scanAchievements({ retroactive: false, silent: false });
  }

  function isUnlocked(id) {
    return Boolean(achievementState().unlocked[id]);
  }

  function safeProgress(def, ctx) {
    if (typeof def.progress !== "function") return null;
    try {
      const value = def.progress(ctx);
      if (!value || !Number.isFinite(Number(value.target))) return null;
      return {
        value: Math.max(0, Number(value.value || 0)),
        target: Math.max(0, Number(value.target || 0)),
        unit: value.unit || "Progress"
      };
    } catch {
      return null;
    }
  }

  function queueToast(def) {
    toastQueue.push(def);
    if (toastTimer || !els.toast) return;
    showNextToast();
  }

  function showNextToast() {
    if (!els.toast) return;
    const def = toastQueue.shift();
    if (!def) {
      toastTimer = null;
      return;
    }
    if (els.toastIcon) els.toastIcon.textContent = def.icon;
    if (els.toastTitle) els.toastTitle.textContent = def.title;
    if (els.toastDetail) {
      const coins = Number(def.awardedCoins ?? def.coinReward ?? 0);
      const reward = coins > 0 ? ` · +${coins} 🪙` : "";
      els.toastDetail.textContent = def.profileTitle ? `Achievement unlocked${reward} · profile title “${def.profileTitle}” available` : `Achievement unlocked${reward}`;
    }
    els.toast.classList.remove("hidden");
    requestAnimationFrame(() => els.toast.classList.add("show"));
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
      window.setTimeout(() => {
        els.toast.classList.add("hidden");
        toastTimer = null;
        showNextToast();
      }, 220);
    }, 2900);
  }

  function shortDate(timestamp) {
    const date = new Date(Number(timestamp || Date.now()));
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
  }

  function formatNumber(value) {
    const n = Number(value || 0);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(1).replace(/\.0$/, "");
  }

  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replaceAll("`", "&#96;");
  }

  window.LifeRPGAchievements = {
    definitions: DEFINITIONS.map(def => ({ id: def.id, category: def.category, secret: Boolean(def.secret), profileTitle: def.profileTitle || null, coinReward: Number(def.coinReward || 0) })),
    scan: () => scanAchievements({ retroactive: false, silent: false }),
    render,
    getUnlockedIds: () => Object.keys(achievementState().unlocked),
    getEquippedTitle: () => {
      const id = achievementState().equippedTitleId;
      return id ? BY_ID.get(id)?.profileTitle || null : null;
    }
  };
})();
