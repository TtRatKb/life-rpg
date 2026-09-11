# Life RPG V0.31.4au — Dashboard Focus Pass

## What changed
- Removed the redundant Dashboard quick-navigation wall; Sidebar / mobile navigation remain the navigation layer.
- Promoted Daily Briefing + **Plan for Today** to the primary Dashboard work area.
- Rebuilt Dashboard Habits as a compact quick logger with an actual **Today / Yesterday** switch and correct-date backfill.
- Compressed tracked Achievements and Current Wish into small supporting cards.
- Compressed Home Base, Life Around Me, External Task and Growth into a low-height at-a-glance row.
- Preserved existing IDs/state hooks so current saves, Daily Plan, Habit history, Shop, Achievements, Social and Home rendering continue to use the same underlying systems.
- Updated PWA cache/versioning so the Dashboard and Habit changes are not masked by an older service-worker cache.

## Save compatibility
No save-schema migration is required. This pass changes Dashboard presentation and date-aware Habit rendering only.
