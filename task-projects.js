/* Life RPG · Task Projects v1 · additive to Todoist, without AI, secrets or duplicate rewards. */
(() => {
 'use strict';
 const app=window.LifeRPGApp, core=window.LifeRPGTaskProjectCore, progress=window.LifeRPGTaskProgressCore;
 if(!app?.getState || !app.saveState || !core || !progress)return;
 const esc=value=>app.escapeHtml(String(value??''));
 const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const dateNice=value=>value?new Date(value+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'Ohne Datum';
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():('tp-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const blank=()=>({schemaVersion:1,projects:[],inbox:[],templates:[],offDutyDay:''});
 let expanded='',showArchive=false,showTemplateForm=false,inboxDraft='',inboxDeadline='',libraryOpen=false,laterOpen=false,waitingOpen=false;
 const root=()=>document.getElementById('taskProjectMount');
 const dashboard=()=>document.getElementById('taskProjectTodayMount');
 function model() {
   const state=app.getState();
   if(!state.taskProjectsV1 || typeof state.taskProjectsV1!=='object' || Array.isArray(state.taskProjectsV1)) state.taskProjectsV1=blank();
   const m=state.taskProjectsV1;
   if(!Array.isArray(m.projects))m.projects=[];
   if(!Array.isArray(m.inbox))m.inbox=[];
   if(!Array.isArray(m.templates))m.templates=[];
   if(!Array.isArray(m.taskActivityV1))m.taskActivityV1=[];
   return m;
 }
 function mutate(source,fn){
   const state=app.getState(),old=state.taskProjectsV1===undefined?undefined:JSON.stringify(state.taskProjectsV1);
   try {
     const result=fn(model());
     if(app.saveState({source:'task-projects:'+source,suppressUiRefresh:true})===false) {
       if(old===undefined)delete state.taskProjectsV1;else state.taskProjectsV1=JSON.parse(old);
       render();return false;
     }
     render();window.dispatchEvent(new Event('life-rpg:task-projects-changed'));return result===undefined?true:result;
   }catch(err){
     if(old===undefined)delete state.taskProjectsV1;else state.taskProjectsV1=JSON.parse(old);
     app.showToast?.(err.message||'Aufgabe konnte nicht gespeichert werden.');render();return false;
   }
 }
 function templates(){return [core.exam,...model().templates.filter(t=>t&&Array.isArray(t.steps))];}
 function projectBy(id){return model().projects.find(p=>p.id===id);}
 function projectTask(id){for(const project of model().projects){const task=project.tasks.find(t=>t.id===id);if(task)return {task,project};}return null;}
 function allOpen(){
   const entries=[];
   model().projects.filter(p=>!p.archived).forEach(p=>core.nextSteps(p).forEach(task=>entries.push({...task,projectId:p.id,projectTitle:p.title,origin:'project'})));
   model().inbox.filter(t=>!t.doneAt&&!t.archived).forEach(t=>entries.push({...t,origin:'inbox'}));
   return entries.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||Number(b.mandatory)-Number(a.mandatory));
 }
 function priority(task,today){
   if(!task.dueDate)return 'later';
   return core.urgency(task,today);
 }
 function labelUrgency(task,today){
   if(!task.dueDate)return 'Ohne Frist';
   const u=priority(task,today);
   return u==='overdue-critical'?'Kritische Frist überschritten':u==='today-critical'?'Heute zwingend':u==='soon-critical'?'Kritisch · bald':u==='overdue-flex'?'Termin überschritten':u==='today-flex'?'Heute vorgesehen':dateNice(task.dueDate);
 }
 function coach(open){
   const t=dateToday(),critical=open.filter(x=>x.mandatory&&x.dueDate&&x.dueDate<=t);
   const soon=open.filter(x=>x.mandatory&&x.dueDate&&x.dueDate>t&&x.dueDate<=core.dayOffset(t,2));
   const hurdle=open.find(x=>x.hurdle==='high');
   if(critical.length)return {name:'Katsuki',text:'Da sind '+critical.length+' verbindliche Schritte heute oder schon überfällig. Such dir den nächsten konkreten aus. Und wenn es zeitlich nicht aufgeht, müssen wir den Plan ändern – nicht einfach so tun, als wäre alles okay.'};
   if(soon.length)return {name:'Eijirou',text:'Die heutigen kritischen Fristen sind abgedeckt. '+soon.length+' wichtige Schritte kommen bald. Schau dir die Vorbereitung an, bevor du entscheidest, ob du Feierabend machst.'};
   if(hurdle)return {name:'Katsuki',text:'Die unangenehme Aufgabe muss nicht den ganzen Tag im Hinterkopf laufen. Fang mit einem winzigen Schritt an – oder entscheide bewusst, wann du sie angehst.'};
   return {name:'Eijirou',text:'Im Projektplan steht heute keine überfällige kritische Frist. Das ist keine Garantie für alle anderen Schultermine – aber du darfst trotzdem bewusst Schluss machen.'};
 }
 function taskRow(task){
 const signal=core.taskSignal(task,dateToday());
 const style=task.radarHard&&task.radarDays!==null&&task.radarDays<=0?'critical':task.radarDays!==null&&task.radarDays<=7?'soon':signal.bucket==='urgent'?'critical':signal.bucket==='soon'?'soon':'ordinary';
 return `<article class="tp-step tp-calm-step tp-${style}">
  <button type="button" class="tp-check" data-tp-done="${esc(task.id)}" aria-label="${esc(task.title)} erledigen" title="Erledigen">✓</button>
  <div class="tp-step-body"><strong>${esc(task.title)}</strong>
   <div class="tp-calm-meta"><span>${esc(task.radarLabel||signal.label)}</span><span>${esc(dateNice(task.dueDate))}</span>${task.projectTitle?`<span>📁 ${esc(task.projectTitle)}</span>`:''}</div>
   <p class="tp-guidance">${esc(task.radarAdvice||signal.message)}</p>
   ${task.notes?`<small>📝 ${esc(task.notes)}</small>`:''}${task.lastProgressNote?`<small>↳ ${esc(task.lastProgressNote)}</small>`:''}
   <details class="tp-step-options"><summary>Frist & Details</summary>
    <label class="tp-date">Bis <input type="date" data-tp-date="${esc(task.id)}" value="${esc(task.dueDate||'')}" aria-label="Deadline für ${esc(task.title)}"></label>
    <label class="tp-effort">Grob geschätzter Aufwand <select data-tp-effort="${esc(task.id)}">
     ${[15,30,60,120,240,360].map(n=>`<option value="${n}" ${Number(task.minutes||20)===n?'selected':''}>${n===15?'Klein · ca. 15 Min.':n===30?'Kurz · 30 Min.':n===60?'1 Stunde':n===120?'2 Stunden':n===240?'4 Stunden':'6 Stunden'}</option>`).join('')}
   </select></label>
    <button type="button" class="tp-hurdle" data-tp-hurdle="${esc(task.id)}">${task.hurdle==='high'?'😰 Hohe Überwindung':'🙂 Normale Überwindung'}</button>
   </details>
  </div></article>`;
}
 function projectMarkup(p){
   const steps=core.nextSteps(p),done=p.tasks.filter(t=>t.doneAt&&!t.archived).length,total=p.tasks.filter(t=>!t.archived).length;
   const isOpen=expanded===p.id;
   const required=steps.filter(t=>t.mandatory),soon=required.filter(t=>t.dueDate<=core.dayOffset(dateToday(),2));
   return `<article class="tp-project">
     <div class="tp-project-head"><button type="button" class="tp-project-toggle" data-tp-expand="${esc(p.id)}" aria-expanded="${isOpen}"><span>${isOpen?'⌄':'›'}</span><span><strong>${esc(p.title)}</strong><small>${esc(dateNice(p.anchorDate))} · ${done}/${total} Schritte · ${soon.length?'⚠ '+soon.length+' wichtig bald':'Im Blick'}</small></span></button><div class="tp-project-progress" style="--progress:${total?Math.round(100*done/total):0}%"></div></div>
     ${isOpen?`<div class="tp-project-body">
       <div class="tp-project-branches" ${p.templateId!==core.exam.id?'hidden':''}>
         <label>Inklusion<select data-tp-branch="${esc(p.id)}" data-branch-key="inclusion"><option value="check" ${p.options.inclusion==='check'?'selected':''}>Noch klären</option><option value="yes" ${p.options.inclusion==='yes'?'selected':''}>Erforderlich</option><option value="no" ${p.options.inclusion==='no'?'selected':''}>Nicht erforderlich</option></select></label>
         <label>Nachschreiben<select data-tp-branch="${esc(p.id)}" data-branch-key="resit"><option value="no" ${p.options.resit!=='yes'?'selected':''}>Noch kein Bedarf</option><option value="yes" ${p.options.resit==='yes'?'selected':''}>Ja, organisieren</option></select></label>
       </div>
       ${steps.length?steps.map(s=>taskRow(s,p.id)).join(''):p.tasks.length?'<p class="tp-empty">Alle Schritte abgeschlossen. 🌸</p>':'<p class="tp-empty">Noch keine Schritte. Unten mit „+ Schritt“ anfangen. ✦</p>'}
       <details class="tp-completed"><summary>Erledigte Schritte (${done})</summary>${p.tasks.filter(t=>t.doneAt&&!t.archived).map(t=>`<button type="button" class="tp-done-row" data-tp-undo="${esc(t.id)}">✓ ${esc(t.title)} · rückgängig</button>`).join('')||'<small>Hier ist noch nichts abgehakt.</small>'}</details>
       <form class="tp-add-step" data-tp-add-step="${esc(p.id)}"><input name="title" required maxlength="160" placeholder="Weiteren Schritt hinzufügen" aria-label="Neuer Projektschritt"><input type="date" name="dueDate" required value="${esc(p.anchorDate)}" aria-label="Frist des neuen Schritts"><button class="secondary-button" type="submit">+ Schritt</button></form>
       <div class="tp-project-actions"><button type="button" class="secondary-button" data-tp-save-template="${esc(p.id)}">Als eigene Vorlage speichern</button><button type="button" class="secondary-button" data-tp-archive="${esc(p.id)}">Projekt archivieren</button></div>
       <small>Schritte sind organisatorische Merker. XP aus tatsächlichen Schulcockpit-/Zeit-/Quest-Abschlüssen werden hier nicht erneut ausgezahlt.</small>
     </div>`:''}
    </article>`;
 }
 function renderDashboard(){
   const el=dashboard();if(!el)return;
   const m=model(),off=m.offDutyDay===dateToday(),open=allOpen(),today=dateToday();
   const due=open.filter(x=>x.mandatory&&x.dueDate&&x.dueDate<=today);
   const near=open.filter(x=>x.mandatory&&x.dueDate&&x.dueDate>today&&x.dueDate<=core.dayOffset(today,2));
   const c=coach(open);
   el.innerHTML=`<div class="tp-home-head"><span>✦ TASK COMPANION</span><button type="button" data-tp-open>Alle Tasks →</button></div>
     <strong>${off?'Feierabendmodus 🌙':due.length?due.length+' verbindliche Schritte prüfen':near.length?near.length+' wichtige Schritte bald':'Deine Projektfristen im Blick'}</strong>
     <p>${off?'Der Arbeitsblock ist für heute ausgeblendet. Die Aufgaben bleiben gespeichert und sind jederzeit erreichbar.':esc(c.name+': '+c.text)}</p>
     ${!off?`<div class="tp-home-list">${open.filter(x=>x.mandatory&&x.dueDate&&x.dueDate<=core.dayOffset(today,1)).slice(0,3).map(x=>`<span>• ${esc(x.title)} <small>${esc(dateNice(x.dueDate))}</small></span>`).join('')||'<span>Keine unmittelbar kritischen Task-Projektfristen.</span>'}</div>`:''}
     <button type="button" class="secondary-button" data-tp-toggle-duty>${off?'Zurück zum Arbeitsmodus':'Feierabend für heute 🌙'}</button><small>Ohne automatische Push-Erinnerungen · ohne Kapazitätsgarantie</small>`;
 }
 function render(){
 const el=root();if(!el)return;
 const oldText=el.querySelector('[data-tp-inbox] textarea'),oldDate=el.querySelector('[data-tp-inbox] input[name="dueDate"]');
 if(oldText)inboxDraft=oldText.value;if(oldDate)inboxDeadline=oldDate.value;
 const oldLibrary=el.querySelector('.tp-calm-library'),oldLater=el.querySelector('.tp-calm-later'),oldWaiting=el.querySelector('.tp-calm-waiting');
 if(oldLibrary)libraryOpen=oldLibrary.open;
 if(oldLater)laterOpen=oldLater.open;
 if(oldWaiting)waitingOpen=oldWaiting.open;
 const m=model(),all=allOpen(),day=dateToday(),radar=core.deadlineRadar(all,day);
 const critical=radar.dueNow.length,weekCount=radar.week.length,followingCount=radar.following.length;
 const templatesAvailable=templates();
 const renderSection=(list,title,subtitle,kind,limit=7)=>`<section class="tp-radar-section tp-radar-${kind}">
   <header><div><h2>${title}</h2><p>${subtitle}</p></div><span class="tp-radar-count">${list.length}</span></header>
   ${list.length?list.slice(0,limit).map(taskRow).join(''):'<p class="tp-empty">Hier steht gerade nichts an. 🌿</p>'}
   ${list.length>limit?`<details class="tp-more"><summary>Weitere ${list.length-limit} anzeigen</summary>${list.slice(limit).map(taskRow).join('')}</details>`:''}
 </section>`;
 el.innerHTML=`<section class="tp-app tp-calm" aria-label="Life RPG Aufgaben und Deadlines">
  <header class="tp-calm-hero"><div><p class="eyebrow">LIFE RPG · DEIN AUFGABEN-GEDÄCHTNIS</p>
   <h1>Aus dem Kopf. Gut aufgehoben. ✦</h1><p>Du musst nicht alles heute schaffen. Du musst es auch nicht alles im Kopf behalten.</p></div>
   <div class="tp-calm-total"><strong>${all.length}</strong><span>offene Dinge notiert</span></div></header>
  <form class="tp-inbox tp-brain-dump" data-tp-inbox><label for="tp-quick">🧠 Brain Dump – was geht dir gerade durch den Kopf?</label>
    <textarea id="tp-quick" name="title" maxlength="4000" rows="2" required placeholder="Schreib einfach. Mehrere Gedanken? Einer pro Zeile."></textarea>
    <div class="tp-brain-footer"><label>Deadline, falls vorhanden <input type="date" name="dueDate" aria-label="Optionale echte Deadline"></label>
    <button type="submit" class="primary-button">✦ Sicher merken</button></div>
    <small>Keine Kategorien, Zeitbudgets oder Pflichtfelder. Ohne Datum ist die Aufgabe trotzdem sicher.</small></form>
  <div class="tp-calm-coach"><span aria-hidden="true">${critical?'💥':'☀️'}</span><div>
    <strong>${critical?'Katsuki':'Eijirou'}</strong>
    <p>${critical?'Echte Deadlines sind erreicht. Wir schauen zuerst darauf, nicht auf alles gleichzeitig.':
      weekCount?'Die nächsten Deadlines sind sichtbar. Früh anfangen ist erlaubt, aber nicht alles ist heute fällig.':
      followingCount?'In den nächsten Wochen steht etwas an. Ich halte es vor Augen.':
      'Keine kurzfristige Frist eingetragen. Undatierte Gedanken findest du weiter unten.'}</p></div></div>
  <div class="tp-radar-head"><div><h2>🗓 Dein Deadline-Radar</h2><p>Alle eingetragenen Fristen der nächsten 21 Tage – unabhängig von der Aufwandsschätzung.</p></div>
     <div class="tp-radar-totals"><span><strong>${critical}</strong> heute/überfällig</span><span><strong>${weekCount}</strong> nächste 7 Tage</span><span><strong>${followingCount}</strong> danach</span></div></div>
  <div class="tp-radar-today">
    ${renderSection(radar.dueNow,'🔸 Heute wirklich fällig','Verbindliche Deadlines heute oder bereits überschritten.','due',8)}
    ${renderSection(radar.prepare,'🌱 Heute sinnvoll anfangen','Noch nicht fällig, aber der Aufwand spricht für einen frühen Anfang.','prepare',4)}
  </div>
  ${renderSection(radar.week,'📅 In den nächsten 7 Tagen','Alle Termine – feste Fristen und flexible Ziele, chronologisch.','week',10)}
  ${renderSection(radar.following,'🔭 In 8–21 Tagen','Auch diese Termine bleiben jetzt schon sichtbar.','following',8)}
  ${radar.review.length?renderSection(radar.review,'✿ Zieldatum überprüfen','Ein flexibles Ziel ist keine verpasste Pflicht.','review',5):''}
  <section class="tp-radar-section tp-radar-undated"><header><div><h2>🧠 Noch ohne Deadline</h2>
    <p>Sicher gespeichert. Ohne Datum kann Life RPG aber nicht wissen, wann es dringend wird.</p></div><span class="tp-radar-count">${radar.undated.length}</span></header>
    ${radar.undated.slice(0,3).map(taskRow).join('')||'<p class="tp-empty">Alle offenen Merker haben bereits ein Datum.</p>'}
    ${radar.undated.length>3?`<details class="tp-more"><summary>Weitere ${radar.undated.length-3} anzeigen</summary>${radar.undated.slice(3).map(taskRow).join('')}</details>`:''}
  </section>
  ${radar.future.length?`<details class="tp-calm-later"><summary>🌿 Langfristig vorgemerkt · ${radar.future.length} Aufgaben nach 21 Tagen</summary>
    ${radar.future.map(taskRow).join('')}</details>`:''}
  <details class="tp-calm-library" ${libraryOpen?'open':''}><summary>📁 Projekte, Vorlagen und erledigte Aufgaben</summary>
     <section class="tp-section"><h2>Meine Projekte · ${m.projects.filter(p=>!p.archived).length}</h2>
     ${m.projects.filter(p=>!p.archived).map(projectMarkup).join('')||'<p class="tp-empty">Noch keine Projekte. Einzelaufgaben sind genauso okay.</p>'}</section>
     <details class="tp-create"><summary>+ Neues Projekt aus einer Vorlage</summary><form data-tp-create>
       <label>Vorlage<select name="templateId">${templatesAvailable.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>
       <label>Projektname<input name="title" maxlength="110" required></label>
       <label>Stichtag<input type="date" name="anchor" value="${esc(core.dayOffset(day,14))}" required></label>
       <label>Format<select name="format"><option value="digital">Digital / Classtime</option><option value="paper">Papier</option></select></label>
       <label>Inklusion<select name="inclusion"><option value="check">Noch klären</option><option value="yes">Ja</option><option value="no">Nein</option></select></label>
       <button type="submit" class="primary-button">Projekt anlegen</button></form></details>
     <details class="tp-inbox-details"><summary>+ Einzelaufgabe ausführlicher erstellen</summary><form data-tp-task>
       <label>Aufgabe<input name="title" maxlength="160" required></label><label>Späteste Frist<input type="date" name="dueDate"></label>
       <label>Aufwand<select name="minutes"><option value="10">5–15 Min.</option><option value="30">30 Min.</option><option value="60">1 Stunde</option><option value="120">2 Stunden</option></select></label>
       <label>Verbindlichkeit<select name="mandatory"><option value="yes">Echte Pflicht</option><option value="no">Flexibel</option></select></label>
       <label>Überwindung<select name="hurdle"><option value="normal">Normal</option><option value="high">😰 Schwer anzufangen</option></select></label>
       <button type="submit" class="secondary-button">Aufgabe merken</button></form></details>
     <details class="tp-completed"><summary>Erledigte Einzelaufgaben (${m.inbox.filter(t=>t.doneAt).length})</summary>
       ${m.inbox.filter(t=>t.doneAt).map(t=>`<button type="button" class="tp-done-row" data-tp-undo="${esc(t.id)}">✓ ${esc(t.title)} · erneut öffnen</button>`).join('')||'<p class="tp-empty">Noch keine.</p>'}</details>
     <button class="tp-showarchive" type="button" data-tp-show-archive>${showArchive?'Archiv ausblenden':'Archivierte Projekte anzeigen'}</button>
     ${showArchive?m.projects.filter(p=>p.archived).map(p=>`<div class="tp-archived">${esc(p.title)} <button type="button" data-tp-restore="${esc(p.id)}">Wiederherstellen</button></div>`).join(''):''}
  </details><p class="tp-privacy">Die App erinnert beim Öffnen. Push bei geschlossener App ist noch nicht verfügbar. Bestehende Aufgaben/IDs bleiben erhalten.</p></section>`;
 const textInput=el.querySelector('[data-tp-inbox] textarea'),dueInput=el.querySelector('[data-tp-inbox] input[name="dueDate"]');
 if(textInput)textInput.value=inboxDraft;if(dueInput)dueInput.value=inboxDeadline;
 renderDashboard();
}
 function recordUpdate(id,status,note='',options={}){
   return mutate('task-progress',m=>progress.update(m,{taskId:id,status,note},options.at||new Date().toISOString()));
 }
 function linkToTimeEntry(entryId,updates){
   const entry=(app.getState().timeTracking?.entries||[]).find(e=>e.id===entryId);
   if(!entry){app.showToast?.('Zeitlog nicht mehr vorhanden.');return false;}
   const old=entry.taskLinks===undefined?undefined:JSON.stringify(entry.taskLinks);
   const result=mutate('task-time-link',m=>progress.linkTimeEntry(m,entry,updates,entry.endAt||new Date().toISOString()));
   if(!result){if(old===undefined)delete entry.taskLinks;else entry.taskLinks=JSON.parse(old);}
   return result;
 }
 function markDone(id,undo){
   const result=recordUpdate(id,undo?'reopen':'done');
   if(result&&!undo)app.showToast?.('Geschafft – ein Gedanke weniger. ✨');
   return result;
 }
 function updateDate(id,value){
   if(value&&!core.parseDay(value)){app.showToast?.('Bitte gültiges Datum verwenden.');return;}
   mutate('deadline',m=>{const task=projectTask(id)?.task||m.inbox.find(t=>t.id===id);if(!task)throw Error('Aufgabe nicht gefunden.');task.dueDate=value;});
 }
 function submit(e){
   const form=e.target.closest('form');if(!form || !form.matches('[data-tp-inbox],[data-tp-task],[data-tp-create],[data-tp-add-step]'))return;
   e.preventDefault();const data=new FormData(form);
   if(form.matches('[data-tp-create]')){
     libraryOpen=true;
     const template=templates().find(t=>t.id===data.get('templateId'));if(!template)return;
     const title=String(data.get('title')||'').trim(),anchor=String(data.get('anchor')||'');
     const result=mutate('create-project',m=>{
       const p=core.instantiate(template,anchor,{format:String(data.get('format')),inclusion:String(data.get('inclusion')),resit:'no'},uid());
       p.title=title.slice(0,110);m.projects.unshift(p);expanded=p.id;
     });
     if(result)app.showToast?.('Projekt samt Fristen angelegt ✓');
   }else if(form.matches('[data-tp-add-step]')){
     const id=form.dataset.tpAddStep, title=String(data.get('title')||'').trim(),dueDate=String(data.get('dueDate')||'');
     libraryOpen=true;mutate('add-step',m=>{const p=projectBy(id);if(!p||!core.parseDay(dueDate))throw Error('Projekt oder Datum ungültig.');const key='custom-'+uid();p.tasks.push({id:p.id+':'+key,stepId:key,title:title.slice(0,160),dueDate,minutes:20,mandatory:true,hurdle:'normal',depends:[],doneAt:null});});
   }else{
     const brain=form.matches('[data-tp-inbox]'),raw=String(data.get('title')||'');
     const entries=[...new Set((brain?raw.split(/\r?\n/):[raw]).map(x=>x.trim()).filter(Boolean))];
     const dueDate=String(data.get('dueDate')||'');
     if(!entries.length||entries.length>25||entries.some(x=>x.length>160)||dueDate&&!core.parseDay(dueDate)){
       app.showToast?.('Bitte höchstens 25 Gedanken pro Eingabe (je 160 Zeichen) und ein gültiges Datum verwenden.');return;
     }
     const result=mutate('capture-task',m=>{
       const createdAt=new Date().toISOString();
       for(const title of entries)m.inbox.unshift({id:'inbox-'+uid(),title,dueDate,
         minutes:Number(data.get('minutes'))||20,mandatory:brain?true:data.get('mandatory')==='yes',
         hurdle:brain?'normal':data.get('hurdle')==='high'?'high':'normal',doneAt:null,createdAt});
     });
     if(result){
       if(brain){const freshForm=root()?.querySelector('[data-tp-inbox]');freshForm?.reset();inboxDraft='';inboxDeadline='';render();}
       app.showToast?.(entries.length===1?'Sicher gemerkt. Du darfst es loslassen. ✨':entries.length+' Gedanken sicher notiert. ✨');
     }
   }
 }
 function clicks(e){
   const button=e.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-tp-open')){app.showView('tasks');return;}
   if(button.hasAttribute('data-tp-open-later')){const list=root()?.querySelector('.tp-calm-later');if(list){list.open=true;laterOpen=true;}return;}
   if(button.hasAttribute('data-tp-toggle-duty')){mutate('toggle-duty',m=>{m.offDutyDay=m.offDutyDay===dateToday()?'':dateToday();});return;}
   if(button.hasAttribute('data-tp-expand')){expanded=expanded===button.dataset.tpExpand?'':button.dataset.tpExpand;render();return;}
   if(button.hasAttribute('data-tp-done')){markDone(button.dataset.tpDone,false);return;}
   if(button.hasAttribute('data-tp-undo')){markDone(button.dataset.tpUndo,true);return;}
   if(button.hasAttribute('data-tp-hurdle')){const id=button.dataset.tpHurdle;mutate('hurdle',m=>{const t=projectTask(id)?.task||m.inbox.find(x=>x.id===id);if(!t)throw Error('Aufgabe fehlt.');t.hurdle=t.hurdle==='high'?'normal':'high';});return;}
   if(button.hasAttribute('data-tp-archive')){mutate('archive',m=>{const p=projectBy(button.dataset.tpArchive);if(p)p.archived=true;expanded='';});return;}
   if(button.hasAttribute('data-tp-restore')){mutate('restore',m=>{const p=projectBy(button.dataset.tpRestore);if(p)p.archived=false;});return;}
   if(button.hasAttribute('data-tp-show-archive')){showArchive=!showArchive;render();return;}
   if(button.hasAttribute('data-tp-save-template')){
     const p=projectBy(button.dataset.tpSaveTemplate);if(!p)return;
     const name=(p.title||'Meine Vorlage').slice(0,110);
     const ok=mutate('save-template',m=>{
       const template={id:'custom-template-'+uid(),name,anchorLabel:'Stichtag',steps:p.tasks.filter(t=>!t.archived).map(t=>({
         id:t.stepId,title:t.title,days:core.daysUntil(p.anchorDate,t.dueDate),
         minutes:t.minutes,mandatory:t.mandatory,depends:t.depends
       }))};
       m.templates.push(template);
     });if(ok)app.showToast?.('Vorlage für nächste Projekte gespeichert ✓');
   }
 }
 function changes(e){
   const el=e.target;
   if(el.hasAttribute('data-tp-date')){updateDate(el.dataset.tpDate,el.value);return;}
   if(el.hasAttribute('data-tp-effort')){
     const mins=Number(el.value);
     if(![15,30,60,120,240,360].includes(mins))return;
     mutate('effort',m=>{const t=projectTask(el.dataset.tpEffort)?.task||m.inbox.find(x=>x.id===el.dataset.tpEffort);
       if(!t)throw Error('Aufgabe fehlt.');t.minutes=mins;});return;
   }
   if(el.hasAttribute('data-tp-branch')){
     const id=el.dataset.tpBranch,key=el.dataset.branchKey;
     const template=templates().find(t=>t.id===projectBy(id)?.templateId);
     if(!template || template.id!==core.exam.id)return;
     mutate('branch',m=>{const p=projectBy(id);const next=core.updateBranches(p,template,{[key]:el.value});Object.assign(p,next);});
   }
 }
 function init(){
   if(!root()||!dashboard())return;
   root().addEventListener('submit',submit);
   root().addEventListener('click',clicks);
   root().addEventListener('change',changes);
   dashboard().addEventListener('click',clicks);
   window.addEventListener('life-rpg:view-changed',()=>{if(document.getElementById('view-tasks')?.classList.contains('active'))render();else renderDashboard();});
   window.addEventListener('life-rpg:state-saved',e=>{if(!String(e.detail?.source||'').startsWith('task-projects:'))render();});
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 function createTask(input){
   const name=String(input?.title||'').trim(),due=String(input?.dueDate||'');
   if(!name||name.length>160||due&&!core.parseDay(due))return false;
   return mutate('guided-create-task',m=>{const id='inbox-'+uid();m.inbox.unshift({id,title:name,dueDate:due,minutes:Math.max(5,Math.min(2400,Number(input?.minutes)||20)),mandatory:input?.mandatory===true,hurdle:input?.hurdle==='high'?'high':'normal',context:['any','home','school','outside'].includes(input?.context)?input.context:'any',doneAt:null,createdAt:new Date().toISOString()});return id;});
 }
 function createProject(input){
   const template=templates().find(t=>t.id===input?.templateId),title=String(input?.title||'').trim(),date=String(input?.date||'');
   if((!template&&input?.templateId!=='manual-v1')||!title||title.length>110||!core.parseDay(date))return false;
   return mutate('guided-create-project',m=>{const id=uid(),project=template?core.instantiate(template,date,{format:'digital',inclusion:'check',resit:'no'},id):{id,templateId:'manual-v1',title:'',anchorDate:date,options:{},createdAt:new Date().toISOString(),tasks:[]};project.title=title;m.projects.unshift(project);expanded=id;return id;});
 }
 window.LifeRPGTaskProjects={open:()=>app.showView('tasks'),getOpen:()=>allOpen().map(t=>({...t})),getAll:()=>progress.listTasks(model()),getTask:id=>progress.findTask(model(),id)?.task||null,getHistory:id=>id?(model().taskActivityV1||[]).filter(x=>x.taskId===id).slice():(model().taskActivityV1||[]).slice(),recordUpdate,linkToTimeEntry,getCriticalToday:()=>allOpen().filter(t=>t.mandatory&&t.dueDate&&t.dueDate<=dateToday()),listTemplates:()=>[{id:'manual-v1',name:'Eigenes Projekt · ohne Vorlage'},...templates().map(t=>({id:t.id,name:t.name}))],createTask,createProject,completeTask:id=>markDone(id,false),reopenTask:id=>markDone(id,true),render,_test:{model,markDone,templates,coach}};
})();
