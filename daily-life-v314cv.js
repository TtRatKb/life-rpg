(() => {
  "use strict";
  const app = window.LifeRPGApp;
  if (!app?.getState) return;
  const $ = id => document.getElementById(id);
  const escape = text => app.escapeHtml?.(String(text ?? "")) ?? String(text ?? "").replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const amount = n => Number(n || 0).toLocaleString(undefined, {maximumFractionDigits:2});
  const money = n => `€${(Number(n || 0) / 100).toFixed(2)}`;
  const clamp = (n, lo, hi) => Math.min(hi,Math.max(lo,n));
  let selected = "shop", skillId = "", pack = null, scheduled = false;
  const markupCache = new Map();
  function setMarkup(el, html) {
    if (!el || markupCache.get(el.id) === html) return;
    markupCache.set(el.id, html);
    el.innerHTML = html;
  }

  function getChecklist() {
    const state = app.getState(), today = localDay(), rows = [];
    const add = (id, label, complete, view, action, description = "Daily first reward") => rows.push({id, label, complete:Boolean(complete), view, action, description});
    const checkIn = window.LifeRPGDaily?.getToday?.();
    add("checkin", "Daily Check-in", Boolean(checkIn?.checkIn), "basecamp", "checkin", "A real check-in, not another checkbox");
    const streaks = window.LifeRPGDailyStreaks;
    const daily = (id) => Boolean(streaks?.summary?.(id)?.completedToday);
    add("sudoku", "Sudoku", daily("sudoku") || Boolean(window.LifeRPGSudoku?.getStats?.()?.dailyDone), "growth", "sudoku");
    add("nonogram", "Nonogram", daily("nonogram"), "growth", "nonogram");
    add("numberSense", "Number Sense", daily("numberSense"), "growth", "numberSense");
    add("memoryGarden", "Memory Garden", daily("memoryGarden"), "growth", "memoryGarden");
    add("dailyWord", "Lexicon Daily Word", daily("lexiconDailyWord"), "growth", "lexicon", "First daily word reward");
    const lexicon = window.LifeRPGLexiconLab?.getDailyStatus?.();
    if (lexicon?.ready) add("crossword", "Daily Crossword", lexicon.completed, "growth", "crossword");
    if (window.LifeRPGTalentV2?.isContentUnlocked?.("Health", "year-question")) {
      const entry = state.journal?.entries?.[today];
      add("yearQuestion", "365 Question Journal", Boolean(String(entry?.yearQuestion || "").trim()), "journal", "yearQuestion", "Today's dated question");
    }
    for (const [id,label] of [["slitherlink","Slitherlink"],["nurikabe","Nurikabe"],["kakuro","Kakuro"]]) {
      const status = window.LifeRPGLogicExpansion?.getStatus?.(id);
      if (status?.unlocked) add(id,label,status.dailySolved,"growth",id,"Daily puzzle, practice remains available");
    }
    return rows;
  }
  function renderChecklist() {
    const rows = getChecklist();
    const complete = rows.filter(r=>r.complete).length;
    if ($("dailyRewardsCount")) $("dailyRewardsCount").textContent = `${complete} / ${rows.length}`;
    setMarkup($("dailyRewardsList"), rows.map(r => `<button class="daily-reward-row-v314cv ${r.complete?"is-done":""}" type="button" data-daily-action="${escape(r.action)}" aria-label="${escape(r.label)}: ${r.complete?"daily complete":"daily available"}"><span class="daily-reward-state-v314cv">${r.complete?"✓":"○"}</span><span><strong>${escape(r.label)}</strong><small>${escape(r.complete?"First reward collected · available for practice if supported":r.description)}</small></span><b>${r.complete?"Collected":"Open ›"}</b></button>`).join("") || `<p class="muted">Daily content will appear as you unlock it.</p>`);
  }
  function openDaily(action) {
    switch(action) {
      case "checkin": app.showView("basecamp");window.LifeRPGDaily?.openBriefing?.();break;
      case "sudoku": window.LifeRPGSudoku?.open?.();break;
      case "nonogram":window.LifeRPGNonogram?.open?.();break;
      case "numberSense":window.LifeRPGNumberSense?.open?.();break;
      case "memoryGarden":window.LifeRPGMemoryGarden?.open?.();break;
      case "lexicon":case "crossword":window.LifeRPGLexiconLab?.open?.();break;
      case "yearQuestion":app.showView("journal");window.LifeRPGJournal?.openReflection?.(localDay());break;
      case "slitherlink":case "nurikabe":case "kakuro":window.LifeRPGLogicExpansion?.open?.(action);break;
      default:app.showView("growth");
    }
  }
  function level(total) {
    let l=1, into=Math.max(0,Number(total || 0)), required=100;
    while (into >= required && l < 999) {into-=required; l++; required=100+(l-1)*35;}
    return {level:l,into,required,remaining:Math.max(0,required-into)};
  }
  function eligibleQuestPreviews(target) {
    // Only the real quest registry and its canonical anti-farm reward preview are used.
    const quests = (app.getQuestCatalog?.() || []).filter(q => q && q.id && app.getQuestAvailability?.(q)?.available);
    const candidates=[];
    for (const q of quests) {
      if (["Planned","Later"].includes(q.manualStatus)) continue;
      const units = Number(q.units) > 0 ? Number(q.units) : 1;
      const reward = app.previewQuestReward?.(q.id,units);
      if (!reward || reward.deduped || reward.duplicate) continue;
      const value=Number(reward[target] || 0);
      if (value <= 0) continue;
      candidates.push({id:q.id,label:q.name,units,reward,value,realm:q.realm});
    }
    return candidates.sort((a,b)=>b.value-a.value).slice(0,4);
  }
  function objective(target) {
    const state = app.getState();
    if (target === "shop") {
      const item = window.LifeRPGShop?.getCurrentWish?.();
      if (!item) return {title:"Choose a Current Wish",remain:0,unit:"Coins",ready:false,note:"Pin a reward in the Shop to see how close you are.",open:"shop"};
      const remain=Math.max(0,Number(item.coinCost||0)-Number(state.coins||0));
      return {title:item.name,remain,unit:"Coins",ready:remain===0,note:remain===0?"Your saved target is within reach. Check the actual price at checkout.":`${money(state.coins)} saved · ${money(item.coinCost)} target (confirm current price before redeeming)`,open:"shop",metric:"coins"};
    }
    if (target === "character") {
      const info=level(state.characterXP);
      return {title:`Character level ${info.level+1}`,remain:Math.ceil(info.remaining),unit:"XP",ready:false,note:`Level ${info.level} · ${amount(info.into)} of ${amount(info.required)} XP`,open:"growth",metric:"xp"};
    }
    if (target === "skill") {
      const skills=window.LifeRPGSkills;
      const registry=skills?.registry || [];
      if (!registry.length) return {title:"Skills loading",remain:0,unit:"Skill XP",ready:false,note:"Open Growth to see your Skills.",open:"growth"};
      if (!registry.some(s=>s.id===skillId)) skillId=[...registry].sort((a,b)=>{
        const x=skills.getLevelInfo(a.id),y=skills.getLevelInfo(b.id);
        return (x.required-x.intoLevel)-(y.required-y.intoLevel);
      })[0].id;
      const info=skills.getLevelInfo(skillId), selectedSkill=registry.find(s=>s.id===skillId);
      return {title:selectedSkill.label,remain:Math.max(0,Number((info.required-info.intoLevel).toFixed(2))),unit:"Skill XP",ready:false,note:`Level ${info.level} · ${amount(info.intoLevel)} / ${amount(info.required)} XP · only matching activities count`,open:"growth",metric:"skill",skill: selectedSkill};
    }
    if (target === "story") {
      const engine=window.LifeRPGStoryEngine;
      if (!pack || !engine) return {title:"Next story chapter",remain:0,unit:"Story Energy",ready:false,note:"Story progress loads without revealing future scenes.",open:"story"};
      const next=engine.nextScene(pack, state.story?.completedSceneIds || []);
      if (!next) return {title:"Current story complete",remain:0,unit:"Story Energy",ready:true,note:"All currently available main chapters completed.",open:"story"};
      const costFor=s=>Number(s.order||1)<=1?0:Math.min(20,Math.max(Number(s.cost||0),5+Math.floor(Number(s.order||1)*.75)));
      const cost=Math.min(20,Math.max(costFor(next),...engine.orderedScenes(pack).filter(s=>Number(s.order||0)<=Number(next.order||0)).map(costFor)));
      const unlocked=Boolean(state.story?.unlockedSceneIds?.includes(next.id));
      const remain=unlocked?0:Math.max(0,Number((cost-Number(state.storyEnergy||0)).toFixed(2)));
      return {title:"Next story chapter",remain,unit:"Story Energy",ready:remain===0,note:unlocked?"Already unlocked · continue reading in Story Mode.":remain===0?"Enough Energy. Story Momentum and timing may still apply; see Story Mode.":`${amount(state.storyEnergy)} / ${amount(cost)} Story Energy · extra conditions, if any, are shown in Story Mode`,open:"story",metric:"storyEnergy"};
    }
    return {title:"Choose a target",remain:0,unit:"",ready:false,note:"",open:"basecamp"};
  }
  function renderMilestone() {
    const info=objective(selected);
    const registry=window.LifeRPGSkills?.registry || [];
    const skillPicker=selected==="skill"?`<label class="milestone-skill-select-v314cv">Skill <select id="milestoneSkillPick" aria-label="Choose Skill">${registry.map(s=>`<option value="${escape(s.id)}" ${s.id===skillId?"selected":""}>${escape(s.label)} · ${escape(s.realm)}</option>`).join("")}</select></label>`:"";
    let suggestions=[];
    if (info.metric && info.metric!=="skill" && info.remain>0) suggestions=eligibleQuestPreviews(info.metric);
    const opts=suggestions.map(q=>`<button type="button" class="milestone-suggestion-v314cv" data-milestone-open="quests"><span><strong>${escape(q.label)}</strong><small>Currently available quest · reward preview, if completed</small></span><b>≈ +${amount(q.value)} ${escape(info.unit)} ›</b></button>`).join("");
    const skillHelp=info.metric==="skill"?`<div class="milestone-skill-tip-v314cv">${info.skill?.realm==="Work"?"Only time logged under the matching work category counts for this Skill (e.g. lesson preparation vs corrections vs deep focus).":info.skill?.id==="logical-pattern-reasoning"?"Sudoku and Nonogram grant this Skill XP when solved; the first daily reward is tracked separately.":"Choose an activity that actually feeds this specific Skill; general Realm XP is not the same thing."} No duplicate payouts are created by this card.</div>`:"";
    // Skill suggestions must use known canonical native Skill mappings. A generic
    // unclaimed puzzle can give Character XP but must not claim to advance every Skill.
    const skillNativeActions={
      "logical-pattern-reasoning":["sudoku","nonogram"],
      "quantitative-reasoning":["numberSense"],
      "memory-recall":["memoryGarden"],
      "language-expression":["lexicon","crossword"],
      "reflection-self-awareness":["checkin"]
    };
    const native = getChecklist().filter(r=>!r.complete && (
      info.metric==="skill" ? (skillNativeActions[info.skill?.id] || []).includes(r.action) : r.action!=="checkin"
    )).slice(0,2);
    const nativeMarkup = info.metric && info.remain>0 && native.length ? `<div class="milestone-suggestions-v314cv"><small>UNCLAIMED DAILY ACTIVITIES · NO DOUBLE CREDIT</small>${native.map(r=>`<button type="button" class="milestone-suggestion-v314cv" data-milestone-daily="${escape(r.action)}"><span><strong>${escape(r.label)}</strong><small>Daily first reward still available</small></span><b>Open ›</b></button>`).join("")}<p>Daily bonuses are shown without made-up amounts; normal reward rules apply.</p></div>` : "";
    const focusMarkup = info.remain>0 && (info.metric==="coins" || info.metric==="storyEnergy" || info.metric==="xp" || (info.metric==="skill" && info.skill?.realm==="Work")) ? `<button type="button" class="milestone-focus-v314cv" data-milestone-open="week">◷ Log real Focus / Work time in Meine Woche › <small>Calculated from actual non-overlapping time, not an invented hourly payout.</small></button>` : "";
    setMarkup($("milestoneContent"),`<div class="milestone-progress-v314cv"><div><strong>${escape(info.title)}</strong><b>${info.remain>0?`${amount(info.remain)} ${escape(info.unit)} to go`:info.ready?"Ready ✦":""}</b></div><p>${escape(info.note)}</p>${skillPicker}</div>${opts?`<div class="milestone-suggestions-v314cv"><small>WAYS TO GET CLOSER · ESTIMATES</small>${opts}<p>Preview amounts may change with today's diminishing returns, skill routing and overlapping logs. You earn rewards only after completing an activity.</p></div>`:skillHelp||""}${nativeMarkup}${focusMarkup}<button type="button" class="secondary-button milestone-open-v314cv" data-milestone-open="${escape(info.open)}">Open ${escape(info.open==="shop"?"Shop":info.open==="story"?"Story":info.open==="growth"?"Growth":"Daily Plan")} ›</button>`);
  }
  function render() { renderChecklist();renderMilestone(); }
  function scheduleRender() { if (scheduled) return; scheduled=true; window.setTimeout(()=>{scheduled=false;render();},100); }
  $("dailyRewardsPanel")?.addEventListener("click",e=>{const action=e.target.closest?.("[data-daily-action]")?.dataset.dailyAction;if(action)openDaily(action);});
  $("milestonePanel")?.addEventListener("click",e=>{const daily=e.target.closest?.("[data-milestone-daily]")?.dataset.milestoneDaily;if(daily){openDaily(daily);return;}const dest=e.target.closest?.("[data-milestone-open]")?.dataset.milestoneOpen;if(dest)app.showView(dest);});
  $("milestonePanel")?.addEventListener("change",e=>{if(e.target.id==="milestoneSkillPick") {skillId=e.target.value;renderMilestone();}});
  $("milestoneTarget")?.addEventListener("change",e=>{selected=e.target.value;renderMilestone();});
  for(const type of ["life-rpg:render","life-rpg:state-saved","life-rpg:shop-changed"])window.addEventListener(type,scheduleRender);
  window.addEventListener("focus",scheduleRender);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleRender();});
  // No 1-second DOM rebuilding; static rewards are updated only after save/render events.
  window.LifeRPGDailyLife={version:"0.31.4cv",render,getChecklist,objective};
  render();
  window.LifeRPGStoryEngine?.loadPack?.().then(value=>{pack=value;scheduleRender();}).catch(()=>{/* Story UI handles pack errors itself; do not invent costs. */});
})();
