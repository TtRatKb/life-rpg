# Life RPG — V0.31.4u Steam Connection Settings

## What changed
- The Games screen now shows a prominent Steam Connection card instead of hiding setup only in Settings.
- `Configure Steam` jumps directly to the existing safe Steam settings panel and highlights it.
- Life RPG stores only the Worker URL + SteamID64; the Steam Web API key remains a Cloudflare Worker secret.
- `Test connection` validates both pieces of setup and then calls the existing `/health` Worker endpoint.
- `Sync all Steam games` performs a manual sync across games with Steam App IDs.
- Per-game `Sync Steam` no longer appears to do nothing when setup is missing; it becomes `Set up Steam` and opens the correct settings panel.
- SteamID64 is validated as a 17-digit numeric ID before sync/test.
- No Worker/API changes are required.

## First setup
1. Open Games → Steam Connection → Configure Steam.
2. Paste the deployed Cloudflare Worker URL that contains the `STEAM_API_KEY` secret.
3. Enter the account's 17-digit SteamID64.
4. Press Test Worker. A healthy configured Worker reports `Worker ready · Steam key configured`.
5. Return to Games and press Sync all Steam games or Sync Steam on one game.

The first successful achievement sync establishes a historical baseline. Already-unlocked achievements do not generate retroactive rewards; future locked → unlocked transitions do.
