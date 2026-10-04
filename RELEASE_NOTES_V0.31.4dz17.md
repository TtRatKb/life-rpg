# Life RPG V0.31.4dz17 — Dashboard V2 · Today First + Skill Momentum

## Why
The Dashboard had become a long feature index: unlocked-content library, milestone estimator, multiple Living World cards, wide quick-log/week panels, tracked achievement, Todoist card and an abstract Growth preview. The important questions — “What should I do today?” and “Which Skill can I level next?” — were too easy to lose.

## Dashboard hierarchy
- `Plan for Today` now occupies the primary dashboard column directly below the hero.
- `What kind of day is this?` moves into the compact side column.
- `Current Wish` stays compact in the side column.
- Tracked Achievement, Next Milestone, External Task and the old abstract Growth preview no longer occupy Dashboard space.
- The large `Unlocked Content` wall is removed from Dashboard. It now lives as a collapsed safety library directly below the Realm Talent Trees on the Skills page; native content still opens from its real home (Journal, Training Grounds, Studios, etc.).
- `Later moments` remains available through its story/home systems but no longer gets its own Dashboard card.

## Compact daily utilities
`Schnell loggen`, `Meine Woche`, `Shared Apartment` and `Life around me` now share one compact utility grid rather than each taking a full-width row.

`Life around me` consolidates the Dashboard’s social signals:
- unread phone messages;
- a delivered conversation / little moment;
- an available ordinary Living World moment.
The old large `Little signs of life` and `Something ordinary, something yours` Dashboard cards stay hidden, while their underlying delivery systems and navigation badges remain active.

## Skill Momentum
A new compact Dashboard card shows the four Skills currently closest to another level / Talent Point.
Each row shows:
- Realm;
- Skill level;
- progress bar;
- exact Skill XP still needed;
- Talent Point gain at the next Skill level.

Realm Talent Points that are already available are surfaced as small chips. Clicking a Skill opens a compact “Ways to train this” sheet with real existing Life RPG actions such as Sudoku, Nonogram, Number Sense, Memory Garden, Lexicon Lab, Kotoba Quick, Recovery Studio, Games, Library, Journal, My Week, Habits, Adventures, Quick Log and the Creative Studios.

## Character XP now has a purpose
Every 5 Character Levels permanently earns one **Journey Point**.
- A Journey Point can be assigned by the player to any Realm Talent Tree.
- Existing levels are grandfathered as earned but remain **unassigned** until the player chooses a Realm; no tree changes automatically during migration.
- Assignment adds exactly one point through the existing `skills.realmBonusPoints` mechanism.
- Earned milestone levels stay permanent even if later reward corrections reduce current Character XP.
- Dashboard Character XP now shows either unassigned Journey Points or the next Character milestone and remaining XP.

For a Level-19 save this means Lv. 5 / 10 / 15 are recognized as three unassigned Journey Points; Lv. 20 becomes the next Character reward.

## Preservation
No historical activity, Skill XP, Talent Tree purchase, Story progress, Coin balance, Story Energy, Room/World state, existing unlocked content, Todoist integration or Achievement data is deleted. Retired Dashboard panels are only removed from the Dashboard presentation.
