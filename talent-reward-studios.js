(() => {
  "use strict";

  if (window.__lifeRpgTalentRewardStudiosV314at) return;
  window.__lifeRpgTalentRewardStudiosV314at = true;

  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  if (!app?.getState || !app?.saveState || !graph?.isContentUnlocked) {
    console.error("Talent Reward Studios could not initialize because the Talent Tree graph is unavailable.");
    return;
  }

  const VERSION = "0.31.4at";
  const SCHEMA = 2;

  const JAPANESE_CARDS = [
    {
      id: "chat-lunch",
      type: "AGENCY CHAT",
      icon: "💬",
      title: "Five minutes means five minutes",
      jp: "切島：今日の取材、思ったより早く終わったな。飯、どうする？\n爆豪：近くで済ませる。待つ気ねぇから五分で来い。\n切島：はいはい、今行くって！",
      question: "What is Bakugo telling Kirishima to do?",
      options: ["Pick up food and bring it back", "Meet him nearby within five minutes", "Wait at the agency until he returns"],
      correct: 1,
      meaning: "Kirishima says the interview ended earlier than expected and asks what they should do about food. Bakugo says they'll eat nearby and tells him to get there in five minutes because he isn't waiting. Kirishima answers that he's coming now.",
      note: "待つ気ねぇ is a rough, contracted way of saying he has no intention of waiting."
    },
    {
      id: "memo-fridge",
      type: "BREAK-ROOM NOTE",
      icon: "📝",
      title: "A very specific warning",
      jp: "冷蔵庫のプリン、最後の一個。\n勝手に食ったらマジで許さねぇ。\n――爆豪\n\n切島：名前書いとけって！",
      question: "Why did Bakugo leave the note?",
      options: ["He wants someone to buy more pudding", "He is saving the last pudding for himself", "He thinks the fridge is broken"],
      correct: 1,
      meaning: "Bakugo warns that the pudding in the fridge is the last one and says he seriously won't forgive anyone who eats it without permission. Kirishima comments that he should just write his name on it.",
      note: "勝手に means doing something on your own / without permission."
    },
    {
      id: "qa-morning",
      type: "QUICK Q&A",
      icon: "🎤",
      title: "Who is functional before coffee?",
      jp: "Q：朝に強いのはどっちですか？\n切島：たぶん爆豪。起きた瞬間から普通に動ける。\n爆豪：お前が朝からうるせぇだけだ。",
      question: "What does Kirishima say about Bakugo in the morning?",
      options: ["Bakugo can function normally right after waking up", "Bakugo needs a long time to wake up", "Bakugo refuses to talk before training"],
      correct: 0,
      meaning: "Asked who handles mornings better, Kirishima says probably Bakugo because he can move normally the moment he wakes up. Bakugo replies that Kirishima is just loud in the morning.",
      note: "朝に強い literally means 'strong in the morning' — good at mornings / not groggy."
    },
    {
      id: "social-training",
      type: "DYNARIOT POST",
      icon: "📱",
      title: "Training room casualty",
      jp: "本日のトレーニング終了！\n約一名、やりすぎてスタッフに『床を壊すな』と怒られました。\n誰とは言いません。\n\n爆豪：消せ。",
      question: "What happened during training?",
      options: ["Someone trained too hard and was told not to damage the floor", "A staff member cancelled training", "Kirishima forgot to reserve the room"],
      correct: 0,
      meaning: "The post says today's training is over, and that one unnamed person overdid it and got told by staff not to break the floor. Bakugo replies: 'Delete it.'",
      note: "誰とは言いません is a playful 'I won't say who.'"
    },
    {
      id: "chat-umbrella",
      type: "AGENCY CHAT",
      icon: "☔",
      title: "Weather planning, DynaRiot style",
      jp: "切島：外、めっちゃ雨降ってるぞ。傘持ってきた？\n爆豪：ある。\n切島：二本？\n爆豪：……一本。走れ。",
      question: "How many umbrellas does Bakugo have?",
      options: ["None", "One", "Two"],
      correct: 1,
      meaning: "Kirishima points out that it's raining hard and asks whether Bakugo brought an umbrella. Bakugo says yes. When Kirishima asks if he has two, Bakugo admits he has one and tells him to run.",
      note: "The pause before 一本 does most of the comedic work here."
    },
    {
      id: "qa-cooking",
      type: "QUICK Q&A",
      icon: "🍳",
      title: "The answer was obvious",
      jp: "Q：料理が得意なのは？\n切島：これは爆豪。普通にうまい。\n爆豪：『普通に』いらねぇだろ。\n切島：褒めてんだって！",
      question: "Why does Bakugo object to Kirishima's answer?",
      options: ["Kirishima said the food was too spicy", "He dislikes the wording 'normally / actually good'", "He does not want people to know he cooks"],
      correct: 1,
      meaning: "Kirishima says Bakugo is the better cook and that he's genuinely good at it. Bakugo objects to Kirishima adding '普通に,' and Kirishima insists it was a compliment.",
      note: "普通にうまい can sound like 'legitimately good,' but Bakugo hears the qualifier."
    },
    {
      id: "memo-equipment",
      type: "AGENCY MEMO",
      icon: "📌",
      title: "Return your equipment",
      jp: "使用後のトレーニング器具は元の場所へ戻してください。\n『あとでやる』は禁止です。\n\n切島：これ、誰向け？\n爆豪：全員だ。特にお前。",
      question: "Who does Bakugo say the memo is especially for?",
      options: ["The interns", "Kirishima", "The cleaning staff"],
      correct: 1,
      meaning: "The memo says training equipment must be returned after use and that 'I'll do it later' is not allowed. Kirishima asks who it's aimed at. Bakugo says everyone — especially him.",
      note: "特に means especially / particularly."
    },
    {
      id: "chat-convenience",
      type: "AGENCY CHAT",
      icon: "🛍️",
      title: "Convenience-store diplomacy",
      jp: "切島：コンビニ寄るけど、なんかいる？\n爆豪：炭酸水。甘くねぇやつ。\n切島：了解。あと俺のアイス勝手に食うなよ。\n爆豪：知らねぇ。",
      question: "What does Bakugo ask Kirishima to buy?",
      options: ["Unsweetened sparkling water", "Black coffee", "Spicy chips"],
      correct: 0,
      meaning: "Kirishima says he's stopping at a convenience store and asks if Bakugo wants anything. Bakugo asks for unsweetened sparkling water. Kirishima agrees and tells him not to eat his ice cream; Bakugo says he knows nothing about that.",
      note: "甘くねぇ is rough casual speech for 甘くない."
    },
    {
      id: "social-photo",
      type: "DYNARIOT POST",
      icon: "📸",
      title: "One usable photo",
      jp: "広報『二人とも、もう少し笑ってください！』\n切島：俺は笑ってるだろ？\n爆豪：もう撮ったなら終わりでいいだろ。\n\n※このあと三十枚撮りました。",
      question: "What happened after this exchange?",
      options: ["The shoot ended immediately", "They took thirty more photos", "Bakugo left the building"],
      correct: 1,
      meaning: "PR asks both of them to smile a little more. Kirishima says he already is. Bakugo says they should be done if the photo has been taken. The note adds that they took thirty more photos afterward.",
      note: "このあと means after this / afterward."
    },
    {
      id: "qa-days-off",
      type: "QUICK Q&A",
      icon: "🛋️",
      title: "A day off is still a day off",
      jp: "Q：休みの日もトレーニングしますか？\n切島：軽くなら。完全に何もしない日もあるぞ。\n爆豪：休むのも調整のうちだ。",
      question: "What is Bakugo's view on rest?",
      options: ["Rest is part of managing your condition", "Rest days are a waste of time", "Only injured people should rest"],
      correct: 0,
      meaning: "Asked whether they train on days off, Kirishima says sometimes lightly, but there are also days when he does nothing at all. Bakugo says resting is also part of conditioning / managing yourself.",
      note: "〜のうちだ means 'is part of' a larger process or category."
    },
    {
      id: "chat-keys",
      type: "AGENCY CHAT",
      icon: "🔑",
      title: "Not lost. Temporarily unlocated.",
      jp: "切島：事務所の予備キー知らねぇ？\n爆豪：昨日お前が持ってた。\n切島：……そうだった。\n爆豪：探す前に思い出せ。",
      question: "Who had the spare key yesterday?",
      options: ["Bakugo", "Kirishima", "A staff member"],
      correct: 1,
      meaning: "Kirishima asks about the agency's spare key. Bakugo reminds him that he had it yesterday. Kirishima remembers, and Bakugo tells him to remember things before searching for them.",
      note: "予備キー is a spare key."
    },
    {
      id: "memo-door",
      type: "BREAK-ROOM NOTE",
      icon: "🚪",
      title: "The door has one job",
      jp: "屋上に出たらドアをちゃんと閉めろ。\n昨日、風で書類が全部飛んだ。\n\n切島：拾うの手伝っただろ！\n爆豪：原因もお前だろうが。",
      question: "What caused the paperwork problem?",
      options: ["Someone left the rooftop door open", "The printer broke", "A window was cracked"],
      correct: 0,
      meaning: "The note says to close the rooftop door properly because yesterday the wind blew all the documents away. Kirishima says he helped pick them up; Bakugo points out that he was also the cause.",
      note: "〜だろうが is an emphatic, rough 'but you were...!'"
    },
    {
      id: "social-fanmail",
      type: "DYNARIOT POST",
      icon: "💌",
      title: "Fan mail day",
      jp: "今週もたくさんの手紙、ありがとうございます！\n全部ちゃんと届いています。\n切島はその場で読み始め、爆豪は『あとで読む』と言いながら全部持って帰りました。",
      question: "What did Bakugo do with the letters?",
      options: ["He left them at the agency", "He took all of them home to read later", "He asked Kirishima to read them aloud"],
      correct: 1,
      meaning: "The post thanks fans for the week's letters and says they all arrived safely. Kirishima started reading his immediately; Bakugo said he'd read them later and took every one of his home.",
      note: "〜ながら links simultaneous or contrasting actions here: saying one thing while doing another."
    },
    {
      id: "qa-competitive",
      type: "QUICK Q&A",
      icon: "🏆",
      title: "Competitive? Them? Never.",
      jp: "Q：二人でゲームするとケンカになりますか？\n切島：ゲームによる！\n爆豪：負けた方がうるせぇ。\n切島：お前もだろ！？",
      question: "What does Kirishima object to at the end?",
      options: ["Bakugo also gets noisy when he loses", "Bakugo chooses unfair games", "Bakugo never finishes a game"],
      correct: 0,
      meaning: "Asked if playing games together leads to fights, Kirishima says it depends on the game. Bakugo says whoever loses gets loud. Kirishima fires back that Bakugo does too.",
      note: "〜による means it depends on..."
    },
    {
      id: "chat-charger",
      type: "AGENCY CHAT",
      icon: "🔌",
      title: "Borrowing, apparently",
      jp: "爆豪：俺の充電器どこだ。\n切島：会議室。借りた。\n爆豪：先に言え。\n切島：今言った！",
      question: "Where is Bakugo's charger?",
      options: ["In the meeting room", "At home", "In the training room"],
      correct: 0,
      meaning: "Bakugo asks where his charger is. Kirishima says it's in the meeting room because he borrowed it. Bakugo tells him to say so first; Kirishima replies that he just did.",
      note: "借りた is the plain past of 借りる, to borrow."
    },
    {
      id: "social-late",
      type: "DYNARIOT POST",
      icon: "🌙",
      title: "Lights still on",
      jp: "遅い時間まで残っているスタッフへ。\n帰る前に必ず声をかけてください。\n一人で無理に片づけなくて大丈夫です。\n\n――DynaRiot",
      question: "What is the message telling late-working staff?",
      options: ["Finish everything alone before leaving", "Tell someone before leaving and don't force yourself to handle everything alone", "Turn off every light immediately"],
      correct: 1,
      meaning: "The message asks staff who remain late to make sure they tell someone before going home, and says they don't need to force themselves to finish everything alone.",
      note: "無理に means forcing something / pushing beyond what is reasonable."
    }
  ];

  const COLORING_PAGES = [
    { id: "bakugo-off-duty", title: "Off-Duty Bakugo", subtitle: "Canon-board portrait · spoiler-free bonus page", src: "assets/coloring/bakugo-off-duty-line.png" },
    { id: "kirishima-off-duty", title: "Off-Duty Kirishima", subtitle: "Canon-board portrait · spoiler-free bonus page", src: "assets/coloring/kirishima-off-duty-line.png" },
    { id: "dynariot-duo", title: "DynaRiot Duo", subtitle: "Non-canon character bonus · no Story state", src: "assets/coloring/dynariot-duo-line.png" }
  ];

  const PALETTE = ["#2d2130", "#5c294b", "#9a486d", "#d8759e", "#f2a7bf", "#efcfbc", "#f4d35e", "#e88945", "#bc3c38", "#7c2f34", "#4a6658", "#79a879", "#6c8dc6", "#8a72bc", "#d6c4ef", "#ffffff"];

  let homeExcluded = new Map();
  let homeWheelRotation = 0;
  let activeJapaneseCardId = null;
  let coloring = null;
  let idbPromise = null;
  let saveTimer = null;

  init();

  function init() {
    ensureState();
    ensureDialog();
    bind();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      japanese: { collected: {}, daily: {} },
      home: {
        selectedDeckId: "dinner",
        decks: [{ id: "dinner", name: "Dinner ideas", noRepeat: true, lastPick: null, options: [] }]
      },
      coloring: { lastPageId: null, finished: {} }
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.talentRewardStudios || typeof root.talentRewardStudios !== "object" || Array.isArray(root.talentRewardStudios)) {
      root.talentRewardStudios = defaults();
    }
    const s = root.talentRewardStudios;
    s.schemaVersion = SCHEMA;
    s.version = VERSION;
    s.japanese ||= { collected: {}, daily: {} };
    s.japanese.collected ||= {};
    s.japanese.daily ||= {};
    s.home ||= { selectedDeckId: "dinner", decks: [] };
    s.home.decks ||= [];
    if (!s.home.decks.length) s.home.decks.push({ id: "dinner", name: "Dinner ideas", noRepeat: true, lastPick: null, options: [] });
    s.home.selectedDeckId ||= s.home.decks[0]?.id || "dinner";
    s.coloring ||= { lastPageId: null, finished: {} };
    s.coloring.finished ||= {};
    return s;
  }

  function state() { return ensureState(); }

  function ensureDialog() {
    if (document.getElementById("talentRewardStudioDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "talentRewardStudioDialog";
    dialog.className = "reward-studio-dialog-v314as";
    dialog.innerHTML = `
      <div class="reward-studio-shell-v314as">
        <button class="reward-studio-close-v314as" type="button" data-reward-studio-close aria-label="Close">×</button>
        <div id="talentRewardStudioBody"></div>
      </div>`;
    document.body.appendChild(dialog);
  }

  function bind() {
    document.addEventListener("click", event => {
      const close = event.target.closest?.("[data-reward-studio-close]");
      if (close) {
        event.preventDefault();
        closeStudio();
        return;
      }

      const jpAnswer = event.target.closest?.("[data-jp-answer]");
      if (jpAnswer) {
        event.preventDefault();
        selectJapaneseAnswer(Number(jpAnswer.dataset.jpAnswer));
        return;
      }

      const jpCheck = event.target.closest?.("[data-jp-check]");
      if (jpCheck) {
        event.preventDefault();
        checkJapaneseAnswer();
        return;
      }

      const jpMeaning = event.target.closest?.("[data-jp-meaning]");
      if (jpMeaning) {
        event.preventDefault();
        document.getElementById("jpMeaningV314as")?.classList.toggle("hidden");
        return;
      }

      const jpComplete = event.target.closest?.("[data-jp-complete]");
      if (jpComplete) {
        event.preventDefault();
        completeJapaneseCard();
        return;
      }

      const jpTab = event.target.closest?.("[data-jp-tab]");
      if (jpTab) {
        event.preventDefault();
        if (jpTab.dataset.jpTab === "archive") renderJapaneseArchive();
        else renderJapaneseDaily();
        return;
      }

      const jpOpenCard = event.target.closest?.("[data-jp-open-card]");
      if (jpOpenCard) {
        event.preventDefault();
        renderJapaneseCard(jpOpenCard.dataset.jpOpenCard, true);
        return;
      }

      const homeNew = event.target.closest?.("[data-home-new]");
      if (homeNew) {
        event.preventDefault();
        createHomeDeck();
        return;
      }

      const homeDelete = event.target.closest?.("[data-home-delete]");
      if (homeDelete) {
        event.preventDefault();
        deleteHomeDeck();
        return;
      }

      const homeDeck = event.target.closest?.("[data-home-deck]");
      if (homeDeck) {
        event.preventDefault();
        state().home.selectedDeckId = homeDeck.dataset.homeDeck;
        save("home-oracle-select");
        renderHomeOracle();
        return;
      }

      const homeAddOption = event.target.closest?.("[data-home-add-option]");
      if (homeAddOption) {
        event.preventDefault();
        appendHomeOptionRow();
        return;
      }

      const homeRemoveOption = event.target.closest?.("[data-home-remove-option]");
      if (homeRemoveOption) {
        event.preventDefault();
        homeRemoveOption.closest(".home-oracle-option-row-v314as")?.remove();
        return;
      }

      const homeSave = event.target.closest?.("[data-home-save]");
      if (homeSave) {
        event.preventDefault();
        saveHomeDeckFromForm();
        return;
      }

      const homeExclude = event.target.closest?.("[data-home-exclude]");
      if (homeExclude) {
        event.preventDefault();
        toggleHomeExclude(homeExclude.dataset.homeExclude);
        return;
      }

      const homeSpin = event.target.closest?.("[data-home-spin]");
      if (homeSpin) {
        event.preventDefault();
        spinHomeWheel(true);
        return;
      }

      const homePick = event.target.closest?.("[data-home-pick]");
      if (homePick) {
        event.preventDefault();
        spinHomeWheel(false);
        return;
      }

      const coloringPage = event.target.closest?.("[data-coloring-page]");
      if (coloringPage) {
        event.preventDefault();
        openColoringPage(coloringPage.dataset.coloringPage);
        return;
      }

      const coloringBack = event.target.closest?.("[data-coloring-back]");
      if (coloringBack) {
        event.preventDefault();
        finishColoringSession();
        renderColoringGallery();
        return;
      }

      const colorButton = event.target.closest?.("[data-coloring-color]");
      if (colorButton) {
        event.preventDefault();
        setColoringColor(colorButton.dataset.coloringColor);
        return;
      }

      const erase = event.target.closest?.("[data-coloring-eraser]");
      if (erase) {
        event.preventDefault();
        if (coloring) {
          coloring.eraser = !coloring.eraser;
          updateColoringToolButtons();
        }
        return;
      }

      const undo = event.target.closest?.("[data-coloring-undo]");
      if (undo) {
        event.preventDefault();
        coloringUndo();
        return;
      }

      const redo = event.target.closest?.("[data-coloring-redo]");
      if (redo) {
        event.preventDefault();
        coloringRedo();
        return;
      }

      const clear = event.target.closest?.("[data-coloring-clear]");
      if (clear) {
        event.preventDefault();
        coloringClear();
        return;
      }

      const finish = event.target.closest?.("[data-coloring-finished]");
      if (finish) {
        event.preventDefault();
        toggleColoringFinished();
        return;
      }

      const exportButton = event.target.closest?.("[data-coloring-export]");
      if (exportButton) {
        event.preventDefault();
        exportColoringPng();
      }
    });

    document.addEventListener("input", event => {
      if (event.target?.id === "coloringBrushSizeV314as" && coloring) {
        coloring.size = Math.max(2, Math.min(60, Number(event.target.value || 14)));
        const out = document.getElementById("coloringBrushSizeLabelV314as");
        if (out) out.textContent = `${coloring.size}px`;
      }
    });
  }

  function open(kind) {
    if (kind === "dynariot-japanese") {
      if (!isUnlocked("Japanese", "dynariot-japanese")) return focusLocked("Japanese");
      renderJapaneseDaily();
    } else if (kind === "home-oracle") {
      if (!isUnlocked("Home", "home-oracle")) return focusLocked("Home");
      renderHomeOracle();
    } else if (kind === "coloring-studio") {
      if (!isUnlocked("Hobbies", "coloring-studio")) return focusLocked("Hobbies");
      renderColoringGallery();
    } else return false;
    showDialog();
    return true;
  }

  function focusLocked(realm) {
    graph.focusRealm?.(realm);
    return false;
  }

  function contentRank(realm, id) {
    const rank = Number(graph.getContentRank?.(realm, id) || 0);
    return Math.max(0, Math.floor(rank));
  }

  function isUnlocked(realm, id) {
    return contentRank(realm, id) > 0 || Boolean(graph.isContentUnlocked?.(realm, id));
  }

  function japaneseCardPool() {
    const rank = contentRank("Japanese", "dynariot-japanese");
    return JAPANESE_CARDS.slice(0, rank >= 2 ? JAPANESE_CARDS.length : 8);
  }

  function homeWheelLimit() {
    return contentRank("Home", "home-oracle") >= 2 ? Infinity : 1;
  }

  function coloringPagePool() {
    const rank = contentRank("Hobbies", "coloring-studio");
    return COLORING_PAGES.slice(0, rank >= 2 ? COLORING_PAGES.length : 1);
  }

  function showDialog() {
    const dialog = document.getElementById("talentRewardStudioDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
  }

  function closeStudio() {
    finishColoringSession();
    document.getElementById("talentRewardStudioDialog")?.close?.();
  }

  function body() { return document.getElementById("talentRewardStudioBody"); }

  function dateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function hash(text) {
    let h = 2166136261;
    for (const ch of String(text || "")) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function save(source) {
    app.saveState({ source: `talent-reward-studios-${source}` });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Japanese · DynaRiot Extras

  function todayJapaneseCard() {
    const s = state().japanese;
    const today = dateKey();
    const available = japaneseCardPool();
    if (s.daily.dateKey === today && s.daily.cardId && available.some(card => card.id === s.daily.cardId)) {
      return available.find(card => card.id === s.daily.cardId);
    }
    const unseen = available.filter(card => !s.collected[card.id]);
    const pool = unseen.length ? unseen : available;
    const card = pool[hash(`dynariot:${today}:${Object.keys(s.collected).length}`) % pool.length];
    s.daily = { dateKey: today, cardId: card.id, completedAt: null, rewardEventId: null, selected: null, checked: false };
    save("japanese-daily-roll");
    return card;
  }

  function renderJapaneseDaily() {
    const card = todayJapaneseCard();
    renderJapaneseCard(card.id, false);
  }

  function renderJapaneseCard(id, archiveMode = false) {
    const card = JAPANESE_CARDS.find(item => item.id === id);
    if (!card) return;
    activeJapaneseCardId = id;
    const daily = state().japanese.daily;
    const isTodayCard = daily.dateKey === dateKey() && daily.cardId === id;
    const selected = isTodayCard ? daily.selected : null;
    const checked = isTodayCard ? Boolean(daily.checked) : false;
    const completed = isTodayCard && Boolean(daily.completedAt);
    const collected = Boolean(state().japanese.collected[id]);
    const content = body();
    if (!content) return;

    content.innerHTML = `
      <header class="reward-studio-head-v314as japanese">
        <div><p class="eyebrow">JAPANESE TALENT CONTENT · RANK ${roman(contentRank("Japanese", "dynariot-japanese"))}/II · NON-CANON BONUS</p><h2>DynaRiot Japanese Extras</h2><p>Character content first; Japanese is the medium. No vocabulary rating, no SRS, no Story flags. ${contentRank("Japanese", "dynariot-japanese") < 2 ? "Rank II expands the daily pool from 8 to 16 cards." : "All 16 current cards are in the daily pool."}</p></div>
        <div class="reward-studio-tabs-v314as"><button type="button" class="${archiveMode ? "" : "is-active"}" data-jp-tab="daily">Today's extra</button><button type="button" class="${archiveMode ? "is-active" : ""}" data-jp-tab="archive">Archive ${Object.keys(state().japanese.collected).length}/${japaneseCardPool().length} available</button></div>
      </header>
      <article class="jp-extra-card-v314as">
        <div class="jp-extra-meta-v314as"><span>${card.icon}</span><div><small>${esc(card.type)}</small><strong>${esc(card.title)}</strong></div>${collected ? "<b>COLLECTED</b>" : ""}</div>
        <div class="jp-extra-text-v314as">${esc(card.jp).replace(/\n/g,"<br>")}</div>
        <section class="jp-extra-question-v314as">
          <small>QUICK COMPREHENSION</small><h3>${esc(card.question)}</h3>
          <div class="jp-extra-options-v314as">${card.options.map((option, index) => `<button type="button" class="${selected === index ? "is-selected" : ""} ${checked && index === card.correct ? "is-correct" : ""} ${checked && selected === index && index !== card.correct ? "is-wrong" : ""}" data-jp-answer="${index}" ${archiveMode ? "disabled" : ""}>${String.fromCharCode(65+index)}. ${esc(option)}</button>`).join("")}</div>
          <div id="jpFeedbackV314as" class="jp-extra-feedback-v314as">${checked ? (selected === card.correct ? "✓ Yep — that reading fits." : "Not quite. The correct reading is highlighted; use the meaning reveal if you want the full context.") : archiveMode ? "Archived card · quiz disabled on replay." : "Choose the reading that best matches the Japanese."}</div>
        </section>
        <section id="jpMeaningV314as" class="jp-extra-meaning-v314as ${archiveMode ? "" : "hidden"}"><small>MEANING REVEAL</small><p>${esc(card.meaning)}</p><em>${esc(card.note)}</em></section>
        <div class="reward-studio-actions-v314as">
          ${archiveMode ? `<button class="secondary-button" type="button" data-jp-tab="archive">← Back to archive</button>` : `<button class="secondary-button" type="button" data-jp-check ${selected === null ? "disabled" : ""}>Check answer</button><button class="secondary-button" type="button" data-jp-meaning>Reveal meaning</button><button class="primary-button" type="button" data-jp-complete ${!checked || completed ? "disabled" : ""}>${completed ? "Today's extra complete ✓" : "Collect today's extra"}</button>`}
        </div>
      </article>`;
    showDialog();
  }

  function selectJapaneseAnswer(index) {
    const daily = state().japanese.daily;
    if (!activeJapaneseCardId || daily.cardId !== activeJapaneseCardId || daily.completedAt) return;
    daily.selected = index;
    daily.checked = false;
    renderJapaneseCard(activeJapaneseCardId, false);
  }

  function checkJapaneseAnswer() {
    const daily = state().japanese.daily;
    if (!activeJapaneseCardId || daily.cardId !== activeJapaneseCardId || daily.selected === null || daily.selected === undefined) return;
    daily.checked = true;
    save("japanese-check");
    renderJapaneseCard(activeJapaneseCardId, false);
  }

  function completeJapaneseCard() {
    const s = state().japanese;
    const daily = s.daily;
    const card = JAPANESE_CARDS.find(item => item.id === daily.cardId);
    if (!card || daily.dateKey !== dateKey() || !daily.checked || daily.completedAt) return false;

    s.collected[card.id] = s.collected[card.id] || new Date().toISOString();
    daily.completedAt = Date.now();
    const reward = app.awardActivity?.({
      source: "talent-reward-studios",
      sourceId: `dynariot-japanese:${dateKey()}`,
      label: `DynaRiot Japanese Extra · ${card.title}`,
      realm: "Japanese",
      capability: "japanese",
      xp: 8,
      realmXP: 10,
      statXP: 8,
      coins: 8,
      storyEnergyBase: .20,
      progressionRelevant: true,
      metadata: { talentRewardStudio: true, contentId: "dynariot-japanese", cardId: card.id }
    });
    daily.rewardEventId = reward?.eventId || null;
    save("japanese-complete");
    app.showToast?.("🌸 DynaRiot Extra collected · Japanese practice saved.");
    renderJapaneseCard(card.id, false);
    return true;
  }

  function renderJapaneseArchive() {
    activeJapaneseCardId = null;
    const collected = JAPANESE_CARDS.filter(card => state().japanese.collected[card.id]);
    const availableCount = japaneseCardPool().length;
    const content = body();
    if (!content) return;
    content.innerHTML = `
      <header class="reward-studio-head-v314as japanese">
        <div><p class="eyebrow">JAPANESE TALENT CONTENT · COLLECTION</p><h2>DynaRiot Extras Archive</h2><p>Re-read anything you've collected. Archive replay never gives another reward.</p></div>
        <div class="reward-studio-tabs-v314as"><button type="button" data-jp-tab="daily">Today's extra</button><button type="button" class="is-active" data-jp-tab="archive">Archive ${collected.length}/${availableCount} available</button></div>
      </header>
      <div class="jp-extra-archive-v314as">${collected.length ? collected.map(card => `<button type="button" data-jp-open-card="${escAttr(card.id)}"><span>${card.icon}</span><div><small>${esc(card.type)}</small><strong>${esc(card.title)}</strong></div><b>›</b></button>`).join("") : `<div class="reward-studio-empty-v314as"><span>🌸</span><h3>Your archive is waiting.</h3><p>Complete today's first DynaRiot Extra and it will stay here.</p></div>`}</div>`;
    showDialog();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Home · Oracle

  function selectedHomeDeck() {
    const s = state().home;
    return s.decks.find(deck => deck.id === s.selectedDeckId) || s.decks[0] || null;
  }

  function renderHomeOracle() {
    finishColoringSession();
    const s = state().home;
    const deck = selectedHomeDeck();
    const content = body();
    if (!content || !deck) return;
    const excluded = getExcluded(deck.id);

    content.innerHTML = `
      <header class="reward-studio-head-v314as home">
        <div><p class="eyebrow">HOME TALENT CONTENT · RANK ${roman(contentRank("Home", "home-oracle"))}/II</p><h2>Home Oracle</h2><p>Build your own decision wheels. Spin when choosing is the annoying part; nothing here counts as a Quest. ${contentRank("Home", "home-oracle") < 2 ? "Rank I keeps one wheel; Rank II removes the saved-wheel limit." : "Rank II · unlimited saved wheels unlocked."}</p></div>
        <div class="home-oracle-decks-v314as">${s.decks.map(item => `<button type="button" class="${item.id === deck.id ? "is-active" : ""}" data-home-deck="${escAttr(item.id)}">${esc(item.name || "Untitled")}</button>`).join("")}<button type="button" data-home-new ${Number.isFinite(homeWheelLimit()) && s.decks.length >= homeWheelLimit() ? 'disabled title="Home Oracle II unlocks more wheels"' : ""}>${Number.isFinite(homeWheelLimit()) && s.decks.length >= homeWheelLimit() ? "🔒 Rank II" : "＋ New"}</button></div>
      </header>
      <div class="home-oracle-layout-v314as">
        <section class="home-oracle-wheel-panel-v314as">
          <div class="home-oracle-wheel-wrap-v314as"><div class="home-oracle-pointer-v314as">▼</div><canvas id="homeOracleWheelV314as" width="520" height="520"></canvas></div>
          <div id="homeOracleResultV314as" class="home-oracle-result-v314as"><small>ORACLE SAYS</small><strong>${deck.lastPick ? esc(deck.options.find(option => option.id === deck.lastPick)?.text || "Spin when you're ready.") : "Spin when you're ready."}</strong></div>
          <div class="reward-studio-actions-v314as is-centered"><button class="primary-button" type="button" data-home-spin ${activeHomeOptions(deck, excluded).length ? "" : "disabled"}>Spin wheel</button><button class="secondary-button" type="button" data-home-pick ${activeHomeOptions(deck, excluded).length ? "" : "disabled"}>Pick for me</button></div>
        </section>
        <section class="home-oracle-editor-v314as">
          <div class="home-oracle-editor-head-v314as"><label><span>Wheel name</span><input id="homeOracleNameV314as" maxlength="60" value="${escAttr(deck.name || "")}"></label><label class="home-oracle-check-v314as"><input id="homeOracleNoRepeatV314as" type="checkbox" ${deck.noRepeat !== false ? "checked" : ""}><span>Avoid the last result when possible</span></label></div>
          <div class="home-oracle-option-head-v314as"><strong>Choices</strong><small>Weight 1–5 · “skip” only hides it for this session.</small></div>
          <div id="homeOracleOptionsV314as" class="home-oracle-options-v314as">${deck.options.map(option => homeOptionRow(option, excluded.has(option.id))).join("")}</div>
          <div class="reward-studio-actions-v314as"><button class="secondary-button" type="button" data-home-add-option>＋ Add choice</button><button class="primary-button" type="button" data-home-save>Save wheel</button>${s.decks.length > 1 ? `<button class="text-button danger" type="button" data-home-delete>Delete wheel</button>` : ""}</div>
          ${deck.options.length ? "" : `<div class="home-oracle-tip-v314as">Start with things you genuinely choose between — dinner ideas, weekend plans, tiny home decisions, whatever removes friction instead of creating another task list.</div>`}
        </section>
      </div>`;
    requestAnimationFrame(() => drawHomeWheel(deck));
    showDialog();
  }

  function homeOptionRow(option, excluded) {
    return `<div class="home-oracle-option-row-v314as" data-home-option-row data-option-id="${escAttr(option.id)}"><input class="home-oracle-option-text-v314as" maxlength="80" value="${escAttr(option.text || "")}" placeholder="A real option…"><label><span>×</span><input class="home-oracle-option-weight-v314as" type="number" min="1" max="5" step="1" value="${Math.max(1,Math.min(5,Number(option.weight || 1)))}"></label><button type="button" class="${excluded ? "is-excluded" : ""}" data-home-exclude="${escAttr(option.id)}">${excluded ? "Skipped" : "Skip"}</button><button type="button" aria-label="Remove choice" data-home-remove-option>×</button></div>`;
  }

  function createHomeDeck() {
    const limit = homeWheelLimit();
    if (Number.isFinite(limit) && state().home.decks.length >= limit) {
      app.showToast?.("🔮 Home Oracle II unlocks additional saved wheels.");
      return false;
    }
    saveHomeDeckFromForm(false);
    const deck = { id: `wheel-${Date.now().toString(36)}`, name: "New wheel", noRepeat: true, lastPick: null, options: [] };
    state().home.decks.push(deck);
    state().home.selectedDeckId = deck.id;
    save("home-oracle-new");
    renderHomeOracle();
  }

  function deleteHomeDeck() {
    const s = state().home;
    const deck = selectedHomeDeck();
    if (!deck || s.decks.length <= 1) return;
    if (!window.confirm(`Delete “${deck.name || "this wheel"}”?`)) return;
    s.decks = s.decks.filter(item => item.id !== deck.id);
    homeExcluded.delete(deck.id);
    s.selectedDeckId = s.decks[0].id;
    save("home-oracle-delete");
    renderHomeOracle();
  }

  function appendHomeOptionRow() {
    const root = document.getElementById("homeOracleOptionsV314as");
    if (!root) return;
    const holder = document.createElement("div");
    holder.innerHTML = homeOptionRow({ id: `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`, text: "", weight: 1 }, false);
    const row = holder.firstElementChild;
    root.appendChild(row);
    row.querySelector("input")?.focus();
  }

  function saveHomeDeckFromForm(showToast = true) {
    const deck = selectedHomeDeck();
    const name = document.getElementById("homeOracleNameV314as");
    const optionsRoot = document.getElementById("homeOracleOptionsV314as");
    if (!deck || !name || !optionsRoot) return false;
    deck.name = String(name.value || "Untitled wheel").trim().slice(0,60) || "Untitled wheel";
    deck.noRepeat = Boolean(document.getElementById("homeOracleNoRepeatV314as")?.checked);
    deck.options = [...optionsRoot.querySelectorAll("[data-home-option-row]")].map(row => ({
      id: row.dataset.optionId || `opt-${Math.random().toString(36).slice(2)}`,
      text: String(row.querySelector(".home-oracle-option-text-v314as")?.value || "").trim().slice(0,80),
      weight: Math.max(1, Math.min(5, Math.round(Number(row.querySelector(".home-oracle-option-weight-v314as")?.value || 1))))
    })).filter(option => option.text);
    if (deck.lastPick && !deck.options.some(option => option.id === deck.lastPick)) deck.lastPick = null;
    save("home-oracle-save");
    if (showToast) app.showToast?.("🏠 Home Oracle wheel saved.");
    if (showToast) renderHomeOracle();
    return true;
  }

  function getExcluded(deckId) {
    if (!homeExcluded.has(deckId)) homeExcluded.set(deckId, new Set());
    return homeExcluded.get(deckId);
  }

  function toggleHomeExclude(optionId) {
    saveHomeDeckFromForm(false);
    const deck = selectedHomeDeck();
    if (!deck) return;
    const set = getExcluded(deck.id);
    if (set.has(optionId)) set.delete(optionId); else set.add(optionId);
    renderHomeOracle();
  }

  function activeHomeOptions(deck, excluded = getExcluded(deck.id)) {
    return (deck.options || []).filter(option => option.text && !excluded.has(option.id));
  }

  function weightedPick(options, deck) {
    let pool = options;
    if (deck.noRepeat !== false && deck.lastPick && options.length > 1) {
      const without = options.filter(option => option.id !== deck.lastPick);
      if (without.length) pool = without;
    }
    const total = pool.reduce((sum, item) => sum + Math.max(1, Number(item.weight || 1)), 0);
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= Math.max(1, Number(item.weight || 1));
      if (roll <= 0) return item;
    }
    return pool.at(-1) || null;
  }

  function spinHomeWheel(animate) {
    saveHomeDeckFromForm(false);
    const deck = selectedHomeDeck();
    if (!deck) return;
    const options = activeHomeOptions(deck);
    const picked = weightedPick(options, deck);
    if (!picked) {
      app.showToast?.("Add at least one active choice first.");
      return;
    }
    deck.lastPick = picked.id;
    save("home-oracle-pick");
    const result = document.getElementById("homeOracleResultV314as")?.querySelector("strong");
    const canvas = document.getElementById("homeOracleWheelV314as");

    if (!animate || !canvas) {
      if (result) result.textContent = picked.text;
      app.showToast?.(`✨ ${picked.text}`);
      return;
    }

    const segments = wheelSegments(options);
    const segment = segments.find(item => item.option.id === picked.id);
    const centerDeg = segment ? ((segment.start + segment.end) / 2) * 360 : 0;
    const currentMod = ((homeWheelRotation % 360) + 360) % 360;
    const delta = (360 - ((centerDeg + currentMod) % 360)) % 360;
    homeWheelRotation += 360 * 5 + delta;
    canvas.style.transition = "transform 2.8s cubic-bezier(.12,.76,.18,1)";
    canvas.style.transform = `rotate(${homeWheelRotation}deg)`;
    if (result) result.textContent = "…";
    window.setTimeout(() => {
      if (result) result.textContent = picked.text;
      app.showToast?.(`✨ ${picked.text}`);
    }, 2820);
  }

  function wheelSegments(options) {
    const total = options.reduce((sum, option) => sum + Math.max(1, Number(option.weight || 1)), 0) || 1;
    let cursor = 0;
    return options.map(option => {
      const portion = Math.max(1, Number(option.weight || 1)) / total;
      const segment = { option, start: cursor, end: cursor + portion };
      cursor += portion;
      return segment;
    });
  }

  function drawHomeWheel(deck) {
    const canvas = document.getElementById("homeOracleWheelV314as");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const options = activeHomeOptions(deck);
    const cx = canvas.width/2, cy = canvas.height/2, r = canvas.width*.46;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (!options.length) {
      ctx.fillStyle = "#fffaf7";
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "rgba(92,41,75,.18)"; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = "#7b6972"; ctx.font = "700 22px system-ui"; ctx.textAlign = "center"; ctx.fillText("Add choices",cx,cy);
      return;
    }
    const colors = ["#f7c8d8","#ead4ef","#f6dfc7","#cfe6dc","#d5def2","#efcad6","#e7d8c8","#d8c9e7"];
    const segments = wheelSegments(options);
    segments.forEach((segment,index) => {
      const start = segment.start*Math.PI*2-Math.PI/2;
      const end = segment.end*Math.PI*2-Math.PI/2;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
      ctx.fillStyle = colors[index%colors.length]; ctx.fill();
      ctx.strokeStyle = "rgba(92,41,75,.26)"; ctx.lineWidth = 3; ctx.stroke();
      const mid=(start+end)/2;
      ctx.save(); ctx.translate(cx+Math.cos(mid)*r*.62,cy+Math.sin(mid)*r*.62); ctx.rotate(mid+Math.PI/2);
      ctx.fillStyle="#4e3145"; ctx.textAlign="center"; ctx.font="700 16px system-ui";
      const text = segment.option.text.length > 22 ? `${segment.option.text.slice(0,20)}…` : segment.option.text;
      ctx.fillText(text,0,0); ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx,cy,42,0,Math.PI*2); ctx.fillStyle="#fffaf7"; ctx.fill(); ctx.strokeStyle="rgba(92,41,75,.28)"; ctx.lineWidth=4; ctx.stroke();
    canvas.style.transform = `rotate(${homeWheelRotation}deg)`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hobbies · Coloring Studio

  function renderColoringGallery() {
    finishColoringSession();
    const content = body();
    if (!content) return;
    const meta = state().coloring;
    const available = new Set(coloringPagePool().map(page => page.id));
    const rank = contentRank("Hobbies", "coloring-studio");
    content.innerHTML = `
      <header class="reward-studio-head-v314as hobbies"><div><p class="eyebrow">HOBBIES TALENT CONTENT · RANK ${roman(rank)}/II</p><h2>Coloring Studio</h2><p>Pencil, touch or mouse. ${rank < 2 ? "Rank I starts with one page; Rank II adds Kirishima + the DynaRiot Duo." : "Full current three-page starter pack unlocked."} The art is spoiler-free bonus content, not future Story CGs.</p></div></header>
      <div class="coloring-gallery-v314as">${COLORING_PAGES.map(page => { const unlocked = available.has(page.id); return `<button type="button" data-coloring-page="${escAttr(page.id)}" ${unlocked ? "" : "disabled"}><div class="coloring-thumb-v314as"><img src="${escAttr(page.src)}" alt="${escAttr(page.title)} coloring page"></div><div><small>${unlocked ? meta.finished[page.id] ? "FINISHED ✓" : meta.lastPageId === page.id ? "LAST OPENED" : "COLORING PAGE" : "🔒 COLORING STUDIO II"}</small><strong>${esc(page.title)}</strong><span>${unlocked ? esc(page.subtitle) : "Unlock Rank II to color this page."}</span></div><b>${unlocked ? "Open ›" : "Locked"}</b></button>`; }).join("")}</div>
      <div class="coloring-storage-note-v314as"><span>✦</span><p><strong>Canvas progress stays on this device.</strong> The large stroke data is stored in IndexedDB instead of the main Life RPG save so Coloring Studio cannot cause another localStorage quota problem. Finished status remains in the normal save; you can export any unlocked page as PNG.</p></div>`;
    showDialog();
  }

  async function openColoringPage(pageId) {
    const page = COLORING_PAGES.find(item => item.id === pageId);
    if (!page) return;
    if (!coloringPagePool().some(item => item.id === pageId)) {
      app.showToast?.("🖍️ Coloring Studio II unlocks this page.");
      return false;
    }
    finishColoringSession();
    state().coloring.lastPageId = pageId;
    save("coloring-open");
    const content = body();
    if (!content) return;

    content.innerHTML = `
      <header class="reward-studio-head-v314as hobbies compact"><div><p class="eyebrow">COLORING STUDIO · NON-CANON BONUS ART</p><h2>${esc(page.title)}</h2><p>${esc(page.subtitle)}</p></div><button class="secondary-button" type="button" data-coloring-back>← Page gallery</button></header>
      <div class="coloring-studio-layout-v314as">
        <aside class="coloring-tools-v314as">
          <div class="coloring-palette-v314as">${PALETTE.map((color,index) => `<button type="button" title="Color ${index+1}" data-coloring-color="${color}" style="--swatch:${color}"></button>`).join("")}</div>
          <label class="coloring-size-v314as"><span>Brush <b id="coloringBrushSizeLabelV314as">14px</b></span><input id="coloringBrushSizeV314as" type="range" min="2" max="60" value="14"></label>
          <div class="coloring-tool-buttons-v314as"><button class="secondary-button" type="button" data-coloring-eraser>⌫ Eraser</button><button class="secondary-button" type="button" data-coloring-undo>↶ Undo</button><button class="secondary-button" type="button" data-coloring-redo>↷ Redo</button></div>
          <div class="coloring-tool-buttons-v314as"><button class="secondary-button" type="button" data-coloring-export>Export PNG</button><button class="secondary-button" type="button" data-coloring-finished>${state().coloring.finished[pageId] ? "Finished ✓" : "Mark finished"}</button><button class="text-button danger" type="button" data-coloring-clear>Clear page</button></div>
          <p id="coloringSaveStatusV314as" class="coloring-save-status-v314as">Loading saved strokes…</p>
        </aside>
        <section class="coloring-canvas-frame-v314as"><div class="coloring-canvas-stage-v314as"><canvas id="coloringCanvasV314as" width="1024" height="1365"></canvas><img id="coloringLineArtV314as" src="${escAttr(page.src)}" alt="" draggable="false"></div><small>Apple Pencil pressure is used when the browser reports it. One finger / mouse also works.</small></section>
      </div>`;
    showDialog();
    await setupColoringSession(page);
  }

  async function setupColoringSession(page) {
    const canvas = document.getElementById("coloringCanvasV314as");
    if (!canvas) return;
    const saved = await loadColoringRecord(page.id).catch(() => null);
    coloring = {
      page,
      canvas,
      ctx: canvas.getContext("2d"),
      strokes: Array.isArray(saved?.strokes) ? saved.strokes : [],
      redo: [],
      current: null,
      pointerId: null,
      color: "#d8759e",
      size: 14,
      eraser: false,
      dirty: false
    };
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", coloringPointerDown);
    canvas.addEventListener("pointermove", coloringPointerMove);
    canvas.addEventListener("pointerup", coloringPointerUp);
    canvas.addEventListener("pointercancel", coloringPointerUp);
    redrawColoring();
    updateColoringToolButtons();
    setColoringStatus(saved ? "Saved progress loaded." : "New page · progress autosaves after every stroke.");
  }

  function finishColoringSession() {
    if (!coloring) return;
    if (coloring.dirty) persistColoringNow();
    const canvas = coloring.canvas;
    try {
      canvas?.removeEventListener("pointerdown", coloringPointerDown);
      canvas?.removeEventListener("pointermove", coloringPointerMove);
      canvas?.removeEventListener("pointerup", coloringPointerUp);
      canvas?.removeEventListener("pointercancel", coloringPointerUp);
    } catch {}
    coloring = null;
  }

  function pointerPoint(event) {
    const rect = coloring.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * coloring.canvas.width / rect.width;
    const y = (event.clientY - rect.top) * coloring.canvas.height / rect.height;
    const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure : .5;
    return [Math.round(x*10)/10, Math.round(y*10)/10, Math.round(pressure*100)/100];
  }

  function coloringPointerDown(event) {
    if (!coloring || coloring.pointerId !== null) return;
    event.preventDefault();
    coloring.pointerId = event.pointerId;
    coloring.canvas.setPointerCapture?.(event.pointerId);
    const p = pointerPoint(event);
    coloring.current = { color: coloring.color, size: coloring.size, eraser: coloring.eraser, points: [p] };
    drawStroke(coloring.current, true);
  }

  function coloringPointerMove(event) {
    if (!coloring || event.pointerId !== coloring.pointerId || !coloring.current) return;
    event.preventDefault();
    const p = pointerPoint(event);
    const prev = coloring.current.points.at(-1);
    const dx=p[0]-prev[0], dy=p[1]-prev[1];
    if ((dx*dx+dy*dy) < 3.2) return;
    coloring.current.points.push(p);
    drawStrokeSegment(coloring.current, prev, p);
  }

  function coloringPointerUp(event) {
    if (!coloring || event.pointerId !== coloring.pointerId || !coloring.current) return;
    event.preventDefault();
    try { coloring.canvas.releasePointerCapture?.(event.pointerId); } catch {}
    if (coloring.current.points.length === 1) {
      const p = coloring.current.points[0];
      coloring.current.points.push([p[0]+.1,p[1]+.1,p[2]]);
    }
    coloring.strokes.push(coloring.current);
    coloring.redo = [];
    coloring.current = null;
    coloring.pointerId = null;
    coloring.dirty = true;
    scheduleColoringSave();
    updateColoringToolButtons();
  }

  function drawStroke(stroke) {
    if (!coloring || !stroke?.points?.length) return;
    const points = stroke.points;
    if (points.length === 1) {
      drawStrokeSegment(stroke, points[0], [points[0][0]+.1,points[0][1]+.1,points[0][2]]);
      return;
    }
    for (let i=1;i<points.length;i+=1) drawStrokeSegment(stroke,points[i-1],points[i]);
  }

  function drawStrokeSegment(stroke, a, b) {
    const ctx = coloring.ctx;
    ctx.save();
    ctx.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color || "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pressure = ((Number(a[2] || .5)+Number(b[2] || .5))/2);
    ctx.lineWidth = Number(stroke.size || 14) * (.65 + pressure*.7);
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
    ctx.restore();
  }

  function redrawColoring() {
    if (!coloring) return;
    coloring.ctx.clearRect(0,0,coloring.canvas.width,coloring.canvas.height);
    coloring.strokes.forEach(drawStroke);
  }

  function setColoringColor(color) {
    if (!coloring) return;
    coloring.color = color;
    coloring.eraser = false;
    updateColoringToolButtons();
  }

  function updateColoringToolButtons() {
    if (!coloring) return;
    document.querySelectorAll("[data-coloring-color]").forEach(button => button.classList.toggle("is-selected", !coloring.eraser && button.dataset.coloringColor.toLowerCase() === coloring.color.toLowerCase()));
    document.querySelector("[data-coloring-eraser]")?.classList.toggle("is-active", coloring.eraser);
    const undo=document.querySelector("[data-coloring-undo]"); if (undo) undo.disabled=!coloring.strokes.length;
    const redo=document.querySelector("[data-coloring-redo]"); if (redo) redo.disabled=!coloring.redo.length;
  }

  function coloringUndo() {
    if (!coloring?.strokes.length) return;
    coloring.redo.push(coloring.strokes.pop());
    coloring.dirty = true; redrawColoring(); scheduleColoringSave(); updateColoringToolButtons();
  }

  function coloringRedo() {
    if (!coloring?.redo.length) return;
    coloring.strokes.push(coloring.redo.pop());
    coloring.dirty = true; redrawColoring(); scheduleColoringSave(); updateColoringToolButtons();
  }

  function coloringClear() {
    if (!coloring || !coloring.strokes.length) return;
    if (!window.confirm("Clear every color stroke from this page?")) return;
    coloring.redo.push(...coloring.strokes.splice(0));
    coloring.dirty = true; redrawColoring(); scheduleColoringSave(); updateColoringToolButtons();
  }

  function toggleColoringFinished() {
    if (!coloring) return;
    const id=coloring.page.id;
    if (state().coloring.finished[id]) delete state().coloring.finished[id];
    else state().coloring.finished[id]=new Date().toISOString();
    save("coloring-finished");
    const button=document.querySelector("[data-coloring-finished]"); if (button) button.textContent=state().coloring.finished[id]?"Finished ✓":"Mark finished";
  }

  function scheduleColoringSave() {
    window.clearTimeout(saveTimer);
    setColoringStatus("Saving…");
    saveTimer = window.setTimeout(persistColoringNow, 450);
  }

  async function persistColoringNow() {
    if (!coloring) return;
    window.clearTimeout(saveTimer);
    const record={ pageId: coloring.page.id, strokes: coloring.strokes, updatedAt: Date.now() };
    try {
      await saveColoringRecord(record);
      if (coloring) coloring.dirty=false;
      setColoringStatus(`Saved on this device · ${coloring?.strokes.length || 0} strokes`);
    } catch (error) {
      console.warn("Coloring Studio save failed",error);
      setColoringStatus("Could not save canvas progress on this device.");
    }
  }

  function setColoringStatus(text) {
    const node=document.getElementById("coloringSaveStatusV314as"); if (node) node.textContent=text;
  }

  function openColoringDb() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve,reject) => {
      if (!window.indexedDB) { reject(new Error("IndexedDB unavailable")); return; }
      const request=indexedDB.open("life-rpg-coloring-v1",1);
      request.onupgradeneeded=() => {
        const db=request.result;
        if (!db.objectStoreNames.contains("pages")) db.createObjectStore("pages",{keyPath:"pageId"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error || new Error("IndexedDB open failed"));
    });
    return idbPromise;
  }

  async function loadColoringRecord(pageId) {
    const db=await openColoringDb();
    return new Promise((resolve,reject) => {
      const tx=db.transaction("pages","readonly");
      const req=tx.objectStore("pages").get(pageId);
      req.onsuccess=()=>resolve(req.result || null);
      req.onerror=()=>reject(req.error);
    });
  }

  async function saveColoringRecord(record) {
    const db=await openColoringDb();
    return new Promise((resolve,reject) => {
      const tx=db.transaction("pages","readwrite");
      tx.objectStore("pages").put(record);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  async function exportColoringPng() {
    if (!coloring) return;
    await persistColoringNow();
    const out=document.createElement("canvas"); out.width=1024; out.height=1365;
    const ctx=out.getContext("2d"); ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,out.width,out.height);
    ctx.drawImage(coloring.canvas,0,0);
    try {
      const img=await loadImage(coloring.page.src);
      ctx.drawImage(img,0,0,out.width,out.height);
    } catch {}
    out.toBlob(blob => {
      if (!blob) return;
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download=`life-rpg-${coloring.page.id}-coloring.png`; a.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),1500);
    },"image/png");
  }

  function loadImage(src) {
    return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src; });
  }

  function roman(value) { return ["", "I", "II", "III", "IV", "V"][Number(value || 0)] || String(value || ""); }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function escAttr(value) { return esc(value).replace(/`/g,"&#96;"); }

  window.LifeRPGTalentRewardStudios = {
    version: VERSION,
    open,
    cards: JAPANESE_CARDS,
    coloringPages: COLORING_PAGES
  };
})();
