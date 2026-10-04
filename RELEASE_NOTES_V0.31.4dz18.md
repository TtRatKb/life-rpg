# Life RPG V0.31.4dz18 — Dashboard Density + Navigation Fix

## Why
DZ17 moved the dashboard in the right direction but still prioritized secondary cards too strongly, and a CSS regression made the Dashboard remain visible underneath/alongside other app views.

## Fixed
- Dashboard visibility regression: `view-basecamp` is now strictly hidden whenever it is not the active view.
- Daily Reward Checklist and Today's Habits are now the first full dashboard row below the compact greeting.
- Plan for Today is moved directly beneath them and rendered as a denser three-column action row on desktop.
- Daily Briefing, Skill Momentum and Current Wish share one compact progress row.
- Greeting/character header is substantially shorter while keeping Character XP and Journey Point progress visible.
- `Meine Woche`, Shared Apartment, Life around me and Quick Log are intentionally demoted to a small utility row near the bottom.
- Secondary dashboard-only explanatory copy is reduced/hidden; underlying systems and data are unchanged.

## Preservation
- No save migration.
- No reward/economy changes.
- No Skill XP/Talent Point changes.
- No Story/relationship changes.
- Existing dashboard renderer IDs and event anchors are moved rather than cloned so existing modules keep working.
