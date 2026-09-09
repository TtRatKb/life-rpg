(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const LEVELS = Array.isArray(window.LIFE_RPG_NUMBER_SENSE_LEVELS) ? window.LIFE_RPG_NUMBER_SENSE_LEVELS : [];
  if (!app?.getState || !app?.awardActivity || !LEVELS.length) return;

  const VERSION = "0.31.4l";
  const SCHEMA = 1;
  const TOTAL = 50;
  const REPEAT_SCALES = [1, 0.75, 0.5, 0.35];
  const TIERS = {
    1: { label: "Foundations", icon: "🌱", xp: 18, statXP: 12, coins: 10, story: 0.5 },
    2: { label: "Flexible Arithmetic", icon: "🌿", xp: 22, statXP: 14, coins: 13, story: 0.7 },
    3: { label: "Number Sense", icon: "✦", xp: 26, statXP: 17, coins: 16, story: 0.95 },
    4: { label: "Applied Fluency", icon: "◇", xp: 30, statXP: 20, coins: 19, story: 1.2 },
    5: { label: "Fluency Challenge", icon: "⚡", xp: 34, statXP: 23, coins: 22, story: 1.45 }
  };

  const els = {
    dialog: byId("numberSenseDialog"),
    close: byId("numberSenseClose"),
    daily: byId("numberSenseDailyCard"),
    progress: byId("numberSenseJourneyProgress"),
    levels: byId("numberSenseLevelGrid"),
    lessonMeta: byId("numberSenseLessonMeta"),
    questionProgress: byId("numberSenseQuestionProgress"),
    card: byId("numberSenseQuestionCard"),
    feedback: byId("numberSenseFeedback"),
    form: byId("numberSenseAnswerForm"),
    input: byId("numberSenseAnswer"),
    choices: byId("numberSenseChoices"),
    submit: byId("numberSenseSubmit"),
    next: byId("numberSenseNext"),
    hint: byId("numberSenseHintButton"),
    status: byId("numberSenseStatus"),
    growthStats: byId("numberSenseGrowthStats"),
    trainingStats: byId("trainingGroundsNumberSenseStatus"),
    quickStatus: byId("numberSenseQuickStatus")
  };

  init();

  function init() {
    ensureState();
    bind();
    render();
    window.addEventListener("life-rpg:render", render);
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      journey: { completedLevels: [], active: null },
      stats: { levelsSolved: 0, questionsSolved: 0, attempts: 0, firstTryCorrect: 0 },
      completed: []
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.numberSense || typeof root.numberSense !== "object" || Array.isArray(root.numberSense)) root.numberSense = defaults();
    const s = root.numberSense;
    s.schemaVersion = SCHEMA;
    if (!s.journey || typeof s.journey !== "object") s.journey = defaults().journey;
    if (!s.stats || typeof s.stats !== "object") s.stats = defaults().stats;
    s.completed = Array.isArray(s.completed) ? s.completed.slice(-300) : [];
    s.journey.completedLevels = [...new Set((s.journey.completedLevels || []).map(Number).filter(level => level >= 1 && level <= TOTAL))].sort((a, b) => a - b);
    s.journey.active = normalizeActive(s.journey.active);
    ["levelsSolved", "questionsSolved", "attempts", "firstTryCorrect"].forEach(key => s.stats[key] = Math.max(0, Number(s.stats[key] || 0)));
    return s;
  }

  function state() { return ensureState(); }
  function levelDef(level) { return LEVELS.find(item => Number(item.level) === Number(level)) || null; }
  function tier(level) { return Math.min(5, Math.max(1, Math.ceil(Number(level || 1) / 10))); }
  function completedSet() { return new Set(state().journey.completedLevels); }
  function nextLevel() { for (let level = 1; level <= TOTAL; level += 1) if (!completedSet().has(level)) return level; return null; }
  function current() { return state().journey.active; }

  function normalizeActive(active) {
    if (!active || typeof active !== "object") return null;
    const def = levelDef(active.level);
    if (!def) return null;
    const questionCount = def.questions.length;
    const attemptsByQuestion = Array.from({ length: questionCount }, (_, index) => Math.max(0, Number(active.attemptsByQuestion?.[index] || 0)));
    const solvedQuestions = Array.from({ length: questionCount }, (_, index) => Boolean(active.solvedQuestions?.[index]));
    return {
      ...active,
      id: active.id || `number-sense-l${def.level}`,
      level: def.level,
      questionIndex: Math.max(0, Math.min(questionCount - 1, Number(active.questionIndex || 0))),
      attemptsByQuestion,
      solvedQuestions,
      replay: Boolean(active.replay),
      answerLocked: Boolean(active.answerLocked),
      lastCorrect: active.lastCorrect === true,
      createdAt: Number(active.createdAt || Date.now()),
      updatedAt: Number(active.updatedAt || active.createdAt || Date.now()),
      completedAt: active.completedAt ? Number(active.completedAt) : null,
      rewardEventId: active.rewardEventId || null
    };
  }

  function persist(source = "number-sense") {
    app.saveState({ source });
    render();
    app.renderAll?.();
  }

  function bind() {
    els.close?.addEventListener("click", () => els.dialog?.open && els.dialog.close());
    els.form?.addEventListener("submit", event => {
      event.preventDefault();
      submitCurrentAnswer();
    });
    els.next?.addEventListener("click", nextQuestion);
    els.hint?.addEventListener("click", showHint);

    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-number-sense-open]");
      if (open) { event.preventDefault(); openDialog(); return; }
      const daily = event.target.closest?.("[data-number-sense-daily-start]");
      if (daily) { event.preventDefault(); startLevel(nextLevel() || TOTAL, { replay: !nextLevel() }); return; }
      const level = event.target.closest?.("[data-number-sense-level]");
      if (level) {
        event.preventDefault();
        const value = Number(level.dataset.numberSenseLevel || 0);
        if (value && !level.disabled) startLevel(value, { replay: completedSet().has(value) });
        return;
      }
      const choice = event.target.closest?.("[data-number-sense-choice]");
      if (choice) {
        event.preventDefault();
        if (current()?.answerLocked) return;
        els.choices?.querySelectorAll("[data-number-sense-choice]").forEach(button => button.classList.remove("selected"));
        choice.classList.add("selected");
        choice.dataset.selected = "true";
        els.choices?.querySelectorAll("[data-number-sense-choice]").forEach(button => { if (button !== choice) delete button.dataset.selected; });
        window.setTimeout(submitCurrentAnswer, 80);
      }
    });
  }

  function openDialog() {
    render();
    if (els.dialog && !els.dialog.open) els.dialog.showModal();
    window.setTimeout(() => els.input?.focus(), 60);
  }

  function startLevel(level, { replay = false } = {}) {
    const def = levelDef(level);
    if (!def) return;
    const allowed = level <= 1 || completedSet().has(level) || completedSet().has(level - 1);
    if (!allowed) return;
    state().journey.active = {
      id: `number-sense-l${level}${replay ? "-replay" : ""}`,
      level,
      questionIndex: 0,
      attemptsByQuestion: Array(def.questions.length).fill(0),
      solvedQuestions: Array(def.questions.length).fill(false),
      replay: Boolean(replay),
      answerLocked: false,
      lastCorrect: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
    persist("number-sense-start");
    openDialog();
  }

  function render() {
    renderGrowth();
    renderDaily();
    renderProgress();
    renderLevels();
    renderQuestion();
  }

  function renderGrowth() {
    const s = state();
    const next = nextLevel();
    const accuracy = s.stats.attempts > 0 ? Math.round((s.stats.firstTryCorrect / Math.max(1, s.stats.questionsSolved)) * 100) : 0;
    if (els.growthStats) els.growthStats.innerHTML = `<span><b>${s.journey.completedLevels.length}/${TOTAL}</b> Journey</span><span><b>${s.stats.questionsSolved}</b> questions</span><span>${s.stats.questionsSolved ? `${accuracy}% first-try` : "No speed pressure"}</span>`;
    if (els.trainingStats) els.trainingStats.textContent = next ? `Level ${next} / ${TOTAL}` : `${TOTAL}/${TOTAL} complete`;
    if (els.quickStatus) {
      const active = s.journey.active && !s.journey.active.completedAt ? s.journey.active : null;
      els.quickStatus.textContent = active ? `Continue Level ${active.level} · question ${active.questionIndex + 1}/6` : next ? `Journey ${s.journey.completedLevels.length}/${TOTAL} · next Level ${next}` : `Journey ${TOTAL}/${TOTAL} complete`;
    }
  }

  function renderDaily() {
    if (!els.daily) return;
    const next = nextLevel();
    if (!next) {
      els.daily.innerHTML = `<div><small>DAILY NUMBER SENSE</small><strong>Chapter 1 complete 🏆</strong><span>Replay any level whenever you want. Replays do not duplicate rewards.</span></div><button type="button" data-number-sense-level="50">Replay Level 50</button>`;
      return;
    }
    const def = levelDef(next);
    const done = todayCompletionCount() > 0;
    const active = current()?.level === next && !current()?.completedAt;
    els.daily.innerHTML = `<div><small>DAILY NUMBER SENSE</small><strong>${done ? "Today's number training is already done ✓" : `Continue your Journey · Level ${next}`}</strong><span>${TIERS[tier(next)].label} · ${escapeHtml(def.focus)}. Accuracy matters; speed does not.</span></div><button type="button" data-number-sense-daily-start>${active ? "Continue" : "Start"} Level ${next}</button>`;
  }

  function renderProgress() {
    if (!els.progress) return;
    const completed = state().journey.completedLevels.length;
    const percent = Math.round(completed / TOTAL * 100);
    els.progress.innerHTML = `<div><span><strong>${completed}/${TOTAL}</strong> completed</span><span>${percent}%</span></div><div class="bar"><span style="width:${percent}%"></span></div>`;
  }

  function renderLevels() {
    if (!els.levels) return;
    const set = completedSet();
    const active = current();
    els.levels.innerHTML = Array.from({ length: TOTAL }, (_, index) => index + 1).map(level => {
      const done = set.has(level);
      const unlocked = done || level === 1 || set.has(level - 1);
      const isActive = active?.level === level && !active?.completedAt;
      return `<button type="button" data-number-sense-level="${level}" ${unlocked ? "" : "disabled"} class="${done ? "done" : ""} ${isActive ? "active" : ""}"><span>${done ? "✓" : isActive ? "▶" : unlocked ? level : "🔒"}</span><small>${TIERS[tier(level)].icon}</small></button>`;
    }).join("");
  }

  function renderQuestion() {
    const active = current();
    if (!active) {
      if (els.lessonMeta) els.lessonMeta.innerHTML = `<strong>Chapter 1 · Levels 1–50</strong><span>Six short questions per level. Learn the strategy, not just the answer.</span>`;
      if (els.questionProgress) els.questionProgress.innerHTML = `<span>Ready when you are</span><span>0 / 6</span>`;
      if (els.card) els.card.innerHTML = `<div class="number-sense-empty-v314l"><span>🔢</span><strong>Your next mental-math level is waiting.</strong><p>No timer, no speed bonus. Work mentally, learn the shortcut, and let fluency build over time.</p><button class="primary-button" type="button" data-number-sense-daily-start>Start Level ${nextLevel() || TOTAL}</button></div>`;
      hideAnswerUi();
      updateStatus("Choose your next Journey level to begin.");
      return;
    }

    const def = levelDef(active.level);
    const question = def.questions[active.questionIndex];
    const attempts = Number(active.attemptsByQuestion[active.questionIndex] || 0);
    const solved = Boolean(active.solvedQuestions[active.questionIndex]);
    if (els.lessonMeta) els.lessonMeta.innerHTML = `<strong>Level ${active.level} · ${escapeHtml(def.title)}</strong><span>${escapeHtml(def.focus)}</span>`;
    if (els.questionProgress) {
      const solvedCount = active.solvedQuestions.filter(Boolean).length;
      els.questionProgress.innerHTML = `<span>Question ${active.questionIndex + 1} of ${def.questions.length}</span><span>${solvedCount}/${def.questions.length} solved</span>`;
    }
    if (els.card) {
      els.card.innerHTML = `<small>${TIERS[tier(active.level)].icon} ${TIERS[tier(active.level)].label.toUpperCase()}</small><strong>${escapeHtml(question.prompt)}</strong><p>Do it mentally if you can. Paper is allowed if a later level genuinely needs it — this is training, not a purity test.</p>`;
    }

    if (solved || active.answerLocked) {
      showSolvedFeedback(question, attempts);
      return;
    }

    if (els.feedback) {
      els.feedback.className = "number-sense-feedback-v314l hidden";
      els.feedback.innerHTML = "";
    }
    if (question.type === "choice") {
      if (els.form) els.form.classList.add("hidden");
      if (els.choices) {
        els.choices.classList.remove("hidden");
        els.choices.innerHTML = question.choices.map(choice => `<button type="button" data-number-sense-choice="${escapeAttr(choice)}">${escapeHtml(choice)}</button>`).join("");
      }
      if (els.submit) els.submit.textContent = "Check answer";
    } else {
      if (els.choices) { els.choices.classList.add("hidden"); els.choices.innerHTML = ""; }
      if (els.form) els.form.classList.remove("hidden");
      if (els.input) { els.input.value = ""; els.input.disabled = false; els.input.placeholder = question.unit === "€" ? "Number, e.g. 6" : "Your answer"; }
      if (els.submit) { els.submit.disabled = false; els.submit.textContent = "Check answer"; }
    }
    els.next?.classList.add("hidden");
    els.hint?.classList.toggle("hidden", attempts === 0);
    updateStatus(attempts ? `${attempts} attempt${attempts === 1 ? "" : "s"} on this question. Use the hint if useful.` : "Take your time. No reward depends on speed.");
  }

  function hideAnswerUi() {
    els.form?.classList.add("hidden");
    els.choices?.classList.add("hidden");
    els.next?.classList.add("hidden");
    els.hint?.classList.add("hidden");
    els.feedback?.classList.add("hidden");
  }

  function submitCurrentAnswer() {
    const active = current();
    if (!active || active.completedAt || active.answerLocked) return;
    const def = levelDef(active.level);
    const question = def.questions[active.questionIndex];
    let given;
    if (question.type === "choice") {
      given = els.choices?.querySelector("[data-selected='true']")?.dataset.numberSenseChoice;
      if (given === undefined) { app.showToast?.("Choose an answer first."); return; }
    } else {
      given = els.input?.value;
      if (!String(given ?? "").trim()) { app.showToast?.("Enter an answer first."); return; }
    }

    const firstAttempt = Number(active.attemptsByQuestion[active.questionIndex] || 0) === 0;
    active.attemptsByQuestion[active.questionIndex] += 1;
    state().stats.attempts += 1;
    const correct = answerIsCorrect(question, given);
    active.updatedAt = Date.now();

    if (!correct) {
      app.saveState({ source: "number-sense-attempt" });
      if (els.feedback) {
        els.feedback.className = "number-sense-feedback-v314l is-wrong";
        els.feedback.innerHTML = `<strong>Not quite.</strong><span>${escapeHtml(question.hint)}</span>`;
      }
      if (question.type === "number" && els.input) { els.input.select(); els.input.focus(); }
      if (question.type === "choice") els.choices?.querySelectorAll("[data-number-sense-choice]").forEach(button => { button.classList.remove("selected"); delete button.dataset.selected; });
      els.hint?.classList.remove("hidden");
      updateStatus("Try again. Wrong attempts do not reduce XP, Coins or Story Energy.");
      return;
    }

    active.solvedQuestions[active.questionIndex] = true;
    active.answerLocked = true;
    active.lastCorrect = true;
    state().stats.questionsSolved += 1;
    if (firstAttempt) state().stats.firstTryCorrect += 1;
    app.saveState({ source: "number-sense-question" });
    showSolvedFeedback(question, active.attemptsByQuestion[active.questionIndex]);
  }

  function answerIsCorrect(question, raw) {
    if (question.type === "choice") return String(raw) === String(question.answer);
    const normalized = String(raw ?? "")
      .trim()
      .replace(/€/g, "")
      .replace(/\s+/g, "")
      .replace(/,(?=\d)/g, ".");
    const value = Number(normalized);
    if (!Number.isFinite(value)) return false;
    const expected = Number(question.answer);
    const tolerance = Math.max(0, Number(question.tolerance || 0));
    return Math.abs(value - expected) <= tolerance + 1e-9;
  }

  function showSolvedFeedback(question, attempts) {
    if (els.form) els.form.classList.add("hidden");
    if (els.choices) els.choices.classList.add("hidden");
    if (els.feedback) {
      els.feedback.className = "number-sense-feedback-v314l is-correct";
      els.feedback.innerHTML = `<strong>✓ Correct${attempts === 1 ? " on the first try" : ""}</strong><span><b>Strategy:</b> ${escapeHtml(question.strategy)}</span>`;
    }
    els.hint?.classList.add("hidden");
    if (els.next) {
      els.next.classList.remove("hidden");
      const active = current();
      const def = levelDef(active.level);
      els.next.textContent = active.questionIndex >= def.questions.length - 1 ? "Finish level" : "Next question";
    }
    updateStatus("The strategy matters more than the timer. Notice the shortcut before moving on.");
  }

  function showHint() {
    const active = current();
    if (!active || active.completedAt) return;
    const question = levelDef(active.level)?.questions?.[active.questionIndex];
    if (!question || !els.feedback) return;
    els.feedback.className = "number-sense-feedback-v314l is-hint";
    els.feedback.innerHTML = `<strong>Hint</strong><span>${escapeHtml(question.hint)}</span>`;
  }

  function nextQuestion() {
    const active = current();
    if (!active || !active.answerLocked) return;
    const def = levelDef(active.level);
    if (active.questionIndex >= def.questions.length - 1) {
      completeLevel(active);
      return;
    }
    active.questionIndex += 1;
    active.answerLocked = false;
    active.lastCorrect = false;
    active.updatedAt = Date.now();
    persist("number-sense-next");
    window.setTimeout(() => els.input?.focus(), 40);
  }

  function completeLevel(active) {
    const already = completedSet().has(active.level);
    active.completedAt = Date.now();
    active.updatedAt = active.completedAt;
    if (active.replay || already) {
      const level = active.level;
      state().completed.push({ id: active.id, level, replay: true, completedAt: active.completedAt, rewardEventId: null });
      state().journey.active = null;
      persist("number-sense-replay");
      app.showToast?.(`↻ Number Sense Level ${level} replay complete · no duplicate rewards`);
      return;
    }
    const reward = award(active);
    state().journey.completedLevels.push(active.level);
    state().journey.completedLevels = [...new Set(state().journey.completedLevels)].sort((a, b) => a - b);
    state().stats.levelsSolved += 1;
    state().completed.push({
      id: active.id,
      level: active.level,
      replay: false,
      completedAt: active.completedAt,
      rewardEventId: reward.eventId || null,
      reward: { xp: reward.xp, realmXP: reward.realmXP, statXP: reward.statXP, coins: reward.coins, storyEnergy: reward.storyEnergy }
    });
    state().completed = state().completed.slice(-300);
    const completedLevel = active.level;
    state().journey.active = null;
    persist("number-sense-complete");
    const next = nextLevel();
    app.showToast?.(`🔢 Level ${completedLevel} complete · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙${next ? ` · Level ${next} unlocked` : " · Chapter 1 complete!"}`);
  }

  function award(active) {
    const sourceId = `journey-l${active.level}`;
    const root = app.getState();
    const existing = (root.rewardLedger?.events || []).find(event => event?.source === "number-sense-complete" && event?.sourceId === sourceId);
    if (existing) {
      active.rewardEventId = existing.id;
      return { eventId: existing.id, xp: Number(existing.xp || 0), realmXP: Number(existing.realmXP || 0), statXP: Number(existing.statXP || 0), coins: Number(existing.coins || 0), storyEnergy: Number(existing.storyEnergy || 0) };
    }
    const meta = TIERS[tier(active.level)];
    const scale = REPEAT_SCALES[Math.min(todayCompletionCount(), REPEAT_SCALES.length - 1)];
    const reward = app.awardActivity({
      source: "number-sense-complete",
      sourceId,
      label: `Number Sense Journey · Level ${active.level}`,
      realm: "Knowledge",
      capability: "knowledge",
      xp: Math.max(1, Math.round(meta.xp * scale)),
      realmXP: Math.max(1, Math.round(meta.xp * scale)),
      statXP: Math.max(1, Math.round(meta.statXP * scale)),
      coins: Math.max(1, Math.round(meta.coins * scale)),
      storyEnergyBase: floor2(meta.story * scale),
      progressionRelevant: true,
      metadata: {
        numberSense: true,
        mode: "journey",
        level: active.level,
        tier: tier(active.level),
        questions: levelDef(active.level)?.questions?.length || 6,
        attempts: active.attemptsByQuestion.reduce((sum, value) => sum + Number(value || 0), 0),
        repeatScale: scale,
        speedReward: false
      }
    });
    active.rewardEventId = reward.eventId || null;
    return reward;
  }

  function todayCompletionCount() {
    const key = localDateKey(new Date());
    return (app.getState().rewardLedger?.events || []).filter(event => event?.source === "number-sense-complete" && !event.duplicate && localDateKey(new Date(event.at || 0)) === key).length;
  }

  function updateStatus(text) { if (els.status) els.status.textContent = text; }
  function localDateKey(date) { if (!date || Number.isNaN(date.getTime())) return ""; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  function floor2(value) { return Math.floor(Number(value || 0) * 100) / 100; }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
  function escapeAttr(value) { return escapeHtml(value); }

  window.LifeRPGNumberSense = {
    version: VERSION,
    open: openDialog,
    startNext: () => startLevel(nextLevel() || TOTAL, { replay: !nextLevel() }),
    getProgress: () => ({ completed: state().journey.completedLevels.length, total: TOTAL, next: nextLevel(), active: current()?.level || null, stats: { ...state().stats } })
  };
})();
