/* Living Companion 1.1 · authored English personality, not generative AI.
 * Read-only scene flavor, never calls relationship/reward/save APIs.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeRPGLivingPersonality=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const hash=value=>{let n=2166136261;for(const ch of String(value)){n=Math.imul(n^ch.charCodeAt(0),16777619);}return n>>>0;};
 const choose=(options,seed)=>options[hash(seed)%options.length];
 function context({now=new Date(),checkIn=null,offDuty=false}={}){
   const hour=now.getHours();
   if(offDuty)return 'off';
   if(checkIn?.gentle===true||checkIn?.energy==='fumes'||checkIn?.health?.dayCleared===true)return 'gentle';
   if(checkIn?.energy==='low'||checkIn?.sleep==='bad'||['high','overload'].includes(checkIn?.stress))return 'gentle';
   if(hour<11)return 'morning';
   if(hour>=18)return 'evening';
   return 'day';
 }
 const AMBIENT={
  mina:{
   morning:["Morning! Have you had breakfast yet? This is not a productivity test, by the way.",
            "Okay, today's vibe check: do we need a plan or a snack first?",
            "I vote we start the day with one nice thing. Yes, nice things count."],
   day:["Just checking in. I promise I have interests beyond reminding you about tasks.",
        "I was going to make a grand entrance, but honestly, hi!",
        "Some days are a quest. Some days are just laundry with better music."],
   evening:["Please tell me the evening has at least one fun thing in it.",
            "If the big plan is comfy clothes and a game, I respect the vision.",
            "Evening agenda: something you actually like. Wild concept, right?"],
   gentle:["No big pep talk from me today. Want something easy?",
           "You don't have to turn a tired day into a comeback montage.",
           "Today has soft-mode energy. That's allowed!"],
   off:["Adulting has left the chat. So, what's our fun plan?",
        "Work brain: off. Fun brain: absolutely optional but encouraged.",
        "You have permission to be gloriously unproductive. From me, obviously."]
  },
  kirishima:{
   morning:["Hey! Hope you've got a decent start today. If not, we can keep it small.",
            "Morning! One thing at a time sounds pretty good to me.",
            "Got breakfast sorted? No heroic plans required before that."],
   day:["I like that this place has room for the little stuff, too.",
        "Hey, you don't have to keep moving every minute, you know.",
        "A tiny win is nice. A decent break is nice, too."],
   evening:["You're allowed to be done for today. Just saying.",
            "Got something fun lined up? Or maybe a properly lazy evening?",
            "I think an evening with zero alarms sounds pretty great."],
   gentle:["Rough day? You don't have to explain it to me.",
           "How about making the next thing easier, not bigger?",
           "You can change your plan when your energy changes. It's fine."],
   off:["Hey, nice. There's a whole evening on the other side of work.",
        "No pressure to earn your downtime. It's already yours.",
        "If you wanna play something or just hang out, that counts as an evening."]
  },
  bakugo:{
   morning:["Eat something before you start declaring war on that list.",
            "Morning. What's actually doable today? That's the question.",
            "You don't need some dramatic launch sequence. Start where you are."],
   day:["Don't confuse being busy with doing something useful.",
        "You can leave a thing unfinished and still have a decent day.",
        "If it's not urgent, stop treating it like an emergency."],
   evening:["You're still staring at the list? It can wait.",
            "At some point you've gotta call it a day.",
            "A break isn't a strategy failure. Get over it."],
   gentle:["Don't pretend your energy's higher than it is.",
           "Less energy means a smaller plan. That's basic math.",
           "You don't need to prove anything to a checklist."],
   off:["Off the clock means off. Don't make me repeat it.",
        "Good. Leave the work where it is.",
        "Find something you actually wanna do. That's the entire assignment."]
  },
  luca:{
   morning:["Maybe I can make today smaller instead of trying to solve everything.",
            "First: breakfast. Second: figure out the rest.",
            "One realistic choice is better than a perfect imaginary schedule."],
   day:["There's space in my day for more than obligations.",
        "I can choose a small next step without planning the whole week.",
        "Taking a moment doesn't undo what I've already done."],
   evening:["I can stop planning and just have an evening.",
            "Maybe the nice thing on my list deserves first place now.",
            "I don't have to fill the entire evening."],
   gentle:["A gentler pace is still a real pace.",
           "I can change the plan without making it a failure.",
           "Rest belongs on the map too."],
   off:["The evening is mine again.",
        "That can wait. I have things I actually want to do.",
        "Being done for today is a decision, not a defeat."]
  }
 };
 const REACTIONS={
  mina:{
   habit:["There! One little thing off your mind. Nice!","Check! And now we can talk about literally anything else.","Tiny victory! No confetti cannon, I swear."],
   home:["Look at you, domestic side quest complete!","Home quest done! Please tell me there's a snack reward.","Nice! But we are not turning the whole house into a boss battle."],
   task:["Okay, that's one thing handled. Proud of the follow-through!","Done and out of your brain. Love that for you.","Task cleared! Sooo, do we get to do something fun now?"],
   game:["A gaming session? Excellent choice of evening entertainment.","Okay, gamer mode! Tell me that was a good one.","The fun list is getting some actual attention. Finally!"],
   duty:["Feierabend! Please tell me you aren't opening work again in five minutes.","Work's done. Now choose your own adventure.","Yesss. You get an evening!"]
  },
  kirishima:{
   habit:["Nice! That one's done. No need to make it a whole thing.","Little bit of follow-through. Good stuff.","Hey, that counts. And you can stop there if you want."],
   home:["That's one household thing taken care of. Sweet.","Nice work. House stuff adds up without needing a scoreboard.","Done! Maybe leave the rest for another time?"],
   task:["You finished it! Now what would feel good next?","Nice. You got that off your list.","That's handled. You can take a break, seriously."],
   game:["Hope that session was fun!","Now that sounds like a worthwhile use of your time.","Game time! What did you end up playing?"],
   duty:["Hey, there it is. Officially off duty.","Glad you're calling it. You deserve an evening.","Cool. We can leave tomorrow's stuff for tomorrow."]
  },
  bakugo:{
   habit:["Done. Don't overthink it.","There. One less thing.","Checked. Now quit staring at that box."],
   home:["Handled. Not every chore needs an encore.","Good. Now leave the rest alone if you're done.","One thing put away. That's enough of a report."],
   task:["Finished. Now stop replaying it in your head.","Good. That's dealt with.","Done. Don't go inventing another emergency."],
   game:["So you actually played something. Good.","Better than spending the whole evening looking at a task list.","Hope it was worth playing. That's the point."],
   duty:["About time. You're done.","Then stop working. That's what 'off duty' means.","Good. Work's staying put."]
  },
  luca:{
   habit:["One little thing taken care of.","I can count that and move on.","Done. No need to do everything today."],
   home:["That's one less household thing on my mind.","A little tidier. That feels good.","Handled. I don't need to finish the whole house."],
   task:["Finished. I can give myself a moment.","That task is done. The rest can wait.","One real thing complete, not five imaginary ones."],
   game:["Nice to actually make time for games.","I wanted to enjoy this, and I did.","Time for hobbies is well spent."],
   duty:["Work is over for today.","I can put my work brain away now.","I get my evening back."]
  }
 };
 function ambient(character,kind,seed='today'){
   const c=AMBIENT[character]||AMBIENT.luca;
   return choose(c[kind]||c.day,'ambient|'+character+'|'+kind+'|'+seed);
 }
 function reaction(character,type,seed='action'){
   const c=REACTIONS[character]||REACTIONS.luca;
   return choose(c[type]||c.habit,'reaction|'+character+'|'+type+'|'+seed);
 }
 function conversation(character,kind='day',hiddenLevel=0){
   const familiar=Number(hiddenLevel)>=4;
   const tired=kind==='gentle';
   if(character==='bakugo')return {
     intro:familiar?"Well? Something on your mind?":"You wanna talk? Fine. What's up?",
     choices:[
       {label:"Can I vent for a second?",reply:tired?"Go on. And don't make yourself fix it tonight.":"Then vent. Doesn't mean you gotta solve it this second."},
       {label:"Tell me something random.",reply:"Someone called instant noodles a 'cooking achievement' today. I'm still mad about it."},
       {label:"What if I don't do anything else?",reply:familiar?"Then don't. I can handle the silence.":"Then you don't. The world's not ending."}
     ]};
   if(character==='kirishima')return {
     intro:familiar?"Hey! Good timing. Wanna tell me what's going on?":"Hey, got a minute to chat?",
     choices:[
       {label:"Today felt like a lot.",reply:tired?"Then let's make the rest of it less. You get to choose.":"I'm listening. You don't have to make it sound neat."},
       {label:"Tell me something silly.",reply:"I just realized I've been using the same awful joke for years. Katsuki still hates it. I'm keeping it."},
       {label:"I don't really feel like talking.",reply:"That's totally okay. Quiet company counts."}
     ]};
   if(character==='mina')return {
     intro:familiar?"Babe! What's the emotional weather report?":"Ooh, hi! Wanna gossip or just hang?",
     choices:[
       {label:"I need to complain.",reply:tired?"Go for it. And no, we're not solving all of it before dinner.":"Okay, I'm seated. Tell me the ridiculous part first."},
       {label:"Distract me with something fun.",reply:"Important debate: cutest fictional creature, or coolest fictional outfit? I have opinions."},
       {label:"Let's do absolutely nothing.",reply:"Honestly? Iconic. Zero obligations. Full approval."}
     ]};
   return {intro:"What do I actually need right now?",choices:[
     {label:"A little encouragement.",reply:"I can be kind to myself without pretending today is easy."},
     {label:"Something fun.",reply:"Maybe a game, a book, or just something that's mine."},
     {label:"Quiet.",reply:"Then I'll enjoy a quiet minute."}
   ]};
 }
 return {context,ambient,reaction,conversation};
});
