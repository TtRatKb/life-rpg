# V0.31.4cs — Meine Woche (first playable version)

A single pastel week view that combines the existing canonical Time Tracking history, a versioned school timetable, planned meetings, and real-time work sessions.

## Included
- New permanent **Meine Woche** navigation destination and dashboard card.
- Monday–Sunday time-grid with pastel types, overlapping appointments displayed side-by-side, and next/previous/today navigation.
- Actual logged work totals and all logged minutes separated; planned blocks are not counted as worked or rewarded.
- A new timetable with category-specific default durations: lesson 45m, supervision 20m, GA 20m, lunch 35m. Add/edit/delete weekly slots.
- **Changes from date** clones the effective timetable to a new version; older weeks continue showing their original template. **New timetable** starts empty.
- One-off and repeating weekly meeting/event planning, optional repeat end date and per-occurrence cancellation/restore.
- One-click retrospective check-off for elapsed timetable blocks, with duplicate and overlap protection.
- Work actions for 50m lesson planning, 50m corrections, 30m school admin; finishing flows through the existing Time Tracking reward logic.
- Logged time from existing Focus & Time, including timed Quest actions, is displayed; untimed Quest and quick logs appear as timestamp chips with no invented duration.
- Work entries still editable under Focus & Time; exact rewards remain in Activity.
- Dashboard preview includes this week's work total, completion count and today's timetable with inline logging of elapsed slots.

## Architecture and safeguards
`weekPlanner` stores schedule templates, appointments and exception records in the existing app save. All actual time is stored in `timeTracking.entries` via `LifeRPGTime.logInterval`. No duplicate ledger or separate reward mechanism. There is no reward for simply planning a slot. The calendar renders only on view/navigation/data changes, not every timer tick; the live timer text updates in place. The original Time Tracking history is not migrated or deleted.

## Files
`index.html`, `time.js`, `my-week.js`, `my-week.css`, `service-worker.js`, `pwa.js`.

## Limitations of this first version
- A planned block is logged at its scheduled start/end; adjust a differing actual duration via Focus & Time afterward, or add a separate manual log.
- Changes to a plan are made on the selected version; to preserve an old half-year, create **Changes from date** first.
- The weekly calendar visualizes timestamped quick logs without inventing session durations. Untimed habit or journal items are left to Activity.
- No external Google Calendar sync, school holiday automation, or timetable import in this first version.
