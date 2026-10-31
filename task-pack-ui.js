/* Life RPG · Private on-device task pack picker + compact recurring routines. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGTaskPackCore,taskApi=window.LifeRPGTaskProjects;
 if(!app?.getState||!app.saveState||!core||!taskApi)return;
 const byId=id=>document.getElementById(id);
 const esc=x=>app.escapeHtml(String(x??''));
 const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 let pack=null,picked=new Set(),lastMessage='',expanded=false,manualSchool=false;
 const state=()=>app.getState().taskProjectsV1;
 function persist(fn,source){
   const appState=app.getState(),previous=appState.taskProjectsV1===undefined?null:JSON.stringify(appState.taskProjectsV1);
   try{
     const result=fn(state());
     if(app.saveState({source:'task-pack:'+source,suppressUiRefresh:true})===false)throw Error('Speichern fehlgeschlagen. Änderungen wurden zurückgenommen.');
     taskApi.render();window.LifeRPGNativePlanner?.render?.();render();
     window.dispatchEvent(new Event('life-rpg:task-projects-changed'));
     return result;
   }catch(error){
     if(previous===null)delete appState.taskProjectsV1;else appState.taskProjectsV1=JSON.parse(previous);
     app.showToast?.(error.message||String(error));render();return false;
   }
 }
 function availableSchoolday(date){
   let blocks=[],logs=[];
   try{blocks=window.LifeRPGWeekV2?.getOccurrences?.(date)||[];}catch{}
   try{logs=window.LifeRPGTime?.getEntries?.()||[];}catch{}
   return core.isSchoolday(date,blocks,logs);
 }
 function routinesMarkup(){
 const m=state(),routines=Array.isArray(m?.routinesV1)?m.routinesV1:[],date=day();
 const school=availableSchoolday(date)||manualSchool;
 const nextMondayDate=(()=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');})();
 const live=routines.filter(r=>!r.disabled);
 const due=live.filter(r=>core.dueRoutine(r,date,school,availableSchoolday(nextMondayDate)||manualSchool));
 const checkedCount=due.filter(r=>(m.routineChecksV1?.[r.id]?.[date]||[]).length===r.steps.length).length;
 const days=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
 const todayWd=(new Date(date+'T12:00:00').getDay()+6)%7;
 const routineName=r=>r.cadence==='daily'?'Jeden Tag':r.cadence==='weekly'?'Jeden '+days[r.weekday]:r.cadence==='monthly'?'Jeden Monat am '+r.monthday+'.':r.cadence==='schoolday'?'An Schultagen':r.cadence==='school-monday'?'Schulmontags':'Sonntags vor Schulmontag';
 return `<section class="tpk-routines tpk-calm">
   <div class="tpk-header"><div><p class="eyebrow">RHYTHMUS STATT ERINNERUNGSSTRESS</p><h2>🌸 Was regelmäßig wiederkommt</h2></div>
     <small>${checkedCount}/${due.length} heute erledigt · ohne Streak-Druck</small></div>
   <p class="tpk-intro">Einmal anlegen, dann erinnert Life RPG dich am passenden Tag. Keine täglichen Kopien, keine Strafe fürs Aussetzen.</p>
   ${live.some(r=>['schoolday','school-monday','before-school-monday'].includes(r.cadence))?`<button type="button" class="tpk-tiny" data-tpk-school-toggle>${manualSchool?'Schultagsvorschau ausblenden':'Schultagsroutinen bei Bedarf zeigen'}</button>`:''}
   ${due.length?due.map(r=>{
      const checked=m.routineChecksV1?.[r.id]?.[date]||[];
      return `<article class="tpk-routine"><div><strong>${esc(r.title)}</strong><small>${esc(routineName(r))} · ${checked.length}/${r.steps.length} erledigt</small></div>
       <div class="tpk-steps">${r.steps.map((step,i)=>`<label><input type="checkbox" data-tpk-routine="${esc(r.id)}" data-tpk-step="${i}" ${checked.includes(i)?'checked':''}><span>${esc(step)}</span></label>`).join('')}</div></article>`;
   }).join(''):'<p class="tpk-muted">Heute steht keine Routine an. Dein Kopf hat hier frei. 🌿</p>'}
   <details class="tpk-create"><summary>+ Eine wiederkehrende Aufgabe merken</summary>
     <form data-tpk-create>
       <label>Was soll wiederkommen?<input name="title" required maxlength="120" placeholder="z. B. Arbeitsmaterial vorbereiten"></label>
       <label>Wie oft?<select name="cadence">
          <option value="weekly">Jede Woche</option><option value="daily">Jeden Tag</option>
          <option value="monthly">Jeden Monat</option><option value="schoolday">An Schultagen</option>
       </select></label>
       <label data-tpk-weekday>Welcher Wochentag?<select name="weekday">${days.map((t,i)=>`<option value="${i}" ${i===todayWd?'selected':''}>${t}</option>`).join('')}</select></label>
       <label data-tpk-monthday hidden>Welcher Tag im Monat?<input name="monthday" type="number" min="1" max="31" value="${new Date().getDate()}"></label>
       <button type="submit" class="primary-button">✦ Routine merken</button>
     </form>
   </details>
   ${routines.length?`<details class="tpk-all"><summary>Meine ${routines.length} Routinen verwalten</summary>
      ${routines.map(r=>`<div class="tpk-manage"><span><strong>${esc(r.title)}</strong><small>${esc(routineName(r))} ${r.disabled?'· Pausiert':''}</small></span>
      <button type="button" data-tpk-pause="${esc(r.id)}">${r.disabled?'Wieder aktivieren':'Pausieren'}</button></div>`).join('')}
   </details>`:''}
 </section>`;
}
 function preview(){
   if(!pack)return '';
   return '<div class="tpk-preview"><h3>'+esc(pack.title||'Ausgewähltes Aufgabenpaket')+'</h3><p>'+esc(pack.subtitle||'Wähle aus, was wirklich wichtig ist.')+'</p>'
     +pack.groups.map(g=>'<label class="tpk-group"><input type="checkbox" data-tpk-pick="group:'+esc(g.id)+'" '+(picked.has('group:'+g.id)?'checked':'')+'> <span><strong>'+esc(g.title)+'</strong><small>'+g.tasks.length+' Aufgaben · '+(g.kind==='project'?'zusammenhängendes Projekt':'Einzelaufgaben')+'</small></span></label><div class="tpk-examples">'+g.tasks.slice(0,5).map(t=>'• '+esc(t.title)+(t.dueDate?' · '+esc(t.dueDate):'')+(t.dateKind==='target'?' (Ziel)':'')).join('<br>')+(g.tasks.length>5?' · …':'')+'</div>').join('')
     +pack.routines.map(r=>'<label class="tpk-group"><input type="checkbox" data-tpk-pick="routine:'+esc(r.id)+'" '+(picked.has('routine:'+r.id)?'checked':'')+'> <span><strong>'+esc(r.title)+'</strong><small>'+esc(r.cadence==='weekly'?'Wöchentlich':r.cadence==='schoolday'?'Nur an Schultagen':r.cadence==='school-monday'?'Montags an Schultagen':'Sonntags vor einem Schulmontag')+' · '+r.steps.length+' Checkpunkte</small></span></label>').join('')
     +'<p class="tpk-foot">Importiere nur ausgewählte Gruppen. Bei erneutem Import werden gleiche IDs und bereits vorhandene Titel nicht dupliziert. Bestehende Aufgaben bleiben unverändert.</p>'
     +'<button type="button" class="primary-button" data-tpk-import '+(!picked.size?'disabled':'')+'>Ausgewählte Aufgaben sicher übernehmen</button></div>';
 }
 function render(){
   const mount=byId('taskPackMount');if(!mount)return;
   const has=Boolean(state()?.routinesV1?.length);
   mount.innerHTML=routinesMarkup()+'<details class="tpk-import" '+(expanded?'open':'')+'><summary>📦 Ausgewähltes Aufgabenpaket importieren</summary>'
     +'<div class="tpk-inside"><p>Nur eine JSON-Datei auswählen und die gewünschten Gruppen abhaken. Deine Datei wird ausschließlich hier im Browser gelesen, nicht auf GitHub oder einen Importserver hochgeladen.</p>'
     +'<label class="tpk-file-label">Datei vom Gerät auswählen <input type="file" data-tpk-file accept=".json,application/json"></label>'
     +(lastMessage?'<p role="status" class="tpk-status">'+esc(lastMessage)+'</p>':'')
     +preview()+'</div></details>';
 }
 async function handleFile(file){
   if(!file || file.size>150000){lastMessage='Bitte eine gültige JSON-Datei unter 150 KB auswählen.';render();return;}
   try{
     const raw=JSON.parse(await file.text());
     core.validate(raw);
     pack=raw;expanded=true;
     picked=new Set([...raw.groups.filter(g=>g.selectedByDefault!==false).map(g=>'group:'+g.id),...raw.routines.filter(r=>r.selectedByDefault!==false).map(r=>'routine:'+r.id)]);
     lastMessage='Paket geprüft. Wähle jetzt, welche Gruppen du behalten möchtest.';
   }catch(error){pack=null;picked.clear();lastMessage='Datei konnte nicht eingelesen werden: '+error.message;}
   render();
 }
 function onChange(event){
   const e=event.target;
   if(e.name==='cadence'&&e.closest('[data-tpk-create]')){
     const form=e.closest('form');
     form.querySelector('[data-tpk-weekday]').hidden=e.value!=='weekly';
     form.querySelector('[data-tpk-monthday]').hidden=e.value!=='monthly';
     return;
   }
   if(e.hasAttribute('data-tpk-file')){handleFile(e.files?.[0]);return;}
   if(e.hasAttribute('data-tpk-pick')){e.checked?picked.add(e.dataset.tpkPick):picked.delete(e.dataset.tpkPick);
     const btn=byId('taskPackMount')?.querySelector('[data-tpk-import]');if(btn)btn.disabled=!picked.size;return;}
   if(e.hasAttribute('data-tpk-routine')){
     const id=e.dataset.tpkRoutine,idx=Number(e.dataset.tpkStep),now=day();
     persist(m=>{
       m.routineChecksV1 ||= {};
       m.routineChecksV1[id] ||= {};
       const old=m.routineChecksV1[id][now]||[];
       m.routineChecksV1[id][now]=e.checked?[...new Set([...old,idx])].sort((a,b)=>a-b):old.filter(x=>x!==idx);
     },'routine');
   }
 }
 function onClick(event){
   const b=event.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-tpk-school-toggle')){manualSchool=!manualSchool;render();return;}
   if(b.hasAttribute('data-tpk-pause')){
     const id=b.dataset.tpkPause;
     persist(m=>{const r=m.routinesV1?.find(r=>r.id===id);if(!r)throw Error('Routine nicht gefunden.');r.disabled=!r.disabled;return true;},'routine-pause');return;
   }
   if(b.hasAttribute('data-tpk-import')){
     if(!pack||!picked.size)return;
     const result=persist(m=>core.importSelected(m,pack,[...picked],new Date().toISOString()),'import');
     if(result){lastMessage='Übernommen: '+result.projects+' Projekte, '+result.tasks+' Aufgaben, '+result.routines+' Routinen. '+result.duplicates+' Duplikate übersprungen.';
       app.showToast?.('Aufgabenpaket überprüft und gespeichert ✓');render();}
   }
 }
 function init(){
   const mount=byId('taskPackMount');if(!mount)return;
   mount.addEventListener('change',onChange);mount.addEventListener('click',onClick);
   mount.addEventListener('submit',e=>{
     const form=e.target.closest('[data-tpk-create]');if(!form)return;
     e.preventDefault();const f=new FormData(form);
     const title=String(f.get('title')||'').trim(),cadence=String(f.get('cadence')||'');
     const weekday=Number(f.get('weekday')),monthday=Number(f.get('monthday'));
     if(!title||title.length>120||!['daily','weekly','monthly','schoolday'].includes(cadence)
       ||cadence==='weekly'&&(!Number.isInteger(weekday)||weekday<0||weekday>6)
       ||cadence==='monthly'&&(!Number.isInteger(monthday)||monthday<1||monthday>31)){
         app.showToast?.('Bitte Titel und Wiederholung prüfen.');return;
     }
     const id='manual:routine:'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
     const saved=persist(m=>{
       m.routinesV1 ||= [];
       m.routinesV1.push({id,title,cadence,weekday,monthday,steps:[title],createdAt:new Date().toISOString()});
       return true;
     },'routine-create');
     if(saved)app.showToast?.('Einmal gemerkt. Ich erinnere dich am richtigen Tag. 🌸');
   });
   mount.addEventListener('toggle',e=>{if(e.target.matches('.tpk-import'))expanded=e.target.open;},true);
   window.addEventListener('life-rpg:view-changed',()=>{render();});
   window.addEventListener('life-rpg:task-projects-changed',render);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGTaskPacks={render, _test:{availableSchoolday}};
})();