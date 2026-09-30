# Life RPG V0.31.4dz2 — Emergency Local-Save / Coloring Storage Rescue

## Why this hotfix exists
The main Life RPG save can hit the browser `localStorage` quota even though the current state is still alive in memory. The current standalone Coloring Studio was storing each painted 1122×1402 canvas as a PNG base64 data URL inside `localStorage`. Those large image strings share the same small quota as the canonical Life RPG save and can block unrelated saves with `QuotaExceededError`.

## Critical rescue rule
If the app currently shows **“Local save needs space. Life RPG kept this change in memory; export the save before reloading.”**, export the normal Life RPG save BEFORE reloading, closing the tab, or deploying/reloading this patch. The normal save export reads the live in-memory state and therefore preserves changes that localStorage could not write.

If a Coloring card is currently open and its own save pill says **Save error**, also export that visible card as PNG before reloading; that canvas may contain painting changes that never reached any persistent store.

## Coloring storage migration
- Adds `coloring-storage-v2.js` backed by IndexedDB.
- On startup, legacy `lifeRpgColoringStudio:<card>` records are scanned.
- For every legacy record containing a large PNG data URL, the painting is copied into IndexedDB first.
- Only AFTER that IndexedDB write completes successfully is the old localStorage record compacted to tiny metadata (`finished`, `started`, storage marker, timestamp).
- A failed IndexedDB write leaves the original localStorage painting untouched.
- Existing finished/in-progress state is preserved.
- New paintings are saved as PNG Blobs in IndexedDB instead of base64 strings in localStorage.
- Main-gallery colored previews are loaded from IndexedDB at runtime, so the gallery does not lose painting previews.
- The migration retries the canonical Life RPG save after reclaiming localStorage space; no save reset or browser-data clear is performed.

## Sound Garden cumulative dz1 safety fix
This package also includes the previous dz1 Spotify Track-ID idempotency fix so it can be installed directly on V0.31.4dz:
- rated/known Spotify tracks persist exact Spotify Track IDs;
- the same Spotify track cannot become rewardable again through an Artist alias/name variant such as `HANABIE.` / `花冷え。`;
- Activity Log explains Artist-add and discovery rewards; playback itself remains reward-free.

## Safe recovery sequence after seeing the quota warning
1. While the old tab is still open, export the normal Life RPG save.
2. Deploy this dz2 delta; do not clear site data/localStorage/IndexedDB.
3. Reload once and allow the Coloring storage migration to finish.
4. Import the just-exported Life RPG save so any changes that existed only in memory are restored into the now-working canonical save.
5. Confirm normal saving/sync resumes. Existing Coloring paintings remain local on this device and are migrated automatically.

## Files in this delta
- `coloring-storage-v2.js` — new safe painting store + legacy migration.
- `coloring-studio.js` — reads/writes paintings through IndexedDB.
- `coloring-studio.html` — loads the new storage layer.
- `creative-hub-v314dl.js` — gallery metadata/previews use migrated storage.
- `index.html` — loads storage rescue on normal app startup.
- `service-worker.js` — dz2 cache/version wiring.
- `sound-garden.js` — cumulative dz1 Spotify Track-ID idempotency.
- `activity-log.js` — cumulative dz1 Sound Garden reward transparency.

No Story, Coloring unlock IDs, purchase IDs, painting IDs, save schema, cloud-save schema, browser authentication data, or existing user progress is intentionally reset.
