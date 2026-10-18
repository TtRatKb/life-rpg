/* Life RPG · Journal Daily Mini Habit Tracker.
   Uses the canonical weekly resolver for the selected date. Existing Habit/Quest
   actions are delegated to the native module; the Journal creates no new ledger. */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState || !book?.getDate || window.LifeRPGBulletJournalDailyTracker)return;
  const ID="journal-daily-mini-habit-tracker";
  const available=()=>Number(window.LifeRPGSkills?.getRealmPoints?.("Health")?.available ?? 0);
  const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
  const yesterday=()=>{const d=new Date();d.setDate(d.getDate()-1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
  const $=id=>document.getElementById(id);
  const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const owned=()=>Boolean(window.LifeRPGTalentTreeGraph?.isContentUnlocked?.("Health",ID));
  let expanded=false,collapsed=false,lastDate="",previewMode=false,previewSlot=null;
  function rowsFor(date) {
    const week=window.LifeRPGHabits?.getJournalTrackerWeek?.(date);
    const linked=new Set((window.LifeRPGHabits?.getHabits?.()||[]).filter(h=>h.linkedQuestId).map(h=>h.id));
    const index=week?.days?.indexOf(date)??-1;
    if(index<0)return null;
    return (week.habits||[]).map(h=>({
      id:h.id,linkedQuestId:linked.has(h.id),name:String(h.name||"Unnamed habit"),schedule:String(h.schedule||""),
      state:h.cells?.[index]||"before"
    })).filter(h=>h.state==="done"||h.state==="open");
  }
  function slot() {
    if(previewMode&&!owned()&&previewSlot)return previewSlot;
    return app.getState().journalBookLayoutV1?.dailyMiniSlot==="below"?"below":"above";
  }
  function positionCard() {
    const card=$("bjBookDailyMini"),records=$("bjBookRecorded");
    if(!card||!records)return;
    const parent=records.parentElement;
    if(slot()==="below")parent.insertBefore(card,records.nextElementSibling);
    else parent.insertBefore(card,records);
  }
  function rowMarkup(h,date) {
    const done=h.state==="done";
    const canLog=!done&&(date===today()||date===yesterday());
    const action=canLog?"data-bj-daily-log":"data-bj-daily-open";
    const label=canLog?(h.linkedQuestId&&date===today()?"Open linked Quest for ":"Log ")+h.name:
      (done?"Already logged: ":"View Habit: ")+h.name;
    return '<li class="bj-daily-mini-row'+(done?" is-done":" is-open")+'">'+
      '<button type="button" class="bj-daily-mini-name" data-bj-daily-open="'+safe(h.id)+'" '+
        'data-bj-habit-date="'+safe(date)+'" title="'+safe(h.name)+'">'+safe(h.name)+' <span aria-hidden="true">↗</span></button>'+
      '<small class="bj-daily-mini-frequency">'+safe(h.schedule)+'</small>'+
      '<button type="button" class="bj-daily-mini-check" '+action+'="'+safe(h.id)+'" '+
        'data-bj-habit-date="'+safe(date)+'" aria-label="'+safe(label)+'" title="'+safe(label)+'">'+
        (done?"✓":h.linkedQuestId&&date===today()?"↗":"·")+'</button>'+
      '</li>';
  }
  function render(date=book.getDate()) {
    const host=$("bjBookDailyMini");
    if(!host||!date)return;
    if(lastDate!==date){expanded=false;lastDate=date;}
    const unlocked=owned();
    const layoutVisible=unlocked||previewMode;
    const previewOnly=previewMode&&!unlocked;
    // The preview shows the same actual Habit/Quest data as the unlocked card.
    const all=rowsFor(date);
    const visible=all===null?null:(!layoutVisible||expanded?all:all.slice(0,8));
    host.innerHTML='<section class="bj-daily-mini-paper'+(layoutVisible?' is-unlocked':' is-preview')+'">'+
      '<div class="bj-daily-mini-head"><div><small>✦ DAILY HABIT MINI</small>'+
      '<h3>Little things today</h3></div>'+
      (layoutVisible?'<button type="button" data-bj-daily-collapse aria-expanded="'+(!collapsed)+'" class="bj-daily-mini-collapse">'+(collapsed?'Show':'Hide')+'</button>':'')+
      '</div>'+
      (!layoutVisible?'<p class="bj-daily-mini-preview-label">Your real Habits · Tap a square to log or a name for details.</p>':'')+
      (previewOnly?'<div class="bj-daily-mini-preview-mode"><span>✧ Layout preview · no points spent</span><button type="button" data-bj-daily-exit-preview>Exit preview</button></div>':'')+
      (!collapsed||!layoutVisible?
        (visible===null?'<p class="bj-daily-mini-empty">Habits are still loading.</p>':
         visible.length?'<ul class="bj-daily-mini-rows" aria-label="Daily habit status">'+visible.map(h=>rowMarkup(h,date)).join("")+'</ul>':
           '<p class="bj-daily-mini-empty">No scheduled habits on this page. A quiet day is still a page worth keeping.</p>')+
        (layoutVisible&&all?.length>8?'<button type="button" data-bj-daily-more class="bj-daily-mini-more">'+(expanded?'Show fewer':('Show all '+all.length))+' habits</button>':'')+
        '<div class="bj-daily-mini-legend"><span>✓ Logged</span><span>· Not logged</span></div>'
        :'<p class="bj-daily-mini-muted">Tracker folded away for now.</p>')+
      (layoutVisible?
       '<div class="bj-daily-mini-footer"><button type="button" data-bj-daily-move>Move '+(slot()==="above"?"below":"above")+' moments ↕</button>'+
       '<button type="button" data-bj-daily-habits>Open Habits ↗</button></div>':
       '<div class="bj-daily-mini-cta"><span>Layout: 1 Health point · Available: '+available()+'</span>'+
       '<button type="button" data-bj-daily-unlock>See layout unlock ↗</button></div>')+
      '</section>';
    positionCard();
  }
  function move() {
    if(!owned()&&previewMode){previewSlot=slot()==="above"?"below":"above";render();return;}
    if(!owned())return;
    const state=app.getState(),old=state.journalBookLayoutV1;
    state.journalBookLayoutV1={
      ...(old||{}),schemaVersion:1,
      dailyMiniSlot:slot()==="above"?"below":"above"
    };
    if(app.saveState({source:"bullet-journal-daily-mini-layout",suppressUiRefresh:true})===false){
      if(old===undefined)delete state.journalBookLayoutV1;
      else state.journalBookLayoutV1=old;
      return;
    }
    render();
  }
  function exitPreview(){
    if(!previewMode)return;
    previewMode=false;previewSlot=null;collapsed=false;expanded=false;
    render();
  }
  function openPreview(){
    if(owned())return Boolean(book.open?.());
    previewMode=true;previewSlot=null;collapsed=false;expanded=false;
    const opened=book.open?.();
    if(!opened){exitPreview();return false;}
    render(book.getDate());
    $("bjBookDailyMini")?.scrollIntoView?.({block:"center",behavior:"auto"});
    return true;
  }
  function bind() {
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",e=>{
      if(e.target.closest?.("[data-bj-daily-exit-preview]")){exitPreview();return;}
      const open=e.target.closest?.("[data-bj-daily-open]");
      if(open){window.LifeRPGHabits?.openFromJournal?.(open.dataset.bjDailyOpen,open.dataset.bjHabitDate);return;}
      const log=e.target.closest?.("[data-bj-daily-log]");
      if(log){
        window.LifeRPGHabits?.completeFromJournal?.(log.dataset.bjDailyLog,log.dataset.bjHabitDate);
        render();
        return;
      }
      if(e.target.closest?.("[data-bj-daily-unlock]")&&!owned()){
        if(!window.LifeRPGTalentTreeGraph?.focusContent?.("Health",ID)){
          app.showView?.("skills");
          window.LifeRPGSkills?.selectTalentRealm?.("Health");
        }
      }else if(e.target.closest?.("[data-bj-daily-habits]")&&(owned()||previewMode)){
        app.showView?.("habits");
      }else if(e.target.closest?.("[data-bj-daily-more]")&&(owned()||previewMode)){
        expanded=!expanded;render();
      }else if(e.target.closest?.("[data-bj-daily-collapse]")&&(owned()||previewMode)){
        collapsed=!collapsed;render();
      }else if(e.target.closest?.("[data-bj-daily-move]")&&(owned()||previewMode)){
        move();
      }
    });
  }
  window.addEventListener("life-rpg:view-changed",e=>{
    if(e?.detail?.view!=="bullet-journal"&&previewMode){previewMode=false;previewSlot=null;collapsed=false;expanded=false;}
  });
  window.addEventListener("life-rpg:talent-content-v2-change",e=>{
    if(e?.detail?.realm==="Health"&&e.detail?.id===ID)render();
  });
  window.addEventListener("life-rpg:state-saved",()=>{
    if($("view-bullet-journal")?.classList.contains("active")&&book.getChapter()==="daily")render();
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalDailyTracker={version:"0.31.4-journalux2b",render,isUnlocked:owned,rowsFor,openPreview,exitPreview};
})();
