/* Run: node tests/test_task_projects.cjs (standalone Node assert, no dependencies) */
const assert = require('node:assert/strict');
const core = require('../task-projects-core.js');
assert.equal(core.dayOffset('2026-10-31',1),'2026-11-01');
assert.equal(core.dayOffset('2028-02-28',1),'2028-02-29');
assert.equal(core.dayOffset('2026-03-29',1),'2026-03-30');
assert.equal(core.parseDay('2026-02-30'),null);
assert.equal(core.daysUntil('2026-11-10','2026-11-20'),10);
let p = core.instantiate(core.exam,'2026-11-20',{format:'digital',inclusion:'check',resit:'no'},'synthetic-a');
assert.equal(p.tasks.find(t=>t.stepId==='design').dueDate,'2026-11-06');
assert.equal(p.tasks.find(t=>t.stepId==='return').dueDate,'2026-12-04');
assert.ok(p.tasks.some(t=>t.stepId==='inclusion-check'));
assert.ok(!p.tasks.some(t=>t.stepId==='inclusion'));
assert.ok(!p.tasks.some(t=>t.stepId==='resit-plan'));
assert.equal(core.urgency(p.tasks.find(t=>t.stepId==='print'),'2026-11-19'),'today-critical');
const original = structuredClone(p);
p.tasks.find(t=>t.stepId==='design').doneAt='2026-11-07T09:00:00Z';
const expanded=core.updateBranches(p,core.exam,{inclusion:'yes',resit:'yes'});
assert.ok(expanded.tasks.some(t=>t.stepId==='resit-conduct'));
assert.ok(expanded.tasks.some(t=>t.stepId==='inclusion'));
assert.equal(expanded.tasks.find(t=>t.stepId==='design').doneAt,'2026-11-07T09:00:00Z');
assert.equal(original.tasks.find(t=>t.stepId==='design').doneAt,null);
assert.ok(!core.nextSteps(expanded).some(t=>t.doneAt));
const paper=core.instantiate(core.exam,'2026-11-20',{format:'paper',inclusion:'no',resit:'no'},'synthetic-b');
assert.ok(!paper.tasks.some(t=>t.stepId==='classtime'));
assert.ok(!paper.tasks.some(t=>t.stepId==='inclusion-check'));
assert.ok(paper.tasks.some(t=>t.stepId==='print'));
const adjusted = core.instantiate(core.exam,'2026-11-20',{format:'digital',inclusion:'yes'},'synthetic-c');
adjusted.tasks.find(t=>t.stepId==='inclusion').dueDate='2026-11-11';
const hidden=core.updateBranches(adjusted,core.exam,{inclusion:'no'});
assert.ok(hidden.tasks.some(t=>t.stepId==='inclusion'&&t.archived));
const restored=core.updateBranches(hidden,core.exam,{inclusion:'yes'});
assert.equal(restored.tasks.find(t=>t.stepId==='inclusion').dueDate,'2026-11-11');
assert.equal(core.nextSteps(restored).filter(t=>t.stepId==='inclusion').length,1);
const withCustom=core.instantiate(core.exam,'2026-11-20',{inclusion:'yes'},'synthetic-custom');
withCustom.tasks.push({id:'synthetic-custom:custom-1',stepId:'custom-1',title:'Meine zusätzliche Materialkontrolle',dueDate:'2026-11-18',minutes:20,mandatory:true,doneAt:null,depends:[]});
const afterBranch=core.updateBranches(withCustom,core.exam,{inclusion:'no'});
assert.ok(core.nextSteps(afterBranch).some(t=>t.stepId==='custom-1'),'Custom steps must survive changed template branches');
assert.notDeepEqual(paper.tasks.map(t=>t.id), expanded.tasks.map(t=>t.id));
assert.throws(()=>core.instantiate(core.exam,'2026-02-30',{},'x'));

const synthetic=[
 {id:'soft',title:'Optional',dueDate:'2026-10-30',mandatory:false,minutes:20},
 {id:'undated',title:'Someday',dueDate:'',mandatory:true,minutes:20},
 {id:'due',title:'Urgent',dueDate:'2026-10-31',mandatory:true,minutes:15},
 {id:'soon',title:'Long work',dueDate:'2026-11-05',mandatory:true,minutes:240},
 {id:'blocked',title:'Waiting',dueDate:'2026-10-31',mandatory:true,status:'waiting',minutes:10}
];
const buckets=core.taskBuckets(synthetic,'2026-10-31');
assert.deepEqual(buckets.urgent.map(t=>t.id),['due']);
assert.deepEqual(buckets.soon.map(t=>t.id),['soon']);
assert.equal(buckets.waiting[0].id,'blocked');
assert.ok(buckets.later.some(t=>t.id==='undated'));
assert.ok(buckets.later.some(t=>t.id==='soft'));
assert.equal(core.taskSignal(synthetic[1],'2026-10-31').days,null);
assert.equal(core.taskSignal(synthetic[2],'2026-10-31').label,'Deadline heute');
assert.equal(core.taskSignal({...synthetic[2],dateKind:'target'},'2026-10-31').hard,false);

const radarTasks=[
 {id:'today',title:'Due today',dueDate:'2026-10-31',mandatory:true,minutes:15},
 {id:'tomorrow',title:'Short action',dueDate:'2026-11-01',mandatory:true,minutes:15},
 {id:'day6',title:'Should not disappear',dueDate:'2026-11-06',mandatory:true,minutes:15},
 {id:'day12',title:'Next week',dueDate:'2026-11-12',mandatory:true,minutes:30},
 {id:'target',title:'Flexible target',dueDate:'2026-11-02',mandatory:false,dateKind:'target',minutes:15},
 {id:'waiting',title:'Waiting on reply',dueDate:'2026-11-03',mandatory:true,status:'waiting'},
 {id:'undated',title:'Brain dump',dueDate:'',mandatory:true},
 {id:'future',title:'Long horizon',dueDate:'2026-12-01',mandatory:true},
 {id:'optionalPast',title:'Past flexible date',dueDate:'2026-10-30',mandatory:false},
 {id:'done',title:'Completed',dueDate:'2026-11-01',doneAt:'2026-10-30T12:00:00Z'},
 {id:'archived',title:'Archived',dueDate:'2026-11-01',archived:true}
];
const radar=core.deadlineRadar(radarTasks,'2026-10-31');
assert.deepEqual(radar.dueNow.map(t=>t.id),['today']);
assert.deepEqual(radar.week.map(t=>t.id),['tomorrow','target','waiting','day6']);
assert.deepEqual(radar.following.map(t=>t.id),['day12']);
assert.deepEqual(radar.future.map(t=>t.id),['future']);
assert.deepEqual(radar.review.map(t=>t.id),['optionalPast']);
assert.deepEqual(radar.undated.map(t=>t.id),['undated']);
assert.deepEqual(radar.prepare.map(t=>t.id),['tomorrow']);
assert.ok(radar.week.find(t=>t.id==='waiting').radarBlocked);
assert.ok(radar.week.find(t=>t.id==='target').radarLabel.includes('flexibles Ziel'));
assert.equal(radarTasks[0].radarDays,undefined,'radar must never mutate persisted task records');
console.log('Task deadline radar includes next-week, target and waiting records safely');
console.log('Task projects scheduling and calm deadline semantics passed');
