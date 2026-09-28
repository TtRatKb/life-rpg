/* Life RPG · Sound Garden Spotify bridge v0.31.4dy
   Personal, opt-in Spotify Premium connection. No client secret or playback rewards.
   OAuth tokens live in this browser tab's sessionStorage, never the Life RPG save.
*/
(() => {
  'use strict';
  const CLIENT_KEY = 'lifeRpg.soundGarden.spotifyClientId.v1';
  const TOKEN_KEY = 'lifeRpg.soundGarden.spotifySession.v1';
  const FLOW_KEY = 'lifeRpg.soundGarden.spotifyPkce.v1';
  const API = 'https://api.spotify.com/v1';
  const SCOPES = ['streaming', 'user-read-email', 'user-read-private',
    'user-read-playback-state', 'user-modify-playback-state',
    'playlist-modify-public', 'playlist-modify-private', 'playlist-read-private'];
  let player = null, deviceId = '', readyTask = null, busy = false, error = '', activeTrack = null;
  let sdkStatus = '', lastPlayback = null;
  const notify = () => window.dispatchEvent(new CustomEvent('life-rpg:spotify-change'));
  const idOk = s => /^[a-f0-9]{32}$/i.test(String(s || '').trim());
  const clientId = () => localStorage.getItem(CLIENT_KEY) || '';
  const redirect = () => `${location.origin}${location.pathname.replace(/index\.html$/i, '')}`;
  const credentials = () => { try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; } };
  const setCredentials = body => { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(body)); notify(); };
  const rand = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[x % 66]).join('');
  const bytes64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const state = () => ({configured: idOk(clientId()), connected: Boolean(credentials()?.access && credentials()?.refresh),
    ready: Boolean(deviceId), busy, error, sdkStatus, activeTrack, lastPlayback});

  async function grant() {
    const id = clientId();
    if (!idOk(id)) throw new Error('Bitte zuerst deine Spotify Client ID in Sound Garden speichern.');
    if (!window.isSecureContext || !crypto?.subtle) throw new Error('Spotify-Anmeldung benötigt HTTPS und einen sicheren Browserkontext.');
    const verifier = rand(64), challenge = bytes64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const csrf = rand(28);
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({verifier, csrf, at: Date.now(), redirect: redirect()}));
    const u = new URL('https://accounts.spotify.com/authorize');
    u.search = new URLSearchParams({client_id: id, response_type: 'code', redirect_uri: redirect(),
      code_challenge_method: 'S256', code_challenge: challenge, state: csrf, scope: SCOPES.join(' ')});
    location.assign(u.href);
  }
  async function exchange(form) {
    const reply = await fetch('https://accounts.spotify.com/api/token', {method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(form)});
    let result = {};
    try { result = await reply.json(); } catch {}
    if (!reply.ok || !result.access_token) throw new Error(result.error_description || result.error || `Spotify-Anmeldung: HTTP ${reply.status}`);
    return result;
  }
  function storeToken(result, previous) {
    const updated = {access: result.access_token, refresh: result.refresh_token || previous?.refresh || '',
      until: Date.now() + Math.max(1, Number(result.expires_in || 3600)) * 1000,
      scope: result.scope || previous?.scope || SCOPES.join(' ')};
    setCredentials(updated);
    return updated.access;
  }
  let tokenTask = null;
  async function token(force = false) {
    const c = credentials();
    if (!c) throw new Error('Spotify ist noch nicht verbunden.');
    if (!force && c.access && c.until - Date.now() > 60000) return c.access;
    if (!c.refresh) throw new Error('Deine Spotify-Sitzung ist abgelaufen. Bitte erneut verbinden.');
    if (!tokenTask) tokenTask = exchange({grant_type: 'refresh_token', refresh_token: c.refresh, client_id: clientId()})
      .then(x => storeToken(x, c)).catch(e => { error = e.message; notify(); throw e; }).finally(() => { tokenTask = null; });
    return tokenTask;
  }
  // Handle the callback without requiring a backend (PKCE). Capture state before clearing URL.
  async function finishCallback() {
    const q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return;
    const code = q.get('code'), receivedState = q.get('state'), authError = q.get('error');
    q.delete('code'); q.delete('state'); q.delete('error');
    history.replaceState(history.state, '', `${location.pathname}${q.size ? '?' + q.toString() : ''}${location.hash}`);
    const flow = (() => { try { return JSON.parse(sessionStorage.getItem(FLOW_KEY) || 'null'); } catch { return null; } })();
    sessionStorage.removeItem(FLOW_KEY);
    if (authError) { error = `Spotify: ${authError}`; notify(); return; }
    if (!flow || flow.csrf !== receivedState || !flow.verifier || flow.redirect !== redirect() || Date.now() - flow.at > 600000) {
      error = 'Spotify-Anmeldung ungültig oder abgelaufen. Bitte erneut versuchen.'; notify(); return;
    }
    busy = true; notify();
    try {
      const result = await exchange({client_id: clientId(), grant_type: 'authorization_code', code,
        redirect_uri: redirect(), code_verifier: flow.verifier});
      storeToken(result); error = '';
    } catch(e) { error = e.message; }
    finally { busy = false; notify(); }
  }
  async function api(path, {method='GET', body=null} = {}, again = true) {
    const access = await token();
    const url = new URL(`${API}${path}`);
    const response = await fetch(url.href, {method, headers: {Authorization: `Bearer ${access}`,
      ...(body === null ? {} : {'Content-Type': 'application/json'})},
      ...(body === null ? {} : {body: JSON.stringify(body)})});
    if (response.status === 401 && again) { await token(true); return api(path, {method,body}, false); }
    if (!response.ok) {
      let details = {};
      try { details = await response.json(); } catch {}
      const reason = details?.error?.message || details?.error?.reason || details?.reason || '';
      const msg = response.status === 403 ? 'Spotify verweigert diesen Zugriff (Berechtigung oder Development-Mode-Limit).'
        : response.status === 429 ? 'Spotify-Anfragelimit erreicht. Bitte später erneut versuchen.'
        : `Spotify API: HTTP ${response.status}${reason ? ' · ' + reason : ''}`;
      throw new Error(msg);
    }
    if (response.status === 204 || response.status === 202) return {};
    return response.json();
  }
  function configure(id) {
    if (!idOk(id)) throw new Error('Die Client ID besteht aus 32 Zeichen (Buchstaben a–f und Zahlen).');
    localStorage.setItem(CLIENT_KEY, String(id).trim()); error = ''; notify();
  }
  function disconnect() {
    sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(FLOW_KEY);
    deviceId = ''; activeTrack = null; lastPlayback = null;
    try { player?.disconnect(); } catch {}
    player = null; readyTask = null; sdkStatus = ''; error = ''; notify();
  }
  const officialId = link => {
    const val = String(link || '').trim();
    const match = val.match(/^(?:spotify:artist:|https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/)([A-Za-z0-9]{22})(?:[/?#].*)?$/i);
    return match ? match[1] : '';
  };
  async function findArtists(name, alternate = []) {
    const queries = Array.from(new Set([name, ...alternate].filter(Boolean)));
    const all = new Map();
    for (const q of queries) {
      const r = await api(`/search?${new URLSearchParams({q,type:'artist',limit:'10',market:'DE'})}`);
      for (const a of r.artists?.items || []) if(a?.id && a?.name) all.set(a.id, a);
      if (all.size > 15) break;
    }
    return [...all.values()];
  }
  async function artistById(id) { return api(`/artists/${encodeURIComponent(id)}`); }
  function playerScript() {
    if(window.Spotify?.Player) return Promise.resolve();
    return new Promise((resolve,reject) => {
      const prior = window.onSpotifyWebPlaybackSDKReady;
      window.onSpotifyWebPlaybackSDKReady = () => { try { prior?.(); } catch {} resolve(); };
      const old = document.querySelector('script[data-sg-spotify-sdk]');
      if (old) { if(window.Spotify?.Player) resolve(); return; }
      const script = document.createElement('script'); script.dataset.sgSpotifySdk = '1';
      script.src = 'https://sdk.scdn.co/spotify-player.js'; script.async = true;
      script.onerror = () => { script.remove(); reject(new Error('Spotify-Player-SDK konnte nicht geladen werden.')); };
      document.head.appendChild(script);
    });
  }
  async function ensurePlayer() {
    if (deviceId) return deviceId;
    if (readyTask) return readyTask;
    readyTask = (async () => {
      await token(); await playerScript();
      if (!window.Spotify?.Player) throw new Error('Der Spotify-Player wird in diesem Browser nicht unterstützt.');
      player = new window.Spotify.Player({name:'Life RPG · Sound Garden', volume:.55,
        getOAuthToken: async cb => {try{cb(await token());}catch(e){error=e.message;notify();}}});
      player.addListener('ready',({device_id})=>{ deviceId=device_id; sdkStatus='ready'; notify(); });
      player.addListener('not_ready',({device_id})=>{ if(deviceId===device_id) deviceId=''; sdkStatus='device-offline'; notify(); });
      for (const evt of ['initialization_error','authentication_error','account_error','playback_error']) {
        player.addListener(evt, e=>{error=e?.message || `Spotify: ${evt}`;sdkStatus=evt;notify();});
      }
      player.addListener('player_state_changed', s=>{lastPlayback=s;notify();});
      const connected = await player.connect();
      if (!connected) throw new Error('Spotify konnte keinen Browser-Player starten.');
      // The ready event arrives after connect; do not assume a device ID prematurely.
      await new Promise((resolve,reject)=>{
        const started=Date.now();const poll=setInterval(()=>{
          if(deviceId){clearInterval(poll);resolve();}
          else if(Date.now()-started>12000){clearInterval(poll);reject(new Error('Spotify-Gerät nicht bereit. Bitte Player erneut starten.'));}
        },120);
      });
      return deviceId;
    })().catch(e=>{error=e.message; readyTask=null; notify(); throw e;});
    return readyTask;
  }
  async function play(track) {
    if (!track?.spotifyTrackId || !/^[a-zA-Z0-9]{22}$/.test(track.spotifyTrackId)) throw new Error('Für diesen Song fehlt noch die Spotify-Track-ID. Bitte neuen Spotify-Song vorschlagen.');
    // Call from a click handler before the first await to satisfy browser autoplay gesture rules.
    if (player?.activateElement) player.activateElement();
    activeTrack = {id:track.spotifyTrackId, title:track.title, artist:track.artist}; notify();
    const id = await ensurePlayer();
    if (player?.activateElement) player.activateElement();
    await api(`/me/player/play?device_id=${encodeURIComponent(id)}`,{method:'PUT', body:{uris:[`spotify:track:${track.spotifyTrackId}`]}});
    error='';notify();return true;
  }
  async function toggle() {
    if (!player) return;
    await player.togglePlay(); notify();
  }
  function embedUrl(t) { return /^[a-zA-Z0-9]{22}$/.test(t?.spotifyTrackId || '')
    ? `https://open.spotify.com/embed/track/${t.spotifyTrackId}?utm_source=life_rpg` : ''; }
  async function addToPlaylist(playlistUrl, track) {
    const match = String(playlistUrl || '').match(/^https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if(!match || !track?.spotifyTrackId) throw new Error('Playlist-Link oder Spotify-Track-ID fehlt.');
    await api(`/playlists/${match[1]}/items`,{method:'POST',body:{uris:[`spotify:track:${track.spotifyTrackId}`]}});
    return true;
  }
  const bridge = {version:'0.31.4dy', state,clientId,configure,grant,disconnect,token,api,officialId,findArtists,artistById,
    play,toggle,embedUrl,addToPlaylist,ensurePlayer, redirect, ready:finishCallback()};
  window.LifeRPGSpotifyBridge = bridge;
})();
