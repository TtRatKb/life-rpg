(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity) return;

  const VERSION = "0.31.4z";
  const GROWTH = 1.03;
  const CAP = 2;
  const ACTIVITY_CONFIG = {
    sudoku: { label: "Sudoku", sources: ["sudoku-complete", "sudoku-solved"] },
    nonogram: { label: "Nonogram", sources: ["nonogram-complete"] },
    numberSense: { label: "Number Sense", sources: ["number-sense-complete"] },
    memoryGarden: { label: "Memory Garden", sources: ["memory-garden-complete"] },
    lexiconDailyWord: { label: "Daily Word", sources: ["lexicon-daily-word"] }
  };

  function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (!date || Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(key, offset) {
    const [y, m, d] = String(key || "").split("-").map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
    date.setDate(date.getDate() + Number(offset || 0));
    return localDateKey(date);
  }

  function multiplierFor(streak) {
    const safe = Math.max(1, Math.round(Number(streak || 1)));
    return Math.min(CAP, Math.pow(GROWTH, safe - 1));
  }

  function floor2(value) {
    return Math.floor(Math.max(0, Number(value || 0)) * 100) / 100;
  }

  function completionDates(activityId, extraDates = []) {
    const config = ACTIVITY_CONFIG[activityId] || { sources: [] };
    const dates = new Set((extraDates || []).map(String).filter(Boolean));
    for (const event of app.getState().rewardLedger?.events || []) {
      if (!event || event.duplicate) continue;
      const m = event.metadata || {};
      const matches = m.dailyStreakId === activityId || config.sources.includes(event.source);
      if (!matches) continue;
      const key = localDateKey(event.at || 0);
      if (key) dates.add(key);
    }
    return dates;
  }

  function consecutiveEndingAt(dates, endKey) {
    let streak = 0;
    let key = endKey;
    while (key && dates.has(key)) {
      streak += 1;
      key = addDays(key, -1);
    }
    return streak;
  }

  function summary(activityId, options = {}) {
    const today = localDateKey(new Date());
    const dates = completionDates(activityId, options.extraDates);
    const completedToday = dates.has(today);
    const yesterday = addDays(today, -1);
    const currentStreak = completedToday
      ? consecutiveEndingAt(dates, today)
      : consecutiveEndingAt(dates, yesterday);
    const nextStreak = completedToday ? currentStreak : (dates.has(yesterday) ? currentStreak + 1 : 1);
    const best = Array.from(dates).reduce((max, key) => Math.max(max, consecutiveEndingAt(dates, key)), 0);
    return {
      activityId,
      label: ACTIVITY_CONFIG[activityId]?.label || activityId,
      completedToday,
      currentStreak,
      nextStreak,
      bestStreak: best,
      multiplier: completedToday ? 1 : multiplierFor(nextStreak),
      rewardMultiplier: multiplierFor(completedToday ? Math.max(1, currentStreak) : nextStreak)
    };
  }

  function apply(activityId, spec = {}, options = {}) {
    const info = summary(activityId, options);
    if (info.completedToday) return { spec: { ...spec }, info: { ...info, eligible: false, multiplier: 1 } };
    const mult = multiplierFor(info.nextStreak);
    const base = {
      xp: Math.max(0, Number(spec.xp || 0)),
      realmXP: Math.max(0, Number(spec.realmXP ?? spec.xp ?? 0)),
      statXP: Math.max(0, Number(spec.statXP || 0)),
      coins: Math.max(0, Number(spec.coins || 0)),
      storyEnergyBase: Math.max(0, Number(spec.storyEnergyBase || 0))
    };
    const scaled = {
      ...spec,
      xp: Math.round(base.xp * mult),
      realmXP: Math.round(base.realmXP * mult),
      statXP: Math.round(base.statXP * mult),
      coins: Math.round(base.coins * mult),
      storyEnergyBase: floor2(base.storyEnergyBase * mult),
      metadata: {
        ...(spec.metadata || {}),
        dailyStreakId: activityId,
        dailyStreakLabel: info.label,
        dailyStreak: info.nextStreak,
        dailyStreakMultiplier: floor2(mult),
        dailyStreakFirstCompletion: true,
        dailyStreakBaseReward: base
      }
    };
    return { spec: scaled, info: { ...info, eligible: true, multiplier: mult, streak: info.nextStreak } };
  }

  function awardStandalone(activityId, options = {}) {
    const config = ACTIVITY_CONFIG[activityId] || {};
    const today = localDateKey(new Date());
    const existing = (app.getState().rewardLedger?.events || []).find(event => event?.source === options.source && event?.sourceId === `${activityId}:${today}`);
    if (existing) return { reward: rewardFromEvent(existing), info: summary(activityId, options), deduped: true };
    const baseSpec = {
      source: options.source || "daily-training",
      sourceId: `${activityId}:${today}`,
      label: options.label || `${config.label || activityId} · Daily consistency`,
      realm: options.realm || "Knowledge",
      capability: options.capability || "knowledge",
      xp: Number(options.xp ?? 5),
      realmXP: Number(options.realmXP ?? options.xp ?? 5),
      statXP: Number(options.statXP ?? 4),
      coins: Number(options.coins ?? 5),
      storyEnergyBase: Number(options.storyEnergyBase ?? 0.2),
      progressionRelevant: true,
      metadata: { ...(options.metadata || {}), dailyStandaloneReward: true }
    };
    const streaked = apply(activityId, baseSpec, options);
    if (!streaked.info.eligible) return { reward: null, info: streaked.info, deduped: true };
    const reward = app.awardActivity(streaked.spec);
    reward.dailyStreakInfo = streaked.info;
    return { reward, info: streaked.info, deduped: false };
  }

  function rewardFromEvent(event) {
    return {
      eventId: event?.id || null,
      xp: Number(event?.xp || 0), realmXP: Number(event?.realmXP || 0), statXP: Number(event?.statXP || 0),
      coins: Number(event?.coins || 0), storyEnergy: Number(event?.storyEnergy || 0), rawStoryEnergy: Number(event?.rawStoryEnergy || 0)
    };
  }

  function shortLabel(activityId, options = {}) {
    const info = summary(activityId, options);
    if (info.completedToday) return info.currentStreak > 1 ? `✓ Daily done · ${info.currentStreak}-day streak` : "✓ Daily done · fresh start";
    if (info.currentStreak > 0) return `${info.currentStreak}-day streak · next ×${floor2(multiplierFor(info.nextStreak)).toFixed(2)}`;
    return "Fresh start · base reward stays intact";
  }

  window.LifeRPGDailyStreaks = { VERSION, summary, apply, awardStandalone, shortLabel, multiplierFor, localDateKey };
})();
