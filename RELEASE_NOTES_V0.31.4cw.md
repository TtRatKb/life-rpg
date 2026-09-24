# Life RPG V0.31.4cw — Skill Tree & Dreamscape Foundation

**Base:** current CV (`Life-RPG-V0.31.4cv-Daily-Life-Motivation-Delta.zip`) on the uploaded `life-rpg-main 2.zip`. Replace only the complete files from this delta at the corresponding repository paths. Do not clear browser storage, change origins, or import a blank save. Export a regular game save first; if available, separately export your Coloring Studio drawings from the existing browser after installing this patch.

## Included

- Dreamscape: staged visual-novel-style five-beat reader using existing canonical Bakugo/Kirishima sprites and scene backgrounds; Back/Continue/Wake, in-progress save/resume, non-canon Archive replay with no repeat cooldown/rewards; existing dream text/IDs/focus RNG/unlock and cooldown records preserved. Existing text has **not** been fully rewritten as scripted VN dialogue; this is the presentation foundation.
- Talent Tree: Dream Thread gates show the actual prerequisite checklist and point count. Thread II: Thread I, Realm Special III, first actual content unlock and 2 unspent Realm points; it no longer requires buying weak second content. Existing owned Dream Threads, content, passive ranks and saved Skill XP remain.
- Focus Challenge Deck and the bring-your-own-audio Shadowing Sprint retired from the purchasable paths. Previously bought external content points become available again by a one-time migration. A historical migration record retains the old unlock values; existing rewards/ledger are not retroactively altered. Replacement content must exist before it can cost points.
- Work Deep Brief: existing unlockable Journal card appears near the top of the normal Journal, not only via Skill Tree.
- Unlocked DynaRiot Japanese Extras appears in the Daily Reward Checklist, reflecting its actual daily completion and linking into its existing reader.
- Talks: 12 new authored choice-led, one-time conversations (3/person for Mina/Kirishima/Bakugo/Izuku), including contextual recalls of earlier choices. Choices store persistent story traits. Existing Talks and scene pack remain intact; unseen repeatable Talks take priority over already-seen repeats.
- Coloring Studio: stop pruning save metadata for temporarily missing card IDs. Portable JSON backup of all locally stored IndexedDB drawing pages, plus non-destructive merge-only restore. Main Save still does NOT include large stroke data. A drawing already missing from this origin's IndexedDB cannot be reconstructed from normal save metadata.
- PWA shell/index and story-pack cache versions bumped in concert. Existing app.js, daily.js, cloud-save module, time/my-week ledger, story scenes, journal answers and all art files unchanged.

## Not in this release / future content work

- No new coloring-card art: needs user-provided visual inspiration and approved standalone original art; do not fabricate panels or crop collages.
- No full rewrite of 365 prompts: protect existing date-based answers first by storing prompt snapshots/versions and allowing alternatives; do not silently relabel old answers.
- No fake Shadowing content or automated BYO timer; real voiced/audio material, accessible transcript, and short guided clips need to be authored and tested.
- Larger individual content packs for Knowledge/Health/Recovery/Home/Hobbies and additional Dream scene writing remain a separate content expansion, not represented as present. Future items are visibly non-purchasable until complete.
- No claim of real Safari/iPad or cross-device cloud-save acceptance. Static, mock runtime, source-pack, asset-path, and archive checks performed; user should validate on device with a backup.

## Coloring safety

The `life-rpg-coloring-v1` IndexedDB is origin-specific. If previous work seems missing, open the same device, browser profile and GitHub Pages origin; do not clear site data. Export **Back up all drawings (.json)** from the Coloring Studio gallery if records remain. Standard save/export does not contain the large stroke data. Restore only merges missing pages without overwriting an existing page; PNG export remains available.
