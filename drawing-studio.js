(() => {
  "use strict";

  const VERSION = "0.31.4ce";
  const DB_NAME = "life-rpg-drawing-studio-v1";
  const STORE = "drawings";
  const META_KEY = "lifeRpgDrawingStudioMetaV1";
  const REWARD_QUEUE_KEY = "lifeRpgDrawingStudioRewardQueueV1";
  const WIDTH = 1200;
  const HEIGHT = 900;

  const CHALLENGES = [
    {
      id: "trace-confident-eyes",
      icon: "👁️",
      type: "TRACE CHALLENGE",
      title: "Confident Eyes",
      description: "Trace the eye shapes slowly. Aim for clean, deliberate lines rather than perfect accuracy.",
      quest: "Trace both eyes and brows once. Try to use fewer, more confident strokes than you normally would.",
      minutes: 7,
      difficulty: "★ Starter",
      reward: { xp: 10, realmXP: 10, statXP: 7, coins: 8, storyEnergyBase: .20, skillXP: 8 },
      guide: drawTraceEyesGuide
    },
    {
      id: "half-face-mirror",
      icon: "◐",
      type: "HALF & HALF",
      title: "Mirror the Face",
      description: "The left half is given. Build the right half yourself and focus on proportion and symmetry.",
      quest: "Complete the missing half of the face, eye, brow and hair silhouette. It does not need to match perfectly.",
      minutes: 10,
      difficulty: "★★ Guided",
      reward: { xp: 12, realmXP: 12, statXP: 9, coins: 10, storyEnergyBase: .25, skillXP: 9 },
      guide: drawHalfFaceGuide
    },
    {
      id: "prompt-smug-expression",
      icon: "✦",
      type: "PROMPT SKETCH",
      title: "Smug Expression",
      description: "Use the faint construction guide as much or as little as you want. The goal is expression, not polish.",
      quest: "Sketch a smug face in five minutes. Think: uneven mouth corner, relaxed eyelids, one slightly raised brow.",
      minutes: 5,
      difficulty: "★★ Free sketch",
      reward: { xp: 14, realmXP: 14, statXP: 10, coins: 12, storyEnergyBase: .30, skillXP: 10 },
      guide: drawPromptGuide
    }
  ];

  const els = {};
  let dbPromise = null;
  let active = CHALLENGES[0];
  let ctx = null;
  let guideCtx = null;
  let strokes = [];
  let redoStack = [];
  let currentStroke = null;
  let pointerId = null;
  let tool = "pen";
  let brushSize = 7;
  let guideOpacity = .34;
  let dirty = false;
  let saveTimer = null;
  let selectedFeel = "okay";
  let timerSeconds = active.minutes * 60;
  let timerHandle = null;
  let timerRunning = false;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    Object.assign(els, {
      back: document.getElementById("backToLifeRpg"),
      todayProgress: document.getElementById("todayProgress"),
      challengeList: document.getElementById("challengeList"),
      kicker: document.getElementById("challengeKicker"),
      title: document.getElementById("challengeTitle"),
      description: document.getElementById("challengeDescription"),
      time: document.getElementById("challengeTime"),
      difficulty: document.getElementById("challengeDifficulty"),
      callout: document.getElementById("questCallout"),
      guideCanvas: document.getElementById("guideCanvas"),
      drawCanvas: document.getElementById("drawCanvas"),
      toolsPanel: document.getElementById("toolsPanel"),
      mobileTools: document.getElementById("mobileToolsButton"),
      pen: document.getElementById("penButton"),
      eraser: document.getElementById("eraserButton"),
      brush: document.getElementById("brushSize"),
      brushLabel: document.getElementById("brushSizeLabel"),
      guideOpacity: document.getElementById("guideOpacity"),
      guideOpacityLabel: document.getElementById("guideOpacityLabel"),
      undo: document.getElementById("undoButton"),
      redo: document.getElementById("redoButton"),
      clear: document.getElementById("clearButton"),
      export: document.getElementById("exportButton"),
      timerDisplay: document.getElementById("timerDisplay"),
      timerToggle: document.getElementById("timerToggle"),
      timerReset: document.getElementById("timerReset"),
      complete: document.getElementById("completeButton"),
      saveStatus: document.getElementById("saveStatus"),
      dialog: document.getElementById("completeDialog"),
      completeForm: document.getElementById("completeForm"),
      completeTitle: document.getElementById("completeTitle"),
      feelGrid: document.getElementById("feelGrid"),
      reflectionNote: document.getElementById("reflectionNote"),
      cancelComplete: document.getElementById("cancelComplete")
    });

    ctx = els.drawCanvas.getContext("2d", { alpha: true });
    guideCtx = els.guideCanvas.getContext("2d", { alpha: true });
    renderChallengeList();
    bind();
    selectChallenge(active.id);
  }

  function bind() {
    els.back.addEventListener("click", async () => {
      if (dirty) await persistNow();
      location.href = "index.html";
    });
    els.mobileTools.addEventListener("click", () => els.toolsPanel.scrollIntoView({ behavior: "smooth", block: "start" }));
    els.pen.addEventListener("click", () => setTool("pen"));
    els.eraser.addEventListener("click", () => setTool("eraser"));
    els.brush.addEventListener("input", () => {
      brushSize = Math.max(2, Math.min(36, Number(els.brush.value) || 7));
      els.brushLabel.textContent = `${brushSize}px`;
    });
    els.guideOpacity.addEventListener("input", () => {
      guideOpacity = Math.max(0, Math.min(1, Number(els.guideOpacity.value) / 100));
      els.guideCanvas.style.opacity = String(guideOpacity);
      els.guideOpacityLabel.textContent = `${Math.round(guideOpacity * 100)}%`;
    });
    els.undo.addEventListener("click", undo);
    els.redo.addEventListener("click", redo);
    els.clear.addEventListener("click", clearAll);
    els.export.addEventListener("click", exportPng);
    els.timerToggle.addEventListener("click", toggleTimer);
    els.timerReset.addEventListener("click", resetTimer);
    els.complete.addEventListener("click", openCompleteDialog);
    els.cancelComplete.addEventListener("click", () => els.dialog.close());
    els.feelGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-feel]");
      if (!button) return;
      selectedFeel = button.dataset.feel;
      els.feelGrid.querySelectorAll("[data-feel]").forEach(item => item.classList.toggle("is-selected", item === button));
    });
    els.completeForm.addEventListener("submit", event => {
      event.preventDefault();
      completeChallenge();
    });

    els.drawCanvas.addEventListener("pointerdown", pointerDown);
    els.drawCanvas.addEventListener("pointermove", pointerMove);
    els.drawCanvas.addEventListener("pointerup", pointerUp);
    els.drawCanvas.addEventListener("pointercancel", pointerUp);
    els.drawCanvas.style.touchAction = "none";

    window.addEventListener("keydown", event => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    });
    window.addEventListener("pagehide", () => { if (dirty) persistNow(); });
  }

  async function selectChallenge(id) {
    const next = CHALLENGES.find(item => item.id === id);
    if (!next) return;
    if (dirty) await persistNow();
    stopTimer();
    active = next;
    timerSeconds = active.minutes * 60;
    strokes = [];
    redoStack = [];
    currentStroke = null;
    dirty = false;
    selectedFeel = "okay";
    els.reflectionNote.value = "";
    renderChallengeList();
    renderActiveChallenge();
    drawGuide();
    const saved = await loadRecord(active.id).catch(() => null);
    if (saved?.strokes) strokes = saved.strokes;
    redraw();
    updateButtons();
    updateTimerDisplay();
    setStatus(saved?.strokes?.length ? `Saved sketch loaded · ${saved.strokes.length} strokes.` : "New sketch · progress autosaves after every stroke.");
  }

  function renderChallengeList() {
    const meta = readMeta();
    const today = dayKey();
    const doneToday = CHALLENGES.filter(item => meta.daily?.[today]?.includes(item.id)).length;
    els.todayProgress.textContent = `${doneToday} / ${CHALLENGES.length} today`;
    els.challengeList.innerHTML = CHALLENGES.map(item => {
      const done = meta.daily?.[today]?.includes(item.id);
      return `<button type="button" class="challenge-card ${item.id === active?.id ? "is-active" : ""}" data-challenge="${item.id}">
        <span>${item.icon}</span><span><small>${item.type}</small><strong>${esc(item.title)}</strong></span><b class="${done ? "" : "pending"}">${done ? "✓" : "○"}</b>
      </button>`;
    }).join("");
    els.challengeList.querySelectorAll("[data-challenge]").forEach(button => button.addEventListener("click", () => selectChallenge(button.dataset.challenge)));
  }

  function renderActiveChallenge() {
    els.kicker.textContent = active.type;
    els.title.textContent = active.title;
    els.description.textContent = active.description;
    els.time.textContent = `${active.minutes} min`;
    els.difficulty.textContent = active.difficulty;
    els.callout.innerHTML = `<strong>Drawing Quest:</strong> ${esc(active.quest)}<br><span>Daily completion reward: +${active.reward.xp} XP · +${active.reward.realmXP} Hobbies Realm XP · +${active.reward.coins} 🪙 · +${fmtEnergy(active.reward.storyEnergyBase)} 🔥</span>`;
    els.completeTitle.textContent = `${active.title} complete?`;
  }

  function drawGuide() {
    guideCtx.clearRect(0, 0, WIDTH, HEIGHT);
    guideCtx.save();
    active.guide(guideCtx);
    guideCtx.restore();
    els.guideCanvas.style.opacity = String(guideOpacity);
  }

  function drawTraceEyesGuide(g) {
    g.strokeStyle = "#7b6573";
    g.lineWidth = 7;
    g.lineCap = "round";
    g.lineJoin = "round";
    // left eye
    g.beginPath(); g.moveTo(245, 405); g.quadraticCurveTo(355, 325, 495, 392); g.quadraticCurveTo(365, 445, 245, 405); g.stroke();
    g.beginPath(); g.arc(375, 400, 46, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(375, 400, 17, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(270, 330); g.quadraticCurveTo(360, 285, 470, 330); g.stroke();
    // right eye
    g.beginPath(); g.moveTo(705, 392); g.quadraticCurveTo(845, 325, 955, 405); g.quadraticCurveTo(835, 445, 705, 392); g.stroke();
    g.beginPath(); g.arc(825, 400, 46, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(825, 400, 17, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(730, 330); g.quadraticCurveTo(840, 285, 930, 330); g.stroke();
    // little directional arrows / guide notes
    g.setLineDash([16, 15]);
    g.lineWidth = 3;
    g.strokeStyle = "#c6a8b7";
    g.beginPath(); g.moveTo(185, 520); g.lineTo(1015, 520); g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#a78697";
    g.font = "700 28px system-ui";
    g.textAlign = "center";
    g.fillText("trace slowly · one confident line at a time", 600, 585);
  }

  function drawHalfFaceGuide(g) {
    g.strokeStyle = "#8a7380";
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 6;
    g.setLineDash([14, 14]);
    g.strokeStyle = "#c6abb8";
    g.beginPath(); g.moveTo(600, 135); g.lineTo(600, 765); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = "#7b6573";
    // left face outline only
    g.beginPath(); g.moveTo(600, 190); g.bezierCurveTo(465, 170, 350, 255, 330, 405); g.bezierCurveTo(315, 560, 410, 690, 600, 735); g.stroke();
    // left ear
    g.beginPath(); g.moveTo(337, 405); g.bezierCurveTo(285, 390, 285, 485, 342, 505); g.stroke();
    // left eye & brow
    g.beginPath(); g.moveTo(395, 405); g.quadraticCurveTo(465, 350, 550, 395); g.quadraticCurveTo(475, 430, 395, 405); g.stroke();
    g.beginPath(); g.arc(478, 401, 30, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(402, 348); g.quadraticCurveTo(475, 315, 548, 345); g.stroke();
    // half nose + mouth
    g.beginPath(); g.moveTo(575, 425); g.quadraticCurveTo(560, 500, 588, 520); g.stroke();
    g.beginPath(); g.moveTo(482, 585); g.quadraticCurveTo(545, 608, 600, 580); g.stroke();
    // left hair
    g.beginPath(); g.moveTo(600, 190); g.lineTo(530, 125); g.lineTo(500, 205); g.lineTo(430, 145); g.lineTo(420, 235); g.lineTo(345, 205); g.lineTo(370, 290); g.stroke();
    g.fillStyle = "#a78697";
    g.font = "700 26px system-ui";
    g.textAlign = "center";
    g.fillText("mirror the missing side", 785, 775);
  }

  function drawPromptGuide(g) {
    g.strokeStyle = "#bda7b3";
    g.lineWidth = 4;
    g.setLineDash([12, 12]);
    g.beginPath(); g.ellipse(600, 405, 225, 280, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(600, 135); g.lineTo(600, 685); g.stroke();
    g.beginPath(); g.moveTo(390, 390); g.quadraticCurveTo(600, 355, 810, 390); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = "#d1bdc8";
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(440, 700); g.quadraticCurveTo(600, 780, 760, 700); g.stroke();
    g.fillStyle = "#a98d9c";
    g.font = "700 26px system-ui";
    g.textAlign = "center";
    g.fillText("smug · relaxed eyes · asymmetric mouth · raised brow", 600, 805);
  }

  function pointFromEvent(event) {
    const rect = els.drawCanvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * WIDTH / rect.width,
      (event.clientY - rect.top) * HEIGHT / rect.height,
      event.pointerType === "pen" && event.pressure > 0 ? event.pressure : .55
    ];
  }

  function pointerDown(event) {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    try { els.drawCanvas.setPointerCapture(pointerId); } catch {}
    const p = pointFromEvent(event);
    currentStroke = { tool, size: brushSize, points: [p] };
    drawStroke(currentStroke);
  }

  function pointerMove(event) {
    if (event.pointerId !== pointerId || !currentStroke) return;
    event.preventDefault();
    const p = pointFromEvent(event);
    const prev = currentStroke.points.at(-1);
    const dx = p[0] - prev[0], dy = p[1] - prev[1];
    if (dx * dx + dy * dy < 2.5) return;
    currentStroke.points.push(p);
    drawSegment(currentStroke, prev, p);
  }

  function pointerUp(event) {
    if (event.pointerId !== pointerId || !currentStroke) return;
    event.preventDefault();
    try { els.drawCanvas.releasePointerCapture(pointerId); } catch {}
    if (currentStroke.points.length === 1) {
      const p = currentStroke.points[0];
      currentStroke.points.push([p[0] + .2, p[1] + .2, p[2]]);
    }
    strokes.push(currentStroke);
    currentStroke = null;
    pointerId = null;
    redoStack = [];
    dirty = true;
    scheduleSave();
    updateButtons();
  }

  function drawStroke(stroke) {
    if (!stroke?.points?.length) return;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      drawSegment(stroke, p, [p[0] + .2, p[1] + .2, p[2]]);
      return;
    }
    for (let i = 1; i < stroke.points.length; i++) drawSegment(stroke, stroke.points[i - 1], stroke.points[i]);
  }

  function drawSegment(stroke, a, b) {
    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.tool === "eraser" ? "#000" : "#332a31";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pressure = (Number(a[2] || .55) + Number(b[2] || .55)) / 2;
    ctx.lineWidth = Number(stroke.size || 7) * (.65 + pressure * .7);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    strokes.forEach(drawStroke);
  }

  function setTool(next) {
    tool = next;
    els.pen.classList.toggle("is-active", tool === "pen");
    els.eraser.classList.toggle("is-active", tool === "eraser");
  }

  function undo() {
    if (!strokes.length) return;
    redoStack.push(strokes.pop());
    dirty = true;
    redraw();
    scheduleSave();
    updateButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    strokes.push(redoStack.pop());
    dirty = true;
    redraw();
    scheduleSave();
    updateButtons();
  }

  function clearAll() {
    if (!strokes.length) return;
    if (!confirm("Clear this sketch? You can still undo immediately afterwards.")) return;
    redoStack.push(...strokes.splice(0));
    dirty = true;
    redraw();
    scheduleSave();
    updateButtons();
  }

  function updateButtons() {
    els.undo.disabled = !strokes.length;
    els.redo.disabled = !redoStack.length;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    setStatus("Saving…");
    saveTimer = setTimeout(persistNow, 350);
  }

  async function persistNow() {
    clearTimeout(saveTimer);
    const record = {
      challengeId: active.id,
      strokes,
      width: WIDTH,
      height: HEIGHT,
      updatedAt: Date.now()
    };
    try {
      await saveRecord(record);
      dirty = false;
      setStatus(`Saved · ${strokes.length} strokes`);
    } catch (error) {
      console.warn("Drawing Studio save failed", error);
      setStatus("Save failed · export the sketch if you want a backup.");
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
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(challengeId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
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

  function toggleTimer() {
    if (timerRunning) stopTimer(); else startTimer();
  }

  function startTimer() {
    if (timerSeconds <= 0) resetTimer();
    timerRunning = true;
    els.timerToggle.textContent = "Pause";
    timerHandle = setInterval(() => {
      timerSeconds = Math.max(0, timerSeconds - 1);
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        stopTimer();
        setStatus("Timer complete ✦ Keep going or finish the challenge when you're ready.");
      }
    }, 1000);
  }

  function stopTimer() {
    timerRunning = false;
    clearInterval(timerHandle);
    timerHandle = null;
    if (els.timerToggle) els.timerToggle.textContent = "Start";
  }

  function resetTimer() {
    stopTimer();
    timerSeconds = active.minutes * 60;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    els.timerDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function openCompleteDialog() {
    els.completeTitle.textContent = `${active.title} complete?`;
    els.dialog.showModal?.();
  }

  async function completeChallenge() {
    await persistNow();
    const meta = readMeta();
    const today = dayKey();
    meta.daily ||= {};
    meta.daily[today] ||= [];
    meta.history ||= [];
    const alreadyToday = meta.daily[today].includes(active.id);
    if (!alreadyToday) meta.daily[today].push(active.id);
    const completion = {
      challengeId: active.id,
      title: active.title,
      type: active.type,
      feel: selectedFeel,
      note: String(els.reflectionNote.value || "").trim().slice(0, 240),
      at: new Date().toISOString()
    };
    meta.history.push(completion);
    if (meta.history.length > 250) meta.history = meta.history.slice(-250);
    writeMeta(meta);

    if (!alreadyToday) queueReward(active, today, completion);
    els.dialog.close();
    renderChallengeList();
    setStatus(alreadyToday
      ? "Practice saved · today's reward for this challenge was already claimed."
      : "Challenge complete ✦ Reward queued. Return to Life RPG to collect it.");
  }

  function queueReward(challenge, today, completion) {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(REWARD_QUEUE_KEY) || "[]"); } catch {}
    if (!Array.isArray(queue)) queue = [];
    const sourceId = `drawing:${challenge.id}:${today}`;
    if (queue.some(item => item?.sourceId === sourceId)) return;
    queue.push({
      id: `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceId,
      challengeId: challenge.id,
      title: challenge.title,
      at: completion.at,
      reward: { ...challenge.reward },
      reflection: { feel: completion.feel, note: completion.note },
      version: VERSION
    });
    localStorage.setItem(REWARD_QUEUE_KEY, JSON.stringify(queue));
  }

  function readMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(META_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }

  function writeMeta(meta) { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

  function exportPng() {
    const out = document.createElement("canvas");
    out.width = WIDTH;
    out.height = HEIGHT;
    const outCtx = out.getContext("2d");
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, WIDTH, HEIGHT);
    outCtx.drawImage(els.drawCanvas, 0, 0);
    out.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `life-rpg-${active.id}-sketch.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function fmtEnergy(value) { return Number(value || 0).toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
})();
