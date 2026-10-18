/* Life RPG · Realm Skillpoint Exchange V1
   Two spendable points from one Realm become one in another.
   No new currency or XP; transactions are irrevocable and saved to the
   same canonical local/cloud Life RPG state as Talent purchases. */
(() => {
  "use strict";
  const app=window.LifeRPGApp,skills=window.LifeRPGSkills;
  if(!app?.getState||!app?.saveState||!skills?.getRealmPoints||window.LifeRPGPointExchange)return;
  const VERSION="0.31.4-exchange1";
  const REALMS=["Work","Knowledge","Japanese","Health","Recovery","Home","Hobbies"];
  const LABELS={Work:"💼 Work",Knowledge:"🧩 Knowledge",Japanese:"🌸 Japanese",
    Health:"🌿 Health",Recovery:"🌙 Recovery",Home:"🏠 Home",Hobbies:"🎨 Hobbies"};
  let root=null,busy=false;
  const $=id=>document.getElementById(id);
  const options=REALMS.map(realm=>'<option value="'+realm+'">'+LABELS[realm]+'</option>').join("");
  const valid=realm=>REALMS.includes(realm);
  function ledger(){
    const state=app.getState();
    const value=state.pointExchangeV1;
    return value&&typeof value==="object"&&!Array.isArray(value)&&
      Array.isArray(value.transactions)?value.transactions:[];
  }
  function refresh(){
    if(!root?.isConnected)return;
    const source=$("pointExchangeSource"),dest=$("pointExchangeTarget"),button=$("pointExchangeSubmit"),
      status=$("pointExchangeBalance");
    if(!source||!dest||!button||!status)return;
    const from=source.value,to=dest.value;
    const balance=valid(from)?skills.getRealmPoints(from).available:0;
    const targetBalance=valid(to)?skills.getRealmPoints(to).available:0;
    const allowed=valid(from)&&valid(to)&&from!==to&&balance>=2&&!busy&&!app.hasPendingLocalSave?.();
    button.disabled=!allowed;
    const reason=from===to?"Choose two different Realms."
      :balance<2?"Earn at least 2 available points in the sending Realm."
      :app.hasPendingLocalSave?.()?"Save your current progress before exchanging.":"Ready to exchange.";
    status.textContent=from+" has "+balance+" available · "+to+" has "+targetBalance+" available. "+reason;
    const history=$("pointExchangeHistory");
    if(history){
      const rows=ledger().slice(-3).reverse();
      history.textContent=rows.length?"Recent exchanges: "+rows.map(x=>x.from+" → "+x.to+" (2:1)").join(" · "):
        "No exchanges yet.";
    }
  }
  function exchange(from,to,{confirmed=false}={}){
    if(busy||!valid(from)||!valid(to)||from===to||app.hasPendingLocalSave?.())return false;
    // Require a freshly-derived balance, including *all* Talent purchases and
    // prior exchanges. Two quick clicks cannot overdraw the source Realm.
    const points=skills.getRealmPoints(from);
    if(!Number.isFinite(points.available)||points.available<2)return false;
    if(!confirmed){
      if(!window.confirm("Spend 2 "+from+" points to permanently receive 1 "+to+
        " point?\n\nThis exchange cannot be undone. Your Talent purchases, Skill XP and Realm ranks stay unchanged."))return false;
    }
    busy=true;
    try{
      const state=app.getState();
      const previous=state.pointExchangeV1;
      const transactions=ledger();
      const id="realm-exchange-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12);
      state.pointExchangeV1={
        schemaVersion:1,
        transactions:[...transactions,{id,from,to,fromCost:2,toCredit:1,at:new Date().toISOString()}]
      };
      if(app.saveState({source:"realm-skillpoint-exchange",suppressUiRefresh:true})===false){
        if(previous===undefined)delete state.pointExchangeV1;
        else state.pointExchangeV1=previous;
        app.showToast?.("Exchange not saved. Your points have not changed.");
        return false;
      }
      skills.refresh?.();
      app.renderAll?.();
      app.showToast?.("✦ Exchanged 2 "+from+" points for 1 "+to+" point.");
      return true;
    }finally{busy=false;refresh();}
  }
  function mount(){
    if(root?.isConnected)return;
    const hub=$("skillsTalentHub");
    const head=hub?.querySelector(".skills-talent-hub-head-v314ag");
    if(!hub||!head)return;
    root=document.createElement("details");
    root.id="pointExchangePanel";
    root.className="point-exchange-v1";
    root.innerHTML=
      '<summary><span>↔️</span><div><strong>Skillpoint Exchange · 2:1</strong>'+
      '<small>Turn surplus points from one Realm into a point for another. No new currency.</small></div></summary>'+
      '<div class="point-exchange-body"><div class="point-exchange-picker">'+
      '<label>Give 2 points from<select id="pointExchangeSource">'+options+'</select></label>'+
      '<span class="point-exchange-arrow" aria-hidden="true">→</span>'+
      '<label>Receive 1 point in<select id="pointExchangeTarget">'+options+'</select></label></div>'+
      '<p id="pointExchangeBalance" class="point-exchange-balance" role="status" aria-live="polite"></p>'+
      '<button type="button" id="pointExchangeSubmit" class="secondary-button">Exchange 2 → 1</button>'+
      '<p class="point-exchange-note">Permanent, voluntary exchange. Choose the receiving Realm carefully. Normal Talent points are still earned through their own Skills.</p>'+
      '<p id="pointExchangeHistory" class="point-exchange-history"></p>'+
      '</div>';
    head.insertAdjacentElement("afterend",root);
    $("pointExchangeSource").value="Work";
    $("pointExchangeTarget").value="Hobbies";
    root.addEventListener("change",refresh);
    root.addEventListener("toggle",()=>{if(root.open)refresh();});
    $("pointExchangeSubmit").addEventListener("click",()=>{
      exchange($("pointExchangeSource").value,$("pointExchangeTarget").value);
    });
    refresh();
  }
  window.addEventListener("life-rpg:state-saved",refresh);
  window.addEventListener("life-rpg:view-changed",e=>{if(e?.detail?.view==="skills")refresh();});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
  window.LifeRPGPointExchange={version:VERSION,exchange,getTransactions:()=>ledger().map(x=>({...x})),refresh,mount};
})();