# Life RPG V0.31.4dz — Spotify Artist Identity / Beispielsong Fix

Root-relative DELTA on top of V0.31.4dy. Copy files into the repository root, overwriting changed files. **Do not delete browser storage or reset the Life RPG save.**

## Fix
- In the Spotify-connected multiple-artist identity picker, fetch actual artist-ID-bound album tracks (up to four samples per candidate), release names, and an available artist/cover image. Previous DY implementation returned an empty examples array for every Spotify artist.
- ID-filtered track-search fallback. Unrelated same-named songs are never displayed as sample evidence. Do not rely on removed top-tracks endpoint.
- Play first example inside the picker via official Spotify track embed when a track ID is available; choosing the artist is a separate action.
- No longer fill the card with unhelpful 'Genre nicht angegeben' when Spotify provides no genres. Clearly distinguish no catalog examples from a failed lookup; still offer direct Spotify artist link.
- Any still-open, outdated DY Spotify candidate panel is dismissed on first DZ load; click „Prüfen“ for unresolved artists to fetch fresh real examples. Already confirmed IDs are retained.
- Existing Spotify artist bindings stored as `spotifyArtistId`/`spotifyArtistName`, original Apple artist IDs, artists, Rewards, known songs, ratings, Dailies, and Spotify Client ID are not modified by this delta. Source-specific Apple-to-Spotify matching is required once when switching catalogs for the first time, not after ordinary Spotify reconnects.

## Limitations
- Artist examples depend on Spotify's live available albums/tracks for your account/market. Some obscure artist entries genuinely have no available tracks, or Spotify may rate-limit. The dialog gives a fallback artist link instead of inventing songs.
- A Spotify listening sample is user-initiated and does not issue a Life RPG reward.
- Live Spotify API and account playback require testing after deployment; mock tests cover query IDs, display and preservation of saved artist mappings.
