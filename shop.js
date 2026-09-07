(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG shop could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 1;
  const FILTERS = new Set(["wishlist", "redeemed", "purchased", "all"]);
  const NOTION_SEED = [
    { name: "New tea / matcha / fancy drink item", coinCost: 180, mode: "repeatable" },
    { name: "Nice pen or Marker", coinCost: 200 },
    { name: "Candle or wax melt", coinCost: 220, mode: "repeatable" },
    { name: "Hair accessory", coinCost: 250 },
    { name: "Nail care item", coinCost: 250 },
    { name: "Pretty notebook / journal", coinCost: 350 },
    { name: "Small storage box / organizer", coinCost: 350 },
    { name: "Tombow Dust Catch Mono Eraser", coinCost: 399, realPriceCents: 399, url: "https://www.amazon.de/-/en/dp/B007NFUSXO/" },
    { name: "Small plant", coinCost: 400 },
    { name: "Small art print / Poster", coinCost: 450 },
    { name: "Cute book sleeve", coinCost: 700 },
    { name: "Creative supplies mini-haul", coinCost: 800 },
    { name: "4 Sakura Coasters", coinCost: 899, realPriceCents: 899, url: "https://www.amazon.de/-/en/dp/B09PRCK8P2/" },
    { name: "Online course / workshop under 25€", coinCost: 900 },
    { name: "Art supplies upgrade", coinCost: 900 },
    { name: "One guilt-free “I just want it” purchase", coinCost: 1000 },
    { name: "Outfit / Accessory piece I usually talk myself out of", coinCost: 1300 },
    { name: "Sakura dessert bowls", coinCost: 1399, realPriceCents: 1399, url: "https://www.amazon.de/-/en/dp/B09NPL9KZK/" },
    { name: "One physical fiction book", coinCost: 1500 },
    { name: "One nonfiction book", coinCost: 1500 },
    { name: "Wooden Sakura Tea Tray", coinCost: 2589, realPriceCents: 2589, url: "https://www.amazon.de/-/en/dp/B0BZSDJ91F/" },
    { name: "Women’s Platform Boots white", coinCost: 2799, realPriceCents: 2799, url: "https://www.amazon.de/-/en/dp/B09KVBPQN7/" },
    { name: "Sakura Travel Wooden Puzzle", coinCost: 2995, realPriceCents: 2995, url: "https://www.amazon.de/-/en/dp/B0D3LGSLT4/" },
    { name: "Bakugo Wallet", coinCost: 2999, realPriceCents: 2999, url: "https://www.amazon.de/-/en/dp/B08W5H35S7/" },
    { name: "Sakura Izakaya Book Nook", coinCost: 3699, realPriceCents: 3699, url: "https://www.amazon.de/dp/B0GT3MRTZ7/" },
    { name: "Paw Cushion Seat", coinCost: 3699, realPriceCents: 3699, url: "https://www.amazon.de/-/en/dp/B0BQGY21N9/" },
    { name: "Sakura Kimono Book Nook", coinCost: 3779, realPriceCents: 3779, url: "https://www.amazon.de/-/en/dp/B0G1RT1KW1/" },
    { name: "Zen Garden", coinCost: 3997, realPriceCents: 3997, url: "https://www.amazon.de/-/en/dp/B089VZGHLF/" },
    { name: "Ita Women’s TV Shoulder Bag", coinCost: 4100, realPriceCents: 4100, url: "https://www.amazon.de/-/en/dp/B0D7C88TZS/" },
    { name: "Mannequin", coinCost: 4199, realPriceCents: 4199, url: "https://www.amazon.de/-/en/dp/B0F293J4P7/" },
    { name: "Rolife Sakura Densya DIY Book Nook", coinCost: 4395, realPriceCents: 4395, url: "https://www.amazon.de/-/en/dp/B0B1JF55KS/" },
    { name: "Rolife Book Nook Kits Falling Sakura", coinCost: 4395, realPriceCents: 4395, url: "https://www.amazon.de/-/en/dp/B0C2DCZMVH/" },
    { name: "Cottagecore Bag", coinCost: 4621, realPriceCents: 4621, url: "https://www.etsy.com/de-en/listing/1414779333/cottagecore-celestial-moon-black-canvas" },
    { name: "Totoro Lunch Box", coinCost: 4894, realPriceCents: 4894, url: "https://www.amazon.de/-/en/dp/B072KK558W/" },
    { name: "Sakura Dream Journey Model Kit Music Box", coinCost: 5036, realPriceCents: 5036, url: "https://www.amazon.de/-/en/dp/B0FFT661QT/" },
    { name: "Lepro AI Smart Table Lamp", coinCost: 5211, realPriceCents: 5211, url: "https://www.amazon.de/-/en/dp/B0DCJ9MDTL/" },
    { name: "Sakura Mouse", coinCost: 5664, realPriceCents: 5664, url: "https://www.amazon.de/-/en/dp/B0BYDJ9LW5/" },
    { name: "Japanese Wall Decoration Set of 2 40x60", coinCost: 6299, realPriceCents: 6299, url: "https://www.amazon.de/dp/B0F2FWC55Z/" }
  ];

  const els = {
    walletCoins: byId("shopWalletCoins"),
    walletMoney: byId("shopWalletMoney"),
    currentWish: byId("shopCurrentWish"),
    currentWishEmpty: byId("shopCurrentWishEmpty"),
    dashboardWish: byId("dashboardShopWish"),
    grid: byId("shopGrid"),
    empty: byId("shopEmpty"),
    filters: byId("shopFilters"),
    history: byId("shopHistory"),
    add: byId("shopAddButton"),
    dialog: byId("shopItemDialog"),
    form: byId("shopItemForm"),
    dialogTitle: byId("shopItemDialogTitle"),
    itemId: byId("shopItemId"),
    name: byId("shopItemName"),
    url: byId("shopItemUrl"),
    image: byId("shopItemImage"),
    description: byId("shopItemDescription"),
    realPrice: byId("shopItemRealPrice"),
    coinCost: byId("shopItemCoinCost"),
    mode: byId("shopItemMode"),
    status: byId("shopItemStatus"),
    fetch: byId("shopFetchMetadata"),
    metadataStatus: byId("shopMetadataStatus")
  };

  let activeFilter = "wishlist";
  let metadataBusy = false;

  init();

  function init() {
    const changed = ensureState();
    bindEvents();
    render();
    if (changed) app.saveState({ source: "shop-v0306-init" });
    window.addEventListener("life-rpg:render", render);
    window.addEventListener("life-rpg:state-saved", event => {
      if (event?.detail?.source?.startsWith("shop")) return;
      ensureState();
      render();
    });
  }

  function byId(id) { return document.getElementById(id); }
  function id(prefix = "shop") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.shop || typeof root.shop !== "object" || Array.isArray(root.shop)) {
      root.shop = { schemaVersion: SCHEMA, items: [], transactions: [], currentWishId: null, seededNotionV306: false, createdAt: Date.now() };
      changed = true;
    }
    const shop = root.shop;
    if (Number(shop.schemaVersion || 0) < SCHEMA) { shop.schemaVersion = SCHEMA; changed = true; }
    if (!Array.isArray(shop.items)) { shop.items = []; changed = true; }
    if (!Array.isArray(shop.transactions)) { shop.transactions = []; changed = true; }
    if (!shop.seededNotionV306) {
      if (!shop.items.length) {
        const now = new Date().toISOString();
        shop.items = NOTION_SEED.map((seed, index) => normalizeItem({
          ...seed,
          id: `notion-reward-${index + 1}`,
          status: "wishlist",
          source: "notion-v0306",
          createdAt: now,
          updatedAt: now
        }));
      }
      shop.seededNotionV306 = true;
      changed = true;
    }
    shop.items = shop.items.map(normalizeItem);
    shop.transactions = shop.transactions.filter(Boolean).slice(-1000);
    if (shop.currentWishId && !shop.items.some(item => item.id === shop.currentWishId && !["purchased", "archived"].includes(item.status))) {
      shop.currentWishId = null;
      changed = true;
    }
    return changed;
  }

  function normalizeItem(item = {}) {
    const realPriceCents = finiteOrNull(item.realPriceCents);
    const cost = Math.max(0, Math.round(Number(item.coinCost ?? realPriceCents ?? 0)));
    return {
      id: item.id || id("shop-item"),
      name: clean(item.name) || "Untitled reward",
      url: clean(item.url),
      imageUrl: clean(item.imageUrl),
      description: clean(item.description),
      realPriceCents,
      coinCost: cost,
      mode: item.mode === "repeatable" ? "repeatable" : "one-time",
      status: ["wishlist", "available", "redeemed", "purchased", "archived"].includes(item.status) ? item.status : "wishlist",
      source: clean(item.source) || "manual",
      redemptionCoins: finiteOrNull(item.redemptionCoins),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      redeemedAt: item.redeemedAt || null,
      purchasedAt: item.purchasedAt || null
    };
  }

  function state() { ensureState(); return app.getState().shop; }

  function bindEvents() {
    els.add?.addEventListener("click", () => openEditor());
    els.filters?.addEventListener("click", event => {
      const button = event.target.closest?.("[data-shop-filter]");
      if (!button || !FILTERS.has(button.dataset.shopFilter)) return;
      activeFilter = button.dataset.shopFilter;
      render();
    });
    els.grid?.addEventListener("click", handleActionClick);
    els.currentWish?.addEventListener("click", handleActionClick);
    els.history?.addEventListener("click", handleActionClick);
    els.form?.addEventListener("submit", saveEditor);
    els.fetch?.addEventListener("click", fetchMetadata);
    els.realPrice?.addEventListener("change", () => {
      if (!els.coinCost?.value) {
        const cents = parseMoneyToCents(els.realPrice.value);
        if (cents != null) els.coinCost.value = String(cents);
      }
    });
  }

  function handleActionClick(event) {
    const button = event.target.closest?.("[data-shop-action]");
    if (!button) return;
    const itemId = button.dataset.shopItem;
    switch (button.dataset.shopAction) {
      case "edit": openEditor(itemId); break;
      case "pin": setCurrentWish(itemId); break;
      case "redeem": redeem(itemId); break;
      case "refund": refund(itemId); break;
      case "bought": markBought(itemId); break;
      case "delete": removeItem(itemId); break;
      case "open": openLink(itemId); break;
      case "restore": restorePurchased(itemId); break;
    }
  }

  function openEditor(itemId = null) {
    const item = itemId ? state().items.find(entry => entry.id === itemId) : null;
    if (els.dialogTitle) els.dialogTitle.textContent = item ? "Edit reward" : "Add a reward";
    if (els.itemId) els.itemId.value = item?.id || "";
    if (els.name) els.name.value = item?.name || "";
    if (els.url) els.url.value = item?.url || "";
    if (els.image) els.image.value = item?.imageUrl || "";
    if (els.description) els.description.value = item?.description || "";
    if (els.realPrice) els.realPrice.value = item?.realPriceCents == null ? "" : (item.realPriceCents / 100).toFixed(2).replace(".", ",");
    if (els.coinCost) els.coinCost.value = item?.coinCost ? String(item.coinCost) : "";
    if (els.mode) els.mode.value = item?.mode || "one-time";
    if (els.status) els.status.value = item?.status === "available" ? "available" : "wishlist";
    setMetadataStatus(item?.url ? "You can refresh title/image from the link if you want." : "Paste a product link to try automatic details.");
    els.dialog?.showModal();
  }

  function saveEditor(event) {
    event.preventDefault();
    const name = clean(els.name?.value);
    if (!name) { setMetadataStatus("Give the reward a name first.", true); return; }
    const realPriceCents = parseMoneyToCents(els.realPrice?.value);
    const coinCostRaw = Math.round(Number(els.coinCost?.value || 0));
    const coinCost = coinCostRaw > 0 ? coinCostRaw : realPriceCents || 0;
    if (coinCost <= 0) { setMetadataStatus("Set a Coin cost (1 Coin = 1 Cent of reward value).", true); return; }
    const shop = state();
    const existingId = clean(els.itemId?.value);
    const existing = existingId ? shop.items.find(item => item.id === existingId) : null;
    const next = normalizeItem({
      ...(existing || {}),
      id: existing?.id || id("shop-item"),
      name,
      url: clean(els.url?.value),
      imageUrl: clean(els.image?.value),
      description: clean(els.description?.value),
      realPriceCents,
      coinCost,
      mode: els.mode?.value === "repeatable" ? "repeatable" : "one-time",
      status: existing?.status === "redeemed" || existing?.status === "purchased" ? existing.status : (els.status?.value === "available" ? "available" : "wishlist"),
      updatedAt: new Date().toISOString()
    });
    if (existing) shop.items[shop.items.indexOf(existing)] = next;
    else shop.items.unshift(next);
    els.dialog?.close();
    persist("shop-item-save");
    app.showToast?.(`🛍️ ${existing ? "Reward updated" : "Reward added"} · ${coinLabel(next.coinCost)}`);
  }

  async function fetchMetadata() {
    if (metadataBusy) return;
    const url = clean(els.url?.value);
    if (!/^https?:\/\//i.test(url)) { setMetadataStatus("Paste a full http(s) product link first.", true); return; }
    metadataBusy = true;
    if (els.fetch) els.fetch.disabled = true;
    setMetadataStatus("Looking for title, image and description…");
    try {
      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
      const payload = await response.json();
      const data = payload?.data || {};
      const title = clean(data.title);
      const description = clean(data.description);
      const image = clean(typeof data.image === "string" ? data.image : data.image?.url);
      if (title && els.name && !clean(els.name.value)) els.name.value = trimProductTitle(title);
      if (description && els.description && !clean(els.description.value)) els.description.value = description.slice(0, 600);
      if (image && els.image && !clean(els.image.value)) els.image.value = image;
      setMetadataStatus(title || image ? "Details found. Check them, then add the real price if it was not available." : "The link worked, but it did not expose useful product details. Manual entry still works.");
    } catch (error) {
      console.warn("Shop metadata lookup failed", error);
      setMetadataStatus("Automatic details were blocked or unavailable for this link. You can still paste name, image URL and price manually.", true);
    } finally {
      metadataBusy = false;
      if (els.fetch) els.fetch.disabled = false;
    }
  }

  function setCurrentWish(itemId) {
    const shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    if (!item || ["purchased", "archived"].includes(item.status)) return;
    shop.currentWishId = shop.currentWishId === itemId ? null : itemId;
    persist("shop-current-wish");
    app.showToast?.(shop.currentWishId ? `✦ Current Wish: ${item.name}` : "Current Wish unpinned.");
  }

  function redeem(itemId) {
    const root = app.getState();
    const shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    if (!item || item.status === "redeemed" || item.status === "purchased") return;
    const cost = Math.max(0, Number(item.coinCost || 0));
    if (cost <= 0) { app.showToast?.("This reward needs a Coin cost first."); return; }
    if (Number(root.coins || 0) < cost) {
      const missing = cost - Number(root.coins || 0);
      app.showToast?.(`Not quite yet · ${coinLabel(missing)} left to earn.`);
      return;
    }
    if (!window.confirm(`Redeem ${item.name} for ${coinLabel(cost)}?`)) return;
    root.coins = Math.max(0, Number(root.coins || 0) - cost);
    item.status = "redeemed";
    item.redeemedAt = new Date().toISOString();
    item.redemptionCoins = cost;
    item.updatedAt = item.redeemedAt;
    shop.transactions.push({ id: id("shop-tx"), itemId: item.id, itemName: item.name, type: "redeem", coins: -cost, at: item.redeemedAt });
    if (shop.currentWishId === item.id) shop.currentWishId = null;
    persist("shop-redeem");
    app.showToast?.(`✨ You earned this. ${coinLabel(cost)} redeemed.`);
  }

  function refund(itemId) {
    const root = app.getState();
    const shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    if (!item || item.status !== "redeemed") return;
    const coins = Math.max(0, Number(item.redemptionCoins ?? item.coinCost ?? 0));
    if (!window.confirm(`Cancel this redemption and return ${coinLabel(coins)}?`)) return;
    root.coins = Math.max(0, Number(root.coins || 0)) + coins;
    item.status = "wishlist";
    item.redeemedAt = null;
    item.redemptionCoins = null;
    item.updatedAt = new Date().toISOString();
    shop.transactions.push({ id: id("shop-tx"), itemId: item.id, itemName: item.name, type: "refund", coins, at: item.updatedAt });
    persist("shop-refund");
    app.showToast?.(`↻ ${coinLabel(coins)} returned to your wallet.`);
  }

  function markBought(itemId) {
    const shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    if (!item || item.status !== "redeemed") return;
    const now = new Date().toISOString();
    shop.transactions.push({ id: id("shop-tx"), itemId: item.id, itemName: item.name, type: "purchase", coins: 0, at: now });
    item.purchasedAt = now;
    item.updatedAt = now;
    item.redeemedAt = null;
    item.redemptionCoins = null;
    item.status = item.mode === "repeatable" ? "wishlist" : "purchased";
    persist("shop-purchased");
    app.showToast?.(item.mode === "repeatable" ? `🛍️ Logged · ${item.name} is available again whenever you want to earn it.` : `🛍️ ${item.name} added to your earned purchases.`);
  }

  function restorePurchased(itemId) {
    const item = state().items.find(entry => entry.id === itemId);
    if (!item || item.status !== "purchased") return;
    item.status = "wishlist";
    item.updatedAt = new Date().toISOString();
    persist("shop-restore");
  }

  function removeItem(itemId) {
    const shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    if (!item) return;
    if (item.status === "redeemed") { app.showToast?.("Refund the redemption before deleting this reward."); return; }
    if (!window.confirm(`Remove ${item.name} from the Shop? Purchase history will stay in the log.`)) return;
    shop.items = shop.items.filter(entry => entry.id !== itemId);
    if (shop.currentWishId === itemId) shop.currentWishId = null;
    persist("shop-item-delete");
  }

  function openLink(itemId) {
    const item = state().items.find(entry => entry.id === itemId);
    if (!item?.url) return;
    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  function persist(source) {
    app.saveState({ source });
    app.renderAll?.();
    render();
    window.dispatchEvent(new CustomEvent("life-rpg:shop-changed"));
  }

  function render() {
    if (!els.grid && !els.walletCoins) return;
    ensureState();
    renderWallet();
    renderCurrentWish();
    renderDashboardWish();
    renderFilters();
    renderGrid();
    renderHistory();
  }

  function renderWallet() {
    const coins = Math.max(0, Number(app.getState().coins || 0));
    if (els.walletCoins) els.walletCoins.textContent = formatInt(coins);
    if (els.walletMoney) els.walletMoney.textContent = app.formatCoinValue?.(coins) || `€${(coins / 100).toFixed(2)}`;
  }

  function renderCurrentWish() {
    if (!els.currentWish) return;
    const shop = state();
    const item = shop.items.find(entry => entry.id === shop.currentWishId);
    if (els.currentWishEmpty) els.currentWishEmpty.classList.toggle("hidden", Boolean(item));
    if (!item) { els.currentWish.innerHTML = ""; return; }
    const coins = Math.max(0, Number(app.getState().coins || 0));
    const cost = Math.max(1, Number(item.coinCost || 0));
    const percent = Math.min(100, coins / cost * 100);
    const missing = Math.max(0, cost - coins);
    els.currentWish.innerHTML = `
      <article class="shop-current-wish-card-v306">
        ${imageMarkup(item, "shop-current-wish-image-v306")}
        <div class="shop-current-wish-copy-v306">
          <small>CURRENT WISH · ${item.mode === "repeatable" ? "REPEATABLE" : "ONE-TIME"}</small>
          <h3>${esc(item.name)}</h3>
          <div class="shop-price-pair-v306"><strong>${coinLabel(item.coinCost)}</strong>${item.realPriceCents != null ? `<span>Real price ${money(item.realPriceCents)}</span>` : ""}</div>
          <div class="shop-wish-progress-v306"><div><span>${Math.round(percent)}% earned</span><strong>${missing > 0 ? `${coinLabel(missing)} to go` : "Ready to redeem ✨"}</strong></div><div class="progress large"><span style="width:${percent}%"></span></div></div>
          <div class="shop-card-actions-v306">
            <button class="primary-button" data-shop-action="redeem" data-shop-item="${attr(item.id)}" type="button" ${coins < cost ? "disabled" : ""}>${coins >= cost ? "Redeem reward" : "Keep earning"}</button>
            ${item.url ? `<button class="secondary-button" data-shop-action="open" data-shop-item="${attr(item.id)}" type="button">Open product</button>` : ""}
            <button class="ghost-button" data-shop-action="pin" data-shop-item="${attr(item.id)}" type="button">Unpin</button>
          </div>
        </div>
      </article>`;
  }

  function renderDashboardWish() {
    if (!els.dashboardWish) return;
    const shop = state();
    const item = shop.items.find(entry => entry.id === shop.currentWishId);
    if (!item) {
      els.dashboardWish.innerHTML = `<button class="dashboard-shop-empty-v306" data-shop-action="open-shop" type="button" onclick="window.LifeRPGApp?.showView('shop')"><span>🪙</span><div><strong>No reward target pinned.</strong><small>Choose a Current Wish when there is something nice you want to earn toward.</small></div><b>›</b></button>`;
      return;
    }
    const coins = Math.max(0, Number(app.getState().coins || 0));
    const cost = Math.max(1, Number(item.coinCost || 0));
    const percent = Math.min(100, coins / cost * 100);
    els.dashboardWish.innerHTML = `<button class="dashboard-shop-target-v306" type="button" onclick="window.LifeRPGApp?.showView('shop')">
      ${item.imageUrl ? `<span class="dashboard-shop-thumb-v306"><img src="${attr(item.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" /></span>` : `<span class="dashboard-shop-thumb-v306 placeholder">🛍️</span>`}
      <span class="dashboard-shop-copy-v306"><small>CURRENT WISH · ${Math.round(percent)}%</small><strong>${esc(item.name)}</strong><em>${coinLabel(coins)} in wallet · target ${coinLabel(item.coinCost)}</em><i class="achievement-mini-progress-v306"><b style="width:${percent}%"></b></i></span>
      <b>›</b>
    </button>`;
  }

  function renderFilters() {
    if (!els.filters) return;
    const shop = state();
    const labels = [
      ["wishlist", "Wishlist", shop.items.filter(item => ["wishlist", "available"].includes(item.status)).length],
      ["redeemed", "Redeemed", shop.items.filter(item => item.status === "redeemed").length],
      ["purchased", "Earned & bought", shop.items.filter(item => item.status === "purchased").length],
      ["all", "All", shop.items.filter(item => item.status !== "archived").length]
    ];
    els.filters.innerHTML = labels.map(([key, label, count]) => `<button class="shop-filter-v306 ${activeFilter === key ? "active" : ""}" data-shop-filter="${key}" type="button"><strong>${label}</strong><small>${count}</small></button>`).join("");
  }

  function renderGrid() {
    if (!els.grid) return;
    const shop = state();
    const items = shop.items
      .filter(item => item.status !== "archived")
      .filter(item => activeFilter === "all" || activeFilter === "wishlist" ? (activeFilter === "all" || ["wishlist", "available"].includes(item.status)) : item.status === activeFilter)
      .sort((a, b) => {
        if (shop.currentWishId === a.id) return -1;
        if (shop.currentWishId === b.id) return 1;
        return Number(a.coinCost || 0) - Number(b.coinCost || 0) || a.name.localeCompare(b.name);
      });
    if (els.empty) els.empty.classList.toggle("hidden", items.length > 0);
    els.grid.innerHTML = items.map(item => shopCard(item)).join("");
  }

  function shopCard(item) {
    const shop = state();
    const coins = Math.max(0, Number(app.getState().coins || 0));
    const current = shop.currentWishId === item.id;
    const affordable = coins >= Number(item.coinCost || 0);
    const redeemed = item.status === "redeemed";
    const purchased = item.status === "purchased";
    return `
      <article class="shop-item-card-v306 ${current ? "current" : ""} ${redeemed ? "redeemed" : ""} ${purchased ? "purchased" : ""}">
        ${imageMarkup(item, "shop-item-image-v306")}
        <div class="shop-item-body-v306">
          <div class="shop-item-meta-v306"><span>${item.mode === "repeatable" ? "↻ REPEATABLE" : "✦ ONE-TIME"}</span><b>${redeemed ? "REDEEMED" : purchased ? "BOUGHT" : current ? "CURRENT WISH" : affordable ? "READY" : "WISHLIST"}</b></div>
          <h3>${esc(item.name)}</h3>
          ${item.description ? `<p>${esc(item.description)}</p>` : ""}
          <div class="shop-price-pair-v306"><strong>${coinLabel(item.coinCost)}</strong>${item.realPriceCents != null ? `<span>${money(item.realPriceCents)}</span>` : `<span>Reward value</span>`}</div>
          <div class="shop-item-progress-v306"><div class="progress"><span style="width:${Math.min(100, Number(item.coinCost || 1) ? coins / Number(item.coinCost || 1) * 100 : 100)}%"></span></div><small>${affordable ? "You can afford this reward." : `${coinLabel(Math.max(0, Number(item.coinCost || 0) - coins))} left`}</small></div>
          <div class="shop-card-actions-v306">
            ${!redeemed && !purchased ? `<button class="${affordable ? "primary-button" : "secondary-button"}" data-shop-action="redeem" data-shop-item="${attr(item.id)}" type="button" ${affordable ? "" : "disabled"}>${affordable ? "Redeem" : "Not yet"}</button>` : ""}
            ${redeemed ? `<button class="primary-button" data-shop-action="bought" data-shop-item="${attr(item.id)}" type="button">Mark bought</button><button class="secondary-button" data-shop-action="refund" data-shop-item="${attr(item.id)}" type="button">Cancel & refund</button>` : ""}
            ${purchased ? `<button class="secondary-button" data-shop-action="restore" data-shop-item="${attr(item.id)}" type="button">Back to wishlist</button>` : ""}
            ${!redeemed && !purchased ? `<button class="ghost-button ${current ? "active" : ""}" data-shop-action="pin" data-shop-item="${attr(item.id)}" type="button">${current ? "Current Wish ✓" : "Pin wish"}</button>` : ""}
            ${item.url ? `<button class="ghost-button" data-shop-action="open" data-shop-item="${attr(item.id)}" type="button">Open link</button>` : ""}
            <button class="ghost-button" data-shop-action="edit" data-shop-item="${attr(item.id)}" type="button">Edit</button>
            <button class="ghost-button danger" data-shop-action="delete" data-shop-item="${attr(item.id)}" type="button">Remove</button>
          </div>
        </div>
      </article>`;
  }

  function renderHistory() {
    if (!els.history) return;
    const transactions = state().transactions.slice().reverse().slice(0, 20);
    if (!transactions.length) {
      els.history.innerHTML = `<span class="muted">Redeemed rewards will build a little history here.</span>`;
      return;
    }
    els.history.innerHTML = transactions.map(tx => {
      const verb = tx.type === "redeem" ? "Redeemed" : tx.type === "refund" ? "Refunded" : "Bought";
      const coinText = tx.coins ? `${tx.coins > 0 ? "+" : ""}${formatInt(tx.coins)} 🪙` : "";
      return `<div class="shop-history-row-v306"><span>${tx.type === "redeem" ? "✨" : tx.type === "refund" ? "↻" : "🛍️"}</span><div><strong>${esc(tx.itemName || "Reward")}</strong><small>${verb} · ${shortDate(tx.at)}</small></div><b>${coinText}</b></div>`;
    }).join("");
  }

  function imageMarkup(item, className) {
    if (item.imageUrl) return `<div class="${className}"><img src="${attr(item.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" /></div>`;
    return `<div class="${className} placeholder" aria-hidden="true"><span>🛍️</span><small>reward</small></div>`;
  }

  function parseMoneyToCents(value) {
    const raw = clean(value);
    if (!raw) return null;
    const normalized = raw.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.round(number * 100);
  }

  function finiteOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }

  function money(cents) { return app.formatCoinValue?.(cents) || `€${(Number(cents || 0) / 100).toFixed(2)}`; }
  function coinLabel(coins) { return `${formatInt(coins)} 🪙 · ${money(coins)}`; }
  function formatInt(value) { return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.round(Number(value || 0))); }
  function shortDate(value) { const d = new Date(value || 0); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d) : ""; }
  function clean(value) { return String(value ?? "").trim(); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : clean(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function attr(value) { return esc(value).replaceAll("`", "&#96;"); }
  function trimProductTitle(value) { return clean(value).replace(/\s*[:|–-]\s*Amazon\.[^|]+$/i, "").slice(0, 180); }
  function setMetadataStatus(text, error = false) { if (els.metadataStatus) { els.metadataStatus.textContent = text; els.metadataStatus.classList.toggle("error", error); } }

  window.LifeRPGShop = {
    render,
    getItems: () => state().items.map(item => ({ ...item })),
    getTransactions: () => state().transactions.map(tx => ({ ...tx })),
    getCurrentWish: () => {
      const item = state().items.find(entry => entry.id === state().currentWishId);
      return item ? { ...item } : null;
    }
  };
})();
