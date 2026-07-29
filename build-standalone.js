/* Builds a no-server, single-file version. No npm dependencies are required. */
const fs=require('fs'),path=require('path');
const root=__dirname,read=(file)=>{
  const full=path.join(root,file);
  if(!fs.existsSync(full))throw new Error(`Required file is missing: ${file}`);
  return fs.readFileSync(full,'utf8');
};
const cssFiles=['styles.css'],jsFiles=['app.js'],levels=['a1','a2','b1','b2','c1'];
try{
  const html=read('index.html'),css=cssFiles.map(read).join('\n'),js=jsFiles.map(read).join('\n'),publicConfig=read('supabase-config.js');
  if(/sb_secret_|service_role/i.test(publicConfig))throw new Error('supabase-config.js must not contain a secret or service-role key.');
  const data=Object.fromEntries(levels.map(level=>[`texts-${level}`,JSON.parse(read(`data/texts-${level}.json`))]));
  if(Object.values(data).reduce((n,x)=>n+x.length,0)!==300)throw new Error('Expected 300 built-in texts in JSON databases.');
  const safe=value=>String(value).replace(/<\/script/gi,'<\\/script');
  const bootstrap=safe(`window.__STANDALONE__=true;window.__STANDALONE_TEXTS__=${JSON.stringify(data)};\n${publicConfig}`);
  const withoutUpdateManager=js.replace(/\/\* PWA_UPDATE_MANAGER_START \*\/[\s\S]*?\/\* PWA_UPDATE_MANAGER_END \*\//,'');
  const standaloneJs=withoutUpdateManager.replace(/async function loadDatabase\(\)\{[^\n]*\}\n/,'async function loadDatabase(){if(typeof window!==\'undefined\')setDatabase(window.__STANDALONE_TEXTS__||{});}\n');
  if(standaloneJs===withoutUpdateManager)throw new Error('Could not remove hosted database loader from standalone build.');
  let output=html.replace(/<link rel="manifest"[^>]*>\s*/,'').replace(/<link rel="stylesheet" href="(?:\.\/)?styles\.css">/,'<style>'+safe(css)+'</style>').replace(/<script src="(?:\.\/)?supabase-config\.js"><\/script>\s*/,'').replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.js" defer><\/script>\s*/,'').replace(/<script src="(?:\.\/)?sync\.js" defer><\/script>\s*/,'').replace(/<script src="(?:\.\/)?app\.js" defer><\/script>/,`<script>${bootstrap}<\/script><script>${safe(standaloneJs)}<\/script>`);
  if(/(?:src|href)=["'](?:https?:)?\/\//i.test(output))throw new Error('Standalone output contains an external resource.');
  if(!output.includes('window.__STANDALONE__||!(\'serviceWorker\'in navigator)'))throw new Error('Standalone guard for service-worker registration is missing.');
  if(/fetch\s*\(/.test(output))throw new Error('Standalone output must not contain fetch calls.');
  const outDir=path.join(root,'dist');fs.mkdirSync(outDir,{recursive:true});
  const out=path.join(outDir,'LueckenSprint_Standalone.html');fs.writeFileSync(out,output,'utf8');
  console.log(`Standalone created: ${out} (${fs.statSync(out).size.toLocaleString('en-US')} bytes)`);
}catch(error){console.error(`Standalone build failed: ${error.message}`);process.exit(1)}
