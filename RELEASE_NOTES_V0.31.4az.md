# Life RPG V0.31.4az — Seasons & Special Days

## What changed
- Added a persistent **Seasonal Life** layer to Base Camp / Home Base.
- Spring / Summer / Autumn / Winter now provide changing weekly apartment ambience.
- Added spoiler-safe character birthday windows for Mina, Katsuki and Eijiro based on official profile dates.
- Birthday windows are deliberately generous: 3 days before through 7 days after. Missing them never reduces Friendship/Affection.
- A gift given during that soft birthday window lands slightly warmer in the hidden relationship layer, without exposing numbers.
- Added selected Japanese annual events: New Year, Setsubun, Valentine season, White Day, Golden Week, Tanabata, Obon, Halloween week and Christmas season.
- Added exact Japanese national-holiday context using recurring holiday rules, including equinox approximations, substitute holidays and citizens' holidays.
- Special-event windows are intentionally wider than one real date so the app never becomes a FOMO calendar.
- Added one optional **Seasonal Find** per special-event window. It goes to the normal Gift Shelf and costs no Coins.
- Added ten seasonal gift items; none are required and seasonal gifts do not bypass normal preference learning.
- Added a **Seasonal Memories** archive for viewed ambient/special moments.
- Added season/special-day condition hooks to Story UI so future authored Talks/Hangouts/World Moments can be gated by `when.season`, `when.seasons`, `when.specialDay` or `when.specialDays` without a new engine pass.
- Shared Apartment hub context signals now include season / special-day / Japanese-holiday / birthday context for future Living World authoring.

## No-FOMO rules
- No missed event removes XP, Coins, Story Energy, Gifts, Friendship or Romantic Affection.
- Birthdays have a long grace window and no negative state.
- Annual-event content is optional; it returns next year if ignored.
- Seasonal ambience is a bonus layer, never a required Daily task.

## Save compatibility
- Adds `seasonalLife` as an additive save branch.
- Existing AY1 gifts, Gift Notes, keepsakes, relationship progress, Story state and all progression remain intact.
