/* Life RPG · Mystery Cosmetics Phase 1
   Four canonical, deterministic, spoiler-hidden visual rewards.
   Purchase receipts live in the existing Hobbies Talent Tree rank;
   this file stores only the player's optional equipped appearance.
   No currency, XP, story affinity or cosmetic lottery.
*/
(() => {
  "use strict";
  const app=window.LifeRPGApp;
  const graph=window.LifeRPGTalentTreeGraph;
  if(!app?.getState||!app?.saveState||!graph?.getContentRank)return;
  if(window.LifeRPGMysteryCosmetics)return;
  const VERSION="0.31.4-mystery1";
  const ID="mystery-collection";
  const PACKS=Object.freeze([
    {id:"m01",slot:"theme",type:"Chat Theme",name:"Velvet Signal",description:"A characterful new look for phone conversations."},
    {id:"m02",slot:"wallpaper",type:"Wallpaper",name:"Quiet Constellation",description:"A new atmosphere behind your conversations."},
    {id:"m03",slot:"frame",type:"Visual Details",name:"Keepsake Edges",description:"A collectible finish for the phone's portraits and details."},
    {id:"m04",slot:"theme",type:"Chat Theme",name:"Midnight Frequency",description:"Another complete conversation style to switch between."}
  ]);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const owned=()=>Math.max(0,Math.min(PACKS.length,Number(graph.getContentRank("Hobbies",ID))||0));
  const read=()=>{
    const saved=app.getState()?.mysteryCosmeticsV1;
    const equipped=saved&&typeof saved==="object"&&!Array.isArray(saved)&&
      saved.equipped&&typeof saved.equipped==="object"&&!Array.isArray(saved.equipped)?saved.equipped:{};
    return {theme:String(equipped.theme||""),wallpaper:String(equipped.wallpaper||""),frame:String(equipped.frame||"")};
  };
  const allowed=(id,rank=owned())=>PACKS.some((pack,i)=>pack.id===id && rank>i);
  const validSelection=(slot,id,rank)=>PACKS.some((pack,i)=>pack.slot===slot&&pack.id===id&&rank>i);
  function apply(){
    const rank=owned(),selection=read();
    for(const el of [document.getElementById("view-phone"),document.getElementById("storyPhoneDialog")]){
      if(!el)continue;
      for(const slot of ["theme","wallpaper","frame"]){
        const id=validSelection(slot,selection[slot],rank)?selection[slot]:"";
        if(id)el.setAttribute("data-mystery-"+slot,id);
        else el.removeAttribute("data-mystery-"+slot);
      }
    }
    mountButtons(rank);
  }
  function mountButtons(rank){
    const targets=[
      {root:document.querySelector("#view-phone .phone-page-status"),id:"mysteryOpenPhone"},
      {root:document.querySelector("#storyPhoneDialog .story-phone-heading"),id:"mysteryOpenDialog"}
    ];
    for(const target of targets){
      const existing=document.getElementById(target.id);
      if(!rank){existing?.remove();continue;}
      if(!target.root||existing)continue;
      if(existing)continue;
      const button=document.createElement("button");
      button.id=target.id;
      button.type="button";
      button.className="mystery-phone-button";
      button.textContent="✧ Collection";
      button.setAttribute("aria-label","Open your unlocked mystery cosmetics");
      button.addEventListener("click",()=>open());
      target.root.appendChild(button);
    }
  }
  let dialog=null,highlight=0,lastOwned=owned();
  function ensureDialog(){
    if(dialog?.isConnected)return dialog;
    dialog=document.createElement("dialog");
    dialog.id="lifeMysteryCollection";
    dialog.className="mystery-collection-dialog";
    dialog.setAttribute("aria-label","Mystery Cosmetics Collection");
    dialog.addEventListener("click",e=>{
      if(e.target===dialog)dialog.close();
      const button=e.target.closest?.("[data-mystery-action]");
      if(!button)return;
      const action=button.dataset.mysteryAction;
      if(action==="close"){dialog.close();return;}
      if(action==="purchase"){
        if(graph.purchaseContent("Hobbies",ID)!==true)render();
        return;
      }
      if(action==="equip"){
        const key=button.dataset.mysteryKey;
        const pack=PACKS.find(x=>x.id===key);
        if(pack)equip(pack);
      }
    });
    document.body.appendChild(dialog);
    return dialog;
  }
  function equip(pack){
    const rank=owned();
    if(!allowed(pack.id,rank))return false;
    const root=app.getState();
    const previous=read();
    const next={...previous,[pack.slot]:previous[pack.slot]===pack.id?"":pack.id};
    root.mysteryCosmeticsV1={schemaVersion:1,equipped:next};
    if(!app.saveState({source:"mystery-cosmetics-appearance",suppressUiRefresh:true})){
      // Keep UI honest if storage is unavailable. The application's standard
      // save-recovery flow still owns conflict/rollback handling.
      root.mysteryCosmeticsV1={schemaVersion:1,equipped:previous};
      app.showToast?.("Appearance could not be saved. Check your save status.");
      render();apply();return false;
    }
    highlight=0;
    apply();render();return true;
  }
  function packCard(pack,index,rank,selection){
    const unlocked=index<rank;
    const featured=highlight===index+1&&unlocked;
    if(!unlocked)return '<article class="mystery-pack is-locked"><div class="mystery-lock" aria-hidden="true">✧</div><div class="mystery-pack-details"><small>'+esc(pack.type)+' · MYSTERY '+String(index+1).padStart(2,"0")+'</small><strong>???</strong><span>Reveal after purchase</span></div><span class="mystery-lock-icon" aria-label="Locked">🔒</span></article>';
    const equipped=selection[pack.slot]===pack.id;
    return '<article class="mystery-pack is-unlocked'+(featured?' is-revealed':'')+'">'+
      '<div class="mystery-preview" data-mystery-preview="'+esc(pack.id)+'" aria-hidden="true"><span class="mystery-preview-orb"></span><i></i><b></b></div>'+
      '<div class="mystery-pack-details"><small>'+esc(pack.type)+' · UNLOCKED</small><strong>'+esc(pack.name)+'</strong><span>'+esc(pack.description)+'</span></div>'+
      '<button class="secondary-button mystery-equip" type="button" data-mystery-action="equip" data-mystery-key="'+esc(pack.id)+'" aria-pressed="'+String(equipped)+'">'+(equipped?"Remove":"Apply")+'</button></article>';
  }
  function render(){
    const d=ensureDialog(),rank=owned(),selection=read();
    const available=Number(window.LifeRPGSkills?.getRealmPoints?.("Hobbies")?.available||0);
    d.innerHTML='<div class="mystery-shell">'+
      '<header class="mystery-head"><div><small>HOBBIES · VISUAL REWARDS</small><h2>✧ Mystery Collection</h2><p>Four small surprises. Nothing expires; every purchase is yours to keep.</p></div><button class="mystery-close" type="button" aria-label="Close collection" data-mystery-action="close">×</button></header>'+
      '<div class="mystery-progress">'+rank+' / 4 unlocked · '+Math.max(0,available)+' Hobbies point'+(available===1?'':'s')+' available</div>'+
      '<div class="mystery-packs">'+PACKS.map((pack,i)=>packCard(pack,i,rank,selection)).join("")+'</div>'+
      '<footer class="mystery-footer">'+(rank<PACKS.length?'<button class="primary-button" type="button" data-mystery-action="purchase" '+(available<1?'disabled':'')+'>Unlock next mystery · 1 Hobbies point</button>':'<span>✦ Complete collection unlocked</span>')+
      '<small>Only appearance changes. Normal chats, stories and character relationships stay free.</small></footer></div>';
  }
  function open(opts={}){
    if(owned()<1)return false;
    highlight=Number(opts.reveal||0);
    render();
    if(!dialog.open && typeof dialog.showModal==="function")dialog.showModal();
    else if(!dialog.open)dialog.setAttribute("open","");
    apply();
    return true;
  }
  window.addEventListener("life-rpg:talent-content-v2-change",e=>{
    if(e?.detail?.realm!=="Hobbies"||e?.detail?.id!==ID)return;
    const current=owned();
    const reveal=current>lastOwned?current:0;
    lastOwned=current;
    if(reveal)open({reveal});
    else{apply();if(dialog?.open)render();}
  });
  window.addEventListener("life-rpg:state-saved",()=>{apply();if(dialog?.open)render();});
  window.addEventListener("life-rpg:render",apply);
  window.addEventListener("life-rpg:view-changed",apply);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});
  else apply();
  window.LifeRPGMysteryCosmetics={version:VERSION,open,apply,getOwnedRank:owned,getEquipped:read,equipId:id=>{const pack=PACKS.find(x=>x.id===id);return Boolean(pack&&equip(pack));}};
})();
