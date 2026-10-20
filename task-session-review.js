/* Life RPG · one canonical time entry may describe multiple existing tasks.
   Progress-only notes create neither minutes nor rewards. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,time=window.LifeRPGTime,tasks=window.LifeRPGTaskProjects,core=window.LifeRPGTaskProgressCore;
 if(!app?.getState||!time||!tasks?.recordUpdate||!core)return;
 const E=x=>app.escapeHtml(String(x??''));
 const clock=n=>{const x=Math.max(0,Math.round(n));return Math.floor(x/60)+' Std. '+x%60+' Min.';};
 const localDT=iso=>{const d=new Date(iso||Date.now());return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
 let modal=null,mode='',focusId='',pickerCategory='',error='',priorEntry=null;
 const model=()=>app.getState().taskProjectsV1;
 function ensureModal(){
   if(modal)return modal;
   modal=document.createElement('div');modal.id='taskSessionReviewOverlay';modal.className='tsr-overlay';modal.hidden=true;
   modal.addEventListener('click',click);modal.addEventListener('submit',submit);modal.addEventListener('change',change);
   document.body.appendChild(modal);return modal;
 }
 function visible(open){ensureModal().hidden=!open;if(!open){mode='';focusId='';priorEntry=null;error='';} }
 function close(){visible(false);}
 function showSaveError(message){
   const dialog=modal?.querySelector('.tsr-dialog');
   if(!dialog)return;
   let field=dialog.querySelector('[data-tsr-live-error]');
   if(!field){field=document.createElement('p');field.className='tsr-error';field.dataset.tsrLiveError='';field.setAttribute('role','alert');dialog.querySelector('.tsr-head')?.after(field);}
   field.textContent=message;
 }
 const tagText=s=>String(s||'').slice(0,500);
 function taskOptions(category,existing=[]){
   const ranked=core.candidates(model(),category||{});
   const map=new Map([...existing,...ranked].filter(Boolean).map(t=>[t.id,t]));
   return [...map.values()].slice(0,22);
 }
 function activeTaskIds(){return Array.isArray(app.getState().timeTracking?.active?.taskIds)?app.getState().timeTracking.active.taskIds:[];}
 function activeItems(){return activeTaskIds().map(id=>tasks.getTask(id)).filter(Boolean);}
 function activeTaskUI(){
   const a=time.getActive();if(!a)return '';
   const list=taskOptions(a,activeItems());
   return '<div class="tsr-picker"><strong>Welche Aufgaben gehören zu diesem Timer?</strong><p>Du kannst mehrere auswählen. Das erzeugt keine zweite Arbeitszeit und keine zusätzlichen XP.</p><div class="tsr-list">'+list.map(t=>
     '<label><input type="checkbox" name="taskId" value="'+E(t.id)+'" '+(activeTaskIds().includes(t.id)?'checked':'')+'><span>'+E(t.title)+'</span></label>').join('')+'</div></div>';
 }
 function saveChosenActive(ids){
   const a=app.getState().timeTracking?.active;if(!a)return false;
   const prior=a.taskIds===undefined?undefined:JSON.stringify(a.taskIds);
   a.taskIds=[...new Set(ids)].filter(id=>tasks.getTask(id));
   if(app.saveState({source:'time-task-picks',suppressUiRefresh:true})===false){
     if(prior===undefined)delete a.taskIds;else a.taskIds=JSON.parse(prior);
     return false;
   }
   window.dispatchEvent(new Event('life-rpg:time-change'));
   return true;
 }
 function render(){
   if(!mode)return;
   const a=time.getActive(),head='<div class="tsr-head"><div><p class="eyebrow">TASKS × ARBEITSZEIT</p><h2>'+E(mode==='finish'?'Arbeitszeit abschließen':mode==='pick'?'Aufgaben zum Timer auswählen':mode==='start'?'Timer für diese Aufgabe starten':'Zwischenstand festhalten')+'</h2></div><button type="button" data-tsr-close aria-label="Schließen">×</button></div>';
   let body='';
   if(mode==='pick')body='<p>Dein Timer läuft bereits. Wähle passende Aufgaben und arbeite einfach weiter. Beim Stoppen kannst du für jede den Fortschritt bestätigen.</p><form data-tsr-pick>'+activeTaskUI()+'<div class="tsr-actions"><button type="submit" class="primary-button">Speichern und Aufgaben öffnen</button></div></form>';
   if(mode==='start'){
     const t=tasks.getTask(focusId);
     body='<p><strong>'+E(t?.title||'')+'</strong> · Starte einen vorhandenen echten Arbeitszeit-Timer. Nur tatsächlich bestätigte Zeit wird später in „Meine Woche“ und Activity & Rewards gespeichert.</p><form data-tsr-start><label>Arbeitsart<select name="category">'+[
       ['planning','Unterrichtsplanung'],['grading','Korrekturen'],['admin','Schulorganisation'],['deep','Deep Work'],['life','Private Erledigungen']
     ].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select></label><div class="tsr-actions"><button type="submit" class="primary-button">▶ Timer starten</button><button type="button" data-tsr-close class="secondary-button">Doch nicht</button></div></form>';
   }
   if(mode==='finish'){
     const preview=time.getSessionPreview?.()||null;
     if(!a||!preview){close();return;}
     const category={categoryId:a.categoryId,subcategory:a.subcategory,label:a.label};
     const list=taskOptions(category,activeItems());
     const selected=new Set(activeTaskIds());
     body='<p><strong>'+E(a.label||'Arbeitszeit')+'</strong> · bisher ungefähr <strong>'+clock(preview.durationSeconds/60)+'</strong>. Prüfe die tatsächliche Zeit, Pausen und die Aufgaben, die du bearbeitet hast.</p>'
       +'<form data-tsr-finish><div class="tsr-time"><label>Vergessene Pause (Min.)<input name="deductionMinutes" type="number" value="0" min="0" max="1080"></label><label>Früher aufgehört (Min.)<input name="endBackMinutes" type="number" value="0" min="0" max="1080"></label></div><p class="tsr-hint" data-tsr-preview>Abzüglich eventuell eingegebener Pausen wird nur echte Arbeitszeit einmal geloggt.</p>'
       +'<strong>Was hast du in dieser Zeit gemacht?</strong><div class="tsr-list">'+list.map(t=>
         '<div class="tsr-task-row"><label><input type="checkbox" name="taskId" value="'+E(t.id)+'" '+(selected.has(t.id)?'checked':'')+'><span>'+E(t.title)+'</span></label><select name="status-'+E(t.id)+'"><option value="progress">Angefangen / weitergemacht</option><option value="done">Fertiggestellt</option></select><input name="note-'+E(t.id)+'" maxlength="500" placeholder="Optional: Was genau geschafft?"></div>').join('')+'</div><p class="tsr-hint">Eine Arbeitssitzung kann mehrere Aufgaben enthalten. Ihre Minuten werden nicht pro Aufgabe noch einmal als Arbeitszeit gezählt.</p>'
       +'<div class="tsr-actions"><button type="submit" class="primary-button">✓ Zeit bestätigen & Aufgaben speichern</button><button type="button" class="secondary-button" data-tsr-close>Timer weiterlaufen lassen</button></div></form>';
   }
   if(mode==='task'){
     const task=tasks.getTask(focusId);
     if(!task){close();return;}
     const logs=(time.getEntries?.()||[]).filter(e=>['work_home','focus','school','life_admin'].includes(e.categoryId)).slice(-25).reverse();
     body='<p><strong>'+E(task.title)+'</strong></p><form data-tsr-task><label>Wie weit bist du gekommen?<select name="status"><option value="progress">Nur angefangen / weitergearbeitet</option><option value="done">Wirklich fertiggestellt</option></select></label>'
       +'<label>Was genau hast du geschafft? (fürs nächste Mal)<textarea name="note" maxlength="500" rows="3" placeholder="Zum Beispiel: Folien 1–4 stehen, Arbeitsblatt fehlt noch.">'+E(task.lastProgressNote||'')+'</textarea></label>'
       +'<label>Arbeitszeit – nur wenn du sie tatsächlich erfassen möchtest<select name="linkMode"><option value="none">Keine Zeit erfassen · nur Aufgabe aktualisieren</option>'
       +(a?'<option value="active">Laufenden Timer zuerst abschließen</option>':'')
       +(logs.length?'<option value="existing">Mit schon erfasstem Zeitlog verknüpfen (keine weitere Zeit)</option>':'')
       +(!a?'<option value="manual">Tatsächlich geleistete Zeit einmal erfassen</option>':'')
       +'</select></label><div class="tsr-conditional" data-tsr-existing hidden><label>Vorhandenes Zeitlog<select name="entryId">'+logs.map(e=>'<option value="'+E(e.id)+'">'+E(new Date(e.endAt).toLocaleString('de-DE'))+' · '+E(e.label)+' · '+clock(e.minutes)+'</option>').join('')+'</select></label></div>'
       +'<div class="tsr-conditional" data-tsr-manual hidden><p>Nur echte Zeit eintragen: Der Zeitpunkt des Arbeitsendes und die tatsächliche Dauer ergeben einen Zeitblock.</p><div class="tsr-time"><label>Arbeitsende<input type="datetime-local" name="endAt" value="'+localDT()+'"></label><label>Tatsächliche Minuten<input type="number" min="1" max="600" name="minutes" value="20"></label></div><label>Art<select name="category">'+[['planning','Unterrichtsplanung'],['grading','Korrekturen'],['admin','Schulorganisation'],['deep','Deep Work'],['life','Private Erledigungen']].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select></label></div>'
       +'<div class="tsr-actions"><button type="submit" class="primary-button">Fortschritt speichern</button><button type="button" class="secondary-button" data-tsr-close>Später</button></div></form>';
   }
   ensureModal().innerHTML='<div class="tsr-dialog" role="dialog" aria-modal="true" aria-label="Aufgabe und Zeit verbinden">'+head+(error?'<p class="tsr-error" role="alert">'+E(error)+'</p>':'')+body+'</div>';
   ensureModal().hidden=false;
   if(mode==='finish')previewTime();
 }
 function openPick(){if(!time.getActive())return false;mode='pick';error='';render();return true;}
 function openTask(id){if(!tasks.getTask(id))return false;focusId=id;mode='task';error='';render();return true;}
 function openStart(id){if(!tasks.getTask(id))return false;if(time.getActive()){const ids=[...new Set([...activeTaskIds(),id])];saveChosenActive(ids);return openPick();}focusId=id;mode='start';error='';render();return true;}
 function requestFinish(){const a=time.getActive();if(!a||!['school','work_home','focus','life_admin'].includes(a.categoryId))return false;mode='finish';error='';render();return true;}
 function previewTime(){
   const form=modal?.querySelector('form[data-tsr-finish]');if(!form)return;
   const v=new FormData(form),preview=time.getSessionPreview?.({deductionMinutes:Number(v.get('deductionMinutes'))||0,endBackMinutes:Number(v.get('endBackMinutes'))||0});
   const target=form.querySelector('[data-tsr-preview]');
   if(target)target.textContent=preview?'Zu erfassen: '+clock(preview.durationSeconds/60)+' · ein Zeitlog, auch bei mehreren Aufgaben.':'Kein aktiver Timer';
 }
 const specs={
   planning:{categoryId:'work_home',subcategory:'Lesson planning',label:'Unterrichtsplanung'},
   grading:{categoryId:'work_home',subcategory:'Grading / corrections',label:'Korrekturen'},
   admin:{categoryId:'school',subcategory:'School admin',label:'Schulorganisation'},
   deep:{categoryId:'focus',subcategory:'Deep work',label:'Deep Work'},
   life:{categoryId:'life_admin',subcategory:'Errands',label:'Privat · Erledigungen'}
 };
 function selectedUpdates(form){
   return [...form.querySelectorAll('input[name="taskId"]:checked')].map(box=>{
     const id=box.value;
     return {taskId:id,status:form.elements.namedItem('status-'+id)?.value||'progress',note:tagText(form.elements.namedItem('note-'+id)?.value)};
   });
 }
 function addToLog(entryId,updates){
   const existing=(app.getState().timeTracking?.entries||[]).find(e=>e.id===entryId);
   if(!existing)return false;
   const ids=new Set(updates.map(x=>x.taskId));
   const merged=[...(existing.taskLinks||[]).filter(x=>!ids.has(x.taskId)),...updates];
   return Boolean(tasks.linkToTimeEntry(entryId,merged));
 }
 function commitFinish(form){
   const updates=selectedUpdates(form),v=new FormData(form);
   const options={deductionMinutes:Number(v.get('deductionMinutes'))||0,endBackMinutes:Number(v.get('endBackMinutes'))||0};
   const result=priorEntry?{ok:true,entry:priorEntry}:time.finishActive(options);
   if(!result?.ok){showSaveError(result?.reason||'Zeit konnte nicht erfasst werden.');return;}
   priorEntry=result.entry;
   if(updates.length&&!addToLog(result.entry.id,updates)){showSaveError('Arbeitszeit wurde bereits gespeichert, aber die Aufgabenzuordnung nicht. Du kannst sie hier erneut speichern – es entsteht dabei kein zweiter Zeitlog.');return;}
   close();app.showToast?.('Arbeitszeit einmal erfasst · Aufgaben zugeordnet ✓');
 }
 function submit(e){
   const f=e.target.closest('form');if(!f||!modal?.contains(f))return;e.preventDefault();
   const v=new FormData(f);error='';
   if(f.hasAttribute('data-tsr-pick')){
     if(!saveChosenActive([...f.querySelectorAll('input[name="taskId"]:checked')].map(x=>x.value))){error='Auswahl konnte nicht gespeichert werden.';render();return;}
     close();app.showView('tasks');return;
   }
   if(f.hasAttribute('data-tsr-start')){
     if(time.getActive()){error='Es läuft bereits ein Timer. Wähle die vorhandenen Aufgaben dazu aus.';render();return;}
     const spec=specs[String(v.get('category'))]||specs.planning;
     time.startClock(spec);
     if(!time.getActive()){error='Timer konnte nicht gestartet werden.';render();return;}
     if(!saveChosenActive([focusId])){error='Timer läuft, aber die Aufgabe wurde noch nicht verknüpft.';render();return;}
     close();app.showView('tasks');return;
   }
   if(f.hasAttribute('data-tsr-finish')){commitFinish(f);return;}
   if(f.hasAttribute('data-tsr-task')){
     const status=String(v.get('status')||'progress'),note=tagText(v.get('note')),linkMode=String(v.get('linkMode')||'none');
     if(linkMode==='active'){close();requestFinish();return;}
     if(linkMode==='none'){if(!tasks.recordUpdate(focusId,status,note)){error='Fortschritt konnte nicht gespeichert werden.';render();return;}close();return;}
     if(linkMode==='existing'){
       if(!addToLog(String(v.get('entryId')||''),[{taskId:focusId,status,note}])){error='Bestehendes Zeitlog konnte nicht verknüpft werden.';render();return;}
       close();return;
     }
     if(linkMode==='manual'){
       const end=new Date(String(v.get('endAt')||'')),mins=Number(v.get('minutes')),spec=specs[String(v.get('category'))]||specs.planning;
       if(!Number.isFinite(+end)||!Number.isInteger(mins)||mins<1||mins>600||+end>Date.now()+60000){error='Bitte gültiges, tatsächlich geleistetes Arbeitsende und Dauer eingeben.';render();return;}
       const result=time.logInterval({startAt:new Date(+end-mins*60000).toISOString(),endAt:end.toISOString(),...spec});
       if(!result?.ok){error=result?.reason||'Zeitintervall nicht möglich (eventuell bereits erfasst).';render();return;}
       if(!addToLog(result.entry.id,[{taskId:focusId,status,note}])){error='Zeit ist erfasst, aber Aufgabenzuordnung fehlgeschlagen. Bitte über das bestehende Zeitlog erneut verknüpfen.';render();return;}
       close();return;
     }
   }
 }
 function change(e){
   if(e.target.name==='linkMode'){
     const value=e.target.value;modal.querySelector('[data-tsr-existing]')?.toggleAttribute('hidden',value!=='existing');
     modal.querySelector('[data-tsr-manual]')?.toggleAttribute('hidden',value!=='manual');
   }
   if(['deductionMinutes','endBackMinutes'].includes(e.target.name))previewTime();
 }
 function click(e){
   if(e.target.closest('[data-tsr-close]')){close();return;}
   if(e.target===modal)close();
 }
 function renderMini(){
   const mount=document.getElementById('taskSessionActiveMount');if(!mount)return;
   const a=time.getActive();
   mount.innerHTML=a?'<div class="tsr-mini"><span><b>◷ Timer läuft: '+E(a.label)+'</b> · '+E(activeTaskIds().length+' verknüpfte Aufgabe(n)')+'</span><div><button type="button" data-tsr-pick>Aufgaben auswählen</button><button type="button" data-tsr-end>Timer beenden & zuordnen</button></div></div>':'';
 }
 function init(){
   ensureModal();
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
   document.addEventListener('click',e=>{
     if(e.target.closest('[data-tsr-pick]'))openPick();
     if(e.target.closest('[data-tsr-end]'))requestFinish();
   });
   window.addEventListener('life-rpg:time-change',renderMini);
   window.addEventListener('life-rpg:view-changed',renderMini);
   renderMini();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGTaskSessionReview={openPick,openTask,openStart,requestFinish,renderMini};
})();