(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const SCHEMA = 1;
  const DIFFICULTY = {
    easy: { label: "Easy", icon: "🌱", givens: 42, bonusXp: 0, bonusCoins: 0 },
    medium: { label: "Medium", icon: "✦", givens: 34, bonusXp: 4, bonusCoins: 5 },
    hard: { label: "Hard", icon: "⚡", givens: 28, bonusXp: 8, bonusCoins: 10 }
  };

  const els = {
    dialog: byId("sudokuDialog"),
    close: byId("sudokuClose"),
    title: byId("sudokuTitle"),
    meta: byId("sudokuMeta"),
    board: byId("sudokuBoard"),
    status: byId("sudokuStatus"),
    newButton: byId("sudokuNewButton"),
    check: byId("sudokuCheckButton"),
    clear: byId("sudokuClearButton")
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
    return { schemaVersion: SCHEMA, active: null, completed: [], stats: { solved: 0, easy: 0, medium: 0, hard: 0 } };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.sudoku || typeof root.sudoku !== "object" || Array.isArray(root.sudoku)) root.sudoku = defaultState();
    const state = root.sudoku;
    state.schemaVersion = SCHEMA;
    if (!Array.isArray(state.completed)) state.completed = [];
    if (!state.stats || typeof state.stats !== "object") state.stats = defaultState().stats;
    ["solved", "easy", "medium", "hard"].forEach(key => state.stats[key] = Math.max(0, Number(state.stats[key] || 0)));
    if (state.active && (!Array.isArray(state.active.puzzle) || state.active.puzzle.length !== 81 || !Array.isArray(state.active.solution) || state.active.solution.length !== 81)) state.active = null;
    if (state.active && (!Array.isArray(state.active.values) || state.active.values.length !== 81)) state.active.values = [...state.active.puzzle];
    if (state.completed.length > 200) state.completed = state.completed.slice(-200);
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
    els.newButton?.addEventListener("click", () => {
      if (state().active && !window.confirm("Replace the current Sudoku with a new one?")) return;
      state().active = createPuzzle(suggestedDifficulty(), `${Date.now()}|manual`);
      persist("sudoku-new");
    });
    els.clear?.addEventListener("click", clearEntries);
    els.check?.addEventListener("click", checkPuzzle);
    els.board?.addEventListener("input", event => {
      const input = event.target.closest?.("input[data-sudoku-cell]");
      if (!input) return;
      const index = Number(input.dataset.sudokuCell);
      const value = String(input.value || "").replace(/[^1-9]/g, "").slice(-1);
      input.value = value;
      const current = state().active;
      if (!current) return;
      current.values[index] = value ? Number(value) : 0;
      current.updatedAt = Date.now();
      app.saveState({ source: "sudoku-progress" });
      validateCell(input, current, index);
      updateStatus(current);
    });
  }

  function openForQuest(questId = "") {
    activeQuestId = questId || activeQuestId;
    let current = state().active;
    const difficulty = suggestedDifficulty();
    if (!current || current.completedAt) {
      current = createPuzzle(difficulty, `${todayKey()}|${difficulty}|daily`);
      state().active = current;
      app.saveState({ source: "sudoku-start" });
    }
    render();
    els.dialog?.showModal();
    return true;
  }

  function close() { if (els.dialog?.open) els.dialog.close(); }

  function suggestedDifficulty() {
    const checkIn = app.getState().dailyPlanner?.days?.[todayKey()]?.checkIn || {};
    if (["fumes", "low"].includes(checkIn.energy)) return "easy";
    if (checkIn.energy === "lots") return "hard";
    return "medium";
  }

  function availabilityForQuest(quest) {
    if (quest?.systemRole !== "sudoku") return null;
    return { available: true, reason: `${DIFFICULTY[suggestedDifficulty()].label} Sudoku ready in-app` };
  }

  function contextForQuest(quest) {
    if (quest?.systemRole !== "sudoku") return null;
    const current = state().active;
    const difficulty = current?.completedAt ? suggestedDifficulty() : (current?.difficulty || suggestedDifficulty());
    const filled = current ? current.values.filter(Boolean).length : 0;
    return {
      label: `${DIFFICULTY[difficulty].icon} ${DIFFICULTY[difficulty].label} Sudoku${current && !current.completedAt ? ` · ${filled}/81 cells filled` : ""}`,
      goal: `Complete the suggested ${DIFFICULTY[difficulty].label} Sudoku directly in Life RPG.`
    };
  }

  function createPuzzle(difficulty = "medium", seed = "life-rpg") {
    const meta = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    const rng = seededRng(seed);
    const base = Array.from({ length: 81 }, (_, i) => pattern(Math.floor(i / 9), i % 9) + 1);
    let solution = transformGrid(base, rng);
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);
    const puzzle = [...solution];
    const removeCount = 81 - meta.givens;
    for (let i = 0; i < removeCount; i += 1) puzzle[order[i]] = 0;
    return {
      id: `sudoku-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      difficulty,
      puzzle,
      solution,
      values: [...puzzle],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null
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

  function render() {
    const current = state().active;
    if (!els.board) return;
    if (!current) {
      els.board.innerHTML = `<div class="sudoku-empty-v310"><span>🧩</span><strong>No puzzle open.</strong><p>Start one when Sudoku appears in the Daily Plan, or make a new puzzle here.</p></div>`;
      if (els.title) els.title.textContent = "Sudoku Break";
      if (els.meta) els.meta.textContent = "Knowledge · logical thinking";
      if (els.status) els.status.textContent = "Ready when you are.";
      return;
    }
    const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
    if (els.title) els.title.textContent = `${meta.icon} ${meta.label} Sudoku`;
    if (els.meta) els.meta.textContent = `Knowledge Realm · ${meta.label}${meta.bonusCoins ? ` · difficulty bonus +${meta.bonusCoins} 🪙` : ""}`;
    els.board.innerHTML = current.puzzle.map((given, index) => {
      const value = current.values[index] || "";
      const row = Math.floor(index / 9);
      const col = index % 9;
      const cls = [`sudoku-cell-v310`, col % 3 === 2 && col !== 8 ? "box-right" : "", row % 3 === 2 && row !== 8 ? "box-bottom" : ""].filter(Boolean).join(" ");
      return `<label class="${cls}"><input inputmode="numeric" maxlength="1" aria-label="Sudoku row ${row + 1}, column ${col + 1}" data-sudoku-cell="${index}" ${given ? "disabled" : ""} value="${value || ""}" /></label>`;
    }).join("");
    els.board.querySelectorAll("input[data-sudoku-cell]").forEach(input => validateCell(input, current, Number(input.dataset.sudokuCell), false));
    updateStatus(current);
  }

  function validateCell(input, current, index, showWrong = true) {
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
    const wrong = current.values.some((value, index) => !current.puzzle[index] && value && value !== current.solution[index]);
    els.status.textContent = current.completedAt ? "Solved ✓" : `${filled}/${userCells} open cells filled${wrong ? " · something needs another look" : ""}`;
  }

  function clearEntries() {
    const current = state().active;
    if (!current) return;
    current.values = [...current.puzzle];
    current.updatedAt = Date.now();
    persist("sudoku-clear");
  }

  function checkPuzzle() {
    const current = state().active;
    if (!current) return;
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
    current.completedAt = Date.now();
    const meta = DIFFICULTY[current.difficulty] || DIFFICULTY.medium;
    state().stats.solved += 1;
    state().stats[current.difficulty] = Number(state().stats[current.difficulty] || 0) + 1;
    state().completed.push({ id: current.id, difficulty: current.difficulty, completedAt: current.completedAt });
    app.saveState({ source: "sudoku-solved" });

    const questId = activeQuestId || (app.getQuestCatalog?.() || []).find(q => q.systemRole === "sudoku")?.id || "";
    if (questId) app.logQuestProgress?.(questId, 1, { showOverlay: false, smartBypass: true });
    if (meta.bonusXp || meta.bonusCoins) {
      app.awardActivity?.({
        source: "sudoku-difficulty",
        sourceId: current.id,
        label: `${meta.label} Sudoku bonus`,
        realm: "Knowledge",
        capability: "knowledge",
        xp: meta.bonusXp,
        realmXP: meta.bonusXp,
        statXP: Math.max(0, Math.round(meta.bonusXp * 0.6)),
        coins: meta.bonusCoins,
        storyEnergyBase: 0,
        progressionRelevant: true,
        metadata: { difficulty: current.difficulty, sudoku: true }
      });
    }
    app.saveState({ source: "sudoku-complete" });
    render();
    app.renderAll?.();
    app.showToast?.(`🧩 ${meta.label} Sudoku solved${meta.bonusCoins ? ` · +${meta.bonusCoins} 🪙 difficulty bonus` : ""}`);
  }

  function seededRng(seed) {
    let h = 2166136261;
    for (let i = 0; i < String(seed).length; i += 1) { h ^= String(seed).charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h += 0x6D2B79F5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(array, rng) { const a = [...array]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function byId(id) { return document.getElementById(id); }

  window.LifeRPGSudoku = {
    openForQuest,
    availabilityForQuest,
    contextForQuest,
    getStats: () => ({ ...state().stats }),
    getActive: () => state().active ? JSON.parse(JSON.stringify(state().active)) : null,
    render
  };
})();
