# Life RPG — V0.31.4al

## True time-of-day story backgrounds

V0.31.4ak proved the routing logic, but the visual filter approach made the whole scene look dim instead of making the location genuinely exist at night. This release replaces that fake recoloring for the main recurring environments with real generated image variants.

### Real four-part background families
Each of these now has separate Dawn / Day / Sunset / Night artwork:
- Koharu Café
- Shared apartment
- Luca's own home
- Train station
- City / district streets

The night Café is intentionally brighter inside: dark exterior city light, but warm pendant lamps, counter lighting and pastry-case lighting make it read as open and cozy.

### School
School remains its existing bright daytime background only.

### Other backgrounds
Locations without a dedicated true-time family keep their canonical source image unchanged. They are no longer globally darkened by CSS.

### Runtime selection
- Dawn: 05:00–07:59
- Day: 08:00–16:59
- Sunset: 17:00–19:59
- Night: 20:00–04:59

The same story scene can therefore render the appropriate real image according to local time without changing story content or save state.

### Technical
- New backgrounds are 1920×1080 WebP runtime assets.
- Story prefetch automatically resolves the same variant path that the active reader uses.
- Assets cache on first use through the existing service-worker image strategy.
- CG art remains untouched.
