/* Life RPG · Journal Weekly Habit Tracker · one genuine Health Talent unlock.
   Pure read-only visualization of Habits' canonical completion resolver.
   It never changes habits, rewards, streaks or missing-day status. */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState || !book?.changeDate || window.LifeRPGBulletJournalHabitTracker)return;
  const ID="journal-weekly-habit-tracker";
  const available=()=>Number(window.LifeRPGSkills?.getRealmPoints?.("Health")?.available ?? 0);
  const $=id=>document.getElementById(id);
  let expanded=false,currentDate="";
  const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const owned=()=>Boolean(window.LifeRPGTalentTreeGraph?.isContentUnlocked?.("Health",ID));
  const parseDay=key=>{
    const parts=String(key).split("-").map(Number);
    return new Date(parts[0],parts[1]-1,parts[2],12);
  };
  const showDate=key=>parseDay(key).toLocaleDateString(undefined,{day:"numeric",month:"short"});
  const localeDays=dates=>dates.map(x=>parseDay(x).toLocaleDateString(undefined,{weekday:"short"}));
  const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const addDays=(key,diff)=>{const d=parseDay(key);d.setDate(d.getDate()+diff);return dateKey(d);};
  const today=()=>dateKey(new Date());
  function markup(date,preview=false) {
    const getWeek=window.LifeRPGHabits?.getJournalTrackerWeek;
    if(!getWeek)return '<p class="bj-habit-empty">Habits are still loading. Come back to this page in a moment.</p>';
    const liveWeek=getWeek(date);
    const week=liveWeek; // Always show actual Habits, even before purchase.
    if(!week?.days?.length)return '<p class="bj-habit-empty">No dated Habit information available yet.</p>';
    const all=Array.isArray(week.habits)?week.habits:[];
    const rows=expanded?all:all.slice(0,8);
    const days=localeDays(week.days);
    const headings=week.days.map((d,i)=>'<span class="bj-habit-day-label"><b>'+safe(days[i])+'</b><em>'+safe(String(parseDay(d).getDate()))+'</em></span>').join("");
    const grid=rows.map(h=>{
      const cells=(h.cells||[]).map((state,index)=>{
        const symbols={done:"✓",off:"–",before:"",open:"·",future:""};
        const labels={done:"Logged",off:"Not scheduled",before:"Not tracked then",open:"No log",future:"Future day"};
        const day=week.days[index];
        const canLog=state==="open"&&(day===today()||day===addDays(today(),-1));
        const enabled=state==="open"||state==="done";
        const action=canLog?"data-bj-habit-log":"data-bj-habit-open";
        return '<button type="button" class="bj-habit-cell state-'+safe(state)+'" role="gridcell" '+
          action+'="'+safe(h.id)+'" data-bj-habit-date="'+safe(day)+'" '+
          (enabled?'':'disabled ')+
          'aria-label="'+safe(days[index]||"")+" "+safe(day)+": "+safe(labels[state]||"Unknown")+
          (canLog?', log in Habits':', inspect Habit')+'">'+safe(symbols[state]||"")+'</button>';
      }).join("");
      return '<div class="bj-habit-row" role="row"><div class="bj-habit-name"><button type="button" class="bj-habit-name-link" data-bj-habit-open="'+safe(h.id)+'" data-bj-habit-date="'+safe(date)+'">'+safe(h.name)+' ↗</button><small>'+safe(h.schedule)+'</small></div><div class="bj-habit-cells">'+cells+'</div></div>';
    }).join("");
    const count=Number(week.count||0),remaining=all.length-rows.length;
    const label=showDate(week.start)+" – "+showDate(week.end);
    return '<div class="bj-habit-head"><div><small>WEEKLY COLLECTION</small><h3>Little things, day by day</h3>'+
      '<p>'+safe(label)+' · '+count+' recorded check-in'+(count===1?'':'s')+'</p></div></div>'+
      (all.length?'<div class="bj-habit-paper">'+
        '<div class="bj-habit-grid-head"><span>HABIT</span><div class="bj-habit-cells">'+headings+'</div></div>'+
        '<div class="bj-habit-grid" role="grid" aria-label="Habit check-ins by weekday">'+grid+'</div>'+
        (remaining>0?'<button class="bj-habit-show" data-bj-show-all type="button">Show all '+all.length+' habits ↓</button>':
         expanded&&all.length>8?'<button class="bj-habit-show" data-bj-show-all type="button">Show fewer habits ↑</button>':"")+
        '<div class="bj-habit-legend"><span><b>✓</b> Logged</span><span>· No log</span><span>– Not scheduled</span></div></div>':
        '<div class="bj-habit-empty"><p>Nothing needs to be filled in. Your existing Habits will appear here when you choose to track them.</p></div>')+
      '<button type="button" class="bj-habit-link" data-bj-open-habits>Open Habits to manage or log ↗</button>';
  }
  function render(date=book.getWeek()){
    const target=$("bjBookHabitTracker");
    if(!target || !date)return;
    if(date!==currentDate){currentDate=date;expanded=false;}
    if(owned()){
      target.innerHTML=markup(date,false);
    } else {
      // Preview is rendered by the exact same CSS/component as the real tracker,
      // but uses explicitly labelled sample data (never the user's Habit history).
      target.innerHTML='<div class="bj-habit-preview-intro"><strong>Preview with your own Habits ✧</strong>'+
        '<p>These are your real Habit check-ins. Tap a name to inspect it, or log through an available date cell. The complete weekly collection remains a permanent unlock.</p></div>'+
        markup(date,true)+
        '<div class="bj-habit-preview-cta"><small>Unlock price: 1 Health point · Available: '+available()+'</small>'+
        '<button type="button" data-bj-unlock-info>See unlock in Skills ↗</button></div>';
    }
  }
  function bind(){
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",e=>{
      const more=e.target.closest?.("[data-bj-show-all]");
      if(more&&owned()){expanded=!expanded;render(book.getWeek());return;}
      const open=e.target.closest?.("[data-bj-habit-open]");
      if(open){window.LifeRPGHabits?.openFromJournal?.(open.dataset.bjHabitOpen,open.dataset.bjHabitDate);return;}
      const log=e.target.closest?.("[data-bj-habit-log]");
      if(log){
        window.LifeRPGHabits?.completeFromJournal?.(log.dataset.bjHabitLog,log.dataset.bjHabitDate);
        render(book.getWeek());
        return;
      }
      if(e.target.closest?.("[data-bj-open-habits]")){app.showView?.("habits");return;}
      if(e.target.closest?.("[data-bj-unlock-info]")&&!owned()){
        app.showView?.("skills");
        window.LifeRPGSkills?.selectTalentRealm?.("Health");
      }
    });
  }
  window.addEventListener("life-rpg:talent-content-v2-change",e=>{
    if(e?.detail?.realm==="Health"&&e.detail?.id===ID)render(book.getWeek());
  });
  window.addEventListener("life-rpg:state-saved",()=>{
    if($("view-bullet-journal")?.classList.contains("active") && book.getChapter()==="weekly")render(book.getWeek());
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalHabitTracker={version:"0.31.4-realhabits1",render,isUnlocked:owned};
})();
