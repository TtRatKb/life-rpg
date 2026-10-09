/* Life RPG DZ22 — source-backed practice, additive main-save state. */
(() => {
  "use strict";
  const app = window.LifeRPGApp;
  if (!app?.getState || window.LifeRPGKnowledgePractice) return;
  const escape = value => app.escapeHtml(String(value ?? ""));
  const iso = () => new Date().toISOString();
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  function model() {
    const root = app.getState();
    root.knowledgePracticeV1 ||= { schemaVersion:1, active:null, reviews:{}, paid:{}, history:[] };
    return root.knowledgePracticeV1;
  }
  const save = () => app.saveState({source:"knowledge-practice", suppressUiRefresh:true});
  function sources() {
    const root = app.getState(), result = [];
    for (const d of root.knowledgeWorkshopV1?.documents || []) {
      const text = [d.summary,d.body].filter(Boolean).join("\n\n").trim();
      if (d.id && String(d.title || "").trim() && text) result.push({key:`garden:${d.id}`,cue:d.title,text,kind:"Knowledge Garden",at:d.createdAt || d.updatedAt});
    }
    const pool = window.LIFE_RPG_LEXICON_POOL?.entries || window.LIFE_RPG_LEXICON_LAB_DATA?.entries || [];
    for (const e of pool) {
      const record = root.lexiconLab?.words?.[e.id];
      const text = String(e.definition || e.clue || "").trim();
      if (e.id && e.term && text && (record?.selfRating || Number(record?.encounters) > 0)) result.push({key:`lexicon:${e.id}`,cue:e.term,text,kind:"Fachwörter",at:record.selfRatedAt || record.lastSeen});
    }
    return result;
  }
  function candidates(mode, filter="all") {
    const now = Date.now(), reviews = model().reviews;
    return sources().filter(s => (filter === "all" || s.key.startsWith(filter+":")) && (mode !== "recall" || (Number.isFinite(Date.parse(s.at)) && now-Date.parse(s.at) >= 86400000)))
      .sort((a,b) => {
        const ra=reviews[a.key], rb=reviews[b.key];
        const due = r => !r || Date.parse(r.dueAt) <= now ? 0 : 1;
        return due(ra)-due(rb) || (Date.parse(ra?.lastAt) || 0)-(Date.parse(rb?.lastAt) || 0) || (Date.parse(a.at) || 0)-(Date.parse(b.at) || 0) || a.key.localeCompare(b.key);
      });
  }
  function start(mode, filter="all") {
    if (!["explain","recall"].includes(mode)) return false;
    if (model().active && !model().active.completedAt) { render(); return true; }
    const list = candidates(mode,filter).slice(0,mode === "recall" ? 5 : 1);
    if (list.length < (mode === "recall" ? 3 : 1)) { app.showToast?.(mode === "recall" ? "Recall braucht mindestens drei Quellen, die du seit gestern kennst." : "Speichere zuerst eine benannte Garden-Notiz oder lerne ein Fachwort kennen."); return false; }
    model().active = {id:`kp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,mode,index:0,startedAt:iso(),items:list.map(({text,...cue})=>({...cue,answer:"",revealed:false,rating:null}))};
    save(); render(); return true;
  }
  function reveal(missed=false) {
    const s=model().active, item=s?.items[s.index];
    if (!item || s.completedAt || item.revealed) return false;
    if (!missed && !item.answer.trim()) return false;
    item.revealed=true; item.noRecall=missed;
    save(); render(); return true;
  }
  function rate(rating) {
    const s=model().active, item=s?.items[s.index];
    if (!item?.revealed || item.rating || s.completedAt || !sources().some(source=>source.key===item.key) || !["got","partial","missed"].includes(rating)) return false;
    item.rating=rating;
    const delays={got:7,partial:2,missed:1};
    model().reviews[item.key]={lastAt:iso(),dueAt:new Date(Date.now()+delays[rating]*86400000).toISOString(),rating,attempts:(model().reviews[item.key]?.attempts || 0)+1};
    s.index++;
    if (s.index === s.items.length) finish();
    save(); render(); return true;
  }
  function finish() {
    const s=model().active;
    if (!s || s.completedAt || !s.items.every(i=>i.rating)) return false;
    const key=`${day()}:${s.mode}`;
    const prior=(app.getState().rewardLedger?.events || []).find(r=>r.sourceId===`kp:${key}` && !r.duplicate);
    const paid=model().paid[key] || prior?.id;
    if (!paid) {
      const amount=s.mode === "recall" ? 8 : 6;
      const reward=app.awardActivity({source:`knowledge-practice-${s.mode}`,sourceId:`kp:${key}`,label:s.mode === "recall" ? "Recall Drill" : "Explain It Back",realm:"Knowledge",capability:"knowledge",xp:amount,realmXP:amount,statXP:2,coins:2,storyEnergyBase:.25,progressionRelevant:true,skipAddOnRewards:true,metadata:{skillXP:amount,sessionId:s.id,itemCount:s.items.length}});
      model().paid[key]=reward.eventId;
      s.rewarded=!reward.deduped;
      window.LifeRPGSkills?.rebuild?.();
    } else s.rewarded=false;
    s.completedAt=iso();
    model().history.push({...s,items:s.items.map(i=>({key:i.key,answer:i.answer,rating:i.rating}))});
    model().history=model().history.slice(-40);
    let answerChars=model().history.reduce((sum,h)=>sum+h.items.reduce((n,i)=>n+i.answer.length,0),0);
    while(answerChars>50000 && model().history.length>1){const old=model().history.shift();answerChars-=old.items.reduce((n,i)=>n+i.answer.length,0);}
    return true;
  }
  let dialog, renderedActive;
  function setup() {
    if (dialog) return;
    dialog=document.createElement("dialog"); dialog.className="kp-dialog"; dialog.id="knowledgePracticeDialog";
    dialog.setAttribute("aria-labelledby","kpTitle"); document.body.appendChild(dialog);
    dialog.addEventListener("click", e=>{
      const b=e.target.closest("button"); if (!b) return;
      if (b.dataset.kpStart) start(b.dataset.kpStart,dialog.querySelector("select")?.value || "all");
      if (b.hasAttribute("data-kp-reveal")) reveal();
      if (b.hasAttribute("data-kp-miss")) reveal(true);
      if (b.dataset.kpRate) rate(b.dataset.kpRate);
      if (b.hasAttribute("data-kp-close")) dialog.close();
      if (b.hasAttribute("data-kp-abandon")) { model().active=null; save(); render(); }
    });
    dialog.addEventListener("input", e=>{
      if (e.target.id !== "kpAnswer") return;
      const s=model().active, item=s?.items[s.index];
      if (!item || item.revealed) return;
      item.answer=e.target.value.slice(0,10000); save();
      const b=dialog.querySelector("[data-kp-reveal]"); if(b)b.disabled=!item.answer.trim();
    });
  }
  function render() {
    setup(); const s=model().active; renderedActive=s;
    const heading=s?.mode === "recall" ? "Recall Drill" : s?.mode === "explain" ? "Explain It Back" : "Wissen aktiv nutzen";
    let content;
    if (!s) content=`<p>Erkläre einen Gedanken in eigenen Worten oder rufe 3–5 ältere Quellen aus dem Gedächtnis ab.</p><label>Quelle <select><option value="all">Garden + Fachwörter</option><option value="garden">Knowledge Garden</option><option value="lexicon">Fachwörter</option></select></label><div class="kp-actions"><button class="primary-button" data-kp-start="explain">Explain It Back</button><button class="secondary-button" data-kp-start="recall">Recall Drill</button></div><p class="muted">Recall verwendet nur Quellen, die mindestens einen Tag alt sind. Pro Übungsart wird die erste abgeschlossene Sitzung des Tages belohnt; weitere Sitzungen speichern deine Abrufe.</p>`;
    else if (s.completedAt) content=`<p>✓ ${s.items.length} Quelle${s.items.length>1?"n":""} bearbeitet. Deine Selbsteinschätzungen helfen bei der nächsten Auswahl.</p><p>${s.rewarded?"Belohnung und Skill-XP sind erfasst.":"Übung gespeichert. Die Tagesbelohnung für diese Übungsart war bereits vergeben."}</p><button class="primary-button" data-kp-abandon>Weitere Übung auswählen</button>`;
    else {
      const i=s.items[s.index], source=sources().find(item=>item.key===i.key);
      if(!source) {
        dialog.innerHTML=`<header><h2 id="kpTitle">${heading}</h2><button class="close-button" data-kp-close aria-label="Schließen">×</button></header><p>Diese Quelle ist nicht mehr in deiner Sammlung verfügbar.</p><button class="secondary-button" data-kp-abandon>Neue Übung auswählen</button>`;
        return;
      }
      content=`<p class="eyebrow">${escape(i.kind)} · ${s.index+1} / ${s.items.length}</p><h3>${escape(i.cue)}</h3><label for="kpAnswer">${s.mode === "explain" ? "Erkläre den Gedanken in eigenen Worten. Welches Beispiel passt dazu?" : "Was erinnerst du? Antworte kurz aus dem Gedächtnis."}</label><textarea id="kpAnswer" rows="5" maxlength="10000" ${i.revealed?"readonly":""}>${escape(i.answer)}</textarea>${i.revealed?`<section class="kp-source"><h3>Mit der Quelle vergleichen</h3><div>${escape(source.text)}</div></section><p>Wie gut passt dein Abruf? Alle Einschätzungen zählen als Übung.</p><div class="kp-actions"><button class="primary-button" data-kp-rate="got">Got it</button><button class="secondary-button" data-kp-rate="partial">Partial</button><button class="secondary-button" data-kp-rate="missed">Missed</button></div>`:`<div class="kp-actions"><button class="primary-button" data-kp-reveal ${i.answer.trim()?"":"disabled"}>Quelle aufdecken</button>${s.mode === "recall"?'<button class="secondary-button" data-kp-miss>Ich erinnere mich gerade nicht</button>':""}</div>`}<button class="text-button" data-kp-abandon>Übung beenden</button>`;
    }
    dialog.innerHTML=`<header><h2 id="kpTitle">${heading}</h2><button class="close-button" data-kp-close aria-label="Schließen">×</button></header>${content}`;
  }
  function open(mode) { setup(); render(); if(!dialog.open)dialog.showModal(); if(mode && !model().active)start(mode); }
  function attachGardenRoutes() {
    const host=document.querySelector?.("#kwContent .kw-hero-buttons");
    if(!host || host.querySelector("[data-kp-garden]"))return;
    for(const [mode,label] of [["explain","Explain It Back"],["recall","Recall Drill"]]) {
      const b=document.createElement("button");b.type="button";b.className="secondary-button";b.dataset.kpGarden=mode;b.textContent=label;
      b.addEventListener("click",()=>open(mode));host.appendChild(b);
    }
  }
  window.addEventListener("life-rpg:view-changed",attachGardenRoutes);
  window.addEventListener("life-rpg:render",()=>{if(dialog?.open && model().active!==renderedActive)render();});
  window.LifeRPGKnowledgePractice={version:"0.31.4dz22",open,_test:{sources,candidates,start,reveal,rate,finish,model}};
})();
