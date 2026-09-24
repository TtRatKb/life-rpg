# Life RPG V0.31.4cv — Daily Life & Motivation
Date: 2026-09-24
Base: user's V0.31.4cu (Meine Woche V2) full repository; install as a DELTA over CU or later compatible files, not as a standalone app.

## Included
- Shop: price confirmation at redemption and at the final real-world purchase. The actual amount is recorded separately from the original target; cheaper purchase refunds the difference, higher purchase charges only what is still due. An unaffordable current price cannot overspend, and canceling the dialog is lossless. Existing purchases/transactions are not rewritten. Shop schema 1 → 2 preserves existing item IDs, history and current wish.
- Today's Essentials: original Habit dashboard moved immediately below the hero; open habits remain visible, with a date-scoped 24-hour “Later” reminder, shown in-app on due/open/focus. It does NOT claim background push delivery when the app is closed. Existing habit items/completions preserved (schema 3 → 4).
- Daily Reward Checklist: read-only view of real current daily completions, including Daily Check-in, logic/training native activity bonuses, Daily Word, enabled Crossword, unlocked 365 Question Journal and unlocked daily logic puzzles. Opens the native activity instead of awarding anything through a second checkbox. Native practice availability and first-day completion are distinct.
- Next Milestone: switch between current Shop wish, next story-energy requirement (without future story spoilers), actual character XP level, and actual selected Skill XP. Uses the app's canonical quest reward preview for eligible quests and unclaimed native daily activities; Skill native suggestions are restricted to documented Skill mappings. Work-time links to Meine Woche and does not invent linear hourly payouts.
- Daily Plan: suppress duplicate calming-family suggestions (Body Scan/Meditation/Breathing/Grounding) inside one recommendation set, with custom-quest name/role fallback. Prefer actual fun reading/play on low-energy days where available, but keep gentle Recovery as a fallback. Preserve manual rerolls and real Skill routing; no duplicate reward stream.
- Soft cream/blush/plum responsive cards, no once-per-second full-dashboard repaint.

## Save and stability contract
NO saved data is included. Existing timetable versions, 45-minute lessons, time ledger, auto-work/sick-leave handling, reward event IDs, cloud saves, art, story, Steam, and nonogram are not replaced by this delta. Optional shop/habit fields are added on normalization; untouched state keys remain. Original price is kept as a separate historical field for future price edits. A save exported before installation is prudent.

## Changed/new complete files (11)
index.html, app.js, shop.js, habits.js, daily.js, data/quests.js, daily-life-v314cv.js (new), daily-life-v314cv.css (new), service-worker.js, pwa.js, this release note.

## QA scope / honest limits
Static syntax and DOM integrity, full-script headless Chromium startup in a mocked localStorage context, real Daily Plan low-energy pick, and browser integration against representative legacy shop/habit/week/time/reward state were exercised. Cheaper and higher confirmed price, final purchase refund, unaffordable decline, habit reminder notifies once, and non-mutating reward preview were tested. The complete user-specific save, live GitHub Pages service worker/cache, Safari/iPad gestures, and cross-device cloud synchronization cannot be verified in this local harness. Do not delete browser storage when updating.
