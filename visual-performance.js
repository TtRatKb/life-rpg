(() => {
  "use strict";

  // UI-only thumbnail map. Full-resolution canon art remains untouched and is
  // still used by the VN/story reader and fullscreen location artwork.
  const THUMBNAILS = Object.freeze({
    'assets/story/portraits/luca_neutral.png': 'assets/ui/thumbs/characters/luca_neutral.webp',
    'assets/story/portraits/luca_soft_smile.png': 'assets/ui/thumbs/characters/luca_soft_smile.webp',
    'assets/story/portraits/luca_thinking.png': 'assets/ui/thumbs/characters/luca_thinking.webp',
    'assets/story/portraits/luca_warm.png': 'assets/ui/thumbs/characters/luca_warm.webp',
    'assets/story/portraits/luca_skeptical.png': 'assets/ui/thumbs/characters/luca_skeptical.webp',
    'assets/story/characters/kirishima-neutral.png': 'assets/ui/thumbs/characters/kirishima-neutral.webp',
    'assets/story/characters/kirishima-happy.png': 'assets/ui/thumbs/characters/kirishima-happy.webp',
    'assets/story/characters/kirishima-serious.png': 'assets/ui/thumbs/characters/kirishima-serious.webp',
    'assets/story/characters/bakugo-neutral.png': 'assets/ui/thumbs/characters/bakugo-neutral.webp',
    'assets/story/characters/bakugo-happy-soft-smirk.png': 'assets/ui/thumbs/characters/bakugo-happy-soft-smirk.webp',
    'assets/story/characters/bakugo-annoyed-mild.png': 'assets/ui/thumbs/characters/bakugo-annoyed-mild.webp',
    'assets/story/backgrounds/home_morning.png': 'assets/ui/thumbs/backgrounds/home_morning.webp',
    'assets/story/backgrounds/station_evening.png': 'assets/ui/thumbs/backgrounds/station_evening.webp',
    'assets/story/backgrounds/city_dusk.png': 'assets/ui/thumbs/backgrounds/city_dusk.webp',
    'assets/story/backgrounds/shared_apartment_living_room.webp': 'assets/ui/thumbs/backgrounds/shared_apartment_living_room.webp',
    'assets/story/backgrounds/shared_apartment_kitchen.webp': 'assets/ui/thumbs/backgrounds/shared_apartment_kitchen.webp',
    'assets/story/backgrounds/dynariot_agency_reception.webp': 'assets/ui/thumbs/backgrounds/dynariot_agency_reception.webp',
    'assets/story/backgrounds/gym_training_space.webp': 'assets/ui/thumbs/backgrounds/gym_training_space.webp',
    'assets/story/backgrounds/koharu_cafe.webp': 'assets/ui/thumbs/backgrounds/koharu_cafe.webp',
    'assets/story/backgrounds/konbini.webp': 'assets/ui/thumbs/backgrounds/konbini.webp',
    'assets/story/backgrounds/grocery_store.webp': 'assets/ui/thumbs/backgrounds/grocery_store.webp',
    'assets/story/backgrounds/riverside_park.webp': 'assets/ui/thumbs/backgrounds/riverside_park.webp',
    'assets/story/backgrounds/school_hallway.webp': 'assets/ui/thumbs/backgrounds/school_hallway.webp',
    'assets/story/sprites/mina_neutral.webp': 'assets/ui/thumbs/characters/mina_neutral.webp',
    'assets/story/sprites/mina_teasing.webp': 'assets/ui/thumbs/characters/mina_teasing.webp',
    'assets/story/sprites/mina_happy.webp': 'assets/ui/thumbs/characters/mina_happy.webp',
    'assets/story/sprites/mina_surprised.webp': 'assets/ui/thumbs/characters/mina_surprised.webp',
    'assets/story/sprites/mina_sassy.webp': 'assets/ui/thumbs/characters/mina_sassy.webp',
    'assets/story/sprites/mina_concerned.webp': 'assets/ui/thumbs/characters/mina_concerned.webp',
    'assets/story/sprites/mina_excited.webp': 'assets/ui/thumbs/characters/mina_excited.webp',
    'assets/story/sprites/mina_embarrassed.webp': 'assets/ui/thumbs/characters/mina_embarrassed.webp',
    'assets/story/sprites/mina_annoyed.webp': 'assets/ui/thumbs/characters/mina_annoyed.webp',
    'assets/story/sprites/mina_soft_sad.webp': 'assets/ui/thumbs/characters/mina_soft_sad.webp',
  });

  function thumbnail(src) {
    const key = String(src || "");
    return THUMBNAILS[key] || key;
  }

  window.LifeRPGVisuals = Object.freeze({ thumbnail, thumbnails: THUMBNAILS });
})();
