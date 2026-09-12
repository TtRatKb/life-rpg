# Life RPG V0.31.4bs — Steam playtime fallback

## Forager / per-game Steam playtime
- A per-game Steam playtime request can fail even when achievement sync works and the full Steam owned-games library is available.
- Life RPG now retries a failed filtered `/library?appid=...` request using the full Steam library and matches the requested App ID locally.
- This keeps a single game from losing its Steam playtime merely because the filtered Steam/Worker request returns `Load failed`.
- If Steam's full owned-games response genuinely contains no playtime record for that App ID, Life RPG now shows a clearer playtime-unavailable explanation instead of only `Load failed`.
- Achievement sync remains independent and continues working normally.

## Cache
- Version/cache bumped to V0.31.4bs so the new `games.js` logic is loaded immediately.
