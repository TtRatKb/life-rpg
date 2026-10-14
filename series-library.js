/* Native Series / Anime & TV shelf. Canonical logs, never estimated time entries. */
(() => {
  'use strict';
  const app = window.LifeRPGApp;
  if (!app) return;
  const statuses = {want:'Want to Watch', watching:'Watching', paused:'Paused', completed:'Completed', dropped:'Dropped'};
  const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
  const escape = value => app.escapeHtml(String(value ?? ''));
  const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const safeURL = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  let selected = null, searchResults = [], catalogSelection = null, catalogTargetItemId = null, searchGeneration = 0;
  let pendingRequest = false, transactionDepth = 0;
  const cache = new Map();
  function model() {
    const root = app.getState();
    if (root.seriesLibrary == null) root.seriesLibrary = {schemaVersion:1, items:[], logs:[], plans:[]};
    const m = root.seriesLibrary;
    if (m.schemaVersion !== 1 || !Array.isArray(m.items) || !Array.isArray(m.logs) || !Array.isArray(m.plans)) {
      throw new Error('This Series Library format cannot be edited safely. Export your save before continuing.');
    }
    return m;
  }
  const find = id => model().items.find(item => item.id === id) || null;
  const activeCycle = item => item.watchCycles.find(cycle => cycle.id === item.activeCycleId);
  const logsFor = (item, cycleId = item.activeCycleId) => model().logs.filter(log => log.seriesId === item.id && log.watchCycleId === cycleId && !log.undone);
  const seen = (item, episode, cycleId = item.activeCycleId) => logsFor(item, cycleId).some(log => log.episodeId === episode.id);
  const regular = item => item.seasons.filter(s => !s.special).flatMap(s => s.episodes.filter(e => !e.special));
  const nextEpisode = item => regular(item).find(e => !seen(item, e)) || null;
  const seasonFor = (item, episode) => item.seasons.find(s => s.episodes.some(e => e.id === episode.id));
  const label = (item, episode) => `S${seasonFor(item, episode)?.number ?? '?'}E${episode.number ?? '?'}`;
  function seasonComplete(item, season, cycleId = item.activeCycleId) {
    const episodes = season.episodes.filter(e => !e.special);
    return !season.special && season.ended === true && positive(season.episodeCount) === episodes.length && episodes.length > 0 && episodes.every(e => seen(item,e,cycleId));
  }
  function complete(item, cycleId = item.activeCycleId) {
    const seasons = item.seasons.filter(s => !s.special);
    return item.ended === true && seasons.length > 0 && seasons.every(s => seasonComplete(item,s,cycleId));
  }
  function notify(message) {
    const node = document.getElementById('seriesNotice');
    if (node) node.textContent = message;
    app.showToast?.(message);
  }
  function transaction(action) {
    if (transactionDepth) return action();
    const root = app.getState(), before = JSON.parse(JSON.stringify(root));
    try {
      transactionDepth++;
      const result = action();
      transactionDepth--;
      if (app.saveState({source:'series-library',recoverOnFailure:false}) === false) throw new Error('Series changes were not saved. Your previous progress is intact. Keep your input and try again.');
      app.refreshResources?.();
      window.dispatchEvent(new CustomEvent('life-rpg:series-change'));
      render();
      return result;
    } catch (error) {
      transactionDepth = 0;
      Object.keys(root).forEach(key => delete root[key]);
      Object.assign(root,before);
      app.refreshResources?.();
      notify(error.message || 'Series changes could not be saved.');
      return {ok:false, reason:error.message};
    }
  }
  function makeSeason(spec = {}) {
    const number = Math.max(0, Math.floor(Number(spec.number ?? 1)));
    const count = positive(spec.episodeCount);
    if(count && (!Number.isInteger(count) || count>1000))throw new Error('Use an episode total from 1 to 1000, or leave it unknown.');
    const episodes = Array.isArray(spec.episodes) ? spec.episodes : count ? Array.from({length:Math.min(1000,Math.floor(count))},(_,i)=>({number:i+1})) : [];
    return {id:uid('season'), number, special:Boolean(spec.special), ended:spec.ended === true,
      episodeCount:count ? Math.floor(count) : null, episodes:episodes.map(e => ({id:uid('episode'), number:positive(e.number),
        minutes:positive(e.minutes ?? spec.minutes), special:Boolean(e.special), providerId:e.providerId ?? null}))};
  }
  function addItem(spec) {
    return transaction(() => {
      if (spec.provider && model().items.some(i=>i.provider?.name===spec.provider.name && i.provider?.id===spec.provider.id)) throw new Error('This catalog title is already on your shelf. Open it for a separate rewatch.');
      if (!String(spec.title || '').trim()) throw new Error('Please enter a title.');
      const cycle = {id:uid('watch'), kind:'first', startedAt:new Date().toISOString()};
      const item = {id:uid('series'), title:String(spec.title).trim(), aliases:String(spec.aliases || ''), year:positive(spec.year),
        cover:safeURL(spec.cover), status:statuses[spec.status] ? spec.status : 'watching', comfort:Boolean(spec.comfort),
        recovery:Boolean(spec.recovery), motivation:spec.motivation || 'medium', priority:spec.priority || 'optional', ended:spec.ended === true,
        provider:spec.provider || null, seasons:(spec.seasons || []).map(makeSeason), links:[],
        watchCycles:[cycle], activeCycleId:cycle.id, milestones:{}, review:{rating:null, notes:''}};
      if (item.status === 'completed') item.status = 'paused'; // status cannot manufacture an unwatched completion
      // Adding and caring for the shelf is itself a small, real hobby action.
      // Keep this separate from episode rewards so importing metadata can never
      // pay for imagined viewing time.
      const reward = app.awardActivity({source:'series-library-add',sourceId:item.id,
        label:`Added to Series Library · ${item.title}`,realm:item.recovery?'Recovery':'Hobbies',capability:'wellbeing',
        xp:5,realmXP:5,statXP:3,coins:5,storyEnergyBase:0,progressionRelevant:false,
        skipAddOnRewards:true,metadata:{kind:'library-maintenance',seriesId:item.id}});
      item.milestones.library = {rewardEventId:reward.eventId, reward:{...reward,realm:item.recovery?'Recovery':'Hobbies',capability:'wellbeing'},at:new Date().toISOString(),revoked:false};
      model().items.push(item); return {ok:true,item};
    });
  }
  function updateItem(id, changes) {
    return transaction(() => {
      const item = find(id); if (!item) throw new Error('Series unavailable.');
      ['title','aliases','year','comfort','recovery','motivation','priority','ended'].forEach(key => {if (key in changes) item[key]=changes[key];});
      if (!String(item.title).trim()) throw new Error('A title is required.');
      if ('cover' in changes) item.cover=safeURL(changes.cover);
      if ('status' in changes && statuses[changes.status]) {
        if (changes.status === 'completed' && !complete(item)) throw new Error('Completion needs a known series end and every regular episode.');
        item.status=changes.status;
      }
      return {ok:true,item};
    });
  }
  function addSeason(id, spec) {return transaction(() => {const item=find(id);if(!item)throw new Error('Series unavailable.');const season=makeSeason(spec);item.seasons.push(season);return {ok:true,season};});}
  function updateSeason(id, seasonId, spec) {
    return transaction(() => {
      const item=find(id),season=item?.seasons.find(s=>s.id===seasonId);if(!season)throw new Error('Season unavailable.');
      const count=positive(spec.episodeCount);
      if(count && (!Number.isInteger(count)||count>1000))throw new Error('Use an episode total from 1 to 1000, or leave it unknown.');
      if (count && count < season.episodes.filter(e=>!e.special).length) throw new Error('Existing episodes and their history are preserved. Correct their numbering individually.');
      if ('number' in spec) season.number=Math.max(0,Math.floor(Number(spec.number)||0));
      if ('ended' in spec) season.ended=spec.ended===true;
      if ('episodeCount' in spec) season.episodeCount=count?Math.floor(count):null;
      if (count) for(let n=1;n<=Math.min(1000,count);n++) if(!season.episodes.some(e=>e.number===n&&!e.special)) season.episodes.push({id:uid('episode'),number:n,minutes:positive(spec.minutes),special:false,providerId:null});
      if ('minutes' in spec) season.episodes.forEach(e=>{e.minutes=positive(spec.minutes);});
      if (!complete(item) && item.status==='completed') item.status='watching';
      return {ok:true,season};
    });
  }
  function addEpisode(id, seasonId, spec={}) {return transaction(()=>{const item=find(id),season=item?.seasons.find(s=>s.id===seasonId);if(!season)throw new Error('Season unavailable.');const episode={id:uid('episode'),number:positive(spec.number)||season.episodes.length+1,minutes:positive(spec.minutes),special:Boolean(spec.special),providerId:null};season.episodes.push(episode);return {ok:true,episode};});}
  function updateEpisode(id,episodeId,spec) {return transaction(()=>{const item=find(id),episode=item?.seasons.flatMap(s=>s.episodes).find(e=>e.id===episodeId);if(!episode)throw new Error('Episode unavailable.');if('number' in spec)episode.number=positive(spec.number);if('minutes' in spec)episode.minutes=positive(spec.minutes);return {ok:true,episode};});}
  function milestone(item,key,at) {
    const receipt=item.milestones[key];
    if((receipt && !receipt.revoked) || activeCycle(item).kind!=='first')return;
    const reward=app.awardActivity({source:'series-milestone',sourceId:`${item.id}:${key}`,label:`Series milestone · ${item.title}`,realm:item.recovery?'Recovery':'Hobbies',capability:'wellbeing',
      xp:10,realmXP:10,statXP:0,coins:key==='series'?50:0,storyEnergyBase:0,progressionRelevant:false,skipAddOnRewards:true,at});
    item.milestones[key]={rewardEventId:reward.eventId, reward:{...reward,realm:item.recovery?'Recovery':'Hobbies',capability:'wellbeing'}, at, revoked:false};
  }
  function logEpisode(id,episodeId,options={}) {
    return transaction(() => {
      const item=find(id),season=item?.seasons.find(s=>s.episodes.some(e=>e.id===episodeId)),episode=season?.episodes.find(e=>e.id===episodeId);
      if(!episode)throw new Error('Episode unavailable.');
      if(item.archivedAt)throw new Error('Restore this archived title before logging an episode.');
      const existing=model().logs.find(log=>log.seriesId===id && log.episodeId===episodeId && log.watchCycleId===item.activeCycleId);
      if(existing && !existing.undone)return {ok:true,duplicate:true,log:existing};
      const at=options.at?new Date(options.at):new Date();
      if(!Number.isFinite(+at) || +at>Date.now()+60000)throw new Error('Choose a valid completed-at date in the past.');
      const start=options.startAt?new Date(options.startAt):null,end=options.endAt?new Date(options.endAt):null;
      if(Boolean(start)!==Boolean(end) || (start&&(!Number.isFinite(+start)||!Number.isFinite(+end)||+end<=+start||+end>Date.now()+60000)))throw new Error('Enter both real start and end times, with end after start and in the past.');
      const minutes=start?(end-start)/60000:positive(options.minutes);
      const log=existing || {id:uid('watch-log'),recordedAt:new Date().toISOString(),seriesId:id,seasonId:season.id,episodeId,watchCycleId:item.activeCycleId};
      Object.assign(log,{at:at.toISOString(),date:dateKey(at),startAt:start?.toISOString()||null,endAt:end?.toISOString()||null,minutes,undone:false,
        historical:existing?existing.historical:options.historical===true,realm:existing?existing.realm:(item.recovery?'Recovery':'Hobbies')});
      // Persistent receipt survives ledger retention, provider edits and restore. Undo/redo restores the original payout only.
      if(!log.historical && (!existing || log.rewardRevoked)) {
        const reward=app.awardActivity({source:'series',sourceId:log.id,label:`${item.title} · ${label(item,episode)}`,realm:log.realm,capability:'wellbeing',
          xp:existing?log.reward.xp:15,realmXP:existing?log.reward.realmXP:15,statXP:existing?log.reward.statXP:10,
          coins:0,storyEnergyBase:0,dedupeFamily:'watching',skipAddOnRewards:true,at:log.at,
          metadata:{seriesId:id,seasonId:season.id,episodeId,watchCycleId:log.watchCycleId,minutes,kind:'episode'}});
        log.rewardEventId=reward.eventId;log.reward=reward;log.deduped=reward.deduped;log.rewardRevoked=false;
      }
      if(!existing)model().logs.push(log);
      item.status='watching';
      if(complete(item)){item.status='completed';activeCycle(item).completedAt=log.at;}
      // Historical sessions may complete a shelf, but never backfill any milestone.
      if(!log.historical) {
        // Imported history never earns past rewards, but newly watched episodes
        // still deserve their own season milestone. A live series finish is paid once.
        if(seasonComplete(item,season) && !logsFor(item).some(l=>l.seasonId===season.id && l.historical)) milestone(item,`season:${season.id}`,log.at);
        if(complete(item)) milestone(item,'series',log.at);
      }
      return {ok:true,log};
    });
  }
  function logEpisodes(id, episodeIds, options={}) {
    return transaction(()=>{
      if(!Array.isArray(episodeIds)||!episodeIds.length||episodeIds.length>100)throw new Error('Select 1 to 100 episodes actually watched.');
      if(episodeIds.length>1&&(options.startAt||options.endAt))throw new Error('Use real intervals for one episode at a time.');
      const logs=episodeIds.map(episodeId=>logEpisode(id,episodeId,options).log);return {ok:true,logs};
    });
  }
  function markSeasonHistorical(id, seasonId) {
    return transaction(()=>{
      const item=find(id),season=item?.seasons.find(s=>s.id===seasonId);
      if(!season || item.archivedAt)throw new Error('Restore the title and select a saved season.');
      const remaining=season.episodes.filter(e=>!e.special && !seen(item,e));
      if(!remaining.length)return {ok:true,duplicate:true,logs:[]};
      if(remaining.length>1000)throw new Error('Too many episodes to import at once.');
      // Imported history has no invented viewing date, duration, or reward.
      // recordedAt/at marks the import action; My Week must filter historical entries.
      const at=new Date().toISOString(),logs=[];
      for(let offset=0;offset<remaining.length;offset+=100) {
        const batch=logEpisodes(id,remaining.slice(offset,offset+100).map(e=>e.id),{historical:true,at});
        logs.push(...batch.logs);
      }
      return {ok:true,logs};
    });
  }

  function mergeCatalog(id, snapshot) {
    return transaction(()=>{
      const item=find(id);
      if(!item || item.archivedAt)throw new Error('Restore this title before updating its catalog.');
      if(!snapshot?.provider || !Array.isArray(snapshot.seasons))throw new Error('Choose a catalog result with season details.');
      if(item.provider && (item.provider.name!==snapshot.provider.name || String(item.provider.id)!==String(snapshot.provider.id))) {
        throw new Error('This title is linked to another catalog entry. No data was changed.');
      }
      if(model().items.some(other=>other.id!==item.id && other.provider?.name===snapshot.provider.name && String(other.provider?.id)===String(snapshot.provider.id))) {
        throw new Error('This catalog result is already linked to another saved title.');
      }
      for(const incoming of snapshot.seasons){
        let season=item.seasons.find(existing=>existing.number===incoming.number && existing.special===Boolean(incoming.special));
        if(!season){item.seasons.push(makeSeason(incoming));continue;}
        const known=positive(incoming.episodeCount),old=positive(season.episodeCount);
        for(const ep of incoming.episodes||[]) {
          let existing=season.episodes.find(e=>ep.providerId!=null && String(e.providerId)===String(ep.providerId));
          if(!existing && positive(ep.number))existing=season.episodes.find(e=>e.special===Boolean(ep.special) && e.number===positive(ep.number));
          if(existing){if(existing.providerId==null)existing.providerId=ep.providerId??null;if(!existing.minutes)existing.minutes=positive(ep.minutes);}
          else season.episodes.push({id:uid('episode'),number:positive(ep.number),minutes:positive(ep.minutes),
            special:Boolean(ep.special),providerId:ep.providerId??null});
        }
        const storedCount=season.episodes.filter(e=>!e.special).length;
        if(known || old) season.episodeCount=Math.max(old||0,known||0,storedCount);
        // Preserve the user's own known ending when the provider is incomplete.
        season.ended=season.ended || incoming.ended===true;
      }
      item.provider=snapshot.provider;
      if(!item.cover && safeURL(snapshot.cover))item.cover=safeURL(snapshot.cover);
      if(!item.year && positive(snapshot.year))item.year=positive(snapshot.year);
      if(snapshot.ended===true)item.ended=true;
      if(item.status==='completed' && !complete(item))item.status='watching';
      return {ok:true,item};
    });
  }

  function revokeReceipt(receipt, realm, capability='wellbeing') {
    const root=app.getState();
    if(!root.rewardLedger.events.some(e=>e.id===receipt.rewardEventId)) {
      if(!receipt.reward)throw new Error('This reward receipt cannot be safely undone. No history was changed.');
      // The module owns this immutable payout receipt. Rehydrate only its own evicted
      // ledger row so the existing inverse operation retains all currency semantics.
      root.rewardLedger.events.push({id:receipt.rewardEventId,...receipt.reward,realm:receipt.reward.realm||realm,capability:receipt.reward.capability||capability});
    }
    if(!app.revokeActivityReward(receipt.rewardEventId))throw new Error('The reward could not be safely undone.');
  }
  function undo(id) {
    return transaction(()=>{
      const log=model().logs.find(l=>l.id===id);if(!log||log.undone)return {ok:true};
      if(log.rewardEventId)revokeReceipt(log,log.realm);
      log.undone=true;log.rewardRevoked=Boolean(log.rewardEventId);
      const item=find(log.seriesId);if(item){const cycle=item.watchCycles.find(c=>c.id===log.watchCycleId);if(cycle)delete cycle.completedAt;if(item.activeCycleId===log.watchCycleId)item.status='watching';
        if(item.watchCycles.find(c=>c.id===log.watchCycleId)?.kind==='first') {
          for(const [key,receipt] of Object.entries(item.milestones)) {
            const season=item.seasons.find(s=>key===`season:${s.id}`);
            if(!receipt.revoked && (key==='series'?!complete(item,log.watchCycleId):season&&!seasonComplete(item,season,log.watchCycleId))) {
              revokeReceipt(receipt,receipt.reward?.realm);
              receipt.revoked=true;
            }
          }
        }
      }
      return {ok:true};
    });
  }
  function startRewatch(id) {
    return transaction(()=>{const item=find(id);if(!item||item.archivedAt)throw new Error('Restore this title before starting a rewatch.');
      // Repeated activation of an empty rewatch keeps its IDs and any undone receipts.
      if(activeCycle(item).kind==='rewatch' && !logsFor(item).length)return {ok:true,duplicate:true,cycle:activeCycle(item)};
      const cycle={id:uid('watch'),kind:'rewatch',startedAt:new Date().toISOString()};item.watchCycles.push(cycle);item.activeCycleId=cycle.id;item.status='watching';return {ok:true,cycle};});
  }
  function activateCycle(id, cycleId) {
    return transaction(()=>{const item=find(id);if(!item||item.archivedAt||!item.watchCycles.some(c=>c.id===cycleId))throw new Error('Restore the title and choose an existing watch cycle.');
      item.activeCycleId=cycleId;item.status=complete(item)?'completed':'watching';return {ok:true,cycle:activeCycle(item)};});
  }
  function archiveItem(id, archived=true) {
    return transaction(()=>{const item=find(id);if(!item)throw new Error('Series unavailable.');
      item.archivedAt=archived?(item.archivedAt||new Date().toISOString()):null;return {ok:true,item};});
  }
  function saveReview(id,rating,notes) {return transaction(()=>{const item=find(id);if(!item)throw new Error('Series unavailable.');const value=positive(rating);if(value && (value>10||value<1))throw new Error('Use a score from 1 to 10, or leave it blank.');item.review={rating:value,notes:String(notes||''),updatedAt:new Date().toISOString()};return {ok:true};});}
  function linkSequel(id,otherId) {return transaction(()=>{const item=find(id);if(!item||!find(otherId)||id===otherId)throw new Error('Choose another saved title.');if(!item.links.includes(otherId))item.links.push(otherId);return {ok:true};});}
  function planEpisode(id,episodeId,startAt,endAt) {
    return transaction(()=>{const item=find(id),episode=regular(item||{seasons:[]}).find(e=>e.id===episodeId);if(!episode)throw new Error('Choose a regular episode.');
      const start=new Date(startAt),end=new Date(endAt);if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)throw new Error('Choose a valid planned interval.');
      const plan={id:uid('watch-plan'),seriesId:id,episodeId,watchCycleId:item.activeCycleId,startAt:start.toISOString(),endAt:end.toISOString(),createdAt:new Date().toISOString()};model().plans.push(plan);return {ok:true,plan};});
  }
  function removePlan(id){return transaction(()=>{model().plans=model().plans.filter(p=>p.id!==id);return {ok:true};});}
  function eligibleItems(){if(app.getState().seriesLibrary?.schemaVersion!==1)return [];return model().items.filter(item=>!item.archivedAt && ['want','watching'].includes(item.status) && nextEpisode(item) && item.motivation!=='low');}
  function completion(pick){const log=model().logs.find(l=>!l.undone&&!l.historical&&l.seriesId===pick.sourceId&&l.episodeId===pick.seriesEpisodeId&&l.watchCycleId===pick.seriesCycleId&&+new Date(l.at)>=Number(pick.pickedAt||0));return {done:Boolean(log),progress:log?1:0,progressText:log?'Episode watched ✓':'One episode, whenever you feel like it'};}

  // TVmaze used to return results directly. Keep it independent of anime fallbacks:
  // a slow/blocked second provider must never delay or erase a TVmaze result.
  async function catalogFetch(url, key, provider) {
    const cached=cache.get(key);
    if(cached && Date.now()-cached.at<3600000)return cached.data;
    if(navigator.onLine===false)throw new Error('You are offline. Add a series manually or try again when connected.');
    const controller=new AbortController();
    let timeoutId=null;
    let timedOut=false;
    const timeout=new Promise((_,reject)=>{
      timeoutId=setTimeout(()=>{
        timedOut=true;controller.abort();
        reject(new Error(provider+' did not respond within 7 seconds. Try again or add manually.'));
      },7000);
    });
    try {
      // Race the COMPLETE fetch+JSON chain. Receiving headers does not mean
      // the body has finished, particularly on Safari or an unstable network.
      const response=await Promise.race([
        (async()=>{
          const res=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
          if(res.status===429)throw new Error(provider+' is busy (rate limited). Try again shortly.');
          if(!res.ok)throw new Error(provider+' returned HTTP '+res.status+'. Please retry or add manually.');
          return res.json();
        })(),
        timeout
      ]);
      cache.set(key,{at:Date.now(),data:response});
      if(cache.size>30)cache.delete(cache.keys().next().value);
      return response;
    } catch(error){
      if(timedOut)throw new Error(provider+' did not respond within 7 seconds. Try again or add manually.');
      if(error?.name==='AbortError')throw new Error(provider+' request was interrupted. Please retry.');
      if(error instanceof TypeError)throw new Error(provider+' could not be reached from this browser. Please retry or add manually.');
      throw error;
    } finally {
      if(timeoutId!==null)clearTimeout(timeoutId);
    }
  }
  async function request(path) {
    if(pendingRequest)throw new Error('A TVmaze lookup is still running. Please let it finish.');
    pendingRequest=true;
    try{return await catalogFetch('https://api.tvmaze.com'+path,path,'TVmaze');}
    finally{pendingRequest=false;}
  }
  async function requestJikan(path) {
    return catalogFetch('https://api.jikan.moe/v4'+path,'jikan:'+path,'Anime catalog');
  }
  async function searchCatalog(query,{provider='tvmaze'}={}) {
    const clean=String(query||'').trim();
    if(clean.length<2)throw new Error('Enter at least two characters.');
    const encoded=encodeURIComponent(clean);
    if(provider==='jikan'){
      const anime=await requestJikan('/anime?q='+encoded+'&limit=10&sfw=false');
      if(!Array.isArray(anime?.data))throw new Error('Anime catalog returned invalid data. Try again later.');
      return anime.data.filter(s=>s&&s.mal_id&&s.title).map(s=>({
        id:s.mal_id,title:s.title,year:positive(s.year||s.aired?.from?.slice(0,4)),minutes:null,
        cover:safeURL(s.images?.jpg?.image_url),ended:s.status==='Finished Airing',
        url:safeURL(s.url),providerName:'Jikan'
      }));
    }
    // The original fast path: return TVmaze results immediately.
    // The anime-specific source is user-initiated via its own button.
    const rows=await request('/search/shows?q='+encoded);
    if(!Array.isArray(rows))throw new Error('TVmaze returned invalid search data. Try again later.');
    return rows.filter(row=>row?.show?.id!=null&&row.show.name).map(row=>{
      const show=row.show;
      return {id:show.id,title:show.name,year:positive(show.premiered?.slice(0,4)),
        minutes:positive(show.averageRuntime||show.runtime),
        cover:safeURL(show.image?.medium||show.image?.original),
        ended:show.status==='Ended',url:safeURL(show.url),providerName:'TVmaze'};
    });
  }
  async function catalogDetails(result) {
    if(result.providerName==='Jikan') {
      const detail=(await requestJikan(`/anime/${Number(result.id)}/full`)).data||{};
      const count=positive(detail.episodes);
      return {...result,title:detail.title||result.title,year:result.year||result.aired?.from?.slice(0,4),cover:safeURL(detail.images?.jpg?.large_image_url||result.cover),seasons:[{number:1,episodeCount:count,ended:detail.status==='Finished Airing',minutes:null,episodes:count?Array.from({length:Math.min(count,1000)},(_,i)=>({number:i+1,minutes:null,special:false,providerId:`${result.id}-${i+1}`})):[]}],provider:{name:'Jikan',id:result.id,url:result.url,license:'Jikan / MyAnimeList metadata',snapshotAt:new Date().toISOString(),snapshot:{title:result.title,year:result.year}}};
    }
    // Two standard TVmaze endpoints, in parallel: preserves the original
    // known-good response formats and avoids two sequential waits.
    const id=Number(result.id);
    const seasonPath=`/shows/${id}/seasons`;
    const episodePath=`/shows/${id}/episodes?specials=1`;
    const [seasons,episodes]=await Promise.all([
      catalogFetch('https://api.tvmaze.com'+seasonPath,seasonPath,'TVmaze'),
      catalogFetch('https://api.tvmaze.com'+episodePath,episodePath,'TVmaze')
    ]);
    if(!Array.isArray(seasons)||!Array.isArray(episodes))throw new Error('TVmaze did not return a valid season and episode list. Retry or add manually.');
    return {...result,seasons:seasons.map(s=>({number:s.number,episodeCount:positive(s.episodeOrder) || ((result.ended || Boolean(s.endDate&&s.endDate<=dateKey(new Date()))) ? positive(episodes.filter(e=>e.season===s.number&&positive(e.number)).length) : null),
      ended:result.ended || Boolean(s.endDate&&s.endDate<=dateKey(new Date())),minutes:result.minutes,
      episodes:episodes.filter(e=>e.season===s.number).map(e=>({number:e.number,minutes:positive(e.runtime)||result.minutes,special:!positive(e.number),providerId:e.id}))})),
      provider:{name:'TVmaze',id:result.id,url:result.url,license:'CC BY-SA',snapshotAt:new Date().toISOString(),snapshot:{title:result.title,year:result.year}}};
  }

  function open(id,episodeId=null,options={}){selected=id;const item=find(id);if(!item)return;if(options.startWatching && item.status==='want' && !item.archivedAt){const result=updateItem(id,{status:'watching'});if(!result.ok)return;}app.showView?.('series');render();const dialog=document.getElementById('seriesDetail');dialog.dataset.episodeId=episodeId||nextEpisode(item)?.id||'';detail();if(!dialog.open)dialog.showModal();}
  function options(values,current){return Object.entries(values).map(([id,title])=>`<option value="${escape(id)}" ${id===current?'selected':''}>${escape(title)}</option>`).join('');}
  function cover(item){return item.cover?`<img src="${escape(item.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-series-cover>`:'<span class="series-placeholder" aria-hidden="true">📺</span>';}
  function attribution(item){return item.provider?.name==='TVmaze'?`<p class="muted">Metadata: <a href="${escape(safeURL(item.provider.url)||'https://www.tvmaze.com')}" target="_blank" rel="noopener noreferrer">TVmaze</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a> · editable snapshot</p>`:'';}
  function render(){
    const host=document.getElementById('seriesBoard');if(!host)return;
    try {const query=document.getElementById('seriesFilter').value.toLowerCase(),status=document.getElementById('seriesStatusFilter').value;
      host.innerHTML=model().items.filter(i=>(!i.archivedAt||document.getElementById('seriesShowArchived').checked)&&(!status||i.status===status)&&`${i.title} ${i.aliases}`.toLowerCase().includes(query)).map(item=>{const episode=nextEpisode(item),total=regular(item).length,count=logsFor(item).filter(l=>regular(item).some(e=>e.id===l.episodeId)).length;
        return `<article class="series-card">${cover(item)}<div><small>${item.archivedAt?'Archived · ':''}${escape(statuses[item.status])}${item.comfort?' · Comfort':''}${activeCycle(item).kind==='rewatch'?' · Rewatch':''}</small><h3>${escape(item.title)}</h3><p>${item.year||'Year unknown'} · ${count}/${item.ended?total:'unknown'} regular episodes</p><progress value="${count}" max="${Math.max(1,total)}" aria-label="Known episode progress"></progress><p>${episode?`Continue with ${escape(label(item,episode))}`:'No next known episode'}</p><button type="button" class="secondary-button" data-series-open="${escape(item.id)}">Open series</button></div></article>`;
      }).join('')||'<div class="series-empty"><span class="series-empty-mark" aria-hidden="true">📺</span><div class="series-empty-copy"><h3>Your next favorite is waiting.</h3><p>Start with one title. You can look it up automatically or add it by hand — no watchlist homework required.</p></div><button type="button" class="secondary-button" data-series-add>＋ Add a series</button></div>';

    }catch(error){notify(error.message);}
  }
  function detail(){
    const item=find(selected),host=document.getElementById('seriesDetailBody');if(!item||!host)return;
    const episode=item.seasons.flatMap(s=>s.episodes).find(e=>e.id===document.getElementById('seriesDetail').dataset.episodeId)||nextEpisode(item);
    host.innerHTML=`<div class="series-detail-header">${cover(item)}<div><h2>${escape(item.title)}</h2>${attribution(item)}<p>${item.ended?'Known series end':'Ongoing / ending unknown'} · ${item.watchCycles.length} watch cycle(s)</p></div></div><button type="button" class="secondary-button" data-series-enrich>↻ Find seasons & poster</button> <button type="button" class="primary-button" data-series-log-next ${!nextEpisode(item)||item.archivedAt?'disabled':''}>✓ Log next episode${nextEpisode(item)?` · ${escape(label(item,nextEpisode(item)))}`:''}</button><p>Catalog updates add missing metadata without replacing watched episodes, rewards or manually entered details. Quick log uses the current time only.</p><button class="secondary-button" type="button" ${item.archivedAt?'data-series-restore':'data-series-archive'}>${item.archivedAt?'Restore title':'Archive title · keep all history'}</button><p>Archive hides this title from suggestions. Logs, reviews and rewards stay intact.</p>
      <form id="seriesEditForm" class="series-form"><label>Title<input name="title" value="${escape(item.title)}" required></label><label>Original / English / romanized titles<input name="aliases" value="${escape(item.aliases)}"></label><label>Year<input name="year" type="number" min="1900" max="2200" value="${item.year||''}"></label><label>Cover URL<input name="cover" type="url" value="${escape(item.cover)}"></label><label>Status<select name="status">${options(statuses,item.status)}</select></label><label>Motivation<select name="motivation">${options({low:'Not feeling it',medium:'Maybe',high:'Looking forward to it'},item.motivation)}</select></label><label>Priority<select name="priority">${options({optional:'Optional',favorite:'Favorite'},item.priority)}</select></label><label><input name="ended" type="checkbox" ${item.ended?'checked':''}> Series ending and all seasons are known</label><label><input name="comfort" type="checkbox" ${item.comfort?'checked':''}> Comfort favorite</label><label><input name="recovery" type="checkbox" ${item.recovery?'checked':''}> Intentional recovery (one reward route)</label><button class="secondary-button">Save details</button></form>
      <h3>Seasons & episodes</h3>${item.seasons.map(s=>`<section class="series-season"><h4>${s.special?'Specials (optional)':`Season ${s.number}`} · ${s.episodeCount??'unknown'} episodes · ${s.ended?'ended':'ending unknown'}</h4>
        <form data-series-season-edit="${escape(s.id)}" class="series-form"><label>Number<input name="number" type="number" min="0" value="${s.number}"></label><label>Regular episode total (blank = unknown)<input name="episodeCount" type="number" min="1" max="1000" value="${s.episodeCount||''}"></label><label>Typical minutes (blank = unknown)<input name="minutes" type="number" min="1" value="${s.episodes.find(e=>e.minutes)?.minutes||''}"></label><label><input name="ended" type="checkbox" ${s.ended?'checked':''}> Season has ended</label><button class="secondary-button">Save season</button></form>
        <p class="series-history-hint">Seen this season before? Import its episodes as previous history, with no retroactive XP or time entry.</p><button type="button" class="secondary-button" data-series-historical-season="${escape(s.id)}" ${item.archivedAt||s.special||!s.episodes.some(e=>!e.special&&!seen(item,e))?'disabled':''}>✓ Mark this season previously watched · no XP</button><div class="series-episodes">${s.episodes.map(e=>{const log=logsFor(item).find(l=>l.episodeId===e.id);return `<button type="button" class="secondary-button ${log?'is-seen':''}" ${log?`data-series-undo="${escape(log.id)}"`:`data-series-episode="${escape(e.id)}"`} aria-label="${escape(log?'Undo':'Select')} ${escape(label(item,e))}">${log?'✓ ':''}${e.special?'Special':escape(label(item,e))} · ${e.minutes?`${e.minutes} min`:'duration unknown'}</button>`;}).join('')}</div><button class="secondary-button" type="button" data-series-add-episode="${escape(s.id)}">＋ Another episode (unknown total stays unknown)</button></section>`).join('')}
      <form id="seriesSeasonForm" class="series-form"><h4>Add a season / part manually</h4><label>Season number<input name="number" type="number" min="0" value="${item.seasons.length+1}"></label><label>Regular episode total (optional)<input name="episodeCount" type="number" min="1" max="1000"></label><label>Typical minutes (optional)<input name="minutes" type="number" min="1"></label><label><input name="ended" type="checkbox"> Season ended</label><label><input name="special" type="checkbox"> Specials only (optional)</label><button class="secondary-button">Add season</button></form>
      <form id="seriesLogForm" class="series-form"><h3>Log episodes you actually watched</h3><label>Episode<select name="episodeId">${item.seasons.flatMap(s=>s.episodes).filter(e=>!seen(item,e)).map(e=>`<option value="${escape(e.id)}" ${e.id===episode?.id?'selected':''}>${escape(label(item,e))}${e.special?' · Special':''}</option>`).join('')}</select></label><label>Consecutive regular episodes actually watched<input name="count" type="number" min="1" max="100" value="1"></label><label>Completed at<input name="at" type="datetime-local" required value="${localInput(new Date())}"></label><label>Actual minutes per episode (optional)<input name="minutes" type="number" min="1" step="0.1"></label><label>Real start (one episode only)<input name="startAt" type="datetime-local"></label><label>Real end (one episode only)<input name="endAt" type="datetime-local"></label><label><input name="historical" type="checkbox"> Older watch history · no rewards</label><p>Blank duration stays unknown. Catalog estimates never become time logs.</p><button class="primary-button" ${episode?'':'disabled'}>Confirm watched</button></form>
      <form id="seriesEpisodeEditForm" class="series-form"><h3>Correct one episode · history IDs stay intact</h3><label>Episode<select name="episodeId">${item.seasons.flatMap(s=>s.episodes).map(e=>`<option value="${escape(e.id)}">${escape(label(item,e))}</option>`).join('')}</select></label><label>Corrected number<input name="number" type="number" min="1" required></label><label>Typical minutes (optional)<input name="minutes" type="number" min="1"></label><button class="secondary-button">Save episode</button></form>
      <button class="secondary-button" type="button" data-series-rewatch ${item.archivedAt?'disabled':''}>Start a separate rewatch</button><p>The previous cycle can stay unfinished. Every confirmed watch keeps its own history.</p><form id="seriesCycleForm" class="series-form"><label>Return to a saved watch cycle<select name="cycleId">${item.watchCycles.map((c,i)=>`<option value="${escape(c.id)}" ${c.id===item.activeCycleId?'selected':''}>${i+1} · ${c.kind==='first'?'First watch':'Rewatch'} · ${escape(c.startedAt.slice(0,10))}${complete(item,c.id)?' · completed':' · unfinished'}</option>`).join('')}</select></label><button class="secondary-button" ${item.archivedAt?'disabled':''}>Use this cycle · no rewards</button></form>
      <form id="seriesReviewForm" class="series-form"><h3>Personal review · optional</h3><label>Score 1–10<input name="rating" type="number" min="1" max="10" step="0.5" value="${item.review.rating||''}"></label><label>Notes<textarea name="notes">${escape(item.review.notes)}</textarea></label><button class="secondary-button">Save review</button><button class="secondary-button" type="button" data-series-clear-review>Clear review</button></form>
      <form id="seriesLinkForm" class="series-form"><label>Link a separate sequel / part (never merged)<select name="otherId">${model().items.filter(i=>i.id!==item.id).map(i=>`<option value="${escape(i.id)}">${escape(i.title)}</option>`).join('')}</select></label><button class="secondary-button">Link title</button></form><p>${item.links.map(id=>escape(find(id)?.title||'Unavailable linked title')).join(' · ')}</p>
      <form id="seriesPlanForm" class="series-form"><h3>Plan the next episode · optional</h3><p>${episode?escape(label(item,episode)):'No next known episode'} · planned times only</p><label>Planned start<input name="startAt" type="datetime-local" required></label><label>Planned end<input name="endAt" type="datetime-local" required></label><button class="secondary-button" ${episode?'':'disabled'}>Add to My Week</button><input name="episodeId" type="hidden" value="${escape(episode?.id||'')}"></form>
      <h3>Watch history</h3>${item.watchCycles.map(c=>`<details><summary>${c.kind==='first'?'First watch':'Rewatch'} · ${escape(c.startedAt.slice(0,10))}${c.completedAt?' · completed':''}</summary>${model().logs.filter(l=>l.seriesId===item.id&&l.watchCycleId===c.id).map(l=>`<p>${l.historical?`Previously watched · imported ${escape((l.recordedAt||l.at).slice(0,10))}`:escape(l.at)} · ${escape(label(item,item.seasons.flatMap(s=>s.episodes).find(e=>e.id===l.episodeId)||{}))} · ${l.undone?'undone':l.historical?'historical':l.startAt?'confirmed interval':'only completed at'}${l.minutes?` · ${l.minutes} actual min`:''}</p>`).join('')}</details>`).join('')}`;
  }
  function localInput(date){return new Date(+date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  function values(form){const data=Object.fromEntries(new FormData(form));for(const box of form.querySelectorAll('input[type="checkbox"]'))data[box.name]=box.checked;return data;}
  function init(){
    const parent=document.getElementById('view-series');if(!parent||document.getElementById('seriesShelf'))return;
    const shelf=document.createElement('section');shelf.id='seriesShelf';shelf.className='series-shelf';
    shelf.innerHTML=`
      <section class="series-hero" aria-labelledby="seriesPageTitle">
        <div class="series-hero-copy">
          <span class="series-kicker">📺 YOUR LIBRARY · HOBBIES</span>
          <h1 id="seriesPageTitle">A little more time for stories.</h1>
          <p class="series-lead">A new anime, a long-awaited season, or a comforting rewatch. Every episode counts as time you chose for yourself.</p>
          <div class="series-steps" aria-label="How it works"><span>✦ Add a favorite</span><span>📺 Track episodes</span><span>🌸 Enjoy milestones</span></div>
        </div>
        <aside class="series-hero-card">
          <span class="series-hero-icon" aria-hidden="true">☕</span>
          <small>YOUR NEXT COZY EPISODE</small>
          <strong>Comfort counts, too.</strong>
          <p>Build your watchlist at your own pace. Rewatches are welcome, and the Daily Plan offers gentle invitations, never obligations.</p>
          <button type="button" class="primary-button" data-series-add>＋ Add a series</button>
        </aside>
      </section>
      <section class="series-panel" aria-labelledby="seriesShelfTitle">
        <div class="series-panel-heading">
          <div><span class="series-panel-eyebrow">YOUR WATCHLIST</span><h2 id="seriesShelfTitle">What sounds good tonight?</h2><p>Find your next episode, or revisit a world you love.</p></div>
          <span class="series-panel-icon" aria-hidden="true">✦</span>
        </div>
        <p id="seriesNotice" role="status" aria-live="polite"></p>
        <div class="series-filters">
          <label>Find a series<input id="seriesFilter" type="search" placeholder="Title or alternate name" autocomplete="off"></label>
          <label>Status<select id="seriesStatusFilter"><option value="">All statuses</option>${options(statuses,'')}</select></label>
          <label><input id="seriesShowArchived" type="checkbox"> Show archived titles</label>
        </div>
        <div id="seriesBoard" class="series-board"></div>
      </section>`;
    parent.prepend(shelf);
    const add=document.createElement('dialog');add.id='seriesAdd';add.className='series-dialog';add.innerHTML=`<button type="button" class="secondary-button series-close" data-series-close>Close</button><h2 id="seriesCatalogTitle">Add a series</h2><form id="seriesSearchForm" class="series-form"><label>Search series by title<input name="query" type="search" minlength="2" required></label><button class="secondary-button" type="submit">Search TVmaze</button><button class="secondary-button" type="submit" data-series-anime-search>Search anime instead</button></form><p id="seriesSearchStatus" role="status" aria-live="polite">TVmaze results appear as soon as they arrive. For anime missing from TVmaze, use Search anime instead. Manual entry works offline.</p><div id="seriesSearchResults" class="series-search-results"></div><section id="seriesCatalogPreview" class="series-catalog-preview" aria-live="polite" hidden></section><form id="seriesUpdateForm" class="series-form" hidden><p>Only missing seasons, episodes and poster details are added. Existing watch logs, IDs, reviews and rewards stay unchanged.</p><button class="primary-button" type="submit" disabled>Import seasons & poster into saved title</button></form><form id="seriesAddForm" class="series-form"><label>Title<input name="title" required></label><label>Alternate / original / romanized names<input name="aliases"></label><label>Year (optional)<input name="year" type="number" min="1900" max="2200"></label><label>Status<select name="status">${options(statuses,'watching')}</select></label><p class="series-import-hint">Choosing a catalog result imports its available seasons and poster. The fields below are optional manual corrections for Season 1.</p><label>Season 1 episode total (optional)<input name="episodeCount" type="number" min="1" max="1000"></label><label>Typical minutes (optional)<input name="minutes" type="number" min="1"></label><label><input name="ended" type="checkbox"> Series and season have ended</label><label><input name="comfort" type="checkbox"> Comfort favorite</label><button class="primary-button">Add to shelf</button></form><p>Catalog snapshots show their provider and retain editable metadata. No account needed.</p>`;
    document.body.append(add);
    const dialog=document.createElement('dialog');dialog.id='seriesDetail';dialog.className='series-dialog';dialog.innerHTML='<button type="button" class="secondary-button series-close" data-series-close>Close</button><p id="seriesDetailNotice" role="status" aria-live="polite"></p><div id="seriesDetailBody"></div>';document.body.append(dialog);
    document.addEventListener('error',e=>{if(e.target.matches?.('[data-series-cover]')){const placeholder=document.createElement('span');placeholder.className='series-placeholder';placeholder.textContent='📺';e.target.replaceWith(placeholder);}},true);
    shelf.addEventListener('input',e=>{if(e.target.id==='seriesFilter'||e.target.id==='seriesStatusFilter'||e.target.id==='seriesShowArchived')render();});
    document.addEventListener('click',click);
    document.addEventListener('submit',submit);
    window.addEventListener('life-rpg:render',render);
    window.addEventListener('life-rpg:state-saved',render);
    render();
  }
  function catalogPreview(snapshot){
    const host=document.getElementById('seriesCatalogPreview');if(!host)return;
    const seasonList=snapshot.seasons.map(season=>{
      const known=positive(season.episodeCount),available=season.episodes?.filter(e=>!e.special).length||0;
      const descriptor=known?`${known} episode${known===1?'':'s'}`:available?`${available} known episodes · total unknown`:'Episode total unknown';
      return `<li><strong>Season ${escape(season.number)}</strong><span>${escape(descriptor)} · ${season.ended?'finished':'ongoing / end unknown'}</span></li>`;
    }).join('');
    host.innerHTML=`<div class="series-catalog-card">
      ${snapshot.cover?`<img src="${escape(safeURL(snapshot.cover))}" alt="Cover of ${escape(snapshot.title)}" loading="lazy" referrerpolicy="no-referrer">`:'<span class="series-catalog-no-cover" aria-hidden="true">📺</span>'}
      <div><small>${escape(snapshot.provider?.name||snapshot.providerName||'Catalog')} · CHECK BEFORE IMPORT</small><h3>${escape(snapshot.title)}</h3>
      <p>${snapshot.year||'Year unknown'} · ${snapshot.minutes?`typically ${snapshot.minutes} min`:'Duration unknown'}</p>
      <ul class="series-catalog-seasons">${seasonList||'<li>Season details unavailable · enter manually</li>'}</ul>
      <p class="series-catalog-footnote">The catalog may be incomplete for ongoing shows. Extras/specials are optional. You can edit missing metadata later.</p></div>
    </div>`;
    host.hidden=false;
  }
  function openCatalog(targetId=null) {
    const item=targetId?find(targetId):null;
    if(targetId&&!item)return;
    if(document.getElementById('seriesDetail').open)document.getElementById('seriesDetail').close();
    catalogTargetItemId=item?.id||null;catalogSelection=null;searchResults=[];searchGeneration++;
    const dialog=document.getElementById('seriesAdd');
    dialog.querySelector('#seriesCatalogTitle').textContent=item?'Update seasons & poster':'Add a series';
    dialog.querySelector('#seriesSearchForm').reset();
    dialog.querySelector('#seriesSearchForm [name="query"]').value=item?.title||'';
    dialog.querySelector('#seriesAddForm').reset();
    dialog.querySelector('#seriesAddForm').hidden=Boolean(item);
    dialog.querySelector('#seriesUpdateForm').hidden=!item;
    dialog.querySelector('#seriesUpdateForm button').disabled=true;
    document.getElementById('seriesSearchResults').replaceChildren();
    document.getElementById('seriesCatalogPreview').hidden=true;
    document.getElementById('seriesSearchStatus').textContent=item?
      'Find the matching catalog title. Nothing changes until you confirm the import.':
      'Find the correct title and see its cover and all known seasons before adding. Manual entry also works.';
    dialog.showModal();
  }
  function showResult(result){if(result?.ok && selected && document.getElementById('seriesDetail').open)detail();if(!result?.ok)document.getElementById('seriesDetailNotice').textContent=result?.reason||'Not saved. Please try again.';else document.getElementById('seriesDetailNotice').textContent='Saved locally. Cloud synchronization uses your existing settings.';}
  async function click(event){
    const b=event.target.closest('button');if(!b)return;
    try {
      if(b.hasAttribute('data-series-add'))openCatalog();
      if(b.hasAttribute('data-series-close'))b.closest('dialog').close();
      if(b.dataset.seriesOpen)open(b.dataset.seriesOpen);
      if(b.hasAttribute('data-series-enrich'))openCatalog(selected);
      if(b.hasAttribute('data-series-log-next')){
        const item=find(selected),next=item&&nextEpisode(item);
        if(next)showResult(logEpisode(item.id,next.id));
      }
      if(b.dataset.seriesHistoricalSeason){
        const item=find(selected),season=item?.seasons.find(s=>s.id===b.dataset.seriesHistoricalSeason);
        if(season && window.confirm(`Mark Season ${season.number} previously watched? No XP or recent watch time will be added.`))
          showResult(markSeasonHistorical(item.id,season.id));
      }
      if(b.dataset.seriesEpisode){document.getElementById('seriesDetail').dataset.episodeId=b.dataset.seriesEpisode;detail();document.getElementById('seriesLogForm').scrollIntoView({block:'nearest'});}
      if(b.dataset.seriesUndo)showResult(undo(b.dataset.seriesUndo));
      if(b.hasAttribute('data-series-archive'))showResult(archiveItem(selected));
      if(b.hasAttribute('data-series-restore'))showResult(archiveItem(selected,false));
      if(b.hasAttribute('data-series-rewatch'))showResult(startRewatch(selected));
      if(b.hasAttribute('data-series-clear-review'))showResult(saveReview(selected,null,''));
      if(b.dataset.seriesAddEpisode)showResult(addEpisode(selected,b.dataset.seriesAddEpisode));
      if(b.dataset.seriesPlanRemove)showResult(removePlan(b.dataset.seriesPlanRemove));
      if(b.dataset.seriesCatalog){const generation=++searchGeneration;const status=document.getElementById('seriesSearchStatus');status.textContent='Loading seasons and episodes…';catalogSelection=null;document.getElementById('seriesCatalogPreview').hidden=true;document.getElementById('seriesUpdateForm button').disabled=true;b.disabled=true;
        try {const snapshot=await catalogDetails(searchResults.find(r=>String(r.id)===b.dataset.seriesCatalog));if(generation!==searchGeneration)return;catalogSelection=snapshot;const form=document.getElementById('seriesAddForm');form.elements.title.value=snapshot.title;form.elements.year.value=snapshot.year||'';form.elements.minutes.value=snapshot.minutes||'';form.elements.episodeCount.value=snapshot.seasons[0]?.episodeCount||'';form.elements.ended.checked=snapshot.ended;catalogPreview(snapshot);document.getElementById('seriesUpdateForm button').disabled=false;status.textContent=catalogTargetItemId?'Snapshot selected. Confirm safe enrichment below.':'Snapshot selected. All known seasons and poster are ready; confirm Add to shelf.';}catch(error){status.textContent=error.message;}finally{b.disabled=false;}}
    }catch(error){notify(error.message);}
  }
  async function submit(event){
    const form=event.target;if(!form.id.startsWith('series')&&!form.dataset.seriesSeasonEdit)return;event.preventDefault();const data=values(form);
    if(form.id==='seriesSearchForm'){const generation=++searchGeneration,status=document.getElementById('seriesSearchStatus');status.textContent=(event.submitter?.hasAttribute('data-series-anime-search')?'Searching anime catalog…':'Searching TVmaze…');catalogSelection=null;searchResults=[];document.getElementById('seriesSearchResults').replaceChildren();document.getElementById('seriesCatalogPreview').hidden=true;document.getElementById('seriesUpdateForm button').disabled=true;
      try{const provider=event.submitter?.hasAttribute('data-series-anime-search')?'jikan':'tvmaze';const results=await searchCatalog(data.query,{provider});if(generation!==searchGeneration)return;searchResults=results;document.getElementById('seriesSearchResults').innerHTML=results.map(r=>`<button type="button" class="secondary-button series-search-result" data-series-catalog="${r.id}">${r.cover?`<img src="${escape(r.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<span aria-hidden="true">📺</span>'}<span><strong>${escape(r.title)}</strong><small>${escape(r.providerName)} · ${r.year||'Year unknown'} · ${r.minutes?`${r.minutes} min`:'Duration unknown'}</small></span></button>`).join('');status.textContent=results.length?'Select the correct '+(provider==='jikan'?'anime':'TVmaze')+' title.':'No matches from '+(provider==='jikan'?'the anime catalog':'TVmaze')+'. You can try the other search or add manually.';}catch(error){if(generation===searchGeneration)status.textContent=(error.message||'Catalog search failed.')+' You can try the other search or add manually.';}return;}
    let result;
    if(form.id==='seriesUpdateForm'){
      if(!catalogTargetItemId||!catalogSelection){showResult({ok:false,reason:'Select catalog seasons first.'});return;}
      const target=catalogTargetItemId;
      result=mergeCatalog(target,catalogSelection);
      if(result.ok){document.getElementById('seriesAdd').close();open(target);}
      else document.getElementById('seriesSearchStatus').textContent=result.reason;
      return;
    }
    if(form.id==='seriesAddForm'){const snapshot=catalogSelection&&catalogSelection.title===data.title?catalogSelection:null;const seasons=snapshot?JSON.parse(JSON.stringify(snapshot.seasons)):null;if(seasons?.length && positive(data.episodeCount)!==seasons[0].episodeCount){seasons[0]={...seasons[0],episodeCount:positive(data.episodeCount),episodes:undefined};}if(seasons?.length && positive(data.minutes)!==snapshot.minutes){seasons[0].minutes=positive(data.minutes);seasons[0].episodes?.forEach(e=>e.minutes=positive(data.minutes));}result=addItem({...snapshot,...data,provider:snapshot?.provider,seasons:seasons||[{number:1,episodeCount:positive(data.episodeCount),minutes:positive(data.minutes),ended:data.ended}]});if(result.ok){document.getElementById('seriesAdd').close();open(result.item.id);}else document.getElementById('seriesSearchStatus').textContent=result.reason;return;}
    if(form.id==='seriesEditForm')result=updateItem(selected,{...data,year:positive(data.year)});
    if(form.id==='seriesSeasonForm')result=addSeason(selected,data);
    if(form.dataset.seriesSeasonEdit)result=updateSeason(selected,form.dataset.seriesSeasonEdit,data);
    if(form.id==='seriesEpisodeEditForm')result=updateEpisode(selected,data.episodeId,data);
    if(form.id==='seriesCycleForm')result=activateCycle(selected,data.cycleId);
    if(form.id==='seriesReviewForm')result=saveReview(selected,data.rating,data.notes);
    if(form.id==='seriesLinkForm')result=linkSequel(selected,data.otherId);
    if(form.id==='seriesPlanForm')result=planEpisode(selected,data.episodeId,data.startAt,data.endAt);
    if(form.id==='seriesLogForm'){
      const count=Math.max(1,Math.min(100,Math.floor(Number(data.count)||1))),item=find(selected),episodes=item.seasons.flatMap(s=>s.episodes),start=episodes.findIndex(e=>e.id===data.episodeId);
      if(count>1&&(data.startAt||data.endAt)){showResult({ok:false,reason:'Use real intervals for one episode at a time.'});return;}
      const batch=episodes.slice(start).filter(e=>!seen(item,e)&&(count===1||!e.special)).slice(0,count);
      // Keep all canonical logs and their rewards in one persistence transaction.
      result=logEpisodes(selected,batch.map(e=>e.id),{...data,at:data.at,startAt:data.startAt||null,endAt:data.endAt||null});
    }
    if(result)showResult(result);
  }
  window.LifeRPGSeries={find,nextEpisode,label,complete,eligibleItems,completion,open,addItem,updateItem,addSeason,updateSeason,addEpisode,updateEpisode,logEpisode,logEpisodes,undo,startRewatch,activateCycle,archiveItem,saveReview,linkSequel,planEpisode,removePlan,searchCatalog,catalogDetails,mergeCatalog,markSeasonHistorical,
    getLogs:()=>model().logs,getPlans:()=>model().plans};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
