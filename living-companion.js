/* Living Companion UI · reuses canonical Task, Week, Habit and Daily APIs. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGLivingCompanionCore;
 if(!app?.getState||!app.saveState||!core)return;
 const E=v=>app.escapeHtml?.(String(v??''))||String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const faces={
   bakugo:{name:'Katsuki',img:'assets/story/characters/bakugo-neutral.png',soft:'assets/story/characters/bakugo-soft.png',symbol:'💥'},
   kirishima:{name:'Eijiro',img:'assets/story/characters/kirishima-neutral.png',soft:'assets/story/characters/kirishima-happy.png',symbol:'☀️'},
   mina:{name:'Mina',img:'assets/story/sprites/mina_neutral.png',symbol:'💗'},
   luca:{name:'Luca',img:'assets/ui/thumbs/characters/luca_neutral.webp',soft:'assets/ui/thumbs/characters/luca_soft_smile.webp',symbol:'✿'}
 };
 let dock=null,settingOpen=false,uiStatus='',lastKey='',safeIdeas=false;
 let conversation=null,reactionView=null,reactionTimer=null,ambientView=null;
 let knownCompletedTaskCount=null;
 let watchedDockObstacle=null,watchedLauncher=null;
 const day=()=>core.localDate(new Date());
 function allowed(){
   const flags=app.getState().flags||{};
   const names=[];
   if(flags.STORY_MINA_FRIENDSHIP_STARTED)names.push('mina');
   if(flags.DYNARIOT_MOVE_IN_COMPLETE||flags.SHARED_APARTMENT_IS_HOME||flags.HOME_SHARED_APARTMENT_ACTIVE)names.push('kirishima','bakugo');
   return names.length?names:['luca'];
 }
 function settings(){
   const existing=app.getState().livingCompanionV1;
   if(existing&&existing.day===day())return existing;
   return {day:day(),collapsed:Boolean(existing?.collapsed),character:'',bufferMinutes:[0,10,15,30,45,60].includes(existing?.bufferMinutes)?existing.bufferMinutes:15,dismissed:[],snoozed:{}};
 }
 function write(reason,mutate){
   const state=app.getState(),before=state.livingCompanionV1===undefined?undefined:JSON.stringify(state.livingCompanionV1);
   try{
     const old=settings();
     state.livingCompanionV1={...old,day:day(),dismissed:[...new Set(old.dismissed||[])].slice(-70),snoozed:{...(old.snoozed||{})}};
     mutate(state.livingCompanionV1);
     if(app.saveState({source:'living-companion:'+reason,suppressUiRefresh:true})===false)throw Error('Could not save companion preference.');
     return true;
   }catch(e){
     if(before===undefined)delete state.livingCompanionV1;else state.livingCompanionV1=JSON.parse(before);
     app.showToast?.(String(e.message||e));return false;
   }
 }
 function offDuty(){return app.getState().taskProjectsV1?.offDutyDay===day();}
 function setDuty(value){
   const state=app.getState();
   if(!state.taskProjectsV1)return false;
   const old=state.taskProjectsV1.offDutyDay||'';
   state.taskProjectsV1.offDutyDay=value?day():'';
   if(app.saveState({source:'living-companion:duty',suppressUiRefresh:true})===false){
     state.taskProjectsV1.offDutyDay=old;return false;
   }
   window.dispatchEvent(new Event('life-rpg:task-projects-changed'));
   return true;
 }
 function person(){
   const choices=allowed(),saved=settings().character;
   if(choices.includes(saved))return saved;
   const check=window.LifeRPGDaily?.getToday?.()?.companion?.id;
   if(choices.includes(check))return check;
   const n=Number(day().replaceAll('-',''));
   return choices[n%choices.length];
 }
 function upcoming(){
   const date=day(),week=window.LifeRPGWeekV2?.getOccurrences?.(date)||[];
   const google=window.LifeRPGGoogleCalendar?.busy?.(date)||[];
   return [...week.filter(e=>!e.canceled).map(e=>({start:e.start,end:e.end,title:e.label||'Scheduled time'})),
     ...google.map(e=>({start:e.start,end:e.end,title:e.title||'Appointment'}))];
 }
 function recommendation(){
   const s=settings(),record=window.LifeRPGDaily?.getToday?.(),habits=window.LifeRPGHabits?.getDueForCompanion?.(day())||[];
   return core.recommend({now:new Date(),events:upcoming(),bufferMinutes:s.bufferMinutes,
     checkIn:record?.checkIn||null,tasks:window.LifeRPGTaskProjects?.getOpen?.()||[],habits,
     games:window.LifeRPGGames?.getItems?.()||[],books:window.LifeRPGLibrary?.getItems?.()||[],
     offDuty:offDuty(),excluded:s.dismissed,snoozed:s.snoozed,
     safeOnly:safeIdeas,
     calendarIncomplete:Boolean(window.LifeRPGGoogleCalendar?.hasSetup?.()&&!window.LifeRPGGoogleCalendar?.connected?.())});
 }
 function line(id,rec){
   const name=rec.item?.name||rec.item?.title||'',task=rec.kind==='task',soft=rec.capacity==='low';
   if(rec.kind==='departure')return {
     bakugo:"Next appointment's coming up. Don't start something you can't finish before it.",
     kirishima:"You've got something coming up. Let's keep the time before it easy.",
     mina:"Heads up! Appointment soon. Let's not squeeze an entire project into ten minutes.",
     luca:"I have somewhere to be soon. Big tasks can wait."
   }[id];
   if(rec.kind==='busy')return {
     bakugo:"You're scheduled right now. Leave the task list alone.",
     kirishima:"Looks like you're busy. I'll keep your tasks here for later.",
     mina:"Calendar says you're booked! Catch you afterward.",
     luca:"This time is already booked."
   }[id];
   if(rec.kind==='calendar')return {
     bakugo:rec.safeExhausted?"No safe quick picks left. Check your calendar first; I'm not guessing.":"Calendar connection's down. I'm not guessing your free time. Check it first.",
     kirishima:rec.safeExhausted?"No quick, low-pressure ideas left for now. Let's check your calendar.":"I can't see your connected calendar right now. Let's check that before starting anything big.",
     mina:rec.safeExhausted?"That's all the tiny ideas I found! Maybe reconnect your calendar next?":"Calendar check! I might be missing appointments, so no big task recommendations just yet.",
     luca:rec.safeExhausted?"No more reliable tiny suggestions for now; I should check my schedule.":"My connected calendar isn't available. Better check it before planning."
   }[id];
   if(rec.kind==='checkin')return {
     bakugo:"Before we pick a task, how much energy have you actually got?",
     kirishima:"Hey, how're you feeling today? That'll help us choose something realistic.",
     mina:"Energy check! We are NOT planning your day on imaginary batteries.",
     luca:"First, I should check in with how today actually feels."
   }[id];
   if(rec.kind==='rest')return {
     bakugo:"That's enough for now. Do something you actually want to do, or do nothing.",
     kirishima:"You don't have to fill every free minute. Want some proper downtime?",
     mina:"Off-duty vibes! Games, a book, or gloriously doing nothing?",
     luca:"Rest is a valid plan. I can leave the task list alone."
   }[id];
   if(rec.kind==='open')return {
     bakugo:"Nothing urgent that fits right now. Don't invent work.",
     kirishima:"No good match at the moment. Want to check your hobbies or take a break?",
     mina:"No quest you HAVE to jump into right now. Freedom!",
     luca:"No sensible next step right now. That's okay."
   }[id];
   if(rec.kind==='game'||rec.kind==='book')return {
     bakugo:'You wanted to '+(rec.kind==='game'?'play ':'read ')+name+'. Off the clock. Go enjoy it.',
     kirishima:'How about '+name+'? You deserve time for the stuff you enjoy.',
     mina:'Wait, '+name+' is in your '+(rec.kind==='game'?'game':'reading')+' list! Fun evening?',
     luca:'Maybe '+name+' would be a good way to unwind.'
   }[id];
   if(rec.kind==='habit')return {
     bakugo:"You still have "+name+" on your habits. Want to get it done?",
     kirishima:"Hey, "+name+" is still on your list. Good moment for it?",
     mina:"Tiny reminder! "+name+". Wanna tick that off?",
     luca:"I haven't logged "+name+" yet. Do I want to do it now?"
   }[id];
   if(task){
     const part=rec.smallStep?'Just a '+rec.minutes+'-minute start':'This should fit';
     return {
       bakugo:soft?"Keep it short. "+name+". "+part+".":name+". "+part+". You in?",
       kirishima:"How about "+name+"? "+(rec.smallStep?'We can just make a small start.':'It fits the time you have.'),
       mina:soft?"Low-battery mission: "+name+". Just a little bit?":"What about "+name+"? "+(rec.smallStep?'A tiny first step counts.':'You have time for it!'),
       luca:"I could work on "+name+". "+(rec.smallStep?'Only a manageable first step.':'It fits right now.')
     }[id];
   }
   return "What feels right now?";
 }
 function visiblyBlocking(element){
   // A mobile-only cloud gate remains in the DOM on desktop (display:none).
   // Its data-state alone must never hide the Companion on a larger screen.
   if(!element||element.hidden||element.inert||element.getAttribute('aria-hidden')==='true')return false;
   const style=window.getComputedStyle(element);
   return style.display!=='none'&&style.visibility!=='hidden'&&element.getClientRects().length>0;
 }
 function dayContext(){
   return window.LifeRPGLivingPersonality?.context?.({
     now:new Date(),checkIn:window.LifeRPGDaily?.getToday?.()?.checkIn||null,offDuty:offDuty()
   })||'day';
 }
 function relationLevel(id){
   if(id==='luca')return 0;
   // Hidden values influence tone only; never shown or changed by this UI.
   return Number(window.LifeRPGRelationshipEngine?.getHiddenLevel?.(id)||0);
 }
 function maybeAmbient(who,rec){
   if(ambientView||reactionView||conversation||document.hidden||!window.LifeRPGLivingPersonality)return;
   if(['busy','departure','checkin','task'].includes(rec.kind))return;
   const key='life-rpg-companion-glance:'+day()+':'+who;
   try {if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');}
   catch(e){if(ambientView)return;}
   ambientView={who,text:window.LifeRPGLivingPersonality.ambient(who,dayContext(),day()),until:Date.now()+11000};
   window.setTimeout(()=>{if(ambientView?.who===who&&Date.now()>=ambientView.until){
     ambientView=null;lastKey='';render();
   }},11100);
 }
 function showReaction(type){
   if(!dock||document.hidden||conversation||!window.LifeRPGLivingPersonality)return;
   const who=person();
   if(reactionTimer!==null)clearTimeout(reactionTimer);
   ambientView=null;
   reactionView={who,text:window.LifeRPGLivingPersonality.reaction(who,type,day()+':'+Date.now()),until:Date.now()+11500};
   reactionTimer=window.setTimeout(()=>{reactionTimer=null;reactionView=null;lastKey='';render();},11520);
   lastKey='';render();
 }
 function completedTaskCount(){
   return (window.LifeRPGTaskProjects?.getAll?.()||[]).filter(t=>t?.doneAt).length;
 }
 function hiddenByContext(){
   const id=document.querySelector('.view.active')?.id||'';
   if(/(?:story|dream|coloring|drawing|memories|phone|people|talks|training|studio)/.test(id))return true;
   const modalOpen=[...document.querySelectorAll('dialog[open],.vn-reader[aria-hidden="false"]')].some(visiblyBlocking);
   if(modalOpen)return true;
   const gate=document.getElementById('mobileCloudGate');
   return Boolean(gate?.dataset.state==='checking'&&visiblyBlocking(gate));
 }
 function visibleObstacle(node){
   if(!node||node.hidden)return false;
   const css=getComputedStyle(node);
   return css.display!=='none'&&css.visibility!=='hidden'&&node.getClientRects().length>0;
 }
 function positionDock(){
   if(!dock||dock.hidden)return;
   const launcher=document.getElementById('lifeRpgFocusLauncher');
   const timer=document.getElementById('lifeRpgFocusDock');
   // An expanded Quick Actions menu needs the interaction space to itself.
   dock.classList.toggle('lc-menu-open',Boolean(launcher?.classList.contains('is-open')&&visibleObstacle(launcher)));
   if(dock.classList.contains('lc-menu-open'))return;
   dock.classList.remove('lc-space-tight');
   dock.style.bottom='';
   const initial=dock.getBoundingClientRect();
   let bottom=Math.max(0,window.innerHeight-initial.bottom);
   for(const obstacle of [launcher,timer]){
     if(!visibleObstacle(obstacle))continue;
     const bounds=obstacle.getBoundingClientRect();
     const horizontal=initial.left<bounds.right+8&&initial.right>bounds.left-8;
     if(horizontal)bottom=Math.max(bottom,window.innerHeight-bounds.top+12);
   }
   dock.style.bottom=Math.round(bottom)+'px';
   // On a shallow viewport, keep the character accessible without clipping the entire card.
   if(dock.getBoundingClientRect().top<8){
     dock.classList.add('lc-space-tight');
     if(dock.getBoundingClientRect().top<8)
       dock.style.bottom=Math.max(8,window.innerHeight-dock.offsetHeight-8)+'px';
   }
 }
 function watchDockObstacles(){
   const launcher=document.getElementById('lifeRpgFocusLauncher');
   const timer=document.getElementById('lifeRpgFocusDock');
   if(launcher&&launcher!==watchedLauncher){
     watchedLauncher=launcher;
     if(typeof ResizeObserver!=='undefined')new ResizeObserver(positionDock).observe(launcher);
     if(typeof MutationObserver!=='undefined')
       new MutationObserver(positionDock).observe(launcher,{attributes:true,attributeFilter:['class','style']});
   }
   if(timer&&timer!==watchedDockObstacle){
     watchedDockObstacle=timer;
     if(typeof ResizeObserver!=='undefined')new ResizeObserver(positionDock).observe(timer);
     if(typeof MutationObserver!=='undefined')
       new MutationObserver(positionDock).observe(timer,{attributes:true,attributeFilter:['class','style']});
   }
   positionDock();
 }
 function init(){
   dock=document.createElement('aside');dock.id='livingCompanionDock';dock.className='lc-dock';dock.setAttribute('aria-label','Living Companion');
   dock.addEventListener('click',click);
   document.body.appendChild(dock);
   const refresh=()=>render();
   knownCompletedTaskCount=completedTaskCount();
   for(const ev of ['life-rpg:view-changed','life-rpg:google-calendar-updated','life-rpg:task-work-windows-changed'])window.addEventListener(ev,refresh);
   window.addEventListener('life-rpg:habit-complete',event=>{
     // Backfills are not treated as today's spontaneous conversation.
     if(!event.detail?.backfilled)showReaction('habit');else render();
   });
   window.addEventListener('life-rpg:task-projects-changed',()=>{
     const count=completedTaskCount();
     if(knownCompletedTaskCount!==null&&count>knownCompletedTaskCount)showReaction('task');
     knownCompletedTaskCount=count;render();
   });
   window.addEventListener('life-rpg:game-change',event=>{
     if(event.detail?.source==='game-session-log')showReaction('game');
   });
   window.addEventListener('life-rpg:state-saved',event=>{
     const source=String(event.detail?.source||'');
     if(source==='home-quick-action')showReaction('home');
     else if(!source.startsWith('living-companion:'))render();
   });
   window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
   // The cloud gate can close without any task/state event; refresh immediately.
   const gate=document.getElementById('mobileCloudGate');
   if(gate&&typeof MutationObserver!=='undefined'){
     new MutationObserver(refresh).observe(gate,{attributes:true,attributeFilter:['class','aria-hidden','data-state','style']});
   }
   window.addEventListener('resize',refresh);
   window.addEventListener('life-rpg:time-change',watchDockObstacles);
   document.addEventListener('click',event=>{if(event.target.closest?.('#lifeRpgFocusLauncher'))watchDockObstacles();});
   // Focus dock is loaded asynchronously via pwa.js after our own script.
   if(typeof MutationObserver!=='undefined')new MutationObserver(watchDockObstacles).observe(document.body,{childList:true});
   watchDockObstacles();
   window.setInterval(()=>{if(!document.hidden)render();},60000);
   render();
 }
 function render(){
   if(!dock)return;
   dock.hidden=hiddenByContext();
   if(dock.hidden)return;
   const s=settings(),who=person(),face=faces[who],rec=recommendation();
   if(conversation&&conversation.who!==who)conversation=null;
   if(reactionView&&Date.now()>=reactionView.until)reactionView=null;
   if(ambientView&&Date.now()>=ambientView.until)ambientView=null;
   maybeAmbient(who,rec);
   const mode=offDuty()?'Off-duty mode':'Day companion';
   const artSource=face.soft&&['rest','game','book','habit'].includes(rec.kind)?face.soft:face.img;
   const art=window.LifeRPGVisuals?.thumbnail?.(artSource)||artSource;
   const key=[who,rec.kind,rec.id,rec.item?.title,rec.item?.name,rec.slot?.minutes,rec.slot?.next?.title,rec.safeExhausted,rec.calendarUnverified,mode,s.bufferMinutes,s.collapsed,settingOpen,conversation?.who,conversation?.reply,reactionView?.text,ambientView?.text].join('|');
   // Render on relevant app events, never globally tick/rebuild every second.
   if(lastKey===key&&!uiStatus){watchDockObstacles();return;}
   lastKey=key;
   const mini=s.collapsed;
   const speech=conversation?(conversation.reply||conversation.data.intro)
     :(reactionView?.who===who?reactionView.text:line(who,rec));
   const aside=(!conversation&&!reactionView&&ambientView?.who===who)?ambientView.text:'';
   dock.innerHTML='<div class="lc-surface '+(mini?'lc-mini':'')+'">'+
     '<button type="button" class="lc-portrait" data-lc="toggle" aria-label="'+(mini?'Open':'Minimize')+' Living Companion"><span>'+face.symbol+'</span><img src="'+E(art)+'" alt="" loading="lazy" decoding="async"></button>'+
     (mini?'<button type="button" class="lc-mini-label" data-lc="toggle">What next? ✦</button>':
     '<section class="lc-bubble" aria-label="Suggestion from '+E(face.name)+'">'+
       '<div class="lc-heading"><strong>'+E(face.name)+'</strong><small>'+E(mode)+'</small><button type="button" data-lc="settings" aria-label="Companion settings">⚙</button><button type="button" data-lc="toggle" aria-label="Minimize">×</button></div>'+
       '<p aria-live="polite">'+E(speech)+'</p>'+ 
       (aside?'<small class="lc-personality-aside">✦ '+E(aside)+'</small>':'')+
       (rec.kind==='task'?'<small class="lc-context">'+E(rec.smallStep?'Optional first step · '+rec.minutes+' min':'Estimated '+rec.minutes+' min')+'</small>':'')+
       (rec.calendarUnverified?'<small class="lc-context">Calendar offline · check your schedule before starting</small>':'')+
       (['departure','busy'].includes(rec.kind)&&rec.slot.next?'<small class="lc-context">Next: '+E(rec.slot.next.title)+'</small>':'')+
       '<div class="lc-actions '+(conversation?'lc-talk-actions':'')+'">'+(conversation
          ?(conversation.reply?'<button type="button" data-lc="talk-again" class="lc-primary">Another question</button><button type="button" data-lc="talk-back">Back to my plan</button>'
          :conversation.data.choices.map((choice,index)=>'<button type="button" data-lc="talk-choice" data-lc-choice="'+index+'">'+E(choice.label)+'</button>').join('')+'<button type="button" data-lc="talk-back">Back to my plan</button>')
          :actions(rec))+'</div>'+
       (settingOpen?'<div class="lc-options"><label>Time buffer before appointments <select data-lc-buffer>'+[0,10,15,30,45,60].map(n=>'<option value="'+n+'" '+(n===s.bufferMinutes?'selected':'')+'>'+n+' min</option>').join('')+'</select></label><small>Travel time is not inferred. Add enough preparation and travel buffer for your schedule.</small><button type="button" data-lc="character">Switch guide</button><button type="button" data-lc="reset">Show skipped suggestions again</button></div>':'')+
       (uiStatus?'<small class="lc-status" role="status">'+E(uiStatus)+'</small>':'')+
     '</section>')+'</div>';
   dock.querySelector('.lc-portrait img')?.addEventListener('error',e=>e.currentTarget.remove(),{once:true});
   uiStatus='';
   watchDockObstacles();
 }
 function actions(rec){
   const talk='<button type="button" data-lc="talk" class="lc-talk-button">♡ Talk</button>';
   const button=(id,label,primary=false)=>'<button type="button" data-lc="'+id+'" class="'+(primary?'lc-primary':'')+'">'+label+'</button>';
   if(rec.kind==='task')return button('start','▶ Start',true)+button('later','Later')+button('skip','Something else')+button('duty',offDuty()?'Back to work':'Done working')+talk;
   if(rec.kind==='habit')return button('habit','✓ Done',true)+button('later','Later')+button('skip','Not today')+talk;
   if(rec.kind==='game'||rec.kind==='book')return button('leisure','Open '+(rec.kind==='game'?'games':'books'),true)+button('later','Later')+button('skip','Something else')+talk;
   if(rec.kind==='checkin')return button('checkin','Daily check-in',true)+button('skip','Later')+talk;
   if(rec.kind==='calendar')return (rec.safeExhausted?button('calendar','Open calendar',true)+button('toggle','Got it'):button('safe','Tiny safe idea',true)+button('calendar','Open calendar')+button('toggle','Got it'))+talk;
   if(rec.kind==='departure'||rec.kind==='busy')return button('toggle','Got it',true)+button('duty',offDuty()?'Work mode':'Off duty')+talk;
   return button('duty',offDuty()?'Work mode':'Done working',true)+button('reset','What else?')+button('checkin','Check in')+talk;
 }
 function click(e){
   const b=e.target.closest('button[data-lc]');if(!b||!dock.contains(b))return;
   const action=b.dataset.lc,rec=recommendation(),s=settings();
   if(action==='talk'){const who=person();conversation={who,reply:'',data:window.LifeRPGLivingPersonality?.conversation?.(who,dayContext(),relationLevel(who))};if(!conversation.data){conversation=null;return;}lastKey='';render();return;}
   if(action==='talk-choice'&&conversation){const choice=conversation.data.choices[Number(b.dataset.lcChoice)];if(choice){conversation.reply=choice.reply;lastKey='';render();}return;}
   if(action==='talk-back'){conversation=null;lastKey='';render();return;}
   if(action==='talk-again'&&conversation){conversation.reply='';lastKey='';render();return;}
   if(action==='toggle'){conversation=null;write('collapse',x=>{x.collapsed=!x.collapsed;});settingOpen=false;lastKey='';render();return;}
   if(action==='settings'){settingOpen=!settingOpen;lastKey='';render();return;}
   if(action==='character'){write('character',x=>{const all=allowed(),i=all.indexOf(person());x.character=all[(i+1)%all.length];});lastKey='';render();return;}
   if(action==='reset'){write('reset',x=>{x.dismissed=[];x.snoozed={};});lastKey='';render();return;}
   if(action==='duty'){const wasOff=offDuty();if(!setDuty(!wasOff))uiStatus='Could not change mode.';else if(!wasOff)showReaction('duty');lastKey='';render();return;}
   if(action==='checkin'){window.LifeRPGDaily?.openBriefing?.();return;}
   if(action==='calendar'){safeIdeas=false;app.showView?.('tasks');return;}
   if(action==='safe'){safeIdeas=true;lastKey='';render();return;}
   if((action==='later'||action==='skip')&&rec.id){
     write(action,x=>{if(action==='later')x.snoozed[rec.id]=Date.now()+60*60000;else x.dismissed=[...(x.dismissed||[]),rec.id].slice(-70);});
     lastKey='';render();return;
   }
   if(action==='habit'&&rec.kind==='habit'){
     const ok=window.LifeRPGHabits?.completeFromJournal?.(rec.item.id,day());
     if(!ok){uiStatus='Please use the Habits page to finish this one.';app.showView?.('habits');}
     lastKey='';render();return;
   }
   if(action==='leisure'&&(rec.kind==='game'||rec.kind==='book')){app.showView?.(rec.kind==='game'?'games':'library');return;}
   if(action==='start'&&rec.kind==='task'){
     if(window.LifeRPGTaskSessionReview?.openStart)window.LifeRPGTaskSessionReview.openStart(rec.item.id);
     else window.LifeRPGTaskProjects?.open?.();
   }
 }
 document.addEventListener('change',e=>{
   if(e.target.matches('#livingCompanionDock [data-lc-buffer]')){
     const value=Number(e.target.value);if([0,10,15,30,45,60].includes(value)){write('buffer',x=>{x.bufferMinutes=value;});lastKey='';render();}
   }
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGLivingCompanion={render,recommendation,_test:{allowed,upcoming,offDuty}};
})();
