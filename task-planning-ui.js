/* Life RPG: native task forecast and companion, no AI or second reward ledger. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGTaskPlanningCore,native=window.LifeRPGTaskProjects;
 if(!app?.getState||!core||!native)return;
 const byId=id=>document.getElementById(id);
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const model=()=>app.getState().taskProjectsV1;
 const config=()=>({weekdays:Array.from({length:7},(_,i)=>Number.isFinite(Number(model()?.planningSettings?.weekdays?.[i]))?Math.max(0,Math.min(720,Number(model().planningSettings.weekdays[i]))):core.defaults.weekdays[i]),reservePercent:Number(model()?.planningSettings?.reservePercent??30)});
 const fmt=n=>Math.round(n||0)+' Min.';
 const date=d=>d?new Date(d+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'Frist offen';
 const node=(name,content='',className='')=>{const e=document.createElement(name);if(content!==null)e.textContent=String(content);if(className)e.className=className;return e;};
 const button=(label,action,value)=>{const el=node('button',label);el.type='button';el.dataset[action]=value??'';return el;};
 let editId='',settingsOpen=false;
 function findTask(id){
   for(const p of model()?.projects||[]){const task=p.tasks?.find(t=>t.id===id);if(task)return task;}
   return model()?.inbox?.find(t=>t.id===id)||null;
 }
 function load(){
   const d=today(),check=app.getState().dailyPlanner?.days?.[d]?.checkIn||{};
   const worked=Number(window.LifeRPGTime?.getTodaySummary?.()?.workMinutes||0);
   let fixed=0;
   try{fixed=(window.LifeRPGWeekV2?.getOccurrences?.(d)||[]).filter(o=>!o.canceled).reduce((sum,o)=>sum+Math.max(0,(+new Date(o.end)- +new Date(o.start))/60000),0);}catch{}
   let modifier=1;
   if(check.energy==='low')modifier*=.65;
   if(check.energy==='fumes')modifier*=.3;
   if(check.gentle||check.dayCleared||check.health?.dayCleared)modifier*=.6;
   if(check.health?.illness==='yes'&&check.health?.sickLeave==='yes')modifier=0;
   if(fixed>=360)modifier*=.5;else if(fixed>=240)modifier*=.75;
   if(worked>=360)modifier*=.6;
   return {worked,fixed,modifier};
 }
 function snapshot(){
   const context=load(),windows=window.LifeRPGTaskWindows,usingWindows=Boolean(windows?.enabled?.());
   const windowForecast=usingWindows?windows.forecast(today(),35):null;
   return {...core.plan({today:today(),tasks:native.getOpen(),settings:config(),todayModifier:context.modifier,
     capacityByDate:windowForecast?.capacities,segmentsByDate:windowForecast?.segments,preferEarlier:usingWindows}),
     context,usingWindows,windowForecast};
 }
 function save(action,kind){
   const state=app.getState(),old=JSON.stringify(state.taskProjectsV1||null);
   try{
     action();
     if(app.saveState({source:'task-planning-v2:'+kind,suppressUiRefresh:true})===false)throw Error('Änderungen konnten nicht gespeichert werden.');
     native.render();render();window.dispatchEvent(new Event('life-rpg:task-projects-changed'));return true;
   }catch(err){
     const original=JSON.parse(old);
     if(original)state.taskProjectsV1=original;else delete state.taskProjectsV1;
     app.showToast?.(String(err.message||err));render();return false;
   }
 }
 function taskRow(task,plan){
   const r=node('div',null,'npt-item');
   const info=node('div');
   const slots=(plan.assignments[task.id]?.slots||[]).filter(x=>x.date===plan.today);
   const showTime=slots.length?' · Heute '+slots.map(x=>String(Math.floor(x.startMinute/60)).padStart(2,'0')+':'+String(x.startMinute%60).padStart(2,'0')).join(', ')+' Uhr':'';
   info.append(node('strong',task.title),node('small',(task.projectTitle||'Einzelaufgabe')+' · '+date(task.dueDate)+' · ca. '+fmt(task.minutes)+showTime+(task.hurdle==='high'?' · 😰':'')+((task.blockedBy||[]).length?' · Vorheriger Schritt offen':'')+(plan.assignments[task.id]?.unallocated?' · ⚠ Nicht vollständig eingeplant':'')));
   r.append(info,button('✎','nptEdit',task.id));return r;
 }
 function labeledInput(label,name,value,type='number'){
   const wrap=node('label',label),input=node('input');input.name=name;input.type=type;input.value=value??'';input.required=type==='number';if(type==='number'){input.min='0';input.max='720';input.step='15';}wrap.append(input);return wrap;
 }
 function labeledSelect(label,name,items,current){
   const wrap=node('label',label),select=node('select');select.name=name;
   items.forEach(([value,text])=>{const option=node('option',text);option.value=value;option.selected=String(current)===String(value);select.append(option);});
   wrap.append(select);return wrap;
 }
 function buildSettings(card){
   const details=node('details',null,'npt-settings');details.open=settingsOpen;
   details.append(node('summary','⚙ Zeitfenster & Puffer einstellen'));
   const form=node('form');form.dataset.nptSettings='';
   form.append(node('p','Wie viele Minuten hast du für Aufgaben ZUSÄTZLICH zu Unterricht und festen Terminen? Lieber konservativ schätzen.'));
   const grid=node('div',null,'npt-week');
   ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach((day,i)=>grid.append(labeledInput(day,'d'+i,config().weekdays[i])));
   form.append(grid,labeledSelect('Puffer','reserve',[10,20,30,40,50,60,70].map(x=>[x,x+' %']),config().reservePercent));
   const submit=node('button','Zeitbudget speichern','primary-button');submit.type='submit';form.append(submit,node('small','Diese Berechnung ist eine Entscheidungshilfe, keine Fristgarantie. Keine Push-Erinnerungen außerhalb der App.'));
   details.append(form);card.append(details);
 }
 function buildEdit(card){
   const t=findTask(editId);if(!t)return;
   const form=node('form',null,'npt-editor');form.dataset.nptEditForm='';
   form.append(node('h3','Aufgabe bearbeiten'));
   const title=labeledInput('Aufgabe','title',t.title,'text');title.querySelector('input').required=true;title.querySelector('input').maxLength=160;
   const due=labeledInput('Späteste Frist','dueDate',t.dueDate||'','date');
   const mins=labeledInput('Minuten Aufwand','minutes',t.minutes||20);mins.querySelector('input').min='5';mins.querySelector('input').max='2400';mins.querySelector('input').step='5';
   form.append(title,due,mins,labeledSelect('Kontext / Ort','context',[['any','Überall'],['home','Zu Hause'],['school','In der Schule'],['outside','🚶 Unterwegs / außerhalb']],t.context||'any'),labeledSelect('Verbindlichkeit','mandatory',[['yes','Muss erledigt werden'],['no','Optional / verschiebbar']],t.mandatory===false?'no':'yes'),labeledSelect('Emotionale Hürde','hurdle',[['normal','Normal'],['high','😰 Bauchschmerz-Aufgabe']],t.hurdle||'normal'));
   const submit=node('button','Speichern','primary-button');submit.type='submit';
   form.append(submit,button('Abbrechen','nptCancel'));card.append(form);
 }
 function render(){
   const root=byId('taskPlanningPanel'),dash=byId('taskPlanningTodayMount');if(!root||!dash)return;
   const p=snapshot(),todayData=p.daily[0],off=model()?.offDutyDay===today();
   root.replaceChildren();
   const card=node('section',null,'npt-card');
   card.append(node('p','LIFE RPG · DEINE AUFGABEN','eyebrow'),node('h2','Was ist heute wirklich wichtig?'),node('p','Aufgaben direkt in Life RPG planen – mit Fristen, Zeitpuffer und ohne Todoist.'));
   const stats=node('div',null,'npt-stats');
   stats.append(node('span',fmt(todayData.capacity)+' verfügbar'),node('span',fmt(todayData.planned)+' eingeplant'),node('span',config().reservePercent+' % Puffer'));
   card.append(stats,node('p',p.usingWindows?
     'Zeit aus deinen selbst angelegten Arbeitsfenstern, abzüglich fester Termine und Puffer. Heute: '+fmt(p.context.fixed)+' feste Schultermine. Kein Arbeitsfenster bedeutet keine verfügbare Zusatzzeit.':
     'Noch das bisherige Minutenmodell. Wenn du eigene Arbeitsfenster anlegst, werden nur diese für Aufgaben verwendet. Heute: '+fmt(p.context.fixed)+' feste Schultermine.','npt-note'));
   const coach=p.issues.length?'Bakugo: „Das geht so noch nicht zuverlässig auf. Check die Warnungen – und versuch nicht, alles mit Mehrarbeit zu retten.“':p.todayMust.length?'Bakugo: „Erst die wichtigen Sachen. Dann kannst du ohne schlechtes Gewissen Schluss machen.“':'Kirishima: „Heute ist nichts Weiteres zwingend eingeplant. Du darfst dir Zeit für dich nehmen.“';
   card.append(node('div',coach,'npt-coach'));
   const groups=node('div',null,'npt-groups');
   const section=(title,tasks)=>{
     const el=node('div');el.append(node('h3',title));
     if(!tasks.length)el.append(node('p','Hier ist gerade nichts fällig. ✿','npt-note'));
     tasks.slice(0,7).forEach(t=>el.append(taskRow(t,p)));
     if(tasks.length>7)el.append(node('p','Weitere Aufgaben stehen unten in der Projekt- und Inbox-Liste.','npt-note'));
     return el;
   };
   groups.append(section('🔸 Heute unbedingt · '+p.todayMust.length,p.todayMust),section('☘ Bald oder optional',p.soon.concat(p.optionalToday).slice(0,7)));card.append(groups);
   const future=native.getOpen().filter(t=>!p.todayMust.some(x=>x.id===t.id)&&!p.soon.some(x=>x.id===t.id)&&t.status!=='waiting'&&!(t.blockedBy||[]).length)
     .sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,5);
   const forward=node('div',null,'npt-upcoming');forward.append(node('h3','🗓 Danach kommt · nächste Projektschritte'));
   if(!future.length)forward.append(node('p','Keine weiteren planbaren Schritte vorhanden.','npt-note'));
   future.forEach(t=>forward.append(taskRow(t,p)));
   card.append(forward);
   const rest=node('details',null,'npt-settings');rest.append(node('summary','Alle '+native.getOpen().length+' offenen Aufgaben aus Projekten & Inbox anzeigen / bearbeiten'));
   native.getOpen().forEach(task=>rest.append(taskRow(task,p)));card.append(rest);
   if(p.issues.length){
     const warnings=node('details',null,'npt-warnings');warnings.open=true;warnings.append(node('summary','⚠ '+p.issues.length+' Planungshinweise'));
     p.issues.slice(0,12).forEach(i=>warnings.append(node('p',i.title+': '+(i.type==='overload'?fmt(i.remaining)+' passen bis zur Frist nicht hinein':i.type==='overdue'?'Frist überschritten':i.type==='no-date'?'Verbindliche Aufgabe ohne Datum':i.type==='blocked'?'Ein vorheriger Schritt ist offen':i.type==='waiting'?'Wartet auf externe Rückmeldung':'Außerhalb des 35-Tage-Planungshorizonts'))));
     card.append(warnings);
   }
   if(editId)buildEdit(card);
   buildSettings(card);root.append(card);
   dash.replaceChildren();
   const head=node('div',null,'npt-dash-head');head.append(node('small','✦ TASK COMPANION'),button('Meine Aufgaben →','nptOpen'));dash.append(head);
   dash.append(node('strong',off?'Feierabendmodus 🌙':p.todayMust.length+' verbindliche Schritte im heutigen Plan'));
   dash.append(node('p',off?'Arbeitsaufgaben sind für heute ausgeblendet. Nichts wurde gelöscht.':p.issues.length?'⚠ '+p.issues.length+' Planungswarnungen – bitte prüfen.':p.todayMust.length?'Katsuki: „Erst diese Aufgaben, dann Schluss!“':'Kirishima: „Keine weitere Pflichtaufgabe für heute geplant.“'));
   dash.append(button(off?'Arbeitsmodus anzeigen':'Feierabendmodus 🌙','nptDuty'));
 }
 function clicks(e){
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-npt-open')){app.showView('tasks');return;}
   if(b.hasAttribute('data-npt-duty')){save(()=>{model().offDutyDay=model().offDutyDay===today()?'':today();},'off-duty');return;}
   if(b.hasAttribute('data-npt-edit')){editId=b.dataset.nptEdit;render();return;}
   if(b.hasAttribute('data-npt-cancel')){editId='';render();}
 }
 function submit(e){
   const form=e.target.closest('form');if(!form||!form.matches('[data-npt-settings],[data-npt-edit-form]'))return;e.preventDefault();
   const f=new FormData(form);
   if(form.hasAttribute('data-npt-settings')){
     const days=Array.from({length:7},(_,i)=>Number(f.get('d'+i))),reserve=Number(f.get('reserve'));
     if(days.some(n=>!Number.isFinite(n)||n<0||n>720)||![10,20,30,40,50,60,70].includes(reserve)){app.showToast?.('Zeitbudget ungültig.');return;}
     settingsOpen=true;save(()=>{model().planningSettings={weekdays:days,reservePercent:reserve};},'settings');
   }else{
     const task=findTask(editId),title=String(f.get('title')||'').trim(),date=String(f.get('dueDate')||''),mins=Number(f.get('minutes'));
     if(!task||!title||(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))||!Number.isFinite(mins)||mins<5||mins>2400){app.showToast?.('Aufgabendaten überprüfen.');return;}
     if(save(()=>{task.title=title.slice(0,160);task.dueDate=date;task.minutes=mins;task.mandatory=f.get('mandatory')==='yes';task.hurdle=f.get('hurdle')==='high'?'high':'normal';task.context=['home','school','outside'].includes(f.get('context'))?f.get('context'):'any';},'edit')){editId='';render();}
   }
 }
 function init(){
   if(!byId('taskPlanningPanel')||!byId('taskPlanningTodayMount'))return;
   byId('taskPlanningPanel').addEventListener('click',clicks);
   byId('taskPlanningTodayMount').addEventListener('click',clicks);
   byId('taskPlanningPanel').addEventListener('submit',submit);
   window.addEventListener('life-rpg:task-projects-changed',render);
   window.addEventListener('life-rpg:view-changed',render);
   window.addEventListener('life-rpg:state-saved',render);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGNativePlanner={forecast:snapshot,render,_test:{config,findTask,load}};
})();