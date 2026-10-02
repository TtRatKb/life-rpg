# Life RPG V0.31.4dz6 — Home Meal Planner

## What this adds

A new **Meal Planner** lives in the Dashboard → Home Base card. It is a household utility, not a reward farm.

### Dish Library
- Add the meals you actually rotate through.
- Each dish can store:
  - name
  - 1–4 days of leftovers / coverage
  - freeform tags / conflict groups
  - per-dish cooldown override
  - optional “weekend special” preference
  - optional source / Crouton / recipe link
  - optional plain-text ingredient list
  - optional notes
- No images or full webpage HTML are stored.

### Weekly planner
- Opens on **next week** by default.
- Generates a 7-day plan from active dishes.
- Default cooldown is 1 full week: a dish used last week is blocked this week and becomes eligible again the week after.
- Tag limits enforce variety across different dishes. Defaults:
  - `#pasta` max 1 / week
  - `#potato` max 1 / week
  - `#rice` max 1 / week
  - `#tortilla` max 1 / week
- Add any custom tag rule, e.g. `#mexican = 1`.
- A 2-day dish only counts once against a tag limit.
- Dishes marked **weekend special** are preferred on Saturday/Sunday.
- If the available durations cannot exactly fill seven days without breaking rules, the planner may leave one `Open / leftovers` day rather than silently violating constraints.

### Compatible swaps
- Swap a generated meal without rebuilding the whole week.
- The swap picker only shows same-length dishes that remain compatible with:
  - cooldowns
  - tag limits
  - other meals already in that week

### Shopping + stock check
- Saved dish ingredients are grouped by meal for the selected week.
- A separate recurring stock checklist handles things such as coffee beans, toilet paper, bathroom supplies, etc.
- Tick only the recurring items that need buying.
- **Copy shopping list** produces plain text that can be pasted into another shopping-list app.

## Storage / save safety

The module uses the existing canonical Life RPG state and therefore follows the normal local + cloud save path.

It stores structured text only. A deliberately generous test with 20 dishes, 12 ingredients each, 20 recurring stock items and 12 saved week plans added only about **15 KB** to the uncompressed state. This is tiny compared with the multi-megabyte data that caused the earlier Safari localStorage issue.

No Coloring data, browser data, story data or existing saves are cleared or rewritten.

## Recipe import note

V0.31.4dz6 intentionally uses a reliable first step: save a source link and paste ingredient text directly from Crouton or a recipe page. Automatic scraping of arbitrary recipe URLs is not dependable from a static GitHub Pages app because many sites block cross-origin browser requests. A small dedicated recipe-import service can be added later without changing the planner data model.

## Install

Apply this delta over **V0.31.4dz5**. Do not clear local storage or browser data.
