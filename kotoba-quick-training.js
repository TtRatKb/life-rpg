(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const integration = window.LifeRPGKotobaIntegration;
  if (!app?.getState || !app?.saveState || !integration) return;

  const VERSION = "0.31.4k";
  const REQUEST_TYPE = "life-rpg:kotoba-request";
  const RESPONSE_TYPE = "kotoba:life-rpg-response";
  const REQUEST_TIMEOUT_MS = 18000;
  const SESSION_SCHEMA = 2;

  let bridgeFrame = null;
  let bridgeReadyPromise = null;
  const pending = new Map();
  const els = {};

  init();

  function init() {
    Object.assign(els, {
      tiny: byId("kotobaTinyButton"), quick: byId("kotobaQuickButton"), hint: byId("kotobaLiveBridgeHint"),
      dialog: byId("kotobaQuickDialog"), title: byId("kotobaQuickTitle"), close: byId("kotobaQuickClose"),
      progress: byId("kotobaQuickProgress"), question: byId("kotobaQuickQuestion"), feedback: byId("kotobaQuickFeedback"),
      form: byId("kotobaQuickAnswerForm"), input: byId("kotobaQuickAnswer"), check: byId("kotobaQuickCheck"),
      speak: byId("kotobaQuickSpeak"), next: byId("kotobaQuickNext"), end: byId("kotobaQuickEnd"), saveNote: byId("kotobaQuickSaveNote")
    });
    if (!els.tiny || !els.dialog) return;

    ensureState();
    els.tiny.addEventListener("click", () => startOrResume("tiny").catch(handleError));
    els.quick?.addEventListener("click", () => startOrResume("quick").catch(handleError));
    els.close?.addEventListener("click", closeDialog);
    els.end?.addEventListener("click", endSession);
    els.next?.addEventListener("click", advanceAfterFeedback);
    els.speak?.addEventListener("click", speakCurrentPrompt);
    els.form?.addEventListener("submit", event => { event.preventDefault(); submitAnswer().catch(handleError); });
    els.dialog.addEventListener("cancel", event => { event.preventDefault(); closeDialog(); });
    els.dialog.addEventListener("click", event => {
      const choice = event.target.closest?.("[data-kotoba-particle-choice]");
      if (choice) { event.preventDefault(); submitParticleAnswer(choice.dataset.kotobaParticleChoice).catch(handleError); return; }
      const grade = event.target.closest?.("[data-kotoba-grammar-grade]");
      if (grade) { event.preventDefault(); commitGrammarGrade(grade.dataset.kotobaGrammarGrade).catch(handleError); }
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
      if (Number(s.quickSession.schemaVersion || 0) < SESSION_SCHEMA) s.quickSession = migrateLegacySession(s.quickSession);
      normalizeSession(s.quickSession);
    }
    s.liveBridgeUrl = String(s.liveBridgeUrl || "");
    return s;
  }

  function migrateLegacySession(old) {
    const tasks = (Array.isArray(old.items) ? old.items : []).map(item => {
      const itemId = String(item?.itemId || "");
      const results = old.results?.[itemId] || { listening:false, production:false };
      const errors = old.errors?.[itemId] || { listening:false, production:false };
      const committed = old.committed?.[itemId];
      const skipped = old.skipped?.[itemId];
      return {
        kind:"vocab", taskId:`vocab:${itemId}`, item,
        questions:(old.questions || []).filter(q => String(q?.itemId) === itemId), questionIndex:0,
        results:{ listening:Boolean(results.listening), production:Boolean(results.production) },
        errors:{ listening:Boolean(errors.listening), production:Boolean(errors.production) },
        status: committed ? "committed" : skipped ? "skipped" : "active",
        committed: committed || null, skipped: skipped || null, feedback:null
      };
    });
    return {
      schemaVersion:SESSION_SCHEMA, status:old.status || "active", mode:old.mode || "tiny", sessionId:old.sessionId || makeId("lr-kotoba-session"),
      createdAt:Number(old.createdAt || Date.now()), tasks, taskIndex:0, earned:old.earned || emptyEarned(), completedAt:old.completedAt || null, endedAt:old.endedAt || null
    };
  }

  function normalizeSession(current) {
    current.schemaVersion = SESSION_SCHEMA;
    current.tasks = Array.isArray(current.tasks) ? current.tasks : [];
    current.taskIndex = Math.max(0, Number(current.taskIndex || 0));
    current.earned ||= emptyEarned();
    current.tasks.forEach(task => {
      task.kind = ["vocab","grammar","particle"].includes(task.kind) ? task.kind : "vocab";
      task.status ||= "active";
      task.feedback ||= null;
      if (task.kind === "vocab") {
        task.questions = Array.isArray(task.questions) ? task.questions : [];
        task.questionIndex = Math.max(0, Number(task.questionIndex || 0));
        task.results ||= { listening:false, production:false };
        task.errors ||= { listening:false, production:false };
      }
    });
    skipResolvedTasks(current);
    return current;
  }

  function state() { return ensureState(); }
  function session() { return state().quickSession || null; }
  function save(reason) { app.saveState({ source:reason || "kotoba-quick-training" }); renderEntryButtons(); }
  function emptyEarned() { return { xp:0, realmXP:0, statXP:0, coins:0, storyEnergy:0, rewardEvents:0 }; }
  function activeSession() { const current=session(); return current && current.status === "active" ? current : null; }

  function dueCounts() {
    const counts = state().dueSnapshot?.counts || {};
    const vocabulary = Math.max(0, Number(counts.vocabularyCore || 0)) + Math.max(0, Number(counts.vocabularyMining || 0));
    const grammar = Math.max(0, Number(counts.grammar || 0));
    const particles = Math.max(0, Number(counts.particles || 0));
    return { vocabulary, grammar, particles, total:vocabulary + grammar + particles };
  }

  function renderEntryButtons() {
    const connected = Boolean(state().enabled), current = activeSession(), due = dueCounts();
    els.tiny?.classList.toggle("hidden", !connected); els.quick?.classList.toggle("hidden", !connected);
    if (!connected) return;
    if (current) {
      const done = current.tasks.filter(isResolvedTask).length, total=current.tasks.length;
      els.tiny.textContent = `▶ Resume Japanese · ${done}/${total} reviews`;
      els.tiny.disabled = false;
      if (els.quick) { els.quick.textContent = "Start another session after this one"; els.quick.disabled = true; }
      if (els.hint) els.hint.textContent = "Your unfinished mixed Kotoba session is saved and ready to resume.";
      return;
    }
    els.tiny.textContent = due.total ? `🌱 Tiny Japanese · ${Math.min(5,due.total)} reviews` : "🌱 Tiny Japanese · nothing due";
    els.tiny.disabled = due.total <= 0;
    if (els.quick) { els.quick.textContent = due.total ? `🌸 Quick Japanese · ${Math.min(10,due.total)} reviews` : "🌸 Quick Japanese · nothing due"; els.quick.disabled = due.total <= 0; }
    if (els.hint) els.hint.textContent = due.total
      ? `Real Kotoba SRS · ${due.vocabulary} vocab · ${due.grammar} grammar · ${due.particles} particles due. Kotoba confirms every review before Life RPG rewards it.`
      : "Nothing is due in Kotoba right now. Quick Japanese never invents fake SRS debt.";
  }

  async function startOrResume(mode) {
    if (!state().enabled) throw new Error("Connect Kotoba Quest first.");
    const existing=activeSession();
    if (existing) { await ensureLiveBridge(); openDialog(); renderSession(); return; }
    const requested = mode === "quick" ? 10 : 5;
    await ensureLiveBridge(); setDialogLoading(mode === "quick" ? "Quick Japanese" : "Tiny Japanese"); openDialog();
    const created = await requestBridge("create-mixed-session", { limit:requested, sessionId:makeId("lr-kotoba-session") });
    if (!created?.tasks?.length) {
      closeDialog(); await integration.syncNow?.().catch(() => {}); app.showToast?.("🌸 Kotoba has no due reviews right now."); return;
    }
    state().quickSession = {
      schemaVersion:SESSION_SCHEMA, status:"active", mode, sessionId:String(created.sessionId || makeId("lr-kotoba-session")), createdAt:Number(created.createdAt || Date.now()),
      tasks:created.tasks.map(normalizeCreatedTask), taskIndex:0, earned:emptyEarned(), counts:created.counts || {}, feedback:null
    };
    save("kotoba-quick-start"); renderSession();
  }

  function normalizeCreatedTask(task) {
    if (task.kind === "vocab") return { ...task, status:"active", questionIndex:0, results:{listening:false,production:false}, errors:{listening:false,production:false}, feedback:null, committed:null, skipped:null };
    return { ...task, status:"active", feedback:null, evaluation:null, answer:"", committed:null, skipped:null };
  }

  function setDialogLoading(title) {
    if (els.title) els.title.textContent=title;
    if (els.progress) els.progress.innerHTML="Connecting to Kotoba's review engine…";
    if (els.question) els.question.innerHTML='<div class="kotoba-quick-loading-v314j">Loading your real due Kotoba reviews…</div>';
    els.form?.classList.add("hidden"); els.feedback?.classList.add("hidden"); els.speak?.classList.add("hidden"); els.next?.classList.add("hidden");
  }
  function openDialog(){ if(!els.dialog.open) els.dialog.showModal(); }
  function closeDialog(){ if(els.dialog.open) els.dialog.close(); window.setTimeout(releaseLiveBridgeWhenIdle,120); }
  function releaseLiveBridgeWhenIdle(){ if(pending.size){window.setTimeout(releaseLiveBridgeWhenIdle,250);return;} bridgeFrame?.remove();bridgeFrame=null;bridgeReadyPromise=null; }

  function endSession() {
    const current=activeSession(); if(!current){closeDialog();return;}
    const done=current.tasks.filter(task=>task.status==="committed").length;
    if(!done&&!window.confirm("End this Quick Japanese session? No Kotoba reviews have been committed yet."))return;
    current.status="ended";current.endedAt=Date.now();save("kotoba-quick-end");closeDialog();app.showToast?.(done?`Japanese session ended · ${done} Kotoba reviews confirmed.`:"Japanese session ended.");
  }

  function isResolvedTask(task){ return task?.status === "committed" || task?.status === "skipped"; }
  function skipResolvedTasks(current){ while(current.taskIndex < current.tasks.length && isResolvedTask(current.tasks[current.taskIndex])) current.taskIndex++; }
  function currentTask(current=activeSession()){ if(!current)return null;skipResolvedTasks(current);return current.tasks[current.taskIndex] || null; }

  function renderSession() {
    const current=activeSession(); if(!current){renderFinishedSession(session());return;}
    const task=currentTask(current); if(!task){finishSession(current);return;}
    const done=current.tasks.filter(isResolvedTask).length,total=current.tasks.length;
    const percent=Math.min(100,Math.round(done/Math.max(1,total)*100));
    if(els.title)els.title.textContent=current.mode==="quick"?"Quick Japanese":"Tiny Japanese";
    if(els.progress)els.progress.innerHTML=`<div><strong>${done}/${total} Kotoba reviews confirmed</strong> · ${escapeHtml(taskKindLabel(task.kind))}</div><div class="bar"><span style="width:${percent}%"></span></div>`;
    setFeedback(null); els.next?.classList.add("hidden"); if(els.end)els.end.disabled=false;
    if(task.kind==="vocab")renderVocabTask(current,task);
    else if(task.kind==="grammar")renderGrammarTask(current,task);
    else renderParticleTask(current,task);
  }

  function taskKindLabel(kind){ return kind==="grammar"?"Grammar":kind==="particle"?"Particles":"Vocabulary"; }

  function renderVocabTask(current,task) {
    while(task.questionIndex < task.questions.length) {
      const q=task.questions[task.questionIndex], type=directionType(q.direction);
      if(task.results?.[type]===true){task.questionIndex++;continue;} break;
    }
    if(task.questionIndex>=task.questions.length){
      for(const type of ["listening","production"])if(task.results?.[type]!==true)task.questions.push({itemId:task.item.itemId,direction:type==="production"?"de-jp":"jp-de",repeated:true});
    }
    const q=task.questions[task.questionIndex]; if(!q){task.status="skipped";task.skipped={reason:"missing-question"};save("kotoba-vocab-skip");renderSession();return;}
    const item=task.item,isMeaning=q.direction==="jp-de";
    const prompt=isMeaning?item.word:(item.productionCue||item.meanings?.join(" / ")||"Meaning");
    const sub=isMeaning?"Recall the German meaning. Kotoba grades accepted meanings and typo tolerance.":"Recall the Japanese word. Romaji is okay; Kotoba converts and grades it.";
    els.question.innerHTML=`<div class="kotoba-quick-direction-v314j">Vocabulary · ${isMeaning?"Japanese → German":"German → Japanese"}${q.repeated?" · retry":""}</div><div class="kotoba-quick-prompt-v314j ${isMeaning?"":"is-meaning"}">${escapeHtml(prompt)}</div><div class="kotoba-quick-sub-v314j">${escapeHtml(sub)}</div>`;
    showTextForm(isMeaning?"German meaning":"Japanese word · Romaji or Kana");
    els.speak?.classList.toggle("hidden",!isMeaning);
  }

  function renderGrammarTask(current,task) {
    const g=task.task || {};
    const sentence=g.skillId==="listening"?"":g.shown;
    const prompt=g.prompt || "Answer the grammar prompt.";
    els.question.innerHTML=`<div class="kotoba-quick-direction-v314j">Grammar · ${escapeHtml(g.skillLabel||g.skillId||"")}</div><div class="kotoba-quick-grammar-title-v314k"><strong>${escapeHtml(g.title||g.pattern||"Grammar")}</strong>${g.pattern&&g.pattern!==g.title?`<span>${escapeHtml(g.pattern)}</span>`:""}</div><div class="kotoba-quick-sub-v314j">${escapeHtml(prompt)}</div>${sentence?`<div class="kotoba-quick-sentence-v314k">${escapeHtml(sentence)}</div>`:""}${g.skillId==="listening"?'<div class="kotoba-quick-listening-v314k">🔊 Listen to the sentence, then answer from what you heard.</div>':""}`;
    if(task.evaluation && !task.committed){
      els.form?.classList.add("hidden");
      els.speak?.classList.toggle("hidden",g.skillId!=="listening");
      renderGrammarEvaluation(task);
      return;
    }
    showTextForm(g.skillId==="form"||g.skillId==="production"?"Romaji or Japanese":"Your answer");
    els.speak?.classList.toggle("hidden",g.skillId!=="listening");
  }

  function renderGrammarEvaluation(task) {
    const g=task.task||{}, ev=task.evaluation||{};
    const kind=ev.likely===true?"good":ev.likely===false?"warning":"warning";
    const intro=ev.likely===true?"Kotoba thinks this is likely correct.":ev.likely===false?"Kotoba suggests comparing this carefully.":"Compare your answer with Kotoba's model.";
    setFeedback(kind, `${intro} ${ev.note||""}`.trim());
    els.feedback.innerHTML += `<div class="kotoba-quick-model-v314k"><small>Model answer</small><strong>${escapeHtml(ev.model||g.model||"—")}</strong></div><div class="kotoba-quick-grade-grid-v314k"><button type="button" data-kotoba-grammar-grade="bad">3 · Wrong</button><button type="button" data-kotoba-grammar-grade="close">2 · Almost</button><button type="button" data-kotoba-grammar-grade="good">1 · Correct</button></div><small class="kotoba-quick-grade-note-v314k">Same Kotoba SRS semantics: Correct raises the stage; Almost keeps it and returns in 1 hour; Wrong lowers it and returns in 30 minutes.</small>`;
  }

  function renderParticleTask(current,task) {
    const p=task.task||{};
    els.question.innerHTML=`<div class="kotoba-quick-direction-v314j">Particles · ${escapeHtml(p.skillLabel||p.skillId||"")}</div><div class="kotoba-quick-grammar-title-v314k"><strong>${escapeHtml(p.title||p.particle||"Particle")}</strong></div><div class="kotoba-quick-sub-v314j">${escapeHtml(p.prompt||"Choose the fitting particle.")}</div><div class="kotoba-quick-sentence-v314k">${escapeHtml(p.sentence||"")}</div>${p.translation?`<div class="kotoba-quick-translation-v314k">${escapeHtml(p.translation)}</div>`:""}`;
    els.speak?.classList.add("hidden");
    if(p.type!=="input" && Array.isArray(p.choices) && p.choices.length){
      els.form?.classList.add("hidden");
      els.question.insertAdjacentHTML("beforeend",`<div class="kotoba-quick-choice-grid-v314k">${p.choices.map(choice=>`<button type="button" data-kotoba-particle-choice="${escapeAttr(choice)}">${escapeHtml(choice)}</button>`).join("")}</div>`);
    }else showTextForm("Particle · Romaji or Kana");
  }

  function showTextForm(placeholder){ els.form?.classList.remove("hidden"); if(els.input){els.input.disabled=false;els.input.value="";els.input.placeholder=placeholder;setTimeout(()=>els.input?.focus(),20);}if(els.check)els.check.disabled=false; }

  async function submitAnswer() {
    const current=activeSession(),task=currentTask(current),answer=String(els.input?.value||"").trim();
    if(!current||!task||!answer)return;
    if(els.check)els.check.disabled=true;if(els.input)els.input.disabled=true;
    try{
      if(task.kind==="vocab")await submitVocabAnswer(current,task,answer);
      else if(task.kind==="grammar")await submitGrammarAnswer(current,task,answer);
      else await submitParticleAnswer(answer);
    }catch(error){if(els.check)els.check.disabled=false;if(els.input)els.input.disabled=false;throw error;}
  }

  async function submitVocabAnswer(current,task,answer) {
    const q=task.questions[task.questionIndex]; if(!q)return;
    const evaluated=await requestBridge("evaluate-vocabulary",{itemId:q.itemId,direction:q.direction,answer});
    if(!evaluated?.ok)throw new Error(evaluated?.message||"Kotoba could not grade this answer.");
    const type=directionType(q.direction);
    if(evaluated.status==="wrongType"||evaluated.status==="romajiLeftover"){
      setFeedback("warning",evaluated.status==="wrongType"?(type==="listening"?"That is the Japanese form; give the German meaning.":"That is the meaning; give the Japanese word."):"There is still unconverted Romaji in the answer.");
      els.input.disabled=false;els.input.focus();els.check.disabled=false;return;
    }
    if(evaluated.status==="correct"){
      task.results[type]=true;
      let commit=null;
      if(task.results.listening&&task.results.production&&!task.committed)commit=await commitVocabTask(current,task);
      setFeedback("good",commit?.committed?`Correct · Kotoba confirmed this word. Stage ${commit.stageBefore} → ${commit.stageAfter}.`:"Correct ✓");
    }else if(evaluated.status==="close"){
      requeueVocab(task,q);setFeedback("warning",`Almost right. Kotoba expected: ${evaluated.expected}. This direction will return later without a genuine SRS error.`);
    }else{
      task.errors[type]=true;requeueVocab(task,q);setFeedback("bad",`Not quite. Kotoba expected: ${evaluated.expected}. This direction will return later.`);
    }
    save("kotoba-quick-vocab-answer");els.form?.classList.add("hidden");els.next?.classList.remove("hidden");setTimeout(()=>els.next?.focus(),20);
  }

  function requeueVocab(task,q,minGap=2){const insert=Math.min(task.questions.length,task.questionIndex+1+Math.max(1,minGap));task.questions.splice(insert,0,{itemId:q.itemId,direction:q.direction,repeated:true});}

  async function commitVocabTask(current,task) {
    const item=task.item,commandId=`life-rpg:${current.sessionId}:${task.taskId}`;
    const response=await requestBridge("commit-vocabulary-item",{commandId,sessionId:current.sessionId,itemId:item.itemId,expectedStage:item.stage,errors:task.errors});
    if(!response?.ok||!response?.committed)return handleCommitFailure(current,task,response,"vocabulary");
    task.status="committed";task.committed={at:Date.now(),commandId,stageBefore:Number(response.stageBefore??item.stage??0),stageAfter:Number(response.stageAfter??0),duplicate:Boolean(response.duplicate)};
    if(response.snapshot?.counts)state().dueSnapshot=response.snapshot;
    for(const skill of ["listening","production"]){const reward=integration.awardExternalConfirmedReview?.({sourceId:`${commandId}:${skill}`,type:"vocab-review",label:`Kotoba Quick · ${item.word||"Vocabulary"} · ${skill==="listening"?"JP → DE":"DE → JP"}`,itemId:item.itemId,skill,at:Date.now(),sessionId:current.sessionId});accumulateReward(current.earned,reward);}
    save("kotoba-quick-vocab-commit");return response;
  }

  async function submitGrammarAnswer(current,task,answer) {
    const g=task.task||{};
    const evaluated=await requestBridge("evaluate-grammar",{pointId:g.pointId,skillId:g.skillId,answer,question:g.question});
    if(!evaluated?.ok)throw new Error(evaluated?.message||"Kotoba could not assess this grammar answer.");
    task.answer=answer;task.evaluation=evaluated;save("kotoba-quick-grammar-evaluate");els.form?.classList.add("hidden");renderGrammarEvaluation(task);
  }

  async function commitGrammarGrade(grade) {
    const current=activeSession(),task=currentTask(current);if(!current||task?.kind!=="grammar"||!task.evaluation)return;
    const g=task.task||{},commandId=`life-rpg:${current.sessionId}:${task.taskId}`;
    const response=await requestBridge("commit-grammar-review",{commandId,sessionId:current.sessionId,pointId:g.pointId,skillId:g.skillId,grade,expectedStage:g.stage,expectedDueAt:g.dueAt});
    if(!response?.ok||!response?.committed){handleCommitFailure(current,task,response,"grammar");return;}
    task.status="committed";task.committed={at:Date.now(),commandId,grade,stageBefore:Number(response.stageBefore||0),stageAfter:Number(response.stageAfter||0),duplicate:Boolean(response.duplicate)};
    if(response.snapshot?.counts)state().dueSnapshot=response.snapshot;
    const reward=integration.awardExternalConfirmedReview?.({sourceId:commandId,type:"grammar-review",label:`Kotoba Quick · ${g.title||g.pattern||"Grammar"} · ${g.skillLabel||g.skillId}`,itemId:g.pointId,skill:g.skillId,at:Date.now(),sessionId:current.sessionId});accumulateReward(current.earned,reward);
    save("kotoba-quick-grammar-commit");setFeedback(grade==="good"?"good":grade==="close"?"warning":"bad",`Kotoba confirmed: ${grade==="good"?"Correct":grade==="close"?"Almost right":"Wrong"} · stage ${response.stageBefore} → ${response.stageAfter}.`);els.next?.classList.remove("hidden");
  }

  async function submitParticleAnswer(answer) {
    const current=activeSession(),task=currentTask(current);if(!current||task?.kind!=="particle")return;
    const p=task.task||{}; disableCurrentInput();
    const evaluated=await requestBridge("evaluate-particle",{pointId:p.pointId,skillId:p.skillId,answer,task:p});
    if(!evaluated?.ok)throw new Error(evaluated?.message||"Kotoba could not grade this particle review.");
    const commandId=`life-rpg:${current.sessionId}:${task.taskId}`;
    const response=await requestBridge("commit-particle-review",{commandId,sessionId:current.sessionId,pointId:p.pointId,skillId:p.skillId,correct:Boolean(evaluated.correct),entered:String(evaluated.entered||answer),expectedStage:p.stage,expectedDueAt:p.dueAt});
    if(!response?.ok||!response?.committed){handleCommitFailure(current,task,response,"particle");return;}
    task.status="committed";task.committed={at:Date.now(),commandId,correct:Boolean(evaluated.correct),stageBefore:Number(response.stageBefore||0),stageAfter:Number(response.stageAfter||0),duplicate:Boolean(response.duplicate)};
    if(response.snapshot?.counts)state().dueSnapshot=response.snapshot;
    const reward=integration.awardExternalConfirmedReview?.({sourceId:commandId,type:"particle-review",label:`Kotoba Quick · ${p.title||p.particle||"Particle"} · ${p.skillLabel||p.skillId}`,itemId:p.pointId,skill:p.skillId,at:Date.now(),sessionId:current.sessionId});accumulateReward(current.earned,reward);
    save("kotoba-quick-particle-commit");setFeedback(evaluated.correct?"good":"bad",evaluated.correct?`Correct · Kotoba confirmed 「${evaluated.expected}」. Stage ${response.stageBefore} → ${response.stageAfter}.`:`Not quite · correct is 「${evaluated.expected}」. Kotoba saved the review and will bring it back sooner.`);els.form?.classList.add("hidden");els.next?.classList.remove("hidden");
  }

  function disableCurrentInput(){if(els.check)els.check.disabled=true;if(els.input)els.input.disabled=true;els.question?.querySelectorAll("[data-kotoba-particle-choice]").forEach(b=>b.disabled=true);}

  function handleCommitFailure(current,task,response,label) {
    const code=String(response?.code||"");
    if(code==="stale-review"||code==="not-due"){
      task.status="skipped";task.skipped={reason:code,at:Date.now()};save(`kotoba-quick-${label}-stale`);app.showToast?.(`Kotoba changed this ${label} review elsewhere, so Life RPG skipped it instead of applying it twice.`);setFeedback("warning","Kotoba already changed this review in another session. It was safely skipped.");els.form?.classList.add("hidden");els.next?.classList.remove("hidden");return {committed:false,skipped:true};
    }
    throw new Error(response?.message||`Kotoba did not confirm this ${label} review.`);
  }

  function advanceAfterFeedback() {
    const current=activeSession();if(!current)return;
    const task=current.tasks[current.taskIndex];if(!task){renderSession();return;}
    if(task.kind==="vocab" && !isResolvedTask(task)) task.questionIndex++;
    else if(isResolvedTask(task)) current.taskIndex++;
    task.feedback=null;save("kotoba-quick-next");renderSession();
  }

  function finishSession(current){current.status="completed";current.completedAt=Date.now();save("kotoba-quick-complete");integration.syncNow?.().catch(()=>{});renderFinishedSession(current);}

  function renderFinishedSession(current) {
    if(!current){closeDialog();return;}
    const committed=current.tasks?.filter(task=>task.status==="committed").length||0,skipped=current.tasks?.filter(task=>task.status==="skipped").length||0,earned=current.earned||emptyEarned(),due=dueCounts();
    const kinds=current.tasks?.reduce((acc,t)=>(acc[t.kind]=(acc[t.kind]||0)+(t.status==="committed"?1:0),acc),{})||{};
    if(els.title)els.title.textContent="Japanese training complete";
    if(els.progress)els.progress.innerHTML=`<strong>${committed} Kotoba reviews confirmed</strong>${skipped?` · ${skipped} safely skipped`:""}`;
    if(els.question)els.question.innerHTML=`<div class="kotoba-quick-summary-v314j"><div class="kotoba-quick-prompt-v314j" style="font-size:3rem">🌸</div><h3>Real Kotoba progress, directly from Life RPG.</h3><p class="kotoba-quick-mix-summary-v314k">${kinds.vocab||0} vocab · ${kinds.grammar||0} grammar · ${kinds.particle||0} particle reviews</p><div class="kotoba-quick-summary-grid-v314j"><div><strong>+${earned.realmXP}</strong><span>Japanese Realm XP</span></div><div><strong>+${earned.coins}</strong><span>Coins</span></div><div><strong>+${formatEnergy(earned.storyEnergy)}</strong><span>Story Energy</span></div></div><p class="muted">+${earned.xp} Character XP · +${earned.statXP} Japanese Skill XP · ${due.total} total Kotoba reviews currently remain due.</p></div>`;
    setFeedback(null);els.form?.classList.add("hidden");els.speak?.classList.add("hidden");els.next?.classList.add("hidden");
    if(els.end){els.end.textContent="Close";els.end.onclick=closeDialog;}if(els.saveNote)els.saveNote.textContent="Every reward above was credited only after Kotoba itself persisted the corresponding SRS review. Life RPG-origin events are ignored by the later normal sync payout.";
  }

  function accumulateReward(total,reward){if(!reward||reward.duplicate)return;total.xp+=Math.max(0,Number(reward.xp||0));total.realmXP+=Math.max(0,Number(reward.realmXP||0));total.statXP+=Math.max(0,Number(reward.statXP||0));total.coins+=Math.max(0,Number(reward.coins||0));total.storyEnergy=round2(total.storyEnergy+Math.max(0,Number(reward.storyEnergy||0)));total.rewardEvents+=1;}
  function directionType(direction){return String(direction)==="de-jp"?"production":"listening";}

  function setFeedback(kind,message=""){
    if(!kind||!message){els.feedback?.classList.add("hidden");if(els.feedback){els.feedback.textContent="";els.feedback.removeAttribute("data-kind");}return;}
    if(els.feedback){els.feedback.dataset.kind=kind;els.feedback.textContent=message;els.feedback.classList.remove("hidden");}
  }

  function speakCurrentPrompt(){
    const task=currentTask();if(!task||!("speechSynthesis" in window))return;
    let text="";
    if(task.kind==="vocab")text=task.item?.word||"";
    else if(task.kind==="grammar")text=task.task?.audio||task.task?.shown||"";
    if(!text)return;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ja-JP";u.rate=.9;speechSynthesis.speak(u);}catch{}
  }

  async function ensureLiveBridge(){
    if(bridgeReadyPromise)return bridgeReadyPromise;
    bridgeReadyPromise=(async()=>{
      const url=await resolveKotobaUrl();if(!url)throw new Error("Life RPG could not find Kotoba Quest on this GitHub Pages origin.");
      if(new URL(url,location.href).origin!==location.origin)throw new Error("Quick Japanese currently requires Kotoba Quest and Life RPG on the same browser origin.");
      bridgeFrame?.remove();bridgeFrame=document.createElement("iframe");bridgeFrame.id="kotobaLiveBridgeFrame";bridgeFrame.title="Kotoba Quest live review bridge";bridgeFrame.tabIndex=-1;bridgeFrame.setAttribute("aria-hidden","true");bridgeFrame.style.cssText="position:fixed;width:1px;height:1px;left:-10000px;top:-10000px;border:0;opacity:0;pointer-events:none";
      const target=new URL(url,location.href);target.searchParams.set("lifeRpgBridge","1");bridgeFrame.src=target.href;document.body.appendChild(bridgeFrame);
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Kotoba Quest took too long to load for Quick Japanese.")),REQUEST_TIMEOUT_MS);bridgeFrame.addEventListener("load",()=>{clearTimeout(timer);resolve();},{once:true});bridgeFrame.addEventListener("error",()=>{clearTimeout(timer);reject(new Error("Kotoba Quest could not be loaded for Quick Japanese."));},{once:true});});
      let ping=null,lastError=null;for(let attempt=0;attempt<8;attempt++){try{ping=await requestBridge("ping",{},5000);if(ping?.reviewWriteBackAvailable)break;}catch(error){lastError=error;}await sleep(450);}if(!ping?.reviewWriteBackAvailable)throw lastError||new Error("Kotoba Quest needs the write-back bridge update before Quick Japanese can save reviews.");
      const kinds=ping.reviewWriteBackKinds||{};if(!kinds.grammar||!kinds.particles)throw new Error("Kotoba Quest needs the V5 mixed-review bridge before Grammar and Particle Quick Japanese can run.");return ping;
    })().catch(error=>{bridgeReadyPromise=null;bridgeFrame?.remove();bridgeFrame=null;throw error;});return bridgeReadyPromise;
  }

  async function resolveKotobaUrl(){const s=state();if(s.liveBridgeUrl)return s.liveBridgeUrl;const origin=location.origin,candidates=[`${origin}/kotoba-quest/cloud.html`,`${origin}/Kotoba-Quest/cloud.html`,`${origin}/kotoba-quest-main/cloud.html`,`${origin}/KotobaQuest/cloud.html`,`${origin}/kotobaquest/cloud.html`];for(const candidate of candidates){try{const response=await fetch(candidate,{method:"HEAD",cache:"no-store"});if(response.ok){s.liveBridgeUrl=candidate;save("kotoba-live-url-discovered");return candidate;}}catch{}}const entered=window.prompt("Life RPG could not auto-detect Kotoba Quest. Paste the URL to Kotoba's cloud.html once:",candidates[0]);if(!entered)return"";let parsed;try{parsed=new URL(entered,location.href);}catch{throw new Error("That Kotoba Quest URL is not valid.");}if(parsed.origin!==location.origin)throw new Error("Quick Japanese requires Kotoba cloud.html on the same browser origin as Life RPG.");s.liveBridgeUrl=parsed.href;save("kotoba-live-url-manual");return parsed.href;}

  function requestBridge(action,payload={},timeout=REQUEST_TIMEOUT_MS){if(!bridgeFrame?.contentWindow)return Promise.reject(new Error("Kotoba live bridge is not loaded."));const requestId=makeId("lr-kq-request");return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error("Kotoba did not answer the Quick Japanese request in time."));},timeout);pending.set(requestId,{resolve,reject,timer});bridgeFrame.contentWindow.postMessage({type:REQUEST_TYPE,requestId,action,payload},location.origin);});}
  function onBridgeMessage(event){if(event.origin!==location.origin||event.source!==bridgeFrame?.contentWindow)return;const message=event.data;if(!message||message.type!==RESPONSE_TYPE||!message.requestId)return;const row=pending.get(String(message.requestId));if(!row)return;clearTimeout(row.timer);pending.delete(String(message.requestId));if(message.ok)row.resolve(message.result);else row.reject(new Error(String(message.error||"Kotoba live bridge failed.")));}
  function handleError(error){console.error("Kotoba Quick Japanese failed",error);setFeedback("bad",friendlyError(error));app.showToast?.(friendlyError(error));if(els.check)els.check.disabled=false;if(els.input)els.input.disabled=false;}
  function friendlyError(error){return String(error?.message||error||"Quick Japanese failed.").slice(0,320);}
  function makeId(prefix){try{return`${prefix}-${crypto.randomUUID()}`;}catch{return`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}}
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function round2(value){return Math.round(Number(value||0)*100)/100;}
  function formatEnergy(value){const n=round2(value);return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");}
  function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));}
  function escapeAttr(value){return escapeHtml(value).replace(/`/g,"&#96;");}
  function byId(id){return document.getElementById(id);}

  window.LifeRPGKotobaQuickTraining={version:VERSION,startTiny:()=>startOrResume("tiny"),startQuick:()=>startOrResume("quick"),getSession:()=>JSON.parse(JSON.stringify(session()||null)),resetBridgeUrl:()=>{state().liveBridgeUrl="";bridgeReadyPromise=null;bridgeFrame?.remove();bridgeFrame=null;save("kotoba-live-url-reset");}};
})();
