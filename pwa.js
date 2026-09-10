(() => {
  const VERSION = "0.31.4aa";
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  if (standalone) document.body.classList.add("is-standalone-v251");

  // Skills ships as an additive module so this release can stay a small delta instead
  // of replacing the large app shell. Load it after every existing Life RPG subsystem.
  if (!document.querySelector('link[data-life-rpg-skills]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `./skills.css?v=${VERSION}`;
    style.dataset.lifeRpgSkills = VERSION;
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-life-rpg-skills]')) {
    const script = document.createElement("script");
    script.src = `./skills.js?v=${VERSION}`;
    script.defer = true;
    script.dataset.lifeRpgSkills = VERSION;
    document.head.appendChild(script);
  }

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, { scope: "./" })
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
