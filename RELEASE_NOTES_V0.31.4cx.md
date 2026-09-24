# V0.31.4cx — Dreamscape V2 scripted dialogue pass
Base: V0.31.4cw, including prior CV/CU. Copy complete files at matching paths. Export your save first; never clear site/IndexedDB data.

- Rewrites 42 original base dreams (7 realms × 3 focus routes × 2 tiers) as authored, explicitly speaker-tagged, ten-beat VN scripts with small dream-only response choices, with local voice differences and distinct settings for every realm/tier.
- Preserves all 84 existing dream IDs, 42 expanded x1 texts, Archive entries, pending ID/step, focus probabilities, unlocks, cooldown, zero rewards and zero canon relationship effects. Expanded entries remain readable as original prose, without misattributing quoted dialogue.
- Canonical existing sprites/backgrounds and background lazy caching remain untouched; no future CGs or new images added.
- An already pending original dream retains its ID and valid clamped beat position; text may differ because base scenes were rewritten. Archive replay uses the updated script.
- Dream-only response selection is saved with pending progress and reset on waking; no canon choices, trait/affection/reward writes.
- User device/Safari/cloud save test remains required. Existing coloring IndexedDB is not touched.
