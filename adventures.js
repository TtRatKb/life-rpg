(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Side Adventures could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 1;
  const SHADOW_KEY = "life-rpg-side-adventures-shadow-v1";
  const MAX_LOGS = 600;
  const REALMS = ["Hobbies", "Recovery", "Japanese", "Knowledge", "Home", "Health", "Work"];
  const KINDS = {
    creative: { icon: "🎨", label: "Creative project" },
    skill: { icon: "🧶", label: "Skill / craft" },
    personal: { icon: "✨", label: "Personal project" },
    collection: { icon: "✦", label: "Collection / long game" },
    other: { icon: "🌸", label: "Other adventure" }
  };
  const ENERGY = {
    low: { label: "Low energy", icon: "☕", demand: 0.55 },
    medium: { label: "Medium energy", icon: "🌤️", demand: 1.35 },
    high: { label: "High energy", icon: "⚡", demand: 2.15 }
  };
  const REASONS = {
    "takes-space": { icon: "📦", label: "Takes up space" },
    "want-result": { icon: "✨", label: "I want the result" },
    learn: { icon: "🧠", label: "I want to learn this" },
    fun: { icon: "💕", label: "Just for fun" },
    gift: { icon: "🎁", label: "For someone" },
    deadline: { icon: "◷", label: "Has a real deadline" }
  };

  const els = {
    add: byId("addAdventureButton"),
    emptyAdd: byId("adventureEmptyCreate"),
    board: byId("adventureBoard"),
    empty: byId("adventureEmpty"),
    search: byId("adventureSearch"),
    status: byId("adventureStatusFilter"),
    kindFilters: byId("adventureKindFilters"),
    activeSummary: byId("adventureSummaryActive"),
    staleSummary: byId("adventureSummaryStale"),
    almostSummary: byId("adventureSummaryAlmost"),
    dialog: byId("adventureDialog"),
    form: byId("adventureForm"),
    editId: byId("adventureEditId"),
    dialogTitle: byId("adventureDialogTitle"),
    close: byId("adventureDialogClose"),
    cancel: byId("cancelAdventureButton"),
    deleteButton: byId("deleteAdventureButton"),
    saveAnother: byId("saveAdventureAnotherButton"),
    name: byId("adventureName"),
    kind: byId("adventureKind"),
    realm: byId("adventureRealm"),
    statusField: byId("adventureStatus"),
    energy: byId("adventureEnergy"),
    minutes: byId("adventureMinutes"),
    nextAction: byId("adventureNextAction"),
    progressMode: byId("adventureProgressMode"),
    progressWrap: byId("adventureProgressWrap"),
    progress: byId("adventureProgress"),
    incrementWrap: byId("adventureIncrementWrap"),
    increment: byId("adventureIncrement"),
    note: byId("adventureNote"),
    preview: byId("adventurePreview"),
    logDialog: byId("adventureLogDialog"),
    logForm: byId("adventureLogForm"),
    logId: byId("adventureLogId"),
    logTitle: byId("adventureLogTitle"),
    logPicker: byId("adventureLogPicker"),
    logChainStatus: byId("adventureLogChainStatus"),
    logClose: byId("adventureLogClose"),
    logCancel: byId("adventureLogCancel"),
    logFinishLine: byId("adventureLogFinishLine"),
    logProgressWrap: byId("adventureLogProgressWrap"),
    logProgress: byId("adventureLogProgress"),
    logNextAction: byId("adventureLogNextAction"),
    toast: byId("adventureToast"),
    toastTitle: byId("adventureToastTitle"),
    toastDetail: byId("adventureToastDetail")
  };

  let initialized = false;
  let selectedKind = "all";

  init();

  function init() {
    bindEvents();
    const changed = ensureState();
    initialized = true;
    if (changed) persist("side-adventures-init", { render: false });
    render();
    exposeApi();
  }

  function bindEvents() {
    els.add?.addEventListener("click", () => openAdventureDialog());
    els.emptyAdd?.addEventListener("click", () => openAdventureDialog());
    els.close?.addEventListener("click", closeAdventureDialog);
    els.cancel?.addEventListener("click", closeAdventureDialog);
    els.form?.addEventListener("submit", saveAdventureFromDialog);
    els.deleteButton?.addEventListener("click", deleteCurrentAdventure);
    els.progressMode?.addEventListener("change", renderFormState);
    [els.name, els.kind, els.realm, els.energy, els.minutes, els.nextAction, els.progress].forEach(input => input?.addEventListener("input", renderPreview));

    els.search?.addEventListener("input", renderBoard);
    els.status?.addEventListener("change", renderBoard);
    els.kindFilters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-adventure-kind]");
      if (!button) return;
      selectedKind = button.dataset.adventureKind || "all";
      els.kindFilters.querySelectorAll("[data-adventure-kind]").forEach(node => node.classList.toggle("active", node === button));
      renderBoard();
    });

    document.addEventListener("click", event => {
      const edit = event.target.closest?.("[data-adventure-edit]");
      if (edit) {
        openAdventureDialog(edit.dataset.adventureEdit);
        return;
      }
      const log = event.target.closest?.("[data-adventure-log]");
      if (log) {
        openLogDialog(log.dataset.adventureLog);
        return;
      }
      const pause = event.target.closest?.("[data-adventure-pause]");
      if (pause) {
        togglePause(pause.dataset.adventurePause);
        return;
      }
      const quick = event.target.closest?.("[data-adventure-quick-progress]");
      if (quick && els.logProgress) {
        const value = clamp(Number(quick.dataset.adventureQuickProgress || 0), 0, 100);
        els.logProgress.value = String(value);
        updateLogProgressButtons();
      }
    });

    els.logClose?.addEventListener("click", closeLogDialog);
    els.logCancel?.addEventListener("click", closeLogDialog);
    els.logForm?.addEventListener("submit", logAdventureProgress);
    els.logPicker?.addEventListener("change", () => {
      const item = model().items.find(entry => entry.id === els.logPicker.value);
      if (item) configureLogForm(item);
    });
    els.logProgress?.addEventListener("input", updateLogProgressButtons);

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      ensureState();
      render();
    });
  }

  function ensureState() {
    const state = app.getState();
    let changed = false;
    if (!state.sideAdventures || typeof state.sideAdventures !== "object" || Array.isArray(state.sideAdventures)) {
      state.sideAdventures = readShadow() || defaultState();
      changed = true;
    }
    const model = state.sideAdventures;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    if (!Array.isArray(model.items)) { model.items = []; changed = true; }
    if (!Array.isArray(model.logs)) { model.logs = []; changed = true; }

    model.items.forEach(item => {
      if (!item.id) { item.id = makeId("adv"); changed = true; }
      if (!item.name) { item.name = "Untitled adventure"; changed = true; }
      if (!KINDS[item.kind]) { item.kind = "other"; changed = true; }
      if (!REALMS.includes(item.realm)) { item.realm = "Hobbies"; changed = true; }
      if (!["active", "paused", "finished"].includes(item.status)) { item.status = "active"; changed = true; }
      if (!ENERGY[item.energy]) { item.energy = "medium"; changed = true; }
      if (!Number.isFinite(Number(item.sessionMinutes))) { item.sessionMinutes = 30; changed = true; }
      if (!item.progressMode || !["percent", "simple"].includes(item.progressMode)) { item.progressMode = "percent"; changed = true; }
      item.progress = clamp(Number(item.progress || 0), 0, 100);
      if (!Number.isFinite(Number(item.progressIncrement))) { item.progressIncrement = 5; changed = true; }
      if (!Array.isArray(item.reasonTags)) { item.reasonTags = []; changed = true; }
      if (!item.createdAt) { item.createdAt = Date.now(); changed = true; }
      if (!item.updatedAt) { item.updatedAt = item.createdAt; changed = true; }
    });

    if (model.logs.length > MAX_LOGS) model.logs = model.logs.slice(-MAX_LOGS);
    writeShadow(model);
    return changed;
  }

  function defaultState() {
    return { schemaVersion: SCHEMA, items: [], logs: [] };
  }

  function model() {
    ensureState();
    return app.getState().sideAdventures;
  }

  function persist(source, { render: shouldRender = true } = {}) {
    const current = model();
    if (current.logs.length > MAX_LOGS) current.logs = current.logs.slice(-MAX_LOGS);
    writeShadow(current);
    app.saveState({ source });
    if (shouldRender) render();
    dispatchChange(source);
  }

  function readShadow() {
    try {
      const raw = localStorage.getItem(SHADOW_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : null;
    } catch { return null; }
  }

  function writeShadow(value) {
    try { localStorage.setItem(SHADOW_KEY, JSON.stringify(value)); } catch { /* main save remains canonical */ }
  }

  function dispatchChange(source) {
    try {
      window.dispatchEvent(new CustomEvent("life-rpg:adventure-change", { detail: { source } }));
    } catch { /* no-op */ }
  }

  function render() {
    renderSummary();
    renderBoard();
  }

  function renderSummary() {
    const items = model().items;
    const active = items.filter(item => item.status === "active");
    const stale = active.filter(item => daysSince(item.lastTouchedAt || item.createdAt) >= 14);
    const almost = active.filter(item => item.progressMode === "percent" && Number(item.progress || 0) >= 75);
    if (els.activeSummary) els.activeSummary.textContent = String(active.length);
    if (els.staleSummary) els.staleSummary.textContent = String(stale.length);
    if (els.almostSummary) els.almostSummary.textContent = String(almost.length);
  }

  function renderBoard() {
    if (!els.board || !els.empty) return;
    const query = String(els.search?.value || "").trim().toLowerCase();
    const status = els.status?.value || "active";
    let items = [...model().items];
    items = items.filter(item => status === "all" ? true : item.status === status);
    if (selectedKind !== "all") items = items.filter(item => item.kind === selectedKind);
    if (query) {
      items = items.filter(item => [item.name, item.nextAction, item.note, item.realm, KINDS[item.kind]?.label].join(" ").toLowerCase().includes(query));
    }
    items.sort(sortAdventures);

    els.empty.classList.toggle("hidden", items.length > 0);
    els.board.innerHTML = items.map(adventureCardMarkup).join("");
  }

  function sortAdventures(a, b) {
    const statusRank = { active: 0, paused: 1, finished: 2 };
    const statusDiff = (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
    if (statusDiff) return statusDiff;
    const staleDiff = daysSince(b.lastTouchedAt || b.createdAt) - daysSince(a.lastTouchedAt || a.createdAt);
    if (Math.abs(staleDiff) > 6) return staleDiff;
    return Number(b.progress || 0) - Number(a.progress || 0) || a.name.localeCompare(b.name);
  }

  function adventureCardMarkup(item) {
    const kind = KINDS[item.kind] || KINDS.other;
    const energy = ENERGY[item.energy] || ENERGY.medium;
    const last = lastTouchedLabel(item);
    const reasons = item.reasonTags.map(tag => REASONS[tag]).filter(Boolean);
    const progress = item.progressMode === "percent" ? clamp(Number(item.progress || 0), 0, 100) : null;
    const doneToday = touchedToday(item.id);
    const action = item.nextAction || "Choose one small next step";
    const statusLabel = item.status === "finished" ? "Finished" : item.status === "paused" ? "Paused" : "Active";

    return `
      <article class="adventure-card-v15 status-${escAttr(item.status)}">
        <header class="adventure-card-head-v15">
          <div class="adventure-card-icon-v15">${kind.icon}</div>
          <div class="adventure-card-title-v15">
            <div class="adventure-card-kickers-v15">
              <span>${esc(item.realm)}</span><span>${esc(kind.label)}</span><span>${esc(statusLabel)}</span>
            </div>
            <h3>${esc(item.name)}</h3>
          </div>
          <button class="habit-edit-button-v1" type="button" data-adventure-edit="${escAttr(item.id)}" aria-label="Edit ${escAttr(item.name)}">⋯</button>
        </header>

        ${progress === null ? "" : `
          <div class="adventure-progress-v15">
            <div class="row-between"><small>PROGRESS</small><strong>${progress}%</strong></div>
            <div class="progress"><span style="width:${progress}%"></span></div>
          </div>`}

        <section class="adventure-next-action-v15">
          <small>NEXT ACTION</small>
          <strong>${esc(action)}</strong>
          <span>${energy.icon} ${esc(energy.label)} · about ${Number(item.sessionMinutes || 30)} min</span>
        </section>

        ${reasons.length ? `<div class="adventure-reasons-v15">${reasons.map(reason => `<span>${reason.icon} ${esc(reason.label)}</span>`).join("")}</div>` : ""}
        ${item.note ? `<p class="adventure-note-v15">${esc(item.note)}</p>` : ""}

        <footer class="adventure-card-footer-v15">
          <span class="adventure-last-v15">${doneToday ? "✓ Touched today" : esc(last)}</span>
          <div class="adventure-card-actions-v15">
            ${item.status === "active" ? `<button class="primary-button" type="button" data-adventure-log="${escAttr(item.id)}">${doneToday ? "Log more" : "Log progress"}</button>` : ""}
            ${item.status !== "finished" ? `<button class="secondary-button" type="button" data-adventure-pause="${escAttr(item.id)}">${item.status === "paused" ? "Resume" : "Pause"}</button>` : ""}
          </div>
        </footer>
      </article>`;
  }

  function openAdventureDialog(id = null) {
    if (!els.dialog || !els.form) return;
    const item = id ? model().items.find(entry => entry.id === id) : null;
    els.form.reset();
    if (els.editId) els.editId.value = item?.id || "";
    if (els.dialogTitle) els.dialogTitle.textContent = item ? "Edit side adventure" : "Create a side adventure";
    els.deleteButton?.classList.toggle("hidden", !item);
    els.saveAnother?.classList.toggle("hidden", Boolean(item));
    if (els.name) els.name.value = item?.name || "";
    if (els.kind) els.kind.value = item?.kind || "creative";
    if (els.realm) els.realm.value = item?.realm || "Hobbies";
    if (els.statusField) els.statusField.value = item?.status || "active";
    if (els.energy) els.energy.value = item?.energy || "medium";
    if (els.minutes) els.minutes.value = String(item?.sessionMinutes || 30);
    if (els.nextAction) els.nextAction.value = item?.nextAction || "";
    if (els.progressMode) els.progressMode.value = item?.progressMode || "percent";
    if (els.progress) els.progress.value = String(item?.progress || 0);
    if (els.increment) els.increment.value = String(item?.progressIncrement ?? 5);
    if (els.note) els.note.value = item?.note || "";
    els.form.querySelectorAll("input[name='adventureReason']").forEach(input => { input.checked = item?.reasonTags?.includes(input.value) || false; });
    renderFormState();
    renderPreview();
    els.dialog.showModal();
    setTimeout(() => els.name?.focus(), 20);
  }

  function closeAdventureDialog() {
    if (els.dialog?.open) els.dialog.close();
  }

  function renderFormState() {
    const percent = els.progressMode?.value !== "simple";
    els.progressWrap?.classList.toggle("hidden", !percent);
    els.incrementWrap?.classList.toggle("hidden", !percent);
    renderPreview();
  }

  function renderPreview() {
    if (!els.preview) return;
    const percent = els.progressMode?.value !== "simple";
    const progress = clamp(Number(els.progress?.value || 0), 0, 100);
    const energy = ENERGY[els.energy?.value] || ENERGY.medium;
    els.preview.innerHTML = `
      <div><small>TODAY'S FINISH LINE</small><strong>${esc(els.nextAction?.value || "Add one specific next action")}</strong></div>
      <span>${energy.icon} ${esc(energy.label)} · about ${Number(els.minutes?.value || 30)} min${percent ? ` · ${progress}% complete` : ""}</span>`;
  }

  function saveAdventureFromDialog(event) {
    event.preventDefault();
    if (!els.form?.reportValidity()) return;
    const current = model();
    const id = els.editId?.value || "";
    const existing = current.items.find(item => item.id === id);
    const now = Date.now();
    const item = existing || { id: makeId("adv"), createdAt: now, sessions: 0 };
    item.name = String(els.name?.value || "").trim();
    item.kind = KINDS[els.kind?.value] ? els.kind.value : "other";
    item.realm = REALMS.includes(els.realm?.value) ? els.realm.value : "Hobbies";
    item.status = ["active", "paused", "finished"].includes(els.statusField?.value) ? els.statusField.value : "active";
    item.energy = ENERGY[els.energy?.value] ? els.energy.value : "medium";
    item.sessionMinutes = clamp(Math.round(Number(els.minutes?.value || 30)), 5, 240);
    item.nextAction = String(els.nextAction?.value || "").trim();
    item.progressMode = els.progressMode?.value === "simple" ? "simple" : "percent";
    item.progress = item.progressMode === "percent" ? clamp(Number(els.progress?.value || 0), 0, 100) : 0;
    item.progressIncrement = item.progressMode === "percent" ? clamp(Number(els.increment?.value || 0), 0, 100) : 0;
    item.reasonTags = [...els.form.querySelectorAll("input[name='adventureReason']:checked")].map(input => input.value).filter(tag => REASONS[tag]);
    item.note = String(els.note?.value || "").trim();
    item.updatedAt = now;
    if (item.progressMode === "percent" && item.progress >= 100) item.status = "finished";
    if (!existing) current.items.push(item);
    const stewardshipReward = existing ? null : window.LifeRPGStewardship?.rewardCreation?.({
      type: "adventure",
      id: item.id,
      label: item.name,
      fields: [item.name, item.kind]
    });
    const addAnother = !existing && event.submitter?.dataset.saveAnother === "true";
    persist(existing ? "side-adventure-edit" : "side-adventure-create");
    if (Number(stewardshipReward?.xp || 0) > 0 || Number(stewardshipReward?.storyEnergy || 0) > 0) app.renderAll?.();
    if (addAnother) {
      resetAdventureDialogForAnother({ kind: item.kind, realm: item.realm, energy: item.energy, sessionMinutes: item.sessionMinutes });
    } else {
      closeAdventureDialog();
    }
    if (stewardshipReward) {
      const upkeepText = window.LifeRPGStewardship?.statusText?.(stewardshipReward) || "";
      if (upkeepText) app.showToast?.(`Side Adventure added · ${upkeepText}`);
    }
  }

  function resetAdventureDialogForAnother(defaults = {}) {
    els.form?.reset();
    if (els.editId) els.editId.value = "";
    if (els.dialogTitle) els.dialogTitle.textContent = "Create a side adventure";
    els.deleteButton?.classList.add("hidden");
    els.saveAnother?.classList.remove("hidden");
    if (els.kind) els.kind.value = defaults.kind || "creative";
    if (els.realm) els.realm.value = defaults.realm || "Hobbies";
    if (els.energy) els.energy.value = defaults.energy || "medium";
    if (els.minutes) els.minutes.value = String(defaults.sessionMinutes || 30);
    if (els.statusField) els.statusField.value = "active";
    if (els.progressMode) els.progressMode.value = "percent";
    if (els.progress) els.progress.value = "0";
    if (els.increment) els.increment.value = "5";
    renderFormState();
    window.setTimeout(() => els.name?.focus(), 20);
  }

  function deleteCurrentAdventure() {
    const id = els.editId?.value;
    const item = model().items.find(entry => entry.id === id);
    if (!item) return;
    if (!window.confirm(`Delete “${item.name}”? Past logs for this adventure will also be removed.`)) return;
    const current = model();
    current.items = current.items.filter(entry => entry.id !== id);
    current.logs = current.logs.filter(log => log.adventureId !== id);
    persist("side-adventure-delete");
    closeAdventureDialog();
  }

  function togglePause(id) {
    const item = model().items.find(entry => entry.id === id);
    if (!item || item.status === "finished") return;
    item.status = item.status === "paused" ? "active" : "paused";
    item.updatedAt = Date.now();
    persist(item.status === "paused" ? "side-adventure-pause" : "side-adventure-resume");
  }

  function openLogDialog(id) {
    const item = model().items.find(entry => entry.id === id);
    if (!item || !els.logDialog || !els.logForm) return;
    els.logForm.reset();
    populateLogPicker(item.id);
    configureLogForm(item);
    setChainLogStatus("");
    els.logDialog.showModal();
  }

  function populateLogPicker(selectedId = "") {
    if (!els.logPicker) return;
    const items = [...model().items].filter(item => item.status !== "finished").sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    els.logPicker.innerHTML = items.map(item => `<option value="${escAttr(item.id)}">${esc(item.name)}</option>`).join("");
    if (items.some(item => item.id === selectedId)) els.logPicker.value = selectedId;
  }

  function configureLogForm(item) {
    if (!item) return;
    if (els.logId) els.logId.value = item.id;
    if (els.logPicker && els.logPicker.value !== item.id) els.logPicker.value = item.id;
    if (els.logTitle) els.logTitle.textContent = item.name;
    if (els.logFinishLine) els.logFinishLine.textContent = item.nextAction || "Spend one focused session on this.";
    const percent = item.progressMode === "percent";
    els.logProgressWrap?.classList.toggle("hidden", !percent);
    if (els.logProgress) els.logProgress.value = String(percent ? clamp(Number(item.progress || 0) + Number(item.progressIncrement || 0), 0, 100) : 0);
    if (els.logNextAction) els.logNextAction.value = "";
    renderLogQuickButtons(item);
  }

  function setChainLogStatus(message) {
    if (!els.logChainStatus) return;
    els.logChainStatus.textContent = message || "";
    els.logChainStatus.classList.toggle("hidden", !message);
  }

  function closeLogDialog() {
    if (els.logDialog?.open) els.logDialog.close();
    setChainLogStatus("");
  }

  function renderLogQuickButtons(item) {
    const holder = byId("adventureLogQuickProgress");
    if (!holder || item.progressMode !== "percent") {
      if (holder) holder.innerHTML = "";
      return;
    }
    const current = clamp(Number(item.progress || 0), 0, 100);
    const configured = clamp(Number(item.progressIncrement || 0), 0, 100);
    const options = [...new Set([configured ? current + configured : null, current + 5, current + 10, 100].filter(v => Number.isFinite(v)).map(v => clamp(v, 0, 100)))];
    holder.innerHTML = options.map(value => `<button type="button" class="adventure-progress-chip-v15" data-adventure-quick-progress="${value}">${value === 100 ? "Finish 100%" : `Set ${value}%`}</button>`).join("");
    updateLogProgressButtons();
  }

  function updateLogProgressButtons() {
    const value = Number(els.logProgress?.value || 0);
    byId("adventureLogQuickProgress")?.querySelectorAll("[data-adventure-quick-progress]").forEach(button => button.classList.toggle("active", Number(button.dataset.adventureQuickProgress) === value));
  }

  function adventureRewardSpec(item, at) {
    const minutes = clamp(Number(item.minutes || 30), 10, 180);
    const energyFactor = item.energy === "high" ? 1.12 : item.energy === "low" ? 0.9 : 1;
    const storyEnergyBase = Math.min(2.8, Math.max(0.35, minutes * 0.025 * energyFactor));
    const xp = Math.max(4, Math.round(storyEnergyBase * 10));
    const capability = app.inferCapability?.({
      realm: item.realm,
      label: item.name,
      kind: item.kind || "adventure"
    }) || "creativity";

    return {
      source: "adventure",
      sourceId: item.id,
      label: item.name,
      realm: item.realm,
      capability,
      xp,
      realmXP: xp,
      statXP: Math.max(1, Math.round(xp * 0.65)),
      storyEnergyBase,
      at: new Date(at).toISOString(),
      metadata: { minutes, energy: item.energy, kind: item.kind }
    };
  }

  function logAdventureProgress(event) {
    event.preventDefault();
    const id = els.logId?.value;
    const item = model().items.find(entry => entry.id === id);
    if (!item) return;
    const before = clamp(Number(item.progress || 0), 0, 100);
    const after = item.progressMode === "percent" ? clamp(Number(els.logProgress?.value || before), 0, 100) : before;
    const now = Date.now();
    item.progress = after;
    item.sessions = Number(item.sessions || 0) + 1;
    item.lastTouchedAt = now;
    item.updatedAt = now;
    const nextAction = String(els.logNextAction?.value || "").trim();
    if (nextAction) item.nextAction = nextAction;
    if (item.progressMode === "percent" && after >= 100) item.status = "finished";

    const reward = app.awardActivity?.(adventureRewardSpec(item, now)) || {
      xp: 0, realmXP: 0, statXP: 0, storyEnergy: 0, rawStoryEnergy: 0
    };

    model().logs.push({
      id: makeId("advlog"),
      adventureId: item.id,
      at: now,
      date: todayKey(),
      progressBefore: before,
      progressAfter: after,
      xp: Number(reward.xp || 0),
      realmXP: Number(reward.realmXP || 0),
      statXP: Number(reward.statXP || 0),
      storyEnergy: Number(reward.storyEnergy || 0),
      rawStoryEnergy: Number(reward.rawStoryEnergy || 0),
      rewardEventId: reward.eventId || null,
      deduped: Boolean(reward.deduped)
    });
    persist("side-adventure-progress");
    app.renderAll?.();
    const addAnother = event.submitter?.dataset.logAnother === "true";
    showToast(item, before, after, reward);
    if (addAnother) {
      populateLogPicker(item.status === "finished" ? "" : item.id);
      const nextItem = model().items.find(entry => entry.id === els.logPicker?.value);
      if (nextItem) {
        configureLogForm(nextItem);
        setChainLogStatus(`✓ ${item.name} saved. Pick another side adventure above or log another session.`);
        window.setTimeout(() => els.logPicker?.focus(), 20);
      } else {
        closeLogDialog();
      }
    } else {
      closeLogDialog();
    }
  }

  function showToast(item, before, after, reward = null) {
    if (!els.toast) return;
    if (els.toastTitle) els.toastTitle.textContent = item.name;
    if (els.toastDetail) {
      const delta = item.progressMode === "percent" && after !== before ? ` · ${after}% complete` : "";
      const rewardText = reward ? ` · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${Number(reward.xp || 0)} XP` : "";
      els.toastDetail.textContent = `Progress logged${delta}${rewardText}`;
    }
    els.toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast?.classList.add("hidden"), 2800);
  }

  function touchedToday(id) {
    return model().logs.some(log => log.adventureId === id && (log.date === todayKey() || dateKeyFromValue(log.at) === todayKey()));
  }

  function lastTouchedLabel(item) {
    const timestamp = item.lastTouchedAt || item.createdAt;
    const days = daysSince(timestamp);
    if (!item.lastTouchedAt && days <= 0) return "Added today";
    if (!item.lastTouchedAt) return `Not started · added ${humanDays(days)} ago`;
    if (days <= 0) return "Touched today";
    if (days === 1) return "Last touched yesterday";
    if (days < 7) return `Last touched ${days} days ago`;
    if (days < 14) return `Last touched ${Math.floor(days / 7)} week ago`;
    if (days < 60) return `Last touched ${Math.floor(days / 7)} weeks ago`;
    return `Last touched ${Math.floor(days / 30)} months ago`;
  }

  function exposeApi() {
    window.LifeRPGAdventures = {
      getItems: () => [...model().items],
      getLogs: () => [...model().logs],
      getItem: id => model().items.find(item => item.id === id) || null,
      touchedToday,
      openCreate: () => openAdventureDialog(),
      openEdit: id => openAdventureDialog(id),
      openLog: id => openLogDialog(id),
      render
    };
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function dateKeyFromValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function daysSince(value) {
    if (!value) return 999;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - date) / 86400000));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function byId(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function escAttr(value) { return esc(value); }
})();
