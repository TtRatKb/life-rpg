# Life RPG — V0.31.4q Lexicon Lab

## V0.31.4q · Advanced German Lexicon through real word puzzles

- Replaced the playable **Word Lab V1** with **Lexicon Lab**. The old `wordLab` save/history is left untouched for compatibility, but its scripts/UI are no longer loaded.
- Added **German Academic Crossword Journey · 30 fixed puzzles** with stable layouts and definition-based clues.
- Current vocabulary pool contains **85 advanced German terms** across Bildungssprache, Wissenschaft & Forschung, Argumentation & Analyse, Präziser schreiben, Pädagogik & Didaktik, Religion/Geisteswissenschaften and Mathematik/Wissenschaftssprache.
- Added a **personal lexicon**. Terms progress through `Discovered → Familiar → Active → Mastered` through repeated successful recall across crossword encounters; misses are tracked without punishment.
- Added collection progress, recent-word status and a non-punitive optional **Daily Lexicon** that simply continues the next crossword.
- Crosswords run in the existing distraction-free Training Focus view. Keyboard entry, arrow navigation, Backspace movement, clue selection and Enter-to-check are supported.
- `Check puzzle` now gives local wrong/empty-cell feedback. A correct puzzle shows a full in-context completion panel, exact rewards, mastery upgrades and Next Puzzle / Return buttons.
- First completion rewards Character XP + Knowledge Realm XP + Knowledge/Lexicon capability XP + Story Energy + Coins. Multiple new crosswords in one day taper with the standard `100% → 75% → 50% → 35%` pattern. Replays never pay first-completion rewards again.
- Activity & Reward Ledger now records **Lexicon Lab** crossword completions. Historical Word Lab transactions remain readable as legacy entries rather than being deleted or rewritten.
- English Advanced Lexicon is intentionally only a future placeholder in this release; the German mode is the actual playable focus.
- Added no heavy image assets. Crossword/lexicon UI is CSS-only and uses the existing cream/plum Training Grounds visual language.
- PWA cache bumped to V0.31.4q.

## Validation

- 30/30 crossword layouts validated for bounds and intersection consistency.
- 85/85 vocabulary entries have a term, theme and definition clue.
- Maximum generated crossword footprint: 17 × 16 cells.
- No duplicate HTML IDs after integration.
- `lexicon-lab.js`, `activity-log.js`, `service-worker.js` and `pwa.js` pass Node syntax checks.
