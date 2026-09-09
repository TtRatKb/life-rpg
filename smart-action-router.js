(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.getQuestCatalog || !app?.logQuestProgress || !app?.awardActivity) return;

  const VERSION = "0.31.4s";
  const SCHEMA = 1;
  const HISTORY_LIMIT = 500;

  const QUEST_ACTIONS = {
    "recovery-body-scan": {
      key: "recovery:bodyScan10",
      type: "guided",
      badge: "GUIDED IN-APP",
      label: "Start guided body scan",
      completionLabel: "10-Minute Body Scan",
      launcher: () => window.LifeRPGRecoveryStudio?.start?.("bodyScan10"),
      match: spec => spec?.source === "recovery-studio" && spec?.metadata?.sessionId === "bodyScan10"
    },
    "recovery-breathing": {
      key: "recovery:breathing10",
      type: "guided",
      badge: "GUIDED IN-APP",
      label: "Start guided breathing",
      completionLabel: "10-Minute Breathing Reset",
      launcher: () => window.LifeRPGRecoveryStudio?.start?.("breathing10"),
      match: spec => spec?.source === "recovery-studio" && spec?.metadata?.sessionId === "breathing10"
    },
    "recovery-lie-down": {
      key: "recovery:lieDown15",
      type: "guided",
      badge: "GUIDED IN-APP",
      label: "Start guided quiet rest",
      completionLabel: "15-Minute Lie-Down Reset",
      launcher: () => window.LifeRPGRecoveryStudio?.start?.("lieDown15"),
      match: spec => spec?.source === "recovery-studio" && spec?.metadata?.sessionId === "lieDown15"
    },
    "sudoku": {
      key: "training:sudoku",
      type: "in-app",
      badge: "IN-APP",
      label: "Open Sudoku Journey",
      completionLabel: "Sudoku Journey",
      handlesQuestCompletion: true,
      launcher: quest => window.LifeRPGSudoku?.openForQuest?.(quest?.id),
      match: spec => spec?.source === "sudoku-complete"
    }
  };

  const SEMANTIC_ACTIONS = {
    sudoku: () => window.LifeRPGSudoku?.open?.(),
    nonogram: () => window.LifeRPGNonogram?.open?.(),
    "number-sense": () => window.LifeRPGNumberSense?.open?.(),
    memory: () => window.LifeRPGMemoryGarden?.open?.(),
    recovery: () => window.LifeRPGRecoveryStudio?.open?.(),
    "quick-japanese": () => window.LifeRPGKotobaQuickTraining?.startQuick?.(),
    "tiny-japanese": () => window.LifeRPGKotobaQuickTraining?.startTiny?.(),
    lexicon: () => window.LifeRPGLexiconLab?.open?.(),
    "training-grounds": () => {
      app.showView?.("growth");
      requestAnimationFrame(() => document.getElementById("trainingGroundsPanel")?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
      return true;
    }
  };

  ensureState();
  wrapAwardActivity();
  document.addEventListener("click", handleClick);

  function ensureState() {
    const root = app.getState();
    if (!root.nativeActionRouter || typeof root.nativeActionRouter !== "object" || Array.isArray(root.nativeActionRouter)) {
      root.nativeActionRouter = { schemaVersion: SCHEMA, pending: null, processedRewardEvents: [] };
    }
    const state = root.nativeActionRouter;
    state.schemaVersion = SCHEMA;
    if (!Array.isArray(state.processedRewardEvents)) state.processedRewardEvents = [];
    if (state.processedRewardEvents.length > HISTORY_LIMIT) state.processedRewardEvents = state.processedRewardEvents.slice(-HISTORY_LIMIT);
  }

  function state() {
    ensureState();
    return app.getState().nativeActionRouter;
  }

  function resolveQuest(quest) {
    if (!quest) return null;
    return QUEST_ACTIONS[String(quest.systemRole || "")] || null;
  }

  function actionInfoForQuest(quest) {
    const action = resolveQuest(quest);
    if (!action) return null;
    return { key: action.key, type: action.type, badge: action.badge, label: action.label, handlesQuestCompletion: Boolean(action.handlesQuestCompletion) };
  }

  function launchQuest(questOrId, { origin = "quest", slot = "" } = {}) {
    const quest = typeof questOrId === "string" ? app.getQuestById?.(questOrId) : questOrId;
    const action = resolveQuest(quest);
    if (!quest || !action) return false;

    const availability = app.getQuestAvailability?.(quest);
    if (availability && !availability.available) {
      app.showToast?.(availability.reason || "This action is not available yet.");
      return true;
    }

    const launched = action.launcher?.(quest);
    if (launched === false) return true;

    if (!action.handlesQuestCompletion) {
      state().pending = {
        id: `native-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        questId: quest.id,
        actionKey: action.key,
        origin,
        slot,
        launchedAt: new Date().toISOString()
      };
      app.saveState?.({ source: "native-action-link" });
    }
    return true;
  }

  function openSemantic(key) {
    const launcher = SEMANTIC_ACTIONS[String(key || "")];
    if (!launcher) return false;
    const result = launcher();
    return result !== false;
  }

  function wrapAwardActivity() {
    if (app.__nativeActionAwardWrapped) return;
    const original = app.awardActivity.bind(app);
    app.awardActivity = function nativeAwareAwardActivity(spec = {}) {
      const reward = original(spec);
      try { queueMicrotask(() => handleNativeReward(spec, reward)); } catch { setTimeout(() => handleNativeReward(spec, reward), 0); }
      return reward;
    };
    app.__nativeActionAwardWrapped = true;
  }

  function handleNativeReward(spec, reward) {
    if (!spec || !reward) return;
    const eventId = String(reward.eventId || "");
    if (eventId && state().processedRewardEvents.includes(eventId)) return;

    const matches = Object.entries(QUEST_ACTIONS).filter(([, action]) => !action.handlesQuestCompletion && action.match?.(spec));
    if (!matches.length) return;

    for (const [role, action] of matches) {
      const quest = (app.getQuestCatalog?.() || []).find(item => item.systemRole === role);
      if (!quest) continue;
      if (hasNativeQuestLog(quest.id, action.key, eventId)) continue;
      const availability = app.getQuestAvailability?.(quest);
      if (availability && !availability.available) {
        if (eventId) rememberProcessed(eventId);
        continue;
      }

      const units = Math.max(0.1, Number(quest.units || 1));
      const result = app.logQuestProgress?.(quest.id, units, {
        showOverlay: false,
        smartBypass: true,
        suppressReward: true,
        silent: true,
        nativeActionKey: action.key,
        nativeRewardEventId: eventId,
        nativeSource: String(spec.source || "")
      });
      if (result) {
        const pending = state().pending;
        if (pending?.questId === quest.id && pending?.actionKey === action.key) state().pending = null;
        if (eventId) rememberProcessed(eventId);
        app.saveState?.({ source: "native-action-quest-linked" });
        app.renderAll?.();
        app.showToast?.(`✓ ${action.completionLabel || quest.name} completed · linked Daily/Quest updated.`);
      }
    }
  }

  function hasNativeQuestLog(questId, actionKey, rewardEventId) {
    return (app.getState().completionLog || []).some(log => {
      if (log?.questId !== questId) return false;
      if (rewardEventId && log?.nativeRewardEventId === rewardEventId) return true;
      return actionKey && log?.nativeActionKey === actionKey && sameLocalDay(log.at, new Date().toISOString());
    });
  }

  function rememberProcessed(eventId) {
    if (!eventId) return;
    const items = state().processedRewardEvents;
    if (!items.includes(eventId)) items.push(eventId);
    if (items.length > HISTORY_LIMIT) state().processedRewardEvents = items.slice(-HISTORY_LIMIT);
  }

  function sameLocalDay(a, b) {
    const key = value => {
      const d = new Date(value || 0);
      return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "";
    };
    return key(a) === key(b);
  }

  function handleClick(event) {
    const launch = event.target.closest?.("[data-native-quest-launch]");
    if (launch) {
      event.preventDefault();
      launchQuest(launch.dataset.nativeQuestLaunch, { origin: launch.dataset.nativeQuestOrigin || "quest", slot: launch.dataset.nativeQuestSlot || "" });
      return;
    }
    const semantic = event.target.closest?.("[data-native-semantic-launch]");
    if (semantic) {
      event.preventDefault();
      openSemantic(semantic.dataset.nativeSemanticLaunch);
    }
  }

  window.LifeRPGNativeActions = {
    version: VERSION,
    resolveQuest,
    actionInfoForQuest,
    launchQuest,
    openSemantic,
    getPending: () => state().pending ? { ...state().pending } : null
  };

  // app.js renders once before this late-bound registry exists; refresh the UI once
  // so native/guided buttons replace generic timers immediately.
  requestAnimationFrame(() => app.renderAll?.());
})();
