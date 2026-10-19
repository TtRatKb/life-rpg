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
   const m=state(),routines=Array.isArray(m?.routinesV1)?m.routinesV1:[],date=day(),school=availableSchoolday(date)||manualSchool;
   if(!routines.length)return '';
   const due=routines.filter(r=>core.dueRoutine(r,date,school));
   const hasSchool=routines.some(r=>r.cadence==='schoolday'||r.cadence==='school-monday');
   return '<section class="tpk-routines"><div class="tpk-header"><h2>✿ Heute passende Routinen</h2><small>Keine täglichen Task-Kopien</small></div>'
      +(hasSchool?'<button class="tpk-tiny" type="button" data-tpk-school-toggle>'+(manualSchool?'Manuelle Schultagsansicht ausblenden':'Schultagsroutinen bei Bedarf anzeigen')+'</button>':'')
      +(due.length?due.map(r=>{
        const checked=m.routineChecksV1?.[r.id]?.[date]||[];
        return '<article class="tpk-routine"><div><strong>'+esc(r.title)+'</strong><small>'+checked.length+'/'+r.steps.length+' erledigt · nur für heute</small></div><div class="tpk-steps">'+r.steps.map((s,i)=>'<label><input type="checkbox" data-tpk-routine="'+esc(r.id)+'" data-tpk-step="'+i+'" '+(checked.includes(i)?'checked':'')+'><span>'+esc(s)+'</span></label>').join('')+'</div></article>';
      }).join(''):'<p class="tpk-muted">Heute steht keine deiner wiederkehrenden Routinen an. 🌸</p>')
      +'<p class="tpk-foot">Häkchen gelten nur für das jeweilige Datum. Keine Strafen, Streaks oder doppelten XP. Schulroutinen erscheinen bei erfassten Schultagen.</p></section>';
 }
 function preview(){
   if(!pack)return '';
   return '<div class="tpk-preview"><h3>'+esc(pack.title||'Ausgewähltes Aufgabenpaket')+'</h3><p>'+esc(pack.subtitle||'Wähle aus, was wirklich wichtig ist.')+'</p>'
     +pack.groups.map(g=>'<label class="tpk-group"><input type="checkbox" data-tpk-pick="group:'+esc(g.id)+'" '+(picked.has('group:'+g.id)?'checked':'')+'> <span><strong>'+esc(g.title)+'</strong><small>'+g.tasks.length+' Aufgaben · '+(g.kind==='project'?'zusammenhängendes Projekt':'Einzelaufgaben')+'</small></span></label><div class="tpk-examples">'+g.tasks.slice(0,5).map(t=>'• '+esc(t.title)+(t.dueDate?' · '+esc(t.dueDate):'')+(t.dateKind==='target'?' (Ziel)':'')).join('<br>')+(g.tasks.length>5?' · …':'')+'</div>').join('')
     +pack.routines.map(r=>'<label class="tpk-group"><input type="checkbox" data-tpk-pick="routine:'+esc(r.id)+'" '+(picked.has('routine:'+r.id)?'checked':'')+'> <span><strong>'+esc(r.title)+'</strong><small>'+esc(r.cadence==='weekly'?'Wöchentlich':r.cadence==='schoolday'?'Nur an Schultagen':'Montags an Schultagen')+' · '+r.steps.length+' Checkpunkte</small></span></label>').join('')
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
   mount.addEventListener('toggle',e=>{if(e.target.matches('.tpk-import'))expanded=e.target.open;},true);
   window.addEventListener('life-rpg:view-changed',()=>{render();});
   window.addEventListener('life-rpg:task-projects-changed',render);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGTaskPacks={render, _test:{availableSchoolday}};
})();