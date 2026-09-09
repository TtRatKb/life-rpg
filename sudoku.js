(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const SCHEMA = 3;
  const JOURNEY_CHAPTER = 1;
  const JOURNEY_LEVELS = Array.isArray(window.LifeRPGSudokuLevels) ? window.LifeRPGSudokuLevels : [];
  const JOURNEY_TOTAL = JOURNEY_LEVELS.length || 50;

  const PRACTICE_DIFFICULTY = {
    easy: {
      label: "Easy", icon: "🌱", givens: 41,
      xp: 18, statXP: 12, coins: 10, storyEnergyBase: 0.8,
      description: "Gentle logic practice — good for low-energy or recovery days."
    },
    medium: {
      label: "Medium", icon: "✦", givens: 34,
      xp: 23, statXP: 15, coins: 15, storyEnergyBase: 1.0,
      description: "A normal brain workout with a little more deduction."
    },
    hard: {
      label: "Hard", icon: "⚡", givens: 28,
      xp: 30, statXP: 20, coins: 22, storyEnergyBase: 1.35,
      description: "A stronger logic challenge with a higher completion reward."
    }
  };

  const JOURNEY_TIERS = {
    1: { label: "Foundations", icon: "🌱", difficulty: "easy", xp: 18, statXP: 12, coins: 10, storyEnergyBase: 0.5, description: "Build a calm scanning rhythm with approachable deductions." },
    2: { label: "Steady Logic", icon: "🌿", difficulty: "easy", xp: 20, statXP: 13, coins: 12, storyEnergyBase: 0.65, description: "A little less obvious, with more deliberate scanning." },
    3: { label: "Pattern Builder", icon: "✦", difficulty: "medium", xp: 23, statXP: 15, coins: 15, storyEnergyBase: 1.0, description: "Medium logic that asks you to connect more of the grid." },
    4: { label: "Deep Deduction", icon: "◇", difficulty: "medium", xp: 27, statXP: 18, coins: 18, storyEnergyBase: 1.2, description: "Longer deduction chains while staying fair and human-solvable." },
    5: { label: "Challenge", icon: "⚡", difficulty: "hard", xp: 32, statXP: 22, coins: 22, storyEnergyBase: 1.5, description: "The strongest Chapter 1 puzzles — challenging, not extreme." }
  };

  const REPEAT_SCALES = [1, 0.75, 0.5, 0.35];

  const els = {
    dialog: byId("sudokuDialog"),
    close: byId("sudokuClose"),
    title: byId("sudokuTitle"),
    meta: byId("sudokuMeta"),
    dailyCard: byId("sudokuDailyCard"),
    progress: byId("sudokuJourneyProgress"),
    levelGrid: byId("sudokuLevelGrid"),
    modeBar: byId("sudokuModeBar"),
    practice: byId("sudokuPractice"),
    rewardPreview: byId("sudokuRewardPreview"),
    play: byId("sudokuPlayPanel"),
    result: byId("sudokuResult"),
    board: byId("sudokuBoard"),
    status: byId("sudokuStatus"),
    clear: byId("sudokuClearButton"),
    check: byId("sudokuCheckButton"),
    quickStatus: byId("sudokuQuickStatus"),
    growthStats: byId("sudokuGrowthStats"),
    trainingStats: byId("trainingGroundsSudokuStatus")
  };

  let activeQuestId = "";
  let activeMode = "journey";

  init();

  function init() {
    ensureState();
    bindEvents();
    render();
    window.addEventListener("life-rpg:render", render);
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA,
      active: null,
      completed: [],
      stats: { solved: 0, easy: 0, medium: 0, hard: 0 },
      journey: {
        chapter: JOURNEY_CHAPTER,
        completedLevels: [],
        active: null
      },
      practice: { active: null }
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.sudoku || typeof root.sudoku !== "object" || Array.isArray(root.sudoku)) root.sudoku = defaultState();
    const s = root.sudoku;

    if (!Array.isArray(s.completed)) s.completed = [];
    if (!s.stats || typeof s.stats !== "object") s.stats = defaultState().stats;
    ["solved", "easy", "medium", "hard"].forEach(key => s.stats[key] = Math.max(0, Number(s.stats[key] || 0)));

    if (!s.journey || typeof s.journey !== "object" || Array.isArray(s.journey)) s.journey = defaultState().journey;
    s.journey.chapter = JOURNEY_CHAPTER;
    if (!Array.isArray(s.journey.completedLevels)) s.journey.completedLevels = [];
    s.journey.completedLevels = [...new Set(s.journey.completedLevels.map(Number).filter(level => level >= 1 && level <= JOURNEY_TOTAL))].sort((a, b) => a - b);

    if (!s.practice || typeof s.practice !== "object" || Array.isArray(s.practice)) s.practice = { active: null };

    // V0.31.4b/g saves had one generic active puzzle. Preserve it as Practice
    // instead of pretending a random legacy puzzle was one of the fixed Journey levels.
    if (s.active && !s.practice.active) s.practice.active = normalizePracticeActive(s.active);
    s.active = null;

    s.journey.active = normalizeJourneyActive(s.journey.active);
    s.practice.active = normalizePracticeActive(s.practice.active);

    s.completed = s.completed.filter(item => item && item.id).slice(-400);
    s.schemaVersion = SCHEMA;
    return s;
  }

  function normalizeJourneyActive(current) {
    if (!current || typeof current !== "object") return null;
    const level = Number(current.level || 0);
    const levelDef = levelDefinition(level);
    if (!levelDef) return null;
    const puzzle = parseGrid(levelDef.puzzle);
    const solution = parseGrid(levelDef.solution);
    let values = Array.isArray(current.values) && current.values.length === 81 ? current.values.map(value => Math.max(0, Math.min(9, Number(value || 0)))) : [...puzzle];
    values = values.map((value, index) => puzzle[index] || value);
    Object.assign(current, {
      id: current.id || journeyPuzzleId(level, Boolean(current.replay)),
      mode: "journey",
      origin: current.origin || "journey",
      level,
      tier: Number(levelDef.tier || tierForLevel(level)),
      difficulty: tierMeta(levelDef.tier || tierForLevel(level)).difficulty,
      replay: Boolean(current.replay),
      puzzle,
      solution,
      values,
      createdAt: Number(current.createdAt || Date.now()),
      updatedAt: Number(current.updatedAt || current.createdAt || Date.now()),
      completedAt: current.completedAt ? Number(current.completedAt) : null,
      rewardEventId: current.rewardEventId || null
    });
    return current;
  }

  function normalizePracticeActive(current) {
    if (!current || typeof current !== "object") return null;
    if (!Array.isArray(current.puzzle) || current.puzzle.length !== 81 || !Array.isArray(current.solution) || current.solution.length !== 81) return null;
    const difficulty = PRACTICE_DIFFICULTY[current.difficulty] ? current.difficulty : "medium";
    const puzzle = current.puzzle.map(value => Math.max(0, Math.min(9, Number(value || 0))));
    let values = Array.isArray(current.values) && current.values.length === 81 ? current.values.map(value => Math.max(0, Math.min(9, Number(value || 0)))) : [...puzzle];
    values = values.map((value, index) => puzzle[index] || value);
    Object.assign(current, {
      id: current.id || `sudoku-practice-${Date.now().toString(36)}`,
      mode: "practice",
      origin: current.origin || "practice",
      difficulty,
      puzzle,
      solution: current.solution.map(value => Math.max(0, Math.min(9, Number(value || 0)))),
      values,
      createdAt: Number(current.createdAt || Date.now()),
      updatedAt: Number(current.updatedAt || current.createdAt || Date.now()),
      completedAt: current.completedAt ? Number(current.completedAt) : null,
      rewardEventId: current.rewardEventId || null
    });
    return current;
  }

  function state() { return ensureState(); }

  function persist(source = "sudoku") {
    app.saveState({ source });
    render();
    app.renderAll?.();
  }

  function bindEvents() {
    els.close?.addEventListener("click", close);
    els.clear?.addEventListener("click", clearEntries);
    els.check?.addEventListener("click", checkPuzzle);

    document.addEventListener("click", event => {
      const openButton = event.target.closest?.("[data-sudoku-open]");
      if (openButton) {
        event.preventDefault();
        open();
        return;
      }

      const dailyButton = event.target.closest?.("[data-sudoku-daily-start]");
      if (dailyButton) {
        event.preventDefault();
        startOrContinueNextLevel("daily");
        return;
      }

      const levelButton = event.target.closest?.("[data-sudoku-level]");
      if (levelButton) {
        event.preventDefault();
        const level = Number(levelButton.dataset.sudokuLevel || 0);
        if (levelButton.disabled || !level) return;
        startJourneyLevel(level, { replay: completedLevelSet().has(level), origin: "journey" });
        return;
      }

      const nextButton = event.target.closest?.("[data-sudoku-next-level]");
      if (nextButton) {
        event.preventDefault();
        const next = nextJourneyLevel();
        if (next) startJourneyLevel(next, { replay: false, origin: "journey", confirmReplace: false });
        return;
      }

      const returnButton = event.target.closest?.("[data-sudoku-return]");
      if (returnButton) {
        event.preventDefault();
        window.LifeRPGTrainingFocus?.exit?.({ reopen: false });
        open();
        return;
      }

      const modeButton = event.target.closest?.("[data-sudoku-mode]");
      if (modeButton) {
        event.preventDefault();
        const mode = modeButton.dataset.sudokuMode;
        if (mode === "journey" || mode === "practice") {
          activeMode = mode;
          render();
        }
        return;
      }

      const difficultyButton = event.target.closest?.("[data-sudoku-new]");
      if (difficultyButton) {
        event.preventDefault();
        const difficulty = PRACTICE_DIFFICULTY[difficultyButton.dataset.sudokuNew] ? difficultyButton.dataset.sudokuNew : suggestedDifficulty();
        startNewPractice(difficulty, activeQuestId ? "daily-practice" : "practice");
      }
    });

    els.board?.addEventListener("input", event => {
      const input = event.target.closest?.("input[data-sudoku-cell]");
      if (!input) return;
      const current = currentPuzzle();
      if (!current || current.completedAt) return;
      const index = Number(input.dataset.sudokuCell);
      const value = String(input.value || "").replace(/[^1-9]/g, "").slice(-1);
      input.value = value;
      current.values[index] = value ? Number(value) : 0;
      current.updatedAt = Date.now();
      input.classList.toggle("user-entry-v314g", Boolean(value));
      input.closest(".sudoku-cell-v310")?.classList.toggle("user-filled-v314g", Boolean(value));
      app.saveState({ source: "sudoku-progress" });
      validateCell(input, current, index, false);
      updateStatus(current);
    });

    els.board?.addEventListener("keydown", event => {
      const input = event.target.closest?.("input[data-sudoku-cell]");
      if (!input) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const index = Number(input.dataset.sudokuCell);
      const row = Math.floor(index / 9);
      const col = index % 9;
      const nextRow = Math.max(0, Math.min(8, row + (event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0)));
      const nextCol = Math.max(0, Math.min(8, col + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0)));
      els.board?.querySelector(`input[data-sudoku-cell="${nextRow * 9 + nextCol}"]`)?.focus();
    });
  }

  function open() {
    activeQuestId = "";
    const s = state();
    if (s.journey.active && !s.journey.active.completedAt) activeMode = "journey";
    else if (s.practice.active && !s.practice.active.completedAt) activeMode = "practice";
    else activeMode = "journey";
    render();
    els.dialog?.showModal();
    return true;
  }

  function openForQuest(questId = "") {
    activeQuestId = questId || activeQuestId;
    activeMode = "journey";
    startOrContinueNextLevel("daily", { showDialog: false });
    render();
    return true;
  }

  function close() {
    activeQuestId = "";
    if (els.dialog?.open) els.dialog.close();
  }

  function startOrContinueNextLevel(origin = "journey", { showDialog = true } = {}) {
    const s = state();
    const active = s.journey.active;
    const next = nextJourneyLevel();

    if (active && !active.completedAt && !active.replay) {
      activeMode = "journey";
      render();
      enterFocus(active);
      return true;
    }

    if (!next) {
      app.showToast?.("🧩 Chapter 1 complete — all 50 Sudoku Journey levels are solved.");
      activeMode = "journey";
      render();
      if (showDialog && !els.dialog?.open) els.dialog?.showModal();
      return true;
    }

    startJourneyLevel(next, { replay: false, origin, confirmReplace: false });
    return true;
  }

  function startJourneyLevel(level, { replay = false, origin = "journey", confirmReplace = true } = {}) {
    const def = levelDefinition(level);
    if (!def) return false;
    const completed = completedLevelSet();
    const next = nextJourneyLevel();
    if (!completed.has(level) && level !== next) {
      app.showToast?.(`Level ${level} is still locked. Finish Level ${next || JOURNEY_TOTAL} first.`);
      return false;
    }

    const s = state();
    const current = s.journey.active;
    if (current && !current.completedAt && current.level === level && Boolean(current.replay) === Boolean(replay)) {
      clearLocalResult();
      activeMode = "journey";
      render();
      enterFocus(current);
      return true;
    }
    if (confirmReplace && current && !current.completedAt && current.level !== level) {
      if (!window.confirm(`Switch away from your unfinished Level ${current.level}? Its current entries will be replaced.`)) return false;
    }

    clearLocalResult();
    s.journey.active = createJourneyPuzzle(level, replay, origin);
    activeMode = "journey";
    persist(replay ? "sudoku-replay-start" : "sudoku-journey-start");
    enterFocus(s.journey.active);
    return true;
  }

  function createJourneyPuzzle(level, replay = false, origin = "journey") {
    const def = levelDefinition(level);
    const puzzle = parseGrid(def.puzzle);
    const solution = parseGrid(def.solution);
    return {
      id: journeyPuzzleId(level, replay),
      mode: "journey",
      origin,
      level,
      tier: Number(def.tier || tierForLevel(level)),
      difficulty: tierMeta(def.tier || tierForLevel(level)).difficulty,
      replay: Boolean(replay),
      puzzle,
      solution,
      values: [...puzzle],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
  }

  function startNewPractice(difficulty, origin = "practice") {
    const s = state();
    const current = s.practice.active;
    if (current && !current.completedAt) {
      const meta = PRACTICE_DIFFICULTY[current.difficulty] || PRACTICE_DIFFICULTY.medium;
      if (!window.confirm(`Replace your unfinished ${meta.label} Practice Sudoku with a new one?`)) return false;
    }
    clearLocalResult();
    const seed = `${Date.now()}|${Math.random()}|${difficulty}|${origin}`;
    s.practice.active = createPracticePuzzle(difficulty, seed, origin);
    activeMode = "practice";
    persist("sudoku-practice-new");
    enterFocus(s.practice.active);
    return true;
  }

  function createPracticePuzzle(difficulty = "medium", seed = "life-rpg", origin = "practice") {
    const meta = PRACTICE_DIFFICULTY[difficulty] || PRACTICE_DIFFICULTY.medium;
    const rng = seededRng(seed);
    const base = Array.from({ length: 81 }, (_, i) => pattern(Math.floor(i / 9), i % 9) + 1);
    const solution = transformGrid(base, rng);
    const puzzle = carveUniquePuzzle(solution, meta.givens, rng);
    return {
      id: `sudoku-practice-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      mode: "practice",
      difficulty,
      origin,
      puzzle,
      solution,
      values: [...puzzle],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
  }

  function currentPuzzle() {
    const s = state();
    return activeMode === "practice" ? s.practice.active : s.journey.active;
  }

  function levelDefinition(level) {
    return JOURNEY_LEVELS.find(item => Number(item?.level) === Number(level)) || null;
  }

  function tierForLevel(level) {
    return Math.max(1, Math.min(5, Math.ceil(Number(level || 1) / 10)));
  }

  function tierMeta(tier) {
    return JOURNEY_TIERS[Math.max(1, Math.min(5, Number(tier || 1)))] || JOURNEY_TIERS[1];
  }

  function journeyPuzzleId(level, replay = false) {
    return replay
      ? `sudoku-journey-c${JOURNEY_CHAPTER}-l${String(level).padStart(2, "0")}-replay-${Date.now().toString(36)}`
      : `sudoku-journey-c${JOURNEY_CHAPTER}-l${String(level).padStart(2, "0")}`;
  }

  function completedLevelSet() {
    return new Set(state().journey.completedLevels.map(Number));
  }

  function nextJourneyLevel() {
    const completed = completedLevelSet();
    for (let level = 1; level <= JOURNEY_TOTAL; level += 1) {
      if (!completed.has(level)) return level;
    }
    return null;
  }

  function journeyCompletedCount() {
    return completedLevelSet().size;
  }

  function journeyDailyDoneToday() {
    const today = todayKey();
    return state().completed.some(item => item?.mode === "journey" && !item?.replay && localDateKey(item.completedAt) === today);
  }

  function journeyLevelCompletedToday() {
    const today = todayKey();
    const item = [...state().completed].reverse().find(entry => entry?.mode === "journey" && !entry?.replay && localDateKey(entry.completedAt) === today);
    return Number(item?.level || 0) || null;
  }

  function suggestedDifficulty() {
    const checkIn = app.getState().dailyPlanner?.days?.[todayKey()]?.checkIn || {};
    const health = checkIn.health && typeof checkIn.health === "object" ? checkIn.health : {};
    const impact = String(health.impact || "none");
    const illness = String(health.illness || "no");
    if (illness === "yes" || ["moderate", "strong"].includes(impact)) return "easy";
    if (["fumes", "low"].includes(checkIn.energy) || checkIn.sleep === "bad" || checkIn.stress === "overload") return "easy";
    if (checkIn.energy === "lots" && impact === "none" && ["fine", "great"].includes(checkIn.sleep || "fine") && ["calm", "light"].includes(checkIn.stress || "light")) return "hard";
    return "medium";
  }

  function availabilityForQuest(quest) {
    if (quest?.systemRole !== "sudoku") return null;
    const active = state().journey.active;
    const next = nextJourneyLevel();
    if (active && !active.completedAt && !active.replay) {
      const openCells = active.puzzle.reduce((sum, value, index) => sum + (!value && !active.values[index] ? 1 : 0), 0);
      return { available: true, reason: `Sudoku Journey Level ${active.level} in progress · ${openCells} cells left` };
    }
    if (!next) return { available: true, reason: "Sudoku Journey Chapter 1 complete · Practice Mode available" };
    const checkIn = app.getState().dailyPlanner?.days?.[todayKey()]?.checkIn || {};
    const health = checkIn.health && typeof checkIn.health === "object" ? checkIn.health : {};
    const tier = tierForLevel(next);
    const recoveryHeavy = health.illness === "yes" || ["moderate", "strong"].includes(String(health.impact || "none"));
    const veryLowCapacity = ["fumes", "low"].includes(checkIn.energy) || checkIn.stress === "overload";
    if ((recoveryHeavy && tier >= 4) || (veryLowCapacity && tier >= 5)) {
      return { available: false, reason: `Journey Level ${next} is a stronger logic challenge today · optional Easy Practice remains available in Sudoku` };
    }
    return { available: true, reason: `Sudoku Journey Level ${next} ready in-app` };
  }

  function contextForQuest(quest) {
    if (quest?.systemRole !== "sudoku") return null;
    const active = state().journey.active;
    const next = nextJourneyLevel();
    if (active && !active.completedAt && !active.replay) {
      const userCells = active.puzzle.filter(v => !v).length;
      const filled = active.values.reduce((sum, value, index) => sum + (!active.puzzle[index] && value ? 1 : 0), 0);
      return {
        label: `🧩 Sudoku Journey · Level ${active.level} · ${filled}/${userCells} cells filled`,
        goal: `Continue and solve Sudoku Journey Level ${active.level} directly in Life RPG.`
      };
    }
    if (!next) return { label: "🧩 Sudoku Journey · 50/50 complete", goal: "Play any Practice Sudoku if you want an extra logic session." };
    return {
      label: `🧩 Sudoku Journey · Level ${next}`,
      goal: `Complete your next Sudoku Journey level: Level ${next}.`
    };
  }

  function render() {
    const s = state();
    const current = currentPuzzle();
    renderLaunchStatus();
    renderDailyCard();
    renderJourneyProgress();
    renderLevelGrid();
    renderModeBar();
    renderPractice();
    renderRewardPreview(current);
    renderBoard(current);
    renderResult(current);
    syncFocusHeader(current);
  }

  function renderLaunchStatus() {
    const stats = state().stats;
    const completed = journeyCompletedCount();
    const next = nextJourneyLevel();
    const journeyActive = state().journey.active;
    let quick = next ? `Journey ${completed}/${JOURNEY_TOTAL} · next Level ${next}` : `Journey ${JOURNEY_TOTAL}/${JOURNEY_TOTAL} complete`;
    if (journeyActive && !journeyActive.completedAt && !journeyActive.replay) quick = `Continue Journey Level ${journeyActive.level}`;
    if (els.quickStatus) els.quickStatus.textContent = quick;
    if (els.growthStats) {
      els.growthStats.innerHTML = `<span><b>${completed}/${JOURNEY_TOTAL}</b> Journey</span><span><b>${stats.solved}</b> rewarded solves</span><span>${journeyDailyDoneToday() ? "✓ Daily complete" : "○ Daily ready"}</span>`;
    }
    if (els.trainingStats) els.trainingStats.textContent = next ? `Level ${next} / ${JOURNEY_TOTAL}` : `${JOURNEY_TOTAL}/${JOURNEY_TOTAL} complete`;
  }

  function renderDailyCard() {
    if (!els.dailyCard) return;
    const next = nextJourneyLevel();
    const active = state().journey.active;
    const done = journeyDailyDoneToday();
    const todayLevel = journeyLevelCompletedToday();
    const targetLevel = active && !active.completedAt && !active.replay ? active.level : next;
    const targetDef = targetLevel ? levelDefinition(targetLevel) : null;
    const targetMeta = targetDef ? tierMeta(targetDef.tier) : null;

    if (!next && !(active && !active.completedAt && !active.replay)) {
      els.dailyCard.innerHTML = `<div class="sudoku-daily-icon-v314h">🏆</div><div class="sudoku-daily-copy-v314h"><small>SUDOKU JOURNEY · CHAPTER 1</small><strong>50 / 50 complete</strong><p>You cleared every Chapter 1 level. Practice Mode stays open for extra logic sessions.</p></div><span class="sudoku-daily-done-v314h">Complete</span>`;
      return;
    }

    const actionLabel = active && !active.completedAt && !active.replay ? `Continue Level ${active.level}` : `Start Level ${next}`;
    els.dailyCard.innerHTML = `
      <div class="sudoku-daily-icon-v314h">${done ? "✓" : "🧩"}</div>
      <div class="sudoku-daily-copy-v314h">
        <small>DAILY SUDOKU · TODAY'S LOGIC TRAINING</small>
        <strong>${done ? `Daily complete · Level ${todayLevel}` : `Level ${targetLevel} · ${escapeHtml(targetMeta?.label || "Journey")}`}</strong>
        <p>${done ? `You already completed today's Journey Sudoku. Level ${next || JOURNEY_TOTAL} is still available if you feel like continuing.` : "One Journey level completes today's Sudoku Daily. No streak loss or penalty if today is not a Sudoku day."}</p>
      </div>
      <button class="${done ? "secondary-button" : "primary-button"} sudoku-daily-button-v314h" data-sudoku-daily-start type="button">${done ? (active && !active.completedAt && !active.replay ? actionLabel : next ? `Continue with Level ${next}` : "Practice instead") : actionLabel}</button>`;
  }

  function renderJourneyProgress() {
    if (!els.progress) return;
    const completed = journeyCompletedCount();
    const next = nextJourneyLevel();
    const percent = JOURNEY_TOTAL ? Math.round((completed / JOURNEY_TOTAL) * 100) : 0;
    els.progress.innerHTML = `
      <div class="sudoku-progress-head-v314h"><div><small>SUDOKU JOURNEY · CHAPTER 1</small><strong>${completed} / ${JOURNEY_TOTAL} levels complete</strong></div><span>${percent}%</span></div>
      <div class="sudoku-progress-track-v314h"><i style="width:${percent}%"></i></div>
      <p>${next ? `Next up: Level ${next}. Difficulty rises gradually; Level 50 is the Chapter 1 challenge, not an extreme puzzle.` : "Chapter complete. Future chapters can extend the Journey beyond Level 50 later."}</p>`;
  }

  function renderLevelGrid() {
    if (!els.levelGrid) return;
    const completed = completedLevelSet();
    const next = nextJourneyLevel();
    const active = state().journey.active;
    els.levelGrid.innerHTML = Array.from({ length: JOURNEY_TOTAL }, (_, index) => index + 1).map(level => {
      const isDone = completed.has(level);
      const isCurrent = level === next;
      const isActive = activeMode === "journey" && active && !active.completedAt && Number(active.level) === level;
      const locked = !isDone && !isCurrent;
      const classes = ["sudoku-level-v314h", isDone ? "done" : "", isCurrent ? "current" : "", isActive ? "active" : "", locked ? "locked" : ""].filter(Boolean).join(" ");
      const label = isDone ? `Level ${level}, completed. Replay level.` : locked ? `Level ${level}, locked.` : `Level ${level}, current level.`;
      return `<button class="${classes}" data-sudoku-level="${level}" type="button" ${locked ? "disabled" : ""} aria-label="${label}"><span>${isDone ? "✓" : locked ? "·" : "▶"}</span><b>${level}</b></button>`;
    }).join("");
  }

  function renderModeBar() {
    if (!els.modeBar) return;
    els.modeBar.innerHTML = `
      <button class="${activeMode === "journey" ? "active" : ""}" data-sudoku-mode="journey" type="button">Journey</button>
      <button class="${activeMode === "practice" ? "active" : ""}" data-sudoku-mode="practice" type="button">Practice</button>`;
  }

  function renderPractice() {
    if (!els.practice) return;
    els.practice.hidden = activeMode !== "practice";
    const suggested = suggestedDifficulty();
    const current = state().practice.active;
    const health = app.getState().dailyPlanner?.days?.[todayKey()]?.checkIn?.health || {};
    const reason = current && !current.completedAt
      ? `You have a ${PRACTICE_DIFFICULTY[current.difficulty]?.label || "Practice"} puzzle saved. Starting another Practice puzzle will replace only that Practice board — your Journey is safe.`
      : health.illness === "yes" || ["moderate", "strong"].includes(health.impact)
        ? "Your check-in points to a recovery-heavy day, so Easy is the suggested optional practice level."
        : `Today's optional Practice suggestion is ${PRACTICE_DIFFICULTY[suggested].label}. Practice never changes your Journey level.`;
    els.practice.innerHTML = `
      <div class="sudoku-practice-head-v314h"><div><small>PRACTICE MODE</small><strong>Extra random puzzles</strong><p>${escapeHtml(reason)}</p></div></div>
      <div class="sudoku-difficulty-grid-v314" aria-label="Choose Practice Sudoku difficulty">
        ${Object.entries(PRACTICE_DIFFICULTY).map(([key, meta]) => `<button class="sudoku-difficulty-card-v314 ${key === suggested ? "recommended" : ""}" data-sudoku-new="${key}" type="button"><span>${meta.icon}</span><strong>${meta.label}</strong><small>${key === "easy" ? "Gentle logic" : key === "medium" ? "Normal challenge" : "Stronger challenge"}</small></button>`).join("")}
      </div>`;
  }

  function renderRewardPreview(current) {
    if (!els.rewardPreview) return;
    const previewTarget = current || journeyPreviewPuzzle();
    if (!previewTarget) {
      els.rewardPreview.innerHTML = `<div class="sudoku-reward-head-v314"><div><small>CHAPTER COMPLETE</small><strong>Practice puzzles still award normal Knowledge activity rewards.</strong></div><span>🏆</span></div>`;
      return;
    }

    if (previewTarget.mode === "journey" && previewTarget.replay) {
      els.rewardPreview.innerHTML = `<div class="sudoku-reward-head-v314"><div><small>REPLAY · LEVEL ${previewTarget.level}</small><strong>Replay this completed puzzle for fun or practice.</strong></div><span>↻</span></div><p>Replays do not pay the level reward again and do not advance achievements a second time.</p>`;
      return;
    }

    const reward = rewardForPuzzle(previewTarget);
    const label = previewTarget.mode === "journey"
      ? `LEVEL ${previewTarget.level} · ${tierMeta(previewTarget.tier).label.toUpperCase()}`
      : `${PRACTICE_DIFFICULTY[previewTarget.difficulty]?.label.toUpperCase() || "PRACTICE"} PRACTICE`;
    const description = previewTarget.mode === "journey" ? tierMeta(previewTarget.tier).description : PRACTICE_DIFFICULTY[previewTarget.difficulty]?.description;
    const icon = previewTarget.mode === "journey" ? tierMeta(previewTarget.tier).icon : PRACTICE_DIFFICULTY[previewTarget.difficulty]?.icon;
    const repeatNote = reward.repeatScale < 1
      ? `This is Sudoku #${rewardedSudokusTodayCount() + 1} today, so the activity reward is ${Math.round(reward.repeatScale * 100)}%. Journey completion itself still counts fully.`
      : "First rewarded Sudoku today: full value. More same-day puzzles stay rewarded with diminishing returns.";

    els.rewardPreview.innerHTML = `
      <div class="sudoku-reward-head-v314"><div><small>ON SOLVE · ${escapeHtml(label)}</small><strong>${escapeHtml(description || "Logic practice")}</strong></div><span>${icon || "🧩"}</span></div>
      <div class="sudoku-reward-grid-v314">
        <span><b>+${reward.xp}</b><small>Character XP</small></span>
        <span><b>+${reward.realmXP}</b><small>Knowledge XP</small></span>
        <span><b>+${reward.statXP}</b><small>Logic / Knowledge</small></span>
        <span><b>+${app.formatEnergy?.(reward.storyEnergy ?? reward.storyEnergyBase) ?? reward.storyEnergyBase}</b><small>Story Energy</small></span>
        <span><b>+${reward.coins}</b><small>Coins</small></span>
      </div>
      <p>${escapeHtml(repeatNote)}</p>`;
  }

  function journeyPreviewPuzzle() {
    const next = nextJourneyLevel();
    if (!next) return null;
    const def = levelDefinition(next);
    return { mode: "journey", level: next, tier: Number(def?.tier || tierForLevel(next)), difficulty: tierMeta(def?.tier || tierForLevel(next)).difficulty, replay: false };
  }

  function renderBoard(current) {
    if (!els.board) return;
    const next = nextJourneyLevel();
    if (!current) {
      els.board.innerHTML = `<div class="sudoku-empty-v310"><span>🧩</span><strong>${activeMode === "journey" ? (next ? `Level ${next} is ready.` : "Journey complete.") : "No Practice puzzle open."}</strong><p>${activeMode === "journey" ? (next ? "Start today's level above, or choose it from the Journey map." : "You cleared all 50 Chapter 1 levels. Practice Mode is still available.") : "Choose Easy, Medium or Hard in Practice Mode."}</p></div>`;
      if (els.title) els.title.textContent = activeMode === "journey" ? "Sudoku Journey" : "Sudoku Practice";
      if (els.meta) els.meta.textContent = activeMode === "journey" ? `Knowledge Realm · Logical Thinking · Chapter 1` : "Knowledge Realm · Logical Thinking · Practice Mode";
      if (els.status) els.status.textContent = activeMode === "journey" ? `${journeyCompletedCount()}/${JOURNEY_TOTAL} Journey levels complete` : "Practice puzzles save automatically as you play.";
      setActionDisabled(true);
      return;
    }

    const isJourney = current.mode === "journey";
    const meta = isJourney ? tierMeta(current.tier) : PRACTICE_DIFFICULTY[current.difficulty] || PRACTICE_DIFFICULTY.medium;
    if (els.title) els.title.textContent = isJourney ? `${meta.icon} Sudoku Journey · Level ${current.level}` : `${meta.icon} ${meta.label} Practice Sudoku`;
    if (els.meta) els.meta.textContent = isJourney
      ? `Knowledge Realm · Logical Thinking · Chapter 1 · ${meta.label}${current.replay ? " · Replay" : ""}`
      : `Knowledge Realm · Logical Thinking · Practice Mode · progress saves automatically`;

    els.board.innerHTML = current.puzzle.map((given, index) => {
      const value = current.values[index] || "";
      const row = Math.floor(index / 9);
      const col = index % 9;
      const isUserFilled = !given && Boolean(value);
      const cls = ["sudoku-cell-v310", col % 3 === 2 && col !== 8 ? "box-right" : "", row % 3 === 2 && row !== 8 ? "box-bottom" : "", isUserFilled ? "user-filled-v314g" : ""].filter(Boolean).join(" ");
      const inputClass = isUserFilled ? "user-entry-v314g" : "";
      return `<label class="${cls}"><input class="${inputClass}" inputmode="numeric" pattern="[1-9]*" maxlength="1" aria-label="Sudoku row ${row + 1}, column ${col + 1}" data-sudoku-cell="${index}" ${given || current.completedAt ? "disabled" : ""} value="${value || ""}" /></label>`;
    }).join("");
    els.board.querySelectorAll("input[data-sudoku-cell]").forEach(input => validateCell(input, current, Number(input.dataset.sudokuCell), false));
    updateStatus(current);
    setActionDisabled(Boolean(current.completedAt));
  }

  function enterFocus(current = currentPuzzle()) {
    if (!current || !els.play || !window.LifeRPGTrainingFocus?.enter) return false;
    if (els.dialog?.open) els.dialog.close();
    const isJourney = current.mode === "journey";
    const meta = isJourney ? tierMeta(current.tier) : PRACTICE_DIFFICULTY[current.difficulty] || PRACTICE_DIFFICULTY.medium;
    return window.LifeRPGTrainingFocus.enter({
      id: "sudoku",
      node: els.play,
      title: isJourney ? `Sudoku Journey · Level ${current.level}` : `${meta.label} Sudoku Practice`,
      subtitle: isJourney ? `Chapter 1 · ${meta.label}${current.replay ? " · Replay" : ""}` : "Practice Mode · progress saves automatically",
      tone: "light",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function syncFocusHeader(current) {
    if (!current || !window.LifeRPGTrainingFocus?.isActive?.("sudoku")) return;
    const isJourney = current.mode === "journey";
    const meta = isJourney ? tierMeta(current.tier) : PRACTICE_DIFFICULTY[current.difficulty] || PRACTICE_DIFFICULTY.medium;
    window.LifeRPGTrainingFocus.update({
      title: isJourney ? `Sudoku Journey · Level ${current.level}` : `${meta.label} Sudoku Practice`,
      subtitle: current.completedAt ? "Solved ✓" : isJourney ? `${meta.label}${current.replay ? " · Replay" : ""}` : "Practice Mode"
    });
  }

  function renderResult(current) {
    if (!els.result) return;
    if (!current?.completedAt) {
      if (els.result.dataset.transient !== "true") els.result.classList.add("hidden");
      return;
    }
    delete els.result.dataset.transient;
    const event = current.rewardEventId ? (app.getState().rewardLedger?.events || []).find(item => item?.id === current.rewardEventId) : null;
    const replay = current.mode === "journey" && (current.replay || !event);
    const next = current.mode === "journey" ? nextJourneyLevel() : null;
    const reward = event ? { xp:Number(event.xp||0), realmXP:Number(event.realmXP||0), statXP:Number(event.statXP||0), storyEnergy:Number(event.storyEnergy||0), coins:Number(event.coins||0) } : null;
    const rewards = reward ? `<div class="training-result-rewards-v314o"><span>+${reward.xp} XP</span><span>+${reward.realmXP} Knowledge XP</span><span>+${reward.statXP} Logic XP</span><span>+${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} Story Energy</span><span>+${reward.coins} Coins</span></div>` : "";
    const nextAction = current.mode === "journey" && next ? `<button class="primary-button" data-sudoku-next-level type="button">Start Level ${next}</button>` : "";
    els.result.className = "training-result-v314o is-success";
    els.result.innerHTML = `<span>✓</span><strong>${current.mode === "journey" ? `Level ${current.level} solved correctly!` : "Practice Sudoku solved correctly!"}</strong><p>${replay ? "Replay complete — your Journey progress stays unchanged and no duplicate reward is paid." : current.mode === "journey" ? (next ? `Your rewards are saved and Level ${next} is unlocked.` : "Your rewards are saved. Chapter 1 is complete!") : "Your Practice reward has been saved to Life RPG."}</p>${rewards}<div class="training-result-actions-v314o">${nextAction}<button class="secondary-button" data-sudoku-return type="button">Back to Sudoku Journey</button></div>`;
  }

  function clearLocalResult() {
    if (!els.result) return;
    delete els.result.dataset.transient;
    els.result.classList.add("hidden");
    els.result.innerHTML = "";
  }

  function showLocalResult({ kind = "error", icon = "◇", title = "Check the puzzle", message = "" } = {}) {
    if (!els.result) return;
    els.result.dataset.transient = "true";
    els.result.className = `training-result-v314o is-${kind}`;
    els.result.innerHTML = `<span>${escapeHtml(icon)}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>`;
    els.result.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }

  function setActionDisabled(disabled) {
    if (els.clear) els.clear.disabled = Boolean(disabled);
    if (els.check) els.check.disabled = Boolean(disabled);
  }

  function updateStatus(current) {
    if (!els.status || !current) return;
    const userCells = current.puzzle.filter(v => !v).length;
    const filled = current.values.reduce((sum, value, index) => sum + (!current.puzzle[index] && value ? 1 : 0), 0);
    if (current.completedAt) {
      els.status.textContent = current.mode === "journey"
        ? current.replay ? `Level ${current.level} replay solved ✓ · no duplicate rewards` : `Level ${current.level} solved ✓ · Journey progress saved`
        : "Practice Sudoku solved ✓ · rewards logged";
      return;
    }
    els.status.textContent = `${filled}/${userCells} open cells filled · progress saved automatically`;
  }

  function clearEntries() {
    const current = currentPuzzle();
    if (!current || current.completedAt) return;
    if (!window.confirm("Clear all numbers you entered in this Sudoku? The original clues will stay.")) return;
    current.values = [...current.puzzle];
    current.updatedAt = Date.now();
    persist("sudoku-clear");
  }

  function checkPuzzle() {
    const current = currentPuzzle();
    if (!current || current.completedAt) return;
    const incomplete = current.values.some(v => !v);
    const wrong = current.values.some((v, i) => v !== current.solution[i]);
    if (incomplete || wrong) {
      els.board?.querySelectorAll("input[data-sudoku-cell]").forEach(input => validateCell(input, current, Number(input.dataset.sudokuCell), true));
      showLocalResult({
        kind: "error",
        icon: "◇",
        title: incomplete ? "Not finished yet" : "Something still needs another look",
        message: incomplete ? "A few Sudoku cells are still empty. Keep going — your progress is saved." : "At least one number is incorrect. The highlighted cells can help you find it."
      });
      updateStatus(current);
      return;
    }
    completePuzzle(current);
  }

  function completePuzzle(current) {
    if (current.completedAt) return;
    if (current.mode === "journey") completeJourneyPuzzle(current);
    else completePracticePuzzle(current);
  }

  function completeJourneyPuzzle(current) {
    const alreadyCompleted = completedLevelSet().has(Number(current.level));
    current.completedAt = Date.now();
    current.updatedAt = current.completedAt;

    if (current.replay || alreadyCompleted) {
      state().completed.push({
        id: current.id,
        mode: "journey",
        level: current.level,
        difficulty: current.difficulty,
        replay: true,
        completedAt: current.completedAt,
        rewardEventId: null,
        reward: { xp: 0, realmXP: 0, statXP: 0, coins: 0, storyEnergy: 0 }
      });
      app.saveState({ source: "sudoku-replay-solved" });
      render();
      app.renderAll?.();
      app.showToast?.(`↻ Level ${current.level} replay solved · no duplicate rewards`);
      window.setTimeout(() => els.result?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 40);
      return;
    }

    const reward = awardPuzzle(current);
    state().journey.completedLevels.push(Number(current.level));
    state().journey.completedLevels = [...new Set(state().journey.completedLevels)].sort((a, b) => a - b);
    incrementStats(current.difficulty);
    recordCompleted(current, reward, { replay: false });
    recordQuestCompletion(current, reward);
    app.saveState({ source: "sudoku-journey-solved" });
    render();
    app.renderAll?.();
    const next = nextJourneyLevel();
    app.showToast?.(`🧩 Level ${current.level} complete · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙${next ? ` · Level ${next} unlocked` : " · Chapter 1 complete!"}`);
    window.setTimeout(() => els.result?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 40);
  }

  function completePracticePuzzle(current) {
    current.completedAt = Date.now();
    current.updatedAt = current.completedAt;
    const reward = awardPuzzle(current);
    incrementStats(current.difficulty);
    recordCompleted(current, reward, { replay: false });
    recordQuestCompletion(current, reward);
    app.saveState({ source: "sudoku-practice-solved" });
    render();
    app.renderAll?.();
    const meta = PRACTICE_DIFFICULTY[current.difficulty] || PRACTICE_DIFFICULTY.medium;
    app.showToast?.(`🧩 ${meta.label} Practice solved · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙`);
    window.setTimeout(() => els.result?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 40);
  }

  function awardPuzzle(current) {
    const root = app.getState();
    const sourceId = current.mode === "journey" ? `journey-c${JOURNEY_CHAPTER}-l${current.level}` : current.id;
    const existingEvent = (root.rewardLedger?.events || []).find(event => event?.source === "sudoku-complete" && event?.sourceId === sourceId);
    if (existingEvent) {
      current.rewardEventId = existingEvent.id;
      return {
        eventId: existingEvent.id,
        xp: Number(existingEvent.xp || 0),
        realmXP: Number(existingEvent.realmXP || 0),
        statXP: Number(existingEvent.statXP || 0),
        coins: Number(existingEvent.coins || 0),
        storyEnergy: Number(existingEvent.storyEnergy || 0),
        rawStoryEnergy: Number(existingEvent.rawStoryEnergy || 0)
      };
    }

    const preview = rewardForPuzzle(current);
    const label = current.mode === "journey" ? `Sudoku Journey · Level ${current.level}` : `${PRACTICE_DIFFICULTY[current.difficulty]?.label || "Sudoku"} Practice Sudoku`;
    const reward = app.awardActivity?.({
      source: "sudoku-complete",
      sourceId,
      label,
      realm: "Knowledge",
      capability: "knowledge",
      xp: preview.xp,
      realmXP: preview.realmXP,
      statXP: preview.statXP,
      coins: preview.coins,
      storyEnergyBase: preview.storyEnergyBase,
      progressionRelevant: true,
      metadata: {
        difficulty: current.difficulty,
        sudoku: true,
        mode: current.mode,
        journey: current.mode === "journey",
        level: current.mode === "journey" ? current.level : null,
        tier: current.mode === "journey" ? current.tier : null,
        origin: current.origin || current.mode,
        repeatScale: preview.repeatScale,
        puzzleId: current.id
      }
    }) || { xp: 0, realmXP: 0, statXP: 0, coins: 0, storyEnergy: 0, rawStoryEnergy: 0, eventId: null };
    current.rewardEventId = reward.eventId || null;
    return reward;
  }

  function rewardForPuzzle(current, solvedBeforeToday = rewardedSudokusTodayCount()) {
    const meta = current?.mode === "journey" ? tierMeta(current.tier || tierForLevel(current.level)) : PRACTICE_DIFFICULTY[current?.difficulty] || PRACTICE_DIFFICULTY.medium;
    const repeatScale = REPEAT_SCALES[Math.min(solvedBeforeToday, REPEAT_SCALES.length - 1)];
    const requested = {
      xp: Math.max(1, Math.round(meta.xp * repeatScale)),
      realmXP: Math.max(1, Math.round(meta.xp * repeatScale)),
      statXP: Math.max(1, Math.round(meta.statXP * repeatScale)),
      coins: Math.max(1, Math.round(meta.coins * repeatScale)),
      storyEnergyBase: floor2(meta.storyEnergyBase * repeatScale)
    };
    const label = current?.mode === "journey" ? `Sudoku Journey · Level ${current.level}` : `${meta.label} Practice Sudoku solved`;
    const preview = app.previewActivityReward?.({
      source: "sudoku-complete",
      label,
      realm: "Knowledge",
      capability: "knowledge",
      ...requested,
      progressionRelevant: true
    }) || { ...requested, storyEnergy: requested.storyEnergyBase };
    return { ...requested, ...preview, repeatScale };
  }

  function incrementStats(difficulty) {
    const stats = state().stats;
    stats.solved += 1;
    const key = PRACTICE_DIFFICULTY[difficulty] ? difficulty : "medium";
    stats[key] = Number(stats[key] || 0) + 1;
  }

  function recordCompleted(current, reward, { replay = false } = {}) {
    state().completed.push({
      id: current.id,
      mode: current.mode,
      level: current.mode === "journey" ? Number(current.level) : null,
      tier: current.mode === "journey" ? Number(current.tier) : null,
      difficulty: current.difficulty,
      origin: current.origin || current.mode,
      replay: Boolean(replay),
      completedAt: current.completedAt,
      rewardEventId: reward.eventId || current.rewardEventId || null,
      reward: {
        xp: Number(reward.xp || 0),
        realmXP: Number(reward.realmXP || 0),
        statXP: Number(reward.statXP || 0),
        coins: Number(reward.coins || 0),
        storyEnergy: Number(reward.storyEnergy || 0)
      }
    });
    state().completed = state().completed.slice(-400);
  }

  function recordQuestCompletion(current, reward) {
    if (!reward?.eventId) return;
    const root = app.getState();
    if (!Array.isArray(root.completionLog)) root.completionLog = [];
    if (root.completionLog.some(log => log?.sudokuPuzzleId === current.id || (current.mode === "journey" && Number(log?.sudokuJourneyLevel) === Number(current.level)))) return;
    const quest = (app.getQuestCatalog?.() || []).find(item => item.systemRole === "sudoku");
    if (!quest) return;
    root.completionLog.push({
      id: `log-sudoku-${current.id}`,
      questId: quest.id,
      questName: current.mode === "journey" ? `🧩 Sudoku Journey · Level ${current.level}` : quest.name,
      realm: "Knowledge",
      units: 1,
      unitLabel: "puzzle",
      xp: Number(reward.xp || 0),
      stat: "knowledge",
      statXP: Number(reward.statXP || 0),
      storyEnergy: Number(reward.storyEnergy || 0),
      rawStoryEnergy: Number(reward.rawStoryEnergy || reward.storyEnergy || 0),
      coins: Number(reward.coins || 0),
      rewardEventId: reward.eventId || null,
      deduped: false,
      batchCount: 0,
      batchRemainder: 0,
      sudokuPuzzleId: current.id,
      sudokuMode: current.mode,
      sudokuJourneyLevel: current.mode === "journey" ? Number(current.level) : null,
      sudokuDifficulty: current.difficulty,
      at: new Date(current.completedAt).toISOString()
    });
  }

  function rewardedSudokusTodayCount() {
    const today = todayKey();
    return state().completed.filter(item => item?.rewardEventId && localDateKey(item.completedAt) === today).length;
  }

  function validateCell(input, current, index, showWrong = false) {
    const given = current.puzzle[index];
    const value = current.values[index];
    input.classList.toggle("given", Boolean(given));
    input.classList.remove("wrong");
    if (showWrong && !given && value && value !== current.solution[index]) input.classList.add("wrong");
  }

  function parseGrid(value) {
    const text = String(value || "").replace(/[^0-9]/g, "").slice(0, 81);
    return Array.from({ length: 81 }, (_, index) => Math.max(0, Math.min(9, Number(text[index] || 0))));
  }

  function pattern(r, c) { return (r * 3 + Math.floor(r / 3) + c) % 9; }

  function transformGrid(base, rng) {
    let grid = [...base];
    const nums = shuffle([1,2,3,4,5,6,7,8,9], rng);
    grid = grid.map(v => nums[v - 1]);
    const bandOrder = shuffle([0,1,2], rng);
    const rowOrder = bandOrder.flatMap(band => shuffle([0,1,2], rng).map(row => band * 3 + row));
    const stackOrder = shuffle([0,1,2], rng);
    const colOrder = stackOrder.flatMap(stack => shuffle([0,1,2], rng).map(col => stack * 3 + col));
    const transformed = [];
    rowOrder.forEach(r => colOrder.forEach(c => transformed.push(grid[r * 9 + c])));
    return transformed;
  }

  function carveUniquePuzzle(solution, targetGivens, rng) {
    const puzzle = [...solution];
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
    let givens = 81;
    for (const index of order) {
      if (givens <= targetGivens) break;
      const keep = puzzle[index];
      puzzle[index] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[index] = keep;
      else givens -= 1;
    }
    return puzzle;
  }

  function countSolutions(grid, limit = 2) {
    const board = [...grid];
    let count = 0;
    function solve() {
      if (count >= limit) return;
      let bestIndex = -1;
      let bestCandidates = null;
      for (let i = 0; i < 81; i += 1) {
        if (board[i]) continue;
        const candidates = candidatesFor(board, i);
        if (!candidates.length) return;
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          bestIndex = i;
          bestCandidates = candidates;
          if (candidates.length === 1) break;
        }
      }
      if (bestIndex < 0) {
        count += 1;
        return;
      }
      for (const value of bestCandidates) {
        board[bestIndex] = value;
        solve();
        board[bestIndex] = 0;
        if (count >= limit) return;
      }
    }
    solve();
    return count;
  }

  function candidatesFor(board, index) {
    const used = new Set();
    const row = Math.floor(index / 9);
    const col = index % 9;
    for (let i = 0; i < 9; i += 1) {
      used.add(board[row * 9 + i]);
      used.add(board[i * 9 + col]);
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) used.add(board[(boxRow + r) * 9 + boxCol + c]);
    }
    return [1,2,3,4,5,6,7,8,9].filter(value => !used.has(value));
  }

  function seededRng(seed) {
    let h = 2166136261;
    for (let i = 0; i < String(seed).length; i += 1) {
      h ^= String(seed).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, rng) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function todayKey() { return localDateKey(Date.now()); }
  function localDateKey(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function floor2(value) { return Math.floor((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  window.LifeRPGSudoku = {
    open,
    openForQuest,
    availabilityForQuest,
    contextForQuest,
    getStats: () => ({ ...state().stats, journeyCompleted: journeyCompletedCount(), journeyTotal: JOURNEY_TOTAL, nextLevel: nextJourneyLevel(), dailyDone: journeyDailyDoneToday() }),
    getActive: () => {
      const current = currentPuzzle();
      return current ? JSON.parse(JSON.stringify(current)) : null;
    },
    suggestedDifficulty,
    render
  };
})();
