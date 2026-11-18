/* Life RPG — authentic Jasmine illustration layers, supplied by the user.
 * This is intentionally a thin runtime adapter over the actual exported SVG,
 * not heuristic cut-outs, screenshots or blurry thumbnail replacements.
 * No personal journal state, account data, or Canva network access needed.
 */
(function(){
 "use strict";
 const ns="http://www.w3.org/2000/svg";
 const source="assets/journal/source/jasmine-canva-magic-layers.svg";
 const basis=0.74957;
 const assets=Object.create(null);
 const specs={
  "frame:gratitude":{w:377,h:256,box:[52,273,429,529],parts:[11,12,13,14],base:[11],
    write:[.11936,.28516,.75862,.59375]},
  "frame:focusText":{w:327,h:234,box:[422,371,749,605],parts:[15,16,17],base:[15],
    write:[.13761,.33333,.70948,.50]},
  "frame:intentionText":{w:256,h:245,box:[30,518,286,763],parts:[18,19,20,21],base:[19,21],
    write:[.250,.34286,.680,.51020]},
  "frame:happyMomentsText":{w:293,h:228,box:[49,723,342,951],parts:[32,33,34,35],base:[32,34],
    write:[.11263,.35965,.78157,.50439]},
  "frame:bookNote":{w:270,h:265,box:[633,810,903,1075],parts:[42,43,44],base:[42,44],
    write:[.10370,.27547,.75185,.55849]},
  "deco:jasmine-bouquet":{box:[35,14,318,305],parts:[2]},
  "deco:journal-title":{box:[326,34,590,214],parts:[4]},
  "deco:date-tag":{box:[619,29,885,189],parts:[7,8,9]},
  "deco:moon-window":{box:[566,174,832,451],parts:[10]},
  "deco:floral-books":{box:[283,522,443,683],parts:[22]},
  "deco:tea-and-flowers":{box:[318,769,513,887],parts:[38]},
  "deco:postcards":{box:[336,915,549,1090],parts:[39]},
  "deco:hanging-jasmine":{box:[760,551,903,814],parts:[45]},
  "deco:jasmine-wrap":{box:[53,944,266,1161],parts:[36]},
  "deco:jasmine-vase":{box:[548,726,725,1003],parts:[41]},
  "deco:little-quote":{box:[242,147,309,226],parts:[3]},
  "deco:soft-quote":{box:[414,218,539,269],parts:[6]},
  "deco:slow-quote":{box:[510,740,566,812],parts:[40]},
  "deco:curled-ribbon":{box:[530,1060,761,1147],parts:[48]},
  "deco:small-flower":{box:[53,275,142,364],parts:[13]}
 };
 const safeSVGString=xml=>{
  // Source is the artwork bundled inside the project. Nonetheless, never
  // allow scripts, event handler attributes or remote image dependencies
  // into a generated image URL.
  for(const element of [...xml.querySelectorAll("*")]){
   if(["script","foreignObject","iframe"].includes(element.localName)){
    element.remove();continue;
   }
   for(const attr of [...element.attributes]){
    const name=attr.localName.toLowerCase();
    if(name.startsWith("on")||name==="href"&&!attr.value.startsWith("data:")&&!attr.value.startsWith("#")){
     element.removeAttributeNode(attr);
    }
   }
  }
  return xml;
 };
 const encode=(doc,components)=>{
  const root=doc.documentElement,kids=[...root.children];
  const def=kids.find(x=>x.localName==="defs");
  const [x1,y1,x2,y2]=components.box;
  const svg=doc.createElementNS(ns,"svg");
  svg.setAttribute("xmlns",ns);
  svg.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");
  svg.setAttribute("width",String((x2-x1)));
  svg.setAttribute("height",String((y2-y1)));
  svg.setAttribute("viewBox",[x1*basis,y1*basis,(x2-x1)*basis,(y2-y1)*basis].join(" "));
  svg.setAttribute("preserveAspectRatio","none");
  if(def)svg.appendChild(def.cloneNode(true));
  for(const i of components.parts){
   const layer=kids[i];
   if(!layer||layer.localName!=="g")throw new Error("SVG layer "+i+" missing");
   // The exported SVG contains actual reconstructed image pixels and their
   // vector alpha masks. They are kept unchanged, including overlap contours.
   svg.appendChild(layer.cloneNode(true));
  }
  const source=new XMLSerializer().serializeToString(svg);
  return URL.createObjectURL(new Blob([source],{type:"image/svg+xml"}));
 };
 const background=()=>{
  const design='<svg xmlns="http://www.w3.org/2000/svg" width="420" height="590" viewBox="0 0 420 590">'+
    '<defs><radialGradient id="p"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f3e5d5"/></radialGradient>'+
    '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="2" seed="18"/></filter></defs>'+
    '<rect width="420" height="590" fill="url(#p)"/>'+
    '<rect width="420" height="590" filter="url(#grain)" opacity=".028"/></svg>';
  return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(design);
 };
 const load=async()=>{
  const response=await fetch(source,{cache:"force-cache",credentials:"same-origin"});
  if(!response.ok)throw new Error("Original Jasmine SVG could not load ("+response.status+")");
  const text=await response.text();
  if(text.length<2000000)throw new Error("Jasmine SVG artwork was unexpectedly truncated");
  const doc=new DOMParser().parseFromString(text,"image/svg+xml");
  if(doc.querySelector("parsererror"))throw new Error("Jasmine SVG artwork is malformed");
  safeSVGString(doc);
  for(const [key,spec] of Object.entries(specs)){
   const box=spec.box;
   assets[key]={w:spec.w||box[2]-box[0],h:spec.h||box[3]-box[1],
    bbox:box,write:spec.write||null,url:encode(doc,spec)};
  }
  assets["paper:clean"]={w:920,h:1162,url:background()};
  return assets;
 };
 const ready=load().catch(error=>{
  console.warn("Original watercolor layers unavailable; keeping existing Journal safe:",error);
  throw error;
 });
 window.LifeRPGJournalCanvasLayers={version:2,source,assets,ready};
})();
