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
try{
  if(process.argv.includes('--legacy-crisis')){
    const route=game.HISTORY_ROUTES['A-near'],story=game.storyFor('A','near'),target=game.crisisAnchor(story);
    const voyage=await request('/voyages',{title:'Legacy crisis replay test',scene_id:'A',scene_version:3,scene_track:'candidate',question:route.question});voyage.world={lane:'near'};
    const legacy=await pageAt(voyage,{x:target.x-game.storyReach('A')+1.5,z:target.z},{beats:[],crisis:[story.crisis.id],shore:[],state:{}});
    const before=await legacy.page.evaluate(()=>localStorage.getItem('cv.story.v1'));
    await legacy.page.locator('.interact-prompt').filter({hasText:`重读与练习 · ${story.crisis.kicker}`}).waitFor();await legacy.page.keyboard.press('e');await legacy.page.getByRole('heading',{name:route.crisis.title,exact:true}).waitFor();await legacy.page.keyboard.press('Escape');
    assert.equal(await legacy.page.locator('.history-overlay').count(),0);assert.equal(await legacy.page.evaluate(()=>localStorage.getItem('cv.story.v1')),before);await legacy.context.close();assert.deepEqual(errors,[]);console.log('通过：旧存档第三章重读与Escape退出不补写旁白、不修改原进度。');
  }else{
  for(const [key,route]of Object.entries(game.HISTORY_ROUTES)){
    const [era,lane]=key.split('-'),world=game.worldFor(era),story=game.storyFor(era,lane);
    const voyage=await request('/voyages',{title:`Story entry test ${key}`,scene_id:era,scene_version:3,scene_track:'candidate',question:route.question});voyage.world={lane};
    for(let index=0;index<3;index++){
      const scene=[...route.islands,route.crisis][index];
      const target=index<2?game.fragmentAnchor(world.fragments.find(fragment=>fragment.id===scene.id)):game.crisisAnchor(story);
      const point={x:target.x-(game.storyReach(era)-1.5),z:target.z};
      const state=Object.fromEntries(route.islands.slice(0,index).map(island=>[`history:${island.id}`,'fast']));
      const {page,context}=await pageAt(voyage,point,{beats:index===2?[]:story.beats.map(beat=>beat.id),crisis:[],shore:[],state});
      try{
        const heading=page.getByRole('heading',{name:scene.title,exact:true});
        if(!(await heading.count())){
          const prompt=page.locator('.interact-prompt').filter({hasText:scene.title});await prompt.waitFor({timeout:15000});
          await page.keyboard.press('e');
        }
        await heading.waitFor({timeout:15000});await page.getByRole('button',{name:/进入故事/}).click();await page.locator('.voyage-challenge').waitFor();entered++;
      }catch(error){await page.screenshot({path:join(root,`.impeccable/review/entry-failure-${key}-${index}.png`)});throw new Error(`${key} 第${index+1}章「${scene.title}」未进入：${error.message}`);}finally{await context.close();}
    }
    // Approaching a later island must respond with the prerequisite, not silently fail.
    const second=world.fragments.find(fragment=>fragment.id===route.islands[1].id),target=game.fragmentAnchor(second);
    const secondPoint={x:target.x-game.storyReach(era)+1.5,z:target.z};
    const gate=await pageAt(voyage,secondPoint,{beats:story.beats.map(beat=>beat.id),crisis:[],shore:[],state:{}});
    await gate.page.locator('.interact-prompt').filter({hasText:`暂未开放 · ${route.islands[1].title}`}).waitFor();await gate.page.keyboard.press('e');await gate.page.getByText(`先完成「${route.islands[0].title}」，再进入「${route.islands[1].title}」。`,{exact:true}).waitFor();assert.equal(await gate.page.locator('.history-overlay').count(),0);locked++;await gate.context.close();
    const first=world.fragments.find(fragment=>fragment.id===route.islands[0].id),firstPoint=game.fragmentAnchor(first);
    await request(`/voyages/${voyage.id}/records`,{kind:'fragment',text:'Original completed island record',classification:'creative',sources:[],material_ids:[first.id],version:1,access:'private'});
    const review=await pageAt(voyage,{x:firstPoint.x-game.storyReach(era)+1.5,z:firstPoint.z},{beats:story.beats.map(beat=>beat.id),crisis:[],shore:[],state:{[`history:${first.id}`]:'fast'}});
    await review.page.locator('.interact-prompt').filter({hasText:`重读与练习 · ${first.title}`}).waitFor();await review.page.keyboard.press('e');await review.page.getByText('重读与练习：不改变补给、人心、升级或本次航程的原记录。',{exact:true}).waitFor();replayed++;
    if(key==='A-near'){
      const before=await review.page.evaluate(()=>({stats:JSON.parse(localStorage.getItem('cv.stats.v1')),progress:localStorage.getItem('cv.story.v1')}));
      const recordsBefore=await(await fetch(`${api}/voyages/${voyage.id}/records`)).json();
      await review.page.getByRole('button',{name:/进入故事/}).click();
      for(const [cell,count]of Object.entries({7:1,8:1,9:1,10:1,11:1,12:3,17:0,18:1,19:1}))for(let turn=0;turn<count;turn++)await review.page.getByRole('button',{name:new RegExp(`^渠段 ${Number(cell)+1}，`)}).click();
      await review.page.getByRole('button',{name:'试放水',exact:true}).click();await review.page.getByRole('button',{name:'记下渠图'}).click();await review.page.getByRole('button',{name:'带着这个结果做决定'}).click();await review.page.getByRole('button',{name:'照这个安排做'}).click();await review.page.getByRole('button',{name:'结束练习，回到船上'}).click();
      const after=await review.page.evaluate(()=>({stats:JSON.parse(localStorage.getItem('cv.stats.v1')),progress:localStorage.getItem('cv.story.v1')}));
      for(const field of ['supply','trust','score','combo','shipLevel','crewLevel'])assert.equal(after.stats[field],before.stats[field],`重读不得修改${field}`);
      assert.equal(after.progress,before.progress);assert.deepEqual(await(await fetch(`${api}/voyages/${voyage.id}/records`)).json(),recordsBefore);
      await review.page.keyboard.press('e');await review.page.getByRole('button',{name:'结束重读，回到船上'}).waitFor();await review.page.keyboard.press('Escape');assert.equal(await review.page.locator('.history-overlay').count(),0);
    }else{await review.page.getByRole('button',{name:'结束重读，回到船上'}).click();assert.equal(await review.page.locator('.history-overlay').count(),0);}
    await review.context.close();
    const allState=Object.fromEntries([...route.islands,route.crisis].map(scene=>[`history:${scene.id}`,'fast']));
    const port=await pageAt(voyage,{x:world.ports[0].x,z:world.ports[0].z},{beats:story.beats.map(beat=>beat.id),crisis:[route.crisis.id],shore:[],state:allState});
    await port.page.locator('.interact-prompt-port').waitFor();await port.page.keyboard.press('f');await port.page.getByRole('heading',{name:route.ending.name,exact:true}).waitFor({timeout:20000});summaries++;await port.context.close();
    console.log(`${key}：三章、港口总结、顺序提示与重读均正常。`);
  }
  assert.equal(entered,24);assert.equal(locked,8);assert.equal(replayed,8);assert.equal(summaries,8);assert.deepEqual(errors,[]);
  console.log(`通过：真实3D海域24/24故事入口、8/8港口总结、8条顺序提示、8个重读入口，练习不改原资源与记录，无页面错误。`);
  }
}finally{await browser.close();}
