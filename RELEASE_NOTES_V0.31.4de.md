# Life RPG V0.31.4de — Precise Focus Dock / verlässliche Zeiterfassung

**Baseline:** V0.31.4dd Companion Moments V2 over DC. One compact delta of complete replacement/new files; **do not replace `index.html` or `service-worker.js` with an older snapshot**. Before installing, export your real save; do not clear site data or Coloring Studio IndexedDB. Deploy online and reload online once so the existing network-first service worker can fetch the new files; subsequent network-first requests cache them.

## Usability

- A small warm-plum **floating Focus Dock** lives outside every app view in the main document, so it remains in sight across Dashboard, Journal, Story, My Week, etc. It shows a second-accurate clock, label, visibly paused/running status, pause/resume, stop & review, compact mode and drag-to-position. No per-second full-page rerenders.
- In idle state a subtle **Start Timer** launcher offers Lesson Planning, Corrections, Deep Work and School Admin from anywhere. Still only ONE canonical active timer; launching an additional one does not multiply the time.
- The same pause/resume controls appear in My Week and Life Rhythm. Legacy running timers are read from their original `startedAt`, not reset by this update.
- The Stop button **freezes the clock**, opens a review panel and shows precise recorded segments. `I actually finished N minutes ago` trims the end of the last session, e.g. a forgotten 30-min lunch at the end. An optional additional manual deduction covers an unlocated middle break and is explicitly documented rather than presented as a guessed clock interval. Resume / leave paused / save are separate actions.
- An optional small outside-browser mini-window: Document Picture-in-Picture where the browser supports it (Chrome/Edge), with controls. Unsupported browsers (including Safari) get a separate, resizable popup with pause/resume and stop; ordinary Safari windows cannot be guaranteed always-on-top. If popup is blocked, the in-app dock remains. Never claim a closed browser can send real-time alerts.
- User-click opt-in cycle for active-time reminders (45/30/60 minutes/off). With Notification permission and a running browser, a non-intrusive reminder can be sent while the Life RPG tab is hidden. Re-entering after 20+ minutes away also asks if the timer continued intentionally. No auto-pause on tab switch: real work frequently occurs elsewhere.

## Accounting

- New timer entries retain **actual `durationSeconds`, `precise: true`, disjoint `workIntervals`, and explicit `manualDeductionSeconds`** in canonical `timeTracking.entries`. Existing `minutes` and `durationSeconds` remain untouched for old entries. Actual `minutes` on new entries is fractional derived from seconds; no whole-minute rounding before accounting.
- Week view displays work and total time in `HH:MM:SS`. Paused gaps are not counted or drawn as active working blocks. Paused intervals do not falsely collide with an existing scheduled log. Real simultaneous working intervals still block duplicate recording. Existing auto school entries and their reward identities are unchanged.
- In the Time view the weekly Work figure and precise new log rows show seconds. Explicit editing of a segmented entry warns that replacing it manually will discard the segment history; it never happens silently.
- Uses the SAME canonical activity reward ledger. A timer is rewarded only ONCE on confirmed finish, never on pause/resume or planning; focus target checks use net work time. Active timers/segment data survive saves/reloads/cloud snapshots. Editing/canceling follows the existing safety pathways.

## Unchanged / limitations

- DD Companion V2 loader remains intact in `pwa.js`. No Story, Talk, Dream, Affection, My Week history, illness, planned events, Steam, cloud transport or Coloring Studio IndexedDB changes.
- No server-side push, automatic time capture when the computer itself sleeps, or guaranteed Safari always-on-top document overlay. Browser background timers may be throttled, but wall-clock/segment timestamps are authoritative on reopening. The user should review forgotten breaks before saving.
- This upgrade cannot retroactively recover seconds from already-saved rounded historical entries; it never fabricates that precision.

## Local QA

- Eight core runtime tests (legacy 45-min timetable, exact pause/resume, end adjustment, middle deduction, real overlap vs pause gap, legacy active timer, idempotent controls, save/reward isolation).
- Existing CU My Week browser regression suite: schedule creation, 85-min NEW default, exactly-once auto-log, sick/day-off retraction and restore, 24h quick-log suggestion, appointment and editor; no JS errors.
- Separate browser test: segmented week sum and two visual blocks with an unlocated deduction. Desktop Chrome test: floating dock, stop/review, corrected duration, one reward; mobile popup fallback, launch, pause/resume, stop, compact mode; no JS errors.
- JS syntax, archive CRC, full replacement members and DD PWA loader continuity checked. Real Safari/iPad, Document PiP on a supporting visible desktop, personal save + cloud-sync multi-device round-trip remain user-device tests.

## Files

`time.js`, `my-week.js`, `pwa.js`, `focus-dock.js`, `focus-dock.css`, and this release notes file. These files belong in the Life RPG app root. All modifications are complete files, not text snippets or patches.
