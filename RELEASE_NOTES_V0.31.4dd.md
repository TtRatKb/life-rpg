# Life RPG V0.31.4dd — Companion Moments V2

**Base:** V0.31.4dc (Social Delivery). This is a tiny additive delta. Replace `pwa.js` and add the two Companion V2 files + release notes. Do not delete site data, localStorage or Coloring Studio IndexedDB. Export the normal save first.

## What V2 adds

- **21 authored follow-up scenes**: three later moments for each existing Companion thread (Work, Knowledge, Japanese, Health, Recovery, Home, Hobbies). Every Realm gets one Katsuki follow-up, one Eijiro follow-up, then one shared-household continuation.
- **No new Talent tax.** V2 belongs to the V1 Companion unlock already purchased. A V2 thread requires that Realm's existing Companion node and all three V1 scenes; it never charges another Skill Point.
- **Temporal continuity instead of binge unlocks.** Individual V2 scenes cannot open on the same local calendar day as their V1 source/shared scene. Only one new V2 completion can be recorded per local day. Nothing expires and missed days are never punished.
- **Authoritative choice callbacks.** Each individual follow-up reads the player's actual saved V1 choice and uses a matching callback. V1 completion/choice records are never rewritten. New V2 choices are stored separately in `companionMomentsV2` and added as person-specific Relationship Memory only on first completion.
- **Private knowledge stays private.** A Katsuki follow-up writes only Katsuki memory; an Eijiro follow-up only Eijiro memory. The shared V2 scene may be remembered by both because both are physically present. Archive replay is sandboxed and cannot replace either V1 or V2 choices.
- **Canonical presence still applies.** A new follow-up appears only when the relevant person is actually reachable at the Shared Apartment and in the appropriate room. The shared continuation needs both participants present. No teleporting characters out of work/private time.
- **Visible continuity.** A `Companion Threads` Dashboard card appears beside the current Living World/Social Delivery area and shows when a follow-up is ready; a small Story-navigation heart marks waiting V2 content. The V2 archive remains available even when no new scene is currently reachable.

## Reward / canon / save contract

- Reading, finishing, replaying and waiting grant **no XP, Coins, Story Energy, Skill XP or automatic affection**. Content is the reward.
- No Main Story chapter flags, Dreamscape state, Talk IDs, Message scheduler state, Companion V1 records, My Week/time/reward ledgers, Steam, cloud transport or Coloring IndexedDB are changed.
- V2 creates only additive `companionMomentsV2` state (`completed`, `pending`, `dailyHistory`, `announced`) plus normal Relationship Memory entries for first-read V2 decisions.
- All prose remains canon-compatible everyday side content after the existing shared-apartment stage; no future Main Story reveal or hidden fandom reveal is advanced.

## Loading / cache note

`pwa.js` loads the V2 JS/CSS additively after the normal runtime dependencies. This avoids replacing the very large current `index.html` solely for two new asset tags. The existing network-first service-worker strategy caches those files after first successful load. A fully offline *first ever* V2 launch therefore still requires one prior online load.

## QA performed

- JavaScript syntax checks.
- 7 runtime integration checks: 21/7×3 content shape; V1 ownership/completion/date/presence gates; exact V1 choice echo; single-person memory ownership; no economy mutations; replay immutability; one new V2 completion/day; shared V2 gate after both individuals; V1 records preserved.
- All referenced Bakugo/Kirishima sprites and Shared Apartment backgrounds verified against the uploaded full repository.
- ZIP CRC/contents verified. Real Safari/iPad, personal-save and cross-device cloud round-trip remain device tests.
