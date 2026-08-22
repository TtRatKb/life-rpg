(() => {
  "use strict";

  const engine = window.LifeRPGStoryEngine;
  const app = window.LifeRPGApp;

  if (!engine || !app) {
    console.error("Life RPG story modules could not initialize.");
    return;
  }

  const CURRENT_PACK_ID = "SP_003";
  const LEGACY_PACK_IDS = new Set(["SP_001", "SP_002"]);

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
    previous: byId("storyPreviousButton"),
    advance: byId("storyAdvanceButton"),
    saveStatus: byId("storyReaderSaveStatus"),
    energy: byId("storyReaderEnergy"),
    energySide: byId("storyReaderEnergySide"),
    progressReaderLabel: byId("storyReaderProgressLabel"),
    progressReaderBar: byId("storyReaderProgressBar"),
    visualStage: byId("storyVisualStage"),
    visualBackdrop: byId("storyVisualBackdrop"),
    spriteLeft: byId("storySpriteLeft"),
    spriteCenter: byId("storySpriteCenter"),
    spriteRight: byId("storySpriteRight"),
    textboxPortrait: byId("storyTextboxPortrait"),
    textboxPortraitImg: byId("storyTextboxPortraitImg")
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
      migrateLegacyStoryIfNeeded();
      ensurePackState();
    } catch (error) {
      loadError = error;
      console.error(error);
    }

    renderStoryHub();
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const action = event.target.closest?.("#storyActionButton");
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      handleStoryAction();
    });
    els.close?.addEventListener("click", closeReader);
    els.exitSide?.addEventListener("click", closeReader);
    els.previous?.addEventListener("click", previousReader);
    els.advance?.addEventListener("click", advanceReader);

    els.memoryList?.addEventListener("click", event => {
      const button = event.target.closest("[data-replay-scene]");
      if (!button) return;
      openScene(button.dataset.replayScene, { replay: true });
    });

    window.addEventListener("life-rpg:render", () => {
      if (pack) {
        migrateLegacyStoryIfNeeded();
        ensurePackState();
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

      if (event.key === "ArrowLeft") {
        const tag = document.activeElement?.tagName;
        if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
        event.preventDefault();
        previousReader();
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && !els.advance?.classList.contains("hidden")) {
        const tag = document.activeElement?.tagName;
        if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
        event.preventDefault();
        advanceReader();
      }
    });
  }

  function ensureStoryState() {
    const state = app.getState();
    const previous = state.story || {};

    state.story = {
      packId: CURRENT_PACK_ID,
      unlockedSceneIds: [],
      completedSceneIds: [],
      choiceSelections: {},
      bonds: {},
      relationships: {},
      traits: {},
      activeSceneId: null,
      readerStep: 0,
      ...previous
    };

    state.story.unlockedSceneIds = array(state.story.unlockedSceneIds);
    state.story.completedSceneIds = array(state.story.completedSceneIds);
    state.story.choiceSelections = object(state.story.choiceSelections);
    state.story.bonds = object(state.story.bonds);
    state.story.relationships = object(state.story.relationships);
    state.story.traits = object(state.story.traits);
  }

  function migrateLegacyStoryIfNeeded() {
    const state = app.getState();
    const oldPackId = state.story?.packId;
    if (!oldPackId || oldPackId === CURRENT_PACK_ID) return;

    if (LEGACY_PACK_IDS.has(oldPackId)) {
      const oldCompleted = array(state.story.completedSceneIds).length;

      // V0.4–V0.6 were story-reader prototypes. Keep real-life progress and
      // currencies, but remove effects created by those obsolete story packs.
      [
        "HOME_SHARED_APARTMENT_ACTIVE",
        "HOUSING_LEAD_EXISTS",
        "HOUSING_VIEWING_ACCEPTED",
        "LOCATION_SHARED_APARTMENT_INTRODUCED",
        "PERSON_A_KNOWN",
        "PERSON_B_KNOWN",
        "PERSON_C_KNOWN",
        "ROOMMATES_MET",
        "SCHOOL_OUTREACH_COMPLETE",
        "STORY_INTRO_COMPLETE",
        "STORY_MET_MINA",
        "STORY_MET_KIRISHIMA",
        "STORY_MET_BAKUGO",
        "STORY_MINA_FRIENDSHIP_STARTED",
        "STORY_MINA_KNOWS_HOUSING",
        "STORY_APARTMENT_VIEWING_PENDING",
        "LOCATION_AGENCY_INTRODUCED"
      ].forEach(key => delete state.flags?.[key]);

      ["mina", "CONTACT_A", "CONTACT_B", "CONTACT_C"].forEach(key => delete state.contacts?.[key]);
      if (state.locations) {
        state.locations.agency = false;
        state.locations.sharedApartment = false;
      }

      state.memories = array(state.memories).filter(id => {
        const value = String(id);
        return !/^MEM_(00[1-5]|SP1_|SP2_)/.test(value) && !value.startsWith("MEMORY_");
      });

      state.story = {
        packId: CURRENT_PACK_ID,
        unlockedSceneIds: [],
        completedSceneIds: [],
        choiceSelections: {},
        bonds: {},
        relationships: {},
        traits: {},
        activeSceneId: null,
        readerStep: 0,
        migratedFrom: oldPackId,
        legacySummary: {
          completedCount: oldCompleted,
          migratedAt: new Date().toISOString()
        }
      };

      app.saveState({ source: "story-v07-migration" });
      app.renderAll();
      return;
    }

    state.story.packId = CURRENT_PACK_ID;
    state.story.unlockedSceneIds = [];
    state.story.completedSceneIds = [];
    state.story.choiceSelections = {};
    state.story.bonds = {};
    state.story.relationships = {};
    state.story.traits = {};
    state.story.activeSceneId = null;
    state.story.readerStep = 0;
    app.saveState({ source: "story-pack-reset" });
  }

  function ensurePackState() {
    const state = app.getState();
    if (!pack) return;

    ensureStoryState();

    if (state.story.packId !== pack.packId) {
      state.story.packId = pack.packId;
      state.story.unlockedSceneIds = [];
      state.story.completedSceneIds = [];
      state.story.choiceSelections = {};
      state.story.bonds = {};
      state.story.relationships = {};
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
    els.progressHint.textContent = "Reading position autosaves. Completed chapters can be replayed from Memories.";

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
      const completedScenes = engine.orderedScenes(pack).filter(item => story.completedSceneIds.includes(item.id));
      const latestCompleted = completedScenes.at(-1) || null;

      els.nextTitle.textContent = "Current arc complete";
      els.nextBadge.textContent = "Complete";
      els.nextIcon.textContent = "✓";
      els.nextTeaser.textContent = "You have reached the end of the story currently installed in Life RPG. Finished chapters remain replayable at any time.";
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">Choices saved</span><span class="story-energy-pill ready">Memories unlocked</span>`;
      els.actionButton.disabled = !latestCompleted;
      els.actionButton.textContent = latestCompleted ? "Replay latest chapter" : "No chapter available";
      els.actionHint.textContent = latestCompleted
        ? "Replay mode is sandboxed: rereading or trying different choices will never overwrite your canon save."
        : "Real-life progress can keep accumulating while the story grows.";
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
      els.actionHint.textContent = "Choices change hidden story state. There is no paid 'correct' answer.";
      return;
    }

    const first = Number(scene.order || 0) === 1;
    els.nextTitle.textContent = first ? scene.title : "Next chapter";
    els.nextBadge.textContent = cost === 0 ? "Free" : `${cost} 🔥`;
    els.nextIcon.textContent = first ? "01" : "?";
    els.nextTeaser.textContent = first
      ? "Start at the beginning of my ordinary life, before anything changes."
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
      els.actionHint.textContent = "Unlocking pays for the complete chapter. Reading, Previous and choices are free after that.";
    } else {
      const missing = Math.max(0, cost - state.storyEnergy);
      els.energyNeed.innerHTML = `<span class="story-energy-pill">${state.storyEnergy} 🔥 available</span><span class="story-energy-pill locked">Need ${missing} more</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = `Need ${missing} more Story Energy`;
      els.actionHint.textContent = "Real-life quests, Recovery and external task clears can fund the next chapter.";
    }
  }

  function renderPeople() {
    const state = app.getState();
    const visible = Object.values(pack.people || {}).filter(person => Boolean(state.flags?.[person.revealFlag]));

    if (!visible.length) {
      els.peopleList.innerHTML = `<div class="empty-state compact">For now, my social orbit is still my ordinary life.</div>`;
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
            <small>Memory · Replay</small>
            <strong>${escapeHtml(memory.title)}</strong>
            <p>${escapeHtml(memory.subtitle || "")}</p>
            <span class="memory-replay-note">Replay choices are sandboxed and never overwrite your canon save.</span>
          </div>
          <button class="secondary-button" data-replay-scene="${escapeHtml(scene.id)}">Replay</button>
        </article>
      `;
    }).join("");
  }

  function handleStoryAction() {
    if (!pack) return;

    try {
      const state = app.getState();
      const next = engine.nextScene(pack, state.story.completedSceneIds);

      if (!next) {
        const completedScenes = engine.orderedScenes(pack).filter(scene => state.story.completedSceneIds.includes(scene.id));
        const latestCompleted = completedScenes.at(-1);
        if (latestCompleted) openScene(latestCompleted.id, { replay: true });
        return;
      }

      if (!state.story.unlockedSceneIds.includes(next.id)) {
        const cost = Number(next.cost || 0);
        if (state.storyEnergy < cost) return;

        state.storyEnergy -= cost;
        state.story.unlockedSceneIds.push(next.id);
        state.story.activeSceneId = next.id;
        state.story.readerStep = 0;
        app.saveState({ source: "story-unlock" });
      }

      // Open first. A later dashboard render must never be able to block Story Mode.
      const opened = openScene(next.id, { replay: false });
      if (!opened) throw new Error("The story reader could not be opened.");

      // Refresh hub/resource chrome after the reader is already visible. If another
      // panel has a rendering problem, the story itself remains usable.
      queueMicrotask(() => {
        try {
          app.renderAll();
        } catch (error) {
          console.error("Non-critical dashboard render failed after opening Story Mode", error);
        }
      });
    } catch (error) {
      console.error("Story start failed", error);
      if (els.actionHint) {
        els.actionHint.textContent = "Story start hit a UI error. Reload once; your save is safe. If this persists, the reader will fall back to text-only mode.";
      }
      if (els.actionButton) els.actionButton.disabled = false;
    }
  }

  function openScene(sceneId, { replay = false } = {}) {
    const scene = engine.sceneById(pack, sceneId);
    if (!scene) return false;

    const state = app.getState();
    if (!replay && !state.story.unlockedSceneIds.includes(sceneId)) return false;
    if (replay && !state.story.completedSceneIds.includes(sceneId)) return false;
    if (!els.readerPage) throw new Error("Story reader markup is missing. Please refresh the updated index.html.");

    runtime = {
      sceneId,
      replay,
      scene,
      replaySelections: {},
      step: 0,
      sequence: [],
      finished: false
    };

    runtime.sequence = buildSequence(runtime);
    const savedStep = !replay && state.story.activeSceneId === sceneId
      ? Math.max(0, Number(state.story.readerStep || 0))
      : 0;
    runtime.step = Math.min(savedStep, Math.max(0, runtime.sequence.length - 1));

    if (!replay) {
      state.story.activeSceneId = sceneId;
      state.story.readerStep = runtime.step;
      app.saveState({ source: "story-open" });
    }

    els.readerPage.classList.remove("hidden");
    document.body.classList.add("story-mode-open");
    window.scrollTo({ top: 0, behavior: "instant" });
    renderReaderNode();
    return true;
  }

  function closeReader() {
    if (!runtime) return;
    els.readerPage.classList.add("hidden");
    document.body.classList.remove("story-mode-open");
    runtime = null;
    renderStoryHub();
  }

  function buildSequence(activeRuntime) {
    const state = app.getState();
    const sequence = [];

    for (const node of activeRuntime.scene.nodes || []) {
      if (!conditionMatches(node)) continue;
      sequence.push(node);

      if (node.type !== "choice") continue;

      const key = choiceKey(activeRuntime.sceneId, node.id);
      const selectionId = activeRuntime.replay
        ? activeRuntime.replaySelections[key]
        : state.story.choiceSelections[key];
      const option = (node.options || []).find(item => item.id === selectionId);

      for (const extra of option?.after || []) {
        if (conditionMatches(extra)) sequence.push(extra);
      }
    }

    return sequence;
  }

  function conditionMatches(node) {
    const state = app.getState();
    const traits = state.story?.traits || {};
    const flags = state.flags || {};
    const relationships = state.story?.relationships || {};

    if (node.when?.trait && !traits[node.when.trait]) return false;
    if (node.when?.traitEquals && traits[node.when.traitEquals.key] !== node.when.traitEquals.value) return false;
    if (node.when?.flag && !flags[node.when.flag]) return false;
    if (node.unless?.trait && traits[node.unless.trait]) return false;
    if (node.unless?.flag && flags[node.unless.flag]) return false;

    if (node.when?.relationship) {
      const requirement = node.when.relationship;
      const value = Number(relationships?.[requirement.key]?.[requirement.stat] || 0);
      if (requirement.min != null && value < Number(requirement.min)) return false;
      if (requirement.max != null && value > Number(requirement.max)) return false;
    }

    return true;
  }

  function renderReaderNode() {
    if (!runtime) return;

    if (runtime.finished) {
      renderFinishedState(runtime.replay);
      return;
    }

    if (runtime.step >= runtime.sequence.length) {
      finishScene();
      return;
    }

    const node = runtime.sequence[runtime.step];
    renderReaderChrome();

    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `Continue <span>›</span>`;

    // Text and choices are the critical layer. Render them before optional art.
    if (node.type === "choice") {
      renderChoiceNode(node);
    } else {
      renderBeatNode(node);
    }

    try {
      applyVisual(node.visual || {});
    } catch (error) {
      console.error("Story visual failed; continuing in text-only mode", error);
      try {
        clearSprites();
        if (els.visualBackdrop) els.visualBackdrop.style.backgroundImage = "none";
        if (els.visualStage) {
          els.visualStage.classList.add("hidden");
          els.visualStage.setAttribute("aria-hidden", "true");
        }
      } catch (_) {
        // Text remains readable even if the optional visual layer is unavailable.
      }
    }
  }

  function renderReaderChrome() {
    if (!runtime) return;
    const state = app.getState();
    const total = Math.max(1, runtime.sequence.length);
    const current = runtime.finished ? total : Math.min(total, runtime.step + 1);
    const percent = runtime.finished ? 100 : Math.max(2, Math.min(100, (current / total) * 100));

    els.shell.dataset.mood = runtime.scene.mood || "default";
    els.shell.dataset.replay = runtime.replay ? "true" : "false";
    els.chapterLabel.textContent = runtime.scene.chapterLabel || `Chapter ${String(runtime.scene.order || 1).padStart(2, "0")}`;
    els.sceneTitle.textContent = runtime.scene.title || "Story";
    els.location.textContent = runtime.scene.location || "Story";
    els.beatLabel.textContent = runtime.finished ? "Complete" : `Scene ${current}`;
    els.energy.textContent = state.storyEnergy;
    els.energySide.textContent = state.storyEnergy;
    els.progressReaderLabel.textContent = `${current} / ${total}`;
    els.progressReaderBar.style.width = `${percent}%`;
    els.saveStatus.textContent = runtime.replay
      ? "Replay mode · choices do not alter canon"
      : "Autosaved to local + cloud";

    if (els.previous) {
      els.previous.disabled = !runtime.finished && runtime.step <= 0;
      els.previous.classList.toggle("hidden", false);
    }
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
    const canonSelectedId = state.story.choiceSelections[key];
    const replaySelectedId = runtime.replaySelections[key];

    els.beatContent.innerHTML = "";
    const prompt = document.createElement("p");
    prompt.className = "story-choice-prompt";
    prompt.textContent = node.prompt || "What do I do?";
    els.beatContent.appendChild(prompt);

    els.advance.classList.add("hidden");
    els.choices.classList.remove("hidden");

    if (!runtime.replay && canonSelectedId) {
      const selected = (node.options || []).find(option => option.id === canonSelectedId);
      els.choices.innerHTML = `
        <button class="story-choice remembered" type="button" data-choice-continue="true">
          <span>Your choice</span>
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

    els.choices.innerHTML = (node.options || []).map(option => {
      const isCanon = runtime.replay && canonSelectedId === option.id;
      const isReplaySelected = runtime.replay && replaySelectedId === option.id;
      return `
        <button class="story-choice ${isReplaySelected ? "replay-selected" : ""}" type="button" data-choice-id="${escapeHtml(option.id)}">
          <span class="story-choice-copy">${escapeHtml(option.text)}</span>
          ${isCanon ? '<small class="choice-canon-mark">Original choice</small>' : ""}
        </button>
      `;
    }).join("");

    els.choices.querySelectorAll("[data-choice-id]").forEach(button => {
      button.addEventListener("click", () => chooseOption(node, button.dataset.choiceId));
    });
  }

  function chooseOption(node, optionId) {
    if (!runtime) return;

    const option = (node.options || []).find(item => item.id === optionId);
    if (!option) return;

    const key = choiceKey(runtime.sceneId, node.id);
    const choiceIndex = runtime.sequence.findIndex(item => item === node || item.id === node.id);

    if (runtime.replay) {
      runtime.replaySelections[key] = option.id;
      runtime.sequence = buildSequence(runtime);
      const newIndex = runtime.sequence.findIndex(item => item.id === node.id);
      runtime.step = Math.max(0, newIndex + 1);
      runtime.finished = false;
      renderReaderNode();
      return;
    }

    const state = app.getState();
    if (state.story.choiceSelections[key]) return;

    state.story.choiceSelections[key] = option.id;
    applyEffects(option.effects || []);
    runtime.sequence = buildSequence(runtime);
    const newIndex = runtime.sequence.findIndex(item => item.id === node.id);
    runtime.step = Math.max(0, newIndex + 1);
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

  function previousReader() {
    if (!runtime) return;

    if (runtime.finished) {
      runtime.finished = false;
      runtime.step = Math.max(0, runtime.sequence.length - 1);
      if (!runtime.replay) persistReaderStep();
      renderReaderNode();
      return;
    }

    if (runtime.step <= 0) return;
    runtime.step -= 1;
    if (!runtime.replay) persistReaderStep();
    renderReaderNode();
  }

  function persistReaderStep() {
    if (!runtime || runtime.replay) return;
    const state = app.getState();
    state.story.readerStep = runtime.step;
    state.story.activeSceneId = runtime.sceneId;
    app.saveState({ source: "story-reading" });
    els.saveStatus.textContent = "Autosaved to local + cloud";
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
      ? "This was a sandboxed replay. Any different answers you tried here were not written into your canon save."
      : "My choices and hidden relationship state have been saved. This chapter is now available in Memories.";

    els.beatContent.append(kicker, title, copy);
    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `${replay ? "Return to Memories" : "Return to Story Hub"} <span>›</span>`;
    els.beatLabel.textContent = "Complete";
    els.progressReaderBar.style.width = "100%";
    els.saveStatus.textContent = replay ? "Replay only · canon unchanged" : "Saved";
  }

  function applyEffects(effects) {
    const state = app.getState();
    state.story.relationships = object(state.story.relationships);

    for (const effect of effects || []) {
      switch (effect.type) {
        case "bond":
          state.story.bonds[effect.key] = Number(state.story.bonds[effect.key] || 0) + Number(effect.delta || 0);
          break;
        case "relationship": {
          const who = effect.key;
          const stat = effect.stat || "affinity";
          state.story.relationships[who] = object(state.story.relationships[who]);
          state.story.relationships[who][stat] = Number(state.story.relationships[who][stat] || 0) + Number(effect.delta || 0);
          break;
        }
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
    const mode = visual?.mode || "dialogue";
    const bg = visual?.cg ? { src: visual.cg } : (visual?.background ? backgroundAssets[visual.background] : null);
    const characters = Array.isArray(visual?.characters) ? visual.characters : [];
    const focusId = visual?.focus || null;
    const portraitSpec = resolvePortraitSpec(visual, characters, characterAssets);

    clearSprites();
    renderTextboxPortrait(portraitSpec, characterAssets);

    if (bg?.src) {
      els.visualBackdrop.style.backgroundImage = `url("${String(bg.src).replace(/"/g, "%22")}")`;
      els.visualStage.classList.remove("hidden");
      els.visualStage.setAttribute("aria-hidden", "false");
    } else {
      els.visualBackdrop.style.backgroundImage = "none";
      els.visualStage.classList.add("hidden");
      els.visualStage.setAttribute("aria-hidden", "true");
    }

    if (mode === "cg") {
      els.visualStage.dataset.mode = "cg";
    } else {
      delete els.visualStage.dataset.mode;
    }

    const stageCharacters = characters.filter(item => {
      if (!item?.id) return false;
      if (item.stage === false) return false;
      if (portraitSpec && item.id === portraitSpec.id && mode !== "cg") return Boolean(item.allowSceneDuplicate);
      return true;
    });

    for (const item of stageCharacters) {
      const asset = resolveCharacterAsset(characterAssets?.[item.id], item);
      if (!asset?.src) continue;

      const target = item.side === "left"
        ? els.spriteLeft
        : item.side === "center"
          ? els.spriteCenter
          : els.spriteRight;
      if (!target) continue;

      const label = characterAssets?.[item.id]?.name || item.id || "Character";
      target.dataset.characterId = item.id || "";
      target.classList.toggle("is-active", !focusId || focusId === item.id);
      target.classList.toggle("is-muted", Boolean(focusId && focusId !== item.id));
      target.innerHTML = `<img src="${escapeHtml(asset.src)}" alt="${escapeHtml(label)}" />`;
      target.classList.remove("hidden");
      els.visualStage.classList.remove("hidden");
      els.visualStage.setAttribute("aria-hidden", "false");
    }
  }

  function resolvePortraitSpec(visual, characters, characterAssets) {
    if (visual?.portrait && visual.portrait.id) {
      return {
        id: visual.portrait.id,
        outfit: visual.portrait.outfit || characterAssets?.[visual.portrait.id]?.defaultOutfit,
        expression: visual.portrait.expression || "neutral"
      };
    }

    const selfCharacter = characters.find(item => item.id === "luca");
    if (selfCharacter) {
      return {
        id: "luca",
        outfit: selfCharacter.outfit || characterAssets?.luca?.defaultOutfit,
        expression: selfCharacter.expression || "neutral"
      };
    }

    return {
      id: "luca",
      outfit: characterAssets?.luca?.defaultOutfit,
      expression: visual?.portraitExpression || "neutral"
    };
  }

  function renderTextboxPortrait(spec, characterAssets) {
    if (!els.textboxPortrait || !els.textboxPortraitImg) return;
    if (!spec?.id) {
      els.textboxPortrait.classList.add("hidden");
      els.textboxPortraitImg.removeAttribute("src");
      els.textboxPortraitImg.alt = "";
      return;
    }

    const asset = resolveCharacterAsset(characterAssets?.[spec.id], spec);
    if (!asset?.src) {
      els.textboxPortrait.classList.add("hidden");
      els.textboxPortraitImg.removeAttribute("src");
      els.textboxPortraitImg.alt = "";
      return;
    }

    const label = characterAssets?.[spec.id]?.name || spec.id;
    els.textboxPortrait.classList.remove("hidden");
    els.textboxPortrait.dataset.characterId = spec.id;
    els.textboxPortrait.dataset.expression = spec.expression || "neutral";
    els.textboxPortraitImg.src = asset.src;
    els.textboxPortraitImg.alt = label;
  }

  function resolveCharacterAsset(character, item) {
    if (!character) return null;

    // V0.8 supports explicit outfit + expression while remaining compatible
    // with the older flat expression map.
    const outfitName = item?.outfit || character.defaultOutfit;
    const outfit = outfitName ? character.outfits?.[outfitName] : null;
    if (outfit) {
      return outfit?.[item?.expression] || outfit?.neutral || outfit?.default || null;
    }

    return character?.[item?.expression] || character?.default || null;
  }

  function clearSprites() {
    [els.spriteLeft, els.spriteCenter, els.spriteRight].forEach(el => {
      if (!el) return;
      el.classList.add("hidden");
      el.classList.remove("is-active", "is-muted");
      delete el.dataset.characterId;
      el.innerHTML = "";
    });
    if (els.textboxPortrait) {
      els.textboxPortrait.classList.add("hidden");
      delete els.textboxPortrait.dataset.characterId;
      delete els.textboxPortrait.dataset.expression;
    }
    if (els.textboxPortraitImg) {
      els.textboxPortraitImg.removeAttribute("src");
      els.textboxPortraitImg.alt = "";
    }
  }

  function choiceKey(sceneId, choiceId) {
    return `${sceneId}:${choiceId}`;
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function escapeHtml(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escapeClass(value) {
    return String(value || "").replace(/[^a-z0-9_-]/gi, "");
  }

  window.LifeRPGStoryUI = {
    beginOrContinue: handleStoryAction
  };
})();
