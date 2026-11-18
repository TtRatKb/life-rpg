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
const layers=read('journal-canva-isolated-layers.js');
const original=read('assets/journal/source/jasmine-canva-magic-layers.svg');
for(const p of ['journal-art-editable.js','bullet-journal-book.js','bullet-journal-atelier.js','journal.js','service-worker.js','pwa.js']){
 const run=cp.spawnSync(process.execPath,['--check',path.join(root,p)],{encoding:'utf8'});
 assert.equal(run.status,0,p+': '+run.stderr);
}
assert.ok(original.length>3000000,'Complete original Canva SVG must be bundled locally');
assert.match(original,/<mask\b/,'Actual transparency masks preserved');
assert.match(original,/<clipPath\b/,'Individual element clip paths preserved');
assert.match(original,/data:image\/png;base64/,'Original image data retained');
assert.ok(layers.length<15000,'Loader is only a thin manifest, no guessed crop bitmaps');
assert.match(layers,/jasmine-canva-magic-layers\.svg/);
assert.match(layers,/DOMParser/);
assert.match(layers,/createObjectURL/);
assert.doesNotMatch(layers,/data:image\/webp;base64/,'Rejected heuristic crop assets removed');
assert.match(layers,/"frame:gratitude"/);
assert.match(layers,/"frame:bookNote"/);
assert.match(layers,/"paper:clean"/);
assert.match(index,/journal-canva-isolated-layers\.js\?v=0\.31\.4-svg-master2/);
assert.match(sw,/assets\/journal\/source\/jasmine-canva-magic-layers\.svg/);
assert.doesNotMatch(index,/href="journal-art-background-v2\.css/,'Do not load the rejected screenshot image atlas');
for(const name of ['journal-art-editable.js','journal-art-editable.css','journal-canva-isolated-layers.js'])
 for(const file of [index,sw])assert.match(file,new RegExp(name.replace('.','\\.')+'\\?v=0\\.31\\.4-svg-master2'));
assert.match(art,/LifeRPGJournalCanvasLayers/,'New art comes from actual Canva separated element assets');
assert.doesNotMatch(art,/extractTransparentOriginals|screenCrop|const masks=/,'Rejected screenshot segmentation must be removed entirely');
assert.match(art,/frame-crop/,'Transparent original-painted frame is independently movable');
assert.match(art,/backgroundPosition="center center"/,'Each isolated image has its own full transparent canvas');
assert.match(art,/data-bj-page/,'Two independent actual book pages must exist');
assert.match(css,/aspect-ratio:210 \/ 297/,'Both pages retain A4 proportions');
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'Open book, side by side');
assert.match(css,/background-image:var\(--bj-clean-paper\)/,'Each page has freshly cleaned original parchment');
assert.match(css,/mask-image:none!important/,'No radial crop clipping may cut off original flowers');
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
environment.LifeRPGJournalCanvasLayers={assets:{},ready:Promise.resolve(null)};
vm.runInNewContext(art,{window:environment,console});
const api=environment.LifeRPGJournalArtSpread;
assert(api&&api._test,'Pure layout helpers must be available for regression');
const def=api._test.normalize(null);
assert.equal(Object.keys(def.cards).length,5);
assert.equal(def.cards.gratitude.side,"left");
assert.equal(def.cards.focusText.side,"right");
assert.equal(def.cards.gratitude.mode,"plain",'Original boxes open as blank paper');
assert.equal(def.cards.intentionText.mode,"checklist",'Today I will retains real checklist behavior');
assert.equal(def.cards.focusText.scale,1.07);
assert.equal(def.cards.gratitude.x,46);
assert.equal(def.cards.gratitude.y,35);
assert.equal(def.cards.gratitude.rotation,-1.8);
assert.equal(def.cards.intentionText.rotation,1.4);
assert.equal(def.cards.intentionText.x,29);
assert.equal(def.cards.intentionText.y,69);
assert.equal(def.cards.intentionText.scale,.70);
assert.equal(def.cards.happyMomentsText.side,"left");
assert.equal(def.cards.happyMomentsText.x,77);
assert.equal(def.cards.happyMomentsText.y,75);
assert.equal(def.cards.happyMomentsText.scale,.82);
assert.ok(Math.abs(def.cards.happyMomentsText.y-def.cards.intentionText.y)<10,
 'Two lower-left-page frames sit next to one another, not stacked as a vertical list');
