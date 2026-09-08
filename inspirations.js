(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const SCHEMA = 1;
  const MAX_ITEMS = 300;
  const TYPES = {
    hairstyle: { icon: "💇", label: "Hairstyles", questRole: "new-hairstyle" },
    makeup: { icon: "💄", label: "Makeup looks", questRole: "makeup-look" }
  };

  const els = {
    panel: byId("inspirationLibraryPanel"),
    grid: byId("inspirationLibraryGrid"),
    hairstyleCount: byId("inspirationHairstyleCount"),
    makeupCount: byId("inspirationMakeupCount"),
    addHair: byId("addHairstyleInspiration"),
    addMakeup: byId("addMakeupInspiration"),
    dialog: byId("inspirationDialog"),
    form: byId("inspirationForm"),
    id: byId("inspirationId"),
    type: byId("inspirationType"),
    url: byId("inspirationUrl"),
    fetch: byId("inspirationFetchMetadata"),
    fetchStatus: byId("inspirationMetadataStatus"),
    title: byId("inspirationTitle"),
    image: byId("inspirationImage"),
    upload: byId("inspirationImageUpload"),
    note: byId("inspirationNote"),
    preview: byId("inspirationPreview"),
    deleteButton: byId("inspirationDelete"),
    close: byId("inspirationClose"),
    tryDialog: byId("inspirationTryDialog"),
    tryClose: byId("inspirationTryClose"),
    tryImage: byId("inspirationTryImage"),
    tryTitle: byId("inspirationTryTitle"),
    trySource: byId("inspirationTrySource"),
    tryNote: byId("inspirationTryNote"),
    tryOpen: byId("inspirationTryOpen"),
    tryComplete: byId("inspirationTryComplete")
  };

  let tryContext = null;
  let uploadData = "";

  init();

  function init() {
    ensureState();
    bindEvents();
    render();
    window.addEventListener("life-rpg:render", render);
  }

  function defaultState() {
    return { schemaVersion: SCHEMA, items: [], assignments: {}, createdAt: Date.now() };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.inspirations || typeof root.inspirations !== "object" || Array.isArray(root.inspirations)) root.inspirations = defaultState();
    const state = root.inspirations;
    state.schemaVersion = SCHEMA;
    if (!Array.isArray(state.items)) state.items = [];
    if (!state.assignments || typeof state.assignments !== "object" || Array.isArray(state.assignments)) state.assignments = {};
    state.items = state.items.filter(item => item && typeof item === "object" && TYPES[item.type]).slice(-MAX_ITEMS);
    state.items.forEach(item => {
      if (!item.id) item.id = makeId("insp");
      if (!item.status || !["want", "tried", "favorite", "not_for_me"].includes(item.status)) item.status = "want";
      item.title = clean(item.title) || "Saved inspiration";
      item.url = clean(item.url);
      item.image = clean(item.image);
      item.note = clean(item.note);
      item.createdAt ||= Date.now();
      item.updatedAt ||= item.createdAt;
    });
    return state;
  }

  function state() { return ensureState(); }

  function persist(source = "inspirations") {
    app.saveState({ source });
    render();
    app.renderAll?.();
    try { window.dispatchEvent(new CustomEvent("life-rpg:inspiration-change", { detail: { source } })); } catch { /* noop */ }
  }

  function bindEvents() {
    els.addHair?.addEventListener("click", () => openEditor(null, "hairstyle"));
    els.addMakeup?.addEventListener("click", () => openEditor(null, "makeup"));
    els.close?.addEventListener("click", closeEditor);
    els.form?.addEventListener("submit", saveEditor);
    els.fetch?.addEventListener("click", fetchEditorMetadata);
    els.upload?.addEventListener("change", handleUpload);
    [els.url, els.title, els.image, els.note].forEach(input => input?.addEventListener("input", renderEditorPreview));
    els.deleteButton?.addEventListener("click", deleteEditorItem);

    els.grid?.addEventListener("click", event => {
      const edit = event.target.closest?.("[data-inspiration-edit]");
      if (edit) return openEditor(edit.dataset.inspirationEdit);
      const statusButton = event.target.closest?.("[data-inspiration-status]");
      if (statusButton) return setStatus(statusButton.dataset.inspirationId, statusButton.dataset.inspirationStatus);
      const tryButton = event.target.closest?.("[data-inspiration-try]");
      if (tryButton) return openTryById(tryButton.dataset.inspirationTry, "");
    });

    els.tryClose?.addEventListener("click", closeTry);
    els.tryComplete?.addEventListener("click", completeTry);
  }

  function openEditor(id = null, presetType = "hairstyle") {
    if (!els.dialog || !els.form) return;
    const item = id ? state().items.find(entry => entry.id === id) : null;
    els.form.reset();
    uploadData = "";
    if (els.id) els.id.value = item?.id || "";
    if (els.type) els.type.value = item?.type || presetType;
    if (els.url) els.url.value = item?.url || "";
    if (els.title) els.title.value = item?.title || "";
    if (els.image) els.image.value = item?.image?.startsWith("data:") ? "" : (item?.image || "");
    uploadData = item?.image?.startsWith("data:") ? item.image : "";
    if (els.note) els.note.value = item?.note || "";
    if (els.deleteButton) els.deleteButton.classList.toggle("hidden", !item);
    if (els.fetchStatus) els.fetchStatus.textContent = "Paste a link and Life RPG will try to pull the useful bits for you.";
    renderEditorPreview();
    els.dialog.showModal();
    window.setTimeout(() => (els.url || els.title)?.focus(), 30);
  }

  function closeEditor() { if (els.dialog?.open) els.dialog.close(); }

  function saveEditor(event) {
    event.preventDefault();
    const type = TYPES[els.type?.value] ? els.type.value : "hairstyle";
    const title = clean(els.title?.value) || titleFromUrl(els.url?.value) || `${TYPES[type].label} inspiration`;
    const current = state();
    const existing = current.items.find(item => item.id === els.id?.value);
    const item = existing || { id: makeId("insp"), status: "want", createdAt: Date.now() };
    item.type = type;
    item.url = normalizeUrl(els.url?.value);
    item.title = title;
    item.image = uploadData || normalizeUrl(els.image?.value);
    item.note = clean(els.note?.value);
    item.updatedAt = Date.now();
    if (!existing) current.items.push(item);
    closeEditor();
    persist(existing ? "inspiration-edit" : "inspiration-add");
    app.showToast?.(`${TYPES[type].icon} Saved to ${TYPES[type].label}`);
  }

  function deleteEditorItem() {
    const id = els.id?.value;
    const item = state().items.find(entry => entry.id === id);
    if (!item) return;
    if (!window.confirm(`Remove “${item.title}” from your inspiration library?`)) return;
    state().items = state().items.filter(entry => entry.id !== id);
    Object.values(state().assignments).forEach(day => {
      Object.keys(day || {}).forEach(key => { if (day[key] === id) delete day[key]; });
    });
    closeEditor();
    persist("inspiration-delete");
  }

  async function fetchEditorMetadata() {
    const url = normalizeUrl(els.url?.value);
    if (!url) return app.showToast?.("Paste a link first.");
    if (els.fetchStatus) els.fetchStatus.textContent = "Looking up the link…";
    try {
      const metadata = await fetchLinkMetadata(url);
      if (metadata.title && !clean(els.title?.value)) els.title.value = metadata.title;
      if (metadata.image && !uploadData && !clean(els.image?.value)) els.image.value = metadata.image;
      if (metadata.description && !clean(els.note?.value)) els.note.value = metadata.description.slice(0, 500);
      if (els.fetchStatus) els.fetchStatus.textContent = metadata.enriched ? "Found preview details ✨" : "Saved the link. This site did not expose a full preview, so you can leave the rest blank or add only what you want.";
    } catch {
      if (els.fetchStatus) els.fetchStatus.textContent = "The site blocked automatic preview details. The link still works; everything else stays optional.";
    }
    renderEditorPreview();
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      uploadData = await compressImage(file, 900, 0.82);
      renderEditorPreview();
      app.showToast?.("Preview image added");
    } catch {
      app.showToast?.("That image could not be prepared.");
    }
  }

  function renderEditorPreview() {
    if (!els.preview) return;
    const type = TYPES[els.type?.value] || TYPES.hairstyle;
    const image = uploadData || normalizeUrl(els.image?.value);
    const title = clean(els.title?.value) || titleFromUrl(els.url?.value) || "Your saved inspiration";
    const source = hostname(els.url?.value);
    els.preview.innerHTML = `<article class="inspiration-preview-card-v310">${image ? `<img src="${escAttr(image)}" alt="" />` : `<span class="inspiration-placeholder-v310">${type.icon}</span>`}<div><small>${esc(type.label.toUpperCase())}${source ? ` · ${esc(source)}` : ""}</small><strong>${esc(title)}</strong><p>${esc(clean(els.note?.value) || "No extra typing required.")}</p></div></article>`;
  }

  function setStatus(id, status) {
    const item = state().items.find(entry => entry.id === id);
    if (!item || !["want", "tried", "favorite", "not_for_me"].includes(status)) return;
    item.status = status;
    if (["tried", "favorite", "not_for_me"].includes(status) && !item.triedAt) item.triedAt = Date.now();
    item.updatedAt = Date.now();
    persist("inspiration-status");
  }

  function availableItems(type) {
    return state().items.filter(item => item.type === type && item.status === "want");
  }

  function assignmentFor(type, date = todayKey()) {
    const current = state();
    current.assignments[date] ||= {};
    const assignedId = current.assignments[date][type];
    const assigned = current.items.find(item => item.id === assignedId && item.type === type && item.status === "want");
    if (assigned) return assigned;
    const candidates = availableItems(type).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    if (!candidates.length) return null;
    const index = Math.floor(seeded(`${date}|${type}|inspiration`) * candidates.length);
    const picked = candidates[index] || candidates[0];
    current.assignments[date][type] = picked.id;
    app.saveState({ source: "inspiration-assignment" });
    return picked;
  }

  function availabilityForQuest(quest) {
    const type = typeForRole(quest?.systemRole);
    if (!type) return null;
    const count = availableItems(type).length;
    return count > 0
      ? { available: true, reason: `${count} untried ${TYPES[type].label.toLowerCase()} saved` }
      : { available: false, reason: `Save an untried ${type === "hairstyle" ? "hairstyle" : "makeup look"} first` };
  }

  function contextForQuest(quest) {
    const type = typeForRole(quest?.systemRole);
    if (!type) return null;
    const item = assignmentFor(type);
    if (!item) return null;
    return {
      label: item.title,
      goal: `Try “${item.title}”. It counts when you genuinely attempt the look — it does not have to be perfect.`,
      image: item.image || "",
      url: item.url || "",
      inspirationId: item.id,
      inspirationType: type
    };
  }

  function openForQuest(questId, role) {
    const type = typeForRole(role) || typeForRole(app.getQuestById?.(questId)?.systemRole);
    const item = type ? assignmentFor(type) : null;
    if (!item) {
      app.showView?.("quests");
      window.setTimeout(() => els.panel?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      app.showToast?.("Save an inspiration first, then Life RPG can choose one for you.");
      return true;
    }
    openTryById(item.id, questId);
    return true;
  }

  function openTryById(id, questId = "") {
    const item = state().items.find(entry => entry.id === id);
    if (!item || !els.tryDialog) return;
    tryContext = { itemId: item.id, questId };
    if (els.tryTitle) els.tryTitle.textContent = item.title;
    if (els.trySource) els.trySource.textContent = item.url ? `Saved from ${hostname(item.url) || "reference link"}` : TYPES[item.type].label;
    if (els.tryNote) els.tryNote.textContent = item.note || "Try the reference as-is or adapt it to what works for you.";
    if (els.tryImage) {
      els.tryImage.src = item.image || "";
      els.tryImage.classList.toggle("hidden", !item.image);
    }
    if (els.tryOpen) {
      els.tryOpen.href = item.url || "#";
      els.tryOpen.classList.toggle("hidden", !item.url);
    }
    if (els.tryComplete) els.tryComplete.classList.toggle("hidden", !questId);
    els.tryDialog.showModal();
  }

  function closeTry() { if (els.tryDialog?.open) els.tryDialog.close(); tryContext = null; }

  function completeTry() {
    const ctx = tryContext;
    if (!ctx?.itemId || !ctx.questId) return;
    const item = state().items.find(entry => entry.id === ctx.itemId);
    if (!item) return;
    item.status = "tried";
    item.triedAt = Date.now();
    item.updatedAt = item.triedAt;
    app.saveState({ source: "inspiration-tried" });
    const result = app.logQuestProgress?.(ctx.questId, 1, { showOverlay: false, smartBypass: true });
    closeTry();
    render();
    if (result && !result.pending) app.showToast?.(`${TYPES[item.type].icon} Tried · ${item.title}`);
  }

  function render() {
    if (!els.grid) return;
    const items = [...state().items].sort((a, b) => {
      const statusOrder = { want: 0, favorite: 1, tried: 2, not_for_me: 3 };
      return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    });
    const hairOpen = items.filter(item => item.type === "hairstyle" && item.status === "want").length;
    const makeupOpen = items.filter(item => item.type === "makeup" && item.status === "want").length;
    if (els.hairstyleCount) els.hairstyleCount.textContent = `${hairOpen} to try`;
    if (els.makeupCount) els.makeupCount.textContent = `${makeupOpen} to try`;
    if (!items.length) {
      els.grid.innerHTML = `<div class="smart-empty-v307 inspiration-empty-v310"><strong>Nothing saved yet.</strong><span>Paste a Pinterest, TikTok or web link. Life RPG will try to create the card for you.</span></div>`;
      return;
    }
    els.grid.innerHTML = items.map(item => {
      const type = TYPES[item.type];
      const statusLabel = ({ want: "Want to try", tried: "Tried", favorite: "Favorite", not_for_me: "Not for me" })[item.status];
      return `<article class="inspiration-card-v310 status-${escAttr(item.status)}">
        ${item.image ? `<button class="inspiration-card-image-v310" type="button" data-inspiration-try="${escAttr(item.id)}"><img src="${escAttr(item.image)}" alt="" /></button>` : `<button class="inspiration-card-image-v310 placeholder" type="button" data-inspiration-try="${escAttr(item.id)}">${type.icon}</button>`}
        <div class="inspiration-card-copy-v310"><small>${type.icon} ${esc(type.label)} · ${esc(statusLabel)}</small><strong>${esc(item.title)}</strong>${item.url ? `<span>${esc(hostname(item.url))}</span>` : ""}</div>
        <div class="inspiration-card-actions-v310">
          ${item.status === "want" ? `<button class="primary-button" type="button" data-inspiration-try="${escAttr(item.id)}">Open</button>` : ""}
          <button class="secondary-button" type="button" data-inspiration-edit="${escAttr(item.id)}">Edit</button>
          ${item.status !== "favorite" ? `<button class="text-button" type="button" data-inspiration-status="favorite" data-inspiration-id="${escAttr(item.id)}">♡ Favorite</button>` : `<button class="text-button" type="button" data-inspiration-status="tried" data-inspiration-id="${escAttr(item.id)}">Unfavorite</button>`}
          ${item.status !== "want" ? `<button class="text-button" type="button" data-inspiration-status="want" data-inspiration-id="${escAttr(item.id)}">Try again</button>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  async function fetchLinkMetadata(url) {
    const fallback = { title: titleFromUrl(url), description: "", image: "", enriched: false };
    const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return fallback;
    const payload = await response.json();
    const data = payload?.data || {};
    return {
      title: clean(data.title) || fallback.title,
      description: clean(data.description),
      image: clean(data.image?.url),
      enriched: Boolean(data.title || data.image?.url || data.description)
    };
  }

  function compressImage(file, maxSide = 900, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function typeForRole(role) {
    if (role === "new-hairstyle") return "hairstyle";
    if (role === "makeup-look") return "makeup";
    return null;
  }
  function normalizeUrl(value) { const v = clean(value); if (!v) return ""; try { return new URL(v).href; } catch { return ""; } }
  function hostname(value) { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return ""; } }
  function titleFromUrl(value) { try { const url = new URL(value); const bits = url.pathname.split("/").filter(Boolean); return decodeURIComponent(bits.pop() || url.hostname).replace(/[-_]+/g, " ").slice(0, 100); } catch { return ""; } }
  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function seeded(seed) { let h = 2166136261; for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000000) / 1000000; }
  function clean(value) { return String(value || "").trim(); }
  function makeId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function byId(id) { return document.getElementById(id); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value || ""); }
  function escAttr(value) { return esc(value).replaceAll("`", "&#096;"); }

  window.LifeRPGInspirations = {
    availabilityForQuest,
    contextForQuest,
    openForQuest,
    openEditor,
    getSuggested: type => assignmentFor(type),
    getItems: () => state().items.map(item => ({ ...item })),
    render
  };
})();
