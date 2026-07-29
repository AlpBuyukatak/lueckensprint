const assert=require('assert'),fs=require('fs');
const app=fs.readFileSync('app.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8'),css=fs.readFileSync('styles.css','utf8'),index=fs.readFileSync('index.html','utf8');
for(const page of ['home','daily','practice','exam','errors','custom','stats','settings'])assert.ok(app.includes(`data-view="${page}"`)||app.includes(`${page}:render`),`Missing ${page} navigation view.`);
assert.ok(app.includes('`./data/texts-${level.toLowerCase()}.json`'),'Hosted runtime has no dynamic JSON loader.');
for(const level of ['a1','a2','b1','b2','c1']){
  assert.ok(sw.includes(`./data/texts-${level}.json`),`Offline cache is missing ${level}.`);
}
assert.ok(app.includes('await fetch(file'), 'Hosted runtime does not load JSON files.');
assert.ok(app.includes('window.__STANDALONE_TEXTS__'), 'Standalone JSON path is missing.');
assert.ok(sw.includes("event.data==='SKIP_WAITING'"), 'PWA update activation is missing.');
assert.ok(app.includes('openCustomEditor'), 'Custom-text editing is missing.');
assert.ok(app.includes('Eğitim sonuç bantları'), 'Configurable training bands are missing.');
assert.ok(!/soundEffect|sound effects|ses efekti/i.test(app), 'Unused sound setting remains.');
assert.ok(css.includes('body.dark{--text:#f1f8f4'),'Dark theme light text token is missing.');
assert.ok(css.includes('.ctext .word-gap{display:inline-flex'),'C-Test word fragments are not inline.');
assert.ok(css.includes('width:clamp(2.4ch'),'C-Test gaps have no compact adaptive width.');
assert.ok(css.includes('.day{aspect-ratio:auto!important;height:36px'),'Calendar day cells are not compact.');
assert.ok(css.includes('overflow-x:hidden'),'Horizontal-overflow protection is missing.');
assert.ok(index.includes('./sync.js')&&index.includes('./supabase-config.js'),'Hosted sync assets are not loaded.');
assert.ok(sw.includes("'./sync.js'")&&sw.includes("'./supabase-config.js'"),'Offline cache is missing sync assets.');
console.log('Hosted PWA structural tests passed');
