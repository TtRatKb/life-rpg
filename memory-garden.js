(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity) return;

  const VERSION = "0.31.4z";
  const RNG_VERSION = "0.31.4o";
  const SCHEMA = 2;
  const TOTAL = 50;
  const ROUNDS_PER_LEVEL = 3;
  const REPEAT_SCALES = [1, 0.75, 0.5, 0.35];
  const MODES = ["spatial", "sequence", "pattern", "working"];
  const MODE_META = {
    spatial: { icon: "▦", label: "Spatial Recall", copy: "Remember where the highlighted cells were." },
    sequence: { icon: "→", label: "Sequence Recall", copy: "Hold an ordered sequence, then rebuild it." },
    pattern: { icon: "◇", label: "Pattern Recall", copy: "Study a small visual pattern and identify it afterwards." },
    working: { icon: "↻", label: "Working Memory", copy: "Keep a few details active while something else briefly interrupts." }
  };
  const TIERS = {
    1: { label: "Sprout", icon: "🌱", xp: 18, statXP: 12, coins: 10, story: 0.5 },
    2: { label: "Greenhouse", icon: "🌿", xp: 22, statXP: 14, coins: 13, story: 0.7 },
    3: { label: "Bloom", icon: "❀", xp: 26, statXP: 17, coins: 16, story: 0.95 },
    4: { label: "Deep Roots", icon: "🌸", xp: 30, statXP: 20, coins: 19, story: 1.2 },
    5: { label: "Memory Garden", icon: "✦", xp: 34, statXP: 23, coins: 22, story: 1.45 }
  };
  const TOKENS = [
    { id: "moon", symbol: "☾", label: "Moon" },
    { id: "star", symbol: "★", label: "Star" },
    { id: "leaf", symbol: "◆", label: "Leaf" },
    { id: "drop", symbol: "●", label: "Drop" },
    { id: "flower", symbol: "✿", label: "Flower" },
    { id: "diamond", symbol: "◇", label: "Diamond" },
    { id: "sun", symbol: "☀", label: "Sun" },
    { id: "heart", symbol: "♡", label: "Heart" }
  ];

  const els = {
    dialog: byId("memoryGardenDialog"),
    close: byId("memoryGardenClose"),
    daily: byId("memoryGardenDailyCard"),
    progress: byId("memoryGardenJourneyProgress"),
    bloom: byId("memoryGardenBloomStrip"),
    levels: byId("memoryGardenLevelGrid"),
    play: byId("memoryGardenPlayPanel"),
    meta: byId("memoryGardenTrialMeta"),
    round: byId("memoryGardenRoundProgress"),
    stage: byId("memoryGardenStage"),
    feedback: byId("memoryGardenFeedback"),
    actions: byId("memoryGardenActions"),
    status: byId("memoryGardenStatus"),
    growthStats: byId("memoryGardenGrowthStats"),
    trainingStats: byId("trainingGroundsMemoryStatus"),
    quickStatus: byId("memoryGardenQuickStatus")
  };

  let previewTimer = null;
  let sequenceTimers = [];
  let previewFrames = [];
  let initialHydration = true;

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
      stats: {
        levelsSolved: 0,
        roundsSolved: 0,
        attempts: 0,
        firstTryCorrect: 0,
        modeCompletions: { spatial: 0, sequence: 0, pattern: 0, working: 0 }
      },
      completed: []
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.memoryGarden || typeof root.memoryGarden !== "object" || Array.isArray(root.memoryGarden)) root.memoryGarden = defaults();
    const s = root.memoryGarden;
    s.schemaVersion = SCHEMA;
    if (!s.journey || typeof s.journey !== "object") s.journey = defaults().journey;
    if (!s.stats || typeof s.stats !== "object") s.stats = defaults().stats;
    s.completed = Array.isArray(s.completed) ? s.completed.slice(-300) : [];
    s.journey.completedLevels = [...new Set((s.journey.completedLevels || []).map(Number).filter(level => level >= 1 && level <= TOTAL))].sort((a, b) => a - b);
    s.journey.active = normalizeActive(s.journey.active, initialHydration);
    initialHydration = false;
    ["levelsSolved", "roundsSolved", "attempts", "firstTryCorrect"].forEach(key => s.stats[key] = Math.max(0, Number(s.stats[key] || 0)));
    if (!s.stats.modeCompletions || typeof s.stats.modeCompletions !== "object") s.stats.modeCompletions = defaults().stats.modeCompletions;
    MODES.forEach(mode => s.stats.modeCompletions[mode] = Math.max(0, Number(s.stats.modeCompletions[mode] || 0)));
    return s;
  }

  function normalizeActive(active, resetInterruptedPreview = false) {
    if (!active || typeof active !== "object") return null;
    const level = Number(active.level || 0);
    if (level < 1 || level > TOTAL) return null;
    const mode = modeForLevel(level);
    let phase = ["ready", "preview", "recall", "interference", "feedback"].includes(active.phase) ? active.phase : "ready";
    const previewPaintedAt = Math.max(0, Number(active.previewPaintedAt || 0));
    // Old interrupted rounds could land directly in recall even though no preview had ever painted.
    // On first hydration, any unfinished round without a confirmed paint restarts safely from Ready.
    if (resetInterruptedPreview && ["preview", "recall", "interference"].includes(phase) && !previewPaintedAt) phase = "ready";
    if (phase === "preview" && resetInterruptedPreview) phase = "ready";
    return {
      ...active,
      id: String(active.id || `memory-garden-l${level}`),
      level,
      mode,
      roundIndex: Math.max(0, Math.min(ROUNDS_PER_LEVEL - 1, Number(active.roundIndex || 0))),
      phase,
      selectedCells: Array.isArray(active.selectedCells) ? active.selectedCells.map(Number).filter(Number.isInteger) : [],
      sequenceInput: Array.isArray(active.sequenceInput) ? active.sequenceInput.map(String) : [],
      attemptsByRound: Array.from({ length: ROUNDS_PER_LEVEL }, (_, index) => Math.max(0, Number(active.attemptsByRound?.[index] || 0))),
      firstTryByRound: Array.from({ length: ROUNDS_PER_LEVEL }, (_, index) => active.firstTryByRound?.[index] === true ? true : active.firstTryByRound?.[index] === false ? false : null),
      attemptsThisRound: Math.max(0, Number(active.attemptsThisRound || 0)),
      replay: Boolean(active.replay),
      lastCorrect: active.lastCorrect === true,
      previewPaintedAt,
      previewReplays: Math.max(0, Number(active.previewReplays || 0)),
      createdAt: Number(active.createdAt || Date.now()),
      updatedAt: Number(active.updatedAt || active.createdAt || Date.now()),
      completedAt: active.completedAt ? Number(active.completedAt) : null,
      rewardEventId: active.rewardEventId || null
    };
  }

  function state() { return ensureState(); }
  function completedSet() { return new Set(state().journey.completedLevels); }
  function current() { return state().journey.active; }
  function nextLevel() { for (let level = 1; level <= TOTAL; level += 1) if (!completedSet().has(level)) return level; return null; }
  function tier(level) { return Math.min(5, Math.max(1, Math.ceil(Number(level || 1) / 10))); }
  function modeForLevel(level) { return MODES[(Number(level) - 1) % MODES.length]; }

  function persist(source = "memory-garden") {
    app.saveState({ source });
    render();
    app.renderAll?.();
  }

  function bind() {
    els.close?.addEventListener("click", () => {
      clearPreviewTimers();
      if (els.dialog?.open) els.dialog.close();
    });

    document.addEventListener("visibilitychange", () => {
      const active = current();
      if (document.visibilityState !== "hidden" || active?.phase !== "preview") return;
      clearPreviewTimers();
      active.phase = "ready";
      active.previewPaintedAt = 0;
      active.updatedAt = Date.now();
      app.saveState({ source: "memory-garden-preview-interrupted" });
    });

    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-memory-garden-open]");
      if (open) { event.preventDefault(); openDialog(); return; }

      const daily = event.target.closest?.("[data-memory-garden-daily-start]");
      if (daily) { event.preventDefault(); startLevel(nextLevel() || TOTAL, { replay: !nextLevel() }); return; }

      const levelButton = event.target.closest?.("[data-memory-garden-level]");
      if (levelButton) {
        event.preventDefault();
        const level = Number(levelButton.dataset.memoryGardenLevel || 0);
        if (level && !levelButton.disabled) startLevel(level, { replay: completedSet().has(level) });
        return;
      }

      const returnButton = event.target.closest?.("[data-memory-return]");
      if (returnButton) { event.preventDefault(); window.LifeRPGTrainingFocus?.exit?.({ reopen: false }); openDialog(); return; }

      const startRoundButton = event.target.closest?.("[data-memory-start-round]");
      if (startRoundButton) { event.preventDefault(); beginRound(); return; }

      const previewAgain = event.target.closest?.("[data-memory-preview-again]");
      if (previewAgain) { event.preventDefault(); replayPreview(); return; }

      const retry = event.target.closest?.("[data-memory-retry]");
      if (retry) { event.preventDefault(); resetCurrentRound(); beginRound(); return; }

      const next = event.target.closest?.("[data-memory-next-round]");
      if (next) { event.preventDefault(); advanceRound(); return; }

      const cell = event.target.closest?.("[data-memory-spatial-cell]");
      if (cell) { event.preventDefault(); toggleSpatialCell(Number(cell.dataset.memorySpatialCell)); return; }

      const spatialCheck = event.target.closest?.("[data-memory-spatial-check]");
      if (spatialCheck) { event.preventDefault(); checkSpatial(); return; }

      const sequenceToken = event.target.closest?.("[data-memory-sequence-token]");
      if (sequenceToken) { event.preventDefault(); chooseSequenceToken(String(sequenceToken.dataset.memorySequenceToken || "")); return; }

      const sequenceUndo = event.target.closest?.("[data-memory-sequence-undo]");
      if (sequenceUndo) { event.preventDefault(); undoSequence(); return; }

      const patternChoice = event.target.closest?.("[data-memory-pattern-choice]");
      if (patternChoice) { event.preventDefault(); checkPattern(Number(patternChoice.dataset.memoryPatternChoice || -1)); return; }

      const interference = event.target.closest?.("[data-memory-interference-choice]");
      if (interference) { event.preventDefault(); completeInterference(); return; }

      const workingChoice = event.target.closest?.("[data-memory-working-choice]");
      if (workingChoice) { event.preventDefault(); checkWorking(Number(workingChoice.dataset.memoryWorkingChoice)); return; }
    });
  }

  function openDialog() {
    render();
    if (els.dialog && !els.dialog.open) els.dialog.showModal();
  }

  function startLevel(level, { replay = false } = {}) {
    level = Number(level);
    const allowed = level === 1 || completedSet().has(level) || completedSet().has(level - 1);
    if (!allowed || level < 1 || level > TOTAL) return;
    const existing = current();
    if (existing && !existing.completedAt && existing.level === level && Boolean(existing.replay) === Boolean(replay)) {
      render();
      enterFocus(existing);
      return;
    }
    clearPreviewTimers();
    state().journey.active = {
      id: `memory-garden-l${level}${replay ? "-replay" : ""}`,
      level,
      mode: modeForLevel(level),
      roundIndex: 0,
      phase: "ready",
      selectedCells: [],
      sequenceInput: [],
      attemptsByRound: Array(ROUNDS_PER_LEVEL).fill(0),
      firstTryByRound: Array(ROUNDS_PER_LEVEL).fill(null),
      attemptsThisRound: 0,
      replay: Boolean(replay),
      lastCorrect: false,
      previewPaintedAt: 0,
      previewReplays: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
    persist("memory-garden-start");
    enterFocus(current());
  }

  function resetCurrentRound() {
    const active = current();
    if (!active) return;
    clearPreviewTimers();
    active.phase = "ready";
    active.selectedCells = [];
    active.sequenceInput = [];
    active.lastCorrect = false;
    active.previewPaintedAt = 0;
    active.updatedAt = Date.now();
    persist("memory-garden-round-reset");
  }

  function beginRound() {
    const active = current();
    if (!active || active.completedAt) return;
    clearPreviewTimers();
    active.phase = "preview";
    active.selectedCells = [];
    active.sequenceInput = [];
    active.lastCorrect = false;
    active.previewPaintedAt = 0;
    active.updatedAt = Date.now();
    app.saveState({ source: "memory-garden-preview" });
    renderTrial();

    const round = roundData(active.level, active.roundIndex);
    startPreviewAfterPaint(active, round);
  }

  function startPreviewAfterPaint(active, round) {
    // Two animation frames guarantee that the preview DOM has actually reached a browser paint
    // before the exposure countdown begins. This prevents a fast phase transition from skipping
    // the only visual frame the player was supposed to memorize.
    const raf = window.requestAnimationFrame || (callback => window.setTimeout(callback, 16));
    const first = raf(() => {
      const second = raf(() => {
        const now = current();
        if (!now || now.phase !== "preview" || now.level !== active.level || now.roundIndex !== active.roundIndex) return;
        now.previewPaintedAt = Date.now();
        now.updatedAt = now.previewPaintedAt;
        app.saveState({ source: "memory-garden-preview-painted" });
        if (now.mode === "sequence") runSequencePreview(round);
        else {
          previewTimer = window.setTimeout(() => finishPreview(active), round.exposureMs);
        }
      });
      previewFrames.push(second);
    });
    previewFrames.push(first);
  }

  function finishPreview(active) {
    const now = current();
    if (!now || now.phase !== "preview" || now.level !== active.level || now.roundIndex !== active.roundIndex) return;
    if (!now.previewPaintedAt) {
      now.phase = "ready";
      now.updatedAt = Date.now();
      persist("memory-garden-preview-missed-paint");
      return;
    }
    now.phase = now.mode === "working" ? "interference" : "recall";
    now.updatedAt = Date.now();
    persist("memory-garden-recall");
  }

  function replayPreview() {
    const active = current();
    if (!active || active.completedAt || !["recall", "interference"].includes(active.phase)) return;
    active.previewReplays = Math.max(0, Number(active.previewReplays || 0)) + 1;
    active.phase = "ready";
    active.selectedCells = [];
    active.sequenceInput = [];
    active.lastCorrect = false;
    active.previewPaintedAt = 0;
    active.updatedAt = Date.now();
    app.saveState({ source: "memory-garden-preview-replay" });
    beginRound();
  }

  function runSequencePreview(round) {
    const active = current();
    if (!active) return;
    const perToken = round.tokenMs;
    const gap = 150;
    round.sequence.forEach((tokenId, index) => {
      sequenceTimers.push(window.setTimeout(() => {
        const now = current();
        if (!now || now.phase !== "preview") return;
        if (els.stage) {
          const token = tokenById(tokenId);
          els.stage.innerHTML = `<div class="memory-sequence-preview-v314n"><small>ITEM ${index + 1} OF ${round.sequence.length}</small><span>${escapeHtml(token.symbol)}</span><strong>${escapeHtml(token.label)}</strong></div>`;
        }
      }, index * (perToken + gap)));
    });
    const total = round.sequence.length * (perToken + gap) + 120;
    sequenceTimers.push(window.setTimeout(() => {
      const now = current();
      if (!now || now.level !== active.level || now.roundIndex !== active.roundIndex) return;
      now.phase = "recall";
      now.updatedAt = Date.now();
      persist("memory-garden-sequence-recall");
    }, total));
  }

  function advanceRound() {
    const active = current();
    if (!active || !active.lastCorrect) return;
    if (active.roundIndex + 1 >= ROUNDS_PER_LEVEL) {
      completeLevel();
      return;
    }
    active.roundIndex += 1;
    active.phase = "ready";
    active.selectedCells = [];
    active.sequenceInput = [];
    active.attemptsThisRound = 0;
    active.lastCorrect = false;
    active.previewPaintedAt = 0;
    active.updatedAt = Date.now();
    persist("memory-garden-next-round");
  }

  function toggleSpatialCell(index) {
    const active = current();
    if (!active || active.mode !== "spatial" || active.phase !== "recall") return;
    const round = roundData(active.level, active.roundIndex);
    if (!Number.isInteger(index) || index < 0 || index >= round.gridSize * round.gridSize) return;
    const set = new Set(active.selectedCells);
    if (set.has(index)) set.delete(index);
    else if (set.size < round.targets.length) set.add(index);
    active.selectedCells = [...set];
    active.updatedAt = Date.now();
    app.saveState({ source: "memory-garden-spatial-input" });
    renderTrial();
  }

  function checkSpatial() {
    const active = current();
    if (!active || active.mode !== "spatial" || active.phase !== "recall") return;
    const round = roundData(active.level, active.roundIndex);
    const selected = [...active.selectedCells].sort((a, b) => a - b);
    const target = [...round.targets].sort((a, b) => a - b);
    submitRound(selected.length === target.length && selected.every((value, index) => value === target[index]), {
      reveal: `Correct cells: ${target.map(i => i + 1).join(", ")}`
    });
  }

  function chooseSequenceToken(tokenId) {
    const active = current();
    if (!active || active.mode !== "sequence" || active.phase !== "recall") return;
    const round = roundData(active.level, active.roundIndex);
    if (!tokenById(tokenId)) return;
    if (active.sequenceInput.length >= round.sequence.length) return;
    active.sequenceInput.push(tokenId);
    active.updatedAt = Date.now();
    app.saveState({ source: "memory-garden-sequence-input" });
    if (active.sequenceInput.length >= round.sequence.length) {
      const ok = active.sequenceInput.every((value, index) => value === round.sequence[index]);
      submitRound(ok, { reveal: `Sequence: ${round.sequence.map(id => tokenById(id).label).join(" → ")}` });
    } else renderTrial();
  }

  function undoSequence() {
    const active = current();
    if (!active || active.mode !== "sequence" || active.phase !== "recall" || !active.sequenceInput.length) return;
    active.sequenceInput.pop();
    app.saveState({ source: "memory-garden-sequence-undo" });
    renderTrial();
  }

  function checkPattern(choiceIndex) {
    const active = current();
    if (!active || active.mode !== "pattern" || active.phase !== "recall") return;
    const round = roundData(active.level, active.roundIndex);
    submitRound(choiceIndex === round.correctChoice, { reveal: "The original pattern is highlighted below." });
  }

  function completeInterference() {
    const active = current();
    if (!active || active.mode !== "working" || active.phase !== "interference") return;
    active.phase = "recall";
    active.updatedAt = Date.now();
    persist("memory-garden-working-recall");
  }

  function checkWorking(value) {
    const active = current();
    if (!active || active.mode !== "working" || active.phase !== "recall") return;
    const round = roundData(active.level, active.roundIndex);
    submitRound(Number(value) === Number(round.answer), { reveal: `${round.queryToken.label} was paired with ${round.answer}.` });
  }

  function submitRound(correct, detail = {}) {
    // Keep one normalized root object for the whole mutation. Calling state()
    // repeatedly used to replace the normalized active object underneath us,
    // which could make the feedback mutation disappear.
    const s = state();
    const active = s.journey.active;
    if (!active || !["recall", "interference"].includes(active.phase)) return;
    const firstTry = active.attemptsThisRound === 0;
    active.attemptsThisRound += 1;
    active.attemptsByRound[active.roundIndex] = active.attemptsThisRound;
    if (active.firstTryByRound[active.roundIndex] === null) active.firstTryByRound[active.roundIndex] = correct && active.attemptsThisRound === 1;
    s.stats.attempts += 1;
    if (correct) {
      s.stats.roundsSolved += 1;
      if (firstTry) s.stats.firstTryCorrect += 1;
      active.lastCorrect = true;
      active.phase = "feedback";
    } else {
      active.lastCorrect = false;
      active.phase = "feedback";
    }
    active.updatedAt = Date.now();
    active.feedbackDetail = String(detail.reveal || "");
    persist(correct ? "memory-garden-round-correct" : "memory-garden-round-wrong");
  }

  function completeLevel() {
    // Same one-root rule as submitRound(): keep the active object live while
    // completing the level so the completion cannot vanish after normalize().
    const s = state();
    const active = s.journey.active;
    if (!active || active.completedAt || !active.lastCorrect) return;
    const level = active.level;
    const mode = active.mode;
    const alreadyCompleted = new Set(s.journey.completedLevels).has(level);
    let reward = { xp: 0, realmXP: 0, statXP: 0, coins: 0, storyEnergy: 0, eventId: null };

    if (!alreadyCompleted && !active.replay) {
      reward = awardLevel(active);
      s.journey.completedLevels = [...new Set([...s.journey.completedLevels, level])].sort((a, b) => a - b);
      s.stats.levelsSolved += 1;
      s.stats.modeCompletions[mode] += 1;
    }

    active.completedAt = Date.now();
    active.rewardEventId = reward.eventId || active.rewardEventId || null;
    s.completed.push({
      level,
      mode,
      replay: alreadyCompleted || active.replay,
      at: new Date().toISOString(),
      attempts: Math.max(ROUNDS_PER_LEVEL, active.attemptsByRound.reduce((sum, value) => sum + Number(value || 0), 0)),
      rewardEventId: reward.eventId || null
    });
    s.completed = s.completed.slice(-300);
    persist("memory-garden-complete");

    const next = nextLevel();
    if (alreadyCompleted || active.replay) { const daily = window.LifeRPGDailyStreaks?.awardStandalone?.("memoryGarden", { source:"memory-garden-daily-replay", label:`Memory Garden Daily · Replay Level ${level}`, realm:"Knowledge", capability:"knowledge", xp:5, realmXP:5, statXP:4, coins:5, storyEnergyBase:.2, metadata:{memoryGarden:true,mode:"journey-replay",level} }); app.showToast?.(daily?.reward ? `🧠 Memory Garden Level ${level} replay complete · Daily ${daily.info?.streak || 1}-day streak · +${daily.reward.xp} XP · +${app.formatEnergy?.(daily.reward.storyEnergy) ?? daily.reward.storyEnergy} 🔥 · +${daily.reward.coins} 🪙` : `🧠 Memory Garden Level ${level} replay complete.`); }
    else app.showToast?.(`🧠 Level ${level} complete · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙${next ? ` · Level ${next} unlocked` : " · Chapter 1 complete!"}`);
  }

  function awardLevel(active) {
    const sourceId = `journey-l${active.level}`;
    const existing = (app.getState().rewardLedger?.events || []).find(event => event?.source === "memory-garden-complete" && event?.sourceId === sourceId);
    if (existing) return rewardFromEvent(existing);

    const meta = TIERS[tier(active.level)];
    const scale = REPEAT_SCALES[Math.min(todayCompletionCount(), REPEAT_SCALES.length - 1)];
    const totalAttempts = Math.max(ROUNDS_PER_LEVEL, active.attemptsByRound.reduce((sum, value) => sum + Number(value || 0), 0));
    const answeredFirstTry = active.firstTryByRound.filter(value => value !== null);
    const firstTryAccuracy = answeredFirstTry.length ? Math.round(answeredFirstTry.filter(Boolean).length / answeredFirstTry.length * 100) : null;
    const baseSpec = { source:"memory-garden-complete", sourceId, label:`Memory Garden · Level ${active.level} · ${MODE_META[active.mode].label}`, realm:"Knowledge", capability:"knowledge", xp:Math.max(1,Math.round(meta.xp*scale)), realmXP:Math.max(1,Math.round(meta.xp*scale)), statXP:Math.max(1,Math.round(meta.statXP*scale)), coins:Math.max(1,Math.round(meta.coins*scale)), storyEnergyBase:floor2(meta.story*scale), progressionRelevant:true, metadata:{memoryGarden:true,mode:active.mode,level:active.level,tier:tier(active.level),rounds:ROUNDS_PER_LEVEL,attempts:totalAttempts,firstTryAccuracy,repeatScale:scale,speedReward:false,exposureTimingOnly:true} };
    const streaked = window.LifeRPGDailyStreaks?.apply?.("memoryGarden", baseSpec) || {spec:baseSpec,info:null};
    const reward = app.awardActivity(streaked.spec); reward.dailyStreakInfo = streaked.info; return reward;
  }

  function render() {
    renderGrowth();
    renderDaily();
    renderProgress();
    renderBloom();
    renderLevels();
    renderTrial();
    syncFocusHeader();
  }

  function enterFocus(active = current()) {
    if (!active || !els.play || !window.LifeRPGTrainingFocus?.enter) return false;
    if (els.dialog?.open) els.dialog.close();
    const meta = MODE_META[active.mode];
    return window.LifeRPGTrainingFocus.enter({
      id: "memory-garden", node: els.play, title: `Memory Garden · Level ${active.level}`, subtitle: `${meta.label} · Round ${active.roundIndex + 1}/${ROUNDS_PER_LEVEL}`, tone: "light",
      onExit: () => { clearPreviewTimers(); if (current()?.phase === "preview") { current().phase = "ready"; app.saveState({ source: "memory-garden-focus-exit" }); } render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function syncFocusHeader() {
    const active = current();
    if (!active || !window.LifeRPGTrainingFocus?.isActive?.("memory-garden")) return;
    const meta = MODE_META[active.mode];
    window.LifeRPGTrainingFocus.update({ title: `Memory Garden · Level ${active.level}`, subtitle: active.completedAt ? "Level complete ✓" : `${meta.label} · Round ${active.roundIndex + 1}/${ROUNDS_PER_LEVEL}` });
  }

  function renderGrowth() {
    const s = state();
    const next = nextLevel();
    const accuracy = s.stats.attempts ? Math.round((s.stats.firstTryCorrect / Math.max(1, s.stats.roundsSolved)) * 100) : 0;
    const copy = `<span><b>${s.journey.completedLevels.length}/${TOTAL}</b> Journey</span><span><b>${s.stats.roundsSolved}</b> rounds</span><span>${s.stats.roundsSolved ? `${accuracy}% first-try` : "Four memory modes"}</span>`;
    if (els.growthStats) els.growthStats.innerHTML = copy;
    if (els.trainingStats) els.trainingStats.textContent = healthRecoveryFirst() ? "Optional today · recovery first" : (next ? `Level ${next} / ${TOTAL}` : `${TOTAL}/${TOTAL} complete`);
    if (els.quickStatus) {
      const active = s.journey.active && !s.journey.active.completedAt ? s.journey.active : null;
      els.quickStatus.textContent = healthRecoveryFirst()
        ? "Optional today · Recovery Studio may fit better."
        : active ? `Continue Level ${active.level} · ${MODE_META[active.mode].label}`
          : next ? `Journey ${s.journey.completedLevels.length}/${TOTAL} · next Level ${next}`
            : `Journey ${TOTAL}/${TOTAL} complete`;
    }
  }

  function renderDaily() {
    if (!els.daily) return;
    const next = nextLevel();
    const recoveryFirst = healthRecoveryFirst();
    if (!next) {
      els.daily.innerHTML = `<div><small>DAILY MEMORY</small><strong>Chapter 1 complete 🌸</strong><span>Replay any level whenever you want. A first replay on a new day can still keep the positive Daily streak going.</span><em class="training-streak-line-v314z">${escapeHtml(window.LifeRPGDailyStreaks?.shortLabel?.("memoryGarden") || "Daily consistency bonus ready")}</em></div><button type="button" data-memory-garden-level="50">Replay Level 50</button>`;
      return;
    }
    const mode = modeForLevel(next);
    const done = todayCompletionCount() > 0;
    const active = current()?.level === next && !current()?.completedAt;
    const healthNote = recoveryFirst ? " Your check-in suggests Recovery Studio is the kinder priority today; Memory Garden stays completely optional." : "";
    els.daily.innerHTML = `<div><small>DAILY MEMORY</small><strong>${done ? "Today's memory training is already done ✓" : `Continue your Garden · Level ${next}`}</strong><span>${MODE_META[mode].label} · ${TIERS[tier(next)].label}.${healthNote}</span><em class="training-streak-line-v314z">${escapeHtml(window.LifeRPGDailyStreaks?.shortLabel?.("memoryGarden") || "Daily consistency bonus ready")}</em></div><button type="button" data-memory-garden-daily-start>${active ? "Continue" : "Start"} Level ${next}</button>`;
  }

  function renderProgress() {
    if (!els.progress) return;
    const completed = state().journey.completedLevels.length;
    const percent = Math.round(completed / TOTAL * 100);
    els.progress.innerHTML = `<div><span><strong>${completed}/${TOTAL}</strong> completed</span><span>${percent}%</span></div><div class="bar"><span style="width:${percent}%"></span></div>`;
  }

  function renderBloom() {
    if (!els.bloom) return;
    const completed = state().journey.completedLevels.length;
    const plots = Array.from({ length: 10 }, (_, index) => {
      const start = index * 5 + 1;
      const done = Math.max(0, Math.min(5, completed - index * 5));
      const icon = done >= 5 ? "🌸" : done >= 3 ? "❀" : done >= 1 ? "🌱" : "·";
      return `<span class="memory-bloom-plot-v314n ${done ? "is-growing" : ""} ${done >= 5 ? "is-bloomed" : ""}" title="Levels ${start}–${start + 4}: ${done}/5 complete"><b>${icon}</b><small>${done}/5</small></span>`;
    }).join("");
    els.bloom.innerHTML = `<div><small>YOUR GARDEN</small><strong>Every five levels grows another little plot.</strong></div><div class="memory-bloom-track-v314n">${plots}</div>`;
  }

  function renderLevels() {
    if (!els.levels) return;
    const set = completedSet();
    const active = current();
    els.levels.innerHTML = Array.from({ length: TOTAL }, (_, index) => index + 1).map(level => {
      const done = set.has(level);
      const unlocked = done || level === 1 || set.has(level - 1);
      const isActive = active?.level === level && !active.completedAt;
      const mode = modeForLevel(level);
      return `<button type="button" data-memory-garden-level="${level}" ${unlocked ? "" : "disabled"} class="memory-level-v314n ${done ? "done" : ""} ${isActive ? "active" : ""}" title="Level ${level} · ${MODE_META[mode].label}"><span>${done ? "✓" : isActive ? "▶" : unlocked ? MODE_META[mode].icon : "🔒"}</span><b>${level}</b></button>`;
    }).join("");
  }

  function renderTrial() {
    if (!els.stage) return;
    const active = current();
    clearFeedback();
    if (!active) {
      els.meta.innerHTML = `<small>MEMORY GARDEN</small><strong>Choose a Journey level to begin.</strong>`;
      els.round.textContent = "Four modes · no speed-based rewards";
      els.stage.innerHTML = `<div class="memory-empty-v314n"><span>🌱</span><strong>Your first plot is waiting.</strong><p>Spatial, sequence, pattern and working-memory trials rotate through the 50-level Journey.</p></div>`;
      els.actions.innerHTML = nextLevel() ? `<button class="primary-button" data-memory-garden-level="${nextLevel()}" type="button">Start Level ${nextLevel()}</button>` : `<button class="secondary-button" data-memory-garden-level="50" type="button">Replay Level 50</button>`;
      if (els.status) els.status.textContent = "Exposure time is part of the challenge; answering faster never gives extra rewards.";
      return;
    }

    const meta = MODE_META[active.mode];
    const round = roundData(active.level, active.roundIndex);
    if (els.meta) els.meta.innerHTML = `<small>${escapeHtml(TIERS[tier(active.level)].label.toUpperCase())} · LEVEL ${active.level}</small><strong>${meta.icon} ${escapeHtml(meta.label)}</strong><span>${escapeHtml(meta.copy)}</span>`;
    if (els.round) els.round.textContent = `Round ${active.roundIndex + 1} / ${ROUNDS_PER_LEVEL}`;

    if (active.completedAt) {
      const event = active.rewardEventId ? (app.getState().rewardLedger?.events || []).find(item => item?.id === active.rewardEventId) : null;
      const rewards = event ? `<div class="training-result-rewards-v314o"><span>+${Number(event.xp || 0)} XP</span><span>+${Number(event.realmXP || 0)} Knowledge XP</span><span>+${Number(event.statXP || 0)} Memory XP</span><span>+${app.formatEnergy?.(Number(event.storyEnergy || 0)) ?? Number(event.storyEnergy || 0)} Story Energy</span><span>+${Number(event.coins || 0)} Coins</span></div>` : "";
      els.stage.innerHTML = `<div class="memory-complete-v314n training-result-v314o is-success"><span>🌸</span><strong>Level ${active.level} complete.</strong><p>${active.replay ? "Replay finished — no duplicate first-completion reward." : nextLevel() ? `Your rewards are saved and Level ${nextLevel()} is now unlocked.` : "Your rewards are saved. Chapter 1 is complete."}</p>${rewards}</div>`;
      els.actions.innerHTML = `${nextLevel() ? `<button class="primary-button" data-memory-garden-level="${nextLevel()}" type="button">Start Level ${nextLevel()}</button>` : `<button class="secondary-button" data-memory-garden-level="${active.level}" type="button">Replay this level</button>`}<button class="secondary-button" data-memory-return type="button">Back to Memory Garden</button>`;
      if (els.status) els.status.textContent = "Memory training is rewarded for completion and practice, never for rushing.";
      return;
    }

    if (active.phase === "ready") {
      els.stage.innerHTML = `<div class="memory-ready-v314n"><span>${meta.icon}</span><strong>Ready for round ${active.roundIndex + 1}?</strong><p>${escapeHtml(round.instructions)}</p><small>${formatExposure(round)} preview</small></div>`;
      els.actions.innerHTML = `<button class="primary-button" data-memory-start-round type="button">Show me</button>`;
      if (els.status) els.status.textContent = "Take the preview in; there is no benefit to answering quickly afterwards.";
      return;
    }

    if (active.phase === "preview") {
      renderPreview(active, round);
      return;
    }

    if (active.phase === "interference") {
      renderInterference(round);
      return;
    }

    if (active.phase === "recall") {
      renderRecall(active, round);
      return;
    }

    if (active.phase === "feedback") {
      renderFeedback(active, round);
    }
  }

  function renderPreview(active, round) {
    if (active.mode === "spatial") {
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>LOOK · DON'T TAP YET</small><strong>Remember these ${round.targets.length} cells.</strong></div>${gridMarkup(round.gridSize, round.targets, { preview: true })}`;
    } else if (active.mode === "sequence") {
      // runSequencePreview writes the live token display; keep a neutral shell until the first timer fires.
      els.stage.innerHTML = `<div class="memory-sequence-preview-v314n"><small>WATCH THE ORDER</small><span>…</span><strong>Sequence starting</strong></div>`;
    } else if (active.mode === "pattern") {
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>STUDY THE PATTERN</small><strong>Which version will match after it disappears?</strong></div>${patternMarkup(round.pattern, round.gridSize, { preview: true })}`;
    } else if (active.mode === "working") {
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>KEEP THESE PAIRS IN MIND</small><strong>You will need one of them after a tiny interruption.</strong></div><div class="memory-pairs-v314n">${round.pairs.map(pair => `<div><span>${escapeHtml(pair.token.symbol)}</span><strong>${escapeHtml(pair.token.label)}</strong><b>${pair.value}</b></div>`).join("")}</div>`;
    }
    els.actions.innerHTML = "";
    if (els.status) els.status.textContent = `Preview lasts ${formatExposure(round)}. Closing the app now safely restarts this round instead of counting it as failed.`;
  }

  function renderRecall(active, round) {
    if (active.mode === "spatial") {
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>RECALL</small><strong>Tap the ${round.targets.length} cells you remember.</strong></div>${gridMarkup(round.gridSize, active.selectedCells, { interactive: true })}`;
      els.actions.innerHTML = `<button class="text-button" data-memory-preview-again type="button">I didn't see it · show again</button><button class="secondary-button" data-memory-spatial-check type="button" ${active.selectedCells.length === round.targets.length ? "" : "disabled"}>Check memory</button>`;
    } else if (active.mode === "sequence") {
      const chosen = active.sequenceInput.map(id => tokenById(id));
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>REBUILD THE ORDER</small><strong>${chosen.length}/${round.sequence.length} chosen</strong></div><div class="memory-sequence-built-v314n">${chosen.length ? chosen.map(token => `<span><b>${escapeHtml(token.symbol)}</b><small>${escapeHtml(token.label)}</small></span>`).join("") : `<em>Start with the first item you saw.</em>`}</div><div class="memory-token-palette-v314n">${round.palette.map(token => `<button type="button" data-memory-sequence-token="${escapeHtml(token.id)}"><span>${escapeHtml(token.symbol)}</span><small>${escapeHtml(token.label)}</small></button>`).join("")}</div>`;
      els.actions.innerHTML = `<button class="text-button" data-memory-preview-again type="button">I didn't see it · show again</button><button class="text-button" data-memory-sequence-undo type="button" ${active.sequenceInput.length ? "" : "disabled"}>Undo last</button>`;
    } else if (active.mode === "pattern") {
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>RECALL</small><strong>Which pattern did you just see?</strong></div><div class="memory-pattern-choices-v314n">${round.choices.map((pattern, index) => `<button type="button" data-memory-pattern-choice="${index}" aria-label="Pattern option ${index + 1}">${patternMarkup(pattern, round.gridSize)}</button>`).join("")}</div>`;
      els.actions.innerHTML = `<button class="text-button" data-memory-preview-again type="button">I didn't see it · show again</button>`;
    } else if (active.mode === "working") {
      els.stage.innerHTML = `<div class="memory-preview-header-v314n"><small>WORKING MEMORY</small><strong>What number was paired with ${escapeHtml(round.queryToken.label)} ${escapeHtml(round.queryToken.symbol)}?</strong></div><div class="memory-working-choices-v314n">${round.answerChoices.map(value => `<button type="button" data-memory-working-choice="${value}">${value}</button>`).join("")}</div>`;
      els.actions.innerHTML = `<button class="text-button" data-memory-preview-again type="button">I didn't see it · show again</button>`;
    }
    if (els.status) els.status.textContent = "Accuracy matters. Take your time — speed never changes the reward. If the preview did not appear, use ‘show again’; it never counts as a failure.";
  }

  function renderInterference(round) {
    els.stage.innerHTML = `<div class="memory-interference-v314n"><small>ONE TINY INTERRUPTION</small><strong>Before the recall question: which number is larger?</strong><div>${round.interference.choices.map(value => `<button type="button" data-memory-interference-choice="${value}">${value}</button>`).join("")}</div><p>This step is only there to make the memory task more realistic. It is not separately scored.</p></div>`;
    els.actions.innerHTML = "";
    if (els.status) els.status.textContent = "Keep the earlier pairs somewhere in the back of your mind.";
  }

  function renderFeedback(active, round) {
    const correct = active.lastCorrect;
    let reveal = "";
    if (!correct) {
      if (active.mode === "spatial") reveal = gridMarkup(round.gridSize, round.targets, { preview: true, reveal: true });
      else if (active.mode === "sequence") reveal = `<div class="memory-sequence-built-v314n is-reveal">${round.sequence.map(id => { const token = tokenById(id); return `<span><b>${escapeHtml(token.symbol)}</b><small>${escapeHtml(token.label)}</small></span>`; }).join("")}</div>`;
      else if (active.mode === "pattern") reveal = patternMarkup(round.pattern, round.gridSize, { preview: true, reveal: true });
      else if (active.mode === "working") reveal = `<div class="memory-answer-reveal-v314n"><span>${escapeHtml(round.queryToken.symbol)}</span><strong>${escapeHtml(round.queryToken.label)} = ${round.answer}</strong></div>`;
    }
    els.stage.innerHTML = `<div class="memory-feedback-card-v314n ${correct ? "is-correct" : "is-wrong"}"><span>${correct ? "🌸" : "🌱"}</span><strong>${correct ? "Got it." : "Not quite — that is useful training too."}</strong><p>${escapeHtml(active.feedbackDetail || (correct ? "Round complete." : "Take another look and retry the same round."))}</p>${reveal}</div>`;
    els.actions.innerHTML = correct
      ? `<button class="primary-button" data-memory-next-round type="button">${active.roundIndex + 1 >= ROUNDS_PER_LEVEL ? "Complete level" : "Next round"}</button>`
      : `<button class="secondary-button" data-memory-retry type="button">See it again & retry</button>`;
    if (els.status) els.status.textContent = correct ? `Round ${active.roundIndex + 1} complete.` : "Wrong answers never remove XP or progress; this round simply stays open until you get it.";
  }

  function clearFeedback() {
    if (!els.feedback) return;
    els.feedback.classList.add("hidden");
    els.feedback.textContent = "";
  }

  function gridMarkup(size, selected, opts = {}) {
    const set = new Set(selected || []);
    return `<div class="memory-spatial-grid-v314n ${opts.preview ? "is-preview" : ""}" style="--memory-grid:${size}">${Array.from({ length: size * size }, (_, index) => {
      const marked = set.has(index);
      if (opts.interactive) return `<button type="button" data-memory-spatial-cell="${index}" class="${marked ? "is-selected" : ""}" aria-pressed="${marked ? "true" : "false"}" aria-label="Grid cell ${index + 1}"><span>${marked ? "✦" : ""}</span></button>`;
      return `<span class="${marked ? "is-target" : ""}">${marked ? "✦" : ""}</span>`;
    }).join("")}</div>`;
  }

  function patternMarkup(pattern, size, opts = {}) {
    const set = new Set(pattern || []);
    return `<span class="memory-pattern-grid-v314n ${opts.preview ? "is-preview" : ""} ${opts.reveal ? "is-reveal" : ""}" style="--memory-pattern-grid:${size}">${Array.from({ length: size * size }, (_, index) => `<i class="${set.has(index) ? "on" : ""}">${set.has(index) ? "◆" : ""}</i>`).join("")}</span>`;
  }

  function roundData(level, roundIndex) {
    const mode = modeForLevel(level);
    const t = tier(level);
    const within = (level - 1) % 10;
    const rng = mulberry32(hashSeed(`memory-garden:${RNG_VERSION}:${level}:${roundIndex}`));
    const exposureMs = Math.max(1800, 3800 - (t - 1) * 400 - Math.floor(within / 4) * 120);

    if (mode === "spatial") {
      const gridSize = t <= 1 ? 3 : t <= 3 ? 4 : 5;
      const count = Math.min(gridSize * gridSize - 2, 2 + t + Math.floor(within / 5) + (roundIndex % 2));
      const targets = sampleIndices(gridSize * gridSize, count, rng);
      return { mode, gridSize, targets, exposureMs, instructions: `A ${gridSize}×${gridSize} grid will flash ${count} marked cells. Rebuild their positions after they disappear.` };
    }

    if (mode === "sequence") {
      const length = Math.min(8, 3 + t + Math.floor(within / 5));
      const paletteCount = Math.min(TOKENS.length, 5 + Math.ceil(t / 2));
      const palette = shuffle(TOKENS.slice(0, paletteCount), rng);
      const sequence = Array.from({ length }, () => palette[Math.floor(rng() * palette.length)].id);
      const tokenMs = Math.max(520, 820 - (t - 1) * 65);
      return { mode, sequence, palette, tokenMs, exposureMs: sequence.length * (tokenMs + 150), instructions: `${length} symbols will appear one at a time. Rebuild the exact order afterwards.` };
    }

    if (mode === "pattern") {
      const gridSize = t <= 3 ? 3 : 4;
      const count = Math.min(gridSize * gridSize - 2, 2 + t + Math.floor(within / 5));
      const pattern = sampleIndices(gridSize * gridSize, count, rng);
      const distractor1 = uniqueMutatedPattern(pattern, gridSize * gridSize, rng, 1 + (t >= 4 ? 1 : 0), []);
      const distractor2 = uniqueMutatedPattern(pattern, gridSize * gridSize, rng, 1 + (t >= 3 ? 1 : 0), [distractor1]);
      const choices = shuffle([pattern, distractor1, distractor2], rng);
      const correctChoice = choices.findIndex(choice => sameNumbers(choice, pattern));
      return { mode, gridSize, pattern, choices, correctChoice, exposureMs, instructions: `Study a ${gridSize}×${gridSize} pattern briefly, then identify the exact original from three similar options.` };
    }

    const pairCount = Math.min(5, 2 + Math.ceil(t / 2) + (within >= 7 ? 1 : 0));
    const tokens = shuffle(TOKENS.slice(), rng).slice(0, pairCount);
    const values = shuffle([2,3,4,5,6,7,8,9], rng).slice(0, pairCount);
    const pairs = tokens.map((token, index) => ({ token, value: values[index] }));
    const queryPair = pairs[Math.floor(rng() * pairs.length)];
    const wrongValues = shuffle([1,2,3,4,5,6,7,8,9].filter(value => value !== queryPair.value), rng).slice(0, 3);
    const answerChoices = shuffle([queryPair.value, ...wrongValues], rng);
    const a = 2 + Math.floor(rng() * 7);
    let b = 2 + Math.floor(rng() * 7);
    if (a === b) b = b === 9 ? 8 : b + 1;
    return {
      mode,
      pairs,
      queryToken: queryPair.token,
      answer: queryPair.value,
      answerChoices,
      exposureMs: Math.max(2400, exposureMs + 500),
      interference: { choices: shuffle([a, b], rng), answer: Math.max(a, b) },
      instructions: `Remember ${pairCount} symbol-number pairs. A tiny unrelated choice will interrupt you before one pair is asked back.`
    };
  }

  function uniqueMutatedPattern(pattern, total, rng, changes, existing) {
    const forbidden = new Set([JSON.stringify([...pattern].sort((a, b) => a - b)), ...(existing || []).map(item => JSON.stringify([...item].sort((a, b) => a - b)))]);
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const candidate = mutatePattern(pattern, total, rng, changes + Math.floor(attempt / 12));
      const key = JSON.stringify([...candidate].sort((a, b) => a - b));
      if (!forbidden.has(key)) return candidate;
    }
    // Deterministic fallback: rotate one filled position to the first available empty cell.
    const set = new Set(pattern);
    const on = [...set].sort((a, b) => a - b);
    const off = Array.from({ length: total }, (_, index) => index).filter(index => !set.has(index));
    for (const remove of on) {
      for (const add of off) {
        const next = new Set(set); next.delete(remove); next.add(add);
        const candidate = [...next].sort((a, b) => a - b);
        const key = JSON.stringify(candidate);
        if (!forbidden.has(key)) return candidate;
      }
    }
    return pattern.slice();
  }

  function mutatePattern(pattern, total, rng, changes) {
    const set = new Set(pattern);
    for (let i = 0; i < changes; i += 1) {
      const on = [...set];
      const off = Array.from({ length: total }, (_, index) => index).filter(index => !set.has(index));
      if (!on.length || !off.length) break;
      set.delete(on[Math.floor(rng() * on.length)]);
      set.add(off[Math.floor(rng() * off.length)]);
    }
    const result = [...set].sort((a, b) => a - b);
    if (sameNumbers(result, pattern)) return mutatePattern(pattern, total, rng, changes + 1);
    return result;
  }

  function sampleIndices(total, count, rng) {
    return shuffle(Array.from({ length: total }, (_, index) => index), rng).slice(0, count).sort((a, b) => a - b);
  }

  function tokenById(id) { return TOKENS.find(token => token.id === id) || TOKENS[0]; }
  function sameNumbers(a, b) { const x = [...a].sort((m,n) => m-n); const y = [...b].sort((m,n) => m-n); return x.length === y.length && x.every((v,i) => v === y[i]); }
  function shuffle(array, rng) { const out = array.slice(); for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
  function hashSeed(text) { let h = 2166136261 >>> 0; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(seed) { return function() { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function clearPreviewTimers() {
    if (previewTimer) window.clearTimeout(previewTimer);
    previewTimer = null;
    sequenceTimers.forEach(id => window.clearTimeout(id));
    sequenceTimers = [];
    const cancel = window.cancelAnimationFrame || window.clearTimeout;
    previewFrames.forEach(id => cancel(id));
    previewFrames = [];
  }

  function healthRecoveryFirst() {
    const checkIn = todayCheckIn();
    if (!checkIn) return false;
    const raw = checkIn.health && typeof checkIn.health === "object" ? checkIn.health : {};
    const impact = { none: 0, mild: 1, moderate: 2, strong: 3 }[raw.impact] || 0;
    return raw.illness === "yes" || impact >= 2 || checkIn.energy === "fumes" || checkIn.sleep === "bad";
  }

  function todayCheckIn() {
    const key = localDateKey(new Date());
    return app.getState().dailyPlanner?.days?.[key]?.checkIn || null;
  }

  function todayCompletionCount() {
    const key = localDateKey(new Date());
    return (app.getState().rewardLedger?.events || []).filter(event => event?.source === "memory-garden-complete" && !event.duplicate && localDateKey(new Date(event.at || 0)) === key).length;
  }

  function levelFirstTryAccuracy(level) {
    const active = current();
    if (!active || active.level !== level) return null;
    const answered = active.firstTryByRound.filter(value => value !== null);
    if (!answered.length) return null;
    return Math.round(answered.filter(Boolean).length / answered.length * 100);
  }

  function roundAttemptEstimate(level) {
    const active = current();
    if (!active || active.level !== level) return ROUNDS_PER_LEVEL;
    return Math.max(ROUNDS_PER_LEVEL, active.attemptsByRound.reduce((sum, value) => sum + Number(value || 0), 0));
  }

  function rewardFromEvent(event) {
    return { eventId: event.id, xp: Number(event.xp || 0), realmXP: Number(event.realmXP || 0), statXP: Number(event.statXP || 0), coins: Number(event.coins || 0), storyEnergy: Number(event.storyEnergy || 0) };
  }

  function formatExposure(round) {
    const ms = round.mode === "sequence" ? round.exposureMs : round.exposureMs;
    return `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)} sec`;
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function floor2(value) { return Math.floor((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

  window.LifeRPGMemoryGarden = {
    version: VERSION,
    getState: () => JSON.parse(JSON.stringify(state())),
    getLevelConfig: level => ({ level: Number(level), mode: modeForLevel(level), tier: tier(level), rounds: Array.from({ length: ROUNDS_PER_LEVEL }, (_, round) => roundData(Number(level), round)) }),
    open: openDialog,
    startLevel
  };
})();
