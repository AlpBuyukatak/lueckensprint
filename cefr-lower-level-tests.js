const assert=require('assert'),fs=require('fs'),path=require('path');
const {ctest}=require('./app.js');
const root=__dirname,read=level=>JSON.parse(fs.readFileSync(path.join(root,'data',`texts-${level}.json`),'utf8'));
const sentences=text=>text.trim().split(/(?<=[.!?])\s+/u).filter(Boolean),words=text=>(text.match(/[A-Za-zÄÖÜäöüß]+/gu)||[]);
const oldMetaLanguage=/\b(beschäftigt\s+sich|arbeitsblatt|stichwörter|zusätzlich|besonderer\s+aspekt|hervorgehoben|theorie\s+und\s+praxis|forschungsergebnisse|berechtigungen|privatsphäre)\b/iu;
const a1Forbidden=/\b(ressourcen|verantwortungsvoll|nachvollziehbar|aufmerksamkeit|lerngewohnheiten|unterschiedlichen\s+erfahrungen|materialien\s+für\s+das\s+seminar)\b/iu;
const a2Forbidden=/\b(besonderer\s+aspekt|hervorgehoben|theorie\s+und\s+praxis|forschungsergebnisse|berechtigungen|privatsphäre)\b/iu;
for(const [level,limit,forbidden] of [['a1',11,a1Forbidden],['a2',13,a2Forbidden]])for(const row of read(level)){
  const sentenceWords=sentences(row.text).map(words);
  assert.ok(row.cefrAudit?.reviewed,`${row.id}: qualitative CEFR review is missing`);
  assert.ok(!oldMetaLanguage.test(row.text),`${row.id}: old abstract worksheet meta-language leaked into ${level.toUpperCase()}`);
  assert.ok(!forbidden.test(row.text),`${row.id}: over-difficult vocabulary leaked into ${level.toUpperCase()}`);
  assert.ok(Math.max(...sentenceWords.map(list=>list.length))<=limit,`${row.id}: sentence exceeds ${level.toUpperCase()} length limit`);
  assert.equal(row.subordinateClauseCount,level==='a1'?0:1,`${row.id}: unexpected lower-level clause profile`);
  assert.equal(row.eligibleCtestWords,20,`${row.id}: revised text must retain exactly 20 stable C-Test gaps`);
  assert.deepStrictEqual(ctest(row.text,{gaps:20,level:row.level,textId:row.id}).items.map(item=>item.diagnostic.gapId),Array.from({length:20},(_item,index)=>`${row.id}:gap-${index}`),`${row.id}: stable C-Test gap IDs changed`);
}
const example=read('a1').find(row=>row.id==='a1-01');
assert.ok(example&&/Am Montag ist Mia in der Stadt\./u.test(example.text),'a1-01 was not replaced with an A1 everyday-language text');
assert.ok(!/Maria beschäftigt sich heute mit dem Thema Alltag/u.test(example.text),'the reported over-difficult A1 example is still present');
console.log('Lower-level CEFR regressions passed: A1/A2 language, sentence profiles, and stable gap output are protected.');
