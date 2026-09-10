(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const skills = window.LifeRPGSkills;
  if (!app?.getState || !app?.saveState || !skills?.getRealmPoints) {
    console.error("Life RPG Work Talent Tree could not initialize because Skills are unavailable.");
    return;
  }

  const VERSION = "0.31.4af";
  const SCHEMA = 1;
  const REALM = "Work";
  const WORK_SKILLS = [
    "teaching-facilitation",
    "lesson-design-preparation",
    "assessment-feedback",
    "professional-organization",
    "focus-concentration"
  ];

  const NODES = [
    node("workbench", "Workbench", "✦", 1, 0, "core", [], "Adds a compact Work console with today's actual load, recent practice and direct focus starts. It does not create extra obligations."),
    node("classroom-rhythm", "Classroom Rhythm", "🧑‍🏫", 1, 1, "teaching", ["workbench"], "Quick clock-ins for Teaching and Substitution, plus recent Teaching & Facilitation practice."),
    node("lesson-flow", "Lesson Flow", "🗂️", 1, 1, "planning", ["workbench"], "Adds one-tap Lesson Planning and Preparation focus blocks and keeps recent planning sessions close at hand."),
    node("feedback-desk", "Feedback Desk", "✓", 1, 1, "assessment", ["workbench"], "Adds correction-focused 25/5 and 50/10 starts with recent Assessment & Feedback context."),
    node("admin-dock", "Admin Dock", "📋", 1, 1, "organization", ["workbench"], "Quick starts for Work Admin, School Admin and Conference / Meeting time so practical work does not disappear from the log."),
    node("focus-lens", "Focus Lens", "🎯", 1, 1, "focus", ["workbench"], "Shows Focus & Concentration practice and today's actual work load together instead of treating every day as fresh capacity."),
    node("threadkeeper", "Threadkeeper", "⌁", 2, 2, "planning", ["lesson-flow"], "Save one concrete next work step with its type and preferred session length, then resume it from the tree later."),
    node("batch-mode", "Batch Mode", "▦", 2, 2, "assessment", ["feedback-desk", "admin-dock"], "Adds bounded correction/admin presets so repetitive work can be started without rebuilding the timer setup each time."),
    node("capacity-guard", "Capacity Guard", "◇", 2, 2, "focus", ["focus-lens"], "Uses today's logged work and Daily Check-in only to choose a gentler default work-block size. It never blocks a manual choice."),
    node("classroom-continuity", "Classroom Continuity", "↟", 2, 2, "teaching", ["classroom-rhythm", "lesson-flow"], "Shows the latest teaching and preparation threads together so returning to school work takes less reconstruction."),
    node("sustainable-craft", "Sustainable Craft", "✺", 4, 3, "core", ["threadkeeper", "batch-mode", "capacity-guard", "classroom-continuity"], "Unlocks a weekly Work compass: all five Work skills, real time, recovery/play alongside work, and a direct route into the Weekly Review. No weekly quota and no bonus for working longer.")
  ];

  const NODE_BY_ID = Object.fromEntries(NODES.map(item => [item.id, item]));
  const NEXT_STEP_TYPES = {
    "lesson-planning": { label: "Lesson planning", categoryId: "work_home", subcategory: "Lesson planning", mode: "focus", breakMinutes: 5 },
    preparation: { label: "Preparation", categoryId: "work_home", subcategory: "Preparation", mode: "focus", breakMinutes: 5 },
    grading: { label: "Grading / corrections", categoryId: "work_home", subcategory: "Grading / corrections", mode: "focus", breakMinutes: 5 },
    "deep-work": { label: "Deep work", categoryId: "focus", subcategory: "Deep work", mode: "focus", breakMinutes: 5 },
    "work-admin": { label: "Work admin", categoryId: "work_home", subcategory: "Admin", mode: "focus", breakMinutes: 0 },
    "school-admin": { label: "School admin", categoryId: "school", subcategory: "School admin", mode: "clock", breakMinutes: 0 },
    conference: { label: "Conference / meeting", categoryId: "school", subcategory: "Conference / meeting", mode: "clock", breakMinutes: 0 },
    teaching: { label: "Teaching", categoryId: "school", subcategory: "Teaching", mode: "clock", breakMinutes: 0 },
    substitution: { label: "Substitution", categoryId: "school", subcategory: "Substitution", mode: "clock", breakMinutes: 0 }
  };

  let renderTimer = null;
  let showOptionalWorkToday = false;

  init();

  function node(id, title, icon, cost, tier, branch, requires, effect) {
    return { id, title, icon, cost, tier, branch, requires, effect };
  }

  function init() {
    const changed = ensureState();
    injectTree();
    bind();
    if (changed) app.saveState({ source: "work-tree-init" });
    render();
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      version: VERSION,
      purchases: {},
      nextStep: null,
      migrations: { initialWorkTreeV1: true }
    };
  }

  function ensureState() {
    const root = app.getState();
    let changed = false;
    if (!root.workTalentTree || typeof root.workTalentTree !== "object" || Array.isArray(root.workTalentTree)) {
      root.workTalentTree = defaults();
      changed = true;
    }
    const model = root.workTalentTree;
    if (Number(model.schemaVersion || 0) < SCHEMA) { model.schemaVersion = SCHEMA; changed = true; }
    if (!model.purchases || typeof model.purchases !== "object" || Array.isArray(model.purchases)) { model.purchases = {}; changed = true; }
    if (!model.migrations || typeof model.migrations !== "object" || Array.isArray(model.migrations)) { model.migrations = {}; changed = true; }
    model.version = VERSION;

    Object.keys(model.purchases).forEach(id => {
      if (!NODE_BY_ID[id] || !Number.isFinite(Number(model.purchases[id]))) {
        delete model.purchases[id];
        changed = true;
      }
    });

    if (model.nextStep && typeof model.nextStep === "object") {
      const type = NEXT_STEP_TYPES[model.nextStep.type] ? model.nextStep.type : "deep-work";
      const label = clean(model.nextStep.label).slice(0, 180);
      const minutes = clamp(Math.round(Number(model.nextStep.minutes || 25)), 10, 180);
      model.nextStep = label ? { type, label, minutes, updatedAt: Number(model.nextStep.updatedAt || Date.now()) } : null;
    } else if (model.nextStep != null) {
      model.nextStep = null;
      changed = true;
    }

    if (!root.skills || typeof root.skills !== "object") root.skills = {};
    if (!root.skills.spentPointsByRealm || typeof root.skills.spentPointsByRealm !== "object") root.skills.spentPointsByRealm = {};
    const spent = purchaseCostTotal(model.purchases);
    if (Number(root.skills.spentPointsByRealm[REALM] || 0) !== spent) {
      root.skills.spentPointsByRealm[REALM] = spent;
      changed = true;
    }
    model.migrations.initialWorkTreeV1 = true;
    return changed;
  }

  function state() { ensureState(); return app.getState().workTalentTree; }
  function purchased(id) { return Boolean(state().purchases[id]); }
  function purchaseCostTotal(purchases = state().purchases) {
    return Object.keys(purchases || {}).reduce((sum, id) => sum + Number(NODE_BY_ID[id]?.cost || 0), 0);
  }

  function injectTree() {
    const skillsView = document.getElementById("view-skills");
    if (!skillsView || document.getElementById("workTalentTree")) return;
    const realmGrid = document.getElementById("skillsRealmGrid");
    const section = document.createElement("section");
    section.id = "workTalentTree";
    section.className = "panel work-tree-v314af";
    section.innerHTML = `
      <div class="work-tree-head-v314af">
        <div><p class="eyebrow">WORK · TALENT TREE</p><h2>Make work easier to re-enter, not harder to escape.</h2><p>Work points come from real Work skill practice. These talents add memory, shortcuts and context — never an incentive to stretch the workday for extra rewards.</p></div>
        <div id="workTreePointBank" class="work-tree-bank-v314af"></div>
      </div>
      <div id="workTreeNodes" class="work-tree-map-v314af"></div>
      <div id="workTalentTools" class="work-tools-v314af"></div>
      <div class="work-tree-footer-v314af"><span>↻ Free respec. Saved next-step notes stay yours even if you reset the tree.</span><button class="text-button" data-work-tree-reset type="button">Reset Work tree</button></div>`;
    if (realmGrid) realmGrid.insertAdjacentElement("beforebegin", section);
    else skillsView.appendChild(section);
  }

  function bind() {
    document.addEventListener("click", event => {
      const buy = event.target.closest?.("[data-work-talent-buy]");
      if (buy) { event.preventDefault(); purchaseNode(buy.dataset.workTalentBuy); return; }

      const reset = event.target.closest?.("[data-work-tree-reset]");
      if (reset) { event.preventDefault(); resetTree(); return; }

      const start = event.target.closest?.("[data-work-start]");
      if (start) {
        event.preventDefault();
        startPreset(start.dataset.workStart, Number(start.dataset.workMinutes || 25), Number(start.dataset.workBreak || 0));
        return;
      }

      const resume = event.target.closest?.("[data-work-next-resume]");
      if (resume) { event.preventDefault(); resumeNextStep(); return; }

      const clear = event.target.closest?.("[data-work-next-clear]");
      if (clear) { event.preventDefault(); clearNextStep(); return; }

      const useLatest = event.target.closest?.("[data-work-next-use-latest]");
      if (useLatest) { event.preventDefault(); prefillFromLatest(); return; }

      const show = event.target.closest?.("[data-work-show-optional]");
      if (show) { event.preventDefault(); showOptionalWorkToday = true; render(); return; }

      const weekly = event.target.closest?.("[data-work-weekly-review]");
      if (weekly) {
        event.preventDefault();
        if (window.LifeRPGWeeklyReview?.open) window.LifeRPGWeeklyReview.open();
        else app.showView?.("journal");
        return;
      }

      const rhythm = event.target.closest?.("[data-work-rhythm-open]");
      if (rhythm) { event.preventDefault(); app.showView?.("rhythm"); }
    });

    document.addEventListener("submit", event => {
      const form = event.target.closest?.("#workNextStepForm");
      if (!form) return;
      event.preventDefault();
      saveNextStep(form);
    });

    window.addEventListener("life-rpg:render", scheduleRender);
    window.addEventListener("life-rpg:state-saved", scheduleRender);
    window.addEventListener("life-rpg:time-change", scheduleRender);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(render, 80);
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
      app.showToast?.(`You need ${item.cost} Work point${item.cost === 1 ? "" : "s"}.`);
      return;
    }
    state().purchases[id] = Date.now();
    syncSpentPoints();
    app.saveState({ source: "work-talent-unlock" });
    render();
    app.showToast?.(`${item.icon} ${item.title} unlocked.`);
  }

  function resetTree() {
    const count = Object.keys(state().purchases).length;
    if (!count) { app.showToast?.("The Work tree is already empty."); return; }
    if (!window.confirm("Reset the Work talent tree? All spent Work points become available again. Your saved next-step note stays saved.")) return;
    state().purchases = {};
    syncSpentPoints();
    app.saveState({ source: "work-tree-reset" });
    render();
    app.showToast?.("Work tree reset · all Work points are available again.");
  }

  function syncSpentPoints() {
    const root = app.getState();
    root.skills ||= {};
    root.skills.spentPointsByRealm ||= {};
    root.skills.spentPointsByRealm[REALM] = purchaseCostTotal(state().purchases);
  }

  function render() {
    if (!document.getElementById("workTalentTree")) return;
    renderBank();
    renderNodes();
    const tools = document.getElementById("workTalentTools");
    if (tools) tools.innerHTML = renderTools();
  }

  function renderBank() {
    const bank = document.getElementById("workTreePointBank");
    if (!bank) return;
    const points = skills.getRealmPoints(REALM);
    bank.innerHTML = `<small>WORK POINTS</small><strong>${points.available}</strong><span>${points.spent} spent · ${points.earned} earned</span>`;
  }

  function renderNodes() {
    const container = document.getElementById("workTreeNodes");
    if (!container) return;
    container.innerHTML = [0, 1, 2, 3].map(tier => {
      const items = NODES.filter(item => item.tier === tier);
      return `<div class="work-tree-tier-v314af tier-${tier}">${items.map(nodeMarkup).join("")}</div>`;
    }).join("");
  }

  function nodeMarkup(item) {
    const isBought = purchased(item.id);
    const prereqsMet = item.requires.every(purchased);
    const affordable = skills.getRealmPoints(REALM).available >= item.cost;
    const status = isBought ? "bought" : prereqsMet ? (affordable ? "available" : "short") : "locked";
    const prereqText = item.requires.length ? item.requires.map(id => NODE_BY_ID[id]?.title).filter(Boolean).join(" + ") : "Tree root";
    const action = isBought
      ? `<button type="button" disabled>Unlocked ✓</button>`
      : `<button type="button" data-work-talent-buy="${escAttr(item.id)}" ${status === "available" ? "" : "disabled"}>${status === "locked" ? "Locked" : `Unlock · ${item.cost} pt${item.cost === 1 ? "" : "s"}`}</button>`;
    return `<article class="work-node-v314af branch-${escAttr(item.branch)} is-${status}">
      <div class="work-node-icon-v314af">${item.icon}</div>
      <div class="work-node-copy-v314af"><small>${item.cost} POINT${item.cost === 1 ? "" : "S"}</small><h3>${esc(item.title)}</h3><p>${esc(item.effect)}</p><em>${esc(prereqText)}</em></div>
      ${action}
    </article>`;
  }

  function renderTools() {
    if (!purchased("workbench")) {
      return `<div class="work-tools-locked-v314af"><span>✦</span><div><strong>Workbench unlocks the first Work utility.</strong><p>Your normal timers, Habits, Quests and Daily Plan stay exactly where they are. This tree only adds optional shortcuts around them.</p></div></div>`;
    }

    const blocks = [workbenchMarkup()];
    if (purchased("classroom-rhythm")) blocks.push(classroomMarkup());
    if (purchased("lesson-flow")) blocks.push(lessonFlowMarkup());
    if (purchased("feedback-desk")) blocks.push(feedbackMarkup());
    if (purchased("admin-dock")) blocks.push(adminMarkup());
    if (purchased("focus-lens")) blocks.push(focusLensMarkup());
    if (purchased("threadkeeper")) blocks.push(threadkeeperMarkup());
    if (purchased("batch-mode")) blocks.push(batchModeMarkup());
    if (purchased("capacity-guard")) blocks.push(capacityGuardMarkup());
    if (purchased("classroom-continuity")) blocks.push(classroomContinuityMarkup());
    if (purchased("sustainable-craft")) blocks.push(sustainableCraftMarkup());
    return blocks.join("");
  }

  function workbenchMarkup() {
    const today = todayWorkMinutes();
    const week = workMinutesSince(daysAgo(6));
    const latest = latestWorkEntries(1)[0];
    return `<section class="work-tool-card-v314af workbench-card-v314af">
      <div class="work-tool-heading-v314af"><div><small>WORKBENCH</small><h3>Work console</h3><p>Actual logged work first. Starting something else is always optional.</p></div><span>✦</span></div>
      <div class="work-mini-stats-v314af"><article><strong>${formatMinutes(today)}</strong><span>logged today</span></article><article><strong>${formatMinutes(week)}</strong><span>last 7 days</span></article><article><strong>${WORK_SKILLS.filter(id => recentSkillXp(id, 7) > 0).length}/5</strong><span>Work skills active in 7d</span></article></div>
      ${latest ? `<p class="work-observation-v314af">Latest logged work: <strong>${esc(latest.label || timeEntryLabel(latest))}</strong> · ${esc(humanAgo(latest.endAt || latest.startAt))}.</p>` : `<p class="work-observation-v314af">No recent Work time is logged. Nothing here is overdue.</p>`}
      <div class="work-action-row-v314af"><button class="secondary-button" type="button" data-work-start="deep-work" data-work-minutes="25" data-work-break="5">🎯 25/5 deep focus</button><button class="secondary-button" type="button" data-work-start="deep-work" data-work-minutes="50" data-work-break="10">50/10 deep focus</button><button class="text-button" type="button" data-work-rhythm-open>Open Life Rhythm ›</button></div>
    </section>`;
  }

  function classroomMarkup() {
    const xp = recentSkillXp("teaching-facilitation", 7);
    const entries = latestEntriesForSkill("teaching-facilitation", 3);
    return `<section class="work-tool-card-v314af branch-teaching-card-v314af">
      <div class="work-tool-heading-v314af"><div><small>CLASSROOM RHYTHM · LAST 7 DAYS</small><h3>Teaching that actually happened</h3><p>Clock the time; no lesson count or extra paperwork required.</p></div><span>🧑‍🏫</span></div>
      <div class="work-skill-number-v314af"><strong>${fmt(xp)}</strong><span>Teaching & Facilitation Skill XP in 7d</span></div>
      <div class="work-action-row-v314af"><button class="primary-button" type="button" data-work-start="teaching" data-work-minutes="45">Clock in Teaching</button><button class="secondary-button" type="button" data-work-start="substitution" data-work-minutes="45">Clock in Substitution</button></div>
      ${recentList(entries)}
    </section>`;
  }

  function lessonFlowMarkup() {
    const xp = recentSkillXp("lesson-design-preparation", 7);
    const entries = latestEntriesForSkill("lesson-design-preparation", 4);
    return `<section class="work-tool-card-v314af branch-planning-card-v314af">
      <div class="work-tool-heading-v314af"><div><small>LESSON FLOW</small><h3>Planning without setup friction</h3><p>Starts the same Life Rhythm timer you already use, prefilled with a specific work type.</p></div><span>🗂️</span></div>
      <div class="work-skill-number-v314af"><strong>${fmt(xp)}</strong><span>Lesson Design & Preparation Skill XP in 7d</span></div>
      <div class="work-action-row-v314af"><button class="primary-button" type="button" data-work-start="lesson-planning" data-work-minutes="25" data-work-break="5">25/5 lesson planning</button><button class="secondary-button" type="button" data-work-start="lesson-planning" data-work-minutes="50" data-work-break="10">50/10 planning</button><button class="secondary-button" type="button" data-work-start="preparation" data-work-minutes="25" data-work-break="5">25/5 preparation</button></div>
      ${recentList(entries)}
    </section>`;
  }

  function feedbackMarkup() {
    const xp = recentSkillXp("assessment-feedback", 7);
    const entries = latestEntriesForSkill("assessment-feedback", 4);
    return `<section class="work-tool-card-v314af branch-assessment-card-v314af">
      <div class="work-tool-heading-v314af"><div><small>FEEDBACK DESK</small><h3>Corrections, bounded on purpose</h3><p>Useful presets for a task that can otherwise expand to fill the evening.</p></div><span>✓</span></div>
      <div class="work-skill-number-v314af"><strong>${fmt(xp)}</strong><span>Assessment & Feedback Skill XP in 7d</span></div>
      <div class="work-action-row-v314af"><button class="primary-button" type="button" data-work-start="grading" data-work-minutes="25" data-work-break="5">25/5 corrections</button><button class="secondary-button" type="button" data-work-start="grading" data-work-minutes="50" data-work-break="10">50/10 corrections</button></div>
      ${recentList(entries)}
    </section>`;
  }

  function adminMarkup() {
    const xp = recentSkillXp("professional-organization", 7);
    return `<section class="work-tool-card-v314af branch-organization-card-v314af">
      <div class="work-tool-heading-v314af"><div><small>ADMIN DOCK</small><h3>Make invisible work visible</h3><p>Admin and meetings count as real work without needing a separate Quest for each one.</p></div><span>📋</span></div>
      <div class="work-skill-number-v314af"><strong>${fmt(xp)}</strong><span>Professional Organization Skill XP in 7d</span></div>
      <div class="work-action-row-v314af"><button class="primary-button" type="button" data-work-start="work-admin" data-work-minutes="15">15m work admin</button><button class="secondary-button" type="button" data-work-start="school-admin" data-work-minutes="30">Clock School Admin</button><button class="secondary-button" type="button" data-work-start="conference" data-work-minutes="30">Clock Meeting</button></div>
    </section>`;
  }

  function focusLensMarkup() {
    const xp = recentSkillXp("focus-concentration", 7);
    const today = todayWorkMinutes();
    const focusEntries = latestEntriesForSkill("focus-concentration", 4);
    return `<section class="work-tool-card-v314af branch-focus-card-v314af">
      <div class="work-tool-heading-v314af"><div><small>FOCUS LENS</small><h3>Focus in context</h3><p>Deep-focus practice sits next to the work already logged today instead of pretending time is unlimited.</p></div><span>🎯</span></div>
      <div class="work-mini-stats-v314af"><article><strong>${fmt(xp)}</strong><span>Focus Skill XP · 7d</span></article><article><strong>${formatMinutes(today)}</strong><span>actual work today</span></article></div>
      ${recentList(focusEntries)}
    </section>`;
  }

  function threadkeeperMarkup() {
    const next = state().nextStep;
    return `<section class="work-tool-card-v314af work-threadkeeper-v314af">
      <div class="work-tool-heading-v314af"><div><small>THREADKEEPER</small><h3>Leave future-you one clean handhold</h3><p>One next step is enough. This is not a task backlog.</p></div><span>⌁</span></div>
      ${next ? `<div class="work-next-saved-v314af"><small>SAVED NEXT STEP</small><strong>${esc(next.label)}</strong><span>${esc(NEXT_STEP_TYPES[next.type]?.label || next.type)} · ${next.minutes}m</span><div class="work-action-row-v314af"><button class="primary-button" type="button" data-work-next-resume>Resume ${next.minutes}m</button><button class="text-button" type="button" data-work-next-clear>Clear note</button></div></div>` : ""}
      <form id="workNextStepForm" class="work-next-form-v314af">
        <label><span>Concrete next step</span><input name="label" maxlength="180" required value="${escAttr(next?.label || "")}" placeholder="e.g. Finish the worksheet examples for Tuesday" /></label>
        <div><label><span>Type</span><select name="type">${nextStepOptions(next?.type || "lesson-planning")}</select></label><label><span>Block</span><select name="minutes">${[15,25,50,90].map(value => `<option value="${value}" ${Number(next?.minutes || 25) === value ? "selected" : ""}>${value} minutes</option>`).join("")}</select></label></div>
        <div class="work-action-row-v314af"><button class="secondary-button" type="submit">Save next step</button><button class="text-button" type="button" data-work-next-use-latest>Use latest work label</button></div>
      </form>
    </section>`;
  }

  function batchModeMarkup() {
    return `<section class="work-tool-card-v314af work-batch-v314af">
      <div class="work-tool-heading-v314af"><div><small>BATCH MODE</small><h3>Start the bounded version</h3><p>Presets are intentionally finite. Finishing one does not imply you owe the next one.</p></div><span>▦</span></div>
      <div class="work-batch-grid-v314af"><button type="button" data-work-start="grading" data-work-minutes="25" data-work-break="5"><strong>Corrections</strong><span>25 work · 5 break</span></button><button type="button" data-work-start="grading" data-work-minutes="50" data-work-break="10"><strong>Long corrections</strong><span>50 work · 10 break</span></button><button type="button" data-work-start="work-admin" data-work-minutes="15"><strong>Admin sweep</strong><span>15 minutes</span></button><button type="button" data-work-start="work-admin" data-work-minutes="25" data-work-break="5"><strong>Admin block</strong><span>25 work · 5 break</span></button></div>
    </section>`;
  }

  function capacityGuardMarkup() {
    const context = capacityContext();
    const hideStarts = context.cleared && !showOptionalWorkToday;
    return `<section class="work-tool-card-v314af work-capacity-v314af ${context.cleared ? "is-cleared" : ""}">
      <div class="work-tool-heading-v314af"><div><small>CAPACITY GUARD</small><h3>${esc(context.title)}</h3><p>${esc(context.text)}</p></div><span>◇</span></div>
      <div class="work-capacity-read-v314af"><strong>${formatMinutes(context.workMinutes)}</strong><span>work logged today</span><em>${esc(context.note)}</em></div>
      ${hideStarts ? `<button class="secondary-button" type="button" data-work-show-optional>Show optional work starts anyway</button>` : `<div class="work-action-row-v314af"><button class="primary-button" type="button" data-work-start="deep-work" data-work-minutes="${context.minutes}" data-work-break="${context.breakMinutes}">${context.minutes}/${context.breakMinutes} deep focus</button>${context.minutes !== 25 ? `<button class="secondary-button" type="button" data-work-start="deep-work" data-work-minutes="25" data-work-break="5">25/5 instead</button>` : `<button class="secondary-button" type="button" data-work-start="deep-work" data-work-minutes="50" data-work-break="10">50/10 instead</button>`}</div>`}
    </section>`;
  }

  function classroomContinuityMarkup() {
    const teaching = latestEntriesForSkill("teaching-facilitation", 1)[0];
    const planning = latestEntriesForSkill("lesson-design-preparation", 1)[0];
    const next = state().nextStep;
    return `<section class="work-tool-card-v314af work-continuity-v314af">
      <div class="work-tool-heading-v314af"><div><small>CLASSROOM CONTINUITY</small><h3>Keep the teaching thread visible</h3><p>Recent teaching, recent planning and your one saved next step live next to each other.</p></div><span>↟</span></div>
      <div class="work-continuity-grid-v314af"><article><small>LATEST TEACHING</small><strong>${esc(teaching?.label || "Nothing recent")}</strong><span>${teaching ? esc(humanAgo(teaching.endAt || teaching.startAt)) : "—"}</span></article><article><small>LATEST PLANNING</small><strong>${esc(planning?.label || "Nothing recent")}</strong><span>${planning ? esc(humanAgo(planning.endAt || planning.startAt)) : "—"}</span></article><article><small>NEXT THREAD</small><strong>${esc(next?.label || "No next-step note saved")}</strong><span>${next ? `${esc(NEXT_STEP_TYPES[next.type]?.label || next.type)} · ${next.minutes}m` : "Threadkeeper can hold one when useful."}</span></article></div>
    </section>`;
  }

  function sustainableCraftMarkup() {
    const start = startOfWeek(new Date());
    const workXp = Object.fromEntries(WORK_SKILLS.map(id => [id, recentSkillXpSince(id, start.getTime())]));
    const workMinutes = workMinutesSince(start);
    const recoveryPlay = recoveryPlayDaysSince(start.getTime());
    return `<section class="work-tool-card-v314af work-sustainable-v314af">
      <div class="work-tool-heading-v314af"><div><small>SUSTAINABLE CRAFT · THIS WEEK</small><h3>Work is one part of the week, not the whole week</h3><p>This compass is descriptive. There is no target number of skills, hours, recovery sessions or leisure days to hit.</p></div><span>✺</span></div>
      <div class="work-week-skills-v314af">${WORK_SKILLS.map(id => { const meta = skills.getSkill(id); return `<article class="${workXp[id] > 0 ? "is-active" : ""}"><span>${meta?.icon || "✦"}</span><strong>${fmt(workXp[id])}</strong><small>${esc(meta?.label || id)}</small></article>`; }).join("")}</div>
      <div class="work-mini-stats-v314af"><article><strong>${formatMinutes(workMinutes)}</strong><span>work time this week</span></article><article><strong>${recoveryPlay}</strong><span>day${recoveryPlay === 1 ? "" : "s"} with Recovery or Recreation practice</span></article></div>
      <div class="work-action-row-v314af"><button class="secondary-button" type="button" data-work-weekly-review>🌙 Open Weekly Review</button><button class="text-button" type="button" data-work-rhythm-open>Open full time log ›</button></div>
    </section>`;
  }

  function saveNextStep(form) {
    const data = new FormData(form);
    const label = clean(data.get("label")).slice(0, 180);
    if (!label) return;
    const type = NEXT_STEP_TYPES[data.get("type")] ? String(data.get("type")) : "deep-work";
    const minutes = clamp(Math.round(Number(data.get("minutes") || 25)), 10, 180);
    state().nextStep = { label, type, minutes, updatedAt: Date.now() };
    app.saveState({ source: "work-next-step-save" });
    render();
    app.showToast?.("⌁ Next work step saved.");
  }

  function clearNextStep() {
    state().nextStep = null;
    app.saveState({ source: "work-next-step-clear" });
    render();
    app.showToast?.("Next-step note cleared.");
  }

  function resumeNextStep() {
    const next = state().nextStep;
    if (!next) return;
    startPreset(next.type, next.minutes, NEXT_STEP_TYPES[next.type]?.breakMinutes || 0, next.label);
  }

  function prefillFromLatest() {
    const latest = latestWorkEntries(1)[0];
    const input = document.querySelector("#workNextStepForm [name='label']");
    if (!input) return;
    input.value = latest?.label || timeEntryLabel(latest) || "";
    input.focus();
  }

  function startPreset(type, minutes, breakMinutes = 0, customLabel = "") {
    const def = NEXT_STEP_TYPES[type];
    if (!def) return;
    const time = window.LifeRPGTime;
    if (!time?.startFocus || !time?.startAction) {
      app.showToast?.("Life Rhythm is not ready yet.");
      return;
    }
    if (time.getActive?.()) {
      app.showToast?.("Another timer is already running.");
      return;
    }
    const safeMinutes = clamp(Math.round(Number(minutes || 25)), 5, 240);
    const label = clean(customLabel) || `Work Tree · ${def.label}`;
    let result;
    if (def.mode === "clock") {
      result = time.startAction({ categoryId: def.categoryId, subcategory: def.subcategory, label, minutes: safeMinutes });
    } else {
      result = time.startFocus({ categoryId: def.categoryId, subcategory: def.subcategory, label, minutes: safeMinutes, breakMinutes: Math.max(0, Number(breakMinutes || def.breakMinutes || 0)) });
    }
    if (result !== false) {
      app.showView?.("rhythm");
      app.showToast?.(`${def.label} · ${safeMinutes}m started.`);
    }
  }

  function capacityContext() {
    const workMinutes = todayWorkMinutes();
    const checkIn = app.getState().dailyPlanner?.days?.[localDateKey(new Date())]?.checkIn || null;
    const health = checkIn?.health || {};
    const cleared = Boolean(health.dayCleared || (health.sickLeave === "yes" && health.illness === "yes"));
    const gentle = Boolean(checkIn?.gentle);
    const lowEnergy = ["fumes", "low"].includes(String(checkIn?.energy || ""));
    const poorSleep = String(checkIn?.sleep || "") === "bad";

    if (cleared) return { cleared: true, minutes: 15, breakMinutes: 5, workMinutes, title: "Work is not the default suggestion today.", text: "Today's check-in says the work/fixed load was cleared. The Work tree leaves that boundary intact; you can still reveal optional starts if you personally want one.", note: "Sick-day / cleared-day context" };
    if (workMinutes >= 360) return { cleared: false, minutes: 15, breakMinutes: 5, workMinutes, title: "A lot of work is already on the clock.", text: "If you choose another block, the default here stays deliberately small. Longer presets remain available elsewhere.", note: "6h+ logged today" };
    if (workMinutes >= 240 || gentle || lowEnergy || poorSleep) return { cleared: false, minutes: 25, breakMinutes: 5, workMinutes, title: "A smaller block is the default here.", text: "This is only a starting-size suggestion based on today's actual load and check-in, not a limit or a judgement.", note: workMinutes >= 240 ? "4h+ logged today" : "check-in context" };
    return { cleared: false, minutes: 50, breakMinutes: 10, workMinutes, title: "There is room for a regular focus block if you want one.", text: "The default is 50/10 while the day still looks relatively open. You can always choose a shorter block instead.", note: "lighter logged load" };
  }

  function nextStepOptions(selected) {
    return Object.entries(NEXT_STEP_TYPES).map(([id, item]) => `<option value="${escAttr(id)}" ${id === selected ? "selected" : ""}>${esc(item.label)}</option>`).join("");
  }

  function recentList(entries) {
    if (!entries?.length) return `<div class="work-empty-v314af">No matching work sessions logged recently.</div>`;
    return `<div class="work-recent-list-v314af">${entries.map(entry => `<article><span>◷</span><div><strong>${esc(entry.label || timeEntryLabel(entry))}</strong><small>${formatMinutes(entryMinutes(entry))} · ${esc(humanAgo(entry.endAt || entry.startAt))}</small></div></article>`).join("")}</div>`;
  }

  function latestEntriesForSkill(skillId, limit = 4) {
    return workTimeEntries().filter(entry => skillIdForTimeEntry(entry) === skillId).sort((a, b) => timestamp(b.endAt || b.startAt) - timestamp(a.endAt || a.startAt)).slice(0, limit);
  }

  function latestWorkEntries(limit = 5) {
    return workTimeEntries().sort((a, b) => timestamp(b.endAt || b.startAt) - timestamp(a.endAt || a.startAt)).slice(0, limit);
  }

  function workTimeEntries() {
    return (app.getState().timeTracking?.entries || []).filter(entry => Boolean(skillIdForTimeEntry(entry)));
  }

  function skillIdForTimeEntry(entry) {
    const category = String(entry?.categoryId || "");
    const sub = String(entry?.subcategory || "").toLowerCase();
    if (category === "school") {
      if (["teaching", "substitution"].includes(sub)) return "teaching-facilitation";
      if (["conference / meeting", "school admin"].includes(sub)) return "professional-organization";
      return null;
    }
    if (category === "work_home") {
      if (["lesson planning", "preparation"].includes(sub)) return "lesson-design-preparation";
      if (sub === "grading / corrections") return "assessment-feedback";
      if (sub === "admin") return "professional-organization";
      return null;
    }
    if (category === "focus" && sub === "deep work") return "focus-concentration";
    return null;
  }

  function todayWorkMinutes() {
    const today = localDateKey(new Date());
    return round2(workTimeEntries().reduce((sum, entry) => {
      const at = new Date(entry.startAt || entry.endAt || 0);
      return localDateKey(at) === today ? sum + entryMinutes(entry) : sum;
    }, 0));
  }

  function workMinutesSince(start) {
    const cutoff = start instanceof Date ? start.getTime() : Number(start || 0);
    return round2(workTimeEntries().reduce((sum, entry) => {
      const at = timestamp(entry.endAt || entry.startAt);
      return at >= cutoff ? sum + entryMinutes(entry) : sum;
    }, 0));
  }

  function recentSkillXp(skillId, days = 7) {
    return recentSkillXpSince(skillId, daysAgo(days - 1).getTime());
  }

  function recentSkillXpSince(skillId, cutoff) {
    return round2((app.getState().skills?.events || []).reduce((sum, event) => {
      const at = timestamp(event?.at);
      return event?.skillId === skillId && at >= cutoff ? sum + Number(event.xp || 0) : sum;
    }, 0));
  }

  function recoveryPlayDaysSince(cutoff) {
    const registry = Object.fromEntries((skills.registry || []).map(item => [item.id, item]));
    const dates = new Set();
    (app.getState().skills?.events || []).forEach(event => {
      const at = timestamp(event?.at);
      if (at < cutoff) return;
      const meta = registry[event?.skillId];
      if (!meta) return;
      if (meta.realm === "Recovery" || event.skillId === "recreation-play" || event.skillId === "movement-body-care" || event.skillId === "personal-care") {
        dates.add(localDateKey(new Date(at)));
      }
    });
    return dates.size;
  }

  function startOfWeek(date) {
    const d = startOfLocalDay(new Date(date));
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  }

  function daysAgo(days) {
    const d = startOfLocalDay(new Date());
    d.setDate(d.getDate() - Math.max(0, Number(days || 0)));
    return d;
  }

  function entryMinutes(entry) {
    const seconds = Math.max(0, Number(entry?.durationSeconds || 0));
    if (seconds > 0) return seconds / 60;
    return Math.max(0, Number(entry?.minutes || 0));
  }

  function timeEntryLabel(entry) {
    if (!entry) return "Work session";
    return [entry.subcategory, entry.categoryId].filter(Boolean).join(" · ") || "Work session";
  }

  function localDateKey(date) {
    const d = new Date(date);
    if (!Number.isFinite(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function humanAgo(value) {
    const at = timestamp(value);
    if (!at) return "saved";
    const ms = Math.max(0, Date.now() - at);
    const minutes = Math.floor(ms / 60000);
    if (minutes < 2) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function formatMinutes(value) {
    const total = Math.max(0, Math.round(Number(value || 0)));
    if (total < 60) return `${total}m`;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  function clean(value) { return String(value || "").trim(); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value || 0))); }
  function startOfLocalDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function timestamp(value) { const n = typeof value === "number" ? value : new Date(value || 0).getTime(); return Number.isFinite(n) && n > 0 ? n : 0; }
  function round2(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function fmt(value) { const n = round2(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGWorkTree = {
    version: VERSION,
    registry: NODES.map(item => ({ ...item, requires: [...item.requires] })),
    isUnlocked: id => purchased(id),
    getState: () => JSON.parse(JSON.stringify(state())),
    getNextStep: () => state().nextStep ? { ...state().nextStep } : null,
    open: () => { app.showView?.("skills"); render(); document.getElementById("workTalentTree")?.scrollIntoView({ behavior: "smooth", block: "start" }); },
    reset: resetTree
  };
})();
