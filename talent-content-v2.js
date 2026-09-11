(() => {
  "use strict";

  if (window.__lifeRpgTalentContentV314ap) return;
  window.__lifeRpgTalentContentV314ap = true;

  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  if (!app?.getState || !app?.saveState || !graph?.isContentUnlocked) {
    console.error("Talent Content could not initialize because the Talent Tree graph is unavailable.");
    return;
  }

  const VERSION = "0.31.4ap";
  const SCHEMA = 1;
  const JOURNAL = {
    "work-debrief": {
      realm: "Work",
      icon: "🧾",
      title: "Work Debrief",
      capability: "confidence",
      thresholds: [40, 140, 320],
      prompts: [
        "What actually moved forward today? What is the clearest next step — and what is allowed to wait?",
        "What took more energy than expected today? What would make the next work block easier?",
        "What did you handle well today, even if the whole task is not finished yet?"
      ],
      placeholder: "A few honest lines are enough…"
    },
    "decision-lens": {
      realm: "Knowledge",
      icon: "🔎",
      title: "Decision Lens",
      capability: "knowledge",
      thresholds: [50, 160, 340],
      prompts: [
        "What are the real options? What evidence do you have, what is still uncertain, and which next step is reversible?",
        "If you removed the pressure to find the perfect answer, what information would actually change your decision?",
        "What assumption are you currently treating like a fact?"
      ],
      placeholder: "Options, evidence, uncertainty, next step…"
    },
    "sentence-forge": {
      realm: "Japanese",
      icon: "文",
      title: "Sentence Forge",
      capability: "japanese",
      thresholds: [8, 25, 60],
      prompts: [
        "今日のことを日本語で一文だけ書いてみよう。 One real sentence is enough.",
        "今ほしいもの・したいことについて、日本語で一〜三文書いてみよう。",
        "今日覚えたい言葉を一つ使って、自分について文を作ってみよう。",
        "最近楽しかったことを、日本語で短く書いてみよう。"
      ],
      placeholder: "日本語で書いてみる…"
    },
    "idea-garden": {
      realm: "Hobbies",
      icon: "🌱",
      title: "Idea Garden",
      capability: "creativity",
      thresholds: [30, 110, 280],
      prompts: [
        "What idea, image, lyric, project fragment or tiny obsession do you want to keep before it disappears?",
        "What would be fun to make if it did not need to become impressive or useful?",
        "Take one half-formed idea and give it one more detail.",
        "What are you drawn to aesthetically right now? Capture the pieces, not a finished concept."
      ],
      placeholder: "Fragments absolutely count…"
    },
    "body-signals": {
      realm: "Health",
      icon: "◌",
      title: "Body Signals",
      capability: "wellbeing",
      thresholds: [25, 90, 200],
      prompts: [
        "Notice three things without fixing them: one body sensation, one energy signal, and one thing that would feel supportive right now.",
        "What does your body seem to be asking for: movement, food, water, warmth, quiet, stretching, sleep, space — or nothing obvious?",
        "Where does the day feel easy in your body, and where does it feel effortful? Description is enough; no score needed."
      ],
      placeholder: "Information, not a grade…"
    }
  };

  const TIMER_CONTENT = {
    "one-surface-reset": {
      realm: "Home",
      title: "One-Surface Reset",
      icon: "🧺",
      minutes: 7,
      mode: "action",
      categoryId: "life_admin",
      subcategory: "Household",
      prompts: [
        ["One visible surface", "Pick one table, counter, desk or shelf. Only reset that surface; the rest of the room is not part of this session."],
        ["One small pile", "Choose one contained pile and reduce it for seven minutes. You do not have to finish the whole category."],
        ["Kitchen landing zone", "Reset the small area that would make the kitchen feel noticeably easier to use."],
        ["Visual calm", "Choose the one visible spot whose reset would make the room feel about 10% calmer."],
        ["Put-away pass", "Put away only things that already have an obvious home. No organizing project required."]
      ]
    },
    "lesson-spark": {
      realm: "Work",
      title: "Lesson Spark Deck",
      icon: "💡",
      minutes: 25,
      mode: "focus",
      categoryId: "focus",
      subcategory: "Planning",
      prompts: [
        ["One strong example", "Build one example that makes the mathematical/religious idea easier to see. Ignore the rest of the lesson for this block."],
        ["Misconception pass", "Pick one likely misconception and design one way to make it visible or discussable."],
        ["Board structure", "Sketch the clearest possible board/slide structure for one important phase."],
        ["Exit question", "Create one question that would actually tell you what students understood."],
        ["Explanation pass", "Take one explanation and make it shorter, clearer and more concrete without redesigning everything."]
      ]
    },
    "creative-prompt-deck": {
      realm: "Hobbies",
      title: "Creative Prompt Deck",
      icon: "✦",
      minutes: 15,
      mode: "action",
      categoryId: "hobby",
      subcategory: "Creative",
      prompts: [
        ["Make the tiny version", "Take something you would normally imagine as a whole project and make the smallest complete fragment of it."],
        ["Remix an old fragment", "Open something unfinished or abandoned and change one thing just for fun."],
        ["Contrast", "Make something around a contrast: soft / sharp, cute / eerie, quiet / loud, polished / messy."],
        ["One constraint", "Choose one material, tool, color, chord, shape or format and let that limitation decide the next fifteen minutes."],
        ["No outcome required", "Explore one idea for fifteen minutes with permission to keep absolutely nothing at the end."]
      ],
      completionBonus: { xp: 6, realmXP: 8, statXP: 4, coins: 8, storyEnergyBase: .12 }
    },
    "work-focus-challenges": {
      realm: "Work", title: "Focus Challenge Deck", icon: "◆", minutes: 35, mode: "focus",
      categoryId: "work_home", subcategory: "Preparation",
      prompts: [
        ["Finish one annoying edge", "Pick the small unfinished edge that keeps reopening in your head and give it one uninterrupted block."],
        ["Make tomorrow easier", "Use this block only for something that removes friction from tomorrow's work."],
        ["Ugly first version", "Produce the rough version before judging it. Polish is explicitly outside this challenge."],
        ["One hard decision", "Choose the single decision that is blocking several smaller tasks and resolve only that."],
        ["Close the loop", "Take one almost-finished work item all the way to a clean stopping point."]
      ]
    },
    "recovery-toolkit": {
      realm: "Recovery", title: "Recovery Toolkit", icon: "✦", minutes: 6, mode: "action",
      categoryId: "recovery", subcategory: "Other recovery",
      prompts: [
        ["Eyes-off-screen reset", "Put the screen down or look away from it. Let your eyes rest on something farther away and do nothing useful for six minutes."],
        ["Warm drink reset", "Make or hold something warm. Sit down for six minutes without stacking another task onto it."],
        ["Floor / sofa reset", "Choose the most comfortable available surface and let your body be fully supported for six minutes."],
        ["Music only", "Put on one or two songs and make listening the entire activity. No tidying, planning or catching up."],
        ["Quiet window", "Sit somewhere you can see outside or a calm part of the room. Six minutes of being there is enough."]
      ],
      completionBonus: { xp: 8, realmXP: 8, statXP: 6, coins: 6, storyEnergyBase: .30 }
    },
    "home-reset-deck": {
      realm: "Home", title: "Home Reset Deck", icon: "▦", minutes: 12, mode: "action",
      categoryId: "life_admin", subcategory: "Household",
      prompts: [
        ["Twelve-minute kitchen reset", "Choose the few things that would make the kitchen nicer to walk into later. Stop when the timer ends."],
        ["Laundry checkpoint", "Move one laundry process forward exactly one step: collect, start, hang, fold or put away."],
        ["Entrance reset", "Make the first area you see when coming home a little calmer or more usable."],
        ["Desk landing zone", "Clear enough space that the desk can receive tomorrow without becoming a whole organizing project."],
        ["Bathroom quick reset", "Do the small visible things that make the bathroom feel fresher. No deep clean required."],
        ["Room rescue", "Pick whichever room currently creates the most friction and spend twelve minutes only on obvious wins."]
      ]
    },
    "creative-dice": {
      realm: "Hobbies", title: "Creative Dice", icon: "🎲", minutes: 20, mode: "action",
      categoryId: "hobby", subcategory: "Creative",
      prompts: [
        ["Soft + strange + tiny", "Make something small that combines softness with one unsettling or unexpected detail."],
        ["Warm + nostalgic + limited", "Use only a very small palette / set of sounds / handful of materials and aim for nostalgia."],
        ["Sharp + romantic + unfinished", "Create a deliberately unfinished fragment where something edgy and something romantic meet."],
        ["Cozy + witchy + ordinary", "Take an everyday object or moment and make it feel quietly magical."],
        ["Playful + dramatic + repetitive", "Choose one motif, phrase, shape or sound and repeat it until it becomes the whole piece."],
        ["Minimal + moody + one accent", "Keep almost everything restrained and let exactly one element become expressive."]
      ],
      completionBonus: { xp: 8, realmXP: 10, statXP: 6, coins: 10, storyEnergyBase: .15 }
    }
  };

  const SPRINT_CONTENT = {
    "shadowing-sprint": {
      realm: "Japanese",
      title: "Shadowing Sprint",
      icon: "🎙️",
      seconds: 300,
      prompts: [
        "Pick one short line from Japanese audio you already have. Listen once, then imitate rhythm and intonation rather than chasing perfect pronunciation.",
        "Choose a line you can mostly hear. Loop it, speak with it, then speak just after it. Meaning can stay imperfect for this sprint.",
        "Use one sentence from anime, a show, a podcast or a video. Copy the speaker's pace and emotional shape for five minutes.",
        "Pick a line with one sound or rhythm you find difficult. Keep it playful: listen → echo → listen → echo."
      ]
    }
  };

  let activeId = null;
  let timerScan = null;
  let sprintTicker = null;

  init();

  function init() {
    ensureState();
    ensureDialog();
    bind();
    refresh();
    processTimerCompletions();
    window.addEventListener("life-rpg:render", scheduleRefresh);
    window.addEventListener("life-rpg:state-saved", scheduleRefresh);
    window.addEventListener("life-rpg:talent-content-v2-change", scheduleRefresh);
    window.addEventListener("life-rpg:time-change", () => {
      processTimerCompletions();
      scheduleRefresh();
    });
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      entries: {},
      timerClaims: {},
      sprints: {}
    };
  }

  function ensureState() {
    const root = app.getState();
    if (!root.talentContentV2 || typeof root.talentContentV2 !== "object" || Array.isArray(root.talentContentV2)) {
      root.talentContentV2 = defaults();
    }
    const s = root.talentContentV2;
    s.schemaVersion = SCHEMA;
    s.version = VERSION;
    s.entries ||= {};
    s.timerClaims ||= {};
    s.sprints ||= {};
    return s;
  }

  function state() { return ensureState(); }

  function dateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function dailyEntry(id, create = true) {
    const key = dateKey();
    if (!state().entries[key] && create) state().entries[key] = {};
    if (!state().entries[key]) return null;
    if (!state().entries[key][id] && create) state().entries[key][id] = { text: "", claimedTier: 0, updatedAt: null };
    return state().entries[key][id] || null;
  }

  function isUnlocked(id) {
    const journal = JOURNAL[id];
    const timer = TIMER_CONTENT[id];
    const sprint = SPRINT_CONTENT[id];
    const realm = journal?.realm || timer?.realm || sprint?.realm;
    return Boolean(realm && graph.isContentUnlocked(realm, id));
  }

  function ensureDialog() {
    if (document.getElementById("talentContentDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "talentContentDialog";
    dialog.className = "talent-content-dialog-v314ao";
    dialog.innerHTML = `
      <form method="dialog" class="talent-content-shell-v314ao">
        <button class="talent-content-close-v314ao" value="cancel" aria-label="Close">×</button>
        <div id="talentContentBody"></div>
      </form>`;
    document.body.appendChild(dialog);
  }

  function bind() {
    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-talent-content-open]");
      if (open) {
        event.preventDefault();
        openContent(open.dataset.talentContentOpen);
        return;
      }

      const path = event.target.closest?.("[data-talent-content-path]");
      if (path) {
        event.preventDefault();
        graph.focusRealm(path.dataset.talentContentPath);
        return;
      }

      const save = event.target.closest?.("[data-talent-content-save]");
      if (save) {
        event.preventDefault();
        saveJournal(save.dataset.talentContentSave);
        return;
      }

      const timer = event.target.closest?.("[data-talent-content-timer]");
      if (timer) {
        event.preventDefault();
        startTimer(timer.dataset.talentContentTimer, timer.dataset.promptTitle || "");
        return;
      }

      const reroll = event.target.closest?.("[data-talent-content-reroll]");
      if (reroll) {
        event.preventDefault();
        renderTimerContent(reroll.dataset.talentContentReroll, true);
        return;
      }

      const sprint = event.target.closest?.("[data-talent-content-sprint]");
      if (sprint) {
        event.preventDefault();
        startOrResumeSprint(sprint.dataset.talentContentSprint);
      }
    });

    document.addEventListener("input", event => {
      const area = event.target.closest?.("#talentContentTextarea");
      if (!area || !activeId) return;
      updateMeter(activeId, area.value);
    });
  }

  function scheduleRefresh() {
    window.clearTimeout(timerScan);
    timerScan = window.setTimeout(() => {
      refresh();
      processTimerCompletions();
    }, 80);
  }

  function refresh() {
    renderJournalPanel();
  }

  function renderJournalPanel() {
    const page = document.getElementById("view-journal");
    if (!page) return;

    let panel = document.getElementById("talentJournalToolsV314ap");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "talentJournalToolsV314ap";
      panel.className = "panel talent-journal-tools-v314ao";
      const firstDialog = page.querySelector("dialog");
      if (firstDialog) page.insertBefore(panel, firstDialog);
      else page.appendChild(panel);
    }

    const cards = Object.entries(JOURNAL).map(([id, def]) => {
      const unlocked = isUnlocked(id);
      const entry = dailyEntry(id, false);
      const chars = String(entry?.text || "").trim().length;
      return `<article class="talent-journal-card-v314ao ${unlocked ? "is-unlocked" : "is-locked"}">
        <span>${def.icon}</span>
        <div>
          <small>${esc(def.realm.toUpperCase())} TALENT CONTENT</small>
          <strong>${esc(def.title)}</strong>
          <p>${unlocked ? (chars ? `${chars} characters saved today.` : "Unlocked · available whenever it is useful.") : `Locked · unlock it in the ${esc(def.realm)} Talent Tree.`}</p>
        </div>
        ${unlocked
          ? `<button class="secondary-button" type="button" data-talent-content-open="${escAttr(id)}">${chars ? "Continue" : "Open"}</button>`
          : `<button class="text-button" type="button" data-talent-content-path="${escAttr(def.realm)}">View path</button>`}
      </article>`;
    }).join("");

    panel.innerHTML = `
      <div class="talent-journal-head-v314ao">
        <div><p class="eyebrow">TALENT JOURNAL TOOLS</p><h2>Extra reflection forms you can actually unlock</h2><p class="panel-subcopy">These are optional content rewards, not required parts of the normal Journal.</p></div>
      </div>
      <div class="talent-journal-grid-v314ao">${cards}</div>`;
  }

  function openContent(id) {
    if (!isUnlocked(id)) {
      const def = JOURNAL[id] || TIMER_CONTENT[id];
      if (def?.realm) graph.focusRealm(def.realm);
      return false;
    }
    if (JOURNAL[id]) renderJournal(id);
    else if (TIMER_CONTENT[id]) renderTimerContent(id, false);
    else if (SPRINT_CONTENT[id]) renderSprintContent(id);
    else return false;
    return true;
  }

  function renderJournal(id) {
    const def = JOURNAL[id];
    if (!def) return;
    activeId = id;
    const entry = dailyEntry(id, true);
    const prompt = pickDaily(def.prompts, `${id}:${dateKey()}`);
    const body = document.getElementById("talentContentBody");
    if (!body) return;

    body.innerHTML = `
      <div class="talent-content-kicker-v314ao">${def.icon} ${esc(def.realm)} · unlocked content</div>
      <h2>${esc(def.title)}</h2>
      <p class="talent-content-prompt-v314ao">${esc(prompt)}</p>
      <textarea id="talentContentTextarea" rows="8" maxlength="3000" placeholder="${escAttr(def.placeholder)}">${esc(entry.text || "")}</textarea>
      <div id="talentContentMeter" class="talent-content-meter-v314ao"></div>
      <div class="talent-content-actions-v314ao">
        <button class="primary-button" type="button" data-talent-content-save="${escAttr(id)}">Save entry</button>
      </div>`;
    updateMeter(id, entry.text || "");
    const dialog = document.getElementById("talentContentDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
  }

  function updateMeter(id, text) {
    const def = JOURNAL[id];
    const meter = document.getElementById("talentContentMeter");
    if (!def || !meter) return;
    const chars = String(text || "").trim().length;
    const current = tierFor(def.thresholds, chars);
    const claimed = Number(dailyEntry(id, false)?.claimedTier || 0);
    const next = def.thresholds[current] || null;
    meter.innerHTML = `<span>${chars} chars</span><strong>${current ? `Writing tier ${current}/${def.thresholds.length}` : "First reward tier not reached yet"}</strong><small>${next ? `${Math.max(0, next - chars)} chars to the next tier` : "All writing tiers reached for today"}${claimed ? ` · ${claimed} already rewarded` : ""}</small>`;
  }

  function tierFor(thresholds, chars) {
    let tier = 0;
    thresholds.forEach((threshold, index) => {
      if (chars >= threshold) tier = index + 1;
    });
    return tier;
  }

  function saveJournal(id) {
    const def = JOURNAL[id];
    const area = document.getElementById("talentContentTextarea");
    if (!def || !area || !isUnlocked(id)) return false;

    const text = String(area.value || "").trim();
    const entry = dailyEntry(id, true);
    const chars = text.length;
    const reached = tierFor(def.thresholds, chars);
    const previous = Number(entry.claimedTier || 0);

    entry.text = text;
    entry.updatedAt = new Date().toISOString();

    if (reached > previous) {
      const increments = [
        { xp: 4, realmXP: 5, statXP: 3, coins: 5, story: .05 },
        { xp: 4, realmXP: 5, statXP: 3, coins: 5, story: .05 },
        { xp: 6, realmXP: 8, statXP: 4, coins: 10, story: .10 }
      ];
      const reward = { xp: 0, realmXP: 0, statXP: 0, coins: 0, story: 0 };
      for (let i = previous; i < reached; i += 1) {
        const add = increments[i] || increments.at(-1);
        reward.xp += add.xp;
        reward.realmXP += add.realmXP;
        reward.statXP += add.statXP;
        reward.coins += add.coins;
        reward.story += add.story;
      }

      app.awardActivity?.({
        source: "talent-content-v2",
        sourceId: `${id}:${dateKey()}:tier-${reached}`,
        label: `${def.title} · writing tier ${reached}`,
        realm: def.realm,
        capability: def.capability,
        xp: reward.xp,
        realmXP: reward.realmXP,
        statXP: reward.statXP,
        coins: reward.coins,
        storyEnergyBase: reward.story,
        progressionRelevant: true,
        metadata: {
          talentContentV2: true,
          contentId: id,
          characters: chars,
          previousTier: previous,
          reachedTier: reached
        }
      });
      entry.claimedTier = reached;
      app.showToast?.(`${def.icon} ${def.title} saved · new writing reward earned.`);
    } else {
      app.showToast?.(`${def.icon} ${def.title} saved.`);
    }

    app.saveState({ source: `talent-content-${id}` });
    refresh();
    updateMeter(id, text);
    return true;
  }

  function renderTimerContent(id, reroll = false) {
    const def = TIMER_CONTENT[id];
    if (!def || !isUnlocked(id)) return;
    activeId = id;
    const seed = reroll ? `${id}:${Date.now()}:${Math.random()}` : `${id}:${dateKey()}`;
    const prompt = pickDaily(def.prompts, seed);
    const body = document.getElementById("talentContentBody");
    if (!body) return;

    body.innerHTML = `
      <div class="talent-content-kicker-v314ao">${def.icon} ${esc(def.realm)} · unlocked activity</div>
      <h2>${esc(def.title)}</h2>
      <article class="talent-content-prompt-card-v314ao">
        <small>TODAY'S DRAW</small>
        <strong>${esc(prompt[0])}</strong>
        <p>${esc(prompt[1])}</p>
      </article>
      <p class="talent-content-timer-note-v314ao">${def.minutes} minutes · starts a real ${def.mode === "focus" ? "Focus" : "Life Rhythm"} timer and logs the actual time.</p>
      <div class="talent-content-actions-v314ao">
        <button class="primary-button" type="button" data-talent-content-timer="${escAttr(id)}" data-prompt-title="${escAttr(prompt[0])}">Start ${def.minutes}-minute session</button>
        <button class="secondary-button" type="button" data-talent-content-reroll="${escAttr(id)}">Draw another</button>
      </div>`;
    const dialog = document.getElementById("talentContentDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
  }

  function startTimer(id, promptTitle) {
    const def = TIMER_CONTENT[id];
    const time = window.LifeRPGTime;
    if (!def || !time || !isUnlocked(id)) return false;
    if (time.getActive?.()) {
      app.showToast?.("A timer is already running. Finish or cancel that session first.");
      return false;
    }

    const label = `${def.title} · ${promptTitle || "session"}`;
    if (def.mode === "focus") {
      time.startFocus?.({
        minutes: def.minutes,
        breakMinutes: 0,
        categoryId: def.categoryId,
        subcategory: def.subcategory,
        label
      });
    } else {
      time.startAction?.({
        minutes: def.minutes,
        categoryId: def.categoryId,
        subcategory: def.subcategory,
        label
      });
    }

    document.getElementById("talentContentDialog")?.close?.();
    app.showView?.("rhythm");
    return true;
  }

  function processTimerCompletions() {
    const entries = window.LifeRPGTime?.getEntries?.() || [];
    const defs = Object.entries(TIMER_CONTENT);

    for (const entry of entries.slice(-80)) {
      if (!entry?.id || state().timerClaims[entry.id]) continue;
      const match = defs.find(([, def]) => String(entry.label || "").startsWith(`${def.title} ·`));
      if (!match) continue;
      const [id, def] = match;
      const target = Number(entry.targetMinutes || def.minutes || 0);
      const durationSeconds = Number(entry.durationSeconds || 0);
      const completed = target > 0 && (durationSeconds >= target * 60 || Number(entry.minutes || 0) >= target);
      if (!completed) continue;

      state().timerClaims[entry.id] = Date.now();

      // Home/Work already receive normal time/focus rewards. Hobbies time is intentionally
      // normally reward-neutral, so the unlocked creative activity supplies its own modest completion reward.
      if (def.completionBonus) {
        app.awardActivity?.({
          source: "talent-content-v2",
          sourceId: `timer:${entry.id}`,
          label: def.title,
          realm: def.realm,
          capability: def.realm === "Hobbies" ? "creativity" : null,
          ...def.completionBonus,
          progressionRelevant: true,
          metadata: { talentContentV2: true, contentId: id, timeEntryId: entry.id, minutes: target }
        });
      }
      app.saveState({ source: `talent-content-timer-${id}` });
    }
  }


  function renderSprintContent(id) {
    const def = SPRINT_CONTENT[id];
    if (!def || !isUnlocked(id)) return;
    activeId = id;
    const sprint = state().sprints[id] || null;
    const prompt = pickDaily(def.prompts, `${id}:${dateKey()}`);
    const remaining = sprintRemaining(id);
    const body = document.getElementById("talentContentBody");
    if (!body) return;

    body.innerHTML = `
      <div class="talent-content-kicker-v314ao">${def.icon} ${esc(def.realm)} · unlocked activity</div>
      <h2>${esc(def.title)}</h2>
      <article class="talent-content-prompt-card-v314ao">
        <small>BRING YOUR OWN AUDIO</small>
        <strong>Five minutes of echoing real Japanese</strong>
        <p>${esc(prompt)}</p>
      </article>
      <div class="talent-sprint-clock-v314ap" id="talentSprintClock">${formatClock(remaining)}</div>
      <p class="talent-content-timer-note-v314ao">Use any Japanese clip you already enjoy. No embedded audio is required.</p>
      <div class="talent-content-actions-v314ao">
        <button class="primary-button" type="button" data-talent-content-sprint="${escAttr(id)}">${sprint && !sprint.completedAt ? "Resume sprint" : sprint?.completedAt && sprint.dateKey === dateKey() ? "Completed today ✓" : "Start 5-minute sprint"}</button>
      </div>`;
    const button = body.querySelector("[data-talent-content-sprint]");
    if (sprint?.completedAt && sprint.dateKey === dateKey()) button.disabled = true;
    const dialog = document.getElementById("talentContentDialog");
    if (dialog && !dialog.open) dialog.showModal?.();
    tickSprint(id);
  }

  function startOrResumeSprint(id) {
    const def = SPRINT_CONTENT[id];
    if (!def || !isUnlocked(id)) return false;
    const existing = state().sprints[id];
    if (existing?.completedAt && existing.dateKey === dateKey()) return false;

    if (!existing || existing.dateKey !== dateKey() || existing.completedAt) {
      state().sprints[id] = {
        dateKey: dateKey(),
        startedAt: Date.now(),
        targetSeconds: def.seconds,
        completedAt: null,
        rewardEventId: null
      };
      app.saveState({ source: `talent-content-sprint-start-${id}` });
    } else if (!existing.startedAt) {
      existing.startedAt = Date.now();
    }

    window.clearInterval(sprintTicker);
    sprintTicker = window.setInterval(() => tickSprint(id), 250);
    tickSprint(id);
    return true;
  }

  function sprintRemaining(id) {
    const def = SPRINT_CONTENT[id];
    const sprint = state().sprints[id];
    if (!def || !sprint || sprint.dateKey !== dateKey()) return Number(def?.seconds || 0);
    if (sprint.completedAt) return 0;
    return Math.max(0, Number(sprint.targetSeconds || def.seconds) - Math.floor((Date.now() - Number(sprint.startedAt || Date.now())) / 1000));
  }

  function tickSprint(id) {
    const def = SPRINT_CONTENT[id];
    const sprint = state().sprints[id];
    const clock = document.getElementById("talentSprintClock");
    if (!def || !sprint || sprint.dateKey !== dateKey() || sprint.completedAt) {
      if (clock && def) clock.textContent = formatClock(sprint?.completedAt ? 0 : def.seconds);
      return;
    }
    const remaining = sprintRemaining(id);
    if (clock) clock.textContent = formatClock(remaining);
    if (remaining > 0) return;

    window.clearInterval(sprintTicker);
    sprintTicker = null;
    sprint.completedAt = Date.now();
    const reward = app.awardActivity?.({
      source: "talent-content-v2",
      sourceId: `shadowing-sprint:${dateKey()}`,
      label: "Shadowing Sprint",
      realm: "Japanese",
      capability: "japanese",
      xp: 8,
      realmXP: 10,
      statXP: 8,
      coins: 8,
      storyEnergyBase: .20,
      progressionRelevant: true,
      metadata: { talentContentV2: true, contentId: id, seconds: def.seconds }
    });
    sprint.rewardEventId = reward?.eventId || null;
    app.saveState({ source: "talent-content-sprint-complete" });
    app.showToast?.("🎙️ Shadowing Sprint complete · Japanese practice saved.");
    renderSprintContent(id);
  }

  function formatClock(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds || 0)));
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function pickDaily(items, seedText) {
    if (!Array.isArray(items) || !items.length) return "";
    let hash = 2166136261;
    for (const ch of String(seedText || "")) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return items[Math.abs(hash >>> 0) % items.length];
  }

  function esc(value) {
    return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "");
  }

  function escAttr(value) {
    return esc(value).replace(/`/g, "&#96;");
  }

  window.LifeRPGTalentContentV2 = {
    version: VERSION,
    open: openContent,
    refresh,
    journalDefs: JOURNAL,
    timerDefs: TIMER_CONTENT,
    sprintDefs: SPRINT_CONTENT
  };
})();