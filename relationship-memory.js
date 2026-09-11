(() => {
  "use strict";

  if (window.__lifeRpgRelationshipMemoryV314bb) return;
  window.__lifeRpgRelationshipMemoryV314bb = true;

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;

  const VERSION = "0.31.4bc";
  const SCHEMA = 1;
  const PEOPLE = ["mina", "bakugo", "kirishima"];
  let syncing = false;
  let timer = null;

  const TRAIT_MEMORIES = [
    // Mina learns Luca's everyday preferences directly through Talk.
    ["PREF_COLOR_SAKURA_PINK", ["mina"], "color:sakura", "You told Mina that sakura pink is one of your colors.", "preference"],
    ["PREF_COLOR_DEEP_GREEN", ["mina"], "color:green", "You told Mina that deep forest green feels right.", "preference"],
    ["PREF_COLOR_MOOD_BASED", ["mina"], "color:mood", "Mina knows your favorite color depends on the day.", "preference"],
    ["PREF_DRINK_COFFEE", ["mina"], "drink:coffee", "Mina knows coffee is a safe bet for you.", "preference"],
    ["PREF_DRINK_TEA", ["mina"], "drink:tea", "Mina knows tea is a safe bet for you.", "preference"],
    ["PREF_DRINK_CHECK_IN", ["mina"], "drink:depends", "Mina knows your drink order depends on the day.", "preference"],
    ["PREF_SUPPORT_DETAILS", ["mina"], "support:details", "Mina knows facts and details can help you settle.", "care"],
    ["PREF_SUPPORT_COMPANY", ["mina"], "support:company", "Mina knows quiet company can help more than fixing things.", "care"],
    ["PREF_SUPPORT_SPACE", ["mina"], "support:space", "Mina knows that when you ask for space, you mean it.", "care"],
    ["MINA_HOME_ADMITTED_BURDEN_FEAR", ["mina"], "home:burden-fear", "Mina knows part of you still worries about becoming too much work.", "vulnerability"],

    // Household decisions are remembered by both roommates.
    ["HOUSE_RULE_PRIVATE_DOOR", ["bakugo","kirishima"], "boundary:closed-door", "They remember that a closed bedroom door means private.", "boundary"],
    ["HOUSE_RULE_GUEST_HEADSUP", ["bakugo","kirishima"], "boundary:guest-headsup", "They remember that surprise guests make home feel less private.", "boundary"],
    ["HOUSE_RULE_FOOD_LABELS", ["bakugo","kirishima"], "boundary:food-labels", "They remember your rule about labeling communal food.", "boundary"],
    ["HOUSEHOLD_FOOD_SHARED_BASICS", ["bakugo","kirishima"], "household:shared-basics", "You agreed to keep household basics communal.", "household"],
    ["HOUSEHOLD_FOOD_SEPARATE_DEFAULT", ["bakugo","kirishima"], "household:separate-food", "You agreed groceries stay separate unless explicitly shared.", "household"],
    ["HOUSEHOLD_FOOD_SPLIT_STAPLES", ["bakugo","kirishima"], "household:split-staples", "You agreed to split recurring staples and keep the rest individual.", "household"],
    ["HOUSEHOLD_CHORES_ROTATION", ["bakugo","kirishima"], "household:chore-rotation", "The household uses the chore rhythm you helped choose.", "household"],
    ["HOUSEHOLD_CHORES_ZONES", ["bakugo","kirishima"], "household:chore-zones", "The household remembers the zone-based chore system you chose.", "household"],
    ["HOUSEHOLD_CHORES_SHARED_LIST", ["bakugo","kirishima"], "household:shared-list", "The shared list became part of how the apartment runs.", "household"],

    // Care and ordinary life become personal knowledge.
    ["CARE_ACCEPTED_PLAINLY", ["bakugo"], "care:accept-plainly", "Katsuki has seen that you can accept care without paying it back immediately.", "care"],
    ["CARE_ACCEPTED_WITH_CHECK", ["bakugo"], "care:check-first", "Katsuki knows you sometimes need to verify care is really freely offered.", "care"],
    ["CARE_ACCEPTED_ON_OWN_TERMS", ["bakugo"], "care:on-own-terms", "Katsuki knows you accept help more easily when you can take it on your own terms.", "care"],
    ["COMMON_ROOM_GAME", ["bakugo","kirishima"], "shared-space:game", "They know a console can lure you into the common room.", "preference"],
    ["COMMON_ROOM_READ", ["bakugo","kirishima"], "shared-space:read", "They know you can happily read in company without needing conversation.", "preference"],
    ["COMMON_ROOM_PREP", ["bakugo","kirishima"], "shared-space:prep", "They know quiet parallel work can make the common room feel usable.", "preference"],
    ["GAME_NIGHT_COOP", ["bakugo","kirishima"], "games:coop", "They remember you chose co-op when the household played together.", "preference"],
    ["GAME_NIGHT_RACING", ["bakugo","kirishima"], "games:racing", "They remember exactly who started the racing-game problem.", "preference"],
    ["GAME_NIGHT_PARTY", ["bakugo","kirishima"], "games:party", "They know you are willing to weaponize a ridiculous party game.", "preference"],
    ["SICK_DAY_PRIVATE", ["bakugo","kirishima"], "sick:private", "They remember that when you are ill, privacy can feel safest.", "care"],
    ["SICK_DAY_SOFA", ["bakugo","kirishima"], "sick:company", "They remember you can tolerate being unwell in quiet company.", "care"],
    ["SICK_DAY_INDEPENDENT", ["bakugo","kirishima"], "sick:independent", "They remember you prefer supplies and autonomy when you are unwell.", "care"],
    ["HOME_CARE_QUIET", ["bakugo","kirishima"], "care:quiet", "They have learned that quiet practical care can land well.", "care"],
    ["HOME_CARE_TEASE", ["bakugo","kirishima"], "care:tease", "They know humor can make being cared for easier to survive.", "care"],
    ["HOME_CARE_DIRECT", ["bakugo","kirishima"], "care:direct", "They know direct reassurance matters when somebody is running on empty.", "care"],

    // Optional hangout memories.
    ["BAKUGO_GRID_MATH", ["bakugo"], "bakugo:grid-math", "Katsuki remembers that you spotted a useful pattern in his training grid.", "competence"],
    ["BAKUGO_GRID_TEA", ["bakugo"], "bakugo:grid-tea", "Katsuki remembers your consulting fee was tea.", "humor"],
    ["BAKUGO_GRID_ASK", ["bakugo"], "bakugo:grid-question", "Katsuki remembers that you asked what the grid was for before changing it.", "trust"],

    // Familiar Distance — later household / attraction-phase memories.
    ["MINA_HOME_WORD_EASY", ["mina"], "home:easy", "Mina knows the shared apartment became easier than you expected.", "household"],
    ["MINA_HOME_WORD_SCARY", ["mina"], "home:scary", "Mina knows it scared you a little how quickly the shared home started to matter.", "vulnerability"],
    ["MINA_HOME_WORD_MINE", ["mina"], "home:mine", "Mina remembers the day you called the shared apartment yours too.", "household"],
    ["KIRISHIMA_OFFDUTY_LISTEN", ["kirishima"], "offduty:listen", "Eijiro knows he does not have to package a bad day for you.", "care"],
    ["KIRISHIMA_OFFDUTY_NOTICE", ["kirishima"], "offduty:notice", "Eijiro knows you can tell when his smile is doing extra work.", "vulnerability"],
    ["KIRISHIMA_OFFDUTY_TEASE", ["kirishima"], "offduty:tease", "Eijiro knows low-volume humor is allowed on rough days.", "care"],
    ["SPICE_TOLERANCE_HIGH", ["bakugo"], "spice:high", "Katsuki knows you can handle serious heat.", "preference"],
    ["SPICE_TOLERANCE_MEDIUM", ["bakugo"], "spice:medium", "Katsuki knows you like spice, just not at his maximum setting.", "preference"],
    ["SPICE_TOLERANCE_LOW", ["bakugo"], "spice:low", "Katsuki knows your preferred spice level needs a gentler hand.", "preference"],
    ["BAD_DAY_SUPPORT_VENT", ["bakugo","kirishima"], "bad-day:vent", "They know some workdays need listening before solutions.", "care"],
    ["BAD_DAY_SUPPORT_SOLVE", ["bakugo","kirishima"], "bad-day:solve", "They know you sometimes want a second brain for the part you can actually change.", "care"],
    ["BAD_DAY_SUPPORT_DISTRACT", ["bakugo","kirishima"], "bad-day:distract", "They know getting you out of work-mode can be the useful thing.", "care"],
    ["SHOPPING_STYLE_LIST", ["bakugo","kirishima"], "errands:list", "They know you can make a grocery list behave like a system.", "household"],
    ["SHOPPING_STYLE_DIVIDE", ["bakugo","kirishima"], "errands:divide", "They remember the household can split errands and reconvene.", "household"],
    ["SHOPPING_STYLE_WANDER", ["bakugo","kirishima"], "errands:wander", "They know you are capable of abandoning the list for something interesting.", "household"],
    ["BAKUGO_CROWD_THANK", ["bakugo"], "crowd:thanks", "Katsuki remembers you accepted a small protective gesture without making it complicated.", "trust"],
    ["BAKUGO_CROWD_TEASE", ["bakugo"], "crowd:tease", "Katsuki remembers you teased him for an ordinary protective reflex.", "humor"],
    ["BAKUGO_CROWD_IGNORE", ["bakugo"], "crowd:ignore", "Katsuki remembers you let an ordinary protective moment stay ordinary.", "trust"],
    ["MINA_HOUSEHOLD_MISS", ["mina"], "household:miss", "Mina knows you notice when your roommates' schedules stop overlapping with yours.", "vulnerability"],
    ["MINA_HOUSEHOLD_PEACE", ["mina"], "household:peace", "Mina knows the shared apartment feels peaceful in a way you did not expect.", "household"],
    ["MINA_HOUSEHOLD_OVERTHINK", ["mina"], "household:overthink", "Mina knows there are parts of the household dynamic you are deliberately not naming yet.", "vulnerability"]
  ];

  const MESSAGE_MEMORIES = [
    ["MG_K_002", "boundary", "kirishima", "after-work:space", "Eijiro knows a long day can mean going straight to your room.", "care"],
    ["MG_K_004", "tea", "kirishima", "drink:cold-tea", "Eijiro remembers that cold tea is a safe convenience-store offer.", "preference"],
    ["MG_K_004", "snack", "kirishima", "snack:salty", "Eijiro remembers that something salty is usually welcome.", "preference"],
    ["MG_B_002", "coffee", "bakugo", "household:coffee", "Katsuki knows you actually notice when the shared coffee is running low.", "household"],
    ["MG_B_009", "surprise", "bakugo", "groceries:surprise", "Katsuki has been given permission to choose the snack once in a while.", "preference"],
    ["MG_M_010", "needed", "mina", "mina:needed-low-key-time", "Mina knows one low-key plan landed exactly when you needed it.", "care"]
  ];

  function defaults() {
    return { schemaVersion:SCHEMA, version:VERSION, people:{ mina:{memories:{}}, bakugo:{memories:{}}, kirishima:{memories:{}} }, callbackHistory:[], migrations:{} };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.relationshipMemory || typeof root.relationshipMemory !== "object" || Array.isArray(root.relationshipMemory)) root.relationshipMemory = defaults();
    const s = root.relationshipMemory;
    s.schemaVersion = SCHEMA;
    s.version = VERSION;
    s.people ||= {};
    for (const id of PEOPLE) {
      s.people[id] ||= { memories:{} };
      s.people[id].memories = s.people[id].memories && typeof s.people[id].memories === "object" ? s.people[id].memories : {};
    }
    s.callbackHistory = Array.isArray(s.callbackHistory) ? s.callbackHistory.slice(-300) : [];
    s.migrations ||= {};
    return s;
  }

  function remember(personId, key, label, category="shared", detail="", source="runtime", at=null) {
    if (!PEOPLE.includes(personId) || !key) return false;
    const s = ensureState();
    const existing = s.people[personId].memories[key];
    if (existing) return false;
    s.people[personId].memories[key] = { key, label:label || key, category, detail:detail || "", source, firstSeenAt:at || new Date().toISOString() };
    return true;
  }

  function syncTraitMemories() {
    const traits = app.getState().story?.traits || {};
    let changed = false;
    for (const [trait, people, key, label, category] of TRAIT_MEMORIES) {
      if (!traits[trait]) continue;
      for (const personId of people) changed = remember(personId,key,label,category,"",`trait:${trait}`) || changed;
    }
    return changed;
  }

  function syncMessageMemories() {
    const social = app.getState().story?.social || {};
    const rootReplies = social.messageReplies || {};
    const threads = social.messageThreads || {};
    let changed = false;
    for (const [groupId, optionId, personId, key, label, category] of MESSAGE_MEMORIES) {
      const selected = rootReplies[groupId] || threads[groupId]?.selections?.root;
      if (selected === optionId) changed = remember(personId,key,label,category,"",`message:${groupId}:${optionId}`) || changed;
    }
    return changed;
  }

  function syncGiftMemories() {
    const gifts = app.getState().giftSystem;
    if (!gifts) return false;
    const catalog = Object.fromEntries((window.LifeRPGGifts?.catalog?.() || []).map(item => [item.id,item]));
    let changed = false;
    for (const entry of gifts.history || []) {
      if (entry?.type !== "given" || !PEOPLE.includes(entry.personId)) continue;
      const item = catalog[entry.giftId];
      const reaction = String(entry.reaction || "neutral");
      if (reaction === "loved") changed = remember(entry.personId,"gift:loved",`A gift you chose landed unusually well.`,"gift",item?.name || "",`gift:${entry.giftId}`,entry.at) || changed;
      if (reaction === "liked") changed = remember(entry.personId,"gift:liked",`They remember a gift that suited them.`,"gift",item?.name || "",`gift:${entry.giftId}`,entry.at) || changed;
      if (item?.keepsake && reaction !== "disliked") changed = remember(entry.personId,"gift:keepsake",`Something you gave them became part of their space.`,"gift",item?.name || "",`gift:${entry.giftId}`,entry.at) || changed;
    }
    return changed;
  }

  function syncSeasonalMemories() {
    const archive = app.getState().seasonalLife?.archive || [];
    let changed = false;
    for (const entry of archive) {
      if (entry?.type !== "birthday" || !PEOPLE.includes(entry.personId)) continue;
      changed = remember(entry.personId,"season:birthday-shared",`You shared a small birthday-season moment.`,"season","",`season:${entry.id}`,entry.seenAt) || changed;
    }
    return changed;
  }

  function syncAll({save=true}={}) {
    if (syncing) return false;
    syncing = true;
    let changed = false;
    try {
      ensureState();
      changed = syncTraitMemories() || changed;
      changed = syncMessageMemories() || changed;
      changed = syncGiftMemories() || changed;
      changed = syncSeasonalMemories() || changed;
      if (changed && save) app.saveState({source:"relationship-memory-sync"});
    } finally { syncing = false; }
    return changed;
  }

  function hasMemory(personId,key) { return Boolean(ensureState().people?.[personId]?.memories?.[key]); }
  function matches(req) {
    if (!req) return false;
    if (typeof req === "string") return PEOPLE.some(id => hasMemory(id,req));
    return hasMemory(req.personId || req.person || "", req.key || req.id || "");
  }
  function list(personId,{limit=8}={}) {
    const values = Object.values(ensureState().people?.[personId]?.memories || {});
    return values.sort((a,b) => String(b.firstSeenAt||"").localeCompare(String(a.firstSeenAt||""))).slice(0,limit);
  }
  function sharedThreadMarkup(personId) {
    const visibleCategories = new Set(["preference","boundary","household","gift","season","competence","humor"]);
    const items = list(personId,{limit:20}).filter(item => visibleCategories.has(item.category)).slice(0,6);
    if (!items.length) return "";
    return `<section class="relationship-memory-threads-v314ba"><div class="relationship-memory-head-v314ba"><small>SHARED THREADS</small><span>Things that stuck</span></div><div class="relationship-memory-grid-v314ba">${items.map(item => `<div class="relationship-memory-chip-v314ba is-${escapeAttr(item.category)}"><span>${memoryIcon(item.category)}</span><p>${escapeHtml(item.label)}</p></div>`).join("")}</div></section>`;
  }
  function memoryIcon(category) { return ({preference:"✦",care:"♡",boundary:"⌂",household:"⌂",vulnerability:"☾",gift:"🎁",season:"🍃",competence:"◆",humor:"☺",trust:"◇"})[category] || "·"; }
  function escapeHtml(v){ return String(v||"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function escapeAttr(v){ return String(v||"").replace(/[^a-z0-9_-]/gi,"-"); }

  function resolveText(text) {
    return String(text || "").replace(/\{\{memory:([^:}]+):([^}]+)\}\}/g, (_m, personId, key) => {
      const mem = ensureState().people?.[personId]?.memories?.[key];
      return mem?.detail || mem?.label || "that thing";
    });
  }

  function schedule(){ clearTimeout(timer); timer=setTimeout(()=>syncAll({save:true}),30); }
  window.addEventListener("life-rpg:state-saved", event => { if (event?.detail?.source === "relationship-memory-sync") return; schedule(); });
  window.addEventListener("life-rpg:render", schedule);

  window.LifeRPGRelationshipMemory = { version:VERSION, sync:syncAll, remember, hasMemory, matches, list, sharedThreadMarkup, resolveText };
  syncAll({save:true});
})();
