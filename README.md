# Life RPG — V0.31.4p Word Lab

## V0.31.4p · Word Lab — German Precision + English Fluency

- Added **Word Lab** to Training Grounds, Growth and the Dashboard quick strip.
- Two independent 50-level Journeys:
  - 🇩🇪 **German Precision** — semantic nuance, precise wording, register, collocations, professional/academic vocabulary and practical Bildungssprache/Fachsprache.
  - 🇬🇧 **English Fluency** — natural collocations, phrasal verbs, idiomatic phrasing, advanced vocabulary, register and near-synonym nuance for an already fluent learner.
- Each level contains five fixed questions. Level content is deterministic; a level remains the same on replay/reload.
- Wrong answers show a concise explanation of why the preferred answer is more precise/natural.
- Actual level play uses the V0.31.4o distraction-free Training Focus view; the dialog remains the Journey/language selector.
- Keyboard flow: number keys 1–4 choose an answer; Enter checks it; Enter again advances.
- Separate German/English save progress, active question, selections, completion history and first-try accuracy persist across reloads.
- Daily Word Lab is optional and chooses the less recently trained language (alternating when both are equally fresh); no streak or punishment.
- First-completion rewards: Character XP + Knowledge Realm XP + Knowledge Capability XP + Story Energy + Coins. Same-day new levels taper 100% → 75% → 50% → 35%; replays do not repay first-completion rewards.
- Activity & Reward Ledger now has a **Word Lab** filter and records language, Journey level, first-try accuracy and exact credited rewards.
- No speed-based rewards. Word Lab is about increasingly precise language, not rapid clicking.


---

# Life RPG — V0.31.4o Training Grounds Focus & UX Polish

This build turns active Training Grounds exercises into focused play surfaces rather than keeping the exercise itself inside a selection modal. Sudoku and Nonogram now show clear in-context validation/completion/reward feedback, Number Sense supports keyboard-first progression plus non-rewarding fluency timing, Memory Garden reliably shows every preview before recall, and Recovery Studio uses a dedicated calm focus surface with rebalanced Body Scan / Neck & Shoulder stage timings. Existing rewards, saves and Journey progress are preserved.

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

1. Playtest **V0.30.3 Living Daily Plan & Smart Actions** in real school/work weeks: whether Anchor/Care/Optional feels relevant, whether the plan correctly leaves space on heavy days, and whether “Day got heavier” is useful before automatic time tracking exists.
2. Build **V0.30.4 Focus & Life Rhythm**: stopwatch + Pomodoro presets (including 50/10), work/time categories, moderate time-based XP/Story Energy, linked focus quests, week/month time views, Journal correlations and social reactivity.
3. Expand Library review/journal features and the lightweight Capture Inbox before reintroducing any book-review or Second-Brain actions to the planner.
4. Keep hidden canon CG art disabled until a spoiler-safe render path is available and each render passes the approved visual preflight and anatomy/continuity QA gate.
5. Synchronize Project Sources at the next chat handoff rather than after each patch.

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


## V0.30.1 — CG Runtime Readiness + Luca Portrait Cleanup

- Rebuilt Luca's active Story/runtime portrait family with true transparent PNG edges so loose hair strands no longer carry the old white matte/halo against the VN portrait card.
- Refreshed the active Neutral, Warm/Amused, Skeptical/Side-eye, Mild Annoyed and Flustered/Caught-Off-Guard portrait mappings, plus the existing happy/soft-smile/thinking compatibility images used elsewhere in the app.
- Added a data-driven dormant CG-slot layer to the current encrypted Story Pack. Five current-story moments are pre-wired with opaque CG slot IDs while retaining the normal VN background+sprite presentation until approved art is explicitly enabled.
- CG rendering now automatically switches to full-CG mode only when a slot is enabled and has a valid image source; disabled/missing CG art safely falls back to the canonical VN scene instead of blanking the stage.
- Added the calibrated CG QA gate and Luca wardrobe-direction metadata to the Story Pack's visual-direction data for future hidden rendering work.
- Canon CG art is intentionally **not bundled in this build**: the current chat image-generation surface visibly renders generated images to the player, so hidden story art remains disabled rather than breaking spoiler protection.
- No Main Story prose, choices, rewards, relationship progression, unlock conditions, social content, or existing save progress were changed.

