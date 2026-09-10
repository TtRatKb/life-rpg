(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState || !app?.awardActivity) {
    console.error("Life RPG independent Journal rewards could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const VERSION = "0.31.4ab";
  const MIGRATION_KEY = "independentReflectionRewardsV0314ab";
  const FIELDS = {
    gratitude: { icon: "🌸", label: "Gratitude" },
    smallWin: { icon: "⭐", label: "Small win" },
    hardThing: { icon: "🌧", label: "What was hard" }
  };
  const TIERS = [
    { chars: 50, xp: 5, coins: 5, storyEnergyBase: 0 },
    { chars: 150, xp: 5, coins: 5, storyEnergyBase: 0.10 },
    { chars: 300, xp: 10, coins: 10, storyEnergyBase: 0.15 },
    { chars: 600, xp: 15, coins: 15, storyEnergyBase: 0.25 },
    { chars: 1000, xp: 10, coins: 10, storyEnergyBase: 0.15 }
  ];

  const originalAwardActivity = app.awardActivity.bind(app);
  let activeReflectionField = null;
  let activeReflectionDate = todayKey();
  let activeDayEditorDate = null;
  let awarding = false;
  let awardTimer = null;

  installAwardCompatibility();
  ensureMigration();
  bind();
  renderMetersSoon();

  function installAwardCompatibility() {
    if (app.awardActivity?.__lifeRpgJournalIndependentV0314ab) return;

    const wrapped = spec => {
      const input = spec && typeof spec === "object" ? spec : {};

      // journal.js V0.31.4c still knows the old shared-per-day depth tiers.
      // V0.31.4ab replaces them with independent per-field tiers below, so block
      // only the legacy effort transaction while keeping the normal daily base.
      if (input.source === "journal-reflection-effort") {
        return {
          xp: 0,
          realmXP: 0,
          statXP: 0,
          coins: 0,
          storyEnergy: 0,
          rawStoryEnergy: 0,
          eventId: null,
          duplicate: false,
          deduped: true,
          suppressed: true,
          suppressionReason: "replaced-by-independent-reflection-rewards"
        };
      }

      // Reflection & Self-Awareness lives in Health in the Skills registry.
      // Future Journal base transactions therefore follow the same Realm.
      if (input.source === "journal-reflection-base") {
        return originalAwardActivity({
          ...input,
          realm: "Health",
          metadata: {
            ...(input.metadata || {}),
            journalIndependentRewardsVersion: VERSION,
            reflectionRealm: "Health"
          }
        });
      }

      return originalAwardActivity(input);
    };

    wrapped.__lifeRpgJournalIndependentV0314ab = true;
    wrapped.__originalAwardActivity = originalAwardActivity;
    app.awardActivity = wrapped;
  }

  function ensureMigration() {
    const root = app.getState();
    root.journal ||= { schemaVersion: 1, entries: {}, migrations: {} };
    root.journal.entries ||= {};
    root.journal.migrations ||= {};
    if (root.journal.migrations[MIGRATION_KEY]) return;

    // Do not create a retroactive reward dump for text already written before this
    // release. Whatever depth exists on install day is grandfathered; only later
    // thresholds crossed after V0.31.4ab pay the new independent reward.
    const date = todayKey();
    const entry = root.journal.entries[date] || {};
    const baselineTiers = {};
    Object.keys(FIELDS).forEach(field => {
      const chars = cleanText(entry[field]).length;
      baselineTiers[field] = TIERS.filter(tier => chars >= tier.chars).length;
    });

    root.journal.migrations[MIGRATION_KEY] = {
      version: VERSION,
      installedAt: Date.now(),
      baselineDate: date,
      baselineTiers
    };
    app.saveState({ source: "journal-independent-rewards-migration" });
  }

  function bind() {
    document.addEventListener("click", event => {
      const fieldButton = event.target.closest?.("[data-reflection-field]");
      if (fieldButton && FIELDS[fieldButton.dataset.reflectionField]) {
        activeReflectionField = fieldButton.dataset.reflectionField;
        renderMetersSoon();
      }

      const directReflect = event.target.closest?.("[data-journal-reflect]");
      if (directReflect) {
        activeReflectionDate = directReflect.dataset.journalReflect || todayKey();
        activeReflectionField = null;
        renderMetersSoon();
      } else if (event.target.closest?.("#journalReflectButton")) {
        activeReflectionDate = todayKey();
        activeReflectionField = null;
        renderMetersSoon();
      }

      const dayButton = event.target.closest?.("[data-journal-date]");
      if (dayButton?.dataset.journalDate) {
        activeDayEditorDate = dayButton.dataset.journalDate;
        renderMetersSoon();
      }
    });

    document.addEventListener("input", event => {
      const id = event.target?.id;
      if (id === "journalReflectionTextarea") renderReflectionMeter();
      if (["journalDayGratitude", "journalDaySmallWin", "journalDayHardThing"].includes(id)) renderDayMeters();
    });

    window.addEventListener("life-rpg:render", renderMetersSoon);
    window.addEventListener("life-rpg:state-saved", event => {
      if (awarding) return;
      const source = String(event.detail?.source || "");
      if (!source.startsWith("journal-") || source === "journal-independent-reward-award" || source === "journal-independent-rewards-migration") return;
      window.clearTimeout(awardTimer);
      awardTimer = window.setTimeout(() => {
        awardPendingForDate(todayKey(), { showToast: true });
        renderMetersSoon();
      }, 35);
    });
  }

  function awardPendingForDate(date, { showToast = false } = {}) {
    if (date !== todayKey()) return emptyTotal();
    const root = app.getState();
    const entry = root.journal?.entries?.[date];
    if (!entry) return emptyTotal();

    const total = emptyTotal();
    let awardedCount = 0;
    awarding = true;
    try {
      Object.entries(FIELDS).forEach(([field, meta]) => {
        const chars = cleanText(entry[field]).length;
        TIERS.forEach((tier, index) => {
          if (chars < tier.chars || isGrandfathered(date, field, index) || hasTierEvent(date, field, index)) return;
          const reward = originalAwardActivity({
            source: "journal-reflection-field-effort",
            sourceId: tierSourceId(date, field, index),
            label: `${meta.label} · ${tier.chars}+ characters`,
            realm: "Health",
            capability: "wellbeing",
            xp: tier.xp,
            realmXP: Math.max(0, Math.round(tier.xp * 0.5)),
            statXP: Math.max(0, Math.round(tier.xp * 0.5)),
            coins: tier.coins,
            storyEnergyBase: tier.storyEnergyBase,
            progressionRelevant: true,
            metadata: {
              reflection: true,
              independentReflectionField: true,
              journalIndependentRewardsVersion: VERSION,
              field,
              characters: chars,
              threshold: tier.chars,
              effortTier: index + 1
            }
          });
          if (!reward || reward.duplicate) return;
          addTotal(total, reward);
          awardedCount += 1;
        });
      });

      if (awardedCount) {
        app.saveState({ source: "journal-independent-reward-award" });
        app.renderAll?.();
      }
    } finally {
      awarding = false;
    }

    if (awardedCount && showToast) {
      const parts = [];
      if (total.xp) parts.push(`+${total.xp} XP`);
      if (total.storyEnergy) parts.push(`+${formatEnergy(total.storyEnergy)} 🔥`);
      if (total.coins) parts.push(`+${total.coins} 🪙`);
      app.showToast?.(`🌙 Reflection depth · ${parts.join(" · ")}`);
    }
    return total;
  }

  function hasTierEvent(date, field, index) {
    return (app.getState().rewardLedger?.events || []).some(event =>
      event?.source === "journal-reflection-field-effort" && event?.sourceId === tierSourceId(date, field, index)
    );
  }

  function tierSourceId(date, field, index) {
    return `${date}:${field}:tier-${index + 1}:v0314ab`;
  }

  function isGrandfathered(date, field, index) {
    const migration = app.getState().journal?.migrations?.[MIGRATION_KEY];
    if (!migration || migration.baselineDate !== date) return false;
    return Number(migration.baselineTiers?.[field] || 0) >= index + 1;
  }

  function renderMetersSoon() {
    window.setTimeout(() => {
      renderReflectionMeter();
      renderDayMeters();
    }, 0);
  }

  function renderReflectionMeter() {
    const meter = document.getElementById("journalReflectionRewardMeter");
    const textarea = document.getElementById("journalReflectionTextarea");
    const dialog = document.getElementById("journalReflectionDialog");
    if (!meter || !textarea || !dialog?.open || !activeReflectionField) return;
    meter.innerHTML = meterMarkup(cleanText(textarea.value).length, activeReflectionDate, activeReflectionField);
  }

  function renderDayMeters() {
    const meter = document.getElementById("journalDayRewardMeter");
    const dialog = document.getElementById("journalDayDialog");
    if (!meter || !dialog?.open) return;
    const date = activeDayEditorDate || todayKey();
    const values = {
      gratitude: document.getElementById("journalDayGratitude")?.value || "",
      smallWin: document.getElementById("journalDaySmallWin")?.value || "",
      hardThing: document.getElementById("journalDayHardThing")?.value || ""
    };
    meter.style.display = "grid";
    meter.style.gap = "12px";
    meter.style.padding = "0";
    meter.style.border = "0";
    meter.style.background = "transparent";
    meter.innerHTML = Object.entries(FIELDS).map(([field, meta]) =>
      `<section><small style="display:block;margin:0 0 6px;font-weight:800;letter-spacing:.06em">${meta.icon} ${escapeHtml(meta.label).toUpperCase()}</small>${meterMarkup(cleanText(values[field]).length, date, field)}</section>`
    ).join("");
  }

  function meterMarkup(chars, date, field) {
    const reached = TIERS.filter(tier => chars >= tier.chars).length;
    const nextIndex = TIERS.findIndex(tier => chars < tier.chars);
    const historical = date !== todayKey();
    const fieldMeta = FIELDS[field] || { label: "Reflection" };
    const next = nextIndex >= 0 ? TIERS[nextIndex] : null;
    const width = next ? Math.min(100, Math.round((chars / next.chars) * 100)) : 100;

    let detail;
    if (historical) {
      detail = `<strong>Saved ${escapeHtml(fieldMeta.label.toLowerCase())} depth</strong><span>Older entries stay editable, but editing them does not create backdated reward farming.</span>`;
    } else if (next) {
      const already = isGrandfathered(date, field, nextIndex) || hasTierEvent(date, field, nextIndex);
      const reward = `+${next.xp} XP · +${next.coins} 🪙${next.storyEnergyBase ? ` · +${formatEnergy(next.storyEnergyBase)} 🔥 base` : ""}`;
      detail = `<strong>${Math.max(0, next.chars - chars)} character${next.chars - chars === 1 ? "" : "s"} to the next ${escapeHtml(fieldMeta.label.toLowerCase())} reward</strong><span>${already ? "This tier is already secured · " : "Next: "}${reward}</span>`;
    } else {
      detail = `<strong>Maximum writing bonus reached for this reflection ✨</strong><span>Keep writing only if you want to — rewards stop scaling after ${TIERS.at(-1).chars} characters in this field.</span>`;
    }

    return `<div class="journal-effort-meter-v310"><div class="journal-effort-meter-top-v310"><span><b>${chars}</b> characters in this reflection</span><em>${reached}/${TIERS.length} depth bonuses</em></div><i><b style="width:${width}%"></b></i><div>${detail}</div></div>`;
  }

  function emptyTotal() { return { xp: 0, coins: 0, storyEnergy: 0 }; }
  function addTotal(total, reward) {
    total.xp += Math.max(0, Number(reward?.xp || 0));
    total.coins += Math.max(0, Number(reward?.coins || 0));
    total.storyEnergy = round2(total.storyEnergy + Math.max(0, Number(reward?.storyEnergy || 0)));
  }

  function cleanText(value) { return String(value || "").trim(); }
  function round2(value) { return Math.round(Number(value || 0) * 100) / 100; }
  function formatEnergy(value) {
    if (app.formatEnergy) return app.formatEnergy(value);
    const safe = round2(value);
    return Number.isInteger(safe) ? String(safe) : safe.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  window.LifeRPGJournalRewards = {
    version: VERSION,
    tiers: TIERS.map(tier => ({ ...tier })),
    awardPendingForToday: () => awardPendingForDate(todayKey(), { showToast: true }),
    awardPendingForDate
  };
})();
