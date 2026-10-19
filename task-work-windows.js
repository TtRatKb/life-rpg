/* Life RPG · explicit task work windows (local save; not work logs). */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGTaskWindowsCore,taskApp=window.LifeRPGTaskProjects;
 if(!app?.getState||!app.saveState||!core||!taskApp)return;
 const $=id=>document.getElementById(id), E=x=>app.escapeHtml(String(x??''));
 const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const plus=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-');};
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'tw-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 let editId='',formOpen=false,viewDate=localDay();
 const state=()=>app.getState().taskProjectsV1;
 const blocks=()=>Array.isArray(state()?.workWindowsV1)?state().workWindowsV1:[];
 const enabled=()=>state()?.useWorkWindowsV1===true;
 function commit(change,reason){
   const st=app.getState(),old=st.taskProjectsV1===undefined?null:JSON.stringify(st.taskProjectsV1);
   try{change();if(app.saveState({source:'task-window:'+reason,suppressUiRefresh:true})===false)throw Error('Arbeitsfenster wurden nicht gespeichert.');
     taskApp.render();window.LifeRPGNativePlanner?.render?.();render();window.LifeRPGWeekV2?.render?.();
     window.dispatchEvent(new Event('life-rpg:task-work-windows-changed'));return true;
   }catch(err){if(old===null)delete st.taskProjectsV1;else st.taskProjectsV1=JSON.parse(old);
     app.showToast?.(err.message||String(err));render();return false;}
 }
 function busy(d){try{return window.LifeRPGWeekV2?.getOccurrences?.(d)||[];}catch{return [];}}
 function off(d){return Boolean(window.LifeRPGWeekV2?.isHoliday?.(d)||window.LifeRPGWeekV2?.isSickDay?.(d)||app.getState().weekPlanner?.exceptions?.days?.[d]);}
 function dayWindows(date){return core.forDate(blocks(),date,busy(date),off(date));}
 function forecast(from=localDay(),count=35){
   const days=core.range(blocks(),from,count,busy,off),capacities={},segments={};
   for(const [date,items] of Object.entries(days)){
     capacities[date]=items.reduce((s,w)=>s+w.availableMinutes,0);
     segments[date]=items.flatMap(item=>item.segments.map(seg=>({blockId:item.id,startMinute:core.hhmm(seg.start),endMinute:core.hhmm(seg.end)}))).sort((a,b)=>a.startMinute-b.startMinute);
   }
   return {capacities,segments,days};
 }
 function eventBlocks(d){
   return dayWindows(d).map(w=>({taskWindowId:w.id,title:'✦ '+w.title,place:w.place,start:new Date(d+'T'+w.plannedStart+':00'),end:new Date(d+'T'+w.plannedEnd+':00'),hasConflict:w.conflictMinutes>0,availableMinutes:w.availableMinutes}));
 }
 const locations={school:'🏫 In der Schule',home:'🏠 Zu Hause',other:'✦ Anderswo'};
 function formMarkup(){
   const old=blocks().find(w=>w.id===editId),date=old?.date||viewDate;
   return '<form id="taskWorkWindowForm" class="tww-form"><div class="tww-form-head"><strong>'+(old?'Arbeitsfenster bearbeiten':'Arbeitsfenster anlegen')+'</strong><button type="button" data-tww-close aria-label="Schließen">×</button></div>'
      +'<label>Bezeichnung<input name="title" maxlength="70" required value="'+E(old?.title||'Zeit für Aufgaben')+'"></label>'
      +'<label>Datum / Start der Serie<input type="date" name="date" required value="'+E(date)+'"></label>'
      +'<label>Beginn<input type="time" name="start" required value="'+E(old?.start||'10:00')+'"></label>'
      +'<label>Ende<input type="time" name="end" required value="'+E(old?.end||'12:00')+'"></label>'
      +'<label>Ort<select name="place">'+Object.entries(locations).map(([id,label])=>'<option value="'+id+'" '+(old?.place===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'
      +'<label>Wiederholung<select name="repeat">'+[['once','Einmalig'],['weekly','Jede Woche'],['biweekly','Alle zwei Wochen']].map(([id,label])=>'<option value="'+id+'" '+((old?.repeat||'once')===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'
      +'<label>Optionales Ende der Serie<input type="date" name="until" value="'+E(old?.until||'')+'"></label>'
      +'<p class="tww-note">Arbeitsfenster sind frei wählbare Vorbereitungszeiten, keine automatisch geleistete Arbeitszeit. Vertretungen und feste Wochenplantermine nehmen Raum weg.</p>'
      +'<div class="tww-actions"><button type="submit" class="primary-button">Arbeitsfenster speichern</button><button type="button" class="secondary-button" data-tww-close>Abbrechen</button></div></form>';
 }
 function render(){
   const root=$('taskWorkWindowsMount'),week=$('taskWorkWindowsWeekMount');if(!root)return;
   const now=localDay(),d=dayWindows(now),all=blocks();
   const todayMin=d.reduce((s,w)=>s+w.availableMinutes,0);
   root.innerHTML='<section class="tww-card"><header><div><p class="eyebrow">ZEIT STATT TO-DO-DRUCK</p><h2>Meine Arbeitsfenster</h2></div><span class="tww-chip">'+(enabled()?todayMin+' Min. heute verfügbar':'Bisher Tages-Minutenmodell')+'</span></header>'
     +'<p class="tww-subtitle">Plane Zeitblöcke in Schule oder zu Hause. Nur explizit eingetragene Fenster zählen als Kapazität – kein automatisches „In Freistunden musst du arbeiten“.</p>'
     +'<div class="tww-actions"><button type="button" class="primary-button" data-tww-add>+ Arbeitsfenster</button><button type="button" class="secondary-button" data-tww-quick>Heute + 90 Min.</button>'
     +(enabled()?'<button type="button" class="secondary-button" data-tww-mode="off">Zeitfenstermodus pausieren</button>':(all.length?'<button type="button" class="secondary-button" data-tww-mode="on">Zeitfenstermodus verwenden</button>':''))+'</div>'
     +(enabled()&&!all.length?'<p class="tww-warning">Der Zeitfenstermodus ist aktiv, aber du hast noch keine Blöcke angelegt: Aufgaben werden nicht einfach in freie Minuten gedrückt.</p>':'')
     +'<div class="tww-list">'+(all.length?all.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)).map(w=>{let next=dayWindows(w.date).find(x=>x.id===w.id);return '<div class="tww-item"><div><strong>'+E(w.title)+'</strong><small>'+E(w.date)+' · '+E(w.start)+'–'+E(w.end)+' · '+E(locations[w.place]||locations.school)+' · '+(w.repeat==='biweekly'?'alle 2 Wochen':w.repeat==='weekly'?'wöchentlich':'einmalig')+'</small>'+(next?.conflictMinutes?'<small>⚠ '+next.conflictMinutes+' Min. im Startfenster bereits durch Termine belegt.</small>':'')+'</div><button type="button" data-tww-edit="'+E(w.id)+'">✎</button><button type="button" data-tww-delete="'+E(w.id)+'" title="Arbeitsfenster entfernen">×</button></div>';}).join(''):'<p class="tww-note">Noch kein eigenes Arbeitsfenster. Starte z. B. mit deinem nächsten längeren Montag in der Schule.</p>')+'</div>'
     +(formOpen?formMarkup():'')+'</section>';
   if(week){
     const items=dayWindows(viewDate);
     week.innerHTML='<section class="tww-week-card"><div class="tww-week-head"><div><p class="eyebrow">MEINE WOCHE × TASKS</p><h3>Arbeitsfenster & Aufgaben</h3></div><button type="button" data-tww-open-tasks>Alle Arbeitsfenster →</button></div>'
       +'<label>Tag ansehen <input type="date" data-tww-view-date value="'+E(viewDate)+'"></label>'
       +(items.length?items.map(w=>'<p>✦ '+E(w.title)+' · '+E(w.plannedStart)+'–'+E(w.plannedEnd)+' · '+w.availableMinutes+' Min. verfügbar'+(w.conflictMinutes?' · ⚠ '+w.conflictMinutes+' Min. belegt':'')+'</p>').join(''):'<p>Noch kein geplantes Aufgabenfenster für diesen Tag.</p>')
       +'<p class="tww-note">Diese Blöcke werden im Wochenkalender angezeigt, aber niemals automatisch als Arbeit geloggt.</p></section>';
   }
 }
 function change(e){const f=e.target;if(f.hasAttribute('data-tww-view-date')){viewDate=f.value;render();}}
 function click(e){
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-tww-open-tasks')){app.showView('tasks');document.getElementById('taskWorkWindowsMount')?.scrollIntoView?.({block:'start'});return;}
   if(b.hasAttribute('data-tww-close')){formOpen=false;editId='';render();return;}
   if(b.hasAttribute('data-tww-add')){editId='';formOpen=true;viewDate=localDay();render();return;}
   if(b.hasAttribute('data-tww-edit')){editId=b.dataset.twwEdit;formOpen=true;render();return;}
   if(b.hasAttribute('data-tww-delete')){const id=b.dataset.twwDelete;if(!confirm('Dieses Arbeitsfenster entfernen? Bereits geloggte Arbeitszeit bleibt unangetastet.'))return;commit(()=>{state().workWindowsV1=blocks().filter(w=>w.id!==id);},'delete');return;}
   if(b.hasAttribute('data-tww-mode')){const yes=b.dataset.twwMode==='on';commit(()=>{state().useWorkWindowsV1=yes;},'mode');return;}
   if(b.hasAttribute('data-tww-quick')){
     const current=new Date(),rounded=Math.ceil((current.getHours()*60+current.getMinutes())/15)*15;
     if(rounded+90>1440){app.showToast?.('Heute ist für 90 Minuten kein Platz mehr. Bitte Fenster manuell anlegen.');return;}
     const t=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
     commit(()=>{state().workWindowsV1 ||= [];state().workWindowsV1.push({id:uid(),title:'Heute noch 90 Minuten',date:localDay(),start:t(rounded),end:t(rounded+90),place:'home',repeat:'once',until:''});state().useWorkWindowsV1=true;},'quick');return;
   }
 }
 function submit(e){
   const f=e.target.closest('#taskWorkWindowForm');if(!f)return;e.preventDefault();
   const v=new FormData(f),candidate={id:editId||uid(),title:String(v.get('title')||'').trim().slice(0,70),date:String(v.get('date')||''),start:String(v.get('start')||''),end:String(v.get('end')||''),place:String(v.get('place')||'school'),repeat:String(v.get('repeat')||'once'),until:String(v.get('until')||'')};
   try{core.validate(candidate);if(!candidate.title)throw Error('Bitte einen Namen eingeben.');}catch(error){app.showToast?.(error.message);return;}
   const success=commit(()=>{state().workWindowsV1 ||= [];const i=blocks().findIndex(w=>w.id===candidate.id);if(i>=0)state().workWindowsV1[i]=candidate;else state().workWindowsV1.push(candidate);state().useWorkWindowsV1=true;},'save');
   if(success){formOpen=false;editId='';viewDate=candidate.date;render();}
 }
 function edit(id){editId=id;formOpen=true;app.showView('tasks');render();$('taskWorkWindowsMount')?.scrollIntoView?.({block:'start'});}
 function init(){
   if(!$('taskWorkWindowsMount'))return;
   for(const id of ['taskWorkWindowsMount','taskWorkWindowsWeekMount']){$(id)?.addEventListener('click',click);$(id)?.addEventListener('change',change);}
   $('taskWorkWindowsMount').addEventListener('submit',submit);
   window.addEventListener('life-rpg:view-changed',render);
   window.addEventListener('life-rpg:state-saved',e=>{if(!String(e.detail?.source||'').startsWith('task-window:'))render();});
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGTaskWindows={enabled,forecast,dayWindows,eventBlocks,edit,render,_test:{off,busy}};
})();