(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity) return;

  const VERSION = "0.31.4o";
  const SCHEMA = 1;
  const HISTORY_LIMIT = 240;
  const REPEAT_SCALES = [1, 0.7, 0.45, 0.3];
  const DAILY_COIN_CAP = 40;

  const SESSIONS = {
    breathing5: {
      id: "breathing5",
      icon: "◯",
      title: "5-Minute Breathing",
      short: "Slow breathing",
      minutes: 5,
      subcategory: "Quiet time",
      kind: "breathing",
      intensity: "passive",
      blurb: "A quiet five-minute reset using a gentle 4-second inhale / 6-second exhale rhythm. Follow it only as comfortably as you can; normal breathing is always fine.",
      phases: [
        { key: "inhale", label: "Inhale", seconds: 4, cue: "Breathe in gently." },
        { key: "exhale", label: "Exhale", seconds: 6, cue: "Let the exhale be easy and unforced." }
      ],
      reward: { xp: 10, realmXP: 10, statXP: 7, story: 0.35, coins: 7 }
    },
    box5: {
      id: "box5",
      icon: "□",
      title: "Box Breathing",
      short: "4 · 4 · 4 · 4",
      minutes: 5,
      subcategory: "Quiet time",
      kind: "breathing",
      intensity: "passive",
      blurb: "A simple visual box-breathing rhythm. If any hold feels uncomfortable, breathe normally instead — this is support, not a test.",
      phases: [
        { key: "inhale", label: "Inhale", seconds: 4, cue: "Breathe in gently." },
        { key: "hold-in", label: "Hold", seconds: 4, cue: "Pause only if that feels comfortable." },
        { key: "exhale", label: "Exhale", seconds: 4, cue: "Breathe out slowly." },
        { key: "hold-out", label: "Hold", seconds: 4, cue: "Rest before the next breath." }
      ],
      reward: { xp: 11, realmXP: 11, statXP: 8, story: 0.4, coins: 8 }
    },
    bodyScan10: {
      id: "bodyScan10",
      icon: "◇",
      title: "10-Minute Body Scan",
      short: "Notice, don't fix",
      minutes: 10,
      subcategory: "Quiet time",
      kind: "stages",
      intensity: "passive",
      blurb: "Move your attention through the body without needing to change anything. Comfortable position first; noticing is enough.",
      stages: [
        ["Arrive", 10, "Get comfortable. Let the surface under you support your weight."],
        ["Face & jaw", 40, "Notice forehead, eyes, cheeks and jaw. Nothing needs to change."],
        ["Neck & shoulders", 40, "Notice weight, contact, tension, warmth or simply neutral sensation."],
        ["Right arm & hand", 40, "Move attention from upper arm to elbow, forearm, hand and fingers."],
        ["Left arm & hand", 40, "Move attention from upper arm to elbow, forearm, hand and fingers."],
        ["Chest", 40, "Notice the chest and ribs. Let breathing stay natural."],
        ["Belly", 40, "Notice movement, softness, pressure or nothing in particular."],
        ["Back", 40, "Notice where your back meets the chair, bed or floor."],
        ["Hips & pelvis", 40, "Let attention rest around the hips and pelvis without judgement."],
        ["Right thigh & knee", 40, "Notice the right thigh and knee, including any contact with the surface below."],
        ["Left thigh & knee", 40, "Notice the left thigh and knee, including any contact with the surface below."],
        ["Right lower leg & foot", 40, "Move through calf, shin, ankle, heel, sole and toes."],
        ["Left lower leg & foot", 40, "Move through calf, shin, ankle, heel, sole and toes."],
        ["Whole body", 60, "Hold the whole body in awareness at once for a little while."],
        ["Finish quietly", 50, "Stay still if you want. Then notice the room again and return at your own pace." ]
      ],
      reward: { xp: 16, realmXP: 16, statXP: 11, story: 0.6, coins: 11 }
    },
    lieDown15: {
      id: "lieDown15",
      icon: "☾",
      title: "15-Minute Lie Down",
      short: "Quiet rest",
      minutes: 15,
      subcategory: "Rest",
      kind: "stages",
      intensity: "passive",
      blurb: "Fifteen protected minutes with nothing productive hidden inside them. Rest counts as the activity.",
      stages: [
        ["Settle in", 60, "Get as comfortable as you reasonably can. Put the phone somewhere you can still see the timer without holding it."],
        ["Let the day go quiet", 180, "No task. No catching up. Let your eyes close if that feels good."],
        ["Rest", 480, "You do not need to meditate correctly. Lying here is enough."],
        ["Stay soft", 120, "If thoughts are busy, let them be busy in the background. Keep resting."],
        ["Come back slowly", 60, "Notice the room again. Move only when you're ready." ]
      ],
      reward: { xp: 20, realmXP: 20, statXP: 14, story: 0.75, coins: 14 }
    },
    neckShoulders7: {
      id: "neckShoulders7",
      icon: "🌿",
      title: "Gentle Neck & Shoulder Release",
      short: "7 min · easy movement",
      minutes: 7,
      subcategory: "Other recovery",
      kind: "stages",
      intensity: "gentle-movement",
      blurb: "A few easy, non-strenuous movements for a stiff desk-day. Keep the range comfortable and stop any movement that hurts.",
      stages: [
        ["Arrive", 10, "Sit or stand comfortably. Let your arms rest and keep every movement easy."],
        ["Shoulder rolls", 50, "Make a few slow shoulder circles in each direction. Smaller is completely fine."],
        ["Shoulder lift & drop", 45, "Gently lift the shoulders toward the ears, then let them drop. Repeat without force."],
        ["Shoulder-blade glide", 45, "Let the shoulders move slightly forward, then return to neutral. Keep the range small and comfortable."],
        ["Easy head turns", 50, "Turn your head a little left and right within a comfortable range. Do not push at the end."],
        ["Side tilts", 50, "Let one ear drift slightly toward one shoulder, return to centre, then switch sides."],
        ["Small chin nods", 45, "Make a few small yes-like nods. Keep them slow and easy."],
        ["Upper-back reach", 55, "Reach the hands forward gently and let the upper back widen. Release whenever you want."],
        ["Rest & breathe", 45, "Let the arms rest again and breathe normally for a few moments."],
        ["Finish", 25, "Return to neutral. Notice how you feel without needing it to be different." ]
      ],
      reward: { xp: 13, realmXP: 13, statXP: 9, story: 0.45, coins: 9 }
    }
  };

  const els = {
    dialog: byId("recoveryStudioDialog"),
    close: byId("recoveryStudioClose"),
    daily: byId("recoveryDailyCard"),
    library: byId("recoverySessionGrid"),
    active: byId("recoveryActiveSession"),
    activeIcon: byId("recoveryActiveIcon"),
    activeKicker: byId("recoveryActiveKicker"),
    activeTitle: byId("recoveryActiveTitle"),
    activeCue: byId("recoveryActiveCue"),
    clock: byId("recoveryClock"),
    progress: byId("recoveryProgressBar"),
    phase: byId("recoveryPhaseLabel"),
    visual: byId("recoveryBreathVisual"),
    finish: byId("recoveryFinishButton"),
    abandon: byId("recoveryAbandonButton"),
    status: byId("recoveryStudioStatus"),
    stats: byId("recoveryStudioStats"),
    growthStats: byId("recoveryGrowthStats"),
    trainingStats: byId("trainingGroundsRecoveryStatus"),
    quickStatus: byId("recoveryQuickStatus")
  };

  let ticker = null;

  init();

  function init() {
    ensureState();
    bind();
    reconcileExternalTimer();
    render();
    window.addEventListener("life-rpg:render", render);
    window.addEventListener("life-rpg:time-change", () => {
      reconcileExternalTimer();
      render();
    });
    if (state().active) startTicker();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      active: null,
      history: [],
      stats: { completed: 0, completedMinutes: 0, earlyStops: 0 }
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.recoveryStudio || typeof root.recoveryStudio !== "object" || Array.isArray(root.recoveryStudio)) root.recoveryStudio = defaults();
    const s = root.recoveryStudio;
    s.schemaVersion = SCHEMA;
    s.history = Array.isArray(s.history) ? s.history.slice(-HISTORY_LIMIT) : [];
    if (!s.stats || typeof s.stats !== "object") s.stats = defaults().stats;
    s.stats.completed = Math.max(0, Number(s.stats.completed || 0));
    s.stats.completedMinutes = Math.max(0, Number(s.stats.completedMinutes || 0));
    s.stats.earlyStops = Math.max(0, Number(s.stats.earlyStops || 0));
    s.active = normalizeActive(s.active);
    return s;
  }

  function normalizeActive(active) {
    if (!active || typeof active !== "object" || !SESSIONS[active.sessionId]) return null;
    return {
      ...active,
      runId: String(active.runId || `recovery-${Date.now()}`),
      sessionId: String(active.sessionId),
      timeActiveId: active.timeActiveId || null,
      startedAt: active.startedAt || new Date().toISOString(),
      targetSeconds: Math.max(60, Number(active.targetSeconds || SESSIONS[active.sessionId].minutes * 60)),
      completedAt: active.completedAt || null,
      rewardEventId: active.rewardEventId || null
    };
  }

  function state() { return ensureState(); }

  function bind() {
    els.close?.addEventListener("click", () => els.dialog?.open && els.dialog.close());
    els.finish?.addEventListener("click", finishActiveSession);
    els.abandon?.addEventListener("click", abandonActiveSession);

    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-recovery-open]");
      if (open) {
        event.preventDefault();
        openDialog();
        return;
      }
      const start = event.target.closest?.("[data-recovery-session-start]");
      if (start) {
        event.preventDefault();
        startSession(String(start.dataset.recoverySessionStart || ""));
      }
    });
  }

  function openDialog() {
    reconcileExternalTimer();
    render();
    if (els.dialog && !els.dialog.open) els.dialog.showModal();
  }

  function startSession(sessionId) {
    const def = SESSIONS[sessionId];
    if (!def) return;
    const currentTime = window.LifeRPGTime?.getActive?.();
    if (state().active && currentTime?.id === state().active.timeActiveId) {
      enterFocus(state().active);
      return;
    }
    if (currentTime) {
      app.showToast?.("Another timer is already running. Finish or cancel it before starting Recovery Studio.");
      return;
    }
    if (!window.LifeRPGTime?.startAction) {
      app.showToast?.("The Life Rhythm timer is not ready yet. Reload Life RPG and try again.");
      return;
    }

    window.LifeRPGTime.startAction({
      categoryId: "recovery",
      subcategory: def.subcategory,
      label: `Recovery Studio · ${def.title}`,
      minutes: def.minutes
    });
    const timeActive = window.LifeRPGTime.getActive?.();
    if (!timeActive) return;

    state().active = {
      runId: `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId,
      timeActiveId: timeActive.id,
      startedAt: timeActive.startedAt,
      targetSeconds: def.minutes * 60,
      completedAt: null,
      rewardEventId: null
    };
    persist("recovery-studio-start");
    startTicker();
    renderActive();
    enterFocus(state().active);
  }

  function finishActiveSession() {
    const active = state().active;
    if (!active) return;
    const def = SESSIONS[active.sessionId];
    const elapsedSeconds = elapsedForActive(active);
    const minimumReached = elapsedSeconds >= active.targetSeconds;
    const globalActive = window.LifeRPGTime?.getActive?.();

    if (globalActive?.id === active.timeActiveId) window.LifeRPGTime.finishActive?.();
    // LifeRPGTime emits a time-change event synchronously after logging. That
    // listener may already have reconciled and finalized this run. Do not append
    // history or rewards a second time.
    if (!state().active || state().active.runId !== active.runId) return;

    if (!minimumReached) {
      state().history.push({
        runId: active.runId,
        sessionId: active.sessionId,
        startedAt: active.startedAt,
        endedAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds,
        completed: false,
        rewardEventId: null
      });
      state().history = state().history.slice(-HISTORY_LIMIT);
      state().stats.earlyStops += 1;
      state().active = null;
      stopTicker();
      persist("recovery-studio-early-stop");
      app.showToast?.(`${formatDurationSeconds(elapsedSeconds)} logged as Recovery. The ${def.minutes}-minute minimum was not reached, so no completion reward was paid.`);
      leaveFocusToLibrary();
      return;
    }

    completeRun(active, elapsedSeconds);
  }

  function completeRun(active, elapsedSeconds) {
    const def = SESSIONS[active.sessionId];
    const existing = findRewardForRun(active.runId);
    const reward = existing ? rewardFromEvent(existing) : awardRun(active, elapsedSeconds);
    const endAt = new Date().toISOString();

    state().history.push({
      runId: active.runId,
      sessionId: active.sessionId,
      startedAt: active.startedAt,
      endedAt: endAt,
      durationSeconds: elapsedSeconds,
      completed: true,
      rewardEventId: reward.eventId || existing?.id || null,
      reward: { xp: reward.xp, realmXP: reward.realmXP, statXP: reward.statXP, coins: reward.coins, storyEnergy: reward.storyEnergy }
    });
    state().history = state().history.slice(-HISTORY_LIMIT);
    state().stats.completed += 1;
    state().stats.completedMinutes += Math.max(def.minutes, Math.floor(elapsedSeconds / 60));
    state().active = null;
    stopTicker();
    persist("recovery-studio-complete");
    app.showToast?.(`🌿 ${def.title} complete · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy) ?? reward.storyEnergy} 🔥 · +${reward.coins} 🪙`);
    leaveFocusToLibrary();
  }

  function awardRun(active, elapsedSeconds) {
    const def = SESSIONS[active.sessionId];
    const spec = rewardSpec(def);
    return app.awardActivity({
      source: "recovery-studio",
      sourceId: active.runId,
      label: `Recovery Studio · ${def.title}`,
      realm: "Recovery",
      capability: "wellbeing",
      xp: spec.xp,
      realmXP: spec.realmXP,
      statXP: spec.statXP,
      storyEnergyBase: spec.storyEnergyBase,
      coins: spec.coins,
      progressionRelevant: true,
      metadata: {
        recoveryStudio: true,
        sessionId: def.id,
        sessionMinutes: def.minutes,
        durationSeconds: Math.max(1, Math.round(elapsedSeconds)),
        repeatScale: spec.repeatScale,
        dailyCoinCap: DAILY_COIN_CAP,
        minimumReached: true,
        medicalTreatment: false
      }
    });
  }

  function rewardSpec(def) {
    const count = todayCompletedCount();
    const repeatScale = REPEAT_SCALES[Math.min(count, REPEAT_SCALES.length - 1)];
    const coinsAlready = todayRecoveryCoins();
    const scaledCoins = Math.max(0, Math.round(def.reward.coins * repeatScale));
    const coins = Math.max(0, Math.min(scaledCoins, DAILY_COIN_CAP - coinsAlready));
    return {
      xp: Math.max(1, Math.round(def.reward.xp * repeatScale)),
      realmXP: Math.max(1, Math.round(def.reward.realmXP * repeatScale)),
      statXP: Math.max(1, Math.round(def.reward.statXP * repeatScale)),
      storyEnergyBase: floor2(def.reward.story * repeatScale),
      coins,
      repeatScale
    };
  }

  function abandonActiveSession() {
    const active = state().active;
    if (!active) return;
    const elapsedSeconds = elapsedForActive(active);
    if (!window.confirm("Stop this Recovery Studio session? The time so far will be logged, but a full completion reward needs the listed minimum.")) return;
    const globalActive = window.LifeRPGTime?.getActive?.();
    if (globalActive?.id === active.timeActiveId) window.LifeRPGTime.finishActive?.();
    if (!state().active || state().active.runId !== active.runId) return;
    state().history.push({ runId: active.runId, sessionId: active.sessionId, startedAt: active.startedAt, endedAt: new Date().toISOString(), durationSeconds: elapsedSeconds, completed: false, rewardEventId: null });
    state().history = state().history.slice(-HISTORY_LIMIT);
    state().stats.earlyStops += 1;
    state().active = null;
    stopTicker();
    persist("recovery-studio-stop");
    leaveFocusToLibrary();
  }

  function reconcileExternalTimer() {
    const active = state().active;
    if (!active) return;
    const globalActive = window.LifeRPGTime?.getActive?.();
    if (globalActive?.id === active.timeActiveId) return;

    const matchingLog = (window.LifeRPGTime?.getEntries?.() || []).slice().reverse().find(entry => {
      if (!entry) return false;
      return entry.startAt === active.startedAt && entry.label === `Recovery Studio · ${SESSIONS[active.sessionId]?.title}`;
    });
    if (!matchingLog) return;

    const elapsedSeconds = Math.max(1, Number(matchingLog.durationSeconds || matchingLog.minutes * 60 || 0));
    if (elapsedSeconds >= active.targetSeconds) completeRun(active, elapsedSeconds);
    else {
      state().history.push({ runId: active.runId, sessionId: active.sessionId, startedAt: active.startedAt, endedAt: matchingLog.endAt || new Date().toISOString(), durationSeconds: elapsedSeconds, completed: false, rewardEventId: null });
      state().history = state().history.slice(-HISTORY_LIMIT);
      state().stats.earlyStops += 1;
      state().active = null;
      stopTicker();
      persist("recovery-studio-external-stop");
      leaveFocusToLibrary();
    }
  }

  function enterFocus(active = state().active) {
    if (!active || !els.active || !window.LifeRPGTrainingFocus?.enter) return false;
    const def = SESSIONS[active.sessionId];
    if (!def) return false;
    if (els.dialog?.open) els.dialog.close();
    return window.LifeRPGTrainingFocus.enter({
      id: "recovery", node: els.active, title: def.title, subtitle: `${def.minutes} min · Recovery Studio`, tone: "dark",
      onExit: () => { render(); if (els.dialog && !els.dialog.open) els.dialog.showModal(); }
    });
  }

  function leaveFocusToLibrary() {
    if (!window.LifeRPGTrainingFocus?.isActive?.("recovery")) return;
    window.setTimeout(() => {
      window.LifeRPGTrainingFocus?.exit?.({ reopen: false });
      render();
      if (els.dialog && !els.dialog.open) els.dialog.showModal();
    }, 40);
  }

  function render() {
    renderDaily();
    renderLibrary();
    renderStats();
    renderActive();
  }

  function renderDaily() {
    if (!els.daily) return;
    const rec = recommendation();
    const def = SESSIONS[rec.sessionId];
    const done = todayCompletedCount() > 0;
    const active = state().active?.sessionId === def.id;
    els.daily.className = `recovery-daily-card-v314m ${rec.tone}`;
    els.daily.innerHTML = `
      <div class="recovery-daily-icon-v314m" aria-hidden="true">${def.icon}</div>
      <div class="recovery-daily-copy-v314m">
        <small>DAILY RECOVERY · OPTIONAL</small>
        <strong>${done ? "You already made space for recovery today ✓" : escapeHtml(rec.heading)}</strong>
        <span>${escapeHtml(rec.reason)}</span>
      </div>
      <button class="${done ? "secondary-button" : "primary-button"}" data-recovery-session-start="${def.id}" type="button">${active ? "Continue" : done ? "Do another" : "Start"} · ${def.minutes} min</button>`;
  }

  function renderLibrary() {
    if (!els.library) return;
    const currentId = state().active?.sessionId || null;
    els.library.innerHTML = Object.values(SESSIONS).map(def => {
      const preview = previewReward(def);
      const active = currentId === def.id;
      const movementNote = def.intensity === "gentle-movement" ? `<small class="recovery-safety-tag-v314m">gentle movement</small>` : `<small class="recovery-safety-tag-v314m">passive recovery</small>`;
      return `<article class="recovery-session-card-v314m ${active ? "is-active" : ""}">
        <div class="recovery-session-head-v314m"><span>${def.icon}</span><div><small>${def.minutes} MIN · RECOVERY</small><strong>${escapeHtml(def.title)}</strong></div></div>
        <p>${escapeHtml(def.blurb)}</p>
        <div class="recovery-session-meta-v314m">${movementNote}<span>+${preview.xp} XP · +${preview.coins} 🪙 · +${app.formatEnergy?.(preview.storyEnergy) ?? preview.storyEnergy} 🔥</span></div>
        <button class="${active ? "primary-button" : "secondary-button"}" data-recovery-session-start="${def.id}" type="button">${active ? "Continue session" : "Start session"}</button>
      </article>`;
    }).join("");
  }

  function renderStats() {
    const s = state();
    const today = todayCompletedCount();
    const copy = `<span><b>${today}</b> today</span><span><b>${s.stats.completed}</b> completed</span><span><b>${Math.round(s.stats.completedMinutes)}</b> recovery min</span>`;
    if (els.stats) els.stats.innerHTML = copy;
    if (els.growthStats) els.growthStats.innerHTML = copy;
    if (els.trainingStats) els.trainingStats.textContent = state().active ? `Session running · ${SESSIONS[state().active.sessionId]?.short || "Recovery"}` : today ? `${today} session${today === 1 ? "" : "s"} today` : `${recommendation().shortLabel}`;
    if (els.quickStatus) els.quickStatus.textContent = state().active ? `Continue ${SESSIONS[state().active.sessionId]?.title || "Recovery session"}` : `${recommendation().shortLabel} · optional today`;
  }

  function renderActive() {
    const active = state().active;
    if (!els.active) return;
    if (!active) {
      els.active.classList.add("hidden");
      return;
    }
    const def = SESSIONS[active.sessionId];
    if (!def) return;
    els.active.classList.remove("hidden");
    const elapsed = elapsedForActive(active);
    const reached = elapsed >= active.targetSeconds;
    const phase = currentPhase(def, elapsed);
    const pct = reached ? 100 : Math.max(0, Math.min(100, elapsed / active.targetSeconds * 100));

    if (els.activeIcon) els.activeIcon.textContent = def.icon;
    if (els.activeKicker) els.activeKicker.textContent = reached ? "MINIMUM REACHED" : "RECOVERY STUDIO · IN PROGRESS";
    if (els.activeTitle) els.activeTitle.textContent = def.title;
    if (els.clock) els.clock.textContent = reached ? `+${formatClock(elapsed - active.targetSeconds)}` : formatClock(active.targetSeconds - elapsed);
    if (els.progress) els.progress.style.width = `${pct}%`;
    if (els.phase) els.phase.textContent = reached ? "Rest as long as you want, then finish when you're ready." : phase.label;
    if (els.activeCue) els.activeCue.textContent = reached ? "The full session counts. Overtime is simply extra rest." : phase.cue;
    if (els.finish) els.finish.textContent = reached ? "Finish & claim recovery" : "Stop & log time";
    if (els.abandon) els.abandon.classList.toggle("hidden", reached);

    renderBreathVisual(def, phase, reached);
    if (els.status) {
      els.status.textContent = reached
        ? `Full ${def.minutes}-minute minimum reached. Finishing now will log the exact time and award the Recovery completion once.`
        : `${formatDurationSeconds(elapsed)} elapsed · ${def.minutes} minutes completes this session. Stopping early still logs the time, but not the completion reward.`;
    }
  }

  function renderBreathVisual(def, phase, reached) {
    if (!els.visual) return;
    const breathing = def.kind === "breathing" && !reached;
    els.visual.classList.toggle("is-breathing", breathing);
    els.visual.classList.toggle("is-resting", !breathing);
    els.visual.dataset.phase = phase.key || "rest";
    if (!breathing) {
      els.visual.style.setProperty("--recovery-breath-scale", reached ? "1" : "0.92");
      els.visual.innerHTML = `<span>${reached ? "✓" : def.icon}</span>`;
      return;
    }
    const progress = Math.max(0, Math.min(1, Number(phase.progress || 0)));
    let scale = 0.78;
    if (phase.key === "inhale") scale = 0.78 + progress * 0.24;
    else if (phase.key === "exhale") scale = 1.02 - progress * 0.24;
    else if (phase.key === "hold-in") scale = 1.02;
    else if (phase.key === "hold-out") scale = 0.78;
    els.visual.style.setProperty("--recovery-breath-scale", scale.toFixed(3));
    els.visual.innerHTML = `<span>${escapeHtml(phase.label)}</span>`;
  }

  function currentPhase(def, elapsedSeconds) {
    if (def.kind === "breathing") {
      const total = def.phases.reduce((sum, phase) => sum + phase.seconds, 0);
      let within = ((elapsedSeconds % total) + total) % total;
      for (const phase of def.phases) {
        if (within < phase.seconds) return { ...phase, progress: within / phase.seconds };
        within -= phase.seconds;
      }
      return { ...def.phases[0], progress: 0 };
    }

    const elapsed = Math.min(elapsedSeconds, def.minutes * 60 - 0.001);
    let cursor = 0;
    for (const stage of def.stages || []) {
      const [label, seconds, cue] = stage;
      if (elapsed < cursor + seconds) return { key: "stage", label, cue, progress: (elapsed - cursor) / seconds };
      cursor += seconds;
    }
    return { key: "rest", label: "Rest", cue: "Stay here until the timer reaches the minimum.", progress: 1 };
  }

  function recommendation() {
    const checkIn = todayCheckIn();
    if (!checkIn) return { sessionId: "breathing5", tone: "neutral", heading: "A tiny reset is available whenever you want it.", reason: "No check-in yet, so Recovery Studio keeps the suggestion deliberately light.", shortLabel: "5-min breathing" };

    const health = normalizeHealth(checkIn);
    const impact = { none: 0, mild: 1, moderate: 2, strong: 3 }[health.impact] || 0;
    const ill = health.illness === "yes";
    const veryLow = checkIn.energy === "fumes" || checkIn.sleep === "bad";
    const stressed = ["high", "overload"].includes(checkIn.stress);

    if (ill || impact >= 3) return { sessionId: "lieDown15", tone: "high-need", heading: "Your body gets the bigger share of the day today.", reason: "You logged illness or strong physical impact, so the recommendation adds real rest instead of shrinking recovery into a token task.", shortLabel: "15-min quiet rest" };
    if (impact >= 2 || veryLow) return { sessionId: "bodyScan10", tone: "need", heading: "A proper pause fits better than another push.", reason: "Noticeable symptoms, poor sleep or very low energy make passive recovery the better fit today.", shortLabel: "10-min body scan" };
    if (stressed) return { sessionId: "box5", tone: "need", heading: "A short nervous-system downshift is available.", reason: "Today's check-in shows a heavier stress load, so the suggestion stays short, guided and low-demand.", shortLabel: "5-min box breathing" };
    if (impact === 1) return { sessionId: "breathing5", tone: "neutral", heading: "Keep recovery easy and uncomplicated.", reason: "You logged mild physical discomfort, so this suggestion asks for almost nothing beyond five quiet minutes.", shortLabel: "5-min breathing" };
    return { sessionId: "neckShoulders7", tone: "neutral", heading: "A small physical reset could be enough today.", reason: "Your check-in does not call for heavy recovery, so a gentle optional desk-day release is available instead of forced rest.", shortLabel: "7-min gentle release" };
  }

  function todayCheckIn() {
    const planner = app.getState().dailyPlanner;
    const key = localDateKey(new Date());
    return planner?.days?.[key]?.checkIn || null;
  }

  function normalizeHealth(checkIn) {
    const raw = checkIn?.health && typeof checkIn.health === "object" ? checkIn.health : {};
    return {
      impact: ["none", "mild", "moderate", "strong"].includes(raw.impact) ? raw.impact : "none",
      illness: ["yes", "no"].includes(raw.illness) ? raw.illness : "no"
    };
  }

  function previewReward(def) {
    const spec = rewardSpec(def);
    return app.previewActivityReward?.({
      source: "recovery-studio-preview",
      realm: "Recovery",
      capability: "wellbeing",
      xp: spec.xp,
      realmXP: spec.realmXP,
      statXP: spec.statXP,
      coins: spec.coins,
      storyEnergyBase: spec.storyEnergyBase
    }) || { xp: spec.xp, coins: spec.coins, storyEnergy: spec.storyEnergyBase };
  }

  function findRewardForRun(runId) {
    return (app.getState().rewardLedger?.events || []).find(event => event?.source === "recovery-studio" && event?.sourceId === runId) || null;
  }

  function rewardFromEvent(event) {
    return { eventId: event.id, xp: Number(event.xp || 0), realmXP: Number(event.realmXP || 0), statXP: Number(event.statXP || 0), coins: Number(event.coins || 0), storyEnergy: Number(event.storyEnergy || 0) };
  }

  function todayCompletedCount() {
    const key = localDateKey(new Date());
    return (app.getState().rewardLedger?.events || []).filter(event => event?.source === "recovery-studio" && !event.duplicate && localDateKey(new Date(event.at || 0)) === key).length;
  }

  function todayRecoveryCoins() {
    const key = localDateKey(new Date());
    return (app.getState().rewardLedger?.events || []).filter(event => event?.source === "recovery-studio" && !event.duplicate && localDateKey(new Date(event.at || 0)) === key).reduce((sum, event) => sum + Math.max(0, Number(event.coins || 0)), 0);
  }

  function elapsedForActive(active) {
    const global = window.LifeRPGTime?.getActive?.();
    if (global?.id === active.timeActiveId) return Math.max(0, Number(window.LifeRPGTime?.getElapsedSeconds?.() || 0));
    const startMs = new Date(active.startedAt || 0).getTime();
    return Number.isFinite(startMs) ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0;
  }

  function persist(source) {
    app.saveState({ source });
    render();
    app.renderAll?.();
  }

  function startTicker() {
    if (ticker) return;
    ticker = window.setInterval(() => {
      if (!state().active) { stopTicker(); return; }
      reconcileExternalTimer();
      renderActive();
    }, 250);
  }

  function stopTicker() {
    if (!ticker) return;
    clearInterval(ticker);
    ticker = null;
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatDurationSeconds(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return minutes ? `${minutes}m ${secs}s` : `${secs}s`;
  }

  function floor2(value) { return Math.floor(Number(value || 0) * 100) / 100; }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

  window.LifeRPGRecoveryStudio = {
    version: VERSION,
    open: openDialog,
    start: startSession,
    getRecommendation: () => ({ ...recommendation() }),
    getState: () => ({ ...state(), active: state().active ? { ...state().active } : null })
  };
})();
