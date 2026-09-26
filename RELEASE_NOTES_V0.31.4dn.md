# Life RPG V0.31.4dn — Coloring Studio Collection & Individual Card Unlocks

**Base:** V0.31.4dl + V0.31.4dm. This delta is self-contained for the fixes and six images. Copy complete files into the repository root, replacing files with the same names only. The ZIP does not contain a new full save or database.

## What was broken in DM
- The real DL in-app gallery uses `coloring-studio.js`'s catalog. DM added images only to the *legacy* `talent-reward-studios.js` catalog, so the gallery never listed them.
- DM accidentally replaced two DL fixes in `talent-reward-studios.js` (duplicate sidebar launcher guard and in-app Studio routing). This update restores them from the DL version.
- DM image assets were opaque grayscale PNGs; opaque white pixels would cover the painting beneath in the newer embedded editor.

## Fixed collection experience
- **Spielen & Lernen → Coloring Studio** opens an in-app gallery of **all seven actual collectible designs** (the original Bakugo · Level 1 card plus six new Bakugo cards). The Life RPG sidebar and persistent Focus Dock remain visible.
- The original Level 1 card comes with the existing permanent `coloring-studio` purchase. Six additional cards are visible in grayscale with a lock overlay until individually bought for **1 Hobbies point per card**. A locked design is only a preview and cannot enter the editor; its Unlock button navigates to that *exact* Hobbies Talent Tree node.
- The Hobbies tree offers six permanent content unlocks as independent siblings of the Coloring Studio root purchase; the existing Palette Atelier and Companion Moments dependencies do not change. Each tree node shows its corresponding preview. Purchasing one unlocks that card only and spends one real, tracked Hobbies point, without granting XP, Coins or relationship progress.
- Once purchased, the gallery changes the card to Unlocked and the normal existing editor opens it. Returning from editor goes back to the gallery. Both existing Drawing Studio and other game views remain unchanged.
- No content expires and no additional studio rank is charged for Drawing Studio.

## Art and storage contract
- The six new images are reprocessed into **true transparent-background, pure-black ink overlays** rather than opaque white/grayscale photographs. They preserve the original aspect ratio inside the current 1122×1402 canvas. Both previews and editor show white paper. White/skin tints are transparent: the user's chosen paint can appear under the black outlines.
- **Do not delete** the original `assets/coloring/bakugo-trading-card-line.png` or any existing art. The original card's filename and stable editor ID `bakugo-trading-card-level-1` remain unchanged, as does the local storage prefix `lifeRpgColoringStudio`. The original file bytes are unchanged.
- New card IDs stay stable across unlocks. Existing cloud/save/reward/story/timetable state, Coloring Studio local painting files, and Drawing Studio IndexedDB are not cleared or changed. Save export + separate local art backups are recommended before deployment.
- Art assets are runtime/on-demand; open the gallery online at least once after deployment for cache warming. Never clear browser storage as a refresh technique.

## QA limitations
- Eight JavaScript runtime mock integration checks: real seven-card catalog, locked previews, click guards, parent+editor gating, individual 1-point purchase, double-spend prevention, old save IDs, and restored DL routing.
- Syntax checks for the modified JS files, asset path / size / transparency tests, PWA cache references and ZIP CRC/byte-equality checks. Old drawing and home navigation files are byte-identical to DL.
- Local Chromium navigation was **blocked by this environment** for localhost/file URLs. A real deployed Chrome/Safari/iPad + the user's personal save / Painting strokes / Cloud Save round-trip remains to be checked. These mock tests do not certify those devices.
