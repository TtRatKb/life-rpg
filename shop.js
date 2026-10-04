(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG shop could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const SCHEMA = 3;
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
    refreshLinkedPrices: byId("shopRefreshLinkedPrices"),
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
    metadataStatus: byId("shopMetadataStatus"),
    priceDialog: byId("shopPriceDialog"), priceForm: byId("shopPriceForm"),
    priceTitle: byId("shopPriceTitle"), priceOriginal: byId("shopPriceOriginal"),
    priceCurrent: byId("shopPriceCurrent"), priceActual: byId("shopPriceActual"),
    priceBalance: byId("shopPriceBalance"), priceError: byId("shopPriceError"),
    priceSubmit: byId("shopPriceSubmit"), priceCancel: byId("shopPriceCancel")
  };

  let activeFilter = "wishlist";
  let metadataBusy = false;
  let pendingPriceAction = null;
  let linkedPriceBusy = false;

  init();

  function init() {
    const changed = ensureState();
    const linkedChanged = syncLinkedLibraryItems();
    bindEvents();
    render();
    if (changed || linkedChanged) app.saveState({ source: "shop-v0314dz14-init", suppressUiRefresh: true });
    window.addEventListener("life-rpg:render", render);
    window.addEventListener("life-rpg:state-saved", event => {
      if (event?.detail?.source?.startsWith("shop")) return;
      ensureState();
      const autoChanged = syncLinkedLibraryItems();
      if (autoChanged) app.saveState({ source: "shop-auto-library-sync", suppressUiRefresh: true });
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
      autoManaged: Boolean(item.autoManaged),
      linkedType: ["game", "book"].includes(item.linkedType) ? item.linkedType : "",
      linkedId: clean(item.linkedId),
      priceCheckedAt: finiteOrNull(item.priceCheckedAt),
      priceSource: clean(item.priceSource),
      currency: clean(item.currency) || "EUR",
      listPriceCents: finiteOrNull(item.listPriceCents),
      redemptionCoins: finiteOrNull(item.redemptionCoins),
      initialPriceCents: finiteOrNull(item.initialPriceCents) ?? (realPriceCents ?? (cost > 0 ? cost : null)),
      priceHistory: Array.isArray(item.priceHistory) ? item.priceHistory.filter(Boolean).slice(-30) : [],
      purchasePriceCents: finiteOrNull(item.purchasePriceCents),
      purchaseCoins: finiteOrNull(item.purchaseCoins),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      redeemedAt: item.redeemedAt || null,
      purchasedAt: item.purchasedAt || null
    };
  }

  function gameOwned(game = {}) {
    if (typeof game.owned === "boolean") return game.owned;
    if (game.status && game.status !== "backlog") return true;
    return Number(game.steamLibrarySyncedAt || 0) > 0 || Number(game.steamPlaytimeMinutes || 0) > 0 || Number(game.steamLastPlayedAt || 0) > 0;
  }

  function bookNeedsShop(book = {}) {
    if (book.status !== "want") return false;
    return !["ku", "borrowed"].includes(String(book.source || "").toLowerCase());
  }

  function linkedId(type, sourceId) {
    return `auto-${type}-${String(sourceId || "").replace(/[^a-z0-9_-]/gi, "-")}`;
  }

  function syncLinkedLibraryItems() {
    const root = app.getState();
    const shop = root.shop;
    if (!shop?.items) return false;
    const desired = new Map();

    for (const game of root.gameLibrary?.items || []) {
      if (!game?.id || game.status !== "backlog" || gameOwned(game)) continue;
      const appId = String(game.steamAppId || "").replace(/\D/g, "");
      const key = `game:${game.id}`;
      desired.set(key, {
        id: linkedId("game", game.id),
        name: String(game.title || "Untitled game"),
        imageUrl: String(game.coverUrl || (appId ? `https://cdn.akamai.steamstatic.com/steam/apps/${encodeURIComponent(appId)}/header.jpg` : "")),
        url: appId ? `https://store.steampowered.com/app/${encodeURIComponent(appId)}/` : "",
        description: `🎮 Want to Play · not owned${game.platform ? ` · ${game.platform}` : ""}`,
        source: "game-library",
        linkedType: "game",
        linkedId: String(game.id),
        autoManaged: true,
        mode: "one-time"
      });
    }

    for (const book of root.bookLibrary?.items || []) {
      if (!book?.id || !bookNeedsShop(book)) continue;
      const isbn = String(book.isbn || "").replace(/[^0-9X]/gi, "");
      const key = `book:${book.id}`;
      const role = book.source === "kindle" ? "Kindle" : book.source === "audio" ? "Audiobook" : "Book";
      desired.set(key, {
        id: linkedId("book", book.id),
        name: String(book.title || "Untitled book"),
        imageUrl: String(book.coverUrl || ""),
        url: isbn ? `https://books.google.com/books?vid=ISBN${encodeURIComponent(isbn)}` : "",
        description: `📚 Want to Read · ${role} · not owned / not KU`,
        source: "book-library",
        linkedType: "book",
        linkedId: String(book.id),
        autoManaged: true,
        mode: "one-time"
      });
    }

    let changed = false;
    const existingByKey = new Map(shop.items.filter(item => item.autoManaged && item.linkedType && item.linkedId).map(item => [`${item.linkedType}:${item.linkedId}`, item]));

    for (const [key, spec] of desired) {
      const existing = existingByKey.get(key);
      if (!existing) {
        shop.items.unshift(normalizeItem({
          ...spec,
          coinCost: 0,
          realPriceCents: null,
          status: "wishlist",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        changed = true;
        continue;
      }
      const prior = JSON.stringify([existing.name, existing.imageUrl, existing.url, existing.description, existing.source, existing.autoManaged, existing.linkedType, existing.linkedId, existing.status]);
      existing.name = spec.name;
      if (spec.imageUrl) existing.imageUrl = spec.imageUrl;
      if (!existing.url && spec.url) existing.url = spec.url;
      existing.description = spec.description;
      existing.source = spec.source;
      existing.autoManaged = true;
      existing.linkedType = spec.linkedType;
      existing.linkedId = spec.linkedId;
      if (existing.status === "archived") existing.status = "wishlist";
      const next = JSON.stringify([existing.name, existing.imageUrl, existing.url, existing.description, existing.source, existing.autoManaged, existing.linkedType, existing.linkedId, existing.status]);
      if (prior !== next) { existing.updatedAt = new Date().toISOString(); changed = true; }
    }

    for (const item of shop.items) {
      if (!item.autoManaged || !item.linkedType || !item.linkedId) continue;
      const key = `${item.linkedType}:${item.linkedId}`;
      if (desired.has(key) || ["redeemed", "purchased"].includes(item.status)) continue;
      if (item.status !== "archived") {
        item.status = "archived";
        item.updatedAt = new Date().toISOString();
        changed = true;
      }
    }

    if (shop.currentWishId && !shop.items.some(item => item.id === shop.currentWishId && !["purchased", "archived"].includes(item.status))) {
      shop.currentWishId = null;
      changed = true;
    }
    return changed;
  }

  function linkedEntity(item) {
    const root = app.getState();
    if (item?.linkedType === "game") return (root.gameLibrary?.items || []).find(game => String(game.id) === String(item.linkedId)) || null;
    if (item?.linkedType === "book") return (root.bookLibrary?.items || []).find(book => String(book.id) === String(item.linkedId)) || null;
    return null;
  }

  function applyLinkedPurchase(item, purchased = true) {
    const entity = linkedEntity(item);
    if (!entity) return false;
    entity.updatedAt = Date.now();
    if (item.linkedType === "game") {
      entity.owned = Boolean(purchased);
      if (!purchased) entity.status = "backlog";
      else if (entity.status !== "backlog") entity.owned = true;
      return true;
    }
    if (item.linkedType === "book") {
      entity.status = purchased ? "owned" : "want";
      return true;
    }
    return false;
  }

  function normalizeCompare(value) {
    return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  async function fetchSteamLinkedPrice(item, game) {
    const appId = String(game?.steamAppId || "").replace(/\D/g, "");
    if (!appId) throw new Error("No Steam App ID attached to this game.");
    const workerUrl = String(app.getState().integrations?.steam?.workerUrl || "").replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(workerUrl)) throw new Error("Configure the Steam Worker in Settings first.");
    const response = await fetch(`${workerUrl}/api/steam/store?appid=${encodeURIComponent(appId)}&cc=DE&lang=german`, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Steam price lookup failed (${response.status}). Update the Steam Worker to v5 if needed.`);
    return {
      cents: payload.isFree ? 0 : finiteOrNull(payload.finalPriceCents),
      listCents: finiteOrNull(payload.initialPriceCents),
      currency: String(payload.currency || "EUR"),
      url: String(payload.storeUrl || `https://store.steampowered.com/app/${appId}/`),
      imageUrl: String(payload.headerImage || game.coverUrl || ""),
      source: "Steam Store · DE"
    };
  }

  async function fetchBookLinkedPrice(item, book) {
    const isbn = String(book?.isbn || "").toUpperCase().replace(/[^0-9X]/g, "");
    const title = String(book?.title || "").trim();
    const author = String(book?.author || "").trim();
    const query = isbn ? `isbn:${isbn}` : [title ? `intitle:"${title}"` : "", author ? `inauthor:"${author}"` : ""].filter(Boolean).join(" ");
    if (!query) throw new Error("This book needs a title or ISBN before a price can be checked.");
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&projection=full`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Google Books price lookup failed (${response.status}).`);
    const candidates = Array.isArray(payload.items) ? payload.items : [];
    const wantedTitle = normalizeCompare(title);
    const wantedAuthor = normalizeCompare(author);
    const match = candidates.find(entry => {
      const info = entry?.volumeInfo || {};
      const ids = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers.map(x => String(x.identifier || "").replace(/[^0-9X]/gi, "")) : [];
      if (isbn && ids.includes(isbn)) return true;
      const sameTitle = wantedTitle && normalizeCompare(info.title) === wantedTitle;
      const authors = Array.isArray(info.authors) ? info.authors.map(normalizeCompare) : [];
      return sameTitle && (!wantedAuthor || authors.some(a => a === wantedAuthor || a.includes(wantedAuthor) || wantedAuthor.includes(a)));
    }) || candidates.find(entry => entry?.saleInfo?.retailPrice || entry?.saleInfo?.listPrice) || candidates[0];
    if (!match) throw new Error("Google Books did not return a matching edition.");
    const sale = match.saleInfo || {};
    const price = sale.retailPrice || sale.listPrice || null;
    if (!price || !Number.isFinite(Number(price.amount))) throw new Error("No current sale price is exposed for this edition. You can still add a product link/price manually.");
    const currency = String(price.currencyCode || "EUR");
    if (currency !== "EUR") throw new Error(`Google Books returned ${currency}, not EUR. Add the local price manually.`);
    const info = match.volumeInfo || {};
    return {
      cents: Math.max(0, Math.round(Number(price.amount) * 100)),
      listCents: sale.listPrice && Number.isFinite(Number(sale.listPrice.amount)) ? Math.max(0, Math.round(Number(sale.listPrice.amount) * 100)) : null,
      currency,
      url: String(sale.buyLink || item.url || ""),
      imageUrl: String(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || book.coverUrl || "").replace(/^http:/i, "https:"),
      source: "Google Books · sale price"
    };
  }

  function applyLinkedPrice(item, result) {
    const now = new Date().toISOString();
    const prior = finiteOrNull(item.realPriceCents);
    item.realPriceCents = result.cents;
    item.coinCost = Math.max(0, Number(result.cents || 0));
    item.listPriceCents = result.listCents;
    item.currency = result.currency || "EUR";
    item.priceSource = result.source || "";
    item.priceCheckedAt = Date.now();
    if (result.url) item.url = result.url;
    if (result.imageUrl) item.imageUrl = result.imageUrl;
    if (item.initialPriceCents == null && result.cents != null) item.initialPriceCents = result.cents;
    item.priceHistory ||= [];
    if (prior != null && result.cents != null && prior !== result.cents) item.priceHistory.push({ at: now, fromCents: prior, toCents: result.cents, stage: "auto-check" });
    item.priceHistory = item.priceHistory.slice(-30);
    item.updatedAt = now;
  }

  async function refreshLinkedPrice(itemId, { silent = false } = {}) {
    const item = state().items.find(entry => entry.id === itemId);
    if (!item?.autoManaged) return false;
    const entity = linkedEntity(item);
    if (!entity) return false;
    try {
      const result = item.linkedType === "game"
        ? await fetchSteamLinkedPrice(item, entity)
        : await fetchBookLinkedPrice(item, entity);
      if (result.cents == null) throw new Error("No current price was returned.");
      applyLinkedPrice(item, result);
      persist("shop-linked-price-refresh");
      if (!silent) app.showToast?.(result.cents === 0 ? `🛍️ ${item.name} is currently free.` : `🛍️ ${item.name} · ${money(result.cents)} checked.`);
      return true;
    } catch (error) {
      console.warn("Linked Shop price lookup failed", error);
      if (!silent) app.showToast?.(`Preis konnte nicht automatisch geprüft werden · ${String(error?.message || error)}`);
      return false;
    }
  }

  async function refreshAllLinkedPrices() {
    if (linkedPriceBusy) return;
    linkedPriceBusy = true;
    if (els.refreshLinkedPrices) {
      els.refreshLinkedPrices.disabled = true;
      els.refreshLinkedPrices.textContent = "Preise werden geprüft…";
    }
    const items = state().items.filter(item => item.autoManaged && ["wishlist", "available"].includes(item.status));
    let ok = 0, failed = 0;
    for (const item of items) {
      const result = await refreshLinkedPrice(item.id, { silent: true });
      if (result) ok += 1; else failed += 1;
    }
    linkedPriceBusy = false;
    if (els.refreshLinkedPrices) {
      els.refreshLinkedPrices.disabled = false;
      els.refreshLinkedPrices.textContent = "↻ Preise prüfen";
    }
    app.showToast?.(`🛍️ Preischeck fertig · ${ok} aktualisiert${failed ? ` · ${failed} ohne verlässlichen Preis` : ""}.`);
    render();
  }

  function state() { ensureState(); return app.getState().shop; }

  function bindEvents() {
    els.add?.addEventListener("click", () => openEditor());
    els.refreshLinkedPrices?.addEventListener("click", refreshAllLinkedPrices);
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
    els.priceForm?.addEventListener("submit", confirmPriceAction);
    els.priceCancel?.addEventListener("click", () => els.priceDialog?.close());
    els.priceDialog?.addEventListener("close", () => { pendingPriceAction = null; });
    els.priceActual?.addEventListener("input", refreshPricePreview);
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
      case "redeem": openPriceReview(itemId, "redeem"); break;
      case "refund": refund(itemId); break;
      case "bought": openPriceReview(itemId, "purchase"); break;
      case "delete": removeItem(itemId); break;
      case "open": openLink(itemId); break;
      case "restore": restorePurchased(itemId); break;
      case "refresh-price": refreshLinkedPrice(itemId); break;
      case "open-source": {
        const item = state().items.find(entry => entry.id === itemId);
        app.showView?.(item?.linkedType === "book" ? "library" : "games");
        break;
      }
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
    if (!(Number(item.coinCost || 0) > 0)) { app.showToast?.("Check or enter a price before pinning this wish."); return; }
    shop.currentWishId = shop.currentWishId === itemId ? null : itemId;
    persist("shop-current-wish");
    app.showToast?.(shop.currentWishId ? `✦ Current Wish: ${item.name}` : "Current Wish unpinned.");
  }

  // A price review is mandatory at redemption AND at the final real-world purchase.
  // It cannot issue rewards: the wallet changes only inside confirmPriceAction.
  function openPriceReview(itemId, action) {
    const item = state().items.find(entry => entry.id === itemId);
    if (!item || (action === "redeem" && !["wishlist", "available"].includes(item.status)) ||
        (action === "purchase" && item.status !== "redeemed")) return;
    pendingPriceAction = { itemId, action };
    const reference = action === "purchase" ? Number(item.redemptionCoins ?? item.coinCost) : Number(item.coinCost);
    els.priceTitle.textContent = action === "purchase" ? `Bought ${item.name}?` : `Redeem ${item.name}`;
    els.priceOriginal.textContent = money(item.initialPriceCents ?? item.realPriceCents ?? item.coinCost);
    els.priceCurrent.textContent = money(reference);
    els.priceActual.value = (Number(item.realPriceCents ?? reference) / 100).toFixed(2).replace(".", ",");
    els.priceError.textContent = "";
    els.priceSubmit.textContent = action === "purchase" ? "Confirm purchase & reconcile" : "Confirm price & redeem";
    refreshPricePreview();
    els.priceDialog.showModal();
  }

  function refreshPricePreview() {
    if (!pendingPriceAction) return;
    const item = state().items.find(entry => entry.id === pendingPriceAction.itemId);
    if (!item) return;
    const price = parseStrictPrice(els.priceActual?.value);
    const existingSpend = pendingPriceAction.action === "purchase" ? Number(item.redemptionCoins ?? item.coinCost) : 0;
    const extra = price == null ? 0 : price - existingSpend;
    const wallet = Math.max(0, Number(app.getState().coins || 0));
    els.priceBalance.textContent = price == null ? "Enter a valid price, e.g. 59,99" :
      `Wallet: ${money(wallet)} · ${extra > 0 ? `Need ${money(extra)}` : extra < 0 ? `Return ${money(-extra)} to wallet` : "No adjustment"}`;
    els.priceError.textContent = price != null && extra > wallet ? `Still need ${money(extra - wallet)}. The wish will stay open until you have enough.` : "";
    els.priceSubmit.disabled = price == null || extra > wallet || (pendingPriceAction.action === "redeem" && price === 0);
  }

  function parseStrictPrice(value) {
    const raw = clean(value).replace(/\s/g, "");
    if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:[,.]\d{1,2})?$/.test(raw)) return null;
    const norm = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const n = Number(norm);
    return Number.isFinite(n) && n >= 0 && n <= 1000000 ? Math.round(n * 100) : null;
  }

  function confirmPriceAction(event) {
    event.preventDefault();
    if (!pendingPriceAction) return;
    const { itemId, action } = pendingPriceAction;
    const root = app.getState(), shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    const price = parseStrictPrice(els.priceActual.value);
    if (!item || price == null || (action === "redeem" && price <= 0)) { refreshPricePreview(); return; }
    if ((action === "redeem" && !["wishlist", "available"].includes(item.status)) ||
        (action === "purchase" && item.status !== "redeemed")) return;
    const now = new Date().toISOString();
    const previousPrice = Number(item.realPriceCents ?? item.coinCost);
    const originallySpent = action === "purchase" ? Number(item.redemptionCoins ?? item.coinCost) : 0;
    const walletDelta = action === "purchase" ? originallySpent - price : -price;
    if (Math.max(0, Number(root.coins || 0)) + walletDelta < 0) {
      refreshPricePreview(); return;
    }
    root.coins = Math.max(0, Number(root.coins || 0) + walletDelta);
    item.realPriceCents = price;
    item.coinCost = price;
    item.updatedAt = now;
    item.priceHistory ||= [];
    if (price !== previousPrice) item.priceHistory.push({ at: now, fromCents: previousPrice, toCents: price, stage: action });
    item.priceHistory = item.priceHistory.slice(-30);
    if (action === "redeem") {
      item.status = "redeemed";
      item.redeemedAt = now;
      item.redemptionCoins = price;
      shop.transactions.push({ id: id("shop-tx"), itemId: item.id, itemName: item.name,
        type: "redeem", coins: walletDelta, actualPriceCents: price, originalTargetCents: item.initialPriceCents, at: now });
      if (shop.currentWishId === item.id) shop.currentWishId = null;
    } else {
      item.purchasePriceCents = price;
      item.purchaseCoins = price;
      item.purchasedAt = now;
      item.redeemedAt = null;
      item.redemptionCoins = null;
      item.status = item.mode === "repeatable" ? "wishlist" : "purchased";
      if (item.autoManaged && item.status === "purchased") applyLinkedPurchase(item, true);
      if (walletDelta) shop.transactions.push({ id: id("shop-tx"), itemId: item.id, itemName: item.name,
        type: "price-adjustment", coins: walletDelta, actualPriceCents: price, at: now });
      shop.transactions.push({ id: id("shop-tx"), itemId: item.id, itemName: item.name,
        type: "purchase", coins: 0, actualPriceCents: price, at: now });
    }
    els.priceDialog.close();
    persist(action === "redeem" ? "shop-redeem-reviewed" : "shop-purchased-reviewed");
    app.showToast?.(action === "redeem" ? `✨ ${money(price)} redeemed at the confirmed price.` :
      `🛍️ Purchase logged at ${money(price)}${walletDelta > 0 ? ` · ${money(walletDelta)} returned` : walletDelta < 0 ? ` · ${money(-walletDelta)} extra` : ""}.`);
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

  function restorePurchased(itemId) {
    const item = state().items.find(entry => entry.id === itemId);
    if (!item || item.status !== "purchased") return;
    item.status = "wishlist";
    if (item.autoManaged) applyLinkedPurchase(item, false);
    item.updatedAt = new Date().toISOString();
    persist("shop-restore");
  }

  function removeItem(itemId) {
    const shop = state();
    const item = shop.items.find(entry => entry.id === itemId);
    if (!item) return;
    if (item.autoManaged) { app.showToast?.("This Shop entry is managed by Library / Games. Mark it Owned, Kindle Unlimited or Borrowed there to remove it automatically."); return; }
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
            <button class="primary-button" data-shop-action="redeem" data-shop-item="${attr(item.id)}" type="button">${coins >= cost ? "Review price & redeem" : "Check current price"}</button>
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
    const priced = item.realPriceCents != null || Number(item.coinCost || 0) > 0;
    const cost = Math.max(0, Number(item.coinCost || 0));
    const affordable = priced && cost > 0 && coins >= cost;
    const redeemed = item.status === "redeemed";
    const purchased = item.status === "purchased";
    const current = shop.currentWishId === item.id;
    const sourceLabel = item.linkedType === "game" ? "🎮 GAMES · AUTO" : item.linkedType === "book" ? "📚 LIBRARY · AUTO" : item.mode === "repeatable" ? "↻ REPEATABLE" : "✦ ONE-TIME";
    const stateLabel = redeemed ? "REDEEMED" : purchased ? "BOUGHT" : current ? "CURRENT WISH" : item.realPriceCents === 0 && item.priceCheckedAt ? "FREE" : affordable ? "READY" : priced ? "WISHLIST" : "PRICE OPEN";
    const progress = cost > 0 ? Math.min(100, coins / cost * 100) : 0;
    const priceMeta = item.realPriceCents != null
      ? item.realPriceCents === 0
        ? `<strong>Free</strong><span>${esc(item.priceSource || "Current store price")}</span>`
        : `<strong>${coinLabel(item.coinCost)}</strong><span>${money(item.realPriceCents)}${item.priceSource ? ` · ${esc(item.priceSource)}` : ""}</span>`
      : `<strong>Preis offen</strong><span>${item.autoManaged ? "Automatisch prüfen oder manuell ergänzen" : "Reward value"}</span>`;
    const checked = item.priceCheckedAt ? ` · checked ${shortDate(item.priceCheckedAt)}` : "";
    return `
      <article class="shop-item-card-v306 ${current ? "current" : ""} ${redeemed ? "redeemed" : ""} ${purchased ? "purchased" : ""}">
        ${imageMarkup(item, "shop-item-image-v306")}
        <div class="shop-item-body-v306">
          <div class="shop-item-meta-v306"><span>${sourceLabel}</span><b>${stateLabel}</b></div>
          <h3>${esc(item.name)}</h3>
          ${item.description ? `<p>${esc(item.description)}</p>` : ""}
          <div class="shop-price-pair-v306">${priceMeta}</div>
          ${item.autoManaged && item.priceSource ? `<small class="muted">${esc(item.priceSource)}${checked}</small>` : ""}
          ${cost > 0 ? `<div class="shop-item-progress-v306"><div class="progress"><span style="width:${progress}%"></span></div><small>${affordable ? "You can afford this reward." : `${coinLabel(Math.max(0, cost - coins))} left`}</small></div>` : ""}
          <div class="shop-card-actions-v306">
            ${item.autoManaged && !redeemed && !purchased ? `<button class="secondary-button" data-shop-action="refresh-price" data-shop-item="${attr(item.id)}" type="button">↻ Preis prüfen</button>` : ""}
            ${!redeemed && !purchased && cost > 0 ? `<button class="${affordable ? "primary-button" : "secondary-button"}" data-shop-action="redeem" data-shop-item="${attr(item.id)}" type="button">${affordable ? "Review & redeem" : "Preis / Coins prüfen"}</button>` : ""}
            ${redeemed ? `<button class="primary-button" data-shop-action="bought" data-shop-item="${attr(item.id)}" type="button">Mark bought</button><button class="secondary-button" data-shop-action="refund" data-shop-item="${attr(item.id)}" type="button">Cancel & refund</button>` : ""}
            ${purchased ? `<button class="secondary-button" data-shop-action="restore" data-shop-item="${attr(item.id)}" type="button">Back to wishlist</button>` : ""}
            ${!redeemed && !purchased && cost > 0 ? `<button class="ghost-button ${current ? "active" : ""}" data-shop-action="pin" data-shop-item="${attr(item.id)}" type="button">${current ? "Current Wish ✓" : "Pin wish"}</button>` : ""}
            ${item.url ? `<button class="ghost-button" data-shop-action="open" data-shop-item="${attr(item.id)}" type="button">Open link</button>` : ""}
            ${item.autoManaged ? `<button class="ghost-button" data-shop-action="edit" data-shop-item="${attr(item.id)}" type="button">Preis / Link bearbeiten</button><button class="ghost-button" data-shop-action="open-source" data-shop-item="${attr(item.id)}" type="button">Open ${item.linkedType === "book" ? "Library" : "Games"}</button>` : `<button class="ghost-button" data-shop-action="edit" data-shop-item="${attr(item.id)}" type="button">Edit</button><button class="ghost-button danger" data-shop-action="delete" data-shop-item="${attr(item.id)}" type="button">Remove</button>`}
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
      const verb = tx.type === "redeem" ? "Redeemed" : tx.type === "refund" ? "Refunded" : tx.type === "price-adjustment" ? "Price corrected" : "Bought";
      const coinText = tx.coins ? `${tx.coins > 0 ? "+" : ""}${formatInt(tx.coins)} 🪙` : "";
      return `<div class="shop-history-row-v306"><span>${tx.type === "redeem" ? "✨" : tx.type === "refund" ? "↻" : "🛍️"}</span><div><strong>${esc(tx.itemName || "Reward")}</strong><small>${verb}${tx.actualPriceCents != null ? ` · ${money(tx.actualPriceCents)}` : ""} · ${shortDate(tx.at)}</small></div><b>${coinText}</b></div>`;
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
    },
    refreshLinkedPrices: refreshAllLinkedPrices,
    _test: { syncLinkedLibraryItems, gameOwned, bookNeedsShop, applyLinkedPurchase, linkedEntity }
  };
})();
