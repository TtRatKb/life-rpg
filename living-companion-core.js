/* Living Companion · pure, no AI, no rewards, no persisted health data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeRPGLivingCompanionCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 function instant(value,day){
   if(value instanceof Date)return +value;
   if(typeof value==='number')return value;
   if(typeof value!=='string')return NaN;
   if(/^\d{2}:\d{2}$/.test(value))return +new Date(day+'T'+value+':00');
   const n=Date.parse(value);return Number.isFinite(n)?n:NaN;
 }
 function freeSlot(now,events,bufferMinutes=15){
   const current=now instanceof Date?+now:+new Date(now),date=localDate(new Date(current));
   const buffer=clamp(Number(bufferMinutes)||0,0,120)*60000;
   const blocks=(events||[]).filter(e=>e&&!e.canceled).map(e=>({
     start:instant(e.start,date),end:instant(e.end,date),title:String(e.label||e.title||'your next appointment')
   })).filter(e=>Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start).sort((a,b)=>a.start-b.start);
   let busyUntil=0;
   for(const b of blocks)if(b.start<=current&&b.end>current)busyUntil=Math.max(busyUntil,b.end);
   if(busyUntil)return {minutes:0,reason:'busy',next:blocks.find(b=>b.start<=current&&b.end>current)||null};
   const next=blocks.find(b=>b.start>current);
   if(!next)return {minutes:240,reason:'open',next:null};
   const minutes=Math.max(0,Math.floor((next.start-buffer-current)/60000));
   return {minutes:clamp(minutes,0,240),reason:minutes<12?'departure':'open',next};
 }
 function workTask(t){
   const explicit=String(t.realm||t.category||t.categoryId||'').toLowerCase();
   if(['work','school','work_home','teaching','planning','grading','admin'].includes(explicit))return true;
   if(t.context==='school')return true;
   return /(?:unterricht|klassenarbeit|klausur|korrektur|elternbrief|elternabend|schul|jahresplanung|lernentwicklungs|zeugnis|curriculum|lesson plan|grading|assessment)/i.test(String(t.title||'')+' '+String(t.projectTitle||''));
 }
 function healthyCapacity(checkIn){
   if(!checkIn)return 'unknown';
   if(checkIn.health?.illness==='yes'||checkIn.health?.dayCleared===true||checkIn.gentle===true||checkIn.energy==='fumes')return 'rest';
   if(checkIn.energy==='low'||checkIn.sleep==='bad'||['high','overload'].includes(checkIn.stress))return 'low';
   return 'normal';
 }
 function habitTime(h,hour){
   const p=h.daypart||'anytime';
   if(p==='morning')return hour<13;
   if(p==='daytime')return hour>=9&&hour<20;
   if(p==='evening')return hour>=16;
   return true;
 }
 function scoreTask(t,date,capacity){
   const days=t.dueDate?Math.round((Date.parse(t.dueDate+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000):null;
   let score=t.mandatory!==false?47:23;
   if(days!==null){if(days<0)score+=30;else if(days===0)score+=32;else if(days<=2)score+=25;else if(days<=7)score+=16;}
   if(capacity!=='normal'&&t.hurdle==='high')score-=18;
   if(t.status==='in_progress'||t.startedAt)score+=6;
   return score;
 }
 function recommend(input){
   const now=input.now instanceof Date?input.now:new Date(input.now||Date.now());
   const date=localDate(now),slot=freeSlot(now,input.events||[],input.bufferMinutes??15);
   const capacity=healthyCapacity(input.checkIn);
   const excluded=new Set(input.excluded||[]);
   const snoozed=input.snoozed||{};
   const allowed=id=>!excluded.has(id)&&Number(snoozed[id]||0)<=+now;
   if(slot.reason==='busy')return {kind:'busy',slot,capacity};
   if(slot.reason==='departure')return {kind:'departure',slot,capacity};
   if(input.calendarIncomplete){
     // An offline calendar means all unconfirmed time windows are unknown.
     // Offer only explicitly requested, non-scheduled tiny habits / voluntary leisure.
     if(input.safeOnly){
       const hour=now.getHours();
       const tiny=(input.habits||[]).filter(h=>h?.id&&['tiny','low'].includes(h.effort)
         &&habitTime(h,hour)&&allowed('habit:'+h.id));
       const habit=tiny[0];
       if(habit)return {kind:'habit',id:'habit:'+habit.id,item:habit,slot,capacity,calendarUnverified:true};
       if(input.offDuty){
         const game=(input.games||[]).find(g=>g?.id&&['playing','backlog','endless'].includes(g.status)
           &&g.owned!==false&&!['low','someday'].includes(g.motivation)&&allowed('game:'+g.id));
         if(game)return {kind:'game',id:'game:'+game.id,item:game,slot,capacity,calendarUnverified:true};
         const book=(input.books||[]).find(b=>b?.id&&['reading','owned'].includes(b.status)
           &&b.role!=='work'&&allowed('book:'+b.id));
         if(book)return {kind:'book',id:'book:'+book.id,item:book,slot,capacity,calendarUnverified:true};
       }
       return {kind:'calendar',slot,capacity,safeExhausted:true};
     }
     return {kind:'calendar',slot,capacity};
   }
   if(!input.checkIn&&input.preferCheckIn!==false&&allowed('checkin'))return {kind:'checkin',id:'checkin',slot,capacity};
   const hour=now.getHours();
   const habits=(input.habits||[]).filter(h=>h&&h.id&&allowed('habit:'+h.id)&&habitTime(h,hour));
   const habitCandidates=habits.map(h=>({kind:'habit',id:'habit:'+h.id,item:h,
     score:58+(h.daypart==='anytime'?0:14)+(hour>=18&&h.daypart==='evening'?7:0)}));
   const maxTask=capacity==='rest'?0:capacity==='low'?25:Math.max(0,slot.minutes-5);
   const tasks=(input.tasks||[]).filter(t=>t&&t.id&&!t.doneAt&&!t.archived&&t.status!=='waiting'&&!(t.blockedBy||[]).length
     &&allowed('task:'+t.id)&&!(input.offDuty&&workTask(t))&&t.context!=='outside');
   const candidates=tasks.map(t=>{
     const effort=clamp(Number(t.minutes)||20,5,2400);
     const smallStep=effort>maxTask;
     const minutes=smallStep?Math.min(capacity==='low'?10:25,maxTask):effort;
     if(minutes<10||maxTask<10)return null;
     if(smallStep&&capacity==='low'&&t.hurdle==='high')return null;
     return {kind:'task',id:'task:'+t.id,item:t,minutes,smallStep,score:scoreTask(t,date,capacity)-(smallStep?8:0)};
   }).filter(Boolean);
   if(capacity==='rest'){
     // A rough/sick day never turns an overdue work item into pressure.
     if(habitCandidates.length)return habitCandidates.sort((a,b)=>b.score-a.score)[0];
     return {kind:'rest',slot,capacity};
   }
   const leisure=[];
   if(input.offDuty&&slot.minutes>=15){
     for(const game of input.games||[]){
       if(!game?.id||!['playing','backlog','endless'].includes(game.status)||game.owned===false||!allowed('game:'+game.id))continue;
       if(['low','someday'].includes(game.motivation))continue;
       const score=(game.status==='playing'?57:game.status==='endless'?50:44)
         +(game.motivation==='very_high'?18:game.motivation==='high'?9:0);
       leisure.push({kind:'game',id:'game:'+game.id,item:game,score});
     }
     for(const book of input.books||[]){
       if(!book?.id||!['reading','owned'].includes(book.status)||book.role==='work'||!allowed('book:'+book.id))continue;
       leisure.push({kind:'book',id:'book:'+book.id,item:book,score:book.status==='reading'?54:42});
     }
   }
   const ranked=[...habitCandidates,...leisure,...candidates].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
   const selected=ranked[0];
   if(selected)return {...selected,slot,capacity};
   return {kind:slot.minutes<12?'departure':input.offDuty?'rest':'open',slot,capacity};
 }
 return {localDate,instant,freeSlot,workTask,healthyCapacity,habitTime,recommend};
});
