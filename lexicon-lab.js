(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const DATA = window.LIFE_RPG_LEXICON_LAB_DATA || {};
  const ENRICHMENT = window.LIFE_RPG_LEXICON_LAB_ENRICHMENT || {};
  const ENTRIES = Array.isArray(DATA.entries) ? DATA.entries : [];
  const PUZZLES = Array.isArray(DATA.puzzles) ? DATA.puzzles : [];
  if (!app?.getState || !app?.awardActivity || !ENTRIES.length || !PUZZLES.length) return;

  const VERSION = "0.31.4y";
  const SCHEMA = 2;
  const TOTAL = PUZZLES.length;
  const REPEAT_SCALES = [1, .75, .5, .35];
  const TIERS = {
    1: { xp: 18, statXP: 12, coins: 10, story: .5 },
    2: { xp: 21, statXP: 14, coins: 12, story: .65 },
    3: { xp: 24, statXP: 16, coins: 15, story: .85 },
    4: { xp: 28, statXP: 19, coins: 18, story: 1.05 },
    5: { xp: 32, statXP: 22, coins: 21, story: 1.3 }
  };
  const ENTRY_BY_ID = Object.fromEntries(ENTRIES.map(entry => [entry.id, entry]));

  const els = {
    dialog: byId("lexiconLabDialog"), close: byId("lexiconLabClose"), daily: byId("lexiconLabDailyCard"),
    progress: byId("lexiconLabJourneyProgress"), levels: byId("lexiconLabLevelGrid"), stats: byId("lexiconLabStats"),
    collections: byId("lexiconLabCollections"), recent: byId("lexiconLabRecentWords"), status: byId("lexiconLabStatus"),
    play: byId("lexiconLabPlayPanel"), puzzleMeta: byId("lexiconLabPuzzleMeta"), board: byId("lexiconCrosswordBoard"),
    across: byId("lexiconAcrossClues"), down: byId("lexiconDownClues"), check: byId("lexiconCheckPuzzle"), clear: byId("lexiconClearPuzzle"),
    result: byId("lexiconLabResult"), hintPanel: byId("lexiconHintPanel"), growthStats: byId("lexiconLabGrowthStats"), trainingStats: byId("trainingGroundsLexiconStatus"),
    quickStatus: byId("lexiconLabQuickStatus")
  };

  let focusedCellKey = null;
  let saveTimer = null;

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
      words: {},
      dailyWords: {},
      stats: { puzzlesSolved: 0, perfectWords: 0, checks: 0, contextTries: 0, contextCorrect: 0 },
      completed: []
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.lexiconLab || typeof root.lexiconLab !== "object" || Array.isArray(root.lexiconLab)) root.lexiconLab = defaults();
    const s = root.lexiconLab;
    s.schemaVersion = SCHEMA;
    s.journey ||= defaults().journey;
    s.words ||= {};
    s.dailyWords = s.dailyWords && typeof s.dailyWords === "object" && !Array.isArray(s.dailyWords) ? s.dailyWords : {};
    s.stats ||= defaults().stats;
    s.completed = Array.isArray(s.completed) ? s.completed.slice(-300) : [];
    const dailyKeys = Object.keys(s.dailyWords).sort();
    while (dailyKeys.length > 180) delete s.dailyWords[dailyKeys.shift()];
    s.journey.completedLevels = [...new Set((s.journey.completedLevels || []).map(Number).filter(level => level >= 1 && level <= TOTAL))].sort((a,b) => a-b);
    s.journey.active = normalizeActive(s.journey.active);
    ["puzzlesSolved", "perfectWords", "checks", "contextTries", "contextCorrect"].forEach(key => s.stats[key] = Math.max(0, Number(s.stats[key] || 0)));
    for (const [id, record] of Object.entries(s.words)) s.words[id] = normalizeWordRecord(record);
    return s;
  }

  function normalizeWordRecord(record) {
    const out = record && typeof record === "object" ? { ...record } : {};
    out.encounters = Math.max(0, Number(out.encounters || 0));
    out.successfulRecalls = Math.max(0, Number(out.successfulRecalls || 0));
    out.misses = Math.max(0, Number(out.misses || 0));
    out.lastSeen = out.lastSeen || null;
    out.status = masteryStatus(out);
    return out;
  }

  function normalizeActive(active) {
    if (!active || typeof active !== "object") return null;
    const puzzle = puzzleDef(active.level);
    if (!puzzle) return null;
    const cells = buildPuzzleCells(puzzle);
    const values = {};
    for (const key of Object.keys(cells)) {
      const raw = active.values?.[key];
      values[key] = raw ? normalizeLetter(raw) : "";
    }
    return {
      ...active,
      id: String(active.id || `lexicon-crossword-l${puzzle.level}`),
      level: puzzle.level,
      values,
      activeWordId: puzzle.words.some(w => w.id === active.activeWordId) ? active.activeWordId : puzzle.words[0]?.id || null,
      missedWordIds: [...new Set((active.missedWordIds || []).filter(id => puzzle.words.some(w => w.id === id)))],
      hintLevels: Object.fromEntries(Object.entries(active.hintLevels || {}).filter(([id]) => puzzle.words.some(w => w.id === id)).map(([id, value]) => [id, Math.max(0, Math.min(5, Number(value || 0)))])),
      encountersRegistered: Boolean(active.encountersRegistered),
      replay: Boolean(active.replay),
      createdAt: Number(active.createdAt || Date.now()),
      updatedAt: Number(active.updatedAt || active.createdAt || Date.now()),
      completedAt: active.completedAt ? Number(active.completedAt) : null,
      rewardEventId: active.rewardEventId || null
    };
  }

  function state() { return ensureState(); }
  function current() { return state().journey.active; }
  function completedSet() { return new Set(state().journey.completedLevels); }
  function puzzleDef(level) { return PUZZLES.find(item => Number(item.level) === Number(level)) || null; }
  function nextLevel() { for (let level = 1; level <= TOTAL; level += 1) if (!completedSet().has(level)) return level; return null; }
  function tier(level) { return Math.min(5, Math.max(1, Math.ceil(Number(level || 1) / 6))); }

  function enrichedPool() {
    return ENTRIES.filter(entry => ENRICHMENT[entry.id]?.example && ENRICHMENT[entry.id]?.nuance);
  }

  function stableHash(text) {
    let hash = 2166136261 >>> 0;
    for (const char of String(text || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function dailyWordEntry(dateKey = localDateKey(new Date())) {
    const pool = enrichedPool();
    if (!pool.length) return ENTRIES[0] || null;
    return pool[stableHash(`lexicon-daily:${dateKey}`) % pool.length];
  }

  function dailyContextEntry(dateKey = localDateKey(new Date())) {
    const pool = enrichedPool();
    if (!pool.length) return ENTRIES[0] || null;
    const daily = dailyWordEntry(dateKey);
    let index = stableHash(`lexicon-context:${dateKey}`) % pool.length;
    if (pool[index]?.id === daily?.id) index = (index + 7) % pool.length;
    return pool[index];
  }

  function registerWordEncounter(s, entry, source = "encounter") {
    if (!s || !entry) return;
    const rec = s.words[entry.id] = normalizeWordRecord(s.words[entry.id]);
    rec.encounters += 1;
    rec.lastSeen = new Date().toISOString();
    rec.lastEncounterSource = source;
    rec.status = masteryStatus(rec);
  }

  function recordDailyWord(response) {
    if (!["known", "heard", "new"].includes(response)) return;
    const s = state();
    const key = localDateKey(new Date());
    const entry = dailyWordEntry(key);
    if (!entry) return;
    const existing = s.dailyWords[key] && typeof s.dailyWords[key] === "object" ? s.dailyWords[key] : {};
    if (!existing.encounterRegistered) registerWordEncounter(s, entry, "daily-word");
    s.dailyWords[key] = {
      ...existing,
      entryId: entry.id,
      response,
      encounterRegistered: true,
      seenAt: existing.seenAt || Date.now(),
      updatedAt: Date.now()
    };
    persist("lexicon-daily-word");
  }

  function openDailyContext() {
    const s = state();
    const key = localDateKey(new Date());
    const entry = dailyContextEntry(key);
    if (!entry) return;
    const existing = s.dailyWords[key] && typeof s.dailyWords[key] === "object" ? s.dailyWords[key] : {};
    if (!existing.contextEncounterRegistered) registerWordEncounter(s, entry, "context-clue");
    s.dailyWords[key] = {
      ...existing,
      entryId: existing.entryId || dailyWordEntry(key)?.id || null,
      contextOpen: true,
      contextWordId: entry.id,
      contextEncounterRegistered: true,
      contextAnswered: existing.contextWordId === entry.id ? Boolean(existing.contextAnswered) : false,
      contextChoiceId: existing.contextWordId === entry.id ? existing.contextChoiceId || null : null,
      contextCorrect: existing.contextWordId === entry.id ? Boolean(existing.contextCorrect) : false,
      updatedAt: Date.now()
    };
    persist("lexicon-context-open");
  }

  function contextOptions(entry, dateKey = localDateKey(new Date())) {
    const pool = enrichedPool().filter(item => item.id !== entry.id);
    const first = pool[stableHash(`lexicon-context-a:${dateKey}:${entry.id}`) % Math.max(1, pool.length)];
    let second = pool[stableHash(`lexicon-context-b:${dateKey}:${entry.id}`) % Math.max(1, pool.length)];
    if (second?.id === first?.id) second = pool[(pool.indexOf(first) + 11) % Math.max(1, pool.length)];
    const options = [entry, first, second].filter(Boolean);
    return options.sort((a, b) => (stableHash(`${dateKey}:${a.id}`) % 100000) - (stableHash(`${dateKey}:${b.id}`) % 100000));
  }

  function answerDailyContext(choiceId) {
    const s = state();
    const key = localDateKey(new Date());
    const record = s.dailyWords[key];
    if (!record?.contextOpen || record.contextAnswered) return;
    const entry = ENTRY_BY_ID[record.contextWordId] || dailyContextEntry(key);
    if (!entry) return;
    record.contextAnswered = true;
    record.contextChoiceId = String(choiceId || "");
    record.contextCorrect = record.contextChoiceId === entry.id;
    record.updatedAt = Date.now();
    s.stats.contextTries += 1;
    if (record.contextCorrect) s.stats.contextCorrect += 1;
    persist("lexicon-context-answer");
  }

  function responseLabel(value) {
    return ({ known: "Kannte ich", heard: "Schon mal gehört", new: "Neu für mich" })[value] || "Gespeichert";
  }

  function contextSentenceMarkup(entry) {
    const example = String(ENRICHMENT[entry?.id]?.example || "");
    const term = String(entry?.term || "");
    if (!example || !term) return escapeHtml(example || term);
    const lower = example.toLocaleLowerCase("de-DE");
    const needle = term.toLocaleLowerCase("de-DE");
    const index = lower.indexOf(needle);
    if (index < 0) return escapeHtml(example);
    return `${escapeHtml(example.slice(0, index))}<mark>${escapeHtml(example.slice(index, index + term.length))}</mark>${escapeHtml(example.slice(index + term.length))}`;
  }

  function renderDailyContextMarkup(record, dateKey) {
    if (!record?.contextOpen) return `<button class="secondary-button lexicon-context-launch-v314y" type="button" data-lexicon-context-start>◇ Meaning from context</button>`;
    const entry = ENTRY_BY_ID[record.contextWordId] || dailyContextEntry(dateKey);
    if (!entry) return "";
    const options = contextOptions(entry, dateKey);
    const result = record.contextAnswered
      ? `<div class="lexicon-context-result-v314y ${record.contextCorrect ? "is-correct" : "is-learning"}"><strong>${record.contextCorrect ? "✓ Nice inference." : "Not quite — this one was about context, not memorizing."}</strong><p><b>${escapeHtml(entry.term)}</b>: ${escapeHtml(entry.clue)}</p></div>`
      : `<div class="lexicon-context-options-v314y">${options.map(option => `<button type="button" data-lexicon-context-choice="${escapeAttr(option.id)}"><span>${escapeHtml(option.clue)}</span></button>`).join("")}</div>`;
    return `<section class="lexicon-context-card-v314y"><div><small>CONTEXT CLUE · DIFFERENT WORD</small><strong>What does <em>${escapeHtml(entry.term)}</em> probably mean here?</strong></div><p class="lexicon-context-sentence-v314y">${contextSentenceMarkup(entry)}</p>${result}</section>`;
  }

  function renderHintPanel() {
    if (!els.hintPanel) return;
    const active = current();
    const puzzle = active ? puzzleDef(active.level) : null;
    const placement = puzzle?.words.find(word => word.id === active?.activeWordId);
    const entry = placement ? ENTRY_BY_ID[placement.id] : null;
    if (!active || !placement || !entry || active.completedAt) {
      els.hintPanel.classList.add("hidden");
      els.hintPanel.innerHTML = "";
      return;
    }
    const level = Math.max(0, Math.min(5, Number(active.hintLevels?.[entry.id] || 0)));
    const copy = level ? hintCopy(entry, placement, level) : "Stuck? Hints get gradually more explicit. Using one never removes the normal crossword completion reward.";
    const direction = placement.dir === "down" ? "DOWN" : "ACROSS";
    els.hintPanel.classList.remove("hidden");
    els.hintPanel.innerHTML = `<div><small>HELP FOR ${placement.number} ${direction}</small><p>${copy}</p></div>${level < 5 ? `<button class="secondary-button" type="button" data-lexicon-hint-next>${level ? "Another hint" : "Give me a hint"}</button>` : ""}`;
  }

  function redactedNuance(entry) {
    const details = ENRICHMENT[entry.id] || {};
    const source = String(details.nuance || `This word belongs to ${entry.theme}.`);
    const escapedTerm = String(entry.term || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!escapedTerm) return escapeHtml(source);
    return escapeHtml(source.replace(new RegExp(escapedTerm, "giu"), "Dieses Wort"));
  }

  function blankedExampleMarkup(entry) {
    const example = String(ENRICHMENT[entry.id]?.example || "");
    const term = String(entry.term || "");
    if (!example || !term) return "No context hint available for this word.";
    const lower = example.toLocaleLowerCase("de-DE");
    const needle = term.toLocaleLowerCase("de-DE");
    const index = lower.indexOf(needle);
    if (index < 0) return "This example uses a related word form, so revealing it would make the answer too obvious. The next hint gives you the word shape instead.";
    return `${escapeHtml(example.slice(0, index))}<mark>_____</mark>${escapeHtml(example.slice(index + term.length))}`;
  }

  function hintCopy(entry, placement, level) {
    const letters = Array.from(String(entry.answer || entry.term || "").toUpperCase());
    if (level === 1) return `<b>Another angle:</b> ${redactedNuance(entry)}`;
    if (level === 2) return `<b>In context:</b> ${blankedExampleMarkup(entry)}`;
    if (level === 3) return `<b>Word shape:</b> ${escapeHtml(letters[0] || "?")}…${escapeHtml(letters.at(-1) || "?")} · ${letters.length} letters.`;
    if (level === 4) return `<b>Grid help:</b> I filled a couple of internal letters into this word. Keep solving from there.`;
    return `<b>Answer:</b> ${escapeHtml(entry.term)}. No penalty — use it, finish the puzzle, and let the word become familiar over time.`;
  }

  function advanceHint() {
    const s = state();
    const active = s.journey.active;
    const puzzle = active ? puzzleDef(active.level) : null;
    const placement = puzzle?.words.find(word => word.id === active?.activeWordId);
    if (!active || !placement || active.completedAt) return;
    const next = Math.min(5, Math.max(0, Number(active.hintLevels?.[placement.id] || 0)) + 1);
    active.hintLevels ||= {};
    active.hintLevels[placement.id] = next;
    if (!active.missedWordIds.includes(placement.id)) active.missedWordIds.push(placement.id);
    if (next === 4) revealHintLetters(active, placement);
    active.updatedAt = Date.now();
    app.saveState({ source: `lexicon-hint-${next}` });
    renderBoard();
  }

  function revealHintLetters(active, placement) {
    const entry = ENTRY_BY_ID[placement.id];
    const answer = Array.from(String(entry?.answer || "").toUpperCase());
    if (answer.length < 3) return;
    const candidates = [...new Set([Math.floor(answer.length / 3), Math.floor(answer.length * 2 / 3)])].filter(index => index > 0 && index < answer.length - 1);
    for (const index of candidates) {
      const row = placement.row + (placement.dir === "down" ? index : 0);
      const col = placement.col + (placement.dir === "across" ? index : 0);
      const key = `${row},${col}`;
      if (!active.values[key]) active.values[key] = answer[index];
    }
  }

  function bind() {
    els.close?.addEventListener("click", () => els.dialog?.open && els.dialog.close());
    els.check?.addEventListener("click", checkPuzzle);
    els.clear?.addEventListener("click", clearPuzzle);

    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-lexicon-lab-open]");
      if (open) { event.preventDefault(); openDialog(); return; }
      const daily = event.target.closest?.("[data-lexicon-daily-start]");
      if (daily) { event.preventDefault(); startLevel(nextLevel() || TOTAL, { replay: !nextLevel() }); return; }
      const dailyResponse = event.target.closest?.("[data-lexicon-daily-response]");
      if (dailyResponse) { event.preventDefault(); recordDailyWord(dailyResponse.dataset.lexiconDailyResponse); return; }
      const contextStart = event.target.closest?.("[data-lexicon-context-start]");
      if (contextStart) { event.preventDefault(); openDailyContext(); return; }
      const contextChoice = event.target.closest?.("[data-lexicon-context-choice]");
      if (contextChoice) { event.preventDefault(); answerDailyContext(contextChoice.dataset.lexiconContextChoice); return; }
      const hintNext = event.target.closest?.("[data-lexicon-hint-next]");
      if (hintNext) { event.preventDefault(); advanceHint(); return; }
      const levelButton = event.target.closest?.("[data-lexicon-level]");
      if (levelButton) {
        event.preventDefault();
        const level = Number(levelButton.dataset.lexiconLevel || 0);
        if (level && !levelButton.disabled) startLevel(level, { replay: completedSet().has(level) });
        return;
      }
      const clue = event.target.closest?.("[data-lexicon-word]");
      if (clue) { event.preventDefault(); focusWord(clue.dataset.lexiconWord); return; }
      const nextButton = event.target.closest?.("[data-lexicon-next-level]");
      if (nextButton) { event.preventDefault(); const next = nextLevel(); if (next) startLevel(next); return; }
      const back = event.target.closest?.("[data-lexicon-return]");
      if (back) { event.preventDefault(); window.LifeRPGTrainingFocus?.exit?.({ reopen: false }); openDialog(); }
    });

    els.board?.addEventListener("focusin", event => {
      const input = event.target.closest?.("[data-lexicon-cell]");
      if (!input) return;
      const key = input.dataset.lexiconCell;
      const active = current();
      if (!active) return;
      const puzzle = puzzleDef(active.level);
      const cell = buildPuzzleCells(puzzle)[key];
      if (!cell) return;
      if (focusedCellKey === key && cell.wordIds.length > 1) {
        const idx = cell.wordIds.indexOf(active.activeWordId);
        active.activeWordId = cell.wordIds[(idx + 1) % cell.wordIds.length];
      } else if (!cell.wordIds.includes(active.activeWordId)) {
        active.activeWordId = cell.wordIds[0];
      }
      focusedCellKey = key;
      queueSave("lexicon-focus");
      updateHighlights();
      renderHintPanel();
    });

    els.board?.addEventListener("input", event => {
      const input = event.target.closest?.("[data-lexicon-cell]");
      if (!input) return;
      const active = current();
      if (!active || active.completedAt) return;
      const key = input.dataset.lexiconCell;
      const letter = normalizeLetter(input.value);
      active.values[key] = letter;
      input.value = letter;
      input.classList.remove("is-wrong", "is-empty");
      active.updatedAt = Date.now();
      queueSave("lexicon-input");
      if (letter) moveAlongActiveWord(key, 1);
    });

    els.board?.addEventListener("keydown", event => {
      const input = event.target.closest?.("[data-lexicon-cell]");
      if (!input) return;
      const key = input.dataset.lexiconCell;
      if (event.key === "Enter") { event.preventDefault(); checkPuzzle(); return; }
      if (event.key === "Backspace" && !input.value) { event.preventDefault(); moveAlongActiveWord(key, -1); return; }
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault();
        moveGrid(key, event.key);
      }
    });
  }

  function openDialog() {
    render();
    if (els.dialog && !els.dialog.open) els.dialog.showModal();
  }

  function startLevel(level, { replay = false } = {}) {
    const puzzle = puzzleDef(level);
    if (!puzzle) return;
    const allowed = level <= 1 || completedSet().has(level) || completedSet().has(level - 1);
    if (!allowed) return;
    const existing = current();
    if (existing && !existing.completedAt && existing.level === level && Boolean(existing.replay) === Boolean(replay)) {
      enterFocus(existing); render(); return;
    }
    const cells = buildPuzzleCells(puzzle);
    state().journey.active = {
      id: `lexicon-crossword-l${level}${replay ? "-replay" : ""}`,
      level,
      values: Object.fromEntries(Object.keys(cells).map(key => [key, ""])),
      activeWordId: puzzle.words[0]?.id || null,
      missedWordIds: [],
      hintLevels: {},
      encountersRegistered: false,
      replay: Boolean(replay),
      createdAt: Date.now(), updatedAt: Date.now(), completedAt: null, rewardEventId: null
    };
    registerEncounters(state().journey.active, puzzle);
    persist("lexicon-start");
    enterFocus(current());
  }

  function registerEncounters(active, puzzle) {
    if (active.encountersRegistered) return;
    const now = new Date().toISOString();
    for (const word of puzzle.words) {
      const rec = state().words[word.id] = normalizeWordRecord(state().words[word.id]);
      rec.encounters += 1;
      rec.lastSeen = now;
      rec.status = masteryStatus(rec);
    }
    active.encountersRegistered = true;
  }

  function render() {
    renderOverview();
    renderBoard();
    renderResult();
    syncFocusHeader();
  }

  function renderOverview() {
    const s = state();
    const next = nextLevel();
    const counts = masteryCounts();
    if (els.stats) els.stats.innerHTML = statPills(counts);
    if (els.growthStats) els.growthStats.innerHTML = `<span><b>${s.journey.completedLevels.length}/${TOTAL}</b> Crosswords</span><span><b>${counts.discovered}</b> discovered</span><span><b>${counts.active + counts.mastered}</b> active/mastered</span>`;
    if (els.trainingStats) els.trainingStats.textContent = next ? `Crossword ${next}/${TOTAL} · ${counts.discovered} words discovered` : `30/30 complete · ${counts.discovered} words discovered`;
    if (els.quickStatus) els.quickStatus.textContent = next ? `Academic Crossword ${s.journey.completedLevels.length}/${TOTAL} · next Puzzle ${next}` : `Academic Crosswords ${TOTAL}/${TOTAL} complete`;
    renderDaily(next);
    renderProgress();
    renderLevels();
    renderCollections();
    renderRecent();
  }

  function renderDaily(next) {
    if (!els.daily) return;
    const s = state();
    const dateKey = localDateKey(new Date());
    const entry = dailyWordEntry(dateKey);
    const details = entry ? (ENRICHMENT[entry.id] || {}) : {};
    const record = s.dailyWords[dateKey] && typeof s.dailyWords[dateKey] === "object" ? s.dailyWords[dateKey] : {};
    const active = current();
    const wordMarkup = entry ? `
      <article class="lexicon-daily-word-v314y">
        <div class="lexicon-daily-word-heading-v314y"><div><small>WORTFUND DES TAGES · ${escapeHtml(entry.theme)}</small><strong>${escapeHtml(entry.term)}</strong></div><span>✦</span></div>
        <p class="lexicon-daily-definition-v314y">${escapeHtml(entry.clue)}</p>
        <div class="lexicon-daily-detail-v314y"><small>IM SATZ</small><span>${escapeHtml(details.example || "")}</span></div>
        <div class="lexicon-daily-detail-v314y"><small>NUANCE</small><span>${escapeHtml(details.nuance || "")}</span></div>
        ${record.response
          ? `<div class="lexicon-daily-response-status-v314y"><span>✓ ${escapeHtml(responseLabel(record.response))}</span><small>Nur entdeckt, nicht abgefragt. Das Wort darf dir später wieder begegnen.</small></div>${renderDailyContextMarkup(record, dateKey)}`
          : `<div class="lexicon-daily-response-v314y" role="group" aria-label="How familiar is today's word?"><button type="button" data-lexicon-daily-response="known">Kannte ich</button><button type="button" data-lexicon-daily-response="heard">Schon mal gehört</button><button type="button" data-lexicon-daily-response="new">Neu für mich</button></div><small class="lexicon-daily-noquiz-v314y">Kein Quiz, kein Streak. Nur ein interessantes Wort zum Mitnehmen.</small>`}
      </article>` : "";

    let crosswordMarkup = "";
    if (!next) {
      crosswordMarkup = `<aside class="lexicon-crossword-next-v314y"><small>CROSSWORD JOURNEY</small><strong>30/30 complete ✦</strong><p>Crosswords bleiben als freiwilliger Recall-Modus. Hinweise kosten keine normale Puzzle-Belohnung.</p><button class="secondary-button" type="button" data-lexicon-level="30">Replay Puzzle 30</button></aside>`;
    } else {
      const puzzle = puzzleDef(next);
      const continuing = Boolean(active && !active.completedAt && active.level === next);
      crosswordMarkup = `<aside class="lexicon-crossword-next-v314y"><small>CROSSWORD JOURNEY · OPTIONAL</small><strong>${continuing ? `Continue Puzzle ${next}` : `Puzzle ${next} · ${escapeHtml(puzzle.title)}`}</strong><p>${escapeHtml(puzzle.theme)} · ${puzzle.words.length} terms. Use the hint ladder whenever a word will not come to mind.</p><button class="secondary-button" type="button" data-lexicon-daily-start>${continuing ? "Continue" : "Start"} Puzzle ${next}</button></aside>`;
    }
    els.daily.innerHTML = `${wordMarkup}${crosswordMarkup}`;
  }

  function renderProgress() {
    if (!els.progress) return;
    const done = state().journey.completedLevels.length;
    const pct = Math.round(done / TOTAL * 100);
    els.progress.innerHTML = `<div><span><strong>${done}/${TOTAL}</strong> Academic Crosswords</span><span>${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div>`;
  }

  function renderLevels() {
    if (!els.levels) return;
    const done = completedSet();
    const next = nextLevel();
    const active = current();
    els.levels.innerHTML = PUZZLES.map(puzzle => {
      const complete = done.has(puzzle.level);
      const unlocked = complete || puzzle.level === 1 || done.has(puzzle.level - 1);
      const isActive = active && !active.completedAt && active.level === puzzle.level;
      return `<button type="button" data-lexicon-level="${puzzle.level}" ${unlocked ? "" : "disabled"} class="lexicon-level-v314q ${complete ? "complete" : ""} ${isActive ? "active" : ""} ${puzzle.level === next ? "next" : ""}"><span>${complete ? "✓" : isActive ? "▶" : unlocked ? puzzle.level : "🔒"}</span><small>${escapeHtml(puzzle.theme.split(" / ")[0])}</small></button>`;
    }).join("");
  }

  function renderCollections() {
    if (!els.collections) return;
    const themeNames = [...new Set(ENTRIES.map(entry => entry.theme))];
    els.collections.innerHTML = themeNames.map(theme => {
      const words = ENTRIES.filter(entry => entry.theme === theme);
      const discovered = words.filter(entry => state().words[entry.id]?.encounters > 0).length;
      const active = words.filter(entry => ["active","mastered"].includes(state().words[entry.id]?.status)).length;
      return `<div class="lexicon-collection-v314q"><span>${collectionIcon(theme)}</span><div><strong>${escapeHtml(theme)}</strong><small>${discovered}/${words.length} discovered · ${active} active</small></div></div>`;
    }).join("");
  }

  function renderRecent() {
    if (!els.recent) return;
    const recent = ENTRIES
      .map(entry => ({ entry, record: state().words[entry.id] }))
      .filter(item => item.record?.encounters)
      .sort((a,b) => new Date(b.record.lastSeen || 0) - new Date(a.record.lastSeen || 0))
      .slice(0, 10);
    if (!recent.length) {
      els.recent.innerHTML = `<div class="lexicon-empty-v314q"><span>✦</span><strong>Your personal lexicon starts with Puzzle 1.</strong><p>Words become Familiar and Active through repeated successful recall, not by clicking a definition once.</p></div>`;
      return;
    }
    els.recent.innerHTML = recent.map(({entry,record}) => `<div class="lexicon-word-chip-v314q"><div><strong>${escapeHtml(entry.term)}</strong><small>${escapeHtml(entry.theme)}</small></div><span class="${record.status}">${statusLabel(record.status)}</span></div>`).join("");
  }

  function renderBoard() {
    if (!els.board) return;
    const active = current();
    if (!active) {
      els.board.innerHTML = `<div class="lexicon-empty-v314q"><span>⌗</span><strong>Choose an Academic Crossword.</strong><p>Clues are definitions of advanced academic, scientific and professional German vocabulary.</p></div>`;
      if (els.puzzleMeta) els.puzzleMeta.innerHTML = "";
      if (els.across) els.across.innerHTML = "";
      if (els.down) els.down.innerHTML = "";
      if (els.hintPanel) { els.hintPanel.classList.add("hidden"); els.hintPanel.innerHTML = ""; }
      return;
    }
    const puzzle = puzzleDef(active.level);
    const cells = buildPuzzleCells(puzzle);
    if (els.puzzleMeta) els.puzzleMeta.innerHTML = `<span>Puzzle ${puzzle.level}/${TOTAL}</span><span>${escapeHtml(puzzle.title)}</span><span>${escapeHtml(puzzle.theme)}</span><span>${puzzle.words.length} terms</span>`;
    els.board.style.setProperty("--lex-cols", puzzle.width);
    els.board.style.setProperty("--lex-rows", puzzle.height);
    const markup = [];
    for (let row = 0; row < puzzle.height; row += 1) {
      for (let col = 0; col < puzzle.width; col += 1) {
        const key = `${row},${col}`;
        const cell = cells[key];
        if (!cell) {
          markup.push(`<span class="lexicon-block-v314q" aria-hidden="true"></span>`);
          continue;
        }
        const value = active.values[key] || "";
        markup.push(`<label class="lexicon-cell-v314q" data-lex-cell-wrap="${key}" data-lex-words="${cell.wordIds.join(" ")}">${cell.number ? `<small>${cell.number}</small>` : ""}<input data-lexicon-cell="${key}" maxlength="1" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${escapeAttr(value)}" aria-label="Crossword row ${row+1}, column ${col+1}" ${active.completedAt ? "disabled" : ""}></label>`);
      }
    }
    els.board.innerHTML = markup.join("");
    renderClues(puzzle);
    updateHighlights();
    renderHintPanel();
    if (els.check) els.check.disabled = Boolean(active.completedAt);
    if (els.clear) els.clear.disabled = Boolean(active.completedAt);
  }

  function renderClues(puzzle) {
    const groups = { across: [], down: [] };
    for (const placement of [...puzzle.words].sort((a,b) => a.number-b.number || a.dir.localeCompare(b.dir))) {
      const entry = ENTRY_BY_ID[placement.id];
      groups[placement.dir].push(`<button type="button" data-lexicon-word="${placement.id}" class="lexicon-clue-v314q"><b>${placement.number}</b><span>${escapeHtml(entry.clue)}</span><em>${entry.term.length} letters</em></button>`);
    }
    if (els.across) els.across.innerHTML = groups.across.join("");
    if (els.down) els.down.innerHTML = groups.down.join("");
  }

  function updateHighlights() {
    const active = current();
    if (!active || !els.board) return;
    els.board.querySelectorAll("[data-lex-cell-wrap]").forEach(cell => {
      const words = String(cell.dataset.lexWords || "").split(" ");
      cell.classList.toggle("is-active-word", words.includes(active.activeWordId));
    });
    document.querySelectorAll("[data-lexicon-word]").forEach(clue => clue.classList.toggle("active", clue.dataset.lexiconWord === active.activeWordId));
  }

  function focusWord(wordId) {
    const active = current();
    const puzzle = active ? puzzleDef(active.level) : null;
    const placement = puzzle?.words.find(word => word.id === wordId);
    if (!placement) return;
    active.activeWordId = wordId;
    queueSave("lexicon-clue");
    updateHighlights();
    renderHintPanel();
    const first = els.board?.querySelector(`[data-lexicon-cell="${placement.row},${placement.col}"]`);
    first?.focus(); first?.select?.();
  }

  function checkPuzzle() {
    const active = current();
    if (!active || active.completedAt) return;
    const puzzle = puzzleDef(active.level);
    const cells = buildPuzzleCells(puzzle);
    let wrong = 0, empty = 0;
    const badWords = new Set();
    for (const [key, cell] of Object.entries(cells)) {
      const typed = normalizeLetter(active.values[key]);
      const input = els.board?.querySelector(`[data-lexicon-cell="${cssEscape(key)}"]`);
      input?.classList.remove("is-wrong", "is-empty");
      if (!typed) { empty += 1; input?.classList.add("is-empty"); cell.wordIds.forEach(id => badWords.add(id)); }
      else if (typed !== cell.answer) { wrong += 1; input?.classList.add("is-wrong"); cell.wordIds.forEach(id => badWords.add(id)); }
    }
    state().stats.checks += 1;
    for (const id of badWords) if (!active.missedWordIds.includes(id)) active.missedWordIds.push(id);
    active.updatedAt = Date.now();
    if (!wrong && !empty) {
      completePuzzle(active, puzzle);
      return;
    }
    persist("lexicon-check");
    if (els.status) {
      els.status.className = "lexicon-status-v314q is-warning";
      els.status.textContent = empty ? `${empty} field${empty === 1 ? " is" : "s are"} still empty${wrong ? ` and ${wrong} letter${wrong === 1 ? " is" : "s are"} incorrect` : ""}. Keep going.` : `${wrong} letter${wrong === 1 ? " is" : "s are"} incorrect. The marked cells stay local to this puzzle.`;
    }
  }

  function completePuzzle(active, puzzle) {
    const s = state();
    const live = s.journey.active;
    if (!live || live.completedAt || live.level !== active.level) return;
    live.completedAt = Date.now(); live.updatedAt = live.completedAt;
    const already = completedSet().has(live.level);
    const masteryChanges = updateMasteryAfterCompletion(live, puzzle);
    let reward = null;
    if (!live.replay && !already) {
      reward = award(live, puzzle, masteryChanges);
      s.journey.completedLevels.push(live.level);
      s.journey.completedLevels = [...new Set(s.journey.completedLevels)].sort((a,b) => a-b);
      s.stats.puzzlesSolved += 1;
      live.rewardEventId = reward.eventId || null;
    }
    s.completed.push({ id: live.id, level: live.level, replay: live.replay || already, completedAt: live.completedAt, rewardEventId: reward?.eventId || null, masteryChanges });
    s.completed = s.completed.slice(-300);
    persist(live.replay || already ? "lexicon-replay" : "lexicon-complete");
    if (els.status) { els.status.className = "lexicon-status-v314q is-success"; els.status.textContent = "✓ Crossword solved correctly. Your lexicon progress and rewards are saved."; }
    renderResult();
  }

  function updateMasteryAfterCompletion(active, puzzle) {
    const missed = new Set(active.missedWordIds || []);
    const changes = [];
    const now = new Date().toISOString();
    for (const word of puzzle.words) {
      const rec = state().words[word.id] = normalizeWordRecord(state().words[word.id]);
      const before = rec.status;
      rec.lastSeen = now;
      if (missed.has(word.id)) rec.misses += 1;
      else { rec.successfulRecalls += 1; state().stats.perfectWords += 1; }
      rec.status = masteryStatus(rec);
      if (before !== rec.status) changes.push({ id: word.id, from: before, to: rec.status });
    }
    return changes;
  }

  function award(active, puzzle, masteryChanges) {
    const sourceId = `crossword-l${active.level}`;
    const existing = (app.getState().rewardLedger?.events || []).find(event => event?.source === "lexicon-lab-complete" && event?.sourceId === sourceId);
    if (existing) return rewardFromEvent(existing);
    const meta = TIERS[tier(active.level)];
    const scale = REPEAT_SCALES[Math.min(todayCompletionCount(), REPEAT_SCALES.length - 1)];
    const perfectWords = puzzle.words.length - new Set(active.missedWordIds || []).size;
    return app.awardActivity({
      source: "lexicon-lab-complete", sourceId, label: `Lexicon Lab · Academic Crossword ${active.level}`,
      realm: "Knowledge", capability: "knowledge",
      xp: Math.max(1, Math.round(meta.xp * scale)),
      realmXP: Math.max(1, Math.round(meta.xp * scale)),
      statXP: Math.max(1, Math.round(meta.statXP * scale)),
      coins: Math.max(1, Math.round(meta.coins * scale)),
      storyEnergyBase: floor2(meta.story * scale), progressionRelevant: true,
      metadata: { lexiconLab: true, mode: "crossword", level: active.level, theme: puzzle.theme, wordCount: puzzle.words.length, perfectWords, masteryUpgrades: masteryChanges.length, repeatScale: scale }
    });
  }

  function renderResult() {
    if (!els.result) return;
    const active = current();
    if (!active?.completedAt) { els.result.classList.add("hidden"); return; }
    const puzzle = puzzleDef(active.level);
    const event = active.rewardEventId ? (app.getState().rewardLedger?.events || []).find(item => item?.id === active.rewardEventId) : null;
    const next = nextLevel();
    const reward = event ? rewardFromEvent(event) : null;
    const rewards = reward ? `<div class="training-result-rewards-v314o"><span>+${reward.xp} XP</span><span>+${reward.realmXP} Knowledge XP</span><span>+${reward.statXP} Lexicon XP</span><span>+${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} Story Energy</span><span>+${reward.coins} Coins</span></div>` : "";
    const recent = state().completed.slice().reverse().find(item => item.id === active.id);
    const upgrades = (recent?.masteryChanges || []).filter(item => ["familiar","active","mastered"].includes(item.to));
    const upgradeText = upgrades.length ? `<p class="lexicon-mastery-note-v314q">${upgrades.map(item => `${escapeHtml(ENTRY_BY_ID[item.id]?.term || item.id)} → ${statusLabel(item.to)}`).join(" · ")}</p>` : "";
    els.result.className = "training-result-v314o is-success";
    els.result.innerHTML = `<span>✓</span><strong>Puzzle ${active.level} solved correctly!</strong><p>${active.replay || !event ? "Replay complete — no duplicate first-completion reward." : next ? `Your rewards are saved and Puzzle ${next} is unlocked.` : "Your rewards are saved. Academic Crossword Journey complete!"}</p>${upgradeText}${rewards}<div class="training-result-actions-v314o">${next ? `<button class="primary-button" data-lexicon-next-level type="button">Start Puzzle ${next}</button>` : ""}<button class="secondary-button" data-lexicon-return type="button">Back to Lexicon Lab</button></div>`;
    renderBoard();
  }

  function clearPuzzle() {
    const active = current();
    if (!active || active.completedAt) return;
    Object.keys(active.values).forEach(key => active.values[key] = "");
    active.updatedAt = Date.now();
    persist("lexicon-clear");
    if (els.status) { els.status.className = "lexicon-status-v314q"; els.status.textContent = "Puzzle cleared. Your Journey progress is unchanged."; }
  }

  function enterFocus(active = current()) {
    if (!active || !els.play || !window.LifeRPGTrainingFocus?.enter) return false;
    if (els.dialog?.open) els.dialog.close();
    const puzzle = puzzleDef(active.level);
    render();
    return window.LifeRPGTrainingFocus.enter({
      id: "lexicon-lab", node: els.play, title: `Lexicon Lab · Crossword ${active.level}`,
      subtitle: `${puzzle.title} · ${puzzle.theme}`, tone: "light",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function syncFocusHeader() {
    const active = current();
    if (!active || !window.LifeRPGTrainingFocus?.isActive?.("lexicon-lab")) return;
    const puzzle = puzzleDef(active.level);
    window.LifeRPGTrainingFocus.update({ title: `Lexicon Lab · Crossword ${active.level}`, subtitle: active.completedAt ? "Puzzle complete ✓" : `${puzzle.title} · ${puzzle.theme}` });
  }

  function buildPuzzleCells(puzzle) {
    const cells = {};
    for (const word of puzzle.words) {
      const entry = ENTRY_BY_ID[word.id];
      const answer = Array.from(String(entry?.answer || "").toUpperCase());
      const dr = word.dir === "down" ? 1 : 0;
      const dc = word.dir === "across" ? 1 : 0;
      answer.forEach((char, index) => {
        const row = word.row + dr * index, col = word.col + dc * index, key = `${row},${col}`;
        cells[key] ||= { row, col, answer: char, wordIds: [], number: null };
        cells[key].wordIds.push(word.id);
        if (index === 0) cells[key].number = cells[key].number || word.number;
      });
    }
    return cells;
  }

  function moveAlongActiveWord(key, direction) {
    const active = current();
    const puzzle = active ? puzzleDef(active.level) : null;
    const placement = puzzle?.words.find(word => word.id === active.activeWordId);
    if (!placement) return;
    const cells = buildPuzzleCells(puzzle);
    const ordered = [];
    const entry = ENTRY_BY_ID[placement.id];
    const length = Array.from(entry.answer).length;
    for (let i=0;i<length;i+=1) ordered.push(`${placement.row + (placement.dir === "down" ? i : 0)},${placement.col + (placement.dir === "across" ? i : 0)}`);
    const idx = ordered.indexOf(key);
    const target = ordered[Math.max(0, Math.min(ordered.length-1, idx + direction))];
    if (target && cells[target]) window.setTimeout(() => els.board?.querySelector(`[data-lexicon-cell="${cssEscape(target)}"]`)?.focus(), 0);
  }

  function moveGrid(key, arrow) {
    const [r,c] = key.split(",").map(Number);
    const delta = { ArrowLeft:[0,-1], ArrowRight:[0,1], ArrowUp:[-1,0], ArrowDown:[1,0] }[arrow];
    const target = `${r+delta[0]},${c+delta[1]}`;
    els.board?.querySelector(`[data-lexicon-cell="${cssEscape(target)}"]`)?.focus();
  }

  function masteryStatus(record) {
    const recalls = Number(record?.successfulRecalls || 0);
    const encounters = Number(record?.encounters || 0);
    if (recalls >= 7) return "mastered";
    if (recalls >= 4) return "active";
    if (recalls >= 2) return "familiar";
    if (encounters >= 1) return "discovered";
    return "unseen";
  }

  function masteryCounts() {
    const counts = { discovered:0, familiar:0, active:0, mastered:0, unseen:0 };
    for (const entry of ENTRIES) {
      const status = state().words[entry.id]?.status || "unseen";
      counts[status] += 1;
    }
    return counts;
  }

  function statPills(c) {
    return `<span><b>${c.discovered + c.familiar + c.active + c.mastered}</b><small>discovered+</small></span><span><b>${c.familiar}</b><small>familiar</small></span><span><b>${c.active}</b><small>active</small></span><span><b>${c.mastered}</b><small>mastered</small></span>`;
  }

  function statusLabel(status) { return ({ unseen:"Unseen", discovered:"🌱 Discovered", familiar:"🌿 Familiar", active:"🌸 Active", mastered:"✦ Mastered" })[status] || status; }
  function collectionIcon(theme) { if (/Pädagogik/.test(theme)) return "🏫"; if (/Religion/.test(theme)) return "📖"; if (/Mathematik/.test(theme)) return "∑"; if (/Wissenschaft/.test(theme)) return "🔬"; if (/Argumentation/.test(theme)) return "🗣️"; if (/Präziser/.test(theme)) return "✍️"; return "🎓"; }
  function todayCompletionCount() { const key = localDateKey(new Date()); return (app.getState().rewardLedger?.events || []).filter(event => event?.source === "lexicon-lab-complete" && !event.duplicate && localDateKey(new Date(event.at || 0)) === key).length; }
  function localDateKey(date) { const d = date instanceof Date ? date : new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function rewardFromEvent(event) { return { eventId:event.id, xp:Number(event.xp||0), realmXP:Number(event.realmXP||0), statXP:Number(event.statXP||0), coins:Number(event.coins||0), storyEnergy:Number(event.storyEnergy||0) }; }
  function floor2(value) { return Math.floor((Number(value)||0)*100)/100; }
  function normalizeLetter(value) { return Array.from(String(value || "").trim().toUpperCase())[0] || ""; }
  function queueSave(source) { window.clearTimeout(saveTimer); saveTimer = window.setTimeout(() => app.saveState({ source }), 80); }
  function persist(source) { window.clearTimeout(saveTimer); app.saveState({ source }); render(); app.renderAll?.(); }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]); }
  function escapeAttr(value) { return escapeHtml(value); }
  function cssEscape(value) { return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/([,:])/g, "\\$1"); }

  window.LifeRPGLexiconLab = {
    version: VERSION,
    open: openDialog,
    startNext: () => startLevel(nextLevel() || TOTAL, { replay: !nextLevel() }),
    getProgress: () => ({ completed: completedSet().size, total: TOTAL, next: nextLevel() })
  };
})();
