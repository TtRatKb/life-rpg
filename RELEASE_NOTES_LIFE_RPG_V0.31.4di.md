# Life RPG V0.31.4di — Visible Dungeon Access Hotfix

**Base: installed V0.31.4dh**. Replace the **complete** root `pwa.js` and `kotoba-dungeon-bridge.js`; do not copy an old `index.html` or `service-worker.js` over the current repo. The cumulative PWA loader preserves DD Companion Moments V2, DE Focus Dock, DF Shared Apartment V2, DG Logic/Lexicon and DH Dungeon integration.

## Fixes
- Previous DH reward bridge only mounted its panel below `#kotobaIntegrationPanel`, which wasn't the obvious Training Grounds view. Its shortcut further depended on one exact link selector and a successful bridge initialization.
- DI injects a visible **Little Dungeon** card directly in `#trainingGroundsPanel .training-grounds-grid-v314k` from `pwa.js`, independent of reward-bridge initialization. The optional reward bridge also restores that card if missing and mounts its reward panel **directly under the Training Grounds grid**.
- A second Japanese/Connected Study link remains when that panel exists. No separate Japanese navigation tab is assumed or created.
- JSON file import, toggle and status are visible in Training Grounds; hints correctly distinguish same-origin automatic local outbox from cross-origin manual export/import. The old Kotoba Review daily limits remain untouched.
- Re-rendering and focus do not add duplicate entry cards or reward widgets.

## IMPORTANT cross-domain limitation
Both apps on the exact same origin (same scheme/host/port) can use the `kotobaQuestDungeonRewardOutboxV1` in localStorage, including when their URL paths differ. If origins differ, use Dungeon Camp → **Siegesbelege exportieren**, then Life RPG Training Grounds → choose JSON to import. Browser `localStorage` does not cross domains; this hotfix does not claim remote push or automatic cross-device synchronization. Identical receipts can be imported again safely without double reward.

## Save and testing
Only additive `integrations.kotobaDungeon` and normal idempotent rewardLedger records, as in DH. Existing activities, Companion, focus timer, My Week, Coloring IndexedDB and Story data are unchanged. Local mock tests passed 140 sequential wins with taper, duplicate guards, separate previous Kotoba SRS integration, and visible card + import controls. Full deployed GitHub Pages and personal Save/browser testing remains open because a current full Life RPG repo was not attached in this turn.

## Install
Export Life RPG Save, upload **just the two full files** to Life RPG repo root, replacing DH versions. Wait for GitHub Pages and reload. Training Grounds contains the Dungeon card and beneath the grid the reward/JSON import controls. Do not clear site data. If this still does not appear, send the current full *Life RPG* repo ZIP for a direct-versioned `index.html` patch, rather than retrying the obsolete Kotoba installer.
