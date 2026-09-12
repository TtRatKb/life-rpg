# Life RPG V0.31.4bu — Decimal Steam playtime + manual fallback

## Games / Steam
- Steam total playtime is now displayed in decimal hours (for example `25.4 h`) to match Steam's own presentation.
- Added an editable **Steam total playtime** field to the game editor.
- Both `25.4` and `25,4` are accepted.
- This provides a practical fallback for Steam Family Sharing games whose playtime is not exposed through `GetOwnedGames` or `GetRecentlyPlayedGames`.
- The first manually entered Steam total becomes a reward-free baseline.
- Later higher manual totals are treated like a Steam sync: Life RPG only imports the increase and still avoids double-counting locally logged sessions.
- Games using manual Steam playtime show `manual` beside the Steam total instead of repeatedly surfacing the Family Sharing API warning as the primary status.
- If Steam later starts returning playtime automatically, the game returns to automatic Steam playtime mode.

## Files changed
- `games.js`
- `index.html`
- `pwa.js`
- `service-worker.js`
