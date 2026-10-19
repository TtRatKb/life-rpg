/* Google Calendar read-only event projection. No credentials, titles or events in Life RPG save. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LifeRPGCalendarCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const toDate=s=>{const d=new Date(s+'T00:00:00');return Number.isFinite(+d)?d:null;};
 const fmt=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 function dayPart(e,day,padBefore=0,padAfter=0){
   if(!e||e.status==='cancelled'||e.start?.date||e.end?.date||!e.start?.dateTime||!e.end?.dateTime)return null;
   const a=Date.parse(e.start.dateTime),b=Date.parse(e.end.dateTime);
   const start=toDate(day);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||!start)return null;
   const offset=start.getTime(),t0=Math.max(0,Math.floor((a-Math.max(0,padBefore)*60000-offset)/60000)),t1=Math.min(1440,Math.ceil((b+Math.max(0,padAfter)*60000-offset)/60000));
   return t1>t0?[t0,t1]:null;
 }
 function busyEvents(calendars,events,day){
   const blocks=[];
   for(const event of events||[]){
     const cfg=calendars?.[event.calendarId];if(cfg?.mode!=='busy')continue;
     const interval=dayPart(event,day,cfg.bufferBefore||0,cfg.bufferAfter||0);
     if(interval)blocks.push({start:fmt(interval[0]),end:fmt(interval[1]),title:event.summary||'Termin',calendarId:event.calendarId});
   }
   return blocks;
 }
 function workWindows(calendars,events,day){
   return (events||[]).flatMap(e=>{
     const cfg=calendars?.[e.calendarId];if(cfg?.mode!=='work')return [];
     const p=dayPart(e,day);return p?[{id:'calendar:'+e.calendarId+':'+e.id+':'+day,title:e.summary||'Kalender-Arbeitszeit',date:day,
      start:fmt(p[0]),end:fmt(p[1]),place:cfg.place||'school',repeat:'once'}]:[];
   });
 }
 function defaultMode(label){
   const s=String(label||'').toLocaleLowerCase('de-DE');
   if(s.includes('unterricht')||s.includes('aufsicht'))return 'ignore';
   if(s.includes('arbeitsblöck')||s.includes('arbeitsblock'))return 'work';
   if(s.includes('privat')||s.includes('fahrt')||s.includes('termine'))return 'busy';
   return 'ignore'; // Explicit opt-in for unfamiliar calendars.
 }
 return {dayPart,busyEvents,workWindows,defaultMode};
});