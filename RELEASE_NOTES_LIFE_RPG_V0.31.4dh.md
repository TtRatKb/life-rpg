# Life RPG V0.31.4dh — Little Dungeon Connection

**Base:** V0.31.4dg. Copy **only** the complete `pwa.js` and new `kotoba-dungeon-bridge.js` into the Life RPG repository root. This is the cumulative DG PWA loader with a single additive DH script; all DD/DE/DF/DG injections are kept intact. Never replace the current live `index.html`, `service-worker.js`, Focus Dock, companion-story or Coloring files with old snapshots. Export the main save first.

## Entry and integration
- Two direct launches: Japanese's Connected Japanese Study panel and the corresponding Training Grounds list. Own visible status and "Siege synchronisieren" button. It opens the Kotoba Dungeon's existing page in a new browser tab.
- Dedicated `integrations.kotobaDungeon` save branch, separate from the existing Google/Firebase Kotoba SRS connector and its 75-coin/day review limit. The first activation accepts already saved V0.4 outbox receipts (up to 90 days old); old V0.3 historical play cannot pay because V0.3 emitted no receipts. An explicitly imported receipt file is processed as a deliberate import. Read-only to Kotoba vocabulary, review dates, account and profile.
- Same-origin transfer works even when Life RPG isn't open: entries live in Kotoba's local durable outbox and are reconciled on Life RPG resume. `storage` and BroadcastChannel accelerate synchronization while both tabs are open. For cross-origin websites use export/import JSON; no false promise of automatic server-level sync.

## Rewards (no Dungeon daily hard cap)
- On completing each normal enemy or boss, one stable run/floor receipt is paid once, with ledger source `kotoba-dungeon` and `sourceId=runId:floorN`.
- Normal win base: 6 Character/Realm XP, 4 Coins, fractional Story Energy; boss base: 16 XP, 10 Coins and greater Story Energy, with modest additional optional timed-mode multiplier. Performance/deck influence the scaled result. Daily soft taper approximately `1/sqrt(1+n/5)` for the count of *Dungeon* rewarded victories; no ceiling. Every genuine subsequent win retains at least one XP and Coin. Fractional Story Energy accumulates until large enough to survive Life RPG's existing story-energy taper/cent precision; an individual tiny win can show zero Story Energy without permanently ending future awards.
- Existing Kotoba Review caps and all other global reward mechanics remain unchanged; the Dungeon uses its OWN source. One event is never paid twice; replay/refresh doesn't create another receipt. The existing Story Energy **global** diminishing-rate table still applies. This is not a new separate time log, so the same Dungeon activity cannot accidentally multiply work timer rewards.

## QA and caveats
- Node VM tests for duplicate and historical-source guard, boss distinction, 140 consecutive rewards without a hard cap and preservation of existing Kotoba data. Browser/Safari/GitHub Pages/Cloud Save end-to-end still unverified on the user's actual account. For stable cross-device reward sync, server-hosted authenticated event publishing is a later enhancement; this release uses a local pending outbox and explicit export fallback.
