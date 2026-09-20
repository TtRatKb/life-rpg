# Life RPG — V0.31.4cr

## System stability + app-wide flicker pass

- Removed the once-per-second full DOM rebuild of the active Rhythm timer card.
- Live timers now make minimal in-place updates and skip hidden timer surfaces.
- Added paint/layout containment around ticking timer widgets.
- Repaired a malformed serialized CSS block in `styles.css`.
- Synchronized PWA/service-worker/index cache versions and flushed the old asset cache.
- Corrected stale Nonogram and standalone Studio precache versions.
- Removed a missing Coloring Studio image candidate that caused unnecessary failed requests.
- Reduced Recovery Studio 250 ms DOM replacement churn.
- Performed full static syntax/reference/version audit of the uploaded repository.

See `SYSTEM_AUDIT_V0.31.4cr.md` for details.
