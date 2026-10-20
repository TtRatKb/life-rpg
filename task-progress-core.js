/* Life RPG · task progress and canonical time links, no independent XP/coins/time payments. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeRPGTaskProgressCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VALID=new Set(['progress','done','reopen']);
function findTask(model,id){
 if(!model||!id)return null;
 for(const project of model.projects||[]){const task=(project.tasks||[]).find(t=>t.id===id);if(task)return {task,project};}
 const task=(model.inbox||[]).find(t=>t.id===id);
 return task?{task,project:null}:null;
}
function listTasks(model,{includeDone=true}={}){
 const items=[];
 for(const p of model?.projects||[]){if(p.archived)continue;for(const t of p.tasks||[]){if(t.archived||!includeDone&&t.doneAt)continue;items.push({...t,projectTitle:p.title,projectId:p.id});}}
 for(const t of model?.inbox||[]){if(t.archived||!includeDone&&t.doneAt)continue;items.push({...t});}
 return items;
}
function normalizeUpdate(raw){
 const taskId=String(raw?.taskId||'');
 const status=String(raw?.status||'progress');
 if(!taskId||!VALID.has(status))throw Error('Ungültige Aufgabe oder Status.');
 const note=String(raw?.note||'').trim().slice(0,500);
 const timeEntryId=raw?.timeEntryId?String(raw.timeEntryId):null;
 return {taskId,status,note,timeEntryId};
}
function update(model,raw,at,id){
 const v=normalizeUpdate(raw),pair=findTask(model,v.taskId);
 if(!pair)throw Error('Die Aufgabe ist nicht mehr vorhanden.');
 if(!Array.isArray(model.taskActivityV1))model.taskActivityV1=[];
 const when=at||new Date().toISOString();
 if(!Number.isFinite(Date.parse(when)))throw Error('Ungültiger Zeitpunkt.');
 const logId=v.timeEntryId?'time-task:'+v.timeEntryId+':'+v.taskId:id||'task-note:'+when+':'+Math.random().toString(36).slice(2,10);
 let activity=model.taskActivityV1.find(row=>row.id===logId);
 if(activity){activity.status=v.status;activity.note=v.note;activity.at=when;}
 else{activity={id:logId,at:when,taskId:v.taskId,title:pair.task.title,projectTitle:pair.project?.title||'',status:v.status,note:v.note,timeEntryId:v.timeEntryId};model.taskActivityV1.push(activity);}
 if(v.status==='done')pair.task.doneAt=when;
 if(v.status==='reopen')pair.task.doneAt=null;
 if(v.status==='progress')pair.task.lastProgressAt=when;
 if(v.note&&v.status!=='reopen')pair.task.lastProgressNote=v.note;
 return {...activity};
}
function linkTimeEntry(model,entry,updates,at){
 if(!entry?.id)throw Error('Zeitlog fehlt.');
 if(!Array.isArray(updates)||updates.length>25)throw Error('Zu viele ausgewählte Aufgaben.');
 const unique=new Set(),links=[];
 for(const raw of updates){
   const v=normalizeUpdate({...raw,timeEntryId:entry.id});
   if(unique.has(v.taskId))throw Error('Aufgabe mehrfach ausgewählt.');
   unique.add(v.taskId);
   const log=update(model,v,at||entry.endAt||new Date().toISOString());
   links.push({taskId:v.taskId,status:v.status,note:v.note,title:log.title});
 }
 entry.taskLinks=links;
 return links;
}
function latest(model,id){
 return (model?.taskActivityV1||[]).filter(row=>row.taskId===id).sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0]||null;
}
function candidates(model,entry){
 const work=/(?:school|work_home|focus)/.test(entry?.categoryId||'');
 const txt=(String(entry?.subcategory||'')+' '+String(entry?.label||'')).toLowerCase();
 const tasks=listTasks(model,{includeDone:false}).filter(t=>!(t.blockedBy||[]).length&&t.status!=='waiting');
 const patterns=/(grading|correct|korrektur|klassenarbeit auswerten|assessment)/.test(txt)?
   /korrektur|bewert|rückgabe|kompetenzcheck|klassenarbeit|nachschreib|classTime/i:
   /(lesson|vorbereit|planung|planning)/.test(txt)?/unterricht|stunde|schulcockpit|jahresplan|ga\b|arbeitsblatt|ausdruck|präsentation|planung|kompetenz/i:
   /(admin|organisation|school)/.test(txt)?/sekretariat|telefon|mail|liste|schul|organis|klasse|reise|fahrausflug/i:null;
 return tasks.map(t=>({task:t,points:(patterns?.test(t.title)?55:0)+(t.mandatory?20:0)+(t.hurdle==='high'?4:0)+(t.dueDate?Math.max(0,25-Math.max(0,(Date.parse(t.dueDate+'T12:00:00')-Date.now())/86400000)):0)}))
   .sort((a,b)=>b.points-a.points||String(a.task.dueDate||'9999').localeCompare(String(b.task.dueDate||'9999')))
   .slice(0,work?18:8).map(x=>x.task);
}
return {findTask,listTasks,normalizeUpdate,update,linkTimeEntry,latest,candidates};
});