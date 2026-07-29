/* Creates the checked-in JSON text databases from the application's original text factory. */
const fs=require('fs'),path=require('path');
const {DB}=require('./app.js');
const dataDir=path.join(__dirname,'data');
fs.mkdirSync(dataDir,{recursive:true});
for(const [level,texts] of Object.entries(DB)){
  const target=path.join(dataDir,`texts-${level.toLowerCase()}.json`);
  fs.writeFileSync(target,JSON.stringify(texts,null,2),'utf8');
  console.log(`${path.relative(__dirname,target)}: ${texts.length} texts`);
}
