# Life RPG — V0.31.4ca

## Coloring Studio: painting fix + dedicated full-screen page

- Coloring Studio now opens as its own full-screen Life RPG page instead of inside the Talent/Reward dialog.
- The permanent bottom-navigation Coloring launcher and the Hobbies Talent action both route to the dedicated studio page.
- Fixed the Bakugo Trading Card line-art asset so its white background is transparent. Color strokes are now visible underneath the black line art again.
- The editor canvas now uses the card's true 1122×1402 dimensions, so brush coordinates line up with the artwork.
- Existing old 1024×1365 stroke records are migrated/scaled when loaded.
- Color wheel, brightness, HEX color input, quick colors, brush size, eraser, undo/redo, autosave, clear, finished state, and PNG export are available on the full-screen page.
- Asset cache version bumped so browsers/PWA installs do not keep serving the previous opaque coloring image.

## Added
- `coloring-studio.html`
- `coloring-studio.css`
- `coloring-studio.js`

## Updated
- `talent-reward-studios.js`
- `assets/coloring/bakugo-trading-card-line.png`
- `index.html`
- `pwa.js`
- `service-worker.js`
