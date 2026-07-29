const assert=require('assert'),fs=require('fs');
const {mergeProgress,chooseRecord,completeness,createPreMergeSnapshot,readPreMergeSnapshot,preMergeSnapshotKey}=require('./sync.js');
const base=overrides=>({version:1,settings:{theme:'light'},attempts:[],errors:[],custom:[],custom_deleted:[],daily:{},tasks:{},seen:[],activeExam:null,sync_meta:{updated_at:'2026-01-01T00:00:00.000Z',settings_updated_at:'2026-01-01T00:00:00.000Z',local_revision:0,cloud_revision:0},...overrides});
const row=(id,time='2026-01-01T00:00:00.000Z',extra={})=>({id,updated_at:time,...extra});

assert.equal(completeness({a:1,b:{c:'x'}}),2,'record completeness counts meaningful fields');
assert.equal(chooseRecord(row('x','2026-01-01',{answer:'a'}),row('x','2026-01-01',{answer:'a',score:1})).score,1,'same-time more complete record wins');
let merged=mergeProgress(base({attempts:[row('a')]}),base());
assert.deepStrictEqual(merged.attempts.map(x=>x.id),['a'],'local-only attempt is preserved');
merged=mergeProgress(base(),base({attempts:[row('b')]}));
assert.deepStrictEqual(merged.attempts.map(x=>x.id),['b'],'cloud-only attempt is preserved');
merged=mergeProgress(base({attempts:[row('a')]}),base({attempts:[row('a'),row('b')]}));
assert.equal(merged.attempts.length,2,'duplicate records are deduplicated');
merged=mergeProgress(base({attempts:[row('a','2026-01-01',{correct:2})]}),base({attempts:[row('a','2026-02-01',{correct:9})]}));
assert.equal(merged.attempts[0].correct,9,'same-ID newest attempt wins');
merged=mergeProgress(base({settings:{theme:'dark'},sync_meta:{settings_updated_at:'2026-01-02'}}),base({settings:{theme:'light'},sync_meta:{settings_updated_at:'2026-01-03'}}));
assert.equal(merged.settings.theme,'light','newest settings object wins');
merged=mergeProgress(base({errors:[row('word','2026-02-01',{mastery:1,reviewed_at:'2026-02-01'})]}),base({errors:[row('word','2026-01-01',{mastery:3,reviewed_at:'2026-01-01'})]}));
assert.equal(merged.errors[0].mastery,3,'error mastery keeps the highest value');
merged=mergeProgress(base({custom:[row('c','2026-01-01',{title:'old'})]}),base({custom:[row('c','2026-02-01',{title:'new'})]}));
assert.equal(merged.custom[0].title,'new','newest custom edit wins');
merged=mergeProgress(base({custom:[row('c','2026-01-01',{title:'old'})]}),base({custom_deleted:[row('c','2026-02-01',{deleted_at:'2026-02-01'})]}));
assert.equal(merged.custom.length,0,'custom deletion tombstone wins over older edit');
merged=mergeProgress(base({daily:{'2026-01-02':true},tasks:{'2026-01-02':true}}),base({daily:{'2026-01-01':true},tasks:{'2026-01-02':false}}));
assert.deepStrictEqual(merged.daily,{'2026-01-01':true,'2026-01-02':true},'activity dates merge without loss');
assert.equal(merged.tasks['2026-01-02'],true,'completed daily task is never double-counted or cleared');
merged=mergeProgress(base({activeExam:row('old','2026-01-01')}),base({activeExam:row('new','2026-02-01')}));
assert.equal(merged.activeExam.id,'new','newest active exam is selected');
assert.ok(merged.activeExamConflicts.some(exam=>exam.id==='old'),'different active exam is retained as a conflict copy');

// Device A -> cloud -> offline Device B -> reconnect -> Device A merge.
const deviceA=base({attempts:[row('a-exercise','2026-02-01',{correct:18,total:20})]});
const cloudAfterA=mergeProgress(deviceA,base());
const deviceBOffline=mergeProgress(base({attempts:[row('b-exercise','2026-02-02',{correct:19,total:20})]}),cloudAfterA);
const cloudAfterB=mergeProgress(cloudAfterA,deviceBOffline);
const deviceAReceived=mergeProgress(deviceA,cloudAfterB);
assert.deepStrictEqual(new Set(deviceAReceived.attempts.map(x=>x.id)),new Set(['a-exercise','b-exercise']),'two-device automatic flow keeps both records');
assert.equal(deviceAReceived.attempts.length,2,'two-device flow creates no duplicates');
assert.equal(deviceAReceived.attempts.reduce((total,item)=>total+item.correct,0),37,'statistics can be recalculated from merged attempts');

const source=fs.readFileSync('sync.js','utf8');
for(const token of ['auth.getSession()','auth.onAuthStateChange','detectSessionInUrl:true','addEventListener(\'online\'','visibilitychange','addEventListener(\'focus\'','force:true, reason:\'periodic\'','POLL_MS = 90000','NORMAL_DEBOUNCE_MS = 2000','EXAM_DEBOUNCE_MS = 6500','save_user_progress','MAX_RETRIES = 3','Synchronisierung wird erneut versucht','Offline · auf diesem Gerät gespeichert','Es gibt noch nicht synchronisierte lokale Änderungen','Angemeldet','Nicht angemeldet','id="syncNow"','id="pullCloud"','id="pushCloud"','id="downloadCloud"']){
  if(['id="syncNow"','id="pullCloud"','id="pushCloud"','id="downloadCloud"'].includes(token))assert.ok(!source.includes(token),`Manual cloud control leaked into normal UI: ${token}`);
  else assert.ok(source.includes(token),`Missing automatic sync behavior: ${token}`);
}
const makeStorage=()=>{const values=new Map();return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value))}};
const snapshots=makeStorage(),preMergeState=base({attempts:[row('local-only')],custom:[row('custom-local')],settings:{theme:'dark'}});
assert.equal(createPreMergeSnapshot(snapshots,'user-a',preMergeState),true,'first sign-in creates an internal pre-merge snapshot');
assert.equal(createPreMergeSnapshot(snapshots,'user-a',base()),false,'reload or repeated auth event creates no second snapshot');
assert.equal(snapshots.getItem(preMergeSnapshotKey('user-a'))!==null,true,'snapshot stays durable in local storage');
assert.equal(createPreMergeSnapshot(snapshots,'user-b',base()),true,'a different signed-in user receives an independent snapshot');
const restored=readPreMergeSnapshot(snapshots,'user-a');assert.deepStrictEqual(restored.state,preMergeState,'internal snapshot can be restored manually without a browser download');
const failingStorage={getItem:()=>null,setItem:()=>{throw new Error('storage failed')}};
assert.throws(()=>createPreMergeSnapshot(failingStorage,'user-c',base()),'failed snapshot is not silently marked complete');
assert.ok(!/download\s*\(/.test(source),'no automatic browser download code path remains in cloud sync');
assert.equal((source.match(/createPreMergeSnapshot\(/g)||[]).length,1,'snapshot creation is called only from the first-merge flow');
const appSource=fs.readFileSync('app.js','utf8');
assert.ok(appSource.includes('id="exportJson"'),'manual JSON backup remains available');
assert.ok(appSource.includes("$('#exportJson')&&($('#exportJson').onclick=()=>download("),'manual JSON export is available only through its explicit click handler');
console.log('Internal pre-merge snapshot and no-auto-download tests passed');
console.log('Sync merge, offline queue, revision, and automatic UX tests passed');
