# Life RPG — V0.31.4by

## App-wide image flicker / card twitch fix

The previous Games-only patch reduced Steam-grid redraws, but background Steam persistence still broadcast normal global state/game-change events. Those events caused Daily/Dashboard and other subscribed views to rebuild their image markup repeatedly while a multi-game Steam background sync was running.

### Changed
- Background `render:false` game/Steam persistence is now a **quiet UI save**.
- Quiet saves still persist locally and still queue Cloud Save.
- Quiet saves no longer broadcast the normal `life-rpg:state-saved` UI event.
- Quiet game saves no longer broadcast `life-rpg:game-change` for every Steam metadata step.
- Cloud Save now listens to the dedicated `life-rpg:state-persisted` event, so cloud reliability is unchanged.
- Normal user-facing saves still broadcast the existing UI events as before.

### Expected result
Dashboard companion/reference images and other image-card views should no longer disappear for a split second or collapse/re-expand repeatedly during background Steam synchronization.
