/* Life RPG V0.31.4do — Knowledge Workshop V1. Additive, local-first main-save documents. */
(() => {
  "use strict";
  if (window.LifeRPGKnowledgeWorkshop) return;
  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.awardActivity || !app?.saveState) return;
  const VERSION = "0.31.4do";
  const IDLE_MS = 180000, READ_CHECK_MS = 900000, MAX_TICK_MS = 10000;
  const $ = id => document.getElementById(id);
  const esc = text => app.escapeHtml(String(text ?? ""));
  const attr = text => esc(text).replaceAll("`", "&#096;");
  const nowIso = () => new Date().toISOString();
  const uid = () => `kw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const count = doc => String(doc.summary || "").trim().length + String(doc.body || "").trim().length;
  const TYPES = { insight:"Insight Card", guide:"Study Guide" };
  const RELATIONS = {related:"Verwandt",supports:"Ergänzt",contrasts:"Widerspricht",example:"Beispiel für",applies:"Anwendbar bei"};
  const FIRST = [
    {threshold:80,xp:2,coins:1},{threshold:250,xp:3,coins:2},{threshold:500,xp:4,coins:3},
    {threshold:900,xp:5,coins:3},{threshold:1500,xp:6,coins:4},{threshold:2500,xp:6,coins:4}
  ];
  function tier(i) {
    if (i < FIRST.length) return FIRST[i];
    const extra=i-FIRST.length+1;
    // Every additional 500 characters earns another bonus forever, with
    // diminishing marginal XP instead of an abrupt threshold that stops paying.
    const amount=Math.max(1,Math.round(5/(1+(extra-1)/4)));
    return {threshold:2500+extra*500,xp:amount,coins:Math.max(1,Math.round(amount*.65))};
  }
  function reached(chars){if(chars<=2500)return FIRST.filter(t=>chars>=t.threshold).length;return FIRST.length+Math.floor((chars-2500)/500);}
  function timeTier(i) {
    const mins=i<12?5*(i+1):i<24?60+10*(i-11):180+20*(i-23);
    return {seconds:mins*60,xp:Math.max(1,Math.round(2/(1+Math.max(0,i-11)/9))),coins:1};
  }
  function model() {
    const root=app.getState();
    if (!root.knowledgeWorkshopV1 || typeof root.knowledgeWorkshopV1!=="object" || Array.isArray(root.knowledgeWorkshopV1)) root.knowledgeWorkshopV1={schemaVersion:1,documents:[],selectedId:null};
    const s=root.knowledgeWorkshopV1;
    s.schemaVersion=1;
    if(!Array.isArray(s.documents))s.documents=[];
    for(const d of s.documents){
      if(!Array.isArray(d.links))d.links=[];
      if(!Array.isArray(d.awardedTiers))d.awardedTiers=[];
      if(!Array.isArray(d.awardedTimes))d.awardedTimes=[];
      if(!d.timeByDay || typeof d.timeByDay!=="object")d.timeByDay={};
      if(!Array.isArray(d.awardedLinks))d.awardedLinks=[];
      d.activeSeconds=Math.max(0,Number(d.activeSeconds)||0);
      d.eligibleSeconds=Math.max(0,Number(d.eligibleSeconds)||0);
    }
    return s;
  }
  function docs(){return model().documents;}
  function selected(){return docs().find(d=>d.id===model().selectedId)||null;}
  function books(){return (window.LifeRPGLibrary?.getItems?.()||app.getState().bookLibrary?.items||[]).filter(b=>b?.id&&b.title);}
  function bookTitle(d){return books().find(b=>b.id===d.bookId)?.title || d.sourceTitle || "";}
  function save(label){return app.saveState({source:`knowledge-workshop-${label}`,suppressUiRefresh:true});}
  function emptyDoc(type="insight",bookId="") {
    return {id:uid(),type:TYPES[type]?type:"insight",title:"",summary:"",body:"",bookId,sourceTitle:"",page:"",tags:"",links:[],awardedLinks:[],awardedTiers:[],awardedTimes:[],activeSeconds:0,eligibleSeconds:0,timeByDay:{},reviewedAt:null,createdAt:nowIso(),updatedAt:nowIso()};
  }
  function create(type="insight",bookId="") {
    flushDraft();checkpoint();const d=emptyDoc(type,bookId);docs().unshift(d);model().selectedId=d.id;engaged=false;reading=false;lastTick=Date.now();save("new");render();return d;
  }
  function choose(id){if(!docs().some(d=>d.id===id))return false;flushDraft();checkpoint();model().selectedId=id;engaged=false;reading=false;lastTick=Date.now();save("select");render();return true;}
  function exitEditor(){flushDraft();checkpoint();reading=false;engaged=false;model().selectedId=null;save("gallery");render();}
  function ledgerHas(sourceId){return (app.getState().rewardLedger?.events||[]).some(e=>e?.sourceId===sourceId&&!e.duplicate);}
  function award(d,suffix,spec){const sourceId=`${d.id}:${suffix}`;if(ledgerHas(sourceId))return null;return app.awardActivity({...spec,sourceId,realm:"Knowledge",capability:"knowledge",progressionRelevant:true,skipAddOnRewards:true});}
  function payWriting(d){
    const chars=count(d), n=reached(chars), issued=new Set(d.awardedTiers);
    for(let i=0;i<n;i++){
      if(issued.has(i))continue;
      const t=tier(i),rid=`text:${i}:${t.threshold}`;
      const reward=award(d,rid,{source:"knowledge-workshop-writing",label:`${TYPES[d.type]} · ${t.threshold}+ Zeichen`,xp:t.xp,realmXP:t.xp,statXP:Math.max(1,Math.round(t.xp*.5)),coins:t.coins,storyEnergyBase:0,metadata:{knowledgeWorkshop:true,documentId:d.id,type:d.type,characters:chars,threshold:t.threshold,why:`Writing milestone ${t.threshold} characters · ${t.xp} XP and ${t.coins} Coins. Previously earned milestones are not paid again.`}});
      if(reward||ledgerHas(`${d.id}:${rid}`)){d.awardedTiers.push(i);issued.add(i);}
    }
  }
  function payTime(d){
    const paid=new Set(d.awardedTimes);
    for(let i=0;i<3600;i++){
      const t=timeTier(i);
      if(d.eligibleSeconds<t.seconds)break;
      if(paid.has(i))continue;
      const rid=`time:${i}:${t.seconds}`;
      const reward=award(d,rid,{source:"knowledge-workshop-time",label:`Knowledge Workshop · ${Math.round(t.seconds/60)} min aktive Arbeit`,xp:t.xp,realmXP:t.xp,statXP:1,coins:t.coins,storyEnergyBase:0,metadata:{knowledgeWorkshop:true,documentId:d.id,activeSeconds:Math.floor(d.activeSeconds),eligibleSeconds:Math.floor(d.eligibleSeconds),why:"Active editor/reading time; pauses, hidden tabs and an existing Focus timer do not create an additional time payout."}});
      if(reward||ledgerHas(`${d.id}:${rid}`)){d.awardedTimes.push(i);paid.add(i);}
    }
  }
  function payLink(d,target,relation){const pair=[d.id,target.id].sort().join("::"),rid=`link:${pair}`;
    if(d.awardedLinks.includes(pair)||ledgerHas(`kw-edge:${pair}`))return;
    // A unique pair is rewarded once no matter which direction/relation is saved.
    const reward=app.awardActivity({source:"knowledge-workshop-connection",sourceId:`kw-edge:${pair}`,label:"Knowledge Garden · neue Verbindung",realm:"Knowledge",capability:"knowledge",xp:2,realmXP:2,statXP:1,coins:1,storyEnergyBase:0,progressionRelevant:true,skipAddOnRewards:true,metadata:{knowledgeWorkshop:true,from:d.id,to:target.id,relation}});
    if(reward)d.awardedLinks.push(pair);
  }
  function persistDraft(){const d=selected();if(!d)return;checkpoint();const form=$("kwEditor");if(!form)return;
    d.type=form.elements.type.value;d.title=form.elements.title.value.trim().slice(0,180);
    d.summary=form.elements.summary.value;d.body=form.elements.body.value;
    d.bookId=form.elements.bookId.value;d.sourceTitle=form.elements.sourceTitle.value.trim();
    d.page=form.elements.page.value.trim().slice(0,80);d.tags=form.elements.tags.value;
    d.updatedAt=nowIso();payWriting(d);const ok=save("autosave");const st=$("kwSaveStatus");if(st)st.textContent=ok?`Gespeichert ✓ · ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`:"Lokaler Speicher voll – bitte Save exportieren, bevor du die App schließt.";
    updateMeters(d);renderPreview(d);
  }
  let saveTimer=0,engaged=false,reading=false,lastTick=Date.now(),lastSignal=0,sessionDocId=null;
  function signal(){const d=selected();if(!d)return;checkpoint();reading=false;engaged=true;lastSignal=Date.now();lastTick=lastSignal;sessionDocId=d.id;}
  function dayKey(ms){const dt=new Date(ms);return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}
  function tick(){const d=selected(),now=Date.now();if(!d||!engaged||sessionDocId!==d.id||document.hidden||(typeof document.hasFocus==="function"&&!document.hasFocus())){lastTick=now;return false;}
    const stopAt=Math.min(now,lastSignal+(reading?READ_CHECK_MS:IDLE_MS));
    const amount=Math.max(0,Math.min(MAX_TICK_MS,stopAt-lastTick));
    lastTick=now;
    if(amount<=0){engaged=false;reading=false;return false;}
    const seconds=amount/1000;
    d.activeSeconds+=seconds;
    const today=dayKey(now),todayRec=d.timeByDay[today]||(d.timeByDay[today]={seconds:0,readingSeconds:0,writingSeconds:0});
    todayRec.seconds+=seconds;todayRec[reading?"readingSeconds":"writingSeconds"]+=seconds;todayRec.lastAt=nowIso();
    // The main precise Time/Focus Dock already pays for its own intervals.
    // We still report Knowledge activity, but don't award the same time twice.
    if(!window.LifeRPGTime?.getActive?.())d.eligibleSeconds+=seconds;
    payTime(d);return true;
  }
  function checkpoint(){if(tick())save("time-checkpoint");}
  function pause(){checkpoint();engaged=false;reading=false;save("pause");updateMeters(selected());}
  function toggleReading(){const d=selected();if(!d)return;checkpoint();if(reading){reading=false;engaged=false;}else{reading=true;engaged=true;sessionDocId=d.id;lastTick=Date.now();lastSignal=lastTick;}save("reading");updateMeters(d);}
  function flushDraft(){if(saveTimer){clearTimeout(saveTimer);saveTimer=0;persistDraft();}}
  function scheduleDraft(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=0;persistDraft();},1100);}
  function previewInline(text){return esc(text).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\[\[([^\]]+)\]\]/g,"<span class='kw-wikilink'>✧ $1</span>");}
  function markdown(input){
    const lines=String(input||"").split(/\r?\n/),parts=[];let paragraph=[];
    const flush=()=>{if(paragraph.length){parts.push(`<p>${paragraph.map(previewInline).join("<br>")}</p>`);paragraph=[];}};
    for(const line of lines){const t=line.trim();if(!t){flush();continue;}
      if(/^#{1,4} /.test(t)){flush();const m=t.match(/^(#{1,4})\s+(.*)$/);parts.push(`<h${m[1].length+1}>${previewInline(m[2])}</h${m[1].length+1}>`);continue;}
      if(/^> /.test(t)){flush();parts.push(`<aside class="kw-quote">${previewInline(t.slice(2))}</aside>`);continue;}
      if(/^[-*] /.test(t)){flush();parts.push(`<div class="kw-bullet">✿ ${previewInline(t.slice(2))}</div>`);continue;}
      if(/^\d+[.)] /.test(t)){flush();parts.push(`<div class="kw-bullet">${previewInline(t)}</div>`);continue;}
      if(t.startsWith("| ")&&t.endsWith(" |")){flush();parts.push(`<div class="kw-table-row">${t.slice(1,-1).split("|").map(x=>`<span>${previewInline(x.trim())}</span>`).join("")}</div>`);continue;}
      paragraph.push(t);
    }
    flush();return parts.join("")||"<p class='kw-muted'>Dein schön aufbereiteter Study Guide erscheint hier beim Schreiben.</p>";
  }
  function renderPreview(d){const el=$("kwPreview");if(!el||!d)return;
    const f=$("kwEditor"),title=f?.elements.title.value||d.title,summary=f?.elements.summary.value||d.summary,body=f?.elements.body.value||d.body;
    el.innerHTML=`<div class="kw-paper-head"><small>✦ ${esc(TYPES[f?.elements.type.value||d.type])}</small><h2>${esc(title)||"Dein neuer Gedanke"}</h2>${summary?`<aside>${previewInline(summary)}</aside>`:""}</div><div class="kw-markdown">${markdown(body)}</div>`;
  }
  function updateMeters(d){if(!d)return;const form=$("kwEditor");const chars=form?form.elements.summary.value.trim().length+form.elements.body.value.trim().length:count(d);
    const next=tier(reached(chars));const prev=reached(chars)?tier(reached(chars)-1).threshold:0;
    const el=$("kwWritingMeter");if(el)el.innerHTML=`<strong>${chars.toLocaleString("de-DE")} Zeichen</strong><span>Nächster Schreibbonus: ${next.threshold-chars} Zeichen · +${next.xp} XP · +${next.coins} Coins</span><i><b style="width:${Math.min(100,Math.max(0,100*(chars-prev)/(next.threshold-prev)))}%"></b></i><small>Mehr Ausarbeitung lohnt sich weiter – der zusätzliche Ertrag sinkt sanft, endet aber nicht.</small>`;
    const clock=$("kwClock");if(clock){const sec=Math.floor(d.activeSeconds);clock.textContent=`${String(Math.floor(sec/3600)).padStart(2,"0")}:${String(Math.floor(sec/60)%60).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;}
    const nextTime=timeTier(d.awardedTimes.length),t=$("kwTimeHint");if(t)t.textContent=`${reading?"Lesemodus läuft · Sicherheitsstopp nach 15 Minuten (dann erneut starten).":engaged?"Aktive Arbeit · pausiert nach 3 Minuten ohne Eingabe.":"Pausiert · Schreiben setzt die Zeit fort."} ${window.LifeRPGTime?.getActive?.()?"Focus Dock läuft bereits: keine doppelte Zeitbelohnung.":`Nächster Zeitbonus nach ${Math.max(0,Math.ceil((nextTime.seconds-d.eligibleSeconds)/60))} aktiven Minuten.`}`;
    const button=$("kwReadToggle");if(button)button.textContent=reading?"⏸ Lesezeit pausieren":"▶ Lesemodus starten";
  }
  function bookOptions(bookId){return `<option value="">— Keine Buchquelle —</option>${books().map(b=>`<option value="${attr(b.id)}" ${bookId===b.id?"selected":""}>${esc(b.title)}${b.author?` · ${esc(b.author)}`:""}</option>`).join("")}`;}
  function card(d){const own=bookTitle(d);return `<button type="button" class="kw-card" data-kw-open="${attr(d.id)}"><small>✦ ${esc(TYPES[d.type])} · ${new Date(d.updatedAt).toLocaleDateString("de-DE")}</small><strong>${esc(d.title)||"Unbenannter Entwurf"}</strong><p>${esc(d.summary||d.body||"Beginne deinen Gedanken…").slice(0,160)}</p><span>${count(d).toLocaleString("de-DE")} Zeichen · ${Math.round(d.activeSeconds/60)} Min. · ${esc(own)}</span></button>`;}
  function due(d){const t=Date.parse(d.reviewedAt||d.createdAt||""),interval=d.reviewedAt?7:3;return Date.now()-t>=interval*86400000;}
  function suggestions(d){const tags=String(d.tags||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);return docs().filter(x=>x.id!==d.id && !d.links.some(l=>l.targetId===x.id)).map(x=>({doc:x,score:(d.bookId&&d.bookId===x.bookId?2:0)+String(x.tags||"").split(",").filter(t=>tags.includes(t.trim().toLowerCase())).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4).map(x=>x.doc);}
  function connectionMarkup(d){const all=docs().filter(x=>x.id!==d.id),candidates=suggestions(d);return `<section class="kw-editor-connections"><h3>✧ Verknüpfen</h3><p>Verbindungen machen aus einzelnen Notizen dein Wissensnetz. Vorschläge beruhen nur auf gemeinsamen Büchern und Tags, nicht auf automatisch erfundenen Inhalten.</p><div class="kw-link-row"><select id="kwLinkTarget" aria-label="Andere Notiz wählen"><option value="">Notiz wählen…</option>${all.map(x=>`<option value="${attr(x.id)}">${esc(x.title||"Unbenannter Entwurf")}</option>`).join("")}</select><select id="kwLinkRelation" aria-label="Art der Verbindung">${Object.entries(RELATIONS).map(([id,title])=>`<option value="${id}">${title}</option>`).join("")}</select><button class="secondary-button" type="button" data-kw-add-link>Verbinden +</button></div>${candidates.length?`<small>Vielleicht passend: ${candidates.map(x=>`<button type="button" class="kw-chip" data-kw-suggest="${attr(x.id)}">${esc(x.title||"Notiz")}</button>`).join(" ")}</small>`:""}<div class="kw-existing-links">${d.links.map(l=>{const target=docs().find(x=>x.id===l.targetId);return target?`<span class="kw-link-pill"><button type="button" data-kw-open="${attr(target.id)}">${esc(RELATIONS[l.relation]||"Verwandt")}: ${esc(target.title||"Notiz")}</button><button type="button" aria-label="Verbindung entfernen" data-kw-unlink="${attr(target.id)}">×</button></span>`:"";}).join("")||"<small>Noch keine Verbindungen.</small>"}</div></section>`;}
  function renderEditor(d){const host=$("kwContent");host.innerHTML=`<div class="kw-editor-top"><button class="secondary-button" type="button" data-kw-gallery>← Sammlung</button><span id="kwSaveStatus" role="status">Automatisch gespeichert</span><button class="secondary-button" type="button" data-kw-export="${attr(d.id)}">↓ Markdown</button></div><div class="kw-editor-layout"><form id="kwEditor" class="kw-editor-form" autocomplete="off"><p class="eyebrow">DEIN WISSEN · DEIN WORKSHOP</p><label>Format<select name="type"><option value="insight" ${d.type==="insight"?"selected":""}>Insight Card</option><option value="guide" ${d.type==="guide"?"selected":""}>Study Guide</option></select></label><label>Titel<input name="title" type="text" maxlength="180" value="${attr(d.title)}" placeholder="Worum geht es?"/></label><label>Buch aus deiner Library<select name="bookId">${bookOptions(d.bookId)}</select></label><div class="kw-fields"><label>Andere Quelle (optional)<input name="sourceTitle" value="${attr(d.sourceTitle)}" placeholder="Artikel, Podcast, Kapitel…"/></label><label>Seite / Kapitel<input name="page" value="${attr(d.page)}" placeholder="z. B. S. 42"/></label></div><label>Kerngedanke / Zusammenfassung<textarea name="summary" rows="4" placeholder="Was möchte ich mir merken?">${esc(d.summary)}</textarea></label><div class="kw-toolbar" role="toolbar" aria-label="Formatierung"><button type="button" data-kw-insert="heading">Überschrift</button><button type="button" data-kw-insert="bold">**Fett**</button><button type="button" data-kw-insert="bullet">✿ Liste</button><button type="button" data-kw-insert="quote">▣ Merkkasten</button><button type="button" data-kw-insert="table">▦ Tabelle</button></div><label>Deine Ausarbeitung · Markdown<textarea name="body" rows="16" placeholder="Schreibe hier in Ruhe weiter. Überschriften, Merkkästen, Listen, Tabellen und [[Verknüpfungen]] erscheinen rechts in der Vorschau.">${esc(d.body)}</textarea></label><label>Schlagwörter, durch Komma getrennt<input name="tags" value="${attr(d.tags)}" placeholder="z. B. Fehlerkultur, Mathematik, Unterricht"/></label><div id="kwWritingMeter" class="kw-writing-meter"></div><div class="kw-session"><div><small>AKTIVE WORKSHOP-ZEIT</small><strong id="kwClock">00:00:00</strong><p id="kwTimeHint"></p></div><div class="kw-session-actions"><button type="button" class="secondary-button" id="kwReadToggle">▶ Lesemodus starten</button><button type="button" class="secondary-button" data-kw-pause>⏸ Pause</button></div></div>${connectionMarkup(d)}<div class="kw-editor-foot"><button type="button" class="primary-button" data-kw-save>Jetzt speichern ✓</button><button type="button" class="secondary-button" data-kw-reviewed>Wieder angesehen ✓</button></div></form><article id="kwPreview" class="kw-paper"></article></div>`;renderPreview(d);updateMeters(d);}
  function mapMarkup(){const all=docs().slice(0,28),N=all.length;
    if(!N)return `<div class="kw-empty">Noch keine Knoten – deine erste Erkenntnis beginnt die Karte.</div>`;
    const coords=new Map(all.map((d,i)=>[d.id,{x:210+157*Math.cos(2*Math.PI*i/N-Math.PI/2),y:165+116*Math.sin(2*Math.PI*i/N-Math.PI/2)}]));
    const edges=[];for(const d of all)for(const l of d.links){const a=coords.get(d.id),b=coords.get(l.targetId);if(a&&b)edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);}
    const nodes=all.map(d=>{const p=coords.get(d.id);return `<g data-kw-open="${attr(d.id)}" role="button" tabindex="0" aria-label="${attr(d.title||"Unbenannter Entwurf")}"><circle cx="${p.x}" cy="${p.y}" r="${d.type==="guide"?23:19}"/><text x="${p.x}" y="${p.y+3}" text-anchor="middle">${esc((d.title||"Notiz").slice(0,13))}</text></g>`;}).join("");
    return `<svg class="kw-network" viewBox="0 0 420 330" role="img" aria-label="Wissensnetz aus ${N} Notizen">${edges.join("")}${nodes}</svg><small>Auf einen Knoten klicken oder eine Karte darunter öffnen. Maximal 28 jüngste Notizen in dieser Ansicht.</small>`;}
  function renderGallery(){const all=docs().slice().sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));const rediscover=all.find(d=>due(d)&&count(d)>=80);
    $("kwContent").innerHTML=`<header class="kw-hero"><div><p class="eyebrow">KNOWLEDGE REALM · WORKSHOP</p><h1>Knowledge Garden ✦</h1><p>Lesen, Gedanken festhalten und hübsche Study Guides direkt in Life RPG schreiben. Die Arbeit selbst wird erfasst – ohne nachträgliches Doppel-Loggen.</p><div class="kw-hero-buttons"><button class="primary-button" type="button" data-kw-new="insight">✦ Neue Insight Card</button><button class="secondary-button" type="button" data-kw-new="guide">▤ Study Guide erstellen</button></div></div><span aria-hidden="true">❀</span></header>${rediscover?`<section class="kw-rediscover"><p class="eyebrow">✧ REDISCOVER · OHNE PFLICHT-STREAK</p><h2>${esc(rediscover.title||"Eine ältere Erkenntnis")}</h2><p>${esc(rediscover.summary||rediscover.body).slice(0,300)}</p><button type="button" class="secondary-button" data-kw-open="${attr(rediscover.id)}">Noch einmal ansehen ›</button></section>`:""}<div class="kw-gallery-split"><section class="kw-panel"><h2>Deine Sammlung <small>${all.length} Notizen</small></h2>${all.length?`<div class="kw-cards">${all.map(card).join("")}</div>`:`<div class="kw-empty">Noch ganz leer. Eine Idee reicht als Anfang – keine Mindestlänge, kein Druck.</div>`}</section><section class="kw-panel"><h2>✧ Wissenskarte</h2><div class="kw-map">${mapMarkup()}</div></section></div><div class="kw-export-footer"><button type="button" class="secondary-button" data-kw-export-all>↓ Alle Notizen als Markdown exportieren</button><p>Notizen liegen zusätzlich im normalen Life-RPG-Save. Ein Export hilft dir, sie auch in Obsidian oder anderswo zu verwenden.</p></div>`;
  }
  function render(){if(!$("kwContent"))return;const d=selected();if(d)renderEditor(d);else renderGallery();}
  function addLink(targetId,relation="related"){const d=selected(),other=docs().find(x=>x.id===targetId);if(!d||!other||d.id===other.id||d.links.some(l=>l.targetId===targetId))return false;checkpoint();persistDraft();d.links.push({targetId:other.id,relation:RELATIONS[relation]?relation:"related",at:nowIso()});payLink(d,other,relation);save("connect");render();return true;}
  function deleteLink(targetId){const d=selected();if(!d)return;checkpoint();persistDraft();d.links=d.links.filter(l=>l.targetId!==targetId);save("unlink");render();}
  function insertSnippet(kind){const t=$("kwEditor")?.elements.body;if(!t)return;const m={heading:"\n## Neue Überschrift\n",bold:"**wichtiger Gedanke**",bullet:"\n- Punkt\n",quote:"\n> Merke: \n",table:"\n| Begriff | Bedeutung |\n| --- | --- |\n"};const start=t.selectionStart,end=t.selectionEnd;t.setRangeText(m[kind]||"",start,end,"end");signal();scheduleDraft();renderPreview(selected());t.focus();}
  function makeMarkdown(d){const b=bookTitle(d);return `# ${d.title||"Unbenannter Entwurf"}\n\n${b?`Quelle: ${b}${d.page?` · ${d.page}`:""}\n\n`:""}${d.tags?`Tags: ${d.tags}\n\n`:""}${d.summary?`> ${d.summary.replace(/\n/g,"\n> ")}\n\n`:""}${d.body||""}\n\n${d.links.length?`## Verbindungen\n${d.links.map(l=>{const t=docs().find(x=>x.id===l.targetId);return t?`- ${RELATIONS[l.relation]||"Verwandt"}: [[${t.title||"Notiz"}]]`:"";}).filter(Boolean).join("\n")}\n`:""}`;}
  function download(name,text){const blob=new Blob([text],{type:"text/markdown;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);}
  function exportDoc(id){const d=docs().find(x=>x.id===id);if(d){checkpoint();persistDraft();download(`knowledge-${d.id}.md`,makeMarkdown(d));}}
  function exportAll(){checkpoint();persistDraft();download("life-rpg-knowledge-garden.md",docs().map(makeMarkdown).join("\n\n---\n\n"));}
  function setup(){if($("view-knowledge-workshop"))return;const main=document.querySelector(".app-shell > main");if(!main)return;
    const section=document.createElement("section");section.id="view-knowledge-workshop";section.className="view kw-view";section.innerHTML='<div id="kwContent"></div>';main.appendChild(section);
    // Accessible entry points in existing Library and Dashboard without replacing their source files.
    const library=$("view-library");if(library&&!$("kwLibraryEntry")){const box=document.createElement("section");box.id="kwLibraryEntry";box.className="kw-entry";box.innerHTML='<div><p class="eyebrow">BOOKS → IDEAS</p><h2>✦ Knowledge Workshop</h2><p>Verarbeite Sachbücher und Lehrerbücher direkt zu Insight Cards und Study Guides.</p></div><button class="primary-button" type="button" data-kw-route>Workshop öffnen →</button>';library.insertBefore(box,library.firstElementChild);}
    const dash=$("view-basecamp");if(dash&&!$("kwDashboardEntry")){const box=document.createElement("section");box.id="kwDashboardEntry";box.className="kw-entry";box.innerHTML='<div><p class="eyebrow">KNOWLEDGE · IN THE APP</p><h2>✦ Einen Gedanken festhalten?</h2><p>Aus deinem Buch kann hier direkt etwas entstehen. Ohne extra Zeiterfassung.</p></div><button class="secondary-button" type="button" data-kw-route>Zum Knowledge Garden →</button>';dash.insertBefore(box,dash.firstElementChild);}
    render();
  }
  function onClick(e){if(e.target.closest("[data-kw-route]")){app.showView("knowledge-workshop");render();return;}
    const newBtn=e.target.closest("[data-kw-new]");if(newBtn){create(newBtn.dataset.kwNew,newBtn.dataset.kwBook||"");return;}
    const open=e.target.closest("[data-kw-open]");if(open){choose(open.dataset.kwOpen);app.showView("knowledge-workshop");return;}
    if(e.target.closest("[data-kw-gallery]")){exitEditor();return;}
    if(e.target.closest("[data-kw-save]")){clearTimeout(saveTimer);saveTimer=0;persistDraft();return;}
    if(e.target.closest("[data-kw-pause]")){pause();return;}
    if(e.target.closest("#kwReadToggle")){toggleReading();return;}
    const insert=e.target.closest("[data-kw-insert]");if(insert){insertSnippet(insert.dataset.kwInsert);return;}
    if(e.target.closest("[data-kw-add-link]")){addLink($("kwLinkTarget")?.value,$("kwLinkRelation")?.value);return;}
    const suggestion=e.target.closest("[data-kw-suggest]");if(suggestion){if($("kwLinkTarget"))$("kwLinkTarget").value=suggestion.dataset.kwSuggest;$("kwLinkTarget")?.focus();return;}
    const unlink=e.target.closest("[data-kw-unlink]");if(unlink){deleteLink(unlink.dataset.kwUnlink);return;}
    if(e.target.closest("[data-kw-reviewed]")){persistDraft();const d=selected();if(d){d.reviewedAt=nowIso();save("rediscover");app.showToast?.("Gedanke wieder angesehen ✦");}return;}
    const exp=e.target.closest("[data-kw-export]");if(exp){exportDoc(exp.dataset.kwExport);return;}
    if(e.target.closest("[data-kw-export-all]")){exportAll();return;}
  }
  document.addEventListener("click",onClick);
  document.addEventListener("submit",e=>{if(e.target?.id==="kwEditor"){e.preventDefault();flushDraft();persistDraft();}});
  document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target?.matches?.(".kw-network [data-kw-open]")){e.preventDefault();choose(e.target.dataset.kwOpen);}});
  document.addEventListener("input",e=>{if(!e.target.closest?.("#kwEditor"))return;signal();scheduleDraft();updateMeters(selected());renderPreview(selected());});
  document.addEventListener("change",e=>{if(!e.target.closest?.("#kwEditor"))return;signal();scheduleDraft();renderPreview(selected());});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){checkpoint();engaged=false;reading=false;flushDraft();}});
  window.addEventListener("pagehide",()=>{checkpoint();flushDraft();});
  window.addEventListener("life-rpg:view-changed",e=>{if(e.detail?.view!=="knowledge-workshop"){flushDraft();checkpoint();engaged=false;reading=false;}else updateMeters(selected());});
  let tickCounter=0;setInterval(()=>{if(tick()){tickCounter++;if(tickCounter%10===0)save("time");}updateMeters(selected());},2000);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
  window.LifeRPGKnowledgeWorkshop={version:VERSION,open:(bookId="",type="")=>{setup();if(type)create(type,bookId);else {model().selectedId=null;render();}app.showView("knowledge-workshop");},create,model,selected,checkpoint,_test:{tier,reached,timeTier,count,markdown,payWriting,payTime,addLink,tick,signal,pause,create,choose}};
})();
