# Series / Anime & TV Library

The Series & Anime shelf has its own `view-series` page and 📺 Series & Anime
sidebar entry beside Books/Library and Games. The existing book and game views stay
unchanged. Native opens from Daily Plan and My Week activate the dedicated series
view, not the book Library. `series-library.js` loads once, after `app.js` and
before Time, My Week, Daily Plan and Skills. No movie catalog,
streaming-account sync or Japanese-training inference is added.

## State and rewards

`seriesLibrary` schema 1 contains items, stable seasons/episodes, watch cycles,
canonical logs, personal reviews, lifetime milestone receipts and optional plans.
Initialization adds only a missing section; unsupported schemas are never reset.
The existing generic save codec and cloud/export snapshots retain the entire
section. Nothing is backfilled during initialization or restore.

A confirmed episode uses `awardActivity()` once per episode and watch cycle:
15 Character/Realm XP and 10 wellbeing capability XP, no Coins or Story Energy.
This follows the existing Comfort Episode's 15-XP reference. Hobbies / Recreation
& Play is the default; intentional recovery uses Recovery / Leisure & Unwinding.
Skill practice uses the existing time-XP formula when actual minutes are supplied,
otherwise the existing eight-XP native-session convention. Catalog estimates are
never used as actual time. First season/series completion each gives 10
Character/Realm XP, no capability/Skill practice or Story Energy; the first series
completion gives 50 Coins, following the existing book-completion reference.
Existing balancing tables are unchanged. Reviews give no rewards.

Known ended seasons need an explicit regular-episode total matching their stored
regular episodes. A series must have a known end and all regular seasons complete.
Specials are optional. Explicitly starting a rewatch also works when the previous
cycle is unfinished. It keeps every prior log and milestone receipt and never
pays first-completion milestones for the new rewatch. Repeated activation of an
empty rewatch reuses its cycle ID. The cycle selector can return to an earlier
first-watch or rewatch without any payout; only newly confirmed episodes count.
First-completion bonuses remain limited to the original first-watch cycle.
Historical sessions never pay episode rewards or backfill milestones.

Undo retracts owned episode/completion rewards through `revokeActivityReward()`.
Immutable payout receipts can rehydrate only their own evicted ledger row before
that inverse operation. Redo reuses the same log identity; milestones retain
lifetime receipts. Provider and numbering changes never replace log IDs.
The ledger's existing ten-minute cross-source guard covers explicit episode
quests/timers and series logs in either order. Skills additionally avoid projecting
an explicit episode interval twice; persistent dedupe markers survive ledger
pruning. This is not a claim of general identity resolution for arbitrary freely
named quests or timers outside the existing protection window.

Each Series transaction persists all related state once. On a failed write it
rolls back its own state and rewards, refreshes only resource/XP displays through
`LifeRPGApp.refreshResources()`, and retains unsaved form input. This refresh
does not render gameplay, reconcile Skills, persist state or award rewards.
`recoverOnFailure:false` prevents a failed, rolled-back transaction from entering
the main app's pending-save recovery. Earlier pending progress remains intact.

Daily candidates include Watching and Want to Watch titles with a known next
episode and positive motivation; unknown, paused, dropped and archived titles
are excluded. Want titles are optional invitations and can occupy Care/Optional
slots, with the same gentle Comfort preference. Suggestion generation pays
nothing and leaves status untouched; explicitly opening a native Daily episode
changes Want to Watching, as does the first confirmed log.

Daily picks pin one actual episode and cycle. Completion reads its canonical log
since the pick, without episode rewards. My Week renders planned watch blocks,
confirmed intervals and completion-only chips separately from canonical work time.
No watch estimate is inserted into `timeTracking`, and watch blocks never enter the
school timetable's automatic logging path.

