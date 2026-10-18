/* Life RPG: free daily Bullet Journal book. Notes live in journal.entries[date].bookNote. */
(() => {
  "use strict";
  const app = window.LifeRPGApp;
  const journal = window.LifeRPGJournal;
  if (!app?.getState || !app?.saveState || !journal?.getEntry || window.LifeRPGBulletJournalBook) return;
  const VERSION = "0.31.4-book1";
  const htmlEscape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const get = id => document.getElementById(id);
  const dateKey = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
  const today = () => dateKey(new Date());
  function dayDate(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key||""));
    if (!m) return null;
    const date = new Date(+m[1], +m[2]-1, +m[3], 12);
    return dateKey(date)===key ? date : null;
  }
  const shifted = (key,by) => { const d=dayDate(key);d.setDate(d.getDate()+by);return dateKey(d); };
  const entryFor = key => app.getState().journal?.entries?.[key] || {};
  const noteFor = key => typeof entryFor(key).bookNote==="string" ? entryFor(key).bookNote : "";
  let dialog=null,activeDay="",savedNote="",dirty=false,saveTimer=null;
  function noteStatus(value) { const el=get("bjBookStatus");if(el)el.textContent=value; }
  function getActivities(key) {
    const events=app.getState().rewardLedger?.events || [];
    return events.filter(e => {
      if(!e||e.duplicate||!e.at||!e.label||String(e.source||"").startsWith("journal")||e.source==="daily-checkin")return false;
      const d=new Date(e.at);
      return Number.isFinite(d.getTime())&&dateKey(d)===key;
    }).slice().sort((a,b)=>new Date(a.at)-new Date(b.at));
  }
  function dayContents(key) {
    const entry=entryFor(key);
    const metricLabels={mood:"Mood",energy:"Energy",sleep:"Sleep",stress:"Stress"};
    const metrics=Object.entries(metricLabels).filter(([field])=>entry[field]);
    const fields=[
      ["gratitude","Something I'm grateful for"],["smallWin","Something that went well"],
      ["hardThing","Something that was hard"],["yearQuestion","365 Question"]
    ];
    const answered=fields.filter(([field])=>typeof entry[field]==="string" && entry[field].trim());
    const events=getActivities(key);
    let blocks="";
    if(metrics.length)blocks+='<div class="bj-book-metrics">'+metrics.map(([id,label])=>'<span><strong>'+label+'</strong> '+htmlEscape(entry[id])+'</span>').join("")+'</div>';
    for(const [id,label] of answered){
      const title=id==="yearQuestion"&&entry.yearQuestionPrompt?entry.yearQuestionPrompt:label;
      blocks+='<section class="bj-book-answer"><small>'+htmlEscape(title)+'</small><p>'+htmlEscape(entry[id])+'</p></section>';
    }
    const mins=(app.getState().timeTracking?.entries||[]).reduce((total,item)=>{
      const start=new Date(item?.startAt||0);
      return Number.isFinite(start.getTime())&&dateKey(start)===key?total+Math.max(0,Math.min(1440,Number(item.minutes)||0)):total;
    },0);
    if(mins>0)blocks+='<p class="bj-book-time">◷ '+Math.round(mins)+' minutes recorded in Focus & Time</p>';
    if(events.length){
      blocks+='<section class="bj-book-events"><h4>✦ Recorded moments</h4><ul>'+events.slice(0,8).map(e=>'<li>'+htmlEscape(String(e.label).slice(0,140))+'</li>').join("")+'</ul>';
      if(events.length>8)blocks+='<small>+'+(events.length-8)+' more in Activity & Rewards</small>';
      blocks+='</section>';
    }
    return blocks || '<p class="bj-book-quiet">Space for a day that belongs to you.</p>';
  }
  function ensureButton() {
    const parent=document.querySelector("#view-journal .journal-hero-actions-v302");
    if(!parent||get("bulletJournalBookOpen"))return;
    const button=document.createElement("button");
    button.type="button";button.id="bulletJournalBookOpen";button.className="primary-button bj-open-button";
    button.textContent="📖 Open my book";button.addEventListener("click",()=>open());
    parent.prepend(button);
  }
  function ensureDialog(){
    if(dialog?.isConnected)return dialog;
    dialog=document.createElement("dialog");
    dialog.id="bulletJournalBookDialog";
    dialog.className="bj-book-dialog";
    dialog.setAttribute("aria-label","My Bullet Journal");
    dialog.innerHTML =
      '<div class="bj-book-shell"><header class="bj-book-toolbar">'+
        '<div class="bj-book-title"><small>BULLET JOURNAL · MY LIFE</small><h2>My Journal</h2></div>'+
        '<nav class="bj-book-nav" aria-label="Journal dates">'+
          '<button type="button" data-bj-action="prev" aria-label="Previous day">‹</button>'+
          '<input id="bjBookDate" type="date" aria-label="Choose journal date">'+
          '<button type="button" data-bj-action="next" aria-label="Next day">›</button>'+
          '<button type="button" data-bj-action="today">Today</button></nav>'+
        '<button type="button" class="bj-book-close" data-bj-action="close" aria-label="Close book">×</button>'+
      '</header><div class="bj-book-spread">'+
        '<section class="bj-book-page bj-book-writing">'+
          '<div class="bj-book-page-inner"><small>DAILY PAGE</small><h3 id="bjBookDayTitle"></h3>'+
          '<label for="bjBookText">Free writing</label>'+
          '<textarea id="bjBookText" spellcheck="true" placeholder="Anything on your mind…"></textarea>'+
          '<div class="bj-book-actions"><span id="bjBookStatus" role="status" aria-live="polite"></span>'+
          '<button type="button" class="secondary-button" data-bj-action="save">Save page</button></div></div>'+
        '</section>'+
        '<section class="bj-book-page bj-book-recorded">'+
          '<div class="bj-book-page-inner"><small>THE DAY AS IT HAPPENED</small><h3>Moments & reflections</h3>'+
          '<div id="bjBookRecorded" class="bj-book-records"></div>'+
          '<button type="button" class="bj-book-edit" data-bj-action="reflect">Edit saved reflections ↗</button>'+
          '</div></section>'+
      '</div><footer class="bj-book-footer">Start with a simple book. Make it yours as you go. ♡</footer></div>';
    dialog.addEventListener("click",e=>{
      const button=e.target.closest?.("[data-bj-action]");
      if(!button){if(e.target===dialog)close();return;}
      const action=button.dataset.bjAction;
      if(action==="close")close();
      if(action==="save")save(true);
      if(action==="prev")changeDate(shifted(activeDay,-1));
      if(action==="next")changeDate(shifted(activeDay,1));
      if(action==="today")changeDate(today());
      if(action==="reflect"){
        const selected=activeDay;
        if(close())journal.openDayEditor?.(selected);
      }
    });
    dialog.addEventListener("cancel",e=>{if(dirty&&!save()){e.preventDefault();}});
    dialog.addEventListener("close",()=>{if(dirty)save();clearTimeout(saveTimer);});
    dialog.querySelector("#bjBookDate").addEventListener("change",e=>changeDate(e.target.value));
    dialog.querySelector("#bjBookText").addEventListener("input",()=>{
      dirty=true;noteStatus("Unsaved changes");
      clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),800);
    });
    document.body.appendChild(dialog);return dialog;
  }
  function save(showToast=false) {
    clearTimeout(saveTimer);
    if(!dirty)return true;
    const value=get("bjBookText")?.value;
    if(value===undefined)return false;
    if(value===savedNote){dirty=false;noteStatus("Saved");return true;}
    const root=app.getState();
    root.journal ||= {schemaVersion:2,entries:{},migrations:{}};
    root.journal.entries ||= {};
    const entry=root.journal.entries[activeDay] ||= {date:activeDay,createdAt:Date.now()};
    entry.bookNote=value;
    entry.updatedAt=Date.now();
    if(app.saveState({source:"bullet-journal-book-note",suppressUiRefresh:true})===false){
      noteStatus("Could not save. Please check your save status.");return false;
    }
    savedNote=value;dirty=false;noteStatus("Saved ✓");
    if(showToast)app.showToast?.("📖 Page saved");
    return true;
  }
  function renderDay(){
    const d=ensureDialog();
    d.querySelector("#bjBookDate").value=activeDay;
    d.querySelector("#bjBookDate").max=today();
    d.querySelector('[data-bj-action="next"]').disabled=activeDay===today();
    d.querySelector("#bjBookDayTitle").textContent=dayDate(activeDay).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    d.querySelector("#bjBookText").value=noteFor(activeDay);
    savedNote=noteFor(activeDay);dirty=false;
    noteStatus(savedNote?"Saved":"Your words stay yours");
    d.querySelector("#bjBookRecorded").innerHTML=dayContents(activeDay);
  }
  function changeDate(target){
    if(!dayDate(target)||target>today()){noteStatus("Choose today or an earlier date");return false;}
    if(!save())return false;
    activeDay=target;renderDay();return true;
  }
  function open(target=today()){
    ensureButton();
    if(!dayDate(target)||target>today())target=today();
    const d=ensureDialog();
    if(d.open)return changeDate(target);
    activeDay=target;renderDay();d.showModal();
    d.querySelector("#bjBookText").focus();
    return true;
  }
  function close(){if(!save())return false;if(dialog?.open)dialog.close();return true;}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureButton,{once:true});
  else ensureButton();
  window.LifeRPGBulletJournalBook={version:VERSION,open,close,save,changeDate,getDate:()=>activeDay};
})();
