# Life RPG — V0.31.4ag1

## Fix: Skills no longer carries Settings above it
The cause was a CSS specificity/order regression: `.settings-view-v6 { display: grid; }` appeared later than the global `.view { display: none; }` rule, so Settings stayed visible even when it was not the active view.

This patch changes Settings to use grid layout only while `.active`, and adds a defensive inactive rule. Opening Skills now shows only the Skills view.

## New: Recovery Talent Tree
Recovery now has a real Realm tree inside the existing Talent Tree tabs:
- Recovery Compass
- Breath Anchor
- Quiet Harbor
- Pattern Lantern
- Easy Entry
- Protected Pause
- Return Path
- Sanctuary

Existing Recovery Studio features remain available without talents. The tree only adds shortcuts, neutral history/insight, smart entry, and small first-practice Realm XP bonuses. No streak or missed-day penalty.

## Small Skills hub hardening
The Talent Tree tabs no longer use a hard-coded list of built Realms. A Realm is marked as built when a registered tree actually exists.
