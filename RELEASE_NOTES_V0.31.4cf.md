# Life RPG V0.31.4cf — Drawing Studio V2 (first practice-system pass)

This delta replaces the original test-style Drawing Studio with the first structured practice version.

## New practice structure
- 6 practice tracks: Dynamic Figures, Hands & Anatomy, Faces & Hair, Perspective & Backgrounds, Color & Rendering, Story Illustration.
- 12 guided challenges with an actual briefing before the canvas.
- Each challenge includes: training goal, step-by-step process, reminder, time estimate, difficulty, practice tags, reward class, and a purpose-built construction guide.
- Gesture and hand challenges can open Line of Action's external practice-tool hub for reference photos.
- “Recommended” uses recent self-reported trouble tags to bias suggestions toward a useful track.

## Canvas / drawing tools
- Graphite Pencil with a deliberately rougher multi-stroke texture.
- Clean Pencil.
- Soft Shader.
- Smudge tool.
- Pipette / eyedropper.
- Eraser.
- Full browser color picker + hex input + quick palette.
- Brush size, opacity, and softness controls.
- Horizontal canvas flip (view-only; exported art stays unflipped).
- Guide show/hide + guide opacity.
- Zoom with mouse/trackpad wheel and Pan tool / Alt-drag / middle mouse.
- Undo / redo / clear / PNG export.

## Challenge flow
- Multi-round timer support (for example 5 × 30-second gestures and 3 × 2-minute poses).
- Completion reflection: easier / about right / challenging.
- Optional “what gave you trouble?” tags.
- Save classification: Practice or Finished piece.
- Local IndexedDB autosave for each challenge.
- Existing Life RPG Drawing Studio reward queue remains compatible; first completion of a challenge per day rewards, repeats stay practice-only.
- Track practice counts and minutes are recorded for later Creative Progress / Gallery work.

## Cache refresh
- PWA shell bumped to V0.31.4cf so the new Drawing Studio files are not hidden behind the previous service-worker cache.

## Files in this delta
- `drawing-studio.html`
- `drawing-studio.css`
- `drawing-studio.js`
- `index.html`
- `pwa.js`
- `service-worker.js`
- `RELEASE_NOTES_V0.31.4cf.md`
