import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(root,'apps/web/package.json'));
const output=join(mkdtempSync(join(tmpdir(),'original-background-')),'game.cjs');
await require('esbuild').build({stdin:{contents:"export * from './src/world/encounters';export * from './src/world/world.config';export * from './src/world/stories';",resolveDir:join(root,'apps/web')},outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const game=require(output),api=process.env.VOYAGE_TEST_API??'http://127.0.0.1:8015',base=process.env.VOYAGE_TEST_URL??'http://127.0.0.1:5175';
async function request(path,body,method='POST'){const result=await fetch(api+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert(result.ok,`${path}: ${result.status}`);return result.json();}
const candidate=JSON.parse(readFileSync(join(root,'content/scenes/candidates/A.json'),'utf8'));
await request('/scenes/candidates',candidate,'PUT');
const voyage=await request('/voyages',{title:'Original background display check',scene_id:'A',scene_version:candidate.version,scene_track:'candidate',question:'图片背景检查'});
const world=game.worldFor('A'),island=world.fragments.find(item=>item.id==='A-water'),story=game.storyFor('A','near');
await request(`/voyages/${voyage.id}`,{stage:'world',question:voyage.question,shared_task:'',crew:[],route:null,world:{lane:'near',ship:{x:island.x-3,z:island.z+4,yaw:0}}},'PUT');
const {chromium}=require(process.env.VOYAGE_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.VOYAGE_BROWSER_EXECUTABLE?{executablePath:process.env.VOYAGE_BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:1360,height:1000}}),errors=[];
await context.addInitScript(({id,beats,stats})=>{localStorage.setItem('cv.player.v1',JSON.stringify({id:'background-check',name:'入口检查',salt:'test',hash:'test',createdAt:Date.now()}));sessionStorage.setItem('cv.session.v1','background-check');localStorage.setItem('cv.lastVoyageId',id);localStorage.setItem('cv.reduceMotion','1');localStorage.setItem('cv.stats.v1',JSON.stringify(stats));localStorage.setItem('cv.story.v1',JSON.stringify({[id]:{beats,crisis:[],shore:[],state:{}}}));},{id:voyage.id,beats:story.beats.map(item=>item.id),stats:game.freshStats()});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/**',async route=>{const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const response=await route.fetch({url:api+url.pathname.slice(4)+url.search});await route.fulfill({response});});
const folder=join(root,'.impeccable/background');mkdirSync(folder,{recursive:true});
try{
  await page.goto(base);await page.waitForFunction(()=>!!window.__cv);
  if(await page.locator('.epoch-intro').count())await page.locator('.epoch-intro').click();
  await page.getByRole('button',{name:'图片背景 · 鲧',exact:true}).waitFor();
  const snapshot=()=>page.evaluate(()=>({stats:localStorage.getItem('cv.stats.v1'),progress:localStorage.getItem('cv.story.v1')}));
  const before=await snapshot();await page.getByRole('button',{name:'图片背景 · 鲧',exact:true}).click();
  await page.getByRole('dialog',{name:'鲧的图片背景',exact:true}).waitFor();await page.locator('.island-background img').evaluate(img=>img.decode());
  await page.screenshot({path:join(folder,'picture-background.png')});
  await page.setViewportSize({width:390,height:844});assert(await page.locator('.island-background-paper').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
  await page.keyboard.press('Escape');await page.locator('.island-background').waitFor({state:'hidden'});
  const after=await snapshot();assert.equal(after.progress,before.progress);for(const key of ['supply','trust','score'])assert.equal(JSON.parse(before.stats)[key],JSON.parse(after.stats)[key]);
  await page.setViewportSize({width:1360,height:1000});await page.keyboard.press('e');await page.locator('.enc-name').waitFor();assert.equal(await page.locator('.enc-name').innerText(),'鲧');await page.waitForTimeout(1000);await page.screenshot({path:join(folder,'original-character-subtitles.png')});
  assert.deepEqual(errors,[]);console.log('通过：原版鲧与字幕仍可进入；图片打开/关闭与手机布局正常，阅读不改变资源或进度。未跑完整航程或录制。');
}finally{await context.close();await browser.close();}
