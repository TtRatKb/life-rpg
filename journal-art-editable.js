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
  let root=null,art=null,reflectionPaper=null,more=null,status=null,activeDate="",viewMode="overview",currentPage=1,inkDelta=0,lastFocusedField="gratitude";
  const reflectionFields=["smallWin","hardThing","yearQuestion"];
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
    if(reflectionPaper)reflectionPaper.style.zoom=art.style.zoom;
    const spread=$(root,"#bjBookDailySpread");
    if(spread)spread.dataset.bjView=viewMode;
    root.querySelectorAll("[data-bj-mode]").forEach(button=>{
      button.setAttribute("aria-pressed",String(button.dataset.bjMode===viewMode));
    });
    if(viewMode==="overview"){
      scroller.scrollLeft=0;
      const jumps=$(root,".bj-art-field-controls");
      if(jumps)jumps.scrollLeft=0;
    }
    if(focusTarget && viewMode==="writing"){
      requestAnimationFrame(()=>centerWritingField(focusTarget));
    }
  }
  function centerWritingField(field){
    const scroller=$(root,".bj-art-scroller");
    if(!scroller||!field?.closest("#bjArtPaper, #bjArtReflectionPaper"))return;
    // Use paper-relative geometry, not a scrollIntoView animation which can
    // undo the horizontal alignment while the keyboard is opening.
    const left=field.offsetLeft+(field.offsetWidth-scroller.clientWidth)/2;
    scroller.scrollLeft=Math.max(0,Math.min(scroller.scrollWidth-scroller.clientWidth,left));
  }
  function showPage(number){
    currentPage=number===2?2:1;
    if(art)art.hidden=currentPage!==1;
    if(reflectionPaper)reflectionPaper.hidden=currentPage!==2;
    root?.querySelectorAll("[data-bj-page]").forEach(button=>{
      button.setAttribute("aria-current",button.dataset.bjPage===String(currentPage)?"page":"false");
    });
    const nav=root?.querySelector("#bjArtPageCount");
    if(nav)nav.textContent="Page "+currentPage+" of 2 · same day";
    setViewMode(viewMode);
    if(currentPage===2)requestAnimationFrame(()=>adjustVisibleInk());
  }
  function inkSize(field){
    const onArt=Boolean(field.closest("#bjArtPaper"));
    return Math.max(12,Math.min(onArt?19:26,(onArt?17:22)+inkDelta));
  }
  function fitInk(field){
    if(!field?.classList.contains("bj-art-field")||!field.clientHeight)return;
    const isArt=Boolean(field.closest("#bjArtPaper"));
    let size=inkSize(field);
    field.style.setProperty("--bj-ink-size",size+"px");
    if(!isArt)field.style.setProperty("--bj-ink-line",Math.round(size*1.55)+"px");
    // Use the existing textarea and its full value. Long answers remain
    // scrollable even after the handwriting reaches its readable minimum.
    for(let n=0;n<15&&size>12&&field.scrollHeight>field.clientHeight+3;n++){
      size-=1;
      field.style.setProperty("--bj-ink-size",size+"px");
      if(!isArt)field.style.setProperty("--bj-ink-line",Math.round(size*1.55)+"px");
    }
  }
  function adjustVisibleInk(){
    root?.querySelectorAll(".bj-art-field").forEach(fitInk);
  }
  function setInkDelta(next){
    inkDelta=Math.max(-5,Math.min(3,next));
    adjustVisibleInk();
    const indicator=root?.querySelector("#bjArtInkScale");
    if(indicator)indicator.textContent="Ink "+(inkDelta>0?"+":"")+inkDelta;
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
    const pageControls=document.createElement("nav");
    pageControls.className="bj-art-page-controls";
    pageControls.setAttribute("aria-label","Two pages for each journal day");
    pageControls.innerHTML='<button type="button" data-bj-page="1" aria-current="page">① Illustrated day</button>'+
      '<button type="button" data-bj-page="2" aria-current="false">② Reflections</button>'+
      '<span id="bjArtPageCount">Page 1 of 2 · same day</span>';
    const inkControls=document.createElement("details");
    inkControls.className="bj-art-ink-controls";
    inkControls.innerHTML='<summary>✎ Handwriting & extra space</summary>'+
      '<div class="bj-art-ink-buttons"><span>Ink size</span>'+
      '<button type="button" data-bj-ink="-1" aria-label="Write smaller">A−</button>'+
      '<output id="bjArtInkScale" aria-live="polite">Ink 0</output>'+
      '<button type="button" data-bj-ink="1" aria-label="Write larger">A+</button>'+
      '<button type="button" data-bj-large-editor>↗ Large writing space</button></div>';
    pageControls.append(inkControls);
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
    reflectionPaper=document.createElement("section");
    reflectionPaper.id="bjArtReflectionPaper";
    reflectionPaper.hidden=true;
    reflectionPaper.setAttribute("aria-label","Second illustrated daily journal page: original reflections");
    reflectionPaper.innerHTML='<span class="bj-reflection-page-caption">✦ LITTLE THINGS I WANT TO KEEP ✦</span>'+
      '<h2 class="bj-reflection-page-title">the rest of today</h2>'+
      '<span id="bjReflectionDate" class="bj-reflection-page-date"></span>'+
      '<img class="bj-reflection-bouquet" src="assets/journal/illustrations/jasmine-bouquet-v2.webp" alt="" aria-hidden="true">'+
      '<img class="bj-reflection-teacup" src="assets/journal/illustrations/flower-teacup-v2.webp" alt="" aria-hidden="true">'+
      '<section class="bj-reflection-mood"><span>♡ mood today · from Daily Plan</span>'+
      '<strong id="bjReflectionMoodValue">Not checked in</strong>'+
      '<small id="bjReflectionCompanion"></small>'+
      '<button type="button" data-bj-mood-edit>View or edit check-in ↗</button></section>'+
      '<p class="bj-reflection-page-footer">A good day, a hard day, an ordinary day — all worth a page. ♡</p>';
    for(const field of reflectionFields){
      const region=document.createElement("div");
      region.className="bj-art-reflection-region";
      region.dataset.artCard=field;
      reflectionPaper.appendChild(region);
    }
    scroller.appendChild(reflectionPaper);
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
    spread.prepend(toolbar,pageControls,fieldControls,scroller,status,more);
    const largeEditor=document.createElement("dialog");
    largeEditor.id="bjArtLargeEditor";
    largeEditor.className="bj-art-large-editor";
    largeEditor.setAttribute("aria-label","Large handwriting editor");
    largeEditor.innerHTML='<div class="bj-art-large-toolbar"><strong id="bjArtLargeTitle">Write freely</strong>'+
      '<button type="button" data-bj-large-close aria-label="Return to journal page">Done ✓</button></div>'+
      '<p>The same saved field, only with more space. Nothing gets copied or shortened.</p>'+
      '<div id="bjArtLargeMount"></div>';
    spread.appendChild(largeEditor);
    let largeOriginalParent=null,largeInput=null;
    const closeLarge=()=>{
      if(largeInput&&largeOriginalParent){
        largeOriginalParent.appendChild(largeInput);
        fitInk(largeInput);
      }
      largeOriginalParent=null;largeInput=null;
      if(largeEditor.open)largeEditor.close();
    };
    largeEditor.addEventListener("close",()=>{
      if(largeInput&&largeOriginalParent){largeOriginalParent.appendChild(largeInput);fitInk(largeInput);}
      largeInput=null;largeOriginalParent=null;
    });
    largeEditor.addEventListener("cancel",event=>{event.preventDefault();closeLarge();});
    largeEditor.querySelector("[data-bj-large-close]").addEventListener("click",closeLarge);
    const openLarge=()=>{
      if(largeEditor.open)return;
      const field=lastFocusedField;
      const selector=inputTargets[field]||"#bjBookPrompt-"+field;
      const input=$(root||view,selector);
      if(!input||!input.matches("textarea"))return;
      largeOriginalParent=input.parentElement;largeInput=input;
      largeEditor.querySelector("#bjArtLargeTitle").textContent=friendly[field]||"Write freely";
      largeEditor.querySelector("#bjArtLargeMount").appendChild(input);
      largeEditor.showModal();
      input.focus();
    };
    spread.addEventListener("bj-art-before-render",closeLarge);
    const extras=$(more,"#bjArtExtraArea");
    for(const selector of ["#bjBookPrompts","#bjAtelierMount","#bjBookDailyMini",".bj-book-recorded-details",".bj-book-edit"]){
      const node=$(spread,selector);
      if(node)extras.appendChild(node);
    }
    pageControls.addEventListener("click",event=>{
      const page=event.target.closest("[data-bj-page]");
      if(page){showPage(Number(page.dataset.bjPage));return;}
      const ink=event.target.closest("[data-bj-ink]");
      if(ink){setInkDelta(inkDelta+Number(ink.dataset.bjInk));return;}
      if(event.target.closest("[data-bj-large-editor]"))openLarge();
    });
    $(reflectionPaper,"[data-bj-mood-edit]").addEventListener("click",()=>{
      if(window.LifeRPGBulletJournalBook?.save?.()!==false)
        window.LifeRPGJournal?.openDayEditor?.(activeDate);
    });
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
    // The document's book logic owns date and chapter navigation. No new
    // reward, calendar or cloud-write semantics are introduced here.
    const dateInput=$(toolbar,"#bjArtDate");
    dateInput.addEventListener("change",()=>{
      const selected=dateInput.value;
      if(!window.LifeRPGBulletJournalBook?.changeDate?.(selected))dateInput.value=activeDate;
    });
    $(art,"#bjArtMood").addEventListener("click",()=>{
      if(!window.LifeRPGBulletJournalBook?.save?.())return;
      window.LifeRPGJournal?.openDayEditor?.(activeDate);
    });
    scroller.addEventListener("focusin",event=>{
      if(event.target.matches(".bj-art-field")){
        lastFocusedField=event.target.dataset.bjArt;
        if(viewMode!=="writing")setViewMode("writing",event.target);
        updateStatus(event.target,true);
      }
    });
    scroller.addEventListener("input",event=>{
      if(event.target.matches(".bj-art-field")){
        fitInk(event.target);
        updateStatus(event.target,true);
      }
    });
    scroller.addEventListener("focusout",event=>{
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
    const entry=window.LifeRPGJournal?.getEntry?.(date)||{};
    const plannerDay=window.LifeRPGApp?.getState?.()?.dailyPlanner?.days?.[date];
    const mood=plannerDay?.checkIn?.mood||entry.mood;
    const moods={rough:["☂","Rough"],meh:["☁","Meh"],okay:["✿","Okay"],good:["❀","Good"],great:["☀","Great"]};
    const moodText=moods[mood]?.[1]||"Not checked in";
    $(art,"#bjArtMoodText").textContent=mood?"Today: "+moodText:"";
    $(reflectionPaper,"#bjReflectionMoodValue").textContent=(moods[mood]?.[0]||"♡")+" "+moodText;
    const companion=plannerDay?.companion?.id;
    const names={kirishima:"Kirishima",bakugo:"Bakugo",mina:"Mina",luca:"Luca"};
    $(reflectionPaper,"#bjReflectionCompanion").textContent=mood
      ? "Your Daily Plan check-in"+(names[companion]?" · with "+names[companion]:"")
      : "Your Daily Plan check-in will appear here";
    $(reflectionPaper,"#bjReflectionDate").textContent=printedDate+" · "+weekday;
    const next=$(view,".bj-art-toolbar [data-bj-action='next']");
    if(next){const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");next.disabled=date>=today;}
    $(view,"#bjBookDailySpread")?.dispatchEvent(new Event("bj-art-before-render"));
    for(const [field,selector] of Object.entries(inputTargets)){
      if(reflectionFields.includes(field))continue;
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
    // Move complete canonical prompt cards (including changing question,
    // save-status and read-only locked answers) to the second page.
    for(const field of reflectionFields){
      const target=$(reflectionPaper,'[data-art-card="'+field+'"]');
      const card=$(more,'#bjBookPrompts [data-bj-field="'+field+'"]');
      if(card){
        target.replaceChildren(card);
        const input=$(card,"textarea");
        if(input){
          input.classList.add("bj-art-field");
          input.dataset.bjArt=field;
          input.setAttribute("aria-label",friendly[field]);
          input.placeholder="";
        }
      }else{
        const locked=field==="yearQuestion"&&window.LifeRPGJournal?.isReflectionUnlocked?.(field)===false;
        target.replaceChildren();
        if(locked){
          const message=document.createElement("p");
          message.className="bj-reflection-locked";
          message.textContent="365 Question Journal · available with your existing Health Talent unlock.";
          target.appendChild(message);
        }
      }
    }
    if(status)status.textContent="Write directly on the page. Entries save automatically. ♡";
    requestAnimationFrame(()=>{setViewMode(viewMode);adjustVisibleInk();});
  }
  function focusField(field){
    if(!root)return false;
    const target=$(root,field?inputTargets[field]||"#bjBookPrompt-"+field:inputTargets.gratitude);
    if(!target)return false;
    const onPaper=Boolean(target.closest("#bjArtPaper, #bjArtReflectionPaper"));
    if(target.closest("#bjArtReflectionPaper"))showPage(2);
    else if(target.closest("#bjArtPaper"))showPage(1);
    else if(more)more.open=true;
    if(onPaper)setViewMode("writing");
    requestAnimationFrame(()=>{
      target.focus({preventScroll:true});
      target.scrollIntoView({behavior:"instant",block:"center",inline:"nearest"});
      if(onPaper)requestAnimationFrame(()=>centerWritingField(target));
    });
    return true;
  }
  window.LifeRPGJournalArtSpread={init,render,focusField,
    // Asset metadata only: separate artwork layer and stable IDs are ready,
    // but do not pretend that drag/drop or new save writes are implemented.
    assets:assetCatalog,
    showPage
  };
})();