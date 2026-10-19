const assert=require('node:assert/strict'),core=require('../task-pack-core.js');
const pack={schema:'life-rpg-task-pack-v1',id:'synthetic-v1',groups:[
 {id:'annual',title:'Fiktive Jahrespläne',kind:'project',anchorDate:'2026-10-19',tasks:[{id:'m5',title:'Mathe 5 planen',dueDate:'2026-10-29',minutes:120,mandatory:true,dateKind:'target',depends:[]}]},
 {id:'misc',title:'Fiktive Einzelaufgaben',kind:'inbox',tasks:[{id:'call',title:'Telefonliste holen',dueDate:'2026-10-30',minutes:10,mandatory:false}]}
],routines:[{id:'bills',title:'Rechnungen prüfen',cadence:'weekly',weekday:6,steps:['Prüfen','Ggf. begleichen']},{id:'after-school',title:'Schulabschluss',cadence:'schoolday',steps:['Klassenbuch','Notenheft']}]};
assert.equal(core.validate(pack),pack);
let st={projects:[],inbox:[]};
let r=core.importSelected(st,pack,['group:annual','group:misc','routine:bills','routine:after-school'],'2026-10-19T12:00:00Z');
assert.equal(r.projects,1);assert.equal(r.tasks,2);assert.equal(r.routines,2);
const snapshot=JSON.stringify(st);
r=core.importSelected(st,pack,['group:annual','group:misc','routine:bills','routine:after-school'],'2026-10-19T12:00:00Z');
assert.equal(r.tasks,0);assert.equal(r.routines,0);assert.equal(JSON.stringify(st),snapshot);
const renamed=structuredClone(pack);renamed.groups[1].tasks[0].title='Andere Notiz';
assert.equal(core.dueRoutine(st.routinesV1[0],'2026-10-25',false),true);
assert.equal(core.dueRoutine(st.routinesV1[0],'2026-10-26',false),false);
assert.equal(core.dueRoutine({cadence:'before-school-monday'},'2026-10-25',false,true),true);
assert.equal(core.dueRoutine({cadence:'before-school-monday'},'2026-10-25',false,false),false);
assert.equal(core.dueRoutine(st.routinesV1[1],'2026-10-27',false),false);
assert.equal(core.dueRoutine(st.routinesV1[1],'2026-10-27',true),true);
assert.equal(core.isSchoolday('2026-10-27',[{type:'teaching',canceled:false}],[]),true);
assert.equal(core.isSchoolday('2026-10-27',[{type:'teaching',canceled:true}],[]),false);
assert.throws(()=>core.validate({...pack,id:'../invalid'}));
assert.throws(()=>core.validate({...pack,groups:[{...pack.groups[0],tasks:[{...pack.groups[0].tasks[0],dueDate:'2026-02-30'}]}]}));
assert.throws(()=>core.validate({...pack,groups:[{...pack.groups[0],tasks:[{...pack.groups[0].tasks[0],depends:['missing']}]}]}));
console.log('Curated import validation, idempotency and routine projection passed');