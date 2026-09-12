# Life RPG V0.31.4bg — World Coverage Visual Integration

## Approved background integration
World Coverage Phase 1 is now integrated into runtime using the user-approved standalone backgrounds:
- Shared Apartment — Living Room
- Shared Apartment — Kitchen / Dining perspective of the same room
- DynaRiot Agency — Reception / Lobby
- Pro Hero Training Gym
- Koharu Café
- Neighborhood Konbini
- Neighborhood Supermarket
- Riverside Park
- School

## Runtime behavior
- Shared Apartment kitchen/dining scenes now select the dedicated kitchen perspective; living-room/general apartment scenes use the approved living-room perspective.
- Agency, Konbini, Grocery and Park no longer use generic city/gym fallback art.
- Atlas/location cards use the same approved background assets as Story Mode.
- The obsolete Shared Apartment and Café time-of-day art families are temporarily disabled so old low-quality variants cannot override the new approved master backgrounds. Real Morning / Day / Sunset / Night renders will be integrated later as true standalone assets.
- Existing station/city historical time variants are unchanged.

## Canon correction
- The training location is now described as a Pro Hero-only training gym rather than a DynaRiot-owned private gym. DynaRiot is still newly opened and uses a separate agency reception/office/meeting-space concept.

## Visual production rules reinforced
- One standalone background per asset; no contact sheets/collages as runtime art.
- Never crop/upscale panels from collages.
- No synthetic dark overlays as a substitute for authored time-of-day art.
- Environmental motivational slogans default to none; branding/signage should be sparse, functional and location-specific.

## Save compatibility
No save reset or progression migration is required. Story progress, social history, Steam tracking and relationship state are unchanged.
