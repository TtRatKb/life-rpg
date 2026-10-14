# Life RPG — Codex instructions

Cozy HTML/CSS/JavaScript PWA with an English romance/life-sim story. Seven Realms reward real-life effort, including rest and hobbies; never add guilt, FOMO or punitive mechanics.

## Engineering

- Current `main` is the code baseline. Preserve script initialization, `window.LifeRPG*` interfaces, PWA cache/versioning and integration boundaries.
- Never lose or reset local/cloud saves, IndexedDB drawings, stable IDs, logs, XP, ranks, Talent/Journey purchases, Story entitlements, music/Steam history or offline/conflict recovery. Preserve old formats; make migrations idempotent. Never clear browser storage or overwrite failed saves.
- Use canonical `awardActivity()`/ledger and Skill reconciliation for real completions. Preserve deduplication, undo and rebuild; no double rewards across Quests, Habits, timers or external bridges. Japanese Foundations remains archival.
- Keep student/health data and API secrets out of public code/logs. Respect approved story/visual canon; never expose unreleased spoilers in PRs or reports.
- Implement requested scope only; inspect callers and persistence. Run available syntax, targeted regression and smoke tests using synthetic data. Distinguish mocks from device/Firebase tests.

## GitHub workflow — completed coding tasks

1. Create a branch from current `main`; commit, push and open a PR to `main`.
2. Verify relevant tests, required CI checks, conflicts and data safety. Fix failures; never bypass protections.
3. Enable auto-merge if supported; otherwise merge independently **only after successful applicable checks**, never with unresolved risks.
4. Confirm the change exists on remote `main`; report tests, limitations and deployment status. Codex previews are not GitHub publication.

Read `docs/{ARCHITECTURE,DATA_SAFETY,GAME_SYSTEMS,TESTING}.md` and relevant canon sources **only as needed**.
