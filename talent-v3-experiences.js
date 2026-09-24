(() => {
  "use strict";
  if (window.LifeRPGTalentV3) return;
  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  if (!app?.getState || !app?.saveState || !graph?.isContentUnlocked) return;
  const VERSION = "0.31.4cz";
  const safe = value => app.escapeHtml?.(String(value ?? "")) ?? String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const datePlus = days => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+days); return dayKey(d); };
  const has = (realm,id) => Boolean(graph.isContentUnlocked(realm,id));
  const definitions = {
    "school-moments": ["Work","School Moments"], "takuzu": ["Knowledge","Takuzu"],
    "future-letter": ["Health","Future Me"], "cozy-kitchen": ["Home","Cozy Kitchen"],
    "palette-atelier": ["Hobbies","Palette Atelier"]
  };
  const SCENARIOS = [
    {id:"quiet-student", title:"The quiet student", setup:"A student has made very little progress on an exercise and quietly says, 'I just can't do maths.' There are six minutes left.", options:[
      ["Ask which line still makes sense to them.","You give them an accessible place to start. The rest of the exercise may stay unfinished, but the student can identify one thing they understand."],
      ["Offer one small example to work through together.","You make a first step visible. The risk is that they follow your example without yet finding their own approach."],
      ["Make a note to revisit the task privately next lesson.","You protect them from a rushed public exchange, while leaving the current moment unresolved."]]},
    {id:"same-hands",title:"The same five hands",setup:"Discussion is lively, but the same students answer every question. Others are waiting without offering a response.",options:[
      ["Give everyone thirty silent seconds, then ask for different voices.","More students can prepare an answer. It will cost some discussion time."],
      ["Ask pairs to compare their thinking first.","The barrier to speaking may drop, though you must still bring ideas back into the group."],
      ["Collect anonymous written responses for the next lesson.","You gain a broader picture without forcing a public answer today."]]},
    {id:"side-comment",title:"A comment that lands badly",setup:"A quick joke in a class discussion seems harmless to some students, but another looks uncomfortable.",options:[
      ["Pause and ask what the comment might have meant to different people.","You make room for perspective taking without assuming everyone's reaction was the same."],
      ["State the boundary and redirect to a respectful formulation.","The class hears a clear expectation; a follow-up may still be needed."],
      ["Check in privately after the lesson while noting the moment.","You can respond sensitively, but the class may not understand why the original comment mattered."]]},
    {id:"unexpected-absence",title:"An unexpected absence",setup:"Two students are absent during a group task. Their group suddenly has half the intended members.",options:[
      ["Simplify the product but retain the central reasoning task.","The key learning stays possible, with a smaller final output."],
      ["Reassign roles across neighboring groups.","More hands become available; you must also balance the social disruption."],
      ["Let the group choose an alternative route to the same goal.","The students get agency, though the results become less directly comparable."]]},
    {id:"mistake-at-board",title:"A useful mistake",setup:"A student writes an incorrect but plausible transformation on the board and several classmates nod along.",options:[
      ["Ask everyone to test the two sides with a simple value.","A counterexample can reveal the issue without making the student the focus."],
      ["Invite another representation of the same step.","Different representations may expose the gap, but students may need extra scaffolding."],
      ["Ask what assumption would make the step valid.","You turn the mistake into a question about conditions rather than a quick verdict."]]},
    {id:"parent-concern",title:"A concerned parent",setup:"An email suggests the student is overwhelmed. You have limited information from class and no time for a long reply tonight.",options:[
      ["Acknowledge the concern and propose a time to talk.","You respond without pretending to know everything yet, but the full discussion comes later."],
      ["Share the class observations you can verify and ask one clarifying question.","The exchange becomes more concrete, while a longer conversation might still help."],
      ["Consult the relevant school support person first.","You can coordinate appropriately, though you should still acknowledge the message promptly."]]},
    {id:"late-transition",title:"Five minutes disappear",setup:"An unplanned transition eats the end of a lesson. Your planned consolidation no longer fits.",options:[
      ["Ask for one sentence showing today's main connection.","You get a compact learning signal, not a full comparison."],
      ["Save one anonymous student example for the next entry.","You create continuity across lessons while delaying the shared wrap-up."],
      ["Have students identify the one open question to bring back.","You preserve uncertainty as useful information rather than rushing an answer."]]},
    {id:"different-pace",title:"Two very different paces",setup:"Some students finished the core task while others are still finding their first approach.",options:[
      ["Offer an extension that challenges the same underlying idea.","The fast finishers deepen their work rather than just receiving more of it."],
      ["Invite optional explanation pairs with clear consent.","Explaining may support both learners, but no student should become a permanent assistant."],
      ["Use the remaining time to compare two valid representations.","You create shared depth and a common discussion point."]]},
    {id:"after-work",title:"The task that follows you home",setup:"You're leaving school with a half-finished preparation task and almost no energy left.",options:[
      ["Write the next action and deliberately stop.","Tomorrow-you gets a starting point; the task stays unfinished tonight."],
      ["Spend a bounded ten minutes organizing the materials.","A short closure may reduce friction, but the boundary needs to remain real."],
      ["Ask whether the task can be simplified before reopening it.","You distinguish what is necessary from what you originally imagined."]]},
    {id:"difficult-question",title:"A question you cannot answer immediately",setup:"A student asks a thoughtful question that goes beyond your prepared material.",options:[
      ["Say what you know and name what you'd need to verify.","You model intellectual honesty rather than a forced instant answer."],
      ["Invite the class to formulate a testable follow-up.","The question becomes an inquiry, though the answer may need another session."],
      ["Record it in a shared question parking area.","It stays visible without derailing the current learning goal."]]}
  ];
  const RECIPES = [
    ["Tomato butter beans",15,["beans","tomatoes","garlic","bread"],"Warm garlic in oil, add tomatoes and drained beans, simmer until saucy. Serve with bread."],
    ["Miso mushroom noodles",20,["noodles","mushrooms","miso","spring onion"],"Cook noodles; sauté mushrooms. Stir miso into a little noodle water and toss everything together."],
    ["Lemon chickpea couscous",15,["couscous","chickpeas","lemon","cucumber"],"Soak couscous according to packet, rinse chickpeas, dice cucumber and dress with lemon and oil."],
    ["Egg fried rice",15,["rice","eggs","frozen peas","soy sauce"],"Use cold cooked rice. Scramble eggs, cook peas, then fry rice and season with soy sauce."],
    ["Creamy spinach pasta",20,["pasta","spinach","cream cheese","garlic"],"Cook pasta; wilt spinach with garlic, loosen cream cheese with pasta water and toss."],
    ["Kimchi tofu bowl",15,["rice","tofu","kimchi","sesame"],"Warm cooked rice; crisp tofu, add kimchi and top with sesame."],
    ["Potato skillet",25,["potatoes","onion","eggs","paprika"],"Slice potatoes thin, pan-cook covered until tender, add onion and paprika; top with eggs."],
    ["Sesame peanut noodles",15,["noodles","peanut butter","soy sauce","carrot"],"Stir peanut butter with soy sauce and warm water, toss with noodles and grated carrot."],
    ["Sausage and bean tray",30,["sausages","beans","tomatoes","onion"],"Roast chopped onion and sausages; add beans and tomatoes and heat until piping hot."],
    ["Sweet potato black beans",30,["sweet potato","black beans","lime","yogurt"],"Roast diced sweet potato until tender. Add warmed beans; finish with lime and yogurt."],
    ["Garlic mushroom toast",15,["bread","mushrooms","garlic","cream cheese"],"Sauté mushrooms with garlic, spread toasted bread with cream cheese and pile mushrooms on top."],
    ["Pesto pea gnocchi",15,["gnocchi","pesto","frozen peas","lemon"],"Boil gnocchi and peas together, drain and toss with pesto and lemon."],
    ["Tomato lentil soup",30,["lentils","tomatoes","onion","stock"],"Simmer lentils with onion, tomatoes and stock until soft; season to taste."],
    ["Halloumi wrap",15,["wraps","halloumi","cucumber","yogurt"],"Pan-sear halloumi, layer in wraps with cucumber and yogurt sauce."],
    ["Tuna rice bowl",10,["rice","tuna","cucumber","soy sauce"],"Combine cooked rice with drained tuna and cucumber; add a little soy sauce."],
    ["Crispy bean quesadilla",15,["tortillas","beans","cheese","tomatoes"],"Mash beans, layer with cheese and tomato in tortilla, toast both sides until hot and crisp."]
  ].map((r,i)=>({id:`meal-${i+1}`,name:r[0],minutes:r[1],ingredients:r[2],steps:r[3]}));
  const PALETTES = [
    ["Sakura dusk",["#dca9b9","#7c5875","#f2d5bc"]], ["Rainy café",["#776b79","#a69c91","#d1b2a0"]],
    ["Little forest",["#486d53","#9eaa7c","#e4c9a0"]], ["Golden afternoon",["#db9b53","#e1bfa0","#7e4962"]],
    ["Ink and lilac",["#40394e","#aea0cf","#d8d0dd"]], ["Sea glass",["#5b8a8b","#b9d7c6","#eee0cf"]],
    ["Plum kitchen",["#733b5c","#c77e95","#d4b09a"]], ["City lights",["#3d466c","#ba7891","#eac9a2"]]
  ];
  const PUZZLES = [
    {clues:["......","1...0.",".11...",".1.0..","..0..1",".....1"],solution:["010110","101100","011001","110010","100101","001011"]},
    {clues:["1....1",".0....","......",".00.0.","......","1....."],solution:["101001","001011","010110","100101","011010","110100"]},
    {clues:["....1.","..1...",".0....","00....","......","1.1..1"],solution:["010110","011010","100101","001011","110100","101001"]},
    {clues:["...0.0",".1....",".1..1.","....10","..1...",".1...."],solution:["101010","011001","010110","100110","101001","010101"]},
    {clues:["1.....","1....0","..0..0","...0..","....1.","...0.."],solution:["101001","101100","010110","011001","100110","010011"]},
    {clues:["....0.","1.1...",".1....",".....0",".00.1.",".1...."],solution:["100101","101010","010101","011010","100110","011001"]},
    {clues:["...1..","..0...","0.0...","......","0.....","0....0"],solution:["101100","100101","010011","101010","010101","011010"]},
    {clues:["..11..","0....0","......","...1.0","......",".0...0"],solution:["001101","010110","101001","110100","010011","101010"]}
  ];
  const ui = {kind:null,mode:"daily",schoolId:null,pantryOnly:false,pantryMax:30,paletteRGB:[128,128,128],paletteTouched:false,paletteRound:0,paletteScore:[]};
  function state() {
    const root = app.getState();
    if (!root.talentV3 || typeof root.talentV3 !== "object" || Array.isArray(root.talentV3)) {
      root.talentV3 = {schemaVersion:1,school:{},takuzu:{daily:{},practice:{},practiceNumber:0},letters:[],kitchen:{pantry:[],favorites:[],tried:[]},palette:{daily:{},practice:{},practiceNumber:0}};
    }
    const s = root.talentV3;
    s.schemaVersion = Math.max(1,Number(s.schemaVersion)||1);
    s.school ||= {}; s.takuzu ||= {daily:{},practice:{},practiceNumber:0}; s.takuzu.daily ||= {};s.takuzu.practice ||= {};
    s.letters ||= [];s.kitchen ||= {pantry:[],favorites:[],tried:[]};
    for(const field of ["pantry","favorites","tried"]) if(!Array.isArray(s.kitchen[field]))s.kitchen[field]=[];
    s.palette ||= {daily:{},practice:{},practiceNumber:0};s.palette.daily ||= {};s.palette.practice ||= {};
    return s;
  }
  function save(source) {app.saveState({source:`talent-v3-${source}`,suppressUiRefresh:true});}
  function award(source,sourceId,label,realm,skillXP,coins=6) {
    if ((app.getState().rewardLedger?.events || []).some(e=>e?.source===source&&e?.sourceId===sourceId)) return null;
    const reward = app.awardActivity?.({source,sourceId,label,realm,capability:realm==="Knowledge"?"knowledge":realm==="Health"?"wellbeing":realm==="Work"?"confidence":"creativity",xp:4,realmXP:6,statXP:4,coins,storyEnergyBase:.12,progressionRelevant:true,metadata:{talentV3:true,skillXP}});
    return reward;
  }
  function ensureDialog() {
    let el=document.getElementById("talentV3Dialog");if(el)return el;
    el=document.createElement("dialog");el.id="talentV3Dialog";el.className="talent-v3-experience";
    el.innerHTML='<div class="talent-v3-experience-shell"><header><span class="talent-v3-experience-mark">✿ UNLOCKED CONTENT</span><button type="button" class="talent-v3-experience-close" data-v3-close aria-label="Close">×</button></header><div id="talentV3Body"></div></div>';
    document.body.appendChild(el);return el;
  }
  const body=()=>document.getElementById("talentV3Body");
  const button=(action,text,cls="secondary-button")=>`<button type="button" class="${cls}" data-v3-action="${safe(action)}">${safe(text)}</button>`;
  const head=(label,title,subtitle)=>`<p class="eyebrow">${safe(label)}</p><h2>${safe(title)}</h2><p class="talent-v3-experience-sub">${safe(subtitle)}</p>`;
  function open(kind) {
    const def=definitions[kind];if(!def)return false;
    if(!has(def[0],kind)){graph.focusRealm?.(def[0]);return false;}
    ui.kind=kind;ui.schoolId=null;ui.mode="daily";ui.paletteTouched=false;ui.paletteRound=0;ui.paletteScore=[];
    ensureDialog();render();const el=ensureDialog();if(!el.open) el.showModal?.();return true;
  }
  function render() {if(!ui.kind)return;const renderers={"school-moments":renderSchool,"takuzu":renderTakuzu,"future-letter":renderLetters,"cozy-kitchen":renderKitchen,"palette-atelier":renderPalette};renderers[ui.kind]?.();}
  function renderSchool() {
    const done=state().school;
    if(!ui.schoolId){body().innerHTML=head("WORK · INTERACTIVE SITUATIONS","School Moments", "Ten short teaching-life stories. Different responses reveal different trade-offs; there is no correct-personality score.")+
      `<div class="talent-v3-cards">${SCENARIOS.map(s=>`<button class="talent-v3-card" type="button" data-v3-school="${s.id}"><strong>${safe(s.title)}</strong><small>${done[s.id]?.choice!=null?"✓ Experienced · revisit freely":"New situation ›"}</small></button>`).join("")}</div>`;return;}
    const item=SCENARIOS.find(x=>x.id===ui.schoolId);if(!item)return;const entry=done[item.id]||{};
    body().innerHTML=head("WORK · SCHOOL MOMENTS",item.title,item.setup)+
      `<div class="talent-v3-choices">${item.options.map((o,i)=>`<button type="button" class="talent-v3-choice ${entry.choice===i?"selected":""}" data-v3-choice="${i}" ${entry.choice!=null?"disabled":""}>${safe(o[0])}</button>`).join("")}</div>`+
      (entry.choice!=null?`<div class="talent-v3-result"><strong>What this opens up</strong><p>${safe(item.options[entry.choice][1])}</p><small>Your first answer is kept. Replays cannot rewrite it.</small></div><label class="talent-v3-label">Anything you want to remember?<textarea id="v3SchoolNote" rows="3" maxlength="1800" placeholder="Optional private reflection…">${safe(entry.note||"")}</textarea></label>${button("save-school-note","Save reflection")}`:"")+
      `<div class="talent-v3-bottom">${button("school-back","← All moments")}</div>`;
  }
  function selectSchool(id){if(SCENARIOS.some(x=>x.id===id)){ui.schoolId=id;renderSchool();}}
  function chooseSchool(choice) {
    const s=state(),id=ui.schoolId,item=SCENARIOS.find(x=>x.id===id);if(!item||s.school[id]?.choice!=null||choice<0||choice>=item.options.length)return;
    s.school[id]={choice,answeredAt:Date.now(),note:""};award("talent-v3-school-moment",id,`School Moments · ${item.title}`,"Work",5);save("school-moment");renderSchool();
  }
  function gameData(mode){const g=state().takuzu;return mode==="daily"?g.daily:g.practice;}
  function puzzleIndex(mode){if(mode==="daily")return dayKey().split("-").reduce((a,v)=>a*31+Number(v),0)%PUZZLES.length;return Math.max(0,Number(state().takuzu.practiceNumber||0))%PUZZLES.length;}
  function takuzuSession(mode=ui.mode){const map=gameData(mode), key=mode==="daily"?dayKey():String(state().takuzu.practiceNumber||0);if(!map[key])map[key]={cells:Array(36).fill(null),completedAt:null};return {key,session:map[key],puzzle:PUZZLES[puzzleIndex(mode)]};}
  function validateTakuzu(values){const rows=Array.from({length:6},(_,r)=>values.slice(r*6,r*6+6).join(""));if(rows.some(x=>x.length!==6||/[^01]/.test(x)||x.match(/000|111/)||x.split("0").length-1!==3||x.split("1").length-1!==3)||new Set(rows).size!==6)return false;const cols=Array.from({length:6},(_,c)=>rows.map(row=>row[c]).join(""));return new Set(cols).size===6&&cols.every(x=>!x.match(/000|111/)&&x.split("0").length-1===3);}
  function renderTakuzu() {
    const {session,puzzle}=takuzuSession();const clues=puzzle.clues.join("");
    body().innerHTML=head("KNOWLEDGE · LOGIC EXPANSION","Takuzu · Binary Logic","Fill each row and column with three 0s and three 1s. No three identical neighbors; no duplicate rows or columns. Tap a blank cell: empty → 0 → 1.")+
      `<div class="talent-v3-tabbar">${button("takuzu-daily","Daily",ui.mode==="daily"?"primary-button":"secondary-button")}${button("takuzu-practice","Practice",ui.mode==="practice"?"primary-button":"secondary-button")}</div><div class="talent-v3-takuzu" role="group" aria-label="6 by 6 Takuzu puzzle">${Array.from({length:36},(_,i)=>`<button type="button" data-v3-cell="${i}" ${clues[i]!=="."||session.completedAt?"disabled":""} class="${clues[i]!=="."?"given":""}" aria-label="Row ${Math.floor(i/6)+1}, column ${i%6+1}, ${clues[i]!=="."?"given ":""}${session.cells[i]??(clues[i]==="."?"empty":clues[i])}">${safe(clues[i]!=="."?clues[i]:session.cells[i]??"·")}</button>`).join("")}</div>`+
      `<p class="talent-v3-status" id="v3TakuzuStatus">${session.completedAt?"✓ Puzzle solved. Your saved board is available for viewing.":"Your grid saves after every move. You can check it whenever you're ready."}</p><div class="talent-v3-bottom">${button("takuzu-clear","Clear my entries")}${button("takuzu-check","Check puzzle","primary-button")}${ui.mode==="practice"?button("takuzu-next","New practice puzzle"):""}</div>`;
  }
  function setCell(index){const {session,puzzle}=takuzuSession();if(session.completedAt||!Number.isInteger(index)||index<0||index>35||puzzle.clues.join("")[index]!==".")return;session.cells[index]=session.cells[index]===null?"0":session.cells[index]==="0"?"1":null;save("takuzu-cell");renderTakuzu();}
  function checkTakuzu(){const {key,session,puzzle}=takuzuSession();if(session.completedAt)return;const values=Array.from({length:36},(_,i)=>puzzle.clues.join("")[i]!=="."?puzzle.clues.join("")[i]:session.cells[i]);const status=document.getElementById("v3TakuzuStatus");if(values.some(x=>x===null)){if(status)status.textContent="There are still empty cells.";return;}if(!validateTakuzu(values)){if(status)status.textContent="One or more row/column rules are not met yet. Keep investigating.";return;}
    // The published puzzle has one verified solution; this final check guards corrupt/modified puzzle data.
    if(values.join("")!==puzzle.solution.join("")){if(status)status.textContent="Some cells do not match this puzzle's solution yet.";return;}
    session.completedAt=Date.now();const sourceId=`takuzu:${ui.mode}:${key}`;if(ui.mode==="daily"){award("talent-v3-takuzu",sourceId,"Takuzu · Daily","Knowledge",10,7);}else{const g=state().takuzu;g.practicePaid ||= {};const date=dayKey();const count=Number(g.practicePaid[date]||0);if(count<2){g.practicePaid[date]=count+1;award("talent-v3-takuzu",sourceId,"Takuzu · Practice","Knowledge",4,2);}}save("takuzu-solve");renderTakuzu();
  }
  function renderLetters(){const letters=state().letters;const ready=letter=>dayKey()>=letter.unlockDate;body().innerHTML=head("HEALTH · LONG-TERM REFLECTION","Letters to Future Me","A small time capsule. Sealed letters live in your normal save; they do not require daily effort or give rewards for writing filler.")+
    `<div class="talent-v3-card"><label class="talent-v3-label">Title<input id="v3LetterTitle" type="text" maxlength="90" placeholder="Something future me should know"></label><label class="talent-v3-label">Write your letter<textarea id="v3LetterText" rows="6" maxlength="5000" placeholder="What is worth remembering, celebrating, or letting go of?"></textarea></label><label class="talent-v3-label">Open after<select id="v3LetterDelay"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>${button("letter-seal","Seal letter","primary-button")}</div><div class="talent-v3-cards">${letters.slice().reverse().map(letter=>`<article class="talent-v3-card"><strong>${safe(letter.title)}</strong><small>Written ${safe(letter.createdDate)} · ${ready(letter)?"Ready to open":"Sealed until "+safe(letter.unlockDate)}</small>${ready(letter)?`<p>${safe(letter.text).replace(/\n/g,"<br>")}</p>`:"<p>✉ Kept safe until your chosen date.</p>"}</article>`).join("")}</div>`;
  }
  function sealLetter(){const title=document.getElementById("v3LetterTitle")?.value.trim().slice(0,90),text=document.getElementById("v3LetterText")?.value.trim().slice(0,5000),days=Number(document.getElementById("v3LetterDelay")?.value);if(!title||text?.length<15||![7,30,90].includes(days)){app.showToast?.("Add a title and at least a short message before sealing.");return;}state().letters.push({id:`letter-${Date.now()}-${state().letters.length}`,title,text,createdDate:dayKey(),unlockDate:datePlus(days)});save("letter-sealed");renderLetters();app.showToast?.("✉ Your letter has been sealed.");}
  function renderKitchen(){const kitchen=state().kitchen,all=[...new Set(RECIPES.flatMap(r=>r.ingredients))].sort();const matches=RECIPES.map(r=>({...r,missing:r.ingredients.filter(i=>!kitchen.pantry.includes(i))})).filter(r=>r.minutes<=ui.pantryMax&&(!ui.pantryOnly||r.missing.length===0)).sort((a,b)=>a.missing.length-b.missing.length||a.minutes-b.minutes);
    body().innerHTML=head("HOME · MEAL INSPIRATION","Cozy Kitchen","Sixteen actual meal ideas with ingredients and steps. Choose what you have; the list never pretends missing ingredients are in your pantry.")+
      `<div class="talent-v3-card"><strong>What's in your kitchen?</strong><div class="talent-v3-chips">${all.map(i=>`<label><input type="checkbox" data-v3-ingredient="${safe(i)}" ${kitchen.pantry.includes(i)?"checked":""}>${safe(i)}</label>`).join("")}</div><label class="talent-v3-label">Time available <select id="v3KitchenMax"><option value="15" ${ui.pantryMax===15?"selected":""}>15 minutes</option><option value="20" ${ui.pantryMax===20?"selected":""}>20 minutes</option><option value="30" ${ui.pantryMax===30?"selected":""}>30 minutes</option></select></label><label><input id="v3KitchenOnly" type="checkbox" ${ui.pantryOnly?"checked":""}> Show only meals with all listed ingredients</label></div><p class="talent-v3-status">${matches.length} meal ideas · your pantry choices persist in your save.</p><div class="talent-v3-cards">${matches.map(r=>`<article class="talent-v3-card"><div class="talent-v3-card-title"><strong>${safe(r.name)}</strong><span>${r.minutes} min</span></div><small>${safe(r.ingredients.join(" · "))}</small><p>${safe(r.steps)}</p>${r.missing.length?`<small>Missing: ${safe(r.missing.join(", "))}</small>`:`<small>✓ Ingredients listed in your pantry</small>`}<div class="talent-v3-bottom"><button data-v3-favorite="${r.id}" type="button" class="secondary-button">${kitchen.favorites.includes(r.id)?"♥ Saved":"♡ Favorite"}</button><button data-v3-tried="${r.id}" type="button" class="secondary-button">${kitchen.tried.includes(r.id)?"✓ Tried":"Mark tried"}</button></div></article>`).join("")}</div>`;
  }
  function toggleKitchen(field,id){const kitchen=state().kitchen, arr=kitchen[field];if(!Array.isArray(arr))return;const index=arr.indexOf(id);if(index>=0)arr.splice(index,1);else arr.push(id);save("kitchen-"+field);renderKitchen();}
  function paletteSession(mode=ui.mode){const pool=mode==="daily"?state().palette.daily:state().palette.practice;const key=mode==="daily"?dayKey():String(state().palette.practiceNumber||0);if(!pool[key])pool[key]={round:0,colors:[],finishedAt:null};return {key,session:pool[key],puzzle:PALETTES[mode==="daily"?dayKey().split("-").reduce((a,x)=>a*31+Number(x),0)%PALETTES.length:Number(state().palette.practiceNumber||0)%PALETTES.length]};}
  const hexToRgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const rgbToHex=rgb=>"#"+rgb.map(v=>Math.min(255,Math.max(0,Number(v)||0)).toString(16).padStart(2,"0")).join("");
  function paletteScore(rgb,target){const t=hexToRgb(target),dist=Math.sqrt(rgb.reduce((sum,value,i)=>sum+(value-t[i])**2,0));return Math.max(0,Math.round(100-dist/4.42));}
  function renderPalette(){const {session,puzzle}=paletteSession();const [name,colors]=puzzle;if(session.finishedAt){body().innerHTML=head("HOBBIES · COLOR PLAY","Palette Atelier · Finished",`${name} · ${session.colors.length} colors matched.`)+`<div class="talent-v3-swatches">${colors.map((hex,i)=>`<div><div class="talent-v3-swatch" style="background:${hex}"></div><small>Target</small><div class="talent-v3-swatch" style="background:${rgbToHex(session.colors[i].rgb)}"></div><small>Your mix · ${session.colors[i].score}%</small></div>`).join("")}</div><div class="talent-v3-bottom">${button("palette-practice","Practice palette")}${button("palette-next","New practice palette")}</div>`;return;}
    const current=session.round,reference=colors[current],rgb=ui.paletteRGB;
    body().innerHTML=head("HOBBIES · PALETTE ATELIER",name,`Round ${current+1} of 3 · look at the target, then mix the three color channels. No timers or color-vision penalties.`)+`<div class="talent-v3-palette-compare"><div><div class="talent-v3-swatch" style="background:${reference}"></div><strong>Target</strong></div><div><div id="v3PaletteMine" class="talent-v3-swatch" style="background:${rgbToHex(rgb)}"></div><strong>Your mix</strong></div></div><div class="talent-v3-card">${["Red","Green","Blue"].map((label,i)=>`<label class="talent-v3-range">${label} <output id="v3PaletteValue${i}">${rgb[i]}</output><input data-v3-rgb="${i}" type="range" min="0" max="255" value="${rgb[i]}"></label>`).join("")}<p class="talent-v3-status">You may use your device's color accessibility tools. ${button("palette-reveal","Reveal target values")}</p><p id="v3PaletteHint" class="talent-v3-status"></p></div>${session.colors.length?`<p class="talent-v3-status">Previous match scores: ${session.colors.map(c=>c.score+"%").join(" · ")}</p>`:""}<div class="talent-v3-bottom">${button("palette-submit","Compare this color","primary-button")}${button("palette-practice","Practice mode")}</div>`;
  }
  function submitPalette(){const {key,session,puzzle}=paletteSession();if(session.finishedAt)return;if(!ui.paletteTouched){app.showToast?.("Mix at least one color channel before comparing.");return;}const target=puzzle[1][session.round],rgb=ui.paletteRGB.slice(),score=paletteScore(rgb,target);session.colors.push({rgb,score,target});session.round++;ui.paletteRGB=[128,128,128];ui.paletteTouched=false;if(session.round>=3){session.finishedAt=Date.now();if(ui.mode==="daily")award("talent-v3-palette",`palette:daily:${key}`,"Palette Atelier · Daily","Hobbies",9,6);else{const p=state().palette;p.practicePaid ||= {};const count=Number(p.practicePaid[dayKey()]||0);if(count<2){p.practicePaid[dayKey()]=count+1;award("talent-v3-palette",`palette:practice:${key}`,"Palette Atelier · Practice","Hobbies",4,2);}}}save("palette-round");renderPalette();}
  document.addEventListener("click", e=>{
    const dlg=document.getElementById("talentV3Dialog");if(!dlg?.open||!dlg.contains(e.target))return;
    if(e.target.closest("[data-v3-close]")){dlg.close();return;}
    const school=e.target.closest("[data-v3-school]");if(school){selectSchool(school.dataset.v3School);return;}
    const choice=e.target.closest("[data-v3-choice]");if(choice){chooseSchool(Number(choice.dataset.v3Choice));return;}
    const cell=e.target.closest("[data-v3-cell]");if(cell){setCell(Number(cell.dataset.v3Cell));return;}
    const favorite=e.target.closest("[data-v3-favorite]");if(favorite){toggleKitchen("favorites",favorite.dataset.v3Favorite);return;}
    const tried=e.target.closest("[data-v3-tried]");if(tried){toggleKitchen("tried",tried.dataset.v3Tried);return;}
    const action=e.target.closest("[data-v3-action]")?.dataset.v3Action;
    if(action==="school-back"){ui.schoolId=null;renderSchool();}
    if(action==="save-school-note"){const entry=state().school[ui.schoolId];if(entry){entry.note=document.getElementById("v3SchoolNote")?.value.slice(0,1800)||"";save("school-note");app.showToast?.("Reflection saved.");}}
    if(action==="takuzu-daily"||action==="takuzu-practice"){ui.mode=action.endsWith("daily")?"daily":"practice";renderTakuzu();}
    if(action==="takuzu-clear"){const s=takuzuSession().session;if(!s.completedAt){s.cells=Array(36).fill(null);save("takuzu-clear");renderTakuzu();}}
    if(action==="takuzu-check")checkTakuzu();
    if(action==="takuzu-next"){state().takuzu.practiceNumber=Number(state().takuzu.practiceNumber||0)+1;save("takuzu-next");renderTakuzu();}
    if(action==="letter-seal")sealLetter();
    if(action==="palette-daily"||action==="palette-practice"){ui.mode=action.endsWith("daily")?"daily":"practice";ui.paletteRGB=[128,128,128];ui.paletteTouched=false;renderPalette();}
    if(action==="palette-submit")submitPalette();
    if(action==="palette-reveal"){const p=paletteSession().puzzle[1][paletteSession().session.round];const hint=document.getElementById("v3PaletteHint");if(hint)hint.textContent=`Target RGB: ${hexToRgb(p).join(" / ")}. This is an accessibility aid, not a separate reward.`;}
    if(action==="palette-next"){ui.mode="practice";state().palette.practiceNumber=Number(state().palette.practiceNumber||0)+1;ui.paletteRGB=[128,128,128];save("palette-next");renderPalette();}
  });
  document.addEventListener("input",e=>{const dlg=document.getElementById("talentV3Dialog");if(!dlg?.open||!dlg.contains(e.target))return;const input=e.target.closest("[data-v3-rgb]");if(input){const index=Number(input.dataset.v3Rgb);ui.paletteRGB[index]=Math.min(255,Math.max(0,Number(input.value)||0));ui.paletteTouched=true;document.getElementById(`v3PaletteValue${index}`).textContent=String(ui.paletteRGB[index]);document.getElementById("v3PaletteMine").style.background=rgbToHex(ui.paletteRGB);}});
  document.addEventListener("change",e=>{const dlg=document.getElementById("talentV3Dialog");if(!dlg?.open||!dlg.contains(e.target))return;const ingr=e.target.closest("[data-v3-ingredient]");if(ingr){toggleKitchen("pantry",ingr.dataset.v3Ingredient);return;}if(e.target.id==="v3KitchenOnly"){ui.pantryOnly=e.target.checked;renderKitchen();}if(e.target.id==="v3KitchenMax"){ui.pantryMax=Number(e.target.value);renderKitchen();}});
  // An ordinary dashboard library, not a second Talent Tree and not a second reward stream.
  // Only show genuinely owned content; the unlock remains permanent in the canonical graph.
  const libraryItems = [
    ["Work", "work-debrief", "✎", "Work Deep Brief", "Journal reflection"],
    ["Work", "school-moments", "✦", "School Moments", "Ten teaching-life decisions"],
    ["Knowledge", "takuzu", "01", "Takuzu", "Daily and practice binary logic"],
    ["Japanese", "dynariot-japanese", "あ", "DynaRiot Extras", "Your unlocked Japanese story cards"],
    ["Health", "year-question", "✿", "365 Question Journal", "A dated question, with alternatives"],
    ["Health", "future-letter", "✉", "Future Me", "Your sealed letters"],
    ["Home", "home-oracle", "⌂", "Home Oracle", "Your home activity wheels"],
    ["Home", "cozy-kitchen", "◉", "Cozy Kitchen", "Pantry-based meal ideas"],
    ["Hobbies", "coloring-studio", "✧", "Coloring Studio", "Your existing coloring work"],
    ["Hobbies", "palette-atelier", "◈", "Palette Atelier", "Daily and practice color play"]
  ];
  let libraryHtml = "";
  function renderLibrary() {
    const anchor = document.getElementById("milestonePanel");
    if (!anchor) return;
    const owned = libraryItems.filter(([realm,id]) => has(realm,id));
    let panel = document.getElementById("talentV3Library");
    if (!owned.length) { if (panel) panel.remove(); libraryHtml=""; return; }
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "talentV3Library";
      panel.className = "panel talent-v3-library";
      panel.setAttribute("aria-label", "Unlocked content library");
      anchor.insertAdjacentElement("beforebegin", panel);
    }
    const body = `<div class="talent-v3-library-head"><div><p class="eyebrow">YOURS TO KEEP</p><h2>Unlocked Content ✿</h2><p class="muted">Open your earned experiences here without returning to the Talent Tree.</p></div><span class="talent-v3-library-count">${owned.length} unlocked</span></div><div class="talent-v3-library-grid">${owned.map(([realm,id,icon,title,detail])=>`<button type="button" class="talent-v3-library-item" data-v3-library="${safe(id)}"><span class="talent-v3-library-icon" aria-hidden="true">${safe(icon)}</span><span><small>${safe(realm.toUpperCase())}</small><strong>${safe(title)}</strong><em>${safe(detail)}</em></span><b aria-hidden="true">›</b></button>`).join("")}</div>`;
    if (libraryHtml !== body) {panel.innerHTML=body;libraryHtml=body;}
  }
  const libraryActions = {
    "work-debrief":()=>app.showView?.("journal"),
    "school-moments":()=>open("school-moments"),
    "takuzu":()=>open("takuzu"),
    "dynariot-japanese":()=>window.LifeRPGTalentRewardStudios?.open?.("dynariot-japanese"),
    "year-question":()=>{app.showView?.("journal");window.LifeRPGJournal?.openReflection?.(dayKey());},
    "future-letter":()=>open("future-letter"),
    "home-oracle":()=>window.LifeRPGTalentRewardStudios?.open?.("home-oracle"),
    "cozy-kitchen":()=>open("cozy-kitchen"),
    "coloring-studio":()=>window.LifeRPGTalentRewardStudios?.open?.("coloring-studio"),
    "palette-atelier":()=>open("palette-atelier")
  };
  document.addEventListener("click", event => {
    const btn = event.target.closest?.("[data-v3-library]");
    if (!btn || !document.getElementById("talentV3Library")?.contains(btn)) return;
    const id = btn.dataset.v3Library;
    const def = libraryItems.find(([realm,key]) => key === id && has(realm,key));
    if (def) libraryActions[id]?.();
  });
  let libraryScheduled = false;
  function scheduleLibrary() {
    if (libraryScheduled) return;
    libraryScheduled = true;
    // This is scheduled only from state/content changes, never the per-second clock.
    window.setTimeout(() => {libraryScheduled=false;renderLibrary();}, 80);
  }
  window.addEventListener("life-rpg:talent-content-v2-change", scheduleLibrary);
  window.addEventListener("life-rpg:state-saved", scheduleLibrary);
  window.addEventListener("life-rpg:render", scheduleLibrary);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleLibrary, {once:true});
  else scheduleLibrary();
  window.LifeRPGTalentV3={version:VERSION,open,getStatus:id=>id==="takuzu"?{unlocked:has("Knowledge","takuzu"),dailySolved:Boolean(state().takuzu.daily[dayKey()]?.completedAt)}:id==="palette-atelier"?{unlocked:has("Hobbies","palette-atelier"),dailySolved:Boolean(state().palette.daily[dayKey()]?.finishedAt)}:null,_test:{validateTakuzu,puzzles:PUZZLES,paletteScore,scenarios:SCENARIOS,recipes:RECIPES}};
})();
