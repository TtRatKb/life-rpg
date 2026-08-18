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
    japanese: { label: "Japanese", icon: "🇯🇵" }
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

  const IMPORTED_QUESTS = (window.LIFE_RPG_QUESTS || []).map(normalizeImportedQuest);

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
      statAtTarget: Math.max(1, Math.round(Number(quest.xp || 0) * .35))
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
    const mappedName = LEGACY_QUEST_ID_MAP[id];
    return mappedName ? importedQuestIdByName(mappedName) || id : id;
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
      manualStatus: "Available",
      sessionSize: null,
      offDutyDeck: false,
      hobbyLane: null,
      planningThemes: [],
      coinMultiplier: Number(quest.coinMultiplier || 1),
      questType: null,
      realmXpSource: "Quest",
      stat: quest.stat || "knowledge",
      statAtTarget: Number(quest.statAtTarget || Math.max(1, Math.round(Number(quest.xpAtTarget || 20) * .35)))
    };
  }

  function legacyPriorityToEnergy(priority) {
    if (priority === "Low Energy") return "Low Energy";
    if (priority === "Main" || priority === "Must Do") return "Boss";
    return "Normal";
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

  function questUnitLabel(quest) {
    return quest.unitLabel || (quest.xpMode === "Variable by Units" ? "units" : "completion");
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
      description: "Familiar, private, and much too far from work."
    },
    school: {
      label: "School",
      icon: "🏫",
      description: "Luca's real daily world: lessons, colleagues, students and everything that comes with teaching."
    },
    sharedApartment: {
      label: "Shared Apartment",
      icon: "🛋️",
      description: "A place that can only become home after the story makes it part of Luca's life."
    },
    agency: {
      label: "DynaRiot Agency",
      icon: "💥",
      description: "Not part of Luca's ordinary world yet."
    },
    gym: {
      label: "Training Gym",
      icon: "🏋️",
      description: "A location that should unlock through narrative introduction."
    },
    cafe: {
      label: "Unknown Location",
      icon: "☕",
      description: "A place Luca has not discovered yet."
    },
    district: {
      label: "Unknown Location",
      icon: "🌙",
      description: "A part of the world not yet introduced."
    }
  };


  function defaultState() {
    return {
      version: 3,
      characterXP: 0,
      coins: 0,
      storyEnergy: 0,
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
      memories: [],
      flags: {
        STORY_ENGINE_READY: true
      },
      contacts: {},
      locations: {
        currentHome: true,
        school: true,
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

    miniStats: byId("miniStats"),
    questLibrary: byId("questLibrary"),
    realmFilters: byId("realmFilters"),
    questSearch: byId("questSearch"),
    locationGrid: byId("locationGrid"),
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

    storyTestResult: byId("storyTestResult"),

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
      version: 3,
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
      memories: Array.isArray(saved.memories) ? saved.memories : []
    };
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

    state.selectedQuestIds = (Array.isArray(state.selectedQuestIds)
      ? state.selectedQuestIds
      : defaultState().selectedQuestIds)
      .map(migrateLegacyQuestId)
      .filter((id, index, ids) => id && ids.indexOf(id) === index)
      .filter(id => Boolean(getQuestById(id)));

    state.completionLog = (state.completionLog || []).map(log => ({
      ...log,
      questId: migrateLegacyQuestId(log.questId)
    }));

    state.version = 3;
    saveState();
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderDevOutput();
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
      createQuestFromForm();
    });

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

    byId("storyTestButton").addEventListener("click", testStoryUnlockFlow);

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
    renderStats();
    renderRealmCards();
    renderRealmFilters();
    renderQuestLibrary();
    renderWorld();
    renderMemories();
    renderGrowthOverview();
    renderDevArea();
  }

  function renderResources() {
    const levelInfo = getLevelInfo(state.characterXP);
    const todayCount = getTodayCompletions().length;

    els.levelValue.textContent = levelInfo.level;
    els.storyEnergyValue.textContent = state.storyEnergy;
    els.storyEnergyValueLarge.textContent = state.storyEnergy;
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
      els.rhythmLine.textContent = `${todayCount} quest clears today. You do not need to maximize the bar.`;
    }

    els.homeSubtitle.textContent = state.locations.sharedApartment
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
    const progress = Math.min(100, (todayUnits / target) * 100);
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
            <span>${trimNumber(todayUnits)} / ${trimNumber(target)} ${escapeHtml(questUnitLabel(quest))}</span>
            <span>⚔️ ${Number(quest.xp || 0)} XP</span>
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
    const sharedHome = Boolean(state.locations.sharedApartment);

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
      .map(([realm, xp]) => `
        <article class="realm-card">
          <span>${REALM_META[realm]?.icon || "✦"} ${escapeHtml(realm)}</span>
          <strong>${Math.round(xp)} XP</strong>
        </article>
      `)
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
      const variable = quest.xpMode === "Variable by Units";
      const coinPreview = questCoinBase(quest);
      const extraMeta = [quest.sessionSize, quest.hobbyLane, quest.questType].filter(Boolean);

      return `
        <article class="library-card ${selected ? "selected" : ""}">
          <div class="quest-meta">
            <span>${escapeHtml(quest.energy || "Normal")}</span>
            <span>${escapeHtml(quest.realm)}</span>
            <span>${escapeHtml(quest.frequency || "Repeatable")}</span>
            <span>${variable ? "Variable by Units" : "Fixed"}</span>
          </div>

          <h3>${escapeHtml(quest.name)}</h3>

          <p class="card-copy">
            ${variable
              ? `${Number(quest.xp || 0)} XP at ${trimNumber(target)} ${escapeHtml(questUnitLabel(quest))}. Actual XP scales with the units you log.`
              : `${Number(quest.xp || 0)} XP for completing the quest.`}
            ${quest.cooldownDays ? ` Cooldown: ${trimNumber(quest.cooldownDays)} day${Number(quest.cooldownDays) === 1 ? "" : "s"}.` : ""}
            ${extraMeta.length ? ` ${escapeHtml(extraMeta.join(" · "))}.` : ""}
          </p>

          <div class="quest-reward-line">
            <span>Today: ${trimNumber(todayUnits)} ${escapeHtml(questUnitLabel(quest))}</span>
            <span>🪙 ~${coinPreview}</span>
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

  function openCreateQuestDialog() {
    els.questForm.reset();
    byId("newQuestTarget").value = 1;
    byId("newQuestXP").value = 20;
    byId("newQuestUnitLabel").value = "task";
    byId("newQuestEnergy").value = "Normal";
    byId("newQuestFrequency").value = "Repeatable";
    byId("newQuestXPMode").value = "Fixed";
    els.questDialog.showModal();
  }

  function createQuestFromForm() {
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
      manualStatus: "Available",
      sessionSize: null,
      offDutyDeck: false,
      hobbyLane: null,
      planningThemes: [],
      coinMultiplier: 1,
      questType: null,
      realmXpSource: "Quest",
      stat: byId("newQuestStat").value,
      statAtTarget: Math.max(1, Math.round(xp * .35))
    };

    state.customQuests.push(quest);
    state.selectedQuestIds.push(quest.id);

    saveState();
    renderAll();
    els.questDialog.close();
    showToast("Quest created and added to today's loadout.");
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
    const isVariable = quest.xpMode === "Variable by Units";

    els.completeQuestId.value = quest.id;
    els.completeQuestTitle.textContent = quest.name;
    els.actualUnits.value = target;
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
    const reward = calculateQuestReward(quest, units, getTodayCompletions().length);

    els.completePreview.innerHTML = `
      <div class="reward-box"><strong>${reward.xp}</strong><small>⚔️ XP</small></div>
      <div class="reward-box"><strong>${reward.storyEnergy}</strong><small>🔥 Story</small></div>
      <div class="reward-box"><strong>${reward.coins}</strong><small>🪙 Coins</small></div>
      <div class="reward-box"><strong>${reward.statXP}</strong><small>${STAT_META[quest.stat]?.icon || "✨"} Stat XP</small></div>
    `;
  }

  function calculateQuestReward(quest, units, completedTodayCount) {
    const target = questTarget(quest);
    const multiplier = quest.xpMode === "Variable by Units"
      ? Math.max(0, units / target)
      : 1;

    const xp = Math.max(1, Math.round(Number(quest.xp || 0) * multiplier));
    const statXP = Math.max(1, Math.round(Number(quest.statAtTarget || 1) * multiplier));
    const coins = Math.max(1, Math.round(questCoinBase(quest) * Math.min(multiplier, 2)));

    // Story Energy deliberately has diminishing daily returns.
    // Recovery, hobby, health and low-energy quests use the same schedule.
    const schedule = [6, 5, 4];
    const storyEnergy = schedule[completedTodayCount] ?? 2;

    return { xp, statXP, coins, storyEnergy };
  }

  function completeQuest(questId, units) {
    const quest = getQuestById(questId);
    if (!quest) return;

    const availability = getQuestAvailability(quest);
    if (!availability.available) {
      showToast(availability.reason);
      return;
    }

    const normalizedUnits = quest.xpMode === "Variable by Units"
      ? Math.max(.1, Number(units) || questTarget(quest))
      : questTarget(quest);

    const reward = calculateQuestReward(
      quest,
      normalizedUnits,
      getTodayCompletions().length
    );

    state.characterXP += reward.xp;
    state.coins += reward.coins;
    state.storyEnergy += reward.storyEnergy;
    state.stats[quest.stat] = (state.stats[quest.stat] || 0) + reward.statXP;
    state.realms[quest.realm] = (state.realms[quest.realm] || 0) + reward.xp;

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
      coins: reward.coins,
      at: new Date().toISOString()
    });

    applyHiddenEngineChecks();
    saveState();
    renderAll();
    showQuestClear(quest, reward);
  }

  function applyHiddenEngineChecks() {
    const strengthActivityCount = state.completionLog
      .filter(log => log.stat === "strength")
      .length;

    if (strengthActivityCount >= 3) {
      state.flags.ACTIVITY_PATTERN_A = true;
    }

    const japaneseCount = state.completionLog
      .filter(log => log.realm === "Japanese")
      .length;

    if (japaneseCount >= 3) {
      state.flags.ACTIVITY_PATTERN_B = true;
    }

    // Stats alone do NOT unlock narrative locations.
    if (state.flags.LOCATION_SHARED_APARTMENT_INTRODUCED) {
      state.locations.sharedApartment = true;
    }

    if (state.flags.LOCATION_GYM_INTRODUCED) {
      state.locations.gym = true;
    }

    if (state.flags.LOCATION_AGENCY_INTRODUCED) {
      state.locations.agency = true;
    }
  }

  function showQuestClear(quest, reward) {
    els.clearQuestName.textContent = quest.name;
    els.clearRewards.innerHTML = `
      <span>+${reward.xp} ⚔️ XP</span>
      <span>+${reward.storyEnergy} 🔥 Story</span>
      <span>+${reward.coins} 🪙</span>
      <span>+${reward.statXP} ${STAT_META[quest.stat]?.icon || "✨"} ${escapeHtml(STAT_META[quest.stat]?.label || quest.stat)}</span>
    `;
    els.clearOverlay.classList.remove("hidden");
  }

  function renderWorld() {
    els.locationGrid.innerHTML = Object.entries(LOCATION_META)
      .map(([key, meta]) => {
        const unlocked = Boolean(state.locations[key]);

        return `
          <article class="location-card ${unlocked ? "unlocked" : "locked"}">
            ${unlocked ? "" : `<span class="location-lock">🔒 Unknown</span>`}
            <span class="location-icon">${unlocked ? meta.icon : "✦"}</span>
            <strong>${escapeHtml(unlocked ? meta.label : "Unknown Location")}</strong>
            <small>${escapeHtml(unlocked ? meta.description : "This place has not been introduced in Luca's story yet.")}</small>
          </article>
        `;
      })
      .join("");
  }

  function testStoryUnlockFlow() {
    const cost = 10;
    els.storyTestResult.classList.remove("hidden");

    if (state.storyEnergy < cost) {
      els.storyTestResult.textContent =
        `You need ${cost - state.storyEnergy} more Story Energy. A real scene would not charge for choices inside it.`;
      return;
    }

    state.storyEnergy -= cost;

    const testMemory = "SYSTEM_MEMORY_TEST_A";
    if (!state.memories.includes(testMemory)) {
      state.memories.push(testMemory);
    }

    state.flags.STORY_UNLOCK_FLOW_TESTED = true;

    saveState();
    renderAll();

    els.storyTestResult.textContent =
      "Unlock flow passed: Energy was spent, an opaque memory ID was written, and no future narrative text was exposed.";
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
    els.profileEnergy.textContent = state.storyEnergy;
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
      todayCompletionCount: getTodayCompletions().length
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

  function getLevelInfo(totalXP) {
    let level = 1;
    let remaining = totalXP;
    let required = xpRequiredForLevel(level);

    while (remaining >= required) {
      remaining -= required;
      level += 1;
      required = xpRequiredForLevel(level);
    }

    return {
      level,
      intoLevel: Math.round(remaining),
      required,
      percent: Math.min(100, (remaining / required) * 100)
    };
  }

  function xpRequiredForLevel(level) {
    return 100 + (level - 1) * 35;
  }

  function statLevelInfo(xp) {
    const required = 100;
    const level = Math.floor(xp / required) + 1;
    const intoLevel = xp % required;

    return {
      level,
      intoLevel,
      required,
      percent: intoLevel
    };
  }

  function getTodayCompletions() {
    const today = localDateKey(new Date());

    return state.completionLog.filter(log =>
      localDateKey(new Date(log.at)) === today
    );
  }

  function getTodayUnitsForQuest(questId) {
    return getTodayCompletions()
      .filter(log => log.questId === questId)
      .reduce((sum, log) => sum + Number(log.units || 0), 0);
  }

  function getAdventureDayCount() {
    return new Set(
      state.completionLog.map(log => localDateKey(new Date(log.at)))
    ).size;
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
})();
