(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const SCHEMA = 2;
  const DIFFICULTY = {
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
  const REPEAT_SCALES = [1, 0.75, 0.5, 0.35];

  const els = {
    dialog: byId("sudokuDialog"),
    close: byId("sudokuClose"),
    title: byId("sudokuTitle"),
    meta: byId("sudokuMeta"),
    suggestion: byId("sudokuSuggestion"),
    rewardPreview: byId("sudokuRewardPreview"),
    board: byId("sudokuBoard"),
    status: byId("sudokuStatus"),
    clear: byId("sudokuClearButton"),
    check: byId("sudokuCheckButton"),
    quickStatus: byId("sudokuQuickStatus"),
    growthStats: byId("sudokuGrowthStats")
  };

  let activeQuestId = "";

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
      stats: { solved: 0, easy: 0, medium: 0, hard: 0 }
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.sudoku || typeof root.sudoku !== "object" || Array.isArray(root.sudoku)) root.sudoku = defaultState();
    const state = root.sudoku;
    state.schemaVersion = SCHEMA;
    if (!Array.isArray(state.completed)) state.completed = [];
    if (!state.stats || typeof state.stats !== "object") state.stats = defaultState().stats;
    ["solved", "easy", "medium", "hard"].forEach(key => state.stats[key] = Math.max(0, Number(state.stats[key] || 0)));

    if (state.active && (!Array.isArray(state.active.puzzle) || state.active.puzzle.length !== 81 || !Array.isArray(state.active.solution) || state.active.solution.length !== 81)) {
      state.active = null;
    }
    if (state.active) {
      if (!Array.isArray(state.active.values) || state.active.values.length !== 81) state.active.values = [...state.active.puzzle];
      state.active.difficulty = DIFFICULTY[state.active.difficulty] ? state.active.difficulty : "medium";
      state.active.origin ||= "free";
      state.active.createdAt = Number(state.active.createdAt || Date.now());
      state.active.updatedAt = Number(state.active.updatedAt || state.active.createdAt);
    }

    state.completed = state.completed
      .filter(item => item && item.id)
      .slice(-300);
    return state;
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

      const difficultyButton = event.target.closest?.("[data-sudoku-new]");
      if (difficultyButton) {
        event.preventDefault();
        const difficulty = DIFFICULTY[difficultyButton.dataset.sudokuNew] ? difficultyButton.dataset.sudokuNew : suggestedDifficulty();
        startNewPuzzle(difficulty, activeQuestId ? "daily" : "free");
      }
    });

    els.board?.addEventListener("input", event => {
      const input = event.target.closest?.("input[data-sudoku-cell]");
      if (!input) return;
      const index = Number(input.dataset.sudokuCell);
      const value = String(input.value || "").replace(/[^1-9]/g, "").slice(-1);
      input.value = value;
      const current = state().active;
      if (!current || current.completedAt) return;
      current.values[index] = value ? Number(value) : 0;
      current.updatedAt = Date.now();
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
    render();
    els.dialog?.showModal();
    return true;
  }

  function openForQuest(questId = "") {
    activeQuestId = questId || activeQuestId;
    let current = state().active;
    if (!current || current.completedAt) {
      const difficulty = suggestedDifficulty();
      current = createPuzzle(difficulty, `${todayKey()}|${difficulty}|daily`, "daily");
      state().active = current;
      app.saveState({ source: "sudoku-start" });
    } else {
      current.origin = current.origin || "daily";
    }
    render();
    els.dialog?.showModal();
    return true;
  }

  function close() {
    activeQuestId = "";
    if (els.dialog?.open) els.dialog.close();
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
    const current = state().active;
    if (current && !current.completedAt) {
      const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
      const openCells = current.puzzle.reduce((sum, value, index) => sum + (!value && !current.values[index] ? 1 : 0), 0);
      return { available: true, reason: `${meta.label} Sudoku in progress · ${openCells} cells left` };
    }
    return { available: true, reason: `${DIFFICULTY[suggestedDifficulty()].label} Sudoku ready in-app` };
  }

  function contextForQuest(quest) {
    if (quest?.systemRole !== "sudoku") return null;
    const current = state().active;
    const difficulty = current && !current.completedAt ? current.difficulty : suggestedDifficulty();
    const meta = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    const userCells = current && !current.completedAt ? current.puzzle.filter(v => !v).length : 0;
    const filled = current && !current.completedAt
      ? current.values.reduce((sum, value, index) => sum + (!current.puzzle[index] && value ? 1 : 0), 0)
      : 0;
    return {
      label: `${meta.icon} ${meta.label} Sudoku${current && !current.completedAt ? ` · ${filled}/${userCells} cells filled` : ""}`,
      goal: current && !current.completedAt
        ? `Continue and solve the ${meta.label} Sudoku directly in Life RPG.`
        : `Complete the suggested ${meta.label} Sudoku directly in Life RPG.`
    };
  }

  function startNewPuzzle(difficulty, origin = "free") {
    const current = state().active;
    if (current && !current.completedAt) {
      const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
      if (!window.confirm(`Replace your unfinished ${meta.label} Sudoku with a new one?`)) return false;
    }
    const seed = `${Date.now()}|${Math.random()}|${difficulty}|${origin}`;
    state().active = createPuzzle(difficulty, seed, origin);
    persist("sudoku-new");
    return true;
  }

  function createPuzzle(difficulty = "medium", seed = "life-rpg", origin = "free") {
    const meta = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    const rng = seededRng(seed);
    const base = Array.from({ length: 81 }, (_, i) => pattern(Math.floor(i / 9), i % 9) + 1);
    const solution = transformGrid(base, rng);
    const puzzle = carveUniquePuzzle(solution, meta.givens, rng);
    return {
      id: `sudoku-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
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
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[index] = keep;
      } else {
        givens -= 1;
      }
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

  function render() {
    const current = state().active;
    renderLaunchStatus(current);
    renderSuggestion(current);
    renderRewardPreview(current?.difficulty || suggestedDifficulty());

    if (!els.board) return;
    if (!current || current.completedAt) {
      els.board.innerHTML = `<div class="sudoku-empty-v310"><span>🧩</span><strong>${current?.completedAt ? "Puzzle solved." : "No puzzle open."}</strong><p>${current?.completedAt ? "Choose Easy, Medium or Hard above for another round." : "Choose a difficulty above, or use today's suggested level."}</p></div>`;
      if (els.title) els.title.textContent = "Sudoku";
      if (els.meta) els.meta.textContent = "Knowledge Realm · Logical Thinking";
      if (els.status) els.status.textContent = current?.completedAt ? "Solved ✓ · rewards logged" : "Your puzzle will save automatically as you play.";
      return;
    }

    const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
    if (els.title) els.title.textContent = `${meta.icon} ${meta.label} Sudoku`;
    if (els.meta) els.meta.textContent = `Knowledge Realm · Logical Thinking · progress saves automatically`;
    els.board.innerHTML = current.puzzle.map((given, index) => {
      const value = current.values[index] || "";
      const row = Math.floor(index / 9);
      const col = index % 9;
      const cls = [
        "sudoku-cell-v310",
        col % 3 === 2 && col !== 8 ? "box-right" : "",
        row % 3 === 2 && row !== 8 ? "box-bottom" : ""
      ].filter(Boolean).join(" ");
      return `<label class="${cls}"><input inputmode="numeric" pattern="[1-9]*" maxlength="1" aria-label="Sudoku row ${row + 1}, column ${col + 1}" data-sudoku-cell="${index}" ${given ? "disabled" : ""} value="${value || ""}" /></label>`;
    }).join("");
    els.board.querySelectorAll("input[data-sudoku-cell]").forEach(input => validateCell(input, current, Number(input.dataset.sudokuCell), false));
    updateStatus(current);
  }

  function renderLaunchStatus(current) {
    const stats = state().stats;
    let quick = "Play a logic puzzle inside Life RPG.";
    if (current && !current.completedAt) {
      const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
      const openCells = current.puzzle.reduce((sum, value, index) => sum + (!value && !current.values[index] ? 1 : 0), 0);
      quick = `Continue ${meta.label} · ${openCells} cells left`;
    } else if (stats.solved) {
      quick = `${stats.solved} solved · today's suggestion: ${DIFFICULTY[suggestedDifficulty()].label}`;
    } else {
      quick = `Today's suggestion: ${DIFFICULTY[suggestedDifficulty()].label}`;
    }
    if (els.quickStatus) els.quickStatus.textContent = quick;
    if (els.growthStats) {
      els.growthStats.innerHTML = `<span><b>${stats.solved}</b> solved</span><span>🌱 ${stats.easy}</span><span>✦ ${stats.medium}</span><span>⚡ ${stats.hard}</span>`;
    }
  }

  function renderSuggestion(current) {
    if (!els.suggestion) return;
    const suggested = suggestedDifficulty();
    const meta = DIFFICULTY[suggested];
    const health = app.getState().dailyPlanner?.days?.[todayKey()]?.checkIn?.health || {};
    const reason = current && !current.completedAt
      ? `You already have a ${DIFFICULTY[current.difficulty]?.label || "Sudoku"} puzzle in progress. Continue it, or deliberately replace it below.`
      : health.illness === "yes" || ["moderate", "strong"].includes(health.impact)
        ? "Your check-in points to a recovery-heavy day, so the suggestion stays gentle."
        : `Based on today's check-in, ${meta.label} is the current fit. You can still choose any difficulty.`;
    els.suggestion.innerHTML = `<span>${meta.icon}</span><div><small>TODAY'S SUGGESTION</small><strong>${meta.label} Sudoku</strong><p>${escapeHtml(reason)}</p></div>`;
    document.querySelectorAll("[data-sudoku-new]").forEach(button => {
      button.classList.toggle("recommended", button.dataset.sudokuNew === suggested);
    });
  }

  function rewardForDifficulty(difficulty, solvedBeforeToday = solvedTodayCount()) {
    const meta = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    const repeatScale = REPEAT_SCALES[Math.min(solvedBeforeToday, REPEAT_SCALES.length - 1)];
    const requested = {
      xp: Math.max(1, Math.round(meta.xp * repeatScale)),
      realmXP: Math.max(1, Math.round(meta.xp * repeatScale)),
      statXP: Math.max(1, Math.round(meta.statXP * repeatScale)),
      coins: Math.max(1, Math.round(meta.coins * repeatScale)),
      storyEnergyBase: floor2(meta.storyEnergyBase * repeatScale)
    };
    const preview = app.previewActivityReward?.({
      source: "sudoku-complete",
      label: `${meta.label} Sudoku solved`,
      realm: "Knowledge",
      capability: "knowledge",
      ...requested,
      progressionRelevant: true
    }) || { ...requested, storyEnergy: requested.storyEnergyBase };
    return { ...requested, ...preview, repeatScale };
  }

  function renderRewardPreview(difficulty) {
    if (!els.rewardPreview) return;
    const meta = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    const reward = rewardForDifficulty(difficulty);
    const repeatNote = reward.repeatScale < 1
      ? `Repeat reward today: ${Math.round(reward.repeatScale * 100)}% · still counts as real Knowledge progress.`
      : "First Sudoku reward today: full value. Later same-day puzzles stay rewarded with diminishing returns.";
    els.rewardPreview.innerHTML = `
      <div class="sudoku-reward-head-v314"><div><small>ON SOLVE · ${escapeHtml(meta.label.toUpperCase())}</small><strong>${escapeHtml(meta.description)}</strong></div><span>${meta.icon}</span></div>
      <div class="sudoku-reward-grid-v314">
        <span><b>+${reward.xp}</b><small>Character XP</small></span>
        <span><b>+${reward.realmXP}</b><small>Knowledge XP</small></span>
        <span><b>+${reward.statXP}</b><small>Logic / Knowledge</small></span>
        <span><b>+${app.formatEnergy?.(reward.storyEnergy ?? reward.storyEnergyBase) ?? reward.storyEnergyBase}</b><small>Story Energy</small></span>
        <span><b>+${reward.coins}</b><small>Coins</small></span>
      </div>
      <p>${escapeHtml(repeatNote)}</p>`;
  }

  function validateCell(input, current, index, showWrong = false) {
    const given = current.puzzle[index];
    const value = current.values[index];
    input.classList.toggle("given", Boolean(given));
    input.classList.remove("wrong");
    if (showWrong && !given && value && value !== current.solution[index]) input.classList.add("wrong");
  }

  function updateStatus(current) {
    if (!els.status || !current) return;
    const userCells = current.puzzle.filter(v => !v).length;
    const filled = current.values.reduce((sum, value, index) => sum + (!current.puzzle[index] && value ? 1 : 0), 0);
    els.status.textContent = current.completedAt
      ? "Solved ✓ · rewards logged"
      : `${filled}/${userCells} open cells filled · progress saved automatically`;
  }

  function clearEntries() {
    const current = state().active;
    if (!current || current.completedAt) return;
    if (!window.confirm("Clear all numbers you entered in this Sudoku? The original clues will stay.")) return;
    current.values = [...current.puzzle];
    current.updatedAt = Date.now();
    persist("sudoku-clear");
  }

  function checkPuzzle() {
    const current = state().active;
    if (!current || current.completedAt) return;
    const incomplete = current.values.some(v => !v);
    const wrong = current.values.some((v, i) => v !== current.solution[i]);
    if (incomplete || wrong) {
      els.board?.querySelectorAll("input[data-sudoku-cell]").forEach(input => validateCell(input, current, Number(input.dataset.sudokuCell), true));
      app.showToast?.(incomplete ? "A few cells are still empty." : "Almost — at least one cell needs another look.");
      updateStatus(current);
      return;
    }
    completePuzzle(current);
  }

  function completePuzzle(current) {
    if (current.completedAt) return;
    const root = app.getState();
    const existingEvent = (root.rewardLedger?.events || []).find(event => event?.source === "sudoku-complete" && event?.sourceId === current.id);
    const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
    const solvedBeforeToday = solvedTodayCount();
    const preview = rewardForDifficulty(current.difficulty, solvedBeforeToday);

    current.completedAt = Date.now();
    current.updatedAt = current.completedAt;
    state().stats.solved += 1;
    state().stats[current.difficulty] = Number(state().stats[current.difficulty] || 0) + 1;

    let reward = existingEvent ? {
      eventId: existingEvent.id,
      xp: Number(existingEvent.xp || 0),
      realmXP: Number(existingEvent.realmXP || 0),
      statXP: Number(existingEvent.statXP || 0),
      coins: Number(existingEvent.coins || 0),
      storyEnergy: Number(existingEvent.storyEnergy || 0),
      rawStoryEnergy: Number(existingEvent.rawStoryEnergy || 0)
    } : app.awardActivity?.({
      source: "sudoku-complete",
      sourceId: current.id,
      label: `${meta.label} Sudoku solved`,
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
        origin: current.origin || "free",
        repeatScale: preview.repeatScale,
        puzzleId: current.id
      }
    });

    reward ||= { xp: 0, realmXP: 0, statXP: 0, coins: 0, storyEnergy: 0, rawStoryEnergy: 0, eventId: null };
    current.rewardEventId = reward.eventId || existingEvent?.id || null;

    state().completed.push({
      id: current.id,
      difficulty: current.difficulty,
      origin: current.origin || "free",
      completedAt: current.completedAt,
      rewardEventId: current.rewardEventId,
      reward: {
        xp: reward.xp,
        realmXP: reward.realmXP,
        statXP: reward.statXP,
        coins: reward.coins,
        storyEnergy: reward.storyEnergy
      }
    });

    recordQuestCompletion(current, reward);
    app.saveState({ source: "sudoku-solved" });
    render();
    app.renderAll?.();
    app.showToast?.(`🧩 ${meta.label} solved · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙`);
  }

  function recordQuestCompletion(current, reward) {
    const root = app.getState();
    if (!Array.isArray(root.completionLog)) root.completionLog = [];
    if (root.completionLog.some(log => log?.sudokuPuzzleId === current.id)) return;
    const quest = (app.getQuestCatalog?.() || []).find(item => item.systemRole === "sudoku");
    if (!quest) return;
    root.completionLog.push({
      id: `log-sudoku-${current.id}`,
      questId: quest.id,
      questName: quest.name,
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
      sudokuDifficulty: current.difficulty,
      at: new Date(current.completedAt).toISOString()
    });
  }

  function solvedTodayCount() {
    const today = todayKey();
    return state().completed.filter(item => localDateKey(item.completedAt) === today).length;
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
    getStats: () => ({ ...state().stats }),
    getActive: () => state().active ? JSON.parse(JSON.stringify(state().active)) : null,
    suggestedDifficulty,
    render
  };
})();
