# Life RPG — V0.31.4x Steam Context, Rarity Rewards & Spoiler Shield

This delta extends the working Steam Worker v2/personal-achievement sync without changing the server-side API-key model.

## Steam play context
- Worker v3 adds `IPlayerService/GetOwnedGames` support.
- Tracked Steam games can now store Steam total playtime, recent-two-week playtime where supplied, and Steam last-played time.
- Game cards keep **Steam context** and **Life RPG logs** separate: Steam represents platform history; Life RPG remains the canonical deliberate session/reward log.
- Daily Picks/Game rotation now use the newer of Steam last-played and Life RPG last-played, so an active game you played outside Life RPG does not look falsely untouched.

## Achievement rarity rewards
New Steam unlocks now use the global Steam unlock percentage as a rarity multiplier, while the existing daily/batch anti-farming multiplier remains in place:
- Common: 50%+ → ×1.00
- Uncommon: 25–49.99% → ×1.10
- Rare: 10–24.99% → ×1.25
- Very rare: 5–9.99% → ×1.45
- Ultra rare: 1–4.99% → ×1.70
- Legendary: below 1% → ×2.00

Historical achievements remain **0 retro rewards** regardless of rarity. Reward-ledger metadata stores the global percentage, rarity label and multiplier used for each genuinely new unlock.

## Spoiler Shield
Steam settings now include three modes for locked achievements:
- **Strict (default/recommended):** hide title + description for every locked achievement.
- **Steam-hidden only:** hide only achievements Steam itself marks hidden.
- **Off:** show all details.

Strict mode still shows global unlock percentage and Life RPG rarity, so blind achievement goals can remain useful without revealing story/content details. Once Steam confirms an achievement was actually unlocked, its real title/description can be shown.

## Deployment
Replace the normal Life RPG files from the delta in the GitHub repository. Do **not** upload `steam-worker/` into the Life RPG site repository. Replace the existing Cloudflare Worker source with `steam-worker/worker.js` and deploy it; keep the existing `STEAM_API_KEY` secret unchanged.
