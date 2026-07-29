const assert=require('assert'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('sync.js','utf8');

const runCallback=async({href,exchange,setSession})=>{
  let replaced='';
  const context={
    URL,URLSearchParams,console:{info:()=>{},warn:()=>{},error:()=>{}},
    location:new URL(href),history:{replaceState:(_state,_title,url)=>{replaced=url;}},
    LUECKENSPRINT_SUPABASE_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'},
    supabase:{createClient:()=>({auth:{exchangeCodeForSession:exchange,getSession:async()=>({data:{session:null},error:null}),setSession,onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}})},
    navigator:{onLine:true},addEventListener:()=>{},setInterval:()=>0,clearTimeout:()=>{},setTimeout:()=>0,document:{title:'LückenSprint',addEventListener:()=>{},querySelector:()=>null},CustomEvent:class {constructor(type,detail){this.type=type;this.detail=detail;}}
  };
  context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
  return {okay:await context.LueckenSync.processAuthCallback(),replaced};
};

(async()=>{
  let exchangedCode='';
  const pkce=await runCallback({
    href:'https://alpbuyukatak.github.io/lueckensprint/?code=one-time-code#/training',
    exchange:async code=>{exchangedCode=code;return {data:{session:{user:{id:'user-a',email:'test@example.invalid'}}},error:null};},
    setSession:async()=>{throw new Error('PKCE callback must not use implicit token handling.');}
  });
  assert.equal(pkce.okay,true,'A valid PKCE magic-link callback completes.');
  assert.equal(exchangedCode,'one-time-code','The one-time callback code is exchanged for a persisted session.');
  assert.equal(pkce.replaced,'/lueckensprint/#/training','The GitHub Pages subpath and valid hash route survive callback cleanup.');

  let receivedTokens=null;
  const implicit=await runCallback({
    href:'https://alpbuyukatak.github.io/lueckensprint/#access_token=access-value&refresh_token=refresh-value&type=magiclink',
    exchange:async()=>{throw new Error('Implicit callback must not use PKCE exchange.');},
    setSession:async tokens=>{receivedTokens=tokens;return {data:{session:{user:{id:'user-b',email:'test@example.invalid'}}},error:null};}
  });
  assert.equal(implicit.okay,true,'An implicit mobile magic-link callback completes.');
  assert.equal(receivedTokens?.access_token,'access-value','The access token is supplied only to the Supabase client.');
  assert.equal(receivedTokens?.refresh_token,'refresh-value','The refresh token is supplied only to the Supabase client.');
  assert.equal(implicit.replaced,'/lueckensprint/#/start','Token fragments are removed and never treated as app routes.');

  const failed=await runCallback({
    href:'https://alpbuyukatak.github.io/lueckensprint/?code=expired#/start',
    exchange:async()=>({data:{session:null},error:new Error('expired')}),setSession:async()=>({data:{session:null},error:null})
  });
  assert.equal(failed.okay,false,'A failed callback reports failure without creating a guest session.');
  assert.equal(failed.replaced,'','A failed callback keeps its parameters so the user can recover or retry intentionally.');
  console.log('Magic-link callback regressions passed for GitHub Pages PKCE, implicit mobile links, and failure handling.');
})().catch(error=>{console.error(error.stack||error);process.exit(1)});
