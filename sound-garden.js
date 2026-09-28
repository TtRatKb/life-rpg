/* Life RPG · Sound Garden V0.31.4dx
   Independent music-discovery journal. No Spotify API or playback SDK is used.
   Track suggestions: Apple iTunes Search API (catalog metadata only).
   Spotify URLs are ordinary outbound search/playlist links, not an API integration.
*/
(() => {
  'use strict';
  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState || !app?.awardActivity) return;
  const VERSION = '0.31.4dx';
  const PLAYLIST = 'https://open.spotify.com/playlist/6aD4oA94t1SpI10OpTrsVl';
  const $ = id => document.getElementById(id);
  const esc = x => app.escapeHtml?.(String(x ?? '')) ?? String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const clean = s => String(s ?? '').trim().replace(/\s+/g,' ').slice(0,180);
  const norm = s => clean(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const baseSong = s => norm(clean(s).replace(/\s*[-–—]\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|deluxe|radio edit|single version|album version|live version|mono|stereo)(?:\s+\d{4})?.*$/i,'').replace(/\s*[([{][^\])}]*\b(?:remaster|deluxe|radio edit|single version|live|mono|stereo|\d{4} version)[^\])}]*[\])}]/ig,''));
  const keyFor = (artist,title) => `${norm(artist)}::${baseSong(title)}`;
  const sourceLink = track => /^https:\/\/(?:music\.apple\.com|itunes\.apple\.com)\//.test(track?.storeUrl || '') ? track.storeUrl : '';
  const spotifySearch = track => `https://open.spotify.com/search/${encodeURIComponent(`${track.artist} ${track.title}`)}`;
  let busy = false, status = '', preview = null, dialog = null;

  function data() {
    const root = app.getState();
    if (!root.soundGarden || typeof root.soundGarden !== 'object' || Array.isArray(root.soundGarden)) root.soundGarden = {};
    const m = root.soundGarden;
    if (!Array.isArray(m.artists)) m.artists = [];
    if (!m.rewardedArtists || typeof m.rewardedArtists !== 'object') m.rewardedArtists = {};
    if (!m.rewardedSongs || typeof m.rewardedSongs !== 'object') m.rewardedSongs = {};
    if (!m.tracks || typeof m.tracks !== 'object') m.tracks = {};
    if (!m.catalog || typeof m.catalog !== 'object') m.catalog = {};
    if (!m.days || typeof m.days !== 'object') m.days = {};
    if (!Array.isArray(m.history)) m.history = [];
    if (!Array.isArray(m.recentArtists)) m.recentArtists = [];
    if (!m.playlistUrl || !/^https:\/\/open\.spotify\.com\/playlist\/[\w-]+/.test(m.playlistUrl)) m.playlistUrl = PLAYLIST;
    // DV migration: old song candidates had no stable artist identity; never reuse them.
    if (Number(m.version || 0) < 2) {
      m.catalog = {};
      if (m.current && !Number.isSafeInteger(m.current.artistId)) m.current = null;
      m.pendingIdentity = null;
      m.version = 2;
    }
    // DX: old forced-selection dialogs carried incomplete sample data. Rebuild on request.
    if (Number(m.version || 0) < 3) {
      m.pendingIdentity = null;
      m.version = 3;
    }
    return m;
  }
  function save(source) { return app.saveState({source:'sound-garden-'+source}); }
  function isDone() { return Boolean(data().days[day()]?.completedKey); }
  function summary() { const m=data(); return {completedToday:isDone(), artists:m.artists.length, reviewed:m.history.filter(h=>h.status!=='known'&&h.status!=='skip').length}; }
  function tell(message) { status=message; app.showToast?.(message); render(); }
  function award({source,id,label,xp,realmXP,statXP,coins,energy}) {
    return app.awardActivity({source,sourceId:id,label,realm:'Hobbies',capability:'creativity',xp,realmXP,statXP,coins,storyEnergyBase:energy,
      progressionRelevant:true,skipAddOnRewards:true,metadata:{soundGarden:true,independentReflection:true,spotifyStreamReward:false}});
  }
  // Newlines, commas and semicolons are accepted; quote names containing commas.
  function splitArtists(raw) {
    const result=[];let field='',quoted=false;
    for (const c of String(raw||'')) {
      if (c==='"') {quoted=!quoted;continue;}
      if (!quoted && (c===','||c===';'||c==='\n'||c==='\r')) {
        if(clean(field))result.push(clean(field));field='';
      } else field+=c;
    }
    if(clean(field))result.push(clean(field));
    return result.slice(0,200);
  }
  function addArtists(raw) {
    const names=splitArtists(raw),m=data();let added=0,duplicates=0,paid=0;
    if (!names.length) return tell('Bitte einen oder mehrere Artist-/Bandnamen eingeben.');
    for (const name of names) {
      const key=norm(name);
      if(name.length<2||!key||m.artists.some(a=>a.key===key)){duplicates++;continue;}
      if(m.artists.length>=120)break;
      m.artists.push({name,key,addedAt:Date.now(),artistId:null});added++;
      if(!m.rewardedArtists[key]) {
        const reward=award({source:'sound-garden-artist',id:`artist:${key}`,label:`Sound Garden · Artist hinzugefügt: ${name}`,xp:3,realmXP:5,statXP:1,coins:2,energy:0.05});
        m.rewardedArtists[key]=reward?.eventId||'recorded';paid++;
      }
    }
    if(!save('artist-bulk-add'))return tell('Änderungen nur im Arbeitsspeicher – exportiere bitte deinen Spielstand.');
    if($('sgArtistName')) $('sgArtistName').value='';
    tell(`${added} Artists hinzugefügt · ${paid} einmalige Rewards${duplicates?` · ${duplicates} doppelt/ungültig übersprungen`:''}.`);
  }
  function addArtist(raw) { return addArtists(raw); }
  function removeArtist(key) {
    const m=data(), old=m.artists.find(a=>a.key===key);
    if (!old || !window.confirm(`„${old.name}“ aus dem Discovery-Pool entfernen? Bereits erhaltene Rewards und Songbewertungen bleiben bestehen.`)) return;
    m.artists=m.artists.filter(a=>a.key!==key);
    if (m.current?.artistKey===key) m.current=null;
    if (m.pendingIdentity?.artistKey===key) m.pendingIdentity=null;
    save('artist-remove'); render();
  }
  function itunesJSONP(endpoint, params) {
    // Apple's published JSONP endpoint. The artist must be resolved to artistId before track lookup.
    return new Promise((resolve,reject)=>{
      const cb=`__lifeRpgSg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script=document.createElement('script');
      const url=new URL(`https://itunes.apple.com/${endpoint}`);
      Object.entries({...params,country:'DE',callback:cb}).forEach(([k,v])=>url.searchParams.set(k,v));
      let finished=false;
      const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timeout);delete window[cb];script.remove();error?reject(error):resolve(value);};
      const timeout=setTimeout(()=>finish(new Error('Der Musikkatalog antwortet gerade nicht.')),14000);
      window[cb]=response=>finish(null,response);
      script.onerror=()=>finish(new Error('Der Musikkatalog konnte nicht erreicht werden.'));
      script.src=url.href;document.head.appendChild(script);
    });
  }
  const rowsOf = response => Array.isArray(response?.results)?response.results:[];
  function addExamples(option, rows) {
    if (!option) return;
    for (const r of rows) {
      if (r.kind !== 'song' || Number(r.artistId) !== option.id) continue;
      const title=clean(r.trackName);
      if (title && !option.examples.some(other=>norm(other)===norm(title)) && option.examples.length < 4) option.examples.push(title);
      if (!option.genre && r.primaryGenreName) option.genre=clean(r.primaryGenreName);
      if (!option.album && r.collectionName) option.album=clean(r.collectionName);
    }
  }
  async function artistOptions(a) {
    const response=await itunesJSONP('search',{term:a.name,media:'music',entity:'musicArtist',attribute:'artistTerm',limit:30});
    let found=rowsOf(response).filter(r=>r.wrapperType==='artist'&&Number.isSafeInteger(Number(r.artistId))&&norm(r.artistName)===a.key);
    // Some regional stores omit artist entries even when matching tracks exist.
    if(!found.length) {
      const fallback=await itunesJSONP('search',{term:a.name,media:'music',entity:'song',attribute:'artistTerm',limit:200});
      found=rowsOf(fallback).filter(r=>r.kind==='song'&&Number.isSafeInteger(Number(r.artistId))&&norm(r.artistName)===a.key);
    }
    const ids=new Map();
    for (const row of found) {
      const id=Number(row.artistId);
      if (!ids.has(id)) ids.set(id,{id,name:clean(row.artistName),genre:clean(row.primaryGenreName||''),album:'',examples:[],url:/^https:\/\/(?:music\.apple\.com|itunes\.apple\.com)\//.test(row.artistLinkUrl||row.artistViewUrl||'')?String(row.artistLinkUrl||row.artistViewUrl):''});
      addExamples(ids.get(id),[row]);
    }
    const options=[...ids.values()].slice(0,12);
    if(options.length>1) {
      // Fetch song search once and group it by artistId (never by matching song title).
      // Artist search returns no tracks, which was why older dialogs commonly had no examples.
      try {
        const sampleSearch=await itunesJSONP('search',{term:a.name,media:'music',entity:'song',attribute:'artistTerm',limit:200});
        const rows=rowsOf(sampleSearch);
        for (const option of options) addExamples(option,rows);
      } catch { /* The options remain usable without sample titles. */ }
      // Some less common artists are absent in general search results; request their own IDs.
      const missing=options.filter(option=>!option.examples.length).slice(0,5);
      await Promise.all(missing.map(async option=>{
        try {
          const detail=await itunesJSONP('lookup',{id:option.id,entity:'song',limit:25});
          addExamples(option,rowsOf(detail));
        } catch { /* No false examples or unrelated songs. */ }
      }));
    }
    return options;
  }
  async function resolveArtist(a,forceChoice=false) {
    const m=data();
    if(!forceChoice && Number.isSafeInteger(a.artistId)&&a.artistId>0)return true;
    const options=await artistOptions(a);
    if(!options.length){status=`Kein passender Katalog-Artist für „${a.name}“ gefunden. Es wird kein gleichnamiger Song als Ersatz verwendet.`;return false;}
    if(options.length===1) {
      // A single exact artist match needs no dialog and no sample songs to confirm its ID.
      a.artistId=options[0].id;
      delete m.catalog[a.key];
      if(m.current?.artistKey===a.key && m.current.artistId!==a.artistId)m.current=null;
      m.pendingIdentity=null;
      save('artist-identity');
      status=`✓ ${a.name} eindeutig zugeordnet (Katalog-ID ${a.artistId}).`;
      return true;
    }
    m.pendingIdentity={artistKey:a.key,options,at:Date.now(),resumeDiscovery:!forceChoice};
    save('artist-identity-options');
    status=`Mehrere Artists heißen „${a.name}“. Bitte wähle den richtigen Katalogeintrag.`;
    return false;
  }
  async function verifyArtist(key) {
    if(busy)return;
    const m=data(),a=m.artists.find(x=>x.key===key);
    if(!a)return;
    busy=true;status=`Überprüfe „${a.name}“ …`;render();
    try { await resolveArtist(a,true); }
    catch(e){status=`Artist-Suche fehlgeschlagen: ${e?.message||'Unbekannter Fehler'}`;}
    finally {busy=false;render();}
  }
  function chooseArtist(key,id) {
    const m=data(),pending=m.pendingIdentity,a=m.artists.find(x=>x.key===key);
    const option=pending?.artistKey===key&&pending.options.find(x=>x.id===Number(id));
    if(!a||!option)return;
    a.artistId=option.id;delete m.catalog[a.key];
    if(m.current?.artistKey===a.key)m.current=null;
    const resumeDiscovery=Boolean(pending.resumeDiscovery);
    m.pendingIdentity=null;
    save('artist-identity-selected');status=`✓ ${a.name} zugeordnet · Katalog-ID ${option.id}.`;
    render();
    if(resumeDiscovery)next(true,key);
  }
  async function catalogFor(a,refresh=false) {
    const m=data();
    if(!Number.isSafeInteger(a.artistId)||a.artistId<=0) {
      if(!await resolveArtist(a))return [];
    }
    if(!refresh&&Array.isArray(m.catalog[a.key])&&m.catalog[a.key].length&&m.catalog[a.key].every(t=>t.artistId===a.artistId)) return m.catalog[a.key];
    // Identity-filtered lookup, then broader artist search. Never match by song title alone.
    const response=await itunesJSONP('lookup',{id:a.artistId,entity:'song',limit:180});
    let rows=rowsOf(response);
    const broad=await itunesJSONP('search',{term:a.name,media:'music',entity:'song',attribute:'artistTerm',limit:200});
    rows=rows.concat(rowsOf(broad));
    const picked=new Map();
    for(const r of rows) {
      if(r.kind!=='song'||!r.trackName||Number(r.artistId)!==a.artistId||!Number.isSafeInteger(Number(r.trackId)))continue;
      const title=clean(r.trackName),id=keyFor(a.name,title);
      if(!baseSong(title)||picked.has(id))continue;
      picked.set(id,{key:id,title,artist:a.name,artistKey:a.key,artistId:a.artistId,album:clean(r.collectionName),storeUrl:String(r.trackViewUrl||''),sourceId:Number(r.trackId)});
    }
    m.catalog[a.key]=[...picked.values()].slice(0,160);
    save('catalog-cache');return m.catalog[a.key];
  }
  function candidates(list,m) { return list.filter(t=>!m.tracks[t.key] && !m.history.some(h=>h.key===t.key)); }
  async function next(force=false,preferredKey=null) {
    if (busy) return;
    const m=data();
    if (m.pendingIdentity) {status='Bitte zuerst den richtigen Artist auswählen.';render();return;}
    if (m.current && !force) {render();return;}
    if (!m.artists.length) return tell('Füge zuerst mindestens eine Band oder einen Artist hinzu.');
    busy=true;status='Suche eine neue Entdeckung …';render();
    try {
      const pool=m.artists.slice().sort(()=>Math.random()-0.5);
      const recent=new Set(m.recentArtists.slice(-2));
      pool.sort((a,b)=>Number(recent.has(a.key))-Number(recent.has(b.key)));
      if (preferredKey) pool.sort((a,b)=>Number(b.key===preferredKey)-Number(a.key===preferredKey));
      let options=[];
      for (const a of pool) {
        const results=await catalogFor(a);
        if(m.pendingIdentity){render();return;}
        options=candidates(results,m);
        if (options.length) {
          const track=options[Math.floor(Math.random()*options.length)];
          m.current={...track,assignedAt:Date.now()};
          m.recentArtists=[...m.recentArtists,a.key].slice(-4);
          save('next-song');status='';render();return;
        }
      }
      m.current=null;
      status='Im aktuellen Katalog ist nichts Neues mehr gefunden worden. Aktualisiere den Katalog oder füge weitere Artists hinzu.';
    } catch(e) { status=`${e?.message||'Songauswahl fehlgeschlagen'} Du kannst es erneut versuchen.`; }
    finally {busy=false;render();}
  }
  function rate(value) {
    const m=data(), song=m.current;
    if (!song || !['liked','maybe','disliked','known','skip'].includes(value)) return;
    if (m.tracks[song.key]) {m.current=null;save('already-recorded');render();return;}
    const today=day(), first=!m.days[today]?.completedKey;
    let reward=null;
    if (value!=='known' && value!=='skip' && !m.rewardedSongs[song.key]) {
      // Rewards the user's own classification/reflection, not playback, clicks or stream count.
      const extraToday=Number(m.days[today]?.extraCount||0);
      const amount=first?{xp:7,realmXP:9,statXP:2,coins:4,energy:.12}
        :extraToday<3?{xp:3,realmXP:4,statXP:1,coins:2,energy:.04}
        :{xp:1,realmXP:2,statXP:1,coins:1,energy:.01};
      reward=award({source:'sound-garden-reflection',id:`reflection:${song.key}`,label:`Sound Garden · Song eingeordnet: ${song.artist} — ${song.title}`, ...amount});
      m.rewardedSongs[song.key]=reward?.eventId||'recorded';
      if (first) m.days[today]={...(m.days[today]||{}),completedKey:song.key,completedAt:Date.now(),extraCount:0};
      else m.days[today].extraCount=extraToday+1;
    }
    m.tracks[song.key]={status:value,at:Date.now(),title:song.title,artist:song.artist};
    m.history.unshift({key:song.key,title:song.title,artist:song.artist,status:value,at:Date.now(),rewardEventId:reward?.eventId||null});
    m.history=m.history.slice(0,450);
    m.current=null;
    if (!save('rate-song')) return tell('Bewertung nur im Arbeitsspeicher – exportiere bitte deinen Spielstand.');
    if (value==='known') status='Schon bekannt ✓ Der Titel kommt nicht erneut in deine Entdeckungsauswahl.';
    else if(value==='skip') status='Übersprungen · keine Belohnung; ein neuer Song wartet.';
    else status=reward?`Entdeckung gespeichert · +${reward.xp} XP · +${reward.coins} Coins. ${first?'Daily abgeschlossen!':''}`:'Bewertung gespeichert.';
    render();
    if (value==='known' || value==='skip') next(true);
  }
  function importKnown(text) {
    const m=data();let added=0;
    String(text||'').split(/\r?\n/).slice(0,500).forEach(line=>{
      const parts=line.split(/\s+[—–|]\s+|\s+-\s+/);
      const artist=clean(parts.shift()),title=clean(parts.join(' - '));
      if (!artist || !title) return;
      const key=keyFor(artist,title);
      if(m.tracks[key])return;
      m.tracks[key]={status:'known',title,artist,at:Date.now(),imported:true};added++;
    });
    if (!added) return tell('Keine neuen Zeilen erkannt. Format: Artist — Songtitel (eine Zeile pro Song).');
    if (!save('known-import')) return tell('Import nicht dauerhaft gesichert – exportiere den Spielstand.');
    $('sgKnownPaste').value='';tell(`${added} bekannte Songs gespeichert · ohne rückwirkende Rewards.`);
  }
  function rememberSettings(value) {
    let u;
    try {u=new URL(value);} catch {return tell('Bitte einen gültigen Spotify-Playlist-Link eintragen.');}
    if(u.protocol!=='https:'||u.hostname!=='open.spotify.com'||!/^\/playlist\/[a-zA-Z0-9]+\/?$/.test(u.pathname)) return tell('Bitte einen Link zu einer Spotify-Playlist verwenden.');
    data().playlistUrl=u.origin+u.pathname.replace(/\/$/,'');save('playlist-setting');tell('Playlist-Link gespeichert.');
  }
  function openLink(href) { if (/^https:\/\/(?:open\.spotify\.com|music\.apple\.com|itunes\.apple\.com)\//.test(href)) window.open(href,'_blank','noopener,noreferrer'); }
  function mount() {
    if ($('sgDialog')) {dialog=$('sgDialog');return;}
    document.body.insertAdjacentHTML('beforeend',`<dialog class="sg-dialog" id="sgDialog" aria-label="Sound Garden">
      <div class="sg-shell"><header class="sg-head"><div><small>✿ HOBBIES · MUSICAL DISCOVERY</small><h2>♫ Sound Garden</h2><p>Ein Song. Ein kleiner Moment. Neue Lieblingsmusik.</p></div><button class="sg-close" id="sgClose" type="button" aria-label="Schließen">×</button></header>
      <div class="sg-content"><div class="sg-note" id="sgStatus" aria-live="polite"></div><div id="sgDaily"></div>
      <section class="sg-panel"><div class="sg-section-heading"><h3>✧ Your Artist Pool</h3><span id="sgArtistCount"></span></div>
        <form id="sgArtistForm" class="sg-artist-form"><textarea id="sgArtistName" rows="3" maxlength="12000" placeholder="Nirvana, David Bowie, Ghost Town …" aria-label="Artists und Bands – mehrere durch Komma, Semikolon oder Zeilenumbruch trennen" required></textarea><button type="submit" class="primary-button">+ Artists hinzufügen</button></form>
        <p class="sg-hint">Mehrere Namen mit Komma, Semikolon oder Zeilenumbruch trennen. Namen mit Komma in Anführungszeichen setzen (z. B. „Earth, Wind &amp; Fire“). Für jeden neuen Artist gibt es den bisherigen einmaligen Reward; Wiederholungen zählen nicht doppelt. Beim ersten Songvorschlag wird der passende Artist identifiziert. Nur bei mehreren gleichnamigen Treffern ist eine Auswahl nötig.</p><div class="sg-artists" id="sgArtists"></div><div id="sgIdentity" aria-live="polite"></div>
      </section>
      <section class="sg-panel sg-settings"><h3>♡ Deine Musik</h3><p>Spotify wird hier lediglich über normale Links geöffnet. Keine Anmeldung, kein Passwort, keine API-Übertragung und keine automatische Playlist-Bearbeitung.</p>
        <label>Meine Zielplaylist<input id="sgPlaylistUrl" type="url" value="${PLAYLIST}" placeholder="https://open.spotify.com/playlist/…"></label><button type="button" class="secondary-button" id="sgSavePlaylist">Playlist-Link speichern</button>
        <details><summary>Bereits bekannte Songs gesammelt übernehmen</summary><p>Falls du eine Songliste exportierst oder kopierst: <strong>Artist — Songtitel</strong>, eine Zeile pro Titel. Das ist kein automatischer Spotify-Import.</p><textarea id="sgKnownPaste" rows="4" placeholder="Nirvana — Come As You Are\nDavid Bowie — Heroes"></textarea><button type="button" class="secondary-button" id="sgImportKnown">Als bekannt markieren</button></details>
      </section><section class="sg-panel"><div class="sg-section-heading"><h3>Recent discoveries</h3><span id="sgHistoryCount"></span></div><div id="sgHistory" class="sg-history"></div></section>
      <p class="sg-credit">Artist- und Song-Metadaten aus dem <a href="https://www.apple.com/itunes/" target="_blank" rel="noopener noreferrer">Apple iTunes Store</a>-Katalog; Spotify öffnet nur eine Titelsuche und deine Playlist. Verfügbarkeit und Songversion können abweichen. Keine Wiedergabe wird ausgelesen oder vergütet.</p></div></div></dialog>`);
    dialog=$('sgDialog');
    $('sgClose').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    $('sgArtistForm').addEventListener('submit',e=>{e.preventDefault();addArtists($('sgArtistName').value);});
    $('sgSavePlaylist').addEventListener('click',()=>rememberSettings($('sgPlaylistUrl').value));
    $('sgImportKnown').addEventListener('click',()=>importKnown($('sgKnownPaste').value));
    dialog.addEventListener('click',e=>{
      const b=e.target.closest('button[data-sg]');if(!b)return;
      const action=b.dataset.sg;
      if(action==='new') {data().current=null;next(true);}
      else if(action==='next') next(true);
      else if(action==='refresh') {const m=data();if(m.current) delete m.catalog[m.current.artistKey];m.current=null;save('catalog-refresh');next(true);}
      else if(action==='rate') rate(b.dataset.value);
      else if(action==='remove') removeArtist(b.dataset.key);
      else if(action==='verify') verifyArtist(b.dataset.key);
      else if(action==='pick-artist') chooseArtist(b.dataset.key,b.dataset.id);
      else if(action==='spotify' && data().current)openLink(spotifySearch(data().current));
      else if(action==='playlist')openLink(data().playlistUrl);
      else if(action==='apple' && data().current)openLink(sourceLink(data().current));
    });
  }
  function render() {
    if(!dialog)return;
    const m=data(), complete=isDone(), t=m.current;
    $('sgStatus').textContent=status;$('sgStatus').hidden=!status;
    $('sgPlaylistUrl').value=m.playlistUrl;
    $('sgArtistCount').textContent=`${m.artists.length} Artists`;
    $('sgArtists').innerHTML=m.artists.length?m.artists.map(a=>`<span class="sg-pill">${esc(a.name)} <span class="sg-id-tag" title="${a.artistId?'Katalog-ID '+a.artistId:'Noch nicht geprüft'}">${a.artistId?'✓':'?'}</span><button type="button" data-sg="verify" data-key="${esc(a.key)}" title="Artist-Identität erneut überprüfen">${a.artistId?'Neu prüfen':'Prüfen'}</button><button type="button" data-sg="remove" data-key="${esc(a.key)}" aria-label="${esc(a.name)} entfernen">×</button></span>`).join(''):'<p class="sg-empty">Trage deine ersten Artists ein – zum Beispiel Nirvana oder David Bowie.</p>';
    const pending=m.pendingIdentity;
    $('sgIdentity').innerHTML=pending?`<div class="sg-identity"><strong>Welcher Artist ist gemeint?</strong><p>Es wurden mehrere gleichnamige Artists gefunden. Wähle einen Katalogeintrag. Beispielsongs erscheinen, wenn der Katalog sie liefert; sie sind keine Voraussetzung für die Zuordnung.</p>${pending.options.map(o=>`<div class="sg-identity-choice"><button type="button" data-sg="pick-artist" data-key="${esc(pending.artistKey)}" data-id="${o.id}"><b>${esc(o.name)}</b><small>${esc(o.genre||'Genre nicht angegeben')} · Katalog-ID ${o.id}</small><span>${o.examples.length?`Songs: ${esc(o.examples.join(' · '))}`:esc(o.album?`Album: ${o.album} · Keine Songtitel im Katalog geliefert.`:'Der Katalog liefert derzeit keine Songtitel für diesen Eintrag.')}</span></button>${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer" aria-label="Katalogeintrag für ${esc(o.name)} öffnen">Artist im Katalog ansehen ↗</a>`:''}</div>`).join('')}</div>`:'';
    const current=t?`<div class="sg-song"><small>${complete?'EXTRA DISCOVERY':'TODAY’S DISCOVERY'} · ${esc(t.album||'Song')}</small><h3>${esc(t.title)}</h3><p>${esc(t.artist)}</p><div class="sg-song-links"><button type="button" class="primary-button" data-sg="spotify">♫ In Spotify suchen ↗</button><button type="button" class="secondary-button" data-sg="playlist">Meine Playlist ↗</button>${sourceLink(t)?'<button type="button" class="sg-text-button" data-sg="apple">Katalogeintrag ↗</button>':''}</div><p class="sg-hint">Höre den Titel in Spotify, kehre zurück und ordne ihn ein. Playlist-Zufügen erfolgt direkt in Spotify.</p><div class="sg-choices"><button type="button" data-sg="rate" data-value="liked">♡ Gefällt mir</button><button type="button" data-sg="rate" data-value="maybe">☆ Vielleicht</button><button type="button" data-sg="rate" data-value="disliked">✕ Nicht meins</button><button type="button" data-sg="rate" data-value="known">✓ Kenne ich schon</button></div><button type="button" class="sg-text-button" data-sg="rate" data-value="skip">Anderen Song zeigen ↻</button></div>`:'';
    $('sgDaily').innerHTML=`<section class="sg-panel sg-discovery"><div class="sg-section-heading"><h3>♫ Discover a Song</h3><span class="sg-badge ${complete?'done':''}">${complete?'✓ Daily geschafft':'Optional Daily'}</span></div>${current||`<div class="sg-idle"><p>${complete?'Deine heutige Song-Entdeckung ist abgeschlossen. Du kannst trotzdem weiterstöbern.':'Ein neuer Song aus deinem Artist-Pool wartet auf dich.'}</p><button class="primary-button" data-sg="new" type="button" ${busy?'disabled':''}>${busy?'Suche läuft …':complete?'Weitere Entdeckung →':'Song vorschlagen ✦'}</button></div>`}<p class="sg-hint">Nur deine bewusste Bewertung wird in Life RPG erfasst – keine Spotify-Wiedergabe oder Streamzahl. „Kenne ich schon“ ersetzt den Titel, ohne die Daily abzuhaken.</p></section>`;
    $('sgHistoryCount').textContent=`${m.history.length} bewertet`;
    $('sgHistory').innerHTML=m.history.length?m.history.slice(0,14).map(h=>`<div><span><b>${esc(h.title)}</b><small>${esc(h.artist)}</small></span><em>${esc({liked:'♡ Gefällt mir',maybe:'☆ Vielleicht',disliked:'✕ Nicht meins',known:'✓ Bekannt',skip:'Übersprungen'}[h.status]||h.status)}</em></div>`).join(''):'<p class="sg-empty">Hier erscheinen deine bewerteten Entdeckungen.</p>';
  }
  function open() {mount();render();if(typeof dialog.showModal==='function' && !dialog.open)dialog.showModal();else dialog.setAttribute('open','');}
  window.LifeRPGSoundGarden={version:VERSION,open,summary,next,rate,addArtist,addArtists,importKnown,verifyArtist,chooseArtist};
  // Late init: DailyLife renders before this script by design.
  window.LifeRPGDailyLife?.render?.();
  window.addEventListener('life-rpg:state-saved',()=>{if(dialog?.open)render();});
})();
