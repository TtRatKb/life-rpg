# Life RPG V0.31.4dv — Sound Garden: Daily Discovery (first integration)

Built on the uploaded full repository with the DU trio-collection delta included. Deploy these root-relative files over your current repository. No save reset, cloud migration, or Spotify credentials are required.

## Included
- Sound Garden in the existing Daily Reward Checklist: “Discover a Song” opens the integrated modal and completes after one NEW song is classified that day. Optional and no penalty for skipping.
- Artist/Band pool; one-time Hobbies reward on a genuinely new name, with persistent lifetime dedupe even after removing/re-adding.
- Single-track suggestions from the independent Apple iTunes Search API catalog. Rotates artists, caches a modest set locally/in the existing save, and collapses common remaster/edition title variations.
- Spotify **search and playlist links** for the user to listen and add songs in Spotify. Target playlist is prefilled with the provided playlist ID and editable.
- Four outcomes: Like, Maybe, Dislike, Already know; plus skip. “Already know” excludes the song and immediately requests another without completing the Daily or giving a discovery reward.
- Manual multi-line import of known tracks (Artist — Song), without retroactive rewards.
- First daily reflection: 7 character XP / 9 Hobbies XP / 2 creativity XP / 4 Coins + small Story Energy base. Subsequent unique reflections have smaller, gently tapered rewards; previously rated/known songs and repeated artist entries cannot be farmed.
- Existing reward ledger records precise, auditable activities and remains part of the main save/cloud export.
- DU trio card files included cumulatively (for the supplied full repo, which was still at DT).

## Explicit limitations / scope
- This version does **NOT** authenticate with Spotify, read or automatically edit your playlist, import liked songs, stream inside Life RPG, or verify Spotify listening. It uses outbound normal Spotify links only. Spotify's Developer Policy prohibits games using its platform and artificial stream manipulation, so the music-catalog discovery and voluntary self-reflection are kept separate from Spotify API/SDK playback.
- Metadata comes from Apple's iTunes Search API; song versions or availability may differ on Spotify, and the search link requires the user to select the intended track. The iTunes service needs an Internet connection and may be limited or unavailable.
- Manual known-song import is available, but the target Spotify playlist is not silently marked as known.
- Rewards are for the user's own independent discovery journal actions; the app neither detects nor rewards playback, plays, or stream counts.

## Installation
1. Back up/export your Life RPG save, coloring and drawing data.
2. Copy ZIP contents into the repository root, replacing same-named files. Do not delete other existing files.
3. Push to GitHub Pages and refresh / allow the service worker to update.
4. Daily Reward Checklist → Discover a Song → add Artists → find a track → open the Spotify search link → classify it on return.

## Privacy
The Artist Pool, known songs and ratings are saved inside Life RPG's usual saved state. Song metadata requests go to the iTunes Search API only after you request a suggestion. No Spotify access token or password is collected.
