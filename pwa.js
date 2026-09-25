(() => {
  "use strict";
  const VERSION = "0.31.4de";
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
  addCss(`./focus-dock.css?v=${VERSION}`,"lifeRpgFocusDockCss");
  if (!document.getElementById("lifeRpgFocusDockJs") && !window.LifeRPGFocusDock) {
    const timerScript=document.createElement("script");timerScript.id="lifeRpgFocusDockJs";
    timerScript.src=`./focus-dock.js?v=${VERSION}`;timerScript.async=false;
    timerScript.onerror=()=>console.warn("Life RPG could not load the persistent focus dock");
    document.body.appendChild(timerScript);
  }

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, {scope:"./",updateViaCache:"none"})
      .then(registration => registration.update?.())
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
