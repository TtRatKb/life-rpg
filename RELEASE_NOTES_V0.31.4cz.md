# Life RPG V0.31.4cz — Skill Trees V3

Base: V0.31.4cy (Talks 2.0), including all earlier CU/CV/CW/CX changes. This is a **delta**: replace the complete named files in the app root, retain all other files and all saves. Export your current save first. Do not erase website data, IndexedDB or browser storage.

## Real new content

- Work / School Moments: permanent 1-point content node after Work Deep Brief. Ten authored school-life decision stories, one first-choice reward per story, saved individual reflections and no replay farming.
- Knowledge / Takuzu: permanent 1-point node after Kakuro. Eight individually verified, unique-solution 6×6 binary logic puzzles; daily and optional practice, saved board and capped practice reward.
- Japanese / DynaRiot Extras Rank III: eight **additional** Japanese dialogue/agency content cards, bringing the pool to 24; Rank I and Rank II remain unchanged in progression and ownership.
- Health / Future Me: permanent 1-point node after 365 Question Journal; write and seal letters for 7/30/90 days in regular save data, with no reward for padding.
- Home / Cozy Kitchen: permanent 1-point node after Home Oracle I; sixteen actual practical meal ideas with ingredient and time filtering, saved pantry preferences, favorites and tried dishes.
- Hobbies / Palette Atelier: permanent 1-point node after the Coloring Studio. Eight color sets with three-round interactive daily/practice activities. It does **not** charge additional points for future Coloring Studio cards or edit drawings.
- 365 Question Journal: 32 hand-written alternative prompts available before answering. The original 365 questions remain stable; the choice is stored with the dated entry so existing answers are not silently relabeled.
- Dashboard: owned content library exposes existing and new unlocks without repeatedly navigating Talent Trees. Takuzu and Palette daily rewards also appear in the existing Daily Reward Checklist, using actual completion state.

## Preserved / not claimed

- Existing skill points, bought nodes, Dream threads, Story and Talk choices, recurring My Week timetable, time logs and their rewards, shop/habits, Steam and cloud-save state remain intact; no intentional reset or backfill.
- Previously earned content remains available. No future Coloring card art has been fabricated and no changes are made to separate Coloring Studio IndexedDB data. Export those separately when possible.
- Guided Shadowing is still non-purchasable until real in-app audio/transcript content exists. A new Recovery content idea remains non-purchasable until it differs meaningfully from Body Scan/Grounding/Toolkit. Neither costs points.
- This package changes app files, not the saved user data. Full personal-save Safari/iPad and live cross-device cloud sync testing remains to be done after installing on the user's device.

## Local QA

- JavaScript syntax and ZIP integrity checks.
- Mock Chromium integration against the sequential CY base: 1-point purchase and duplicate-click guard, Rank III preserving previous Japanese ranks, immutable school choice/reward, unique Takuzu grids and single daily reward, letters sealed without reward, kitchen state, Palette interaction/reward, new content library and Journal prompt migration.
- Service worker core URL and query consistency checked. Test mock uses the actual runtime scripts but cannot substitute for a full deployed/real-device test.
