'use strict';
// Synthetic journal-layout regressions: no browser profile, private save, Firebase
// connection, Skill Points, rewards or external art copied into this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html'),book=read('bullet-journal-book.js'),art=read('journal-art-editable.js');
const css=read('journal-art-editable.css'),sw=read('service-worker.js');
for(const file of ['bullet-journal-book.js','journal-art-editable.js','journal.js','pwa.js','service-worker.js']){
 const run=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
 assert.equal(run.status,0,file+': '+run.stderr);
}
assert.doesNotMatch(index,/href="journal-art-background-v2\.css/,'Old image already containing boxes must not be used as a background');
assert.doesNotMatch(sw,/journal-art-background-v2\.css\?/,'Old monolithic page must not be downloaded into offline cache');
assert.match(index,/journal-art-editable\.css\?v=0\.31\.4-journal-pages3/);
assert.match(index,/journal-art-editable\.js\?v=0\.31\.4-journal-pages3/);
assert.match(sw,/journal-art-editable\.css\?v=0\.31\.4-journal-pages3/);
assert.match(sw,/journal-art-editable\.js\?v=0\.31\.4-journal-pages3/);
assert.match(book,/window\.LifeRPGJournalArtSpread\?\.init\?\.\(bookView\)/);
assert.match(book,/window\.LifeRPGJournalArtSpread\?\.render\?\.\(activeDay,view\)/);
assert.match(book,/savePendingPrompts\(\)\|\|!savePendingExtras\(\)/,'Flush canonical text before editing layout');
for(const field of ['gratitude','focusText','intentionText','happyMomentsText','bookNote']){
 assert.match(art,new RegExp('key:"'+field+'"'),'Original writing field must be on cards: '+field);
}
assert.match(art,/journalBookLayoutV2/,'Positions must be stored separately from canonical journal entries');
assert.match(art,/schemaVersion:2,daily/,'Versioned per-day layouts');
assert.match(art,/input\.readOnly=creative/,'Writing fields cannot be accidentally edited while dragging');
assert.match(art,/app\.saveState\(\{source:"journal-book-layout-v2",suppressUiRefresh:true\}\)/);
assert.match(art,/if\(previous===undefined\)delete state\.journalBookLayoutV2/,'Failed write needs rollback');
assert.match(art,/layout\.cards\[key\]\.visible=false/,'Hiding must be reversible, not delete text');
assert.match(art,/moveOriginalNodes/,'Old canonical editors must be moved, not mirrored');
assert.match(art,/if\(newer&&newer!==input\)input\.remove\(\)/,'Rebuilt prompts may not leave duplicate stale editor IDs');
assert.doesNotMatch(art,/awardActivity|awardPendingReflectionRewards/,'Layout code is never allowed to issue rewards');
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'Two physical pages side by side');
assert.match(css,/aspect-ratio:210 \/ 297/,'Keep each paper A4 proportioned');
assert.match(css,/repeating-linear-gradient/,'Lines belong to the card, not to the paper image');
assert.match(css,/overflow-x:auto/,'Small screens may pan without squashing paper');
assert.match(css,/\.bj-art-illustration/,'Illustrations are separate transparent elements');
assert.match(css,/\.bj-art-creative/,'A deliberate creative mode exists');
assert.match(css,/\.bj-art-sidebar/,'Page element library replaces the other book page');
assert.match(css,/\.bj-art-drag-handle/,'Cards may be moved by their own handle');

const synthetic={
 journal:{entries:{"2026-11-18":{date:"2026-11-18",bookNote:"Keep every word",gratitude:"Saved forever"}}},
 journalAtelierV1:{schemaVersion:1,daily:{"2026-11-18":[{id:"old-sticker",assetKey:"paperclip-ink"}]}},
 rewardLedger:{events:[{id:"old-reward",coins:10}]}
};
const before=JSON.stringify(synthetic);
const fake={LifeRPGApp:{getState:()=>synthetic,saveState:()=>true}};
vm.runInNewContext(art,{window:fake,document:{},console});
const api=fake.LifeRPGJournalArtSpread;
assert(api&&api._test,'Module must expose pure layout normalization');
const empty=api._test.read("2026-11-18");
assert.equal(empty.paper.left,"jasmine");
assert.equal(empty.paper.right,"jasmine");
assert.equal(Object.keys(empty.cards).length,5);
assert.equal(empty.cards.bookNote.visible,true);
assert.equal(JSON.stringify(synthetic),before,'Opening a journal must never mutate old saves or rewards');
const normalized=api._test.normalize({
 paper:{left:"plain",right:"not-purchased"},
 cards:{bookNote:{visible:false,side:"left",x:300,y:-20},focusText:{visible:true,side:"right",x:42,y:41},
   evil:{visible:true,x:80}}
});
assert.equal(normalized.paper.left,"plain");
assert.equal(normalized.paper.right,"jasmine",'Unrecognized/unpurchased background must not be shown');
assert.equal(normalized.cards.bookNote.visible,false,'Hidden box stays in saved layout');
assert.equal(normalized.cards.bookNote.side,"left");
assert.equal(normalized.cards.bookNote.x,90,'Untrusted positions must be clamped');
assert.equal(normalized.cards.bookNote.y,8);
assert.equal(Object.keys(normalized.cards).length,5,'Unknown injected field keys not rendered');
assert.equal(synthetic.journal.entries["2026-11-18"].bookNote,"Keep every word");
assert.equal(synthetic.journalAtelierV1.daily["2026-11-18"][0].id,"old-sticker");
console.log("OK: modular two-page Journal, five canonical fields, non-destructive layouts, preserved rewards/old stickers, PWA.");
