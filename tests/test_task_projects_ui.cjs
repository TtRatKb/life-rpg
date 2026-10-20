/* Isolated task-project persistence test; no network or real Life RPG data. */
const assert=require('node:assert/strict');
const core=require('../task-projects-core.js');
const progress=require('../task-progress-core.js');
const storage={};
let persistOk=true, saves=0;
global.window={
 LifeRPGTaskProjectCore:core,
 LifeRPGTaskProgressCore:progress,
 LifeRPGApp:{
  getState:()=>storage,
  escapeHtml:s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
  saveState:()=>{saves++;return persistOk;},
  showToast:()=>{},
 },
 dispatchEvent:()=>{}
};
global.document={readyState:'loading',addEventListener:()=>{},getElementById:()=>null};
global.Event=class Event {constructor(type){this.type=type;}};
require('../task-projects.js');
const manager=window.LifeRPGTaskProjects;
assert.ok(manager);
const sample=core.instantiate(core.exam,'2026-11-20',{format:'digital',inclusion:'yes',resit:'no'},'synthetic-uuid');
storage.taskProjectsV1={schemaVersion:1,projects:[sample],inbox:[],templates:[],offDutyDay:''};
assert.equal(manager.getOpen().length,sample.tasks.length);
const design=sample.tasks.find(t=>t.stepId==='design');
assert.ok(manager._test.markDone(design.id,false));
assert.equal(sample.tasks.find(t=>t.stepId==='design').doneAt!==null,true);
assert.equal(manager.getOpen().length,sample.tasks.length-1);
assert.ok(manager._test.markDone(design.id,true));
assert.equal(manager.getOpen().length,sample.tasks.length);
const saved=JSON.stringify(storage.taskProjectsV1);
persistOk=false;
assert.equal(manager._test.markDone(design.id,false),false);
assert.equal(JSON.stringify(storage.taskProjectsV1),saved,'failed saves rollback in-memory changes');
assert.equal(manager.getOpen().length,sample.tasks.length);
assert.ok(saves>=3);
console.log('Task project save rollback and completed-step tests passed');
