/* Health import parser: no HealthKit access, no storage, no rewards.
 * Personal values are processed only on-device by the calling Health Journal UI.
 */
(function (root) {
  'use strict';
  const SCHEMA='life-rpg-health-batch-v1';
  const MAX_DAYS=93;
  const METRICS={steps:[100000,0],activeKcal:[12000,1],exerciseMin:[1440,0],standHours:[24,0],sleepMinutes:[1440,0]};
  const NUTRITION={proteinG:500,carbsG:1500,fatG:500,fiberG:200,waterMl:15000,caloriesKcal:15000,vitaminCMg:5000,vitaminDUg:1000};
  const WELLBEING={
    periodActive:['boolean'],
    periodCramps:['none','mild','moderate','strong'],
    mood:['very_low','low','neutral','good','very_good']
  };
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  function dateParts(value,now=new Date()){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw Error('Ungültiges Tagesdatum.');
    const [y,m,d]=value.split('-').map(Number),at=new Date(y,m-1,d,12);
    if(at.getFullYear()!==y||at.getMonth()!==m-1||at.getDate()!==d)throw Error('Ungültiges Kalenderdatum.');
    const current=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    const difference=Math.round((current.getTime()-at.getTime())/86400000);
    if(difference < -1 || difference>92)throw Error('Datum außerhalb des zulässigen 92-Tage-Zeitraums.');
    return value;
  }
  function finiteNumber(value,max,decimals){
    if(value===undefined||value===null||value==='')return null;
    if(typeof value!=='number'&&typeof value!=='string')throw Error('Ungültiger Zahlenwert.');
    const num=Number(String(value).trim().replace(',','.'));
    if(!Number.isFinite(num)||num<0||num>max)throw Error('Ungültiger Health-Wert oder Einheit.');
    return Number(num.toFixed(decimals));
  }
  function oneDay(entry,allowWellbeing,now){
    if(!plain(entry))throw Error('Ein Health-Tag muss ein JSON-Objekt sein.');
    const date=dateParts(entry.date,now);
    const imported={},nutrition={},wellbeing={};
    for(const [key,[max,decimals]]of Object.entries(METRICS)){
      const nested=plain(entry.imported)&&own(entry.imported,key)?entry.imported:null;
      const v=finiteNumber(nested?nested[key]:entry[key],max,decimals);
      if(v!==null)imported[key]=v;
    }
    for(const [key,max]of Object.entries(NUTRITION)){
      const nested=plain(entry.nutrition)&&own(entry.nutrition,key)?entry.nutrition:null;
      const v=finiteNumber(nested?nested[key]:entry[key],max,1);
      if(v!==null)nutrition[key]=v;
    }
    for(const [key,values]of Object.entries(WELLBEING)){
      const nested=plain(entry.wellbeing)&&own(entry.wellbeing,key)?entry.wellbeing:null;
      const source=nested?nested[key]:entry[key];
      if(source===undefined||source===null||source==='')continue;
      if(!allowWellbeing)throw Error('Zyklus- und Stimmungsdaten benötigen deine ausdrückliche Einwilligung unter dem Importfeld.');
      if(values[0]==='boolean'){
        if(typeof source!=='boolean')throw Error('periodActive muss true oder false sein.');
      }else if(typeof source!=='string'||!values.includes(source)){
        throw Error('Ungültiger Wert für '+key+'.');
      }
      wellbeing[key]=source;
    }
    if(!Object.keys(imported).length&&!Object.keys(nutrition).length&&!Object.keys(wellbeing).length)
      throw Error('Health-Tag '+date+' enthält keine unterstützten Werte.');
    return {date,imported,nutrition,wellbeing,source:'Apple Health / Kurzbefehle'};
  }
  function parseBatch(raw,{allowWellbeing=false,now=new Date()}={}){
    let obj=raw;
    if(typeof raw==='string'){
      if(raw.length>60000)throw Error('Import zu groß (maximal 60 KB).');
      try{obj=JSON.parse(raw);}catch{throw Error('Bitte gültiges JSON aus Kurzbefehle einfügen.');}
    }
    if(!plain(obj))throw Error('Health-Import benötigt ein JSON-Objekt.');
    let inputs;
    if(own(obj,'days')){
      if(obj.schema!==SCHEMA)throw Error('Unbekanntes Sammelimport-Format.');
      inputs=obj.days;
    }else inputs=[obj]; // Existing one-day JSON contract remains supported.
    if(!Array.isArray(inputs)||!inputs.length||inputs.length>MAX_DAYS)
      throw Error('Bitte 1 bis 93 Tage je Import übergeben.');
    const seen=new Set(),records=[];
    for(const entry of inputs){
      const r=oneDay(entry,allowWellbeing,now);
      if(seen.has(r.date))throw Error('Doppeltes Datum im Sammelimport: '+r.date);
      seen.add(r.date);records.push(r);
    }
    return {records,containsWellbeing:records.some(x=>Object.keys(x.wellbeing).length>0)};
  }
  function mergeDay(previous,incoming,stamp=Date.now()){
    const prev=plain(previous)?previous:{};
    const merged={...prev,date:incoming.date,
      imported:{...(plain(prev.imported)?prev.imported:{}),...incoming.imported},
      // Existing user-entered nutritional values must not be overwritten by a
      // retrospective shortcut import; fill only genuinely missing fields.
      nutrition:{...incoming.nutrition,...(plain(prev.nutrition)?prev.nutrition:{})},
      wellbeing:{...(plain(prev.wellbeing)?prev.wellbeing:{}),...incoming.wellbeing}};
    const changed=['imported','nutrition','wellbeing'].some(group=>
      Object.entries(merged[group]).some(([key,v])=>!own(prev[group]||{},key)||prev[group][key]!==v));
    if(!changed)return {record:prev,changed:false};
    merged.source=prev.source||incoming.source;
    merged.updatedAt=stamp;merged.pending=true;
    return {record:merged,changed:true};
  }
  const api={SCHEMA,MAX_DAYS,METRICS,NUTRITION,WELLBEING,dateParts,parseBatch,mergeDay};
  root.LifeRPGHealthImportCore=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
