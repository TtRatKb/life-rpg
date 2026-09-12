# Life RPG V0.31.4bt — Steam Families Playtime Fallback

## Why
Steam achievements can belong to the player even when a game is borrowed through Steam Families / Family Sharing. `GetOwnedGames` can omit those borrowed games, which left Life RPG unable to see their Steam playtime even though achievement sync worked.

## New fallback
- Normal owned games still use `GetOwnedGames` first.
- If a tracked App ID is missing there, Life RPG now asks the Steam Worker for `GetRecentlyPlayedGames`.
- If Steam lists the family-shared game as recently played, Life RPG uses its `playtime_forever`, `playtime_2weeks`, and last-played data just like an owned game.
- First recovered lifetime total remains a reward-free baseline; only later positive deltas are imported, preserving the existing anti-retro-reward rules.
- Full-library/automatic sync also checks Recently Played for tracked games missing from the owned library.

## Limitation
`GetRecentlyPlayedGames` only helps while Steam still considers the title recently played. If a borrowed game has fallen out of that list, the normal Web API still has no reliable lifetime-playtime record available to Life RPG.

## Steam Worker v4
The included `steam-worker/worker.js` is a full replacement Worker source. It preserves:
- `/health`
- `/api/steam/achievements`
- `/api/steam/library`

and adds:
- `/api/steam/recently`

It advertises protocol version 4 / `recentlyPlayed` capability. Keep the existing Cloudflare secret named `STEAM_API_KEY`.
