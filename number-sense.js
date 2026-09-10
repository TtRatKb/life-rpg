(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const LEVELS = Array.isArray(window.LIFE_RPG_NUMBER_SENSE_LEVELS) ? window.LIFE_RPG_NUMBER_SENSE_LEVELS : [];
  if (!app?.getState || !app?.awardActivity || !LEVELS.length) return;

  const VERSION = "0.31.4z";
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
    play: byId("numberSensePlayPanel"),
    lessonMeta: byId("numberSenseLessonMeta"),
    questionProgress: byId("numberSenseQuestionProgress"),
    pace: byId("numberSensePace"),
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
  window.setInterval(() => {
    const active = current();
    if (!active || active.completedAt || active.answerLocked || !window.LifeRPGTrainingFocus?.isActive?.("number-sense")) return;
    const question = levelDef(active.level)?.questions?.[active.questionIndex];
    if (question) renderPace(active, question);
  }, 250);

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
      stats: { levelsSolved: 0, questionsSolved: 0, attempts: 0, firstTryCorrect: 0, timedQuestions: 0, totalResponseMs: 0 },
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
    ["levelsSolved", "questionsSolved", "attempts", "firstTryCorrect", "timedQuestions", "totalResponseMs"].forEach(key => s.stats[key] = Math.max(0, Number(s.stats[key] || 0)));
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
      responseTimesMs: Array.from({ length: questionCount }, (_, index) => Math.max(0, Number(active.responseTimesMs?.[index] || 0))),
      questionStartedAt: Number(active.questionStartedAt || Date.now()),
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
    els.next?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); nextQuestion(); });
    els.hint?.addEventListener("click", showHint);
    document.addEventListener("keydown", event => {
      if (event.key !== "Enter" || !window.LifeRPGTrainingFocus?.isActive?.("number-sense")) return;
      const active = current();
      if (!active || active.completedAt) return;
      if (active.answerLocked) { event.preventDefault(); nextQuestion(); return; }
      if (document.activeElement === els.input && !els.form?.classList.contains("hidden")) { event.preventDefault(); submitCurrentAnswer(); }
    });

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
      const returnButton = event.target.closest?.("[data-number-sense-return]");
      if (returnButton) { event.preventDefault(); window.LifeRPGTrainingFocus?.exit?.({ reopen: false }); openDialog(); return; }
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
    const existing = current();
    if (existing && !existing.completedAt && existing.level === level && Boolean(existing.replay) === Boolean(replay)) {
      render();
      enterFocus(existing);
      return;
    }
    state().journey.active = {
      id: `number-sense-l${level}${replay ? "-replay" : ""}`,
      level,
      questionIndex: 0,
      attemptsByQuestion: Array(def.questions.length).fill(0),
      solvedQuestions: Array(def.questions.length).fill(false),
      responseTimesMs: Array(def.questions.length).fill(0),
      questionStartedAt: Date.now(),
      replay: Boolean(replay),
      answerLocked: false,
      lastCorrect: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
    persist("number-sense-start");
    enterFocus(current());
  }

  function render() {
    renderGrowth();
    renderDaily();
    renderProgress();
    renderLevels();
    renderQuestion();
    syncFocusHeader();
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
      els.daily.innerHTML = `<div><small>DAILY NUMBER SENSE</small><strong>Chapter 1 complete 🏆</strong><span>Replay any level whenever you want. A first replay on a new day can still keep the positive Daily streak going.</span><em class="training-streak-line-v314z">${escapeHtml(window.LifeRPGDailyStreaks?.shortLabel?.("numberSense") || "Daily consistency bonus ready")}</em></div><button type="button" data-number-sense-level="50">Replay Level 50</button>`;
      return;
    }
    const def = levelDef(next);
    const done = todayCompletionCount() > 0;
    const active = current()?.level === next && !current()?.completedAt;
    els.daily.innerHTML = `<div><small>DAILY NUMBER SENSE</small><strong>${done ? "Today's number training is already done ✓" : `Continue your Journey · Level ${next}`}</strong><span>${TIERS[tier(next)].label} · ${escapeHtml(def.focus)}. Accuracy matters; speed does not. Missing a day never removes rewards.</span><em class="training-streak-line-v314z">${escapeHtml(window.LifeRPGDailyStreaks?.shortLabel?.("numberSense") || "Daily consistency bonus ready")}</em></div><button type="button" data-number-sense-daily-start>${active ? "Continue" : "Start"} Level ${next}</button>`;
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
      if (els.pace) els.pace.innerHTML = `<span>Fluency timing appears while you solve.</span><strong>No speed rewards.</strong>`;
      if (els.card) els.card.innerHTML = `<div class="number-sense-empty-v314l"><span>🔢</span><strong>Your next mental-math level is waiting.</strong><p>No timer, no speed bonus. Work mentally, learn the shortcut, and let fluency build over time.</p><button class="primary-button" type="button" data-number-sense-daily-start>Start Level ${nextLevel() || TOTAL}</button></div>`;
      hideAnswerUi();
      updateStatus("Choose your next Journey level to begin.");
      return;
    }

    const def = levelDef(active.level);
    if (active.completedAt) {
      const event = active.rewardEventId ? (app.getState().rewardLedger?.events || []).find(item => item?.id === active.rewardEventId) : null;
      const next = nextLevel();
      const avg = active.responseTimesMs?.filter(Boolean) || [];
      const avgSec = avg.length ? avg.reduce((sum, ms) => sum + ms, 0) / avg.length / 1000 : 0;
      if (els.lessonMeta) els.lessonMeta.innerHTML = `<strong>Level ${active.level} complete ✓</strong><span>${escapeHtml(def.title)}</span>`;
      if (els.questionProgress) els.questionProgress.innerHTML = `<span>All ${def.questions.length} questions solved</span><span>${active.replay ? "Replay" : "Journey"}</span>`;
      if (els.pace) els.pace.innerHTML = `<span>Average response pace</span><strong>${avgSec ? `${avgSec.toFixed(1)}s` : "—"} · feedback only</strong>`;
      if (els.card) els.card.innerHTML = `<div class="number-sense-empty-v314l"><span>✓</span><strong>Level ${active.level} complete.</strong><p>${active.replay || !event ? "Replay complete — no duplicate reward." : next ? `Your rewards are saved and Level ${next} is unlocked.` : "Chapter 1 is complete."}</p>${event ? `<div class="training-result-rewards-v314o"><span>+${Number(event.xp||0)} XP</span><span>+${Number(event.realmXP||0)} Knowledge XP</span><span>+${Number(event.statXP||0)} Number Sense XP</span><span>+${app.formatEnergy?.(Number(event.storyEnergy||0)) ?? Number(event.storyEnergy||0)} Story Energy</span><span>+${Number(event.coins||0)} Coins</span></div>` : ""}<div class="training-result-actions-v314o">${next ? `<button class="primary-button" data-number-sense-level="${next}" type="button">Start Level ${next}</button>` : ""}<button class="secondary-button" data-number-sense-return type="button">Back to Number Sense Journey</button></div></div>`;
      hideAnswerUi();
      updateStatus("Level complete. Pace is shown only as personal fluency feedback; it never changes rewards.");
      return;
    }
    const question = def.questions[active.questionIndex];
    const attempts = Number(active.attemptsByQuestion[active.questionIndex] || 0);
    const solved = Boolean(active.solvedQuestions[active.questionIndex]);
    if (els.lessonMeta) els.lessonMeta.innerHTML = `<strong>Level ${active.level} · ${escapeHtml(def.title)}</strong><span>${escapeHtml(def.focus)}</span>`;
    if (els.questionProgress) {
      const solvedCount = active.solvedQuestions.filter(Boolean).length;
      els.questionProgress.innerHTML = `<span>Question ${active.questionIndex + 1} of ${def.questions.length}</span><span>${solvedCount}/${def.questions.length} solved</span>`;
    }
    renderPace(active, question);
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
    const liveState = app.getState().numberSense;
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
    liveState.stats.attempts += 1;
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

    const responseMs = Math.max(250, Date.now() - Number(active.questionStartedAt || Date.now()));
    active.responseTimesMs[active.questionIndex] = responseMs;
    liveState.stats.timedQuestions += 1;
    liveState.stats.totalResponseMs += responseMs;
    active.solvedQuestions[active.questionIndex] = true;
    active.answerLocked = true;
    active.lastCorrect = true;
    liveState.stats.questionsSolved += 1;
    if (firstAttempt) liveState.stats.firstTryCorrect += 1;
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
      els.next.setAttribute("data-number-sense-next", "true");
      const active = current();
      const def = levelDef(active.level);
      els.next.textContent = active.questionIndex >= def.questions.length - 1 ? "Finish level" : "Next question";
    }
    const activeNow = current();
    const ms = Number(activeNow?.responseTimesMs?.[activeNow.questionIndex] || 0);
    const target = softTargetSeconds(question, activeNow?.level || 1);
    updateStatus(ms ? `Correct in ${(ms/1000).toFixed(1)}s · gentle target around ${target.label}. Notice the strategy before moving on; rewards do not depend on speed.` : "Notice the shortcut before moving on. Rewards do not depend on speed.");
  }

  function enterFocus(active = current()) {
    if (!active || !els.play || !window.LifeRPGTrainingFocus?.enter) return false;
    if (els.dialog?.open) els.dialog.close();
    if (!active.completedAt && !active.answerLocked) active.questionStartedAt = Date.now();
    app.saveState({ source: "number-sense-focus" });
    const def = levelDef(active.level);
    return window.LifeRPGTrainingFocus.enter({
      id: "number-sense", node: els.play, title: `Number Sense · Level ${active.level}`, subtitle: def?.focus || "Mental math & estimation", tone: "light",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function syncFocusHeader() {
    const active = current();
    if (!active || !window.LifeRPGTrainingFocus?.isActive?.("number-sense")) return;
    const def = levelDef(active.level);
    window.LifeRPGTrainingFocus.update({ title: `Number Sense · Level ${active.level}`, subtitle: active.completedAt ? "Level complete ✓" : def?.focus || "Mental math & estimation" });
  }

  function softTargetSeconds(question, level) {
    const t = tier(level);
    let seconds = [18, 20, 24, 28, 32][t - 1] || 24;
    if (question.type === "choice") seconds = Math.max(10, seconds - 5);
    const prompt = String(question.prompt || "");
    if (/estimate|closest|approximately|roughly/i.test(prompt)) seconds = Math.max(10, seconds - 3);
    if (/%|ratio|proportion|increase|decrease/i.test(prompt) && t >= 3) seconds += 4;
    return { seconds, label: `~${seconds}s` };
  }

  function renderPace(active, question) {
    if (!els.pace) return;
    const ms = Number(active.responseTimesMs?.[active.questionIndex] || 0);
    const target = softTargetSeconds(question, active.level);
    if (active.answerLocked && ms) {
      const sec = ms / 1000;
      const tone = sec <= target.seconds ? "comfortable fluency" : sec <= target.seconds * 1.75 ? "building fluency" : "take the strategy with you";
      els.pace.innerHTML = `<span>Response: <strong>${sec.toFixed(1)}s</strong> · ${escapeHtml(tone)}</span><span>Gentle target ${target.label} · no reward effect</span>`;
      return;
    }
    const elapsed = Math.max(0, (Date.now() - Number(active.questionStartedAt || Date.now())) / 1000);
    els.pace.innerHTML = `<span class="pace-live-v314o">This question: <strong>${elapsed.toFixed(1)}s</strong></span><span>Gentle target ${target.label} · accuracy first</span>`;
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
    active.questionStartedAt = Date.now();
    active.lastCorrect = false;
    active.updatedAt = Date.now();
    persist("number-sense-next");
    window.setTimeout(() => els.input?.focus(), 40);
  }

  function completeLevel(active) {
    const s = state();
    const live = s.journey.active;
    if (!live || live.completedAt || live.level !== active.level) return;
    const already = new Set(s.journey.completedLevels).has(live.level);
    live.completedAt = Date.now();
    live.updatedAt = live.completedAt;
    if (live.replay || already) {
      const level = live.level;
      s.completed.push({ id: live.id, level, replay: true, completedAt: live.completedAt, rewardEventId: null });
      live.rewardEventId = null;
      persist("number-sense-replay");
      const daily = window.LifeRPGDailyStreaks?.awardStandalone?.("numberSense", { source:"number-sense-daily-replay", label:`Number Sense Daily · Replay Level ${level}`, realm:"Knowledge", capability:"knowledge", xp:5, realmXP:5, statXP:4, coins:5, storyEnergyBase:.2, metadata:{numberSense:true,mode:"journey-replay",level} });
      app.showToast?.(daily?.reward ? `↻ Number Sense Level ${level} replay complete · Daily ${daily.info?.streak || 1}-day streak · +${daily.reward.xp} XP · +${app.formatEnergy?.(daily.reward.storyEnergy) ?? daily.reward.storyEnergy} 🔥 · +${daily.reward.coins} 🪙` : `↻ Number Sense Level ${level} replay complete · no duplicate level reward`);
      return;
    }
    const reward = award(live);
    s.journey.completedLevels.push(live.level);
    s.journey.completedLevels = [...new Set(s.journey.completedLevels)].sort((a, b) => a - b);
    s.stats.levelsSolved += 1;
    s.completed.push({
      id: live.id,
      level: live.level,
      replay: false,
      completedAt: live.completedAt,
      rewardEventId: reward.eventId || null,
      reward: { xp: reward.xp, realmXP: reward.realmXP, statXP: reward.statXP, coins: reward.coins, storyEnergy: reward.storyEnergy }
    });
    s.completed = s.completed.slice(-300);
    const completedLevel = live.level;
    live.rewardEventId = reward.eventId || live.rewardEventId || null;
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
    const baseSpec = { source:"number-sense-complete", sourceId, label:`Number Sense Journey · Level ${active.level}`, realm:"Knowledge", capability:"knowledge", xp:Math.max(1,Math.round(meta.xp*scale)), realmXP:Math.max(1,Math.round(meta.xp*scale)), statXP:Math.max(1,Math.round(meta.statXP*scale)), coins:Math.max(1,Math.round(meta.coins*scale)), storyEnergyBase:floor2(meta.story*scale), progressionRelevant:true, metadata:{ numberSense:true, mode:"journey", level:active.level, tier:tier(active.level), questions:levelDef(active.level)?.questions?.length||6, attempts:active.attemptsByQuestion.reduce((sum,value)=>sum+Number(value||0),0), repeatScale:scale, speedReward:false } };
    const streaked = window.LifeRPGDailyStreaks?.apply?.("numberSense", baseSpec) || {spec:baseSpec,info:null};
    const reward = app.awardActivity(streaked.spec); reward.dailyStreakInfo = streaked.info;
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
