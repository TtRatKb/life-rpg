# Life RPG V0.31.4bi — Asset Performance Foundation

## Runtime loading
- Story/location/sprite/coloring images are no longer install-time precache dependencies.
- The PWA shell now precaches code/data/app icons only; visual assets load on demand.
- Viewed visual assets are kept in a separate persistent runtime cache so revisiting them remains fast across normal app updates.
- Runtime image cache is bounded to 96 entries to prevent unbounded growth.

## Visual optimization
- Converted the 9 approved World Coverage master backgrounds to high-quality WebP runtime assets.
- Recompressed the 10 approved Mina Expansion sprites as high-quality transparent WebP.
- Added dedicated small thumbnails for all 9 new location backgrounds and all 10 Mina sprites. World/People/Phone cards therefore no longer need full-resolution art for tiny UI surfaces.
- Full-resolution VN/background assets remain available when actually shown in the story/world viewer.

## Asset policy going forward
- New illustrated backgrounds and sprites should ship as WebP unless a format-specific need requires otherwise.
- UI cards should use dedicated thumbnails rather than full-resolution art.
- Time-of-day, seasonal and weather variants must be lazy-loaded; they must never all be added to the PWA install-time shell.
- Changed mutable artwork should receive a new filename/versioned asset reference so the persistent image cache cannot serve an outdated visual.

## Scope
- No story prose, relationship state, rewards, simulation schedules, or user save schema changed in this pass.
