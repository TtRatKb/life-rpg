(() => {
  "use strict";

  const root = document.getElementById("trainingFocusView");
  const mount = document.getElementById("trainingFocusMount");
  const title = document.getElementById("trainingFocusTitle");
  const subtitle = document.getElementById("trainingFocusSubtitle");
  const back = document.getElementById("trainingFocusBack");
  if (!root || !mount || !title || !subtitle || !back) return;

  let active = null;

  function enter({ id = "training", node, title: heading = "Training", subtitle: copy = "", onExit = null, tone = "light" } = {}) {
    if (!(node instanceof HTMLElement)) return false;
    if (active?.node === node) {
      update({ title: heading, subtitle: copy, tone });
      return true;
    }
    if (active) exit({ reopen: false });

    const placeholder = document.createComment(`training-focus:${id}`);
    node.parentNode?.insertBefore(placeholder, node);
    mount.replaceChildren(node);
    node.classList.add("is-training-focused-v314o");

    active = { id, node, placeholder, onExit: typeof onExit === "function" ? onExit : null };
    root.dataset.trainingFocus = id;
    root.dataset.tone = tone;
    title.textContent = heading;
    subtitle.textContent = copy;
    subtitle.classList.toggle("hidden", !copy);
    root.classList.remove("hidden");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("training-focus-active-v314o");
    mount.scrollTop = 0;
    window.setTimeout(() => back.focus({ preventScroll: true }), 20);
    window.dispatchEvent(new CustomEvent("life-rpg:training-focus-open", { detail: { id } }));
    return true;
  }

  function update({ title: heading, subtitle: copy, tone } = {}) {
    if (!active) return false;
    if (heading !== undefined) title.textContent = String(heading || "Training");
    if (copy !== undefined) {
      subtitle.textContent = String(copy || "");
      subtitle.classList.toggle("hidden", !copy);
    }
    if (tone) root.dataset.tone = tone;
    return true;
  }

  function exit({ reopen = true } = {}) {
    if (!active) return false;
    const closing = active;
    active = null;

    closing.node.classList.remove("is-training-focused-v314o");
    if (closing.placeholder?.parentNode) {
      closing.placeholder.parentNode.insertBefore(closing.node, closing.placeholder);
      closing.placeholder.remove();
    }
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
    delete root.dataset.trainingFocus;
    delete root.dataset.tone;
    document.body.classList.remove("training-focus-active-v314o");
    mount.replaceChildren();
    if (reopen) closing.onExit?.();
    window.dispatchEvent(new CustomEvent("life-rpg:training-focus-close", { detail: { id: closing.id } }));
    return true;
  }

  back.addEventListener("click", () => exit({ reopen: true }));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !active) return;
    event.preventDefault();
    exit({ reopen: true });
  }, true);

  window.LifeRPGTrainingFocus = {
    version: "0.31.4o",
    enter,
    exit,
    update,
    isActive: id => Boolean(active && (!id || active.id === id)),
    getActive: () => active ? { id: active.id } : null
  };
})();
