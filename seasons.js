(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app) return;

  const VERSION = "0.31.4az";
  const SCHEMA_VERSION = 1;
  const MAX_ARCHIVE = 120;

  const SEASONS = {
    spring: { label: "Spring", icon: "🌸", months: [3,4,5], note: "Soft air, longer light, and the first sense that the year is moving again." },
    summer: { label: "Summer", icon: "🎐", months: [6,7,8], note: "Heat, cold drinks, late light and the hum of summer outside." },
    autumn: { label: "Autumn", icon: "🍁", months: [9,10,11], note: "Cooler evenings, warmer food, and the apartment slowly turning inward." },
    winter: { label: "Winter", icon: "❄️", months: [12,1,2], note: "Cold windows, warm rooms, and small reasons to stay close to home." }
  };

  // Official anime profile birthdays. These are public character-profile facts,
  // not story spoilers or future Life RPG plot information.
  const BIRTHDAYS = {
    bakugo: { month: 4, day: 20, name: "Katsuki", unlock: state => Boolean(state.flags?.DYNARIOT_MOVE_IN_COMPLETE || state.flags?.SHARED_APARTMENT_IS_HOME) },
    mina: { month: 7, day: 30, name: "Mina", unlock: state => Boolean(state.flags?.STORY_MINA_FRIENDSHIP_STARTED || state.flags?.MINA_HANGOUTS_UNLOCKED) },
    kirishima: { month: 10, day: 16, name: "Eijiro", unlock: state => Boolean(state.flags?.DYNARIOT_MOVE_IN_COMPLETE || state.flags?.SHARED_APARTMENT_IS_HOME) }
  };

  const SPECIAL_EVENTS = [
    { id:"new-year", label:"New Year", icon:"🎍", start:[12,29], end:[1,7], findPool:["omamori-charm","winter-hand-warmers","black-tea-tin"], blurb:"The year turns slowly here: cleaning, warm food, messages, quiet streets and the feeling of beginning again." },
    { id:"setsubun", label:"Setsubun", icon:"🫘", start:[2,1], end:[2,5], findPool:["roasted-soy-snack","spicy-rice-crackers","fruit-candy"], blurb:"A small early-February tradition for driving out bad luck and making room for a better season." },
    { id:"valentine", label:"Valentine season", icon:"🍫", start:[2,12], end:[2,18], findPool:["chocolate-truffles","local-bakery-cookies","black-tea-tin"], blurb:"Chocolate displays are everywhere. It can be romantic, friendly, obligatory, playful — or simply an excuse for good sweets." },
    { id:"white-day", label:"White Day season", icon:"🤍", start:[3,12], end:[3,18], findPool:["white-chocolate-box","hair-clips","soft-socks"], blurb:"The shops have changed palettes again. Small return gifts and sweets have taken over the displays." },
    { id:"golden-week", label:"Golden Week", icon:"🌿", start:[4,29], end:[5,6], findPool:["trail-map-notebook","trail-thermos","retro-game-charm"], blurb:"A cluster of holidays changes the rhythm outside — busier stations, freer afternoons, and the temptation to go somewhere." },
    { id:"tanabata", label:"Tanabata season", icon:"⭐", start:[7,1], end:[7,10], findPool:["star-charm","cute-stationery","hair-clips"], blurb:"Paper wishes, stars and bright decorations keep appearing in shops and public spaces." },
    { id:"obon", label:"Obon season", icon:"🏮", start:[8,10], end:[8,18], findPool:["summer-hand-fan","black-tea-tin","fruit-candy"], blurb:"The middle of August carries a different pace: travel, family time and summer evenings that feel unusually full." },
    { id:"halloween", label:"Halloween week", icon:"🎃", start:[10,25], end:[11,2], findPool:["halloween-candy","nail-stickers","plush-charm"], blurb:"Convenience stores, cafés and shop windows have all committed to orange, purple and tiny ghosts." },
    { id:"christmas", label:"Christmas season", icon:"🎄", start:[12,20], end:[12,28], findPool:["winter-hand-warmers","holiday-cookie-tin","heatproof-mug"], blurb:"Lights and winter displays make ordinary errands feel a little more staged than usual." }
  ];

  const SEASONAL_MOMENTS = {
    spring: {
      solo: [
        "I crack the window for ten minutes and the whole apartment smells different afterward — damp air, city dust, something green underneath it.",
        "There is a patch of afternoon light on the floor that did not reach this far a month ago. I leave it alone instead of immediately filling the space with something useful.",
        "The weather keeps changing its mind. I put a cardigan on, take it off, put it back on, and decide that spring is mostly a negotiation."
      ],
      bakugo: [
        "Katsuki has opened the kitchen window while he cooks. Cool spring air keeps stealing the steam, and he keeps pretending he does not notice me lingering nearby.",
        "Katsuki comes in with the particular irritated expression of someone who dressed for the wrong version of spring. His jacket lands over a chair with a muttered complaint about useless weather forecasts."
      ],
      kirishima: [
        "Eijiro has somehow decided that the first properly mild evening is an event. The balcony door is open, his drink is sweating onto a coaster, and he looks absurdly pleased about fresh air.",
        "Eijiro pauses by the window on his way through the living room. “It actually feels like spring today.” He says it like he personally arranged it."
      ],
      both: [
        "The apartment keeps drifting between warm and cold. Eijiro wants the balcony door open; Katsuki wants him to stop heating the entire city. Somehow this becomes a ten-minute argument about airflow.",
        "Someone has brought seasonal snacks home. No one claims responsibility. All three of us keep eating them anyway."
      ]
    },
    summer: {
      solo: [
        "The apartment is quiet except for the air conditioner and the summer noise outside. I stand in front of the open fridge longer than necessary and call it climate management.",
        "I wait until the sun is lower before opening the balcony door. The air is still warm, but at least it no longer feels personally hostile.",
        "A cold drink, bare feet, and absolutely no unnecessary movement. This is not laziness. This is summer strategy."
      ],
      bakugo: [
        "Katsuki comes home warm, annoyed and carrying a cold drink he definitely bought because he knew the apartment would be unbearable. He puts a second one down without comment.",
        "Katsuki has the air conditioner set with military precision. I change it by one degree. He notices from another room. Of course he does."
      ],
      kirishima: [
        "Eijiro appears from the balcony with his hair pulled back and a bottle of water pressed to the side of his neck. “Okay,” he says. “Summer is trying to kill me.”",
        "Eijiro has bought more cold drinks than the fridge can reasonably hold. His solution is apparently to hand me one immediately."
      ],
      both: [
        "The living room has become neutral territory around the air conditioner. Nobody planned to gather here; the temperature made the decision for us.",
        "A debate about dinner collapses under the heat until somebody suggests something cold. The agreement is so immediate it is almost moving."
      ]
    },
    autumn: {
      solo: [
        "The first genuinely cool evening makes the apartment feel different. I close the balcony door earlier than usual and immediately want something warm to drink.",
        "Seasonal packaging has taken over every shop again. I come home with one small autumn thing I did not technically need and decide that this is what restraint looks like.",
        "The light is disappearing earlier now. I turn on a lamp before I consciously notice the room has gone dim."
      ],
      bakugo: [
        "Katsuki has switched from cold drinks to something steaming without announcing the seasonal transition. The mug warms both his hands while he reads something on his phone.",
        "The kitchen smells warm and savory when I get home. Katsuki glances at me once and says, “Wash your hands. Food’s almost done.” Apparently autumn has arrived."
      ],
      kirishima: [
        "Eijiro comes in carrying the first convenience-store autumn snack that caught his eye and immediately breaks it in half to share.",
        "Eijiro has found the softest blanket in the apartment and looks entirely unashamed about it. “It’s cold now,” he says, as if presenting legal evidence."
      ],
      both: [
        "The windows are shut, the lights are warm, and all three of us have ended up in the living room without arranging it. The apartment feels smaller in a way I do not dislike.",
        "Dinner drifts later because everyone keeps hovering in the kitchen instead of leaving. The conversation is mostly nonsense. Nobody seems eager to end it."
      ]
    },
    winter: {
      solo: [
        "The windows are cold enough to make me pull my hand back. I turn away from them, make something hot, and let the apartment be a small warm world for a while.",
        "I have reached the season where leaving a blanket requires justification. So far, nothing on my list has made a convincing case.",
        "Outside looks sharp and cold. Inside smells faintly like tea and heating. I decide not to rush anywhere."
      ],
      bakugo: [
        "Katsuki complains when I hover near the kitchen for warmth, then shoves a hot mug toward me like he is solving an operational problem.",
        "Katsuki comes in from the cold with pink ears and an expression daring anyone to mention them. I value my life and say nothing."
      ],
      kirishima: [
        "Eijiro walks in rubbing his hands together dramatically. “I can’t feel my fingers.” He can. He just wants sympathy and access to the heater.",
        "Eijiro has somehow acquired an enormous winter drink and keeps offering me sips like this is a normal shared resource."
      ],
      both: [
        "The heater has turned the living room into the only sensible place in the apartment. We migrate toward it one by one and pretend this was not a collective decision.",
        "Cold weather has made everyone suspiciously domestic. There are warm drinks, something cooking, and absolutely no reason for me to notice how safe the room feels."
      ]
    }
  };

  const SPECIAL_MOMENTS = {
    "new-year": [
      "The apartment has that just-after-midnight quiet where everything feels briefly reset. No dramatic resolutions. Just a new page, warm food, and people I did not expect to be part of this year.",
      "New Year has turned ordinary routines into tiny rituals: cleaning one last thing, eating something warm, sending a message, standing still long enough to notice that another year actually started."
    ],
    setsubun: [
      "A tiny packet of roasted soybeans has appeared on the counter. I have no idea whether anyone intends to perform the tradition properly, but apparently the apartment is participating at least symbolically.",
      "February is cold enough that throwing beans outside sounds less appealing than keeping the door shut. The sentiment — less bad luck, more good — can stay."
    ],
    valentine: [
      "Every shop is suddenly ninety percent chocolate and implication. I manage to buy something for myself without assigning it narrative significance. Personal growth.",
      "Valentine displays are everywhere. The nice thing about being an adult is that chocolate can mean romance, friendship, obligation, or simply excellent timing."
    ],
    "white-day": [
      "The seasonal shelves have changed from red and chocolate-brown to white, pale blue and increasingly elaborate little boxes. Japan really does commit to a retail sequel.",
      "White Day has arrived with an aggressive amount of pastel packaging. I am beginning to respect the logistical commitment of seasonal confectionery."
    ],
    "golden-week": [
      "The city feels subtly rearranged by Golden Week. Stations are busier, work rhythms are stranger, and everyone seems to be either leaving town or determined not to.",
      "A cluster of holidays changes the shape of the week enough that even an ordinary afternoon feels borrowed. I try not to fill all of it with obligations."
    ],
    tanabata: [
      "There are paper wishes hanging in places that were ordinary last week. I read none of the private ones. I still spend longer than necessary looking at the colors moving in the air.",
      "Star decorations have appeared across the city. I consider writing down a wish, then immediately become suspicious of how seriously I might take the question."
    ],
    obon: [
      "Mid-August has a different rhythm. Travel, family plans and summer heat overlap until the city feels both crowded and strangely absent in pockets.",
      "The season carries a quiet weight underneath the summer noise. I let the evening be gentle instead of trying to make it productive."
    ],
    halloween: [
      "The neighborhood has become progressively more orange all week. Even the convenience store desserts have tiny ghosts on them. Resistance is obviously pointless.",
      "Halloween here is less haunted house and more coordinated seasonal packaging, costumes and an excuse for themed snacks. I can work with that."
    ],
    christmas: [
      "Winter lights have made the walk home prettier than it has any right to be. The apartment feels warmer when I step back inside.",
      "Christmas is not a day off here, which somehow makes the decorations feel even more like a deliberate layer of sparkle over ordinary life."
    ]
  };

  const BIRTHDAY_MOMENTS = {
    bakugo: [
      "Katsuki reacts to birthday attention like it is a tactical inconvenience, which would be more convincing if he did not remember exactly who bothered and how.",
      "His birthday sits strangely between public-hero fact and private household reality now. I know the date for reasons I am absolutely not unpacking today."
    ],
    kirishima: [
      "Eijiro is much easier to celebrate than he thinks he is. He accepts birthday attention with open delight and then immediately tries to make everyone else part of it.",
      "A birthday suits Eijiro embarrassingly well: sincere enthusiasm, food, people he likes, and absolutely no talent for pretending he is not happy."
    ],
    mina: [
      "Mina treats her birthday like a social event in the best possible way — not a demand for attention, more an excuse to make something fun happen with people she actually likes.",
      "There is something lovely about getting to know someone's birthday as a friend instead of as trivia. Mina makes the distinction feel obvious."
    ]
  };

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function weekKey(date = new Date()) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const offset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - offset);
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

  function deterministicPick(list, seed) {
    if (!Array.isArray(list) || !list.length) return null;
    return list[Math.min(list.length - 1, Math.floor(hashFraction(seed) * list.length))];
  }

  function makeDate(year, month, day) { return new Date(year, month - 1, day, 12, 0, 0, 0); }
  function dayDiff(a, b) { return Math.round((makeDate(a.getFullYear(), a.getMonth()+1, a.getDate()) - makeDate(b.getFullYear(), b.getMonth()+1, b.getDate())) / 86400000); }
  function mdValue(month, day) { return month * 100 + day; }

  function inAnnualWindow(date, start, end) {
    const value = mdValue(date.getMonth()+1, date.getDate());
    const s = mdValue(start[0], start[1]);
    const e = mdValue(end[0], end[1]);
    return s <= e ? value >= s && value <= e : value >= s || value <= e;
  }

  function seasonForDate(date = new Date()) {
    const month = date.getMonth() + 1;
    return Object.entries(SEASONS).find(([, meta]) => meta.months.includes(month))?.[0] || "spring";
  }

  function nthWeekday(year, month, weekday, n) {
    const first = makeDate(year, month, 1);
    const delta = (weekday - first.getDay() + 7) % 7;
    return makeDate(year, month, 1 + delta + (n - 1) * 7);
  }

  function vernalEquinoxDay(year) {
    if (year >= 1980 && year <= 2099) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return 20;
  }

  function autumnEquinoxDay(year) {
    if (year >= 1980 && year <= 2099) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    return 23;
  }

  function baseJapaneseHoliday(date) {
    const y = date.getFullYear();
    const m = date.getMonth()+1;
    const d = date.getDate();
    const key = `${m}-${d}`;
    const fixed = {
      "1-1":"New Year's Day", "2-11":"National Foundation Day", "2-23":"Emperor's Birthday",
      "4-29":"Showa Day", "5-3":"Constitution Memorial Day", "5-4":"Greenery Day", "5-5":"Children's Day",
      "8-11":"Mountain Day", "11-3":"Culture Day", "11-23":"Labor Thanksgiving Day"
    };
    if (fixed[key]) return fixed[key];
    if (localDateKey(date) === localDateKey(nthWeekday(y, 1, 1, 2))) return "Coming of Age Day";
    if (localDateKey(date) === localDateKey(nthWeekday(y, 7, 1, 3))) return "Marine Day";
    if (localDateKey(date) === localDateKey(nthWeekday(y, 9, 1, 3))) return "Respect for the Aged Day";
    if (localDateKey(date) === localDateKey(nthWeekday(y, 10, 1, 2))) return "Sports Day";
    if (m === 3 && d === vernalEquinoxDay(y)) return "Vernal Equinox Day";
    if (m === 9 && d === autumnEquinoxDay(y)) return "Autumnal Equinox Day";
    return null;
  }

  function japaneseHolidayForDate(date = new Date()) {
    const base = baseJapaneseHoliday(date);
    if (base) return { label: base, kind:"national" };

    // Citizen's Holiday: a non-holiday between two national holidays.
    const prev = new Date(date); prev.setDate(date.getDate()-1);
    const next = new Date(date); next.setDate(date.getDate()+1);
    if (baseJapaneseHoliday(prev) && baseJapaneseHoliday(next)) return { label:"Citizen's Holiday", kind:"citizen" };

    // Substitute holiday: when a national holiday lands on Sunday, the next
    // otherwise-normal day becomes a holiday. Walk back through consecutive holidays.
    let cursor = new Date(date);
    for (let i = 1; i <= 3; i += 1) {
      cursor = new Date(date); cursor.setDate(date.getDate()-i);
      const priorHoliday = baseJapaneseHoliday(cursor);
      if (!priorHoliday) break;
      if (cursor.getDay() === 0) return { label:`Substitute holiday · ${priorHoliday}`, kind:"substitute" };
    }
    return null;
  }

  function activeSpecialEvents(date = new Date()) {
    return SPECIAL_EVENTS.filter(event => inAnnualWindow(date, event.start, event.end));
  }

  function birthdayStatus(personId, date = new Date()) {
    const birthday = BIRTHDAYS[personId];
    const state = app.getState();
    if (!birthday || !birthday.unlock(state)) return null;
    const thisYear = makeDate(date.getFullYear(), birthday.month, birthday.day);
    const diff = dayDiff(date, thisYear);
    // Generous, no-FOMO window: three days early and a full week after.
    if (diff < -3 || diff > 7) return null;
    return {
      personId,
      name: birthday.name,
      diff,
      exact: diff === 0,
      label: diff === 0 ? `${birthday.name}'s birthday` : diff < 0 ? `${birthday.name}'s birthday is coming up` : `A little belated birthday window for ${birthday.name}`,
      key: `birthday:${personId}:${date.getFullYear()}`
    };
  }

  function activeBirthdays(date = new Date()) {
    return Object.keys(BIRTHDAYS).map(id => birthdayStatus(id, date)).filter(Boolean);
  }

  function defaults() {
    return { schemaVersion:SCHEMA_VERSION, seenMoments:{}, claimedFinds:{}, archive:[], migrations:{} };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.seasonalLife || typeof root.seasonalLife !== "object" || Array.isArray(root.seasonalLife)) root.seasonalLife = defaults();
    const s = root.seasonalLife;
    s.schemaVersion = SCHEMA_VERSION;
    s.seenMoments = s.seenMoments && typeof s.seenMoments === "object" && !Array.isArray(s.seenMoments) ? s.seenMoments : {};
    s.claimedFinds = s.claimedFinds && typeof s.claimedFinds === "object" && !Array.isArray(s.claimedFinds) ? s.claimedFinds : {};
    s.archive = Array.isArray(s.archive) ? s.archive.slice(-MAX_ARCHIVE) : [];
    s.migrations = s.migrations && typeof s.migrations === "object" && !Array.isArray(s.migrations) ? s.migrations : {};
    return s;
  }

  function eventYearKey(event, date = new Date()) {
    // New Year starts in December but belongs to the upcoming year once the window begins.
    const year = event.id === "new-year" && date.getMonth()+1 === 12 ? date.getFullYear()+1 : date.getFullYear();
    return `${event.id}:${year}`;
  }

  function residentsKey() {
    const hub = window.LifeRPGStoryUI?.getSharedApartmentHubDetails?.();
    if (!hub?.active) return "solo";
    const home = (hub.residents || []).filter(item => item.home).map(item => item.id);
    if (home.includes("bakugo") && home.includes("kirishima")) return "both";
    if (home.includes("bakugo")) return "bakugo";
    if (home.includes("kirishima")) return "kirishima";
    return "solo";
  }

  function weeklySeasonMoment(date = new Date()) {
    const season = seasonForDate(date);
    const resident = residentsKey();
    const pool = SEASONAL_MOMENTS[season]?.[resident] || SEASONAL_MOMENTS[season]?.solo || [];
    const text = deterministicPick(pool, `${weekKey(date)}:${season}:${resident}:ambient`);
    const id = `ambient:${weekKey(date)}:${season}:${resident}`;
    return text ? { id, type:"ambient", icon:SEASONS[season].icon, title:`A little ${SEASONS[season].label.toLowerCase()} moment`, text, season } : null;
  }

  function specialMoment(event, date = new Date()) {
    const pool = SPECIAL_MOMENTS[event.id] || [];
    const text = deterministicPick(pool, `${eventYearKey(event,date)}:special`);
    return text ? { id:`special:${eventYearKey(event,date)}`, type:"special", icon:event.icon, title:event.label, text, eventId:event.id } : null;
  }

  function birthdayMoment(status, date = new Date()) {
    const pool = BIRTHDAY_MOMENTS[status.personId] || [];
    const text = deterministicPick(pool, `${status.key}:birthday`);
    return text ? { id:`special:${status.key}`, type:"birthday", icon:"🎂", title:status.label, text, personId:status.personId } : null;
  }

  function snapshotForDate(date = new Date()) {
    const season = seasonForDate(date);
    const holiday = japaneseHolidayForDate(date);
    const specials = activeSpecialEvents(date);
    const birthdays = activeBirthdays(date);
    return { dateKey:localDateKey(date), season, seasonMeta:{...SEASONS[season]}, holiday, specials, birthdays };
  }

  function contextSignals(date = new Date()) {
    const snap = snapshotForDate(date);
    return [
      `season:${snap.season}`,
      ...snap.specials.map(event => `special:${event.id}`),
      ...(snap.holiday ? ["japan-holiday"] : []),
      ...snap.birthdays.map(item => `birthday:${item.personId}`)
    ];
  }

  function giftContext(personId, date = new Date()) {
    const birthday = birthdayStatus(personId, date);
    if (!birthday) return { birthdayWindow:false, multiplier:1, label:"" };
    return { birthdayWindow:true, multiplier:1.35, label:birthday.exact ? "Birthday today" : "Birthday window", detail:`birthday-window:${date.getFullYear()}` };
  }

  function addArchive(entry) {
    const s = ensureState();
    if (s.archive.some(item => item.id === entry.id)) return false;
    s.archive.push({ ...entry, seenAt:new Date().toISOString() });
    s.archive = s.archive.slice(-MAX_ARCHIVE);
    return true;
  }

  function markMomentSeen(moment) {
    if (!moment?.id) return false;
    const s = ensureState();
    if (s.seenMoments[moment.id]) return false;
    s.seenMoments[moment.id] = new Date().toISOString();
    addArchive({ id:moment.id, type:moment.type, icon:moment.icon, title:moment.title, text:moment.text });
    app.saveState({ source:"seasonal-moment" });
    return true;
  }

  function findOptions(event, date = new Date()) {
    const key = eventYearKey(event,date);
    if (ensureState().claimedFinds[key]) return [];
    const catalog = window.LifeRPGGifts?.catalog?.() || [];
    const byId = new Map(catalog.map(item => [item.id,item]));
    return (event.findPool || []).map(id => byId.get(id)).filter(Boolean);
  }

  function claimSeasonalFind(eventId, giftId, date = new Date()) {
    const event = activeSpecialEvents(date).find(item => item.id === eventId);
    if (!event) return false;
    const options = findOptions(event,date);
    if (!options.some(item => item.id === giftId)) return false;
    const gifts = window.LifeRPGGifts;
    if (!gifts?.grantGift) return false;
    const key = eventYearKey(event,date);
    const granted = gifts.grantGift(giftId, { source:"seasonal", sourceLabel:`${event.label} find`, sourceEventId:`seasonal:${key}:${giftId}`, silent:true });
    if (!granted) return false;
    ensureState().claimedFinds[key] = { giftId, at:new Date().toISOString() };
    app.saveState({ source:"seasonal-gift-find" });
    app.showToast?.(`Seasonal find added to your Gift Shelf.`);
    render();
    return true;
  }

  function escape(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? ""); }

  function ensureDialog() {
    let dialog = document.getElementById("seasonalLifeDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "seasonalLifeDialog";
    dialog.className = "rpg-dialog seasonal-dialog-v314az";
    dialog.innerHTML = `<div class="seasonal-dialog-shell-v314az"><div class="dialog-heading"><div><p class="eyebrow">SEASONAL LIFE</p><h2 id="seasonalDialogTitle">A little moment</h2></div><button class="close-button" type="button" data-seasonal-close aria-label="Close">×</button></div><div id="seasonalDialogBody"></div></div>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function openMoment(moment) {
    if (!moment) return;
    const dialog = ensureDialog();
    dialog.querySelector("#seasonalDialogTitle").textContent = moment.title;
    dialog.querySelector("#seasonalDialogBody").innerHTML = `<article class="seasonal-prose-v314az"><span>${moment.icon}</span><p>${escape(moment.text)}</p></article><div class="dialog-actions"><button class="primary-button" type="button" data-seasonal-close>Keep the moment ♡</button></div>`;
    markMomentSeen(moment);
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    render();
  }

  function openFind(eventId) {
    const event = activeSpecialEvents().find(item => item.id === eventId);
    if (!event) return;
    const options = findOptions(event);
    if (!options.length) return;
    const dialog = ensureDialog();
    dialog.querySelector("#seasonalDialogTitle").textContent = `${event.label} · little find`;
    dialog.querySelector("#seasonalDialogBody").innerHTML = `<p class="seasonal-find-copy-v314az">One small seasonal thing catches your eye. Pick one for the Gift Shelf — no Coins, no relationship obligation.</p><div class="seasonal-find-grid-v314az">${options.map(item => `<button type="button" data-seasonal-claim="${escape(event.id)}:${escape(item.id)}"><span>${item.icon}</span><strong>${escape(item.name)}</strong><small>${escape(item.flavor)}</small></button>`).join("")}</div>`;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  function openArchive() {
    const s = ensureState();
    const dialog = ensureDialog();
    dialog.querySelector("#seasonalDialogTitle").textContent = "Seasonal memories";
    const entries = s.archive.slice().reverse().slice(0, 24);
    dialog.querySelector("#seasonalDialogBody").innerHTML = entries.length
      ? `<div class="seasonal-archive-v314az">${entries.map(entry => `<article><span>${entry.icon || "✦"}</span><div><strong>${escape(entry.title)}</strong><p>${escape(entry.text)}</p><small>${new Date(entry.seenAt).toLocaleDateString([], { year:"numeric", month:"short", day:"numeric" })}</small></div></article>`).join("")}</div>`
      : `<div class="seasonal-empty-v314az"><span>🍃</span><strong>No seasonal memories yet.</strong><p>They appear naturally as the calendar moves. Nothing expires as a punishment.</p></div>`;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  function render() {
    const root = document.getElementById("seasonalLifeRoot");
    if (!root) return;
    const now = new Date();
    const snap = snapshotForDate(now);
    const s = ensureState();
    const ambient = weeklySeasonMoment(now);
    const special = snap.specials[0] ? specialMoment(snap.specials[0],now) : null;
    const birthday = snap.birthdays[0] ? birthdayMoment(snap.birthdays[0],now) : null;
    const feature = birthday || special || ambient;
    const featureSeen = feature ? Boolean(s.seenMoments[feature.id]) : false;
    const activeEvent = snap.specials[0] || null;
    const findAvailable = activeEvent ? findOptions(activeEvent,now).length > 0 : false;
    const holiday = snap.holiday ? `<span class="seasonal-holiday-chip-v314az">🇯🇵 ${escape(snap.holiday.label)}</span>` : "";
    const birthdayChip = snap.birthdays.length ? `<span class="seasonal-birthday-chip-v314az">🎂 ${escape(snap.birthdays[0].label)}</span>` : "";

    root.innerHTML = `<div class="seasonal-life-card-v314az" data-season="${snap.season}">
      <div class="seasonal-life-head-v314az"><div class="seasonal-life-season-v314az"><span>${snap.seasonMeta.icon}</span><div><small>SEASONAL LIFE</small><strong>${snap.seasonMeta.label}</strong><p>${escape(snap.seasonMeta.note)}</p></div></div><button type="button" class="seasonal-archive-button-v314az" data-seasonal-archive>Memories ›</button></div>
      ${(holiday || birthdayChip) ? `<div class="seasonal-chip-row-v314az">${holiday}${birthdayChip}</div>` : ""}
      ${activeEvent ? `<div class="seasonal-special-strip-v314az"><span>${activeEvent.icon}</span><div><strong>${escape(activeEvent.label)}</strong><p>${escape(activeEvent.blurb)}</p></div>${findAvailable ? `<button type="button" data-seasonal-find="${escape(activeEvent.id)}">Find something ›</button>` : `<em>Find tucked away ✓</em>`}</div>` : ""}
      ${feature ? `<button type="button" class="seasonal-moment-button-v314az ${featureSeen ? "is-seen" : ""}" data-seasonal-moment="${escape(feature.id)}"><span>${feature.icon}</span><div><small>${featureSeen ? "SEEN" : feature.type === "ambient" ? "THIS WEEK AT HOME" : "SPECIAL MOMENT"}</small><strong>${escape(feature.title)}</strong><p>${featureSeen ? "Saved in Seasonal Memories." : "A small optional slice-of-life moment is waiting."}</p></div><b>${featureSeen ? "✓" : "›"}</b></button>` : ""}
    </div>`;
    root.__seasonalMoment = feature;
  }

  function installEvents() {
    document.addEventListener("click", event => {
      const momentButton = event.target.closest?.("[data-seasonal-moment]");
      if (momentButton) {
        const root = document.getElementById("seasonalLifeRoot");
        if (root?.__seasonalMoment?.id === momentButton.dataset.seasonalMoment) openMoment(root.__seasonalMoment);
        return;
      }
      const find = event.target.closest?.("[data-seasonal-find]");
      if (find) { openFind(find.dataset.seasonalFind); return; }
      const claim = event.target.closest?.("[data-seasonal-claim]");
      if (claim) {
        const [eventId,giftId] = String(claim.dataset.seasonalClaim || "").split(":");
        if (claimSeasonalFind(eventId,giftId)) {
          const dialog = document.getElementById("seasonalLifeDialog");
          if (dialog?.open) dialog.close();
        }
        return;
      }
      if (event.target.closest?.("[data-seasonal-archive]")) { openArchive(); return; }
      if (event.target.closest?.("[data-seasonal-close]")) {
        const dialog = document.getElementById("seasonalLifeDialog");
        if (dialog?.open && typeof dialog.close === "function") dialog.close(); else dialog?.removeAttribute("open");
      }
    });
    window.addEventListener("life-rpg:render", render);
    window.addEventListener("life-rpg:state-saved", render);
  }

  function init() {
    ensureState();
    ensureDialog();
    installEvents();
    render();
    window.setTimeout(() => app.renderAll?.(), 0);
  }

  window.LifeRPGSeasons = {
    version:VERSION,
    currentSeason: () => seasonForDate(new Date()),
    snapshot: () => snapshotForDate(new Date()),
    snapshotForDate,
    contextSignals,
    activeSpecialEvents: () => activeSpecialEvents(new Date()).map(event => ({...event})),
    activeBirthdays: () => activeBirthdays(new Date()).map(item => ({...item})),
    giftContext,
    japaneseHolidayForDate,
    render,
    _test: { seasonForDate, birthdayStatus, activeSpecialEvents, weeklySeasonMoment, eventYearKey, vernalEquinoxDay, autumnEquinoxDay }
  };

  init();
})();
