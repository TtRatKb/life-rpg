# Life RPG V0.31.4dw — Sound Garden Artist Identity + Bulk Entry Fix

Install over V0.31.4dv (repo root). No save reset. Your artists, reward history, known songs and ratings remain; only the older ambiguous cached suggestions are discarded.

- Paste many artists separated by commas, semicolons or newlines. Quote names containing commas, e.g. `"Earth, Wind & Fire"`. Every genuinely new artist receives the existing one-time reward; duplicates are skipped.
- Existing artist entries are migrated without deletion. Newly used artists resolve by Apple/iTunes stable `artistId`. If multiple exact names exist, choose the correct artist from genre and representative songs (retrieved by artistId). The `Prüfen` button forces an identity check.
- Track discovery fetches ID-filtered songs; neither song titles nor another artist with the same name can stand in for the requested band. Old unsafe cached catalog entries and current suggestion are invalidated, but completed Dailies and history remain.
- In-app Spotify playback and automatic playlist editing are **not** included: current Spotify policy restricts incorporating Spotify content into games without approval. The Spotify search/playlist links stay available; an unapproved player is not silently shipped. Apple's preview audio is likewise not inserted as a replacement, because the Search API licenses previews for promotion rather than independent entertainment.
- Spotify Premium alone does not remove these licensing restrictions.

After deployment: open Sound Garden, use `Prüfen` for Ghost Town, select the correct band based on sample tracks (e.g. You're So Creepy / Game Freak). A new song recommendation will then come only from that exact catalog artist ID. Browser backup recommended before any deployment; do not erase local data.
