/* Life RPG guided Task/Project creation. Pure scripted character prompts; no AI or cloud inference. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,tasks=window.LifeRPGTaskProjects;
 if(!app?.getState||!tasks?.createTask||!tasks?.createProject)return;
 const $=id=>document.getElementById(id);
 const date=()=>{const x=new Date();return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-');};
 const addDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 let active=false,step=0,record={},char='kiri';
 function reset(){
   active=true;step=0;record={type:'task',title:'',templateId:'manual-v1',dueDate:'',minutes:30,mandatory:true,hurdle:'normal'};char='kiri';
 }
 const charName=()=>char==='bakugo'?'Bakugo':'Kirishima';
 const talk={
  person:['Wer soll dich heute begleiten?','Wer darf heute mit dir die Liste in Angriff nehmen?'],
  type:['Eine einzelne Aufgabe oder eher eine ganze Aufgabe-Kette?','Braucht das Ding mehrere Schritte oder erledigen wir eine Sache?'],
  title:['Wie heißt das Ganze? Ein paar Wörter reichen.','Worum geht’s? Schreib nur das Nötigste auf.'],
  template:['Brauchen wir die Klassenarbeits-Vorlage oder fangen wir frei an?','Soll eine Vorlage die Schritte übernehmen?'],
  due:['Wann muss das erledigt sein? Ohne Deadline ist auch okay.','Wie viel Zeit bleibt uns wirklich?'],
  minutes:['Nur grob: Wie lange brauchst du dafür?','Was schätzt du, wie lange es dauert?'],
  mandatory:['Ist das eine echte Pflicht oder eher ein schönes Extra?','MUSS es erledigt werden oder darf es warten?'],
  hurdle:['Wie unangenehm fühlt es sich an?','Ganz normal oder so eine Bauchschmerz-Aufgabe?'],
  summary:['Sieht das richtig aus? Du kannst zurückgehen.','Einmal gegenchecken, dann kommt es in deinen Plan.']
 };
 const sequence=()=>record.type==='project'?['person','type','title','template','due','summary']:['person','type','title','due','minutes','mandatory','hurdle','summary'];
 const cur=()=>sequence()[step];
 const root=()=>$('taskWizardMount');
 const element=(tag,text,clazz)=>{const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(clazz)e.className=clazz;return e;};
 function button(label,action,value,selected=false){
   const b=element('button',label,'twd-choice'+(selected?' selected':''));b.type='button';b.dataset[action]=value??'';return b;
 }
 function field(label,type,name,value){
   const e=element('label',label,'twd-field');const i=element('input');i.type=type;i.name=name;i.value=value||'';i.placeholder=type==='text'?'Zum Beispiel: Elternbrief verfassen':'';if(type==='text')i.maxLength=160;e.append(i);return e;
 }
 function content(current){
   const wrap=element('div',null,'twd-content');
   if(current==='person'){
     wrap.append(button('💥 Bakugo','twdSelectChar','bakugo',char==='bakugo'),button('☀️ Kirishima','twdSelectChar','kiri',char==='kiri'),button('🎲 Überrasch mich','twdSelectChar','random',false));
   }else if(current==='type'){
     wrap.append(button('✓ Eine Aufgabe','twdChoose','task',record.type==='task'),button('📁 Mehrere Schritte / Projekt','twdChoose','project',record.type==='project'));
     wrap.append(element('small','Du musst nicht wissen, wie man das organisatorisch nennt. Wir kümmern uns um die Einordnung.'));
   }else if(current==='title'){
     wrap.append(field('Was steht an?','text','title',record.title));
   }else if(current==='template'){
     wrap.append(element('p','Eine Vorlage legt Schritte und Fristen für dich an. Du kannst auch leer starten.'));
     tasks.listTemplates().forEach(item=>wrap.append(button(item.name,'twdTemplate',item.id,record.templateId===item.id)));
   }else if(current==='due'){
     wrap.append(element('p',record.type==='project'?'Wann findet das Ereignis statt? Bei einem freien Projekt kannst du auch ohne feste Frist beginnen.':'Wann muss es spätestens fertig sein?'));
     wrap.append(button('Heute','twdDue',date(),record.dueDate===date()),button('Morgen','twdDue',addDays(1),record.dueDate===addDays(1)),button('In einer Woche','twdDue',addDays(7),record.dueDate===addDays(7)));
     wrap.append(button('Keine feste Frist','twdDue','none',record.dueDate===''));
     wrap.append(field('Oder genaues Datum wählen','date','dueDate',record.dueDate));
   }else if(current==='minutes'){
     [['10','5–15 Minuten'],['30','Etwa 30 Minuten'],['60','Eine Stunde'],['120','Zwei Stunden'],['240','Mehrere Stunden']].forEach(([n,t])=>wrap.append(button(t,'twdMinutes',n,Number(record.minutes)===Number(n))));
   }else if(current==='mandatory'){
     wrap.append(button('🔴 Muss rechtzeitig erledigt sein','twdMandatory','yes',record.mandatory===true));
     wrap.append(button('🍀 Kann notfalls warten','twdMandatory','no',record.mandatory===false));
   }else if(current==='hurdle'){
     wrap.append(button('🙂 Alles okay','twdHurdle','normal',record.hurdle==='normal'));
     wrap.append(button('😰 Kostet mich Überwindung','twdHurdle','high',record.hurdle==='high'));
   }else if(current==='summary'){
     const dateText=record.dueDate||'Ohne Datum';
     wrap.append(element('strong',record.title,'twd-review-title'));
     wrap.append(element('p',record.type==='task'?'Eine Aufgabe · '+record.minutes+' Min. · '+(record.mandatory?'Verbindlich':'Flexibel')+' · '+(record.hurdle==='high'?'Bauchschmerz-Aufgabe':'Normale Hürde'):'Ein Projekt · '+(tasks.listTemplates().find(x=>x.id===record.templateId)?.name||'Eigene Vorlage')));
     wrap.append(element('p','Datum: '+dateText+(record.dueDate?'':' · Ohne Termin keine verlässliche Fälligkeitsprüfung')));
     if(record.type==='project')wrap.append(element('p','Bei einem freien Projekt kannst du danach die einzelnen Schritte hinzufügen.'));
   }
   return wrap;
 }
 function render(){
   const mount=root();if(!mount)return;
   mount.replaceChildren();
   const head=element('div',null,'twd-header');
   const titles=element('div');
   titles.append(element('p','LIFE RPG · TASK BEGLEITUNG','eyebrow'),element('h2','Neuen Task oder ein Projekt erstellen'));
   head.append(titles,button(active?'Schließen':'✦ Geführt erstellen','twdToggle',active?'close':'open'));
   mount.append(head);
   if(!active){
     mount.append(element('p','Kein Etiketten-Dschungel: Bakugo oder Kirishima führt dich mit Klickfragen durch die Erstellung. Die Quick-Inbox bleibt für ganz schnelle Einträge.','twd-intro'));
     return;
   }
   const current=cur(),total=sequence().length;
   const body=element('div',null,'twd-body');
   body.append(element('small','Schritt '+(step+1)+' / '+total,'twd-progress'));
   const name=charName();
   body.append(element('div',name+': „'+talk[current][char==='bakugo'?1:0]+'“','twd-dialogue'));
   body.append(content(current));
   const footer=element('div',null,'twd-footer');
   if(step>0)footer.append(button('← Zurück','twdBack'));
   footer.append(button(current==='summary'?'✓ Speichern':'Weiter →','twdNext'));
   body.append(footer);mount.append(body);
 }
 function next(){
   const current=cur(),mount=root();
   if(current==='title'){
     const value=mount.querySelector('input[name="title"]')?.value.trim()||'';
     if(!value){app.showToast?.('Bitte der Aufgabe einen kurzen Namen geben.');return;}
     record.title=value;
   }
   if(current==='due'){
     const d=mount.querySelector('input[name="dueDate"]')?.value||'';
     record.dueDate=d;
     if(record.type==='project'&&record.templateId!=='manual-v1'&&!d){app.showToast?.('Für die Vorlage benötigen wir den Termin.');return;}
   }
   if(current==='summary'){
     const ok=record.type==='task'?tasks.createTask({...record}):tasks.createProject({title:record.title,date:record.dueDate||date(),templateId:record.templateId});
     if(!ok){app.showToast?.('Der Task konnte nicht gespeichert werden. Prüfe die Eingaben.');return;}
     app.showToast?.(record.type==='task'?'Deine Aufgabe ist eingeplant ✦':'Das Projekt ist angelegt ✦');
     active=false;render();return;
   }
   step=Math.min(sequence().length-1,step+1);render();
 }
 function clicks(e){
   const btn=e.target.closest('button');if(!btn||!root()?.contains(btn))return;
   if(btn.hasAttribute('data-twd-toggle')){btn.dataset.twdToggle==='close'?active=false:reset();render();return;}
   if(btn.hasAttribute('data-twd-back')){step=Math.max(0,step-1);render();return;}
   if(btn.hasAttribute('data-twd-next')){next();return;}
   if(btn.hasAttribute('data-twd-select-char')){char=btn.dataset.twdSelectChar==='random'?(Math.random()<.5?'bakugo':'kiri'):btn.dataset.twdSelectChar;render();return;}
   if(btn.hasAttribute('data-twd-choose')){record.type=btn.dataset.twdChoose;render();return;}
   if(btn.hasAttribute('data-twd-template')){record.templateId=btn.dataset.twdTemplate;render();return;}
   if(btn.hasAttribute('data-twd-due')){record.dueDate=btn.dataset.twdDue==='none'?'':btn.dataset.twdDue;render();return;}
   if(btn.hasAttribute('data-twd-minutes')){record.minutes=Number(btn.dataset.twdMinutes);render();return;}
   if(btn.hasAttribute('data-twd-mandatory')){record.mandatory=btn.dataset.twdMandatory==='yes';render();return;}
   if(btn.hasAttribute('data-twd-hurdle')){record.hurdle=btn.dataset.twdHurdle;render();return;}
 }
 function input(e){
   if(e.target.matches('[name="title"]'))record.title=e.target.value;
   if(e.target.matches('[name="dueDate"]'))record.dueDate=e.target.value;
 }
 function init(){if(!root())return;root().addEventListener('click',clicks);root().addEventListener('input',input);render();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGTaskWizard={open:()=>{reset();render();root()?.scrollIntoView?.({block:'start'});},render};
})();