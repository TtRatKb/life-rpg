# Life RPG V0.31.4dz11 — Meal Plan Range Resize Preservation

## Fix
- Changing the number of days no longer switches to a different empty plan key.
- The existing plan is resized in place and re-keyed safely.
- Existing dishes stay on their original dates when the range grows or shrinks.
- Extending the range appends explicit open slots for newly visible uncovered days.
- Shrinking hides/removes only blocks that start outside the new range; a multi-day dish that starts inside the range keeps its real duration.
- Old plan aliases are removed before the resized plan is stored, so committed plans are not double-counted by cooldown logic.
- Covered-day summaries are clamped to the visible planning range.

## Safety
- No dish, history, rule, shopping, cloud-save, or browser-save data is cleared.
- Existing DZ10 tag aliases and cooldown behavior are preserved.
