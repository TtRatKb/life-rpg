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
    'assets/story/sprites/mina_neutral.png': 'assets/ui/thumbs/characters/mina_neutral.webp',
    'assets/story/sprites/mina_excited.png': 'assets/ui/thumbs/characters/mina_excited.webp',
    'assets/story/sprites/mina_teasing.png': 'assets/ui/thumbs/characters/mina_teasing.webp',
    'assets/story/sprites/mina_curious.png': 'assets/ui/thumbs/characters/mina_curious.webp',
    'assets/story/characters/kirishima-neutral.png': 'assets/ui/thumbs/characters/kirishima-neutral.webp',
    'assets/story/characters/kirishima-happy.png': 'assets/ui/thumbs/characters/kirishima-happy.webp',
    'assets/story/characters/kirishima-serious.png': 'assets/ui/thumbs/characters/kirishima-serious.webp',
    'assets/story/characters/bakugo-neutral.png': 'assets/ui/thumbs/characters/bakugo-neutral.webp',
    'assets/story/characters/bakugo-happy-soft-smirk.png': 'assets/ui/thumbs/characters/bakugo-happy-soft-smirk.webp',
    'assets/story/characters/bakugo-annoyed-mild.png': 'assets/ui/thumbs/characters/bakugo-annoyed-mild.webp',
    'assets/story/backgrounds/home_morning.png': 'assets/ui/thumbs/backgrounds/home_morning.webp',
    'assets/story/backgrounds/school_hallway.png': 'assets/ui/thumbs/backgrounds/school_hallway.webp',
    'assets/story/backgrounds/station_evening.png': 'assets/ui/thumbs/backgrounds/station_evening.webp',
    'assets/story/backgrounds/shared_apartment_evening.png': 'assets/ui/thumbs/backgrounds/shared_apartment_evening.webp',
    'assets/story/backgrounds/city_dusk.png': 'assets/ui/thumbs/backgrounds/city_dusk.webp',
    'assets/story/backgrounds/gym_training_space.png': 'assets/ui/thumbs/backgrounds/gym_training_space.webp',
    'assets/story/backgrounds/koharu_cafe.png': 'assets/ui/thumbs/backgrounds/koharu_cafe.webp',
  });

  function thumbnail(src) {
    const key = String(src || "");
    return THUMBNAILS[key] || key;
  }

  window.LifeRPGVisuals = Object.freeze({ thumbnail, thumbnails: THUMBNAILS });
})();
