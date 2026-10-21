const assert=require('node:assert/strict');
const p=require('../living-companion-personality.js');
for(const name of ['mina','kirishima','bakugo','luca']){
 for(const kind of ['morning','day','evening','gentle','off']){
  const first=p.ambient(name,kind,'2026-10-21');
  assert.equal(typeof first,'string');
  assert.ok(first.length>9);
  assert.equal(first,p.ambient(name,kind,'2026-10-21'));
 }
 for(const type of ['habit','home','task','game','duty'])assert.ok(p.reaction(name,type,'sample').length>9);
 const story=p.conversation(name,'day',0);
 assert.ok(story.intro.length>9);
 assert.equal(story.choices.length,3);
 story.choices.forEach(choice=>{assert.ok(choice.label.length>3);assert.ok(choice.reply.length>9);});
}
assert.equal(p.context({now:new Date('2026-10-21T08:00:00')}),'morning');
assert.equal(p.context({now:new Date('2026-10-21T12:00:00'),offDuty:true}),'off');
assert.equal(p.context({now:new Date('2026-10-21T12:00:00'),checkIn:{energy:'fumes'}}),'gentle');
assert.equal(p.context({now:new Date('2026-10-21T22:00:00'),checkIn:{sleep:'bad'}}),'gentle');
assert.notEqual(p.conversation('bakugo','day',1).intro,p.conversation('bakugo','day',5).intro);
assert.ok(!p.ambient('mina','off','2026-10-21').includes('XP'));
console.log('Personality: deterministic daily banter, context, familiar-safe dialogue and reward-free replies passed');
