# Life RPG V0.31.4dz21 — Realm Skill Workbench

Base: V0.31.4dz20.

## Skill Tree becomes a training workbench
- Selecting a Realm now keeps the Talent Tree on the left and shows only that Realm's Skills in a dedicated right-hand rail on desktop.
- The rail automatically highlights the Skill closest to its next level, so the next attainable Talent Point is easier to see.
- Clicking a Skill opens its XP progress and training actions inline beside the Tree instead of forcing the user down to a separate all-Realm Skill grid.
- On smaller screens the Skill rail stacks underneath the active Tree.
- Dashboard Skill Momentum still uses the existing modal training guide; both surfaces share the same action registry.

## Training action language
Training routes are now visibly classified:
- `DIRECT · LIFE RPG`: the activity itself is completed/logged in Life RPG and can feed Skill XP automatically.
- `GUIDED / LOGGED`: Life RPG starts or records a real-world activity such as a focus block or work log.
- `LINKED`: opens the relevant Life RPG library/area for that kind of practice.

Every Realm has at least one direct/native or first-class Life RPG training route in the current user build:
- Work: Work Deep Brief / School Moments
- Knowledge: Sudoku, Nonogram, Number Sense, Memory Garden, Lexicon Lab, Takuzu
- Japanese: Kotoba Quick
- Health: Daily Check-in / Guided Stretch
- Recovery: Recovery Studio
- Home: Quick Home Action logging
- Hobbies: Drawing Studio / Palette Atelier

## Work + Kotoba linkage polish
- Work Deep Brief now contributes Skill XP to `Professional Organization` when its writing reward tiers are earned.
- Kotoba Dungeon is surfaced under Japanese Foundations; synchronized Dungeon reward events contribute to Japanese Foundations Skill XP.

## Preservation
- No Skill XP is deleted or redistributed.
- Existing Japanese split/migration remains unchanged.
- Talent purchases, Realm points, Journey Points, Habits and historic logs remain intact.
