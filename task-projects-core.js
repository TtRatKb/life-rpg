/* Life RPG · Task Projects v1. Pure, deterministic scheduling. No AI/API, rewards or student data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LifeRPGTaskProjectCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000;
  const iso = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  function parseDay(value) {
    if (!iso(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day));
    return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day ? utc : null;
  }
  function dayOffset(value, delta) {
    const date = parseDay(value);
    if (!date || !Number.isInteger(Number(delta))) throw Error('Ungültiges Datum oder Tagesintervall.');
    return new Date(date.getTime() + Number(delta) * DAY).toISOString().slice(0, 10);
  }
  function daysUntil(a, b) {
    const from = parseDay(a), to = parseDay(b);
    if (!from || !to) throw Error('Ungültiger Kalendertag.');
    return Math.round((to - from) / DAY);
  }
  const exam = Object.freeze({
    id: 'school-exam-v1', name: 'Klassenarbeit', anchorLabel: 'Termin der Klassenarbeit',
    steps: [
      { id:'design', title:'Klassenarbeit konzipieren', days:-14, minutes:120, mandatory:true },
      { id:'inclusion-check', title:'Inklusionsbedarf abklären', days:-13, minutes:15, mandatory:true, when:'inclusion-check' },
      { id:'inclusion', title:'Inklusionsarbeit konzipieren', days:-7, minutes:80, mandatory:true, when:'inclusion-yes', depends:['design'] },
      { id:'classtime', title:'In Classtime übertragen und prüfen', days:-4, minutes:45, mandatory:true, when:'digital', depends:['design'] },
      { id:'print', title:'Benötigte Klassenarbeiten / Unterlagen drucken', days:-1, minutes:20, mandatory:true, depends:['design'] },
      { id:'conduct', title:'Klassenarbeit durchführen', days:0, minutes:90, mandatory:true, depends:['print'] },
      { id:'resit-check', title:'Prüfen, ob jemand nachschreiben muss', days:1, minutes:10, mandatory:true, depends:['conduct'] },
      { id:'resit-plan', title:'Nachschreibtermin organisieren', days:3, minutes:20, mandatory:true, when:'resit-yes', depends:['resit-check'] },
      { id:'resit-conduct', title:'Nachschreibarbeit durchführen', days:9, minutes:90, mandatory:true, when:'resit-yes', depends:['resit-plan'] },
      { id:'resit-mark', title:'Nachschreibarbeit korrigieren', days:11, minutes:45, mandatory:true, when:'resit-yes', depends:['resit-conduct'] },
      { id:'mark', title:'Klassenarbeit korrigieren und auswerten', days:11, minutes:240, mandatory:true, depends:['conduct'] },
      { id:'competence', title:'Kompetenzchecks / Rückmeldungen vorbereiten', days:13, minutes:45, mandatory:false, depends:['mark'] },
      { id:'return', title:'Klassenarbeit zurückgeben', days:14, minutes:20, mandatory:true, depends:['mark'] }
    ]
  });
  function enabled(step, options) {
    switch (step.when) {
      case 'digital': return options.format !== 'paper';
      case 'inclusion-check': return options.inclusion !== 'no';
      case 'inclusion-yes': return options.inclusion === 'yes';
      case 'resit-yes': return options.resit === 'yes';
      default: return true;
    }
  }
  function instantiate(template, anchor, options, uid) {
    if (!parseDay(anchor)) throw Error('Bitte ein gültiges Projektdatum wählen.');
    if (!template || !Array.isArray(template.steps) || !template.steps.length || !uid) throw Error('Ungültige Projektvorlage.');
    const selected = template.steps.filter(step => enabled(step, options || {}));
    const ids = new Set(selected.map(step => step.id));
    if (ids.size !== selected.length) throw Error('Doppelte Schrittnamen in der Vorlage.');
    const tasks = selected.map(step => {
      if (!step.id || !String(step.title||'').trim() || !Number.isInteger(Number(step.days)) || Math.abs(Number(step.days)) > 366) throw Error('Ungültiger Vorlagenschritt.');
      const dueDate = dayOffset(anchor, Number(step.days));
      return {
        id: uid + ':' + step.id, stepId: step.id, title:String(step.title).slice(0,160),
        dueDate, minutes:Math.max(5, Math.min(2400, Number(step.minutes)||20)),
        mandatory: step.mandatory !== false, hurdle: 'normal',
        depends: (step.depends||[]).filter(id => ids.has(id)), doneAt: null
      };
    });
    return { id:uid, templateId:template.id, title:'', anchorDate:anchor,
      options:{...options}, createdAt:new Date().toISOString(), tasks };
  }
  function updateBranches(project, template, nextOptions) {
    const options = {...project.options, ...nextOptions};
    const generated = instantiate(template, project.anchorDate, options, project.id);
    const previous = new Map(project.tasks.map(task => [task.stepId, task]));
    generated.tasks = generated.tasks.map(task => {
      const old = previous.get(task.stepId);
      return old ? {...task, doneAt:old.doneAt, dueDate:old.dueDate, hurdle:old.hurdle, minutes:old.minutes} : task;
    });
    // Never destroy a completed branch when changing a conditional answer.
    const removed = project.tasks.filter(task => !generated.tasks.some(step => step.stepId === task.stepId));
    generated.tasks.push(...removed.map(task=>({...task, archived:!String(task.stepId).startsWith('custom-')})));
    return {...project, options, tasks:generated.tasks};
  }
  function nextSteps(project) {
    const done = new Set(project.tasks.filter(t=>t.doneAt).map(t=>t.stepId));
    return project.tasks.filter(task => !task.archived && !task.doneAt)
      .map(task=>({...task, blockedBy:(task.depends||[]).filter(id=>!done.has(id))}))
      .sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||Number(b.mandatory)-Number(a.mandatory));
  }
  function urgency(task, today) {
    const days = daysUntil(today,task.dueDate);
    if (days < 0) return task.mandatory ? 'overdue-critical' : 'overdue-flex';
    if (days === 0) return task.mandatory ? 'today-critical' : 'today-flex';
    if (days <= 2) return task.mandatory ? 'soon-critical' : 'soon-flex';
    return 'later';
  }

  // A due date is a deadline, never an automatically assigned work day.
  // Existing task IDs and records remain unchanged; this is a read-only view.
  function taskSignal(task, today) {
    const validDue=parseDay(task?.dueDate);
    const days=validDue&&parseDay(today)?daysUntil(today,task.dueDate):null;
    const hard=task?.mandatory!==false&&task?.dateKind!=='target';
    const blocked=task?.status==='waiting'||(task?.blockedBy||[]).length>0;
    const effort=Math.max(5,Math.min(2400,Number(task?.minutes)||20));
    const advance=effort>=180?7:effort>=90?5:effort>=40?3:2;
    if(blocked)return {bucket:'waiting',days,hard,label:'Noch nicht dran',message:task.status==='waiting'?'Wartet auf eine Rückmeldung. Du musst gerade nichts erzwingen.':'Erst ein vorheriger Schritt – hier ist nichts vergessen.'};
    if(days===null)return {bucket:'later',days:null,hard,label:'Ohne feste Deadline',message:'Sicher notiert. Du kannst es später in Ruhe einordnen.'};
    if(!hard){
      if(days<0)return {bucket:'later',days,hard,label:'Zieldatum vorbei',message:'Das war ein Wunschdatum, keine verpasste Pflicht. Neu entscheiden ist okay.'};
      if(days===0)return {bucket:'soon',days,hard,label:'Zieldatum heute',message:'Wenn es passt, ist heute ein guter Zeitpunkt. Kein Muss.'};
      return {bucket:'later',days,hard,label:'Noch '+days+' '+(days===1?'Tag':'Tage')+' bis zum Ziel',message:'Eine Orientierung, keine zwingende Deadline.'};
    }
    if(days<0)return {bucket:'urgent',days,hard,label:'Frist überschritten',message:'Das braucht eine neue Lösung oder Absprache – nicht einfach mehr Druck.'};
    if(days===0)return {bucket:'urgent',days,hard,label:'Deadline heute',message:'Heute muss es fertig sein. Konzentrier dich auf den nächsten machbaren Schritt.'};
    if(days<=advance)return {bucket:'soon',days,hard,label:'Noch '+days+' '+(days===1?'Tag':'Tage'),message:effort>=90?'Mit dem geschätzten Aufwand solltest du jetzt beginnen.':'Langsam angehen – ein kleiner Schritt reicht für den Anfang.'};
    return {bucket:'later',days,hard,label:'Noch '+days+' Tage',message:'Im Blick behalten. Heute noch nicht zwingend.'};
  }
  function taskBuckets(tasks,today){
    const groups={urgent:[],soon:[],later:[],waiting:[]};
    for(const task of tasks||[]){
      if(!task||task.doneAt||task.archived)continue;
      const status=taskSignal(task,today);
      groups[status.bucket].push({...task,calmSignal:status});
    }
    const compare=(a,b)=>(a.calmSignal.days??99999)-(b.calmSignal.days??99999)||String(a.title||'').localeCompare(String(b.title||''),'de');
    for(const bucket of Object.values(groups))bucket.sort(compare);
    return groups;
  }

  // Independent calendar radar: every open dated task is visible even if its prep score
  // is low, its date is a flexible target, or it is waiting on someone else.
  // The radar never changes a date, a save, or an activity reward.
  function deadlineRadar(tasks,today) {
    if(!parseDay(today))throw Error('Ungültiger Kalendertag.');
    const groups={dueNow:[],review:[],week:[],following:[],future:[],undated:[],prepare:[]};
    for(const task of tasks||[]){
      if(!task||task.doneAt||task.archived)continue;
      const days=parseDay(task.dueDate)?daysUntil(today,task.dueDate):null;
      const hard=task.mandatory!==false&&task.dateKind!=='target';
      const blocked=task.status==='waiting'||(task.blockedBy||[]).length>0;
      const effort=Math.max(5,Math.min(2400,Number(task.minutes)||20));
      const advance=effort>=180?7:effort>=90?5:effort>=40?3:2;
      const readable=days===null?'Ohne Deadline':days<0?(Math.abs(days)+' '+(days===-1?'Tag':'Tage')+' überfällig'):
        days===0?'Heute':days===1?'Morgen':'In '+days+' Tagen';
      const base=blocked?' · wartet auf einen vorherigen Schritt / eine Rückmeldung':'';
      const item={...task,radarDays:days,radarHard:hard,radarBlocked:blocked,
        radarLabel:readable+(hard?' · feste Frist':' · flexibles Ziel'),
        radarAdvice:days===null?'Ohne Termin sicher vorgemerkt. Lege eine Deadline nur fest, wenn es tatsächlich eine gibt.':
          hard&&days<=0?'Die Deadline ist erreicht'+base+'. Bitte heute prüfen, was noch möglich ist.':
          !hard&&days<=0?'Ein Zieldatum, keine verpasste Pflicht. Du kannst neu entscheiden.':
          blocked?'Die Deadline nähert sich, obwohl hier noch etwas aussteht. Prüfe die Abhängigkeit.':
          hard&&days<=advance?'Zeit zum Anfangen, damit es bis zur Frist nicht eng wird.':
          hard?'Du hast noch Zeit. Die Frist bleibt sichtbar.':'Das ist ein Wunschdatum, keine Pflicht.'};
      if(days===null)groups.undated.push(item);
      else if(days<=0)(hard?groups.dueNow:groups.review).push(item);
      else if(days<=7)groups.week.push(item);
      else if(days<=21)groups.following.push(item);
      else groups.future.push(item);
      if(hard&&days!==null&&days>0&&days<=advance&&!blocked)groups.prepare.push(item);
    }
    const compare=(a,b)=>(a.radarDays??Number.POSITIVE_INFINITY)-(b.radarDays??Number.POSITIVE_INFINITY)
      ||Number(b.radarHard)-Number(a.radarHard)||String(a.title||'').localeCompare(String(b.title||''),'de')
      ||String(a.id||'').localeCompare(String(b.id||''));
    for(const group of Object.values(groups))group.sort(compare);
    return groups;
  }
  return {exam, parseDay, dayOffset, daysUntil, instantiate, updateBranches, nextSteps, urgency, taskSignal, taskBuckets, deadlineRadar};
});
