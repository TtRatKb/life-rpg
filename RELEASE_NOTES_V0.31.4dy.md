# Life RPG V0.31.4dy — Sound Garden: Spotify Premium inside Life RPG

Install this root-relative DELTA on top of V0.31.4dx. Do NOT wipe localStorage, Life RPG save data, Coloring or Drawing saves.

## What changes

- Added a genuine optional Spotify connection via Authorization Code + PKCE (no Client Secret in GitHub Pages or Life RPG save).
- Added Spotify-artist-ID resolution and artist-ID-filtered track suggestions. Song titles alone never identify an artist.
- Added HANABIE. / 花冷え。 / 花冷え alias search in both the fallback Apple catalog and Spotify searches.
- Artist names that cannot be matched can be bound to their **exact Spotify artist page** using the new direct artist-link field; no destructive changes to existing artist records or reward ledger.
- Added the official embedded Spotify track player within Sound Garden, plus a Premium browser player powered by the official Spotify Web Playback SDK and a small persistent playback dock. The Spotify browser SDK needs a supported browser and may require a second play click after its initial device setup; the official embed remains available as fallback. Full-track playback is subject to Spotify licensing, browser and account conditions. The player is user-initiated; no autoplay/background stream farming.
- Connected mode selects songs directly from Spotify with their real track IDs, using artist albums with an ID-filtered search fallback. Avoids the obsolete Development-Mode top-tracks endpoint and observes the 2026 search limit of 10.
- Added explicit "Add to my playlist" using the 2026 `/playlists/{id}/items` endpoint. Playlist address remains the user's previously configured target.
- Added optional import of the linked Spotify playlist as already-known songs (maximum 1,000 entries per run; no retroactive rewards).
- The former Apple iTunes source remains as an offline-from-Spotify / not-connected catalog fallback; it cannot provide an in-app Spotify track player without a Spotify track ID.
- Artist-add and manual song-reflection rewards remain unchanged. **No reward is awarded for Spotify playback, streams or playback duration.**
- Existing Artists, historical rewards, song ratings, known-song list, daily completions, cards and save format remain intact. OAuth access and refresh tokens are kept in the browser tab's `sessionStorage`, not the Life RPG save or repository. The public Client ID is saved in that browser's `localStorage`.

## One-time Spotify setup

1. Open https://developer.spotify.com/dashboard and create a personal development app, using your Spotify Premium account.
2. Register **exactly** this Redirect URI in your app:

   `https://ttratkb.github.io/life-rpg/`

3. Under Sound Garden > Spotify Premium, paste your **Client ID only** (not Client Secret). Save it and click **Spotify verbinden**.
4. Sign in on the official Spotify authorization page. It returns to Life RPG; re-open Sound Garden if necessary.
5. Click **Song vorschlagen** then **Hier im Life RPG abspielen**. Use the official embedded player if Web Playback SDK does not start. To resolve a stubborn artist, paste its exact Spotify artist link using the dedicated field.

Spotify's development-mode app must have the account authorized according to the dashboard's current restrictions. API quotas, account availability, regional music rights, tracking protection and browser autoplay rules are external dependencies. API errors are surfaced in Sound Garden instead of silently showing a random same-named song.

## QA limitation

Syntax, rooted file references, mocked artist and OAuth flows and archive integrity can be tested locally. Real Spotify login and Premium audio playback require the user's private Spotify authorization and can only be confirmed in the deployed browser.
