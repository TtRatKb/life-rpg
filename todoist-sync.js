/* Life RPG · DZ23. Private, direct Todoist API v1 integration. No token in app/cloud save. */
(() => {
 'use strict';
 const app=window.LifeRPGApp;
 if(!app?.getState||!app.awardActivity)return;
 const SESSION='life-rpg-todoist-access-session-v1', DEVICE='life-rpg-todoist-access-device-v1';
 const API='https://api.todoist.com/api/v1';
 const esc=v=>app.escapeHtml(String(v??''));
 let tasks=[],connected=false,busy=false,dialog=null,lastError='';
 const currentToken=()=>{try{return sessionStorage.getItem(SESSION)||localStorage.getItem(DEVICE)||'';}catch{return '';}};
 function model(){const st=app.getState();st.todoistBridgeV1 ||= {schemaVersion:1,connectedAt:'',receipts:{},rewardMode:'safe'};return st.todoistBridgeV1;}
 function persist(source){return app.saveState({source,suppressUiRefresh:true});}
 function safeDate(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
 function dayKey(v){const d=new Date(v);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';}
 function recurrence(item){return Boolean(item?.due?.is_recurring);}
 function receiptKey(item){const id=String(item?.id||'');return id?`todoist:${id}${recurrence(item)?':'+dayKey(item.completed_at||new Date().toISOString()):''}`:'';}
 function likelyDuplicate(item){const s=[item.content,...(item.labels||[])].join(' ').toLowerCase();return /schulcockpit|unterrichtsvorbereitung|unterricht vorbereitet|klausuranalyse|prüfungsanalyse|reihenplanung|stundenplanung/.test(s);}
 function ensureConnectedDate(){const m=model();if(!m.connectedAt){m.connectedAt=new Date().toISOString();persist('todoist-first-connection');}}
 async function request(path, opts={}){
   const token=currentToken();if(!token)throw Error('Bitte zuerst Todoist verbinden.');
   const response=await fetch(`${API}${path}`,{...opts,headers:{Authorization:`Bearer ${token}`,...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})},cache:'no-store'});
   if(!response.ok){if(response.status===401){connected=false;throw Error('Todoist-Token abgelaufen oder ungültig. Bitte neu verbinden.');}throw Error(`Todoist API: HTTP ${response.status}`);}
   if(response.status===204)return null;
   const text=await response.text();return text?JSON.parse(text):null;
 }
 async function paged(path,field='results',limit=600){let cursor='',out=[];for(let i=0;i<12;i++){
   const delim=path.includes('?')?'&':'?';const res=await request(`${path}${cursor?`${delim}cursor=${encodeURIComponent(cursor)}`:''}${path.includes('limit=')?'':`${cursor?'&':delim}limit=100`}`);
   out.push(...(Array.isArray(res)?res:(res?.[field]||res?.results||res?.items||[])));
   if(out.length>limit)throw Error('Zu viele Todoist-Einträge; bitte den Sync-Bereich eingrenzen.');
   cursor=res?.next_cursor||'';if(!cursor)break;
 }return out;}
 function normalizedTasks(list){return list.map(t=>({id:String(t.id),content:String(t.content||'').slice(0,220),labels:Array.isArray(t.labels)?t.labels:[],priority:Number(t.priority||1),due:t.due||null,project_id:String(t.project_id||''),parent_id:String(t.parent_id||''),duration:t.duration||null}));}
 function matchedHoliday(item){return window.LifeRPGHoliday?.active?.()?.goals?.some(g=>g.linkedTodoistId===String(item.id));}
 function awardCompleted(item){
   const key=receiptKey(item);if(!key||model().receipts[key])return false;
   const stamp=item.completed_at||new Date().toISOString();
   const pastEvent=(app.getState().rewardLedger?.events||[]).find(e=>e.source==='todoist-completion' && e.sourceId===key && !e.duplicate);
   const blocked=likelyDuplicate(item);
   const mode=model().rewardMode||'safe';const linkedGoal=window.LifeRPGHoliday?.active?.()?.goals?.find(g=>g.linkedTodoistId===String(item.id));
   const eligible=!blocked && (mode==='all'||Boolean(linkedGoal));
   const realm=linkedGoal?.group==='school'?'Work':linkedGoal?.group==='joy'?'Hobbies':linkedGoal?.group==='recovery'?'Recovery':'Home';
   let eventId=pastEvent?.id||null;
   if(eligible && !pastEvent){
     // Small one-off task reward, never effort/time rewards; actual focus, school
     // and Quest activity must still be logged only in their canonical system.
     const reward=app.awardActivity({source:'todoist-completion',sourceId:key,label:'Todoist task completed',realm,xp:3,realmXP:3,statXP:0,coins:2,storyEnergyBase:0.1,skipAddOnRewards:true,progressionRelevant:true,at:stamp,metadata:{bridge:'todoist',type:'task',rewardMode:mode}});
     eventId=reward.eventId||null;
   }
   model().receipts[key]={at:stamp,eventId,blocked:blocked||!eligible};
   return eligible && !pastEvent;
 }
 async function sync({quiet=false}={}){
   if(busy)return 0;if(!currentToken())return 0;busy=true;
   try{
     const open=await paged('/tasks');const next=normalizedTasks(open);
     // Connection timestamp creates a strict no-retro-reward boundary. Never
     // convert an old completed Todoist task into a fresh XP grant.
     const first=!model().connectedAt;
     const since=first?new Date().toISOString():model().connectedAt;
     const days=Math.min(89,Math.max(1,Math.ceil((Date.now()-safeDate(since))/86400000)+2));
     const start=new Date(Date.now()-days*86400000).toISOString();
     let completed=[];
     try{completed=await paged(`/tasks/completed/by_completion_date?since=${encodeURIComponent(start)}&until=${encodeURIComponent(new Date(Date.now()+60000).toISOString())}`,'items',1200);}catch(e){lastError=`Aktive Aufgaben geladen; Abschluss-Historie: ${e.message}`;}
     tasks=next;connected=true;lastError='';
     if(first){model().connectedAt=new Date().toISOString();}
     let awarded=0;const accepted=[];
     for(const item of completed){
       const when=safeDate(item.completed_at);
       if(when < safeDate(model().connectedAt))continue;
       accepted.push(item);
       if(awardCompleted(item))awarded++;
     }
     window.LifeRPGHoliday?.refreshLinkedCompletions?.(accepted);
     if(first||accepted.length)persist('todoist-verified-completions');
     if(!quiet)app.showToast?.(`Todoist: ${tasks.length} Aufgaben aktualisiert${awarded?` · ${awarded} neue Abschlüsse belohnt`:''}.`);
     render();window.LifeRPGDaily?.render?.();return tasks.length;
   }catch(e){lastError=e.message;connected=false;if(!quiet)app.showToast?.(lastError);render();throw e;}
   finally{busy=false;}
 }
 function connect(token,remember=false){
   token=String(token||'').trim();if(!/^[\w.-]{16,256}$/.test(token))throw Error('Bitte einen gültigen Todoist API-Token einfügen.');
   if(remember){localStorage.setItem(DEVICE,token);sessionStorage.removeItem(SESSION);}
   else {sessionStorage.setItem(SESSION,token);localStorage.removeItem(DEVICE);}
   return sync();
 }
 function disconnect(){sessionStorage.removeItem(SESSION);localStorage.removeItem(DEVICE);connected=false;tasks=[];render();}
 function hasTask(id){return tasks.some(t=>t.id===String(id));}
 async function complete(id){
   const item=tasks.find(x=>x.id===String(id));if(!item)throw Error('Aufgabe nicht geladen. Erst synchronisieren.');
   await request(`/tasks/${encodeURIComponent(id)}/close`,{method:'POST'});
   const at=new Date().toISOString();
   awardCompleted({...item,completed_at:at});
   window.LifeRPGHoliday?.refreshLinkedCompletions?.([{id:item.id,completed_at:at}]);
   if(!recurrence(item))tasks=tasks.filter(t=>t.id!==item.id);
   persist('todoist-task-close');
   render();window.LifeRPGDaily?.render?.();app.showToast?.('Aufgabe in Todoist erledigt ✓');
   // Recurring tasks get an updated occurrence on next sync.
   return true;
 }
 async function create(content){const title=String(content||'').trim().slice(0,180);if(!title)throw Error('Bitte eine Aufgabe eingeben.');const item=await request('/tasks',{method:'POST',body:JSON.stringify({content:title})});await sync({quiet:true});return item;}
 let q='';
 function render(){if(!dialog)return;
   const target=dialog.querySelector('[data-todoist-content]');if(!target)return;
   const matched=tasks.filter(t=>t.content.toLowerCase().includes(q.toLowerCase())).slice(0,80);
   const verified=connected && !!currentToken();const m=model();
   target.innerHTML=`<p class="muted">Gratis-API · direkter Sync nur bei geöffneter Life-RPG-App oder manuellem Aktualisieren. Kein geheimes Token im Cloud-Save. ${lastError?esc(lastError):''}</p>
     <div class="todoist-connect"><span>${verified?'✓ Verbunden':currentToken()?'Verbindung prüfen':'Nicht verbunden'}</span><a href="https://app.todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener">Persönlichen API-Token in Todoist finden ↗</a></div>
     ${verified?'':`<form data-todoist-connect-form><label>Persönlicher Todoist API-Token (nicht in den Cloud-Save)<input type="password" name="token" required autocomplete="off" placeholder="Token hier einfügen"></label><label class="todoist-remember"><input type="checkbox" name="remember"> Nur auf diesem Gerät merken (Sicherheitsabwägung)</label><button class="primary-button" type="submit">Verbinden</button></form>`}
     <div class="todoist-actions"><button type="button" class="secondary-button" data-todoist-refresh ${currentToken()?'':'disabled'}>↻ Synchronisieren</button><button type="button" class="text-button" data-todoist-disconnect>Token hier entfernen</button></div>
     <label class="todoist-reward-mode">Automatische Rewards für neue Todoist-Abschlüsse
       <select data-todoist-reward-mode><option value="safe" ${m.rewardMode!=='all'?'selected':''}>Nur Ferien-verknüpfte Aufgaben</option><option value="all" ${m.rewardMode==='all'?'selected':''}>Auch andere Todoist-Aufgaben (ohne bekannte Schulcockpit-Duplikate)</option></select>
     </label><small class="muted">Vor der ersten Verbindung erledigte Aufgaben geben keine Retro-Rewards. Schularbeit aus Schulcockpit wird nicht doppelt vergütet. Wiederholungen einmal pro Kalendertag.</small>
     ${verified?`<form data-todoist-add-form class="todoist-add-form"><input name="title" placeholder="Schnelle neue Todoist-Aufgabe…" maxlength="180" required><button class="primary-button">Zu Todoist hinzufügen</button></form>
       <label>Aufgaben durchsuchen<input id="todoistQuery" placeholder="Suchen…" value="${esc(q)}"></label><div class="todoist-task-list">${matched.map(t=>`<article class="todoist-task"><div><strong>${esc(t.content)}</strong><small>${t.due?.date?esc(t.due.date):'Ohne Datum'} · ${t.priority>=3?'Wichtig':'Offen'}${t.labels?.length?' · '+esc(t.labels.slice(0,3).join(', ')):''}</small></div><div><button type="button" class="secondary-button" data-todoist-link="${esc(t.id)}" ${matchedHoliday(t)?'disabled':''}>${matchedHoliday(t)?'Im Ferien-Board':'Für Ferien auswählen'}</button><button type="button" class="secondary-button" data-todoist-done="${esc(t.id)}">✓</button></div></article>`).join('')||'<p>Keine passenden offenen Aufgaben.</p>'}</div>`:''}`;
 }
 function open(){if(!dialog){dialog=document.createElement('dialog');dialog.className='rpg-dialog todoist-dialog';dialog.innerHTML='<div class="todoist-header"><div><p class="eyebrow">TASK BRIDGE</p><h2>Todoist ↔ Life RPG</h2></div><button type="button" class="close-button" data-todoist-close aria-label="Schließen">×</button></div><div data-todoist-content></div>';document.body.appendChild(dialog);
  dialog.addEventListener('submit',async e=>{e.preventDefault();const form=e.target;const d=new FormData(form);const btn=form.querySelector('button[type=submit],button:not([type])');if(btn)btn.disabled=true;try{if(form.matches('[data-todoist-connect-form]'))await connect(d.get('token'),d.get('remember')==='on');if(form.matches('[data-todoist-add-form]')){await create(d.get('title'));app.showToast('In Todoist erstellt ✓');}render();}catch(err){lastError=err.message;render();app.showToast?.(err.message);}finally{if(btn)btn.disabled=false;}});
  dialog.addEventListener('input',e=>{if(e.target.id==='todoistQuery'){q=e.target.value;render();const n=dialog.querySelector('#todoistQuery');n?.focus();n?.setSelectionRange(q.length,q.length);}});
  dialog.addEventListener('change',e=>{if(e.target.matches('[data-todoist-reward-mode]')){model().rewardMode=e.target.value==='all'?'all':'safe';persist('todoist-reward-preference');}});
  dialog.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-todoist-close'))dialog.close();
    if(b.hasAttribute('data-todoist-disconnect')){disconnect();}
    if(b.hasAttribute('data-todoist-link')){const t=tasks.find(t=>t.id===b.dataset.todoistLink);if(t){window.LifeRPGHoliday?.linkTodoist?.({id:t.id,content:t.content,minutes:t.duration?.amount,group:/(schule|unterricht|mathe|religion|klassenarbeit|jahrgang|note|arbeitsblatt)/i.test(t.content) ? 'school' : /(putz|ausmist|zimmer|wäsch|wäsche|haus|küche|badezimmer)/i.test(t.content) ? 'space' : 'joy'});render();app.showToast?.('Aufgabe zum Ferien-Board hinzugefügt.');}}
    if(b.hasAttribute('data-todoist-refresh')){b.disabled=true;try{await sync();}catch{b.disabled=false;}}
    if(b.hasAttribute('data-todoist-done')){b.disabled=true;try{await complete(b.dataset.todoistDone);}catch(err){app.showToast?.(err.message);b.disabled=false;}}
  });}
  render();dialog.showModal();if(currentToken()&&!connected)sync({quiet:true}).catch(()=>{});
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-todoist-open]'))open();});
 window.LifeRPGTodoist={open,connected:()=>connected,hasTask,sync,complete,linkToBreak:id=>{const t=tasks.find(t=>t.id===String(id));return t&&window.LifeRPGHoliday?.linkTodoist?.(t);},_test:{model,receiptKey,likelyDuplicate,awardCompleted,normalizedTasks,connect,disconnect}};
 // On returning to the open app, a previously authorized session may resync;
 // there is deliberately no background poll, webhook or OAuth secret in the PWA.
 let lastVisibilitySync = 0;
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible' && currentToken() && Date.now()-lastVisibilitySync > 30000){
     lastVisibilitySync=Date.now(); sync({quiet:true}).catch(()=>{});
   }
 });
})();
