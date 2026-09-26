/* Life RPG V0.31.4di — optional Dungeon receipt intake, alongside original Kotoba SRS bridge.
 * Own event namespace, first-install baseline, no modification of existing Kotoba daily caps. */
(() => {
  'use strict';
  if(window.LifeRPGKotobaDungeonBridge)return;
  const app=window.LifeRPGApp;
  if(!app?.getState||!app?.awardActivity||!app?.saveState)return;
  const KEY='kotobaQuestDungeonRewardOutboxV1';
  const DUNGEON='https://ttratkb.github.io/kotoba-quest/dungeon.html';
  const SOURCE='kotoba-dungeon';
  const round2=n=>Math.round((Number(n)||0)*100)/100;
  let busy=false,tick=0;
  const dateKey=x=>{const d=new Date(x);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function save(label){return app.saveState({source:`kotoba-dungeon-${label}`,suppressUiRefresh:true});}
  function state(){const root=app.getState();root.integrations||={};let s=root.integrations.kotobaDungeon;if(!s||typeof s!=='object'||Array.isArray(s)){s=root.integrations.kotobaDungeon={schemaVersion:1,enabled:true,baselineAt:(()=>{const first=readOutbox().filter(valid).map(e=>Date.parse(e.at)).sort((a,b)=>a-b)[0];return first?first-1:Date.now();})(),processed:{},imported:0,energyCarry:0};save('baseline');}if(!s.processed||typeof s.processed!=='object'||Array.isArray(s.processed))s.processed={};s.energyCarry=Number(s.energyCarry)||0;return s;}
  function readOutbox(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v?.schemaVersion===1&&Array.isArray(v.events)?v.events:[];}catch(_){return[];}}
  function valid(x){if(!x||x.schemaVersion!==1||typeof x.id!=='string'||!/^kd-[\w-]{8,}:floor[1-4]$/.test(x.id)||typeof x.runId!=='string'||!x.id.startsWith(`${x.runId}:floor`))return false;const t=Date.parse(x.at);if(!Number.isFinite(t)||t>Date.now()+60000||Date.now()-t>90*86400000)return false;const floor=Number(x.floor);if(!Number.isInteger(floor)||floor<1||floor>4||x.id!==`${x.runId}:floor${floor}`||x.kind!==(floor===4?'boss':'enemy'))return false;const hits=Number(x.hits),attempts=Number(x.attempts);return Number.isInteger(hits)&&Number.isInteger(attempts)&&hits>=1&&attempts>=hits&&attempts<=250&&hits<=60&&['known','guru','starter'].includes(x.source)&&['normal','timed'].includes(x.mode);}
  function events(){return app.getState().rewardLedger?.events||[];}
  function dailyCount(at){const key=dateKey(at);return events().filter(e=>e.source===SOURCE&&!e.duplicate&&dateKey(e.at)===key).length;}
  function amount(x,count){const boss=x.kind==='boss';const scale=1/Math.sqrt(1+count/5);const skill=.4+.6*(x.hits/x.attempts);const starter=x.source==='starter'?.25:1;const timed=boss&&x.mode==='timed'?1.22:1;const multiplier=scale*skill*starter*timed;const xp=Math.max(1,Math.round((boss?16:6)*multiplier)),coins=Math.max(1,Math.round((boss?10:4)*multiplier));const energy=(boss?.16:.055)*multiplier;return{xp,coins,energy,multiplier,dayIndex:count+1};}
  function importEvents(receipts,{notify=true,manual=false}={}){
    if(busy)return{imported:0,pending:0};busy=true;
    let awarded=0,skipped=0;const s=state();
    try{
      if(!s.enabled)return{imported:0,pending:receipts.length,disabled:true};
      for(const r of receipts.slice(0,2400)){
        if(!valid(r)){skipped++;continue;}
        const at=Date.parse(r.at);
        if(!manual&&at<Number(s.baselineAt||Date.now())){skipped++;continue;}
        if(s.processed[r.id]||events().some(e=>e.source===SOURCE&&e.sourceId===r.id&&!e.duplicate)){s.processed[r.id]||=r.at;continue;}
        const amountData=amount(r,dailyCount(r.at));
        const raw=amountData.energy+s.energyCarry;
        // Life RPG has its own existing story-energy taper (minimum factor 0.12).
        // Accumulate raw fractional energy until it can actually yield at least 0.01.
        const existingEnergy=events().filter(e=>dateKey(e.at)===dateKey(r.at)).reduce((n,e)=>n+Math.max(0,Number(e.storyEnergy)||0),0);
        const globalFactor=existingEnergy<4?1:existingEnergy<8?.72:existingEnergy<12?.42:.12;
        const minimumRaw=Math.ceil(1/globalFactor)/100;
        const energy=raw+1e-8>=minimumRaw?Math.floor((raw+1e-8)*100)/100:0;
        const carry=Math.max(0,raw-energy);
        const result=app.awardActivity({source:SOURCE,sourceId:r.id,label:r.kind==='boss'?'Kotoba Dungeon · Boss besiegt':'Kotoba Dungeon · Monster besiegt',realm:'Japanese',capability:'japanese',xp:amountData.xp,realmXP:amountData.xp,statXP:Math.max(1,Math.round(amountData.xp*.7)),coins:amountData.coins,storyEnergyBase:round2(energy),progressionRelevant:true,at:r.at,metadata:{dungeonRunId:r.runId,dungeonFloor:r.floor,dungeonMode:r.mode,dungeonDeck:r.source,dungeonHits:r.hits,dungeonAttempts:r.attempts,dungeonTaper:Number(amountData.multiplier.toFixed(4)),dungeonDailyIndex:amountData.dayIndex}});
        if(result?.eventId){s.energyCarry=carry;s.processed[r.id]=r.at;s.imported=(Number(s.imported)||0)+1;awarded++;if(!save('reward')){s.lastError='Die Belohnung wurde im Speicher nicht gesichert. Bitte Save exportieren und die Seite nicht neu laden.';break;}}
      }
      // Keep stable fingerprints even after the standard 3,000-ledger-event compaction.
      const keys=Object.keys(s.processed);if(keys.length>12000)for(const key of keys.slice(0,keys.length-12000))delete s.processed[key];
      if(awarded&&notify){app.showToast?.(`⚔ ${awarded} Dungeon-Sieg${awarded===1?'':'e'} in Life RPG belohnt.`);app.renderAll?.();}
      return{imported:awarded,skipped};
    }finally{busy=false;render();}
  }
  function link(){const url=new URL(DUNGEON);url.searchParams.set('lifeOrigin',location.origin);return url.href;}
  function inject(){const panel=document.getElementById('trainingGroundsPanel')||document.getElementById('kotobaIntegrationPanel');if(!panel)return;
    if(!document.getElementById('lifeRpgDungeonPanel')){
      const box=document.createElement('section');box.id='lifeRpgDungeonPanel';box.style.cssText='display:grid;gap:10px;padding:17px;margin:15px 0 0;background:linear-gradient(125deg,#f8edf9,#fff6f0);border:1px solid #e4cbdf;border-radius:17px';
      box.innerHTML='<div><p class="eyebrow">JAPANESE · LITTLE DUNGEON</p><h3 style="margin:4px 0">⚔ Dungeon-Belohnungen</h3><p style="margin:5px 0">Normale Gegner und Bosse bringen eigene Dungeon-Belohnungen in Life RPG. Kein hartes Dungeon-Tagescap, sondern sanft sinkende Erträge.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><a id="lifeRpgDungeonOpen" class="primary-button" target="_blank" rel="noopener" href="#">Dungeon öffnen ↗</a><button id="lifeRpgDungeonSync" type="button" class="secondary-button">Siege synchronisieren</button></div><label style="display:flex;align-items:center;gap:7px"><input id="lifeRpgDungeonEnabled" type="checkbox" checked><span>Dungeon-Belohnungen aktiv</span></label><label style="display:grid;gap:4px"><span id="lifeRpgDungeonImportHint">Siegesbelege als JSON importieren (optional, wenn beide Apps dieselbe Domain verwenden).</span><input id="lifeRpgDungeonImport" type="file" accept=".json,application/json" aria-label="Dungeon-Siegesbelege importieren"></label><small id="lifeRpgDungeonStatus" aria-live="polite"></small>';
      const entranceGrid=panel.querySelector?.('.training-grounds-grid-v314k');
      if(entranceGrid)entranceGrid.insertAdjacentElement('afterend',box);
      else panel.appendChild(box);
      document.getElementById('lifeRpgDungeonOpen').href=link();
      document.getElementById('lifeRpgDungeonSync').addEventListener('click',()=>importEvents(readOutbox()));
      document.getElementById('lifeRpgDungeonEnabled').addEventListener('change',e=>{state().enabled=e.target.checked;save('setting');if(e.target.checked)importEvents(readOutbox());else render();});
      document.getElementById('lifeRpgDungeonImport').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1200000)throw Error('Zu große Datei.');const obj=JSON.parse(await file.text());if(obj?.type!=='kotoba-dungeon-receipts-v1'||obj.schemaVersion!==1||!Array.isArray(obj.events))throw Error('Kein gültiger Dungeon-Siegesexport.');const r=importEvents(obj.events,{manual:true});app.showToast?.(`${r.imported} neue Dungeon-Siege übernommen.`);}catch(err){app.showToast?.(String(err.message||err));}finally{e.target.value='';}});
    }
    const grid=document.querySelector('#trainingGroundsPanel .training-grounds-grid-v314k');
    if(grid&&!document.getElementById('lifeRpgDungeonTrainingLink')){
      const a=document.createElement('a');a.id='lifeRpgDungeonTrainingLink';a.className='training-card-v314k is-live';a.target='_blank';a.rel='noopener';a.href=link();a.innerHTML='<span class="training-card-icon-v314k">⚔</span><div><small>JAPANESE · REPEATABLE</small><strong>Little Dungeon</strong><p>Japanisch üben, Monster besiegen und Siege in Life RPG einlösen.</p><em>Dungeon öffnen ↗</em></div><b>↗</b>';grid.appendChild(a);
    }
    const linkEl=document.getElementById('lifeRpgDungeonTrainingLink');if(linkEl)linkEl.href=link();
    const japanese=document.getElementById('kotobaIntegrationPanel');
    if(japanese&&!document.getElementById('lifeRpgDungeonJapaneseEntry')){
      const a=document.createElement('a');a.id='lifeRpgDungeonJapaneseEntry';a.href=link();a.target='_blank';a.rel='noopener';a.className='primary-button';a.style.cssText='display:inline-flex;align-items:center;justify-content:center;margin:10px 0;padding:11px 15px;text-decoration:none';a.textContent='⚔ Little Dungeon öffnen ↗';japanese.appendChild(a);
    }
  }
  function render(){inject();const el=document.getElementById('lifeRpgDungeonStatus');if(!el)return;const s=state();const pending=readOutbox().filter(x=>valid(x)&&Date.parse(x.at)>=s.baselineAt&&!s.processed[x.id]).length;const crossOrigin=new URL(DUNGEON).origin!==location.origin;const hint=document.getElementById('lifeRpgDungeonImportHint');if(hint)hint.textContent=crossOrigin?'Verschiedene Domains: Im Dungeon-Camp Siegesbelege als JSON exportieren und hier importieren. Du darfst denselben Export mehrfach einlesen; jeder Sieg wird nur einmal belohnt.':'Gleiche Domain: Siege werden automatisch übergeben. Ein JSON-Export ist nur als zusätzliche Sicherung nötig.';el.textContent=`${s.imported||0} Siege belohnt · ${pending} wartend · ${s.enabled?'Aktiv':'Pausiert'}${crossOrigin?' · Verschiedene Domains: Siegesexport importieren':''}${s.lastError?' · '+s.lastError:''}. Die normalen Kotoba-Review-Grenzen bleiben separat.`;const checkbox=document.getElementById('lifeRpgDungeonEnabled');if(checkbox)checkbox.checked=Boolean(s.enabled);}
  function sync(){const s=state();if(s.enabled)importEvents(readOutbox(),{notify:true});else render();}
  let queued=false;function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;sync();},240);}
  window.addEventListener('storage',e=>{if(e.key===KEY)schedule();});
  try{const ch=new BroadcastChannel('life-rpg-kotoba-dungeon-v1');ch.addEventListener('message',e=>{if(e.data?.type==='receipt-ready')schedule();});}catch(_){}
  window.addEventListener('focus',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  window.addEventListener('life-rpg:render',render);
  window.addEventListener('message',e=>{if(e.origin!==new URL(DUNGEON).origin||e.data?.type!=='kotoba-dungeon-receipt-v1')return;importEvents([e.data.event]);});
  state();inject();sync();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});
  window.addEventListener('load',inject,{once:true});
  window.LifeRPGKotobaDungeonBridge={version:2,importEvents,sync,state,amount,valid,link};
})();
