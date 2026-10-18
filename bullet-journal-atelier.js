/* Life RPG · Journal Atelier v1.
 * Additive per-day decoration layer; personal writing and original log systems
 * remain separate. The Sakura pilot is a NON-PERSISTENT visual QA preview
 * until approved: not sold, unlocked, or silently attached to saves.
 */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState||!app?.saveState||!book?.getDate||window.LifeRPGJournalAtelier)return;
  const VERSION="0.31.4-atelier-on-paper1",LIMIT=12;
  // Sakura anime v2: five *independent* assets, not a cropped collage.
  // Existing asset keys stay stable; the rejected letter-tag is not offered.
  // Entire Sakura collection remains preview-only until explicit in-app signoff.
  const assets=[
    {key:"paperclip-ink",group:"free",label:"Ink paperclip",src:"assets/journal/paperclip-ink.svg",width:37},
    {key:"sakura-branch",group:"pilot",label:"Anime sakura branch",src:"assets/journal/sakura-anime-branch.svg",width:138},
    {key:"sakura-washi",group:"pilot",label:"Sakura washi tape",src:"assets/journal/sakura-anime-washi.svg",width:204},
    {key:"sakura-divider",group:"pilot",label:"Sakura floral divider",src:"assets/journal/sakura-anime-divider.svg",width:212},
    {key:"sakura-blossoms",group:"pilot",label:"Sakura blossom stickers",src:"assets/journal/sakura-anime-blossoms.svg",width:98},
    {key:"sakura-memo",group:"pilot",label:"Sakura memo card",src:"assets/journal/sakura-anime-memo.svg",width:88}
  ];
  const byKey=new Map(assets.map(a=>[a.key,a]));
  const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const host=()=>document.getElementById("bjAtelierMount");
  let date="",opened=false,preview=false,working=[],selectedId="",drag=null,idCounter=0,addSide="right";
  const sideFor=item=>item?.pageSide==="left"?"left":"right";
  const isTape=item=>item?.assetKey==="sakura-washi";
  const stageFor=side=>document.getElementById(side==="left"?"bjAtelierStageLeft":"bjAtelierStage");
  const bookVisible=()=>Boolean(document.getElementById("view-bullet-journal")?.classList.contains("active")) && book.getChapter?.()==="daily";

  function sanitize(entry){
    if(!entry||typeof entry!=="object"||typeof entry.id!=="string"||entry.id.length>100||
       typeof entry.assetKey!=="string")return null;
    // Unknown future asset keys are preserved by the save data path but never
    // interpolated into an image source or rendered by this version.
    return {
      id:entry.id,assetKey:entry.assetKey,pageSide:sideFor(entry),
      x:clamp(Number.isFinite(Number(entry.x))?Number(entry.x):50,9,91),
      y:clamp(Number.isFinite(Number(entry.y))?Number(entry.y):50,15,85),
      width:clamp(Number.isFinite(Number(entry.width))?Number(entry.width):70,24,1200),
      angle:clamp(Number.isFinite(Number(entry.angle))?Number(entry.angle):0,-180,180)
    };
  }
  function saved(key=date){
    const rows=app.getState().journalAtelierV1?.daily?.[key];
    return (Array.isArray(rows)?rows:[]).slice(0,LIMIT).map(sanitize).filter(Boolean);
  }
  function loadDate(key) {
    if(date===key)return;
    date=key;opened=false;preview=false;selectedId="";working=saved(key);drag=null;addSide="right";
  }
  function persist(){
    if(preview)return true; // Prototypes and preview edits are NEVER added to a save.
    const root=app.getState(),old=root.journalAtelierV1;
    const daily={...(old?.daily||{})};
    if(working.length)daily[date]=working.map(item=>({...item}));
    else delete daily[date];
    root.journalAtelierV1={...(old||{}),schemaVersion:1,daily};
    if(app.saveState({source:"journal-atelier-decoration",suppressUiRefresh:true})===false){
      if(old===undefined)delete root.journalAtelierV1;
      else root.journalAtelierV1=old;
      working=saved();
      app.showToast?.("Decoration not saved. Your original page is safe.");
      return false;
    }
    return true;
  }
  function previewStart(){
    if(preview)return;
    preview=true;working=saved();selectedId="";drag=null;
  }
  function exitPreview(){
    if(!preview)return;
    preview=false;working=saved();selectedId="";drag=null;
    render();
  }
  function ensureStages(){
    const view=document.getElementById("view-bullet-journal");
    if(!view)return;
    for(const [side,section] of [["left",".bj-book-writing"],["right",".bj-book-recorded"]]){
      const parent=view.querySelector("#bjBookDailySpread "+section+" .bj-book-page-inner");
      if(!parent)continue;
      let stage=stageFor(side);
      if(!stage){
        stage=document.createElement("div");
        stage.id=side==="left"?"bjAtelierStageLeft":"bjAtelierStage";
        stage.className="bj-atelier-stage";
        stage.dataset.bjAtelierSide=side;
        stage.setAttribute("aria-label",side==="left"?"Decorations on the writing page":"Decorations on the moments page");
        parent.appendChild(stage);
        stage.addEventListener("pointerdown",beginDrag);
        stage.addEventListener("pointermove",dragMove);
        stage.addEventListener("pointerup",endDrag);
        stage.addEventListener("pointercancel",endDrag);
        stage.addEventListener("click",event=>{
          const sticker=event.target.closest?.("[data-bj-deco-id]");
          if(!sticker)return;
          selectedId=sticker.dataset.bjDecoId;addSide=side;
          opened=true;render();
        });
        stage.addEventListener("keydown",moveByKeyboard);
      }
    }
  }
  function placementHtml(item){
    const asset=byKey.get(item.assetKey);
    if(!asset)return "";
    const selected=item.id===selectedId;
    const style=`left:${item.x}%;top:${item.y}%;width:${item.width}px;transform:translate(-50%,-50%) rotate(${item.angle}deg)`;
    const media=isTape(item)
      ? '<span class="bj-atelier-tape-art" style="background-image:url('+asset.src+')" aria-hidden="true"></span>'
      : '<img src="'+asset.src+'" alt="" draggable="false">';
    return '<div class="bj-atelier-item'+(selected?" is-selected":"")+(isTape(item)?" is-tape":"")+
      '" data-bj-deco-container="'+safe(item.id)+'" style="'+style+'">'+
      '<button type="button" class="bj-atelier-sticker" data-bj-deco-id="'+safe(item.id)+'" '+
      'aria-label="Select '+safe(asset.label)+' on '+sideFor(item)+' page" aria-pressed="'+selected+'">'+
      media+'</button>'+
      (selected&&opened&&isTape(item)?'<button type="button" class="bj-atelier-stretch" '+
      'data-bj-deco-stretch="'+safe(item.id)+'" aria-label="Drag to change Washi tape length" '+
      'title="Drag ↔ to stretch Washi tape">↔</button>':"")+'</div>';
  }
  function picker(group){
    return assets.filter(asset=>asset.group===group).map(a=>
      '<button type="button" class="bj-atelier-pick" data-bj-atelier-asset="'+safe(a.key)+'" '+
      'aria-label="Add '+safe(a.label)+(a.group==="pilot"?" to temporary preview":"")+'">'+
      '<img src="'+a.src+'" alt="" loading="lazy"><span>'+safe(a.label)+'</span></button>'
    ).join("");
  }
  function render(key=book.getDate()){
    if(!key)return;
    loadDate(key);
    ensureStages();
    const mount=host();
    if(!mount)return;
    const current=working.find(p=>p.id===selectedId);
    mount.classList.toggle("is-editing",opened);
    mount.classList.toggle("has-art",working.some(p=>byKey.has(p.assetKey)));
    // Decorative overlay is absolutely positioned over the REAL book paper.
    // Nothing creates a second boxed/padded decoration section.
    for(const side of ["left","right"]){
      const stage=stageFor(side);
      if(!stage)continue;
      stage.innerHTML=working.filter(p=>sideFor(p)===side).map(placementHtml).join("");
      stage.classList.toggle("is-editing",opened);
    }
    mount.innerHTML=
      '<div class="bj-atelier-bar"><button type="button" class="bj-atelier-toggle" data-bj-atelier-toggle '+
      'aria-expanded="'+opened+'">'+(opened?'✦ Close Atelier':'✦ Decorate page')+'</button>'+
      (preview?'<small class="bj-atelier-preview-warning">Sakura v2 · temporary, not sold or saved</small>':
       '<small>Free editor · decorate the actual book pages</small>')+'</div>'+
      (opened?
        '<div class="bj-atelier-controls">'+
        (preview?'<div class="bj-atelier-preview-note">✧ Sakura anime v2 preview. Nothing is purchased or saved. '+
          '<button type="button" data-bj-atelier-exit>Discard preview</button></div>':'')+
        '<div class="bj-atelier-page-choice" role="group" aria-label="Place decoration on page">'+
          '<span>Place on</span>'+
          '<button type="button" data-bj-atelier-side="left" aria-pressed="'+(addSide==="left")+'">✎ Writing page</button>'+
          '<button type="button" data-bj-atelier-side="right" aria-pressed="'+(addSide==="right")+'">✦ Moments page</button></div>'+
        '<div class="bj-atelier-shelf"><strong>Free starter</strong><div class="bj-atelier-assets">'+picker("free")+'</div></div>'+
        '<div class="bj-atelier-shelf is-pilot"><strong>Sakura v2 · anime style · live preview (not for sale)</strong>'+
          '<div class="bj-atelier-assets">'+picker("pilot")+'</div></div>'+
        (current?'<div class="bj-atelier-transform"><span>Selected: '+safe(byKey.get(current.assetKey)?.label||"Decoration")+'</span>'+
          '<div><button type="button" data-bj-atelier-edit="smaller" aria-label="'+(isTape(current)?"Shorten Washi tape":"Shrink decoration")+'">− '+(isTape(current)?"Length":"Size")+'</button>'+
          '<button type="button" data-bj-atelier-edit="larger" aria-label="'+(isTape(current)?"Lengthen Washi tape":"Grow decoration")+'">+ '+(isTape(current)?"Length":"Size")+'</button>'+
          '<button type="button" data-bj-atelier-edit="turn-left" aria-label="Rotate left">↶</button>'+
          '<button type="button" data-bj-atelier-edit="turn-right" aria-label="Rotate right">↷</button>'+
          '<button type="button" data-bj-atelier-edit="remove">Remove</button></div></div>':'')+
        '<p class="bj-atelier-hint">Decorations sit directly on the writing or moments paper. Drag to move. '+
          'For Washi tape, drag the ↔ handle to change its length without stretching the flowers. '+
          'Select a sticker and press Delete / Backspace to remove it.</p>'+
        '</div>':"");
  }
  function add(assetKey){
    const asset=byKey.get(assetKey);
    if(!asset)return;
    if(asset.group==="pilot")previewStart();
    if(working.length>=LIMIT){app.showToast?.("Your margin has room for up to 12 decorations.");return;}
    idCounter++;
    const idx=working.length;
    const item={
      id:"deco-"+Date.now().toString(36)+"-"+idCounter,
      assetKey,pageSide:addSide,x:clamp(25+(idx%4)*16,12,88),
      y:idx%2?67:35,width:asset.width,angle:0
    };
    working.push(item);selectedId=item.id;
    if(!persist())return;
    render();
  }
  function edit(action){
    const item=working.find(p=>p.id===selectedId);
    if(!item)return;
    const before=working.map(p=>({...p}));
    if(action==="remove"){working=working.filter(p=>p.id!==item.id);selectedId="";}
    else if(action==="smaller")item.width=clamp(item.width-(isTape(item)?38:12),24,1200);
    else if(action==="larger")item.width=clamp(item.width+(isTape(item)?38:12),24,1200);
    else if(action==="turn-left")item.angle=clamp(item.angle-15,-180,180);
    else if(action==="turn-right")item.angle=clamp(item.angle+15,-180,180);
    else return;
    if(!persist()){working=before;selectedId=item.id;}
    render();
  }
  function moveByKeyboard(event){
    const target=event.target.closest?.("[data-bj-deco-id]");
    if(!target)return;
    const directions={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-3],ArrowDown:[0,3]};
    const step=directions[event.key];
    if(!step && !["Delete","Backspace"].includes(event.key))return;
    event.preventDefault();
    selectedId=target.dataset.bjDecoId;
    if(!step){edit("remove");return;}
    const p=working.find(x=>x.id===selectedId);
    if(!p)return;
    p.x=clamp(p.x+step[0],9,91);p.y=clamp(p.y+step[1],15,85);
    persist();render();
    host()?.querySelectorAll("[data-bj-deco-id]").forEach(button=>{
      if(button.dataset.bjDecoId===selectedId)button.focus();
    });
  }
  function beginDrag(event){
    const grip=event.target.closest?.("[data-bj-deco-stretch]");
    const target=grip||event.target.closest?.("[data-bj-deco-id]");
    if(!target||event.button!==0)return;
    const id=grip?.dataset.bjDecoStretch||target.dataset.bjDecoId;
    const item=working.find(p=>p.id===id);
    const stage=stageFor(sideFor(item));
    if(!item||!stage)return;
    selectedId=item.id;addSide=sideFor(item);opened=true;
    drag={
      pointerId:event.pointerId,id:item.id,
      kind:grip?"stretch":"move",
      rect:stage.getBoundingClientRect(),
      startX:event.clientX,startY:event.clientY,
      x:item.x,y:item.y,width:item.width,
      moved:false
    };
    target.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }
  function dragMove(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const item=working.find(p=>p.id===drag.id);
    if(!item)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    if(drag.kind==="stretch"){
      // Tape length changes; height and floral motif size stay constant.
      item.width=clamp(drag.width+dx,50,1200);
    }else{
      item.x=clamp(drag.x+dx/Math.max(drag.rect.width,1)*100,5,95);
      item.y=clamp(drag.y+dy/Math.max(drag.rect.height,1)*100,5,95);
    }
    const element=stageFor(sideFor(item))?.querySelectorAll("[data-bj-deco-container]");
    element?.forEach(container=>{
      if(container.dataset.bjDecoContainer!==drag.id)return;
      container.style.left=item.x+"%";container.style.top=item.y+"%";
      container.style.width=item.width+"px";
    });
  }
  function endDrag(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const moved=drag.moved;
    drag=null;
    if(moved)persist();
    render();
  }
  function removeUsingKeyboard(event){
    if(!["Delete","Backspace"].includes(event.key)||!opened||!selectedId||!bookVisible())return;
    const target=event.target;
    if(target?.closest?.("input, textarea, [contenteditable], [role='textbox']"))return;
    event.preventDefault();event.stopPropagation();
    edit("remove");
  }
  function bind(){
    const mount=host();
    if(!mount)return;
    document.addEventListener("keydown",removeUsingKeyboard);
    mount.addEventListener("click",event=>{
      const toggle=event.target.closest?.("[data-bj-atelier-toggle]");
      if(toggle){opened=!opened;selectedId="";render();return;}
      if(event.target.closest?.("[data-bj-atelier-exit]")){exitPreview();return;}
      const page=event.target.closest?.("[data-bj-atelier-side]");
      if(page){addSide=page.dataset.bjAtelierSide==="left"?"left":"right";
        const item=working.find(x=>x.id===selectedId);
        if(item){item.pageSide=addSide;persist();}
        render();return;}
      const pick=event.target.closest?.("[data-bj-atelier-asset]");
      if(pick){add(pick.dataset.bjAtelierAsset);return;}
      const action=event.target.closest?.("[data-bj-atelier-edit]");
      if(action){edit(action.dataset.bjAtelierEdit);return;}
    });
    window.addEventListener("life-rpg:view-changed",event=>{
      if(event?.detail?.view!=="bullet-journal"){
        preview=false;selectedId="";opened=false;working=saved();drag=null;
        stageFor("left")?.replaceChildren();stageFor("right")?.replaceChildren();
      }
    });
  }
  function init(){bind();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  window.LifeRPGJournalAtelier={version:VERSION,render,isPreview:()=>preview,getPlacements:()=>working.map(p=>({...p})),
    open:()=>{book.open?.();opened=true;render();return true;},
    discardPreview:exitPreview};
})();