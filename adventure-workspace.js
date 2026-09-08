(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const SCHEMA = 1;
  const CHAR_THRESHOLDS = [50, 150, 300, 600];
  const TIER_REWARDS = [
    { xp: 5, coins: 5, storyEnergyBase: 0 },
    { xp: 5, coins: 5, storyEnergyBase: 0.10 },
    { xp: 10, coins: 10, storyEnergyBase: 0.15 },
    { xp: 15, coins: 15, storyEnergyBase: 0.25 }
  ];
  const MAX_IMAGES_PER_PROJECT = 30;

  const els = {
    logForm: byId("adventureLogForm"),
    logPicker: byId("adventureLogPicker"),
    logId: byId("adventureLogId"),
    stepPanel: byId("adventureStepWorkspace"),
    stepType: byId("adventureStepWorkspaceType"),
    stepHint: byId("adventureStepWorkspaceHint"),
    notes: byId("adventureStepNotes"),
    decision: byId("adventureStepDecision"),
    linkInput: byId("adventureStepLinkInput"),
    linkAdd: byId("adventureStepLinkAdd"),
    linkStatus: byId("adventureStepLinkStatus"),
    refs: byId("adventureStepReferences"),
    materialInput: byId("adventureStepMaterialInput"),
    materialAdd: byId("adventureStepMaterialAdd"),
    materials: byId("adventureStepMaterials"),
    imageInput: byId("adventureStepImageInput"),
    images: byId("adventureStepImages"),
    rewardMeter: byId("adventureStepRewardMeter"),

    workspaceDialog: byId("adventureWorkspaceDialog"),
    workspaceClose: byId("adventureWorkspaceClose"),
    workspaceTitle: byId("adventureWorkspaceTitle"),
    workspaceForm: byId("adventureWorkspaceForm"),
    workspaceId: byId("adventureWorkspaceId"),
    workspaceNotes: byId("adventureWorkspaceNotes"),
    workspaceRefs: byId("adventureWorkspaceReferences"),
    workspaceMaterials: byId("adventureWorkspaceMaterials"),
    workspaceDecisions: byId("adventureWorkspaceDecisions"),
    workspaceImages: byId("adventureWorkspaceImages"),
    workspaceStepNotes: byId("adventureWorkspaceStepNotes"),
    workspaceLinkInput: byId("adventureWorkspaceLinkInput"),
    workspaceLinkAdd: byId("adventureWorkspaceLinkAdd"),
    workspaceMaterialInput: byId("adventureWorkspaceMaterialInput"),
    workspaceMaterialAdd: byId("adventureWorkspaceMaterialAdd")
  };

  let draft = emptyOutput();
  let draftAdventureId = "";
  let draftStepId = "";

  init();

  function init() {
    const changed = ensureAll();
    bindEvents();
    if (changed) app.saveState({ source: "adventure-workspace-init" });
    window.addEventListener("life-rpg:render", () => ensureAll());
    window.addEventListener("life-rpg:adventure-change", () => ensureAll());
  }

  function emptyWorkspace() {
    return { schemaVersion: SCHEMA, notes: "", references: [], images: [], materials: [], decisions: [], updatedAt: Date.now() };
  }

  function emptyOutput() {
    return { notes: "", decision: "", references: [], images: [], materials: [], rewardedTier: 0, rewardEventIds: [], updatedAt: Date.now() };
  }

  function ensureAll() {
    const items = app.getState().sideAdventures?.items;
    if (!Array.isArray(items)) return false;
    let changed = false;
    items.forEach(item => {
      if (!item.workspace || typeof item.workspace !== "object" || Array.isArray(item.workspace)) { item.workspace = emptyWorkspace(); changed = true; }
      const w = item.workspace;
      w.schemaVersion = SCHEMA;
      if (typeof w.notes !== "string") { w.notes = ""; changed = true; }
      ["references", "images", "materials", "decisions"].forEach(key => { if (!Array.isArray(w[key])) { w[key] = []; changed = true; } });
      if (w.images.length > MAX_IMAGES_PER_PROJECT) { w.images = w.images.slice(-MAX_IMAGES_PER_PROJECT); changed = true; }
      if (Array.isArray(item.roadmap)) item.roadmap.forEach(step => {
        if (!step.output || typeof step.output !== "object" || Array.isArray(step.output)) { step.output = emptyOutput(); changed = true; }
        const out = step.output;
        if (typeof out.notes !== "string") { out.notes = ""; changed = true; }
        if (typeof out.decision !== "string") { out.decision = ""; changed = true; }
        ["references", "images", "materials", "rewardEventIds"].forEach(key => { if (!Array.isArray(out[key])) { out[key] = []; changed = true; } });
        out.rewardedTier = Math.max(0, Math.min(4, Number(out.rewardedTier || 0)));
      });
    });
    return changed;
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const workspace = event.target.closest?.("[data-adventure-workspace]");
      if (workspace) return openWorkspace(workspace.dataset.adventureWorkspace);
      const log = event.target.closest?.("[data-adventure-log], [data-daily-adventure-log]");
      if (log) window.setTimeout(prepareLogDraft, 0);
      const removeRef = event.target.closest?.("[data-step-ref-remove]");
      if (removeRef) { draft.references = draft.references.filter(ref => ref.id !== removeRef.dataset.stepRefRemove); return renderDraft(); }
      const removeMaterial = event.target.closest?.("[data-step-material-remove]");
      if (removeMaterial) { draft.materials = draft.materials.filter(material => material.id !== removeMaterial.dataset.stepMaterialRemove); return renderDraft(); }
      const removeImage = event.target.closest?.("[data-step-image-remove]");
      if (removeImage) { draft.images = draft.images.filter(image => image.id !== removeImage.dataset.stepImageRemove); return renderDraft(); }
    });

    els.logPicker?.addEventListener("change", () => window.setTimeout(prepareLogDraft, 0));
    els.notes?.addEventListener("input", () => { draft.notes = String(els.notes.value || ""); renderRewardMeter(); });
    els.decision?.addEventListener("input", () => { draft.decision = String(els.decision.value || ""); renderRewardMeter(); });
    els.linkAdd?.addEventListener("click", addDraftReference);
    els.materialAdd?.addEventListener("click", addDraftMaterial);
    els.imageInput?.addEventListener("change", addDraftImages);
    els.logForm?.addEventListener("submit", captureLogOutput, true);

    els.workspaceClose?.addEventListener("click", closeWorkspace);
    els.workspaceForm?.addEventListener("submit", saveWorkspace);
    els.workspaceLinkAdd?.addEventListener("click", addWorkspaceReference);
    els.workspaceMaterialAdd?.addEventListener("click", addWorkspaceMaterial);
    els.workspaceMaterials?.addEventListener("change", event => {
      const select = event.target.closest?.("[data-workspace-material-status]");
      if (!select) return;
      const item = getAdventure(els.workspaceId?.value);
      const material = item?.workspace?.materials?.find(entry => entry.id === select.dataset.workspaceMaterialStatus);
      if (!material) return;
      material.status = select.value;
      material.updatedAt = Date.now();
      item.workspace.updatedAt = Date.now();
      app.saveState({ source: "adventure-material-status" });
      renderWorkspace(item);
      app.renderAll?.();
    });
  }

  function getAdventure(id) {
    return (app.getState().sideAdventures?.items || []).find(item => item?.id === id) || null;
  }

  function currentPendingStep(item) {
    return Array.isArray(item?.roadmap) ? item.roadmap.find(step => step.status === "pending") || null : null;
  }

  function prepareLogDraft() {
    ensureAll();
    const id = els.logId?.value || els.logPicker?.value || "";
    const item = getAdventure(id);
    const step = currentPendingStep(item);
    draftAdventureId = item?.id || "";
    draftStepId = step?.id || "";
    if (!item || !step) {
      draft = emptyOutput();
      els.stepPanel?.classList.add("hidden");
      return;
    }
    draft = deepClone(step.output || emptyOutput());
    if (els.notes) els.notes.value = draft.notes || "";
    if (els.decision) els.decision.value = draft.decision || "";
    if (els.stepType) els.stepType.textContent = `${stepTypeIcon(step.type)} ${stepTypeLabel(step.type)}`;
    if (els.stepHint) els.stepHint.textContent = stepOutputHint(step);
    if (els.linkInput) els.linkInput.value = "";
    if (els.materialInput) els.materialInput.value = "";
    if (els.linkStatus) els.linkStatus.textContent = "Paste a useful link — title and thumbnail are fetched when possible.";
    els.stepPanel?.classList.remove("hidden");
    renderDraft();
  }

  function renderDraft() {
    if (els.refs) {
      els.refs.innerHTML = draft.references.length ? draft.references.map(ref => `<article class="workspace-ref-chip-v310">${ref.image ? `<img src="${escAttr(ref.image)}" alt="" loading="lazy" decoding="async" />` : `<span>🔗</span>`}<div><strong>${esc(ref.title || hostname(ref.url) || "Reference")}</strong><small>${esc(hostname(ref.url))}</small></div><button type="button" class="text-button" data-step-ref-remove="${escAttr(ref.id)}">×</button></article>`).join("") : `<small class="workspace-empty-inline-v310">No links saved for this step yet.</small>`;
    }
    if (els.materials) {
      els.materials.innerHTML = draft.materials.length ? draft.materials.map(material => `<span class="workspace-material-chip-v310">🛒 ${esc(material.name)}<button type="button" data-step-material-remove="${escAttr(material.id)}">×</button></span>`).join("") : `<small class="workspace-empty-inline-v310">No materials added yet.</small>`;
    }
    if (els.images) {
      els.images.innerHTML = draft.images.length ? draft.images.map(image => `<figure class="workspace-image-chip-v310"><img src="${escAttr(image.data)}" alt="" loading="lazy" decoding="async" /><button type="button" data-step-image-remove="${escAttr(image.id)}">×</button></figure>`).join("") : `<small class="workspace-empty-inline-v310">No screenshots/images added.</small>`;
    }
    renderRewardMeter();
  }

  async function addDraftReference() {
    const url = normalizeUrl(els.linkInput?.value);
    if (!url) return app.showToast?.("Paste a valid link first.");
    if (draft.references.some(ref => ref.url === url)) return app.showToast?.("That link is already attached to this step.");
    const ref = { id: makeId("ref"), url, title: hostname(url) || "Reference", description: "", image: "", createdAt: Date.now() };
    draft.references.push(ref);
    if (els.linkInput) els.linkInput.value = "";
    if (els.linkStatus) els.linkStatus.textContent = "Saved. Looking for a preview…";
    renderDraft();
    try {
      const meta = await fetchLinkMetadata(url);
      Object.assign(ref, meta);
      if (els.linkStatus) els.linkStatus.textContent = meta.enriched ? "Preview found ✨" : "Link saved. This site did not expose a full preview.";
    } catch {
      if (els.linkStatus) els.linkStatus.textContent = "Link saved. Automatic preview was blocked by the source.";
    }
    renderDraft();
  }

  function addDraftMaterial() {
    const name = clean(els.materialInput?.value);
    if (!name) return;
    if (!draft.materials.some(material => normalize(material.name) === normalize(name))) draft.materials.push({ id: makeId("mat"), name, status: "need", url: "", createdAt: Date.now() });
    if (els.materialInput) els.materialInput.value = "";
    renderDraft();
  }

  async function addDraftImages(event) {
    const files = [...(event.target.files || [])].slice(0, 6);
    for (const file of files) {
      try {
        const data = await compressImage(file, 1000, 0.82);
        draft.images.push({ id: makeId("img"), name: file.name || "Reference image", data, createdAt: Date.now() });
      } catch { /* skip unreadable */ }
    }
    if (event.target) event.target.value = "";
    renderDraft();
  }

  function captureLogOutput() {
    const item = getAdventure(draftAdventureId || els.logId?.value || els.logPicker?.value);
    const step = item?.roadmap?.find(entry => entry.id === draftStepId) || currentPendingStep(item);
    if (!item || !step || step.status !== "pending") return;
    draft.notes = String(els.notes?.value || draft.notes || "").trim();
    draft.decision = String(els.decision?.value || draft.decision || "").trim();
    draft.updatedAt = Date.now();
    const previousTier = Math.max(0, Number(step.output?.rewardedTier || 0));
    step.output = deepClone(draft);
    step.output.rewardedTier = previousTier;
    step.output.rewardEventIds ||= [];
    aggregateOutput(item, step);
    const tier = outputTier(step.output);
    const rewards = awardNewOutputTiers(item, step, previousTier, tier);
    step.output.rewardedTier = Math.max(previousTier, tier);
    item.workspace.updatedAt = Date.now();
    item.updatedAt = Date.now();
    if (rewardHasValue(rewards)) app.showToast?.(`Project notes saved · ${rewardSummary(rewards)}`);
  }

  function aggregateOutput(item, step) {
    const workspace = item.workspace || (item.workspace = emptyWorkspace());
    (step.output.references || []).forEach(ref => {
      const existing = workspace.references.find(entry => entry.url === ref.url);
      if (existing) Object.assign(existing, ref, { sourceStepId: step.id });
      else workspace.references.push({ ...ref, sourceStepId: step.id });
    });
    (step.output.images || []).forEach(image => {
      if (!workspace.images.some(entry => entry.id === image.id)) workspace.images.push({ ...image, sourceStepId: step.id });
    });
    (step.output.materials || []).forEach(material => {
      const existing = workspace.materials.find(entry => normalize(entry.name) === normalize(material.name));
      if (existing) {
        if (!existing.url && material.url) existing.url = material.url;
      } else workspace.materials.push({ ...material, status: material.status || "need", sourceStepId: step.id });
    });
    if (step.output.decision) {
      const exists = workspace.decisions.some(entry => entry.sourceStepId === step.id && entry.text === step.output.decision);
      if (!exists) workspace.decisions.push({ id: makeId("decision"), text: step.output.decision, sourceStepId: step.id, createdAt: Date.now() });
    }
    if (workspace.images.length > MAX_IMAGES_PER_PROJECT) workspace.images = workspace.images.slice(-MAX_IMAGES_PER_PROJECT);
  }

  function outputMetrics(output = draft) {
    const chars = clean(output.notes).length + clean(output.decision).length;
    const charTier = CHAR_THRESHOLDS.filter(value => chars >= value).length;
    const extraScore = Math.min(2, output.references?.length || 0) + Math.min(1, output.images?.length || 0) + Math.min(2, output.materials?.length || 0) + (clean(output.decision) ? 1 : 0);
    const score = charTier + extraScore;
    const tier = score >= 7 ? 4 : score >= 5 ? 3 : score >= 3 ? 2 : score >= 1 ? 1 : 0;
    return { chars, charTier, extraScore, score, tier };
  }

  function outputTier(output) { return outputMetrics(output).tier; }

  function renderRewardMeter() {
    if (!els.rewardMeter || els.stepPanel?.classList.contains("hidden")) return;
    const m = outputMetrics(draft);
    const nextChar = CHAR_THRESHOLDS.find(value => m.chars < value);
    const nextTier = Math.min(4, m.tier + 1);
    const reward = nextTier ? TIER_REWARDS[nextTier - 1] : null;
    const extras = (draft.references?.length || 0) + (draft.images?.length || 0) + (draft.materials?.length || 0) + (clean(draft.decision) ? 1 : 0);
    const nextCopy = m.tier >= 4
      ? "Maximum documentation bonus reached for this step."
      : `${nextChar ? `${nextChar - m.chars} characters to the next writing threshold` : "Writing thresholds complete"}${extras ? ` · ${extras} useful extra${extras === 1 ? "" : "s"} attached` : " · links, images, materials and decisions also count"}`;
    els.rewardMeter.innerHTML = `<div class="workspace-reward-head-v310"><span><b>${m.chars}</b> characters · <b>${extras}</b> useful extras</span><em>Depth ${m.tier}/4</em></div><i><b style="width:${Math.min(100, m.tier * 25 + Math.min(24, Math.round((m.chars / (nextChar || 600)) * 24)))}%"></b></i><div><strong>${esc(nextCopy)}</strong>${reward && m.tier < 4 ? `<span>Next depth reward: +${reward.xp} XP · +${reward.coins} 🪙${reward.storyEnergyBase ? ` · +${reward.storyEnergyBase} 🔥 base` : ""}</span>` : `<span>More detail can still help future-you even after the reward cap.</span>`}</div>`;
  }

  function awardNewOutputTiers(item, step, previousTier, tier) {
    const total = { xp: 0, coins: 0, storyEnergy: 0 };
    for (let i = previousTier + 1; i <= tier; i += 1) {
      const spec = TIER_REWARDS[i - 1];
      const sourceId = `${item.id}:${step.id}:depth-${i}`;
      const already = (app.getState().rewardLedger?.events || []).some(event => event?.source === "adventure-output" && event.sourceId === sourceId);
      if (already) continue;
      const reward = app.awardActivity?.({
        source: "adventure-output",
        sourceId,
        label: `${item.name} · documented step`,
        realm: item.realm || "Hobbies",
        capability: app.inferCapability?.({ realm: item.realm, label: `${item.name} notes`, kind: item.kind }) || "creativity",
        xp: spec.xp,
        realmXP: Math.max(0, Math.round(spec.xp * 0.5)),
        statXP: Math.max(0, Math.round(spec.xp * 0.5)),
        coins: spec.coins,
        storyEnergyBase: spec.storyEnergyBase,
        progressionRelevant: true,
        metadata: { adventureId: item.id, roadmapStepId: step.id, outputDepth: i, outputCharacters: outputMetrics(step.output).chars }
      });
      if (reward?.eventId) step.output.rewardEventIds.push(reward.eventId);
      total.xp += Number(reward?.xp || 0);
      total.coins += Number(reward?.coins || 0);
      total.storyEnergy += Number(reward?.storyEnergy || 0);
    }
    return total;
  }

  function openWorkspace(id) {
    ensureAll();
    const item = getAdventure(id);
    if (!item || !els.workspaceDialog) return;
    if (els.workspaceId) els.workspaceId.value = item.id;
    if (els.workspaceTitle) els.workspaceTitle.textContent = item.name;
    if (els.workspaceNotes) els.workspaceNotes.value = item.workspace.notes || "";
    if (els.workspaceLinkInput) els.workspaceLinkInput.value = "";
    if (els.workspaceMaterialInput) els.workspaceMaterialInput.value = "";
    renderWorkspace(item);
    els.workspaceDialog.showModal();
  }

  function closeWorkspace() { if (els.workspaceDialog?.open) els.workspaceDialog.close(); }

  function saveWorkspace(event) {
    event.preventDefault();
    const item = getAdventure(els.workspaceId?.value);
    if (!item) return;
    item.workspace.notes = String(els.workspaceNotes?.value || "").trim();
    item.workspace.updatedAt = Date.now();
    item.updatedAt = Date.now();
    app.saveState({ source: "adventure-workspace-save" });
    closeWorkspace();
    app.renderAll?.();
    app.showToast?.("Project workspace saved");
  }

  function renderWorkspace(item) {
    if (!item) return;
    const w = item.workspace;
    if (els.workspaceRefs) els.workspaceRefs.innerHTML = w.references.length ? w.references.map(ref => `<article class="workspace-reference-card-v310">${ref.image ? `<img src="${escAttr(ref.image)}" alt="" loading="lazy" decoding="async" />` : `<span>🔗</span>`}<div><strong>${esc(ref.title || hostname(ref.url) || "Reference")}</strong><small>${esc(hostname(ref.url))}</small>${ref.description ? `<p>${esc(ref.description.slice(0, 180))}</p>` : ""}</div><a class="secondary-button" href="${escAttr(ref.url)}" target="_blank" rel="noopener">Open ↗</a></article>`).join("") : `<div class="workspace-empty-v310">No references saved yet.</div>`;
    if (els.workspaceMaterials) els.workspaceMaterials.innerHTML = w.materials.length ? w.materials.map(material => `<article class="workspace-material-row-v310"><div><strong>${esc(material.name)}</strong>${material.url ? `<a href="${escAttr(material.url)}" target="_blank" rel="noopener">Product link ↗</a>` : ""}</div><select data-workspace-material-status="${escAttr(material.id)}"><option value="need" ${material.status === "need" ? "selected" : ""}>Need</option><option value="ordered" ${material.status === "ordered" ? "selected" : ""}>Ordered</option><option value="have" ${material.status === "have" ? "selected" : ""}>Already have</option><option value="bought" ${material.status === "bought" ? "selected" : ""}>Bought</option></select></article>`).join("") : `<div class="workspace-empty-v310">No materials saved yet.</div>`;
    if (els.workspaceDecisions) els.workspaceDecisions.innerHTML = w.decisions.length ? w.decisions.slice().reverse().map(decision => `<article class="workspace-decision-v310"><span>✓</span><p>${esc(decision.text)}</p></article>`).join("") : `<div class="workspace-empty-v310">No project decisions saved yet.</div>`;
    if (els.workspaceImages) els.workspaceImages.innerHTML = w.images.length ? w.images.map(image => `<figure class="workspace-gallery-image-v310"><img src="${escAttr(image.data)}" alt="${escAttr(image.name || "Project reference")}" loading="lazy" decoding="async" /><figcaption>${esc(image.name || "Reference image")}</figcaption></figure>`).join("") : `<div class="workspace-empty-v310">No images saved yet.</div>`;
    if (els.workspaceStepNotes) {
      const notes = (item.roadmap || []).filter(step => clean(step.output?.notes) || clean(step.output?.decision)).map(step => `<details class="workspace-step-note-v310"><summary><span>${stepTypeIcon(step.type)}</span><strong>${esc(step.label)}</strong></summary>${step.output?.notes ? `<p>${esc(step.output.notes)}</p>` : ""}${step.output?.decision ? `<p><b>Decision:</b> ${esc(step.output.decision)}</p>` : ""}</details>`).join("");
      els.workspaceStepNotes.innerHTML = notes || `<div class="workspace-empty-v310">Step notes will collect here as you work through the roadmap.</div>`;
    }
  }

  async function addWorkspaceReference() {
    const item = getAdventure(els.workspaceId?.value);
    const url = normalizeUrl(els.workspaceLinkInput?.value);
    if (!item || !url) return;
    if (item.workspace.references.some(ref => ref.url === url)) return app.showToast?.("That reference is already saved.");
    const ref = { id: makeId("ref"), url, title: hostname(url) || "Reference", description: "", image: "", createdAt: Date.now() };
    item.workspace.references.push(ref);
    if (els.workspaceLinkInput) els.workspaceLinkInput.value = "";
    app.saveState({ source: "adventure-workspace-reference" });
    renderWorkspace(item);
    try { Object.assign(ref, await fetchLinkMetadata(url)); app.saveState({ source: "adventure-workspace-reference-meta" }); renderWorkspace(item); } catch { /* link remains useful */ }
  }

  function addWorkspaceMaterial() {
    const item = getAdventure(els.workspaceId?.value);
    const name = clean(els.workspaceMaterialInput?.value);
    if (!item || !name) return;
    if (!item.workspace.materials.some(material => normalize(material.name) === normalize(name))) item.workspace.materials.push({ id: makeId("mat"), name, status: "need", url: "", createdAt: Date.now() });
    if (els.workspaceMaterialInput) els.workspaceMaterialInput.value = "";
    app.saveState({ source: "adventure-workspace-material" });
    renderWorkspace(item);
  }

  function contextForItem(itemOrId) {
    const item = typeof itemOrId === "string" ? getAdventure(itemOrId) : itemOrId;
    if (!item) return null;
    ensureAll();
    const step = currentPendingStep(item);
    const missing = (item.workspace?.materials || []).filter(material => ["need", "ordered"].includes(material.status)).slice(0, 4);
    const refs = item.workspace?.references || [];
    const decisions = item.workspace?.decisions || [];
    const bits = [];
    if (missing.length) bits.push(`Materials: ${missing.map(material => material.name).join(", ")}`);
    if (refs.length) bits.push(`${refs.length} saved reference${refs.length === 1 ? "" : "s"}`);
    if (decisions.length) bits.push(`Latest decision: ${decisions.at(-1).text}`);
    return { stepType: step?.type || "", summary: bits.join(" · "), references: refs.slice(-3), materials: missing };
  }

  async function fetchLinkMetadata(url) {
    const fallback = { title: hostname(url) || "Reference", description: "", image: "", enriched: false };
    const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return fallback;
    const data = (await response.json())?.data || {};
    return { title: clean(data.title) || fallback.title, description: clean(data.description), image: clean(data.image?.url), enriched: Boolean(data.title || data.image?.url || data.description) };
  }

  function compressImage(file, maxSide = 1000, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function stepOutputHint(step) {
    if (step.type === "research") return "Save what you found here. Links, screenshots, product names and a real conclusion make the next step much easier.";
    if (step.type === "materials") return "Add the exact materials you identified. They will stay in the project and can be marked Need / Ordered / Have / Bought later.";
    if (step.type === "decision") return "Record the decision so future-you does not have to make it again.";
    if (step.type === "make") return "Notes are optional. Save measurements, references or little discoveries only if they will help the next session.";
    return "Capture anything future-you needs to remember before you call this step done.";
  }
  function stepTypeIcon(type) { return ({ research: "🔎", materials: "🛒", decision: "✓", make: "🧶", finish: "✨" })[type] || "✧"; }
  function stepTypeLabel(type) { return ({ research: "Research output", materials: "Materials", decision: "Decision", make: "Session memory", finish: "Finish notes" })[type] || "Project memory"; }
  function deepClone(value) { try { return JSON.parse(JSON.stringify(value)); } catch { return emptyOutput(); } }
  function normalize(value) { return clean(value).toLowerCase().replace(/\s+/g, " "); }
  function normalizeUrl(value) { const v = clean(value); if (!v) return ""; try { return new URL(v).href; } catch { return ""; } }
  function hostname(value) { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return ""; } }
  function clean(value) { return String(value || "").trim(); }
  function makeId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  function byId(id) { return document.getElementById(id); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value || ""); }
  function escAttr(value) { return esc(value).replaceAll("`", "&#096;"); }
  function rewardHasValue(total) { return Boolean(Number(total.xp || 0) || Number(total.coins || 0) || Number(total.storyEnergy || 0)); }
  function rewardSummary(total) { const parts = []; if (total.xp) parts.push(`+${total.xp} XP`); if (total.storyEnergy) parts.push(`+${app.formatEnergy?.(total.storyEnergy) || total.storyEnergy} 🔥`); if (total.coins) parts.push(`+${total.coins} 🪙`); return parts.join(" · "); }

  window.LifeRPGAdventureWorkspace = {
    openWorkspace,
    contextForItem,
    ensureAll,
    getWorkspace: id => deepClone(getAdventure(id)?.workspace || emptyWorkspace())
  };
})();
