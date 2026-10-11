(() => {
  "use strict";
  // DZ40: read-only Kotoba backup reference; deliberately not part of the Life RPG save.
  // No remote writes to Kotoba's SRS, no guessed Core-2000 membership.
  if (window.LifeRPGJapaneseExtraReading) return;
  const DB_NAME = "life-rpg-japanese-reading-reference";
  const DB_VERSION = 1;
  const STORE = "documents";
  const ESC = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const HAN = /[\u3400-\u9fff]/;
  // Curated readings correspond to the original, spoiler-safe 24 DynaRiot Extras.
  // A lemma is only supplied where its identity is unambiguous; otherwise mining is disabled.
  const ENTRIES = [
    ["切島","きりしま","Kirishima"],["爆豪","ばくごう","Bakugo"],["DynaRiot","","DynaRiot"],
    ["今日","きょう","heute"],["本日","ほんじつ","heute (formell)"],["昨日","きのう","gestern"],["今週","こんしゅう","diese Woche"],
    ["事務所","じむしょ","Büro; Agentur"],["取材","しゅざい","Interview; Recherche"],["思","おも","denken","思う"],["早","はや","früh; schnell","早い"],
    ["飯","めし","Essen"],["近","ちか","nah","近い"],["済","す","erledigen","済ませる"],["待","ま","warten","待つ"],["気","き","Gefühl; Absicht"],
    ["五分","ごふん","fünf Minuten"],["来","こ","kommen","来る"],["今","いま","jetzt"],["行","い","gehen","行く"],
    ["冷蔵庫","れいぞうこ","Kühlschrank"],["最後","さいご","letzte/r/s"],["一個","いっこ","ein Stück"],
    ["勝手","かって","eigenmächtig; ohne Erlaubnis"],["食","た","essen","食べる"],["許","ゆる","erlauben; verzeihen","許す"],
    ["名前","なまえ","Name"],["書","か","schreiben","書く"],["朝","あさ","Morgen"],["強","つよ","stark","強い"],
    ["起","お","aufstehen","起きる"],["瞬間","しゅんかん","Augenblick"],["普通","ふつう","normal"],["動","うご","sich bewegen","動く"],
    ["前","まえ","vorher; vorne"],["外","そと","draußen"],["雨","あめ","Regen"],["降","ふ","fallen (Regen)","降る"],["傘","かさ","Regenschirm"],
    ["持","も","halten; mitbringen","持つ"],["二本","にほん","zwei längliche Dinge"],["一本","いっぽん","ein längliches Ding"],
    ["走","はし","rennen","走る"],["得意","とくい","gut in etwas"],["料理","りょうり","Kochen; Gericht"],
    ["褒","ほ","loben","褒める"],["使用後","しようご","nach Gebrauch"],["使用","しよう","Verwendung"],
    ["後","あと","danach; später"],["器具","きぐ","Gerät; Ausrüstung"],["元","もと","ursprünglicher Ort"],
    ["場所","ばしょ","Ort"],["戻","もど","zurückkehren; zurückbringen","戻す"],["禁止","きんし","verboten"],
    ["全員","ぜんいん","alle Personen"],["特","とく","besonders","特に"],["向","む","gerichtet an","向け"],["誰","だれ","wer"],
    ["約一名","やくいちめい","ungefähr eine Person"],["約","やく","ungefähr"],["一名","いちめい","eine Person"],
    ["終了","しゅうりょう","Ende; abgeschlossen"],["床","ゆか","Fußboden"],["壊","こわ","kaputtmachen","壊す"],
    ["怒","おこ","schimpfen; wütend werden","怒る"],["言","い","sagen","言う"],["消","け","löschen","消す"],
    ["炭酸水","たんさんすい","Sprudelwasser"],["甘","あま","süß","甘い"],["俺","おれ","ich (männlich, umgangssprachlich)"],
    ["了解","りょうかい","verstanden"],["知","し","wissen","知る"],["寄","よ","vorbeikommen","寄る"],["広報","こうほう","Presse; Öffentlichkeitsarbeit"],
    ["二人","ふたり","zwei Personen"],["少","すこ","ein bisschen","少し"],["笑","わら","lächeln; lachen","笑う"],
    ["撮","と","fotografieren","撮る"],["終","お","enden","終わる"],["三十枚","さんじゅうまい","dreißig Blätter/Bilder"],
    ["休","やす","sich ausruhen","休む"],["軽","かる","leicht","軽い"],["完全","かんぜん","vollständig"],
    ["何","なに","was"],["調整","ちょうせい","Regulierung; Anpassung"],["予備","よび","Reserve"],
    ["探","さが","suchen","探す"],["見","み","sehen","見る"],["屋上","おくじょう","Dachterrasse"],
    ["出","で","hinausgehen","出る"],["閉","し","schließen","閉める"],["風","かぜ","Wind"],
    ["書類","しょるい","Dokumente"],["全部","ぜんぶ","alles"],["飛","と","fliegen","飛ぶ"],
    ["拾","ひろ","aufheben","拾う"],["手伝","てつだ","helfen","手伝う"],["原因","げんいん","Ursache"],
    ["手紙","てがみ","Brief"],["届","とど","ankommen; zustellen","届く"],["場","ば","Ort","場所"],
    ["読","よ","lesen","読む"],["始","はじ","anfangen","始める"],["帰","かえ","nach Hause gehen","帰る"],
    ["負","ま","verlieren","負ける"],["方","ほう","Richtung; Person"],["充電器","じゅうでんき","Ladegerät"],
    ["会議室","かいぎしつ","Besprechungsraum"],["借","か","ausleihen","借りる"],["先","さき","zuerst; vorher"],
    ["遅","おそ","spät","遅い"],["時間","じかん","Zeit"],["残","のこ","bleiben","残る"],
    ["必","かなら","unbedingt","必ず"],["声","こえ","Stimme"],["一人","ひとり","eine Person"],
    ["無理","むり","Überforderung; unangemessen"],["片","かた","aufräumen","片づける"],
    ["大丈夫","だいじょうぶ","in Ordnung"],["赤","あか","rot","赤い"],["胸","むね","Brust"],
    ["換気","かんき","Lüften"],["昼休","ひるやす","Mittagspause","昼休み"],["窓","まど","Fenster"],
    ["開","あ","öffnen","開ける"],["雨の日","あめのひ","Regentag"],["日","ひ","Tag"],
    ["最近","さいきん","in letzter Zeit"],["本","ほん","Buch"],["作","つく","machen","作る"],
    ["多","おお","viel","多い"],["材料","ざいりょう","Zutaten; Material"],["確認","かくにん","prüfen"],
    ["電車","でんしゃ","Zug"],["一駅","ひとえき","eine Station"],["乗","の","fahren; einsteigen","乗る"],
    ["過","す","vorbeifahren; überschreiten","過ごす"],["反対方向","はんたいほうこう","Gegenrichtung"],
    ["分","わ","verstehen","分かる"],["昼食","ちゅうしょく","Mittagessen"],["二個","にこ","zwei Stück"],
    ["弁当箱","べんとうばこ","Bento-Dose"],["弁当","べんとう","Lunchbox-Essen"],["置","お","hinstellen","置く"],
    ["午後","ごご","Nachmittag"],["昼","ひる","Mittag"],["仕事","しごと","Arbeit"],["洗","あら","waschen","洗う"],
    ["返","かえ","zurückgeben","返す"],["蓋","ふた","Deckel"],["違","ちが","anders sein","違う"],
    ["逆","ぎゃく","umgekehrt"],["会議用","かいぎよう","für Besprechungen"],["会議","かいぎ","Besprechung"],
    ["資料","しりょう","Unterlagen"],["人数分","にんずうぶん","für die Anzahl der Personen"],["印刷","いんさつ","drucken"],
    ["古","ふる","alt","古い"],["版","はん","Version"],["間違","まちが","verwechseln","間違える"],
    ["日付","ひづけ","Datum"],["予定","よてい","Termin; Plan"],["寝","ね","schlafen","寝る"],
    ["散歩","さんぽ","Spaziergang"],["決","き","entscheiden","決める"],["三十","さんじゅう","dreißig"],
    ["プリン","ぷりん","Pudding"],["コンビニ","こんびに","Convenience-Store"],
    ["トレーニング","とれーにんぐ","Training"],["スタッフ","すたっふ","Personal"],["アイス","あいす","Eis"],
    ["ゲーム","げーむ","Spiel"],["ペン","ぺん","Stift"],["ポケット","ぽけっと","Tasche"],
    ["おにぎり","おにぎり","Reisball"],["ドア","どあ","Tür"],["ごめん","ごめん","Entschuldigung"]
  ];
  const TOKENS = ENTRIES.map(([surface, reading, meaning, lemma]) => ({surface, reading, meaning, lemma: lemma || surface})).sort((a,b)=>b.surface.length-a.surface.length);
  let lexicon = null, importAt = 0, draft = [], activeToken = null, renderSeq = 0, connectedUid = '';
  let dbPromise;
  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB nicht verfügbar'));
    return dbPromise ||= new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    }).catch(e=>{dbPromise=null;throw e;});
  }
  async function dbRead(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function dbWrite(key,value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  function norm(v){return String(v||'').trim().normalize('NFKC');}
  function lookup(token){
    if (!lexicon?.isComplete) return {kind:'unverified',label:'Kotoba-Status nicht importiert'};
    const word=norm(token.lemma), reading=norm(token.reading);
    const exact=lexicon.words.find(v=>norm(v.word)===word && (!reading || norm(v.reading)===reading));
    // Exact spelled word beats an inflected label. Do not invent a Core membership for ambiguous forms.
    const candidates=exact ? [exact] : lexicon.words.filter(v=>norm(v.word)===word);
    if (candidates.length>1 && !exact) return {kind:'unverified',label:'Mehrdeutiger Eintrag – nicht automatisch zugeordnet'};
    const item=candidates[0];
    if(item){
      const stage=Math.max(0, Math.min(9, Number(item.stage)||0));
      const kind=stage>=5?'guru':stage>0?'learning':'new';
      const stageNames=['Neu','Apprentice 1','Apprentice 2','Apprentice 3','Apprentice 4','Guru 1','Guru 2','Master','Enlightened','Burned'];
      return {kind, label:stageNames[stage],item};
    }
    // Only lexical forms explicitly defined in our curated dictionary may be suggested.
    const safeCandidate=token.lemma && token.meaning && token.surface.length>=2 && !["切島","爆豪","DynaRiot"].includes(token.lemma);
    return safeCandidate ? {kind:'outside', label:'Nicht im importierten Core 2000'} : {kind:'unverified',label:'Wortgrenze oder Lernbezug unklar'};
  }
  function annotated(text){
    const source=String(text||''); const output=[];let i=0, n=0;
    while (i<source.length){
      if(source[i]==='\n'){output.push('<span class="jex-linebreak"></span>');i++;continue;}
      const match=TOKENS.find(t=>source.startsWith(t.surface,i));
      if(match){
        const status=lookup(match);const id=`jex-w-${++renderSeq}-${n++}`;
        const surface=HAN.test(match.surface)&&match.reading ? `<ruby>${ESC(match.surface)}<rt>${ESC(match.reading)}</rt></ruby>`:ESC(match.surface);
        const title=`${match.surface} · ${match.meaning}${lexicon ? ' · '+status.label : ' · Kotoba-Lernstand nicht geladen'}`;
        output.push(`<button type="button" class="jex-token jex-${status.kind}" data-jex-token="${ESC(id)}" title="${ESC(title)}" aria-label="${ESC(title)}">${surface}</button>`);
        tokenMap.set(id,{...match,status});i+=match.surface.length;continue;
      }
      // A Kanji without a trusted compound reading is left visible but not assigned invented vocabulary status.
      if(HAN.test(source[i])) output.push(`<span class="jex-kanji-unparsed" title="Lesung hier noch nicht verifiziert">${ESC(source[i])}</span>`);
      else output.push(ESC(source[i]));
      i++;
    }
    return output.join('');
  }
  const tokenMap=new Map();
  function render(text){tokenMap.clear();return annotated(text);}
  function toolbar(){const source=lexicon?`Kotoba synchronisiert · ${new Date(importAt).toLocaleString('de-DE')}`:'Kotoba-Status wird bei der nächsten Verbindung geladen';return `<div class="jex-tools"><span id="jexStatus">${ESC(source)}</span><label class="jex-import-button" title="Optionaler Notfall-Import">Backup-Import (optional)<input type="file" id="jexImport" accept=".json,application/json" hidden /></label><button type="button" data-jex-furigana aria-pressed="true">Furigana an</button><button type="button" data-jex-drafts>Mining-Merkliste</button></div><div id="jexWordDetail" class="jex-detail hidden" aria-live="polite"></div>`;}
  function details(token){
    const st=lookup(token);const core=st.item?.sourceType==='core';
    const title=st.item?.meanings?.length?st.item.meanings.join(' · '):token.meaning;
    const coreLabel=st.item ? (core?`Core 2000 · Level ${st.item.level}`:'Bereits im Kotoba-Mining') : st.kind==='outside'?'Nicht im importierten Core 2000':'Core-Zugehörigkeit nicht geprüft';
    const shouldMine=st.kind==='outside';
    return `<div class="jex-detail-head"><strong>${ESC(token.surface)} <small>${ESC(token.reading)}</small></strong><span class="jex-${st.kind}">${ESC(st.label)}</span></div><p>${ESC(title||'Keine geprüfte Übersetzung')}</p><p class="jex-muted">${ESC(coreLabel)}</p><div class="jex-detail-actions">${shouldMine?'<button type="button" data-jex-mine>Für Kotoba-Mining vormerken</button>':''}<button type="button" data-jex-dismiss>Schließen</button></div>`;
  }
  async function importBackup(file){
    if(!file||file.size>15*1024*1024)throw Error('Bitte eine Kotoba-JSON-Sicherung unter 15 MB wählen.');
    const data=JSON.parse(await file.text());
    const rows=Array.isArray(data.vocabulary)?data.vocabulary:null;
    if(!rows)throw Error('Die Datei enthält keine Kotoba-Vokabelliste.');
    const words=rows.filter(w=>w&&typeof w.word==='string'&&w.word.trim()).map(w=>({word:norm(w.word),reading:norm(w.reading),sourceType:w.sourceType==='mining'?'mining':'core',level:Number(w.level)||0,stage:Math.max(0,Math.min(9,Number(w.stage)||0)),meanings:(Array.isArray(w.meanings)?w.meanings:[]).slice(0,6).map(x=>String(x).slice(0,110))}));
    const core=words.filter(w=>w.sourceType==='core');
    if(core.length<1900||core.length>2300||new Set(core.map(w=>`${w.word}|${w.reading}`)).size<1800)throw Error('Diese Sicherung enthält keinen vollständigen Core-2000-Wortbestand. Bitte die aktuelle Kotoba-Sicherung verwenden.');
    const compact={version:1,at:Date.now(),isComplete:true,words};
    await dbWrite('kotoba-lexicon',compact);lexicon=compact;importAt=compact.at;
    return words.length;
  }
  function setConnectedAccount(uid) {
    const next=String(uid||'');
    if(!next || connectedUid===next)return;
    connectedUid=next;
    if(lexicon?.uid && lexicon.uid!==next){lexicon=null;importAt=0;rerender();}
  }
  async function receiveCloudLexicon(snapshot){
    if(!snapshot?.uid || String(snapshot.uid)!==connectedUid)return false;
    const rows=Array.isArray(snapshot?.words)?snapshot.words:[];
    const core=rows.filter(w=>w?.sourceType==='core');
    // Fail safely if this is a partial upload, or the expected full Core 2000 is missing.
    if(!snapshot?.isComplete||core.length<1900||core.length>2300||new Set(core.map(w=>`${norm(w.word)}|${norm(w.reading)}`)).size<1800)return false;
    const compact={version:1,at:Number(snapshot.at)||Date.now(),uid:connectedUid,isComplete:true,
      words:rows.map(w=>({word:norm(w.word),reading:norm(w.reading),sourceType:w.sourceType==='mining'?'mining':'core',
      level:Math.max(0,Number(w.level)||0),stage:Math.max(0,Math.min(9,Number(w.stage)||0)),
      meanings:(Array.isArray(w.meanings)?w.meanings:[]).slice(0,3).map(x=>String(x).slice(0,100))}))};
    if(importAt>=compact.at && lexicon?.isComplete)return true;
    await dbWrite('kotoba-lexicon',compact);
    lexicon=compact;importAt=compact.at;rerender();return true;
  }
  async function getDrafts(){try{return (await dbRead('mining-drafts'))||[];}catch{return draft;}}
  async function addDraft(token){
    const st=lookup(token);if(st.kind!=='outside')throw Error('Nur eindeutig außerhalb des Core 2000 liegende Wörter lassen sich vormerken.');
    const drafts=await getDrafts();const k=`${token.lemma}|${token.reading}`;
    if(!drafts.some(x=>`${x.lemma}|${x.reading}`===k)) drafts.push({lemma:token.lemma,surface:token.surface,reading:token.reading,meaning:token.meaning,addedAt:Date.now()});
    await dbWrite('mining-drafts',drafts);draft=drafts;return drafts.length;
  }
  function getDialog(){return document.getElementById('talentRewardStudioDialog');}
  function rerender(){const id=window.LifeRPGTalentRewardStudios?.currentJapaneseExtra?.();if(id)window.LifeRPGTalentRewardStudios?.rerenderJapaneseExtra?.();}
  function showDrafts(){const detail=document.getElementById('jexWordDetail');if(!detail)return;detail.classList.remove('hidden');const msg=draft.length?draft.map(d=>`${d.lemma} (${d.reading}) – ${d.meaning}`).join('\n'):'Noch keine Wörter vorgemerkt.';
    detail.innerHTML=`<strong>Mining-Merkliste (${draft.length})</strong><p>${draft.length?'Nur Vormerkung in Life RPG; kein automatischer Kotoba-Import.':'Füge außerhalb des Core 2000 liegende Wörter hinzu.'}</p><pre class="jex-draft-list">${ESC(msg)}</pre><button type="button" data-jex-copy>Liste kopieren</button><button type="button" data-jex-dismiss>Schließen</button>`;
  }
  function bind(){
    document.addEventListener('click',async e=>{
      const node=e.target.closest?.('[data-jex-token]');if(node){activeToken=tokenMap.get(node.dataset.jexToken);const el=document.getElementById('jexWordDetail');if(activeToken&&el){el.classList.remove('hidden');el.innerHTML=details(activeToken);}return;}
      if(e.target.closest?.('[data-jex-dismiss]')){document.getElementById('jexWordDetail')?.classList.add('hidden');return;}
      if(e.target.closest?.('[data-jex-furigana]')){const btn=e.target.closest('[data-jex-furigana]');const section=getDialog()?.querySelector('.jp-extra-card-v314as');section?.classList.toggle('jex-no-furigana');const on=!section?.classList.contains('jex-no-furigana');btn.textContent=on?'Furigana an':'Furigana aus';btn.setAttribute('aria-pressed',String(on));return;}
      if(e.target.closest?.('[data-jex-mine]')){if(!activeToken)return;try{await addDraft(activeToken);const el=document.getElementById('jexWordDetail');if(el)el.innerHTML='<strong>✓ Für Mining vorgemerkt</strong><p>In Life RPG notiert. Die Übertragung in Kotoba Quest ist noch manuell.</p>';}catch(err){window.LifeRPGApp?.showToast?.(String(err.message||err));}return;}
      if(e.target.closest?.('[data-jex-drafts]')){draft=await getDrafts();showDrafts();return;}
      if(e.target.closest?.('[data-jex-copy]')){try{await navigator.clipboard.writeText(draft.map(d=>`${d.lemma}\t${d.reading}\t${d.meaning}`).join('\n'));window.LifeRPGApp?.showToast?.('Mining-Vormerkungen kopiert.');}catch{window.LifeRPGApp?.showToast?.('Kopieren nicht verfügbar.');}return;}
    });
    document.addEventListener('change',async e=>{
      if(e.target.id!=='jexImport')return;
      try{const total=await importBackup(e.target.files?.[0]);window.LifeRPGApp?.showToast?.(`Kotoba-Status: ${total} Wörter nur lesend geladen.`);rerender();}
      catch(err){window.LifeRPGApp?.showToast?.(`Kotoba-Import: ${String(err.message||err)}`);}
      finally{e.target.value='';}
    });
  }
  bind();
  Promise.all([dbRead('kotoba-lexicon'),getDrafts()]).then(([snap,list])=>{
    if(snap?.isComplete && Array.isArray(snap.words) && (!connectedUid||!snap.uid||snap.uid===connectedUid)){
      if(!lexicon || Number(snap.at)>importAt){lexicon=snap;importAt=snap.at||0;rerender();}
    }draft=list||[];
  }).catch(()=>{});
  window.LifeRPGJapaneseExtraReading={render,toolbar,lookup,importBackup,getDrafts,receiveCloudLexicon,setConnectedAccount,ready:()=>Boolean(lexicon?.isComplete),_test:{tokens:TOKENS,annotated}};
})();
