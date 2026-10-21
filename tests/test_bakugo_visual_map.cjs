/* Seven-sprite Bakugo consolidation: real SP_004 aliases and hero outfit safety. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const v=require('../bakugo-visual-map.js');
const root=path.join(__dirname,'..');
const expected=new Set(['neutral','annoyed','angry','proud','flustered','surprised','worried']);
assert.deepEqual(new Set(v.bases),expected);
function readPack(){
  const key=Buffer.from('LifeRPG-SP4-chapter-continuity-shield-v1');
  const payload=Buffer.from(fs.readFileSync(path.join(root,'content/SP_004.dat'),'utf8').trim(),'base64');
  for(let i=0;i<payload.length;i++)payload[i]^=key[i%key.length];
  return JSON.parse(payload.toString('utf8'));
}
const pack=readPack(),bakugo=pack.assets.characters.bakugo;
let checked=0;
for(const expression of Object.keys(bakugo.outfits.offduty)){
  const resolved=v.forItem(bakugo,{id:'bakugo',outfit:'offduty',expression});
  assert.ok(resolved,'Missing off-duty sprite '+expression);
  assert.ok(expected.has(resolved.emotion),'Unrecognized base emotion '+expression);
  assert.equal(resolved.src,v.paths[resolved.emotion]);checked++;
}
for(const expression of Object.keys(bakugo.outfits.hero)){
  assert.equal(v.forItem(bakugo,{id:'bakugo',outfit:'hero',expression}),null,'Hero outfit cannot use off-duty sprite: '+expression);
  const src=bakugo.outfits.hero[expression]?.src;
  if(src)assert.ok(fs.existsSync(path.join(root,src)),'Missing hero asset '+src);
}
for(const filename of Object.values(v.paths)){
  const buf=fs.readFileSync(path.join(root,filename));
  assert.ok(buf.length>90000,'Truncated asset '+filename);
  assert.equal(buf.subarray(0,4).toString(),'RIFF');
  assert.equal(buf.subarray(8,12).toString(),'WEBP');
}
const live=fs.readdirSync(root).filter(x=>x.endsWith('.js')||x.endsWith('.html'));
const stale=[];
for(const file of live){
  const c=fs.readFileSync(path.join(root,file),'utf8');
  const refs=[...c.matchAll(/assets\/story\/characters\/bakugo-([a-z-]+)\.png/g)]
    .map(m=>m[0]).filter(ref=>!ref.includes('bakugo-hero-'));
  if(refs.length)stale.push(file+': '+[...new Set(refs)].join(', '));
}
assert.deepEqual(stale,[],'Every live Bakugo image path must resolve');
assert.equal(v.emotionForExpression('happyProud'),'proud');
assert.equal(v.emotionForExpression('annoyedMild'),'annoyed');
assert.equal(v.emotionForExpression('caughtOffGuard'),'surprised');
assert.equal(v.emotionForExpression('casualConcerned'),'worried');
assert.equal(v.emotionForExpression('flusteredIntense'),'flustered');
assert.equal(v.emotionForExpression('angryShouting'),'angry');
assert.equal(v.forItem({defaultOutfit:'offduty'}, {id:'kirishima',expression:'angry'}),null);
console.log('Bakugo sprites: '+checked+' existing off-duty expressions map to seven new assets; hero outfits preserved');
