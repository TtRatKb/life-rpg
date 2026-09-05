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

1. Playtest **V0.30.0 Social World Content Expansion** in normal use, especially World presence, repeatable Talks and phone replies.
2. Continue targeted Story / Social content growth from actual play feedback rather than flooding every pool at once.
3. Resume noncanonical CG calibration only after the normal VN presentation remains stable.
4. Synchronize Project Sources at the next chat handoff rather than after each patch.

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


## V0.28.4 — Consolidation & QA Fix

- Restored installable PWA support with a real `manifest.webmanifest`, 180/192/512 app icons, a fresh shell cache, and precache logic that no longer aborts the entire install because one optional asset is unavailable.
- Replaced the final active legacy SVG location backgrounds with illustrated `city_dusk.png` and `station_evening.png` VN backgrounds.
- Corrected three story visual-state transitions where Mina could remain on the stage after leaving or after the interaction had become remote/text-only.
- Synchronized Bakugo runtime references with files that actually exist in the repo. The already-approved tired/vulnerable family remains canon, but missing source PNGs now use explicit safe V2 runtime fallbacks instead of broken paths.
- Changed all 45 built-in Quests to permanent, position-independent `core-*` IDs and added migration for existing loadouts, completion logs, reward-ledger quest references, and Daily Planner picks/memory.
- Bumped shell and Story Pack revision/cache references to V0.28.4 and refreshed outdated Side Adventure helper copy.
- No Story prose, choices, rewards, relationship progression, unlock conditions, book/game data, habit history, or existing save progress were intentionally changed.

## V0.29.0 — Living World & Locations
- Turned World locations into visitable places rather than event-only cards: every unlocked location can now be opened even when it is quiet.
- Added full visual location sheets using the current VN background art, including responsive mobile bottom-sheet behavior.
- Added deterministic daypart-aware character presence. Familiar characters can appear at appropriate unlocked locations when story state, available Talk/Hangout content and time of day support it; availability is stable within a daypart instead of rerolling on every render.
- Location visits can now expose free World Moments, location-appropriate Talks and unlocked Hangouts directly from the place where they make sense.
- Multiple familiar characters can be present at the same place; World cards show stacked portraits and the location sheet exposes each available interaction separately.
- Added quiet-location states so the map still feels explorable when nobody is currently there.
- Added lightweight world visit history to social save state for future reactivity without changing relationship values or Story Energy.
- Added Station as a narratively unlocked location tied to the existing commute story state; existing saves migrate automatically once that story state is already complete.
- Preserved the one-relationship-gain-per-character-per-day rule for Talks and all existing Story/Message/Hangout/World Moment content and rewards.


## V0.29.1 — Library & Collections Polish

- Added persistent Grid / Compact List views and sorting controls for Books and Games.
- Books now support an explicit Owned / Unread shelf state in addition to Want to Read, Reading, Paused, Finished, and DNF.
- Book-series metadata now includes optional total series length and cards surface series completion progress from tracked books.
- Existing current-page / Finish Book reading progress remains intact and is more visible in the collection views.
- Games now label the backlog as Want to Play, add a Dropped state, and keep Playing / Paused / Completed / Endless states.
- Added bulk game import (one title per line, with optional platform) with duplicate protection and existing stewardship rewards/caps.
- Added mobile sticky quick-add controls for Books and Games so adding a title or pasting a list is reachable without scrolling back to the hero.
- Add dialogs now show the base Life RPG upkeep reward before saving.
- No story content, progression conditions, relationship values, or existing activity rewards were changed.


## V0.30.0 — Social World Content Expansion

- Expanded the installed social layer without advancing the Main Story past its current 14 canonical chapters.
- Increased Talk coverage from 58 to 76, with substantially larger post-move-in pools for Kirishima and Bakugo plus more location-aware Mina conversations.
- Increased story-linked message entries from 23 to 32; every new thread has real Luca reply choices and persistent trait memory.
- Increased Hangouts from 8 to 12 with low-pressure, story-appropriate optional time together rather than disguised Main Story chapters.
- Increased World Moments from 14 to 22, including Station and Shared Apartment moments plus multi-character household staging.
- Added more real-life reactivity: selected Talks / World Moments can be prioritized by recent Work, Reading, Gaming, Recovery or low-energy Daily Check-in context.
- Expanded daypart-aware Station presence so eligible Mina / Kirishima / Bakugo interactions can actually surface through World instead of existing only in People.
- Updated People relationship labels and known-details text so Bakugo and Kirishima stop reading as mere “new acquaintances” after Luca has actually moved in.
- Preserved the one-relationship-gain-per-character-per-day Talk rule, free extra Talks, free Hangouts / World Moments, existing Story Energy economy, Main Story prose, current chapter unlocks and all prior save data.
- No canon CGs were added.
