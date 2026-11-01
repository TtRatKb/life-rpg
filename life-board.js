/* Life RPG · optional Life Board v1. No own save schema, rewards, or task duplicates. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGLifeBoardCore;
 if(!app?.getState||!app.showView||!core)return;
 const root=()=>document.getElementById('lifeBoardMount');
 const esc=value=>app.escapeHtml(String(value??''));
 const now=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const nice=date=>date?new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'}):'Ohne Datum';
 const clock=date=>{const d=new Date(date);return Number.isFinite(+d)?d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'';};
 const nav=(view,label)=>`<button type="button" class="lb-link" data-lb-view="${view}">${label} <span aria-hidden="true">›</span></button>`;
 function getHabits(date){
   const api=window.LifeRPGHabits;
   const due=api?.getDueForCompanion?.(date)||[];
   const logs=api?.getCompletions?.()||[];
   const doneIds=new Set(logs.filter(x=>x?.date===date).map(x=>x.habitId).filter(Boolean));
   const names=new Map((api?.getHabits?.()||[]).map(h=>[h.id,h.name]));
   return {due,done:[...doneIds].map(id=>({id,name:names.get(id)||'Habit'}))};
 }
 function getRoutines(date){
   const state=app.getState().taskProjectsV1||{};
   const all=Array.isArray(state.routinesV1)?state.routinesV1:[];
   const checks=state.routineChecksV1||{},pack=window.LifeRPGTaskPackCore;
   const school=window.LifeRPGTaskPacks?._test?.availableSchoolday?.(date)===true;
   const tomorrow=core.addDay(date,1);
   const nextSchool=window.LifeRPGTaskPacks?._test?.availableSchoolday?.(tomorrow)===true;
   return all.filter(r=>r&&!r.disabled).map(r=>{
     const due=Boolean(pack?.dueRoutine?.(r,date,school,nextSchool));
     const completed=(checks[r.id]?.[date]||[]).filter(i=>Number.isInteger(i));
     return {...r,due,checked:completed.length,allDone:completed.length>=(r.steps||[]).length};
   });
 }
 function getAppointments(date){
   const result=[],week=window.LifeRPGWeekV2,google=window.LifeRPGGoogleCalendar;
   for(let i=0;i<7;i++){
     const day=core.addDay(date,i);
     try{
       for(const entry of week?.getOccurrences?.(day)||[]){
         if(entry?.canceled||entry?.origin!=='appointment')continue;
         result.push({id:entry.ref,date:day,time:clock(entry.start),title:entry.label||'Termin'});
       }
     }catch{}
     try{
       for(const entry of google?.weekEvents?.(day)||[]){
         if(entry?.mode==='ignore')continue;
         result.push({id:entry.id,date:day,time:clock(entry.start),title:entry.title||'Kalendertermin'});
       }
     }catch{}
   }
   return result;
 }
 function data(){
   const date=now(),habit=getHabits(date),tasks=window.LifeRPGTaskProjects?.getOpen?.()||[];
   const board=core.compose({today:date,taskCore:window.LifeRPGTaskProjectCore,tasks,
     habitsDue:habit.due,habitDone:habit.done,routines:getRoutines(date),appointments:getAppointments(date)});
   return {date,board};
 }
 function taskRow(task,{check=true}={}){
   const label=task.radarLabel||(!task.dueDate?'Ohne Frist':nice(task.dueDate));
   return `<li class="lb-line">
     ${check?`<button type="button" class="lb-check" data-lb-done="${esc(task.id)}" title="Im Aufgaben-System als erledigt markieren" aria-label="${esc(task.title)} erledigen">✓</button>`:'<span class="lb-soft-circle" aria-hidden="true">○</span>'}
     <div><strong>${esc(task.title)}</strong><small>${esc(label)}</small></div></li>`;
 }
 function section(id,icon,title,subtitle,inner,view,linkTitle){
   return `<section class="lb-card lb-${id}" aria-labelledby="lb-title-${id}"><header class="lb-card-heading">
     <span class="lb-illustration" aria-hidden="true">${icon}</span><div><h2 id="lb-title-${id}">${title} <span aria-hidden="true">♡</span></h2><p>${subtitle}</p></div></header>
     <div class="lb-card-body">${inner}</div><footer>${nav(view,linkTitle)}</footer></section>`;
 }
 function render(){
   const mount=root();
   if(!mount||!document.getElementById('view-lifeboard')?.classList.contains('active'))return;
   let date,board;
   try{({date,board}=data());}catch(error){
     mount.innerHTML='<p class="lb-error">Die Übersicht konnte gerade nicht geladen werden. Deine ursprünglichen Aufgaben und Habits sind weiterhin erreichbar.</p>';return;
   }
   const todayName=new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
   const dueList=board.due.slice(0,5).map(t=>taskRow(t)).join('')||'<p class="lb-empty">Keine echte Deadline heute. ✿</p>';
   const prep=board.prepare.length?`<details class="lb-details"><summary>🌱 Sinnvoller Anfang · ${board.prepare.length}</summary><ul>${board.prepare.slice(0,5).map(t=>taskRow(t,{check:false})).join('')}</ul></details>`:'';
   const next=board.soon.slice(0,7).map(t=>taskRow(t)).join('')||'<p class="lb-empty">Keine Fristen in den nächsten 21 Tagen eingetragen.</p>';
   const near=board.soon.length>7?`<p class="lb-more">+ ${board.soon.length-7} weitere Fristen im Deadline-Radar</p>`:'';
   const events=board.appointments.slice(0,5).map(x=>`<li class="lb-line"><span class="lb-line-emoji" aria-hidden="true">▦</span><div>
     <strong>${esc(x.title)}</strong><small>${esc(nice(x.date))}${x.time?' · '+esc(x.time)+' Uhr':''}</small></div></li>`).join('')||'<p class="lb-empty">Keine eigenen Termine für die nächsten sieben Tage gefunden.</p>';
   const habits=board.habitsDue.slice(0,5).map(h=>`<li class="lb-line"><span class="lb-soft-circle" aria-hidden="true">○</span><div><strong>${esc(h.name)}</strong><small>Heute möglich · über Habits abhaken</small></div></li>`).join('');
   const habitExtra=board.habitsDue.length>5?`<small class="lb-more">+ ${board.habitsDue.length-5} weitere Habits</small>`:'';
   const house=board.home.slice(0,4).map(t=>taskRow(t)).join('')||'<p class="lb-empty">Hier erscheinen Haushaltsaufgaben, die du als „Zuhause“ erfasst hast. Fälliges findest du oben.</p>';
   const routines=board.routines.slice(0,5).map(r=>`<li class="lb-line"><span class="lb-line-emoji" aria-hidden="true">${r.allDone?'✓':'◯'}</span>
      <div><strong>${esc(r.title)}</strong><small>${r.checked}/${(r.steps||[]).length} Checkpunkte${r.allDone?' · für heute erledigt':''}</small></div></li>`).join('')||'<p class="lb-empty">Heute ist keine deiner wiederkehrenden Routinen dran.</p>';
   const notes=board.note.slice(0,4).map(t=>taskRow(t)).join('')||'<p class="lb-empty">Noch keine losen Gedanken hier – das darf auch so bleiben.</p>';
   mount.innerHTML=`<div class="lb-shell">
     <header class="lb-hero"><div class="lb-hero-stamp">❀ LIFE RPG · DEINE KLEINE ALLTAGSINSEL ❀</div>
       <h1>Daily &amp; Weekly <em>Life Board</em></h1>
       <p>${esc(todayName)} · Ein Blick für das, was zählt. Und Raum für alles Schöne dazwischen.</p>
       <div class="lb-hero-sprig" aria-hidden="true">✿ · ♡ · ✧</div>
     </header>
     <div class="lb-mosaic">
       ${section('today','☀','Heute wichtig','Nur echte Deadlines heute oder bereits überfällig.',
         `<ul>${dueList}</ul>${prep}`,'tasks','Alle Deadlines')}
       ${section('upcoming','🗓','Bald wichtig','Was in den nächsten 21 Tagen ansteht.',
         `<ul>${next}</ul>${near}`,'tasks','Alle kommenden Aufgaben')}
       ${section('appointments','📆','Termine','Aus „Meine Woche“ und ggf. verbundenem Kalender.',
         `<ul>${events}</ul>`,'week','Meine Woche öffnen')}
       ${section('habits','🌸','Meine Habits',`${board.habitsDue.length} heute möglich · ${board.habitDone.length} heute bereits erfasst`,
         `<ul>${habits||'<p class="lb-empty">Gerade kein Habit offen – ein ruhiger Moment. 🌷</p>'}</ul>${habitExtra}`,'habits','Habits abhaken')}
       ${section('household','🏡','Zuhause & Haushalt','Kleine Dinge, die nicht im Kopf bleiben müssen.',
         `<ul>${house}</ul>`,'tasks','Alle Haushaltsaufgaben')}
       ${section('routines','🔁','Wiederkehrendes','Heute passende Routinen – ohne zusätzlichen Streak.',
         `<ul>${routines}</ul>`,'tasks','Routinen abhaken')}
       ${section('brain','📝','Brain Dump','Schnell notieren. Optional mit einer Deadline.',
         `<form class="lb-capture" data-lb-capture>
            <label for="lb-capture-title">Was möchtest du loswerden?</label>
            <input id="lb-capture-title" name="title" maxlength="160" required placeholder="Ein Gedanke reicht …">
            <div class="lb-capture-row"><label>Spätestens bis <input name="dueDate" type="date"></label>
              <label>Gehört zu <select name="context"><option value="any">Allgemein</option><option value="home">Haushalt</option></select></label></div>
            <button class="lb-save" type="submit">✦ Sicher merken</button>
          </form><div class="lb-brain-notes"><small>Schon vorgemerkt</small><ul>${notes}</ul></div>`,'tasks','Ganzen Brain Dump öffnen')}
       ${section('rest','🌿','Zeit für dich','Erholung und Hobbys sind auch Teil deines Tages.',
         `<div class="lb-rest-message"><span aria-hidden="true">♡</span><p>Du musst dir Pausen nicht erst verdienen. Was würde dir heute guttun?</p></div>
          <div class="lb-rest-actions">${nav('library','Lesen & entdecken')}${nav('games','Spielen')}${nav('breaks','Auszeiten')}</div>`,
         'adventures','Meine Side Adventures')}
     </div>
     <footer class="lb-outro"><span aria-hidden="true">✿</span> Kleine Schritte sind auch Fortschritt. Und manchmal ist Ausruhen der richtige nächste Schritt. <span aria-hidden="true">♡</span>
       <p>Experimentelle Zusatzansicht · Verwendet vorhandene Life-RPG-Daten. Keine eigenen XP, Streaks oder neuen Speicherstände.</p></footer>
   </div>`;
 }
 function click(e){
   const b=e.target.closest('button');if(!b||!root()?.contains(b))return;
   if(b.hasAttribute('data-lb-view')){app.showView(b.dataset.lbView);return;}
   if(b.hasAttribute('data-lb-done')){
     const id=b.dataset.lbDone;
     if(window.LifeRPGTaskProjects?.completeTask?.(id))render();
   }
 }
 function submit(e){
   const form=e.target.closest('form[data-lb-capture]');if(!form||!root()?.contains(form))return;
   e.preventDefault();
   const f=new FormData(form),title=String(f.get('title')||'').trim(),dueDate=String(f.get('dueDate')||'');
   if(!title||title.length>160){app.showToast?.('Bitte einen kurzen Titel eingeben.');return;}
   const id=window.LifeRPGTaskProjects?.createTask?.({
     title,dueDate,minutes:20,mandatory:true,context:f.get('context')==='home'?'home':'any'
   });
   if(id){form.reset();app.showToast?.('Sicher im Aufgaben-Gedächtnis notiert. ✨');render();}
   else app.showToast?.('Konnte nicht gespeichert werden. Deine Eingabe bleibt erhalten.');
 }
 function init(){
   const mount=root();if(!mount)return;
   mount.addEventListener('click',click);mount.addEventListener('submit',submit);
   window.addEventListener('life-rpg:view-changed',render);
   window.addEventListener('life-rpg:task-projects-changed',render);
   window.addEventListener('life-rpg:state-saved',render);
   window.addEventListener('life-rpg:google-calendar-updated',render);
   window.addEventListener('focus',render);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGLifeBoard={render,_test:{data,getHabits,getRoutines,getAppointments}};
})();