Archiving is reversible soft removal. It hides a mistaken title from the shelf
and new suggestions, blocks episode logging until restored, and retains status,
provider ID, reviews, episode/cycle IDs, logs, plans, milestone receipts and all
existing rewards. "Show archived titles" and "Restore title" bring it back.
Catalog duplicate detection still includes archived titles, so restore does not
create a fresh entitlement or pay again. Existing plans/history remain readable.

## Catalog policy

Checked 2026-10-13 against the [official TVmaze API documentation](https://www.tvmaze.com/api):
public search, show-season and show-episode endpoints; browser CORS; at least 20
requests per ten seconds per IP; one-hour provider caching; API data under CC
BY-SA with attribution; the image CDN may be hotlinked. The UI links each stored
snapshot to TVmaze and the [CC BY-SA license](https://creativecommons.org/licenses/by-sa/4.0/).
Stored provider-derived metadata remains attributed and ShareAlike; personal
watch logs/reviews are separate user data. Episode descriptions and thumbnails
are not fetched into previews. Only the show's cover is used, with a placeholder
on failure.

Lookups are on demand, serialized with one-second request spacing, a bounded
one-hour in-memory cache, timeout and a ten-second 429 backoff. Results require
explicit selection and confirmation. Saved structure/logs are never refreshed or
overwritten in the background. No tokens are embedded. Unknown values remain null.
Anime original/English/romanized names can be entered and searched on the shelf;
separate sequel/part titles can be linked manually without merging.

Jikan v4 is not enabled: its public site did not provide sufficient verifiable
rights/terms information in this environment. The full offline/manual anime path
is available. AniList, TMDB, scrapers and external account synchronization are not
included.

## Verification and remaining manual QA

Run `python3 -m unittest discover -s tests -v` with Python Playwright and Chromium
(`/usr/bin/chromium`, or `CHROMIUM_PATH`). Tests use synthetic saves, isolated
contexts and mocked Firebase/TVmaze. They cover bootstrap, IDs, rewards, duplicate
clicks, Undo/Redo after ledger eviction, completion, rewatch, unknown/ongoing
structure, specials, historical logs, review edits, sequel links, Daily completion,
Week time semantics, Quota rollback, save codecs, cloud conflict restore, catalog
selection/errors, draft preservation and a 390px Chromium viewport. The existing
save-safety suite remains required. Changed runtime files are syntax-checked and
index/PWA/CORE cache versions are checked together.

Still required before release: real iPhone/Safari touch and dialog QA; authenticated
Firebase cross-device sync with a synthetic account; live TVmaze CORS, availability
and cover behavior; actual installed-PWA update and offline cache behavior.
A Chromium viewport is not Safari, a Firebase stub is not provider E2E, and static
CORE version checks are not an offline installation test. No deployment or merge
is part of this change.

## PR #4 review verification

Review fixes are covered by five additional synthetic browser regressions:
Want-to-Watch through the real candidate pipeline and native selection, partial
rewatch and return to the first cycle, visible Coins/XP rollback after a failed
completion payout, archive/restore with stable receipts and plans, and failed
review actions preserving unrelated pending-save recovery. The full suite is
`python3 -m unittest discover -s tests -v` (37 tests: 16 existing save-safety,
21 Series tests). Runtime and CORE query versions for changed files advance to
`0.31.4-series2`; unchanged module versions remain intact. Real provider/device
and installed-PWA verification still remain manual release checks.

## Navigation regression (Series view)

The raw sidebar button `data-view="series"` must also be registered in
`life-hub-v314dk.js` → `GROUPS.play` (the authoritative grouped desktop/mobile
menu). Otherwise `buildNav()` silently drops it, even though the HTML contains it.
The grouped menu and the mobile submenu must reach `#view-series`, with the
Series navigation button active. The series shelf must exist only inside `#view-series`;
Books/Library and Games retain their separate navigation views. Opening an episode
from a Daily pick or My Week activates the Series view and opens the same native
episode dialog. The existing Series library state, logs, IDs and rewards are not
migrated or reset by this navigation change.
