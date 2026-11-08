'use strict';
// Verifies that the artistic page is a *live editor*, not a static screenshot.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),book=read('bullet-journal-book.js'),art=read('journal-art-editable.js');
const css=read('journal-art-editable.css'),background=read('journal-art-background-v2.css');
const sw=read('service-worker.js');
for(const file of ['bullet-journal-book.js','journal-art-editable.js','journal.js','pwa.js','service-worker.js']){
 const run=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});
 assert.equal(run.status,0,file+': '+run.stderr);
}
assert.match(background,/data:image\/webp;base64,/);
assert.ok(background.length>200000,'Illustrated page background is unexpectedly missing');
assert.match(index,/journal-art-background-v2\.css\?v=0\.31\.4-artpaper1/);
assert.match(index,/journal-art-editable\.css\?v=0\.31\.4-artpaper1/);
assert.match(index,/journal-art-editable\.js\?v=0\.31\.4-artpaper1/);
assert.match(sw,/journal-art-background-v2\.css\?v=0\.31\.4-artpaper1/);
assert.match(sw,/journal-art-editable\.css\?v=0\.31\.4-artpaper1/);
assert.match(sw,/journal-art-editable\.js\?v=0\.31\.4-artpaper1/);
assert.match(book,/window\.LifeRPGJournalArtSpread\?\.init\?\.\(bookView\)/);
assert.match(book,/window\.LifeRPGJournalArtSpread\?\.render\?\.\(activeDay,view\)/);
assert.match(art,/target\.replaceChildren\(input\)/);
assert.match(art,/field==="gratitude" \? \(\$\(more,selector\)\|\|\$\(view,selector\)\)/);
assert.match(art,/data-bj-art="gratitude"|gratitude:"#bjBookPrompt-gratitude"/);
assert.match(art,/bookNote:"#bjBookText"/);
assert.match(art,/focusText:"#bjExtra-focusText"/);
assert.match(art,/intentionText:"#bjExtra-intentionText"/);
assert.match(art,/happyMomentsText:"#bjExtra-happyMomentsText"/);
assert.doesNotMatch(art,/awardActivity|awardPendingReflectionRewards/,'Art module must not pay rewards');
assert.match(art,/getReflectionRewardPreview/,'Only canonical read-only reward preview is allowed');
assert.match(css,/overflow-x:auto/,'Small screens must be horizontally scrollable');
assert.match(css,/\.bj-art-enabled > \.bj-book-page/,'Native book remains a fallback');
console.log('Art journal: image-backed genuine editors, canonical saved fields, PWA and fallback verified.');
