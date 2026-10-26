/* Nine approved Kirishima off-duty originals: byte integrity, Story aliases and runtime smoke. */
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const visuals = require('../kirishima-visual-map.js');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const content = file => read(file).toString('utf8');
const names = ['neutral', 'soft', 'happy', 'laughing', 'excited', 'teasing', 'flustered', 'serious', 'surprised'];
const digests = {
  neutral: '5f2ab91c743d525e4e93e265b2995591c92e1853a62d442acc877db6e5e8e6f2',
  soft: '80d387a315578cfea187c408deaa74fa1193b74912eae10e79c3b0af7b93f8e3',
  happy: 'd5e66d937344e121852f2ed0b9d1d2f0eedc3c58ead20787a0f88df1af90cd0a',
  laughing: '5c5bf2260986b82c9901145d20f8b0f38cef67d09e08dd48d1e549130d9d0931',
  excited: 'cbe3cc636477c7c78ac45d4c02a6c2bf45cd955a493755542b2a905b4ba972cb',
  teasing: '17db6148c4cbde43bde91d3964e8264b564915725211fd08277985a41f26b355',
  flustered: 'a04fd9d9ad27c58889f4d75d7538ac3ee1b8e0cd25f395a6ce9c68c97bd51765',
  serious: 'bca80d87c06d83b299422755dd87bccb00e95bf55aed7f9ccbd70de27a248763',
  surprised: 'd59b0a23e60dcaf8b886307a26a1bd8844b189a775e41bc1fe87471304aab433'
};
const originals = {
  neutral: 'image-gen-1(20261022-204752).png',
  soft: 'image-gen-2(20261022-204755).png',
  happy: 'image-gen-7(7).png',
  laughing: 'image-gen-5(9).png',
  excited: 'image-gen-3(20261022-204800).png',
  teasing: 'image-gen-4(10).png',
  flustered: 'image-gen-6(7).png',
  serious: 'image-gen-9.png',
  surprised: 'image-gen-8(1).png'
};
assert.deepEqual(visuals.bases, names);
const manifest = JSON.parse(content('assets/story/characters/visual-manifest.json'));
const k = manifest.characters.kirishima;
assert.deepEqual(Object.keys(k.approved), names);
assert.deepEqual(k.approvedOriginals, originals);
for (const emotion of names) {
  const filename = `assets/story/characters/kirishima-offduty-${emotion}-v2.png`;
  assert.equal(visuals.paths[emotion], filename);
  assert.equal(k.approved[emotion], filename);
  const image = read(filename);
  assert.ok(image.length > 1_000_000, `Truncated original ${emotion}`);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(image.readUInt32BE(16), 1122);
  assert.equal(image.readUInt32BE(20), 1402);
  assert.equal(image[25], 6, `${emotion} must be RGBA, not an opaque RGB export`);
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'), digests[emotion],
    `${emotion} no longer matches the approved Library original byte-for-byte`);
}

// These are the real legacy expression keys in the sealed SP_004 story pack.
const key = Buffer.from('LifeRPG-SP4-chapter-continuity-shield-v1');
const packed = Buffer.from(content('content/SP_004.dat').trim(), 'base64');
for (let i = 0; i < packed.length; i++) packed[i] ^= key[i % key.length];
const story = JSON.parse(packed.toString('utf8'));
const character = story.assets.characters.kirishima;
assert.equal(character.defaultOutfit, 'offduty');
const expressions = Object.keys(character.outfits.offduty);
assert.ok(expressions.length >= 15, 'The legacy SP_004 Kirishima outfit changed unexpectedly');
for (const expression of expressions) {
  const result = visuals.forItem(character, {id: 'kirishima', outfit: 'offduty', expression});
  assert.ok(result && names.includes(result.emotion), `No mapping for ${expression}`);
  assert.equal(result.src, visuals.paths[result.emotion]);
  assert.ok(fs.existsSync(path.join(root, result.src)));
}
for (const [expression, emotion] of Object.entries({
  neutral: 'neutral', default: 'neutral', happy: 'happy', friendly: 'happy',
  soft: 'soft', warm: 'soft', laughing: 'laughing', excited: 'excited',
  teasing: 'teasing', confident: 'teasing', flustered: 'flustered',
  serious: 'serious', annoyed: 'serious', angry: 'serious', intense: 'serious',
  tired: 'soft', vulnerable: 'soft', surprised: 'surprised',
  caughtOffGuard: 'surprised', unknownFutureEmotion: 'neutral'
})) assert.equal(visuals.emotionForExpression(expression), emotion, expression);
assert.equal(visuals.forItem(character, {id: 'kirishima', outfit: 'hero', expression: 'happy'}), null,
  'An unapproved Kirishima Pro Hero set must never be simulated');
assert.equal(visuals.forItem(character, {id: 'bakugo', expression: 'happy'}), null);

// Browser-global smoke test for the classic script, independently of CommonJS.
const browser = {};
vm.runInNewContext(content('kirishima-visual-map.js'), browser);
assert.equal(browser.LifeRPGKirishimaVisuals.pathFor('caughtOffGuard'), visuals.paths.surprised);
assert.equal(browser.LifeRPGKirishimaVisuals.pathFor('angry'), visuals.paths.serious);

// Every consumer and the service worker must load the same new resolver generation.
const html = content('index.html');
const sw = content('service-worker.js');
const prefix = '0.31.4-kirishima-nine1';
assert.ok(html.indexOf('kirishima-visual-map.js?v=' + prefix) > 0);
assert.ok(html.indexOf('kirishima-visual-map.js?v=' + prefix) < html.indexOf('story-ui.js?v=' + prefix));
assert.match(sw, /const CACHE_NAME = "life-rpg-v0\.31\.4-ao3-bookmark3"/, 'Keep the newer AO3 Library PWA cache generation');
for (const file of ['kirishima-visual-map.js','story-ui.js','companion-moments.js',
  'living-world-v3.js','dreamscape.js','living-companion.js']) {
  assert.ok(sw.includes(`./${file}?v=${prefix}`), `PWA must refresh ${file}`);
  assert.ok(html.includes(`${file}?v=${prefix}`), `HTML must refresh ${file}`);
}
assert.ok(sw.includes('./pwa.js?v=0.31.4-ao3-bookmark3'));
assert.ok(html.includes('pwa.js?v=0.31.4-ao3-bookmark3'));
assert.ok(content('pwa.js').includes(`companion-moments-v2.js?v=${prefix}`));
for (const file of ['companion-moments.js', 'companion-moments-v2.js',
  'living-world-v3.js', 'dreamscape.js', 'living-companion.js']) {
  assert.ok(content(file).includes('LifeRPGKirishimaVisuals'), `${file} must use the resolver`);
}
assert.ok(content('story-ui.js').includes('LifeRPGKirishimaVisuals?.forItem'));
for (const emotion of names) {
  assert.ok(!sw.includes(`./${visuals.paths[emotion]}`), `${emotion} must load on demand, not on install`);
}
for (const old of ['kirishima-angry.png', 'kirishima-tired.png']) {
  assert.ok(fs.existsSync(path.join(root, 'assets/story/characters', old)), `Keep ${old} for rollback`);
}
for (const name of ['neutral', 'happy', 'serious']) {
  assert.ok(fs.existsSync(path.join(root, `assets/ui/thumbs/characters/kirishima-${name}.webp`)));
}
console.log(`Kirishima: ${names.length} original RGBA PNGs byte-verified, ${expressions.length} Story aliases mapped, browser/PWA/companion smoke checks passed`);
