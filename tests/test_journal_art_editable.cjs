'use strict';
/* Two-page illustrated Journal source and state regression.
 * Synthetic state only: no account access, no real Cloud/Firestore writes.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const cp=require('node:child_process'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),sw=read('service-worker.js');
const art=read('journal-art-editable.js'),css=read('journal-art-editable.css');
const book=read('bullet-journal-book.js'),sticker=read('bullet-journal-atelier.js');
const atlas=read('journal-art-background-v2.css');
for(const p of ['journal-art-editable.js','bullet-journal-book.js','bullet-journal-atelier.js','journal.js','service-worker.js','pwa.js']){
 const run=cp.spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});
 assert.equal(run.status,0,p+': '+run.stderr);
}
assert.ok(atlas.length>200000,'Original high-resolution illustration atlas must remain available');
assert.match(atlas,/data:image\/webp;base64/);
assert.match(index,/journal-art-background-v2\.css\?v=0\.31\.4-artpaper1/);
for(const name of ['journal-art-editable.js','journal-art-editable.css'])
 for(const file of [index,sw])assert.match(file,new RegExp(name.replace('.','\\.')+'\\?v=0\\.31\\.4-illustrated-layers3'));
assert.match(art,/getComputedStyle\(source\)\.backgroundImage/,'Must use original art asset, not recreate boxes as rectangles');
assert.match(art,/screenCrop/);
assert.match(art,/frame-crop/,'Each frame must be a moveable slice of the original watercolor');
assert.match(art,/style\.backgroundPosition/,'Cropping source art, not a flattened paper image');
assert.match(art,/data-bj-page/,'Two independent actual book pages must exist');
assert.match(css,/aspect-ratio:210 \/ 297/,'Both pages retain A4 proportions');
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'Open book, side by side');
assert.match(css,/background-image:var\(--bj-original-atlas\)/,'No small blurry thumbnails for the art');
assert.doesNotMatch(css,/\.bj-layer-original-frame\s*\{[^}]*border-radius:\s*1[246]px/s,
  'Do not replace original irregular illustrated frames with CSS rectangle cards');
assert.match(css,/\.bj-layer-shelf/,'In creative mode the other page is the palette');
assert.match(art,/journalPageLayoutV3/,'New layout namespace, preserving legacy progress');
assert.match(art,/app\.saveState\(\{source:"journal-illustrated-layout-v3",suppressUiRefresh:true\}\)/);
assert.match(art,/if\(before===undefined\)delete state\.journalPageLayoutV3/,'Rollback on failed layout save');
assert.match(art,/layout\.cards\[key\]\.visible=false/,'Box can be hidden without losing contents');
assert.match(art,/input\.__bjLayerOriginalParent/,'Use original canonical editor and restore it after move');
assert.match(art,/window\.LifeRPGJournal\?\.getReflectionRewardPreview/,'Read-only reward preview');
assert.doesNotMatch(art,/awardActivity|awardPendingReflectionRewards/,'No duplicate award pipeline');
assert.match(book,/savePendingPrompts\(\)\|\|!savePendingExtras\(\)/,'Persist drafts before changing page');
assert.match(sticker,/data-bj-page=/,'Decorations must use the new physical pages');
const state={
 journal:{entries:{"2026-11-18":{date:"2026-11-18",gratitude:"Saved original",bookNote:"My own thoughts"}}},
 journalAtelierV1:{schemaVersion:1,daily:{"2026-11-18":[{id:"vintage-sticker",assetKey:"paperclip-ink"}]}},
 journalBookLayoutV2:{daily:{"2026-11-18":{cards:{gratitude:{x:31,y:44}}}}},
 rewardLedger:{events:[{id:"existing-reward",coins:25,source:"journal-reflection-base"}]}
};
const before=JSON.stringify(state);
const environment={LifeRPGApp:{getState:()=>state,saveState:()=>true}};
vm.runInNewContext(art,{window:environment,console});
const api=environment.LifeRPGJournalArtSpread;
assert(api&&api._test,'Pure layout helpers must be available for regression');
const def=api._test.normalize(null);
assert.equal(Object.keys(def.cards).length,5);
assert.equal(def.cards.gratitude.side,"left");
assert.equal(def.cards.focusText.side,"right");
assert.equal(def.paper.left,"jasmine");
assert.equal(JSON.stringify(state),before,'Opening and normalizing the spread must not mutate any existing data');
const normalized=api._test.normalize({
 paper:{left:"plain",right:"premium-unpurchased"},
 cards:{bookNote:{visible:false,side:"left",x:500,y:-80},focusText:{x:37,y:44,side:"right"},unknown:{x:99}}
});
assert.equal(normalized.paper.left,"plain");
assert.equal(normalized.paper.right,"jasmine");
assert.equal(normalized.cards.bookNote.visible,false);
assert.equal(normalized.cards.bookNote.x,88);
assert.equal(normalized.cards.bookNote.y,10);
assert.equal(Object.keys(normalized.cards).length,5);
assert.equal(state.journal.entries["2026-11-18"].bookNote,"My own thoughts");
assert.equal(state.journalAtelierV1.daily["2026-11-18"][0].id,"vintage-sticker");
console.log("OK: original framed illustrations, two A4 pages, canonical save continuity, no ID/reward changes.");
