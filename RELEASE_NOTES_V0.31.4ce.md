# Life RPG V0.31.4ce — Drawing Studio V1

## New: Drawing Studio
Coloring Studio now unlocks a separate **Drawing Studio** companion without costing another Hobbies Talent point.

The first version contains three guided Drawing Quests:

1. **Confident Eyes · Trace Challenge**
   - Trace a pair of stylized anime eyes and brows.
   - Focus: line confidence and deliberate strokes.
   - Suggested time: 7 minutes.

2. **Mirror the Face · Half & Half**
   - One half of a stylized face is supplied as a guide.
   - Complete the missing half yourself.
   - Focus: proportion and symmetry.
   - Suggested time: 10 minutes.

3. **Smug Expression · Prompt Sketch**
   - Faint head-construction guides plus an expression prompt.
   - Focus: expression rather than polish.
   - Suggested time: 5 minutes.

## Studio features
- Standalone fullscreen Drawing Studio page.
- Pencil + eraser.
- Brush-size control.
- Adjustable guide/reference opacity.
- Undo / redo / clear.
- Optional challenge timer.
- Local autosave per challenge via IndexedDB.
- PNG export of the user's sketch without the guide layer.
- Non-judgmental completion reflection: easier than expected / about right / challenging, plus an optional note.

## Quest / reward integration
- Each starter challenge can award its practice reward once per local calendar day.
- Repeating a challenge on the same day is still allowed and saved, but does not farm additional rewards.
- Rewards are queued while in Drawing Studio and collected automatically when returning to Life RPG.
- Drawing completions award Hobbies Realm progress, Creativity capability progress, normal Life RPG rewards, and map into the **Creative Expression** skill.
- Drawing reward events appear through the normal Life RPG reward/activity systems.

## Navigation / Talent Tree
- Once Coloring Studio is unlocked, a permanent **✏️ Drawing** launcher appears next to the Coloring launcher.
- No second Talent point is required for Drawing Studio V1.
- The Hobbies Talent Tree copy now explains that Coloring Studio unlocks the companion Drawing Studio as well.

## Files in this delta
- `drawing-studio.html`
- `drawing-studio.css`
- `drawing-studio.js`
- `talent-reward-studios.js`
- `talent-tree-v2-graph.js`
- `skills.js`
- `index.html`
- `pwa.js`
- `service-worker.js`
- `RELEASE_NOTES_V0.31.4ce.md`
