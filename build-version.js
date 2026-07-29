const fs=require('fs'),path=require('path'),child=require('child_process');
const file=path.join(__dirname,'version.json');
let commit='unknown';try{commit=child.execSync('git rev-parse --short HEAD',{cwd:__dirname,stdio:['ignore','pipe','ignore']}).toString().trim()}catch{}
const version={appVersion:'2.4.0',serviceWorkerVersion:'lueckensprint-v2.2.0',dataSchemaVersion:3,textDatabaseVersion:'3',buildTimestamp:new Date().toISOString(),commit};
fs.writeFileSync(file,JSON.stringify(version,null,2)+'\n','utf8');console.log(`Version manifest updated: ${version.appVersion} (${version.commit})`);
