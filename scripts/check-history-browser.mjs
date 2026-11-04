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
try{
 if(!process.env.VOYAGE_CHECK_UPGRADES_ONLY)for(const [key,route] of Object.entries(game.HISTORY_ROUTES)){
  const [era,lane]=key.split('-'),world=game.worldFor(era),state={};
  for(const scene of route.islands){
   console.log('Checking',scene.id);
   const fragment=world.fragments.find(f=>f.id===scene.id);
   await load(era,lane,{x:fragment.x+18.5,z:fragment.z-3.5},state);
   await page.getByRole('button',{name:`图片背景 · ${scene.who}`,exact:true}).click();
   await page.locator('.island-background img').first().evaluate(img=>img.decode());await page.keyboard.press('Escape');
   await page.keyboard.press('e');await page.locator('.enc-name').waitFor();assert.equal(await page.locator('.enc-name').innerText(),scene.who);
   if(scene.id==='A-water')await page.screenshot({path:join(folder,'original-character-subtitles.png')});
   for(let i=0;i<20&&!await page.locator('.enc-water,.enc-result,.enc-decision').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(120);}
   await page.locator('.enc-water,.enc-result,.enc-decision').waitFor();if(await page.locator('.enc-water').count())assert((await page.locator('.enc-water').innerText()).includes('WASD'));
   await page.keyboard.press('Escape');await page.locator('.enc').waitFor({state:'hidden'});
   state[`history:${scene.id}`]='care';results.push(scene.id);
  }
  const story=game.storyFor(era,lane);await load(era,lane,{x:story.crisis.at.x+11.5+8,z:story.crisis.at.z-11},state);
  await page.locator('.enc-name').waitFor();assert.equal(await page.locator('.enc-name').innerText(),route.crisis.who);await page.keyboard.press('Escape');await page.locator('.enc').waitFor({state:'hidden'});results.push(route.crisis.id);
 }
 // Purchase through the visible shipyard. Preview is free; actual upgrades persist.
 const first=game.worldFor('A').fragments.find(f=>f.id==='A-water');await load('A','near',{x:first.x+18.5,z:first.z-3.5});
 console.log('Native scene entries passed:',results.length);
 await page.getByRole('button',{name:'船坞与换装 · B',exact:true}).click();const yard=page.getByRole('dialog',{name:'船坞与换装',exact:true});await yard.waitFor();
 const stats=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cv.stats.v1')));const before=await stats();
 await yard.locator('.shipyard-catalog button').last().click();assert.equal((await stats()).supply,before.supply);assert.equal((await stats()).shipLevel,0);
 await yard.getByRole('button',{name:'修整舷板',exact:true}).click();assert.equal((await stats()).shipLevel,1);assert.equal((await stats()).supply,82);
 await yard.getByRole('button',{name:'整齐的常服',exact:true}).click();assert.equal((await stats()).crewLevel,1);assert.equal((await stats()).trust,100);
 await page.screenshot({path:join(folder,'shipyard.png')});await page.setViewportSize({width:390,height:844});assert(await yard.locator('.shipyard-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.keyboard.press('Escape');await yard.waitFor({state:'hidden'});await page.reload();await page.waitForFunction(()=>!!window.__cv);assert.equal((await stats()).shipLevel,1);assert.equal((await stats()).crewLevel,1);
 await page.setViewportSize({width:1360,height:1000});await page.locator('.voyage-music summary').first().click();await page.waitForFunction(()=>document.querySelector('.voyage-music')?.dataset.playing==='true');
 const audible=await page.evaluate(async()=>{for(let i=0;i<25;i++){for(const node of window.__audioNodes){const data=new Float32Array(node.fftSize);node.getFloatTimeDomainData(data);if(data.some(value=>Math.abs(value)>.00001))return true;}await new Promise(r=>setTimeout(r,100));}return false;});assert(audible,'配乐必须输出非零音频波形');
 await page.getByRole('button',{name:'关闭背景音乐',exact:true}).first().click();assert.equal(await page.locator('.voyage-music').first().getAttribute('data-playing'),'false');
 await page.getByRole('button',{name:'开启背景音乐',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('.voyage-music')?.dataset.playing==='true');

 const musicEras=[];
 for(const era of ['A','B','C','D']){
  const fragment=game.worldFor(era).fragments.find(item=>item.lane==='near');
  await load(era,'near',{x:fragment.x+18.5,z:fragment.z-3.5});
  await page.locator('.voyage-music summary').first().click();
  await page.waitForFunction(era=>{const node=document.querySelector('.voyage-music');return node?.dataset.playing==='true'&&node.dataset.era===era;},era);
  const wave=await page.evaluate(async()=>{for(let i=0;i<30;i++){for(const node of window.__audioNodes){const data=new Float32Array(node.fftSize);node.getFloatTimeDomainData(data);if(data.some(value=>Math.abs(value)>.00001))return true;}await new Promise(r=>setTimeout(r,100));}return false;});assert(wave,'Era '+era+' audio output');musicEras.push(era);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({enteredAndExited:results,shipUpgrade:true,crewUpgrade:true,previewFree:true,reloadPersisted:true,mobileShipyard:true,musicNonzeroWaveform:true,musicMuteResume:true,musicEras,errors},null,2));
}catch(error){await page.screenshot({path:join(folder,'failure.png')});console.log(await page.locator('.enc').innerText().catch(()=>page.locator('body').innerText()));throw error;}finally{await context.close();await browser.close();}
