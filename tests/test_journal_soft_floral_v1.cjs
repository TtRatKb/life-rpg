'use strict';
// No Firebase access or real personal saves: static/syntax regression for soft floral V1.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const book=read('bullet-journal-book.js'),journal=read('journal.js'),index=read('index.html');
const spread=read('journal-daily-spread-v1.css'),worker=read('service-worker.js');
for(const file of ['bullet-journal-book.js','journal.js','pwa.js','service-worker.js']){
 const result=cp.spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
 assert.equal(result.status,0,file+': '+result.stderr);
}
for(const name of ['gratitude','smallWin','hardThing','yearQuestion'])
 assert.match(book,new RegExp('"'+name+'"'),'Existing reflection field missing: '+name);
for(const name of ['focusText','intentionText','happyMomentsText'])
 assert.match(book,new RegExp(name),'Additive optional note missing: '+name);
assert.match(book,/id="bjBookText"/,'Freewriting editor must keep original ID');
assert.match(book,/id="bjBookPrompts"/,'Existing prompt mount must survive');
assert.match(book,/id="bjAtelierMount"/,'Existing decorations must survive');
assert.match(book,/id="bjBookDailyMini"/,'Existing mini habit tracker must survive');
assert.match(book,/savePendingPrompts\(\)\|\|!savePendingExtras\(\)/,'All draft edits must save before leaving');
assert.match(book,/journal\.saveReflectionInBook/,'Use canonical journal persistence');
assert.match(book,/journal\.getReflectionRewardPreview/,'Read-only preview in journal');
assert.match(journal,/function getReflectionRewardPreview/);
assert.match(journal,/nextThreshold:next.threshold/);
assert.match(journal,/independentTierAlreadyAwarded/);
assert.match(journal,/source: "journal-reflection-field-effort"/);
assert.match(journal,/threshold: 50/);
assert.match(journal,/threshold: 150/);
assert.match(journal,/threshold: 300/);
assert.match(journal,/threshold: 600/);
assert.match(journal,/threshold: 1000/);
assert.match(book,/dailySpreadV1/);
assert.doesNotMatch(book,/awardActivity\?\.\(/,'Book must not award directly');
assert.match(index,/journal-daily-spread-v1\.css\?v=0\.31\.4-journal-v12-preview1/);
assert.match(worker,/journal-daily-spread-v1\.css\?v=0\.31\.4-journal-v12-preview1/);
assert.match(spread,/--journal-calligraphy/);
assert.match(spread,/--journal-handwriting/);
assert.match(spread,/repeating-linear-gradient/);
assert.match(spread,/@media\(max-width:440px\)/);
for(const file of ['basic-floral-sprig-v1.svg','basic-moon-stars-v1.svg','basic-stationery-v1.svg']){
 const asset=read('assets/journal/'+file);
 assert.match(asset,/<svg /);assert.match(worker,new RegExp(file.replaceAll('.','\\.')));
}
assert.doesNotMatch(index,/data-view="tasks"/);
console.log('Soft Floral Journal V1 syntax, ledger boundaries, optional notes and PWA assets verified.');
