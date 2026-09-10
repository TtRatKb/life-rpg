# Life RPG — V0.31.4w Steam Player Achievements Worker

## Root cause fixed
V0.31.4t–v could reconcile personal Steam unlocks only if the Cloudflare Worker actually returned them. The deployed Worker used for the original Steam goal import was sufficient for achievement metadata/schema, but the current screenshot proves it is not returning a usable personal unlock state: Life RPG can see 156/69 achievement definitions while showing `personal unlock status unavailable`.

Valve exposes these as separate Steam Web API calls. The Worker therefore needs to request the configured user's achievement state with `ISteamUserStats/GetPlayerAchievements`, in addition to the schema used to list achievement names/descriptions.

## What changes
- Adds a complete **Steam Worker v2** in `steam-worker/worker.js`.
- The Worker keeps `STEAM_API_KEY` server-side and combines:
  - game achievement schema;
  - the configured SteamID64's real achieved/locked state + unlock timestamps;
  - global achievement percentages.
- `/health` now advertises protocol/capability support for personal achievements.
- Life RPG detects an old metadata-only Worker and explicitly says **Worker update required** instead of blaming the SteamID/privacy by default.
- `Sync all Steam games` no longer reports a misleading green success when every game only returned metadata.
- Detailed player errors from Steam are retained so genuine privacy/API failures remain distinguishable from an outdated Worker.
- Existing V0.31.4v baseline/reconciliation behavior is preserved: first real personal sync imports old unlocks as Historical with **0 retro rewards**; later locked→unlocked transitions reward once.

## One required external step
Updating the GitHub Pages files alone cannot change a Cloudflare Worker that is already deployed separately.

Open **Cloudflare → Workers & Pages → your existing Life RPG Steam Worker → Edit code**, replace its source with the complete `steam-worker/worker.js` included in this delta, and deploy it. Keep the existing `STEAM_API_KEY` Secret; never put that key in GitHub or the Life RPG client.

Then in Life RPG:
1. fully reload the PWA;
2. open **Games → Steam Connection**;
3. press **Test connection** — expected: `Worker ready · personal achievement sync supported`;
4. press **Sync all Steam games** once.

Existing achievements should then materialize as Historical/completed with no retroactive reward avalanche.
