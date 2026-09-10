(() => {
  const VERSION = "0.31.4ab";
  const SKILLS_VERSION = "0.31.4aa";
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  if (standalone) document.body.classList.add("is-standalone-v251");

  // Skills remains an additive module so the release stays a small delta.
  if (!document.querySelector('link[data-life-rpg-skills]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = `./skills.css?v=${SKILLS_VERSION}`;
    style.dataset.lifeRpgSkills = SKILLS_VERSION;
    document.head.appendChild(style);
  }
  if (!document.querySelector('script[data-life-rpg-skills]')) {
    const script = document.createElement("script");
    script.src = `./skills.js?v=${SKILLS_VERSION}`;
    script.async = false;
    script.dataset.lifeRpgSkills = SKILLS_VERSION;
    document.head.appendChild(script);
  }

  // V0.31.4ab upgrades the existing Journal without replacing the large journal.js file:
  // each optional reflection earns its own depth rewards and its own visible meter.
  if (!document.querySelector('script[data-life-rpg-journal-rewards]')) {
    const script = document.createElement("script");
    script.src = `./journal-rewards.js?v=${VERSION}`;
    script.async = false;
    script.dataset.lifeRpgJournalRewards = VERSION;
    document.head.appendChild(script);
  }

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./service-worker.js?v=${VERSION}`, { scope: "./" })
      .catch(error => console.warn("Life RPG service worker could not register", error));
  });
})();
