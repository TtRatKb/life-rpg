/* Life RPG · Task Projects v1 · additive to Todoist, without AI, secrets or duplicate rewards. */
(() => {
 'use strict';
 const app=window.LifeRPGApp, core=window.LifeRPGTaskProjectCore;
 if(!app?.getState || !app.saveState || !core)return;
 const esc=value=>app.escapeHtml(String(value??''));
 const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const dateNice=value=>value?new Date(value+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'Ohne Datum';
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():('tp-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const blank=()=>({schemaVersion:1,projects:[],inbox:[],templates:[],offDutyDay:''});
 let expanded='',showArchive=false,showTemplateForm=false;
 const root=()=>document.getElementById('taskProjectMount');
 const dashboard=()=>document.getElementById('taskProjectTodayMount');
 function model() {
   const state=app.getState();
   if(!state.taskProjectsV1 || typeof state.taskProjectsV1!=='object' || Array.isArray(state.taskProjectsV1)) state.taskProjectsV1=blank();
   const m=state.taskProjectsV1;
   if(!Array.isArray(m.projects))m.projects=[];
   if(!Array.isArray(m.inbox))m.inbox=[];
   if(!Array.isArray(m.templates))m.templates=[];
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
 function taskRow(task,projectId){
   const now=dateToday(),u=priority(task,now);
   const canDo=!(task.blockedBy||[]).length;
   const status=u==='overdue-critical'||u==='today-critical'?'critical':u==='soon-critical'?'soon':'ordinary';
   return `<div class="tp-step tp-${status}">
      <button type="button" data-tp-done="${esc(task.id)}" class="tp-check" aria-label="${esc(task.title)} abschließen" title="Als erledigt markieren">○</button>
      <div class="tp-step-body"><strong>${esc(task.title)}</strong><small>${esc(labelUrgency(task,now))} · ~${Math.round(task.minutes||20)} Min.${task.hurdle==='high'?' · 😰 Bauchschmerz-Aufgabe':''}${task.dateKind==='target'?' · Zieldatum':' · Frist'}</small>${task.status==='waiting'?'<small>⏳ Wartet auf externe Rückmeldung. Erst bei Eingang abschließen.</small>':''}${task.notes?`<small>${esc(task.notes)}</small>`:''}${!canDo?`<small>Vorher: ${esc(task.blockedBy.join(', '))}</small>`:''}</div>
      <label class="tp-date" title="Individuelle Frist bearbeiten"><span>Bis</span><input type="date" value="${esc(task.dueDate||'')}" data-tp-date="${esc(task.id)}" aria-label="Fälligkeitsdatum für ${esc(task.title)}"></label>
      <button type="button" class="tp-hurdle" data-tp-hurdle="${esc(task.id)}" title="Emotionale Hürde umschalten" aria-label="Emotionale Hürde umschalten">${task.hurdle==='high'?'😰':'🙂'}</button>
    </div>`;
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
       ${steps.length?steps.map(s=>taskRow(s,p.id)).join(''):'<p class="tp-empty">Alle Schritte abgeschlossen. 🌸</p>'}
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
   const m=model(),open=allOpen(),today=dateToday(),critical=open.filter(x=>x.mandatory&&x.dueDate&&x.dueDate<=today),c=coach(open);
   const registered=templates();
   el.innerHTML=`<section class="tp-app" aria-label="Life RPG Task-Projekte">
     <header class="tp-title"><div><p class="eyebrow">LIFE RPG · TASK COMPANION</p><h1>Task-Projekte & Vorlagen</h1><p>Wiederkehrende Abläufe und Einzelaufgaben direkt hier verwalten. Die bisherige Todoist-Anzeige ist ausgeblendet.</p></div><span class="tp-count">${critical.length} kritische Fristen heute/überfällig</span></header>
     <div class="tp-coach"><strong>${esc(c.name)}</strong><p>${esc(c.text)}</p></div>
     <form data-tp-inbox class="tp-inbox"><label for="tp-quick">Quick Inbox · sofort aus dem Kopf</label><div class="tp-inline"><input id="tp-quick" name="title" maxlength="160" required placeholder="Woran muss ich noch denken?"><button type="submit" class="primary-button">+ Merken</button></div><small>Ohne Pflichtfelder erfassen. Nachträglich mit Datum, Aufwand und emotionaler Hürde ergänzen.</small></form>
     <details class="tp-create"><summary>✦ Neues Task-Projekt aus einer Vorlage</summary><form data-tp-create>
       <label>Vorlage<select name="templateId">${registered.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>
       <label>Name des Projekts<input name="title" required maxlength="110" placeholder="z. B. Mathe 6.2 · Klassenarbeit"></label>
       <label>Stichtag<input type="date" name="anchor" required value="${esc(core.dayOffset(today,14))}"></label>
       <label>Format<select name="format"><option value="digital">Digital / Classtime</option><option value="paper">Papier</option></select></label>
       <label>Inklusion<select name="inclusion"><option value="check">Noch klären</option><option value="yes">Ja</option><option value="no">Nein</option></select></label>
       <button class="primary-button" type="submit">Projekt samt Aufgaben anlegen</button><small>Vorlagenfristen sind anpassbare Vorschläge. Ist der Termin nah, können vorbereitende Fristen bereits überschritten sein.</small>
     </form></details>
     <section class="tp-section"><div class="tp-section-head"><h2>Aktive Projekte</h2><span>${m.projects.filter(p=>!p.archived).length}</span></div>${m.projects.filter(p=>!p.archived).map(projectMarkup).join('')||'<p class="tp-empty">Noch keine Task-Projekte. Starte mit der Vorlage „Klassenarbeit“.</p>'}</section>
     <section class="tp-section"><div class="tp-section-head"><h2>Einzelaufgaben · Inbox</h2><span>${m.inbox.filter(x=>!x.doneAt&&!x.archived).length} offen</span></div>
     ${m.inbox.filter(x=>!x.doneAt&&!x.archived).map(t=>taskRow(t)).join('')||'<p class="tp-empty">Deine Inbox ist leer. ✦</p>'}
     <details class="tp-inbox-details"><summary>Aufgabe genauer einordnen</summary><form data-tp-task>
       <label>Aufgabe<input name="title" maxlength="160" required placeholder="Was steht an?"></label>
       <label>Frist (optional)<input type="date" name="dueDate"></label>
       <label>Dauer<select name="minutes"><option value="10">5–15 Minuten</option><option value="30">30 Minuten</option><option value="60">1 Stunde</option><option value="120">2 Stunden</option></select></label>
       <label>Verbindlichkeit<select name="mandatory"><option value="yes">Muss rechtzeitig fertig werden</option><option value="no">Flexibel / kann warten</option></select></label>
       <label>Überwindung<select name="hurdle"><option value="normal">Normal</option><option value="high">😰 Bauchschmerz-Aufgabe</option></select></label>
       <button class="secondary-button" type="submit">Aufgabe speichern</button>
     </form></details>
     <details class="tp-completed"><summary>Erledigte Inbox-Aufgaben (${m.inbox.filter(t=>t.doneAt).length})</summary>${m.inbox.filter(t=>t.doneAt).map(t=>`<button class="tp-done-row" type="button" data-tp-undo="${esc(t.id)}">✓ ${esc(t.title)} · rückgängig</button>`).join('')||'<small>Noch keine.</small>'}</details></section>
     <button type="button" class="tp-showarchive" data-tp-show-archive>${showArchive?'Archiv ausblenden':'Archivierte Projekte anzeigen'}</button>
     ${showArchive?`<section class="tp-section"><h2>Archiv</h2>${m.projects.filter(p=>p.archived).map(p=>`<div class="tp-archived">${esc(p.title)} <button type="button" data-tp-restore="${esc(p.id)}">Wiederherstellen</button></div>`).join('')||'<p class="tp-empty">Noch nichts archiviert.</p>'}</section>`:''}
     <p class="tp-privacy">Nur Organisationsdaten im bestehenden Life-RPG-Save. Keine Schülernamen oder Ergebnisse eingeben. Keine doppelten Skill-/XP-Rewards. Die Termine werden innerhalb der App angezeigt; Push bei geschlossener App ist nicht enthalten.</p>
   </section>`;
   renderDashboard();
 }
 function markDone(id,undo){
   return mutate(undo?'reopen':'complete',m=>{
     const pair=projectTask(id),task=pair?.task||m.inbox.find(t=>t.id===id);
     if(!task)throw Error('Aufgabe nicht gefunden.');
     task.doneAt=undo?null:new Date().toISOString();
     app.showToast?.(undo?'Aufgabe wieder geöffnet':'Schritt erledigt ✓');
   });
 }
 function updateDate(id,value){
   if(value&&!core.parseDay(value)){app.showToast?.('Bitte gültiges Datum verwenden.');return;}
   mutate('deadline',m=>{const task=projectTask(id)?.task||m.inbox.find(t=>t.id===id);if(!task)throw Error('Aufgabe nicht gefunden.');task.dueDate=value;});
 }
 function submit(e){
   const form=e.target.closest('form');if(!form || !form.matches('[data-tp-inbox],[data-tp-task],[data-tp-create],[data-tp-add-step]'))return;
   e.preventDefault();const data=new FormData(form);
   if(form.matches('[data-tp-create]')){
     const template=templates().find(t=>t.id===data.get('templateId'));if(!template)return;
     const title=String(data.get('title')||'').trim(),anchor=String(data.get('anchor')||'');
     const result=mutate('create-project',m=>{
       const p=core.instantiate(template,anchor,{format:String(data.get('format')),inclusion:String(data.get('inclusion')),resit:'no'},uid());
       p.title=title.slice(0,110);m.projects.unshift(p);expanded=p.id;
     });
     if(result)app.showToast?.('Projekt samt Fristen angelegt ✓');
   }else if(form.matches('[data-tp-add-step]')){
     const id=form.dataset.tpAddStep, title=String(data.get('title')||'').trim(),dueDate=String(data.get('dueDate')||'');
     mutate('add-step',m=>{const p=projectBy(id);if(!p||!core.parseDay(dueDate))throw Error('Projekt oder Datum ungültig.');const key='custom-'+uid();p.tasks.push({id:p.id+':'+key,stepId:key,title:title.slice(0,160),dueDate,minutes:20,mandatory:true,hurdle:'normal',depends:[],doneAt:null});});
   }else{
     const title=String(data.get('title')||'').trim();
     const result=mutate('capture-task',m=>{m.inbox.unshift({id:'inbox-'+uid(),title:title.slice(0,160),dueDate:String(data.get('dueDate')||''),minutes:Number(data.get('minutes'))||15,mandatory:data.get('mandatory')==='yes',hurdle:data.get('hurdle')==='high'?'high':'normal',doneAt:null,createdAt:new Date().toISOString()});});
     if(result)app.showToast?.('Im Life RPG gespeichert ✓');
   }
 }
 function clicks(e){
   const button=e.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-tp-open')){app.showView('tasks');return;}
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
   return mutate('guided-create-task',m=>{const id='inbox-'+uid();m.inbox.unshift({id,title:name,dueDate:due,minutes:Math.max(5,Math.min(2400,Number(input?.minutes)||20)),mandatory:input?.mandatory===true,hurdle:input?.hurdle==='high'?'high':'normal',doneAt:null,createdAt:new Date().toISOString()});return id;});
 }
 function createProject(input){
   const template=templates().find(t=>t.id===input?.templateId),title=String(input?.title||'').trim(),date=String(input?.date||'');
   if(!template||!title||title.length>110||!core.parseDay(date))return false;
   return mutate('guided-create-project',m=>{const id=uid(),project=core.instantiate(template,date,{format:'digital',inclusion:'check',resit:'no'},id);project.title=title;m.projects.unshift(project);expanded=id;return id;});
 }
 window.LifeRPGTaskProjects={open:()=>app.showView('tasks'),getOpen:()=>allOpen().map(t=>({...t})),getCriticalToday:()=>allOpen().filter(t=>t.mandatory&&t.dueDate&&t.dueDate<=dateToday()),listTemplates:()=>templates().map(t=>({id:t.id,name:t.name})),createTask,createProject,render,_test:{model,markDone,templates,coach}};
})();
