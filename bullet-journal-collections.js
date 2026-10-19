/* Life RPG · Journal Collections v1: Reading & Media.
 * An optional permanent Knowledge Talent adds a private standalone
 * memories page. Existing books, games and series stay free in their
 * original libraries and remain the only authoritative tracking data.
 */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState||!book?.getChapter||window.LifeRPGBulletJournalCollections)return;
  const VERSION="0.31.4-collections1",KEY="journal-reading-media-collection";
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const $=id=>document.getElementById(id);
  let draft="",dirty=false,loaded=false,preview=false;

  function owned() {
    return !!window.LifeRPGTalentTreeGraph?.isContentUnlocked?.("Knowledge",KEY);
  }
  function mediaGroups() {
    const root=app.getState();
    const defs=[
      {key:"books",icon:"📚",title:"Books",view:"library",items:root.bookLibrary?.items||[],
        statuses:{reading:"Reading",want:"Want to read",owned:"On my shelf",
          paused:"Paused",finished:"Finished",dnf:"Set aside"},
        active:["reading","finished","paused"]},
      {key:"series",icon:"🎞️",title:"Series",view:"series",items:root.seriesLibrary?.items||[],
        statuses:{watching:"Watching",want:"Want to watch",paused:"Paused",
          completed:"Completed",dropped:"Set aside"},
        active:["watching","completed","paused"]},
      {key:"games",icon:"🎮",title:"Games",view:"games",items:root.gameLibrary?.items||[],
        statuses:{playing:"Playing",endless:"Endless",backlog:"Want to play",
          paused:"Paused",finished:"Finished",dropped:"Set aside"},
        active:["playing","endless","finished"]}
    ];
    return defs.map(group=>{
      const all=Array.isArray(group.items)?group.items.filter(x=>x&&x.title):[];
      // Only display player-owned library entries. No fabricated sample titles.
      // Current favourites (active / completed) first, unplayed items later.
      const order=group.active;
      const sorted=all.slice().sort((a,b)=>{
        const ia=order.indexOf(a.status),ib=order.indexOf(b.status);
        return (ia<0?50:ia)-(ib<0?50:ib);
      });
      return {...group,all,items:sorted.slice(0,5)};
    });
  }
  function savedNote(){
    const row=app.getState().journalCollectionsV1?.pages?.readingMedia;
    return typeof row?.note==="string"?row.note:"";
  }
  function resetDraft(){draft=savedNote();dirty=false;loaded=true;}
  function openPreview(){
    preview=true;
    if(!book.openCollections?.())return false;
    render();return true;
  }
  function unlockFocus(){
    window.LifeRPGTalentTreeGraph?.focusContent?.("Knowledge",KEY);
  }
  function render(){
    const idx=$("bjBookCollectionsIndex"),body=$("bjBookCollectionsContent");
    if(!idx||!body)return;
    if(!loaded)resetDraft();
    const unlocked=owned(),groups=mediaGroups();
    const count=groups.reduce((n,g)=>n+g.all.length,0);
    idx.innerHTML=
      '<article class="bj-collection-index-item">'+
      '<span class="bj-collection-stamp" aria-hidden="true">✦</span>'+
      '<div><strong>Reading & Media</strong><p>Books, series and games that stayed with you.</p>'+
      '<small>'+count+' saved library item'+(count===1?"":"s")+' · '+(unlocked?"Permanently unlocked":"Live preview")+'</small></div>'+
      '<button type="button" data-bj-collection-preview>Open '+(unlocked?"collection":"preview")+' ↗</button></article>'+
      '<p class="bj-collections-index-note">Your regular libraries, journal entries and existing reviews are always yours. '+
      'The optional Talent adds a separate keepsake page, not access to these records.</p>';
    const sections=groups.map(group=>
      '<section class="bj-collection-shelf">'+
        '<header><span>'+group.icon+'</span><strong>'+group.title+'</strong>'+
          '<button type="button" data-bj-collection-open="'+group.view+'">Open library ↗</button></header>'+
        (group.items.length?
          '<div class="bj-collection-titles">'+group.items.map(item=>
            '<div class="bj-collection-title"><strong>'+esc(item.title)+'</strong>'+
            '<small>'+esc(group.statuses[item.status]||"On my shelf")+
            (group.key==="books"&&item.author?" · "+esc(item.author):"")+'</small></div>').join("")+
          '</div>':'<p class="bj-collection-empty">A quiet space for whatever you discover next.</p>')+
        (group.all.length>5?'<small class="bj-collection-overflow">+'+(group.all.length-5)+
            ' more in your '+group.title.toLowerCase()+' library</small>':"")+
      '</section>').join("");
    const note=unlocked?
      '<div class="bj-collection-memory"><label for="bjCollectionsMemory">My favourite little moments</label>'+
      '<p>Keep a private note about why these stories or games mattered. No XP for writing.</p>'+
      '<textarea id="bjCollectionsMemory" rows="5" maxlength="2000" placeholder="A scene, a character, a book you keep thinking about…">'+esc(draft)+'</textarea>'+
      '<div class="bj-collection-save"><span id="bjCollectionsSaveStatus" role="status">'+(dirty?"Unsaved changes":"Saved separately from your libraries")+'</span>'+
      '<button type="button" data-bj-collection-save '+(dirty?"":"disabled")+'>Save collection note</button></div></div>'
      :'<div class="bj-collection-locked"><strong>✧ Try before unlocking</strong>'+
        '<p>This is the actual collection layout with your existing media. '+
        'The permanent Knowledge unlock adds your own editable keepsake note.</p>'+
        '<span>Unlock: 1 Knowledge point · Available: '+
          Number(window.LifeRPGSkills?.getRealmPoints?.("Knowledge")?.available||0)+'</span>'+
        '<button type="button" data-bj-collection-talent>See in Knowledge tree ↗</button></div>';
    body.innerHTML=
      '<div class="bj-collection-preview-bar"><small>'+(unlocked?"Your collection · owned":"Live layout preview · no points spent")+'</small>'+
      (unlocked?"":'<span>Nothing is bought by opening this page</span>')+'</div>'+
      sections+note;
  }
  function save(){
    if(!owned())return false;
    const raw=$("bjCollectionsMemory")?.value;
    if(typeof raw!=="string")return false;
    const value=raw.slice(0,2000),state=app.getState(),old=state.journalCollectionsV1;
    const pages={...(old?.pages||{}),readingMedia:{...(old?.pages?.readingMedia||{}),note:value}};
    state.journalCollectionsV1={...(old||{}),schemaVersion:1,pages};
    if(app.saveState({source:"journal-collection-reading-media",suppressUiRefresh:true})===false){
      if(old===undefined)delete state.journalCollectionsV1;
      else state.journalCollectionsV1=old;
      const status=$("bjCollectionsSaveStatus");if(status)status.textContent="Could not save your collection note.";
      return false;
    }
    draft=value;dirty=false;
    const status=$("bjCollectionsSaveStatus");if(status)status.textContent="Saved ✓";
    const button=document.querySelector("[data-bj-collection-save]");if(button)button.disabled=true;
    return true;
  }
  function bind(){
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",e=>{
      const button=e.target.closest?.("[data-bj-collection-preview], [data-bj-collection-open], [data-bj-collection-save], [data-bj-collection-talent]");
      if(!button)return;
      if(button.hasAttribute("data-bj-collection-save")){save();return;}
      if(button.hasAttribute("data-bj-collection-talent")){unlockFocus();return;}
      if(button.hasAttribute("data-bj-collection-open")){app.showView?.(button.dataset.bjCollectionOpen);return;}
      if(button.hasAttribute("data-bj-collection-preview")){preview=true;render();}
    });
    view.addEventListener("input",e=>{
      if(e.target?.id!=="bjCollectionsMemory"||!owned())return;
      draft=e.target.value.slice(0,2000);dirty=draft!==savedNote();
      const status=$("bjCollectionsSaveStatus");if(status)status.textContent=dirty?"Unsaved changes":"Saved";
      const button=view.querySelector("[data-bj-collection-save]");if(button)button.disabled=!dirty;
    });
    window.addEventListener("life-rpg:talent-content-v2-change",e=>{
      if(e.detail?.realm==="Knowledge"&&e.detail?.id===KEY&&book.getChapter?.()==="collections"){
        resetDraft();render();
      }
    });
    window.addEventListener("life-rpg:view-changed",e=>{
      if(e?.detail?.view!=="bullet-journal"){loaded=false;dirty=false;preview=false;}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalCollections={version:VERSION,render,openPreview,owned,save,mediaGroups};
})();