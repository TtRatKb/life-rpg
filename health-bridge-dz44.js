/* Life RPG DZ44 — Apple Health daily bridge (read-only health import, isolated from RPG save).
 * Transport: iOS Shortcuts opens https://<life-rpg>/#lr-health=YYYY-MM-DD;steps=1234;activeKcal=245
 * Never accept a URL token, credentials, narrative data, or large/unbounded payloads.
 * No automatic XP/rewards: imported aggregate numbers cannot safely prove a unique workout.
 */
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore, doc, collection, query, orderBy, limit, getDocs, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBFW-vUovZVkqTrxz-6UgZbSkH3eHjK-Ns',
  authDomain: 'life-rpg-3afb7.firebaseapp.com',
  projectId: 'life-rpg-3afb7',
  storageBucket: 'life-rpg-3afb7.firebasestorage.app',
  messagingSenderId: '88670369654',
  appId: '1:88670369654:web:864bc94bbb5f25d073ec57'
};
const FB = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(FB), firestore = getFirestore(FB);
const DB_NAME = 'life-rpg-health-days-v1';
const DB_STORE = 'days';
const METRICS = {
  steps: { max: 100000, decimals: 0 },
  activeKcal: { max: 12000, decimals: 1 },
  exerciseMin: { max: 1440, decimals: 0 },
  standHours: { max: 24, decimals: 0 }
};
const NUTRIENTS = {
  proteinG: 500, carbsG: 1500, fatG: 500, fiberG: 200,
  waterMl: 15000, caloriesKcal: 15000, vitaminCMg: 5000, vitaminDUg: 1000,
  workoutMin: 1440
};
const core = window.LifeRPGHealthImportCore;
if(!core)throw new Error('Health-Import-Prüfung nicht geladen. Bitte Life RPG neu öffnen.');
const input = document.getElementById('healthImportJson');
let user = null, dbPromise = null, online = navigator.onLine, activeDate = localISODate();
let days = new Map(), pendingPayload = null, busy = false;
const $ = id => document.getElementById(id);
const text = (id, value) => { const el=$(id); if(el) el.textContent=value; };
const fmt = (v, unit='') => v == null ? '—' : `${new Intl.NumberFormat('de-DE',{ maximumFractionDigits:1 }).format(v)}${unit}`;

