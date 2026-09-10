(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Skills could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const VERSION = "0.31.4ac";
  const SCHEMA = 1;
  const MAX_EVENTS = 6000;
  const HABIT_XP = { tiny: 3, low: 5, normal: 8, high: 12, boss: 18 };

  const REALMS = {
    Work: { icon: "📎", label: "Work" },
    Knowledge: { icon: "📚", label: "Knowledge" },
    Japanese: { icon: "🌸", label: "Japanese" },
    Health: { icon: "🌱", label: "Health" },
    Recovery: { icon: "🛋️", label: "Recovery" },
    Home: { icon: "🏠", label: "Home" },
    Hobbies: { icon: "🎨", label: "Hobbies" }
  };

  const SKILLS = [
    skill("teaching-facilitation", "Teaching & Facilitation", "Work", "🧑‍🏫", "Teaching, substitution and future facilitation practice."),
    skill("lesson-design-preparation", "Lesson Design & Preparation", "Work", "🗂️", "Designing lessons and preparing concrete teaching work."),
    skill("assessment-feedback", "Assessment & Feedback", "Work", "Assessment", "Assessing work, corrections and feedback practice."),
    skill("professional-organization", "Professional Organization", "Work", "📋", "Meetings, school administration and keeping work systems usable."),
    skill("focus-concentration", "Focus & Concentration", "Work", "🎯", "Deliberate deep-focus practice rather than generic time spent working."),

    skill("logical-pattern-reasoning", "Logical & Pattern Reasoning", "Knowledge", "🧩", "Deduction, patterns and structured logic across different activities."),
    skill("quantitative-reasoning", "Quantitative Reasoning", "Knowledge", "🔢", "Flexible reasoning with quantities, estimation and numbers."),
    skill("memory-recall", "Memory & Recall", "Knowledge", "🧠", "Holding, retrieving and rebuilding information from memory."),
    skill("language-expression", "Language & Expression", "Knowledge", "⌗", "Vocabulary, precise language and expressive range."),
    skill("learning-inquiry", "Learning & Inquiry", "Knowledge", "🔎", "Studying, researching, explaining and following real curiosity."),

    skill("language-learning", "Language Learning", "Japanese", "あ", "Japanese practice now, with room for future language-learning actions."),

    skill("movement-body-care", "Movement & Body Care", "Health", "🤸", "Walking, mobility, stretching, yoga and gentle physical care."),
    skill("physical-vitality", "Physical Vitality", "Health", "🏋️", "Workout, gym and sport practice when it genuinely happens."),
    skill("personal-care", "Personal Care", "Health", "🫧", "Skincare, hair care and other intentional care routines."),
    skill("reflection-self-awareness", "Reflection & Self-Awareness", "Health", "🌙", "Checking in, noticing patterns and reflecting without turning it into a grade."),

    skill("recovery-regulation", "Recovery & Regulation", "Recovery", "🌿", "Rest, breathing, meditation, body scans and deliberate down-regulation."),

    skill("life-management", "Life Management", "Home", "🧺", "Household, paperwork, appointments, errands, laundry and practical life upkeep."),

    skill("creative-expression", "Creative Expression", "Hobbies", "✍️", "Turning ideas into creative output across media."),
    skill("craft-making", "Craft & Making", "Hobbies", "🧶", "Making physical things and building hands-on craft practice."),
    skill("style-visual-design", "Style & Visual Design", "Hobbies", "💄", "Styling, makeup, hair and intentional visual design."),
    skill("recreation-play", "Recreation & Play", "Hobbies", "🎮", "Making real room for play, leisure and for-fun reading."),
  ];

  const SKILL_BY_ID = Object.fromEntries(SKILLS.map(item => [item.id, item]));
  const SKILLS_BY_REALM = Object.fromEntries(Object.keys(REALMS).map(realm => [realm, SKILLS.filter(item => item.realm === realm)]));

  let initialized = false;
  let syncing = false;
  let syncTimer = null;
  let lastDerivedSignature = "";

  init();

  function skill(id, label, realm, icon, description) {
    return { id, label, realm, icon, description };
  }

  function init() {
    ensureState();
    injectNavigation();
    injectSkillsView();
    injectHabitSkillField();
    bind();
    reconcile({ persist: true, reason: "skills-init" });
    render();
    initialized = true;
  }

  function ensureState() {
    const root = app.getState();
    if (!root.skills || typeof root.skills !== "object" || Array.isArray(root.skills)) {
      root.skills = defaults();
    }
    const model = root.skills;
    model.schemaVersion = SCHEMA;
    model.version = VERSION;
    if (!Array.isArray(model.events)) model.events = [];
    if (!model.spentPointsByRealm || typeof model.spentPointsByRealm !== "object" || Array.isArray(model.spentPointsByRealm)) model.spentPointsByRealm = {};
    if (!model.realmBonusPoints || typeof model.realmBonusPoints !== "object" || Array.isArray(model.realmBonusPoints)) model.realmBonusPoints = {};
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) model.migrations = {};
    Object.keys(REALMS).forEach(realm => {
      model.spentPointsByRealm[realm] = Math.max(0, Number(model.spentPointsByRealm[realm] || 0));
      model.realmBonusPoints[realm] = Math.max(0, Number(model.realmBonusPoints[realm] || 0));
    });
    model.migrations.derivedLocalPracticeV1 = true;
    return model;
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      events: [],
      spentPointsByRealm: {},
      realmBonusPoints: {},
      migrations: { derivedLocalPracticeV1: true }
    };
  }

  function state() { return ensureState(); }

  function bind() {
    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-skills-open]");
      if (open) {
        event.preventDefault();
        reconcile({ persist: true, reason: "skills-open" });
        app.showView?.("skills");
        render();
        return;
      }

      const map = event.target.closest?.("[data-skill-map-save]");
      if (map) {
        event.preventDefault();
        saveHabitMapping(map.dataset.skillMapSave);
        return;
      }

      const suggestAll = event.target.closest?.("[data-skill-map-suggest-all]");
      if (suggestAll) {
        event.preventDefault();
        applyHabitSuggestionsToForm();
        return;
      }

      const rebuild = event.target.closest?.("[data-skills-rebuild]");
      if (rebuild) {
        event.preventDefault();
        reconcile({ persist: true, reason: "skills-manual-rebuild", force: true });
        render();
        app.showToast?.("Skills rebuilt from your current local Life RPG logs.");
      }
    });

    document.addEventListener("click", event => {
      const habitAction = event.target.closest?.("[data-habit-edit], #addHabitButton, #addHabitButtonSecondary, #habitEmptyCreate");
      if (!habitAction) return;
      window.setTimeout(syncHabitDialogFromCurrent, 0);
    }, true);

    const habitForm = document.getElementById("habitForm");
    habitForm?.addEventListener("submit", captureHabitSkillBeforeSave, true);
    document.getElementById("habitRealm")?.addEventListener("change", () => refreshHabitSkillOptions({ keepCurrent: true }));
    document.getElementById("habitName")?.addEventListener("blur", () => suggestHabitSkillIfEmpty());

    window.addEventListener("life-rpg:state-saved", () => {
      if (syncing) return;
      scheduleReconcile("state-save");
    });
    window.addEventListener("life-rpg:render", () => {
      if (!initialized || syncing) return;
      scheduleReconcile("render");
      render();
    });
    ["life-rpg:time-change", "life-rpg:game-change", "life-rpg:library-change", "life-rpg:adventure-change", "life-rpg:smart-quest-change"].forEach(name => {
      window.addEventListener(name, () => scheduleReconcile(name));
    });
  }

  function scheduleReconcile(reason) {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => reconcile({ persist: true, reason }), 90);
  }

  function reconcile({ persist = false, reason = "skills-reconcile", force = false } = {}) {
    if (syncing) return false;
    syncing = true;
    try {
      const model = state();
      const nextEvents = deriveEvents().slice(-MAX_EVENTS);
      const signature = eventSignature(nextEvents);
      const changed = force || signature !== lastDerivedSignature || !eventsEquivalent(model.events, nextEvents);
      if (!changed) return false;
      model.events = nextEvents;
      model.lastRebuiltAt = Date.now();
      model.lastRebuildReason = reason;
      lastDerivedSignature = signature;
      if (persist) app.saveState({ source: reason });
      render();
      return true;
    } finally {
      syncing = false;
    }
  }

  function deriveEvents() {
    const root = app.getState();
    const events = [];
    const claimedRewardIds = new Set();
    const timeEntries = Array.isArray(root.timeTracking?.entries) ? root.timeTracking.entries : [];

    // Time is canonical for any timed practice, including linked Quests and Adventures.
    timeEntries.forEach(entry => {
      const skillId = skillForTimeEntry(entry);
      if (!skillId) return;
      const minutes = preciseMinutes(entry);
      addDerived(events, {
        id: `time:${entry.id}`,
        skillId,
        xp: timeXp(minutes),
        label: entry.label || timeLabel(entry),
        source: "time",
        sourceId: entry.id,
        at: entry.endAt || entry.startAt || entry.createdAt,
        metadata: { minutes: round2(minutes), categoryId: entry.categoryId || "", subcategory: entry.subcategory || "", linkedQuestId: entry.linkedQuestId || null, linkedAdventureId: entry.linkedAdventureId || null }
      });
    });

    // Native activities are canonical through their own reward event. Their normal
    // Character/Realm reward may have streak/diminishing modifiers; Skill XP never does.
    (root.rewardLedger?.events || []).forEach(reward => {
      if (!reward || reward.duplicate) return;
      const native = skillForRewardEvent(reward);
      if (!native) return;
      if (reward.id) claimedRewardIds.add(reward.id);
      addDerived(events, {
        id: `reward:${reward.id || `${reward.source}:${reward.sourceId || reward.at}`}`,
        skillId: native.skillId,
        xp: native.xp,
        label: reward.label || native.label,
        source: native.source || reward.source || "native",
        sourceId: reward.sourceId || reward.id,
        at: reward.at,
        metadata: { rewardEventId: reward.id || null, nativeSource: reward.source || "" }
      });
    });

    // Habits are explicit user-owned practice. Unmapped habits intentionally earn no Skill XP.
    const habits = Array.isArray(root.habits?.items) ? root.habits.items : [];
    const habitById = Object.fromEntries(habits.map(item => [item.id, item]));
    (root.habits?.completions || []).forEach(log => {
      const habit = habitById[log?.habitId];
      const skillId = validSkillId(habit?.skillId);
      if (!habit || !skillId) return;
      addDerived(events, {
        id: `habit:${log.id || `${habit.id}:${log.date || log.timestamp}`}`,
        skillId,
        xp: HABIT_XP[habit.effort] || HABIT_XP.low,
        label: habit.name,
        source: "habit",
        sourceId: log.id || `${habit.id}:${log.date || ""}`,
        at: log.timestamp || dateAtNoon(log.date),
        metadata: { habitId: habit.id, effort: habit.effort || "low" }
      });
      if (log.rewardEventId) claimedRewardIds.add(log.rewardEventId);
    });

    // Daily check-in is itself a small reflection practice.
    Object.entries(root.dailyPlanner?.days || {}).forEach(([date, day]) => {
      if (!day?.checkIn) return;
      addDerived(events, {
        id: `checkin:${date}`,
        skillId: "reflection-self-awareness",
        xp: 5,
        label: "Daily Check-in",
        source: "daily-checkin",
        sourceId: date,
        at: day.updatedAt || day.createdAt || dateAtNoon(date),
        metadata: { date }
      });
      if (day.checkInReward?.eventId) claimedRewardIds.add(day.checkInReward.eventId);
    });

    // Each written reflection is independent. No shared daily character pool.
    Object.entries(root.journal?.entries || {}).forEach(([date, entry]) => {
      [
        ["gratitude", "Gratitude reflection"],
        ["smallWin", "Small-win reflection"],
        ["hardThing", "Hard-thing reflection"]
      ].forEach(([field, label]) => {
        const chars = String(entry?.[field] || "").trim().length;
        if (!chars) return;
        addDerived(events, {
          id: `journal:${date}:${field}`,
          skillId: "reflection-self-awareness",
          xp: reflectionXp(chars),
          label,
          source: "journal-reflection",
          sourceId: `${date}:${field}`,
          at: entry.updatedAt || entry.createdAt || dateAtNoon(date),
          metadata: { date, field, characters: chars }
        });
      });
    });

    // Library reading logs. Role determines purpose; Work-role reading stays unassigned
    // because it does not tell us which concrete Work skill was practised.
    const books = Array.isArray(root.bookLibrary?.items) ? root.bookLibrary.items : [];
    const bookById = Object.fromEntries(books.map(item => [item.id, item]));
    const readingTimeEntries = timeEntries.filter(entry => entry.categoryId === "reading");
    (root.bookLibrary?.logs || []).forEach(log => {
      const book = bookById[log?.bookId];
      const skillId = skillForBook(book);
      if (!book || !skillId) return;
      if (isLikelyDuplicateMediaTime(log, readingTimeEntries)) return;
      const xp = bookLogXp(log);
      if (xp <= 0) return;
      addDerived(events, {
        id: `book:${log.id || `${book.id}:${log.at || log.createdAt}`}`,
        skillId,
        xp,
        label: book.title || "Reading",
        source: "book",
        sourceId: log.id || book.id,
        at: log.at || log.createdAt || book.lastReadAt,
        metadata: { bookId: book.id, role: book.role || "fun", minutes: Number(log.minutes || 0), pages: pagesInBookLog(log) }
      });
      if (log.rewardEventId) claimedRewardIds.add(log.rewardEventId);
    });

    // Game logs represent local Life RPG sessions only. Steam's imported total playtime is
    // deliberately stored elsewhere and therefore never becomes retroactive Skill XP.
    const games = Array.isArray(root.gameLibrary?.items) ? root.gameLibrary.items : [];
    const gameById = Object.fromEntries(games.map(item => [item.id, item]));
    const gamingTimeEntries = timeEntries.filter(entry => entry.categoryId === "gaming");
    (root.gameLibrary?.logs || []).forEach(log => {
      const game = gameById[log?.gameId];
      const skillId = skillForGame(game);
      if (!game || !skillId) return;
      if (isLikelyDuplicateMediaTime(log, gamingTimeEntries)) return;
      const minutes = Math.max(0, Number(log.minutes || 0));
      const xp = minutes > 0 ? timeXp(minutes) : 8;
      addDerived(events, {
        id: `game:${log.id || `${game.id}:${log.at || log.createdAt}`}`,
        skillId,
        xp,
        label: game.title || "Game session",
        source: "game",
        sourceId: log.id || game.id,
        at: log.at || log.createdAt || log.timestamp || game.lastPlayedAt,
        metadata: { gameId: game.id, role: game.role || "fun", minutes }
      });
      if (log.rewardEventId) claimedRewardIds.add(log.rewardEventId);
    });

    // Quest completion logs are fallback practice signals. If a matching timed entry or
    // native activity already represents the real action, the quest is only a completion wrapper.
    const linkedTimesByQuest = groupTimeEntriesByQuest(timeEntries);
    (root.completionLog || []).forEach(log => {
      if (!log?.questId) return;
      if (log.rewardEventId && claimedRewardIds.has(log.rewardEventId)) return;
      const quest = app.getQuestById?.(log.questId);
      if (!quest) return;
      if (nativeQuestRole(quest)) return;
      if (hasMatchingLinkedTime(log, linkedTimesByQuest[log.questId] || [])) return;
      const mapped = skillForQuest(quest);
      if (!mapped?.skillId) return;
      const xp = questLogXp(log, quest, mapped);
      if (xp <= 0) return;
      addDerived(events, {
        id: `quest:${log.id || `${log.questId}:${log.at}`}`,
        skillId: mapped.skillId,
        xp,
        label: log.questName || quest.name || "Quest practice",
        source: "quest",
        sourceId: log.id || log.questId,
        at: log.at,
        metadata: { questId: log.questId, units: Number(log.units || 0), unitLabel: log.unitLabel || quest.unitLabel || "" }
      });
    });

    // Stable ordering makes rebuilds deterministic and keeps save diffs small.
    return events
      .filter(event => event.xp > 0 && validSkillId(event.skillId))
      .sort((a, b) => eventTime(a) - eventTime(b) || String(a.id).localeCompare(String(b.id)));
  }

  function addDerived(target, spec) {
    const skillId = validSkillId(spec.skillId);
    const xp = round2(Math.max(0, Number(spec.xp || 0)));
    if (!skillId || xp <= 0) return;
    target.push({
      id: String(spec.id),
      skillId,
      xp,
      label: String(spec.label || SKILL_BY_ID[skillId].label),
      source: String(spec.source || "practice"),
      sourceId: spec.sourceId == null ? null : String(spec.sourceId),
      at: normalizeAt(spec.at),
      metadata: spec.metadata && typeof spec.metadata === "object" ? spec.metadata : {}
    });
  }

  function skillForTimeEntry(entry) {
    if (!entry) return null;

    if (entry.linkedQuestId) {
      const quest = app.getQuestById?.(entry.linkedQuestId);
      const mapped = skillForQuest(quest);
      if (mapped?.skillId) return mapped.skillId;
    }

    if (entry.linkedAdventureId) {
      const adventure = (app.getState().sideAdventures?.items || []).find(item => item?.id === entry.linkedAdventureId);
      const mapped = skillForAdventure(adventure);
      if (mapped) return mapped;
    }

    const category = String(entry.categoryId || "");
    const sub = String(entry.subcategory || "").toLowerCase();
    const label = String(entry.label || "").toLowerCase();

    if (label.includes("recovery studio")) {
      if (/neck|shoulder|stretch|yoga|mobility|walk/.test(label)) return "movement-body-care";
      return "recovery-regulation";
    }

    if (category === "school") {
      if (sub === "teaching" || sub === "substitution") return "teaching-facilitation";
      if (sub === "conference / meeting" || sub === "school admin") return "professional-organization";
      return null;
    }
    if (category === "work_home") {
      if (sub === "lesson planning" || sub === "preparation") return "lesson-design-preparation";
      if (sub === "grading / corrections") return "assessment-feedback";
      if (sub === "admin") return "professional-organization";
      return null;
    }
    if (category === "focus") {
      if (sub === "deep work") return "focus-concentration";
      if (sub === "study") return "learning-inquiry";
      return null;
    }
    if (category === "life_admin") {
      if (["household", "appointments", "paperwork", "errands"].includes(sub)) return "life-management";
      return null;
    }
    if (category === "hobby") {
      if (sub === "craft") return "craft-making";
      if (sub === "creative" || sub === "music") return "creative-expression";
      return null;
    }
    if (category === "gaming") {
      if (sub === "solo" || sub === "social") return "recreation-play";
      return null;
    }
    if (category === "reading") {
      if (sub === "knowledge") return "learning-inquiry";
      if (sub === "for fun") return "recreation-play";
      return null;
    }
    if (category === "recovery") {
      if (sub === "walk") return "movement-body-care";
      if (["break", "rest", "quiet time"].includes(sub)) return "recovery-regulation";
      return null;
    }
    return null;
  }

  function skillForRewardEvent(reward) {
    const source = String(reward.source || "");
    const label = String(reward.label || "");
    if (source === "sudoku-complete") return nativeSkill("logical-pattern-reasoning", 10, "sudoku");
    if (source === "sudoku-daily-replay") return nativeSkill("logical-pattern-reasoning", 8, "sudoku-replay");
    if (source === "nonogram-complete") return nativeSkill("logical-pattern-reasoning", 10, "nonogram");
    if (source === "nonogram-daily-replay") return nativeSkill("logical-pattern-reasoning", 8, "nonogram-replay");
    if (source === "number-sense-complete") return nativeSkill("quantitative-reasoning", 10, "number-sense");
    if (source === "number-sense-daily-replay") return nativeSkill("quantitative-reasoning", 8, "number-sense-replay");
    if (source === "memory-garden-complete") return nativeSkill("memory-recall", 10, "memory-garden");
    if (source === "memory-garden-daily-replay") return nativeSkill("memory-recall", 8, "memory-garden-replay");
    if (source === "lexicon-calibration") return nativeSkill("language-expression", 5, "lexicon-calibration");
    if (source === "lexicon-daily-word") return nativeSkill("language-expression", 4, "lexicon-daily-word");
    if (source === "lexicon-lab-complete") return nativeSkill("language-expression", 10, "lexicon-crossword");
    if (source === "weekly-review-base") return nativeSkill("reflection-self-awareness", Math.max(0, Number(reward.metadata?.skillXP || 6)), "weekly-review");
    if (source === "weekly-review-field-depth") return nativeSkill("reflection-self-awareness", Math.max(0, Number(reward.metadata?.skillXP || 0)), "weekly-review-depth");
    if (/^Kotoba Quick\b/i.test(label) || /kotoba quick/i.test(label)) return nativeSkill("language-learning", 1.5, "kotoba-quick-review");
    return null;
  }

  function nativeSkill(skillId, xp, source) { return { skillId, xp, source, label: SKILL_BY_ID[skillId]?.label || "Skill practice" }; }

  function skillForQuest(quest) {
    if (!quest) return null;
    const role = String(quest.systemRole || "").toLowerCase();
    const name = String(quest.name || "").toLowerCase();

    if (["bunpro-reviews", "bunpro-lesson", "shadowing", "manual-language"].includes(role)) return mappedQuest("language-learning");
    if (role === "explain-it-back" || role === "curiosity-dive") return mappedQuest("learning-inquiry");
    if (role === "craft-session" || role === "scrapbook-page") return mappedQuest("craft-making");
    if (["recovery-meditation", "recovery-body-scan", "recovery-breathing", "recovery-lie-down", "fresh-air"].includes(role)) return mappedQuest("recovery-regulation");
    if (["recovery-stretch", "recovery-yoga", "mobility-break"].includes(role)) return mappedQuest("movement-body-care");
    if (["clear-surface", "put-away-ten", "paper-pile", "laundry-cycle", "laundry-fold"].includes(role)) return mappedQuest("life-management");
    if (role === "focus-work") return mappedQuest("focus-concentration");
    if (role === "new-hairstyle" || role === "makeup-look") return mappedQuest("style-visual-design");
    if (role === "sudoku") return mappedQuest("logical-pattern-reasoning", { native: true });

    if (/lesson planning sprint/.test(name)) return mappedQuest("lesson-design-preparation");
    if (/correction sprint/.test(name)) return mappedQuest("assessment-feedback");
    if (/work desk reset/.test(name)) return mappedQuest("professional-organization");
    if (/focused work block|focus work/.test(name)) return mappedQuest("focus-concentration");
    if (/curiosity dive|explain it back|literature note|permanent note/.test(name)) return mappedQuest("learning-inquiry");
    if (/bunpro|grammar echo|grammar output|kanji|shadowing|subtitle scout|line miner|n3 practice|scene recap/.test(name)) return mappedQuest("language-learning");
    if (/meditation|body scan|breathing|lie.down|real rest|fresh.air/.test(name)) return mappedQuest("recovery-regulation");
    if (/walk|stretch|yoga|mobility/.test(name)) return mappedQuest("movement-body-care");
    if (/room reset|10-minute clean|paper pile|laundry|clear one surface|put away|throw one thing|sort \/ declutter files/.test(name)) return mappedQuest("life-management");
    if (/craft session|scrapbook/.test(name)) return mappedQuest("craft-making");
    if (/hairstyle|makeup look/.test(name)) return mappedQuest("style-visual-design");
    if (/songwriting|music composition|creative experiment|aesthetic build|250-word writing/.test(name)) return mappedQuest("creative-expression");
    if (/intentional gaming|comfort episode|music reset/.test(name)) return mappedQuest("recreation-play");
    return null;
  }

  function mappedQuest(skillId, extra = {}) { return { skillId, ...extra }; }
  function nativeQuestRole(quest) { return Boolean(skillForQuest(quest)?.native); }

  function skillForAdventure(item) {
    if (!item) return null;
    const realm = String(item.realm || "");
    const kind = String(item.kind || "").toLowerCase();
    if (realm === "Knowledge") return "learning-inquiry";
    if (realm === "Japanese") return "language-learning";
    if (realm === "Home") return "life-management";
    if (realm === "Hobbies") {
      if (/creative/.test(kind)) return "creative-expression";
      if (/craft|skill/.test(kind)) return "craft-making";
    }
    return null;
  }

  function skillForBook(book) {
    const role = String(book?.role || "").toLowerCase();
    if (role === "fun") return "recreation-play";
    if (role === "knowledge" || role === "growth") return "learning-inquiry";
    if (role === "japanese") return "language-learning";
    return null;
  }

  function skillForGame(game) {
    const role = String(game?.role || "fun").toLowerCase();
    if (role === "japanese") return "language-learning";
    if (["fun", "social", "challenge"].includes(role)) return "recreation-play";
    return null;
  }

  function questLogXp(log, quest, mapped) {
    const unit = String(log.unitLabel || quest.unitLabel || "").toLowerCase();
    const units = Math.max(0, Number(log.units || 0));
    if (/(^|\b)(min|minute|minutes)(\b|$)/.test(unit) && units > 0) return timeXp(units);
    if (mapped.skillId === "language-learning" && units > 1) return Math.min(14, round2(3 + Math.sqrt(units) * 1.5));
    return 8;
  }

  function bookLogXp(log) {
    const minutes = Math.max(0, Number(log?.minutes || 0));
    if (minutes > 0) return timeXp(minutes);
    const pages = pagesInBookLog(log);
    if (pages > 0) return Math.min(14, round2(2 * Math.sqrt(pages)));
    if (log?.chapter || log?.chapterLabel) return 8;
    return 6;
  }

  function pagesInBookLog(log) {
    const direct = Number(log?.pages || log?.pagesRead || 0);
    if (direct > 0) return direct;
    const amount = Number(log?.amount || 0);
    const unit = String(log?.unitLabel || log?.type || "").toLowerCase();
    return amount > 0 && /page/.test(unit) ? amount : 0;
  }

  function isLikelyDuplicateMediaTime(log, timeEntries) {
    const at = timestamp(log?.at || log?.createdAt || log?.timestamp);
    if (!at) return false;
    const minutes = Math.max(0, Number(log?.minutes || 0));
    return timeEntries.some(entry => {
      const end = timestamp(entry.endAt || entry.startAt || entry.createdAt);
      if (!end || Math.abs(end - at) > 15 * 60 * 1000) return false;
      if (!minutes) return true;
      return Math.abs(preciseMinutes(entry) - minutes) <= Math.max(3, minutes * 0.15);
    });
  }

  function groupTimeEntriesByQuest(entries) {
    const groups = {};
    entries.forEach(entry => {
      if (!entry?.linkedQuestId) return;
      (groups[entry.linkedQuestId] ||= []).push(entry);
    });
    return groups;
  }

  function hasMatchingLinkedTime(log, entries) {
    const at = timestamp(log?.at);
    if (!entries.length) return false;
    if (!at) return true;
    return entries.some(entry => {
      const end = timestamp(entry.endAt || entry.startAt);
      return end && Math.abs(end - at) <= 20 * 60 * 1000;
    });
  }

  function preciseMinutes(entry) {
    const seconds = Math.max(0, Number(entry?.durationSeconds || 0));
    if (seconds > 0) return seconds / 60;
    return Math.max(0, Number(entry?.minutes || 0));
  }

  function timeXp(minutes) {
    const safe = Math.max(0, Number(minutes || 0));
    return safe > 0 ? round2(2 * Math.sqrt(safe)) : 0;
  }

  function reflectionXp(chars) {
    const safe = Math.max(0, Math.min(1000, Number(chars || 0)));
    // Continuous curve: every extra character helps a little until the 1000-char cap,
    // so there is no 599/600 or 999/1000 cliff in Skill XP.
    return safe > 0 ? round2(Math.min(18, 1 + 0.54 * Math.sqrt(safe))) : 0;
  }

  function xpRequiredForLevel(level) {
    const l = Math.max(1, Number(level || 1));
    return 60 + 25 * l + 5 * l * l;
  }

  function levelInfo(totalXP) {
    let level = 1;
    let remaining = Math.max(0, Number(totalXP || 0));
    let required = xpRequiredForLevel(level);
    while (remaining + 1e-9 >= required && level < 999) {
      remaining -= required;
      level += 1;
      required = xpRequiredForLevel(level);
    }
    return {
      level,
      intoLevel: round2(remaining),
      required: round2(required),
      percent: Math.min(100, required > 0 ? remaining / required * 100 : 0),
      discovered: Number(totalXP || 0) > 0
    };
  }

  function pointsFromSkillLevel(level) {
    const l = Math.max(1, Math.floor(Number(level || 1)));
    return Math.max(0, l - 1) + Math.floor(l / 5);
  }

  function totalsBySkill() {
    const totals = Object.fromEntries(SKILLS.map(item => [item.id, 0]));
    state().events.forEach(event => {
      if (!validSkillId(event.skillId)) return;
      totals[event.skillId] = round2(Number(totals[event.skillId] || 0) + Number(event.xp || 0));
    });
    return totals;
  }

  function realmPointInfo(realm, totals = totalsBySkill()) {
    const earnedFromSkills = (SKILLS_BY_REALM[realm] || []).reduce((sum, item) => sum + pointsFromSkillLevel(levelInfo(totals[item.id] || 0).level), 0);
    const bonus = Math.max(0, Number(state().realmBonusPoints?.[realm] || 0));
    const spent = Math.max(0, Number(state().spentPointsByRealm?.[realm] || 0));
    const earned = earnedFromSkills + bonus;
    return { earned, spent, available: Math.max(0, earned - spent), earnedFromSkills, bonus };
  }

  function injectNavigation() {
    if (document.querySelector("[data-skills-open]")) return;
    const strip = document.querySelector(".dashboard-command-strip");
    if (!strip) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.skillsOpen = "true";
    button.innerHTML = `<span class="command-strip-icon">✦</span><span><strong>Skills</strong><small>See what your real practice is building.</small></span><b>›</b>`;
    const activity = strip.querySelector('[data-view-target="activity"]');
    if (activity?.nextSibling) strip.insertBefore(button, activity.nextSibling);
    else strip.appendChild(button);
  }

  function injectSkillsView() {
    if (document.getElementById("view-skills")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const section = document.createElement("section");
    section.id = "view-skills";
    section.className = "view skills-view-v314aa";
    section.innerHTML = `
      <section class="skills-hero-v314aa">
        <div>
          <p class="eyebrow">SKILLS · PRACTICE THAT STICKS</p>
          <h1>What your real life is training.</h1>
          <p>Skills grow from actions Life RPG can actually observe. One real action trains one skill; Realm and Character progression stay separate.</p>
        </div>
        <button class="secondary-button" data-skills-rebuild type="button">Rebuild from logs</button>
      </section>
      <section id="skillsSummary" class="skills-summary-v314aa"></section>
      <section id="skillsHabitMapping" class="skills-habit-map-v314aa"></section>
      <section id="skillsRealmGrid" class="skills-realm-grid-v314aa"></section>
      <section class="panel skills-history-panel-v314aa">
        <div class="panel-heading"><div><p class="eyebrow">PRACTICE HISTORY</p><h2>Recent Skill XP</h2><p class="panel-subcopy">Debuggable, local and separate from Coins / Story Energy.</p></div></div>
        <div id="skillsRecentPractice" class="skills-recent-v314aa"></div>
      </section>`;
    main.appendChild(section);
  }

  function injectHabitSkillField() {
    if (document.getElementById("habitSkill")) return;
    const form = document.getElementById("habitForm");
    const realm = document.getElementById("habitRealm");
    const effort = document.getElementById("habitEffort");
    const grid = realm?.closest?.(".form-grid") || effort?.closest?.(".form-grid");
    if (!form || !grid) return;
    const label = document.createElement("label");
    label.className = "habit-skill-field-v314aa";
    label.innerHTML = `Skill <select id="habitSkill"></select><small class="field-help-v131">One completion trains at most one skill. “No specific skill” is always valid.</small>`;
    grid.insertAdjacentElement("afterend", label);
    refreshHabitSkillOptions({ keepCurrent: false });
  }

  function refreshHabitSkillOptions({ keepCurrent = true } = {}) {
    const select = document.getElementById("habitSkill");
    if (!select) return;
    const current = keepCurrent ? select.value : "";
    select.innerHTML = `<option value="">No specific skill</option>` + Object.keys(REALMS).map(realm => {
      const options = (SKILLS_BY_REALM[realm] || []).map(item => `<option value="${escAttr(item.id)}">${esc(item.icon)} ${esc(item.label)}</option>`).join("");
      return `<optgroup label="${esc(REALMS[realm].icon)} ${esc(realm)}">${options}</optgroup>`;
    }).join("");
    if (current && SKILL_BY_ID[current]) select.value = current;
  }

  function syncHabitDialogFromCurrent() {
    const select = document.getElementById("habitSkill");
    const editId = document.getElementById("habitEditId")?.value || "";
    if (!select) return;
    refreshHabitSkillOptions({ keepCurrent: false });
    const habit = (app.getState().habits?.items || []).find(item => item?.id === editId);
    if (validSkillId(habit?.skillId)) select.value = habit.skillId;
    else {
      select.value = "";
      suggestHabitSkillIfEmpty();
    }
  }

  function suggestHabitSkillIfEmpty() {
    const select = document.getElementById("habitSkill");
    if (!select || select.value) return;
    const name = document.getElementById("habitName")?.value || "";
    const realm = document.getElementById("habitRealm")?.value || "";
    const suggested = suggestHabitSkill({ name, realm });
    if (suggested) select.value = suggested;
  }

  function captureHabitSkillBeforeSave() {
    const select = document.getElementById("habitSkill");
    if (!select) return;
    const editId = document.getElementById("habitEditId")?.value || "";
    const name = String(document.getElementById("habitName")?.value || "").trim();
    const selected = validSkillId(select.value) || null;
    const capturedAt = Date.now();
    window.setTimeout(() => {
      const items = app.getState().habits?.items || [];
      let habit = editId ? items.find(item => item?.id === editId) : null;
      if (!habit) {
        habit = [...items]
          .filter(item => item?.name === name && Number(item.createdAt || 0) >= capturedAt - 5000)
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0] || null;
      }
      if (!habit) return;
      habit.skillId = selected;
      habit.skillMappingConfirmed = true;
      app.saveState({ source: "habit-skill-map" });
      reconcile({ persist: true, reason: "habit-skill-map" });
      render();
    }, 0);
  }

  function suggestHabitSkill(habit) {
    const name = String(habit?.name || "").toLowerCase();
    const realm = String(habit?.realm || "");
    if (/skin.?care|hair oil|hair mask|face mask|teeth|dental|floss|pflege/.test(name)) return "personal-care";
    if (/gym|workout|strength|sport|training|run|jog/.test(name)) return "physical-vitality";
    if (/stretch|mobility|yoga|walk|spazier|beweg/.test(name)) return "movement-body-care";
    if (/journal|reflect|review|check.?in|gratitude|dankbar/.test(name)) return "reflection-self-awareness";
    if (/japanese|japanisch|kotoba|bunpro|kanji|vocab|grammar/.test(name)) return "language-learning";
    if (/lesson plan|unterricht.*plan|vorbereit/.test(name)) return "lesson-design-preparation";
    if (/grading|correction|korrig|bewert/.test(name)) return "assessment-feedback";
    if (/teach|unterricht|vertretung/.test(name)) return "teaching-facilitation";
    if (/deep work|focus|fokus/.test(name)) return "focus-concentration";
    if (/paper|papier|laundry|wäsche|clean|put away|declutter|aufräum|haushalt/.test(name)) return "life-management";
    if (/crochet|knit|sew|craft|bastel|häkel|strick/.test(name)) return "craft-making";
    if (/makeup|hair style|hairstyle|styling/.test(name)) return "style-visual-design";
    if (/game|gaming|read for fun|lesen.*spaß/.test(name)) return "recreation-play";
    if (/meditat|breath|rest|ruhe|body scan/.test(name)) return "recovery-regulation";
    if (realm === "Japanese") return "language-learning";
    return null;
  }

  function saveHabitMapping(habitId) {
    const habit = (app.getState().habits?.items || []).find(item => item?.id === habitId);
    const select = document.querySelector(`[data-skill-map-select="${cssEscape(habitId)}"]`);
    if (!habit || !select) return;
    habit.skillId = validSkillId(select.value) || null;
    habit.skillMappingConfirmed = true;
    app.saveState({ source: "habit-skill-map" });
    reconcile({ persist: true, reason: "habit-skill-map" });
    render();
    app.showToast?.(`${habit.name} · skill mapping saved.`);
  }

  function applyHabitSuggestionsToForm() {
    document.querySelectorAll("[data-skill-map-select]").forEach(select => {
      if (select.value) return;
      const habit = (app.getState().habits?.items || []).find(item => item?.id === select.dataset.skillMapSelect);
      const suggested = suggestHabitSkill(habit);
      if (suggested) select.value = suggested;
    });
  }

  function render() {
    if (!document.getElementById("view-skills")) return;
    const totals = totalsBySkill();
    renderSummary(totals);
    renderHabitMapping();
    renderRealms(totals);
    renderRecent();
  }

  function renderSummary(totals) {
    const container = document.getElementById("skillsSummary");
    if (!container) return;
    const discovered = SKILLS.filter(item => Number(totals[item.id] || 0) > 0).length;
    const totalXP = round2(Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0));
    const availablePoints = Object.keys(REALMS).reduce((sum, realm) => sum + realmPointInfo(realm, totals).available, 0);
    container.innerHTML = `
      <article><small>DISCOVERED</small><strong>${discovered} / ${SKILLS.length}</strong><span>Skills with observed practice</span></article>
      <article><small>PRACTICE XP</small><strong>${formatXp(totalXP)}</strong><span>Derived from local Life RPG logs</span></article>
      <article><small>REALM POINTS</small><strong>${availablePoints}</strong><span>Available for future Talent Trees</span></article>
      <article><small>RULE</small><strong>1 → 1</strong><span>One real action trains one skill</span></article>`;
  }

  function renderHabitMapping() {
    const container = document.getElementById("skillsHabitMapping");
    if (!container) return;
    const habits = (app.getState().habits?.items || []).filter(item => item && item.active !== false);
    if (!habits.length) {
      container.innerHTML = "";
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    const unmapped = habits.filter(item => item.skillMappingConfirmed !== true);
    if (!unmapped.length) {
      container.innerHTML = `<div class="skills-map-complete-v314aa"><span>✓</span><div><strong>Habit mapping complete</strong><small>All ${habits.length} active habits have a confirmed Skill decision. “No specific skill” stays a valid choice.</small></div></div>`;
      return;
    }
    container.innerHTML = `
      <div class="skills-map-head-v314aa"><div><p class="eyebrow">ONE-TIME SETUP</p><h2>Map your existing habits</h2><p>${unmapped.length} active habit${unmapped.length === 1 ? "" : "s"} still need a Skill decision. Suggestions stay suggestions until you save them.</p></div><button class="secondary-button" data-skill-map-suggest-all type="button">Fill obvious suggestions</button></div>
      <div class="skills-map-grid-v314aa">${unmapped.map(habitMappingRow).join("")}</div>`;
  }

  function habitMappingRow(habit) {
    const suggested = suggestHabitSkill(habit);
    const selected = validSkillId(habit.skillId) || suggested || "";
    return `<article class="skills-map-row-v314aa"><div><span>${esc(REALMS[habit.realm]?.icon || "✦")}</span><div><strong>${esc(habit.name || "Habit")}</strong><small>${esc(habit.realm || "No Realm")} · ${esc(habit.effort || "low")} effort${suggested ? ` · suggested: ${esc(SKILL_BY_ID[suggested].label)}` : ""}</small></div></div><select data-skill-map-select="${escAttr(habit.id)}">${skillOptions(selected)}</select><button class="primary-button" data-skill-map-save="${escAttr(habit.id)}" type="button">Save</button></article>`;
  }

  function skillOptions(selected = "") {
    return `<option value="">No specific skill</option>` + Object.keys(REALMS).map(realm => `<optgroup label="${esc(REALMS[realm].icon)} ${esc(realm)}">${(SKILLS_BY_REALM[realm] || []).map(item => `<option value="${escAttr(item.id)}" ${item.id === selected ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</optgroup>`).join("");
  }

  function renderRealms(totals) {
    const container = document.getElementById("skillsRealmGrid");
    if (!container) return;
    container.innerHTML = Object.keys(REALMS).map(realm => {
      const meta = REALMS[realm];
      const points = realmPointInfo(realm, totals);
      const cards = (SKILLS_BY_REALM[realm] || []).map(item => skillCard(item, totals[item.id] || 0)).join("");
      return `<section class="skills-realm-v314aa"><header><div><span>${meta.icon}</span><div><small>REALM</small><h2>${esc(meta.label)}</h2></div></div><div class="skills-points-v314aa"><strong>${points.available}</strong><span>point${points.available === 1 ? "" : "s"} available</span><small>${points.earnedFromSkills} earned from skills${points.bonus ? ` · +${points.bonus} bonus` : ""}</small></div></header><div class="skills-card-grid-v314aa">${cards}</div></section>`;
    }).join("");
  }

  function skillCard(item, totalXP) {
    const info = levelInfo(totalXP);
    const levelLabel = info.discovered ? `Lv. ${info.level}` : "Not yet trained";
    const pointText = info.discovered && pointsFromSkillLevel(info.level) ? `${pointsFromSkillLevel(info.level)} realm point${pointsFromSkillLevel(info.level) === 1 ? "" : "s"} earned` : "No realm points yet";
    return `<article class="skill-card-v314aa ${info.discovered ? "is-discovered" : "is-undiscovered"}"><div class="skill-card-head-v314aa"><span>${item.icon}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.description)}</small></div><b>${levelLabel}</b></div><div class="skill-progress-v314aa"><i><b style="width:${info.percent.toFixed(2)}%"></b></i><div><span>${formatXp(info.intoLevel)} / ${formatXp(info.required)} Skill XP</span><em>${esc(pointText)}</em></div></div></article>`;
  }

  function renderRecent() {
    const container = document.getElementById("skillsRecentPractice");
    if (!container) return;
    const rows = [...state().events].sort((a, b) => eventTime(b) - eventTime(a)).slice(0, 30);
    if (!rows.length) {
      container.innerHTML = `<div class="skills-empty-v314aa"><span>✦</span><div><strong>No Skill practice derived yet.</strong><small>Existing ambiguous logs stay untouched instead of being guessed.</small></div></div>`;
      return;
    }
    container.innerHTML = rows.map(event => {
      const meta = SKILL_BY_ID[event.skillId];
      return `<article><span>${meta?.icon || "✦"}</span><div><strong>${esc(meta?.label || event.skillId)}</strong><small>${esc(event.label)} · ${esc(sourceLabel(event.source))} · ${esc(formatDateTime(event.at))}</small></div><b>+${formatXp(event.xp)}</b></article>`;
    }).join("");
  }

  function sourceLabel(source) {
    return ({ time: "Focus & Time", habit: "Habit", "daily-checkin": "Daily Check-in", "journal-reflection": "Journal", book: "Library", game: "Games", quest: "Quest", sudoku: "Sudoku", "sudoku-replay": "Sudoku", nonogram: "Nonogram", "nonogram-replay": "Nonogram", "number-sense": "Number Sense", "number-sense-replay": "Number Sense", "memory-garden": "Memory Garden", "memory-garden-replay": "Memory Garden", "lexicon-calibration": "Lexicon Calibration", "lexicon-daily-word": "Daily Word", "lexicon-crossword": "Lexicon Lab", "kotoba-quick-review": "Kotoba Quick", "weekly-review": "Weekly Review", "weekly-review-depth": "Weekly Review" })[source] || source || "Practice";
  }

  function validSkillId(value) { return value && SKILL_BY_ID[value] ? value : null; }
  function round2(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function timestamp(value) { const n = typeof value === "number" ? value : new Date(value || 0).getTime(); return Number.isFinite(n) && n > 0 ? n : 0; }
  function normalizeAt(value) { const t = timestamp(value); return new Date(t || Date.now()).toISOString(); }
  function eventTime(event) { return timestamp(event?.at); }
  function dateAtNoon(key) { return key ? `${key}T12:00:00` : new Date().toISOString(); }
  function timeLabel(entry) { return [entry.categoryId, entry.subcategory].filter(Boolean).join(" · ") || "Time practice"; }
  function formatXp(value) { const n = round2(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function formatDateTime(value) { const d = new Date(value || 0); return Number.isFinite(d.getTime()) ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Saved"; }
  function eventSignature(events) { return `${events.length}|${events.reduce((sum, event) => sum + Number(event.xp || 0), 0).toFixed(2)}|${events.at(-1)?.id || ""}`; }
  function eventsEquivalent(a, b) {
    if (!Array.isArray(a) || a.length !== b.length) return false;
    for (let i = 0; i < b.length; i += 1) {
      if (a[i]?.id !== b[i]?.id || a[i]?.skillId !== b[i]?.skillId || Number(a[i]?.xp || 0) !== Number(b[i]?.xp || 0) || a[i]?.at !== b[i]?.at) return false;
    }
    return true;
  }
  function cssEscape(value) { return window.CSS?.escape ? window.CSS.escape(String(value || "")) : String(value || "").replace(/["\\]/g, "\\$&"); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGSkills = {
    version: VERSION,
    registry: SKILLS.map(item => ({ ...item })),
    getSkill: id => SKILL_BY_ID[id] ? { ...SKILL_BY_ID[id] } : null,
    getTotals: () => ({ ...totalsBySkill() }),
    getLevelInfo: id => levelInfo(totalsBySkill()[id] || 0),
    getRealmPoints: realm => ({ ...realmPointInfo(realm) }),
    timeXp,
    reflectionXp,
    rebuild: () => reconcile({ persist: true, reason: "skills-api-rebuild", force: true }),
    open: () => { app.showView?.("skills"); render(); }
  };
})();
