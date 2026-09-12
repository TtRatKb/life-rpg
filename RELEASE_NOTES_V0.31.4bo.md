# Life RPG V0.31.4bo — Story Sprite Emotion Routing Audit

## What changed
- Audited Story Pack 3 character staging against the actual prose and dialogue beats.
- Expanded the Bakugo runtime expression routing so both off-duty Bakugo and Pro Hero Dynamight can use the newer semantic emotion set instead of silently falling back to neutral.
- Added semantic Bakugo routes for concerned, protective, jealous, vulnerable, rage, tired, disgusted, pain, skeptical/unimpressed, determined, surprised, laughing, embarrassed, tsundere, affectionate and shy expressions.
- Updated scene beats only where the character's own dialogue, gesture or described reaction clearly supports a more specific sprite.
- Corrected the private-gym scene so Bakugo no longer flips into full hero-costume art during a beat explicitly framed as normal training/no hero nonsense.
- Improved several Mina, Kirishima and Izuku expression beats where the current sprite was visibly flatter than the prose.

## Examples of corrected Bakugo beats
- Sick-day care -> concerned / protective / affectionate instead of generic annoyed/neutral.
- Platform-edge catch -> protective instead of caught-off-guard.
- Hand-contact / awkward intimacy beats -> embarrassed or tsundere where the prose supports it.
- Quiet practical care (remembering meetings, carrying heavier bags, food/comfort) -> concerned/affectionate rather than neutral.
- Public hero event shoe comment -> hero tsundere rather than generic hero neutral.
- Agency lunch check-in -> hero concerned.
- Private training -> off-duty determined rather than hero focused.

## Conservative audit rule
Specific expressions are used when the prose clearly supports that character state. Neutral remains valid where the story intentionally keeps a reaction unreadable; the asset library is not treated as a checklist that must be showcased.

## Remaining visual gap
Kirishima still has no dedicated Red Riot / hero-suit expression pack in this build. Scenes that explicitly place him in hero presentation (especially Public Version and With Us) therefore still use the approved off-duty Kirishima set as a temporary visual fallback. This is now documented rather than being mistaken for finished coverage.
