/* Life RPG · Realm Mystery Cosmetics
   One two-rank visual collection per non-Hobbies Realm.
   Separate optional equipment record; purchase ownership lives exclusively
   in the existing Talent Tree expansion ledger. No XP/Coins/Story awards.
*/
(() => {
  "use strict";
  if(window.LifeRPGRealmMystery) return;
  const app=window.LifeRPGApp, graph=window.LifeRPGTalentTreeGraph, skills=window.LifeRPGSkills;
  if(!app?.getState||!app?.saveState||!graph?.getContentRank||!skills?.getRealmPoints)return;
  const VERSION="0.31.4-realm-mystery1", CONTENT_ID="realm-mystery-collection";
  const REALMS=Object.freeze(["Work","Knowledge","Japanese","Health","Recovery","Home"]);
  // Deliberately fixed packages (not random), with original visual identities.
  // Pack names and the rendered previews are NEVER included in a locked card.
  const SETS=Object.freeze({
    Work:[
      {id:"rmw01",slot:"surface",type:"Workspace Theme",name:"Ink & Ivory",hint:"A new look for your weekly planning space."},
      {id:"rmw02",slot:"detail",type:"Workspace Details",name:"Margin Notes",hint:"New little details around your planning space."}
    ],
    Knowledge:[
      {id:"rmk01",slot:"surface",type:"Puzzle Theme",name:"Midnight Library",hint:"A fresh atmosphere for your Training Grounds."},
      {id:"rmk02",slot:"detail",type:"Puzzle Details",name:"Copper Constellations",hint:"Decorative accents for your game cards."}
    ],
    Japanese:[
      {id:"rmj01",slot:"surface",type:"Study Theme",name:"Washi Morning",hint:"A new setting for Japanese practice."},
      {id:"rmj02",slot:"detail",type:"Study Details",name:"Sakura Bookmark",hint:"A subtle finishing detail for your study library."}
    ],
    Health:[
      {id:"rmh01",slot:"surface",type:"Journal Theme",name:"Rosewater Pages",hint:"A softer home for personal reflections."},
      {id:"rmh02",slot:"detail",type:"Journal Details",name:"Pressed Petals",hint:"Gentle decorative details for journal cards."}
    ],
    Recovery:[
      {id:"rmr01",slot:"surface",type:"Studio Theme",name:"Evening Hush",hint:"Another atmosphere for your resting space."},
      {id:"rmr02",slot:"detail",type:"Studio Details",name:"Soft Orbit",hint:"Decorative details for your recovery sessions."}
    ],
    Home:[
      {id:"rmd01",slot:"surface",type:"Home Theme",name:"Honeylight",hint:"A different mood for your Home Base."},
      {id:"rmd02",slot:"detail",type:"Home Details",name:"Tea & Linen",hint:"Warm finishing touches for your home panels."}
    ]
  });
  const ROOTS=Object.freeze({
    Work:["#view-week"],
    Knowledge:["#view-games"],
    Japanese:["#japanesePracticeLibraryPanel"],
    Health:["#view-journal","#view-healthsync"],
    Recovery:["#recoveryStudioDialog"],
    Home:["#view-basecamp .home-panel","#view-meals"]
  });
  const BUTTON_ROOTS=Object.freeze({
    Work:"#view-week .my-week-hero-actions",
    Knowledge:"#view-games",
    Japanese:"#japanesePracticeLibraryPanel .jp-practice-heading-v314dz4",
    Health:"#view-journal .journal-hero-actions-v302",
    Recovery:"#recoveryStudioDialog .dialog-heading",
    Home:"#view-basecamp .home-panel .panel-heading"
  });
  const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function rank(realm){
    if(!SETS[realm])return 0;
    return Math.max(0,Math.min(SETS[realm].length,Math.floor(Number(graph.getContentRank(realm,CONTENT_ID)||0))));
  }
  function equipped(){
    const src=app.getState()?.realmMysteryCosmeticsV1?.equipped;
    return src&&typeof src==="object"&&!Array.isArray(src)?src:{};
  }
  function validated(realm,slot,id){
    return Boolean(id&&SETS[realm]?.some((p,i)=>p.id===id&&p.slot===slot&&i<rank(realm)));
  }
  function selection(realm){
    const s=equipped()[realm],o=s&&typeof s==="object"&&!Array.isArray(s)?s:{};
    return {surface:validated(realm,"surface",o.surface)?o.surface:"",
      detail:validated(realm,"detail",o.detail)?o.detail:""};
  }
  function apply(){
    for(const realm of REALMS){
      const selected=selection(realm);
      for(const query of ROOTS[realm]){
        const root=document.querySelector(query);if(!root)continue;
        for(const slot of ["surface","detail"]){
          const attr="data-rmc-"+slot;
          if(selected[slot])root.setAttribute(attr,selected[slot]);
          else root.removeAttribute(attr);
        }
      }
      mountShortcut(realm);
    }
  }
  function mountShortcut(realm){
    const id="realmMysteryOpen"+realm;
    const button=document.getElementById(id);
    if(!rank(realm)){button?.remove();return;}
    const root=document.querySelector(BUTTON_ROOTS[realm]);
    if(!root||button)return;
    const el=document.createElement("button");
    el.id=id;el.type="button";el.className="rmc-shortcut secondary-button";
    el.textContent="✧ Collection";
    el.setAttribute("aria-label",realm+" mystery cosmetics collection");
    el.addEventListener("click",()=>openRealm(realm));
    root.appendChild(el);
  }
  let dialog=null,currentRealm="Work",highlight=0;
  const lastRanks=Object.fromEntries(REALMS.map(realm=>[realm,rank(realm)]));
  function modal(){
    if(dialog?.isConnected)return dialog;
    dialog=document.createElement("dialog");
    dialog.id="realmMysteryDialog";dialog.className="rmc-dialog";
    dialog.setAttribute("aria-label","Realm Mystery Cosmetics");
    dialog.addEventListener("click",event=>{
      if(event.target===dialog){dialog.close();return;}
      const target=event.target.closest?.("[data-rmc-action]");
      if(!target)return;
      const action=target.dataset.rmcAction;
      if(action==="close"){dialog.close();return;}
      if(action==="purchase"){
        if(rank(currentRealm)>=2)return;
        if(!graph.purchaseContent(currentRealm,CONTENT_ID))render();
        return;
      }
      if(action==="equip"){
        const id=target.dataset.rmcId;
        const pack=SETS[currentRealm].find(p=>p.id===id);
        if(pack)equip(currentRealm,pack);
      }
    });
    document.body.appendChild(dialog);
    return dialog;
  }
  function equip(realm,pack){
    if(!SETS[realm]||!validated(realm,pack.slot,pack.id))return false;
    const state=app.getState();
    const before=state.realmMysteryCosmeticsV1;
    const ownedEquipment=equipped();
    const current=selection(realm);
    const newSlot=current[pack.slot]===pack.id?"":pack.id;
    const next={...ownedEquipment,[realm]:{...current,[pack.slot]:newSlot}};
    state.realmMysteryCosmeticsV1={...((before&&typeof before==="object"&&!Array.isArray(before))?before:{}),
      schemaVersion:1,equipped:next};
    if(app.saveState({source:"realm-mystery-appearance",suppressUiRefresh:true})===false){
      if(before===undefined)delete state.realmMysteryCosmeticsV1;
      else state.realmMysteryCosmeticsV1=before;
      app.showToast?.("Appearance could not be saved. Your previous selection remains.");
      apply();if(dialog?.open)render();return false;
    }
    highlight=0;apply();if(dialog?.open)render();return true;
  }
  function card(pack,index,currentRank,current){
    if(index>=currentRank)
      return '<article class="rmc-pack rmc-locked"><div class="rmc-lock" aria-hidden="true">✧</div><div><small>'+escapeHtml(pack.type)+' · MYSTERY '+(index+1)+'</small><strong>???</strong><p>Reveal after unlocking</p></div><span aria-label="Locked">🔒</span></article>';
    const selected=current[pack.slot]===pack.id;
    return '<article class="rmc-pack rmc-owned'+(highlight===index+1?' rmc-reveal':'')+'">'+
      '<div class="rmc-preview" data-rmc-preview="'+escapeHtml(pack.id)+'" aria-hidden="true"><i></i><b></b><em></em></div>'+
      '<div><small>'+escapeHtml(pack.type)+' · UNLOCKED</small><strong>'+escapeHtml(pack.name)+'</strong><p>'+escapeHtml(pack.hint)+'</p></div>'+
      '<button class="secondary-button" type="button" data-rmc-action="equip" data-rmc-id="'+escapeHtml(pack.id)+'" aria-pressed="'+selected+'">'+(selected?'Remove':'Apply')+'</button></article>';
  }
  function render(){
    const d=modal(),realm=currentRealm,n=rank(realm),current=selection(realm);
    const available=Math.max(0,Number(skills.getRealmPoints(realm).available||0));
    const cards=SETS[realm].map((p,i)=>card(p,i,n,current)).join("");
    d.innerHTML='<div class="rmc-shell"><header class="rmc-header"><div><small>'+escapeHtml(realm.toUpperCase())+' · MYSTERY VISUALS</small>'+
      '<h2>✧ Mystery Collection</h2><p>Small permanent cosmetic surprises. No deadlines or duplicates.</p></div>'+
      '<button class="rmc-close" type="button" data-rmc-action="close" aria-label="Close">×</button></header>'+
      '<div class="rmc-progress">'+n+' / 2 unlocked · '+available+' '+escapeHtml(realm)+' point'+(available===1?'':'s')+' available</div>'+
      '<div class="rmc-packs">'+cards+'</div>'+
      '<footer class="rmc-footer">'+(n<2?'<button class="primary-button" type="button" data-rmc-action="purchase" '+(available<1?'disabled':'')+'>Unlock next mystery · 1 '+escapeHtml(realm)+' point</button>':'<span>✦ Collection complete</span>')+
      '<small>Only looks change. The ordinary features stay accessible without buying cosmetics.</small></footer></div>';
  }
  function openRealm(realm,options={}){
    if(!SETS[realm]||rank(realm)<1)return false;
    currentRealm=realm;highlight=Math.max(0,Math.min(2,Math.floor(Number(options.reveal||0))));
    render();
    if(!dialog.open&&typeof dialog.showModal==="function")dialog.showModal();
    else if(!dialog.open)dialog.setAttribute("open","");
    apply();return true;
  }
  window.addEventListener("life-rpg:talent-content-v2-change",event=>{
    const {realm,id}=event?.detail||{};
    if(id!==CONTENT_ID||!SETS[realm])return;
    const current=rank(realm),old=lastRanks[realm];
    lastRanks[realm]=current;
    apply();
    if(current>old)openRealm(realm,{reveal:current});
    else if(dialog?.open&&currentRealm===realm)render();
  });
  window.addEventListener("life-rpg:state-saved",()=>{
    apply();
    if(dialog?.open)render();
  });
  window.addEventListener("life-rpg:render",apply);
  window.addEventListener("life-rpg:view-changed",apply);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});
  else apply();
  window.LifeRPGRealmMystery={version:VERSION,openRealm,apply,getOwnedRank:rank,getEquipped:selection,
    equipId:(realm,id)=>{const p=SETS[realm]?.find(x=>x.id===id);return Boolean(p&&equip(realm,p));}};
})();
