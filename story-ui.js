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
  const prefetchedStoryAssets = new Set();

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
    phoneBadge: byId("storyPhoneBadge"),
    phonePreview: byId("storyPhonePreview"),
    phoneOpen: byId("storyOpenPhoneButton"),
    phoneDialog: byId("storyPhoneDialog"),
    phoneContacts: byId("storyPhoneContacts"),
    phoneThreadHeader: byId("storyPhoneThreadHeader"),
    phoneThread: byId("storyPhoneThread"),
    peopleDirectory: byId("peopleDirectory"),
    peopleProfileHero: byId("peopleProfileHero"),
    peopleProfileActions: byId("peopleProfileActions"),
    peopleProfileDetails: byId("peopleProfileDetails"),
    phonePageContacts: byId("phonePageContacts"),
    phonePageThreadHeader: byId("phonePageThreadHeader"),
    phonePageThread: byId("phonePageThread"),
    phonePageUnreadLabel: byId("phonePageUnreadLabel"),
    navPhoneUnread: byId("navPhoneUnread"),
    navStoryPulse: byId("navStoryPulse"),
    worldPulseBadge: byId("storyWorldPulseBadge"),
    worldPulseTitle: byId("storyWorldPulseTitle"),
    worldPulseCopy: byId("storyWorldPulseCopy"),
    worldPulseAction: byId("storyWorldPulseAction"),
    dashboardSocialPulse: byId("socialPulse"),

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
    textboxPortraitImg: byId("storyTextboxPortraitImg"),
    backlog: byId("storyBacklog"),
    backlogOpen: byId("storyBacklogOpen"),
    backlogClose: byId("storyBacklogClose"),
    backlogScrim: byId("storyBacklogScrim"),
    backlogList: byId("storyBacklogList"),
    miniProgressBar: byId("storyReaderMiniProgressBar")
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
      app.renderWorld?.();
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
    document.addEventListener("click", event => {
      const dynamicNav = event.target.closest?.("#socialPulse [data-view-target], #peopleProfileActions [data-view-target]");
      if (!dynamicNav) return;
      app.showView?.(dynamicNav.dataset.viewTarget);
    });
    els.close?.addEventListener("click", closeReader);
    els.exitSide?.addEventListener("click", closeReader);
    els.previous?.addEventListener("click", previousReader);
    els.advance?.addEventListener("click", advanceReader);
    els.backlogOpen?.addEventListener("click", openBacklog);
    els.backlogClose?.addEventListener("click", closeBacklog);
    els.backlogScrim?.addEventListener("click", closeBacklog);
    els.visualStage?.addEventListener("click", () => {
      if (!runtime || runtime.finished || !els.backlog?.classList.contains("hidden")) return;
      if (els.advance?.classList.contains("hidden")) return;
      advanceReader();
    });

    els.memoryList?.addEventListener("click", event => {
      const button = event.target.closest("[data-replay-scene]");
      if (!button) return;
      openScene(button.dataset.replayScene, { replay: true });
    });

    els.peopleList?.addEventListener("click", event => {
      const talkButton = event.target.closest("[data-talk-person]");
      if (talkButton) {
        openNextTalk(talkButton.dataset.talkPerson);
        return;
      }

      const hangoutButton = event.target.closest("[data-hangout-person]");
      if (hangoutButton && !hangoutButton.disabled) {
        openNextHangout(hangoutButton.dataset.hangoutPerson);
        return;
      }

      const phoneButton = event.target.closest("[data-message-person]");
      if (phoneButton) openPhone(phoneButton.dataset.messagePerson);
    });

    els.peopleDirectory?.addEventListener("click", event => {
      const button = event.target.closest("[data-people-select]");
      if (!button) return;
      selectPeoplePerson(button.dataset.peopleSelect);
    });

    els.peopleProfileActions?.addEventListener("click", event => {
      const talkButton = event.target.closest("[data-talk-person]");
      if (talkButton) { openNextTalk(talkButton.dataset.talkPerson); return; }
      const hangoutButton = event.target.closest("[data-hangout-person]");
      if (hangoutButton && !hangoutButton.disabled) { openNextHangout(hangoutButton.dataset.hangoutPerson); return; }
      const messageButton = event.target.closest("[data-profile-message-person]");
      if (messageButton) {
        const personId = messageButton.dataset.profileMessagePerson;
        const state = app.getState();
        state.story.social.selectedPhonePersonId = personId;
        app.saveState({ source: "social-phone-select" });
        renderPhoneSurfaces(personId);
      }
    });

    els.phonePageContacts?.addEventListener("click", event => {
      const button = event.target.closest("[data-phone-person]");
      if (!button) return;
      selectPhonePerson(button.dataset.phonePerson, { markRead: true });
    });

    els.phonePageThread?.addEventListener("click", event => {
      const button = event.target.closest("[data-message-reply-group][data-message-reply-id]");
      if (!button) return;
      chooseMessageReply(button.dataset.messageReplyGroup, button.dataset.messageReplyId);
    });

    els.worldPulseAction?.addEventListener("click", () => {
      const moment = currentWorldMoment();
      if (moment) {
        openRandomEvent(moment.id);
        return;
      }
      app.showView?.("people");
    });

    els.phoneOpen?.addEventListener("click", () => openPhone());
    els.phoneContacts?.addEventListener("click", event => {
      const button = event.target.closest("[data-phone-person]");
      if (!button) return;
      selectPhonePerson(button.dataset.phonePerson, { markRead: true });
    });

    els.phoneThread?.addEventListener("click", event => {
      const button = event.target.closest("[data-message-reply-group][data-message-reply-id]");
      if (!button) return;
      chooseMessageReply(button.dataset.messageReplyGroup, button.dataset.messageReplyId);
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

      const tag = document.activeElement?.tagName;
      const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);

      if (!els.backlog?.classList.contains("hidden")) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeBacklog();
        }
        return;
      }

      if (event.key === "Escape") {
        closeReader();
        return;
      }

      if (!typing && event.key.toLowerCase() === "b") {
        event.preventDefault();
        openBacklog();
        return;
      }

      if (event.key === "ArrowLeft") {
        if (typing) return;
        event.preventDefault();
        previousReader();
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && !els.advance?.classList.contains("hidden")) {
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
      social: {},
      progressionSnapshots: {},
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
    state.story.progressionSnapshots = object(state.story.progressionSnapshots);
    ensureSocialState();
  }

  function ensureSocialState() {
    const state = app.getState();
    const previous = object(state.story?.social);
    state.story.social = {
      seenTalkIds: [],
      talkCounts: {},
      choiceSelections: {},
      readMessageIds: [],
      messageReplies: {},
      completedHangoutIds: [],
      hangoutCounts: {},
      recentTalkIdsByPerson: {},
      lastInteractionByPerson: {},
      dailyTalkBondDatesByPerson: {},
      completedRandomEventIds: [],
      randomEventHistory: [],
      queuedRandomEventId: null,
      queuedRandomEventAt: null,
      lastWorldMomentOfferDate: null,
      activeRandomEventId: null,
      randomEventStep: 0,
      activeRandomEventProgressionSnapshot: null,
      activeHangoutId: null,
      hangoutStep: 0,
      activeHangoutProgressionSnapshot: null,
      activeTalkId: null,
      talkStep: 0,
      activeTalkProgressionSnapshot: null,
      lastTalkId: null,
      selectedPhonePersonId: null,
      selectedPeoplePersonId: null,
      ...previous
    };
    state.story.social.seenTalkIds = array(state.story.social.seenTalkIds);
    state.story.social.talkCounts = object(state.story.social.talkCounts);
    state.story.social.choiceSelections = object(state.story.social.choiceSelections);
    state.story.social.readMessageIds = array(state.story.social.readMessageIds);
    state.story.social.messageReplies = object(state.story.social.messageReplies);
    state.story.social.completedHangoutIds = array(state.story.social.completedHangoutIds);
    state.story.social.hangoutCounts = object(state.story.social.hangoutCounts);
    state.story.social.recentTalkIdsByPerson = object(state.story.social.recentTalkIdsByPerson);
    state.story.social.lastInteractionByPerson = object(state.story.social.lastInteractionByPerson);
    state.story.social.dailyTalkBondDatesByPerson = object(state.story.social.dailyTalkBondDatesByPerson);
    state.story.social.completedRandomEventIds = array(state.story.social.completedRandomEventIds);
    state.story.social.randomEventHistory = array(state.story.social.randomEventHistory)
      .filter(item => item && typeof item === "object" && item.id);
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
        progressionSnapshots: {},
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
    state.story.progressionSnapshots = {};
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
      state.story.progressionSnapshots = {};
      state.story.activeSceneId = null;
      state.story.readerStep = 0;
    }

    state.story.completedSceneIds = state.story.completedSceneIds.filter(id => Boolean(engine.sceneById(pack, id)));
    state.story.unlockedSceneIds = state.story.unlockedSceneIds.filter(id => Boolean(engine.sceneById(pack, id)));

    if (state.story.activeSceneId && !engine.sceneById(pack, state.story.activeSceneId)) {
      state.story.activeSceneId = null;
      state.story.readerStep = 0;
    }

    const social = state.story.social;
    social.completedRandomEventIds = array(social.completedRandomEventIds).filter(id => Boolean(randomEventById(id)));
    social.randomEventHistory = array(social.randomEventHistory).filter(entry => entry?.id && Boolean(randomEventById(entry.id)));
    if (social.queuedRandomEventId && !randomEventById(social.queuedRandomEventId)) {
      social.queuedRandomEventId = null;
      social.queuedRandomEventAt = null;
    }
    if (social.activeRandomEventId && !randomEventById(social.activeRandomEventId)) {
      social.activeRandomEventId = null;
      social.randomEventStep = 0;
      social.activeRandomEventProgressionSnapshot = null;
    }

    repairAccidentalFreeSceneUnlock();
    repairV024CanonAlignment();
  }

  function repairV024CanonAlignment() {
    const state = app.getState();
    const repairKey = "V024_CANON_ALIGNMENT";
    state.flags = object(state.flags);
    if (state.flags[repairKey]) return;

    const prematureHousing = [
      "MINA_HOUSING_LEAD_SHARED",
      "HOUSING_LEAD_DYNARIOT",
      "STORY_BAKUGO_KIRISHIMA_MENTIONED",
      "DYNARIOT_MEETING_POSSIBLE"
    ].some(key => Boolean(state.flags[key]));

    [
      "MINA_HOUSING_LEAD_SHARED",
      "HOUSING_LEAD_DYNARIOT",
      "STORY_BAKUGO_KIRISHIMA_MENTIONED",
      "DYNARIOT_MEETING_POSSIBLE"
    ].forEach(key => delete state.flags[key]);

    [
      "ROOMMATE_PRIORITY_RULES",
      "ROOMMATE_PRIORITY_SAFETY",
      "ROOMMATE_PRIORITY_DIRECT_TERMS",
      "MSG_M5_MEETING_GO",
      "MSG_M5_DETAILS_FIRST",
      "MSG_M5_TWO_GUYS",
      "MSG_M8_TAKE_TIME",
      "MSG_M8_ENTHUSIASM_PROBATION",
      "MSG_M8_TRUE_CRIME"
    ].forEach(key => delete state.story.traits?.[key]);

    const social = state.story.social;
    social.readMessageIds = array(social.readMessageIds).filter(id => !["MG_M_005", "MG_M_008"].includes(id));
    social.seenTalkIds = array(social.seenTalkIds).filter(id => id !== "TK_M_SUPPORT_STYLE");
    delete social.messageReplies?.MG_M_005;
    delete social.messageReplies?.MG_M_008;

    if (prematureHousing && state.story.completedSceneIds.includes("SC_005")) {
      state.story.completedSceneIds = state.story.completedSceneIds.filter(id => id !== "SC_005");
      if (!state.story.unlockedSceneIds.includes("SC_005")) state.story.unlockedSceneIds.push("SC_005");
      state.memories = array(state.memories).filter(id => id !== "MEM_SP3_005");
      delete state.story.choiceSelections?.s5_choice;
      delete state.story.progressionSnapshots?.SC_005;
      if (state.story.activeSceneId === "SC_005") state.story.readerStep = 0;
    } else if (prematureHousing && state.story.unlockedSceneIds.includes("SC_005")) {
      state.story.readerStep = state.story.activeSceneId === "SC_005" ? 0 : state.story.readerStep;
      delete state.story.choiceSelections?.s5_choice;
      delete state.story.progressionSnapshots?.SC_005;
    }

    state.flags[repairKey] = true;
    app.saveState({ source: "story-v024-canon-alignment" });
  }

  function repairAccidentalFreeSceneUnlock() {
    const state = app.getState();
    const repairKey = "V0121_SC002_ENERGY_GATE_REPAIR";

    if (state.flags?.[repairKey]) return;

    const unlocked = array(state.story?.unlockedSceneIds);
    const completed = array(state.story?.completedSceneIds);
    const noRealLifeClears = array(state.completionLog).length === 0;
    const noEnergy = Number(state.storyEnergy || 0) <= 0;
    const sceneWasAccidentallyOpened = unlocked.includes("SC_002") && !completed.includes("SC_002");

    // V0.11.0 accidentally shipped SC_002 with a zero Story Energy cost.
    // Only revoke that accidental unlock for untouched real-life saves.
    // Completed story remains preserved, and any save with real-life clears is left alone.
    if (sceneWasAccidentallyOpened && noRealLifeClears && noEnergy) {
      state.story.unlockedSceneIds = unlocked.filter(id => id !== "SC_002");
      if (state.story.progressionSnapshots) delete state.story.progressionSnapshots.SC_002;
      if (state.story.activeSceneId === "SC_002") {
        state.story.activeSceneId = null;
        state.story.readerStep = 0;
      }
    }

    state.flags = object(state.flags);
    state.flags[repairKey] = true;
    app.saveState({ source: "story-v0121-energy-gate-repair" });
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
    renderPeoplePage();
    renderMemories();
    renderPhonePreview();
    renderPhoneSurfaces();
    renderWorldPulse();
    app.renderWorld?.();
  }

  function progressionRequirementMatches(requirement, snapshot = null) {
    if (!requirement || typeof requirement !== "object") return true;
    if (typeof app.evaluateProgressionCondition === "function") {
      return app.evaluateProgressionCondition(requirement, { snapshot });
    }

    const type = requirement.type || (requirement.capability ? "capability" : requirement.realmRank ? "realmRank" : null);
    const key = requirement.key || requirement.capability || requirement.realmRank;
    if (!type || !key) return true;

    let value = 0;
    if (type === "capability") value = Number(app.getCapabilityInfo?.(key)?.level || 1);
    else if (type === "realmRank") value = Number(app.getRealmRankInfo?.(key)?.level || 1);
    else return true;

    if (requirement.min != null && value < Number(requirement.min)) return false;
    if (requirement.max != null && value > Number(requirement.max)) return false;
    return true;
  }

  function sceneRequirementsMet(scene, snapshot = null) {
    const requirements = Array.isArray(scene?.requirements) ? scene.requirements : [];
    if (!requirements.every(requirement => progressionRequirementMatches(requirement, snapshot))) return false;
    if (scene?.readiness && typeof app.evaluateProgressionCondition === "function") {
      return app.evaluateProgressionCondition(scene.readiness, { snapshot });
    }
    return true;
  }

  function getSceneProgressionSnapshot(sceneId, { create = false } = {}) {
    const state = app.getState();
    ensureStoryState();
    const existing = state.story.progressionSnapshots?.[sceneId];
    if (existing && typeof existing === "object") return existing;
    if (!create || typeof app.getProgressionSnapshot !== "function") return null;

    const snapshot = app.getProgressionSnapshot();
    state.story.progressionSnapshots[sceneId] = snapshot;
    return snapshot;
  }

  function getSocialProgressionSnapshot(kind, sceneId, { create = false } = {}) {
    const state = app.getState();
    ensureStoryState();
    const keys = {
      talk: ["activeTalkId", "activeTalkProgressionSnapshot"],
      hangout: ["activeHangoutId", "activeHangoutProgressionSnapshot"],
      event: ["activeRandomEventId", "activeRandomEventProgressionSnapshot"]
    };
    const [idKey, snapshotKey] = keys[kind] || keys.talk;
    const existing = state.story.social?.[snapshotKey];

    if (state.story.social?.[idKey] === sceneId && existing && typeof existing === "object") return existing;
    if (!create || typeof app.getProgressionSnapshot !== "function") return null;

    const snapshot = app.getProgressionSnapshot();
    state.story.social[snapshotKey] = snapshot;
    return snapshot;
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
    const readyForScene = sceneRequirementsMet(scene);

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

    if (!readyForScene) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill locked">Real-life readiness not met yet</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = "Not quite ready yet";
      els.actionHint.textContent = "Some future chapters can react to real-life growth. Readiness checks stay spoiler-safe and should always have a reasonable path forward.";
      return;
    }

    if (cost === 0) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">No Story Energy required</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = "Begin story";
      els.actionHint.textContent = "The opening chapter is free.";
      return;
    }

    if (enoughEnergy) {
      els.energyNeed.innerHTML = `<span class="story-energy-pill ready">${app.formatEnergy?.(state.storyEnergy) ?? state.storyEnergy} 🔥 available</span><span class="story-energy-pill">${cost} 🔥 to unlock chapter</span>`;
      els.actionButton.disabled = false;
      els.actionButton.textContent = `Unlock next chapter · ${cost} 🔥`;
      els.actionHint.textContent = "Unlocking pays for the complete chapter. Reading, Previous and choices are free after that.";
    } else {
      const missing = Math.max(0, cost - Number(state.storyEnergy || 0));
      els.energyNeed.innerHTML = `<span class="story-energy-pill">${app.formatEnergy?.(state.storyEnergy) ?? state.storyEnergy} 🔥 available</span><span class="story-energy-pill locked">Need ${app.formatEnergy?.(missing) ?? missing} more</span>`;
      els.actionButton.disabled = true;
      els.actionButton.textContent = `Need ${app.formatEnergy?.(missing) ?? missing} more Story Energy`;
      els.actionHint.textContent = "Daily check-ins, habits, quests, reading, tracked game goals, Side Adventures and useful Life RPG upkeep can all help fund the next chapter.";
    }
  }

  function renderPeople() {
    const visible = knownPeople();

    if (!visible.length) {
      els.peopleList.innerHTML = `<div class="empty-state compact">For now, my social orbit is still my ordinary life.</div>`;
      return;
    }

    els.peopleList.innerHTML = visible.map(person => {
      const talk = nextTalkForPerson(person.id);
      const hangout = nextHangoutForPerson(person.id);
      const hangoutUnlocked = !person.hangoutUnlockFlag || Boolean(app.getState().flags?.[person.hangoutUnlockFlag]);
      const unread = unreadMessageCount(person.id);
      const pending = pendingReplyCount(person.id);
      const avatar = person.cardAsset
        ? `<span class="story-person-avatar"><img src="${escapeHtml(person.cardAsset)}" alt="" /></span>`
        : `<span class="story-person-initial">${escapeHtml(person.name?.charAt(0) || "✦")}</span>`;
      const dailyBondDone = talkBondEarnedToday(person.id);
      const talkLabel = talk ? (dailyBondDone ? "Talk · ✓ today" : "Talk") : "Talk";

      return `
        <article class="story-person-card ${escapeClass(person.tone || "default")}">
          ${avatar}
          <div class="story-person-copy">
            <strong>${escapeHtml(person.name)}</strong>
            <small>${escapeHtml(personRole(person))}</small>
            <span class="story-person-social-note">Talk = responsive everyday chat · Hang Out = story-unlocked · Messages = story-linked.</span>
          </div>
          <div class="story-person-actions">
            <button class="secondary-button" type="button" data-talk-person="${escapeHtml(person.id)}" ${talk ? "" : "disabled"}>${escapeHtml(talkLabel)}</button>
            <button class="ghost-button" type="button" data-message-person="${escapeHtml(person.id)}">Messages${unread ? ` · ${unread} new` : pending ? " · reply open" : ""}</button>
            <button class="ghost-button hangout-button ${hangoutUnlocked && hangout ? "ready" : "locked"}" type="button" data-hangout-person="${escapeHtml(person.id)}" ${hangoutUnlocked && hangout ? "" : "disabled"}>${hangoutUnlocked ? (hangout ? "Hang Out" : "Hang Out · More later") : "Hang Out · Locked"}</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function relationshipLabel(person) {
    const state = app.getState();
    if (person.id === "mina") {
      if (state.flags?.MINA_CLOSE_FRIEND) return "Close friend";
      if (state.flags?.MINA_CHOSEN_FRIENDSHIP_CONFIRMED) return "Good friend";
      if (state.flags?.MINA_FRIENDSHIP_ESTABLISHED) return "Friend";
      if (state.flags?.MINA_HANGOUTS_UNLOCKED) return "Making plans";
      if (state.flags?.STORY_MINA_FRIENDSHIP_STARTED) return "New connection";
    }
    if (["kirishima", "bakugo"].includes(person.id) && state.flags?.DYNARIOT_ROOMMATE_MEETING_COMPLETE) return "New acquaintance";
    return "Known person";
  }

  function knownDetailsForPerson(person) {
    const state = app.getState();
    const details = [];
    if (person.id === "mina") {
      if (state.flags?.STORY_MET_MINA) details.push("You met through the hero outreach program at school.");
      if (state.flags?.STORY_MINA_FRIENDSHIP_STARTED) details.push("She chose to keep talking after the formal introductions were over.");
      if (state.flags?.MINA_REAL_COFFEE_COMPLETE) details.push("Coffee stopped being a vague someday-plan and became part of your actual off-duty life.");
      if (state.flags?.MINA_BOOKSTORE_HANGOUT_COMPLETE) details.push("Bookstores and small detours have become plausible plans together.");
      if (state.flags?.MINA_NERD_SIDE_VISIBLE) details.push("She has met the version of you who can happily over-explain books, games, figures and collector nonsense.");
      if (state.flags?.MINA_KNOWS_HOUSING_PROBLEM) details.push("She knows the commute and housing situation are genuinely wearing you down.");
      if (state.flags?.MINA_CHOSEN_FRIENDSHIP_CONFIRMED) details.push("Plans no longer need a practical excuse; you see each other because you want to.");
      if (state.flags?.MINA_KNOWS_RR_DYNAMIGHT_FAN) details.push("She knows Red Riot and Dynamight are a private fandom topic and has promised not to make it weird.");
      if (state.flags?.DYNARIOT_ROOMMATE_MEETING_COMPLETE) details.push("She knows exactly how much information she omitted before that roommate viewing.");
      if (state.locations?.cafe) details.push("Koharu Café has become one of the places you can naturally end up together.");
    }
    if (person.id === "kirishima") {
      if (state.flags?.STORY_MET_KIRISHIMA) details.push("Mina introduced you during a possible-roommate viewing.");
      if (state.flags?.STORY_MET_KIRISHIMA) details.push("You knew Red Riot’s public hero work for years before meeting Eijiro privately. He does not know how much.");
      if (state.flags?.DYNARIOT_ROOMMATE_MEETING_COMPLETE) details.push("He was warm, practical and unexpectedly easy to talk to in person.");
    }
    if (person.id === "bakugo") {
      if (state.flags?.STORY_MET_BAKUGO) details.push("Mina introduced you during a possible-roommate viewing.");
      if (state.flags?.STORY_MET_BAKUGO) details.push("You knew Dynamight’s public hero work for years before meeting Katsuki privately. He does not know how much.");
      if (state.flags?.DYNARIOT_ROOMMATE_MEETING_COMPLETE) details.push("He made it clear that the spare room comes with rules, not instant friendship.");
    }
    if (!details.length) details.push("You are still learning what this connection might become.");
    return details;
  }

  function renderPeoplePage() {
    if (!els.peopleDirectory || !els.peopleProfileHero || !els.peopleProfileActions || !els.peopleProfileDetails) return;
    const people = knownPeople();
    const state = app.getState();

    if (!people.length) {
      els.peopleDirectory.innerHTML = `<div class="empty-state compact">No social contacts yet.</div>`;
      els.peopleProfileHero.innerHTML = `<div class="people-profile-empty"><span>✿</span><strong>Your social world will grow through the story.</strong><p>People appear here only after Luca has actually met them.</p></div>`;
      els.peopleProfileActions.innerHTML = `<div class="empty-state compact">Nothing to do here yet.</div>`;
      els.peopleProfileDetails.innerHTML = `<div class="empty-state compact">No shared history yet.</div>`;
      return;
    }

    let selectedId = state.story.social.selectedPeoplePersonId;
    if (!people.some(person => person.id === selectedId)) selectedId = people[0].id;
    state.story.social.selectedPeoplePersonId = selectedId;
    const selected = people.find(person => person.id === selectedId) || people[0];

    els.peopleDirectory.innerHTML = people.map(person => {
      const active = person.id === selected.id;
      const unread = unreadMessageCount(person.id);
      return `
        <button class="people-directory-card ${active ? "active" : ""}" type="button" data-people-select="${escapeHtml(person.id)}">
          <span class="people-directory-avatar">${person.cardAsset ? `<img src="${escapeHtml(person.cardAsset)}" alt="" />` : escapeHtml(person.name?.charAt(0) || "✦")}</span>
          <span class="people-directory-copy"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(relationshipLabel(person))}</small></span>
          ${unread ? `<span class="people-directory-unread">${unread}</span>` : ""}
        </button>`;
    }).join("");

    const label = relationshipLabel(selected);
    els.peopleProfileHero.innerHTML = `
      <div class="people-profile-art ${escapeClass(selected.tone || "default")}">
        ${selected.cardAsset ? `<img src="${escapeHtml(selected.cardAsset)}" alt="${escapeHtml(selected.name)}" />` : `<span>${escapeHtml(selected.name?.charAt(0) || "✦")}</span>`}
      </div>
      <div class="people-profile-copy">
        <p class="eyebrow">${escapeHtml(label)}</p>
        <h2>${escapeHtml(selected.name)}</h2>
        <p class="people-profile-role">${escapeHtml(personRole(selected))}</p>
        <div class="people-profile-status"><span>✿</span><strong>${escapeHtml(label)}</strong><small>Relationship state is shown through access and behavior — never a love meter.</small></div>
      </div>`;

    const talk = nextTalkForPerson(selected.id);
    const hangout = nextHangoutForPerson(selected.id);
    const hangoutUnlocked = !selected.hangoutUnlockFlag || Boolean(state.flags?.[selected.hangoutUnlockFlag]);
    const unread = unreadMessageCount(selected.id);
    const pending = pendingReplyCount(selected.id);
    els.peopleProfileActions.innerHTML = `
      <button class="social-action-card" type="button" data-talk-person="${escapeHtml(selected.id)}" ${talk ? "" : "disabled"}>
        <span class="social-action-icon">💬</span><span><strong>Talk</strong><small>${talk && reactivityScore(talk) > 0 ? "Conversation can pick up on what you’ve been doing lately · free" : talkBondEarnedToday(selected.id) ? "Today’s relationship gain is already earned · keep chatting for fun" : "First completed chat today grows familiarity · extra chats are just for fun"}</small></span><b>${talkBondEarnedToday(selected.id) ? "✓ TODAY" : "FREE"}</b>
      </button>
      <button class="social-action-card" type="button" data-profile-message-person="${escapeHtml(selected.id)}" data-view-target="phone">
        <span class="social-action-icon">✉</span><span><strong>Messages</strong><small>${unread ? `${unread} unread conversation${unread === 1 ? "" : "s"}` : pending ? `${pending} ${pending === 1 ? "reply is" : "replies are"} still open whenever you want` : "Story-linked threads · no expiry"}</small></span>${unread ? `<b class="message-count">${unread} NEW</b>` : pending ? `<b class="message-count reply-waiting">REPLY</b>` : ""}
      </button>
      <button class="social-action-card ${hangoutUnlocked && hangout ? "ready" : "locked"}" type="button" data-hangout-person="${escapeHtml(selected.id)}" ${hangoutUnlocked && hangout ? "" : "disabled"}>
        <span class="social-action-icon">${hangoutUnlocked ? "☕" : "🔒"}</span><span><strong>Hang Out</strong><small>${hangoutUnlocked ? (hangout ? "Spend time together · free" : "More hangouts can appear later") : "Unlocks naturally through the story"}</small></span><b>${hangoutUnlocked && hangout ? "FREE" : "???"}</b>
      </button>`;

    const details = knownDetailsForPerson(selected);
    els.peopleProfileDetails.innerHTML = `
      <div class="people-known-summary">
        <strong>${escapeHtml(selected.name)}</strong>
        <p>${escapeHtml(personRole(selected))}</p>
      </div>
      <div class="people-social-rhythm"><small>CURRENT RHYTHM</small><p>${escapeHtml(socialRhythmForPerson(selected))}</p></div>
      <div class="people-known-list">${details.map(item => `<div><span>✿</span><p>${escapeHtml(item)}</p></div>`).join("")}</div>
      <div class="people-known-footnote">Hidden trust, memories and preferences stay hidden. You'll notice them when they matter.</div>`;
  }

  function selectPeoplePerson(personId) {
    const state = app.getState();
    const person = knownPeople().find(item => item.id === personId);
    if (!person) return;
    state.story.social.selectedPeoplePersonId = personId;
    app.saveState({ source: "social-people-select" });
    renderPeoplePage();
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

  function knownPeople() {
    const state = app.getState();
    return Object.entries(pack?.people || {})
      .map(([id, person]) => ({ id, ...person }))
      .filter(person => !person.revealFlag || Boolean(state.flags?.[person.revealFlag]));
  }

  function socialTalks() {
    return Array.isArray(pack?.social?.talks) ? pack.social.talks : [];
  }

  function socialMessages() {
    return Array.isArray(pack?.social?.messages) ? pack.social.messages : [];
  }

  function socialHangouts() {
    return Array.isArray(pack?.social?.hangouts) ? pack.social.hangouts : [];
  }

  function socialRandomEvents() {
    return Array.isArray(pack?.social?.randomEvents) ? pack.social.randomEvents : [];
  }

  function randomEventById(eventId) {
    return socialRandomEvents().find(event => event.id === eventId) || null;
  }

  function reactivityRuleMatches(rule) {
    if (!rule || typeof rule !== "object") return false;
    if (rule.progression && typeof app.evaluateProgressionCondition === "function") {
      return app.evaluateProgressionCondition(rule.progression);
    }
    const criteria = rule.activity && typeof rule.activity === "object" ? rule.activity : null;
    if (criteria && typeof app.getActivityCount === "function") {
      const count = Number(app.getActivityCount(criteria) || 0);
      const min = Number(rule.min ?? criteria.min ?? 1);
      const max = rule.max ?? criteria.max;
      if (count < min) return false;
      if (max != null && count > Number(max)) return false;
      return true;
    }

    const checkInRule = rule.checkIn && typeof rule.checkIn === "object" ? rule.checkIn : null;
    if (checkInRule) {
      const today = app.getState()?.dailyPlanner?.days?.[localDateKey()]?.checkIn;
      if (!today) return false;
      return Object.entries(checkInRule).every(([key, expected]) => {
        const actual = today[key];
        if (Array.isArray(expected)) return expected.includes(actual);
        return actual === expected;
      });
    }
    return false;
  }

  function reactivityScore(item) {
    return array(item?.reactivity).reduce((score, rule) => {
      if (!reactivityRuleMatches(rule)) return score;
      return score + Math.max(1, Number(rule.weight || 1));
    }, 0);
  }

  function weightedPick(items, weightForItem = () => 1) {
    if (!items.length) return null;
    const weighted = items.map(item => ({ item, weight: Math.max(0.01, Number(weightForItem(item) || 1)) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = Math.random() * total;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.item;
    }
    return weighted.at(-1)?.item || items[0];
  }

  function randomEventAvailable(event) {
    const state = app.getState();
    const social = state.story?.social || {};
    if (!event || !conditionMatches(event)) return false;
    if (event.personId && !knownPeople().some(person => person.id === event.personId)) return false;
    if (event.once && array(social.completedRandomEventIds).includes(event.id)) return false;

    const cooldownDays = Math.max(0, Number(event.cooldownDays || 0));
    if (cooldownDays > 0) {
      const latest = array(social.randomEventHistory)
        .filter(entry => entry?.id === event.id && entry.at)
        .map(entry => new Date(entry.at).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0];
      if (latest && Date.now() - latest < cooldownDays * 86400000) return false;
    }
    return true;
  }

  function worldEventsForLocation(locationKey) {
    const state = app.getState();
    const activeId = state.story?.social?.activeRandomEventId;
    const candidates = socialRandomEvents()
      .filter(event => event?.worldLocation === locationKey)
      .filter(event => event.id === activeId || randomEventAvailable(event));

    return candidates.sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      const reactive = reactivityScore(b) - reactivityScore(a);
      if (reactive) return reactive;
      const weight = Number(b.weight || 1) - Number(a.weight || 1);
      if (weight) return weight;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function getWorldLocationStatus(locationKey) {
    if (!pack || !locationKey) return { available: false };
    const event = worldEventsForLocation(locationKey)[0];
    if (!event) return { available: false };
    const person = event.personId ? knownPeople().find(item => item.id === event.personId) : null;
    return {
      available: true,
      eventId: event.id,
      personId: person?.id || null,
      personName: person?.name || "Someone",
      cardAsset: person?.cardAsset || null,
      hint: event.worldHint || "A small free moment is available here."
    };
  }

  function visitWorldLocation(locationKey) {
    const status = getWorldLocationStatus(locationKey);
    if (!status.available || !status.eventId) return false;
    return openRandomEvent(status.eventId);
  }

  function currentWorldMoment() {
    const state = app.getState();
    ensureStoryState();
    const social = state.story.social;

    if (social.queuedRandomEventId) {
      const queued = randomEventById(social.queuedRandomEventId);
      if (queued) return queued;
      social.queuedRandomEventId = null;
      social.queuedRandomEventAt = null;
    }

    const today = localDateKey();
    if (social.lastWorldMomentOfferDate === today) return null;

    const eligible = socialRandomEvents().filter(randomEventAvailable);
    if (!eligible.length) return null;

    const maxReactive = Math.max(0, ...eligible.map(reactivityScore));
    const contextual = maxReactive > 0 ? eligible.filter(event => reactivityScore(event) === maxReactive) : eligible;
    const selected = weightedPick(contextual, event => Math.max(1, Number(event.weight || 1)) + reactivityScore(event));
    if (!selected) return null;

    social.queuedRandomEventId = selected.id;
    social.queuedRandomEventAt = new Date().toISOString();
    social.lastWorldMomentOfferDate = today;
    app.saveState({ source: "social-world-moment-offer" });
    return selected;
  }

  function renderWorldPulse() {
    const moment = currentWorldMoment();
    const unread = unreadMessageCount();
    const pending = pendingReplyCount();
    const contextualTalk = knownPeople()
      .map(person => nextTalkForPerson(person.id))
      .find(talk => talk && reactivityScore(talk) > 0);

    if (els.navStoryPulse) {
      els.navStoryPulse.textContent = "✦";
      els.navStoryPulse.classList.toggle("hidden", !moment);
    }

    if (els.worldPulseBadge && els.worldPulseTitle && els.worldPulseCopy && els.worldPulseAction) {
      if (moment) {
        els.worldPulseBadge.textContent = "NEW · FREE";
        els.worldPulseBadge.classList.add("ready");
        els.worldPulseTitle.textContent = "A little moment is waiting";
        els.worldPulseCopy.textContent = "Something in your current life lined up with your social world. Open it when you feel like it — it will wait for you.";
        els.worldPulseAction.disabled = false;
        els.worldPulseAction.textContent = "See what happened";
      } else if (contextualTalk) {
        els.worldPulseBadge.textContent = "RESPONSIVE";
        els.worldPulseBadge.classList.remove("ready");
        els.worldPulseTitle.textContent = "Today can show up in conversation";
        els.worldPulseCopy.textContent = "An ordinary Talk can pick up on the things you have actually been doing lately. No Story Energy needed.";
        els.worldPulseAction.disabled = false;
        els.worldPulseAction.textContent = "Open People";
      } else {
        els.worldPulseBadge.textContent = "QUIET";
        els.worldPulseBadge.classList.remove("ready");
        els.worldPulseTitle.textContent = "The world is quiet, not empty";
        els.worldPulseCopy.textContent = "Talks, messages and spontaneous moments keep existing between main chapters. Nothing here needs Story Energy.";
        els.worldPulseAction.disabled = knownPeople().length === 0;
        els.worldPulseAction.textContent = knownPeople().length ? "Open People" : "No contacts yet";
      }
    }

    if (els.dashboardSocialPulse) {
      if (unread) {
        els.dashboardSocialPulse.innerHTML = `<div class="pulse-card living-world"><span class="pulse-icon">✉</span><div><strong>${unread} unread conversation${unread === 1 ? "" : "s"}.</strong><p>Your social world has something waiting. Messages never expire.</p></div><button class="mini-nav-button" data-view-target="phone" type="button">Phone ›</button></div>`;
      } else if (moment) {
        els.dashboardSocialPulse.innerHTML = `<div class="pulse-card living-world"><span class="pulse-icon">✦</span><div><strong>Something happened in your social world.</strong><p>A small free moment is waiting in Story. It stays spoiler-free until you open it.</p></div><button class="mini-nav-button" data-view-target="story" type="button">Story ›</button></div>`;
      } else if (contextualTalk) {
        els.dashboardSocialPulse.innerHTML = `<div class="pulse-card living-world"><span class="pulse-icon">💬</span><div><strong>Someone can pick up on today.</strong><p>Talks can now react to recent real-life activity instead of feeling like a shuffled list.</p></div><button class="mini-nav-button" data-view-target="people" type="button">People ›</button></div>`;
      } else if (knownPeople().length) {
        els.dashboardSocialPulse.innerHTML = `<div class="pulse-card living-world"><span class="pulse-icon">♡</span><div><strong>Your social world is available.</strong><p>${pending ? "A reply is still open, and " : ""}Talks and relationship-unlocked time together remain free between chapters.</p></div><button class="mini-nav-button" data-view-target="people" type="button">People ›</button></div>`;
      }
    }
  }

  function openRandomEvent(eventId) {
    const event = randomEventById(eventId);
    if (!event) return false;
    const state = app.getState();
    ensureStoryState();

    runtime = {
      kind: "event",
      sceneId: event.id,
      replay: false,
      scene: event,
      replaySelections: {},
      progressionSnapshot: getSocialProgressionSnapshot("event", event.id, { create: true }),
      step: 0,
      sequence: [],
      finished: false
    };
    runtime.sequence = buildSequence(runtime);
    resetVisualRenderState();
    prefetchRuntimeVisuals();
    const savedStep = state.story.social.activeRandomEventId === event.id
      ? Math.max(0, Number(state.story.social.randomEventStep || 0))
      : 0;
    runtime.step = Math.min(savedStep, Math.max(0, runtime.sequence.length - 1));
    state.story.social.activeRandomEventId = event.id;
    state.story.social.queuedRandomEventId = event.id;
    state.story.social.randomEventStep = runtime.step;
    app.saveState({ source: "social-world-moment-open" });

    els.readerPage.classList.remove("hidden");
    document.body.classList.add("story-mode-open");
    window.scrollTo({ top: 0, behavior: "instant" });
    renderReaderNode();
    return true;
  }

  function recordSocialInteraction(personId, kind, interactionId) {
    const state = app.getState();
    if (!personId || !state.story?.social) return;
    const social = state.story.social;
    social.lastInteractionByPerson = object(social.lastInteractionByPerson);
    social.recentTalkIdsByPerson = object(social.recentTalkIdsByPerson);

    social.lastInteractionByPerson[personId] = {
      kind: kind || "social",
      id: interactionId || null,
      at: new Date().toISOString()
    };

    if (kind === "talk" && interactionId) {
      const previous = array(social.recentTalkIdsByPerson[personId]);
      social.recentTalkIdsByPerson[personId] = [interactionId, ...previous.filter(id => id !== interactionId)].slice(0, 3);
    }
  }

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function talkBondEarnedToday(personId) {
    const social = app.getState().story?.social;
    if (!social || !personId) return false;
    const dates = array(social.dailyTalkBondDatesByPerson?.[personId]);
    return dates.includes(localDateKey());
  }

  function awardDailyTalkBond(personId) {
    if (!personId) return false;
    const state = app.getState();
    ensureStoryState();
    const social = state.story.social;
    social.dailyTalkBondDatesByPerson = object(social.dailyTalkBondDatesByPerson);
    const today = localDateKey();
    const dates = array(social.dailyTalkBondDatesByPerson[personId]);
    if (dates.includes(today)) return false;

    social.dailyTalkBondDatesByPerson[personId] = [...dates, today].slice(-400);
    state.story.relationships = object(state.story.relationships);
    state.story.relationships[personId] = object(state.story.relationships[personId]);
    state.story.relationships[personId].familiarity = Number(state.story.relationships[personId].familiarity || 0) + 1;
    return true;
  }

  function pendingReplyCount(personId = null) {
    const state = app.getState();
    const replies = state.story.social?.messageReplies || {};
    const people = personId ? [personId] : knownPeople().map(person => person.id);
    return people.reduce((count, id) => count + eligibleMessagesForPerson(id).filter(message => {
      const key = messageReadKey(message);
      return array(message.replyOptions).length > 0 && !replies[key];
    }).length, 0);
  }

  function personRole(person) {
    const state = app.getState();
    if (person.id === "mina" && state.flags?.MINA_CLOSE_FRIEND) return "Pro Hero · Close friend";
    if (person.id === "mina" && state.flags?.MINA_FRIENDSHIP_ESTABLISHED) return "Pro Hero · Friend";
    if (person.id === "kirishima" && state.flags?.DYNARIOT_ROOMMATE_MEETING_COMPLETE) return "Pro Hero · Possible roommate";
    if (person.id === "bakugo" && state.flags?.DYNARIOT_ROOMMATE_MEETING_COMPLETE) return "Pro Hero · Possible roommate";
    return person.role || "Known person";
  }

  function recentInteractionPhrase(personId) {
    const interaction = app.getState().story?.social?.lastInteractionByPerson?.[personId];
    if (!interaction?.at) return "";
    const at = new Date(interaction.at);
    if (!Number.isFinite(at.getTime())) return "";
    const today = localDateKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const kind = interaction.kind === "message" ? "messaged" : interaction.kind === "hangout" ? "spent time together" : interaction.kind === "event" ? "crossed paths" : "talked";
    if (localDateKey(at) === today) return `You ${kind} today.`;
    if (localDateKey(at) === localDateKey(yesterday)) return `You ${kind} yesterday.`;
    return "";
  }

  function socialRhythmForPerson(person) {
    const state = app.getState();
    let base = "This connection is still finding its shape.";
    if (person.id === "mina") {
      if (state.flags?.MINA_CLOSE_FRIEND) base = "You can be low-energy, nerdy, quiet or ridiculous around each other without needing to turn it into an event.";
      else if (state.flags?.MINA_CHOSEN_FRIENDSHIP_CONFIRMED) base = "You make plans because you want to see each other, not because there is an event to justify it.";
      else if (state.flags?.MINA_FRIENDSHIP_ESTABLISHED) base = "Conversation has started to feel ordinary instead of scheduled.";
      else if (state.flags?.MINA_HANGOUTS_UNLOCKED) base = "The friendship is beginning to exist outside the original school context.";
      else if (state.flags?.STORY_MINA_FRIENDSHIP_STARTED) base = "She keeps finding reasons to continue the conversation.";
    } else if (["kirishima", "bakugo"].includes(person.id)) {
      base = "You have met once. An everyday relationship has not formed yet, so Talk and Hang Out remain locked.";
    }
    const recent = recentInteractionPhrase(person.id);
    return recent ? `${base} ${recent}` : base;
  }

  function hangoutById(hangoutId) {
    return socialHangouts().find(hangout => hangout.id === hangoutId) || null;
  }

  function nextHangoutForPerson(personId) {
    const state = app.getState();
    const social = state.story.social;
    const person = knownPeople().find(item => item.id === personId);
    if (!person) return null;
    if (person.hangoutUnlockFlag && !state.flags?.[person.hangoutUnlockFlag]) return null;

    if (social.activeHangoutId) {
      const active = hangoutById(social.activeHangoutId);
      if (active && active.personId === personId && conditionMatches(active)) return active;
    }

    return socialHangouts()
      .filter(hangout => hangout.personId === personId && conditionMatches(hangout))
      .find(hangout => !hangout.once || !social.completedHangoutIds.includes(hangout.id)) || null;
  }

  function openNextHangout(personId) {
    const hangout = nextHangoutForPerson(personId);
    if (!hangout) return false;
    return openHangout(hangout.id);
  }

  function openHangout(hangoutId) {
    const hangout = hangoutById(hangoutId);
    if (!hangout || !conditionMatches(hangout)) return false;
    const state = app.getState();
    ensureStoryState();

    runtime = {
      kind: "hangout",
      sceneId: hangout.id,
      replay: false,
      scene: hangout,
      replaySelections: {},
      progressionSnapshot: getSocialProgressionSnapshot("hangout", hangout.id, { create: true }),
      step: 0,
      sequence: [],
      finished: false
    };
    runtime.sequence = buildSequence(runtime);
    resetVisualRenderState();
    prefetchRuntimeVisuals();
    const savedStep = state.story.social.activeHangoutId === hangout.id
      ? Math.max(0, Number(state.story.social.hangoutStep || 0))
      : 0;
    runtime.step = Math.min(savedStep, Math.max(0, runtime.sequence.length - 1));
    state.story.social.activeHangoutId = hangout.id;
    state.story.social.hangoutStep = runtime.step;
    app.saveState({ source: "social-hangout-open" });

    els.readerPage.classList.remove("hidden");
    document.body.classList.add("story-mode-open");
    window.scrollTo({ top: 0, behavior: "instant" });
    renderReaderNode();
    return true;
  }

  function talkById(talkId) {
    return socialTalks().find(talk => talk.id === talkId) || null;
  }

  function nextTalkForPerson(personId) {
    const state = app.getState();
    const social = state.story.social;
    const eligible = socialTalks().filter(talk => talk.personId === personId && conditionMatches(talk));

    if (social.activeTalkId) {
      const active = eligible.find(talk => talk.id === social.activeTalkId);
      if (active) return active;
    }

    const unseenOnce = eligible.filter(talk => talk.once && !social.seenTalkIds.includes(talk.id));
    if (unseenOnce.length) {
      const highestPriority = Math.max(...unseenOnce.map(talk => Number(talk.priority || 0)));
      const timely = unseenOnce.filter(talk => Number(talk.priority || 0) === highestPriority);
      return weightedPick(timely, talk => 1 + reactivityScore(talk) * 4);
    }

    const repeatable = eligible.filter(talk => !talk.once);
    if (!repeatable.length) return null;
    const recent = new Set(array(social.recentTalkIdsByPerson?.[personId]));
    const fresh = repeatable.filter(talk => !recent.has(talk.id));
    const notLast = repeatable.filter(talk => talk.id !== social.lastTalkId);
    const pool = fresh.length ? fresh : notLast.length ? notLast : repeatable;
    return weightedPick(pool, talk => 1 + reactivityScore(talk) * 5);
  }

  function openNextTalk(personId) {
    if (!pack) return false;
    const talk = nextTalkForPerson(personId);
    if (!talk) return false;
    return openTalk(talk.id);
  }

  function openTalk(talkId) {
    const talk = talkById(talkId);
    if (!talk || !conditionMatches(talk)) return false;
    const state = app.getState();
    ensureStoryState();

    runtime = {
      kind: "talk",
      sceneId: talk.id,
      replay: false,
      scene: talk,
      replaySelections: {},
      progressionSnapshot: getSocialProgressionSnapshot("talk", talk.id, { create: true }),
      step: 0,
      sequence: [],
      finished: false
    };
    runtime.sequence = buildSequence(runtime);
    resetVisualRenderState();
    prefetchRuntimeVisuals();
    const savedStep = state.story.social.activeTalkId === talk.id
      ? Math.max(0, Number(state.story.social.talkStep || 0))
      : 0;
    runtime.step = Math.min(savedStep, Math.max(0, runtime.sequence.length - 1));
    state.story.social.activeTalkId = talk.id;
    state.story.social.talkStep = runtime.step;
    app.saveState({ source: "social-talk-open" });

    els.readerPage.classList.remove("hidden");
    document.body.classList.add("story-mode-open");
    window.scrollTo({ top: 0, behavior: "instant" });
    renderReaderNode();
    return true;
  }

  function eligibleMessagesForPerson(personId) {
    const messages = socialMessages().filter(message => message.personId === personId && conditionMatches(message));
    const seenGroups = new Set();
    return messages.filter(message => {
      const key = message.groupId || message.id;
      if (seenGroups.has(key)) return false;
      seenGroups.add(key);
      return true;
    }).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function messageReadKey(message) {
    return message.groupId || message.id;
  }

  function unreadMessageCount(personId = null) {
    const state = app.getState();
    const read = new Set(state.story.social.readMessageIds || []);
    const people = personId ? [personId] : knownPeople().map(person => person.id);
    return people.reduce((count, id) => count + eligibleMessagesForPerson(id).filter(message => !read.has(messageReadKey(message))).length, 0);
  }

  function renderPhonePreview() {
    if (!els.phonePreview || !els.phoneOpen || !els.phoneBadge) return;
    const people = knownPeople();
    const unread = unreadMessageCount();
    const pending = pendingReplyCount();

    if (!people.length) {
      els.phoneBadge.textContent = "Locked";
      els.phonePreview.innerHTML = `
        <span class="phone-preview-icon">💬</span>
        <div class="phone-preview-copy">
          <strong>Messages unlock through relationships.</strong>
          <p>Your phone stays quiet until someone has a reason to text.</p>
        </div>
      `;
      els.phoneOpen.disabled = true;
      els.phoneOpen.textContent = "Open phone";
      return;
    }

    const latest = people
      .flatMap(person => eligibleMessagesForPerson(person.id).map(message => ({ person, message })))
      .at(-1);

    els.phoneBadge.textContent = unread ? `${unread} new` : pending ? "Reply open" : "Online";
    els.phoneBadge.classList.toggle("has-unread", Boolean(unread));
    els.phoneOpen.disabled = false;
    els.phoneOpen.textContent = unread ? `Open phone · ${unread} new` : pending ? "Open phone · reply waiting" : "Open phone";

    if (!latest) {
      els.phonePreview.innerHTML = `
        <span class="phone-preview-icon">💬</span>
        <div class="phone-preview-copy">
          <strong>${escapeHtml(people[0].name)} is in your contacts.</strong>
          <p>No new story-linked messages right now. You can still start a random Talk anytime.</p>
        </div>
      `;
      return;
    }

    const lastBubble = array(latest.message.messages).at(-1);
    els.phonePreview.innerHTML = `
      <span class="phone-preview-icon">💬</span>
      <div class="phone-preview-copy">
        <strong>${escapeHtml(latest.person.name)}</strong>
        <p>${escapeHtml(lastBubble?.text || "A new message is waiting.")}</p>
      </div>
    `;
  }

  function openPhone(personId = null) {
    if (!els.phoneDialog) return;
    const people = knownPeople();
    if (!people.length) return;
    const state = app.getState();
    const preferred = personId || state.story.social.selectedPhonePersonId || people.find(person => unreadMessageCount(person.id))?.id || people.find(person => pendingReplyCount(person.id))?.id || people[0].id;
    renderPhoneDialog(preferred);
    if (!els.phoneDialog.open) els.phoneDialog.showModal();
    selectPhonePerson(preferred, { markRead: true });
  }

  function renderPhoneSurfaces(selectedPersonId = null) {
    const people = knownPeople();
    const state = app.getState();
    const unread = unreadMessageCount();
    const pending = pendingReplyCount();
    if (els.phonePageUnreadLabel) els.phonePageUnreadLabel.textContent = unread
      ? `${unread} new message${unread === 1 ? "" : "s"}`
      : pending
        ? `${pending} ${pending === 1 ? "reply is" : "replies are"} still open`
        : "No new messages";
    if (els.navPhoneUnread) {
      els.navPhoneUnread.textContent = unread;
      els.navPhoneUnread.classList.toggle("hidden", !unread);
    }

    if (!people.length) {
      const emptyContacts = `<div class="story-phone-empty compact">No contacts yet.</div>`;
      const emptyThread = `<div class="phone-page-empty-state"><span>✉</span><strong>Your messages will live here.</strong><p>Once someone has a reason to text Luca, the conversation stays available until you want to read it.</p></div>`;
      if (els.phoneContacts) els.phoneContacts.innerHTML = emptyContacts;
      if (els.phonePageContacts) els.phonePageContacts.innerHTML = emptyContacts;
      if (els.phoneThread) els.phoneThread.innerHTML = emptyThread;
      if (els.phonePageThread) els.phonePageThread.innerHTML = emptyThread;
      return;
    }

    let selected = selectedPersonId || state.story.social.selectedPhonePersonId;
    if (!people.some(person => person.id === selected)) selected = people.find(person => unreadMessageCount(person.id))?.id || people.find(person => pendingReplyCount(person.id))?.id || people[0].id;
    state.story.social.selectedPhonePersonId = selected;

    const contactsHtml = people.map(person => {
      const count = unreadMessageCount(person.id);
      const replyOpen = pendingReplyCount(person.id);
      const active = person.id === selected;
      return `
        <button class="story-phone-contact ${active ? "active" : ""}" type="button" data-phone-person="${escapeHtml(person.id)}">
          <span class="story-phone-contact-avatar">${person.cardAsset ? `<img src="${escapeHtml(person.cardAsset)}" alt="" />` : escapeHtml(person.name?.charAt(0) || "✦")}</span>
          <span><strong>${escapeHtml(person.name)}</strong><small>${count ? `${count} unread` : replyOpen ? "Reply open · no expiry" : "Messages"}</small></span>
          ${count ? `<b class="phone-contact-unread">${count}</b>` : replyOpen ? `<b class="phone-contact-unread reply-waiting">↩</b>` : ""}
        </button>`;
    }).join("");
    if (els.phoneContacts) els.phoneContacts.innerHTML = contactsHtml;
    if (els.phonePageContacts) els.phonePageContacts.innerHTML = contactsHtml;
    renderPhoneThread(selected);
  }

  function renderPhoneDialog(selectedPersonId) {
    renderPhoneSurfaces(selectedPersonId);
  }

  function selectPhonePerson(personId, { markRead = false } = {}) {
    const state = app.getState();
    const person = knownPeople().find(item => item.id === personId);
    if (!person) return;
    state.story.social.selectedPhonePersonId = personId;

    if (markRead) {
      const read = new Set(state.story.social.readMessageIds || []);
      eligibleMessagesForPerson(personId).forEach(message => read.add(messageReadKey(message)));
      state.story.social.readMessageIds = [...read];
      app.saveState({ source: "social-message-read" });
    }

    renderPhoneSurfaces(personId);
    renderPhonePreview();
    renderPeople();
    renderPeoplePage();
  }

  function renderPhoneThread(personId) {
    const state = app.getState();
    const person = knownPeople().find(item => item.id === personId);
    if (!person) return;
    const messages = eligibleMessagesForPerson(personId);
    const headerHtml = `
      <div class="phone-thread-person">
        <span class="phone-thread-avatar">${person.cardAsset ? `<img src="${escapeHtml(person.cardAsset)}" alt="" />` : escapeHtml(person.name?.charAt(0) || "✦")}</span>
        <div><small>Messages with</small><strong>${escapeHtml(person.name)}</strong></div>
      </div>
      <span class="story-phone-thread-status">Story-linked · no expiry</span>`;
    if (els.phoneThreadHeader) els.phoneThreadHeader.innerHTML = headerHtml;
    if (els.phonePageThreadHeader) els.phonePageThreadHeader.innerHTML = headerHtml;

    let threadHtml;
    if (!messages.length) {
      threadHtml = `<div class="phone-page-empty-state"><span>✉</span><strong>No messages yet.</strong><p>Story moments can unlock a conversation later. Once it appears, it will wait here for you.</p></div>`;
    } else {
      const replies = state.story.social.messageReplies || {};
      threadHtml = messages.map(message => {
        const selectedId = replies[messageReadKey(message)];
        const selected = array(message.replyOptions).find(option => option.id === selectedId);
        const replyUi = !selected && array(message.replyOptions).length
          ? `<div class="story-message-replies">
              <small>Reply when you want</small>
              ${array(message.replyOptions).map(option => `
                <button type="button" class="story-message-reply" data-message-reply-group="${escapeHtml(messageReadKey(message))}" data-message-reply-id="${escapeHtml(option.id)}">${escapeHtml(option.text)}</button>
              `).join("")}
            </div>`
          : "";
        const selectedUi = selected
          ? `<div class="story-message-bubble outgoing">${escapeHtml(selected.text)}</div>
             ${array(selected.after).map(bubble => `<div class="story-message-bubble ${bubble.from === "luca" ? "outgoing" : "incoming"}">${escapeHtml(bubble.text || "")}</div>`).join("")}`
          : "";

        return `
          <section class="story-message-group">
            <div class="story-message-date">${escapeHtml(message.label || "Earlier")}</div>
            ${array(message.messages).map(bubble => `
              <div class="story-message-bubble ${bubble.from === "luca" ? "outgoing" : "incoming"}">
                ${escapeHtml(bubble.text || "")}
              </div>
            `).join("")}
            ${selectedUi}
            ${replyUi}
          </section>`;
      }).join("");
    }

    if (els.phoneThread) els.phoneThread.innerHTML = threadHtml;
    if (els.phonePageThread) els.phonePageThread.innerHTML = threadHtml;
    requestAnimationFrame(() => {
      if (els.phoneThread) els.phoneThread.scrollTop = els.phoneThread.scrollHeight;
      if (els.phonePageThread) els.phonePageThread.scrollTop = els.phonePageThread.scrollHeight;
    });
  }

  function chooseMessageReply(groupId, optionId) {
    const state = app.getState();
    ensureStoryState();
    if (state.story.social.messageReplies[groupId]) return;

    const message = knownPeople()
      .flatMap(person => eligibleMessagesForPerson(person.id))
      .find(item => messageReadKey(item) === groupId);
    if (!message) return;

    const option = array(message.replyOptions).find(item => item.id === optionId);
    if (!option) return;

    state.story.social.messageReplies[groupId] = option.id;
    applyEffects(option.effects || []);
    const read = new Set(state.story.social.readMessageIds || []);
    read.add(groupId);
    state.story.social.readMessageIds = [...read];
    recordSocialInteraction(message.personId, "message", groupId);
    app.saveState({ source: "social-message-reply" });
    app.renderAll();
    renderPhoneSurfaces(state.story.social.selectedPhonePersonId || message.personId);
    renderPhonePreview();
    renderPeople();
    renderPeoplePage();
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
        if (!sceneRequirementsMet(next) || state.storyEnergy < cost) return;

        state.storyEnergy = Math.max(0, Math.floor((Number(state.storyEnergy || 0) - cost + 1e-9) * 100) / 100);
        state.story.unlockedSceneIds.push(next.id);
        state.story.activeSceneId = next.id;
        state.story.readerStep = 0;
        getSceneProgressionSnapshot(next.id, { create: true });
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
      kind: "main",
      sceneId,
      replay,
      scene,
      replaySelections: {},
      progressionSnapshot: getSceneProgressionSnapshot(sceneId, { create: !replay }),
      step: 0,
      sequence: [],
      finished: false
    };

    runtime.sequence = buildSequence(runtime);
    resetVisualRenderState();
    prefetchRuntimeVisuals();
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
    closeBacklog();
    els.readerPage.classList.add("hidden");
    document.body.classList.remove("story-mode-open");
    resetVisualRenderState();
    runtime = null;
    renderStoryHub();
  }

  function buildSequence(activeRuntime) {
    const state = app.getState();
    const sequence = [];

    for (const originalNode of activeRuntime.scene.nodes || []) {
      if (!conditionMatches(originalNode, activeRuntime.progressionSnapshot)) continue;
      const node = resolveConditionalVariant(originalNode, activeRuntime.progressionSnapshot);
      sequence.push(node);

      if (node.type !== "choice") continue;

      const key = choiceKey(activeRuntime.sceneId, node.id);
      const selectionStore = ["talk", "hangout", "event"].includes(activeRuntime.kind) ? state.story.social.choiceSelections : state.story.choiceSelections;
      const selectionId = activeRuntime.replay
        ? activeRuntime.replaySelections[key]
        : selectionStore[key];
      const option = (node.options || []).find(item => item.id === selectionId);

      for (const originalExtra of option?.after || []) {
        if (!conditionMatches(originalExtra, activeRuntime.progressionSnapshot)) continue;
        sequence.push(resolveConditionalVariant(originalExtra, activeRuntime.progressionSnapshot));
      }
    }

    return sequence;
  }

  function resolveConditionalVariant(node, snapshot = null) {
    const variants = array(node?.variants)
      .filter(variant => conditionMatches(variant, snapshot))
      .slice()
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

    const selected = variants[0];
    if (!selected) return node;

    const resolved = {
      ...node,
      ...selected,
      id: node.id,
      type: selected.type || node.type
    };
    delete resolved.variants;
    delete resolved.when;
    delete resolved.unless;
    delete resolved.priority;
    return resolved;
  }

  function conditionMatches(node, snapshot = null) {
    const state = app.getState();
    const traits = state.story?.traits || {};
    const flags = state.flags || {};
    const relationships = state.story?.relationships || {};

    if (node.when?.trait && !traits[node.when.trait]) return false;
    if (Array.isArray(node.when?.traits) && node.when.traits.some(key => !traits[key])) return false;
    if (Array.isArray(node.when?.anyTrait) && !node.when.anyTrait.some(key => Boolean(traits[key]))) return false;
    if (node.when?.traitEquals && traits[node.when.traitEquals.key] !== node.when.traitEquals.value) return false;
    if (node.when?.flag && !flags[node.when.flag]) return false;
    if (Array.isArray(node.when?.flags) && node.when.flags.some(key => !flags[key])) return false;
    if (node.unless?.trait && traits[node.unless.trait]) return false;
    if (Array.isArray(node.unless?.traits) && node.unless.traits.some(key => Boolean(traits[key]))) return false;
    if (node.unless?.flag && flags[node.unless.flag]) return false;
    if (Array.isArray(node.unless?.flags) && node.unless.flags.some(key => Boolean(flags[key]))) return false;

    if (node.when?.capability && !progressionRequirementMatches({ type: "capability", ...node.when.capability }, snapshot)) return false;
    if (node.when?.realmRank && !progressionRequirementMatches({ type: "realmRank", ...node.when.realmRank }, snapshot)) return false;
    if (Array.isArray(node.when?.capabilities) && node.when.capabilities.some(req => !progressionRequirementMatches({ type: "capability", ...req }, snapshot))) return false;
    if (Array.isArray(node.when?.realmRanks) && node.when.realmRanks.some(req => !progressionRequirementMatches({ type: "realmRank", ...req }, snapshot))) return false;
    if (node.unless?.capability && progressionRequirementMatches({ type: "capability", ...node.unless.capability }, snapshot)) return false;
    if (node.unless?.realmRank && progressionRequirementMatches({ type: "realmRank", ...node.unless.realmRank }, snapshot)) return false;

    if (node.when?.progression && typeof app.evaluateProgressionCondition === "function") {
      if (!app.evaluateProgressionCondition(node.when.progression, { snapshot })) return false;
    }
    if (Array.isArray(node.when?.anyProgression) && typeof app.evaluateProgressionCondition === "function") {
      if (!node.when.anyProgression.some(condition => app.evaluateProgressionCondition(condition, { snapshot }))) return false;
    }
    if (node.unless?.progression && typeof app.evaluateProgressionCondition === "function") {
      if (app.evaluateProgressionCondition(node.unless.progression, { snapshot })) return false;
    }

    if (node.when?.relationship) {
      const requirement = node.when.relationship;
      const value = Number(relationships?.[requirement.key]?.[requirement.stat] || 0);
      if (requirement.min != null && value < Number(requirement.min)) return false;
      if (requirement.max != null && value > Number(requirement.max)) return false;
    }

    return true;
  }

  function availableChoiceOptions(node, snapshot = runtime?.progressionSnapshot || null) {
    const options = array(node?.options);
    const visible = options.filter(option => conditionMatches(option, snapshot));
    if (visible.length) return visible;

    // A story pack should always include at least one unconditional response. This
    // fallback prevents a malformed future pack from trapping the reader.
    return options.filter(option => !option.when && !option.unless);
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
      applyVisual(resolveVisualStateAtStep(runtime.step), node);
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

    animateNodeContent();
  }

  function renderReaderChrome() {
    if (!runtime) return;
    const state = app.getState();
    const total = Math.max(1, runtime.sequence.length);
    const current = runtime.finished ? total : Math.min(total, runtime.step + 1);
    const percent = runtime.finished ? 100 : Math.max(2, Math.min(100, (current / total) * 100));

    const isTalk = runtime.kind === "talk";
    const isHangout = runtime.kind === "hangout";
    const isEvent = runtime.kind === "event";
    const isFreeSocial = isTalk || isHangout || isEvent;
    els.shell.dataset.mood = runtime.scene.mood || "default";
    els.shell.dataset.replay = runtime.replay ? "true" : "false";
    els.shell.dataset.kind = isTalk ? "talk" : isHangout ? "hangout" : isEvent ? "event" : "main";
    els.chapterLabel.textContent = isTalk ? (runtime.scene.chapterLabel || "TALK") : isHangout ? (runtime.scene.chapterLabel || "HANG OUT") : isEvent ? (runtime.scene.chapterLabel || "WORLD MOMENT") : (runtime.scene.chapterLabel || `Chapter ${String(runtime.scene.order || 1).padStart(2, "0")}`);
    els.sceneTitle.textContent = runtime.scene.title || (isTalk ? "Talk" : isHangout ? "Hang Out" : isEvent ? "A little moment" : "Story");
    els.location.textContent = runtime.scene.location || (isTalk ? "Somewhere nearby" : isHangout ? "Out together" : isEvent ? "Everyday life" : "Story");
    els.beatLabel.textContent = runtime.finished ? "Complete" : `${isTalk ? "Talk" : isHangout ? "Hangout" : isEvent ? "Moment" : "Scene"} ${current}`;
    els.energy.textContent = isFreeSocial ? "Free" : (app.formatEnergy?.(state.storyEnergy) ?? state.storyEnergy);
    els.energySide.textContent = isFreeSocial ? "Free" : (app.formatEnergy?.(state.storyEnergy) ?? state.storyEnergy);
    els.progressReaderLabel.textContent = `${current} / ${total}`;
    els.progressReaderBar.style.width = `${percent}%`;
    if (els.miniProgressBar) els.miniProgressBar.style.width = `${percent}%`;
    els.saveStatus.textContent = runtime.replay
      ? "Replay mode · choices do not alter canon"
      : isTalk ? "Free social interaction · autosaved" : isHangout ? "Free hangout · autosaved" : isEvent ? "World moment · autosaved" : "Autosaved to local + cloud";

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
    const selectionStore = ["talk", "hangout", "event"].includes(runtime.kind) ? state.story.social.choiceSelections : state.story.choiceSelections;
    const canonSelectedId = selectionStore[key];
    const replaySelectedId = runtime.replaySelections[key];

    els.beatContent.innerHTML = "";
    const prompt = document.createElement("p");
    prompt.className = "story-choice-prompt";
    prompt.textContent = node.prompt || "What do I do?";
    els.beatContent.appendChild(prompt);

    els.advance.classList.add("hidden");
    els.choices.classList.remove("hidden");

    const visibleOptions = availableChoiceOptions(node);

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

    if (!visibleOptions.length) {
      els.choices.classList.add("hidden");
      els.advance.classList.remove("hidden");
      els.advance.innerHTML = `Continue <span>›</span>`;
      return;
    }

    els.choices.innerHTML = visibleOptions.map(option => {
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

    const option = availableChoiceOptions(node).find(item => item.id === optionId);
    if (!option) return;

    const key = choiceKey(runtime.sceneId, node.id);
    const choiceIndex = runtime.sequence.findIndex(item => item === node || item.id === node.id);

    if (runtime.replay) {
      runtime.replaySelections[key] = option.id;
      runtime.sequence = buildSequence(runtime);
      prefetchRuntimeVisuals();
      const newIndex = runtime.sequence.findIndex(item => item.id === node.id);
      runtime.step = Math.max(0, newIndex + 1);
      runtime.finished = false;
      renderReaderNode();
      return;
    }

    const state = app.getState();
    const selectionStore = ["talk", "hangout", "event"].includes(runtime.kind) ? state.story.social.choiceSelections : state.story.choiceSelections;
    if (selectionStore[key]) return;

    selectionStore[key] = option.id;
    applyEffects(option.effects || []);
    runtime.sequence = buildSequence(runtime);
    prefetchRuntimeVisuals();
    const newIndex = runtime.sequence.findIndex(item => item.id === node.id);
    runtime.step = Math.max(0, newIndex + 1);
    if (runtime.kind === "talk") {
      state.story.social.talkStep = runtime.step;
      state.story.social.activeTalkId = runtime.sceneId;
    } else if (runtime.kind === "hangout") {
      state.story.social.hangoutStep = runtime.step;
      state.story.social.activeHangoutId = runtime.sceneId;
    } else if (runtime.kind === "event") {
      state.story.social.randomEventStep = runtime.step;
      state.story.social.activeRandomEventId = runtime.sceneId;
    } else {
      state.story.readerStep = runtime.step;
    }
    app.saveState({ source: runtime.kind === "talk" ? "social-talk-choice" : runtime.kind === "hangout" ? "social-hangout-choice" : runtime.kind === "event" ? "social-world-moment-choice" : "story-choice" });
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
    if (runtime.kind === "talk") {
      state.story.social.talkStep = runtime.step;
      state.story.social.activeTalkId = runtime.sceneId;
      app.saveState({ source: "social-talk-reading" });
      els.saveStatus.textContent = "Free social interaction · autosaved";
      return;
    }
    if (runtime.kind === "hangout") {
      state.story.social.hangoutStep = runtime.step;
      state.story.social.activeHangoutId = runtime.sceneId;
      app.saveState({ source: "social-hangout-reading" });
      els.saveStatus.textContent = "Free hangout · autosaved";
      return;
    }
    if (runtime.kind === "event") {
      state.story.social.randomEventStep = runtime.step;
      state.story.social.activeRandomEventId = runtime.sceneId;
      state.story.social.queuedRandomEventId = runtime.sceneId;
      app.saveState({ source: "social-world-moment-reading" });
      els.saveStatus.textContent = "World moment · autosaved";
      return;
    }
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

    if (runtime.kind === "talk") {
      const social = state.story.social;
      const alreadySeen = social.seenTalkIds.includes(scene.id);
      if (!alreadySeen || !scene.once) applyEffects(scene.onComplete || []);
      if (!alreadySeen) social.seenTalkIds.push(scene.id);
      social.talkCounts[scene.id] = Number(social.talkCounts[scene.id] || 0) + 1;
      social.lastTalkId = scene.id;
      runtime.dailyTalkBondAwarded = awardDailyTalkBond(scene.personId);
      recordSocialInteraction(scene.personId, "talk", scene.id);
      social.activeTalkId = null;
      social.talkStep = 0;
      social.activeTalkProgressionSnapshot = null;
      app.saveState({ source: "social-talk-complete" });
      app.renderAll();
      runtime.finished = true;
      renderFinishedState(false);
      return;
    }

    if (runtime.kind === "hangout") {
      const social = state.story.social;
      const alreadyComplete = social.completedHangoutIds.includes(scene.id);
      if (!alreadyComplete || !scene.once) applyEffects(scene.onComplete || []);
      if (!alreadyComplete) social.completedHangoutIds.push(scene.id);
      social.hangoutCounts[scene.id] = Number(social.hangoutCounts[scene.id] || 0) + 1;
      recordSocialInteraction(scene.personId, "hangout", scene.id);
      social.activeHangoutId = null;
      social.hangoutStep = 0;
      social.activeHangoutProgressionSnapshot = null;
      app.saveState({ source: "social-hangout-complete" });
      app.renderAll();
      runtime.finished = true;
      renderFinishedState(false);
      return;
    }

    if (runtime.kind === "event") {
      const social = state.story.social;
      const alreadyComplete = array(social.completedRandomEventIds).includes(scene.id);
      if (!alreadyComplete || !scene.once) applyEffects(scene.onComplete || []);
      if (scene.once && !alreadyComplete) social.completedRandomEventIds.push(scene.id);
      social.randomEventHistory = [...array(social.randomEventHistory), { id: scene.id, at: new Date().toISOString() }].slice(-120);
      if (scene.personId) recordSocialInteraction(scene.personId, "event", scene.id);
      social.activeRandomEventId = null;
      social.randomEventStep = 0;
      social.activeRandomEventProgressionSnapshot = null;
      social.queuedRandomEventId = null;
      social.queuedRandomEventAt = null;
      app.saveState({ source: "social-world-moment-complete" });
      app.renderAll();
      runtime.finished = true;
      renderFinishedState(false);
      return;
    }

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
    const isTalk = runtime?.kind === "talk";
    const isHangout = runtime?.kind === "hangout";
    const isEvent = runtime?.kind === "event";
    renderReaderChrome();
    els.beatContent.innerHTML = "";

    const kicker = document.createElement("p");
    kicker.className = "story-completion-kicker";
    kicker.textContent = replay ? "Memory replay complete" : isTalk ? "Talk complete" : isHangout ? "Hangout complete" : isEvent ? "Moment complete" : "Chapter complete";

    const title = document.createElement("h2");
    title.className = "story-completion-title";
    title.textContent = replay ? runtime.scene.title : isTalk ? (runtime.scene.completeTitle || "A little more familiar") : isHangout ? (runtime.scene.completeTitle || "Time well spent") : isEvent ? (runtime.scene.completeTitle || "A small moment") : (memory?.title || runtime.scene.title);

    const copy = document.createElement("p");
    copy.className = "story-prose-paragraph";
    copy.textContent = replay
      ? "This was a sandboxed replay. Any different answers you tried here were not written into your canon save."
      : isTalk
        ? (runtime?.dailyTalkBondAwarded
          ? "That was your first completed Talk with this person today, so the connection quietly grew. Keep talking as much as you like; extra Talks today are for the conversation, not extra relationship progress."
          : "That conversation is now part of your social history. You already earned today’s Talk relationship progress with this person, so extra chats are simply here because you feel like talking.")
        : isHangout
          ? "That time together is now part of your social history. Hangouts never cost Story Energy."
          : isEvent
            ? "That little moment is now part of your social history. Spontaneous moments never cost Story Energy and can quietly reflect the life you are actually living."
            : "My choices and hidden relationship state have been saved. This chapter is now available in Memories.";

    els.beatContent.append(kicker, title, copy);
    els.choices.classList.add("hidden");
    els.choices.innerHTML = "";
    els.advance.classList.remove("hidden");
    els.advance.innerHTML = `${replay ? "Return to Memories" : "Return to Story Hub"} <span>›</span>`;
    els.beatLabel.textContent = "Complete";
    els.progressReaderBar.style.width = "100%";
    els.saveStatus.textContent = replay ? "Replay only · canon unchanged" : isTalk ? "Social history saved" : isHangout ? "Hangout saved" : isEvent ? "World moment saved" : "Saved";
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

  function resolveVisualStateAtStep(step) {
    const base = {
      mode: "dialogue",
      background: contextualBackgroundForRuntime(runtime),
      cg: null,
      characters: [],
      focus: null,
      portrait: null,
      portraitExpression: null
    };

    if (!runtime?.sequence?.length) return base;

    const max = Math.min(Math.max(0, Number(step || 0)), runtime.sequence.length - 1);
    let state = base;

    for (let index = 0; index <= max; index += 1) {
      const patch = runtime.sequence[index]?.visual;
      if (!patch || typeof patch !== "object") continue;
      state = mergeVisualState(state, patch);
    }

    return state;
  }

  function mergeVisualState(previous, patch) {
    const next = {
      ...previous,
      characters: Array.isArray(previous.characters) ? [...previous.characters] : []
    };

    if (Object.prototype.hasOwnProperty.call(patch, "mode")) next.mode = patch.mode || "dialogue";
    if (Object.prototype.hasOwnProperty.call(patch, "background")) {
      next.background = patch.background || null;
      if (patch.background) next.cg = null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "cg")) {
      next.cg = patch.cg || null;
      if (patch.cg) next.background = null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "characters")) {
      next.characters = Array.isArray(patch.characters) ? [...patch.characters] : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "focus")) next.focus = patch.focus || null;
    if (Object.prototype.hasOwnProperty.call(patch, "portrait")) next.portrait = patch.portrait || null;
    if (Object.prototype.hasOwnProperty.call(patch, "portraitExpression")) {
      next.portraitExpression = patch.portraitExpression || null;
      if (next.portrait && next.portraitExpression) {
        next.portrait = { ...next.portrait, expression: next.portraitExpression };
      }
    }

    return next;
  }

  function contextualBackgroundForRuntime(activeRuntime = runtime) {
    const backgrounds = pack?.assets?.backgrounds || {};
    const explicit = activeRuntime?.scene?.visualDefault?.background || activeRuntime?.scene?.defaultBackground || null;
    if (explicit && backgrounds[explicit]?.src) return explicit;

    const firstDeclared = firstBackgroundInSequence(activeRuntime?.sequence, backgrounds);
    if (firstDeclared) return firstDeclared;

    return inferBackgroundFromLocation(activeRuntime?.scene?.location, backgrounds);
  }

  function firstBackgroundInSequence(sequence, backgrounds) {
    for (const node of array(sequence)) {
      const key = node?.visual?.background;
      if (key && backgrounds?.[key]?.src) return key;
    }
    return null;
  }

  function inferBackgroundFromLocation(location, backgrounds) {
    const value = String(location || "").toLowerCase();
    const candidates = [];

    if (/school|classroom|hallway|senior high|academy/.test(value)) candidates.push("schoolHallway");
    if (/café|cafe|coffee|bookstore/.test(value)) candidates.push("cityCafe");
    if (/station|commute|train|platform/.test(value)) candidates.push("stationEvening");
    if (/gym|training/.test(value)) candidates.push("gym");
    if (/shared apartment|new apartment|possible new apartment/.test(value)) candidates.push("sharedApartment");
    if (/apartment|home|room/.test(value)) candidates.push("homeMorning");
    if (/collector|district|city|street|outside|evening/.test(value)) candidates.push("cityDusk");

    return candidates.find(key => backgrounds?.[key]?.src) || null;
  }

  function backgroundAssetForVisual(visual, backgroundAssets) {
    if (visual?.cg) return { src: visual.cg };
    const requested = visual?.background;
    if (requested && backgroundAssets?.[requested]?.src) return backgroundAssets[requested];
    const fallback = contextualBackgroundForRuntime(runtime);
    return fallback && backgroundAssets?.[fallback]?.src ? backgroundAssets[fallback] : null;
  }

  function applyVisual(visual, node = null) {
    const characterAssets = pack?.assets?.characters || {};
    const backgroundAssets = pack?.assets?.backgrounds || {};
    const mode = visual?.mode || "dialogue";
    const bg = backgroundAssetForVisual(visual, backgroundAssets);
    const characters = Array.isArray(visual?.characters) ? visual.characters : [];
    const portraitSpec = resolvePortraitSpec(visual, characters, characterAssets);

    renderTextboxPortrait(portraitSpec, characterAssets);

    const stageCharacters = normalizeStageCharacters(characters.filter(item => {
      if (!item?.id) return false;
      if (item.stage === false) return false;
      if (portraitSpec && item.id === portraitSpec.id && mode !== "cg") return Boolean(item.allowSceneDuplicate);
      return true;
    }));
    const focusId = visual?.focus || inferFocusIdFromNode(node, stageCharacters, characterAssets);

    const bgSrc = bg?.src ? String(bg.src) : "";
    const previousBg = els.visualBackdrop?.dataset?.assetSrc || "";
    if (els.visualBackdrop) {
      if (bgSrc) {
        if (previousBg !== bgSrc) {
          els.visualBackdrop.style.backgroundImage = `url("${bgSrc.replace(/"/g, "%22")}")`;
          els.visualBackdrop.dataset.assetSrc = bgSrc;
          restartAnimationClass(els.visualBackdrop, "is-backdrop-changing");
        }
      } else if (previousBg) {
        els.visualBackdrop.style.backgroundImage = "none";
        delete els.visualBackdrop.dataset.assetSrc;
      }
    }

    if (mode === "cg") els.visualStage.dataset.mode = "cg";
    else delete els.visualStage.dataset.mode;

    const desired = { left: null, center: null, right: null };
    for (const item of stageCharacters) {
      const asset = resolveCharacterAsset(characterAssets?.[item.id], item);
      if (!asset?.src) continue;
      const side = item.side === "left" ? "left" : item.side === "center" ? "center" : "right";
      desired[side] = {
        item,
        asset,
        label: characterAssets?.[item.id]?.name || item.id || "Character"
      };
    }

    updateSpriteSlot(els.spriteLeft, desired.left, focusId);
    updateSpriteSlot(els.spriteCenter, desired.center, focusId);
    updateSpriteSlot(els.spriteRight, desired.right, focusId);

    const visibleCount = Object.values(desired).filter(Boolean).length;
    els.visualStage.dataset.characterCount = String(visibleCount);
    if (focusId) els.visualStage.dataset.focusCharacter = focusId;
    else delete els.visualStage.dataset.focusCharacter;

    const shouldShow = Boolean(bgSrc || visibleCount);
    els.visualStage.classList.toggle("hidden", !shouldShow);
    els.visualStage.setAttribute("aria-hidden", shouldShow ? "false" : "true");
  }

  function normalizeStageCharacters(characters) {
    const list = array(characters).filter(Boolean).slice(0, 3).map(item => ({ ...item }));
    if (list.length <= 1) return list;

    // Ensemble staging is intentionally deterministic. Two people flank Luca/player;
    // three people use left/center/right with slight visual overlap in CSS.
    const slots = list.length === 2 ? ["left", "right"] : ["left", "center", "right"];
    list.forEach((item, index) => { item.side = slots[index]; });
    return list;
  }

  function updateSpriteSlot(target, desired, focusId) {
    if (!target) return;
    if (!desired) {
      target.classList.add("hidden");
      target.classList.remove("is-active", "is-muted", "is-entering", "is-expression-changing");
      target.innerHTML = "";
      delete target.dataset.characterId;
      delete target.dataset.expression;
      delete target.dataset.assetSrc;
      return;
    }

    const { item, asset, label } = desired;
    const src = String(asset.src);
    const previousSrc = target.dataset.assetSrc || "";
    const previousCharacter = target.dataset.characterId || "";
    const characterChanged = Boolean(previousCharacter && previousCharacter !== item.id);
    const expressionChanged = Boolean(previousSrc && previousSrc !== src && !characterChanged);
    let img = target.querySelector("img");

    if (!img) {
      img = document.createElement("img");
      target.replaceChildren(img);
    }

    if (previousSrc !== src) img.src = src;
    img.alt = label;
    target.dataset.characterId = item.id || "";
    target.dataset.expression = item.expression || "neutral";
    target.dataset.assetSrc = src;
    target.classList.remove("hidden", "is-entering", "is-expression-changing");
    target.classList.toggle("is-active", !focusId || focusId === item.id);
    target.classList.toggle("is-muted", Boolean(focusId && focusId !== item.id));

    if (!previousSrc || characterChanged) restartAnimationClass(target, "is-entering");
    else if (expressionChanged) restartAnimationClass(target, "is-expression-changing");
  }

  function inferFocusIdFromNode(node, characters, characterAssets) {
    const dialogue = array(node?.content).filter(block => block?.kind === "dialogue" && block?.speaker).at(-1);
    if (!dialogue?.speaker) return null;
    const speaker = normalizeStoryName(dialogue.speaker);
    if (!speaker) return null;

    for (const item of characters || []) {
      const id = String(item?.id || "");
      const fullName = String(characterAssets?.[id]?.name || "");
      const candidates = [id, fullName, ...fullName.split(/\s+/)].map(normalizeStoryName).filter(Boolean);
      if (candidates.some(candidate => speaker === candidate || speaker.includes(candidate) || candidate.includes(speaker))) return id;
    }
    return null;
  }

  function normalizeStoryName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
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
      delete els.textboxPortrait.dataset.assetSrc;
      return;
    }

    const asset = resolveCharacterAsset(characterAssets?.[spec.id], spec);
    if (!asset?.src) {
      els.textboxPortrait.classList.add("hidden");
      els.textboxPortraitImg.removeAttribute("src");
      els.textboxPortraitImg.alt = "";
      delete els.textboxPortrait.dataset.assetSrc;
      return;
    }

    const label = characterAssets?.[spec.id]?.name || spec.id;
    const src = String(asset.src);
    const previousSrc = els.textboxPortrait.dataset.assetSrc || "";
    els.textboxPortrait.classList.remove("hidden");
    els.textboxPortrait.dataset.characterId = spec.id;
    els.textboxPortrait.dataset.expression = spec.expression || "neutral";
    els.textboxPortrait.dataset.assetSrc = src;
    if (previousSrc !== src) {
      els.textboxPortraitImg.src = src;
      restartAnimationClass(els.textboxPortrait, previousSrc ? "is-expression-changing" : "is-entering");
    }
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
      el.classList.remove("is-active", "is-muted", "is-entering", "is-expression-changing");
      delete el.dataset.characterId;
      delete el.dataset.expression;
      delete el.dataset.assetSrc;
      el.innerHTML = "";
    });
    if (els.textboxPortrait) {
      els.textboxPortrait.classList.add("hidden");
      els.textboxPortrait.classList.remove("is-entering", "is-expression-changing");
      delete els.textboxPortrait.dataset.characterId;
      delete els.textboxPortrait.dataset.expression;
      delete els.textboxPortrait.dataset.assetSrc;
    }
    if (els.textboxPortraitImg) {
      els.textboxPortraitImg.removeAttribute("src");
      els.textboxPortraitImg.alt = "";
    }
  }

  function resetVisualRenderState() {
    clearSprites();
    if (els.visualBackdrop) {
      els.visualBackdrop.style.backgroundImage = "none";
      els.visualBackdrop.classList.remove("is-backdrop-changing");
      delete els.visualBackdrop.dataset.assetSrc;
    }
    if (els.visualStage) {
      els.visualStage.classList.add("hidden");
      els.visualStage.setAttribute("aria-hidden", "true");
      delete els.visualStage.dataset.mode;
      delete els.visualStage.dataset.characterCount;
      delete els.visualStage.dataset.focusCharacter;
    }
  }

  function restartAnimationClass(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.addEventListener("animationend", () => element.classList.remove(className), { once: true });
  }

  function animateNodeContent() {
    restartAnimationClass(els.beatContent, "is-node-entering");
    if (!els.choices?.classList.contains("hidden")) restartAnimationClass(els.choices, "is-node-entering");
  }

  function prefetchRuntimeVisuals() {
    if (!runtime?.sequence?.length || !pack?.assets) return;
    const urls = new Set();
    const characterAssets = pack.assets.characters || {};
    const backgroundAssets = pack.assets.backgrounds || {};
    const contextualBackground = contextualBackgroundForRuntime(runtime);
    if (contextualBackground && backgroundAssets?.[contextualBackground]?.src) {
      urls.add(String(backgroundAssets[contextualBackground].src));
    }

    for (const node of runtime.sequence) {
      const visual = node?.visual;
      if (!visual || typeof visual !== "object") continue;
      if (visual.cg) urls.add(String(visual.cg));
      if (visual.background && backgroundAssets?.[visual.background]?.src) urls.add(String(backgroundAssets[visual.background].src));
      for (const item of array(visual.characters)) {
        const asset = resolveCharacterAsset(characterAssets?.[item?.id], item);
        if (asset?.src) urls.add(String(asset.src));
      }
      const portrait = resolvePortraitSpec(visual, array(visual.characters), characterAssets);
      const portraitAsset = resolveCharacterAsset(characterAssets?.[portrait?.id], portrait);
      if (portraitAsset?.src) urls.add(String(portraitAsset.src));
    }

    for (const src of urls) {
      if (!src || prefetchedStoryAssets.has(src)) continue;
      prefetchedStoryAssets.add(src);
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    }
  }

  function openBacklog() {
    if (!runtime || !els.backlog || !els.backlogList) return;
    renderBacklog();
    els.backlog.classList.remove("hidden");
    document.body.classList.add("story-backlog-open");
    requestAnimationFrame(() => els.backlogClose?.focus({ preventScroll: true }));
  }

  function closeBacklog() {
    if (!els.backlog) return;
    const wasOpen = !els.backlog.classList.contains("hidden");
    els.backlog.classList.add("hidden");
    document.body.classList.remove("story-backlog-open");
    if (wasOpen && runtime) {
      requestAnimationFrame(() => {
        if (runtime && !els.readerPage?.classList.contains("hidden")) els.backlogOpen?.focus({ preventScroll: true });
      });
    }
  }

  function renderBacklog() {
    if (!runtime || !els.backlogList) return;
    els.backlogList.innerHTML = "";
    const maxIndex = runtime.finished
      ? Math.max(0, runtime.sequence.length - 1)
      : Math.min(runtime.step, Math.max(0, runtime.sequence.length - 1));
    const fragment = document.createDocumentFragment();
    let rendered = 0;

    for (let index = 0; index <= maxIndex; index += 1) {
      const node = runtime.sequence[index];
      if (!node) continue;
      const entry = document.createElement("article");
      entry.className = `story-backlog-entry ${node.type === "choice" ? "is-choice" : ""}`;

      if (node.type === "choice") {
        const prompt = document.createElement("p");
        prompt.className = "story-backlog-choice-prompt";
        prompt.textContent = node.prompt || "What do I do?";
        entry.appendChild(prompt);

        const selectedId = selectedChoiceIdForBacklog(node);
        const selected = array(node.options).find(option => option.id === selectedId);
        if (selected) {
          const answer = document.createElement("p");
          answer.className = "story-backlog-choice-answer";
          answer.textContent = selected.text || "";
          entry.appendChild(answer);
        }
      } else {
        for (const block of array(node.content)) {
          if (!block?.text) continue;
          if (block.kind === "dialogue") {
            const line = document.createElement("div");
            line.className = "story-backlog-dialogue";
            const speaker = document.createElement("strong");
            speaker.textContent = block.speaker || "Dialogue";
            const text = document.createElement("span");
            text.textContent = block.text;
            line.append(speaker, text);
            entry.appendChild(line);
          } else {
            const text = document.createElement("p");
            text.className = block.kind === "thought" ? "story-backlog-thought" : "story-backlog-prose";
            text.textContent = block.text;
            entry.appendChild(text);
          }
        }
      }

      if (!entry.childNodes.length) continue;
      fragment.appendChild(entry);
      rendered += 1;
    }

    if (!rendered) {
      const empty = document.createElement("div");
      empty.className = "story-backlog-empty";
      empty.textContent = "Nothing to look back on yet.";
      fragment.appendChild(empty);
    }

    els.backlogList.appendChild(fragment);
    requestAnimationFrame(() => { els.backlogList.scrollTop = els.backlogList.scrollHeight; });
  }

  function selectedChoiceIdForBacklog(node) {
    if (!runtime || !node) return null;
    const state = app.getState();
    const key = choiceKey(runtime.sceneId, node.id);
    const store = ["talk", "hangout"].includes(runtime.kind) ? state.story.social.choiceSelections : state.story.choiceSelections;
    if (runtime.replay) return runtime.replaySelections[key] || store[key] || null;
    return store[key] || null;
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
    beginOrContinue: handleStoryAction,
    openTalk: openNextTalk,
    openPhone,
    getWorldLocationStatus,
    visitWorldLocation
  };
})();
