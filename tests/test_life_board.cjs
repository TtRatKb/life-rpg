/* Life Board pure projection: no state migration, no rewards, no duplicate task storage. */
const assert=require('node:assert/strict');
const board=require('../life-board-core.js');
const native=require('../task-projects-core.js');
const seed=[
 {id:'a',title:'Due today',dueDate:'2026-11-01',mandatory:true},
 {id:'b',title:'Upcoming',dueDate:'2026-11-06',mandatory:true,minutes:15},
 {id:'c',title:'Farther',dueDate:'2026-11-15',mandatory:true},
 {id:'d',title:'Home no deadline',dueDate:'',context:'home',mandatory:true},
 {id:'e',title:'Unsorted thought',dueDate:'',mandatory:true},
 {id:'f',title:'Home due soon',dueDate:'2026-11-02',context:'home',mandatory:true},
 {id:'g',title:'Done',dueDate:'2026-11-01',doneAt:'2026-11-01T09:00:00Z'},
 {id:'h',title:'Archive',dueDate:'2026-11-01',archived:true}
];
const before=JSON.stringify(seed);
const data=board.compose({tasks:seed,today:'2026-11-01',taskCore:native,
 habitsDue:[{id:'habit-1',name:'Drink water'}],habitDone:[{id:'habit-0'}],
 routines:[{id:'routine-1',title:'Tidy',due:true},{id:'routine-2',title:'Next week',due:false}],
 appointments:[
  {id:'x',date:'2026-11-06',time:'14:00',title:'Meeting'},
  {id:'y',date:'2026-11-10',time:'11:00',title:'Out of horizon'},
  {id:'z',date:'2026-11-02',time:'08:30',title:'Early appointment'}
 ]});
assert.deepEqual(data.due.map(t=>t.id),['a']);
assert.deepEqual(data.soon.map(t=>t.id),['f','b','c']);
assert.deepEqual(data.home.map(t=>t.id),['d'],'home due soon is shown with the deadline, not as a duplicate household row');
assert.deepEqual(data.note.map(t=>t.id),['e']);
assert.deepEqual(data.routines.map(t=>t.id),['routine-1']);
assert.deepEqual(data.appointments.map(a=>a.id),['z','x']);
assert.equal(data.habitsDue[0].name,'Drink water');
assert.equal(data.habitDone.length,1);
assert.equal(JSON.stringify(seed),before,'Board must never modify canonical tasks');
assert.equal(board.addDay('2026-03-29',1),'2026-03-30','DST crossing must not skip a day');
assert.equal(board.isHome({title:'Laundry'}),false,'do not guess household categories from titles');
assert.equal(board.isHome({context:'home'}),true);
console.log('Life Board isolated projection / date horizon / category safety passed');
