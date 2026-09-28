# Life RPG V0.31.4dx — Sound Garden: Artist-Auswahl korrigiert

Install as a root-relative delta over V0.31.4dw. No local save reset.

- Fixes why Billie Eilish and other uniquely matched artists showed "Keine Beispielsongs verfügbar": the previous `Prüfen` button forced a choice dialog even for a single exact match, while samples were only queried for multiple matches. Unique matches now get their artist ID directly, no dialog needed.
- Multiple exactly-named artists: fetch ID-filtered song examples from the song search, with ID-specific lookup fallback. Never use a song from another artist just because the title matches.
- When a catalog returns no sample titles, show explicit explanatory text, artist genre, artist ID and (if supplied) a source artist page link; the user can still select the entry.
- Existing verified artists show `Neu prüfen`; unverified artists show `Prüfen`. Manually verifying an artist no longer automatically replaces the current suggested song.
- Old incomplete pending-selection data is invalidated; artist list, reward history, ratings, known songs, selected artist IDs and daily progress are preserved.
- No change to Spotify player: this delta fixes artist identity only.

QA: JS syntax, archive integrity and local mocked catalog tests. External catalog access must still be tested in a user's browser; its availability and coverage are not guaranteed.
