# Life RPG V0.31.4db — Living World 3.0

**Base:** V0.31.4da. Copy these complete files into the corresponding app-root paths; do not remove other files. Export your normal save before replacing files. Do **not** clear site data or IndexedDB (Coloring Studio artwork is stored there).

## Everyday Moments
- New Dashboard card and optional VN reader for **12 authored everyday moments**: ordinary teaching-day reflections, gaming/reading evenings, gentle low-energy company, household routines, and two direct follow-up conversations. The content is not a new Main Story chapter or a Dream.
- Uses the existing Story UI's **canonical location and room status**. A home scene appears only if the relevant character is at home, reachable, and actually in the scene's room. A private/offscreen/working person is never teleported into the scene. Requires completed shared-apartment chapter SC_011 and move-in flag; no prematurely available household intimacy.
- Work, Hobbies, Recovery, and Home contexts look at **genuine recent records** in the canonical time entries, quest completions, and reward ledger. Routine scenes do not invent a logged activity. Missing activity data is not treated as a completed action.
- A maximum of one completed Everyday Moment per local day. Unseen scenes come first; previously seen routines may reappear on later days. Replay via the archive is freely available. Nothing expires; not reading a moment carries no penalty.
- Existing person-specific relationship memories may add subtle callbacks appropriate to only the character who knows them. The new choices are stored as person-specific memories; neither roommate learns the other's private conversations automatically.
- Reading position is saved. First choices remain authoritative; archive replay and daily routine revisits cannot replace them.

## Save and economy contract
- Additive `livingWorldV3` top-level save property: `schemaVersion`, `completed`, `pending`, `routines`, `dailyHistory`. No changes to old Story/Talk/Dream/Companion IDs, chapter gates, cloud-save transport, My Week/timetable, skills, talent purchases, Steam, Coloring IndexedDB, reward/time ledgers, or recurring schedules.
- Reading and replay cost no Story Energy and grant **no XP, Coins, Story Energy, relationship progress or new canonical chapter/story flags**. The side story itself is the reward; only a normal contextual memory is added on first completion. No background timers or automatic penalties.

## QA scope
- JavaScript syntax checks and seven local runtime mock integration checks: initialized save remains untouched; canonical chapter/location/room gating; categoryId work log; personal-memory isolation; choice persistence; replay immutability; revisit once/day; no reward generation; prior 45-minute timetable, companion data and balances unchanged.
- Asset URLs verified against the uploaded repository ZIP. New shell assets listed in service-worker cache with new DB version; runtime character and background assets remain on-demand.
- **Still open:** real personal Save + Cloud Save multi-device round-trip, actual GitHub Pages PWA upgrade, and Safari/iPad gesture/display test. Local mock tests do not certify those devices.
