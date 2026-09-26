# Life RPG V0.31.4dp · Kirishima Collectible Coloring Cards

## Installation
Apply this repository-root delta on top of the deployed **V0.31.4do** baseline (which already contains DN Coloring Collection Unlocks). Do not delete any existing files, browser data, IndexedDB, or original image cards. Make a main-save export and separate creative drawings backup first. Upload the complete files in this ZIP to the exact relative paths. Reload once online to refresh the service-worker cache.

## New cards
Nine user-approved **separate original images**: the five from the approved first Kirishima batch plus the four later poses. Adult Kirishima, from cheerful/casual to pro hero and post-training. Black-only pigment with alpha-transparency; no prefilled skin or clothes. Each asset is a 1122×1402 RGBA PNG in its own file, not sliced from a collage.

## Gallery and unlocks
- Existing Bakugo cards stay unchanged, and all nine Kirishima cards are visible as locked grayscale preview cards.
- Coloring Studio requires the existing one-point Studio unlock; every new card has its **own** permanent `color-card-kirishima-*` unlock for **one Hobbies point**, with only `coloring-studio` as prerequisite.
- Locked previews cannot be opened in the editor. Unlock leads to the exact Hobbies node and the card becomes colorable only when purchased.
- Added Bakugo / Kirishima / All gallery filters, retaining the sidebar and in-app editor.
- Existing coloring IndexedDB/localStorage card IDs, strokes and completed flags stay intact. Never migrate or reset old cards.
- Skill-point accounting is handled by the existing graph `extraSpent()` mechanism; no new coin, XP or Story Energy payouts.

## Modified/new complete files
`index.html`, `talent-tree-v2-graph.js`, `creative-hub-v314dl.js`, `coloring-studio.js`, `coloring-studio.html`, `pwa.js`, `service-worker.js`, nine standalone files in `assets/coloring/`. No unrelated scripts, save schema, timers, or story content are changed.

## Limitations
No real Safari/iPad session on the user's personal Cloud Save was available during build. Browser cache may need one online reload; do not clear IndexedDB.
