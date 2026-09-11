(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app) return;

  const VERSION = "0.31.4az";
  const SCHEMA_VERSION = 2;
  const WEEKLY_REWARD_FIND_THRESHOLDS = [3, 8];
  const MAX_HISTORY = 180;
  const PEOPLE = {
    mina: { name: "Mina", unlock: state => Boolean(state.flags?.STORY_MINA_FRIENDSHIP_STARTED || state.flags?.MINA_HANGOUTS_UNLOCKED) },
    bakugo: { name: "Katsuki", unlock: state => Boolean(state.flags?.DYNARIOT_MOVE_IN_COMPLETE || state.flags?.SHARED_APARTMENT_IS_HOME) },
    kirishima: { name: "Eijiro", unlock: state => Boolean(state.flags?.DYNARIOT_MOVE_IN_COMPLETE || state.flags?.SHARED_APARTMENT_IS_HOME) }
  };

  const GIFTS = [
    { id:"spicy-rice-crackers", icon:"🌶️", name:"Spicy rice crackers", category:"snack", keepsake:false, flavor:"A little dangerously red. Exactly the sort of snack that looks like a challenge." },
    { id:"chili-crisp", icon:"🔥", name:"Small-batch chili crisp", category:"food", keepsake:false, flavor:"Deep red, crunchy, and labelled with a warning that feels more like a dare." },
    { id:"local-bakery-cookies", icon:"🍪", name:"Local bakery cookies", category:"snack", keepsake:false, flavor:"A small box from a neighborhood bakery — easy to share, easy to like." },
    { id:"fruit-candy", icon:"🍬", name:"Bright fruit candy", category:"snack", keepsake:false, flavor:"Colorful little wrapped candies that look more cheerful than practical." },
    { id:"premium-coffee-beans", icon:"☕", name:"Good coffee beans", category:"drink", keepsake:false, flavor:"A small bag of beans that smells better than most mornings feel." },
    { id:"black-tea-tin", icon:"🫖", name:"Black tea tin", category:"drink", keepsake:true, flavor:"A compact tin of fragrant tea that looks nice enough to leave on a shelf." },
    { id:"protein-snack", icon:"🥜", name:"Savory protein snack", category:"snack", keepsake:false, flavor:"Portable, filling, and much less sad than a generic protein bar." },
    { id:"peppered-beef-jerky", icon:"🥩", name:"Peppered beef jerky", category:"snack", keepsake:false, flavor:"A good butcher-shop packet: smoky, peppery, unapologetically meaty." },
    { id:"crispy-okra-chips", icon:"🫛", name:"Crispy okra chips", category:"snack", keepsake:false, flavor:"Light, salty little okra slices with much more crunch than they have any right to." },
    { id:"natto-snack-pack", icon:"🫘", name:"Natto snack pack", category:"snack", keepsake:false, flavor:"A very specific little convenience-store find. Definitely not an everyone snack." },
    { id:"tiny-cactus", icon:"🌵", name:"Tiny cactus", category:"plant", keepsake:true, flavor:"Small, sturdy, and hard to accidentally kill." },
    { id:"plant-cutting", icon:"🪴", name:"Little plant cutting", category:"plant", keepsake:true, flavor:"A healthy cutting in a simple glass jar, ready to root somewhere new." },
    { id:"key-organizer", icon:"🔑", name:"Sturdy key organizer", category:"practical", keepsake:true, flavor:"A neat little organizer for keys and small everyday tools." },
    { id:"heatproof-mug", icon:"🥛", name:"Heavy ceramic mug", category:"practical", keepsake:true, flavor:"Simple, solid, and difficult to knock over." },
    { id:"trail-thermos", icon:"🏔️", name:"Compact trail thermos", category:"outdoor", keepsake:true, flavor:"A tough little insulated bottle made for early starts, long walks and being knocked around." },
    { id:"bath-salts", icon:"🛁", name:"Bath salts", category:"care", keepsake:false, flavor:"A small pouch meant for one very deliberate evening off." },
    { id:"soft-socks", icon:"🧦", name:"Ridiculously soft socks", category:"care", keepsake:false, flavor:"The kind of unnecessary softness that becomes very necessary once worn." },
    { id:"color-care-shampoo", icon:"🧴", name:"Color-care shampoo", category:"care", keepsake:false, flavor:"A good salon-size bottle made to keep vivid dyed color from fading too quickly." },
    { id:"sheet-masks", icon:"🫧", name:"Fun sheet-mask set", category:"care", keepsake:false, flavor:"A small mix of bright packaging, cute designs and low-effort skincare." },
    { id:"nail-stickers", icon:"✨", name:"Graphic nail stickers", category:"style", keepsake:false, flavor:"Tiny stars, flames and metallic accents for a five-minute style upgrade." },
    { id:"hair-clips", icon:"🎀", name:"Statement hair clips", category:"style", keepsake:true, flavor:"A bright little pair that can make a basic outfit look intentional." },
    { id:"dance-socks", icon:"💿", name:"Bright dance socks", category:"style", keepsake:false, flavor:"Comfortable crew socks with a bold little graphic — made for moving, not just matching." },
    { id:"cute-stationery", icon:"📝", name:"Cute stationery set", category:"stationery", keepsake:true, flavor:"Small note cards, stickers and paper that make ordinary lists suspiciously charming." },
    { id:"mystery-paperback", icon:"📖", name:"Pocket mystery novel", category:"book", keepsake:true, flavor:"A compact little whodunit with a dramatic cover and short chapters." },
    { id:"retro-hero-magazine", icon:"🦸", name:"Vintage hero magazine", category:"nerdy", keepsake:true, flavor:"An older hero magazine in surprisingly good condition, rescued from a second-hand shelf." },
    { id:"retro-game-charm", icon:"🎮", name:"Retro game charm", category:"nerdy", keepsake:true, flavor:"A tiny acrylic charm shaped like an old handheld game console." },
    { id:"plush-charm", icon:"🧸", name:"Tiny plush charm", category:"cute", keepsake:true, flavor:"A pocket-sized soft mascot with an expression far too dramatic for its size." },
    { id:"red-bead-bracelet", icon:"📿", name:"Red bead bracelet", category:"accessory", keepsake:true, flavor:"Simple red beads on a sturdy cord — casual enough to wear without thinking about it." },
    { id:"omamori-charm", icon:"🎍", name:"Small omamori charm", category:"seasonal", seasonalOnly:true, keepsake:true, flavor:"A small New Year charm picked up during the season — more meaningful than flashy." },
    { id:"winter-hand-warmers", icon:"🧤", name:"Pocket hand warmers", category:"seasonal", seasonalOnly:true, keepsake:false, flavor:"A practical little winter pack for freezing commutes and cold hands." },
    { id:"roasted-soy-snack", icon:"🫘", name:"Roasted soy snack", category:"seasonal", seasonalOnly:true, keepsake:false, flavor:"A crunchy little Setsubun-season packet that feels both traditional and snackable." },
    { id:"chocolate-truffles", icon:"🍫", name:"Small truffle box", category:"seasonal", seasonalOnly:true, keepsake:false, flavor:"A compact box of genuinely good chocolate without an enormous romantic bow attached." },
    { id:"white-chocolate-box", icon:"🤍", name:"White chocolate bites", category:"seasonal", seasonalOnly:true, keepsake:false, flavor:"A tidy little White Day box with crisp, not-too-sweet chocolate pieces." },
    { id:"trail-map-notebook", icon:"🗺️", name:"Pocket trail notebook", category:"seasonal", seasonalOnly:true, keepsake:true, flavor:"A compact field notebook with a tiny foldout map pocket — made for outings, not decoration." },
    { id:"star-charm", icon:"⭐", name:"Tanabata star charm", category:"seasonal", seasonalOnly:true, keepsake:true, flavor:"A small star-shaped charm in deep blue and silver, found among the Tanabata displays." },
    { id:"summer-hand-fan", icon:"🎐", name:"Foldable summer fan", category:"seasonal", seasonalOnly:true, keepsake:true, flavor:"A lightweight folding fan that is prettier than a plastic convenience-store one and just as useful." },
    { id:"halloween-candy", icon:"🎃", name:"Halloween candy mix", category:"seasonal", seasonalOnly:true, keepsake:false, flavor:"A bright little bag of limited-edition sweets in aggressively seasonal wrappers." },
    { id:"holiday-cookie-tin", icon:"🎄", name:"Winter cookie tin", category:"seasonal", seasonalOnly:true, keepsake:true, flavor:"A small festive tin of butter cookies that can keep holding things after the cookies disappear." }
  ];

  const GIFT_BY_ID = Object.fromEntries(GIFTS.map(item => [item.id, item]));

  const REACTIONS = {
    mina: {
      loved: new Set(["crispy-okra-chips", "natto-snack-pack", "nail-stickers", "hair-clips", "dance-socks"]),
      liked: new Set(["fruit-candy", "local-bakery-cookies", "bath-salts", "soft-socks", "sheet-masks", "cute-stationery", "plush-charm", "red-bead-bracelet", "retro-game-charm", "star-charm", "summer-hand-fan", "halloween-candy", "holiday-cookie-tin", "chocolate-truffles"]),
      disliked: new Set(["key-organizer"])
    },
    bakugo: {
      loved: new Set(["spicy-rice-crackers", "chili-crisp", "trail-thermos"]),
      liked: new Set(["key-organizer", "heatproof-mug", "protein-snack", "peppered-beef-jerky", "winter-hand-warmers", "trail-map-notebook"]),
      disliked: new Set(["hair-clips", "cute-stationery", "plush-charm"])
    },
    kirishima: {
      loved: new Set(["peppered-beef-jerky", "retro-hero-magazine", "color-care-shampoo"]),
      liked: new Set(["protein-snack", "red-bead-bracelet", "local-bakery-cookies", "heatproof-mug", "soft-socks", "trail-thermos", "winter-hand-warmers", "trail-map-notebook", "holiday-cookie-tin"]),
      disliked: new Set([])
    }
  };

  const REACTION_COPY = {
    mina: {
      loved: ["Mina lights up immediately. “Okay, this is SO me. You absolutely get it.”", "Her whole face changes before she even says anything. “Wait. I love this.”"],
      liked: ["Mina turns it over with a grin. “Cute. Yeah, I’m into this.”", "“Oh, nice!” She looks genuinely pleased rather than politely pleased."],
      neutral: ["Mina accepts it cheerfully. “Aw, thank you! That’s sweet.”", "She smiles and tucks it away. Not a huge reaction, but definitely not awkward."],
      disliked: ["Mina is gracious about it, but the enthusiasm never quite arrives. Useful information for next time.", "She thanks you warmly. The gift itself, however, does not seem destined to become a favorite."]
    },
    bakugo: {
      loved: ["Katsuki goes quiet for half a second. “...You actually paid attention.” He keeps it.", "He looks at the gift, then at you. “Yeah. This is good.” From him, that lands suspiciously close to delighted."],
      liked: ["Katsuki gives a short approving hum. “Not bad.” The item disappears into his possession immediately.", "“Huh.” He checks it over once, practical and exact. “Yeah, I’ll use this.”"],
      neutral: ["Katsuki takes it with a brief, “Thanks.” No fireworks, no rejection — just accepted.", "He looks mildly surprised that you brought him anything at all, then puts it somewhere safe."],
      disliked: ["Katsuki stares at it, then at you. “...Why this?” He still does not turn it into a personal insult. Noted.", "The pause says more than the eventual “Thanks.” This was clearly not his thing."]
    },
    kirishima: {
      loved: ["Eijiro’s grin arrives instantly. “Seriously? This is awesome. Thank you!”", "He looks absurdly pleased. “No way — I love this.” The reaction is impossible to mistake."],
      liked: ["Eijiro brightens. “Oh, nice! I’m definitely using this.”", "“That’s really thoughtful.” He means it, and the gift seems to land well too."],
      neutral: ["Eijiro smiles and thanks you easily. The gesture matters even if the exact item is not a perfect hit.", "“Thanks, Luca.” Warm, genuine, uncomplicated."],
      disliked: ["Eijiro still thanks you sincerely, but he is not very good at hiding that the item itself is not quite his style.", "He handles the miss kindly. No damage done — just one more thing learned about him."]
    }
  };

  const SPECIAL_REACTION_COPY = {
    mina: {
      "crispy-okra-chips": ["Mina stares at the bag, then at you. “Wait — you found these? Give me. Immediately.”"],
      "natto-snack-pack": ["Her eyes go wide in delighted recognition. “Okay, you actually know me. This is dangerous.”"],
      "dance-socks": ["Mina holds them up against herself, already grinning. “These are going straight into rotation.”"]
    },
    bakugo: {
      "spicy-rice-crackers": ["Katsuki checks the heat label and gives a sharp little grin. “Finally. Something that isn’t weak.”"],
      "chili-crisp": ["He reads the warning on the jar, snorts, and tucks it under his arm. “Yeah. I’m using this tonight.”"],
      "trail-thermos": ["Katsuki tests the lid and weight like he’s inspecting gear. The approving grunt is immediate. “Good pick.”"]
    },
    kirishima: {
      "peppered-beef-jerky": ["Eijiro’s grin is instant. “Oh, hell yeah. This is perfect.”"],
      "retro-hero-magazine": ["Eijiro freezes on the cover. “No way — where did you even find this?” The careful way he holds it answers the rest."],
      "color-care-shampoo": ["He reads the label twice, then laughs. “Okay, this is ridiculously thoughtful. I’m absolutely using it.”"]
    }
  };

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function weekKey(date = new Date()) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - day);
    return localDateKey(copy);
  }

  function hashFraction(text) {
    let h = 2166136261 >>> 0;
    for (const char of String(text || "")) {
      h ^= char.charCodeAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return (h >>> 0) / 4294967296;
  }

  function pickDeterministic(list, seed) {
    if (!list.length) return null;
    const index = Math.min(list.length - 1, Math.floor(hashFraction(seed) * list.length));
    return list[index];
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA_VERSION,
      inventory: {},
      discovered: { mina: {}, bakugo: {}, kirishima: {} },
      history: [],
      kept: { mina: [], bakugo: [], kirishima: [] },
      rewardFinds: {},
      outingFinds: {},
      migrations: {}
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.giftSystem || typeof root.giftSystem !== "object" || Array.isArray(root.giftSystem)) root.giftSystem = defaults();
    const s = root.giftSystem;
    s.schemaVersion = SCHEMA_VERSION;
    s.inventory = s.inventory && typeof s.inventory === "object" && !Array.isArray(s.inventory) ? s.inventory : {};
    s.discovered = s.discovered && typeof s.discovered === "object" && !Array.isArray(s.discovered) ? s.discovered : {};
    s.kept = s.kept && typeof s.kept === "object" && !Array.isArray(s.kept) ? s.kept : {};
    s.rewardFinds = s.rewardFinds && typeof s.rewardFinds === "object" && !Array.isArray(s.rewardFinds) ? s.rewardFinds : {};
    s.outingFinds = s.outingFinds && typeof s.outingFinds === "object" && !Array.isArray(s.outingFinds) ? s.outingFinds : {};
    s.migrations = s.migrations && typeof s.migrations === "object" && !Array.isArray(s.migrations) ? s.migrations : {};
    s.history = Array.isArray(s.history) ? s.history : [];
    for (const id of Object.keys(PEOPLE)) {
      s.discovered[id] = s.discovered[id] && typeof s.discovered[id] === "object" && !Array.isArray(s.discovered[id]) ? s.discovered[id] : {};
      s.kept[id] = Array.isArray(s.kept[id]) ? s.kept[id] : [];
    }
    return s;
  }

  function eligiblePeople() {
    const state = app.getState();
    return Object.keys(PEOPLE).filter(id => PEOPLE[id].unlock(state));
  }

  function isUnlocked() { return eligiblePeople().length > 0; }

  function inventoryCount() {
    const s = ensureState();
    return Object.values(s.inventory).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0);
  }

  function inventoryItems() {
    const s = ensureState();
    return GIFTS.map(item => ({ ...item, quantity: Math.max(0, Number(s.inventory[item.id] || 0)) })).filter(item => item.quantity > 0);
  }

  function addLedgerGiftEvent(item, source, sourceLabel, metadata = {}) {
    const state = app.getState();
    state.rewardLedger ||= { schemaVersion: 1, events: [] };
    state.rewardLedger.events ||= [];
    const event = {
      id: `reward-gift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: "gift-find",
      sourceId: metadata.sourceEventId || `${source}:${item.id}:${Date.now()}`,
      label: `Gift Find · ${item.name}`,
      realm: null,
      capability: null,
      xp: 0,
      realmXP: 0,
      statXP: 0,
      coins: 0,
      rawStoryEnergy: 0,
      storyEnergy: 0,
      dedupeFamily: null,
      duplicate: false,
      duplicateOf: null,
      progressionRelevant: false,
      at: new Date().toISOString(),
      metadata: { giftId: item.id, giftName: item.name, giftIcon: item.icon, giftSource: source, giftSourceLabel: sourceLabel, ...metadata }
    };
    state.rewardLedger.events.push(event);
    if (state.rewardLedger.events.length > 2500) state.rewardLedger.events = state.rewardLedger.events.slice(-2500);
    return event.id;
  }

  function grantGift(giftId, { source = "special", sourceLabel = "Gift reward", sourceEventId = null, silent = false } = {}) {
    const item = GIFT_BY_ID[giftId];
    if (!item) return null;
    const s = ensureState();
    s.inventory[item.id] = Math.max(0, Number(s.inventory[item.id] || 0)) + 1;
    s.history.push({ at:new Date().toISOString(), type:"found", giftId:item.id, source, sourceLabel });
    s.history = s.history.slice(-MAX_HISTORY);
    addLedgerGiftEvent(item, source, sourceLabel, { sourceEventId });
    app.saveState({ source: "gift-find" });
    renderGiftShelf();
    if (!silent) app.showToast?.(`Gift Find ✦ ${item.icon} ${item.name} added to your Gift Shelf.`);
    return { ...item };
  }

  function rewardPoolForWeek(seedSuffix = "") {
    const recentFound = new Set(ensureState().history.filter(entry => entry.type === "found").slice(-8).map(entry => entry.giftId));
    const standardGifts = GIFTS.filter(item => !item.seasonalOnly);
    const fresh = standardGifts.filter(item => !recentFound.has(item.id));
    const pool = fresh.length >= 6 ? fresh : standardGifts;
    return [...pool].sort((a,b) => hashFraction(`${weekKey()}:${seedSuffix}:${a.id}`) - hashFraction(`${weekKey()}:${seedSuffix}:${b.id}`));
  }

  function qualifiesForRewardFind(spec, reward) {
    if (!reward?.eventId || reward.deduped) return false;
    const source = String(spec?.source || "");
    if (!source || source === "gift-find" || source.startsWith("talent-v2-") || source.startsWith("relationship")) return false;
    if (spec?.progressionRelevant === false) return false;
    const total = Number(reward.xp || 0) + Number(reward.realmXP || 0) + Number(reward.statXP || 0) + Number(reward.coins || 0) + Number(reward.storyEnergy || 0);
    return total > 0;
  }

  function afterActivityReward(spec, reward) {
    if (!isUnlocked() || !qualifiesForRewardFind(spec, reward)) return null;
    const s = ensureState();
    const wk = weekKey();
    const record = s.rewardFinds[wk] ||= { eventIds: [], drops: [] };
    if (record.eventIds.includes(reward.eventId)) return null;
    record.eventIds.push(reward.eventId);
    record.eventIds = record.eventIds.slice(-40);

    const milestone = WEEKLY_REWARD_FIND_THRESHOLDS.find((threshold, index) => record.eventIds.length >= threshold && !record.drops[index]);
    if (!milestone) {
      app.saveState({ source: "gift-reward-progress" });
      return null;
    }

    const index = WEEKLY_REWARD_FIND_THRESHOLDS.indexOf(milestone);
    const item = pickDeterministic(rewardPoolForWeek(`reward:${index}`), `${wk}:gift-reward:${index}`);
    if (!item) return null;
    record.drops[index] = item.id;
    grantGift(item.id, { source:"reward", sourceLabel:`Weekly activity reward ${index + 1}`, sourceEventId: reward.eventId, silent:true });
    window.setTimeout(() => app.showToast?.(`Bonus reward ✦ ${item.icon} ${item.name} found for your Gift Shelf.`), 350);
    return { item:{ ...item }, milestone:index + 1 };
  }

  function outingOptions() {
    if (!isUnlocked()) return [];
    const wk = weekKey();
    const s = ensureState();
    if (s.outingFinds[wk]?.claimedGiftId) return [];
    const pool = rewardPoolForWeek("outing");
    const picks = [];
    let cursor = 0;
    while (picks.length < 3 && cursor < pool.length * 2) {
      const item = pool[(Math.floor(hashFraction(`${wk}:outing:${cursor}`) * pool.length) + cursor) % pool.length];
      if (item && !picks.some(entry => entry.id === item.id)) picks.push(item);
      cursor += 1;
    }
    return picks;
  }

  function claimOutingFind(giftId) {
    const item = GIFT_BY_ID[giftId];
    const options = outingOptions();
    if (!item || !options.some(option => option.id === giftId)) return false;
    const s = ensureState();
    const wk = weekKey();
    s.outingFinds[wk] = { claimedGiftId:giftId, at:new Date().toISOString() };
    grantGift(giftId, { source:"outing", sourceLabel:"Weekly outing find", silent:true });
    app.showToast?.(`You picked up ${item.icon} ${item.name} for the Gift Shelf.`);
    renderGiftShelf();
    return true;
  }

  function reactionFor(personId, giftId) {
    const prefs = REACTIONS[personId];
    if (!prefs || !GIFT_BY_ID[giftId]) return "neutral";
    if (prefs.loved.has(giftId)) return "loved";
    if (prefs.liked.has(giftId)) return "liked";
    if (prefs.disliked.has(giftId)) return "disliked";
    return "neutral";
  }

  function givenToday(personId) {
    const today = localDateKey();
    return ensureState().history.some(entry => entry.type === "given" && entry.personId === personId && localDateKey(new Date(entry.at || 0)) === today);
  }

  function actionStateForPerson(personId) {
    const state = app.getState();
    const person = PEOPLE[personId];
    if (!person || !person.unlock(state)) return { visible:false, enabled:false, reason:"Not available yet" };
    const count = inventoryCount();
    if (givenToday(personId)) return { visible:true, enabled:false, count, reason:"You already gave them something today." };
    if (!count) return { visible:true, enabled:false, count:0, reason:"Your Gift Shelf is empty." };
    const seasonal = window.LifeRPGSeasons?.giftContext?.(personId) || null;
    return { visible:true, enabled:true, count, birthdayWindow:Boolean(seasonal?.birthdayWindow), reason:seasonal?.birthdayWindow ? `${seasonal.label} · ${count} gift${count === 1 ? "" : "s"} on your shelf.` : `${count} gift${count === 1 ? "" : "s"} on your shelf.` };
  }

  function discoveredReaction(personId, giftId) {
    return ensureState().discovered?.[personId]?.[giftId] || null;
  }

  function preferenceLabel(reaction) {
    return ({ loved:"Loved", liked:"Liked", neutral:"Okay", disliked:"Not their thing" })[reaction] || "Unknown";
  }

  function preferenceIcon(reaction) {
    return ({ loved:"♥", liked:"♡", neutral:"·", disliked:"×" })[reaction] || "?";
  }

  function reactionLine(personId, reaction, giftId) {
    const special = SPECIAL_REACTION_COPY?.[personId]?.[giftId];
    const options = (reaction === "loved" && Array.isArray(special) && special.length)
      ? special
      : (REACTION_COPY?.[personId]?.[reaction] || ["The reaction tells you a little more than the gift did."]);
    return pickDeterministic(options, `${personId}:${giftId}:${localDateKey()}:reaction`) || options[0];
  }

  function giveGift(personId, giftId) {
    const person = PEOPLE[personId];
    const item = GIFT_BY_ID[giftId];
    const s = ensureState();
    if (!person || !person.unlock(app.getState()) || !item) return null;
    if (givenToday(personId)) return { ok:false, reason:"You already gave them something today." };
    if (Number(s.inventory[giftId] || 0) <= 0) return { ok:false, reason:"That gift is no longer on your shelf." };

    const reaction = reactionFor(personId, giftId);
    s.inventory[giftId] = Math.max(0, Number(s.inventory[giftId] || 0) - 1);
    if (!s.inventory[giftId]) delete s.inventory[giftId];
    s.discovered[personId][giftId] = reaction;
    const line = reactionLine(personId, reaction, giftId);
    s.history.push({ at:new Date().toISOString(), type:"given", giftId, personId, reaction, line });
    s.history = s.history.slice(-MAX_HISTORY);
    if (item.keepsake && reaction !== "disliked") {
      const already = s.kept[personId].some(entry => entry.giftId === giftId);
      if (!already) s.kept[personId].push({ giftId, at:new Date().toISOString(), reaction });
    }

    const seasonalContext = window.LifeRPGSeasons?.giftContext?.(personId) || { multiplier:1, birthdayWindow:false };
    const registered = window.LifeRPGRelationshipEngine?.registerGift?.(personId, reaction, giftId, seasonalContext);
    app.saveState({ source:"gift-given" });
    renderGiftShelf();
    app.renderAll?.();
    return { ok:true, item:{ ...item }, reaction, line, registered:Boolean(registered), birthdayWindow:Boolean(seasonalContext.birthdayWindow) };
  }

  function keptSummary() {
    const s = ensureState();
    const bits = [];
    for (const personId of ["bakugo", "kirishima"]) {
      const entries = s.kept[personId] || [];
      if (!entries.length) continue;
      const latest = entries.slice(-2).map(entry => GIFT_BY_ID[entry.giftId]?.name).filter(Boolean);
      if (latest.length) bits.push(`${PEOPLE[personId].name}: ${latest.join(" · ")}`);
    }
    return bits;
  }

  function giftNotesForPerson(personId) {
    const learned = ensureState().discovered?.[personId] || {};
    return Object.entries(learned)
      .map(([giftId, reaction]) => ({ item:GIFT_BY_ID[giftId], reaction }))
      .filter(entry => entry.item)
      .sort((a,b) => ({ loved:0, liked:1, neutral:2, disliked:3 }[a.reaction] ?? 4) - ({ loved:0, liked:1, neutral:2, disliked:3 }[b.reaction] ?? 4));
  }

  function shelfMarkup() {
    if (!isUnlocked()) return `<div class="gift-locked-v314ay"><span>🎁</span><div><strong>Gift Shelf</strong><p>This becomes useful once Luca has someone she naturally knows well enough to give things to.</p></div></div>`;
    const items = inventoryItems();
    const outing = outingOptions();
    const wk = weekKey();
    const rewardRecord = ensureState().rewardFinds[wk] || { eventIds:[], drops:[] };
    const nextThreshold = WEEKLY_REWARD_FIND_THRESHOLDS.find((threshold, index) => !rewardRecord.drops[index]);
    const progressText = nextThreshold
      ? `${Math.min(rewardRecord.eventIds.length, nextThreshold)} / ${nextThreshold} meaningful rewarded actions toward the next Gift Find`
      : "Both weekly activity Gift Finds collected";

    const inventoryMarkup = items.length
      ? `<div class="gift-inventory-grid-v314ay">${items.map(item => {
          const known = Object.entries(PEOPLE).map(([personId, person]) => {
            const reaction = discoveredReaction(personId, item.id);
            if (!reaction) return "";
            return `<span class="gift-memory-chip-v314ay is-${reaction}" title="${app.escapeHtml?.(person.name)}: ${preferenceLabel(reaction)}">${preferenceIcon(reaction)} ${app.escapeHtml?.(person.name)}</span>`;
          }).join("");
          return `<article class="gift-item-card-v314ay"><div class="gift-item-icon-v314ay">${item.icon}</div><div><strong>${app.escapeHtml?.(item.name)}</strong><p>${app.escapeHtml?.(item.flavor)}</p>${known ? `<div class="gift-memory-row-v314ay">${known}</div>` : `<small class="gift-unknown-v314ay">No preference notes yet</small>`}</div><b>×${item.quantity}</b></article>`;
        }).join("")}</div>`
      : `<div class="gift-empty-v314ay"><span>🎀</span><div><strong>Your shelf is empty.</strong><p>Meaningful activity and the weekly outing find can put small gifts here. You never need to spend Coins on them.</p></div></div>`;

    const outingMarkup = outing.length
      ? `<div class="gift-outing-v314ay"><div class="gift-subhead-v314ay"><div><small>WEEKLY OUTING FIND</small><strong>One little thing catches your eye.</strong><p>Choose one to bring home for the Gift Shelf. No Coins, no pressure.</p></div><span>1 / week</span></div><div class="gift-outing-options-v314ay">${outing.map(item => `<button type="button" data-gift-outing="${item.id}"><span>${item.icon}</span><strong>${app.escapeHtml?.(item.name)}</strong><small>Pick this</small></button>`).join("")}</div></div>`
      : `<div class="gift-outing-done-v314ay"><span>✓</span><div><strong>This week's outing find is already tucked away.</strong><p>A new small choice appears next week.</p></div></div>`;

    return `<div class="gift-shelf-header-v314ay"><div><p class="eyebrow">GIFT SHELF</p><h3>Things you could give someone</h3><p>Finds are rewards and little life-sim discoveries — never a second currency shop.</p></div><span class="gift-count-v314ay">${inventoryCount()} item${inventoryCount() === 1 ? "" : "s"}</span></div>${outingMarkup}<div class="gift-progress-v314ay"><span>✦</span><div><strong>Activity Gift Finds</strong><p>${app.escapeHtml?.(progressText)} · maximum two per week.</p></div></div>${inventoryMarkup}`;
  }

  function renderGiftShelf() {
    const root = document.getElementById("giftShelfRoot");
    if (!root) return;
    root.innerHTML = shelfMarkup();
  }

  function ensureGiftDialog() {
    if (document.getElementById("giftGiveDialog")) return document.getElementById("giftGiveDialog");
    const dialog = document.createElement("dialog");
    dialog.id = "giftGiveDialog";
    dialog.className = "rpg-dialog gift-dialog-v314ay";
    dialog.innerHTML = `<div class="gift-dialog-shell-v314ay"><div class="dialog-heading"><div><p class="eyebrow">GIVE A GIFT</p><h2 id="giftDialogTitle">Choose something</h2><p id="giftDialogSubtitle" class="muted">What feels right?</p></div><button class="close-button" type="button" data-gift-dialog-close aria-label="Close">×</button></div><div id="giftDialogBody"></div></div>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function openGiftDialog(personId) {
    const person = PEOPLE[personId];
    if (!person) return;
    const dialog = ensureGiftDialog();
    dialog.dataset.personId = personId;
    const title = dialog.querySelector("#giftDialogTitle");
    const subtitle = dialog.querySelector("#giftDialogSubtitle");
    const body = dialog.querySelector("#giftDialogBody");
    if (title) title.textContent = `Something for ${person.name}`;
    const already = givenToday(personId);
    const items = inventoryItems();
    if (subtitle) subtitle.textContent = already ? "You already gave them something today." : "You only learn preferences by living with the reactions — no hidden numbers are shown.";
    if (body) {
      if (already) {
        body.innerHTML = `<div class="gift-dialog-empty-v314ay"><span>♡</span><strong>One gift is enough for today.</strong><p>You can still talk, hang out and live your day normally. Gifts are a small gesture, not an Affection grind.</p></div>`;
      } else if (!items.length) {
        body.innerHTML = `<div class="gift-dialog-empty-v314ay"><span>🎁</span><strong>The shelf is empty.</strong><p>More gifts can arrive through weekly finds and ordinary Life RPG rewards.</p></div>`;
      } else {
        body.innerHTML = `<div class="gift-dialog-grid-v314ay">${items.map(item => {
          const known = discoveredReaction(personId, item.id);
          return `<button type="button" class="gift-choice-v314ay" data-give-gift="${item.id}"><span>${item.icon}</span><div><strong>${app.escapeHtml?.(item.name)}</strong><p>${app.escapeHtml?.(item.flavor)}</p>${known ? `<small class="is-${known}">${preferenceIcon(known)} Last time: ${preferenceLabel(known)}</small>` : `<small>Preference unknown</small>`}</div><b>×${item.quantity}</b></button>`;
        }).join("")}</div>`;
      }
    }
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  function showReaction(result, personId) {
    const dialog = ensureGiftDialog();
    const body = dialog.querySelector("#giftDialogBody");
    const subtitle = dialog.querySelector("#giftDialogSubtitle");
    if (subtitle) subtitle.textContent = `${PEOPLE[personId]?.name || "They"} reacted. Life RPG quietly remembers what you learned.`;
    if (body) body.innerHTML = `<div class="gift-reaction-v314ay is-${result.reaction}"><span>${result.item.icon}</span><div><small>${preferenceLabel(result.reaction).toUpperCase()}</small><h3>${app.escapeHtml?.(result.item.name)}</h3><p>${app.escapeHtml?.(result.line)}</p>${result.item.keepsake && result.reaction !== "disliked" ? `<em>They kept it. You may notice that little keepsake again later.</em>` : ""}${result.birthdayWindow ? `<em>Birthday week makes the gesture land a little warmer — with no penalty if you skip it.</em>` : ""}</div></div><button class="primary-button gift-reaction-close-v314ay" type="button" data-gift-dialog-close>Okay ♡</button>`;
    app.showToast?.(`${PEOPLE[personId]?.name || "They"}: ${preferenceLabel(result.reaction)} · preference learned.`);
  }

  function notesMarkup(personId) {
    const notes = giftNotesForPerson(personId);
    if (!notes.length) return "";
    return `<div class="gift-notes-v314ay"><small>GIFT NOTES</small><div>${notes.slice(0,8).map(({ item, reaction }) => `<span class="is-${reaction}">${preferenceIcon(reaction)} ${app.escapeHtml?.(item.name)}</span>`).join("")}</div></div>`;
  }

  function augmentPeopleProfile() {
    const state = app.getState();
    const personId = state.story?.social?.selectedPeoplePersonId;
    const actions = document.getElementById("peopleProfileActions");
    if (actions && personId && !actions.querySelector("[data-gift-person]")) {
      const actionState = actionStateForPerson(personId);
      if (actionState.visible) {
        actions.insertAdjacentHTML("beforeend", `<button class="social-action-card gift-social-action-v314ay ${actionState.enabled ? "ready" : "locked"}" type="button" data-gift-person="${personId}" ${actionState.enabled ? "" : "disabled"}><span class="social-action-icon">🎁</span><span><strong>Give Gift</strong><small>${app.escapeHtml?.(actionState.reason)}</small></span><b>${actionState.enabled ? "GIVE" : actionState.count ? "TODAY ✓" : "EMPTY"}</b></button>`);
      }
    }
    const details = document.getElementById("peopleProfileDetails");
    if (details && personId && !details.querySelector(".gift-notes-v314ay")) {
      const notes = notesMarkup(personId);
      if (notes) details.insertAdjacentHTML("beforeend", notes);
    }
  }

  function installEvents() {
    document.addEventListener("click", event => {
      const outing = event.target.closest?.("[data-gift-outing]");
      if (outing) {
        claimOutingFind(outing.dataset.giftOuting);
        return;
      }
      const giveButton = event.target.closest?.("[data-gift-person]");
      if (giveButton) {
        openGiftDialog(giveButton.dataset.giftPerson);
        return;
      }
      const choice = event.target.closest?.("[data-give-gift]");
      if (choice) {
        const dialog = choice.closest("#giftGiveDialog") || ensureGiftDialog();
        const personId = dialog.dataset.personId;
        const result = giveGift(personId, choice.dataset.giveGift);
        if (!result?.ok) {
          app.showToast?.(result?.reason || "That gift cannot be given right now.");
          return;
        }
        showReaction(result, personId);
        return;
      }
      if (event.target.closest?.("[data-gift-dialog-close]")) {
        const dialog = ensureGiftDialog();
        if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
      }
    });

    window.addEventListener("life-rpg:render", () => {
      renderGiftShelf();
      window.setTimeout(augmentPeopleProfile, 0);
    });
    window.addEventListener("life-rpg:state-saved", () => {
      renderGiftShelf();
      window.setTimeout(augmentPeopleProfile, 0);
    });
  }

  function migratePreferenceResearchPass() {
    const s = ensureState();
    const key = "ay1-character-preference-research";
    if (s.migrations[key]) return false;

    for (const personId of Object.keys(PEOPLE)) {
      const learned = s.discovered?.[personId] || {};
      for (const giftId of Object.keys(learned)) {
        if (GIFT_BY_ID[giftId]) learned[giftId] = reactionFor(personId, giftId);
      }
      s.kept[personId] = (s.kept?.[personId] || []).map(entry => ({
        ...entry,
        reaction: GIFT_BY_ID[entry.giftId] ? reactionFor(personId, entry.giftId) : entry.reaction
      }));
    }

    s.migrations[key] = { at:new Date().toISOString(), version:VERSION };
    app.saveState({ source:"gift-preference-research-migration" });
    return true;
  }

  function init() {
    ensureState();
    migratePreferenceResearchPass();
    ensureGiftDialog();
    installEvents();
    renderGiftShelf();
    window.setTimeout(() => {
      augmentPeopleProfile();
      // story-ui may have rendered before gifts.js loaded; one full render makes
      // the Gift action available immediately without changing story state.
      app.renderAll?.();
    }, 0);
  }

  window.LifeRPGGifts = {
    version: VERSION,
    catalog: () => GIFTS.map(item => ({ ...item })),
    inventory: inventoryItems,
    inventoryCount,
    isUnlocked,
    eligiblePeople,
    actionStateForPerson,
    giftNotesForPerson,
    outingOptions,
    claimOutingFind,
    grantGift,
    giveGift,
    reactionFor,
    givenToday,
    keptSummary,
    afterActivityReward,
    render: renderGiftShelf
  };

  init();
})();
