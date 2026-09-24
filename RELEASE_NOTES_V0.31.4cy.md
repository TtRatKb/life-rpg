# Life RPG V0.31.4cy — Talks 2.0 / Personal Memory

**Base:** V0.31.4cx (including CW/CV/CU). This is a compact replacement/delta archive. Replace only matching complete files in the existing app. Export a save before updating. Never erase browser website data or IndexedDB.

## Changes

- 40 authored optional Talks added to the existing story pack: eight new three-way choice conversations and two conditional callbacks each for Mina, Katsuki, Eijiro and Izuku. The original 190 Talk records and IDs, all other story content and hidden canon remain untouched.
- New answers write a unique Luca trait and one person-specific memory for the person she actually spoke with. The two followups per person require that specific memory; other characters cannot automatically know it. No public relationship meter and no negative punishment.
- Talk selection offers new one-off conversations first, then previously unread repeatables. Once no unread conversation is eligible, the New Talk action becomes unavailable instead of automatically recycling the same three scenes.
- People > person > Talk Archive lists completed conversations. Archive replays may explore alternative dialogue without saving new choices, memories, rewards or canonical relationship progression. Unread conversations cannot be replayed.
- Relationship Memory supports an additive Izuku profile, preserving all existing Mina/Katsuki/Eijiro history.
- Corrects a previously existing People profile rendering issue caused by referencing the schedule before declaring it.
- Version-busts the story pack, scripts and new stylesheet; updates service-worker shell cache without resetting the separately bounded art cache.

## Preservation and limitations

- No changes to the save schema of My Week/time/rewards, Dreamscape/Archive, Coloring IndexedDB, cloud save, purchase history, or old Talk identities.
- Existing Talk selections and active progress are retained. New content unlocks under existing contact/story flags; no sudden spoilers.
- No new sprites or CGs; current approved art is reused. No unreleased scene prose is disclosed in release notes.
- Local JavaScript syntax, encrypted content schema, asset links, old-ID immutability, migration, memory and replay mock tests passed. Real Safari/iPad, your personal saved state and cross-device cloud sync still require a device test. The local browser automation endpoint was blocked by this execution environment, so do not regard browser/device QA as complete.
