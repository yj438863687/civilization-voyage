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
 localStorage.setItem('cv.player.v1',JSON.stringify({id:'history-check',name:'Alex',salt:'test',hash:'test',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','history-check');localStorage.setItem('cv.reduceMotion','1');
 window.__audioNodes=[];const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){if(target instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();window.__audioNodes.push(analyser);connect.call(this,analyser);return connect.call(analyser,target,...args);}return connect.call(this,target,...args);};
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
const folder=join(root,'.impeccable/bilingual');mkdirSync(folder,{recursive:true});
const results=[];
async function load(era,lane,position,state={},crisis=[]){
 const candidate=JSON.parse(readFileSync(join(root,`content/scenes/candidates/${era}.json`),'utf8'));await request('/scenes/candidates',candidate,'PUT');
 const voyage=await request('/voyages',{title:'Native story access regression',scene_id:era,scene_version:candidate.version,scene_track:'candidate',question:game.historyFor(era,lane).question});
 await request(`/voyages/${voyage.id}`,{stage:'world',question:voyage.question,shared_task:'',crew:[],route:null,world:{lane,ship:{...position,yaw:0}}},'PUT');
 if(page.url()==='about:blank')await page.goto(base);await page.evaluate(({id,state,crisis,stats,beats})=>{localStorage.setItem('cv.lastVoyageId',id);localStorage.setItem('cv.stats.v1',JSON.stringify(stats));localStorage.setItem('cv.story.v1',JSON.stringify({[id]:{beats,crisis,shore:[],state}}));},{id:voyage.id,state,crisis,stats:{...game.freshStats(),supply:100,trust:100},beats:game.storyFor(era,lane).beats.map(b=>b.id)});await page.reload();await page.waitForFunction(()=>!!window.__cv);if(await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();return voyage;
}
const english=JSON.parse(readFileSync(join(root,'apps/web/src/i18n/history.en.json'),'utf8'));
const chinese=/[\u3400-\u9fff]/;
async function snapshot(){return page.evaluate(()=>({stats:localStorage.getItem('cv.stats.v1'),progress:localStorage.getItem('cv.story.v1'),voyage:localStorage.getItem('cv.lastVoyageId')}));}
async function fits(selector){return page.locator(selector).evaluate(node=>node.scrollWidth<=node.clientWidth+1);}
try{
 const first=game.worldFor('A').fragments.find(s=>s.id==='A-water');await load('A','near',{x:first.x+18.5,z:first.z-3.5});await page.locator('.interact-prompt').waitFor();
 const before=await snapshot();await page.getByRole('button',{name:'English',exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.deepEqual(await snapshot(),before);
 await page.getByRole('button',{name:'Larger text',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-large-text'),'true');
 assert(await page.locator('.hud-stat').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16));assert(await page.locator('.hud-stat b').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=21));
 await page.screenshot({path:join(folder,'readable-hud-en-desktop.png')});await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(folder,'readable-hud-en-mobile.png')});assert(await fits('body'));
 await page.getByRole('button',{name:'Image Notes · Gun',exact:true}).click();await page.locator('.island-background img').first().evaluate(img=>img.decode());assert(await fits('.island-background-paper'));await page.screenshot({path:join(folder,'picture-background.png')});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Shipyard & Outfits · B',exact:true}).click();const yard=page.getByRole('dialog',{name:'Shipyard & Outfits',exact:true});await yard.waitFor();assert(await fits('.shipyard-panel'));
 for(const label of ['Refit the Hull','Add Navigation Equipment','Raise the Fleet Flag'])await yard.getByRole('button',{name:label,exact:true}).click();
 for(const label of ['Everyday Uniform','Voyage Outfit','Fleet Insignia'])await yard.getByRole('button',{name:label,exact:true}).click();
 const purchased=JSON.parse((await snapshot()).stats);assert.equal(purchased.shipLevel,3);assert.equal(purchased.crewLevel,3);assert.equal(purchased.supply,22);assert.equal(purchased.trust,100);
 await yard.locator('.shipyard-preview').scrollIntoViewIfNeeded();await page.screenshot({path:join(folder,'crew-en-mobile.png')});await page.setViewportSize({width:1360,height:1000});await yard.locator('.shipyard-panel').evaluate(n=>n.scrollTop=0);await page.screenshot({path:join(folder,'shipyard.png')});
 await page.getByRole('button',{name:'中文',exact:true}).click();await page.getByRole('dialog',{name:'船坞与换装',exact:true}).waitFor();assert.equal(JSON.parse((await snapshot()).stats).crewLevel,3);
 await page.getByRole('button',{name:'English',exact:true}).click();await page.keyboard.press('Escape');await yard.waitFor({state:'hidden'});await page.reload();await page.locator('.interact-prompt').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('html').getAttribute('data-large-text'),'true');assert.equal(JSON.parse((await snapshot()).stats).crewLevel,3);
 await page.keyboard.press('e');await page.locator('.enc-name').waitFor();assert.equal(await page.locator('.enc-name').innerText(),'Gun');await page.keyboard.press('Space');await page.locator('.talk-line').first().waitFor();
 const encounterState=await snapshot(),lines=await page.locator('.talk-line').count();await page.getByRole('button',{name:'中文',exact:true}).click();assert.equal(await page.locator('.enc-name').innerText(),'鲧');assert.equal(await page.locator('.talk-line').count(),lines);assert.deepEqual(await snapshot(),encounterState);
 await page.getByRole('button',{name:'English',exact:true}).click();assert(!chinese.test(await page.locator('.enc').innerText()));await page.screenshot({path:join(folder,'original-character-subtitles.png')});
 for(let i=0;i<20&&!await page.locator('.enc-water').count();i++){await page.keyboard.press('Space');await page.waitForTimeout(100);}await page.locator('.enc-gate-legend').waitFor();assert(!chinese.test(await page.locator('.enc-gate-legend').innerText()));await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Standard text',exact:true}).click();
 const checked=[];
 if(!process.env.VOYAGE_BILINGUAL_SMOKE_ONLY)for(const [key,route]of Object.entries(game.HISTORY_ROUTES)){
  const [era,lane]=key.split('-'),state={},world=game.worldFor(era);
  for(const [index,scene]of [...route.islands,route.crisis].entries()){
   const at=index<2?world.fragments.find(s=>s.id===scene.id):game.storyFor(era,lane).crisis.at;
   await load(era,lane,{x:at.x+(index<2?18.5:19.5),z:at.z-(index<2?3.5:11)},state);
   if(index<2){await page.locator('.interact-prompt').waitFor();await page.keyboard.press('e');}
   await page.locator('.enc-name').waitFor();const expected=(index<2?english[key].islands[index]:english[key].crisis).who;assert.equal(await page.locator('.enc-name').innerText(),expected);assert(!chinese.test(await page.locator('.enc').innerText()),scene.id+' has untranslated visible text');
   if(scene.id==='D-star'){await page.setViewportSize({width:390,height:844});assert(await fits('.enc'));await page.screenshot({path:join(folder,'long-english-story-mobile.png')});await page.setViewportSize({width:1360,height:1000});}
   await page.keyboard.press('Escape');await page.locator('.enc').waitFor({state:'hidden'});state[`history:${scene.id}`]='care';checked.push(scene.id);console.log('English scene:',scene.id);
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({languageSwitchPreservesProgress:true,dialogueSwitchPreservesPosition:true,languageAndTextSizePersist:true,englishScenes:checked.length,allShipAndCrewUpgrades:true,desktopAndMobile:true,errors},null,2));
}catch(error){await page.screenshot({path:join(folder,'failure.png')});console.log(await page.locator('body').innerText());throw error;}finally{await context.close();await browser.close();}
