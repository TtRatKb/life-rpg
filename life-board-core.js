/* Life RPG · optional Life Board v1 · pure, read-only overview composition. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeRPGLifeBoardCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const iso=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''));
 function addDay(date,n){
   if(!iso(date))return '';
   const d=new Date(date+'T12:00:00');
   if(!Number.isFinite(+d))return '';
   d.setDate(d.getDate()+n);
   return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 }
 function isHome(task){
   // Never guess a household category from text or reclassify existing data.
   return task?.context==='home'||task?.group==='household'||task?.category==='household';
 }
 function compose(options){
   const {tasks=[],today,taskCore,habitsDue=[],habitDone=[],routines=[],appointments=[]}=options||{};
   if(!taskCore?.deadlineRadar||!iso(today))throw Error('Life Board: Fristenquelle nicht verfügbar.');
   const radar=taskCore.deadlineRadar(tasks,today);
   const due=radar.dueNow;
   const soon=[...radar.week,...radar.following].sort((a,b)=>a.radarDays-b.radarDays||String(a.title).localeCompare(String(b.title),'de'));
   const visible=new Set([...due,...soon].map(t=>String(t.id)));
   const home=tasks.filter(t=>t&&!t.doneAt&&!t.archived&&isHome(t)&&!visible.has(String(t.id)));
   const note=radar.undated.filter(t=>!isHome(t));
   const dates=appointments.filter(a=>a&&iso(a.date)&&a.date>=today&&a.date<=addDay(today,6))
     .sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
   const todayRoutines=routines.filter(r=>r&&r.due);
   return {due,prepare:radar.prepare,soon,far:radar.future,home,note,
     habitsDue:habitsDue.filter(Boolean),habitDone:habitDone.filter(Boolean),
     routines:todayRoutines,appointments:dates,
     counts:{due:due.length,soon:soon.length,home:home.length,notes:note.length,habits:habitsDue.length}};
 }
 return {addDay,isHome,compose};
});
