# Life RPG V0.31.4aw — Shared Apartment Hub + Living World 2.0

## Shared Apartment Hub
- Turns the Dashboard Home Base into a live Shared Apartment hub after move-in.
- Bakugo and Kirishima can now be home, out, or taking private time independent of whether a scripted scene is currently waiting.
- Living Room, Kitchen, Luca's Room and Balcony are real hotspots with room-aware presence and available social actions.
- Opening a room filters Talks, Hangouts and World Moments to that space instead of treating the apartment as one undifferentiated location.
- Presence is deterministic for the current local date/daypart, so repeatedly reopening the app does not reroll who is home.

## Living World 2.0
- Adds 10 new repeatable Shared Apartment Talks and 14 new World Moments.
- Adds optional daypart constraints for social content so morning/night material appears at plausible times.
- New household moments can react to recent Work, Recovery, Home, reading and gaming activity as well as low-energy Daily Check-ins.
- Ambient household presence never requires interaction and never punishes the player for ignoring it.
- Existing first-Talk-per-day relationship progression and hidden long-term relationship rules remain unchanged.

## Story safety
- All new household content is gated by existing story flags and cannot reveal household intimacy before the relevant story phase.
- Fandom/rescue secrets remain unrevealed.
- No new canon CGs are exposed or claimed.

## Compatibility
- Continues using `SP_003`; all existing scene IDs and completed progress remain unchanged.
- Existing AV saves migrate without reset; the new hub derives its state from already-stored story flags.
