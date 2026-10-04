/* Life RPG V0.31.4dz19 — navigation rail memory + creative canvas focus. */
(() => {
  "use strict";
  if (window.LifeRPGChrome) return;

  const STORAGE_KEY = "lifeRpgUiChromeV1";
  const SIDEBAR_CLASS = "nav-rail-collapsed-v314dz19";
  const FOCUS_CLASS = "creative-canvas-focus-v314dz19";
  let sidebarCollapsed = false;
  let creativeFocus = false;

  function readPreference() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return Boolean(raw.sidebarCollapsed);
    } catch {
      return false;
    }
  }

  function writePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarCollapsed }));
    } catch {
      // A UI preference should never block Life RPG if storage is unavailable.
    }
  }

  function updateNavAccessibility() {
    document.querySelectorAll(".nav-button").forEach(button => {
      const label = button.querySelector("small")?.textContent?.trim();
      if (label) {
        if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", label);
        button.title = sidebarCollapsed ? label : "";
      }
    });
  }

  function updateToggle() {
    const button = document.getElementById("chromeRailToggleV314dz19");
    if (!button) return;
    button.setAttribute("aria-pressed", String(sidebarCollapsed));
    button.setAttribute("aria-label", sidebarCollapsed ? "Expand navigation" : "Collapse navigation");
    button.title = sidebarCollapsed ? "Navigation ausklappen" : "Navigation einklappen";
    button.textContent = sidebarCollapsed ? "☰" : "⇤";
  }

  function applySidebar(next, persist = true) {
    sidebarCollapsed = Boolean(next);
    document.body.classList.toggle(SIDEBAR_CLASS, sidebarCollapsed);
    updateToggle();
    updateNavAccessibility();
    if (persist) writePreference();
    window.dispatchEvent(new CustomEvent("life-rpg:chrome-change", {
      detail: { sidebarCollapsed, creativeFocus }
    }));
    return sidebarCollapsed;
  }

  function setCreativeFocus(next) {
    creativeFocus = Boolean(next);
    document.body.classList.toggle(FOCUS_CLASS, creativeFocus);
    window.dispatchEvent(new CustomEvent("life-rpg:chrome-change", {
      detail: { sidebarCollapsed, creativeFocus }
    }));
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return creativeFocus;
  }

  function installToggle() {
    const topbar = document.querySelector(".app-shell > .topbar");
    if (!topbar || document.getElementById("chromeRailToggleV314dz19")) return;
    const button = document.createElement("button");
    button.id = "chromeRailToggleV314dz19";
    button.className = "chrome-toggle-v314dz19";
    button.type = "button";
    button.addEventListener("click", () => applySidebar(!sidebarCollapsed));
    const resources = topbar.querySelector(".top-resources");
    if (resources) topbar.insertBefore(button, resources);
    else topbar.appendChild(button);
    updateToggle();
  }

  function init() {
    sidebarCollapsed = readPreference();
    installToggle();
    applySidebar(sidebarCollapsed, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.LifeRPGChrome = {
    version: "0.31.4dz19",
    setSidebarCollapsed: applySidebar,
    toggleSidebar: () => applySidebar(!sidebarCollapsed),
    isSidebarCollapsed: () => sidebarCollapsed,
    setCreativeFocus,
    toggleCreativeFocus: () => setCreativeFocus(!creativeFocus),
    isCreativeFocus: () => creativeFocus
  };
})();
