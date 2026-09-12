# Steam Worker v4 — one required extra deployment step

The GitHub Life RPG files alone cannot call Steam's Web API directly because the API key must stay secret.

After uploading the normal BT delta files to GitHub:
1. Open the existing Life RPG Steam Worker in Cloudflare Workers & Pages.
2. Open/Edit the Worker code.
3. Replace the existing Worker source with the complete contents of `steam-worker/worker.js` from this ZIP.
4. Deploy the Worker.
5. Do **not** change the Worker URL in Life RPG.
6. Keep the existing `STEAM_API_KEY` secret exactly as it is.
7. In Life RPG → Settings → Steam, press **Test Worker**. It should report support for **Family Sharing fallback**.
8. Sync Forager again.

The `steam-worker/` folder is for Cloudflare only; do not copy it into the hosted Life RPG GitHub site unless you merely want to keep source history there.
