const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),sync=fs.readFileSync('sync.js','utf8');
for(const token of ['TEXT_BY_ID','TEXTS_BY_TOPIC','buildTextIndexes','EXAM_DEBOUNCE_MS = 6500','clearInterval(interval)','window.__TEXT_REFRESHING__'])assert.ok(app.includes(token)||sync.includes(token),`missing performance safeguard: ${token}`);
assert.ok(!/input[^\n]{0,200}render\(/.test(app),'gap input must not trigger a full-page render');
assert.ok(app.includes('S.activePractice.answers[index]=element.value'),'practice answers must persist without rebuilding the route');
assert.ok(sync.includes("kind === 'active-exam'"),'unfinished exams need a longer cloud debounce');
console.log('Performance and no-rerender regression tests passed');
