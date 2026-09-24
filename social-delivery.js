/* Life RPG V0.31.4dc: delayed, opt-in social delivery. No background jobs, no XP. */
(() => {
  "use strict";
  if (window.LifeRPGSocialDelivery) return;
  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;
  const VERSION = "0.31.4dc";
  const LIMIT = 450;
  const MINUTE = 60000;
  const escape = value => app.escapeHtml?.(String(value ?? "")) || String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const localDay = ms => { const d=new Date(ms); return Number.isFinite(+d) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` : ""; };
  const safeTime = v => { const t=Date.parse(v || ""); return Number.isFinite(t) ? t : 0; };
  const hash = text => [...String(text)].reduce((v,c)=>((v*31+c.charCodeAt(0))>>>0),7);
  const save = label => app.saveState({source:`social-delivery-${label}`,suppressUiRefresh:true});
  let running=false, timer=null;
  function state() {
    const root=app.getState();
    if (!root.socialDeliveryV1 || typeof root.socialDeliveryV1!=="object" || Array.isArray(root.socialDeliveryV1)) root.socialDeliveryV1={};
    const s=root.socialDeliveryV1;
    s.schemaVersion=1;
    if (!s.settings || typeof s.settings!=="object") s.settings={native:false};
    if (!s.observed || typeof s.observed!=="object" || Array.isArray(s.observed)) s.observed={};
    if (!Array.isArray(s.items)) s.items=[];
    return s;
  }
  function currentSources() {
    const root=app.getState(), out=[];
    for (const entry of root.timeTracking?.entries || []) {
      if (!entry?.id || entry.mode==="break") continue;
      const time=safeTime(entry.endAt || entry.startAt);
      const kind=String(entry.categoryId||entry.category||"").toLowerCase();
      let category="";
      if (["school","work_home"].includes(kind)) category="work";
      else if (kind==="focus" && /work|school|lesson|correction|planning|teaching|conference|assessment|prep/i.test(`${entry.subcategory||""} ${entry.label||""}`)) category="work";
      else if (["gaming","reading","hobby"].includes(kind)) category="hobby";
      else if (kind==="recovery") category="recovery";
      else if (kind==="life_admin") category="home";
      if (category) out.push({key:`time:${entry.id}`,time,category});
    }
    for (const entry of root.completionLog || []) {
      if (!entry?.id) continue;
      const realm=String(entry.realm||"");
      const category=({Work:"work",Hobbies:"hobby",Recovery:"recovery",Home:"home"})[realm];
      if (category) out.push({key:`quest:${entry.id}`,time:safeTime(entry.at||entry.timestamp),category});
    }
    for(const event of root.rewardLedger?.events || []) {
      if(!event?.id || event.duplicate) continue;
      const category=({Work:"work",Hobbies:"hobby",Recovery:"recovery",Home:"home"})[event.realm];
      if(category) out.push({key:`reward:${event.id}`,time:safeTime(event.at),category});
    }
    return out;
  }
  function phoneSources() {
    const social=app.getState().story?.social || {};
    const read=new Set(social.readMessageIds||[]);
    return Object.values(social.messageSchedule||{}).filter(e=>e?.status==="delivered" && e.groupId && !read.has(e.groupId) && !read.has(e.messageId)).map(e=>({key:`phone:${e.groupId}`,time:safeTime(e.deliveredAt),personId:e.personId,groupId:e.groupId}));
  }
  function initialBaseline() {
    const s=state(); if (s.initializedAt) return;
    // A previous save is NEVER interpreted as a new activity after installation.
    for(const source of [...currentSources(),...phoneSources()]) s.observed[source.key]=1;
    s.initializedAt=new Date().toISOString();
    s.items=[];
    save("initialize");
  }
  function addNew() {
    const s=state(), now=Date.now();let changed=false;
    const sourceKeys=new Set();
    for(const source of currentSources()) {
      sourceKeys.add(source.key);
      if (s.observed[source.key]) continue;
      s.observed[source.key]=1; changed=true;
      if (!source.time || source.time > now+MINUTE || now-source.time > 90*MINUTE) continue;
      if (localDay(source.time)!==localDay(now)) continue;
      const root=app.getState();
      if (!root.flags?.DYNARIOT_MOVE_IN_COMPLETE || !(root.story?.completedSceneIds||[]).includes("SC_011")) continue;
      // One spontaneous invitation per day, not a reward-grinding notification for every log.
      if (s.items.some(item=>item.type==="moment" && item.day===localDay(source.time))) continue;
      const delay=(18+hash(source.key)%21)*MINUTE;
      s.items.push({id:`moment:${source.key}`,sourceKey:source.key,type:"moment",category:source.category,day:localDay(source.time),dueAt:new Date(Math.max(now,source.time)+delay).toISOString(),createdAt:new Date(now).toISOString(),status:"queued"});changed=true;
    }
    for(const source of phoneSources()) {
      sourceKeys.add(source.key);
      if (s.observed[source.key]) continue;
      s.observed[source.key]=1;changed=true;
      // Message scheduler already controls its delivery delay. Never delay or modify it again.
      if (source.time && now-source.time <= 120*MINUTE && now>=source.time) {
        s.items.push({id:source.key,type:"phone",groupId:source.groupId,personId:source.personId,createdAt:new Date(now).toISOString(),dueAt:new Date(source.time).toISOString(),status:"ready"});changed=true;
      }
    }
    // A retracted automatic time log must not trigger a notification.
    for(const item of s.items) if(item.type==="moment" && item.status==="queued" && !sourceKeys.has(item.sourceKey)){item.status="canceled";changed=true;}
    if(Object.keys(s.observed).length>LIMIT){const keys=Object.keys(s.observed);for(const key of keys.slice(0,keys.length-LIMIT))delete s.observed[key];changed=true;}
    if(s.items.length>100){s.items=s.items.slice(-100);changed=true;}
    return changed;
  }
  function unreadPhone() { const read=new Set(app.getState().story?.social?.readMessageIds||[]);return Object.values(app.getState().story?.social?.messageSchedule||{}).filter(e=>e?.status==="delivered" && e.groupId && !read.has(e.groupId) && !read.has(e.messageId)); }
  function refreshStatuses() {
    let changed=false; const s=state(), world=window.LifeRPGLivingWorldV3;
    const read=new Set(app.getState().story?.social?.readMessageIds||[]);
    for(const item of s.items){
      if(item.type==="phone" && item.status!=="read" && (read.has(item.groupId)||read.has(app.getState().story?.social?.messageSchedule?.[item.groupId]?.messageId))){item.status="read";changed=true;}
      if(item.type!=="moment" || item.status==="read" || item.status==="canceled") continue;
      const completedToday=Object.values(app.getState().livingWorldV3?.completed||{}).some(x=>x?.date===item.day);
      if(item.status==="queued" && (completedToday || app.getState().livingWorldV3?.dailyHistory?.[item.day])){item.status="canceled";changed=true;continue;}
      if(item.momentId && app.getState().livingWorldV3?.completed?.[item.momentId]){item.status="read";changed=true;continue;}
      if(item.deliveryType==="talk" && (app.getState().story?.social?.seenTalkIds||[]).includes(item.talkId)){item.status="read";changed=true;continue;}
      const hour=new Date().getHours();
      if(item.status==="queued" && hour>=8 && hour<22 && Date.now()>=safeTime(item.dueAt)){
        const candidate=world?.notificationCandidate?.(item.category);
        if(candidate){item.momentId=candidate.id;item.personId=candidate.who[0]||null;item.status="ready";item.deliveredAt=new Date().toISOString();changed=true;}
        else {
          const talk=window.LifeRPGStoryUI?.contextualTalkNotice?.();
          if(talk){item.deliveryType="talk";item.talkId=talk.id;item.personId=talk.personId;item.status="ready";item.deliveredAt=new Date().toISOString();changed=true;}
        }
      }
    }
    return changed;
  }
  function activeItems(){return state().items.filter(x=>x.status==="ready" && (x.type==="phone" || (x.type==="moment" && (x.deliveryType==="talk" ? !(app.getState().story?.social?.seenTalkIds||[]).includes(x.talkId) : !app.getState().livingWorldV3?.completed?.[x.momentId]))));}
  function render(){
    const root=document.getElementById("socialDeliveryCard");if(!root)return;
    const s=state(), ready=activeItems(), phone=unreadPhone(), moment=ready.find(x=>x.type==="moment"), newPhone=ready.find(x=>x.type==="phone");
    const count=Number(!!moment)+phone.length;
    root.innerHTML=`<div class="social-delivery-heading"><div><p class="eyebrow">LIVING WORLD · NEW ARRIVALS</p><h2>Little signs of life ${count?`<span class="social-delivery-count">${count}</span>`:""}</h2><p>${count?"Something has arrived. Nothing expires if you are busy.":"Moments and messages appear after a little real-life time, not after every tap."}</p></div><span class="social-delivery-symbol">✉</span></div><div class="social-delivery-actions">${newPhone||phone.length?`<button type="button" class="primary-button" data-social-delivery-phone>✉ ${phone.length} unread message${phone.length===1?"":"s"} ›</button>`:""}${moment?`<button type="button" class="primary-button" data-social-delivery-moment="${escape(moment.id)}">✿ ${moment.deliveryType==="talk"?"A new conversation is waiting":"An everyday moment is waiting"} ›</button>`:""}</div><label class="social-delivery-setting"><input type="checkbox" data-social-delivery-native ${s.settings.native?"checked":""}><span>Optional device notifications while Life RPG is running</span></label><small>In-app alerts work without permission. Device alerts require your opt-in and browser support. No background push when the app is fully closed.</small>`;
    let badge=document.getElementById("socialDeliveryNavBadge");const nav=document.querySelector('.nav-button[data-view="story"]');
    if(nav&&!badge){badge=document.createElement("b");badge.id="socialDeliveryNavBadge";badge.className="social-delivery-nav-badge";nav.appendChild(badge);}
    if(badge){badge.textContent=moment?"✿":"";badge.classList.toggle("hidden",!moment);}
  }
  function nativeNotice(item) {
    if(!state().settings.native || !("Notification" in window) || Notification.permission!=="granted")return;
    const phone=item.type==="phone";
    const title=phone?"A new Life RPG message":item.deliveryType==="talk"?"A new conversation is waiting ✿":"A little moment is waiting ✿";
    const body=phone?"Someone has sent Luca a message.":item.deliveryType==="talk"?"Someone has a little more to say.":"An everyday scene is ready when you are.";
    try{const n=new Notification(title,{body,tag:`life-rpg-${item.id}`,icon:"./assets/app-icon-192.png"});n.onclick=()=>{window.focus?.();if(phone)window.LifeRPGStoryUI?.openPhone?.(item.personId);else openMoment(item.id);n.close();};}
    catch(_){if(navigator.serviceWorker?.ready)navigator.serviceWorker.ready.then(reg=>reg.showNotification?.(title,{body,tag:`life-rpg-${item.id}`,icon:"./assets/app-icon-192.png",data:{url:"./"}})).catch(()=>{});}
  }
  function showToast(item) {
    // Avoid belated interruptions for last night's activity. The persistent card remains.
    if (Date.now()-safeTime(item.deliveredAt||item.createdAt)>120*MINUTE)return;
    if(item.type==="moment" && item.day!==localDay(Date.now()))return;
    if (item.type==="phone" && document.getElementById("view-phone")?.classList.contains("active"))return;
    if(document.querySelector(".social-delivery-toast"))return;
    const div=document.createElement("div");div.className="social-delivery-toast";div.setAttribute("role","status");
    div.innerHTML=`<span aria-hidden="true">${item.type==="phone"?"✉":"✿"}</span><div><strong>${item.type==="phone"?"A new message has arrived":item.deliveryType==="talk"?"A new conversation is waiting":"A little moment is waiting"}</strong><small>Whenever you feel like opening it.</small></div><button type="button" data-social-delivery-open="${escape(item.id)}">Open ›</button><button type="button" data-social-delivery-dismiss aria-label="Dismiss notification">×</button>`;
    document.body.appendChild(div);
  }
  function announce() {
    let changed=false;const now=Date.now();
    const hour=new Date(now).getHours();if(hour<8||hour>=22)return false;
    for(const item of activeItems()){
      if(item.announcedAt || !safeTime(item.deliveredAt||item.createdAt)) continue;
      item.announcedAt=new Date(now).toISOString();changed=true;
      // Do not create a burst if several messages arrive during a closed-app catch-up.
      if(now-safeTime(item.deliveredAt||item.createdAt)<120*MINUTE && (item.type!=="moment" || item.day===localDay(now)) && (!state().lastInterruptAt || now-safeTime(state().lastInterruptAt)>=12*MINUTE)){
        showToast(item);nativeNotice(item);state().lastInterruptAt=new Date(now).toISOString();
      }
      break;
    }
    return changed;
  }
  function dismissToast(){document.querySelector(".social-delivery-toast")?.remove();}
  function openMoment(id){const item=state().items.find(x=>x.id===id);if(!item||item.type!=="moment" || item.status!=="ready")return false;
    const ok=item.deliveryType==="talk" ? window.LifeRPGStoryUI?.openContextualTalk?.(item.talkId) : window.LifeRPGLivingWorldV3?.openMoment?.(item.momentId);
    if(!ok)app.showToast?.("This conversation is waiting until everyone is available. It will stay here.");
    if(ok)dismissToast();return Boolean(ok);
  }
  function openPhone(id){const item=state().items.find(x=>x.id===id);window.LifeRPGStoryUI?.openPhone?.(item?.personId || null);dismissToast();sync();}
  function sync(){if(running)return;running=true;try{initialBaseline();let changed=addNew();changed=refreshStatuses()||changed;changed=announce()||changed;if(changed)save("sync");render();}finally{running=false;}}
  function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;sync();},150);}
  document.addEventListener("click",e=>{const open=e.target.closest("[data-social-delivery-open]");if(open){const id=open.dataset.socialDeliveryOpen;const item=state().items.find(x=>x.id===id);if(item?.type==="moment")openMoment(id);else openPhone(id);return;}
    if(e.target.closest("[data-social-delivery-dismiss]")){dismissToast();return;}
    if(e.target.closest("[data-social-delivery-phone]")){window.LifeRPGStoryUI?.openPhone?.();dismissToast();schedule();return;}
    const moment=e.target.closest("[data-social-delivery-moment]");if(moment){openMoment(moment.dataset.socialDeliveryMoment);return;}
  });
  document.addEventListener("change",async e=>{if(!e.target.matches("[data-social-delivery-native]"))return;const s=state();if(!e.target.checked){s.settings.native=false;save("native-opt-out");render();return;}
    if(!("Notification" in window)){app.showToast?.("Device notifications are unavailable here. In-app alerts still work.");e.target.checked=false;return;}
    let permission=Notification.permission;
    if(permission!=="granted"){try{permission=await Notification.requestPermission();}catch(_){permission="denied";}}
    s.settings.native=permission==="granted";save("native-permission");render();if(!s.settings.native)app.showToast?.("Device notifications were not enabled. In-app alerts remain active.");
  });
  window.addEventListener("life-rpg:state-persisted",e=>{const source=String(e.detail?.source||"");if(source.startsWith("social-delivery-"))return;if(source==="app"||source.startsWith("time-")||source.startsWith("week-"))sync();else schedule();});
  window.addEventListener("life-rpg:render",schedule);
  window.addEventListener("life-rpg:everyday-moment-complete",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.addEventListener("focus",schedule);
  setInterval(()=>{if(!document.hidden)sync();},45000);
  sync();
  window.LifeRPGSocialDelivery={version:VERSION,sync,openMoment,_test:{state,currentSources,phoneSources,activeItems,refreshStatuses,initialBaseline,addNew}};
})();
