# Life RPG — V0.2

V0.2 is the first version where the daily loop starts to behave like the intended Life RPG rather than a static productivity dashboard.

## Changes from V0.1

- **Real Today's Loadout**
  - Quests can be added to / removed from today's loadout.
  - The Base Camp no longer just shows the first five quests.
- **Story-correct home state**
  - Luca starts in her current apartment.
  - The shared apartment is locked until a narrative flag introduces it.
  - This prevents the game UI from skipping the move-in / relationship premise.
- **More game-like Base Camp**
  - Character card, XP progress, home panel, social pulse, stats and daily loadout.
- **Quest Clear overlay**
  - Completing something now feels more like a game event.
- **Realm filters + quest search**
- **World screen**
  - Current home + school are known.
  - Future locations stay unknown until narrative introduction.
- **Social-state scaffold**
  - Contacts can unlock through hidden flags.
- **Spoiler-safe developer mode**
  - Includes simulation buttons for UI testing.
  - Uses opaque IDs / flags rather than future narrative text.
- **V0.1 local save migration**
  - Uses the same browser storage key, so existing XP / completions should carry forward.

## Important story rule reflected in code

Raw stat progression does **not** unlock story locations by itself.

For example:

```text
real workout -> Strength XP
```

does not automatically equal:

```text
Gym unlocked
```

The private story engine must first set a narrative flag such as:

```text
LOCATION_GYM_INTRODUCED
```

Then the location can become available.

## Files to upload to GitHub

Replace the files in the root of the `Life-RPG` repository with:

```text
index.html
styles.css
app.js
README.md
```

GitHub Pages will then update automatically after the new commit is deployed.

## Next milestones

1. Review the new Base Camp / daily loop.
2. Import the real quest library from the existing Life RPG data.
3. Define the exact Realm + Character Stat mapping.
4. Add the first **private spoiler-safe story pack**.
5. Add social Talk / Messages / Hangouts.
6. Add Firebase login + cloud save after the game loop feels right.

## V0.28.0 — Story Continuity & World Expansion

- Expanded the installed main story and social content while preserving hidden-story presentation.
- Audited normal VN staging so physically present speakers remain visible, with deterministic two- and three-character layouts.
- Added location-aware World moments to unlocked locations.
- Corrected current-home state so visiting the future/shared apartment does not make it Luca's home before the move-in story state.
- Added more Talks, Messages with reply choices, Hangouts, and repeatable World moments.
- No canon CGs added; CG calibration remains separate.


## V0.28.1 — Unit Quests & Reading Progress

- Added generic carry-over batch quests: log any number of units, earn rewards whenever a full batch is crossed, and keep the remainder toward the next batch.
- Added **Sort / Declutter Files** as a repeatable Home quest: every 10 files grants 5 XP + 0.5 raw Story Energy before the normal daily diminishing-return curve.
- Custom quests can now use **Batch by Units** and choose their own units-per-batch, XP, and Story Energy per batch.
- Reading logs now show the stored current page and let you log either pages read or the page you are on now.
- Page logs automatically update the book's current page and reaching the final page automatically marks the book Finished.
- Added **Finish Book** when total pages are known; it logs all remaining pages in one action and finishes the book.
- Existing saves, reading logs, quest logs, Story Energy rules, and V0.28.0 story/world content are preserved.

## V0.28.2 — Café Continuity & Visual Pass

- Replaced the legacy flat café placeholder with the illustrated **Koharu Café** VN background.
- The first canonical café meeting now unlocks Koharu Café as a World location when completed.
- Café-based hangouts explicitly require that first story café meeting, keeping repeat visits from appearing before the location has been established in the main story.
- Existing saves that already completed the first café scene automatically restore the café World unlock.
- No story prose, choices, relationship rewards, or existing completion history were removed.

## V0.28.3 — Adaptive Daily Plan Categorization

- Added explicit planner metadata to the full built-in Quest catalog: **planning effort** (low / medium / high) and a **typical time estimate**.
- Daily Check-in answers now have a much stronger effect on the three recommendations: rough-sleep / low-battery / gentle days heavily favor low-effort, shorter options; good-sleep / high-energy days can deliberately surface higher-effort focus quests.
- Quest Realm is now only a small friction hint; explicit effort + time are the primary planner signals.
- Daily recommendation cards show the quest's effort category and approximate time so the adaptation is visible rather than hidden.
- New custom Quests can set a typical time in minutes. Energy + typical time are planner-only metadata and do not change XP or Story Energy rewards.
- Existing custom Quests without planner metadata continue to work via safe fallback estimates. Existing saves, rewards, Story content, and V0.28.2 café continuity are preserved.
- Existing recommendations already generated for the day are not silently replaced during the update; the stronger matching applies on the next check-in, check-in edit, or reroll.

