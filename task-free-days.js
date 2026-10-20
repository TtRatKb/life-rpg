/* Life RPG · Free Day Companion: suggestions ≠ planned work. No AI, XP, GPS or automatic work logs. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGFreeDayCore,focusCore=window.LifeRPGTaskFocusCore,windowCore=window.LifeRPGTaskWindowsCore,tasks=window.LifeRPGTaskProjects;
 if(!app?.getState||!app.saveState||!core||!focusCore||!windowCore||!tasks)return;
 const $=id=>document.getElementById(id),E=x=>app.escapeHtml(String(x??''));
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const nameDate=s=>new Date(s+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'});
 let selected=today(),style='balanced',alreadyOut=false,showForm=false,begin='09:00',end='12:00',place='home',status='';
 let activeId='',phase='start',guide='kiri',budget=null,stopped=false,finishedTitle='',finishedId='';
 function existingBusy(date){
   const week=window.LifeRPGWeekV2?.getOccurrences?.(date)||[];
   return week.filter(x=>!x.canceled).map(x=>({start:x.start,end:x.end})).concat(window.LifeRPGGoogleCalendar?.busy?.(date)||[]);
 }
 function outOfHome(){return alreadyOut;} // A calendar appointment does not prove an outside errand.
 function loggedTaskMinutesFor(date){
   // One canonical time entry counts once even when three tasks were worked on.
   return Math.round((window.LifeRPGTime?.getEntries?.()||[]).filter(e=>{
     const end=new Date(e.endAt||e.startAt);const key=[end.getFullYear(),String(end.getMonth()+1).padStart(2,'0'),String(end.getDate()).padStart(2,'0')].join('-');
     return key===date&&Array.isArray(e.taskLinks)&&e.taskLinks.length>0;
   }).reduce((sum,e)=>sum+Math.max(0,Number(e.minutes)||0),0));
 }
 function remainingBudget(){return budget===null?null:Math.max(0,budget-loggedTaskMinutesFor(selected));}
 function choices(){return core.recommend(tasks.getOpen(),selected,{style,availableMinutes:remainingBudget(),alreadyOut:outOfHome()});}
 function activeTask(){return tasks.getOpen().find(t=>t.id===activeId)||null;}
 function focusMarkup(){
   if(stopped)return '<div class="tfd-focus" role="status"><strong>🌙 Für heute genug</strong><p>Kirishima: „Dann machen wir hier Schluss. Die offenen Aufgaben bleiben gespeichert – du musst nicht jede freie Minute verplanen.“</p><button type="button" class="secondary-button" data-tfd-resume>Vorschläge wieder ansehen</button></div>';
   if(phase==='done'&&finishedTitle){return '<div class="tfd-focus" role="status"><strong>✦ Geschafft: '+E(finishedTitle)+'</strong><p>'+E(focusCore.dialogue({title:finishedTitle},guide,'done'))+'</p><div class="tfd-focus-actions"><button type="button" data-tfd-next class="primary-button">Nächste Vorschläge</button><button type="button" data-tfd-undo class="secondary-button">Rückgängig</button><button type="button" data-tfd-stop class="secondary-button">Feierabend 🌙</button></div><small>Keine zusätzlichen XP oder Zeitlogs. Eine eventuell bereits anderswo erfasste Leistung wird nicht doppelt belohnt.</small></div>';}
   const task=activeTask();if(!task||!focusCore.taskReady(task))return '';
   const minutes=focusCore.sliceMinutes(task,budget);
   return '<div class="tfd-focus"><div class="tfd-focus-head"><strong>✦ '+E(task.title)+'</strong><button type="button" data-tfd-cancel aria-label="Starthilfe schließen">×</button></div><div class="tfd-character">'+[['kiri','☀️ Kirishima'],['bakugo','💥 Bakugo']].map(([id,label])=>'<button type="button" data-tfd-guide="'+id+'" class="'+(guide===id?'active':'')+'">'+label+'</button>').join('')+'</div><p><b>'+E(guide==='bakugo'?'Bakugo':'Kirishima')+':</b> „'+E(focusCore.dialogue(task,guide,phase))+'“</p>'
     +(phase==='start'?'<p class="tfd-hint">'+(minutes?'Du kannst direkt alles fertig machen oder nur einen Einstieg von ungefähr '+minutes+' Min. probieren. Das ist eine Schätzung, keine Stoppuhr.':'Heute sind keine zusätzlichen Aufgabenminuten vorgesehen. Du kannst jederzeit entscheiden, doch etwas zu machen.')+'</p>':'<p class="tfd-hint">Ein kleiner Einstieg hat noch nichts abgehakt. Notiere jetzt, was du geschafft hast, damit es beim nächsten Mal nicht verloren geht.</p>')
     +'<div class="tfd-focus-actions">'+(minutes&&phase==='start'?'<button type="button" class="secondary-button" data-tfd-step>Nur einen kleinen Einstieg probieren</button>':'')+'<button type="button" class="primary-button" data-tfd-done>✓ Fertig oder Zwischenstand festhalten</button><button type="button" class="secondary-button" data-tfd-start-timer>▶ Mit Timer arbeiten</button>'+(phase==='step'?'<button type="button" class="secondary-button" data-tfd-progress>↳ Was ich geschafft habe, speichern</button>':'')+'<button type="button" class="secondary-button" data-tfd-cancel>Später weitermachen</button><button type="button" class="secondary-button" data-tfd-stop>Für heute Schluss 🌙</button></div></div>';
 }
 function preview(){
   const todayDate=selected,open=tasks.getOpen(),choice=choices(),cal=window.LifeRPGGoogleCalendar;
   const upcoming=existingBusy(todayDate);
   const windows=window.LifeRPGTaskWindows?.dayWindows?.(todayDate)||[];
   const scope=window.LifeRPGGoogleCalendar?.hasSetup?.()&&!cal?.connected?.()?'Die Google-Verbindung ist nicht aktiv. Nicht synchronisierte Termine werden noch nicht berücksichtigt.':'';
   return '<section class="tfd-card"><header><div><p class="eyebrow">DEIN TAG, DEIN TEMPO</p><h2>Was würde sich heute oder an einem freien Tag anbieten?</h2></div><span class="tfd-counter">'+choice.totalOpen+' offene Aufgaben insgesamt</span></header>'
     +'<p>Keine Aufgabe wird automatisch auf einen Ferientag gelegt. Hier bekommst du sinnvolle Vorschläge – auch wenn „Heute unbedingt“ null anzeigt.</p>'
     +'<label>Für welchen Tag planen wir? <input type="date" data-tfd-date value="'+E(todayDate)+'"></label>'
     +'<div class="tfd-presets">'+[['balanced','⚖ Ausgewogen'],['frog','🐸 Unangenehmes zuerst'],['gentle','🌷 Sanfter Einstieg'],['quick','⚡ Kleine Dinge zuerst']].map(([id,label])=>'<button type="button" data-tfd-style="'+id+'" class="'+(style===id?'active':'')+'">'+label+'</button>').join('')+'</div>'
     +'<div class="tfd-budget"><strong>Wie viel freiwillige Aufgabenzeit möchtest du ungefähr einplanen?</strong><p class="tfd-hint">Nur eine Auswahlhilfe, kein automatisch gestarteter Timer. Die Aufwandsangaben der Aufgaben sind Schätzungen. Nur bestätigte, mit Aufgaben verknüpfte Zeitlogs werden hiervon abgezogen – nicht jeder Klick.</p><div>'+[[null,'Ohne Zeitlimit anzeigen'],[0,'Heute keine Aufgaben 🌙'],[15,'15 Min.'],[30,'30 Min.'],[60,'1 Std.'],[120,'2 Std.']].map(([value,label])=>'<button type="button" data-tfd-budget="'+(value===null?'open':value)+'" class="'+(budget===value?'active':'')+'">'+label+'</button>').join('')+'</div>'+(budget!==null?'<small>Mit Aufgaben verknüpft und tatsächlich geloggt: '+loggedTaskMinutesFor(todayDate)+' Min. · noch '+remainingBudget()+' Min. im freiwilligen Richtwert. Ohne Zeitlog wird nichts abgezogen.</small>':'')+'</div>'
     +'<div class="tfd-top"><strong>'+E(nameDate(todayDate))+'</strong><small>'+upcoming.length+' bekannte Zeitblöcke / Termine · '+windows.reduce((sum,b)=>sum+b.availableMinutes,0)+' Min. eigene Arbeitsfenster</small></div>'
     +(scope?'<p class="tfd-hint">⚠ '+E(scope)+'</p>':'')
     +focusMarkup()
     +(!stopped?'<div class="tfd-recs">'+(choice.primary.length?choice.primary.map(({task,needsSplit},i)=>'<div class="tfd-task"><span>'+((style==='frog'&&i===0)?'🐸':'✦')+'</span><div><strong>'+E(task.title)+'</strong><small>'+E(task.projectTitle||'Einzelaufgabe')+' · '+(task.dueDate?'Ziel/Frist: '+E(task.dueDate):'Ohne feste Frist')+' · ca. '+Number(task.minutes||20)+' Min.'+(task.hurdle==='high'?' · 😰':'' )+(needsSplit?' · zunächst einen kleinen Schritt':'')+'</small></div><button type="button" class="tfd-focus-open" data-tfd-focus="'+E(task.id)+'">Jetzt angehen</button></div>').join(''):budget===0?'<p>Heute möchtest du nicht arbeiten. Das ist okay. Deine Aufgaben bleiben gespeichert.</p>':'<p>Gerade keine selbstständig startbaren Aufgaben. Laufende Projekte kannst du unten prüfen.</p>')+'</div>':'')
     +'<p class="tfd-hint">Das sind Empfehlungen, keine neuen Deadlines. Projektaufgaben bleiben im bestehenden Projekt und werden nicht verdoppelt.</p>'
     +(choice.waiting.length?'<details class="tfd-wait"><summary>⏳ Wartet auf Rückmeldung oder vorherige Schritte ('+choice.waiting.length+')</summary>'+choice.waiting.map(t=>'<p>• '+E(t.title)+'</p>').join('')+'</details>':'')
     +'<div class="tfd-outside"><label><input type="checkbox" data-tfd-out '+(alreadyOut?'checked':'')+'> Ich bin an diesem Tag ohnehin unterwegs</label>'
     +(choice.outsideItems.length?'<p>🚶 Außer-Haus-Aufgaben: '+choice.outsideItems.map(x=>E(x.task.title)).join(' · ')+'. Ein Weg könnte sich vielleicht kombinieren lassen – ohne automatische Routenannahme.</p>':'')
     +'</div>'
     +'<div class="tfd-actions"><button type="button" class="primary-button" data-tfd-block>'+ (showForm?'Zeitfenster wieder zuklappen':'+ Freiwilliges Arbeitsfenster einplanen') +'</button><button type="button" class="secondary-button" data-tfd-week>Zur Wochenansicht</button></div>'
     +(showForm?'<form id="taskFreeDayForm" class="tfd-form"><h3>Wie lange möchtest du wirklich arbeiten?</h3>'
       +'<label>Datum<input name="date" type="date" required value="'+E(todayDate)+'"></label>'
       +'<label>Von<input name="start" type="time" required value="'+E(begin)+'"></label>'
       +'<label>Bis<input name="end" type="time" required value="'+E(end)+'"></label>'
       +'<label>Wo?<select name="place">'+[['home','Zu Hause'],['school','In der Schule'],['other','Anderswo']].map(([v,t])=>'<option value="'+v+'" '+(place===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'
       +'<p>Bestehende Termine werden von diesem Fenster abgezogen. Plane vor einem Termin auch die Anfahrt ein (Google-Kalender: Puffer davor).</p>'
       +'<button type="submit" class="primary-button">Dieses Zeitfenster übernehmen</button></form>':'')
     +(status?'<p class="tfd-status" role="status">'+E(status)+'</p>':'')
     +'</section>';
 }
 function render(){const el=$('taskFreeDayMount');if(el)el.innerHTML=preview();}
 function click(e){
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-tfd-style')){style=b.dataset.tfdStyle;render();return;}
   if(b.hasAttribute('data-tfd-budget')){budget=b.dataset.tfdBudget==='open'?null:Number(b.dataset.tfdBudget);if(budget===0){activeId='';phase='start';}stopped=false;render();return;}
   if(b.hasAttribute('data-tfd-focus')){const task=tasks.getOpen().find(t=>t.id===b.dataset.tfdFocus);if(!focusCore.taskReady(task))return;activeId=task.id;phase='start';finishedTitle='';finishedId='';guide=task.hurdle==='high'?'kiri':'bakugo';stopped=false;render();return;}
   if(b.hasAttribute('data-tfd-guide')){guide=b.dataset.tfdGuide==='bakugo'?'bakugo':'kiri';render();return;}
   if(b.hasAttribute('data-tfd-step')){phase='step';render();return;}
   if(b.hasAttribute('data-tfd-done')){const task=activeTask();if(task)window.LifeRPGTaskSessionReview?.openTask?.(task.id);return;}
   if(b.hasAttribute('data-tfd-progress')){const task=activeTask();if(task)window.LifeRPGTaskSessionReview?.openTask?.(task.id);return;}
   if(b.hasAttribute('data-tfd-start-timer')){const task=activeTask();if(task)window.LifeRPGTaskSessionReview?.openStart?.(task.id);return;}
   if(b.hasAttribute('data-tfd-undo')){if(finishedId&&tasks.reopenTask?.(finishedId)){activeId=finishedId;phase='start';finishedTitle='';finishedId='';}render();return;}
   if(b.hasAttribute('data-tfd-next')){activeId='';phase='start';finishedId='';finishedTitle='';render();return;}
   if(b.hasAttribute('data-tfd-cancel')){activeId='';phase='start';render();return;}
   if(b.hasAttribute('data-tfd-stop')){stopped=true;activeId='';phase='start';finishedTitle='';finishedId='';render();return;}
   if(b.hasAttribute('data-tfd-resume')){stopped=false;budget=null;phase='start';render();return;}
   if(b.hasAttribute('data-tfd-block')){showForm=!showForm;render();return;}
   if(b.hasAttribute('data-tfd-week')){app.showView('week');return;}
 }
 function change(e){
   if(e.target.hasAttribute('data-tfd-date')){selected=e.target.value||today();activeId='';finishedTitle='';phase='start';stopped=false;render();}
   if(e.target.hasAttribute('data-tfd-out')){alreadyOut=e.target.checked;render();}
 }
 function submit(e){
   const form=e.target.closest('#taskFreeDayForm');if(!form)return;e.preventDefault();
   const v=new FormData(form);
   const choice={id:(typeof crypto!=='undefined'&&crypto.randomUUID?'free-'+crypto.randomUUID():'free-'+Date.now()),title:'Freiwillige Fokuszeit',
     date:String(v.get('date')||''),start:String(v.get('start')||''),end:String(v.get('end')||''),place:String(v.get('place')||'home'),repeat:'once',until:''};
   try{windowCore.validate(choice);}catch(err){status=String(err.message);render();return;}
   const prior=windowCore.forDate([choice],choice.date,existingBusy(choice.date),false)[0];
   if(!prior?.availableMinutes){status='Dieser Zeitraum ist durch vorhandene Termine komplett belegt. Bitte verschiebe das Fenster.';render();return;}
   const st=app.getState(),old=JSON.stringify(st.taskProjectsV1||null);
   try{
     const m=st.taskProjectsV1;if(!m)throw Error('Aufgabenspeicher nicht verfügbar.');
     m.workWindowsV1 ||= [];m.workWindowsV1.push(choice);m.useWorkWindowsV1=true;
     if(app.saveState({source:'free-day-window',suppressUiRefresh:true})===false)throw Error('Das Zeitfenster konnte nicht gespeichert werden.');
     selected=choice.date;begin=choice.start;end=choice.end;place=choice.place;showForm=false;
     status='Zeitfenster eingeplant. '+(prior.conflictMinutes?'⚠ '+prior.conflictMinutes+' Minuten durch bestehende Termine belegt.':'Keine belegten Zeiten im gewählten Fenster erkannt.');
     window.dispatchEvent(new Event('life-rpg:task-work-windows-changed'));
     window.LifeRPGTaskWindows?.render?.();window.LifeRPGNativePlanner?.render?.();render();
   }catch(err){st.taskProjectsV1=JSON.parse(old);status=String(err.message||err);render();}
 }
 function init(){
   const root=$('taskFreeDayMount');if(!root)return;
   root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('submit',submit);
   window.addEventListener('life-rpg:google-calendar-updated',render);
   window.addEventListener('life-rpg:task-work-windows-changed',render);
   window.addEventListener('life-rpg:task-projects-changed',()=>{
     const t=activeId&&tasks.getTask?.(activeId);
     if(t?.doneAt&&phase!=='done'){finishedTitle=t.title;finishedId=t.id;activeId='';phase='done';}
     render();
   });
   window.addEventListener('life-rpg:time-change',render);
   window.addEventListener('life-rpg:view-changed',render);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGFreeDay={render,_test:{existingBusy,outOfHome,choices}};
})();