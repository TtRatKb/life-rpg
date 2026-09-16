# Life RPG — V0.31.4bx

## UI stability / image flicker fix

- Steam background sync no longer rebuilds the complete Games grid for every single game.
- Silently synced games refresh their card content in place while the existing cover image stays mounted.
- Steam background checks no longer bump the general game `updatedAt` timestamp, so the Smart shelf does not reshuffle simply because Steam was checked.
- Game cover images now include intrinsic width/height information, preventing temporary card-height collapse during image decode.
- Manual Steam sync keeps the normal full refresh behavior.

This targets the brief disappear/reappear + card-size "twitch" that could occur several times while automatic Steam sync processed multiple games.
