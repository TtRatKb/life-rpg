# Life RPG V0.31.4dz19 — Collapsible Chrome + Creative Canvas Focus

## Why
Coloring Studio and Drawing Studio need as much canvas room as possible. The fixed Life RPG navigation rail and top resource bar were useful elsewhere, but unnecessary while actively painting or drawing.

## New: persistent collapsible desktop navigation
- The desktop Life RPG sidebar now has a compact toggle in the top bar.
- Expanded → compact icon rail without leaving the current page.
- Compact → expanded whenever full labels are useful again.
- The preference is stored locally as a tiny UI preference and survives reloads.
- Tablet already uses the compact rail and mobile keeps its existing bottom navigation, so those layouts are not disrupted.
- Collapsed icons keep accessible labels/tooltips.

## New: Coloring / Drawing Canvas Focus
- Opening an actual Coloring or Drawing project automatically enters Canvas Focus.
- Canvas Focus hides the **outer Life RPG sidebar and top bar** and expands the editor to almost the full viewport.
- A compact button directly above the studio toggles between:
  - `☰ Navigation zeigen`
  - `⛶ Canvas-Fokus`
- Returning to the studio gallery or leaving the studio restores the normal Life RPG chrome.
- The user's persistent global sidebar preference is preserved; Canvas Focus is only a temporary editor state.
- Studio-native controls (color tools, brushes, references, etc.) are not hidden by this feature.

## Preservation
- No save schema change.
- No reward/progression changes.
- No painting or drawing storage migration.
- No changes to Coloring card IDs, IndexedDB painting keys, Drawing challenge IDs, or canvas data.
