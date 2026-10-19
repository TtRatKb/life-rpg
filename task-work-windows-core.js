/* Life RPG · Task work windows. Planning-only; never logs time, awards XP, or modifies timetable slots. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeRPGTaskWindowsCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const date=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;};
 const dayNumber=s=>Math.round(Date.parse(s+'T12:00:00Z')/86400000);
 const hhmm=s=>{if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(s||'')))return null;const [h,m]=s.split(':').map(Number);return h*60+m;};
 const time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 const overlap=(a,b)=>Math.max(0,Math.min(a[1],b[1])-Math.max(a[0],b[0]));
 function validate(w){
   if(!w||!date(w.date)||hhmm(w.start)===null||hhmm(w.end)===null||hhmm(w.end)<=hhmm(w.start)
     ||hhmm(w.end)-hhmm(w.start)>720||!['once','weekly','biweekly'].includes(w.repeat||'once')
     ||w.until&&(!date(w.until)||w.until<w.date)||!['school','home','other'].includes(w.place||'school'))
     throw Error('Bitte Datum, Start und Ende (max. 12 Stunden am selben Tag) prüfen.');
   return w;
 }
 function matches(w,dateStr){
   if(!date(dateStr)||!w||w.disabled||!date(w.date)||dateStr<w.date||w.until&&dateStr>w.until)return false;
   const delta=dayNumber(dateStr)-dayNumber(w.date);
   if(w.repeat==='weekly')return delta%7===0;
   if(w.repeat==='biweekly')return delta%14===0;
   return delta===0;
 }
 function busyRange(event,dateStr){
   if(!event||event.canceled)return null;
   if(event.start instanceof Date||typeof event.start==='string'&&event.start.includes('T')){
     const from=new Date(event.start),to=new Date(event.end);
     if(!Number.isFinite(+from)||!Number.isFinite(+to)||to<=from)return null;
     const localStart=from.getHours()*60+from.getMinutes(),localEnd=to.getHours()*60+to.getMinutes();
     return localEnd>localStart?[localStart,localEnd]:null;
   }
   const start=hhmm(event.start),end=hhmm(event.end);
   return start===null||end===null||end<=start?null:[start,end];
 }
 function subtract(interval,busy){
   let segments=[interval.slice()];
   for(const hit of busy){
     segments=segments.flatMap(([a,b])=>{
       if(hit[1]<=a||hit[0]>=b)return [[a,b]];
       const out=[];if(hit[0]>a)out.push([a,Math.min(hit[0],b)]);
       if(hit[1]<b)out.push([Math.max(hit[1],a),b]);return out;
     });
   }
   return segments.filter(([a,b])=>b>a);
 }
 function forDate(windows,dateStr,commitments=[],isOff=false){
   const entries=[], busy=commitments.map(e=>busyRange(e,dateStr)).filter(Boolean);
   const blocks=(windows||[]).filter(w=>matches(w,dateStr)).sort((a,b)=>a.start.localeCompare(b.start)||String(a.id).localeCompare(String(b.id)));
   let reserved=busy.slice();
   for(const block of blocks){
     let start=hhmm(block.start),end=hhmm(block.end);
     if(start===null||end===null||end<=start)continue;
     // A marked sick/holiday/day-off school block must never be suggested as available.
     const segments=isOff&&block.place==='school'?[]:subtract([start,end],reserved);
     const remaining=segments.reduce((n,[a,b])=>n+b-a,0);
     entries.push({id:String(block.id),title:String(block.title||'Aufgabenzeit'),place:block.place||'school',
       date:dateStr,plannedStart:block.start,plannedEnd:block.end,plannedMinutes:end-start,
       availableMinutes:remaining,conflictMinutes:end-start-remaining,segments:segments.map(([a,b])=>({start:time(a),end:time(b),minutes:b-a})),
       off:Boolean(isOff&&block.place==='school')});
     reserved.push([start,end]); // Never double-count overlapping task windows.
   }
   return entries;
 }
 function range(windows,start,count,busyFn,offFn){
   if(!date(start)||!Number.isInteger(count)||count<1||count>70)throw Error('Ungültiger Zeitraum');
   const out={};for(let i=0;i<count;i++){
     const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);
     const iso=d.toISOString().slice(0,10);
     out[iso]=forDate(windows,iso,busyFn(iso)||[],Boolean(offFn?.(iso)));
   }
   return out;
 }
 return {date,hhmm,validate,matches,forDate,range,subtract,overlap};
});