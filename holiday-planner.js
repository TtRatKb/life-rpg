/* Life RPG · DZ23d · Ferien & Auszeiten. Standalone additive state: NEVER rewrites saves. */
(() => {
  'use strict';
  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState) return;
  const GROUPS = { school:'📚 Schule', space:'🏡 Raum & Ordnung', digital:'💻 Digital', life:'🗂️ Organisation', joy:'🌸 Freizeit', recovery:'☕ Erholung' };
  const PRIORITY = { must:'Muss', want:'Möchte ich', bonus:'Optional' };
  const esc = v => app.escapeHtml(String(v ?? ''));
  const today = () => {const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');};
  const uid = () => `break-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const SEED = [
    ['Mathe 5 · Papierarbeiten fertig korrigieren','school','must',65,'high'],
    ['Mathe 5 · Kompetenzbögen im Schulcockpit prüfen/erstellen','school','must',45,'medium'],
    ['Mathe 5 · Rückgabe, Einsicht und Unterschriften vorbereiten','school','must',25,'medium'],
    ['Religion 6 · Förderbedarfe, Bewertung und Rückgabe prüfen','school','must',50,'high'],
    ['Religion 8 · Arbeiten korrigieren, Noten & Feedback','school','must',75,'high'],
    ['Religion 8 · Förderbedarf und Nachschreibfälle klären','school','must',30,'medium'],
    ['Busunternehmen anrufen','school','must',15,'low'],
    ['Dringende Schulmail schreiben','school','must',15,'low'],
    ['Schülerbeobachtungen im freigegebenen Schulsystem ergänzen','school','must',35,'medium'],
    ['Telefonliste bei Kollegen erfragen','school','must',10,'low'],
    ['Reihen 5/6/7 an LEB-Kompetenzen ausrichten','school','must',80,'high'],
    ['Grobe Jahrespläne & Puffer sichten','school','want',65,'high'],
    ['Erste Schulwoche nach den Ferien vorbereiten','school','must',90,'high'],
    ['Weihnachtsbasar / Halloween / Hannover · Ideen notieren','school','want',30,'medium'],
    ['Schreibtisch · freie Arbeitsfläche schaffen','space','must',15,'low'],
    ['Fensterbank entlasten','space','must',15,'low'],
    ['Kallax · Ablage und Taschenplatz freimachen','space','must',15,'low'],
    ['Schmuck- & Schminktisch einsortieren','space','must',15,'low'],
    ['Kleiderstange sortieren · zurück / Wäsche','space','must',15,'low'],
    ['Papiere, Müll und lose Kleidung vom Boden','space','must',15,'low'],
    ['Arbeitszimmer · Abschluss-Reset','space','must',15,'low'],
    ['Badezimmer · Bestandsaufnahme','space','want',35,'medium'],
    ['Badezimmer · Aufbewahrung sinnvoll einrichten','space','want',45,'medium'],
    ['MacBook · künftige Ordnerstruktur festlegen','digital','must',45,'medium'],
    ['Cloud-Zuständigkeiten & Schuldateien festlegen','digital','must',45,'medium'],
    ['Downloads / To-Sort · aktuelle Schuldateien einsortieren','digital','must',45,'medium'],
    ['ACOTAR Band 1 zu Ende lesen','joy','want',35,'low'],
    ['Kotoba Quest · Einstufung weiterführen','joy','want',15,'low'],
    ['Sakura-Bauset · Platz schaffen und anfangen','joy','want',45,'low'],
    ['Baldur’s Gate · längerer Spiele-Nachmittag','joy','want',120,'medium'],
    ['Fields of Mistria gemütlich spielen','joy','want',30,'low'],
    ['Life RPG freiwillig weiterentwickeln','joy','want',45,'medium'],
    ['Massage mit Jannik genießen','recovery','want',60,'low'],
    ['Keramik bemalen mit Nina','joy','want',90,'low'],
    ['Schulfreier Erholungstag (ohne Nachholpflicht)','recovery','want',30,'low']
  ];
  function model() {
    const state = app.getState();
    if (!state.breakPlannerV1 || typeof state.breakPlannerV1 !== 'object' || Array.isArray(state.breakPlannerV1)) {
      state.breakPlannerV1 = {schemaVersion:1, breaks:[], activeId:''};
    }
    return state.breakPlannerV1;
  }
  function initSeed() {
    const m = model();
    if (m.seedVersion === 1 || (m.breaks || []).some(b => b.id === 'autumn-2026')) return false;
    m.breaks ||= [];
    m.breaks.push({id:'autumn-2026',title:'Herbstferien 2026',start:'2026-10-10',end:'2026-10-25',goals:SEED.map((data,i) => ({id:`autumn26-${String(i+1).padStart(2,'0')}`,title:data[0],group:data[1],priority:data[2],minutes:data[3],effort:data[4],doneAt:'',linkedTodoistId:'',linkedBookId:''}))});
    m.activeId='autumn-2026'; m.seedVersion=1;
    return true;
  }
  function active() {const m=model(), all=Array.isArray(m.breaks)?m.breaks:[]; return all.find(x=>x.id===m.activeId)||all[all.length-1]||null;}
  function goalById(id) {return active()?.goals?.find(g=>g.id===id) || null;}
  function createBreak(raw) {
    const name=String(raw.title||'').trim().slice(0,100);
    const start=String(raw.start||''), end=String(raw.end||'');
    if(!name || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end<start) return false;
    const m=model();m.breaks.push({id:uid(),title:name,start,end,goals:[]});m.activeId=m.breaks[m.breaks.length-1].id;persist('break-create');return true;
  }
  function inPeriod(date=today()) {const b=active();return !!b && date>=b.start && date<=b.end;}
  function persist(source) {const ok=app.saveState({source,suppressUiRefresh:true});if(ok){render();window.LifeRPGDaily?.render?.();}return ok;}
  function normalize(raw) {return {id:uid(),title:String(raw.title||'').trim().slice(0,140),group:GROUPS[raw.group]?raw.group:'joy',priority:PRIORITY[raw.priority]?raw.priority:'want',minutes:Math.max(5,Math.min(240,Math.round(Number(raw.minutes)||20))),effort:['low','medium','high'].includes(raw.effort)?raw.effort:'medium',doneAt:'',linkedTodoistId:String(raw.linkedTodoistId||'').slice(0,40),linkedBookId:String(raw.linkedBookId||'').slice(0,100)};}
  function add(raw) {const b=active();if(!b)return null;const item=normalize(raw);if(!item.title)return null;b.goals.push(item);persist('break-goal-add');return item;}
  function linkTodoist(task) {
    const b=active();if(!b || !task?.id)return null;
    const tid=String(task.id), title=String(task.content||task.title||'Todoist-Aufgabe').trim();
    const existing=b.goals.find(g=>g.linkedTodoistId===tid);if(existing)return existing;
    // Reuse an identical unfinished holiday seed, rather than cloning the same
    // chore twice. Preserve the player's chosen priority, effort, and progress.
    const match=b.goals.find(g=>!g.linkedTodoistId&&!g.doneAt&&g.title.trim().toLowerCase()===title.toLowerCase());
    if(match){match.linkedTodoistId=tid;persist('break-goal-todoist-linked');return match;}
    return add({title,group:task.group||'life',priority:'want',minutes:task.minutes||20,effort:'medium',linkedTodoistId:tid});
  }
  function availableBooks(){return Array.isArray(app.getState().bookLibrary?.items)?app.getState().bookLibrary.items:[];}
  function bookForGoal(g){return availableBooks().find(b=>String(b.id)===String(g?.linkedBookId||''));}
  function refreshBookCompletions(){
    const b=active();if(!b)return 0;
    let changed=0;
    for(const g of b.goals||[]){
      const book=g.linkedBookId && bookForGoal(g);
      if(!book||g.doneAt||book.status!=='finished')continue;
      g.doneAt=new Date(book.finishedAt||Date.now()).toISOString();changed++;
      // Book completion is already rewarded by the Library. If the holiday
      // goal also mirrors a Todoist task, the Todoist close must pay no second
      // reward. An unavailable Todoist session is retried later.
      if(g.linkedTodoistId)window.LifeRPGTodoist?.closeFromNative?.(g.linkedTodoistId,{source:'book-finish',id:book.id}).catch(()=>{});
    }
    if(changed)persist('break-book-native-completed');return changed;
  }
  function linkBook(goalId,bookId){
    const goal=goalById(goalId),book=availableBooks().find(x=>String(x.id)===String(bookId));
    if(!goal)return false;
    goal.linkedBookId=book?String(book.id):'';
    persist('break-book-linked');refreshBookCompletions();return true;
  }
  function isDone(g) {return Boolean(g?.doneAt);}
  function markDone(id,{fromTodoist=false,at=null}={}) {
    const g=goalById(id);if(!g || g.doneAt)return false;
    if(g.linkedTodoistId && !fromTodoist) return false; // only Todoist owns linked task completion
    if(g.linkedBookId && !fromTodoist)return false; // Library owns native book completion
    g.doneAt=at||new Date().toISOString();
    // Completion of the holiday checklist is not an extra reward channel.  Real
    // activities remain rewarded in their canonical Life RPG/Todoist/Schulcockpit log.
    persist('break-goal-completed');return true;
  }
  function undo(id) {const g=goalById(id);if(!g || g.linkedTodoistId)return false;g.doneAt='';persist('break-goal-reopen');return true;}
  function remove(id) {const b=active();if(!b)return; b.goals=b.goals.filter(x=>x.id!==id);persist('break-goal-remove');}
  function applicable() {return inPeriod() ? (active()?.goals || []).filter(g=>!g.doneAt) : [];}
  function eligibleForDaily() {return applicable().filter(g=>g.priority!=='bonus' && (!g.linkedTodoistId || window.LifeRPGTodoist?.hasTask?.(g.linkedTodoistId))).slice(0,100);}
  function scoreForDaily(g,slot,checkIn) {
    if(!inPeriod()||g.doneAt)return -1000;
    const low=['fumes','low'].includes(checkIn.energy)||checkIn.gentle||checkIn.time==='little';
    const sick=checkIn.health?.dayCleared || checkIn.dayCleared;
    if(sick && ['school','digital','space'].includes(g.group))return -1000;
    if(slot==='focus' && (g.group==='joy'||g.group==='recovery'))return -1000;
    if(slot==='joy' && !['joy','recovery'].includes(g.group))return -1000;
    if(slot==='gentle' && g.minutes>30)return -1000;
    if(low && (g.effort==='high'||g.minutes>50))return -1000;
    if(checkIn.time==='none' && g.minutes>15)return -1000;
    let score=3.8 + (g.priority==='must'?1.7:g.priority==='want'?0.6:0);
    if(slot==='joy' && g.group==='joy')score+=3.4;
    if(slot==='gentle' && g.effort==='low')score+=1.7;
    if(slot==='focus' && g.group==='school')score+=1.5;
    if(slot==='focus' && g.group==='space')score+=0.6;
    if(g.group==='recovery' && checkIn.gentle)score+=2;
    if(g.minutes<=20 && low)score+=1.1;
    if(g.minutes>75 && checkIn.time!=='plenty')score-=2;
    return score;
  }
  function refreshLinkedCompletions(completed) {
    if(!Array.isArray(completed))return;
    const b=active();if(!b)return;
    let changed=false;
    for(const item of completed){
      const g=b.goals.find(x=>x.linkedTodoistId===String(item.id));
      if(g && !g.doneAt && item.completed_at){g.doneAt=item.completed_at;changed=true;}
    }
    if(changed)persist('break-todoist-completion');
  }
  function dateLabel(d) {if(!d)return '';const [y,m,day]=d.split('-');return `${day}.${m}.${y}`;}
  function bookSelector(g){
    if(g.group!=='joy'||g.doneAt)return '';
    const books=availableBooks();if(!books.length)return '';
    const chosen=bookForGoal(g);
    return `<label class="break-native-link-dz28">📚 Buch aus Library <select data-break-book-link="${esc(g.id)}"><option value="">Nicht verbunden</option>${books.map(book=>`<option value="${esc(book.id)}" ${chosen?.id===book.id?'selected':''}>${esc(book.title)}${book.status==='finished'?' ✓':''}</option>`).join('')}</select></label>`;
  }
  function card(g) {return `<article class="break-goal ${g.doneAt?'is-done':''}" data-break-id="${esc(g.id)}">
      <div class="break-goal-main"><span class="break-goal-tick">${g.doneAt?'✓':'○'}</span><div><strong>${esc(g.title)}</strong><small>${esc(GROUPS[g.group])} · ${esc(PRIORITY[g.priority])} · ~${g.minutes} Min.${g.linkedTodoistId?' · Todoist ↗':''}</small></div></div>
      ${bookSelector(g)}<div class="break-goal-actions">${g.doneAt ? (g.linkedBookId?'<span class="break-done-label">In der Library abgeschlossen ✓</span>':!g.linkedTodoistId?`<button type="button" class="text-button" data-break-undo="${esc(g.id)}">Rückgängig</button>`:'<span class="break-done-label">In Todoist erledigt</span>') : `<button type="button" class="secondary-button" data-break-do="${esc(g.id)}">${g.linkedBookId?'📚 In Library lesen':g.linkedTodoistId?'In Todoist erledigen':'Abhaken'}</button>`}<button type="button" class="text-button" data-break-remove="${esc(g.id)}" aria-label="Ziel entfernen">×</button></div></article>`;}
  let filter='all',pickerOpen=false,pickerMode='backlog',pickerSearch='',selectedTasks=new Set();
  const pickerCandidates=()=>window.LifeRPGTodoist?.vacationCandidates?.({start:active()?.start,end:active()?.end,mode:pickerMode})||[];
  function selectionMarkup(){
    const b=active(),connected=window.LifeRPGTodoist?.connected?.();
    if(!connected)return '<p class="break-select-hint">Verbinde Todoist zuerst unter „Meine Aufgaben“, um offene Aufgaben für diese Auszeit auszuwählen.</p>';
    const candidates=pickerCandidates();
    const matches=candidates.filter(t=>t.content.toLocaleLowerCase().includes(pickerSearch.toLocaleLowerCase())).slice(0,100);
    return `<div class="break-pick-toolbar"><label>Vorschläge<select data-break-pick-mode><option value="backlog" ${pickerMode==='backlog'?'selected':''}>Fällige offene Aufgaben: 14 Tage vor Beginn bis Ferienende (ohne Routinen)</option><option value="all" ${pickerMode==='all'?'selected':''}>Alle offenen Todoist-Aufgaben</option></select></label><label>Suche<input data-break-pick-search type="search" value="${esc(pickerSearch)}" placeholder="Aufgaben filtern…"></label></div>
      <p class="break-select-hint">Nur angehakte Aufgaben werden übernommen. Sie bleiben in Todoist und in „Meine Aufgaben“. Kein extra Ferien-Reward.</p>
      <div class="break-pick-list">${matches.map(t=>`<label class="break-pick-item"><input type="checkbox" data-break-pick-check="${esc(t.id)}" ${selectedTasks.has(String(t.id))?'checked':''}><span><strong>${esc(t.content)}</strong><small>${esc(t.due?.date||'Ohne Termin')} · ${t.priority===4?'Prio 1':t.priority===3?'Prio 2':t.priority===2?'Prio 3':'Prio 4'}${t.due?.is_recurring?' · Wiederkehrend':''}</small></span></label>`).join('')||'<p>Keine passenden offenen Aufgaben.</p>'}</div>
      ${matches.length<candidates.length?`<small>Maximal 100 Treffer auf einmal angezeigt. Nutze die Suche, um gezielt weitere Aufgaben zu finden.</small>`:''}
      <div class="break-pick-actions"><button type="button" class="primary-button" data-break-import ${selectedTasks.size?'':'disabled'}>${selectedTasks.size} ausgewählte Aufgaben übernehmen</button><button type="button" class="secondary-button" data-break-cancel>Schließen</button></div>`;
  }
  function importSelected(){
    const b=active();if(!b)return 0;
    const all=window.LifeRPGTodoist?.vacationCandidates?.({start:b.start,end:b.end,mode:'all'})||[];
    let count=0;
    for(const item of all){
      if(!selectedTasks.has(String(item.id)) || b.goals.some(g=>g.linkedTodoistId===String(item.id)))continue;
      const title=String(item.content||'').trim();if(!title)continue;
      const seed=b.goals.find(g=>!g.doneAt&&!g.linkedTodoistId&&g.title.trim().toLowerCase()===title.toLowerCase());
      if(seed){seed.linkedTodoistId=String(item.id);count++;continue;}
      b.goals.push(normalize({title,group:window.LifeRPGTodoist?.groupForTask?.(item)||'life',priority:'want',minutes:window.LifeRPGTodoist?.estimatedMinutes?.(item)||20,effort:'medium',linkedTodoistId:String(item.id)}));count++;
    }
    selectedTasks.clear();pickerOpen=false;
    if(count)persist('break-bulk-todoist-import');else render();
    app.showToast?.(`${count} Aufgabe${count===1?'':'n'} zum Ferienplan hinzugefügt`);
    return count;
  }

  function render() {
    // A cloud save may replace initial state after script startup. Re-create the
    // optional board in memory, without initiating a premature cloud write.
    initSeed();
    const mount=document.getElementById('breakPlannerMount');if(!mount)return;
    const b=active();if(!b){mount.innerHTML='<p>Noch keine Auszeit angelegt.</p>';return;}
    const goals=b.goals||[], done=goals.filter(isDone).length;
    const byGroup=Object.entries(GROUPS).map(([key,name])=>{
      const items=goals.filter(g=>g.group===key && (filter==='all'||(filter==='open'?!g.doneAt:g.priority===filter)));
      return items.length?`<section class="break-group"><h3>${esc(name)} <small>${items.filter(isDone).length}/${items.length}</small></h3>${items.map(card).join('')}</section>`:'';
    }).join('');
    mount.innerHTML=`<div class="break-hero"><span class="eyebrow">SEASONAL ADVENTURE · ${esc(dateLabel(b.start))}–${esc(dateLabel(b.end))}</span><h1>🍁 ${esc(b.title)}</h1><p>Ein Ferienplan, der wichtige Aufgaben *und* freie Zeit schützt. Die Liste ist eine Wunschliste, keine tägliche Pflicht.</p><div class="break-progress"><span style="width:${goals.length?done/goals.length*100:0}%"></span></div><small>${done} von ${goals.length} Ferienzielen · ohne doppeltes Reward-Logging</small></div>
    <div class="break-new"><label>Auszeit <select data-break-switch>${(model().breaks||[]).map(item=>`<option value="${esc(item.id)}" ${item.id===b.id?'selected':''}>${esc(item.title)}</option>`).join('')}</select></label><details><summary>+ Neue Auszeit planen</summary><form id="breakNewForm"><input name="title" required maxlength="100" placeholder="z. B. Weihnachtsferien 2026"><label>Beginn <input name="start" type="date" required></label><label>Ende <input name="end" type="date" required></label><button type="submit" class="primary-button">Auszeit anlegen</button></form></details></div>
    <div class="break-toolbar"><label>Ansicht <select data-break-filter><option value="all" ${filter==='all'?'selected':''}>Alle Ziele</option><option value="open" ${filter==='open'?'selected':''}>Noch offen</option><option value="must" ${filter==='must'?'selected':''}>Muss</option><option value="want" ${filter==='want'?'selected':''}>Wünsche</option><option value="bonus" ${filter==='bonus'?'selected':''}>Optional</option></select></label><button type="button" class="secondary-button" data-break-pick-open>+ Todoist-Rückstand auswählen</button><button type="button" class="secondary-button" data-break-todoist>Meine Aufgaben öffnen →</button></div>${pickerOpen?`<section class="break-import-panel"><h3>Todoist-Aufgaben bewusst auswählen</h3>${selectionMarkup()}</section>`:''}
    <form class="break-add" id="breakAddForm"><input name="title" required maxlength="140" placeholder="Neuer Ferienwunsch oder kleiner nächster Schritt…"><select name="group">${Object.entries(GROUPS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select><select name="priority"><option value="want">Möchte ich</option><option value="must">Muss</option><option value="bonus">Optional</option></select><select name="effort"><option value="low">Leicht</option><option value="medium" selected>Mittel</option><option value="high">Anstrengend</option></select><label>Min. <input type="number" min="5" max="240" step="5" name="minutes" value="20"></label><button type="submit" class="primary-button">Hinzufügen</button></form>
    <div class="break-groups">${byGroup||'<p>Keine passenden Ziele.</p>'}</div>
    <p class="break-footnote">Wichtig: Schulcockpit-Abschlüsse, Buch-/Game-Logs und Todoist-Aufgaben werden nicht durch ein zweites Ferien-Reward dupliziert. Im Daily Plan können offene Ferienziele als echte Vorschläge erscheinen. Bereits geloggte Aktivitäten bleiben in ihren ursprünglichen Systemen.</p>`;
  }
  async function clickComplete(g) {
    if(g?.linkedBookId){app.showView?.('library');return;}
    if(g?.linkedTodoistId){
      if(!window.LifeRPGTodoist?.connected?.()){app.showToast('Erst Todoist in dieser Sitzung verbinden.');window.LifeRPGTodoist?.open?.();return;}
      await window.LifeRPGTodoist.complete(g.linkedTodoistId);return;
    }
    markDone(g.id);
  }
  function setup() {
    document.addEventListener('click',async e=>{
      const open=e.target.closest('[data-break-open]');if(open){app.showView('breaks');return;}
      if(e.target.closest('[data-break-todoist]')){window.LifeRPGTodoist?.open?.();return;}
      if(e.target.closest('[data-break-pick-open]')){pickerOpen=!pickerOpen;selectedTasks.clear();render();return;}
      if(e.target.closest('[data-break-cancel]')){pickerOpen=false;selectedTasks.clear();render();return;}
      if(e.target.closest('[data-break-import]')){importSelected();return;}
      const target=e.target.closest('[data-break-do]');if(target){target.disabled=true;try{await clickComplete(goalById(target.dataset.breakDo));}catch(err){app.showToast(err.message||'Todoist war nicht erreichbar.');target.disabled=false;}return;}
      if(e.target.closest('[data-break-undo]')){undo(e.target.closest('[data-break-undo]').dataset.breakUndo);return;}
      if(e.target.closest('[data-break-remove]')){const id=e.target.closest('[data-break-remove]').dataset.breakRemove;remove(id);return;}
    });
    document.addEventListener('submit',e=>{
      if(e.target?.id==='breakNewForm'){e.preventDefault();if(!createBreak(Object.fromEntries(new FormData(e.target))))app.showToast?.('Bitte Titel sowie gültiges Start- und Enddatum eingeben.');return;}
      if(e.target?.id!=='breakAddForm')return;
      e.preventDefault();const form=new FormData(e.target);if(add(Object.fromEntries(form))){e.target.reset();}
    });
    document.addEventListener('input',e=>{if(e.target.matches('[data-break-pick-search]')){pickerSearch=e.target.value;const start=e.target.selectionStart;render();const n=document.querySelector('[data-break-pick-search]');if(n){n.focus();n.setSelectionRange(start,start);}}});
    document.addEventListener('change',e=>{if(e.target.matches('[data-break-pick-mode]')){pickerMode=e.target.value;selectedTasks.clear();render();return;}if(e.target.matches('[data-break-pick-check]')){const id=e.target.dataset.breakPickCheck;if(e.target.checked)selectedTasks.add(id);else selectedTasks.delete(id);render();return;}if(e.target.matches('[data-break-book-link]')){linkBook(e.target.dataset.breakBookLink,e.target.value);return;}if(e.target.matches('[data-break-filter]')){filter=e.target.value;render();} if(e.target.matches('[data-break-switch]')){model().activeId=e.target.value;selectedTasks.clear();pickerOpen=false;persist('break-switch');}});
    window.addEventListener('life-rpg:render',render);
    window.addEventListener('life-rpg:view-changed',ev=>{if(ev.detail?.view==='breaks')render();});
    window.addEventListener('life-rpg:state-saved',render);
    window.addEventListener('life-rpg:state-replaced',()=>{render();refreshBookCompletions();});
    window.addEventListener('life-rpg:library-change',refreshBookCompletions);
  }
  setup();
  initSeed(); // intentionally no startup save: cloud state may still be loading
  render();
  window.LifeRPGHoliday={active,inPeriod,goalById,eligibleForDaily,scoreForDaily,markDone,undo,add,createBreak,linkTodoist,refreshLinkedCompletions,refreshBookCompletions,linkBook,render,importSelected,pickerCandidates,open:()=>app.showView('breaks'),_test:{model,normalize,SEED}};
})();
