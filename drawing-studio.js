(() => {
  "use strict";

  const VERSION = "0.31.4cf";
  const DB_NAME = "life-rpg-drawing-studio-v2";
  const STORE = "drawings";
  const META_KEY = "lifeRpgDrawingStudioMetaV2";
  const LEGACY_META_KEY = "lifeRpgDrawingStudioMetaV1";
  const REWARD_QUEUE_KEY = "lifeRpgDrawingStudioRewardQueueV1";
  const WIDTH = 1200;
  const HEIGHT = 900;
  const MAX_ACTIONS = 800;

  const TRACKS = [
    { id: "all", icon: "✦", title: "All challenges", blurb: "Everything in V2" },
    { id: "dynamic", icon: "⚡", title: "Dynamic Figures", blurb: "Gesture, action, flow" },
    { id: "anatomy", icon: "◇", title: "Hands & Anatomy", blurb: "Structure and proportion" },
    { id: "hair", icon: "〰", title: "Faces & Hair", blurb: "Hair masses and motion" },
    { id: "perspective", icon: "▱", title: "Perspective & BG", blurb: "Space and environments" },
    { id: "rendering", icon: "◐", title: "Color & Rendering", blurb: "Value and light" },
    { id: "story", icon: "✧", title: "Story Illustration", blurb: "Images that communicate" }
  ];

  const REWARDS = {
    small:  { xp: 10, realmXP: 10, statXP: 7, coins: 8, storyEnergyBase: .20, skillXP: 8 },
    medium: { xp: 14, realmXP: 14, statXP: 10, coins: 12, storyEnergyBase: .28, skillXP: 11 },
    large:  { xp: 19, realmXP: 19, statXP: 14, coins: 16, storyEnergyBase: .38, skillXP: 15 },
    epic:   { xp: 28, realmXP: 28, statXP: 20, coins: 24, storyEnergyBase: .55, skillXP: 22 }
  };

  const CHALLENGES = [
    {
      id: "gesture-30s-five",
      track: "dynamic",
      icon: "⚡",
      type: "TIMED GESTURE",
      title: "5× 30s Gesture Burst",
      summary: "Five tiny poses where motion matters more than anatomy.",
      goal: "Train your eye to find the whole pose, line of action and weight before details steal your attention.",
      remember: "These are allowed to look messy. If a pose reads in a few sweeping lines, the exercise is working.",
      steps: [
        "Pick a figure reference and find the main line of action before drawing anything else.",
        "Add only the head, ribcage/pelvis direction and limb flow.",
        "Stop when the 30 seconds end — do not polish.",
        "Repeat for five different poses and compare which one feels most alive."
      ],
      minutes: 3,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Gesture", "Warm-up", "Pose"],
      timer: { rounds: 5, secondsPerRound: 30 },
      referenceTitle: "Figure reference",
      referenceText: "Use any pose reference. Line of Action's figure practice tool is ideal for fast timed poses.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawGestureGuide
    },
    {
      id: "gesture-2m-three",
      track: "dynamic",
      icon: "⏱",
      type: "TIMED GESTURE",
      title: "3× 2-Minute Action Pose",
      summary: "Long enough to add structure, short enough to keep the energy.",
      goal: "Keep the gesture while adding ribcage, pelvis and simple limbs as three-dimensional masses.",
      remember: "Do not replace the gesture with an outline. Build on top of it.",
      steps: [
        "Spend the first 20 seconds on line of action and tilt.",
        "Block in ribcage and pelvis as simple volumes.",
        "Connect limbs with cylinders or tapered forms.",
        "Use the final seconds only to clarify overlaps and weight."
      ],
      minutes: 6,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Gesture", "Structure", "Pose"],
      timer: { rounds: 3, secondsPerRound: 120 },
      referenceTitle: "Figure reference",
      referenceText: "Use a different pose each round. Aim for action, not finished anatomy.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawGestureStructureGuide
    },
    {
      id: "push-the-pose",
      track: "dynamic",
      icon: "↗",
      type: "POSE DESIGN",
      title: "Push the Pose",
      summary: "Draw a pose once, then redraw it with stronger curves, tilt and intent.",
      goal: "Learn to exaggerate a pose without losing its balance or readability.",
      remember: "The second version should feel more decisive, not merely more distorted.",
      steps: [
        "Sketch the reference pose simply on the left side.",
        "Identify the biggest curve, counter-curve and weight-bearing leg.",
        "On the right, exaggerate those choices by roughly 15–30%.",
        "Compare silhouettes: which version communicates the action faster?"
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Gesture", "Exaggeration", "Pose"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Pose reference",
      referenceText: "Use a standing, reaching, running or turning pose. The built-in split guide is only a workspace cue.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawPushPoseGuide
    },
    {
      id: "ribcage-pelvis-twist",
      track: "anatomy",
      icon: "◇",
      type: "CONSTRUCTION",
      title: "Ribcage + Pelvis Twist",
      summary: "Six tiny torsos: tilt, lean and twist without arms or details.",
      goal: "See the torso as two major masses with an elastic relationship instead of one stiff block.",
      remember: "Keep them simple enough that you can clearly see which way each mass faces.",
      steps: [
        "Use the six guide slots as separate mini studies.",
        "Draw ribcage as an egg/box and pelvis as a simplified block.",
        "Change tilt, twist and lean in every slot.",
        "Add one centerline around each mass to show its orientation."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Anatomy", "Torso", "Twist"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Construction guide",
      referenceText: "The faint examples show orientation only; invent your own six combinations rather than tracing them exactly.",
      guide: drawTorsoTwistGuide
    },
    {
      id: "action-mannequin",
      track: "anatomy",
      icon: "◈",
      type: "CONSTRUCTION",
      title: "Action Mannequin",
      summary: "Build one dynamic figure entirely from simple 3D forms before anatomy.",
      goal: "Make the body occupy believable space so anatomy has something solid to sit on later.",
      remember: "Boxes, cylinders and spheres are not childish shortcuts — they are the structure.",
      steps: [
        "Lay down a line of action.",
        "Add head, ribcage and pelvis as simple masses with clear perspective.",
        "Build limbs from cylinders and joints from simple balls/hinges.",
        "Only after the mannequin reads clearly, add a loose outer contour."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Construction", "3D Form", "Pose"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Pose reference",
      referenceText: "Choose any dynamic figure photo. Reduce it aggressively to simple forms first.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawMannequinGuide
    },
    {
      id: "hand-open-fist-point",
      track: "anatomy",
      icon: "✋",
      type: "HAND STUDY",
      title: "Open / Fist / Point",
      summary: "Three hand gestures built from palm mass, finger groups and direction.",
      goal: "Stop thinking of hands as ten complicated outlines and start seeing a palm block plus grouped finger forms.",
      remember: "Get the gesture and palm angle right before separating every finger.",
      steps: [
        "Block the palm as a flattened box or wedge.",
        "Mark the knuckle arc and thumb base.",
        "Group the fingers before drawing individual digits.",
        "Do one open hand, one fist and one pointing hand."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Hands", "Construction", "Gesture"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Hand reference",
      referenceText: "Use photo references; the guide only shows the three workspace targets.",
      referenceUrl: "https://line-of-action.com/practice-tools",
      guide: drawHandSlotsGuide
    },
    {
      id: "hands-doing-something",
      track: "anatomy",
      icon: "☕",
      type: "INTERACTION STUDY",
      title: "Hands Doing Something",
      summary: "A hand holding a mug, phone, sleeve or other object.",
      goal: "Practice contact, grip and object interaction so hands become part of the story instead of isolated anatomy homework.",
      remember: "Draw the object first. The hand has to wrap around something that actually exists in space.",
      steps: [
        "Choose a simple object and draw its main volume in perspective.",
        "Add the palm mass where it contacts the object.",
        "Place the thumb and finger group around the form.",
        "Clarify overlaps and pressure/contact points last."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Hands", "Props", "Interaction"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Hand + object reference",
      referenceText: "A photo of your own hand holding a mug or phone works perfectly for this challenge.",
      guide: drawHandObjectGuide
    },
    {
      id: "hair-big-shapes",
      track: "hair",
      icon: "〰",
      type: "HAIR STUDY",
      title: "Hair as Big Shapes",
      summary: "Three hairstyles using only major masses before individual strands.",
      goal: "Make hair feel designed and dimensional instead of a collection of disconnected spikes or lines.",
      remember: "Start from the skull. Hair sits on top of the head and has volume away from it.",
      steps: [
        "Draw three simple head masses.",
        "Add the overall hair silhouette with 3–6 large clumps only.",
        "Show the parting/root direction and the main flow.",
        "Add just a few secondary strands where they help the form."
      ],
      minutes: 10,
      difficulty: "Intermediate",
      rewardClass: "small",
      tags: ["Hair", "Shape", "Design"],
      timer: { rounds: 1, secondsPerRound: 600 },
      referenceTitle: "Hair construction guide",
      referenceText: "The built-in heads show skull volume and flow arrows, not finished hairstyles to copy.",
      guide: drawHairMassGuide
    },
    {
      id: "hair-flow-study",
      track: "hair",
      icon: "≈",
      type: "MOTION STUDY",
      title: "Hair Flow Study",
      summary: "Five small studies where hair reacts to gravity and movement.",
      goal: "Use hair to reinforce head direction, gravity and the character's motion.",
      remember: "Hair flow should serve the pose. Avoid making every clump point in a different unrelated direction.",
      steps: [
        "Mark the head tilt and root/parting area.",
        "Choose one dominant flow direction for each study.",
        "Group hair into large ribbons or clumps following that flow.",
        "Vary only the secondary strands after the big movement works."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Hair", "Motion", "Flow"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Flow guide",
      referenceText: "Use screenshots or photos with turning, wind or falling hair. The guide gives five flow directions to test.",
      guide: drawHairFlowGuide
    },
    {
      id: "one-point-room",
      track: "perspective",
      icon: "▱",
      type: "PERSPECTIVE",
      title: "One-Point Room",
      summary: "Construct a simple room, then make it feel lived in.",
      goal: "Practice horizon, vanishing point and believable depth without getting buried in architectural detail.",
      remember: "Perspective is there to organize space. A simple convincing room beats a detailed broken one.",
      steps: [
        "Use or move away from the guide horizon and vanishing point.",
        "Block floor, ceiling and side walls with converging lines.",
        "Add two large furniture forms such as bed, desk or couch.",
        "Finish with 3–5 small story props that imply who lives there."
      ],
      minutes: 25,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Perspective", "Background", "Interior"],
      timer: { rounds: 1, secondsPerRound: 1500 },
      referenceTitle: "Perspective grid",
      referenceText: "The built-in guide supplies a horizon, vanishing point and light grid. Toggle it off periodically to check whether the room still reads.",
      guide: drawOnePointRoomGuide
    },
    {
      id: "three-value-study",
      track: "rendering",
      icon: "◐",
      type: "VALUE STUDY",
      title: "3-Value Study",
      summary: "Reduce a reference to light, mid and dark before rendering anything.",
      goal: "Train value grouping so lighting and focal point remain readable even without detail or color.",
      remember: "Do not chase tiny gradients. Decide which of three value families each shape belongs to.",
      steps: [
        "Pick a reference with a clear light direction.",
        "Squint or zoom out and identify the largest light, mid and dark shapes.",
        "Block those three groups with broad strokes only.",
        "Check the thumbnail size: the subject and light direction should still read."
      ],
      minutes: 15,
      difficulty: "Intermediate",
      rewardClass: "medium",
      tags: ["Value", "Light", "Rendering"],
      timer: { rounds: 1, secondsPerRound: 900 },
      referenceTitle: "Value guide",
      referenceText: "The built-in strip shows three target value families. Use any photo or anime still with strong lighting as your subject.",
      guide: drawValueGuide
    },
    {
      id: "moment-before",
      track: "story",
      icon: "✧",
      type: "MINI ILLUSTRATION",
      title: "Moment Before",
      summary: "Draw the instant immediately before something important happens.",
      goal: "Tell a story through pose, staging, environment and anticipation — not through a caption.",
      remember: "Ask what changed one second before and what will change one second after. Put clues for both in the frame.",
      steps: [
        "Write one sentence: what is about to happen?",
        "Make three tiny composition thumbnails before choosing one.",
        "Place character action and the main environmental clue before details.",
        "Use foreground/midground/background and one clear light direction.",
        "Stop when the story reads; polish is optional."
      ],
      minutes: 30,
      difficulty: "Intermediate",
      rewardClass: "large",
      tags: ["Story", "Composition", "Scene"],
      timer: { rounds: 1, secondsPerRound: 1800 },
      referenceTitle: "Story staging guide",
      referenceText: "The guide gives three thumbnail frames and a larger final frame. The content is entirely yours.",
      guide: drawStoryGuide
    }
  ];

  const PROBLEM_TAGS = ["Proportions", "Pose", "Hands", "Hair", "Perspective", "Composition", "Color", "Rendering"];
  const QUICK_COLORS = ["#352e33", "#6c5f68", "#a85f7f", "#d8759e", "#f3b7ca", "#ead7c7", "#d7a14f", "#8b5148", "#4e6d61", "#7896b4", "#75658f", "#ffffff"];

  const els = {};
  let dbPromise = null;
  let activeTrack = "all";
  let activeChallenge = null;
  let ctx = null;
  let guideCtx = null;
  let actions = [];
  let redoStack = [];
  let currentAction = null;
  let pointerId = null;
  let tool = "graphite";
  let lastDrawTool = "graphite";
  let brushSize = 7;
  let opacity = .72;
  let softness = .62;
  let color = "#4b3f47";
  let guideOpacity = .34;
  let guideVisible = true;
  let flipped = false;
  let dirty = false;
  let saveTimer = null;
  let selectedFeel = "okay";
  let selectedProblems = new Set();
  let selectedSaveAs = "practice";
  let timerHandle = null;
  let timerRunning = false;
  let timerRound = 1;
  let timerSeconds = 0;
  let stageZoom = 1;
  let stagePanX = 0;
  let stagePanY = 0;
  let panning = false;
  let panStart = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindElements();
    ctx = els.drawCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
    guideCtx = els.guideCanvas.getContext("2d", { alpha: true });
    migrateLegacyMeta();
    renderTracks();
    renderChallenges();
    renderQuickColors();
    renderProblemTags();
    bind();
    updateStats();
    updateContinueCard();
    updateTools();
    updateRightPanelForNoChallenge();
  }

  function bindElements() {
    Object.assign(els, {
      back: document.getElementById("backToLifeRpg"),
      todayProgress: document.getElementById("todayProgress"),
      totalProgress: document.getElementById("totalProgress"),
      continueCard: document.getElementById("continueCard"),
      continueTitle: document.getElementById("continueTitle"),
      continueMeta: document.getElementById("continueMeta"),
      trackList: document.getElementById("trackList"),
      browserKicker: document.getElementById("browserKicker"),
      browserTitle: document.getElementById("browserTitle"),
      showAll: document.getElementById("showAllChallenges"),
      recommended: document.getElementById("recommendedButton"),
      challengeGrid: document.getElementById("challengeGrid"),
      briefingView: document.getElementById("briefingView"),
      backToChallenges: document.getElementById("backToChallenges"),
      briefingTags: document.getElementById("briefingTags"),
      briefingTitle: document.getElementById("briefingTitle"),
      briefingSummary: document.getElementById("briefingSummary"),
      briefingReward: document.getElementById("briefingReward"),
      briefingGoal: document.getElementById("briefingGoal"),
      briefingRemember: document.getElementById("briefingRemember"),
      briefingSteps: document.getElementById("briefingSteps"),
      referenceBrief: document.getElementById("referenceBrief"),
      startChallenge: document.getElementById("startChallenge"),
      workspaceView: document.getElementById("workspaceView"),
      workspaceBack: document.getElementById("workspaceBack"),
      workspaceKicker: document.getElementById("workspaceKicker"),
      workspaceTitle: document.getElementById("workspaceTitle"),
      workspaceRound: document.getElementById("workspaceRound"),
      workspaceTimer: document.getElementById("workspaceTimer"),
      canvasViewport: document.getElementById("canvasViewport"),
      canvasStage: document.getElementById("canvasStage"),
      canvasStack: document.getElementById("canvasStack"),
      guideCanvas: document.getElementById("guideCanvas"),
      drawCanvas: document.getElementById("drawCanvas"),
      mobileTools: document.getElementById("mobileToolsButton"),
      toolsPanel: document.getElementById("toolsPanel"),
      referenceTitle: document.getElementById("referenceTitle"),
      referenceText: document.getElementById("referenceText"),
      referenceLink: document.getElementById("referenceLink"),
      guideToggle: document.getElementById("guideToggle"),
      flipCanvas: document.getElementById("flipCanvas"),
      guideOpacity: document.getElementById("guideOpacity"),
      guideOpacityLabel: document.getElementById("guideOpacityLabel"),
      graphite: document.getElementById("graphiteButton"),
      clean: document.getElementById("cleanButton"),
      soft: document.getElementById("softButton"),
      smudge: document.getElementById("smudgeButton"),
      eyedropper: document.getElementById("eyedropperButton"),
      pan: document.getElementById("panButton"),
      eraser: document.getElementById("eraserButton"),
      colorPicker: document.getElementById("colorPicker"),
      hexInput: document.getElementById("hexInput"),
      quickColors: document.getElementById("quickColors"),
      brushSize: document.getElementById("brushSize"),
      brushSizeLabel: document.getElementById("brushSizeLabel"),
      opacity: document.getElementById("opacity"),
      opacityLabel: document.getElementById("opacityLabel"),
      softness: document.getElementById("softness"),
      softnessLabel: document.getElementById("softnessLabel"),
      undo: document.getElementById("undoButton"),
      redo: document.getElementById("redoButton"),
      clear: document.getElementById("clearButton"),
      timerModeLabel: document.getElementById("timerModeLabel"),
      timerDisplay: document.getElementById("timerDisplay"),
      timerToggle: document.getElementById("timerToggle"),
      timerReset: document.getElementById("timerReset"),
      export: document.getElementById("exportButton"),
      complete: document.getElementById("completeButton"),
      saveStatus: document.getElementById("saveStatus"),
      dialog: document.getElementById("completeDialog"),
      completeForm: document.getElementById("completeForm"),
      completeTitle: document.getElementById("completeTitle"),
      feelGrid: document.getElementById("feelGrid"),
      problemTags: document.getElementById("problemTags"),
      reflectionNote: document.getElementById("reflectionNote"),
      cancelComplete: document.getElementById("cancelComplete")
    });
  }

  function bind() {
    els.back.addEventListener("click", async () => {
      if (dirty) await persistNow();
      location.href = "index.html";
    });
    els.showAll.addEventListener("click", () => selectTrack("all"));
    els.recommended.addEventListener("click", showRecommended);
    els.backToChallenges.addEventListener("click", showBrowser);
    els.workspaceBack.addEventListener("click", async () => {
      if (dirty) await persistNow();
      stopTimer();
      showBriefing(activeChallenge);
    });
    els.startChallenge.addEventListener("click", () => startActiveChallenge(false));
    els.continueCard.addEventListener("click", () => {
      const meta = readMeta();
      const id = meta.continueChallengeId;
      const challenge = CHALLENGES.find(c => c.id === id);
      if (challenge) openChallenge(challenge.id, true);
    });
    els.mobileTools.addEventListener("click", () => els.toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" }));

    els.graphite.addEventListener("click", () => setTool("graphite"));
    els.clean.addEventListener("click", () => setTool("clean"));
    els.soft.addEventListener("click", () => setTool("soft"));
    els.smudge.addEventListener("click", () => setTool("smudge"));
    els.eyedropper.addEventListener("click", () => setTool("eyedropper"));
    els.pan.addEventListener("click", () => setTool("pan"));
    els.eraser.addEventListener("click", () => setTool("eraser"));

    els.colorPicker.addEventListener("input", () => setColor(els.colorPicker.value));
    els.hexInput.addEventListener("change", () => {
      const normalized = normalizeHex(els.hexInput.value);
      if (normalized) setColor(normalized); else els.hexInput.value = color.toUpperCase();
    });
    els.brushSize.addEventListener("input", () => {
      brushSize = Number(els.brushSize.value) || 7;
      els.brushSizeLabel.textContent = `${brushSize}px`;
    });
    els.opacity.addEventListener("input", () => {
      opacity = clamp(Number(els.opacity.value) / 100, .05, 1);
      els.opacityLabel.textContent = `${Math.round(opacity * 100)}%`;
    });
    els.softness.addEventListener("input", () => {
      softness = clamp(Number(els.softness.value) / 100, 0, 1);
      els.softnessLabel.textContent = `${Math.round(softness * 100)}%`;
    });
    els.guideOpacity.addEventListener("input", () => {
      guideOpacity = clamp(Number(els.guideOpacity.value) / 100, 0, 1);
      els.guideOpacityLabel.textContent = `${Math.round(guideOpacity * 100)}%`;
      updateGuideVisibility();
    });
    els.guideToggle.addEventListener("click", () => {
      guideVisible = !guideVisible;
      updateGuideVisibility();
    });
    els.flipCanvas.addEventListener("click", toggleFlip);
    els.undo.addEventListener("click", undo);
    els.redo.addEventListener("click", redo);
    els.clear.addEventListener("click", clearAll);
    els.export.addEventListener("click", exportPng);
    els.complete.addEventListener("click", openCompleteDialog);
    els.timerToggle.addEventListener("click", toggleTimer);
    els.timerReset.addEventListener("click", resetTimer);

    els.drawCanvas.addEventListener("pointerdown", pointerDown);
    els.drawCanvas.addEventListener("pointermove", pointerMove);
    els.drawCanvas.addEventListener("pointerup", pointerUp);
    els.drawCanvas.addEventListener("pointercancel", pointerUp);
    els.drawCanvas.style.touchAction = "none";
    els.canvasViewport.addEventListener("wheel", zoomWheel, { passive: false });
    els.canvasViewport.addEventListener("pointerdown", viewportPanStart);
    els.canvasViewport.addEventListener("pointermove", viewportPanMove);
    els.canvasViewport.addEventListener("pointerup", viewportPanEnd);
    els.canvasViewport.addEventListener("pointercancel", viewportPanEnd);

    els.feelGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-feel]");
      if (!button) return;
      selectedFeel = button.dataset.feel;
      els.feelGrid.querySelectorAll("[data-feel]").forEach(b => b.classList.toggle("is-selected", b === button));
    });
    els.problemTags.addEventListener("click", event => {
      const button = event.target.closest("[data-problem]");
      if (!button) return;
      const value = button.dataset.problem;
      if (selectedProblems.has(value)) selectedProblems.delete(value); else selectedProblems.add(value);
      button.classList.toggle("is-selected", selectedProblems.has(value));
    });
    document.querySelector(".saveas-grid").addEventListener("click", event => {
      const button = event.target.closest("[data-saveas]");
      if (!button) return;
      selectedSaveAs = button.dataset.saveas;
      document.querySelectorAll("[data-saveas]").forEach(b => b.classList.toggle("is-selected", b === button));
    });
    els.cancelComplete.addEventListener("click", () => els.dialog.close());
    els.completeForm.addEventListener("submit", event => {
      event.preventDefault();
      completeChallenge();
    });

    window.addEventListener("keydown", event => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key === " ") {
        if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") return;
        event.preventDefault();
        setTool("pan", false);
      }
    });
    window.addEventListener("keyup", event => {
      if (event.key === " " && tool === "pan") setTool(lastDrawTool, false);
    });
    window.addEventListener("resize", () => { if (!els.workspaceView.classList.contains("is-hidden")) fitStage(); });
    window.addEventListener("pagehide", () => { if (dirty) persistNow(); });
  }

  function renderTracks() {
    const counts = Object.fromEntries(TRACKS.map(track => [track.id, track.id === "all" ? CHALLENGES.length : CHALLENGES.filter(c => c.track === track.id).length]));
    els.trackList.innerHTML = TRACKS.map(track => `
      <button class="track-button${track.id === activeTrack ? " is-active" : ""}" type="button" data-track="${track.id}">
        <span class="track-icon">${track.icon}</span>
        <span><strong>${esc(track.title)}</strong><small>${esc(track.blurb)}</small></span>
        <span class="track-count">${counts[track.id]}</span>
      </button>`).join("");
    els.trackList.querySelectorAll("[data-track]").forEach(button => button.addEventListener("click", () => selectTrack(button.dataset.track)));
  }

  function selectTrack(trackId) {
    activeTrack = TRACKS.some(t => t.id === trackId) ? trackId : "all";
    showBrowser();
    renderTracks();
    renderChallenges();
    const track = TRACKS.find(t => t.id === activeTrack);
    els.browserKicker.textContent = activeTrack === "all" ? "ALL CHALLENGES" : "PRACTICE TRACK";
    els.browserTitle.textContent = track?.title || "Drawing Challenges";
  }

  function renderChallenges(list = null) {
    const meta = readMeta();
    const completedIds = new Set((meta.history || []).map(item => item.challengeId));
    const source = list || (activeTrack === "all" ? CHALLENGES : CHALLENGES.filter(c => c.track === activeTrack));
    els.challengeGrid.innerHTML = source.map(challenge => `
      <button class="challenge-card" type="button" data-challenge="${challenge.id}">
        <span class="challenge-icon">${challenge.icon}</span>
        <small>${esc(challenge.type)}</small>
        <strong>${esc(challenge.title)}</strong>
        <p>${esc(challenge.summary)}</p>
        <footer><span>${challenge.minutes} min · ${esc(challenge.difficulty)}</span><span>${completedIds.has(challenge.id) ? '<b class="done-badge">✓ practiced</b>' : rewardLabel(challenge.rewardClass)}</span></footer>
      </button>`).join("");
    els.challengeGrid.querySelectorAll("[data-challenge]").forEach(button => button.addEventListener("click", () => openChallenge(button.dataset.challenge)));
  }

  function showRecommended() {
    const meta = readMeta();
    const troubleCounts = {};
    (meta.history || []).slice(-20).forEach(item => (item.problemTags || []).forEach(tag => troubleCounts[tag] = (troubleCounts[tag] || 0) + 1));
    const map = { Proportions: "anatomy", Pose: "dynamic", Hands: "anatomy", Hair: "hair", Perspective: "perspective", Composition: "story", Color: "rendering", Rendering: "rendering" };
    const top = Object.entries(troubleCounts).sort((a,b) => b[1] - a[1])[0]?.[0];
    const preferredTrack = map[top] || "dynamic";
    activeTrack = preferredTrack;
    renderTracks();
    const list = CHALLENGES.filter(c => c.track === preferredTrack).slice(0, 4);
    els.browserKicker.textContent = top ? `RECOMMENDED · ${top.toUpperCase()}` : "RECOMMENDED START";
    els.browserTitle.textContent = top ? `Practice ${top}` : "Build momentum";
    renderChallenges(list);
    showBrowser(false);
  }

  function openChallenge(id, resume = false) {
    const challenge = CHALLENGES.find(c => c.id === id);
    if (!challenge) return;
    activeChallenge = challenge;
    if (resume) startActiveChallenge(true); else showBriefing(challenge);
    updateRightPanel(challenge);
  }

  function showBriefing(challenge) {
    if (!challenge) return;
    stopTimer();
    els.challengeGrid.classList.add("is-hidden");
    els.briefingView.classList.remove("is-hidden");
    els.workspaceView.classList.add("is-hidden");
    els.briefingTags.innerHTML = [challenge.difficulty, `${challenge.minutes} min`, ...challenge.tags].map(tag => `<span>${esc(tag)}</span>`).join("");
    els.briefingTitle.textContent = challenge.title;
    els.briefingSummary.textContent = challenge.summary;
    els.briefingReward.textContent = `${rewardLabel(challenge.rewardClass)} reward`;
    els.briefingGoal.textContent = challenge.goal;
    els.briefingRemember.textContent = challenge.remember;
    els.briefingSteps.innerHTML = challenge.steps.map(step => `<li>${esc(step)}</li>`).join("");
    els.referenceBrief.innerHTML = `<strong>${esc(challenge.referenceTitle || "Reference")}</strong><p>${esc(challenge.referenceText || "Use a reference that supports the exercise goal.")}</p>${challenge.referenceUrl ? `<a href="${challenge.referenceUrl}" target="_blank" rel="noopener">Open recommended practice source ↗</a>` : ""}`;
    updateRightPanel(challenge);
  }

  function showBrowser(resetTitles = true) {
    stopTimer();
    els.challengeGrid.classList.remove("is-hidden");
    els.briefingView.classList.add("is-hidden");
    els.workspaceView.classList.add("is-hidden");
    if (resetTitles) {
      const track = TRACKS.find(t => t.id === activeTrack);
      els.browserKicker.textContent = activeTrack === "all" ? "ALL CHALLENGES" : "PRACTICE TRACK";
      els.browserTitle.textContent = track?.title || "Drawing Challenges";
      renderChallenges();
    }
  }

  async function startActiveChallenge(resume) {
    if (!activeChallenge) return;
    els.challengeGrid.classList.add("is-hidden");
    els.briefingView.classList.add("is-hidden");
    els.workspaceView.classList.remove("is-hidden");
    els.workspaceKicker.textContent = `${activeChallenge.type} · ${activeChallenge.difficulty}`;
    els.workspaceTitle.textContent = activeChallenge.title;
    drawActiveGuide();
    await loadActiveRecord();
    resetTimer();
    updateRightPanel(activeChallenge);
    const meta = readMeta();
    meta.continueChallengeId = activeChallenge.id;
    meta.lastOpenedAt = new Date().toISOString();
    writeMeta(meta);
    updateContinueCard();
    requestAnimationFrame(fitStage);
    setStatus(resume && actions.length ? `Resumed · ${actions.length} actions` : "Practice ready · autosaves locally.");
  }

  function updateRightPanelForNoChallenge() {
    els.referenceTitle.textContent = "Select a challenge";
    els.referenceText.textContent = "Open a challenge to see its built-in guide and practice reference.";
    els.referenceLink.classList.add("is-hidden");
  }

  function updateRightPanel(challenge) {
    els.referenceTitle.textContent = challenge.referenceTitle || "Practice guide";
    els.referenceText.textContent = challenge.referenceText || "Use the guide as structure, not a finished image to trace.";
    if (challenge.referenceUrl) {
      els.referenceLink.href = challenge.referenceUrl;
      els.referenceLink.classList.remove("is-hidden");
    } else {
      els.referenceLink.classList.add("is-hidden");
    }
  }

  function drawActiveGuide() {
    guideCtx.clearRect(0, 0, WIDTH, HEIGHT);
    if (activeChallenge?.guide) activeChallenge.guide(guideCtx);
    updateGuideVisibility();
  }

  function updateGuideVisibility() {
    els.guideCanvas.style.opacity = guideVisible ? String(guideOpacity) : "0";
    els.guideToggle.textContent = `Guide: ${guideVisible ? "On" : "Off"}`;
    els.guideToggle.classList.toggle("is-active", guideVisible);
    els.guideOpacityLabel.textContent = `${Math.round(guideOpacity * 100)}%`;
  }

  function renderQuickColors() {
    els.quickColors.innerHTML = QUICK_COLORS.map(c => `<button type="button" style="--swatch:${c}" data-color="${c}" aria-label="${c}"></button>`).join("");
    els.quickColors.addEventListener("click", event => {
      const button = event.target.closest("[data-color]");
      if (button) setColor(button.dataset.color);
    });
  }

  function setColor(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    color = normalized;
    els.colorPicker.value = color;
    els.hexInput.value = color.toUpperCase();
    if (tool === "eraser") setTool(lastDrawTool === "eraser" ? "clean" : lastDrawTool);
  }

  function setTool(next, remember = true) {
    tool = next;
    if (remember && !["pan","eyedropper"].includes(next)) lastDrawTool = next;
    updateTools();
  }

  function updateTools() {
    const mapping = { graphite: els.graphite, clean: els.clean, soft: els.soft, smudge: els.smudge, eyedropper: els.eyedropper, pan: els.pan, eraser: els.eraser };
    Object.entries(mapping).forEach(([name, button]) => button.classList.toggle("is-active", tool === name));
    els.undo.disabled = !actions.length;
    els.redo.disabled = !redoStack.length;
    els.drawCanvas.style.cursor = tool === "eyedropper" ? "copy" : tool === "pan" ? "grab" : "crosshair";
  }

  function pointFromEvent(event) {
    const rect = els.canvasStage.getBoundingClientRect();
    let x = (event.clientX - rect.left) / stageZoom;
    const y = (event.clientY - rect.top) / stageZoom;
    if (flipped) x = WIDTH - x;
    const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure : .58;
    return [clamp(x, 0, WIDTH), clamp(y, 0, HEIGHT), pressure];
  }

  function pointerDown(event) {
    if (!activeChallenge || pointerId !== null || tool === "pan" || event.button === 1 || event.altKey) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (tool === "eyedropper") {
      pickColorAt(point[0], point[1]);
      setTool(lastDrawTool, false);
      return;
    }
    pointerId = event.pointerId;
    try { els.drawCanvas.setPointerCapture(pointerId); } catch {}
    currentAction = { kind: "stroke", tool, size: brushSize, opacity, softness, color, points: [point] };
    drawAction(currentAction);
  }

  function pointerMove(event) {
    if (event.pointerId !== pointerId || !currentAction) return;
    event.preventDefault();
    const p = pointFromEvent(event);
    const prev = currentAction.points.at(-1);
    const dx = p[0] - prev[0], dy = p[1] - prev[1];
    if (dx * dx + dy * dy < 3) return;
    currentAction.points.push(p);
    drawSegment(currentAction, prev, p);
  }

  function pointerUp(event) {
    if (event.pointerId !== pointerId || !currentAction) return;
    event.preventDefault();
    try { els.drawCanvas.releasePointerCapture(pointerId); } catch {}
    if (currentAction.points.length === 1) {
      const p = currentAction.points[0];
      currentAction.points.push([p[0] + .15, p[1] + .15, p[2]]);
    }
    actions.push(currentAction);
    if (actions.length > MAX_ACTIONS) actions.shift();
    currentAction = null;
    pointerId = null;
    redoStack = [];
    dirty = true;
    scheduleSave();
    updateTools();
  }

  function drawAction(action) {
    if (!action?.points?.length) return;
    if (action.points.length === 1) {
      const p = action.points[0];
      drawSegment(action, p, [p[0] + .15, p[1] + .15, p[2]]);
      return;
    }
    for (let i = 1; i < action.points.length; i++) drawSegment(action, action.points[i - 1], action.points[i]);
  }

  function drawSegment(action, a, b) {
    const pressure = (Number(a[2] || .58) + Number(b[2] || .58)) / 2;
    const width = Number(action.size || 7) * (.56 + pressure * .72);
    if (action.tool === "eraser") return drawEraser(a, b, width, action.opacity);
    if (action.tool === "soft") return drawSoftSegment(a, b, width, action.color, action.opacity, action.softness);
    if (action.tool === "smudge") return drawSmudgeSegment(a, b, width, action.opacity, action.softness);
    if (action.tool === "graphite") return drawGraphiteSegment(a, b, width, action.opacity);
    drawCleanSegment(a, b, width, action.color, action.opacity);
  }

  function drawCleanSegment(a, b, width, hex, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba(hex, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }

  function drawGraphiteSegment(a, b, width, alpha) {
    const graphite = "#463f44";
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const layers = Math.max(2, Math.min(5, Math.round(width / 2.5)));
    for (let i = 0; i < layers; i++) {
      const seed = Math.sin((a[0] + b[1] + i * 17.31) * .021) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const off = (frac - .5) * Math.max(.7, width * .22);
      ctx.strokeStyle = rgba(graphite, alpha * (.20 + .14 * (i + 1) / layers));
      ctx.lineWidth = Math.max(.65, width * (.28 + .06 * i));
      ctx.beginPath();
      ctx.moveTo(a[0] + off, a[1] - off * .45);
      ctx.lineTo(b[0] + off, b[1] - off * .45);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEraser(a, b, width, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = width * 1.2;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }

  function drawSoftSegment(a, b, width, hex, alpha, soft) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const distance = Math.hypot(dx, dy);
    const step = Math.max(2, width * .2);
    const steps = Math.max(1, Math.ceil(distance / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      softStamp(a[0] + dx * t, a[1] + dy * t, width * .7, hex, alpha, soft);
    }
  }

  function softStamp(x, y, radius, hex, alpha, soft) {
    const rgb = hexToRgb(hex);
    const inner = radius * clamp(1 - soft, .03, .92);
    const gradient = ctx.createRadialGradient(x, y, inner, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * .38})`);
    gradient.addColorStop(.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * .18})`);
    gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.save(); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  function drawSmudgeSegment(a, b, width, alpha, soft) {
    const sample = sampleColor(a[0], a[1], Math.max(2, Math.round(width * .18)));
    if (!sample) return;
    const hex = rgbToHex(sample.r, sample.g, sample.b);
    drawSoftSegment(a, b, width * 1.05, hex, Math.min(.7, alpha * sample.a * .52), Math.max(.45, soft));
  }

  function sampleColor(x, y, radius = 2) {
    const sx = Math.max(0, Math.floor(x - radius));
    const sy = Math.max(0, Math.floor(y - radius));
    const sw = Math.min(WIDTH - sx, radius * 2 + 1);
    const sh = Math.min(HEIGHT - sy, radius * 2 + 1);
    if (sw <= 0 || sh <= 0) return null;
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, weight = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      if (a < .02) continue;
      r += data[i] * a; g += data[i + 1] * a; b += data[i + 2] * a; weight += a; count++;
    }
    if (!count || !weight) return null;
    return { r: Math.round(r / weight), g: Math.round(g / weight), b: Math.round(b / weight), a: Math.min(1, weight / count) };
  }

  function pickColorAt(x, y) {
    const sample = sampleColor(x, y, 3);
    if (!sample) { setStatus("No paint color at that point."); return; }
    setColor(rgbToHex(sample.r, sample.g, sample.b));
    setStatus(`Picked ${color.toUpperCase()}`);
  }

  function redraw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    actions.forEach(drawAction);
  }

  function undo() {
    if (!actions.length) return;
    redoStack.push(actions.pop());
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function redo() {
    if (!redoStack.length) return;
    actions.push(redoStack.pop());
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function clearAll() {
    if (!actions.length) return;
    if (!confirm("Clear this practice canvas? You can undo immediately afterwards.")) return;
    redoStack.push(...actions.splice(0));
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function toggleFlip() {
    flipped = !flipped;
    els.canvasStack.style.transform = flipped ? "scaleX(-1)" : "scaleX(1)";
    els.flipCanvas.classList.toggle("is-active", flipped);
    els.flipCanvas.textContent = flipped ? "⇄ Flipped" : "⇄ Flip canvas";
  }

  function fitStage() {
    const rect = els.canvasViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    stageZoom = Math.min((rect.width - 24) / WIDTH, (rect.height - 24) / HEIGHT);
    stageZoom = clamp(stageZoom, .2, 2);
    stagePanX = (rect.width - WIDTH * stageZoom) / 2;
    stagePanY = (rect.height - HEIGHT * stageZoom) / 2;
    applyStageTransform();
  }

  function applyStageTransform() {
    els.canvasStage.style.transform = `translate(${stagePanX}px, ${stagePanY}px) scale(${stageZoom})`;
  }

  function zoomWheel(event) {
    if (els.workspaceView.classList.contains("is-hidden")) return;
    event.preventDefault();
    const rect = els.canvasViewport.getBoundingClientRect();
    const oldZoom = stageZoom;
    const nextZoom = clamp(oldZoom * (event.deltaY < 0 ? 1.1 : .9), .18, 4);
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = (cursorX - stagePanX) / oldZoom;
    const worldY = (cursorY - stagePanY) / oldZoom;
    stageZoom = nextZoom;
    stagePanX = cursorX - worldX * nextZoom;
    stagePanY = cursorY - worldY * nextZoom;
    applyStageTransform();
  }

  function viewportPanStart(event) {
    if (!(event.button === 1 || event.altKey || tool === "pan")) return;
    event.preventDefault();
    panning = true;
    panStart = { x: event.clientX, y: event.clientY, panX: stagePanX, panY: stagePanY };
    try { els.canvasViewport.setPointerCapture(event.pointerId); } catch {}
  }
  function viewportPanMove(event) {
    if (!panning || !panStart) return;
    stagePanX = panStart.panX + (event.clientX - panStart.x);
    stagePanY = panStart.panY + (event.clientY - panStart.y);
    applyStageTransform();
  }
  function viewportPanEnd() { panning = false; panStart = null; }

  function resetTimer() {
    stopTimer();
    timerRound = 1;
    timerSeconds = activeChallenge?.timer?.secondsPerRound || 0;
    updateTimerUi();
  }

  function toggleTimer() { timerRunning ? stopTimer() : startTimer(); }
  function startTimer() {
    if (!activeChallenge) return;
    if (timerSeconds <= 0) resetTimer();
    timerRunning = true;
    els.timerToggle.textContent = "Pause";
    timerHandle = setInterval(() => {
      timerSeconds = Math.max(0, timerSeconds - 1);
      updateTimerUi();
      if (timerSeconds <= 0) handleTimerRoundEnd();
    }, 1000);
  }
  function stopTimer() {
    timerRunning = false;
    clearInterval(timerHandle);
    timerHandle = null;
    if (els.timerToggle) els.timerToggle.textContent = "Start";
  }
  function handleTimerRoundEnd() {
    const totalRounds = activeChallenge?.timer?.rounds || 1;
    if (timerRound < totalRounds) {
      timerRound += 1;
      timerSeconds = activeChallenge.timer.secondsPerRound;
      setStatus(`Round ${timerRound - 1} complete ✦ start the next study.`);
      updateTimerUi();
      return;
    }
    stopTimer();
    setStatus("Challenge timer complete ✦ finish whenever your study feels done.");
  }
  function updateTimerUi() {
    const rounds = activeChallenge?.timer?.rounds || 1;
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    const time = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    els.timerDisplay.textContent = time;
    els.workspaceTimer.textContent = time;
    els.workspaceRound.textContent = rounds > 1 ? `Round ${timerRound}/${rounds}` : `${activeChallenge?.minutes || 0} min`;
    els.timerModeLabel.textContent = rounds > 1 ? `ROUND ${timerRound} OF ${rounds}` : "CHALLENGE TIMER";
  }

  async function loadActiveRecord() {
    actions = [];
    redoStack = [];
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const record = await loadRecord(activeChallenge.id).catch(() => null);
    if (record?.actions && Array.isArray(record.actions)) {
      actions = record.actions;
      redraw();
    }
    dirty = false;
    updateTools();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    setStatus("Saving…");
    saveTimer = setTimeout(persistNow, 350);
  }

  async function persistNow() {
    if (!activeChallenge) return;
    clearTimeout(saveTimer);
    const record = { challengeId: activeChallenge.id, actions, width: WIDTH, height: HEIGHT, updatedAt: Date.now(), version: VERSION };
    try {
      await saveRecord(record);
      dirty = false;
      setStatus(`Saved · ${actions.length} actions`);
      updateContinueCard();
    } catch (error) {
      console.warn("Drawing Studio save failed", error);
      setStatus("Save failed · export if you want a backup.");
    }
  }

  function setStatus(text) { els.saveStatus.textContent = text; }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "challengeId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function loadRecord(challengeId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(challengeId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function renderProblemTags() {
    els.problemTags.innerHTML = PROBLEM_TAGS.map(tag => `<button type="button" data-problem="${tag}">${tag}</button>`).join("");
  }

  function openCompleteDialog() {
    if (!activeChallenge) return;
    selectedFeel = "okay";
    selectedProblems = new Set();
    selectedSaveAs = "practice";
    els.reflectionNote.value = "";
    els.completeTitle.textContent = `${activeChallenge.title} complete?`;
    els.feelGrid.querySelectorAll("[data-feel]").forEach(button => button.classList.toggle("is-selected", button.dataset.feel === "okay"));
    els.problemTags.querySelectorAll("[data-problem]").forEach(button => button.classList.remove("is-selected"));
    document.querySelectorAll("[data-saveas]").forEach(button => button.classList.toggle("is-selected", button.dataset.saveas === "practice"));
    els.dialog.showModal?.();
  }

  async function completeChallenge() {
    await persistNow();
    const meta = readMeta();
    const today = dayKey();
    meta.daily ||= {};
    meta.daily[today] ||= [];
    meta.history ||= [];
    meta.trackStats ||= {};
    const alreadyToday = meta.daily[today].includes(activeChallenge.id);
    if (!alreadyToday) meta.daily[today].push(activeChallenge.id);
    const completion = {
      challengeId: activeChallenge.id,
      title: activeChallenge.title,
      track: activeChallenge.track,
      difficulty: activeChallenge.difficulty,
      durationMinutes: activeChallenge.minutes,
      feel: selectedFeel,
      problemTags: [...selectedProblems],
      note: String(els.reflectionNote.value || "").trim().slice(0, 280),
      saveAs: selectedSaveAs,
      at: new Date().toISOString()
    };
    meta.history.push(completion);
    if (meta.history.length > 400) meta.history = meta.history.slice(-400);
    const stat = meta.trackStats[activeChallenge.track] ||= { completions: 0, minutes: 0, lastPracticedAt: null };
    stat.completions += 1;
    stat.minutes += activeChallenge.minutes;
    stat.lastPracticedAt = completion.at;
    meta.continueChallengeId = activeChallenge.id;
    writeMeta(meta);
    if (!alreadyToday) queueReward(activeChallenge, today, completion);
    els.dialog.close();
    updateStats();
    renderTracks();
    renderChallenges();
    updateContinueCard();
    setStatus(alreadyToday ? "Practice saved · today's reward for this challenge was already claimed." : "Practice complete ✦ reward queued for Life RPG.");
  }

  function queueReward(challenge, today, completion) {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(REWARD_QUEUE_KEY) || "[]"); } catch {}
    if (!Array.isArray(queue)) queue = [];
    const sourceId = `drawing:${challenge.id}:${today}`;
    if (queue.some(item => item?.sourceId === sourceId)) return;
    queue.push({
      id: `drawing-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      sourceId,
      challengeId: challenge.id,
      title: challenge.title,
      at: completion.at,
      reward: { ...REWARDS[challenge.rewardClass] },
      reflection: { feel: completion.feel, note: completion.note, problemTags: completion.problemTags, saveAs: completion.saveAs },
      version: VERSION
    });
    localStorage.setItem(REWARD_QUEUE_KEY, JSON.stringify(queue));
  }

  function updateStats() {
    const meta = readMeta();
    const todayDone = new Set(meta.daily?.[dayKey()] || []).size;
    const total = (meta.history || []).length;
    els.todayProgress.textContent = `${todayDone} today`;
    els.totalProgress.textContent = `${total} ${total === 1 ? "practice" : "practices"}`;
  }

  function updateContinueCard() {
    const meta = readMeta();
    const challenge = CHALLENGES.find(c => c.id === meta.continueChallengeId);
    if (!challenge) { els.continueCard.classList.add("is-hidden"); return; }
    els.continueCard.classList.remove("is-hidden");
    els.continueTitle.textContent = challenge.title;
    els.continueMeta.textContent = `${challenge.minutes} min · ${challenge.difficulty}`;
  }

  function readMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(META_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }
  function writeMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

  function migrateLegacyMeta() {
    if (localStorage.getItem(META_KEY)) return;
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_META_KEY) || "null");
      if (!legacy || typeof legacy !== "object") return;
      writeMeta({ legacyHistory: legacy.history || [], history: [], daily: {}, trackStats: {} });
    } catch {}
  }

  function exportPng() {
    if (!activeChallenge) return;
    const out = document.createElement("canvas");
    out.width = WIDTH; out.height = HEIGHT;
    const octx = out.getContext("2d");
    octx.fillStyle = "#fff"; octx.fillRect(0,0,WIDTH,HEIGHT);
    octx.drawImage(els.drawCanvas,0,0);
    out.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `life-rpg-${activeChallenge.id}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  function rewardLabel(level) { return ({small:"Small",medium:"Medium",large:"Large",epic:"Epic"})[level] || "Medium"; }
  function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
  function clamp(n,min,max){ return Math.min(max,Math.max(min,Number(n)||0)); }
  function esc(v){ return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function normalizeHex(v){ const m=String(v||"").trim().match(/^#?([0-9a-f]{6})$/i); return m?`#${m[1].toLowerCase()}`:null; }
  function hexToRgb(hex){ const h=normalizeHex(hex)||"#000000"; const n=parseInt(h.slice(1),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
  function rgbToHex(r,g,b){ const p=n=>clamp(Math.round(n),0,255).toString(16).padStart(2,"0"); return `#${p(r)}${p(g)}${p(b)}`; }
  function rgba(hex,a){ const c=hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${clamp(a,0,1)})`; }

  function baseGuide(g, label) {
    g.save();
    g.clearRect(0,0,WIDTH,HEIGHT);
    g.strokeStyle="#8d6a7c"; g.fillStyle="#8d6a7c"; g.lineWidth=3; g.lineCap="round"; g.lineJoin="round";
    g.font="700 24px system-ui"; g.textAlign="left"; g.fillText(label,42,54);
    g.restore();
  }
  function arrow(g,x1,y1,x2,y2){ g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();const a=Math.atan2(y2-y1,x2-x1);const s=14;g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-Math.cos(a-.5)*s,y2-Math.sin(a-.5)*s);g.moveTo(x2,y2);g.lineTo(x2-Math.cos(a+.5)*s,y2-Math.sin(a+.5)*s);g.stroke(); }
  function ellipse(g,x,y,rx,ry,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.stroke();}

  function drawGestureGuide(g){
    baseGuide(g,"Gesture: find one dominant action line, then support it");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=5;g.setLineDash([12,12]);
    const lines=[[[160,700],[240,560],[300,400],[380,220]],[[390,220],[500,360],[540,560],[650,710]],[[690,710],[750,570],[860,410],[980,230]]];
    lines.forEach(points=>{g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.quadraticCurveTo(...points[i-1],...points[i]);g.stroke();});
    g.setLineDash([]);g.font="600 20px system-ui";g.fillStyle="#9f7d8e";g.fillText("Do not trace these — they are examples of different rhythms.",42,842);g.restore();
  }
  function drawGestureStructureGuide(g){
    baseGuide(g,"Gesture + structure: preserve the curve while adding masses");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([9,9]);
    [260,600,940].forEach((x,i)=>{g.beginPath();g.moveTo(x-80,720);g.quadraticCurveTo(x+30,480,x-20,180);g.stroke();ellipse(g,x-5,315,70,105,i*.12);g.strokeRect(x-65,455,125,105);});
    g.setLineDash([]);g.restore();
  }
  function drawPushPoseGuide(g){
    baseGuide(g,"Left: observed pose · Right: pushed pose");
    g.save();g.strokeStyle="#a88a99";g.lineWidth=2;g.setLineDash([8,8]);g.beginPath();g.moveTo(600,90);g.lineTo(600,840);g.stroke();g.setLineDash([]);g.font="700 22px system-ui";g.fillStyle="#9b7b8b";g.textAlign="center";g.fillText("OBSERVE",300,110);g.fillText("PUSH",900,110);g.restore();
  }
  function drawTorsoTwistGuide(g){
    baseGuide(g,"Six torso orientations — invent the twist, do not copy the examples literally");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;const xs=[210,600,990],ys=[310,650];
    ys.forEach((y,row)=>xs.forEach((x,col)=>{ellipse(g,x,y-55,70,95,(col-row)*.12);g.strokeRect(x-62+(col-1)*8,y+55,124,80);g.beginPath();g.moveTo(x,y-145);g.quadraticCurveTo(x+(col-1)*28,y,x+(row?18:-18),y+135);g.stroke();}));g.restore();
  }
  function drawMannequinGuide(g){
    baseGuide(g,"Build from simple forms: head → ribcage/pelvis → limbs");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([8,8]);ellipse(g,600,190,48,62);ellipse(g,570,340,92,120,-.15);g.strokeRect(560,455,150,95);arrow(g,510,320,360,220);arrow(g,640,330,790,250);arrow(g,585,545,470,760);arrow(g,655,545,760,755);g.setLineDash([]);g.restore();
  }
  function drawHandSlotsGuide(g){
    baseGuide(g,"Three studies: OPEN · FIST · POINT");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);[210,600,990].forEach((x,i)=>{g.roundRect(x-155,170,310,560,22);g.stroke();g.strokeRect(x-75,400,150,125);g.beginPath();g.moveTo(x-105,400);g.quadraticCurveTo(x,340,x+105,400);g.stroke();g.fillStyle="#9f7d8e";g.font="700 20px system-ui";g.textAlign="center";g.fillText(["OPEN","FIST","POINT"][i],x,770);});g.setLineDash([]);g.restore();
  }
  function drawHandObjectGuide(g){
    baseGuide(g,"Object first → contact → palm mass → fingers wrap around form");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;g.setLineDash([8,8]);g.strokeRect(450,300,300,280);ellipse(g,750,390,55,95);arrow(g,360,430,445,430);g.fillStyle="#9f7d8e";g.font="600 20px system-ui";g.fillText("Object volume",490,620);g.fillText("Grip/contact",770,440);g.setLineDash([]);g.restore();
  }
  function drawHairMassGuide(g){
    baseGuide(g,"Skull first · hair volume sits outside it · group large clumps");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);[240,600,960].forEach((x,i)=>{ellipse(g,x,395,105,135);ellipse(g,x,380,135+(i*8),160+(i*6));arrow(g,x,280,x+[80,-70,100][i],230+[30,80,20][i]);});g.setLineDash([]);g.restore();
  }
  function drawHairFlowGuide(g){
    baseGuide(g,"Five flow directions — let big hair ribbons support the head movement");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=3;const pts=[[170,300,320,230],[410,330,540,430],[650,300,800,220],[880,320,1050,420],[510,650,760,690]];pts.forEach(([x1,y1,x2,y2])=>{ellipse(g,x1,y1,52,68);arrow(g,x1+20,y1-25,x2,y2);});g.restore();
  }
  function drawOnePointRoomGuide(g){
    baseGuide(g,"One-point room guide");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([7,8]);const vx=600,vy=360;g.beginPath();g.moveTo(40,vy);g.lineTo(1160,vy);g.stroke();[[40,100],[40,820],[1160,100],[1160,820],[300,820],[900,820],[300,100],[900,100]].forEach(([x,y])=>{g.beginPath();g.moveTo(vx,vy);g.lineTo(x,y);g.stroke();});g.setLineDash([]);g.fillStyle="#9f7d8e";g.beginPath();g.arc(vx,vy,7,0,Math.PI*2);g.fill();g.font="700 18px system-ui";g.fillText("VP",615,350);g.restore();
  }
  function drawValueGuide(g){
    baseGuide(g,"Three value families: LIGHT · MID · DARK");
    g.save();const values=["#ece7e9","#9d9097","#433a3f"];values.forEach((c,i)=>{g.fillStyle=c;g.fillRect(120+i*320,150,280,120);g.fillStyle="#8d6a7c";g.font="700 20px system-ui";g.textAlign="center";g.fillText(["LIGHT","MID","DARK"][i],260+i*320,305);});g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);g.roundRect(170,390,860,360,20);g.stroke();g.setLineDash([]);g.fillStyle="#9f7d8e";g.textAlign="center";g.fillText("Use this area for the actual 3-value study",600,785);g.restore();
  }
  function drawStoryGuide(g){
    baseGuide(g,"Thumbnail first — final scene second");
    g.save();g.strokeStyle="#9f7d8e";g.lineWidth=2;g.setLineDash([8,8]);[170,430,690].forEach(x=>{g.roundRect(x,130,220,150,14);g.stroke();});g.roundRect(170,350,780,440,18);g.stroke();g.setLineDash([]);g.fillStyle="#9f7d8e";g.font="700 18px system-ui";g.textAlign="center";g.fillText("THUMBNAILS",500,315);g.fillText("FINAL SCENE",560,830);g.restore();
  }
})();
