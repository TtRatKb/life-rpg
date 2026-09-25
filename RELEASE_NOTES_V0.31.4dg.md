# Life RPG V0.31.4dg — Logic Fullscreen & Lexicon Arcade

**Base:** V0.31.4df (Shared Apartment V2, Focus Dock DE, Companion Moments DD, existing DC social notifications). This is a compact **additive delta**, not a full repository. Copy only the files in this ZIP into the repository root. Export the current normal Save first. Never delete website data or Coloring Studio IndexedDB to refresh an update.

## Logic games usability

- Slitherlink, Nurikabe and Kakuro now use a **full-viewport in-app dialog** on desktop and mobile/iPad (not OS Fullscreen). Existing puzzle banks, played boards, Daily/Practice mode, original rewards and unlocks remain untouched.
- Slitherlink: left mouse click uses the selected line/× tool, right click marks ×; clicking the same mark again erases it. Nurikabe: selected wall/island tool on left click, right click marks island; repeat-click erases. On touch/Pencil devices, explicit, accessible toolbar buttons replace dependence on right click.
- Kakuro: selecting a cell shows the intersecting horizontal and vertical sums plus **deduced candidate digits** consistent with current entries, excluding duplicates and impossible sums. "Find a forced digit" only fills a mathematically determined candidate. "Reveal one valid digit" solves current constraints and exposes one compatible entry; when existing numbers contradict the sums it refuses to guess. Assisted cells persist alongside normal Kakuro values, without a second reward path. The 12 original puzzles have all been solved by the hint algorithm in local tests.
- The enhancement module wraps the existing logic runtime without loading another copy of `logic-expansion.js`; it does not replace an older index.html or service-worker.js and therefore does not revert the Focus Dock, Social Delivery, Stories, or Apartment work.

## Lexicon Arcade · authentic source pool

- New **ranked permanent Knowledge Talent node** following Slitherlink. Four actual small games, using the same **300 pre-existing Fachwörter**, definitions, examples, existing personal `lexiconLab.words` ratings and recall records. No generic substitute list or user-managed import is invented.
- Rank I (1 point): **Term Match** (term → definition) and **Definition Detective** (definition → term).
- Rank II (1 point): **Context Choice** (choose the term missing from one of the real example sentences).
- Rank III (1 point): **Active Recall** (type the word; reveal when stuck; then optionally write your own sentence and save it). Own-sentence semantics are **not automatically assessed**; the stored sentence is for personal comparison with the given example.
- Lexicon Lab gains a direct launcher next to the existing Crossword area; the new game card also appears in Training Grounds. The purchased Talent opens the suite directly. Five cards per round, deterministic Daily + unlimited Practice. Encountered, unfamiliar and often-missed terms are preferentially selected; crosswords see the same word-profile updates.
- A word can credit at most **one new Arcade recall per calendar day**, even when played through several modes. No artificial acceleration to Mastered from repeating the same answer in one session.
- A completed Daily grants a modest once-per-game Daily reward. Across all four games, at most two small Practice rewards per day. Replay does not repeat a payment. Rewards reuse the existing `lexicon-lab-complete` skill stream, with distinct `arcade:*` source IDs and original reward-ledger idempotency.

## Data/canon preservation

- Additive top-level `lexiconArcade` save state only. Authored Lexicon profiles get normal encounter/miss/recall increments, while self-ratings are preserved. The Talent node is registered in the current live graph at runtime; its purchase uses the existing graph point accounting, unlock persistence and refund/respec rules.
- Existing `logicExpansion` boards/Daily rewards, old Lexicon crosswords/ratings, all other Talents, My Week, Focus Dock, Story, Talks, Companion Moments, Social Delivery, Steam and Coloring data are not reset.
- Only six complete files are changed/added: the up-to-date cumulative `pwa.js`, two additive logic enhancement files, two Lexicon Arcade files, and these release notes. **Do not replace current `index.html`, `service-worker.js`, `logic-expansion.js` or `talent-tree-v2-graph.js` with older snapshots.**

## Local verification and limitations

- Chromium mock UI: actual original logic runtime plus live Knowledge graph; full desktop viewport (1280×800), mobile viewport (390×844), Slitherlink/Nurikabe mouse/touch tools, Kakuro candidates/reveal, 3 rank purchases, four Arcade modes, Daily/Practice reward caps, profile reuse and no unexpected JS page errors.
- Original 12 Kakuro bank grids all solved by the constraints algorithm (14–87ms in local headless Chromium under the test fixtures); this does not mean human gameplay is automatically solved. Existing `Kakuro` board remains optional and can always be skipped in favor of other games.
- Full personal Save, Safari/iPad mouse/trackpad gesture behavior, cross-device Cloud Save and deployed PWA cache upgrade must still be checked on the user's real device. The overlay works with the original logic game code (AR interface), which has not been replaced by later releases in the supplied repository; a future base change should be verified against the new module.
