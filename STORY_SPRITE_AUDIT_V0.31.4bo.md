# Story Sprite Audit — V0.31.4bo

## Result
The Story Pack was audited against the actual prose/dialogue rather than against the size of the asset library. Specific expressions are now used when the character's own reaction, gesture or dialogue clearly supports them. Neutral is retained when a beat intentionally leaves a reaction unreadable.

## Bakugo
The expanded Pro-Hero and Casual mirror packs are now wired into Story Pack 3 through semantic expression keys. This prevents specific story expressions from silently falling back to neutral.

New runtime routes include: concerned, protective, jealous, vulnerable, rage, tired, disgusted, inPain, scornful/skeptical, determined/focused, surprised/startled, laughing, embarrassed, tsundere, affectionate/tinySmile, unimpressed/deadpan and shy/softFlustered.

Story beats were updated where the prose clearly supports a specific state. Examples include sick-day care, the platform-edge catch, awkward hand contact, quiet remembered details, protective gym reactions, the public-event shoe comment, agency lunch concern, and subtle domestic-care beats.

The private training scene now keeps Bakugo in off-duty/training presentation instead of switching into full Dynamight art during a scene explicitly framed as normal training and 'no hero nonsense.'

## Mina
Several beats were sharpened from generic curious/neutral to happy, warm or concerned where the prose explicitly describes laughter, a softened smile, serious concern or emotionally attentive listening.

## Kirishima
Existing off-duty expressions were adjusted where the prose clearly called for a firmer or flustered reaction. His current off-duty set remains usable for most domestic scenes.

## Izuku
The first collector-district meeting now uses the laughing sprite once his surprise resolves into an actual laugh.

## Remaining known gap
Kirishima still does not have a dedicated Red Riot / hero-suit expression pack in this build. Therefore scenes that explicitly place him in hero presentation—most notably `SC_020 Public Version` and `SC_033 With Us`—still use approved off-duty Kirishima sprites as a temporary fallback. This is the only major costume-level story/sprite mismatch found that cannot be corrected from the currently available assets.

## Validation
- All 503 declared character-visual uses in Story Pack 3 resolve to an installed asset.
- No missing sprite file references remain after this pass.
- Bakugo's new casual and hero semantic expression routes resolve to the correct newly integrated assets.
- Story Pack revision: `0.31.4bo`.
