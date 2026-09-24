(() => {
  "use strict";
  if (window.LifeRPGCompanionMoments) return;
  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  if (!app?.getState || !app?.saveState || !graph?.isContentUnlocked) return;
  const VERSION = "0.31.4da";
  // These are optional canon-compatible side moments, NOT dream scenes or Main Story chapters.
  // No Story Energy, relationship XP, affinity, chapter flags, or new time/reward event is written.
  // None relies on unseen future plot information. Every moment follows the shared-apartment move.
  const BG = {
    Work:"assets/story/backgrounds/time/shared_apartment_night.webp",
    Knowledge:"assets/story/backgrounds/time/shared_apartment_day.webp",
    Japanese:"assets/story/backgrounds/time/shared_apartment_sunset.webp",
    Health:"assets/story/backgrounds/time/shared_apartment_day.webp",
    Recovery:"assets/story/backgrounds/time/shared_apartment_night.webp",
    Home:"assets/story/backgrounds/time/shared_apartment_kitchen_day.webp",
    Hobbies:"assets/story/backgrounds/time/shared_apartment_night.webp"
  };
  const SPRITES = {
    bakugo:{neutral:"assets/story/characters/bakugo-neutral.png",soft:"assets/story/characters/bakugo-soft.png",smug:"assets/story/characters/bakugo-smug.png"},
    kirishima:{neutral:"assets/story/characters/kirishima-neutral.png",soft:"assets/story/characters/kirishima-happy.png",smug:"assets/story/characters/kirishima-teasing.png"}
  };
  const n = (text) => ({speaker:"luca",text});
  const say = (speaker,text,expression="neutral") => ({speaker,text,expression});
  const q = (prompt,options) => ({speaker:"luca",text:prompt,choices:options.map(([label,reply])=>({label,reply}))});
  // Each content node contains two individual moments plus a third shared-household
  // moment earned by reading both. The two private conversations are not shared automatically.
  const EPISODES = [
    {
      id:"work-k",realm:"Work",focus:"bakugo",title:"The Last Tab",beats:[
        n("I make it all the way home before realizing I am still thinking in lesson-plan bullet points. My laptop wakes up at the kitchen table. So does Katsuki's disapproval."),
        say("bakugo","You eating, or are you planning to annotate that screen until tomorrow?"),
        n("He sets a plate beside the trackpad without looking particularly pleased about the situation. It is exactly the sort of food I would have forgotten to make."),
        say("bakugo","Don't start with 'just five minutes.' I've heard that one."),
        q("I close the laptop halfway. How do I explain the last unfinished bit?",[["It's one stubborn detail, not the whole lesson.","One detail, huh? Then write down what it is. Tomorrow's problem."],["I don't want to lose the thread.","Then leave yourself a note. Keeping the damn machine open isn't a memory system."],["I was hoping the screen would make dinner for me.","Wouldn't trust its cooking. Move over."]]),
        n("He nudges a pen toward me. One sentence on a sticky note. The laptop clicks shut. He slides the plate an inch closer, as though winning the argument was never the important part."),
        say("bakugo","Eat while it's hot.","soft"),
        n("He does not ask for a report on how productive I was. That absence feels unexpectedly generous.")
      ]
    },
    {
      id:"work-e",realm:"Work",focus:"kirishima",title:"A Very Small Victory",beats:[
        n("A lesson that looked tidy on paper behaved nothing like I expected. Eijiro finds me staring at my planner, circling the same line."),
        say("kirishima","You look like you're grading yourself harder than the kids. Want to tell me the short version?"),
        n("I explain the bit that collapsed, then the small moment when one student finally understood. He catches the second part immediately."),
        say("kirishima","Wait. They got it because you tried another way? That's not nothing."),
        q("What do I tell him I want to remember?",[["The part that worked, even if it was small.","Then that goes in the win column. I don't make the rules. Actually, I do, for this column."],["That the lesson doesn't have to look pretty to matter.","I like that. Real work looks messy from the inside."],["That I might ask someone for help next time.","That's a plan, not a defeat. Want me to remind you tomorrow?"]]),
        n("He adds a tiny star beside the note in my planner. I laugh at the theatrics. He looks pleased with himself anyway."),
        say("kirishima","There. Evidence. You can argue with me; you can't argue with the star.","soft"),
        n("The rest of the day remains complicated. It is easier to let one piece of it be good.")
      ]
    },
    {
      id:"work-b",realm:"Work",focus:"both",title:"The Off-Duty Agreement",beats:[
        n("The dining table has become a disputed border between three kinds of paperwork. Eijiro's agency notes, my school materials, and Katsuki's very determined dinner plates."),
        say("bakugo","This table has a purpose. It's not a filing cabinet."),
        say("kirishima","He says, while stacking his own files behind the rice cooker.","smug"),
        n("Katsuki moves the stack. I try not to smile, which is impossible because Eijiro has already seen it."),
        q("I propose a household treaty:",[["Everyone gets ten minutes to finish and then we eat.","A timer? Fine. But that includes you."],["No work talk during dinner unless someone asks.","Deal. I vote we talk about literally anything else."],["The rice cooker gets custody of the paperwork.","The rice cooker has better boundaries than all three of us."]]),
        say("kirishima","Look at us. Three adults negotiating a table. That's kind of nice.","soft"),
        say("bakugo","You call everything nice. Pass the bowls."),
        n("We clear a space that is just big enough. Somehow it feels like a more durable arrangement than any of our schedules.")
      ]
    },
    {
      id:"knowledge-k",realm:"Knowledge",focus:"bakugo",title:"Not the Answer",beats:[
        n("A puzzle sits between us on the low table. Katsuki has figured out something I haven't, and he is being obnoxiously quiet about it."),
        say("bakugo","You're staring at the wrong part."),
        n("I point out that this is not a hint. He rotates the page a quarter turn, then takes his hand away instead of solving it for me."),
        say("bakugo","Now look at what can't go there."),
        q("I consider my next move.",[["Talk through the constraint aloud.","There. You said it yourself. Keep going."],["Ask for a clue, not the answer.","Fine. Two possibilities. Only one fits the bottom row."],["Challenge him to solve a second puzzle at the same time.","You're on. Don't complain when I win."]]),
        n("A few minutes later, the next square falls into place. His expression shifts almost imperceptibly: not surprised that I got it, but satisfied that I did."),
        say("bakugo","Told you the answer wasn't the useful bit.","smug"),
        n("He leaves the pencil on my side of the table.")
      ]
    },
    {
      id:"knowledge-e",realm:"Knowledge",focus:"kirishima",title:"The Wrong Guess",beats:[
        n("Eijiro announces he has found the pattern. His confidence lasts precisely three cells before the grid contradicts him."),
        say("kirishima","Okay. Incredible news: I am very wrong.","smug"),
        n("He crosses nothing out yet. Instead he asks where the idea stopped working, as if the mistake belongs to both of us to investigate."),
        say("kirishima","I think I jumped from 'maybe' to 'obviously' somewhere around here."),
        q("I choose how to investigate.",[["Try a counterexample together.","Oh! That's the one that breaks it. Nice catch."],["Make a tiny list of what we actually know.","Way less glamorous. Way more useful."],["Let him argue for his theory one last time.","Thank you for hearing the defense. The defense has no evidence."]]),
        n("The solution arrives in pieces, interrupted by bad jokes. I don't mind the wrong turn anymore; it gave us something to work out together."),
        say("kirishima","Next one, I get to be confidently right.","soft"),
        n("I hand him the next page, which is apparently an answer.")
      ]
    },
    {
      id:"knowledge-b",realm:"Knowledge",focus:"both",title:"Three Different Strategies",beats:[
        n("One puzzle. Three methods. Katsuki has made a neat grid, Eijiro is drawing arrows, and I have gone straight to testing an absurd possibility."),
        say("bakugo","Your arrows cross the numbers."),
        say("kirishima","And your numbers look like they filed taxes. Let her try the absurd one."),
        n("I test it. It fails spectacularly, which rules out half the page. Katsuki leans forward despite himself."),
        q("Whose method do I borrow next?",[["Katsuki's careful elimination.","Finally. Some structure."],["Eijiro's picture of the relationships.","Yes! Visual chaos vindicated."],["Keep combining all three.","That's not a method. ...Actually, keep going."]]),
        n("When the answer emerges, none of us can honestly claim sole credit."),
        say("kirishima","We should frame this. Our first collaborative disagreement.","smug"),
        say("bakugo","We're not framing a puzzle sheet."),
        n("He straightens the corner before handing it back to me.")
      ]
    },
    {
      id:"japanese-k",realm:"Japanese",focus:"bakugo",title:"Say It Again",beats:[
        n("I rehearse a perfectly ordinary Japanese sentence under my breath. Katsuki hears the fourth repetition and looks up from the counter."),
        say("bakugo","You trying to ask me something, or practicing for the wall?"),
        n("I admit I keep losing the rhythm halfway through. He repeats the phrase at a natural pace, then again slowly, without making a performance of it."),
        say("bakugo","Don't copy my volume. Copy where I pause."),
        q("What kind of practice would actually help?",[["Ask him to say it once more at normal speed.","Listen first. Then try."],["Ask what the phrase sounds like in a casual conversation.","Depends who you're talking to. With me? Like this."],["Try it and let him correct only the rhythm.","Better. The end of the sentence, though. Again."]]),
        n("The sentence finally leaves my mouth without stopping to check every piece. He nods once and goes back to what he was doing."),
        say("bakugo","There. You knew it.","soft"),
        n("His casual certainty is more encouraging than an entire motivational speech.")
      ]
    },
    {
      id:"japanese-e",realm:"Japanese",focus:"kirishima",title:"The Useful Phrase",beats:[
        n("Eijiro is explaining an agency anecdote in Japanese. I understand enough to know I missed the interesting part."),
        say("kirishima","I went too fast, didn't I? Sorry. Which bit?"),
        n("He repeats the phrase and gives me a chance to work it out before providing the meaning. The punchline improves considerably once I catch it."),
        say("kirishima","You can ask people to repeat themselves, you know. Even if it's me."),
        q("I try the phrase I'll actually use next time.",[["もう一度言ってくれる？ — Could you say that again?","Perfect. And yes, absolutely."],["もう少しゆっくりお願い。 — A little slower, please.","Of course. I can do slow! Usually."],["つまり、こういうこと？ — So, do you mean this?","Exactly! See? Now we're talking."]]),
        n("He waits while I say it naturally, without turning the kitchen into a classroom."),
        say("kirishima","You don't have to get every word on the first try to be part of the conversation.","soft"),
        n("That one stays with me longer than the new vocabulary.")
      ]
    },
    {
      id:"japanese-b",realm:"Japanese",focus:"both",title:"The Kitchen Conversation",beats:[
        n("The conversation over dinner drifts into Japanese so quickly that I miss the turn. It takes a moment before I notice I'm smiling at a joke I haven't understood."),
        say("kirishima","Wait, did we leave you behind? My bad."),
        say("bakugo","She'll say if she missed something."),
        n("Both of them look at me. It is an invitation, not a test."),
        q("I join back in.",[["Ask them to repeat the last line.","Sure. I said he nearly walked into the wrong meeting room."],["Paraphrase what I caught.","Close. Not 'late'—'early by a whole day.'"],["Make a very confident guess.","Not even close. ...But that version is funnier."]]),
        say("kirishima","Okay, from the top. You're in this one.","soft"),
        say("bakugo","And don't pretend you understood just to be polite."),
        n("I don't. The story is much better when I can interrupt it.")
      ]
    },
    {
      id:"health-k",realm:"Health",focus:"bakugo",title:"The Desk Counterargument",beats:[
        n("I get up from the table and discover my shoulders have quietly become bricks. Katsuki notices the movement before I say anything."),
        say("bakugo","You've been hunched over that thing for ages."),
        n("He does not prescribe a heroic workout or announce a new routine. He shifts a chair out of the way and offers me room to move."),
        say("bakugo","Stand up. Just get your shoulders moving. Then decide what you need."),
        q("I try to choose something realistic.",[["Two gentle stretches, then stop.","Fine. Consistent beats dramatic."],["Take a short walk around the block.","I'll grab my shoes."],["Admit I'm done and want the sofa.","Then sit on the sofa. Don't turn it into another assignment."]]),
        n("He watches long enough to make sure I'm not about to walk into the chair, then pointedly stops watching."),
        say("bakugo","Your body isn't a machine you can ignore until it breaks.","soft"),
        n("It sounds like practical criticism. Somehow it lands as care.")
      ]
    },
    {
      id:"health-e",realm:"Health",focus:"kirishima",title:"A Pace of My Own",beats:[
        n("Eijiro asks if I want to join him for a walk. I hesitate because he can comfortably turn a walk into a workout."),
        say("kirishima","I mean a walk. Not secret cardio. Your pace."),
        n("He proves his point by leaving the training talk behind. We make it as far as the first quiet street before I stop thinking about how far we ought to go."),
        say("kirishima","We can turn around whenever. No finish line."),
        q("I decide what would feel good right now.",[["Keep going a little longer.","Cool. I like this route."],["Take a bench break.","Bench break it is. Excellent view from here."],["Head home and make tea.","Best possible ending. I'll put the kettle on."]]),
        n("He matches me without pretending the choice was his. We talk about three completely unrelated things."),
        say("kirishima","You don't have to keep up with me. I'd rather hang out with you.","soft"),
        n("I look away first, for reasons I refuse to investigate.")
      ]
    },
    {
      id:"health-b",realm:"Health",focus:"both",title:"The Reasonable Plan",beats:[
        n("Katsuki proposes a short route. Eijiro suggests an entirely different one. I realize with some alarm that I have become the deciding vote."),
        say("bakugo","Mine gets us back before the shops close."),
        say("kirishima","Mine has the nice trees. Strong argument for the trees."),
        n("Neither of them has asked how much energy I actually have."),
        q("So I supply the missing information.",[["A short route with the nice trees.","That's... annoyingly reasonable."],["Only the shops. I need something for dinner.","Errand walk! Counts."],["Not today. I'd rather rest with both of you.","Then we stay in. No problem."]]),
        say("bakugo","Next time, ask her first."),
        say("kirishima","Yeah. Fair. Sorry, Luca.","soft"),
        n("The plan changes. Nobody treats that as a failure.")
      ]
    },
    {
      id:"recovery-k",realm:"Recovery",focus:"bakugo",title:"No Interrogation",beats:[
        n("The apartment door closes behind me. I haven't decided whether I want to explain the day. Katsuki looks up once and reads enough from my face not to demand the rest."),
        say("bakugo","Tea or water?"),
        n("It's a remarkably manageable question. I answer it. He leaves the drink within reach, then goes back to his book."),
        say("bakugo","You don't owe me a full report."),
        q("I find a way to be here without performing okay-ness.",[["Sit nearby in silence.","Fine. There's room."],["Ask him to distract me with something ridiculous.","Ridiculous? You live with Eijiro. Ask him."],["Say that I might talk about it later.","Then later. No deadline."]]),
        n("Nothing dramatic happens. There is a drink, a lamp, and someone who doesn't turn quiet into a problem he needs to fix."),
        say("bakugo","You can just be tired here.","soft"),
        n("I try it. The world does not end.")
      ]
    },
    {
      id:"recovery-e",realm:"Recovery",focus:"kirishima",title:"Permission to Be Quiet",beats:[
        n("Eijiro starts telling me about his day, then notices I am following only every third word. He stops without making me feel caught."),
        say("kirishima","Hey. Too much noise?"),
        n("I nod. His response is to lower the volume of his voice rather than his enthusiasm for having me nearby."),
        say("kirishima","We can do quiet company. I'm good at quiet company. Sometimes."),
        q("I choose the version of company I want.",[["Share the sofa and do separate things.","Perfect. I'll be over here, being very quiet."],["Ask him for a little space first.","Of course. Just shout if you want me."],["Ask for a story with no complicated ending.","I have the world's least complicated story. It's about a sandwich."]]),
        n("He lets the decision stand. No anxious checking, no pressure to recover on a schedule."),
        say("kirishima","You don't have to entertain me, you know.","soft"),
        n("I settle into the evening on my own terms.")
      ]
    },
    {
      id:"recovery-b",realm:"Recovery",focus:"both",title:"Low-Volume Household",beats:[
        n("The three of us end up in the living room without discussing it. A rough day has made everyone less talkative, which turns out to be a surprisingly peaceful arrangement."),
        say("kirishima","I can make popcorn. Quietly."),
        say("bakugo","Popcorn isn't quiet."),
        n("Eijiro looks offended for a full second. Katsuki has already moved the remote within my reach."),
        q("I establish the evening's only rule.",[["No heroic stories for one hour.","Deal. We have at least six bad cooking stories instead."],["Everyone picks one comforting thing.","Tea. Blanket. And somebody stop arguing about popcorn."],["We can talk, but nobody needs to explain their day.","Works for me. I wasn't planning to."]]),
        say("kirishima","Okay. Then I'm glad you're both here.","soft"),
        say("bakugo","You say that like we went somewhere."),
        n("He doesn't leave. Neither do I.")
      ]
    },
    {
      id:"home-k",realm:"Home",focus:"bakugo",title:"The Right Shelf",beats:[
        n("I am trying to reorganize one kitchen shelf without making the whole room worse. Katsuki appears, takes one look, and hands me the step stool."),
        say("bakugo","What's the system?"),
        n("I describe it. He doesn't replace it with a superior system; he simply points out where three tall jars won't fit."),
        say("bakugo","Keep the things you actually use where you can reach them."),
        q("I negotiate one small change.",[["Claim a shelf for my everyday things.","Then claim it. You're living here."],["Put the shared ingredients where everyone can reach them.","Obviously. The top shelf's for backups."],["Keep the slightly ridiculous mug collection visible.","You collect mugs like a dragon. Fine. Two of them."]]),
        n("He moves aside when I put the final jar in place. He could have done it faster; he lets it be my arrangement."),
        say("bakugo","If it's your shelf, stop asking permission.","soft"),
        n("I go back to the jars so he won't see what that does to me.")
      ]
    },
    {
      id:"home-e",realm:"Home",focus:"kirishima",title:"A Place for Things",beats:[
        n("An extra hook near the door would solve three separate daily annoyances. Eijiro has already found the tools when I mention it."),
        say("kirishima","Want me to hold it, or do you want to drive?"),
        n("There is no weirdness about me knowing how to do the job. He hands me the screwdriver like it's the most ordinary thing in the world."),
        say("kirishima","Okay, you call the height. I trust your eye."),
        q("I make the design decision.",[["Low enough for all three of us.","Practical and considerate. Good call."],["A little higher so bags don't bump the shoes.","Oh, that's smart. I would've missed that."],["Test it with the heaviest bag first.","Structural engineering! Now we're talking."]]),
        n("The hook holds. Eijiro celebrates like we have built a bridge."),
        say("kirishima","One more thing that makes this place ours.","soft"),
        n("I put my keys there first.")
      ]
    },
    {
      id:"home-b",realm:"Home",focus:"both",title:"Three Plates",beats:[
        n("The kitchen counter is too small for three opinions about dinner. Katsuki has the knife, Eijiro has the shopping bag, and I have somehow been appointed mediator."),
        say("bakugo","We have everything for one decent meal."),
        say("kirishima","And enough leftovers for a different decent meal tomorrow.","soft"),
        n("They both wait for me to weigh in. It is the sort of tiny domestic assumption that catches me off guard."),
        q("I choose our ordinary evening.",[["Cook together and assign everyone a job.","Good. You do the sauce. He can wash things."],["Keep it simple and save the ambitious meal for tomorrow.","Thank you. I was about to say that."],["Use the leftovers and spend the time together instead.","Works. Somebody get plates."]]),
        say("kirishima","Hey, Luca. Can you put the third plate out?","soft"),
        say("bakugo","She knows how many of us live here."),
        n("I do. It still takes an extra second before I set it down.")
      ]
    },
    {
      id:"hobbies-k",realm:"Hobbies",focus:"bakugo",title:"One More Round",beats:[
        n("Katsuki insists he isn't interested in the game. Ten minutes later he has learned the controls, the map, and three increasingly specific complaints about my strategy."),
        say("bakugo","You missed an obvious route."),
        n("I remind him he is not playing. He reaches for the second controller without dignifying that with an answer."),
        say("bakugo","Move over. I'll show you."),
        q("The terms of our competition are:",[["Best of three, with a proper rematch.","Fine. No excuses after."],["Co-op. We win together or we lose together.","Then stop running off without me."],["He teaches me one trick; I teach him one.","Deal. Mine's better, obviously."]]),
        n("I don't remember who wins the last round. I do remember that he stays when the menu returns, controller still in hand."),
        say("bakugo","...One more. That last one doesn't count.","smug"),
        n("He says it like I'm the one who asked.")
      ]
    },
    {
      id:"hobbies-e",realm:"Hobbies",focus:"kirishima",title:"The Recommendation",beats:[
        n("I mention a book I love and then instantly regret how much I've said. Eijiro hasn't looked away once."),
        say("kirishima","No, keep going. What made you love it?"),
        n("He asks the kind of follow-up that proves he was listening, not just waiting for a turn."),
        say("kirishima","Okay. Give me the pitch, but don't spoil the ending."),
        q("I decide where to start.",[["The character I couldn't stop thinking about.","That sounds like my kind of character."],["The worldbuilding that made it feel real.","Wait, tell me about the rules of that world."],["The tiny scene that convinced me it was special.","Oh. Okay, now I definitely get why you care."]]),
        n("He writes the title down. Not as a favor. He actually wants to remember it."),
        say("kirishima","I'll tell you what I think when I get to it. You can explain all the parts I miss.","soft"),
        n("I am far too pleased by the idea of having that conversation again.")
      ]
    },
    {
      id:"hobbies-b",realm:"Hobbies",focus:"both",title:"An Entirely Normal Game Night",beats:[
        n("We have agreed on a game night. This turns out to mean three incompatible interpretations of the rules and a bowl of snacks that keeps moving toward Eijiro."),
        say("kirishima","I thought we were here to have fun!"),
        say("bakugo","Winning is fun."),
        n("Both look at me, as though I am an impartial committee. I am not."),
        q("I declare the format.",[["Rotate partners every round.","Ooh, fair. Then nobody gets stuck with the grumpy one."],["Co-op against the game itself.","Good. Then it can be the enemy."],["Winner chooses the next game; loser chooses snacks.","That's a terrible incentive. I love it."]]),
        say("kirishima","Okay. Now this is a proper household tradition.","soft"),
        say("bakugo","We've done it once."),
        n("Nobody objects when I write it on the calendar for another evening.")
      ]
    }
  ];
  const REALMS = {Work:["work-moments","After the Bell"],Knowledge:["knowledge-moments","Puzzle Table"],Japanese:["japanese-moments","Everyday Japanese"],Health:["health-moments","A Gentler Pace"],Recovery:["recovery-moments","Quiet Company"],Home:["home-moments","Apartment Hours"],Hobbies:["hobbies-moments","Off-Duty Club"]};
  const escaped = x => app.escapeHtml?.(String(x??"")) || String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const own = realm => graph.isContentUnlocked(realm,REALMS[realm]?.[0]);
  let active = null;
  const get = id => EPISODES.find(e => e.id === id);
  function state(){
    const root=app.getState();
    if(!root.companionMoments || typeof root.companionMoments!=="object" || Array.isArray(root.companionMoments)) root.companionMoments={schemaVersion:1,completed:{},pending:null};
    const s=root.companionMoments;s.schemaVersion=1;
    if(!s.completed || typeof s.completed!=="object" || Array.isArray(s.completed))s.completed={};
    if(s.pending && (!get(s.pending.id) || !Number.isFinite(Number(s.pending.step))))s.pending=null;
    return s;
  }
  function save(event){app.saveState({source:`companion-moments-${event}`,suppressUiRefresh:true});}
  function storyReady(){return Array.isArray(app.getState().story?.completedSceneIds) && app.getState().story.completedSceneIds.includes("SC_011");}
  function ready(ep){
    if(!ep || !own(ep.realm) || !storyReady())return false;
    return ep.focus!=="both" || (Boolean(state().completed[ep.realm.toLowerCase()+"-k"])&&Boolean(state().completed[ep.realm.toLowerCase()+"-e"]));
  }
  function ensureDialog(){
    let dlg=document.getElementById("companionMomentsDialog");if(dlg)return dlg;
    dlg=document.createElement("dialog");dlg.id="companionMomentsDialog";dlg.className="companion-moments-dialog";
    dlg.innerHTML='<div class="companion-moments-shell"><header class="companion-top"><span>✿ SIDE MOMENTS</span><button type="button" aria-label="Close side moments" data-cm-close>×</button></header><div id="companionMomentsBody"></div></div>';
    document.body.appendChild(dlg);return dlg;
  }
  function body(){return document.getElementById("companionMomentsBody");}
  function open(realm){
    if(!REALMS[realm] || !own(realm))return false;
    active={realm,id:null,step:0,choice:null,replay:false};
    const dlg=ensureDialog();render();if(!dlg.open)dlg.showModal?.();return true;
  }
  function render(){
    if(!active)return;const el=body();if(!el)return;
    if(!active.id){
      const eps=EPISODES.filter(e=>e.realm===active.realm),done=state().completed;
      el.innerHTML=`<div class="cm-overview"><p class="eyebrow">${escaped(active.realm.toUpperCase())} · STORY-LINKED CONTENT</p><h2>${escaped(REALMS[active.realm][1])}</h2><p>Three authored, canon-compatible side moments. Two individual conversations, then a shared-household extra. Story choices remain free; these moments do not buy affection or advance the Main Story.</p>${!storyReady()?'<div class="cm-gate">Continue the existing Main Story until the shared-apartment chapter has been completed. Your talent purchase remains yours.</div>':''}<div class="cm-episode-list">${eps.map(e=>`<button type="button" data-cm-episode="${escaped(e.id)}" ${ready(e)?"":"disabled"}><span>${escaped(e.focus==="bakugo"?"KATSUKI":e.focus==="kirishima"?"EIJIRO":"TOGETHER")}</span><strong>${escaped(e.title)}</strong><small>${done[e.id]?"✓ In your memories · replay freely":ready(e)?"New side moment ›":e.focus==="both"?"Read both individual moments to open":"Continue Main Story to unlock"}</small></button>`).join("")}</div><small class="cm-footnote">All scenes are optional. No timers, Coins, Story Energy or relationship farming.</small></div>`;
      return;
    }
    const ep=get(active.id);if(!ep)return;
    const beat=ep.beats[active.step],last=active.step===ep.beats.length-1;
    const chars=ep.focus==="both"?["bakugo","kirishima"]:[ep.focus];
    const images=chars.map(c=>{
      const mood=beat.expression==="soft"?"soft":beat.expression==="smug"?"smug":beat.speaker===c?"soft":"neutral";
      const src=SPRITES[c][mood]||SPRITES[c].neutral;
      return `<img src="${escaped(src)}" class="dream-vn-sprite dream-vn-${c}${beat.speaker!==c && beat.speaker!=="luca"?" dream-vn-listener":""}" alt="${c==="bakugo"?"Katsuki":"Eijiro"}" draggable="false">`;
    }).join("");
    const options=beat.choices||null;
    const selected=options && active.choice!=null?options[active.choice]:null;
    const variation=active.step>0 && ep.beats[active.step-1]?.choices && active.choice!=null?ep.beats[active.step-1].choices[active.choice]?.reply:"";
    const responseBy=ep.focus==="both"?"At the table":ep.focus==="bakugo"?"Katsuki":"Eijiro";
    const speaker={bakugo:"Katsuki",kirishima:"Eijiro",luca:"Luca"}[beat.speaker]||"Luca";
    el.innerHTML=`<article class="cm-reader"><div class="cm-title"><p class="eyebrow">${escaped(ep.realm.toUpperCase())} · ${escaped(ep.focus==="both"?"SHARED MOMENT":ep.focus==="bakugo"?"KATSUKI":"EIJIRO")}</p><h2>${escaped(ep.title)}</h2></div><div class="dream-vn-stage cm-stage" style="background-image:linear-gradient(0deg,rgba(35,24,45,.6),rgba(35,24,45,.05) 60%),url('${escaped(BG[ep.realm])}')">${images}</div><section class="dream-vn-dialogue" aria-live="polite"><div class="dream-vn-speaker">${escaped(speaker)}</div>${variation?`<div class="cm-choice-response"><strong>${escaped(responseBy)}</strong><p>“${escaped(variation)}”</p></div>`:""}<p>${escaped(beat.text)}</p>${options?`<div class="dream-vn-choices" role="group" aria-label="Choose Luca's response">${options.map((o,i)=>`<button type="button" data-cm-choice="${i}" class="${active.choice===i?"selected":""}" aria-pressed="${active.choice===i}">${escaped(o.label)}</button>`).join("")}</div>`:""}</section><footer class="dream-vn-actions"><small>${active.step+1} / ${ep.beats.length} · ${active.replay?"Archive replay · original choice preserved":"Reading position saved"}</small><div><button type="button" class="secondary-button" data-cm-back ${active.step===0?"disabled":""}>← Back</button><button type="button" class="primary-button" ${options&&active.choice===null?"disabled":""} ${last?"data-cm-finish":"data-cm-next"}>${last?"Finish moment":"Continue →"}</button></div></footer></article>`;
  }
  function select(id){
    const ep=get(id);if(!ready(ep))return false;
    const saved=state().completed[id];
    const pending=state().pending;
    const resume=!saved&&pending?.id===id;
    active={realm:ep.realm,id,step:resume?Math.min(ep.beats.length-1,Math.max(0,Number(pending.step)||0)):0,choice:resume?pending.choice??null:saved?Number(saved.choice):null,replay:Boolean(saved)};
    if(!saved) persist();render();return true;
  }
  function persist(){if(!active?.id||active.replay)return;state().pending={id:active.id,step:active.step,choice:active.choice};save("reading");}
  function navigate(delta){if(!active?.id)return;const ep=get(active.id),beat=ep.beats[active.step];if(delta>0 && beat.choices && active.choice===null)return;active.step=Math.min(ep.beats.length-1,Math.max(0,active.step+delta));persist();render();}
  function choice(index){if(!active?.id)return;const opts=get(active.id)?.beats?.[active.step]?.choices;if(!opts||index<0||index>=opts.length)return;active.choice=index;persist();render();}
  function finish(){
    if(!active?.id)return;const ep=get(active.id);if(active.step!==ep.beats.length-1)return;
    if(!active.replay && !state().completed[ep.id]){
      const firstChoice=active.choice;
      state().completed[ep.id]={choice:firstChoice,completedAt:Date.now()};state().pending=null;
      // Companion memories are personal, small, and non-romance. Only the actual
      // conversation partner learns this selection. A shared conversation is known
      // to both participants. Replays cannot overwrite any such memory.
      const choiceLabel=ep.beats.find(b=>b.choices)?.choices?.[firstChoice]?.label;
      if(choiceLabel){
        const people=ep.focus==="both"?["bakugo","kirishima"]:[ep.focus];
        const category=ep.realm==="Home"?"household":["Recovery","Health","Work"].includes(ep.realm)?"care":"preference";
        for(const person of people) window.LifeRPGRelationshipMemory?.remember?.(person,`companion:${ep.id}`,`In a side moment, Luca chose: ${choiceLabel}`,category,"",`companion:${ep.id}`);
      }
      save("complete");
    }
    active={realm:ep.realm,id:null,step:0,choice:null,replay:false};render();
  }
  document.addEventListener("click",e=>{
    const dlg=document.getElementById("companionMomentsDialog");if(!dlg?.open||!dlg.contains(e.target))return;
    if(e.target.closest("[data-cm-close]")){dlg.close();return;}
    const episode=e.target.closest("[data-cm-episode]");if(episode){select(episode.dataset.cmEpisode);return;}
    const pick=e.target.closest("[data-cm-choice]");if(pick){choice(Number(pick.dataset.cmChoice));return;}
    if(e.target.closest("[data-cm-next]")){navigate(1);return;}
    if(e.target.closest("[data-cm-back]")){navigate(-1);return;}
    if(e.target.closest("[data-cm-finish]")){finish();return;}
  });
  window.LifeRPGCompanionMoments={version:VERSION,open,getStatus:realm=>REALMS[realm]?{owned:!!own(realm),storyReady:storyReady(),completed:EPISODES.filter(e=>e.realm===realm&&state().completed[e.id]).length,total:3}:null,_test:{episodes:EPISODES,ready,state,select,choice,navigate,finish}};
})();
