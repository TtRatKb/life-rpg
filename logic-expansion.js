(() => {
  "use strict";

  if (window.__lifeRpgLogicExpansionV314ar) return;
  window.__lifeRpgLogicExpansionV314ar = true;

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState || !app?.awardActivity) {
    console.error("Logic Expansion could not initialize.");
    return;
  }

  const VERSION = "0.31.4ar";
  const GAME_META = {
    slitherlink: {
      title: "Slitherlink",
      icon: "◫",
      tagline: "Draw one unbroken loop around the clues.",
      instructions: "Each number tells you how many of that cell's four sides belong to the loop. Every dot used by the loop must have exactly two lines."
    },
    nurikabe: {
      title: "Nurikabe",
      icon: "▦",
      tagline: "Separate numbered islands with one connected wall.",
      instructions: "White islands contain exactly one number and must match that number's size. Black wall cells must all connect, and no 2×2 block may be fully black."
    },
    kakuro: {
      title: "Kakuro",
      icon: "＋",
      tagline: "Fill the runs so every clue sum works.",
      instructions: "Use digits 1–9. Each horizontal and vertical run must add to its clue, and a digit may not repeat inside the same run."
    }
  };

  const SLITHER_SHAPES = ["0010001110111110111000100", "1100011100011100011000010", "0111011000110001111000110", "0001100111011101110011000", "1110001100011100011100011", "0011001110110001110001110", "0100011110011100011000111", "1111010000111000111000110", "0011100110111101100011000", "0110011110110101100011100", "0001001110111000111000110", "0010011100011100011100010"];
  const NURIKABE_BANK = [{"rows":5,"cols":5,"clues":{"0,0":7,"2,0":1,"2,4":1,"4,1":2,"4,3":1},"solution":"0000011011010101111100101"},{"rows":5,"cols":5,"clues":{"2,0":5,"2,4":2,"4,1":1,"4,3":1},"solution":"1111101010000101111110101"},{"rows":5,"cols":5,"clues":{"2,1":6,"1,3":2,"4,0":1,"4,4":3},"solution":"0001101101001011111101000"},{"rows":5,"cols":5,"clues":{"1,2":3,"2,4":2,"4,1":7},"solution":"1111100010111100001100001"},{"rows":5,"cols":5,"clues":{"2,1":3,"1,4":1,"3,4":6},"solution":"1111110010101111110010000"},{"rows":5,"cols":5,"clues":{"0,4":3,"1,0":2,"3,0":1,"4,3":4},"solution":"1110000101111110100111001"},{"rows":5,"cols":5,"clues":{"2,0":3,"1,4":2,"1,2":2,"3,3":1,"4,1":1,"4,4":1},"solution":"0111001010010111110110110"},{"rows":5,"cols":5,"clues":{"0,0":1,"0,2":1,"4,4":5,"2,2":7},"solution":"0101011110100101001000010"},{"rows":5,"cols":5,"clues":{"0,0":1,"1,1":1,"1,4":2,"3,0":2,"3,2":1,"3,4":2},"solution":"0111110100111110101001110"},{"rows":5,"cols":5,"clues":{"1,0":4,"1,3":3,"4,2":3},"solution":"1111100101010010111111000"},{"rows":5,"cols":5,"clues":{"1,0":4,"2,2":5,"4,3":3},"solution":"0111101010010000111111000"},{"rows":5,"cols":5,"clues":{"0,1":3,"4,4":7,"3,0":2},"solution":"0001111110010000101011110"}];
  const KAKURO_BANK = [{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":9,"1,2":4,"1,4":6,"1,5":9,"2,1":1,"2,2":5,"2,3":4,"2,4":7,"2,5":3,"3,2":7,"3,3":6,"3,4":3,"4,1":5,"4,2":2,"4,3":9,"4,4":1,"5,1":3,"5,2":9}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":8,"1,2":4,"1,4":3,"1,5":2,"2,1":4,"2,2":7,"2,3":8,"2,4":2,"2,5":9,"3,2":2,"3,3":5,"3,4":6,"4,1":7,"4,2":8,"4,3":2,"4,4":1,"5,1":6,"5,2":3}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":1,"1,2":5,"1,4":2,"1,5":4,"2,1":3,"2,2":8,"2,3":5,"2,4":7,"2,5":1,"3,2":6,"3,3":8,"3,4":5,"4,1":1,"4,2":3,"4,3":7,"4,4":9,"5,1":8,"5,2":2}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":1,"1,2":9,"1,4":7,"1,5":9,"2,1":3,"2,2":6,"2,3":8,"2,4":2,"2,5":1,"3,2":3,"3,3":5,"3,4":4,"4,1":3,"4,2":7,"4,3":6,"4,4":9,"5,1":2,"5,2":1}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":1,"1,2":7,"1,4":1,"1,5":5,"2,1":6,"2,2":9,"2,3":8,"2,4":7,"2,5":1,"3,2":1,"3,3":2,"3,4":3,"4,1":3,"4,2":2,"4,3":5,"4,4":8,"5,1":7,"5,2":6}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":9,"1,2":4,"1,4":5,"1,5":3,"2,1":2,"2,2":9,"2,3":7,"2,4":4,"2,5":5,"3,2":1,"3,3":9,"3,4":3,"4,1":4,"4,2":8,"4,3":1,"4,4":2,"5,1":8,"5,2":2}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":9,"1,2":1,"1,4":5,"1,5":4,"2,1":5,"2,2":4,"2,3":1,"2,4":2,"2,5":3,"3,2":7,"3,3":9,"3,4":8,"4,1":4,"4,2":8,"4,3":7,"4,4":1,"5,1":6,"5,2":2}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":2,"1,2":6,"1,4":1,"1,5":6,"2,1":9,"2,2":1,"2,3":7,"2,4":3,"2,5":8,"3,2":7,"3,3":4,"3,4":8,"4,1":1,"4,2":4,"4,3":5,"4,4":9,"5,1":5,"5,2":2}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":5,"1,2":6,"1,4":5,"1,5":8,"2,1":3,"2,2":8,"2,3":7,"2,4":9,"2,5":2,"3,2":1,"3,3":4,"3,4":2,"4,1":2,"4,2":3,"4,3":6,"4,4":4,"5,1":1,"5,2":7}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":5,"1,2":3,"1,4":9,"1,5":7,"2,1":9,"2,2":1,"2,3":4,"2,4":8,"2,5":6,"3,2":4,"3,3":1,"3,4":6,"4,1":4,"4,2":7,"4,3":3,"4,4":5,"5,1":5,"5,2":6}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":7,"1,2":5,"1,4":6,"1,5":4,"2,1":9,"2,2":6,"2,3":4,"2,4":7,"2,5":3,"3,2":1,"3,3":8,"3,4":4,"4,1":2,"4,2":4,"4,3":5,"4,4":9,"5,1":6,"5,2":7}},{"mask":["000000","011011","011111","001110","011110","011000"],"solution":{"1,1":5,"1,2":2,"1,4":5,"1,5":2,"2,1":1,"2,2":4,"2,3":5,"2,4":7,"2,5":8,"3,2":6,"3,3":7,"3,4":8,"4,1":5,"4,2":3,"4,3":8,"4,4":9,"5,1":2,"5,2":7}}];

  let activeGame = "slitherlink";
  let activeMode = "daily";
  let saveTimer = null;

  init();

  function init() {
    ensureState();
    ensureDialog();
    bind();
    refreshCards();
    window.setTimeout(refreshCards, 80);
    window.addEventListener("life-rpg:render", refreshCards);
    window.addEventListener("life-rpg:state-saved", refreshCards);
    window.addEventListener("life-rpg:talent-content-v2-change", refreshCards);
  }

  function defaults() {
    return {
      schemaVersion: 1,
      version: VERSION,
      games: {
        slitherlink: gameDefaults(),
        nurikabe: gameDefaults(),
        kakuro: gameDefaults()
      }
    };
  }

  function gameDefaults() {
    return {
      daily: null,
      practice: null,
      practiceSerial: 0,
      solvedDailyDates: [],
      practiceRewardByDate: {},
      solvedTotal: 0
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.logicExpansion || typeof root.logicExpansion !== "object" || Array.isArray(root.logicExpansion)) {
      root.logicExpansion = defaults();
    }
    const s = root.logicExpansion;
    s.schemaVersion = 1;
    s.version = VERSION;
    s.games ||= {};
    for (const id of Object.keys(GAME_META)) {
      s.games[id] ||= gameDefaults();
      const g = s.games[id];
      g.solvedDailyDates = Array.isArray(g.solvedDailyDates) ? g.solvedDailyDates : [];
      g.practiceRewardByDate ||= {};
      g.practiceSerial = Math.max(0, Number(g.practiceSerial || 0));
      g.solvedTotal = Math.max(0, Number(g.solvedTotal || 0));
    }
    return s;
  }

  function state() {
    return ensureState();
  }

  function gameState(id) {
    return state().games[id];
  }

  function unlocked(id) {
    return Boolean(
      window.LifeRPGTalentTreeGraph?.isContentUnlocked?.("Knowledge", id) ||
      app.getState().talentTreeExpansion?.unlocks?.Knowledge?.[id]
    );
  }

  function ensureDialog() {
    if (document.getElementById("logicExpansionDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "logicExpansionDialog";
    dialog.className = "logic-expansion-dialog-v314ar";
    dialog.innerHTML = `
      <div class="logic-expansion-shell-v314ar">
        <button class="logic-expansion-close-v314ar" type="button" data-logic-close aria-label="Close">×</button>
        <div id="logicExpansionBody"></div>
      </div>`;
    document.body.appendChild(dialog);
  }

  function bind() {
    document.addEventListener("click", event => {
      const card = event.target.closest?.("[data-logic-game]");
      if (card) {
        event.preventDefault();
        open(card.dataset.logicGame);
        return;
      }

      const close = event.target.closest?.("[data-logic-close]");
      if (close) {
        event.preventDefault();
        document.getElementById("logicExpansionDialog")?.close?.();
        return;
      }

      const mode = event.target.closest?.("[data-logic-mode]");
      if (mode) {
        event.preventDefault();
        activeMode = mode.dataset.logicMode === "practice" ? "practice" : "daily";
        render();
        return;
      }

      const check = event.target.closest?.("[data-logic-check]");
      if (check) {
        event.preventDefault();
        checkCurrent();
        return;
      }

      const clear = event.target.closest?.("[data-logic-clear]");
      if (clear) {
        event.preventDefault();
        clearCurrent();
        return;
      }

      const next = event.target.closest?.("[data-logic-new-practice]");
      if (next) {
        event.preventDefault();
        newPractice();
        return;
      }

      const edge = event.target.closest?.("[data-slither-edge]");
      if (edge && activeGame === "slitherlink") {
        event.preventDefault();
        cycleSlitherEdge(edge.dataset.slitherEdge);
        return;
      }

      const nuri = event.target.closest?.("[data-nuri-cell]");
      if (nuri && activeGame === "nurikabe") {
        event.preventDefault();
        cycleNuri(Number(nuri.dataset.nuriCell));
        return;
      }
    });

    document.addEventListener("input", event => {
      const input = event.target.closest?.("[data-kakuro-cell]");
      if (!input || activeGame !== "kakuro") return;
      const value = String(input.value || "").replace(/\D/g, "").slice(-1);
      input.value = value === "0" ? "" : value;
      const session = currentSession();
      if (!session) return;
      session.values ||= {};
      session.values[input.dataset.kakuroCell] = input.value;
      session.updatedAt = Date.now();
      scheduleSave();
    });
  }

  function refreshCards() {
    document.querySelectorAll("[data-logic-game]").forEach(card => {
      const id = card.dataset.logicGame;
      const live = unlocked(id);
      card.classList.toggle("is-live", live);
      card.classList.toggle("is-planned", !live);
      card.classList.toggle("is-locked-v314ar", !live);
      const status = card.querySelector(`[data-logic-status="${id}"]`);
      const arrow = card.querySelector(":scope > b");
      if (status) {
        if (!live) status.textContent = "Locked · Knowledge Talent Tree";
        else status.textContent = solvedToday(id) ? "Daily solved ✓ · Practice open" : "Daily puzzle ready";
      }
      if (arrow) arrow.textContent = live ? "›" : "🔒";
    });
  }

  function open(id) {
    if (!GAME_META[id]) return false;
    if (!unlocked(id)) {
      app.showToast?.(`${GAME_META[id].title} is still locked in the Knowledge Talent Tree.`);
      window.LifeRPGTalentTreeGraph?.focusRealm?.("Knowledge");
      return false;
    }

    activeGame = id;
    activeMode = "daily";
    ensureSession(id, "daily");
    render();
    const dialog = document.getElementById("logicExpansionDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
    return true;
  }

  function render() {
    const body = document.getElementById("logicExpansionBody");
    const meta = GAME_META[activeGame];
    if (!body || !meta) return;

    const session = ensureSession(activeGame, activeMode);
    const practiceRewarded = Number(gameState(activeGame).practiceRewardByDate?.[dateKey()] || 0);
    const result = session.result || null;

    body.innerHTML = `
      <header class="logic-expansion-head-v314ar">
        <div class="logic-expansion-icon-v314ar">${meta.icon}</div>
        <div><p class="eyebrow">KNOWLEDGE · TALENT CONTENT</p><h2>${esc(meta.title)}</h2><p>${esc(meta.tagline)}</p></div>
      </header>

      <div class="logic-mode-tabs-v314ar">
        <button class="${activeMode === "daily" ? "is-active" : ""}" type="button" data-logic-mode="daily">Daily${solvedToday(activeGame) ? " ✓" : ""}</button>
        <button class="${activeMode === "practice" ? "is-active" : ""}" type="button" data-logic-mode="practice">Practice</button>
      </div>

      <div class="logic-instructions-v314ar">${esc(meta.instructions)}</div>

      <section class="logic-board-wrap-v314ar">
        ${renderBoard(activeGame, session)}
      </section>

      <div class="logic-session-meta-v314ar">
        <span>${activeMode === "daily" ? `Today's fixed puzzle · ${dateKey()}` : `Practice puzzle ${Number(gameState(activeGame).practiceSerial || 0) + 1}`}</span>
        <span>${activeMode === "daily" ? "One Daily reward per date" : `${Math.max(0, 2 - practiceRewarded)} small Practice reward${Math.max(0, 2 - practiceRewarded) === 1 ? "" : "s"} left today`}</span>
      </div>

      <div id="logicExpansionResult" class="logic-result-v314ar ${result ? result.kind : ""}">
        ${result ? `<strong>${esc(result.title)}</strong><p>${esc(result.copy)}</p>` : ""}
      </div>

      <div class="logic-actions-v314ar">
        <button class="secondary-button" type="button" data-logic-clear>Clear board</button>
        ${activeMode === "practice" && session.completedAt ? '<button class="secondary-button" type="button" data-logic-new-practice>New practice puzzle</button>' : ""}
        <button class="primary-button" type="button" data-logic-check>${session.completedAt ? "Check again" : "Check puzzle"}</button>
      </div>`;
  }

  function ensureSession(id, mode) {
    const g = gameState(id);
    const key = mode === "daily" ? dateKey() : `practice-${Number(g.practiceSerial || 0)}`;
    let session = mode === "daily" ? g.daily : g.practice;

    if (!session || session.key !== key) {
      const index = mode === "daily"
        ? seededIndex(`${dateKey()}|${id}|daily`, bankLength(id))
        : seededIndex(`${id}|practice|${g.practiceSerial}`, bankLength(id));
      session = newSession(id, key, index);
      if (mode === "daily") g.daily = session;
      else g.practice = session;
      app.saveState({ source: `logic-${id}-${mode}-start` });
    }
    return session;
  }

  function newSession(id, key, index) {
    const base = {
      key,
      puzzleIndex: index,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null,
      result: null
    };
    if (id === "slitherlink") base.edges = {};
    if (id === "nurikabe") base.marks = Array(25).fill(0);
    if (id === "kakuro") base.values = {};
    return base;
  }

  function currentSession() {
    const g = gameState(activeGame);
    return activeMode === "daily" ? g.daily : g.practice;
  }

  function bankLength(id) {
    if (id === "slitherlink") return SLITHER_SHAPES.length;
    if (id === "nurikabe") return NURIKABE_BANK.length;
    return KAKURO_BANK.length;
  }

  function currentPuzzle(id = activeGame, session = currentSession()) {
    if (!session) return null;
    const index = Math.abs(Number(session.puzzleIndex || 0)) % bankLength(id);
    if (id === "slitherlink") return slitherPuzzle(index);
    if (id === "nurikabe") return NURIKABE_BANK[index];
    return kakuroPuzzle(KAKURO_BANK[index]);
  }

  function renderBoard(id, session) {
    if (id === "slitherlink") return renderSlitherlink(session, currentPuzzle(id, session));
    if (id === "nurikabe") return renderNurikabe(session, currentPuzzle(id, session));
    return renderKakuro(session, currentPuzzle(id, session));
  }

  // ------------------------------------------------------------
  // Slitherlink
  // ------------------------------------------------------------

  function slitherPuzzle(index) {
    const flat = SLITHER_SHAPES[index % SLITHER_SHAPES.length];
    const rows = 5, cols = 5;
    const region = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => flat[r * cols + c] === "1")
    );

    const solution = new Set();
    const inside = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && region[r][c];

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (!region[r][c]) continue;
        if (!inside(r - 1, c)) solution.add(`h:${r}:${c}`);
        if (!inside(r + 1, c)) solution.add(`h:${r + 1}:${c}`);
        if (!inside(r, c - 1)) solution.add(`v:${r}:${c}`);
        if (!inside(r, c + 1)) solution.add(`v:${r}:${c + 1}`);
      }
    }

    const clues = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const around = [`h:${r}:${c}`, `h:${r+1}:${c}`, `v:${r}:${c}`, `v:${r}:${c+1}`];
        const value = around.filter(key => solution.has(key)).length;
        clues.push(value);
      }
    }
    return { rows, cols, clues };
  }

  function renderSlitherlink(session, puzzle) {
    const cell = 56;
    const pad = 16;
    const width = puzzle.cols * cell + pad * 2;
    const height = puzzle.rows * cell + pad * 2;
    const lines = [];
    const hits = [];
    const dots = [];
    const texts = [];

    for (let r = 0; r <= puzzle.rows; r += 1) {
      for (let c = 0; c < puzzle.cols; c += 1) {
        const key = `h:${r}:${c}`;
        const x1 = pad + c * cell, y = pad + r * cell, x2 = x1 + cell;
        const mark = Number(session.edges?.[key] || 0);
        lines.push(`<line class="slither-edge-v314ar state-${mark}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" />`);
        hits.push(`<line class="slither-hit-v314ar" data-slither-edge="${key}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" />`);
        if (mark === 2) texts.push(`<text class="slither-x-v314ar" x="${(x1+x2)/2}" y="${y+5}">×</text>`);
      }
    }
    for (let r = 0; r < puzzle.rows; r += 1) {
      for (let c = 0; c <= puzzle.cols; c += 1) {
        const key = `v:${r}:${c}`;
        const x = pad + c * cell, y1 = pad + r * cell, y2 = y1 + cell;
        const mark = Number(session.edges?.[key] || 0);
        lines.push(`<line class="slither-edge-v314ar state-${mark}" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" />`);
        hits.push(`<line class="slither-hit-v314ar" data-slither-edge="${key}" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" />`);
        if (mark === 2) texts.push(`<text class="slither-x-v314ar" x="${x}" y="${(y1+y2)/2+5}">×</text>`);
      }
    }
    for (let r = 0; r <= puzzle.rows; r += 1) {
      for (let c = 0; c <= puzzle.cols; c += 1) {
        dots.push(`<circle class="slither-dot-v314ar" cx="${pad+c*cell}" cy="${pad+r*cell}" r="3.2" />`);
      }
    }
    for (let r = 0; r < puzzle.rows; r += 1) {
      for (let c = 0; c < puzzle.cols; c += 1) {
        const clue = puzzle.clues[r * puzzle.cols + c];
        texts.push(`<text class="slither-clue-v314ar" x="${pad+c*cell+cell/2}" y="${pad+r*cell+cell/2+7}">${clue}</text>`);
      }
    }

    return `<div class="slither-board-scroll-v314ar"><svg class="slither-board-v314ar" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px" role="group" aria-label="Slitherlink board">${lines.join("")}${texts.join("")}${dots.join("")}${hits.join("")}</svg></div>
      <p class="logic-input-hint-v314ar">Tap an edge: line → × → blank.</p>`;
  }

  function cycleSlitherEdge(key) {
    const session = currentSession();
    if (!session || session.completedAt) return;
    session.edges ||= {};
    session.edges[key] = (Number(session.edges[key] || 0) + 1) % 3;
    session.updatedAt = Date.now();
    session.result = null;
    scheduleSave();
    render();
  }

  function validateSlither(session, puzzle) {
    const lines = new Set(Object.entries(session.edges || {}).filter(([, value]) => Number(value) === 1).map(([key]) => key));
    if (lines.size < 4) return { ok: false, copy: "The loop is not complete yet." };

    const edgeVertices = key => {
      const [type, rs, cs] = key.split(":");
      const r = Number(rs), c = Number(cs);
      return type === "h"
        ? [`${r},${c}`, `${r},${c+1}`]
        : [`${r},${c}`, `${r+1},${c}`];
    };

    const degree = {};
    const adjacency = {};
    for (const edge of lines) {
      const [a,b] = edgeVertices(edge);
      degree[a] = Number(degree[a] || 0) + 1;
      degree[b] = Number(degree[b] || 0) + 1;
      adjacency[a] ||= new Set();
      adjacency[b] ||= new Set();
      adjacency[a].add(b);
      adjacency[b].add(a);
    }

    if (Object.values(degree).some(value => value !== 2)) {
      return { ok: false, copy: "Every dot touched by the loop needs exactly two connected lines." };
    }

    for (let r = 0; r < puzzle.rows; r += 1) {
      for (let c = 0; c < puzzle.cols; c += 1) {
        const required = Number(puzzle.clues[r * puzzle.cols + c]);
        const count = [`h:${r}:${c}`,`h:${r+1}:${c}`,`v:${r}:${c}`,`v:${r}:${c+1}`].filter(key => lines.has(key)).length;
        if (count !== required) return { ok: false, copy: `At least one numbered cell does not have the required number of loop edges yet.` };
      }
    }

    const vertices = Object.keys(degree);
    const seen = new Set();
    const stack = [vertices[0]];
    while (stack.length) {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      for (const next of adjacency[current] || []) if (!seen.has(next)) stack.push(next);
    }
    if (seen.size !== vertices.length) return { ok: false, copy: "You have more than one separate loop. Slitherlink needs exactly one." };

    return { ok: true };
  }

  // ------------------------------------------------------------
  // Nurikabe
  // ------------------------------------------------------------

  function renderNurikabe(session, puzzle) {
    const clues = puzzle.clues || {};
    const cells = Array.from({ length: puzzle.rows * puzzle.cols }, (_, index) => {
      const r = Math.floor(index / puzzle.cols), c = index % puzzle.cols;
      const clue = clues[`${r},${c}`];
      const mark = clue ? 2 : Number(session.marks?.[index] || 0);
      const cls = clue ? "is-clue" : mark === 1 ? "is-wall" : mark === 2 ? "is-island" : "is-unknown";
      return `<button class="nuri-cell-v314ar ${cls}" type="button" data-nuri-cell="${index}" ${clue ? "disabled" : ""}>${clue || (mark === 1 ? "" : mark === 2 ? "·" : "")}</button>`;
    }).join("");
    return `<div class="nuri-board-v314ar" style="--nuri-cols:${puzzle.cols}">${cells}</div>
      <p class="logic-input-hint-v314ar">Tap a cell: wall → island → unknown. Numbered cells are fixed islands.</p>`;
  }

  function cycleNuri(index) {
    const session = currentSession();
    const puzzle = currentPuzzle();
    if (!session || !puzzle || session.completedAt) return;
    const r = Math.floor(index / puzzle.cols), c = index % puzzle.cols;
    if (puzzle.clues?.[`${r},${c}`]) return;
    session.marks ||= Array(puzzle.rows * puzzle.cols).fill(0);
    session.marks[index] = (Number(session.marks[index] || 0) + 1) % 3;
    session.updatedAt = Date.now();
    session.result = null;
    scheduleSave();
    render();
  }

  function validateNurikabe(session, puzzle) {
    const R = puzzle.rows, C = puzzle.cols;
    const clues = puzzle.clues || {};
    const marks = Array.from({ length: R*C }, (_, index) => {
      const r=Math.floor(index/C), c=index%C;
      return clues[`${r},${c}`] ? 2 : Number(session.marks?.[index] || 0);
    });
    if (marks.some(value => value === 0)) return { ok:false, copy:"Some cells are still undecided." };

    const neighbors = index => {
      const r=Math.floor(index/C), c=index%C;
      return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc])=>rr>=0&&rr<R&&cc>=0&&cc<C).map(([rr,cc])=>rr*C+cc);
    };
    const components = value => {
      const out=[], seen=new Set();
      for(let i=0;i<marks.length;i+=1){
        if(marks[i]!==value||seen.has(i)) continue;
        const stack=[i], comp=[]; seen.add(i);
        while(stack.length){
          const cur=stack.pop(); comp.push(cur);
          for(const n of neighbors(cur)) if(marks[n]===value&&!seen.has(n)){seen.add(n);stack.push(n);}
        }
        out.push(comp);
      }
      return out;
    };

    const black = components(1);
    if (black.length !== 1) return { ok:false, copy:"All wall cells need to form one connected wall." };

    for(let r=0;r<R-1;r+=1){
      for(let c=0;c<C-1;c+=1){
        const ids=[r*C+c,r*C+c+1,(r+1)*C+c,(r+1)*C+c+1];
        if(ids.every(i=>marks[i]===1)) return { ok:false, copy:"A 2×2 block cannot be completely black." };
      }
    }

    for (const comp of components(2)) {
      const componentClues = comp.map(index => {
        const r=Math.floor(index/C), c=index%C;
        return clues[`${r},${c}`] ? Number(clues[`${r},${c}`]) : null;
      }).filter(Boolean);
      if (componentClues.length !== 1) return { ok:false, copy:"Every white island needs exactly one numbered clue." };
      if (comp.length !== componentClues[0]) return { ok:false, copy:"At least one island does not match the size written on its clue." };
    }
    return { ok:true };
  }

  // ------------------------------------------------------------
  // Kakuro
  // ------------------------------------------------------------

  function kakuroPuzzle(raw) {
    const mask = raw.mask.map(row => [...row].map(ch => ch === "1"));
    const R=mask.length,C=mask[0].length;
    const solution=raw.solution || {};
    const across=[], down=[];

    for(let r=0;r<R;r+=1){
      let c=0;
      while(c<C){
        if(!mask[r][c]){c+=1;continue;}
        const start=c; while(c<C&&mask[r][c])c+=1;
        const cells=Array.from({length:c-start},(_,i)=>`${r},${start+i}`);
        if(cells.length>=2) across.push({cells,sum:cells.reduce((s,key)=>s+Number(solution[key]||0),0)});
      }
    }
    for(let c=0;c<C;c+=1){
      let r=0;
      while(r<R){
        if(!mask[r][c]){r+=1;continue;}
        const start=r; while(r<R&&mask[r][c])r+=1;
        const cells=Array.from({length:r-start},(_,i)=>`${start+i},${c}`);
        if(cells.length>=2) down.push({cells,sum:cells.reduce((s,key)=>s+Number(solution[key]||0),0)});
      }
    }

    const clueMap={};
    for(const run of across){
      const [r,c]=run.cells[0].split(",").map(Number);
      const key=`${r},${c-1}`;
      clueMap[key] ||= {};
      clueMap[key].across=run.sum;
    }
    for(const run of down){
      const [r,c]=run.cells[0].split(",").map(Number);
      const key=`${r-1},${c}`;
      clueMap[key] ||= {};
      clueMap[key].down=run.sum;
    }

    return { mask, rows:R, cols:C, across, down, clueMap };
  }

  function renderKakuro(session, puzzle) {
    const cells=[];
    for(let r=0;r<puzzle.rows;r+=1){
      for(let c=0;c<puzzle.cols;c+=1){
        const key=`${r},${c}`;
        if(puzzle.mask[r][c]){
          const value=escAttr(session.values?.[key] || "");
          cells.push(`<div class="kakuro-cell-v314ar is-white"><input data-kakuro-cell="${key}" inputmode="numeric" pattern="[1-9]" maxlength="1" value="${value}" aria-label="Kakuro cell row ${r+1} column ${c+1}" /></div>`);
        }else{
          const clue=puzzle.clueMap[key] || {};
          cells.push(`<div class="kakuro-cell-v314ar is-black">${clue.down?`<span class="down">${clue.down}↓</span>`:""}${clue.across?`<span class="across">${clue.across}→</span>`:""}</div>`);
        }
      }
    }
    return `<div class="kakuro-board-v314ar" style="--kakuro-cols:${puzzle.cols}">${cells.join("")}</div>
      <p class="logic-input-hint-v314ar">Digits may repeat elsewhere in the puzzle, just not inside the same clue run.</p>`;
  }

  function validateKakuro(session, puzzle) {
    const values=session.values || {};
    const allRuns=[...puzzle.across,...puzzle.down];
    for(const run of allRuns){
      const nums=run.cells.map(key=>Number(values[key]||0));
      if(nums.some(n=>n<1||n>9)) return {ok:false,copy:"Every white cell needs a digit from 1 to 9."};
      if(new Set(nums).size!==nums.length) return {ok:false,copy:"A digit repeats inside one clue run."};
      if(nums.reduce((a,b)=>a+b,0)!==run.sum) return {ok:false,copy:"At least one clue sum is not correct yet."};
    }
    return {ok:true};
  }

  // ------------------------------------------------------------
  // Shared solve / reward / persistence
  // ------------------------------------------------------------

  function checkCurrent() {
    const session=currentSession();
    const puzzle=currentPuzzle();
    if(!session||!puzzle)return false;

    let result;
    if(activeGame==="slitherlink") result=validateSlither(session,puzzle);
    else if(activeGame==="nurikabe") result=validateNurikabe(session,puzzle);
    else result=validateKakuro(session,puzzle);

    if(!result.ok){
      session.result={kind:"is-error",title:"Not quite yet",copy:result.copy||"Something still needs another look."};
      session.updatedAt=Date.now();
      saveNow(`logic-${activeGame}-check`);
      render();
      return false;
    }

    if(!session.completedAt){
      session.completedAt=Date.now();
      gameState(activeGame).solvedTotal=Number(gameState(activeGame).solvedTotal||0)+1;
      const reward=awardSolve(activeGame,activeMode,session);
      if(reward?.eventId)session.rewardEventId=reward.eventId;
    }

    session.result={
      kind:"is-success",
      title:`${GAME_META[activeGame].title} solved ✓`,
      copy:activeMode==="daily"
        ? "Today's puzzle is complete. Practice stays open if you want another one."
        : "Practice puzzle complete. You can draw another whenever you feel like it."
    };
    saveNow(`logic-${activeGame}-complete`);
    refreshCards();
    render();
    return true;
  }

  function awardSolve(id, mode, session) {
    const root=app.getState();
    const date=dateKey();
    let spec=null;

    if(mode==="daily"){
      const sourceId=`${id}:daily:${date}`;
      const existing=(root.rewardLedger?.events||[]).find(event=>event?.source==="logic-unlock-complete"&&event?.sourceId===sourceId);
      if(existing)return existing;
      const g=gameState(id);
      if(!g.solvedDailyDates.includes(date))g.solvedDailyDates.push(date);
      g.solvedDailyDates=g.solvedDailyDates.slice(-120);
      spec={
        source:"logic-unlock-complete",
        sourceId,
        label:`${GAME_META[id].title} Daily`,
        realm:"Knowledge",
        capability:"knowledge",
        xp:6,realmXP:8,statXP:8,coins:6,storyEnergyBase:.15,
        progressionRelevant:true,
        metadata:{logicExpansion:true,gameId:id,mode:"daily",puzzleIndex:session.puzzleIndex}
      };
    }else{
      const g=gameState(id);
      const used=Number(g.practiceRewardByDate[date]||0);
      if(used>=2)return null;
      g.practiceRewardByDate[date]=used+1;
      spec={
        source:"logic-unlock-complete",
        sourceId:`${id}:practice:${date}:${used+1}`,
        label:`${GAME_META[id].title} Practice`,
        realm:"Knowledge",
        capability:"knowledge",
        xp:2,realmXP:3,statXP:3,coins:2,storyEnergyBase:.03,
        progressionRelevant:true,
        metadata:{logicExpansion:true,gameId:id,mode:"practice",puzzleIndex:session.puzzleIndex,practiceReward:used+1}
      };
    }

    const reward=app.awardActivity(spec);
    if(reward){
      app.showToast?.(`${GAME_META[id].icon} ${GAME_META[id].title} solved · +${Number(reward.xp||0)} XP · +${Number(reward.coins||0)} 🪙${Number(reward.storyEnergy||0)?` · +${app.formatEnergy?.(reward.storyEnergy)??reward.storyEnergy} 🔥`:""}`);
    }
    return reward;
  }

  function clearCurrent() {
    const session=currentSession();
    if(!session)return;
    const completed=session.completedAt;
    const rewardEventId=session.rewardEventId;
    const key=session.key,puzzleIndex=session.puzzleIndex,startedAt=session.startedAt;
    const fresh=newSession(activeGame,key,puzzleIndex);
    fresh.startedAt=startedAt;
    // Clearing a completed Daily is a replay, not a way to erase the already-paid reward.
    if(completed){
      fresh.replay=true;
      fresh.rewardEventId=rewardEventId||null;
    }
    const g=gameState(activeGame);
    if(activeMode==="daily")g.daily=fresh;else g.practice=fresh;
    saveNow(`logic-${activeGame}-clear`);
    render();
  }

  function newPractice() {
    const g=gameState(activeGame);
    g.practiceSerial=Number(g.practiceSerial||0)+1;
    g.practice=null;
    ensureSession(activeGame,"practice");
    saveNow(`logic-${activeGame}-new-practice`);
    render();
  }

  function solvedToday(id) {
    const date=dateKey();
    if(gameState(id).solvedDailyDates.includes(date))return true;
    return (app.getState().rewardLedger?.events||[]).some(event=>event?.source==="logic-unlock-complete"&&event?.sourceId===`${id}:daily:${date}`);
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer=window.setTimeout(()=>saveNow(`logic-${activeGame}-progress`),120);
  }

  function saveNow(source) {
    app.saveState({source});
  }

  function dateKey(value=new Date()) {
    const d=value instanceof Date?value:new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function seededIndex(seed,length) {
    let h=2166136261;
    for(const ch of String(seed||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
    return Math.abs(h>>>0)%Math.max(1,length);
  }

  function esc(value) {
    return app.escapeHtml?app.escapeHtml(value):String(value??"");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g,"&#96;");
  }

  window.LifeRPGLogicExpansion={
    version:VERSION,
    open,
    refresh:refreshCards,
    isUnlocked:unlocked,
    getStatus:id=>({
      unlocked:unlocked(id),
      dailySolved:solvedToday(id),
      solvedTotal:Number(gameState(id)?.solvedTotal||0)
    })
  };
})();