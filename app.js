(() => {
  "use strict";

  const STORAGE_KEY = "lifeRpgPrototypeV01";

  const STAT_META = {
    strength: { label: "Strength", icon: "💪" },
    knowledge: { label: "Knowledge", icon: "🧠" },
    creativity: { label: "Creativity", icon: "🎨" },
    confidence: { label: "Confidence", icon: "✨" },
    social: { label: "Social", icon: "💬" },
    wellbeing: { label: "Wellbeing", icon: "🌿" },
    japanese: { label: "Japanese Skill", icon: "🇯🇵" }
  };

  const REALM_META = {
    Work: { icon: "📎" },
    Health: { icon: "🌱" },
    Recovery: { icon: "🛋️" },
    Home: { icon: "🏠" },
    Japanese: { icon: "🌸" },
    Knowledge: { icon: "📚" },
    Hobbies: { icon: "🎨" }
  };

  const ENERGY_RANK = {
    "Low Energy": 0,
    "Normal": 1,
    "Boss": 2
  };

  const REWARD_LEDGER_SCHEMA = 1;
  const MAX_REWARD_EVENTS = 3000;
  const REWARD_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
  const STORY_ENERGY_TIERS = [
    { until: 4, multiplier: 1 },
    { until: 8, multiplier: 0.72 },
    { until: 12, multiplier: 0.42 },
    { until: Infinity, multiplier: 0.12 }
  ];

  const IMPORTED_QUESTS = (window.LIFE_RPG_QUESTS || []).map(normalizeImportedQuest);
  const IMPORTED_QUEST_LEGACY_ID_MAP = new Map();
  IMPORTED_QUESTS.forEach(quest => {
    (Array.isArray(quest.legacyIds) ? quest.legacyIds : []).forEach(legacyId => {
      if (legacyId) IMPORTED_QUEST_LEGACY_ID_MAP.set(legacyId, quest.id);
    });
  });

  const LEGACY_QUEST_ID_MAP = {
    "q-work-focus": "🧠 Focus Work",
    "q-recovery-gaming": "🎮 Intentional Gaming Session",
    "q-home-clean": "🧹 10-Minute Clean",
    "q-japanese-grammar": "🧠 Grammar Echo",
    "q-read": "📖 Read 10 Pages",
    "q-music-reset": "🎵 Music Reset",
    "q-creative": "🎨 25-Minute Aesthetic Build"
  };

  function normalizeImportedQuest(quest) {
    const stat = deriveImportedStat(quest);

    return {
      ...quest,
      custom: false,
      stat,
      statAtTarget: Math.max(1, Math.round(Number(quest.xp || 0) * .65))
    };
  }

  function deriveImportedStat(quest) {
    const name = String(quest.name || "").toLowerCase();

    if (quest.realm === "Japanese") return "japanese";
    if (quest.realm === "Knowledge") return "knowledge";
    if (quest.realm === "Work") return "confidence";
    if (quest.realm === "Recovery" || quest.realm === "Home") return "wellbeing";

    if (quest.realm === "Health") {
      return /(walk|workout|training|exercise|gym)/i.test(name)
        ? "strength"
        : "wellbeing";
    }

    if (quest.realm === "Hobbies") {
      if (quest.realmXpSource === "Book" || quest.hobbyLane === "Reading" || /(book|read|reading)/i.test(name)) {
        return "knowledge";
      }

      if (quest.hobbyLane === "Gaming" || /(game|gaming)/i.test(name)) {
        return "wellbeing";
      }

      return "creativity";
    }

    return "knowledge";
  }

  function importedQuestIdByName(name) {
    return IMPORTED_QUESTS.find(quest => quest.name === name)?.id || null;
  }

  function migrateLegacyQuestId(id) {
    if (!id) return id;
    const stableImportedId = IMPORTED_QUEST_LEGACY_ID_MAP.get(id);
    if (stableImportedId) return stableImportedId;
    const mappedName = LEGACY_QUEST_ID_MAP[id];
    return mappedName ? importedQuestIdByName(mappedName) || id : id;
  }

  function migratePlannerSourceKey(key) {
    if (typeof key !== "string" || !key.startsWith("quest:")) return key;
    const migrated = migrateLegacyQuestId(key.slice("quest:".length));
    return `quest:${migrated || ""}`;
  }

  function migrateQuestReferencesInState() {
    state.selectedQuestIds = (Array.isArray(state.selectedQuestIds) ? state.selectedQuestIds : [])
      .map(migrateLegacyQuestId)
      .filter((id, index, ids) => id && ids.indexOf(id) === index)
      .filter(id => Boolean(getQuestById(id)));

    state.completionLog = (Array.isArray(state.completionLog) ? state.completionLog : []).map(log => ({
      ...log,
      questId: migrateLegacyQuestId(log.questId)
    }));

    if (Array.isArray(state.rewardLedger?.events)) {
      state.rewardLedger.events = state.rewardLedger.events.map(event => (
        event?.source === "quest" && event.sourceId
          ? { ...event, sourceId: migrateLegacyQuestId(event.sourceId) }
          : event
      ));
    }

    const planner = state.dailyPlanner;
    if (planner && typeof planner === "object") {
      Object.values(planner.days || {}).forEach(day => {
        if (!day || typeof day !== "object") return;
        const migratePick = pick => (
          pick?.sourceType === "quest" && pick.sourceId
            ? { ...pick, sourceId: migrateLegacyQuestId(pick.sourceId) }
            : pick
        );
        if (Array.isArray(day.picks)) day.picks = day.picks.map(migratePick);
        if (Array.isArray(day.batchHistory)) {
          day.batchHistory = day.batchHistory.map(batch => ({
            ...batch,
            picks: Array.isArray(batch?.picks) ? batch.picks.map(migratePick) : batch?.picks
          }));
        }
        if (day.rerollHistory && typeof day.rerollHistory === "object") {
          Object.keys(day.rerollHistory).forEach(slot => {
            if (Array.isArray(day.rerollHistory[slot])) {
              day.rerollHistory[slot] = day.rerollHistory[slot].map(migratePlannerSourceKey);
            }
          });
        }
      });

      if (planner.rerollMemory && typeof planner.rerollMemory === "object") {
        const migratedMemory = {};
        Object.entries(planner.rerollMemory).forEach(([key, value]) => {
          migratedMemory[migratePlannerSourceKey(key)] = value;
        });
        planner.rerollMemory = migratedMemory;
      }
      planner.migrations ||= {};
      planner.migrations.stableBuiltInQuestIdsV0284 = true;
    }
  }

  function migrateLegacyCustomQuest(quest) {
    if (!quest || !String(quest.id || "").startsWith("q-custom-")) return null;

    return {
      id: quest.id,
      custom: true,
      name: quest.name || "Custom Quest",
      realm: quest.realm || "Hobbies",
      xpMode: quest.xpMode || (quest.mode === "variable" ? "Variable by Units" : "Fixed"),
      units: Number(quest.units ?? quest.target ?? 1),
      unitLabel: quest.unitLabel || "task",
      xp: Number(quest.xp ?? quest.xpAtTarget ?? 20),
      frequency: quest.frequency || "Repeatable",
      cooldownDays: Number(quest.cooldownDays || 0) || null,
      energy: quest.energy || legacyPriorityToEnergy(quest.priority),
      planningEffort: quest.planningEffort || planningEffortFromEnergy(quest.energy || legacyPriorityToEnergy(quest.priority)),
      planningMinutes: questPlanningMinutes(quest),
      manualStatus: "Available",
      sessionSize: quest.sessionSize || planningSessionLabel(questPlanningMinutes(quest)),
      offDutyDeck: false,
      hobbyLane: null,
      planningThemes: [],
      coinMultiplier: Number(quest.coinMultiplier || 1),
      questType: quest.questType || null,
      storyEnergyAtTarget: Number(quest.storyEnergyAtTarget || 0),
      batchCarryOver: Boolean(quest.batchCarryOver),
      realmXpSource: "Quest",
      stat: quest.stat || "knowledge",
      statAtTarget: Number(quest.statAtTarget || Math.max(1, Math.round(Number(quest.xpAtTarget || 20) * .65)))
    };
  }

  function legacyPriorityToEnergy(priority) {
    if (priority === "Low Energy") return "Low Energy";
    if (priority === "Main" || priority === "Must Do") return "Boss";
    return "Normal";
  }

  function planningEffortFromEnergy(energy) {
    if (energy === "Low Energy") return "low";
    if (energy === "Boss") return "high";
    return "medium";
  }

  function planningMinutesFromSessionSize(sessionSize) {
    const text = String(sessionSize || "").toLowerCase();
    const numbers = [...text.matchAll(/\d+/g)].map(match => Number(match[0])).filter(Number.isFinite);
    if (numbers.length >= 2) return Math.round((numbers[0] + numbers[1]) / 2);
    if (numbers.length === 1) return numbers[0];
    if (text.includes("tiny")) return 10;
    if (text.includes("short")) return 25;
    if (text.includes("medium")) return 45;
    if (text.includes("long")) return 75;
    return 0;
  }

  function questPlanningMinutes(quest) {
    const explicit = Number(quest?.planningMinutes || 0);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    const fromSession = planningMinutesFromSessionSize(quest?.sessionSize);
    if (fromSession > 0) return fromSession;
    const target = Number(quest?.units ?? quest?.target ?? 0);
    const unit = String(quest?.unitLabel || "").toLowerCase();
    if (target > 0 && /(min|minute)/.test(unit)) return Math.max(1, Math.round(target));
    if (target > 0 && /(page|seite)/.test(unit)) return Math.max(5, Math.round(target * 2));
    if (target > 0 && /(hour|stunde)/.test(unit)) return Math.max(5, Math.round(target * 60));
    return planningEffortFromEnergy(quest?.energy) === "low" ? 10 : planningEffortFromEnergy(quest?.energy) === "high" ? 45 : 25;
  }

  function planningSessionLabel(minutes) {
    const value = Math.max(1, Number(minutes || 0));
    if (value <= 10) return "Tiny (≤10 min)";
    if (value <= 20) return "Short (10-20 min)";
    if (value <= 45) return "Medium (20-45 min)";
    if (value <= 60) return "Long (45-60 min)";
    return "Long (60+ min)";
  }

  function getAllQuests() {
    return [...IMPORTED_QUESTS, ...(state.customQuests || [])];
  }

  function getQuestById(questId) {
    return getAllQuests().find(quest => quest.id === questId) || null;
  }

  function questTarget(quest) {
    const value = Number(quest.units);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function isVariableQuest(quest) {
    return quest?.xpMode === "Variable by Units";
  }

  function isBatchQuest(quest) {
    return quest?.xpMode === "Batch by Units" || quest?.questType === "Unit Batch";
  }

  function isUnitQuest(quest) {
    return isVariableQuest(quest) || isBatchQuest(quest);
  }

  function questUnitLabel(quest) {
    return quest.unitLabel || (isUnitQuest(quest) ? "units" : "completion");
  }

  function batchQuestProgress(quest, addedUnits = 0) {
    const batchSize = questTarget(quest);
    const previousUnits = (state.completionLog || [])
      .filter(log => log.questId === quest.id)
      .reduce((sum, log) => sum + Math.max(0, Number(log.units || 0)), 0);
    const added = Math.max(0, Number(addedUnits || 0));
    const beforeBatches = Math.floor((previousUnits + 1e-9) / batchSize);
    const afterTotal = previousUnits + added;
    const afterBatches = Math.floor((afterTotal + 1e-9) / batchSize);
    const earnedBatches = Math.max(0, afterBatches - beforeBatches);
    const remainder = Math.max(0, afterTotal - afterBatches * batchSize);
    const beforeRemainder = Math.max(0, previousUnits - beforeBatches * batchSize);
    return { batchSize, previousUnits, added, beforeRemainder, earnedBatches, afterTotal, remainder, afterBatches };
  }

  function questCoinBase(quest) {
    const hasMultiplier = quest.coinMultiplier !== null && quest.coinMultiplier !== undefined && quest.coinMultiplier !== "";
    const multiplier = hasMultiplier && Number.isFinite(Number(quest.coinMultiplier))
      ? Number(quest.coinMultiplier)
      : 1;
    return Math.max(1, Math.round((Number(quest.xp || 0) / 10) * multiplier));
  }

  function energyStyleKey(quest) {
    if (quest.energy === "Boss") return "Main";
    if (quest.energy === "Low Energy") return "Low Energy";
    return "Optional";
  }

  const LOCATION_META = {
    currentHome: {
      label: "Current Apartment",
      icon: "🏠",
      art: "assets/story/backgrounds/home_morning.png",
      description: "Familiar, private, and much too far from work."
    },
    school: {
      label: "School",
      icon: "🏫",
      art: "assets/story/backgrounds/school_hallway.png",
      description: "Luca's real daily world: lessons, colleagues, students and everything that comes with teaching."
    },
    station: {
      label: "Station",
      icon: "🚉",
      art: "assets/story/backgrounds/station_evening.png",
      description: "A familiar part of the commute — sometimes just a transfer point, sometimes where the day changes direction."
    },
    sharedApartment: {
      label: "Shared Apartment",
      icon: "🛋️",
      art: "assets/story/backgrounds/shared_apartment_evening.png",
      description: "A place that can only become home after the story makes it part of Luca's life."
    },
    agency: {
      label: "DynaRiot Agency",
      icon: "💥",
      art: "assets/story/backgrounds/city_dusk.png",
      description: "Not part of Luca's ordinary world yet."
    },
    gym: {
      label: "Training Gym",
      icon: "🏋️",
      art: "assets/story/backgrounds/gym_training_space.png",
      description: "A location that should unlock through narrative introduction."
    },
    cafe: {
      label: "Koharu Café",
      icon: "☕",
      art: "assets/story/backgrounds/koharu_cafe.png",
      description: "A small café Mina introduced — easy to reach, low-pressure, and starting to feel like a shared spot."
    },
    district: {
      label: "Collector District",
      icon: "🌙",
      art: "assets/story/backgrounds/city_dusk.png",
      description: "Shops, side streets and little detours that are starting to become part of Luca's own map."
    }
  };


  function defaultRewardLedger() {
    return {
      schemaVersion: REWARD_LEDGER_SCHEMA,
      events: []
    };
  }

  function ensureProgressionState() {
    if (!state.rewardLedger || typeof state.rewardLedger !== "object" || Array.isArray(state.rewardLedger)) {
      state.rewardLedger = defaultRewardLedger();
    }
    state.rewardLedger.schemaVersion = REWARD_LEDGER_SCHEMA;
    if (!Array.isArray(state.rewardLedger.events)) state.rewardLedger.events = [];
    if (state.rewardLedger.events.length > MAX_REWARD_EVENTS) {
      state.rewardLedger.events = state.rewardLedger.events
        .slice()
        .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
        .slice(-MAX_REWARD_EVENTS);
    }

    const defaults = defaultState();
    state.stats = { ...defaults.stats, ...(state.stats || {}) };
    state.realms = { ...defaults.realms, ...(state.realms || {}) };
    state.characterXP = Math.max(0, Number(state.characterXP || 0));
    state.coins = Math.max(0, Number(state.coins || 0));
    state.storyEnergy = floor2(Math.max(0, Number(state.storyEnergy || 0)));
  }

  function getProgressionSnapshot() {
    ensureProgressionState();

    const capabilities = {};
    Object.keys(STAT_META).forEach(key => {
      capabilities[key] = statLevelInfo(state.stats?.[key] || 0).level;
    });

    const realmRanks = {};
    Object.keys(REALM_META).forEach(realm => {
      realmRanks[realm] = realmRankInfo(state.realms?.[realm] || 0).level;
    });

    const activity = {
      total: 0,
      byCapability: {},
      byRealm: {},
      bySource: {},
      byFamily: {}
    };

    for (const event of state.rewardLedger.events || []) {
      if (!event || event.duplicate || event.progressionRelevant === false) continue;
      activity.total += 1;
      if (event.capability) activity.byCapability[event.capability] = Number(activity.byCapability[event.capability] || 0) + 1;
      if (event.realm) activity.byRealm[event.realm] = Number(activity.byRealm[event.realm] || 0) + 1;
      if (event.source) activity.bySource[event.source] = Number(activity.bySource[event.source] || 0) + 1;
      if (event.dedupeFamily) activity.byFamily[event.dedupeFamily] = Number(activity.byFamily[event.dedupeFamily] || 0) + 1;
    }

    return {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      characterLevel: getLevelInfo(state.characterXP).level,
      capabilities,
      realmRanks,
      activity
    };
  }

  function getActivityCount(criteria = {}, snapshot = null) {
    const normalized = criteria && typeof criteria === "object" ? criteria : {};
    const filters = ["capability", "realm", "source", "dedupeFamily"].filter(key => normalized[key]);
    const hasTimeFilter = Boolean(normalized.sinceAt || normalized.sinceDays != null);

    // Story snapshots deliberately keep only small aggregate counters so saves do not
    // balloon as the reward ledger grows. The common hidden-check cases (e.g. three
    // Strength activities) can therefore stay stable for the whole scene.
    if (snapshot?.activity && !hasTimeFilter && filters.length <= 1) {
      if (!filters.length) return Number(snapshot.activity.total || 0);
      const key = filters[0];
      if (key === "capability") return Number(snapshot.activity.byCapability?.[normalized.capability] || 0);
      if (key === "realm") return Number(snapshot.activity.byRealm?.[normalized.realm] || 0);
      if (key === "source") return Number(snapshot.activity.bySource?.[normalized.source] || 0);
      if (key === "dedupeFamily") return Number(snapshot.activity.byFamily?.[normalized.dedupeFamily] || 0);
    }

    ensureProgressionState();
    const sinceAt = normalized.sinceAt ? new Date(normalized.sinceAt) : null;
    const sinceMs = sinceAt && Number.isFinite(sinceAt.getTime())
      ? sinceAt.getTime()
      : normalized.sinceDays != null
        ? Date.now() - Math.max(0, Number(normalized.sinceDays || 0)) * 86400000
        : null;

    return (state.rewardLedger.events || []).filter(event => {
      if (!event || event.duplicate || event.progressionRelevant === false) return false;
      if (normalized.capability && event.capability !== normalized.capability) return false;
      if (normalized.realm && event.realm !== normalized.realm) return false;
      if (normalized.source && event.source !== normalized.source) return false;
      if (normalized.dedupeFamily && event.dedupeFamily !== normalized.dedupeFamily) return false;
      if (sinceMs != null) {
        const at = new Date(event.at || 0).getTime();
        if (!Number.isFinite(at) || at < sinceMs) return false;
      }
      return true;
    }).length;
  }

  function progressionComparison(actual, requirement = {}) {
    if (requirement.equals != null && actual !== requirement.equals) return false;
    if (requirement.min != null && Number(actual) < Number(requirement.min)) return false;
    if (requirement.max != null && Number(actual) > Number(requirement.max)) return false;
    return true;
  }

  function evaluateProgressionCondition(condition, options = {}) {
    if (condition == null) return true;
    if (typeof condition === "boolean") return condition;
    if (Array.isArray(condition)) return condition.every(item => evaluateProgressionCondition(item, options));
    if (typeof condition !== "object") return true;

    const snapshot = options.snapshot && typeof options.snapshot === "object" ? options.snapshot : null;

    if (Array.isArray(condition.all)) {
      if (!condition.all.every(item => evaluateProgressionCondition(item, options))) return false;
    }
    if (Array.isArray(condition.any)) {
      if (!condition.any.some(item => evaluateProgressionCondition(item, options))) return false;
    }
    if (condition.not != null && evaluateProgressionCondition(condition.not, options)) return false;

    let requirement = condition;
    let type = condition.type || null;

    if (!type && condition.capability) {
      type = "capability";
      requirement = typeof condition.capability === "object"
        ? { ...condition, ...condition.capability, key: condition.capability.key || condition.key }
        : { ...condition, key: condition.capability };
    } else if (!type && condition.realmRank) {
      type = "realmRank";
      requirement = typeof condition.realmRank === "object"
        ? { ...condition, ...condition.realmRank, key: condition.realmRank.key || condition.key }
        : { ...condition, key: condition.realmRank };
    } else if (!type && condition.activityCount) {
      type = "activityCount";
      requirement = typeof condition.activityCount === "object"
        ? { ...condition, ...condition.activityCount }
        : { ...condition, min: Number(condition.activityCount || 0) };
    }

    if (!type) return true;

    switch (type) {
      case "capability": {
        const key = requirement.key || requirement.capability;
        if (!key) return true;
        const actual = Number(snapshot?.capabilities?.[key] ?? statLevelInfo(state.stats?.[key] || 0).level);
        return progressionComparison(actual, requirement);
      }
      case "realmRank": {
        const key = requirement.key || requirement.realm || requirement.realmRank;
        if (!key) return true;
        const actual = Number(snapshot?.realmRanks?.[key] ?? realmRankInfo(state.realms?.[key] || 0).level);
        return progressionComparison(actual, requirement);
      }
      case "characterLevel": {
        const actual = Number(snapshot?.characterLevel ?? getLevelInfo(state.characterXP).level);
        return progressionComparison(actual, requirement);
      }
      case "activityCount": {
        const actual = getActivityCount(requirement, snapshot);
        return progressionComparison(actual, requirement);
      }
      case "flag": {
        const key = requirement.key || requirement.flag;
        if (!key) return true;
        const expected = Object.prototype.hasOwnProperty.call(requirement, "value") ? requirement.value : true;
        return state.flags?.[key] === expected;
      }
      case "storyCompleted": {
        const id = requirement.key || requirement.sceneId || requirement.storyCompleted;
        if (!id) return true;
        return Boolean(state.story?.completedSceneIds?.includes?.(id));
      }
      default:
        return true;
    }
  }

  function migrateLegacyRewardLedger() {
    ensureProgressionState();
    const events = state.rewardLedger.events;
    const ids = new Set(events.map(event => event?.id).filter(Boolean));

    const addLegacy = (id, data) => {
      if (!id || ids.has(id)) return id;
      events.push({ id, migrated: true, ...data });
      ids.add(id);
      return id;
    };

    (state.completionLog || []).forEach((log, index) => {
      const id = log.rewardEventId || `legacy-quest-${log.id || index}`;
      log.rewardEventId = id;
      addLegacy(id, {
        source: "quest",
        sourceId: log.questId || null,
        label: log.questName || "Quest",
        realm: REALM_META[log.realm] ? log.realm : null,
        capability: STAT_META[log.stat] ? log.stat : null,
        xp: Math.max(0, Number(log.xp || 0)),
        realmXP: Math.max(0, Number(log.xp || 0)),
        statXP: Math.max(0, Number(log.statXP || 0)),
        coins: Math.max(0, Number(log.coins || 0)),
        rawStoryEnergy: Math.max(0, Number(log.rawStoryEnergy ?? log.storyEnergy ?? 0)),
        storyEnergy: Math.max(0, Number(log.storyEnergy || 0)),
        dedupeFamily: dedupeFamilyForQuest(getQuestById(log.questId)),
        duplicate: Boolean(log.deduped),
        duplicateOf: null,
        at: log.at || new Date(0).toISOString()
      });
    });

    (state.externalCompletionLog || []).forEach((log, index) => {
      const id = log.rewardEventId || `legacy-external-${log.id || index}`;
      log.rewardEventId = id;
      addLegacy(id, {
        source: "external",
        sourceId: log.id || null,
        label: log.name || "External task",
        realm: REALM_META[log.realm] ? log.realm : null,
        capability: STAT_META[log.stat] ? log.stat : null,
        xp: Math.max(0, Number(log.xp || 0)),
        realmXP: Math.max(0, Number(log.xp || 0)),
        statXP: Math.max(0, Number(log.statXP || 0)),
        coins: Math.max(0, Number(log.coins || 0)),
        rawStoryEnergy: Math.max(0, Number(log.rawStoryEnergy ?? log.storyEnergy ?? 0)),
        storyEnergy: Math.max(0, Number(log.storyEnergy || 0)),
        dedupeFamily: null,
        duplicate: Boolean(log.deduped),
        duplicateOf: null,
        at: log.at || new Date(0).toISOString()
      });
    });

    const habitCompletions = state.habits?.completions;
    if (Array.isArray(habitCompletions)) {
      habitCompletions.forEach((log, index) => {
        const paid = Math.max(0, Number(log.reward || 0));
        if (paid <= 0 && !log.rewardEventId) return;
        const habit = state.habits?.items?.find?.(item => item.id === log.habitId) || null;
        const id = log.rewardEventId || `legacy-habit-${log.id || index}`;
        log.rewardEventId = id;
        addLegacy(id, {
          source: "habit",
          sourceId: log.habitId || null,
          label: habit?.name || "Habit",
          realm: REALM_META[habit?.realm] ? habit.realm : null,
          capability: inferCapability({ realm: habit?.realm, label: habit?.name, kind: "habit" }),
          xp: Math.max(0, Number(log.xp || 0)),
          realmXP: Math.max(0, Number(log.realmXP ?? log.xp ?? 0)),
          statXP: Math.max(0, Number(log.statXP || 0)),
          coins: 0,
          rawStoryEnergy: Math.max(0, Number(log.rawReward ?? paid)),
          storyEnergy: paid,
          dedupeFamily: null,
          duplicate: Boolean(log.deduped),
          duplicateOf: null,
          at: log.timestamp ? new Date(Number(log.timestamp)).toISOString() : `${log.date || "1970-01-01"}T12:00:00`
        });
      });
    }

    state.rewardLedger.events = events
      .slice()
      .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
      .slice(-MAX_REWARD_EVENTS);
  }

  function inferCapability({ realm, label = "", kind = "", role = "" } = {}) {
    const text = `${label} ${kind} ${role}`.toLowerCase();
    if (realm === "Japanese") return "japanese";
    if (realm === "Knowledge") return "knowledge";
    if (realm === "Work") return kind === "book" ? "knowledge" : "confidence";
    if (realm === "Recovery" || realm === "Home") return "wellbeing";
    if (realm === "Health") {
      return /(walk|run|workout|training|exercise|gym|strength|sport|yoga|pilates|swim|cycle|bike|climb|hike)/i.test(text)
        ? "strength"
        : "wellbeing";
    }
    if (realm === "Hobbies") {
      if (kind === "book" || /(book|read|reading)/i.test(text)) return "knowledge";
      if (role === "social") return "social";
      if (role === "challenge") return "confidence";
      if (kind === "game" || /(game|gaming|play)/i.test(text)) return "wellbeing";
      return "creativity";
    }
    return "knowledge";
  }

  function dedupeFamilyForQuest(quest) {
    if (!quest) return null;
    const name = String(quest.name || "").toLowerCase();
    const isBookAdmin = /(rate|review|log\s+a\s+book|book\s+log)/i.test(name);
    if (!isBookAdmin && (quest.hobbyLane === "Reading" || /(\bread\b|\breading\b|\bpages?\b|continue current book)/i.test(name))) {
      return "reading";
    }
    if (quest.hobbyLane === "Gaming" || /(\bgame\b|\bgaming\b|play session)/i.test(name)) return "gaming";
    return null;
  }

  function rewardEventDateKey(event) {
    const date = new Date(event?.at || 0);
    return Number.isFinite(date.getTime()) ? localDateKey(date) : null;
  }

  function storyEnergyEarnedOnDate(dateLike = new Date()) {
    ensureProgressionState();
    const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
    const key = localDateKey(Number.isFinite(date.getTime()) ? date : new Date());
    return floor2(state.rewardLedger.events
      .filter(event => rewardEventDateKey(event) === key)
      .reduce((sum, event) => sum + Math.max(0, Number(event.storyEnergy || 0)), 0));
  }

  function applyStoryEnergyDiminishing(rawStoryEnergy, alreadyEarned = 0) {
    let rawRemaining = Math.max(0, Number(rawStoryEnergy || 0));
    let earned = Math.max(0, Number(alreadyEarned || 0));
    let payout = 0;

    for (const tier of STORY_ENERGY_TIERS) {
      if (rawRemaining <= 0) break;
      if (earned >= tier.until) continue;
      const actualRoom = tier.until === Infinity ? Infinity : Math.max(0, tier.until - earned);
      const rawRoom = actualRoom === Infinity ? Infinity : actualRoom / tier.multiplier;
      const rawTaken = Math.min(rawRemaining, rawRoom);
      const gained = rawTaken * tier.multiplier;
      payout += gained;
      earned += gained;
      rawRemaining -= rawTaken;
    }

    return floor2(payout);
  }

  function recentCrossSourceDuplicate(dedupeFamily, source, atMs) {
    if (!dedupeFamily) return null;
    const allowedSources = dedupeFamily === "reading"
      ? new Set(["quest", "library"])
      : dedupeFamily === "gaming"
        ? new Set(["quest", "game"])
        : null;
    if (!allowedSources?.has(source)) return null;

    ensureProgressionState();
    return state.rewardLedger.events
      .slice()
      .reverse()
      .find(event => {
        if (event.duplicate || event.dedupeFamily !== dedupeFamily) return false;
        if (event.source === source || !allowedSources.has(event.source)) return false;
        const eventMs = new Date(event.at || 0).getTime();
        return Number.isFinite(eventMs) && Math.abs(atMs - eventMs) <= REWARD_DEDUPE_WINDOW_MS;
      }) || null;
  }

  function calculateActivityReward(spec = {}, { mutate = false } = {}) {
    ensureProgressionState();
    const atDate = spec.at ? new Date(spec.at) : new Date();
    const safeDate = Number.isFinite(atDate.getTime()) ? atDate : new Date();
    const atMs = safeDate.getTime();
    const source = String(spec.source || "activity");
    const dedupeFamily = spec.dedupeFamily || null;
    const duplicateOf = recentCrossSourceDuplicate(dedupeFamily, source, atMs);
    const duplicate = Boolean(duplicateOf);

    const requestedXP = Math.max(0, Math.round(Number(spec.xp ?? spec.characterXP ?? 0)));
    const requestedRealmXP = Math.max(0, Math.round(Number(spec.realmXP ?? requestedXP)));
    const requestedStatXP = Math.max(0, Math.round(Number(spec.statXP ?? spec.capabilityXP ?? 0)));
    const requestedCoins = Math.max(0, Math.round(Number(spec.coins || 0)));
    const rawStoryEnergy = floor2(Math.max(0, Number(spec.storyEnergyBase ?? spec.rawStoryEnergy ?? 0)));
    const earnedToday = storyEnergyEarnedOnDate(safeDate);
    const storyEnergy = duplicate ? 0 : applyStoryEnergyDiminishing(rawStoryEnergy, earnedToday);

    const reward = {
      xp: duplicate ? 0 : requestedXP,
      realmXP: duplicate ? 0 : requestedRealmXP,
      statXP: duplicate ? 0 : requestedStatXP,
      coins: duplicate ? 0 : requestedCoins,
      rawStoryEnergy,
      storyEnergy,
      deduped: duplicate,
      duplicateOf: duplicateOf?.id || null
    };

    if (!mutate) return reward;

    const realm = REALM_META[spec.realm] ? spec.realm : null;
    const capability = STAT_META[spec.capability] ? spec.capability : null;
    state.characterXP += reward.xp;
    state.coins += reward.coins;
    state.storyEnergy = floor2(Number(state.storyEnergy || 0) + reward.storyEnergy);
    if (realm) state.realms[realm] = Math.max(0, Number(state.realms[realm] || 0)) + reward.realmXP;
    if (capability) state.stats[capability] = Math.max(0, Number(state.stats[capability] || 0)) + reward.statXP;

    const event = {
      id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      sourceId: spec.sourceId || null,
      label: String(spec.label || "Activity"),
      realm,
      capability,
      xp: reward.xp,
      realmXP: reward.realmXP,
      statXP: reward.statXP,
      coins: reward.coins,
      rawStoryEnergy,
      storyEnergy: reward.storyEnergy,
      dedupeFamily,
      duplicate,
      duplicateOf: reward.duplicateOf,
      progressionRelevant: spec.progressionRelevant !== false,
      at: safeDate.toISOString(),
      metadata: spec.metadata && typeof spec.metadata === "object" ? { ...spec.metadata } : null
    };

    state.rewardLedger.events.push(event);
    if (state.rewardLedger.events.length > MAX_REWARD_EVENTS) {
      state.rewardLedger.events = state.rewardLedger.events.slice(-MAX_REWARD_EVENTS);
    }
    reward.eventId = event.id;
    return reward;
  }

  function awardActivity(spec = {}) {
    const reward = calculateActivityReward(spec, { mutate: true });
    applyHiddenEngineChecks();
    return reward;
  }

  function previewActivityReward(spec = {}) {
    return calculateActivityReward(spec, { mutate: false });
  }


  function defaultState() {
    return {
      version: 7,
      progressionSchemaVersion: 1,
      characterXP: 0,
      coins: 0,
      storyEnergy: 0,
      rewardLedger: defaultRewardLedger(),
      stats: {
        strength: 0,
        knowledge: 0,
        creativity: 0,
        confidence: 0,
        social: 0,
        wellbeing: 0,
        japanese: 0
      },
      realms: {
        Work: 0,
        Health: 0,
        Recovery: 0,
        Home: 0,
        Japanese: 0,
        Knowledge: 0,
        Hobbies: 0
      },
      customQuests: [],
      selectedQuestIds: [
        importedQuestIdByName("🧠 Focus Work"),
        importedQuestIdByName("🧹 10-Minute Clean"),
        importedQuestIdByName("🎮 Intentional Gaming Session")
      ].filter(Boolean),
      completionLog: [],
      externalCompletionLog: [],
      memories: [],
      flags: {
        STORY_ENGINE_READY: true
      },
      contacts: {},
      locations: {
        currentHome: true,
        school: true,
        station: false,
        sharedApartment: false,
        agency: false,
        gym: false,
        cafe: false,
        district: false
      },
      devMode: false
    };
  }


  let state = loadState();
  let activeRealmFilter = "All";
  let activeQuestSearch = "";

  const els = {
    levelValue: byId("levelValue"),
    storyEnergyValue: byId("storyEnergyValue"),
    storyEnergyValueLarge: byId("storyEnergyValueLarge"),
    coinsValue: byId("coinsValue"),
    xpLabel: byId("xpLabel"),
    xpBar: byId("xpBar"),
    dateLine: byId("dateLine"),
    greeting: byId("greeting"),
    homeSubtitle: byId("homeSubtitle"),
    characterStatusLine: byId("characterStatusLine"),
    rhythmLine: byId("rhythmLine"),

    loadout: byId("loadout"),
    emptyLoadout: byId("emptyLoadout"),
    loadoutCount: byId("loadoutCount"),

    homeName: byId("homeName"),
    homeDescription: byId("homeDescription"),
    roomGrid: byId("roomGrid"),
    roomMessage: byId("roomMessage"),
    socialPulse: byId("socialPulse"),
    externalTaskTodaySummary: byId("externalTaskTodaySummary"),

    miniStats: byId("miniStats"),
    questLibrary: byId("questLibrary"),
    realmFilters: byId("realmFilters"),
    questSearch: byId("questSearch"),
    locationGrid: byId("locationGrid"),
    worldLocationOverlay: byId("worldLocationOverlay"),
    worldLocationHero: byId("worldLocationHero"),
    worldLocationIcon: byId("worldLocationIcon"),
    worldLocationTitle: byId("worldLocationTitle"),
    worldLocationDescription: byId("worldLocationDescription"),
    worldLocationStatus: byId("worldLocationStatus"),
    worldLocationPresenceList: byId("worldLocationPresenceList"),
    worldLocationActions: byId("worldLocationActions"),
    memoryList: byId("memoryList"),
    realmCards: byId("realmCards"),
    fullStats: byId("fullStats"),

    profileLevel: byId("profileLevel"),
    profileXP: byId("profileXP"),
    profileEnergy: byId("profileEnergy"),
    profileDays: byId("profileDays"),

    devModeToggle: byId("devModeToggle"),
    devControls: byId("devControls"),
    devOutput: byId("devOutput"),

    questDialog: byId("questDialog"),
    questForm: byId("questForm"),
    completeDialog: byId("completeDialog"),
    completeForm: byId("completeForm"),
    completeQuestId: byId("completeQuestId"),
    completeQuestTitle: byId("completeQuestTitle"),
    actualUnits: byId("actualUnits"),
    completePreview: byId("completePreview"),

    externalTaskDialog: byId("externalTaskDialog"),
    externalTaskForm: byId("externalTaskForm"),
    externalTaskName: byId("externalTaskName"),
    externalTaskEffort: byId("externalTaskEffort"),
    externalTaskRealm: byId("externalTaskRealm"),
    externalTaskPreview: byId("externalTaskPreview"),
    externalTaskChainStatus: byId("externalTaskChainStatus"),


    clearOverlay: byId("clearOverlay"),
    clearQuestName: byId("clearQuestName"),
    clearRewards: byId("clearRewards"),

    toast: byId("toast")
  };

  init();

  function init() {
    populateFormOptions();
    renderDateAndGreeting();
    bindNavigation();
    bindActions();
    migrateLegacyState();
    renderAll();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return mergeState(defaultState(), JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  function mergeState(base, saved) {
    const legacyCustomQuests = Array.isArray(saved.quests)
      ? saved.quests.map(migrateLegacyCustomQuest).filter(Boolean)
      : [];

    const {
      quests: _legacyQuestLibrary,
      customQuests: savedCustomQuests,
      ...savedWithoutQuestLibrary
    } = saved;

    return {
      ...base,
      ...savedWithoutQuestLibrary,
      version: 7,
      progressionSchemaVersion: Number(saved.progressionSchemaVersion || 0),
      rewardLedger: saved.rewardLedger && typeof saved.rewardLedger === "object"
        ? { ...defaultRewardLedger(), ...saved.rewardLedger, events: Array.isArray(saved.rewardLedger.events) ? saved.rewardLedger.events : [] }
        : defaultRewardLedger(),
      stats: { ...base.stats, ...(saved.stats || {}) },
      realms: { ...base.realms, ...(saved.realms || {}) },
      flags: { ...base.flags, ...(saved.flags || {}) },
      contacts: { ...base.contacts, ...(saved.contacts || {}) },
      locations: { ...base.locations, ...(saved.locations || {}) },
      customQuests: Array.isArray(savedCustomQuests)
        ? savedCustomQuests.map(migrateLegacyCustomQuest).filter(Boolean)
        : legacyCustomQuests,
      selectedQuestIds: Array.isArray(saved.selectedQuestIds)
        ? saved.selectedQuestIds
        : base.selectedQuestIds,
      completionLog: Array.isArray(saved.completionLog) ? saved.completionLog : [],
      externalCompletionLog: Array.isArray(saved.externalCompletionLog) ? saved.externalCompletionLog : [],
      memories: Array.isArray(saved.memories) ? saved.memories : []
    };
  }

  function migrateCapabilityCurve() {
    if (Number(state.progressionSchemaVersion || 0) >= 1) return;

    Object.keys(STAT_META).forEach(key => {
      const oldXP = Math.max(0, Number(state.stats?.[key] || 0));
      const oldCompletedLevels = Math.floor(oldXP / 100);
      const oldProgress = (oldXP % 100) / 100;
      let migratedXP = 0;
      for (let level = 1; level <= oldCompletedLevels; level += 1) {
        migratedXP += capabilityXpRequiredForLevel(level);
      }
      migratedXP += oldProgress * capabilityXpRequiredForLevel(oldCompletedLevels + 1);
      state.stats[key] = Math.round(migratedXP);
    });

    state.progressionSchemaVersion = 1;
  }

  function migrateLegacyState() {
    // V0.1 used "apartment" for an already-shared home.
    // V0.2 corrected that story state; V0.3 preserves the correction.
    if ("apartment" in state.locations) {
      delete state.locations.apartment;
    }

    if (state.flags.LOCATION_SHARED_APARTMENT_INTRODUCED) {
      state.locations.sharedApartment = true;
    }
    if (state.flags.MINA_REAL_COFFEE_COMPLETE) {
      state.locations.cafe = true;
    }
    if (state.flags.MINA_KNOWS_COMMUTE_BAD) {
      state.locations.station = true;
    }

    if (!Array.isArray(state.selectedQuestIds)) state.selectedQuestIds = defaultState().selectedQuestIds;
    migrateQuestReferencesInState();

    migrateCapabilityCurve();
    ensureProgressionState();
    migrateLegacyRewardLedger();
    state.version = 7;
    saveState();
  }

  function saveState(options = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderDevOutput();

    if (!options.suppressCloud) {
      window.dispatchEvent(new CustomEvent("life-rpg:state-saved", {
        detail: { source: options.source || "app" }
      }));
    }
  }

  function replaceState(nextState, options = {}) {
    if (!nextState || typeof nextState !== "object") return false;

    state = mergeState(defaultState(), nextState);

    if ("apartment" in state.locations) {
      delete state.locations.apartment;
    }

    if (state.flags.LOCATION_SHARED_APARTMENT_INTRODUCED) state.locations.sharedApartment = true;
    if (state.flags.MINA_REAL_COFFEE_COMPLETE) state.locations.cafe = true;
    if (state.flags.MINA_KNOWS_COMMUTE_BAD) state.locations.station = true;
    if (state.flags.LOCATION_GYM_INTRODUCED) state.locations.gym = true;
    if (state.flags.LOCATION_AGENCY_INTRODUCED) state.locations.agency = true;

    migrateQuestReferencesInState();
    migrateCapabilityCurve();
    ensureProgressionState();
    migrateLegacyRewardLedger();
    state.version = 7;
    saveState({ suppressCloud: Boolean(options.suppressCloud), source: options.source || "replace" });
    renderAll();
    return true;
  }

  function populateFormOptions() {
    const realmSelect = byId("newQuestRealm");
    realmSelect.innerHTML = Object.keys(REALM_META)
      .map(realm => `<option>${escapeHtml(realm)}</option>`)
      .join("");

    const statSelect = byId("newQuestStat");
    statSelect.innerHTML = Object.entries(STAT_META)
      .map(([key, meta]) => `<option value="${key}">${meta.icon} ${meta.label}</option>`)
      .join("");

    if (els.externalTaskRealm) {
      els.externalTaskRealm.innerHTML = Object.keys(REALM_META)
        .map(realm => `<option>${escapeHtml(realm)}</option>`)
        .join("");
      els.externalTaskRealm.value = "Work";
    }
  }

  function bindNavigation() {
    document.querySelectorAll(".nav-button").forEach(button => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });

    document.querySelectorAll("[data-view-target]").forEach(button => {
      button.addEventListener("click", () => showView(button.dataset.viewTarget));
    });
  }

  function showView(viewName) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
    document.querySelectorAll(".nav-button").forEach(button => button.classList.remove("active"));

    byId(`view-${viewName}`)?.classList.add("active");
    document.querySelector(`.nav-button[data-view="${viewName}"]`)?.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindActions() {
    byId("addQuestButton").addEventListener("click", openCreateQuestDialog);

    byId("saveQuestButton").addEventListener("click", event => {
      event.preventDefault();
      createQuestFromForm(false);
    });

    byId("saveQuestAnotherButton")?.addEventListener("click", event => {
      event.preventDefault();
      createQuestFromForm(true);
    });

    byId("newQuestXPMode")?.addEventListener("change", updateQuestModeFields);

    byId("confirmCompleteButton").addEventListener("click", event => {
      event.preventDefault();
      if (!els.completeForm.reportValidity()) return;

      completeQuest(
        els.completeQuestId.value,
        Number(els.actualUnits.value)
      );

      els.completeDialog.close();
    });

    els.actualUnits.addEventListener("input", updateCompletePreview);

    els.questSearch.addEventListener("input", () => {
      activeQuestSearch = els.questSearch.value.trim().toLowerCase();
      renderQuestLibrary();
    });

    els.devModeToggle.addEventListener("change", () => {
      state.devMode = els.devModeToggle.checked;
      saveState();
      renderDevArea();
    });

    byId("testHomeUpgrade").addEventListener("click", () => {
      state.flags.LOCATION_SHARED_APARTMENT_INTRODUCED = true;
      state.flags.SHARED_APARTMENT_IS_HOME = true;
      state.flags.DYNARIOT_MOVE_IN_COMPLETE = true;
      state.locations.currentHome = false;
      state.locations.sharedApartment = true;
      saveState();
      renderAll();
      showToast("Opaque narrative home flag simulated.");
    });

    byId("testMinaContact").addEventListener("click", () => {
      state.flags.CONTACT_A_UNLOCKED = true;
      state.contacts.CONTACT_A = true;
      saveState();
      renderAll();
      showToast("Opaque contact flag simulated.");
    });

    byId("externalTaskButton")?.addEventListener("click", openExternalTaskDialog);
    els.externalTaskEffort?.addEventListener("change", updateExternalTaskPreview);
    els.externalTaskRealm?.addEventListener("change", updateExternalTaskPreview);
    byId("confirmExternalTaskButton")?.addEventListener("click", event => {
      event.preventDefault();
      if (!els.externalTaskForm?.reportValidity()) return;
      const result = completeExternalTask({ showOverlay: false });
      if (!result) return;
      showExternalTaskChainStatus(result);
      els.externalTaskName.value = "";
      updateExternalTaskPreview();
      window.setTimeout(() => els.externalTaskName?.focus(), 20);
    });

    byId("confirmExternalTaskDoneButton")?.addEventListener("click", event => {
      event.preventDefault();
      if (!els.externalTaskForm?.reportValidity()) return;
      completeExternalTask({ showOverlay: true });
      els.externalTaskDialog?.close();
    });

    els.locationGrid?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-world-location]");
      if (!button || button.disabled) return;
      openWorldLocation(button.dataset.worldLocation);
    });

    byId("closeWorldLocationOverlay")?.addEventListener("click", closeWorldLocation);
    els.worldLocationOverlay?.addEventListener("click", event => {
      if (event.target === els.worldLocationOverlay) closeWorldLocation();
      const action = event.target.closest?.("[data-world-interaction]");
      if (!action || action.disabled) return;
      const opened = window.LifeRPGStoryUI?.openWorldInteraction?.(
        action.dataset.worldInteraction,
        action.dataset.worldInteractionId,
        action.dataset.worldPersonId || null
      );
      if (opened) closeWorldLocation();
    });

    byId("closeClearOverlay").addEventListener("click", () => {
      els.clearOverlay.classList.add("hidden");
    });

    els.clearOverlay.addEventListener("click", event => {
      if (event.target === els.clearOverlay) {
        els.clearOverlay.classList.add("hidden");
      }
    });
  }

  function renderDateAndGreeting() {
    const now = new Date();

    els.dateLine.textContent = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(now).toUpperCase();

    const hour = now.getHours();

    if (hour < 12) {
      els.greeting.textContent = "Good morning.";
    } else if (hour < 18) {
      els.greeting.textContent = "Good afternoon.";
    } else {
      els.greeting.textContent = "Welcome home.";
    }
  }

  function renderAll() {
    renderResources();
    renderLoadout();
    renderHome();
    renderSocialPulse();
    renderExternalTaskSummary();
    renderStats();
    renderRealmCards();
    renderRealmFilters();
    renderQuestLibrary();
    renderWorld();
    renderMemories();
    renderGrowthOverview();
    renderDevArea();
    window.dispatchEvent(new CustomEvent("life-rpg:render"));
  }

  function renderResources() {
    const levelInfo = getLevelInfo(state.characterXP);
    const todayCount = getTodayRewardActionCount();

    els.levelValue.textContent = levelInfo.level;
    els.storyEnergyValue.textContent = formatEnergy(state.storyEnergy);
    els.storyEnergyValueLarge.textContent = formatEnergy(state.storyEnergy);
    els.coinsValue.textContent = state.coins;

    els.xpLabel.textContent = `${levelInfo.intoLevel} / ${levelInfo.required}`;
    els.xpBar.style.width = `${levelInfo.percent}%`;

    els.characterStatusLine.textContent =
      `Civilian · Teacher · Level ${levelInfo.level}`;

    if (todayCount === 0) {
      els.rhythmLine.textContent = "One meaningful action is enough to make today count.";
    } else if (todayCount === 1) {
      els.rhythmLine.textContent = "Today already counts. Everything after this is extra.";
    } else {
      els.rhythmLine.textContent = `${todayCount} meaningful actions today. You do not need to maximize the bar.`;
    }

    const sharedApartmentIsHome = Boolean(state.flags?.SHARED_APARTMENT_IS_HOME || state.flags?.DYNARIOT_MOVE_IN_COMPLETE);
    els.homeSubtitle.textContent = sharedApartmentIsHome
      ? "The shape of home has changed. Your real-life quests still decide how Luca grows."
      : "You do not have to win the whole day. Pick the next thing that fits the life you actually have.";
  }

  function renderLoadout() {
    const selected = getAllQuests()
      .filter(quest => state.selectedQuestIds.includes(quest.id))
      .sort((a, b) => (ENERGY_RANK[a.energy] ?? 99) - (ENERGY_RANK[b.energy] ?? 99));

    els.loadoutCount.textContent = `${selected.length} selected`;
    els.emptyLoadout.classList.toggle("hidden", selected.length > 0);
    els.loadout.classList.toggle("hidden", selected.length === 0);

    if (!selected.length) {
      els.loadout.innerHTML = "";
      return;
    }

    els.loadout.innerHTML = selected.map(loadoutQuestHtml).join("");
    bindQuestButtons(els.loadout);
  }

  function loadoutQuestHtml(quest) {
    const todayUnits = getTodayUnitsForQuest(quest.id);
    const target = questTarget(quest);
    const batch = isBatchQuest(quest);
    const batchProgress = batch ? batchQuestProgress(quest) : null;
    const displayedUnits = batch ? batchProgress.remainder : todayUnits;
    const progress = Math.min(100, (displayedUnits / target) * 100);
    const availability = getQuestAvailability(quest);
    const stat = quest.stat;

    return `
      <article class="quest-row" data-priority="${escapeHtml(energyStyleKey(quest))}">
        <div class="quest-accent"></div>

        <div class="quest-main">
          <div class="quest-meta">
            <span>${escapeHtml(quest.energy || "Normal")}</span>
            <span>${escapeHtml(quest.realm)}</span>
            <span>${escapeHtml(quest.frequency || "Repeatable")}</span>
          </div>

          <div class="quest-title">${escapeHtml(quest.name)}</div>

          <div class="quest-reward-line">
            <span>${batch ? `${trimNumber(displayedUnits)} / ${trimNumber(target)} ${escapeHtml(questUnitLabel(quest))} to next reward` : `${trimNumber(todayUnits)} / ${trimNumber(target)} ${escapeHtml(questUnitLabel(quest))}`}</span>
            <span>⚔️ ${Number(quest.xp || 0)} XP${batch ? ` · ${formatEnergy(Number(quest.storyEnergyAtTarget || 0))} 🔥 / batch` : ""}</span>
            <span>${STAT_META[stat]?.icon || "✨"} ${escapeHtml(STAT_META[stat]?.label || stat)}</span>
            ${availability.available ? "" : `<span>⏳ ${escapeHtml(availability.reason)}</span>`}
          </div>

          <div class="progress" style="margin-top:9px">
            <span style="width:${progress}%"></span>
          </div>
        </div>

        <div class="quest-actions">
          <button class="primary-button complete-quest-button" data-quest-id="${quest.id}" ${availability.available ? "" : "disabled"}>${availability.available ? "Log" : "Waiting"}</button>
          <button class="secondary-button remove-loadout-button" data-quest-id="${quest.id}">Remove</button>
        </div>
      </article>
    `;
  }

  function renderHome() {
    const sharedHome = Boolean(state.flags?.SHARED_APARTMENT_IS_HOME || state.flags?.DYNARIOT_MOVE_IN_COMPLETE);

    if (sharedHome) {
      els.homeName.textContent = "Shared Apartment";
      els.homeDescription.textContent =
        "The household has become part of Luca's everyday life. Who is around can change with time and story state.";

      els.roomGrid.innerHTML = [
        roomHtml("living", "🛋️", "Living Room", "Shared space"),
        roomHtml("kitchen", "☕", "Kitchen", "Shared space"),
        roomHtml("bedroom", "🌸", "Your Room", "Private"),
        roomHtml("balcony", "🌿", "Balcony", "Shared space")
      ].join("");
    } else {
      els.homeName.textContent = "Current Apartment";
      els.homeDescription.textContent =
        "Small, familiar, and unfortunately much too far from work.";

      els.roomGrid.innerHTML = [
        roomHtml("current-main", "🛋️", "Living Space", "Home"),
        roomHtml("current-desk", "📚", "Desk", "Work / hobbies"),
        roomHtml("current-kitchen", "☕", "Kitchen", "Home"),
        roomHtml("current-bed", "🌙", "Bedroom", "Private")
      ].join("");
    }

    els.roomGrid.querySelectorAll(".room-button").forEach(button => {
      button.addEventListener("click", () => {
        els.roomMessage.classList.remove("hidden");
        els.roomMessage.textContent = sharedHome
          ? "Social room content will activate after the private story pack introduces the household state."
          : "This is Luca's current home. The app can later let décor, routines and personal unlocks live here without spoiling future story locations.";
      });
    });
  }

  function roomHtml(id, icon, name, stateLabel) {
    return `
      <button class="room-button" data-room-id="${id}">
        <span class="room-icon">${icon}</span>
        <strong>${escapeHtml(name)}</strong>
        <small>${escapeHtml(stateLabel)}</small>
      </button>
    `;
  }

  function renderSocialPulse() {
    const knownContacts = Object.keys(state.contacts).filter(key => state.contacts[key]);

    if (!knownContacts.length) {
      els.socialPulse.innerHTML = `
        <div class="pulse-card">
          <span class="pulse-icon">✦</span>
          <div>
            <strong>Your social world can grow.</strong>
            <p>Contacts, messages and spontaneous interactions unlock through story and relationship history.</p>
          </div>
        </div>
      `;
      return;
    }

    els.socialPulse.innerHTML = `
      <div class="pulse-card">
        <span class="pulse-icon">💬</span>
        <div>
          <strong>${knownContacts.length} contact ${knownContacts.length === 1 ? "is" : "are"} available.</strong>
          <p>${state.devMode
            ? `Opaque contact state: ${knownContacts.join(", ")}`
            : "Someone you know can now appear in social systems. Exact future interactions remain hidden."}</p>
        </div>
      </div>
    `;
  }

  function renderStats() {
    const sorted = Object.entries(state.stats)
      .sort((a, b) => b[1] - a[1]);

    const mini = sorted.slice(0, 4);

    els.miniStats.innerHTML = mini.map(([key, xp]) => statTileHtml(key, xp)).join("");
    els.fullStats.innerHTML = Object.entries(state.stats)
      .map(([key, xp]) => fullStatHtml(key, xp))
      .join("");
  }

  function statTileHtml(key, xp) {
    const meta = STAT_META[key];
    const info = statLevelInfo(xp);

    return `
      <article class="stat-tile">
        <div class="stat-tile-header">
          <span>${meta.icon} ${meta.label}</span>
          <strong>Lv. ${info.level}</strong>
        </div>
        <div class="progress"><span style="width:${info.percent}%"></span></div>
        <small>${info.intoLevel} / ${info.required} XP</small>
      </article>
    `;
  }

  function fullStatHtml(key, xp) {
    const meta = STAT_META[key];
    const info = statLevelInfo(xp);

    return `
      <article class="full-stat-card">
        <div class="full-stat-header">
          <span>${meta.icon} <strong>${meta.label}</strong></span>
          <span>Lv. ${info.level}</span>
        </div>
        <div class="progress"><span style="width:${info.percent}%"></span></div>
        <small>${info.intoLevel} / ${info.required} XP</small>
      </article>
    `;
  }

  function renderRealmCards() {
    els.realmCards.innerHTML = Object.entries(state.realms)
      .map(([realm, xp]) => {
        const info = realmRankInfo(xp);
        return `
          <article class="realm-card">
            <div class="realm-card-heading-v181">
              <span>${REALM_META[realm]?.icon || "✦"} ${escapeHtml(realm)}</span>
              <strong>Rank ${info.level}</strong>
            </div>
            <div class="progress"><span style="width:${info.percent}%"></span></div>
            <small>${info.intoLevel} / ${info.required} XP to next rank</small>
          </article>
        `;
      })
      .join("");
  }

  function renderRealmFilters() {
    const realms = Object.keys(REALM_META);
    els.realmFilters.innerHTML = [
      `<button class="filter-chip ${activeRealmFilter === "All" ? "active" : ""}" data-realm-filter="All">All</button>`,
      ...realms.map(realm => `
        <button class="filter-chip ${activeRealmFilter === realm ? "active" : ""}" data-realm-filter="${escapeHtml(realm)}">
          ${REALM_META[realm].icon} ${escapeHtml(realm)}
        </button>
      `)
    ].join("");

    els.realmFilters.querySelectorAll("[data-realm-filter]").forEach(button => {
      button.addEventListener("click", () => {
        activeRealmFilter = button.dataset.realmFilter;
        renderRealmFilters();
        renderQuestLibrary();
      });
    });
  }

  function renderQuestLibrary() {
    const filtered = getAllQuests()
      .filter(quest => quest.manualStatus !== "Archived")
      .filter(quest => activeRealmFilter === "All" || quest.realm === activeRealmFilter)
      .filter(quest => !activeQuestSearch || quest.name.toLowerCase().includes(activeQuestSearch))
      .sort((a, b) => {
        const energyDiff = (ENERGY_RANK[a.energy] ?? 99) - (ENERGY_RANK[b.energy] ?? 99);
        return energyDiff || a.name.localeCompare(b.name);
      });

    if (!filtered.length) {
      els.questLibrary.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔎</span>
          <strong>No matching quests.</strong>
          <p>Try another Realm or search term.</p>
        </div>
      `;
      return;
    }

    els.questLibrary.innerHTML = filtered.map(quest => {
      const selected = state.selectedQuestIds.includes(quest.id);
      const todayUnits = getTodayUnitsForQuest(quest.id);
      const target = questTarget(quest);
      const availability = getQuestAvailability(quest);
      const variable = isVariableQuest(quest);
      const batch = isBatchQuest(quest);
      const coinPreview = questCoinBase(quest);
      const planningMinutes = questPlanningMinutes(quest);
      const effortLabel = planningEffortFromEnergy(quest.energy) === "low" ? "Low effort" : planningEffortFromEnergy(quest.energy) === "high" ? "High effort" : "Medium effort";
      const extraMeta = [effortLabel, planningMinutes ? `~${planningMinutes} min` : null, quest.hobbyLane, quest.questType].filter(Boolean);

      return `
        <article class="library-card ${selected ? "selected" : ""}">
          <div class="quest-meta">
            <span>${escapeHtml(quest.energy || "Normal")}</span>
            <span>${escapeHtml(quest.realm)}</span>
            <span>${escapeHtml(quest.frequency || "Repeatable")}</span>
            <span>${batch ? "Reward every N units" : variable ? "Variable by Units" : "Fixed"}</span>
          </div>

          <h3>${escapeHtml(quest.name)}</h3>

          <p class="card-copy">
            ${batch
              ? `${Number(quest.xp || 0)} XP + ${formatEnergy(Number(quest.storyEnergyAtTarget || 0))} 🔥 every ${trimNumber(target)} ${escapeHtml(questUnitLabel(quest))}. Partial progress carries over.`
              : variable
                ? `${Number(quest.xp || 0)} XP at ${trimNumber(target)} ${escapeHtml(questUnitLabel(quest))}. Actual XP scales with the units you log.`
                : `${Number(quest.xp || 0)} XP for completing the quest.`}
            ${quest.cooldownDays ? ` Cooldown: ${trimNumber(quest.cooldownDays)} day${Number(quest.cooldownDays) === 1 ? "" : "s"}.` : ""}
            ${extraMeta.length ? ` ${escapeHtml(extraMeta.join(" · "))}.` : ""}
          </p>

          <div class="quest-reward-line">
            <span>Today: ${trimNumber(todayUnits)} ${escapeHtml(questUnitLabel(quest))}</span>
            ${batch ? `<span>Next reward: ${trimNumber(batchQuestProgress(quest).remainder)} / ${trimNumber(target)}</span>` : ""}
            <span>🪙 ~${batch ? 0 : coinPreview}</span>
            <span>${STAT_META[quest.stat]?.icon || "✨"} ${escapeHtml(STAT_META[quest.stat]?.label || quest.stat)}</span>
            ${quest.offDutyDeck ? `<span>🌙 Off-Duty</span>` : ""}
          </div>

          <footer>
            <small class="muted">${availability.available
              ? (selected ? "In today's loadout" : "Ready")
              : escapeHtml(availability.reason)}</small>
            <div class="library-actions">
              <button
                class="secondary-button toggle-loadout-button ${selected ? "selected-button" : ""}"
                data-quest-id="${quest.id}">
                ${selected ? "✓ Today" : "+ Today"}
              </button>
              <button class="primary-button complete-quest-button" data-quest-id="${quest.id}" ${availability.available ? "" : "disabled"}>${availability.available ? "Log" : "Waiting"}</button>
            </div>
          </footer>
        </article>
      `;
    }).join("");

    bindQuestButtons(els.questLibrary);
  }

  function bindQuestButtons(container) {
    container.querySelectorAll(".complete-quest-button").forEach(button => {
      button.addEventListener("click", () => openCompleteDialog(button.dataset.questId));
    });

    container.querySelectorAll(".toggle-loadout-button").forEach(button => {
      button.addEventListener("click", () => toggleLoadout(button.dataset.questId));
    });

    container.querySelectorAll(".remove-loadout-button").forEach(button => {
      button.addEventListener("click", () => toggleLoadout(button.dataset.questId, false));
    });
  }

  function toggleLoadout(questId, forceState = null) {
    const currentlySelected = state.selectedQuestIds.includes(questId);
    const shouldSelect = forceState === null ? !currentlySelected : forceState;

    if (shouldSelect && !currentlySelected) {
      state.selectedQuestIds.push(questId);
    }

    if (!shouldSelect) {
      state.selectedQuestIds = state.selectedQuestIds.filter(id => id !== questId);
    }

    saveState();
    renderLoadout();
    renderQuestLibrary();
  }

  function resetCreateQuestForm(defaults = {}) {
    els.questForm.reset();
    byId("newQuestTarget").value = 1;
    byId("newQuestXP").value = 20;
    byId("newQuestUnitLabel").value = defaults.unitLabel || "task";
    byId("newQuestEnergy").value = defaults.energy || "Normal";
    byId("newQuestPlanningMinutes").value = Number.isFinite(Number(defaults.planningMinutes)) ? String(defaults.planningMinutes) : "20";
    byId("newQuestFrequency").value = defaults.frequency || "Repeatable";
    byId("newQuestXPMode").value = defaults.xpMode || "Fixed";
    byId("newQuestStoryEnergy").value = Number.isFinite(Number(defaults.storyEnergyAtTarget)) ? String(defaults.storyEnergyAtTarget) : "0.5";
    if (defaults.realm) byId("newQuestRealm").value = defaults.realm;
    if (defaults.stat) byId("newQuestStat").value = defaults.stat;
    updateQuestModeFields();
  }

  function updateQuestModeFields() {
    const mode = byId("newQuestXPMode")?.value || "Fixed";
    byId("newQuestBatchFields")?.classList.toggle("hidden", mode !== "Batch by Units");
  }

  function openCreateQuestDialog() {
    resetCreateQuestForm();
    els.questDialog.showModal();
    window.setTimeout(() => byId("newQuestName")?.focus(), 20);
  }

  function createQuestFromForm(addAnother = false) {
    if (!els.questForm.reportValidity()) return;

    const target = Number(byId("newQuestTarget").value);
    const xp = Number(byId("newQuestXP").value);

    const quest = {
      id: `q-custom-${Date.now()}`,
      custom: true,
      name: byId("newQuestName").value.trim(),
      realm: byId("newQuestRealm").value,
      xpMode: byId("newQuestXPMode").value,
      units: target,
      unitLabel: byId("newQuestUnitLabel").value.trim(),
      xp,
      frequency: byId("newQuestFrequency").value,
      cooldownDays: null,
      energy: byId("newQuestEnergy").value,
      planningEffort: planningEffortFromEnergy(byId("newQuestEnergy").value),
      planningMinutes: Math.max(1, Number(byId("newQuestPlanningMinutes")?.value || 20)),
      manualStatus: "Available",
      sessionSize: planningSessionLabel(Math.max(1, Number(byId("newQuestPlanningMinutes")?.value || 20))),
      offDutyDeck: false,
      hobbyLane: null,
      planningThemes: [],
      coinMultiplier: 1,
      questType: byId("newQuestXPMode").value === "Batch by Units" ? "Unit Batch" : null,
      storyEnergyAtTarget: byId("newQuestXPMode").value === "Batch by Units" ? Math.max(0, Number(byId("newQuestStoryEnergy")?.value || 0)) : 0,
      batchCarryOver: byId("newQuestXPMode").value === "Batch by Units",
      realmXpSource: "Quest",
      stat: byId("newQuestStat").value,
      statAtTarget: Math.max(1, Math.round(xp * .65))
    };

    state.customQuests.push(quest);
    state.selectedQuestIds.push(quest.id);

    saveState();
    renderAll();
    showToast("Quest created and added to today's loadout.");
    if (addAnother) {
      resetCreateQuestForm({
        realm: quest.realm,
        stat: quest.stat,
        energy: quest.energy,
        planningMinutes: quest.planningMinutes,
        frequency: quest.frequency,
        xpMode: quest.xpMode,
        unitLabel: quest.unitLabel,
        storyEnergyAtTarget: quest.storyEnergyAtTarget
      });
      window.setTimeout(() => byId("newQuestName")?.focus(), 20);
    } else {
      els.questDialog.close();
    }
  }

  function openCompleteDialog(questId) {
    const quest = getQuestById(questId);
    if (!quest) return;

    const availability = getQuestAvailability(quest);
    if (!availability.available) {
      showToast(availability.reason);
      return;
    }

    const target = questTarget(quest);
    const isVariable = isUnitQuest(quest);

    els.completeQuestId.value = quest.id;
    els.completeQuestTitle.textContent = quest.name;
    els.actualUnits.value = target;
    els.actualUnits.min = target < 1 ? "0.1" : "1";
    els.actualUnits.step = target < 1 ? "0.1" : "1";
    els.actualUnits.disabled = !isVariable;

    updateCompletePreview();
    els.completeDialog.showModal();
  }

  function updateCompletePreview() {
    const quest = getQuestById(els.completeQuestId.value);
    if (!quest) return;

    const target = questTarget(quest);
    const units = Math.max(.1, Number(els.actualUnits.value) || target);
    const reward = calculateQuestReward(quest, units);
    const progress = isBatchQuest(quest) ? reward.batchProgress : null;
    const batchNote = progress
      ? `<div class="library-minimal-note-v16"><span>↻</span><div><strong>${progress.earnedBatches ? `${progress.earnedBatches} reward batch${progress.earnedBatches === 1 ? "" : "es"} reached` : "Progress saved toward the next reward"}</strong><p>${trimNumber(progress.remainder)} / ${trimNumber(progress.batchSize)} ${escapeHtml(questUnitLabel(quest))} will remain after this log.</p></div></div>`
      : "";

    els.completePreview.innerHTML = `
      <div class="reward-box"><strong>${reward.xp}</strong><small>⚔️ XP</small></div>
      <div class="reward-box"><strong>${formatEnergy(reward.storyEnergy)}</strong><small>🔥 Story</small></div>
      <div class="reward-box"><strong>${reward.coins}</strong><small>🪙 Coins</small></div>
      <div class="reward-box"><strong>${reward.statXP}</strong><small>${STAT_META[quest.stat]?.icon || "✨"} Capability XP</small></div>
      ${batchNote}
    `;
  }

  function questStoryEnergyBase(quest, units) {
    if (isBatchQuest(quest)) {
      const progress = batchQuestProgress(quest, units);
      return floor2(Math.max(0, Number(quest.storyEnergyAtTarget || 0)) * progress.earnedBatches);
    }
    const base = {
      "Low Energy": 0.8,
      "Normal": 1.4,
      "Boss": 2.1
    }[quest.energy] ?? 1.4;
    if (!isVariableQuest(quest)) return base;
    const ratio = Math.max(0, Number(units || 0) / questTarget(quest));
    return floor2(base * Math.min(2.5, ratio));
  }

  function calculateQuestReward(quest, units) {
    const target = questTarget(quest);
    const batchProgress = isBatchQuest(quest) ? batchQuestProgress(quest, units) : null;
    const multiplier = batchProgress
      ? batchProgress.earnedBatches
      : isVariableQuest(quest)
        ? Math.max(0, units / target)
        : 1;

    const xp = Math.max(0, Math.round(Number(quest.xp || 0) * multiplier));
    const statXP = Math.max(0, Math.round(Number(quest.statAtTarget || 1) * multiplier));
    const coins = batchProgress ? 0 : Math.max(1, Math.round(questCoinBase(quest) * Math.min(multiplier, 2)));
    const preview = previewActivityReward({
      source: "quest",
      sourceId: quest.id,
      label: quest.name,
      realm: quest.realm,
      capability: quest.stat,
      xp,
      realmXP: xp,
      statXP,
      coins,
      storyEnergyBase: questStoryEnergyBase(quest, units),
      dedupeFamily: dedupeFamilyForQuest(quest)
    });

    return { ...preview, requestedXP: xp, requestedStatXP: statXP, requestedCoins: coins, batchProgress };
  }

  function completeQuest(questId, units) {
    const quest = getQuestById(questId);
    if (!quest) return;

    const availability = getQuestAvailability(quest);
    if (!availability.available) {
      showToast(availability.reason);
      return;
    }

    const normalizedUnits = isUnitQuest(quest)
      ? Math.max(.1, Number(units) || questTarget(quest))
      : questTarget(quest);
    const baseReward = calculateQuestReward(quest, normalizedUnits);
    const shouldAward = !isBatchQuest(quest) || Number(baseReward.batchProgress?.earnedBatches || 0) > 0;
    const reward = shouldAward ? awardActivity({
      source: "quest",
      sourceId: quest.id,
      label: quest.name,
      realm: quest.realm,
      capability: quest.stat,
      xp: baseReward.requestedXP,
      realmXP: baseReward.requestedXP,
      statXP: baseReward.requestedStatXP,
      coins: baseReward.requestedCoins,
      storyEnergyBase: questStoryEnergyBase(quest, normalizedUnits),
      dedupeFamily: dedupeFamilyForQuest(quest),
      metadata: { units: normalizedUnits, unitLabel: questUnitLabel(quest), batchCount: baseReward.batchProgress?.earnedBatches || 0 }
    }) : { xp: 0, realmXP: 0, statXP: 0, storyEnergy: 0, rawStoryEnergy: 0, coins: 0, eventId: null, deduped: false };
    if (baseReward.batchProgress) reward.batchProgress = baseReward.batchProgress;

    state.completionLog.push({
      id: `log-${Date.now()}`,
      questId: quest.id,
      questName: quest.name,
      realm: quest.realm,
      units: normalizedUnits,
      unitLabel: questUnitLabel(quest),
      xp: reward.xp,
      stat: quest.stat,
      statXP: reward.statXP,
      storyEnergy: reward.storyEnergy,
      rawStoryEnergy: reward.rawStoryEnergy,
      coins: reward.coins,
      rewardEventId: reward.eventId,
      deduped: reward.deduped,
      batchCount: Number(reward.batchProgress?.earnedBatches || 0),
      batchRemainder: Number(reward.batchProgress?.remainder || 0),
      at: new Date().toISOString()
    });

    applyHiddenEngineChecks();
    saveState();
    renderAll();
    showQuestClear(quest, reward);
  }

  function openExternalTaskDialog() {
    if (!els.externalTaskDialog) return;
    els.externalTaskName.value = "";
    els.externalTaskEffort.value = "Normal";
    els.externalTaskRealm.value = "Work";
    if (els.externalTaskChainStatus) {
      els.externalTaskChainStatus.textContent = "";
      els.externalTaskChainStatus.classList.add("hidden");
    }
    updateExternalTaskPreview();
    els.externalTaskDialog.showModal();
  }

  function showExternalTaskChainStatus({ label, reward }) {
    if (!els.externalTaskChainStatus || !reward) return;
    els.externalTaskChainStatus.textContent = `✓ ${label} saved · +${formatEnergy(reward.storyEnergy)} 🔥 · +${reward.xp} XP. Ready for another.`;
    els.externalTaskChainStatus.classList.remove("hidden");
  }

  function externalTaskStatForRealm(realm) {
    const map = {
      Work: "confidence",
      Health: "wellbeing",
      Recovery: "wellbeing",
      Home: "wellbeing",
      Japanese: "japanese",
      Knowledge: "knowledge",
      Hobbies: "creativity"
    };
    return map[realm] || "confidence";
  }

  function calculateExternalTaskReward(effort, realm = "Work") {
    const base = {
      "Low Energy": { xp: 10, statXP: 7, coins: 1, storyEnergyBase: 0.8 },
      "Normal": { xp: 20, statXP: 13, coins: 2, storyEnergyBase: 1.4 },
      "Boss": { xp: 35, statXP: 23, coins: 4, storyEnergyBase: 2.1 }
    }[effort] || { xp: 20, statXP: 13, coins: 2, storyEnergyBase: 1.4 };
    const stat = externalTaskStatForRealm(realm);
    return {
      ...base,
      ...previewActivityReward({
        source: "external",
        label: `${effort} external task`,
        realm,
        capability: stat,
        xp: base.xp,
        realmXP: base.xp,
        statXP: base.statXP,
        coins: base.coins,
        storyEnergyBase: base.storyEnergyBase
      })
    };
  }

  function updateExternalTaskPreview() {
    if (!els.externalTaskPreview) return;
    const effort = els.externalTaskEffort?.value || "Normal";
    const realm = els.externalTaskRealm?.value || "Work";
    const stat = externalTaskStatForRealm(realm);
    const reward = calculateExternalTaskReward(effort, realm);

    els.externalTaskPreview.innerHTML = `
      <div class="reward-box"><strong>${reward.xp}</strong><small>⚔️ XP</small></div>
      <div class="reward-box"><strong>${formatEnergy(reward.storyEnergy)}</strong><small>🔥 Story</small></div>
      <div class="reward-box"><strong>${reward.coins}</strong><small>🪙 Coins</small></div>
      <div class="reward-box"><strong>${reward.statXP}</strong><small>${STAT_META[stat]?.icon || "✨"} Capability XP</small></div>
    `;
  }

  function completeExternalTask({ showOverlay = true } = {}) {
    const effort = els.externalTaskEffort?.value || "Normal";
    const realm = els.externalTaskRealm?.value || "Work";
    const stat = externalTaskStatForRealm(realm);
    const baseReward = calculateExternalTaskReward(effort, realm);
    const label = els.externalTaskName?.value.trim() || `${effort} external task`;
    const sourceId = `external-${Date.now()}`;
    const reward = awardActivity({
      source: "external",
      sourceId,
      label,
      realm,
      capability: stat,
      xp: baseReward.xp,
      realmXP: baseReward.xp,
      statXP: baseReward.statXP,
      coins: baseReward.coins,
      storyEnergyBase: baseReward.storyEnergyBase,
      metadata: { effort }
    });

    state.externalCompletionLog.push({
      id: sourceId,
      name: label,
      effort,
      realm,
      xp: reward.xp,
      stat,
      statXP: reward.statXP,
      storyEnergy: reward.storyEnergy,
      rawStoryEnergy: reward.rawStoryEnergy,
      coins: reward.coins,
      rewardEventId: reward.eventId,
      source: "manual-external",
      at: new Date().toISOString()
    });

    applyHiddenEngineChecks();
    saveState();
    renderAll();
    if (showOverlay) showQuestClear({ name: label, stat }, reward);
    return { label, reward, stat };
  }

  function renderExternalTaskSummary() {
    if (!els.externalTaskTodaySummary) return;
    const today = getTodayExternalCompletions();

    if (!today.length) {
      els.externalTaskTodaySummary.innerHTML = `<span class="external-task-zero">No external task rewards claimed today.</span>`;
      return;
    }

    const xp = today.reduce((sum, item) => sum + Number(item.xp || 0), 0);
    els.externalTaskTodaySummary.innerHTML = `<strong>${today.length} task${today.length === 1 ? "" : "s"}</strong><span> · +${xp} XP claimed today</span>`;
  }

  function applyHiddenEngineChecks() {
    ensureProgressionState();
    const rewarded = state.rewardLedger.events.filter(event => !event.duplicate);
    const strengthActivityCount = rewarded.filter(event => event.capability === "strength").length;
    if (strengthActivityCount >= 3) state.flags.ACTIVITY_PATTERN_A = true;

    const japaneseCount = rewarded.filter(event => event.realm === "Japanese").length;
    if (japaneseCount >= 3) state.flags.ACTIVITY_PATTERN_B = true;

    // Growth can influence future story checks, but locations remain narrative unlocks.
    if (state.flags.LOCATION_SHARED_APARTMENT_INTRODUCED) state.locations.sharedApartment = true;
    if (state.flags.MINA_REAL_COFFEE_COMPLETE) state.locations.cafe = true;
    if (state.flags.MINA_KNOWS_COMMUTE_BAD) state.locations.station = true;
    if (state.flags.LOCATION_GYM_INTRODUCED) state.locations.gym = true;
    if (state.flags.LOCATION_AGENCY_INTRODUCED) state.locations.agency = true;
  }

  function showQuestClear(quest, reward) {
    els.clearQuestName.textContent = quest.name;
    els.clearRewards.innerHTML = `
      <span>+${reward.xp} ⚔️ XP</span>
      <span>+${formatEnergy(reward.storyEnergy)} 🔥 Story</span>
      <span>+${reward.coins} 🪙</span>
      <span>+${reward.statXP} ${STAT_META[quest.stat]?.icon || "✨"} ${escapeHtml(STAT_META[quest.stat]?.label || quest.stat)}</span>
      ${reward.deduped ? `<span>↺ Already counted from a linked activity log.</span>` : ""}
      ${reward.batchProgress ? `<span>↻ ${trimNumber(reward.batchProgress.remainder)} / ${trimNumber(reward.batchProgress.batchSize)} ${escapeHtml(questUnitLabel(quest))} toward the next batch</span>` : ""}
    `;
    els.clearOverlay.classList.remove("hidden");
  }

  function worldDaypartLabel() {
    const hour = new Date().getHours();
    if (hour < 6) return "Late night";
    if (hour < 11) return "Morning";
    if (hour < 16) return "Daytime";
    if (hour < 21) return "Evening";
    return "Night";
  }

  function closeWorldLocation() {
    els.worldLocationOverlay?.classList.add("hidden");
    document.body.classList.remove("world-location-open");
  }

  function openWorldLocation(locationKey) {
    const meta = LOCATION_META[locationKey];
    if (!meta || !state.locations?.[locationKey]) return false;
    const details = window.LifeRPGStoryUI?.getWorldLocationDetails?.(locationKey) || { available: false, presences: [], actions: [] };
    window.LifeRPGStoryUI?.recordWorldVisit?.(locationKey);

    const movedIntoSharedHome = Boolean(state.flags?.SHARED_APARTMENT_IS_HOME || state.flags?.DYNARIOT_MOVE_IN_COMPLETE);
    const displayMeta = locationKey === "currentHome" && movedIntoSharedHome
      ? { ...meta, label: "Previous Apartment", description: "Luca’s old apartment — familiar, inconveniently far away, and no longer home." }
      : meta;

    if (els.worldLocationHero) {
      els.worldLocationHero.style.backgroundImage = displayMeta.art
        ? `linear-gradient(180deg, rgba(45,25,42,.04), rgba(45,25,42,.52)), url("${displayMeta.art}")`
        : "";
    }
    if (els.worldLocationIcon) els.worldLocationIcon.textContent = displayMeta.icon || "✦";
    if (els.worldLocationTitle) els.worldLocationTitle.textContent = displayMeta.label;
    if (els.worldLocationDescription) els.worldLocationDescription.textContent = displayMeta.description;
    if (els.worldLocationStatus) {
      els.worldLocationStatus.textContent = `${worldDaypartLabel()} · ${details.presences?.length ? `${details.presences.length} familiar ${details.presences.length === 1 ? "face" : "faces"} around` : details.available ? "something is happening" : "quiet right now"}`;
    }

    if (els.worldLocationPresenceList) {
      const presences = details.presences || [];
      els.worldLocationPresenceList.innerHTML = presences.length
        ? presences.map(person => `
            <article class="world-presence-card">
              ${person.cardAsset ? `<img src="${escapeHtml(person.cardAsset)}" alt="" />` : `<span class="world-presence-fallback">${escapeHtml(person.icon || "♡")}</span>`}
              <div><small>HERE NOW</small><strong>${escapeHtml(person.name)}</strong><p>${escapeHtml(person.hint || "You could say hi.")}</p></div>
            </article>
          `).join("")
        : `<div class="world-location-quiet"><span>☁</span><div><strong>No familiar faces right now.</strong><p>You can still stop by. The world changes with story, time of day and what has already happened.</p></div></div>`;
    }

    if (els.worldLocationActions) {
      const actions = details.actions || [];
      els.worldLocationActions.innerHTML = actions.length
        ? actions.map((action, index) => `
            <button class="${index === 0 ? "primary-button" : "secondary-button"} world-location-action" type="button"
              data-world-interaction="${escapeHtml(action.kind)}"
              data-world-interaction-id="${escapeHtml(action.id || "")}" 
              data-world-person-id="${escapeHtml(action.personId || "")}">
              <span>${escapeHtml(action.icon || "✦")}</span>
              <span><strong>${escapeHtml(action.label)}</strong><small>${escapeHtml(action.note || "Free · autosaved")}</small></span>
            </button>
          `).join("")
        : `<div class="world-location-no-actions"><strong>Nothing you need to do.</strong><span>This place is part of your world even when it is quiet.</span></div>`;
    }

    els.worldLocationOverlay?.classList.remove("hidden");
    document.body.classList.add("world-location-open");
    return true;
  }

  function renderWorld() {
    if (!els.locationGrid) return;
    els.locationGrid.innerHTML = Object.entries(LOCATION_META)
      .map(([key, meta]) => {
        const movedIntoSharedHome = Boolean(state.flags?.SHARED_APARTMENT_IS_HOME || state.flags?.DYNARIOT_MOVE_IN_COMPLETE);
        const displayMeta = key === "currentHome" && movedIntoSharedHome
          ? { ...meta, label: "Previous Apartment", description: "Luca’s old apartment — familiar, inconveniently far away, and no longer home." }
          : meta;
        const unlocked = Boolean(state.locations[key]);
        const worldStatus = unlocked ? window.LifeRPGStoryUI?.getWorldLocationDetails?.(key) : null;
        const presences = worldStatus?.presences || [];
        const hasActivity = Boolean(worldStatus?.available);
        const art = unlocked && displayMeta.art ? `<div class="location-card-art"><img src="${escapeHtml(displayMeta.art)}" alt="" /></div>` : "";
        const presence = unlocked
          ? presences.length
            ? `<div class="location-presence is-active"><div class="location-presence-stack">${presences.slice(0, 3).map(person => person.cardAsset ? `<img src="${escapeHtml(person.cardAsset)}" alt="" />` : `<span>${escapeHtml(person.icon || "♡")}</span>`).join("")}</div><span><strong>${escapeHtml(presences.map(person => person.name).join(" · "))}</strong><small>${escapeHtml(worldStatus.summary || "Someone familiar is here right now.")}</small></span></div>`
            : hasActivity
              ? `<div class="location-presence is-active"><span>✦</span><span><strong>Something is happening</strong><small>${escapeHtml(worldStatus.summary || "A small free moment is available here.")}</small></span></div>`
              : `<div class="location-presence is-quiet"><span>☁</span><span><strong>Quiet right now</strong><small>Still visitable · availability changes with story and time of day.</small></span></div>`
          : "";

        return `
          <article class="location-card ${unlocked ? "unlocked" : "locked"}">
            ${unlocked ? "" : `<span class="location-lock">🔒 Unknown</span>`}
            ${art}
            <div class="location-card-copy">
              <span class="location-icon">${unlocked ? displayMeta.icon : "✦"}</span>
              <strong>${escapeHtml(unlocked ? displayMeta.label : "Unknown Location")}</strong>
              <small>${escapeHtml(unlocked ? displayMeta.description : "This place has not been introduced in Luca's story yet.")}</small>
              ${presence}
              ${unlocked ? `<button class="secondary-button location-visit-button" type="button" data-world-location="${escapeHtml(key)}">${hasActivity ? "Visit · something's here" : "Visit"}</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderMemories() {
    if (!state.memories.length) {
      els.memoryList.className = "empty-state compact";
      els.memoryList.textContent = "Nothing has been added to Memories yet.";
      return;
    }

    els.memoryList.className = "";
    els.memoryList.innerHTML = state.memories
      .map(memoryId => `
        <div class="soft-callout" style="margin-top:8px">
          ${state.devMode ? escapeHtml(memoryId) : "✦ Unlocked memory"}
        </div>
      `)
      .join("");
  }

  function renderGrowthOverview() {
    const info = getLevelInfo(state.characterXP);
    els.profileLevel.textContent = info.level;
    els.profileXP.textContent = state.characterXP;
    els.profileEnergy.textContent = formatEnergy(state.storyEnergy);
    els.profileDays.textContent = getAdventureDayCount();
  }

  function renderDevArea() {
    els.devModeToggle.checked = Boolean(state.devMode);
    els.devControls.classList.toggle("hidden", !state.devMode);

    if (!state.devMode) {
      els.devOutput.classList.add("hidden");
      els.devOutput.textContent = "";
      return;
    }

    els.devOutput.classList.remove("hidden");
    renderDevOutput();
  }

  function renderDevOutput() {
    if (!state.devMode) return;

    els.devOutput.textContent = JSON.stringify({
      engineVersion: state.version,
      flags: state.flags,
      locations: state.locations,
      contacts: state.contacts,
      opaqueMemories: state.memories,
      questCatalogCount: getAllQuests().length,
      importedQuestCount: IMPORTED_QUESTS.length,
      customQuestCount: state.customQuests.length,
      selectedQuestIds: state.selectedQuestIds,
      completionCount: state.completionLog.length,
      externalCompletionCount: state.externalCompletionLog.length,
      rewardLedgerCount: state.rewardLedger?.events?.length || 0,
      todayRewardActionCount: getTodayRewardActionCount(),
      todayStoryEnergyEarned: storyEnergyEarnedOnDate(new Date()),
      storyProgression: {
        schemaVersion: 1,
        characterLevel: getLevelInfo(state.characterXP).level,
        capabilities: Object.fromEntries(Object.keys(STAT_META).map(key => [key, statLevelInfo(state.stats?.[key] || 0).level])),
        realmRanks: Object.fromEntries(Object.keys(REALM_META).map(realm => [realm, realmRankInfo(state.realms?.[realm] || 0).level]))
      },
      progressionSchemaVersion: state.progressionSchemaVersion,
      todayCompletionCount: getTodayCompletions().length,
      todayExternalCompletionCount: getTodayExternalCompletions().length
    }, null, 2);
  }

  function renderQuestLibraryAfterAction() {
    renderQuestLibrary();
    renderLoadout();
  }

  function getQuestAvailability(quest) {
    if (!quest) return { available: false, reason: "Quest unavailable" };
    if (quest.manualStatus && quest.manualStatus !== "Available") {
      return { available: false, reason: quest.manualStatus };
    }

    const logs = state.completionLog
      .filter(log => log.questId === quest.id)
      .sort((a, b) => new Date(b.at) - new Date(a.at));

    if (quest.frequency === "One-Time" && logs.length > 0) {
      return { available: false, reason: "Completed" };
    }

    if (quest.frequency === "Daily" && logs.some(log => isSameLocalDay(new Date(log.at), new Date()))) {
      return { available: false, reason: "Done today" };
    }

    if (quest.frequency === "Weekly" && logs.some(log => localWeekKey(new Date(log.at)) === localWeekKey(new Date()))) {
      return { available: false, reason: "Done this week" };
    }

    if (Number(quest.cooldownDays) > 0 && logs.length > 0) {
      const ready = startOfLocalDay(new Date(logs[0].at));
      ready.setDate(ready.getDate() + Number(quest.cooldownDays));

      if (startOfLocalDay(new Date()) < ready) {
        const label = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(ready);
        return { available: false, reason: `Ready ${label}` };
      }
    }

    return { available: true, reason: "Ready" };
  }

  function isSameLocalDay(a, b) {
    return localDateKey(a) === localDateKey(b);
  }

  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function localWeekKey(date) {
    const d = startOfLocalDay(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - day);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function progressionLevelInfo(totalXP, requirementFn) {
    let level = 1;
    let remaining = Math.max(0, Number(totalXP || 0));
    let required = requirementFn(level);

    while (remaining >= required && level < 999) {
      remaining -= required;
      level += 1;
      required = requirementFn(level);
    }

    return {
      level,
      intoLevel: Math.round(remaining),
      required,
      percent: Math.min(100, required > 0 ? (remaining / required) * 100 : 0)
    };
  }

  function getLevelInfo(totalXP) {
    return progressionLevelInfo(totalXP, xpRequiredForLevel);
  }

  function xpRequiredForLevel(level) {
    return 100 + (level - 1) * 35;
  }

  function roundToFive(value) {
    return Math.max(5, Math.round(Number(value || 0) / 5) * 5);
  }

  function capabilityXpRequiredForLevel(level) {
    const n = Math.max(0, Number(level || 1) - 1);
    return roundToFive(100 * Math.pow(1.30, n));
  }

  function statLevelInfo(xp) {
    return progressionLevelInfo(xp, capabilityXpRequiredForLevel);
  }

  function realmXpRequiredForRank(rank) {
    const n = Math.max(0, Number(rank || 1) - 1);
    return roundToFive(120 * Math.pow(1.25, n));
  }

  function realmRankInfo(xp) {
    return progressionLevelInfo(xp, realmXpRequiredForRank);
  }

  function getTodayCompletions() {
    const today = localDateKey(new Date());

    return state.completionLog.filter(log =>
      localDateKey(new Date(log.at)) === today
    );
  }

  function getTodayExternalCompletions() {
    const today = localDateKey(new Date());
    return state.externalCompletionLog.filter(log =>
      localDateKey(new Date(log.at)) === today
    );
  }

  function getTodayRewardActionCount() {
    ensureProgressionState();
    const today = localDateKey(new Date());
    return state.rewardLedger.events.filter(event => {
      if (rewardEventDateKey(event) !== today || event.duplicate || event.progressionRelevant === false) return false;
      return Number(event.xp || 0) > 0 || Number(event.storyEnergy || 0) > 0 || Number(event.coins || 0) > 0;
    }).length;
  }

  function getTodayUnitsForQuest(questId) {
    return getTodayCompletions()
      .filter(log => log.questId === questId)
      .reduce((sum, log) => sum + Number(log.units || 0), 0);
  }

  function allActivityDateKeys() {
    const values = [];
    const pushAt = value => {
      const date = new Date(value || 0);
      if (Number.isFinite(date.getTime())) values.push(localDateKey(date));
    };
    (state.completionLog || []).forEach(log => pushAt(log.at));
    (state.externalCompletionLog || []).forEach(log => pushAt(log.at));
    (state.habits?.completions || []).forEach(log => pushAt(log.timestamp || `${log.date}T12:00:00`));
    (state.sideAdventures?.logs || []).forEach(log => pushAt(log.at));
    (state.bookLibrary?.logs || []).forEach(log => pushAt(log.at));
    (state.gameLibrary?.logs || []).forEach(log => pushAt(log.at));
    return values;
  }

  function getAdventureDayCount() {
    return new Set(allActivityDateKeys()).size;
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function trimNumber(value) {
    const number = Number(value);
    return number % 1 === 0 ? String(number) : number.toFixed(1);
  }

  function floor2(value) {
    return Math.floor((Number(value || 0) + 1e-9) * 100) / 100;
  }

  function formatEnergy(value) {
    const number = floor2(value);
    return number % 1 === 0 ? String(number) : number.toFixed(2).replace(/0$/, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2600);
  }

  window.LifeRPGApp = {
    getState: () => state,
    getStorageKey: () => STORAGE_KEY,
    getQuestCatalog: () => getAllQuests().map(quest => ({ ...quest })),
    getQuestById,
    migrateQuestId: migrateLegacyQuestId,
    getQuestAvailability,
    getCapabilityInfo: key => statLevelInfo(state.stats?.[key] || 0),
    getRealmRankInfo: realm => realmRankInfo(state.realms?.[realm] || 0),
    getProgressionSnapshot,
    getActivityCount,
    evaluateProgressionCondition,
    capabilityXpRequiredForLevel,
    realmXpRequiredForRank,
    inferCapability,
    dedupeFamilyForQuest,
    previewActivityReward,
    awardActivity,
    getTodayStoryEnergyEarned: () => storyEnergyEarnedOnDate(new Date()),
    getTodayRewardActionCount,
    formatEnergy,
    saveState,
    replaceState,
    renderAll,
    renderWorld,
    showView,
    showToast,
    escapeHtml
  };
})();