function localISODate(date = new Date()) {
  // Shortcut and date navigation use the user's *local* calendar date.
  const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function validDate(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y,m,d]=value.split('-').map(Number);
  const dt=new Date(y,m-1,d,12);
  if(dt.getFullYear()!==y || dt.getMonth()!==m-1 || dt.getDate()!==d) return false;
  const today=new Date(); today.setHours(12,0,0,0);
  return dt.getTime()>=today.getTime()-92*86400000 && dt.getTime()<=today.getTime()+86400000;
}
function cleanNumber(value,max,decimals) {
  if(value===undefined || value===null || value==='') return null;
  const n=Number(String(value).trim().replace(',','.'));
  if(!Number.isFinite(n)||n<0||n>max) throw new Error('Ungültiger Zahlenwert oder Einheit.');
  return Number(n.toFixed(decimals));
}
function parseShortcutFragment(hash) {
  if(!hash.startsWith('#lr-health=')) return null;
  const fragment=hash.slice('#lr-health='.length);
  if(fragment.length>1200) throw new Error('Health-Link ist zu lang.');
  const value=decodeURIComponent(fragment);
  const [date, ...parts]=value.split(';');
  if(!validDate(date)) throw new Error('Ungültiges Tagesdatum im Health-Link.');
  if(!parts.length) throw new Error('Keine Health-Werte im Link.');
  const record={ date, imported:{}, nutrition:{}, source:'Apple Health / Kurzbefehle', updatedAt:Date.now(), pending:true };
  for(const item of parts) {
    const eq=item.indexOf('=');
    if(eq<=0) throw new Error('Ungültiges Feld im Health-Link.');
    const key=item.slice(0,eq), raw=item.slice(eq+1);
    if(Object.hasOwn(METRICS,key)) {
      if(Object.hasOwn(record.imported,key)) throw new Error('Doppeltes Health-Feld.');
      const number=cleanNumber(raw,METRICS[key].max,METRICS[key].decimals);
      if(number!==null)record.imported[key]=number;
    } else if(Object.hasOwn(NUTRIENTS,key) && key!=='workoutMin') {
      if(Object.hasOwn(record.nutrition,key)) throw new Error('Doppeltes Health-Feld.');
      const number=cleanNumber(raw,NUTRIENTS[key],1);
      if(number!==null)record.nutrition[key]=number;
    } else throw new Error(`Unbekanntes Health-Feld: ${key}`);
  }
  if(!Object.keys(record.imported).length&&!Object.keys(record.nutrition).length) throw new Error('Keine gültigen Health-Werte.');
  return record;
}
function setStatus(message,level='info') { const el=$('healthBridgeStatus'); if(el){el.textContent=message;el.dataset.level=level;} }
function openDB() {
  if(!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB ist nicht verfügbar.'));
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE,{keyPath:'id'}); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Health-Speicher konnte nicht geöffnet werden.'));
  });
  return dbPromise;
}
async function listLocal(account) {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readonly'), req=tx.objectStore(DB_STORE).getAll();
    req.onsuccess=()=>resolve((req.result||[]).filter(row=>row.id?.startsWith(account+':')));req.onerror=()=>reject(req.error);
  });
}
async function putLocal(record) {
  const account=user?.uid;
  if(!account) throw new Error('Google-Anmeldung erforderlich.');
  const db=await openDB();
  if(user?.uid!==account) throw new Error('Google-Konto hat sich geändert.');
  record={...record,id:`${account}:${record.date}`};
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(record);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Konnte Health-Wert nicht speichern.'));
  });
}
async function refreshLocal() {
  const account=user?.uid;if(!account)return;
  const records=await listLocal(account);
  if(user?.uid!==account)return;
  days=new Map(records.map(record=>[record.date,record]));
  render();
}
// One IndexedDB transaction for the entire import: a storage failure must not
// leave an apparently completed but partially imported set of days.
async function putLocalBatch(records) {
  if(!records.length)return;
  const account=user?.uid;
  if(!account)throw new Error('Bitte zuerst mit Google anmelden.');
  const db=await openDB();
  if(user?.uid!==account)throw new Error('Google-Konto hat sich während des Imports geändert.');
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readwrite'),store=tx.objectStore(DB_STORE);
    for(const record of records)store.put({...record,id:`${account}:${record.date}`});
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error('Health-Sammelimport konnte nicht gespeichert werden.'));
    tx.onabort=()=>reject(tx.error||new Error('Health-Sammelimport abgebrochen; bestehende Daten bleiben erhalten.'));
  });
}
async function mergeBatch(records) {
  if(!user)throw new Error('Bitte zuerst mit Google anmelden.');
  const staged=new Map(),stamp=Date.now();
  for(const record of records){
    const prev=staged.get(record.date)||days.get(record.date);
    const merged=core.mergeDay(prev,record,stamp);
    if(merged.changed)staged.set(record.date,merged.record);
  }
  const updates=[...staged.values()];
  await putLocalBatch(updates);
  // Only publish the staged values to UI after the entire IndexedDB
  // transaction has committed successfully.
  for(const row of updates)days.set(row.date,row);
  if(records.length){
    activeDate=records.map(x=>x.date).sort().at(-1);
    const form=$('healthNutritionForm');if(form)form.dataset.date='';
  }
  render();
  const duplicates=records.length-updates.length;
  setStatus(`${updates.length} Tag(e) übernommen${duplicates?` · ${duplicates} unverändert`:''}. ${updates.length?(online?'Cloud-Abgleich läuft im Hintergrund.':'Offline: lokal gespeichert, Cloud-Abgleich ausstehend.'):'Keine zusätzlichen Daten nötig.'}`,'success');
  window.LifeRPGApp?.showView?.('healthsync');
  if(updates.length)void syncPending();
  return {saved:updates.length,unchanged:duplicates};
}
async function mergeIncoming(record) {
  return mergeBatch([record]);
}
async function handleHash() {
  const hash=window.location.hash;
  if(!hash.startsWith('#lr-health=')) return;
  // Remove health values from browser history immediately, before any network request.
  try { history.replaceState(history.state,'',location.pathname+location.search); }
  catch(e){ /* Never send hash to Firebase or log it. */ }
  try {
    pendingPayload=parseShortcutFragment(hash);
    window.LifeRPGApp?.showView?.('healthsync');
    if(user){await mergeIncoming(pendingPayload);pendingPayload=null;}
    else setStatus('Health-Link erkannt. Bitte erst mit Google anmelden – dann wird importiert.','info');
  } catch(error){setStatus(`Health-Import nicht übernommen: ${error.message}`,'error');}
}
function docRef(date,account){return doc(firestore,'users',account,'healthDays',date);}
async function syncPending(){
  if(!user || !online || busy) return;
  busy=true;
  const account=user.uid;
  try {
    const pending=[...days.values()].filter(x=>x.pending).sort((a,b)=>a.date.localeCompare(b.date));
    for(const row of pending){
      if(user?.uid!==account||!online) break;
      const ref=docRef(row.date,account);
      const remoteSnap=await getDoc(ref);
      if(user?.uid!==account)break;
      const remote=remoteSnap.exists()?remoteSnap.data():null;
      if(remote && Number(remote.updatedAt||0)>Number(row.updatedAt||0)) {
        const merged={...remote, date:row.date, pending:false};
        await putLocal(merged);days.set(row.date,merged);
        continue;
      }
      const payload={date:row.date, updatedAt:row.updatedAt, origin:row.source||'Life RPG', savedAt:serverTimestamp()};
      if(row.imported && Object.keys(row.imported).length)payload.imported=row.imported;
      if(row.nutrition && Object.keys(row.nutrition).length)payload.nutrition=row.nutrition;
      if(row.wellbeing && Object.keys(row.wellbeing).length)payload.wellbeing=row.wellbeing;
      await setDoc(ref,payload,{merge:true});
      if(user?.uid!==account)break;
      const fresh=days.get(row.date);
      // Never clear the flag if a newer local edit happened during the upload.
      if(fresh && fresh.updatedAt===row.updatedAt){const done={...fresh,nutrition:{...remote?.nutrition,...fresh.nutrition},imported:{...remote?.imported,...fresh.imported},wellbeing:{...remote?.wellbeing,...fresh.wellbeing},pending:false};await putLocal(done);days.set(row.date,done);}
    }
    setStatus('Health-Tageswerte mit deinem Google-Konto synchronisiert.','success');render();
  } catch(error) {
    console.warn('Health sync deferred:',error.code||error.name);
    setStatus('Lokal sicher · Health-Cloud-Sync ausstehend. Google-Verbindung prüfen.','error');
  } finally {busy=false;if(user&&online&&[...days.values()].some(x=>x.pending)){
    // A new edit during an upload is retried on focus or the next import,
    // never an unbounded tight loop during connection failures.
  }}
}
async function pullCloud(){
  if(!user||!online)return;
  const account=user.uid;
  try {
    const snap=await getDocs(query(collection(firestore,'users',account,'healthDays'),orderBy('date','desc'),limit(45)));
    if(user?.uid!==account)return;
    for(const item of snap.docs){
      const cloud=item.data();if(!validDate(item.id))continue;
      const local=days.get(item.id);
      if(local?.pending)continue;
      if(!local || Number(cloud.updatedAt||0)>Number(local.updatedAt||0)) {
        const next={...cloud,date:item.id,pending:false};
        await putLocal(next);days.set(item.id,next);
      }
    }
    render();
  } catch(e){console.warn('Health cloud read deferred:',e.code||e.name);}
}
function render() {
  const row=days.get(activeDate)||{};
  text('healthSelectedDate',new Date(`${activeDate}T12:00:00`).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'}));
  for(const [key,id,unit] of [['steps','healthSteps',''],['activeKcal','healthActiveKcal',' kcal'],['exerciseMin','healthExerciseMin',' min'],['standHours','healthStandHours',' h']])text(id,fmt(row.imported?.[key],unit));
  const well=row.wellbeing||{};
  text('healthSleep',fmt(row.imported?.sleepMinutes,' min'));
  text('healthPeriod',well.periodActive===true?'Eingetragen':well.periodActive===false?'Nicht eingetragen':'—');
  text('healthCramps',({none:'Keine',mild:'Leicht',moderate:'Mittel',strong:'Stark'})[well.periodCramps]||'—');
  text('healthMood',({very_low:'Sehr unangenehm',low:'Unangenehm',neutral:'Neutral',good:'Angenehm',very_good:'Sehr angenehm'})[well.mood]||'—');
  const n=row.nutrition||{};
  for(const [key,id,unit] of [['proteinG','healthProtein',' g'],['waterMl','healthWater',' ml'],['caloriesKcal','healthCalories',' kcal'],['workoutMin','healthWorkout',' min']])text(id,fmt(n[key],unit));
  const has=Boolean((row.imported && Object.keys(row.imported).length)||(row.nutrition && Object.keys(row.nutrition).length)||(row.wellbeing && Object.keys(row.wellbeing).length));
  text('healthTodaySource',has?`Apple Health · ${row.pending?'nur lokal / Sync ausstehend':'synchronisiert'}`:'Noch kein Apple-Health-Import für diesen Tag');
  const form=$('healthNutritionForm');
  if(form && form.dataset.date!==activeDate){
    form.dataset.date=activeDate;
    for(const key of Object.keys(NUTRIENTS)){const field=form.elements.namedItem(key);if(field)field.value=n[key]??'';}
  }
  const seven=[];const base=new Date(`${activeDate}T12:00:00`);
  for(let i=6;i>=0;i--){const d=new Date(base);d.setDate(d.getDate()-i);const iso=localISODate(d);const s=days.get(iso)?.imported?.steps;seven.push({day:d.toLocaleDateString('de-DE',{weekday:'short'}),steps:s});}
  const max=Math.max(1,...seven.map(x=>x.steps||0));
  const strip=$('healthWeekSteps');
  if(strip){strip.replaceChildren(...seven.map(x=>{
    const col=document.createElement('div');col.className='health-week-day';
    const bar=document.createElement('div');bar.className='health-week-bar';bar.style.height=(x.steps==null?0:Math.max(4,(x.steps/max)*82))+'px';bar.title=x.steps==null?'Keine Daten':`${fmt(x.steps)} Schritte`;
    const label=document.createElement('small');label.textContent=x.day;
    col.append(bar,label);return col;
  }));}
}
async function saveNutrition(event){
  event.preventDefault();
  if(!user){setStatus('Bitte erst mit Google anmelden, damit private Health-Daten sicher zugeordnet werden.','error');return;}
  const form=$('healthNutritionForm');const n={};
  try {
    for(const [key,max] of Object.entries(NUTRIENTS)){
      const raw=form.elements.namedItem(key)?.value??'';
      const clean=cleanNumber(raw,max,1);if(clean!==null)n[key]=clean;
    }
  }catch(e){setStatus(e.message,'error');return;}
  const prev=days.get(activeDate)||{date:activeDate,imported:{}};
  const row={...prev,date:activeDate,nutrition:n,source:prev.source||'Life RPG · manuell',updatedAt:Date.now(),pending:true};
  try {await putLocal(row);days.set(activeDate,row);render();setStatus('Ernährung/Workout lokal gespeichert · Cloud-Abgleich läuft …');void syncPending();}
  catch(e){setStatus(`Speichern fehlgeschlagen: ${e.message}`,'error');}
}
function shiftDate(delta){const d=new Date(`${activeDate}T12:00:00`);d.setDate(d.getDate()+delta);if(validDate(localISODate(d))){activeDate=localISODate(d);$('healthNutritionForm').dataset.date='';render();}}
// Batch files and pasted Shortcut JSON use exactly the same validated path.
async function importJSONText(raw){
  if(!user)throw new Error('Bitte zuerst mit Google anmelden.');
  const allowWellbeing=Boolean($('healthWellbeingConsent')?.checked);
  const parsed=core.parseBatch(raw,{allowWellbeing});
  const result=await mergeBatch(parsed.records);
  if($('healthWellbeingConsent'))$('healthWellbeingConsent').checked=false;
  return result;
}
async function importJSONFile(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>60000)throw new Error('Datei zu groß (maximal 60 KB).');
    await importJSONText(await file.text());
  }catch(e){setStatus('Import fehlgeschlagen: '+e.message,'error');}
  finally{event.target.value='';}
}
async function importPastedJSON(){
  const field=$('healthBatchPaste');
  if(!field)return;
  try{
    await importJSONText(field.value);
    field.value=''; // do not leave sensitive copied text unnecessarily in the page
  }catch(e){setStatus('Import fehlgeschlagen: '+e.message,'error');}
}
function bind(){
  $('healthPrevDay')?.addEventListener('click',()=>shiftDate(-1));
  $('healthNextDay')?.addEventListener('click',()=>shiftDate(1));
  $('healthNutritionForm')?.addEventListener('submit',saveNutrition);
  $('healthImportJson')?.addEventListener('change',importJSONFile);
  $('healthBatchImport')?.addEventListener('click',()=>void importPastedJSON());
  $('healthCopyPrefix')?.addEventListener('click',async()=>{const prefix=location.origin+location.pathname+'#lr-health=';try{await navigator.clipboard.writeText(prefix);setStatus('Import-Link-Anfang kopiert. Im Kurzbefehl Datum und Health-Werte ergänzen.','success');}catch(e){window.prompt('Import-Link-Anfang für Kurzbefehle',prefix);}});
  $('healthRefresh')?.addEventListener('click',async()=>{await syncPending();await pullCloud();});
  window.addEventListener('hashchange',()=>void handleHash());
  window.addEventListener('online',()=>{online=true;void syncPending();void pullCloud();});
  window.addEventListener('offline',()=>{online=false;setStatus('Offline · Health-Daten bleiben lokal.');});
  window.addEventListener('focus',()=>{void syncPending();if(user)void pullCloud();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user){void syncPending();void pullCloud();}});
  window.addEventListener('life-rpg:view-changed',ev=>{if(ev.detail?.view==='healthsync'){render();if(user)void pullCloud();}});
}
async function start(){
  bind();
  // Clear private URL payload before Firebase/auth networking begins.
  await handleHash();
  onAuthStateChanged(auth,async next=>{
    user=next||null;
    days=new Map();render();
    if(!user){setStatus(pendingPayload?'Health-Link wartet auf Google-Anmeldung.':'Für dein privates Health Journal mit Google anmelden.');return;}
    try {await refreshLocal();}catch(e){setStatus('Lokaler Health-Speicher nicht verfügbar.','error');return;}
    if(pendingPayload){
      const payload=pendingPayload;pendingPayload=null;
      try{await mergeIncoming(payload);}catch(e){pendingPayload=payload;setStatus('Health-Import fehlgeschlagen. Bitte erneut versuchen.','error');}
    }
    await syncPending();await pullCloud();
  });
}
if($('view-healthsync'))void start();
