# Life RPG V0.31.4dz5 — Game Motivation Continuity

Base: V0.31.4dz4.

## Why
The first Action-Ready Daily Plan treated recent repetition as broadly undesirable. That makes sense for chores and low-interest backlog items, but not for a game you are actively enjoying. A game marked `Playing + Very high` should be allowed to remain in rotation across consecutive days.

## Changes
- Game recommendation recency now scales with Current motivation and status.
- `Playing/Endless + Very high` has almost no automatic item-repeat penalty.
- `Playing/Endless + High` has only a small repeat penalty.
- `Okay` still gets moderate rotation; `Later` and `Someday` get stronger rotation pressure.
- Recently played active games gain positive momentum when motivation is Very high/High.
- Explicit Swap / Not Today memory is NOT weakened by motivation. User rejection still wins.
- Changing a game to `Playing + Very high` can immediately promote it into an untouched, unfinished Care/Optional slot in today's plan.
- The one-time DZ5 migration applies the same safe reflow to a DZ4 plan that was generated before the new motivation was set. Completed picks, manually swapped picks, and cleared batches are never rewritten.

## Save safety
No game IDs, logs, Steam data, rewards, browser storage, Coloring data, or existing motivation values are deleted. The Daily Planner schema advances from 9 to 10 only to mark the continuity migration.
