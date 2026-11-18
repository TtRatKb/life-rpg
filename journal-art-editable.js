/* Life RPG | true layered Jasmine journal v3.
   Real independent transparent graphics extracted from the supplied Canva SVG.
   No flattened Pinterest screenshot crops. Canonical journal text stays intact.
*/
(() => {
  "use strict";
  const app=window.LifeRPGApp;
  if(!app?.getState||!app?.saveState||window.LifeRPGJournalArtSpread)return;
  const $=(root,s)=>root?.querySelector(s);
  const sourceAssets=window.LifeRPGJournalCanvasLayers?.assets||{};
  const paperAsset=sourceAssets["paper:clean"];
  const ART_WIDTH=920;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const E={
    gratitude:{title:"Today I'm grateful for…",selector:"#bjBookPrompt-gratitude",side:"left",x:46,y:35,defaultScale:.92,angle:-1.8,scale:1.60,crop:[50,281,382,249],write:[.195,.255,.725,.64],line:29},
    intentionText:{title:"Today I will…",selector:"#bjExtra-intentionText",side:"left",x:29,y:69,defaultScale:.70,angle:1.4,scale:1.60,crop:[45,526,410,213],write:[.132,.295,.44,.62],line:28},
    focusText:{title:"Focus for today",selector:"#bjExtra-focusText",side:"right",x:40,y:36,defaultScale:1.07,angle:1.6,scale:1.45,crop:[429,380,311,226],write:[.18,.265,.74,.64],line:28},
    happyMomentsText:{title:"Little moments that made me happy",selector:"#bjExtra-happyMomentsText",side:"left",x:77,y:75,defaultScale:.82,angle:-2.1,scale:1.45,crop:[59,727,285,225],write:[.15,.33,.76,.61],line:29},
    bookNote:{title:"Notes & thoughts",selector:"#bjBookText",side:"right",x:65,y:69,defaultScale:1.06,angle:-1.5,scale:1.45,crop:[630,807,264,259],write:[.15,.255,.76,.66],line:30}
  };
  const ORDER=Object.keys(E);
  const BOX_MODES=["plain","lined","checklist"];
  const defaultMode=key=>key==="intentionText"?"checklist":"plain";
  const descriptor=key=>E[key]||E[layout?.cards?.[key]?.template];
  const fieldSelector=key=>E[key]?.selector||'[data-bj-custom-source="'+key+'"]';
  const cardKeys=()=>layout?Object.keys(layout.cards):ORDER;
  const clampScale=n=>clamp(Number.isFinite(Number(n))?Number(n):1,.45,1.55);
  const clampAngle=n=>clamp(Number.isFinite(Number(n))?Number(n):0,-8,8);
  const splitText=value=>String(value??"").split("\n");
  const compactLines=lines=>lines.map(v=>String(v??"")).join("\n").replace(/\n+$/g,"");
  const maxLines=24;
  // Each illustration is an independent crop of the same original approved
  // composition; none is stretched from the tiny prior "preview" WebPs.
  const DECOR=[
    {key:"date-tag",side:"right",x:30,y:10,scale:1.18,crop:[618,27,258,158]},
    {key:"jasmine-bouquet",side:"left",x:24,y:14,scale:1.17,crop:[43,20,270,267]},
    {key:"journal-title",side:"left",x:67,y:12,scale:1.25,crop:[305,29,288,180]},
    {key:"jasmine-wrap",side:"left",x:19,y:91,scale:1.03,crop:[53,941,195,188]},
    {key:"moon-window",side:"right",x:83,y:10,scale:.94,crop:[586,173,261,253]},
    {key:"tea-and-flowers",side:"right",x:22,y:79,scale:1.05,crop:[337,682,195,220]},
    {key:"postcards",side:"right",x:70,y:96,scale:.80,crop:[344,893,186,196]},
    {key:"hanging-jasmine",side:"right",x:83,y:56,scale:.85,crop:[750,433,151,351]}
  ];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function prepareOriginalArtwork(){
    if(!sourceAssets["frame:gratitude"]||!sourceAssets["frame:bookNote"]||!paperAsset){
      status("Jasmine illustration layers unavailable. Your writing is safe.");
      return false;
    }
    spread.style.setProperty("--bj-clean-paper",'url("'+paperAsset.url+'")');
    spread.classList.add("bj-layer-sprites-ready");
    return true;
  }

  const defaults=()=>{
    const cards={};
    // Art-directed paper collage: an intentional offset stack, not a vertical
    // set of generic cards. Only NEW days receive these suggested positions.
    for(const [key,f] of Object.entries(E))cards[key]={
      side:f.side,x:f.x,y:f.y,visible:true,scale:f.defaultScale,
      rotation:f.angle,mode:defaultMode(key),checks:[]
    };
    return {schemaVersion:3,paper:{left:"jasmine",right:"jasmine"},cards};
  };
  function normalize(raw){
    const p=defaults();
    if(raw?.paper)for(const side of ["left","right"])if(["jasmine","plain"].includes(raw.paper[side]))p.paper[side]=raw.paper[side];
    for(const [key,f] of Object.entries(E)){
      const c=raw?.cards?.[key];
      if(!c||typeof c!=="object")continue;
      p.cards[key]={
        side:c.side==="left"||c.side==="right"?c.side:f.side,
        x:clamp(Number.isFinite(+c.x)?+c.x:f.x,12,88),
        y:clamp(Number.isFinite(+c.y)?+c.y:f.y,10,90),
        visible:c.visible!==false,
        scale:clampScale(c.scale),
        // Existing saved layouts from before rotation must look unchanged.
        rotation:clampAngle(c.rotation),
        mode:BOX_MODES.includes(c.mode)?c.mode:defaultMode(key),
        checks:Array.isArray(c.checks)?c.checks.slice(0,maxLines).map(v=>v===true):[]
      };
    }
    if(raw?.cards&&typeof raw.cards==="object"){
      for(const [key,c] of Object.entries(raw.cards).slice(0,90)){
        if(!/^custom-[a-z0-9-]{1,56}$/.test(key)||!c||!ORDER.includes(c.template))continue;
        const model=E[c.template];
        p.cards[key]={
          template:c.template,custom:true,
          side:c.side==="left"||c.side==="right"?c.side:"left",
          x:clamp(Number.isFinite(+c.x)?+c.x:50,12,88),
          y:clamp(Number.isFinite(+c.y)?+c.y:50,10,90),
          visible:c.visible!==false,
          scale:clampScale(c.scale),
          rotation:clampAngle(c.rotation),
          mode:BOX_MODES.includes(c.mode)?c.mode:defaultMode(c.template),
          checks:Array.isArray(c.checks)?c.checks.slice(0,maxLines).map(v=>v===true):[],
          text:typeof c.text==="string"?c.text:""
        };
      }
    }
    return p;
  }
  function stored(day){return normalize(app.getState().journalPageLayoutV3?.daily?.[day]);}
  let view=null,spread=null,tool=null,sideBar=null,more=null;
  let day="",layout=null,creative=false,activeSide="left",selected="",drag=null;
  let customSaveTimer=null,cardIdCounter=0;
  let resizeObserver=null,ready=false;

  function srcCrop(el,_unused,scale,pageWidth){
    const sprite=sourceAssets[el?.dataset?.bjSprite];
    if(!el||!sprite){if(el)el.style.visibility="hidden";return {w:0,h:0,px:0,write:null};}
    const px=pageWidth/ART_WIDTH*scale,w=sprite.w*px,h=sprite.h*px;
    el.style.visibility="";
    el.style.width=w+"px";el.style.height=h+"px";
    el.style.backgroundImage='url("'+sprite.url+'")';
    el.style.backgroundSize="100% 100%";
    el.style.backgroundPosition="center center";
    el.style.webkitMaskImage="none";el.style.maskImage="none";
    return {w,h,px,write:sprite.write||null};
  }
  function paper(side){return $(spread,'[data-bj-page="'+side+'"]');}
  function fieldStage(side){return $(paper(side),".bj-layer-card-stage");}
  function saveLayout(){
    if(!day||!layout)return false;
    if(customSaveTimer){clearTimeout(customSaveTimer);customSaveTimer=null;}
    const state=app.getState(),before=state.journalPageLayoutV3;
    const daily={...(before?.daily||{})};
    daily[day]=JSON.parse(JSON.stringify(layout));
    state.journalPageLayoutV3={...(before||{}),schemaVersion:3,daily};
    if(app.saveState({source:"journal-illustrated-layout-v3",suppressUiRefresh:true})===false){
      if(before===undefined)delete state.journalPageLayoutV3;
      else state.journalPageLayoutV3=before;
      layout=stored(day);renderCards();
      status("Layout not saved. Previous position restored.");
      return false;
    }
    status("Layout saved ✓");
    return true;
  }
  function status(value){const e=$(spread,"#bjLayerStatus");if(e)e.textContent=value;}
  function createPage(side){
    const box=document.createElement("section");
    box.className="bj-layer-page";
    box.dataset.bjPage=side;box.setAttribute("aria-label",side==="left"?"Left journal page":"Right journal page");
    box.innerHTML='<div class="bj-layer-paper-grain" aria-hidden="true"></div>'+
      '<div class="bj-layer-decor" aria-hidden="true"></div>'+
      '<div class="bj-layer-card-stage"></div>'+
      (side==="right"?'<button type="button" id="bjLayerMood" class="bj-layer-mood" aria-label="Edit the day check-in">mood today ♡ <span id="bjLayerMoodText"></span></button>':'');
    const stage=$(box,".bj-layer-card-stage");
    stage.addEventListener("pointerdown",startDrag);
    stage.addEventListener("pointermove",moveDrag);
    stage.addEventListener("pointerup",endDrag);
    stage.addEventListener("pointercancel",endDrag);
    stage.addEventListener("keydown",keyMove);
    stage.addEventListener("click",e=>{
      const hide=e.target.closest?.("[data-bj-hide-card]");
      if(hide){hideCard(hide.dataset.bjHideCard);return;}
      const grip=e.target.closest?.("[data-bj-handle]");
      if(grip&&creative){selected=grip.dataset.bjHandle;activeSide=side;updateSelection();}
    });
    if(side==="right")$(box,"#bjLayerMood").addEventListener("click",()=>{
      if(!window.LifeRPGBulletJournalBook?.save?.())return;
      window.LifeRPGJournal?.openDayEditor?.(day);
    });
    return box;
  }
  function init(host){
    if(ready||!host)return;
    view=host;spread=$(view,"#bjBookDailySpread");
    if(!spread||spread.classList.contains("bj-layer-enabled"))return;
    // The original Canva SVG's transparent real objects are bundled locally.
    if(!prepareOriginalArtwork())return;
    tool=document.createElement("nav");tool.className="bj-layer-toolbar";
    tool.setAttribute("aria-label","Journal navigation and modes");
    tool.innerHTML='<div class="bj-layer-nav-group">'+
      '<button type="button" data-bj-chapter="daily">✿ Days</button>'+
      '<button type="button" data-bj-chapter="weekly">▦ Weeks</button>'+
      '<button type="button" data-bj-chapter="monthly">☾ Months</button>'+
      '<button type="button" data-bj-chapter="collections">✧ Collections</button></div>'+
      '<div class="bj-layer-nav-group"><button data-bj-action="prev" aria-label="Previous day">‹</button>'+
      '<input type="date" id="bjLayerDate" aria-label="Journal date">'+
      '<button data-bj-action="next" aria-label="Next day">›</button>'+
      '<button data-bj-action="today">Today</button></div>'+
      '<div class="bj-layer-nav-group bj-layer-mode-switch">'+
      '<button type="button" data-bj-layer-mode="write" aria-pressed="true">✎ Write</button>'+
      '<button type="button" data-bj-layer-mode="create" aria-pressed="false">✦ Create</button></div>'+
      '<span id="bjLayerStatus" role="status" aria-live="polite"></span>';
    spread.prepend(tool);
    spread.appendChild(createPage("left"));
    spread.appendChild(createPage("right"));
    sideBar=document.createElement("aside");sideBar.className="bj-layer-shelf";
    sideBar.setAttribute("aria-label","Original illustrated journal elements");
    sideBar.innerHTML='<h2>✿ My little atelier</h2><p>Choose the page you want to decorate. The other page becomes your box library.</p>'+
      '<div class="bj-layer-page-choice"><button type="button" data-bj-choose-side="left">← Left page</button>'+
      '<button type="button" data-bj-choose-side="right">Right page →</button></div>'+
      '<h3>Original illustrated boxes</h3><div id="bjLayerLibrary" class="bj-layer-library"></div>'+
      '<div id="bjLayerSelected"></div><h3>Paper background</h3>'+
      '<div class="bj-layer-papers"><button type="button" data-bj-paper="jasmine">✿ Jasmine paper</button>'+
      '<button type="button" data-bj-paper="plain">♡ Plain paper</button></div>'+
      '<p class="bj-layer-tip">Remove = hide this box, not its writing. Reinsert it here whenever you like.</p>'+
      '<details class="bj-layer-more-stickers"><summary>✧ More original decorations</summary><div id="bjLayerAtelier"></div></details>';
    spread.appendChild(sideBar);
    more=document.createElement("details");more.className="bj-layer-extras";
    more.innerHTML='<summary>✧ More reflections, tracker & recorded moments</summary><div id="bjLayerExtras"></div>';
    spread.insertAdjacentElement("afterend",more);
    const extras=$(more,"#bjLayerExtras");
    // Leave the original form and bookkeeping nodes mounted. Book.renderDay
    // continues to query/update the same IDs; only the editor moves.
    for(const node of [...spread.querySelectorAll(".bj-book-page")])extras.appendChild(node);
    const atelier=$(extras,"#bjAtelierMount");
    if(atelier)$(sideBar,"#bjLayerAtelier").appendChild(atelier);
    const dateInput=$(tool,"#bjLayerDate");
    dateInput.addEventListener("change",()=>{
      if(!window.LifeRPGBulletJournalBook?.changeDate?.(dateInput.value))dateInput.value=day;
    });
    tool.addEventListener("click",e=>{
      const b=e.target.closest?.("[data-bj-layer-mode]");if(!b)return;
      if(!window.LifeRPGBulletJournalBook?.save?.())return;
      creative=b.dataset.bjLayerMode==="create";selected="";
      updateMode();
    });
    sideBar.addEventListener("click",e=>{
      const side=e.target.closest?.("[data-bj-choose-side]");
      if(side){activeSide=side.dataset.bjChooseSide==="right"?"right":"left";selected="";updateMode();return;}
      const create=e.target.closest?.("[data-bj-create-card]");
      if(create){createExtraCard(create.dataset.bjCreateCard);return;}
      const card=e.target.closest?.("[data-bj-add-card]");
      if(card){restoreCard(card.dataset.bjAddCard);return;}
      const act=e.target.closest?.("[data-bj-action-card]");
      if(act){editSelected(act.dataset.bjActionCard);return;}
      const modeButton=e.target.closest?.("[data-bj-box-mode]");
      if(modeButton){setBoxMode(selected,modeButton.dataset.bjBoxMode);return;}
      const scaleInput=e.target.closest?.("[data-bj-card-scale],[data-bj-card-angle]");
      if(scaleInput&&e.type==="click")return;
      const paperButton=e.target.closest?.("[data-bj-paper]");
      if(paperButton&&layout){layout.paper[activeSide]=paperButton.dataset.bjPaper==="plain"?"plain":"jasmine";if(saveLayout())updateMode();}
    });
    sideBar.addEventListener("input",e=>{
      const slider=e.target.closest?.("[data-bj-card-scale],[data-bj-card-angle]");
      if(!slider||!descriptor(selected)||!layout)return;
      const p=layout.cards[selected];
      if(slider.hasAttribute("data-bj-card-scale")){
        p.scale=clampScale(Number(slider.value)/100);
        updateArtworkSizes();
        const value=$(sideBar,"#bjLayerScaleValue");
        if(value)value.textContent=Math.round(p.scale*100)+"%";
      }else{
        p.rotation=clampAngle(Number(slider.value));
        const frame=$(fieldStage(p.side),'[data-bj-field="'+selected+'"]');
        if(frame)frame.style.transform="translate(-50%,-50%) rotate("+p.rotation+"deg)";
        const value=$(sideBar,"#bjLayerAngleValue");
        if(value)value.textContent=p.rotation.toFixed(1)+"°";
      }
    });
    sideBar.addEventListener("change",e=>{
      if(e.target.closest?.("[data-bj-card-scale],[data-bj-card-angle]"))saveLayout();
    });
    spread.addEventListener("input",event=>{
      const field=event.target.closest?.(".bj-layer-field");
      if(!field)return;
      const n=field.value.length,key=field.dataset.bjArt||"";
      const preview=key==="gratitude"?window.LifeRPGJournal?.getReflectionRewardPreview?.(day,key,field.value):null;
      status(n+" characters"+(preview?(" · "+preview.remaining+" until next writing reward"):"")+" · writing…");
    });
    spread.addEventListener("focusout",event=>{
      if(event.target.closest?.(".bj-layer-field"))status("Saved through the original Journal fields ♡");
    });
    spread.classList.add("bj-layer-enabled");
    ready=true;
    updateArtworkSizes();updateLibrary();
    // Keep crops crisp at all viewport sizes; downscale original artwork,
    // never enlarge tiny thumbnail files.
    if(typeof ResizeObserver!=="undefined"){
      resizeObserver=new ResizeObserver(()=>{if(layout)updateArtworkSizes();});
      resizeObserver.observe(paper("left"));resizeObserver.observe(paper("right"));
    }
  }
  function originalInput(field){
    if(!E[field]){
      const p=layout.cards[field];
      if(!p?.custom)return null;
      const ta=document.createElement("textarea");
      ta.id="bjLayerCustom-"+field;
      ta.dataset.bjCustomSource=field;
      ta.value=p.text||"";
      ta.spellcheck=true;
      // Never truncate pre-existing custom writing on a template resize or reload.
      ta.addEventListener("input",()=>queueExtraText(field,ta.value));
      ta.addEventListener("focusout",()=>{if(customSaveTimer)saveLayout();});
      return ta;
    }
    if(field==="gratitude"){
      // The book regenerates this prompt on each date, so the *new* original
      // must be preferred over a detached old textarea.
      return $(more,"#bjBookPrompt-gratitude")||$(spread,"#bjBookPrompt-gratitude");
    }
    return $(view,E[field].selector);
  }
  function cardNode(field){
    const f=descriptor(field),card=document.createElement("section");
    card.className="bj-layer-original-frame";
    card.dataset.bjField=field;
    card.setAttribute("aria-label",f.title);
    const visual=document.createElement("div");visual.className="bj-layer-frame-crop";
    visual.dataset.bjSprite="frame:"+(E[field]?field:layout.cards[field].template);
    visual.setAttribute("aria-hidden","true");card.appendChild(visual);
    const body=document.createElement("div");body.className="bj-layer-write-zone";
    body.dataset.bjLineHost=field;
    const input=originalInput(field);
    if(input){
      input.classList.add("bj-layer-field");
      input.dataset.bjArt=field;input.setAttribute("aria-label",f.title);
      if(input.tagName==="TEXTAREA")input.placeholder="";
      if(!input.__bjLayerOriginalParent)input.__bjLayerOriginalParent=input.parentElement;
      input.readOnly=creative;
      body.appendChild(input);
      if(layout.cards[field].mode!=="plain"){
        const rows=document.createElement("div");rows.className="bj-layer-line-stack";
        rows.dataset.bjLines=field;body.appendChild(rows);
      }
    }else{body.textContent="Saved reflection unavailable to edit";body.classList.add("bj-layer-unavailable");}
    card.appendChild(body);
    const handle=document.createElement("button");handle.type="button";
    handle.className="bj-layer-handle";handle.dataset.bjHandle=field;
    handle.setAttribute("aria-label","Move "+f.title+" with drag or arrow keys");handle.textContent="⠿";
    card.appendChild(handle);
    const hide=document.createElement("button");hide.type="button";
    hide.className="bj-layer-hide";hide.dataset.bjHideCard=field;
    hide.setAttribute("aria-label","Hide "+f.title);hide.textContent="×";
    card.appendChild(hide);
    const size=document.createElement("button");size.type="button";
    size.className="bj-layer-resize";size.dataset.bjResize=field;
    size.setAttribute("aria-label","Resize "+f.title+" with drag or shift and arrow keys");
    size.textContent="↘";card.appendChild(size);
    return card;
  }
  function originalDecor(item){
    const node=document.createElement("div");node.className="bj-layer-art-piece";
    node.dataset.bjDeco=item.key;
    node.dataset.bjSprite="deco:"+item.key;
    node.dataset.bjOriginalCrop=item.key;
    if(item.key==="date-tag"){
      node.classList.add("bj-layer-date-piece");
      node.innerHTML='<span class="bj-layer-date-entries"><span id="bjLayerPrintedDate"></span><span id="bjLayerWeekday"></span></span>';
      node.setAttribute("aria-label","Journal date and weekday");
    }else node.setAttribute("aria-hidden","true");
    node.style.left=item.x+"%";node.style.top=item.y+"%";
    return node;
  }
  function renderCards(){
    if(!layout)return;
    // Move textareas out of old frames BEFORE removing frame elements;
    // rebuilding the date also rebuilds the gratitude editor in #bjBookPrompts.
    for(const card of spread.querySelectorAll(".bj-layer-original-frame")){
      const input=$(card,"textarea");
      if(!input)continue;
      if(input.dataset.bjCustomSource){
        const p=layout.cards[input.dataset.bjCustomSource];
        if(p)p.text=input.value;
        input.remove();continue;
      }
      const fresher=input.id==="bjBookPrompt-gratitude"?$(more,'#bjBookPrompts #bjBookPrompt-gratitude'):null;
      if(fresher&&fresher!==input){input.remove();continue;}
      const original=input.__bjLayerOriginalParent;
      if(original?.isConnected)original.appendChild(input);
      else {
        const prompt=input.id==="bjBookPrompt-gratitude"?$(more,'#bjBookPrompts [data-bj-field="gratitude"]'):null;
        (prompt||$(more,"#bjLayerExtras")).appendChild(input);
      }
    }
    for(const side of ["left","right"]){
      const stage=fieldStage(side);if(stage)stage.replaceChildren();
      const backdrop=$(paper(side),".bj-layer-decor");
      if(backdrop){backdrop.replaceChildren();for(const item of DECOR.filter(d=>d.side===side))backdrop.appendChild(originalDecor(item));}
    }
    for(const field of cardKeys()){
      const pos=layout.cards[field];
      if(!pos.visible||!descriptor(field))continue;
      fieldStage(pos.side)?.appendChild(cardNode(field));
    }
    updateArtworkSizes();updateSelection();
  }
  function updateArtworkSizes(){
    if(!spread||!layout)return;
    for(const side of ["left","right"]){
      const page=paper(side);if(!page)continue;
      const width=page.getBoundingClientRect().width||
        spread.getBoundingClientRect().width/2;
      if(!width)continue;
      for(const item of DECOR.filter(d=>d.side===side)){
        const node=$(page,'[data-bj-deco="'+item.key+'"]');
        if(node){
          const art=srcCrop(node,item.crop,item.scale,width);
          if(item.key==="date-tag"){
            const entries=$(node,".bj-layer-date-entries");
            if(entries)entries.style.fontSize=clamp(19*art.px,13,23)+"px";
          }
        }
      }
    }
    for(const field of cardKeys()){
      const f=descriptor(field),pos=layout.cards[field];
      if(!f||!pos)continue;
      const box=$(fieldStage(pos.side),'[data-bj-field="'+field+'"]');
      if(!box)continue;
      const width=paper(pos.side).getBoundingClientRect().width||
        spread.getBoundingClientRect().width/2;
      if(!width)continue;
      const sprite=srcCrop($(box,".bj-layer-frame-crop"),f.crop,f.scale*pos.scale,width);
      const {px,w,h}=sprite;
      box.style.width=w+"px";box.style.height=h+"px";
      box.style.left=pos.x+"%";box.style.top=pos.y+"%";
      box.style.transform="translate(-50%,-50%) rotate("+clampAngle(pos.rotation)+"deg)";
      const edit=$(box,".bj-layer-write-zone");
      const step=f.line*px;
      if(edit){
        // Lines and checkmarks are real DOM controls, not printed into pictures.
        const write=sprite.write||f.write,top=write[1]*h-step*.08;
        edit.style.left=write[0]*100+"%";edit.style.top=top+"px";
        edit.style.width=write[2]*100+"%";
        edit.style.height=(write[3]*h+step*.08)+"px";
      }
      const t=$(box,"textarea");
      if(t){
        t.style.lineHeight=step+"px";
        t.style.fontSize=clamp(step*.70,9,33)+"px";
        t.classList.toggle("bj-layer-source-hidden",pos.mode!=="plain");
      }
      updateLineRows(field,step);
    }
  }

  function queueExtraText(field,text){
    const p=layout?.cards[field];
    if(!p?.custom)return;
    p.text=text;
    if(customSaveTimer)clearTimeout(customSaveTimer);
    const savedDay=day;
    customSaveTimer=setTimeout(()=>{
      if(day===savedDay)saveLayout();
    },700);
  }
  function createExtraCard(template){
    if(!creative||!E[template]||cardKeys().length>=45)return;
    let key;
    do{key="custom-"+Date.now().toString(36)+"-"+(++cardIdCounter).toString(36);}
    while(layout.cards[key]);
    layout.cards[key]={
      template,custom:true,side:activeSide,x:50,y:54,
      scale:.65,rotation:0,mode:defaultMode(template),checks:[],visible:true,text:""
    };
    if(!saveLayout()){delete layout.cards[key];return;}
    selected=key;renderCards();updateMode();
  }

  function setBoxMode(field,mode){
    if(!creative||!descriptor(field)||!BOX_MODES.includes(mode))return;
    if(!window.LifeRPGBulletJournalBook?.save?.())return;
    const old=layout.cards[field].mode;
    layout.cards[field].mode=mode;
    if(!saveLayout()){layout.cards[field].mode=old;return;}
    renderCards();updateMode();
  }

  function syncLinesToSource(field,stack){
    const host=stack.closest(".bj-layer-original-frame");
    const source=$(host,fieldSelector(field));
    if(!source)return;
    const rendered=[...stack.querySelectorAll(".bj-layer-line-input")].map(node=>node.value);
    const leftover=splitText(source.value).slice(rendered.length);
    const content=compactLines([...rendered,...leftover]);
    // Original textarea is the ONLY place the actual journal text is saved.
    // Its existing input listener handles pending writes, rewards, and
    // idempotency exactly as before; this UI has no second write pipeline.
    if(source.value!==content){
      source.value=content;
      source.dispatchEvent(new Event("input",{bubbles:true}));
    }
    stack.dataset.bjSourceValue=content;
  }
  function makeLineRow(field,stack,index,content,step){
    const row=document.createElement("div");row.className="bj-layer-line-row";
    row.dataset.bjRow=String(index);
    const mode=layout.cards[field].mode;
    if(mode==="checklist"){
      const check=document.createElement("input");
      check.type="checkbox";check.className="bj-layer-checkbox";
      check.setAttribute("aria-label","Check off line "+(index+1)+" of "+descriptor(field).title);
      check.checked=layout.cards[field].checks[index]===true;check.disabled=creative;
      check.addEventListener("change",()=>{
        const p=layout.cards[field];p.checks[index]=check.checked;
        if(!saveLayout())check.checked=!check.checked;
      });
      row.appendChild(check);
    }
    const input=document.createElement("input");
    input.type="text";input.className="bj-layer-line-input";
    input.value=content;input.maxLength=2400;
    input.readOnly=creative;
    input.setAttribute("aria-label",descriptor(field).title+" · line "+(index+1));
    input.autocomplete="off";input.spellcheck=true;
    input.addEventListener("input",()=>syncLinesToSource(field,stack));
    input.addEventListener("focusout",()=>{
      const canonical=$(stack.closest(".bj-layer-original-frame"),fieldSelector(field));
      canonical?.dispatchEvent(new FocusEvent("focusout",{bubbles:true}));
    });
    input.addEventListener("keydown",event=>{
      if(event.key!=="Enter")return;
      event.preventDefault();
      let next=row.nextElementSibling?.querySelector(".bj-layer-line-input");
      if(!next&&stack.children.length<maxLines){
        stack.appendChild(makeLineRow(field,stack,stack.children.length,"",step));
        next=stack.lastElementChild.querySelector(".bj-layer-line-input");
      }
      if(next){next.focus();next.scrollIntoView({block:"nearest"});}
      else status("This box is full. Choose a larger box or Blank mode to write more.");
    });
    row.appendChild(input);
    row.style.height=step+"px";
    return row;
  }
  function updateLineRows(field,step){
    const p=layout.cards[field];
    const frame=$(fieldStage(p.side),'[data-bj-field="'+field+'"]');
    if(!frame)return;
    const host=$(frame,".bj-layer-write-zone");
    const source=$(host,fieldSelector(field));
    if(!source)return;
    let stack=$(host,".bj-layer-line-stack");
    source.classList.toggle("bj-layer-source-hidden",p.mode!=="plain");
    if(p.mode==="plain"){
      if(stack)stack.remove();
      source.readOnly=creative;return;
    }
    if(!stack){
      stack=document.createElement("div");
      stack.className="bj-layer-line-stack";
      stack.dataset.bjLines=field;host.appendChild(stack);
    }
    stack.classList.toggle("is-checklist",p.mode==="checklist");
    stack.style.setProperty("--bj-line-height",step+"px");
    stack.style.setProperty("--bj-line-font",clamp(step*.70,9,33)+"px");
    const height=Number.parseFloat(host.style.height)||host.getBoundingClientRect().height||step*3;
    const visible=Math.max(1,Math.floor(height/Math.max(step,1)));
    const text=splitText(source.value);
    const count=Math.min(maxLines,Math.max(visible,Math.min(text.length,maxLines)));
    const mode=stack.dataset.bjMode;
    const oldCount=stack.querySelectorAll(".bj-layer-line-row").length;
    if(mode!==p.mode||oldCount!==count||stack.dataset.bjSourceValue!==source.value){
      stack.replaceChildren();
      for(let i=0;i<count;i++)stack.appendChild(makeLineRow(field,stack,i,text[i]||"",step));
      stack.dataset.bjMode=p.mode;
      stack.dataset.bjSourceValue=source.value;
    }else{
      for(const row of stack.querySelectorAll(".bj-layer-line-row")){
        row.style.height=step+"px";
        const input=$(row,".bj-layer-line-input");
        if(input)input.readOnly=creative;
        const check=$(row,".bj-layer-checkbox");
        if(check)check.disabled=creative;
      }
    }
  }

  function updateLibrary(){
    if(!sideBar||!layout)return;
    const holder=$(sideBar,"#bjLayerLibrary");
    holder.innerHTML=ORDER.map(key=>{
      const f=E[key],pos=layout.cards[key];
      return '<div class="bj-layer-library-tile">'+
        '<button type="button" class="bj-layer-library-item" data-bj-add-card="'+key+'">'+
        '<span class="bj-layer-library-preview" data-bj-preview-frame="'+key+'" aria-hidden="true">✿</span><span>'+esc(f.title)+'</span>'+
        '<small>'+(pos.visible?"Select original":"Restore original")+'</small></button>'+
        '<button type="button" class="bj-layer-library-clone" data-bj-create-card="'+key+'">+ Add another</button></div>';
    }).join("")+
    cardKeys().filter(key=>layout.cards[key].custom).map(key=>{
      const p=layout.cards[key],f=descriptor(key);
      return '<button type="button" class="bj-layer-library-item" data-bj-add-card="'+key+'">'+
        '<span class="bj-layer-library-mini">✿</span><span>'+esc(f.title)+' · extra</span>'+
        '<small>'+(p.visible?"Select box":"Restore hidden box")+'</small></button>';
    }).join("");
    for(const field of ORDER){
      const preview=$(holder,'[data-bj-preview-frame="'+field+'"]');
      const art=sourceAssets["frame:"+field]?.url;
      if(preview&&art){
        preview.textContent="";
        preview.style.backgroundImage='url("'+art+'")';
      }
    }
    const f=descriptor(selected),panel=$(sideBar,"#bjLayerSelected");
    panel.innerHTML=(creative&&f)?'<div class="bj-layer-selected"><strong>'+esc(f.title)+'</strong>'+
      '<div class="bj-layer-modes" role="group" aria-label="Writing style">'+
      BOX_MODES.map(mode=>'<button type="button" data-bj-box-mode="'+mode+'" aria-pressed="'+(layout.cards[selected].mode===mode)+'">'+
        ({plain:"Blank",lined:"Lines",checklist:"Checklist"}[mode])+'</button>').join("")+'</div>'+
      '<label class="bj-layer-scale-label" for="bjLayerScale">Size <strong id="bjLayerScaleValue">'+Math.round(layout.cards[selected].scale*100)+'%</strong></label>'+
      '<input id="bjLayerScale" type="range" data-bj-card-scale min="45" max="155" step="1" value="'+Math.round(layout.cards[selected].scale*100)+'">'+
      '<label class="bj-layer-scale-label" for="bjLayerAngle">Tilt <strong id="bjLayerAngleValue">'+clampAngle(layout.cards[selected].rotation).toFixed(1)+'°</strong></label>'+
      '<input id="bjLayerAngle" type="range" data-bj-card-angle min="-8" max="8" step=".1" value="'+clampAngle(layout.cards[selected].rotation)+'">'+
      (!layout.cards[selected].custom?'<button type="button" data-bj-action-card="default">Restore suggested position & size</button>':'')+
      '<button type="button" data-bj-action-card="other-side">Move to other page</button>'+
      '<button type="button" data-bj-action-card="remove">Remove this box</button></div>':"";
    for(const btn of sideBar.querySelectorAll("[data-bj-choose-side]"))
      btn.setAttribute("aria-pressed",String(btn.dataset.bjChooseSide===activeSide));
    for(const btn of sideBar.querySelectorAll("[data-bj-paper]"))
      btn.setAttribute("aria-pressed",String(btn.dataset.bjPaper===layout.paper[activeSide]));
  }
  function updateSelection(){
    for(const node of spread.querySelectorAll(".bj-layer-original-frame"))
      node.classList.toggle("is-selected",creative&&node.dataset.bjField===selected);
    updateLibrary();
  }
  function updateMode(){
    if(!layout)return;
    spread.classList.toggle("bj-layer-creative",creative);
    spread.dataset.bjEditSide=activeSide;
    for(const side of ["left","right"])paper(side).dataset.bjPaper=layout.paper[side];
    for(const btn of tool.querySelectorAll("[data-bj-layer-mode]"))
      btn.setAttribute("aria-pressed",String((btn.dataset.bjLayerMode==="create")===creative));
    for(const textarea of spread.querySelectorAll(".bj-layer-field"))textarea.readOnly=creative;
    for(const row of spread.querySelectorAll(".bj-layer-line-input"))row.readOnly=creative;
    for(const check of spread.querySelectorAll(".bj-layer-checkbox"))check.disabled=creative;
    updateSelection();
    const atelier=window.LifeRPGJournalAtelier;
    if(creative)atelier?.render?.(day);
    // The opposite page had display:none in the design mode. Its last
    // measured width was 0; force a fresh geometry pass after revealing it,
    // instead of relying on ResizeObserver timing.
    updateArtworkSizes();
    requestAnimationFrame(()=>{if(spread?.isConnected)updateArtworkSizes();});
  }
  function restoreCard(key){
    if(!descriptor(key)||!creative)return;
    const pos=layout.cards[key],f=descriptor(key);
    if(pos.visible){selected=key;activeSide=pos.side;updateMode();return;}
    pos.visible=true;pos.side=activeSide;pos.x=f.x;pos.y=f.y;
    if(saveLayout()){selected=key;renderCards();updateMode();}
  }
  function hideCard(key){
    if(!creative||!descriptor(key)||!layout.cards[key].visible)return;
    if(!window.LifeRPGBulletJournalBook?.save?.())return;
    layout.cards[key].visible=false;selected="";
    if(saveLayout()){renderCards();updateMode();}
  }
  function editSelected(action){
    if(!creative||!descriptor(selected))return;
    if(action==="remove"){hideCard(selected);return;}
    if(action==="default"&&!layout.cards[selected].custom){
      const f=E[selected],p=layout.cards[selected];
      Object.assign(p,{side:f.side,x:f.x,y:f.y,scale:f.defaultScale,rotation:f.angle,visible:true});
      if(saveLayout()){activeSide=p.side;renderCards();updateMode();}
      return;
    }
    if(action!=="other-side")return;
    const pos=layout.cards[selected];
    pos.side=pos.side==="left"?"right":"left";activeSide=pos.side;pos.x=50;pos.y=50;
    if(saveLayout()){renderCards();updateMode();}
  }
  function startDrag(e){
    if(!creative||e.button!==0)return;
    const grip=e.target.closest?.("[data-bj-handle],[data-bj-resize]");if(!grip)return;
    const resizing=Boolean(grip.dataset.bjResize);
    const field=grip.dataset.bjHandle||grip.dataset.bjResize,pos=layout.cards[field];
    const page=paper(pos.side);if(!page)return;
    const rect=page.getBoundingClientRect();
    drag={id:e.pointerId,field,x:pos.x,y:pos.y,scale:pos.scale,resizing,
      clientX:e.clientX,clientY:e.clientY,
      rect,moved:false,element:grip.closest(".bj-layer-original-frame")};
    selected=field;activeSide=pos.side;grip.setPointerCapture?.(e.pointerId);
    updateSelection();e.preventDefault();
  }
  function moveDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.clientX,dy=e.clientY-drag.clientY;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    const p=layout.cards[drag.field];
    if(drag.resizing){
      const relative=Math.max(dx/Math.max(1,drag.element.offsetWidth),dy/Math.max(1,drag.element.offsetHeight));
      p.scale=clampScale(drag.scale*(1+relative));
      updateArtworkSizes();
      return;
    }
    const w=drag.element.offsetWidth,h=drag.element.offsetHeight;
    const left=w/Math.max(1,drag.rect.width)*50+1,top=h/Math.max(1,drag.rect.height)*50+1;
    p.x=clamp(drag.x+dx/Math.max(1,drag.rect.width)*100,left,100-left);
    p.y=clamp(drag.y+dy/Math.max(1,drag.rect.height)*100,top,100-top);
    drag.element.style.left=p.x+"%";drag.element.style.top=p.y+"%";
  }
  function endDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    const moved=drag.moved;drag=null;
    if(moved)saveLayout();updateSelection();
  }
  function keyMove(e){
    if(!creative)return;
    const grip=e.target.closest?.("[data-bj-handle],[data-bj-resize]");if(!grip)return;
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    const delta=directions[e.key];if(!delta&&e.key!=="Delete"&&e.key!=="Backspace"&&e.key!=="+"&&e.key!=="-")return;
    e.preventDefault();e.stopPropagation();
    const key=grip.dataset.bjHandle||grip.dataset.bjResize;
    const p=layout.cards[key],node=grip.closest(".bj-layer-original-frame");
    if(e.key==="Delete"||e.key==="Backspace"){hideCard(key);return;}
    if(e.key==="+"||e.key==="-"||e.shiftKey||grip.dataset.bjResize){
      const change=e.key==="+"?1:e.key==="-"?-1:(delta?.[1]||delta?.[0]||0);
      p.scale=clampScale(p.scale+change*.05);
      selected=key;activeSide=p.side;updateArtworkSizes();saveLayout();updateSelection();grip.focus();return;
    }
    const bounds=paper(p.side).getBoundingClientRect();
    const mx=node.offsetWidth/Math.max(1,bounds.width)*50+1,my=node.offsetHeight/Math.max(1,bounds.height)*50+1;
    p.x=clamp(p.x+delta[0],mx,100-mx);p.y=clamp(p.y+delta[1],my,100-my);
    selected=key;activeSide=p.side;
    node.style.left=p.x+"%";node.style.top=p.y+"%";
    saveLayout();updateSelection();grip.focus();
  }
  function render(nextDay,host=view){
    if(!ready&&host)init(host);
    if(!ready||!nextDay)return;
    const changed=day!==nextDay;
    // Flush independent additional-box drafts before changing dates.
    // The legacy book.save() handles canonical fields separately.
    if(changed&&customSaveTimer)saveLayout();
    day=nextDay;
    if(changed||!layout){layout=stored(day);creative=false;selected="";activeSide="left";}
    const dateObj=new Date(nextDay+"T12:00:00");
    const dateInput=$(tool,"#bjLayerDate");
    dateInput.value=day;
    const today=new Date(),nowKey=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
    dateInput.max=nowKey;
    const next=$(tool,"[data-bj-action='next']");if(next)next.disabled=day>=nowKey;
    renderCards();
    $(spread,"#bjLayerPrintedDate").textContent=new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(dateObj);
    $(spread,"#bjLayerWeekday").textContent=new Intl.DateTimeFormat("en",{weekday:"long"}).format(dateObj);
    $(spread,"#bjLayerMoodText").textContent=String(window.LifeRPGJournal?.getEntry?.(day)?.mood||"choose");
    updateMode();status("Your words save automatically ♡");
  }
  function focusField(field){
    if(!ready)return false;
    const key=E[field]?field:"gratitude";
    if(!layout.cards[key].visible){
      layout.cards[key].visible=true;layout.cards[key].side=E[key].side;
      if(!saveLayout())return false;
      renderCards();
    }
    if(creative){creative=false;updateMode();}
    const input=$(view,E[key].selector);if(!input)return false;
    const card=$(fieldStage(layout.cards[key].side),'[data-bj-field="'+key+'"]');
    const target=$(card,".bj-layer-line-input")||input;
    requestAnimationFrame(()=>{target.scrollIntoView({behavior:"smooth",block:"center"});target.focus({preventScroll:true});});
    return true;
  }
  window.LifeRPGJournalArtSpread={
    version:"0.31.4-illustrated-layers3",init,render,focusField,
    getLayout:()=>layout?JSON.parse(JSON.stringify(layout)):null,
    isCreative:()=>creative,
    _test:{normalize,assetInfo:key=>sourceAssets[key]&&{w:sourceAssets[key].w,h:sourceAssets[key].h},
           splitText,compactLines,clampScale,clampAngle}
  };
})();