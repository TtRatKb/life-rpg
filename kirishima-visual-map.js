/* Kirishima off-duty visual palette · 2026-10-23
   Nine approved standalone transparent PNGs. Pure rendering lookup; Story IDs,
   choices, flags and saves remain in the original sealed story pack.
*/
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LifeRPGKirishimaVisuals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const prefix = 'assets/story/characters/kirishima-offduty-';
  const bases = Object.freeze([
    'neutral', 'soft', 'happy', 'laughing', 'excited',
    'teasing', 'flustered', 'serious', 'surprised'
  ]);
  const paths = Object.freeze(Object.fromEntries(
    bases.map(emotion => [emotion, `${prefix}${emotion}-v2.png`])
  ));

  function emotionForExpression(expression) {
    const e = String(expression || 'neutral').toLowerCase().replace(/^casual[_-]?/, '');
    if (/surpris|startl|shock|caught.?off.?guard|astonish/.test(e)) return 'surprised';
    if (/fluster|embarrass|shy|bashful|blush/.test(e)) return 'flustered';
    if (/laugh|chuckl|giggl|crack.?up|hilarious/.test(e)) return 'laughing';
    if (/excit|enthusi|thrill|pumped|hype|eager|energiz/.test(e)) return 'excited';
    if (/teas|smug|playful|confiden|cheeky|mischie|flirt/.test(e)) return 'teasing';
    if (/serious|stern|annoy|angry|intense|furious|irritat|determined|focus|concerned|protect/.test(e)) return 'serious';
    if (/soft|fond|warm|gentle|tender|vulnerab|tired|exhaust|weary|sad|worried|relief|comfort/.test(e)) return 'soft';
    if (/happy|friend|smil|grin|pleas|cheer|amused/.test(e)) return 'happy';
    return 'neutral';
  }

  function pathFor(expression) {
    return paths[emotionForExpression(expression)];
  }

  function forItem(character, item) {
    if (!character || item?.id !== 'kirishima') return null;
    const outfit = item.outfit || character.defaultOutfit || 'offduty';
    // No new Kirishima Pro Hero costume has been approved or produced.
    if (outfit !== 'offduty') return null;
    const emotion = emotionForExpression(item.expression);
    return {src: paths[emotion], emotion};
  }

  return Object.freeze({bases, paths, emotionForExpression, pathFor, forItem});
});
