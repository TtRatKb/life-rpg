/* Life RPG · Journal Weekly Habit Tracker · one genuine Health Talent unlock.
   Pure read-only visualization of Habits' canonical completion resolver.
   It never changes habits, rewards, streaks or missing-day status. */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState || !book?.changeDate || window.LifeRPGBulletJournalHabitTracker)return;
  const ID="journal-weekly-habit-tracker";
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
    const week=preview ? {
      ...liveWeek,
      habits:[
        {name:"Read a chapter",schedule:"Daily",cells:["done","open","done","open","done","off","off"],checkIns:3},
        {name:"Take a cozy break",schedule:"3 days a week",cells:["off","done","off","open","done","off","off"],checkIns:2},
        {name:"A little fresh air",schedule:"Daily",cells:["open","done","open","done","open","off","future"],checkIns:2}
      ],
      count:7
    } : liveWeek;
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
      '<p>'+safe(label)+' · '+count+' recorded check-in'+(count===1?'':'s')+'</p></div></div>'+
      (all.length?'<div class="bj-habit-paper">'+
        '<div class="bj-habit-grid-head"><span>HABIT</span><div class="bj-habit-cells">'+headings+'</div></div>'+
        '<div class="bj-habit-grid" role="grid" aria-label="Habit check-ins by weekday">'+grid+'</div>'+
        (remaining>0?'<button class="bj-habit-show" data-bj-show-all type="button">Show all '+all.length+' habits ↓</button>':
         expanded&&all.length>8?'<button class="bj-habit-show" data-bj-show-all type="button">Show fewer habits ↑</button>':"")+
        '<div class="bj-habit-legend"><span><b>✓</b> Logged</span><span>· No log</span><span>– Not scheduled</span></div></div>':
        '<div class="bj-habit-empty"><p>Nothing needs to be filled in. Your existing Habits will appear here when you choose to track them.</p></div>')+
      (preview ? '' : '<button type="button" class="bj-habit-link" data-bj-open-habits>Open Habits to manage or log ↗</button>');
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
      target.innerHTML='<div class="bj-habit-preview-intro"><strong>Try before unlocking ✧</strong>'+
        '<p>This is the real tracker layout with example habits. Your own check-ins appear after you unlock it.</p></div>'+
        markup(date,true)+
        '<div class="bj-habit-preview-cta"><small>Health Talent · 1 Skillpoint</small>'+
        '<button type="button" data-bj-unlock-info>See unlock in Skills ↗</button></div>';
    }
  }
  function bind(){
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",e=>{
      const more=e.target.closest?.("[data-bj-show-all]");
      if(more&&owned()){expanded=!expanded;render(book.getWeek());return;}
      if(e.target.closest?.("[data-bj-open-habits]")&&owned()){app.showView?.("habits");return;}
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
  window.LifeRPGBulletJournalHabitTracker={version:"0.31.4-weekchapter1",render,isUnlocked:owned};
})();
