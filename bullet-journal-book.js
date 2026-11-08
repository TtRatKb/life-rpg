/* Life RPG: free daily Bullet Journal book. Notes live in journal.entries[date].bookNote. */
(() => {
  "use strict";
  const app = window.LifeRPGApp;
  const journal = window.LifeRPGJournal;
  if (!app?.getState || !app?.saveState || !journal?.getEntry || window.LifeRPGBulletJournalBook) return;
  const VERSION = "0.31.4-journal-ink2";
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
  let bookView=null,activeDay="",activeWeek="",activeMonth="",chapter="daily",savedNote="",dirty=false,saveTimer=null;
  const pendingPrompts=new Map();
  const pendingExtras=new Map();
  const EXTRA_FIELDS=["focusText","intentionText","happyMomentsText"];
  const PROMPTS=[
    ["gratitude","🌸","One thing I'm grateful for","Even the tiniest thing counts…"],
    ["smallWin","✦","Something that went well","A little win is still a win…"],
    ["hardThing","☁","Something that felt difficult","You don't have to solve it here…"],
    ["yearQuestion","☾","365 Question","Your answer, in your own words…"]
  ];
  const monday=key=>{const d=dayDate(key);if(!d)return null;d.setDate(d.getDate()-(d.getDay()+6)%7);return dateKey(d);};
  const weekDate=(key,offset)=>{const d=dayDate(monday(key));d.setDate(d.getDate()+offset);return dateKey(d);};
  const monthStart=key=>{const d=dayDate(key);return d?dateKey(new Date(d.getFullYear(),d.getMonth(),1,12)):null;};
  const shiftMonth=(key,by)=>{const d=dayDate(key);return d?dateKey(new Date(d.getFullYear(),d.getMonth()+by,1,12)):null;};
  const weekTitle=key=>{
    const start=dayDate(monday(key)),end=dayDate(weekDate(key,6));
    const opts={day:"numeric",month:"short"};
    return start.toLocaleDateString(undefined,opts)+" – "+end.toLocaleDateString(undefined,{...opts,year:"numeric"});
  };
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
    const events=getActivities(key);
    let blocks="";
    if(metrics.length)blocks+='<div class="bj-book-metrics">'+metrics.map(([id,label])=>'<span><strong>'+label+'</strong> '+htmlEscape(entry[id])+'</span>').join("")+'</div>';
    // Reflections render as editable fields above; don't display them twice.
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
  function ensureView(){
    if(bookView?.isConnected)return bookView;
    // Real Life RPG view, not a modal: fills the app's available page space and
    // participates in the normal sidebar / back navigation.
    const main=document.querySelector(".app-shell > main");
    if(!main)return null;
    bookView=document.createElement("section");
    bookView.id="view-bullet-journal";
    bookView.className="view bj-book-view";
    bookView.setAttribute("aria-label","My Bullet Journal");
    bookView.innerHTML =
      '<div class="bj-book-shell">'+
        '<div class="bj-book-entry"><button type="button" data-bj-action="close" class="bj-book-back">← Journal overview</button>'+
        '<span aria-hidden="true">✦ MY LITTLE NOTEBOOK ✦</span></div>'+
        '<div class="bj-book-spread" id="bjBookDailySpread">'+
          '<section class="bj-book-page bj-book-writing bj-daily-left">'+
            '<div class="bj-book-page-inner">'+
              '<div class="bj-book-date-heading"><small>MY LITTLE NOTEBOOK · DAILY PAGE</small>'+
                '<nav class="bj-book-chapter-tabs" aria-label="Notebook chapters">'+
                  '<button type="button" data-bj-chapter="daily" aria-current="page">✦ Days</button>'+
                  '<button type="button" data-bj-chapter="weekly">▦ Weeks</button>'+
                  '<button type="button" data-bj-chapter="monthly">☾ Months</button>'+
                  '<button type="button" data-bj-chapter="collections">✧ Collections</button></nav>'+
                '<h1 id="bjBookDayTitle">daily journal</h1>'+
                '<nav class="bj-book-nav" aria-label="Turn journal pages">'+
                  '<button type="button" data-bj-action="prev" aria-label="Previous day">‹</button>'+
                  '<input id="bjBookDate" type="date" aria-label="Choose journal date">'+
                  '<button type="button" data-bj-action="next" aria-label="Next day">›</button>'+
                  '<button type="button" data-bj-action="today">Today</button></nav>'+
              '</div>'+
              '<div class="bj-daily-opening"><p class="bj-daily-intro">small steps · big dreams ♡</p>'+
                '<img class="bj-daily-illustration bj-illustration-bouquet" alt="" aria-hidden="true" src="assets/journal/illustrations/jasmine-bouquet-v2.webp" width="157" height="200" decoding="async"></div>'+
              '<div id="bjBookPrompts" class="bj-book-prompts" aria-label="Daily journal prompts"></div>'+
            '</div></section>'+
          '<section class="bj-book-page bj-book-recorded bj-daily-right">'+
            '<div class="bj-book-page-inner">'+
              '<div class="bj-daily-topline"><section class="bj-daily-mood" aria-label="Mood today"><h3>Mood today ♡</h3>'+
                '<p id="bjBookMoodText">However today feels, it belongs here.</p>'+
                '<button type="button" data-bj-action="mood">Update check-in ↗</button></section>'+
                '<img class="bj-daily-illustration bj-illustration-window" alt="" aria-hidden="true" src="assets/journal/illustrations/moon-window-v2.webp" width="154" height="200" decoding="async"></div>'+
              '<section class="bj-daily-note"><h2>Notes &amp; thoughts</h2>'+
                '<label for="bjBookText" class="bj-book-reflection-intro">A little space for whatever is on your mind.</label>'+
                '<textarea id="bjBookText" spellcheck="true" placeholder="Write your day in your own words…"></textarea>'+
                '<div class="bj-book-actions"><span id="bjBookStatus" role="status" aria-live="polite"></span>'+
                  '<button type="button" class="secondary-button" data-bj-action="save">Save page</button></div>'+
              '</section>'+
              '<div class="bj-extra-grid" aria-label="Extra personal notes">'+
                '<section class="bj-extra-note"><label for="bjExtra-focusText">Focus for today</label><textarea id="bjExtra-focusText" data-bj-extra="focusText" placeholder="One gentle intention…"></textarea><small data-bj-extra-status="focusText">Just for you · no extra rewards</small></section>'+
                '<section class="bj-extra-note"><label for="bjExtra-intentionText">Today I will…</label><textarea id="bjExtra-intentionText" data-bj-extra="intentionText" placeholder="A little thing I would like to do…"></textarea><small data-bj-extra-status="intentionText">Personal note, not a task</small></section>'+
                '<section class="bj-extra-note"><label for="bjExtra-happyMomentsText">Little moments that made me happy</label><textarea id="bjExtra-happyMomentsText" data-bj-extra="happyMomentsText" placeholder="Tiny joys deserve a place, too…"></textarea><small data-bj-extra-status="happyMomentsText">No streaks or obligations</small></section>'+
              '</div>'+
              '<div class="bj-daily-teacup"><img class="bj-daily-illustration bj-illustration-teacup" alt="" aria-hidden="true" src="assets/journal/illustrations/flower-teacup-v2.webp" width="128" height="160" decoding="async"></div>'+
              '<div id="bjAtelierMount" class="bj-atelier-mount" aria-label="Journal decoration atelier"></div>'+
              '<div id="bjBookDailyMini" class="bj-book-daily-mini" aria-label="Daily Mini Habit Tracker"></div>'+
              '<details class="bj-book-recorded-details"><summary>✦ Recorded moments</summary>'+
                '<div id="bjBookRecorded" class="bj-book-records"></div></details>'+
              '<button type="button" class="bj-book-edit" data-bj-action="reflect">Edit check-in &amp; reflections ↗</button>'+
            '</div></section>'+
        '</div>'+
        '<div class="bj-book-spread bj-book-weekly-spread" id="bjBookWeeklySpread" hidden>'+
          '<section class="bj-book-page bj-book-writing">'+
            '<div class="bj-book-page-inner">'+
              '<div class="bj-book-date-heading"><small>MY BULLET JOURNAL · WEEKLY PAGES</small>'+
                '<nav class="bj-book-chapter-tabs" aria-label="Notebook chapters">'+
                  '<button type="button" data-bj-chapter="daily">✦ Days</button>'+
                  '<button type="button" data-bj-chapter="weekly" aria-current="page">▦ Weeks</button>'+
                  '<button type="button" data-bj-chapter="monthly">☾ Months</button><button type="button" data-bj-chapter="collections">✧ Collections</button></nav>'+
                '<h1 id="bjBookWeekTitle"></h1>'+
                '<nav class="bj-book-nav" aria-label="Turn weekly pages">'+
                  '<button type="button" data-bj-action="week-prev" aria-label="Previous week">‹</button>'+
                  '<button type="button" data-bj-action="week-next" aria-label="Next week">›</button>'+
                  '<button type="button" data-bj-action="week-today">This week</button>'+
                '</nav></div>'+
              '<div class="bj-book-week-intro"><span aria-hidden="true">✧</span>'+
                '<h2>Seven little chapters</h2>'+
                '<p>Every day has its own story. Pick a date to read or write on its page.</p>'+
              '</div>'+
              '<div class="bj-book-week-days" id="bjBookWeekDays" aria-label="Daily pages in this week"></div>'+
              '<p class="bj-book-week-note">Your original Weekly Review stays available from the Journal overview. Nothing here asks you to fill an extra checklist.</p>'+
            '</div></section>'+
          '<section class="bj-book-page bj-book-recorded">'+
            '<div class="bj-book-page-inner"><small>YOUR WEEKLY COLLECTION</small>'+
              '<h2 class="bj-book-week-right-title">Habit Tracker</h2>'+
              '<div id="bjBookHabitTracker" class="bj-book-habit-tracker"></div>'+
            '</div></section>'+
        '</div>'+
        '<div class="bj-book-spread bj-book-monthly-spread" id="bjBookMonthlySpread" hidden>'+
          '<section class="bj-book-page bj-book-writing">'+
            '<div class="bj-book-page-inner"><div class="bj-book-date-heading">'+
              '<small>MY BULLET JOURNAL · MONTHLY PAGES</small>'+
              '<nav class="bj-book-chapter-tabs" aria-label="Notebook chapters">'+
                '<button type="button" data-bj-chapter="daily">✦ Days</button>'+
                '<button type="button" data-bj-chapter="weekly">▦ Weeks</button>'+
                '<button type="button" data-bj-chapter="monthly" aria-current="page">☾ Months</button><button type="button" data-bj-chapter="collections">✧ Collections</button></nav>'+
              '<h1 id="bjBookMonthTitle"></h1>'+
              '<nav class="bj-book-nav" aria-label="Turn monthly pages">'+
                '<button type="button" data-bj-action="month-prev" aria-label="Previous month">‹</button>'+
                '<button type="button" data-bj-action="month-next" aria-label="Next month">›</button>'+
                '<button type="button" data-bj-action="month-today">This month</button></nav>'+
              '</div>'+
              '<p class="bj-month-intro">Every day belongs in the story. Tap any date to open its page.</p>'+
              '<div id="bjBookMonthCalendar" class="bj-month-calendar" aria-label="Monthly calendar of existing Habit check-ins"></div>'+
            '</div></section>'+
          '<section class="bj-book-page bj-book-recorded"><div class="bj-book-page-inner">'+
            '<small>THE LITTLE RITUALS OF THIS MONTH</small>'+
            '<h2 class="bj-book-week-right-title">A month in bloom</h2>'+
            '<div id="bjBookMonthCollection" aria-label="Monthly Habit collection"></div>'+
          '</div></section>'+
        '</div>'+
        '<div class="bj-book-spread bj-book-collections-spread" id="bjBookCollectionsSpread" hidden>'+
          '<section class="bj-book-page bj-book-writing"><div class="bj-book-page-inner">'+
            '<div class="bj-book-date-heading"><small>MY BULLET JOURNAL · COLLECTIONS</small>'+
            '<nav class="bj-book-chapter-tabs" aria-label="Notebook chapters">'+
              '<button type="button" data-bj-chapter="daily">✦ Days</button>'+
              '<button type="button" data-bj-chapter="weekly">▦ Weeks</button>'+
              '<button type="button" data-bj-chapter="monthly">☾ Months</button>'+
              '<button type="button" data-bj-chapter="collections" aria-current="page">✧ Collections</button></nav>'+
              '<h1>The little things I keep</h1>'+
            '</div>'+
            '<p class="bj-collections-intro">A home for the things you love, with no deadlines or streaks.</p>'+
            '<div id="bjBookCollectionsIndex" class="bj-collections-index"></div>'+
          '</div></section>'+
          '<section class="bj-book-page bj-book-recorded"><div class="bj-book-page-inner">'+
            '<small>COLLECTION · READING & MEDIA</small>'+
            '<h2 class="bj-book-week-right-title">Stories on my shelves</h2>'+
            '<div id="bjBookCollectionsContent" class="bj-collections-content"></div>'+
          '</div></section>'+
        '</div>'+
        '<footer class="bj-book-footer">Start with a simple book. Make it yours as you go. ♡</footer>'+
      '</div>';
    bookView.addEventListener("click",e=>{
      const chapterButton=e.target.closest?.("[data-bj-chapter]");
      if(chapterButton){showChapter(chapterButton.dataset.bjChapter);return;}
      const monthDay=e.target.closest?.("[data-bj-month-day]");
      if(monthDay){open(monthDay.dataset.bjMonthDay);return;}
      const dayButton=e.target.closest?.("[data-bj-week-day]");
      if(dayButton){open(dayButton.dataset.bjWeekDay);return;}
      const button=e.target.closest?.("[data-bj-action]");
      if(!button)return;
      const action=button.dataset.bjAction;
      if(action==="close")close();
      else if(action==="week-prev")changeWeek(weekDate(activeWeek,-7));
      else if(action==="week-next")changeWeek(weekDate(activeWeek,7));
      else if(action==="week-today")changeWeek(monday(today()));
      else if(action==="month-prev")changeMonth(shiftMonth(activeMonth,-1));
      else if(action==="month-next")changeMonth(shiftMonth(activeMonth,1));
      else if(action==="month-today")changeMonth(monthStart(today()));
      else if(action==="save")save(true);
      else if(action==="prev")changeDate(shifted(activeDay,-1));
      else if(action==="next")changeDate(shifted(activeDay,1));
      else if(action==="today")changeDate(today());
      else if(action==="mood"){
        const selected=activeDay;
        if(close())journal.openDayEditor?.(selected);
      }
      else if(action==="reflect"){
        const selected=activeDay;
        if(close())journal.openDayEditor?.(selected);
      }
    });
    bookView.querySelector("#bjBookDate").addEventListener("change",e=>changeDate(e.target.value));
    bookView.addEventListener("input",event=>{
      const extraArea=event.target.closest?.("[data-bj-extra]");
      if(extraArea){queueExtra(extraArea.dataset.bjExtra,activeDay,extraArea.value);return;}
      const area=event.target.closest?.("[data-bj-prompt]");
      if(!area)return;
      const field=area.dataset.bjPrompt,day=activeDay;
      const prior=pendingPrompts.get(field);
      if(prior?.timer)clearTimeout(prior.timer);
      const status=bookView.querySelector('[data-bj-prompt-status="'+field+'"]');
      if(status)status.textContent="Writing…";
      updatePromptPreview(field,area.value,day);
      const timer=setTimeout(()=>savePrompt(field),850);
      pendingPrompts.set(field,{day,value:area.value,timer});
    });
    bookView.addEventListener("focusout",event=>{
      const area=event.target.closest?.("[data-bj-prompt]");
      if(area)savePrompt(area.dataset.bjPrompt);
      const extraArea=event.target.closest?.("[data-bj-extra]");
      if(extraArea)saveExtra(extraArea.dataset.bjExtra);
    });
    bookView.querySelector("#bjBookText").addEventListener("input",()=>{
      dirty=true;noteStatus("Unsaved changes");
      clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),800);
    });
    main.appendChild(bookView);
    window.LifeRPGJournalArtSpread?.init?.(bookView);
    return bookView;
  }
  function extraValues(day) {
    const data=entryFor(day).dailySpreadV1;
    return data&&typeof data==="object"&&!Array.isArray(data)?data:{};
  }
  function renderExtras(day) {
    const values=extraValues(day);
    for(const field of EXTRA_FIELDS){
      const input=get("bjExtra-"+field);
      if(input)input.value=typeof values[field]==="string"?values[field]:"";
      const status=bookView?.querySelector('[data-bj-extra-status="'+field+'"]');
      if(status)status.textContent=(String(values[field]||"").trim().length)+" characters · personal note";
    }
  }
  function queueExtra(field,day,value) {
    if(!EXTRA_FIELDS.includes(field))return;
    const old=pendingExtras.get(field);
    if(old?.timer)clearTimeout(old.timer);
    const status=bookView?.querySelector('[data-bj-extra-status="'+field+'"]');
    if(status)status.textContent=value.trim().length+" characters · writing…";
    pendingExtras.set(field,{day,value,timer:setTimeout(()=>saveExtra(field),900)});
  }
  function saveExtra(field) {
    const pending=pendingExtras.get(field);
    if(!pending)return true;
    clearTimeout(pending.timer);
    const state=app.getState();
    const journalData=state.journal;
    if(!journalData?.entries)return false;
    const prior=journalData.entries[pending.day];
    const hadEntry=Boolean(prior);
    const entry=prior||{date:pending.day,createdAt:Date.now()};
    const oldValue=entry.dailySpreadV1?{...entry.dailySpreadV1}:null;
    const oldUpdatedAt=entry.updatedAt;
    const data=entry.dailySpreadV1||{};
    if(data[field]===pending.value){pendingExtras.delete(field);return true;}
    journalData.entries[pending.day]=entry;
    entry.dailySpreadV1={...data,[field]:pending.value};
    entry.updatedAt=Date.now();
    const status=bookView?.querySelector('[data-bj-extra-status="'+field+'"]');
    if(app.saveState({source:"journal-book-extra-"+field,suppressUiRefresh:true})===false){
      if(hadEntry){if(oldValue)entry.dailySpreadV1=oldValue;else delete entry.dailySpreadV1;entry.updatedAt=oldUpdatedAt;}
      else delete journalData.entries[pending.day];
      if(status)status.textContent="Save failed — your text is still here";
      pending.timer=null;
      return false;
    }
    pendingExtras.delete(field);
    if(status)status.textContent=pending.value.trim().length+" characters · saved ✓";
    return true;
  }
  function savePendingExtras() {
    let okay=true;
    for(const field of [...pendingExtras.keys()])if(!saveExtra(field))okay=false;
    return okay;
  }
  function previewMarkup(field,day,text){
    const p=journal.getReflectionRewardPreview?.(day,field,text);
    if(!p)return "";
    const next=p.historical?"Past-day writing · no backdated bonuses":
      p.remaining+" characters until next bonus · +"+p.nextReward.xp+" XP / "+p.nextReward.coins+" coins";
    return '<div class="bj-reward-preview" data-bj-preview="'+field+'">'+
      '<span><strong>'+p.chars+' characters</strong> · '+p.paid+' bonuses recorded</span>'+
      '<div class="bj-reward-meter" aria-hidden="true"><i style="width:'+p.progress+'%"></i></div>'+
      '<span>'+htmlEscape(next)+'</span></div>';
  }
  function updatePromptPreview(field,text,day){
    const status=bookView?.querySelector('[data-bj-preview="'+field+'"]');
    if(!status)return;
    const replacement=document.createElement("div");
    replacement.innerHTML=previewMarkup(field,day,text);
    const child=replacement.firstElementChild;
    if(child)status.replaceWith(child);
  }
  function renderPrompts(key) {
    const mount=get("bjBookPrompts");
    if(!mount)return;
    const entry=entryFor(key);
    mount.innerHTML=PROMPTS.map(([field,icon,label,hint])=>{
      const prompt=journal.reflectionPromptFor?.(field,key)||label;
      const value=typeof entry[field]==="string"?entry[field]:"";
      const locked=journal.isReflectionUnlocked?.(field)===false;
      // Older answers must remain readable even when an entitlement is missing.
      // Do not offer an editor which would then silently refuse to save.
      if(locked&&!value.trim())return "";
      const content=locked
        ? '<div class="bj-book-answer"><p>'+htmlEscape(value)+'</p></div><small>Saved previously · read only</small>'
        : '<textarea id="bjBookPrompt-'+field+'" data-bj-prompt="'+field+'" rows="3" maxlength="2400" spellcheck="true" placeholder="'+htmlEscape(hint)+'">'+htmlEscape(value)+'</textarea>'+
          '<small data-bj-prompt-status="'+field+'" aria-live="polite">'+(value?'Saved':'Optional · no pressure')+'</small>'+previewMarkup(field,key,value);
      return '<section class="bj-book-prompt-card" data-bj-field="'+field+'">'+
        '<label'+(locked?'':' for="bjBookPrompt-'+field+'"')+'><span aria-hidden="true">'+icon+'</span>'+
        '<span>'+htmlEscape(prompt)+'</span></label>'+content+'</section>';
    }).join("");
  }
  function savePrompt(field) {
    const pending=pendingPrompts.get(field);
    if(!pending)return true;
    if(pending.timer)clearTimeout(pending.timer);
    const result=journal.saveReflectionInBook?.(pending.day,field,pending.value);
    const status=bookView?.querySelector('[data-bj-prompt-status="'+field+'"]');
    if(result?.ok){
      pendingPrompts.delete(field);
      if(status){
        const rewards=result.rewards||{};
        const parts=[rewards.xp?("+"+rewards.xp+" XP"):"",rewards.coins?("+"+rewards.coins+" coins"):""].filter(Boolean);
        status.textContent=parts.length?"Saved ✓ · "+parts.join(" · "):"Saved ✓";
      }
      updatePromptPreview(field,pending.value,pending.day);
      return true;
    }
    pending.timer=null;
    if(status)status.textContent="Not saved — please retry";
    return false;
  }
  function savePendingPrompts(){
    let okay=true;
    for(const field of [...pendingPrompts.keys()])if(!savePrompt(field))okay=false;
    return okay;
  }
  function save(showToast=false) {
    clearTimeout(saveTimer);
    if(!savePendingPrompts()||!savePendingExtras())return false;
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
    const view=ensureView();
    if(!view||!activeDay)return;
    view.querySelector("#bjBookDate").value=activeDay;
    view.querySelector("#bjBookDate").max=today();
    view.querySelector('[data-bj-action="next"]').disabled=activeDay===today();
    const day=dayDate(activeDay);
    view.querySelector("#bjBookDayTitle").textContent="daily journal";
    view.querySelector("#bjBookDayTitle").setAttribute("aria-label","Daily journal · "+day.toLocaleDateString(undefined,{dateStyle:"full"}));
    const mood=entryFor(activeDay).mood;
    view.querySelector("#bjBookMoodText").textContent=mood ? "Today feels: "+mood+" ♡" : "However today feels, it belongs here. ♡";
    view.querySelector("#bjBookText").value=noteFor(activeDay);
    savedNote=noteFor(activeDay);dirty=false;
    noteStatus(savedNote?"Saved":"Your words stay yours");
    renderPrompts(activeDay);
    renderExtras(activeDay);
    window.LifeRPGJournalArtSpread?.render?.(activeDay,view);
    view.querySelector("#bjBookRecorded").innerHTML=dayContents(activeDay);
    window.LifeRPGBulletJournalDailyTracker?.render?.(activeDay);
    window.LifeRPGJournalAtelier?.render?.(activeDay);
    // Weekly collection renders only on its own spread, never inside a daily page.
  }
  function renderWeek(){
    const view=ensureView();
    if(!view||!activeWeek)return;
    view.querySelector("#bjBookWeekTitle").textContent=weekTitle(activeWeek);
    view.querySelector('[data-bj-action="week-next"]').disabled=activeWeek>=monday(today());
    view.querySelector("#bjBookWeekDays").innerHTML=Array.from({length:7},(_,index)=>{
      const day=weekDate(activeWeek,index);
      const pretty=dayDate(day).toLocaleDateString(undefined,{weekday:"short",day:"numeric"});
      const future=day>today();
      return '<button type="button" data-bj-week-day="'+day+'" '+(future?'disabled':'')+
        ' aria-label="Open '+pretty+'" class="bj-book-week-day'+(day===activeDay?' is-selected':'')+'">'+
        '<span>'+String(index+1).padStart(2,"0")+'</span><strong>'+htmlEscape(pretty)+'</strong><small>'+ (future?'Upcoming':day===today()?'Today':'Open page ↗') +'</small></button>';
    }).join("");
    window.LifeRPGBulletJournalHabitTracker?.render?.(activeWeek);
  }
  function renderMonth(){
    const view=ensureView();
    if(!view||!activeMonth)return;
    const first=dayDate(activeMonth);
    view.querySelector("#bjBookMonthTitle").textContent=first.toLocaleDateString(undefined,{month:"long",year:"numeric"});
    view.querySelector('[data-bj-action="month-next"]').disabled=activeMonth>=monthStart(today());
    window.LifeRPGBulletJournalMonthly?.render?.(activeMonth);
  }
  function renderCollections(){
    window.LifeRPGBulletJournalCollections?.render?.();
  }
  function openCollections(){
    ensureButton();
    if(!ensureView())return false;
    if(!activeDay){activeDay=today();activeWeek=monday(activeDay);activeMonth=monthStart(activeDay);renderDay();}
    if(!showChapter("collections"))return false;
    app.showView?.("bullet-journal");
    return true;
  }
  function showChapter(target){
    if(!["daily","weekly","monthly","collections"].includes(target))return false;
    if(!save())return false;
    chapter=target;
    if(!activeWeek)activeWeek=monday(activeDay||today());
    if(!activeMonth)activeMonth=monthStart(activeDay||today());
    const view=ensureView();
    view.querySelector("#bjBookDailySpread").hidden=chapter!=="daily";
    view.querySelector("#bjBookWeeklySpread").hidden=chapter!=="weekly";
    view.querySelector("#bjBookMonthlySpread").hidden=chapter!=="monthly";
    view.querySelector("#bjBookCollectionsSpread").hidden=chapter!=="collections";
    view.querySelectorAll("[data-bj-chapter]").forEach(button=>{
      if(button.dataset.bjChapter===chapter)button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
    if(chapter==="weekly")renderWeek();
    if(chapter==="monthly")renderMonth();
    if(chapter==="collections")renderCollections();
    return true;
  }
  function changeWeek(target){
    const key=monday(target);
    if(!key||key>monday(today())||!save())return false;
    activeWeek=key;
    if(chapter!=="weekly")return showChapter("weekly");
    renderWeek();
    return true;
  }
  function changeMonth(target){
    const key=monthStart(target);
    if(!key||key>monthStart(today())||!save())return false;
    activeMonth=key;
    if(chapter!=="monthly")return showChapter("monthly");
    renderMonth();return true;
  }
  function openMonth(target=today()){
    ensureButton();
    if(!ensureView())return false;
    const selected=dayDate(target)&&target<=today()?target:today();
    if(!activeDay){activeDay=today();renderDay();}
    if(!changeMonth(selected))return false;
    app.showView?.("bullet-journal");return true;
  }
  function openWeekly(target=today()){
    ensureButton();
    if(!ensureView())return false;
    const selected=dayDate(target)&&target<=today()?target:today();
    if(!activeDay){activeDay=today();renderDay();}
    if(!changeWeek(selected))return false;
    app.showView?.("bullet-journal");
    return true;
  }
  function changeDate(target){
    if(!dayDate(target)||target>today()){noteStatus("Choose today or an earlier date");return false;}
    if(!save())return false;
    activeDay=target;activeWeek=monday(target);activeMonth=monthStart(target);renderDay();return true;
  }
  function open(target=today()){
    ensureButton();
    const view=ensureView();
    if(!view)return false;
    if(!dayDate(target)||target>today())target=today();
    if(activeDay&&!save())return false;
    activeDay=target;
    activeWeek=monday(target);
    activeMonth=monthStart(target);
    renderDay();
    if(!showChapter("daily"))return false;
    app.showView?.("bullet-journal");
    return true;
  }
  function openReflection(target=today(),field=null){
    if(!open(target))return false;
    if(window.LifeRPGJournalArtSpread?.focusField?.(field))return true;
    const area=field?get("bjBookPrompt-"+field):get("bjBookPrompt-gratitude");
    requestAnimationFrame(()=>{area?.scrollIntoView?.({behavior:"smooth",block:"center"});area?.focus?.({preventScroll:true});});
    return true;
  }
  function close(){
    if(!save())return false;
    app.showView?.("journal");
    return true;
  }
  function initialize(){
    ensureButton();
    ensureView();
  }
  // Leaving the book by the sidebar also saves its draft.
  window.addEventListener("life-rpg:view-changed",e=>{
    if(e?.detail?.view!=="bullet-journal"&&(dirty||pendingPrompts.size||pendingExtras.size))save();
    if(e?.detail?.view==="bullet-journal"&&!activeDay){
      activeDay=today();activeWeek=monday(activeDay);activeMonth=monthStart(activeDay);renderDay();showChapter("daily");
    }
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
  window.LifeRPGBulletJournalBook={version:VERSION,open,openReflection,openWeekly,openMonth,openCollections,close,save,changeDate,changeWeek,changeMonth,showChapter,getDate:()=>activeDay,getWeek:()=>activeWeek,getMonth:()=>activeMonth,getChapter:()=>chapter};
})();
