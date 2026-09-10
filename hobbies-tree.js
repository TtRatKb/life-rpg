(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !skills?.registerTalentTree) {
    console.error("Life RPG Hobbies Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4ag4";
  const SCHEMA = 1;
  const REALM = "Hobbies";
  const HOBBY_SKILLS = [
    "creative-expression",
    "craft-making",
    "style-visual-design",
    "recreation-play"
  ];

  const NODES = [
    node("hobbies-compass", "Hobbies Compass", "🎨", 1, 0, "core", [],
      "Adds one Hobbies dock that keeps creativity, making, style and recreation visible without turning leisure into another productivity board."),

    node("creative-spark", "Creative Spark", "✍️", 1, 1, "creative", ["hobbies-compass"],
      "Adds quick starts for Creative and Music sessions plus the existing Songwriting and Music Composition quests."),
    node("makers-bench", "Maker's Bench", "🧶", 1, 1, "making", ["hobbies-compass"],
      "Brings Craft Session and Scrapbook routes forward, with an optional real-time Craft timer."),
    node("style-atelier", "Style Atelier", "💄", 1, 1, "style", ["hobbies-compass"],
      "Connects the existing hairstyle and makeup inspiration library to their real Try-a-Look quests."),
    node("play-shelf", "Play Shelf", "🎮", 1, 1, "play", ["hobbies-compass"],
      "Surfaces your actual for-fun books and Hobbies games, with one-tap return to their existing reading or play logs."),

    node("creative-thread", "Creative Thread", "⌁", 2, 2, "creative", ["creative-spark"],
      "Keeps active Hobbies Adventures close so longer creative projects can be resumed without inventing generic roadmaps."),
    node("hands-on-return", "Hands-On Return", "✂️", 2, 2, "making", ["makers-bench"],
      "Shows your latest Craft & Making practice and keeps craft or scrapbook routes easy to pick up again."),
    node("lookbook", "Lookbook", "✦", 2, 2, "style", ["style-atelier"],
      "Shows saved untried hairstyle and makeup references and opens the real inspiration-driven quest flow."),
    node("leisure-loop", "Leisure Loop", "♡", 2, 2, "play", ["play-shelf"],
      "Keeps the most recently logged Hobbies book or game one tap away. Opening it never counts as practice."),

    node("life-in-color", "Life in Color", "✺", 4, 3, "core",
      ["creative-thread", "hands-on-return", "lookbook", "leisure-loop"],
      "Adds one optional Hobby Shuffle using real available routes, plus +1 Hobbies Realm XP for the first actual Hobbies skill practice after unlock each day.")
  ];

  const NODE_BY_ID = Object.fromEntries(NODES.map(item => [item.id, item]));
  let applyingBonus = false;
  let renderTimer = null;

  init();

  function node(id, title, icon, cost, tier, branch, requires, effect) {
    return { id, title, icon, cost, tier, branch, requires, effect };
  }

  function init() {
    const changed = ensureState();
    injectTree();
    bind();
    if (changed) app.saveState({ source: "hobbies-tree-init" });
    render();
    scheduleBonusPass();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      purchases: {},
      bonusClaims: {},
      migrations: { initialHobbiesTreeV1: true }
    };
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;

    if (!root.hobbiesTalentTree || typeof root.hobbiesTalentTree !== "object" || Array.isArray(root.hobbiesTalentTree)) {
      root.hobbiesTalentTree = defaults();
      changed = true;
    }

    const model = root.hobbiesTalentTree;
    if (Number(model.schemaVersion || 0) < SCHEMA) {
      model.schemaVersion = SCHEMA;
      changed = true;
    }
    model.version = VERSION;

    if (!model.purchases || typeof model.purchases !== "object" || Array.isArray(model.purchases)) {
      model.purchases = {};
      changed = true;
    }
    if (!model.bonusClaims || typeof model.bonusClaims !== "object" || Array.isArray(model.bonusClaims)) {
      model.bonusClaims = {};
      changed = true;
    }
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) {
      model.migrations = {};
      changed = true;
    }
    model.migrations.initialHobbiesTreeV1 = true;

    Object.keys(model.purchases).forEach(id => {
      if (!NODE_BY_ID[id] || !Number.isFinite(Number(model.purchases[id]))) {
        delete model.purchases[id];
        changed = true;
      }
    });

    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    const spent = purchaseCostTotal(model.purchases);
    if (Number(root.skills.spentPointsByRealm[REALM] || 0) !== spent) {
      root.skills.spentPointsByRealm[REALM] = spent;
      changed = true;
    }

    return changed;
  }

  function state() {
    ensureState();
    return app.getState().hobbiesTalentTree;
  }

  function purchased(id) {
    return Boolean(state().purchases[id]);
  }

  function purchaseTime(id) {
    return Math.max(0, Number(state().purchases[id] || 0));
  }

  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce((sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0), 0);
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("hobbiesTalentTree")) return;

    const section = document.createElement("section");
    section.id = "hobbiesTalentTree";
    section.className = "panel hobbies-tree-v314ag4";
    section.innerHTML = `
      <div class="hobbies-tree-head-v314ag4">
        <div>
          <p class="eyebrow">HOBBIES · TALENT TREE</p>
          <h2>Make room for things that are allowed to be fun.</h2>
          <p>Hobbies points come from real creative, making, style and recreation practice. The tree adds return paths and shortcuts — not pressure to optimize your free time.</p>
        </div>
        <div id="hobbiesTreePointBank" class="hobbies-tree-bank-v314ag4"></div>
      </div>

      <div id="hobbiesTreeNodes" class="hobbies-tree-map-v314ag4"></div>
      <div id="hobbiesTalentTools" class="hobbies-tools-v314ag4"></div>

      <div class="hobbies-tree-footer-v314ag4">
        <span>↻ Free respec. Games, books, Inspirations, Adventures and Hobbies quests remain available without talents.</span>
        <button class="text-button" type="button" data-hobbies-tree-reset>Reset Hobbies tree</button>
      </div>`;

    if (!skills.registerTalentTree(REALM, section)) {
      const grid = document.getElementById("skillsRealmGrid");
      section.dataset.skillTreeRealm = REALM;
      if (grid) grid.insertAdjacentElement("beforebegin", section);
      else skillsView.appendChild(section);
    }
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-hobbies-talent-buy]");
      if (buy) {
        event.preventDefault();
        purchaseNode(buy.dataset.hobbiesTalentBuy);
        return;
      }

      const reset = event.target.closest?.("[data-hobbies-tree-reset]");
      if (reset) {
        event.preventDefault();
        resetTree();
        return;
      }

      const timer = event.target.closest?.("[data-hobbies-timer]");
      if (timer) {
        event.preventDefault();
        startHobbyTimer(timer.dataset.hobbiesTimer, Number(timer.dataset.hobbiesMinutes || 20));
        return;
      }

      const quest = event.target.closest?.("[data-hobbies-quest-role]");
      if (quest) {
        event.preventDefault();
        openOrStartQuest(quest.dataset.hobbiesQuestRole);
        return;
      }

      const style = event.target.closest?.("[data-hobbies-style-role]");
      if (style) {
        event.preventDefault();
        openStyleRoute(style.dataset.hobbiesStyleRole);
        return;
      }

      const inspiration = event.target.closest?.("[data-hobbies-inspirations]");
      if (inspiration) {
        event.preventDefault();
        openInspirations();
        return;
      }

      const game = event.target.closest?.("[data-hobbies-game-log]");
      if (game) {
        event.preventDefault();
        window.LifeRPGGames?.openLog?.(game.dataset.hobbiesGameLog);
        return;
      }

      const book = event.target.closest?.("[data-hobbies-book-log]");
      if (book) {
        event.preventDefault();
        window.LifeRPGLibrary?.openLog?.(book.dataset.hobbiesBookLog);
        return;
      }

      const adventure = event.target.closest?.("[data-hobbies-adventure-log]");
      if (adventure) {
        event.preventDefault();
        window.LifeRPGAdventures?.openLog?.(adventure.dataset.hobbiesAdventureLog);
        return;
      }

      const openGames = event.target.closest?.("[data-hobbies-open-games]");
      if (openGames) {
        event.preventDefault();
        openHobbiesGames();
        return;
      }

      const openBooks = event.target.closest?.("[data-hobbies-open-books]");
      if (openBooks) {
        event.preventDefault();
        openFunBooks();
        return;
      }

      const openAdventures = event.target.closest?.("[data-hobbies-open-adventures]");
      if (openAdventures) {
        event.preventDefault();
        openHobbiesAdventures();
        return;
      }

      const repeatMaking = event.target.closest?.("[data-hobbies-repeat-making]");
      if (repeatMaking) {
        event.preventDefault();
        repeatMakingRoute();
        return;
      }

      const repeatLeisure = event.target.closest?.("[data-hobbies-repeat-leisure]");
      if (repeatLeisure) {
        event.preventDefault();
        repeatLeisureRoute();
        return;
      }

      const shuffle = event.target.closest?.("[data-hobbies-shuffle]");
      if (shuffle) {
        event.preventDefault();
        runHobbyShuffle();
      }
    });

    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", () => {
      scheduleRender();
      scheduleBonusPass();
    });
    ["life-rpg:time-change", "life-rpg:game-change", "life-rpg:library-change", "life-rpg:adventure-change", "life-rpg:inspiration-change"].forEach(name => {
      window.addEventListener(name, () => {
        scheduleRender();
        scheduleBonusPass();
      });
    });
  }

  function purchaseNode(id) {
    const item = NODE_BY_ID[id];
    if (!item || purchased(id)) return;

    if (!item.requires.every(purchased)) {
      app.showToast?.("Unlock the connected talent first.");
      return;
    }

    const points = skills.getRealmPoints(REALM);
    if (points.available < item.cost) {
      app.showToast?.(`You need ${item.cost} Hobbies point${item.cost === 1 ? "" : "s"}.`);
      return;
    }

    state().purchases[id] = Date.now();
    syncSpentPoints();
    app.saveState({ source: "hobbies-talent-unlock" });
    render();
    skills.refreshTalentHub?.();
    scheduleBonusPass();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
  }

  function resetTree() {
    if (!Object.keys(state().purchases).length) {
      app.showToast?.("The Hobbies tree is already empty.");
      return;
    }

    if (!window.confirm("Reset the Hobbies talent tree? All spent Hobbies points become available again. Past earned rewards stay earned.")) return;

    state().purchases = {};
    syncSpentPoints();
    app.saveState({ source: "hobbies-tree-reset" });
    render();
    skills.refreshTalentHub?.();
    app.showToast?.("Hobbies tree reset · all Hobbies points are available again.");
  }

  function syncSpentPoints() {
    const root = app.getState();
    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    root.skills.spentPointsByRealm[REALM] = purchaseCostTotal(state().purchases);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 80);
  }

  function render() {
    if (!document.getElementById("hobbiesTalentTree")) return;
    renderBank();
    renderNodes();
    const tools = document.getElementById("hobbiesTalentTools");
    if (tools) tools.innerHTML = renderTools();
  }

  function renderBank() {
    const bank = document.getElementById("hobbiesTreePointBank");
    if (!bank) return;

    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `<small>HOBBIES POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span>`;
  }

  function renderNodes() {
    const container = document.getElementById("hobbiesTreeNodes");
    if (!container) return;

    container.innerHTML = [0, 1, 2, 3].map(tier => {
      const items = NODES.filter(item => item.tier === tier);
      return `<div class="hobbies-tree-tier-v314ag4 tier-${tier}">${items.map(nodeMarkup).join("")}</div>`;
    }).join("");
  }

  function nodeMarkup(item) {
    const isBought = purchased(item.id);
    const prereqsMet = item.requires.every(purchased);
    const affordable = skills.getRealmPoints(REALM).available >= item.cost;
    const status = isBought ? "bought" : prereqsMet ? (affordable ? "available" : "short") : "locked";
    const prereq = item.requires.length
      ? item.requires.map(id => NODE_BY_ID[id]?.title).filter(Boolean).join(" + ")
      : "Tree root";

    return `<article class="hobbies-node-v314ag4 branch-${escAttr(item.branch)} is-${status}">
      <div class="hobbies-node-icon-v314ag4">${item.icon}</div>
      <div class="hobbies-node-copy-v314ag4">
        <small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.effect)}</p>
        <em>${esc(prereq)}</em>
      </div>
      ${isBought
        ? `<button type="button" disabled>Unlocked ✓</button>`
        : `<button type="button" data-hobbies-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`}
    </article>`;
  }

  function renderTools() {
    if (!purchased("hobbies-compass")) {
      return `<div class="hobbies-tools-locked-v314ag4">
        <span>🎨</span>
        <div><strong>Hobbies Compass unlocks the first Hobbies utility.</strong><p>Your actual hobbies remain fully available everywhere they already live.</p></div>
      </div>`;
    }

    const blocks = [hobbiesDockMarkup()];
    if (purchased("creative-spark")) blocks.push(creativeSparkMarkup());
    if (purchased("makers-bench")) blocks.push(makersBenchMarkup());
    if (purchased("style-atelier")) blocks.push(styleAtelierMarkup());
    if (purchased("play-shelf")) blocks.push(playShelfMarkup());
    if (purchased("creative-thread")) blocks.push(creativeThreadMarkup());
    if (purchased("hands-on-return")) blocks.push(handsOnReturnMarkup());
    if (purchased("lookbook")) blocks.push(lookbookMarkup());
    if (purchased("leisure-loop")) blocks.push(leisureLoopMarkup());
    if (purchased("life-in-color")) blocks.push(lifeInColorMarkup());
    return blocks.join("");
  }

  function hobbiesDockMarkup() {
    const points = skills.getRealmPoints(REALM);
    const rank = app.getRealmRankInfo?.(REALM);
    const cards = HOBBY_SKILLS.map(id => {
      const meta = skills.getSkill(id);
      const info = skills.getLevelInfo(id);
      return `<article>
        <span>${meta?.icon || "✦"}</span>
        <div><strong>${esc(meta?.label || id)}</strong><small>${info?.discovered ? `Lv. ${info.level}` : "Not trained yet"} · ${fmt(recentSkillXp(id, 7))} XP in 7d</small></div>
      </article>`;
    }).join("");

    return `<section class="hobbies-tool-card-v314ag4 hobbies-dock-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>HOBBIES COMPASS</small><h3>Things that make life feel inhabited.</h3><p>Four different kinds of leisure can coexist. The numbers are history, not a balance score.</p></div>
        <span>🎨</span>
      </div>
      <div class="hobbies-skill-grid-v314ag4">${cards}</div>
      <div class="hobbies-dock-foot-v314ag4"><span>${rank ? `Hobbies Realm · Rank ${rank.level}` : "Hobbies Realm"}</span><strong>${points.available} Talent point${points.available === 1 ? "" : "s"} available</strong></div>
    </section>`;
  }

  function creativeSparkMarkup() {
    return `<section class="hobbies-tool-card-v314ag4 branch-creative-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>CREATIVE SPARK</small><h3>Start making before the idea cools off.</h3><p>Timers log real Creative or Music time. Quest buttons use the existing Quest system.</p></div>
        <span>✍️</span>
      </div>
      <div class="hobbies-action-row-v314ag4">
        <button class="primary-button" type="button" data-hobbies-timer="Creative" data-hobbies-minutes="20">✍️ Creative · 20m</button>
        <button class="secondary-button" type="button" data-hobbies-timer="Music" data-hobbies-minutes="25">🎵 Music · 25m</button>
        <button class="secondary-button" type="button" data-hobbies-quest-role="songwriting-session">🎼 Songwriting quest</button>
        <button class="secondary-button" type="button" data-hobbies-quest-role="music-composition">🎹 Composition quest</button>
      </div>
    </section>`;
  }

  function makersBenchMarkup() {
    return `<section class="hobbies-tool-card-v314ag4 branch-making-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>MAKER'S BENCH</small><h3>Hands busy, brain somewhere softer.</h3><p>Use the timer for open-ended making or jump into the existing Craft Session and Scrapbook quests.</p></div>
        <span>🧶</span>
      </div>
      <div class="hobbies-action-row-v314ag4">
        <button class="primary-button" type="button" data-hobbies-timer="Craft" data-hobbies-minutes="20">🧶 Craft · 20m</button>
        <button class="secondary-button" type="button" data-hobbies-quest-role="craft-session">🧵 Craft Session</button>
        <button class="secondary-button" type="button" data-hobbies-quest-role="scrapbook-page">✂️ Scrapbook Page</button>
      </div>
    </section>`;
  }

  function styleAtelierMarkup() {
    const items = inspirationItems();
    const hair = items.filter(item => item.type === "hairstyle" && item.status === "want").length;
    const makeup = items.filter(item => item.type === "makeup" && item.status === "want").length;

    return `<section class="hobbies-tool-card-v314ag4 branch-style-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>STYLE ATELIER</small><h3>Saved references become things you can actually try.</h3><p>${hair} hairstyle${hair === 1 ? "" : "s"} and ${makeup} makeup look${makeup === 1 ? "" : "s"} are currently marked untried.</p></div>
        <span>💄</span>
      </div>
      <div class="hobbies-action-row-v314ag4">
        <button class="primary-button" type="button" data-hobbies-style-role="new-hairstyle" ${hair ? "" : "disabled"}>💇 Try hairstyle${hair ? ` · ${hair}` : ""}</button>
        <button class="secondary-button" type="button" data-hobbies-style-role="makeup-look" ${makeup ? "" : "disabled"}>💄 Try makeup${makeup ? ` · ${makeup}` : ""}</button>
        <button class="secondary-button" type="button" data-hobbies-inspirations>✦ Open Inspiration Library</button>
      </div>
    </section>`;
  }

  function playShelfMarkup() {
    const media = hobbyMedia();
    const rows = [
      ...media.books.slice(0, 2).map(item => mediaRow("book", item)),
      ...media.games.slice(0, 2).map(item => mediaRow("game", item))
    ].join("");

    return `<section class="hobbies-tool-card-v314ag4 branch-play-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>PLAY SHELF</small><h3>Fun is allowed to be the reason.</h3><p>${media.books.length} for-fun book${media.books.length === 1 ? "" : "s"} · ${media.games.length} Hobbies game${media.games.length === 1 ? "" : "s"} in your existing collections.</p></div>
        <span>🎮</span>
      </div>
      <div class="hobbies-media-list-v314ag4">${rows || `<p>No Hobbies media is in the Library or Games collection yet.</p>`}</div>
      <div class="hobbies-action-row-v314ag4">
        <button class="secondary-button" type="button" data-hobbies-open-books>📖 For-fun books</button>
        <button class="secondary-button" type="button" data-hobbies-open-games>🎮 Hobbies games</button>
      </div>
    </section>`;
  }

  function creativeThreadMarkup() {
    const adventures = activeHobbyAdventures().slice(0, 4);

    return `<section class="hobbies-tool-card-v314ag4 branch-creative-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>CREATIVE THREAD</small><h3>${adventures.length ? "Your creative projects are still here." : "No active Hobbies Adventure right now."}</h3><p>These are your actual Adventures, not an automatically generated project plan.</p></div>
        <span>⌁</span>
      </div>
      <div class="hobbies-project-list-v314ag4">
        ${adventures.length ? adventures.map(adventureRow).join("") : `<p>Create or resume a Hobbies Adventure whenever you have a project worth tracking.</p>`}
      </div>
      <button class="text-button" type="button" data-hobbies-open-adventures>Open Hobbies Adventures →</button>
    </section>`;
  }

  function handsOnReturnMarkup() {
    const last = latestSkillEvent("craft-making");

    return `<section class="hobbies-tool-card-v314ag4 branch-making-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>HANDS-ON RETURN</small><h3>${last ? esc(last.label || "Recent making practice") : "A making trail will appear here."}</h3><p>${last ? `Last Craft & Making practice ${esc(humanAgo(last.at))}.` : "Nothing has to be waiting. This is just a return path when you want one."}</p></div>
        <span>✂️</span>
      </div>
      <div class="hobbies-action-row-v314ag4">
        <button class="primary-button" type="button" data-hobbies-repeat-making>${esc(makingReturnLabel(last))}</button>
        <button class="secondary-button" type="button" data-hobbies-timer="Craft" data-hobbies-minutes="20">🧶 Open-ended Craft · 20m</button>
      </div>
    </section>`;
  }

  function lookbookMarkup() {
    const items = inspirationItems().filter(item => item.status === "want").slice(0, 4);

    return `<section class="hobbies-tool-card-v314ag4 branch-style-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>LOOKBOOK</small><h3>${items.length ? "References you still want to try." : "Your Lookbook is clear."}</h3><p>Saving a reference is not skill practice. Trying it through the real quest is.</p></div>
        <span>✦</span>
      </div>
      <div class="hobbies-lookbook-v314ag4">
        ${items.length ? items.map(lookRow).join("") : `<p>Save a hairstyle or makeup reference in the existing Inspiration Library when something catches your eye.</p>`}
      </div>
      <button class="secondary-button" type="button" data-hobbies-inspirations>Open Inspiration Library</button>
    </section>`;
  }

  function leisureLoopMarkup() {
    const latest = latestLeisureMedia();

    return `<section class="hobbies-tool-card-v314ag4 branch-play-card-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>LEISURE LOOP</small><h3>${latest ? `${latest.kind === "book" ? "📖" : "🎮"} ${esc(latest.title)}` : "No leisure trail yet."}</h3><p>${latest ? `Last logged ${esc(humanAgo(latest.at))}. The button opens the normal ${latest.kind === "book" ? "reading" : "game"} log.` : "Once you log for-fun reading or a Hobbies game, the latest one will stay one tap away."}</p></div>
        <span>♡</span>
      </div>
      ${latest
        ? `<button class="primary-button" type="button" data-hobbies-repeat-leisure>Return to ${latest.kind === "book" ? "reading" : "playing"}</button>`
        : `<div class="hobbies-action-row-v314ag4"><button class="secondary-button" type="button" data-hobbies-open-books>For-fun books</button><button class="secondary-button" type="button" data-hobbies-open-games>Hobbies games</button></div>`}
    </section>`;
  }

  function lifeInColorMarkup() {
    const today = localDateKey(new Date());
    const claimed = hasLedgerClaim(`life-in-color:${today}`);
    const route = hobbyShuffleRoute();

    return `<section class="hobbies-tool-card-v314ag4 hobbies-keystone-v314ag4">
      <div class="hobbies-tool-heading-v314ag4">
        <div><small>LIFE IN COLOR · KEYSTONE</small><h3>Hobby Shuffle</h3><p>${esc(route.reason)}</p></div>
        <span>✺</span>
      </div>
      <div class="hobbies-keystone-row-v314ag4">
        <button class="primary-button" type="button" data-hobbies-shuffle>${esc(route.button)}</button>
        <div>
          <strong>${claimed ? "✓ Today's first-practice Hobbies bonus is already recorded." : "The first real Hobbies skill practice today can add +1 Hobbies Realm XP."}</strong>
          <small>No streak. No requirement to diversify. The shuffle only chooses among things that already exist.</small>
        </div>
      </div>
    </section>`;
  }

  function startHobbyTimer(subcategory, minutes) {
    if (!["Creative", "Craft", "Music"].includes(subcategory)) return;

    if (window.LifeRPGTime?.getActive?.()) {
      app.showToast?.("Another timer is already running. Stop or finish it first.");
      return;
    }

    const started = window.LifeRPGTime?.startAction?.({
      categoryId: "hobby",
      subcategory,
      label: `Hobby · ${subcategory}`,
      minutes: Math.max(1, Number(minutes || 20))
    });

    if (!started) app.showView?.("rhythm");
  }

  function findQuestByRole(role) {
    return (app.getQuestCatalog?.() || []).find(quest => String(quest?.systemRole || "") === role) || null;
  }

  function openOrStartQuest(role) {
    const quest = findQuestByRole(role);
    if (!quest) {
      openHobbiesQuests(role);
      return;
    }

    const availability = app.getQuestAvailability?.(quest);
    if (availability?.available === false) {
      openHobbiesQuests(quest.name);
      app.showToast?.(availability.reason || "That Hobbies quest is not available right now.");
      return;
    }

    if (isMinuteQuest(quest) && !window.LifeRPGTime?.getActive?.()) {
      const started = window.LifeRPGTime?.startQuest?.({
        questId: quest.id,
        minutes: Math.max(1, Number(quest.planningMinutes || quest.units || 20))
      });
      if (started) return;
    }

    openHobbiesQuests(quest.name);
  }

  function isMinuteQuest(quest) {
    return /(?:^|\b)(?:min|minute|minutes)(?:\b|$)/i.test(String(quest?.unitLabel || ""));
  }

  function openHobbiesQuests(term = "") {
    app.showView?.("quests");
    window.setTimeout(() => {
      document.querySelector('[data-realm-filter="Hobbies"]')?.click();
      const search = document.getElementById("questSearch");
      if (search && term) {
        search.value = term;
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 30);
  }

  function openStyleRoute(role) {
    const quest = findQuestByRole(role);
    if (!quest) {
      openInspirations();
      return;
    }

    const availability = window.LifeRPGInspirations?.availabilityForQuest?.(quest);
    if (availability?.available === false) {
      openInspirations();
      app.showToast?.(availability.reason || "Save an inspiration first.");
      return;
    }

    if (!window.LifeRPGInspirations?.openForQuest?.(quest.id, role)) {
      openHobbiesQuests(quest.name);
    }
  }

  function openInspirations() {
    app.showView?.("growth");
    window.setTimeout(() => {
      document.getElementById("inspirationLibraryPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }

  function inspirationItems() {
    return window.LifeRPGInspirations?.getItems?.() || [];
  }

  function hobbyMedia() {
    const books = (window.LifeRPGLibrary?.getItems?.() || [])
      .filter(item => item?.role === "fun")
      .sort((a, b) => mediaPriority(a.status) - mediaPriority(b.status) || Number(b.lastReadAt || b.updatedAt || 0) - Number(a.lastReadAt || a.updatedAt || 0));

    const games = (window.LifeRPGGames?.getItems?.() || [])
      .filter(item => ["fun", "social", "challenge"].includes(item?.role))
      .sort((a, b) => gamePriority(a.status) - gamePriority(b.status) || Number(window.LifeRPGGames?.effectiveLastPlayedAt?.(b) || b.lastPlayedAt || 0) - Number(window.LifeRPGGames?.effectiveLastPlayedAt?.(a) || a.lastPlayedAt || 0));

    return { books, games };
  }

  function mediaPriority(status) {
    return ({ reading: 0, paused: 1, owned: 2, want: 3, finished: 4, dnf: 5 })[status] ?? 9;
  }

  function gamePriority(status) {
    return ({ playing: 0, endless: 0, paused: 1, backlog: 2, finished: 3, dropped: 4 })[status] ?? 9;
  }

  function mediaRow(kind, item) {
    const title = item.title || item.name || (kind === "book" ? "Book" : "Game");
    const meta = kind === "book"
      ? (window.LifeRPGLibrary?.statusMeta?.(item.status)?.label || item.status || "For Fun")
      : (window.LifeRPGGames?.statusMeta?.(item.status)?.label || item.status || "Hobbies");

    return `<article>
      <span>${kind === "book" ? "📖" : "🎮"}</span>
      <div><strong>${esc(title)}</strong><small>${esc(meta)}</small></div>
      <button class="text-button" type="button" ${kind === "book" ? `data-hobbies-book-log="${escAttr(item.id)}"` : `data-hobbies-game-log="${escAttr(item.id)}"`}>Log →</button>
    </article>`;
  }

  function openHobbiesGames() {
    app.showView?.("games");
    window.setTimeout(() => {
      document.querySelector('[data-game-role="fun"]')?.click();
    }, 30);
  }

  function openFunBooks() {
    app.showView?.("library");
    window.setTimeout(() => {
      document.querySelector('[data-library-role="fun"]')?.click();
    }, 30);
  }

  function activeHobbyAdventures() {
    return (window.LifeRPGAdventures?.getItems?.() || [])
      .filter(item => item?.realm === REALM && item?.status === "active")
      .sort((a, b) => Number(b.lastTouchedAt || b.updatedAt || 0) - Number(a.lastTouchedAt || a.updatedAt || 0));
  }

  function adventureRow(item) {
    const step = window.LifeRPGAdventures?.getCurrentStep?.(item.id);
    return `<article>
      <span>✧</span>
      <div><strong>${esc(item.name || "Hobbies Adventure")}</strong><small>${step?.label ? `Next: ${esc(step.label)}` : `${Math.round(Number(item.progress || 0))}% progress`}</small></div>
      <button class="secondary-button" type="button" data-hobbies-adventure-log="${escAttr(item.id)}">Log progress</button>
    </article>`;
  }

  function openHobbiesAdventures() {
    app.showView?.("adventures");
  }

  function latestSkillEvent(skillId) {
    return skillEvents()
      .filter(event => event?.skillId === skillId)
      .sort((a, b) => timestamp(b.at) - timestamp(a.at))[0] || null;
  }

  function makingReturnLabel(last) {
    const label = String(last?.label || "").toLowerCase();
    if (/scrapbook/.test(label)) return "✂️ Make another scrapbook page";
    if (/craft/.test(label)) return "🧶 Return to Craft Session";
    return "🧶 Open Craft Session";
  }

  function repeatMakingRoute() {
    const last = latestSkillEvent("craft-making");
    const label = String(last?.label || "").toLowerCase();
    openOrStartQuest(/scrapbook/.test(label) ? "scrapbook-page" : "craft-session");
  }

  function lookRow(item) {
    const icon = item.type === "hairstyle" ? "💇" : "💄";
    const role = item.type === "hairstyle" ? "new-hairstyle" : "makeup-look";
    return `<article>
      <span>${icon}</span>
      <div><strong>${esc(item.title || "Saved inspiration")}</strong><small>${esc(item.type === "hairstyle" ? "Hairstyle" : "Makeup look")}</small></div>
      <button class="text-button" type="button" data-hobbies-style-role="${role}">Try →</button>
    </article>`;
  }

  function latestLeisureMedia() {
    const root = app.getState();
    const books = Object.fromEntries((root.bookLibrary?.items || []).filter(item => item?.role === "fun").map(item => [item.id, item]));
    const games = Object.fromEntries((root.gameLibrary?.items || []).filter(item => ["fun", "social", "challenge"].includes(item?.role)).map(item => [item.id, item]));
    const candidates = [];

    (root.bookLibrary?.logs || []).forEach(log => {
      const item = books[log?.bookId];
      if (!item) return;
      candidates.push({ kind: "book", id: item.id, title: item.title || "Book", at: log.at || log.createdAt || item.lastReadAt || 0 });
    });

    (root.gameLibrary?.logs || []).forEach(log => {
      const item = games[log?.gameId];
      if (!item) return;
      candidates.push({ kind: "game", id: item.id, title: item.title || "Game", at: log.at || log.createdAt || item.lastPlayedAt || 0 });
    });

    return candidates.sort((a, b) => timestamp(b.at) - timestamp(a.at))[0] || null;
  }

  function repeatLeisureRoute() {
    const latest = latestLeisureMedia();
    if (!latest) {
      openHobbiesGames();
      return;
    }
    if (latest.kind === "book") window.LifeRPGLibrary?.openLog?.(latest.id);
    else window.LifeRPGGames?.openLog?.(latest.id);
  }

  function hobbyShuffleRoute() {
    const options = [];

    const activeAdventure = activeHobbyAdventures()[0];
    if (activeAdventure) {
      options.push({
        key: "creative",
        button: `✧ Continue ${activeAdventure.name || "Hobbies Adventure"}`,
        reason: "An active Hobbies Adventure already exists, so one possible route is to continue something you chose earlier.",
        run: () => window.LifeRPGAdventures?.openLog?.(activeAdventure.id)
      });
    } else {
      options.push({
        key: "creative",
        button: "✍️ Creative · 20m",
        reason: "A short open creative session is available without needing a project setup first.",
        run: () => startHobbyTimer("Creative", 20)
      });
    }

    options.push({
      key: "making",
      button: "🧶 Craft Session",
      reason: "The existing Craft Session is available as a hands-on route.",
      run: () => openOrStartQuest("craft-session")
    });

    const untried = inspirationItems().filter(item => item.status === "want");
    if (untried.length) {
      const styleRole = untried.some(item => item.type === "hairstyle") ? "new-hairstyle" : "makeup-look";
      options.push({
        key: "style",
        button: styleRole === "new-hairstyle" ? "💇 Try a saved hairstyle" : "💄 Try a saved makeup look",
        reason: "You already saved a style reference you wanted to try, so the shuffle can use that real intention.",
        run: () => openStyleRoute(styleRole)
      });
    }

    const leisure = latestLeisureMedia();
    const media = hobbyMedia();
    if (leisure || media.books.length || media.games.length) {
      options.push({
        key: "play",
        button: leisure ? `${leisure.kind === "book" ? "📖" : "🎮"} Return to ${leisure.title}` : "🎮 Open the Play Shelf",
        reason: "There is already a for-fun book or Hobbies game in your collection, so recreation is a valid route too.",
        run: () => leisure ? repeatLeisureRoute() : openHobbiesGames()
      });
    }

    if (!options.length) {
      return {
        key: "quests",
        button: "🎨 Open Hobbies quests",
        reason: "Nothing specific is already waiting, so the shuffle does not manufacture a hobby task.",
        run: () => openHobbiesQuests("")
      };
    }

    const recent = Object.fromEntries(HOBBY_SKILLS.map(id => [id, latestSkillEvent(id)?.at || 0]));
    const skillForKey = {
      creative: "creative-expression",
      making: "craft-making",
      style: "style-visual-design",
      play: "recreation-play"
    };

    options.sort((a, b) => timestamp(recent[skillForKey[a.key]]) - timestamp(recent[skillForKey[b.key]]));
    return options[0];
  }

  function runHobbyShuffle() {
    const route = hobbyShuffleRoute();
    route.run?.();
  }

  function scheduleBonusPass() {
    if (applyingBonus || !purchased("life-in-color")) return;
    window.setTimeout(applyBonus, 70);
  }

  function applyBonus() {
    if (applyingBonus || !purchased("life-in-color")) return;
    applyingBonus = true;

    try {
      const unlockedAt = purchaseTime("life-in-color");
      const dates = new Set();

      skillEvents().forEach(event => {
        if (!HOBBY_SKILLS.includes(event?.skillId)) return;
        const at = timestamp(event.at);
        if (!at || at < unlockedAt) return;
        dates.add(localDateKey(new Date(at)));
      });

      [...dates].sort().forEach(date => {
        const sourceId = `life-in-color:${date}`;
        if (hasLedgerClaim(sourceId)) return;

        const reward = app.awardActivity?.({
          source: "hobbies-talent-bonus",
          sourceId,
          label: "Life in Color",
          realm: REALM,
          capability: "creativity",
          xp: 0,
          realmXP: 1,
          statXP: 0,
          coins: 0,
          storyEnergyBase: 0,
          progressionRelevant: false,
          at: `${date}T23:49:00`,
          metadata: { talentTree: "hobbies", realmXPBonus: 1 }
        });

        if (!reward) return;
        state().bonusClaims[sourceId] = reward.eventId || true;
        app.saveState({ source: "hobbies-talent-bonus" });

        if (date === localDateKey(new Date())) {
          app.showToast?.("🎨 Life in Color · +1 Hobbies Realm XP");
        }
      });
    } finally {
      applyingBonus = false;
      render();
    }
  }

  function hasLedgerClaim(sourceId) {
    return (app.getState().rewardLedger?.events || []).some(event =>
      event?.source === "hobbies-talent-bonus" && event?.sourceId === sourceId
    );
  }

  function skillEvents() {
    return Array.isArray(app.getState().skills?.events) ? app.getState().skills.events : [];
  }

  function recentSkillXp(skillId, days) {
    const after = Date.now() - Math.max(1, Number(days || 1)) * 86400000;
    return skillEvents()
      .filter(event => event?.skillId === skillId && timestamp(event.at) >= after)
      .reduce((sum, event) => sum + Math.max(0, Number(event.xp || 0)), 0);
  }

  function humanAgo(value) {
    const time = timestamp(value);
    if (!time) return "some time ago";
    const mins = Math.floor(Math.max(0, Date.now() - time) / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function timestamp(value) {
    const n = typeof value === "number" ? value : new Date(value || 0).getTime();
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function round2(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function fmt(value) {
    const n = round2(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  window.LifeRPGHobbiesTree = {
    version: VERSION,
    nodes: NODES.map(item => ({ ...item })),
    open: () => {
      skills.open?.();
      window.setTimeout(() => skills.selectTalentRealm?.(REALM), 20);
    },
    render
  };
})();
