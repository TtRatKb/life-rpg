# Life RPG V0.31.4dz9 — Meal History + One-Click Swap

## New
- Added a dedicated **Vergangen** tab inside Alltag → Essensplan.
- Past meals can be logged with date, dish, and actual number of days eaten.
- Logged history participates in the exact same cooldown calculations as committed meal plans.
- Past entries can be deleted/corrected without rebuilding an old plan.

## Changed
- **Tauschen** is now one-click: it immediately applies the highest-ranked compatible replacement.
- Clicking Tauschen again cycles through further compatible suggestions shown during the current session.
- Already shown options are not immediately repeated; when all compatible alternatives were seen, the current suggestion stays in place and Life RPG tells the user.
- Compatible swap checks still respect duration, dish cooldown, tag limits, and the rest of the active plan.

## Compatibility / storage
- Meal Planner schema advances from 2 to 3 by adding the lightweight `usageHistory` array.
- Existing DZ8 dishes, plans, rules, ingredients, restock items, and saves remain compatible.
- History stores only small structured text/date references; no images or page content are added to the save.

## QA
- JavaScript syntax check passed for `meal-planner.js` and `service-worker.js`.
- Test: a dish logged on 2026-10-01 with a 1-week cooldown was correctly excluded from a plan starting 2026-10-05.
- Test: one-click swap selected only a compatible alternative and did not immediately bounce back on the next click.
