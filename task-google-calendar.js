/* Life RPG · optional Google Calendar READ ONLY. OAuth tokens/events only in JS memory. */
(() => {
 'use strict';
 const app=window.LifeRPGApp,core=window.LifeRPGCalendarCore;
 if(!app?.getState||!core)return;
 const $=id=>document.getElementById(id),E=x=>app.escapeHtml(String(x??''));
 const CONFIG_KEY='lifeRpgLocalGcalReadOnlyConfigV1';
 const SCOPE='https://www.googleapis.com/auth/calendar.readonly';
 let settings={clientId:'',choices:{}};
 try{const obj=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');if(obj&&typeof obj==='object'){settings.clientId=String(obj.clientId||'');settings.choices=obj.choices||{};}}catch{}
 let token='',expires=0,calendars=[],events=[],status='',syncedAt='',working=false,scriptLoading=false,expanded=false;
 let oauthClient=null,authClientId='';
 const connected=()=>Boolean(token)&&Date.now()<expires-30000;
 const hasSetup=()=>Boolean(settings.clientId);
 const localDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
 function activeEvents(){return connected()?events:[];}
 function choice(id,label){
   const found=settings.choices[id];
   if(found&&['busy','work','ignore'].includes(found.mode))return found;
   return {mode:core.defaultMode(label),place:'school',bufferBefore:0,bufferAfter:0};
 }
 function choicesMap(){return Object.fromEntries(calendars.map(c=>[c.id,choice(c.id,c.summary)]));}
 function eventsFor(day){
   const a=new Date(day+'T00:00:00').getTime(),b=new Date(addDays(day,1)+'T00:00:00').getTime();
   return activeEvents().filter(e=>{
     if(!e.start?.dateTime||!e.end?.dateTime)return false;
     const start=Date.parse(e.start.dateTime),end=Date.parse(e.end.dateTime);
     return end>a&&start<b;
   });
 }
 function busy(date){return core.busyEvents(choicesMap(),eventsFor(date),date);}
 function workWindows(from,count){
   const out=[];if(!connected())return out;
   for(let i=0;i<count;i++){const date=addDays(from,i);out.push(...core.workWindows(choicesMap(),eventsFor(date),date));}
   return out;
 }
 function weekEvents(date){
   const c=choicesMap();
   return eventsFor(date).flatMap(e=>{
     const kind=c[e.calendarId]?.mode;if(kind==='ignore')return [];
     const span=core.dayPart(e,date,kind==='busy'?(c[e.calendarId]?.bufferBefore||0):0,kind==='busy'?(c[e.calendarId]?.bufferAfter||0):0);
     if(!span)return [];
     const base=new Date(date+'T00:00:00');
     return [{id:e.calendarId+':'+e.id,title:e.summary||'Kalendereintrag',mode:kind,
       start:new Date(+base+span[0]*60000),end:new Date(+base+span[1]*60000)}];
   });
 }
 function hasBusyOn(date){return busy(date).length>0;}
 function notify(){window.dispatchEvent(new Event('life-rpg:google-calendar-updated'));window.LifeRPGTaskWindows?.render?.();window.LifeRPGNativePlanner?.render?.();}
 function persist(){
   try{localStorage.setItem(CONFIG_KEY,JSON.stringify({clientId:settings.clientId,choices:settings.choices}));}catch{}
 }
 async function loadLibrary(){
   if(window.google?.accounts?.oauth2)return;
   if(scriptLoading)return;scriptLoading=true;status='Google-Anmeldung wird vorbereitet …';render();
   try{
     await new Promise((resolve,reject)=>{
       const el=document.createElement('script');el.src='https://accounts.google.com/gsi/client';el.async=true;
       el.onload=()=>window.google?.accounts?.oauth2?resolve():reject(Error('Google-Bibliothek nicht verfügbar.'));
       el.onerror=()=>reject(Error('Google-Bibliothek konnte nicht geladen werden (evtl. offline).'));
       document.head.append(el);
     });
     status='Vorbereitet. Klicke jetzt auf „Mit Google verbinden“.';
   }catch(e){status=e.message||String(e);}finally{scriptLoading=false;render();}
 }
 function authenticate(){
   const cid=settings.clientId.trim();
   if(!/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(cid)){status='Bitte zuerst eine gültige OAuth-Web-Client-ID eintragen.';render();return;}
   if(!window.google?.accounts?.oauth2){status='Bitte zuerst die Google-Anmeldung vorbereiten.';render();return;}
   if(oauthClient===null||authClientId!==cid){
     authClientId=cid;
     oauthClient=window.google.accounts.oauth2.initTokenClient({
       client_id:cid,scope:SCOPE,
       callback:response=>{
         if(response?.error||!response?.access_token){status='Anmeldung abgebrochen oder fehlgeschlagen: '+String(response?.error||'unbekannt');render();return;}
         token=response.access_token;
         expires=Date.now()+Math.max(60,Number(response.expires_in)||3600)*1000;
         status='Verbunden. Kalender werden geladen …';render();refresh().catch(e=>{status=String(e.message||e);render();});
       },
       error_callback:()=>{status='Google-Anmeldung konnte nicht abgeschlossen werden.';render();}
     });
   }
   oauthClient.requestAccessToken({prompt:token?'':'consent'});
 }
 async function api(path,params={}){
   if(!connected())throw Error('Google-Freigabe abgelaufen. Bitte erneut verbinden.');
   const url=new URL('https://www.googleapis.com/calendar/v3/'+path);
   for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
   const response=await fetch(url.toString(),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   if(!response.ok){if(response.status===401){token='';expires=0;events=[];notify();}
     throw Error('Google Calendar HTTP '+response.status+'. Verbindung/Calendar API/Berechtigung prüfen.');}
   return response.json();
 }
 async function allPages(path,params,maxPages=12){
   const results=[];let next='';
   for(let i=0;i<maxPages;i++){
     const page=await api(path,next?{...params,pageToken:next}:params);
     results.push(...(page.items||[]));next=page.nextPageToken||'';
     if(!next)return results;
   }
   throw Error('Zu viele Kalendereinträge für die sichere Vorschau. Bitte weniger Kalender auswählen.');
 }
 async function refresh(){
   if(working||!connected())return;working=true;
   try{
     status='Kalender werden gelesen …';render();
     const list=await allPages('users/me/calendarList',{maxResults:250},3);
     const active=list.map(c=>({id:c.id,summary:c.summary||'Unbenannter Kalender'})).filter(c=>c.id);
     const selected=active.filter(c=>choice(c.id,c.summary).mode!=='ignore');
     const min=new Date(localDay()+'T00:00:00').toISOString(),max=new Date(addDays(localDay(),43)+'T00:00:00').toISOString();
     const incoming=[];
     for(const c of selected){
       const entries=await allPages('calendars/'+encodeURIComponent(c.id)+'/events',
         {timeMin:min,timeMax:max,singleEvents:'true',showDeleted:'false',maxResults:250},8);
       for(const e of entries){
         if(e.status==='cancelled'||e.attendees?.some(a=>a.self&&a.responseStatus==='declined'))continue;
         incoming.push({...e,calendarId:c.id});
       }
     }
     calendars=active;events=incoming;syncedAt=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
     status='Kalender aktualisiert. Es werden nur Termine mit Uhrzeit für die Planung verwendet.';
     notify();render();
   }catch(e){events=[];status='Kalender nicht aktuell: '+String(e.message||e);notify();render();throw e;}
   finally{working=false;}
 }
 function dropConnection(){
   token='';expires=0;events=[];calendars=[];syncedAt='';status='Google-Kalender getrennt. Deine Aufgaben bleiben unverändert.';
   notify();render();
 }
 function render(){
   const mount=$('taskGoogleCalendarMount');if(!mount)return;
   const ok=connected();
   mount.innerHTML='<details class="tgc-panel" '+(expanded?'open':'')+'><summary>📆 Google-Kalender · private Termine & Arbeitsblöcke <small>'+(ok?'Verbunden':'Noch nicht verbunden')+'</small></summary>'
    +'<div class="tgc-body"><p>Optionaler Nur-Lesen-Abgleich. „Schule Unterricht“ und „Schule Aufsichten“ werden standardmäßig ignoriert, weil sie bereits im Wochenplan stehen. Private Termine und Konferenzen blockieren Zeit; „Schule Arbeitsblöcke“ kann Arbeitsfenster liefern.</p>'
    +'<p>Die Google-Anmeldung benötigt eine <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">OAuth-Web-Client-ID</a> mit freigeschalteter Google Calendar API. Autorisierte JavaScript-Quelle: <code>'+E(location.origin)+'</code>. Ohne diese Einrichtung funktioniert der automatische Abgleich noch nicht.</p>'
    +'<label class="tgc-client">OAuth-Web-Client-ID (öffentlich, kein Secret)<input data-tgc-client placeholder="…apps.googleusercontent.com" value="'+E(settings.clientId)+'"></label>'
    +'<div class="tgc-actions"><button type="button" data-tgc-load '+(scriptLoading?'disabled':'')+'>1. Google-Anmeldung vorbereiten</button><button type="button" data-tgc-login>2. Mit Google verbinden</button>'
    +(ok?'<button type="button" data-tgc-refresh>Kalender aktualisieren</button><button type="button" data-tgc-disconnect>Trennen</button>':'')+'</div>'
    +(status?'<p class="tgc-status" role="status">'+E(status)+'</p>':'')
    +(ok?'<p>Zuletzt synchronisiert: '+E(syncedAt||'–')+'. Synchronisation während der geöffneten Sitzung; keine Hintergrundverbindung im geschlossenen Browser.</p>'
       +'<div class="tgc-calendars">'+calendars.map(c=>{
         const ch=choice(c.id,c.summary);
         const modes=[['ignore','Ignorieren'],['busy','Termin · blockiert Zeit'],['work','Arbeitsfenster · Aufgaben möglich']];
         return '<div class="tgc-calendar"><strong>'+E(c.summary)+'</strong><select data-tgc-mode="'+E(c.id)+'">'+modes.map(([v,l])=>'<option value="'+v+'" '+(ch.mode===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'
           +(ch.mode==='busy'?'<label>Anfahrt-/Zeitpuffer davor <select data-tgc-pad="'+E(c.id)+'">'+[0,15,30,45,60,90].map(v=>'<option value="'+v+'" '+(Number(ch.bufferBefore)===v?'selected':'')+'>'+v+' Min.</option>').join('')+'</select></label>':'')+'</div>';
       }).join('')+'</div>':'')
    +'<p class="tgc-note">Datenschutz: Zugriffstoken und Termintexte bleiben nur im Speicher dieser Browsersitzung; sie werden nicht in den Life-RPG-Hauptsave geschrieben. Gespeichert wird lokal lediglich die öffentliche Client-ID und deine Kalender-Auswahl. Keine XP für bloß geplante Termine.</p>'
    +'</div></details>';
 }
 function change(e){
   const el=e.target;
   if(el.hasAttribute('data-tgc-client')){settings.clientId=el.value.trim();persist();oauthClient=null;return;}
   if(el.hasAttribute('data-tgc-mode')||el.hasAttribute('data-tgc-pad')){
     const id=el.dataset.tgcMode||el.dataset.tgcPad;
     const c=calendars.find(c=>c.id===id);if(!c)return;
     const current=choice(id,c.summary);
     settings.choices[id]=el.hasAttribute('data-tgc-mode')?{...current,mode:el.value}:{...current,bufferBefore:Number(el.value)||0};
     persist();if(connected())refresh().catch(()=>{});
     render();
   }
 }
 function click(e){
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-tgc-load')){loadLibrary();return;}
   if(b.hasAttribute('data-tgc-login')){authenticate();return;}
   if(b.hasAttribute('data-tgc-refresh')){refresh().catch(()=>{});return;}
   if(b.hasAttribute('data-tgc-disconnect')){dropConnection();}
 }
 function init(){
   const mount=$('taskGoogleCalendarMount');if(!mount)return;
   mount.addEventListener('click',click);mount.addEventListener('change',change);
   mount.addEventListener('toggle',e=>{if(e.target.matches('details.tgc-panel'))expanded=e.target.open;},true);
   render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.LifeRPGGoogleCalendar={busy,workWindows,weekEvents,hasBusyOn,connected,hasSetup,render,
   _test:{eventsFor,choice,dropConnection}};
})();