assert.equal(def.cards.bookNote.side,"right");
assert.equal(def.cards.bookNote.rotation,-1.5);
assert.equal(Object.values(def.cards).filter(c=>c.side==="left").length,3);
assert.equal(Object.values(def.cards).filter(c=>c.side==="right").length,2);
assert.equal(api._test.clampAngle(99),8);
assert.equal(api._test.clampAngle(-99),-8);
assert.match(art,/data-bj-card-angle/,'Creative mode lets the user vary the original artistic tilt');
assert.match(art,/action==="default"/,'Suggested layout can be restored without changing journal text');
assert.equal(api._test.clampScale(.05),.45,'Minimum size prevents unusable tiny writing boxes');
assert.equal(api._test.clampScale(10),1.55,'Maximum size is bounded');
assert.equal(api._test.compactLines(["hello","","world",""]),["hello","","world"].join("\n"));
assert.match(art,/makeLineRow/,'One actual DOM input for each writing line');
assert.match(art,/source.dispatchEvent\(new Event\("input"/,'Rows must update original canonical form through the existing autosave');
assert.match(art,/data-bj-resize/,'User can drag a resize handle');
assert.match(art,/data-bj-card-scale/,'Slider allows precise resizing');
assert.match(art,/sourceAssets\[el\?\.dataset\?\.bjSprite\]/,'Every frame is sourced from its real isolated transparent graphic');
assert.match(css,/\.bj-layer-line-row/,'Real separate line geometry, not a fake textarea repeating image');
assert.match(css,/\.bj-layer-source-hidden/,'Canonical textarea is preserved but hidden in lined mode');
assert.match(css,/\.bj-layer-resize/,'Resizing controls must be visible only in creative mode');
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
assert.equal(normalized.cards.bookNote.rotation,0,'Old layouts without saved angles remain unrotated');
assert.equal(normalized.cards.focusText.x,37);
assert.equal(normalized.cards.focusText.y,44);
assert.equal(normalized.cards.focusText.rotation,0);
assert.equal(normalized.cards.focusText.scale,1,'Legacy positions and sizes are not silently overwritten');
assert.equal(Object.keys(normalized.cards).length,5);
const withExtra=api._test.normalize({cards:{
  "custom-test-1":{template:"focusText",custom:true,side:"left",x:40,y:60,scale:.65,
                   mode:"lined",rotation:-4,checks:[],visible:true,text:"Never overwrite this new text"},
  "custom-malicious":{template:"not-a-template",text:"ignore"}
}});
assert.equal(Object.keys(withExtra.cards).length,6);
assert.equal(withExtra.cards["custom-test-1"].text,"Never overwrite this new text");
assert.equal(withExtra.cards["custom-test-1"].template,"focusText");
assert.equal(withExtra.cards["custom-test-1"].rotation,-4);
assert.equal(withExtra.cards.focusText.custom,undefined);
assert.match(art,/createExtraCard/,'Users must be able to place additional painted boxes side by side');
assert.match(art,/queueExtraText/,'Additional free-text boxes save independently');
assert.match(art,/customSaveTimer/,'Custom text drafts are flushed before changing day');

assert.equal(state.journal.entries["2026-11-18"].bookNote,"My own thoughts");
assert.equal(state.journalAtelierV1.daily["2026-11-18"][0].id,"vintage-sticker");
console.log("OK: original framed illustrations, two A4 pages, canonical save continuity, no ID/reward changes.");
