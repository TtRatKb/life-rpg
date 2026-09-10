(() => {
  "use strict";

  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState || !app?.awardActivity) {
    console.error("Life RPG Weekly Review could not initialize because LifeRPGApp is unavailable.");
    return;
  }

  const VERSION = "0.31.4ac";
  const BASE_REWARD = { xp: 20, realmXP: 10, statXP: 8, coins: 15, storyEnergyBase: 0.60, skillXP: 6 };
  const DEPTH_TIERS = [
    { chars: 100, xp: 2, realmXP: 1, statXP: 1, coins: 2, storyEnergyBase: 0, skillXP: 1 },
    { chars: 300, xp: 3, realmXP: 2, statXP: 2, coins: 3, storyEnergyBase: 0.05, skillXP: 1.5 },
    { chars: 600, xp: 4, realmXP: 2, statXP: 2, coins: 4, storyEnergyBase: 0.08, skillXP: 2 }
  ];
  const QUESTIONS = [
    { id: "good", icon: "🌿", label: "What felt good or genuinely helped this week?", placeholder: "A person, a quiet moment, something fun, something that made the week easier…" },
    { id: "hard", icon: "🌧", label: "What was hard, draining, or took more out of you than expected?", placeholder: "No fixing required. This can just be context." },
    { id: "credit", icon: "⭐", label: "What do you want to give yourself credit for?", placeholder: "Something you did, handled, tried, finished, survived, or simply kept going through…" },
    { id: "more", icon: "✿", label: "What would you like a little more of next week?", placeholder: "Rest, hobbies, learning, people, movement, quiet, fun — whatever actually fits." },
    { id: "lighter", icon: "♡", label: "What can be smaller, easier, or less important next week?", placeholder: "Something that does not need to take up quite as much space." }
  ];

  let activeWeekKey = null;
  let saveTimer = null;
  let initialized = false;

  init();

  function init() {
    ensureState();
    injectJournalUi();
    injectDialog();
    bind();
    renderInvite();
    initialized = true;
  }

  function ensureState() {
    const root = app.getState();
    root.journal ||= { schemaVersion: 1, entries: {}, migrations: {} };
    root.journal.entries ||= {};
    root.journal.migrations ||= {};
    if (!root.journal.weeklyReviews || typeof root.journal.weeklyReviews !== "object" || Array.isArray(root.journal.weeklyReviews)) {
      root.journal.weeklyReviews = {};
      app.saveState({ source: "weekly-review-init" });
    }
    return root.journal.weeklyReviews;
  }

  function injectJournalUi() {
    const panel = document.querySelector(".journal-weekly-panel-v302");
    if (!panel) return;
    const heading = panel.querySelector(".panel-heading");
    if (heading && !document.getElementById("weeklyReviewOpenButton")) {
      const button = document.createElement("button");
      button.id = "weeklyReviewOpenButton";
      button.type = "button";
      button.className = "secondary-button weekly-review-open-v0314ac";
      button.dataset.weeklyReviewOpen = "target";
      heading.appendChild(button);
    }
    if (!document.getElementById("weeklyReviewInvite")) {
      const host = document.createElement("div");
      host.id = "weeklyReviewInvite";
      host.className = "weekly-review-invite-v0314ac";
      const recap = document.getElementById("journalWeeklyRecap");
      if (recap) panel.insertBefore(host, recap);
      else panel.appendChild(host);
    }
  }

  function injectDialog() {
    if (document.getElementById("weeklyReviewDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "weeklyReviewDialog";
    dialog.className = "weekly-review-dialog-v0314ac";
    dialog.innerHTML = `
      <div class="weekly-review-shell-v0314ac">
        <header class="weekly-review-topbar-v0314ac">
          <div><small>WEEKLY REVIEW · PRIVATE JOURNAL</small><h1 id="weeklyReviewTitle">Your week</h1><p id="weeklyReviewRange"></p></div>
          <button type="button" id="weeklyReviewClose" class="weekly-review-close-v0314ac" aria-label="Close weekly review">×</button>
        </header>
        <main class="weekly-review-main-v0314ac">
          <section class="weekly-review-summary-v0314ac">
            <div class="weekly-review-section-heading-v0314ac"><div><small>WHAT LIFE RPG SAW</small><h2>The week in your logs</h2></div><span>◇</span></div>
            <p class="weekly-review-soft-note-v0314ac">A description, not a grade. Blank areas just mean they were not logged.</p>
            <div id="weeklyReviewSummaryCards" class="weekly-review-summary-grid-v0314ac"></div>
            <div id="weeklyReviewSummaryDetails" class="weekly-review-summary-details-v0314ac"></div>
          </section>
          <section class="weekly-review-write-v0314ac">
            <div class="weekly-review-section-heading-v0314ac"><div><small>YOUR SIDE OF THE WEEK</small><h2>Keep what matters</h2></div><span>🌙</span></div>
            <p class="weekly-review-soft-note-v0314ac">Answer as much or as little as is useful. One answer is enough to complete the review.</p>
            <div id="weeklyReviewQuestions" class="weekly-review-questions-v0314ac"></div>
            <div id="weeklyReviewRewardPreview" class="weekly-review-reward-v0314ac"></div>
            <div id="weeklyReviewMessage" class="weekly-review-message-v0314ac" aria-live="polite"></div>
            <div class="weekly-review-actions-v0314ac">
              <button type="button" id="weeklyReviewLater" class="secondary-button">Close for now</button>
              <button type="button" id="weeklyReviewComplete" class="primary-button">Save weekly review</button>
            </div>
          </section>
        </main>
      </div>`;
    document.body.appendChild(dialog);
  }

  function bind() {
    document.addEventListener("click", event => {
      const open = event.target.closest?.("[data-weekly-review-open]");
      if (open) {
        event.preventDefault();
        const key = open.dataset.weeklyReviewKey || reviewTarget().weekKey;
        openReview(key);
      }
      const history = event.target.closest?.("[data-weekly-review-history]");
      if (history) {
        event.preventDefault();
        openReview(history.dataset.weeklyReviewHistory);
      }
    });

    document.getElementById("weeklyReviewClose")?.addEventListener("click", closeReview);
    document.getElementById("weeklyReviewLater")?.addEventListener("click", closeReview);
    document.getElementById("weeklyReviewComplete")?.addEventListener("click", completeReview);
    document.getElementById("weeklyReviewDialog")?.addEventListener("cancel", event => { event.preventDefault(); closeReview(); });
    document.getElementById("weeklyReviewQuestions")?.addEventListener("input", event => {
      const input = event.target.closest?.("[data-weekly-review-answer]");
      if (!input || !activeWeekKey) return;
      const record = getReview(activeWeekKey, true);
      record.answers[input.dataset.weeklyReviewAnswer] = input.value;
      record.updatedAt = Date.now();
      renderRewardPreview(record);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => saveDraft("weekly-review-draft"), 650);
    });

    window.addEventListener("life-rpg:render", () => {
      if (!initialized) return;
      injectJournalUi();
      renderInvite();
    });
  }

  function reviewTarget(now = new Date()) {
    const day = now.getDay();
    const end = day === 0 ? startOfDay(now) : addDays(startOfWeekMonday(now), -1);
    const start = addDays(end, -6);
    return rangeInfo(start, end);
  }

  function rangeInfo(start, end) {
    return { start, end, startKey: dateKey(start), endKey: dateKey(end), weekKey: isoWeekKey(end) };
  }

  function rangeFromWeekKey(key) {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(key || ""));
    if (!match) return reviewTarget();
    const year = Number(match[1]);
    const week = Number(match[2]);
    const jan4 = new Date(year, 0, 4, 12);
    const monday = startOfWeekMonday(jan4);
    const start = addDays(monday, (week - 1) * 7);
    return rangeInfo(start, addDays(start, 6));
  }

  function openReview(key) {
    ensureState();
    activeWeekKey = key || reviewTarget().weekKey;
    const range = rangeFromWeekKey(activeWeekKey);
    const record = getReview(activeWeekKey, true, range);
    renderDialog(record, range);
    const dialog = document.getElementById("weeklyReviewDialog");
    if (dialog && !dialog.open) dialog.showModal();
    document.body.classList.add("weekly-review-open-v0314ac");
  }

  function closeReview() {
    saveDraft("weekly-review-close");
    const dialog = document.getElementById("weeklyReviewDialog");
    if (dialog?.open) dialog.close();
    document.body.classList.remove("weekly-review-open-v0314ac");
    activeWeekKey = null;
    renderInvite();
  }

  function getReview(key, create = false, range = rangeFromWeekKey(key)) {
    const reviews = ensureState();
    if (!reviews[key] && create) {
      reviews[key] = {
        schemaVersion: 1,
        weekKey: key,
        startDate: range.startKey,
        endDate: range.endKey,
        answers: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completedAt: null,
        rewardEventId: null,
        rewardSnapshot: null
      };
    }
    const record = reviews[key] || null;
    if (record) {
      record.answers = record.answers && typeof record.answers === "object" && !Array.isArray(record.answers) ? record.answers : {};
      record.startDate ||= range.startKey;
      record.endDate ||= range.endKey;
    }
    return record;
  }

  function saveDraft(source) {
    window.clearTimeout(saveTimer);
    if (!activeWeekKey) return;
    const record = getReview(activeWeekKey, true);
    document.querySelectorAll("[data-weekly-review-answer]").forEach(input => {
      record.answers[input.dataset.weeklyReviewAnswer] = input.value;
    });
    record.updatedAt = Date.now();
    app.saveState({ source: source || "weekly-review-draft" });
  }

  function renderDialog(record, range) {
    const completed = Boolean(record?.completedAt);
    const title = document.getElementById("weeklyReviewTitle");
    const rangeEl = document.getElementById("weeklyReviewRange");
    if (title) title.textContent = completed ? "Your saved week" : "How was this week, really?";
    if (rangeEl) rangeEl.textContent = `${formatDate(range.start)} – ${formatDate(range.end)} · ${range.weekKey}`;

    renderSummary(range);
    const questions = document.getElementById("weeklyReviewQuestions");
    if (questions) {
      questions.innerHTML = QUESTIONS.map((question, index) => {
        const value = record?.answers?.[question.id] || "";
        return `<label class="weekly-review-question-v0314ac"><span class="weekly-review-question-number-v0314ac">${String(index + 1).padStart(2, "0")}</span><div><strong>${question.icon} ${esc(question.label)}</strong><textarea data-weekly-review-answer="${question.id}" rows="5" maxlength="2400" placeholder="${escAttr(question.placeholder)}">${esc(value)}</textarea><small data-weekly-review-depth="${question.id}">${answerDepthText(value)}</small></div></label>`;
      }).join("");
    }
    const button = document.getElementById("weeklyReviewComplete");
    if (button) button.textContent = completed ? "Save edits & close" : "Save weekly review";
    const msg = document.getElementById("weeklyReviewMessage");
    if (msg) msg.textContent = completed ? `Completed ${formatDate(new Date(record.completedAt))}. Editing stays available; rewards are not paid again.` : "";
    renderRewardPreview(record);
  }

  function renderSummary(range) {
    const summary = buildSummary(range);
    const cards = document.getElementById("weeklyReviewSummaryCards");
    if (cards) {
      cards.innerHTML = [
        summary.checkIns ? card("✦", "CHECK-INS", String(summary.checkIns), summary.loggedDays ? `${summary.loggedDays} logged day${summary.loggedDays === 1 ? "" : "s"}` : "") : card("✦", "CHECK-INS", "0", "No check-ins logged"),
        card("📎", "WORK TIME", formatMinutes(summary.time.work), summary.time.work ? "School + work + deep focus" : "No work time logged"),
        card("🌿", "RECOVERY", formatMinutes(summary.time.recovery), summary.time.recovery ? "Deliberate recovery time" : "No recovery time logged"),
        card("🎮", "PERSONAL TIME", formatMinutes(summary.time.personal), summary.time.personal ? "Hobbies + games + reading" : "No personal time logged"),
        card("✓", "HABITS", String(summary.habits), `${summary.quests} quest log${summary.quests === 1 ? "" : "s"}`),
        card("✦", "SKILL PRACTICE", summary.skillEvents ? `+${formatNumber(summary.skillXP)} XP` : "—", summary.topSkill ? `Most: ${summary.topSkill}` : "No mapped skill practice")
      ].join("");
    }

    const details = document.getElementById("weeklyReviewSummaryDetails");
    if (details) {
      const trackerBits = [];
      if (summary.metrics.mood) trackerBits.push(`Mood avg ${summary.metrics.mood.toFixed(1)}/5`);
      if (summary.metrics.energy) trackerBits.push(`Energy avg ${summary.metrics.energy.toFixed(1)}/4`);
      if (summary.metrics.sleep) trackerBits.push(`Sleep avg ${summary.metrics.sleep.toFixed(1)}/4`);
      if (summary.metrics.stress) trackerBits.push(`Stress avg ${summary.metrics.stress.toFixed(1)}/5`);
      const lifeBits = [];
      if (summary.time.home) lifeBits.push(`${formatMinutes(summary.time.home)} life admin`);
      if (summary.books) lifeBits.push(`${summary.books} reading log${summary.books === 1 ? "" : "s"}`);
      if (summary.games) lifeBits.push(`${summary.games} game session${summary.games === 1 ? "" : "s"}`);
      if (summary.adventures) lifeBits.push(`${summary.adventures} adventure update${summary.adventures === 1 ? "" : "s"}`);
      details.innerHTML = `
        <div><small>CHECK-IN SNAPSHOT</small><p>${trackerBits.length ? esc(trackerBits.join(" · ")) : "Not enough check-in data for averages this week."}</p></div>
        <div><small>OTHER THINGS THAT COUNTED</small><p>${lifeBits.length ? esc(lifeBits.join(" · ")) : "Nothing else needs to be on the list for this week to count."}</p></div>`;
    }
  }

  function buildSummary(range) {
    const root = app.getState();
    const dateInRange = value => {
      const key = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dateKey(new Date(value || 0));
      return key >= range.startKey && key <= range.endKey;
    };
    const journalEntries = Object.values(root.journal?.entries || {}).filter(entry => entry?.date && dateInRange(entry.date));
    const core = journalEntries.filter(entry => entry.mood || entry.energy || entry.sleep || entry.stress);
    const loggedDays = new Set(journalEntries.filter(entry => entry.mood || entry.energy || entry.sleep || entry.stress || entry.gratitude || entry.smallWin || entry.hardThing).map(entry => entry.date)).size;
    const scores = {
      mood: { rough:1, meh:2, okay:3, good:4, great:5 },
      energy: { fumes:1, low:2, okay:3, lots:4 },
      sleep: { bad:1, meh:2, fine:3, great:4 },
      stress: { calm:1, light:2, medium:3, high:4, overload:5 }
    };
    const avgMetric = key => {
      const vals = core.map(entry => scores[key][entry[key]]).filter(Number.isFinite);
      return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
    };

    const time = { work:0, recovery:0, personal:0, home:0 };
    (root.timeTracking?.entries || []).forEach(entry => {
      if (!dateInRange(entry.startAt || entry.endAt || entry.createdAt)) return;
      const minutes = Math.max(0, Number(entry.minutes || 0));
      const category = String(entry.categoryId || "");
      if (["school", "work_home", "focus"].includes(category)) time.work += minutes;
      else if (category === "recovery") time.recovery += minutes;
      else if (["hobby", "gaming", "reading"].includes(category)) time.personal += minutes;
      else if (category === "life_admin") time.home += minutes;
    });

    const habits = (root.habits?.completions || []).filter(log => dateInRange(log.timestamp || log.date)).length;
    const quests = (root.completionLog || []).filter(log => dateInRange(log.at)).length;
    const books = (root.bookLibrary?.logs || []).filter(log => dateInRange(log.at || log.createdAt)).length;
    const games = (root.gameLibrary?.logs || []).filter(log => dateInRange(log.at || log.createdAt)).length;
    const adventures = (root.sideAdventures?.logs || []).filter(log => dateInRange(log.at || log.createdAt)).length;
    const skillEvents = (root.skills?.events || []).filter(event => dateInRange(event.at));
    const skillXP = skillEvents.reduce((sum, event) => sum + Math.max(0, Number(event.xp || 0)), 0);
    const bySkill = {};
    skillEvents.forEach(event => { bySkill[event.skillId] = Number(bySkill[event.skillId] || 0) + Number(event.xp || 0); });
    const topId = Object.entries(bySkill).sort((a,b) => b[1] - a[1])[0]?.[0] || "";
    const topSkill = window.LifeRPGSkills?.getSkill?.(topId)?.label || "";

    return {
      checkIns: core.length,
      loggedDays,
      metrics: { mood:avgMetric("mood"), energy:avgMetric("energy"), sleep:avgMetric("sleep"), stress:avgMetric("stress") },
      time, habits, quests, books, games, adventures,
      skillEvents: skillEvents.length, skillXP, topSkill
    };
  }

  function completeReview() {
    if (!activeWeekKey) return;
    saveDraft("weekly-review-before-complete");
    const record = getReview(activeWeekKey, true);
    const answers = QUESTIONS.map(question => clean(record.answers?.[question.id]));
    const msg = document.getElementById("weeklyReviewMessage");
    if (!answers.some(Boolean)) {
      if (msg) msg.textContent = "Write at least one thing you want to keep from the week. One answer is enough.";
      document.querySelector("[data-weekly-review-answer]")?.focus();
      return;
    }

    if (record.completedAt) {
      record.updatedAt = Date.now();
      app.saveState({ source: "weekly-review-edit" });
      app.showToast?.("🌙 Weekly Review edits saved.");
      closeReview();
      return;
    }

    const total = { xp:0, coins:0, storyEnergy:0 };
    const base = app.awardActivity({
      source: "weekly-review-base",
      sourceId: activeWeekKey,
      label: `Weekly Review · ${activeWeekKey}`,
      realm: "Health",
      capability: "wellbeing",
      xp: BASE_REWARD.xp,
      realmXP: BASE_REWARD.realmXP,
      statXP: BASE_REWARD.statXP,
      coins: BASE_REWARD.coins,
      storyEnergyBase: BASE_REWARD.storyEnergyBase,
      progressionRelevant: true,
      metadata: { weeklyReview:true, weekKey:activeWeekKey, skillXP:BASE_REWARD.skillXP, answerCount:answers.filter(Boolean).length }
    });
    addReward(total, base);
    record.rewardEventId = base?.eventId || null;

    QUESTIONS.forEach(question => {
      const chars = clean(record.answers?.[question.id]).length;
      DEPTH_TIERS.forEach((tier, index) => {
        if (chars < tier.chars) return;
        const reward = app.awardActivity({
          source: "weekly-review-field-depth",
          sourceId: `${activeWeekKey}:${question.id}:tier-${index + 1}`,
          label: `Weekly Review · ${question.label} · ${tier.chars}+ characters`,
          realm: "Health",
          capability: "wellbeing",
          xp: tier.xp,
          realmXP: tier.realmXP,
          statXP: tier.statXP,
          coins: tier.coins,
          storyEnergyBase: tier.storyEnergyBase,
          progressionRelevant: true,
          metadata: { weeklyReview:true, weekKey:activeWeekKey, field:question.id, characters:chars, threshold:tier.chars, skillXP:tier.skillXP }
        });
        addReward(total, reward);
      });
    });

    record.completedAt = Date.now();
    record.updatedAt = record.completedAt;
    record.rewardSnapshot = { ...total };
    app.saveState({ source: "weekly-review-complete" });
    window.LifeRPGSkills?.rebuild?.();
    app.renderAll?.();
    const rewardBits = [`+${total.xp} XP`, `+${total.coins} 🪙`];
    if (total.storyEnergy) rewardBits.splice(1, 0, `+${formatEnergy(total.storyEnergy)} 🔥`);
    app.showToast?.(`🌙 Weekly Review complete · ${rewardBits.join(" · ")}`);
    closeReview();
  }

  function renderRewardPreview(record) {
    const host = document.getElementById("weeklyReviewRewardPreview");
    if (!host || !record) return;
    document.querySelectorAll("[data-weekly-review-depth]").forEach(node => {
      const field = node.dataset.weeklyReviewDepth;
      const input = document.querySelector(`[data-weekly-review-answer="${field}"]`);
      if (input) node.textContent = answerDepthText(input.value);
    });
    if (record.completedAt) {
      const snap = record.rewardSnapshot || {};
      host.innerHTML = `<span>✓</span><div><small>REWARDS SECURED</small><strong>This review already counted.</strong><p>${snap.xp ? `+${formatNumber(snap.xp)} XP · ` : ""}${snap.storyEnergy ? `+${formatEnergy(snap.storyEnergy)} 🔥 · ` : ""}${snap.coins ? `+${formatNumber(snap.coins)} 🪙` : ""} Editing later never pays it twice.</p></div>`;
      return;
    }
    const preview = previewRewards(record);
    host.innerHTML = `<span>✦</span><div><small>WEEKLY REFLECTION REWARD</small><strong>Currently ${preview.xp} XP · ${formatEnergy(preview.storyEnergy)} 🔥 · ${preview.coins} 🪙</strong><p>Base reward plus small capped depth bonuses for the answers you choose to write. The first completed save locks the reward snapshot for this week.</p></div>`;
  }

  function previewRewards(record) {
    const total = { xp:BASE_REWARD.xp, coins:BASE_REWARD.coins, storyEnergy:BASE_REWARD.storyEnergyBase };
    QUESTIONS.forEach(question => {
      const chars = clean(record.answers?.[question.id]).length;
      DEPTH_TIERS.forEach(tier => {
        if (chars >= tier.chars) {
          total.xp += tier.xp;
          total.coins += tier.coins;
          total.storyEnergy += tier.storyEnergyBase;
        }
      });
    });
    total.storyEnergy = round2(total.storyEnergy);
    return total;
  }

  function renderInvite() {
    const target = reviewTarget();
    const review = getReview(target.weekKey, false, target);
    const completed = Boolean(review?.completedAt);
    const sunday = new Date().getDay() === 0;
    const button = document.getElementById("weeklyReviewOpenButton");
    if (button) button.textContent = completed ? "✓ Open saved review" : sunday ? "🌙 Review this week" : "🌙 Review last week";

    const host = document.getElementById("weeklyReviewInvite");
    if (host) {
      const completedReviews = Object.values(ensureState()).filter(item => item?.completedAt).sort((a,b) => Number(b.completedAt) - Number(a.completedAt)).slice(0, 5);
      host.innerHTML = `<div><span>${completed ? "✓" : "🌙"}</span><div><small>${sunday ? "SUNDAY REVIEW" : "WEEKLY REVIEW"}</small><strong>${completed ? "This week's review is saved." : sunday ? "Your week is ready to look back on." : "Missed Sunday? The last full week is still here."}</strong><p>${formatDate(target.start)} – ${formatDate(target.end)}. ${completed ? "You can reopen and edit it whenever you want." : "No deadline, no broken streak, no penalty for doing it later."}</p></div><button type="button" class="primary-button" data-weekly-review-open="target">${completed ? "Open review" : "Start review"}</button></div>${completedReviews.length ? `<nav aria-label="Recent weekly reviews"><small>RECENT</small>${completedReviews.map(item => `<button type="button" data-weekly-review-history="${escAttr(item.weekKey)}">${esc(item.weekKey)}</button>`).join("")}</nav>` : ""}`;
    }

    renderSundayHero(target, completed, sunday);
  }

  function renderSundayHero(target, completed, sunday) {
    const existing = document.getElementById("weeklyReviewSundayHero");
    if (!sunday || completed) { existing?.remove(); return; }
    if (existing) return;
    const actions = document.querySelector(".journal-hero-actions-v302");
    if (!actions) return;
    const hero = document.createElement("button");
    hero.id = "weeklyReviewSundayHero";
    hero.type = "button";
    hero.className = "weekly-review-sunday-hero-v0314ac";
    hero.dataset.weeklyReviewOpen = "target";
    hero.innerHTML = `<span>🌙</span><div><small>SUNDAY</small><strong>Weekly Review is ready</strong><p>${formatDate(target.start)} – ${formatDate(target.end)} · look back whenever it feels useful.</p></div><b>›</b>`;
    actions.insertAdjacentElement("afterend", hero);
  }

  function answerDepthText(value) {
    const chars = clean(value).length;
    const next = DEPTH_TIERS.find(tier => chars < tier.chars);
    if (!chars) return "Optional · writing depth starts at 100 characters";
    if (!next) return `${chars} characters · maximum weekly depth bonus reached`;
    return `${chars} characters · ${next.chars - chars} to the next small depth bonus`;
  }

  function card(icon, label, value, note) {
    return `<article><span>${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong>${note ? `<p>${esc(note)}</p>` : ""}</div></article>`;
  }

  function addReward(total, reward) {
    if (!reward || reward.duplicate) return;
    total.xp += Math.max(0, Number(reward.xp || 0));
    total.coins += Math.max(0, Number(reward.coins || 0));
    total.storyEnergy = round2(total.storyEnergy + Math.max(0, Number(reward.storyEnergy || 0)));
  }

  function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12); }
  function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
  function startOfWeekMonday(date) { const d = startOfDay(date); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d; }
  function isoWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  function dateKey(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function formatDate(date) { return new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }).format(date); }
  function formatMinutes(value) { const total = Math.max(0, Math.round(Number(value || 0))); if (!total) return "0m"; if (total < 60) return `${total}m`; const h = Math.floor(total / 60), m = total % 60; return m ? `${h}h ${m}m` : `${h}h`; }
  function clean(value) { return String(value || "").trim(); }
  function round2(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function formatNumber(value) { const n = round2(value); return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""); }
  function formatEnergy(value) { return app.formatEnergy ? app.formatEnergy(value) : formatNumber(value); }
  function esc(value) { return app.escapeHtml ? app.escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function escAttr(value) { return esc(value).replace(/`/g, "&#96;"); }

  window.LifeRPGWeeklyReview = {
    version: VERSION,
    open: key => openReview(key || reviewTarget().weekKey),
    getTarget: () => ({ ...reviewTarget(), start:undefined, end:undefined }),
    getReviews: () => JSON.parse(JSON.stringify(ensureState()))
  };
})();
