const assert=require('assert'),fs=require('fs');
const {normalizeExamState,examRemainingMs,persistExamClock}=require('./app.js');
const app=fs.readFileSync('app.js','utf8');
const base={id:'exam-1',mode:'learning',status:'running',remaining_ms:120000,timer_started_at:1000,started_at:1000,last_updated_at:1000,current:0,sets:[{text:{id:'a1-01',text:'Ein kurzer Satz. Danach folgt ein weiterer Satz mit genug Wörtern für einen Test.'},answers:['abc'],answer_updated_at:[1000]}]};
let learning=normalizeExamState(JSON.parse(JSON.stringify(base)));assert.equal(learning.status,'running');assert.equal(examRemainingMs(learning,31000),90000);persistExamClock(learning,31000);assert.equal(learning.remaining_ms,90000);learning.status='paused';assert.equal(examRemainingMs(learning,999999),90000,'paused learning mode must freeze');
const strict=normalizeExamState({...base,id:'exam-2',mode:'strict',deadline_at:61000,remaining_ms:120000});assert.equal(examRemainingMs(strict,31000),30000);assert.equal(examRemainingMs(strict,62000),0,'strict mode must not go negative');
const legacy=normalizeExamState({id:'legacy',mode:'learning',remaining:42,current:0,sets:base.sets});assert.equal(legacy.remaining_ms,42000,'legacy seconds must migrate to milliseconds');
for(const token of ['visibilitychange','pagehide','pageshow','beforeunload','Prüfung pausiert','Fortsetzen','Diese Simulation kann nicht pausiert werden','answer_updated_at','deadline_at','remaining_ms'])assert.ok(app.includes(token),`missing resilient-exam feature: ${token}`);
console.log('Exam state, pause/resume, lifecycle, and timer restoration tests passed');
