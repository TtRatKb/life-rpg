const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const v=require('../bakugo-v3-assets.js');
const names=['angry','annoyed','proud','soft','flustered','worried','surprised'];
assert.deepEqual(Object.keys(v.paths).sort(),[...names].sort());
for(const n of names){
  assert.equal(v.key(n),n);
  const file=path.join(__dirname,'..',v.pathFor(n));
  assert.ok(fs.existsSync(file),'missing sprite '+n);
  const b=fs.readFileSync(file);
  assert.equal(b.toString('ascii',0,4),'RIFF','sprite should be WebP: '+n);
  assert.equal(b.toString('ascii',8,12),'WEBP','sprite must decode as WebP');
  assert.ok(b.length>15000 && b.length<600000,'sprite must be optimized and nonempty');
}
for(const [expr,expected] of [
 ['neutral','annoyed'],['heroNeutral','annoyed'],['heroFocused','angry'],
 ['angrySparking','angry'],['heroRage','angry'],['smugHandsPockets','proud'],
 ['happyGenuineGrin','proud'],['casualAffectionate','soft'],
 ['heroSurprised','surprised'],['caughtOffGuard','surprised'],
 ['casualConcerned','worried'],['heroTired','worried'],
 ['casualEmbarrassed','flustered'],['flusteredIntense','flustered']
])assert.equal(v.key(expr),expected,expr);
assert.ok(v.resolve('heroRage').src.endsWith('/bakugo-angry.webp'));
console.log('Bakugo V3: seven real WebP sprite assets and emotion routes passed.');
