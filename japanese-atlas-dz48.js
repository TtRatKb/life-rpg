(() => {
  "use strict";
  if (window.LifeRPGJapaneseAtlasDZ48) return;
  const app = window.LifeRPGApp;
  const graph = window.LifeRPGTalentTreeGraph;
  if (!app?.getState || !app?.saveState || !graph?.getContentRank) return;

  const VERSION = "0.31.4dz48";
  const MODES = {
    kanji: { id:"kanji", unlock:"japanese-atlas-kanji", icon:"漢", title:"Kanji Memory Garden", skill:"Vocabulary & Kanji", skillId:"japanese-vocabulary-kanji", subtitle:"Recall a meaning and one reading before revealing the mnemonic cue. For full SRS and your own mnemonic cards, keep using Kotoba Quest." },
    grammar: { id:"grammar", unlock:"japanese-atlas-grammar", icon:"文", title:"Grammar Pattern Lab", skill:"Grammar & Particles", skillId:"japanese-grammar-particles", subtitle:"Nine context questions with an actual answer, feedback and an explanation. New sets open with each rank." },
    reading: { id:"reading", unlock:"japanese-atlas-reading", icon:"読", title:"Reading Café", skill:"Reading & Comprehension", skillId:"japanese-reading-mining", subtitle:"Nine short texts with comprehension questions. Look for meaning rather than translating every word." },
    listening: { id:"listening", unlock:"japanese-atlas-listening", icon:"耳", title:"Listening Window", skill:"Listening & Comprehension", skillId:"japanese-listening-comprehension", subtitle:"Play a short Japanese line with your device's Japanese voice, answer by ear, then check the transcript. This is browser speech, not human-recorded audio." },
    speaking: { id:"speaking", unlock:"japanese-atlas-speaking", icon:"話", title:"Conversation Studio", skill:"Speaking & Production", skillId:"japanese-speaking-production", subtitle:"Create your own Japanese response to a real situation, then compare it with a natural model answer. Type or say it aloud first." }
  };
  // Each bank contains exactly 3 newly unlocked exercises per rank. Cards are
  // authored prompts, not generated filler. Answer explanations are intentionally
  // concise and never claim to assess an open-ended spoken answer.
  const BANK = {
    kanji: [
      [1,"Everyday rhythm","習","lernen/üben; nara(u)","習（ならう）— lernen, üben","羽 (Flügel) + 白 (weiß): Stell dir vor, ein Vogel übt mit hellen Flügeln immer wieder dieselbe Bewegung."],
      [1,"Daily movement","歩","gehen; aru(ku)","歩（あるく）— zu Fuß gehen","止 (anhalten) und 少 (wenig): ganz viele kleine Schritte bringen dich voran."],
      [1,"A promise","約","Versprechen/Verabredung; yaku","約（やく）— Versprechen, Verabredung; 約束（やくそく）","糸 (Faden) verknüpft eine Abmachung. Das ist ein Gedächtnisbild, keine historische Etymologie."],
      [2,"Work and effort","働","arbeiten; hatara(ku)","働（はたらく）— arbeiten","亻 (Person) + 動 (sich bewegen): Die Person wird aktiv und arbeitet."],
      [2,"Continuing onward","続","fortsetzen; tsuzu(ku)","続（つづく）— weitergehen, andauern","Stell dir einen Faden vor, der nicht abreißt: Die Geschichte geht weiter."],
      [2,"Choosing","選","wählen; era(bu)","選（えらぶ）— auswählen","Viele Möglichkeiten liegen vor dir; du gehst bewusst einen Weg und entscheidest dich."],
      [3,"The surrounding area","境","Grenze/Umgebung; kyō","境（きょう）— Grenze; 環境（かんきょう）— Umwelt","Ein Ort, an dem zwei Gebiete zusammentreffen. Merke dir besonders das Kompositum 環境."],
      [3,"Feeling and emotion","情","Gefühl/Umstände; jō","情（じょう）— Gefühl; 感情（かんじょう）","忄 erinnert an Herz und Gefühle. Dein Herz färbt, wie du eine Situation empfindest."],
      [3,"A connection","関","Beziehung/Verbindung; kan","関（かん）— Zusammenhang; 関係（かんけい）","Denk an ein Tor, durch das zwei Ideen miteinander verbunden werden."],
    ],
    grammar: [
      [1,"A soft reason","雨が降っている ___ 、今日は家にいます。",["ので","まで","しか"],0,"雨が降っているので、今日は家にいます。","ので gibt hier einen neutralen, erklärenden Grund: Weil es regnet, bleibe ich heute zu Hause."],
      [1,"Trying something","このケーキを食べて ___ 。",["しまった","みたい","おく"],1,"このケーキを食べてみたい。","〜てみたい drückt aus, dass du etwas ausprobieren möchtest."],
      [1,"An ongoing habit","毎晩、日本語の本を読む ___ しています。",["ように","ばかり","つもり"],0,"毎晩、日本語の本を読むようにしています。","〜ようにしている heißt: Ich bemühe mich darum, etwas regelmäßig zu tun."],
      [2,"Already finished","宿題はもう ___ 。",["終わってあります","終わってしまいました","終わってみます"],1,"宿題はもう終わってしまいました。","〜てしまう kann ausdrücken, dass eine Handlung vollständig abgeschlossen ist; je nach Kontext auch Bedauern."],
      [2,"An apparently good café","あのカフェは静か ___ です。",["みたい","すぎ","こと"],0,"あのカフェは静かみたいです。","〜みたい drückt eine Einschätzung/Vermutung aus: Es scheint ruhig zu sein."],
      [2,"Not just one thing","運動する ___ 、よく眠ることも大切です。",["だけでなく","にとって","ようでは"],0,"運動するだけでなく、よく眠ることも大切です。","〜だけでなく…も bedeutet 'nicht nur …, sondern auch …'."],
      [3,"Despite the rain","雨が降っている ___ 、散歩に行きました。",["にしては","のに","うちに"],1,"雨が降っているのに、散歩に行きました。","〜のに stellt einen unerwarteten Gegensatz her: obwohl es regnet."],
      [3,"Before it gets busy","忙しくならない ___ 、図書館へ行きます。",["うちに","たびに","ほど"],0,"忙しくならないうちに、図書館へ行きます。","〜うちに bedeutet hier: solange es noch nicht so ist / bevor es so wird."],
      [3,"Every time","この曲を聞く ___ 、旅行を思い出します。",["せいで","たびに","ために"],1,"この曲を聞くたびに、旅行を思い出します。","〜たびに heißt: jedes Mal, wenn …"],
    ],
    reading: [
      [1,"A quiet café","駅の近くに小さいカフェがあります。私は土曜日によくそこで本を読みます。","Was macht die Person samstags oft?",["Im Café lesen","Am Bahnhof arbeiten","Mit dem Zug fahren"],0,"Ich lese samstags oft in einem kleinen Café nahe dem Bahnhof."],
      [1,"A small change","今日は寒いので、いつものコーヒーではなく、温かいお茶を飲みました。","Was trinkt die Person heute?",["Kalten Kaffee","Warmen Tee","Fruchtsaft"],1,"Weil es kalt ist, entscheidet sie sich heute für warmen Tee statt des üblichen Kaffees."],
      [1,"One more chapter","新しい漫画を買いました。最初は一話だけ読むつもりでしたが、おもしろくて三話読みました。","Wie viele Kapitel wurden tatsächlich gelesen?",["Eins","Zwei","Drei"],2,"Die Person wollte nur ein Kapitel lesen, fand den Manga aber so spannend, dass es drei wurden."],
      [2,"The lost umbrella","朝は晴れていましたが、帰るときに雨が降り始めました。かばんに折りたたみ傘を入れておいてよかったです。","Warum ist die Person erleichtert?",["Ein Regenschirm ist in der Tasche","Sie ist früh heimgegangen","Der Regen hat aufgehört"],0,"Am Morgen war es sonnig, aber auf dem Heimweg begann es zu regnen. Zum Glück war ein Taschenschirm dabei."],
      [2,"A message to a friend","友達に「少し遅れる」とメッセージを送りました。電車が10分遅れていたからです。","Weshalb kommt die Person später?",["Sie hat verschlafen","Der Zug hat Verspätung","Sie musste länger arbeiten"],1,"Der Zug hatte zehn Minuten Verspätung, deshalb informierte sie einen Freund."],
      [2,"A weekend recipe","週末にラザニアを作ろうと思っています。材料はもう買いましたが、チーズだけはまだ足りません。","Was fehlt noch?",["Nudeln","Tomaten","Käse"],2,"Die Zutaten sind fast komplett; nur Käse fehlt noch."],
      [3,"An unexpected invitation","仕事が終わってすぐ帰るつもりだったのに、同僚に食事に誘われました。疲れていましたが、久しぶりだったので行くことにしました。","Warum sagt die Person schließlich zu?",["Sie hat großen Hunger","Sie hat ihre Kollegin lange nicht gesehen","Die Arbeit ist ausgefallen"],1,"Obwohl die Person müde war und heimgehen wollte, sagte sie zu, weil das Treffen lange nicht stattgefunden hatte."],
      [3,"A tiny discovery","散歩の途中、以前は気づかなかった小さな花屋を見つけました。店員さんによると、先月できたばかりだそうです。","Was erfährt die Person über den Blumenladen?",["Er wurde erst letzten Monat eröffnet","Er schließt nächsten Monat","Er gehört ihrem Freund"],0,"Sie entdeckt einen Blumenladen, der erst vor einem Monat eröffnet wurde."],
      [3,"How to study","知らない言葉が出てきても、すぐ辞書を見るとは限りません。まず文全体を読んで、意味を推測してみるようにしています。","Welche Lernstrategie beschreibt der Text?",["Jedes unbekannte Wort sofort übersetzen","Nur bekannte Texte lesen","Erst aus dem Kontext erschließen"],2,"Die Person schaut nicht bei jedem unbekannten Wort sofort nach, sondern versucht zuerst den Kontext zu verstehen."],
    ],
    listening: [
      [1,"At the station","次の電車は五分後に来ます。","Wann kommt der nächste Zug?",["In 5 Minuten","In 15 Minuten","Morgen"],0,"次の電車は五分後に来ます。","Der nächste Zug kommt in fünf Minuten."],
      [1,"Coffee or tea","今日はコーヒーじゃなくて、紅茶をください。","Was wird bestellt?",["Kaffee","Schwarzer Tee","Wasser"],1,"今日はコーヒーじゃなくて、紅茶をください。","Heute bitte schwarzen Tee statt Kaffee."],
      [1,"Getting home","今日は六時ごろ帰ります。","Wann kommt die Person ungefähr nach Hause?",["Um 16 Uhr","Um 18 Uhr","Um 20 Uhr"],1,"今日は六時ごろ帰ります。","Die Person kommt ungefähr um sechs Uhr zurück."],
      [2,"Change of plans","土曜日は出かける予定でしたが、雨なので家で映画を見ます。","Was ist der neue Plan?",["Einen Film zu Hause sehen","Am Samstag arbeiten","Im Regen spazieren"],0,"土曜日は出かける予定でしたが、雨なので家で映画を見ます。","Wegen des Regens schaut die Person am Samstag zu Hause einen Film."],
      [2,"A message","先に始めていてください。私は10分ぐらい遅れます。","Was soll die andere Person tun?",["Zehn Minuten warten","Schon anfangen","Alles absagen"],1,"先に始めていてください。私は10分ぐらい遅れます。","Bitte fang schon an; ich komme etwa zehn Minuten später."],
      [2,"Choosing dinner","辛いものも好きですが、今日はあっさりした料理が食べたいです。","Worauf hat die Person heute Lust?",["Sehr scharfes Essen","Leichtes, mildes Essen","Etwas Süßes"],1,"辛いものも好きですが、今日はあっさりした料理が食べたいです。","Sie mag auch Scharfes, möchte heute aber eher etwas Leichtes essen."],
      [3,"The borrowed book","この本、読み終わったら返してくれればいいよ。急いでないから。","Wann muss das Buch zurückgegeben werden?",["Sofort","Morgen früh","Wenn es ausgelesen ist"],2,"この本、読み終わったら返してくれればいいよ。急いでないから。","Es reicht, das Buch nach dem Lesen zurückzugeben; es eilt nicht."],
      [3,"A surprising place","思ったより静かだったので、そこで一時間くらい勉強できました。","Warum konnte die Person dort lernen?",["Es war ruhiger als erwartet","Sie war allein zu Hause","Sie hatte keinen Unterricht"],0,"思ったより静かだったので、そこで一時間くらい勉強できました。","Der Ort war ruhiger als erwartet; deshalb konnte sie dort etwa eine Stunde lernen."],
      [3,"A small favor","もし時間があったら、帰りに牛乳を買ってきてもらえる？","Worum wird gebeten?",["Beim Kochen helfen","Auf dem Heimweg Milch kaufen","Morgen einkaufen gehen"],1,"もし時間があったら、帰りに牛乳を買ってきてもらえる？","Falls du Zeit hast, kannst du auf dem Heimweg Milch mitbringen?"],
    ],
    speaking: [
      [1,"At the bakery","Du möchtest höflich zwei Stück davon bestellen.","これを二つください。","これを二つください。 — Davon bitte zwei Stück.","二つ（ふたつ） ist ein allgemeiner Zähler. Eine kurze natürliche Bestellung reicht."],
      [1,"A short invitation","Frag einen Freund, ob er morgen Zeit hat.","明日、時間ある？","明日、時間ある？ — Hast du morgen Zeit?","Unter Freunden klingt eine kurze lockere Frage natürlich."],
      [1,"Not quite sure","Sag, dass du es noch nicht weißt.","まだ分かりません。","まだ分かりません。 — Ich weiß es noch nicht.","まだ + Negation = noch nicht."],
      [2,"Plans changed","Sag, dass du heute lieber zu Hause bleiben möchtest.","今日は家にいたいです。","今日は家にいたいです。 — Ich möchte heute zu Hause bleiben.","〜たいです bezeichnet deinen Wunsch. Du musst dich nicht rechtfertigen."],
      [2,"Ordering a drink","Frag höflich, ob es dieses Getränk ohne Eis gibt.","この飲み物は氷なしでもできますか。","この飲み物は氷なしでもできますか。 — Geht dieses Getränk auch ohne Eis?","〜なし = ohne; 〜でもできますか fragt nach einer Möglichkeit."],
      [2,"A recommendation","Sag, dass du den Film sehr interessant fandest.","その映画はすごくおもしろかったです。","その映画はすごくおもしろかったです。 — Ich fand den Film wirklich spannend.","おもしろい wird in der Vergangenheit zu おもしろかった."],
      [3,"A polite change","Du hast bereits zugesagt, musst aber höflich sagen, dass du wohl etwas später kommst.","すみません、少し遅れそうです。","すみません、少し遅れそうです。 — Entschuldigung, ich komme wohl etwas später.","〜そうです drückt hier eine begründete Einschätzung aus."],
      [3,"Sharing progress","Sag, dass du versuchst, jeden Tag ein wenig Japanisch zu lesen.","毎日少しずつ日本語を読むようにしています。","毎日少しずつ日本語を読むようにしています。 — Ich versuche, jeden Tag ein wenig Japanisch zu lesen.","〜ようにしている beschreibt eine bewusste Gewohnheit."],
      [3,"A softer opinion","Sag höflich, dass du lieber morgen darüber sprechen würdest.","できれば、明日そのことについて話したいです。","できれば、明日そのことについて話したいです。 — Wenn möglich, würde ich morgen darüber sprechen.","できれば macht einen Wunsch weicher; 〜について heißt 'über / bezüglich'."],
    ]
  };
  const safe = val => app.escapeHtml ? app.escapeHtml(String(val ?? "")) : String(val ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const ui = {mode:null,selected:null,answer:null,revealed:false,attempted:false,voiceTried:false,spoken:false,draft:""};
  let overlay = null;
  let speech = null;

  function records() {
    const root = app.getState();
    if (!root.japaneseAtlasDZ48 || typeof root.japaneseAtlasDZ48 !== "object" || Array.isArray(root.japaneseAtlasDZ48)) root.japaneseAtlasDZ48 = {version:1,completed:{}};
    const out = root.japaneseAtlasDZ48;
    if (!out.completed || typeof out.completed !== "object" || Array.isArray(out.completed)) out.completed = {};
    return out;
  }
  function save() { app.saveState({source:"japanese-atlas-dz48",suppressUiRefresh:true}); }
  function availableCards(mode) {
    const def = MODES[mode];
    const rank = def ? graph.getContentRank("Japanese",def.unlock) : 0;
    return (BANK[mode] || []).map((raw,i)=>({ raw, id:`${mode}-${i+1}`, rank:raw[0], index:i })).filter(item => item.rank <= rank);
  }
  function ensureOverlay() {
    if (overlay?.isConnected) return overlay;
    overlay = document.createElement("div");
    overlay.id = "japaneseAtlasDZ48";
    overlay.className = "japanese-atlas-dz48";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label","Japanese practice atelier");
    overlay.innerHTML = '<div class="japanese-atlas-scrim" data-ja-close="true"></div><div class="japanese-atlas-panel" role="document"><header class="japanese-atlas-header"><span>✿ JAPANESE · STUDY ATLAS</span><button type="button" data-ja-close="true" aria-label="Close Japanese practice">×</button></header><div class="japanese-atlas-content" id="japaneseAtlasDZ48Content"></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", onClick);
    overlay.addEventListener("input", onInput);
    return overlay;
  }
  function stopSpeech() { try { window.speechSynthesis?.cancel?.(); } catch {} speech = null; }
  function close() { stopSpeech(); if (overlay) overlay.classList.remove("is-open"); ui.selected=null; document.body.classList.remove("japanese-atlas-open"); }
  function open(mode) {
    if (!MODES[mode] || !availableCards(mode).length) {
      graph.focusContent?.("Japanese", MODES[mode]?.unlock || "japanese-atlas-kanji");
      app.showToast?.("Unlock the first rank in your Japanese Talent Tree to enter this path.");
      return false;
    }
    ui.mode=mode; ui.selected=null; ui.answer=null; ui.revealed=false; ui.attempted=false;ui.voiceTried=false;ui.spoken=false;ui.draft="";
    ensureOverlay().classList.add("is-open");
    document.body.classList.add("japanese-atlas-open");
    render();
    return true;
  }
  function headline(def) {
    const cards=availableCards(def.id), completed=records().completed || {};
    const done=cards.filter(item=>Boolean(completed[item.id])).length;
    return `<section class="ja-hero"><p class="ja-eyebrow">${safe(def.icon)} ${safe(def.skill)} · RANK ${graph.getContentRank("Japanese",def.unlock)}/3</p><h2>${safe(def.title)}</h2><p>${safe(def.subtitle)}</p><div class="ja-meter"><span style="width:${cards.length?Math.round(100*done/cards.length):0}%"></span></div><small>${done}/${cards.length} exercises visited · Every new rank opens three more</small></section>`;
  }
  function render() {
    const root = document.getElementById("japaneseAtlasDZ48Content"); if (!root || !ui.mode) return;
    const def=MODES[ui.mode], cards=availableCards(ui.mode);
    if (!ui.selected) {
      root.innerHTML = headline(def) + `<div class="ja-collection">${cards.map(item=>`<button type="button" data-ja-card="${safe(item.id)}" class="ja-card"><span>${records().completed[item.id]?"✓":"✦"} · SET ${item.rank}</span><strong>${safe(item.raw[1])}</strong><small>${records().completed[item.id]?"Revisit without another reward":"Practice this card →"}</small></button>`).join("")}</div><p class="ja-note">${ui.mode==="listening"?"Audio uses the Japanese speech voice installed on your device. If none is available, use Kotoba Listening Lab instead.":"Each card can award a small Skill reward only once. Revisit and practice freely; no daily streak required."}</p>`;
      return;
    }
    const item=cards.find(card=>card.id===ui.selected); if (!item) {ui.selected=null; render(); return;}
    const r=item.raw;
    let activity="";
    if (ui.mode==="kanji") {
      activity = `<p class="ja-question">Recall the meaning AND one reading before revealing.</p><div class="ja-kanji">${safe(r[2])}</div><p class="ja-prompt">${safe(r[1])}</p>${!ui.revealed?`<button class="primary-button" type="button" data-ja-reveal="true">Reveal meaning, reading & memory cue</button>`:`<div class="ja-result"><strong>${safe(r[4])}</strong><p>${safe(r[5])}</p><small>Hint from the card: ${safe(r[3])}. Mnemonic stories are memory aids, not official etymologies.</small></div>`}`;
    } else if (ui.mode==="grammar" || ui.mode==="reading") {
      const grammar=ui.mode==="grammar";
      const passage=r[2]; const question=grammar?"Which expression fits the sentence?":r[3];
      const options=grammar?r[3]:r[4];const answerIndex=grammar?r[4]:r[5];
      activity=`<p class="ja-question">${safe(question)}</p><p class="ja-japanese" lang="ja">${safe(passage)}</p><div class="ja-options">${options.map((o,i)=>`<button type="button" class="ja-choice ${ui.answer===i?"is-picked":""} ${ui.revealed&&i===answerIndex?"is-correct":""}" data-ja-answer="${i}" ${ui.revealed?"disabled":""}>${String.fromCharCode(65+i)}. ${safe(o)}</button>`).join("")}</div>${ui.revealed?`<div class="ja-result"><strong>${ui.answer===answerIndex?"✓ That's it!":"✦ Good attempt — here's why:"}</strong><p>${safe(grammar?r[5]:r[6])}</p><small>${safe(grammar?r[6]:"")}</small></div>`:""}`;
    } else if (ui.mode==="listening") {
      const voiceAvailable = typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
      activity=`<p class="ja-question">Listen first, then answer. Try not to read the sentence yet.</p><div class="ja-audio-controls"><button type="button" class="primary-button" data-ja-play="true" ${!voiceAvailable?"disabled":""}>▶ Play Japanese</button><button type="button" class="secondary-button" data-ja-reveal="true">Reveal transcript</button></div>${!voiceAvailable?'<p class="ja-note">Japanese speech is unavailable in this browser. You can still read the transcript, but this card will not issue Listening XP.</p>':''}<p class="ja-question">${safe(r[3])}</p><div class="ja-options">${r[4].map((o,i)=>`<button type="button" class="ja-choice ${ui.answer===i?"is-picked":""} ${ui.revealed&&i===r[5]?"is-correct":""}" data-ja-answer="${i}" ${ui.revealed||!ui.voiceTried?"disabled":""}>${String.fromCharCode(65+i)}. ${safe(o)}</button>`).join("")}</div>${ui.revealed?`<div class="ja-result"><strong lang="ja">${safe(r[6])}</strong><p>${safe(r[7])}</p>${ui.voiceTried?"":"<small>Transcript preview only — audio is required for Listening practice rewards.</small>"}</div>`:""}`;
    } else if (ui.mode==="speaking") {
      activity=`<p class="ja-question">${safe(r[2])}</p><label for="jaProductionDraft">Say it aloud or write your own Japanese sentence:</label><textarea id="jaProductionDraft" rows="3" placeholder="自分の日本語で…" lang="ja">${safe(ui.draft)}</textarea><label class="ja-spoke"><input id="jaSpoken" type="checkbox" ${ui.spoken?"checked":""}> I tried the response aloud (no recording)</label>${!ui.revealed?`<button type="button" class="primary-button" data-ja-reveal="true" ${!ui.attempted?"disabled":""}>Compare with a model response</button>`:`<div class="ja-result">${ui.draft?`<small>Your attempt:</small><p lang="ja">${safe(ui.draft)}</p>`:""}<strong lang="ja">${safe(r[3])}</strong><p>${safe(r[4])}</p><small>${safe(r[5])} · Your answer isn't graded automatically; many natural answers are possible.</small></div>`}`;
    }
    const completed=Boolean(records().completed[item.id]);
    const ready=ui.revealed && (ui.mode!=="listening" || ui.voiceTried);
    root.innerHTML = headline(def)+`<button type="button" class="ja-back" data-ja-back="true">← All ${safe(def.title)} cards</button><article class="ja-work"><small>SET ${item.rank} · ${item.index+1}/${cards.length}${completed?" · ✓ already practiced":""}</small><h3>${safe(r[1])}</h3>${activity}<div class="ja-foot">${ui.revealed ? `<button type="button" class="primary-button" data-ja-complete="true" ${!ready?"disabled":""}>${completed?"Back to collection":"Mark practiced · one-time reward"}</button>`:"<span>Work through the prompt first; reveal your answer when ready.</span>"}</div></article>`;
    // Keep typed responses local to the current DOM only. Never store personal text
    // or copy it into rewards / cloud records.
  }
  function speechPlayback(item) {
    if (typeof window.speechSynthesis === "undefined" || typeof window.SpeechSynthesisUtterance === "undefined") return;
    const text=item.raw[2];
    try {
      stopSpeech();
      const utterance=new window.SpeechSynthesisUtterance(text);
      utterance.lang="ja-JP";utterance.rate=.86;
      const voices=window.speechSynthesis.getVoices?.() || [];
      const japanese=voices.find(v=>/^ja([-_]|$)/i.test(v.lang));
      if (!japanese) {
        app.showToast?.("No Japanese speech voice found on this device. Try Kotoba Listening Lab or enable a Japanese device voice.");
        ui.voiceTried=false;
        return;
      }
      utterance.voice=japanese;
      utterance.onerror=()=>{app.showToast?.("Japanese voice playback failed. You can still read the transcript.");ui.voiceTried=false;};
      window.speechSynthesis.speak(utterance);
      speech=utterance;
      ui.voiceTried=true;
      render();
    } catch {ui.voiceTried=false;app.showToast?.("Could not play Japanese audio on this device.");}
  }
  function complete() {
    if (!ui.mode||!ui.selected||!ui.revealed||(ui.mode==="listening"&&!ui.voiceTried)) return;
    const item=availableCards(ui.mode).find(x=>x.id===ui.selected);if(!item)return;
    const rec=records(),wasDone=Boolean(rec.completed[item.id]);
    if (!wasDone) {
      rec.completed[item.id]={at:Date.now()};
      // The bounded completion record prevents replays from paying again.
      // Save AFTER awardActivity: that API mutates the reward ledger but does
      // not persist the state by itself. Do not leave the XP unsaved.
      if (!(app.getState().rewardLedger?.events || []).some(e=>e?.source==="japanese-atlas-dz48" && e?.sourceId===item.id)) {
        app.awardActivity?.({source:"japanese-atlas-dz48",sourceId:item.id,label:`Japanese Atlas · ${MODES[ui.mode].title} · ${item.raw[1]}`,realm:"Japanese",capability:"knowledge",xp:4,realmXP:5,statXP:3,coins:2,storyEnergyBase:.08,progressionRelevant:true,metadata:{practiceMode:ui.mode,skillId:MODES[ui.mode].skillId,skillXP:5,japaneseAtlasDZ48:true}});
      }
      save();
      app.showToast?.("🌸 Practiced! First-time Japanese Skill reward recorded.");
    }
    ui.selected=null;ui.answer=null;ui.revealed=false;ui.voiceTried=false;ui.attempted=false;ui.spoken=false;ui.draft="";
    stopSpeech();render();
  }
  function onClick(event) {
    const target=event.target.closest?.("[data-ja-close],[data-ja-back],[data-ja-card],[data-ja-answer],[data-ja-reveal],[data-ja-play],[data-ja-complete]");
    if(!target)return;
    if (target.dataset.jaClose!==undefined){close();return;}
    if (target.dataset.jaBack!==undefined){stopSpeech();ui.selected=null;ui.revealed=false;ui.answer=null;ui.voiceTried=false;render();return;}
    if (target.dataset.jaCard){ui.selected=target.dataset.jaCard;ui.revealed=false;ui.answer=null;ui.voiceTried=false;ui.attempted=false;ui.spoken=false;ui.draft="";render();return;}
    if (target.dataset.jaAnswer!==undefined){if(ui.revealed||(ui.mode==="listening"&&!ui.voiceTried))return;ui.answer=Number(target.dataset.jaAnswer);ui.revealed=true;render();return;}
    if (target.dataset.jaPlay!==undefined){const item=availableCards(ui.mode).find(x=>x.id===ui.selected);if(item) speechPlayback(item);return;}
    if (target.dataset.jaReveal!==undefined){if(ui.mode==="speaking"&&!ui.attempted)return;ui.revealed=true;render();return;}
    if (target.dataset.jaComplete!==undefined) complete();
  }
  function onInput(event) {
    if(ui.mode!=="speaking")return;
    const draft=overlay.querySelector("#jaProductionDraft");const spoke=overlay.querySelector("#jaSpoken");
    ui.spoken=Boolean(spoke?.checked);
    ui.draft=String(draft?.value||"").slice(0,1500);
    ui.attempted=ui.spoken || ui.draft.trim().length>=3;
    const btn=overlay.querySelector("[data-ja-reveal]");if(btn)btn.disabled=!ui.attempted;
  }
  document.addEventListener("keydown",event=>{if(event.key==="Escape" && overlay?.classList.contains("is-open")) close();});
  window.LifeRPGJapaneseAtlasDZ48={version:VERSION,open,close,modes:MODES,getAvailableCards:availableCards,getCompleted:()=>({...records().completed})};
})();
