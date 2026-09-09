# Life RPG — V0.31.4t Steam Achievement Sync V2

## V0.31.4t · Historical baseline + automatic Steam unlock rewards
- Existing Steam games can now create a safe personal-achievement baseline from the already configured Worker + SteamID64. Achievements that were already unlocked at baseline are marked historical/completed without retroactive rewards.
- Future real Steam `locked → unlocked` transitions are detected by stable `Steam App ID + achievement API name` keys and can never pay twice on reload/resync.
- Matching imported Steam Game Goals complete automatically. Selected goals use the normal goal-sized reward; spontaneous/unselected achievement unlocks still receive a smaller Life RPG reward.
- Steam unlock rewards grant Character XP + the game's Realm/Capability XP + Story Energy + Coins, with gentle same-day diminishing for large batches.
- Hidden achievements remain undisclosed before unlock unless the existing explicit hidden-achievement toggle is used; a genuinely unlocked hidden achievement may then appear normally.
- Game cards now show `unlocked / total`, last-sync age and a manual `Sync Steam` button. Life RPG also performs a conservative automatic sync on startup/return/Games-open only when the previous sync is at least six hours old.
- Existing imported Steam goals are reconciled against the baseline without a historical reward avalanche.
- Activity & Reward History now labels new unlock transactions as **Steam Achievement** with exact credited rewards and Steam metadata.
- The existing Cloudflare Worker endpoint is reused; no new paid service, secret or Firebase/Worker setup is required.
- PWA cache bumped to V0.31.4t.

## Validation
- Baseline test: mixed locked/unlocked achievements → historical unlocks complete matching goals but grant 0 retro rewards.
- Transition test: selected locked goal → real unlock → goal auto-completes + exactly one normal-sized reward.
- Spontaneous unlock test: unselected achievement → smaller one-time reward.
- Hidden unlock test: hidden locked state stores no user-facing name; real unlock rewards normally.
- Repeated sync test: no duplicate payout.
- JavaScript syntax and PWA asset/version references checked.

---

# Life RPG — V0.31.4s Smart Action Routing

## V0.31.4s · Native activities now fulfill their Dailies/Quests
- Added one central `smart-action-router.js` registry so Daily Plan / Quest Board actions can open richer in-app activities instead of parallel plain timers.
- `10-Minute Body Scan` now launches the guided Recovery Studio Body Scan; `15-Minute Lie-Down Reset` launches guided Quiet Rest; `10-Minute Breathing Reset` now has a matching guided 10-minute breathing session.
- Sudoku Quest/Daily actions continue to open the actual Sudoku Journey rather than a generic log flow.
- Completing an exact guided/native activity automatically writes the matching Quest/Daily completion without paying a duplicate Quest reward. Native activity rewards remain the single completion reward; Life Rhythm time remains a separate time log where applicable.
- Linked Quest rows in Activity & Reward History explicitly say they were completed via a guided/in-app activity and that rewards were credited on the native activity.
- Manual logging remains available for cases where the same real-life action was done outside Life RPG.
- Story Momentum automatically benefits from the same native Recovery/Knowledge reward events and Recovery time logs, so there is no separate manual checkbox to desync.
- Added a small `GUIDED IN-APP` / `IN-APP` badge on matching Daily/Quest actions.
- Added a public semantic-action registry for future Daily actions (Sudoku, Nonogram, Number Sense, Memory Garden, Recovery Studio, Kotoba Quick Study, Lexicon Lab, Training Grounds).
- PWA cache bumped to V0.31.4s.

## V0.31.4r · Living phone + real-time story rhythm

- Story-linked messages now become **eligible first and arrive later** through a persistent local-time scheduler instead of dumping every newly unlocked thread immediately.
- Message delivery respects authored chronology, sensible dayparts, per-person open-thread order and a global social cooldown. Nothing expires and there are no read-receipt/streak penalties.
- Phone threads now support **multi-bubble NPC bursts, typing indicators, delayed responses and optional additional Luca reply turns**. Existing one-reply messages remain compatible; old already-replied threads migrate as already completed.
- Texting voice is more conversational in the current social content: Mina is expressive/emoji-friendly, Kirishima warm/casual, Bakugo terse, and Luca can use lighter punctuation/slang/emoji where relationship context supports it.
- Added an optional **weather-aware message context** in Phone settings. It is off by default, uses only a user-entered approximate city, and falls back to neutral message wording whenever context is unavailable. No weather/location access is required.
- Story chapters whose installed narrative clearly advances to a later real day/daypart now use spoiler-safe **story-time gates**. Story Energy and Story Momentum can still be completed in parallel while waiting. Dayparts are earliest-opening times, not appointments that can be missed.
- Household story cadence now preserves an explicit longer time jump instead of allowing several in-fiction days to be consumed back-to-back.
- Solo stage sprites use authored natural-facing metadata to choose left/center/right placement. A solo right-facing Bakugo is placed on the left rather than being mirrored, preserving asymmetric visual details. Existing multi-character inward staging and beat-aware dimming remain intact.
- Current weather-dependent messages have neutral default text; rain-specific wording is only selected when opted-in recent weather context actually matches.
- PWA cache bumped to V0.31.4r and now precaches the current story engine/pack for more reliable offline use.

## Validation

- Current 32-message pack audited for stable group IDs, delivery metadata and per-person ordering.
- Existing Mina move/first-night chronology constraint validated.
- Multi-turn branch IDs and follow-up paths validated.
- Story temporal metadata validated against the installed 14-scene chronology without exposing unreleased scene prose in UI.
- JavaScript syntax, pack encode/decode integrity, PWA core paths and modified HTML IDs checked.

---

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