(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Journal could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 2;
  const MOOD = {
    rough: { label: "Rough", score: 1, icon: "✦" },
    meh: { label: "Meh", score: 2, icon: "❀" },
    okay: { label: "Okay", score: 3, icon: "✿" },
    good: { label: "Good", score: 4, icon: "✿" },
    great: { label: "Great", score: 5, icon: "✺" }
  };
  const ENERGY = {
    fumes: { label: "Fumes", score: 1 },
    low: { label: "Low", score: 2 },
    okay: { label: "Okay", score: 3 },
    lots: { label: "Lots", score: 4 }
  };
  const SLEEP = {
    bad: { label: "Bad", score: 1 },
    meh: { label: "Meh", score: 2 },
    fine: { label: "Fine", score: 3 },
    great: { label: "Great", score: 4 }
  };
  const STRESS = {
    calm: { label: "Calm", score: 1 },
    light: { label: "Light", score: 2 },
    medium: { label: "Noticeable", score: 3 },
    high: { label: "High", score: 4 },
    overload: { label: "Overloaded", score: 5 }
  };

  const REFLECTION_META = {
    gratitude: { icon: "🌸", label: "Something I'm grateful for" },
    smallWin: { icon: "⭐", label: "Something that went well" },
    hardThing: { icon: "🌧", label: "Something that was hard" },
    yearQuestion: { icon: "📅", label: "365 Question Journal", talentRealm: "Health", talentId: "year-question" }
  };

  const JOURNAL_FIELD_REWARD_TIERS = [
    { threshold: 50, xp: 5, coins: 5, storyEnergyBase: 0 },
    { threshold: 150, xp: 5, coins: 5, storyEnergyBase: 0.10 },
    { threshold: 300, xp: 10, coins: 10, storyEnergyBase: 0.15 },
    { threshold: 600, xp: 15, coins: 15, storyEnergyBase: 0.25 },
    { threshold: 1000, xp: 10, coins: 10, storyEnergyBase: 0.15 }
  ];

  const COMPANIONS = {
    luca: {
      id: "luca",
      name: "Luca",
      kicker: "PRIVATE JOURNAL",
      portrait: "assets/story/portraits/luca_thinking.png",
      prompts: {
        choice: "Want to keep one more thing from today?",
        gratitude: "One good thing. Tiny counts. What do I want to remember?",
        smallWin: "What actually went right today?",
        hardThing: "What was hard today? No fixing it required.",
        yearQuestion: "Today's question is different from yesterday's. I can answer it however I want."
      },
      saved: {
        gratitude: "Good. Worth keeping.",
        smallWin: "That counts. No moving the goalposts.",
        hardThing: "Okay. It can just be hard without becoming a project.",
        yearQuestion: "Saved. Same date next year, I get to meet the question again."
      }
    },
    mina: {
      id: "mina",
      name: "Mina",
      kicker: "MESSAGE FROM MINA",
      portrait: "assets/story/sprites/mina_neutral.png",
      prompts: {
        choice: "Wanna do one more? Tiny counts, promise.",
        gratitude: "Okay, one good thing. Coffee absolutely counts.",
        smallWin: "Tiny victory check! What are we giving you credit for?",
        hardThing: "Okay, what sucked? You can just say it.",
        yearQuestion: "Okay babe, mystery-question-of-the-day time. Let's see what today's one is."
      },
      saved: {
        gratitude: "See? Keeping that one. 🌸",
        smallWin: "YES. It counts. I'm putting a star on it.",
        hardThing: "Yeah. That sounds rough. No silver lining required.",
        yearQuestion: "Cute. Saved for future-you to rediscover next year."
      }
    },
    kirishima: {
      id: "kirishima",
      name: "Kirishima",
      kicker: "MESSAGE FROM KIRISHIMA",
      portrait: "assets/story/characters/kirishima-happy.png",
      prompts: {
        choice: "Hey, want to keep one more thing from today?",
        gratitude: "Give me one good thing from today. Doesn't have to be huge.",
        smallWin: "What went better than you expected?",
        hardThing: "What felt heavy today?",
        yearQuestion: "Alright, today's question. No right answer — just whatever feels true today."
      },
      saved: {
        gratitude: "That's a good one to keep.",
        smallWin: "Nice. Seriously — give yourself that one.",
        hardThing: "Got it. You don't have to make it smaller than it was.",
        yearQuestion: "Nice. That's one little snapshot of where you are right now."
      }
    },
    bakugo: {
      id: "bakugo",
      name: "Bakugo",
      kicker: "MESSAGE FROM BAKUGO",
      portrait: "assets/story/characters/bakugo-neutral.png",
      prompts: {
        choice: "You done, or you keeping one more thing from today?",
        gratitude: "One thing that didn't suck. Go.",
        smallWin: "What actually went right today? And don't move the goalposts.",
        hardThing: "What was the pain in the ass today?",
        yearQuestion: "Daily question. Answer it straight; don't turn it into homework."
      },
      saved: {
        gratitude: "Fine. Keep that one.",
        smallWin: "Counts. Obviously.",
        hardThing: "Yeah. Sounds like a pain. Doesn't mean you handled it badly.",
        yearQuestion: "Done. Saved. Don't overwork the answer."
      }
    }
  };

  const els = {
    monthLabel: byId("journalMonthLabel"),
    prevMonth: byId("journalPrevMonth"),
    nextMonth: byId("journalNextMonth"),
    todayButton: byId("journalTodayButton"),
    reflectButton: byId("journalReflectButton"),
    heroMessage: byId("journalHeroMessage"),
    checkInCount: byId("journalCheckInCount"),
    reflectionCount: byId("journalReflectionCount"),
    moodAverage: byId("journalMoodAverage"),
    gratitudeCount: byId("journalGratitudeCount"),
    moodCalendar: byId("journalMoodCalendar"),
    energyTracker: byId("journalEnergyTracker"),
    sleepTracker: byId("journalSleepTracker"),
    stressTracker: byId("journalStressTracker"),
    gratitudeGarden: byId("journalGratitudeGarden"),
    smallWins: byId("journalSmallWins"),
    hardThings: byId("journalHardThings"),
    weeklyRecap: byId("journalWeeklyRecap"),
    archive: byId("journalArchive"),
    exportJson: byId("journalExportJson"),
    exportMarkdown: byId("journalExportMarkdown"),
    print: byId("journalPrint"),
    reflectionDialog: byId("journalReflectionDialog"),
    reflectionClose: byId("journalReflectionClose"),
    reflectionCompanion: byId("journalReflectionCompanion"),
    reflectionChoiceStep: byId("journalReflectionChoiceStep"),
    reflectionWriteStep: byId("journalReflectionWriteStep"),
    reflectionPrompt: byId("journalReflectionPrompt"),
    reflectionTextarea: byId("journalReflectionTextarea"),
    reflectionRewardMeter: byId("journalReflectionRewardMeter"),
    reflectionBack: byId("journalReflectionBack"),
    reflectionSave: byId("journalReflectionSave"),
    reflectionDone: byId("journalReflectionDone"),
    dayDialog: byId("journalDayDialog"),
    dayClose: byId("journalDayClose"),
    dayForm: byId("journalDayForm"),
    dayDate: byId("journalDayDate"),
    dayMood: byId("journalDayMood"),
    dayEnergy: byId("journalDayEnergy"),
    daySleep: byId("journalDaySleep"),
    dayStress: byId("journalDayStress"),
    daySleepHours: byId("journalDaySleepHours"),
    dayHealthSummary: byId("journalDayHealthSummary"),
    dayGratitude: byId("journalDayGratitude"),
    daySmallWin: byId("journalDaySmallWin"),
    dayHardThing: byId("journalDayHardThing"),
    dayYearQuestion: byId("journalDayYearQuestion"),
    dayYearQuestionPrompt: byId("journalDayYearQuestionPrompt"),
    reflectionDictate: byId("journalReflectionDictate"),
    dayRewardMeter: byId("journalDayRewardMeter")
  };

  let activeMonth = monthKey(new Date());
  let reflectionDate = todayKey();
  let reflectionCompanion = COMPANIONS.luca;
  let reflectionField = null;
  let editingDate = null;
  let initialized = false;
  let speechRecognition = null;
  let speechActive = false;

  init();

  function init() {
    const changed = ensureState();
    const todayEntry = app.getState().journal?.entries?.[todayKey()] || null;
    const repairedRewards = todayEntry ? repairMissedIndependentRewards(todayKey(), todayEntry) : emptyRewardTotal();
    bindEvents();
    initialized = true;
    if (changed || rewardTotalHasValue(repairedRewards)) app.saveState({ source: rewardTotalHasValue(repairedRewards) ? "journal-v0314ag-reward-repair" : "journal-v0302-init" });
    render();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;
    if (!state.journal || typeof state.journal !== "object" || Array.isArray(state.journal)) {
      state.journal = { schemaVersion: SCHEMA, entries: {}, migrations: {} };
      changed = true;
    }
    if (Number(state.journal.schemaVersion || 0) < SCHEMA) {
      state.journal.schemaVersion = SCHEMA;
      changed = true;
    }
    if (!state.journal.entries || typeof state.journal.entries !== "object" || Array.isArray(state.journal.entries)) {
      state.journal.entries = {};
      changed = true;
    }
    if (!state.journal.migrations || typeof state.journal.migrations !== "object" || Array.isArray(state.journal.migrations)) {
      state.journal.migrations = {};
      changed = true;
    }
    if (!state.journal.weeklyReviews || typeof state.journal.weeklyReviews !== "object" || Array.isArray(state.journal.weeklyReviews)) {
      state.journal.weeklyReviews = {};
      changed = true;
    }
    if (syncPlannerCheckIns(state)) changed = true;
    return changed;
  }

  function syncPlannerCheckIns(state = app.getState()) {
    const days = state.dailyPlanner?.days || {};
    const entries = state.journal?.entries || {};
    let changed = false;
    Object.entries(days).forEach(([date, day]) => {
      if (!day?.checkIn) return;
      const checkIn = day.checkIn;
      const existing = entries[date] || { date, createdAt: day.createdAt || Date.now() };
      const synced = {
        ...existing,
        date,
        mood: checkIn.mood || existing.mood || "",
        sleep: checkIn.sleep || existing.sleep || "",
        energy: checkIn.energy || existing.energy || "",
        stress: checkIn.stress || existing.stress || "",
        time: checkIn.time || existing.time || "",
        obligations: checkIn.obligations || existing.obligations || "",
        gentle: typeof checkIn.gentle === "boolean" ? checkIn.gentle : Boolean(existing.gentle),
        health: checkIn.health && typeof checkIn.health === "object" ? JSON.parse(JSON.stringify(checkIn.health)) : (existing.health || null),
        companionId: day.companion?.id || existing.companionId || "luca",
        checkInAt: day.createdAt || existing.checkInAt || Date.now(),
        updatedAt: Math.max(Number(existing.updatedAt || 0), Number(day.updatedAt || 0), Number(day.createdAt || 0))
      };
      if (JSON.stringify(existing) !== JSON.stringify(synced)) {
        entries[date] = synced;
        changed = true;
      }
    });
    return changed;
  }

  function bindEvents() {
    els.prevMonth?.addEventListener("click", () => changeMonth(-1));
    els.nextMonth?.addEventListener("click", () => changeMonth(1));
    els.todayButton?.addEventListener("click", () => {
      activeMonth = monthKey(new Date());
      render();
    });
    els.reflectButton?.addEventListener("click", () => openReflection(todayKey()));
    els.exportJson?.addEventListener("click", exportJournalJson);
    els.exportMarkdown?.addEventListener("click", exportJournalMarkdown);
    els.print?.addEventListener("click", () => window.print());

    els.moodCalendar?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-journal-date]");
      if (button) openDayEditor(button.dataset.journalDate);
    });
    els.archive?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-journal-month]");
      if (!button) return;
      activeMonth = button.dataset.journalMonth;
      render();
      document.querySelector("#view-journal")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.reflectionClose?.addEventListener("click", closeReflection);
    els.reflectionDone?.addEventListener("click", closeReflection);
    els.reflectionBack?.addEventListener("click", showReflectionChoices);
    els.reflectionSave?.addEventListener("click", saveReflectionField);
    els.reflectionDictate?.addEventListener("click", toggleReflectionDictation);
    els.reflectionTextarea?.addEventListener("input", renderReflectionRewardMeter);
    [els.dayGratitude, els.daySmallWin, els.dayHardThing, els.dayYearQuestion].forEach(input => input?.addEventListener("input", renderDayRewardMeter));
    els.reflectionChoiceStep?.addEventListener("click", event => {
      const choice = event.target.closest?.("[data-reflection-field]");
      if (choice) showReflectionWrite(choice.dataset.reflectionField);
    });

    els.dayClose?.addEventListener("click", () => els.dayDialog?.close());
    els.dayForm?.addEventListener("submit", saveDayEditor);

    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-journal-reflect]");
      if (open) openReflection(open.dataset.journalReflect || todayKey());
    });

    window.addEventListener("life-rpg:talent-v2-change", () => {
      if (!initialized) return;
      render();
      if (els.reflectionDialog?.open) showReflectionChoices();
      if (els.dayDialog?.open && editingDate) syncYearQuestionDayField(entryFor(editingDate, false) || {});
    });

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      const changed = ensureState();
      if (changed) app.saveState({ source: "journal-sync" });
      render();
    });
  }

  function journalState() {
    ensureState();
    return app.getState().journal;
  }

  function entryFor(date, create = false) {
    const journal = journalState();
    if (!journal.entries[date] && create) {
      journal.entries[date] = { date, createdAt: Date.now(), updatedAt: Date.now() };
    }
    return journal.entries[date] || null;
  }

  function changeMonth(delta) {
    const [year, month] = activeMonth.split("-").map(Number);
    activeMonth = monthKey(new Date(year, month - 1 + delta, 1));
    render();
  }

  function render() {
    if (!els.monthLabel) return;
    const entries = monthEntries(activeMonth);
    const companion = activeMonth === monthKey(new Date()) ? companionForDate(todayKey()) : companionForEntries(entries);
    els.monthLabel.textContent = monthTitle(activeMonth);
    renderHero(entries, companion);
    renderMoodCalendar(entries);
    renderMetricTracker(els.energyTracker, entries, "energy", ENERGY, "⚡");
    renderMetricTracker(els.sleepTracker, entries, "sleep", SLEEP, "☾");
    renderMetricTracker(els.stressTracker, entries, "stress", STRESS, "◇", true);
    renderReflectionCollection(els.gratitudeGarden, entries, "gratitude", "🌸", "No gratitude notes yet. Tiny things count whenever you feel like adding one.");
    renderReflectionCollection(els.smallWins, entries, "smallWin", "⭐", "No small wins saved yet. This section is for things that count even when they feel too small to brag about.");
    renderReflectionCollection(els.hardThings, entries, "hardThing", "🌧", "Nothing written here this month. Hard days do not need to be logged to be real.");
    renderWeeklyRecap(entries);
    renderArchive();
  }

  function renderHero(entries, companion) {
    const checkIns = entries.filter(entry => hasCoreCheckIn(entry));
    const reflectionEntries = entries.filter(entry => hasReflection(entry));
    const moodScores = checkIns.map(entry => MOOD[entry.mood]?.score).filter(Boolean);
    const gratitudeDays = entries.filter(entry => cleanText(entry.gratitude)).length;
    if (els.checkInCount) els.checkInCount.textContent = String(checkIns.length);
    if (els.reflectionCount) els.reflectionCount.textContent = String(reflectionEntries.length);
    if (els.gratitudeCount) els.gratitudeCount.textContent = String(gratitudeDays);
    if (els.moodAverage) {
      els.moodAverage.textContent = moodScores.length ? `${average(moodScores).toFixed(1)} / 5` : "—";
    }
    if (els.heroMessage) {
      const line = monthVoiceLine(entries, companion);
      els.heroMessage.innerHTML = companionMarkup(companion, line);
    }
  }

  function renderMoodCalendar(entries) {
    if (!els.moodCalendar) return;
    const byDate = Object.fromEntries(entries.map(entry => [entry.date, entry]));
    const [year, month] = activeMonth.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const days = new Date(year, month, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const today = todayKey();
    const headers = ["M", "T", "W", "T", "F", "S", "S"].map(day => `<span class="journal-weekday-v302">${day}</span>`).join("");
    const blanks = Array.from({ length: offset }, () => `<span class="journal-day-blank-v302"></span>`).join("");
    const cells = Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const date = `${activeMonth}-${String(day).padStart(2, "0")}`;
      const entry = byDate[date] || {};
      const mood = MOOD[entry.mood];
      const classes = ["journal-day-v302", mood ? `mood-${entry.mood}` : "empty", date === today ? "today" : ""].filter(Boolean).join(" ");
      const sub = mood?.label || (hasReflection(entry) ? "Note" : "");
      return `<button type="button" class="${classes}" data-journal-date="${escAttr(date)}" aria-label="${escAttr(formatDate(date))}${mood ? `, mood ${mood.label}` : ""}">
        <small>${day}</small><span>${mood?.icon || "·"}</span><em>${esc(sub)}</em>
      </button>`;
    }).join("");
    els.moodCalendar.innerHTML = `<div class="journal-weekdays-v302">${headers}</div><div class="journal-calendar-grid-v302">${blanks}${cells}</div>`;
  }

  function renderMetricTracker(container, entries, field, meta, icon, inverse = false) {
    if (!container) return;
    const byDate = Object.fromEntries(entries.map(entry => [entry.date, entry]));
    const [year, month] = activeMonth.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    const max = Math.max(...Object.values(meta).map(item => item.score));
    const bars = Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const date = `${activeMonth}-${String(day).padStart(2, "0")}`;
      const value = byDate[date]?.[field];
      const item = meta[value];
      const level = item ? (inverse ? max + 1 - item.score : item.score) : 0;
      const title = item ? `${formatDate(date)} · ${item.label}` : `${formatDate(date)} · no entry`;
      return `<span class="journal-metric-column-v302 ${item ? "filled" : ""}" title="${escAttr(title)}"><b style="--journal-level:${level};--journal-max:${max}"></b><small>${day}</small></span>`;
    }).join("");
    const values = entries.map(entry => {
      const score = meta[entry[field]]?.score;
      return score ? (inverse ? max + 1 - score : score) : 0;
    }).filter(Boolean);
    const summary = values.length ? `${average(values).toFixed(1)} / ${max}` : "No entries yet";
    container.innerHTML = `<div class="journal-metric-summary-v302"><span>${icon}</span><strong>${esc(summary)}</strong></div><div class="journal-metric-scroll-v302"><div class="journal-metric-bars-v302">${bars}</div></div>`;
  }

  function renderReflectionCollection(container, entries, field, icon, emptyCopy) {
    if (!container) return;
    const items = entries.filter(entry => cleanText(entry[field])).sort((a, b) => b.date.localeCompare(a.date));
    if (!items.length) {
      container.innerHTML = `<div class="journal-collection-empty-v302"><span>${icon}</span><p>${esc(emptyCopy)}</p></div>`;
      return;
    }
    container.innerHTML = items.map(entry => `<button type="button" class="journal-memory-card-v302" data-journal-date="${escAttr(entry.date)}"><span>${icon}</span><div><small>${esc(shortDate(entry.date))}</small><p>${esc(entry[field])}</p></div></button>`).join("");
    container.querySelectorAll("[data-journal-date]").forEach(button => button.addEventListener("click", () => openDayEditor(button.dataset.journalDate)));
  }

  function renderWeeklyRecap(entries) {
    if (!els.weeklyRecap) return;
    const [year, month] = activeMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const byDate = Object.fromEntries(entries.map(entry => [entry.date, entry]));
    const weekCount = Math.ceil((offset + daysInMonth) / 7);
    const cards = [];
    for (let week = 0; week < weekCount; week += 1) {
      const start = Math.max(1, week * 7 - offset + 1);
      const end = Math.min(daysInMonth, (week + 1) * 7 - offset);
      if (start > end) continue;
      const weekEntries = [];
      for (let day = start; day <= end; day += 1) {
        const date = `${activeMonth}-${String(day).padStart(2, "0")}`;
        if (byDate[date]) weekEntries.push(byDate[date]);
      }
      if (!weekEntries.some(entry => hasCoreCheckIn(entry) || hasReflection(entry))) continue;
      const companion = companionForEntries(weekEntries);
      cards.push(`<article class="journal-week-card-v302"><div class="journal-week-head-v302"><span>W${week + 1}</span><div><small>${esc(shortDate(`${activeMonth}-${String(start).padStart(2, "0")}`))} – ${esc(shortDate(`${activeMonth}-${String(end).padStart(2, "0")}`))}</small><strong>${esc(weeklyHeadline(weekEntries))}</strong></div></div>${companionMarkup(companion, weeklyVoiceLine(weekEntries, companion), true)}</article>`);
    }
    els.weeklyRecap.innerHTML = cards.length ? cards.join("") : `<div class="journal-collection-empty-v302"><span>✦</span><p>Your weekly notes will appear here as the month fills in.</p></div>`;
  }

  function renderArchive() {
    if (!els.archive) return;
    const entries = Object.values(journalState().entries || {});
    const months = [...new Set(entries.filter(entry => hasCoreCheckIn(entry) || hasReflection(entry)).map(entry => entry.date.slice(0, 7)))].sort().reverse();
    if (!months.length) {
      els.archive.innerHTML = `<span class="muted">Your first month will appear here once you check in or save a reflection.</span>`;
      return;
    }
    els.archive.innerHTML = months.map(month => {
      const count = monthEntries(month).filter(entry => hasCoreCheckIn(entry) || hasReflection(entry)).length;
      return `<button type="button" class="journal-archive-chip-v302 ${month === activeMonth ? "active" : ""}" data-journal-month="${escAttr(month)}"><strong>${esc(monthTitle(month))}</strong><small>${count} day${count === 1 ? "" : "s"}</small></button>`;
    }).join("");
  }

  function openReflection(date = todayKey(), companionId = null) {
    if (!els.reflectionDialog) return;
    reflectionDate = date;
    reflectionCompanion = companionId && companionAvailable(companionId) ? COMPANIONS[companionId] : companionForDate(date);
    reflectionField = null;
    renderReflectionCompanion(reflectionCompanion, reflectionCompanion.prompts.choice);
    showReflectionChoices();
    els.reflectionDialog.showModal();
  }

  function closeReflection() {
    if (els.reflectionDialog?.open) els.reflectionDialog.close();
  }

  function reflectionFieldUnlocked(field) {
    const meta = REFLECTION_META[field];
    if (!meta?.talentId) return true;
    return Boolean(window.LifeRPGTalentV2?.isContentUnlocked?.(meta.talentRealm, meta.talentId));
  }

  function showReflectionChoices() {
    reflectionField = null;
    els.reflectionWriteStep?.classList.add("hidden");
    els.reflectionChoiceStep?.classList.remove("hidden");
    renderReflectionCompanion(reflectionCompanion, reflectionCompanion.prompts.choice);
    if (!els.reflectionChoiceStep) return;
    const entry = entryFor(reflectionDate, false) || {};
    els.reflectionChoiceStep.querySelectorAll("[data-reflection-field]").forEach(button => {
      const field = button.dataset.reflectionField;
      const unlocked = reflectionFieldUnlocked(field);
      button.disabled = !unlocked;
      button.classList.toggle("is-talent-locked", !unlocked);
      button.classList.toggle("saved", unlocked && Boolean(cleanText(entry[field])));
      const status = button.querySelector("small");
      if (status) status.textContent = !unlocked ? "Unlock in Health Talent Tree" : cleanText(entry[field]) ? "Saved · tap to edit" : "Optional";
    });
  }

  function showReflectionWrite(field) {
    if (!REFLECTION_META[field] || !reflectionFieldUnlocked(field)) return;
    reflectionField = field;
    const entry = entryFor(reflectionDate, true);
    els.reflectionChoiceStep?.classList.add("hidden");
    els.reflectionWriteStep?.classList.remove("hidden");
    const prompt = field === "yearQuestion" ? yearQuestionForDate(reflectionDate) : reflectionCompanion.prompts[field];
    if (els.reflectionPrompt) els.reflectionPrompt.textContent = prompt;
    if (els.reflectionTextarea) {
      els.reflectionTextarea.value = entry[field] || "";
      els.reflectionTextarea.placeholder = field === "gratitude" ? "Tiny things count…" : field === "smallWin" ? "What deserves credit?" : field === "yearQuestion" ? "Type it — or tap Speak answer and just talk…" : "You don't have to solve it here…";
      renderReflectionRewardMeter();
      setTimeout(() => els.reflectionTextarea.focus(), 30);
    }
    renderReflectionCompanion(reflectionCompanion, prompt);
  }

  function saveReflectionField() {
    if (!reflectionField || !els.reflectionTextarea) return;
    const entry = entryFor(reflectionDate, true);
    entry[reflectionField] = cleanText(els.reflectionTextarea.value);
    entry.updatedAt = Date.now();
    entry.lastReflectionCompanionId = reflectionCompanion.id;
    const rewards = maybeAwardReflectionRewards(reflectionDate, entry);
    app.saveState({ source: `journal-${reflectionField}` });
    renderReflectionCompanion(reflectionCompanion, reflectionCompanion.saved[reflectionField]);
    app.showToast?.(`${REFLECTION_META[reflectionField].icon} Journal saved${rewardSummary(rewards)}`);
    render();
    setTimeout(showReflectionChoices, 420);
  }

  function renderReflectionCompanion(companion, line) {
    if (!els.reflectionCompanion) return;
    els.reflectionCompanion.innerHTML = companionMarkup(companion, line);
  }

  function openDayEditor(date) {
    if (!els.dayDialog || !els.dayForm) return;
    editingDate = date;
    const entry = entryFor(date, true);
    if (els.dayDate) els.dayDate.textContent = formatDateLong(date);
    setValue(els.dayMood, entry.mood || "");
    setValue(els.dayEnergy, entry.energy || "");
    setValue(els.daySleep, entry.sleep || "");
    setValue(els.dayStress, entry.stress || "");
    if (els.daySleepHours) els.daySleepHours.value = Number.isFinite(Number(entry.sleepHours)) && entry.sleepHours !== "" ? String(entry.sleepHours) : "";
    renderDayHealthSummary(entry.health);
    if (els.dayGratitude) els.dayGratitude.value = entry.gratitude || "";
    if (els.daySmallWin) els.daySmallWin.value = entry.smallWin || "";
    if (els.dayHardThing) els.dayHardThing.value = entry.hardThing || "";
    syncYearQuestionDayField(entry);
    renderDayRewardMeter();
    els.dayDialog.showModal();
  }

  function syncYearQuestionDayField(entry = {}) {
    if (!els.dayYearQuestion) return;
    const unlocked = reflectionFieldUnlocked("yearQuestion");
    els.dayYearQuestion.value = entry.yearQuestion || "";
    els.dayYearQuestion.disabled = !unlocked;
    els.dayYearQuestion.closest("label")?.classList.toggle("is-talent-locked", !unlocked);
    if (els.dayYearQuestionPrompt && editingDate) {
      els.dayYearQuestionPrompt.textContent = unlocked ? yearQuestionForDate(editingDate) : "Locked · Health Talent Tree";
    }
    renderDayRewardMeter();
  }

  function renderDayHealthSummary(health) {
    if (!els.dayHealthSummary) return;
    const raw = health && typeof health === "object" ? health : null;
    if (!raw || !raw.impact || raw.impact === "none") {
      els.dayHealthSummary.classList.remove("is-visible");
      els.dayHealthSummary.innerHTML = "";
      return;
    }
    const impactLabels = { mild: "Mild physical impact", moderate: "Noticeable physical impact", strong: "Strong physical impact" };
    const symptomLabels = { headache: "Headache / migraine", backPain: "Back pain", stomachPain: "Stomach / abdominal pain", periodCramps: "Period cramps", muscleSoreness: "Muscle soreness", exhaustion: "General exhaustion", fatigue: "Fatigue / sleepiness", coldFlu: "Cold / flu symptoms", nausea: "Nausea", other: "Other" };
    const symptoms = Array.isArray(raw.symptoms) ? raw.symptoms.map(key => symptomLabels[key]).filter(Boolean) : [];
    if (raw.other) symptoms.push(String(raw.other));
    const sick = raw.illness === "yes" ? "Felt sick / ill" : "Symptoms, but not marked as illness";
    const leave = raw.sickLeave === "yes" ? "Called in sick" : raw.sickLeave === "no" ? "Worked / did not call in sick" : raw.sickLeave === "not-needed" ? "No sick call needed" : "";
    els.dayHealthSummary.classList.add("is-visible");
    els.dayHealthSummary.innerHTML = `<small>BODY / RECOVERY CONTEXT FROM CHECK-IN</small><strong>${esc(impactLabels[raw.impact] || raw.impact)} · ${esc(sick)}</strong><p>${esc(symptoms.join(" · ") || "Physical symptoms logged")}${leave ? `<br>${esc(leave)}` : ""}${raw.sickLeaveNote ? ` · ${esc(String(raw.sickLeaveNote))}` : ""}</p>`;
  }

  function saveDayEditor(event) {
    event.preventDefault();
    if (!editingDate) return;
    const entry = entryFor(editingDate, true);
    entry.mood = els.dayMood?.value || "";
    entry.energy = els.dayEnergy?.value || "";
    entry.sleep = els.daySleep?.value || "";
    entry.stress = els.dayStress?.value || "";
    const hours = Number(els.daySleepHours?.value || 0);
    entry.sleepHours = hours > 0 ? Math.round(hours * 2) / 2 : "";
    entry.gratitude = cleanText(els.dayGratitude?.value);
    entry.smallWin = cleanText(els.daySmallWin?.value);
    entry.hardThing = cleanText(els.dayHardThing?.value);
    if (reflectionFieldUnlocked("yearQuestion")) entry.yearQuestion = cleanText(els.dayYearQuestion?.value);
    entry.updatedAt = Date.now();
    const rewards = maybeAwardReflectionRewards(editingDate, entry);
    app.saveState({ source: "journal-day-edit" });
    els.dayDialog.close();
    app.showToast?.(`Journal day saved${rewardSummary(rewards)}`);
    render();
  }

  function companionForEntries(entries) {
    const counts = {};
    (entries || []).forEach(entry => {
      const id = entry?.lastReflectionCompanionId || entry?.companionId;
      if (!id || !COMPANIONS[id]) return;
      counts[id] = Number(counts[id] || 0) + 1;
    });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return best ? COMPANIONS[best] : COMPANIONS.luca;
  }

  function companionForDate(date) {
    const state = app.getState();
    const dayCompanion = state.dailyPlanner?.days?.[date]?.companion?.id;
    if (dayCompanion && companionAvailable(dayCompanion, state)) return COMPANIONS[dayCompanion] || COMPANIONS.luca;
    const options = [COMPANIONS.luca];
    if (companionAvailable("mina", state)) options.push(COMPANIONS.mina, COMPANIONS.mina);
    if (companionAvailable("kirishima", state)) options.push(COMPANIONS.kirishima);
    if (companionAvailable("bakugo", state)) options.push(COMPANIONS.bakugo);
    const index = Math.floor(seededRandom(`${date}|journal-companion`) * options.length);
    return options[index] || COMPANIONS.luca;
  }

  function companionAvailable(id, state = app.getState()) {
    const flags = state.flags || {};
    if (id === "luca") return true;
    if (id === "mina") return Boolean(flags.STORY_MINA_FRIENDSHIP_STARTED || flags.MINA_FRIENDSHIP_ESTABLISHED || flags.MINA_CLOSE_FRIEND);
    if (["kirishima", "bakugo"].includes(id)) return Boolean(flags.DYNARIOT_MOVE_IN_COMPLETE || flags.SHARED_APARTMENT_IS_HOME || flags.HOME_SHARED_APARTMENT_ACTIVE);
    return false;
  }

  function companionMarkup(companion, line, compact = false) {
    const c = companion || COMPANIONS.luca;
    return `<div class="journal-message-v302 ${escAttr(c.id)} ${compact ? "compact" : ""}"><div class="journal-message-avatar-v302"><img src="${escAttr(uiThumb(c.portrait))}" alt="${escAttr(c.name)}" loading="lazy" decoding="async" /></div><div><small>${esc(c.kicker)}</small><strong>${esc(c.name)}</strong><p>${esc(line)}</p></div></div>`;
  }

  function monthVoiceLine(entries, companion) {
    const checkIns = entries.filter(hasCoreCheckIn);
    const reflections = entries.filter(hasReflection);
    const current = activeMonth === monthKey(new Date());
    if (!checkIns.length && !reflections.length) {
      if (companion.id === "mina") return "Blank month. No panic. It'll fill itself in when life actually happens.";
      if (companion.id === "kirishima") return "Nothing to summarize yet. Start wherever today actually is.";
      if (companion.id === "bakugo") return "It's blank because you haven't logged anything. That's all. Not a moral failing.";
      return "Blank page. Fine. It only needs to hold what actually happens, not perform productivity at me.";
    }
    const gratitude = entries.filter(entry => cleanText(entry.gratitude)).length;
    const moodScores = checkIns.map(entry => MOOD[entry.mood]?.score).filter(Boolean);
    const avgMood = moodScores.length ? average(moodScores) : 0;
    if (companion.id === "mina") return `${current ? "This month so far" : "That month"}: ${checkIns.length} check-ins, ${gratitude} little things worth keeping${avgMood ? `, mood averaging ${avgMood.toFixed(1)}/5` : ""}. Look at all that actual life.`;
    if (companion.id === "kirishima") return `${checkIns.length} check-ins${gratitude ? ` and ${gratitude} gratitude note${gratitude === 1 ? "" : "s"}` : ""}. Enough to start seeing the shape of the month without turning it into a scorecard.`;
    if (companion.id === "bakugo") return `${checkIns.length} check-ins. ${gratitude ? `${gratitude} things you bothered to keep.` : "No gratitude quota. Good."} It's data, not a grade.`;
    return `${checkIns.length} check-ins${reflections.length ? `, ${reflections.length} days with something written down` : ""}. Enough for a bird's-eye view without pretending a month can be reduced to one number.`;
  }

  function weeklyHeadline(entries) {
    const checkIns = entries.filter(hasCoreCheckIn);
    const reflectionCount = entries.filter(hasReflection).length;
    const time = timeSummaryForEntries(entries);
    if (!checkIns.length) {
      const parts = [`${reflectionCount} reflection${reflectionCount === 1 ? "" : "s"} saved`];
      if (time.workMinutes) parts.push(`${formatMinutes(time.workMinutes)} work`);
      return parts.join(" · ");
    }
    const moodScores = checkIns.map(entry => MOOD[entry.mood]?.score).filter(Boolean);
    const energyScores = checkIns.map(entry => ENERGY[entry.energy]?.score).filter(Boolean);
    const parts = [`${checkIns.length} check-in${checkIns.length === 1 ? "" : "s"}`];
    if (moodScores.length) parts.push(`mood ${average(moodScores).toFixed(1)}/5`);
    if (energyScores.length) parts.push(`energy ${average(energyScores).toFixed(1)}/4`);
    if (time.workMinutes) parts.push(`${formatMinutes(time.workMinutes)} work`);
    return parts.join(" · ");
  }

  function weeklyVoiceLine(entries, companion) {
    const checkIns = entries.filter(hasCoreCheckIn);
    const lowSleep = checkIns.filter(entry => ["bad", "meh"].includes(entry.sleep)).length;
    const lowEnergy = checkIns.filter(entry => ["fumes", "low"].includes(entry.energy)).length;
    const goodMood = checkIns.filter(entry => ["good", "great"].includes(entry.mood)).length;
    const gratitude = entries.filter(entry => cleanText(entry.gratitude)).length;
    const time = timeSummaryForEntries(entries);
    let observation = "Not enough check-ins to call this a pattern yet.";
    if (time.workMinutes >= 2700 && lowEnergy >= 2) observation = `${formatMinutes(time.workMinutes)} of work and lower energy both showed up in this logged week. That's context, not proof of cause.`;
    else if (time.workMinutes >= 2400) observation = `${formatMinutes(time.workMinutes)} of work is visible in this week. The workload belongs in the reflection instead of disappearing behind the optional quests.`;
    else if (checkIns.length >= 3 && lowSleep >= 2 && lowEnergy >= 2) observation = `Lower sleep and lower energy showed up together a few times this week.`;
    else if (checkIns.length >= 3 && goodMood >= Math.ceil(checkIns.length / 2)) observation = `More than half of the logged days landed on the good side of the mood scale.`;
    else if (gratitude >= 2) observation = `${gratitude} little things made it into the gratitude notes.`;
    else if (checkIns.length >= 3) observation = `Enough days are logged here to see the week without turning it into a diagnosis.`;

    if (companion.id === "mina") return `${observation} We're observing, not grading.`;
    if (companion.id === "kirishima") return `${observation} That's useful context, not a verdict on the week.`;
    if (companion.id === "bakugo") return `${observation} Don't turn correlation into some dramatic life theory.`;
    return `${observation} Description first. Explanation can wait.`;
  }

  function timeSummaryForEntries(entries) {
    const dates = entries.map(entry => entry?.date).filter(Boolean).sort();
    if (!dates.length) return { totalMinutes: 0, workMinutes: 0, personalMinutes: 0, recoveryMinutes: 0 };
    const start = new Date(`${dates[0]}T00:00:00`);
    const end = new Date(`${dates[dates.length - 1]}T23:59:59.999`);
    const result = { totalMinutes: 0, workMinutes: 0, personalMinutes: 0, recoveryMinutes: 0 };
    (app.getState().timeTracking?.entries || []).forEach(item => {
      const at = new Date(item?.startAt || 0);
      if (!Number.isFinite(at.getTime()) || at < start || at > end) return;
      const minutes = Math.max(0, Number(item.minutes || 0));
      result.totalMinutes += minutes;
      const category = String(item.categoryId || "");
      if (["school", "work_home", "focus"].includes(category)) result.workMinutes += minutes;
      else if (["hobby", "gaming", "reading"].includes(category)) result.personalMinutes += minutes;
      else if (category === "recovery") result.recoveryMinutes += minutes;
    });
    return result;
  }

  function formatMinutes(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    if (total < 60) return `${total}m`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function exportJournalJson() {
    ensureState();
    const state = app.getState();
    const checkIns = {};
    Object.entries(state.dailyPlanner?.days || {}).forEach(([date, day]) => {
      if (!day?.checkIn) return;
      checkIns[date] = {
        checkIn: { ...day.checkIn },
        companionId: day.companion?.id || null,
        createdAt: day.createdAt || null,
        updatedAt: day.updatedAt || null
      };
    });
    downloadFile(`life-rpg-journal-${todayKey()}.json`, JSON.stringify({
      format: "LifeRPGJournal",
      schemaVersion: SCHEMA,
      exportedAt: new Date().toISOString(),
      journal: state.journal,
      checkIns,
      timeTracking: state.timeTracking || { schemaVersion: 1, entries: [] }
    }, null, 2), "application/json");
    app.showToast?.("Journal JSON exported");
  }

  function exportJournalMarkdown() {
    const state = app.getState();
    const entries = Object.values(journalState().entries || {}).filter(entry => hasCoreCheckIn(entry) || hasReflection(entry)).sort((a, b) => a.date.localeCompare(b.date));
    const groups = new Map();
    entries.forEach(entry => {
      const month = entry.date.slice(0, 7);
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month).push(entry);
    });
    const lines = ["# Life RPG Journal", "", `Exported: ${new Date().toLocaleString()}`, "", "> Your original reflections are preserved as written. Tracker labels are descriptive, not diagnostic.", ""];
    [...groups.entries()].forEach(([month, monthItems]) => {
      lines.push(`## ${monthTitle(month)}`, "");
      monthItems.forEach(entry => {
        lines.push(`### ${formatDateLong(entry.date)}`);
        const core = [];
        if (entry.mood) core.push(`Mood: ${MOOD[entry.mood]?.label || entry.mood}`);
        if (entry.energy) core.push(`Energy: ${ENERGY[entry.energy]?.label || entry.energy}`);
        if (entry.sleep) core.push(`Sleep: ${SLEEP[entry.sleep]?.label || entry.sleep}`);
        if (entry.sleepHours) core.push(`Sleep hours: ${entry.sleepHours}`);
        if (entry.stress) core.push(`Stress: ${STRESS[entry.stress]?.label || entry.stress}`);
        if (entry.health?.impact && entry.health.impact !== "none") {
          const symptomLabels = { headache: "Headache / migraine", backPain: "Back pain", stomachPain: "Stomach / abdominal pain", periodCramps: "Period cramps", muscleSoreness: "Muscle soreness", exhaustion: "General exhaustion", fatigue: "Fatigue / sleepiness", coldFlu: "Cold / flu symptoms", nausea: "Nausea", other: "Other" };
          const symptoms = Array.isArray(entry.health.symptoms) ? entry.health.symptoms.map(key => symptomLabels[key]).filter(Boolean) : [];
          if (entry.health.other) symptoms.push(entry.health.other);
          core.push(`Body: ${entry.health.impact}${entry.health.illness === "yes" ? " · sick" : ""}${symptoms.length ? ` · ${symptoms.join(", ")}` : ""}${entry.health.sickLeave === "yes" ? " · called in sick" : entry.health.sickLeave === "no" ? " · worked while sick" : ""}`);
        }
        if (core.length) lines.push(core.join(" · "));
        if (cleanText(entry.gratitude)) lines.push("", `**Grateful for**  `, entry.gratitude);
        if (cleanText(entry.smallWin)) lines.push("", `**Small win**  `, entry.smallWin);
        if (cleanText(entry.hardThing)) lines.push("", `**What was hard**  `, entry.hardThing);
        if (cleanText(entry.yearQuestion)) lines.push("", `**365 Question** — ${yearQuestionForDate(entry.date || date)}  `, entry.yearQuestion);
        if (cleanText(entry.thoughtUntangler)) lines.push("", `**Legacy Thought Untangler**  `, entry.thoughtUntangler);
        lines.push("");
      });
    });
    if (!entries.length) lines.push("No journal entries yet.", "");

    const weeklyReviews = Object.values(state.journal?.weeklyReviews || {})
      .filter(review => review?.completedAt && review?.weekKey)
      .sort((a, b) => String(a.weekKey).localeCompare(String(b.weekKey)));
    if (weeklyReviews.length) {
      const weeklyLabels = {
        good: "What felt good or helped",
        hard: "What was hard or draining",
        credit: "What I want to give myself credit for",
        more: "What I want more of next week",
        lighter: "What can be smaller or easier next week"
      };
      lines.push("## Weekly Reviews", "");
      weeklyReviews.forEach(review => {
        lines.push(`### ${review.weekKey} · ${review.startDate || ""} – ${review.endDate || ""}`);
        Object.entries(weeklyLabels).forEach(([key, label]) => {
          const value = cleanText(review.answers?.[key]);
          if (value) lines.push("", `**${label}**  `, value);
        });
        lines.push("");
      });
    }

    const timeLogs = Array.isArray(state.timeTracking?.entries) ? state.timeTracking.entries.slice().sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0)) : [];
    if (timeLogs.length) {
      lines.push("## Time Log", "", "> Tracked time is included so the journal export remains useful outside Life RPG.", "");
      let lastDate = "";
      timeLogs.forEach(item => {
        const start = new Date(item.startAt || 0);
        const end = new Date(item.endAt || 0);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
        const key = localDateKey(start);
        if (key !== lastDate) { lines.push(`### ${formatDateLong(key)}`); lastDate = key; }
        const time = `${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
        lines.push(`- ${time} · ${formatMinutes(item.minutes)} · ${item.label || item.categoryId || "Time log"}`);
      });
      lines.push("");
    }
    downloadFile(`life-rpg-journal-${todayKey()}.md`, lines.join("\n"), "text/markdown");
    app.showToast?.("Journal Markdown exported");
  }

  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function monthEntries(month) {
    return Object.values(journalState().entries || {}).filter(entry => entry?.date?.startsWith(`${month}-`)).sort((a, b) => a.date.localeCompare(b.date));
  }

  function reflectionStreakEndingOn(dateKeyValue) {
    let streak = 0;
    let cursor = dateFromKey(dateKeyValue);
    const entries = journalState().entries || {};
    for (let guard = 0; guard < 3650; guard += 1) {
      const key = localDateKey(cursor);
      if (!hasReflection(entries[key])) break;
      streak += 1;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    }
    return streak;
  }

  function reflectionCoinRewardForStreak(streak) {
    const safe = Math.max(1, Number(streak || 1));
    if (safe >= 90) return 8;
    if (safe >= 30) return 7;
    if (safe >= 7) return 6;
    return 5;
  }

  function maybeAwardReflectionRewards(dateKeyValue, entry) {
    const total = emptyRewardTotal();
    if (dateKeyValue !== todayKey() || !hasReflection(entry)) return total;
    const root = app.getState();
    const events = root.rewardLedger?.events || [];
    const oldCoinEvent = events.some(event => event?.source === "journal-reflection" && event.sourceId === dateKeyValue);
    const baseId = `${dateKeyValue}:base-v0310`;
    const hasBase = events.some(event => event?.source === "journal-reflection-base" && event.sourceId === baseId);

    if (!hasBase) {
      const streak = reflectionStreakEndingOn(dateKeyValue);
      const base = app.awardActivity?.({
        source: "journal-reflection-base",
        sourceId: baseId,
        label: "Daily reflection",
        realm: "Health",
        capability: "wellbeing",
        xp: 5,
        realmXP: 3,
        statXP: 3,
        coins: oldCoinEvent ? 0 : reflectionCoinRewardForStreak(streak),
        storyEnergyBase: 0.10,
        progressionRelevant: true,
        metadata: { reflection: true, streak, journalCharacters: reflectionCharacterCount(entry), independentFields: true }
      });
      addRewardTotal(total, base);
    }

    Object.keys(REFLECTION_META).forEach(field => {
      if (!reflectionFieldUnlocked(field)) return;
      const chars = reflectionFieldCharacterCount(entry, field);
      JOURNAL_FIELD_REWARD_TIERS.forEach((tier, index) => {
        if (chars < tier.threshold || independentTierAlreadyAwarded(dateKeyValue, field, index, tier.threshold)) return;
        const reward = app.awardActivity?.({
          source: "journal-reflection-field-effort",
          sourceId: `${dateKeyValue}:${field}:tier-${index + 1}:v0314ab`,
          label: `${REFLECTION_META[field].label} · ${tier.threshold}+ characters`,
          realm: "Health",
          capability: "wellbeing",
          xp: tier.xp,
          realmXP: Math.max(0, Math.round(tier.xp * 0.5)),
          statXP: Math.max(0, Math.round(tier.xp * 0.5)),
          coins: tier.coins,
          storyEnergyBase: tier.storyEnergyBase,
          progressionRelevant: true,
          metadata: {
            reflection: true,
            independentReflectionField: true,
            journalIndependentRewardsVersion: "0.31.4ag",
            field,
            characters: chars,
            threshold: tier.threshold,
            effortTier: index + 1
          }
        });
        addRewardTotal(total, reward);
      });
    });

    return total;
  }

  function independentTierAlreadyAwarded(dateKeyValue, field, index, threshold) {
    return (app.getState().rewardLedger?.events || []).some(event => {
      if (event?.source !== "journal-reflection-field-effort") return false;
      if (event?.metadata?.field === field && Number(event?.metadata?.threshold || 0) === Number(threshold)) {
        return String(event.sourceId || "").startsWith(`${dateKeyValue}:`);
      }
      return event?.sourceId === `${dateKeyValue}:${field}:tier-${index + 1}:v0314ab`;
    });
  }

  function repairMissedIndependentRewards(dateKeyValue, entry) {
    if (dateKeyValue !== todayKey() || !hasReflection(entry)) return emptyRewardTotal();
    const root = app.getState();
    const migration = root.journal?.migrations?.independentReflectionRewardsV0314ab;
    if (!migration) return emptyRewardTotal();
    const events = root.rewardLedger?.events || [];
    const hasBase = events.some(event => event?.source === "journal-reflection-base" && String(event.sourceId || "").startsWith(`${dateKeyValue}:`));
    const hasAnyIndependent = events.some(event => event?.source === "journal-reflection-field-effort" && String(event.sourceId || "").startsWith(`${dateKeyValue}:`));
    const installedAt = Math.max(0, Number(migration.installedAt || 0));
    const entryUpdatedAt = Math.max(0, Number(entry.updatedAt || entry.createdAt || 0));
    // Only repair writing that happened after the independent-reward release was
    // installed. Older text was deliberately grandfathered and must stay that way.
    if (!hasBase || hasAnyIndependent || (installedAt && entryUpdatedAt && entryUpdatedAt < installedAt)) return emptyRewardTotal();
    migration.repairedByV0314ag = Date.now();
    migration.baselineTiers = { gratitude: 0, smallWin: 0, hardThing: 0 };
    return maybeAwardReflectionRewards(dateKeyValue, entry);
  }

  function reflectionCharacterCount(entry) {
    return Object.keys(REFLECTION_META).reduce((sum, field) => sum + reflectionFieldCharacterCount(entry, field), 0);
  }

  function reflectionFieldCharacterCount(entry, field) {
    return cleanText(entry?.[field]).length;
  }

  function reflectionDraftCharacterCount() {
    if (!reflectionField) return 0;
    const entry = entryFor(reflectionDate, false) || {};
    if (els.reflectionTextarea) return cleanText(els.reflectionTextarea.value).length;
    return reflectionFieldCharacterCount(entry, reflectionField);
  }

  function dayDraftFieldCount(field) {
    const map = { gratitude: els.dayGratitude, smallWin: els.daySmallWin, hardThing: els.dayHardThing, yearQuestion: els.dayYearQuestion };
    return cleanText(map[field]?.value).length;
  }

  function rewardMeterMarkup(chars, dateKeyValue = todayKey(), field = null) {
    const reached = JOURNAL_FIELD_REWARD_TIERS.filter(tier => chars >= tier.threshold).length;
    const next = JOURNAL_FIELD_REWARD_TIERS.find(tier => chars < tier.threshold);
    const nextIndex = next ? JOURNAL_FIELD_REWARD_TIERS.indexOf(next) : -1;
    const historical = dateKeyValue !== todayKey();
    const label = field && REFLECTION_META[field] ? REFLECTION_META[field].label : "Reflection";
    const nextText = next
      ? `<strong>${next.threshold - chars} character${next.threshold - chars === 1 ? "" : "s"} to the next reward</strong><span>Next: +${next.xp} XP · +${next.coins} 🪙${next.storyEnergyBase ? ` · +${next.storyEnergyBase} 🔥 base` : ""}</span>`
      : `<strong>Maximum writing bonus reached ✨</strong><span>Keep writing only if you want to — rewards stop scaling after ${JOURNAL_FIELD_REWARD_TIERS.at(-1).threshold} characters in this reflection.</span>`;
    const width = next ? Math.min(100, Math.round((chars / next.threshold) * 100)) : 100;
    return `<div class="journal-effort-meter-v310 ${historical ? "historical" : ""}"><div class="journal-effort-meter-top-v310"><span><b>${chars}</b> characters in this reflection</span><em>${reached}/${JOURNAL_FIELD_REWARD_TIERS.length} depth bonuses</em></div><i><b style="width:${width}%"></b></i><div>${historical ? `<strong>Saved ${esc(label).toLowerCase()} depth</strong><span>Older entries stay editable without creating backdated reward farming.</span>` : nextText}</div></div>`;
  }

  function renderReflectionRewardMeter() {
    if (!els.reflectionRewardMeter || !reflectionField) return;
    els.reflectionRewardMeter.innerHTML = rewardMeterMarkup(reflectionDraftCharacterCount(), reflectionDate, reflectionField);
  }

  function renderDayRewardMeter() {
    if (!els.dayRewardMeter || !editingDate) return;
    els.dayRewardMeter.innerHTML = Object.keys(REFLECTION_META).map(field => {
      if (!reflectionFieldUnlocked(field)) return "";
      return `<section class="journal-independent-meter-v314ag">
        <small>${REFLECTION_META[field].icon} ${esc(REFLECTION_META[field].label)}</small>
        ${rewardMeterMarkup(dayDraftFieldCount(field), editingDate, field)}
      </section>`;
    }).join("");
  }

  function emptyRewardTotal() { return { xp: 0, coins: 0, storyEnergy: 0 }; }
  function addRewardTotal(total, reward) {
    if (!reward) return total;
    total.xp += Number(reward.xp || 0);
    total.coins += Number(reward.coins || 0);
    total.storyEnergy += Number(reward.storyEnergy || 0);
    return total;
  }
  function rewardTotalHasValue(total) { return Boolean(Number(total?.xp || 0) || Number(total?.coins || 0) || Number(total?.storyEnergy || 0)); }
  function rewardSummary(total) {
    if (!rewardTotalHasValue(total)) return "";
    const parts = [];
    if (Number(total.xp || 0)) parts.push(`+${Number(total.xp || 0)} XP`);
    if (Number(total.storyEnergy || 0)) parts.push(`+${app.formatEnergy?.(total.storyEnergy) || total.storyEnergy} 🔥`);
    if (Number(total.coins || 0)) parts.push(`+${Number(total.coins || 0)} 🪙`);
    return parts.length ? ` · ${parts.join(" · ")}` : "";
  }

  function hasCoreCheckIn(entry) {
    return Boolean(entry && (entry.mood || entry.sleep || entry.energy || entry.stress));
  }

  function hasReflection(entry) {
    if (!entry) return false;
    return Object.keys(REFLECTION_META).some(field => cleanText(entry[field])) || Boolean(cleanText(entry.thoughtUntangler));
  }

  function yearQuestionForDate(dateKeyValue = todayKey()) {
    const date = typeof dateKeyValue === "string" ? dateFromKey(dateKeyValue) : dateKeyValue;
    return window.LifeRPGYearJournalQuestions?.questionForDate?.(date)
      || "What feels worth noticing about today?";
  }

  function toggleReflectionDictation() {
    if (!els.reflectionTextarea) return;
    if (speechActive && speechRecognition) {
      try { speechRecognition.stop(); } catch {}
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      app.showToast?.("Voice dictation is not available in this browser. You can still use your device's normal dictation in the text box.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = navigator.language || "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    const base = cleanText(els.reflectionTextarea.value);
    let committed = "";

    recognition.onstart = () => {
      speechRecognition = recognition;
      speechActive = true;
      if (els.reflectionDictate) els.reflectionDictate.textContent = "■ Stop speaking";
    };

    recognition.onresult = event => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = cleanText(event.results[i][0]?.transcript);
        if (!part) continue;
        if (event.results[i].isFinal) committed += `${committed ? " " : ""}${part}`;
        else interim += `${interim ? " " : ""}${part}`;
      }
      els.reflectionTextarea.value = [base, committed, interim].filter(Boolean).join(" ");
      renderReflectionRewardMeter();
    };

    recognition.onerror = event => {
      if (!["aborted", "no-speech"].includes(event.error)) {
        app.showToast?.("Voice dictation stopped. You can keep typing or try again.");
      }
    };

    recognition.onend = () => {
      speechActive = false;
      speechRecognition = null;
      if (els.reflectionDictate) els.reflectionDictate.textContent = "🎙️ Speak answer";
      els.reflectionTextarea.value = [base, committed].filter(Boolean).join(" ");
      renderReflectionRewardMeter();
    };

    try { recognition.start(); }
    catch { app.showToast?.("Voice dictation could not start. Please allow microphone access and try again."); }
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function setValue(element, value) {
    if (element) element.value = value;
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function todayKey() {
    return localDateKey(new Date());
  }

  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(year, month - 1, day || 1);
  }

  function monthTitle(month) {
    return dateFromKey(`${month}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function shortDate(date) {
    return dateFromKey(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatDate(date) {
    return dateFromKey(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function formatDateLong(date) {
    return dateFromKey(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function seededRandom(seedText) {
    let hash = 2166136261;
    for (let i = 0; i < seedText.length; i += 1) {
      hash ^= seedText.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return (hash >>> 0) / 4294967296;
  }

  function uiThumb(src) { return window.LifeRPGVisuals?.thumbnail?.(src) || String(src || ""); }
  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value || "");
  }

  function escAttr(value) {
    return esc(value).replaceAll("`", "&#096;");
  }

  window.LifeRPGJournal = {
    render,
    openReflection,
    promptAfterCheckIn: (companionId = null, date = todayKey()) => openReflection(date, companionId),
    getEntry: date => ({ ...(entryFor(date, false) || {}) }),
    exportJson: exportJournalJson,
    exportMarkdown: exportJournalMarkdown,
    awardPendingReflectionRewards: (date = todayKey()) => {
      const entry = entryFor(date, false);
      return entry ? maybeAwardReflectionRewards(date, entry) : emptyRewardTotal();
    }
  };
})();
