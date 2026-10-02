# Life RPG V0.31.4dz7 — Meal Planner Full Page

## Changed

- Moves the Meal Planner out of the Dashboard / Home Base card.
- Adds **Essensplan 🍲** as its own full Life RPG view in the **ALLTAG** navigation section.
- Week, Dishes, Shopping and Rules now use the full app content area instead of a modal.
- Dish editing and compatible swaps remain inside the Meal Planner page flow rather than opening the main planner as a dialog.
- Removes the old Home Base Meal Planner entry to avoid duplicate entry points.

## Data safety

- No Meal Planner state keys or IDs were changed.
- Existing dishes, plans, ingredients, restock checks, cooldowns and tag rules from V0.31.4dz6 continue to load unchanged.
- No browser data, Coloring data, save history, rewards or cloud-save format is cleared or reset.

## Install

Copy the complete files in this delta over **V0.31.4dz6** (or later cumulative local state that already contains dz6), then reload once so the service worker picks up the dz7 cache.
