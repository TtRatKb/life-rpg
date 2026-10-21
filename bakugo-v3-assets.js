/* Bakugo V3 · exactly seven standalone transparent story sprites.
 * Approved as the new visual family in Oct 2026. Historical outfits/expressions
 * in SP_004 are retained as story metadata; every runtime Bakugo stage/portrait
 * resolves here so deleted PNG variants cannot be displayed by accident.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LifeRPGBakugoSpriteV3=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const base='assets/story/characters/bakugo-v3/';
  const paths=Object.freeze({
    angry:base+'bakugo-angry.webp',
    annoyed:base+'bakugo-annoyed.webp',
    proud:base+'bakugo-proud.webp',
    soft:base+'bakugo-soft.webp',
    flustered:base+'bakugo-flustered.webp',
    worried:base+'bakugo-worried.webp',
    surprised:base+'bakugo-surprised.webp'
  });
  function key(expression='neutral'){
    const e=String(expression||'neutral').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(/surpris|startl|caughtoffguard|shock|alert/.test(e))return 'surprised';
    if(/fluster|embarrass|tsundere|shy|blush|awkward/.test(e))return 'flustered';
    if(/smug|cocky|proud|challenge|swagger|triumph|happy|laugh|grin|playful|amused|excited|confiden/.test(e))return 'proud';
    if(/soft|affection|warm|tender|gentle|relaxed|smil|fond/.test(e))return 'soft';
    if(/worr|concern|protect|vulnerab|hurt|pain|sad|jealous|tired|drain|uneasy/.test(e))return 'worried';
    if(/angry|rage|furious|seeth|spark|shout|disgust|determin|focus|intens/.test(e))return 'angry';
    return 'annoyed';
  }
  function pathFor(expression){return paths[key(expression)];}
  function resolve(expression){return {src:pathFor(expression)};}
  return Object.freeze({paths,key,pathFor,resolve});
});
