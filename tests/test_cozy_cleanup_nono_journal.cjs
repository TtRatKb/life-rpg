// Focused regression checks for the November 2026 Life RPG cleanup.
// No personal save, OAuth token, network request or Firebase account is needed.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),hub=read('life-hub-v314dk.js'),sw=read('service-worker.js');
const journal=read('journal.js'),book=read('bullet-journal-book.js'),style=read('bullet-journal-book.css');
const nonogram=read('nonogram.js');
for(const js of [
 'journal.js','bullet-journal-book.js','life-hub-v314dk.js','nonogram.js',
 'data/nonogram-levels.js','data/nonogram-levels-chapter2.js','pwa.js','service-worker.js'
]){
 const run=spawnSync(process.execPath,['--check',path.join(root,js)],{encoding:'utf8'});
 assert.equal(run.status,0,js+' syntax failed: '+run.stderr);
}
for(const [name,pattern] of [
 ['tasks route',/id="view-tasks"/],
 ['life-board route',/id="view-lifeboard"/],
 ['task mounts',/id="task(?:Planning|Project)TodayMount"/],
 ['task nav',/data-view="(?:tasks|lifeboard)"/],
 ['old Companion',/src="(?:living-companion|living-companion-core|living-companion-personality)\.js/],
 ['old Task runtime',/src="(?:task-[a-z-]+|todoist-sync|life-board(?:-core)?)\.js/],
 ['old Task stylesheet',/href="(?:task-[a-z-]+|todoist-sync|life-board|living-companion)\.css/]
])assert.doesNotMatch(index,pattern,name+' must be absent from app startup');
assert.doesNotMatch(hub,/\["tasks","Meine Aufgaben"\]|\["lifeboard","Life Board"\]/);
assert.match(hub,/LifeRPGBulletJournalBook\.open/);
assert.doesNotMatch(sw,/["']\.\/(?:task-[a-z-]+|todoist-sync|life-board(?:-core)?|living-companion(?:-[a-z-]+)?)\.(?:js|css)\?/);
assert.match(index,/data\/nonogram-levels\.js[^"]*"><\/script>[\s\S]*data\/nonogram-levels-chapter2\.js[^"]*"><\/script>[\s\S]*nonogram\.js[^"]*"><\/script>/);
assert.match(nonogram,/const TOTAL = LEVELS\.length/);
assert.match(nonogram,/sourceId=\`journey-l\$\{a\.level\}\`/);
assert.match(journal,/function saveReflectionInBook\(/);
assert.match(journal,/maybeAwardReflectionRewards\(date, entry\)/);
assert.match(journal,/openReflection\(date\)/);
assert.match(book,/data-bj-prompt/);
assert.match(book,/savePendingPrompts\(\)/);
assert.match(book,/journal\.saveReflectionInBook/);
assert.match(book,/openReflection\(target=today\(\),field=null\)/);
assert.match(style,/font-family:"Kalam"/);
assert.match(style,/background-color:#fffefe/);
const context={window:{},console};
vm.runInNewContext(read('data/nonogram-levels.js'),context);
const old=context.window.LIFE_RPG_NONOGRAM_LEVELS;
assert.equal(old.length,50);
const first50=JSON.stringify(old);
vm.runInNewContext(read('data/nonogram-levels-chapter2.js'),context);
const levels=context.window.LIFE_RPG_NONOGRAM_LEVELS;
assert.equal(levels.length,80);
assert.equal(JSON.stringify(levels.slice(0,50)),first50,'Existing 50 level definitions changed');
vm.runInNewContext(read('data/nonogram-levels-chapter2.js'),context);
assert.equal(context.window.LIFE_RPG_NONOGRAM_LEVELS.length,80,'Chapter 2 loaded twice must be idempotent');
assert.deepEqual(Array.from(levels,x=>x.level),Array.from({length:80},(_,i)=>i+1));
const getClues=(mask,n)=>{
 let out=[],run=0;
 for(let i=0;i<=n;i++){if(i<n && (mask&(1<<i)))run++;else if(run){out.push(run);run=0;}}
 return out.join(',');
};
const optionCache=new Map();
function candidates(n,clue){
 const key=n+':'+clue;
 if(optionCache.has(key))return optionCache.get(key);
 const out=[];for(let mask=0;mask<(1<<n);mask++)if(getClues(mask,n)===clue)out.push(mask);
 optionCache.set(key,out);return out;
}
function countSolutions(puzzle,limit=2){
 const n=puzzle.size,s=puzzle.solution,R=[],C=[];
 for(let r=0;r<n;r++){let mask=0;for(let c=0;c<n;c++)if(s[r*n+c]==='1')mask|=(1<<c);R.push(candidates(n,getClues(mask,n)));}
 for(let c=0;c<n;c++){let mask=0;for(let r=0;r<n;r++)if(s[r*n+c]==='1')mask|=(1<<r);C.push(candidates(n,getClues(mask,n)));}
 let nodes=0;
 function search(rows,cols){
   if(++nodes>20000)throw Error('Puzzle solver exceeded node budget');
   while(true){
     let changed=false;
     for(let i=0;i<n;i++)if(!rows[i].length||!cols[i].length)return 0;
     for(let r=0;r<n;r++){
       let always=(1<<n)-1,maybe=0;
       for(const m of rows[r]){always&=m;maybe|=m;}
       for(let c=0;c<n;c++)if((always&(1<<c))||!(maybe&(1<<c))){
         const filled=!!(always&(1<<c));
         const next=cols[c].filter(m=>!!(m&(1<<r))===filled);
         if(next.length!==cols[c].length){cols[c]=next;changed=true;}
       }
     }
     for(let c=0;c<n;c++){
       if(!cols[c].length)return 0;
       let always=(1<<n)-1,maybe=0;
       for(const m of cols[c]){always&=m;maybe|=m;}
       for(let r=0;r<n;r++)if((always&(1<<r))||!(maybe&(1<<r))){
         const filled=!!(always&(1<<r));
         const next=rows[r].filter(m=>!!(m&(1<<c))===filled);
         if(next.length!==rows[r].length){rows[r]=next;changed=true;}
       }
     }
     if(!changed)break;
   }
   if(rows.every(x=>x.length===1)&&cols.every(x=>x.length===1))return 1;
   const choices=[
     ...rows.map((x,i)=>({i,axis:0,len:x.length})),
     ...cols.map((x,i)=>({i,axis:1,len:x.length}))
   ].filter(x=>x.len>1).sort((a,b)=>a.len-b.len);
   if(!choices.length)return 0;
   const item=choices[0],options=(item.axis?cols:rows)[item.i];
   let found=0;
   for(const opt of options){
     const rr=rows.slice(),cc=cols.slice();
     if(item.axis)cc[item.i]=[opt];else rr[item.i]=[opt];
     found+=search(rr,cc);
     if(found>=limit)return limit;
   }
   return found;
 }
 return search(R,C);
}
function lineLogicRounds(p){
 const n=p.size,s=p.solution,R=[],C=[],full=(1<<n)-1;
 for(let r=0;r<n;r++){let m=0;for(let c=0;c<n;c++)if(s[r*n+c]==='1')m|=(1<<c);R.push(candidates(n,getClues(m,n)));}
 for(let c=0;c<n;c++){let m=0;for(let r=0;r<n;r++)if(s[r*n+c]==='1')m|=(1<<r);C.push(candidates(n,getClues(m,n)));}
 for(let round=1;round<=100;round++){
  let changed=false;
  for(let r=0;r<n;r++){
   let fixed=full,possible=0;for(const m of R[r]){fixed&=m;possible|=m;}
   for(let c=0;c<n;c++)if((fixed&(1<<c))||!(possible&(1<<c))){
    const on=Boolean(fixed&(1<<c)),next=C[c].filter(m=>Boolean(m&(1<<r))===on);
    if(next.length!==C[c].length){C[c]=next;changed=true;}
   }
  }
  for(let c=0;c<n;c++){
   let fixed=full,possible=0;for(const m of C[c]){fixed&=m;possible|=m;}
   for(let r=0;r<n;r++)if((fixed&(1<<r))||!(possible&(1<<r))){
    const on=Boolean(fixed&(1<<r)),next=R[r].filter(m=>Boolean(m&(1<<c))===on);
    if(next.length!==R[r].length){R[r]=next;changed=true;}
   }
  }
  if([...R,...C].some(x=>!x.length))return 0;
  if([...R,...C].every(x=>x.length===1))return round;
  if(!changed)return 0;
 }
 return 0;
}
const puzzleRounds=[];
for(let i=50;i<80;i++){
 const p=levels[i];
 assert.equal(p.level,i+1);
 assert.equal(p.size,i<65?12:15);
 assert.equal(p.solution.length,p.size*p.size,'Bad solution dimensions for '+p.level);
 assert.match(p.solution,/^[01]+$/,'Bad cell encoding for '+p.level);
 assert.equal(countSolutions(p),1,'Puzzle is not uniquely solvable: '+p.level);
 const clues=[];
 for(let r=0;r<p.size;r++){let m=0;for(let c=0;c<p.size;c++)if(p.solution[r*p.size+c]==='1')m|=1<<c;clues.push(getClues(m,p.size).split(',').map(Number));}
 for(let c=0;c<p.size;c++){let m=0;for(let r=0;r<p.size;r++)if(p.solution[r*p.size+c]==='1')m|=1<<r;clues.push(getClues(m,p.size).split(',').map(Number));}
 assert(clues.every(c=>c[0]!==0),'Empty clue line: '+p.level);
 assert(clues.filter(c=>c.length===1).length<=1,'Too many single-run lines: '+p.level);
 assert(clues.reduce((sum,c)=>sum+c.length,0)/clues.length>=2.5,'Too little clue diversity: '+p.level);
 const rounds=lineLogicRounds(p);assert(rounds>=2,'Puzzle needs guessing or is trivial: '+p.level);puzzleRounds.push(rounds);
}
assert.match(nonogram,/index%a\.size\+1/,'5-cell separators reset at each new row');
assert.match(nonogram,/const played=Number\(a\.level\)>50/,'Existing active chapter 2 marks stay on their saved board');
console.log('OK: 30 unique, logic-only, varied chapter-2 puzzles ('+Math.min(...puzzleRounds)+'–'+Math.max(...puzzleRounds)+' deduction rounds), old 50 and reward IDs untouched.');
