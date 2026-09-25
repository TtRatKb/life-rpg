# Life RPG V0.31.4df — Shared Apartment V2 / Room Journal

**Base:** V0.31.4de Precise Focus Dock, on top of DD/DC/DB/DA. This is an additive delta. Copy all files from the ZIP into the repository root; replace only `pwa.js`, add `shared-apartment-v2.js`, `shared-apartment-v2.css`, and this release note. Do not replace the large `index.html` or the existing `service-worker.js` with an older snapshot. Export the current normal save first, and export Coloring Studio work separately where possible. Never delete website data or IndexedDB just to update.

## Experience

- Existing Home Base gets a dedicated **Enter home** panel after the canonical shared-apartment move-in flag. The existing Room Grid, Story/Atlas room buttons, People, World actions and active floating Focus Dock remain intact.
- Four readable rooms: Living Room and Kitchen use the **approved existing standalone Dawn/Day/Sunset/Night backgrounds**; Luca’s private room and balcony use clearly stylized interface environments, not falsely claimed CGs or repurposed kitchen backgrounds. We have not generated or accepted new bedroom/balcony CG art.
- Twelve small room objects/observations with an individual first-choice memory and a rereadable room scrapbook. The original choice stays fixed when revisiting. A few details unlock only when existing Home Companion V1/V2 progress or a genuinely kept plant supports them; no future-story teaser is surfaced.
- **Luca’s private corner:** four free personal color moods (warm sakura/plum, soft grunge, forest witch, warm night) and up to three free décor accents shown in the stylized room panel. These are interface styling, not Shop purchases, new Gift items, or physical CG replacements.
- **Little Keepsakes:** only gifts the actual Gift system records as kept by Katsuki/Eijiro are listed. At most three may be featured as memory markers on shared-room art, without asserting that anyone’s property was moved, and without forging inventory or new gift drops.
- **Household history:** genuine saved Home Companion and Living World moments become non-spoilery little markers as they happen. Owned Home Companion content can be reopened through its existing interface; no new purchase.
- Canonical real-time presence is read from the single existing StoryUI shared-home hub and World location details. Existing Talk/Hangout/World buttons are passed to the original StoryUI action handler and rechecked immediately before opening. Characters are not teleported into unavailable/private rooms.

## Save, economy, canon

- Adds just `sharedApartmentV2` to the normal save when the user first interacts: schemaVersion, visual choices, first room-object memories, visits, scrapbook, and featured keepsake identifiers. Read-only dashboard rendering before move-in does not initialize or mutate the save.
- Existing `story`, V1/V2 Companion, Relationship Memory, gift inventory/kept entries, Living World 3.0, Social Delivery, Main Story, time/Focus precision, schedule, reward ledger, cloud save and Coloring IndexedDB remain untouched. No XP, Coins, Story Energy, affection, relationship meters or artificial milestone progression are given for clicking around.
- This is an additive UI/texture pass using the already approved apartment backgrounds, not a replacement for the original interactive apartment hub or a newly generated image pack.

## Local verification and limitations

- Real Chromium mock integration: pre-move gating, four rooms, free styling, cap on accents, original-choice immutability, true gifted keepsake ownership, V1/V2 gates, canonical last-moment room-action revalidation, no reward/time/save regressions, and 390px mobile layout without horizontal overflow.
- Both module and DE-preserving loader checked for JS syntax. Existing source images/paths checked against the full uploaded repo ZIP; packaged delta CRC and actual archive member bytes verified.
- No live personal-save, GitHub Pages service-worker update, Safari/iPad rendering, full repo state or multi-device cloud round-trip test. The previously generated complete repo predates some later deltas, so the loader intentionally does **not** overwrite index.html or service-worker.js.
