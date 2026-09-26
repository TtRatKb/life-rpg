/* Life RPG V0.31.4dl: one in-app gallery per creative studio; editors stay embedded. */
(() => {
  "use strict";
  if (window.LifeRPGCreativeHub) return;
  const app=window.LifeRPGApp;
  if (!app?.showView) return;
  const E=value=>app.escapeHtml(String(value??""));
  const ID={coloring:"LifeRPGColoringStudioBridge",drawing:"LifeRPGDrawingStudioBridge"};
  const FRAMES={coloring:"coloring-studio.html?embedded=1&v=0.31.4dl",drawing:"drawing-studio.html?embedded=1&v=0.31.4dl"};
  const modes={coloring:"gallery",drawing:"gallery"};
  const selected={coloring:null,drawing:null};
  let drawingFilter="all";
  function unlocked(){const graph=window.LifeRPGTalentTreeGraph;return Boolean(graph?.isContentUnlocked?.("Hobbies","coloring-studio")||Number(graph?.getContentRank?.("Hobbies","coloring-studio")||0)>0);}
  function view(kind){return document.getElementById(`view-${kind}`);}
  function frame(kind){return view(kind)?.querySelector("iframe[data-creative-frame]")||null;}
  function bridge(kind){try{return frame(kind)?.contentWindow?.[ID[kind]]||null;}catch{return null;}}
  function build(){const main=document.querySelector(".app-shell > main");if(!main)return;
    for(const [kind,title,sub] of [["coloring","Coloring Studio","Your unlocked collectible cards · choose a card before coloring"],["drawing","Drawing Studio","Your practice library · choose what to draw or resume"]]){
      if(view(kind))continue;
      const section=document.createElement("section");section.id=`view-${kind}`;section.className="view creative-hub-view";section.innerHTML=`<div class="creative-hub-head"><div><p class="eyebrow">HOBBIES · CREATIVE STUDIO</p><h1>${title}</h1><p>${sub}</p></div><button type="button" class="secondary-button" data-creative-to-play>← Spielen & Lernen</button></div><div data-creative-gallery><div class="creative-loading" role="status">Studio-Galerie wird geladen…</div></div><div data-creative-editor hidden><div class="creative-editor-head"><button type="button" class="secondary-button" data-creative-back>← Zur Galerie</button><strong data-creative-title>${title}</strong><span>Dein Fortschritt wird lokal gespeichert</span></div></div><iframe data-creative-frame title="${title} Editor" loading="eager" hidden></iframe>`;
      main.appendChild(section);
    }
  }
  function load(kind){const f=frame(kind);if(!f)return;
    if(f.dataset.creativeLoading)return;
    f.dataset.creativeLoading="true";
    f.addEventListener("load",()=>{f.dataset.creativeReady="true";render(kind);if(modes[kind]==="editor" && selected[kind])openItem(kind,selected[kind],true);});
    f.addEventListener("error",()=>{const box=view(kind)?.querySelector("[data-creative-gallery]");if(box)box.innerHTML='<p role="alert">Das Studio konnte nicht geladen werden. Bitte die Studio-Dateien des aktuellen Updates hochladen und die Seite neu laden.</p>';});
    f.src=FRAMES[kind];
  }
  function enter(kind){if(!ID[kind])return false;build();app.showView(kind);if(!bridge(kind))load(kind);else render(kind);return true;}
  const completedDrawing=()=>{try{const meta=JSON.parse(localStorage.getItem("lifeRpgDrawingStudioMetaV2")||"{}");return {completed:new Set((meta.history||[]).map(x=>x.challengeId)),continueId:meta.continueChallengeId||null,history:meta.history||[]};}catch{return{completed:new Set(),continueId:null,history:[]};}};
  function coloringMeta(id){try{const s=JSON.parse(localStorage.getItem(`lifeRpgColoringStudio:${id}`)||"null");return{finished:!!s?.finished,started:!!s?.painting,painting:typeof s?.painting==="string"&&s.painting.startsWith("data:image/png;base64,")?s.painting:null};}catch{return{finished:false,started:false,painting:null};}}
  function render(kind){const root=view(kind),b=bridge(kind),gallery=root?.querySelector("[data-creative-gallery]");if(!gallery||!b)return;
    if(!unlocked()){gallery.innerHTML='<div class="creative-locked"><span>🔒</span><strong>Creative Studios</strong><p>Unlock Coloring Studio in the Hobbies Talent Tree to open Coloring and Drawing. Your previous artworks stay saved.</p><button class="primary-button" type="button" data-creative-skills>Hobbies Talent Tree →</button></div>';return;}
    if(kind==="coloring"){
      const cards=b.catalog();gallery.innerHTML=`<div class="creative-gallery-intro"><strong>Your Coloring Cards</strong><span>${cards.length} unlocked · stored on this device</span></div><div class="creative-gallery-grid">${cards.map(c=>{const m=coloringMeta(c.id);return `<button type="button" class="creative-card" data-creative-item="${E(c.id)}"><div class="creative-card-image"><img src="${E(c.src)}" alt="${E(c.title)} line art" loading="lazy">${m.painting?`<img class="creative-paint-preview" src="${m.painting}" alt="Your saved coloring" loading="lazy">`:""}</div><div class="creative-card-info"><small>${m.finished?"FINISHED ✓":m.started?"IN PROGRESS":"READY TO COLOR"}</small><strong>${E(c.title)}</strong><span>${m.finished?"View / continue":m.started?"Continue coloring":"Start coloring"} →</span></div></button>`;}).join("")}</div><p class="creative-storage-note">Coloring progress remains in the existing local Studio storage. Back up your drawings before changing browser or device. Nothing is cleared by this gallery.</p>`;
    }else{
      const list=b.catalog(),meta=completedDrawing(),tracks=["all",...new Set(list.map(c=>c.track))];
      const cards=list.filter(c=>drawingFilter==="all"||c.track===drawingFilter);
      gallery.innerHTML=`<div class="creative-gallery-intro"><strong>Your Drawing Projects</strong><span>${meta.completed.size}/${list.length} practiced · sketches remain on this device</span></div><div class="creative-gallery-filters">${tracks.map(t=>`<button type="button" data-creative-filter="${E(t)}" aria-pressed="${String(t===drawingFilter)}">${E(t==="all"?"All":t[0].toUpperCase()+t.slice(1))}</button>`).join("")}</div><div class="creative-gallery-grid">${cards.map(c=>{const done=meta.completed.has(c.id),ongoing=meta.continueId===c.id;return `<button type="button" class="creative-card creative-drawing-card" data-creative-item="${E(c.id)}"><span class="creative-drawing-illustration" aria-hidden="true">${E(c.icon)}</span><div class="creative-card-info"><small>${ongoing?"CONTINUE PROJECT":done?"PRACTICED ✓":E(c.track.toUpperCase())}</small><strong>${E(c.title)}</strong><p>${E(c.summary)}</p><span>${E(c.minutes)} min · ${E(c.difficulty)} · ${ongoing?"Continue":done?"View / redraw":"Open project"} →</span></div></button>`;}).join("")}</div><p class="creative-storage-note">Each project uses the existing Drawing Studio save, references and reward queue; no duplicate challenge or reset is created.</p>`;
    }
  }
  function mode(kind,next){const root=view(kind);if(!root)return;modes[kind]=next;root.querySelector("[data-creative-gallery]").hidden=next==="editor";root.querySelector("[data-creative-editor]").hidden=next!=="editor";const f=frame(kind);if(f)f.hidden=next!=="editor";}
  function openItem(kind,id,fromLoad=false){const b=bridge(kind);if(!b){selected[kind]=id;load(kind);return;}if(!unlocked())return;
    const card=b.catalog().find(x=>x.id===id);if(!card)return;
    selected[kind]=id;mode(kind,"editor");view(kind)?.querySelector("[data-creative-title]").replaceChildren(document.createTextNode(card.title));
    if(kind==="coloring")b.openCard(id);else{const meta=completedDrawing();b.openChallenge(id,meta.continueId===id);}
    if(!fromLoad)requestAnimationFrame(()=>{try{frame(kind)?.contentWindow?.dispatchEvent(new Event("resize"));}catch{}});
  }
  async function gallery(kind){if(!ID[kind])return;const b=bridge(kind);if(b){try{await (kind==="coloring"?b.flush():b.gallery());}catch(e){console.warn("Creative Studio could not flush in-app gallery",e);}}
    selected[kind]=null;mode(kind,"gallery");render(kind);
  }
  function suspend(kind){const b=bridge(kind);if(!b)return;try{const p=b.flush();if(p?.catch)p.catch(e=>console.warn("Creative Studio save failed",e));}catch(e){console.warn("Creative Studio save failed",e);}}
  document.addEventListener("click",event=>{
    const home=event.target.closest("[data-creative-to-play]");if(home){app.showView("hub-play");return;}
    const back=event.target.closest("[data-creative-back]");if(back){gallery(back.closest(".creative-hub-view")?.id?.replace("view-",""));return;}
    const talents=event.target.closest("[data-creative-skills]");if(talents){window.LifeRPGLifeHub?.openStudio?.("skills");return;}
    const filter=event.target.closest("[data-creative-filter]");if(filter){drawingFilter=filter.dataset.creativeFilter;render("drawing");return;}
    const item=event.target.closest("[data-creative-item]");if(item){const kind=item.closest(".creative-hub-view")?.id?.replace("view-","");if(kind)openItem(kind,item.dataset.creativeItem);}
  });
  window.addEventListener("life-rpg:view-changed",e=>{const id=e.detail?.view;if(ID[id]){if(!frame(id)?.dataset.creativeLoading)load(id);if(modes[id]==="gallery")render(id);}else{for(const kind of Object.keys(ID))if(modes[kind]==="editor")suspend(kind);}});
  window.addEventListener("focus",()=>{for(const kind of Object.keys(ID))if(modes[kind]==="gallery")render(kind);});
  window.addEventListener("pagehide",()=>{for(const kind of Object.keys(ID))suspend(kind);});
  function init(){build();for(const kind of Object.keys(ID))if(document.getElementById(`view-${kind}`)?.classList.contains("active"))load(kind);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.LifeRPGCreativeHub={version:"0.31.4dl",enter,gallery,render,openItem,_test:{unlocked,coloringMeta,completedDrawing,modes}};
})();
