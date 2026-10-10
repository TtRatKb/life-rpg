(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) {
    console.error("Life RPG Skills could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const VERSION = "0.31.4dz33";
  const SCHEMA = 1;
  const MAX_EVENTS = 6000;
  const HABIT_XP = { tiny: 3, low: 5, normal: 8, high: 12, boss: 18 };

  const REALMS = {
    Work: { icon: "📎", label: "Work" },
    Knowledge: { icon: "📚", label: "Knowledge" },
    Japanese: { icon: "🌸", label: "Japanese" },
    Health: { icon: "🌱", label: "Health" },
    Recovery: { icon: "🛋️", label: "Recovery" },
    Home: { icon: "🏠", label: "Home" },
    Hobbies: { icon: "🎨", label: "Hobbies" }
  };

  const SKILLS = [
    skill("teaching-facilitation", "Teaching & Facilitation", "Work", "🧑‍🏫", "Teaching, substitution and future facilitation practice."),
    skill("lesson-design-preparation", "Lesson Design & Preparation", "Work", "🗂️", "Designing lessons and preparing concrete teaching work."),
    skill("assessment-feedback", "Assessment & Feedback", "Work", "Assessment", "Assessing work, corrections and feedback practice."),
    skill("professional-organization", "Professional Organization", "Work", "📋", "Meetings, school administration and keeping work systems usable."),
    skill("focus-concentration", "Focus & Concentration", "Work", "🎯", "Deliberate deep-focus practice rather than generic time spent working."),

    skill("logical-pattern-reasoning", "Logical & Pattern Reasoning", "Knowledge", "🧩", "Deduction, patterns and structured logic across different activities."),
    skill("quantitative-reasoning", "Quantitative Reasoning", "Knowledge", "🔢", "Flexible reasoning with quantities, estimation and numbers."),
    skill("memory-recall", "Memory & Recall", "Knowledge", "🧠", "Holding, retrieving and rebuilding information from memory."),
    skill("language-expression", "Language & Expression", "Knowledge", "⌗", "Vocabulary, precise language and expressive range."),
    skill("learning-inquiry", "Learning & Inquiry", "Knowledge", "🔎", "Studying, researching, explaining and following real curiosity."),

    skill("language-learning", "Japanese Foundations", "Japanese", "あ", "Your existing broad Japanese practice and legacy progress stay here."),
    skill("japanese-vocabulary-kanji", "Vocabulary & Kanji", "Japanese", "語", "Words, meanings, readings and kanji recognition through real Japanese study."),
    skill("japanese-grammar-particles", "Grammar & Particles", "Japanese", "文", "Grammar patterns, particles and sentence structure."),
    skill("japanese-listening-comprehension", "Listening & Comprehension", "Japanese", "耳", "Understanding spoken Japanese in reviews and real media."),
    skill("japanese-reading-mining", "Reading & Comprehension", "Japanese", "読", "Reading Japanese in books, subtitles and contextual sentences."),
    skill("japanese-speaking-production", "Speaking & Production", "Japanese", "話", "Active recall, sentence production, shadowing and spoken output."),

    skill("movement-body-care", "Movement & Body Care", "Health", "🤸", "Walking, mobility, stretching, yoga and gentle physical care."),
    skill("physical-vitality", "Physical Vitality", "Health", "🏋️", "Workout, gym and sport practice when it genuinely happens."),
    skill("personal-care", "Personal Care", "Health", "🫧", "Skincare, hair care and other intentional care routines."),
    skill("reflection-self-awareness", "Reflection & Self-Awareness", "Health", "🌙", "Checking in, noticing patterns and reflecting without turning it into a grade."),

    skill("recovery-regulation", "Recovery & Regulation", "Recovery", "🌿", "Breathing, body scans, grounding and deliberate nervous-system down-regulation."),
    skill("recovery-rest", "Rest & Recharging", "Recovery", "☾", "Quiet breaks, restorative pauses and genuinely protecting rest."),
    skill("recovery-unwinding", "Leisure & Unwinding", "Recovery", "🫖", "Intentional work-free leisure: a cozy game, anime or music to wind down."),

    skill("life-management", "Life Management", "Home", "🗂️", "Paperwork, appointments, personal administration and life logistics."),
    skill("home-tidying", "Tidying & Organisation", "Home", "🧹", "Decluttering, room resets and creating usable living/work spaces."),
    skill("home-routines", "Household Routines", "Home", "🧺", "Laundry, dishes, groceries and repeatable daily household maintenance."),

    skill("creative-expression", "Creative Expression", "Hobbies", "✍️", "Turning ideas into creative output across media."),
    skill("craft-making", "Craft & Making", "Hobbies", "🧶", "Making physical things and building hands-on craft practice."),
    skill("style-visual-design", "Style & Visual Design", "Hobbies", "💄", "Styling, makeup, hair and intentional visual design."),
    skill("recreation-play", "Recreation & Play", "Hobbies", "🎮", "Making real room for play, leisure and for-fun reading."),
  ];

  const SKILL_BY_ID = Object.fromEntries(SKILLS.map(item => [item.id, item]));
  const SKILLS_BY_REALM = Object.fromEntries(Object.keys(REALMS).map(realm => [realm, SKILLS.filter(item => item.realm === realm)]));

  const TRAINING_ACTIONS = {
    "teaching-facilitation": [
      trainingAction("🧑‍🏫", "Unterricht / Vertretung", "Öffne Meine Woche und erfasse einen tatsächlich gehaltenen Unterrichtsblock.", () => openWeekLog(), "guided"),
      trainingAction("✦", "School Moments", "Kurze Teaching-Life-Entscheidungen, wenn der Talent-Unlock bereits da ist.", () => window.LifeRPGTalentV3?.open?.("school-moments"), "native")
    ],
    "lesson-design-preparation": [
      trainingAction("↗", "Schulcockpit · Unterrichtsplanung", "Gespeicherte und abgeschlossene Unterrichtsplanungen werden diesem Skill einmalig zugeordnet.", () => window.LifeRPGWorkBridge?.open?.(), "linked"),
      trainingAction("🗂️", "Unterricht vorbereiten", "Logge echte Vorbereitungszeit in Meine Woche.", () => openWeekLog(), "guided"),
      trainingAction("🎯", "Focus-Block starten", "Ein echter Vorbereitungsblock trainiert den Skill über die geloggte Zeit.", () => window.LifeRPGTime?.startFocus?.({ categoryId:"work_home", subcategory:"Preparation", label:"Lesson preparation", minutes:35 }), "guided")
    ],
    "assessment-feedback": [
      trainingAction("↗", "Schulcockpit · Reflexion & Analyse", "Abgeschlossene Unterrichtsreflexionen und Prüfungsanalysen trainieren Assessment & Feedback.", () => window.LifeRPGWorkBridge?.open?.(), "linked"),
      trainingAction("✓", "Korrekturen loggen", "Öffne Meine Woche und erfasse echte Korrekturzeit.", () => openWeekLog(), "guided"),
      trainingAction("🎯", "Correction Focus", "Starte einen konzentrierten Korrekturblock.", () => window.LifeRPGTime?.startFocus?.({ categoryId:"work_home", subcategory:"Corrections", label:"Assessment & feedback", minutes:35 }), "guided")
    ],
    "professional-organization": [
      trainingAction("↗", "Schulcockpit · Materialorganisation", "Abgeschlossene Material- und Druckvorbereitung zählt als Professional Organization.", () => window.LifeRPGWorkBridge?.open?.(), "linked"),
      trainingAction("🧾", "Work Deep Brief", "Eine kurze native Work-Reflexion direkt in Life RPG schreiben und speichern.", () => window.LifeRPGTalentContentV2?.open?.("work-debrief"), "native"),
      trainingAction("📋", "Schulorganisation", "Konferenzen, Administration und echte Orga-Zeit in Meine Woche erfassen.", () => openWeekLog(), "guided"),
      trainingAction("🗓️", "Meine Woche", "Öffne deinen Wochenplan und logge reale Organisationsarbeit.", () => app.showView?.("week"))
    ],
    "focus-concentration": [
      trainingAction("🎯", "Focus Timer", "Starte einen echten Deep-Work-Block.", () => window.LifeRPGTime?.startFocus?.({ categoryId:"focus", subcategory:"Deep work", label:"Focused work", minutes:35 }), "guided"),
      trainingAction("▦", "Meine Woche", "Sieh echte Arbeitszeit und vorhandene Focus-Blöcke.", () => app.showView?.("week"))
    ],
    "logical-pattern-reasoning": [
      trainingAction("🧩", "Sudoku", "Deduktion und Mustererkennung.", () => window.LifeRPGSudoku?.open?.(), "native"),
      trainingAction("◩", "Nonogram", "Bildlogik und systematisches Ausschließen.", () => window.LifeRPGNonogram?.open?.(), "native"),
      trainingAction("01", "Takuzu", "Binäre Logik, wenn der Unlock bereits da ist.", () => window.LifeRPGTalentV3?.open?.("takuzu"), "native")
    ],
    "quantitative-reasoning": [
      trainingAction("🔢", "Number Sense", "Kurze native Zahlen- und Schätzaufgaben.", () => window.LifeRPGNumberSense?.open?.(), "native"),
      trainingAction("📚", "Knowledge Workshop", "Mathematische Notizen oder Erklärungen vertiefen.", () => window.LifeRPGKnowledgeWorkshop?.open?.())
    ],
    "memory-recall": [
      trainingAction("🧠", "Recall Drill", "3–5 ältere Garden-Notizen oder bekannte Fachwörter aktiv abrufen.", () => window.LifeRPGKnowledgePractice?.open?.("recall"), "native"),
      trainingAction("🧠", "Memory Garden", "Arbeitsgedächtnis und Abruf trainieren.", () => window.LifeRPGMemoryGarden?.open?.(), "native"),
      trainingAction("📚", "Knowledge Workshop", "Wissen aus eigenen Notizen wieder aufbauen.", () => window.LifeRPGKnowledgeWorkshop?.open?.())
    ],
    "language-expression": [
      trainingAction("⌗", "Lexicon Lab", "Wortschatz, Ausdruck und adaptive Crosswords.", () => window.LifeRPGLexiconLab?.open?.(), "native"),
      trainingAction("✍️", "Journal", "Längere eigene Formulierungen trainieren Ausdruck.", () => app.showView?.("journal"))
    ],
    "learning-inquiry": [
      trainingAction("✦", "Explain It Back", "Einen gespeicherten Gedanken selbst erklären und mit der Quelle vergleichen.", () => window.LifeRPGKnowledgePractice?.open?.("explain"), "native"),
      trainingAction("🔎", "Knowledge Workshop", "Eine echte Frage recherchieren, erklären oder verknüpfen.", () => window.LifeRPGKnowledgeWorkshop?.open?.()),
      trainingAction("📖", "Library", "Lesen und daraus etwas festhalten.", () => app.showView?.("library"))
    ],
    "language-learning": [
      trainingAction("🌸", "Kotoba Quick · mixed", "Breite Japanese-Praxis. Deine bisherigen allgemeinen Japanese-XP bleiben in diesem Foundations-Skill.", () => window.LifeRPGKotobaQuickTraining?.startQuick?.(), "native"),
      trainingAction("⚔", "Kotoba Dungeon", "Gemischte Wiederholung im Dungeon. Synchronisierte Siege trainieren Japanese Foundations.", () => window.open?.(window.LifeRPGKotobaDungeonBridge?.link?.() || "https://ttratkb.github.io/kotoba-quest/dungeon.html", "_blank", "noopener"), "linked"),
      trainingAction("🎮", "Japanese Games", "Spiele, die du in der Games Library als Japanese markiert hast, trainieren die breite Foundation.", () => app.showView?.("games")),
      trainingAction("📚", "Japanese Library", "Breite Japanese-Leseaktivität bleibt ebenfalls als Foundations-Praxis verfügbar.", () => app.showView?.("library"))
    ],
    "japanese-vocabulary-kanji": [
      trainingAction("語", "Kotoba Quick", "Neue bestätigte Vocabulary-Reviews aus Kotoba werden diesem Skill zugeordnet.", () => window.LifeRPGKotobaQuickTraining?.startQuick?.(), "native"),
      trainingAction("⛏", "Vocabulary Mining", "Öffne deine Japanese Practice Library. Neue Mining-Sessions trainieren Vocabulary & Kanji gezielt.", () => openJapanesePractice("mining"))
    ],
    "japanese-grammar-particles": [
      trainingAction("文", "Kotoba Quick", "Bestätigte Grammar- und Particle-Reviews trainieren gezielt diesen Skill.", () => window.LifeRPGKotobaQuickTraining?.startQuick?.(), "native"),
      trainingAction("🌸", "Kotoba Status", "Sieh direkt, wie viele Grammar- und Particle-Reviews gerade fällig sind.", () => openKotobaPanel())
    ],
    "japanese-listening-comprehension": [
      trainingAction("耳", "Listening Practice", "Starte ein gespeichertes Anime-/Video-/Podcast-Material aus deiner Japanese Practice Library.", () => openJapanesePractice("listening")),
      trainingAction("🌸", "Kotoba Quick", "Listening-Runden aus bestätigten Kotoba-Reviews zählen ebenfalls hier.", () => window.LifeRPGKotobaQuickTraining?.startQuick?.(), "native")
    ],
    "japanese-reading-mining": [
      trainingAction("📖", "Japanese Reading", "Japanisch markierte Bücher und tatsächlich geloggte Seiten trainieren Reading. Kotoba-Story-Kapitel zählen erst, wenn Kotoba dafür echte Lese-Abschlussereignisse liefert.", () => app.showView?.("library")),
      trainingAction("✿", "Reading / Subtitle Habit", "Lege z. B. einen Manga-, NHK- oder Untertitel-Habit an und ordne ihn diesem Skill zu.", () => openHabitForSkill("japanese-reading-mining"))
    ],
    "japanese-speaking-production": [
      trainingAction("話", "Kotoba · produktive Antworten", "Nur echte japanische Eigenproduktion (z. B. Deutsch → Japanisch) zählt als Production; einfache Wiedererkennung ist kein Speaking.", () => window.LifeRPGKotobaQuickTraining?.startQuick?.(), "linked"),
      trainingAction("✿", "Eigene Sprechpraxis", "Ein Habit für tatsächlich laut gesprochene Sätze oder Konversation. Echtes Audio-Shadowing folgt erst mit einem Kotoba-Abschlussereignis.", () => openHabitForSkill("japanese-speaking-production"), "guided")
    ],
    "movement-body-care": [
      trainingAction("🤸", "Guided Stretch", "Kurze angeleitete Bewegung statt einer offenen Aufgabe.", () => window.LifeRPGRecoveryStudio?.start?.("stretch10"), "native"),
      trainingAction("◷", "Bewegung loggen", "Echte Bewegungszeit im Zeitlog erfassen.", () => app.showView?.("rhythm"), "guided")
    ],
    "physical-vitality": [
      trainingAction("🏋️", "Health Quest / Habit", "Gym, Workout oder Sport über passende Quests oder Habits.", () => app.showView?.("quests")),
      trainingAction("✿", "Habits", "Ein Workout-Habit kann direkt diesem Skill zugeordnet werden.", () => app.showView?.("habits"))
    ],
    "personal-care": [
      trainingAction("🫧", "Habits", "Pflege-Habits zählen, wenn du sie diesem Skill zuordnest.", () => app.showView?.("habits"))
    ],
    "reflection-self-awareness": [
      trainingAction("🌙", "Daily Check-in", "Der tägliche Check-in trainiert Selbstwahrnehmung.", () => document.getElementById("dailyBriefingStart")?.click(), "native"),
      trainingAction("✍️", "Journal", "Reflexionen und Wochenrückblicke vertiefen den Skill.", () => app.showView?.("journal"))
    ],
    "recovery-regulation": [
      trainingAction("🌿", "Recovery Studio · Atem & Body Scan", "Echte Atmung, Body Scan und Grounding-Sessions trainieren Regulation.", () => window.LifeRPGRecoveryStudio?.open?.(), "native"),
      trainingAction("◷", "Ruhige Regulation loggen", "Echte Zeit für Atmung, Meditation oder bewusste Regulation erfassen.", () => app.showView?.("rhythm"), "guided")
    ],
    "recovery-rest": [
      trainingAction("☾", "15-Minute Lie Down", "Eine echte, ruhige Erholungssession im Recovery Studio absolvieren.", () => window.LifeRPGRecoveryStudio?.start?.("lieDown15"), "native"),
      trainingAction("◷", "Pause / Ruhe loggen", "Tatsächlich eingelegte Pause (Recovery → Rest oder Break) mit dem Zeitlog erfassen.", () => app.showView?.("rhythm"), "guided")
    ],
    "recovery-unwinding": [
      trainingAction("🫖", "Feierabend-Stoppuhr", "Bewusst für dich spielen, Anime schauen oder Musik hören: kein Produktivitätsziel, einfach wirklich entspannen.", () => window.LifeRPGTime?.startClock?.({ categoryId: "recovery", subcategory: "Other recovery", label: "Intentional unwind · leisure" }), "guided"),
      trainingAction("✿", "Unwinding-Habit", "Ein freiwilliges Habit für gezielte Auszeit statt noch mehr Aufgaben.", () => openHabitForSkill("recovery-unwinding"), "guided")
    ],
    "life-management": [
      trainingAction("🗂️", "Lebensorganisation loggen", "Papierkram, Termine und Besorgungen als echte Arbeit für den Alltag erfassen.", () => app.showView?.("rhythm"), "guided"),
      trainingAction("▦", "Meine Woche", "Termine und deine tatsächliche Organisationszeit im Blick behalten.", () => app.showView?.("week"))
    ],
    "home-tidying": [
      trainingAction("🧹", "10-Minute Clean", "Starte eine echte Aufräum-Session; auch 5 Minuten freie Stoppuhr zählen als Übung.", () => window.LifeRPGTime?.startClock?.({ categoryId: "life_admin", subcategory: "Household", label: "Home reset · 10-Minute Clean" }), "guided"),
      trainingAction("✿", "Aufräum-Quest / Habit", "Regelmäßige Zimmer-Resets, Putzen und Ordnung auch über die bestehende Quest-Habit-Verknüpfung.", () => app.showView?.("quests"))
    ],
    "home-routines": [
      trainingAction("🧺", "Haushalt schnell loggen", "Wäsche, Spülmaschine, Einkäufe und echte Routinen einmalig erfassen.", () => window.LifeRPGLifeHub?.open?.(), "native"),
      trainingAction("◷", "Haushaltszeit loggen", "Z. B. Wäsche machen oder Haushaltsarbeiten als Life/Admin → Household loggen.", () => app.showView?.("rhythm"), "guided")
    ],
    "creative-expression": [
      trainingAction("✍️", "Drawing Studio", "Zeichnen und kreative Challenges trainieren den Skill.", () => window.LifeRPGCreativeHub?.enter?.("drawing"), "native"),
      trainingAction("📝", "Adventure", "Ein konkretes kreatives Projekt weiterführen.", () => app.showView?.("adventures"))
    ],
    "craft-making": [
      trainingAction("🧶", "Adventures", "Ein reales Craft-/DIY-Projekt als Adventure weiterführen.", () => app.showView?.("adventures")),
      trainingAction("◷", "Craft-Zeit loggen", "Hands-on-Zeit als echte Hobby-Aktivität erfassen.", () => app.showView?.("rhythm"), "guided")
    ],
    "style-visual-design": [
      trainingAction("◈", "Palette Atelier", "Farbtraining, wenn der Unlock bereits da ist.", () => window.LifeRPGTalentV3?.open?.("palette-atelier"), "native"),
      trainingAction("💄", "Style-Habit", "Makeup/Hair/Styling-Habits können diesem Skill zugeordnet werden.", () => app.showView?.("habits"))
    ],
    "recreation-play": [
      trainingAction("🎮", "Games", "Spielen zählt als echte Recreation.", () => app.showView?.("games")),
      trainingAction("📖", "Library", "For-fun Reading trainiert Recreation & Play.", () => app.showView?.("library")),
      trainingAction("🎨", "Coloring Studio", "Freies Ausmalen ist ebenfalls legitime Spiel-/Hobbyzeit.", () => window.LifeRPGCreativeHub?.enter?.("coloring"))
    ]
  };

  let initialized = false;
  let syncing = false;
  let syncTimer = null;
  let lastDerivedSignature = "";
  let activeTalentRealm = "Knowledge";
  let activeTalentSkillId = null;
  let treeDecoratorTimer = null;
  let treeDecoratorBusy = false;
  let treeObserver = null;
  const FEEDBACK_RECENCY_MS = 20 * 60 * 1000;
  const FEEDBACK_MAX_PENDING = 24;
  let skillFeedbackQueue = [];
  let feedbackTimer = null;
  let feedbackCurrent = null;
  let feedbackRenderKey = "";
  let feedbackPositionObserver = null;


  init();

  function skill(id, label, realm, icon, description) {
    return { id, label, realm, icon, description };
  }

  function init() {
    ensureState();
    const japaneseSplitCreated = ensureJapaneseSkillSplitMigration();
    const homeRecoverySplitCreated = ensureHomeRecoverySkillSplitMigration();
    injectNavigation();
    injectSkillsView();
    ensureTrainingDialog();
    ensureSkillFeedbackUI();
    injectHabitSkillField();
    observeTalentTrees();
    bind();
    // A rebuild already persists the migration alongside derived Skill XP.
    // Avoid two full-save writes during startup on large DZ30/DZ31 saves.
    const rebuilt = reconcile({ persist: true, reason: "skills-init" });
    if (!rebuilt && (japaneseSplitCreated || homeRecoverySplitCreated)) {
      app.saveState({ source: "skills-taxonomy-migration", suppressUiRefresh: true });
    }
    bootstrapSkillFeedback();
    render();
    initialized = true;
  }

  function ensureState() {
    const root = app.getState();
    if (!root.skills || typeof root.skills !== "object" || Array.isArray(root.skills)) {
      root.skills = defaults();
    }
    const model = root.skills;
    model.schemaVersion = SCHEMA;
    model.version = VERSION;
    if (!Array.isArray(model.events)) model.events = [];
    if (!model.spentPointsByRealm || typeof model.spentPointsByRealm !== "object" || Array.isArray(model.spentPointsByRealm)) model.spentPointsByRealm = {};
    if (!model.realmBonusPoints || typeof model.realmBonusPoints !== "object" || Array.isArray(model.realmBonusPoints)) model.realmBonusPoints = {};
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) model.migrations = {};
    Object.keys(REALMS).forEach(realm => {
      model.spentPointsByRealm[realm] = Math.max(0, Number(model.spentPointsByRealm[realm] || 0));
      model.realmBonusPoints[realm] = Math.max(0, Number(model.realmBonusPoints[realm] || 0));
    });
    model.migrations.derivedLocalPracticeV1 = true;
    return model;
  }

  function ensureJapaneseSkillSplitMigration() {
    const model = state();
    if (Number(model.migrations?.japaneseSkillSplitV1At || 0) > 0) return false;
    model.migrations.japaneseSkillSplitV1At = Date.now();
    return true;
  }

  // Only new real-world activity is classified into the expanded Home/Recovery
  // specializations. All historical derived XP remains in the original Skills,
  // preserving earned levels and Talent Points without copying event histories.
  function ensureHomeRecoverySkillSplitMigration() {
    const model = state();
    if (Number(model.migrations?.homeRecoverySkillSplitV1At || 0) > 0) return false;
    model.migrations.homeRecoverySkillSplitV1At = Date.now();
    return true;
  }

  function specializedHomeRecoverySkill(oldId, newId, at) {
    const split = Number(state().migrations?.homeRecoverySkillSplitV1At || 0);
    const when = timestamp(at);
    return split && when >= split ? newId : oldId;
  }

  function japaneseSkillSplitAt() {
    return Math.max(0, Number(state().migrations?.japaneseSkillSplitV1At || 0));
  }

  function useSpecializedJapaneseSkills(at) {
    const split = japaneseSkillSplitAt();
    const when = timestamp(at);
    return Boolean(split && when && when >= split);
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      events: [],
      spentPointsByRealm: {},
      realmBonusPoints: {},
      migrations: { derivedLocalPracticeV1: true }
    };
  }

  function state() { return ensureState(); }

  function bind() {
    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-skills-open]");
      if (open) {
        event.preventDefault();
        reconcile({ persist: true, reason: "skills-open" });
        openSkillsView();
        render();
        return;
      }

      const map = event.target.closest?.("[data-skill-map-save]");
      if (map) {
        event.preventDefault();
        saveHabitMapping(map.dataset.skillMapSave);
        return;
      }

      const suggestAll = event.target.closest?.("[data-skill-map-suggest-all]");
      if (suggestAll) {
        event.preventDefault();
        applyHabitSuggestionsToForm();
        return;
      }

      const talentTab = event.target.closest?.("[data-skill-tree-tab]");
      if (talentTab) {
        event.preventDefault();
        selectTalentRealm(talentTab.dataset.skillTreeTab);
        return;
      }

      const treeSkill = event.target.closest?.("[data-talent-skill-select]");
      if (treeSkill) {
        event.preventDefault();
        const skillId = treeSkill.dataset.talentSkillSelect || "";
        if (SKILL_BY_ID[skillId]?.realm === activeTalentRealm) {
          activeTalentSkillId = skillId;
          renderTalentSkillRail(totalsBySkill());
        }
        return;
      }

      const trainSkill = event.target.closest?.("[data-skill-train]");
      if (trainSkill) {
        event.preventDefault();
        openTrainingGuide(trainSkill.dataset.skillTrain);
        return;
      }

      const trainAction = event.target.closest?.("[data-skill-training-action]");
      if (trainAction) {
        event.preventDefault();
        runTrainingAction(trainAction.dataset.skillTrainingAction, trainAction.dataset.skillTrainingSkill || "");
        return;
      }

      if (event.target.closest?.("[data-skill-training-close]")) {
        event.preventDefault();
        document.getElementById("skillTrainingDialogV314dz20")?.close?.();
        return;
      }

      const feedbackButton = event.target.closest?.("[data-skill-feedback-action]");
      if (feedbackButton) {
        event.preventDefault();
        acknowledgeSkillFeedback(feedbackButton.dataset.skillFeedbackAction);
        return;
      }

      const rebuild = event.target.closest?.("[data-skills-rebuild]");
      if (rebuild) {
        event.preventDefault();
        reconcile({ persist: true, reason: "skills-manual-rebuild", force: true });
        render();
        app.showToast?.("Skills rebuilt from your current local Life RPG logs.");
      }
    });

    document.addEventListener("keydown", event => {
      const tab = event.target.closest?.("#skillsTalentTabs [data-skill-tree-tab]");
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...document.querySelectorAll("#skillsTalentTabs [data-skill-tree-tab]")];
      if (!tabs.length) return;
      event.preventDefault();
      const current = Math.max(0, tabs.indexOf(tab));
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? tabs.length - 1
        : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length
        : (current + 1) % tabs.length;
      const next = tabs[nextIndex];
      selectTalentRealm(next.dataset.skillTreeTab, { scroll: false });
      next.focus();
    });

    document.addEventListener("click", event => {
      const habitAction = event.target.closest?.("[data-habit-edit], #addHabitButton, #addHabitButtonSecondary, #habitEmptyCreate");
      if (!habitAction) return;
      window.setTimeout(syncHabitDialogFromCurrent, 0);
    }, true);

    const habitForm = document.getElementById("habitForm");
    habitForm?.addEventListener("submit", captureHabitSkillBeforeSave, true);
    document.getElementById("habitRealm")?.addEventListener("change", () => refreshHabitSkillOptions({ keepCurrent: true }));
    document.getElementById("habitName")?.addEventListener("blur", () => suggestHabitSkillIfEmpty());

    window.addEventListener("life-rpg:state-saved", () => {
      if (syncing) return;
      scheduleReconcile("state-save");
    });
    window.addEventListener("life-rpg:render", () => {
      if (!initialized || syncing) return;
      scheduleReconcile("render");
      render();
    });
    ["life-rpg:time-change", "life-rpg:game-change", "life-rpg:library-change", "life-rpg:adventure-change", "life-rpg:smart-quest-change", "life-rpg:school-completions-ingested"].forEach(name => {
      window.addEventListener(name, () => scheduleReconcile(name));
    });
  }

  function scheduleReconcile(reason) {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => reconcile({ persist: true, reason }), 90);
  }

  function reconcile({ persist = false, reason = "skills-reconcile", force = false } = {}) {
    if (syncing) return false;
    syncing = true;
    try {
      const model = state();
      const nextEvents = deriveEvents().slice(-MAX_EVENTS);
      const signature = eventSignature(nextEvents);
      const changed = force || signature !== lastDerivedSignature || !eventsEquivalent(model.events, nextEvents);
      if (!changed) return false;
      const beforeEvents = model.events.slice();
      model.events = nextEvents;
      captureSkillFeedback(beforeEvents, nextEvents, reason);
      model.lastRebuiltAt = Date.now();
      model.lastRebuildReason = reason;
      lastDerivedSignature = signature;
      if (persist) app.saveState({ source: reason });
      render();
      return true;
    } finally {
      syncing = false;
    }
  }

  function deriveEvents() {
    const root = app.getState();
    const events = [];
    const claimedRewardIds = new Set();
    const timeEntries = Array.isArray(root.timeTracking?.entries) ? root.timeTracking.entries : [];

    // Time is canonical for any timed practice, including linked Quests and Adventures.
    timeEntries.forEach(entry => {
      const skillId = skillForTimeEntry(entry);
      if (!skillId) return;
      const minutes = preciseMinutes(entry);
      addDerived(events, {
        id: `time:${entry.id}`,
        skillId,
        xp: timeXp(minutes),
        label: entry.label || timeLabel(entry),
        source: "time",
        sourceId: entry.id,
        at: entry.endAt || entry.startAt || entry.createdAt,
        metadata: { minutes: round2(minutes), categoryId: entry.categoryId || "", subcategory: entry.subcategory || "", linkedQuestId: entry.linkedQuestId || null, linkedAdventureId: entry.linkedAdventureId || null }
      });
    });

    // Native activities are canonical through their own reward event. Their normal
    // Character/Realm reward may have streak/diminishing modifiers; Skill XP never does.
    (root.rewardLedger?.events || []).forEach(reward => {
      if (!reward || reward.duplicate) return;
      const native = skillForRewardEvent(reward);
      if (!native) return;
      if (reward.id) claimedRewardIds.add(reward.id);
      addDerived(events, {
        id: `reward:${reward.id || `${reward.source}:${reward.sourceId || reward.at}`}`,
        skillId: native.skillId,
        xp: native.xp,
        label: reward.label || native.label,
        source: native.source || reward.source || "native",
        sourceId: reward.sourceId || reward.id,
        at: reward.at,
        metadata: { rewardEventId: reward.id || null, nativeSource: reward.source || "" }
      });
    });

    // Habits are explicit user-owned practice. Unmapped habits intentionally earn no Skill XP.
    const habits = Array.isArray(root.habits?.items) ? root.habits.items : [];
    const habitById = Object.fromEntries(habits.map(item => [item.id, item]));
    (root.habits?.completions || []).forEach(log => {
      const habit = habitById[log?.habitId];
      const skillId = validSkillId(habit?.skillId);
      if (!habit || !skillId) return;
      addDerived(events, {
        id: `habit:${log.id || `${habit.id}:${log.date || log.timestamp}`}`,
        skillId,
        xp: HABIT_XP[habit.effort] || HABIT_XP.low,
        label: habit.name,
        source: "habit",
        sourceId: log.id || `${habit.id}:${log.date || ""}`,
        at: log.timestamp || dateAtNoon(log.date),
        metadata: { habitId: habit.id, effort: habit.effort || "low" }
      });
      if (log.rewardEventId) claimedRewardIds.add(log.rewardEventId);
    });

    // Daily check-in is itself a small reflection practice.
    Object.entries(root.dailyPlanner?.days || {}).forEach(([date, day]) => {
      if (!day?.checkIn) return;
      addDerived(events, {
        id: `checkin:${date}`,
        skillId: "reflection-self-awareness",
        xp: 5,
        label: "Daily Check-in",
        source: "daily-checkin",
        sourceId: date,
        at: day.updatedAt || day.createdAt || dateAtNoon(date),
        metadata: { date }
      });
      if (day.checkInReward?.eventId) claimedRewardIds.add(day.checkInReward.eventId);
    });

    // Each written reflection is independent. No shared daily character pool.
    Object.entries(root.journal?.entries || {}).forEach(([date, entry]) => {
      [
        ["gratitude", "Gratitude reflection"],
        ["smallWin", "Small-win reflection"],
        ["hardThing", "Hard-thing reflection"]
      ].forEach(([field, label]) => {
        const chars = String(entry?.[field] || "").trim().length;
        if (!chars) return;
        addDerived(events, {
          id: `journal:${date}:${field}`,
          skillId: "reflection-self-awareness",
          xp: reflectionXp(chars),
          label,
          source: "journal-reflection",
          sourceId: `${date}:${field}`,
          at: entry.updatedAt || entry.createdAt || dateAtNoon(date),
          metadata: { date, field, characters: chars }
        });
      });
    });

    // Library reading logs. Role determines purpose; Work-role reading stays unassigned
    // because it does not tell us which concrete Work skill was practised.
    const books = Array.isArray(root.bookLibrary?.items) ? root.bookLibrary.items : [];
    const bookById = Object.fromEntries(books.map(item => [item.id, item]));
    const readingTimeEntries = timeEntries.filter(entry => entry.categoryId === "reading");
    (root.bookLibrary?.logs || []).forEach(log => {
      const book = bookById[log?.bookId];
      const skillId = skillForBook(book, log.at || log.createdAt || book?.lastReadAt);
      if (!book || !skillId) return;
      if (isLikelyDuplicateMediaTime(log, readingTimeEntries)) return;
      const xp = bookLogXp(log);
      if (xp <= 0) return;
      addDerived(events, {
        id: `book:${log.id || `${book.id}:${log.at || log.createdAt}`}`,
        skillId,
        xp,
        label: book.title || "Reading",
        source: "book",
        sourceId: log.id || book.id,
        at: log.at || log.createdAt || book.lastReadAt,
        metadata: { bookId: book.id, role: book.role || "fun", minutes: Number(log.minutes || 0), pages: pagesInBookLog(log) }
      });
      if (log.rewardEventId) claimedRewardIds.add(log.rewardEventId);
    });

    // Historical Steam totals remain baseline-only. New post-baseline Steam playtime can
    // create explicit steamImported game logs. Those logs carry an incremental Skill-XP
    // override so any manual game time already covering the same sync interval is not paid twice.
    const games = Array.isArray(root.gameLibrary?.items) ? root.gameLibrary.items : [];
    const gameById = Object.fromEntries(games.map(item => [item.id, item]));
    const gamingTimeEntries = timeEntries.filter(entry => entry.categoryId === "gaming");
    // When a deliberate unwind timer and a manually logged game session describe
    // the same session, the player's Recovery intent wins the Skill-XP route.
    // Steam imports are left alone because historical/approximate timestamps
    // are not strong evidence for a duplicate live activity.
    const unwindTimeEntries = timeEntries.filter(entry => entry.categoryId === "recovery" && /^intentional unwind\b|^unwinding\b/i.test(String(entry.label || "")));
    (root.gameLibrary?.logs || []).forEach(log => {
      const game = gameById[log?.gameId];
      const skillId = skillForGame(game);
      if (!game || !skillId) return;
      if (!log.steamImported && isLikelyDuplicateMediaTime(log, [...gamingTimeEntries, ...unwindTimeEntries])) return;
      const minutes = Math.max(0, Number(log.minutes || 0));
      const override = Number(log.skillXpOverride);
      const xp = log.steamImported && Number.isFinite(override)
        ? Math.max(0, override)
        : minutes > 0 ? timeXp(minutes) : 8;
      if (xp <= 0) return;
      addDerived(events, {
        id: `${log.steamImported ? "steam-playtime" : "game"}:${log.id || `${game.id}:${log.at || log.createdAt}`}`,
        skillId,
        xp,
        label: log.steamImported ? `${game.title || "Game"} · Steam playtime` : (game.title || "Game session"),
        source: log.steamImported ? "steam-playtime" : "game",
        sourceId: log.id || game.id,
        at: log.at || log.createdAt || log.timestamp || game.lastPlayedAt,
        metadata: {
          gameId: game.id,
          role: game.role || "fun",
          minutes,
          steamImported: Boolean(log.steamImported),
          steamRemoteDeltaMinutes: Number(log.steamRemoteDeltaMinutes || 0),
          steamManualCoveredMinutes: Number(log.steamManualCoveredMinutes || 0),
          intervalStartAt: log.steamIntervalStartAt || null,
          intervalEndAt: log.steamIntervalEndAt || null,
          dateUncertain: Boolean(log.dateUncertain)
        }
      });
      if (log.rewardEventId) claimedRewardIds.add(log.rewardEventId);
    });

    // Quest completion logs are fallback practice signals. If a matching timed entry or
    // native activity already represents the real action, the quest is only a completion wrapper.
    const linkedTimesByQuest = groupTimeEntriesByQuest(timeEntries);
    (root.completionLog || []).forEach(log => {
      if (!log?.questId || log.nativeSource === "home-quick-action") return;
      if (log.rewardEventId && claimedRewardIds.has(log.rewardEventId)) return;
      const quest = app.getQuestById?.(log.questId);
      if (!quest) return;
      if (nativeQuestRole(quest)) return;
      if (hasMatchingLinkedTime(log, linkedTimesByQuest[log.questId] || [])) return;
      const mapped = skillForQuest(quest, log.at);
      if (!mapped?.skillId) return;
      const xp = questLogXp(log, quest, mapped);
      if (xp <= 0) return;
      addDerived(events, {
        id: `quest:${log.id || `${log.questId}:${log.at}`}`,
        skillId: mapped.skillId,
        xp,
        label: log.questName || quest.name || "Quest practice",
        source: "quest",
        sourceId: log.id || log.questId,
        at: log.at,
        metadata: { questId: log.questId, units: Number(log.units || 0), unitLabel: log.unitLabel || quest.unitLabel || "" }
      });
    });

    // Stable ordering makes rebuilds deterministic and keeps save diffs small.
    return events
      .filter(event => event.xp > 0 && validSkillId(event.skillId))
      .sort((a, b) => eventTime(a) - eventTime(b) || String(a.id).localeCompare(String(b.id)));
  }

  function addDerived(target, spec) {
    const skillId = validSkillId(spec.skillId);
    const xp = round2(Math.max(0, Number(spec.xp || 0)));
    if (!skillId || xp <= 0) return;
    target.push({
      id: String(spec.id),
      skillId,
      xp,
      label: String(spec.label || SKILL_BY_ID[skillId].label),
      source: String(spec.source || "practice"),
      sourceId: spec.sourceId == null ? null : String(spec.sourceId),
      at: normalizeAt(spec.at),
      metadata: spec.metadata && typeof spec.metadata === "object" ? spec.metadata : {}
    });
  }

  function skillForTimeEntry(entry) {
    if (!entry) return null;

    if (entry.linkedQuestId) {
      const quest = app.getQuestById?.(entry.linkedQuestId);
      const mapped = skillForQuest(quest, entry.endAt || entry.startAt || entry.createdAt);
      if (mapped?.skillId) return mapped.skillId;
    }

    if (entry.linkedAdventureId) {
      const adventure = (app.getState().sideAdventures?.items || []).find(item => item?.id === entry.linkedAdventureId);
      const mapped = skillForAdventure(adventure);
      if (mapped) return mapped;
    }

    const category = String(entry.categoryId || "");
    const sub = String(entry.subcategory || "").toLowerCase();
    const label = String(entry.label || "").toLowerCase();

    const occurredAt = entry.endAt || entry.startAt || entry.createdAt;
    if (label.includes("recovery studio")) {
      if (/neck|shoulder|stretch|yoga|mobility|walk/.test(label)) return "movement-body-care";
      if (/lie down|quiet rest/.test(label)) return specializedHomeRecoverySkill("recovery-regulation", "recovery-rest", occurredAt);
      return "recovery-regulation";
    }

    if (category === "school") {
      if (sub === "teaching" || sub === "substitution") return "teaching-facilitation";
      if (sub === "conference / meeting" || sub === "school admin") return "professional-organization";
      return null;
    }
    if (category === "work_home") {
      if (sub === "lesson planning" || sub === "preparation") return "lesson-design-preparation";
      if (sub === "grading / corrections") return "assessment-feedback";
      if (sub === "admin") return "professional-organization";
      return null;
    }
    if (category === "focus") {
      if (sub === "deep work") return "focus-concentration";
      if (sub === "study") return "learning-inquiry";
      return null;
    }
    if (category === "life_admin") {
      if (sub === "household") {
        const tidying = /clean|tidy|declutter|sort|reset|aufräum|ordnung|putzen|entrümpel|aufr[aä]um/.test(label);
        return specializedHomeRecoverySkill("life-management", tidying ? "home-tidying" : "home-routines", occurredAt);
      }
      if (["appointments", "paperwork", "errands"].includes(sub)) return "life-management";
      return null;
    }
    if (category === "hobby") {
      if (sub === "craft") return "craft-making";
      if (sub === "creative" || sub === "music") return "creative-expression";
      return null;
    }
    if (category === "gaming") {
      if (sub === "solo" || sub === "social") return "recreation-play";
      return null;
    }
    if (category === "reading") {
      if (sub === "knowledge") return "learning-inquiry";
      if (sub === "for fun") return "recreation-play";
      return null;
    }
    if (category === "recovery") {
      if (sub === "walk") return "movement-body-care";
      if (/^intentional unwind\b|^unwinding\b/i.test(entry.label || "")) return specializedHomeRecoverySkill("recovery-regulation", "recovery-unwinding", occurredAt);
      if (["break", "rest"].includes(sub)) return specializedHomeRecoverySkill("recovery-regulation", "recovery-rest", occurredAt);
      if (sub === "quiet time") return "recovery-regulation";
      return null;
    }
    return null;
  }

  function skillForRewardEvent(reward) {
    const source = String(reward.source || "");
    const label = String(reward.label || "");
    if (source === "knowledge-practice-recall") return nativeSkill("memory-recall", Math.max(0, Math.min(8, Number(reward.metadata?.skillXP || 0))), source);
    if (source === "knowledge-practice-explain") return nativeSkill("learning-inquiry", Math.max(0, Math.min(6, Number(reward.metadata?.skillXP || 0))), source);
    if (source === "schulcockpit-completion") {
      const map = {"lesson-prepared":"lesson-design-preparation","lesson-reflected":"assessment-feedback","preparation-completed":"professional-organization","assessment-analyzed":"assessment-feedback","sequence-planned":"lesson-design-preparation"};
      const id = map[reward.metadata?.bridgeType];
      if (id) return nativeSkill(id, Math.max(0, Math.min(16, Number(reward.metadata?.skillXP || 0))), source);
    }
    if (source === "home-quick-action") {
      const actionId = String(reward.metadata?.actionId || "");
      const specialized = ["clear-kitchen", "clean-bathroom", "vacuum"].includes(actionId) ? "home-tidying"
        : ["dishwasher", "hang-laundry", "put-away-laundry", "trash", "put-groceries", "change-sheets"].includes(actionId) ? "home-routines" : "life-management";
      return nativeSkill(specializedHomeRecoverySkill("life-management", specialized, reward.at), Math.max(0, Number(reward.statXP ?? 1)), "home-quick-action");
    }
    if (source === "sudoku-complete") return nativeSkill("logical-pattern-reasoning", 10, "sudoku");
    if (source === "sudoku-daily-replay") return nativeSkill("logical-pattern-reasoning", 8, "sudoku-replay");
    if (source === "nonogram-complete") return nativeSkill("logical-pattern-reasoning", 10, "nonogram");
    if (source === "nonogram-daily-replay") return nativeSkill("logical-pattern-reasoning", 8, "nonogram-replay");
    if (source === "number-sense-complete") return nativeSkill("quantitative-reasoning", 10, "number-sense");
    if (source === "number-sense-daily-replay") return nativeSkill("quantitative-reasoning", 8, "number-sense-replay");
    if (source === "memory-garden-complete") return nativeSkill("memory-recall", 10, "memory-garden");
    if (source === "memory-garden-daily-replay") return nativeSkill("memory-recall", 8, "memory-garden-replay");
    if (source === "talent-v3-school-moment") return nativeSkill("teaching-facilitation", Math.max(0, Number(reward.metadata?.skillXP ?? 5)), "school-moments");
    if (source === "talent-v3-takuzu") return nativeSkill("logical-pattern-reasoning", Math.max(0, Number(reward.metadata?.skillXP ?? 10)), "takuzu");
    if (source === "talent-v3-palette") return nativeSkill("style-visual-design", Math.max(0, Number(reward.metadata?.skillXP ?? 9)), "palette-atelier");
    if (source === "drawing-studio") return nativeSkill("creative-expression", Math.max(0, Number(reward.metadata?.skillXP || 8)), "drawing-studio");
    if (source === "lexicon-calibration") return nativeSkill("language-expression", 5, "lexicon-calibration");
    if (source === "lexicon-daily-word") return nativeSkill("language-expression", 4, "lexicon-daily-word");
    if (source === "lexicon-lab-complete") return nativeSkill("language-expression", 10, "lexicon-crossword");
    if (source === "weekly-review-base") return nativeSkill("reflection-self-awareness", Math.max(0, Number(reward.metadata?.skillXP || 6)), "weekly-review");
    if (source === "weekly-review-field-depth") return nativeSkill("reflection-self-awareness", Math.max(0, Number(reward.metadata?.skillXP || 0)), "weekly-review-depth");
    if (source === "talent-content-v2" && String(reward.metadata?.contentId || "") === "work-debrief") {
      const tier = Math.max(1, Number(reward.metadata?.reachedTier || 1));
      return nativeSkill("professional-organization", Math.min(12, 4 + (tier - 1) * 3), "work-deep-brief");
    }
    if (source === "kotoba-dungeon") return nativeSkill("language-learning", Math.max(1, Math.min(12, Number(reward.realmXP || reward.xp || 4))), "kotoba-dungeon");
    if (source === "kotoba-quest" || /^Kotoba(?: Quick)?\b/i.test(label) || /kotoba quick/i.test(label)) {
      const skillId = useSpecializedJapaneseSkills(reward.at)
        ? japaneseSkillForKotobaReward(reward)
        : "language-learning";
      return nativeSkill(skillId, 1.5, "kotoba-quick-review");
    }
    if (source === "japanese-practice") {
      const skillId = useSpecializedJapaneseSkills(reward.at)
        ? (String(reward.metadata?.mode || "") === "listening" ? "japanese-listening-comprehension" : "japanese-vocabulary-kanji")
        : "language-learning";
      const minutes = Math.max(5, Number(reward.metadata?.minutes || 15));
      return nativeSkill(skillId, timeXp(minutes), "japanese-practice");
    }
    return null;
  }

  function nativeSkill(skillId, xp, source) { return { skillId, xp, source, label: SKILL_BY_ID[skillId]?.label || "Skill practice" }; }

  function japaneseSkillForKotobaReward(reward) {
    const type = String(reward?.metadata?.kotobaType || "").toLowerCase();
    const subskill = String(reward?.metadata?.skill || "").toLowerCase();

    if (type === "mining-import") return "japanese-vocabulary-kanji";
    if (["sentence-mining", "reading"].includes(type)) return "japanese-reading-mining";
    if (type === "particle-review" || type === "particle-lesson") return "japanese-grammar-particles";
    if (type === "grammar-review" || type === "grammar-lesson") {
      if (/listen/.test(subskill)) return "japanese-listening-comprehension";
      if (/production|form|speak|output/.test(subskill)) return "japanese-speaking-production";
      return "japanese-grammar-particles";
    }
    if (type === "vocab-review" || type === "vocab-lesson") {
      if (/listen/.test(subskill)) return "japanese-listening-comprehension";
      if (/production|speak|output|de-jp/.test(subskill)) return "japanese-speaking-production";
      return "japanese-vocabulary-kanji";
    }
    return "language-learning";
  }

  function skillForQuest(quest, at = null) {
    if (!quest) return null;
    const role = String(quest.systemRole || "").toLowerCase();
    const name = String(quest.name || "").toLowerCase();

    if (["bunpro-reviews", "bunpro-lesson", "shadowing", "manual-language"].includes(role)) return mappedQuest("language-learning");
    if (role === "explain-it-back" || role === "curiosity-dive") return mappedQuest("learning-inquiry");
    if (role === "craft-session" || role === "scrapbook-page") return mappedQuest("craft-making");
    if (role === "recovery-lie-down") return mappedQuest(specializedHomeRecoverySkill("recovery-regulation", "recovery-rest", at));
    if (["recovery-meditation", "recovery-body-scan", "recovery-breathing", "fresh-air"].includes(role)) return mappedQuest("recovery-regulation");
    if (["recovery-stretch", "recovery-yoga", "mobility-break"].includes(role)) return mappedQuest("movement-body-care");
    if (["clear-surface", "put-away-ten", "paper-pile"].includes(role)) return mappedQuest(specializedHomeRecoverySkill("life-management", "home-tidying", at));
    if (["laundry-cycle", "laundry-fold"].includes(role)) return mappedQuest(specializedHomeRecoverySkill("life-management", "home-routines", at));
    if (role === "focus-work") return mappedQuest("focus-concentration");
    if (role === "new-hairstyle" || role === "makeup-look") return mappedQuest("style-visual-design");
    if (role === "sudoku") return mappedQuest("logical-pattern-reasoning", { native: true });

    if (/lesson planning sprint/.test(name)) return mappedQuest("lesson-design-preparation");
    if (/correction sprint/.test(name)) return mappedQuest("assessment-feedback");
    if (/work desk reset/.test(name)) return mappedQuest("professional-organization");
    if (/focused work block|focus work/.test(name)) return mappedQuest("focus-concentration");
    if (/curiosity dive|explain it back|literature note|permanent note/.test(name)) return mappedQuest("learning-inquiry");
    if (/bunpro|grammar echo|grammar output|kanji|shadowing|subtitle scout|line miner|n3 practice|scene recap/.test(name)) return mappedQuest("language-learning");
    if (/lie.down|real rest|quiet rest/.test(name)) return mappedQuest(specializedHomeRecoverySkill("recovery-regulation", "recovery-rest", at));
    if (/meditation|body scan|breathing|fresh.air/.test(name)) return mappedQuest("recovery-regulation");
    if (/walk|stretch|yoga|mobility/.test(name)) return mappedQuest("movement-body-care");
    if (/laundry|wäsche/.test(name)) return mappedQuest(specializedHomeRecoverySkill("life-management", "home-routines", at));
    if (/room reset|10-minute clean|paper pile|clear one surface|put away|throw one thing|sort \/ declutter files/.test(name)) return mappedQuest(specializedHomeRecoverySkill("life-management", "home-tidying", at));
    if (/craft session|scrapbook/.test(name)) return mappedQuest("craft-making");
    if (/hairstyle|makeup look/.test(name)) return mappedQuest("style-visual-design");
    if (/songwriting|music composition|creative experiment|aesthetic build|250-word writing/.test(name)) return mappedQuest("creative-expression");
    if (/intentional gaming|comfort episode|music reset/.test(name)) return mappedQuest("recreation-play");
    return null;
  }

  function mappedQuest(skillId, extra = {}) { return { skillId, ...extra }; }
  function nativeQuestRole(quest) { return Boolean(skillForQuest(quest)?.native); }

  function skillForAdventure(item) {
    if (!item) return null;
    const realm = String(item.realm || "");
    const kind = String(item.kind || "").toLowerCase();
    if (realm === "Knowledge") return "learning-inquiry";
    if (realm === "Japanese") return "language-learning";
    if (realm === "Home") return "life-management";
    if (realm === "Hobbies") {
      if (/creative/.test(kind)) return "creative-expression";
      if (/craft|skill/.test(kind)) return "craft-making";
    }
    return null;
  }

  function skillForBook(book, at) {
    const role = String(book?.role || "").toLowerCase();
    if (role === "fun") return "recreation-play";
    if (role === "knowledge" || role === "growth") return "learning-inquiry";
    if (role === "japanese") return useSpecializedJapaneseSkills(at) ? "japanese-reading-mining" : "language-learning";
    return null;
  }

  function skillForGame(game) {
    const role = String(game?.role || "fun").toLowerCase();
    if (role === "japanese") return "language-learning";
    if (["fun", "social", "challenge"].includes(role)) return "recreation-play";
    return null;
  }

  function questLogXp(log, quest, mapped) {
    const unit = String(log.unitLabel || quest.unitLabel || "").toLowerCase();
    const units = Math.max(0, Number(log.units || 0));
    if (/(^|\b)(min|minute|minutes)(\b|$)/.test(unit) && units > 0) return timeXp(units);
    if (mapped.skillId === "language-learning" && units > 1) return Math.min(14, round2(3 + Math.sqrt(units) * 1.5));
    return 8;
  }

  function bookLogXp(log) {
    const minutes = Math.max(0, Number(log?.minutes || 0));
    if (minutes > 0) return timeXp(minutes);
    const pages = pagesInBookLog(log);
    if (pages > 0) return Math.min(14, round2(2 * Math.sqrt(pages)));
    if (log?.chapter || log?.chapterLabel) return 8;
    return 6;
  }

  function pagesInBookLog(log) {
    const direct = Number(log?.pages || log?.pagesRead || 0);
    if (direct > 0) return direct;
    const amount = Number(log?.amount || 0);
    const unit = String(log?.unitLabel || log?.type || "").toLowerCase();
    return amount > 0 && /page/.test(unit) ? amount : 0;
  }

  function isLikelyDuplicateMediaTime(log, timeEntries) {
    const at = timestamp(log?.at || log?.createdAt || log?.timestamp);
    if (!at) return false;
    const minutes = Math.max(0, Number(log?.minutes || 0));
    return timeEntries.some(entry => {
      const end = timestamp(entry.endAt || entry.startAt || entry.createdAt);
      if (!end || Math.abs(end - at) > 15 * 60 * 1000) return false;
      if (!minutes) return true;
      return Math.abs(preciseMinutes(entry) - minutes) <= Math.max(3, minutes * 0.15);
    });
  }

  function groupTimeEntriesByQuest(entries) {
    const groups = {};
    entries.forEach(entry => {
      if (!entry?.linkedQuestId) return;
      (groups[entry.linkedQuestId] ||= []).push(entry);
    });
    return groups;
  }

  function hasMatchingLinkedTime(log, entries) {
    const at = timestamp(log?.at);
    if (!entries.length) return false;
    if (!at) return true;
    return entries.some(entry => {
      const end = timestamp(entry.endAt || entry.startAt);
      return end && Math.abs(end - at) <= 20 * 60 * 1000;
    });
  }

  function preciseMinutes(entry) {
    const seconds = Math.max(0, Number(entry?.durationSeconds || 0));
    if (seconds > 0) return seconds / 60;
    return Math.max(0, Number(entry?.minutes || 0));
  }

  function timeXp(minutes) {
    const safe = Math.max(0, Number(minutes || 0));
    return safe > 0 ? round2(2 * Math.sqrt(safe)) : 0;
  }

  function reflectionXp(chars) {
    const safe = Math.max(0, Math.min(1000, Number(chars || 0)));
    // Continuous curve: every extra character helps a little until the 1000-char cap,
    // so there is no 599/600 or 999/1000 cliff in Skill XP.
    return safe > 0 ? round2(Math.min(18, 1 + 0.54 * Math.sqrt(safe))) : 0;
  }

  // DZ29: Presentation-only Skill XP feedback, observing NEW canonical events.
  // No additional XP or reward event is written from this layer.
  function feedbackState() {
    const model = state();
    if (!model.feedbackV1 || typeof model.feedbackV1 !== "object" || Array.isArray(model.feedbackV1)) {
      model.feedbackV1 = { bootstrappedAt: 0, pending: [] };
    }
    const feed = model.feedbackV1;
    if (!Array.isArray(feed.pending)) feed.pending = [];
    return feed;
  }

  function bootstrapSkillFeedback() {
    const feed = feedbackState();
    if (Number(feed.bootstrappedAt || 0) > 0) {
      renderSkillFeedbackNotice();
      return;
    }
    // Historical points existed before this feature. Show a gentle reminder,
    // not a fake Level-Up or XP-animation for historical/migrated activities.
    const outstanding = Object.keys(REALMS).reduce((sum, realm) => sum + realmPointInfo(realm).available, 0);
    feed.bootstrappedAt = Date.now();
    if (outstanding > 0 && !feed.pending.length) {
      feed.pending.push({ id: "initial-unspent", kind: "unspent", at: Date.now() });
    }
    // Do not write a full multi-megabyte save just to display an old-point reminder.
    // The next genuine activity/save or notice acknowledgement persists this tiny marker.
    renderSkillFeedbackNotice();
  }

  function skillEventTotals(events) {
    const totals = Object.fromEntries(SKILLS.map(item => [item.id, 0]));
    events.forEach(event => {
      if (validSkillId(event?.skillId)) totals[event.skillId] = round2(totals[event.skillId] + Math.max(0, Number(event.xp || 0)));
    });
    return totals;
  }

  function captureSkillFeedback(beforeEvents, afterEvents, reason) {
    const feed = feedbackState();
    if (!Number(feed.bootstrappedAt || 0)) return;
    if (reason === "skills-manual-rebuild") return;
    const beforeIds = new Set(beforeEvents.map(e => String(e.id || "")));
    const now = Date.now();
    const newEvents = afterEvents.filter(event =>
      !beforeIds.has(String(event.id || "")) &&
      validSkillId(event.skillId) &&
      Number(event.xp) > 0 &&
      timestamp(event.at) >= Math.max(Number(feed.bootstrappedAt || 0) - 30000, now - FEEDBACK_RECENCY_MS) &&
      timestamp(event.at) <= now + 60000
    );
    if (!newEvents.length) return;
    const beforeTotal = skillEventTotals(beforeEvents);
    const afterTotal = skillEventTotals(afterEvents);
    const skillIds = [...new Set(newEvents.map(e => e.skillId))];
    for (const id of skillIds) {
      const oldXp = beforeTotal[id], newXp = afterTotal[id];
      if (!(newXp > oldXp + 0.001)) continue;
      const meta = SKILL_BY_ID[id];
      const before = levelInfo(oldXp), after = levelInfo(newXp);
      enqueueSkillXP({ id, realm: meta.realm, label: meta.label, icon: meta.icon,
        gained: round2(newXp - oldXp), before, after });
      if (after.level > before.level) {
        const key = `skill:${id}:lv${after.level}`;
        if (!feed.pending.some(note => note.id === key)) {
          feed.pending.unshift({ id: key, kind: "level", skillId: id, realm: meta.realm,
            from: before.level, to: after.level, at: now });
        }
      }
    }
    if (feed.pending.length > FEEDBACK_MAX_PENDING) {
      feed.pending = feed.pending.slice(-FEEDBACK_MAX_PENDING);
    }
    renderSkillFeedbackNotice();
  }

  function ensureSkillFeedbackUI() {
    if (!document.getElementById("skillXpFloatDz29")) {
      const toast = document.createElement("aside");
      toast.id = "skillXpFloatDz29";
      toast.className = "skill-xp-toast-dz29";
      toast.setAttribute("aria-live", "polite");
      toast.setAttribute("role", "status");
      toast.hidden = true;
      document.body.appendChild(toast);
    }
    if (!document.getElementById("skillPointNoticeDz29")) {
      const badge = document.createElement("aside");
      badge.id = "skillPointNoticeDz29";
      badge.className = "skill-level-notice-dz29";
      badge.setAttribute("role", "region");
      badge.setAttribute("aria-label", "Skill-Fortschritt und Talentpunkte");
      badge.hidden = true;
      document.body.appendChild(badge);
    }
    window.addEventListener("resize", repositionSkillFeedback);
    document.addEventListener("close", () => {
      if (!feedbackCurrent && skillFeedbackQueue.length) showNextSkillXP();
    }, true);
    // Focus Dock is loaded later by pwa.js, after the Skills module.
    // Track its appearance without replacing/rebuilding any app DOM.
    document.addEventListener("click", () => window.setTimeout(repositionSkillFeedback, 80), true);
    window.addEventListener("life-rpg:time-change", repositionSkillFeedback);
  }

  function repositionSkillFeedback() {
    const anyDock = document.querySelector(".focus-dock");
    if (anyDock && !feedbackPositionObserver && typeof MutationObserver === "function") {
      feedbackPositionObserver = new MutationObserver(repositionSkillFeedback);
      feedbackPositionObserver.observe(anyDock, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    }
    // The real timer dock may be open and taller than its launcher.
    const dock = document.querySelector(".focus-dock:not(.hidden)");
    const rect = dock?.getBoundingClientRect?.();
    const bottom = rect && rect.height && rect.bottom > 0 && rect.top < window.innerHeight
      ? Math.max(105, Math.ceil(window.innerHeight - rect.top) + 12)
      : (window.innerWidth < 620 ? 143 : 159);
    for (const id of ["skillXpFloatDz29", "skillPointNoticeDz29"]) {
      const el = document.getElementById(id);
      if (el) el.style.setProperty("--skill-feedback-base", `${bottom}px`);
    }
  }

  function enqueueSkillXP(entry) {
    if (skillFeedbackQueue.length > 8) skillFeedbackQueue.shift();
    skillFeedbackQueue.push(entry);
    if (!feedbackCurrent) showNextSkillXP();
  }

  function showNextSkillXP() {
    window.clearTimeout(feedbackTimer);
    // Native puzzle/creative activities can complete inside a modal dialog.
    // A normal fixed toast would render *behind* the browser's top-layer dialog.
    // Wait until it closes so the user actually sees the earned progress.
    if (document.querySelector("dialog[open]")) {
      feedbackTimer = window.setTimeout(showNextSkillXP, 1000);
      return;
    }
    const next = skillFeedbackQueue.shift();
    const root = document.getElementById("skillXpFloatDz29");
    if (!next || !root) { feedbackCurrent = null; if (root) root.hidden = true; return; }
    feedbackCurrent = next;
    const leveled = next.after.level > next.before.level;
    root.innerHTML = `<div class="skill-xp-top-dz29"><span aria-hidden="true">${esc(next.icon)}</span><div><small>${leveled ? "✦ SKILL LEVEL UP" : "SKILL GROWTH"} · ${esc(next.realm)}</small><strong>${esc(next.label)}</strong></div><b>+${formatXp(next.gained)} XP</b></div>
      <div class="skill-xp-label-dz29"><span class="skill-xp-level-dz29">Level ${next.before.level}</span><span>${formatXp(next.before.intoLevel)} / ${formatXp(next.before.required)}</span></div>
      <div class="skill-xp-track-dz29"><i style="width:${next.before.percent.toFixed(2)}%"></i></div>
      ${leveled ? `<p class="skill-xp-celebrate-dz29">✦ Level ${next.after.level} erreicht · Talentpunkt verdient!</p>` : `<p>Dein Skill wird stärker.</p>`}`;
    root.hidden = false;
    repositionSkillFeedback();
    const bar = root.querySelector(".skill-xp-track-dz29 i");
    const info = root.querySelector(".skill-xp-label-dz29");
    const ms = leveled ? 6800 : 5300;
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches && bar) {
      if (leveled) {
        window.setTimeout(() => { bar.style.width = "100%"; }, 90);
        window.setTimeout(() => {
          bar.style.transition = "none"; bar.style.width = "0%";
          if (info) info.innerHTML = `<span>Level ${next.after.level}</span><span>${formatXp(next.after.intoLevel)} / ${formatXp(next.after.required)}</span>`;
        }, 1550);
        window.setTimeout(() => {
          bar.style.transition = "width 1200ms ease";
          bar.style.width = `${next.after.percent.toFixed(2)}%`;
        }, 1630);
      } else window.setTimeout(() => { bar.style.width = `${next.after.percent.toFixed(2)}%`; }, 90);
    } else if (bar) {
      bar.style.width = `${next.after.percent.toFixed(2)}%`;
      if (info) info.innerHTML = `<span>Level ${next.after.level}</span><span>${formatXp(next.after.intoLevel)} / ${formatXp(next.after.required)}</span>`;
    }
    feedbackTimer = window.setTimeout(() => { feedbackCurrent = null; showNextSkillXP(); }, ms);
  }

  function renderSkillFeedbackNotice() {
    const root = document.getElementById("skillPointNoticeDz29");
    if (!root) return;
    const feed = feedbackState();
    const first = feed.pending[0];
    const key = first ? `${first.id}:${feed.pending.length}:${Object.keys(REALMS).map(realm => realmPointInfo(realm).available).join(",")}` : "none";
    if (key === feedbackRenderKey) return;
    feedbackRenderKey = key;
    if (!first) { root.hidden = true; root.innerHTML = ""; return; }
    const skill = SKILL_BY_ID[first.skillId];
    const count = first.realm ? realmPointInfo(first.realm).available : Object.keys(REALMS).reduce((sum, realm) => sum + realmPointInfo(realm).available, 0);
    const detail = first.kind === "level"
      ? `${esc(skill?.label || "Skill")} · Lv. ${first.from} → ${first.to}`
      : "Bereits erspielte Talentpunkte warten auf dich";
    const title = first.kind === "level" ? "✦ Skill Level Up!" : "✦ Talentpunkte verfügbar";
    const more = feed.pending.length > 1 ? ` · ${feed.pending.length - 1} weitere` : "";
    root.innerHTML = `<div class="skill-level-line-dz29"><span>${title}</span><strong>${count} ${count === 1 ? "Punkt" : "Punkte"} bereit${more}</strong></div>
      <p>${detail}</p><div class="skill-level-actions-dz29"><button type="button" data-skill-feedback-action="tree">Zum Talentbaum →</button><button type="button" data-skill-feedback-action="later">Später</button></div>`;
    root.hidden = false;
    repositionSkillFeedback();
  }

  function acknowledgeSkillFeedback(action) {
    if (action !== "tree" && action !== "later") return;
    const feed = feedbackState();
    const item = feed.pending.shift();
    if (!item) return;
    feedbackRenderKey = "";
    app.saveState({ source: "skills-feedback-dismiss", suppressUiRefresh: true });
    if (action === "tree") {
      openSkillsView();
      if (item.realm) selectTalentRealm(item.realm, { scroll: true });
      else renderTalentHub();
    }
    renderSkillFeedbackNotice();
  }

  function xpRequiredForLevel(level) {
    const l = Math.max(1, Number(level || 1));
    return 60 + 25 * l + 5 * l * l;
  }

  function levelInfo(totalXP) {
    let level = 1;
    let remaining = Math.max(0, Number(totalXP || 0));
    let required = xpRequiredForLevel(level);
    while (remaining + 1e-9 >= required && level < 999) {
      remaining -= required;
      level += 1;
      required = xpRequiredForLevel(level);
    }
    return {
      level,
      intoLevel: round2(remaining),
      required: round2(required),
      percent: Math.min(100, required > 0 ? remaining / required * 100 : 0),
      discovered: Number(totalXP || 0) > 0
    };
  }

  function pointsFromSkillLevel(level) {
    const l = Math.max(1, Math.floor(Number(level || 1)));
    return Math.max(0, l - 1) + Math.floor(l / 5);
  }

  function totalsBySkill() {
    const totals = Object.fromEntries(SKILLS.map(item => [item.id, 0]));
    state().events.forEach(event => {
      if (!validSkillId(event.skillId)) return;
      totals[event.skillId] = round2(Number(totals[event.skillId] || 0) + Number(event.xp || 0));
    });
    return totals;
  }

  function realmRankPointInfo(realm) {
    const rank = Math.max(1, Math.floor(Number(app.getRealmRankInfo?.(realm)?.level || 1)));
    // Current trees cost 14–18 points. One point per Realm rank-up keeps Realm
    // progression meaningful without instantly completing a tree.
    return { rank, points: Math.max(0, rank - 1) };
  }

  function breadthPointInfo(realm, totals = totalsBySkill()) {
    const realmSkills = SKILLS_BY_REALM[realm] || [];
    if (realmSkills.length < 3) return { points: 0, foundation: false, versatility: false, mastery: false };

    const levels = realmSkills.map(item => levelInfo(totals[item.id] || 0).level);
    const atLeast = level => levels.filter(value => value >= level).length;
    const foundation = atLeast(3) >= 3;
    const versatility = atLeast(6) >= 3 && atLeast(3) >= 4;
    const masteryTarget = Math.ceil(realmSkills.length * 0.7);
    const mastery = atLeast(10) >= masteryTarget;
    return {
      points: (foundation ? 2 : 0) + (versatility ? 3 : 0) + (mastery ? 5 : 0),
      foundation, versatility, mastery
    };
  }

  function realmPointInfo(realm, totals = totalsBySkill()) {
    const earnedFromSkills = (SKILLS_BY_REALM[realm] || []).reduce((sum, item) => sum + pointsFromSkillLevel(levelInfo(totals[item.id] || 0).level), 0);
    const rankInfo = realmRankPointInfo(realm);
    const breadthInfo = breadthPointInfo(realm, totals);
    const bonus = Math.max(0, Number(state().realmBonusPoints?.[realm] || 0));
    const baseSpent = Math.max(0, Number(state().spentPointsByRealm?.[realm] || 0));
    // V2 core ranks live in spentPointsByRealm. Permanent AO/AP content and
    // Dream Threads keep their ownership in their own save model, so count
    // those costs here as an external contribution instead of duplicating them
    // into the core ledger.
    const externalSpent = Math.max(0, Number(window.LifeRPGTalentTreeGraph?.extraSpent?.(realm) || 0));
    const spent = baseSpent + externalSpent;
    const earned = earnedFromSkills + rankInfo.points + breadthInfo.points + bonus;
    return {
      earned,
      spent,
      available: Math.max(0, earned - spent),
      earnedFromSkills,
      earnedFromRealmRank: rankInfo.points,
      realmRank: rankInfo.rank,
      breadth: breadthInfo.points,
      breadthMilestones: breadthInfo,
      bonus
    };
  }

  function injectNavigation() {
    const strip = document.querySelector(".dashboard-command-strip");
    if (strip && !strip.querySelector('[data-view-target="skills"], [data-skills-open]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.skillsOpen = "true";
      button.innerHTML = `<span class="command-strip-icon">✦</span><span><strong>Skills</strong><small>See what your real practice is building.</small></span><b>›</b>`;
      const activity = strip.querySelector('[data-view-target="activity"]');
      if (activity?.nextSibling) strip.insertBefore(button, activity.nextSibling);
      else strip.appendChild(button);
    }

    const nav = document.querySelector(".bottom-nav");
    if (nav && !nav.querySelector('.nav-button[data-view="skills"]')) {
      const button = document.createElement("button");
      button.className = "nav-button";
      button.type = "button";
      button.dataset.view = "skills";
      button.dataset.skillsOpen = "true";
      button.innerHTML = `<span>✦</span><small>Skills</small>`;
      const growth = nav.querySelector('.nav-button[data-view="growth"]');
      if (growth) nav.insertBefore(button, growth);
      else nav.appendChild(button);
    }
  }

  function injectSkillsView() {
    if (document.getElementById("view-skills")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const section = document.createElement("section");
    section.id = "view-skills";
    section.className = "view skills-view-v314aa";
    section.innerHTML = `
      <section class="skills-hero-v314aa">
        <div>
          <p class="eyebrow">SKILLS · PRACTICE THAT STICKS</p>
          <h1>What your real life is training.</h1>
          <p>Skills grow from actions Life RPG can actually observe. One real action trains one skill; Realm and Character progression stay separate.</p>
        </div>
        <button class="secondary-button" data-skills-rebuild type="button">Rebuild from logs</button>
      </section>
      <section id="skillsSummary" class="skills-summary-v314aa"></section>
      <section id="skillsHabitMapping" class="skills-habit-map-v314aa"></section>
      <section id="skillsTalentHub" class="panel skills-talent-hub-v314ag">
        <div class="skills-talent-hub-head-v314ag"><div><p class="eyebrow">REALM TALENT TREES · V2</p><h2>Spend points on rewards you can actually feel.</h2><p class="panel-subcopy">Rank visible bonuses, unlock real new content, or take permanent reward caches. Existing Life RPG features never become retroactively locked.</p></div></div>
        <div id="skillsTalentTabs" class="skills-talent-tabs-v314ag" role="tablist" aria-label="Talent tree Realm"></div>
        <div class="skills-talent-workbench-v314dz21">
          <div class="skills-talent-tree-column-v314dz21">
            <div id="skillsTalentMeta" class="skills-talent-meta-v314ah" aria-live="polite"></div>
            <div id="skillsTalentTreePanels" class="skills-talent-panels-v314ag"></div>
            <div id="skillsTalentEmpty" class="skills-talent-empty-v314ag hidden"></div>
          </div>
          <aside id="skillsTalentSkillRailV314dz21" class="skills-talent-skill-rail-v314dz21" aria-label="Skills in selected Realm">
            <div id="skillsTalentSkillRailHeadV314dz21"></div>
            <div id="skillsTalentSkillListV314dz21" class="skills-talent-skill-list-v314dz21"></div>
            <div id="skillsTalentSkillDetailV314dz21" class="skills-talent-skill-detail-v314dz21"></div>
          </aside>
        </div>
      </section>
      <details class="panel skills-history-panel-v314aa skills-history-collapsible-v314ag">
        <summary><div><p class="eyebrow">PRACTICE HISTORY</p><h2>Recent Skill XP</h2><p class="panel-subcopy">Open the audit trail only when you want the details.</p></div><span id="skillsRecentSummary">Latest practice</span></summary>
        <div id="skillsRecentPractice" class="skills-recent-v314aa"></div>
      </details>`;
    main.appendChild(section);
  }


  function ensureTrainingDialog() {
    if (document.getElementById("skillTrainingDialogV314dz20")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "skillTrainingDialogV314dz20";
    dialog.className = "rpg-dialog skill-training-dialog-v314dz20";
    dialog.innerHTML = `<div class="skill-training-shell-v314dz20">
      <header><div><p class="eyebrow">TRAIN & LEVEL</p><h2 id="skillTrainingTitleV314dz20">Train a Skill</h2></div><button type="button" class="close-button" data-skill-training-close aria-label="Close">×</button></header>
      <div id="skillTrainingBodyV314dz20"></div>
    </div>`;
    document.body.appendChild(dialog);
  }

  function trainingAction(icon, label, detail, run, mode = "linked") {
    return { icon, label, detail, run, mode: ["native", "guided", "linked"].includes(mode) ? mode : "linked" };
  }

  function actionModeMeta(mode) {
    if (mode === "native") return { label: "DIRECT · LIFE RPG", className: "is-native", note: "Done and logged inside Life RPG" };
    if (mode === "guided") return { label: "GUIDED / LOGGED", className: "is-guided", note: "Life RPG guides or times the real action" };
    return { label: "LINKED", className: "is-linked", note: "Opens the relevant Life RPG area" };
  }

  function skillProgressMarkup(item, info, compact = false) {
    const remaining = Math.max(0, Number(info.required || 0) - Number(info.intoLevel || 0));
    return `<section class="skill-training-progress-v314dz20 ${compact ? "is-compact-v314dz21" : ""}">
      <div><span>${item.icon}</span><div><small>SELECTED SKILL · ${esc(item.label)} · LV. ${info.level}</small><strong>${formatXp(info.intoLevel)} / ${formatXp(info.required)} Skill XP</strong><p>${formatXp(remaining)} XP until Level ${info.level + 1} and another Talent Point contribution.</p></div></div>
      <i><b style="width:${Number(info.percent || 0).toFixed(2)}%"></b></i>
    </section>`;
  }

  function japaneseStatusMarkup(item) {
    if (item.realm !== "Japanese") return "";
    const status = window.LifeRPGKotobaIntegration?.getStatus?.();
    const counts = status?.dueSnapshot?.counts;
    if (status?.enabled && counts) {
      return `<div class="skill-training-kotoba-v314dz20"><span>🌸 Kotoba due now</span><strong>${Math.max(0,Number(counts.vocabularyCore||0)+Number(counts.vocabularyMining||0))} vocab · ${Math.max(0,Number(counts.grammar||0))} grammar · ${Math.max(0,Number(counts.particles||0))} particles</strong></div>`;
    }
    return `<div class="skill-training-kotoba-v314dz20"><span>🌸 Kotoba Quest</span><strong>${status?.enabled ? "Connected · sync to refresh due reviews" : "Connect Kotoba to train directly from Life RPG"}</strong></div>`;
  }

  function trainingActionsMarkup(skillId, actions, { inline = false } = {}) {
    if (!actions.length) return `<p class="muted">No direct launcher is mapped yet. A Habit can still be explicitly assigned to this Skill.</p>`;
    return actions.map((entry,index) => {
      const mode = actionModeMeta(entry.mode);
      return `<button type="button" data-skill-training-action="${index}" data-skill-training-skill="${escAttr(skillId)}" class="skill-training-action-v314dz21 ${mode.className}">
        <span>${entry.icon}</span><div><div class="skill-training-action-top-v314dz21"><strong>${esc(entry.label)}</strong><em>${mode.label}</em></div><small>${esc(entry.detail)}</small>${inline ? `<u>${esc(mode.note)}</u>` : ""}</div><b>›</b>
      </button>`;
    }).join("");
  }

  function trainingBodyMarkup(skillId, { inline = false } = {}) {
    const item = SKILL_BY_ID[skillId];
    if (!item) return "";
    const info = levelInfo(totalsBySkill()[skillId] || 0);
    const actions = TRAINING_ACTIONS[skillId] || [];
    return `${skillProgressMarkup(item, info, inline)}
      ${japaneseStatusMarkup(item)}
      <section class="skill-training-actions-v314dz20 ${inline ? "is-inline-v314dz21" : ""}"><p class="eyebrow">TRAIN ${esc(item.label.toUpperCase())}</p><p class="skill-training-help-dz25">Diese Aktionen trainieren den oben ausgewählten Skill. Sie sind keine zusätzlichen Skills. Schulcockpit-Abschlüsse werden automatisch zugeordnet.</p>
        ${trainingActionsMarkup(skillId, actions, { inline })}
      </section>`;
  }

  function openTrainingGuide(skillId) {
    const item = SKILL_BY_ID[skillId];
    if (!item) return false;
    ensureTrainingDialog();
    const dialog = document.getElementById("skillTrainingDialogV314dz20");
    const title = document.getElementById("skillTrainingTitleV314dz20");
    const body = document.getElementById("skillTrainingBodyV314dz20");
    if (!dialog || !title || !body) return false;
    title.textContent = item.label;
    body.innerHTML = trainingBodyMarkup(skillId);
    dialog.dataset.skillId = skillId;
    if (!dialog.open) dialog.showModal?.();
    return true;
  }

  function runTrainingAction(index, explicitSkillId = "") {
    const dialog = document.getElementById("skillTrainingDialogV314dz20");
    const skillId = explicitSkillId || dialog?.dataset.skillId || activeTalentSkillId || "";
    const entry = TRAINING_ACTIONS[skillId]?.[Number(index)];
    if (!entry) return false;
    if (dialog?.open) dialog.close?.();
    try { entry.run?.(); return true; }
    catch (error) { console.warn("Skill training action could not open", error); openSkillsView(); return false; }
  }

  function openWeekLog() {
    app.showView?.("week");
    window.setTimeout(() => document.querySelector('[data-week-mode="log"]')?.click(), 80);
  }

  function openJapanesePractice(mode = "listening") {
    app.showView?.("hub-play");
    window.setTimeout(() => {
      document.getElementById("japanesePracticeLibraryPanel")?.scrollIntoView?.({ behavior:"smooth", block:"start" });
      const first = window.LifeRPGJapanesePractice?.eligibleItems?.()?.find(item => (item.practiceModes || []).includes(mode));
      if (first) app.showToast?.(`${mode === "mining" ? "Mining" : "Listening"} route ready · choose a saved item or start ${first.title}.`);
    }, 120);
  }

  function openKotobaPanel() {
    app.showView?.("hub-play");
    window.setTimeout(() => document.getElementById("kotobaIntegrationPanel")?.scrollIntoView?.({ behavior:"smooth", block:"start" }), 120);
  }

  function openHabitForSkill(skillId) {
    app.showView?.("habits");
    window.setTimeout(() => {
      document.getElementById("addHabitButton")?.click?.();
      window.setTimeout(() => {
        const select = document.getElementById("habitSkill");
        if (select && SKILL_BY_ID[skillId]) select.value = skillId;
      }, 60);
    }, 80);
  }


  function openSkillsView() {
    app.showView?.("skills");
    // Defensive routing guard for dynamically-added views: only Skills may stay active.
    document.querySelectorAll(".view").forEach(view => {
      view.classList.toggle("active", view.id === "view-skills");
    });
    document.querySelectorAll(".nav-button").forEach(button => {
      button.classList.toggle("active", button.dataset.view === "skills");
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function injectHabitSkillField() {
    if (document.getElementById("habitSkill")) return;
    const form = document.getElementById("habitForm");
    const realm = document.getElementById("habitRealm");
    const effort = document.getElementById("habitEffort");
    const grid = realm?.closest?.(".form-grid") || effort?.closest?.(".form-grid");
    if (!form || !grid) return;
    const label = document.createElement("label");
    label.className = "habit-skill-field-v314aa";
    label.innerHTML = `Skill <select id="habitSkill"></select><small class="field-help-v131">One completion trains at most one skill. “No specific skill” is always valid.</small>`;
    grid.insertAdjacentElement("afterend", label);
    refreshHabitSkillOptions({ keepCurrent: false });
  }

  function refreshHabitSkillOptions({ keepCurrent = true } = {}) {
    const select = document.getElementById("habitSkill");
    if (!select) return;
    const current = keepCurrent ? select.value : "";
    select.innerHTML = `<option value="">No specific skill</option>` + Object.keys(REALMS).map(realm => {
      const options = (SKILLS_BY_REALM[realm] || []).map(item => `<option value="${escAttr(item.id)}">${esc(item.icon)} ${esc(item.label)}</option>`).join("");
      return `<optgroup label="${esc(REALMS[realm].icon)} ${esc(realm)}">${options}</optgroup>`;
    }).join("");
    if (current && SKILL_BY_ID[current]) select.value = current;
  }

  function syncHabitDialogFromCurrent() {
    const select = document.getElementById("habitSkill");
    const editId = document.getElementById("habitEditId")?.value || "";
    if (!select) return;
    refreshHabitSkillOptions({ keepCurrent: false });
    const habit = (app.getState().habits?.items || []).find(item => item?.id === editId);
    if (validSkillId(habit?.skillId)) select.value = habit.skillId;
    else {
      select.value = "";
      suggestHabitSkillIfEmpty();
    }
  }

  function suggestHabitSkillIfEmpty() {
    const select = document.getElementById("habitSkill");
    if (!select || select.value) return;
    const name = document.getElementById("habitName")?.value || "";
    const realm = document.getElementById("habitRealm")?.value || "";
    const suggested = suggestHabitSkill({ name, realm });
    if (suggested) select.value = suggested;
  }

  function captureHabitSkillBeforeSave() {
    const select = document.getElementById("habitSkill");
    if (!select) return;
    const editId = document.getElementById("habitEditId")?.value || "";
    const name = String(document.getElementById("habitName")?.value || "").trim();
    const selected = validSkillId(select.value) || null;
    const capturedAt = Date.now();
    window.setTimeout(() => {
      const items = app.getState().habits?.items || [];
      let habit = editId ? items.find(item => item?.id === editId) : null;
      if (!habit) {
        habit = [...items]
          .filter(item => item?.name === name && Number(item.createdAt || 0) >= capturedAt - 5000)
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0] || null;
      }
      if (!habit) return;
      habit.skillId = selected;
      habit.skillMappingConfirmed = true;
      app.saveState({ source: "habit-skill-map" });
      reconcile({ persist: true, reason: "habit-skill-map" });
      render();
    }, 0);
  }

  function suggestHabitSkill(habit) {
    const name = String(habit?.name || "").toLowerCase();
    const realm = String(habit?.realm || "");
    if (/skin.?care|hair oil|hair mask|face mask|teeth|dental|floss|pflege/.test(name)) return "personal-care";
    if (/gym|workout|strength|sport|training|run|jog/.test(name)) return "physical-vitality";
    if (/stretch|mobility|yoga|walk|spazier|beweg/.test(name)) return "movement-body-care";
    if (/journal|reflect|review|check.?in|gratitude|dankbar/.test(name)) return "reflection-self-awareness";
    if (/japanese|japanisch|kotoba|bunpro|kanji|vocab|grammar/.test(name)) return "language-learning";
    if (/lesson plan|unterricht.*plan|vorbereit/.test(name)) return "lesson-design-preparation";
    if (/grading|correction|korrig|bewert/.test(name)) return "assessment-feedback";
    if (/teach|unterricht|vertretung/.test(name)) return "teaching-facilitation";
    if (/deep work|focus|fokus/.test(name)) return "focus-concentration";
    if (/laundry|wäsche|spülmaschine|geschirr|einkauf/.test(name)) return "home-routines";
    if (/clean|put away|declutter|aufräum|haushalt|zimmer|schreibtisch|putzen/.test(name)) return "home-tidying";
    if (/paper|papier|organisier|termin|bürokratie/.test(name)) return "life-management";
    if (/crochet|knit|sew|craft|bastel|häkel|strick/.test(name)) return "craft-making";
    if (/makeup|hair style|hairstyle|styling/.test(name)) return "style-visual-design";
    if (/game|gaming|read for fun|lesen.*spaß/.test(name)) return "recreation-play";
    if (/meditat|breath|body scan|grounding/.test(name)) return "recovery-regulation";
    if (/ruhe|rest|pause|powernap|ausruhen/.test(name)) return "recovery-rest";
    if (/unwind|abschalt|feierabend|entspannungszeit/.test(name)) return "recovery-unwinding";
    if (realm === "Japanese") return "language-learning";
    return null;
  }

  function saveHabitMapping(habitId) {
    const habit = (app.getState().habits?.items || []).find(item => item?.id === habitId);
    const select = document.querySelector(`[data-skill-map-select="${cssEscape(habitId)}"]`);
    if (!habit || !select) return;
    habit.skillId = validSkillId(select.value) || null;
    habit.skillMappingConfirmed = true;
    app.saveState({ source: "habit-skill-map" });
    reconcile({ persist: true, reason: "habit-skill-map" });
    render();
    app.showToast?.(`${habit.name} · skill mapping saved.`);
  }

  function applyHabitSuggestionsToForm() {
    document.querySelectorAll("[data-skill-map-select]").forEach(select => {
      if (select.value) return;
      const habit = (app.getState().habits?.items || []).find(item => item?.id === select.dataset.skillMapSelect);
      const suggested = suggestHabitSkill(habit);
      if (suggested) select.value = suggested;
    });
  }

  function render() {
    if (!document.getElementById("view-skills")) return;
    const totals = totalsBySkill();
    renderSummary(totals);
    renderHabitMapping();
    renderTalentHub();
    renderRealms(totals);
    renderRecent();
    renderSkillFeedbackNotice();
  }

  function renderSummary(totals) {
    const container = document.getElementById("skillsSummary");
    if (!container) return;
    const discovered = SKILLS.filter(item => Number(totals[item.id] || 0) > 0).length;
    const totalXP = round2(Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0));
    const pointRows = Object.keys(REALMS).map(realm => realmPointInfo(realm, totals));
    const availablePoints = pointRows.reduce((sum, row) => sum + row.available, 0);
    const spentPoints = pointRows.reduce((sum, row) => sum + row.spent, 0);
    const treeNodes = [...document.querySelectorAll("#skillsTalentTreePanels article.is-bought, #skillsTalentTreePanels article.is-available, #skillsTalentTreePanels article.is-short, #skillsTalentTreePanels article.is-locked, #skillsTalentTreePanels article.is-owned, #skillsTalentTreePanels article.is-ready, #skillsTalentTreePanels article.is-poor")];
    const unlockedNodes = treeNodes.filter(node => node.classList.contains("is-bought") || node.classList.contains("is-owned")).length;
    container.innerHTML = `
      <article><small>DISCOVERED</small><strong>${discovered} / ${SKILLS.length}</strong><span>Skills with observed practice</span></article>
      <article><small>PRACTICE XP</small><strong>${formatXp(totalXP)}</strong><span>Skill XP from observable actions</span></article>
      <article><small>REALM POINTS</small><strong>${availablePoints}</strong><span>available · ${spentPoints} already spent</span></article>
      <article><small>TALENT TREES</small><strong>${unlockedNodes} / ${treeNodes.length || "—"}</strong><span>unlocks across all seven Realms</span></article>`;
  }

  function renderHabitMapping() {
    const container = document.getElementById("skillsHabitMapping");
    if (!container) return;
    const habits = (app.getState().habits?.items || []).filter(item => item && item.active !== false);
    if (!habits.length) {
      container.innerHTML = "";
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    const unmapped = habits.filter(item => item.skillMappingConfirmed !== true);
    if (!unmapped.length) {
      container.innerHTML = "";
      container.classList.add("hidden");
      return;
    }
    container.innerHTML = `
      <div class="skills-map-head-v314aa"><div><p class="eyebrow">ONE-TIME SETUP</p><h2>Map your existing habits</h2><p>${unmapped.length} active habit${unmapped.length === 1 ? "" : "s"} still need a Skill decision. Suggestions stay suggestions until you save them.</p></div><button class="secondary-button" data-skill-map-suggest-all type="button">Fill obvious suggestions</button></div>
      <div class="skills-map-grid-v314aa">${unmapped.map(habitMappingRow).join("")}</div>`;
  }

  function habitMappingRow(habit) {
    const suggested = suggestHabitSkill(habit);
    const selected = validSkillId(habit.skillId) || suggested || "";
    return `<article class="skills-map-row-v314aa"><div><span>${esc(REALMS[habit.realm]?.icon || "✦")}</span><div><strong>${esc(habit.name || "Habit")}</strong><small>${esc(habit.realm || "No Realm")} · ${esc(habit.effort || "low")} effort${suggested ? ` · suggested: ${esc(SKILL_BY_ID[suggested].label)}` : ""}</small></div></div><select data-skill-map-select="${escAttr(habit.id)}">${skillOptions(selected)}</select><button class="primary-button" data-skill-map-save="${escAttr(habit.id)}" type="button">Save</button></article>`;
  }

  function skillOptions(selected = "") {
    return `<option value="">No specific skill</option>` + Object.keys(REALMS).map(realm => `<optgroup label="${esc(REALMS[realm].icon)} ${esc(realm)}">${(SKILLS_BY_REALM[realm] || []).map(item => `<option value="${escAttr(item.id)}" ${item.id === selected ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</optgroup>`).join("");
  }

  function renderTalentHub() {
    const tabs = document.getElementById("skillsTalentTabs");
    const panels = document.getElementById("skillsTalentTreePanels");
    const empty = document.getElementById("skillsTalentEmpty");
    const meta = document.getElementById("skillsTalentMeta");
    if (!tabs || !panels || !empty) return;

    const treeSections = [...panels.querySelectorAll("[data-skill-tree-realm]")];
    const builtRealms = new Set(treeSections.map(section => section.dataset.skillTreeRealm));

    if (!REALMS[activeTalentRealm] || (!builtRealms.has(activeTalentRealm) && builtRealms.size)) {
      activeTalentRealm = builtRealms.has("Knowledge") ? "Knowledge" : [...builtRealms][0];
    }

    tabs.innerHTML = Object.keys(REALMS).map(realm => {
      const section = treeSections.find(item => item.dataset.skillTreeRealm === realm);
      const progress = treeProgress(section);
      const points = realmPointInfo(realm);
      const active = activeTalentRealm === realm;
      return `<button type="button" role="tab" data-skill-tree-tab="${escAttr(realm)}" aria-selected="${active ? "true" : "false"}" aria-controls="${section?.id || "skillsTalentEmpty"}" tabindex="${active ? "0" : "-1"}" class="${active ? "active" : ""}"><span>${REALMS[realm].icon}</span><strong>${esc(realm)}</strong><small>${points.available} avail · ${progress.total ? `${progress.unlocked}/${progress.total}` : "—"}</small></button>`;
    }).join("");

    treeSections.forEach(section => {
      const active = section.dataset.skillTreeRealm === activeTalentRealm;
      section.classList.toggle("hidden", !active);
      section.setAttribute("role", "tabpanel");
      section.setAttribute("aria-hidden", active ? "false" : "true");
      decorateTreeStates(section, section.dataset.skillTreeRealm);
    });

    const activeTree = treeSections.find(section => section.dataset.skillTreeRealm === activeTalentRealm);
    empty.classList.toggle("hidden", Boolean(activeTree));
    if (!activeTree) {
      const realmMeta = REALMS[activeTalentRealm] || { icon: "✦" };
      empty.innerHTML = `<span>${realmMeta.icon}</span><div><strong>${esc(activeTalentRealm)} Talent Tree</strong><p>The Skill progression is active. This Realm tree is not registered in this build.</p></div>`;
    }

    if (meta) meta.innerHTML = talentMetaMarkup(activeTalentRealm, activeTree);
    renderTalentSkillRail(totalsBySkill());
    renderSummary(totalsBySkill());
  }

  function defaultSkillForRealm(realm, totals = totalsBySkill()) {
    const skills = SKILLS_BY_REALM[realm] || [];
    if (!skills.length) return null;
    return skills.slice().sort((a,b) => {
      const ai = levelInfo(totals[a.id] || 0), bi = levelInfo(totals[b.id] || 0);
      const ar = Math.max(0, Number(ai.required || 0) - Number(ai.intoLevel || 0));
      const br = Math.max(0, Number(bi.required || 0) - Number(bi.intoLevel || 0));
      return ar - br || Number(bi.level || 0) - Number(ai.level || 0) || a.label.localeCompare(b.label);
    })[0]?.id || skills[0].id;
  }

  function renderTalentSkillRail(totals = totalsBySkill()) {
    const head = document.getElementById("skillsTalentSkillRailHeadV314dz21");
    const list = document.getElementById("skillsTalentSkillListV314dz21");
    const detail = document.getElementById("skillsTalentSkillDetailV314dz21");
    if (!head || !list || !detail) return;
    const skills = SKILLS_BY_REALM[activeTalentRealm] || [];
    if (!skills.length) {
      head.innerHTML = `<p class="eyebrow">SKILLS</p><h3>${esc(activeTalentRealm)}</h3>`;
      list.innerHTML = "";
      detail.innerHTML = `<p class="muted">No Skills registered for this Realm yet.</p>`;
      return;
    }
    if (SKILL_BY_ID[activeTalentSkillId]?.realm !== activeTalentRealm) activeTalentSkillId = defaultSkillForRealm(activeTalentRealm, totals);
    const points = realmPointInfo(activeTalentRealm, totals);
    head.innerHTML = `<div><p class="eyebrow">${esc(activeTalentRealm.toUpperCase())} · SKILLS</p><h3>${esc(activeTalentRealm)} Skills</h3><p>Wähle einen der bestehenden Skills. Darunter erscheinen dessen Fortschritt und konkrete Trainingsaktionen — keine zweite Skill-Liste.</p></div><span>${points.available} pt${points.available === 1 ? "" : "s"} ready</span>`;
    list.innerHTML = skills.map(item => {
      const info = levelInfo(totals[item.id] || 0);
      const remaining = Math.max(0, Number(info.required || 0) - Number(info.intoLevel || 0));
      const selected = item.id === activeTalentSkillId;
      return `<button type="button" data-talent-skill-select="${escAttr(item.id)}" class="skills-talent-skill-chip-v314dz21 ${selected ? "is-selected" : ""}"><span>${item.icon}</span><div><strong>${esc(item.label)}</strong><small>Lv. ${info.level} · ${formatXp(remaining)} XP to next level</small><i><b style="width:${Number(info.percent || 0).toFixed(2)}%"></b></i></div><em>${selected ? "Training ↓" : "Open"}</em></button>`;
    }).join("");
    detail.innerHTML = activeTalentSkillId ? trainingBodyMarkup(activeTalentSkillId, { inline: true }) : "";
  }

  function treeProgress(section) {
    if (!section) return { unlocked: 0, total: 0, totalCost: 0 };
    const nodes = [...section.querySelectorAll("article.is-bought, article.is-available, article.is-short, article.is-locked")];
    return nodes.reduce((out, node) => {
      const ranked = node.hasAttribute("data-talent-max-rank");
      const maxRank = ranked ? Math.max(1, Number(node.dataset.talentMaxRank || 1)) : 1;
      const currentRank = ranked ? Math.max(0, Math.min(maxRank, Number(node.dataset.talentCurrentRank || 0))) : (node.classList.contains("is-bought") ? 1 : 0);
      const fullCost = Math.max(0, Number(node.dataset.talentFullCost || 0)) || (nodeCost(node) * maxRank);
      out.unlocked += currentRank;
      out.total += maxRank;
      out.totalCost += fullCost;
      return out;
    }, { unlocked: 0, total: 0, totalCost: 0 });
  }

  function nodeCost(node) {
    const explicit = Math.max(0, Number(node?.dataset?.talentNextCost || 0));
    if (explicit) return explicit;
    const text = node?.querySelector("small")?.textContent || "";
    const match = text.match(/(\d+)\s*POINT/i);
    return Math.max(0, Number(match?.[1] || 0));
  }

  function talentMetaMarkup(realm, section) {
    const points = realmPointInfo(realm);
    const progress = treeProgress(section);
    const ready = section?.querySelector("article.is-available");
    const short = section?.querySelector("article.is-short");
    const next = ready || short;
    const nextTitle = next?.querySelector("h3")?.textContent?.trim() || "";
    const nextCost = nodeCost(next);
    const nextCopy = progress.total && progress.unlocked >= progress.total
      ? "Tree complete · extra points stay banked for future expansions"
      : ready
        ? `Ready now: ${nextTitle} · ${nextCost} pt${nextCost === 1 ? "" : "s"}`
        : short
          ? `Next: ${nextTitle} · ${Math.max(0, nextCost - points.available)} more pt${Math.max(0, nextCost - points.available) === 1 ? "" : "s"} needed`
          : "Choose a connected branch to reveal the next unlock";

    const sourceBits = [
      `${points.earnedFromSkills} from Skill levels`,
      `${points.earnedFromRealmRank} from Realm ranks`,
      points.breadth ? `${points.breadth} from breadth` : null,
      points.bonus ? `${points.bonus} bonus` : null
    ].filter(Boolean);

    return `<div class="skills-talent-meta-main-v314ah"><span>${REALMS[realm]?.icon || "✦"}</span><div><small>${esc(realm.toUpperCase())} TREE</small><strong>${points.available} available · ${points.spent} spent${progress.totalCost ? ` · ${progress.totalCost} pts full tree` : ""}</strong><em>${esc(nextCopy)}</em></div></div><div class="skills-point-source-v314ah"><span>${sourceBits.map(esc).join(" · ")}</span><small>Realm Rank ${points.realmRank} · free respec</small></div>`;
  }

  function decorateTreeStates(section, realm) {
    if (!section || treeDecoratorBusy) return;
    treeDecoratorBusy = true;
    try {
      const availablePoints = realmPointInfo(realm).available;
      section.querySelectorAll("article.is-bought, article.is-available, article.is-short, article.is-locked").forEach(node => {
        const cost = nodeCost(node);
        const status = node.classList.contains("is-bought") ? "owned"
          : node.classList.contains("is-available") ? "ready"
          : node.classList.contains("is-short") ? "short"
          : "locked";
        const missing = Math.max(0, cost - availablePoints);
        const label = status === "owned" ? "✓ Unlocked"
          : status === "ready" ? "✦ Ready"
          : status === "short" ? `Need ${missing} more pt${missing === 1 ? "" : "s"}`
          : "Path locked";
        const copy = node.querySelector('[class*="-node-copy-"]') || node.querySelector("div:nth-child(2)");
        let badge = node.querySelector(".skills-node-state-v314ah");
        if (!badge && copy) {
          badge = document.createElement("span");
          badge.className = `skills-node-state-v314ah is-${status}`;
          copy.insertAdjacentElement("afterbegin", badge);
        }
        if (badge) {
          const nextClass = `skills-node-state-v314ah is-${status}`;
          if (badge.className !== nextClass) badge.className = nextClass;
          if (badge.textContent !== label) badge.textContent = label;
        }
        const button = node.querySelector(":scope > button");
        const buttonLabel = node.classList.contains("talent-v2-node") ? null : (status === "short" ? label : status === "locked" ? "Unlock connected path first" : null);
        if (button && buttonLabel && button.textContent !== buttonLabel) button.textContent = buttonLabel;
      });
    } finally {
      treeDecoratorBusy = false;
    }
  }

  function scheduleTreeDecorate() {
    if (treeDecoratorBusy) return;
    window.clearTimeout(treeDecoratorTimer);
    treeDecoratorTimer = window.setTimeout(() => {
      const panels = document.getElementById("skillsTalentTreePanels");
      panels?.querySelectorAll("[data-skill-tree-realm]").forEach(section => decorateTreeStates(section, section.dataset.skillTreeRealm));
      const active = panels?.querySelector(`[data-skill-tree-realm="${cssEscape(activeTalentRealm)}"]`);
      const meta = document.getElementById("skillsTalentMeta");
      if (meta) meta.innerHTML = talentMetaMarkup(activeTalentRealm, active);
      const tabs = document.getElementById("skillsTalentTabs");
      if (tabs && !treeDecoratorBusy) {
        Object.keys(REALMS).forEach(realm => {
          const button = tabs.querySelector(`[data-skill-tree-tab="${cssEscape(realm)}"]`);
          const section = panels?.querySelector(`[data-skill-tree-realm="${cssEscape(realm)}"]`);
          const progress = treeProgress(section);
          const points = realmPointInfo(realm);
          const small = button?.querySelector("small");
          if (small) small.textContent = `${points.available} avail · ${progress.total ? `${progress.unlocked}/${progress.total}` : "—"}`;
        });
      }
    }, 40);
  }

  function observeTalentTrees() {
    const panels = document.getElementById("skillsTalentTreePanels");
    if (!panels || treeObserver) return;
    treeObserver = new MutationObserver(() => scheduleTreeDecorate());
    treeObserver.observe(panels, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  function selectTalentRealm(realm, { scroll = true } = {}) {
    if (!REALMS[realm]) return;
    activeTalentRealm = realm;
    if (SKILL_BY_ID[activeTalentSkillId]?.realm !== realm) activeTalentSkillId = null;
    renderTalentHub();
    if (scroll) {
      const hub = document.getElementById("skillsTalentHub");
      const rect = hub?.getBoundingClientRect?.();
      if (hub && rect && (rect.top < -8 || rect.top > window.innerHeight * .55)) hub.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function registerTalentTree(realm, section) {
    const panels = document.getElementById("skillsTalentTreePanels");
    if (!panels || !(section instanceof HTMLElement) || !REALMS[realm]) return false;
    section.dataset.skillTreeRealm = realm;
    section.classList.add("skills-talent-tree-panel-v314ag");
    panels.appendChild(section);
    renderTalentHub();
    scheduleTreeDecorate();
    return true;
  }

  function renderRealms(totals) {
    const container = document.getElementById("skillsRealmGrid");
    if (!container) return;
    container.innerHTML = Object.keys(REALMS).map(realm => {
      const meta = REALMS[realm];
      const points = realmPointInfo(realm, totals);
      const rank = app.getRealmRankInfo?.(realm);
      const cards = (SKILLS_BY_REALM[realm] || []).map(item => skillCard(item, totals[item.id] || 0)).join("");
      const sourceLine = [
        `${points.earnedFromSkills} skill`,
        `${points.earnedFromRealmRank} rank`,
        points.breadth ? `${points.breadth} breadth` : null,
        points.bonus ? `${points.bonus} bonus` : null
      ].filter(Boolean).join(" · ");
      return `<section class="skills-realm-v314aa"><header><div><span>${meta.icon}</span><div><small>REALM · RANK ${rank?.level || 1}</small><h2>${esc(meta.label)}</h2></div></div><div class="skills-points-v314aa"><strong>${points.available}</strong><span>point${points.available === 1 ? "" : "s"} available · ${points.spent} spent</span><small>${esc(sourceLine)}</small><button class="skills-realm-tree-link-v314ah" type="button" data-skill-tree-tab="${escAttr(realm)}">Open ${esc(realm)} tree ↑</button></div></header><div class="skills-card-grid-v314aa">${cards}</div></section>`;
    }).join("");
  }

  function skillCard(item, totalXP) {
    const info = levelInfo(totalXP);
    const levelLabel = info.discovered ? `Lv. ${info.level}` : "Not yet trained";
    const earnedPoints = pointsFromSkillLevel(info.level);
    const pointText = info.discovered
      ? `${earnedPoints} pt${earnedPoints === 1 ? "" : "s"} earned · next +1 at Lv. ${info.level + 1}`
      : "First qualifying practice discovers this skill";
    return `<button type="button" data-skill-train="${escAttr(item.id)}" class="skill-card-v314aa skill-card-trainable-v314dz20 ${info.discovered ? "is-discovered" : "is-undiscovered"}"><div class="skill-card-head-v314aa"><span>${item.icon}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.description)}</small></div><b>${levelLabel}</b></div><div class="skill-progress-v314aa"><i><b style="width:${info.percent.toFixed(2)}%"></b></i><div><span>${formatXp(info.intoLevel)} / ${formatXp(info.required)} Skill XP</span><em>${esc(pointText)} · Train ›</em></div></div></button>`;
  }

  function renderRecent() {
    const container = document.getElementById("skillsRecentPractice");
    if (!container) return;
    const rows = [...state().events].sort((a, b) => eventTime(b) - eventTime(a)).slice(0, 10);
    const summary = document.getElementById("skillsRecentSummary");
    if (!rows.length) {
      if (summary) summary.textContent = "No practice yet";
      container.innerHTML = `<div class="skills-empty-v314aa"><span>✦</span><div><strong>No Skill practice derived yet.</strong><small>Existing ambiguous logs stay untouched instead of being guessed.</small></div></div>`;
      return;
    }
    if (summary) {
      const latest = rows[0];
      const meta = SKILL_BY_ID[latest.skillId];
      summary.textContent = `${meta?.label || "Skill"} · +${formatXp(latest.xp)} XP`;
    }
    container.innerHTML = rows.map(event => {
      const meta = SKILL_BY_ID[event.skillId];
      return `<article><span>${meta?.icon || "✦"}</span><div><strong>${esc(meta?.label || event.skillId)}</strong><small>${esc(event.label)} · ${esc(sourceLabel(event.source))} · ${esc(formatDateTime(event.at))}</small></div><b>+${formatXp(event.xp)}</b></article>`;
    }).join("");
  }

  function sourceLabel(source) {
    return ({ time: "Focus & Time", habit: "Habit", "daily-checkin": "Daily Check-in", "journal-reflection": "Journal", book: "Library", game: "Games", quest: "Quest", sudoku: "Sudoku", "sudoku-replay": "Sudoku", nonogram: "Nonogram", "nonogram-replay": "Nonogram", "number-sense": "Number Sense", "number-sense-replay": "Number Sense", "memory-garden": "Memory Garden", "memory-garden-replay": "Memory Garden", "lexicon-calibration": "Lexicon Calibration", "lexicon-daily-word": "Daily Word", "lexicon-crossword": "Lexicon Lab", "kotoba-quick-review": "Kotoba / Quick Japanese", "kotoba-dungeon": "Kotoba Dungeon", "japanese-practice": "Japanese Practice", "weekly-review": "Weekly Review", "weekly-review-depth": "Weekly Review", "work-deep-brief": "Work Deep Brief", "schulcockpit-completion": "Schulcockpit", "steam-playtime": "Steam Playtime" })[source] || source || "Practice";
  }

  function validSkillId(value) { return value && SKILL_BY_ID[value] ? value : null; }
  function round2(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function timestamp(value) { const n = typeof value === "number" ? value : new Date(value || 0).getTime(); return Number.isFinite(n) && n > 0 ? n : 0; }
  function normalizeAt(value) { const t = timestamp(value); return new Date(t || Date.now()).toISOString(); }
  function eventTime(event) { return timestamp(event?.at); }
  function dateAtNoon(key) { return key ? `${key}T12:00:00` : new Date().toISOString(); }
  function timeLabel(entry) { return [entry.categoryId, entry.subcategory].filter(Boolean).join(" · ") || "Time practice"; }
  function formatXp(value) { const n = round2(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function formatDateTime(value) { const d = new Date(value || 0); return Number.isFinite(d.getTime()) ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Saved"; }
  function eventSignature(events) { return `${events.length}|${events.reduce((sum, event) => sum + Number(event.xp || 0), 0).toFixed(2)}|${events.at(-1)?.id || ""}`; }
  function eventsEquivalent(a, b) {
    if (!Array.isArray(a) || a.length !== b.length) return false;
    for (let i = 0; i < b.length; i += 1) {
      if (a[i]?.id !== b[i]?.id || a[i]?.skillId !== b[i]?.skillId || Number(a[i]?.xp || 0) !== Number(b[i]?.xp || 0) || a[i]?.at !== b[i]?.at) return false;
    }
    return true;
  }
  function cssEscape(value) { return window.CSS?.escape ? window.CSS.escape(String(value || "")) : String(value || "").replace(/["\\]/g, "\\$&"); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGSkills = {
    version: VERSION,
    registry: SKILLS.map(item => ({ ...item })),
    getSkill: id => SKILL_BY_ID[id] ? { ...SKILL_BY_ID[id] } : null,
    getTotals: () => ({ ...totalsBySkill() }),
    getLevelInfo: id => levelInfo(totalsBySkill()[id] || 0),
    getRealmPoints: realm => ({ ...realmPointInfo(realm) }),
    getBreadthPoints: realm => ({ ...breadthPointInfo(realm) }),
    getRealmRankPoints: realm => ({ ...realmRankPointInfo(realm) }),
    timeXp,
    reflectionXp,
    registerTalentTree,
    refreshTalentHub: renderTalentHub,
    selectTalentRealm,
    rebuild: () => reconcile({ persist: true, reason: "skills-api-rebuild", force: true }),
    openTrainingGuide,
    open: () => { openSkillsView(); render(); }
  };
})();

