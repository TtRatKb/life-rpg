const assert=require('node:assert/strict');
const c=require('../living-companion-core.js');
const now=new Date('2026-10-21T14:20:00+02:00');
const appt=[{start:'14:30',end:'15:20',title:'Arzttermin'}];
const long={id:'lesson',title:'Jahresplanung Klasse 6',minutes:120,mandatory:true,dueDate:'2026-10-21'};
const quick={id:'clean',title:'Küchentisch aufräumen',minutes:10,mandatory:false};
assert.equal(c.freeSlot(now,appt,0).minutes,10);
assert.equal(c.freeSlot(now,appt,15).reason,'departure');
assert.equal(c.recommend({now,events:appt,bufferMinutes:15,checkIn:{energy:'okay'},tasks:[long]}).kind,'departure');
const free={now,events:[],checkIn:{energy:'okay'},tasks:[long,quick],preferCheckIn:false};
assert.equal(c.recommend(free).kind,'task');
assert.equal(c.recommend(free).item.id,'lesson');
assert.equal(c.recommend({...free,events:[{start:'15:00',end:'16:00'}]}).item.id,'lesson');
assert.equal(c.recommend({...free,events:[{start:'15:00',end:'16:00'}]}).smallStep,true);
assert.equal(c.recommend({...free,offDuty:true}).item.id,'clean');
assert.equal(c.workTask(long),true);
assert.equal(c.workTask(quick),false);
assert.equal(c.recommend({...free,checkIn:{energy:'fumes'},habits:[]}).kind,'rest');
assert.equal(c.recommend({...free,checkIn:{energy:'low'},tasks:[long]}).smallStep,true);
assert.equal(c.recommend({...free,checkIn:null,preferCheckIn:true}).kind,'checkin');
assert.equal(c.recommend({...free,checkIn:null,preferCheckIn:true}).id,'checkin');
assert.equal(c.recommend({...free,offDuty:true,games:[{id:'g1',name:'Cozy game',status:'backlog',owned:true,motivation:'very_high'}]}).kind,'game');
assert.equal(c.recommend({...free,offDuty:true,books:[{id:'b1',title:'Fun book',status:'reading',role:'fun'}]}).kind,'book');
assert.equal(c.recommend({...free,habits:[{id:'supp',daypart:'morning'}],tasks:[]}).kind,'open');
assert.equal(c.recommend({...free,habits:[{id:'throw',daypart:'anytime'}],tasks:[]}).kind,'habit');
assert.equal(c.recommend({...free,habits:[{id:'throw',daypart:'anytime'}],tasks:[],snoozed:{'habit:throw':+now+60000}}).kind,'open');
assert.equal(c.recommend({...free,habits:[{id:'throw',daypart:'anytime'}],tasks:[],excluded:['habit:throw']}).kind,'open');
assert.equal(c.recommend({...free,calendarIncomplete:true}).kind,'calendar');
assert.equal(c.recommend({...free,calendarIncomplete:true,safeOnly:true,tasks:[long],habits:[{id:'huge',name:'Long habit',effort:'high',daypart:'anytime'}]}).kind,'calendar');
const safe=c.recommend({...free,calendarIncomplete:true,safeOnly:true,
  habits:[{id:'tiny',name:'Throw away one item',effort:'tiny',daypart:'anytime'}],tasks:[long]});
assert.equal(safe.kind,'habit');
assert.equal(safe.calendarUnverified,true);
assert.equal(safe.item.id,'tiny');
assert.equal(c.recommend({...free,calendarIncomplete:true,safeOnly:true,
  habits:[{id:'tiny',effort:'tiny'}],snoozed:{'habit:tiny':+now+60000}}).kind,'calendar');
assert.equal(c.recommend({...free,calendarIncomplete:true,safeOnly:true,offDuty:true,
  games:[{id:'g1',title:'Cozy title',status:'playing',owned:true}]}).kind,'game');
assert.equal(c.recommend({...free,calendarIncomplete:true,safeOnly:true,offDuty:false,
  games:[{id:'g1',title:'Cozy title',status:'playing',owned:true}]}).kind,'calendar');
assert.equal(c.recommend({...free,offDuty:true,games:[{id:'paused',status:'paused',owned:true}]}).kind,'task');
assert.equal(c.freeSlot(new Date('2026-10-21T14:50:00+02:00'),appt,15).reason,'busy');
assert.equal(c.freeSlot(new Date('2026-10-21T15:25:00+02:00'),appt,15).reason,'open');
console.log('Living Companion: hard time safety, context, habits, off-duty, recovery, dismissals pass');
