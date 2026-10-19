/* Rule-based action companion. Dialogue flavor only; never decides deadlines or grants XP. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LifeRPGTaskFocusCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const taskReady=t=>Boolean(t&&t.id&&!t.doneAt&&!t.archived&&t.status!=='waiting'&&!(t.blockedBy||[]).length);
 function sliceMinutes(t,budget){
   const effort=Math.max(5,Math.min(2400,Number(t?.minutes)||20));
   const part=t?.hurdle==='high'?5:effort>=90?25:effort>=30?15:Math.min(15,effort);
   if(budget===0)return 0; // The user opted for no work today.
   return Math.max(1,Math.min(part,budget===null||budget===undefined?part:Math.max(0,Number(budget)||0)));
 }
 function dialogue(task,character,phase){
   const b=character==='bakugo';
   const painful=task?.hurdle==='high';
   if(phase==='done')return b?
     'Erledigt. Gut. Du hast es gemacht, statt dich weiter davon nerven zu lassen. Jetzt entscheidest du, ob noch etwas dran ist.':
     'Du hast es geschafft! Gerade bei solchen Aufgaben zählt auch die Überwindung. Du darfst jetzt genauso gut eine Pause machen.';
   if(phase==='pause')return b?
     'Dann ist jetzt Schluss. Nicht jede freie Minute ist automatisch Arbeitszeit.':
     'Okay, Feierabend. Wir behalten die Aufgaben im Blick, aber du darfst jetzt etwas Schönes machen.';
   if(phase==='step')return b?
     'Du musst nicht alles auf einmal schaffen. Fang mit dem ersten verdammten Schritt an. Danach kannst du neu entscheiden.':
     'Nur ein kleiner Anfang. Danach schauen wir zusammen, ob du weitermachen möchtest.';
   return painful?
     b?'Du hast die Aufgabe lange genug im Hinterkopf. Wir machen sie kleiner: nur der erste Schritt, dann sehen wir weiter.':
     'Die Aufgabe fühlt sich größer an, als sie auf dem Papier aussieht. Du musst sie nicht auf einmal schaffen – möchtest du mit fünf Minuten anfangen?':
     b?'Eine Sache nach der anderen. Nimm dir diese Aufgabe vor und sag danach, wie weit du gekommen bist.':
     'Die Aufgabe ist ein guter nächster Schritt. Du kannst klein anfangen und jederzeit neu entscheiden.';
 }
 function pickNext(list,doneIds){
   const removed=new Set(doneIds||[]);
   return (list||[]).find(x=>taskReady(x.task||x)&&!removed.has((x.task||x).id))||null;
 }
 return {taskReady,sliceMinutes,dialogue,pickNext};
});
