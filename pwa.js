(() => {
  "use strict";
  const VERSION = "0.31.4dk";
  const FOCUS_VERSION = "0.31.4de";
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  if (standalone) document.body.classList.add("is-standalone-v251");

  // Companion Moments V2 is an additive follow-up layer. Loading it here avoids
  // replacing the large current index.html solely to add two asset tags.
  const addCss = (href,id) => {
    if (document.getElementById(id)) return;
    const link=document.createElement("link");link.id=id;link.rel="stylesheet";link.href=href;document.head.appendChild(link);
  };
  const addScript = (src,id) => {
    if (document.getElementById(id) || window.LifeRPGCompanionMomentsV2) return;
    const script=document.createElement("script");script.id=id;script.src=src;script.async=false;script.onerror=()=>console.warn("Life RPG could not load Companion Moments V2");document.body.appendChild(script);
  };
  addCss(`./companion-moments-v2.css?v=0.31.4dd`,"lifeRpgCompanionV2Css");
  addScript(`./companion-moments-v2.js?v=0.31.4dd`,"lifeRpgCompanionV2Js");

  // The canonical Time engine is loaded by index.html. Only the persistent UI is
  // additive; do not load a second copy of time.js or create a competing clock.
  addCss(`./focus-dock.css?v=${FOCUS_VERSION}`,"lifeRpgFocusDockCss");
  if (!document.getElementById("lifeRpgFocusDockJs") && !window.LifeRPGFocusDock) {
    const timerScript=document.createElement("script");timerScript.id="lifeRpgFocusDockJs";
    timerScript.src=`./focus-dock.js?v=${FOCUS_VERSION}`;timerScript.async=false;
    timerScript.onerror=()=>console.warn("Life RPG could not load the persistent focus dock");
    document.body.appendChild(timerScript);
  }

  // Shared Apartment V2 is an additive home layer. Preserve the complete DE timer
  // loader and the earlier DD Companion loader; do not replace index.html or SW.
  addCss("./shared-apartment-v2.css?v=0.31.4df", "lifeRpgSharedApartmentV2Css");
  if (!document.getElementById("lifeRpgSharedApartmentV2Js") && !window.LifeRPGSharedApartmentV2) {
    const homeScript=document.createElement("script");homeScript.id="lifeRpgSharedApartmentV2Js";
    homeScript.src="./shared-apartment-v2.js?v=0.31.4df";homeScript.async=false;
    homeScript.onerror=()=>console.warn("Life RPG could not load Shared Apartment V2");
    document.body.appendChild(homeScript);
  }

  // DG: an additive game layer avoids replacing a much newer index.html with an
  // older snapshot. It augments the existing logic runtime instead of double-loading it.
  addCss("./logic-v3-enhancements.css?v=0.31.4dg", "lifeRpgLogicV3Css");
  if (!window.LifeRPGLogicV3Enhancements && !document.getElementById("lifeRpgLogicV3Js")) {
    const script=document.createElement("script");script.id="lifeRpgLogicV3Js";
    script.src="./logic-v3-enhancements.js?v=0.31.4dg";script.async=false;
    script.onerror=()=>console.warn("Life RPG could not load logic enhancements");
    document.body.appendChild(script);
  }
  addCss("./lexicon-arcade.css?v=0.31.4dg", "lifeRpgLexiconArcadeCss");
  if (!window.LifeRPGLexiconArcade && !document.getElementById("lifeRpgLexiconArcadeJs")) {
    const script=document.createElement("script");script.id="lifeRpgLexiconArcadeJs";
    script.src="./lexicon-arcade.js?v=0.31.4dg";script.async=false;
    script.onerror=()=>console.warn("Life RPG could not load Lexicon Arcade");
    document.body.appendChild(script);
  }

  // DI: guaranteed visible training entry, regardless of optional reward-bridge readiness.
  // The Training Grounds panel is a static DOM surface, unlike the hidden
  // integration detail panel used by DH. Never replace the current index.html.
  function addDungeonTrainingEntry() {
    const grid=document.querySelector('#trainingGroundsPanel .training-grounds-grid-v314k');
    if(!grid || document.getElementById('lifeRpgDungeonTrainingLink'))return;
    const a=document.createElement('a');
    a.id='lifeRpgDungeonTrainingLink';a.className='training-card-v314k is-live';
    a.target='_blank';a.rel='noopener';
    const url=new URL('https://ttratkb.github.io/kotoba-quest/dungeon.html');
    url.searchParams.set('lifeOrigin',location.origin);a.href=url.href;
    a.innerHTML='<span class="training-card-icon-v314k">⚔</span><div><small>JAPANESE · REPEATABLE</small><strong>Little Dungeon</strong><p>Japanisch üben, Monster besiegen und Siege in Life RPG einlösen.</p><em>Dungeon öffnen ↗</em></div><b>↗</b>';
    grid.appendChild(a);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addDungeonTrainingEntry,{once:true});
  else addDungeonTrainingEntry();
  window.addEventListener('life-rpg:render',addDungeonTrainingEntry);

  // DH: independent local Dungeon receipt bridge. The existing capped Kotoba SRS
  // bridge remains untouched and continues handling real reviews on its own.
  if (!window.LifeRPGKotobaDungeonBridge && !document.getElementById("lifeRpgDungeonBridgeJs")) {
    const dungeonScript=document.createElement("script");dungeonScript.id="lifeRpgDungeonBridgeJs";
    dungeonScript.src="./kotoba-dungeon-bridge.js?v=0.31.4dj";dungeonScript.async=false;
    dungeonScript.onerror=()=>{
      console.warn("Life RPG could not load Dungeon reward bridge");
      addDungeonTrainingEntry();
      const card=document.getElementById('lifeRpgDungeonTrainingLink');
      if(card){const label=card.querySelector('em');if(label)label.textContent='Dungeon öffnen · Reward-Bridge-Datei prüfen';}
    };
    document.body.appendChild(dungeonScript);
  }

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, {scope:"./",updateViaCache:"none"})
      .then(registration => registration.update?.())
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
