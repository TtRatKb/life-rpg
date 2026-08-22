(() => {
  "use strict";

  const PACK_URL = "content/SP_002.dat";
  const KEY = new TextEncoder().encode("LifeRPG-SP2-accidental-spoiler-shield-v2");
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

    const parsed = JSON.parse(new TextDecoder().decode(decoded));
    if (!parsed || parsed.packId !== "SP_002" || Number(parsed.schema || 0) < 2) {
      throw new Error("Story pack format is not supported.");
    }

    cache = parsed;
    return cache;
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function orderedScenes(pack) {
    return [...(pack?.scenes || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function sceneById(pack, sceneId) {
    return orderedScenes(pack).find(scene => scene.id === sceneId) || null;
  }

  function nextScene(pack, completedSceneIds = []) {
    const completed = new Set(completedSceneIds || []);
    return orderedScenes(pack).find(scene => !completed.has(scene.id)) || null;
  }

  function playableNodes(scene, conditionMatches = () => true) {
    return (scene?.nodes || []).filter(conditionMatches);
  }

  function beatCount(scene, conditionMatches = () => true) {
    return playableNodes(scene, conditionMatches).length;
  }

  window.LifeRPGStoryEngine = {
    loadPack,
    orderedScenes,
    sceneById,
    nextScene,
    playableNodes,
    beatCount
  };
})();
