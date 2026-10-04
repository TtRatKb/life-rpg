/* Life RPG · Sound Garden Library V0.31.4dz12
   Full-page artist progress/checklist built on the existing Sound Garden state.
   No playback-based rewards are introduced here.
*/
(() => {
  'use strict';
  const app = window.LifeRPGApp;
  const sg = window.LifeRPGSoundGarden;
  const Spotify = window.LifeRPGSpotifyBridge;
  if (!app?.getState || !sg) return;

  const $ = id => document.getElementById(id);
  const esc = value => app.escapeHtml?.(String(value ?? '')) ?? String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr = value => esc(value).replace(/`/g, '&#096;');
  let selectedArtistKey = '';
  let busyKey = '';
  let notice = '';

  function data() { return sg.getData?.() || app.getState().soundGarden || {}; }
  function spotifyConnected() { return Boolean(Spotify?.state?.().connected); }
  function artists() { return Array.isArray(data().artists) ? data().artists : []; }
  function guideFor(artist) { return sg.getArtistGuide?.(artist.key) || []; }

  function recordFor(track) {
    const m = data();
    const id = String(track?.spotifyTrackId || '');
    const byId = id ? Object.values(m.tracks || {}).find(row => row?.spotifyTrackId === id) : null;
    if (byId) return byId;
    if (track?.key && m.tracks?.[track.key]) return m.tracks[track.key];
    const hist = (m.history || []).find(row => (id && row?.spotifyTrackId === id) || row?.key === track?.key);
    return hist || null;
  }

  function trackState(track) {
    const m = data();
    const record = recordFor(track);
    const id = track?.spotifyTrackId || '';
    const status = record?.status || '';
    const rated = ['liked','maybe','disliked'].includes(status);
    const known = status === 'known';
    const skipped = status === 'skip';
    // A skip alone is not proof that the song was actually heard. Playback through
    // the in-app Spotify SDK, an explicit heard mark, a rating, or "known" is.
    const heard = Boolean(rated || known || (id && m.listenedSpotify?.[id]));
    const playlist = Boolean(id && m.savedToPlaylist?.[id]);
    return { heard, status, rated, known, skipped, playlist };
  }

  function stateLabel(state) {
    if (state.status === 'liked') return '♡ Gefällt mir';
    if (state.status === 'maybe') return '☆ Vielleicht';
    if (state.status === 'disliked') return '✕ Nicht meins';
    if (state.known) return '✓ Schon bekannt';
    if (state.skipped && state.heard) return '◐ Gehört · später weiter';
    if (state.skipped) return '↻ Übersprungen';
    if (state.heard) return '◐ Gehört';
    return '○ Offen';
  }

  function guideStats(artist) {
    const guide = guideFor(artist);
    const target = Number(sg.guideTarget?.() || 10);
    let explored = 0, rated = 0, liked = 0, playlist = 0, known = 0;
    guide.forEach(track => {
      const state = trackState(track);
      if (state.heard) explored += 1;
      if (state.rated) rated += 1;
      if (state.status === 'liked') liked += 1;
      if (state.playlist) playlist += 1;
      if (state.known) known += 1;
    });
    const remaining = Math.max(0, target - explored);
    return { guide, target, loaded: guide.length, explored, rated, liked, playlist, known, remaining, percent: guide.length ? Math.round((explored / target) * 100) : 0 };
  }

  function artistImage(artist) {
    const src = String(artist?.spotifyImage || '');
    if (!/^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+(?:[?#].*)?$/.test(src)) return '';
    return src;
  }

  function progressBar(percent) {
    return `<div class="sgl-progress" aria-label="${percent}% erkundet"><i style="width:${Math.max(0,Math.min(100,percent))}%"></i></div>`;
  }

  function renderCards() {
    const list = artists();
    if (!list.length) return `<div class="sgl-empty"><span>♫</span><strong>Noch keine Artists im Sound Garden.</strong><p>Füge unten deine ersten Bands oder Artists hinzu. Die gleiche Liste wird auch für die Daily Song Discovery verwendet.</p></div>`;
    return `<div class="sgl-artist-grid">${list.map(artist => {
      const stats = guideStats(artist);
      const linked = Boolean(artist.spotifyArtistId);
      const image = artistImage(artist);
      const complete = stats.loaded >= stats.target && stats.explored >= Math.min(stats.target, stats.loaded);
      return `<article class="sgl-artist-card ${complete ? 'is-complete' : ''}">
        <button class="sgl-artist-open" type="button" data-sgl-action="artist" data-key="${attr(artist.key)}">
          <div class="sgl-artist-visual">${image ? `<img src="${attr(image)}" alt="Spotify Artist-Bild: ${attr(artist.spotifyArtistName || artist.name)}" loading="lazy">` : '<span>♫</span>'}</div>
          <div class="sgl-artist-copy"><small>${linked ? 'SPOTIFY VERKNÜPFT' : 'NOCH NICHT VERKNÜPFT'}</small><h3>${esc(artist.name)}</h3>
            ${stats.loaded ? `${progressBar(stats.percent)}<p><b>${stats.explored}/${stats.target}</b> erkundet · ${stats.remaining} offen · ${stats.rated} bewertet${stats.playlist ? ` · ${stats.playlist} Playlist` : ''}</p>` : `<p>${linked ? `Core-${stats.target}-Liste noch nicht geladen.` : 'Für die Song-Checkliste zuerst Spotify zuordnen.'}</p>`}
          </div><b class="sgl-chevron">›</b>
        </button>
      </article>`;
    }).join('')}</div>`;
  }

  function renderArtistDetail(artist) {
    const stats = guideStats(artist);
    const image = artistImage(artist);
    const linked = Boolean(artist.spotifyArtistId);
    const guide = stats.guide;
    return `<section class="sgl-detail">
      <button class="sgl-back" type="button" data-sgl-action="back">← Alle Artists</button>
      <header class="sgl-detail-head">
        <div class="sgl-detail-image">${image ? `<img src="${attr(image)}" alt="Spotify Artist-Bild: ${attr(artist.spotifyArtistName || artist.name)}">` : '<span>♫</span>'}</div>
        <div><p class="eyebrow">ARTIST PROGRESS</p><h2>${esc(artist.name)}</h2>
          ${linked ? `<p>${esc(artist.spotifyArtistName || artist.name)} · <a href="${attr(artist.spotifyUrl || `https://open.spotify.com/artist/${artist.spotifyArtistId}`)}" target="_blank" rel="noopener noreferrer">Auf Spotify ansehen ↗</a></p>` : '<p>Noch nicht mit einer eindeutigen Spotify-Artist-ID verbunden.</p>'}
          ${guide.length ? `${progressBar(stats.percent)}<div class="sgl-stat-row"><span><b>${stats.explored}</b> erkundet</span><span><b>${stats.rated}</b> bewertet</span><span><b>${stats.liked}</b> gefällt</span><span><b>${stats.playlist}</b> Playlist</span><span><b>${stats.remaining}</b> offen</span></div>` : ''}
        </div>
      </header>
      <div class="sgl-detail-actions">
        ${linked ? `<button class="primary-button" type="button" data-sgl-action="load-guide" data-key="${attr(artist.key)}" ${busyKey===artist.key?'disabled':''}>${busyKey===artist.key?'Lade Spotify-Daten …':guide.length?`Core-${stats.target}-Liste ${stats.loaded<stats.target?'erweitern':'aktualisieren'}`:`Core-${stats.target}-Liste laden`}</button>` : `<button class="primary-button" type="button" data-sgl-action="verify" data-key="${attr(artist.key)}">Mit Spotify verknüpfen</button>`}
        ${guide.length ? `<button class="secondary-button" type="button" data-sgl-action="continue" data-key="${attr(artist.key)}">Nächsten offenen Song entdecken →</button>` : ''}
      </div>
      ${guide.length ? `<div class="sgl-track-list">${guide.map((track,index) => {
        const state = trackState(track);
        return `<article class="sgl-track ${state.heard?'is-heard':''} ${state.status==='liked'?'is-liked':''}">
          <div class="sgl-track-index">${state.playlist?'♡':state.rated||state.known?'✓':state.heard?'◐':String(index+1).padStart(2,'0')}</div>
          <div class="sgl-track-copy"><strong>${esc(track.title)}</strong><small>${esc(track.album || artist.name)}</small><span>${esc(stateLabel(state))}${state.playlist?' · ♡ In deiner Zielplaylist':''}</span></div>
          <div class="sgl-track-actions">${state.heard?'':`<button type="button" class="sgl-heard-button" data-sgl-action="heard" data-key="${attr(artist.key)}" data-track="${attr(track.spotifyTrackId)}">Als gehört markieren</button>`}<button type="button" class="secondary-button" data-sgl-action="daily-track" data-key="${attr(artist.key)}" data-track="${attr(track.spotifyTrackId)}">In Daily öffnen</button><a href="${attr(track.storeUrl || `https://open.spotify.com/track/${track.spotifyTrackId}`)}" target="_blank" rel="noopener noreferrer">Spotify ↗</a></div>
        </article>`;
      }).join('')}</div>` : `<div class="sgl-empty"><span>♪</span><strong>${linked ? 'Core Tracks noch nicht geladen.' : 'Spotify-Zuordnung fehlt.'}</strong><p>${linked ? 'Life RPG baut die Liste aus Spotify-Suchergebnissen und exakt Artist-ID-gefilterten Katalogtiteln.' : 'Die Zuordnung verhindert, dass bei gleichnamigen Artists die falschen Songs in deiner Checkliste landen.'}</p></div>`}
    </section>`;
  }

  function render() {
    const root = $('soundGardenPageV314dz12');
    if (!root) return;
    const m = data();
    const selected = artists().find(a => a.key === selectedArtistKey);
    const target = Number(sg.guideTarget?.() || 10);
    const spotifyState = Spotify?.state?.() || {};
    root.innerHTML = `<div class="sgl-shell">
      <header class="sgl-page-head"><div><p class="eyebrow">SPIELEN & LERNEN · MUSIC DISCOVERY</p><h1>Sound Garden ♫</h1><p>Daily Discovery für neue Songs — plus eine sichtbare Artist-Checkliste, damit du wirklich siehst, was du schon kennengelernt hast.</p></div><button class="primary-button" type="button" data-sgl-action="daily">♫ Daily Song Discovery</button></header>
      ${notice ? `<div class="sgl-notice" role="status">${esc(notice)}</div>` : ''}
      <section class="sgl-toolbar">
        <div><small>ARTIST LIBRARY</small><strong>${artists().length} Artists</strong></div>
        <label><span>Core Songs pro Artist</span><select data-sgl-target>${[10,20,30,50].map(n=>`<option value="${n}" ${target===n?'selected':''}>${n}</option>`).join('')}</select></label>
        <div class="sgl-spotify-state ${spotifyState.connected?'is-connected':''}"><span>${spotifyState.connected?'●':'○'}</span><div><strong>${spotifyState.connected?'Spotify verbunden':'Spotify nicht verbunden'}</strong><small>${spotifyState.connected?'Core Lists können geladen werden.':'Für Artist-Listen und eindeutige IDs Spotify im Daily Sound Garden verbinden.'}</small></div></div>
      </section>
      <section class="sgl-panel">
        ${selected ? renderArtistDetail(selected) : `<div class="sgl-section-head"><div><small>DEINE ARTISTS</small><h2>Artist Progress</h2><p>„Erkundet“ heißt: gehört, bewertet oder bereits als bekannt markiert. Likes und Playlist-Saves bleiben zusätzlich sichtbar.</p></div></div>${renderCards()}`}
      </section>
      ${selected ? '' : `<section class="sgl-panel"><div class="sgl-section-head"><div><small>ARTIST POOL</small><h2>Artists hinzufügen</h2><p>Die Namen landen direkt im bestehenden Sound-Garden-Pool und können danach mit Spotify verknüpft werden.</p></div></div><form class="sgl-add-form" data-sgl-add><textarea name="artists" rows="3" maxlength="12000" placeholder="Kendrick Lamar, HANABIE., Chappell Roan …" required></textarea><button class="primary-button" type="submit">+ Artists hinzufügen</button></form><p class="sgl-footnote">Mehrere Namen mit Komma, Semikolon oder Zeilenumbruch trennen. Die bestehenden einmaligen Artist-Rewards und Dedupe-Regeln bleiben unverändert.</p></section>`}
      <section class="sgl-info"><strong>Wie die Core-Liste entsteht</strong><p>Die aktuelle Spotify Development-Mode-API stellt keine offizielle „Artist Top Tracks“-Abfrage mehr bereit. Life RPG nimmt deshalb die von Spotify gerankten Track-Suchergebnisse, filtert strikt auf deine bestätigte Spotify-Artist-ID und ergänzt bei Bedarf Katalogtitel. Das ist eine stabile persönliche „Core Tracks“-Liste, aber nicht die offizielle Spotify-„This Is …“-Reihenfolge.</p></section>
      <p class="sgl-credit">Spotify-Metadaten, Artist-Bilder und Track-Links führen zurück zu Spotify. Artist-Bilder werden unverändert dargestellt. Life-RPG-Rewards hängen weiterhin ausschließlich an bewussten Discovery-Aktionen — nicht an Streams, Wiedergabedauer oder Wiederholungen.</p>
    </div>`;
    bind(root);
  }

  function openDailyWithTrack(key, trackId) {
    if (!sg.setCurrentFromGuide?.(key, trackId)) {
      notice = 'Der Song konnte nicht in die Daily Discovery übernommen werden.';
      render(); return;
    }
    sg.open?.();
  }

  async function loadGuide(key, refresh=false) {
    if (!spotifyConnected()) {
      notice = 'Bitte zuerst Spotify im Daily Sound Garden verbinden.';
      render(); return;
    }
    busyKey = key; notice = '';
    render();
    try {
      await sg.buildArtistGuide?.(key, refresh);
      notice = `✓ Core-${sg.guideTarget?.() || 10}-Liste aktualisiert.`;
    } catch (error) {
      notice = error?.message || 'Die Artist-Liste konnte gerade nicht geladen werden.';
    } finally {
      busyKey = ''; render();
    }
  }

  function bind(root) {
    root.querySelector('[data-sgl-target]')?.addEventListener('change', event => {
      sg.setGuideTarget?.(event.target.value);
      notice = `Core-Ziel auf ${sg.guideTarget?.() || 10} Songs pro Artist gesetzt.`;
      render();
    });
    root.querySelector('[data-sgl-add]')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const raw = new FormData(form).get('artists');
      sg.addArtists?.(raw);
      form.reset();
      notice = 'Artist-Pool aktualisiert.';
      render();
    });
    root.querySelectorAll('[data-sgl-action]').forEach(button => button.addEventListener('click', async () => {
      const action = button.dataset.sglAction;
      const key = button.dataset.key || '';
      if (action === 'daily') { sg.open?.(); return; }
      if (action === 'artist') { selectedArtistKey = key; notice=''; render(); return; }
      if (action === 'back') { selectedArtistKey=''; notice=''; render(); return; }
      if (action === 'load-guide') { await loadGuide(key, true); return; }
      if (action === 'verify') {
        sg.open?.();
        setTimeout(() => sg.verifyArtist?.(key), 120);
        return;
      }
      if (action === 'daily-track') { openDailyWithTrack(key, button.dataset.track); return; }
      if (action === 'heard') {
        if (sg.markGuideTrackHeard?.(key, button.dataset.track)) { notice = '◐ Als gehört markiert · ohne Reward.'; render(); }
        return;
      }
      if (action === 'continue') {
        let artist = artists().find(a => a.key === key);
        if (!artist) return;
        let guide = guideFor(artist);
        if (!guide.length) { await loadGuide(key, false); artist = artists().find(a => a.key === key); guide = artist ? guideFor(artist) : []; }
        const next = guide.find(track => !trackState(track).heard);
        if (!next) { notice = '✓ Alle Songs dieser Core-Liste sind bereits erkundet.'; render(); return; }
        openDailyWithTrack(key, next.spotifyTrackId);
      }
    }));
  }

  function init() {
    const root = $('soundGardenPageV314dz12');
    if (!root) return;
    render();
    window.addEventListener('life-rpg:view-changed', event => { if (event?.detail?.view === 'soundgarden') render(); });
    window.addEventListener('life-rpg:state-saved', render);
    window.addEventListener('life-rpg:spotify-change', render);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  window.LifeRPGSoundGardenLibrary = { version:'0.31.4dz12', render, openArtist:key=>{selectedArtistKey=key;app.showView?.('soundgarden');render();} };
})();
