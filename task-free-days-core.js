/* Life RPG · suggestions for open/unstructured days. NO automatic scheduling/rewards. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeRPGFreeDayCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function toDay(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return null;const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?d:null;}
 function days(a,b){const x=toDay(a),y=toDay(b);return x&&y?Math.round((+y- +x)/86400000):null;}
 function score(t,now,style='balanced'){
   if(!t||t.doneAt||t.archived||t.status==='waiting'||(t.blockedBy||[]).length)return null;
   const remain=days(now,t.dueDate),hard=t.mandatory!==false,frog=t.hurdle==='high';
   // Any time-consuming important project can be advanced early; 'optional' is never a mandatory deadline.
   let value=hard?65:18;
   if(remain!==null){if(remain<0)value+=hard?80:9;
     else if(remain===0)value+=hard?75:20;else if(remain<=2)value+=hard?68:16;
     else if(remain<=7)value+=hard?50:10;else if(remain<=14)value+=hard?35:6;else if(remain<=35)value+=hard?19:2;}
   if(t.dateKind==='target')value-=12;
   const effort=Number(t.minutes)||20;
   if(hard&&effort>=90)value+=12;
   if(style==='frog'&&frog)value+=23;
   if(style==='gentle'&&frog)value-=15;
   if(style==='quick'&&effort<=30)value+=20;
   return value;
 }
 function recommend(tasks,now,opts={}){
   if(!toDay(now))throw Error('Invalid local date.');
   const style=['balanced','frog','gentle','quick'].includes(opts.style)?opts.style:'balanced';
   const available=Number.isFinite(Number(opts.availableMinutes))?Math.max(0,Math.min(720,Number(opts.availableMinutes))):null;
   const outside=Boolean(opts.alreadyOut);
   let all=(tasks||[]).map(t=>({task:t,points:score(t,now,style)})).filter(x=>x.points!==null);
   all=all.map(({task,points})=>({task,points:points+(task.context==='outside'&&!outside?-16:0)}));
   const fit=a=>available===null||Number(a.task.minutes||20)<=available;
   const ranked=all.filter(a=>a.task.context!=='outside'||outside).sort((a,b)=>b.points-a.points||(a.task.dueDate||'9999').localeCompare(b.task.dueDate||'9999'));
   // Still show a long critical task rather than pretending nothing exists when budget is short.
   const primary=ranked.filter(fit).slice(0,4);
   if(!primary.length&&ranked.length)primary.push({...ranked[0],needsSplit:true});
   const outsideItems=all.filter(a=>a.task.context==='outside').sort((a,b)=>b.points-a.points).slice(0,3);
   const pending=(tasks||[]).filter(t=>!t.doneAt&&!t.archived);
   const waiting=pending.filter(t=>t.status==='waiting'||(t.blockedBy||[]).length>0);
   const withDates=pending.filter(t=>t.mandatory!==false&&toDay(t.dueDate));
   const nextDeadline=withDates.sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]||null;
   return {primary,outsideItems:outside?[]:outsideItems,waiting:waiting.slice(0,3),nextDeadline,
     totalOpen:pending.length,possible:all.length,style};
 }
 return {days,score,recommend};
});