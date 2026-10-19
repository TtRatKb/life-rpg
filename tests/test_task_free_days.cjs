const assert=require('node:assert/strict'),{recommend,score}=require('../task-free-days-core.js');
const d='2026-10-19';
const tasks=[
 {id:'future-exam',title:'Klassenarbeit vorbereiten',minutes:120,mandatory:true,dueDate:'2026-11-05'},
 {id:'annual',title:'Jahresplan',minutes:90,mandatory:true,dueDate:'2026-11-10',dateKind:'target'},
 {id:'call',title:'Unangenehmer Anruf',minutes:10,mandatory:true,dueDate:'2026-11-02',hurdle:'high'},
 {id:'doctor',title:'Zur Arztpraxis',minutes:30,mandatory:true,dueDate:'2026-10-29',context:'outside'},
 {id:'waiting',title:'Warten auf Rückmeldung',minutes:10,mandatory:true,dueDate:'2026-10-20',status:'waiting'},
 {id:'later',title:'Kompetenzcheck',minutes:45,mandatory:true,dueDate:'2026-10-24',blockedBy:['waiting']}
];
let r=recommend(tasks,d,{});
assert.ok(r.primary.length>0,'Vacation day without booked windows still suggests useful work');
assert.ok(r.primary.some(x=>x.task.id==='future-exam'));
assert.ok(!r.primary.some(x=>x.task.id==='waiting'||x.task.id==='later'));
assert.equal(r.waiting.length,2);
assert.equal(r.outsideItems[0].task.id,'doctor');
assert.ok(r.primary.length>=3, 'No time budget must not be treated as zero minutes');
assert.equal(require('../task-free-days-core.js').contextOf({title:'Krankschreibung beim Arzt abholen'}),'outside');
assert.equal(require('../task-free-days-core.js').contextOf({title:'Material abholen aus dem Drucker'}),'any');
assert.ok(recommend(tasks,d,{alreadyOut:true}).primary.some(x=>x.task.id==='doctor'));
assert.equal(score(tasks[4],d),null);
assert.ok(score(tasks[2],d,'frog')>score(tasks[2],d,'gentle'));
const quick=recommend(tasks,d,{availableMinutes:15,style:'frog'});
assert.ok(quick.primary.every(x=>x.task.minutes<=15||x.needsSplit));
assert.equal(recommend([],d).primary.length,0);
assert.equal(recommend(tasks,d,{availableMinutes:0}).primary.length,0);
assert.ok(recommend(tasks,d,{availableMinutes:15}).primary.some(x=>x.needsSplit));
assert.throws(()=>recommend(tasks,'2026-02-30'));
console.log('Free day priority, frog preference, wait gates, and outdoor suggestions passed');