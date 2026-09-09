# Life RPG — V0.31.4v Steam Baseline Reconciliation

## Fix
- Repairs the V0.31.4t/u baseline bug where Steam unlock state was stored, but already-earned achievements that were not already selected as Game Goals were not materialized visibly inside Life RPG.
- Every achievement Steam currently reports as unlocked is now represented as a completed Steam goal. Old unlocks are labelled `Historical` and receive **0 retroactive rewards**.
- Existing selected Steam goals are matched first by `steamApiName`; legacy Steam goals without an API name can be reconciled by exact normalized achievement title when the match is unambiguous.
- Users affected by the old baseline do not need to reset anything: the next manual Steam sync reconciles the existing baseline and adds the missing historical completed achievements idempotently.
- Newly unlocked, previously unselected Steam achievements are also added visibly as completed synced achievements after their one-time reward.
- Active/open goals are displayed ahead of historical completed achievements so large Steam histories do not bury current goals.

## Steam response compatibility
The client now normalizes both the existing Life RPG Worker response and common Steam Web API shapes, including combined `achievements`, raw `playerstats.achievements`, and schema achievement arrays. It also treats personal unlock state as unavailable unless that state is actually present, rather than silently assuming every achievement is locked.

## Sync diagnostics
Manual sync now reports how many historical achievements were added. Per-game Steam status also shows how many completed Steam achievements are represented in Life RPG. A successful connection returning zero achievements or no personal unlock state now produces a clear diagnostic instead of a misleading successful baseline.

## What to do
After installing this delta, fully reload the PWA and press `↻ Sync Steam` on the affected game (or `↻ Sync all Steam games`). Existing V0.31.4t/u baseline data is reused; do not delete or reset the game.
