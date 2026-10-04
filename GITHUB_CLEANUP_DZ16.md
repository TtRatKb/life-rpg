# Optional GitHub Pages cleanup after DZ16

This cleanup is optional. DZ16 no longer references the files below at runtime, so leaving them in the repository does not make Life RPG use them.

## Safe old background candidates
After DZ16 the runtime has no JS/HTML/CSS references to these soft/upscaled legacy variants:

- `assets/story/backgrounds/time/home_dawn.webp`
- `assets/story/backgrounds/time/home_day.webp`
- `assets/story/backgrounds/time/home_sunset.webp`
- `assets/story/backgrounds/time/home_night.webp`
- `assets/story/backgrounds/time/station_day.webp`
- `assets/story/backgrounds/time/city_day.webp`
- `assets/story/backgrounds/time/koharu_cafe_day.webp`

## Cloudflare Worker source in the Pages repository
`steam-worker/worker.js` is not loaded by the GitHub Pages app. If the V5 worker is already deployed in Cloudflare, this copy can be removed from the Pages repository without changing the deployed Cloudflare Worker. It contains no hard-coded Steam API key; it reads `env.STEAM_API_KEY` from the Worker environment.

The deployment notes can stay because they are tiny and useful for recovery, but they are not needed by the browser runtime either.

## Much easier than deleting one file at a time on github.com
You can batch the cleanup into **one commit / one Pages deployment** with GitHub's browser editor:

1. Open the repository on GitHub.
2. Press `.` (period) on the keyboard. This opens the repository in `github.dev` / VS Code for the web.
3. In the Explorer, select/delete all unwanted files before committing.
4. Open **Source Control**, enter one commit message such as `Remove retired story assets`, and commit/sync the changes once.
5. GitHub Pages then rebuilds once for that commit instead of after every single delete.

Do not remove files simply because they look old. The list above is intentionally limited to files DZ16 has made runtime-unreferenced.
