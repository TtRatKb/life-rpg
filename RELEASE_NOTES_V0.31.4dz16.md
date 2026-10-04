# Life RPG V0.31.4dz16 — Story Chapter Cuts + Background Quality

## Why this patch exists
DZ15 made Main Story substantially more continuous, but the first rewritten chapter crossed a natural chapter hinge and several Story/World background routes could still select old soft/upscaled time-of-day assets. The global floating Focus Timer also remained visible over the story reader.

## Main Story chapter cut
- `SP_004` now contains 16 chapters instead of 15.
- The original first V2 chapter is split at the natural unresolved-plan hinge.
- The first chapter now ends after the school-side thread instead of continuing directly into the later follow-up situation.
- The following chapter begins with the existing connective beat, so returning after a wait still has immediate context.
- Existing scene IDs after the inserted chapter stay stable; only displayed chapter order shifts by one.
- Old SP_003 entitlement mapping remains intact.
- DZ15 users receive an idempotent chapter-cut migration:
  - the moved choice is preserved;
  - progression snapshot is copied when needed;
  - a reader already inside the moved section is transferred to the new chapter at the corresponding reading position;
  - anyone who already completed the former combined chapter keeps both halves completed/unlocked;
  - no Story Energy or relationship effects are paid twice.

## Story lighting now follows story time
- Authored Story daypart is now preserved in the accumulated visual state.
- Explicit scene/beat daypart wins over real-world clock time.
- Location labels such as Evening, Night, Morning, After School and After Work provide a semantic fallback.
- Real solar time is used only for ambient content with no authored fictional time.
- This fixes cases such as a `STATION · EVENING` scene showing a daytime station because the player happened to read it in the afternoon.

## Background quality gate
The following old soft/upscaled variants are no longer referenced by Story or World runtime:
- `assets/story/backgrounds/time/home_dawn.webp`
- `assets/story/backgrounds/time/home_day.webp`
- `assets/story/backgrounds/time/home_sunset.webp`
- `assets/story/backgrounds/time/home_night.webp`
- `assets/story/backgrounds/time/station_day.webp`
- `assets/story/backgrounds/time/city_day.webp`
- `assets/story/backgrounds/time/koharu_cafe_day.webp`

Sharper approved standalone/time-of-day assets are used instead. The files may remain in the repository without affecting runtime and can be batch-deleted later.

## Distraction-free Story reader
While any Story/Talk/Hangout/World-Moment reader is open (`body.story-mode-open`):
- the floating `Timer starten` launcher is hidden;
- an already-running timer dock is also hidden visually but the timer itself continues running;
- both reappear unchanged after leaving the reader.

## Cache/versioning
- Story pack, Story UI, app, PWA and service worker cache keys bumped to DZ16.
- Focus Dock CSS cache version bumped so Safari/GitHub Pages does not retain the pre-fix launcher styling.

## QA
- JavaScript syntax checks pass for `story-ui.js`, `story-engine.js`, `app.js`, `pwa.js`, and `service-worker.js`.
- SP004 decodes correctly with 16 ordered chapters and the inserted chapter has the intended legacy source/effects split.
- Runtime text references to all seven retired low-quality background files are zero after the patch.
- Headless Chromium smoke launch was attempted in the build environment but timed out before producing a DOM; no successful browser-runtime claim is made from that attempt.
