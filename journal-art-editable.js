/* Life RPG | layered illustrated daily journal v3.
   The ORIGINAL Jasmine watercolor atlas supplies the authentic hand-drawn
   card frames and illustrations. Crops are separate moveable objects on clean
   paper; the full flattened image is never used as the page background.
   Real existing textarea nodes are moved, never cloned: no extra rewards.
*/
(() => {
  "use strict";
  const app=window.LifeRPGApp;
  if(!app?.getState||!app?.saveState||window.LifeRPGJournalArtSpread)return;
  const $=(root,s)=>root?.querySelector(s);
  const SOURCE={w:1086,h:1448,screenX:35,screenY:20,screenW:870,screenH:1142};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const E={
    gratitude:{title:"Today I'm grateful for…",selector:"#bjBookPrompt-gratitude",side:"left",x:50,y:41,scale:1.60,crop:[50,281,382,249],write:[.195,.255,.725,.64],line:29},
    intentionText:{title:"Today I will…",selector:"#bjExtra-intentionText",side:"left",x:51,y:75,scale:1.60,crop:[45,526,410,213],write:[.132,.295,.44,.62],line:28},
    focusText:{title:"Focus for today",selector:"#bjExtra-focusText",side:"right",x:52,y:27,scale:1.45,crop:[429,380,311,226],write:[.18,.265,.74,.64],line:28},
    happyMomentsText:{title:"Little moments that made me happy",selector:"#bjExtra-happyMomentsText",side:"right",x:46,y:54,scale:1.45,crop:[59,727,285,225],write:[.15,.33,.76,.61],line:29},
    bookNote:{title:"Notes & thoughts",selector:"#bjBookText",side:"right",x:54,y:82,scale:1.45,crop:[630,807,264,259],write:[.15,.255,.76,.66],line:30}
  };
  const ORDER=Object.keys(E);
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
  const screenCrop=(c)=>({
    x:(c[0]-SOURCE.screenX)*SOURCE.w/SOURCE.screenW,
    y:(c[1]-SOURCE.screenY)*SOURCE.h/SOURCE.screenH,
    w:c[2]*SOURCE.w/SOURCE.screenW,
    h:c[3]*SOURCE.h/SOURCE.screenH
  });
  const transparentOriginals=new Map();
  function extractTransparentOriginals(cssAtlas){
    // The original flattened watercolor is read ONCE. Per-element transparent
    // art is then reconstructed entirely in memory: no new third-party image
    // or low-resolution substitute is fetched or saved to player data.
    const match=String(cssAtlas||"").match(/url\(["']?(data:image\/[^"')]+)["']?\)/i);
    if(!match)return;
    const img=new Image();
    img.onerror=()=>{status("Original Jasmine art could not be decoded.");};
    img.onload=()=>{
      try{
        const canvas=document.createElement("canvas");
        canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        if(!ctx)return;
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const tasks=[
          ...ORDER.map(key=>({key:"frame:"+key,crop:E[key].crop})),
          ...DECOR.map(d=>({key:"deco:"+d.key,crop:d.crop}))
        ];
        for(const task of tasks){
          const c=screenCrop(task.crop);
          const x=clamp(Math.floor(c.x),0,canvas.width-1);
          const y=clamp(Math.floor(c.y),0,canvas.height-1);
          const width=clamp(Math.ceil(c.w),1,canvas.width-x);
          const height=clamp(Math.ceil(c.h),1,canvas.height-y);
          const pixels=ctx.getImageData(x,y,width,height);
          const a=pixels.data,hist=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)];
          let samples=0;
          for(let p=0;p<a.length;p+=16){
            hist[0][a[p]]++;hist[1][a[p+1]]++;hist[2][a[p+2]]++;samples++;
          }
          const median=h=>{
            let seen=0;
            for(let k=0;k<256;k++){seen+=h[k];if(seen>=samples/2)return k;}
            return 230;
          };
          const backdrop=hist.map(median);
          for(let iy=0;iy<height;iy++){
            for(let ix=0;ix<width;ix++){
              const p=(iy*width+ix)*4;
              const dr=a[p]-backdrop[0],dg=a[p+1]-backdrop[1],db=a[p+2]-backdrop[2];
              const distance=Math.hypot(dr,dg,db);
              let opacity=clamp((distance-12)/52,0,1);
              // A few neighboring objects were partially visible behind
              // the original printed frame: mask THOSE parts, not its outline.
              const sx=SOURCE.screenX+(x+ix)*SOURCE.screenW/canvas.width;
              const sy=SOURCE.screenY+(y+iy)*SOURCE.screenH/canvas.height;
              if(task.key==="deco:date-tag"&&sx>705&&sx<838&&sy>84&&sy<154)opacity=0;
              if(task.key==="frame:focusText"&&sx>665&&sy<419)opacity=0;
              if(task.key==="deco:moon-window"&&sx<635&&sy>384)opacity=0;
              if(task.key==="deco:tea-and-flowers"&&sx>430&&sy<770)opacity=0;
              if(task.key==="frame:intentionText"&&sx>403&&sy>674)opacity=0;
              if(task.key==="frame:intentionText"&&sx>145&&sy>725)opacity=0;
              if(task.key==="frame:happyMomentsText"&&sx>337)opacity=0;
              a[p+3]=Math.round(255*opacity);
            }
          }
          const sheet=document.createElement("canvas");
          sheet.width=width;sheet.height=height;
          sheet.getContext("2d").putImageData(pixels,0,0);
          transparentOriginals.set(task.key,sheet.toDataURL("image/webp",.95));
        }
        if(spread){spread.classList.add("bj-layer-sprites-ready");updateArtworkSizes();updateLibrary();}
      }catch(error){
        console.warn("Jasmine artwork layers unavailable; preserving original atlas fallback.",error);
      }
    };
    img.src=match[1];
  }

  const defaults=()=>{
    const cards={};
    for(const [key,f] of Object.entries(E))cards[key]={side:f.side,x:f.x,y:f.y,visible:true};
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
        visible:c.visible!==false
      };
    }
    return p;
  }
  function stored(day){return normalize(app.getState().journalPageLayoutV3?.daily?.[day]);}
  let view=null,spread=null,tool=null,sideBar=null,more=null,source=null;
  let day="",layout=null,creative=false,activeSide="left",selected="",drag=null;
  let resizeObserver=null,ready=false;

  function srcCrop(el,screenRect,scale,pageWidth){
    const c=screenCrop(screenRect),px=pageWidth/SOURCE.w*scale;
    el.style.width=(c.w*px)+"px";el.style.height=(c.h*px)+"px";
    const isolated=transparentOriginals.get(el.dataset.bjSprite);
    if(isolated){
      el.style.backgroundImage='url("'+isolated+'")';
      el.style.backgroundSize="100% 100%";
      el.style.backgroundPosition="center center";
      el.style.webkitMaskImage="none";el.style.maskImage="none";
    }else{
      el.style.backgroundImage="";
      el.style.backgroundSize=(SOURCE.w*px)+"px "+(SOURCE.h*px)+"px";
      el.style.backgroundPosition=(-c.x*px)+"px "+(-c.y*px)+"px";
      el.style.webkitMaskImage="";el.style.maskImage="";
    }
    return {c,px};
  }
  function paper(side){return $(spread,'[data-bj-page="'+side+'"]');}
  function fieldStage(side){return $(paper(side),".bj-layer-card-stage");}
  function saveLayout(){
    if(!day||!layout)return false;
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
    source=document.createElement("div");
    source.id="bjArtPaper";source.className="bj-layer-asset-source";
    source.setAttribute("aria-hidden","true");spread.appendChild(source);
    // journal-art-background-v2.css contains the original high-quality
    // watercolor artwork, which we reuse as a single cropped asset atlas.
    const atlas=getComputedStyle(source).backgroundImage;
    if(!atlas||atlas==="none"){source.remove();return;}
    spread.style.setProperty("--bj-original-atlas",atlas);
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
      const card=e.target.closest?.("[data-bj-add-card]");
      if(card){restoreCard(card.dataset.bjAddCard);return;}
      const act=e.target.closest?.("[data-bj-action-card]");
      if(act){editSelected(act.dataset.bjActionCard);return;}
      const paperButton=e.target.closest?.("[data-bj-paper]");
      if(paperButton&&layout){layout.paper[activeSide]=paperButton.dataset.bjPaper==="plain"?"plain":"jasmine";if(saveLayout())updateMode();}
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
    extractTransparentOriginals(atlas);
    // Keep crops crisp at all viewport sizes; downscale original artwork,
    // never enlarge tiny thumbnail files.
    if(typeof ResizeObserver!=="undefined"){
      resizeObserver=new ResizeObserver(()=>{if(layout)updateArtworkSizes();});
      resizeObserver.observe(paper("left"));resizeObserver.observe(paper("right"));
    }
  }
  function originalInput(field){
    if(field==="gratitude"){
      // The book regenerates this prompt on each date, so the *new* original
      // must be preferred over a detached old textarea.
      return $(more,"#bjBookPrompt-gratitude")||$(spread,"#bjBookPrompt-gratitude");
    }
    return $(view,E[field].selector);
  }
  function cardNode(field){
    const f=E[field],card=document.createElement("section");
    card.className="bj-layer-original-frame";
    card.dataset.bjField=field;
    card.setAttribute("aria-label",f.title);
    const visual=document.createElement("div");visual.className="bj-layer-frame-crop";
    visual.dataset.bjSprite="frame:"+field;
    visual.setAttribute("aria-hidden","true");card.appendChild(visual);
    const body=document.createElement("div");body.className="bj-layer-write-zone";
    const input=originalInput(field);
    if(input){
      input.classList.add("bj-layer-field");
      input.dataset.bjArt=field;input.setAttribute("aria-label",f.title);
      if(input.tagName==="TEXTAREA")input.placeholder="";
      if(!input.__bjLayerOriginalParent)input.__bjLayerOriginalParent=input.parentElement;
      input.readOnly=creative;
      body.appendChild(input);
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
    for(const field of ORDER){
      const pos=layout.cards[field];
      if(!pos.visible)continue;
      fieldStage(pos.side)?.appendChild(cardNode(field));
    }
    updateArtworkSizes();updateSelection();
  }
  function updateArtworkSizes(){
    if(!spread||!layout)return;
    for(const side of ["left","right"]){
      const page=paper(side);if(!page)continue;
      const width=page.getBoundingClientRect().width;if(!width)return;
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
    for(const [field,f] of Object.entries(E)){
      const pos=layout.cards[field],box=$(fieldStage(pos.side),'[data-bj-field="'+field+'"]');
      if(!box)continue;
      const width=paper(pos.side).getBoundingClientRect().width;
      const px=srcCrop($(box,".bj-layer-frame-crop"),f.crop,f.scale,width).px;
      const c=screenCrop(f.crop),w=c.w*px,h=c.h*px;
      box.style.width=w+"px";box.style.height=h+"px";
      box.style.left=pos.x+"%";box.style.top=pos.y+"%";
      const edit=$(box,".bj-layer-write-zone");
      if(edit){
        edit.style.left=f.write[0]*100+"%";edit.style.top=f.write[1]*100+"%";
        edit.style.width=f.write[2]*100+"%";edit.style.height=f.write[3]*100+"%";
      }
      const t=$(box,"textarea");
      if(t){
        const step=f.line*SOURCE.h/SOURCE.screenH*px;
        t.style.lineHeight=step+"px";
        t.style.fontSize=clamp(step*.78,14,25)+"px";
      }
    }
  }
  function updateLibrary(){
    if(!sideBar||!layout)return;
    const holder=$(sideBar,"#bjLayerLibrary");
    holder.innerHTML=ORDER.map(key=>{
      const f=E[key],pos=layout.cards[key];
      return '<button type="button" class="bj-layer-library-item" data-bj-add-card="'+key+'">'+
        '<span class="bj-layer-library-preview" data-bj-preview-frame="'+key+'" aria-hidden="true">✿</span><span>'+esc(f.title)+'</span>'+
        '<small>'+(pos.visible?"On "+pos.side+" page":"Add original box")+'</small></button>';
    }).join("");
    for(const field of ORDER){
      const preview=$(holder,'[data-bj-preview-frame="'+field+'"]');
      const art=transparentOriginals.get("frame:"+field);
      if(preview&&art){
        preview.textContent="";
        preview.style.backgroundImage='url("'+art+'")';
      }
    }
    const f=E[selected],panel=$(sideBar,"#bjLayerSelected");
    panel.innerHTML=(creative&&f)?'<div class="bj-layer-selected"><strong>'+esc(f.title)+'</strong>'+
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
    updateSelection();
    const atelier=window.LifeRPGJournalAtelier;
    if(creative)atelier?.render?.(day);
  }
  function restoreCard(key){
    if(!E[key]||!creative)return;
    const pos=layout.cards[key],f=E[key];
    if(pos.visible){selected=key;activeSide=pos.side;updateMode();return;}
    pos.visible=true;pos.side=activeSide;pos.x=f.x;pos.y=f.y;
    if(saveLayout()){selected=key;renderCards();updateMode();}
  }
  function hideCard(key){
    if(!creative||!E[key]||!layout.cards[key].visible)return;
    if(!window.LifeRPGBulletJournalBook?.save?.())return;
    layout.cards[key].visible=false;selected="";
    if(saveLayout()){renderCards();updateMode();}
  }
  function editSelected(action){
    if(!creative||!E[selected])return;
    if(action==="remove"){hideCard(selected);return;}
    if(action!=="other-side")return;
    const pos=layout.cards[selected];
    pos.side=pos.side==="left"?"right":"left";activeSide=pos.side;pos.x=50;pos.y=50;
    if(saveLayout()){renderCards();updateMode();}
  }
  function startDrag(e){
    if(!creative||e.button!==0)return;
    const grip=e.target.closest?.("[data-bj-handle]");if(!grip)return;
    const field=grip.dataset.bjHandle,pos=layout.cards[field];
    const page=paper(pos.side);if(!page)return;
    const rect=page.getBoundingClientRect();
    drag={id:e.pointerId,field,x:pos.x,y:pos.y,clientX:e.clientX,clientY:e.clientY,
      rect,moved:false,element:grip.closest(".bj-layer-original-frame")};
    selected=field;activeSide=pos.side;grip.setPointerCapture?.(e.pointerId);
    updateSelection();e.preventDefault();
  }
  function moveDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.clientX,dy=e.clientY-drag.clientY;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    const p=layout.cards[drag.field],w=drag.element.offsetWidth,h=drag.element.offsetHeight;
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
    const grip=e.target.closest?.("[data-bj-handle]");if(!grip)return;
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    const delta=directions[e.key];if(!delta&&e.key!=="Delete"&&e.key!=="Backspace")return;
    e.preventDefault();e.stopPropagation();
    const key=grip.dataset.bjHandle;
    if(!delta){hideCard(key);return;}
    const p=layout.cards[key],node=grip.closest(".bj-layer-original-frame");
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
    requestAnimationFrame(()=>{input.scrollIntoView({behavior:"smooth",block:"center"});input.focus({preventScroll:true});});
    return true;
  }
  window.LifeRPGJournalArtSpread={
    version:"0.31.4-illustrated-layers3",init,render,focusField,
    getLayout:()=>layout?JSON.parse(JSON.stringify(layout)):null,
    isCreative:()=>creative,
    _test:{normalize,screenCrop}
  };
})();