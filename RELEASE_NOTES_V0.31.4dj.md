# Life RPG V0.31.4dj — Dungeon Reward Transparency

**Base: V0.31.4di.** Copy the three complete JavaScript files in this ZIP into the Life RPG repository root. Keep all other project files; do not replace `index.html` or `service-worker.js` with an older snapshot. Export the main Save before deploying; do not clear site data or IndexedDB.

- Activity Log: Dungeon wins now display `Japanese Realm XP`, `Japanese Skill XP`, `Character XP`, Coins and Story Energy as distinct rewards. Dungeon wins also appear under the Japanese filter.
- Every Dungeon victory has an expandable German **Warum diese Belohnung?** explanation: normal/boss base amount, hit accuracy, word pool (starter factor), same-day repeat taper, rounded credited amounts, and the global Story Energy diminishing curve. Small rewards that do not pay 0.01 immediately are marked **Story Energy: Rest gesammelt**.
- Existing DI reward ledger entries display the exact paid numbers from their saved events. Prior carry values were not recorded then and are explicitly described as unknown rather than fabricated.
- New receipts also record raw fractional Story Energy, carry before/after, forwarded base amount, and the observed global tier factor in reward `metadata` for precise future explanations. This is additive metadata only.
- **No changes to payout formulas, XP/Coins/Story Energy values, double-credit guards, old reward entries, Kotoba reviews, Dungeon progress, My Week, Story, or Coloring.** The rest of Activity Log retains its previous formatting.
- `pwa.js` v0.31.4dj retains the DI loaders for Companion V2, Focus Dock, Apartment V2, Logic/Lexicon and Dungeon and uses a new query version for the bridge.

Local QA: 8 activity-log rendering tests (including old ledger entries and no state mutation), 4 bridge assertions (including 0 then 0.01 fractional energy, exactly-once receipts), syntax verification of all three scripts, byte-level ZIP verification. Real Safari/GitHub Pages and personal cloud-save test remain open.
