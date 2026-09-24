# Life RPG V0.31.4da — Companion Moments (story-linked Talent content)

**Base:** V0.31.4cz. Compact delta: replace/add only the eight complete files in the archive at the repository root. Do not replace the whole repository or delete local browser/site data. Export the main save first, and export Coloring Studio drawings separately if available.

## New permanent unlocks

- Seven additional **1-point** content nodes, one in each Realm, placed after the existing usable content. Existing bought talents, Rank III Japanese cards, passive respec, and Dream Thread rank/cadence are untouched.
- Each node opens three newly authored side moments: one with Katsuki, one with Eijiro, and a shared-household moment after reading both. **21 distinct VN scenes**, each with a choice and an individual reading/completion record. All scenes use only approved existing off-duty sprites and existing standalone environment backgrounds; no new CGs or collages.
- Story integration gate: the existing shared-apartment Main Story chapter must be completed before spending a point. The new node shows this requirement, preventing a paid unlock that cannot yet be used. Existing story chapters are not changed.
- All owned sets also appear in the Dashboard's existing **Unlocked Content** library; no trip back to the Talent Tree needed after purchase.

## Reader and save behavior

- Stage/background, speaker-identifiable dialogue, character expressions, choices, Back/Continue, resume unfinished reading, individual archive replay and the paired moment's separate unlock.
- A first completed choice is preserved, and only the person present receives a small contextual memory via the existing Relationship Memory system. A shared moment is known to both; a private moment is not shared automatically. Replay selections are sandboxed and cannot rewrite prior choices or memories.
- Content itself is the reward. Reading costs **no Story Energy** and grants **no XP, Coins, Story Energy, affinity, friendship, Main Story completion or chapter skips**. The existing main romance and Dreamscape canon separation remain intact.
- Additive save key `companionMoments` only. Existing `story`, `talentV3`, `talentTreeExpansion` purchases/dreamThreads, cloud-save, My Week, reward/time ledgers, Steam and Coloring Studio IndexedDB stay in place.

## QA / limits

- Node syntax, archive & version consistency, referenced sprites/backgrounds, 21 authored scenes, seven independent point purchases/duplicate guard and Main Story prerequisite checked.
- Automated runtime mock checks: reading resume, choice persistence, pair gate, correct private/shared memories, replay immutability, preservation of old saves and zero reward payouts.
- Target Safari/iPad, live GitHub Pages caching and personal/cloud-save round-trip remain user-device checks; local mock tests do not replace those. Never clear website data or IndexedDB to refresh a release.
