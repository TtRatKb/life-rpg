# Life RPG — V0.2

V0.2 is the first version where the daily loop starts to behave like the intended Life RPG rather than a static productivity dashboard.

## Changes from V0.1

- **Real Today's Loadout**
  - Quests can be added to / removed from today's loadout.
  - The Base Camp no longer just shows the first five quests.
- **Story-correct home state**
  - Luca starts in her current apartment.
  - The shared apartment is locked until a narrative flag introduces it.
  - This prevents the game UI from skipping the move-in / relationship premise.
- **More game-like Base Camp**
  - Character card, XP progress, home panel, social pulse, stats and daily loadout.
- **Quest Clear overlay**
  - Completing something now feels more like a game event.
- **Realm filters + quest search**
- **World screen**
  - Current home + school are known.
  - Future locations stay unknown until narrative introduction.
- **Social-state scaffold**
  - Contacts can unlock through hidden flags.
- **Spoiler-safe developer mode**
  - Includes simulation buttons for UI testing.
  - Uses opaque IDs / flags rather than future narrative text.
- **V0.1 local save migration**
  - Uses the same browser storage key, so existing XP / completions should carry forward.

## Important story rule reflected in code

Raw stat progression does **not** unlock story locations by itself.

For example:

```text
real workout -> Strength XP
```

does not automatically equal:

```text
Gym unlocked
```

The private story engine must first set a narrative flag such as:

```text
LOCATION_GYM_INTRODUCED
```

Then the location can become available.

## Files to upload to GitHub

Replace the files in the root of the `Life-RPG` repository with:

```text
index.html
styles.css
app.js
README.md
```

GitHub Pages will then update automatically after the new commit is deployed.

## Next milestones

1. Review the new Base Camp / daily loop.
2. Import the real quest library from the existing Life RPG data.
3. Define the exact Realm + Character Stat mapping.
4. Add the first **private spoiler-safe story pack**.
5. Add social Talk / Messages / Hangouts.
6. Add Firebase login + cloud save after the game loop feels right.
