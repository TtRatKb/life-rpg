const assert=require('node:assert/strict'),c=require('../task-google-calendar-core.js');
assert.equal(c.defaultMode('Schule Unterricht'),'ignore');
assert.equal(c.defaultMode('Schule Aufsichten'),'ignore');
assert.equal(c.defaultMode('Schule Arbeitsblöcke'),'work');
assert.equal(c.defaultMode('Schule Termine'),'busy');
assert.equal(c.defaultMode('Privat Google'),'busy');
assert.equal(c.defaultMode('Schule Fahrten'),'busy');
const event={id:'one',calendarId:'private',summary:'Besichtigung',status:'confirmed',
  start:{dateTime:'2026-10-20T15:00:00+02:00'},end:{dateTime:'2026-10-20T16:00:00+02:00'}};
const cal={private:{mode:'busy',bufferBefore:60,bufferAfter:0}};
process.env.TZ='Europe/Berlin';
assert.deepEqual(c.busyEvents(cal,[event],'2026-10-20').map(e=>[e.start,e.end]),[['14:00','16:00']]);
assert.deepEqual(c.busyEvents(cal,[{...event,start:{date:'2026-10-20'},end:{date:'2026-10-21'}}],'2026-10-20'),[]);
assert.deepEqual(c.busyEvents(cal,[{...event,status:'cancelled'}],'2026-10-20'),[]);
const work=c.workWindows({private:{mode:'work',place:'school'}},[event],'2026-10-20');
assert.equal(work[0].start,'15:00');assert.equal(work[0].end,'16:00');
assert.equal(c.workWindows(cal,[event],'2026-10-20').length,0);
console.log('Read-only calendar projection, role defaults, all-day skip and travel buffers passed');