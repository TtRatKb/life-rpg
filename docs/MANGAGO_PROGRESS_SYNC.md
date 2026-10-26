# Life RPG ↔ Mangago progress (Firefox pilot)

**Status:** experimental, opt-in. No official Mangago API or automatic account synchronization. Only a local Firefox userscript is used.

## Installation

1. Install [Violentmonkey for Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/).
2. Open the raw userscript file `integrations/life-rpg-mangago.user.js` from this repository and install it using Violentmonkey's `+` → `New script` editor (replace the generated script with its contents and save).
3. In Life RPG → Library, create or edit a manga, manhwa or webtoon. Set **Reading link** to its Mangago series page, such as `https://www.mangago.me/read-manga/example_series/`. Select **Track progress by: Chapters** and set your **actual current chapter** once.
4. Read normally in Firefox on Mangago. When you navigate from a recognized chapter (e.g. `.../nml_chapter-4/pg-1/`) to its immediate successor (e.g. `.../nml_chapter-5/pg-1/`), the script queues chapter 4 as completed.
5. Open Life RPG in the **same Firefox profile**, with the userscript active. The script transfers queued chapter confirmations to Life RPG, one at a time. Life RPG logs only the next contiguous chapter and acknowledges successful imports. The app must be opened; there is no background server.

## Guardrails and known limits

- No login, password, cookies, chapter images or story text are read or transmitted by the script. Its storage contains only Mangago slug and adjacent chapter number.
- The script never claims a whole range read because the reader jumped ahead. Life RPG rejects a completion if it is more than one chapter above the saved position. Set the actual starting progress manually first.
- Only numbered `/read-manga/<slug>/.../nml_chapter-<integer>/` (or `chapter-<integer>`) URLs on `mangago.me` are supported by this initial pilot. Other Mangago domains, chapters using fractional numbering, endless-scroll modes and novel URL layouts are **not supported** until real browser samples can be validated.
- Opening a new chapter is evidence that the previous chapter was navigated past, but not absolute proof it was read completely. Progress remains manually adjustable in Life RPG.
- If a title isn't linked to its Mangago series page, its queued event stays pending. No attempt is made to match unreliable names automatically.
- Runs only in Firefox with Violentmonkey installed, and only in the same Firefox profile. It is not a live cloud subscription to Mangago's account history and does not run in a closed browser.
- If Mangago changes its reader routes, this will stop tracking until tested and updated. Existing Library entries and progress are not cleared.
