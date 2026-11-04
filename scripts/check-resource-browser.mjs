import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json'));
const output=join(mkdtempSync(join(tmpdir(),'original-background-')),'game.cjs');
await require('esbuild').build({stdin:{contents:"export * from './src/world/encounters';export * from './src/world/world.config';export * from './src/world/stories';export * from './src/world/voyageHistory';",resolveDir:join(root,'apps/web')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(output),api=process.env.VOYAGE_TEST_API??'http://127.0.0.1:8015',base=process.env.VOYAGE_TEST_URL??'http://127.0.0.1:5175';
async function request(path,body,method='POST'){const result=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert(result.ok,`${path}: ${result.status}`);return result.json();}

const {chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1360,height:1000}}),errors=[];
await context.addInitScript(()=>{
 localStorage.setItem('cv.player.v1',JSON.stringify({id:'history-check',name:'Alex',salt:'test',hash:'test',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','history-check');localStorage.setItem('cv.reduceMotion','1');localStorage.setItem('cv.language.v1','en');
 window.__audioNodes=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){if(target instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();window.__audioNodes.push(analyser);connect.call(this,analyser);return connect.call(analyser,target,...args);}return connect.call(this,target,...args);};
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
const folder=join(root,'.impeccable/consequences');mkdirSync(folder,{recursive:true});
const results=[];
async function load(era,lane,position,state={},crisis=[],statsPatch={}){
 const candidate=JSON.parse(readFileSync(join(root,`content/scenes/candidates/${era}.json`),'utf8'));await request('/scenes/candidates',candidate,'PUT');
 const voyage=await request('/voyages',{title:'Native story access regression',scene_id:era,scene_version:candidate.version,scene_track:'candidate',question:game.historyFor(era,lane).question});
 await request(`/voyages/${voyage.id}`,{stage:'world',question:voyage.question,shared_task:'',crew:[],route:null,world:{lane,ship:{...position,yaw:0}}},'PUT');
 if(page.url()==='about:blank')await page.goto(base);await page.evaluate(({id,state,crisis,stats,beats})=>{localStorage.setItem('cv.lastVoyageId',id);localStorage.setItem('cv.stats.v1',JSON.stringify(stats));localStorage.setItem('cv.story.v1',JSON.stringify({[id]:{beats,crisis,shore:[],state}}));},{id:voyage.id,state,crisis,stats:{...game.freshStats(),supply:100,trust:100,...statsPatch},beats:game.storyFor(era,lane).beats.map(b=>b.id)});await page.reload();await page.waitForFunction(()=>!!window.__cv);if(statsPatch.supply!==0&&statsPatch.trust!==0&&await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();return voyage;
}
try{
 const first=game.worldFor('A').fragments.find(s=>s.id==='A-water'),pos={x:first.x+18.5,z:first.z-3.5},high={shipLevel:3,crewLevel:3,hull:100,score:700};
 await load('A','near',pos,{},[],{...high,supply:0,trust:70});const ending=page.getByRole('dialog',{name:'Voyage Interrupted',exact:true});await ending.waitFor();assert((await ending.innerText()).includes('An Empty Hold'));
 await page.waitForFunction(pos=>Math.hypot(window.__cv.x-pos.x,window.__cv.z-pos.z)<.2,pos);
 const before=await page.evaluate(()=>window.__cv);await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');const after=await page.evaluate(()=>window.__cv);assert(Math.hypot(before.x-after.x,before.z-after.z)<.1,'Failed voyage must stop the ship: '+JSON.stringify({before,after}));await page.keyboard.press('Escape');assert(await ending.isVisible());
 await page.screenshot({path:join(folder,'empty-hold-desktop.png')});await page.setViewportSize({width:390,height:844});assert(await ending.locator('.resource-ending-paper').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:join(folder,'empty-hold-mobile.png')});await page.setViewportSize({width:1360,height:1000});
 await ending.getByRole('button',{name:'Accept the Cost and Recover',exact:true}).click();await ending.waitFor({state:'hidden'});const stats=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cv.stats.v1')));let saved=await stats();assert.equal(saved.supply,35);assert.equal(saved.trust,70);assert.equal(saved.shipLevel,2);assert.equal(saved.crewLevel,3);assert.equal(saved.hull,80);assert.equal(saved.score,500);assert.equal(saved.setbacks,1);
 await page.reload();await page.waitForFunction(()=>!!window.__cv);assert.equal((await stats()).score,500);assert.equal((await stats()).setbacks,1);assert.equal(await page.locator('.resource-ending').count(),0);
 const trustVoyage=await load('A','near',pos,{},[],{...high,supply:60,trust:0});await ending.waitFor();assert((await ending.innerText()).includes('Orders Nobody Answers'));await ending.getByRole('button',{name:'End the Voyage with This Outcome',exact:true}).click();await page.locator('.cine-journal .voyage-verdict').waitFor();assert((await page.locator('.cine-journal .voyage-verdict').innerText()).includes('Orders Nobody Answers'));
 const stored=await fetch(api+`/voyages/${trustVoyage.id}`).then(r=>r.json());assert.equal(stored.stage,'reflection');assert.equal(stored.world.voyage_ending.status,'ended');const records=await fetch(api+`/voyages/${trustVoyage.id}/records`).then(r=>r.json());assert(records.some(r=>r.kind==='reflection'&&r.text.includes('无人响应')));
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('cv.stats.v1'));localStorage.setItem('cv.stats.v1',JSON.stringify({...s,supply:80,trust:70}));});await page.reload();await page.locator('.cine-journal .voyage-verdict').waitFor();assert((await page.locator('.cine-journal .voyage-verdict').innerText()).includes('Orders Nobody Answers'),'Archived bad ending must not change with later resource balances');assert.equal(await page.locator('.resource-ending').count(),0);await page.screenshot({path:join(folder,'recorded-bad-ending.png')});
 await load('A','near',pos,{},[],{...high,supply:0,trust:0});await ending.waitFor();assert((await ending.innerText()).includes('An Empty Ship Returns'));await ending.getByRole('button',{name:'Accept the Cost and Recover',exact:true}).click();await ending.waitFor({state:'hidden'});saved=await stats();assert.equal(saved.supply,35);assert.equal(saved.trust,30);assert.equal(saved.shipLevel,2);assert.equal(saved.crewLevel,2);
 const route=game.historyFor('D','far'),state={};for(const scene of [...route.islands,route.crisis])Object.assign(state,game.historyOutcome(scene,1).set);
 await load('D','far',{x:22,z:-96},state,[route.crisis.id],{supply:10,trust:70});
 await page.getByRole('button',{name:'Shipyard & Outfits · B',exact:true}).click();await page.waitForTimeout(4600);await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!!window.__cv?.port);await page.keyboard.press('f');await page.locator('.shore').waitFor();
 for(let i=0;i<6&&await page.locator('.shore').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(280);}
 if(await page.locator('.page').count())await page.getByRole('button',{name:'Close This Page',exact:true}).click();
 await page.locator('.cine-stop').nth(1).click();const seal=page.locator('.cine-panel .seal-btn');await seal.hover();await page.mouse.down();await page.waitForTimeout(800);await page.mouse.up();await page.locator('.page').waitFor();await page.getByRole('button',{name:'Close This Page',exact:true}).click();
 await page.locator('.finale .voyage-verdict').waitFor();assert((await page.locator('.finale .voyage-verdict').innerText()).includes('Together, but Running Short'));assert.equal((await stats()).supply,25);await page.screenshot({path:join(folder,'verdict-before-harbour-aid.png')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({zeroSupplyStopsSailing:true,costlyRecoveryPersists:true,noDuplicateChargeOnReload:true,zeroTrustEndsAndRecords:true,badEndingReloads:true,bothZero:true,mobile:true,verdictBeforeHarbourAid:true,errors},null,2));
}catch(error){await page.screenshot({path:join(folder,'failure.png')});console.log(await page.locator('body').innerText());throw error;}finally{await context.close();await browser.close();}
