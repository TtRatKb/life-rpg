(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app) return;

  let ticker = null;

  init();

  function init() {
    document.addEventListener("click", handleClick);
    window.addEventListener("life-rpg:time-change", () => {
      app.renderAll?.();
      updateLiveTimers();
    });
    ticker = window.setInterval(updateLiveTimers, 1000);
    updateLiveTimers();
  }

  function handleClick(event) {
    const questStart = event.target.closest?.("[data-universal-quest-timer-start]");
    if (questStart) {
      event.preventDefault();
      const questId = questStart.dataset.universalQuestTimerStart;
      const minutes = Math.max(1, Number(questStart.dataset.universalTimerMinutes || 15));
      if (window.LifeRPGTime?.getActive?.()) {
        app.showToast?.("Another timer is already running. Stop or cancel it first.");
        return;
      }
      window.LifeRPGTime?.startQuest?.({ questId, minutes });
      app.renderAll?.();
      updateLiveTimers();
      return;
    }

    const adventureStart = event.target.closest?.("[data-universal-adventure-timer-start]");
    if (adventureStart) {
      event.preventDefault();
      const adventureId = adventureStart.dataset.universalAdventureTimerStart;
      const roadmapStepId = adventureStart.dataset.universalAdventureStep || null;
      const minutes = Math.max(1, Number(adventureStart.dataset.universalTimerMinutes || 30));
      const label = adventureStart.dataset.universalTimerLabel || "Adventure step";
      if (window.LifeRPGTime?.getActive?.()) {
        app.showToast?.("Another timer is already running. Stop or cancel it first.");
        return;
      }
      window.LifeRPGTime?.startAdventure?.({ adventureId, roadmapStepId, minutes, label });
      app.renderAll?.();
      updateLiveTimers();
      return;
    }

    const finish = event.target.closest?.("[data-universal-timer-finish]");
    if (finish) {
      event.preventDefault();
      window.LifeRPGTime?.finishActive?.();
      return;
    }

    const cancel = event.target.closest?.("[data-universal-timer-cancel]");
    if (cancel) {
      event.preventDefault();
      window.LifeRPGTime?.cancelActive?.();
    }
  }

  function activeKey(active) {
    if (!active) return "";
    if (active.linkedQuestId) return `quest:${active.linkedQuestId}`;
    if (active.linkedAdventureId) return `adventure:${active.linkedAdventureId}:${active.linkedRoadmapStepId || "session"}`;
    return "";
  }

  function updateLiveTimers() {
    const active = window.LifeRPGTime?.getActive?.();
    const key = activeKey(active);
    if (!active || !key) return;

    const elapsedSeconds = Math.max(0, Number(window.LifeRPGTime?.getElapsedSeconds?.() || 0));
    const targetSeconds = Math.max(60, Number(active.targetMinutes || 1) * 60);
    const reached = elapsedSeconds >= targetSeconds;
    const clockText = reached ? `+${formatClock(elapsedSeconds - targetSeconds)}` : formatClock(targetSeconds - elapsedSeconds);
    const kind = active.linkedAdventureId ? "Adventure step" : "Quest";

    document.querySelectorAll("[data-universal-timer-live]").forEach(panel => {
      if (panel.dataset.universalTimerLive !== key) return;
      panel.classList.toggle("minimum-reached", reached);
      const kicker = panel.querySelector("[data-universal-timer-kicker]");
      const clock = panel.querySelector("[data-universal-timer-clock]");
      const status = panel.querySelector("[data-universal-timer-status]");
      const button = panel.querySelector("[data-universal-timer-finish]");
      if (kicker) kicker.textContent = reached ? "MINIMUM REACHED" : "MINIMUM REMAINING";
      if (clock) clock.textContent = clockText;
      if (status) status.textContent = reached
        ? `Overtime counts too — stop whenever you want. The actual time will be logged.`
        : `${formatNumber(active.targetMinutes)} minutes completes this ${kind}.`;
      if (button) button.textContent = reached ? "Finish & complete" : "Stop & log time";
    });
  }

  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatNumber(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  }
})();
