(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app) return;

  const SCHEMA = 1;
  const MAX_ENTRIES = 4000;
  const MAX_ACTIVE_HOURS = 18;
  const REWARD_CAP_EFFECTIVE_MINUTES = 720;

  const CATEGORIES = {
    school: { label: "School", icon: "🏫", group: "work", realm: "Work", capability: "confidence", rewardMultiplier: 1, subcategories: ["Teaching", "Substitution", "Conference / meeting", "School admin", "Other school"] },
    work_home: { label: "Work at home", icon: "💻", group: "work", realm: "Work", capability: "confidence", rewardMultiplier: 1, subcategories: ["Lesson planning", "Grading / corrections", "Preparation", "Admin", "Other work"] },
    focus: { label: "Focus work", icon: "🎯", group: "work", realm: "Work", capability: "confidence", rewardMultiplier: 1, subcategories: ["Deep work", "Planning", "Writing", "Study", "Other focus"] },
    life_admin: { label: "Life / admin", icon: "🧺", group: "life", realm: "Home", capability: "wellbeing", rewardMultiplier: 0.55, subcategories: ["Household", "Appointments", "Paperwork", "Errands", "Other admin"] },
    hobby: { label: "Hobby", icon: "🎨", group: "personal", realm: "Hobbies", capability: "creativity", rewardMultiplier: 0, subcategories: ["Creative", "Craft", "Music", "Other hobby"] },
    gaming: { label: "Gaming", icon: "🎮", group: "personal", realm: "Hobbies", capability: "wellbeing", rewardMultiplier: 0, subcategories: ["Solo", "Social", "Other gaming"] },
    reading: { label: "Reading", icon: "📚", group: "personal", realm: "Hobbies", capability: "knowledge", rewardMultiplier: 0, subcategories: ["For fun", "Knowledge", "Work", "Other reading"] },
    recovery: { label: "Recovery / rest", icon: "🌿", group: "recovery", realm: "Recovery", capability: "wellbeing", rewardMultiplier: 0, subcategories: ["Break", "Rest", "Walk", "Quiet time", "Other recovery"] },
    other: { label: "Other", icon: "◇", group: "other", realm: null, capability: null, rewardMultiplier: 0, subcategories: ["Other"] }
  };

  const PRESETS = {
    "25/5": { focus: 25, break: 5 },
    "50/10": { focus: 50, break: 10 },
    "90/15": { focus: 90, break: 15 }
  };

  let initialized = false;
  let ticker = null;
  let alarmLocalFiredFor = null;
  let editingId = null;
  let lastBreakOffer = 0;

  const els = {};

  init();

  function init() {
    ensureState();
    cacheEls();
    if (!els.page) return;
    bind();
    populateCategorySelects();
    setDefaultManualTimes();
    initialized = true;
    render();
    ticker = window.setInterval(tick, 1000);
    window.addEventListener("life-rpg:render", render);
  }

  function cacheEls() {
    Object.assign(els, {
      page: byId("view-rhythm"),
      activeCard: byId("rhythmActiveCard"),
      focusPresets: byId("focusPresetButtons"),
      focusMinutes: byId("focusMinutes"),
      breakMinutes: byId("focusBreakMinutes"),
      focusCategory: byId("focusCategory"),
      focusSubcategory: byId("focusSubcategory"),
      focusLabel: byId("focusLabel"),
      focusQuest: byId("focusQuest"),
      startFocus: byId("startFocusButton"),
      clockCategory: byId("clockCategory"),
      clockSubcategory: byId("clockSubcategory"),
      clockLabel: byId("clockLabel"),
      startClock: byId("startClockButton"),
      manualForm: byId("manualTimeForm"),
      manualStart: byId("manualTimeStart"),
      manualEnd: byId("manualTimeEnd"),
      manualCategory: byId("manualTimeCategory"),
      manualSubcategory: byId("manualTimeSubcategory"),
      manualLabel: byId("manualTimeLabel"),
      manualSave: byId("manualTimeSave"),
      manualCancel: byId("manualTimeCancel"),
      weekSummary: byId("rhythmWeekSummary"),
      weekBars: byId("rhythmWeekBars"),
      monthSummary: byId("rhythmMonthSummary"),
      insights: byId("rhythmInsights"),
      recent: byId("rhythmRecentEntries"),
      tone: byId("rhythmToneToggle"),
      notifications: byId("rhythmNotificationToggle")
    });
  }

  function bind() {
    els.focusPresets?.addEventListener("click", event => {
      const button = event.target.closest("[data-focus-preset]");
      if (!button) return;
      const key = button.dataset.focusPreset;
      const preset = PRESETS[key];
      if (!preset) return;
      state().settings.focusPreset = key;
      els.focusMinutes.value = preset.focus;
      els.breakMinutes.value = preset.break;
      app.saveState({ source: "focus-preset" });
      renderPresetButtons();
    });

    els.focusCategory?.addEventListener("change", () => populateSubcategory(els.focusCategory, els.focusSubcategory));
    els.clockCategory?.addEventListener("change", () => populateSubcategory(els.clockCategory, els.clockSubcategory));
    els.manualCategory?.addEventListener("change", () => populateSubcategory(els.manualCategory, els.manualSubcategory));

    els.startFocus?.addEventListener("click", () => {
      const minutes = clamp(Math.round(Number(els.focusMinutes?.value || 50)), 5, 240);
      const breakMinutes = clamp(Math.round(Number(els.breakMinutes?.value || 10)), 0, 60);
      startActive({
        mode: "focus",
        categoryId: els.focusCategory?.value || "focus",
        subcategory: els.focusSubcategory?.value || "Deep work",
        label: clean(els.focusLabel?.value) || "Focus session",
        linkedQuestId: els.focusQuest?.value || null,
        targetMinutes: minutes,
        breakMinutes
      });
    });

    els.startClock?.addEventListener("click", () => {
      startActive({
        mode: "clock",
        categoryId: els.clockCategory?.value || "school",
        subcategory: els.clockSubcategory?.value || "Teaching",
        label: clean(els.clockLabel?.value) || CATEGORIES[els.clockCategory?.value || "school"].label,
        targetMinutes: null,
        breakMinutes: 0,
        linkedQuestId: null
      });
    });

    els.activeCard?.addEventListener("click", event => {
      const stop = event.target.closest("[data-time-stop]");
      if (stop) return finishActive();
      const cancel = event.target.closest("[data-time-cancel]");
      if (cancel) return cancelActive();
      const breakButton = event.target.closest("[data-time-break]");
      if (breakButton) return startBreak(Number(breakButton.dataset.timeBreak || lastBreakOffer || 10));
    });

    els.manualForm?.addEventListener("submit", event => {
      event.preventDefault();
      saveManualEntry();
    });
    els.manualCancel?.addEventListener("click", () => {
      editingId = null;
      els.manualForm?.reset();
      populateCategorySelects();
      setDefaultManualTimes();
      renderManualMode();
    });

    els.recent?.addEventListener("click", event => {
      const edit = event.target.closest("[data-time-edit]");
      if (edit) return editEntry(edit.dataset.timeEdit);
      const remove = event.target.closest("[data-time-delete]");
      if (remove) return deleteEntry(remove.dataset.timeDelete);
    });

    els.tone?.addEventListener("change", () => {
      state().settings.tone = Boolean(els.tone.checked);
      app.saveState({ source: "time-tone-setting" });
      if (els.tone.checked) playTone(false);
    });

    els.notifications?.addEventListener("change", async () => {
      if (els.notifications.checked && "Notification" in window && Notification.permission !== "granted") {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") els.notifications.checked = false;
        } catch {
          els.notifications.checked = false;
        }
      }
      state().settings.notifications = Boolean(els.notifications.checked && (!('Notification' in window) || Notification.permission === "granted"));
      app.saveState({ source: "time-notification-setting" });
    });
  }

  function ensureState() {
    const root = app.getState();
    if (!root.timeTracking || typeof root.timeTracking !== "object" || Array.isArray(root.timeTracking)) {
      root.timeTracking = defaultState();
    }
    const tracker = root.timeTracking;
    tracker.schemaVersion = SCHEMA;
    if (!Array.isArray(tracker.entries)) tracker.entries = [];
    if (!tracker.settings || typeof tracker.settings !== "object") tracker.settings = defaultState().settings;
    tracker.settings = { ...defaultState().settings, ...tracker.settings };
    if (tracker.active && typeof tracker.active !== "object") tracker.active = null;
    if (tracker.entries.length > MAX_ENTRIES) tracker.entries = tracker.entries.slice(-MAX_ENTRIES);
    return tracker;
  }

  function defaultState() {
    return { schemaVersion: SCHEMA, entries: [], active: null, settings: { tone: true, notifications: false, focusPreset: "50/10" } };
  }

  function state() {
    return ensureState();
  }

  function startActive(spec) {
    const tracker = state();
    if (tracker.active) {
      app.showToast?.("A timer is already running. Stop or cancel it first.");
      return;
    }
    const category = CATEGORIES[spec.categoryId] || CATEGORIES.other;
    const now = Date.now();
    tracker.active = {
      id: `time-active-${now}`,
      mode: spec.mode || "clock",
      categoryId: spec.categoryId || "other",
      subcategory: clean(spec.subcategory) || category.subcategories[0],
      label: clean(spec.label) || category.label,
      linkedQuestId: spec.linkedQuestId || null,
      linkedAdventureId: spec.linkedAdventureId || null,
      linkedRoadmapStepId: spec.linkedRoadmapStepId || null,
      startedAt: new Date(now).toISOString(),
      targetMinutes: spec.targetMinutes == null ? null : Math.max(1, Number(spec.targetMinutes)),
      breakMinutes: Math.max(0, Number(spec.breakMinutes || 0)),
      alarmFired: false
    };
    alarmLocalFiredFor = null;
    lastBreakOffer = 0;
    app.saveState({ source: `time-${spec.mode || "clock"}-start` });
    render();
    dispatchChange();
  }

  function startBreak(minutes) {
    if (state().active) return;
    const duration = clamp(Math.round(Number(minutes || 10)), 1, 60);
    startActive({ mode: "break", categoryId: "recovery", subcategory: "Break", label: "Pomodoro break", targetMinutes: duration, breakMinutes: 0 });
    lastBreakOffer = 0;
  }

  function finishActive() {
    const tracker = state();
    const active = tracker.active;
    if (!active) return;
    const end = new Date();
    const start = new Date(active.startedAt);
    if (!Number.isFinite(start.getTime())) {
      tracker.active = null;
      app.saveState({ source: "time-broken-active-clear" });
      render();
      return;
    }
    const elapsedMs = Math.max(0, end - start);
    const elapsed = Math.max(1, Math.round(elapsedMs / 60000));
    const targetMinutes = Math.max(0, Number(active.targetMinutes || 0));
    const minimumReached = targetMinutes <= 0 || elapsedMs >= targetMinutes * 60000;
    if (elapsed > MAX_ACTIVE_HOURS * 60) {
      app.showToast?.("That session ran for more than 18 hours. Add the correct time manually instead.");
      return;
    }
    const entry = makeEntry({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      minutes: elapsed,
      categoryId: active.categoryId,
      subcategory: active.subcategory,
      label: active.label,
      mode: active.mode,
      linkedQuestId: active.linkedQuestId,
      linkedAdventureId: active.linkedAdventureId,
      linkedRoadmapStepId: active.linkedRoadmapStepId,
      durationSeconds: Math.max(1, Math.floor(elapsedMs / 1000)),
      targetMinutes: active.targetMinutes
    });
    tracker.active = null;
    addEntry(entry, { reward: true });
    if (active.mode === "focus" && Number(active.breakMinutes || 0) > 0 && elapsed >= Math.max(1, Number(active.targetMinutes || 0) - 1)) {
      lastBreakOffer = Number(active.breakMinutes || 0);
    }
    if (active.mode === "focus" && active.linkedQuestId) maybeLogLinkedQuest(active.linkedQuestId, elapsed);
    if (active.mode === "action" && active.linkedQuestId && minimumReached) {
      maybeLogLinkedQuest(active.linkedQuestId, elapsed);
    }
    if (active.mode === "action" && active.linkedAdventureId && minimumReached) {
      maybeLogLinkedAdventure(active.linkedAdventureId, active.linkedRoadmapStepId, elapsed);
    }
    app.saveState({ source: `time-${active.mode}-finish` });
    app.renderAll?.();
    render();
    dispatchChange();
    if (active.mode === "action") {
      const linkedLabel = active.linkedAdventureId ? "Adventure step" : active.linkedQuestId ? "Quest" : "action";
      if (minimumReached) app.showToast?.(`${active.label} · ${elapsed} min logged and ${linkedLabel} completed.`);
      else app.showToast?.(`${elapsed} min logged. The ${targetMinutes} min minimum was not reached, so the ${linkedLabel} stays open.`);
    }
  }

  function cancelActive() {
    if (!state().active) return;
    if (!window.confirm("Cancel this running timer without logging the time?")) return;
    state().active = null;
    alarmLocalFiredFor = null;
    app.saveState({ source: "time-active-cancel" });
    render();
    dispatchChange();
  }

  function makeEntry(data) {
    return {
      id: data.id || `time-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startAt: data.startAt,
      endAt: data.endAt,
      minutes: Math.max(1, Math.round(Number(data.minutes || 0))),
      categoryId: CATEGORIES[data.categoryId] ? data.categoryId : "other",
      subcategory: clean(data.subcategory),
      label: clean(data.label) || CATEGORIES[data.categoryId]?.label || "Time log",
      mode: data.mode || "manual",
      linkedQuestId: data.linkedQuestId || null,
      linkedAdventureId: data.linkedAdventureId || null,
      linkedRoadmapStepId: data.linkedRoadmapStepId || null,
      durationSeconds: Math.max(1, Math.round(Number(data.durationSeconds || (Number(data.minutes || 0) * 60) || 60))),
      targetMinutes: data.targetMinutes == null ? null : Number(data.targetMinutes),
      rewardEventId: data.rewardEventId || null,
      reward: data.reward && typeof data.reward === "object" ? { ...data.reward } : null,
      rewardProcessed: Boolean(data.rewardProcessed || data.rewardEventId),
      createdAt: data.createdAt || new Date().toISOString()
    };
  }

  function addEntry(entry, { reward = true } = {}) {
    const tracker = state();
    if (reward) awardEntry(entry);
    tracker.entries.push(entry);
    tracker.entries.sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0));
    if (tracker.entries.length > MAX_ENTRIES) tracker.entries = tracker.entries.slice(-MAX_ENTRIES);
    return entry;
  }

  function awardEntry(entry) {
    const category = CATEGORIES[entry.categoryId] || CATEGORIES.other;
    const multiplier = Number(category.rewardMultiplier || 0);
    entry.rewardProcessed = true;
    if (multiplier <= 0 || entry.mode === "break") return null;
    const date = dateKey(new Date(entry.endAt || entry.startAt || Date.now()));
    const before = rewardableEffectiveMinutes(date, entry.id);
    const effective = Math.min(REWARD_CAP_EFFECTIVE_MINUTES, Math.max(0, Number(entry.minutes || 0) * multiplier));
    const rewardSpec = marginalWorkReward(before, effective);
    const focusBonus = entry.mode === "focus" && Number(entry.targetMinutes || 0) > 0 && Number(entry.minutes || 0) >= Math.max(1, Number(entry.targetMinutes || 0) - 1) ? 10 : 0;
    const coins = Math.max(0, Number(rewardSpec.coins || 0) + focusBonus);
    if (rewardSpec.xp <= 0 && rewardSpec.storyEnergyBase <= 0 && coins <= 0) return null;
    const reward = app.awardActivity({
      source: "time",
      sourceId: entry.id,
      label: `${category.label}${entry.subcategory ? ` · ${entry.subcategory}` : ""}`,
      realm: category.realm,
      capability: category.capability,
      xp: rewardSpec.xp,
      realmXP: rewardSpec.xp,
      statXP: Math.max(0, Math.round(rewardSpec.xp * 0.65)),
      coins,
      storyEnergyBase: rewardSpec.storyEnergyBase,
      metadata: { minutes: entry.minutes, categoryId: entry.categoryId, mode: entry.mode, focusCompletionBonus: focusBonus }
    });
    entry.rewardEventId = reward.eventId || null;
    entry.reward = { xp: reward.xp, storyEnergy: reward.storyEnergy, rawStoryEnergy: reward.rawStoryEnergy, statXP: reward.statXP, coins: reward.coins };
    return reward;
  }

  function marginalWorkReward(beforeEffective, addedEffective) {
    const before = clamp(Number(beforeEffective || 0), 0, REWARD_CAP_EFFECTIVE_MINUTES);
    const after = clamp(before + Number(addedEffective || 0), 0, REWARD_CAP_EFFECTIVE_MINUTES);
    const story = Math.max(0, cumulativeStory(after) - cumulativeStory(before));
    const xp = Math.max(0, Math.round(cumulativeXp(after) - cumulativeXp(before)));
    const coins = Math.max(0, Math.round(cumulativeCoins(after) - cumulativeCoins(before)));
    return { xp, coins, storyEnergyBase: Math.round(story * 100) / 100 };
  }

  function cumulativeCoins(minutes) {
    const m = clamp(minutes, 0, REWARD_CAP_EFFECTIVE_MINUTES);
    const first = Math.min(m, 360) * (10 / 60);
    const middle = Math.max(0, Math.min(m, 600) - 360) * (7 / 60);
    const late = Math.max(0, m - 600) * (4 / 60);
    return first + middle + late;
  }

  function cumulativeStory(minutes) {
    const m = clamp(minutes, 0, REWARD_CAP_EFFECTIVE_MINUTES);
    const first = Math.min(m, 360) * (0.2 / 60);
    const middle = Math.max(0, Math.min(m, 600) - 360) * (0.12 / 60);
    const late = Math.max(0, m - 600) * (0.06 / 60);
    return first + middle + late;
  }

  function cumulativeXp(minutes) {
    const m = clamp(minutes, 0, REWARD_CAP_EFFECTIVE_MINUTES);
    const first = Math.min(m, 600) * (6 / 60);
    const late = Math.max(0, m - 600) * (3 / 60);
    return first + late;
  }

  function rewardableEffectiveMinutes(date, excludeId = null) {
    return state().entries.reduce((sum, entry) => {
      if (!entry || entry.id === excludeId || !entry.rewardProcessed) return sum;
      if (dateKey(new Date(entry.endAt || entry.startAt || 0)) !== date) return sum;
      const category = CATEGORIES[entry.categoryId] || CATEGORIES.other;
      return sum + Math.max(0, Number(entry.minutes || 0) * Number(category.rewardMultiplier || 0));
    }, 0);
  }

  function maybeLogLinkedQuest(questId, minutes) {
    const quest = app.getQuestById?.(questId);
    if (!quest) return;
    const unit = `${quest.unitLabel || ""}`.toLowerCase();
    if (!/(min|minute|minutes)/.test(unit)) return;
    app.logQuestProgress?.(questId, Math.max(1, Math.round(minutes)));
  }

  function maybeLogLinkedAdventure(adventureId, roadmapStepId, minutes) {
    const api = window.LifeRPGAdventures;
    if (!api?.completeTimedSession) return false;
    return Boolean(api.completeTimedSession(adventureId, roadmapStepId || null, Math.max(1, Math.round(minutes))));
  }

  function timerContextForQuest(quest) {
    const realm = String(quest?.realm || "");
    const name = String(quest?.name || "").toLowerCase();
    if (realm === "Home") return { categoryId: "life_admin", subcategory: "Household" };
    if (realm === "Recovery") return { categoryId: "recovery", subcategory: /stretch|yoga|mobility/.test(name) ? "Other recovery" : "Quiet time" };
    if (realm === "Health" && /walk/.test(name)) return { categoryId: "recovery", subcategory: "Walk" };
    if (realm === "Health") return { categoryId: "recovery", subcategory: "Other recovery" };
    if (realm === "Work") return { categoryId: "work_home", subcategory: "Preparation" };
    if (realm === "Japanese" || realm === "Knowledge") return { categoryId: "focus", subcategory: "Study" };
    if (realm === "Hobbies") {
      const lane = String(quest?.hobbyLane || "");
      if (lane === "Craft") return { categoryId: "hobby", subcategory: "Craft" };
      if (lane === "Music") return { categoryId: "hobby", subcategory: "Music" };
      return { categoryId: "hobby", subcategory: "Other hobby" };
    }
    return { categoryId: "other", subcategory: "Other" };
  }

  function timerContextForAdventure(item) {
    const realm = String(item?.realm || "");
    const kind = String(item?.kind || "");
    if (realm === "Home") return { categoryId: "life_admin", subcategory: "Household" };
    if (realm === "Work") return { categoryId: "work_home", subcategory: "Preparation" };
    if (realm === "Recovery" || realm === "Health") return { categoryId: "recovery", subcategory: "Other recovery" };
    if (realm === "Knowledge" || realm === "Japanese") return { categoryId: "focus", subcategory: "Study" };
    if (realm === "Hobbies") return { categoryId: "hobby", subcategory: /music/i.test(kind) ? "Music" : /craft|skill|creative/i.test(kind) ? "Craft" : "Other hobby" };
    return { categoryId: "other", subcategory: "Other" };
  }

  function startQuestTimer(options = {}) {
    const quest = app.getQuestById?.(options.questId);
    if (!quest) return false;
    const minutes = Math.max(1, Number(options.minutes || quest.units || quest.planningMinutes || 15));
    const context = timerContextForQuest(quest);
    if (quest.systemRole === "focus-work") {
      startActive({ mode: "focus", categoryId: context.categoryId === "work_home" ? "work_home" : "focus", subcategory: context.subcategory, label: quest.name, targetMinutes: minutes, breakMinutes: minutes >= 45 ? 10 : 5, linkedQuestId: quest.id });
    } else {
      startActive({ mode: "action", categoryId: context.categoryId, subcategory: context.subcategory, label: quest.name, targetMinutes: minutes, breakMinutes: 0, linkedQuestId: quest.id });
    }
    return true;
  }

  function startAdventureTimer(options = {}) {
    const item = window.LifeRPGAdventures?.getItem?.(options.adventureId);
    if (!item) return false;
    const step = Array.isArray(item.roadmap) ? item.roadmap.find(entry => entry.id === options.roadmapStepId) : null;
    const minutes = Math.max(1, Number(options.minutes || step?.minutes || item.sessionMinutes || 30));
    const context = timerContextForAdventure(item);
    startActive({ mode: "action", categoryId: context.categoryId, subcategory: context.subcategory, label: options.label || step?.label || item.nextAction || item.name, targetMinutes: minutes, breakMinutes: 0, linkedAdventureId: item.id, linkedRoadmapStepId: step?.id || null });
    return true;
  }

  function saveManualEntry() {
    const start = new Date(els.manualStart?.value || "");
    const end = new Date(els.manualEnd?.value || "");
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      app.showToast?.("Choose a valid start and end time.");
      return;
    }
    const minutes = Math.round((end - start) / 60000);
    if (minutes < 1 || minutes > MAX_ACTIVE_HOURS * 60) {
      app.showToast?.("A single log must be between 1 minute and 18 hours.");
      return;
    }
    const existingId = editingId;
    const overlap = findOverlap(start, end, existingId);
    if (overlap) {
      app.showToast?.(`That overlaps ${overlap.label || "another time log"}. Adjust the times first.`);
      return;
    }

    let oldDate = null;
    if (existingId) {
      const old = state().entries.find(item => item.id === existingId);
      oldDate = old ? dateKey(new Date(old.endAt || old.startAt || 0)) : null;
      removeEntry(existingId, { silent: true, recalculate: false });
    }
    const entry = makeEntry({
      id: existingId || undefined,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      minutes,
      durationSeconds: Math.max(60, Math.round((end - start) / 1000)),
      categoryId: els.manualCategory?.value || "other",
      subcategory: els.manualSubcategory?.value || "",
      label: els.manualLabel?.value || "",
      mode: "manual"
    });
    state().entries.push(entry);
    state().entries.sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0));
    const newDate = dateKey(end);
    if (oldDate && oldDate !== newDate) recalculateRewardsForDate(oldDate);
    recalculateRewardsForDate(newDate);
    editingId = null;
    els.manualForm?.reset();
    populateCategorySelects();
    setDefaultManualTimes();
    app.saveState({ source: "time-manual-log" });
    app.renderAll?.();
    render();
    dispatchChange();
    app.showToast?.(`${formatDuration(minutes)} logged${entry.reward ? ` · +${entry.reward.storyEnergy || 0} 🔥 · +${entry.reward.xp || 0} XP · +${entry.reward.coins || 0} 🪙` : ""}.`);
  }

  function editEntry(id) {
    const entry = state().entries.find(item => item.id === id);
    if (!entry) return;
    editingId = id;
    els.manualStart.value = toLocalInput(new Date(entry.startAt));
    els.manualEnd.value = toLocalInput(new Date(entry.endAt));
    els.manualCategory.value = entry.categoryId;
    populateSubcategory(els.manualCategory, els.manualSubcategory, entry.subcategory);
    els.manualLabel.value = entry.label || "";
    renderManualMode();
    els.manualForm?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteEntry(id) {
    const entry = state().entries.find(item => item.id === id);
    if (!entry) return;
    if (!window.confirm(`Delete ${formatDuration(entry.minutes)} · ${entry.label || CATEGORIES[entry.categoryId]?.label}?`)) return;
    removeEntry(id, { silent: false });
  }

  function removeEntry(id, { silent = false, recalculate = true } = {}) {
    const tracker = state();
    const index = tracker.entries.findIndex(entry => entry.id === id);
    if (index < 0) return false;
    const entry = tracker.entries[index];
    const date = dateKey(new Date(entry.endAt || entry.startAt || 0));
    if (entry.rewardEventId) app.revokeActivityReward?.(entry.rewardEventId);
    tracker.entries.splice(index, 1);
    if (recalculate) recalculateRewardsForDate(date);
    app.saveState({ source: "time-log-delete" });
    app.renderAll?.();
    render();
    dispatchChange();
    if (!silent) app.showToast?.("Time log removed and direct time rewards for that day were recalculated.");
    return true;
  }

  function recalculateRewardsForDate(date) {
    const entries = state().entries
      .filter(entry => dateKey(new Date(entry.endAt || entry.startAt || 0)) === date)
      .sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0));
    entries.forEach(entry => {
      if (entry.rewardEventId) app.revokeActivityReward?.(entry.rewardEventId);
      entry.rewardEventId = null;
      entry.reward = null;
      entry.rewardProcessed = false;
    });
    entries.forEach(entry => awardEntry(entry));
  }

  function findOverlap(start, end, excludeId = null) {
    return state().entries.find(entry => {
      if (!entry || entry.id === excludeId) return false;
      const a = new Date(entry.startAt).getTime();
      const b = new Date(entry.endAt).getTime();
      return Number.isFinite(a) && Number.isFinite(b) && Math.min(end.getTime(), b) - Math.max(start.getTime(), a) > 5 * 60000;
    }) || null;
  }

  function tick() {
    if (!initialized) return;
    const active = state().active;
    if (!active) return;
    const started = new Date(active.startedAt).getTime();
    if (!Number.isFinite(started)) return;
    const target = Number(active.targetMinutes || 0);
    if (target > 0 && active.mode !== "action") {
      const due = started + target * 60000;
      if (Date.now() >= due && !active.alarmFired && alarmLocalFiredFor !== active.id) {
        active.alarmFired = true;
        alarmLocalFiredFor = active.id;
        app.saveState({ source: "time-alarm-fired" });
        playTone(true);
        notify(active.mode === "break" ? "Break finished" : "Focus timer finished", active.mode === "break" ? "Ready when you are." : `${target} minutes complete. Your time is ready to log.`);
      }
    }
    renderActive();
  }

  function playTone(double = true) {
    if (!state().settings.tone) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const ping = (offset, frequency) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
      };
      ping(0, 660);
      if (double) ping(0.42, 880);
      window.setTimeout(() => ctx.close?.(), 1400);
    } catch {
      // Sound is optional; timer state remains reliable.
    }
  }

  function notify(title, body) {
    if (!state().settings.notifications || !("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification(title, { body }); } catch { /* optional */ }
  }

  function render() {
    if (!initialized) return;
    renderPresetButtons();
    renderActive();
    renderQuestOptions();
    renderSettings();
    renderManualMode();
    renderStats();
    renderRecent();
  }

  function renderPresetButtons() {
    if (!els.focusPresets) return;
    const selected = state().settings.focusPreset || "50/10";
    [...els.focusPresets.querySelectorAll("[data-focus-preset]")].forEach(button => button.classList.toggle("active", button.dataset.focusPreset === selected));
  }

  function renderActive() {
    if (!els.activeCard) return;
    const active = state().active;
    if (!active) {
      if (lastBreakOffer > 0) {
        els.activeCard.innerHTML = `<div class="rhythm-idle-v304"><span>✓</span><div><strong>Focus logged.</strong><p>Your next decision can be a break instead of immediately finding more work.</p></div><button class="primary-button" data-time-break="${lastBreakOffer}" type="button">Start ${lastBreakOffer}m break</button></div>`;
      } else {
        els.activeCard.innerHTML = `<div class="rhythm-idle-v304"><span>◷</span><div><strong>No timer running.</strong><p>Start a Focus session or clock in. Reloading the app will not lose an active session.</p></div></div>`;
      }
      return;
    }
    const category = CATEGORIES[active.categoryId] || CATEGORIES.other;
    const started = new Date(active.startedAt).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    const targetSeconds = Number(active.targetMinutes || 0) * 60;
    const remaining = targetSeconds > 0 ? Math.max(0, targetSeconds - elapsedSeconds) : null;
    const reached = targetSeconds > 0 && elapsedSeconds >= targetSeconds;
    const mainClock = targetSeconds > 0 ? (reached ? `+${formatClock(elapsedSeconds - targetSeconds)}` : formatClock(remaining)) : formatClock(elapsedSeconds);
    const meta = `${category.icon} ${category.label}${active.subcategory ? ` · ${active.subcategory}` : ""}`;
    els.activeCard.innerHTML = `
      <article class="rhythm-running-v304 ${reached ? "is-finished" : ""}">
        <div class="rhythm-running-copy-v304"><small>${active.mode === "break" ? "BREAK TIMER" : active.mode === "focus" ? "FOCUS SESSION" : active.mode === "action" ? "DAILY ACTION" : "CLOCKED IN"}</small><h2>${esc(active.label)}</h2><p>${esc(meta)}</p></div>
        <div class="rhythm-clock-v304"><strong>${mainClock}</strong><span>${targetSeconds > 0 ? (reached ? (active.mode === "action" ? `${active.targetMinutes}m minimum reached · overtime counts` : `${active.targetMinutes}m target complete`) : `${formatDuration(Math.floor(elapsedSeconds / 60))} elapsed`) : `${formatDuration(Math.floor(elapsedSeconds / 60))} logged so far`}</span></div>
        <div class="rhythm-running-actions-v304"><button class="primary-button" data-time-stop type="button">${active.mode === "break" ? "Finish break & log" : active.mode === "action" ? (reached ? "Finish & complete" : "Stop & log time") : reached ? "Finish & log" : "Stop & log"}</button><button class="secondary-button" data-time-cancel type="button">Cancel</button></div>
      </article>`;
  }

  function renderQuestOptions() {
    if (!els.focusQuest) return;
    const current = els.focusQuest.value;
    const quests = (app.getQuestCatalog?.() || []).filter(quest => {
      if (quest.manualStatus === "Archived") return false;
      const unit = String(quest.unitLabel || "").toLowerCase();
      return /(min|minute|minutes)/.test(unit) && app.getQuestAvailability?.(quest)?.available !== false;
    });
    els.focusQuest.innerHTML = `<option value="">No quest link</option>${quests.map(quest => `<option value="${escAttr(quest.id)}">${esc(quest.name)}</option>`).join("")}`;
    if (quests.some(quest => quest.id === current)) els.focusQuest.value = current;
  }

  function renderSettings() {
    if (els.tone) els.tone.checked = state().settings.tone !== false;
    if (els.notifications) {
      els.notifications.checked = Boolean(state().settings.notifications && (!("Notification" in window) || Notification.permission === "granted"));
      els.notifications.disabled = !("Notification" in window);
    }
  }

  function renderManualMode() {
    if (els.manualSave) els.manualSave.textContent = editingId ? "Save corrected log" : "Add time log";
    if (els.manualCancel) els.manualCancel.classList.toggle("hidden", !editingId);
  }

  function renderStats() {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const week = summarizeRange(weekStart, weekEnd);
    const month = summarizeRange(monthStart, monthEnd);

    if (els.weekSummary) {
      els.weekSummary.innerHTML = summaryCards(week, "This week");
    }
    if (els.monthSummary) {
      els.monthSummary.innerHTML = summaryCards(month, "This month");
    }
    if (els.weekBars) {
      const total = Math.max(1, week.totalMinutes);
      const rows = Object.entries(week.byCategory).filter(([, minutes]) => minutes > 0).sort((a, b) => b[1] - a[1]);
      els.weekBars.innerHTML = rows.length ? rows.map(([id, minutes]) => {
        const category = CATEGORIES[id] || CATEGORIES.other;
        const width = Math.max(4, Math.round(minutes / total * 100));
        return `<div class="rhythm-bar-row-v304"><div><span>${category.icon}</span><strong>${esc(category.label)}</strong></div><div class="rhythm-bar-track-v304"><span style="width:${width}%"></span></div><b>${formatDuration(minutes)}</b></div>`;
      }).join("") : `<p class="empty-state-copy">No time logged this week yet. Clock in when a real block starts, or add it later.</p>`;
    }
    if (els.insights) els.insights.innerHTML = insightMarkup(week);
  }

  function summaryCards(summary, label) {
    return `
      <div class="rhythm-summary-card-v304"><small>${esc(label.toUpperCase())}</small><strong>${formatDuration(summary.totalMinutes)}</strong><span>Total tracked</span></div>
      <div class="rhythm-summary-card-v304 work"><small>WORK</small><strong>${formatDuration(summary.workMinutes)}</strong><span>School + work + focus</span></div>
      <div class="rhythm-summary-card-v304"><small>FOCUS</small><strong>${formatDuration(summary.focusMinutes)}</strong><span>Intentional focus</span></div>
      <div class="rhythm-summary-card-v304"><small>OFF-DUTY</small><strong>${formatDuration(summary.personalMinutes + summary.recoveryMinutes)}</strong><span>Hobbies + recovery</span></div>`;
  }

  function insightMarkup(summary) {
    const lines = [];
    if (summary.workMinutes >= 2700) lines.push(`You have logged ${formatDuration(summary.workMinutes)} of work this week. That is a genuinely heavy load; lower-capacity evenings are expected data, not failed planning.`);
    else if (summary.workMinutes >= 2100) lines.push(`${formatDuration(summary.workMinutes)} of work is already visible this week. The Daily Plan will treat that as part of the load instead of pretending only optional quests count.`);
    if (summary.personalMinutes === 0 && summary.recoveryMinutes === 0 && summary.workMinutes >= 1200) lines.push("No hobby or recovery time is logged yet alongside a substantial work load. This is an observation, not a streak or a warning score.");
    if (summary.personalMinutes + summary.recoveryMinutes >= 300) lines.push(`You protected ${formatDuration(summary.personalMinutes + summary.recoveryMinutes)} for hobbies or recovery. That time belongs in the picture of the week too.`);
    if (!lines.length) lines.push("As the week fills in, this page will compare work, focus, hobbies and recovery without turning any one category into a moral score.");
    return lines.map(line => `<div class="rhythm-insight-v304"><span>✦</span><p>${esc(line)}</p></div>`).join("");
  }

  function renderRecent() {
    if (!els.recent) return;
    const rows = state().entries.slice().sort((a, b) => new Date(b.startAt || 0) - new Date(a.startAt || 0)).slice(0, 20);
    els.recent.innerHTML = rows.length ? rows.map(entry => {
      const category = CATEGORIES[entry.categoryId] || CATEGORIES.other;
      const reward = entry.reward ? ` · +${entry.reward.storyEnergy || 0} 🔥 · +${entry.reward.xp || 0} XP · +${entry.reward.coins || 0} 🪙` : "";
      return `<article class="rhythm-log-row-v304"><div class="rhythm-log-icon-v304">${category.icon}</div><div><strong>${esc(entry.label || category.label)}</strong><p>${formatEntryDate(entry)} · ${esc(category.label)}${entry.subcategory ? ` · ${esc(entry.subcategory)}` : ""}${reward}</p></div><b>${formatDuration(entry.minutes)}</b><div class="rhythm-log-actions-v304"><button class="mini-nav-button" data-time-edit="${escAttr(entry.id)}" type="button">Edit</button><button class="mini-nav-button danger" data-time-delete="${escAttr(entry.id)}" type="button">Delete</button></div></article>`;
    }).join("") : `<p class="empty-state-copy">Nothing logged yet. Your first school block, focus session or off-duty activity will appear here.</p>`;
  }

  function summarizeRange(start, end) {
    const summary = { totalMinutes: 0, workMinutes: 0, focusMinutes: 0, personalMinutes: 0, recoveryMinutes: 0, byCategory: {} };
    state().entries.forEach(entry => {
      const at = new Date(entry.startAt || 0);
      if (!Number.isFinite(at.getTime()) || at < start || at >= end) return;
      const minutes = Math.max(0, Number(entry.minutes || 0));
      const category = CATEGORIES[entry.categoryId] || CATEGORIES.other;
      summary.totalMinutes += minutes;
      summary.byCategory[entry.categoryId] = Number(summary.byCategory[entry.categoryId] || 0) + minutes;
      if (category.group === "work") summary.workMinutes += minutes;
      if (category.group === "personal") summary.personalMinutes += minutes;
      if (category.group === "recovery") summary.recoveryMinutes += minutes;
      if (entry.mode === "focus") summary.focusMinutes += minutes;
    });
    return summary;
  }

  function todaySummary() {
    const start = startOfDay(new Date());
    const end = new Date(start.getTime() + 86400000);
    return summarizeRange(start, end);
  }

  function weekSummary() {
    const start = startOfWeek(new Date());
    return summarizeRange(start, new Date(start.getTime() + 7 * 86400000));
  }

  function populateCategorySelects() {
    [els.focusCategory, els.clockCategory, els.manualCategory].forEach(select => {
      if (!select) return;
      const previous = select.value;
      select.innerHTML = Object.entries(CATEGORIES).map(([id, category]) => `<option value="${id}">${category.icon} ${esc(category.label)}</option>`).join("");
      if (CATEGORIES[previous]) select.value = previous;
    });
    if (els.focusCategory && !els.focusCategory.dataset.initialized) { els.focusCategory.value = "focus"; els.focusCategory.dataset.initialized = "1"; }
    if (els.clockCategory && !els.clockCategory.dataset.initialized) { els.clockCategory.value = "school"; els.clockCategory.dataset.initialized = "1"; }
    if (els.manualCategory && !els.manualCategory.dataset.initialized) { els.manualCategory.value = "school"; els.manualCategory.dataset.initialized = "1"; }
    populateSubcategory(els.focusCategory, els.focusSubcategory);
    populateSubcategory(els.clockCategory, els.clockSubcategory);
    populateSubcategory(els.manualCategory, els.manualSubcategory);
  }

  function populateSubcategory(categorySelect, subcategorySelect, preferred = null) {
    if (!categorySelect || !subcategorySelect) return;
    const category = CATEGORIES[categorySelect.value] || CATEGORIES.other;
    const previous = preferred || subcategorySelect.value;
    subcategorySelect.innerHTML = category.subcategories.map(value => `<option value="${escAttr(value)}">${esc(value)}</option>`).join("");
    if (category.subcategories.includes(previous)) subcategorySelect.value = previous;
  }

  function setDefaultManualTimes() {
    if (!els.manualStart || !els.manualEnd) return;
    const end = new Date();
    end.setSeconds(0, 0);
    const start = new Date(end.getTime() - 60 * 60000);
    els.manualStart.value = toLocalInput(start);
    els.manualEnd.value = toLocalInput(end);
  }

  function formatEntryDate(entry) {
    const start = new Date(entry.startAt);
    const end = new Date(entry.endAt);
    const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const a = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const b = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${date} · ${a}–${b}`;
  }

  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    if (total < 60) return `${total}m`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function toLocalInput(date) {
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfWeek(date) {
    const start = startOfDay(date);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    return start;
  }

  function dateKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function dispatchChange() {
    window.dispatchEvent(new CustomEvent("life-rpg:time-change", { detail: { today: todaySummary(), week: weekSummary() } }));
  }

  function clean(value) { return String(value || "").trim(); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function byId(id) { return document.getElementById(id); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value || ""); }
  function escAttr(value) { return esc(value).replaceAll("`", "&#096;"); }

  window.LifeRPGTime = {
    render,
    getTodaySummary: () => ({ ...todaySummary() }),
    getWeekSummary: () => ({ ...weekSummary() }),
    getEntries: () => state().entries.map(entry => ({ ...entry })),
    getActive: () => state().active ? { ...state().active } : null,
    getElapsedSeconds: () => {
      const active = state().active;
      if (!active) return 0;
      const started = new Date(active.startedAt).getTime();
      return Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0;
    },
    finishActive,
    cancelActive,
    startFocus: options => startActive({ mode: "focus", categoryId: options?.categoryId || "focus", subcategory: options?.subcategory || "Deep work", label: options?.label || "Focus session", targetMinutes: options?.minutes || 50, breakMinutes: options?.breakMinutes || 10, linkedQuestId: options?.linkedQuestId || null }),
    startAction: options => startActive({ mode: "action", categoryId: options?.categoryId || "life_admin", subcategory: options?.subcategory || "Other admin", label: options?.label || "Action", targetMinutes: options?.minutes || 15, breakMinutes: 0, linkedQuestId: options?.linkedQuestId || null, linkedAdventureId: options?.linkedAdventureId || null, linkedRoadmapStepId: options?.linkedRoadmapStepId || null }),
    startQuest: startQuestTimer,
    startAdventure: startAdventureTimer,
    contextForQuest: timerContextForQuest,
    contextForAdventure: timerContextForAdventure
  };
})();
