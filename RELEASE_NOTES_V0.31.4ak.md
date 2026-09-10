# Life RPG — V0.31.4ak

## Story time-of-day backgrounds

The Story Reader now dynamically relights the same canonical location artwork according to Luca's real local time.

### Lighting states
- Dawn: 05:00–07:59
- Day: 08:00–16:59
- Sunset: 17:00–19:59
- Night: 20:00–04:59

School is deliberately fixed to Day lighting, even if a school scene is opened later.
Finished CG illustrations remain untouched.

Apartment/home, shared apartment, Koharu Café, station, city/district and gym backgrounds can all use the dynamic lighting grade. The resolver is also future-ready for true separate dawn/day/sunset/night art variants if matching assets are added later; until then the exact same canonical composition is relit at runtime.

## Mina Talk location variety

The generic Talk button on the People/Social page now considers the authored location of every eligible Talk, the real daypart and the location of the most recent interaction.

It does not rewrite a Talk into a different location. Instead, when multiple authored Mina Talks are eligible, evening/night Talk selection strongly prefers Café, district or other non-school contexts over teleporting back to school again.

World-map interactions remain deterministic: if Luca explicitly visits a location, the Talk there still uses that location.

## No story-content rewrite

No dialogue, choice, relationship flag, Story Energy cost or hidden story text was changed.
