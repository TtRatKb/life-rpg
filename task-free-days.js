/* Life RPG · Free Day Companion: suggestions ≠ planned work. No AI, XP, GPS or automatic work logs. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGFreeDayCore,windowCore=window.LifeRPGTaskWindowsCore,tasks=window.LifeRPGTaskProjects;
 if(!app?.getState||!app.saveState||!core||!windowCore||!tasks)return;
 const $=id=>document.getElementById(id),E=x=>app.escapeHtml(String(x??''));
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const nameDate=s=>new Date(s+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'});
 let selected=today(),style='balanced',alreadyOut=false,showForm=false,begin='09:00',end='12:00',place='home',status='';
 function existingBusy(date){
   const week=window.LifeRPGWeekV2?.getOccurrences?.(date)||[];
   return week.filter(x=>!x.canceled).map(x=>({start:x.start,end:x.end})).concat(window.LifeRPGGoogleCalendar?.busy?.(date)||[]);
 }
 function outOfHome(date){return alreadyOut||existingBusy(date).some(x=>x.start&&x.end);}
 function choices(){return core.recommend(tasks.getOpen(),selected,{style,availableMinutes:null,alreadyOut:outOfHome(selected)});}
 function preview(){
   const todayDate=selected,open=tasks.getOpen(),choice=choices(),cal=window.LifeRPGGoogleCalendar;
   const upcoming=existingBusy(todayDate);
   const windows=window.LifeRPGTaskWindows?.dayWindows?.(todayDate)||[];
   const scope=window.LifeRPGGoogleCalendar?.hasSetup?.()&&!cal?.connected?.()?'Die Google-Verbindung ist nicht aktiv. Nicht synchronisierte Termine werden noch nicht berücksichtigt.':'';
   return '<section class="tfd-card"><header><div><p class="eyebrow">DEIN TAG, DEIN TEMPO</p><h2>Was würde sich heute oder an einem freien Tag anbieten?</h2></div><span class="tfd-counter">'+choice.totalOpen+' offene Aufgaben insgesamt</span></header>'
     +'<p>Keine Aufgabe wird automatisch auf einen Ferientag gelegt. Hier bekommst du sinnvolle Vorschläge – auch wenn „Heute unbedingt“ null anzeigt.</p>'
     +'<label>Für welchen Tag planen wir? <input type="date" data-tfd-date value="'+E(todayDate)+'"></label>'
     +'<div class="tfd-presets">'+[['balanced','⚖ Ausgewogen'],['frog','🐸 Unangenehmes zuerst'],['gentle','🌷 Sanfter Einstieg'],['quick','⚡ Kleine Dinge zuerst']].map(([id,label])=>'<button type="button" data-tfd-style="'+id+'" class="'+(style===id?'active':'')+'">'+label+'</button>').join('')+'</div>'
     +'<div class="tfd-top"><strong>'+E(nameDate(todayDate))+'</strong><small>'+upcoming.length+' bekannte Zeitblöcke / Termine · '+windows.reduce((sum,b)=>sum+b.availableMinutes,0)+' Min. eigene Arbeitsfenster</small></div>'
     +(scope?'<p class="tfd-hint">⚠ '+E(scope)+'</p>':'')
     +'<div class="tfd-recs">'+(choice.primary.length?choice.primary.map(({task,needsSplit},i)=>'<div class="tfd-task"><span>'+((style==='frog'&&i===0)?'🐸':'✦')+'</span><div><strong>'+E(task.title)+'</strong><small>'+E(task.projectTitle||'Einzelaufgabe')+' · '+(task.dueDate?'Ziel/Frist: '+E(task.dueDate):'Ohne feste Frist')+' · ca. '+Number(task.minutes||20)+' Min.'+(task.hurdle==='high'?' · 😰':'' )+(needsSplit?' · in kleinere Schritte aufteilen':'')+'</small></div></div>').join(''):'<p>Gerade keine selbstständig startbaren Aufgaben. Laufende Projekte kannst du unten prüfen.</p>')+'</div>'
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
   if(b.hasAttribute('data-tfd-block')){showForm=!showForm;render();return;}
   if(b.hasAttribute('data-tfd-week')){app.showView('week');return;}
 }
 function change(e){
   if(e.target.hasAttribute('data-tfd-date')){selected=e.target.value||today();render();}
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
   window.addEventListener('life-rpg:task-projects-changed',render);
   window.addEventListener('life-rpg:view-changed',render);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGFreeDay={render,_test:{existingBusy,outOfHome,choices}};
})();