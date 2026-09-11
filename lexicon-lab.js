(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const DATA = window.LIFE_RPG_LEXICON_LAB_DATA || {};
  const ENRICHMENT = window.LIFE_RPG_LEXICON_LAB_ENRICHMENT || {};
  const POOL_DATA = window.LIFE_RPG_LEXICON_POOL || {};
  const ENTRIES = Array.isArray(DATA.entries) ? DATA.entries : [];
  const POOL = Array.isArray(POOL_DATA.entries) ? POOL_DATA.entries : ENTRIES.map(entry => ({ id: entry.id, term: entry.term, definition: entry.clue, theme: entry.theme, starter: true }));
  const PUZZLES = Array.isArray(DATA.puzzles) ? DATA.puzzles : [];
  if (!app?.getState || !app?.awardActivity || !ENTRIES.length || !PUZZLES.length) return;

  const VERSION = "0.31.4am";
  const SCHEMA = 4;
  const TOTAL = PUZZLES.length;
  const REPEAT_SCALES = [1, .75, .5, .35];
  const TIERS = {
    1: { xp: 18, statXP: 12, coins: 10, story: .5 },
    2: { xp: 21, statXP: 14, coins: 12, story: .65 },
    3: { xp: 24, statXP: 16, coins: 15, story: .85 },
    4: { xp: 28, statXP: 19, coins: 18, story: 1.05 },
    5: { xp: 32, statXP: 22, coins: 21, story: 1.3 }
  };
  const ENTRY_BY_ID = Object.fromEntries(POOL.map(entry => [entry.id, {
    ...entry,
    clue: String(entry.definition || entry.clue || ""),
    answer: crosswordAnswer(entry.term)
  }]));
  for (const legacy of ENTRIES) {
    ENTRY_BY_ID[legacy.id] = {
      ...(ENTRY_BY_ID[legacy.id] || {}),
      ...legacy,
      clue: String(legacy.clue || ENTRY_BY_ID[legacy.id]?.clue || ""),
      answer: String(legacy.answer || crosswordAnswer(legacy.term || ENTRY_BY_ID[legacy.id]?.term || ""))
    };
  }
  const POOL_BY_ID = Object.fromEntries(POOL.map(entry => [entry.id, entry]));
  const STARTER_POOL = POOL.filter(entry => entry.starter).slice(0, Number(POOL_DATA.starterTarget || 100));
  const EXTENDED_POOL = POOL.filter(entry => !STARTER_POOL.some(starter => starter.id === entry.id));
  const CALIBRATION_CHUNK = 5;
  const DAILY_CROSSWORD_WORDS = 8;
  const DAILY_CROSSWORD_REWARD = { xp: 18, realmXP: 18, statXP: 12, coins: 10, story: .5 };
  const CROSSWORD_HISTORY_DAYS = 45;

  const els = {
    dialog: byId("lexiconLabDialog"), close: byId("lexiconLabClose"), daily: byId("lexiconLabDailyCard"),
    progress: byId("lexiconLabJourneyProgress"), levels: byId("lexiconLabLevelGrid"), stats: byId("lexiconLabStats"),
    collections: byId("lexiconLabCollections"), recent: byId("lexiconLabRecentWords"), status: byId("lexiconLabStatus"),
    play: byId("lexiconLabPlayPanel"), puzzleMeta: byId("lexiconLabPuzzleMeta"), board: byId("lexiconCrosswordBoard"),
    across: byId("lexiconAcrossClues"), down: byId("lexiconDownClues"), check: byId("lexiconCheckPuzzle"), clear: byId("lexiconClearPuzzle"),
    result: byId("lexiconLabResult"), hintPanel: byId("lexiconHintPanel"), growthStats: byId("lexiconLabGrowthStats"), trainingStats: byId("trainingGroundsLexiconStatus"),
    quickStatus: byId("lexiconLabQuickStatus"), dashboardDaily: byId("lexiconDashboardDailyWord"),
    calibration: byId("lexiconCalibrationPanel"), calibrationWords: byId("lexiconCalibrationWords"), calibrationStatus: byId("lexiconCalibrationStatus"),
    calibrationStarter: byId("lexiconCalibrationStarter"), calibrationExtended: byId("lexiconCalibrationExtended"), exportProfile: byId("lexiconExportProfile"),
    calibrationFocus: byId("lexiconCalibrationFocusPanel"), calibrationFocusWords: byId("lexiconCalibrationFocusWords"),
    calibrationFocusStatus: byId("lexiconCalibrationFocusStatus"), calibrationFocusActions: byId("lexiconCalibrationFocusActions")
  };

  let focusedCellKey = null;
  let saveTimer = null;
  let calibrationFocusMode = null;

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
      dailyCrosswords: {},
      practiceCounter: 0,
      calibration: { active: null, batchesCompleted: 0 },
      stats: { puzzlesSolved: 0, dailyCrosswordsSolved: 0, practiceCrosswordsSolved: 0, perfectWords: 0, checks: 0, contextTries: 0, contextCorrect: 0, calibrationBatches: 0 },
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
    s.dailyCrosswords = s.dailyCrosswords && typeof s.dailyCrosswords === "object" && !Array.isArray(s.dailyCrosswords) ? s.dailyCrosswords : {};
    s.practiceCounter = Math.max(0, Number(s.practiceCounter || 0));
    s.calibration = s.calibration && typeof s.calibration === "object" && !Array.isArray(s.calibration) ? s.calibration : defaults().calibration;
    s.calibration.active = normalizeCalibrationActive(s.calibration.active);
    s.calibration.batchesCompleted = Math.max(0, Number(s.calibration.batchesCompleted || 0));
    s.stats ||= defaults().stats;
    s.completed = Array.isArray(s.completed) ? s.completed.slice(-300) : [];
    const dailyKeys = Object.keys(s.dailyWords).sort();
    while (dailyKeys.length > 180) delete s.dailyWords[dailyKeys.shift()];
    const crosswordKeys = Object.keys(s.dailyCrosswords).sort();
    while (crosswordKeys.length > CROSSWORD_HISTORY_DAYS) delete s.dailyCrosswords[crosswordKeys.shift()];
    for (const [dateKey, record] of Object.entries(s.dailyCrosswords)) {
      if (!record || typeof record !== "object") { delete s.dailyCrosswords[dateKey]; continue; }
      const puzzle = normalizeDynamicPuzzle(record.puzzle);
      if (!puzzle) { delete s.dailyCrosswords[dateKey]; continue; }
      const progress = record.progress && typeof record.progress === "object" ? normalizeActive({ ...record.progress, puzzle, mode: "daily", dateKey }) : null;
      s.dailyCrosswords[dateKey] = {
        ...record,
        puzzle,
        progress: progress && !progress.completedAt ? progress : null,
        generatedAt: Math.max(0, Number(record.generatedAt || 0)),
        completedAt: record.completedAt ? Math.max(0, Number(record.completedAt)) : null,
        rewardEventId: record.rewardEventId || null
      };
    }
    s.journey.completedLevels = [...new Set((s.journey.completedLevels || []).map(Number).filter(level => level >= 1 && level <= TOTAL))].sort((a,b) => a-b);
    s.journey.active = normalizeActive(s.journey.active);
    ["puzzlesSolved", "dailyCrosswordsSolved", "practiceCrosswordsSolved", "perfectWords", "checks", "contextTries", "contextCorrect", "calibrationBatches"].forEach(key => s.stats[key] = Math.max(0, Number(s.stats[key] || 0)));
    for (const [id, record] of Object.entries(s.words)) s.words[id] = normalizeWordRecord(record);
    return s;
  }

  function normalizeWordRecord(record) {
    const out = record && typeof record === "object" ? { ...record } : {};
    out.encounters = Math.max(0, Number(out.encounters || 0));
    out.successfulRecalls = Math.max(0, Number(out.successfulRecalls || 0));
    out.misses = Math.max(0, Number(out.misses || 0));
    out.lastSeen = out.lastSeen || null;
    out.selfRating = ["known", "heard", "new"].includes(out.selfRating) ? out.selfRating : null;
    out.selfRatedAt = out.selfRatedAt || null;
    out.selfRatingSource = out.selfRatingSource || null;
    out.status = masteryStatus(out);
    return out;
  }


  function normalizeCalibrationActive(active) {
    if (!active || typeof active !== "object") return null;
    const mode = active.mode === "extended" ? "extended" : "starter";
    const sourcePool = mode === "starter" ? STARTER_POOL : EXTENDED_POOL;
    const allowed = new Set(sourcePool.map(entry => entry.id));
    const ids = [...new Set((active.ids || []).map(String).filter(id => allowed.has(id)))].slice(0, CALIBRATION_CHUNK);
    if (!ids.length) return null;
    return { mode, ids, batchKey: String(active.batchKey || ids.join("+")), startedAt: Number(active.startedAt || Date.now()) };
  }

  function poolRecord(entry) {
    const s = state();
    return s.words[entry.id] = normalizeWordRecord(s.words[entry.id]);
  }

  function ratingCounts(sourcePool = POOL) {
    const counts = { known: 0, heard: 0, new: 0, unrated: 0 };
    sourcePool.forEach(entry => {
      const rating = state().words[entry.id]?.selfRating;
      if (counts[rating] !== undefined) counts[rating] += 1;
      else counts.unrated += 1;
    });
    return counts;
  }

  function starterComplete() { return ratingCounts(STARTER_POOL).unrated === 0; }

  function chooseCalibrationChunk(mode = "starter", { enterFocus = true } = {}) {
    const s = state();
    const sourcePool = mode === "extended" ? EXTENDED_POOL : STARTER_POOL;
    const unrated = sourcePool.filter(entry => !s.words[entry.id]?.selfRating);
    if (!unrated.length) { s.calibration.active = null; persist("lexicon-calibration-finished"); return false; }
    const ids = unrated.slice(0, CALIBRATION_CHUNK).map(entry => entry.id);
    s.calibration.active = { mode, ids, batchKey: `${mode}:${ids.join("+")}`, startedAt: Date.now() };
    calibrationFocusMode = mode;
    persist("lexicon-calibration-start");
    if (enterFocus) enterCalibrationFocus();
    return true;
  }

  function enterCalibrationFocus() {
    const active = state().calibration.active;
    if (!active || !els.calibrationFocus || !window.LifeRPGTrainingFocus?.enter) return false;
    calibrationFocusMode = active.mode;
    if (els.dialog?.open) els.dialog.close();
    renderCalibrationFocus();
    const sourcePool = active.mode === "extended" ? EXTENDED_POOL : STARTER_POOL;
    const counts = ratingCounts(sourcePool);
    const label = active.mode === "starter" ? "Starter Calibration" : "Extended Calibration";
    return window.LifeRPGTrainingFocus.enter({
      id: "lexicon-calibration",
      node: els.calibrationFocus,
      title: `Lexicon Lab · ${label}`,
      subtitle: `Five words at a time · ${counts.unrated} still unrated`,
      tone: "light",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function syncCalibrationFocusHeader() {
    if (!window.LifeRPGTrainingFocus?.isActive?.("lexicon-calibration")) return;
    const active = state().calibration.active;
    const mode = active?.mode || calibrationFocusMode || "starter";
    const sourcePool = mode === "extended" ? EXTENDED_POOL : STARTER_POOL;
    const counts = ratingCounts(sourcePool);
    const label = mode === "starter" ? "Starter Calibration" : "Extended Calibration";
    window.LifeRPGTrainingFocus.update({
      title: `Lexicon Lab · ${label}`,
      subtitle: active ? `Five words at a time · ${counts.unrated} still unrated` : "Batch complete ✓"
    });
  }

  function rateCalibrationWord(id, rating) {
    if (!["known", "heard", "new"].includes(rating)) return;
    const s = state();
    const active = s.calibration.active;
    if (!active?.ids?.includes(id)) return;
    const entry = POOL_BY_ID[id];
    if (!entry) return;
    const rec = s.words[id] = normalizeWordRecord(s.words[id]);
    const firstRating = !rec.selfRating;
    rec.selfRating = rating;
    rec.selfRatedAt = new Date().toISOString();
    rec.selfRatingSource = active.mode === "starter" ? "starter-calibration" : "extended-calibration";
    if (firstRating) registerWordEncounter(s, entry, rec.selfRatingSource);
    const finished = active.ids.every(wordId => Boolean(s.words[wordId]?.selfRating));
    if (finished) {
      awardCalibrationBatch(active);
      s.calibration.active = null;
      s.calibration.batchesCompleted += 1;
      s.stats.calibrationBatches += 1;
    }
    persist(finished ? "lexicon-calibration-batch-complete" : "lexicon-calibration-rating");
  }

  function awardCalibrationBatch(active) {
    const sourceId = active.batchKey;
    const existing = (app.getState().rewardLedger?.events || []).some(event => event?.source === "lexicon-calibration" && event?.sourceId === sourceId);
    if (existing) return;
    app.awardActivity({
      source: "lexicon-calibration", sourceId,
      label: `Lexicon Calibration · ${active.mode === "starter" ? "Starter" : "Extended"} 5-word batch`,
      realm: "Knowledge", capability: "knowledge", xp: 5, realmXP: 5, statXP: 4, coins: 4, storyEnergyBase: 0.15,
      progressionRelevant: true,
      metadata: { lexiconLab: true, mode: "calibration", pool: active.mode, wordIds: [...active.ids], chunkSize: active.ids.length }
    });
  }

  function setSelfRating(entry, rating, source) {
    if (!entry || !["known", "heard", "new"].includes(rating)) return;
    const s = state();
    const rec = s.words[entry.id] = normalizeWordRecord(s.words[entry.id]);
    const first = !rec.selfRating;
    rec.selfRating = rating;
    rec.selfRatedAt = new Date().toISOString();
    rec.selfRatingSource = source;
    if (first) registerWordEncounter(s, entry, source);
  }

  function exportProfile() {
    const starter = ratingCounts(STARTER_POOL), extended = ratingCounts(EXTENDED_POOL);
    const payload = {
      type: "life-rpg-lexicon-profile", version: VERSION, exportedAt: new Date().toISOString(),
      poolVersion: String(POOL_DATA.version || VERSION), totalPoolWords: POOL.length, starterTarget: STARTER_POOL.length,
      counts: { starter, extended, total: ratingCounts(POOL) },
      words: POOL.map(entry => {
        const rec = state().words[entry.id] || {};
        return { id: entry.id, term: entry.term, theme: entry.theme, pool: STARTER_POOL.some(item => item.id === entry.id) ? "starter" : "extended",
          selfRating: rec.selfRating || null, selfRatedAt: rec.selfRatedAt || null, encounters: Number(rec.encounters || 0),
          successfulRecalls: Number(rec.successfulRecalls || 0), misses: Number(rec.misses || 0), masteryStatus: rec.status || "unseen", lastSeen: rec.lastSeen || null };
      })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `life-rpg-lexicon-profile-${localDateKey(new Date())}.json`; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    app.showToast?.("⌗ Lexicon profile exported · backup ready");
  }

  function normalizeActive(active) {
    if (!active || typeof active !== "object") return null;
    const dynamic = normalizeDynamicPuzzle(active.puzzle);
    const puzzle = dynamic || puzzleDef(active.level);
    if (!puzzle) return null;
    const cells = buildPuzzleCells(puzzle);
    const values = {};
    for (const key of Object.keys(cells)) {
      const raw = active.values?.[key];
      values[key] = raw ? normalizeLetter(raw) : "";
    }
    return {
      ...active,
      id: String(active.id || dynamic?.id || `lexicon-crossword-l${puzzle.level || 1}`),
      mode: dynamic ? (active.mode === "practice" ? "practice" : "daily") : (active.mode || "legacy"),
      dateKey: dynamic ? String(active.dateKey || puzzle.dateKey || "") : null,
      puzzle: dynamic || undefined,
      level: dynamic ? null : puzzle.level,
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

  function activePuzzle(active = current()) {
    if (!active) return null;
    return normalizeDynamicPuzzle(active.puzzle) || puzzleDef(active.level);
  }

  function crosswordAnswer(value) {
    return Array.from(String(value || "").trim().toUpperCase())
      .filter(char => /[A-ZÄÖÜẞ]/u.test(char))
      .join("")
      .replace(/ẞ/g, "SS");
  }

  function normalizeDynamicPuzzle(puzzle) {
    if (!puzzle || typeof puzzle !== "object" || !Array.isArray(puzzle.words)) return null;
    const words = puzzle.words.map(word => {
      const id = String(word?.id || "");
      const entry = ENTRY_BY_ID[id];
      if (!entry?.answer || !["across", "down"].includes(word?.dir)) return null;
      const row = Number(word.row), col = Number(word.col), number = Number(word.number);
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0) return null;
      return { id, dir: word.dir, row, col, number: Number.isFinite(number) && number > 0 ? number : 1 };
    }).filter(Boolean);
    if (words.length < 3) return null;

    let maxRow = 0, maxCol = 0;
    for (const word of words) {
      const length = Array.from(ENTRY_BY_ID[word.id].answer).length;
      maxRow = Math.max(maxRow, word.row + (word.dir === "down" ? length - 1 : 0));
      maxCol = Math.max(maxCol, word.col + (word.dir === "across" ? length - 1 : 0));
    }

    return {
      ...puzzle,
      id: String(puzzle.id || "adaptive-crossword"),
      title: String(puzzle.title || "Adaptive Crossword"),
      theme: String(puzzle.theme || "Academic German"),
      dateKey: puzzle.dateKey ? String(puzzle.dateKey) : null,
      width: Math.max(1, Number(puzzle.width || maxCol + 1)),
      height: Math.max(1, Number(puzzle.height || maxRow + 1)),
      words,
      profileMix: puzzle.profileMix && typeof puzzle.profileMix === "object" ? { ...puzzle.profileMix } : {}
    };
  }

  function seededRandom(seedText) {
    let seed = stableHash(seedText) || 1;
    return () => {
      seed += 0x6D2B79F5;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function weightedPickFrom(entries, rng, weightFn) {
    if (!entries.length) return null;
    const weights = entries.map(entry => Math.max(.001, Number(weightFn(entry) || 0)));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let target = rng() * total;
    for (let index = 0; index < entries.length; index += 1) {
      target -= weights[index];
      if (target <= 0) return entries[index];
    }
    return entries.at(-1) || null;
  }

  function daysSince(value) {
    const time = new Date(value || 0).getTime();
    if (!Number.isFinite(time) || time <= 0) return 999;
    return Math.max(0, (Date.now() - time) / 86400000);
  }

  function crosswordWeight(entry) {
    const rec = state().words[entry.id] || {};
    const base = ({ new: 7.2, heard: 5.1, known: 2.4 })[rec.selfRating] || 0;
    if (!base) return 0;
    const misses = Math.max(0, Number(rec.misses || 0));
    const recalls = Math.max(0, Number(rec.successfulRecalls || 0));
    const masteryScale = ({ unseen: 1, discovered: 1, familiar: .82, active: .58, mastered: .30 })[rec.status || masteryStatus(rec)] || 1;
    const missBoost = 1 + Math.min(1.6, misses * .22);
    const recallScale = 1 / (1 + recalls * .10);
    const recentScale = daysSince(rec.lastSeen) < 1 ? .78 : daysSince(rec.lastSeen) < 3 ? .9 : 1;
    return base * masteryScale * missBoost * recallScale * recentScale;
  }

  function crosswordEligibleEntries() {
    return POOL.filter(entry => {
      const rec = state().words[entry.id];
      const answer = ENTRY_BY_ID[entry.id]?.answer || "";
      return Boolean(rec?.selfRating && entryDefinition(entry) && answer.length >= 4 && answer.length <= 21);
    });
  }

  function takeWeighted(bucket, count, rng, picked) {
    const available = bucket.filter(entry => !picked.has(entry.id));
    const out = [];
    while (out.length < count && available.length) {
      const choice = weightedPickFrom(available, rng, crosswordWeight);
      if (!choice) break;
      out.push(choice);
      picked.add(choice.id);
      available.splice(available.findIndex(item => item.id === choice.id), 1);
    }
    return out;
  }

  function adaptiveCandidateOrder(seedText) {
    const rng = seededRandom(seedText);
    const eligible = crosswordEligibleEntries();
    const picked = new Set();
    const core = [];

    const buckets = {
      new: eligible.filter(entry => state().words[entry.id]?.selfRating === "new"),
      heard: eligible.filter(entry => state().words[entry.id]?.selfRating === "heard"),
      known: eligible.filter(entry => state().words[entry.id]?.selfRating === "known")
    };

    // Approximate target mix: challenge-heavy, but with familiar anchors.
    core.push(...takeWeighted(buckets.new, 4, rng, picked));
    core.push(...takeWeighted(buckets.heard, 3, rng, picked));
    core.push(...takeWeighted(buckets.known, 1, rng, picked));

    const rest = eligible.filter(entry => !picked.has(entry.id));
    const filler = [];
    while (filler.length < 28 && rest.length) {
      const choice = weightedPickFrom(rest, rng, crosswordWeight);
      if (!choice) break;
      filler.push(choice);
      rest.splice(rest.findIndex(item => item.id === choice.id), 1);
    }

    return [...core, ...filler];
  }

  function shuffled(items, rng) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function gridKey(row, col) { return `${row},${col}`; }

  function layoutBounds(placements) {
    if (!placements.length) return { minRow: 0, minCol: 0, maxRow: 0, maxCol: 0, width: 1, height: 1, area: 1 };
    let minRow = Infinity, minCol = Infinity, maxRow = -Infinity, maxCol = -Infinity;
    for (const placement of placements) {
      const length = Array.from(ENTRY_BY_ID[placement.id]?.answer || "").length;
      const endRow = placement.row + (placement.dir === "down" ? length - 1 : 0);
      const endCol = placement.col + (placement.dir === "across" ? length - 1 : 0);
      minRow = Math.min(minRow, placement.row, endRow);
      minCol = Math.min(minCol, placement.col, endCol);
      maxRow = Math.max(maxRow, placement.row, endRow);
      maxCol = Math.max(maxCol, placement.col, endCol);
    }
    return { minRow, minCol, maxRow, maxCol, width: maxCol - minCol + 1, height: maxRow - minRow + 1, area: (maxCol - minCol + 1) * (maxRow - minRow + 1) };
  }

  function placeWord(grid, placements, entry, dir, row, col) {
    const answer = Array.from(ENTRY_BY_ID[entry.id]?.answer || "");
    const dr = dir === "down" ? 1 : 0, dc = dir === "across" ? 1 : 0;
    for (let i = 0; i < answer.length; i += 1) {
      const key = gridKey(row + dr * i, col + dc * i);
      const current = grid.get(key) || { char: answer[i], dirs: new Set() };
      current.char = answer[i];
      current.dirs.add(dir);
      grid.set(key, current);
    }
    placements.push({ id: entry.id, dir, row, col, number: 0 });
  }

  function candidatePlacementValid(grid, entry, dir, row, col) {
    const answer = Array.from(ENTRY_BY_ID[entry.id]?.answer || "");
    const dr = dir === "down" ? 1 : 0, dc = dir === "across" ? 1 : 0;
    const before = grid.get(gridKey(row - dr, col - dc));
    const after = grid.get(gridKey(row + dr * answer.length, col + dc * answer.length));
    if (before || after) return null;

    let intersections = 0;
    for (let i = 0; i < answer.length; i += 1) {
      const r = row + dr * i, c = col + dc * i;
      const current = grid.get(gridKey(r, c));
      if (current) {
        if (current.char !== answer[i] || current.dirs.has(dir)) return null;
        intersections += 1;
      } else {
        const neighbors = dir === "across"
          ? [grid.get(gridKey(r - 1, c)), grid.get(gridKey(r + 1, c))]
          : [grid.get(gridKey(r, c - 1)), grid.get(gridKey(r, c + 1))];
        if (neighbors.some(Boolean)) return null;
      }
    }
    return intersections > 0 ? intersections : null;
  }

  function bestPlacementFor(grid, placements, entry, rng) {
    const answer = Array.from(ENTRY_BY_ID[entry.id]?.answer || "");
    const options = [];
    for (let i = 0; i < answer.length; i += 1) {
      for (const [key, cell] of grid.entries()) {
        if (cell.char !== answer[i] || cell.dirs.size >= 2) continue;
        const [r, c] = key.split(",").map(Number);
        const dirs = ["across", "down"].filter(dir => !cell.dirs.has(dir));
        for (const dir of dirs) {
          const dr = dir === "down" ? 1 : 0, dc = dir === "across" ? 1 : 0;
          const row = r - dr * i, col = c - dc * i;
          const intersections = candidatePlacementValid(grid, entry, dir, row, col);
          if (!intersections) continue;
          const test = [...placements, { id: entry.id, dir, row, col, number: 0 }];
          const bounds = layoutBounds(test);
          const balancePenalty = Math.abs(bounds.width - bounds.height) * .35;
          const score = intersections * 120 - bounds.area * .045 - balancePenalty + rng();
          options.push({ dir, row, col, intersections, score });
        }
      }
    }
    return options.sort((a, b) => b.score - a.score)[0] || null;
  }

  function normalizeLayout(placements) {
    const bounds = layoutBounds(placements);
    const shifted = placements.map(item => ({ ...item, row: item.row - bounds.minRow, col: item.col - bounds.minCol }));
    const starts = [...new Set(shifted.map(item => gridKey(item.row, item.col)))]
      .map(key => key.split(",").map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const numbers = new Map(starts.map(([r, c], index) => [gridKey(r, c), index + 1]));
    return {
      placements: shifted.map(item => ({ ...item, number: numbers.get(gridKey(item.row, item.col)) || 1 })),
      width: bounds.width,
      height: bounds.height
    };
  }

  function layoutCandidateSet(entries, seedText, targetCount = DAILY_CROSSWORD_WORDS) {
    let best = null;

    for (let attempt = 0; attempt < 44; attempt += 1) {
      const rng = seededRandom(`${seedText}:layout:${attempt}`);
      const core = entries.slice(0, Math.min(8, entries.length));
      const rest = entries.slice(core.length);
      const order = [
        ...shuffled(core, rng),
        ...shuffled(rest, rng)
      ];

      const grid = new Map();
      const placements = [];
      const firstPool = order.slice(0, Math.min(8, order.length)).sort((a, b) => {
        const ratingA = state().words[a.id]?.selfRating === "known" ? 1 : 0;
        const ratingB = state().words[b.id]?.selfRating === "known" ? 1 : 0;
        return ratingB - ratingA || ENTRY_BY_ID[b.id].answer.length - ENTRY_BY_ID[a.id].answer.length;
      });
      const first = firstPool[Math.floor(rng() * Math.max(1, Math.min(3, firstPool.length)))] || order[0];
      if (!first) continue;

      placeWord(grid, placements, first, "across", 0, 0);

      let pending = order.filter(entry => entry.id !== first.id);
      let progress = true;
      while (progress && placements.length < targetCount && pending.length) {
        progress = false;
        for (let index = 0; index < pending.length && placements.length < targetCount; index += 1) {
          const entry = pending[index];
          const option = bestPlacementFor(grid, placements, entry, rng);
          if (!option) continue;
          placeWord(grid, placements, entry, option.dir, option.row, option.col);
          pending.splice(index, 1);
          index -= 1;
          progress = true;
        }
      }

      const normalized = normalizeLayout(placements);
      const crossings = countCrossings(normalized.placements);
      const ratings = normalized.placements.map(item => state().words[item.id]?.selfRating);
      const diversity = new Set(ratings).size;
      const score = normalized.placements.length * 10000 + crossings * 100 + diversity * 40 - normalized.width * normalized.height;

      if (!best || score > best.score) best = { ...normalized, score, crossings };
      if (normalized.placements.length >= targetCount && crossings >= Math.max(3, targetCount - 3)) break;
    }

    return best;
  }

  function countCrossings(placements) {
    const cells = new Map();
    let crossings = 0;
    for (const placement of placements) {
      const answer = Array.from(ENTRY_BY_ID[placement.id]?.answer || "");
      const dr = placement.dir === "down" ? 1 : 0, dc = placement.dir === "across" ? 1 : 0;
      for (let i = 0; i < answer.length; i += 1) {
        const key = gridKey(placement.row + dr * i, placement.col + dc * i);
        const count = (cells.get(key) || 0) + 1;
        cells.set(key, count);
        if (count === 2) crossings += 1;
      }
    }
    return crossings;
  }

  function profileMixForWords(words) {
    const mix = { new: 0, heard: 0, known: 0 };
    words.forEach(word => {
      const rating = state().words[word.id]?.selfRating;
      if (mix[rating] !== undefined) mix[rating] += 1;
    });
    return mix;
  }

  function dominantTheme(words) {
    const counts = {};
    words.forEach(word => {
      const theme = POOL_BY_ID[word.id]?.theme || "Academic German";
      counts[theme] = (counts[theme] || 0) + 1;
    });
    const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return ordered[0]?.[1] >= 3 ? ordered[0][0] : "Adaptive academic German";
  }

  function generateAdaptiveCrossword(seedText, { mode = "daily", dateKey = null } = {}) {
    const candidates = adaptiveCandidateOrder(seedText);
    if (candidates.length < 4) return null;
    const layout = layoutCandidateSet(candidates, seedText, DAILY_CROSSWORD_WORDS);
    if (!layout || layout.placements.length < 4) return null;

    const words = layout.placements.slice(0, DAILY_CROSSWORD_WORDS);
    const normalized = normalizeLayout(words);
    const mix = profileMixForWords(normalized.placements);

    return normalizeDynamicPuzzle({
      id: `${mode}-crossword-${dateKey || stableHash(seedText).toString(16)}`,
      mode,
      dateKey,
      title: mode === "daily" ? "Daily Crossword" : "Practice Crossword",
      theme: dominantTheme(normalized.placements),
      width: normalized.width,
      height: normalized.height,
      words: normalized.placements,
      profileMix: mix,
      generatedAt: Date.now()
    });
  }

  function dailyCrosswordRecord(dateKey = localDateKey(new Date())) {
    return state().dailyCrosswords?.[dateKey] || null;
  }

  function dailyCrosswordComplete(dateKey = localDateKey(new Date())) {
    return Boolean(dailyCrosswordRecord(dateKey)?.completedAt);
  }

  function ensureDailyCrossword(dateKey = localDateKey(new Date())) {
    const s = state();
    const existing = dailyCrosswordRecord(dateKey);
    if (existing?.puzzle) return existing;
    const puzzle = generateAdaptiveCrossword(`lexicon-daily-crossword:${dateKey}`, { mode: "daily", dateKey });
    if (!puzzle) return null;
    s.dailyCrosswords[dateKey] = { puzzle, generatedAt: Date.now(), completedAt: null, rewardEventId: null };
    app.saveState({ source: "lexicon-daily-crossword-generated" });
    return s.dailyCrosswords[dateKey];
  }

  function createActiveFromPuzzle(puzzle, { mode = "daily", dateKey = null } = {}) {
    const cells = buildPuzzleCells(puzzle);
    return {
      id: puzzle.id,
      mode,
      dateKey,
      puzzle,
      values: Object.fromEntries(Object.keys(cells).map(key => [key, ""])),
      activeWordId: puzzle.words[0]?.id || null,
      missedWordIds: [],
      hintLevels: {},
      encountersRegistered: false,
      replay: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      rewardEventId: null
    };
  }


  function enrichedPool() {
    return POOL.filter(entry => entry.dailyEligible !== false && (entry.example || ENRICHMENT[entry.id]?.example));
  }

  function stableHash(text) {
    let hash = 2166136261 >>> 0;
    for (const char of String(text || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }

  function dailyWordEntry(dateKey = localDateKey(new Date())) {
    const s = state();
    const existing = s.dailyWords?.[dateKey] && typeof s.dailyWords[dateKey] === "object" ? s.dailyWords[dateKey] : {};
    const saved = existing.entryId;
    if (saved && POOL_BY_ID[saved]) return POOL_BY_ID[saved];
    const rich = enrichedPool();
    if (!rich.length) return POOL[0] || null;
    // Discovery-first: while unrated words remain, the Daily Word expands the personal pool
    // instead of repeatedly drawing from words the user already calibrated.
    const unrated = rich.filter(entry => !s.words[entry.id]?.selfRating);
    const candidates = unrated.length ? unrated : rich;
    const selected = candidates[stableHash(`lexicon-daily:${dateKey}`) % candidates.length] || candidates[0] || null;
    if (selected) s.dailyWords[dateKey] = { ...existing, entryId: selected.id, selectedAt: existing.selectedAt || Date.now() };
    return selected;
  }

  function dailyContextEntry(dateKey = localDateKey(new Date())) {
    const pool = enrichedPool();
    if (!pool.length) return POOL[0] || null;
    const daily = dailyWordEntry(dateKey);
    let index = stableHash(`lexicon-context:${dateKey}`) % pool.length;
    if (pool[index]?.id === daily?.id) index = (index + 7) % pool.length;
    return pool[index];
  }

  function entryDefinition(entry) { return String(entry?.definition || ENTRY_BY_ID[entry?.id]?.clue || ""); }
  function entryExample(entry) { return String(entry?.example || ENRICHMENT[entry?.id]?.example || ""); }
  function entryNuance(entry) { return String(entry?.nuance || ENRICHMENT[entry?.id]?.nuance || ""); }

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
    if (existing.response) return;
    setSelfRating(entry, response, "daily-word");
    const streakExtraDates = Object.entries(s.dailyWords).filter(([, value]) => value?.response).map(([date]) => date);
    const dailyReward = window.LifeRPGDailyStreaks?.awardStandalone?.("lexiconDailyWord", {
      source: "lexicon-daily-word", label: `Daily Word · ${entry.term}`, realm: "Knowledge", capability: "knowledge",
      xp: 5, realmXP: 5, statXP: 4, coins: 5, storyEnergyBase: 0.2,
      extraDates: streakExtraDates,
      metadata: { lexiconLab: true, mode: "daily-word", wordId: entry.id, selfRating: response }
    });
    s.dailyWords[key] = { ...existing, entryId: entry.id, response, encounterRegistered: true, seenAt: existing.seenAt || Date.now(), updatedAt: Date.now(), rewardEventId: dailyReward?.reward?.eventId || null };
    persist("lexicon-daily-word");
    if (dailyReward?.reward) app.showToast?.(`⌗ Daily Word saved · ${dailyReward.info?.streak || 1}-day streak · +${dailyReward.reward.xp} XP · +${app.formatEnergy?.(dailyReward.reward.storyEnergy) ?? dailyReward.reward.storyEnergy} 🔥 · +${dailyReward.reward.coins} 🪙`);
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
    const entry = POOL_BY_ID[record.contextWordId] || dailyContextEntry(key);
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
    return ({ known: "Kenne ich", heard: "Schon mal gehört", new: "Kenne ich nicht" })[value] || "Gespeichert";
  }

  function contextSentenceMarkup(entry) {
    const example = entryExample(entry);
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
    const entry = POOL_BY_ID[record.contextWordId] || dailyContextEntry(dateKey);
    if (!entry) return "";
    const options = contextOptions(entry, dateKey);
    const result = record.contextAnswered
      ? `<div class="lexicon-context-result-v314y ${record.contextCorrect ? "is-correct" : "is-learning"}"><strong>${record.contextCorrect ? "✓ Nice inference." : "Not quite — this one was about context, not memorizing."}</strong><p><b>${escapeHtml(entry.term)}</b>: ${escapeHtml(entryDefinition(entry))}</p></div>`
      : `<div class="lexicon-context-options-v314y">${options.map(option => `<button type="button" data-lexicon-context-choice="${escapeAttr(option.id)}"><span>${escapeHtml(entryDefinition(option))}</span></button>`).join("")}</div>`;
    return `<section class="lexicon-context-card-v314y"><div><small>CONTEXT CLUE · DIFFERENT WORD</small><strong>What does <em>${escapeHtml(entry.term)}</em> probably mean here?</strong></div><p class="lexicon-context-sentence-v314y">${contextSentenceMarkup(entry)}</p>${result}</section>`;
  }

  function renderHintPanel() {
    if (!els.hintPanel) return;
    const active = current();
    const puzzle = active ? activePuzzle(active) : null;
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
    const details = { example: entryExample(entry), nuance: entryNuance(entry) };
    const source = String(details.nuance || `This word belongs to ${entry.theme}.`);
    const escapedTerm = String(entry.term || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!escapedTerm) return escapeHtml(source);
    return escapeHtml(source.replace(new RegExp(escapedTerm, "giu"), "Dieses Wort"));
  }

  function blankedExampleMarkup(entry) {
    const example = String(entryExample(entry) || "");
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
    const puzzle = active ? activePuzzle(active) : null;
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
      if (daily) { event.preventDefault(); startDailyCrossword(); return; }
      const practice = event.target.closest?.("[data-lexicon-practice-start]");
      if (practice) { event.preventDefault(); startPracticeCrossword(); return; }
      const dailyResponse = event.target.closest?.("[data-lexicon-daily-response]");
      if (dailyResponse) { event.preventDefault(); recordDailyWord(dailyResponse.dataset.lexiconDailyResponse); return; }
      const calibrationStart = event.target.closest?.("[data-lexicon-calibration-start]");
      if (calibrationStart) { event.preventDefault(); chooseCalibrationChunk(calibrationStart.dataset.lexiconCalibrationStart, { enterFocus: true }); return; }
      const calibrationContinue = event.target.closest?.("[data-lexicon-calibration-continue]");
      if (calibrationContinue) { event.preventDefault(); enterCalibrationFocus(); return; }
      const calibrationNext = event.target.closest?.("[data-lexicon-calibration-next]");
      if (calibrationNext) { event.preventDefault(); chooseCalibrationChunk(calibrationNext.dataset.lexiconCalibrationNext || calibrationFocusMode || "starter", { enterFocus: true }); return; }
      const calibrationDone = event.target.closest?.("[data-lexicon-calibration-done]");
      if (calibrationDone) { event.preventDefault(); window.LifeRPGTrainingFocus?.exit?.({ reopen: true }); return; }
      const calibrationRating = event.target.closest?.("[data-lexicon-calibration-rating]");
      if (calibrationRating) { event.preventDefault(); rateCalibrationWord(calibrationRating.dataset.lexiconWordId, calibrationRating.dataset.lexiconCalibrationRating); return; }
      const exportButton = event.target.closest?.("[data-lexicon-export-profile]");
      if (exportButton) { event.preventDefault(); exportProfile(); return; }
      const contextStart = event.target.closest?.("[data-lexicon-context-start]");
      if (contextStart) { event.preventDefault(); openDailyContext(); return; }
      const contextChoice = event.target.closest?.("[data-lexicon-context-choice]");
      if (contextChoice) { event.preventDefault(); answerDailyContext(contextChoice.dataset.lexiconContextChoice); return; }
      const hintNext = event.target.closest?.("[data-lexicon-hint-next]");
      if (hintNext) { event.preventDefault(); advanceHint(); return; }
      const levelButton = event.target.closest?.("[data-lexicon-level]");
      if (levelButton) {
        event.preventDefault();
        startPracticeCrossword();
        return;
      }
      const clue = event.target.closest?.("[data-lexicon-word]");
      if (clue) { event.preventDefault(); focusWord(clue.dataset.lexiconWord); return; }
      const nextButton = event.target.closest?.("[data-lexicon-next-level]");
      if (nextButton) { event.preventDefault(); startPracticeCrossword(); return; }
      const back = event.target.closest?.("[data-lexicon-return]");
      if (back) { event.preventDefault(); window.LifeRPGTrainingFocus?.exit?.({ reopen: false }); openDialog(); }
    });

    els.board?.addEventListener("focusin", event => {
      const input = event.target.closest?.("[data-lexicon-cell]");
      if (!input) return;
      const key = input.dataset.lexiconCell;
      const active = current();
      if (!active) return;
      const puzzle = activePuzzle(active);
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

  function startDailyCrossword() {
    if (!starterComplete()) {
      app.showToast?.(`⌗ Finish the ${STARTER_POOL.length}-word Starter Calibration first. Your Daily Crossword will then build itself from your own profile.`);
      return false;
    }

    const dateKey = localDateKey(new Date());
    if (dailyCrosswordComplete(dateKey)) {
      app.showToast?.("⌗ Today's Daily Crossword is already complete. Practice mode is available if you want another one.");
      return false;
    }

    const record = ensureDailyCrossword(dateKey);
    if (!record?.puzzle) {
      app.showToast?.("⌗ I couldn't build a connected crossword from the rated pool yet. Rate a few more words and try again.");
      return false;
    }

    const existing = current();
    if (existing && !existing.completedAt && existing.mode === "daily" && existing.dateKey === dateKey && existing.puzzle?.id === record.puzzle.id) {
      enterFocus(existing);
      render();
      return true;
    }

    state().journey.active = record.progress
      ? normalizeActive({ ...record.progress, puzzle: record.puzzle, mode: "daily", dateKey })
      : createActiveFromPuzzle(record.puzzle, { mode: "daily", dateKey });
    registerEncounters(state().journey.active, record.puzzle);
    persist("lexicon-daily-crossword-start");
    enterFocus(current());
    return true;
  }

  function startPracticeCrossword() {
    if (!starterComplete()) {
      app.showToast?.(`⌗ Finish the ${STARTER_POOL.length}-word Starter Calibration first so Practice puzzles can adapt to your vocabulary.`);
      return false;
    }

    const s = state();
    const existing = current();
    if (existing && !existing.completedAt && existing.mode === "daily" && existing.dateKey) {
      const record = s.dailyCrosswords[existing.dateKey];
      if (record?.puzzle?.id === existing.puzzle?.id) record.progress = { ...existing };
    }
    s.practiceCounter = Math.max(0, Number(s.practiceCounter || 0)) + 1;
    const seed = `lexicon-practice:${localDateKey(new Date())}:${s.practiceCounter}:${Date.now()}`;
    const puzzle = generateAdaptiveCrossword(seed, { mode: "practice" });

    if (!puzzle) {
      app.showToast?.("⌗ I couldn't build a connected Practice crossword from the current rated pool.");
      return false;
    }

    s.journey.active = createActiveFromPuzzle(puzzle, { mode: "practice" });
    registerEncounters(s.journey.active, puzzle);
    persist("lexicon-practice-crossword-start");
    enterFocus(current());
    return true;
  }

  function startLevel() {
    return startPracticeCrossword();
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
    renderCalibrationFocus();
    renderBoard();
    renderResult();
    syncFocusHeader();
    syncCalibrationFocusHeader();
  }

  function renderOverview() {
    const s = state();
    const counts = masteryCounts();
    const starter = ratingCounts(STARTER_POOL), extended = ratingCounts(EXTENDED_POOL), all = ratingCounts(POOL);
    if (els.stats) els.stats.innerHTML = `<span><b>${all.known}</b><small>kenne ich</small></span><span><b>${all.heard}</b><small>schon gehört</small></span><span><b>${all.new}</b><small>neu</small></span><span><b>${all.unrated}</b><small>noch offen</small></span>`;
    if (els.growthStats) els.growthStats.innerHTML = `<span><b>${STARTER_POOL.length - starter.unrated}/${STARTER_POOL.length}</b> Starter calibrated</span><span><b>${POOL.length - all.unrated}/${POOL.length}</b> pool rated</span><span><b>${counts.active + counts.mastered}</b> active/mastered</span>`;
    const todayDone = dailyCrosswordComplete();
    if (els.trainingStats) els.trainingStats.textContent = starter.unrated
      ? `Calibration ${STARTER_POOL.length - starter.unrated}/${STARTER_POOL.length} · ${POOL.length} word pool`
      : `Daily Crossword ${todayDone ? "complete ✓" : "ready"} · ${POOL.length - all.unrated}/${POOL.length} rated`;
    if (els.quickStatus) els.quickStatus.textContent = starter.unrated
      ? `Lexicon pool ${POOL.length - all.unrated}/${POOL.length} rated · Daily Word available`
      : `Daily Word + Daily Crossword ${todayDone ? "✓" : "ready"}`;
    renderDaily(); renderCalibration(); renderProgress(); renderLevels(); renderCollections(); renderRecent(); renderDashboardDaily();
  }

  function dailyWordMarkup({ compact = false } = {}) {
    const s = state(), dateKey = localDateKey(new Date()), entry = dailyWordEntry(dateKey);
    if (!entry) return "";
    const record = s.dailyWords[dateKey] && typeof s.dailyWords[dateKey] === "object" ? s.dailyWords[dateKey] : {};
    const streakDates = Object.entries(s.dailyWords).filter(([, value]) => value?.response).map(([date]) => date);
    const streak = window.LifeRPGDailyStreaks?.summary?.("lexiconDailyWord", { extraDates: streakDates });
    const detail = entryExample(entry);
    const nuance = entryNuance(entry);
    return `<article class="lexicon-daily-word-v314y ${compact ? "is-dashboard-v314z" : ""}">
      <div class="lexicon-daily-word-heading-v314y"><div><small>WORTFUND DES TAGES · ${escapeHtml(entry.theme)}</small><strong>${escapeHtml(entry.term)}</strong></div><span>✦</span></div>
      <p class="lexicon-daily-definition-v314y">${escapeHtml(entryDefinition(entry))}</p>
      ${detail && !compact ? `<div class="lexicon-daily-detail-v314y"><small>IM SATZ</small><span>${escapeHtml(detail)}</span></div>` : ""}
      ${nuance && !compact ? `<div class="lexicon-daily-detail-v314y"><small>NUANCE</small><span>${escapeHtml(nuance)}</span></div>` : ""}
      <div class="lexicon-daily-streak-v314z">${escapeHtml(window.LifeRPGDailyStreaks?.shortLabel?.("lexiconDailyWord", { extraDates: streakDates }) || "Daily consistency bonus ready")}</div>
      ${record.response ? `<div class="lexicon-daily-response-status-v314y"><span>✓ ${escapeHtml(responseLabel(record.response))}</span><small>${streak?.currentStreak ? `${streak.currentStreak}-day Daily Word streak. ` : ""}Your self-rating is saved in the personal pool.</small></div>${compact ? "" : renderDailyContextMarkup(record, dateKey)}` : `<div class="lexicon-daily-response-v314y" role="group" aria-label="How familiar is today's word?"><button type="button" data-lexicon-daily-response="known">Kenne ich</button><button type="button" data-lexicon-daily-response="heard">Schon mal gehört</button><button type="button" data-lexicon-daily-response="new">Kenne ich nicht</button></div><small class="lexicon-daily-noquiz-v314y">Kein Quiz. Deine ehrliche Einschätzung erweitert den Pool und der tägliche Abschluss baut nur einen positiven Reward-Streak auf.</small>`}
    </article>`;
  }

  function renderDaily() {
    if (!els.daily) return;
    const dateKey = localDateKey(new Date());
    const record = dailyCrosswordRecord(dateKey);
    const active = current();
    const isResume = Boolean((active && !active.completedAt && active.mode === "daily" && active.dateKey === dateKey) || record?.progress);
    const complete = Boolean(record?.completedAt);

    let crossword;
    if (!starterComplete()) {
      const remaining = ratingCounts(STARTER_POOL).unrated;
      crossword = `<aside class="lexicon-crossword-next-v314y"><small>DAILY CROSSWORD · CALIBRATION FIRST</small><strong>${remaining} Starter word${remaining === 1 ? "" : "s"} left</strong><p>Finish the Starter Calibration once. After that, crosswords build themselves directly from your live Lexicon profile — no export needed.</p><button class="secondary-button" type="button" data-lexicon-calibration-start="starter">Continue Starter Calibration</button></aside>`;
    } else if (complete) {
      crossword = `<aside class="lexicon-crossword-next-v314y is-complete-v314am"><small>DAILY CROSSWORD</small><strong>Today's puzzle complete ✓</strong><p>Tomorrow's puzzle will automatically use your latest ratings, misses and recall history. Want another one purely for practice?</p><button class="secondary-button" type="button" data-lexicon-practice-start>Generate Practice Crossword</button></aside>`;
    } else {
      crossword = `<aside class="lexicon-crossword-next-v314y"><small>DAILY CROSSWORD · ADAPTIVE</small><strong>${isResume ? "Your puzzle is waiting" : "A fresh calibrated puzzle is ready"}</strong><p>About eight words, weighted toward <b>new</b> and <b>heard-before</b> terms with a few familiar anchors. Missed words naturally come back more often.</p><div class="lexicon-crossword-actions-v314am"><button class="primary-button" type="button" data-lexicon-daily-start>${isResume ? "Resume today's Crossword" : "Start today's Crossword"}</button><button class="text-button" type="button" data-lexicon-practice-start>Practice instead</button></div></aside>`;
    }

    els.daily.innerHTML = `${dailyWordMarkup()}${crossword}`;
  }

  function renderDashboardDaily() { if (els.dashboardDaily) els.dashboardDaily.innerHTML = dailyWordMarkup({ compact: true }); }

  function renderCalibration() {
    if (!els.calibration) return;
    const s = state(), starter = ratingCounts(STARTER_POOL), extended = ratingCounts(EXTENDED_POOL), active = s.calibration.active;
    if (els.calibrationStatus) els.calibrationStatus.textContent = `${STARTER_POOL.length - starter.unrated}/${STARTER_POOL.length} Starter · ${EXTENDED_POOL.length - extended.unrated}/${EXTENDED_POOL.length} Extended`;
    if (els.calibrationStarter) { els.calibrationStarter.disabled = starter.unrated === 0 || Boolean(active); els.calibrationStarter.textContent = starter.unrated ? `Next 5 Starter words · ${starter.unrated} left` : "Starter calibrated ✓"; }
    if (els.calibrationExtended) { els.calibrationExtended.disabled = extended.unrated === 0 || Boolean(active); els.calibrationExtended.textContent = extended.unrated ? `Explore next 5 · ${extended.unrated} left` : "Extended pool rated ✓"; }
    if (els.exportProfile) els.exportProfile.disabled = (STARTER_POOL.length - starter.unrated) < 1;
    if (!els.calibrationWords) return;
    if (active) {
      const label = active.mode === "starter" ? "Starter" : "Extended";
      els.calibrationWords.innerHTML = `<div class="lexicon-calibration-empty-v314z is-active-v314z1"><span>↗</span><div><strong>${label} batch in progress.</strong><p>The five words open on the full-screen Training Grounds surface, not inside this small dialog.</p><button class="primary-button" type="button" data-lexicon-calibration-continue>Continue full screen</button></div></div>`;
      return;
    }
    els.calibrationWords.innerHTML = `<div class="lexicon-calibration-empty-v314z"><span>5</span><div><strong>Five words at a time · full screen.</strong><p>Choose a batch here; the actual calibration opens on its own distraction-free page.</p></div></div>`;
  }

  function calibrationWordMarkup(active) {
    return active.ids.map((id, index) => {
      const entry = POOL_BY_ID[id], rec = state().words[id] || {};
      return `<article class="lexicon-calibration-word-v314z lexicon-calibration-focus-word-v314z1 ${rec.selfRating ? "is-rated" : ""}"><div><small>${index + 1}/${active.ids.length} · ${escapeHtml(entry.theme)}</small><strong>${escapeHtml(entry.term)}</strong></div><div class="lexicon-calibration-ratings-v314z"><button type="button" data-lexicon-word-id="${escapeAttr(id)}" data-lexicon-calibration-rating="known" class="${rec.selfRating === "known" ? "selected" : ""}">Kenne ich</button><button type="button" data-lexicon-word-id="${escapeAttr(id)}" data-lexicon-calibration-rating="heard" class="${rec.selfRating === "heard" ? "selected" : ""}">Schon mal gehört</button><button type="button" data-lexicon-word-id="${escapeAttr(id)}" data-lexicon-calibration-rating="new" class="${rec.selfRating === "new" ? "selected" : ""}">Kenne ich nicht</button></div></article>`;
    }).join("");
  }

  function renderCalibrationFocus() {
    if (!els.calibrationFocus || !els.calibrationFocusWords) return;
    const active = state().calibration.active;
    const mode = active?.mode || calibrationFocusMode || "starter";
    const sourcePool = mode === "extended" ? EXTENDED_POOL : STARTER_POOL;
    const counts = ratingCounts(sourcePool);
    const rated = sourcePool.length - counts.unrated;
    const label = mode === "starter" ? "Starter Calibration" : "Extended Calibration";
    if (els.calibrationFocusStatus) els.calibrationFocusStatus.textContent = `${rated}/${sourcePool.length} rated · ${counts.unrated} left`;
    if (active) {
      calibrationFocusMode = active.mode;
      els.calibrationFocusWords.innerHTML = calibrationWordMarkup(active);
      if (els.calibrationFocusActions) els.calibrationFocusActions.innerHTML = `<small>Choose the answer that feels true right now. This is calibration, not a vocabulary test.</small>`;
      return;
    }
    const complete = counts.unrated === 0;
    els.calibrationFocusWords.innerHTML = `<div class="lexicon-calibration-focus-complete-v314z1"><span>✓</span><div><strong>${complete ? `${label} complete!` : "Five-word batch complete!"}</strong><p>${complete ? "This part of your personal vocabulary profile is fully rated." : `${counts.unrated} words remain. Continue whenever you feel like it.`}</p></div></div>`;
    if (els.calibrationFocusActions) els.calibrationFocusActions.innerHTML = `<button class="primary-button" type="button" data-lexicon-calibration-next="${mode}" ${complete ? "disabled" : ""}>${complete ? `${label} complete ✓` : "Next 5 words"}</button><button class="secondary-button" type="button" data-lexicon-calibration-done>Back to Lexicon Lab</button>`;
  }

  function renderProgress() {
    if (!els.progress) return;
    const starter = ratingCounts(STARTER_POOL), rated = STARTER_POOL.length - starter.unrated, pct = Math.round(rated / Math.max(1, STARTER_POOL.length) * 100);
    if (!starterComplete()) {
      els.progress.innerHTML = `<div><span><strong>${rated}/${STARTER_POOL.length}</strong> Starter words calibrated</span><span>${pct}%</span></div><div class="bar"><span style="width:${pct}%"></span></div>`;
      return;
    }
    const dailySolved = Number(state().stats.dailyCrosswordsSolved || 0);
    const practiceSolved = Number(state().stats.practiceCrosswordsSolved || 0);
    els.progress.innerHTML = `<div><span><strong>Daily Crossword unlocked ✓</strong></span><span>${dailySolved} Daily solved · ${practiceSolved} Practice</span></div><div class="bar"><span style="width:100%"></span></div>`;
  }

  function renderLevels() {
    if (!els.levels) return;
    const rated = POOL.length - ratingCounts(POOL).unrated;
    const complete = dailyCrosswordComplete();

    if (!starterComplete()) {
      els.levels.innerHTML = `<div class="lexicon-crossword-paused-v314z"><span>⌗</span><div><strong>Daily Crosswords unlock after Starter Calibration.</strong><p>The old fixed 30-puzzle set is retired from normal play. Your new Crosswords use the same ${POOL.length}-word pool and adapt directly to your saved ratings.</p></div></div>`;
      return;
    }

    els.levels.innerHTML = `
      <article class="lexicon-adaptive-card-v314am is-daily">
        <div><small>DAILY · REWARDED</small><strong>${complete ? "Daily Crossword complete ✓" : "Today's Daily Crossword"}</strong><p>Generated from ${rated} currently rated words. New + heard-before terms are favored; known terms provide anchors. One rewarded completion per day.</p></div>
        <button class="${complete ? "secondary-button" : "primary-button"}" type="button" ${complete ? "disabled" : "data-lexicon-daily-start"}>${complete ? "Come back tomorrow" : "Start Daily Crossword"}</button>
      </article>
      <article class="lexicon-adaptive-card-v314am">
        <div><small>PRACTICE · NO ECONOMY REWARD</small><strong>Generate another Crossword</strong><p>Fresh adaptive puzzle for when one is not enough. It still updates word recall/miss evidence, but gives no XP, Coins or Story Energy.</p></div>
        <button class="secondary-button" type="button" data-lexicon-practice-start>Generate Practice Crossword</button>
      </article>
      <div class="lexicon-adaptive-note-v314am"><span>↻</span><p><strong>No more exports needed for puzzle updates.</strong> New calibration ratings and Daily Word ratings automatically enter the candidate pool. The profile export remains available as a backup/inspection tool.</p></div>`;
  }

  function renderCollections() {
    if (!els.collections) return;
    const themeNames = [...new Set(POOL.map(entry => entry.theme))];
    els.collections.innerHTML = themeNames.map(theme => {
      const words = POOL.filter(entry => entry.theme === theme);
      const rated = words.filter(entry => state().words[entry.id]?.selfRating).length;
      const known = words.filter(entry => state().words[entry.id]?.selfRating === "known").length;
      return `<div class="lexicon-collection-v314q"><span>${collectionIcon(theme)}</span><div><strong>${escapeHtml(theme)}</strong><small>${rated}/${words.length} rated · ${known} known</small></div></div>`;
    }).join("");
  }

  function renderRecent() {
    if (!els.recent) return;
    const recent = POOL
      .map(entry => ({ entry, record: state().words[entry.id] }))
      .filter(item => item.record?.encounters || item.record?.selfRating)
      .sort((a,b) => new Date(b.record.lastSeen || 0) - new Date(a.record.lastSeen || 0))
      .slice(0, 10);
    if (!recent.length) {
      els.recent.innerHTML = `<div class="lexicon-empty-v314q"><span>✦</span><strong>Your personal lexicon starts with calibration.</strong><p>Rate five words at a time. Crosswords will later add separate recall evidence without pretending one solved clue means the word is permanently known.</p></div>`;
      return;
    }
    els.recent.innerHTML = recent.map(({entry,record}) => `<div class="lexicon-word-chip-v314q"><div><strong>${escapeHtml(entry.term)}</strong><small>${escapeHtml(entry.theme)}</small></div><span class="${record.selfRating || record.status}">${record.selfRating ? responseLabel(record.selfRating) : statusLabel(record.status)}</span></div>`).join("");
  }

  function renderBoard() {
    if (!els.board) return;
    const active = current();
    if (!active) {
      els.board.innerHTML = `<div class="lexicon-empty-v314q"><span>⌗</span><strong>Your Daily Crossword is ready when you are.</strong><p>Clues use the definitions already stored in your 300-word academic German pool.</p></div>`;
      if (els.puzzleMeta) els.puzzleMeta.innerHTML = "";
      if (els.across) els.across.innerHTML = "";
      if (els.down) els.down.innerHTML = "";
      if (els.hintPanel) { els.hintPanel.classList.add("hidden"); els.hintPanel.innerHTML = ""; }
      return;
    }
    const puzzle = activePuzzle(active);
    const cells = buildPuzzleCells(puzzle);
    if (els.puzzleMeta) {
      const mix = puzzle.profileMix || {};
      const mode = active.mode === "practice" ? "Practice · no economy reward" : active.mode === "daily" ? "Daily · rewarded once" : `Legacy Puzzle ${puzzle.level || ""}`;
      const mixText = active.mode === "daily" || active.mode === "practice"
        ? `${number(mix.new)} new · ${number(mix.heard)} heard · ${number(mix.known)} known`
        : `${puzzle.words.length} terms`;
      els.puzzleMeta.innerHTML = `<span>${escapeHtml(mode)}</span><span>${escapeHtml(puzzle.title)}</span><span>${escapeHtml(puzzle.theme)}</span><span>${escapeHtml(mixText)}</span>`;
    }
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
      const length = Array.from(String(entry.answer || "")).length;
      const familiarity = responseLabel(state().words[placement.id]?.selfRating || "");
      groups[placement.dir].push(`<button type="button" data-lexicon-word="${placement.id}" class="lexicon-clue-v314q"><b>${placement.number}</b><span>${escapeHtml(entry.clue)}</span><em>${length} letters${familiarity ? ` · ${escapeHtml(familiarity)}` : ""}</em></button>`);
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
    const puzzle = active ? activePuzzle(active) : null;
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
    const puzzle = activePuzzle(active);
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
    if (!live || live.completedAt || live.id !== active.id) return;

    live.completedAt = Date.now();
    live.updatedAt = live.completedAt;
    const masteryChanges = updateMasteryAfterCompletion(live, puzzle);
    let reward = null;

    if (live.mode === "daily") {
      const dateKey = live.dateKey || localDateKey(new Date());
      const record = s.dailyCrosswords[dateKey] || { puzzle };
      if (!record.completedAt) {
        reward = award(live, puzzle, masteryChanges);
        record.completedAt = live.completedAt;
        record.rewardEventId = reward?.eventId || null;
        record.progress = null;
        s.dailyCrosswords[dateKey] = record;
        s.stats.dailyCrosswordsSolved += 1;
        s.stats.puzzlesSolved += 1;
        live.rewardEventId = reward?.eventId || null;
      }
    } else if (live.mode === "practice") {
      s.stats.practiceCrosswordsSolved += 1;
      s.stats.puzzlesSolved += 1;
    } else {
      const already = completedSet().has(live.level);
      if (!live.replay && !already) {
        reward = award(live, puzzle, masteryChanges);
        s.journey.completedLevels.push(live.level);
        s.journey.completedLevels = [...new Set(s.journey.completedLevels)].sort((a,b) => a-b);
        s.stats.puzzlesSolved += 1;
        live.rewardEventId = reward?.eventId || null;
      }
    }

    s.completed.push({
      id: live.id,
      mode: live.mode || "legacy",
      dateKey: live.dateKey || null,
      level: live.level || null,
      replay: Boolean(live.replay),
      completedAt: live.completedAt,
      rewardEventId: reward?.eventId || null,
      wordIds: puzzle.words.map(word => word.id),
      masteryChanges
    });
    s.completed = s.completed.slice(-300);

    persist(live.mode === "practice" ? "lexicon-practice-complete" : "lexicon-complete");
    if (els.status) {
      els.status.className = "lexicon-status-v314q is-success";
      els.status.textContent = live.mode === "practice"
        ? "✓ Practice Crossword solved. Recall evidence is saved; no economy reward was created."
        : "✓ Daily Crossword solved. Your lexicon progress and rewards are saved.";
    }
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
    const isDaily = active.mode === "daily";
    const sourceId = isDaily ? `daily-crossword:${active.dateKey || localDateKey(new Date())}` : `crossword-l${active.level}`;
    const existing = (app.getState().rewardLedger?.events || []).find(event => event?.source === "lexicon-lab-complete" && event?.sourceId === sourceId);
    if (existing) return rewardFromEvent(existing);

    const meta = isDaily ? DAILY_CROSSWORD_REWARD : TIERS[tier(active.level)];
    const scale = isDaily ? 1 : REPEAT_SCALES[Math.min(todayCompletionCount(), REPEAT_SCALES.length - 1)];
    const perfectWords = puzzle.words.length - new Set(active.missedWordIds || []).size;

    return app.awardActivity({
      source: "lexicon-lab-complete",
      sourceId,
      label: isDaily ? "Lexicon Lab · Daily Crossword" : `Lexicon Lab · Academic Crossword ${active.level}`,
      realm: "Knowledge",
      capability: "knowledge",
      xp: Math.max(1, Math.round(meta.xp * scale)),
      realmXP: Math.max(1, Math.round((meta.realmXP ?? meta.xp) * scale)),
      statXP: Math.max(1, Math.round(meta.statXP * scale)),
      coins: Math.max(1, Math.round(meta.coins * scale)),
      storyEnergyBase: floor2(meta.story * scale),
      progressionRelevant: true,
      metadata: {
        lexiconLab: true,
        mode: isDaily ? "daily-crossword" : "crossword",
        dateKey: active.dateKey || null,
        level: active.level || null,
        theme: puzzle.theme,
        wordCount: puzzle.words.length,
        perfectWords,
        masteryUpgrades: masteryChanges.length,
        profileMix: puzzle.profileMix || null,
        repeatScale: scale
      }
    });
  }

  function renderResult() {
    if (!els.result) return;
    const active = current();
    if (!active?.completedAt) {
      els.result.classList.add("hidden");
      return;
    }

    const puzzle = activePuzzle(active);
    const event = active.rewardEventId ? (app.getState().rewardLedger?.events || []).find(item => item?.id === active.rewardEventId) : null;
    const reward = event ? rewardFromEvent(event) : null;
    const rewards = reward
      ? `<div class="training-result-rewards-v314o"><span>+${reward.xp} XP</span><span>+${reward.realmXP} Knowledge XP</span><span>+${reward.statXP} Lexicon XP</span><span>+${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} Story Energy</span><span>+${reward.coins} Coins</span></div>`
      : "";

    const recent = state().completed.slice().reverse().find(item => item.id === active.id);
    const upgrades = (recent?.masteryChanges || []).filter(item => ["familiar", "active", "mastered"].includes(item.to));
    const upgradeText = upgrades.length
      ? `<p class="lexicon-mastery-note-v314q">${upgrades.map(item => `${escapeHtml(ENTRY_BY_ID[item.id]?.term || item.id)} → ${statusLabel(item.to)}`).join(" · ")}</p>`
      : "";

    const isPractice = active.mode === "practice";
    const heading = isPractice ? "Practice Crossword solved!" : active.mode === "daily" ? "Daily Crossword solved!" : `Puzzle ${active.level} solved correctly!`;
    const copy = isPractice
      ? "No XP, Coins or Story Energy were created, but your actual recall and misses were saved to the personal lexicon."
      : active.mode === "daily"
        ? "Today's reward is saved. Tomorrow's Crossword will automatically use your updated vocabulary profile."
        : "Your rewards are saved.";

    els.result.className = "training-result-v314o is-success";
    els.result.innerHTML = `<span>✓</span><strong>${heading}</strong><p>${copy}</p>${upgradeText}${rewards}<div class="training-result-actions-v314o"><button class="primary-button" data-lexicon-next-level type="button">Generate Practice Crossword</button><button class="secondary-button" data-lexicon-return type="button">Back to Lexicon Lab</button></div>`;
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
    const puzzle = activePuzzle(active);
    render();
    const modeLabel = active.mode === "practice" ? "Practice Crossword" : active.mode === "daily" ? "Daily Crossword" : `Crossword ${active.level}`;
    return window.LifeRPGTrainingFocus.enter({
      id: "lexicon-lab",
      node: els.play,
      title: `Lexicon Lab · ${modeLabel}`,
      subtitle: `${puzzle.title} · ${puzzle.theme}`,
      tone: "light",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function syncFocusHeader() {
    const active = current();
    if (!active || !window.LifeRPGTrainingFocus?.isActive?.("lexicon-lab")) return;
    const puzzle = activePuzzle(active);
    if (!puzzle) return;
    const modeLabel = active.mode === "practice" ? "Practice Crossword" : active.mode === "daily" ? "Daily Crossword" : `Crossword ${active.level}`;
    window.LifeRPGTrainingFocus.update({
      title: `Lexicon Lab · ${modeLabel}`,
      subtitle: active.completedAt ? "Puzzle complete ✓" : `${puzzle.title} · ${puzzle.theme}`
    });
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
    const puzzle = active ? activePuzzle(active) : null;
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
    for (const entry of POOL) {
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
    startNext: () => {
      openDialog();
      if (state().calibration.active) enterCalibrationFocus();
      else if (!starterComplete()) chooseCalibrationChunk("starter", { enterFocus: true });
      else startDailyCrossword();
    },
    startDailyCrossword,
    startPracticeCrossword,
    getActivePuzzle: () => activePuzzle(current()),
    getDailyStatus: () => {
      const key = localDateKey(new Date());
      const record = dailyCrosswordRecord(key);
      return { dateKey: key, ready: starterComplete(), generated: Boolean(record?.puzzle), completed: Boolean(record?.completedAt), record };
    },
    getProgress: () => ({
      completed: Number(state().stats.dailyCrosswordsSolved || 0),
      total: null,
      next: dailyCrosswordComplete() ? null : "daily",
      poolTotal: POOL.length,
      starterRated: STARTER_POOL.length - ratingCounts(STARTER_POOL).unrated,
      starterTotal: STARTER_POOL.length
    })
  };
})();
