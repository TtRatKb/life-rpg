/* Life RPG private task pack · strict local parser, one-time idempotent import. No cloud/API upload. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeRPGTaskPackCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ID=/^[a-z0-9][a-z0-9-]{0,79}$/;
 const date=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;};
 const unique=(rows,label)=>{
  const ids=rows.map(x=>x.id);if(new Set(ids).size!==ids.length)throw Error('Doppelte IDs: '+label);
 };
 function validate(raw){
   if(!raw || typeof raw!=='object'||Array.isArray(raw)||raw.schema!=='life-rpg-task-pack-v1'||!ID.test(raw.id))throw Error('Kein unterstütztes Life-RPG-Aufgabenpaket.');
   if(!Array.isArray(raw.groups)||raw.groups.length>25||!Array.isArray(raw.routines)||raw.routines.length>15)throw Error('Ungültige Gruppen oder Routinen.');
   unique(raw.groups,'Gruppen');unique(raw.routines,'Routinen');
   let total=0;
   const checkTitle=(text,max=160)=>typeof text==='string'&&text.trim().length>0&&text.length<=max;
   raw.groups.forEach(group=>{
     if(!ID.test(group.id)||!checkTitle(group.title,120)||!['project','inbox'].includes(group.kind)||!Array.isArray(group.tasks)||group.tasks.length>35)throw Error('Ungültige Aufgabengruppe.');
     total+=group.tasks.length;
     if(group.kind==='project'&&!date(group.anchorDate))throw Error('Projekt benötigt einen gültigen Stichtag.');
     unique(group.tasks,'Aufgaben');
     const keys=new Set(group.tasks.map(t=>t.id));
     group.tasks.forEach(t=>{
       if(!ID.test(t.id)||!checkTitle(t.title)||t.dueDate&&!date(t.dueDate)||(group.kind==='project'&&!date(t.dueDate))||!Number.isInteger(t.minutes)||t.minutes<5||t.minutes>2400)throw Error('Ungültige Aufgabe: '+String(t.title).slice(0,60));
       if(t.notes!==undefined&&(typeof t.notes!=='string'||t.notes.length>500))throw Error('Aufgabennotiz zu lang.');
       if(t.mandatory!==true&&t.mandatory!==false)throw Error('Aufgabe braucht Verbindlichkeit.');
       if(!['fixed','target',undefined].includes(t.dateKind))throw Error('Unbekannte Terminart.');
       if(![undefined,'normal','high'].includes(t.hurdle))throw Error('Unbekannte emotionale Hürde.');
       if(![undefined,'waiting'].includes(t.status))throw Error('Unbekannter Aufgabenstatus.');
       if(t.depends!==undefined&&(!Array.isArray(t.depends)||t.depends.some(id=>!keys.has(id)||id===t.id)))throw Error('Ungültige Abhängigkeit.');
     });
   });
   if(total>220)throw Error('Zu viele Aufgaben auf einmal.');
   raw.routines.forEach(r=>{
     if(!ID.test(r.id)||!checkTitle(r.title,120)||!['weekly','schoolday','school-monday','before-school-monday'].includes(r.cadence)||!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>8||r.steps.some(x=>!checkTitle(x,160)))throw Error('Ungültige Routine.');
     if(r.cadence==='weekly'&&(!Number.isInteger(r.weekday)||r.weekday<0||r.weekday>6))throw Error('Ungültiger Wochentag.');
   });
   return raw;
 }
 const normalize=s=>String(s||'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
 function importSelected(state,pack,ids,when){
   validate(pack);
   if(!state||!Array.isArray(state.projects)||!Array.isArray(state.inbox))throw Error('Task-Speicher nicht verfügbar.');
   const chosen=new Set(ids||[]);
   const knownProjectIds=new Set(state.projects.map(p=>p.id));
   const knownProjectTitles=new Set(state.projects.map(p=>normalize(p.title)));
   const knownTaskIds=new Set([...state.inbox.map(t=>t.id),...state.projects.flatMap(p=>(p.tasks||[]).map(t=>t.id))]);
   const knownTaskTitles=new Set([...state.inbox.map(t=>normalize(t.title)),...state.projects.flatMap(p=>(p.tasks||[]).map(t=>normalize(t.title)))]);
   state.routinesV1=Array.isArray(state.routinesV1)?state.routinesV1:[];
   state.routineChecksV1=state.routineChecksV1&&typeof state.routineChecksV1==='object'&&!Array.isArray(state.routineChecksV1)?state.routineChecksV1:{};
   const knownRoutineIds=new Set(state.routinesV1.map(r=>r.id));
   const result={projects:0,tasks:0,routines:0,duplicates:0};
   const projectTask=(packId,groupId,t)=>({
     id:'pack:'+packId+':'+groupId+':'+t.id,stepId:t.id,title:t.title,notes:t.notes||'',dueDate:t.dueDate||'',
     dateKind:t.dateKind||'target',minutes:t.minutes,mandatory:t.mandatory,hurdle:t.hurdle||'normal',status:t.status||'open',
     depends:t.depends||[],doneAt:null
   });
   for(const g of pack.groups){
     if(!chosen.has('group:'+g.id))continue;
     const pid='pack:'+pack.id+':'+g.id;
     if(g.kind==='project'){
       if(knownProjectIds.has(pid)||knownProjectTitles.has(normalize(g.title))){result.duplicates++;continue;}
       state.projects.push({id:pid,templateId:'private-pack-v1',title:g.title,anchorDate:g.anchorDate,options:{},createdAt:when,tasks:g.tasks.map(t=>projectTask(pack.id,g.id,t))});
       knownProjectIds.add(pid);knownProjectTitles.add(normalize(g.title));
       g.tasks.forEach(t=>knownTaskIds.add(pid+':'+t.id));
       result.projects++;result.tasks+=g.tasks.length;
     }else{
       for(const t of g.tasks){
         const row=projectTask(pack.id,g.id,t);
         if(knownTaskIds.has(row.id)||knownTaskTitles.has(normalize(row.title))){result.duplicates++;continue;}
         state.inbox.push({...row,createdAt:when});
         knownTaskIds.add(row.id);knownTaskTitles.add(normalize(row.title));result.tasks++;
       }
     }
   }
   for(const r of pack.routines){
     if(!chosen.has('routine:'+r.id))continue;
     const id='pack:'+pack.id+':routine:'+r.id;
     if(knownRoutineIds.has(id)){result.duplicates++;continue;}
     state.routinesV1.push({id,title:r.title,cadence:r.cadence,weekday:r.weekday,steps:r.steps.slice(),createdAt:when});
     knownRoutineIds.add(id);result.routines++;
   }
   return result;
 }
 function isSchoolday(dateStr,occurrences=[],logged=[]){
   return occurrences.some(x=>!x.canceled&&['teaching','morning','supervision','lunch','substitutionTeaching','substitutionSupervision','substitutionMorning','substitutionLunch'].includes(x.type))
     ||logged.some(e=>e.categoryId==='school' && String(e.startAt||'').slice(0,10)===dateStr);
 }
 function dueRoutine(r,dateStr,school,nextMondaySchool=false){
   if(!date(dateStr))return false;
   const d=new Date(dateStr+'T00:00:00Z'),wd=(d.getUTCDay()+6)%7;
   if(r.disabled)return false;
   if(r.cadence==='daily')return true;
   if(r.cadence==='monthly'){
     const day=Number(r.monthday);
     if(!Number.isInteger(day)||day<1||day>31)return false;
     const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
     return d.getUTCDate()===Math.min(day,last);
   }
   return r.cadence==='weekly'?wd===r.weekday:r.cadence==='schoolday'?school:r.cadence==='school-monday'?wd===0&&school:r.cadence==='before-school-monday'?wd===6&&nextMondaySchool:false;
 }
 return {validate,importSelected,dueRoutine,isSchoolday,date};
});