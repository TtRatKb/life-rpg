(() => {
  "use strict";

  const VERSION = "0.31.4ca";
  const DB_NAME = "life-rpg-coloring-v1";
  const STORE = "pages";
  const PAGES = [
    {
      id: "bakugo-trading-card",
      title: "Bakugo Trading Card",
      subtitle: "Collectible-card coloring page",
      src: `assets/coloring/bakugo-trading-card-line.png?v=${VERSION}`,
      width: 1122,
      height: 1402
    }
  ];
  const QUICK = ["#2D2130","#5C294B","#9A486D","#D8759E","#F2A7BF","#EFCFBC","#F4D35E","#E88945","#BC3C38","#7C2F34","#4A6658","#79A879","#6C8DC6","#8A72BC","#D6C4EF","#FFFFFF"];

  const els = {};
  let dbPromise = null;
  let activePage = null;
  let ctx = null;
  let strokes = [];
  let redoStack = [];
  let currentStroke = null;
  let pointerId = null;
  let saveTimer = null;
  let dirty = false;
  let eraser = false;
  let brushSize = 18;
  let color = "#D8759E";
  let hue = 337;
  let saturation = .51;
  let value = .85;
  let wheelPointerId = null;
  let finished = false;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    Object.assign(els, {
      back: document.getElementById("backToLifeRpg"),
      savePill: document.getElementById("savePill"),
      library: document.getElementById("cardLibrary"),
      canvas: document.getElementById("paintCanvas"),
      lineArt: document.getElementById("lineArt"),
      wheel: document.getElementById("colorWheel"),
      brightness: document.getElementById("brightness"),
      brightnessValue: document.getElementById("brightnessValue"),
      preview: document.getElementById("colorPreview"),
      hex: document.getElementById("hexInput"),
      quick: document.getElementById("quickColors"),
      brush: document.getElementById("brushSize"),
      brushValue: document.getElementById("brushSizeValue"),
      eraser: document.getElementById("eraserButton"),
      undo: document.getElementById("undoButton"),
      redo: document.getElementById("redoButton"),
      clear: document.getElementById("clearButton"),
      export: document.getElementById("exportButton"),
      finish: document.getElementById("finishButton"),
      toggleTools: document.getElementById("toggleTools"),
      tools: document.getElementById("toolsPanel")
    });

    ctx = els.canvas.getContext("2d", { alpha: true });
    renderLibrary();
    renderQuickColors();
    bind();
    const requested = new URLSearchParams(location.search).get("page");
    selectPage(PAGES.find(p => p.id === requested)?.id || PAGES[0].id);
    syncPickerFromHex(color);
  }

  function bind() {
    els.back.addEventListener("click", async () => {
      if (dirty) await persistNow();
      if (history.length > 1 && document.referrer.includes(location.host)) history.back();
      else location.href = "index.html";
    });
    els.canvas.addEventListener("pointerdown", paintStart);
    els.canvas.addEventListener("pointermove", paintMove);
    els.canvas.addEventListener("pointerup", paintEnd);
    els.canvas.addEventListener("pointercancel", paintEnd);
    els.canvas.style.touchAction = "none";

    els.wheel.addEventListener("pointerdown", wheelStart);
    els.wheel.addEventListener("pointermove", wheelMove);
    els.wheel.addEventListener("pointerup", wheelEnd);
    els.wheel.addEventListener("pointercancel", wheelEnd);
    els.wheel.style.touchAction = "none";

    els.brightness.addEventListener("input", () => {
      value = clamp01(Number(els.brightness.value) / 100);
      setColorFromHsv();
    });
    els.hex.addEventListener("input", () => {
      const normalized = normalizeHex(els.hex.value);
      if (normalized) setColor(normalized);
    });
    els.brush.addEventListener("input", () => {
      brushSize = Math.max(2, Math.min(90, Number(els.brush.value) || 18));
      els.brushValue.textContent = `${brushSize}px`;
    });
    els.eraser.addEventListener("click", () => { eraser = !eraser; updateTools(); });
    els.undo.addEventListener("click", undo);
    els.redo.addEventListener("click", redo);
    els.clear.addEventListener("click", clearAll);
    els.export.addEventListener("click", exportPng);
    els.finish.addEventListener("click", toggleFinished);
    els.toggleTools.addEventListener("click", () => els.tools.classList.toggle("is-open"));

    window.addEventListener("keydown", event => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    });
    window.addEventListener("pagehide", () => { if (dirty) persistNow(); });
  }

  function renderLibrary() {
    els.library.innerHTML = PAGES.map(page => `
      <button class="library-card" type="button" data-page="${page.id}">
        <span class="library-thumb"><img src="${page.src}" alt=""></span>
        <span><small>COLORING CARD</small><strong>${page.title}</strong></span>
      </button>`).join("");
    els.library.addEventListener("click", event => {
      const button = event.target.closest("[data-page]");
      if (button) selectPage(button.dataset.page);
    });
  }

  function renderQuickColors() {
    els.quick.innerHTML = QUICK.map(c => `<button type="button" data-color="${c}" style="--swatch:${c}" aria-label="${c}"></button>`).join("");
    els.quick.addEventListener("click", event => {
      const button = event.target.closest("[data-color]");
      if (button) setColor(button.dataset.color);
    });
  }

  async function selectPage(pageId) {
    const page = PAGES.find(p => p.id === pageId);
    if (!page) return;
    if (dirty) await persistNow();
    activePage = page;
    strokes = [];
    redoStack = [];
    finished = false;
    els.canvas.width = page.width;
    els.canvas.height = page.height;
    els.lineArt.src = page.src;
    document.querySelectorAll(".library-card").forEach(button => button.classList.toggle("is-active", button.dataset.page === page.id));
    setSaveStatus("saving", "Loading…");
    const record = await loadRecord(page.id).catch(() => null);
    if (record) {
      strokes = migrateStrokes(record, page.width, page.height);
      finished = Boolean(record.finished);
    }
    redraw();
    updateTools();
    setSaveStatus("ready", record ? `Loaded · ${strokes.length} strokes` : "New page");
    const url = new URL(location.href);
    url.searchParams.set("page", page.id);
    history.replaceState({}, "", url);
  }

  function pointFromEvent(event) {
    const rect = els.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * els.canvas.width / rect.width;
    const y = (event.clientY - rect.top) * els.canvas.height / rect.height;
    const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure : .55;
    return [round1(x), round1(y), Math.round(pressure * 100) / 100];
  }

  function paintStart(event) {
    if (!activePage || pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    try { els.canvas.setPointerCapture(pointerId); } catch {}
    const p = pointFromEvent(event);
    currentStroke = { color, size: brushSize, eraser, points: [p] };
    drawStroke(currentStroke);
  }

  function paintMove(event) {
    if (event.pointerId !== pointerId || !currentStroke) return;
    event.preventDefault();
    const p = pointFromEvent(event);
    const prev = currentStroke.points[currentStroke.points.length - 1];
    const dx = p[0]-prev[0], dy = p[1]-prev[1];
    if (dx*dx + dy*dy < 2.5) return;
    currentStroke.points.push(p);
    drawSegment(currentStroke, prev, p);
  }

  function paintEnd(event) {
    if (event.pointerId !== pointerId || !currentStroke) return;
    event.preventDefault();
    try { els.canvas.releasePointerCapture(pointerId); } catch {}
    if (currentStroke.points.length === 1) {
      const p = currentStroke.points[0];
      currentStroke.points.push([p[0]+.2,p[1]+.2,p[2]]);
    }
    strokes.push(currentStroke);
    currentStroke = null;
    pointerId = null;
    redoStack = [];
    dirty = true;
    scheduleSave();
    updateTools();
  }

  function drawStroke(stroke) {
    if (!stroke?.points?.length) return;
    if (stroke.points.length === 1) {
      const p=stroke.points[0];
      drawSegment(stroke,p,[p[0]+.2,p[1]+.2,p[2]]);
      return;
    }
    for (let i=1;i<stroke.points.length;i++) drawSegment(stroke,stroke.points[i-1],stroke.points[i]);
  }

  function drawSegment(stroke, a, b) {
    ctx.save();
    ctx.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color || "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pressure = (Number(a[2] || .55) + Number(b[2] || .55)) / 2;
    ctx.lineWidth = Number(stroke.size || 18) * (.68 + pressure * .65);
    ctx.beginPath();
    ctx.moveTo(a[0],a[1]);
    ctx.lineTo(b[0],b[1]);
    ctx.stroke();
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0,0,els.canvas.width,els.canvas.height);
    strokes.forEach(drawStroke);
  }

  function undo() {
    if (!strokes.length) return;
    redoStack.push(strokes.pop());
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function redo() {
    if (!redoStack.length) return;
    strokes.push(redoStack.pop());
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function clearAll() {
    if (!strokes.length) return;
    if (!confirm("Clear every color stroke from this card?")) return;
    redoStack.push(...strokes.splice(0));
    dirty = true; redraw(); scheduleSave(); updateTools();
  }

  function toggleFinished() {
    finished = !finished;
    dirty = true;
    scheduleSave();
    updateTools();
  }

  function updateTools() {
    els.eraser.classList.toggle("is-active", eraser);
    els.undo.disabled = !strokes.length;
    els.redo.disabled = !redoStack.length;
    els.finish.textContent = finished ? "Finished ✓" : "Mark finished";
    document.querySelectorAll("[data-color]").forEach(b => b.classList.toggle("is-selected", !eraser && b.dataset.color.toUpperCase() === color.toUpperCase()));
  }

  function setColor(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    color = normalized;
    eraser = false;
    syncPickerFromHex(color);
    updateTools();
  }

  function setColorFromHsv() {
    const rgb = hsvToRgb(hue,saturation,value);
    color = rgbToHex(rgb.r,rgb.g,rgb.b);
    eraser = false;
    updatePickerUi();
    drawWheel();
    updateTools();
  }

  function syncPickerFromHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r,rgb.g,rgb.b);
    hue=hsv.h; saturation=hsv.s; value=hsv.v;
    color=rgbToHex(rgb.r,rgb.g,rgb.b);
    updatePickerUi();
    drawWheel();
  }

  function updatePickerUi() {
    els.hex.value = color.toUpperCase();
    els.preview.style.setProperty("--preview",color);
    els.brightness.value = String(Math.round(value*100));
    els.brightnessValue.textContent = `${Math.round(value*100)}%`;
  }

  function drawWheel() {
    const w=els.wheel.width,h=els.wheel.height,cx=w/2,cy=h/2,radius=Math.min(w,h)*.47;
    const wctx=els.wheel.getContext("2d");
    const image=wctx.createImageData(w,h);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const dx=x-cx,dy=y-cy,dist=Math.hypot(dx,dy),i=(y*w+x)*4;
      if(dist>radius){image.data[i+3]=0;continue;}
      const hVal=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
      const sVal=Math.min(1,dist/radius);
      const rgb=hsvToRgb(hVal,sVal,value);
      image.data[i]=rgb.r;image.data[i+1]=rgb.g;image.data[i+2]=rgb.b;image.data[i+3]=255;
    }
    wctx.clearRect(0,0,w,h);wctx.putImageData(image,0,0);
    const angle=hue*Math.PI/180,mr=saturation*radius,mx=cx+Math.cos(angle)*mr,my=cy+Math.sin(angle)*mr;
    wctx.save();wctx.beginPath();wctx.arc(mx,my,7,0,Math.PI*2);wctx.lineWidth=3;wctx.strokeStyle="#fff";wctx.stroke();wctx.beginPath();wctx.arc(mx,my,8.5,0,Math.PI*2);wctx.lineWidth=1.5;wctx.strokeStyle="#321d34";wctx.stroke();wctx.restore();
  }

  function wheelPick(event) {
    const rect=els.wheel.getBoundingClientRect();
    const x=(event.clientX-rect.left)*els.wheel.width/rect.width,y=(event.clientY-rect.top)*els.wheel.height/rect.height;
    const cx=els.wheel.width/2,cy=els.wheel.height/2,radius=Math.min(els.wheel.width,els.wheel.height)*.47;
    let dx=x-cx,dy=y-cy,dist=Math.hypot(dx,dy);
    if(dist>radius && dist>0){const k=radius/dist;dx*=k;dy*=k;dist=radius;}
    hue=(Math.atan2(dy,dx)*180/Math.PI+360)%360;saturation=Math.min(1,dist/radius);setColorFromHsv();
  }
  function wheelStart(event){if(wheelPointerId!==null)return;event.preventDefault();wheelPointerId=event.pointerId;try{els.wheel.setPointerCapture(wheelPointerId);}catch{}wheelPick(event);}
  function wheelMove(event){if(event.pointerId!==wheelPointerId)return;event.preventDefault();wheelPick(event);}
  function wheelEnd(event){if(event.pointerId!==wheelPointerId)return;event.preventDefault();try{els.wheel.releasePointerCapture(wheelPointerId);}catch{}wheelPick(event);wheelPointerId=null;}

  function scheduleSave() {
    clearTimeout(saveTimer);
    setSaveStatus("saving","Saving…");
    saveTimer=setTimeout(persistNow,350);
  }

  async function persistNow() {
    if (!activePage) return;
    clearTimeout(saveTimer);
    const record={pageId:activePage.id,strokes,finished,canvasWidth:activePage.width,canvasHeight:activePage.height,updatedAt:Date.now()};
    try{
      await saveRecord(record);dirty=false;setSaveStatus("ready",`Saved · ${strokes.length} strokes`);
    }catch(error){console.warn("Coloring save failed",error);setSaveStatus("error","Save failed");}
  }

  function setSaveStatus(state,text){els.savePill.dataset.state=state;els.savePill.querySelector("b").textContent=text;}

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"pageId"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    return dbPromise;
  }
  async function loadRecord(pageId){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).get(pageId);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
  async function saveRecord(record){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(record);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}

  function migrateStrokes(record,targetW,targetH){
    const source=Array.isArray(record.strokes)?record.strokes:[];
    const fromW=Number(record.canvasWidth)||1024,fromH=Number(record.canvasHeight)||1365;
    if(fromW===targetW&&fromH===targetH)return source;
    const sx=targetW/fromW,sy=targetH/fromH,ss=(sx+sy)/2;
    return source.map(stroke=>({...stroke,size:Number(stroke.size||18)*ss,points:(stroke.points||[]).map(p=>[p[0]*sx,p[1]*sy,p[2]])}));
  }

  async function exportPng(){
    if(!activePage)return;
    await persistNow();
    setSaveStatus("saving","Exporting…");
    const out=document.createElement("canvas");out.width=activePage.width;out.height=activePage.height;
    const octx=out.getContext("2d");octx.fillStyle="#fff";octx.fillRect(0,0,out.width,out.height);octx.drawImage(els.canvas,0,0);
    try{const img=await loadImage(activePage.src);octx.drawImage(img,0,0,out.width,out.height);}catch{}
    out.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`life-rpg-${activePage.id}-coloring.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);setSaveStatus("ready","Exported");},"image/png");
  }
  function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}

  function normalizeHex(v){const m=String(v||"").trim().match(/^#?([0-9a-f]{6})$/i);return m?`#${m[1].toUpperCase()}`:null;}
  function hexToRgb(hex){const h=normalizeHex(hex);if(!h)return null;const n=parseInt(h.slice(1),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
  function rgbToHex(r,g,b){const p=n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0");return`#${p(r)}${p(g)}${p(b)}`.toUpperCase();}
  function clamp01(n){return Math.max(0,Math.min(1,Number(n)||0));}
  function hsvToRgb(h,s,v){h=((Number(h)%360)+360)%360;s=clamp01(s);v=clamp01(v);const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};}
  function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return{h,s:max===0?0:d/max,v:max};}
  function round1(n){return Math.round(n*10)/10;}
})();
