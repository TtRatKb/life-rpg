(() => {
  const ROOT_CLASS = "rpg-modal-open";
  let locked = false;
  let lockedScrollY = 0;

  function openDialogs() {
    return [...document.querySelectorAll("dialog[open]")];
  }

  function lockPage() {
    if (locked) return;
    locked = true;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty("--rpg-scroll-lock-top", `${-lockedScrollY}px`);
    document.documentElement.style.setProperty("--rpg-scrollbar-compensation", `${scrollbarWidth}px`);
    document.documentElement.classList.add(ROOT_CLASS);
    document.body.classList.add(ROOT_CLASS);
  }

  function unlockPage() {
    if (!locked) return;
    locked = false;
    document.documentElement.classList.remove(ROOT_CLASS);
    document.body.classList.remove(ROOT_CLASS);
    document.documentElement.style.removeProperty("--rpg-scroll-lock-top");
    document.documentElement.style.removeProperty("--rpg-scrollbar-compensation");
    window.scrollTo(0, lockedScrollY);
  }

  function syncLock() {
    if (openDialogs().length) lockPage();
    else unlockPage();
  }

  function observeDialog(dialog) {
    const observer = new MutationObserver(syncLock);
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    dialog.addEventListener("close", syncLock);
    dialog.addEventListener("cancel", () => queueMicrotask(syncLock));
  }

  function init() {
    document.querySelectorAll("dialog").forEach(observeDialog);
    syncLock();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
