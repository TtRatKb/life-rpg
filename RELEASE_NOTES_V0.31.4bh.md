# Life RPG V0.31.4bh — Mina Expansion Pack Integration

## Added
- Integrated Mina Ashido Expansion Pack sprite assets into the runtime build.
- Added 10 Mina outreach sprites for story stage use and UI portrait reuse:
  - neutral
  - happy / warm
  - teasing / playful
  - surprised / curious
  - sassy
  - concerned
  - excited
  - embarrassed
  - annoyed
  - soft / sad
- Added sprite file precaching in the service worker so Mina's new assets are available offline after install/update.

## Updated
- Expanded `assets.characters.mina.outfits.outreach` inside `SP_003` to map both existing scene expressions and new future-facing aliases to the new sprite set.
- Kept Mina's neutral sprite as the default contact/avatar asset for people cards and presence chips.

## Notes
- Existing story beats using Mina's older `neutral`, `curious`, `excited`, and `teasing` expressions now resolve to the new integrated artwork.
- This pass focuses on Mina asset integration only and does not change the story script itself.

## Compact packaging correction
- Mina sprite files are stored as **lossless WebP with alpha** to reduce GitHub browser upload size without changing their visual content.
- This corrected release is a true delta over V0.31.4bg; the approved World Coverage background images are not redundantly bundled again.
