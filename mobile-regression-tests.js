const assert=require('assert'),fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
assert.ok(app.includes('Mobile-safe practice submission'),'Practice submission has no explicit mobile regression guard.');
assert.ok(app.includes("button.dataset.directSubmitBound='true'"),'Practice submission handler is not bound after direct exercise rendering.');
assert.ok(app.includes("button.addEventListener('click'"),'Practice submission is not available to native click, touch, and keyboard activation.');
assert.ok(app.includes('submitPractice()'),'Direct practice submission does not use the normal scoring path.');

const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{let file=decodeURIComponent(new URL(request.url,'http://localhost').pathname);if(file==='/'||file.endsWith('/'))file+='index.html';const target=path.join(__dirname,file.replace(/^\/+/,''));if(!target.startsWith(__dirname)||!fs.existsSync(target)){response.writeHead(404);response.end('Not found');return;}response.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(target).pipe(response);});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const profiles=[
  {name:'iPhone browser',width:390,height:844,isMobile:true,hasTouch:true,keyboard:false},
  {name:'Android browser',width:430,height:932,isMobile:true,hasTouch:true,keyboard:false},
  {name:'Desktop browser',width:1366,height:768,isMobile:false,hasTouch:false,keyboard:true}
];

(async()=>{const port=await listen(),base=`http://127.0.0.1:${port}`;const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});try{
  for(const profile of profiles){
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.isMobile,hasTouch:profile.hasTouch});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/#/training`,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Zufälligen Text wählen'}).click();
    await page.waitForSelector('.gap');
    const submit=page.locator('#submitPractice');
    assert.equal(await submit.isDisabled(),false,`${profile.name}: answer-check button is disabled.`);
    if(profile.keyboard){await submit.focus();await page.keyboard.press('Enter');}
    else await submit.click();
    await page.waitForSelector('#resultDetails');
    assert.match(await page.locator('#main').innerText(),/Trainingsergebnis/,`${profile.name}: normal result view was not rendered.`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${profile.name}: result view causes horizontal overflow.`);
    assert.deepStrictEqual(errors,[],`${profile.name}: browser errors: ${errors.join('; ')}`);
    await context.close();
  }
  console.log('Mobile answer-checking regressions passed for iPhone, Android, and desktop keyboard activation.');
}finally{await browser.close();server.close();}})().catch(error=>{console.error(error.stack||error);process.exit(1)});
