/* Life RPG Journal Art v3 · two real paper pages and reusable field cards.
 * The real Journal Book textarea nodes are reparented, never cloned. Their
 * canonical autosave/reward handlers keep working without duplicate payouts.
 * Positions live separately in journalBookLayoutV2; hiding never erases text.
 */
(() => {
  "use strict";
  const app=window.LifeRPGApp;
  if(!app?.getState||!app?.saveState||window.LifeRPGJournalArtSpread)return;
  const $=(root,selector)=>root?.querySelector(selector);
  const FIELDS=[
    {key:"gratitude",title:"Today I'm grateful for…",selector:"#bjBookPrompt-gratitude",side:"left",x:50,y:36,width:76,height:25},
    {key:"intentionText",title:"Today I will…",selector:"#bjExtra-intentionText",side:"left",x:50,y:71,width:72,height:22},
    {key:"focusText",title:"Focus for today",selector:"#bjExtra-focusText",side:"right",x:50,y:30,width:75,height:20},
    {key:"happyMomentsText",title:"Little moments that made me happy",selector:"#bjExtra-happyMomentsText",side:"right",x:50,y:56,width:76,height:23},
    {key:"bookNote",title:"Notes & thoughts",selector:"#bjBookText",side:"right",x:50,y:83,width:76,height:22}
  ];
  const FIELD_BY_KEY=new Map(FIELDS.map(f=>[f.key,f]));
  const PAPERS={jasmine:"Jasmine Garden",plain:"Warm dotted paper"};
  const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const dayKey=()=>new Date().toLocaleDateString("sv-SE");
  let view=null,spread=null,toolbar=null,shelf=null,more=null;
  let activeDate="",creative=false,activeSide="left",selected="",layout=null,drag=null;
   

  function page(side){return $(spread,side==="left"?".bj-daily-left":".bj-daily-right");}
  function stage(side){return $(page(side),".bj-art-card-layer");}
  function copyDefaults(){
    const cards={};for(const f of FIELDS)cards[f.key]={side:f.side,x:f.x,y:f.y,visible:true};
    return{paper:{left:"jasmine",right:"jasmine"},cards};
  }
  function normalize(raw){
    const result=copyDefaults();
    if(raw?.paper&&typeof raw.paper==="object"){
      for(const side of ["left","right"])if(Object.hasOwn(PAPERS,raw.paper[side]))result.paper[side]=raw.paper[side];
    }
    for(const f of FIELDS){
      const candidate=raw?.cards?.[f.key];
      if(!candidate||typeof candidate!=="object")continue;
      const card=result.cards[f.key];
      card.side=candidate.side==="left"||candidate.side==="right"?candidate.side:f.side;
      card.x=clamp(Number.isFinite(Number(candidate.x))?Number(candidate.x):f.x,10,90);
      card.y=clamp(Number.isFinite(Number(candidate.y))?Number(candidate.y):f.y,8,92);
      card.visible=candidate.visible!==false;
    }
    return result;
  }
  function read(day){
    const root=app.getState().journalBookLayoutV2;
    return normalize(root?.daily?.[day]);
  }
  function persist(){
    if(!activeDate||!layout)return false;
    const state=app.getState(),previous=state.journalBookLayoutV2;
    const daily={...(previous?.daily||{}),[activeDate]:JSON.parse(JSON.stringify(layout))};
    state.journalBookLayoutV2={...(previous||{}),schemaVersion:2,daily};
    if(app.saveState({source:"journal-book-layout-v2",suppressUiRefresh:true})===false){
      if(previous===undefined)delete state.journalBookLayoutV2;
      else state.journalBookLayoutV2=previous;
      layout=read(activeDate);
      showStatus("Layout was not saved; the previous arrangement is intact.");
      render(activeDate);
      return false;
    }
    showStatus("Layout saved ✓");
    return true;
  }
  function showStatus(message){
    const el=$(view,"#bjArtSaveStatus");
    if(el)el.textContent=message;
  }
  function moveOriginalNodes(){
    const container=$(more,"#bjArtMoreFields");
    // The real book metadata fields must stay in the DOM for navigation.
    for(const selector of [".bj-book-date-heading",".bj-daily-opening",".bj-daily-topline",
      ".bj-daily-note",".bj-extra-grid","#bjBookPrompts","#bjBookDailyMini",
      ".bj-book-recorded-details",".bj-book-edit"]){
      const node=$(spread,selector);
      if(!node)continue;
      if(selector===".bj-book-date-heading")node.classList.add("bj-art-legacy-metadata");
      container.appendChild(node);
    }
    // Never place this island inside a text card: the original, entitlement-aware
    // decoration controller remains a separate optional library.
    const atelier=$(spread,"#bjAtelierMount");
    if(atelier)$(shelf,"#bjArtDecorations").appendChild(atelier);
    const images=[
      [".bj-illustration-bouquet","left","bouquet"],
      [".bj-illustration-window","right","window"],
      [".bj-illustration-teacup","right","teacup"]
    ];
    for(const [selector,side,cls] of images){
      const img=$(more,selector)||$(spread,selector);
      const background=$(page(side),".bj-art-backdrop");
      if(img&&background){img.className="bj-art-illustration bj-art-"+cls;img.setAttribute("aria-hidden","true");img.alt="";background.appendChild(img);}
    }
    const oldTea=$(spread,".bj-daily-teacup");
    if(oldTea)container.appendChild(oldTea);
  }
  function makePage(side){
    const paper=page(side),inner=$(paper,".bj-book-page-inner");
    if(!inner)return;
    paper.classList.add("bj-art-page");
    paper.dataset.bjPaperSide=side;
    const backdrop=document.createElement("div");
    backdrop.className="bj-art-backdrop";
    backdrop.innerHTML='<span class="bj-art-paper-specks" aria-hidden="true"></span>'+
      '<span class="bj-art-scribble" aria-hidden="true">'+(side==="left"?"small steps<br>big dreams ♡":"slow days<br>soft heart ♡")+'</span>';
    const layer=document.createElement("div");
    layer.className="bj-art-card-layer";
    layer.dataset.bjCardSide=side;
    layer.setAttribute("aria-label",side==="left"?"Left journal page":"Right journal page");
    inner.prepend(backdrop,layer);
    layer.addEventListener("pointerdown",pointerDown);
    layer.addEventListener("pointermove",pointerMove);
    layer.addEventListener("pointerup",pointerUp);
    layer.addEventListener("pointercancel",pointerUp);
    layer.addEventListener("keydown",keyMove);
    layer.addEventListener("click",event=>{
      const hide=event.target.closest?.("[data-bj-card-remove]");
      if(hide){event.preventDefault();hideCard(hide.dataset.bjCardRemove);return;}
      const handle=event.target.closest?.("[data-bj-card-handle]");
      if(handle&&creative){selected=handle.dataset.bjCardHandle;activeSide=side;renderSelection();}
    });
    const date=document.createElement("header");
    date.className="bj-art-printed-header";
    date.innerHTML=side==="left"
      ? '<span class="bj-art-heading">daily journal</span><span class="bj-art-printed-date" id="bjArtDateText"></span><span class="bj-art-weekday" id="bjArtDayText"></span>'
      : '<span class="bj-art-heading bj-art-heading-small">today, softly ♡</span><button type="button" class="bj-art-mood-button" id="bjArtMood" aria-label="Edit today’s check-in">Mood today: <span id="bjArtMoodText">—</span> ✎</button>';
    inner.appendChild(date);
    if(side==="right")$(date,"#bjArtMood").addEventListener("click",()=>{
      if(!window.LifeRPGBulletJournalBook?.save?.())return;
      window.LifeRPGJournal?.openDayEditor?.(activeDate);
    });
  }
  function init(host){
    if(!host||view===host)return;
    const target=$(host,"#bjBookDailySpread");
    if(!target||target.classList.contains("bj-art-enabled"))return;
    view=host;spread=target;
    toolbar=document.createElement("nav");toolbar.className="bj-art-toolbar";
    toolbar.setAttribute("aria-label","Journal page navigation and editor mode");
    toolbar.innerHTML='<div class="bj-art-controls bj-art-chapters">'+
      '<button type="button" data-bj-chapter="daily" aria-current="page">✿ Days</button>'+
      '<button type="button" data-bj-chapter="weekly">▦ Weeks</button>'+
      '<button type="button" data-bj-chapter="monthly">☾ Months</button>'+
      '<button type="button" data-bj-chapter="collections">✧ Collections</button></div>'+
      '<div class="bj-art-controls bj-art-navigation">'+
      '<button type="button" data-bj-action="prev" aria-label="Previous day">‹</button>'+
      '<input type="date" id="bjArtDate" aria-label="Choose journal date">'+
      '<button type="button" data-bj-action="next" aria-label="Next day">›</button>'+
      '<button type="button" data-bj-action="today">Today</button></div>'+
      '<div class="bj-art-controls bj-art-modes" role="group" aria-label="Journal editing mode">'+
      '<button type="button" data-bj-mode="write" aria-pressed="true">✎ Write</button>'+
      '<button type="button" data-bj-mode="create" aria-pressed="false">✦ Create</button></div>'+
      '<span id="bjArtSaveStatus" class="bj-art-save-status" role="status" aria-live="polite"></span>';
    spread.prepend(toolbar);
    shelf=document.createElement("aside");shelf.id="bjArtSidebar";shelf.className="bj-art-sidebar";
    shelf.setAttribute("aria-label","Creative journal element library");
    shelf.innerHTML='<div class="bj-art-shelf-head"><strong>✦ Your journal atelier</strong><p>Pick a page, then move or add the boxes you want.</p></div>'+
      '<div class="bj-art-page-picker" role="group" aria-label="Choose page to design">'+
      '<button type="button" data-bj-side="left">← Left page</button>'+
      '<button type="button" data-bj-side="right">Right page →</button></div>'+
      '<h3>Text boxes · always free</h3><div id="bjArtCardLibrary" class="bj-art-card-library"></div>'+
      '<div id="bjArtSelectedActions"></div>'+
      '<h3>Background paper</h3><div id="bjArtPaperLibrary" class="bj-art-paper-library"></div>'+
      '<details class="bj-art-decorations"><summary>✿ Stickers & decorative elements</summary>'+
        '<p class="bj-art-shelf-note">Free starter elements and the existing, unsold Sakura preview.</p>'+
        '<div id="bjArtDecorations"></div></details>'+
      '<p class="bj-art-shelf-note">Removing a box only hides it on this date. Your writing stays saved and can be shown again.</p>';
    spread.appendChild(shelf);
    more=document.createElement("details");more.className="bj-art-more";
    more.innerHTML='<summary>✧ More reflections, tracker & recorded moments</summary>'+
      '<div class="bj-art-extra-area" id="bjArtMoreFields"></div>';
    spread.insertAdjacentElement("afterend",more);
    makePage("left");makePage("right");moveOriginalNodes();
    const dateInput=$(toolbar,"#bjArtDate");
    dateInput.addEventListener("change",()=>{
      if(!window.LifeRPGBulletJournalBook?.changeDate?.(dateInput.value))dateInput.value=activeDate;
    });
    toolbar.addEventListener("click",event=>{
      const mode=event.target.closest?.("[data-bj-mode]");
      if(!mode)return;
      if(!window.LifeRPGBulletJournalBook?.save?.())return;
      creative=mode.dataset.bjMode==="create";
      selected="";
      renderMode();
    });
    shelf.addEventListener("click",event=>{
      const pageButton=event.target.closest?.("[data-bj-side]");
      if(pageButton){activeSide=pageButton.dataset.bjSide==="right"?"right":"left";selected="";renderMode();return;}
      const add=event.target.closest?.("[data-bj-add-card]");
      if(add){showCard(add.dataset.bjAddCard);return;}
      const action=event.target.closest?.("[data-bj-selected-action]");
      if(action)actOnSelected(action.dataset.bjSelectedAction);
      const paper=event.target.closest?.("[data-bj-paper]");
      if(paper&&Object.hasOwn(PAPERS,paper.dataset.bjPaper)){
        layout.paper[activeSide]=paper.dataset.bjPaper;
        if(persist())renderMode();
      }
    });
    spread.classList.add("bj-art-enabled");
    showStatus("Write directly on your cards. Text saves automatically. ♡");
  }
  function cardFor(f){
    const pos=layout.cards[f.key];
    const card=document.createElement("section");
    card.className="bj-art-card";
    card.dataset.bjCard=f.key;
    card.style.setProperty("--card-x",pos.x+"%");
    card.style.setProperty("--card-y",pos.y+"%");
    card.style.setProperty("--card-width",f.width+"%");
    card.style.setProperty("--card-height",f.height+"%");
    const header=document.createElement("div");header.className="bj-art-card-head";
    header.innerHTML='<span class="bj-art-card-label">'+escapeHtml(f.title)+'</span>'+
      '<button type="button" class="bj-art-drag-handle" data-bj-card-handle="'+f.key+'" '+
      'aria-label="Move '+escapeHtml(f.title)+' (arrow keys also work)" title="Drag to move">⠿</button>'+
      '<button type="button" class="bj-art-card-remove" data-bj-card-remove="'+f.key+'" aria-label="Hide '+escapeHtml(f.title)+'">×</button>';
    card.appendChild(header);
    const body=document.createElement("div");body.className="bj-art-card-body";
    const input=$(view,f.selector);
    if(input){
      input.classList.add("bj-art-field");
      input.dataset.bjArt=f.key;
      input.setAttribute("aria-label",f.title);
      if(input.tagName==="TEXTAREA")input.placeholder="";
      input.readOnly=creative;
      body.appendChild(input);
    }else{
      const note=document.createElement("p");
      note.className="bj-art-card-unavailable";
      note.textContent="Open More reflections to view this saved, read-only answer.";
      body.appendChild(note);
    }
    card.appendChild(body);
    return card;
  }
  function renderCards(){
    for(const side of ["left","right"]){
      const container=stage(side);
      if(!container)continue;
      for(const f of FIELDS){
        const old=$(container,'[data-bj-card="'+f.key+'"]');
        if(old){
          const input=$(old,f.selector);
          if(input){
            const newer=f.key==="gratitude"?$(more,"#bjBookPrompts #bjBookPrompt-gratitude"):null;
            // renderPrompts rebuilds its original editor on every date change.
            // Do not leave a second, stale ID/editor in the book.
            if(newer&&newer!==input)input.remove();
            else $(more,"#bjArtMoreFields").appendChild(input);
          }
        }
      }
      container.replaceChildren();
    }
    for(const f of FIELDS){
      const pos=layout.cards[f.key];
      if(!pos.visible)continue;
      stage(pos.side)?.appendChild(cardFor(f));
    }
    renderSelection();
  }
  function renderSelection(){
    for(const card of view.querySelectorAll("#bjBookDailySpread [data-bj-card]")){
      card.classList.toggle("is-selected",creative&&card.dataset.bjCard===selected);
    }
    const host=$(shelf,"#bjArtSelectedActions");
    if(!host)return;
    const f=FIELD_BY_KEY.get(selected);
    host.innerHTML=f&&creative?'<div class="bj-art-selected"><strong>Selected: '+escapeHtml(f.title)+'</strong>'+
      '<div><button type="button" data-bj-selected-action="other-side">Move to other page</button>'+
      '<button type="button" data-bj-selected-action="hide">Remove box</button></div>'+
      '<small>Use the ⠿ handle to drag, or the arrow keys to fine-tune.</small></div>':"";
  }
  function renderLibrary(){
    const host=$(shelf,"#bjArtCardLibrary");
    if(host)host.innerHTML=FIELDS.map(f=>{
      const current=layout.cards[f.key],visible=current.visible;
      return '<button type="button" data-bj-add-card="'+f.key+'" class="bj-art-library-item" aria-label="'+
       escapeHtml((visible?"Select ":"Add ")+f.title)+'">'+
       '<span class="bj-art-library-icon">▤</span><span>'+escapeHtml(f.title)+'</span>'+
       '<small>'+(visible?"On "+(current.side==="left"?"left":"right")+" page":"Tap to add")+'</small></button>';
    }).join("");
    const papers=$(shelf,"#bjArtPaperLibrary");
    if(papers)papers.innerHTML=Object.entries(PAPERS).map(([key,label])=>
      '<button type="button" data-bj-paper="'+key+'" aria-pressed="'+(layout.paper[activeSide]===key)+
      '"><span class="bj-art-paper-swatch is-'+key+'"></span>'+escapeHtml(label)+'</button>'
    ).join("");
  }
  function renderMode(){
    if(!spread||!layout)return;
    spread.classList.toggle("bj-art-creative",creative);
    spread.dataset.bjDesignSide=activeSide;
    for(const b of toolbar.querySelectorAll("[data-bj-mode]")){
      b.setAttribute("aria-pressed",String((b.dataset.bjMode==="create")===creative));
    }
    for(const b of shelf.querySelectorAll("[data-bj-side]")){
      b.setAttribute("aria-pressed",String(b.dataset.bjSide===activeSide));
    }
    for(const side of ["left","right"]){
      const p=page(side);
      p.dataset.bjBackground=layout.paper[side];
    }
    for(const input of spread.querySelectorAll(".bj-art-field"))input.readOnly=creative;
    renderLibrary();renderSelection();
    const live=window.LifeRPGJournalAtelier;
    // The decoration module continues using its own stable save and asset IDs.
    if(creative){
      if(live?.setPageSide)live.setPageSide(activeSide);
      else live?.render?.(activeDate);
    }
  }
  function render(date,host=view){
    if(!host)return;
    if(!view)init(host);
    if(!spread||!date)return;
    const changed=activeDate!==date;
    activeDate=date;if(changed){layout=read(date);creative=false;selected="";activeSide="left";}
    if(!layout)layout=read(date);
    const parsed=new Date(date+"T12:00:00");
    const formatted=new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(parsed);
    const weekday=new Intl.DateTimeFormat("en",{weekday:"long"}).format(parsed);
    const dateEl=$(toolbar,"#bjArtDate");
    if(dateEl){dateEl.value=date;dateEl.max=dayKey();}
    const next=$(toolbar,"[data-bj-action='next']");
    if(next)next.disabled=date>=dayKey();
    const dayText=$(spread,"#bjArtDayText");
    const dateText=$(spread,"#bjArtDateText");
    if(dayText)dayText.textContent=weekday;
    if(dateText)dateText.textContent=formatted;
    const mood=$(spread,"#bjArtMoodText");
    if(mood)mood.textContent=String(window.LifeRPGJournal?.getEntry?.(date)?.mood||"Choose a mood");
    renderCards();renderMode();
    showStatus("Write on your page ♡ Changes are saved automatically.");
  }
  function focusField(field){
    if(!view)return false;
    const f=FIELD_BY_KEY.get(field||"gratitude");
    if(f&&!layout.cards[f.key].visible){showCard(f.key);}
    const target=$(view,f?f.selector:"#bjBookPrompt-gratitude");
    if(!target)return false;
    if(!target.closest("#bjBookDailySpread")&&more)more.open=true;
    if(creative){creative=false;renderMode();}
    requestAnimationFrame(()=>{target.scrollIntoView({block:"center",behavior:"smooth"});target.focus({preventScroll:true});});
    return true;
  }
  function showCard(key){
    const f=FIELD_BY_KEY.get(key);if(!f)return;
    const item=layout.cards[key];
    if(item.visible){
      selected=key;activeSide=item.side;renderMode();return;
    }
    item.visible=true;item.side=activeSide;
    item.x=f.x;item.y=f.y;
    if(persist()){selected=key;renderCards();renderMode();}
  }
  function hideCard(key){
    if(!creative||!FIELD_BY_KEY.has(key)||!layout.cards[key].visible)return;
    if(!window.LifeRPGBulletJournalBook?.save?.())return;
    layout.cards[key].visible=false;selected="";
    if(persist()){renderCards();renderMode();}
  }
  function actOnSelected(action){
    if(!creative||!FIELD_BY_KEY.has(selected))return;
    if(action==="hide"){hideCard(selected);return;}
    if(action!=="other-side")return;
    const item=layout.cards[selected];
    item.side=item.side==="left"?"right":"left";
    activeSide=item.side;item.x=50;item.y=50;
    if(persist()){renderCards();renderMode();}
  }
  function pointerDown(event){
    if(!creative||event.button!==0)return;
    const handle=event.target.closest?.("[data-bj-card-handle]");
    if(!handle)return;
    const key=handle.dataset.bjCardHandle,item=layout.cards[key],card=handle.closest(".bj-art-card");
    if(!item||!card)return;
    activeSide=item.side;selected=key;
    const stageRect=stage(item.side)?.getBoundingClientRect();
    if(!stageRect)return;
    drag={pointerId:event.pointerId,key,startX:event.clientX,startY:event.clientY,
      x:item.x,y:item.y,rect:stageRect,card,moved:false};
    handle.setPointerCapture?.(event.pointerId);
    card.classList.add("is-selected");
    event.preventDefault();
    renderLibrary();renderSelection();
  }
  function pointerMove(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const item=layout.cards[drag.key];if(!item)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
    const halfWidth=drag.card.offsetWidth/Math.max(1,drag.rect.width)*50+1;
    const halfHeight=drag.card.offsetHeight/Math.max(1,drag.rect.height)*50+1;
    item.x=clamp(drag.x+dx/Math.max(1,drag.rect.width)*100,halfWidth,100-halfWidth);
    item.y=clamp(drag.y+dy/Math.max(1,drag.rect.height)*100,halfHeight,100-halfHeight);
    drag.card.style.setProperty("--card-x",item.x+"%");
    drag.card.style.setProperty("--card-y",item.y+"%");
  }
  function pointerUp(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const moved=drag.moved;drag=null;
    if(moved)persist();
    renderSelection();
  }
  function keyMove(event){
    if(!creative)return;
    const handle=event.target.closest?.("[data-bj-card-handle]");
    if(!handle)return;
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(!direction&&event.key!=="Delete"&&event.key!=="Backspace")return;
    event.preventDefault();event.stopPropagation();
    const key=handle.dataset.bjCardHandle;
    if(!direction){hideCard(key);return;}
    const item=layout.cards[key],card=handle.closest(".bj-art-card"),paper=stage(item.side);
    if(!item||!card||!paper)return;
    const halfWidth=card.offsetWidth/Math.max(1,paper.offsetWidth)*50+1;
    const halfHeight=card.offsetHeight/Math.max(1,paper.offsetHeight)*50+1;
    item.x=clamp(item.x+direction[0],halfWidth,100-halfWidth);
    item.y=clamp(item.y+direction[1],halfHeight,100-halfHeight);
    selected=key;persist();
    card.style.setProperty("--card-x",item.x+"%");
    card.style.setProperty("--card-y",item.y+"%");
    renderSelection();handle.focus();
  }

  window.LifeRPGJournalArtSpread={
    version:"0.31.4-journal-pages3",
    init,render,focusField,
    getLayout:()=>layout?JSON.parse(JSON.stringify(layout)):null,
    isCreative:()=>creative,
    _test:{normalize,read}
  };
})();
