(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const SCHEMA = 1;
  const MAX_CURIOSITY = 200;
  const els = {
    curiosityForm: byId("curiosityQuickForm"),
    curiosityInput: byId("curiosityQuickInput"),
    curiosityList: byId("curiosityQueueList"),
    curiosityCount: byId("curiosityQueueCount"),
    bunproReviews: byId("smartBunproReviews"),
    bunproUnknown: byId("smartBunproUnknown"),
    paperPile: byId("smartPaperPileOpen"),
    laundryState: byId("smartLaundryState"),
    laundryDry: byId("smartLaundryDryButton"),
    contextHint: byId("smartQuestContextHint"),
    noteDialog: byId("smartQuestNoteDialog"),
    noteForm: byId("smartQuestNoteForm"),
    noteTitle: byId("smartQuestNoteTitle"),
    noteSource: byId("smartQuestNoteSource"),
    noteText: byId("smartQuestNoteText"),
    noteMode: byId("smartQuestNoteMode"),
    noteItemId: byId("smartQuestNoteItemId"),
    noteQuestId: byId("smartQuestNoteQuestId"),
    noteQuestUnits: byId("smartQuestNoteQuestUnits"),
    noteClose: byId("smartQuestNoteClose"),
    noteCancel: byId("smartQuestNoteCancel")
  };

  init();

  function init() {
    ensureState();
    bindEvents();
    render();
    window.setTimeout(() => app.renderAll?.(), 0);
    window.addEventListener("life-rpg:render", render);
    window.addEventListener("life-rpg:book-change", render);
    window.addEventListener("life-rpg:adventure-change", render);
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA,
      bunpro: { reviewsWaiting: null, updatedAt: null },
      paperPileOpen: false,
      laundry: { state: "none", updatedAt: null },
      curiosity: { items: [], explainNotes: [], activeItemId: null, lastExplainAt: null }
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.smartQuests || typeof root.smartQuests !== "object" || Array.isArray(root.smartQuests)) {
      root.smartQuests = defaultState();
    }
    const state = root.smartQuests;
    state.schemaVersion = SCHEMA;
    if (!state.bunpro || typeof state.bunpro !== "object") state.bunpro = defaultState().bunpro;
    if (!(state.bunpro.reviewsWaiting === null || Number.isFinite(Number(state.bunpro.reviewsWaiting)))) state.bunpro.reviewsWaiting = null;
    state.paperPileOpen = Boolean(state.paperPileOpen);
    if (!state.laundry || typeof state.laundry !== "object") state.laundry = defaultState().laundry;
    if (!["none", "needs_washing", "drying", "ready_fold"].includes(state.laundry.state)) state.laundry.state = "none";
    if (!state.curiosity || typeof state.curiosity !== "object") state.curiosity = defaultState().curiosity;
    if (!Array.isArray(state.curiosity.items)) state.curiosity.items = [];
    if (!Array.isArray(state.curiosity.explainNotes)) state.curiosity.explainNotes = [];
    if (state.curiosity.items.length > MAX_CURIOSITY) state.curiosity.items = state.curiosity.items.slice(-MAX_CURIOSITY);
    return state;
  }

  function model() { return ensureState(); }

  function persist(source = "smart-quests") {
    app.saveState({ source });
    render();
    app.renderAll?.();
    try { window.dispatchEvent(new CustomEvent("life-rpg:smart-quest-change", { detail: { source } })); } catch { /* noop */ }
  }

  function bindEvents() {
    els.curiosityForm?.addEventListener("submit", event => {
      event.preventDefault();
      addCuriosity(els.curiosityInput?.value);
      if (els.curiosityInput) els.curiosityInput.value = "";
    });

    els.curiosityList?.addEventListener("click", event => {
      const explore = event.target.closest?.("[data-curiosity-explore]");
      if (explore) return startCuriosityDive(explore.dataset.curiosityExplore);
      const answer = event.target.closest?.("[data-curiosity-answer]");
      if (answer) return openCuriosityAnswer(answer.dataset.curiosityAnswer);
      const reopen = event.target.closest?.("[data-curiosity-reopen]");
      if (reopen) return reopenCuriosity(reopen.dataset.curiosityReopen);
      const remove = event.target.closest?.("[data-curiosity-remove]");
      if (remove) return removeCuriosity(remove.dataset.curiosityRemove);
    });

    els.bunproReviews?.addEventListener("change", () => {
      const raw = String(els.bunproReviews.value || "").trim();
      const value = raw === "" ? null : Math.max(0, Math.floor(Number(raw) || 0));
      model().bunpro = { reviewsWaiting: value, updatedAt: Date.now() };
      persist("smart-bunpro-reviews");
    });
    els.bunproUnknown?.addEventListener("click", () => {
      model().bunpro = { reviewsWaiting: null, updatedAt: Date.now() };
      persist("smart-bunpro-unknown");
    });
    els.paperPile?.addEventListener("change", () => {
      model().paperPileOpen = Boolean(els.paperPile.checked);
      persist("smart-paper-pile");
    });
    els.laundryState?.addEventListener("change", () => {
      model().laundry = { state: els.laundryState.value || "none", updatedAt: Date.now() };
      persist("smart-laundry-state");
    });
    els.laundryDry?.addEventListener("click", () => {
      model().laundry = { state: "ready_fold", updatedAt: Date.now() };
      persist("smart-laundry-dry");
    });

    els.noteClose?.addEventListener("click", closeNoteDialog);
    els.noteCancel?.addEventListener("click", closeNoteDialog);
    els.noteForm?.addEventListener("submit", saveSmartNote);
  }

  function addCuriosity(text) {
    const value = clean(text);
    if (!value) return;
    model().curiosity.items.push({ id: makeId("curiosity"), text: value, status: "open", createdAt: Date.now(), researchedAt: null, resolvedAt: null, answer: "" });
    persist("curiosity-add");
  }

  function openCuriosityItems() {
    return model().curiosity.items.filter(item => item && item.status !== "done");
  }

  function currentCuriosity() {
    const state = model().curiosity;
    const open = openCuriosityItems();
    if (!open.length) return null;
    const active = open.find(item => item.id === state.activeItemId);
    return active || [...open].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))[0];
  }

  function startCuriosityDive(id) {
    const item = model().curiosity.items.find(entry => entry.id === id && entry.status !== "done");
    if (!item) return;
    const quest = questByRole("curiosity-dive");
    if (!quest) return;
    model().curiosity.activeItemId = item.id;
    app.saveState({ source: "curiosity-select" });
    window.LifeRPGTime?.startAction?.({
      minutes: 15,
      categoryId: "focus",
      subcategory: "Study",
      label: `Curiosity Dive · ${item.text}`,
      linkedQuestId: quest.id
    });
    app.showToast?.(`Curiosity Dive started: ${item.text}`);
    render();
  }

  function openCuriosityAnswer(id) {
    const item = model().curiosity.items.find(entry => entry.id === id);
    if (!item) return;
    openNoteDialog({ mode: "curiosity", itemId: item.id, title: "What did you find?", source: item.text, text: item.answer || "" });
  }

  function reopenCuriosity(id) {
    const item = model().curiosity.items.find(entry => entry.id === id);
    if (!item) return;
    item.status = "open";
    item.resolvedAt = null;
    persist("curiosity-reopen");
  }

  function removeCuriosity(id) {
    const item = model().curiosity.items.find(entry => entry.id === id);
    if (!item) return;
    if (!window.confirm(`Remove “${item.text}” from the Curiosity Queue?`)) return;
    model().curiosity.items = model().curiosity.items.filter(entry => entry.id !== id);
    if (model().curiosity.activeItemId === id) model().curiosity.activeItemId = null;
    persist("curiosity-remove");
  }

  function openNoteDialog({ mode, itemId = "", questId = "", questUnits = 1, title, source, text = "" }) {
    if (!els.noteDialog) return;
    if (els.noteMode) els.noteMode.value = mode || "";
    if (els.noteItemId) els.noteItemId.value = itemId || "";
    if (els.noteQuestId) els.noteQuestId.value = questId || "";
    if (els.noteQuestUnits) els.noteQuestUnits.value = String(questUnits || 1);
    if (els.noteTitle) els.noteTitle.textContent = title || "Save what you learned";
    if (els.noteSource) els.noteSource.textContent = source || "";
    if (els.noteText) els.noteText.value = text || "";
    els.noteDialog.showModal();
    window.setTimeout(() => els.noteText?.focus(), 30);
  }

  function closeNoteDialog() {
    if (els.noteDialog?.open) els.noteDialog.close();
  }

  function saveSmartNote(event) {
    event.preventDefault();
    const mode = els.noteMode?.value || "";
    const text = clean(els.noteText?.value);
    if (!text) {
      app.showToast?.("Write at least one useful line first.");
      return;
    }

    if (mode === "curiosity") {
      const item = model().curiosity.items.find(entry => entry.id === els.noteItemId?.value);
      if (item) {
        item.answer = text;
        item.status = "done";
        item.resolvedAt = Date.now();
        if (!item.researchedAt) item.researchedAt = item.resolvedAt;
        if (model().curiosity.activeItemId === item.id) model().curiosity.activeItemId = null;
      }
      closeNoteDialog();
      persist("curiosity-answer");
      return;
    }

    if (mode === "explain") {
      const notes = model().curiosity.explainNotes;
      const createdAt = Date.now();
      notes.push({ id: makeId("explain"), text, source: els.noteSource?.textContent || "", createdAt });
      const questId = els.noteQuestId?.value;
      const units = Math.max(1, Number(els.noteQuestUnits?.value || 1));
      closeNoteDialog();
      app.saveState({ source: "explain-it-back-note" });
      const result = app.logQuestProgress?.(questId, units, { showOverlay: false, smartBypass: true });
      if (result && !result.pending) {
        model().curiosity.lastExplainAt = createdAt;
        app.saveState({ source: "explain-it-back-complete" });
      }
      render();
    }
  }

  function availabilityForQuest(quest) {
    const role = quest?.systemRole;
    if (!role) return null;
    if (role === "bunpro-reviews") {
      const count = model().bunpro.reviewsWaiting;
      if (count === null) return { available: false, reason: "Set Bunpro reviews below" };
      return count > 0 ? { available: true, reason: `${count} review${count === 1 ? "" : "s"} waiting` } : { available: false, reason: "No Bunpro reviews waiting" };
    }
    if (role === "bunpro-lesson") {
      const count = model().bunpro.reviewsWaiting;
      if (count === null) return { available: false, reason: "Set Bunpro reviews below" };
      return count === 0 ? { available: true, reason: "Reviews clear" } : { available: false, reason: `${count} reviews waiting first` };
    }
    if (role === "curiosity-dive") {
      const count = openCuriosityItems().length;
      return count ? { available: true, reason: `${count} saved question${count === 1 ? "" : "s"}` } : { available: false, reason: "Add a question to Curiosity Queue" };
    }
    if (role === "explain-it-back") {
      const source = latestLearningSource();
      return source ? { available: true, reason: `New material: ${source.label}` } : { available: false, reason: "No new learning since last Explain It Back" };
    }
    if (role === "craft-session") {
      const craft = currentCraftAdventure();
      return craft ? { available: true, reason: craft.name } : { available: false, reason: "No active craft/skill Adventure" };
    }
    if (role === "paper-pile") return model().paperPileOpen ? { available: true, reason: "Paper pile marked waiting" } : { available: false, reason: "No paper pile marked waiting" };
    if (role === "laundry-cycle") return model().laundry.state === "needs_washing" ? { available: true, reason: "Laundry is waiting" } : { available: false, reason: laundryReason() };
    if (role === "laundry-fold") return model().laundry.state === "ready_fold" ? { available: true, reason: "Dry load ready to fold" } : { available: false, reason: laundryReason() };
    const inspirationAvailability = window.LifeRPGInspirations?.availabilityForQuest?.(quest);
    if (inspirationAvailability) return inspirationAvailability;
    const sudokuAvailability = window.LifeRPGSudoku?.availabilityForQuest?.(quest);
    if (sudokuAvailability) return sudokuAvailability;
    return null;
  }

  function contextForQuest(quest) {
    const role = quest?.systemRole;
    if (role === "curiosity-dive") {
      const item = currentCuriosity();
      return item ? { label: item.text, goal: `Investigate “${item.text}” for at least 15 minutes, then save what you learned.` } : null;
    }
    if (role === "explain-it-back") {
      const source = latestLearningSource();
      return source ? { label: source.label, goal: `Write 3 short takeaways in your own words about ${source.label}.` } : null;
    }
    if (role === "craft-session") {
      const craft = currentCraftAdventure();
      if (!craft) return null;
      return { label: craft.name, goal: `Work on ${craft.name} for at least 20 minutes${craft.nextAction ? ` — next: ${craft.nextAction}` : ""}.` };
    }
    if (role === "bunpro-reviews" && model().bunpro.reviewsWaiting !== null) return { label: `${model().bunpro.reviewsWaiting} Bunpro reviews waiting` };
    if (role === "bunpro-lesson") return { label: "Bunpro reviews are clear" };
    if (role === "paper-pile") return { label: "A paper/post pile is marked as waiting" };
    if (role === "laundry-cycle") return { label: "Laundry state: needs washing" };
    if (role === "laundry-fold") return { label: "Laundry state: ready to fold" };
    const inspirationContext = window.LifeRPGInspirations?.contextForQuest?.(quest);
    if (inspirationContext) return inspirationContext;
    const sudokuContext = window.LifeRPGSudoku?.contextForQuest?.(quest);
    if (sudokuContext) return sudokuContext;
    return null;
  }

  function interceptQuestCompletion(quest, units, options = {}) {
    if (options.smartBypass) return false;
    if (["new-hairstyle", "makeup-look"].includes(quest?.systemRole)) {
      return Boolean(window.LifeRPGInspirations?.openForQuest?.(quest.id, quest.systemRole));
    }
    if (quest?.systemRole === "sudoku") {
      return Boolean(window.LifeRPGSudoku?.openForQuest?.(quest.id));
    }
    if (quest?.systemRole !== "explain-it-back") return false;
    const source = latestLearningSource();
    if (!source) {
      app.showToast?.("There is no new learning material to explain back yet.");
      return true;
    }
    openNoteDialog({
      mode: "explain",
      questId: quest.id,
      questUnits: units || 1,
      title: "Explain it back",
      source: source.label,
      text: ""
    });
    return true;
  }

  function afterQuestComplete({ quest }) {
    const role = quest?.systemRole;
    if (role === "curiosity-dive") {
      const item = currentCuriosity();
      if (item) {
        item.researchedAt = Date.now();
        app.saveState({ source: "curiosity-researched" });
        window.setTimeout(() => openCuriosityAnswer(item.id), 80);
      }
      return;
    }
    if (role === "bunpro-reviews") {
      model().bunpro = { reviewsWaiting: null, updatedAt: Date.now() };
      app.saveState({ source: "bunpro-reviews-needs-refresh" });
      window.setTimeout(() => app.showToast?.("Bunpro block logged. Update the review count before the planner suggests another Bunpro action."), 80);
      return;
    }
    if (role === "laundry-cycle") {
      model().laundry = { state: "drying", updatedAt: Date.now() };
      app.saveState({ source: "laundry-cycle-complete" });
      render();
      return;
    }
    if (role === "laundry-fold") {
      model().laundry = { state: "none", updatedAt: Date.now() };
      app.saveState({ source: "laundry-fold-complete" });
      render();
    }
  }

  function latestLearningSource() {
    const since = Number(model().curiosity.lastExplainAt || 0);
    const candidates = [];
    const root = app.getState();
    const books = new Map((root.bookLibrary?.items || []).map(book => [book.id, book]));
    (root.bookLibrary?.logs || []).forEach(log => {
      const at = new Date(log.at || log.createdAt || 0).getTime();
      if (!Number.isFinite(at) || at <= since) return;
      const book = books.get(log.bookId);
      if (!book || !["knowledge", "growth", "japanese", "work"].includes(book.role || "fun")) return;
      candidates.push({ at, label: `your recent reading in ${book.title || "a learning book"}` });
    });
    model().curiosity.items.forEach(item => {
      const at = Number(item.resolvedAt || 0);
      if (at > since && item.answer) candidates.push({ at, label: `your Curiosity Dive: ${item.text}` });
    });
    candidates.sort((a, b) => b.at - a.at);
    return candidates[0] || null;
  }

  function currentCraftAdventure() {
    const items = app.getState().sideAdventures?.items || [];
    return items
      .filter(item => item && item.status === "active" && item.kind === "skill" && item.realm === "Hobbies")
      .sort((a, b) => Number(b.lastTouchedAt || b.updatedAt || b.createdAt || 0) - Number(a.lastTouchedAt || a.updatedAt || a.createdAt || 0))[0] || null;
  }

  function laundryReason() {
    return ({ none: "No laundry step waiting", needs_washing: "A load needs washing", drying: "Load is drying", ready_fold: "Dry load ready to fold" })[model().laundry.state] || "Laundry state not ready";
  }

  function questByRole(role) {
    return (app.getQuestCatalog?.() || []).find(quest => quest.systemRole === role) || null;
  }

  function render() {
    if (!els.curiosityList) return;
    const state = model();
    if (els.bunproReviews) els.bunproReviews.value = state.bunpro.reviewsWaiting === null ? "" : String(state.bunpro.reviewsWaiting);
    if (els.paperPile) els.paperPile.checked = Boolean(state.paperPileOpen);
    if (els.laundryState) els.laundryState.value = state.laundry.state;
    if (els.laundryDry) els.laundryDry.classList.toggle("hidden", state.laundry.state !== "drying");

    const open = openCuriosityItems();
    const done = state.curiosity.items.filter(item => item.status === "done").slice(-3).reverse();
    if (els.curiosityCount) els.curiosityCount.textContent = `${open.length} open`;
    if (els.contextHint) {
      const bunpro = state.bunpro.reviewsWaiting === null ? "Bunpro status unknown" : state.bunpro.reviewsWaiting === 0 ? "Bunpro reviews clear" : `${state.bunpro.reviewsWaiting} Bunpro reviews waiting`;
      els.contextHint.textContent = `${bunpro} · ${laundryReason()}${state.paperPileOpen ? " · paper pile waiting" : ""}`;
    }

    if (!open.length && !done.length) {
      els.curiosityList.innerHTML = `<div class="smart-empty-v307"><strong>No questions waiting.</strong><span>Add the thing you keep thinking “I should look that up sometime” about.</span></div>`;
      return;
    }
    const openMarkup = open.map(item => `
      <article class="curiosity-item-v307">
        <div><small>OPEN QUESTION / CONCEPT</small><strong>${esc(item.text)}</strong>${item.researchedAt ? `<span>Researched once · answer still open</span>` : ""}</div>
        <div class="curiosity-actions-v307">
          <button class="primary-button" type="button" data-curiosity-explore="${escAttr(item.id)}">▶ Explore 15m</button>
          <button class="secondary-button" type="button" data-curiosity-answer="${escAttr(item.id)}">Save answer</button>
          <button class="text-button" type="button" data-curiosity-remove="${escAttr(item.id)}">Remove</button>
        </div>
      </article>`).join("");
    const doneMarkup = done.length ? `<details class="curiosity-done-v307"><summary>Recently answered (${done.length})</summary>${done.map(item => `<div><strong>${esc(item.text)}</strong><span>${esc(item.answer)}</span><button class="text-button" type="button" data-curiosity-reopen="${escAttr(item.id)}">Reopen</button></div>`).join("")}</details>` : "";
    els.curiosityList.innerHTML = openMarkup + doneMarkup;
  }

  function makeId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function clean(value) { return String(value || "").trim(); }
  function byId(id) { return document.getElementById(id); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value || ""); }
  function escAttr(value) { return esc(value).replaceAll("`", "&#096;"); }

  window.LifeRPGSmartQuests = {
    availabilityForQuest,
    contextForQuest,
    interceptQuestCompletion,
    afterQuestComplete,
    openCuriosity: () => { app.showView?.("quests"); window.setTimeout(() => byId("curiosityQueuePanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); },
    getOpenCuriosity: () => openCuriosityItems().map(item => ({ ...item })),
    getState: () => JSON.parse(JSON.stringify(model())),
    render
  };
})();
