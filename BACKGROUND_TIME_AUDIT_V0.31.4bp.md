# Life RPG V0.31.4bp — Background + Solar Time Audit

## Scope
Audited all 46 SP_003 story scenes, all declared runtime background keys, existing true time-of-day assets, location routing, the Story Reader resolver and the World-location hero art resolver.

## Corrections made
- **SC_029 · Three-Body Problem** now uses the real `grocery` / Neighborhood Supermarket background while Luca, Bakugo and Kirishima are actually shopping. The walk home returns to the city/district family; the final beat returns to the shared apartment.
- `bookstore` / `bookshop` no longer infer to Koharu Café. Collector/bookshop contexts fall back to the Collector District family when no dedicated interior exists.
- Koharu Café's already-present true Dawn / Day / Sunset / Night images are now actually wired into Story Reader runtime selection.
- World-location art now uses true time families for **Current Apartment, Station, Koharu Café, Collector District and Shared Apartment** (living room + kitchen), rather than only the shared apartment.

## Sunrise / sunset behavior
The old hard-coded 05:00 / 08:00 / 17:00 / 20:00 split is no longer the primary clock. Runtime daypart is now calculated from actual solar sunrise/sunset for the current date.

Priority for coordinates:
1. Saved coordinates from the existing Story/Phone weather city setting, when available.
2. If the browser timezone is `Europe/Berlin`, a non-precise Berlin/central-Germany representative coordinate is used as a seasonal solar fallback.
3. On unsupported timezones with no saved coordinates, the former fixed clock windows remain as a safe fallback.

Lighting windows are centered around the calculated sunrise and sunset (±75 minutes), so Dawn/Sunset shift naturally across the year instead of changing at fixed clock hours.

## True authored families currently used
- Luca's current apartment: Dawn / Day / Sunset / Night
- Train station: Dawn / Day / Sunset / Night
- City / Collector District: Dawn / Day / Sunset / Night
- Koharu Café: Dawn / Day / Sunset / Night
- Shared Apartment living room: Dawn / Day / Sunset / Night
- Shared Apartment kitchen/dining: Dawn / Day / Sunset / Night

School remains deliberately fixed to its authored daytime art.

## Locations without authored time variants
Per visual canon, these remain on their canonical standalone art rather than receiving fake tint/darkness overlays:
- DynaRiot Agency
- Pro Hero Training Gym
- Neighborhood Konbini
- Neighborhood Supermarket
- Riverside Park

This preserves the rule that time-of-day art must be authored rather than simulated with a global filter.

## Remaining visual-location gaps
- **SC_006 · Collector's Damage** takes place largely inside collector shops, but there is currently no dedicated collector-shop interior; the Collector District family remains the closest approved background.
- **SC_045 · Wrong Place, Right Shelf** begins inside a bookshop, but there is no approved bookshop interior; it therefore still uses the Collector District family.
- Scenes at DynaRiot / Riverside Park / other static locations cannot show a genuine night or sunset change until those standalone authored variants are produced.

No fake collage crops or time-of-day overlays were introduced.
