# Life RPG V0.31.4dl — Creative Studios in-app navigation & gallery fix

**Base:** V0.31.4dk (the user-uploaded updated app + DK navigation release). Copy the complete files in this delta to the **repository root**, replacing same-name files. Export your Life RPG save and the separate Coloring/Drawing backups before changes. Never clear site data or IndexedDB.

## Fixed
- Removed the two redundant root-navigation launchers inserted by the legacy Talent Reward Studios module. Each studio now has **one** entry under Spielen & Lernen: Coloring Studio / Drawing Studio. Existing Talent Tree library shortcuts route to the same in-app views, not external HTML navigation.
- Coloring opens an in-app **unlocked-card gallery first**; it uses the actual standalone Coloring Studio catalogue. Current approved card: Bakugo · Level 1. Saved local painting/finished status is shown and the original editor opens only after selecting a card. No speculative, locked or spoiler cards are invented.
- Drawing opens an in-app **30-challenge project gallery** with track filters and indicators for previously practiced and most recently continued projects. Metadata is read from the existing Drawing Studio's actual challenge definitions; no second catalogue is maintained.
- Both original studios run embedded in the Life RPG content region **only after a gallery selection**. Side navigation and floating Focus Dock stay in the outer app. "Back to gallery" returns to the gallery, not Dashboard. Existing standalone studio URLs continue to work as fallback.
- Coloring flushes pending canvas saves on page/gallery exit and before switching cards; stale concurrent asset loads are ignored. Drawing flushes pending IndexedDB strokes and stops its activity timer when leaving the embedded editor. Original Drawing Studio reward queue/anti-duplication unchanged.
- Added optional extra offline cache entries for embedded studio URLs and bumped PWA cache/version.

## Save contract
- No changes to main save schema, Color Studio localStorage key (`lifeRpgColoringStudio:<cardId>`), Drawing Studio IndexedDB DB (`life-rpg-drawing-studio-v2`), Drawing Meta (`lifeRpgDrawingStudioMetaV2`), or drawing reward queue (`lifeRpgDrawingStudioRewardQueueV1`). Existing pictures, unlocks, art references, XP/Coins/Story Energy, My Week, and Story remain in place.
- No art files or fonts included. The new shell uses the existing studio editors, so painting/rewards are not duplicated.

## QA performed
- JS syntax checks and static load-order/PWA/version/asset-reference checks.
- Chromium mock at 1440px and 390px: exactly one Sidebar item per studio; unlocked Coloring gallery (1 actual card); Drawing gallery (30 actual projects), navigation and editor/back transitions, sidebar persistence, return to Dashboard, historical 45-min activity unchanged. No page JS errors in parent mock.
- Native studio catalogue scripts also checked: Coloring catalogue returns the actual card; Drawing catalogue returns 30 actual challenges. On the restricted local browser, full navigation to local HTTP/file URLs is blocked; **live iframe, Safari/iPad, IndexedDB transaction and cloud-save round-trip have not been certified with the user's real data**.

## Installation
Copy exactly the files from this ZIP into the root of the existing DK Life RPG repository and wait for GitHub Pages publication. Refresh the PWA without deleting browser data. Use Spielen & Lernen → Coloring Studio / Drawing Studio. The editors remain accessible at their old direct addresses if ever needed for recovery.
