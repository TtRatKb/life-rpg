(() => {
  "use strict";

  const engine = window.LifeRPGStoryEngine;
  const app = window.LifeRPGApp;

  if (!engine || !app) {
    console.error("Life RPG story modules could not initialize.");
    return;
  }

  const CURRENT_PACK_ID = "SP_002";
  const PROTOTYPE_PACK_ID = "SP_001";

  let pack = null;
  let runtime = null;
  let loadError = null;

  const els = {
    arcTitle: byId("storyArcTitle"),
    arcDescription: byId("storyArcDescription"),
    statusEyebrow: byId("storyStatusEyebrow"),
    progressLabel: byId("storyProgressLabel"),
    progressDots: byId("storyProgressDots"),
    progressHint: byId("storyProgressHint"),
    nextTitle: byId("storyNextTitle"),
    nextBadge: byId("storyNextBadge"),
    nextIcon: byId("storyNextIcon"),
    nextTeaser: byId("storyNextTeaser"),
    energyNeed: byId("storyEnergyNeed"),
    actionButton: byId("storyActionButton"),
    actionHint: byId("storyActionHint"),
    peopleList: byId("storyPeopleList"),
    memoryList: byId("memoryList"),

    readerPage: byId("storyReaderPage"),
    shell: byId("storyReaderShell"),
    close: byId("storyReaderClose"),
    exitSide: byId("storyReaderExitSide"),
    chapterLabel: byId("storyReaderChapterLabel"),
    sceneTitle: byId("storyReaderSceneTitle"),
    location: byId("storyReaderLocation"),
    beatLabel: byId("storyBeatLabel"),
    beatContent: byId("storyBeatContent"),
    choices: byId("storyChoices"),
    advance: byId("storyAdvanceButton"),
    saveStatus: byId("storyReaderSaveStatus"),
    energy: byId("storyReaderEnergy"),
    energySide: byId("storyReaderEnergySide"),
    progressReaderLabel: byId("storyReaderProgressLabel"),
    progressReaderBar: byId("storyReaderProgressBar"),
    visualStage: byId("storyVisualStage"),
    visualBackdrop: byId("storyVisualBackdrop"),
    spriteLeft: byId("storySpriteLeft"),
    spriteRight: byId("storySpriteRight")
  };

  init();

  function byId(id) {
    return document.getElementById(id);
  }

  async function init() {
    bindEvents();
    ensureStoryState();

    try {
      pack = await engine.loadPack();
      migratePrototypeStoryIfNeeded();
      ensurePackState();
    } catch (error) {
      loadError = error;
      console.error(error);
    }

    renderStoryHub();
  }

  function bindEvents() {
    els.actionButton?.addEventListener("click", handleStoryAction);
    els.close?.addEventListener("click", closeReader);
    els.exitSide?.addEventListener("click", closeReader);
    els.advance?.addEventListener("click", advanceReader);

    els.memoryList?.addEventListener("click", event => {
      const button = event.target.closest("[data-replay-scene]");
      if (!button) return;
      openScene(button.dataset.replayScene, { replay: true });
    });

    window.addEventListener("life-rpg:render", () => {
      if (pack) {
        const currentPackId = app.getState().story?.packId;
        if (currentPackId === PROTOTYPE_PACK_ID) {
          migratePrototypeStoryIfNeeded();
        } else if (currentPackId && currentPackId !== CURRENT_PACK_ID) {
          ensurePackState();
        }
      }
      renderStoryHub();
      if (runtime) renderReaderChrome();
    });

    document.addEventListener("keydown", event => {
      if (!runtime || els.readerPage?.classList.contains("hidden")) return;
      if (event.key === "Escape") {
        closeReader();
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && !els.advance?.classList.contains("hidden")) {
        const tag = document.activeElement?.tagName;
        if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
        event.preventDefault();
        advanceReader();
      }
    });
  }

  function ensureStoryState() {
    const state = app.getState();

    state.story = {
      packId: CURRENT_PACK_ID,
      unlockedSceneIds: [],
      completedSceneIds: [],
      choiceSelections: {},
      bonds: {},
      traits: {},
      activeSceneId: null,
      readerStep: 0,
      prototypeMigrated: false,
      ...(state.story || {})
    };

    state.story.unlockedSceneIds = Array.isArray(state.story.unlockedSceneIds) ? state.story.unlockedSceneIds : [];
    state.story.completedSceneIds = Array.isArray(state.story.completedSceneIds) ? state.story.completedSceneIds : [];
    state.story.choiceSelections = state.story.choiceSelections || {};
    state.story.bonds = state.story.bonds || {};
    state.story.traits = state.story.traits || {};
  }

  function migratePrototypeStoryIfNeeded() {
    const state = app.getState();
    if (!state.story || state.story.prototypeMigrated) return;
    if (state.story.packId !== PROTOTYPE_PACK_ID) return;

    // V0.4/V0.5 story content was a non-canon reader prototype. Preserve all
    // real-life resources/logs, but remove the prototype's story-only effects.
    const prototypeFlags = [
      "HOME_SHARED_APARTMENT_ACTIVE",
      "HOUSING_LEAD_EXISTS",
      "HOUSING_VIEWING_ACCEPTED",
      "LOCATION_SHARED_APARTMENT_INTRODUCED",
      "PERSON_A_KNOWN",
      "PERSON_B_KNOWN",
      "PERSON_C_KNOWN",
      "ROOMMATES_MET",
      "SCHOOL_OUTREACH_COMPLETE"
    ];
    prototypeFlags.forEach(key => delete state.flags?.[key]);

    ["CONTACT_A", "CONTACT_B", "CONTACT_C"].forEach(key => delete state.contacts?.[key]);
    if (state.locations) state.locations.sharedApartment = false;

    const oldStory = state.story;
    state.story = {
      packId: CURRENT_PACK_ID,
      unlockedSceneIds: [],
      completedSceneIds: [],
      choiceSelections: {},
      bonds: {},
      traits: {},
      activeSceneId: null,
      readerStep: 0,
      prototypeMigrated: true,
      prototypeSummary: {
        completedCount: Array.isArray(oldStory.completedSceneIds) ? oldStory.completedSceneIds.length : 0,
        migratedAt: new Date().toISOString()
      }
    };

    state.memories = (state.memories || []).filter(id => !["M001", "M002", "M003", "M004"].includes(String(id)) && !String(id).startsWith("MEM_SP1_") && !String(id).startsWith("MEMORY_"));
    app.saveState({ source: "story-reader-v2-migration" });
    app.renderAll();
  }

  function ensurePackState() {
    const state = app.getState();
    if (!pack) return;

    if (state.story.packId !== pack.packId) {
      state.story.packId = pack.packId;
      state.story.unlockedSceneIds = [];
      state.story.completedSceneIds = [];
      state.story.choiceSelections = {};
      state.story.bonds = {};
      state.story.traits = {};
      state.story.activeSceneId = null;
      state.story.readerStep = 0;
    }

    state.story.completedSceneIds = state.story.completedSceneIds.filter(id => Boolean(engine.sceneById(pack, id)));
    state.story.unlockedSceneIds = state.story.unlockedSceneIds.filter(id => Boolean(engine.sceneById(pack, id)));

    if (state.story.activeSceneId && !engine.sceneById(pack, state.story.activeSceneId)) {
      state.story.activeSceneId = null;
      state.story.readerStep = 0;
    }

    app.saveState({ source: "story-pack-ready" });
  }

  function renderStoryHub() {
    if (!els.arcTitle) return;

    if (loadError) {
      els.arcTitle.textContent = "Story pack unavailable";
      els.arcDescription.textContent = "The story file could not be loaded. Open Life RPG through GitHub Pages rather than as a local file.";
      els.actionButton.disabled = true;
      els.actionButton.textContent = "Story unavailable";
      els.nextBadge.textContent = "Error";
      return;
    }

    if (!pack) {
      els.arcTitle.textContent = "Loading story...";
      els.arcDescription.textContent = "Preparing the current story pack.";
      return;
    }

    ensureStoryState();

    const state = app.getState();
    const story = state.story;
    const scenes = engine.orderedScenes(pack);
    const completed = new Set(story.completedSceneIds);
    const next = engine.nextScene(pack, story.completedSceneIds);

    els.arcTitle.textContent = pack.arc?.title || "Main Story";
    els.arcDescription.textContent = pack.arc?.description || "Your story is ready.";
    els.statusEyebrow.textContent = "CURRENT ARC";
    els.progressLabel.textContent = story.completedSceneIds.length
      ? `${story.completedSceneIds.length} chapter${story.completedSceneIds.length === 1 ? "" : "s"} completed`
      : "Story beginning";
    els.progressHint.textContent = next
      ? "Your reading position and choices autosave as you go."
      : "The currently installed story arc is complete. Your state is saved.";

    els.progressDots.innerHTML = scenes.map(scene => {
      const isComplete = completed.has(scene.id);
      const isUnlocked = story.unlockedSceneIds.includes(scene.id);
      const isCurrent = next?.id === scene.id;
      const stateClass = isComplete ? "complete" : isUnlocked ? "unlocked" : isCurrent ? "current" : "locked";
      return `<span class="story-progress-dot ${stateClass}" aria-label="${stateClass}"></span>`;
    }).join("");

    renderNextScene(next);
    renderPeople();
    renderMemories();
  }

  function renderNextScene(scene) {
    const state = app.getState();
    const story = state.story;

    if (!scene) {
      els.nextTitle.textContent = "Current arc complete";
      els.nextBadge.textContent = "Complete";
      els.nextIcon.textContent = "✓";
      els.nextTeaser.textContent = "You have reached the end of the story currently installed in Life RPG.";
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">Choices saved</span><span class="story-energy-pill ready">Memories unlocked</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = "More story coming later";
      els.actionHint.textContent = "Real-life progress can keep accumulating while the story grows.";
      return;
    }

    const unlocked = story.unlockedSceneIds.includes(scene.id);
    const active = story.activeSceneId === scene.id;
    const step = Number(story.readerStep || 0);
    const cost = Number(scene.cost || 0);
    const enoughEnergy = state.storyEnergy >= cost;

    if (unlocked) {
      els.nextTitle.textContent = scene.title;
      els.nextBadge.textContent = active && step > 0 ? "In progress" : "Unlocked";
      els.nextIcon.textContent = active && step > 0 ? "▶" : "✦";
      els.nextTeaser.textContent = active && step > 0
        ? "Continue exactly where you stopped reading."
        : "This chapter is unlocked and ready to read.";
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">✓ Whole chapter unlocked</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = active && step > 0 ? "Continue chapter" : "Read chapter";
      els.actionHint.textContent = "The chapter reads as longer story beats. Choices do not cost extra energy.";
      return;
    }

    const first = Number(scene.order || 0) === 1;
    els.nextTitle.textContent = first ? scene.title : "Next chapter";
    els.nextBadge.textContent = cost === 0 ? "Free" : `${cost} 🔥`;
    els.nextIcon.textContent = first ? "01" : "?";
    els.nextTeaser.textContent = first
      ? "Start at the actual beginning of Luca's ordinary life before anything changes."
      : "The next chapter stays spoiler-free until you unlock it.";

    if (cost === 0) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">No Story Energy required</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = "Begin story";
      els.actionHint.textContent = "The opening chapter is free.";
      return;
    }

    if (enoughEnergy) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">${state.storyEnergy} 🔥 available</span><span class="story-energy-pill">${cost} 🔥 to unlock chapter</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = `Unlock next chapter · ${cost} 🔥`;
      els.actionHint.textContent = "Unlocking pays for the complete chapter. Reading and choices are free after that.";
    } else {
      const missing = Math.max(0, cost - state.storyEnergy);
      els.energyNeed.innerHTML = `<span class="story-energy-pill">${state.storyEnergy} 🔥 available</span><span class="story-energy-pill locked">Need ${missing} more</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = `Need ${missing} more Story Energy`;
      els.actionHint.textContent = "Real-life quests, Recovery and external task clears can all help fund the next chapter.";
    }
  }

  function renderPeople() {
    const state = app.getState();
    const visible = Object.values(pack.people || {}).filter(person => Boolean(state.flags?.[person.revealFlag]));

    if (!visible.length) {
      els.peopleList.innerHTML = `<div class="empty-state compact">For now, Luca's social orbit is still her ordinary life.</div>`;
      return;
    }

    els.peopleList.innerHTML = visible.map(person => `
      <article class="story-person-card ${escapeClass(person.tone || "default")}">
        <span class="story-person-initial">${escapeHtml(person.name?.charAt(0) || "✦")}</span>
        <div>
          <strong>${escapeHtml(person.name)}</strong>
          <small>${escapeHtml(person.role || "Known person")}</small>
        </div>
      </article>
    `).join("");
  }

  function renderMemories() {
    const state = app.getState();
    const completed = state.story.completedSceneIds || [];

    if (!completed.length) {
      els.memoryList.className = "empty-state compact";
      els.memoryList.innerHTML = "Nothing has been added to Memories yet.";
      return;
    }

    els.memoryList.className = "story-memory-list";
    els.memoryList.innerHTML = completed.map(sceneId => {
      const scene = engine.sceneById(pack, sceneId);
      const memory = scene?.memory;
      if (!scene || !memory) return "";

      return `
        <article class="story-memory-card">
          <div class="story-memory-mark">${String(scene.order || 0).padStart(2, "0")}</div>
          <div class="story-memory-copy">
            <small>Memory</small>
            <strong>${escapeHtml(memory.title)}</strong>
            <p>${escapeHtml(memory.subtitle || "")}</p>
          </div>
          <button class="secondary-button" data-replay-scene="${escapeHtml(scene.id)}">Replay</button>
        </article>
      `;
    }).join("");
  }

  function handleStoryAction() {
    if (!pack) return;

    const state = app.getState();
    const next = engine.nextScene(pack, state.story.completedSceneIds);
    if (!next) return;

    if (!state.story.unlockedSceneIds.includes(next.id)) {
      const cost = Number(next.cost || 0);
      if (state.storyEnergy < cost) return;

      state.storyEnergy -= cost;
      state.story.unlockedSceneIds.push(next.id);
      state.story.activeSceneId = next.id;
      state.story.readerStep = 0;
      app.saveState({ source: "story-unlock" });
      app.renderAll();
    }

    openScene(next.id, { replay: false });
  }

  function openScene(sceneId, { replay = false } = {}) {
    const scene = engine.sceneById(pack, sceneId);
    if (!scene) return;

    const state = app.getState();
    if (!replay && !state.story.unlockedSceneIds.includes(sceneId)) return;
    if (replay && !state.story.completedSceneIds.includes(sceneId)) return;

    const sequence = buildSequence(scene);
    const savedStep = !replay && state.story.activeSceneId === sceneId
      ? Math.max(0, Number(state.story.readerStep || 0))
      : 0;

    runtime = {
      sceneId,
      replay,
      scene,
      sequence,
      step: Math.min(savedStep, Math.max(0, sequence.length - 1)),
      finished: false
    };

    if (!replay) {
      state.story.activeSceneId = sceneId;
      state.story.readerStep = runtime.step;
      app.saveState({ source: "story-open" });
    }

    els.readerPage.classList.remove("hidden");
    document.body.classList.add("story-mode-open");
    window.scrollTo({ top: 0, behavior: "instant" });
    renderReaderNode();
  }

  function closeReader() {
    if (!runtime) return;
    els.readerPage.classList.add("hidden");
    document.body.classList.remove("story-mode-open");
    runtime = null;
    renderStoryHub();
  }

  function buildSequence(scene) {
    const state = app.getState();
    const sequence = [];

    for (const node of scene.nodes || []) {
      if (!conditionMatches(node)) continue;
      sequence.push(node);

      if (node.type === "choice") {
        const selectionId = state.story.choiceSelections[choiceKey(scene.id, node.id)];
        const option = (node.options || []).find(item => item.id === selectionId);
        for (const extra of option?.after || []) {
          if (conditionMatches(extra)) sequence.push(extra);
        }
      }
    }

    return sequence;
  }

  function conditionMatches(node) {
    const state = app.getState();
    const traits = state.story?.traits || {};
    const flags = state.flags || {};

    if (node.when?.trait && !traits[node.when.trait]) return false;
    if (node.when?.flag && !flags[node.when.flag]) return false;
    if (node.unless?.trait && traits[node.unless.trait]) return false;
    if (node.unless?.flag && flags[node.unless.flag]) return false;
    return true;
  }

  function renderReaderNode() {
    if (!runtime) return;

    if (runtime.finished) {
      renderFinishedState();
      return;
    }

    if (runtime.step >= runtime.sequence.length) {
      finishScene();
      return;
    }

    const node = runtime.sequence[runtime.step];
    renderReaderChrome();
    applyVisual(node.visual || {});

    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `Continue <span>›</span>`;

    if (node.type === "choice") {
      renderChoiceNode(node);
    } else {
      renderBeatNode(node);
    }
  }

  function renderReaderChrome() {
    if (!runtime) return;
    const state = app.getState();
    const total = Math.max(1, runtime.sequence.length);
    const current = Math.min(total, runtime.step + 1);
    const percent = Math.max(2, Math.min(100, (current / total) * 100));

    els.shell.dataset.mood = runtime.scene.mood || "default";
    els.chapterLabel.textContent = runtime.scene.chapterLabel || `Chapter ${String(runtime.scene.order || 1).padStart(2, "0")}`;
    els.sceneTitle.textContent = runtime.scene.title || "Story";
    els.location.textContent = runtime.scene.location || "Story";
    els.beatLabel.textContent = runtime.finished ? "Complete" : `Part ${current}`;
    els.energy.textContent = state.storyEnergy;
    els.energySide.textContent = state.storyEnergy;
    els.progressReaderLabel.textContent = `${current} / ${total}`;
    els.progressReaderBar.style.width = `${percent}%`;
    els.saveStatus.textContent = runtime.replay ? "Memory replay" : "Autosaved";
  }

  function renderBeatNode(node) {
    els.beatContent.innerHTML = "";

    for (const block of node.content || []) {
      const element = document.createElement(block.kind === "dialogue" ? "div" : "p");

      if (block.kind === "dialogue") {
        element.className = "story-prose-dialogue";
        const speaker = document.createElement("strong");
        speaker.textContent = block.speaker || "Dialogue";
        const text = document.createElement("span");
        text.textContent = block.text || "";
        element.append(speaker, text);
      } else if (block.kind === "thought") {
        element.className = "story-prose-thought";
        element.textContent = block.text || "";
      } else {
        element.className = "story-prose-paragraph";
        element.textContent = block.text || "";
      }

      els.beatContent.appendChild(element);
    }
  }

  function renderChoiceNode(node) {
    const state = app.getState();
    const key = choiceKey(runtime.sceneId, node.id);
    const selectedId = state.story.choiceSelections[key];

    els.beatContent.innerHTML = "";
    const prompt = document.createElement("p");
    prompt.className = "story-choice-prompt";
    prompt.textContent = node.prompt || "Choose a response.";
    els.beatContent.appendChild(prompt);

    els.advance.classList.add("hidden");
    els.choices.classList.remove("hidden");

    if (runtime.replay && selectedId) {
      const selected = (node.options || []).find(option => option.id === selectedId);
      els.choices.innerHTML = `
        <button class="story-choice remembered" type="button" data-choice-replay="true">
          <span>Remembered choice</span>
          <strong>${escapeHtml(selected?.text || "Continue")}</strong>
        </button>
      `;
      els.choices.querySelector("button")?.addEventListener("click", () => {
        runtime.step += 1;
        renderReaderNode();
      });
      return;
    }

    if (selectedId) {
      const selected = (node.options || []).find(option => option.id === selectedId);
      els.choices.innerHTML = `
        <button class="story-choice remembered" type="button">
          <span>Chosen</span>
          <strong>${escapeHtml(selected?.text || "Continue")}</strong>
        </button>
      `;
      els.choices.querySelector("button")?.addEventListener("click", () => {
        runtime.step += 1;
        persistReaderStep();
        renderReaderNode();
      });
      return;
    }

    els.choices.innerHTML = (node.options || []).map(option => `
      <button class="story-choice" type="button" data-choice-id="${escapeHtml(option.id)}">
        ${escapeHtml(option.text)}
      </button>
    `).join("");

    els.choices.querySelectorAll("[data-choice-id]").forEach(button => {
      button.addEventListener("click", () => chooseOption(node, button.dataset.choiceId));
    });
  }

  function chooseOption(node, optionId) {
    if (!runtime || runtime.replay) return;

    const option = (node.options || []).find(item => item.id === optionId);
    if (!option) return;

    const state = app.getState();
    const key = choiceKey(runtime.sceneId, node.id);
    if (state.story.choiceSelections[key]) return;

    state.story.choiceSelections[key] = option.id;
    applyEffects(option.effects || []);

    const extras = (option.after || []).filter(conditionMatches);
    if (extras.length) runtime.sequence.splice(runtime.step + 1, 0, ...extras);

    runtime.step += 1;
    state.story.readerStep = runtime.step;
    app.saveState({ source: "story-choice" });
    app.renderAll();
    renderReaderNode();
  }

  function advanceReader() {
    if (!runtime) return;

    if (runtime.finished) {
      closeReader();
      return;
    }

    runtime.step += 1;
    if (!runtime.replay) persistReaderStep();
    renderReaderNode();
  }

  function persistReaderStep() {
    if (!runtime) return;
    const state = app.getState();
    state.story.readerStep = runtime.step;
    state.story.activeSceneId = runtime.sceneId;
    app.saveState({ source: "story-reading" });
    els.saveStatus.textContent = "Autosaved";
  }

  function finishScene() {
    if (!runtime) return;

    if (runtime.replay) {
      runtime.finished = true;
      renderFinishedState(true);
      return;
    }

    const state = app.getState();
    const scene = runtime.scene;
    const alreadyComplete = state.story.completedSceneIds.includes(scene.id);

    if (!alreadyComplete) {
      applyEffects(scene.onComplete || []);
      state.story.completedSceneIds.push(scene.id);
      if (scene.memory?.id && !state.memories.includes(scene.memory.id)) state.memories.push(scene.memory.id);
    }

    state.story.activeSceneId = null;
    state.story.readerStep = 0;
    app.saveState({ source: "story-complete" });
    app.renderAll();

    runtime.finished = true;
    renderFinishedState(false);
  }

  function renderFinishedState(replay = false) {
    const memory = runtime?.scene?.memory;
    renderReaderChrome();
    hideVisualStage();
    els.beatContent.innerHTML = "";

    const kicker = document.createElement("p");
    kicker.className = "story-completion-kicker";
    kicker.textContent = replay ? "Memory replay complete" : "Chapter complete";

    const title = document.createElement("h2");
    title.className = "story-completion-title";
    title.textContent = replay ? runtime.scene.title : (memory?.title || runtime.scene.title);

    const copy = document.createElement("p");
    copy.className = "story-prose-paragraph";
    copy.textContent = replay
      ? "You have reached the end of this remembered chapter."
      : "Your choices and hidden relationship state have been saved. This chapter is now available in Memories.";

    els.beatContent.append(kicker, title, copy);
    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `${replay ? "Return to Memories" : "Return to Story Hub"} <span>›</span>`;
    els.beatLabel.textContent = "Complete";
    els.progressReaderBar.style.width = "100%";
    els.saveStatus.textContent = replay ? "Replay only" : "Saved";
  }

  function applyEffects(effects) {
    const state = app.getState();

    for (const effect of effects || []) {
      switch (effect.type) {
        case "bond":
          state.story.bonds[effect.key] = Number(state.story.bonds[effect.key] || 0) + Number(effect.delta || 0);
          break;
        case "trait":
          state.story.traits[effect.key] = effect.value ?? true;
          break;
        case "flag":
          state.flags[effect.key] = effect.value ?? true;
          break;
        case "contact":
          state.contacts[effect.key] = effect.value ?? true;
          break;
        case "location":
          state.locations[effect.key] = effect.value ?? true;
          break;
        default:
          break;
      }
    }
  }

  function applyVisual(visual) {
    const characterAssets = pack?.assets?.characters || {};
    const backgroundAssets = pack?.assets?.backgrounds || {};
    const bg = visual?.background ? backgroundAssets[visual.background] : null;
    const characters = Array.isArray(visual?.characters) ? visual.characters : [];

    hideVisualStage();

    let hasVisual = false;
    if (bg?.src) {
      els.visualBackdrop.style.backgroundImage = `url("${String(bg.src).replace(/"/g, "%22")}")`;
      hasVisual = true;
    } else {
      els.visualBackdrop.style.backgroundImage = "none";
    }

    for (const item of characters) {
      const asset = characterAssets?.[item.id]?.[item.expression] || characterAssets?.[item.id]?.default;
      if (!asset?.src) continue;
      const target = item.side === "left" ? els.spriteLeft : els.spriteRight;
      target.innerHTML = `<img src="${escapeHtml(asset.src)}" alt="" />`;
      target.classList.remove("hidden");
      hasVisual = true;
    }

    if (hasVisual) {
      els.visualStage.classList.remove("hidden");
      els.visualStage.setAttribute("aria-hidden", "false");
    }
  }

  function hideVisualStage() {
    els.visualStage?.classList.add("hidden");
    els.visualStage?.setAttribute("aria-hidden", "true");
    [els.spriteLeft, els.spriteRight].forEach(el => {
      if (!el) return;
      el.classList.add("hidden");
      el.innerHTML = "";
    });
  }

  function choiceKey(sceneId, choiceId) {
    return `${sceneId}:${choiceId}`;
  }

  function escapeHtml(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escapeClass(value) {
    return String(value || "").replace(/[^a-z0-9_-]/gi, "");
  }
})();
