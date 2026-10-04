# Life RPG V0.31.4dz12 — Weekly Meal Planning + Sound Garden Artist Progress

## Meal Planner: calendar weeks
- The plan view is now permanently Monday–Sunday.
- Each calendar week is stored independently, so multiple future weeks can be planned and revisited with the week arrows/date picker.
- Existing flexible-range meal plans from DZ8–DZ11 migrate into their matching calendar week(s) without deleting dishes or meal history.
- Multi-day meals that cross a Sunday/Monday boundary are split visually across the two saved weeks while retaining one origin ID.
- Cooldowns, past-meal history, tag aliases/limits, weekend-special preference and one-click Swap remain active.
- The Shopping tab is independent from the plan view: choose any start date and 1–31 shopping days. Ingredients are collected from all saved weeks touched by that range.

## Sound Garden: full Artist Library page
- Added a full-page Sound Garden entry under **Spielen & Lernen** while keeping the existing Daily Song Discovery.
- The page uses the same artist pool, exact Spotify artist bindings, song history, known/rated states and target-playlist state as Daily Sound Garden; no parallel reward/history model was introduced.
- Each linked artist can build a configurable Core list of 10 / 20 / 30 / 50 tracks.
- Core candidates come from Spotify search relevance and artist catalog data, with every track strictly filtered to the confirmed Spotify Artist ID.
- Artist cards show progress; artist detail shows per-song states for liked / maybe / disliked / already known / heard / skipped / target playlist.
- “Next open song” sends the next unfinished Core track into the existing Daily Sound Garden flow.
- A track can be marked “heard” directly from the library with no reward. A skip alone does not count as heard.
- Successful playback through the existing in-app Spotify player records the track as heard, also without a reward.
- Artist images are stored only as Spotify image URLs and rendered without cropping.

## Spotify API note
Spotify's February 2026 Development Mode changes deprecated/removed the practical Artist Top Tracks route for this app mode, and playlist items can only be read for playlists the signed-in user owns or collaborates on. Therefore Life RPG does not label the Core list as Spotify “Top Tracks” or reproduce editorial “This Is …” playlist order.

## Storage / save safety
- Artist guides store only Spotify track IDs; track metadata is reused in the existing Sound Garden catalog, which is already covered by DZ3 local-save compaction.
- No browser storage, saves, Coloring data, rewards or histories are cleared.
- Meal Planner schema migrates from 4 to 5 automatically on first load.

## Files
- `meal-planner.js`
- `meal-planner.css`
- `sound-garden.js`
- `sound-garden-library.js` (new)
- `sound-garden.css`
- `life-hub-v314dk.js`
- `index.html`
- `service-worker.js`
