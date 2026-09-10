(() => {
  "use strict";

  // V0.31.4ag: the independent per-field reward logic now lives directly in
  // journal.js so it is available before the user can interact with the Journal.
  // Keep this tiny compatibility facade because older cached loaders may still
  // request journal-rewards.js for one update cycle.
  const TIERS = [
    { chars: 50, xp: 5, coins: 5, storyEnergyBase: 0 },
    { chars: 150, xp: 5, coins: 5, storyEnergyBase: 0.10 },
    { chars: 300, xp: 10, coins: 10, storyEnergyBase: 0.15 },
    { chars: 600, xp: 15, coins: 15, storyEnergyBase: 0.25 },
    { chars: 1000, xp: 10, coins: 10, storyEnergyBase: 0.15 }
  ];

  window.LifeRPGJournalRewards = {
    version: "0.31.4ag",
    tiers: TIERS.map(tier => ({ ...tier })),
    awardPendingForToday: () => window.LifeRPGJournal?.awardPendingReflectionRewards?.(),
    awardPendingForDate: date => window.LifeRPGJournal?.awardPendingReflectionRewards?.(date)
  };
})();
