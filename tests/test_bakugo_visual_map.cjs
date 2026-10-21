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
let heroChecked=0;
for(const expression of Object.keys(bakugo.outfits.hero)){
  const resolved=v.forItem(bakugo,{id:'bakugo',outfit:'hero',expression});
  assert.ok(resolved,'Missing Pro Hero sprite mapping '+expression);
  assert.ok(expected.has(resolved.emotion),'Invalid hero emotion '+expression);
  assert.equal(resolved.src,v.heroPaths[resolved.emotion]);
  assert.notEqual(resolved.src,v.paths[resolved.emotion],'Hero costume must not resolve to off-duty tank top');
  heroChecked++;
}
assert.ok(heroChecked>=20,'Expected original extensive hero-costume pack');
for(const filename of [...Object.values(v.paths),...Object.values(v.heroPaths)]){
  const buf=fs.readFileSync(path.join(root,filename));
  assert.ok(buf.length>90000,'Truncated asset '+filename);
  assert.equal(buf.subarray(0,4).toString(),'RIFF');
  assert.equal(buf.subarray(8,12).toString(),'WEBP');
}
const live=fs.readdirSync(root).filter(x=>x.endsWith('.js')||x.endsWith('.html'));
const stale=[];
for(const file of live){
  const c=fs.readFileSync(path.join(root,file),'utf8');
  const refs=[...c.matchAll(/assets\/story\/characters\/bakugo-([a-z-]+)\.png/g)].map(m=>m[0]);
  if(refs.length)stale.push(file+': '+[...new Set(refs)].join(', '));
}
assert.deepEqual(stale,[],'Every live Bakugo image path must resolve');
assert.equal(v.heroEmotionForExpression('heroRage'),'angry');
assert.equal(v.heroEmotionForExpression('heroSmug'),'proud');
assert.equal(v.heroEmotionForExpression('heroSurprised'),'surprised');
assert.equal(v.heroEmotionForExpression('heroEmbarrassed'),'flustered');
assert.equal(v.heroEmotionForExpression('heroConcerned'),'worried');
assert.equal(v.heroEmotionForExpression('heroAnnoyed'),'annoyed');
assert.equal(v.heroEmotionForExpression('heroRelaxed'),'neutral');
assert.equal(v.emotionForExpression('happyProud'),'proud');
assert.equal(v.emotionForExpression('annoyedMild'),'annoyed');
assert.equal(v.emotionForExpression('caughtOffGuard'),'surprised');
assert.equal(v.emotionForExpression('casualConcerned'),'worried');
assert.equal(v.emotionForExpression('flusteredIntense'),'flustered');
assert.equal(v.emotionForExpression('angryShouting'),'angry');
assert.equal(v.forItem({defaultOutfit:'offduty'}, {id:'kirishima',expression:'angry'}),null);
console.log('Bakugo sprites: '+checked+' off-duty + '+heroChecked+' legacy hero expressions map to 14 approved cutouts; no stale runtime paths');
