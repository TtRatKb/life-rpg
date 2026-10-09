/* Life RPG DZ22: explicitly activated local completion bridge; no time import. */
(() => {
  "use strict";
  const app=window.LifeRPGApp;
  if(!app?.getState)return;
  const KEY="life-rpg:schulcockpit-events:v1", CONFIG="life-rpg:schulcockpit-bridge:v1";
  const TYPES={
    "lesson-prepared":{skill:"lesson-design-preparation",label:"Schulcockpit · Unterricht vorbereitet"},
    "lesson-reflected":{skill:"teaching-facilitation",label:"Schulcockpit · Unterricht reflektiert"},
    "preparation-completed":{skill:"professional-organization",label:"Schulcockpit · Vorbereitung abgeschlossen"},
    "assessment-analyzed":{skill:"assessment-feedback",label:"Schulcockpit · Prüfungsanalyse abgeschlossen"}
  };
  let armed=false,dialog;
  function model(){const root=app.getState();root.schoolBridgeV1 ||= {schemaVersion:1,receipts:{}};return root.schoolBridgeV1;}
  function valid(e){return e?.schema===1 && e.source==="schulcockpit" && TYPES[e.type] && typeof e.eventId==="string" && e.eventId.startsWith(e.type+":") && /^[a-zA-Z0-9:_-]{1,180}$/.test(e.eventId) && Number.isFinite(Date.parse(e.completedAt)) && Date.parse(e.completedAt)<=Date.now()+60000;}
  function sync(){
    if(!armed)return 0;
    let queue;
    try {queue=JSON.parse(localStorage.getItem(KEY) || '{"schema":1,"events":[]}');}catch {throw Error("Bridge-Daten sind nicht lesbar.");}
    if(queue.schema!==1 || !Array.isArray(queue.events))throw Error("Unbekanntes Bridge-Format.");
    let count=0;
    for(const e of queue.events){
      if(!valid(e) || model().receipts[e.eventId])continue;
      const map=TYPES[e.type];
      const prior=(app.getState().rewardLedger?.events || []).find(r=>r.source==="schulcockpit-completion" && r.sourceId===`school:${e.eventId}` && !r.duplicate);
      const reward=prior ? {eventId:prior.id} : app.awardActivity({source:"schulcockpit-completion",sourceId:`school:${e.eventId}`,label:map.label,at:e.completedAt,realm:"Work",xp:3,realmXP:3,statXP:0,coins:0,storyEnergyBase:0,skipAddOnRewards:true,progressionRelevant:true,metadata:{bridgeType:e.type,skillId:map.skill,skillXP:4}});
      model().receipts[e.eventId]={at:e.completedAt,rewardId:reward.eventId};count++;
    }
    if(app.saveState({source:"schulcockpit-bridge",suppressUiRefresh:true})===false)throw Error("Life-RPG-Save konnte noch nicht gespeichert werden. Abschlüsse bleiben für einen erneuten Sync erhalten.");
    if(count)window.LifeRPGSkills?.rebuild?.();
    return count;
  }
  function open(){
    if(!dialog){
      dialog=document.createElement("dialog");dialog.className="kp-dialog";dialog.setAttribute("aria-labelledby","schoolBridgeTitle");document.body.appendChild(dialog);
      dialog.innerHTML='<header><h2 id="schoolBridgeTitle">Schulcockpit verbinden</h2><button class="close-button" data-school-close aria-label="Schließen">×</button></header><p>Schulcockpit erledigt die Planung. Life RPG übernimmt neue Abschlüsse als Work-Skill-Praxis: Unterrichtsvorbereitung, Reflexion, erledigte Vorbereitung und Prüfungsanalyse.</p><p>Die lokale Verbindung funktioniert im selben Browserprofil auf ttratkb.github.io. Es werden nur Abschlussart, stabile ID und Zeitpunkt geteilt. Unterrichtszeit bleibt in Meine Woche; hier wird keine Zeit erneut gebucht.</p><div class="kp-actions"><button class="primary-button" data-school-enable>Verbinden und Abschlüsse synchronisieren</button><a class="secondary-button" href="https://ttratkb.github.io/Schulcockpit/" target="_blank" rel="noopener">Schulcockpit öffnen ↗</a><button class="secondary-button" data-school-disable>Verbindung pausieren</button></div><p data-school-status role="status"></p><p class="muted">Schulcockpit braucht ebenfalls den mitgelieferten Bridge-Patch. Frühere Arbeiten werden nicht nachträglich vergütet. Beim nächsten Öffnen von Life RPG hier erneut synchronisieren; während dieser Sitzung kommen neue Abschlüsse automatisch an. Geräteübergreifender Sync ist noch nicht eingebaut.</p>';
      dialog.addEventListener("click",e=>{
        if(e.target.closest("[data-school-close]"))dialog.close();
        const status=dialog.querySelector("[data-school-status]");
        try {
          if(e.target.closest("[data-school-enable]")){localStorage.setItem(CONFIG,JSON.stringify({schema:1,enabled:true}));armed=true;const n=sync();status.textContent=`Verbunden · ${n} neue Abschlüsse übernommen.`;}
          if(e.target.closest("[data-school-disable]")){localStorage.setItem(CONFIG,JSON.stringify({schema:1,enabled:false}));armed=false;status.textContent="Verbindung pausiert. Bereits erfasster Fortschritt bleibt erhalten.";}
        }catch(err){status.textContent=err.message;}
      });
    }
    if(!dialog.open)dialog.showModal();
  }
  window.addEventListener("storage",e=>{
    if(e.key===CONFIG){try{if(!JSON.parse(e.newValue || "null")?.enabled)armed=false;}catch{armed=false;}}
    if(e.key===KEY && armed){try{const n=sync();if(n)app.showToast?.(`${n} Schulcockpit-Abschluss${n===1?"":"e"} übernommen.`);}catch(err){app.showToast?.(err.message);}}
  });
  window.LifeRPGWorkBridge={version:"0.31.4dz22",open,_test:{valid,sync,model,TYPES,arm:()=>{armed=true;}}};
})();
