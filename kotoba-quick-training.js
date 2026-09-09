(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const integration = window.LifeRPGKotobaIntegration;
  if (!app?.getState || !app?.saveState || !integration) return;

  const VERSION = "0.31.4j";
  const REQUEST_TYPE = "life-rpg:kotoba-request";
  const RESPONSE_TYPE = "kotoba:life-rpg-response";
  const REQUEST_TIMEOUT_MS = 18000;
  const SESSION_SCHEMA = 1;

  let bridgeFrame = null;
  let bridgeReadyPromise = null;
  const pending = new Map();
  const els = {};

  init();

  function init() {
    Object.assign(els, {
      tiny: byId("kotobaTinyButton"),
      quick: byId("kotobaQuickButton"),
      hint: byId("kotobaLiveBridgeHint"),
      dialog: byId("kotobaQuickDialog"),
      title: byId("kotobaQuickTitle"),
      close: byId("kotobaQuickClose"),
      progress: byId("kotobaQuickProgress"),
      question: byId("kotobaQuickQuestion"),
      feedback: byId("kotobaQuickFeedback"),
      form: byId("kotobaQuickAnswerForm"),
      input: byId("kotobaQuickAnswer"),
      check: byId("kotobaQuickCheck"),
      speak: byId("kotobaQuickSpeak"),
      next: byId("kotobaQuickNext"),
      end: byId("kotobaQuickEnd"),
      saveNote: byId("kotobaQuickSaveNote")
    });
    if (!els.tiny || !els.dialog) return;

    ensureState();
    els.tiny.addEventListener("click", () => startOrResume("tiny").catch(handleError));
    els.quick?.addEventListener("click", () => startOrResume("quick").catch(handleError));
    els.close?.addEventListener("click", closeDialog);
    els.end?.addEventListener("click", endSession);
    els.next?.addEventListener("click", advanceAfterFeedback);
    els.speak?.addEventListener("click", speakCurrentWord);
    els.form?.addEventListener("submit", event => {
      event.preventDefault();
      submitAnswer().catch(handleError);
    });
    els.dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeDialog();
    });

    window.addEventListener("message", onBridgeMessage);
    window.addEventListener("life-rpg:render", renderEntryButtons);
    renderEntryButtons();
  }

  function ensureState() {
    const root = app.getState();
    root.integrations ||= {};
    root.integrations.kotoba ||= {};
    const s = root.integrations.kotoba;
    if (s.quickSession && typeof s.quickSession === "object") {
      s.quickSession.schemaVersion = SESSION_SCHEMA;
      s.quickSession.items = Array.isArray(s.quickSession.items) ? s.quickSession.items : [];
      s.quickSession.questions = Array.isArray(s.quickSession.questions) ? s.quickSession.questions : [];
      s.quickSession.results ||= {};
      s.quickSession.errors ||= {};
      s.quickSession.committed ||= {};
      s.quickSession.skipped ||= {};
      s.quickSession.earned ||= emptyEarned();
    }
    s.liveBridgeUrl = String(s.liveBridgeUrl || "");
    return s;
  }

  function state() { return ensureState(); }
  function session() { return state().quickSession || null; }

  function save(reason) {
    app.saveState({ source: reason || "kotoba-quick-training" });
    renderEntryButtons();
  }

  function emptyEarned() {
    return { xp: 0, realmXP: 0, statXP: 0, coins: 0, storyEnergy: 0, rewardEvents: 0 };
  }

  function activeSession() {
    const current = session();
    return current && current.status === "active" && Array.isArray(current.questions) ? current : null;
  }

  function dueVocabCount() {
    const counts = state().dueSnapshot?.counts || {};
    return Math.max(0, Number(counts.vocabularyCore || 0)) + Math.max(0, Number(counts.vocabularyMining || 0));
  }

  function renderEntryButtons() {
    const connected = Boolean(state().enabled);
    const current = activeSession();
    const due = dueVocabCount();
    els.tiny?.classList.toggle("hidden", !connected);
    els.quick?.classList.toggle("hidden", !connected);
    if (!connected) return;

    if (current) {
      const done = Object.keys(current.committed || {}).length;
      const total = current.items?.length || 0;
      els.tiny.textContent = `▶ Resume Japanese · ${done}/${total} words`;
      els.tiny.disabled = false;
      if (els.quick) {
        els.quick.textContent = "Start another session after this one";
        els.quick.disabled = true;
      }
      if (els.hint) els.hint.textContent = "Your unfinished Quick Japanese session is saved in Life RPG and ready to resume.";
      return;
    }

    els.tiny.textContent = due ? `🌱 Tiny Japanese · ${Math.min(5, due)} words` : "🌱 Tiny Japanese · no vocab due";
    els.tiny.disabled = due <= 0;
    if (els.quick) {
      els.quick.textContent = due ? `🌸 Quick Japanese · ${Math.min(10, due)} words` : "🌸 Quick Japanese · no vocab due";
      els.quick.disabled = due <= 0;
    }
    if (els.hint) {
      els.hint.textContent = due
        ? "These are real due Kotoba vocabulary reviews. A word only rewards after Kotoba confirms both directions."
        : "No Kotoba vocabulary is due right now. Grammar and particle write-back stay read-only for this first safe version.";
    }
  }

  async function startOrResume(mode) {
    if (!state().enabled) throw new Error("Connect Kotoba Quest first.");
    const existing = activeSession();
    if (existing) {
      await ensureLiveBridge();
      openDialog();
      renderSession();
      return;
    }

    const requested = mode === "quick" ? 10 : 5;
    await ensureLiveBridge();
    setDialogLoading(mode === "quick" ? "Quick Japanese" : "Tiny Japanese");
    openDialog();

    const created = await requestBridge("create-vocabulary-session", {
      limit: requested,
      sessionId: makeId("lr-kotoba-session")
    });
    if (!created?.items?.length) {
      closeDialog();
      await integration.syncNow?.().catch(() => {});
      app.showToast?.("🌸 Kotoba has no due vocabulary reviews right now.");
      return;
    }

    const next = {
      schemaVersion: SESSION_SCHEMA,
      status: "active",
      mode,
      sessionId: String(created.sessionId || makeId("lr-kotoba-session")),
      createdAt: Number(created.createdAt || Date.now()),
      items: created.items,
      questions: created.questions,
      index: 0,
      results: Object.fromEntries(created.items.map(item => [item.itemId, { listening: false, production: false }])),
      errors: Object.fromEntries(created.items.map(item => [item.itemId, { listening: false, production: false }])),
      committed: {},
      skipped: {},
      earned: emptyEarned(),
      feedback: null,
      pendingAdvance: false,
      dueCountBefore: Number(created.dueCountBefore || created.items.length)
    };
    state().quickSession = next;
    save("kotoba-quick-start");
    renderSession();
  }

  function setDialogLoading(title) {
    if (els.title) els.title.textContent = title;
    if (els.progress) els.progress.innerHTML = "Connecting to Kotoba's review engine…";
    if (els.question) els.question.innerHTML = '<div class="kotoba-quick-loading-v314j">Loading your real Kotoba reviews…</div>';
    els.form?.classList.add("hidden");
    els.feedback?.classList.add("hidden");
    els.speak?.classList.add("hidden");
    els.next?.classList.add("hidden");
  }

  function openDialog() {
    if (!els.dialog.open) els.dialog.showModal();
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
    // Kotoba's cloud page is intentionally large. Quick Japanese lazy-loads it
    // only while needed and releases the hidden iframe again so Life RPG does
    // not keep a second full app decoded in memory all day.
    window.setTimeout(releaseLiveBridgeWhenIdle, 120);
  }

  function releaseLiveBridgeWhenIdle() {
    if (pending.size) {
      window.setTimeout(releaseLiveBridgeWhenIdle, 250);
      return;
    }
    bridgeFrame?.remove();
    bridgeFrame = null;
    bridgeReadyPromise = null;
  }

  function endSession() {
    const current = activeSession();
    if (!current) {
      closeDialog();
      return;
    }
    const committed = Object.keys(current.committed || {}).length;
    if (!committed && !window.confirm("End this Quick Japanese session? No Kotoba words have been fully committed yet.")) return;
    current.status = "ended";
    current.endedAt = Date.now();
    save("kotoba-quick-end");
    closeDialog();
    app.showToast?.(committed ? `Japanese session ended · ${committed} Kotoba words confirmed.` : "Japanese session ended.");
  }

  function currentQuestion(current = activeSession()) {
    if (!current) return null;
    skipUnavailableQuestions(current);
    return current.questions[current.index] || null;
  }

  function skipUnavailableQuestions(current) {
    while (current.index < current.questions.length) {
      const question = current.questions[current.index];
      if (!question) { current.index += 1; continue; }
      if (current.committed?.[question.itemId] || current.skipped?.[question.itemId]) { current.index += 1; continue; }
      const type = directionType(question.direction);
      if (current.results?.[question.itemId]?.[type] === true) { current.index += 1; continue; }
      break;
    }
  }

  function itemById(current, itemId) {
    return current?.items?.find(item => String(item.itemId) === String(itemId)) || null;
  }

  function directionType(direction) {
    return String(direction) === "de-jp" ? "production" : "listening";
  }

  function renderSession() {
    const current = activeSession();
    if (!current) {
      renderFinishedSession(session());
      return;
    }
    skipUnavailableQuestions(current);
    if (current.index >= current.questions.length) {
      const unresolved = current.items.filter(item => !current.committed?.[item.itemId] && !current.skipped?.[item.itemId]);
      if (!unresolved.length) {
        finishSession(current);
        return;
      }
      // Safety net: every unresolved item should still have a missing direction.
      for (const item of unresolved) {
        for (const type of ["listening", "production"]) {
          if (current.results?.[item.itemId]?.[type] !== true) current.questions.push({ itemId: item.itemId, direction: type === "production" ? "de-jp" : "jp-de", repeated: true });
        }
      }
    }

    const question = currentQuestion(current);
    if (!question) {
      finishSession(current);
      return;
    }
    const item = itemById(current, question.itemId);
    if (!item) {
      current.skipped[question.itemId] = { reason: "missing-item" };
      current.index += 1;
      save("kotoba-quick-skip-missing");
      renderSession();
      return;
    }

    const committed = Object.keys(current.committed || {}).length;
    const total = current.items.length;
    const initialPrompts = Math.max(1, total * 2);
    const resolvedDirections = Object.values(current.results || {}).reduce((sum, row) => sum + Number(row?.listening === true) + Number(row?.production === true), 0);
    const percent = Math.min(100, Math.round((resolvedDirections / initialPrompts) * 100));
    if (els.title) els.title.textContent = current.mode === "quick" ? "Quick Japanese" : "Tiny Japanese";
    if (els.progress) {
      els.progress.innerHTML = `<div><strong>${committed}/${total} words confirmed in Kotoba</strong> · ${resolvedDirections}/${initialPrompts} directions cleared</div><div class="bar"><span style="width:${percent}%"></span></div>`;
    }

    const isMeaning = question.direction === "jp-de";
    const prompt = isMeaning ? item.word : (item.productionCue || item.meanings?.join(" / ") || "Meaning");
    const sub = isMeaning
      ? "Recall the German meaning. Kotoba will grade the answer with its own accepted meanings and typo tolerance."
      : "Recall the Japanese word. Romaji is okay; Kotoba converts and grades it using its own review rules.";
    if (els.question) {
      els.question.innerHTML = `<div class="kotoba-quick-direction-v314j">${isMeaning ? "Japanese → German" : "German → Japanese"}${question.repeated ? " · retry" : ""}</div><div class="kotoba-quick-prompt-v314j ${isMeaning ? "" : "is-meaning"}">${escapeHtml(prompt)}</div><div class="kotoba-quick-sub-v314j">${escapeHtml(sub)}</div>`;
    }
    current.feedback = null;
    current.pendingAdvance = false;
    setFeedback(null);
    els.form?.classList.remove("hidden");
    if (els.input) {
      els.input.disabled = false;
      els.input.value = "";
      els.input.placeholder = isMeaning ? "German meaning" : "Japanese word · Romaji or Kana";
      setTimeout(() => els.input?.focus(), 20);
    }
    if (els.check) els.check.disabled = false;
    els.next?.classList.add("hidden");
    els.speak?.classList.toggle("hidden", !isMeaning);
    if (els.end) els.end.disabled = false;
  }

  async function submitAnswer() {
    const current = activeSession();
    const question = currentQuestion(current);
    const answer = String(els.input?.value || "").trim();
    if (!current || !question || !answer) return;
    if (els.check) els.check.disabled = true;
    if (els.input) els.input.disabled = true;

    let evaluated;
    try {
      evaluated = await requestBridge("evaluate-vocabulary", {
        itemId: question.itemId,
        direction: question.direction,
        answer
      });
    } catch (error) {
      if (els.check) els.check.disabled = false;
      if (els.input) els.input.disabled = false;
      throw error;
    }

    if (!evaluated?.ok) throw new Error(evaluated?.message || "Kotoba could not grade this answer.");
    const type = directionType(question.direction);

    if (evaluated.status === "wrongType" || evaluated.status === "romajiLeftover") {
      const message = evaluated.status === "wrongType"
        ? (type === "listening" ? "That is the Japanese form; this prompt asks for the German meaning. Try again." : "That is the meaning; this prompt asks for the Japanese word. Try again.")
        : "There is still unconverted Romaji in the Japanese answer. Try the spelling again.";
      setFeedback("warning", message);
      if (els.input) { els.input.disabled = false; els.input.focus(); }
      if (els.check) els.check.disabled = false;
      return;
    }

    if (evaluated.status === "correct") {
      current.results[question.itemId][type] = true;
      let commitResult = null;
      if (current.results[question.itemId].listening && current.results[question.itemId].production && !current.committed[question.itemId]) {
        commitResult = await commitItem(current, question.itemId);
      }
      setFeedback("good", commitResult?.committed ? `Correct · Kotoba confirmed the full word review. Stage ${commitResult.stageBefore} → ${commitResult.stageAfter}.` : "Correct ✓");
    } else if (evaluated.status === "close") {
      requeue(current, question);
      setFeedback("warning", `Almost right. Kotoba expected: ${evaluated.expected}. This direction will return later and does not count as a genuine SRS error.`);
    } else {
      current.errors[question.itemId][type] = true;
      requeue(current, question);
      setFeedback("bad", `Not quite. Kotoba expected: ${evaluated.expected}. This direction will return later.`);
    }

    current.pendingAdvance = true;
    save("kotoba-quick-answer");
    els.form?.classList.add("hidden");
    els.next?.classList.remove("hidden");
    setTimeout(() => els.next?.focus(), 20);
  }

  function requeue(current, question, minGap = 3) {
    const insertAt = Math.min(current.questions.length, current.index + 1 + Math.max(1, minGap));
    current.questions.splice(insertAt, 0, { itemId: question.itemId, direction: question.direction, repeated: true });
  }

  async function commitItem(current, itemId) {
    const item = itemById(current, itemId);
    const commandId = `life-rpg:${current.sessionId}:${itemId}`;
    const response = await requestBridge("commit-vocabulary-item", {
      commandId,
      sessionId: current.sessionId,
      itemId,
      expectedStage: item?.stage,
      errors: current.errors[itemId] || { listening: false, production: false }
    });

    if (!response?.ok || !response?.committed) {
      const code = String(response?.code || "");
      if (code === "stale-review" || code === "not-due") {
        current.skipped[itemId] = { reason: code, at: Date.now() };
        current.questions = current.questions.filter((question, index) => index <= current.index || question.itemId !== itemId);
        save("kotoba-quick-stale-skip");
        app.showToast?.("Kotoba changed this word in another session, so Life RPG skipped it instead of applying it twice.");
        return { committed: false, skipped: true };
      }
      throw new Error(response?.message || "Kotoba did not confirm this vocabulary review.");
    }

    current.committed[itemId] = {
      at: Date.now(),
      commandId,
      stageBefore: Number(response.stageBefore ?? item?.stage ?? 0),
      stageAfter: Number(response.stageAfter ?? response.item?.stage ?? 0),
      duplicate: Boolean(response.duplicate)
    };
    if (response.snapshot?.counts) state().dueSnapshot = response.snapshot;

    // The two directions are the real underlying Kotoba review work. Stable IDs
    // make this reward path idempotent even if the bridge response is retried.
    for (const skill of ["listening", "production"]) {
      const reward = integration.awardExternalConfirmedReview?.({
        sourceId: `${commandId}:${skill}`,
        type: "vocab-review",
        label: `Kotoba Quick · ${item?.word || "Vocabulary"} · ${skill === "listening" ? "JP → DE" : "DE → JP"}`,
        itemId,
        skill,
        at: Date.now(),
        sessionId: current.sessionId
      });
      accumulateReward(current.earned, reward);
    }
    save("kotoba-quick-commit");
    return response;
  }

  function accumulateReward(total, reward) {
    if (!reward || reward.duplicate) return;
    total.xp += Math.max(0, Number(reward.xp || 0));
    total.realmXP += Math.max(0, Number(reward.realmXP || 0));
    total.statXP += Math.max(0, Number(reward.statXP || 0));
    total.coins += Math.max(0, Number(reward.coins || 0));
    total.storyEnergy = round2(total.storyEnergy + Math.max(0, Number(reward.storyEnergy || 0)));
    total.rewardEvents += 1;
  }

  function advanceAfterFeedback() {
    const current = activeSession();
    if (!current) return;
    current.index += 1;
    current.feedback = null;
    current.pendingAdvance = false;
    save("kotoba-quick-next");
    renderSession();
  }

  function finishSession(current) {
    current.status = "completed";
    current.completedAt = Date.now();
    save("kotoba-quick-complete");
    integration.syncNow?.().catch(() => {});
    renderFinishedSession(current);
  }

  function renderFinishedSession(current) {
    if (!current) {
      closeDialog();
      return;
    }
    const committed = Object.keys(current.committed || {}).length;
    const skipped = Object.keys(current.skipped || {}).length;
    const earned = current.earned || emptyEarned();
    const remaining = state().dueSnapshot?.counts
      ? Math.max(0, Number(state().dueSnapshot.counts.vocabularyCore || 0) + Number(state().dueSnapshot.counts.vocabularyMining || 0))
      : null;
    if (els.title) els.title.textContent = "Japanese training complete";
    if (els.progress) els.progress.innerHTML = `<strong>${committed} Kotoba ${committed === 1 ? "word" : "words"} confirmed</strong>${skipped ? ` · ${skipped} skipped because Kotoba had changed` : ""}`;
    if (els.question) {
      els.question.innerHTML = `<div class="kotoba-quick-summary-v314j"><div class="kotoba-quick-prompt-v314j" style="font-size:3rem">🌸</div><h3>Real Kotoba progress, directly from Life RPG.</h3><div class="kotoba-quick-summary-grid-v314j"><div><strong>+${earned.realmXP}</strong><span>Japanese Realm XP</span></div><div><strong>+${earned.coins}</strong><span>Coins</span></div><div><strong>+${formatEnergy(earned.storyEnergy)}</strong><span>Story Energy</span></div></div><p class="muted">+${earned.xp} Character XP · +${earned.statXP} Japanese Skill XP${remaining == null ? "" : ` · ${remaining} vocabulary reviews currently remain due in Kotoba`}.</p></div>`;
    }
    setFeedback(null);
    els.form?.classList.add("hidden");
    els.speak?.classList.add("hidden");
    els.next?.classList.add("hidden");
    if (els.end) {
      els.end.textContent = "Close";
      els.end.onclick = closeDialog;
    }
    if (els.saveNote) els.saveNote.textContent = "Kotoba confirmed every rewarded word before Life RPG credited it. The same review will not be paid again when the normal Kotoba sync sees it later.";
  }

  function setFeedback(kind, message = "") {
    if (!kind || !message) {
      els.feedback?.classList.add("hidden");
      if (els.feedback) { els.feedback.textContent = ""; els.feedback.removeAttribute("data-kind"); }
      return;
    }
    if (els.feedback) {
      els.feedback.dataset.kind = kind;
      els.feedback.textContent = message;
      els.feedback.classList.remove("hidden");
    }
  }

  function speakCurrentWord() {
    const current = activeSession();
    const question = currentQuestion(current);
    const item = itemById(current, question?.itemId);
    if (!item?.word || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.word);
      utterance.lang = "ja-JP";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  async function ensureLiveBridge() {
    if (bridgeReadyPromise) return bridgeReadyPromise;
    bridgeReadyPromise = (async () => {
      const url = await resolveKotobaUrl();
      if (!url) throw new Error("Life RPG could not find Kotoba Quest on this GitHub Pages origin.");
      if (new URL(url, location.href).origin !== location.origin) {
        throw new Error("Quick Japanese currently requires Kotoba Quest and Life RPG on the same browser origin. Your read-only Firebase sync can still keep working.");
      }

      bridgeFrame?.remove();
      bridgeFrame = document.createElement("iframe");
      bridgeFrame.id = "kotobaLiveBridgeFrame";
      bridgeFrame.title = "Kotoba Quest live review bridge";
      bridgeFrame.tabIndex = -1;
      bridgeFrame.setAttribute("aria-hidden", "true");
      bridgeFrame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none";
      const target = new URL(url, location.href);
      target.searchParams.set("lifeRpgBridge", "1");
      bridgeFrame.src = target.href;
      document.body.appendChild(bridgeFrame);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Kotoba Quest took too long to load for Quick Japanese.")), REQUEST_TIMEOUT_MS);
        bridgeFrame.addEventListener("load", () => { clearTimeout(timer); resolve(); }, { once: true });
        bridgeFrame.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Kotoba Quest could not be loaded for Quick Japanese.")); }, { once: true });
      });

      let ping = null;
      let lastError = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          ping = await requestBridge("ping", {}, 5000);
          if (ping?.reviewWriteBackAvailable) break;
        } catch (error) { lastError = error; }
        await sleep(450);
      }
      if (!ping?.reviewWriteBackAvailable) throw lastError || new Error("Kotoba Quest needs the Bridge V2 update before Quick Japanese can write reviews back.");
      return ping;
    })().catch(error => {
      bridgeReadyPromise = null;
      bridgeFrame?.remove();
      bridgeFrame = null;
      throw error;
    });
    return bridgeReadyPromise;
  }

  async function resolveKotobaUrl() {
    const s = state();
    if (s.liveBridgeUrl) return s.liveBridgeUrl;
    const origin = location.origin;
    const candidates = [
      `${origin}/kotoba-quest/cloud.html`,
      `${origin}/Kotoba-Quest/cloud.html`,
      `${origin}/kotoba-quest-main/cloud.html`,
      `${origin}/KotobaQuest/cloud.html`,
      `${origin}/kotobaquest/cloud.html`
    ];
    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { method: "HEAD", cache: "no-store" });
        if (response.ok) {
          s.liveBridgeUrl = candidate;
          save("kotoba-live-url-discovered");
          return candidate;
        }
      } catch {}
    }
    const suggested = candidates[0];
    const entered = window.prompt("Life RPG could not auto-detect Kotoba Quest. Paste the URL to Kotoba's cloud.html once:", suggested);
    if (!entered) return "";
    let parsed;
    try { parsed = new URL(entered, location.href); }
    catch { throw new Error("That Kotoba Quest URL is not valid."); }
    if (parsed.origin !== location.origin) throw new Error("Quick Japanese requires the Kotoba cloud.html page on the same browser origin as Life RPG.");
    s.liveBridgeUrl = parsed.href;
    save("kotoba-live-url-manual");
    return parsed.href;
  }

  function requestBridge(action, payload = {}, timeout = REQUEST_TIMEOUT_MS) {
    if (!bridgeFrame?.contentWindow) return Promise.reject(new Error("Kotoba live bridge is not loaded."));
    const requestId = makeId("lr-kq-request");
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("Kotoba did not answer the Quick Japanese request in time."));
      }, timeout);
      pending.set(requestId, { resolve, reject, timer });
      bridgeFrame.contentWindow.postMessage({ type: REQUEST_TYPE, requestId, action, payload }, location.origin);
    });
  }

  function onBridgeMessage(event) {
    if (event.origin !== location.origin || event.source !== bridgeFrame?.contentWindow) return;
    const message = event.data;
    if (!message || message.type !== RESPONSE_TYPE || !message.requestId) return;
    const row = pending.get(String(message.requestId));
    if (!row) return;
    clearTimeout(row.timer);
    pending.delete(String(message.requestId));
    if (message.ok) row.resolve(message.result);
    else row.reject(new Error(String(message.error || "Kotoba live bridge failed.")));
  }

  function handleError(error) {
    console.error("Kotoba Quick Japanese failed", error);
    setFeedback("bad", friendlyError(error));
    app.showToast?.(friendlyError(error));
    if (els.check) els.check.disabled = false;
    if (els.input) els.input.disabled = false;
  }

  function friendlyError(error) {
    return String(error?.message || error || "Quick Japanese failed.").slice(0, 320);
  }

  function makeId(prefix) {
    try { return `${prefix}-${crypto.randomUUID()}`; }
    catch { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
  }

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function round2(value) { return Math.round(Number(value || 0) * 100) / 100; }
  function formatEnergy(value) { const n = round2(value); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char])); }
  function byId(id) { return document.getElementById(id); }

  window.LifeRPGKotobaQuickTraining = {
    version: VERSION,
    startTiny: () => startOrResume("tiny"),
    startQuick: () => startOrResume("quick"),
    getSession: () => JSON.parse(JSON.stringify(session() || null)),
    resetBridgeUrl: () => { state().liveBridgeUrl = ""; bridgeReadyPromise = null; bridgeFrame?.remove(); bridgeFrame = null; save("kotoba-live-url-reset"); }
  };
})();
