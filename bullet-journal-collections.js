/* Life RPG · Reading & Media Collection v2.
 * The actual illustrated shelves are ALWAYS visible in the free live preview.
 * Existing Knowledge purchase (same ID/cost) adds personal favorite pins and
 * the existing saved keepsake note. Original media libraries stay free.
 * Pinned references use stable source item IDs, never copied media records.
 */
(() => {
  "use strict";
  const app=window.LifeRPGApp,book=window.LifeRPGBulletJournalBook;
  if(!app?.getState||!book?.getChapter||window.LifeRPGBulletJournalCollections)return;
  const VERSION="0.31.4-collection-shelves2",KEY="journal-reading-media-collection";
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const $=id=>document.getElementById(id);
  const MAX_FAV=4;
  const GROUPS=[
    {key:"books",icon:"📚",title:"Books",view:"library",lib:"bookLibrary",
      statuses:{reading:"Reading",want:"Want to read",owned:"On my shelf",paused:"Paused",finished:"Finished",dnf:"Set aside"},
      active:["reading","finished","paused"],cover:"coverUrl",short:"A little library"},
    {key:"series",icon:"🎞️",title:"Series",view:"series",lib:"seriesLibrary",
      statuses:{watching:"Watching",want:"Watchlist",paused:"Paused",completed:"Completed",dropped:"Set aside"},
      active:["watching","completed","paused"],cover:"cover",short:"On the screen"},
    {key:"games",icon:"🎮",title:"Games",view:"games",lib:"gameLibrary",
      statuses:{playing:"Playing",endless:"Endless",backlog:"Backlog",paused:"Paused",finished:"Finished",dropped:"Set aside"},
      active:["playing","endless","finished"],cover:"coverUrl",short:"My game corner"}
  ];
  let draft="",dirty=false,loaded=false,displayLimit={books:8,series:6,games:6};
  let pinned={books:[],series:[],games:[]};
  const owned=()=>!!window.LifeRPGTalentTreeGraph?.isContentUnlocked?.("Knowledge",KEY);
  const pageRecord=()=>app.getState().journalCollectionsV1?.pages?.readingMedia||{};
  const safeImage=raw=>{
    const value=String(raw||"").trim();
    // Existing media apps keep https/http external cover URLs; never interpolate
    // arbitrary schemes (javascript:, data:, protocol-relative) into an img src.
    if(/^https?:\/\/[^/\s]+(?:\/|$)/i.test(value)&&!/[<>"'\\]/.test(value))return value;
    if(/^(?:assets\/|\/assets\/)[\w./%-]+\.(?:png|jpe?g|webp|svg)(?:\?[\w=%.-]+)?$/i.test(value))return value;
    return "";
  };
  function mediaGroups(){
    const root=app.getState();
    return GROUPS.map(spec=>{
      const all=Array.isArray(root[spec.lib]?.items)?root[spec.lib].items.filter(item=>item&&item.title):[];
      const ordered=all.map((item,index)=>({item,index})).sort((a,b)=>{
        const ai=spec.active.indexOf(a.item.status),bi=spec.active.indexOf(b.item.status);
        return (ai<0?50:ai)-(bi<0?50:bi)||a.index-b.index;
      }).map(row=>row.item);
      return {...spec,all,items:ordered,visible:ordered.slice(0,displayLimit[spec.key]||6)};
    });
  }
  function savedNote(){
    const note=pageRecord().note;
    return typeof note==="string"?note:"";
  }
  function savedPins(){
    const src=pageRecord().pinned||{};
    const groups=mediaGroups();
    return Object.fromEntries(groups.map(g=>{
      const existing=new Set(g.all.map(x=>String(x.id||"")));
      const ids=Array.isArray(src[g.key])?src[g.key]:[];
      return [g.key,ids.filter(id=>typeof id==="string"&&existing.has(id)).slice(0,MAX_FAV)];
    }));
  }
  function resetDraft(){draft=savedNote();pinned=savedPins();dirty=false;loaded=true;}
  function openPreview(){const opened=book.openCollections?.();if(opened)render();return Boolean(opened);}
  function unlockFocus(){window.LifeRPGTalentTreeGraph?.focusContent?.("Knowledge",KEY);}
  function groupOf(key){return GROUPS.find(group=>group.key===key);}
  function statusFor(group,item){return group.statuses[item.status]||"Saved in library";}
  function imageHtml(group,item){
    const src=safeImage(item[group.cover]);
    return src?'<img src="'+esc(src)+'" loading="lazy" decoding="async" alt="" onerror="this.hidden=true;this.parentElement.classList.add(\'cover-failed\')">':"";
  }
  function objectMarkup(group,item,idx,isPinboard=false){
    const id=String(item.id||"");
    const active=!!id&&pinned[group.key].includes(id);
    const photo=imageHtml(group,item),status=statusFor(group,item);
    const variations=["a","b","c","d","e"];
    const style=variations[idx%variations.length];
    const badge=group.key==="books"?"BOOK":group.key==="series"?"WATCH":"PLAY";
    const mediaName=esc(item.title),photoClass=photo?" has-cover":"";
    return '<div class="bj-media-object bj-media-object-'+group.key+' bj-media-shade-'+style+(active?" is-favorite":"")+'" role="listitem">'+
      '<div class="bj-media-cover'+photoClass+'">'+photo+
        '<div class="bj-media-placeholder"><span aria-hidden="true">'+group.icon+'</span>'+
          '<strong>'+mediaName+'</strong><small>'+badge+'</small></div>'+
        '</div>'+
      '<div class="bj-media-caption"><strong title="'+mediaName+'">'+mediaName+'</strong>'+
        '<small>'+esc(status)+'</small></div>'+
      (owned()&&!isPinboard&&id?
        '<button type="button" class="bj-media-pin" data-bj-media-pin="'+group.key+'|'+esc(id)+'" aria-pressed="'+active+'" aria-label="'+(active?"Unpin ":"Pin ")+mediaName+
        ' as a favourite">'+(active?"♥":"♡")+'</button>':
        !owned()&&!isPinboard?'<span class="bj-media-pin-locked" aria-label="Favourite pin available after unlocking">♡</span>':"")+
      '</div>';
  }
  function groupShelf(group,idx){
    const visible=group.visible;
    return '<section class="bj-media-shelf bj-media-shelf-'+group.key+'" aria-label="'+group.title+' bookshelf">'+
      '<header class="bj-media-shelf-head"><div class="bj-media-heading"><span aria-hidden="true">'+group.icon+'</span>'+
        '<div><small>'+esc(group.short)+'</small><h3>'+esc(group.title)+'</h3></div></div>'+
        '<button type="button" data-bj-collection-open="'+group.view+'">Open library ↗</button></header>'+
      (visible.length?
        '<div class="bj-media-bookcase"><div class="bj-media-books" role="list">'+
        visible.map((item,i)=>objectMarkup(group,item,i)).join("")+
        '</div><div class="bj-media-wood-shelf" aria-hidden="true"></div></div>':
        '<div class="bj-media-empty">A quiet space for whatever you discover next. ✧</div>')+
      '<footer><span>'+group.all.length+' saved '+group.title.toLowerCase()+'</span>'+
        (group.items.length>visible.length?
         '<button type="button" data-bj-media-more="'+group.key+'">Show '+Math.min(6,group.items.length-visible.length)+' more ↓</button>':'')+
      '</footer></section>';
  }
  function favoritesHTML(groups){
    const found=[];
    groups.forEach(group=>{
      (pinned[group.key]||[]).forEach(id=>{
        const item=group.all.find(entry=>String(entry.id||"")===id);
        if(item)found.push({group,item});
      });
    });
    // No favourites are assumed. Until the player pins something, this
    // always shows a plainly-labelled peek at their *real* saved entries.
    const sneakPeek=groups.flatMap(group=>group.items.slice(0,1).map(item=>({group,item})));
    const view=(found.length?found:sneakPeek).slice(0,8);
    return '<section class="bj-media-favourites"><div class="bj-media-feature-heading">'+
      '<small>✧ '+(found.length?'A CORNER OF MY HEART':'A PEEK AT MY SHELVES')+'</small>'+
      '<h2>'+(found.length?'My favourite stories':'My little story corner')+'</h2>'+
      '<p>'+(found.length?'The favourites you chose from your libraries.':
        'Real books, shows and games from your libraries. No favourites chosen yet.')+'</p></div>'+
      (view.length?
        '<div class="bj-media-favourite-books" role="list">'+view.map(({group,item},i)=>
          objectMarkup(group,item,i,true)).join("")+'</div>':
        '<div class="bj-media-favourite-placeholder"><span aria-hidden="true">♡</span>'+
          '<p>A quiet nook, waiting for new discoveries.</p></div>')+
      '<small class="bj-media-favourites-hint">'+
        (owned()?'Tap ♡ on a shelf to pin up to four favourites per category.':
         'Unlock to choose which favourites appear here.')+
      '</small></section>';
  }
  function noteHTML(unlocked){
    if(unlocked){
      return '<section class="bj-media-keepsake bj-collection-memory"><div class="bj-media-letter-header">'+
        '<small>MY KEEPSAKE PAGE</small><label for="bjCollectionsMemory">Memories between the pages</label>'+
        '<p>Write about moments that stayed with you. This is your private collection note.</p></div>'+
        '<textarea id="bjCollectionsMemory" rows="5" maxlength="2000" placeholder="The ending I keep thinking about…">'+esc(draft)+'</textarea>'+
        '<div class="bj-collection-save"><span id="bjCollectionsSaveStatus" role="status">'+
        (dirty?"Unsaved changes":"Saved separately from your libraries")+'</span>'+
        '<button type="button" data-bj-collection-save '+(dirty?"":"disabled")+'>Save keepsake</button></div></section>';
    }
    return '<section class="bj-media-keepsake is-preview">'+
      '<div class="bj-media-letter-header"><small>YOUR OWN KEEPSAKE PAGE · AFTER UNLOCKING</small>'+
      '<h3>Memories between the pages</h3><p>Your own private notes go here.</p></div>'+
      '<div class="bj-media-blank-lines" aria-hidden="true"></div>'+
      '<p class="bj-media-preview-explanation"><strong>This is the actual bookshelf design.</strong> '+
      'Buying does not reveal a different look. For 1 Knowledge point, you permanently unlock '+
      'your personal favourites (♥) and a writable keepsake note. Your original libraries stay free.</p>'+
      '<div class="bj-collection-locked"><span>Unlock: 1 Knowledge point · Available: '+
        Number(window.LifeRPGSkills?.getRealmPoints?.("Knowledge")?.available||0)+'</span>'+
        '<button type="button" data-bj-collection-talent>See in Knowledge tree ↗</button></div></section>';
  }
  function render(){
    const index=$("bjBookCollectionsIndex"),body=$("bjBookCollectionsContent");
    if(!index||!body)return;
    if(!loaded)resetDraft();
    const unlocked=owned(),groups=mediaGroups(),count=groups.reduce((n,g)=>n+g.all.length,0);
    index.innerHTML=
      '<div class="bj-media-bookplate"><span aria-hidden="true">❧</span><small>THE STORY COLLECTION</small>'+
        '<h2>My little library of worlds</h2>'+
        '<p>Fictional worlds, comfort re-watches, games worth staying up for. All kept together.</p>'+
        '<div class="bj-media-bookplate-decoration" aria-hidden="true"><span>✧</span><i></i><span>✧</span></div>'+
      '</div>'+
      '<article class="bj-collection-index-item"><span class="bj-collection-stamp" aria-hidden="true">📚</span>'+
      '<div><strong>Reading & Media</strong><p>Illustrated bookshelf collection · books, series & games.</p>'+
      '<small>'+count+' saved library item'+(count===1?"":"s")+' · '+(unlocked?"Yours forever":"Full design preview")+'</small></div>'+
      '<button type="button" data-bj-collection-preview>View '+(unlocked?"my shelves":"shelves")+" ↗</button></article>"+
      favoritesHTML(groups)+
      '<p class="bj-collections-index-note">This is a keepsake, not a second tracker. Your library entries and progress always remain free.</p>';
    body.innerHTML='<div class="bj-collection-preview-bar"><small>'+
      (unlocked?"✦ My collection · permanently unlocked":"✧ Actual design preview · free to explore")+'</small>'+
      (unlocked?'<span>Pin favourites ♥ · Write memories ✎</span>':'<span>Editing is unlocked for 1 Knowledge point</span>')+
      '</div>'+
      groups.map(groupShelf).join("")+
      noteHTML(unlocked);
  }
  function persist(){
    if(!owned())return false;
    const raw=$("bjCollectionsMemory")?.value;
    if(typeof raw==="string")draft=raw.slice(0,2000);
    const state=app.getState(),old=state.journalCollectionsV1,previousNote=savedNote();
    const pages={...(old?.pages||{}),
      readingMedia:{...(old?.pages?.readingMedia||{}),
        note:draft.slice(0,2000),
        pinned:Object.fromEntries(GROUPS.map(g=>[g.key,[...pinned[g.key]].slice(0,MAX_FAV)]))}};
    state.journalCollectionsV1={...(old||{}),schemaVersion:1,pages};
    if(app.saveState({source:"journal-collection-reading-media",suppressUiRefresh:true})===false){
      if(old===undefined)delete state.journalCollectionsV1;
      else state.journalCollectionsV1=old;
      draft=previousNote;pinned=savedPins();dirty=false;
      app.showToast?.("Your collection was not saved. The previous note and pins are safe.");
      const status=$("bjCollectionsSaveStatus");
      if(status)status.textContent="Could not save · previous entries preserved";
      return false;
    }
    dirty=false;
    const status=$("bjCollectionsSaveStatus");if(status)status.textContent="Saved ✓";
    const button=$("bjBookCollectionsContent")?.querySelector("[data-bj-collection-save]");
    if(button)button.disabled=true;
    return true;
  }
  function togglePin(groupKey,id){
    if(!owned())return false;
    const group=mediaGroups().find(g=>g.key===groupKey);
    if(!group||!group.all.some(item=>String(item.id||"")===id))return false;
    const rows=pinned[groupKey],prior=[...rows],existing=rows.indexOf(id);
    if(existing>=0)rows.splice(existing,1);
    else{
      if(rows.length>=MAX_FAV){
        app.showToast?.("Choose up to four favourites on each shelf.");
        return false;
      }
      rows.push(id);
    }
    if(!persist()){pinned[groupKey]=prior;render();return false;}
    render();return true;
  }
  function more(groupKey){
    if(!groupOf(groupKey))return;
    const group=mediaGroups().find(g=>g.key===groupKey);
    displayLimit[groupKey]=Math.min(group.all.length,(displayLimit[groupKey]||6)+6);
    render();
  }
  function bind(){
    const view=$("view-bullet-journal");
    if(!view)return;
    view.addEventListener("click",event=>{
      const control=event.target.closest?.(
        "[data-bj-media-pin], [data-bj-media-more], [data-bj-collection-preview], [data-bj-collection-open], [data-bj-collection-save], [data-bj-collection-talent]");
      if(!control)return;
      if(control.hasAttribute("data-bj-media-pin")){
        const [group,id]=String(control.dataset.bjMediaPin||"").split("|");
        togglePin(group,id);return;
      }
      if(control.hasAttribute("data-bj-media-more")){more(control.dataset.bjMediaMore);return;}
      if(control.hasAttribute("data-bj-collection-save")){persist();return;}
      if(control.hasAttribute("data-bj-collection-talent")){unlockFocus();return;}
      if(control.hasAttribute("data-bj-collection-open")){app.showView?.(control.dataset.bjCollectionOpen);return;}
      if(control.hasAttribute("data-bj-collection-preview")){render();}
    });
    view.addEventListener("input",event=>{
      if(event.target?.id!=="bjCollectionsMemory"||!owned())return;
      draft=event.target.value.slice(0,2000);dirty=draft!==savedNote();
      const status=$("bjCollectionsSaveStatus");if(status)status.textContent=dirty?"Unsaved changes":"Saved";
      const button=view.querySelector("[data-bj-collection-save]");if(button)button.disabled=!dirty;
    });
    view.addEventListener("click",event=>{
      if(dirty&&owned()&&event.target.closest?.("[data-bj-chapter], [data-bj-action='close']"))persist();
    },true);
    window.addEventListener("life-rpg:view-changed",e=>{
      if(e?.detail?.view!=="bullet-journal"){
        if(dirty&&owned())persist();
        loaded=false;dirty=false;
      }
    });
    window.addEventListener("life-rpg:talent-content-v2-change",e=>{
      if(e.detail?.realm==="Knowledge"&&e.detail?.id===KEY&&book.getChapter?.()==="collections"){
        resetDraft();render();
      }
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.LifeRPGBulletJournalCollections={version:VERSION,render,openPreview,owned,save:persist,mediaGroups,togglePin};
})();