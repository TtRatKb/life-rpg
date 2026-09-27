# Life RPG V0.31.4ds — Luca + Katsuki Coloring Collection

**Base:** V0.31.4dr. This archive is a repository-root DELTA (complete replacement files and new image assets), not a standalone complete app. Upload preserving paths. Do not delete browser data / IndexedDB.

## Four new collectible coloring cards

- **Moonlit Puppy** — revised two-legged couch scene with the puppy; the earlier incorrect-legged picture is not used.
- **City Walk** — arm-in-arm streetwear.
- **Café Study Date** — reading/writing together in a café.
- **Music Night** — headphones, drumsticks, and a puppy. Uses the reworked image, not the old guitar-behind-back version.

All four remain visible as locked previews in the embedded Coloring Studio. Each has a separate 1-point Hobbies Skill Tree unlock after the existing `coloring-studio` node. The gallery has a new **Luca + Katsuki** filter, separate from solo Luca and the Bakugo/Kirishima Duo group. The standard card editor, Gallery back-navigation and saved painting keys remain unchanged.

## Images

New image files are neutral black transparent RGBA line overlays at 1122×1402. White paper is transparent to allow the user's paint layer to show through; large filled-ink interiors are softened. The editor stage is white.

## Save/canon guard

No main-save schema change or migrations; no existing card IDs modified, no prior purchases removed and no automatic rewards, story or relationship effects. New art uses the same existing Coloring Studio local storage key pattern, with four new IDs. Existing Bakugo, Kirishima, their Duo cards, Luca solo cards and Drawing Studio are unchanged.

## Install / verify

1. Export main save and separate Coloring/Drawing backups first.
2. Copy the archive contents to the root of the GitHub Pages Life RPG repository, keeping `assets/coloring/` intact; commit and deploy.
3. Reload app after the new Service Worker is activated. Open **Spielen & Lernen → Coloring Studio → Luca + Katsuki**. Four locked cards appear. Purchase the desired card in **Hobbies Skill Tree** for one point, then return to the gallery and open the card.
4. Do not erase site data, cache manually, localStorage or IndexedDB; never import an old save to 'fix' missing art.

Browser-device test with the user's actual save has not been performed.
