(() => {
  "use strict";

  const app = window.LifeRPGApp;
  const LEVELS = Array.isArray(window.LIFE_RPG_NONOGRAM_LEVELS) ? window.LIFE_RPG_NONOGRAM_LEVELS : [];
  if (!app?.getState || !app?.awardActivity || !LEVELS.length) return;

  const VERSION = "0.31.4z";
  const SCHEMA = 1;
  const TOTAL = 50;
  const REPEAT_SCALES = [1, .75, .5, .35];
  const TIERS = {
    1:{label:"First Patterns",icon:"🌱",xp:16,statXP:10,coins:10,story:.45},
    2:{label:"Pattern Sense",icon:"🌿",xp:20,statXP:13,coins:12,story:.65},
    3:{label:"Grid Logic",icon:"✦",xp:24,statXP:16,coins:15,story:.9},
    4:{label:"Deep Deduction",icon:"◇",xp:28,statXP:19,coins:18,story:1.15},
    5:{label:"Chapter Challenge",icon:"⚡",xp:32,statXP:22,coins:22,story:1.4}
  };

  const els = {
    dialog:byId("nonogramDialog"), close:byId("nonogramClose"), title:byId("nonogramTitle"), meta:byId("nonogramMeta"),
    daily:byId("nonogramDailyCard"), progress:byId("nonogramJourneyProgress"), levels:byId("nonogramLevelGrid"),
    play:byId("nonogramPlayPanel"), result:byId("nonogramResult"),
    board:byId("nonogramBoard"), tools:byId("nonogramTools"), status:byId("nonogramStatus"), check:byId("nonogramCheckButton"),
    reset:byId("nonogramResetButton"), growthStats:byId("nonogramGrowthStats"), trainingStats:byId("trainingGroundsNonogramStatus"), quickStatus:byId("nonogramQuickStatus")
  };
  let mode="fill";
  init();

  function init(){ensureState();bind();render();window.addEventListener("life-rpg:render",render);}
  function defaults(){return{schemaVersion:SCHEMA,journey:{completedLevels:[],active:null},stats:{solved:0},completed:[]};}
  function ensureState(){const root=app.getState();if(!root.nonogram||typeof root.nonogram!=="object"||Array.isArray(root.nonogram))root.nonogram=defaults();const s=root.nonogram;s.schemaVersion=SCHEMA;s.journey||=defaults().journey;s.stats||={solved:0};s.completed=Array.isArray(s.completed)?s.completed.slice(-300):[];s.journey.completedLevels=[...new Set((s.journey.completedLevels||[]).map(Number).filter(n=>n>=1&&n<=TOTAL))].sort((a,b)=>a-b);s.journey.active=normalizeActive(s.journey.active);return s;}
  function state(){return ensureState();}
  function levelDef(level){return LEVELS.find(item=>Number(item.level)===Number(level))||null;}
  function tier(level){return Math.min(5,Math.max(1,Math.ceil(Number(level||1)/10)));}
  function normalizeActive(a){if(!a||typeof a!=="object")return null;const def=levelDef(a.level);if(!def)return null;const cells=def.size*def.size;return{...a,id:a.id||`nonogram-l${def.level}`,level:def.level,size:def.size,solution:def.solution,marks:Array.isArray(a.marks)&&a.marks.length===cells?a.marks.map(v=>[0,1,2].includes(Number(v))?Number(v):0):Array(cells).fill(0),replay:Boolean(a.replay),createdAt:Number(a.createdAt||Date.now()),updatedAt:Number(a.updatedAt||a.createdAt||Date.now()),completedAt:a.completedAt?Number(a.completedAt):null,rewardEventId:a.rewardEventId||null};}
  function completedSet(){return new Set(state().journey.completedLevels);}
  function nextLevel(){for(let i=1;i<=TOTAL;i++)if(!completedSet().has(i))return i;return null;}
  function persist(source="nonogram"){app.saveState({source});render();app.renderAll?.();}

  function bind(){
    els.close?.addEventListener("click",close);els.check?.addEventListener("click",check);els.reset?.addEventListener("click",resetCurrent);
    document.addEventListener("click",event=>{
      const open=event.target.closest?.("[data-nonogram-open]");if(open){event.preventDefault();openDialog();return;}
      const daily=event.target.closest?.("[data-nonogram-daily-start]");if(daily){event.preventDefault();startLevel(nextLevel()||TOTAL,{replay:!nextLevel()});return;}
      const lvl=event.target.closest?.("[data-nonogram-level]");if(lvl){event.preventDefault();const n=Number(lvl.dataset.nonogramLevel);if(n&&!lvl.disabled)startLevel(n,{replay:completedSet().has(n)});return;}
      const nextButton=event.target.closest?.("[data-nonogram-next-level]");if(nextButton){event.preventDefault();const next=nextLevel();if(next)startLevel(next,{replay:false});return;}
      const returnButton=event.target.closest?.("[data-nonogram-return]");if(returnButton){event.preventDefault();window.LifeRPGTrainingFocus?.exit?.({reopen:false});openDialog();return;}
      const tool=event.target.closest?.("[data-nonogram-tool]");if(tool){event.preventDefault();mode=tool.dataset.nonogramTool;renderTools();return;}
      const cell=event.target.closest?.("[data-nonogram-cell]");if(cell){event.preventDefault();applyCell(Number(cell.dataset.nonogramCell));}
    });
    els.board?.addEventListener("contextmenu",event=>{const cell=event.target.closest?.("[data-nonogram-cell]");if(!cell)return;event.preventDefault();applyCell(Number(cell.dataset.nonogramCell),"cross");});
  }

  function openDialog(){render();if(!els.dialog.open)els.dialog.showModal();}
  function close(){if(els.dialog.open)els.dialog.close();}
  function startLevel(level,{replay=false}={}){const def=levelDef(level);if(!def)return;const allowed=level<=1||completedSet().has(level)||completedSet().has(level-1);if(!allowed)return;const existing=current();if(existing&&!existing.completedAt&&existing.level===level&&Boolean(existing.replay)===Boolean(replay)){clearLocalResult();render();enterFocus(existing);return;}clearLocalResult();state().journey.active={id:`nonogram-l${level}${replay?"-replay":""}`,level,size:def.size,solution:def.solution,marks:Array(def.size*def.size).fill(0),replay:Boolean(replay),createdAt:Date.now(),updatedAt:Date.now(),completedAt:null,rewardEventId:null};mode="fill";persist("nonogram-start");enterFocus(current());}
  function current(){return state().journey.active;}

  function render(){renderGrowth();renderDaily();renderProgress();renderLevels();renderTools();renderBoard();renderResult();syncFocusHeader();}
  function renderGrowth(){const s=state(),next=nextLevel(),active=s.journey.active&&!s.journey.active.completedAt?s.journey.active:null;if(els.growthStats)els.growthStats.innerHTML=`<span><b>${s.journey.completedLevels.length}/${TOTAL}</b> Journey</span><span><b>${s.stats.solved||0}</b> solved</span><span>${next?`▶ Level ${next}`:"🏆 Chapter complete"}</span>`;if(els.trainingStats)els.trainingStats.textContent=next?`Level ${next} / ${TOTAL}`:`${TOTAL}/${TOTAL} complete`;if(els.quickStatus)els.quickStatus.textContent=active?`Continue Journey Level ${active.level}`:next?`Journey ${s.journey.completedLevels.length}/${TOTAL} · next Level ${next}`:`Journey ${TOTAL}/${TOTAL} complete`;}
  function renderDaily(){
    if(!els.daily)return;
    const next=nextLevel(),done=todayNonogramCount()>0;
    const streak=escapeHtml(window.LifeRPGDailyStreaks?.shortLabel?.("nonogram")||"Daily consistency bonus ready");
    if(!next){els.daily.innerHTML=`<div><small>DAILY NONOGRAM</small><strong>Chapter 1 complete 🏆</strong><span>Replay any unlocked level whenever you want. A first replay on a new day can still keep the positive Daily streak going.</span><em class="training-streak-line-v314z">${streak}</em></div><button type="button" data-nonogram-level="50">Replay Level 50</button>`;return;}
    els.daily.innerHTML=`<div><small>DAILY NONOGRAM</small><strong>${done?"Today's logic training is already done ✓":`Continue your Journey · Level ${next}`}</strong><span>${levelDef(next).size}×${levelDef(next).size} · ${TIERS[tier(next)].label}. Missing a day never removes rewards; consistency only adds a bonus.</span><em class="training-streak-line-v314z">${streak}</em></div><button type="button" data-nonogram-daily-start>${state().journey.active?.level===next&&!state().journey.active?.completedAt?"Continue":"Start"} Level ${next}</button>`;
  }
  function renderProgress(){if(!els.progress)return;const n=state().journey.completedLevels.length,p=Math.round(n/TOTAL*100);els.progress.innerHTML=`<div><span><strong>${n}/${TOTAL}</strong> completed</span><span>${p}%</span></div><div class="bar"><span style="width:${p}%"></span></div>`;}
  function renderLevels(){if(!els.levels)return;const set=completedSet(),next=nextLevel();els.levels.innerHTML=Array.from({length:TOTAL},(_,i)=>i+1).map(level=>{const done=set.has(level),unlocked=done||level===1||set.has(level-1);const active=current()?.level===level&&!current()?.completedAt;return`<button type="button" data-nonogram-level="${level}" ${unlocked?"":"disabled"} class="${done?"done":""} ${active?"active":""}"><span>${done?"✓":active?"▶":unlocked?level:"🔒"}</span><small>${levelDef(level).size}×${levelDef(level).size}</small></button>`;}).join("");}
  function renderTools(){if(!els.tools)return;els.tools.querySelectorAll?.("[data-nonogram-tool]").forEach(btn=>btn.classList.toggle("active",btn.dataset.nonogramTool===mode));}
  function renderBoard(){if(!els.board)return;const a=current();if(!a){if(els.check)els.check.disabled=true;if(els.reset)els.reset.disabled=true;els.board.innerHTML=`<div class="nonogram-empty-v314k"><span>◩</span><strong>Your next picture puzzle is waiting.</strong><p>Fill cells from the row and column clues. Mark impossible cells with ×.</p><button class="primary-button" type="button" data-nonogram-daily-start>Start Level ${nextLevel()||TOTAL}</button></div>`;updateStatus(null);return;}if(els.check)els.check.disabled=Boolean(a.completedAt);if(els.reset)els.reset.disabled=Boolean(a.completedAt);const rc=computeClues(a.solution,a.size,true),cc=computeClues(a.solution,a.size,false);const maxRow=Math.max(...rc.map(c=>c.length)),maxCol=Math.max(...cc.map(c=>c.length));els.board.style.setProperty("--nonogram-size",a.size);els.board.style.setProperty("--nonogram-row-clues",maxRow);els.board.style.setProperty("--nonogram-col-clues",maxCol);els.board.innerHTML=`<div class="nonogram-corner-v314k"></div><div class="nonogram-col-clues-v314k">${cc.map((clue,c)=>`<div data-nonogram-col-clue="${c}">${clue.map(n=>`<span>${n}</span>`).join("")}</div>`).join("")}</div><div class="nonogram-row-clues-v314k">${rc.map((clue,r)=>`<div data-nonogram-row-clue="${r}">${clue.map(n=>`<span>${n}</span>`).join("")}</div>`).join("")}</div><div class="nonogram-grid-v314k">${a.marks.map((mark,index)=>`<button type="button" data-nonogram-cell="${index}" class="${mark===1?"filled":mark===2?"crossed":""}" aria-label="Row ${Math.floor(index/a.size)+1}, column ${index%a.size+1}">${mark===2?"×":""}</button>`).join("")}</div>`;updateClueCompletion(a,rc,cc);updateStatus(a);}

  function enterFocus(a=current()){if(!a||!els.play||!window.LifeRPGTrainingFocus?.enter)return false;if(els.dialog?.open)els.dialog.close();return window.LifeRPGTrainingFocus.enter({id:"nonogram",node:els.play,title:`Nonogram Journey · Level ${a.level}`,subtitle:`${a.size}×${a.size} · ${TIERS[tier(a.level)].label}${a.replay?" · Replay":""}`,tone:"light",onExit:()=>{render();if(els.dialog&&!els.dialog.open)els.dialog.showModal();}});}
  function syncFocusHeader(){const a=current();if(!a||!window.LifeRPGTrainingFocus?.isActive?.("nonogram"))return;window.LifeRPGTrainingFocus.update({title:`Nonogram Journey · Level ${a.level}`,subtitle:a.completedAt?"Solved ✓":`${a.size}×${a.size} · ${TIERS[tier(a.level)].label}${a.replay?" · Replay":""}`});}
  function renderResult(){if(!els.result)return;const a=current();if(!a?.completedAt){if(els.result.dataset.transient!=="true")els.result.classList.add("hidden");return;}delete els.result.dataset.transient;const event=a.rewardEventId?(app.getState().rewardLedger?.events||[]).find(item=>item?.id===a.rewardEventId):null;const next=nextLevel();const reward=event?{xp:Number(event.xp||0),realmXP:Number(event.realmXP||0),statXP:Number(event.statXP||0),storyEnergy:Number(event.storyEnergy||0),coins:Number(event.coins||0)}:null;const rewards=reward?`<div class="training-result-rewards-v314o"><span>+${reward.xp} XP</span><span>+${reward.realmXP} Knowledge XP</span><span>+${reward.statXP} Logic XP</span><span>+${app.formatEnergy?.(reward.storyEnergy)??reward.storyEnergy} Story Energy</span><span>+${reward.coins} Coins</span></div>`:"";els.result.className="training-result-v314o is-success";els.result.innerHTML=`<span>✓</span><strong>Level ${a.level} solved correctly!</strong><p>${a.replay||!event?"Replay complete — no duplicate first-completion reward.":next?`Your rewards are saved and Level ${next} is unlocked.`:"Your rewards are saved. Chapter 1 is complete!"}</p>${rewards}<div class="training-result-actions-v314o">${next?`<button class="primary-button" data-nonogram-next-level type="button">Start Level ${next}</button>`:""}<button class="secondary-button" data-nonogram-return type="button">Back to Nonogram Journey</button></div>`;}
  function clearLocalResult(){if(!els.result)return;delete els.result.dataset.transient;els.result.classList.add("hidden");els.result.innerHTML="";}
  function showLocalResult(kind,title,message){if(!els.result)return;els.result.dataset.transient="true";els.result.className=`training-result-v314o is-${kind}`;els.result.innerHTML=`<span>◇</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>`;els.result.scrollIntoView?.({behavior:"smooth",block:"nearest"});}

  function computeClues(solution,size,rows){const lines=[];const values=[...solution].map(v=>v==="1"?1:0);const countLine=line=>{const out=[];let run=0;line.forEach(v=>{if(v)run++;else if(run){out.push(run);run=0;}});if(run)out.push(run);return out.length?out:[0];};for(let i=0;i<size;i++){const line=[];for(let j=0;j<size;j++)line.push(rows?values[i*size+j]:values[j*size+i]);lines.push(countLine(line));}return lines;}
  function applyCell(index,forcedMode=null){const a=current();if(!a||a.completedAt||index<0||index>=a.marks.length)return;const selected=forcedMode||mode;if(selected==="fill")a.marks[index]=a.marks[index]===1?0:1;else if(selected==="cross")a.marks[index]=a.marks[index]===2?0:2;else a.marks[index]=0;a.updatedAt=Date.now();app.saveState({source:"nonogram-progress"});renderBoard();}
  function resetCurrent(){const a=current();if(!a||a.completedAt)return;if(!window.confirm("Clear your marks on this Nonogram level?"))return;a.marks=Array(a.size*a.size).fill(0);a.updatedAt=Date.now();persist("nonogram-reset");}
  function updateClueCompletion(a,rc,cc){for(let r=0;r<a.size;r++){const marks=a.marks.slice(r*a.size,(r+1)*a.size).map(v=>v===1?1:0),got=clueFromMarks(marks);els.board.querySelector(`[data-nonogram-row-clue="${r}"]`)?.classList.toggle("complete",sameClue(got,rc[r]));}for(let c=0;c<a.size;c++){const marks=[];for(let r=0;r<a.size;r++)marks.push(a.marks[r*a.size+c]===1?1:0);els.board.querySelector(`[data-nonogram-col-clue="${c}"]`)?.classList.toggle("complete",sameClue(clueFromMarks(marks),cc[c]));}}
  function clueFromMarks(line){const out=[];let run=0;for(const v of line){if(v)run++;else if(run){out.push(run);run=0;}}if(run)out.push(run);return out.length?out:[0];}
  function sameClue(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
  function updateStatus(a){if(!els.status)return;if(!a){els.status.textContent="Choose your next Journey level to begin.";return;}const filled=a.marks.filter(v=>v===1).length,totalOn=[...a.solution].filter(v=>v==="1").length;els.status.textContent=a.completedAt?`Level ${a.level} complete ✓`:`Level ${a.level} · ${a.size}×${a.size} · ${filled}/${totalOn} filled cells placed`;}

  function check(){const a=current();if(!a||a.completedAt)return;const correct=a.marks.every((mark,i)=>(mark===1)===(a.solution[i]==="1"));if(!correct){showLocalResult("error","Not quite yet","At least one filled cell is missing or misplaced. Keep working from the row and column clues — your current grid is saved.");els.board?.classList.add("shake-v314k");setTimeout(()=>els.board?.classList.remove("shake-v314k"),350);return;}complete(a);}
  function complete(a){
    const s=state();
    const live=s.journey.active;
    if(!live||live.completedAt||live.level!==a.level)return;
    const already=new Set(s.journey.completedLevels).has(live.level);
    live.completedAt=Date.now();
    live.updatedAt=live.completedAt;
    if(live.replay||already){
      s.completed.push({id:live.id,level:live.level,replay:true,completedAt:live.completedAt,rewardEventId:null});
      persist("nonogram-replay");
      const daily=window.LifeRPGDailyStreaks?.awardStandalone?.("nonogram",{source:"nonogram-daily-replay",label:`Nonogram Daily · Replay Level ${live.level}`,realm:"Knowledge",capability:"knowledge",xp:5,realmXP:5,statXP:4,coins:5,storyEnergyBase:.2,metadata:{nonogram:true,mode:"journey-replay",level:live.level}});
      app.showToast?.(daily?.reward?`↻ Nonogram Level ${live.level} replay solved · Daily ${daily.info?.streak||1}-day streak · +${daily.reward.xp} XP · +${app.formatEnergy?.(daily.reward.storyEnergy)??daily.reward.storyEnergy} 🔥 · +${daily.reward.coins} 🪙`:`↻ Nonogram Level ${live.level} replay solved · no duplicate level reward`);
      window.setTimeout(()=>els.result?.scrollIntoView?.({behavior:"smooth",block:"start"}),40);
      return;
    }
    const reward=award(live);
    s.journey.completedLevels.push(live.level);
    s.journey.completedLevels=[...new Set(s.journey.completedLevels)].sort((x,y)=>x-y);
    s.stats.solved=Number(s.stats.solved||0)+1;
    s.completed.push({id:live.id,level:live.level,replay:false,completedAt:live.completedAt,rewardEventId:reward.eventId||null,reward:{xp:reward.xp,realmXP:reward.realmXP,statXP:reward.statXP,coins:reward.coins,storyEnergy:reward.storyEnergy}});
    s.completed=s.completed.slice(-300);
    persist("nonogram-complete");
    const next=nextLevel();
    app.showToast?.(`◩ Level ${live.level} complete · +${reward.xp} XP · +${app.formatEnergy?.(reward.storyEnergy)??reward.storyEnergy} 🔥 · +${reward.coins} 🪙${next?` · Level ${next} unlocked`:" · Chapter 1 complete!"}`);
    window.setTimeout(()=>els.result?.scrollIntoView?.({behavior:"smooth",block:"start"}),40);
  }

  function award(a){
    const sourceId=`journey-l${a.level}`,root=app.getState(),existing=(root.rewardLedger?.events||[]).find(e=>e?.source==="nonogram-complete"&&e?.sourceId===sourceId);
    if(existing){a.rewardEventId=existing.id;return{eventId:existing.id,xp:Number(existing.xp||0),realmXP:Number(existing.realmXP||0),statXP:Number(existing.statXP||0),coins:Number(existing.coins||0),storyEnergy:Number(existing.storyEnergy||0)};}
    const meta=TIERS[tier(a.level)],scale=REPEAT_SCALES[Math.min(todayNonogramCount(),REPEAT_SCALES.length-1)];
    const baseSpec={source:"nonogram-complete",sourceId,label:`Nonogram Journey · Level ${a.level}`,realm:"Knowledge",capability:"knowledge",xp:Math.max(1,Math.round(meta.xp*scale)),realmXP:Math.max(1,Math.round(meta.xp*scale)),statXP:Math.max(1,Math.round(meta.statXP*scale)),coins:Math.max(1,Math.round(meta.coins*scale)),storyEnergyBase:floor2(meta.story*scale),progressionRelevant:true,metadata:{nonogram:true,mode:"journey",level:a.level,size:a.size,tier:tier(a.level),repeatScale:scale}};
    const streaked=window.LifeRPGDailyStreaks?.apply?.("nonogram",baseSpec)||{spec:baseSpec,info:null};
    const reward=app.awardActivity(streaked.spec);reward.dailyStreakInfo=streaked.info;a.rewardEventId=reward.eventId||null;return reward;
  }
  function todayNonogramCount(){const key=localDateKey(new Date());return(app.getState().rewardLedger?.events||[]).filter(e=>e?.source==="nonogram-complete"&&!e.duplicate&&localDateKey(new Date(e.at||0))===key).length;}
  function localDateKey(d){if(!d||Number.isNaN(d.getTime()))return"";return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function floor2(n){return Math.floor(Number(n||0)*100)/100;}
  function byId(id){return document.getElementById(id);}
  function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}

  window.LifeRPGNonogram={version:VERSION,open:openDialog,startNext:()=>startLevel(nextLevel()||TOTAL,{replay:!nextLevel()}),getProgress:()=>({completed:state().journey.completedLevels.length,total:TOTAL,next:nextLevel(),active:current()?.level||null})};
})();
