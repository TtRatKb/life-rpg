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
    generated.tasks.push(...removed.map(task=>({...task, archived:true})));
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
  return {exam, parseDay, dayOffset, daysUntil, instantiate, updateBranches, nextSteps, urgency};
});
