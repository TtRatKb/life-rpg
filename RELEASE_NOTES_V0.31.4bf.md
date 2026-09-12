# Life RPG V0.31.4bf — Simulation Consistency + Steam Playtime

## Purpose
This pass fixes two runtime-consistency gaps surfaced by real play:
1. Steam achievements could sync successfully while Steam total-playtime failed or baselined too late without a visible diagnostic.
2. Dashboard / World / People social presence did not share one canonical schedule, so a character could appear in several places at once or a Talk could open in a location that contradicted Home Base.

## Canonical character schedule
- Added one deterministic canonical location per character, local date and daypart.
- Dashboard Home Base, My Atlas, People/Talk/Hangout availability and World location presence now read the same schedule state.
- A person can be at exactly one place at a time.
- Characters may be at inaccessible/offscreen work locations. In that case the player sees an appropriate unavailable/out status without prematurely revealing a locked location.
- Katsuki/Eijiro use weekday/weekend routines weighted toward DynaRiot work, training, home and errands; Mina/Izuku likewise have independent work/off-duty schedules.
- Authored social/world moments may override routine presence when the scene itself requires a participant at a location.
- Shared Apartment room presence is consistent with social content: if Katsuki is shown in the kitchen, a location-sensitive Talk must also be valid for that room.
- Talk and Hangout are unavailable while a person is working / at a location Luca cannot currently visit. Main Story remains independent of these ambient availability rules.

## Atlas / home cleanup
- Collector District is hidden again until its actual story-introduction flag exists.
- Locked locations are no longer shown as generic `Unknown Location` cards in My Atlas; Atlas represents places Luca has actually discovered.
- Luca's Previous Apartment is removed from the active Atlas after the move into the Shared Apartment. Historical story/memory data is untouched.
- Home Base now has a direct `Open apartment` action when Shared Apartment is the relevant home location.

## Steam playtime reliability
- Steam library payload normalization now supports additional Worker response shapes/field names (`games`, `game`, `response.games`, common playtime field variants).
- Library/playtime sync failures are persisted and shown instead of being silently swallowed while achievement sync succeeds.
- Normal Steam playtime continues to route to Hobbies → Recreation & Play (or Japanese → Language Learning for Japanese-designated games).
- Steam auto-playtime awards Realm XP + Skill XP only; achievements remain the milestone source for Character XP / Coins / Story Energy.
- Local/manual gaming logs in the same Steam delta interval are subtracted before importing playtime, preventing double credit.
- Added a safe `Repair playtime baseline…` action for games where the first successful Steam playtime baseline happened too late. The player can enter the known Steam total at original connection (for a brand-new Steam copy, `0`) and Life RPG imports only the uncovered difference.

## Game statistics
Games now includes a compact playtime overview:
- last 7 days
- last 30 days
- all Life RPG logged playtime
- Steam auto-logged playtime
- top games over the last 30 days as visual bars

This is intentionally based on Life RPG activity history; historical Steam hours that predate the baseline are not rewritten as if they had been locally logged.

## QA
- Full JavaScript syntax pass.
- Canonical world-presence harness confirms no character appears at multiple locations simultaneously.
- Steam harness verified a Forager-style `0 → 205 minutes` delta imports exactly 205 minutes as Steam playtime with Hobbies / Recreation & Play progression.
- Re-syncing the same Steam total is idempotent (no duplicate log/reward).
- A later +60-minute Steam delta with 30 minutes already represented by a manual game log imports only the remaining 30 minutes.
- Story content remains unchanged; only loader/cache versioning was aligned for BF.

## Visual follow-up
This pass intentionally does **not** replace the currently weak/fallback Agency / Konbini / Grocery / Park backgrounds. Those should be handled in a dedicated standalone high-resolution background pass, never by cropping/upscaling the rejected contact sheets.
