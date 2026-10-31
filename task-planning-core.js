/* Life RPG · Native Tasks v2. Conservative planning without AI, APIs or reward payments.
   Capacity means user-confirmed EXTRA task minutes, not nominal hours at school.
   Planning suggestions do not promise a deadline will be met. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeRPGTaskPlanningCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const utcDay=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return null;
  const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?d:null;};
 const add=(s,n)=>{const d=utcDay(s);if(!d)throw Error('Ungültiger Kalendertag');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const weekday=s=>(utcDay(s).getUTCDay()+6)%7;
 const defaults=Object.freeze({weekdays:[90,90,90,90,90,0,0],reservePercent:30,horizon:35});
 const fixedSteps=new Set(['conduct','resit-conduct','return']);
 const isFixed=t=>t.fixed===true||fixedSteps.has(t.stepId);
 function capacityFor(date,settings,modifier=1){
   const n=Number(settings?.weekdays?.[weekday(date)]??defaults.weekdays[weekday(date)]);
   const reserve=Number(settings?.reservePercent??defaults.reservePercent);
   const minutes=Math.min(720,Math.max(0,Number.isFinite(n)?n:0));
   const keep=Math.max(0,Math.min(80,Number.isFinite(reserve)?reserve:30));
   return Math.max(0,Math.floor(minutes*(1-keep/100)*Math.max(0,Math.min(1,modifier))));
 }
 function plan(input){
   const today=input?.today;
   if(!utcDay(today))throw Error('Ungültiger Planungsbeginn');
   const settings=input?.settings||defaults,horizon=Math.min(70,Math.max(7,Number(settings.horizon)||35));
   const capacities={};const usage={};const buckets={};
   for(let i=0;i<horizon;i++){const d=add(today,i);const modifier=d===today?(input?.todayModifier??1):1;
     const custom=input?.capacityByDate&&Object.prototype.hasOwnProperty.call(input.capacityByDate,d);
     if(custom){const raw=Number(input.capacityByDate[d]);const reserve=Number(settings?.reservePercent??30);capacities[d]=Math.floor(Math.max(0,Math.min(1440,Number.isFinite(raw)?raw:0))*(1-Math.min(80,Math.max(0,reserve))/100)*Math.max(0,Math.min(1,modifier)));}
     else capacities[d]=capacityFor(d,settings,modifier);
     usage[d]=0;buckets[d]=[];}
   const keys=Object.keys(capacities);
   const pending=(input.tasks||[]).filter(t=>t&&!t.doneAt&&!t.archived);
   const mandatory=pending.filter(t=>t.mandatory!==false);
   const optional=pending.filter(t=>t.mandatory===false);
   const dated=mandatory.filter(t=>utcDay(t.dueDate));
   const missing=mandatory.filter(t=>!utcDay(t.dueDate));
   const issues=[], assignments={};
   const working=(date,limit)=>keys.filter(k=>k<=limit&&capacities[k]>0);
   const end=keys[keys.length-1];
   dated.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||String(a.id).localeCompare(String(b.id)));
   for(const task of dated){
     const id=String(task.id),due=task.dueDate,blocked=(task.blockedBy||[]).length>0;
     if(due<today)issues.push({id,type:'overdue',title:task.title,remaining:Number(task.minutes)||0});
     if(task.status==='waiting' || blocked){
       assignments[id]={dueDate:due,minutes:0,unallocated:0,days:[],blocked:true};
       if(due<=add(today,3))issues.push({id,type:task.status==='waiting'?'waiting':'blocked',title:task.title});
       continue;
     }
     if(due>end){issues.push({id,type:'out-of-range',title:task.title});continue;}
     if(isFixed(task)){assignments[id]={fixed:true,dueDate:due,minutes:0,unallocated:0,days:[]};continue;}
     let remaining=Math.max(5,Math.min(2400,Math.round(Number(task.minutes)||20)));
     // Reserve the last usable prep day before the deadline if any exists.
     const earlier=working(today,due).filter(d=>d<due);
     const desired=earlier.length?earlier[earlier.length-1]:due;
     const planDays=input?.preferEarlier?keys.filter(d=>d<=desired):keys.filter(d=>d<=desired).reverse();
     const allocated=[];
     for(const date of planDays){
       if(remaining<=0)break;
       const available=capacities[date]-usage[date];
       if(available<=0)continue;
       const take=Math.min(remaining,available);
       usage[date]+=take;remaining-=take;allocated.push({date,minutes:take});
       buckets[date].push({id,minutes:take,title:task.title});
     }
     assignments[id]={dueDate:due,minutes:Math.max(5,Math.min(2400,Math.round(Number(task.minutes)||20))),days:allocated,unallocated:remaining,fixed:false};
     if(remaining>0)issues.push({id,type:'overload',title:task.title,remaining});
     // Dependencies are handled before allocation; never suggest work that cannot begin.
   }
   // Undated inbox items are valid brain-dump reminders, never planning errors.
   const dueToday=mandatory.filter(t=>utcDay(t.dueDate)&&t.dueDate<=today&&!assignments[String(t.id)]?.blocked);
   const scheduledToday=mandatory.filter(t=>assignments[String(t.id)]?.days.some(x=>x.date===today));
   const todaySet=new Set(dueToday.map(t=>String(t.id)));
   const todayMust=dueToday;
   const suggestedToday=scheduledToday.filter(t=>!todaySet.has(String(t.id)));
   const soon=mandatory.filter(t=>utcDay(t.dueDate)&&t.dueDate>today&&t.dueDate<=add(today,3)&&!todaySet.has(String(t.id))&&!assignments[String(t.id)]?.blocked);
   const later=mandatory.filter(t=>!todaySet.has(String(t.id))&&!soon.some(x=>x.id===t.id));
   const optionalToday=optional.filter(t=>utcDay(t.dueDate)&&t.dueDate<=today);
   // When the caller explicitly supplies block segments, attach a concrete suggested time.
   // Segments are virtual planning capacity only; they never become time logs.
   if(input?.segmentsByDate){
     for(const d of keys){
       let budget=capacities[d];
       const segments=(input.segmentsByDate[d]||[]).map(x=>({...x,cursor:x.startMinute}));
       for(const entry of buckets[d]){
         let left=entry.minutes;entry.slots=[];
         for(const segment of segments){
           if(left<=0||budget<=0)break;
           const can=Math.min(left,budget,Math.max(0,segment.endMinute-segment.cursor));
           if(!can)continue;
           const slot={date:d,blockId:segment.blockId,startMinute:segment.cursor,endMinute:segment.cursor+can,minutes:can};
           entry.slots.push(slot);segment.cursor+=can;budget-=can;left-=can;
           if(assignments[entry.id]){assignments[entry.id].slots ||= [];assignments[entry.id].slots.push(slot);}
         }
       }
     }
   }
   const daily=keys.map(date=>({date,capacity:capacities[date],planned:usage[date],remaining:capacities[date]-usage[date],tasks:buckets[date]}));
   return {today,todayMust,suggestedToday,soon,later,optionalToday,optional,missing,issues,daily,assignments,confident:issues.length===0};
 }
 return {defaults,add,weekday,capacityFor,plan,isFixed};
});