# Life RPG V0.31.4cp — Reference Workspace Fix

## Why this patch exists
The CO reference sets could show broken images. The main reason was the way the web references were requested: the overlay script forced anonymous CORS loading and used redirect-style Wikimedia URLs. That is unnecessary for a normal `<img>` and can make otherwise displayable images fail.

## Reference loading
- Removed forced `crossOrigin = "anonymous"` from practice-reference images.
- The Hands and JookpubStock Conversation sets now use stable direct `upload.wikimedia.org` file URLs instead of `Special:Redirect` URLs wherever the exact file is known.
- Added a second load attempt for redirect-based references.
- Broken references now get a readable fallback card instead of only the browser's broken-image icon.
- Existing source + license attribution remains visible in the Reference dock.

## Procreate-style reference display
The fixed right-hand Reference dock remains the control center. The selected reference can now be displayed in three explicit modes:

1. **Dock** — reference stays in the permanent side dock.
2. **Canvas window** — reference appears as a small floating window *inside the drawing canvas area*.
   - drag it by the header;
   - resize it from the bottom-right handle;
   - it stays in screen space while the drawing canvas itself is panned/zoomed;
   - pointer input on the reference window never draws on the canvas.
3. **Underlay** — reference is placed behind the drawing canvas as a faint construction/tracing aid.
   - starts at 20% opacity;
   - adjustable with the Reference opacity slider;
   - is not baked into the drawing layer.

Canvas window and Underlay are mutually exclusive, so switching modes is predictable.

## Sources currently used by these packs
- Umang Thapa / Umangzart — `Character Hand Drawing Reference Umangzart.jpg` — CC BY-SA 4.0.
- Shiva Theerthagiri — `Hand pose illustration.jpg` — CC BY 4.0.
- Wellcome Collection — `24 hand gestures, Chirologia` — CC BY 4.0.
- JookpubStock Conversation series — CC BY 3.0.

## Files
- `drawing-studio.html`
- `drawing-reference-packs-v3.js`
- `drawing-reference-workspace-v2.js`
- `drawing-reference-workspace-v2.css`
- `index.html`
- `RELEASE_NOTES_V0.31.4cp.md`
