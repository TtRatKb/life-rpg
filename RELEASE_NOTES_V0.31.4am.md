# Life RPG — V0.31.4am

## Adaptive Daily Crossword

Lexicon Lab now generates Crosswords directly from the live 300-word Lexicon profile. No export is required for ordinary future updates.

### Daily Crossword
- Unlocks after the 100-word Starter Calibration is complete.
- Generates about 8 connected terms from words already rated in Life RPG.
- Selection is challenge-weighted: `new` is strongest, `heard` is frequent, and `known` provides familiar anchors.
- Words with previous misses are more likely to return.
- Repeated successful recalls gradually reduce selection pressure as the word becomes Familiar / Active / Mastered.
- One rewarded Daily Crossword per calendar day.
- The generated puzzle is saved for that day, so later rating changes do not reshuffle an in-progress puzzle.

### Practice
- Generates another fresh adaptive Crossword whenever wanted.
- No Character XP, Realm XP, Coins, Story Energy, or Skills-economy event is created.
- Correct recalls and misses still update the personal Lexicon, because it is real practice.
- This preserves the pleasant “one Daily” cadence without blocking extra puzzles.

### Future ratings
Starter/Extended Calibration and Daily Word ratings write to the same Lexicon state. Tomorrow's Crossword automatically sees them. A profile export is now only a backup/inspection tool.

### Clues
All 300 current pool entries already have stored definitions/examples, so this release reuses the existing Lexicon data rather than shipping a second clue database.

### Rewards
The Daily Crossword currently uses the former first-tier Crossword base:
- 18 Character XP
- 18 Knowledge Realm XP
- 12 Capability XP
- 10 Coins
- 0.50 base Story Energy
- existing Skills mapping continues to grant Language & Expression Skill XP from the rewarded Lexicon completion

Practice mode intentionally creates no economy reward.

### Compatibility
The retired 30 fixed Crosswords remain in the code/save compatibility layer but are no longer the normal play route.
