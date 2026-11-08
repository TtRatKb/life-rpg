/* Life RPG · original illustrated daily journal canvas. The real existing inputs
   are MOVED onto the art, never mirrored: one input = one save/reward pipeline. */
(() => {
  "use strict";
  const $=(root,selector)=>root?.querySelector(selector);
  const inputTargets={
    gratitude:"#bjBookPrompt-gratitude",
    focusText:"#bjExtra-focusText",
    intentionText:"#bjExtra-intentionText",
    happyMomentsText:"#bjExtra-happyMomentsText",
    bookNote:"#bjBookText"
  };
  const friendly={
    gratitude:"Today I'm grateful for",
    focusText:"Focus for today",
    intentionText:"Today I will",
    happyMomentsText:"Little moments that made me happy",
    bookNote:"Notes & thoughts"
  };
  let root=null,art=null,more=null,status=null,activeDate="",viewMode="overview";
  // Stable, independent art identifiers. The current illustrated paper still
  // contains its printed motifs; movable additions can use this separate layer
  // later without cropping the reference art or changing journal save records.
  const assetCatalog=Object.freeze([
    Object.freeze({id:"journal-jasmine-bouquet-v2",src:"assets/journal/illustrations/jasmine-bouquet-v2.webp",x:7,y:3,width:22}),
    Object.freeze({id:"journal-moon-window-v2",src:"assets/journal/illustrations/moon-window-v2.webp",x:65,y:16,width:25}),
    Object.freeze({id:"journal-flower-teacup-v2",src:"assets/journal/illustrations/flower-teacup-v2.webp",x:36,y:60,width:21})
  ]);
  const ART_WIDTH=1086;
  function setViewMode(mode,focusTarget=null){
    if(!root||!art)return;
    viewMode=mode==="writing"?"writing":"overview";
    const scroller=$(root,".bj-art-scroller");
    if(!scroller)return;
    // CSS zoom scales the *layout box*, not just its bitmap; no cropped right half.
    // Writing uses native-size text, avoiding tiny mobile keyboard input.
    const fit=Math.min(1,Math.max(.1,(scroller.clientWidth||window.innerWidth)/ART_WIDTH));
    art.style.zoom=String(viewMode==="overview"?fit:1);
    const spread=$(root,"#bjBookDailySpread");
    if(spread)spread.dataset.bjView=viewMode;
    root.querySelectorAll("[data-bj-mode]").forEach(button=>{
      button.setAttribute("aria-pressed",String(button.dataset.bjMode===viewMode));
    });
    if(viewMode==="overview")scroller.scrollLeft=0;
    if(focusTarget && viewMode==="writing"){
      requestAnimationFrame(()=>{
        const item=focusTarget.getBoundingClientRect(),box=scroller.getBoundingClientRect();
        scroller.scrollLeft+=item.left-box.left+item.width/2-box.width/2;
      });
    }
  }
  function synchronizeChrome(event){
    const active=event?.detail?.view==="bullet-journal";
    document.body.classList.toggle("bj-art-immersive",active);
    if(active)requestAnimationFrame(()=>setViewMode(viewMode));
  }
  function createFieldSlot(field){
    const box=document.createElement("div");
    box.className="bj-art-slot";
    box.dataset.bjArt=field;
    box.style.cssText="position:absolute;inset:0;pointer-events:none";
    // The slot itself is just a logical container; its field receives positioning.
    return box;
  }
  function init(view){
    const spread=$(view,"#bjBookDailySpread");
    if(!spread || spread.classList.contains("bj-art-enabled"))return;
    const toolbar=document.createElement("nav");
    toolbar.className="bj-art-toolbar";
    toolbar.setAttribute("aria-label","Journal page and chapters");
    toolbar.innerHTML='<div class="bj-art-controls">'+
      '<button type="button" data-bj-chapter="daily" aria-current="page">✿ Days</button>'+
      '<button type="button" data-bj-chapter="weekly">▦ Weeks</button>'+
      '<button type="button" data-bj-chapter="monthly">☾ Months</button>'+
      '<button type="button" data-bj-chapter="collections">✧ Collections</button></div>'+
      '<div class="bj-art-controls">'+
      '<button type="button" data-bj-action="prev" aria-label="Previous day">‹</button>'+
      '<input type="date" id="bjArtDate" aria-label="Choose journal date">'+
      '<button type="button" data-bj-action="next" aria-label="Next day">›</button>'+
      '<button type="button" data-bj-action="today">Today</button></div>';
    const viewControls=document.createElement("div");
    viewControls.className="bj-art-view-controls";
    viewControls.setAttribute("role","group");
    viewControls.setAttribute("aria-label","Journal page zoom");
    viewControls.innerHTML='<button type="button" data-bj-mode="overview" aria-pressed="true">▣ Entire page</button>'+
      '<button type="button" data-bj-mode="writing" aria-pressed="false">✎ Write comfortably</button>';
    const fieldControls=document.createElement("nav");
    fieldControls.className="bj-art-field-controls";
    fieldControls.setAttribute("aria-label","Jump to a writing area");
    fieldControls.innerHTML=Object.entries(friendly).map(([field,label])=>
      '<button type="button" data-bj-jump="'+field+'">'+label+'</button>').join("");
    toolbar.append(viewControls);
    const scroller=document.createElement("div");
    scroller.className="bj-art-scroller";
    art=document.createElement("div");
    art.id="bjArtPaper";
    art.setAttribute("aria-label","Illustrated Jasmine journal page with editable writing areas");
    art.innerHTML='<span class="bj-art-date" id="bjArtDateText"></span>'+
      '<span class="bj-art-day" id="bjArtDayText"></span>'+
      '<button type="button" class="bj-art-mood" id="bjArtMood" title="Edit today’s mood" aria-label="Edit today’s mood"></button>'+
      '<span class="bj-art-mood-current" id="bjArtMoodText" aria-live="polite"></span>';
    const decorationLayer=document.createElement("div");
    decorationLayer.className="bj-art-decoration-layer";
    decorationLayer.setAttribute("aria-hidden","true");
    decorationLayer.dataset.assetKeys=assetCatalog.map(item=>item.id).join(" ");
    art.appendChild(decorationLayer);
    for(const field of Object.keys(inputTargets)){
      const slot=document.createElement("div");
      slot.className="bj-art-target";
      slot.dataset.artSlot=field;
      // Wrapper has display:contents, so field itself positions against the paper.
      slot.style.display="contents";
      art.appendChild(slot);
    }
    scroller.appendChild(art);
    status=document.createElement("div");
    status.className="bj-art-status";
    status.id="bjArtSaveStatus";
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");
    status.textContent="Write directly on the page. Entries save automatically. ♡";
    more=document.createElement("details");
    more.className="bj-art-more";
    more.innerHTML='<summary>✦ More reflections, rewards & decorations</summary>'+
      '<div class="bj-art-extra-area" id="bjArtExtraArea"></div>';
    spread.prepend(toolbar,fieldControls,scroller,status,more);
    const extras=$(more,"#bjArtExtraArea");
    for(const selector of ["#bjBookPrompts","#bjAtelierMount","#bjBookDailyMini",".bj-book-recorded-details",".bj-book-edit"]){
      const node=$(spread,selector);
      if(node)extras.appendChild(node);
    }
    viewControls.addEventListener("click",event=>{
      const button=event.target.closest("[data-bj-mode]");
      if(button)setViewMode(button.dataset.bjMode);
    });
    fieldControls.addEventListener("click",event=>{
      const button=event.target.closest("[data-bj-jump]");
      if(button)focusField(button.dataset.bjJump);
    });
    window.addEventListener("resize",()=>{if(viewMode==="overview")setViewMode("overview");},{passive:true});
    if(window.ResizeObserver)new ResizeObserver(()=>{if(viewMode==="overview")setViewMode("overview");}).observe(scroller);
    window.addEventListener("life-rpg:view-changed",synchronizeChrome);
    const dateInput=$(toolbar,"#bjArtDate");
    dateInput.addEventListener("change",()=>{
      const selected=dateInput.value;
      if(!window.LifeRPGBulletJournalBook?.changeDate?.(selected))dateInput.value=activeDate;
    });
    $(art,"#bjArtMood").addEventListener("click",()=>{
      if(!window.LifeRPGBulletJournalBook?.save?.())return;
      window.LifeRPGJournal?.openDayEditor?.(activeDate);
    });
    art.addEventListener("focusin",event=>{
      if(event.target.matches(".bj-art-field")){
        if(viewMode!=="writing")setViewMode("writing",event.target);
        updateStatus(event.target,true);
      }
    });
    art.addEventListener("input",event=>{
      if(event.target.matches(".bj-art-field"))updateStatus(event.target,true);
    });
    art.addEventListener("focusout",event=>{
      if(!event.target.matches(".bj-art-field"))return;
      // Real existing blur handlers on the book save through the canonical code.
      setTimeout(()=>updateStatus(event.target,false),70);
    });
    // Scoped fallback: if this module does not run, keep the previous book visible.
    spread.classList.add("bj-art-enabled");
    root=view;
  }
  function updateStatus(fieldEl,editing){
    if(!fieldEl||!status)return;
    const field=fieldEl.dataset.bjArt;
    const amount=fieldEl.value.length;
    if(field==="gratitude"){
      const preview=window.LifeRPGJournal?.getReflectionRewardPreview?.(activeDate,field,fieldEl.value);
      if(preview){
        status.textContent=preview.historical
          ? friendly[field]+" · "+amount+" characters · older days do not grant backdated bonuses"
          : friendly[field]+" · "+amount+" characters · "+preview.remaining+" until next writing reward · "+(editing?"Writing…":"Saved ✓");
        return;
      }
    }
    status.textContent=friendly[field]+" · "+amount+" characters · "+(editing?"Writing…":"Saved ✓");
  }
  function render(date,view=root){
    if(!view)return;
    if(!root)init(view);
    activeDate=date;
    const dateEl=$(view,"#bjArtDate");
    if(dateEl){dateEl.value=date;dateEl.max=window.LifeRPGBulletJournalBook?.getDate?.()||date;}
    const [year,month,day]=date.split("-").map(Number);
    const d=new Date(year,month-1,day,12);
    const printedDate=new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(d);
    const weekday=new Intl.DateTimeFormat("en",{weekday:"long"}).format(d);
    $(art,"#bjArtDateText").textContent=printedDate;
    $(art,"#bjArtDayText").textContent=weekday;
    const mood=window.LifeRPGJournal?.getEntry?.(date)?.mood;
    $(art,"#bjArtMoodText").textContent=mood?"Today: "+String(mood):"";
    const next=$(view,".bj-art-toolbar [data-bj-action='next']");
    if(next){const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");next.disabled=date>=today;}
    for(const [field,selector] of Object.entries(inputTargets)){
      const target=$(art,'[data-art-slot="'+field+'"]');
      // renderPrompts() rebuilds its editor, so prefer that fresh element
      // rather than the old moved input with the same ID in the art slot.
      const input=field==="gratitude" ? ($(more,selector)||$(view,selector)) : $(view,selector);
      if(!target)continue;
      if(!input){target.replaceChildren();continue;}
      // Old field is the actual editor. Never create a second competing save.
      target.replaceChildren(input);
      input.classList.add("bj-art-field");
      input.dataset.bjArt=field;
      input.setAttribute("aria-label",friendly[field]);
      if(input.tagName==="TEXTAREA")input.placeholder="";
    }
    if(status)status.textContent="Write directly on the page. Entries save automatically. ♡";
    requestAnimationFrame(()=>setViewMode(viewMode));
  }
  function focusField(field){
    if(!root)return false;
    const target=$(root,field?inputTargets[field]||"#bjBookPrompt-"+field:inputTargets.gratitude);
    if(!target)return false;
    if(!target.closest("#bjArtPaper")&&more)more.open=true;
    if(target.closest("#bjArtPaper"))setViewMode("writing",target);
    requestAnimationFrame(()=>{
      target.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
      target.focus({preventScroll:true});
      if(target.closest("#bjArtPaper"))setViewMode("writing",target);
    });
    return true;
  }
  window.LifeRPGJournalArtSpread={init,render,focusField,
    // Asset metadata only: separate artwork layer and stable IDs are ready,
    // but do not pretend that drag/drop or new save writes are implemented.
    assets:assetCatalog
  };
})();