## V0.30.2 — Daily Reflection & Journal

- Expanded the conversational Daily Check-in with **Mood** and **Stress / mental load** while preserving Sleep, Energy, Time, Obligations and Gentle-day planning context.
- Mood and mental load now gently influence Daily Plan capacity alongside the existing sleep/energy context; they guide recommendations rather than locking content.
- Daily Check-ins can now be framed as Luca self-reflection or, once narratively appropriate, occasional messages from **Mina, Kirishima or Bakugo** with character-specific question/reaction language. Kirishima/Bakugo participation stays locked until shared everyday life is established.
- Added an optional post-check-in reflection conversation for **Gratitude**, **Small Win** and **Hard Thing**. Each prompt can be skipped, revisited or edited; private reflection never awards relationship progress.
- Added a dedicated **Journal** page with a Bullet-Journal-inspired monthly spread: Mood Garden, Energy tracker, Sleep-quality tracker, Stress/load tracker, Gratitude Garden, Tiny Victories, quieter Hard-Thing context, weekly descriptive recaps and a month archive.
- Existing historical Daily Check-ins migrate into the Journal automatically where data exists; old days simply leave the new Mood/Stress fields blank rather than inventing values.
- Added a per-day Journal editor, including optional manual sleep-hours logging for people who want a more concrete sleep history without making it a mandatory Daily Check-in question.
- Added journal ownership / portability from day one: Journal data lives inside the normal Life RPG local/cloud save and can also be exported separately as **JSON** or readable **Markdown**; the Journal page supports browser **Print / Save PDF**.
- Cloud conflict scoring now recognizes Journal-only progress so reflection data is not treated as an empty save.
- Journal design deliberately has **no streak punishment**, no negative-day counter and no diagnostic claims. Missing days stay blank; weekly observations describe co-occurrence without pretending to explain causation.
- Existing Story/Social content, quests, rewards, relationship rules, libraries, CG slots and save history remain intact.


## V0.30.3a — Library Series & Search UX Polish

- Open Library series metadata is now used when available when adding a catalog match.
- Existing series in the Library are suggested while adding another book, including same-author series.
- Choosing an existing series can inherit its canonical name/known total and suggest the next likely volume number.
- The Series field now offers existing Library series as selectable autocomplete options instead of requiring exact retyping.
- After choosing an Open Library result, the search-result stack collapses automatically; “Change match” reopens it when needed.
- This is a cumulative polish pass on top of V0.30.3; no Project Sources were changed.

## V0.30.3 — Living Daily Plan & Smart Actions

- Reframed Today's Picks as **Anchor / Care / Optional** instead of a mandatory three-item productivity loadout. Slots are deliberately left empty when no good state-aware action exists.
- Heavy fixed-load days can omit the Anchor entirely: school/work/appointments are allowed to already be the day's main load.
- Added an optional **known fixed load** note to the conversational Daily Check-in (for example “6 lessons + conference · home around 17:30”).
- Added **Day got heavier** rebalancing so the remaining plan can be lightened when reality changes after the morning check-in. This is the manual bridge to later automatic Work/Time tracking.
- Daily cards now emphasize **Why this today?**, **What counts as done**, estimated time and effort instead of presenting vague task names.
- Reduced the built-in Quest Board to concrete standalone actions. Habits (supplements/water routines), generic work sprints, vague Second-Brain actions, duplicate book/game actions and unsupported Japanese prompts are retired from the active built-in pool while their stable IDs remain for old logs.
- Current reading, active games and Side Adventures are generated from their real system state. Side Adventures must have a concrete next action before the Daily Plan can recommend them.
- Added state-aware **Want to Play backlog trials**: a specific backlog game may appear as a 30-minute Care/Optional action. Logging the trial does not automatically force it out of Want to Play.
- Book finish wording is only surfaced near the end of a known-page-count book; the Library's existing Finish Book action remains the canonical finish/reward path.
- Converted the vague Room Reset into a bounded **15-Minute Room Reset** and added explicit definitions for the remaining recovery/home actions.
- Built-in Lesson Planning, Correction and generic Focus Work no longer compete as random Daily Quests; they are reserved for the planned Work/Focus/Time system.
- Existing Daily Check-in rewards, Journal data, Library/Games/Adventures saves, Story/Social content and all previous progress are preserved.

