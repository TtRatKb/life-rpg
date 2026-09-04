(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Daily Briefing could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 5;
  const SHADOW_KEY = "life-rpg-daily-planner-shadow-v1";
  const MAX_DAY_HISTORY = 120;
  const MAX_COMPANION_HISTORY = 45;
  const MAX_REROLL_MEMORY = 180;
  const MAX_BATCHES_PER_DAY = 3;
  const BATCH_BONUSES = [
    { storyEnergyBase: 1.8, xp: 15, coins: 1 },
    { storyEnergyBase: 1.2, xp: 10, coins: 1 },
    { storyEnergyBase: 0.8, xp: 5, coins: 0 }
  ];
  const LEGACY_LOADOUT_IDS = new Set(["q-work-focus", "q-home-clean", "q-recovery-gaming"]);

  const SLOTS = {
    focus: {
      icon: "🎯",
      kicker: "FOCUS PICK",
      title: "One useful thing",
      className: "focus"
    },
    joy: {
      icon: "🌸",
      kicker: "JOY PICK",
      title: "Something for you",
      className: "joy"
    },
    gentle: {
      icon: "☕",
      kicker: "GENTLE PICK",
      title: "Low-pressure option",
      className: "gentle"
    }
  };

  const LABELS = {
    sleep: { bad: "Bad", meh: "Meh", fine: "Fine", great: "Great" },
    energy: { fumes: "Running on fumes", low: "Low", okay: "Okay", lots: "Lots" },
    time: { none: "Almost none", little: "A little", decent: "A decent amount", plenty: "Plenty" },
    obligations: { help: "Please send help", busy: "Busy", normal: "Normal", open: "Pretty open" }
  };

  const VALUE = {
    sleep: { bad: 0, meh: 1, fine: 2, great: 3 },
    energy: { fumes: 0, low: 1, okay: 2, lots: 3 },
    time: { none: 0, little: 1, decent: 2, plenty: 3 },
    obligations: { help: 0, busy: 1, normal: 2, open: 3 }
  };

  const TIME_BUDGET = { none: 12, little: 30, decent: 65, plenty: 130 };
  const PRIORITY_SCORE = { "Must Do": 3.3, Main: 2.5, "Low Energy": 1.3, Optional: 0.7, Bonus: 0.2 };
  const DEMAND_BY_REALM = { Recovery: 0.35, Hobbies: 0.8, Home: 1.1, Japanese: 1.55, Knowledge: 1.65, Health: 1.85, Work: 2.15 };
  const CONVERSATION_STEPS = ["sleep", "energy", "time", "obligations", "gentle"];

  const CHECKIN_COPY = {
    luca: {
      sleep: {
        question: "Okay. First: how did I actually sleep?",
        reactions: {
          bad: "Right. That explains some things. I am not budgeting today like I slept eight perfect hours.",
          meh: "Not catastrophic. Also not exactly a glowing endorsement of the night.",
          fine: "Fine is useful. I can work with fine.",
          great: "Oh. Actual sleep. Nice. Let's not immediately waste that by planning seventeen things."
        }
      },
      energy: {
        question: "And what is the battery situation, realistically?",
        reactions: {
          fumes: "Red battery icon. Understood. Friction needs to be very low today.",
          low: "Low. Not zero, but definitely not imaginary-high-energy-me either.",
          okay: "Okay is enough. I do not need to turn it into 'excellent' before I can start anything.",
          lots: "Huh. Actual energy. Useful information. Still not permission to overbook the day."
        }
      },
      time: {
        question: "How much of today is actually mine?",
        reactions: {
          none: "Basically none. Then the plan needs to fit into cracks, not pretend a free evening exists.",
          little: "A little. Good. Small containers, then.",
          decent: "A decent amount. Enough room to choose instead of just react.",
          plenty: "Plenty, apparently. I should probably still leave some of it unclaimed."
        }
      },
      obligations: {
        question: "How crowded is the must-do pile?",
        reactions: {
          help: "Yep. That's a lot. The planner does not get to add a second invisible workload on top of it.",
          busy: "Busy. So anything optional needs to actually earn its place today.",
          normal: "Normal amount of life-admin. Manageable.",
          open: "Pretty open. Nice. That means I can choose something because I want it, too."
        }
      },
      gentle: {
        question: "Last check: do I need to deliberately keep today gentle?",
        reactions: {
          yes: "Yes. Then gentle is the rule, not something I have to justify after the fact.",
          no: "No special handling needed. Regular-sized day it is."
        }
      }
    },
    mina: {
      sleep: {
        question: "Hey girl. First things first: how did you sleep?",
        reactions: {
          bad: "Ugh, that's rough. Okay, we're not pretending that didn't happen.",
          meh: "Could've been worse, could've been way better. Noted.",
          fine: "Okay, decent. We can work with decent.",
          great: "Oh, look at you, actually rested. Love that for you."
        }
      },
      energy: {
        question: "Okay. And how much battery are we actually working with?",
        reactions: {
          fumes: "Yep. Battery icon is red. We plan accordingly.",
          low: "Low battery, heard. No heroic nonsense.",
          okay: "Okay is useful! We do not need to manufacture extra energy first.",
          lots: "Oh? Actual battery? Dangerous. Still not giving you twelve tasks."
        }
      },
      time: {
        question: "How much of today is actually yours?",
        reactions: {
          none: "Oof. Then we are working with tiny pockets, not a fake free afternoon.",
          little: "A little is still yours. We can protect a little.",
          decent: "Okay, that's real breathing room.",
          plenty: "Plenty? Cute. Please do not immediately donate all of it to obligations."
        }
      },
      obligations: {
        question: "And how scary is the must-do pile today?",
        reactions: {
          help: "Okay, wow. The pile is being rude. We are not adding guilt as a bonus task.",
          busy: "Busy. Got it. Optional stuff has to stay actually optional.",
          normal: "Normal amount of nonsense. Manageable.",
          open: "Pretty open? Okayyy. Maybe we can leave room for something fun on purpose."
        }
      },
      gentle: {
        question: "Last one. Do you need me to officially declare this a gentle day?",
        reactions: {
          yes: "Done. Officially declared. No appeals, no guilt, tiny wins absolutely count.",
          no: "Cool. Normal mode. Still banning the twelve-step self-improvement spiral, though."
        }
      }
    }
  };

  const els = {
    heroButton: byId("heroDailyBriefingButton"),
    mobileCard: byId("dailyMobileCheckinCard"),
    mobileButton: byId("dailyMobileCheckinButton"),
    mobileKicker: byId("dailyMobileCheckinKicker"),
    mobileTitle: byId("dailyMobileCheckinTitle"),
    mobileMeta: byId("dailyMobileCheckinMeta"),
    panel: byId("dailyBriefingPanel"),
    start: byId("dailyBriefingStart"),
    edit: byId("dailyBriefingEdit"),
    companion: byId("dailyCompanion"),
    state: byId("dailyBriefingState"),
    picks: byId("dailyPicks"),
    picksPanel: byId("dailyPicksPanel"),
    picksEmpty: byId("dailyPicksEmpty"),
    picksCount: byId("dailyPicksCount"),
    batchStatus: byId("dailyBatchStatus"),
    dialog: byId("dailyBriefingDialog"),
    form: byId("dailyBriefingForm"),
    dialogTitle: byId("dailyBriefingDialogTitle"),
    dialogCompanion: byId("dailyDialogCompanion"),
    close: byId("dailyBriefingClose"),
    cancel: byId("dailyBriefingCancel"),
    gentle: byId("dailyGentle"),
    conversationCounter: byId("dailyConversationCounter"),
    conversationDots: byId("dailyConversationDots"),
    conversationNext: byId("dailyConversationNext"),
    conversationBack: byId("dailyConversationBack")
  };

  let initialized = false;
  let provisionalCompanion = null;
  let conversationStep = 0;
  let conversationEditing = false;

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    const rewardUpgraded = ensureTodayCheckInStoryEnergyReward();
    initialized = true;
    if (changed || rewardUpgraded) persist(rewardUpgraded ? "daily-checkin-v272-reward-migration" : "daily-planner-init", { render: false });
    render();
  }

  function bindEvents() {
    els.start?.addEventListener("click", () => openBriefing(false));
    els.edit?.addEventListener("click", () => openBriefing(true));
    els.heroButton?.addEventListener("click", handleHeroAction);
    els.mobileButton?.addEventListener("click", handleHeroAction);
    els.close?.addEventListener("click", closeBriefing);
    els.cancel?.addEventListener("click", closeBriefing);
    els.conversationNext?.addEventListener("click", continueConversation);
    els.conversationBack?.addEventListener("click", () => showConversationStep(Math.max(0, conversationStep - 1)));
    els.form?.addEventListener("change", handleConversationAnswer);
    els.form?.addEventListener("submit", saveBriefing);

    document.addEventListener("click", event => {
      const newBatch = event.target.closest?.("[data-daily-new-batch]");
      if (newBatch) {
        startNewBatch();
        return;
      }

      const reroll = event.target.closest?.("[data-daily-reroll]");
      if (reroll) {
        rerollSlot(reroll.dataset.dailyReroll);
        return;
      }

      const log = event.target.closest?.("[data-daily-log]");
      if (log) {
        openQuestLog(log.dataset.dailyLog, Number(log.dataset.dailyUnits || 0));
        return;
      }

      const adventureLog = event.target.closest?.("[data-daily-adventure-log]");
      if (adventureLog) {
        window.LifeRPGAdventures?.openLog?.(adventureLog.dataset.dailyAdventureLog);
        return;
      }

      const bookLog = event.target.closest?.("[data-daily-book-log]");
      if (bookLog) {
        window.LifeRPGLibrary?.openLog?.(bookLog.dataset.dailyBookLog, {
          type: bookLog.dataset.dailyBookGoalType || "pages",
          amount: Number(bookLog.dataset.dailyBookGoalAmount || 0)
        });
        return;
      }

      const gameLog = event.target.closest?.("[data-daily-game-log]");
      if (gameLog) {
        window.LifeRPGGames?.openLog?.(gameLog.dataset.dailyGameLog, Number(gameLog.dataset.dailyGameMinutes || 0));
      }
    });

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });

    window.addEventListener("life-rpg:adventure-change", () => {
      if (!initialized) return;
      render();
    });

    window.addEventListener("life-rpg:library-change", () => {
      if (!initialized) return;
      render();
    });

    window.addEventListener("life-rpg:game-change", () => {
      if (!initialized) return;
      render();
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;

    if (!state.dailyPlanner || typeof state.dailyPlanner !== "object" || Array.isArray(state.dailyPlanner)) {
      state.dailyPlanner = readShadow() || defaultState();
      changed = true;
    }

    const planner = state.dailyPlanner;
    if (Number(planner.schemaVersion || 0) < SCHEMA) {
      planner.schemaVersion = SCHEMA;
      changed = true;
    }
    if (!planner.days || typeof planner.days !== "object" || Array.isArray(planner.days)) {
      planner.days = {};
      changed = true;
    }
    if (!Array.isArray(planner.companionHistory)) {
      planner.companionHistory = [];
      changed = true;
    }
    if (!planner.rerollMemory || typeof planner.rerollMemory !== "object" || Array.isArray(planner.rerollMemory)) {
      planner.rerollMemory = {};
      changed = true;
    }

    if (!planner.migrations || typeof planner.migrations !== "object") {
      planner.migrations = {};
      changed = true;
    }

    // The visible manual loadout is retired in V0.14. Keep the quest library itself untouched.
    if (!planner.migrations.retiredLegacyLoadout) {
      if (Array.isArray(state.selectedQuestIds)) {
        const onlyLegacy = state.selectedQuestIds.length > 0 && state.selectedQuestIds.every(id => LEGACY_LOADOUT_IDS.has(id));
        if (onlyLegacy) state.selectedQuestIds = [];
      }
      planner.migrations.retiredLegacyLoadout = true;
      changed = true;
    }

    // V0.18 remembers “Not today” across days, but only as a soft, decaying preference.
    if (!planner.migrations.plannerBrainV2) {
      Object.entries(planner.days || {}).forEach(([date, day]) => {
        Object.values(day?.rerollHistory || {}).flat().forEach(key => {
          if (!key) return;
          const memory = planner.rerollMemory[key] || { count: 0, lastDate: date, lastAt: 0, slots: {} };
          memory.count = Math.min(6, Number(memory.count || 0) + 1);
          if (!memory.lastDate || date > memory.lastDate) memory.lastDate = date;
          planner.rerollMemory[key] = memory;
        });
      });
      planner.migrations.plannerBrainV2 = true;
      changed = true;
    }

    if (!planner.migrations.dailyLifeV23) {
      Object.values(planner.days || {}).forEach(day => {
        if (!day || typeof day !== "object") return;
        ensureDayBatchState(day);
      });
      planner.migrations.dailyLifeV23 = true;
      changed = true;
    }

    if (!planner.migrations.adaptiveQuestFitV283) {
      // Do not silently swap an already-generated daily set on update. The stronger
      // effort/time matching applies to the next check-in, edit or manual reroll.
      planner.migrations.adaptiveQuestFitV283 = true;
      changed = true;
    }

    if (!planner.migrations.stableBuiltInQuestIdsV0284) {
      const migrateQuestId = id => app.migrateQuestId?.(id) || id;
      const migrateSourceKey = key => {
        if (typeof key !== "string" || !key.startsWith("quest:")) return key;
        return `quest:${migrateQuestId(key.slice("quest:".length)) || ""}`;
      };
      const migratePick = pick => (
        pick?.sourceType === "quest" && pick.sourceId
          ? { ...pick, sourceId: migrateQuestId(pick.sourceId) }
          : pick
      );

      Object.values(planner.days || {}).forEach(day => {
        if (!day || typeof day !== "object") return;
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
              day.rerollHistory[slot] = day.rerollHistory[slot].map(migrateSourceKey);
            }
          });
        }
      });

      if (planner.rerollMemory && typeof planner.rerollMemory === "object") {
        const migrated = {};
        Object.entries(planner.rerollMemory).forEach(([key, value]) => {
          migrated[migrateSourceKey(key)] = value;
        });
        planner.rerollMemory = migrated;
      }

      planner.migrations.stableBuiltInQuestIdsV0284 = true;
      changed = true;
    }

    trimHistory(planner);
    writeShadow(planner);
    return changed;
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA,
      days: {},
      companionHistory: [],
      rerollMemory: {},
      migrations: {}
    };
  }

  function plannerState() {
    ensureState();
    return app.getState().dailyPlanner;
  }

  function readShadow() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object") return null;
      return value;
    } catch {
      return null;
    }
  }

  function writeShadow(value) {
    try {
      localStorage.setItem(SHADOW_KEY, JSON.stringify(value));
    } catch {
      // Main save remains canonical; this is only a small local recovery shadow.
    }
  }

  function persist(source, { render: shouldRender = true } = {}) {
    const planner = plannerState();
    trimHistory(planner);
    writeShadow(planner);
    app.saveState({ source });
    if (shouldRender) render();
  }

  function trimHistory(planner) {
    const keys = Object.keys(planner.days || {}).sort();
    while (keys.length > MAX_DAY_HISTORY) {
      delete planner.days[keys.shift()];
    }
    if (Array.isArray(planner.companionHistory) && planner.companionHistory.length > MAX_COMPANION_HISTORY) {
      planner.companionHistory = planner.companionHistory.slice(-MAX_COMPANION_HISTORY);
    }
    if (planner.rerollMemory && typeof planner.rerollMemory === "object") {
      const entries = Object.entries(planner.rerollMemory);
      if (entries.length > MAX_REROLL_MEMORY) {
        entries
          .sort((a, b) => memorySortValue(b[1]) - memorySortValue(a[1]))
          .slice(MAX_REROLL_MEMORY)
          .forEach(([key]) => delete planner.rerollMemory[key]);
      }
    }
  }

  function memorySortValue(memory) {
    if (Number(memory?.lastAt || 0)) return Number(memory.lastAt);
    const parsed = memory?.lastDate ? new Date(`${memory.lastDate}T12:00:00`).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function todayRecord() {
    return plannerState().days[todayKey()] || null;
  }

  let fullRefreshQueued = false;

  function render() {
    const day = todayRecord();
    let bonusAwarded = false;
    if (day?.checkIn) {
      ensureDayBatchState(day);
      bonusAwarded = maybeAwardBatchClear(day);
    }
    renderBriefing(day);
    renderPicks(day);
    renderBatchStatus(day);
    renderHeroButton(day);
    renderMobileCheckin(day);
    if (bonusAwarded) queueFullRefresh();
  }

  function queueFullRefresh() {
    if (fullRefreshQueued) return;
    fullRefreshQueued = true;
    requestAnimationFrame(() => {
      fullRefreshQueued = false;
      app.renderAll?.();
    });
  }

  function renderHeroButton(day) {
    if (!els.heroButton) return;
    if (day?.checkIn) {
      const reward = day.checkInReward;
      const streak = Number(reward?.streak || currentCheckInStreak());
      els.heroButton.innerHTML = `<span>✦</span> Review today's picks${streak > 1 ? ` · ${streak} day streak` : ""}`;
      return;
    }
    const projected = projectedCheckInReward();
    els.heroButton.innerHTML = `<span>✦</span> Daily check-in · +${formatEnergy(projected.storyEnergy)} 🔥 · +${projected.xp} XP`;
  }

  function renderMobileCheckin(day) {
    if (!els.mobileCard || !els.mobileButton) return;
    const moment = currentMoment();
    if (els.mobileKicker) els.mobileKicker.textContent = moment.id === "morning" ? "MORNING CHECK-IN" : "DAILY CHECK-IN";

    if (day?.checkIn) {
      const reward = day.checkInReward || {};
      const streak = Number(reward.streak || currentCheckInStreak());
      const xp = Number(reward.xp || 0);
      const storyEnergy = Number(reward.storyEnergy || 0);
      if (els.mobileTitle) els.mobileTitle.textContent = streak > 1 ? `${streak}-day check-in streak.` : "Today's check-in is done.";
      if (els.mobileMeta) els.mobileMeta.textContent = `${storyEnergy ? `+${formatEnergy(storyEnergy)} 🔥 · ` : ""}${xp ? `+${xp} XP · ` : ""}Your planner already knows what kind of day this is.`;
      els.mobileButton.textContent = "Review day";
      els.mobileCard.classList.add("is-done-v271");
      return;
    }

    const projected = projectedCheckInReward();
    if (els.mobileTitle) els.mobileTitle.textContent = moment.id === "morning" ? "Do the tiny morning check-in." : "You can still check in today.";
    if (els.mobileMeta) els.mobileMeta.textContent = `+${formatEnergy(projected.storyEnergy)} 🔥 · +${projected.xp} XP today · ${projected.streak} day streak if completed`;
    els.mobileButton.textContent = "Check in";
    els.mobileCard.classList.remove("is-done-v271");
  }

  function handleHeroAction() {
    const day = todayRecord();
    if (day?.checkIn) {
      els.panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      openBriefing(false);
    }
  }

  function renderBriefing(day) {
    if (!els.state || !els.companion) return;

    if (!day?.checkIn) {
      const candidate = companionForDate();
      els.companion.innerHTML = companionMarkup(candidate, { preview: true });
      els.state.innerHTML = `
        <div class="daily-not-started-v14">
          <span class="daily-not-started-icon-v14">✦</span>
          <div>
            <strong>A short conversation. Then the choices get smaller.</strong>
            <p>Answer one thing at a time. Showing up earns a little Story Energy and XP, and helps the planner fit the day you actually have.</p>
          </div>
        </div>`;
      els.start?.classList.remove("hidden");
      if (els.start) {
        const projected = projectedCheckInReward();
        els.start.textContent = `Start check-in · +${formatEnergy(projected.storyEnergy)} 🔥 · +${projected.xp} XP`;
      }
      els.edit?.classList.add("hidden");
      return;
    }

    els.companion.innerHTML = companionMarkup(companionById(day.companion?.id) || companionForDate(), { day });
    els.state.innerHTML = briefingSummaryMarkup(day.checkIn);
    els.start?.classList.add("hidden");
    els.edit?.classList.remove("hidden");
  }

  function briefingSummaryMarkup(checkIn) {
    const capacity = capacityLabel(checkIn);
    return `
      <div class="daily-summary-v14">
        <div class="daily-summary-chip-v14"><span>☾</span><div><small>SLEEP</small><strong>${esc(LABELS.sleep[checkIn.sleep] || checkIn.sleep)}</strong></div></div>
        <div class="daily-summary-chip-v14"><span>⚡</span><div><small>ENERGY</small><strong>${esc(LABELS.energy[checkIn.energy] || checkIn.energy)}</strong></div></div>
        <div class="daily-summary-chip-v14"><span>◷</span><div><small>FREE TIME</small><strong>${esc(LABELS.time[checkIn.time] || checkIn.time)}</strong></div></div>
        <div class="daily-summary-chip-v14"><span>☷</span><div><small>OBLIGATIONS</small><strong>${esc(LABELS.obligations[checkIn.obligations] || checkIn.obligations)}</strong></div></div>
      </div>
      ${checkInRewardMarkup(todayRecord()?.checkInReward)}
      <div class="daily-capacity-note-v14 ${checkIn.gentle ? "gentle" : ""}">
        <span>${checkIn.gentle ? "♡" : "✿"}</span>
        <div><small>PLANNER READ</small><strong>${esc(capacity.title)}</strong><p>${esc(capacity.text)}</p></div>
      </div>
      ${momentNoteMarkup(checkIn)}`;
  }

  function capacityLabel(checkIn) {
    const sleep = VALUE.sleep[checkIn.sleep] ?? 1;
    const energy = VALUE.energy[checkIn.energy] ?? 1;
    const time = VALUE.time[checkIn.time] ?? 1;
    const obligations = VALUE.obligations[checkIn.obligations] ?? 1;
    const score = sleep * 0.2 + energy * 0.4 + time * 0.2 + obligations * 0.2 - (checkIn.gentle ? 1.1 : 0);

    if (checkIn.gentle || score < 0.8) {
      return { title: "Keep the floor low today.", text: "Short, forgiving options get priority. Finishing one small thing is enough." };
    }
    if (score < 1.55) {
      return { title: "A lighter day fits best.", text: "The planner will avoid stacking high-friction choices and keep the suggested chunks small." };
    }
    if (score < 2.35) {
      return { title: "You have some usable room.", text: "A meaningful focus task can fit, but the day still gets a joy pick and an easy exit." };
    }
    return { title: "There is room for a bigger move.", text: "The focus pick can be more ambitious without turning the entire day into productivity mode." };
  }

  function renderPicks(day) {
    if (!els.picks || !els.picksEmpty || !els.picksCount) return;
    if (!day?.checkIn) {
      els.picks.innerHTML = "";
      els.picksEmpty.classList.remove("hidden");
      els.picksCount.textContent = "Waiting for briefing";
      return;
    }

    const picks = Array.isArray(day.picks) ? day.picks : [];
    if (!picks.length) {
      els.picks.innerHTML = `
        <div class="daily-no-candidates-v14">
          <span>☷</span><div><strong>I couldn't build a useful set yet.</strong><p>Add a few quests, Side Adventures, books marked Reading, or active games and the planner will have something concrete to choose from.</p></div>
        </div>`;
      els.picksEmpty.classList.add("hidden");
      els.picksCount.textContent = "No candidates";
      return;
    }

    els.picksEmpty.classList.add("hidden");
    const completed = picks.filter(pick => pickCompletion(pick).done).length;
    const batch = Math.max(1, Number(day.batchIndex || 1));
    els.picksCount.textContent = `Batch ${batch} · ${completed}/${picks.length} complete`;
    els.picks.innerHTML = picks.map(pickCardMarkup).join("");
  }

  function pickCardMarkup(pick) {
    const slot = SLOTS[pick.slot] || SLOTS.focus;

    if (pick.sourceType === "book") {
      const book = findBook(pick.sourceId);
      if (!book) return unavailablePickMarkup(pick, slot, "This book is no longer in the Library. Reroll this card to replace it.");
      const completion = pickCompletion(pick);
      const done = completion.done;
      if (book.status !== "reading" && !done) return unavailablePickMarkup(pick, slot, "This book is no longer marked Reading. Reroll this card to replace it.");
      const progress = bookProgress(book);
      const role = bookRoleMeta(book.role);
      const goal = pick.bookGoal || bookGoal(book, pick.slot, todayRecord()?.checkIn || {});
      const progressLine = progress === null
        ? (book.currentPage > 0 ? `Page ${formatNumber(book.currentPage)}` : "Reading progress can stay light")
        : `${progress}% complete · page ${formatNumber(book.currentPage)} / ${formatNumber(book.totalPages)}`;
      return `
        <article class="daily-pick-v14 ${slot.className} daily-book-pick-v16 ${done ? "done" : ""}">
          <div class="daily-pick-top-v14">
            <span class="daily-pick-icon-v14">${slot.icon}</span>
            <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
            ${done ? '<span class="daily-pick-done-v14">✓ Finish line</span>' : ""}
          </div>
          <div class="daily-pick-quest-v14">
            <div class="daily-adventure-meta-v15 daily-book-meta-v16">
              <span class="daily-realm-pill-v14">${role.icon} ${esc(role.label)}</span>
              <span class="daily-adventure-source-v15">📚 Library</span>
              <span class="daily-adventure-progress-v15">${esc(completion.progressText || progressLine)}</span>
            </div>
            <h3>${esc(book.title || "Untitled book")}</h3>
            ${book.author ? `<p class="daily-book-author-v16">${esc(book.author)}</p>` : ""}
            <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(goal.label)}</strong></div></div>
            <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonForBook(book, pick.slot, todayRecord()?.checkIn || {}))}</p>
          </div>
          <div class="daily-pick-actions-v14">
            <button class="primary-button" data-daily-book-log="${escAttr(book.id)}" data-daily-book-goal-type="${escAttr(goal.type)}" data-daily-book-goal-amount="${Number(goal.amount || 0)}" type="button">${done ? "Log more" : "Log this reading"}</button>
            <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
          </div>
        </article>`;
    }

    if (pick.sourceType === "game") {
      const game = findGame(pick.sourceId);
      if (!game) return unavailablePickMarkup(pick, slot, "This game is no longer in the Games shelf. Reroll this card to replace it.");
      const completion = pickCompletion(pick);
      const done = completion.done;
      if (!["playing", "endless"].includes(game.status) && !done) return unavailablePickMarkup(pick, slot, "This game is no longer in active rotation. Reroll this card to replace it.");
      const role = gameRoleMeta(game.role);
      const goal = pick.gameGoal || gameGoal(game, pick.slot, todayRecord()?.checkIn || {});
      const openGoals = Array.isArray(game.goals) ? game.goals.filter(item => !item.done) : [];
      const progressLine = game.progressMode === "percent"
        ? `${clamp(Number(game.progress || 0), 0, 100)}% complete`
        : `${formatDuration(game.totalMinutes || 0)} logged${openGoals.length ? ` · ${openGoals.length} goal${openGoals.length === 1 ? "" : "s"} open` : ""}`;
      return `
        <article class="daily-pick-v14 ${slot.className} daily-game-pick-v17 ${done ? "done" : ""}">
          <div class="daily-pick-top-v14">
            <span class="daily-pick-icon-v14">${slot.icon}</span>
            <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
            ${done ? '<span class="daily-pick-done-v14">✓ Finish line</span>' : ""}
          </div>
          <div class="daily-pick-quest-v14">
            <div class="daily-adventure-meta-v15 daily-game-meta-v17">
              <span class="daily-realm-pill-v14">${role.icon} ${esc(role.label)}</span>
              <span class="daily-adventure-source-v15">🎮 Games</span>
              <span class="daily-adventure-progress-v15">${esc(completion.progressText || progressLine)}</span>
            </div>
            <h3>${esc(game.title || "Untitled game")}</h3>
            ${game.platform ? `<p class="daily-game-platform-v17">${esc(game.platform)}</p>` : ""}
            <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(goal.label)}</strong></div></div>
            <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonForGame(game, pick.slot, todayRecord()?.checkIn || {}))}</p>
          </div>
          <div class="daily-pick-actions-v14">
            <button class="primary-button" data-daily-game-log="${escAttr(game.id)}" data-daily-game-minutes="${Number(goal.minutes || game.sessionMinutes || 45)}" type="button">${done ? "Log more play" : "Log this session"}</button>
            <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
          </div>
        </article>`;
    }

    if (pick.sourceType === "adventure") {
      const adventure = findAdventure(pick.sourceId);
      if (!adventure) return unavailablePickMarkup(pick, slot, "This Side Adventure is no longer active. Reroll this card to replace it.");
      const completion = pickCompletion(pick);
      const done = completion.done;
      const progress = adventure.progressMode === "percent" ? clamp(Number(adventure.progress || 0), 0, 100) : null;
      const finishLine = pick.adventureGoal?.label || adventureGoal(adventure, pick.slot, todayRecord()?.checkIn || {}).label;
      return `
        <article class="daily-pick-v14 ${slot.className} daily-adventure-pick-v15 ${done ? "done" : ""}">
          <div class="daily-pick-top-v14">
            <span class="daily-pick-icon-v14">${slot.icon}</span>
            <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
            ${done ? '<span class="daily-pick-done-v14">✓ Finish line</span>' : ""}
          </div>
          <div class="daily-pick-quest-v14">
            <div class="daily-adventure-meta-v15">
              <span class="daily-realm-pill-v14">${realmIcon(adventure.realm)} ${esc(adventure.realm || "Hobbies")}</span>
              <span class="daily-adventure-source-v15">✧ Side Adventure</span>
              ${progress === null ? "" : `<span class="daily-adventure-progress-v15">${progress}% complete</span>`}
            </div>
            <h3>${esc(adventure.name || "Untitled adventure")}</h3>
            <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(finishLine)}</strong></div></div>
            <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonForAdventure(adventure, pick.slot, todayRecord()?.checkIn || {}))}</p>
          </div>
          <div class="daily-pick-actions-v14">
            <button class="primary-button" data-daily-adventure-log="${escAttr(adventure.id)}" type="button">${done ? "Log more" : "Log this step"}</button>
            <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
          </div>
        </article>`;
    }

    const quest = findQuest(pick.sourceId);
    if (!quest) return unavailablePickMarkup(pick, slot, "This item is no longer in the Quest Board. Reroll this card to replace it.");

    const completion = pickCompletion(pick);
    const progress = Number(completion.progress || 0);
    const goal = Number(pick.suggestedUnits || questTargetValue(quest));
    const done = completion.done;
    const unitLabel = friendlyUnitLabel(quest.unitLabel, goal);
    const goalText = goalLabel(quest, goal);
    const progressText = progress > 0 ? `${formatNumber(progress)} / ${formatNumber(goal)} ${unitLabel}` : goalText;

    return `
      <article class="daily-pick-v14 ${slot.className} ${done ? "done" : ""}">
        <div class="daily-pick-top-v14">
          <span class="daily-pick-icon-v14">${slot.icon}</span>
          <div><small>${slot.kicker}</small><strong>${slot.title}</strong></div>
          ${done ? '<span class="daily-pick-done-v14">✓ Done</span>' : ""}
        </div>
        <div class="daily-pick-quest-v14">
          <div class="daily-adventure-meta-v15">
            <span class="daily-realm-pill-v14">${realmIcon(quest.realm)} ${esc(quest.realm || "Quest")}</span>
            <span class="daily-adventure-source-v15">${esc(planningEffortLabel(quest))}</span>
            <span class="daily-adventure-progress-v15">~${formatNumber(estimatedMinutes(quest))} min</span>
          </div>
          <h3>${esc(quest.name || "Untitled quest")}</h3>
          <div class="daily-goal-v14"><span>✦</span><div><small>TODAY'S FINISH LINE</small><strong>${esc(done ? progressText : goalText)}</strong></div></div>
          <p class="daily-pick-reason-v14"><b>Why this today?</b> ${esc(pick.reason || reasonFor(quest, pick.slot, todayRecord()?.checkIn || {}))}</p>
        </div>
        <div class="daily-pick-actions-v14">
          <button class="primary-button" data-daily-log="${escAttr(quest.id)}" data-daily-units="${goal}" type="button">${done ? "Log more" : "Log progress"}</button>
          <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Not today</button>
        </div>
      </article>`;
  }

  function unavailablePickMarkup(pick, slot, message) {
    return `
      <article class="daily-pick-v14 ${slot.className} unavailable">
        <div class="daily-pick-top-v14"><span class="daily-pick-icon-v14">${slot.icon}</span><div><small>${slot.kicker}</small><strong>${slot.title}</strong></div></div>
        <p>${esc(message)}</p>
        <button class="secondary-button" data-daily-reroll="${escAttr(pick.slot)}" type="button">↻ Another</button>
      </article>`;
  }

  function openBriefing(editing) {
    if (!els.dialog || !els.form) return;
    const existing = todayRecord();
    provisionalCompanion = existing?.companion?.id ? companionById(existing.companion.id) : companionForDate();
    conversationEditing = Boolean(editing && existing?.checkIn);
    conversationStep = 0;

    els.form.reset();
    if (conversationEditing) fillCheckIn(existing.checkIn);
    renderDialogCompanion(provisionalCompanion);
    if (els.dialogTitle) els.dialogTitle.textContent = conversationEditing ? "Adjust today's check-in." : dialogTitleFor(provisionalCompanion);
    els.dialog.showModal();
    showConversationStep(0);
  }

  function fillCheckIn(checkIn) {
    setRadio("dailySleep", checkIn.sleep);
    setRadio("dailyEnergy", checkIn.energy);
    setRadio("dailyTime", checkIn.time);
    setRadio("dailyObligations", checkIn.obligations);
    setRadio("dailyGentleChoice", checkIn.gentle ? "yes" : "no");
  }

  function setRadio(name, value) {
    const input = els.form?.querySelector(`input[name="${name}"][value="${cssEscape(value)}"]`);
    if (input) input.checked = true;
  }

  function renderDialogCompanion(companion) {
    if (!els.dialogCompanion) return;
    const c = companion || companionById("luca");
    els.dialog?.classList.toggle("mina-chat-v271", c.id === "mina");
    els.dialog?.classList.toggle("luca-monologue-v271", c.id !== "mina");
    els.dialogCompanion.innerHTML = `
      <div id="dailyDialogAvatar" class="daily-dialog-avatar-v14 ${escAttr(c.id)}">${companionImage(c, true)}</div>
      <div><small>${esc(c.kicker)}</small><strong>${esc(c.name)}</strong><p id="dailyDialogLine">${esc(c.dialogLine)}</p></div>`;
  }

  function showConversationStep(index) {
    if (!els.form) return;
    const steps = [...els.form.querySelectorAll("[data-daily-question]")];
    if (!steps.length) return;
    conversationStep = clamp(Number(index || 0), 0, steps.length - 1);

    steps.forEach((step, stepIndex) => {
      const active = stepIndex === conversationStep;
      step.classList.toggle("is-active-v271", active);
      step.setAttribute("aria-hidden", active ? "false" : "true");
    });

    const key = steps[conversationStep]?.dataset.dailyQuestion || CONVERSATION_STEPS[conversationStep];
    const prompt = conversationQuestion(provisionalCompanion, key);
    const promptEl = steps[conversationStep]?.querySelector("legend strong");
    if (promptEl) promptEl.textContent = prompt;
    setDialogLine(prompt);
    setDialogPortraitMood("question");

    if (els.conversationCounter) els.conversationCounter.textContent = `${conversationStep + 1} of ${steps.length}`;
    if (els.conversationDots) {
      els.conversationDots.innerHTML = steps.map((_, i) => `<span class="${i < conversationStep ? "done" : i === conversationStep ? "active" : ""}"></span>`).join("");
    }
    if (els.conversationBack) els.conversationBack.classList.toggle("hidden", conversationStep === 0);

    const checked = steps[conversationStep]?.querySelector("input[type='radio']:checked");
    updateConversationNext(Boolean(checked), conversationStep === steps.length - 1);
  }

  function handleConversationAnswer(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "radio") return;
    const step = input.closest?.("[data-daily-question]");
    if (!step?.classList.contains("is-active-v271")) return;
    const key = step.dataset.dailyQuestion;
    const reaction = conversationReaction(provisionalCompanion, key, input.value);
    if (reaction) setDialogLine(reaction);
    setDialogPortraitMood(reactionMood(key, input.value));
    updateConversationNext(true, conversationStep === CONVERSATION_STEPS.length - 1);
  }

  function continueConversation() {
    if (!els.form) return;
    const steps = [...els.form.querySelectorAll("[data-daily-question]")];
    const current = steps[conversationStep];
    if (!current?.querySelector("input[type='radio']:checked")) return;
    if (conversationStep >= steps.length - 1) {
      els.form.requestSubmit();
      return;
    }
    showConversationStep(conversationStep + 1);
  }

  function updateConversationNext(answered, finalStep) {
    if (!els.conversationNext) return;
    els.conversationNext.disabled = !answered;
    if (!answered) {
      els.conversationNext.textContent = "Choose an answer";
      return;
    }
    if (finalStep) {
      const reward = todayRecord()?.checkIn ? null : projectedCheckInReward();
      els.conversationNext.textContent = conversationEditing
        ? "Save changes ✦"
        : `Finish check-in${reward ? ` · +${formatEnergy(reward.storyEnergy)} 🔥 · +${reward.xp} XP` : ""}`;
      return;
    }
    els.conversationNext.textContent = "Continue →";
  }

  function conversationQuestion(companion, key) {
    const id = companion?.id === "mina" ? "mina" : "luca";
    return CHECKIN_COPY[id]?.[key]?.question || "How are we doing?";
  }

  function conversationReaction(companion, key, value) {
    const id = companion?.id === "mina" ? "mina" : "luca";
    return CHECKIN_COPY[id]?.[key]?.reactions?.[value] || "Okay. Noted.";
  }

  function setDialogLine(text) {
    const line = byId("dailyDialogLine");
    if (line) line.textContent = text;
  }

  function reactionMood(key, value) {
    if (["great", "lots", "plenty", "open", "no"].includes(value)) return "positive";
    if (["bad", "fumes", "help", "yes"].includes(value)) return "low";
    if (["meh", "low", "busy"].includes(value)) return "skeptical";
    return key === "gentle" ? "warm" : "neutral";
  }

  function setDialogPortraitMood(mood) {
    const img = byId("dailyDialogAvatar")?.querySelector("img");
    if (!img || !provisionalCompanion) return;
    if (provisionalCompanion.id === "mina") {
      img.src = mood === "positive"
        ? "assets/story/sprites/mina_excited.png"
        : mood === "skeptical"
          ? "assets/story/sprites/mina_teasing.png"
          : mood === "question"
            ? "assets/story/sprites/mina_curious.png"
            : "assets/story/sprites/mina_neutral.png";
      return;
    }
    img.src = mood === "positive" || mood === "warm"
      ? "assets/story/portraits/luca_warm.png"
      : mood === "skeptical" || mood === "low"
        ? "assets/story/portraits/luca_skeptical.png"
        : "assets/story/portraits/luca_neutral.png";
  }

  function closeBriefing() {
    if (els.dialog?.open) els.dialog.close();
  }

  function saveBriefing(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;

    const checkIn = {
      sleep: radioValue("dailySleep"),
      energy: radioValue("dailyEnergy"),
      time: radioValue("dailyTime"),
      obligations: radioValue("dailyObligations"),
      gentle: radioValue("dailyGentleChoice") === "yes"
    };

    const planner = plannerState();
    const key = todayKey();
    const existing = planner.days[key] || {};
    const companion = provisionalCompanion || companionForDate();
    const day = {
      ...existing,
      date: key,
      checkIn,
      companion: { id: companion.id },
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now(),
      rerollHistory: existing.rerollHistory || { focus: [], joy: [], gentle: [] },
      batchIndex: Math.max(1, Number(existing.batchIndex || 1)),
      batchHistory: Array.isArray(existing.batchHistory) ? existing.batchHistory : [],
      batchReward: existing.batchReward || null,
      batchClearedAt: existing.batchClearedAt || null
    };

    // Once a batch has been cleared, its three finished picks are part of today's
    // reward history. Editing the check-in must not silently swap those picks
    // while leaving the already-paid batch reward attached to them.
    day.picks = existing.batchReward?.eventId && Array.isArray(existing.picks)
      ? existing.picks
      : buildPicks(checkIn, existing.picks || [], day.rerollHistory);
    const firstCheckIn = !existing.checkIn;
    if (firstCheckIn) {
      const streak = checkInStreakOnCompletion(planner, key);
      const requestedXP = checkInXPForStreak(streak);
      const requestedStoryEnergy = checkInStoryEnergyForStreak(streak);
      const reward = app.awardActivity?.({
        source: "daily-checkin",
        sourceId: key,
        label: "Daily check-in",
        xp: requestedXP,
        realmXP: 0,
        statXP: 0,
        coins: 0,
        storyEnergyBase: requestedStoryEnergy,
        progressionRelevant: false,
        at: new Date().toISOString(),
        metadata: { streak, checkIn: true, dailyLoopReward: true }
      }) || { xp: requestedXP, storyEnergy: requestedStoryEnergy, rawStoryEnergy: requestedStoryEnergy };
      day.checkInReward = {
        xp: Number(reward.xp || 0),
        storyEnergy: Number(reward.storyEnergy || 0),
        rawStoryEnergy: Number(reward.rawStoryEnergy || requestedStoryEnergy),
        storyEnergyVersion: 2,
        streak,
        eventId: reward.eventId || null,
        awardedAt: Date.now()
      };
    } else if (existing.checkInReward) {
      day.checkInReward = existing.checkInReward;
    }

    planner.days[key] = day;
    recordCompanion(planner, key, companion.id);
    persist(firstCheckIn ? "daily-checkin-create" : "daily-briefing-edit");
    closeBriefing();
    if (firstCheckIn) {
      app.renderAll?.();
      const reward = day.checkInReward;
      app.showToast?.(`Daily check-in · +${formatEnergy(reward?.storyEnergy || 0)} Story Energy · +${Number(reward?.xp || 0)} XP · ${Number(reward?.streak || 1)} day streak`);
    }
    requestAnimationFrame(() => els.panel?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function radioValue(name) {
    return els.form?.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function buildPicks(checkIn, previousPicks = [], rerollHistory = {}, globalExcluded = new Set()) {
    const quests = eligibleQuests();
    const adventures = eligibleAdventures();
    const books = eligibleBooks();
    const games = eligibleGames();
    if (!quests.length && !adventures.length && !books.length && !games.length) return [];

    const picked = [];
    const used = new Set();
    const usedTypes = [];
    const usedRealms = [];
    const previousBySlot = Object.fromEntries(previousPicks.map(p => [p.slot, p]));

    for (const slot of ["focus", "joy", "gentle"]) {
      const previous = previousBySlot[slot];
      const excluded = new Set([...(rerollHistory[slot] || []), ...globalExcluded]);
      const candidate = chooseSourceCandidate(slot, checkIn, quests, adventures, books, games, used, excluded, previous, usedTypes, usedRealms);
      if (!candidate) continue;
      used.add(sourceKey(candidate.sourceType, candidate.item.id));
      usedTypes.push(candidate.sourceType);
      usedRealms.push(sourceRealm(candidate.sourceType, candidate.item));
      picked.push(makePickFromCandidate(slot, candidate, checkIn, previous));
    }

    return picked;
  }

  function questTargetValue(quest) {
    const value = Number(quest?.units ?? quest?.target ?? 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function isVariableQuest(quest) {
    return quest?.xpMode === "Variable by Units" || quest?.xpMode === "Batch by Units" || quest?.questType === "Unit Batch" || quest?.mode === "variable";
  }

  function questPriority(quest) {
    if (quest?.priority) return String(quest.priority);
    if (quest?.energy === "Low Energy") return "Low Energy";
    if (quest?.energy === "Boss") return "Must Do";
    return "Optional";
  }

  function planningEffort(quest) {
    const explicit = String(quest?.planningEffort || "").toLowerCase();
    if (["low", "medium", "high"].includes(explicit)) return explicit;
    if (quest?.energy === "Low Energy") return "low";
    if (quest?.energy === "Boss") return "high";
    return "medium";
  }

  function planningEffortLabel(quest) {
    const effort = planningEffort(quest);
    return effort === "low" ? "Low effort" : effort === "high" ? "High effort" : "Medium effort";
  }

  function eligibleQuests() {
    const quests = typeof app.getQuestCatalog === "function" ? app.getQuestCatalog() : [];
    return quests.filter(quest => {
      if (!quest || !quest.id || !quest.name || quest.manualStatus === "Archived" || quest.active === false) return false;
      const availability = app.getQuestAvailability?.(quest);
      return availability ? availability.available : true;
    });
  }

  function eligibleAdventures() {
    const items = app.getState().sideAdventures?.items;
    return Array.isArray(items) ? items.filter(item => item && item.id && item.name && item.status === "active") : [];
  }

  function eligibleBooks() {
    const items = app.getState().bookLibrary?.items;
    return Array.isArray(items) ? items.filter(book => book && book.id && book.title && book.status === "reading") : [];
  }

  function eligibleGames() {
    const items = app.getState().gameLibrary?.items;
    return Array.isArray(items) ? items.filter(game => game && game.id && game.title && ["playing", "endless"].includes(game.status)) : [];
  }

  function chooseSourceCandidate(slot, checkIn, quests, adventures, books, games, used, excluded, previous = null, usedTypes = [], usedRealms = []) {
    const currentKey = previous ? sourceKey(previous.sourceType || "quest", previous.sourceId) : "";
    const currentId = previous?.sourceId || "";
    const seed = `${todayKey()}|${slot}|${Object.values(checkIn).join("|")}|${[...excluded].join(",")}`;

    const buildPool = relaxed => {
      const candidates = [];
      const allowed = (type, item) => {
        const key = sourceKey(type, item.id);
        if (used.has(key)) return false;
        if (!relaxed && (excluded.has(key) || excluded.has(item.id) || key === currentKey || item.id === currentId)) return false;
        if (relaxed === 1 && (key === currentKey || item.id === currentId)) return false;
        return true;
      };
      const push = (sourceType, item, baseScore) => {
        if (!allowed(sourceType, item)) return;
        const key = sourceKey(sourceType, item.id);
        const memory = plannerMemoryAdjustment(key, sourceType, sourceRealm(sourceType, item), slot);
        const diversity = diversityAdjustment(sourceType, sourceRealm(sourceType, item), usedTypes, usedRealms, slot);
        candidates.push({
          sourceType,
          item,
          score: baseScore + memory + diversity + momentAdjustment(sourceType, item, slot) + seededJitter(`${seed}|${sourceType}|${item.id}`)
        });
      };

      quests.forEach(quest => push("quest", quest, scoreQuest(quest, slot, checkIn)));
      adventures.forEach(item => push("adventure", item, scoreAdventure(item, slot, checkIn)));
      books.forEach(book => push("book", book, scoreBook(book, slot, checkIn)));
      games.forEach(game => push("game", game, scoreGame(game, slot, checkIn)));
      return candidates;
    };

    let pool = buildPool(0);
    if (!pool.length) pool = buildPool(1);
    if (!pool.length) pool = buildPool(2);
    const best = pool.sort((a, b) => b.score - a.score)[0] || null;
    if (!best) return null;

    // V2 may deliberately leave a slot empty instead of recommending something that fits badly.
    const floor = slot === "focus" ? -0.8 : slot === "joy" ? -0.35 : -0.15;
    return best.score >= floor || pool.length === 1 ? best : null;
  }

  function sourceRealm(type, item) {
    if (type === "book") return bookRoleMeta(item?.role).realm;
    if (type === "game") return gameRoleMeta(item?.role).realm;
    return String(item?.realm || (type === "adventure" ? "Hobbies" : ""));
  }

  function diversityAdjustment(type, realm, usedTypes, usedRealms, slot) {
    const sameType = usedTypes.filter(value => value === type).length;
    const sameRealm = realm ? usedRealms.filter(value => value === realm).length : 0;
    let penalty = sameType * 0.95 + sameRealm * 0.55;
    if (slot === "joy" && ["book", "game", "adventure"].includes(type)) penalty *= 0.72;
    if (slot === "gentle" && realm === "Recovery") penalty *= 0.6;
    return -penalty;
  }

  function plannerMemoryAdjustment(key, sourceType, realm, slot) {
    const stats = recentPickStats(key, sourceType, realm);
    let score = 0;
    if (stats.daysSinceItem === 1) score -= 2.8;
    else if (stats.daysSinceItem === 2) score -= 1.8;
    else if (stats.daysSinceItem === 3) score -= 1.05;
    else if (stats.daysSinceItem <= 7) score -= 0.5;
    if (stats.itemCount7 > 1) score -= Math.min(1.8, (stats.itemCount7 - 1) * 0.6);
    if (stats.typeCount3 >= 2) score -= Math.min(1.25, (stats.typeCount3 - 1) * 0.45);
    if (realm && stats.realmCount3 >= 2) score -= Math.min(0.9, (stats.realmCount3 - 1) * 0.32);

    const memory = plannerState().rerollMemory?.[key];
    if (memory) {
      const days = daysSinceDateKey(memory.lastDate);
      const recency = days <= 1 ? 1 : days <= 3 ? 0.8 : days <= 7 ? 0.55 : days <= 14 ? 0.3 : 0.12;
      score -= Math.min(3.5, Number(memory.count || 0) * 0.8) * recency;
      if (Number(memory.slots?.[slot] || 0) > 1 && days <= 7) score -= 0.45;
    }
    return score;
  }

  function recentPickStats(key, sourceType, realm) {
    const days = plannerState().days || {};
    const today = todayKey();
    let daysSinceItem = 999;
    let itemCount7 = 0;
    let typeCount3 = 0;
    let realmCount3 = 0;

    Object.entries(days).forEach(([date, day]) => {
      if (date === today) return;
      const age = daysBetweenDateKeys(date, today);
      if (age < 1 || age > 14) return;
      const historical = Array.isArray(day?.batchHistory) ? day.batchHistory.flatMap(batch => batch?.picks || []) : [];
      [...historical, ...(day?.picks || [])].forEach(pick => {
        const pickKey = sourceKey(pick.sourceType || "quest", pick.sourceId);
        if (pickKey === key) {
          daysSinceItem = Math.min(daysSinceItem, age);
          if (age <= 7) itemCount7 += 1;
        }
        if (age <= 3 && (pick.sourceType || "quest") === sourceType) typeCount3 += 1;
        if (age <= 3 && realm && pickRealm(pick) === realm) realmCount3 += 1;
      });
    });

    return { daysSinceItem, itemCount7, typeCount3, realmCount3 };
  }

  function pickRealm(pick) {
    if (!pick?.sourceId) return "";
    const type = pick.sourceType || "quest";
    if (type === "book") return sourceRealm(type, findBook(pick.sourceId));
    if (type === "game") return sourceRealm(type, findGame(pick.sourceId));
    if (type === "adventure") return sourceRealm(type, findAdventure(pick.sourceId));
    return sourceRealm(type, findQuest(pick.sourceId));
  }

  function makePickFromCandidate(slot, candidate, checkIn, previous = null) {
    if (candidate.sourceType === "game") {
      return {
        slot,
        sourceType: "game",
        sourceId: candidate.item.id,
        gameGoal: gameGoal(candidate.item, slot, checkIn),
        reason: reasonForGame(candidate.item, slot, checkIn),
        rerolls: Number(previous?.rerolls || 0),
        pickedAt: previous?.sourceType === "game" && previous?.sourceId === candidate.item.id ? Number(previous.pickedAt || Date.now()) : Date.now()
      };
    }
    if (candidate.sourceType === "book") {
      return {
        slot,
        sourceType: "book",
        sourceId: candidate.item.id,
        bookGoal: bookGoal(candidate.item, slot, checkIn),
        reason: reasonForBook(candidate.item, slot, checkIn),
        rerolls: Number(previous?.rerolls || 0),
        pickedAt: previous?.sourceType === "book" && previous?.sourceId === candidate.item.id ? Number(previous.pickedAt || Date.now()) : Date.now()
      };
    }
    if (candidate.sourceType === "adventure") {
      return {
        slot,
        sourceType: "adventure",
        sourceId: candidate.item.id,
        adventureGoal: adventureGoal(candidate.item, slot, checkIn),
        reason: reasonForAdventure(candidate.item, slot, checkIn),
        rerolls: Number(previous?.rerolls || 0),
        pickedAt: previous?.sourceType === "adventure" && previous?.sourceId === candidate.item.id ? Number(previous.pickedAt || Date.now()) : Date.now()
      };
    }
    return makePick(slot, candidate.item, checkIn, previous);
  }

  function makePick(slot, quest, checkIn, previous = null) {
    return {
      slot,
      sourceType: "quest",
      sourceId: quest.id,
      suggestedUnits: suggestedUnits(quest, slot, checkIn),
      reason: reasonFor(quest, slot, checkIn),
      rerolls: Number(previous?.rerolls || 0),
      pickedAt: previous?.sourceType === "quest" && previous?.sourceId === quest.id ? Number(previous.pickedAt || Date.now()) : Date.now()
    };
  }

  function scoreQuest(quest, slot, checkIn) {
    const realm = String(quest.realm || "");
    const priority = questPriority(quest);
    const capacity = effectiveCapacity(checkIn);
    const demand = questDemand(quest);
    const duration = estimatedMinutes(quest);
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const logs = questLogs(quest.id);
    const daysSince = daysSinceLast(logs);
    const doneToday = todayQuestUnits(quest.id) > 0;

    let score = 0;
    score += matchDemand(capacity, demand) * 2.2;
    score += adaptiveQuestFitAdjustment(quest, slot, checkIn, duration);
    if (duration) score += duration <= timeBudget ? 1.5 : -Math.min(4, (duration - timeBudget) / 20);
    score += Math.min(1.6, Math.max(0, daysSince - 2) * 0.09);
    if (doneToday) score -= 5;
    if (wasDoneYesterday(quest.id)) score -= 1.15;
    score -= cooldownPenalty(quest, logs);
    if (looksLikeGenericReadingQuest(quest) && hasSpecificReadingBookForRealm(realm)) score -= 3.4;
    if (looksLikeGenericGamingQuest(quest) && eligibleGames().length) score -= 3.2;

    if (slot === "focus") {
      score += PRIORITY_SCORE[priority] ?? 0.5;
      if (["Work", "Knowledge", "Japanese", "Home", "Health"].includes(realm)) score += 1.4;
      if (["Hobbies", "Recovery"].includes(realm)) score -= 0.4;
      if (checkIn.obligations === "help" && realm === "Work") score -= 1.6;
      if (checkIn.gentle && demand > 1.3) score -= 2.2;
    }

    if (slot === "joy") {
      if (realm === "Hobbies") score += 4;
      if (realm === "Recovery") score += 3;
      if (priority === "Optional" || priority === "Bonus") score += 1.2;
      if (realm === "Work") score -= 4;
      if (realm === "Home") score -= 1;
    }

    if (slot === "gentle") {
      if (realm === "Recovery") score += 4.5;
      if (priority === "Low Energy") score += 3;
      if (realm === "Hobbies") score += 1.4;
      if (demand <= 0.9) score += 2;
      if (duration && duration <= 20) score += 1.4;
      if (realm === "Work") score -= 3;
      if (demand > 1.6) score -= 2.5;
    }

    return score;
  }

  function adaptiveCapacityBand(checkIn) {
    const capacity = effectiveCapacity(checkIn);
    if (checkIn.gentle || checkIn.energy === "fumes" || (checkIn.sleep === "bad" && capacity < 1.35)) return "very-low";
    if (capacity < 1.35) return "low";
    if (capacity < 2.3) return "medium";
    return "high";
  }

  function adaptiveQuestFitAdjustment(quest, slot, checkIn, duration = estimatedMinutes(quest)) {
    const band = adaptiveCapacityBand(checkIn);
    const effort = planningEffort(quest);
    const budget = TIME_BUDGET[checkIn.time] || 30;
    const minutes = Math.max(0, Number(duration || 0));
    let score = 0;

    if (band === "very-low") {
      score += effort === "low" ? 4.2 : effort === "medium" ? -2.4 : -10;
      if (minutes && minutes <= 10) score += 2.2;
      else if (minutes && minutes <= 20) score += 1;
      else if (minutes > 30) score -= 5.5;
      else if (minutes > 20) score -= 2;
    } else if (band === "low") {
      score += effort === "low" ? 2.8 : effort === "medium" ? 0.15 : -5.8;
      if (minutes && minutes <= 20) score += 1.5;
      if (minutes > 45) score -= 4.5;
      else if (minutes > 30) score -= 1.8;
    } else if (band === "medium") {
      score += effort === "medium" ? 1.35 : effort === "low" ? 0.45 : (slot === "focus" ? 0.15 : -0.9);
      if (minutes > 75) score -= 2.2;
    } else {
      score += effort === "high" ? (slot === "focus" ? 3.2 : 0.6) : effort === "medium" ? 1.1 : 0;
      if (slot === "focus" && minutes >= 25 && minutes <= Math.max(45, budget)) score += 1;
    }

    // Sleep and stated battery get their own veto/boost so a single optimistic
    // answer elsewhere cannot completely cancel a rough morning.
    if (checkIn.sleep === "bad" && effort === "high") score -= 2.2;
    if (checkIn.energy === "fumes" && effort !== "low") score -= 3.5;
    if (checkIn.energy === "lots" && slot === "focus" && effort === "high") score += 1.4;
    if (["help", "busy"].includes(checkIn.obligations) && effort === "high") score -= 1.7;

    if (minutes > budget) score -= Math.min(5, (minutes - budget) / 12);
    if (["none", "little"].includes(checkIn.time) && minutes > 30) score -= 2.5;
    return score;
  }

  function looksLikeGenericReadingQuest(quest) {
    const name = String(quest?.name || "").toLowerCase();
    const unit = String(quest?.unitLabel || "").toLowerCase();
    return /read|reading|book|buch|lesen/.test(name) && /page|seite|chapter|kapitel|min|minute/.test(unit);
  }

  function hasSpecificReadingBookForRealm(realm) {
    return eligibleBooks().some(book => bookRoleMeta(book.role).realm === realm);
  }

  function looksLikeGenericGamingQuest(quest) {
    const name = String(quest?.name || "").toLowerCase();
    const unit = String(quest?.unitLabel || "").toLowerCase();
    return /game|gaming|videogame|video game|spielen|zocken/.test(name) && /min|minute|hour|stunde|session|time|mal/.test(unit);
  }

  function scoreAdventure(item, slot, checkIn) {
    const capacity = effectiveCapacity(checkIn);
    const demand = adventureDemand(item);
    const duration = Number(item.sessionMinutes || 30);
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const days = daysSinceTimestamp(item.lastTouchedAt || item.createdAt);
    const progress = item.progressMode === "percent" ? Number(item.progress || 0) : 0;
    const tags = new Set(item.reasonTags || []);
    let score = matchDemand(capacity, demand) * 2.2;

    score += duration <= timeBudget ? 1.8 : -Math.min(4.2, (duration - timeBudget) / 18);
    score += Math.min(2.2, Math.max(0, days - 3) * 0.12);
    if (!Number(item.sessions || 0)) score += 0.8;
    if (adventureTouchedToday(item.id)) score -= 5.2;
    if (progress >= 60) score += 0.55;
    if (progress >= 80) score += 0.75;
    if (tags.has("takes-space")) score += 0.55;
    if (tags.has("want-result")) score += 0.35;
    if (tags.has("deadline")) score += 0.65;

    if (slot === "focus") {
      if (tags.has("deadline")) score += 3.1;
      if (tags.has("takes-space")) score += 2.2;
      if (tags.has("want-result")) score += 1.45;
      if (["Home", "Knowledge", "Japanese", "Health"].includes(item.realm)) score += 1.15;
      if (item.energy === "high" && effectiveCapacity(checkIn) < 1.5) score -= 3.2;
      if (checkIn.gentle && item.energy !== "low") score -= 1.5;
      if (!String(item.nextAction || "").trim()) score -= 1.35;
      if (tags.has("fun") && !tags.has("deadline") && !tags.has("takes-space") && !tags.has("want-result")) score -= 1.0;
    }

    if (slot === "joy") {
      score += 4.8;
      if (["Hobbies", "Recovery"].includes(item.realm)) score += 0.8;
      if (tags.has("fun")) score += 0.75;
      if (item.energy === "high" && effectiveCapacity(checkIn) < 1.4) score -= 2.2;
    }

    if (slot === "gentle") {
      if (item.energy === "low") score += 4.2;
      if (duration <= 20) score += 2.1;
      else if (duration <= 30) score += 0.9;
      if (item.energy === "high") score -= 4.5;
      if (checkIn.gentle && item.energy === "low") score += 1.4;
    }

    return score;
  }

  function scoreBook(book, slot, checkIn) {
    const role = book.role || "fun";
    const capacity = effectiveCapacity(checkIn);
    const demand = bookDemand(book);
    const goal = bookGoal(book, slot, checkIn);
    const duration = goal.type === "minutes" ? goal.amount : goal.type === "pages" ? goal.amount * 2 : goal.type === "chapter" ? 25 : 20;
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const days = daysSinceTimestamp(book.lastReadAt || book.startedAt || book.createdAt);
    const progress = bookProgress(book) || 0;
    let score = matchDemand(capacity, demand) * 2.1;

    score += duration <= timeBudget ? 1.7 : -Math.min(4, (duration - timeBudget) / 15);
    score += Math.min(3.1, Math.max(0, days - 3) * 0.14);
    if (bookTouchedToday(book.id)) score -= 6;
    if (progress >= 50) score += 0.55;
    if (progress >= 70) score += 0.75;
    if (progress >= 90) score += 1.0;
    if (book.continueSeries && book.series) score += 0.45;

    if (slot === "focus") {
      if (["knowledge", "growth", "japanese", "work"].includes(role)) score += 4.1;
      if (role === "japanese") score += 0.65;
      if (role === "work") score += checkIn.obligations === "help" ? -1.6 : 0.5;
      if (role === "fun") score -= 3.4;
      if (checkIn.gentle && demand > 1.2) score -= 1.5;
    }

    if (slot === "joy") {
      if (role === "fun") score += 5.6;
      if (role === "growth") score += 0.4;
      if (role === "work") score -= 4.5;
      if (role === "knowledge") score -= 1.1;
    }

    if (slot === "gentle") {
      if (role === "fun") score += 3.6;
      if (role === "growth") score += 1.1;
      if (book.source === "audio") score += 1.2;
      if (duration <= 20) score += 2;
      if (duration > 35) score -= 2;
      if (role === "work") score -= 3.2;
      if (checkIn.gentle) score += 0.8;
    }

    return score;
  }

  function scoreGame(game, slot, checkIn) {
    const role = game.role || "fun";
    const capacity = effectiveCapacity(checkIn);
    const duration = Number(game.sessionMinutes || 45);
    const timeBudget = TIME_BUDGET[checkIn.time] || 30;
    const days = daysSinceTimestamp(game.lastPlayedAt || game.createdAt);
    const openGoals = Array.isArray(game.goals) ? game.goals.filter(goal => !goal.done) : [];
    const progress = game.progressMode === "percent" ? Number(game.progress || 0) : null;
    let demand = 0.75;
    if (role === "challenge") demand += 0.25;
    if (role === "japanese") demand += 0.2;
    if (duration >= 90) demand += 0.55;
    else if (duration >= 60) demand += 0.3;
    else if (duration <= 20) demand -= 0.18;

    let score = matchDemand(capacity, demand) * 2;
    score += duration <= timeBudget ? 1.7 : -Math.min(3.8, (duration - timeBudget) / 20);
    score += Math.min(3.2, Math.max(0, days - 3) * 0.13);
    if (gameTouchedToday(game.id)) score -= 6;
    if (openGoals.length) score += Math.min(1.2, openGoals.length * 0.22);
    if (progress !== null && progress >= 65) score += 0.55;
    if (progress !== null && progress >= 85) score += 0.7;

    if (slot === "focus") {
      if (role === "japanese") score += 4.5;
      else if (role === "challenge") score += 0.8;
      else score -= 4.3;
      if (checkIn.gentle) score -= 1.4;
    }

    if (slot === "joy") {
      score += 5.1;
      if (role === "fun") score += 1;
      if (role === "social") score += 0.8;
      if (role === "japanese") score += 0.4;
      if (openGoals.length) score += 0.5;
    }

    if (slot === "gentle") {
      if (duration <= 30) score += 3.1;
      else if (duration <= 45) score += 1.6;
      if (role === "fun") score += 2.4;
      if (role === "social") score += 1;
      if (role === "challenge") score -= 1.1;
      if (duration >= 90) score -= 2.8;
      if (checkIn.gentle && duration <= 30) score += 0.8;
    }

    return score;
  }

  function gameGoal(game, slot, checkIn) {
    const budget = TIME_BUDGET[checkIn.time] || 30;
    const capacity = effectiveCapacity(checkIn);
    const gentle = slot === "gentle" || checkIn.gentle || capacity < 1;
    let minutes = Number(game.sessionMinutes || 45);
    if (gentle) minutes = Math.min(minutes, 30);
    else if (budget <= 15) minutes = Math.min(minutes, 15);
    else if (budget <= 30) minutes = Math.min(minutes, 30);
    else if (budget <= 45) minutes = Math.min(minutes, 45);
    else if (budget <= 60) minutes = Math.min(minutes, 60);
    minutes = Math.max(10, minutes);

    const goals = Array.isArray(game.goals) ? game.goals.filter(goal => !goal.done) : [];
    let goal = goals.find(item => item.id === game.lastGoalId) || goals[0] || null;
    const base = `Play ${game.title} for ${minutes} minutes`;
    return {
      minutes,
      goalId: goal?.id || null,
      label: goal ? `${base} and work toward “${goal.text}”` : base
    };
  }

  function bookDemand(book) {
    const role = book.role || "fun";
    let demand = ({ fun: 0.7, growth: 0.9, knowledge: 1.15, japanese: 1.2, work: 1.35 })[role] ?? 0.9;
    if (book.source === "audio") demand -= 0.2;
    return clamp(demand, 0.2, 2.2);
  }

  function bookGoal(book, slot, checkIn) {
    const preferred = book.preferredGoal || "auto";
    const budget = TIME_BUDGET[checkIn.time] || 30;
    const capacity = effectiveCapacity(checkIn);
    const gentle = slot === "gentle" || checkIn.gentle || capacity < 1;
    const title = book.title || "this book";

    if (book.source === "audio" || preferred === "minutes") {
      let amount = gentle ? 15 : budget >= 60 && capacity >= 2 ? 30 : 20;
      amount = Math.max(10, Math.min(amount, Math.max(10, budget)));
      return { type: "minutes", amount, label: `${book.source === "audio" ? "Listen to" : "Read"} ${title} for ${amount} minutes` };
    }

    if (preferred === "chapter") {
      return { type: "chapter", amount: 1, label: `Read 1 chapter of ${title}` };
    }

    let amount = gentle ? 5 : budget >= 60 && capacity >= 2 ? 20 : 10;
    if (slot === "joy" && !gentle && budget >= 30) amount = 15;
    const current = Math.max(0, Number(book.currentPage || 0));
    if (book.totalPages) {
      const remaining = Math.max(0, Number(book.totalPages) - current);
      if (remaining > 0) amount = Math.min(amount, remaining);
      if (remaining > 0 && amount >= remaining) {
        return { type: "pages", amount: remaining, label: `Finish the last ${formatNumber(remaining)} page${remaining === 1 ? "" : "s"} of ${title}` };
      }
    }

    amount = Math.max(1, amount);
    if (current > 0) {
      const startPage = Math.floor(current) + 1;
      const endPage = Math.floor(current + amount);
      return { type: "pages", amount, label: `Read pages ${startPage}–${endPage} of ${title}` };
    }
    return { type: "pages", amount, label: `Read the first ${formatNumber(amount)} page${amount === 1 ? "" : "s"} of ${title}` };
  }

  function adventureGoal(item, slot, checkIn) {
    const budget = TIME_BUDGET[checkIn.time] || 30;
    const capacity = effectiveCapacity(checkIn);
    const gentle = slot === "gentle" || checkIn.gentle || capacity < 1;
    let minutes = Math.max(10, Number(item.sessionMinutes || 30));
    if (gentle) minutes = Math.min(minutes, 20);
    else if (budget <= 15) minutes = Math.min(minutes, 15);
    else if (budget <= 30) minutes = Math.min(minutes, 30);
    else if (budget <= 60) minutes = Math.min(minutes, 45);
    else minutes = Math.min(minutes, 60);

    const action = String(item.nextAction || "").trim();
    if (!action) return { minutes, label: `Spend ${minutes} minutes on ${item.name || "this project"}` };

    const hasConcreteUnit = /\b\d+(?:[.,]\d+)?\s*(?:row|rows|reihe|reihen|step|steps|schritt|schritte|page|pages|seite|seiten|chapter|chapters|kapitel|minute|minutes|min|hour|hours|stunde|stunden|piece|pieces|part|parts)\b/i.test(action);
    const genericStart = /^(?:continue|keep working on|work on|practice|make progress on|do more|weitermachen|weiterarbeiten|üben|daran arbeiten)\b/i.test(action);
    if (genericStart && !hasConcreteUnit) {
      return { minutes, label: `${action.replace(/[.!?]+$/, "")} for ${minutes} minutes` };
    }
    return { minutes, label: action };
  }

  function adventureDemand(item) {
    let demand = ({ low: 0.55, medium: 1.35, high: 2.15 })[item.energy] ?? 1.35;
    const minutes = Number(item.sessionMinutes || 30);
    if (minutes >= 90) demand += 0.55;
    else if (minutes >= 60) demand += 0.3;
    else if (minutes <= 15) demand -= 0.25;
    return clamp(demand, 0.1, 3);
  }

  function effectiveCapacity(checkIn) {
    const sleep = VALUE.sleep[checkIn.sleep] ?? 1;
    const energy = VALUE.energy[checkIn.energy] ?? 1;
    const obligations = VALUE.obligations[checkIn.obligations] ?? 1;
    let capacity = energy * 0.58 + sleep * 0.25 + obligations * 0.17;
    if (checkIn.gentle) capacity -= 1;
    return clamp(capacity, 0, 3);
  }

  function questDemand(quest) {
    const effort = planningEffort(quest);
    let demand = effort === "low" ? 0.55 : effort === "high" ? 2.35 : 1.45;
    const minutes = estimatedMinutes(quest);
    if (minutes >= 75) demand += 0.45;
    else if (minutes >= 45) demand += 0.25;
    else if (minutes && minutes <= 10) demand -= 0.2;

    // Realm is only a small friction hint now. Explicit effort metadata wins.
    if (quest.realm === "Recovery") demand -= 0.15;
    if (quest.realm === "Work") demand += 0.12;
    if (quest.realm === "Health" && effort !== "low") demand += 0.06;
    return clamp(demand, 0.1, 3);
  }

  function matchDemand(capacity, demand) {
    const delta = Math.abs(capacity - demand);
    return 1.6 - delta;
  }

  function estimatedMinutes(quest) {
    const explicit = Number(quest?.planningMinutes || 0);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const session = String(quest?.sessionSize || "").toLowerCase();
    const sessionNumbers = [...session.matchAll(/\d+/g)].map(match => Number(match[0])).filter(Number.isFinite);
    if (sessionNumbers.length >= 2) return (sessionNumbers[0] + sessionNumbers[1]) / 2;
    if (sessionNumbers.length === 1) return sessionNumbers[0];
    if (session.includes("tiny")) return 10;
    if (session.includes("short")) return 25;
    if (session.includes("medium")) return 45;
    if (session.includes("long")) return 75;

    const target = questTargetValue(quest);
    const unit = String(quest.unitLabel || "").toLowerCase();
    if (!target) return 0;
    if (/(min|minute)/.test(unit)) return target;
    if (/(page|seite)/.test(unit)) return target * 2;
    if (/(hour|stunde)/.test(unit)) return target * 60;
    if (/(chapter|kapitel)/.test(unit)) return target * 25;
    return planningEffort(quest) === "low" ? 10 : planningEffort(quest) === "high" ? 45 : 25;
  }

  function suggestedUnits(quest, slot, checkIn) {
    const target = Math.max(0.1, questTargetValue(quest));
    if (!isVariableQuest(quest)) return target;

    const capacity = effectiveCapacity(checkIn);
    let fraction = slot === "gentle" ? 0.45 : slot === "joy" ? 0.65 : 0.8;
    if (capacity < 0.8) fraction *= 0.55;
    else if (capacity < 1.5) fraction *= 0.72;
    else if (capacity > 2.5) fraction = Math.min(1, fraction + 0.2);
    if (checkIn.gentle) fraction *= 0.72;

    const duration = estimatedMinutes(quest);
    const budget = TIME_BUDGET[checkIn.time] || 30;
    if (duration > 0 && duration * fraction > budget) fraction *= budget / (duration * fraction);

    const raw = clamp(target * fraction, Math.min(target, sensibleMinimum(quest)), target);
    return roundFriendly(raw, quest.unitLabel);
  }

  function sensibleMinimum(quest) {
    const unit = String(quest.unitLabel || "").toLowerCase();
    if (/(min|minute)/.test(unit)) return 5;
    if (/(page|seite)/.test(unit)) return 5;
    if (/(hour|stunde)/.test(unit)) return 0.25;
    return 1;
  }

  function roundFriendly(value, unitLabel) {
    const unit = String(unitLabel || "").toLowerCase();
    if (/(min|minute|page|seite|row|reihe|step|schritt)/.test(unit)) {
      if (value >= 20) return Math.max(1, Math.round(value / 5) * 5);
      return Math.max(1, Math.round(value));
    }
    if (value >= 5) return Math.round(value);
    return Math.round(value * 2) / 2;
  }

  function reasonFor(quest, slot, checkIn) {
    const realm = quest.realm || "this Realm";
    const low = effectiveCapacity(checkIn) < 1.25 || checkIn.gentle;
    const busy = ["help", "busy"].includes(checkIn.obligations) || ["none", "little"].includes(checkIn.time);
    const days = daysSinceLast(questLogs(quest.id));

    if (slot === "joy") {
      if (days >= 10) return `It's a ${realm} thing you haven't touched in a while, and today's plan should include something chosen for you rather than only obligations.`;
      return `It keeps a ${realm} option in the day on purpose, so the plan isn't just a productivity list.`;
    }
    if (slot === "gentle") {
      if (low) return `Your check-in points toward lower friction today. This is tagged ${planningEffortLabel(quest).toLowerCase()} and is roughly ${formatNumber(estimatedMinutes(quest))} minutes, so it fits the smaller battery.`;
      return `This gives you an easy fallback if the day gets heavier than the morning plan expected.`;
    }
    if (slot === "focus" && adaptiveCapacityBand(checkIn) === "high" && planningEffort(quest) === "high") {
      return `Sleep, battery and available time leave room for a bigger move today, so the planner is deliberately surfacing a higher-effort ${realm} option.`;
    }
    if (busy) return `Your available time is limited, so this is a concrete ${realm} move without asking you to browse the whole Quest Board.`;
    if (days >= 14) return `This ${realm} quest has been out of rotation for a while, and today has enough room to bring it back.`;
    return `It matches today's capacity reasonably well and gives the day one clear ${realm} direction.`;
  }

  function reasonForAdventure(item, slot, checkIn) {
    const days = daysSinceTimestamp(item.lastTouchedAt || item.createdAt);
    const progress = item.progressMode === "percent" ? clamp(Number(item.progress || 0), 0, 100) : null;
    const tags = new Set(item.reasonTags || []);
    const lowDay = effectiveCapacity(checkIn) < 1.25 || checkIn.gentle;

    if (slot === "focus") {
      if (tags.has("takes-space")) return `You marked this as something that takes up space, so the planner is giving you one concrete step toward getting that space back.`;
      if (tags.has("deadline")) return `This project has a real deadline attached to it, and today's check-in leaves enough room for one defined next action.`;
      if (tags.has("want-result") && progress !== null && progress >= 60) return `You want the finished result and you're already ${progress}% through it. One specific step is a better focus move than starting another new thing.`;
      return `This has a defined next action and fits today's capacity, so it can act as the one useful thing without turning the whole project into today's job.`;
    }
    if (slot === "gentle" && item.energy === "low") {
      return `This is a low-friction project with a concrete stopping point, so it still fits if the day gets heavier than expected.`;
    }
    if (progress !== null && progress >= 75) {
      return `You're already ${progress}% through this, so one specific next step has a good chance of creating visible momentum.`;
    }
    if (tags.has("takes-space") && days >= 7) {
      return `This has been sitting around for ${humanDays(days)} and it literally takes up space. One small step moves it toward being out of the way.`;
    }
    if (days >= 14) {
      return `You chose this for yourself, but haven't touched it in ${humanDays(days)}. The planner is bringing back one concrete step instead of the whole project.`;
    }
    if (tags.has("fun")) {
      return `This is here on purpose because today's plan should contain something you actually chose for fun, not only things that need doing.`;
    }
    if (lowDay) {
      return `Its next action is specific enough to stop after one session, which keeps the commitment small on a lower-capacity day.`;
    }
    return `It fits today's time and energy reasonably well, and the next action is already defined so you don't have to decide how to start.`;
  }

  function rerollSlot(slotId) {
    if (!SLOTS[slotId]) return;
    const day = todayRecord();
    if (!day?.checkIn) return;
    const current = (day.picks || []).find(p => p.slot === slotId);
    if (!current) return;

    day.rerollHistory ||= { focus: [], joy: [], gentle: [] };
    day.rerollHistory[slotId] ||= [];
    const key = sourceKey(current.sourceType || "quest", current.sourceId);
    if (current.sourceId && !day.rerollHistory[slotId].includes(key)) day.rerollHistory[slotId].push(key);
    day.rerollHistory[slotId] = day.rerollHistory[slotId].slice(-16);
    rememberReroll(key, slotId);

    const otherPicks = (day.picks || []).filter(p => p.slot !== slotId);
    const used = new Set(otherPicks.map(p => sourceKey(p.sourceType || "quest", p.sourceId)));
    const usedTypes = otherPicks.map(p => p.sourceType || "quest");
    const usedRealms = otherPicks.map(pickRealm).filter(Boolean);
    const candidate = chooseSourceCandidate(
      slotId,
      day.checkIn,
      eligibleQuests(),
      eligibleAdventures(),
      eligibleBooks(),
      eligibleGames(),
      used,
      new Set(day.rerollHistory[slotId]),
      current,
      usedTypes,
      usedRealms
    );

    if (!candidate) return;
    const next = makePickFromCandidate(slotId, candidate, day.checkIn, current);
    next.rerolls = Number(current.rerolls || 0) + 1;
    day.picks = (day.picks || []).map(p => p.slot === slotId ? next : p);
    day.updatedAt = Date.now();
    persist("daily-pick-reroll");
  }

  function rememberReroll(key, slotId) {
    if (!key) return;
    const planner = plannerState();
    planner.rerollMemory ||= {};
    const current = planner.rerollMemory[key] || { count: 0, lastDate: todayKey(), lastAt: 0, slots: {} };
    current.count = Math.min(12, Number(current.count || 0) + 1);
    current.lastDate = todayKey();
    current.lastAt = Date.now();
    current.slots ||= {};
    current.slots[slotId] = Math.min(12, Number(current.slots[slotId] || 0) + 1);
    planner.rerollMemory[key] = current;
  }

  function openQuestLog(questId, suggested) {
    const quest = findQuest(questId);
    if (!quest) return;

    const direct = document.querySelector(`.complete-quest-button[data-quest-id="${cssEscape(questId)}"]`);
    if (direct) {
      direct.click();
      window.setTimeout(() => prefillUnits(suggested), 0);
      return;
    }

    const dialog = byId("completeDialog");
    const id = byId("completeQuestId");
    const title = byId("completeQuestTitle");
    const units = byId("actualUnits");
    if (!dialog || !id || !title || !units) return;
    id.value = quest.id;
    title.textContent = quest.name;
    units.value = suggested || questTargetValue(quest);
    units.min = questTargetValue(quest) < 1 ? "0.1" : "1";
    units.step = questTargetValue(quest) < 1 ? "0.1" : "1";
    units.dispatchEvent(new Event("input", { bubbles: true }));
    dialog.showModal();
  }

  function prefillUnits(value) {
    if (!value) return;
    const input = byId("actualUnits");
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function companionForDate() {
    const state = app.getState();
    const flags = state.flags || {};
    const options = [companionById("luca")];

    if (flags.STORY_MINA_FRIENDSHIP_STARTED) {
      const mina = companionById("mina");
      mina.weight = flags.MINA_HANGOUTS_UNLOCKED ? 2.6 : 1;
      options.push(mina);
    }

    const history = plannerState().companionHistory || [];
    const recent = history.filter(item => item.date < todayKey()).slice(-3).reverse();
    options.forEach(option => {
      if (option.id === "luca") return;
      if (recent[0]?.id === option.id) option.weight *= 0.18;
      else if (recent.slice(0, 2).some(item => item.id === option.id)) option.weight *= 0.48;
    });

    const seed = seededRandom(`${todayKey()}|companion|${history.slice(-5).map(h => h.id).join("-")}`);
    const total = options.reduce((sum, item) => sum + item.weight, 0);
    let cursor = seed * total;
    for (const option of options) {
      cursor -= option.weight;
      if (cursor <= 0) return option;
    }
    return options[0];
  }

  function companionById(id) {
    if (id === "mina") {
      return {
        id: "mina",
        name: "Mina",
        kicker: "A QUICK CHECK-IN",
        weight: 1,
        portrait: "assets/story/sprites/mina_neutral.png",
        previewLine: "Some mornings, someone from Luca's actual social world may wander into the briefing. Not every day.",
        dialogLine: "Okay, important question: how alive are we today?",
        doneLine: "Good. Tiny plan. No turning this into a twelve-step self-improvement challenge."
      };
    }
    return {
      id: "luca",
      name: "Luca",
      kicker: "SELF CHECK-IN",
      weight: 6,
      portrait: "assets/story/portraits/luca_thinking.png",
      previewLine: "Most days can simply begin with Luca checking in with herself.",
      dialogLine: "Let's make this smaller. What kind of day are we actually working with?",
      doneLine: "Okay. That's enough information. Pick the next thing, not the whole life."
    };
  }

  function companionMarkup(companion, { preview = false, day = null } = {}) {
    const c = companion || companionById("luca");
    const line = preview ? companionPreviewLine(c) : companionDoneLine(c, day);
    return `
      <div class="daily-companion-art-v14 ${escAttr(c.id)}">${companionImage(c)}</div>
      <div class="daily-companion-copy-v14">
        <small>${esc(c.kicker)}</small>
        <strong>${esc(c.name)}</strong>
        <p>${esc(line)}</p>
      </div>`;
  }

  function companionImage(companion, dialog = false) {
    if (!companion?.portrait) return `<span>${companion?.id === "mina" ? "✦" : "L"}</span>`;
    return `<img src="${escAttr(companion.portrait)}" alt="${escAttr(companion.name)}" class="${dialog ? "daily-dialog-image-v14" : "daily-companion-image-v14"}" />`;
  }

  function dialogTitleFor(companion) {
    return companion?.id === "mina" ? "Quick status report." : "Let's make the day smaller.";
  }


  function ensureDayBatchState(day) {
    if (!day || typeof day !== "object") return day;
    if (!Number.isFinite(Number(day.batchIndex)) || Number(day.batchIndex) < 1) day.batchIndex = 1;
    if (!Array.isArray(day.batchHistory)) day.batchHistory = [];
    if (!day.rerollHistory || typeof day.rerollHistory !== "object") day.rerollHistory = { focus: [], joy: [], gentle: [] };
    return day;
  }

  function pickStartMs(pick) {
    const explicit = Number(pick?.pickedAt || 0);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  function timeFromValue(value) {
    if (typeof value === "number") return value;
    const parsed = new Date(value || 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function pickCompletion(pick) {
    if (!pick?.sourceId) return { done: false, progress: 0, progressText: "Not started" };
    const start = pickStartMs(pick);
    const type = pick.sourceType || "quest";

    if (type === "book") {
      const goal = pick.bookGoal || bookGoal(findBook(pick.sourceId) || {}, pick.slot, todayRecord()?.checkIn || {});
      const logs = bookLogs(pick.sourceId).filter(log => timeFromValue(log.at) >= start);
      if (goal.type === "chapter") {
        const count = logs.filter(log => log.chapter).length;
        return { done: count >= 1, progress: count, progressText: count ? "1 chapter complete" : "0 / 1 chapter" };
      }
      if (goal.type === "minutes") {
        const amount = logs.reduce((sum, log) => sum + Math.max(0, Number(log.minutes || 0)), 0);
        return { done: amount >= Number(goal.amount || 0), progress: amount, progressText: `${formatNumber(amount)} / ${formatNumber(goal.amount)} min` };
      }
      const pages = logs.reduce((sum, log) => sum + Math.max(0, Number(log.pages || 0)), 0);
      return { done: pages >= Number(goal.amount || 0), progress: pages, progressText: `${formatNumber(pages)} / ${formatNumber(goal.amount)} pages` };
    }

    if (type === "game") {
      const goal = pick.gameGoal || gameGoal(findGame(pick.sourceId) || {}, pick.slot, todayRecord()?.checkIn || {});
      const minutes = gameLogs(pick.sourceId)
        .filter(log => timeFromValue(log.at) >= start)
        .reduce((sum, log) => sum + Math.max(0, Number(log.minutes || 0)), 0);
      return { done: minutes >= Number(goal.minutes || 0), progress: minutes, progressText: `${formatDuration(minutes)} / ${formatDuration(goal.minutes || 0)}` };
    }

    if (type === "adventure") {
      const logs = adventureLogs(pick.sourceId).filter(log => timeFromValue(log.at) >= start);
      return { done: logs.length > 0, progress: logs.length, progressText: logs.length ? "Next action logged ✓" : "Next action still open" };
    }

    const goal = Number(pick.suggestedUnits || questTargetValue(findQuest(pick.sourceId) || {}));
    const progress = (app.getState().completionLog || [])
      .filter(log => log.questId === pick.sourceId && timeFromValue(log.at) >= start)
      .reduce((sum, log) => sum + Math.max(0, Number(log.units || 0)), 0);
    return { done: progress >= goal - 1e-9, progress, progressText: `${formatNumber(progress)} / ${formatNumber(goal)}` };
  }

  function currentBatchComplete(day) {
    const picks = Array.isArray(day?.picks) ? day.picks : [];
    return picks.length === 3 && picks.every(pick => pickCompletion(pick).done);
  }

  function maybeAwardBatchClear(day) {
    if (!day?.checkIn) return false;
    ensureDayBatchState(day);
    if (!currentBatchComplete(day) || day.batchReward?.eventId) return false;
    const batchIndex = Math.max(1, Number(day.batchIndex || 1));
    const bonus = BATCH_BONUSES[Math.min(batchIndex - 1, BATCH_BONUSES.length - 1)];
    const sourceId = `${day.date || todayKey()}:batch-${batchIndex}`;
    const existing = (app.getState().rewardLedger?.events || []).find(event => event.source === "daily-batch-clear" && event.sourceId === sourceId);
    const reward = existing ? {
      eventId: existing.id,
      storyEnergy: Number(existing.storyEnergy || 0),
      rawStoryEnergy: Number(existing.rawStoryEnergy || 0),
      xp: Number(existing.xp || 0),
      coins: Number(existing.coins || 0)
    } : app.awardActivity?.({
      source: "daily-batch-clear",
      sourceId,
      label: `Today's Picks batch ${batchIndex} cleared`,
      xp: bonus.xp,
      realmXP: 0,
      statXP: 0,
      coins: bonus.coins,
      storyEnergyBase: bonus.storyEnergyBase,
      progressionRelevant: false,
      metadata: { batchIndex, pickKeys: day.picks.map(pick => sourceKey(pick.sourceType || "quest", pick.sourceId)) }
    });
    if (!reward) return false;
    day.batchReward = {
      eventId: reward.eventId || existing?.id || null,
      storyEnergy: Number(reward.storyEnergy || 0),
      rawStoryEnergy: Number(reward.rawStoryEnergy || bonus.storyEnergyBase),
      xp: Number(reward.xp || 0),
      coins: Number(reward.coins || 0)
    };
    day.batchClearedAt = Date.now();
    day.updatedAt = Date.now();
    writeShadow(plannerState());
    app.saveState({ source: "daily-batch-clear" });
    return !existing;
  }

  function renderBatchStatus(day) {
    if (!els.batchStatus) return;
    if (!day?.checkIn || !Array.isArray(day.picks) || !day.picks.length) {
      els.batchStatus.classList.add("hidden");
      els.batchStatus.innerHTML = "";
      return;
    }
    ensureDayBatchState(day);
    const completed = day.picks.filter(pick => pickCompletion(pick).done).length;
    const batchIndex = Math.max(1, Number(day.batchIndex || 1));
    const fullBatch = day.picks.length === 3;
    els.batchStatus.classList.remove("hidden");

    if (fullBatch && completed === 3 && day.batchReward?.eventId) {
      const reward = day.batchReward;
      const canContinue = batchIndex < MAX_BATCHES_PER_DAY;
      els.batchStatus.innerHTML = `
        <div class="daily-batch-clear-v23">
          <span class="daily-batch-clear-icon-v23">✦</span>
          <div><small>BATCH ${batchIndex} CLEARED</small><strong>All three finish lines complete.</strong><p>Closure bonus: +${esc(app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy)} 🔥 · +${Number(reward.xp || 0)} XP${Number(reward.coins || 0) ? ` · +${Number(reward.coins)} 🪙` : ""}. Anything else today is extra.</p></div>
          ${canContinue ? '<button class="secondary-button" type="button" data-daily-new-batch>Start another batch</button>' : '<span class="daily-batch-limit-v23">Three batches is plenty ✓</span>'}
        </div>`;
      return;
    }

    if (!fullBatch) {
      els.batchStatus.innerHTML = `<div class="daily-batch-progress-v23"><span>✿</span><div><small>LIGHT PLAN</small><strong>${completed}/${day.picks.length} complete</strong><p>A batch-clear bonus appears only when the planner can build three useful picks. No need to fill the gap yourself.</p></div></div>`;
      return;
    }

    const nextBonus = BATCH_BONUSES[Math.min(batchIndex - 1, BATCH_BONUSES.length - 1)];
    els.batchStatus.innerHTML = `<div class="daily-batch-progress-v23"><span>${completed ? "✦" : "✿"}</span><div><small>BATCH ${batchIndex} · ${completed}/3</small><strong>${completed === 2 ? "One finish line left." : completed === 1 ? "One down. Two to go." : "Three things. Then stop if you want."}</strong><p>Clear all three for a completion bonus worth up to ${esc(app.formatEnergy?.(nextBonus.storyEnergyBase) ?? nextBonus.storyEnergyBase)} 🔥 before daily diminishing returns.</p></div></div>`;
  }

  function startNewBatch() {
    const day = todayRecord();
    if (!day?.checkIn) return;
    ensureDayBatchState(day);
    if (!currentBatchComplete(day) || !day.batchReward?.eventId) return;
    if (Number(day.batchIndex || 1) >= MAX_BATCHES_PER_DAY) return;

    const excluded = new Set();
    (day.batchHistory || []).forEach(batch => (batch?.picks || []).forEach(pick => excluded.add(sourceKey(pick.sourceType || "quest", pick.sourceId))));
    (day.picks || []).forEach(pick => excluded.add(sourceKey(pick.sourceType || "quest", pick.sourceId)));
    const freshRerolls = { focus: [], joy: [], gentle: [] };
    const nextPicks = buildPicks(day.checkIn, [], freshRerolls, excluded);
    if (nextPicks.length < 3) {
      app.showToast?.("No fresh full batch left today — anything else is bonus play.");
      return;
    }

    day.batchHistory.push({
      batchIndex: Number(day.batchIndex || 1),
      picks: structuredCloneSafe(day.picks || []),
      reward: { ...(day.batchReward || {}) },
      clearedAt: day.batchClearedAt || Date.now()
    });
    day.batchHistory = day.batchHistory.slice(-8);
    day.batchIndex = Number(day.batchIndex || 1) + 1;
    day.picks = nextPicks;
    day.rerollHistory = freshRerolls;
    day.batchReward = null;
    day.batchClearedAt = null;
    day.updatedAt = Date.now();
    persist("daily-new-batch");
  }

  function checkInXPForStreak(streak) {
    const safe = Math.max(1, Math.round(Number(streak || 1)));
    return 5 + Math.min(5, Math.floor((safe - 1) / 2));
  }

  function checkInStoryEnergyForStreak(streak) {
    const safe = Math.max(1, Math.round(Number(streak || 1)));
    return Math.min(1, 0.6 + Math.floor((safe - 1) / 2) * 0.1);
  }

  function checkInStreakOnCompletion(planner, key) {
    let streak = 1;
    let cursor = previousDateKey(key);
    while (planner?.days?.[cursor]?.checkIn) {
      streak += 1;
      cursor = previousDateKey(cursor);
      if (streak >= 3650) break;
    }
    return streak;
  }

  function currentCheckInStreak() {
    const planner = plannerState();
    const today = todayKey();
    if (!planner.days?.[today]?.checkIn) return 0;
    return checkInStreakOnCompletion(planner, today);
  }

  function projectedCheckInReward() {
    const planner = plannerState();
    const key = todayKey();
    const existing = planner.days?.[key];
    if (existing?.checkIn) {
      const streak = Number(existing.checkInReward?.streak || checkInStreakOnCompletion(planner, key));
      return {
        xp: Number(existing.checkInReward?.xp || 0),
        storyEnergy: Number(existing.checkInReward?.storyEnergy || 0),
        streak,
        alreadyDone: true
      };
    }
    const streak = checkInStreakOnCompletion(planner, key);
    const xp = checkInXPForStreak(streak);
    const rawStoryEnergy = checkInStoryEnergyForStreak(streak);
    const preview = app.previewActivityReward?.({
      source: "daily-checkin-preview",
      sourceId: key,
      xp,
      realmXP: 0,
      statXP: 0,
      coins: 0,
      storyEnergyBase: rawStoryEnergy,
      progressionRelevant: false
    });
    return {
      xp,
      storyEnergy: Number(preview?.storyEnergy ?? rawStoryEnergy),
      rawStoryEnergy,
      streak,
      alreadyDone: false
    };
  }

  function previousDateKey(key) {
    const date = new Date(`${key}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() - 1);
    return dateKey(date);
  }

  function checkInRewardMarkup(reward) {
    if (!reward) {
      const streak = currentCheckInStreak();
      return streak > 0
        ? `<div class="daily-checkin-reward-v271 legacy"><span>✦</span><div><small>CHECK-IN STREAK</small><strong>${streak} day${streak === 1 ? "" : "s"}</strong><p>Older check-ins remain valid; Daily Loop rewards apply to new check-ins.</p></div></div>`
        : "";
    }
    const streak = Math.max(1, Number(reward.streak || 1));
    return `<div class="daily-checkin-reward-v271"><span>+${formatEnergy(reward.storyEnergy || 0)} 🔥</span><div><small>DAILY LOOP REWARD · +${Number(reward.xp || 0)} XP</small><strong>${streak} day${streak === 1 ? "" : "s"} in a row</strong><p>Showing up counts. The streak gradually raises both rewards; Story Energy caps at +1/day and XP at +10/day.</p></div></div>`;
  }

  function ensureTodayCheckInStoryEnergyReward() {
    const planner = plannerState();
    const key = todayKey();
    const day = planner.days?.[key];
    if (!day?.checkIn) return false;
    const existingReward = day.checkInReward || {};
    if (Number(existingReward.storyEnergyVersion || 0) >= 2 || Number(existingReward.storyEnergy || 0) > 0) return false;

    const streak = Number(existingReward.streak || checkInStreakOnCompletion(planner, key));
    const requestedStoryEnergy = checkInStoryEnergyForStreak(streak);
    const reward = app.awardActivity?.({
      source: "daily-checkin-v272",
      sourceId: key,
      label: "Daily check-in Story Energy",
      xp: 0,
      realmXP: 0,
      statXP: 0,
      coins: 0,
      storyEnergyBase: requestedStoryEnergy,
      progressionRelevant: false,
      at: new Date().toISOString(),
      metadata: { streak, checkIn: true, dailyLoopRewardUpgrade: true }
    }) || { storyEnergy: requestedStoryEnergy, rawStoryEnergy: requestedStoryEnergy };

    day.checkInReward = {
      ...existingReward,
      storyEnergy: Number(reward.storyEnergy || 0),
      rawStoryEnergy: Number(reward.rawStoryEnergy || requestedStoryEnergy),
      storyEnergyVersion: 2,
      streak,
      storyEventId: reward.eventId || null,
      awardedAt: existingReward.awardedAt || Date.now()
    };
    day.updatedAt = Date.now();
    return true;
  }

  function formatEnergy(value) {
    if (typeof app.formatEnergy === "function") return app.formatEnergy(value);
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function currentMoment() {
    const hour = new Date().getHours();
    if (hour < 12) return { id: "morning", icon: "☀️", label: "Morning", late: false };
    if (hour < 18) return { id: "daytime", icon: "🌤️", label: "Daytime", late: false };
    return { id: "evening", icon: "🌙", label: "Evening", late: hour >= 21 };
  }

  function momentNoteMarkup(checkIn) {
    const moment = currentMoment();
    let text = "Keep the next action bounded enough that you can actually start it.";
    if (moment.id === "morning") text = checkIn.gentle ? "The morning does not need to become a rescue mission. Start small." : "Use the clearer part of the day for the pick that needs the most initiation.";
    if (moment.id === "daytime") text = "The planner favors things that can fit into the day you are already having, not an imaginary perfect schedule.";
    if (moment.id === "evening") text = moment.late ? "Late-evening picks strongly favor low setup and a clean stopping point." : "High-friction work gets a penalty now; recovery, hobbies and bounded tasks become more attractive.";
    return `<div class="daily-moment-note-v23"><span>${moment.icon}</span><div><small>RIGHT NOW · ${esc(moment.label.toUpperCase())}</small><strong>${esc(text)}</strong></div></div>`;
  }

  function companionPreviewLine(companion) {
    const moment = currentMoment();
    if (companion?.id === "mina") {
      if (moment.id === "morning") return "Occasionally, Mina checks in before the day gets away from both of you. Not every morning.";
      if (moment.id === "evening") return "Sometimes Mina catches Luca at the edge of the day, when the useful question is mostly how much is left in the tank.";
      return "Some days, Mina wanders into the check-in naturally. She still does not get access to the app's private planner brain.";
    }
    if (moment.id === "evening") return "Most days can end with Luca deciding what is still worth doing — and what can stay tomorrow's problem.";
    return "Most days can simply begin with Luca checking in with herself.";
  }

  function companionDoneLine(companion, day) {
    const checkIn = day?.checkIn || {};
    const moment = currentMoment();
    const low = checkIn.gentle || ["fumes", "low"].includes(checkIn.energy);
    if (companion?.id === "mina") {
      if (low) return "Okay. Small plan. We are not turning low battery into a character flaw.";
      if (moment.id === "evening") return "Three things max, and I am vetoing any plan that somehow becomes a second workday.";
      return "Good. Tiny plan. No turning this into a twelve-step self-improvement challenge.";
    }
    if (low) return "Keep the floor low. One finished thing counts more than an ambitious list you cannot enter.";
    if (moment.id === "evening") return "The day already happened. Pick what still fits; do not negotiate with the whole backlog.";
    return "Okay. That's enough information. Pick the next thing, not the whole life.";
  }

  function sourceEstimatedMinutes(type, item) {
    if (type === "quest") return estimatedMinutes(item);
    if (type === "game") return Math.max(10, Number(item?.sessionMinutes || 45));
    if (type === "adventure") return Math.max(10, Number(item?.sessionMinutes || 30));
    if (type === "book") return item?.source === "audio" ? 20 : 25;
    return 0;
  }

  function momentAdjustment(type, item, slot) {
    const moment = currentMoment();
    const realm = sourceRealm(type, item);
    const minutes = sourceEstimatedMinutes(type, item);
    let score = 0;
    if (moment.id === "morning") {
      if (slot === "focus" && ["Work", "Knowledge", "Japanese", "Health"].includes(realm)) score += 0.45;
      if (slot === "gentle" && realm === "Recovery") score -= 0.15;
      return score;
    }
    if (moment.id === "daytime") {
      if (slot === "focus" && ["Home", "Health"].includes(realm)) score += 0.18;
      return score;
    }
    if (slot === "focus" && realm === "Work") score -= moment.late ? 2.2 : 1.2;
    if (slot === "focus" && minutes >= 60) score -= moment.late ? 2.0 : 0.9;
    if (slot === "joy" && ["Hobbies", "Recovery"].includes(realm)) score += 0.65;
    if (slot === "gentle" && realm === "Recovery") score += 0.75;
    if (moment.late && minutes >= 45) score -= 0.8;
    return score;
  }

  function reasonForGame(game, slot, checkIn) {
    const days = daysSinceTimestamp(game.lastPlayedAt || game.createdAt);
    const openGoals = Array.isArray(game.goals) ? game.goals.filter(goal => !goal.done) : [];
    const progress = game.progressMode === "percent" ? clamp(Number(game.progress || 0), 0, 100) : null;

    if (progress !== null && progress >= 70 && days >= 10) {
      return `You're already ${progress}% through this and haven't played in ${humanDays(days)}. A bounded session keeps the thread alive without turning the evening into a commitment.`;
    }
    if (openGoals.length && days >= 10) {
      return `You still have ${openGoals.length} personal goal${openGoals.length === 1 ? "" : "s"} here, and the game has been out of rotation for ${humanDays(days)}. The planner is surfacing the actual game, not “play something.”`;
    }
    if (slot === "joy") {
      return days >= 7
        ? `This is one of your active games and you haven't returned to it in ${humanDays(days)}. Today's joy slot is allowed to be actual play.`
        : `This is already in your active rotation, so the planner can choose a specific game instead of making you browse your whole backlog.`;
    }
    if (slot === "gentle") {
      return `A short session has a clear stopping point and asks for very little setup. You can stop when the timer is done and still count the pick as complete.`;
    }
    if (game.role === "japanese") {
      return `You marked this game as Japanese / immersion, so a specific play session can count as a concrete language thread rather than another generic study option.`;
    }
    return `This game is already active, and a small defined session gives you something specific to start without deciding from the whole Games shelf.`;
  }

  function reasonForBook(book, slot, checkIn) {
    const days = daysSinceTimestamp(book.lastReadAt || book.startedAt || book.createdAt);
    const progress = bookProgress(book);
    const role = bookRoleMeta(book.role);

    if (progress !== null && progress >= 55 && days >= 14) {
      return `You're already ${progress}% through this and haven't picked it up in ${humanDays(days)}. One small reading step is more useful than rediscovering it months later.`;
    }
    if (book.continueSeries && book.series && days >= 7) {
      return `You marked ${book.series} as a series you want to continue, and this is the book already in progress. The planner is keeping that thread visible.`;
    }
    if (slot === "joy" && book.role === "fun") {
      return days >= 10
        ? `This is one of your current fun reads and it has been sitting untouched for ${humanDays(days)}. Today's joy slot is a good place to bring it back.`
        : `You marked this as a book you read for fun, so the plan gets something chosen for you rather than another obligation.`;
    }
    if (slot === "gentle") {
      return `Reading gives this day a concrete ${role.label.toLowerCase()} option with a clear stopping point. You can stop at the finish line and still count it as done.`;
    }
    if (["knowledge", "growth", "japanese", "work"].includes(book.role)) {
      return days >= 14
        ? `This ${role.label} book is already in progress and has been out of rotation for ${humanDays(days)}. One specific chunk moves the actual book forward.`
        : `You categorized this as ${role.label}, and it is already in progress, so this is a more specific focus choice than a generic “read something” quest.`;
    }
    return `This book is already marked Reading, and the planner can give it one small finish line instead of making you choose from the whole Library.`;
  }

  function recordCompanion(planner, date, id) {
    planner.companionHistory = (planner.companionHistory || []).filter(item => item.date !== date);
    planner.companionHistory.push({ date, id });
    planner.companionHistory.sort((a, b) => a.date.localeCompare(b.date));
  }

  function sourceKey(type, id) {
    return `${type || "quest"}:${id || ""}`;
  }

  function findGame(id) {
    return app.getState().gameLibrary?.items?.find(game => game.id === id) || null;
  }

  function gameLogs(id) {
    const logs = app.getState().gameLibrary?.logs;
    return Array.isArray(logs) ? logs.filter(log => log.gameId === id) : [];
  }

  function gameTouchedToday(id) {
    return gameLogs(id).some(log => (log.date || dateKeyFromValue(log.at)) === todayKey());
  }

  function gameRoleMeta(role) {
    return ({
      fun: { label: "For Fun", icon: "🎮", realm: "Hobbies" },
      social: { label: "Social", icon: "♡", realm: "Hobbies" },
      japanese: { label: "Japanese", icon: "あ", realm: "Japanese" },
      challenge: { label: "Goals / Challenge", icon: "✦", realm: "Hobbies" }
    })[role] || { label: "For Fun", icon: "🎮", realm: "Hobbies" };
  }

  function formatDuration(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    if (total < 60) return `${total}m`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function findBook(id) {
    return app.getState().bookLibrary?.items?.find(book => book.id === id) || null;
  }

  function bookLogs(id) {
    const logs = app.getState().bookLibrary?.logs;
    return Array.isArray(logs) ? logs.filter(log => log.bookId === id) : [];
  }

  function bookTouchedToday(id) {
    return bookLogs(id).some(log => (log.date || dateKeyFromValue(log.at)) === todayKey());
  }

  function bookProgress(book) {
    const total = Number(book?.totalPages || 0);
    if (!total) return null;
    return Math.floor(clamp(Number(book.currentPage || 0) / total * 100, 0, 100));
  }

  function bookRoleMeta(role) {
    return ({
      fun: { label: "For Fun", icon: "🌸", realm: "Hobbies" },
      knowledge: { label: "Knowledge", icon: "📚", realm: "Knowledge" },
      growth: { label: "Personal Growth", icon: "✨", realm: "Knowledge" },
      japanese: { label: "Japanese", icon: "あ", realm: "Japanese" },
      work: { label: "Work", icon: "📎", realm: "Work" }
    })[role] || { label: "For Fun", icon: "🌸", realm: "Hobbies" };
  }

  function findAdventure(id) {
    return app.getState().sideAdventures?.items?.find(item => item.id === id) || null;
  }

  function adventureLogs(id) {
    const logs = app.getState().sideAdventures?.logs;
    return Array.isArray(logs) ? logs.filter(log => log.adventureId === id) : [];
  }

  function adventureTouchedToday(id) {
    return adventureLogs(id).some(log => (log.date || dateKeyFromValue(log.at)) === todayKey());
  }

  function daysSinceTimestamp(value) {
    if (!value) return 30;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }

  function humanDays(days) {
    if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
    if (days < 35) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"}`;
    }
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  function findQuest(id) {
    return app.getQuestById?.(id) || app.getQuestCatalog?.().find(quest => quest.id === id) || null;
  }

  function questLogs(questId) {
    return (app.getState().completionLog || []).filter(log => log.questId === questId);
  }

  function todayQuestUnits(questId) {
    const today = todayKey();
    return questLogs(questId)
      .filter(log => dateKeyFromValue(log.at) === today)
      .reduce((sum, log) => sum + Number(log.units || 0), 0);
  }

  function wasDoneYesterday(questId) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const key = dateKey(date);
    return questLogs(questId).some(log => dateKeyFromValue(log.at) === key);
  }

  function daysSinceLast(logs) {
    if (!logs.length) return 30;
    const times = logs.map(log => new Date(log.at).getTime()).filter(Number.isFinite);
    if (!times.length) return 30;
    return Math.max(0, Math.floor((Date.now() - Math.max(...times)) / 86400000));
  }

  function cooldownPenalty(quest, logs) {
    const raw = quest.cooldownDays ?? quest.cooldown;
    const cooldown = typeof raw === "number" ? raw : Number.parseFloat(raw);
    if (!Number.isFinite(cooldown) || cooldown <= 0 || !logs.length) return 0;
    const since = daysSinceLast(logs);
    return since < cooldown ? 5 + (cooldown - since) * 0.5 : 0;
  }

  function goalLabel(quest, goal) {
    const unit = friendlyUnitLabel(quest.unitLabel, goal);
    if (!isVariableQuest(quest) && Number(goal) === 1 && /task|session|time|clear/i.test(unit)) return "Complete it once";
    return `${formatNumber(goal)} ${unit}`;
  }

  function friendlyUnitLabel(label, value) {
    const raw = String(label || "unit").trim();
    if (Number(value) === 1) {
      return raw.replace(/s$/i, "");
    }
    return raw;
  }

  function realmIcon(realm) {
    return ({ Work: "📎", Health: "🌱", Recovery: "☕", Home: "🏠", Japanese: "🌸", Knowledge: "📚", Hobbies: "🎨" })[realm] || "✦";
  }

  function seededJitter(seed) {
    return (seededRandom(seed) - 0.5) * 0.7;
  }

  function seededRandom(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
    return ((h >>> 0) % 1000000) / 1000000;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function daysSinceDateKey(key) {
    if (!key) return 999;
    return daysBetweenDateKeys(key, todayKey());
  }

  function daysBetweenDateKeys(older, newer) {
    const a = new Date(`${older}T12:00:00`);
    const b = new Date(`${newer}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 999;
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function dateKeyFromValue(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateKey(date);
  }

  function formatNumber(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value ?? ""));
    return String(value ?? "").replace(/(["'\\.#:[\]()=+~*^$|<> ])/g, "\\$1");
  }

  function esc(value) {
    if (app.escapeHtml) return app.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escAttr(value) {
    return esc(value);
  }

  window.LifeRPGDaily = {
    render,
    openBriefing: () => openBriefing(false),
    editBriefing: () => openBriefing(true),
    getToday: () => structuredCloneSafe(todayRecord()),
    reroll: rerollSlot
  };

  function structuredCloneSafe(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
})();
