/* Life RPG · DZ27. Task source-of-truth + selective vacation backlog + baseline-safe rewards. No token in app/cloud save. */
(() => {
 'use strict';
 const app=window.LifeRPGApp;
 if(!app?.getState||!app.awardActivity)return;
 const SESSION='life-rpg-todoist-access-session-v1', DEVICE='life-rpg-todoist-access-device-v1';
 const API='https://api.todoist.com/api/v1';
 const esc=v=>app.escapeHtml(String(v??''));
 let tasks=[],projects=[],connected=false,busy=false,lastError='',lastSyncAt='',q='',taskFilter='due',projectFilter='',showSettings=false,showMore=0,loadingOpen=false,rewardMigrationPending=false,schoolEventPick='',schoolTaskQuery='',schoolTaskPick='',schoolPanelOpen=false;
 const mount=()=>document.getElementById('todoistPageMount');
 const currentToken=()=>{try{return sessionStorage.getItem(SESSION)||localStorage.getItem(DEVICE)||'';}catch{return '';}};
 function model(){
   const st=app.getState();st.todoistBridgeV1 ||= {schemaVersion:1,connectedAt:'',receipts:{},rewardMode:'all'};
   const m=st.todoistBridgeV1;
   if(!m.receipts||typeof m.receipts!=='object')m.receipts={};
   if(typeof m.dailyEnabled!=='boolean')m.dailyEnabled=true;
   if(!m.schoolLinks || typeof m.schoolLinks!=='object' || Array.isArray(m.schoolLinks))m.schoolLinks={};
   // DZ23a–c silently defaulted to 'safe' (holidays only). Keep receipts and
   // the historical first-connection cutoff, but enable everyday tasks now.
   // A user may opt back out afterwards. No old blocked receipt is re-paid.
   if(!m.rewardModeMigrationDz23d){m.rewardMode='all';m.rewardModeMigrationDz23d=true;rewardMigrationPending=true;}
   return m;
 }
 function persist(source){return app.saveState({source,suppressUiRefresh:true});}
 function safeDate(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
 function dayKey(v){const d=new Date(v);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';}
 function recurrence(item){return Boolean(item?.due?.is_recurring);}
 function receiptKey(item){const id=String(item?.id||'');return id?`todoist:${id}${recurrence(item)?':'+dayKey(item.completed_at||new Date().toISOString()):''}`:'';}
 // Explicit one-to-one event ↔ task links are retained in canonical (cloud-safe)
 // state, never in the Todoist API token store. Never guess an identity from a title.
 const SCHOOL_TYPES = Object.freeze({
   'lesson-prepared':'Unterricht vorbereitet',
   'lesson-reflected':'Unterricht reflektiert',
   'preparation-completed':'Material-/Druckvorbereitung',
   'assessment-analyzed':'Prüfungsanalyse',
   'sequence-planned':'Reihenplanung'
 });
 function schoolReceipts(){return app.getState().schoolBridgeV1?.receipts||{};}
 function linkedSchoolEventForTask(taskId){
   const id=String(taskId||'');return Object.keys(model().schoolLinks).find(e=>model().schoolLinks[e]?.taskId===id)||'';
 }
 function availableSchoolEvents(){
   const now=Date.now();return Object.entries(schoolReceipts()).filter(([id,r])=>
     Object.hasOwn(SCHOOL_TYPES,id.split(':')[0]) && r && Number.isFinite(safeDate(r.at)) &&
     safeDate(r.at)<=now+60000 && now-safeDate(r.at)<45*86400000
   ).sort((a,b)=>safeDate(b[1].at)-safeDate(a[1].at)).slice(0,35);
 }
 function schoolEventText(eventId){
   const type=String(eventId).split(':')[0];return SCHOOL_TYPES[type]||'Schulcockpit';
 }
 function recentSchoolUnlinked(){return availableSchoolEvents().filter(([id])=>!model().schoolLinks[id]);}
 function matchingSchoolTask(task,eventId){
   const s=String(task?.content||'').toLocaleLowerCase('de-DE');
   const type=String(eventId).split(':')[0];
   const patterns={
    'lesson-prepared':/unterricht|stunde|stundenplanung|präsentation|arbeitsblatt|folie|powerpoint|unterrichtsvorbereitung|lesson/i,
    'lesson-reflected':/reflexion|reflektier|nachbereit|unterricht.*auswert|lesson review/i,
    'preparation-completed':/druck|kopie|kopier|material|vorbereit|laminier|ausdruck/i,
    'assessment-analyzed':/analyse|auswert|prüfung|klassenarbeit|klausur|kompetenzzettel|korrektur|korrigier/i,
    'sequence-planned':/reihe|jahresplan|sequenz|curriculum|reihenplanung/i
   };
   return patterns[type]?.test(s)||false;
 }
 function likelyDuplicate(item){
   // We cannot prove that two *different* task IDs / app events describe the
   // same real action until Schulcockpit propagates the same correlation ID.
   // Suppress for explicitly tagged mirrors and typical actual bridge actions,
   // not for every school-related task (email, planning a call, ideas, etc.).
   const labels=(item.labels||[]).map(v=>String(v).toLowerCase());
   if(labels.some(x=>/^(schulcockpit|already-rewarded|life-rpg-logged|lrpg:external-reward)$/.test(x)))return true;
   const s=String(item.content||'').toLowerCase();
   return /(?:unterricht(?:s|\s)?vorbereitung (?:abgeschlossen|fertig)|unterricht (?:vorbereitet|reflektiert)|(?:klassenarbeit|klausur|prüfung) (?:analysiert|korrigiert)|(?:material|unterrichts)vorbereitung (?:abgeschlossen|fertig))/i.test(s);
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
 function vacationCandidates({start='',end='',mode='backlog'}={}){
   if(!connected)return [];
   const from=addDays(start||today(),-14), through=end||addDays(today(),14);
   return tasks.filter(t=>!holidayLinked(t) && !isCompleted(t.id) && (
     mode==='all' || (!recurrence(t) && dueDay(t) && dueDay(t)>=from && dueDay(t)<=through)
   )).sort((a,b)=>(dueDay(a)||'9999').localeCompare(dueDay(b)||'9999')||b.priority-a.priority||a.content.localeCompare(b.content));
 }
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
 function normalizedTasks(list){return list.map(t=>({
   id:String(t.id),content:String(t.content||'').slice(0,220),
   description:String(t.description||'').slice(0,2500),
   labels:Array.isArray(t.labels)?t.labels.slice(0,30).map(String):[],
   priority:Number(t.priority||1),due:t.due||null,project_id:String(t.project_id||''),
   parent_id:String(t.parent_id||''),duration:t.duration||null,section_id:String(t.section_id||''),
   added_at:String(t.added_at||'')
 }));}
 function matchedHoliday(item){return holidayLinked(item);}
 function awardCompleted(item){
   const key=receiptKey(item);if(!key||model().receipts[key])return false;
   const stamp=item.completed_at||new Date().toISOString();
   const pastEvent=(app.getState().rewardLedger?.events||[]).find(e=>e.source==='todoist-completion' && e.sourceId===key && !e.duplicate);
   const blocked=likelyDuplicate(item)||Boolean(linkedSchoolEventForTask(item.id));
   const mode=model().rewardMode||'all';const linkedGoal=window.LifeRPGHoliday?.active?.()?.goals?.find(g=>g.linkedTodoistId===String(item.id));
   const eligible=!blocked && mode==='all';
   const realm=linkedGoal?.group==='school'?'Work':linkedGoal?.group==='joy'?'Hobbies':linkedGoal?.group==='recovery'?'Recovery':taskGroup(item)==='school'?'Work':taskGroup(item)==='joy'?'Hobbies':'Home';
   let eventId=pastEvent?.id||null;
   if(eligible && !pastEvent){
     // Small one-off task reward, never effort/time rewards; actual focus, school
     // and Quest activity must still be logged only in their canonical system.
     const reward=app.awardActivity({source:'todoist-completion',sourceId:key,label:`Todoist · ${String(item.content||'Aufgabe').slice(0,120)}`,realm,xp:3,realmXP:3,statXP:0,coins:2,storyEnergyBase:0.1,skipAddOnRewards:true,progressionRelevant:true,at:stamp,metadata:{bridge:'todoist',type:'task',rewardMode:mode,taskId:String(item.id)}});
     eventId=reward.eventId||null;
   }
   model().receipts[key]={at:stamp,eventId,blocked:blocked||!eligible};
   return eligible && !pastEvent;
 }
 // Persist intent before any remote write. A failed Todoist request remains
 // pending and is retried on the next explicit/foreground sync, without paying XP.
 async function closeSchoolLinked(eventId,{quiet=false}={}){
   const link=model().schoolLinks[eventId];if(!link||link.status==='done')return false;
   if(!schoolReceipts()[eventId])return false; // Do not close without canonical school completion
   const task=tasks.find(t=>t.id===link.taskId);
   if(!task)return false; // Remote completed/absent: wait for verified Todoist history
   if(recurrence(task))throw Error('Wiederkehrende Aufgaben können nicht fest verknüpft werden.');
   // A canonical receipt is already present, so Todoist must NEVER pay again.
   await request(`/tasks/${encodeURIComponent(link.taskId)}/close`,{method:'POST'});
   const at=new Date().toISOString();const key=`todoist:${link.taskId}`;
   model().receipts[key] ||= {at,eventId:null,blocked:true,schoolEventId:eventId};
   link.status='done';link.closedAt=at;
   tasks=tasks.filter(t=>t.id!==link.taskId);
   window.LifeRPGHoliday?.refreshLinkedCompletions?.([{id:link.taskId,completed_at:at}]);
   if(persist('school-todoist-matched-close')===false)throw Error('Todoist ist erledigt, aber der Life-RPG-Speicher konnte nicht bestätigt werden. Bitte Save prüfen; nicht neu laden.');
   if(!quiet)app.showToast?.('Schulcockpit-Abschluss mit Todoist abgeglichen · ohne doppelten Reward ✓');
   return true;
 }
 async function linkSchoolEvent(eventId,taskId){
   const id=String(eventId||''), tid=String(taskId||'');
   if(!schoolReceipts()[id] || !Object.hasOwn(SCHOOL_TYPES,id.split(':')[0]))throw Error('Dieser Schulcockpit-Abschluss ist nicht nachgewiesen.');
   if(model().schoolLinks[id])throw Error('Dieser Abschluss ist schon einer Todoist-Aufgabe zugeordnet.');
   if(linkedSchoolEventForTask(tid))throw Error('Diese Aufgabe ist bereits einem Schulcockpit-Abschluss zugeordnet.');
   if(!connected||!currentToken())throw Error('Todoist ist nicht verbunden.');
   const item=tasks.find(t=>t.id===tid);
   if(!item)throw Error('Die Aufgabe ist nicht mehr offen. Bitte zuerst synchronisieren.');
   if(recurrence(item))throw Error('Wiederkehrende Todoist-Aufgaben brauchen pro Auftreten eine separate Zuordnung und werden hier nicht automatisch geschlossen.');
   if(model().receipts[`todoist:${tid}`])throw Error('Die Aufgabe wurde bereits verarbeitet und kann nicht nochmal verknüpft werden.');
   const link={taskId:tid,linkedAt:new Date().toISOString(),status:'pending'};
   model().schoolLinks[id]=link;
   if(persist('school-todoist-link-intent')===false){delete model().schoolLinks[id];throw Error('Verknüpfung konnte nicht sicher gespeichert werden. Nichts wurde in Todoist geändert.');}
   // Already associated; if network fails the pending link survives app reload.
   try{await closeSchoolLinked(id);}catch(e){lastError=`Schulcockpit-Zuordnung gespeichert, Todoist-Abschluss noch ausstehend: ${e.message}`;render();throw e;}
   render();return true;
 }
 async function reconcilePendingSchoolLinks(){
   if(!connected||!currentToken())return 0;
   let count=0;
   for(const [id,link] of Object.entries(model().schoolLinks)){
     if(!link || link.status==='done' || !schoolReceipts()[id])continue;
     if(!tasks.some(t=>t.id===link.taskId))continue;
     try{if(await closeSchoolLinked(id,{quiet:true}))count++;}
     catch(e){console.warn('Schulcockpit-Todoist-Abgleich ausstehend',e);}
   }
   return count;
 }
 function schoolTaskOptions(){
   const linkedIds=new Set(Object.values(model().schoolLinks).map(x=>x?.taskId));
   const available=tasks.filter(t=>!recurrence(t) && !linkedIds.has(t.id)&&!model().receipts[`todoist:${t.id}`]);
   const term=schoolTaskQuery.trim().toLocaleLowerCase('de-DE');
   const matches=available.filter(t=>!term||`${t.content} ${t.description}`.toLocaleLowerCase('de-DE').includes(term));
   return matches.sort((a,b)=>Number(matchingSchoolTask(b,schoolEventPick))-Number(matchingSchoolTask(a,schoolEventPick)) ||
     a.content.localeCompare(b.content)).slice(0,35);
 }
 function schoolMatchMarkup(){
   if(!connected)return '';
   const recent=recentSchoolUnlinked();
   const pending=Object.entries(model().schoolLinks).filter(([,v])=>v?.status!=='done').length;
   const done=Object.values(model().schoolLinks).filter(v=>v?.status==='done').length;
   if(!recent.length&&!pending&&!done)return '';
   if(!recent.some(([id])=>id===schoolEventPick))schoolEventPick=recent[0]?.[0]||'';
   const school=schoolEventPick && recent.length;
   const options=school?schoolTaskOptions():[];
   return `<details class="todoist-panel todoist-school-match" ${schoolPanelOpen?'open':''}>
     <summary>↔ Schulcockpit & Todoist abgleichen <span>${pending?`${pending} ausstehend · `:''}${done} verknüpft · ${recent.length} neu</span></summary>
     <div class="todoist-school-match-body"><p>Hast du dieselbe Arbeit schon im Schulcockpit abgeschlossen? Ordne <strong>nur die wirklich identische Todoist-Aufgabe</strong> zu. Life RPG hakt sie dann in Todoist ab — <strong>ohne zweiten Reward</strong>. Unterrichts- und Schülerdaten werden nicht übertragen.</p>
     ${school?`<div class="todoist-school-fields"><label>Abschluss aus Schulcockpit<select data-school-event><option value="">Abschluss auswählen</option>${recent.map(([id,r])=>`<option value="${esc(id)}" ${schoolEventPick===id?'selected':''}>${esc(schoolEventText(id))} · ${esc(new Date(r.at).toLocaleDateString('de-DE'))}</option>`).join('')}</select></label>
       <label>Todoist-Aufgabe suchen<input type="search" data-school-task-search placeholder="Zum Beispiel Klassenarbeit …" value="${esc(schoolTaskQuery)}"></label>
       <label>Dieselbe offene Aufgabe<select data-school-task><option value="">Bitte genau zuordnen …</option>${options.map(t=>`<option value="${esc(t.id)}" ${schoolTaskPick===t.id?'selected':''}>${esc(t.content.slice(0,110))}</option>`).join('')}</select></label></div>
       <button class="secondary-button" data-school-pair type="button" ${options.length&&options.some(t=>t.id===schoolTaskPick)?'':'disabled'}>Aufgabe verknüpfen & in Todoist abhaken</button>
       <p class="todoist-school-hint">Vorschläge sind nur Suchhilfen. Bei mehreren ähnlich benannten Stunden oder Arbeiten erfolgt niemals eine automatische Zuordnung auf Verdacht. Wiederkehrende Aufgaben werden hier ausgeschlossen.</p>`:
       '<p>Alle jüngeren Schulcockpit-Abschlüsse sind bereits zugeordnet.</p>'}</div></details>`;
 }
 function renderSchoolMatch(){const box=mount()?.querySelector('[data-school-match-host]');if(box)box.innerHTML=schoolMatchMarkup();}
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
     let awarded=0,newReceipts=0;const accepted=[];
     for(const item of completed){
       const when=safeDate(item.completed_at);
       if(when < safeDate(model().connectedAt))continue;
       accepted.push(item);
       const key=receiptKey(item);if(key && !model().receipts[key])newReceipts++;
       if(awardCompleted(item))awarded++;
     }
     // A linked task completed in Todoist externally is only considered done
     // after the completed-history response verifies that occurrence.
     for(const item of accepted){
       const id=linkedSchoolEventForTask(item.id),link=id&&model().schoolLinks[id];
       if(link && link.status!=='done') {link.status='done';link.closedAt=item.completed_at;newReceipts++;}
     }
     await reconcilePendingSchoolLinks();
     window.LifeRPGHoliday?.refreshLinkedCompletions?.(accepted);
     if(first||newReceipts||rewardMigrationPending){const saved=persist('todoist-verified-completions');if(saved!==false)rewardMigrationPending=false;}
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
   if(isCompleted(id))throw Error('Diese Aufgabe wurde heute bereits als abgeschlossen verarbeitet.');
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
 function dateText(t){const d=dueDay(t);return !d?'Ohne Termin':d<today()?`Überfällig · ${d}`:d===today()?'Heute':d===addDays(today(),1)?'Morgen':new Date(`${d}T12:00:00`).toLocaleDateString('de-DE',{day:'2-digit',month:'short'});}
 function datesSummary(){return {today:tasks.filter(t=>dueDay(t) && dueDay(t)<=today()).length,late:tasks.filter(t=>dueDay(t) && dueDay(t)<today()).length,soon:tasks.filter(t=>dueDay(t)>today()&&dueDay(t)<=addDays(today(),7)).length};}
 function filteredTasks(){let list=tasks.filter(t=>t.content.toLowerCase().includes(q.toLowerCase()));
   if(projectFilter)list=list.filter(t=>t.project_id===projectFilter);
   if(taskFilter==='due')list=list.filter(t=>dueDay(t)&&dueDay(t)<=addDays(today(),7));
   if(taskFilter==='today')list=list.filter(t=>dueDay(t)&&dueDay(t)<=today());
   if(taskFilter==='undated')list=list.filter(t=>!dueDay(t));
   return list.sort((a,b)=>{const aa=dueDay(a)||'9999-99-99',bb=dueDay(b)||'9999-99-99';return aa.localeCompare(bb)||Number(b.priority)-Number(a.priority)||a.content.localeCompare(b.content);});
 }
 const projectName=t=>projects.find(p=>String(p.id)===t.project_id)?.name||'Eingang';
 function taskRow(t){
   const high=Number(t.priority)>=3, linked=holidayLinked(t),d=dueDay(t),schoolLinked=Boolean(linkedSchoolEventForTask(t.id));
   const parent=tasks.find(x=>x.id===t.parent_id);
   const details=[t.description?`<p class="todoist-description">${esc(t.description)}</p>`:'',
     t.labels?.length?`<div class="todoist-label-list">${t.labels.map(label=>`<span>#${esc(label)}</span>`).join('')}</div>`:'',
     t.parent_id?`<p class="todoist-parent">Unteraufgabe${parent?` von ${esc(parent.content)}`:''}</p>`:''].filter(Boolean).join('');
   const detailToggle=details?`<details class="todoist-task-details"><summary>Beschreibung & Tags</summary>${details}</details>`:'';
   return `<article class="todoist-task" data-task-id="${esc(t.id)}"><button type="button" class="todoist-check" data-todoist-done="${esc(t.id)}" ${isCompleted(t.id)?'disabled':''} aria-label="${esc(t.content)} erledigen" title="In Todoist abschließen">✓</button><div class="todoist-task-body"><strong>${esc(t.content)}</strong><div class="todoist-task-meta"><span class="${d&&d<today()?'is-overdue':''}">${esc(dateText(t))}</span><span>· ${esc(projectName(t))}</span>${high?`<span>· ${Number(t.priority)===4?'Priorität 1':'Priorität 2'}</span>`:''}${t.parent_id?'<span>· Unteraufgabe</span>':''}</div>${detailToggle}</div>${schoolLinked?'<span class="todoist-linked-badge">↔ Schulcockpit</span>':''}${linked?'<span class="todoist-linked-badge">Im Ferienplan</span>':`<button type="button" class="todoist-holiday-link" data-todoist-link="${esc(t.id)}" title="Diese einzelne Aufgabe zusätzlich in die Auszeit übernehmen">+ Auszeit</button>`}</article>`;
 }

 function taskListMarkup(){const found=filteredTasks(),shown=found.slice(0,50+showMore*50);
   let last='',html='';for(const t of shown){const d=dueDay(t),group=!d?'Ohne Datum':d<today()?'Überfällig':d===today()?'Heute':d===addDays(today(),1)?'Morgen':d<=addDays(today(),7)?'Nächste 7 Tage':'Später';if(group!==last){last=group;html+=`<h3 class="todoist-date-heading">${group}</h3>`;}html+=taskRow(t);}
   return `<div class="todoist-list-summary" role="status">${found.length} passende Aufgaben · ${tasks.length} insgesamt</div><div class="todoist-task-list">${html||'<div class="todoist-empty">Keine Aufgaben in dieser Ansicht. 🌸</div>'}</div>${found.length>shown.length?`<button type="button" class="secondary-button todoist-more" data-todoist-more>Weitere 50 anzeigen (${found.length-shown.length} übrig)</button>`:''}`;
 }
 function settingsMarkup(){const m=model();return `<div class="todoist-settings-card"><div class="todoist-settings-head"><strong>Verbindung & Belohnungen</strong><p>Nur bei Bedarf ändern. Der Token gehört nicht in deinen Cloud-Save.</p></div>
   <div class="todoist-connect"><span>${connected&&currentToken()?'✓ Verbunden':currentToken()?'Verbindung prüfen':'Nicht verbunden'}</span><a href="https://app.todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener">API-Token in Todoist finden ↗</a></div>
   ${connected?'':`<form data-todoist-connect-form class="todoist-connect-form"><label>Persönlicher Todoist API-Token<input type="password" name="token" required autocomplete="off" placeholder="Token einfügen"></label><label class="todoist-inline-check"><input type="checkbox" name="remember"> Nur auf diesem Gerät merken</label><button class="primary-button" type="submit">Verbinden</button></form>`}
   <label>Automatische Rewards für neue Abschlüsse<select data-todoist-reward-mode><option value="all" ${m.rewardMode==='all'?'selected':''}>Alle neuen normalen Todoist-Abschlüsse (empfohlen)</option><option value="safe" ${m.rewardMode!=='all'?'selected':''}>Keine automatischen Todoist-Rewards</option></select></label>
   <label class="todoist-inline-check"><input type="checkbox" data-todoist-daily-enabled ${m.dailyEnabled!==false?'checked':''}> Fällige Aufgaben im Daily Plan berücksichtigen</label>
   <p class="todoist-settings-footnote">Auch in Todoist erledigte Aufgaben werden beim nächsten Abgleich erkannt und einmalig belohnt (3 XP, 2 Coins, 0,1 Story Energy vor Tages-Dämpfung). Keine Retro-Rewards vor der ersten Verbindung. Tätigkeiten, die schon in Schulcockpit oder anderen Life-RPG-Modulen belohnt wurden, dürfen nicht nochmals als unabhängige Todoist-Arbeit vergütet werden: Spiegel-Aufgaben mit #schulcockpit oder #already-rewarded markieren. Ohne gemeinsame Ereignis-ID ist automatische Quell-Deduplizierung nur eingeschränkt möglich.</p>
   <button class="secondary-button" type="button" data-todoist-disconnect ${currentToken()?'':'disabled'}>Token auf diesem Gerät entfernen</button></div>`;}
 function render(){const root=mount();if(!root)return;const count=datesSummary(),verified=connected&&!!currentToken();
   root.innerHTML=`<header class="todoist-page-title"><div><p class="eyebrow">ALLTAG · DEINE AUFGABEN</p><h1>Meine Aufgaben</h1><p>Alles im Blick — für Schule, Zuhause und deine Projekte. Todoist bleibt dein schneller Eingang auf dem iPhone.</p></div><div class="todoist-page-status"><span class="${verified?'is-connected':''}">${verified?'● Verbunden':'○ Nicht verbunden'}</span><small>${lastSyncAt?'Stand: '+esc(new Date(lastSyncAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})):'Noch nicht synchronisiert'}</small><button class="secondary-button" type="button" data-todoist-refresh ${currentToken()&&!busy?'':'disabled'}>↻ Aktualisieren</button></div></header>
   ${lastError?`<div class="todoist-page-error" role="alert">${esc(lastError)}</div>`:''}
   ${!verified?`<div class="todoist-welcome"><h2>${currentToken()?'Verbindung wird geprüft…':'Todoist einmal verbinden'}</h2><p>Deine Aufgaben werden direkt von Todoist geladen. Es werden keine Aufgabenlisten oder Zugangsdaten in den Life-RPG-Cloud-Save kopiert.</p><button type="button" class="primary-button" data-todoist-settings-open>Verbindung einrichten</button></div>`:''}
   ${verified?`<div class="todoist-overview"><div><strong>${count.today}</strong><span>Heute & fällig</span></div><div><strong>${count.late}</strong><span>Überfällig</span></div><div><strong>${count.soon}</strong><span>Nächste 7 Tage</span></div><div><strong>${tasks.length}</strong><span>Offene Aufgaben</span></div></div>
   <section class="todoist-panel todoist-capture"><div class="todoist-panel-heading"><h2>Aufgabe hinzufügen</h2><span>Direkt in Todoist speichern</span></div><form data-todoist-add-form><input name="title" required maxlength="180" placeholder="Was möchtest du nicht vergessen?" aria-label="Neue Aufgabe"><div class="todoist-add-details"><label>Fällig am<input type="date" name="dueDate"></label><label>Projekt<select name="projectId"><option value="">Eingang</option>${projects.filter(p=>!p.is_archived).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label><label>Priorität<select name="priority"><option value="1">Normal</option><option value="2">Mittel</option><option value="3">Hoch</option><option value="4">Sehr hoch</option></select></label><button class="primary-button" type="submit">+ Hinzufügen</button></div></form></section>
   ${verified?`<div data-school-match-host>${schoolMatchMarkup()}</div>`:''}
   <section class="todoist-panel todoist-board"><div class="todoist-panel-heading"><h2>Deine Aufgaben</h2><span>Erledigen synchronisiert mit Todoist</span></div><div class="todoist-filters"><div class="todoist-filter-tabs" aria-label="Zeitraum">${[['today','Heute'],['due','Nächste 7 Tage'],['all','Alle'],['undated','Ohne Datum']].map(([key,label])=>`<button type="button" class="${taskFilter===key?'is-active':''}" data-todoist-tab="${key}" aria-pressed="${taskFilter===key}">${label}</button>`).join('')}</div><label class="todoist-project-filter">Projekt<select data-todoist-project-filter><option value="">Alle Projekte</option>${projects.filter(p=>!p.is_archived).map(p=>`<option value="${esc(p.id)}" ${projectFilter===String(p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label class="todoist-search">Suche<input data-todoist-query type="search" value="${esc(q)}" placeholder="Aufgaben durchsuchen…"></label></div><p class="todoist-task-explainer">Hier stehen alle regulären Aufgaben. <strong>„+ Auszeit“</strong> übernimmt nur diese eine Aufgabe zusätzlich in den Ferienplan — keine automatische Übernahme.</p><div data-todoist-list>${taskListMarkup()}</div></section>`:''}
   <section class="todoist-panel todoist-advanced"><button type="button" class="todoist-settings-toggle" data-todoist-settings-toggle aria-expanded="${showSettings}"><span>⚙ Verbindung & Einstellungen</span><span>${showSettings?'−':'+'}</span></button>${showSettings?settingsMarkup():''}</section>`;
 }
 function renderList(){const list=mount()?.querySelector('[data-todoist-list]');if(list)list.innerHTML=taskListMarkup();}
 function open(){app.showView('tasks');render();if(currentToken()&&!connected&&!loadingOpen){loadingOpen=true;sync({quiet:true}).catch(()=>{}).finally(()=>{loadingOpen=false;});}}
 function init(){const root=mount();if(!root)return;
   root.addEventListener('submit',async e=>{const form=e.target;if(!form.matches('[data-todoist-connect-form],[data-todoist-add-form]'))return;e.preventDefault();const data=new FormData(form),b=form.querySelector('button[type="submit"]');if(b)b.disabled=true;
     try{if(form.matches('[data-todoist-connect-form]'))await connect(data.get('token'),data.get('remember')==='on');else{await create(data.get('title'),{dueDate:data.get('dueDate'),projectId:data.get('projectId'),priority:data.get('priority')});app.showToast?.('Aufgabe gespeichert ✓');}lastError='';render();}
     catch(err){lastError=err.message;app.showToast?.(err.message);render();}finally{if(b)b.disabled=false;}
   });
   root.addEventListener('input',e=>{
     if(e.target.matches('[data-todoist-query]')){q=e.target.value;showMore=0;renderList();}
     if(e.target.matches('[data-school-task-search]')){
       schoolTaskQuery=e.target.value;schoolTaskPick='';
       const select=root.querySelector('[data-school-task]');
       if(select)select.innerHTML='<option value="">Bitte genau zuordnen …</option>'+schoolTaskOptions().map(t=>`<option value="${esc(t.id)}">${esc(t.content.slice(0,110))}</option>`).join('');
       const button=root.querySelector('[data-school-pair]');if(button)button.disabled=true;
     }
   });
   root.addEventListener('toggle',e=>{if(e.target.matches('.todoist-school-match'))schoolPanelOpen=e.target.open;},true);
   root.addEventListener('change',e=>{if(e.target.matches('[data-school-event]')){schoolEventPick=e.target.value;schoolTaskPick='';renderSchoolMatch();}
     if(e.target.matches('[data-school-task]')){schoolTaskPick=e.target.value;const b=root.querySelector('[data-school-pair]');if(b)b.disabled=!schoolTaskPick;}
     if(e.target.matches('[data-todoist-project-filter]')){projectFilter=e.target.value;showMore=0;renderList();}if(e.target.matches('[data-todoist-reward-mode]')){model().rewardMode=e.target.value==='all'?'all':'safe';persist('todoist-reward-preference');}if(e.target.matches('[data-todoist-daily-enabled]')){model().dailyEnabled=e.target.checked;persist('todoist-daily-preference');window.LifeRPGDaily?.render?.();}});
   root.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
     if(b.hasAttribute('data-school-pair')){
       if(!schoolEventPick||!schoolTaskPick)return;
       b.disabled=true;try{await linkSchoolEvent(schoolEventPick,schoolTaskPick);schoolTaskPick='';schoolPanelOpen=true;render();}
       catch(err){app.showToast?.(err.message);render();}return;
     }
     if(b.hasAttribute('data-todoist-tab')){taskFilter=b.dataset.todoistTab;showMore=0;render();return;}
     if(b.hasAttribute('data-todoist-more')){showMore++;renderList();return;}
     if(b.hasAttribute('data-todoist-settings-open')){showSettings=true;render();return;}
     if(b.hasAttribute('data-todoist-settings-toggle')){showSettings=!showSettings;render();return;}
     if(b.hasAttribute('data-todoist-disconnect')){disconnect();return;}
     if(b.hasAttribute('data-todoist-link')){const t=tasks.find(x=>x.id===b.dataset.todoistLink);if(t){window.LifeRPGHoliday?.linkTodoist?.({id:t.id,content:t.content,minutes:minutes(t),group:taskGroup(t)==='school'?'school':taskGroup(t)==='space'?'space':taskGroup(t)==='digital'?'digital':taskGroup(t)==='joy'?'joy':'life'});app.showToast?.('Mit Ferien verknüpft ✓');renderList();}return;}
     if(b.hasAttribute('data-todoist-refresh')){b.disabled=true;try{await sync();}catch{render();}return;}
     if(b.hasAttribute('data-todoist-done')){b.disabled=true;try{await complete(b.dataset.todoistDone);}catch(err){app.showToast?.(err.message);b.disabled=false;}return;}
   });
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 document.addEventListener('click',e=>{if(e.target.closest('[data-todoist-open]'))open();});
 window.addEventListener('life-rpg:view-changed',()=>{if(document.getElementById('view-tasks')?.classList.contains('active')){render();if(currentToken()&&!connected&&!loadingOpen){loadingOpen=true;sync({quiet:true}).catch(()=>{}).finally(()=>{loadingOpen=false;});}}});
 window.addEventListener('life-rpg:school-completions-ingested',()=>{
   if(document.getElementById('view-tasks')?.classList.contains('active'))render();
   if(connected)reconcilePendingSchoolLinks().then(n=>{if(n)render();}).catch(()=>{});
 });
 window.LifeRPGTodoist={open,connected:()=>connected,hasTask,getTask,eligibleForDaily,scoreForDaily,isCompleted,groupForTask:taskGroup,estimatedMinutes:minutes,vacationCandidates,sync,complete,linkSchoolEvent,reconcilePendingSchoolLinks,linkToBreak:id=>{const t=tasks.find(t=>t.id===String(id));return t&&window.LifeRPGHoliday?.linkTodoist?.(t);},_test:{model,receiptKey,likelyDuplicate,awardCompleted,normalizedTasks,connect,disconnect,taskGroup,dueDay,minutes,schoolRoutine,create,vacationCandidates,schoolReceipts,schoolMatchMarkup,closeSchoolLinked,matchingSchoolTask,schoolTaskOptions}};
 // On returning to the open app, a previously authorized session may resync;
 // there is deliberately no background poll, webhook or OAuth secret in the PWA.
 let lastVisibilitySync = 0;
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible' && currentToken() && Date.now()-lastVisibilitySync > 30000){
     lastVisibilitySync=Date.now(); sync({quiet:true}).catch(()=>{});
   }
 });
})();