## V0.31.4l — Number Sense Journey

- Added **Number Sense Journey · Levels 1–50** to Training Grounds and Dashboard quick navigation.
- Each fixed level contains six short mental-math/number-sense prompts. Progression moves from friendly arithmetic through compensation, doubling/halving, percentage anchors and estimation into decimals, ratios, reverse percentages, unit rates and magnitude.
- No reward depends on solving speed. Wrong attempts do not reduce XP/Coins/Story Energy; after a correct response the UI shows a mental strategy so the Journey trains reusable shortcuts rather than answer memorization.
- Added an optional **Daily Number Sense** invitation to continue the next Journey level, with no streak punishment.
- First completion of a level grants Character XP, Knowledge Realm XP, Knowledge capability XP, Story Energy and Coins. Replays never duplicate first-clear rewards; multiple new levels in one day use the existing gentle diminishing-return pattern.
- Journey progress, current question, attempts and completed levels persist in the normal Life RPG save.
- Added fixed `data/number-sense-levels.js` content so Level 23 remains the same Level 23 instead of being randomly regenerated.

## V0.31.4n · Memory Garden
- Adds a 50-level Memory Garden Journey to Training Grounds.
- Four rotating modes: Spatial Recall, Sequence Recall, Pattern Recall, and Working Memory.
- Stable seeded level content, three short rounds per level, persistent in-progress state, Daily Memory, replayable completed levels, and visible garden growth.
- First-completion rewards grant Character XP, Knowledge Realm XP, Knowledge capability XP, Story Energy, and Coins with same-day diminishing returns; replays do not repay first-completion rewards.
- No speed-based rewards. Exposure time is part of the exercise, while answer speed has no effect on payout.
- Health-aware copy keeps Memory Garden optional on illness/very-low-energy days and points toward Recovery Studio instead of pushing cognitive training.
- Activity & Reward History now recognizes Memory Garden completion entries explicitly.



## V0.31.4m · Recovery Studio
- Added directly playable Recovery Studio sessions to Training Grounds: 5-Minute Breathing, Box Breathing, 10-Minute Body Scan, 15-Minute Lie Down / Quiet Rest, and Gentle Neck & Shoulder Release.
- Sessions use the existing Life Rhythm timer, log actual elapsed time, and require the full listed minimum before completion rewards are granted.
- Health-aware recommendations favor gentler/passive recovery when illness, symptoms, low energy or poor sleep are present; recovery duration is never shortened merely because the day is rough.
- Recovery completion grants Character XP, Recovery Realm XP, Wellbeing capability XP, Story Energy and Coins with same-day diminishing returns / anti-farming protection.


## V0.31.4o · Training Grounds Focus & UX Polish
- Added a reusable full-screen **Training Focus** surface. Selection / Journey controls can stay in their dialogs, but once an activity begins the play area moves into a distraction-free dedicated view with its own Back control and no background interaction.
- Sudoku and Nonogram now give local Check Puzzle feedback and a clear solved-state card with exact credited rewards plus Next Level / Back to Journey actions.
- Fixed Number Sense progression after a correct answer, added Enter-to-submit / Enter-to-continue keyboard flow, and added a gentle per-question response-time / personal pace display. Timing is feedback only and never changes XP, Coins or Story Energy.
- Fixed Memory Garden previews being normalized away before recall. Spatial, Sequence, Pattern and Working Memory now reliably show their stimulus phase before the recall phase, including after reload/re-entry.
- Recovery Studio now starts inside the calm dark focus surface. Body Scan and Gentle Neck & Shoulder Release spend only about 10 seconds on arrival/setup and redistribute the remaining time toward the actual guided stages. Five-Minute Breathing remains a comfortable 4-second inhale / 6-second exhale pattern with explicit permission to breathe normally if that rhythm does not feel comfortable; Box Breathing remains 4-4-4-4.
- Preserved save compatibility, reward idempotency, Activity & Reward Ledger entries, PWA behavior and existing Journey progress.
