# Life RPG V0.31.4dz3 — Emergency Local Save Compaction

## Why this patch exists

Safari was rejecting new writes to the canonical `lifeRpgPrototypeV01` local save with `QuotaExceededError` / the in-app warning:

> Local save needs space. Life RPG kept this change in memory; export the save before reloading.

The exported 2026-09-30 user save confirms that the canonical state itself has grown large enough to sit very close to Safari's localStorage quota. The old local representation is roughly 2.37 million JavaScript characters (~4.52 MiB if counted as UTF-16), before other Life RPG / Kotoba localStorage keys are included.

## What DZ3 changes

DZ3 does **not** delete history and does **not** change the normal runtime, export, or cloud-save state shape.

Only the browser-local representation of the canonical save is changed:

- Reward Ledger events are stored as lossless compact rows locally.
- Game Goals are stored as lossless compact rows locally.
- Steam achievement baseline records are compacted locally.
- Habit completion logs and Time Tracking entries are compacted locally.
- Stewardship fingerprint records are compacted locally.
- Sound Garden cached catalog tracks are compacted locally.
- Repeated JSON property names are dictionary-encoded in the localStorage copy.
- Unknown/future fields are preserved as extras rather than dropped.
- Keys that look like compact aliases are escaped, so user/future data cannot collide with the codec.

On load, the local copy is expanded back into the normal Life RPG state **before** the rest of the app sees it.

## Compatibility / migration

- Existing plain `lifeRpgPrototypeV01` saves remain readable.
- The next successful normal save transparently replaces the old plain localStorage representation with the compact V2 representation.
- Export Save still produces normal readable `LifeRPGSave` JSON.
- Import Save still accepts the normal save JSON.
- Firebase/cloud save keeps the normal full state and its existing gzip/chunk logic.
- No Save data, browser data, Coloring unlocks/paintings, Story state, Steam achievements, Sound Garden data, Journal entries, or reward history is intentionally removed.

## Coloring rescue ordering

`coloring-storage-v2.js` now starts before `app.js` on the main page. Existing Coloring Studio PNG migration remains IndexedDB-first: a legacy painting is copied successfully before its oversized localStorage payload is compacted.

## Verification against the user's real 2026-09-30 export

Roundtrip test (compact -> expand) passed with deep structural equality.

- Old canonical local JSON: **2,370,226 characters** (~**4.52 MiB UTF-16 estimate**)
- DZ3 local representation: **1,434,167 characters** (~**2.74 MiB UTF-16 estimate**)
- Reduction: **39.5%**
- Dictionary entries for this save: **718**
- Legacy plain JSON decode: passed
- Alias-collision / unknown-field preservation test: passed
- Changed JavaScript syntax checks: passed

These numbers describe this specific real save and are not hard-coded limits.

## Recovery order for the current quota incident

1. Keep the already exported current save JSON safe.
2. Deploy DZ3 over DZ2.
3. Reload Life RPG so the new app code/service worker is active.
4. Import the current exported JSON once, because changes made while the old local save was failing may only exist in that export.
5. Make one small normal change and reload once to verify it persists without the local-space warning.

Do not clear Safari Website Data/localStorage as part of this migration.
