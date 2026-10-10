/* Life RPG DZ24: private Firestore completion inbox; never touches cloud-save documents. */
import {getApp,getApps,initializeApp} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {getFirestore,collection,getDocs,query,orderBy,limit,startAfter,where,Timestamp} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const config={apiKey:"AIzaSyBFW-vUovZVkqTrxz-6UgZbSkH3eHjK-Ns",authDomain:"life-rpg-3afb7.firebaseapp.com",projectId:"life-rpg-3afb7",storageBucket:"life-rpg-3afb7.firebasestorage.app",messagingSenderId:"88670369654",appId:"1:88670369654:web:864bc94bbb5f25d073ec57"};
const firebase=getApps().length?getApp():initializeApp(config);
const auth=getAuth(firebase),db=getFirestore(firebase);
let user=null,working=false,lastError="",total=0,lastSuccess="";
function safeToIngest(){const c=window.LifeRPGCloudStatus?.snapshot?.();return !!user && c?.uid===user.uid && c?.ready===true;}
function showStatus(){
  const el=document.querySelector("[data-school-cloud-status]");
  if(!el)return;
  el.textContent=!user?"Cloud: Nicht bei Google angemeldet.":!safeToIngest()?"Cloud: Wartet auf abgeschlossenen Life-RPG-Cloud-Abgleich (oder Entscheidung bei Save-Konflikt).":lastError?`Cloud: ${lastError}`:`Cloud: ${lastSuccess||"Bereit — privater Schulcockpit-Abgleich."}`;
}
async function sync(){
  if(working || !safeToIngest() || !navigator.onLine){showStatus();return 0;}
  working=true;let count=0;
  try{
    let last=null;
    const root=window.LifeRPGApp?.getState?.();
    const cursor=Math.max(0, Number(root?.schoolBridgeV1?.cloudCursorMs||0));
    // Look back five minutes to make handovers and same-time events idempotent.
    const threshold=Timestamp.fromMillis(Math.max(0,cursor-300000));
    let latest=cursor;
    do {
      if(!safeToIngest())break;
      const ref=collection(db,"users",user.uid,"schoolEvents");
      const parts=[where("uploadedAt",">=",threshold),orderBy("uploadedAt"),limit(100)];if(last)parts.push(startAfter(last));
      const result=await getDocs(query(ref,...parts));
      if(result.empty)break;
      const events=result.docs.map(s=>s.data());
      for(const e of events){
        if(e.uploadedAt?.toMillis)latest=Math.max(latest,e.uploadedAt.toMillis());
      }
      const added=window.LifeRPGWorkBridge?.ingest?.(events) || 0;
      count+=added;
      last=result.docs[result.docs.length-1];
      if(result.size<100)break;
    }while(true);
    // Save the cursor in the canonical state together with the receipts, never
    // in a separate browser-only key that could advance ahead of Cloud Save.
    // An initially empty inbox still gets a conservative 5-minute window.
    if(root && latest>cursor){
      root.schoolBridgeV1 ||= {schemaVersion:1,receipts:{}};
      root.schoolBridgeV1.cloudCursorMs=latest;
      if(window.LifeRPGApp.saveState({source:"schulcockpit-cloud-cursor",suppressUiRefresh:true})===false)
        throw Error("Fortschrittsmarker konnte nicht gespeichert werden.");
    }
    total+=count;lastError="";lastSuccess=`${new Date().toLocaleTimeString("de-DE")} · ${count} neue Abschlüsse.`;
    if(count)window.LifeRPGApp?.showToast?.(`${count} Schulcockpit-Abschlüsse synchronisiert.`);
    showStatus();return count;
  }catch(err){lastError=(err.code === "permission-denied"?"Zugriff durch Firestore-Regeln nicht erlaubt.":String(err?.code||err?.message||err));showStatus();throw err;}
  finally{working=false;}
}
onAuthStateChanged(auth, u => {user=u;lastError="";showStatus();if(u)sync().catch(()=>{});});
window.addEventListener("focus",()=>sync().catch(()=>{}));
window.addEventListener("online",()=>sync().catch(()=>{}));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync().catch(()=>{});});
// Read only while the Life RPG app is actually open and the cloud-save is settled.
setInterval(()=>{if(!document.hidden)sync().catch(()=>{});},180000);
// Cloud reconciliation can take several seconds after login. Retry readiness in a bounded start window.
let warmups=0;const warmup=setInterval(()=>{if(safeToIngest()) {clearInterval(warmup);sync().catch(()=>{});}else if(++warmups>=30)clearInterval(warmup);},2000);
window.LifeRPGWorkCloud={sync,showStatus,status:()=>({user:!!user,ready:safeToIngest(),lastError,total})};
