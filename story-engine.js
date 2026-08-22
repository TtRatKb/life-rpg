(() => {
  "use strict";

  const PACK_URL = "content/SP_001.dat";
  const KEY = new TextEncoder().encode("LifeRPG-SP1-accidental-spoiler-shield");
  let cache = null;

  async function loadPack() {
    if (cache) return cache;

    const response = await fetch(PACK_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Story pack failed to load (${response.status})`);
    }

    const encoded = (await response.text()).trim();
    const encrypted = base64ToBytes(encoded);
    const decoded = new Uint8Array(encrypted.length);

    for (let i = 0; i < encrypted.length; i += 1) {
      decoded[i] = encrypted[i] ^ KEY[i % KEY.length];
    }

    cache = JSON.parse(new TextDecoder().decode(decoded));
    return cache;
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function sceneById(pack, sceneId) {
    return pack?.scenes?.find(scene => scene.id === sceneId) || null;
  }

  function orderedScenes(pack) {
    return [...(pack?.scenes || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function nextScene(pack, completedSceneIds = []) {
    const completed = new Set(completedSceneIds || []);
    return orderedScenes(pack).find(scene => !completed.has(scene.id)) || null;
  }

  function memoryBySceneId(pack, sceneId) {
    return sceneById(pack, sceneId)?.memory || null;
  }

  window.LifeRPGStoryEngine = {
    loadPack,
    sceneById,
    orderedScenes,
    nextScene,
    memoryBySceneId
  };
})();
