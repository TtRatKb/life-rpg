# Life RPG V0.31.4dz15 — Story Mode V2: Continuity Rewrite

## What changed
- Rebuilt the Main Story from 46 short episodic scenes into **15 longer, continuous chapters**.
- Story V2 is structured as a chapter-to-chapter slow burn rather than a pool of mostly self-contained moments.
- Chapters target roughly **6–12 minutes of reading** and may continue the same day, situation or emotional thread across chapter boundaries.
- Existing Talks, Messages, Hangouts, Dreams and World Moments remain the smaller everyday-life layer; Main Story is now the milestone/continuity layer.
- Added visible estimated reading time to Main Story chapter cards / reader UI.

## Existing-player migration
- Existing `SP_003` story data is archived under `state.story.legacyV1` before Story V2 becomes active.
- Previously completed **and previously unlocked/paid** legacy scenes are counted for entitlement.
- A rewritten chapter is free when the player had already paid into the legacy material that it replaces. This intentionally errs on the generous side when several old mini-scenes were merged into one chapter.
- Legacy choices are mapped into the rewritten chapter choices where the same decision still exists, preserving established Luca decisions/preferences.
- Relationship values, traits, social history, world state, memories and move-in flags are **not reset** by the migration.
- Re-reading already-earned rewritten material suppresses relationship/bond progression so the rewrite cannot grant duplicate relationship progress.
- Migration is one-time/idempotent and keeps the old story snapshot for compatibility/audit purposes.

## Story Momentum
- Removed the old generic order-based momentum gating from Story V2.
- Story Momentum is now authored only on selected chapters where a real-life prerequisite genuinely fits the upcoming story beat.
- Existing Life RPG logs remain the source of truth for those requirements; no duplicate manual checkboxes were introduced.

## Compatibility
- Shared Apartment / Companion / Living World / Talent Tree gates now recognize the migrated move-in state and/or archived legacy completion instead of relying only on live `SC_011` in the new chapter ID list.
- Old SP_003-specific repair routines are prevented from mutating SP_004 Story V2 state.
- `SP_003.dat` is retained as legacy content; the active Main Story pack is now `SP_004.dat`.

## Preservation / safety
- No browser-storage reset is required.
- No existing relationship/social progress is intentionally removed.
- No previously paid story progress is charged a second time.
- Story Energy is spent normally only after the player reaches genuinely new Story V2 material beyond their migrated entitlement.
