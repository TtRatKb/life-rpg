# Life RPG — V0.31.4aq

## Hidden Relationships + Affection-weighted Dream RNG

### Existing relationship foundation
Story Mode already had hidden relationship stats and authored `relationship` effects, and the first completed Talk each day already grows `familiarity`. This release keeps that canon system and adds a normalized long-term layer on top instead of exposing numeric meters.

### Hidden relationship types
- **Mina:** Friendship progression
- **Bakugo:** Romantic Affection progression
- **Kirishima:** Romantic Affection progression

The player UI never displays points, levels or exact probabilities.

There are 10 hidden progression levels. Points only move forward.

### Farming-game progression rule
An awkward / less fitting decision can slow progress but cannot permanently destroy a relationship:
- negative authored relationship effects never subtract hidden Friendship/Romance points;
- authored positive growth only awards hidden bonus progress after that relationship stat reaches a new high-water mark;
- ordinary Talks, Hangouts, Messages and social events keep providing repeatable ways to build connection again;
- those repeatable interactions also add small recovery growth to common canon relationship stats (`affinity`, and existing `trust` / `comfort`) so a poor choice cannot create a permanent finite-choice dead end.

Generic hidden gains:
- first Talk with a person that day: +1
- Hangout completion: +4
- social/world event: +2
- Message reply: +1
- favorable authored relationship effects: additional hidden growth
- future Gift API: loved +4 / liked +2 / neutral +1 / disliked +0

A disliked gift therefore teaches preference without deleting prior affection.

### Dreamscape character roll
The player no longer chooses Bakugo / Kirishima / Both before a dream.

Dreamscape rolls automatically from hidden Romantic Affection.

- Bakugo solo stays within roughly **30–50%**
- Kirishima solo stays within roughly **30–50%**
- Both stays within **5–20%**
- Both rises when Bakugo and Kirishima are at similar Affection levels
- Both also grows as both relationships become more developed

Example: when both hidden Affection levels are approximately **7 / 7**:
- Bakugo: **40%**
- Kirishima: **40%**
- Both: **20%**

The chosen result is saved as the pending dream, so reopening Dreamscape cannot reroll it.

### Daily Check-in companion
The Daily Check-in now gets a hidden relationship-weighted companion before the briefing opens.

Availability still respects Story progress:
- Mina only joins after her friendship has begun.
- Bakugo / Kirishima enter the Daily Check-in pool once shared-apartment life has actually started.
- Luca self-check-ins remain possible.

Weighting:
- Romantic Affection has a stronger effect than Friendship.
- As Bakugo/Kirishima affection grows, their check-ins become substantially more common.
- Mina still remains in rotation.
- a small Luca self-check-in weight remains.
- recent-companion damping prevents one person from monopolizing every consecutive day.

The selected companion is locked for that date before the user opens the check-in, so the preview and the actual conversation stay consistent.

### Migration
On first load, the hidden system seeds itself from existing Story relationship stats and major established relationship flags so previous choices/social progress are not discarded.

No visible relationship meter is added.
