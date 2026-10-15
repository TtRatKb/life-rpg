'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../health-import-core.js');
const TODAY=new Date(2026,9,15,12);
const opts={now:TODAY};
const day=(n)=>{const d=new Date(TODAY);d.setDate(d.getDate()-n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const batch=days=>JSON.stringify({schema:core.SCHEMA,days});
const load=raw=>core.parseBatch(raw,opts);

test('reads 14 historical days as a single distinct batch',()=>{
  const src=Array.from({length:14},(_,n)=>({date:day(n),steps:1000+n,sleepMinutes:420}));
  const records=load(batch(src)).records;
  assert.equal(records.length,14);
  assert.equal(new Set(records.map(r=>r.date)).size,14);
  assert.equal(records[12].imported.sleepMinutes,420);
});
test('existing one-day flat JSON stays compatible',()=>{
  const rec=load(JSON.stringify({date:day(0),steps:8000,waterMl:1500})).records[0];
  assert.equal(rec.imported.steps,8000);assert.equal(rec.nutrition.waterMl,1500);
});
test('nested existing imported/nutrition payloads stay compatible',()=>{
  const rec=load({date:day(0),imported:{steps:6700},nutrition:{proteinG:40}}).records[0];
  assert.equal(rec.imported.steps,6700);assert.equal(rec.nutrition.proteinG,40);
});
test('missing fields stay absent, and zero is only accepted when explicit',()=>{
  const rec=load(batch([{date:day(0),steps:0}])).records[0];
  assert.deepEqual(rec.imported,{steps:0});assert.deepEqual(rec.wellbeing,{});
  assert.equal(Object.hasOwn(rec.imported,'sleepMinutes'),false);
});
test('private wellness requires opt-in even when nested',()=>{
  const data=batch([{date:day(0),wellbeing:{periodActive:true,periodCramps:'moderate',mood:'low'}}]);
  assert.throws(()=>load(data),/ausdrückliche Einwilligung/);
  const rec=core.parseBatch(data,{...opts,allowWellbeing:true}).records[0];
  assert.deepEqual(rec.wellbeing,{periodActive:true,periodCramps:'moderate',mood:'low'});
});
test('private states never inferred from period cramps',()=>{
  const rec=core.parseBatch(batch([{date:day(0),periodCramps:'strong'}]),{...opts,allowWellbeing:true}).records[0];
  assert.deepEqual(rec.wellbeing,{periodCramps:'strong'});
  assert.equal(Object.hasOwn(rec.wellbeing,'periodActive'),false);
});
test('rejects duplicate days, invalid date, future and old dates',()=>{
  assert.throws(()=>load(batch([{date:day(1),steps:2},{date:day(1),steps:3}])),/Doppeltes Datum/);
  assert.throws(()=>load(batch([{date:'2026-02-30',steps:3}])),/Kalenderdatum/);
  assert.throws(()=>load(batch([{date:'2026-10-20',steps:3}])),/92-Tage/);
  assert.throws(()=>load(batch([{date:'2026-05-01',steps:3}])),/92-Tage/);
});
test('rejects unsupported values, numeric booleans, extra-large batches',()=>{
  assert.throws(()=>load(batch([{date:day(1),sleepMinutes:3000}])),/Ungültiger/);
  assert.throws(()=>load(batch([{date:day(1),steps:-1}])),/Ungültiger/);
  assert.throws(()=>load(batch([{date:day(1),steps:true}])),/Ungültiger/);
  assert.throws(()=>load(batch(Array.from({length:94},()=>({date:day(1),steps:2})))),/93/);
  assert.throws(()=>load('not json'),/gültiges JSON/);
});
test('merge is idempotent with no duplicate write or changed timestamp',()=>{
  const rec=load(batch([{date:day(0),steps:1234,sleepMinutes:440}])).records[0];
  const a=core.mergeDay(null,rec,12345);
  assert.equal(a.changed,true);
  const b=core.mergeDay(a.record,rec,99999);
  assert.equal(b.changed,false);
  assert.strictEqual(b.record,a.record);
  assert.equal(b.record.updatedAt,12345);
});
test('keeps unknown original fields, manually saved nutrients and old imported days',()=>{
  const rec=load(batch([{date:day(0),steps:6000,caloriesKcal:2800}])).records[0];
  const prev={date:day(0),id:'user:'+day(0),nutrition:{caloriesKcal:1750,waterMl:1234},
    imported:{standHours:7,steps:4000},wellbeing:{mood:'good'},source:'Life RPG · manuell',
    pending:false,updatedAt:12,customOldField:{x:1}};
  const out=core.mergeDay(prev,rec,123).record;
  assert.equal(out.id,prev.id);
  assert.deepEqual(out.nutrition,prev.nutrition);
  assert.equal(out.imported.steps,6000);
  assert.equal(out.imported.standHours,7);
  assert.equal(out.wellbeing.mood,'good');
  assert.deepEqual(out.customOldField,{x:1});
  assert.equal(out.pending,true);
  assert.equal(out.source,'Life RPG · manuell');
});
test('correction of imported metric updates value, missing keys never delete old data',()=>{
  const rec=load(batch([{date:day(0),steps:5555}])).records[0];
  const old={date:day(0),imported:{steps:5000,sleepMinutes:380},nutrition:{proteinG:30},wellbeing:{mood:'good'}};
  const updated=core.mergeDay(old,rec,333);
  assert.equal(updated.changed,true);
  assert.deepEqual(updated.record.imported,{steps:5555,sleepMinutes:380});
  assert.equal(updated.record.wellbeing.mood,'good');
});
test('no unsupported/empty sample silently manufactures a day',()=>{
  assert.throws(()=>load(batch([{date:day(0)}])),/keine unterstützten/);
  assert.throws(()=>load(batch([{date:day(0),measuredMood:'bad'}])),/keine unterstützten/);
  assert.throws(()=>core.parseBatch({days:[{date:day(0),steps:2}]},opts),/Unbekanntes/);
});
