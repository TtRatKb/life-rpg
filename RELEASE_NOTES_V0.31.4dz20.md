# Life RPG V0.31.4dz20 — Clickable Skills + Japanese Specialization

## Skill Tree → direct training
- Every Skill card below the Realm Talent Trees is now a real button.
- Clicking a Skill opens a `Train & Level` guide with current level, exact Skill XP progress, XP remaining to the next level, and direct Life RPG actions that can train it.
- The guide is exposed through `LifeRPGSkills.openTrainingGuide(...)`, so Dashboard Skill Momentum and the full Skills page use the same training routes.
- Existing Habit-to-Skill mapping remains available for practice that has no native launcher.

## Japanese Realm expanded
The old single Japanese Skill was too broad. It remains as `Japanese Foundations` so historical XP / earned points are preserved, and five specialized Skills are added:
- Vocabulary & Kanji
- Grammar & Particles
- Listening & Comprehension
- Reading & Comprehension
- Speaking & Production

## New Japanese routing
- New Kotoba events after the dz20 migration split are routed from their real Kotoba type/subskill rather than all going to one generic bucket.
- Vocabulary/mining, grammar/particles, listening, reading/context and output/production can therefore build different Skill levels.
- New Japanese Practice Library sessions route Listening to `Listening & Comprehension` and Mining to `Vocabulary & Kanji`.
- New Japanese-role book logs route to `Reading & Comprehension`.
- Japanese Skill dialogs show current Kotoba due counts when connected and link directly to Kotoba Quick / Kotoba status / Japanese Practice / Library / Habits where appropriate.

## Save / migration safety
- No previous Japanese Skill XP is redistributed retroactively.
- On first dz20 load, the app stores a split timestamp. Japanese practice from before that moment remains in `Japanese Foundations`; only subsequent qualifying practice uses the specialized Skills.
- This avoids silently changing previously earned Japanese Talent Points because the Skill-point curve is nonlinear.
- No browser storage reset, cloud reset, reward replay or Story changes.

## QA
- `skills.js`, `dashboard-v2.js` and `service-worker.js` pass Node syntax checks.
- Registry check confirms 26 Skills total / 6 Japanese Skills.
- Migration harness confirms pre-dz20 Kotoba practice remains Foundations while new listening/production/mining/reading practice routes to the specialized Skills.
