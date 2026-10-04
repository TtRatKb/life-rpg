/* Life RPG V0.31.4dz17 — Dashboard V2: Today First + Skill Momentum. */
(() => {
  "use strict";
  if (window.LifeRPGDashboardV2) return;

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.registry) return;

  const VERSION = "0.31.4dz18";
  const REALMS = {
    Work: { icon: "📎", label: "Work" },
    Knowledge: { icon: "📚", label: "Knowledge" },
    Japanese: { icon: "🌸", label: "Japanese" },
    Health: { icon: "🌱", label: "Health" },
    Recovery: { icon: "🛋️", label: "Recovery" },
    Home: { icon: "🏠", label: "Home" },
    Hobbies: { icon: "🎨", label: "Hobbies" }
  };

  const ACTIONS = {
    "teaching-facilitation": [
      action("🧑‍🏫", "Unterricht / Vertretung", "Öffne Meine Woche und erfasse einen tatsächlich gehaltenen Block.", () => openWeekLog()),
      action("✦", "School Moments", "Falls freigeschaltet: kurze Teaching-Life-Entscheidungen im Work Tree.", () => window.LifeRPGTalentV3?.open?.("school-moments"))
    ],
    "lesson-design-preparation": [
      action("🗂️", "Unterricht vorbereiten", "Logge echte Vorbereitungszeit in Meine Woche.", () => openWeekLog()),
      action("🎯", "Focus-Block starten", "Ein konkreter Vorbereitungsblock zählt, wenn er wirklich läuft.", () => window.LifeRPGTime?.startFocus?.({ categoryId:"work_home", subcategory:"Preparation", label:"Lesson preparation", minutes:35 }))
    ],
    "assessment-feedback": [
      action("✓", "Korrekturen loggen", "Öffne Meine Woche und erfasse echte Korrekturzeit.", () => openWeekLog()),
      action("🎯", "Correction Focus", "Starte einen konzentrierten Korrekturblock.", () => window.LifeRPGTime?.startFocus?.({ categoryId:"work_home", subcategory:"Corrections", label:"Assessment & feedback", minutes:35 }))
    ],
    "professional-organization": [
      action("📋", "Schulorganisation", "Konferenzen, Orga und Administration in Meine Woche erfassen.", () => openWeekLog()),
      action("🗓️", "Meine Woche", "Plane oder korrigiere echte Schulblöcke.", () => app.showView?.("week"))
    ],
    "focus-concentration": [
      action("🎯", "Focus Timer", "Starte einen echten Deep-Work-Block.", () => window.LifeRPGTime?.startFocus?.({ categoryId:"focus", subcategory:"Deep work", label:"Focused work", minutes:35 })),
      action("▦", "Meine Woche", "Arbeitszeit anschließend nachvollziehbar im Zeitlog sehen.", () => app.showView?.("week"))
    ],
    "logical-pattern-reasoning": [
      action("🧩", "Sudoku", "Trainiert Deduktion und Mustererkennung.", () => window.LifeRPGSudoku?.open?.()),
      action("◩", "Nonogram", "Bildlogik und systematisches Ausschließen.", () => window.LifeRPGNonogram?.open?.()),
      action("01", "Takuzu", "Falls freigeschaltet: binäre Logik im Knowledge Tree.", () => window.LifeRPGTalentV3?.open?.("takuzu"))
    ],
    "quantitative-reasoning": [
      action("🔢", "Number Sense", "Kurze native Zahlen- und Schätzaufgaben.", () => window.LifeRPGNumberSense?.open?.()),
      action("📚", "Knowledge Workshop", "Mathematische Notizen oder Erklärungen vertiefen.", () => window.LifeRPGKnowledgeWorkshop?.open?.())
    ],
    "memory-recall": [
      action("🧠", "Memory Garden", "Trainiert Arbeitsgedächtnis und Abruf.", () => window.LifeRPGMemoryGarden?.open?.()),
      action("📚", "Knowledge Workshop", "Wissen aus eigenen Notizen wieder aufbauen.", () => window.LifeRPGKnowledgeWorkshop?.open?.())
    ],
    "language-expression": [
      action("⌗", "Lexicon Lab", "Wortschatz, Ausdruck und adaptive Crosswords.", () => window.LifeRPGLexiconLab?.open?.()),
      action("✍️", "Journal", "Längere eigene Formulierungen trainieren Ausdruck.", () => app.showView?.("journal"))
    ],
    "learning-inquiry": [
      action("🔎", "Knowledge Workshop", "Eine echte Frage recherchieren, erklären oder verknüpfen.", () => window.LifeRPGKnowledgeWorkshop?.open?.()),
      action("📖", "Library", "Lesen und daraus etwas festhalten.", () => app.showView?.("library"))
    ],
    "language-learning": [
      action("あ", "Kotoba Quick", "Fällige Vokabeln/Grammatik direkt üben.", () => window.LifeRPGKotobaQuickTraining?.startQuick?.()),
      action("🌸", "Japanese Practice Library", "Eigene Medien für Listening/Mining verwenden.", () => app.showView?.("hub-play"))
    ],
    "movement-body-care": [
      action("🤸", "Guided Stretch", "Kurze angeleitete Bewegung statt einer offenen Aufgabe.", () => window.LifeRPGRecoveryStudio?.start?.("stretch10")),
      action("◷", "Bewegung loggen", "Echte Bewegungszeit im Zeitlog erfassen.", () => app.showView?.("rhythm"))
    ],
    "physical-vitality": [
      action("🏋️", "Health Quest / Habit", "Gym, Workout oder Sport trainiert diesen Skill über passende Quests oder Habits.", () => app.showView?.("quests")),
      action("✿", "Habits", "Ein wiederkehrender Workout-Habit kann direkt diesem Skill zugeordnet werden.", () => app.showView?.("habits"))
    ],
    "personal-care": [
      action("🫧", "Habits", "Pflege-Habits zählen, wenn sie diesem Skill zugeordnet sind.", () => app.showView?.("habits")),
      action("✿", "Schnell loggen", "Für konkrete Care-Routinen kannst du einen passenden Habit anlegen.", () => app.showView?.("habits"))
    ],
    "reflection-self-awareness": [
      action("🌙", "Daily Check-in", "Der tägliche Check-in trainiert Selbstwahrnehmung.", () => document.getElementById("dailyBriefingStart")?.click()),
      action("✍️", "Journal", "Reflexionen und Wochenrückblicke vertiefen den Skill.", () => app.showView?.("journal"))
    ],
    "recovery-regulation": [
      action("🌿", "Recovery Studio", "Atmung, Body Scan, Ruhe oder sanfte Regulation.", () => window.LifeRPGRecoveryStudio?.open?.()),
      action("◷", "Recovery loggen", "Bewusste Erholung kann als echte Aktivität erfasst werden.", () => app.showView?.("rhythm"))
    ],
    "life-management": [
      action("🏠", "Schnell loggen", "Haushalt erledigt? Direkt als Home Action erfassen.", () => window.LifeRPGLifeHub?.open?.()),
      action("🍲", "Essensplan", "Planung und Vorratsorganisation als praktisches Life Management.", () => app.showView?.("meals")),
      action("▦", "Meine Woche", "Termine und echte Adminzeit übersichtlich halten.", () => app.showView?.("week"))
    ],
    "creative-expression": [
      action("✍️", "Drawing Studio", "Zeichnen und kreative Challenges trainieren den Skill.", () => window.LifeRPGCreativeHub?.enter?.("drawing")),
      action("📝", "Adventure", "Ein konkretes kreatives Projekt weiterführen.", () => app.showView?.("adventures"))
    ],
    "craft-making": [
      action("🧶", "Adventures", "Ein reales Craft-/DIY-Projekt als Adventure weiterführen.", () => app.showView?.("adventures")),
      action("◷", "Craft-Zeit loggen", "Hands-on-Zeit als echte Hobby-Aktivität erfassen.", () => app.showView?.("rhythm"))
    ],
    "style-visual-design": [
      action("◈", "Palette Atelier", "Falls freigeschaltet: tägliches Farbtraining.", () => window.LifeRPGTalentV3?.open?.("palette-atelier")),
      action("💄", "Style-Habit", "Makeup/Hair/Styling-Habits können diesem Skill zugeordnet werden.", () => app.showView?.("habits"))
    ],
    "recreation-play": [
      action("🎮", "Games", "Spielen zählt als echte Recreation — ohne Produktivitätsumweg.", () => app.showView?.("games")),
      action("📖", "Library", "For-fun Reading trainiert Recreation & Play.", () => app.showView?.("library")),
      action("🎨", "Coloring Studio", "Freies Ausmalen ist ebenfalls legitime Spiel-/Hobbyzeit.", () => window.LifeRPGCreativeHub?.enter?.("coloring"))
    ]
  };

  let renderTimer = null;
  let mutationObserver = null;

  function action(icon, label, detail, run) { return { icon, label, detail, run }; }
  function esc(value) { return app.escapeHtml?.(String(value ?? "")) || String(value ?? ""); }

  function characterLevelInfo(totalXP) {
    let level = 1;
    let remaining = Math.max(0, Number(totalXP || 0));
    let required = 100;
    while (remaining + 1e-9 >= required && level < 999) {
      remaining -= required;
      level += 1;
      required = 100 + (level - 1) * 35;
    }
    return { level, intoLevel: remaining, required, toNext: Math.max(0, required - remaining), percent: required ? Math.min(100, remaining / required * 100) : 0 };
  }

  function milestoneState({ persist = true } = {}) {
    const root = app.getState();
    if (!root.characterMilestonesV1 || typeof root.characterMilestonesV1 !== "object" || Array.isArray(root.characterMilestonesV1)) {
      root.characterMilestonesV1 = { schemaVersion:1, earnedLevels:[], assignments:[] };
    }
    const s = root.characterMilestonesV1;
    if (!Array.isArray(s.earnedLevels)) s.earnedLevels = [];
    if (!Array.isArray(s.assignments)) s.assignments = [];
    const info = characterLevelInfo(root.characterXP);
    const earned = [];
    for (let level = 5; level <= info.level; level += 5) earned.push(level);
    let changed = false;
    for (const level of earned) if (!s.earnedLevels.includes(level)) { s.earnedLevels.push(level); changed = true; }
    s.earnedLevels = [...new Set(s.earnedLevels.map(Number).filter(n => n >= 5 && n % 5 === 0))].sort((a,b)=>a-b);
    if (changed && persist) app.saveState({ source:"character-milestone-discovery", suppressUiRefresh:true });
    return s;
  }

  function availableJourneyLevels() {
    const s = milestoneState();
    const used = new Set(s.assignments.map(row => Number(row?.milestoneLevel || 0)));
    return s.earnedLevels.filter(level => !used.has(level));
  }

  function assignJourneyPoint(realm) {
    if (!REALMS[realm]) return false;
    const levels = availableJourneyLevels();
    if (!levels.length) return false;
    const milestoneLevel = levels[0];
    const root = app.getState();
    const s = milestoneState({ persist:false });
    if (!root.skills || typeof root.skills !== "object") return false;
    if (!root.skills.realmBonusPoints || typeof root.skills.realmBonusPoints !== "object") root.skills.realmBonusPoints = {};
    root.skills.realmBonusPoints[realm] = Math.max(0, Number(root.skills.realmBonusPoints[realm] || 0)) + 1;
    s.assignments.push({ milestoneLevel, realm, at:new Date().toISOString() });
    app.saveState({ source:"character-milestone-journey-point" });
    skills.refreshTalentHub?.();
    window.dispatchEvent(new CustomEvent("life-rpg:talent-content-v2-change"));
    app.showToast?.(`Level ${milestoneLevel} Journey Point → ${realm} Talent Tree.`);
    render();
    return true;
  }

  function ensureLayout() {
    const base = document.getElementById("view-basecamp");
    const hero = base?.querySelector(".dashboard-hero-v3");
    const priority = base?.querySelector(".daily-life-priority-v314cv");
    const focus = base?.querySelector(".dashboard-focus-grid-v314au");
    const planColumn = focus?.querySelector(".dashboard-plan-column-v314au");
    const side = focus?.querySelector(".dashboard-focus-side-v314au");
    const plan = document.getElementById("dailyPicksPanel");
    const briefing = document.getElementById("dailyBriefingPanel");
    const wish = document.querySelector(".dashboard-shop-wish-panel-v306");
    if (!base || !hero || !priority || !focus || !planColumn || !side || !plan || !briefing) return false;

    base.classList.add("dashboard-v2-active-v314dz17", "dashboard-v3-active-v314dz18");

    document.querySelector(".dashboard-achievement-panel-v306")?.classList.add("dashboard-retired-v314dz17");
    document.querySelector(".dashboard-external-card-v3")?.classList.add("dashboard-retired-v314dz17");
    document.querySelector(".dashboard-growth-preview-v3")?.classList.add("dashboard-retired-v314dz17");
    document.getElementById("milestonePanel")?.classList.add("dashboard-retired-v314dz17");
    document.getElementById("socialDeliveryCard")?.classList.add("dashboard-retired-v314dz17");
    document.getElementById("livingWorldV3Card")?.classList.add("dashboard-retired-v314dz17");
    document.getElementById("companionMomentsV2Card")?.classList.add("dashboard-retired-v314dz17");
    document.getElementById("talentV3Library")?.classList.add("dashboard-library-moved-v314dz17");

    let skillCard = document.getElementById("dashboardSkillMomentumV314dz17");
    if (!skillCard) {
      skillCard = document.createElement("section");
      skillCard.id = "dashboardSkillMomentumV314dz17";
      skillCard.className = "panel dashboard-skill-momentum-v314dz17";
    }

    let milestone = document.getElementById("dashboardCharacterMilestoneV314dz17");
    if (!milestone) {
      milestone = document.createElement("div");
      milestone.id = "dashboardCharacterMilestoneV314dz17";
      milestone.className = "dashboard-character-milestone-v314dz17";
      document.querySelector(".dashboard-player-details-v3 .xp-card")?.insertAdjacentElement("afterend", milestone);
    }

    let progress = document.getElementById("dashboardProgressGridV314dz18");
    if (!progress) {
      progress = document.createElement("section");
      progress.id = "dashboardProgressGridV314dz18";
      progress.className = "dashboard-progress-grid-v314dz18";
    }

    let utility = document.getElementById("dashboardUtilityGridV314dz17");
    if (!utility) {
      utility = document.createElement("section");
      utility.id = "dashboardUtilityGridV314dz17";
      utility.className = "dashboard-utility-grid-v314dz17";
    }

    // DZ18 hierarchy: compact greeting -> habits/rewards -> plan -> progress -> utilities.
    // Elements are moved, never cloned, so all existing renderers and event handlers keep their anchors.
    if (hero.nextElementSibling !== priority) hero.insertAdjacentElement("afterend", priority);
    if (priority.nextElementSibling !== plan) priority.insertAdjacentElement("afterend", plan);
    if (plan.nextElementSibling !== progress) plan.insertAdjacentElement("afterend", progress);
    [briefing, skillCard, wish].filter(Boolean).forEach(node => { if (node.parentElement !== progress) progress.appendChild(node); });
    if (progress.nextElementSibling !== utility) progress.insertAdjacentElement("afterend", utility);

    focus.classList.add("dashboard-layout-shell-retired-v314dz18");
    plan.classList.add("dashboard-plan-direct-v314dz18");
    briefing.classList.add("dashboard-briefing-direct-v314dz18");
    skillCard.classList.add("dashboard-skill-direct-v314dz18");
    wish?.classList.add("dashboard-wish-direct-v314dz18");
    priority.classList.add("dashboard-priority-direct-v314dz18");

    const quick = document.getElementById("lifeQuickDashboardCard");
    const week = document.getElementById("weekDashboard");
    const home = document.querySelector(".dashboard-home-card-v3");
    const social = document.querySelector(".dashboard-social-card-v3");
    [quick, week, home, social].filter(Boolean).forEach(node => { if (node.parentElement !== utility) utility.appendChild(node); });

    const context = document.querySelector(".dashboard-context-grid-v314au");
    if (context) context.classList.add("dashboard-context-retired-v314dz17");

    ensureDialogs();
    return true;
  }

  function ensureDialogs() {
    if (!document.getElementById("dashboardSkillGuideV314dz17")) {
      const dialog = document.createElement("dialog");
      dialog.id = "dashboardSkillGuideV314dz17";
      dialog.className = "rpg-dialog dashboard-skill-dialog-v314dz17";
      dialog.innerHTML = `<div class="dashboard-skill-dialog-shell-v314dz17"><header><div><p class="eyebrow">SKILL MOMENTUM</p><h2 id="dashboardSkillGuideTitleV314dz17">Train a skill</h2></div><button type="button" class="close-button" data-dashboard-skill-close aria-label="Close">×</button></header><div id="dashboardSkillGuideBodyV314dz17"></div></div>`;
      document.body.appendChild(dialog);
    }
    if (!document.getElementById("dashboardJourneyPointV314dz17")) {
      const dialog = document.createElement("dialog");
      dialog.id = "dashboardJourneyPointV314dz17";
      dialog.className = "rpg-dialog dashboard-journey-dialog-v314dz17";
      dialog.innerHTML = `<div class="dashboard-skill-dialog-shell-v314dz17"><header><div><p class="eyebrow">CHARACTER LEVEL REWARD</p><h2>Assign a Journey Point</h2><p class="muted">Every 5 Character Levels earns one bonus point for any Realm Talent Tree. Your choice does not change affection or story outcomes.</p></div><button type="button" class="close-button" data-dashboard-journey-close aria-label="Close">×</button></header><div id="dashboardJourneyPointBodyV314dz17" class="dashboard-journey-realms-v314dz17"></div></div>`;
      document.body.appendChild(dialog);
    }
  }

  function renderSkillMomentum() {
    const card = document.getElementById("dashboardSkillMomentumV314dz17");
    if (!card) return;
    const totals = skills.getTotals();
    const rows = skills.registry.map(item => {
      const info = skills.getLevelInfo(item.id);
      const remaining = Math.max(0, Number(info.required || 0) - Number(info.intoLevel || 0));
      const nextPoints = pointsFromSkillLevel(info.level + 1) - pointsFromSkillLevel(info.level);
      return { ...item, info, remaining, nextPoints, total:Number(totals[item.id] || 0) };
    }).sort((a,b) => {
      const ad = a.total > 0 ? 0 : 1, bd = b.total > 0 ? 0 : 1;
      return ad - bd || a.remaining - b.remaining || a.info.level - b.info.level || a.label.localeCompare(b.label);
    }).slice(0,4);
    const realmRows = Object.keys(REALMS).map(realm => ({ realm, ...skills.getRealmPoints(realm) }));
    const ready = realmRows.filter(row => row.available > 0).sort((a,b)=>b.available-a.available);
    const readyCount = ready.reduce((sum,row)=>sum+Number(row.available||0),0);
    const journey = availableJourneyLevels();
    card.innerHTML = `<div class="dashboard-skill-head-v314dz17"><div><p class="eyebrow">SKILL MOMENTUM</p><h2>What can level next?</h2><p>${readyCount ? `${readyCount} Talent Point${readyCount===1?" is":"s are"} ready to spend.` : "Closest Skills to their next level — based on the XP you actually earned."}</p></div><button class="mini-nav-button" type="button" data-dashboard-open-skills>Skill Trees ›</button></div>${ready.length ? `<div class="dashboard-realm-ready-v314dz17">${ready.slice(0,4).map(row=>`<button type="button" data-dashboard-realm="${esc(row.realm)}"><span>${REALMS[row.realm].icon}</span><strong>${esc(row.realm)}</strong><b>${row.available} pt</b></button>`).join("")}</div>` : ""}<div class="dashboard-skill-grid-v314dz17">${rows.map(skillRow).join("")}</div>${journey.length ? `<button type="button" class="dashboard-journey-ready-v314dz17" data-dashboard-journey-open><span>✦</span><div><strong>${journey.length} Journey Point${journey.length===1?"":"s"} unassigned</strong><small>Earned from Character Levels ${journey.join(", ")} · choose any Realm</small></div><b>Assign ›</b></button>` : ""}`;
  }

  function skillRow(row) {
    const info = row.info;
    const remaining = formatXp(row.remaining);
    const nextPointText = row.nextPoints > 1 ? `+${row.nextPoints} pts` : "+1 pt";
    return `<button type="button" class="dashboard-skill-row-v314dz17" data-dashboard-skill="${esc(row.id)}"><span class="dashboard-skill-icon-v314dz17">${row.icon}</span><span class="dashboard-skill-copy-v314dz17"><small>${esc(row.realm)} · Lv. ${info.level}</small><strong>${esc(row.label)}</strong><i><b style="width:${Number(info.percent||0).toFixed(2)}%"></b></i><em>${remaining} XP to next level · ${nextPointText}</em></span><b aria-hidden="true">›</b></button>`;
  }

  function renderCharacterMilestone() {
    const node = document.getElementById("dashboardCharacterMilestoneV314dz17");
    if (!node) return;
    milestoneState();
    const info = characterLevelInfo(app.getState().characterXP);
    const available = availableJourneyLevels();
    const nextMilestone = Math.ceil((info.level + 1) / 5) * 5;
    const xpToMilestone = xpUntilLevel(app.getState().characterXP, nextMilestone);
    if (available.length) {
      node.innerHTML = `<button type="button" data-dashboard-journey-open><span>✦</span><div><strong>${available.length} Journey Point${available.length===1?"":"s"} ready</strong><small>Character Level rewards · assign to any Realm Tree</small></div><b>Choose ›</b></button>`;
      return;
    }
    node.innerHTML = `<div><span>✦</span><div><strong>Next Character reward · Lv. ${nextMilestone}</strong><small>${formatXp(xpToMilestone)} Character XP to a Journey Point</small></div></div>`;
  }

  function xpUntilLevel(totalXP, targetLevel) {
    const info = characterLevelInfo(totalXP);
    if (targetLevel <= info.level) return 0;
    let remaining = Math.max(0, info.required - info.intoLevel);
    for (let level = info.level + 1; level < targetLevel; level += 1) remaining += 100 + (level - 1) * 35;
    return remaining;
  }

  function renderUtilities() {
    const quick = document.getElementById("lifeQuickDashboardCard");
    if (quick) quick.classList.add("dashboard-utility-card-v314dz17", "dashboard-quick-v314dz17");
    const week = document.getElementById("weekDashboard");
    if (week) week.classList.add("dashboard-utility-card-v314dz17", "dashboard-week-v314dz17");
    const home = document.querySelector(".dashboard-home-card-v3");
    if (home) home.classList.add("dashboard-utility-card-v314dz17", "dashboard-home-v314dz17");
    const social = document.querySelector(".dashboard-social-card-v3");
    if (social) {
      social.classList.add("dashboard-utility-card-v314dz17", "dashboard-social-v314dz17");
      const eyebrow = social.querySelector(".eyebrow"); if (eyebrow) eyebrow.textContent = "STORY & LIFE";
      const title = social.querySelector("h3"); if (title) title.textContent = "Life around me";
      renderSocialCompact();
    }
  }

  function renderSocialCompact() {
    const root = document.getElementById("socialPulse");
    if (!root) return;
    const state = app.getState();
    const social = state.story?.social || {};
    const read = new Set(social.readMessageIds || []);
    const unread = Object.values(social.messageSchedule || {}).filter(entry => entry?.status === "delivered" && entry.groupId && !read.has(entry.groupId) && !read.has(entry.messageId));
    const delivery = window.LifeRPGSocialDelivery?._test?.activeItems?.() || [];
    const readyMoment = delivery.find(item => item.type === "moment") || null;
    const everyday = window.LifeRPGLivingWorldV3?._test?.options?.() || [];
    const buttons = [];
    if (unread.length) buttons.push(`<button type="button" data-dashboard-phone><span>✉</span><strong>${unread.length} message${unread.length===1?"":"s"}</strong><b>›</b></button>`);
    if (readyMoment) buttons.push(`<button type="button" data-dashboard-delivery-moment="${esc(readyMoment.id)}"><span>✿</span><strong>${readyMoment.deliveryType === "talk" ? "Conversation waiting" : "Little moment waiting"}</strong><b>›</b></button>`);
    else if (everyday.length) buttons.push(`<button type="button" data-dashboard-everyday><span>✿</span><strong>Everyday moment</strong><b>›</b></button>`);
    root.innerHTML = buttons.length ? `<div class="dashboard-social-actions-v314dz17">${buttons.join("")}</div>` : `<div class="dashboard-social-quiet-v314dz17"><span>♡</span><div><strong>Nothing waiting right now.</strong><small>Messages and little moments will appear here when something actually arrives.</small></div></div>`;
  }

  function openSkillGuide(id) {
    const def = skills.getSkill(id);
    if (!def) return;
    const info = skills.getLevelInfo(id);
    const remaining = Math.max(0, Number(info.required||0)-Number(info.intoLevel||0));
    const dialog = document.getElementById("dashboardSkillGuideV314dz17");
    const title = document.getElementById("dashboardSkillGuideTitleV314dz17");
    const body = document.getElementById("dashboardSkillGuideBodyV314dz17");
    if (!dialog || !body || !title) return;
    title.textContent = def.label;
    const actions = ACTIONS[id] || [];
    body.innerHTML = `<section class="dashboard-skill-guide-progress-v314dz17"><div><span>${def.icon}</span><div><small>${esc(def.realm)} · LEVEL ${info.level}</small><strong>${formatXp(info.intoLevel)} / ${formatXp(info.required)} Skill XP</strong><p>${formatXp(remaining)} XP until the next level and its Talent Point.</p></div></div><i><b style="width:${Number(info.percent||0).toFixed(2)}%"></b></i></section><section class="dashboard-skill-actions-v314dz17"><p class="eyebrow">WAYS TO TRAIN THIS</p>${actions.map((item,index)=>`<button type="button" data-dashboard-skill-action="${index}"><span>${item.icon}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></div><b>›</b></button>`).join("") || `<p class="muted">Open the Skills page to see the practices Life RPG currently maps to this Skill.</p>`}</section><button type="button" class="secondary-button" data-dashboard-open-skills>Open full Skill Trees →</button>`;
    dialog.dataset.skillId = id;
    if (!dialog.open) dialog.showModal?.();
  }

  function openJourneyDialog() {
    const dialog = document.getElementById("dashboardJourneyPointV314dz17");
    const body = document.getElementById("dashboardJourneyPointBodyV314dz17");
    if (!dialog || !body) return;
    const available = availableJourneyLevels();
    const next = available[0];
    body.innerHTML = available.length ? `<p class="dashboard-journey-copy-v314dz17">Next unassigned reward: <strong>Level ${next} Journey Point</strong>. Choose the Realm where you want one additional Talent Point.</p>${Object.entries(REALMS).map(([realm,meta])=>{const points=skills.getRealmPoints(realm);return `<button type="button" data-dashboard-journey-realm="${esc(realm)}"><span>${meta.icon}</span><div><strong>${esc(meta.label)}</strong><small>${points.available} currently available · ${points.spent} spent</small></div><b>+1 ›</b></button>`;}).join("")}` : `<p class="muted">No unassigned Journey Points right now.</p>`;
    if (!dialog.open) dialog.showModal?.();
  }

  function openWeekLog() {
    app.showView?.("week");
    window.setTimeout(() => document.querySelector('[data-week-mode="log"]')?.click(), 80);
  }

  function openSkillsRealm(realm) {
    skills.open?.();
    window.setTimeout(() => skills.selectTalentRealm?.(realm), 60);
  }

  function runSkillAction(index) {
    const dialog = document.getElementById("dashboardSkillGuideV314dz17");
    const id = dialog?.dataset.skillId;
    const item = ACTIONS[id]?.[Number(index)];
    if (!item) return;
    dialog.close?.();
    try { item.run?.(); } catch (_) { skills.open?.(); }
  }

  function pointsFromSkillLevel(level) {
    const l = Math.max(1, Math.floor(Number(level || 1)));
    return Math.max(0, l - 1) + Math.floor(l / 5);
  }

  function formatXp(value) {
    const n = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function render() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      if (!ensureLayout()) return;
      renderSkillMomentum();
      renderCharacterMilestone();
      renderUtilities();
    }, 45);
  }

  function bind() {
    document.addEventListener("click", event => {
      const skill = event.target.closest?.("[data-dashboard-skill]");
      if (skill) { openSkillGuide(skill.dataset.dashboardSkill); return; }
      if (event.target.closest?.("[data-dashboard-skill-close]")) { document.getElementById("dashboardSkillGuideV314dz17")?.close?.(); return; }
      const actionButton = event.target.closest?.("[data-dashboard-skill-action]");
      if (actionButton) { runSkillAction(actionButton.dataset.dashboardSkillAction); return; }
      if (event.target.closest?.("[data-dashboard-open-skills]")) { document.getElementById("dashboardSkillGuideV314dz17")?.close?.(); skills.open?.(); return; }
      const realm = event.target.closest?.("[data-dashboard-realm]");
      if (realm) { openSkillsRealm(realm.dataset.dashboardRealm); return; }
      if (event.target.closest?.("[data-dashboard-journey-open]")) { openJourneyDialog(); return; }
      if (event.target.closest?.("[data-dashboard-journey-close]")) { document.getElementById("dashboardJourneyPointV314dz17")?.close?.(); return; }
      const journeyRealm = event.target.closest?.("[data-dashboard-journey-realm]");
      if (journeyRealm) { if (assignJourneyPoint(journeyRealm.dataset.dashboardJourneyRealm)) openJourneyDialog(); return; }
      if (event.target.closest?.("[data-dashboard-phone]")) { window.LifeRPGStoryUI?.openPhone?.(); return; }
      const moment = event.target.closest?.("[data-dashboard-delivery-moment]");
      if (moment) { window.LifeRPGSocialDelivery?.openMoment?.(moment.dataset.dashboardDeliveryMoment); return; }
      if (event.target.closest?.("[data-dashboard-everyday]")) { window.LifeRPGLivingWorldV3?.open?.(); return; }
    });

    ["life-rpg:state-saved", "life-rpg:render", "life-rpg:talent-content-v2-change", "life-rpg:everyday-moment-complete", "life-rpg:companion-v2-complete"].forEach(name => window.addEventListener(name, render));
  }

  function observeDynamicCards() {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node?.id === "lifeQuickDashboardCard" || node?.id === "talentV3Library" || node?.id === "companionMomentsV2Card"))) render();
    });
    mutationObserver.observe(document.body, { childList:true, subtree:true });
  }

  function init() {
    milestoneState();
    ensureLayout();
    bind();
    observeDynamicCards();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();

  window.LifeRPGDashboardV2 = { version:VERSION, render, openSkillGuide, assignJourneyPoint, getJourneyState:() => JSON.parse(JSON.stringify(milestoneState({persist:false}))) };
})();
