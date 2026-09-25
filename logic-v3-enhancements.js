(() => {
  "use strict";
  if(window.LifeRPGLogicV3Enhancements)return;
  const app=window.LifeRPGApp;
  if(!app?.getState || !window.LifeRPGLogicExpansion)return;
  const VERSION="0.31.4dg";
  const tools={slitherlink:1,nurikabe:1};
  let focused="",message="";
  const root=()=>document.getElementById("logicExpansionDialog");
  const body=()=>document.getElementById("logicExpansionBody");
  const visible=()=>Boolean(root()?.open);
  function game(){const b=body();if(!b)return"";if(b.querySelector("[data-slither-edge]"))return"slitherlink";if(b.querySelector("[data-nuri-cell]"))return"nurikabe";if(b.querySelector("[data-kakuro-cell]"))return"kakuro";return"";}
  function mode(){return root()?.querySelector('[data-logic-mode="practice"].is-active')?"practice":"daily";}
  function session(id=game()){return app.getState().logicExpansion?.games?.[id]?.[mode()]||null;}
  function persist(label){app.saveState({source:`logic-v3-${label}`,suppressUiRefresh:true});}
  function rerender(){const current=mode();root()?.querySelector(`[data-logic-mode="${current}"]`)?.click();}
  function mark(kind,key,value){const s=session(kind);if(!s||s.completedAt)return false;
    if(kind==="slitherlink"){s.edges||={};s.edges[key]=Number(s.edges[key]||0)===value?0:value;}
    else {const index=Number(key);const cell=root()?.querySelector(`[data-nuri-cell="${index}"]`);if(!cell||cell.disabled)return false;s.marks||=[];s.marks[index]=Number(s.marks[index]||0)===value?0:value;}
    s.updatedAt=Date.now();s.result=null;persist(kind+"-mark");rerender();return true;
  }
  function insertControls(){const b=body();if(!b)return;const id=game();if(!id)return;
    if((id==="slitherlink"||id==="nurikabe")&&!b.querySelector(".logic-v3-toolbox")){
      const panel=document.createElement("div");panel.className="logic-v3-toolbox";
      panel.innerHTML=`<div role="group" aria-label="Drawing tools"><button type="button" data-v3-tool="1" class="${tools[id]===1?"selected":""}">${id==="slitherlink"?"━━ Draw line":"■ Mark wall"}</button><button type="button" data-v3-tool="2" class="${tools[id]===2?"selected":""}">${id==="slitherlink"?"× Mark impossible":"□ Mark island"}</button></div><small>Left click: selected tool · Right click: ${id==="slitherlink"?"×":"island"}. Tap again to erase. Touch: select the tool above.</small>`;
      b.querySelector(".logic-instructions-v314ar")?.insertAdjacentElement("afterend",panel);
    }
    if(id==="kakuro"&&!b.querySelector(".logic-v3-kakuro-help")){
      const panel=document.createElement("section");panel.className="logic-v3-kakuro-help";panel.innerHTML='<strong>Guided Kakuro · no blind guessing</strong><p id="logicV3CandidateText" aria-live="polite">Tap a white cell to see candidates.</p><div><button class="secondary-button" type="button" data-v3-kakuro="candidates">Show candidates</button><button class="secondary-button" type="button" data-v3-kakuro="forced">Find a forced digit</button><button class="secondary-button" type="button" data-v3-kakuro="reveal">Reveal one valid digit</button></div><small>Hints read your current crossing sums. A guided reveal is a hint, not a reason to work by random trial and error.</small>';
      b.querySelector(".logic-board-wrap-v314ar")?.insertAdjacentElement("afterend",panel);
      updateCandidates();
    }
  }
  function board(){const el=body()?.querySelector(".kakuro-board-v314ar");if(!el)return null;const cols=Number(el.style.getPropertyValue("--kakuro-cols"))||6;const cells=[...el.children],rows=cells.length/cols;
    const white=(r,c)=>r>=0&&r<rows&&c>=0&&c<cols&&cells[r*cols+c]?.classList.contains("is-white");
    const key=(r,c)=>`${r},${c}`;
    const values={};for(const input of el.querySelectorAll("[data-kakuro-cell]"))values[input.dataset.kakuroCell]=Number(input.value||0);
    const runs=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(!white(r,c)){
      const tile=cells[r*cols+c];const across=parseInt(tile.querySelector(".across")?.textContent||"",10);if(Number.isFinite(across)&&white(r,c+1)){let cs=[];for(let x=c+1;white(r,x);x++)cs.push(key(r,x));runs.push({sum:across,cells:cs,axis:"Across"});}
      const down=parseInt(tile.querySelector(".down")?.textContent||"",10);if(Number.isFinite(down)&&white(r+1,c)){let cs=[];for(let y=r+1;white(y,c);y++)cs.push(key(y,c));runs.push({sum:down,cells:cs,axis:"Down"});}
    }
    return {cols,rows,values,runs,white};
  }
  function candidates(run,values,target){if(!run)return[];const filled=run.cells.map(k=>k===target?0:Number(values[k]||0));const fixed=filled.filter(Boolean);if(new Set(fixed).size!==fixed.length || fixed.some(n=>n<1||n>9))return[];const index=run.cells.indexOf(target);if(index<0)return[];const options=new Set();let nodes=0;
    function search(pos,total,used,selected){if(++nodes>100000 || total>run.sum)return;if(pos===filled.length){if(total===run.sum&&selected)options.add(selected);return;}if(filled[pos]){search(pos+1,total+filled[pos],used,selected);return;}for(let n=1;n<=9;n++){if(used.has(n))continue;used.add(n);search(pos+1,total+n,used,pos===index?n:selected);used.delete(n);}}
    search(0,0,new Set(fixed),0);return [...options].sort((a,b)=>a-b);
  }
  function optionsFor(data,key,values=data.values){const pair=data.runs.filter(r=>r.cells.includes(key));if(pair.length!==2)return[];const a=candidates(pair[0],values,key),b=candidates(pair[1],values,key);return a.filter(x=>b.includes(x));}
  function updateCandidates(){const el=document.getElementById("logicV3CandidateText"),data=board();if(!el||!data)return;const key=focused||Object.keys(data.values).find(k=>!data.values[k]);if(!key){el.textContent="All entries filled. Check the grid!";return;}if(!(key in data.values)){el.textContent="Tap a white cell to select it.";return;}const pair=data.runs.filter(r=>r.cells.includes(key));const opts=optionsFor(data,key);el.textContent=`Row ${Number(key.split(",")[0])+1}, column ${Number(key.split(",")[1])+1} · ${pair.map(r=>r.axis+" "+r.sum).join(" · ")} · ${opts.length?"Allowed: "+opts.join(" / "):"No candidates with the current entries. Recheck the crossing runs."}`;}
  function fill(key,value){const data=board();if(!data||!Number.isInteger(value)||value<1||value>9)return;const s=session("kakuro");if(!s||s.completedAt)return;s.values||={};s.values[key]=String(value);s.assistedCells||=[];if(!s.assistedCells.includes(key))s.assistedCells.push(key);focused=key;s.updatedAt=Date.now();s.result=null;persist("kakuro-guided");rerender();updateCandidates();root()?.querySelector(`[data-kakuro-cell="${key}"]`)?.focus();}
  function possiblePartial(run,values){const digits=run.cells.map(k=>Number(values[k]||0)),filled=digits.filter(Boolean);if(new Set(filled).size!==filled.length||filled.some(n=>n<1||n>9))return false;const sum=filled.reduce((a,b)=>a+b,0),holes=digits.length-filled.length;if(!holes)return sum===run.sum;const rest=Array.from({length:9},(_,i)=>i+1).filter(x=>!filled.includes(x));if(holes>rest.length)return false;const lo=rest.slice(0,holes).reduce((a,b)=>a+b,0),hi=rest.slice(-holes).reduce((a,b)=>a+b,0);return sum+lo<=run.sum&&sum+hi>=run.sum;}
  function solver(data){let visits=0;const values={...data.values};const empties=Object.keys(values).filter(k=>!values[k]);function step(){if(++visits>120000)return null;if(!empties.some(k=>!values[k]))return data.runs.every(r=>possiblePartial(r,values))?{...values}:null;let best=null,opts=null;for(const k of empties){if(values[k])continue;const choices=optionsFor(data,k,values);if(!choices.length)return null;if(!opts||choices.length<opts.length){best=k;opts=choices;if(choices.length===1)break;}}for(const n of opts){values[best]=n;if(data.runs.filter(r=>r.cells.includes(best)).every(r=>possiblePartial(r,values))){const solved=step();if(solved)return solved;}}values[best]=0;return null;}return step();}
  function hint(kind){const data=board();if(!data)return;if(kind==="candidates"){updateCandidates();return;}if(kind==="forced"){for(const [key,value]of Object.entries(data.values)){if(value)continue;const opts=optionsFor(data,key);if(opts.length===1){fill(key,opts[0]);return;}}const el=document.getElementById("logicV3CandidateText");if(el)el.textContent="No forced digit found with your current entries. Choose a cell for crossing-sum candidates or use the guided reveal.";return;}if(kind==="reveal"){const solved=solver(data);const key=focused&&data.values[focused]===0?focused:Object.keys(data.values).find(k=>!data.values[k]);if(!key)return;if(solved?.[key])fill(key,Number(solved[key]));else{const el=document.getElementById("logicV3CandidateText");if(el)el.textContent="No compatible completion found. Check the numbers already entered, then try again.";}}}
  document.addEventListener("click",e=>{if(!visible())return;const g=game();const tool=e.target.closest?.("[data-v3-tool]");if(tool&&(g==="slitherlink"||g==="nurikabe")){e.preventDefault();e.stopImmediatePropagation();tools[g]=Number(tool.dataset.v3Tool)===2?2:1;root()?.querySelectorAll("[data-v3-tool]").forEach(b=>b.classList.toggle("selected",Number(b.dataset.v3Tool)===tools[g]));return;}
    const edge=e.target.closest?.("[data-slither-edge]");if(edge&&g==="slitherlink"){e.preventDefault();e.stopImmediatePropagation();mark(g,edge.dataset.slitherEdge,tools[g]);return;}
    const cell=e.target.closest?.("[data-nuri-cell]");if(cell&&g==="nurikabe"){e.preventDefault();e.stopImmediatePropagation();mark(g,cell.dataset.nuriCell,tools[g]);return;}
    const hintButton=e.target.closest?.("[data-v3-kakuro]");if(hintButton&&g==="kakuro"){e.preventDefault();e.stopImmediatePropagation();hint(hintButton.dataset.v3Kakuro);return;}
  },true);
  document.addEventListener("contextmenu",e=>{if(!visible())return;const g=game(),edge=e.target.closest?.("[data-slither-edge]"),cell=e.target.closest?.("[data-nuri-cell]");if(edge&&g==="slitherlink"){e.preventDefault();e.stopImmediatePropagation();mark(g,edge.dataset.slitherEdge,2);}else if(cell&&g==="nurikabe"){e.preventDefault();e.stopImmediatePropagation();mark(g,cell.dataset.nuriCell,2);}},true);
  document.addEventListener("focusin",e=>{const cell=e.target.closest?.("[data-kakuro-cell]");if(cell&&visible()){focused=cell.dataset.kakuroCell;updateCandidates();}});
  document.addEventListener("input",e=>{if(e.target.closest?.("[data-kakuro-cell]")&&visible())updateCandidates();});
  const target=body();if(target){const obs=new MutationObserver(()=>insertControls());obs.observe(target,{childList:true,subtree:true});insertControls();}
  window.LifeRPGLogicV3Enhancements={version:VERSION,_test:{board,candidates,optionsFor,solver,mark,game,session,updateCandidates}};
})();
