# Life RPG V0.31.4cj — Persistent Web References V1

## What changed
- Replaced the placeholder/self-made reference packs for the first core practice tracks with curated internet references that are actually useful to study.
- The first web-reference packs cover:
  - Dynamic poses / gesture
  - Hands and hand-object interaction
  - Perspective, interiors and backgrounds
- References are loaded directly from Wikimedia Commons rather than bundled into the project.
- The in-app reference itself is visible while drawing; opening external links is not required.

## Persistent reference modes
- **Docked reference**: stays visible in the existing right-side reference panel.
- **Floating reference**: opens a resizable, draggable mini-reference over the workspace.
- **Underlay**: shows the current reference behind the drawing canvas with adjustable opacity.
- Changing the active reference keeps Dock, Float and Underlay in sync.
- Underlays are display-only and are not baked into the drawing/export.

## Source / license handling
- Curated web references come primarily from Wikimedia Commons.
- The first pack favors CC0/public-domain-dedicated media where possible.
- When a selected reference uses an attribution license, its author and license are shown directly under the reference in the app.
- A small source link remains available for provenance, but it is not needed to use the reference while drawing.

## Compatibility
- Coloring Studio unchanged.
- Existing Drawing Studio saves, challenge history and reward queue remain compatible.
- Local construction guides remain available as guides/fallbacks for other challenges.
