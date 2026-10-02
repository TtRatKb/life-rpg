# Life RPG V0.31.4dz10 — Meal Planner Tag Alias Fix

## Fix
- Meal Planner staple-conflict tags are now normalized across common German/English variants.
- `Kartoffel`, `Kartoffeln`, `potato`, `potatoes` -> `kartoffeln`.
- `Nudel`, `Nudeln`, `pasta`, `noodle`, `noodles` -> `nudeln`.
- `Reis`, `rice` -> `reis`.
- `Tortilla`, `tortillas` -> `tortilla`.
- Default tag limits are stored against those canonical groups, so `#kartoffeln` now correctly uses the built-in max-1-per-calendar-week rule.
- Existing dish tags and existing English default rules are normalized on load; no manual retagging is required.
- Dish editor / Rules copy now explains the alias behavior.

## QA
- Tested a 4-day plan starting Wednesday 2026-10-07 with two separate potato dishes tagged `#kartoffeln` and `potato`.
- Repeated plan generation never placed more than one potato-family dish in the same calendar week.
- JavaScript syntax check passed.

## Upgrade
Copy this delta over V0.31.4dz9. Do not clear browser storage or reset the Life RPG save.
