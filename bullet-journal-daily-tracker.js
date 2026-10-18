/* Life RPG · Journal Daily Mini Habit Tracker.
   The purchased card reads the canonical weekly resolver for exactly one date.
   It is display-only: no habit, quest, XP, streak or ledger mutations. */
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
  let expanded=false,collapsed=false,lastDate="";
  function rowsFor(date) {
    const week=window.LifeRPGHabits?.getJournalTrackerWeek?.(date);
    const index=week?.days?.indexOf(date)??-1;
    if(index<0)return null;
    return (week.habits||[]).map(h=>({
      id:h.id,name:String(h.name||"Unnamed habit"),schedule:String(h.schedule||""),
      state:h.cells?.[index]||"before"
    })).filter(h=>h.state==="done"||h.state==="open");
  }
  function slot() {
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
    const canLog=h.state==="open"&&(date===today()||date===yesterday());
    return '<li class="bj-daily-mini-row '+(h.state==="done"?"is-done":"is-open")+'">'+
      '<span class="bj-daily-mini-stamp" aria-hidden="true">'+(h.state==="done"?"✓":"·")+'</span>'+
      '<span class="bj-daily-mini-name"><button type="button" data-bj-daily-open="'+safe(h.id)+'" data-bj-habit-date="'+safe(date)+'">'+safe(h.name)+' ↗</button>'+
      (h.schedule?'<small>'+safe(h.schedule)+'</small>':"")+'</span>'+
      (canLog?'<button class="bj-daily-mini-log" type="button" data-bj-daily-log="'+safe(h.id)+'" data-bj-habit-date="'+safe(date)+'">Log done</button>':
      '<small class="bj-daily-mini-state">'+(h.state==="done"?"Logged":"Not logged")+'</small>')+'</li>';
  }
  function render(date=book.getDate()) {
    const host=$("bjBookDailyMini");
    if(!host||!date)return;
    if(lastDate!==date){expanded=false;lastDate=date;}
    const unlocked=owned();
    // The preview shows the same actual Habit/Quest data as the unlocked card.
    const all=rowsFor(date);
    const visible=all===null?null:(expanded?all:all.slice(0,5));
    host.innerHTML='<section class="bj-daily-mini-paper'+(unlocked?' is-unlocked':' is-preview')+'">'+
      '<div class="bj-daily-mini-head"><div><small>✦ DAILY HABIT MINI</small>'+
      '<h3>Little things today</h3></div>'+
      (unlocked?'<button type="button" data-bj-daily-collapse aria-expanded="'+(!collapsed)+'" class="bj-daily-mini-collapse">'+(collapsed?'Show':'Hide')+'</button>':'')+
      '</div>'+
      (!unlocked?'<p class="bj-daily-mini-preview-label"><strong>Your real Habits · live preview</strong> Tap a name to see the full Habit. You can log eligible Habits here; the paid unlock adds notebook layout controls.</p>':'')+
      (!collapsed||!unlocked?
        (visible===null?'<p class="bj-daily-mini-empty">Habits are still loading.</p>':
         visible.length?'<ul class="bj-daily-mini-rows" aria-label="Daily habit status">'+visible.map(h=>rowMarkup(h,date)).join("")+'</ul>':
           '<p class="bj-daily-mini-empty">No scheduled habits on this page. A quiet day is still a page worth keeping.</p>')+
        (unlocked&&all?.length>5?'<button type="button" data-bj-daily-more class="bj-daily-mini-more">'+(expanded?'Show fewer':('Show all '+all.length))+' habits</button>':'')+
        '<div class="bj-daily-mini-legend"><span>✓ Logged</span><span>· Not logged</span></div>'
        :'<p class="bj-daily-mini-muted">Tracker folded away for now.</p>')+
      (unlocked?
       '<div class="bj-daily-mini-footer"><button type="button" data-bj-daily-move>Move '+(slot()==="above"?"below":"above")+' moments ↕</button>'+
       '<button type="button" data-bj-daily-habits>Open Habits ↗</button></div>':
       '<div class="bj-daily-mini-cta"><span>Layout unlock: 1 Health point · Available: '+available()+'</span>'+
       '<button type="button" data-bj-daily-unlock>See layout unlock ↗</button></div>')+
      '</section>';
    positionCard();
  }
  function move() {
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
  function bind() {
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",e=>{
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
      }else if(e.target.closest?.("[data-bj-daily-habits]")&&owned()){
        app.showView?.("habits");
      }else if(e.target.closest?.("[data-bj-daily-more]")&&owned()){
        expanded=!expanded;render();
      }else if(e.target.closest?.("[data-bj-daily-collapse]")&&owned()){
        collapsed=!collapsed;render();
      }else if(e.target.closest?.("[data-bj-daily-move]")&&owned()){
        move();
      }
    });
  }
  window.addEventListener("life-rpg:talent-content-v2-change",e=>{
    if(e?.detail?.realm==="Health"&&e.detail?.id===ID)render();
  });
  window.addEventListener("life-rpg:state-saved",()=>{
    if($("view-bullet-journal")?.classList.contains("active")&&book.getChapter()==="daily")render();
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalDailyTracker={version:"0.31.4-realhabits1",render,isUnlocked:owned,rowsFor};
})();
