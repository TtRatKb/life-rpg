/* Bakugo Story Sprite consolidation · 2026-10-21
   Seven approved transparent off-duty sprites and seven matched Pro Hero sprites. Pure expression routing, no save state.
   Outfit-aware routing preserves Hero costume continuity without altering Story pack IDs.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LifeRPGBakugoVisuals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const prefix='assets/story/characters/bakugo-';
  const bases=Object.freeze(['neutral','annoyed','angry','proud','flustered','surprised','worried']);
  const paths=Object.freeze(Object.fromEntries(bases.map(id=>[id,prefix+id+'.webp'])));
  const heroPaths=Object.freeze(Object.fromEntries(bases.map(id=>[id,prefix+'hero-'+id+'.webp'])));
  const heroEmotionForExpression=(expression)=>{
    // The sealed Story pack uses legacy hero mood keys: none of those IDs need migration.
    const e=String(expression||'neutral').replace(/^hero[_-]?/i,'').toLowerCase();
    if(/surpris|startl|shock|alert|caught.?off.?guard/.test(e))return 'surprised';
    if(/fluster|embarrass|shy|tsundere|bashful/.test(e))return 'flustered';
    if(/angry|rage|furious|seething|sparking|explos|snarl/.test(e))return 'angry';
    if(/worr|concern|protect|vulnerab|tired|weary|pain|hurt|uneasy|sad|exhaust/.test(e))return 'worried';
    if(/annoy|irritat|jealous|disgust|unimpress|skeptic|scorn|brood/.test(e))return 'annoyed';
    if(/smug|cocky|proud|happy|amused|grin|laugh|smil|affection|playful|confiden|excited|determined|swagger/.test(e))return 'proud';
    return 'neutral';
  };
  const emotionForExpression=(expression)=>{
    const e=String(expression||'neutral').toLowerCase();
    if(/surpris|startl|caught.?off.?guard|shock/.test(e))return 'surprised';
    if(/fluster|embarrass|shy|tsundere|bashful/.test(e))return 'flustered';
    if(/angry|rage|feral|seething|sparking|shouting|clenched|furious/.test(e))return 'angry';
    if(/concern|worr|protect|vulnerab|tired|weary|pain|hurt|uneasy|sad|exhaust/.test(e))return 'worried';
    if(/annoy|irritat|disgust|scorn|skeptic|unimpress|deadpan|brood|away/.test(e))return 'annoyed';
    if(/smug|cocky|proud|happy|amused|grin|laugh|smil|affection|playful|confiden|excited|soft|determined|focused|challenge|swagger/.test(e))return 'proud';
    return 'neutral';
  };
  function forItem(character,item){
    if(!character||item?.id!=='bakugo')return null;
    const outfit=item?.outfit||character.defaultOutfit||'offduty';
    if(outfit==='hero'){
      const emotion=heroEmotionForExpression(item?.expression);
      return {src:heroPaths[emotion],emotion};
    }
    const emotion=emotionForExpression(item?.expression);
    return {src:paths[emotion],emotion};
  }
  return Object.freeze({bases,paths,heroPaths,emotionForExpression,heroEmotionForExpression,forItem});
});