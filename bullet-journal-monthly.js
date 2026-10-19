/* Life RPG Monthly Journal · read-only live layout pilot, no purchase. */
(() => {
  "use strict";
  const book=window.LifeRPGBulletJournalBook;
  if(!book?.getMonth||window.LifeRPGBulletJournalMonthly)return;
  const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const firstDate=month=>{
    const m=/^(\d{4})-(\d{2})-01$/.exec(String(month||""));
    if(!m||Number(m[2])<1||Number(m[2])>12)return null;
    return new Date(+m[1],+m[2]-1,1,12);
  };
  function monthData(month) {
    const first=firstDate(month);
    if(!first)return {days:[],habits:[],checks:0,ready:false};
    const count=new Date(first.getFullYear(),first.getMonth()+1,0,12).getDate();
    const days=Array.from({length:count},(_,i)=>key(new Date(first.getFullYear(),first.getMonth(),i+1,12)));
    const calendar=new Map(days.map(date=>[date,{date,done:[]}]));
    const resolver=window.LifeRPGHabits?.getJournalTrackerWeek;
    if(typeof resolver!=="function")return {days:[...calendar.values()],habits:[],checks:0,ready:false};
    const habits=new Map(),offset=(first.getDay()+6)%7;
    for(let i=-offset;i<count;i+=7) {
      const week=resolver(key(new Date(first.getFullYear(),first.getMonth(),1+i,12)));
      for(const item of week?.habits||[]) {
        if(!item?.id)continue;
        let row=habits.get(item.id);
        if(!row) {
          row={id:item.id,name:String(item.name||"Unnamed habit"),
            schedule:String(item.schedule||""),dates:[],relevant:false};
          habits.set(item.id,row);
        }
        week.days.forEach((date,j)=>{
          const calendarDay=calendar.get(date),state=item.cells?.[j];
          if(!calendarDay)return;
          if(state==="done") {
            if(!row.dates.includes(date))row.dates.push(date);
            if(!calendarDay.done.includes(item.id))calendarDay.done.push(item.id);
          }
          if(state==="done"||state==="open")row.relevant=true;
        });
      }
    }
    return {days:[...calendar.values()],
      habits:[...habits.values()].filter(row=>row.relevant||row.dates.length),
      checks:[...calendar.values()].reduce((total,item)=>total+item.done.length,0),
      ready:true};
  }
  function calendarHTML(month,data){
    const first=firstDate(month),offset=(first.getDay()+6)%7;
    const names=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const header=names.map(n=>'<span class="bj-month-weekday" aria-label="'+n+'">'+n[0]+'</span>').join("");
    const padding='<span class="bj-month-pad" aria-hidden="true"></span>'.repeat(offset);
    const now=key(new Date());
    const cells=data.days.map(day=>{
      const checkins=day.done.length,disabled=day.date>now;
      const info=day.date+": "+checkins+" recorded Habit check-in"+(checkins===1?"":"s");
      return '<button type="button" data-bj-month-day="'+esc(day.date)+'" '+
        'class="bj-month-day'+(checkins?" has-stamps":"")+(day.date===now?" is-today":"")+'" '+
        'aria-label="'+esc(info)+'" '+(disabled?"disabled":"")+'>'+
        '<span class="bj-month-number">'+Number(day.date.slice(-2))+'</span>'+
        (checkins?'<span class="bj-month-petals" aria-hidden="true">'+
          "✿".repeat(Math.min(3,checkins))+
          (checkins>3?"<sup>+"+(checkins-3)+"</sup>":"")+'</span>':
          '<span class="bj-month-quiet" aria-hidden="true">·</span>')+
        '</button>';
    }).join("");
    return '<div class="bj-month-calendar-grid">'+header+padding+cells+'</div>'+
      '<p class="bj-month-legend">✿ Existing Habit or linked Quest check-in · Empty days carry no penalty.</p>';
  }
  function ritualsHTML(data){
    if(!data.ready)return '<p class="bj-month-empty">Your Habits will appear when the tracker finishes loading.</p>';
    if(!data.habits.length)return '<p class="bj-month-empty">No Habits here yet. A quiet month belongs in your journal too.</p>';
    return '<div class="bj-month-summary"><span aria-hidden="true">✾</span>'+
      '<div><strong>'+data.checks+' little check-ins</strong><small>Already recorded in your usual Habits</small></div></div>'+
      '<div class="bj-month-rituals" role="list">'+data.habits.map(item=>{
        const dates=item.dates.slice(0,9).map(date=>
          '<button type="button" data-bj-month-day="'+esc(date)+'" aria-label="Open '+esc(date)+
          '">'+Number(date.slice(-2))+'</button>').join("");
        return '<article class="bj-month-ritual" role="listitem">'+
          '<div class="bj-month-ritual-head"><button type="button" data-bj-month-habit="'+esc(item.id)+'">'+
          esc(item.name)+' ↗</button><span>'+item.dates.length+' ×</span></div>'+
          '<small>'+esc(item.schedule)+'</small>'+
          (item.dates.length?'<div class="bj-month-flowers">'+dates+
            (item.dates.length>9?'<span>+'+(item.dates.length-9)+' more</span>':"")+'</div>':
            '<p class="bj-month-no-stamps">Space for another day.</p>')+'</article>';
      }).join("")+'</div>';
  }
  function render(month=book.getMonth()){
    if(!firstDate(month))return false;
    const data=monthData(month);
    const calendar=document.getElementById("bjBookMonthCalendar"),
      collection=document.getElementById("bjBookMonthCollection");
    if(!calendar||!collection)return false;
    calendar.innerHTML=calendarHTML(month,data);
    collection.innerHTML=ritualsHTML(data)+
      '<div class="bj-month-preview-foot"><strong>Monthly pages · early live preview</strong>'+
      '<p>Uses real Habit data. No points are spent; no paid layout is offered before your feedback.</p></div>';
    return true;
  }
  function bind(){
    const view=document.getElementById("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-bj-month-habit]");
      if(button)window.LifeRPGHabits?.openFromJournal?.(button.dataset.bjMonthHabit);
      // The book's existing day-navigation listener handles every month-day button.
    });
    window.addEventListener("life-rpg:state-saved",()=>{
      if(book.getChapter?.()==="monthly")render();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalMonthly={version:"0.31.4-monthly-preview1",render,monthData};
})();