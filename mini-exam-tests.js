const assert=require('assert'),fs=require('fs'),path=require('path');
const {MINI_EXAM_SECONDS,MINI_EXAM_LEVELS,selectRelatedTrainingText,selectMiniExamTexts}=require('./app.js');

const all=['a1','a2','b1','b2','c1'].flatMap(level=>JSON.parse(fs.readFileSync(path.join(__dirname,'data',`texts-${level}.json`),'utf8')));
const selected=selectMiniExamTexts(all,{},17);

assert.equal(MINI_EXAM_SECONDS,20*60,'Mini exam must last 20 minutes');
assert.deepEqual(selected.map(text=>text.level),MINI_EXAM_LEVELS,'Mini exam must progress A1 → C1');
assert.equal(new Set(selected.map(text=>text.id)).size,5,'Mini exam must not repeat a text');
for(let index=1;index<selected.length;index++)assert.ok(Number(selected[index].numericDifficultyScore)>=Number(selected[index-1].numericDifficultyScore),'Mini exam difficulty must increase');

const previous=all.find(text=>text.level==='B1'&&all.some(other=>other.id!==text.id&&other.level==='B1'&&other.topic===text.topic));
const continued=selectRelatedTrainingText(all,previous,3);
assert.notEqual(continued.id,previous.id,'Continuation must choose a new text');
assert.equal(continued.level,previous.level,'Continuation must retain the CEFR level');
assert.equal(continued.topic,previous.topic,'Continuation must retain the topic when another text is available');

console.log('Mini exam and related-training continuation tests passed');
