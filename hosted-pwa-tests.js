const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
for(const page of ['home','daily','practice','exam','errors','custom','stats','settings'])assert.ok(app.includes(`data-view="${page}"`)||app.includes(`${page}:render`),`Missing ${page} navigation view.`);
assert.ok(app.includes('`./data/texts-${level.toLowerCase()}.json`'),'Hosted runtime has no dynamic JSON loader.');
for(const level of ['a1','a2','b1','b2','c1']){
  assert.ok(sw.includes(`./data/texts-${level}.json`),`Offline cache is missing ${level}.`);
}
assert.ok(app.includes('await fetch(file)'), 'Hosted runtime does not load JSON files.');
assert.ok(app.includes('window.__STANDALONE_TEXTS__'), 'Standalone JSON path is missing.');
assert.ok(sw.includes("event.data==='SKIP_WAITING'"), 'PWA update activation is missing.');
assert.ok(app.includes('openCustomEditor'), 'Custom-text editing is missing.');
assert.ok(app.includes('Eğitim sonuç bantları'), 'Configurable training bands are missing.');
assert.ok(!/soundEffect|sound effects|ses efekti/i.test(app), 'Unused sound setting remains.');
console.log('Hosted PWA structural tests passed');
