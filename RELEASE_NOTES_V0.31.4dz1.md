# Life RPG V0.31.4dz1 — Sound Garden Track-ID Idempotency Hotfix

Root-relative DELTA on top of V0.31.4dz. Copy the files into the repository root and overwrite matching files. **Do not clear site data, localStorage, cloud save, Coloring paintings or unlock data.**

## Fixes
- Persist exact Spotify `spotifyTrackId` / `spotifyArtistId` on normal Sound Garden ratings and `Already know`, not only on playlist imports/catalog candidates.
- Candidate filtering now treats an already seen exact Spotify Track ID as known even when the display Artist name differs (important for aliases such as `HANABIE.` / `花冷え。`, renamed artists, or playlist metadata).
- Discovery reward idempotency now uses the exact Spotify Track ID when available, while keeping the historical title/artist reward key as a compatibility index. This prevents the same Spotify track from becoming rewardable again through an alias/name-key change.
- Existing legacy Sound Garden keys, ratings, known songs, rewards, Artist bindings and catalog data remain readable and are not rewritten destructively.
- Activity Log labels/explanations now explicitly distinguish the one-time Artist-add reward from a new-song classification reward and state that playback/stream duration is never rewarded.
- Service-worker and script query versions were bumped only to force the changed files to refresh.

## QA
- JS syntax checks pass for all changed JavaScript files.
- Mocked ambiguous Spotify Artist selection confirms candidate examples/releases are tied to the displayed Spotify Artist ID and the chosen binding persists without a second identity search after reconnect.
- Mocked `Already know` confirms no reward and no Daily completion, followed by an immediate new suggestion.
- Mocked Like confirms one reflection reward and Daily completion.
- Exact Spotify Track-ID alias dedupe is covered by the hotfix tests.
- Spotify endpoints used by DZ/DZ1 match the current Spotify Web API documentation: Artist Albums and Album Tracks remain available; playlist Add/Get Items use the 2026 `/items` endpoints; Web Playback SDK remains Premium-only.

Live OAuth/audio still requires the real deployed browser/account and is not claimed as locally verified.
