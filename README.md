# Life RPG — V0.1 Prototype

This is the first local prototype of the Life RPG.

## What already works

- Sakura Base Camp home screen
- Character XP and level progression
- Story Energy and Sakura Coins
- Real-life character stats
- Fixed and variable-unit quests
- Diminishing Story Energy rewards per day
- Recovery/hobby quests count as valid progress
- Quest history is stored locally in the browser
- Narrative location-lock system
- Spoiler-safe opaque event/memory IDs
- Developer mode that exposes engine state but not story text
- Quick custom quest creation
- Responsive desktop/mobile UI

## Canon decisions already reflected

- Luca is a civilian teacher, not Kinergy and not a Pro Hero.
- Stats grow because the player actually does the corresponding real-world action.
- Affection is not purchased with productivity.
- Story choices will be free.
- Story Energy is only for unlocking substantial story content.
- Locations are intended to unlock through narrative introduction, not raw account level.
- Secret story content is deliberately not bundled into this prototype.

## Run it

Open `index.html` directly in a modern browser.

For the cleanest local testing, you can also run a tiny local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Local save

V0.1 uses `localStorage` only.

The next infrastructure milestone should be:

1. settle the daily loop and UI,
2. import real quest data,
3. add Firebase Authentication + cloud save,
4. add the private/spoiler-safe story content loader,
5. then add the first real social/story pack.

## Important spoiler-safe architecture rule

Narrative text should live outside the normal development-facing files later. The public app should refer to opaque IDs such as:

```text
KIRI_EVENT_014
BK_EVENT_021
GROUP_EVENT_008
```

Developer mode should validate conditions, costs, state writes and branch counts without rendering future scene text.
