/* Life RPG · Journal Weekly Habit Tracker · one genuine Health Talent unlock.
   Pure read-only visualization of Habits' canonical completion resolver.
   It never changes habits, rewards, streaks or missing-day status. */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState || !book?.changeDate || window.LifeRPGBulletJournalHabitTracker)return;
  const ID="journal-weekly-habit-tracker";
  const $=id=>document.getElementById(id);
  let mode="weekly",expanded=false,wasOwned=false,currentDate="";
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
  function markup(date) {
    const getWeek=window.LifeRPGHabits?.getJournalTrackerWeek;
    if(!getWeek)return '<p class="bj-habit-empty">Habits are still loading. Come back to this page in a moment.</p>';
    const week=getWeek(date);
    if(!week?.days?.length)return '<p class="bj-habit-empty">No dated Habit information available yet.</p>';
    const all=Array.isArray(week.habits)?week.habits:[];
    const rows=expanded?all:all.slice(0,8);
    const days=localeDays(week.days);
    const headings=week.days.map((d,i)=>'<span class="bj-habit-day-label"><b>'+safe(days[i])+'</b><em>'+safe(String(parseDay(d).getDate()))+'</em></span>').join("");
    const grid=rows.map(h=>{
      const cells=(h.cells||[]).map((state,index)=>{
        const symbols={done:"✓",off:"–",before:"",open:"·",future:""};
        const labels={done:"Logged",off:"Not scheduled",before:"Not tracked then",open:"No log",future:"Future day"};
        return '<span class="bj-habit-cell state-'+safe(state)+'" role="gridcell" aria-label="'+safe(days[index]||"")+" "+safe(week.days[index]||"")+": "+safe(labels[state]||"Unknown")+'">'+safe(symbols[state]||"")+'</span>';
      }).join("");
      return '<div class="bj-habit-row" role="row"><div class="bj-habit-name"><strong>'+safe(h.name)+'</strong><small>'+safe(h.schedule)+'</small></div><div class="bj-habit-cells">'+cells+'</div></div>';
    }).join("");
    const count=Number(week.count||0),remaining=all.length-rows.length;
    const label=showDate(week.start)+" – "+showDate(week.end);
    return '<div class="bj-habit-head"><div><small>WEEKLY COLLECTION</small><h3>Little things, day by day</h3>'+
      '<p>'+safe(label)+' · '+count+' recorded check-in'+(count===1?'':'s')+'</p></div>'+
      '<nav aria-label="Navigate tracker weeks" class="bj-habit-week-controls">'+
      '<button data-bj-week="-7" type="button" aria-label="Previous week">‹</button>'+
      '<button data-bj-week="7" type="button" aria-label="Next week" '+(addDays(date,7)>today()?'disabled':'')+'>›</button></nav></div>'+
      (all.length?'<div class="bj-habit-paper">'+
        '<div class="bj-habit-grid-head"><span>HABIT</span><div class="bj-habit-cells">'+headings+'</div></div>'+
        '<div class="bj-habit-grid" role="grid" aria-label="Habit check-ins by weekday">'+grid+'</div>'+
        (remaining>0?'<button class="bj-habit-show" data-bj-show-all type="button">Show all '+all.length+' habits ↓</button>':
         expanded&&all.length>8?'<button class="bj-habit-show" data-bj-show-all type="button">Show fewer habits ↑</button>':"")+
        '<div class="bj-habit-legend"><span><b>✓</b> Logged</span><span>· No log</span><span>– Not scheduled</span></div></div>':
        '<div class="bj-habit-empty"><p>Nothing needs to be filled in. Your existing Habits will appear here when you choose to track them.</p></div>')+
      '<button type="button" class="bj-habit-link" data-bj-open-habits>Open Habits to manage or log ↗</button>';
  }
  function render(date=book.getDate()){
    const tabs=$("bjBookTrackerTabs"),records=$("bjBookRecorded"),tracker=$("bjBookHabitTracker");
    if(!tabs||!records||!tracker)return;
    const has=owned();
    if(!has){wasOwned=false;tabs.hidden=true;records.hidden=false;tracker.hidden=true;tracker.innerHTML="";return;}
    if(!wasOwned){mode="weekly";expanded=false;wasOwned=true;}
    if(date!==currentDate){currentDate=date;expanded=false;}
    tabs.hidden=false;
    tabs.querySelectorAll("[data-bj-tracker-mode]").forEach(btn=>{
      btn.setAttribute("aria-pressed",String(btn.dataset.bjTrackerMode===mode));
    });
    records.hidden=mode!=="recorded";
    tracker.hidden=mode!=="weekly";
    const heading=$("view-bullet-journal")?.querySelector(".bj-book-recorded .bj-book-page-inner>h2");
    if(heading)heading.textContent=mode==="weekly"?"Weekly Habit Tracker":"Moments & reflections";
    const edit=$("view-bullet-journal")?.querySelector(".bj-book-edit");
    if(edit)edit.hidden=mode!=="recorded";
    if(mode==="weekly")tracker.innerHTML=markup(date);
  }
  function bind(){
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",e=>{
      const change=e.target.closest?.("[data-bj-tracker-mode]");
      if(change){
        if(!owned())return;
        mode=change.dataset.bjTrackerMode==="recorded"?"recorded":"weekly";
        render(book.getDate());return;
      }
      const week=e.target.closest?.("[data-bj-week]");
      if(week&&owned()){book.changeDate(addDays(book.getDate(),Number(week.dataset.bjWeek)));return;}
      const more=e.target.closest?.("[data-bj-show-all]");
      if(more&&owned()){expanded=!expanded;render(book.getDate());return;}
      if(e.target.closest?.("[data-bj-open-habits]")&&owned())app.showView?.("habits");
    });
  }
  window.addEventListener("life-rpg:talent-content-v2-change",e=>{
    if(e?.detail?.realm==="Health"&&e.detail?.id===ID)render();
  });
  window.addEventListener("life-rpg:state-saved",()=>{
    if($("view-bullet-journal")?.classList.contains("active"))render();
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalHabitTracker={version:"0.31.4-journal-habits1",render,isUnlocked:owned};
})();