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
 localStorage.setItem('cv.player.v1',JSON.stringify({id:'history-check',name:'功能检查',salt:'test',hash:'test',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','history-check');localStorage.setItem('cv.reduceMotion','1');
 window.__audioNodes=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){if(target instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();window.__audioNodes.push(analyser);connect.call(this,analyser);return connect.call(analyser,target,...args);}return connect.call(this,target,...args);};
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
const folder=join(root,'.impeccable/background');mkdirSync(folder,{recursive:true});
const results=[];
async function load(era,lane,position,state={},crisis=[]){
 const candidate=JSON.parse(readFileSync(join(root,`content/scenes/candidates/${era}.json`),'utf8'));await request('/scenes/candidates',candidate,'PUT');
 const voyage=await request('/voyages',{title:'Native story access regression',scene_id:era,scene_version:candidate.version,scene_track:'candidate',question:game.historyFor(era,lane).question});
 await request(`/voyages/${voyage.id}`,{stage:'world',question:voyage.question,shared_task:'',crew:[],route:null,world:{lane,ship:{...position,yaw:0}}},'PUT');
 await page.goto(base);await page.evaluate(({id,state,crisis,stats,beats})=>{localStorage.setItem('cv.lastVoyageId',id);localStorage.setItem('cv.stats.v1',JSON.stringify(stats));localStorage.setItem('cv.story.v1',JSON.stringify({[id]:{beats,crisis,shore:[],state}}));},{id:voyage.id,state,crisis,stats:{...game.freshStats(),supply:100,trust:100},beats:game.storyFor(era,lane).beats.map(b=>b.id)});await page.reload();await page.waitForFunction(()=>!!window.__cv);if(await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();return voyage;
}
const held=new Set();async function keys(next){for(const key of held)if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
async function steer(seconds){const until=Date.now()+seconds*1000;while(Date.now()<until){if(await page.locator('.enc-decision,.enc-result').count())break;const snapshot=await page.evaluate(async()=>{const {waterLive}=await import('/src/world/waterGame.ts');return {ship:window.__cv,target:waterLive.target,inside:waterLive.inside};});if(snapshot.ship&&snapshot.target){const {ship,target}=snapshot,dx=target.x-ship.x,dz=target.z-ship.z,dist=Math.hypot(dx,dz);let error=Math.atan2(dx,-dz)*180/Math.PI-ship.headingDeg;while(error>180)error-=360;while(error< -180)error+=360;const next=new Set();if(Math.abs(error)>7)next.add(error>0?'d':'a');if(dist>2.2&&Math.abs(error)<55)next.add('w');await keys(next);}await page.waitForTimeout(120);}await keys(new Set());}
try{
 const results=[];
 if(!process.env.VOYAGE_CHECK_SHORE_ONLY)for(const [era,lane,id] of [['A','near','A-water'],['A','near','A-stake'],['A','far','A-bone'],['A','far','A-granary']]){
  const route=game.historyFor(era,lane),world=game.worldFor(era),fragment=world.fragments.find(f=>f.id===id),state=Object.fromEntries(route.islands.filter(s=>s.id!==id).map(s=>[`history:${s.id}`,'care']));
  console.log('Water control:',id);const voyage=await load(era,lane,{x:fragment.x+18.5,z:fragment.z-3.5},state);await page.locator('.interact-prompt').waitFor();await page.keyboard.press('e');await page.locator('.enc-name').waitFor();
  for(let i=0;i<20&&!await page.locator('.enc-water').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(100);}
  await page.locator('.enc-water').waitFor();await steer(65);await page.locator('.enc-result,.enc-decision').waitFor({timeout:8000});
  if(await page.locator('.enc-decision').count()){await page.setViewportSize({width:390,height:844});assert(await page.locator('.enc-decision').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:join(folder,'water-decision.png')});await page.locator('.enc-decision button').last().click();await page.setViewportSize({width:1360,height:1000});}
  const output=await page.locator('.enc-result-text').innerText();await page.keyboard.press('Space');await page.locator('.enc').waitFor({state:'hidden'});
  const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('cv.story.v1'))[id],voyage.id);assert(saved.state[`history:${id}`]);results.push({id,result:output,skill:saved.state[`skill:${id}`]??'choice'});
 }
 // Verify the final speaker and long recap remain readable at phone width.
 const route=game.historyFor('B','near'),story=game.storyFor('B','near'),state=Object.fromEntries([...route.islands,route.crisis].map(s=>[`history:${s.id}:text`,'沿途共同维护的安排已留下记录。']));
 for(const scene of [...route.islands,route.crisis])state[`history:${scene.id}`]='care';
 console.log(JSON.stringify({nativeKeyboardInteractions:results},null,2));
 await load('B','near',{x:22,z:-96},state,[story.crisis.id]);await page.waitForFunction(()=>!!window.__cv?.port);await page.keyboard.press('f');await page.getByRole('dialog',{name:'岸上的人：詹天佑',exact:true}).waitFor();await page.setViewportSize({width:390,height:844});await page.keyboard.press('Space');assert(await page.locator('.shore').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.screenshot({path:join(folder,'shore-reflection.png')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({nativeKeyboardInteractions:results,shoreSpeaker:'詹天佑',shoreMobile:true,errors},null,2));
}catch(error){await page.screenshot({path:join(folder,'water-failure.png')});console.log(await page.locator('body').innerText());throw error;}finally{await keys(new Set());await context.close();await browser.close();}
