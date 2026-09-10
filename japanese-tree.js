(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints || !skills?.registerTalentTree) {
    console.error("Life RPG Japanese Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4ai";
  const SCHEMA = 1;
  const REALM = "Japanese";
  const SKILL_ID = "language-learning";

  const NODES = [
    node(
      "japanese-compass",
      "Japanese Compass",
      "🌸",
      1,
      0,
      "core",
      [],
      "Adds one Japanese dock with Language Learning progress, Japanese Realm rank, Kotoba status and direct routes to the tools you already use."
    ),
    node(
      "review-pocket",
      "Review Pocket",
      "語",
      1,
      1,
      "review",
      ["japanese-compass"],
      "Keeps Kotoba Tiny and Quick Study one tap away, together with a manual sync. The SRS itself stays owned by Kotoba."
    ),
    node(
      "grammar-trail",
      "Grammar Trail",
      "文",
      1,
      1,
      "grammar",
      ["japanese-compass"],
      "Adds a direct Bunpro Review timer plus a shortcut to the Bunpro Lesson quest without auto-completing anything."
    ),
    node(
      "immersion-shelf",
      "Immersion Shelf",
      "本",
      1,
      1,
      "immersion",
      ["japanese-compass"],
      "Surfaces books and games you already marked as Japanese so immersion is easier to return to without creating a second library."
    ),
    node(
      "due-compass",
      "Due Compass",
      "⌁",
      2,
      2,
      "review",
      ["review-pocket"],
      "Shows Kotoba's current due mix and adds a smart review start: Tiny for a small queue, Quick for a larger one."
    ),
    node(
      "active-echo",
      "Active Echo",
      "🎧",
      2,
      2,
      "grammar",
      ["grammar-trail"],
      "Brings active-use routes forward: Shadowing and Line Miner open the real quest flow rather than awarding anything merely for clicking."
    ),
    node(
      "return-ticket",
      "Return Ticket",
      "↩",
      2,
      2,
      "immersion",
      ["immersion-shelf"],
      "Keeps the most recently logged Japanese book or game close, with one-tap return to the matching filtered library."
    ),
    node(
      "everyday-japanese",
      "Everyday Japanese",
      "✺",
      4,
      3,
      "core",
      ["due-compass", "active-echo", "return-ticket"],
      "Adds one Smart Japanese route that chooses between due SRS, Bunpro review, recent immersion or the Japanese quest shelf. The first Language Learning practice after unlock each day also adds +1 Japanese Realm XP."
    )
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
    if (changed) app.saveState({ source: "japanese-tree-init" });
    render();
    scheduleBonusPass();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      purchases: {},
      bonusClaims: {},
      migrations: { initialJapaneseTreeV1: true }
    };
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;

    if (!root.japaneseTalentTree || typeof root.japaneseTalentTree !== "object" || Array.isArray(root.japaneseTalentTree)) {
      root.japaneseTalentTree = defaults();
      changed = true;
    }

    const model = root.japaneseTalentTree;
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
    model.migrations.initialJapaneseTreeV1 = true;

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
    return app.getState().japaneseTalentTree;
  }

  function purchased(id) {
    return Boolean(state().purchases[id]);
  }

  function purchaseTime(id) {
    return Math.max(0, Number(state().purchases[id] || 0));
  }

  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce(
      (sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0),
      0
    );
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("japaneseTalentTree")) return;

    const section = document.createElement("section");
    section.id = "japaneseTalentTree";
    section.className = "panel japanese-tree-v314ag2";
    section.innerHTML = `
      <div class="japanese-tree-head-v314ag2">
        <div>
          <p class="eyebrow">JAPANESE · TALENT TREE</p>
          <h2>Make Japanese easier to return to.</h2>
          <p>Japanese points come from observed Language Learning practice. This tree connects SRS, grammar, active use and immersion without pretending that opening a tool is learning.</p>
        </div>
        <div id="japaneseTreePointBank" class="japanese-tree-bank-v314ag2"></div>
      </div>

      <div id="japaneseTreeNodes" class="japanese-tree-map-v314ag2"></div>
      <div id="japaneseTalentTools" class="japanese-tools-v314ag2"></div>

      <div class="japanese-tree-footer-v314ag2">
        <span>↻ Free respec. Existing Kotoba, Bunpro, Quest, Library and Game features stay available outside the tree.</span>
        <button class="text-button" type="button" data-japanese-tree-reset>Reset Japanese tree</button>
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
      const buy = event.target.closest?.("[data-japanese-talent-buy]");
      if (buy) {
        event.preventDefault();
        purchaseNode(buy.dataset.japaneseTalentBuy);
        return;
      }

      const reset = event.target.closest?.("[data-japanese-tree-reset]");
      if (reset) {
        event.preventDefault();
        resetTree();
        return;
      }

      const tiny = event.target.closest?.("[data-japanese-kotoba-tiny]");
      if (tiny) {
        event.preventDefault();
        startKotoba("tiny");
        return;
      }

      const quick = event.target.closest?.("[data-japanese-kotoba-quick]");
      if (quick) {
        event.preventDefault();
        startKotoba("quick");
        return;
      }

      const sync = event.target.closest?.("[data-japanese-kotoba-sync]");
      if (sync) {
        event.preventDefault();
        syncKotoba();
        return;
      }

      const connect = event.target.closest?.("[data-japanese-kotoba-open]");
      if (connect) {
        event.preventDefault();
        openKotobaPanel();
        return;
      }

      const bunproTimer = event.target.closest?.("[data-japanese-bunpro-review]");
      if (bunproTimer) {
        event.preventDefault();
        startBunproReview();
        return;
      }

      const quest = event.target.closest?.("[data-japanese-quest]");
      if (quest) {
        event.preventDefault();
        openJapaneseQuest(quest.dataset.japaneseQuest || "");
        return;
      }

      const library = event.target.closest?.("[data-japanese-open-library]");
      if (library) {
        event.preventDefault();
        openFilteredMedia("library");
        return;
      }

      const games = event.target.closest?.("[data-japanese-open-games]");
      if (games) {
        event.preventDefault();
        openFilteredMedia("games");
        return;
      }

      const returnLast = event.target.closest?.("[data-japanese-return-last]");
      if (returnLast) {
        event.preventDefault();
        returnToLastImmersion();
        return;
      }

      const smart = event.target.closest?.("[data-japanese-smart-route]");
      if (smart) {
        event.preventDefault();
        smartJapanese();
      }
    });

    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", () => {
      scheduleRender();
      scheduleBonusPass();
    });
    window.addEventListener("life-rpg:time-change", () => {
      scheduleRender();
      scheduleBonusPass();
    });
    window.addEventListener("life-rpg:game-change", scheduleRender);
    window.addEventListener("life-rpg:library-change", scheduleRender);
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
      app.showToast?.(`You need ${item.cost} Japanese point${item.cost === 1 ? "" : "s"}.`);
      return;
    }

    state().purchases[id] = Date.now();
    syncSpentPoints();
    app.saveState({ source: "japanese-talent-unlock" });
    render();
    skills.refreshTalentHub?.();
    scheduleBonusPass();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
  }

  function resetTree() {
    if (!Object.keys(state().purchases).length) {
      app.showToast?.("The Japanese tree is already empty.");
      return;
    }

    if (!window.confirm("Reset the Japanese talent tree? All spent Japanese points become available again. Past earned rewards stay earned.")) return;

    state().purchases = {};
    syncSpentPoints();
    app.saveState({ source: "japanese-tree-reset" });
    render();
    skills.refreshTalentHub?.();
    app.showToast?.("Japanese tree reset · all Japanese points are available again.");
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
    if (!document.getElementById("japaneseTalentTree")) return;
    renderBank();
    renderNodes();
    const tools = document.getElementById("japaneseTalentTools");
    if (tools) tools.innerHTML = renderTools();
  }

  function renderBank() {
    const bank = document.getElementById("japaneseTreePointBank");
    if (!bank) return;

    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `
      <small>JAPANESE POINTS</small>
      <strong>${points.available}</strong>
      <span>${points.spent} spent · ${points.earned} earned</span>`;
  }

  function renderNodes() {
    const container = document.getElementById("japaneseTreeNodes");
    if (!container) return;

    container.innerHTML = [0, 1, 2, 3].map(tier => {
      const items = NODES.filter(item => item.tier === tier);
      return `<div class="japanese-tree-tier-v314ag2 tier-${tier}">${items.map(nodeMarkup).join("")}</div>`;
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

    const button = isBought
      ? `<button type="button" disabled>Unlocked ✓</button>`
      : `<button type="button" data-japanese-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`;

    return `<article class="japanese-node-v314ag2 branch-${escAttr(item.branch)} is-${status}">
      <div class="japanese-node-icon-v314ag2">${item.icon}</div>
      <div class="japanese-node-copy-v314ag2">
        <small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.effect)}</p>
        <em>${esc(prereq)}</em>
      </div>
      ${button}
    </article>`;
  }

  function renderTools() {
    if (!purchased("japanese-compass")) {
      return `<div class="japanese-tools-locked-v314ag2">
        <span>🌸</span>
        <div>
          <strong>Japanese Compass unlocks the first Japanese utility.</strong>
          <p>Your existing Japanese activities remain available exactly where they already live.</p>
        </div>
      </div>`;
    }

    const blocks = [japaneseDockMarkup()];
    if (purchased("review-pocket")) blocks.push(reviewPocketMarkup());
    if (purchased("grammar-trail")) blocks.push(grammarTrailMarkup());
    if (purchased("immersion-shelf")) blocks.push(immersionShelfMarkup());
    if (purchased("due-compass")) blocks.push(dueCompassMarkup());
    if (purchased("active-echo")) blocks.push(activeEchoMarkup());
    if (purchased("return-ticket")) blocks.push(returnTicketMarkup());
    if (purchased("everyday-japanese")) blocks.push(everydayJapaneseMarkup());
    return blocks.join("");
  }

  function japaneseDockMarkup() {
    const info = skills.getLevelInfo(SKILL_ID);
    const points = skills.getRealmPoints(REALM);
    const realmRank = app.getRealmRankInfo?.(REALM);
    const kotoba = kotobaStatus();
    const due = dueCounts(kotoba);

    return `<section class="japanese-tool-card-v314ag2 japanese-dock-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div>
          <small>JAPANESE COMPASS</small>
          <h3>Japanese dock</h3>
          <p>A compact return point for practice you already track. Low activity is information, not a warning.</p>
        </div>
        <span>🌸</span>
      </div>

      <div class="japanese-snapshot-v314ag2">
        <article>
          <small>LANGUAGE LEARNING</small>
          <strong>${info?.discovered ? `Lv. ${info.level}` : "Not trained yet"}</strong>
          <span>${fmt(recentSkillXp(7))} Skill XP · last 7 days</span>
        </article>
        <article>
          <small>JAPANESE REALM</small>
          <strong>${realmRank ? `Rank ${realmRank.level}` : "—"}</strong>
          <span>${points.available} Talent point${points.available === 1 ? "" : "s"} available</span>
        </article>
        <article>
          <small>KOTOBA</small>
          <strong>${kotoba?.enabled ? (kotoba.lastError ? "Needs attention" : "Connected") : "Not connected"}</strong>
          <span>${kotoba?.enabled ? `${due.total} currently due` : "Optional integration"}</span>
        </article>
      </div>

      <div class="japanese-action-row-v314ag2">
        ${kotoba?.enabled
          ? `<button class="primary-button" type="button" data-japanese-kotoba-tiny>🌱 Tiny Japanese · 5 reviews</button>`
          : `<button class="primary-button" type="button" data-japanese-kotoba-open>🌸 Open Japanese study hub</button>`}
        <button class="secondary-button" type="button" data-japanese-quest="Bunpro">文 Bunpro quests</button>
        <button class="secondary-button" type="button" data-japanese-open-library>本 Japanese books</button>
      </div>
    </section>`;
  }

  function reviewPocketMarkup() {
    const status = kotobaStatus();

    if (!status?.enabled) {
      return `<section class="japanese-tool-card-v314ag2 branch-review-card-v314ag2">
        <div class="japanese-tool-heading-v314ag2">
          <div><small>REVIEW POCKET</small><h3>Kotoba is optional.</h3><p>Connect it from the existing Japanese study panel if you want real due SRS reviews inside Life RPG.</p></div>
          <span>語</span>
        </div>
        <button class="primary-button" type="button" data-japanese-kotoba-open>Open Kotoba connection</button>
      </section>`;
    }

    const due = dueCounts(status);
    return `<section class="japanese-tool-card-v314ag2 branch-review-card-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>REVIEW POCKET</small><h3>Real Kotoba reviews, close at hand.</h3><p>${due.total ? `${due.total} items are currently due.` : "No due items are reported right now."} Existing history is never paid retroactively.</p></div>
        <span>語</span>
      </div>
      <div class="japanese-action-row-v314ag2">
        <button class="primary-button" type="button" data-japanese-kotoba-tiny>🌱 Tiny · 5</button>
        <button class="secondary-button" type="button" data-japanese-kotoba-quick>🌸 Quick · 10</button>
        <button class="secondary-button" type="button" data-japanese-kotoba-sync>↻ Sync due state</button>
      </div>
    </section>`;
  }

  function grammarTrailMarkup() {
    const review = findQuestByRole("bunpro-reviews");
    const lesson = findQuestByRole("bunpro-lesson");
    const reviewAvailable = review ? app.getQuestAvailability?.(review) : null;
    const lessonAvailable = lesson ? app.getQuestAvailability?.(lesson) : null;

    return `<section class="japanese-tool-card-v314ag2 branch-grammar-card-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>GRAMMAR TRAIL</small><h3>Bunpro without hunting through the Quest Board.</h3><p>The review route starts the existing timed quest. A lesson remains a normal quest and is never auto-completed from here.</p></div>
        <span>文</span>
      </div>
      <div class="japanese-route-grid-v314ag2">
        <article>
          <strong>🌸 Bunpro Review Block</strong>
          <span>${reviewAvailable?.available === false ? esc(reviewAvailable.reason || "Not available right now") : "15-minute linked timer"}</span>
          <button class="primary-button" type="button" data-japanese-bunpro-review ${review && reviewAvailable?.available !== false ? "" : "disabled"}>Start review timer</button>
        </article>
        <article>
          <strong>📘 Bunpro Lesson</strong>
          <span>${lessonAvailable?.available === false ? esc(lessonAvailable.reason || "Not available right now") : "Complete one actual Bunpro lesson"}</span>
          <button class="secondary-button" type="button" data-japanese-quest="Bunpro Lesson">Open quest</button>
        </article>
      </div>
    </section>`;
  }

  function immersionShelfMarkup() {
    const media = japaneseMedia();
    const books = media.books.slice(0, 3);
    const games = media.games.slice(0, 3);

    return `<section class="japanese-tool-card-v314ag2 branch-immersion-card-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>IMMERSION SHELF</small><h3>Your Japanese media, not another database.</h3><p>These are the books and games already tagged Japanese elsewhere in Life RPG.</p></div>
        <span>本</span>
      </div>

      <div class="japanese-media-columns-v314ag2">
        <div>
          <header><strong>Books</strong><span>${media.books.length}</span></header>
          ${books.length ? books.map(item => mediaRow("📖", item.title || item.name || "Japanese book", item.status || item.source || "")).join("") : `<p>No Japanese-tagged books yet.</p>`}
          <button class="text-button" type="button" data-japanese-open-library>Open Japanese library →</button>
        </div>
        <div>
          <header><strong>Games</strong><span>${media.games.length}</span></header>
          ${games.length ? games.map(item => mediaRow("🎮", item.title || item.name || "Japanese game", item.status || item.platform || "")).join("") : `<p>No Japanese-tagged games yet.</p>`}
          <button class="text-button" type="button" data-japanese-open-games>Open Japanese games →</button>
        </div>
      </div>
    </section>`;
  }

  function dueCompassMarkup() {
    const status = kotobaStatus();
    if (!status?.enabled) {
      return `<section class="japanese-tool-card-v314ag2 branch-review-card-v314ag2">
        <div class="japanese-tool-heading-v314ag2"><div><small>DUE COMPASS</small><h3>Due-state appears after Kotoba is connected.</h3><p>The talent stays unlocked; nothing is lost while the integration is off.</p></div><span>⌁</span></div>
        <button class="secondary-button" type="button" data-japanese-kotoba-open>Open Japanese study hub</button>
      </section>`;
    }

    const due = dueCounts(status);
    const route = due.total <= 5 ? "tiny" : "quick";
    return `<section class="japanese-tool-card-v314ag2 branch-review-card-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>DUE COMPASS</small><h3>${due.total ? `${due.total} due right now` : "Queue looks clear"}</h3><p>Current Kotoba snapshot only; Life RPG does not invent due items.</p></div>
        <span>⌁</span>
      </div>

      <div class="japanese-due-grid-v314ag2">
        ${duePill("語", "Core vocab", due.vocabularyCore)}
        ${duePill("✦", "Mining", due.vocabularyMining)}
        ${duePill("文", "Grammar", due.grammar)}
        ${duePill("は", "Particles", due.particles)}
      </div>

      <div class="japanese-action-row-v314ag2">
        ${due.total
          ? `<button class="primary-button" type="button" data-japanese-kotoba-${route}>${route === "tiny" ? "🌱 Tiny" : "🌸 Quick"} review fits this queue</button>`
          : `<button class="primary-button" type="button" data-japanese-kotoba-sync>↻ Refresh due state</button>`}
      </div>
    </section>`;
  }

  function activeEchoMarkup() {
    const shadow = findQuestByRole("shadowing");
    const lineMiner = findQuestByRole("manual-language");

    return `<section class="japanese-tool-card-v314ag2 branch-grammar-card-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>ACTIVE ECHO</small><h3>Use Japanese instead of only recognizing it.</h3><p>These buttons open the actual Quest Board route. Clicking here never counts as practice by itself.</p></div>
        <span>🎧</span>
      </div>
      <div class="japanese-route-grid-v314ag2">
        <article>
          <strong>🎧 5-Line Shadowing</strong>
          <span>${shadow ? "Repeat five real lines aloud." : "Quest not found in the current catalog."}</span>
          <button class="secondary-button" type="button" data-japanese-quest="Shadowing" ${shadow ? "" : "disabled"}>Open Shadowing quest</button>
        </article>
        <article>
          <strong>💎 Line Miner</strong>
          <span>${lineMiner ? "Mine useful lines from material you actually consumed." : "Quest not found in the current catalog."}</span>
          <button class="secondary-button" type="button" data-japanese-quest="Line Miner" ${lineMiner ? "" : "disabled"}>Open Line Miner</button>
        </article>
      </div>
    </section>`;
  }

  function returnTicketMarkup() {
    const latest = latestJapaneseMedia();
    if (!latest) {
      return `<section class="japanese-tool-card-v314ag2 branch-immersion-card-v314ag2">
        <div class="japanese-tool-heading-v314ag2"><div><small>RETURN TICKET</small><h3>No immersion trail yet.</h3><p>Once you log a Japanese-tagged book or game, the most recent one will stay close here.</p></div><span>↩</span></div>
        <div class="japanese-action-row-v314ag2"><button class="secondary-button" type="button" data-japanese-open-library>Japanese books</button><button class="secondary-button" type="button" data-japanese-open-games>Japanese games</button></div>
      </section>`;
    }

    return `<section class="japanese-tool-card-v314ag2 branch-immersion-card-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>RETURN TICKET</small><h3>${latest.kind === "book" ? "📖" : "🎮"} ${esc(latest.title)}</h3><p>Last Japanese immersion log ${esc(humanAgo(latest.at))}. Opening it gives no XP; the actual reading or play log does.</p></div>
        <span>↩</span>
      </div>
      <button class="primary-button" type="button" data-japanese-return-last>Return to ${latest.kind === "book" ? "Japanese books" : "Japanese games"}</button>
    </section>`;
  }

  function everydayJapaneseMarkup() {
    const today = localDateKey(new Date());
    const claimed = hasLedgerClaim(`everyday-japanese:${today}`);
    const route = smartRouteDescription();

    return `<section class="japanese-tool-card-v314ag2 japanese-keystone-v314ag2">
      <div class="japanese-tool-heading-v314ag2">
        <div><small>EVERYDAY JAPANESE · KEYSTONE</small><h3>One button, the most relevant existing route.</h3><p>${esc(route.reason)}</p></div>
        <span>✺</span>
      </div>

      <div class="japanese-keystone-row-v314ag2">
        <button class="primary-button" type="button" data-japanese-smart-route>${esc(route.label)}</button>
        <div>
          <strong>${claimed ? "✓ Today's first-practice bonus is already recorded." : "First real Language Learning practice today can add +1 Japanese Realm XP."}</strong>
          <small>No streak. Opening this route does not earn the bonus; actual practice does.</small>
        </div>
      </div>
    </section>`;
  }

  function mediaRow(icon, title, meta) {
    return `<article class="japanese-media-row-v314ag2"><span>${icon}</span><div><strong>${esc(title)}</strong><small>${esc(meta || "Japanese")}</small></div></article>`;
  }

  function duePill(icon, label, value) {
    return `<article><span>${icon}</span><div><strong>${Math.max(0, Number(value || 0))}</strong><small>${esc(label)}</small></div></article>`;
  }

  function kotobaStatus() {
    return window.LifeRPGKotobaIntegration?.getStatus?.() || null;
  }

  function dueCounts(status = kotobaStatus()) {
    const counts = status?.dueSnapshot?.counts || {};
    return {
      vocabularyCore: Math.max(0, Number(counts.vocabularyCore || 0)),
      vocabularyMining: Math.max(0, Number(counts.vocabularyMining || 0)),
      grammar: Math.max(0, Number(counts.grammar || 0)),
      particles: Math.max(0, Number(counts.particles || 0)),
      total: Math.max(
        0,
        Number(
          counts.total ??
          Number(counts.vocabularyCore || 0) +
          Number(counts.vocabularyMining || 0) +
          Number(counts.grammar || 0) +
          Number(counts.particles || 0)
        )
      )
    };
  }

  function startKotoba(size) {
    const api = window.LifeRPGKotobaQuickTraining;
    const status = kotobaStatus();

    if (!status?.enabled) {
      openKotobaPanel();
      app.showToast?.("Connect Kotoba first if you want live SRS reviews.");
      return;
    }

    try {
      const result = size === "quick" ? api?.startQuick?.() : api?.startTiny?.();
      if (result?.catch) result.catch(error => app.showToast?.(friendlyError(error)));
    } catch (error) {
      app.showToast?.(friendlyError(error));
    }
  }

  function syncKotoba() {
    const integration = window.LifeRPGKotobaIntegration;
    if (!integration?.syncNow) {
      openKotobaPanel();
      return;
    }
    Promise.resolve(integration.syncNow())
      .then(() => {
        render();
        app.showToast?.("🌸 Kotoba due state refreshed.");
      })
      .catch(error => app.showToast?.(friendlyError(error)));
  }

  function openKotobaPanel() {
    app.showView?.("growth");
    window.setTimeout(() => {
      document.getElementById("kotobaIntegrationPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }

  function findQuestByRole(role) {
    return (app.getQuestCatalog?.() || []).find(quest => String(quest?.systemRole || "") === role) || null;
  }

  function startBunproReview() {
    const quest = findQuestByRole("bunpro-reviews");
    if (!quest) {
      openJapaneseQuest("Bunpro");
      return;
    }

    const availability = app.getQuestAvailability?.(quest);
    if (availability?.available === false) {
      app.showToast?.(availability.reason || "Bunpro Review is not available right now.");
      return;
    }

    if (window.LifeRPGTime?.getActive?.()) {
      app.showToast?.("Another timer is already running. Stop or finish it first.");
      return;
    }

    const minutes = Math.max(1, Number(quest.planningMinutes || quest.units || 15));
    const started = window.LifeRPGTime?.startQuest?.({ questId: quest.id, minutes });
    if (!started) openJapaneseQuest("Bunpro Review");
  }

  function openJapaneseQuest(term = "") {
    app.showView?.("quests");
    window.setTimeout(() => {
      const japaneseFilter = document.querySelector('[data-realm-filter="Japanese"]');
      japaneseFilter?.click();

      const search = document.getElementById("questSearch");
      if (search) {
        search.value = term;
        search.dispatchEvent(new Event("input", { bubbles: true }));
        search.focus();
      }
    }, 30);
  }

  function openFilteredMedia(kind) {
    if (kind === "games") {
      app.showView?.("games");
      window.setTimeout(() => document.querySelector('[data-game-role="japanese"]')?.click(), 30);
      return;
    }
    app.showView?.("library");
    window.setTimeout(() => document.querySelector('[data-library-role="japanese"]')?.click(), 30);
  }

  function japaneseMedia() {
    const root = app.getState();
    const books = (root.bookLibrary?.items || []).filter(item => String(item?.role || "").toLowerCase() === "japanese");
    const games = (root.gameLibrary?.items || []).filter(item => String(item?.role || "").toLowerCase() === "japanese");
    return { books, games };
  }

  function latestJapaneseMedia() {
    const root = app.getState();
    const media = japaneseMedia();
    const bookById = Object.fromEntries(media.books.map(item => [item.id, item]));
    const gameById = Object.fromEntries(media.games.map(item => [item.id, item]));
    const candidates = [];

    (root.bookLibrary?.logs || []).forEach(log => {
      const item = bookById[log?.bookId];
      if (!item) return;
      candidates.push({
        kind: "book",
        title: item.title || item.name || "Japanese book",
        at: log.at || log.createdAt || item.lastReadAt || 0
      });
    });

    (root.gameLibrary?.logs || []).forEach(log => {
      const item = gameById[log?.gameId];
      if (!item) return;
      candidates.push({
        kind: "game",
        title: item.title || item.name || "Japanese game",
        at: log.at || log.createdAt || item.lastPlayedAt || 0
      });
    });

    return candidates.sort((a, b) => timestamp(b.at) - timestamp(a.at))[0] || null;
  }

  function returnToLastImmersion() {
    const latest = latestJapaneseMedia();
    if (!latest) {
      openFilteredMedia("library");
      return;
    }
    openFilteredMedia(latest.kind === "game" ? "games" : "library");
  }

  function smartRouteDescription() {
    const status = kotobaStatus();
    const due = dueCounts(status);

    if (status?.enabled && due.total > 0) {
      return {
        kind: due.total <= 5 ? "kotoba-tiny" : "kotoba-quick",
        label: due.total <= 5 ? `🌱 Tiny Japanese · ${due.total} due` : `🌸 Quick Japanese · ${due.total} due`,
        reason: `Kotoba currently reports ${due.total} due item${due.total === 1 ? "" : "s"}, so the smart route starts with real SRS rather than inventing another task.`
      };
    }

    const review = findQuestByRole("bunpro-reviews");
    const availability = review ? app.getQuestAvailability?.(review) : null;
    if (review && availability?.available !== false) {
      return {
        kind: "bunpro-review",
        label: "文 Start Bunpro Review Block",
        reason: "Kotoba does not currently report a due queue, and the existing Bunpro Review quest is available."
      };
    }

    const latest = latestJapaneseMedia();
    if (latest) {
      return {
        kind: "return-immersion",
        label: `${latest.kind === "book" ? "📖" : "🎮"} Return to ${latest.title}`,
        reason: "There is no higher-priority due route, so the tree offers the Japanese immersion activity you most recently logged."
      };
    }

    return {
      kind: "quests",
      label: "🌸 Open Japanese Quest shelf",
      reason: "There is no due SRS queue or previous immersion trail to resume, so the smart route opens the existing Japanese quests."
    };
  }

  function smartJapanese() {
    const route = smartRouteDescription();
    if (route.kind === "kotoba-tiny") startKotoba("tiny");
    else if (route.kind === "kotoba-quick") startKotoba("quick");
    else if (route.kind === "bunpro-review") startBunproReview();
    else if (route.kind === "return-immersion") returnToLastImmersion();
    else openJapaneseQuest("");
  }

  function scheduleBonusPass() {
    if (applyingBonus || !purchased("everyday-japanese")) return;
    window.setTimeout(applyBonus, 70);
  }

  function applyBonus() {
    if (applyingBonus || !purchased("everyday-japanese")) return;
    applyingBonus = true;

    try {
      const unlockedAt = purchaseTime("everyday-japanese");
      const dates = new Set();

      skillEvents().forEach(event => {
        if (event?.skillId !== SKILL_ID || event?.metadata?.dateUncertain) return;
        const at = timestamp(event.at);
        if (!at || at < unlockedAt) return;
        dates.add(localDateKey(new Date(at)));
      });

      [...dates].sort().forEach(date => {
        const sourceId = `everyday-japanese:${date}`;
        if (hasLedgerClaim(sourceId)) return;

        const reward = app.awardActivity?.({
          source: "japanese-talent-bonus",
          sourceId,
          label: "Everyday Japanese",
          realm: REALM,
          capability: "japanese",
          xp: 0,
          realmXP: 1,
          statXP: 0,
          coins: 0,
          storyEnergyBase: 0,
          progressionRelevant: false,
          at: `${date}T23:51:00`,
          metadata: { talentTree: "japanese", realmXPBonus: 1 }
        });

        if (!reward) return;
        state().bonusClaims[sourceId] = reward.eventId || true;
        app.saveState({ source: "japanese-talent-bonus" });

        if (date === localDateKey(new Date())) {
          app.showToast?.("🌸 Everyday Japanese · +1 Japanese Realm XP");
        }
      });
    } finally {
      applyingBonus = false;
      render();
    }
  }

  function hasLedgerClaim(sourceId) {
    return (app.getState().rewardLedger?.events || []).some(event =>
      event?.source === "japanese-talent-bonus" && event?.sourceId === sourceId
    );
  }

  function skillEvents() {
    return Array.isArray(app.getState().skills?.events)
      ? app.getState().skills.events
      : [];
  }

  function recentSkillXp(days) {
    const after = Date.now() - Math.max(1, Number(days || 1)) * 86400000;
    return skillEvents()
      .filter(event => event?.skillId === SKILL_ID && timestamp(event.at) >= after)
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

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function timestamp(value) {
    const n = typeof value === "number" ? value : new Date(value || 0).getTime();
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function round2(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function fmt(value) {
    const n = round2(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function friendlyError(error) {
    return String(error?.message || error || "Japanese action could not start.").slice(0, 260);
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  window.LifeRPGJapaneseTree = {
    version: VERSION,
    nodes: NODES.map(item => ({ ...item })),
    open: () => {
      skills.open?.();
      window.setTimeout(() => skills.selectTalentRealm?.(REALM), 20);
    },
    render
  };
})();
