/* Life RPG · Sound Garden V0.31.4dz13
   Artist-aware discovery; optional Spotify Premium PKCE + in-app Web Playback SDK.
   Existing DV–DX data and reward ledgers remain stable; no reward for Spotify plays.
*/
(() => {
  'use strict';
  const app = window.LifeRPGApp;
  if (!app?.getState || !app?.saveState || !app?.awardActivity) return;
  const VERSION = '0.31.4dz34';
  const Spotify = window.LifeRPGSpotifyBridge;
  const ALIASES = {'hanabie':['HANABIE.','花冷え。','花冷え','HANABIE']};
  const PLAYLIST = 'https://open.spotify.com/playlist/6aD4oA94t1SpI10OpTrsVl';
  const $ = id => document.getElementById(id);
  const esc = x => app.escapeHtml?.(String(x ?? '')) ?? String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const clean = s => String(s ?? '').trim().replace(/\s+/g,' ').slice(0,180);
  const norm = s => clean(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const baseSong = s => norm(clean(s).replace(/\s*[-–—]\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|deluxe|radio edit|single version|album version|live version|mono|stereo)(?:\s+\d{4})?.*$/i,'').replace(/\s*[([{][^\])}]*\b(?:remaster|deluxe|radio edit|single version|live|mono|stereo|\d{4} version)[^\])}]*[\])}]/ig,''));
  const isLiveVersion = (title, album='') => {
    const marker = value => {
      const text = clean(value);
      if (!text) return false;
      return /(?:[([{]\s*live\b)|(?:[-–—]\s*live\b)|(?:\blive\s+(?:at|from|in|on|@|version|recording|session|performance|concert)\b)|(?:\b(?:recorded|performed)\s+live\b)|(?:\bin\s+concert\b)|(?:\bconcert\s+(?:version|recording)\b)|(?:\bmtv\s+unplugged\b)/i.test(text);
    };
    const albumText = clean(album);
    return marker(title) || marker(albumText) || /^live(?:\s*[.!])?$/i.test(albumText) || /^live\s*[-–—:]\s*.+/i.test(albumText);
  };
  const keyFor = (artist,title) => `${norm(artist)}::${baseSong(title)}`;
  const sourceLink = track => /^https:\/\/(?:music\.apple\.com|itunes\.apple\.com)\//.test(track?.storeUrl || '') ? track.storeUrl : '';
  const spotifySearch = track => `https://open.spotify.com/search/${encodeURIComponent(`${track.artist} ${track.title}`)}`;
  let busy = false, status = '', preview = null, dialog = null, embeddedId = '', artistSampleId = '';
  const spotifyActive = () => Boolean(Spotify?.state().connected);
  const variants = a => [a.name, ...(ALIASES[a.key] || [])];
  const aliasMatch = (name, a) => variants(a).some(v => (norm(v) && norm(name) && norm(v) === norm(name)) || (v === name));

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
    if (!m.savedToPlaylist || typeof m.savedToPlaylist !== 'object') m.savedToPlaylist = {};
    if (!m.listenedSpotify || typeof m.listenedSpotify !== 'object' || Array.isArray(m.listenedSpotify)) m.listenedSpotify = {};
    if (!m.artistGuides || typeof m.artistGuides !== 'object' || Array.isArray(m.artistGuides)) m.artistGuides = {};
    if (!m.librarySettings || typeof m.librarySettings !== 'object' || Array.isArray(m.librarySettings)) m.librarySettings = {};
    const guideTarget = Number(m.librarySettings.trackTarget || 10);
    m.librarySettings.trackTarget = [10,20,30,50].includes(guideTarget) ? guideTarget : 10;
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
    // DZ: invalidate only a *still-open* old Spotify candidate dialog with missing
    // evidence; never reset any previously confirmed Spotify artist IDs.
    if (Number(m.version || 0) < 4) {
      if (m.pendingIdentity?.source === 'spotify') m.pendingIdentity = null;
      m.version = 4;
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
    delete m.catalog[key];delete m.artistGuides[key];
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
      Object.entries({country:'DE',...params,callback:cb}).forEach(([k,v])=>url.searchParams.set(k,v));
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
      const title=clean(r.trackName), album=clean(r.collectionName);
      if (isLiveVersion(title, album)) continue;
      if (title && !option.examples.some(other=>norm(other)===norm(title)) && option.examples.length < 4) option.examples.push(title);
      if (!option.genre && r.primaryGenreName) option.genre=clean(r.primaryGenreName);
      if (!option.album && r.collectionName) option.album=clean(r.collectionName);
    }
  }
  async function artistOptions(a) {
    let found=[];
    for(const name of variants(a)) {
      for(const country of (a.key==='hanabie'?['DE','JP','US']:['DE'])) {
        const response=await itunesJSONP('search',{term:name,media:'music',entity:'musicArtist',attribute:'artistTerm',limit:30,country});
        found.push(...rowsOf(response).filter(r=>r.wrapperType==='artist'&&Number.isSafeInteger(Number(r.artistId))&&aliasMatch(r.artistName,a)));
      }
      if(found.length)break;
    }
    // The Japanese act HANABIE. is also catalogued as 花冷え。 in some storefronts.
    if(!found.length) {
      for(const name of variants(a)) {
        const fallback=await itunesJSONP('search',{term:name,media:'music',entity:'song',attribute:'artistTerm',limit:200,country:'JP'});
        found.push(...rowsOf(fallback).filter(r=>r.kind==='song'&&Number.isSafeInteger(Number(r.artistId))&&aliasMatch(r.artistName,a)));
        if(found.length)break;
      }
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


// Spotify identity cards need their own tracks, not a generic name search.
// Genres are often absent in 2026 development-mode artist objects, so album/track
// evidence is more useful to distinguish two artists sharing the same name.
const validSpotifyId = s => /^[A-Za-z0-9]{22}$/.test(String(s||''));
const artistImage = url => /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+(?:[?#].*)?$/.test(String(url||'')) ? String(url) : '';
function addSpotifyIdentityTracks(option, tracks, album) {
  for (const track of tracks||[]) {
    if (!validSpotifyId(track?.id) || !track?.name ||
        !(track.artists||[]).some(x=>x.id===option.id) || isLiveVersion(track.name, album?.name||track.album?.name||'')) continue;
    if (option.sampleTracks.some(x=>x.id===track.id || norm(x.title)===norm(track.name))) continue;
    if (option.sampleTracks.length>=4) break;
    const title=clean(track.name);
    option.sampleTracks.push({id:track.id,title,album:clean(album?.name||track.album?.name||'')});
    option.examples.push(title);
  }
}
async function spotifyIdentityEvidence(option) {
  const errors=[];
  // Every release and its songs belong to the exact Spotify artist ID.
  let releases=[];
  try {
    const r=await Spotify.api(`/artists/${encodeURIComponent(option.id)}/albums?${new URLSearchParams({include_groups:'album,single',market:'DE',limit:'10'})}`);
    releases=(r.items||[]).filter(x=>validSpotifyId(x?.id) && (!x.artists?.length || x.artists.some(a=>a.id===option.id)));
    const unique=new Set();
    for(const album of releases) {
      if(!album.name || unique.has(norm(album.name))) continue;
      unique.add(norm(album.name));option.albums.push(clean(album.name));
      if(option.albums.length===3)break;
    }
    if(!option.image) option.image=artistImage(releases.find(x=>artistImage(x.images?.[0]?.url))?.images?.[0]?.url);
  } catch(e){errors.push(e.message||'Veröffentlichungen nicht abrufbar');}
  // Prefer a few different releases, so an ambiguous act does not look like
  // another artist merely because a name-only search returned their hit single.
  for(const album of releases.slice(0,3)) {
    if(option.sampleTracks.length>=4)break;
    try {
      const r=await Spotify.api(`/albums/${encodeURIComponent(album.id)}/tracks?${new URLSearchParams({market:'DE',limit:'50'})}`);
      addSpotifyIdentityTracks(option,r.items,album);
    } catch(e){errors.push(e.message||'Albumtitel nicht abrufbar');}
  }
  // Last resort: track search results, *strictly* filtered by Spotify artist ID.
  if(option.sampleTracks.length<2){
    try {
      const r=await Spotify.api(`/search?${new URLSearchParams({q:`artist:"${option.name.replace(/"/g,'')}\"`,type:'track',market:'DE',limit:'10'})}`);
      addSpotifyIdentityTracks(option,r.tracks?.items);
    }catch(e){errors.push(e.message||'Track-Suche nicht verfügbar');}
  }
  option.sampleStatus=option.sampleTracks.length?'ready':errors.length?'unavailable':'empty';
  return option;
}
async function spotifyArtistOptions(a) {
  const raw=await Spotify.findArtists(a.name, ALIASES[a.key] || []);
  const exact=raw.filter(row=>aliasMatch(row.name,a));
  const options=exact.filter(row=>validSpotifyId(row.id)).map(row=>({id:row.id,source:'spotify',name:row.name,
    genre:(row.genres||[]).slice(0,3).join(' · '),album:'',albums:[],examples:[],sampleTracks:[],sampleStatus:'pending',
    image:artistImage(row.images?.[1]?.url || row.images?.[0]?.url),
    url:`https://open.spotify.com/artist/${row.id}`}));
  if(options.length<=1)return options; // One exact ID can be accepted directly.
  await Promise.all(options.map(async option=>{try{await spotifyIdentityEvidence(option);}catch{option.sampleStatus='unavailable';}}));
  return options;
}
  function linkSpotifyArtist(key, link) {
    const m=data(), a=m.artists.find(x=>x.key===key), id=Spotify?.officialId(link);
    if(!a || !id) return tell('Bitte einen gültigen Spotify-Artist-Link oder eine Artist-URI einfügen.');
    if(!spotifyActive()) return tell('Bitte zuerst Spotify verbinden.');
    busy=true;status='Überprüfe Spotify-Artist-Link …';render();
    Spotify.artistById(id).then(row=>{
      if(!row?.id||!row.name)throw new Error('Dieser Link verweist auf keinen Spotify-Artist.');
      a.spotifyArtistId=row.id;a.spotifyArtistName=row.name;a.spotifyImage=artistImage(row.images?.[1]?.url||row.images?.[0]?.url);a.spotifyUrl=`https://open.spotify.com/artist/${row.id}`;
      delete m.catalog[a.key];delete m.artistGuides[a.key];if(m.current?.artistKey===a.key)m.current=null;
      m.pendingIdentity=null;save('spotify-artist-link');status=`✓ ${a.name} mit ${row.name} auf Spotify verknüpft.`;
    }).catch(e=>{status=`Spotify-Link: ${e.message}`;}).finally(()=>{busy=false;render();});
  }
  async function spotifyCatalogFor(a,refresh=false) {
    const m=data();
    if(!a.spotifyArtistId) {
      if(!await resolveArtist(a))return [];
    }
    if(!refresh && Array.isArray(m.catalog[a.key]) && m.catalog[a.key].length &&
      m.catalog[a.key].every(t=>t.spotifyArtistId===a.spotifyArtistId && t.spotifyTrackId && !isLiveVersion(t.title,t.album)))return m.catalog[a.key];
    const picked=new Map();
    const add=(t,album)=>{
      if(!t?.id || !/^[a-zA-Z0-9]{22}$/.test(t.id) || !t.name ||
        !Array.isArray(t.artists) || !t.artists.some(artist=>artist.id===a.spotifyArtistId))return;
      const albumName=album?.name||t.album?.name||'';
      if(isLiveVersion(t.name,albumName))return;
      const key=keyFor(a.name,t.name);
      if(!baseSong(t.name)||picked.has(key))return;
      picked.set(key,{key,title:t.name,artist:a.name,artistKey:a.key,
        spotifyArtistId:a.spotifyArtistId,spotifyTrackId:t.id,
        album:album?.name||t.album?.name||'',cover:album?.images?.[0]?.url||t.album?.images?.[0]?.url||'',
        storeUrl:t.external_urls?.spotify||`https://open.spotify.com/track/${t.id}`});
    };
    let failures=[];
    // Use artist ID, not matching song title. Top-tracks is unavailable in 2026 dev mode.
    try {
      const albums=await Spotify.api(`/artists/${encodeURIComponent(a.spotifyArtistId)}/albums?${new URLSearchParams({include_groups:'album,single',market:'DE',limit:'10'})}`);
      const unique=[...new Map((albums.items||[]).filter(x=>x.id).map(x=>[x.id,x])).values()];
      // Three distinct releases per first load; refresh allows more variety.
      const selections=(refresh?unique.slice(3,8):unique.slice(0,5));
      const outputs=await Promise.allSettled(selections.map(async album=>{
        const page=await Spotify.api(`/albums/${encodeURIComponent(album.id)}/tracks?${new URLSearchParams({market:'DE',limit:'50'})}`);
        return {album,items:page.items||[]};
      }));
      for(const res of outputs) {
        if(res.status==='fulfilled') {
          for(const track of res.value.items) add(track,res.value.album);
        } else failures.push(res.reason?.message||'Albumtitel nicht verfügbar');
      }
    } catch(e) {failures.push(e.message);}
    // Search fallback only accepts tracks whose artist ID exactly matches this artist.
    if(picked.size<8) {
      for(const query of variants(a).slice(0,2)) {
        try {
          const result=await Spotify.api(`/search?${new URLSearchParams({q:`artist:"${query.replace(/"/g,'')}"`,type:'track',market:'DE',limit:'10'})}`);
          for(const track of result.tracks?.items||[])add(track,null);
        } catch(e){failures.push(e.message);}
      }
    }
    if(!picked.size) throw new Error(failures[0]||`Spotify hat für ${a.name} keine passenden Songs geliefert. Prüfe die Artist-Zuordnung.`);
    m.catalog[a.key]=[...picked.values()].slice(0,160);
    save('spotify-catalog-cache');return m.catalog[a.key];
  }

  function guideTargetCount() {
    const n=Number(data().librarySettings?.trackTarget||10);
    return [10,20,30,50].includes(n)?n:10;
  }
  function setGuideTarget(value) {
    const n=Number(value);
    data().librarySettings.trackTarget=[10,20,30,50].includes(n)?n:10;
    save('artist-guide-target');
    return data().librarySettings.trackTarget;
  }
  async function spotifyCoreTracksForKey(key,refresh=false) {
    if(!spotifyActive()) throw new Error('Bitte zuerst Spotify verbinden.');
    const m=data(),a=m.artists.find(x=>x.key===key);
    if(!a) throw new Error('Artist nicht gefunden.');
    if(!a.spotifyArtistId) throw new Error('Bitte den Artist zuerst eindeutig mit Spotify verknüpfen.');
    const target=guideTargetCount();
    const existing=m.artistGuides[a.key];
    if(!refresh && existing?.spotifyArtistId===a.spotifyArtistId && Array.isArray(existing.trackIds) && existing.trackIds.length>=target) {
      const cached=artistGuideForKey(a.key);
      if(cached.length>=target)return cached.slice(0,target);
    }
    const picked=new Map();
    const add=(t,album,source='search')=>{
      if(!t?.id||!validSpotifyId(t.id)||!t.name||!Array.isArray(t.artists)||!t.artists.some(artist=>artist.id===a.spotifyArtistId))return;
      const albumName=album?.name||t.album?.name||'';
      if(isLiveVersion(t.name,albumName))return;
      const keyForTrack=keyFor(a.name,t.name);
      if(!baseSong(t.name)||picked.has(keyForTrack))return;
      picked.set(keyForTrack,{key:keyForTrack,title:t.name,artist:a.name,artistKey:a.key,
        spotifyArtistId:a.spotifyArtistId,spotifyTrackId:t.id,album:album?.name||t.album?.name||'',
        cover:album?.images?.[0]?.url||t.album?.images?.[0]?.url||'',storeUrl:t.external_urls?.spotify||`https://open.spotify.com/track/${t.id}`,guideSource:source});
    };
    const query=(a.spotifyArtistName||a.name).replace(/"/g,'');
    const wanted=Math.max(target,10);
    // Spotify removed the dedicated artist top-tracks endpoint for Development Mode in 2026.
    // Search order is therefore used as the strongest available Spotify relevance signal,
    // but every row is still verified against the exact linked Artist ID.
    for(let offset=0;offset<50 && picked.size<wanted;offset+=10){
      try{
        const result=await Spotify.api(`/search?${new URLSearchParams({q:`artist:"${query}"`,type:'track',market:'DE',limit:'10',offset:String(offset)})}`);
        for(const track of result.tracks?.items||[]) add(track,null,'search');
        if(!result.tracks?.next)break;
      }catch(e){ if(!picked.size) throw e; break; }
    }
    if(picked.size<target){
      try{
        const albums=await Spotify.api(`/artists/${encodeURIComponent(a.spotifyArtistId)}/albums?${new URLSearchParams({include_groups:'album,single',market:'DE',limit:'10'})}`);
        const unique=[...new Map((albums.items||[]).filter(x=>x.id).map(x=>[x.id,x])).values()];
        for(const album of unique.slice(0,10)){
          if(picked.size>=Math.max(target,20)) break;
          try{
            const page=await Spotify.api(`/albums/${encodeURIComponent(album.id)}/tracks?${new URLSearchParams({market:'DE',limit:'50'})}`);
            for(const track of page.items||[]) add(track,album,'catalog');
          }catch{}
        }
      }catch{}
    }
    if(!picked.size) throw new Error(`Spotify hat für ${a.name} keine exakt zuordenbaren Songs geliefert.`);
    try{
      const meta=await Spotify.artistById(a.spotifyArtistId);
      if(meta?.name)a.spotifyArtistName=meta.name;
      a.spotifyImage=artistImage(meta?.images?.[1]?.url||meta?.images?.[0]?.url)||a.spotifyImage||'';
      a.spotifyUrl=`https://open.spotify.com/artist/${a.spotifyArtistId}`;
    }catch{}
    const tracks=[...picked.values()].slice(0,50);
    const existingCatalog=Array.isArray(m.catalog[a.key])?m.catalog[a.key]:[];
    const merged=new Map();
    tracks.forEach(track=>merged.set(track.spotifyTrackId,track));
    existingCatalog.forEach(track=>{if(track?.spotifyTrackId&&!merged.has(track.spotifyTrackId))merged.set(track.spotifyTrackId,track);});
    m.catalog[a.key]=[...merged.values()].slice(0,160);
    m.artistGuides[a.key]={spotifyArtistId:a.spotifyArtistId,trackIds:tracks.map(track=>track.spotifyTrackId),targetBuilt:Math.min(50,tracks.length),updatedAt:Date.now(),source:'spotify-search+catalog-v1'};
    save('artist-guide-build');
    return tracks.slice(0,target);
  }
  function artistGuideForKey(key) {
    const m=data(),a=m.artists.find(x=>x.key===key),guide=m.artistGuides[key];
    if(!a||!guide||guide.spotifyArtistId!==a.spotifyArtistId||!Array.isArray(guide.trackIds))return [];
    const catalog=Array.isArray(m.catalog[a.key])?m.catalog[a.key]:[];
    const byId=new Map(catalog.filter(t=>t?.spotifyTrackId).map(t=>[t.spotifyTrackId,t]));
    return guide.trackIds.map(id=>byId.get(id)).filter(track=>track && !isLiveVersion(track.title,track.album)).slice(0,guideTargetCount());
  }
  function setCurrentFromGuide(key,spotifyTrackId) {
    const m=data(),track=artistGuideForKey(key).find(t=>t.spotifyTrackId===spotifyTrackId);
    if(!track)return false;
    m.current={...track,assignedAt:Date.now(),guidePick:true};
    save('artist-guide-pick');
    render();
    return true;
  }
  function markGuideTrackHeard(key,spotifyTrackId) {
    const m=data(),track=artistGuideForKey(key).find(t=>t.spotifyTrackId===spotifyTrackId);
    if(!track||!validSpotifyId(track.spotifyTrackId))return false;
    m.listenedSpotify[track.spotifyTrackId]=Date.now();
    save('artist-guide-heard');
    return true;
  }
  async function resolveArtist(a,forceChoice=false) {
    const m=data();
    if(!forceChoice && (spotifyActive()?Boolean(a.spotifyArtistId):(Number.isSafeInteger(a.artistId)&&a.artistId>0)))return true;
    const useSpotify=spotifyActive();
    const options=useSpotify?await spotifyArtistOptions(a):await artistOptions(a);
    if(!options.length){status=`Kein passender ${useSpotify?'Spotify':'Katalog'}-Artist für „${a.name}“ gefunden. ${useSpotify?'Du kannst stattdessen seinen Spotify-Artist-Link eintragen.':'Verbinde Spotify oder verwende eine alternative Schreibweise (z. B. 花冷え。).'} Es wird kein gleichnamiger Song als Ersatz verwendet.`;return false;}
    if(options.length===1) {
      const o=options[0];
      if(useSpotify){a.spotifyArtistId=o.id;a.spotifyArtistName=o.name;a.spotifyImage=artistImage(o.image);a.spotifyUrl=o.url||`https://open.spotify.com/artist/${o.id}`;}
      else a.artistId=o.id;
      delete m.catalog[a.key];delete m.artistGuides[a.key];
      if(m.current?.artistKey===a.key)m.current=null;
      m.pendingIdentity=null;
      save('artist-identity');
      status=`✓ ${a.name} eindeutig auf ${useSpotify?'Spotify':'Apple Music'} zugeordnet.`;
      return true;
    }
    artistSampleId='';
    m.pendingIdentity={artistKey:a.key,source:useSpotify?'spotify':'apple',options,at:Date.now(),resumeDiscovery:!forceChoice};
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
    const option=pending?.artistKey===key&&pending.options.find(x=>String(x.id)===String(id));
    if(!a||!option)return;
    if(pending.source==='spotify'){a.spotifyArtistId=option.id;a.spotifyArtistName=option.name;a.spotifyImage=artistImage(option.image);a.spotifyUrl=option.url||`https://open.spotify.com/artist/${option.id}`;}
    else a.artistId=option.id;
    delete m.catalog[a.key];delete m.artistGuides[a.key];
    if(m.current?.artistKey===a.key)m.current=null;
    const resumeDiscovery=Boolean(pending.resumeDiscovery);
    m.pendingIdentity=null;artistSampleId='';
    save('artist-identity-selected');status=`✓ ${a.name} zugeordnet · ${pending.source==='spotify'?'Spotify':'Katalog'}-ID ${option.id}.`;
    render();
    if(resumeDiscovery)next(true,key);
  }
  async function catalogFor(a,refresh=false) {
    const m=data();
    if(spotifyActive())return spotifyCatalogFor(a,refresh);
    if(!Number.isSafeInteger(a.artistId)||a.artistId<=0) {
      if(!await resolveArtist(a))return [];
    }
    if(!refresh&&Array.isArray(m.catalog[a.key])&&m.catalog[a.key].length&&m.catalog[a.key].every(t=>t.artistId===a.artistId&&!isLiveVersion(t.title,t.album))) return m.catalog[a.key];
    // Identity-filtered lookup, then broader artist search. Never match by song title alone.
    const response=await itunesJSONP('lookup',{id:a.artistId,entity:'song',limit:180});
    let rows=rowsOf(response);
    const broad=await itunesJSONP('search',{term:a.name,media:'music',entity:'song',attribute:'artistTerm',limit:200});
    rows=rows.concat(rowsOf(broad));
    const picked=new Map();
    for(const r of rows) {
      if(r.kind!=='song'||!r.trackName||Number(r.artistId)!==a.artistId||!Number.isSafeInteger(Number(r.trackId)))continue;
      const title=clean(r.trackName),album=clean(r.collectionName),id=keyFor(a.name,title);
      if(isLiveVersion(title,album)||!baseSong(title)||picked.has(id))continue;
      picked.set(id,{key:id,title,artist:a.name,artistKey:a.key,artistId:a.artistId,album:clean(r.collectionName),storeUrl:String(r.trackViewUrl||''),sourceId:Number(r.trackId)});
    }
    m.catalog[a.key]=[...picked.values()].slice(0,160);
    save('catalog-cache');return m.catalog[a.key];
  }
  function spotifyTrackIdsAlreadySeen(m) {
    const ids = new Set();
    for (const entry of Object.values(m.tracks || {})) {
      if (validSpotifyId(entry?.spotifyTrackId)) ids.add(entry.spotifyTrackId);
    }
    for (const entry of m.history || []) {
      if (validSpotifyId(entry?.spotifyTrackId)) ids.add(entry.spotifyTrackId);
    }
    return ids;
  }
  function candidates(list,m) {
    const seenSpotifyIds = spotifyTrackIdsAlreadySeen(m);
    return list.filter(t => !m.tracks[t.key]
      && !m.history.some(h=>h.key===t.key)
      && (!validSpotifyId(t.spotifyTrackId) || !seenSpotifyIds.has(t.spotifyTrackId)));
  }
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
        if(spotifyActive())options=options.filter(x=>x.spotifyTrackId);
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
    const spotifyId = validSpotifyId(song.spotifyTrackId) ? song.spotifyTrackId : '';
    const alreadySeenBySpotifyId = spotifyId && spotifyTrackIdsAlreadySeen(m).has(spotifyId);
    if (m.tracks[song.key] || alreadySeenBySpotifyId) {m.current=null;save('already-recorded');render();return;}
    const today=day(), first=!m.days[today]?.completedKey;
    const stableRewardKey = spotifyId ? `spotify:${spotifyId}` : song.key;
    const alreadyRewarded = Boolean(m.rewardedSongs[stableRewardKey] || m.rewardedSongs[song.key]);
    let reward=null;
    if (value!=='known' && value!=='skip' && !alreadyRewarded) {
      // Rewards the user's own classification/reflection, not playback, clicks or stream count.
      const extraToday=Number(m.days[today]?.extraCount||0);
      const amount=first?{xp:7,realmXP:9,statXP:2,coins:4,energy:.12}
        :extraToday<3?{xp:3,realmXP:4,statXP:1,coins:2,energy:.04}
        :{xp:1,realmXP:2,statXP:1,coins:1,energy:.01};
      reward=award({source:'sound-garden-reflection',id:`reflection:${stableRewardKey}`,label:`Sound Garden · Song eingeordnet: ${song.artist} — ${song.title}`, ...amount});
      const rewardMarker=reward?.eventId||'recorded';
      m.rewardedSongs[stableRewardKey]=rewardMarker;
      // Keep the historical title/artist key populated as a compatibility index for older saves.
      if (stableRewardKey!==song.key) m.rewardedSongs[song.key]=rewardMarker;
      if (first) m.days[today]={...(m.days[today]||{}),completedKey:song.key,completedAt:Date.now(),extraCount:0};
      else m.days[today].extraCount=extraToday+1;
    }
    m.tracks[song.key]={status:value,at:Date.now(),title:song.title,artist:song.artist,
      ...(spotifyId?{spotifyTrackId:spotifyId}:{}),
      ...(validSpotifyId(song.spotifyArtistId)?{spotifyArtistId:song.spotifyArtistId}:{})};
    m.history.unshift({key:song.key,title:song.title,artist:song.artist,status:value,at:Date.now(),rewardEventId:reward?.eventId||null,
      ...(spotifyId?{spotifyTrackId:spotifyId}:{}),
      ...(validSpotifyId(song.spotifyArtistId)?{spotifyArtistId:song.spotifyArtistId}:{})});
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

  async function importSpotifyPlaylistKnown() {
    if(!spotifyActive())return tell('Bitte erst Spotify verbinden.');
    const m=data(),match=m.playlistUrl.match(/\/playlist\/([a-zA-Z0-9]+)/);
    if(!match)return tell('Bitte zuerst den Playlist-Link überprüfen.');
    const button=$('sgImportPlaylist');button.disabled=true;
    let imported=0,scanned=0;
    try {
      for(let offset=0;offset<1000;offset+=50){
        const result=await Spotify.api(`/playlists/${match[1]}/items?${new URLSearchParams({limit:'50',offset:String(offset)})}`);
        for(const item of result.items||[]){
          const track=item.item||item.track;
          if(!track?.name||!track.artists?.length)continue;
          scanned++;
          for(const artist of track.artists){
            const key=keyFor(artist.name,track.name);
            if(!m.tracks[key]){m.tracks[key]={status:'known',title:track.name,artist:artist.name,at:Date.now(),imported:true,spotifyTrackId:track.id};imported++;}
          }
        }
        if(!result.next)break;
      }
      save('spotify-playlist-known-import');
      tell(`✓ ${imported} Titel-/Artist-Kombinationen als bekannt übernommen (${scanned} Playlist-Einträge geprüft, maximal 1000). Keine rückwirkenden Rewards.`);
    } catch(e){status=`Playlist-Import: ${e.message}. Bisher geprüfte Songs wurden nicht gelöscht.`;if(imported)save('spotify-playlist-known-import-partial');render();}
    finally{button.disabled=false;}
  }
  function rememberSettings(value) {
    let u;
    try {u=new URL(value);} catch {return tell('Bitte einen gültigen Spotify-Playlist-Link eintragen.');}
    if(u.protocol!=='https:'||u.hostname!=='open.spotify.com'||!/^\/playlist\/[a-zA-Z0-9]+\/?$/.test(u.pathname)) return tell('Bitte einen Link zu einer Spotify-Playlist verwenden.');
    data().playlistUrl=u.origin+u.pathname.replace(/\/$/,'');save('playlist-setting');tell('Playlist-Link gespeichert.');
  }
  function openLink(href) { if (/^https:\/\/(?:open\.spotify\.com|music\.apple\.com|itunes\.apple\.com)\//.test(href)) window.open(href,'_blank','noopener,noreferrer'); }

  async function addCurrentToPlaylist() {
    const m=data(),song=m.current;
    if(!song?.spotifyTrackId || !spotifyActive())return tell('Bitte zuerst einen Spotify-Song laden und Spotify verbinden.');
    if(m.savedToPlaylist[song.spotifyTrackId])return tell('Dieser Song wurde bereits über Sound Garden in die Playlist übernommen.');
    const button=$('sgPlaylistAdd');if(button)button.disabled=true;
    try {
      await Spotify.addToPlaylist(m.playlistUrl,song);
      m.savedToPlaylist[song.spotifyTrackId]=Date.now();
      save('spotify-playlist-add');tell('✓ Song direkt zu deiner Spotify-Playlist hinzugefügt.');
    } catch(e){tell(`Playlist: ${e.message}`);} finally {if(button)button.disabled=false;}
  }
  async function playCurrent() {
    const t=data().current;
    if(!t?.spotifyTrackId||!spotifyActive())return tell('Bitte Spotify verbinden und einen neuen Song vorschlagen.');
    const button=$('sgPlayInside');if(button)button.disabled=true;
    try {await Spotify.play(t);data().listenedSpotify[t.spotifyTrackId]=Date.now();save('spotify-listened');status='♫ Spotify spielt jetzt innerhalb von Life RPG.';}
    catch(e){status=`Spotify-Player: ${e.message} Der eingebettete Player darunter bleibt als Alternative verfügbar.`;}
    finally {if(button)button.disabled=false;render();}
  }
  function updateEmbed(t) {
    const el=$('sgEmbed');if(!el)return;
    const id=spotifyActive()?t?.spotifyTrackId||'':'';
    if(embeddedId===id)return;
    embeddedId=id;
    el.replaceChildren();el.hidden=!id;
    if(!id)return;
    const frame=document.createElement('iframe');
    frame.src=Spotify.embedUrl(t);frame.title=`Spotify · ${t.title} – ${t.artist}`;
    frame.loading='eager';frame.setAttribute('allow','autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
    frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    frame.width='100%';frame.height='152';frame.style.border='0';frame.style.borderRadius='12px';
    el.appendChild(frame);
  }
  function updateMiniPlayer() {
    const mini=$('sgMiniPlayer');if(!mini)return;
    const live=Spotify?.state();
    const t=live?.activeTrack;
    mini.hidden=!live?.connected || !t;
    if(!t)return;
    $('sgMiniTitle').textContent=`♫ ${t.artist} — ${t.title}`;
    $('sgMiniPause').textContent=live.lastPlayback?.paused?'▶ Fortsetzen':'⏯ Pause / Weiter';
  }
  function mount() {
    if ($('sgDialog')) {dialog=$('sgDialog');return;}
    document.body.insertAdjacentHTML('beforeend',`<dialog class="sg-dialog" id="sgDialog" aria-label="Sound Garden">
      <div class="sg-shell"><header class="sg-head"><div><small>✿ HOBBIES · MUSICAL DISCOVERY</small><h2>♫ Sound Garden</h2><p>Ein Song. Ein kleiner Moment. Neue Lieblingsmusik.</p></div><button class="sg-close" id="sgClose" type="button" aria-label="Schließen">×</button></header>
      <div class="sg-content"><div class="sg-note" id="sgStatus" aria-live="polite"></div><div id="sgDaily"></div><section id="sgEmbed" class="sg-embed" aria-label="Spotify Embed" hidden></section>
      <section class="sg-panel"><div class="sg-section-heading"><h3>✧ Your Artist Pool</h3><span id="sgArtistCount"></span></div>
        <form id="sgArtistForm" class="sg-artist-form"><textarea id="sgArtistName" rows="3" maxlength="12000" placeholder="Nirvana, David Bowie, Ghost Town …" aria-label="Artists und Bands – mehrere durch Komma, Semikolon oder Zeilenumbruch trennen" required></textarea><button type="submit" class="primary-button">+ Artists hinzufügen</button></form>
        <p class="sg-hint">Mehrere Namen mit Komma, Semikolon oder Zeilenumbruch trennen. Namen mit Komma in Anführungszeichen setzen (z. B. „Earth, Wind &amp; Fire“). Für jeden neuen Artist gibt es den bisherigen einmaligen Reward; Wiederholungen zählen nicht doppelt. Beim ersten Songvorschlag wird der passende Artist identifiziert. Nur bei mehreren gleichnamigen Treffern ist eine Auswahl nötig.</p><div class="sg-artists" id="sgArtists"></div><div id="sgIdentity" aria-live="polite"></div><div class="sg-direct-artist" id="sgDirectArtist"><label>Band im Pool <select id="sgLinkArtistChoice" aria-label="Band für Spotify-Link auswählen"></select></label><label>Spotify-Artist-Link<input id="sgArtistLink" type="text" placeholder="https://open.spotify.com/artist/…" spellcheck="false"></label><button type="button" class="secondary-button" data-sg="link-artist">Artist direkt verknüpfen</button><small>Für HANABIE. oder andere Artists, die die Namenssuche nicht findet. Der Link muss zu einem Spotify-Artist führen.</small></div>
      </section>
      <section class="sg-panel sg-settings"><h3>♫ Spotify Premium · In-App-Player</h3><p>Verbinde dein eigenes Spotify-Konto einmalig per PKCE. Dann kommen Artist-Auswahl, Songdaten, der offizielle Spotify-Player und das optionale Playlist-Hinzufügen direkt aus Spotify. Keine Client Secrets und keine Spotify-Passwörter in Life RPG.</p>
        <div id="sgSpotifyState" class="sg-spotify-state" role="status"></div>
        <label>Spotify Client ID (aus deinem Developer Dashboard)<input id="sgClientId" type="text" maxlength="32" autocomplete="off" spellcheck="false" placeholder="32-stellige Client ID"></label>
        <div class="sg-spotify-actions"><button type="button" class="secondary-button" id="sgSaveClient">Client ID speichern</button><button type="button" class="primary-button" id="sgConnect">Spotify verbinden</button><button type="button" class="secondary-button" id="sgDisconnect">Trennen</button></div>
        <p class="sg-hint">Einmalige Einrichtung: Erstelle eine App auf <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify for Developers ↗</a>, trage unter Redirect URIs exakt <code id="sgCallbackUrl"></code> ein und kopiere nur die Client ID hierher. Der Spotify-Login führt kurz zur offiziellen Spotify-Seite und anschließend zurück in Life RPG. Die Wiedergabe bleibt danach hier. Spotify Premium erforderlich.</p>
        <label>Meine Zielplaylist<input id="sgPlaylistUrl" type="url" value="${PLAYLIST}" placeholder="https://open.spotify.com/playlist/…"></label><button type="button" class="secondary-button" id="sgSavePlaylist">Playlist-Link speichern</button><button type="button" class="secondary-button" id="sgImportPlaylist" disabled>Playlist-Songs als bekannt übernehmen</button>
        <details><summary>Bereits bekannte Songs gesammelt übernehmen</summary><p>Falls du eine Songliste exportierst oder kopierst: <strong>Artist — Songtitel</strong>, eine Zeile pro Titel. Das ist kein automatischer Spotify-Import.</p><textarea id="sgKnownPaste" rows="4" placeholder="Nirvana — Come As You Are\nDavid Bowie — Heroes"></textarea><button type="button" class="secondary-button" id="sgImportKnown">Als bekannt markieren</button></details>
      </section><section class="sg-panel"><div class="sg-section-heading"><h3>Recent discoveries</h3><span id="sgHistoryCount"></span></div><div id="sgHistory" class="sg-history"></div></section>
      <p class="sg-credit">Musik und Wiedergabe: Spotify (bei verbundener Sitzung); sonst Apple-iTunes-Katalogdaten. Spotify-Inhalte werden mit ihrem offiziellen Player und Link zu Spotify angezeigt. Der Life-RPG-Reward bezieht sich nur auf das bewusste Einordnen eines neuen Songs, niemals auf Spotify-Streams oder Wiedergabezahlen.</p></div></div></dialog>`);
    dialog=$('sgDialog');
    document.body.insertAdjacentHTML('beforeend',`<aside id="sgMiniPlayer" class="sg-mini-player" hidden><button type="button" id="sgMiniOpen" aria-label="Sound Garden öffnen"><span id="sgMiniTitle">♫ Sound Garden</span></button><button type="button" id="sgMiniPause">⏯ Pause / Weiter</button></aside>`);
    $('sgMiniOpen').addEventListener('click',open);
    $('sgMiniPause').addEventListener('click',()=>Spotify?.toggle().catch(e=>tell(e.message)));
    $('sgCallbackUrl').textContent=Spotify?.redirect()||'https://ttratkb.github.io/life-rpg/';
    $('sgClientId').value=Spotify?.clientId()||'';
    $('sgSaveClient').addEventListener('click',()=>{try{Spotify.configure($('sgClientId').value);tell('Client ID lokal gespeichert. Jetzt Spotify verbinden.');}catch(e){tell(e.message);}});
    $('sgConnect').addEventListener('click',()=>Spotify?.grant().catch(e=>tell(e.message)));
    $('sgDisconnect').addEventListener('click',()=>{Spotify?.disconnect();embeddedId='';data().current=null;save('spotify-disconnect');render();});
    $('sgClose').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    $('sgArtistForm').addEventListener('submit',e=>{e.preventDefault();addArtists($('sgArtistName').value);});
    $('sgSavePlaylist').addEventListener('click',()=>rememberSettings($('sgPlaylistUrl').value));
    $('sgImportKnown').addEventListener('click',()=>importKnown($('sgKnownPaste').value));
    $('sgImportPlaylist').addEventListener('click',importSpotifyPlaylistKnown);
    dialog.addEventListener('click',e=>{
      const b=e.target.closest('button[data-sg]');if(!b)return;
      const action=b.dataset.sg;
      if(action==='new') {data().current=null;next(true);}
      else if(action==='next') next(true);
      else if(action==='refresh') {const m=data();if(m.current){delete m.catalog[m.current.artistKey];delete m.artistGuides[m.current.artistKey];}m.current=null;save('catalog-refresh');next(true);}
      else if(action==='rate') rate(b.dataset.value);
      else if(action==='remove') removeArtist(b.dataset.key);
      else if(action==='verify') verifyArtist(b.dataset.key);
      else if(action==='pick-artist') chooseArtist(b.dataset.key,b.dataset.id);
      else if(action==='sample-artist') {artistSampleId=artistSampleId===b.dataset.id?'':b.dataset.id;render();}
      else if(action==='spotify' && data().current)openLink(data().current.storeUrl?.startsWith('https://open.spotify.com/track/')?data().current.storeUrl:spotifySearch(data().current));
      else if(action==='listen-recovery'){
        const timer=window.LifeRPGTime;
        if(!timer?.startClock)return tell('Zeiterfassung momentan nicht verfügbar.');
        if(timer.getActive?.())return tell('Es läuft bereits ein Timer. Bitte ihn zuerst beenden.');
        timer.startClock({categoryId:'recovery',subcategory:'Other recovery',label:'Intentional unwind · music listening'});
        tell('♫ Musik-Auszeit läuft im normalen Timer. Stoppe ihn nach dem Hören zum Loggen.');
      }
      else if(action==='finish-listening'){
        const active=window.LifeRPGTime?.getActive?.();
        if(active?.categoryId==='recovery' && /^Intentional unwind · music listening/.test(active.label||'')){
          const result=window.LifeRPGTime.finishActive();
          if(result?.ok)tell('♫ Musik-Auszeit gespeichert · Leisure & Unwinding trainiert.');
          else tell(result?.reason||'Musik-Auszeit konnte nicht beendet werden.');
        }
      }
      else if(action==='play')playCurrent();
      else if(action==='addplaylist')addCurrentToPlaylist();
      else if(action==='link-artist')linkSpotifyArtist(b.dataset.key||$('sgLinkArtistChoice')?.value,$('sgArtistLink')?.value);
      else if(action==='playlist')openLink(data().playlistUrl);
      else if(action==='apple' && data().current)openLink(sourceLink(data().current));
    });
  }
  function render() {
    if(!dialog)return;
    const m=data(), complete=isDone(), t=m.current;
    $('sgStatus').textContent=status;$('sgStatus').hidden=!status;
    $('sgPlaylistUrl').value=m.playlistUrl;
    const state=Spotify?.state();
    $('sgSpotifyState').textContent=state?.connected?(state.error?`Spotify verbunden · ${state.error}`:'✓ Spotify verbunden · bereit für Songvorschläge und den In-App-Player')
      :state?.error||'Spotify noch nicht verbunden · Apple-Katalog als eingeschränkte Alternative.';
    $('sgConnect').disabled=Boolean(state?.busy);
    $('sgDisconnect').hidden=!state?.connected;
    $('sgImportPlaylist').disabled=!state?.connected;
    updateMiniPlayer();
    $('sgArtistCount').textContent=`${m.artists.length} Artists`;
    const selector=$('sgLinkArtistChoice'), previously=selector.value;
    selector.innerHTML=m.artists.map(a=>`<option value="${esc(a.key)}">${esc(a.name)}</option>`).join('');
    if(m.artists.some(a=>a.key===previously))selector.value=previously;
    $('sgDirectArtist').hidden=!spotifyActive()||!m.artists.length;
    $('sgArtists').innerHTML=m.artists.length?m.artists.map(a=>`<span class="sg-pill">${esc(a.name)} <span class="sg-id-tag" title="${a.spotifyArtistId?'Spotify ID '+a.spotifyArtistId:a.artistId?'Apple-Katalog-ID '+a.artistId:'Noch nicht geprüft'}">${spotifyActive()?a.spotifyArtistId?'✓':'?':a.artistId?'✓':'?'}</span><button type="button" data-sg="verify" data-key="${esc(a.key)}" title="Artist-Identität erneut überprüfen">${(spotifyActive()?a.spotifyArtistId:a.artistId)?'Neu prüfen':'Prüfen'}</button><button type="button" data-sg="remove" data-key="${esc(a.key)}" aria-label="${esc(a.name)} entfernen">×</button></span>`).join(''):'<p class="sg-empty">Trage deine ersten Artists ein – zum Beispiel Nirvana oder David Bowie.</p>';
    const pending=m.pendingIdentity;
    $('sgIdentity').innerHTML=pending?`<div class="sg-identity"><strong>Welcher Artist ist gemeint?</strong><p>Wähle den richtigen Artist anhand seiner Veröffentlichungen und Songs. Es werden nur Titel mit genau dieser Spotify-Artist-ID gezeigt. Deine Auswahl wird im Life-RPG-Spielstand gespeichert.</p>${pending.options.map(o=>{const spotify=o.source==='spotify',samples=Array.isArray(o.sampleTracks)?o.sampleTracks:[],showSample=spotify&&artistSampleId===String(o.id)&&validSpotifyId(samples[0]?.id);const info=[o.genre, ...(o.albums||[]).length?[`Veröffentlichungen: ${o.albums.join(' · ')}`]:o.album?[`Album: ${o.album}`]:[]].filter(Boolean);return `<div class="sg-identity-choice"><div class="sg-identity-overview">${o.image&&artistImage(o.image)?`<img class="sg-identity-art" src="${esc(o.image)}" alt="Artist-/Coverbild: ${esc(o.name)}" loading="lazy">`:''}<div class="sg-identity-copy"><b>${esc(o.name)}</b><small>Spotify-Artist-ID: ${esc(o.id)}</small>${info.length?`<span>${esc(info.join(' · '))}</span>`:''}<strong class="sg-identity-songlabel">${samples.length?'Beispielsongs dieses Artists:':'Songbeispiele'}</strong><span>${samples.length?esc(samples.map(x=>x.title).join(' · ')):(o.examples?.length?esc(o.examples.join(' · ')):spotify?(o.sampleStatus==='unavailable'?'Spotify konnte die Beispiele gerade nicht laden. Über den Artist-Link kannst du den Eintrag prüfen.':'Keine Songs dieses Artist-Eintrags im verfügbaren Katalog gefunden. Bitte den Artist-Link prüfen.'):'Für diesen Katalogeintrag sind keine Beispielsongs verfügbar.')}</span></div></div><div class="sg-identity-actions"><button type="button" class="primary-button" data-sg="pick-artist" data-key="${esc(pending.artistKey)}" data-id="${esc(o.id)}">✓ Diesen Artist auswählen</button>${spotify&&validSpotifyId(samples[0]?.id)?`<button type="button" class="secondary-button" data-sg="sample-artist" data-id="${esc(o.id)}">${showSample?'Hörprobe schließen':'♫ Song hier probehören'}</button>`:''}${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer" aria-label="Spotify-Artist ${esc(o.name)} öffnen">Artist auf Spotify ansehen ↗</a>`:''}</div>${showSample?`<iframe title="Spotify-Hörprobe: ${esc(samples[0].title)} von ${esc(o.name)}" src="https://open.spotify.com/embed/track/${samples[0].id}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" width="100%" height="152"></iframe>`:''}</div>`;}).join('')}</div>`:'';
    const playable=Boolean(spotifyActive() && t?.spotifyTrackId);
    const current=t?`<div class="sg-song"><small>${complete?'EXTRA DISCOVERY':'TODAY’S DISCOVERY'} · ${esc(t.album||'Song')}</small><h3>${esc(t.title)}</h3><p>${esc(t.artist)}</p>${playable?`<div class="sg-song-links"><button type="button" class="primary-button" data-sg="play" id="sgPlayInside">▶ Hier im Life RPG abspielen</button><button type="button" class="secondary-button" data-sg="addplaylist" id="sgPlaylistAdd" ${m.savedToPlaylist[t.spotifyTrackId]?'disabled':''}>${m.savedToPlaylist[t.spotifyTrackId]?'✓ In Playlist übernommen':'♡ Zur Playlist hinzufügen'}</button><button type="button" class="sg-text-button" data-sg="spotify">Bei Spotify ansehen ↗</button></div><p class="sg-hint">Offizieller Spotify-Player unten. Du kannst die Wiedergabe hier oder über das kleine Sound-Garden-Dock steuern. Falls der Browser den Premium-Player blockiert, nutze den eingebetteten Player.</p>`:`<div class="sg-song-links"><button type="button" class="primary-button" data-sg="spotify">♫ In Spotify suchen ↗</button><button type="button" class="secondary-button" data-sg="playlist">Meine Playlist ↗</button>${sourceLink(t)?'<button type="button" class="sg-text-button" data-sg="apple">Katalogeintrag ↗</button>':''}</div><p class="sg-hint">${spotifyActive()?'Dieser ältere Vorschlag hat noch keine Spotify-Track-ID. Bitte einen neuen Spotify-Song vorschlagen.':'Direkte Vollwiedergabe benötigt eine funktionierende Spotify-Premium-Verbindung. Apple-Katalogvorschläge enthalten keinen abspielbaren Vollsong. Du kannst den Song extern öffnen und Musik-Auszeit unabhängig davon loggen.'}</p>`}<div class="sg-choices"><button type="button" data-sg="rate" data-value="liked">♡ Gefällt mir</button><button type="button" data-sg="rate" data-value="maybe">☆ Vielleicht</button><button type="button" data-sg="rate" data-value="disliked">✕ Nicht meins</button><button type="button" data-sg="rate" data-value="known">✓ Kenne ich schon</button></div><button type="button" class="sg-text-button" data-sg="rate" data-value="skip">Anderen Song zeigen ↻</button></div>`:'';
    const activeListening=window.LifeRPGTime?.getActive?.();
    const listeningNow=activeListening?.categoryId==='recovery' && /^Intentional unwind · music listening/.test(activeListening?.label||'');
    const musicRecovery=`<div class="sg-music-recovery-dz34"><strong>☾ Musik als Recovery</strong><p>Deine eigene Musik bewusst genießen – auch außerhalb von Life RPG. Die Zeit wird erst beim Stoppen geloggt, nicht durch einen Songvorschlag oder einen Play-Klick.</p><button type="button" class="secondary-button" data-sg="${listeningNow?'finish-listening':'listen-recovery'}" ${activeListening&&!listeningNow?'disabled title="Anderer Timer läuft"':''}>${listeningNow?'■ Musik-Auszeit stoppen & loggen':'♫ Musik-Auszeit starten'}</button></div>`;
    $('sgDaily').innerHTML=`<section class="sg-panel sg-discovery"><div class="sg-section-heading"><h3>♫ Discover a Song</h3><span class="sg-badge ${complete?'done':''}">${complete?'✓ Daily geschafft':'Optional Daily'}</span></div>${current||`<div class="sg-idle"><p>${complete?'Deine heutige Song-Entdeckung ist abgeschlossen. Du kannst trotzdem weiterstöbern.':'Ein neuer Song aus deinem Artist-Pool wartet auf dich.'}</p><button class="primary-button" data-sg="new" type="button" ${busy?'disabled':''}>${busy?'Suche läuft …':complete?'Weitere Entdeckung →':'Song vorschlagen ✦'}</button></div>`}<p class="sg-hint">Nur deine bewusste Bewertung wird in Life RPG erfasst – keine Spotify-Wiedergabe oder Streamzahl. „Kenne ich schon“ ersetzt den Titel, ohne die Daily abzuhaken.</p>${musicRecovery}</section>`;
    updateEmbed(t);
    $('sgHistoryCount').textContent=`${m.history.length} bewertet`;
    $('sgHistory').innerHTML=m.history.length?m.history.slice(0,14).map(h=>`<div><span><b>${esc(h.title)}</b><small>${esc(h.artist)}</small></span><em>${esc({liked:'♡ Gefällt mir',maybe:'☆ Vielleicht',disliked:'✕ Nicht meins',known:'✓ Bekannt',skip:'Übersprungen'}[h.status]||h.status)}</em></div>`).join(''):'<p class="sg-empty">Hier erscheinen deine bewerteten Entdeckungen.</p>';
  }
  function open() {mount();render();if(typeof dialog.showModal==='function' && !dialog.open)dialog.showModal();else dialog.setAttribute('open','');}
  window.LifeRPGSoundGarden={version:VERSION,open,summary,next,rate,addArtist,addArtists,importKnown,verifyArtist,chooseArtist,getData:data,guideTarget:guideTargetCount,setGuideTarget,buildArtistGuide:spotifyCoreTracksForKey,getArtistGuide:artistGuideForKey,setCurrentFromGuide,markGuideTrackHeard};
  // Late init: DailyLife renders before this script by design.
  window.LifeRPGDailyLife?.render?.();
  window.addEventListener('life-rpg:state-saved',()=>{if(dialog?.open)render();});
  window.addEventListener('life-rpg:spotify-change',()=>{if(dialog)render();});
  Spotify?.ready?.then(()=>{const m=data(); if(spotifyActive() && m.current && !m.current.spotifyTrackId){m.current=null;save('spotify-source-change');status='Spotify verbunden. Bitte einen neuen Song direkt aus Spotify vorschlagen.';} if(dialog)render();});
})();
