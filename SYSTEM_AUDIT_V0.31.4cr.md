# Life RPG System Audit — V0.31.4cr

Scope: static scan of the uploaded `life-rpg-main-9` repository, with special focus on the reported app-wide ~1-second flicker of images/buttons.

## Highest-confidence flicker source found

`time.js` ran a 1-second ticker for an active Life RPG timer and rebuilt the complete active timer card via `innerHTML` every tick. That means buttons and the timer card were destroyed/recreated once per second even when only the clock text changed. In a large Safari/PWA document with many composited/blurred surfaces, this is exactly the kind of unnecessary DOM churn that can trigger broad repaint/twitch artifacts outside the timer itself.

### Fix
- The 1-second ticker no longer rebuilds the timer card.
- When the Rhythm page is visible, only the live clock/status/button label are updated in place.
- When the Rhythm page is hidden, the ticker performs no timer UI DOM writes at all; timer state/alarm logic still continues normally.
- Daily and universal timer widgets now update only when actually visible, and skip text writes when the displayed value did not change.
- Timer surfaces get layout/paint containment to keep their repaints local.

## Other concrete defects found and fixed

### 1. Malformed CSS block
`styles.css` contained 394 literal `\\n` escape sequences inside one accidentally serialized ~9 KB CSS line. Selectors in that section were effectively parsed with prefixes such as `nn.quest-view-v4`, so a substantial Sakura Quest Board style block was not matching its intended elements.

**Fix:** converted the serialized escapes back to real line breaks and verified that no literal `\\n` sequences remain.

### 2. PWA/service-worker version drift
The repository contained later CP/CQ files while the PWA/service worker still identified itself as CN in several places. The service worker also precached an older Nonogram query version and older Drawing/Coloring Studio query versions.

**Fix:**
- PWA + service worker bumped to `0.31.4cr`.
- Core cache bumped to `life-rpg-v0314cr-system-stability`.
- Asset cache bumped to `life-rpg-assets-v6` so stale cache-first images are flushed.
- Index and service-worker query versions are synchronized for changed files.
- Nonogram precache now uses the CQ undo build.
- Standalone Drawing Studio CP resources and its reference-workspace resources are included with matching versions.
- Coloring Studio uses its current CSS and the CR JS build.

### 3. Missing Coloring Studio asset candidate
Coloring Studio always attempted to load a nonexistent `bakugo-trading-card-line-transparent.png` before falling back to the real asset, causing avoidable failed image requests.

**Fix:** removed nonexistent candidates and point directly at the existing runtime asset.

### 4. Recovery animation DOM churn
An active Recovery Studio breathing session replaced the inner HTML of its visual every 250 ms even when only the label changed.

**Fix:** the label node is now reused and only its text is updated.

## Repository checks completed

After the fixes:
- 69 JavaScript files pass `node --check` with **0 syntax errors**.
- `index.html`, `coloring-studio.html`, and `drawing-studio.html` contain **0 duplicate IDs**.
- Static local references in those HTML files have **0 missing files**.
- Literal JS asset-path scan reports **0 missing local asset files**.
- Index ↔ service-worker query-version scan reports **0 mismatches** for shared resources.
- Service-worker CORE entries all point to existing local files.
- `styles.css` contains **0** remaining accidentally serialized `\\n` sequences.

## Notes

The scan did not find a JavaScript syntax failure or duplicate-ID issue capable of explaining the app-wide flicker. The strongest timing match was the once-per-second full timer-card reconstruction, amplified by several other periodic timer DOM writers. This patch removes that unnecessary rebuild path and isolates remaining live-clock repaints.

Remote web references in Drawing Studio remain network-dependent by design and are a separate reliability concern from this flicker issue.
