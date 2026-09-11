# Life RPG — V0.31.4am1

## Daily Crossword runtime repair

Fixes the exact failure where:
1. Start Daily Crossword changed to Resume Daily Crossword.
2. Resume closed the Lexicon Lab dialog but no fullscreen Crossword appeared.
3. Lexicon Lab then appeared dead/unopenable.

### Root cause
The adaptive puzzle had already been generated and saved successfully. Rendering its header then called an undefined helper named `number(...)`, throwing a ReferenceError. Because the save happened first, the UI changed to Resume. On the second click the modal closed before the same render error occurred, leaving the fullscreen focus surface unopened.

### Fixes
- Replaced the invalid helper call with safe numeric formatting.
- Fullscreen focus entry now renders first and closes the Lexicon Lab modal only after the focus surface successfully accepts the puzzle.
- Start/Resume now returns failure instead of pretending success if focus entry fails.
- Daily in-progress cell values, misses and hint state are mirrored into the saved Daily Crossword record whenever the puzzle saves.

### Generator
The adaptive generator is kept. The failure was not in puzzle generation; it was a display-time ReferenceError after generation.
