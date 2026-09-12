# Life RPG V0.31.4bp — Solar Background Routing

- Audited background routing across all 46 current SP_003 scenes.
- Corrected SC_029 so the supermarket scene uses the actual grocery-store art.
- Wired the existing Koharu Café Dawn / Day / Sunset / Night family into Story Reader.
- Extended time-aware World-location art to Current Apartment, Station, Café and Collector District in addition to Shared Apartment rooms.
- Replaced fixed daypart boundaries with date-aware sunrise/sunset calculation. Saved weather-city coordinates are preferred; Europe/Berlin gets a non-precise seasonal fallback; legacy fixed hours remain only as the final fallback.
- Kept School fixed to daytime.
- Kept locations without true authored variants unchanged, in accordance with visual canon: no fake night/sunset overlays.
- Documented the remaining collector-shop/bookshop background gaps in `BACKGROUND_TIME_AUDIT_V0.31.4bp.md`.
