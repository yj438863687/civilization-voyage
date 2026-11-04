import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(join(root,'apps/web/package.json'));
const {build}=require('esbuild'),{chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const output=join(mkdtempSync(join(tmpdir(),'voyage-entry-')),'world.cjs');
await build({absWorkingDir:join(root,'apps/web'),stdin:{contents:["export * from './src/world/history';","export * from './src/world/stories';","export * from './src/world/world.config';","export * from './src/world/storyAccess';","export * from './src/world/encounters';"].join('\n'),resolveDir:join(root,'apps/web')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(output);
const api=process.env.VOYAGE_TEST_API??'http://127.0.0.1:8015';
const base=process.env.VOYAGE_TEST_URL??'http://127.0.0.1:5175';
async function request(path,body,method='POST'){const response=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert(response.ok,`${path}: ${response.status}`);return response.json();}
const browser=await chromium.launch({headless:true,...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
mkdirSync(join(root,'.impeccable/review'),{recursive:true});
const errors=[];let entered=0,locked=0,replayed=0,summaries=0;
async function pageAt(voyage,point,progress,records=[]){
  await request(`/voyages/${voyage.id}`,{stage:'world',question:voyage.question,shared_task:'',crew:[],route:null,world:{lane:voyage.world.lane,ship:{...point,yaw:0}}},'PUT');
  const context=await browser.newContext({viewport:{width:1360,height:1000}});
  await context.addInitScript(({id,progress,stats})=>{localStorage.setItem('cv.player.v1',JSON.stringify({id:'entries',name:'入口检查',salt:'test',hash:'test',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','entries');localStorage.setItem('cv.lastVoyageId',id);localStorage.setItem('cv.reduceMotion','1');localStorage.setItem('cv.stats.v1',JSON.stringify(stats));localStorage.setItem('cv.story.v1',JSON.stringify({[id]:progress}));},{id:voyage.id,progress,stats:game.freshStats()});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  // Use the disposable test API even when opening the production desktop build.
  await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
  if(records.length)await page.route(`**/voyages/${voyage.id}/records`,route=>route.fulfill({json:records}));
  await page.goto(base);
  try{await page.waitForFunction(()=>!!window.__cv,null,{timeout:20000});}catch(error){console.error('PAGE_ERRORS',errors);console.error((await page.locator('body').innerText()).slice(0,4500));await page.screenshot({path:join(root,'.impeccable/review/entry-bootstrap-failure.png')});throw error;}
  if(await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();
  return {page,context};
}
try {
  const route=game.HISTORY_ROUTES['A-near'],world=game.worldFor('A'),story=game.storyFor('A','near'),scene=route.islands[0];
  const target=game.fragmentAnchor(world.fragments.find(fragment=>fragment.id===scene.id));
  const voyage=await request('/voyages',{title:'Story presentation display check',scene_id:'A',scene_version:3,scene_track:'candidate',question:route.question});voyage.world={lane:'near'};
  const {page,context}=await pageAt(voyage,{x:target.x-game.storyReach('A')+1.5,z:target.z},{beats:story.beats.map(beat=>beat.id),crisis:[],shore:[],state:{}});
  await page.locator('.interact-prompt').filter({hasText:scene.title}).waitFor();await page.keyboard.press('e');
  await page.locator('.enc-history').waitFor();assert.equal(await page.locator('.history-overlay').count(),0);
  assert((await page.locator('.enc-name').innerText()).includes(scene.who));assert(await page.locator('.talk-line').count()>0);
  await page.waitForTimeout(2500);await page.screenshot({path:join(root,'.impeccable/review/v09-character-subtitles.png')});
  await page.getByRole('button',{name:'历史图片与背景',exact:true}).click();await page.locator('.history-overlay').waitFor();assert(await page.locator('.history-photo img').isVisible());
  await page.getByRole('button',{name:'回到人物对话',exact:true}).click();await page.locator('.enc-history').waitFor();
  await page.setViewportSize({width:390,height:844});assert(await page.locator('.enc-history').evaluate(element=>element.scrollWidth<=element.clientWidth+1));
  await page.keyboard.press('Escape');await page.locator('.enc-history').waitFor({state:'hidden'});
  await page.setViewportSize({width:1360,height:1000});
  const beforePicture=await page.evaluate(()=>({stats:localStorage.getItem('cv.stats.v1'),progress:localStorage.getItem('cv.story.v1')}));
  await page.getByRole('button',{name:`图片故事 · ${scene.title}`,exact:true}).click();
  await page.getByRole('dialog',{name:`图片故事：${scene.title}`,exact:true}).waitFor();
  assert.equal(await page.locator('.enc-history').count(),0);
  await page.keyboard.press('Escape');await page.getByRole('dialog',{name:`图片故事：${scene.title}`,exact:true}).waitFor({state:'hidden'});
  const afterPicture=await page.evaluate(()=>({stats:localStorage.getItem('cv.stats.v1'),progress:localStorage.getItem('cv.story.v1')}));
  assert.equal(beforePicture.progress,afterPicture.progress);
  for(const key of ['supply','trust','score'])assert.equal(JSON.parse(beforePicture.stats)[key],JSON.parse(afterPicture.stats)[key]);
  await context.close();assert.deepEqual(errors,[]);
  console.log('Display check passed: scene subtitles by default; pictures open and close; mobile width and Escape; island picture entry leaves resources and progress unchanged; no voyage playthrough or recording.');
} finally { await browser.close(); }
