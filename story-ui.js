(() => {
  "use strict";

  const engine = window.LifeRPGStoryEngine;
  const app = window.LifeRPGApp;

  if (!engine || !app) {
    console.error("Life RPG story modules could not initialize.");
    return;
  }

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

    overlay: byId("storyReaderOverlay"),
    shell: byId("storyReaderShell"),
    close: byId("storyReaderClose"),
    location: byId("storyReaderLocation"),
    sceneTitle: byId("storyReaderSceneTitle"),
    stageMark: byId("storyStageMark"),
    stageCaption: byId("storyStageCaption"),
    speaker: byId("storySpeaker"),
    nodeType: byId("storyNodeType"),
    dialogue: byId("storyDialogueText"),
    choices: byId("storyChoices"),
    advance: byId("storyAdvanceButton")
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
    els.advance?.addEventListener("click", advanceReader);

    els.overlay?.addEventListener("click", event => {
      if (event.target === els.overlay) closeReader();
    });

    els.memoryList?.addEventListener("click", event => {
      const button = event.target.closest("[data-replay-scene]");
      if (!button) return;
      openScene(button.dataset.replayScene, { replay: true });
    });

    window.addEventListener("life-rpg:render", renderStoryHub);

    document.addEventListener("keydown", event => {
      if (!runtime || els.overlay?.classList.contains("hidden")) return;
      if (event.key === "Escape") {
        closeReader();
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && !els.advance.classList.contains("hidden")) {
        event.preventDefault();
        advanceReader();
      }
    });
  }

  function ensureStoryState() {
    const state = app.getState();

    state.story = {
      packId: "SP_001",
      unlockedSceneIds: [],
      completedSceneIds: [],
      choiceSelections: {},
      bonds: {},
      traits: {},
      activeSceneId: null,
      readerStep: 0,
      ...(state.story || {})
    };

    state.story.unlockedSceneIds = Array.isArray(state.story.unlockedSceneIds)
      ? state.story.unlockedSceneIds
      : [];
    state.story.completedSceneIds = Array.isArray(state.story.completedSceneIds)
      ? state.story.completedSceneIds
      : [];
    state.story.choiceSelections = state.story.choiceSelections || {};
    state.story.bonds = state.story.bonds || {};
    state.story.traits = state.story.traits || {};

    app.saveState();
  }

  function ensurePackState() {
    const state = app.getState();
    if (!pack) return;

    if (state.story.packId !== pack.packId) {
      state.story.packId = pack.packId;
      state.story.activeSceneId = null;
      state.story.readerStep = 0;
    }

    state.story.completedSceneIds = state.story.completedSceneIds
      .filter(id => Boolean(engine.sceneById(pack, id)));
    state.story.unlockedSceneIds = state.story.unlockedSceneIds
      .filter(id => Boolean(engine.sceneById(pack, id)));

    app.saveState();
  }

  function renderStoryHub() {
    if (!els.arcTitle) return;

    if (loadError) {
      els.arcTitle.textContent = "Story pack unavailable";
      els.arcDescription.textContent = "The story file could not be loaded. GitHub Pages must serve the app over http/https for the private content loader to work.";
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
    els.statusEyebrow.textContent = `STORY PACK · ${pack.packId}`;
    els.progressLabel.textContent = `${story.completedSceneIds.length} / ${scenes.length} scenes`;
    els.progressHint.textContent = next
      ? "Completed scenes become replayable Memories."
      : "This story pack is complete. Your choices and hidden relationship state are saved.";

    els.progressDots.innerHTML = scenes.map(scene => {
      const isComplete = completed.has(scene.id);
      const isUnlocked = story.unlockedSceneIds.includes(scene.id);
      const stateClass = isComplete ? "complete" : isUnlocked ? "unlocked" : "locked";
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
      els.nextTitle.textContent = "Story pack complete";
      els.nextBadge.textContent = "Complete";
      els.nextIcon.textContent = "✓";
      els.nextTeaser.textContent = "You have reached the end of the currently installed story pack.";
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">Choices saved</span><span class="story-energy-pill ready">Memories unlocked</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = "More story coming later";
      els.actionHint.textContent = "Your real-life progress can continue while the next story pack is added.";
      return;
    }

    const unlocked = story.unlockedSceneIds.includes(scene.id);
    const active = story.activeSceneId === scene.id;
    const cost = Number(scene.cost || 0);
    const enoughEnergy = state.storyEnergy >= cost;

    if (unlocked) {
      els.nextTitle.textContent = scene.title;
      els.nextBadge.textContent = active && Number(story.readerStep || 0) > 0 ? "In progress" : "Unlocked";
      els.nextIcon.textContent = scene.mark || "✦";
      els.nextTeaser.textContent = active && Number(story.readerStep || 0) > 0
        ? "Continue from where you left off."
        : "This scene is unlocked and ready to play.";
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">✓ Scene unlocked</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = active && Number(story.readerStep || 0) > 0 ? "Continue story" : "Play scene";
      els.actionHint.textContent = "Choices inside the scene are free.";
      return;
    }

    els.nextTitle.textContent = scene.order === 1 ? scene.title : "Next story scene";
    els.nextBadge.textContent = cost === 0 ? "Free" : `${cost} 🔥`;
    els.nextIcon.textContent = scene.order === 1 ? (scene.mark || "✦") : "?";
    els.nextTeaser.textContent = scene.order === 1
      ? "The beginning of Luca’s story is ready now."
      : "The next part of Luca’s story stays hidden until you unlock it.";

    if (cost === 0) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">No Story Energy required</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = "Begin story";
      els.actionHint.textContent = "The first scene is free so the game can begin immediately.";
      return;
    }

    if (enoughEnergy) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">${state.storyEnergy} 🔥 available</span><span class="story-energy-pill">${cost} 🔥 to unlock</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = `Unlock next scene · ${cost} 🔥`;
      els.actionHint.textContent = "Unlocking pays for the whole scene. Every choice inside remains free.";
    } else {
      const missing = Math.max(0, cost - state.storyEnergy);
      els.energyNeed.innerHTML = `<span class="story-energy-pill">${state.storyEnergy} 🔥 available</span><span class="story-energy-pill locked">Need ${missing} more</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = `Need ${missing} more Story Energy`;
      els.actionHint.textContent = "Complete real-life quests — including Recovery quests — to earn more Story Energy.";
    }
  }

  function renderPeople() {
    const state = app.getState();
    const visible = Object.entries(pack.people || {})
      .filter(([, person]) => Boolean(state.flags?.[person.revealFlag]));

    if (!visible.length) {
      els.peopleList.innerHTML = `<div class="empty-state compact">Your social world is still small. The story will change that.</div>`;
      return;
    }

    els.peopleList.innerHTML = visible.map(([id, person]) => `
      <article class="story-person-card ${escapeClass(person.tone || "default")}">
        <span class="story-person-icon">${escapeHtml(person.icon || "✦")}</span>
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
    els.memoryList.innerHTML = completed
      .map(sceneId => {
        const scene = engine.sceneById(pack, sceneId);
        const memory = scene?.memory;
        if (!scene || !memory) return "";

        return `
          <article class="story-memory-card">
            <div class="story-memory-mark">${escapeHtml(scene.mark || "✦")}</div>
            <div class="story-memory-copy">
              <small>Memory ${Number(scene.order || 0).toString().padStart(2, "0")}</small>
              <strong>${escapeHtml(memory.title)}</strong>
              <p>${escapeHtml(memory.subtitle || "")}</p>
            </div>
            <button class="secondary-button" data-replay-scene="${escapeHtml(scene.id)}">Replay</button>
          </article>
        `;
      })
      .join("");
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
      app.saveState();
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

    if (!replay) {
      state.story.activeSceneId = sceneId;
      app.saveState();
    }

    runtime = {
      sceneId,
      replay,
      scene,
      sequence: buildSequence(scene),
      step: replay ? 0 : Math.max(0, Number(state.story.readerStep || 0)),
      finished: false
    };

    els.shell.dataset.mood = scene.mood || "default";
    els.location.textContent = scene.location || "Story";
    els.sceneTitle.textContent = scene.title || "Scene";
    els.stageMark.textContent = scene.mark || "✦";
    els.stageCaption.textContent = scene.caption || "";
    els.overlay.classList.remove("hidden");
    document.body.classList.add("story-reader-open");

    renderReaderNode();
  }

  function closeReader() {
    if (!runtime) return;
    els.overlay.classList.add("hidden");
    document.body.classList.remove("story-reader-open");
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
        if (!selectionId) continue;
        const option = (node.options || []).find(item => item.id === selectionId);
        if (!option) continue;
        for (const extra of option.after || []) {
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
    const type = node.type || "narration";

    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `Continue <span>›</span>`;

    if (type === "dialogue") {
      els.speaker.textContent = node.speaker || "Dialogue";
      els.nodeType.textContent = "";
      els.dialogue.className = "story-dialogue-text dialogue";
    } else if (type === "thought") {
      els.speaker.textContent = node.speaker || "Luca";
      els.nodeType.textContent = "Thought";
      els.dialogue.className = "story-dialogue-text thought";
    } else if (type === "choice") {
      els.speaker.textContent = "Luca";
      els.nodeType.textContent = "Choose";
      els.dialogue.className = "story-dialogue-text choice-prompt";
      renderChoices(node);
      return;
    } else {
      els.speaker.textContent = "Narration";
      els.nodeType.textContent = "";
      els.dialogue.className = "story-dialogue-text narration";
    }

    els.dialogue.textContent = node.text || "";
  }

  function renderChoices(node) {
    const state = app.getState();
    const key = choiceKey(runtime.sceneId, node.id);
    const selectedId = state.story.choiceSelections[key];

    els.dialogue.textContent = node.prompt || "Choose a response.";
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
    if (extras.length) {
      runtime.sequence.splice(runtime.step + 1, 0, ...extras);
    }

    runtime.step += 1;
    state.story.readerStep = runtime.step;
    app.saveState();
    renderStoryHub();
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
    const state = app.getState();
    state.story.readerStep = runtime?.step || 0;
    state.story.activeSceneId = runtime?.sceneId || null;
    app.saveState();
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

      if (scene.memory?.id && !state.memories.includes(scene.memory.id)) {
        state.memories.push(scene.memory.id);
      }
    }

    state.story.activeSceneId = null;
    state.story.readerStep = 0;
    app.saveState();
    app.renderAll();

    runtime.finished = true;
    renderFinishedState(false);
  }

  function renderFinishedState(replay = false) {
    const memory = runtime?.scene?.memory;
    els.speaker.textContent = replay ? "Replay complete" : "Memory unlocked";
    els.nodeType.textContent = "";
    els.dialogue.className = "story-dialogue-text completion";
    els.dialogue.textContent = replay
      ? "You have reached the end of this remembered scene."
      : (memory?.title ? `“${memory.title}” has been added to Memories.` : "Scene complete.");
    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `${replay ? "Return to Memories" : "Return to Story"} <span>›</span>`;
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

  function choiceKey(sceneId, choiceId) {
    return `${sceneId}:${choiceId}`;
  }

  function escapeHtml(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value);
  }

  function escapeClass(value) {
    return String(value).replace(/[^a-z0-9_-]/gi, "");
  }
})();
