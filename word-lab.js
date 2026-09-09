(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const LEVELS = window.LIFE_RPG_WORD_LAB_LEVELS || {};
  if (!app?.getState || !app?.awardActivity || !Array.isArray(LEVELS.de) || !Array.isArray(LEVELS.en)) return;

  const VERSION = "0.31.4p";
  const SCHEMA = 1;
  const TOTAL = 50;
  const QUESTIONS_PER_LEVEL = 5;
  const REPEAT_SCALES = [1, 0.75, 0.5, 0.35];
  const META = {
    de: { label: "German Precision", short: "German", flag: "🇩🇪", accent: "DE", description: "Precision · register · Bildungssprache" },
    en: { label: "English Fluency", short: "English", flag: "🇬🇧", accent: "EN", description: "Collocations · nuance · natural advanced English" }
  };
  const TIERS = {
    1: { xp: 18, statXP: 12, coins: 10, story: 0.45 },
    2: { xp: 22, statXP: 14, coins: 13, story: 0.65 },
    3: { xp: 26, statXP: 17, coins: 16, story: 0.9 },
    4: { xp: 30, statXP: 20, coins: 19, story: 1.15 },
    5: { xp: 34, statXP: 23, coins: 22, story: 1.4 }
  };

  const els = {
    dialog: byId("wordLabDialog"),
    close: byId("wordLabClose"),
    daily: byId("wordLabDailyCard"),
    pathDe: byId("wordLabPathDe"),
    pathEn: byId("wordLabPathEn"),
    progress: byId("wordLabJourneyProgress"),
    levels: byId("wordLabLevelGrid"),
    mapTitle: byId("wordLabLevelMapTitle"),
    mapCopy: byId("wordLabLevelMapCopy"),
    play: byId("wordLabPlayPanel"),
    meta: byId("wordLabLessonMeta"),
    questionProgress: byId("wordLabQuestionProgress"),
    question: byId("wordLabQuestionCard"),
    form: byId("wordLabAnswerForm"),
    choices: byId("wordLabChoices"),
    submit: byId("wordLabSubmit"),
    feedback: byId("wordLabFeedback"),
    next: byId("wordLabNext"),
    result: byId("wordLabResult"),
    status: byId("wordLabStatus"),
    growthStats: byId("wordLabGrowthStats"),
    trainingStats: byId("trainingGroundsWordLabStatus"),
    quickStatus: byId("wordLabQuickStatus")
  };

  let selectedLanguage = "de";

  init();

  function init() {
    ensureState();
    bind();
    const active = findActive();
    if (active) selectedLanguage = active.language;
    render();
    window.addEventListener("life-rpg:render", render);
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      journeys: {
        de: { completedLevels: [], active: null, lastCompletedAt: null },
        en: { completedLevels: [], active: null, lastCompletedAt: null }
      },
      stats: {
        de: { levelsSolved: 0, questionsAnswered: 0, firstTryCorrect: 0, attempts: 0 },
        en: { levelsSolved: 0, questionsAnswered: 0, firstTryCorrect: 0, attempts: 0 }
      },
      completed: []
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.wordLab || typeof root.wordLab !== "object" || Array.isArray(root.wordLab)) root.wordLab = defaults();
    const s = root.wordLab;
    s.schemaVersion = SCHEMA;
    if (!s.journeys || typeof s.journeys !== "object") s.journeys = defaults().journeys;
    if (!s.stats || typeof s.stats !== "object") s.stats = defaults().stats;
    ["de", "en"].forEach(language => {
      if (!s.journeys[language] || typeof s.journeys[language] !== "object") s.journeys[language] = defaults().journeys[language];
      if (!s.stats[language] || typeof s.stats[language] !== "object") s.stats[language] = defaults().stats[language];
      const journey = s.journeys[language];
      journey.completedLevels = [...new Set((journey.completedLevels || []).map(Number).filter(level => level >= 1 && level <= TOTAL))].sort((a, b) => a - b);
      journey.active = normalizeActive(journey.active, language);
      journey.lastCompletedAt = journey.lastCompletedAt || null;
      ["levelsSolved", "questionsAnswered", "firstTryCorrect", "attempts"].forEach(key => s.stats[language][key] = Math.max(0, Number(s.stats[language][key] || 0)));
    });
    s.completed = Array.isArray(s.completed) ? s.completed.slice(-500) : [];
    return s;
  }

  function normalizeActive(active, fallbackLanguage) {
    if (!active || typeof active !== "object") return null;
    const language = active.language === "en" ? "en" : fallbackLanguage === "en" ? "en" : "de";
    const def = levelDef(language, active.level);
    if (!def) return null;
    const count = def.questions.length;
    return {
      ...active,
      id: String(active.id || `word-lab-${language}-l${def.level}`),
      language,
      level: def.level,
      questionIndex: Math.max(0, Math.min(count - 1, Number(active.questionIndex || 0))),
      attemptsByQuestion: Array.from({ length: count }, (_, index) => Math.max(0, Number(active.attemptsByQuestion?.[index] || 0))),
      firstTryByQuestion: Array.from({ length: count }, (_, index) => active.firstTryByQuestion?.[index] === true ? true : active.firstTryByQuestion?.[index] === false ? false : null),
      responseTimesMs: Array.from({ length: count }, (_, index) => Math.max(0, Number(active.responseTimesMs?.[index] || 0))),
      selectedIndex: Number.isInteger(active.selectedIndex) ? active.selectedIndex : null,
      answerLocked: Boolean(active.answerLocked),
      lastCorrect: active.lastCorrect === true,
      questionStartedAt: Number(active.questionStartedAt || Date.now()),
      replay: Boolean(active.replay),
      createdAt: Number(active.createdAt || Date.now()),
      updatedAt: Number(active.updatedAt || active.createdAt || Date.now()),
      completedAt: active.completedAt ? Number(active.completedAt) : null,
      rewardEventId: active.rewardEventId || null
    };
  }

  function state() { return ensureState(); }
  function journey(language = selectedLanguage) { return state().journeys[language]; }
  function stats(language = selectedLanguage) { return state().stats[language]; }
  function completedSet(language = selectedLanguage) { return new Set(journey(language).completedLevels); }
  function nextLevel(language = selectedLanguage) { for (let level = 1; level <= TOTAL; level += 1) if (!completedSet(language).has(level)) return level; return null; }
  function current(language = selectedLanguage) { return journey(language).active; }
  function findActive() { return ["de", "en"].map(language => state().journeys[language].active).find(active => active && !active.completedAt) || null; }
  function levelDef(language, level) { return (LEVELS[language] || []).find(item => Number(item.level) === Number(level)) || null; }
  function tier(level) { return Math.min(5, Math.max(1, Math.ceil(Number(level || 1) / 10))); }

  function persist(source = "word-lab") {
    app.saveState({ source });
    render();
    app.renderAll?.();
  }

  function bind() {
    els.close?.addEventListener("click", () => els.dialog?.open && els.dialog.close());
    els.form?.addEventListener("submit", event => {
      event.preventDefault();
      submitAnswer();
    });
    els.next?.addEventListener("click", event => {
      event.preventDefault();
      nextQuestion();
    });

    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-word-lab-open]");
      if (open) { event.preventDefault(); openDialog(open.dataset.wordLabOpenLanguage); return; }

      const path = event.target.closest?.("[data-word-lab-language]");
      if (path) {
        event.preventDefault();
        setLanguage(path.dataset.wordLabLanguage);
        return;
      }

      const daily = event.target.closest?.("[data-word-lab-daily-start]");
      if (daily) {
        event.preventDefault();
        const language = daily.dataset.wordLabDailyStart === "en" ? "en" : "de";
        setLanguage(language, { persistChoice: false });
        startLevel(language, nextLevel(language) || TOTAL, { replay: !nextLevel(language) });
        return;
      }

      const levelButton = event.target.closest?.("[data-word-lab-level]");
      if (levelButton) {
        event.preventDefault();
        const language = levelButton.dataset.wordLabLanguage === "en" ? "en" : "de";
        const level = Number(levelButton.dataset.wordLabLevel || 0);
        if (level && !levelButton.disabled) startLevel(language, level, { replay: completedSet(language).has(level) });
        return;
      }

      const choice = event.target.closest?.("[data-word-lab-choice]");
      if (choice) {
        const active = current();
        if (!active || active.answerLocked) return;
        active.selectedIndex = Number(choice.dataset.wordLabChoice);
        active.updatedAt = Date.now();
        app.saveState({ source: "word-lab-choice" });
        renderQuestion();
        return;
      }

      const back = event.target.closest?.("[data-word-lab-return]");
      if (back) {
        event.preventDefault();
        window.LifeRPGTrainingFocus?.exit?.({ reopen: false });
        openDialog(selectedLanguage);
      }
    });

    document.addEventListener("keydown", event => {
      if (!window.LifeRPGTrainingFocus?.isActive?.("word-lab")) return;
      const active = current();
      if (!active || active.completedAt) return;
      if (/^[1-4]$/.test(event.key) && !active.answerLocked) {
        event.preventDefault();
        active.selectedIndex = Number(event.key) - 1;
        app.saveState({ source: "word-lab-key-choice" });
        renderQuestion();
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (active.answerLocked) nextQuestion();
      else submitAnswer();
    });
  }

  function openDialog(language) {
    if (language === "de" || language === "en") selectedLanguage = language;
    render();
    if (els.dialog && !els.dialog.open) els.dialog.showModal();
  }

  function setLanguage(language, { persistChoice = false } = {}) {
    selectedLanguage = language === "en" ? "en" : "de";
    if (persistChoice) app.saveState({ source: "word-lab-language" });
    render();
  }

  function startLevel(language, level, { replay = false } = {}) {
    language = language === "en" ? "en" : "de";
    level = Number(level);
    const def = levelDef(language, level);
    if (!def) return;
    const allowed = level === 1 || completedSet(language).has(level) || completedSet(language).has(level - 1);
    if (!allowed) return;
    selectedLanguage = language;
    const existing = current(language);
    if (existing && !existing.completedAt && existing.level === level && Boolean(existing.replay) === Boolean(replay)) {
      render();
      enterFocus(existing);
      return;
    }
    state().journeys[language].active = {
      id: `word-lab-${language}-l${level}${replay ? "-replay" : ""}`,
      language,
      level,
      questionIndex: 0,
      attemptsByQuestion: Array(def.questions.length).fill(0),
      firstTryByQuestion: Array(def.questions.length).fill(null),
      responseTimesMs: Array(def.questions.length).fill(0),
      selectedIndex: null,
      answerLocked: false,
      lastCorrect: false,
      questionStartedAt: Date.now(),
      replay: Boolean(replay),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
    persist("word-lab-start");
    enterFocus(current(language));
  }

  function enterFocus(active = current()) {
    if (!active || !els.play || !window.LifeRPGTrainingFocus?.enter) return false;
    selectedLanguage = active.language;
    if (els.dialog?.open) els.dialog.close();
    if (!active.completedAt && !active.answerLocked) active.questionStartedAt = Date.now();
    app.saveState({ source: "word-lab-focus" });
    const def = levelDef(active.language, active.level);
    return window.LifeRPGTrainingFocus.enter({
      id: "word-lab",
      node: els.play,
      title: `${META[active.language].flag} ${META[active.language].label} · Level ${active.level}`,
      subtitle: active.completedAt ? "Level complete ✓" : def?.tierLabel || META[active.language].description,
      tone: "light",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function render() {
    renderGrowth();
    renderPaths();
    renderDaily();
    renderProgress();
    renderLevels();
    renderQuestion();
    syncFocusHeader();
  }

  function renderGrowth() {
    const deDone = journey("de").completedLevels.length;
    const enDone = journey("en").completedLevels.length;
    if (els.growthStats) els.growthStats.innerHTML = `<span><b>🇩🇪 ${deDone}/${TOTAL}</b> German</span><span><b>🇬🇧 ${enDone}/${TOTAL}</b> English</span><span><b>${deDone + enDone}/100</b> Word Lab</span>`;
    if (els.trainingStats) els.trainingStats.textContent = `🇩🇪 ${deDone}/50 · 🇬🇧 ${enDone}/50`;
    if (els.quickStatus) {
      const active = findActive();
      if (active) els.quickStatus.textContent = `Continue ${META[active.language].short} · Level ${active.level}`;
      else {
        const daily = dailySuggestion();
        els.quickStatus.textContent = `${META[daily].short} · Level ${nextLevel(daily) || TOTAL}`;
      }
    }
  }

  function renderPaths() {
    [["de", els.pathDe], ["en", els.pathEn]].forEach(([language, element]) => {
      if (!element) return;
      const s = stats(language);
      const done = journey(language).completedLevels.length;
      const accuracy = s.questionsAnswered ? Math.round((s.firstTryCorrect / s.questionsAnswered) * 100) : null;
      element.classList.toggle("active", selectedLanguage === language);
      element.setAttribute("aria-pressed", selectedLanguage === language ? "true" : "false");
      const progress = element.querySelector("[data-word-lab-path-progress]");
      const detail = element.querySelector("[data-word-lab-path-detail]");
      if (progress) progress.textContent = `${done}/${TOTAL}`;
      if (detail) detail.textContent = accuracy === null ? `Next: Level ${nextLevel(language) || TOTAL}` : `${accuracy}% first-try · Next Level ${nextLevel(language) || TOTAL}`;
    });
  }

  function renderDaily() {
    if (!els.daily) return;
    const language = dailySuggestion();
    const level = nextLevel(language);
    const meta = META[language];
    if (!level) {
      const other = language === "de" ? "en" : "de";
      const otherLevel = nextLevel(other);
      if (!otherLevel) {
        els.daily.innerHTML = `<div><small>DAILY WORD LAB</small><strong>Both Journeys complete 🌸</strong><span>Replay any level whenever you want; Dailies never create a streak obligation.</span></div>`;
        return;
      }
      els.daily.innerHTML = dailyMarkup(other, otherLevel);
      return;
    }
    els.daily.innerHTML = dailyMarkup(language, level);
  }

  function dailyMarkup(language, level) {
    const meta = META[language];
    return `<div class="word-lab-daily-copy-v314p"><small>DAILY WORD LAB · OPTIONAL</small><strong>${meta.flag} ${escapeHtml(meta.label)} · Level ${level}</strong><span>${escapeHtml(levelDef(language, level)?.tierLabel || meta.description)} · 5 questions</span></div><button class="primary-button" type="button" data-word-lab-daily-start="${language}">Start today's language training</button>`;
  }

  function dailySuggestion() {
    const deAt = Date.parse(journey("de").lastCompletedAt || "") || 0;
    const enAt = Date.parse(journey("en").lastCompletedAt || "") || 0;
    if (!nextLevel("de")) return "en";
    if (!nextLevel("en")) return "de";
    if (deAt !== enAt) return deAt < enAt ? "de" : "en";
    const now = new Date();
    return (now.getFullYear() + now.getMonth() + now.getDate()) % 2 === 0 ? "de" : "en";
  }

  function renderProgress() {
    if (!els.progress) return;
    const language = selectedLanguage;
    const done = journey(language).completedLevels.length;
    const next = nextLevel(language);
    const percent = Math.round((done / TOTAL) * 100);
    els.progress.innerHTML = `<div class="sudoku-progress-copy-v314h"><div><small>${META[language].accent} JOURNEY</small><strong>${done}/${TOTAL} complete · ${percent}%</strong></div><span>${next ? `Next: Level ${next}` : "Chapter 1 complete ✓"}</span></div><div class="sudoku-progress-track-v314h"><span style="width:${percent}%"></span></div>`;
  }

  function renderLevels() {
    if (!els.levels) return;
    const language = selectedLanguage;
    const done = completedSet(language);
    const next = nextLevel(language);
    if (els.mapTitle) els.mapTitle.textContent = `${META[language].label} · Levels 1–50`;
    if (els.mapCopy) els.mapCopy.textContent = language === "de" ? "Precision → register → professional & academic nuance." : "Natural fluency → collocations → argumentative & academic nuance.";
    els.levels.innerHTML = Array.from({ length: TOTAL }, (_, index) => {
      const level = index + 1;
      const complete = done.has(level);
      const unlocked = level === 1 || complete || done.has(level - 1);
      const active = current(language)?.level === level && !current(language)?.completedAt;
      const cls = [complete ? "complete" : "", active ? "active" : "", level === next ? "next" : "", !unlocked ? "locked" : ""].filter(Boolean).join(" ");
      const label = complete ? `✓ ${level}` : active ? `▶ ${level}` : !unlocked ? `🔒 ${level}` : String(level);
      return `<button type="button" class="word-lab-level-v314p ${cls}" data-word-lab-level="${level}" data-word-lab-language="${language}" ${unlocked ? "" : "disabled"} aria-label="${META[language].label} Level ${level}${complete ? ", completed" : !unlocked ? ", locked" : ""}">${label}</button>`;
    }).join("");
  }

  function renderQuestion() {
    const active = current();
    if (!els.play) return;
    if (!active) {
      els.play.classList.add("hidden");
      return;
    }
    els.play.classList.remove("hidden");
    const def = levelDef(active.language, active.level);
    const question = def?.questions?.[active.questionIndex];
    if (!question) return;

    if (active.completedAt) {
      renderCompletion(active);
      return;
    }

    els.result?.classList.add("hidden");
    if (els.meta) els.meta.innerHTML = `<span>${META[active.language].flag} ${escapeHtml(META[active.language].label)}</span><span>Level ${active.level} · ${escapeHtml(def.tierLabel)}</span><span>${active.replay ? "Replay" : "Journey"}</span>`;
    if (els.questionProgress) els.questionProgress.innerHTML = `<span>Question ${active.questionIndex + 1} / ${def.questions.length}</span><div><i style="width:${Math.round((active.questionIndex / def.questions.length) * 100)}%"></i></div>`;
    if (els.question) els.question.innerHTML = `<small>${escapeHtml(humanize(question.type))}</small><h3>${escapeHtml(question.prompt)}</h3>`;
    if (els.choices) {
      els.choices.innerHTML = question.options.map((option, index) => {
        const selected = active.selectedIndex === index;
        const correct = active.answerLocked && index === question.answer;
        const wrong = active.answerLocked && selected && index !== question.answer;
        const classes = [selected ? "selected" : "", correct ? "correct" : "", wrong ? "wrong" : ""].filter(Boolean).join(" ");
        return `<button type="button" class="word-lab-choice-v314p ${classes}" data-word-lab-choice="${index}" ${active.answerLocked ? "disabled" : ""}><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option)}</strong></button>`;
      }).join("");
    }
    if (els.form) els.form.classList.toggle("hidden", active.answerLocked);
    if (els.submit) els.submit.disabled = !Number.isInteger(active.selectedIndex);
    if (els.feedback) {
      if (!active.answerLocked) {
        els.feedback.className = "word-lab-feedback-v314p hidden";
        els.feedback.innerHTML = "";
      } else {
        const correct = active.lastCorrect;
        els.feedback.className = `word-lab-feedback-v314p ${correct ? "is-correct" : "is-wrong"}`;
        els.feedback.innerHTML = `<strong>${correct ? "✓ Exactly." : `Not quite · ${escapeHtml(question.options[question.answer])}`}</strong><span>${escapeHtml(question.explanation)}</span>`;
      }
    }
    if (els.next) {
      els.next.classList.toggle("hidden", !active.answerLocked);
      els.next.textContent = active.questionIndex >= def.questions.length - 1 ? "Finish level" : "Next question";
    }
    if (els.status) {
      const s = stats(active.language);
      els.status.textContent = s.questionsAnswered ? `${Math.round((s.firstTryCorrect / s.questionsAnswered) * 100)}% first-try accuracy overall · no speed-based rewards` : "Choose the most precise or natural option. Press 1–4 to select; Enter checks and continues.";
    }
  }

  function submitAnswer() {
    const active = current();
    if (!active || active.completedAt || active.answerLocked || !Number.isInteger(active.selectedIndex)) return;
    const question = levelDef(active.language, active.level)?.questions?.[active.questionIndex];
    if (!question) return;
    const wasFirstAttempt = Number(active.attemptsByQuestion[active.questionIndex] || 0) === 0;
    active.attemptsByQuestion[active.questionIndex] += 1;
    active.responseTimesMs[active.questionIndex] = Math.max(0, Date.now() - Number(active.questionStartedAt || Date.now()));
    active.answerLocked = true;
    active.lastCorrect = active.selectedIndex === question.answer;
    active.firstTryByQuestion[active.questionIndex] = wasFirstAttempt ? active.lastCorrect : active.firstTryByQuestion[active.questionIndex];
    active.updatedAt = Date.now();
    const s = stats(active.language);
    s.attempts += 1;
    s.questionsAnswered += 1;
    if (wasFirstAttempt && active.lastCorrect) s.firstTryCorrect += 1;
    persist("word-lab-answer");
  }

  function nextQuestion() {
    const active = current();
    if (!active || !active.answerLocked || active.completedAt) return;
    const def = levelDef(active.language, active.level);
    if (active.questionIndex >= def.questions.length - 1) {
      completeLevel(active);
      return;
    }
    active.questionIndex += 1;
    active.answerLocked = false;
    active.selectedIndex = null;
    active.lastCorrect = false;
    active.questionStartedAt = Date.now();
    active.updatedAt = Date.now();
    persist("word-lab-next");
  }

  function completeLevel(active) {
    const live = state().journeys[active.language].active;
    if (!live || live.completedAt || live.level !== active.level) return;
    const already = completedSet(active.language).has(active.level);
    live.completedAt = Date.now();
    live.updatedAt = live.completedAt;
    journey(active.language).lastCompletedAt = new Date(live.completedAt).toISOString();

    if (live.replay || already) {
      state().completed.push({ id: live.id, language: live.language, level: live.level, replay: true, completedAt: live.completedAt, rewardEventId: null });
      persist("word-lab-replay");
      return;
    }

    const reward = award(live);
    journey(active.language).completedLevels.push(live.level);
    journey(active.language).completedLevels = [...new Set(journey(active.language).completedLevels)].sort((a, b) => a - b);
    stats(active.language).levelsSolved += 1;
    live.rewardEventId = reward.eventId || null;
    state().completed.push({
      id: live.id,
      language: live.language,
      level: live.level,
      replay: false,
      completedAt: live.completedAt,
      rewardEventId: reward.eventId || null,
      reward: { xp: reward.xp, realmXP: reward.realmXP, statXP: reward.statXP, coins: reward.coins, storyEnergy: reward.storyEnergy }
    });
    state().completed = state().completed.slice(-500);
    persist("word-lab-complete");
  }

  function award(active) {
    const sourceId = `${active.language}-journey-l${active.level}`;
    const existing = (app.getState().rewardLedger?.events || []).find(event => event?.source === "word-lab-complete" && event?.sourceId === sourceId);
    if (existing) {
      return { eventId: existing.id, xp: Number(existing.xp || 0), realmXP: Number(existing.realmXP || 0), statXP: Number(existing.statXP || 0), coins: Number(existing.coins || 0), storyEnergy: Number(existing.storyEnergy || 0) };
    }
    const base = TIERS[tier(active.level)];
    const scale = REPEAT_SCALES[Math.min(todayCompletionCount(), REPEAT_SCALES.length - 1)];
    const firstTry = active.firstTryByQuestion.filter(Boolean).length;
    const reward = app.awardActivity({
      source: "word-lab-complete",
      sourceId,
      label: `${META[active.language].label} · Level ${active.level}`,
      realm: "Knowledge",
      capability: "knowledge",
      xp: Math.max(1, Math.round(base.xp * scale)),
      realmXP: Math.max(1, Math.round(base.xp * scale)),
      statXP: Math.max(1, Math.round(base.statXP * scale)),
      coins: Math.max(1, Math.round(base.coins * scale)),
      storyEnergyBase: floor2(base.story * scale),
      progressionRelevant: true,
      metadata: {
        wordLab: true,
        language: active.language,
        languageLabel: META[active.language].label,
        level: active.level,
        tier: tier(active.level),
        tierLabel: levelDef(active.language, active.level)?.tierLabel,
        questions: QUESTIONS_PER_LEVEL,
        firstTryCorrect: firstTry,
        firstTryAccuracy: Math.round((firstTry / QUESTIONS_PER_LEVEL) * 100),
        attempts: active.attemptsByQuestion.reduce((sum, value) => sum + Number(value || 0), 0),
        repeatScale: scale,
        speedReward: false
      }
    });
    return reward;
  }

  function renderCompletion(active) {
    const language = active.language;
    const firstTry = active.firstTryByQuestion.filter(Boolean).length;
    const accuracy = Math.round((firstTry / QUESTIONS_PER_LEVEL) * 100);
    const completion = [...state().completed].reverse().find(item => item.language === language && item.level === active.level && item.completedAt === active.completedAt);
    const reward = completion?.reward || rewardFromEvent(active.rewardEventId);
    const next = nextLevel(language);
    if (els.meta) els.meta.innerHTML = `<span>${META[language].flag} ${escapeHtml(META[language].label)}</span><span>Level ${active.level} complete</span><span>${accuracy}% first-try</span>`;
    if (els.questionProgress) els.questionProgress.innerHTML = `<span>5 / 5 questions</span><div><i style="width:100%"></i></div>`;
    if (els.question) els.question.innerHTML = `<small>LEVEL COMPLETE</small><h3>${active.replay ? "Replay complete." : `${META[language].label} · Level ${active.level} cleared.`}</h3>`;
    if (els.choices) els.choices.innerHTML = "";
    els.form?.classList.add("hidden");
    els.feedback?.classList.add("hidden");
    els.next?.classList.add("hidden");
    if (els.result) {
      els.result.className = "training-result-v314o word-lab-result-v314p";
      els.result.innerHTML = active.replay
        ? `<strong>↻ Practice complete</strong><p>Replays strengthen recall but do not pay a second first-completion reward.</p><div class="dialog-actions"><button class="secondary-button" type="button" data-word-lab-return>Back to Word Lab</button></div>`
        : `<strong>🌸 Level ${active.level} complete · ${accuracy}% first-try</strong><p>${reward ? `+${reward.xp} XP · +${reward.realmXP} Knowledge XP · +${reward.statXP} Knowledge Capability XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙` : "Rewards saved."}</p><div class="dialog-actions">${next ? `<button class="primary-button" type="button" data-word-lab-level="${next}" data-word-lab-language="${language}">Next Level · ${next}</button>` : ""}<button class="secondary-button" type="button" data-word-lab-return>Back to Word Lab</button></div>`;
    }
    if (els.status) els.status.textContent = active.replay ? "Replay complete." : "First-completion rewards saved to your Activity & Reward Ledger.";
  }

  function rewardFromEvent(eventId) {
    if (!eventId) return null;
    const event = (app.getState().rewardLedger?.events || []).find(item => item?.id === eventId);
    if (!event) return null;
    return { xp: Number(event.xp || 0), realmXP: Number(event.realmXP || 0), statXP: Number(event.statXP || 0), coins: Number(event.coins || 0), storyEnergy: Number(event.storyEnergy || 0) };
  }

  function todayCompletionCount() {
    const key = localDateKey(new Date());
    return (app.getState().rewardLedger?.events || []).filter(event => event?.source === "word-lab-complete" && !event.duplicate && localDateKey(new Date(event.at || 0)) === key).length;
  }

  function syncFocusHeader() {
    const active = current();
    if (!active || !window.LifeRPGTrainingFocus?.isActive?.("word-lab")) return;
    const def = levelDef(active.language, active.level);
    window.LifeRPGTrainingFocus.update({
      title: `${META[active.language].flag} ${META[active.language].label} · Level ${active.level}`,
      subtitle: active.completedAt ? "Level complete ✓" : def?.tierLabel || META[active.language].description
    });
  }

  function localDateKey(date) { if (!date || Number.isNaN(date.getTime())) return ""; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function floor2(value) { return Math.floor(Number(value || 0) * 100) / 100; }
  function byId(id) { return document.getElementById(id); }
  function humanize(value) { return String(value || "").replace(/[-_]+/g, " ").replace(/\b\w/g, char => char.toUpperCase()); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

  window.LifeRPGWordLab = {
    version: VERSION,
    open: language => openDialog(language),
    startDaily: () => {
      const language = dailySuggestion();
      startLevel(language, nextLevel(language) || TOTAL, { replay: !nextLevel(language) });
    },
    getProgress: () => ({
      de: { completed: journey("de").completedLevels.length, total: TOTAL, next: nextLevel("de"), active: current("de")?.level || null },
      en: { completed: journey("en").completedLevels.length, total: TOTAL, next: nextLevel("en"), active: current("en")?.level || null }
    })
  };
})();
