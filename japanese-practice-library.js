(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const VERSION = "0.31.4dz4";
  const SCHEMA = 1;
  const MAX_LOGS = 360;
  const TYPES = {
    series: { icon: "📺", label: "Series / anime" },
    video: { icon: "▶", label: "Video" },
    film: { icon: "🎬", label: "Film" },
    youtube: { icon: "▷", label: "YouTube" },
    podcast: { icon: "🎧", label: "Podcast / audio" },
    other: { icon: "✦", label: "Other" }
  };
  const MODES = {
    mining: { icon: "⛏", label: "Vocabulary Mining", minutes: 15 },
    listening: { icon: "耳", label: "Listening", minutes: 15 }
  };
  const DIFFICULTIES = {
    unknown: { label: "Not set", score: 0 },
    easy: { label: "Easy / comfortable", score: 0.9 },
    medium: { label: "Good challenge", score: 0.35 },
    hard: { label: "Hard", score: -0.55 }
  };
  const MOTIVATIONS = {
    very_high: { icon: "🔥", label: "Very high", score: 5 },
    high: { icon: "✨", label: "High", score: 3 },
    medium: { icon: "🙂", label: "Okay", score: 1 },
    low: { icon: "😐", label: "Later", score: -1.5 },
    someday: { icon: "🧊", label: "Someday", score: -4 }
  };

  const els = {};
  let initialized = false;

  init();

  function init() {
    cacheEls();
    if (!els.panel) return;
    bind();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("japanese-practice-init", { renderAll: false });
    render();
    exposeApi();
    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });
  }

  function cacheEls() {
    Object.assign(els, {
      panel: byId("japanesePracticeLibraryPanel"),
      grid: byId("japanesePracticeGrid"),
      empty: byId("japanesePracticeEmpty"),
      count: byId("japanesePracticeCount"),
      add: byId("japanesePracticeAdd"),
      dialog: byId("japanesePracticeDialog"),
      form: byId("japanesePracticeForm"),
      close: byId("japanesePracticeClose"),
      cancel: byId("japanesePracticeCancel"),
      del: byId("japanesePracticeDelete"),
      editId: byId("japanesePracticeEditId"),
      title: byId("japanesePracticeTitle"),
      type: byId("japanesePracticeType"),
      url: byId("japanesePracticeUrl"),
      next: byId("japanesePracticeNext"),
      difficulty: byId("japanesePracticeDifficulty"),
      motivation: byId("japanesePracticeMotivation"),
      status: byId("japanesePracticeStatus"),
      notes: byId("japanesePracticeNotes"),
      preview: byId("japanesePracticePreview")
    });
  }

  function bind() {
    els.add?.addEventListener("click", () => openEditor());
    els.close?.addEventListener("click", closeEditor);
    els.cancel?.addEventListener("click", closeEditor);
    els.del?.addEventListener("click", deleteCurrent);
    els.form?.addEventListener("submit", saveEditor);
    [els.title, els.type, els.url, els.next, els.difficulty, els.motivation, els.status].forEach(node => node?.addEventListener("input", renderPreview));
    els.form?.addEventListener("change", renderPreview);

    document.addEventListener("click", event => {
      const edit = event.target.closest?.("[data-jp-practice-edit]");
      if (edit) {
        openEditor(edit.dataset.jpPracticeEdit);
        return;
      }
      const open = event.target.closest?.("[data-jp-practice-open]");
      if (open) {
        start(open.dataset.jpPracticeOpen, open.dataset.jpPracticeMode || "listening");
        return;
      }
      const log = event.target.closest?.("[data-jp-practice-log]");
      if (log) {
        logSession(log.dataset.jpPracticeLog, log.dataset.jpPracticeMode || "listening", Number(log.dataset.jpPracticeMinutes || 15));
      }
    });

    document.addEventListener("change", event => {
      const motivation = event.target.closest?.("[data-jp-practice-motivation]");
      if (!motivation) return;
      const item = findItem(motivation.dataset.jpPracticeMotivation);
      if (!item || !MOTIVATIONS[motivation.value]) return;
      item.motivation = motivation.value;
      item.updatedAt = Date.now();
      persist("japanese-practice-motivation");
    });
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.japanesePracticeLibrary || typeof root.japanesePracticeLibrary !== "object" || Array.isArray(root.japanesePracticeLibrary)) {
      root.japanesePracticeLibrary = { schemaVersion: SCHEMA, items: [], logs: [] };
      changed = true;
    }
    const s = root.japanesePracticeLibrary;
    if (Number(s.schemaVersion || 0) < SCHEMA) { s.schemaVersion = SCHEMA; changed = true; }
    if (!Array.isArray(s.items)) { s.items = []; changed = true; }
    if (!Array.isArray(s.logs)) { s.logs = []; changed = true; }
    s.logs = s.logs.slice(-MAX_LOGS);
    s.items.forEach(item => {
      if (!item.id) { item.id = makeId("jp-media"); changed = true; }
      if (!TYPES[item.type]) { item.type = "series"; changed = true; }
      if (!Array.isArray(item.practiceModes)) { item.practiceModes = ["mining", "listening"]; changed = true; }
      item.practiceModes = item.practiceModes.filter(mode => MODES[mode]);
      if (!item.practiceModes.length) { item.practiceModes = ["listening"]; changed = true; }
      if (!DIFFICULTIES[item.difficulty]) { item.difficulty = "unknown"; changed = true; }
      if (!MOTIVATIONS[item.motivation]) { item.motivation = "medium"; changed = true; }
      if (!['active','paused','completed'].includes(item.status)) { item.status = "active"; changed = true; }
      if (typeof item.nextLabel !== "string") { item.nextLabel = ""; changed = true; }
      if (typeof item.url !== "string") { item.url = ""; changed = true; }
      if (typeof item.notes !== "string") { item.notes = ""; changed = true; }
      if (!Number.isFinite(Number(item.createdAt))) { item.createdAt = Date.now(); changed = true; }
      if (!Number.isFinite(Number(item.updatedAt))) { item.updatedAt = item.createdAt; changed = true; }
      if (!Number.isFinite(Number(item.lastUsedAt))) { item.lastUsedAt = 0; changed = true; }
    });
    return changed;
  }

  function state() {
    ensureState();
    return app.getState().japanesePracticeLibrary;
  }

  function persist(source, { renderAll = true } = {}) {
    app.saveState({ source: source || "japanese-practice" });
    render();
    window.dispatchEvent(new CustomEvent("life-rpg:japanese-practice-change"));
    if (renderAll) app.renderAll?.();
  }

  function render() {
    if (!els.grid || !els.empty) return;
    const items = [...state().items].sort((a, b) => {
      const statusScore = value => value === "active" ? 0 : value === "paused" ? 1 : 2;
      return statusScore(a.status) - statusScore(b.status)
        || motivationScore(b) - motivationScore(a)
        || Number(b.lastUsedAt || 0) - Number(a.lastUsedAt || 0)
        || String(a.title || "").localeCompare(String(b.title || ""));
    });
    els.count.textContent = `${items.filter(item => item.status === "active").length} active · ${items.length} total`;
    els.grid.innerHTML = items.map(cardMarkup).join("");
    els.empty.classList.toggle("hidden", items.length > 0);
  }

  function cardMarkup(item) {
    const type = TYPES[item.type] || TYPES.other;
    const motivation = MOTIVATIONS[item.motivation] || MOTIVATIONS.medium;
    const modes = item.practiceModes.map(mode => MODES[mode]).filter(Boolean);
    const latest = latestLog(item.id);
    return `
      <article class="jp-practice-card-v314dz4 ${item.status !== "active" ? "is-muted" : ""}">
        <div class="jp-practice-card-top-v314dz4">
          <div>
            <small>${type.icon} ${esc(type.label)} · ${esc(statusLabel(item.status))}</small>
            <h3>${esc(item.title || "Untitled")}</h3>
            ${item.nextLabel ? `<p>${esc(item.nextLabel)}</p>` : ""}
          </div>
          <button class="icon-button" type="button" data-jp-practice-edit="${escAttr(item.id)}" aria-label="Edit ${escAttr(item.title)}">✎</button>
        </div>
        <div class="jp-practice-tags-v314dz4">
          ${modes.map(mode => `<span>${mode.icon} ${esc(mode.label)}</span>`).join("")}
          <span>${esc(DIFFICULTIES[item.difficulty]?.label || "Not set")}</span>
          ${latest ? `<span>Last used ${esc(humanAgo(latest.at))}</span>` : ""}
        </div>
        <label class="jp-practice-motivation-v314dz4">Current motivation
          <select data-jp-practice-motivation="${escAttr(item.id)}">
            ${motivationOptions(item.motivation)}
          </select>
        </label>
        <div class="jp-practice-card-actions-v314dz4">
          ${item.status === "active" && item.url ? modes.map(mode => `<button class="secondary-button" type="button" data-jp-practice-open="${escAttr(item.id)}" data-jp-practice-mode="${escAttr(modeKey(mode))}">${mode.icon} Open ${esc(shortModeLabel(modeKey(mode)))}</button>`).join("") : ""}
          ${item.status === "active" ? modes.map(mode => `<button class="text-button" type="button" data-jp-practice-log="${escAttr(item.id)}" data-jp-practice-mode="${escAttr(modeKey(mode))}" data-jp-practice-minutes="${mode.minutes}">✓ Log ${mode.minutes}m</button>`).join("") : ""}
        </div>
      </article>`;
  }

  function modeKey(meta) {
    return Object.entries(MODES).find(([, value]) => value === meta)?.[0] || "listening";
  }

  function openEditor(id = "") {
    if (!els.dialog || !els.form) return;
    const item = id ? findItem(id) : null;
    els.form.reset();
    els.editId.value = item?.id || "";
    els.title.value = item?.title || "";
    els.type.value = TYPES[item?.type] ? item.type : "series";
    els.url.value = item?.url || "";
    els.next.value = item?.nextLabel || "";
    els.difficulty.value = DIFFICULTIES[item?.difficulty] ? item.difficulty : "unknown";
    els.motivation.value = MOTIVATIONS[item?.motivation] ? item.motivation : "medium";
    els.status.value = ['active','paused','completed'].includes(item?.status) ? item.status : "active";
    els.notes.value = item?.notes || "";
    const modes = new Set(item?.practiceModes || ["mining", "listening"]);
    els.form.querySelectorAll('input[name="japanesePracticeMode"]').forEach(input => { input.checked = modes.has(input.value); });
    els.del?.classList.toggle("hidden", !item);
    renderPreview();
    els.dialog.showModal();
  }

  function closeEditor() {
    els.dialog?.close();
  }

  function saveEditor(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;
    const id = String(els.editId?.value || "");
    const existing = id ? findItem(id) : null;
    const practiceModes = [...els.form.querySelectorAll('input[name="japanesePracticeMode"]:checked')].map(input => input.value).filter(mode => MODES[mode]);
    if (!practiceModes.length) {
      app.showToast?.("Choose at least one practice mode: Mining or Listening.");
      return;
    }
    const now = Date.now();
    const item = {
      ...(existing || {}),
      id: existing?.id || makeId("jp-media"),
      title: String(els.title?.value || "").trim(),
      type: TYPES[els.type?.value] ? els.type.value : "series",
      url: safeUrl(els.url?.value),
      nextLabel: String(els.next?.value || "").trim().slice(0, 120),
      practiceModes,
      difficulty: DIFFICULTIES[els.difficulty?.value] ? els.difficulty.value : "unknown",
      motivation: MOTIVATIONS[els.motivation?.value] ? els.motivation.value : "medium",
      status: ['active','paused','completed'].includes(els.status?.value) ? els.status.value : "active",
      notes: String(els.notes?.value || "").trim().slice(0, 500),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastUsedAt: Number(existing?.lastUsedAt || 0)
    };
    if (!item.url) {
      app.showToast?.("Add the page/video link so a Daily Pick can open the exact material instead of making you search again.");
      els.url?.focus();
      return;
    }
    if (existing) {
      const index = state().items.findIndex(row => row.id === existing.id);
      if (index >= 0) state().items[index] = item;
    } else state().items.push(item);
    persist(existing ? "japanese-practice-edit" : "japanese-practice-add");
    closeEditor();
    app.showToast?.(`${item.title} saved to Japanese Practice Library.`);
  }

  function deleteCurrent() {
    const id = String(els.editId?.value || "");
    const item = findItem(id);
    if (!item) return;
    if (!window.confirm(`Remove “${item.title}” from the Japanese Practice Library? Existing practice logs stay in your Life RPG history.`)) return;
    state().items = state().items.filter(row => row.id !== id);
    persist("japanese-practice-remove");
    closeEditor();
  }

  function renderPreview() {
    if (!els.preview) return;
    const title = String(els.title?.value || "Untitled material").trim() || "Untitled material";
    const type = TYPES[els.type?.value] || TYPES.series;
    const motivation = MOTIVATIONS[els.motivation?.value] || MOTIVATIONS.medium;
    const modes = [...els.form?.querySelectorAll('input[name="japanesePracticeMode"]:checked') || []].map(input => MODES[input.value]).filter(Boolean);
    const next = String(els.next?.value || "").trim();
    els.preview.innerHTML = `<span>${type.icon}</span><div><small>${esc(type.label)} · ${motivation.icon} ${esc(motivation.label)}</small><strong>${esc(title)}</strong><p>${esc(next || "Add the next episode / part if that saves you a decision later.")}${modes.length ? ` · ${modes.map(mode => mode.label).join(" + ")}` : ""}</p></div>`;
  }

  function start(id, mode = "listening") {
    const item = findItem(id);
    if (!item || item.status !== "active") return false;
    const resolvedMode = item.practiceModes.includes(mode) ? mode : item.practiceModes[0];
    if (!item.url) {
      app.showToast?.("This practice item needs a direct link first.");
      openEditor(item.id);
      return true;
    }
    window.open(item.url, "_blank", "noopener");
    app.showToast?.(`${MODES[resolvedMode]?.label || "Japanese practice"} opened · ${item.nextLabel || item.title}. Return here when you're done and log the session.`);
    return true;
  }

  function logSession(id, mode = "listening", minutes = 15, options = {}) {
    const item = findItem(id);
    if (!item) return null;
    const resolvedMode = item.practiceModes.includes(mode) ? mode : item.practiceModes[0] || "listening";
    const duration = Math.max(5, Math.min(180, Math.round(Number(minutes || MODES[resolvedMode]?.minutes || 15))));
    const now = new Date().toISOString();
    const reward = app.awardActivity?.({
      source: "japanese-practice",
      sourceId: `${item.id}:${resolvedMode}:${Date.now()}`,
      label: `${MODES[resolvedMode]?.label || "Japanese practice"} · ${item.title}`,
      realm: "Japanese",
      capability: "japanese",
      xp: resolvedMode === "mining" ? 12 : 9,
      realmXP: resolvedMode === "mining" ? 12 : 9,
      statXP: resolvedMode === "mining" ? 8 : 6,
      coins: resolvedMode === "mining" ? 5 : 4,
      storyEnergyBase: resolvedMode === "mining" ? 0.18 : 0.14,
      progressionRelevant: true,
      at: now,
      metadata: { japanesePractice: true, itemId: item.id, mode: resolvedMode, minutes: duration, title: item.title, nextLabel: item.nextLabel || "" }
    }) || {};
    state().logs.push({
      id: makeId("jp-log"), itemId: item.id, mode: resolvedMode, minutes: duration, at: now,
      rewardEventId: reward.eventId || null, source: options.source || "manual"
    });
    state().logs = state().logs.slice(-MAX_LOGS);
    item.lastUsedAt = Date.now();
    item.updatedAt = Date.now();
    persist("japanese-practice-log");
    app.showToast?.(`✓ ${item.title} · ${MODES[resolvedMode]?.label || "Japanese practice"} logged.`);
    return { item, mode: resolvedMode, minutes: duration, reward };
  }

  function eligibleItems() {
    return state().items.filter(item => item.status === "active" && item.title && item.url && Array.isArray(item.practiceModes) && item.practiceModes.some(mode => MODES[mode]));
  }

  function suggestedMode(item, slot = "focus") {
    const modes = new Set(item?.practiceModes || []);
    if (slot === "focus" && modes.has("mining")) return "mining";
    if (modes.has("listening")) return "listening";
    return modes.has("mining") ? "mining" : "listening";
  }

  function recommendedMinutes(item, mode, slot = "focus") {
    const base = MODES[mode]?.minutes || 15;
    if (slot === "gentle") return Math.min(base, 10);
    if (item?.difficulty === "hard") return Math.min(base, 15);
    return base;
  }

  function motivationScore(item) {
    return Number(MOTIVATIONS[item?.motivation]?.score || 0);
  }

  function difficultyScore(item) {
    return Number(DIFFICULTIES[item?.difficulty]?.score || 0);
  }

  function getLogs(id = "") {
    return state().logs.filter(log => !id || log.itemId === id).map(log => ({ ...log }));
  }

  function latestLog(id) {
    return [...state().logs].filter(log => log.itemId === id).sort((a,b) => time(b.at) - time(a.at))[0] || null;
  }

  function findItem(id) {
    return state().items.find(item => item.id === id) || null;
  }

  function exposeApi() {
    window.LifeRPGJapanesePractice = {
      version: VERSION,
      getItems: () => state().items.map(item => ({ ...item, practiceModes: [...item.practiceModes] })),
      getItem: id => findItem(id),
      getLogs,
      eligibleItems,
      suggestedMode,
      recommendedMinutes,
      motivationScore,
      difficultyScore,
      motivationMeta: key => MOTIVATIONS[key] || MOTIVATIONS.medium,
      modeMeta: key => MODES[key] || MODES.listening,
      typeMeta: key => TYPES[key] || TYPES.other,
      start,
      logSession,
      openEditor,
      render
    };
  }

  function motivationOptions(selected) {
    return Object.entries(MOTIVATIONS).map(([key, meta]) => `<option value="${key}" ${selected === key ? "selected" : ""}>${meta.icon} ${esc(meta.label)}</option>`).join("");
  }

  function shortModeLabel(mode) { return mode === "mining" ? "Mining" : "Listening"; }
  function statusLabel(status) { return status === "paused" ? "Paused" : status === "completed" ? "Finished" : "Active"; }
  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  }
  function time(value) { const n = typeof value === "number" ? value : new Date(value || 0).getTime(); return Number.isFinite(n) ? n : 0; }
  function humanAgo(value) {
    const diff = Math.max(0, Date.now() - time(value));
    const days = Math.floor(diff / 86400000);
    if (!days) return "today";
    if (days === 1) return "yesterday";
    if (days < 14) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  function makeId(prefix) { try { return `${prefix}-${crypto.randomUUID()}`; } catch { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; } }
  function byId(id) { return document.getElementById(id); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }
})();
