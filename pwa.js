(() => {
  "use strict";

  const VERSION = "0.31.4ag";
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  if (standalone) document.body.classList.add("is-standalone-v251");

  // Progression modules are loaded directly from index.html in deterministic
  // dependency order. pwa.js now does one job only: keep the service worker fresh.
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, {
      scope: "./",
      updateViaCache: "none"
    })
      .then(registration => registration.update?.())
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
