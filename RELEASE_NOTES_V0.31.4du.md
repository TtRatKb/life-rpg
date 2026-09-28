# Life RPG V0.31.4du — Luca + Katsuki + Eijirou Coloring Cards

This repo-root delta builds on V0.31.4dt. Unzip its contents into the root of your Life RPG GitHub repository and replace the listed files. Do not delete the browser data or IndexedDB.

## Four new individually purchasable Coloring Studio cards

1. **Cozy Night In** — the explicitly corrected couch image (five fingers, sleepy puppy), not the rejected earlier version.
2. **Midnight City** — the group laughing on a night-time city walk.
3. **Café Together** — the three sharing a table, notebooks and drinks.
4. **Music & Game Night** — game/controller, drums and living-room downtime.

Each new card has its own `color-card-luca-bakugo-kirishima-*` Hobbies skill node, requires the existing Coloring Studio unlock, and costs **one** Hobbies point once. Locked cards remain visible as muted previews with a lock, and cannot be opened until purchased. A dedicated **Luca + Katsuki + Eijirou** gallery filter groups the four cards.

## Asset handling

Each image is a separate source image, re-encoded to neutral black RGBA line art, with white paper made transparent so the editor's paint layer shows underneath. Existing authored dark ink (night skies and small fills) remains intentionally intact. The corrected source was used for the couch composition.

## State safety

- Original 40 card IDs and their save keys are retained verbatim; four additive cards bring the catalog to 44.
- No migrations or destructive state changes; existing main save, Story, rewards, timers, Coloring/Drawing work and IndexedDB are untouched by this delta.
- The new cards do not give XP or relationship progress from purchase. Only standard one-time Hobbies point accounting applies.
- PWA/SW resource versions updated to V0.31.4du to refresh the gallery and content files. Other asset versions preserved.

## Preflight

Local syntax, asset transparency, catalog-to-skill mappings and archive checks are run before delivery. The real published site / user's personal Safari save are not tested here.
