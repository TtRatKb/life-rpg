/* Life RPG · DZ23b. Direct Todoist v1 bridge + Daily Plan suggestions. No token in app/cloud save. */
(() => {
 'use strict';
 const app=window.LifeRPGApp;
 if(!app?.getState||!app.awardActivity)return;
 const SESSION='life-rpg-todoist-access-session-v1', DEVICE='life-rpg-todoist-access-device-v1';
 const API='https://api.todoist.com/api/v1';
 const esc=v=>app.escapeHtml(String(v??''));
 let tasks=[],projects=[],connected=false,busy=false,dialog=null,lastError='',lastSyncAt='',q='',taskFilter='due';
 const currentToken=()=>{try{return sessionStorage.getItem(SESSION)||localStorage.getItem(DEVICE)||'';}catch{return '';}};
 function model(){const st=app.getState();st.todoistBridgeV1 ||= {schemaVersion:1,connectedAt:'',receipts:{},rewardMode:'safe'};if(typeof st.todoistBridgeV1.dailyEnabled!=='boolean')st.todoistBridgeV1.dailyEnabled=true;return st.todoistBridgeV1;}
 function persist(source){return app.saveState({source,suppressUiRefresh:true});}
 function safeDate(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
 function dayKey(v){const d=new Date(v);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';}
 function recurrence(item){return Boolean(item?.due?.is_recurring);}
 function receiptKey(item){const id=String(item?.id||'');return id?`todoist:${id}${recurrence(item)?':'+dayKey(item.completed_at||new Date().toISOString()):''}`:'';}
 function likelyDuplicate(item){
   // Better to miss a small Todoist reward than double-pay completed school work.
   // The school source keeps canonical Work XP; Todoist is a task mirror.
   const s=[item.content,...(item.labels||[])].join(' ').toLowerCase();
   return /schulcockpit|unterrichtsvorbereitung|unterricht vorbereitet|klausuranalyse|prüfungsanalyse|reihenplanung|stundenplanung|jahresplan|klassenarbeit|kompetenzbogen|kompetenzbögen|korrektur|korrigieren|materialvorbereitung|unterrichtsreflexion|prüfungsanalyse/.test(s);
 }
 function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 function addDays(date,days){const [y,m,d]=date.split('-').map(Number);const dt=new Date(y,m-1,d+days);return [dt.getFullYear(),String(dt.getMonth()+1).padStart(2,'0'),String(dt.getDate()).padStart(2,'0')].join('-');}
 function dueDay(t){return String(t?.due?.date||'').slice(0,10);}
 function minutes(t){const d=t?.duration;const n=Number(d?.amount||0);return n>0?(d.unit==='day'?Math.min(240,n*480):Math.min(240,Math.round(n))):20;}
 function schoolRoutine(t){return Boolean(t?.due?.is_recurring && /webuntis|plus\/minus\/null|klassenbuch|schülerbeobachtungen|notenstand|beteiligungsmarkierung/i.test([t.content,...(t.labels||[])].join(' ')));}
 function taskGroup(t){const label=[t.content,...(t.labels||[])].join(' ').toLowerCase();
   if(/unterricht|schule|schüler|noten|lehr|religion|mathe|eltern|klassen|tutoren|busunternehmen|jahresplan|förder/.test(label))return 'school';
   if(/putz|ausmist|zimmer|wäsche|wäsch|badezimmer|küche|wohn|regale|staub|aufräum|boden|müll/.test(label))return 'space';
   if(/datei|macbook|cloud|downloads|ordner|backup|digital/.test(label))return 'digital';
   if(/buch|lesen|gaming|spiel|bastel|zeichnen|malen|anime|hobby|figur|keramik|kreativ/.test(label))return 'joy';
   return 'life';
 }
 function holidayLinked(t){return Boolean(window.LifeRPGHoliday?.active?.()?.goals?.some(g=>g.linkedTodoistId===String(t.id)));}
 function holidayDuplicate(t){const title=String(t.content||'').trim().toLowerCase();return Boolean(title && window.LifeRPGHoliday?.active?.()?.goals?.some(g=>!g.doneAt && String(g.title||'').trim().toLowerCase()===title));}
 function scoreForDaily(t,slot,checkIn={}){
   if(!connected||!model().dailyEnabled||!t || holidayLinked(t)||holidayDuplicate(t)||isCompleted(t.id))return -1000;
   const date=dueDay(t), now=today();if(!date||date>addDays(now,1)||date<addDays(now,-7))return -1000;
   const group=taskGroup(t), low=checkIn.gentle||['low','fumes'].includes(checkIn.energy)||checkIn.time==='little';
   const sick=checkIn.health?.dayCleared||checkIn.dayCleared;
   if((sick||low&&minutes(t)>25) && group==='school')return -1000;
   if(window.LifeRPGHoliday?.inPeriod?.() && schoolRoutine(t))return -1000;
   if(slot==='joy'||group==='joy'||group==='recovery')return -1000; // Protect leisure; hobby/rest items belong in their native Joy sources.
   if(slot==='gentle' && (group==='school'||minutes(t)>20))return -1000;
   if(slot==='focus' && low && minutes(t)>30)return -1000;
   if(checkIn.time==='none' && minutes(t)>15)return -1000;
   let score=slot==='focus'?4.0:3.6;
   if(date===now)score+=1.5;
   else if(date<now)score+=1.8;
   else score+=0.3;
   if(Number(t.priority)>=3)score+=1.3;
   else if(Number(t.priority)===2)score+=0.5;
   if(group==='school'&&slot==='focus')score+=0.3;
   if(group==='space'&&slot==='gentle')score+=0.8;
   if(low&&minutes(t)<=15)score+=0.5;
   if(minutes(t)>60)score-=1.5;
   return score;
 }
 function eligibleForDaily(){if(!connected||!model().dailyEnabled)return [];const now=today();return tasks.filter(t=>!holidayLinked(t)&&!holidayDuplicate(t)&&!isCompleted(t.id)&&dueDay(t)>=addDays(now,-7)&&dueDay(t)<=addDays(now,1)).filter(t=>!(window.LifeRPGHoliday?.inPeriod?.()&&schoolRoutine(t))).slice(0,70);}
 function getTask(id){return connected?tasks.find(t=>t.id===String(id))||null:null;}
 function isCompleted(id){const key=`todoist:${id}`;return Boolean(model().receipts?.[`${key}:${today()}`]) || (Boolean(model().receipts?.[key]) && !getTask(id));}
 
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
 function matchedHoliday(item){return holidayLinked(item);}
 function awardCompleted(item){
   const key=receiptKey(item);if(!key||model().receipts[key])return false;
   const stamp=item.completed_at||new Date().toISOString();
   const pastEvent=(app.getState().rewardLedger?.events||[]).find(e=>e.source==='todoist-completion' && e.sourceId===key && !e.duplicate);
   const blocked=likelyDuplicate(item);
   const mode=model().rewardMode||'safe';const linkedGoal=window.LifeRPGHoliday?.active?.()?.goals?.find(g=>g.linkedTodoistId===String(item.id));
   const eligible=!blocked && (mode==='all'||Boolean(linkedGoal));
   const realm=linkedGoal?.group==='school'?'Work':linkedGoal?.group==='joy'?'Hobbies':linkedGoal?.group==='recovery'?'Recovery':taskGroup(item)==='school'?'Work':taskGroup(item)==='joy'?'Hobbies':'Home';
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
     let nextProjects=[];try{nextProjects=await paged('/projects');}catch{ /* optional project labels should not break task sync */ }
     // Connection timestamp creates a strict no-retro-reward boundary. Never
     // convert an old completed Todoist task into a fresh XP grant.
     const first=!model().connectedAt;
     const since=first?new Date().toISOString():model().connectedAt;
     const days=Math.min(89,Math.max(1,Math.ceil((Date.now()-safeDate(since))/86400000)+2));
     const start=new Date(Date.now()-days*86400000).toISOString();
     let completed=[],historyWarning='';
     try{completed=await paged(`/tasks/completed/by_completion_date?since=${encodeURIComponent(start)}&until=${encodeURIComponent(new Date(Date.now()+60000).toISOString())}`,'items',1200);}catch(e){historyWarning=`Abschluss-Historie derzeit nicht verfügbar (${e.message}). Es werden keine unbestätigten Rewards vergeben.`;}
     tasks=next;projects=nextProjects;connected=true;lastError=historyWarning;lastSyncAt=new Date().toISOString();
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
     if(!quiet)app.showToast?.(`Todoist: ${tasks.length} Aufgaben aktualisiert${awarded?` · ${awarded} neue Abschlüsse belohnt`:''}${historyWarning?' · Abschluss-Historie nicht abrufbar':''}.`);
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
 function disconnect(){sessionStorage.removeItem(SESSION);localStorage.removeItem(DEVICE);connected=false;tasks=[];projects=[];lastSyncAt='';render();window.LifeRPGDaily?.render?.();}
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
 async function create(content,options={}){
   const title=String(content||'').trim().slice(0,180);if(!title)throw Error('Bitte eine Aufgabe eingeben.');
   const body={content:title};
   if(options.projectId)body.project_id=String(options.projectId);
   if(/^\d{4}-\d{2}-\d{2}$/.test(options.dueDate||''))body.due_date=options.dueDate;
   if(['1','2','3','4'].includes(String(options.priority)))body.priority=Number(options.priority);
   const item=await request('/tasks',{method:'POST',body:JSON.stringify(body)});await sync({quiet:true});return item;
 }
 function dateText(t){const d=dueDay(t);return !d?'Ohne Datum':d<today()?`Überfällig · ${d}`:d===today()?'Heute':d===addDays(today(),1)?'Morgen':d;}
 function filteredTasks(){let list=tasks.filter(t=>t.content.toLowerCase().includes(q.toLowerCase()));
   if(taskFilter==='due')list=list.filter(t=>dueDay(t)&&dueDay(t)<=addDays(today(),7));
   if(taskFilter==='today')list=list.filter(t=>dueDay(t)&&dueDay(t)<=today());
   if(taskFilter==='undated')list=list.filter(t=>!dueDay(t));
   return list.sort((a,b)=>{const aa=dueDay(a)||'9999-99-99',bb=dueDay(b)||'9999-99-99';return aa.localeCompare(bb)||Number(b.priority)-Number(a.priority)||a.content.localeCompare(b.content);}).slice(0,100);
 }
 function render(){if(!dialog)return;
   const target=dialog.querySelector('[data-todoist-content]');if(!target)return;
   const matched=filteredTasks();
   const verified=connected && !!currentToken();const m=model();
   target.innerHTML=`<p class="muted">Gratis-API · Abgleich beim Öffnen / Zurückkehren in die App. Kein Token im Cloud-Save. ${lastSyncAt?'Letzte Synchronisierung: '+esc(new Date(lastSyncAt).toLocaleString('de-DE'))+'. ':''}${lastError?'<strong>'+esc(lastError)+'</strong>':''}</p>
     <div class="todoist-connect"><span>${verified?'✓ Verbunden':currentToken()?'Verbindung prüfen':'Nicht verbunden'}</span><a href="https://app.todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener">Persönlichen API-Token in Todoist finden ↗</a></div>
     ${verified?'':`<form data-todoist-connect-form><label>Persönlicher Todoist API-Token (nicht in den Cloud-Save)<input type="password" name="token" required autocomplete="off" placeholder="Token hier einfügen"></label><label class="todoist-remember"><input type="checkbox" name="remember"> Nur auf diesem Gerät merken (Sicherheitsabwägung)</label><button class="primary-button" type="submit">Verbinden</button></form>`}
     <div class="todoist-actions"><button type="button" class="secondary-button" data-todoist-refresh ${currentToken()?'':'disabled'}>↻ Synchronisieren</button><button type="button" class="text-button" data-todoist-disconnect>Token hier entfernen</button></div>
     <label class="todoist-reward-mode">Automatische Rewards für neue Todoist-Abschlüsse
       <select data-todoist-reward-mode><option value="safe" ${m.rewardMode!=='all'?'selected':''}>Nur Ferien-verknüpfte Aufgaben</option><option value="all" ${m.rewardMode==='all'?'selected':''}>Auch andere Todoist-Aufgaben (ohne bekannte Schulcockpit-Duplikate)</option></select>
     </label><label class="todoist-remember"><input type="checkbox" data-todoist-daily-enabled ${m.dailyEnabled!==false?'checked':''}> Fällige Todoist-Aufgaben im Tagesplan vorschlagen (Focus / Gentle, niemals Joy)</label><small class="muted">Vor der ersten Verbindung erledigte Aufgaben geben keine Retro-Rewards. Schularbeit aus Schulcockpit wird nicht doppelt vergütet. Wiederholungen einmal pro Kalendertag.</small>
     ${verified?`<form data-todoist-add-form class="todoist-add-form"><strong>Neue Aufgabe direkt in Todoist</strong><input name="title" placeholder="Was möchtest du erledigen?" maxlength="180" required><div class="todoist-add-details"><label>Fällig am<input type="date" name="dueDate"></label><label>Projekt<select name="projectId"><option value="">Eingang</option>${projects.filter(p=>!p.is_archived).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><label>Priorität<select name="priority"><option value="1">Normal</option><option value="2">Mittel</option><option value="3">Hoch</option><option value="4">Sehr hoch</option></select></label></div><button class="primary-button">Zu Todoist hinzufügen</button></form>
       <div class="todoist-filters"><label>Aufgabenansicht<select data-todoist-task-filter><option value="due" ${taskFilter==='due'?'selected':''}>Fällig in den nächsten 7 Tagen / überfällig</option><option value="today" ${taskFilter==='today'?'selected':''}>Heute und überfällig</option><option value="all" ${taskFilter==='all'?'selected':''}>Alle offenen Aufgaben</option><option value="undated" ${taskFilter==='undated'?'selected':''}>Ohne Datum</option></select></label><label>Suche<input id="todoistQuery" placeholder="Aufgaben suchen…" value="${esc(q)}"></label></div><small class="muted">${matched.length} angezeigt von ${tasks.length} offenen Aufgaben. Ein Todoist-Abschluss zählt einmal; das Ferien-Board zahlt keinen zweiten Reward.</small>
       <div class="todoist-task-list">${matched.map(t=>`<article class="todoist-task"><div><strong>${esc(t.content)}</strong><small>${esc(dateText(t))} · ${esc(projects.find(p=>String(p.id)===t.project_id)?.name||'Todoist')} · ${t.priority>=3?'Hohe Priorität':'Offen'}${t.labels?.length?' · '+esc(t.labels.slice(0,3).join(', ')):''}</small></div><div><button type="button" class="secondary-button" data-todoist-link="${esc(t.id)}" ${matchedHoliday(t)?'disabled':''}>${matchedHoliday(t)?'Im Ferien-Board':'Für Ferien auswählen'}</button><button type="button" class="secondary-button" data-todoist-done="${esc(t.id)}" aria-label="Aufgabe in Todoist abschließen">✓</button></div></article>`).join('')||'<p>Keine passenden offenen Aufgaben.</p>'}</div>`:''}`;
 }
 function open(){if(!dialog){dialog=document.createElement('dialog');dialog.className='rpg-dialog todoist-dialog';dialog.innerHTML='<div class="todoist-header"><div><p class="eyebrow">TASK BRIDGE</p><h2>Todoist ↔ Life RPG</h2></div><button type="button" class="close-button" data-todoist-close aria-label="Schließen">×</button></div><div data-todoist-content></div>';document.body.appendChild(dialog);
  dialog.addEventListener('submit',async e=>{e.preventDefault();const form=e.target;const d=new FormData(form);const btn=form.querySelector('button[type=submit],button:not([type])');if(btn)btn.disabled=true;try{if(form.matches('[data-todoist-connect-form]'))await connect(d.get('token'),d.get('remember')==='on');if(form.matches('[data-todoist-add-form]')){await create(d.get('title'),{dueDate:d.get('dueDate'),projectId:d.get('projectId'),priority:d.get('priority')});app.showToast('In Todoist erstellt ✓');}render();}catch(err){lastError=err.message;render();app.showToast?.(err.message);}finally{if(btn)btn.disabled=false;}});
  dialog.addEventListener('input',e=>{if(e.target.id==='todoistQuery'){q=e.target.value;render();const n=dialog.querySelector('#todoistQuery');n?.focus();n?.setSelectionRange(q.length,q.length);}});
  dialog.addEventListener('change',e=>{if(e.target.matches('[data-todoist-reward-mode]')){model().rewardMode=e.target.value==='all'?'all':'safe';persist('todoist-reward-preference');}if(e.target.matches('[data-todoist-daily-enabled]')){model().dailyEnabled=e.target.checked;persist('todoist-daily-preference');window.LifeRPGDaily?.render?.();}if(e.target.matches('[data-todoist-task-filter]')){taskFilter=e.target.value;render();}});
  dialog.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-todoist-close'))dialog.close();
    if(b.hasAttribute('data-todoist-disconnect')){disconnect();}
    if(b.hasAttribute('data-todoist-link')){const t=tasks.find(t=>t.id===b.dataset.todoistLink);if(t){window.LifeRPGHoliday?.linkTodoist?.({id:t.id,content:t.content,minutes:minutes(t),group:taskGroup(t)==='school'?'school':taskGroup(t)==='space'?'space':taskGroup(t)==='digital'?'digital':'joy'});render();app.showToast?.('Aufgabe zum Ferien-Board hinzugefügt.');}}
    if(b.hasAttribute('data-todoist-refresh')){b.disabled=true;try{await sync();}catch{b.disabled=false;}}
    if(b.hasAttribute('data-todoist-done')){b.disabled=true;try{await complete(b.dataset.todoistDone);}catch(err){app.showToast?.(err.message);b.disabled=false;}}
  });}
  render();dialog.showModal();if(currentToken()&&!connected)sync({quiet:true}).catch(()=>{});
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-todoist-open]'))open();});
 window.LifeRPGTodoist={open,connected:()=>connected,hasTask,getTask,eligibleForDaily,scoreForDaily,isCompleted,groupForTask:taskGroup,estimatedMinutes:minutes,sync,complete,linkToBreak:id=>{const t=tasks.find(t=>t.id===String(id));return t&&window.LifeRPGHoliday?.linkTodoist?.(t);},_test:{model,receiptKey,likelyDuplicate,awardCompleted,normalizedTasks,connect,disconnect,taskGroup,dueDay,minutes,schoolRoutine,create}};
 // On returning to the open app, a previously authorized session may resync;
 // there is deliberately no background poll, webhook or OAuth secret in the PWA.
 let lastVisibilitySync = 0;
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible' && currentToken() && Date.now()-lastVisibilitySync > 30000){
     lastVisibilitySync=Date.now(); sync({quiet:true}).catch(()=>{});
   }
 });
})();
