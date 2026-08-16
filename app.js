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

  const LOCATION_META = {
    apartment: { label: "Shared Apartment", icon: "🏠", description: "Home hub and social core." },
    school: { label: "School", icon: "🏫", description: "Luca's own daily world." },
    gym: { label: "Training Gym", icon: "🏋️", description: "Unknown until the story gives Luca a reason to know it." },
    agency: { label: "DynaRiot Agency", icon: "💥", description: "Not yet part of Luca's ordinary routine." },
    cafe: { label: "???", icon: "☕", description: "A place you have not discovered yet." },
    district: { label: "???", icon: "🌙", description: "A part of the world not yet introduced." }
  };

  const demoQuests = [
    {
      id: "q-work-focus",
      name: "🧠 Focus Work",
      realm: "Work",
      priority: "Main",
      mode: "variable",
      target: 20,
      unitLabel: "minutes",
      xpAtTarget: 20,
      coinReward: 2,
      stat: "confidence",
      statAtTarget: 8
    },
    {
      id: "q-recovery-gaming",
      name: "🎮 Intentional Gaming Session",
      realm: "Recovery",
      priority: "Optional",
      mode: "fixed",
      target: 45,
      unitLabel: "minutes",
      xpAtTarget: 15,
      coinReward: 2,
      stat: "wellbeing",
      statAtTarget: 7
    },
    {
      id: "q-home-clean",
      name: "🧹 10-Minute Clean",
      realm: "Home",
      priority: "Low Energy",
      mode: "variable",
      target: 10,
      unitLabel: "minutes",
      xpAtTarget: 15,
      coinReward: 1,
      stat: "wellbeing",
      statAtTarget: 5
    },
    {
      id: "q-japanese-grammar",
      name: "🧠 Grammar Echo",
      realm: "Japanese",
      priority: "Bonus",
      mode: "fixed",
      target: 1,
      unitLabel: "session",
      xpAtTarget: 20,
      coinReward: 2,
      stat: "japanese",
      statAtTarget: 10
    },
    {
      id: "q-read",
      name: "📚 Read Something You Want To Read",
      realm: "Hobbies",
      priority: "Optional",
      mode: "variable",
      target: 20,
      unitLabel: "pages",
      xpAtTarget: 20,
      coinReward: 2,
      stat: "knowledge",
      statAtTarget: 7
    },
    {
      id: "q-workout",
      name: "🏋️ Real-World Workout",
      realm: "Health",
      priority: "Main",
      mode: "variable",
      target: 30,
      unitLabel: "minutes",
      xpAtTarget: 30,
      coinReward: 3,
      stat: "strength",
      statAtTarget: 12
    }
  ];

  function defaultState() {
    return {
      version: 1,
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
      quests: structuredCloneSafe(demoQuests),
      completionLog: [],
      memories: [],
      flags: {
        storyEngineReady: true
      },
      locations: {
        apartment: true,
        school: true,
        gym: false,
        agency: false,
        cafe: false,
        district: false
      },
      devMode: false
    };
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  let state = loadState();

  const els = {
    levelValue: byId("levelValue"),
    storyEnergyValue: byId("storyEnergyValue"),
    storyEnergyValueLarge: byId("storyEnergyValueLarge"),
    coinsValue: byId("coinsValue"),
    xpLabel: byId("xpLabel"),
    xpBar: byId("xpBar"),
    dateLine: byId("dateLine"),
    greeting: byId("greeting"),
    rhythmLine: byId("rhythmLine"),
    loadout: byId("loadout"),
    miniStats: byId("miniStats"),
    questLibrary: byId("questLibrary"),
    locationGrid: byId("locationGrid"),
    memoryList: byId("memoryList"),
    profileLevel: byId("profileLevel"),
    profileXP: byId("profileXP"),
    profileEnergy: byId("profileEnergy"),
    profileCoins: byId("profileCoins"),
    profileDays: byId("profileDays"),
    fullStats: byId("fullStats"),
    devModeToggle: byId("devModeToggle"),
    devOutput: byId("devOutput"),
    roomMessage: byId("roomMessage"),
    toast: byId("toast"),
    questDialog: byId("questDialog"),
    completeDialog: byId("completeDialog"),
    completeQuestId: byId("completeQuestId"),
    completeQuestTitle: byId("completeQuestTitle"),
    actualUnits: byId("actualUnits"),
    completePreview: byId("completePreview"),
    storyTestResult: byId("storyTestResult")
  };

  init();

  function init() {
    renderDate();
    bindNavigation();
    bindActions();
    renderAll();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultState();
      const parsed = JSON.parse(saved);
      return mergeState(defaultState(), parsed);
    } catch {
      return defaultState();
    }
  }

  function mergeState(base, saved) {
    return {
      ...base,
      ...saved,
      stats: { ...base.stats, ...(saved.stats || {}) },
      realms: { ...base.realms, ...(saved.realms || {}) },
      flags: { ...base.flags, ...(saved.flags || {}) },
      locations: { ...base.locations, ...(saved.locations || {}) },
      quests: Array.isArray(saved.quests) ? saved.quests : base.quests,
      completionLog: Array.isArray(saved.completionLog) ? saved.completionLog : [],
      memories: Array.isArray(saved.memories) ? saved.memories : []
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderDevOutput();
  }

  function bindNavigation() {
    document.querySelectorAll(".nav-button").forEach(button => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });

    document.querySelectorAll("[data-nav-target]").forEach(button => {
      button.addEventListener("click", () => showView(button.dataset.navTarget));
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
    byId("addQuestButton").addEventListener("click", () => {
      byId("questForm").reset();
      byId("newQuestTarget").value = 1;
      byId("newQuestXP").value = 20;
      byId("newQuestUnitLabel").value = "task";
      els.questDialog.showModal();
    });

    byId("saveQuestButton").addEventListener("click", event => {
      event.preventDefault();
      if (!byId("questForm").reportValidity()) return;

      const target = Number(byId("newQuestTarget").value);
      const xp = Number(byId("newQuestXP").value);

      state.quests.push({
        id: `q-custom-${Date.now()}`,
        name: byId("newQuestName").value.trim(),
        realm: byId("newQuestRealm").value,
        priority: byId("newQuestPriority").value,
        mode: target === 1 ? "fixed" : "variable",
        target,
        unitLabel: byId("newQuestUnitLabel").value.trim() || "unit",
        xpAtTarget: xp,
        coinReward: Math.max(1, Math.round(xp / 10)),
        stat: byId("newQuestStat").value,
        statAtTarget: Math.max(3, Math.round(xp * 0.35))
      });

      saveState();
      renderAll();
      els.questDialog.close();
      showToast("Quest added to the library.");
    });

    byId("confirmCompleteButton").addEventListener("click", event => {
      event.preventDefault();
      if (!byId("completeForm").reportValidity()) return;
      completeQuest(els.completeQuestId.value, Number(els.actualUnits.value));
      els.completeDialog.close();
    });

    els.actualUnits.addEventListener("input", updateCompletePreview);

    byId("resetDemoButton").addEventListener("click", () => {
      if (!confirm("Reset the local V0.1 save? This only affects this browser.")) return;
      state = defaultState();
      saveState();
      renderAll();
      showToast("Local demo save reset.");
    });

    els.devModeToggle.addEventListener("change", () => {
      state.devMode = els.devModeToggle.checked;
      saveState();
      renderDevOutput();
    });

    document.querySelectorAll(".room-card").forEach(button => {
      button.addEventListener("click", () => {
        const room = button.dataset.room;
        els.roomMessage.classList.remove("hidden");
        els.roomMessage.textContent =
          room === "bedroom"
            ? "Your room is your private space. Décor and personal unlocks will live here later."
            : "Social content pack not installed yet. The room engine is ready without revealing future interactions.";
      });
    });

    byId("storyTestButton").addEventListener("click", () => {
      const cost = 10;
      els.storyTestResult.classList.remove("hidden");

      if (state.storyEnergy < cost) {
        els.storyTestResult.textContent = `You need ${cost - state.storyEnergy} more Story Energy. Choices inside a real scene would still be free.`;
        return;
      }

      state.storyEnergy -= cost;
      const testMemoryId = "SYSTEM_SCENE_TEST_001";
      if (!state.memories.includes(testMemoryId)) state.memories.push(testMemoryId);
      state.flags.storyUnlockFlowTested = true;
      saveState();
      renderAll();
      els.storyTestResult.textContent =
        "Unlock flow passed. 10 Story Energy was spent, an opaque memory ID was recorded, and no narrative text was exposed.";
    });
  }

  function renderDate() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
    els.dateLine.textContent = formatter.format(now).toUpperCase();

    const hour = now.getHours();
    els.greeting.textContent =
      hour < 12 ? "Good morning. Welcome home." :
      hour < 18 ? "Good afternoon. Welcome home." :
      "Good evening. Welcome home.";
  }

  function renderAll() {
    renderResources();
    renderLoadout();
    renderQuestLibrary();
    renderStats();
    renderWorld();
    renderMemories();
    renderProfile();
    els.devModeToggle.checked = Boolean(state.devMode);
    renderDevOutput();
  }

  function renderResources() {
    const levelInfo = getLevelInfo(state.characterXP);

    els.levelValue.textContent = levelInfo.level;
    els.storyEnergyValue.textContent = state.storyEnergy;
    els.storyEnergyValueLarge.textContent = state.storyEnergy;
    els.coinsValue.textContent = state.coins;

    els.xpLabel.textContent = `${levelInfo.intoLevel} / ${levelInfo.required}`;
    els.xpBar.style.width = `${levelInfo.percent}%`;

    const todayCount = getTodayCompletions().length;
    els.rhythmLine.textContent =
      todayCount === 0
        ? "No pressure. One meaningful action counts."
        : todayCount === 1
        ? "One quest cleared. Today already counts."
        : `${todayCount} quests cleared today. Anything else is extra.`;
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

  function renderLoadout() {
    const priorityRank = { "Must Do": 0, "Main": 1, "Low Energy": 2, "Optional": 3, "Bonus": 4 };
    const quests = [...state.quests]
      .sort((a, b) => (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99))
      .slice(0, 5);

    els.loadout.innerHTML = quests.map(questCardHtml).join("");
    bindQuestButtons(els.loadout);
  }

  function questCardHtml(quest) {
    const todayUnits = getTodayUnitsForQuest(quest.id);
    const progress = Math.min(100, (todayUnits / quest.target) * 100);
    const targetLabel = `${trimNumber(quest.target)} ${quest.unitLabel}`;

    return `
      <article class="quest-card" data-priority="${escapeHtml(quest.priority)}">
        <div class="quest-accent"></div>
        <div>
          <div class="quest-meta">
            <span>${escapeHtml(quest.priority)}</span>
            <span>${escapeHtml(quest.realm)}</span>
            <span>${quest.mode === "variable" ? "Variable Units" : "Fixed"}</span>
          </div>
          <h3 class="quest-name">${escapeHtml(quest.name)}</h3>
          <div class="quest-rewards">
            <span>${trimNumber(todayUnits)} / ${escapeHtml(targetLabel)}</span>
            <span>⚔️ ${quest.xpAtTarget} XP @ target</span>
            <span>${STAT_META[quest.stat]?.icon || "✨"} ${escapeHtml(STAT_META[quest.stat]?.label || quest.stat)}</span>
          </div>
          <div class="progress" style="margin-top:10px"><span style="width:${progress}%"></span></div>
        </div>
        <div class="quest-actions">
          <button class="primary-button complete-quest-button" data-quest-id="${quest.id}">Complete</button>
        </div>
      </article>
    `;
  }

  function renderQuestLibrary() {
    els.questLibrary.innerHTML = state.quests.map(quest => `
      <article class="library-card">
        <div class="quest-meta">
          <span>${escapeHtml(quest.realm)}</span>
          <span>${escapeHtml(quest.priority)}</span>
        </div>
        <h3>${escapeHtml(quest.name)}</h3>
        <p class="muted">
          ${quest.mode === "variable"
            ? `${quest.xpAtTarget} XP per ${trimNumber(quest.target)} ${escapeHtml(quest.unitLabel)} at target rate.`
            : `${quest.xpAtTarget} XP when completed.`}
        </p>
        <div class="quest-rewards">
          <span>🪙 ${quest.coinReward}</span>
          <span>${STAT_META[quest.stat]?.icon || "✨"} ${escapeHtml(STAT_META[quest.stat]?.label || quest.stat)}</span>
        </div>
        <footer>
          <small class="muted">${trimNumber(getTodayUnitsForQuest(quest.id))} ${escapeHtml(quest.unitLabel)} today</small>
          <button class="secondary-button complete-quest-button" data-quest-id="${quest.id}">Log progress</button>
        </footer>
      </article>
    `).join("");

    bindQuestButtons(els.questLibrary);
  }

  function bindQuestButtons(container) {
    container.querySelectorAll(".complete-quest-button").forEach(button => {
      button.addEventListener("click", () => openCompleteDialog(button.dataset.questId));
    });
  }

  function openCompleteDialog(questId) {
    const quest = state.quests.find(item => item.id === questId);
    if (!quest) return;

    els.completeQuestId.value = questId;
    els.completeQuestTitle.textContent = quest.name;
    els.actualUnits.value = quest.target;
    els.actualUnits.step = quest.target < 1 ? "0.1" : "1";
    updateCompletePreview();
    els.completeDialog.showModal();
  }

  function updateCompletePreview() {
    const quest = state.quests.find(item => item.id === els.completeQuestId.value);
    if (!quest) return;

    const units = Math.max(0, Number(els.actualUnits.value) || 0);
    const reward = calculateQuestReward(quest, units, getTodayCompletions().length);

    els.completePreview.innerHTML =
      `Estimated reward: <strong>${reward.xp} XP</strong> · ` +
      `<strong>${reward.storyEnergy} 🔥</strong> · ` +
      `<strong>${reward.coins} 🪙</strong> · ` +
      `<strong>${reward.statXP} ${STAT_META[quest.stat]?.label || quest.stat} XP</strong>`;
  }

  function calculateQuestReward(quest, units, completedTodayCount) {
    const multiplier = quest.mode === "variable"
      ? Math.max(0, units / quest.target)
      : 1;

    const xp = Math.max(1, Math.round(quest.xpAtTarget * multiplier));
    const statXP = Math.max(1, Math.round(quest.statAtTarget * multiplier));
    const coins = Math.max(1, Math.round(quest.coinReward * Math.min(multiplier, 2)));

    const storySchedule = [6, 5, 4];
    const storyBase = storySchedule[completedTodayCount] ?? 2;

    return { xp, statXP, coins, storyEnergy: storyBase };
  }

  function completeQuest(questId, units) {
    const quest = state.quests.find(item => item.id === questId);
    if (!quest) return;

    const todayCount = getTodayCompletions().length;
    const reward = calculateQuestReward(quest, units, todayCount);

    state.characterXP += reward.xp;
    state.coins += reward.coins;
    state.storyEnergy += reward.storyEnergy;
    state.stats[quest.stat] = (state.stats[quest.stat] || 0) + reward.statXP;
    state.realms[quest.realm] = (state.realms[quest.realm] || 0) + reward.xp;

    state.completionLog.push({
      id: `log-${Date.now()}`,
      questId,
      questName: quest.name,
      realm: quest.realm,
      units,
      unitLabel: quest.unitLabel,
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

    showToast(
      `Quest clear · +${reward.xp} XP · +${reward.storyEnergy} 🔥 · +${reward.coins} 🪙`
    );
  }

  function applyHiddenEngineChecks() {
    // Intentionally uses opaque system flags. Real story content is not stored here.
    const workoutCount = state.completionLog.filter(log => log.questId === "q-workout").length;

    if (workoutCount >= 3) {
      state.flags.SYSTEM_ACTIVITY_PATTERN_STRENGTH_A = true;
    }

    const japaneseCount = state.completionLog.filter(log => log.realm === "Japanese").length;
    if (japaneseCount >= 3) {
      state.flags.SYSTEM_ACTIVITY_PATTERN_JP_A = true;
    }

    // Narrative location unlocks are deliberately NOT tied to raw stats in V0.1.
    // A future private story pack will set flags such as LOCATION_GYM_INTRODUCED.
    if (state.flags.LOCATION_GYM_INTRODUCED) {
      state.locations.gym = true;
    }
  }

  function renderStats() {
    const topStats = Object.entries(state.stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    els.miniStats.innerHTML = topStats.map(([key, xp]) => miniStatHtml(key, xp)).join("");

    els.fullStats.innerHTML = Object.entries(state.stats)
      .map(([key, xp]) => fullStatHtml(key, xp))
      .join("");
  }

  function statLevelInfo(xp) {
    const perLevel = 100;
    const level = Math.floor(xp / perLevel) + 1;
    const intoLevel = xp % perLevel;
    return { level, intoLevel, required: perLevel, percent: intoLevel };
  }

  function miniStatHtml(key, xp) {
    const meta = STAT_META[key];
    const info = statLevelInfo(xp);

    return `
      <div class="mini-stat-row">
        <div class="mini-stat-header">
          <span>${meta.icon} ${meta.label}</span>
          <strong>Lv. ${info.level}</strong>
        </div>
        <div class="progress"><span style="width:${info.percent}%"></span></div>
      </div>
    `;
  }

  function fullStatHtml(key, xp) {
    const meta = STAT_META[key];
    const info = statLevelInfo(xp);

    return `
      <div class="full-stat-card">
        <div class="full-stat-header">
          <span>${meta.icon} <strong>${meta.label}</strong></span>
          <span>Lv. ${info.level}</span>
        </div>
        <div class="progress"><span style="width:${info.percent}%"></span></div>
        <small class="muted">${info.intoLevel} / ${info.required} XP</small>
      </div>
    `;
  }

  function renderWorld() {
    els.locationGrid.innerHTML = Object.entries(LOCATION_META).map(([key, meta]) => {
      const unlocked = Boolean(state.locations[key]);
      return `
        <button class="location-card ${unlocked ? "" : "locked"}" ${unlocked ? "" : "disabled"}>
          ${unlocked ? "" : `<span class="location-lock">🔒 Unknown</span>`}
          <span class="location-icon">${unlocked ? meta.icon : "✦"}</span>
          <strong>${escapeHtml(unlocked ? meta.label : "Unknown Location")}</strong>
          <small>${escapeHtml(unlocked ? meta.description : "This place has not been introduced in Luca's story yet.")}</small>
        </button>
      `;
    }).join("");
  }

  function renderMemories() {
    if (!state.memories.length) {
      els.memoryList.className = "empty-state";
      els.memoryList.textContent = "No memories unlocked yet.";
      return;
    }

    els.memoryList.className = "";
    els.memoryList.innerHTML = state.memories.map(memoryId => `
      <div class="soft-callout" style="margin-top:8px">
        ${state.devMode ? escapeHtml(memoryId) : "✦ Unlocked memory"}
      </div>
    `).join("");
  }

  function renderProfile() {
    const levelInfo = getLevelInfo(state.characterXP);

    els.profileLevel.textContent = levelInfo.level;
    els.profileXP.textContent = state.characterXP;
    els.profileEnergy.textContent = state.storyEnergy;
    els.profileCoins.textContent = state.coins;
    els.profileDays.textContent = getAdventureDayCount();
  }

  function getAdventureDayCount() {
    return new Set(state.completionLog.map(log => localDateKey(new Date(log.at)))).size;
  }

  function getTodayCompletions() {
    const today = localDateKey(new Date());
    return state.completionLog.filter(log => localDateKey(new Date(log.at)) === today);
  }

  function getTodayUnitsForQuest(questId) {
    return getTodayCompletions()
      .filter(log => log.questId === questId)
      .reduce((sum, log) => sum + Number(log.units || 0), 0);
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderDevOutput() {
    if (!els.devOutput) return;

    if (!state.devMode) {
      els.devOutput.classList.add("hidden");
      els.devOutput.textContent = "";
      return;
    }

    els.devOutput.classList.remove("hidden");
    els.devOutput.textContent = JSON.stringify({
      engineVersion: state.version,
      flags: state.flags,
      locations: state.locations,
      opaqueMemories: state.memories,
      completionCount: state.completionLog.length,
      todayCompletionCount: getTodayCompletions().length
    }, null, 2);
  }

  function trimNumber(value) {
    return Number(value) % 1 === 0 ? String(Number(value)) : String(Number(value).toFixed(1));
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
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2800);
  }
})();
