# Life RPG V0.31.4dz8 — Meal Planner Navigation + Flexible Date Ranges

## Fixes

- `Essensplan` now appears as a real child entry inside the existing **Alltag** navigation group.
- It is no longer treated as a separate top-level navigation section.
- Meal planning is no longer locked to Monday–Sunday.

## Flexible planning period

The Meal Planner now uses:

- a freely selectable **start date**
- a freely selectable **number of days** from 1–31
- previous / next period buttons that move by the currently selected period length

Existing DZ6/DZ7 seven-day plans remain readable. No Meal Planner data is deleted or reset.

## Rule behavior for arbitrary ranges

- Dish cooldowns are now date-based rather than Monday-week-based.
- A 1-week cooldown means at least 7 days must have passed since the dish's last planned use.
- Tag limits such as `#pasta = 1` are evaluated **per calendar week**, even when a selected planning period starts mid-week or spans multiple weeks.
- A multi-day dish counts once for every calendar week it actually touches. This prevents a Sunday/Monday pasta meal plus another pasta meal later in that same Monday–Sunday week.
- Weekend-special scoring uses the actual dates in the chosen period.
- Swaps use the same date-aware cooldown and weekly tag rules.

## QA

- JavaScript syntax checks passed for Meal Planner, Life Hub navigation and Service Worker.
- Generator tested repeatedly with 4-, 7-, 10- and 14-day periods.
- Calendar-week tag limits held across cross-week periods.
- Legacy seven-day plan structure remains supported.

## Deploy

Apply this delta on top of V0.31.4dz7. Do not clear browser storage or reset the save.
