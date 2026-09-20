# Life RPG V0.31.4cq — Nonogram Unlimited Undo

## Nonogram Journey
- Adds a visible **↶ Undo** button next to **Clear this grid**.
- Every individual cell change is stored in an undo history.
- Undo can be pressed repeatedly all the way back to the untouched starting grid; there is no artificial undo-depth cap.
- **Clear this grid** is itself undoable as one step.
- Undo history is saved with the active Nonogram level, so reopening the current puzzle does not immediately lose the history.
- `Cmd+Z` / `Ctrl+Z` also triggers Nonogram Undo while the Nonogram puzzle is active.
- The puzzle status line shows how many undo steps are currently available.

Existing Nonogram progress, solved levels and rewards are unchanged.
