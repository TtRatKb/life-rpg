# Life RPG V0.31.4dz4 — Action-Ready Daily Plan V2

## Why this release exists
Daily recommendations should reduce friction, not create another planning task. V0.31.4dz4 changes the planner rule from “this could be good for you” to “Life RPG can tell you what to do next and give you a direct way to start it.”

This delta is built on the confirmed V0.31.4dz3 save-storage baseline. It does not remove or reset Life RPG saves, browser data, Coloring paintings/unlocks, Story state, Steam data, Sound Garden data, or cloud-save data.

## Daily Plan V2 — action-ready recommendations
- Automatic Daily picks now filter out known vague actions that still require the player to search for material or invent the activity first.
- `5-Line Shadowing` and the old Bunpro planner actions remain in the Quest catalog but no longer auto-surface in Daily until they have a real direct workflow.
- The same readiness gate is applied to several other intentionally open prompts such as Curiosity Dive, Explain It Back, Craft Session, generic Meditation and Gentle Yoga.
- Existing already-generated legacy/vague cards are not silently completed or deleted: if still open, they render as unavailable and offer **Swap**.
- Life RPG may leave a Daily slot open when no genuinely suitable alternative exists instead of forcing filler.

## Kotoba Quest as a real Daily action
When Kotoba integration is connected:
- due reviews can surface as a concrete **Kotoba Quick Study** pick using the real due snapshot;
- the amount and approximate duration are shown;
- the button opens the existing Tiny/Quick review flow directly;
- completion of that real review session marks the same Daily pick complete;
- **Kotoba Dungeon · 1 run** is also an action-ready candidate and opens the existing Dungeon bridge;
- Dungeon completion continues to rely on the existing Kotoba reward/import event rather than awarding a second Daily reward.

Shadowing is deliberately not faked here. It can return later after Kotoba Quest has an actual shadowing experience with concrete audio/text.

## Japanese Practice Library
New small user-curated library for content-based practice:
- Series / anime
- Video
- Film
- YouTube
- Podcast / audio
- Other

Each item can store:
- exact title;
- direct URL;
- next episode / part;
- Mining and/or Listening suitability;
- difficulty;
- current motivation;
- active / paused / finished status;
- optional note.

The Daily Plan can therefore recommend something concrete such as:
`Vocabulary Mining · Frieren · Episode 6 · 15 min`
instead of “do vocabulary mining” and leaving the content search to the player.

Life RPG does not randomly search the internet for Japanese material. Only saved library material is eligible.

## Game motivation
Games now have a persistent **current motivation** field:
- 🔥 Very high
- ✨ High
- 🙂 Okay
- 😐 Later
- 🧊 Someday

Existing games migrate safely to the neutral `🙂 Okay` level; nothing is guessed from old playtime/status data.

Motivation is visible/editable:
- in the Game editor;
- during bulk add;
- directly from Game cards for quick re-ranking.

Daily scoring strongly prefers games with current motivation. `Playing` / `Endless` receive an additional active-game preference, while old low-motivation backlog entries stop dominating merely because they exist in Steam.

The Games smart sort also uses motivation inside a status group.

## Better Swap instead of roulette
The old one-click reroll behavior is replaced by a choice dialog:
- see up to five strong alternatives for that exact Daily slot;
- choose the one you actually want;
- the current suggestion cannot reappear as its own fallback;
- **Pause this suggestion for 2 weeks** stores a temporary preference signal;
- if no good replacement exists, the slot is intentionally left open instead of forcing a poor fit.

Past reroll memory still acts as a soft, decaying signal rather than permanently banning content.

## Guided movement
`10-Minute Stretch` is now genuinely action-ready:
- opens a guided 10-minute in-app Recovery Studio sequence;
- includes shoulders, side reach, upper back, chest, hamstrings, calves and hip flexors;
- uses the existing Recovery Studio completion/reward path so the Daily card can recognize completion without duplicate rewards.

`5-Minute Mobility Break` now routes into the existing guided neck/shoulder reset instead of being an instructionless card.

## Save safety
- Daily planner schema: 9
- Game Library schema: 10
- Existing games gain only the new motivation field when missing.
- The V0.31.4dz3 compact local-save system remains in place.
- No localStorage clearing.
- No save reset.
- No Coloring migration/rewrite beyond the already-confirmed DZ2/DZ3 baseline.
- No Story content changes.
- No Sound Garden behavioral changes in this release.

## QA performed
- `node --check` passed for every changed/new JavaScript file.
- HTML parsed with no duplicate IDs and all new required controls present.
- Every local script/style referenced by the updated HTML exists.
- Every V0.31.4dz4 asset referenced by the service-worker core cache exists.
- Existing 2026-09-30 user save checked structurally: 57 Game records keep the same IDs and old fields; motivation migration is additive only.
- Static action-readiness audit confirms Shadowing/Bunpro are excluded while guided Stretch/Mobility are eligible.
- Full headless-browser execution was attempted, but this environment blocks browser navigation by administrator policy; live UI behavior should therefore get one short deployment smoke test.

## Recommended smoke test after deployment
1. Reload Life RPG once so the new service-worker cache activates.
2. Open Games and set two or three current games to different motivation levels.
3. Add one Japanese Practice Library item with a direct link and a next episode/part.
4. Open/edit today’s Daily Check-in.
5. Confirm vague Shadowing/Bunpro cards no longer appear automatically.
6. Use **Swap** and confirm you can choose between alternatives rather than reroll blindly.
7. If Kotoba Quick Study appears, complete it and confirm the Daily card becomes done.
8. If Stretch appears, start the guided routine directly from the Daily card.
