# Life RPG V0.31.4ct — Meine Woche: Controls & Timer Hotfix

Delta over V0.31.4cs (also includes V0.31.4cr when cs was applied).

## Root cause
A boolean HTML attribute such as `data-week-open` maps to `dataset.weekOpen === ""`. The cs handler tested that value for truthiness, so the dashboard open button, stop & log, direct log editing link, and timetable edit link did nothing.

## Fix
- Boolean week action handlers use `hasAttribute()`; value-carrying actions still use their values.
- Separate **Stoppen & erfassen** from **Abbrechen · nicht erfassen**, also accessible for an active timer on the dashboard. Cancel calls the original confirmation-backed time.cancelActive and grants no rewards/time logs.
- Weekly work quick-start is a count-up clock, not a preconfigured Pomodoro; the visible clock uses seconds (mm:ss / hh:mm:ss). The existing canonical Time Tracking module still owns active sessions, logging, rewards and persistence.
- Updates the active timer display only when the active id changes; seconds update via textContent, preserving controls without once-per-second full HTML redraw.
- Dashboard stats/today cards only rebuild when the markup actually changes; avoids unnecessary unmounting on unrelated app renders.
- Index/SW/PWA assets bumped to ct to invalidate the cs cache.

Files: index.html, time.js, my-week.js, my-week.css, pwa.js, service-worker.js.
