/* DZ27: scope-aware school completion transport (same-origin + optional private Firestore) — no time import. */
(() => {
  "use strict";
  const app = window.LifeRPGApp;
  if (!app?.getState) return;
  const KEY = "life-rpg:schulcockpit-events:v1";
  const CONFIG = "life-rpg:schulcockpit-bridge:v1";
  const TYPES = Object.freeze({
    "lesson-prepared": {skill:"lesson-design-preparation", label:"Schulcockpit · Unterricht vorbereitet"},
    "lesson-reflected": {skill:"assessment-feedback", label:"Schulcockpit · Unterricht reflektiert"},
    "preparation-completed": {skill:"professional-organization", label:"Schulcockpit · Vorbereitung abgeschlossen"},
    "assessment-analyzed": {skill:"assessment-feedback", label:"Schulcockpit · Prüfungsanalyse abgeschlossen"},
    "sequence-planned": {skill:"lesson-design-preparation", label:"Schulcockpit · Reihenplanung abgeschlossen"}
  });
  // The award engine already applies the global Story Energy diminishing curve.
  // No minutes are supplied and no second time entry is created.
  const REWARDS = Object.freeze({
    "preparation-completed": {brief:[3,3,4,2,.10],standard:[5,5,6,5,.18]},
    "lesson-reflected": {brief:[3,3,4,3,.12],standard:[5,5,6,5,.20]},
    "lesson-prepared": {standard:[5,5,6,5,.20],extended:[7,7,8,7,.27]},
    "assessment-analyzed": {substantial:[9,9,10,10,.35],extended:[11,11,12,12,.42]},
    "sequence-planned": {substantial:[12,12,14,14,.45],extended:[15,15,16,18,.55]}
  });
  const LEGACY = [3,3,4,2,.10];
  const BAND_NAMES = {brief:"Kleiner Abschluss",standard:"Ausgearbeiteter Schritt",substantial:"Größeres Arbeitspaket",extended:"Umfangreicher Abschluss"};
  function rewardProfile(e) {
    if (e.rewardSchema !== 2) return {band:"legacy",data:LEGACY};
    const permitted=REWARDS[e.type]||{};
    // Invalid or unexpected bands cannot inflate an award.
    const band=Object.hasOwn(permitted,e.effortBand)?e.effortBand:Object.keys(permitted)[0];
    return {band,data:permitted[band]};
  }
  let armed = readConfig(), dialog = null, busy = false;
  function canApply() {
    const status=window.LifeRPGCloudStatus?.snapshot?.();
    return !!status?.settled && (!status.uid || status.ready);
  }
  function readConfig() {
    try {return JSON.parse(localStorage.getItem(CONFIG)||"null")?.enabled === true;}
    catch {return false;}
  }
  function model() {
    const root = app.getState();
    if (!root.schoolBridgeV1 || typeof root.schoolBridgeV1 !== "object") root.schoolBridgeV1 = {schemaVersion:1,receipts:{}};
    if (!root.schoolBridgeV1.receipts || typeof root.schoolBridgeV1.receipts !== "object") root.schoolBridgeV1.receipts = {};
    return root.schoolBridgeV1;
  }
  function valid(e) {
    return e && e.schema === 1 && e.source === "schulcockpit" && !!TYPES[e.type] &&
      typeof e.eventId === "string" && e.eventId.startsWith(`${e.type}:`) &&
      /^(lesson-prepared|lesson-reflected|preparation-completed|assessment-analyzed|sequence-planned):[a-zA-Z0-9_-]{1,120}$/.test(e.eventId) &&
      typeof e.completedAt === "string" && Number.isFinite(Date.parse(e.completedAt)) &&
      Date.parse(e.completedAt) <= Date.now() + 60000;
  }
  function ingest(events = []) {
    if (busy) return 0;
    if (!canApply()) throw Error("Cloud-Save wird noch geprüft. Schulcockpit-Abschlüsse werden danach übernommen.");
    busy = true;
    let count=0;
    try {
      if (!Array.isArray(events)) throw Error("Unbekannte Schulcockpit-Ereignisse.");
      for (const e of events) {
        if (!valid(e) || model().receipts[e.eventId]) continue;
        const mapped = TYPES[e.type];
        const profile=rewardProfile(e);
        const [charXp,realmXp,skillXp,coins,energy]=profile.data;
        const id = `school:${e.eventId}`;
        const prior = (app.getState().rewardLedger?.events || []).find(r => r.source === "schulcockpit-completion" && r.sourceId === id && !r.duplicate);
        const reward = prior ? {eventId:prior.id} : app.awardActivity({
          source:"schulcockpit-completion", sourceId:id, label:mapped.label,
          at:e.completedAt, realm:"Work", xp:charXp, realmXP:realmXp, statXP:0,
          coins, storyEnergyBase:energy, skipAddOnRewards:true, progressionRelevant:true,
          metadata:{bridgeType:e.type,skillId:mapped.skill,skillXP:skillXp,effortBand:profile.band,
            effortLabel:BAND_NAMES[profile.band]||"Bisheriger Abschluss",rewardSchema:e.rewardSchema===2?2:1}
        });
        model().receipts[e.eventId] = {at:e.completedAt,rewardId:reward.eventId};
        count++;
      }
      if (count && app.saveState({source:"schulcockpit-bridge",suppressUiRefresh:true}) === false)
        throw Error("Life-RPG-Speichern ist fehlgeschlagen. Bitte nicht neu laden; Speicher prüfen oder Save exportieren.");
      if (count) {
        window.LifeRPGSkills?.rebuild?.();
        if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function')
          window.dispatchEvent(new CustomEvent('life-rpg:school-completions-ingested',{detail:{count}}));
      }
      return count;
    } finally {busy=false;}
  }
  function readLocal() {
    let queue;
    try {queue = JSON.parse(localStorage.getItem(KEY) || '{"schema":1,"events":[]}');}
    catch {throw Error("Lokale Schulcockpit-Ereignisse sind nicht lesbar.");}
    if (queue?.schema !== 1 || !Array.isArray(queue.events)) throw Error("Unbekanntes Bridge-Format.");
    return queue.events;
  }
  function syncLocal() {
    if (!armed) return 0;
    const raw=localStorage.getItem(CONFIG);
    let since=0;
    try {since=Number(JSON.parse(raw||"null")?.since||0);} catch { /* legacy opt-in */ }
    const queue=readLocal().filter(e=>Number.isFinite(Date.parse(e.completedAt)) && Date.parse(e.completedAt)>=since);
    return ingest(queue);
  }
  function status(text) {const target=dialog?.querySelector("[data-school-status]"); if(target)target.textContent=text;}
  function open() {
    if (!dialog) {
      dialog=document.createElement("dialog"); dialog.className="kp-dialog"; dialog.setAttribute("aria-labelledby","schoolBridgeTitle"); document.body.appendChild(dialog);
      dialog.innerHTML=`<header><h2 id="schoolBridgeTitle">Schulcockpit ↔ Life RPG</h2><button class="close-button" data-school-close aria-label="Schließen">×</button></header>
        <p>Unterrichts- und Reihenplanung, Reflexion, erledigte Materialorganisation und Prüfungsanalyse trainieren jeweils genau einen bestehenden Work-Skill. Neue Abschlüsse bringen etwas Character-/Work-XP, Skill-XP, Coins und Story Energy. Keine zweite Zeitbuchung. <strong>Keine Unterrichtsminuten, keine Schülerdaten, keine zweite Zeitbelohnung.</strong></p>
        <p>Auf demselben Browser funktioniert die lokale Verbindung. Für Mac, iPhone und iPad nutzt die optionale Cloud-Brücke dein bestehendes Google-/Firebase-Konto. Aktivierung und Versand erfolgen in Schulcockpit.</p>
        <div class="kp-actions"><button class="primary-button" data-school-enable>Lokale Verbindung aktivieren</button><button class="secondary-button" data-school-sync>Jetzt synchronisieren</button><a class="secondary-button" href="https://ttratkb.github.io/Schulcockpit/" target="_blank" rel="noopener">Schulcockpit öffnen ↗</a><button class="secondary-button" data-school-disable>Lokale Verbindung pausieren</button></div>
        <p data-school-status role="status"></p><p data-school-cloud-status role="status">Cloud-Verbindung wird geprüft …</p>
        <p class="muted">Die Cloud-Brücke verwendet ausschließlich private Abschlussereignisse. Sie benötigt die Firestore-Zugriffsregel aus der Installationsanleitung. Vor der ersten Verbindung abgeschlossene Arbeiten werden nicht nachträglich belohnt. Eine Aufgabe, die bereits in Todoist belohnt wurde, darf nicht zusätzlich als unabhängige Tätigkeit vergütet werden.</p>`;
      dialog.addEventListener("click", async e => {
        if (e.target.closest("[data-school-close]")) {dialog.close();return;}
        try {
          if (e.target.closest("[data-school-enable]")) {
            const previous=JSON.parse(localStorage.getItem(CONFIG)||"null")||{};
            localStorage.setItem(CONFIG,JSON.stringify({schema:1,enabled:true,since:previous.since||Date.now()})); armed=true;
            status(`Lokal verbunden · ${syncLocal()} neue Abschlüsse übernommen.`);
          } else if (e.target.closest("[data-school-disable]")) {
            const previous=JSON.parse(localStorage.getItem(CONFIG)||"null")||{};
            localStorage.setItem(CONFIG,JSON.stringify({...previous,schema:1,enabled:false})); armed=false;
            status("Lokale Verbindung pausiert. Bisherige Fortschritte bleiben erhalten.");
          } else if (e.target.closest("[data-school-sync]")) {
            const n=syncLocal(); const c=await window.LifeRPGWorkCloud?.sync?.();
            status(`${n} neue lokale Abschlüsse. ${c === undefined ? "Cloud nicht verfügbar." : "Cloud geprüft."}`);
          }
        } catch(err) {status(String(err?.message||err));}
      });
    }
    status(armed?"Lokale Verbindung ist aktiv.":"Lokale Verbindung ist pausiert.");
    window.LifeRPGWorkCloud?.showStatus?.();
    if(!dialog.open) dialog.showModal();
  }
  window.addEventListener("storage",e => {
    if (e.key===CONFIG) {armed=readConfig();if(armed)try{syncLocal();}catch(err){console.warn("Schulcockpit lokal",err);}}
    if (e.key===KEY && armed) try{const n=syncLocal();if(n)app.showToast?.(`${n} Schulcockpit-Abschlüsse übernommen.`);}catch(err){app.showToast?.(String(err?.message||err));}
  });
  // Restore explicit opt-in when returning to Life RPG. Old receipts prevent replay.
  if (armed) {
    let tries=0;
    const t=setInterval(() => {
      if(canApply()) {clearInterval(t);try{syncLocal();}catch(err){console.warn("Schulcockpit Start-Sync",err);}}
      else if(++tries>120)clearInterval(t);
    },1500);
  }
  window.LifeRPGWorkBridge={version:"0.31.4dz27",open,ingest,syncLocal,valid,TYPES,_test:{valid,ingest,model,readLocal,rewardProfile}};
})();
