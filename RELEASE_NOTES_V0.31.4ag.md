# Life RPG V0.31.4ag — Stability Repair

This is a regression-repair delta for the current Life RPG build. Upload these files over the existing repository files.

## Fixed

- Local-save quota failures no longer crash the running UI. Legacy duplicate shadow saves are reclaimed and the cloud fingerprint is stored as a compact hash instead of another full save copy.
- Cloud/local persistence payloads omit reconstructible Skill-event history and compact Steam achievement baseline metadata to reduce save size without deleting canonical progress logs.
- Journal `Save & Done` is stable again. Gratitude, Small Win and Hard Thing each use independent 50 / 150 / 300 / 600 / 1000-character reward progress, with idempotent reward events.
- A guarded one-time repair can restore missed independent writing tiers for an affected current entry created/edited after the independent-journal migration, without blanket retroactive payout of old writing.
- Activity Log now aggregates independent journal writing rewards correctly instead of showing only the old base reflection reward.
- Steam Spoiler Shield settings have an explicit Save button as well as autosave, and each game exposes its existing per-game spoiler override.
- Skills/progression modules load in deterministic static order rather than through the fragile dynamic PWA loader.
- Skills Hub remains compact: one Talent Tree at a time, Realm tabs, all Skills visible, Recent Skill XP collapsed.
- Knowledge, Health and Work Talent Trees register into the shared Talent Hub without changing their existing purchases, point banks, respec or bonus rules.
- Training Grounds navigation anchor restored.

## Regression checks performed

- `node --check` passed for all JavaScript files in the repaired build.
- Browser/DOM smoke checks initialized LifeRPGApp, Skills, Journal, Lexicon Lab, Sudoku, Nonogram, Number Sense, Memory Garden and Recovery Studio together without page exceptions.
- Lexicon calibration: five rating cards were clickable, a full batch could be classified, and Continue/Next became available.
- Journal: a 1027-character single reflection produced all five independent depth tiers in the fresh-state smoke test; Day Editor submit closed and persisted.
- Steam: global spoiler mode persisted through Save settings; per-game override persisted in a test game.
- Training Grounds dialogs opened for Sudoku, Nonogram, Number Sense, Memory Garden and Recovery Studio.
- Quota recovery was tested with deliberately oversized legacy local-storage metadata/shadows; startup recovered and removed redundant copies without killing app initialization.

## Note about cloud sync

The quota-recovery and cloud-payload logic were audited and browser-smoke-tested locally. A real external Firebase write was not performed in the test environment, so the first live sync remains the final integration check.
